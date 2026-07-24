// Grading coach — full panel logic.
//
// Main flow (btnCheckGrade): export current frame -> read real photometric
// zones from it -> read Lumetri's actual current values from Premiere ->
// optionally fold in a reference look -> ask Gemini for a numbered recipe
// of named Lumetri adjustments + an honest achievability verdict.
//
// Diagnostics section is the original Phase 0 spike, kept as a fallback so
// if the main flow breaks, you can see exactly which piece failed.

const ppro = require("premierepro");
const uxp = require("uxp");
const { loadImageData, computeZones } = require("./photometrics.js");
const { findLumetriValues } = require("./lumetri.js");
const { analyzeReference, getGradingRecipe } = require("./gemini.js");

// Confirmed earlier in this project: the camera's log profile. Hardcoded
// rather than detected, since nothing here can currently tell log profiles
// apart from pixels alone.
const LOG_PROFILE = "Sony S-Log3";

let lastExportFolder = null;
let lastExportFilename = null;
let referenceBase64 = null;
let referenceMimeType = null;

function mimeTypeFromFilename(name) {
  const ext = name.split(".").pop().toLowerCase();
  if (ext === "png") return "image/png";
  return "image/jpeg"; // covers jpg/jpeg
}

function log(msg) {
  const el = document.getElementById("log");
  el.textContent += msg + "\n";
  el.scrollTop = el.scrollHeight;
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

async function getActiveSequence() {
  const proj = await ppro.Project.getActiveProject();
  if (!proj) {
    log("No active project — open a project in Premiere first.");
    return null;
  }
  const seq = await proj.getActiveSequence();
  if (!seq) {
    log("No active sequence — open a sequence in the timeline.");
    return null;
  }
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

function renderSteps(operations) {
  const list = document.getElementById("steps");
  list.innerHTML = "";
  (operations || []).forEach((op) => {
    const li = document.createElement("li");
    const tool = document.createElement("span");
    tool.className = "step-tool";
    tool.textContent = `${op.tool}: ${op.direction_or_value}`;
    const reason = document.createElement("div");
    reason.className = "step-reason";
    reason.textContent = op.reasoning || "";
    li.appendChild(tool);
    li.appendChild(reason);
    list.appendChild(li);
  });
}

document.getElementById("btnCheckGrade").addEventListener("click", async () => {
  const button = document.getElementById("btnCheckGrade");
  button.disabled = true;
  document.getElementById("verdict").style.display = "none";
  document.getElementById("steps").innerHTML = "";

  try {
    const ctx = await getActiveSequence();
    if (!ctx) {
      renderVerdict("No active sequence found in Premiere.");
      return;
    }
    const { proj, seq } = ctx;

    // 1. Export the current frame to the plugin's own temp folder — no
    // picker prompt needed for the main flow.
    let zones;
    try {
      const folder = await uxp.storage.localFileSystem.getTemporaryFolder();
      const filename = "gradingcoach_check.png";
      const playerPos = await seq.getPlayerPosition();
      await ppro.Exporter.exportSequenceFrame(seq, playerPos, filename, folder.nativePath, 1920, 1080);

      let fileEntry;
      try {
        fileEntry = await folder.getEntry(filename);
      } catch (_e) {
        fileEntry = await folder.getEntry(filename + ".png");
      }
      const imageData = await loadImageData(fileEntry);
      zones = computeZones(imageData);
    } catch (err) {
      renderVerdict(`Couldn't export/analyze the current frame: ${err}`);
      return;
    }

    // 2. Read Lumetri's actual current values.
    let lumetriResult = null;
    try {
      lumetriResult = await findLumetriValues(proj, seq);
    } catch (err) {
      log(`Lumetri read failed: ${err}`);
    }

    // 3. Optional reference look.
    let referenceLook = null;
    if (referenceBase64) {
      try {
        referenceLook = await analyzeReference(referenceBase64, referenceMimeType);
      } catch (err) {
        log(`Reference analysis failed: ${err}`);
      }
    }

    // 4. Ask the backend for the recipe.
    const recipe = await getGradingRecipe({
      zones,
      lumetriValues: lumetriResult && lumetriResult.found ? lumetriResult.values : null,
      referenceLook,
      logProfile: LOG_PROFILE,
    });

    if (recipe.raw_text) {
      renderVerdict("Gemini didn't return valid JSON — see diagnostics log.");
      log(`Raw Gemini response: ${recipe.raw_text}`);
      return;
    }

    renderVerdict(recipe.verdict);
    renderSteps(recipe.operations);
    if (recipe.analysis) log(`Analysis: ${recipe.analysis}`);
  } catch (err) {
    renderVerdict(`Error: ${err}`);
  } finally {
    button.disabled = false;
  }
});

// ---------- Diagnostics (Phase 0 spike, unchanged) ----------

document.getElementById("btnInfo").addEventListener("click", async () => {
  log("--- Sequence info ---");
  const ctx = await getActiveSequence();
  if (!ctx) return;
  const { seq } = ctx;
  log(`Sequence name: ${seq.name}`);
  const pos = await seq.getPlayerPosition();
  log(`Player position: ${pos.seconds}s (ticks: ${pos.ticks})`);
});

document.getElementById("btnExport").addEventListener("click", async () => {
  log("--- Export current frame ---");
  const ctx = await getActiveSequence();
  if (!ctx) return;
  const { seq } = ctx;

  try {
    const folder = await uxp.storage.localFileSystem.getFolder();
    if (!folder) {
      log("No folder selected.");
      return;
    }
    const folderDir = folder.nativePath;
    const playerPos = await seq.getPlayerPosition();
    const filename = "gradingcoach_still.png";

    const t0 = Date.now();
    const ok = await ppro.Exporter.exportSequenceFrame(
      seq,
      playerPos,
      filename,
      folderDir,
      1920,
      1080
    );
    const elapsedMs = Date.now() - t0;

    log(`exportSequenceFrame() returned: ${ok}`);
    log(`Took ${elapsedMs}ms — note this, it matters for a "check my grade" button.`);
    log(`Look in: ${folderDir} (Premiere sometimes double-appends .png to the filename).`);

    lastExportFolder = folder;
    lastExportFilename = filename;
  } catch (err) {
    log(`Error: ${err}`);
  }
});

document.getElementById("btnLumetri").addEventListener("click", async () => {
  log("--- Clip components + params (video track 1, first clip) ---");
  const ctx = await getActiveSequence();
  if (!ctx) return;
  const { proj, seq } = ctx;

  try {
    const result = await findLumetriValues(proj, seq);
    if (!result) {
      log("No video track 1 / no clips found.");
      return;
    }
    log(`Clip "${result.clipName}" — components found:`);
    result.allComponents.forEach((c) => {
      log(`[${c.index}] ${c.displayName}  (matchName: ${c.matchName})`);
    });

    if (!result.found) {
      log("");
      log('No component with "lumetri" in its display name was found.');
      return;
    }

    log("");
    log(`Lumetri Color matchName: ${result.matchName}`);
    Object.entries(result.values).forEach(([name, value]) => {
      log(`    - ${name}: ${JSON.stringify(value)}`);
    });
    Object.entries(result.errors).forEach(([name, err]) => {
      log(`    - ${name}: <getValueAtTime failed: ${err}>`);
    });
  } catch (err) {
    log(`Error: ${err}`);
  }
});

document.getElementById("btnAnalyze").addEventListener("click", async () => {
  log("--- Analyze exported frame ---");
  try {
    let fileEntry;

    if (lastExportFolder && lastExportFilename) {
      try {
        fileEntry = await lastExportFolder.getEntry(lastExportFilename);
      } catch (_e) {
        try {
          fileEntry = await lastExportFolder.getEntry(lastExportFilename + ".png");
        } catch (_e2) {
          fileEntry = null;
        }
      }
    }

    if (!fileEntry) {
      log("Couldn't find the last export automatically — pick the PNG manually.");
      fileEntry = await uxp.storage.localFileSystem.getFileForOpening({
        types: ["png"],
      });
    }

    if (!fileEntry) {
      log("No file selected.");
      return;
    }

    const imageData = await loadImageData(fileEntry);
    const zones = computeZones(imageData);

    log(`Frame size: ${zones.width}x${zones.height}`);
    log(`Mean luma (0-255): ${zones.meanLuma}`);
    log(`Shadows: ${zones.shadowPct}%   Mids: ${zones.midPct}%   Highlights: ${zones.highlightPct}%`);
    log(`Clipped (>=253): ${zones.clippedPct}%   Crushed (<=2): ${zones.crushedPct}%`);
  } catch (err) {
    log(`Error: ${err}`);
  }
});
