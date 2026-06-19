"""Mood color grading — applies emotional color LUTs to storyboard frames using Pillow.

No AI needed. Pre-defined curves map emotional tones to color grades.
"""

import io
import base64
from typing import Optional
from services.beat_engine import GeneratedBeat

# Try importing Pillow — gracefully degrade if not installed
try:
    from PIL import Image, ImageDraw, ImageFont
    HAS_PILLOW = True
except ImportError:
    HAS_PILLOW = False

import numpy as np
from enum import Enum


class ColorGrade(str, Enum):
    TEAL_ORANGE = "teal_orange"
    WARM_GOLDEN = "warm_golden"
    COOL_BLUE = "cool_blue"
    DESATURATED = "desaturated"
    HIGH_CONTRAST = "high_contrast"
    NATURAL = "natural"


# Emotional tone → color grade mapping
TONE_TO_GRADE = {
    "Melancholy": ColorGrade.COOL_BLUE,
    "Tense": ColorGrade.DESATURATED,
    "Contemplative": ColorGrade.NATURAL,
    "Peaceful": ColorGrade.WARM_GOLDEN,
    "Hopeful": ColorGrade.WARM_GOLDEN,
    "Joyful": ColorGrade.TEAL_ORANGE,
    "Transcendent": ColorGrade.HIGH_CONTRAST,
    "Awe": ColorGrade.TEAL_ORANGE,
    "Intimate": ColorGrade.WARM_GOLDEN,
    "Uncertain": ColorGrade.DESATURATED,
}


def _build_luts() -> dict:
    """Pre-compute RGB lookup tables for each color grade."""
    x = np.arange(256)
    luts = {}

    # Teal/Orange: shadows → teal, highlights → warm
    luts[ColorGrade.TEAL_ORANGE] = (
        np.clip(x * 0.90 + 20 * np.sin(x / 40) + 15, 0, 255).astype(np.uint8).tolist(),
        np.clip(x * 0.95 + 10 * np.sin(x / 50), 0, 255).astype(np.uint8).tolist(),
        np.clip(x * 1.05 + 25 * np.sin(x / 35) + 20, 0, 255).astype(np.uint8).tolist(),
    )

    # Warm Golden: increase red/green midtones
    luts[ColorGrade.WARM_GOLDEN] = (
        np.clip(x * 1.08 + 15, 0, 255).astype(np.uint8).tolist(),
        np.clip(x * 1.02 + 10, 0, 255).astype(np.uint8).tolist(),
        np.clip(x * 0.92, 0, 255).astype(np.uint8).tolist(),
    )

    # Cool Blue: reduce red, boost blue
    luts[ColorGrade.COOL_BLUE] = (
        np.clip(x * 0.85, 0, 255).astype(np.uint8).tolist(),
        np.clip(x * 0.95, 0, 255).astype(np.uint8).tolist(),
        np.clip(x * 1.05 + 20, 0, 255).astype(np.uint8).tolist(),
    )

    # Desaturated: move toward luminance (monochrome-ish)
    luts[ColorGrade.DESATURATED] = (
        np.clip(x * 0.75 + 32, 0, 255).astype(np.uint8).tolist(),
        np.clip(x * 0.75 + 32, 0, 255).astype(np.uint8).tolist(),
        np.clip(x * 0.75 + 32, 0, 255).astype(np.uint8).tolist(),
    )

    # High Contrast: S-curve
    s_curve = np.clip(255 * ((x / 255) ** 1.5), 0, 255).astype(np.uint8).tolist()
    luts[ColorGrade.HIGH_CONTRAST] = (s_curve, s_curve, s_curve)

    # Natural: identity
    ident = x.astype(np.uint8).tolist()
    luts[ColorGrade.NATURAL] = (ident, ident, ident)

    return luts


LUTS = _build_luts()


class MoodColorGrader:
    """Apply emotional color grading to storyboard images."""

    def __init__(self):
        self.available = HAS_PILLOW
        self._font = None
        if self.available:
            try:
                self._font = ImageFont.truetype(
                    "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf", 14
                )
            except (OSError, IOError):
                self._font = ImageFont.load_default()

    def select_grade(self, tone: str) -> ColorGrade:
        """Map an emotional tone to its color grade."""
        return TONE_TO_GRADE.get(tone, ColorGrade.NATURAL)

    def grade_image(self, image_data: bytes, tone: str) -> Optional[bytes]:
        """Apply color grading to an image. Returns graded PNG bytes or None if Pillow unavailable."""
        if not self.available:
            return None

        try:
            img = Image.open(io.BytesIO(image_data)).convert("RGB")
            grade = self.select_grade(tone)
            r_lut, g_lut, b_lut = LUTS[grade]

            r, g, b = img.split()
            r = r.point(r_lut)
            g = g.point(g_lut)
            b = b.point(b_lut)
            graded = Image.merge("RGB", (r, g, b))

            buf = io.BytesIO()
            graded.save(buf, format="PNG")
            return buf.getvalue()
        except Exception as e:
            print(f"[Grader] Failed: {e}")
            return None

    def grade_base64(self, base64_str: str, tone: str) -> str:
        """Grade a base64 image and return base64 result."""
        if not self.available:
            return base64_str

        try:
            # Strip data URI prefix if present
            if "," in base64_str:
                prefix, data = base64_str.split(",", 1)
            else:
                prefix, data = "", base64_str

            image_bytes = base64.b64decode(data)
            graded_bytes = self.grade_image(image_bytes, tone)
            if graded_bytes:
                result = base64.b64encode(graded_bytes).decode()
                if prefix:
                    return f"{prefix},{result}"
                return result
            return base64_str
        except Exception:
            return base64_str

    def embed_beat_metadata(self, image_data: bytes, beat: GeneratedBeat) -> Optional[bytes]:
        """Overlay shot metadata on a frame: number, lens, aperture, shot type."""
        if not self.available:
            return None

        try:
            img = Image.open(io.BytesIO(image_data)).convert("RGBA")

            # Semi-transparent bottom bar
            overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
            draw = ImageDraw.Draw(overlay)
            bar_h = 28
            draw.rectangle(
                [(0, img.height - bar_h), (img.width, img.height)],
                fill=(0, 0, 0, 180),
            )

            # Text
            text = (
                f"SHOT {beat.beat_number:03d} | "
                f"{beat.shot_type.value.upper()} | "
                f"{beat.recommended_lens}"
            )
            bbox = draw.textbbox((0, 0), text, font=self._font)
            tw = bbox[2] - bbox[0]
            x = (img.width - tw) // 2
            y = img.height - bar_h + 6
            draw.text((x, y), text, fill=(255, 255, 255, 220), font=self._font)

            composited = Image.alpha_composite(img, overlay)
            buf = io.BytesIO()
            composited.convert("RGB").save(buf, format="PNG")
            return buf.getvalue()
        except Exception as e:
            print(f"[Grader] Metadata embed failed: {e}")
            return None


def get_grader() -> MoodColorGrader:
    return MoodColorGrader()
