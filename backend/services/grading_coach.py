"""Premiere Grading Coach — server-side Gemini calls for the UXP panel.

Moves the two Gemini calls that used to live client-side in
premiere-grading-coach/gemini.js onto the backend, so the panel doesn't
need its own API key or local backend setup — it just calls this app's
already-deployed API.

  analyze_reference_look() — vision call on a mood-board/reference still.
                              Same REFERENCE_PROMPT as image_analyzer.py's
                              "reference" type, but returns the raw parsed
                              JSON as-is (image_analyzer's ImageAnalysis
                              dataclass doesn't have fields for most of
                              this schema, so we don't route through it).
  get_grading_recipe()     — text-only call. Sees numbers (zone percentages,
                              Lumetri slider values, reference look JSON),
                              never the raw footage frame. Returns a strict
                              JSON recipe: named Lumetri controls + reasoning,
                              plus an achievability verdict.

Never auto-applies a grade — this only produces instructions for the user
to act on themselves in Premiere.
"""

from __future__ import annotations

import json
import re
from typing import Optional

import httpx

from config import GEMINI_API_KEY, GEMINI_BASE_URL
from services.image_analyzer import resize_for_api

GEMINI_MODEL = "gemini-2.5-flash"
TIMEOUT = 30.0

REFERENCE_PROMPT = """You are a colorist and cinematographer analyzing a reference image for mood boarding. Return ONLY valid JSON — no markdown, no code fences.

Return this exact JSON structure:
{
  "color_palette": ["#HEX1", "#HEX2", "#HEX3", "#HEX4", "#HEX5", "#HEX6"],
  "lighting_ratio": "high_contrast, low_contrast, or balanced",
  "lighting_direction": "front, side, back, top, or ambient",
  "color_temperature_tendency": "warm, cool, neutral, or mixed",
  "composition_style": "e.g. center_framed, rule_of_thirds, dutch_angle, symmetrical, leading_lines, negative_space",
  "depth_of_field": "shallow, medium, or deep",
  "dominant_mood": "The single strongest emotional impression",
  "film_stock_reference": "What film stock or grade this resembles — e.g. Kodak Portra 400, Fuji Eterna, bleach bypass, teal-orange"
}

Be specific. A colorist should be able to match this look from your description alone."""

RECIPE_PROMPT_HEADER = """You are a strict, technical colorist assistant embedded in a Premiere Pro panel. You NEVER describe, imagine, or repaint an image — you only see numbers, and you reason about them.

You will receive:
- zones: raw code-value histogram stats from the current frame (shadow/mid/highlight percentages, clipping, crush) — NOT decoded scene-linear light unless noted.
- lumetriValues: the exact current values of Lumetri Color's parameters on this clip, as read directly from Premiere. This is ground truth, not a guess.
- referenceLook (optional): a qualitative look description extracted from a mood-board reference image, if the user provided one.
- logProfile: the camera's log profile, if known.

Your job: propose a short, ordered list of concrete Lumetri Color adjustments to move from the current state toward the reference look (or toward a more balanced/correct image if no reference was given). Every step must name a real Lumetri control (Exposure, Contrast, Highlights, Shadows, Whites, Blacks, Temperature, Tint, Saturation, or a named curve/wheel) and a direction or value, grounded in the actual numbers you were given — never a vague mood description.

Also give an honest achievability verdict: if the zones show clipping, crushed shadows, or values already near a limit, say so plainly and explain what will break if pushed further.

Return ONLY valid JSON, no markdown, no code fences, in exactly this shape:
{
  "analysis": "one paragraph, diagnostic, grounded in the actual numbers given",
  "verdict": "achievable | partially achievable | not achievable, plus a one-sentence reason grounded in the actual numbers",
  "operations": [
    {
      "tool": "the exact Lumetri control name, e.g. Shadows, Temperature, Saturation",
      "direction_or_value": "e.g. 'increase by ~10' or 'push warm (+5 to +8)'",
      "reasoning": "why this control and not another, grounded in the specific numbers given"
    }
  ]
}"""


def _parse_gemini_json(raw_text: str) -> dict:
    text = (raw_text or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass
    return {"raw_text": text}


async def _call_gemini(parts: list[dict]) -> str:
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not configured on the server.")

    url = f"{GEMINI_BASE_URL}/models/{GEMINI_MODEL}:generateContent"
    payload = {"contents": [{"parts": parts}]}

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.post(f"{url}?key={GEMINI_API_KEY}", json=payload)
        resp.raise_for_status()
        data = resp.json()

    try:
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError, TypeError):
        raise RuntimeError(f"Unexpected Gemini response shape: {json.dumps(data)[:500]}")


async def analyze_reference_look(image_bytes: bytes, mime_type: str = "image/jpeg") -> dict:
    """Vision call on a reference/mood-board still. Returns the raw parsed
    JSON matching REFERENCE_PROMPT's schema."""
    resized = resize_for_api(image_bytes)
    import base64
    image_b64 = base64.b64encode(resized).decode("utf-8")

    raw_text = await _call_gemini([
        {"text": REFERENCE_PROMPT},
        {"inline_data": {"mime_type": "image/jpeg", "data": image_b64}},
    ])
    return _parse_gemini_json(raw_text)


async def get_grading_recipe(
    zones: dict,
    lumetri_values: Optional[dict],
    reference_look: Optional[dict],
    log_profile: str,
) -> dict:
    """Text-only call: numbers in, a named-control recipe + verdict out."""
    payload = {
        "zones": zones,
        "lumetriValues": lumetri_values,
        "referenceLook": reference_look,
        "logProfile": log_profile or "unknown",
    }
    prompt = f"{RECIPE_PROMPT_HEADER}\n\nInput data:\n{json.dumps(payload, indent=2)}"
    raw_text = await _call_gemini([{"text": prompt}])
    return _parse_gemini_json(raw_text)
