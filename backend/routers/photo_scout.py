"""Photo-to-Location scouting — analyze a location photo and auto-fill the
location knowledge base with visual metadata.

Workflow:
  1. POST /api/scout/analyze  — send image, get enriched metadata back for preview
  2. POST /api/scout/save     — confirm & save to locations.json
  3. POST /api/scout/composite — analyze up to 5 images for one location
"""

from __future__ import annotations

import json
from pathlib import Path
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.image_analyzer import get_image_analyzer, ImageAnalysis

router = APIRouter(prefix="/api/scout", tags=["Photo Scout"])

DATA_DIR = Path(__file__).parent.parent / "data"
LOCATIONS_PATH = DATA_DIR / "locations.json"


# ── Pydantic models ─────────────────────────────────────────────────

class ScoutAnalyzeRequest(BaseModel):
    image_base64: str
    country: str = ""
    place_name: str = ""
    gps_privacy: bool = True  # Strip GPS before sending to Gemini


class ScoutAnalysisResponse(BaseModel):
    """What comes back from /analyze — preview before saving."""
    scene_description: str
    lighting_conditions: str
    dominant_colors: list[str]
    mood: str
    time_of_day: str
    location_type: str
    props_textures: list[str]
    suggested_shot_types: list[str]
    technical_notes: str
    exif: dict
    # Proposed location data
    proposed_keywords: list[str]
    proposed_description: str
    proposed_vibe: str
    proposed_best_times: list[str]
    proposed_textures: list[str]
    proposed_anti_tourism_description: str
    # GPS (if available and privacy disabled)
    gps_lat: float | None = None
    gps_lng: float | None = None
    # Suggested country/place from GPS (reverse geocode)
    suggested_country: str = ""
    suggested_place_name: str = ""


class ScoutSaveRequest(BaseModel):
    image_base64: str                        # Original image for thumbnail
    country: str
    place_name: str
    # Editable fields — user can modify AI suggestions
    description: str
    keywords: list[str]
    vibe: str = ""
    best_times: list[str] = []
    textures: list[str] = []
    anti_tourism_description: str = ""
    gps_lat: float | None = None
    gps_lng: float | None = None
    captured_at: str = ""


class CompositeRequest(BaseModel):
    images_base64: list[str]                 # 2-5 images of same location
    country: str = ""
    place_name: str = ""


# ── helpers ─────────────────────────────────────────────────────────

def _load_locations() -> dict:
    if LOCATIONS_PATH.exists():
        return json.loads(LOCATIONS_PATH.read_text())
    return {}


def _save_locations(data: dict):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    LOCATIONS_PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False))


def _build_keywords(analysis: ImageAnalysis, country: str, place_name: str) -> list[str]:
    """Build keyword list from analysis + user-provided names."""
    keywords = []
    if place_name:
        keywords.append(place_name.lower())
    if country:
        keywords.append(country.lower())
    if analysis.location_type:
        keywords.append(analysis.location_type)
    keywords.extend(analysis.props_textures[:5])
    if analysis.lighting_conditions:
        keywords.append(analysis.lighting_conditions)
    # Deduplicate, lowercase
    seen = set()
    result = []
    for kw in keywords:
        kw_lower = kw.lower().strip()
        if kw_lower and kw_lower not in seen:
            seen.add(kw_lower)
            result.append(kw_lower)
    return result


def _infer_best_times(analysis: ImageAnalysis) -> list[str]:
    """Infer best shooting times from lighting analysis and EXIF."""
    times = set()

    # From Gemini's time_of_day detection
    tod = analysis.time_of_day.lower() if analysis.time_of_day else ""
    if "dawn" in tod or "morning" in tod:
        times.add("early_morning")
    if "golden" in tod or "sunrise" in tod:
        times.add("golden_hour_am")
    if "midday" in tod or "afternoon" in tod:
        times.add("midday")
    if "sunset" in tod or "golden" in tod:
        times.add("golden_hour_pm")
    if "twilight" in tod or "blue" in tod:
        times.add("blue_hour")
    if "night" in tod:
        times.add("night")

    # From lighting conditions
    lc = analysis.lighting_conditions.lower() if analysis.lighting_conditions else ""
    if "golden" in lc:
        times.add("golden_hour_pm")
    if "overcast" in lc:
        times.add("overcast_anytime")
    if "interior" in lc:
        times.add("interior_anytime")
    if "night" in lc:
        times.add("night")

    if not times:
        times.add("golden_hour_pm")  # Safe default

    return sorted(times)


# ── reverse geocode (Nominatim — free, no API key) ──────────────────

async def _reverse_geocode(lat: float, lng: float) -> dict:
    """Convert GPS coordinates to country/city using Nominatim (OpenStreetMap).
    Returns {"country": "", "city": "", "place": ""}."""
    import httpx

    result = {"country": "", "city": "", "place": ""}
    try:
        url = (
            f"https://nominatim.openstreetmap.org/reverse"
            f"?lat={lat}&lon={lng}&format=json&accept-language=en"
        )
        headers = {"User-Agent": "DirectorsEye/1.0 (location-scout)"}
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                address = data.get("address", {})
                result["country"] = address.get("country", "")
                result["city"] = address.get("city") or address.get("town") or address.get("village") or ""
                result["place"] = address.get("suburb") or address.get("neighbourhood") or address.get("road") or ""
    except Exception as e:
        print(f"[Scout] Reverse geocode failed: {e}")

    return result


# ── endpoints ───────────────────────────────────────────────────────

@router.post("/analyze", response_model=ScoutAnalysisResponse)
async def analyze_scout_image(request: ScoutAnalyzeRequest):
    """Analyze a location photo — returns enriched metadata for preview.
    Does NOT save to the location KB. Use /save to persist."""
    if not request.image_base64:
        raise HTTPException(status_code=400, detail="image_base64 is required")

    # Strip data URI prefix if present
    image_b64 = request.image_base64
    if "," in image_b64 and image_b64.startswith("data:"):
        image_b64 = image_b64.split(",", 1)[1]

    analyzer = get_image_analyzer()
    analysis = await analyzer.analyze_b64(image_b64, "location_scout")

    # Build proposed location data
    proposed_keywords = _build_keywords(analysis, request.country, request.place_name)
    proposed_best_times = _infer_best_times(analysis)

    # Reverse geocode if GPS available and privacy not requested
    suggested_country = request.country
    suggested_place = request.place_name
    if analysis.exif.gps_lat and analysis.exif.gps_lng and not request.gps_privacy:
        geo = await _reverse_geocode(analysis.exif.gps_lat, analysis.exif.gps_lng)
        suggested_country = request.country or geo["country"]
        suggested_place = request.place_name or geo["city"] or geo["place"]

    return ScoutAnalysisResponse(
        scene_description=analysis.scene_description,
        lighting_conditions=analysis.lighting_conditions,
        dominant_colors=analysis.dominant_colors,
        mood=analysis.mood,
        time_of_day=analysis.time_of_day,
        location_type=analysis.location_type,
        props_textures=analysis.props_textures,
        suggested_shot_types=analysis.suggested_shot_types,
        technical_notes=analysis.technical_notes,
        exif=analysis.to_dict()["exif"],
        proposed_keywords=proposed_keywords,
        proposed_description=analysis.scene_description,
        proposed_vibe=analysis.mood,
        proposed_best_times=proposed_best_times,
        proposed_textures=analysis.props_textures,
        proposed_anti_tourism_description=analysis.scene_description,
        gps_lat=analysis.exif.gps_lat if not request.gps_privacy else None,
        gps_lng=analysis.exif.gps_lng if not request.gps_privacy else None,
        suggested_country=suggested_country,
        suggested_place_name=suggested_place,
    )


@router.post("/save")
async def save_scout_location(request: ScoutSaveRequest):
    """Save a scouted location to the knowledge base."""
    if not request.country or not request.place_name:
        raise HTTPException(status_code=400, detail="country and place_name are required")

    # Generate thumbnail from image
    thumbnail = ""
    if request.image_base64:
        image_b64 = request.image_base64
        if "," in image_b64 and image_b64.startswith("data:"):
            image_b64 = image_b64.split(",", 1)[1]
        try:
            from services.image_analyzer import resize_for_api
            thumb_bytes = resize_for_api(
                __import__("base64").b64decode(image_b64), max_dim=200
            )
            thumbnail = __import__("base64").b64encode(thumb_bytes).decode("utf-8")
        except Exception as e:
            print(f"[Scout] Thumbnail generation failed: {e}")

    all_data = _load_locations()
    if request.country not in all_data:
        all_data[request.country] = {}

    all_data[request.country][request.place_name] = {
        "keywords": request.keywords,
        "description": request.description,
        "vibe": request.vibe,
        "best_times": request.best_times,
        "textures": request.textures,
        "anti_tourism_description": request.anti_tourism_description,
        # Extended fields
        "gps_lat": request.gps_lat,
        "gps_lng": request.gps_lng,
        "captured_at": request.captured_at,
        "image_thumbnail": thumbnail,
        "saved_at": datetime.now(timezone.utc).isoformat(),
    }

    _save_locations(all_data)
    return {"ok": True, "country": request.country, "place": request.place_name}


@router.post("/composite")
async def analyze_composite(request: CompositeRequest):
    """Analyze up to 5 images of the same location and return unified metadata.
    Each image is analyzed independently, then results are merged."""
    if not request.images_base64 or len(request.images_base64) < 2:
        raise HTTPException(status_code=400, detail="At least 2 images required")
    if len(request.images_base64) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 images allowed")

    analyzer = get_image_analyzer()
    analyses: list[ImageAnalysis] = []

    for img in request.images_base64:
        image_b64 = img
        if "," in image_b64 and image_b64.startswith("data:"):
            image_b64 = image_b64.split(",", 1)[1]
        try:
            analysis = await analyzer.analyze_b64(image_b64, "location_scout")
            analyses.append(analysis)
        except Exception as e:
            print(f"[Scout] Composite image failed: {e}")
            # Continue with partial results

    if not analyses:
        raise HTTPException(status_code=500, detail="All image analyses failed")

    # Merge results
    all_colors = []
    all_textures = []
    all_shot_types = []
    descriptions = []
    lighting_votes: dict[str, int] = {}
    mood_votes: dict[str, int] = {}

    for a in analyses:
        descriptions.append(a.scene_description)
        all_colors.extend(a.dominant_colors)
        all_textures.extend(a.props_textures)
        all_shot_types.extend(a.suggested_shot_types)
        lighting_votes[a.lighting_conditions] = lighting_votes.get(a.lighting_conditions, 0) + 1
        mood_votes[a.mood] = mood_votes.get(a.mood, 0) + 1

    # Deduplicate colors (keep first occurrence order)
    seen = set()
    unique_colors = []
    for c in all_colors:
        if c not in seen:
            seen.add(c)
            unique_colors.append(c)

    # Deduplicate textures & shot types
    unique_textures = list(dict.fromkeys(all_textures))
    unique_shot_types = list(dict.fromkeys(all_shot_types))

    best_lighting = max(lighting_votes, key=lighting_votes.get) if lighting_votes else ""
    best_mood = max(mood_votes, key=mood_votes.get) if mood_votes else ""

    # Composite description (first image leads)
    composite_desc = descriptions[0] if descriptions else ""

    # Build merged analysis
    merged = ImageAnalysis(
        scene_description=composite_desc,
        lighting_conditions=best_lighting,
        dominant_colors=unique_colors[:8],
        mood=best_mood,
        time_of_day=analyses[0].time_of_day if analyses else "",
        location_type=analyses[0].location_type if analyses else "",
        props_textures=unique_textures[:10],
        suggested_shot_types=unique_shot_types[:6],
        technical_notes=analyses[0].technical_notes if analyses else "",
        exif=analyses[0].exif if analyses else None,
    )

    return ScoutAnalysisResponse(
        scene_description=composite_desc,
        lighting_conditions=best_lighting,
        dominant_colors=unique_colors[:8],
        mood=best_mood,
        time_of_day=merged.time_of_day,
        location_type=merged.location_type,
        props_textures=unique_textures[:10],
        suggested_shot_types=unique_shot_types[:6],
        technical_notes=merged.technical_notes,
        exif=merged.to_dict()["exif"],
        proposed_keywords=_build_keywords(merged, request.country, request.place_name),
        proposed_description=composite_desc,
        proposed_vibe=best_mood,
        proposed_best_times=_infer_best_times(merged),
        proposed_textures=unique_textures[:8],
        proposed_anti_tourism_description=composite_desc,
    )
