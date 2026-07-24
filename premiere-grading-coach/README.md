# Grading coach

A UXP panel that lives inside Premiere Pro, next to Lumetri. It reads the
current frame and Lumetri's actual slider values, optionally folds in a
reference-image look, and asks Gemini for a numbered recipe of named
Lumetri adjustments plus an honest achievability verdict — grounded in real
numbers, not a repainted image.

This has **not been run against a real Premiere project yet.** Everything
below is built against Adobe's official UXP Premiere Pro API docs and
sample code, but it needs the actual test pass on the Windows/VM side to
confirm it behaves as expected. Treat the first run as debugging, not a
demo.

## Files

- `manifest.json` — plugin config: panel size, `localFileSystem` +
  `network` (Gemini domain) permissions.
- `index.html` / `index.js` — the panel UI and main wiring.
- `photometrics.js` — loads an exported PNG into a canvas, computes
  shadow/mid/highlight/clip/crush percentages from raw code values, plus an
  S-Log3 decode function (`sLog3ToLinear`) that's written but not wired into
  the main flow yet (see "open question" below).
- `lumetri.js` — finds whichever component's display name contains
  "lumetri" on the first clip on video track 1, reads all its params
  generically (no hardcoded matchName/indices, since those were never
  confirmed against a real project).
- `gemini.js` — stores the API key locally (`plugin-data:/gemini_key.json`,
  never in source), analyzes an optional reference image, and gets the
  actual recipe.

## Setup (on the Windows/VM side, where Premiere runs)

1. Install the [UXP Developer Tool](https://creativecloud.adobe.com/apps/download/uxp-developer-tools) (UDT) if you don't have it.
2. In Premiere: **Settings → Plugins → Enable developer mode**, then restart Premiere.
3. Get this `premiere-grading-coach` folder onto the Windows/VM side.
4. In UDT: **Add Plugin** → point it at this folder's `manifest.json`.
5. Click **Load & Watch**.
6. In Premiere: **Window → UXP Plugins → Grading Coach** if the panel doesn't appear.
7. Paste a Gemini API key into the panel's key field and click **Save key**
   — the same key from `Shnuk/backend/.env` or `directors-eye/backend/.env`
   works.

## Before you click "Check my grade"

Open a project with a sequence that has at least one clip on **video track
1**, with **Lumetri Color already applied** to that clip.

## What to test

1. **Check my grade** (no reference image) — does it export a frame, print
   a verdict + numbered steps? If it errors, the diagnostics section below
   tells you which specific step broke.
2. **Choose reference image**, then **Check my grade** again — does the
   thumbnail show up, and do the resulting steps actually reference the
   look of that image?
3. Expand **Diagnostics** and run all four buttons in order if anything
   above failed — they isolate export, Lumetri reads, and pixel math from
   each other and from the Gemini call.

## What to report back

- Any error text, verbatim — especially from `lumetri.js` (does "Lumetri
  Color" actually show up in the component list? What's its real
  `matchName`?) and from the Gemini call (auth errors, unexpected JSON).
- Whether `exportSequenceFrame()` feels instant or slow.
- Whether the recipe's `tool` names actually match Lumetri's real control
  names in your version of Premiere.

## Open question this doesn't resolve

The zone percentages are raw code values, not decoded S-Log3 — whether
that means "raw log" or "already display-referred Rec.709" depends on
whether your sequence has color management on and whether Lumetri already
has a correction applied. Worth checking your actual project's color
management setting; that decides whether `sLog3ToLinear` in
`photometrics.js` needs to be wired into `computeZones()` by default.
