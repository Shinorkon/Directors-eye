"""DeepSeek API client for Scriptment generation."""

import httpx
import json
from typing import AsyncGenerator

from config import DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL

from services.prompt_builder import SCRIPTMENT_SYSTEM_PROMPT
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
            # Generate
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers=self.headers,
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

    async def stream_scriptment(self, concept: str) -> AsyncGenerator[str, None]:
        """Stream Scriptment generation (for progress UI)."""
        if not self.api_key:
            raise RuntimeError("DEEPSEEK_API_KEY not configured")

        messages = [
            {"role": "system", "content": SCRIPTMENT_SYSTEM_PROMPT},
            {"role": "user", "content": concept},
        ]

        async with httpx.AsyncClient(timeout=120.0) as client:
            # Stream
            async with client.stream(
                "POST",
                f"{self.base_url}/chat/completions",
                headers=self.headers,
                json={
                    "model": "deepseek-v4-flash",
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
