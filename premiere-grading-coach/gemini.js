// Backend integration — two calls, both proxied through Director's Eye's
// own hosted API (directors-eye.shinorkon.com) instead of calling Gemini
// directly from the panel. The backend already has GEMINI_API_KEY
// configured server-side, so the panel doesn't need its own key or any
// local backend setup on the Windows machine.
//
//   analyzeReference()  — vision call on a mood-board/reference still.
//                          Backend: POST /api/grading-coach/analyze-reference
//   getGradingRecipe()  — text-only call. Sees numbers (zone percentages,
//                          Lumetri slider values, reference look JSON), never
//                          the raw footage frame. Returns a strict JSON
//                          recipe: named Lumetri controls + reasoning, plus
//                          an achievability verdict.
//                          Backend: POST /api/grading-coach/recipe

const API_BASE = "https://directors-eye.shinorkon.com/api/grading-coach";

async function postJson(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    throw new Error(`Backend HTTP ${res.status}: ${bodyText.slice(0, 300)}`);
  }
  return res.json();
}

async function analyzeReference(base64Data, mimeType) {
  return postJson("/analyze-reference", {
    image_base64: base64Data,
    mime_type: mimeType || "image/jpeg",
  });
}

async function getGradingRecipe({ zones, lumetriValues, referenceLook, logProfile }) {
  return postJson("/recipe", {
    zones,
    lumetriValues: lumetriValues || null,
    referenceLook: referenceLook || null,
    logProfile: logProfile || "unknown",
  });
}

module.exports = { analyzeReference, getGradingRecipe };
