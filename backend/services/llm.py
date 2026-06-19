"""Unified LLM client supporting DeepSeek, OpenAI, and Gemini for Scriptment generation."""

import httpx
import json
from typing import AsyncGenerator

from config import (
    DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL,
    OPENAI_API_KEY, OPENAI_BASE_URL,
    GEMINI_API_KEY, GEMINI_BASE_URL,
)

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


class LLMClient:
    """Unified client that tries DeepSeek → OpenAI → Gemini in order of availability."""

    def __init__(self):
        self.provider = self._detect_provider()

    def _detect_provider(self) -> str:
        if DEEPSEEK_API_KEY:
            return "deepseek"
        if OPENAI_API_KEY:
            return "openai"
        if GEMINI_API_KEY:
            return "gemini"
        return "none"

    async def generate_scriptment(self, concept: str) -> dict:
        """Generate a structured Scriptment from a user concept."""
        if self.provider == "none":
            raise RuntimeError("No LLM API key configured. Set DEEPSEEK_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY in backend/.env")

        if self.provider == "deepseek":
            return await self._generate_deepseek(concept)
        elif self.provider == "openai":
            return await self._generate_openai(concept)
        elif self.provider == "gemini":
            return await self._generate_gemini(concept)
        else:
            raise RuntimeError(f"Unknown provider: {self.provider}")

    async def _generate_deepseek(self, concept: str) -> dict:
        headers = {
            "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
            "Content-Type": "application/json",
        }
        messages = [
            {"role": "system", "content": SCRIPTMENT_SYSTEM_PROMPT},
            {"role": "user", "content": concept},
        ]

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{DEEPSEEK_BASE_URL}/chat/completions",
                headers=headers,
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

    async def _generate_openai(self, concept: str) -> dict:
        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json",
        }
        messages = [
            {"role": "system", "content": SCRIPTMENT_SYSTEM_PROMPT},
            {"role": "user", "content": concept},
        ]

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{OPENAI_BASE_URL}/chat/completions",
                headers=headers,
                json={
                    "model": "gpt-4o-mini",
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

    async def _generate_gemini(self, concept: str) -> dict:
        url = f"{GEMINI_BASE_URL}/models/gemini-2.5-flash:generateContent"

        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": SCRIPTMENT_SYSTEM_PROMPT},
                        {"text": f"User concept: {concept}"}
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 4000,
                "responseMimeType": "application/json",
            }
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                url,
                headers={"Content-Type": "application/json"},
                params={"key": GEMINI_API_KEY},
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

            candidates = data.get("candidates", [])
            if not candidates:
                raise RuntimeError("No candidates in Gemini response")

            parts = candidates[0].get("content", {}).get("parts", [])
            for part in parts:
                text = part.get("text", "")
                if text:
                    # Gemini might wrap JSON in markdown fences
                    text = text.strip()
                    if text.startswith("```json"):
                        text = text[7:]
                    if text.startswith("```"):
                        text = text[3:]
                    if text.endswith("```"):
                        text = text[:-3]
                    return json.loads(text.strip())

            raise RuntimeError("No text content in Gemini response")

    async def stream_scriptment(self, concept: str) -> AsyncGenerator[str, None]:
        """Stream Scriptment generation tokens (DeepSeek/OpenAI only)."""
        if self.provider not in ("deepseek", "openai"):
            # Gemini doesn't support streaming JSON well, yield full response
            result = await self.generate_scriptment(concept)
            yield json.dumps(result)
            return

        headers = {
            "Authorization": f"Bearer {DEEPSEEK_API_KEY if self.provider == 'deepseek' else OPENAI_API_KEY}",
            "Content-Type": "application/json",
        }
        base_url = DEEPSEEK_BASE_URL if self.provider == "deepseek" else OPENAI_BASE_URL
        model = "deepseek-chat" if self.provider == "deepseek" else "gpt-4o-mini"

        messages = [
            {"role": "system", "content": SCRIPTMENT_SYSTEM_PROMPT},
            {"role": "user", "content": concept},
        ]

        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                f"{base_url}/chat/completions",
                headers=headers,
                json={
                    "model": model,
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
_llm_client: LLMClient | None = None


def get_llm_client() -> LLMClient:
    global _llm_client
    if _llm_client is None:
        _llm_client = LLMClient()
    return _llm_client
