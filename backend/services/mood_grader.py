"""Mood color grading — applies emotional color LUTs to storyboard frames using Pillow.

Grades are derived dynamically from tone + description analysis, not a fixed lookup.
Default is NATURAL (identity) — only applies a grade when there's clear signal.
"""

import io
import base64
import re
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

# ── Dynamic grade selection from tone + description ──────────────

# Time-of-day signals in the description that suggest a specific grade
TIME_GRADE_HINTS = {
    "golden": ColorGrade.WARM_GOLDEN,
    "sunset": ColorGrade.WARM_GOLDEN,
    "sunrise": ColorGrade.WARM_GOLDEN,
    "dawn": ColorGrade.WARM_GOLDEN,
    "dusk": ColorGrade.WARM_GOLDEN,
    "night": ColorGrade.HIGH_CONTRAST,
    "midnight": ColorGrade.HIGH_CONTRAST,
    "noir": ColorGrade.HIGH_CONTRAST,
    "dark": ColorGrade.HIGH_CONTRAST,
    "blue hour": ColorGrade.COOL_BLUE,
    "twilight": ColorGrade.COOL_BLUE,
    "fog": ColorGrade.DESATURATED,
    "mist": ColorGrade.DESATURATED,
    "rain": ColorGrade.DESATURATED,
    "overcast": ColorGrade.DESATURATED,
    "grey": ColorGrade.DESATURATED,
}

# Tone signals that can nudge the grade when time-of-day is ambiguous
TONE_GRADE_HINTS = {
    "Melancholy": ColorGrade.COOL_BLUE,
    "Tense": ColorGrade.HIGH_CONTRAST,
    "Hopeful": ColorGrade.WARM_GOLDEN,
    "Joyful": ColorGrade.WARM_GOLDEN,
    "Transcendent": ColorGrade.HIGH_CONTRAST,
    "Uncertain": ColorGrade.DESATURATED,
}


def _derive_grade(tone: str, description: str) -> ColorGrade:
    """Derive a color grade from tone AND description content.

    Description analysis takes priority (time-of-day is a stronger signal).
    Tone provides a nudge when description is ambiguous.
    Defaults to NATURAL when no clear signal exists.
    """
    d = description.lower()

    # Time-of-day from description (strongest signal)
    for keyword, grade in TIME_GRADE_HINTS.items():
        if keyword in d:
            return grade

    # Tone as fallback (weaker signal)
    if tone in TONE_GRADE_HINTS:
        return TONE_GRADE_HINTS[tone]

    # No signal — don't force a grade
    return ColorGrade.NATURAL


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

    def select_grade(self, tone: str, description: str = "") -> ColorGrade:
        """Derive a color grade from tone + description content."""
        return _derive_grade(tone, description)

    def grade_image(self, image_data: bytes, tone: str, description: str = "") -> Optional[bytes]:
        """Apply color grading to an image. Returns graded PNG bytes or None if Pillow unavailable."""
        if not self.available:
            return None

        try:
            img = Image.open(io.BytesIO(image_data)).convert("RGB")
            grade = self.select_grade(tone, description)
            if grade == ColorGrade.NATURAL:
                return None  # Identity — skip processing
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

    def grade_base64(self, base64_str: str, tone: str, description: str = "") -> str:
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
            graded_bytes = self.grade_image(image_bytes, tone, description)
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
