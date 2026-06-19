"""External API image generation for storyboard frames (Gemini / Pollinations fallback)."""

import io
import base64
import httpx
from config import GEMINI_API_KEY, GEMINI_BASE_URL


class StoryboardGenerator:
    """Generates storyboard frames using external image APIs."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    @staticmethod
    def _build_prompt(description: str, shot_type: str, emotional_tone: str, lens: str) -> str:
        """Build an optimized image generation prompt from beat data."""

        framing = {
            "Establishing": "ultra wide establishing shot, vast environment, tiny subject in massive space, epic scale",
            "Wide": "wide shot, full body, environmental context, rule of thirds",
            "Medium": "medium shot, waist up, intimate framing, shallow depth of field",
            "Close-up": "close-up portrait, emotional intensity, sharp eyes, soft bokeh background",
            "ECU": "extreme close-up, detail texture, macro feel, abstract composition",
            "POV": "first person point of view, immersive perspective, through-the-lens feel",
            "Aerial": "aerial drone shot, top-down perspective, vast landscape patterns",
        }

        lens_character = {
            "33mm": "natural perspective, environmental storytelling, slight wide distortion",
            "55mm": "portrait compression, creamy bokeh, professional cinema lens quality",
            "Find X9": "ultra wide smartphone perspective, modern documentary feel",
        }

        base_framing = framing.get(shot_type, "cinematic shot")
        base_lens = lens_character.get(lens, "cinematic lens")

        prompt = (
            f"cinematic storyboard frame, film still, {base_framing}, "
            f"{base_lens}, "
            f"{emotional_tone.lower()} mood, "
            f"{description}, "
            f"warm amber and deep teal tones, 2.39:1 anamorphic widescreen, "
            f"35mm film grain, professional cinematography, "
            f"soft volumetric lighting, detailed composition, "
            f"natural skin tones, photorealistic, high detail, "
            f"Roger Deakins cinematography style, "
            f"no text, no watermark, no UI elements"
        )

        return prompt

    async def generate_frame(
        self,
        description: str,
        shot_type: str,
        emotional_tone: str,
        lens: str,
        seed: int | None = None,
    ) -> str:
        """
        Generate a single storyboard frame.
        Returns base64-encoded PNG string.
        """
        prompt = self._build_prompt(description, shot_type, emotional_tone, lens)

        # Try Gemini first if key is available
        if GEMINI_API_KEY:
            try:
                return await self._generate_gemini(prompt)
            except Exception as e:
                print(f"[Gemini] failed: {e}, falling back to Pollinations")

        # Fallback to Pollinations (free, no API key needed)
        return await self._generate_pollinations(prompt, seed)

    async def _generate_gemini(self, prompt: str) -> str:
        """Generate image using Gemini image-capable model."""
        url = f"{GEMINI_BASE_URL}/models/gemini-2.5-flash-image:generateContent"

        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt}
                    ]
                }
            ],
            "generationConfig": {
                "responseModalities": ["TEXT", "IMAGE"]
            }
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                url,
                headers={"Content-Type": "application/json"},
                params={"key": GEMINI_API_KEY},
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

            # Extract image from response
            candidates = data.get("candidates", [])
            if not candidates:
                raise RuntimeError("No candidates in Gemini response")

            parts = candidates[0].get("content", {}).get("parts", [])
            for part in parts:
                if "inlineData" in part:
                    return part["inlineData"]["data"]

            raise RuntimeError("No image data in Gemini response")

    async def _generate_pollinations(self, prompt: str, seed: int | None = None) -> str:
        """Generate image using Pollinations AI (free, no API key)."""
        import urllib.parse

        encoded_prompt = urllib.parse.quote(prompt)
        url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=768&height=320&nologo=true&seed={seed or 42}&enhance=true"

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url)
            response.raise_for_status()

            # Convert binary image to base64
            img_bytes = response.content
            return base64.b64encode(img_bytes).decode()

    async def generate_batch(
        self,
        beats: list[dict],
        progress_callback=None,
    ) -> list[str]:
        """
        Generate frames for multiple beats sequentially.
        Returns list of base64-encoded PNG strings.
        """
        frames = []

        for i, beat in enumerate(beats):
            frame = await self.generate_frame(
                description=beat["description"],
                shot_type=beat["shotType"],
                emotional_tone=beat.get("emotionalTone", "Cinematic"),
                lens=beat.get("recommendedLens", "33mm"),
                seed=i * 1000 + 42,
            )
            frames.append(frame)

            if progress_callback:
                progress_callback(i + 1, len(beats))

        return frames


def get_generator() -> StoryboardGenerator:
    """Get the singleton StoryboardGenerator."""
    return StoryboardGenerator()
