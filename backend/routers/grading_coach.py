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

from services.grading_coach import analyze_reference_look, get_grading_recipe

router = APIRouter(prefix="/api/grading-coach", tags=["Grading Coach"])


class AnalyzeReferenceRequest(BaseModel):
    image_base64: str
    mime_type: str = "image/jpeg"


class RecipeRequest(BaseModel):
    zones: dict
    lumetriValues: dict | None = None
    referenceLook: dict | None = None
    logProfile: str = "unknown"


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
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Recipe generation failed: {e}")

    return result
