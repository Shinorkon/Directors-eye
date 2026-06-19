"""TTS fallback using external APIs or browser-based synthesis."""

import io
import base64


class DirectorVoice:
    """Text-to-speech for director's notes and feedback.
    
    Since local Kokoro TTS is not available, this uses a placeholder
    that returns empty audio. In production, integrate with:
    - Google Cloud Text-to-Speech API
    - ElevenLabs API
    - Azure Speech Services
    - Or use the browser's built-in speechSynthesis API on the frontend
    """

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def speak(self, text: str, voice: str = "af_heart") -> str:
        """
        Convert text to speech.
        Returns base64-encoded WAV (placeholder — empty audio).
        """
        # Return a minimal valid WAV header (silence)
        # This is a placeholder. In production, integrate with an external TTS API.
        minimal_wav = base64.b64encode(b"").decode()
        return minimal_wav

    def speak_director_note(
        self,
        shot_number: int,
        description: str,
        composition_tip: str,
        note_type: str = "feedback",
    ) -> str:
        """
        Generate a director's note in natural voice.
        
        note_type: 'feedback' | 'praise' | 'concern' | 'suggestion'
        """
        templates = {
            "feedback": (
                f"Shot {shot_number}. {description}. "
                f"For this one, {composition_tip}. "
                f"Take your time with the framing."
            ),
            "praise": (
                f"Shot {shot_number} is your hero frame. {description}. "
                f"This will anchor your entire sequence."
            ),
            "concern": (
                f"For shot {shot_number}, {description}. "
                f"Be careful here — {composition_tip}. "
                f"This one's easy to miss."
            ),
            "suggestion": (
                f"Consider this for shot {shot_number}: {description}. "
                f"{composition_tip}. It could add real depth to the story."
            ),
        }

        text = templates.get(note_type, templates["feedback"])
        return self.speak(text)


def get_voice() -> DirectorVoice:
    """Get the singleton DirectorVoice."""
    return DirectorVoice()
