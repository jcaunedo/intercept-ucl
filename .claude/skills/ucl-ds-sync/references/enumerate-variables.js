// use_figma script: enumerate all local variable collections + variables,
// resolving alias chains to final hex (colors) / numbers (floats).
// Cross-file ("external") aliases return {external:true}; resolve those in a
// second pass with figma.variables.getVariableByIdAsync(id) using the full
// "VariableID:<hash>/<node>" string.
const collections = await figma.variables.getLocalVariableCollectionsAsync();
const allVars = await figma.variables.getLocalVariablesAsync();
const byId = {}; allVars.forEach((v) => (byId[v.id] = v));
const colById = {}; collections.forEach((c) => (colById[c.id] = c));
const h = (n) => Math.round(n * 255).toString(16).padStart(2, "0");
const toHex = (c) =>
  "#" + h(c.r) + h(c.g) + h(c.b) + (c.a !== undefined && c.a < 1 ? h(c.a) : "");

function resolve(v, modeId, depth) {
  if (depth > 12) return { cycle: true };
  let val = v.valuesByMode[modeId];
  if (val && typeof val === "object" && val.type === "VARIABLE_ALIAS") {
    const ref = byId[val.id];
    if (!ref) return { external: true }; // lives in another library file
    const rc = colById[ref.variableCollectionId];
    return resolve(ref, rc.modes[0].modeId, depth + 1);
  }
  if (v.resolvedType === "COLOR" && val && typeof val === "object")
    return toHex(val);
  return val;
}

const out = {};
for (const c of collections) {
  const m = c.modes[0].modeId;
  out[c.name] = {};
  for (const v of allVars.filter((x) => x.variableCollectionId === c.id)) {
    out[c.name][v.name] = resolve(v, m, 0);
  }
}
return out;
