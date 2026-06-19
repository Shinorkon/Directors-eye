"""DeepSeek API client for Scriptment generation."""

import httpx
import json
from typing import AsyncGenerator

from config import DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL

SCRIPTMENT_SYSTEM_PROMPT = """You are an expert film director and cinematographer specializing in short cinematic content (30-90 seconds). You create Scriptments — structured visual narratives that bridge the gap between a creative idea and a shootable film plan.

You are optimizing for a filmmaker with this exact gear:
- Camera: Sony a6700 (APS-C, 4K 10-bit 4:2:2, S-Log3, HLG)
- Lens A: Meike 33mm f/1.4 AF (≈50mm equivalent, zero breathing, sharp wide open)
- Lens B: Meike 55mm f/1.4 AF (≈82mm equivalent, beautiful bokeh, portrait lens)
- Secondary: Find X9 smartphone (B-roll, wide, spontaneous)

Output a JSON object with this exact structure:

{
  "title": "Compelling cinematic title",
  "acts": [
    {
      "actNumber": 1,
      "title": "Act title describing the phase (e.g., 'The Setup', 'The Confrontation', 'The Resolution')",
      "beats": [
        {
          "beatNumber": 1,
          "description": "One vivid sentence describing what the audience sees. Be specific about subject, action, and environment.",
          "motivation": "One sentence explaining WHY this shot matters — what emotion or information it conveys and how it advances the story.",
          "shotType": "One of: Establishing, Wide, Medium, Close-up, ECU, POV, Aerial",
          "emotionalTone": "One of: Contemplative, Intimate, Hopeful, Awe, Transcendent, Melancholy, Tense, Joyful, Peaceful, Uncertain",
          "recommendedLens": "33mm or 55mm or Find X9"
        }
      ]
    }
  ]
}

RULES:
- Total runtime should be 30-90 seconds (5-8 beats total)
- Each act has 1-3 beats
- Use 3 acts minimum (Setup, Development, Resolution)
- Shot types should create visual variety — don't use the same type twice in a row
- Lens recommendations: 33mm for wide/storytelling shots (Establishing, Wide, Medium), 55mm for intimate/emotional shots (Close-up, ECU), Find X9 for POV/Aerial/unique angles
- Descriptions should be VISUAL — what the camera sees, not what characters think
- Motivations should reference cinematic storytelling principles (e.g., "rule of thirds placement creates unease", "shallow depth of field isolates the subject from their environment")
- Emotional tones should progress through a meaningful arc — not random
- Title should be evocative and cinematic, not literal

Respond ONLY with the JSON object. No markdown, no explanations, no code blocks."""


class DeepSeekClient:
    def __init__(self):
        self.api_key = DEEPSEEK_API_KEY
        self.base_url = DEEPSEEK_BASE_URL
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    async def generate_scriptment(self, concept: str) -> dict:
        """Generate a structured Scriptment from a user concept."""
        if not self.api_key:
            raise RuntimeError("DEEPSEEK_API_KEY not configured")

        messages = [
            {"role": "system", "content": SCRIPTMENT_SYSTEM_PROMPT},
            {"role": "user", "content": concept},
        ]

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers=self.headers,
                json={
                    "model": "deepseek-chat",
                    "messages": messages,
                    "temperature": 0.7,
                    "max_tokens": 4000,
                    "response_format": {"type": "json_object"},
                },
            )
            response.raise_for_status()
            data = response.json()
            content = data["choices"][0]["message"]["content"]
            return json.loads(content)

    async def stream_scriptment(self, concept: str) -> AsyncGenerator[str, None]:
        """Stream Scriptment generation (for progress UI)."""
        if not self.api_key:
            raise RuntimeError("DEEPSEEK_API_KEY not configured")

        messages = [
            {"role": "system", "content": SCRIPTMENT_SYSTEM_PROMPT},
            {"role": "user", "content": concept},
        ]

        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/chat/completions",
                headers=self.headers,
                json={
                    "model": "deepseek-chat",
                    "messages": messages,
                    "temperature": 0.7,
                    "max_tokens": 4000,
                    "response_format": {"type": "json_object"},
                    "stream": True,
                },
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        chunk = line[6:]
                        if chunk == "[DONE]":
                            break
                        try:
                            parsed = json.loads(chunk)
                            delta = parsed["choices"][0]["delta"].get("content", "")
                            if delta:
                                yield delta
                        except (json.JSONDecodeError, KeyError):
                            continue


# Singleton
_deepseek_client: DeepSeekClient | None = None


def get_deepseek_client() -> DeepSeekClient:
    global _deepseek_client
    if _deepseek_client is None:
        _deepseek_client = DeepSeekClient()
    return _deepseek_client
