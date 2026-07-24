// Code-value histogram + zone analysis on a still frame.
//
// Deliberately works on raw 0-255 code values, NOT decoded scene-linear
// light. Reason: we don't yet know whether the exported still is still
// raw S-Log3 (if the sequence has no color management / no input LUT
// applied to the clip) or already converted to display-referred Rec.709
// (if Premiere's color management is on, or Lumetri has a correction
// applied). Bucketing by raw code value is exactly what a hardware
// waveform monitor shows either way, so it's never wrong — it just means
// different things depending on that answer. The S-Log3-aware decode
// (sLog3ToLinear below) is a separate, opt-in step: only apply it once
// you've confirmed the clip is unconverted log, otherwise you'd be
// double-decoding footage that's already been tone-mapped.

/**
 * Sony's published S-Log3 -> linear scene light transfer function.
 * Input: normalized code value, 0.0-1.0 (i.e. pixel / 255 for 8-bit).
 * Output: linear light, roughly 0.0-1.0+ where 0.18 = 18% grey card.
 * Source: Sony "Technical Summary for S-Log3" whitepaper.
 */
function sLog3ToLinear(x) {
  const code10 = x * 1023;
  if (code10 >= 171.2102946929) {
    return Math.pow(10, (code10 - 420) / 261.5) * (0.18 + 0.01) - 0.01;
  }
  return ((code10 - 95) * 0.01125) / (171.2102946929 - 95);
}

/**
 * Loads a local file (via UXP storage Entry) into an ImageData object by
 * routing it through a Blob URL — the sandboxed panel can't reliably load
 * file:// paths directly, but Blob URLs from file bytes read via the
 * storage API are safe and documented.
 */
async function loadImageData(fileEntry) {
  const uxp = require("uxp");
  const arrayBuffer = await fileEntry.read({ format: uxp.storage.formats.binary });
  const blob = new Blob([arrayBuffer], { type: "image/png" });
  const url = URL.createObjectURL(blob);

  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = url;
  });

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  URL.revokeObjectURL(url);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * Buckets pixels into shadow/mid/highlight by raw luma code value, plus
 * clipping and crush detection. Thresholds are 0-255 code value, not IRE —
 * roughly: shadow <= 10%, highlight >= 80%, clip >= 99%, crush <= 1%.
 */
function computeZones(imageData) {
  const { data, width, height } = imageData;
  const totalPixels = width * height;

  let shadowCount = 0;
  let midCount = 0;
  let highlightCount = 0;
  let clippedCount = 0;
  let crushedCount = 0;
  let lumaSum = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b; // 0-255

    lumaSum += luma;
    if (luma <= 2) crushedCount++;
    if (luma >= 253) clippedCount++;

    if (luma <= 25) shadowCount++;
    else if (luma >= 204) highlightCount++;
    else midCount++;
  }

  return {
    width,
    height,
    meanLuma: +(lumaSum / totalPixels).toFixed(1),
    shadowPct: +((shadowCount / totalPixels) * 100).toFixed(1),
    midPct: +((midCount / totalPixels) * 100).toFixed(1),
    highlightPct: +((highlightCount / totalPixels) * 100).toFixed(1),
    clippedPct: +((clippedCount / totalPixels) * 100).toFixed(2),
    crushedPct: +((crushedCount / totalPixels) * 100).toFixed(2),
  };
}

module.exports = { sLog3ToLinear, loadImageData, computeZones };
