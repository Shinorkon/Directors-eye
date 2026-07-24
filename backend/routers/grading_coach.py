"""Premiere Grading Coach — endpoints backing the UXP panel.

Both calls are read-only coaching: they analyze real data (a reference
still, the current frame's zones, Lumetri's actual current values) and
return a recipe of named Lumetri adjustments + an achievability verdict.
Neither endpoint ever writes to Premiere — the user applies the sliders
themselves.
"""

from __future__ import annotations

import base64

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.grading_coach import analyze_reference_look, generate_preview_look, get_grading_recipe

router = APIRouter(prefix="/api/grading-coach", tags=["Grading Coach"])


class AnalyzeReferenceRequest(BaseModel):
    image_base64: str
    mime_type: str = "image/jpeg"


class RecipeRequest(BaseModel):
    zones: dict
    lumetriValues: dict | None = None
    visionText: str | None = None
    referenceLook: dict | None = None
    logProfile: str = "unknown"


class PreviewRequest(BaseModel):
    frame_base64: str
    frame_mime_type: str = "image/png"
    vision_text: str | None = None
    reference_base64: str | None = None
    reference_mime_type: str | None = None


@router.post("/analyze-reference")
async def analyze_reference(request: AnalyzeReferenceRequest):
    if not request.image_base64:
        raise HTTPException(status_code=400, detail="image_base64 is required")

    image_b64 = request.image_base64
    if "," in image_b64 and image_b64.startswith("data:"):
        image_b64 = image_b64.split(",", 1)[1]

    try:
        image_bytes = base64.b64decode(image_b64)
        result = await analyze_reference_look(image_bytes, request.mime_type)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Reference analysis failed: {e}")

    return result


@router.post("/recipe")
async def recipe(request: RecipeRequest):
    try:
        result = await get_grading_recipe(
            zones=request.zones,
            lumetri_values=request.lumetriValues,
            reference_look=request.referenceLook,
            log_profile=request.logProfile,
            vision_text=request.visionText,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Recipe generation failed: {e}")

    return result


@router.post("/preview")
async def preview(request: PreviewRequest):
    if not request.vision_text and not request.reference_base64:
        raise HTTPException(status_code=400, detail="Provide vision_text and/or reference_base64.")

    def _strip_data_uri(b64: str) -> str:
        if "," in b64 and b64.startswith("data:"):
            return b64.split(",", 1)[1]
        return b64

    try:
        frame_bytes = base64.b64decode(_strip_data_uri(request.frame_base64))
        reference_bytes = (
            base64.b64decode(_strip_data_uri(request.reference_base64))
            if request.reference_base64
            else None
        )
        result = await generate_preview_look(
            frame_bytes=frame_bytes,
            frame_mime_type=request.frame_mime_type,
            vision_text=request.vision_text,
            reference_bytes=reference_bytes,
            reference_mime_type=request.reference_mime_type,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Preview generation failed: {e}")

    return result
