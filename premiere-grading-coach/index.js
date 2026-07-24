// Grading coach — full panel logic.
//
// Three things happen here, on different cadences:
//
// 1. Live view — runs automatically on a timer the whole time the panel is
//    open. No click needed. Exports the current frame, reads real zone
//    percentages and Lumetri's actual slider values, and shows them. Purely
//    local — no backend/Gemini call — so it's cheap enough to run every few
//    seconds while you work.
// 2. "Preview my target look" — a deliberate click. Sends the current frame
//    plus your vision text and/or reference image to the backend, which
//    generates an image showing what that grade would look like on your
//    actual shot. Never touches Premiere — output is a picture only.
// 3. "Check my grade" — a deliberate click. Same real zones + Lumetri
//    values, sent to the backend for a numbered recipe of named Lumetri
//    adjustments (current value -> target) plus an achievability verdict.
//
// Every native/network call below is wrapped in a timeout. An earlier
// version had none, so a stuck call left a button disabled forever with no
// feedback — indistinguishable from the panel being broken.

const ppro = require("premierepro");
const uxp = require("uxp");
const { loadImageData, computeZones } = require("./photometrics.js");
const { findLumetriValues } = require("./lumetri.js");
const { analyzeReference, getGradingRecipe, generatePreview } = require("./gemini.js");

// Confirmed earlier in this project: the camera's log profile. Hardcoded
// rather than detected, since nothing here can currently tell log profiles
// apart from pixels alone.
const LOG_PROFILE = "Sony S-Log3";
const LIVE_INTERVAL_MS = 3000;

// Only these are shown in the live values readout — Lumetri also reports
// curves/wheels/HSL secondary as complex objects that aren't worth
// rendering as a one-line chip.
const LIVE_VALUE_NAMES = [
  "Exposure", "Contrast", "Highlights", "Shadows", "Whites", "Blacks",
  "Temperature", "Tint", "Saturation", "Vibrance",
];

let referenceBase64 = null;
let referenceMimeType = null;
let captureBusy = false;
let liveEnabled = true;
let liveTimer = null;

function mimeTypeFromFilename(name) {
  const ext = name.split(".").pop().toLowerCase();
  if (ext === "png") return "image/png";
  return "image/jpeg"; // covers jpg/jpeg
}

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function setStatus(text) {
  const el = document.getElementById("status");
  el.classList.add("visible");
  document.getElementById("statusText").textContent = text;
}

function clearStatus() {
  document.getElementById("status").classList.remove("visible");
}

function showError(text) {
  const el = document.getElementById("errorBox");
  el.style.display = "block";
  el.textContent = text;
}

function clearError() {
  document.getElementById("errorBox").style.display = "none";
}

async function getActiveSequence() {
  const proj = await ppro.Project.getActiveProject();
  if (!proj) throw new Error("No active project — open a project in Premiere first.");
  const seq = await proj.getActiveSequence();
  if (!seq) throw new Error("No active sequence — open a sequence in the timeline.");
  return { proj, seq };
}

// Exports the current frame and hands the resulting file entry to readFn.
// Retries the whole find-then-read step (not just the lookup) because the
// directory entry can appear before Premiere releases its write lock on
// the file — reading it right after getEntry() succeeds can still throw
// "resource busy or locked".
async function exportAndRead(seq, filename, readFn) {
  const folder = await uxp.storage.localFileSystem.getDataFolder();
  const playerPos = await withTimeout(seq.getPlayerPosition(), 10000, "Reading playhead position");
  const ok = await withTimeout(
    ppro.Exporter.exportSequenceFrame(seq, playerPos, filename, folder.nativePath, 1920, 1080),
    20000,
    "Exporting current frame"
  );
  if (!ok) {
    throw new Error(`Frame export failed (exportSequenceFrame returned false, folder: ${folder.nativePath})`);
  }

  const candidates = [filename, filename + ".png"];
  let result = null;
  let lastErr = null;
  for (let attempt = 0; attempt < 6 && !result; attempt++) {
    if (attempt > 0) await sleep(300 * attempt);
    for (const name of candidates) {
      try {
        const fileEntry = await folder.getEntry(name);
        result = await readFn(fileEntry);
        break;
      } catch (e) {
        lastErr = e;
      }
    }
  }
  if (!result) {
    throw new Error(`Export reported success but couldn't read "${candidates.join('" or "')}" in ${folder.nativePath} after retries: ${lastErr}`);
  }
  return result;
}

async function readAsBase64(fileEntry) {
  const buffer = await fileEntry.read({ format: uxp.storage.formats.binary });
  return arrayBufferToBase64(buffer);
}

// Shared by the live loop and "Check my grade" — export, compute zones,
// read Lumetri. No Gemini call in here, so it's cheap to run on a timer.
async function captureFrameState(proj, seq) {
  const imageData = await exportAndRead(seq, "gradingcoach_live.png", loadImageData);
  const zones = computeZones(imageData);

  let lumetriResult = null;
  try {
    lumetriResult = await withTimeout(findLumetriValues(proj, seq), 15000, "Reading Lumetri values");
  } catch (err) {
    lumetriResult = { found: false, error: String(err) };
  }
  return { zones, lumetriResult };
}

// ---------- Reference image ----------

document.getElementById("btnPickReference").addEventListener("click", async () => {
  try {
    const file = await uxp.storage.localFileSystem.getFileForOpening({
      types: ["jpg", "jpeg", "png"],
    });
    if (!file) return;

    const buffer = await file.read({ format: uxp.storage.formats.binary });
    referenceBase64 = arrayBufferToBase64(buffer);
    referenceMimeType = mimeTypeFromFilename(file.name);

    const blob = new Blob([buffer], { type: referenceMimeType });
    const url = URL.createObjectURL(blob);
    const thumb = document.getElementById("refThumb");
    thumb.src = url;
    thumb.style.display = "block";

    document.getElementById("refStatus").textContent = file.name;
  } catch (err) {
    document.getElementById("refStatus").textContent = `Error: ${err}`;
  }
});

// ---------- Rendering ----------

function renderVerdict(verdictText) {
  const el = document.getElementById("verdict");
  el.style.display = "block";
  el.textContent = verdictText || "";
  const lower = (verdictText || "").toLowerCase();
  el.className = "";
  if (lower.startsWith("not")) el.classList.add("blocked");
  else if (lower.startsWith("partial")) el.classList.add("partial");
  else el.classList.add("achievable");
}

function renderZoneBar(zones) {
  const panel = document.getElementById("zonePanel");
  panel.style.display = "block";
  document.getElementById("segShadow").style.width = `${zones.shadowPct}%`;
  document.getElementById("segMid").style.width = `${zones.midPct}%`;
  document.getElementById("segHighlight").style.width = `${zones.highlightPct}%`;
  document.getElementById("legendShadow").textContent = `Shadows ${zones.shadowPct}%`;
  document.getElementById("legendMid").textContent = `Mids ${zones.midPct}%`;
  document.getElementById("legendHighlight").textContent = `Highlights ${zones.highlightPct}%`;

  const warnings = [];
  if (zones.clippedPct >= 1) warnings.push(`Clipping highlights: ${zones.clippedPct}% of frame at max value.`);
  if (zones.crushedPct >= 1) warnings.push(`Crushed shadows: ${zones.crushedPct}% of frame at black.`);
  document.getElementById("zoneWarnings").textContent = warnings.join(" ");
}

// Formats a raw ComponentParam value for display.
function formatLumetriValue(value) {
  if (typeof value === "number") return Math.round(value * 100) / 100;
  if (value == null) return null;
  if (typeof value === "object") {
    if ("value" in value) return formatLumetriValue(value.value);
    return null; // complex types (color wheels, curves) — not worth rendering inline
  }
  return String(value);
}

function renderLiveValues(lumetriResult) {
  const el = document.getElementById("liveValues");
  const note = document.getElementById("liveNote");

  if (!lumetriResult || !lumetriResult.found) {
    el.innerHTML = "";
    note.textContent = lumetriResult && lumetriResult.error
      ? `Lumetri Color not readable: ${lumetriResult.error}`
      : "Lumetri Color not found on this clip.";
    note.style.display = "block";
    return;
  }
  note.style.display = "none";

  el.innerHTML = "";
  LIVE_VALUE_NAMES.forEach((name) => {
    if (!(name in lumetriResult.values)) return;
    const formatted = formatLumetriValue(lumetriResult.values[name]);
    if (formatted === null) return;
    const chip = document.createElement("span");
    chip.className = "value-chip";
    chip.textContent = `${name} ${formatted}`;
    el.appendChild(chip);
  });
}

// The recipe names a control like "Shadows" or "Temperature" — look it up
// in the values Premiere actually reported for this clip, so a step reads
// as "Shadows: currently 12 -> increase by ~10", not just the instruction
// in isolation. Exact match first, then substring, since the backend was
// only asked for "the exact Lumetri control name" and generally complies
// but isn't guaranteed to match displayName casing/spacing exactly.
function lookupCurrentValue(lumetriValues, toolName) {
  if (!lumetriValues || !toolName) return null;
  if (toolName in lumetriValues) return formatLumetriValue(lumetriValues[toolName]);
  const lower = toolName.toLowerCase();
  const key = Object.keys(lumetriValues).find((k) => k.toLowerCase() === lower)
    || Object.keys(lumetriValues).find((k) => k.toLowerCase().includes(lower) || lower.includes(k.toLowerCase()));
  return key ? formatLumetriValue(lumetriValues[key]) : null;
}

function renderSteps(operations, lumetriValues) {
  const list = document.getElementById("steps");
  list.innerHTML = "";
  (operations || []).forEach((op, i) => {
    const li = document.createElement("li");

    const head = document.createElement("div");
    head.className = "step-head";
    const tool = document.createElement("span");
    tool.className = "step-tool";
    tool.textContent = `${i + 1}. ${op.tool}`;
    head.appendChild(tool);

    const current = lookupCurrentValue(lumetriValues, op.tool);
    if (current !== null) {
      const cur = document.createElement("span");
      cur.className = "step-current";
      cur.textContent = `currently ${current}`;
      head.appendChild(cur);
    }
    li.appendChild(head);

    const direction = document.createElement("div");
    direction.className = "step-direction";
    direction.textContent = op.direction_or_value || "";
    li.appendChild(direction);

    const reason = document.createElement("div");
    reason.className = "step-reason";
    reason.textContent = op.reasoning || "";
    li.appendChild(reason);

    list.appendChild(li);
  });
}

// ---------- Live view (automatic) ----------

async function liveTick() {
  if (!liveEnabled || captureBusy) return;
  captureBusy = true;
  try {
    const proj = await ppro.Project.getActiveProject();
    if (!proj) return;
    const seq = await proj.getActiveSequence();
    if (!seq) return;

    const { zones, lumetriResult } = await captureFrameState(proj, seq);
    renderZoneBar(zones);
    renderLiveValues(lumetriResult);
  } catch (err) {
    // Silent — live view shouldn't spam the error box every 3s. If it's a
    // persistent problem, "Check my grade" will surface it explicitly.
  } finally {
    captureBusy = false;
  }
}

document.getElementById("liveToggle").addEventListener("change", (e) => {
  liveEnabled = e.target.checked;
});

liveTimer = setInterval(liveTick, LIVE_INTERVAL_MS);
liveTick();

// Waits for any in-flight capture (from the live loop) to finish, then
// claims the mutex for an explicit, deliberate capture.
async function claimCapture() {
  while (captureBusy) await sleep(100);
  captureBusy = true;
}

// ---------- Preview my target look ----------

document.getElementById("btnPreview").addEventListener("click", async () => {
  const button = document.getElementById("btnPreview");
  const visionText = document.getElementById("visionText").value.trim();

  if (!visionText && !referenceBase64) {
    showError("Describe the look you want and/or pick a reference image first.");
    return;
  }

  button.disabled = true;
  clearError();
  try {
    setStatus("Exporting current frame…");
    await claimCapture();
    let frameBase64;
    try {
      const { proj, seq } = await withTimeout(getActiveSequence(), 10000, "Reading sequence");
      frameBase64 = await exportAndRead(seq, "gradingcoach_preview_src.png", readAsBase64);
    } finally {
      captureBusy = false;
    }

    setStatus("Generating target-look preview…");
    const result = await withTimeout(
      generatePreview({
        frameBase64,
        frameMimeType: "image/png",
        visionText,
        referenceBase64,
        referenceMimeType,
      }),
      45000,
      "Generating preview"
    );

    const currentImg = document.getElementById("previewCurrent");
    const targetImg = document.getElementById("previewTarget");
    currentImg.src = `data:image/png;base64,${frameBase64}`;
    targetImg.src = `data:${result.mime_type || "image/png"};base64,${result.image_base64}`;
    document.getElementById("previewPanel").style.display = "block";
  } catch (err) {
    showError(String(err));
  } finally {
    clearStatus();
    button.disabled = false;
  }
});

// ---------- Check my grade ----------

document.getElementById("btnCheckGrade").addEventListener("click", async () => {
  const button = document.getElementById("btnCheckGrade");
  button.disabled = true;
  document.getElementById("verdict").style.display = "none";
  document.getElementById("steps").innerHTML = "";
  clearError();

  try {
    setStatus("Reading sequence…");
    const { proj, seq } = await withTimeout(getActiveSequence(), 10000, "Reading sequence");

    setStatus("Exporting current frame…");
    await claimCapture();
    let zones, lumetriResult;
    try {
      ({ zones, lumetriResult } = await captureFrameState(proj, seq));
    } finally {
      captureBusy = false;
    }
    renderZoneBar(zones);
    renderLiveValues(lumetriResult);

    const visionText = document.getElementById("visionText").value.trim();

    // Optional reference look — non-fatal if it fails.
    let referenceLook = null;
    if (referenceBase64) {
      setStatus("Analyzing reference image…");
      try {
        referenceLook = await withTimeout(
          analyzeReference(referenceBase64, referenceMimeType),
          20000,
          "Analyzing reference image"
        );
      } catch (err) {
        showError(`Note: reference image analysis failed (${err}). Continuing without it.`);
      }
    }

    setStatus("Asking the coach for a recipe…");
    const recipe = await withTimeout(
      getGradingRecipe({
        zones,
        lumetriValues: lumetriResult && lumetriResult.found ? lumetriResult.values : null,
        visionText,
        referenceLook,
        logProfile: LOG_PROFILE,
      }),
      25000,
      "Asking the coach for a recipe"
    );

    if (recipe.raw_text) {
      throw new Error(`The coach backend didn't return valid JSON: ${recipe.raw_text.slice(0, 300)}`);
    }

    renderVerdict(recipe.verdict);
    renderSteps(recipe.operations, lumetriResult && lumetriResult.found ? lumetriResult.values : null);
  } catch (err) {
    showError(String(err));
  } finally {
    clearStatus();
    button.disabled = false;
  }
});
