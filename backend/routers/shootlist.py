"""Shoot list assembly — rule-based, no AI needed."""

from fastapi import APIRouter
from pydantic import BaseModel

from config import SHOT_SETTINGS, LENS_SETTINGS, SHOT_TYPE_SETTINGS

router = APIRouter(prefix="/api/shootlist", tags=["Shoot List"])


class ScriptmentRequest(BaseModel):
    scriptment: dict


def infer_lighting(description: str) -> str:
    """Infer lighting conditions from beat description."""
    desc_lower = description.lower()
    if any(w in desc_lower for w in ["dawn", "sunrise", "sunset", "golden", "dusk"]):
        return "golden_hour"
    if any(w in desc_lower for w in ["blue hour", "twilight", "pre-dawn", "nightfall"]):
        return "blue_hour"
    if any(w in desc_lower for w in ["night", "dark", "midnight", "noir"]):
        return "night"
    if any(w in desc_lower for w in ["interior", "inside", "room", "window light"]):
        return "interior"
    if any(w in desc_lower for w in ["overcast", "cloudy", "grey", "foggy"]):
        return "overcast"
    return "daylight"


@router.post("/generate")
async def generate_shoot_list(request: ScriptmentRequest):
    """Generate complete shoot list with camera settings."""
    scriptment = request.scriptment
    shoot_list = []

    for act in scriptment.get("acts", []):
        for beat in act.get("beats", []):
            shot_type = beat.get("shotType", "Medium")
            lens = beat.get("recommendedLens", "33mm")
            lighting = infer_lighting(beat.get("description", ""))

            # Get base settings
            light_settings = SHOT_SETTINGS.get(lighting, SHOT_SETTINGS["daylight"])
            type_settings = SHOT_TYPE_SETTINGS.get(shot_type, SHOT_TYPE_SETTINGS["Medium"])
            lens_info = LENS_SETTINGS.get(lens, LENS_SETTINGS["33mm"])

            # Refine aperture based on intent
            aperture = type_settings["aperture"]
            if "shallow" in beat.get("description", "").lower() or "bokeh" in beat.get("description", "").lower():
                aperture = "f/1.4"
            elif "deep focus" in beat.get("description", "").lower():
                aperture = "f/8"

            # Build composition note
            composition = build_composition_note(shot_type, beat.get("description", ""))

            shot_data = {
                **beat,
                "cameraSettings": {
                    "lens": lens_info["name"],
                    "aperture": aperture,
                    "shutter": type_settings["shutter"],
                    "iso": light_settings["iso"],
                    "whiteBalance": light_settings["whiteBalance"],
                    "pictureProfile": light_settings["pictureProfile"],
                    "composition": composition,
                    "notes": build_director_note(beat, lens_info),
                }
            }
            shoot_list.append(shot_data)

    return {"shots": shoot_list, "total": len(shoot_list)}


def build_composition_note(shot_type: str, description: str) -> str:
    """Generate specific composition guidance."""
    notes = {
        "Establishing": "Place subject on lower third. Let the environment dominate the frame. Leading lines toward subject.",
        "Wide": "Rule of thirds — subject at intersection. Show environment context. Negative space for atmosphere.",
        "Medium": "Frame at waist level. Subject slightly off-center for dynamic tension. Background provides context.",
        "Close-up": "Eyes on upper third line. Shallow depth isolates from background. Catch light in the eyes.",
        "ECU": "Center the detail. Let texture tell the story. Extreme shallow focus — millimeters of depth.",
        "POV": "Frame what the character sees. Natural head-height. Slight handheld energy for immersion.",
        "Aerial": "Look for patterns in the landscape. Subject as a point in a vast canvas. Symmetry or strong diagonals.",
    }
    return notes.get(shot_type, "Compose for story. Subject placement should guide the eye.")


def build_director_note(beat: dict, lens_info: dict) -> str:
    """Generate a practical director's note for the shot."""
    notes = [
        f"Use the {lens_info['name']}. {lens_info['strengths']}.",
    ]

    shot_type = beat.get("shotType", "Medium")
    if shot_type in ["Close-up", "ECU"]:
        notes.append("Pull focus to the eyes. That's where the story lives.")
    elif shot_type in ["Establishing", "Wide"]:
        notes.append("Hold this shot longer than feels comfortable. Let the audience breathe.")
    elif shot_type == "POV":
        notes.append("Shoot handheld with slight natural movement. Don't overshoot.")

    emotional = beat.get("emotionalTone", "")
    if emotional in ["Tense", "Uncertain"]:
        notes.append("Keep the camera still. The tension is in the subject, not the movement.")
    elif emotional in ["Hopeful", "Joyful"]:
        notes.append("Allow a slow push-in. The movement toward the subject amplifies the feeling.")

    return " ".join(notes)
