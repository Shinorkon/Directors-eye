"""Image analysis service — uses Gemini Vision (or fallback) to extract
cinematic metadata from location scout photos and reference images.

Supports three analysis modes:
  - location_scout: lighting profile, spatial layout, textures, best times
  - scriptment_concept: narrative potential, emotional atmosphere, props
  - reference: color palette, lighting ratio, composition style (mood boarding)

EXIF extraction: GPS (DMS → decimal), datetime, camera model, orientation.
Images are resized to max 1024px before API send (mobile photos are 5-15 MB).
"""

from __future__ import annotations

import base64
import io
import json
import re
from dataclasses import dataclass, field
from typing import Optional

import httpx
from PIL import Image, ExifTags
from PIL.ExifTags import TAGS, GPSTAGS

from config import (
    GEMINI_API_KEY,
    GEMINI_BASE_URL,
    OPENAI_API_KEY,
    OPENAI_BASE_URL,
)

# ── constants ──────────────────────────────────────────────────────

MAX_DIMENSION = 1024  # px — resize before sending to API
VISION_TIMEOUT = 30.0  # seconds


# ── data classes ────────────────────────────────────────────────────

@dataclass
class ExifData:
    """Structured EXIF metadata extracted from the image."""
    camera_model: str = ""
    captured_at: str = ""          # ISO 8601
    gps_lat: Optional[float] = None
    gps_lng: Optional[float] = None
    orientation: int = 1           # EXIF orientation tag (1 = normal)
    iso: Optional[int] = None
    aperture: str = ""             # e.g. "f/2.8"
    shutter_speed: str = ""        # e.g. "1/250s"
    focal_length: str = ""         # e.g. "35mm"


@dataclass
class ImageAnalysis:
    """Structured result of image analysis — feeds into location KB or
    scriptment pipeline."""
    scene_description: str = ""    # What the camera sees — visual description
    lighting_conditions: str = ""  # e.g. "overcast", "golden_hour", "interior_tungsten"
    dominant_colors: list[str] = field(default_factory=list)  # hex e.g. ["#3A4B5C", "#D4A574"]
    mood: str = ""                 # e.g. "melancholy", "hopeful", "tense"
    time_of_day: str = ""          # inferred from lighting
    location_type: str = ""        # e.g. "harbor", "urban_street", "interior"
    props_textures: list[str] = field(default_factory=list)  # e.g. ["rusty metal", "wet concrete"]
    suggested_shot_types: list[str] = field(default_factory=list)  # e.g. ["Wide", "Close-up"]
    technical_notes: str = ""      # framing suggestions, composition notes
    exif: ExifData = field(default_factory=ExifData)
    raw_gemini_response: str = ""  # full JSON for debugging

    def to_dict(self) -> dict:
        return {
            "scene_description": self.scene_description,
            "lighting_conditions": self.lighting_conditions,
            "dominant_colors": self.dominant_colors,
            "mood": self.mood,
            "time_of_day": self.time_of_day,
            "location_type": self.location_type,
            "props_textures": self.props_textures,
            "suggested_shot_types": self.suggested_shot_types,
            "technical_notes": self.technical_notes,
            "exif": {
                "camera_model": self.exif.camera_model,
                "captured_at": self.exif.captured_at,
                "gps_lat": self.exif.gps_lat,
                "gps_lng": self.exif.gps_lng,
                "orientation": self.exif.orientation,
                "iso": self.exif.iso,
                "aperture": self.exif.aperture,
                "shutter_speed": self.exif.shutter_speed,
                "focal_length": self.exif.focal_length,
            },
        }


# ── Gemini prompts per analysis type ────────────────────────────────

LOCATION_SCOUT_PROMPT = """You are a location scout and cinematographer. Analyze this photo of a filming location and return ONLY valid JSON — no markdown, no code fences, no explanation.

Return this exact JSON structure:
{
  "scene_description": "One paragraph describing the space visually — layout, architecture, materials, natural features, light sources",
  "lighting_conditions": "One of: golden_hour_am, golden_hour_pm, harsh_midday, overcast, twilight, blue_hour, night, interior_tungsten, interior_daylight, mixed_lighting",
  "dominant_colors": ["#HEX1", "#HEX2", "#HEX3", "#HEX4", "#HEX5"],
  "mood": "One of: melancholy, hopeful, tense, intimate, contemplative, awe, peaceful, gritty, unsettling, neutral",
  "time_of_day": "Your best guess: dawn, morning, midday, afternoon, golden_hour, sunset, twilight, night, or unknown",
  "location_type": "e.g. harbor, urban_street, forest, interior_room, market, beach, mountain, alley, rooftop, cafe",
  "props_textures": ["list", "of", "notable", "textures", "and", "materials"],
  "suggested_shot_types": ["1-4", "shot types", "that would", "work here"],
  "technical_notes": "Brief cinematography advice — where to position camera, what focal lengths, exposure considerations"
}

Be specific and concrete. Avoid generic film-school language. If you see rust, say rust. If the light is fluorescent, say fluorescent. The filmmaker needs actionable production intelligence from this location."""

SCRIPTMENT_CONCEPT_PROMPT = """You are a filmmaker analyzing a location photo. Your job: describe what you see in a way that inspires a short film script. Return ONLY valid JSON — no markdown, no code fences.

Return this exact JSON structure:
{
  "scene_description": "A cinematic, visual paragraph describing this location as if it were a film set. Be specific about light, texture, atmosphere. What story lives here?",
  "narrative_potential": "What kind of scene could unfold here? Be specific — name the genre, the emotional register, the kind of character who belongs here",
  "mood": "One of: melancholy, hopeful, tense, intimate, contemplative, awe, peaceful, gritty, unsettling, romantic, mysterious",
  "time_of_day": "Best guess: dawn, morning, midday, afternoon, golden_hour, sunset, twilight, night",
  "props_details": ["specific", "objects", "or", "features", "that", "suggest", "story"],
  "lighting_quality": "Description of the natural or artificial light — direction, color temperature, quality (hard/soft)",
  "suggested_genre": "e.g. neo-noir, slice-of-life, thriller, romance, documentary, experimental"
}

Write the scene_description as if it's the opening paragraph of a screenplay treatment. Make the filmmaker WANT to shoot here."""

REFERENCE_PROMPT = """You are a colorist and cinematographer analyzing a reference image for mood boarding. Return ONLY valid JSON — no markdown, no code fences.

Return this exact JSON structure:
{
  "color_palette": ["#HEX1", "#HEX2", "#HEX3", "#HEX4", "#HEX5", "#HEX6"],
  "lighting_ratio": "high_contrast, low_contrast, or balanced",
  "lighting_direction": "front, side, back, top, or ambient",
  "color_temperature_tendency": "warm, cool, neutral, or mixed",
  "composition_style": "e.g. center_framed, rule_of_thirds, dutch_angle, symmetrical, leading_lines, negative_space",
  "depth_of_field": "shallow, medium, or deep",
  "dominant_mood": "The single strongest emotional impression",
  "film_stock_reference": "What film stock or grade this resembles — e.g. Kodak Portra 400, Fuji Eterna, bleach bypass, teal-orange"
}

Be specific. A colorist should be able to match this look from your description alone."""

PROMPTS = {
    "location_scout": LOCATION_SCOUT_PROMPT,
    "scriptment_concept": SCRIPTMENT_CONCEPT_PROMPT,
    "reference": REFERENCE_PROMPT,
}

VALID_ANALYSIS_TYPES = set(PROMPTS.keys())


# ── EXIF helpers ────────────────────────────────────────────────────

def _dms_to_decimal(degrees: float, minutes: float, seconds: float, ref: str) -> float:
    """Convert GPS DMS (degrees/minutes/seconds) to decimal degrees."""
    decimal = degrees + minutes / 60.0 + seconds / 3600.0
    if ref in ("S", "W"):
        decimal = -decimal
    return round(decimal, 6)


def extract_exif(image_bytes: bytes) -> ExifData:
    """Extract structured EXIF data from raw image bytes."""
    exif = ExifData()
    try:
        img = Image.open(io.BytesIO(image_bytes))
        raw_exif = img.getexif()
        if not raw_exif:
            return exif

        # Map EXIF tag IDs to names
        decoded = {}
        for tag_id, value in raw_exif.items():
            tag_name = TAGS.get(tag_id, tag_id)
            decoded[tag_name] = value

        # Camera model
        exif.camera_model = str(decoded.get("Model", "") or decoded.get("Make", ""))

        # Capture datetime
        dt = decoded.get("DateTimeOriginal") or decoded.get("DateTime")
        if dt:
            exif.captured_at = str(dt)

        # Orientation
        orient = decoded.get("Orientation")
        if orient is not None:
            exif.orientation = int(orient)

        # ISO
        iso_val = decoded.get("ISOSpeedRatings") or decoded.get("ISO")
        if iso_val is not None:
            try:
                exif.iso = int(iso_val)
            except (ValueError, TypeError):
                pass

        # Aperture
        aperture_val = decoded.get("FNumber") or decoded.get("ApertureValue")
        if aperture_val is not None:
            try:
                exif.aperture = f"f/{float(aperture_val):.1f}"
            except (ValueError, TypeError):
                pass

        # Shutter speed
        shutter_val = decoded.get("ExposureTime")
        if shutter_val is not None:
            try:
                s = float(shutter_val)
                if s < 1:
                    exif.shutter_speed = f"1/{round(1/s)}s"
                else:
                    exif.shutter_speed = f"{s:.1f}s"
            except (ValueError, TypeError):
                pass

        # Focal length
        focal_val = decoded.get("FocalLength") or decoded.get("FocalLengthIn35mmFilm")
        if focal_val is not None:
            try:
                exif.focal_length = f"{float(focal_val):.0f}mm"
            except (ValueError, TypeError):
                pass

        # GPS data
        gps_info = decoded.get("GPSInfo")
        if gps_info:
            gps_data = {}
            for k, v in gps_info.items():
                tag = GPSTAGS.get(k, k)
                gps_data[tag] = v

            gps_lat = gps_data.get("GPSLatitude")
            gps_lat_ref = gps_data.get("GPSLatitudeRef", "N")
            gps_lng = gps_data.get("GPSLongitude")
            gps_lng_ref = gps_data.get("GPSLongitudeRef", "E")

            if gps_lat and gps_lng:
                try:
                    exif.gps_lat = _dms_to_decimal(
                        float(gps_lat[0]), float(gps_lat[1]), float(gps_lat[2]), str(gps_lat_ref)
                    )
                    exif.gps_lng = _dms_to_decimal(
                        float(gps_lng[0]), float(gps_lng[1]), float(gps_lng[2]), str(gps_lng_ref)
                    )
                except (ValueError, TypeError, IndexError):
                    pass

    except Exception as e:
        print(f"[ImageAnalyzer] EXIF extraction failed: {e}")

    return exif


# ── image prep ──────────────────────────────────────────────────────

def resize_for_api(image_bytes: bytes, max_dim: int = MAX_DIMENSION) -> bytes:
    """Resize image so longest edge ≤ max_dim, preserving aspect ratio.
    Returns JPEG bytes suitable for API upload."""
    img = Image.open(io.BytesIO(image_bytes))

    # Convert RGBA → RGB if needed
    if img.mode in ("RGBA", "P", "LA"):
        background = Image.new("RGB", img.size, (0, 0, 0))
        if img.mode == "P":
            img = img.convert("RGBA")
        if img.mode == "LA":
            img = img.convert("RGBA")
        background.paste(img, mask=img.split()[-1] if img.mode == "RGBA" else None)
        img = background
    elif img.mode != "RGB":
        img = img.convert("RGB")

    # Resize if needed
    w, h = img.size
    if max(w, h) > max_dim:
        ratio = max_dim / max(w, h)
        new_size = (int(w * ratio), int(h * ratio))
        img = img.resize(new_size, Image.LANCZOS)

    # Encode to JPEG
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85, optimize=True)
    return buf.getvalue()


# ── Gemini Vision client ────────────────────────────────────────────

def _parse_gemini_json(raw_text: str) -> dict:
    """Extract JSON from Gemini's response, stripping markdown fences if present."""
    text = raw_text.strip()

    # Remove markdown code fences
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)

    # Try direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try to find JSON object in text
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    return {"raw_text": text}


async def _analyze_gemini(image_b64: str, analysis_type: str) -> ImageAnalysis:
    """Send image to Gemini Vision for analysis."""
    prompt_text = PROMPTS.get(analysis_type, LOCATION_SCOUT_PROMPT)

    url = f"{GEMINI_BASE_URL}/models/gemini-2.5-flash:generateContent"

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt_text},
                    {"inline_data": {"mime_type": "image/jpeg", "data": image_b64}},
                ]
            }
        ]
    }

    async with httpx.AsyncClient(timeout=VISION_TIMEOUT) as client:
        resp = await client.post(f"{url}?key={GEMINI_API_KEY}", json=payload)
        resp.raise_for_status()
        data = resp.json()

    raw_text = ""
    try:
        raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError, TypeError):
        raise RuntimeError(f"Unexpected Gemini response structure: {json.dumps(data)[:500]}")

    parsed = _parse_gemini_json(raw_text)

    return ImageAnalysis(
        scene_description=parsed.get("scene_description", parsed.get("description", "")),
        lighting_conditions=parsed.get("lighting_conditions", ""),
        dominant_colors=parsed.get("dominant_colors", parsed.get("color_palette", [])),
        mood=parsed.get("mood", parsed.get("dominant_mood", "")),
        time_of_day=parsed.get("time_of_day", ""),
        location_type=parsed.get("location_type", ""),
        props_textures=parsed.get("props_textures", parsed.get("props_details", [])),
        suggested_shot_types=parsed.get("suggested_shot_types", []),
        technical_notes=parsed.get("technical_notes", ""),
        raw_gemini_response=raw_text,
    )


async def _analyze_openai_vision(image_b64: str, analysis_type: str) -> ImageAnalysis:
    """Fallback: use OpenAI GPT-4o for vision analysis."""
    prompt_text = PROMPTS.get(analysis_type, LOCATION_SCOUT_PROMPT)

    url = f"{OPENAI_BASE_URL}/chat/completions"

    payload = {
        "model": "gpt-4o-mini",
        "max_tokens": 1024,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt_text},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{image_b64}",
                            "detail": "low",
                        },
                    },
                ],
            }
        ],
    }

    async with httpx.AsyncClient(timeout=VISION_TIMEOUT) as client:
        resp = await client.post(
            url,
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()

    raw_text = data["choices"][0]["message"]["content"]
    parsed = _parse_gemini_json(raw_text)

    return ImageAnalysis(
        scene_description=parsed.get("scene_description", parsed.get("description", "")),
        lighting_conditions=parsed.get("lighting_conditions", ""),
        dominant_colors=parsed.get("dominant_colors", parsed.get("color_palette", [])),
        mood=parsed.get("mood", parsed.get("dominant_mood", "")),
        time_of_day=parsed.get("time_of_day", ""),
        location_type=parsed.get("location_type", ""),
        props_textures=parsed.get("props_textures", parsed.get("props_details", [])),
        suggested_shot_types=parsed.get("suggested_shot_types", []),
        technical_notes=parsed.get("technical_notes", ""),
        raw_gemini_response=raw_text,
    )


# ── public API ──────────────────────────────────────────────────────

class ImageAnalyzer:
    """Service for analyzing location/reference photos via vision APIs.

    Usage:
        analyzer = get_image_analyzer()
        analysis = await analyzer.analyze(image_bytes, "location_scout")
    """

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    async def analyze(
        self,
        image_data: bytes,
        analysis_type: str = "location_scout",
    ) -> ImageAnalysis:
        """Analyze an image and return structured cinematic metadata.

        Args:
            image_data: Raw image bytes (JPEG/PNG/HEIC — Pillow handles decoding).
            analysis_type: One of "location_scout", "scriptment_concept", "reference".

        Returns:
            ImageAnalysis with scene description, lighting, mood, colors, etc.
        """
        if analysis_type not in VALID_ANALYSIS_TYPES:
            raise ValueError(
                f"Invalid analysis_type: {analysis_type}. "
                f"Must be one of: {', '.join(sorted(VALID_ANALYSIS_TYPES))}"
            )

        # Extract EXIF from original before resize
        exif = extract_exif(image_data)

        # Resize for API efficiency
        resized = resize_for_api(image_data)
        image_b64 = base64.b64encode(resized).decode("utf-8")

        # Try Gemini → OpenAI fallback
        last_error = None
        for provider in ("gemini", "openai"):
            try:
                if provider == "gemini" and GEMINI_API_KEY:
                    result = await _analyze_gemini(image_b64, analysis_type)
                elif provider == "openai" and OPENAI_API_KEY:
                    result = await _analyze_openai_vision(image_b64, analysis_type)
                else:
                    continue

                result.exif = exif
                return result
            except Exception as e:
                last_error = e
                print(f"[ImageAnalyzer] {provider} failed: {e}")

        raise RuntimeError(
            f"All vision providers failed. Last error: {last_error}. "
            "Ensure GEMINI_API_KEY or OPENAI_API_KEY is configured."
        )

    async def analyze_b64(
        self,
        image_base64: str,
        analysis_type: str = "location_scout",
    ) -> ImageAnalysis:
        """Analyze from base64-encoded image string (as received from frontend)."""
        image_data = base64.b64decode(image_base64)
        return await self.analyze(image_data, analysis_type)

    async def analyze_location(
        self,
        image_base64: str,
        gps_privacy: bool = True,
    ) -> ImageAnalysis:
        """Convenience: analyze for location scout use case.
        If gps_privacy=True, GPS data is extracted but NOT sent to Gemini —
        it's only kept in the EXIF field for local use.
        """
        return await self.analyze_b64(image_base64, "location_scout")

    async def analyze_for_scriptment(self, image_base64: str) -> ImageAnalysis:
        """Convenience: analyze for scriptment concept generation."""
        return await self.analyze_b64(image_base64, "scriptment_concept")

    async def analyze_reference(self, image_base64: str) -> ImageAnalysis:
        """Convenience: analyze a reference image for mood boarding."""
        return await self.analyze_b64(image_base64, "reference")


def get_image_analyzer() -> ImageAnalyzer:
    """Get singleton ImageAnalyzer instance."""
    return ImageAnalyzer()
