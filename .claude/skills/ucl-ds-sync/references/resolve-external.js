// use_figma script: resolve cross-file ("external") variable aliases by full ID.
// Pass the "VariableID:<hash>/<node>" strings collected from enumerate-variables.js.
const ids = {
  // label: "VariableID:.../...."
};
const h = (n) => Math.round(n * 255).toString(16).padStart(2, "0");
const toHex = (c) =>
  "#" + h(c.r) + h(c.g) + h(c.b) + (c.a !== undefined && c.a < 1 ? h(c.a) : "");
const out = {};
for (const [label, id] of Object.entries(ids)) {
  const v = await figma.variables.getVariableByIdAsync(id);
  if (!v) { out[label] = "NOT FOUND"; continue; }
  const col = await figma.variables.getVariableCollectionByIdAsync(
    v.variableCollectionId,
  );
  let val = v.valuesByMode[col.modes[0].modeId];
  if (val && typeof val === "object" && val.type === "VARIABLE_ALIAS") {
    const ref = await figma.variables.getVariableByIdAsync(val.id);
    const rcol = await figma.variables.getVariableCollectionByIdAsync(
      ref.variableCollectionId,
    );
    val = ref.valuesByMode[rcol.modes[0].modeId];
  }
  out[label] = {
    name: v.name,
    value: val && val.r !== undefined ? toHex(val) : val,
  };
}
return out;
