// Grading coach — full panel logic.
//
// Main flow (btnCheckGrade): export current frame -> read real photometric
// zones from it -> read Lumetri's actual current values from Premiere ->
// optionally fold in a reference look -> ask the backend for a numbered
// recipe of named Lumetri adjustments + an honest achievability verdict.
//
// Every step below is wrapped in a timeout. Earlier versions had no timeout
// anywhere, so a stuck native call or a dead network request left the
// button disabled forever with zero feedback — indistinguishable from the
// panel just not working. Now every stage reports live status, and any
// failure (including a timeout) surfaces as a real error instead of a hang.

const ppro = require("premierepro");
const uxp = require("uxp");
const { loadImageData, computeZones } = require("./photometrics.js");
const { findLumetriValues } = require("./lumetri.js");
const { analyzeReference, getGradingRecipe } = require("./gemini.js");

// Confirmed earlier in this project: the camera's log profile. Hardcoded
// rather than detected, since nothing here can currently tell log profiles
// apart from pixels alone.
const LOG_PROFILE = "Sony S-Log3";

let referenceBase64 = null;
let referenceMimeType = null;

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

// ---------- Main flow ----------

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

// Formats a raw ComponentParam value for display next to a recipe step.
function formatLumetriValue(value) {
  if (typeof value === "number") return Math.round(value * 100) / 100;
  if (value == null) return null;
  if (typeof value === "object") {
    if ("value" in value) return formatLumetriValue(value.value);
    return null; // complex types (color wheels, curves) — not worth rendering inline
  }
  return String(value);
}

// The recipe names a control like "Shadows" or "Temperature" — look it up
// in the values Premiere actually reported for this clip, so a step reads
// as "Shadows: currently 12 -> increase by ~10", not just the instruction
// in isolation. Exact match first, then substring, since Gemini was only
// asked for "the exact Lumetri control name" and generally complies but
// isn't guaranteed to match displayName casing/spacing exactly.
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

document.getElementById("btnCheckGrade").addEventListener("click", async () => {
  const button = document.getElementById("btnCheckGrade");
  button.disabled = true;
  document.getElementById("verdict").style.display = "none";
  document.getElementById("zonePanel").style.display = "none";
  document.getElementById("steps").innerHTML = "";
  clearError();

  try {
    setStatus("Reading sequence…");
    const { proj, seq } = await withTimeout(getActiveSequence(), 10000, "Reading sequence");

    // 1. Export the current frame to the plugin's own persistent data
    // folder (not getTemporaryFolder() — that returned no discoverable
    // entry under either filename variant when tried).
    setStatus("Exporting current frame…");
    const folder = await uxp.storage.localFileSystem.getDataFolder();
    const filename = "gradingcoach_check.png";
    const playerPos = await withTimeout(seq.getPlayerPosition(), 10000, "Reading playhead position");
    const ok = await withTimeout(
      ppro.Exporter.exportSequenceFrame(seq, playerPos, filename, folder.nativePath, 1920, 1080),
      20000,
      "Exporting current frame"
    );
    if (!ok) {
      throw new Error(`Frame export failed (exportSequenceFrame returned false, folder: ${folder.nativePath})`);
    }

    // Entry visibility (and the underlying write lock) can lag the native
    // export by a beat, and the exporter sometimes double-appends .png —
    // retry the whole find-then-read step, since the directory entry can
    // appear before Premiere releases its write handle on the file.
    setStatus("Reading exported frame…");
    const candidates = [filename, filename + ".png"];
    let imageData = null;
    let lastErr = null;
    for (let attempt = 0; attempt < 6 && !imageData; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 300 * attempt));
      for (const name of candidates) {
        try {
          const fileEntry = await folder.getEntry(name);
          imageData = await loadImageData(fileEntry);
          break;
        } catch (e) {
          lastErr = e;
        }
      }
    }
    if (!imageData) {
      throw new Error(`Export reported success but couldn't read "${candidates.join('" or "')}" in ${folder.nativePath} after retries: ${lastErr}`);
    }
    const zones = computeZones(imageData);
    renderZoneBar(zones);

    // 2. Read Lumetri's actual current values. Non-fatal if it fails —
    // the coach can still run on zones + reference alone, just without
    // current-value readouts per step.
    setStatus("Reading Lumetri values…");
    let lumetriResult = null;
    try {
      lumetriResult = await withTimeout(findLumetriValues(proj, seq), 15000, "Reading Lumetri values");
    } catch (err) {
      showError(`Note: couldn't read Lumetri values (${err}). Continuing without current-value readouts.`);
    }

    // 3. Optional reference look. Also non-fatal.
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

    // 4. Ask the backend for the recipe.
    setStatus("Asking the coach for a recipe…");
    const recipe = await withTimeout(
      getGradingRecipe({
        zones,
        lumetriValues: lumetriResult && lumetriResult.found ? lumetriResult.values : null,
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
