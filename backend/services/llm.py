"""Unified LLM client supporting DeepSeek, OpenAI, and Gemini for Scriptment generation."""

import httpx
import json
from typing import AsyncGenerator, List, Optional

from config import (
    DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL,
    GROK_API_KEY, GROK_BASE_URL,
    OPENAI_API_KEY, OPENAI_BASE_URL,
    GEMINI_API_KEY, GEMINI_BASE_URL,
)

from services.prompt_builder import SCRIPTMENT_SYSTEM_PROMPT
from services.beat_engine import BeatTemplateEngine, GeneratedBeat, EmotionalArc


class LLMClient:
    """Unified client that tries DeepSeek → Grok → OpenAI → Gemini in order of availability (cheapest first)."""

    def __init__(self):
        self.provider = self._detect_provider()

    def _detect_provider(self) -> str:
        if DEEPSEEK_API_KEY:
            return "deepseek"
        if GROK_API_KEY:
            return "grok"
        if OPENAI_API_KEY:
            return "openai"
        if GEMINI_API_KEY:
            return "gemini"
        return "none"

    async def generate_scriptment(self, concept: str) -> dict:
        """Generate a structured Scriptment from a user concept (legacy full-prompt method)."""
        if self.provider == "none":
            raise RuntimeError("No LLM API key configured.")

        if self.provider == "deepseek":
            return await self._generate_deepseek(concept)
        elif self.provider == "grok":
            return await self._generate_grok(concept)
        elif self.provider == "openai":
            return await self._generate_openai(concept)
        elif self.provider == "gemini":
            return await self._generate_gemini(concept)
        else:
            raise RuntimeError(f"Unknown provider: {self.provider}")

    async def generate_descriptions_only(
        self,
        beats: List[GeneratedBeat],
        concept: str,
        original_concept: str = "",
    ) -> List[GeneratedBeat]:
        """
        Optimized generation: LLM only fills in descriptions + motivations.
        Beat structure (acts, shot types, lenses, tones) is pre-defined.
        """
        if self.provider == "none":
            raise RuntimeError("No LLM API key configured.")

        # Build a minimal prompt from the beat engine
        engine = BeatTemplateEngine()
        prompt = engine.build_llm_prompt(beats, concept, original_concept)

        # Send to LLM and parse the descriptions array
        if self.provider in ("deepseek", "grok", "openai"):
            descriptions = await self._send_descriptions_prompt(prompt)
        elif self.provider == "gemini":
            descriptions = await self._send_descriptions_gemini(prompt)
        else:
            raise RuntimeError(f"Unknown provider: {self.provider}")

        # Merge descriptions back into beats
        desc_by_beat = {d.get("beatNumber"): d for d in descriptions if "beatNumber" in d}
        for beat in beats:
            desc = desc_by_beat.get(beat.beat_number, {})
            if desc.get("description"):
                beat.description = desc["description"]
            if desc.get("motivation"):
                beat.motivation = desc["motivation"]

        return beats

    async def _send_descriptions_prompt(self, prompt: str) -> list:
        """Send a descriptions-only prompt to DeepSeek/Grok/OpenAI."""
        if self.provider == "deepseek":
            api_key, base_url, model = DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL, "deepseek-v4-flash"
        elif self.provider == "grok":
            api_key, base_url, model = GROK_API_KEY, GROK_BASE_URL, "grok-3"
        else:
            api_key, base_url, model = OPENAI_API_KEY, OPENAI_BASE_URL, "gpt-4o-mini"

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{base_url}/chat/completions",
                headers=headers,
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": "You are a film director writing visual descriptions. You MUST stay tightly focused on the user's specific concept. Every description must clearly depict the exact subject, action, and environment the user described. Never write generic, unrelated, or default cinematic content like harbors, construction sites, industrial machinery, or landscapes unless they are explicitly part of the user's concept."},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.55,
                    "max_tokens": 3000,
                    "response_format": {"type": "json_object"},
                },
            )
            response.raise_for_status()
            data = response.json()
            content = data["choices"][0]["message"]["content"]

            # Parse — might be {"beats": [...]} or just [...]
            parsed = json.loads(content)
            if isinstance(parsed, dict) and "beats" in parsed:
                return parsed["beats"]
            if isinstance(parsed, list):
                return parsed
            return []

    async def _send_descriptions_gemini(self, prompt: str) -> list:
        """Send descriptions prompt to Gemini."""
        url = f"{GEMINI_BASE_URL}/models/gemini-2.5-flash:generateContent"

        payload = {
            "systemInstruction": {
                "parts": [{"text": "You are a film director writing visual descriptions. You MUST stay tightly focused on the user's specific concept. Every description must clearly depict the exact subject, action, and environment the user described. Never write generic, unrelated, or default cinematic content like harbors, construction sites, industrial machinery, or landscapes unless they are explicitly part of the user's concept."}]
            },
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.55,
                "maxOutputTokens": 3000,
                "responseMimeType": "application/json",
            },
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
                return []

            parts = candidates[0].get("content", {}).get("parts", [])
            for part in parts:
                text = part.get("text", "").strip()
                if text:
                    text = text.removeprefix("```json").removeprefix("```").removesuffix("```")
                    parsed = json.loads(text)
                    if isinstance(parsed, dict) and "beats" in parsed:
                        return parsed["beats"]
                    if isinstance(parsed, list):
                        return parsed
            return []

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
                    "model": "deepseek-v4-flash",
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

    async def _generate_grok(self, concept: str) -> dict:
        headers = {
            "Authorization": f"Bearer {GROK_API_KEY}",
            "Content-Type": "application/json",
        }
        messages = [
            {"role": "system", "content": SCRIPTMENT_SYSTEM_PROMPT},
            {"role": "user", "content": concept},
        ]

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{GROK_BASE_URL}/chat/completions",
                headers=headers,
                json={
                    "model": "grok-3",
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
        if self.provider not in ("deepseek", "grok", "openai"):
            # Gemini doesn't support streaming JSON well, yield full response
            result = await self.generate_scriptment(concept)
            yield json.dumps(result)
            return

        api_key = DEEPSEEK_API_KEY if self.provider == 'deepseek' else (GROK_API_KEY if self.provider == 'grok' else OPENAI_API_KEY)
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        if self.provider == "deepseek":
            base_url = DEEPSEEK_BASE_URL
            model = "deepseek-v4-flash"
        elif self.provider == "grok":
            base_url = GROK_BASE_URL
            model = "grok-3"
        else:
            base_url = OPENAI_BASE_URL
            model = "gpt-4o-mini"

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
