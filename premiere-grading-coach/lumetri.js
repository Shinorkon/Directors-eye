// Finds the Lumetri Color component on a clip and reads its current
// parameter values directly from Premiere via the UXP API — ground truth,
// not inferred from pixels.
//
// We don't hardcode Lumetri's matchName or param indices because they were
// never confirmed against a real project before this was written (see the
// Phase 0 spike's button 3). Instead this searches every component on the
// clip for one whose display name contains "lumetri", and reads whatever
// params it has generically. If Lumetri isn't found, or getValueAtTime()
// fails, the caller gets that back explicitly instead of a silent wrong
// answer.

const ppro = require("premierepro");

async function readClipComponents(proj, chain) {
  let componentCount = 0;
  proj.lockedAccess(() => {
    componentCount = chain.getComponentCount();
  });

  const components = [];
  for (let i = 0; i < componentCount; i++) {
    let component;
    proj.lockedAccess(() => {
      component = chain.getComponentAtIndex(i);
    });
    const displayName = await component.getDisplayName();
    const matchName = await component.getMatchName();
    components.push({ index: i, component, displayName, matchName });
  }
  return components;
}

async function readComponentParams(proj, component, atTime) {
  let paramCount = 0;
  proj.lockedAccess(() => {
    paramCount = component.getParamCount();
  });

  const values = {};
  const errors = {};
  for (let p = 0; p < paramCount; p++) {
    let param;
    proj.lockedAccess(() => {
      param = component.getParam(p);
    });
    try {
      values[param.displayName] = await param.getValueAtTime(atTime);
    } catch (err) {
      errors[param.displayName] = String(err);
    }
  }
  return { values, errors };
}

/**
 * @returns {Promise<{
 *   clipName: string,
 *   found: boolean,
 *   matchName: string|null,
 *   values: Record<string, any>,
 *   errors: Record<string, string>,
 *   allComponents: Array<{index:number, displayName:string, matchName:string}>,
 * } | null>}
 */
async function findLumetriValues(proj, seq) {
  const videoTrack = await seq.getVideoTrack(0);
  if (!videoTrack) return null;

  const trackItems = await videoTrack.getTrackItems(
    ppro.Constants.TrackItemType.CLIP,
    false
  );
  if (!trackItems || trackItems.length === 0) return null;

  const clip = trackItems[0];
  const clipName = await clip.getName();
  const chain = await clip.getComponentChain();
  const components = await readClipComponents(proj, chain);

  const allComponents = components.map(({ index, displayName, matchName }) => ({
    index,
    displayName,
    matchName,
  }));

  const lumetriEntry = components.find((c) =>
    c.displayName.toLowerCase().includes("lumetri")
  );

  if (!lumetriEntry) {
    return {
      clipName,
      found: false,
      matchName: null,
      values: {},
      errors: {},
      allComponents,
    };
  }

  const atTime = await seq.getPlayerPosition();
  const { values, errors } = await readComponentParams(proj, lumetriEntry.component, atTime);

  return {
    clipName,
    found: true,
    matchName: lumetriEntry.matchName,
    values,
    errors,
    allComponents,
  };
}

module.exports = { findLumetriValues };
