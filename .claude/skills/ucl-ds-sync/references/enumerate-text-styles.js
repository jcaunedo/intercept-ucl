// use_figma script: enumerate local text styles (the typography definitions),
// with the variables bound to size/lineHeight/weight/family resolved by name.
const styles = await figma.getLocalTextStylesAsync();
const allVars = await figma.variables.getLocalVariablesAsync();
const byId = {}; allVars.forEach((v) => (byId[v.id] = v));
const resolveVar = (id) => {
  const v = byId[id];
  if (!v) return "(external)";
  const m = Object.values(v.valuesByMode)[0];
  return {
    name: v.name,
    value:
      m && typeof m === "object" && m.type === "VARIABLE_ALIAS"
        ? byId[m.id]?.name ?? "(ext)"
        : m,
  };
};
return styles.map((s) => {
  const bv = s.boundVariables || {};
  return {
    name: s.name,
    family: s.fontName.family,
    style: s.fontName.style,
    size: s.fontSize,
    lineHeight: s.lineHeight,
    letterSpacing: s.letterSpacing,
    bound: {
      fontSize: bv.fontSize ? resolveVar(bv.fontSize.id) : null,
      lineHeight: bv.lineHeight ? resolveVar(bv.lineHeight.id) : null,
      fontWeight: bv.fontWeight ? resolveVar(bv.fontWeight.id) : null,
      fontFamily: bv.fontFamily ? resolveVar(bv.fontFamily.id) : null,
    },
  };
});
