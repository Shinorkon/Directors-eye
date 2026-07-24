// Gemini integration: local API key storage + two calls.
//   analyzeReference()  — vision call on a mood-board/reference still,
//                          ported from directors-eye/backend/services/
//                          image_analyzer.py's "reference" prompt.
//   getGradingRecipe()  — text-only call. Sees numbers (zone percentages,
//                          Lumetri slider values, reference look JSON), never
//                          the raw footage frame. Returns a strict JSON
//                          recipe: named Lumetri controls + reasoning, plus
//                          an achievability verdict.
//
// The API key is never hardcoded here — paste it into the panel once, and
// it's saved to this plugin's own sandboxed data folder (plugin-data:/),
// not anywhere in source control.

const fs = require("fs");

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_MODEL = "gemini-2.5-flash";
const KEY_FILE = "plugin-data:/gemini_key.json";

async function loadApiKey() {
  try {
    const text = await fs.readFile(KEY_FILE, "utf8");
    const parsed = JSON.parse(text);
    return parsed.apiKey || null;
  } catch (_e) {
    return null; // not saved yet, or unreadable — treat as "no key"
  }
}

async function saveApiKey(apiKey) {
  await fs.writeFile(KEY_FILE, JSON.stringify({ apiKey }), "utf-8");
}

function parseGeminiJson(rawText) {
  let text = (rawText || "").trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }
  try {
    return JSON.parse(text);
  } catch (_e) {
    // fall through
  }
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch (_e2) {
      // fall through
    }
  }
  return { raw_text: text };
}

async function callGemini(apiKey, parts) {
  const url = `${GEMINI_BASE_URL}/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts }] }),
  });
  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    throw new Error(`Gemini HTTP ${res.status}: ${bodyText.slice(0, 300)}`);
  }
  const data = await res.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error(`Unexpected Gemini response shape: ${JSON.stringify(data).slice(0, 300)}`);
  }
  return rawText;
}

// Ported from image_analyzer.py's REFERENCE_PROMPT — same schema, so a
// reference look extracted here is consistent with the rest of Director's
// Eye if this ever gets merged back into the main app.
const REFERENCE_PROMPT = `You are a colorist and cinematographer analyzing a reference image for mood boarding. Return ONLY valid JSON — no markdown, no code fences.

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

Be specific. A colorist should be able to match this look from your description alone.`;

async function analyzeReference(apiKey, base64Data, mimeType) {
  const rawText = await callGemini(apiKey, [
    { text: REFERENCE_PROMPT },
    { inline_data: { mime_type: mimeType || "image/jpeg", data: base64Data } },
  ]);
  return parseGeminiJson(rawText);
}

const RECIPE_PROMPT_HEADER = `You are a strict, technical colorist assistant embedded in a Premiere Pro panel. You NEVER describe, imagine, or repaint an image — you only see numbers, and you reason about them.

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
}`;

async function getGradingRecipe(apiKey, { zones, lumetriValues, referenceLook, logProfile }) {
  const payload = { zones, lumetriValues, referenceLook: referenceLook || null, logProfile: logProfile || "unknown" };
  const prompt = `${RECIPE_PROMPT_HEADER}\n\nInput data:\n${JSON.stringify(payload, null, 2)}`;
  const rawText = await callGemini(apiKey, [{ text: prompt }]);
  return parseGeminiJson(rawText);
}

module.exports = { loadApiKey, saveApiKey, analyzeReference, getGradingRecipe };
