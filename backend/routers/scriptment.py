"""Scriptment generation via unified LLM API (DeepSeek / OpenAI / Gemini)."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.llm import get_llm_client

router = APIRouter(prefix="/api/scriptment", tags=["Scriptment"])


class ConceptRequest(BaseModel):
    concept: str
    stream: bool = False


class ScriptmentResponse(BaseModel):
    title: str
    acts: list


@router.post("/generate", response_model=ScriptmentResponse)
async def generate_scriptment(request: ConceptRequest):
    """Generate a Scriptment from a concept."""
    if not request.concept or len(request.concept.strip()) < 10:
        raise HTTPException(status_code=400, detail="Concept must be at least 10 characters")

    client = get_llm_client()

    try:
        result = await client.generate_scriptment(request.concept)
        return ScriptmentResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")


@router.post("/generate/stream")
async def stream_scriptment(request: ConceptRequest):
    """Stream Scriptment generation tokens."""
    from fastapi.responses import StreamingResponse

    client = get_llm_client()

    async def token_stream():
        async for token in client.stream_scriptment(request.concept):
            yield token

    return StreamingResponse(token_stream(), media_type="text/plain")
