"""Storyboard frame generation via external image APIs."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from models.sdxl_turbo import get_generator

router = APIRouter(prefix="/api/storyboard", tags=["Storyboard"])


class FrameRequest(BaseModel):
    description: str
    shotType: str
    emotionalTone: str = "Cinematic"
    recommendedLens: str = "33mm"
    seed: int | None = None


class BatchRequest(BaseModel):
    beats: list[dict]


class FrameResponse(BaseModel):
    image_base64: str
    seed: int


@router.post("/generate", response_model=FrameResponse)
async def generate_frame(request: FrameRequest):
    """Generate a single storyboard frame."""
    try:
        generator = get_generator()
        img_b64 = await generator.generate_frame(
            description=request.description,
            shot_type=request.shotType,
            emotional_tone=request.emotionalTone,
            lens=request.recommendedLens,
            seed=request.seed,
        )
        return FrameResponse(image_base64=img_b64, seed=request.seed or 0)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Frame generation failed: {str(e)}")


@router.post("/generate/batch")
async def generate_batch(request: BatchRequest):
    """Generate frames for multiple beats sequentially."""
    try:
        generator = get_generator()
        frames = await generator.generate_batch(request.beats)
        return {"frames": frames, "count": len(frames)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch generation failed: {str(e)}")


@router.get("/status")
async def get_status():
    """Check external API status."""
    from config import GEMINI_API_KEY
    return {
        "gemini_configured": bool(GEMINI_API_KEY),
        "pollinations_available": True,
        "mode": "external_api",
    }
