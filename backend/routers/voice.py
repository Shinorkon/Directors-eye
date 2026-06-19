"""TTS endpoints for director's voice."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from models.kokoro_tts import get_voice

router = APIRouter(prefix="/api/voice", tags=["Voice"])


class SpeakRequest(BaseModel):
    text: str
    voice: str = "af_heart"


class DirectorNoteRequest(BaseModel):
    shotNumber: int
    description: str
    compositionTip: str
    noteType: str = "feedback"


@router.post("/speak")
async def speak(request: SpeakRequest):
    """Convert text to speech."""
    try:
        voice = get_voice()
        audio_b64 = voice.speak(request.text, voice=request.voice)
        return {"audio_base64": audio_b64, "format": "wav"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS failed: {str(e)}")


@router.post("/director-note")
async def director_note(request: DirectorNoteRequest):
    """Generate a director's note as spoken audio."""
    try:
        voice = get_voice()
        audio_b64 = voice.speak_director_note(
            shot_number=request.shotNumber,
            description=request.description,
            composition_tip=request.compositionTip,
            note_type=request.noteType,
        )
        return {"audio_base64": audio_b64, "format": "wav"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Director note failed: {str(e)}")
