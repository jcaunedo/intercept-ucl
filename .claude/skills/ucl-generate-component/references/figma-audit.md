# Full Figma audit for a component update

Every update to an existing component runs this audit, whatever the user asked for. A request such as "remove the … button" or "the tags shouldn't wrap" names one change; the designer may have changed other things in the same pass (a font weight, a gap, a color), and the user expects all of them to land. Skipping the audit is how changes get missed.

## 1. Dump every layer

Run this read-only `use_figma` script on **each** variant in the component set (Default, Hover, every `Size=` / `State=` symbol from `get_metadata`), and on any other component that shares the same code (e.g. PatientCard's `expanded` and `compact` sets). It walks every layer, including hidden ones and the insides of nested instances, and returns the properties that map to code.

```js
const ROOT_ID = "1108:3585"; // one variant symbol
const root = await figma.getNodeByIdAsync(ROOT_ID);
const varName = async (alias) => { if (!alias) return undefined; const v = await figma.variables.getVariableByIdAsync(alias.id); return v ? v.name : alias.id; };
const paint = async (ps) => { if (!Array.isArray(ps)) return undefined; const out = []; for (const p of ps) { if (p.visible === false) continue; if (p.type === "SOLID") { const c = p.color; out.push({ hex: "#" + [c.r, c.g, c.b].map(x => Math.round(x * 255).toString(16).padStart(2, "0")).join(""), o: p.opacity !== 1 ? p.opacity : undefined, v: await varName(p.boundVariables?.color) }); } else out.push({ type: p.type }); } return out.length ? out : undefined; };
const rows = [];
const walk = async (n, path) => {
  const r = { path, id: n.id, t: n.type, w: Math.round(n.width * 10) / 10, h: Math.round(n.height * 10) / 10 };
  if (n.visible === false) r.hidden = true;
  if ("layoutMode" in n && n.layoutMode !== "NONE") { r.layout = n.layoutMode; r.gap = n.itemSpacing; r.pad = [n.paddingTop, n.paddingRight, n.paddingBottom, n.paddingLeft]; r.align = [n.primaryAxisAlignItems, n.counterAxisAlignItems]; if (n.layoutWrap === "WRAP") r.wrap = true; if (n.clipsContent) r.clip = true; }
  if ("layoutSizingHorizontal" in n) r.sizing = [n.layoutSizingHorizontal, n.layoutSizingVertical];
  if ("cornerRadius" in n && n.cornerRadius) r.radius = n.cornerRadius === figma.mixed ? "mixed" : n.cornerRadius;
  if ("fills" in n && n.type !== "TEXT") r.fill = await paint(n.fills);
  if ("strokes" in n && n.strokes?.length) { r.stroke = await paint(n.strokes); r.sw = n.strokeWeight === figma.mixed ? [n.strokeTopWeight, n.strokeRightWeight, n.strokeBottomWeight, n.strokeLeftWeight] : n.strokeWeight; r.sa = n.strokeAlign; }
  if ("effects" in n && n.effects?.length) r.fx = n.effectStyleId ? (await figma.getStyleByIdAsync(n.effectStyleId))?.name : n.effects.map(e => e.type);
  if (n.type === "INSTANCE") { const mc = await n.getMainComponentAsync(); r.comp = mc ? (mc.parent?.type === "COMPONENT_SET" ? mc.parent.name + " / " + mc.name : mc.name) : undefined; r.props = Object.fromEntries(Object.entries(n.componentProperties || {}).map(([k, v]) => [k.split("#")[0], v.value])); }
  if (n.type === "TEXT") {
    r.chars = n.characters.slice(0, 40);
    r.segs = [];
    for (const s of n.getStyledTextSegments(["fontName", "fontSize", "lineHeight", "letterSpacing", "fills", "textStyleId"])) {
      r.segs.push({ chars: s.characters.slice(0, 30), font: s.fontName.family + " " + s.fontName.style, size: s.fontSize, lh: s.lineHeight.unit === "AUTO" ? "auto" : s.lineHeight.value, ls: s.letterSpacing.value || undefined, style: s.textStyleId ? (await figma.getStyleByIdAsync(s.textStyleId))?.name : "none", fill: await paint(s.fills) });
    }
    r.trunc = n.textTruncation !== "DISABLED" ? n.textTruncation : undefined;
  }
  rows.push(r);
  if ("children" in n) for (const c of n.children) await walk(c, path + "/" + c.name);
};
await walk(root, root.name);
return rows;
```

If the result is over the return limit, split it: run the script on each top-level child of the variant.

## 2. Diff every row against the code

Build a table with one row per Figma layer and property: text (family, weight, size, line height, color token), layout (gap, padding, alignment, wrap, clip), size, radius, fill, stroke (color, width, sides), effect, visibility, and nested instance props. For each row, find the class or prop in the component that renders it and mark it:

| Mark | Meaning |
| --- | --- |
| ✅ matches | The code renders this value |
| 🔧 changed | Figma differs from the code: fix it in this pass |
| 📌 recorded | A known, recorded difference: cite the DESIGN.md entry (or the component's own decision, e.g. Badge's sizes) |
| ⚠️ new | A difference with no record and no obvious fix (a token change, a structural change): ask, then record the answer |

Rules:

- **Read the component's DESIGN.md entry and the token sync notes ("Figma → theme.css token map", the sync drift lists) before marking anything ⚠️.** A difference already decided there is 📌, not a question. Never reopen a resolved decision unless the user asks.
- **Text weight and size are the most missed.** Compare every text layer's weight and size, even ones next to the element the user mentioned. Figma's style names (`xl/xl -bold`) and raw values (`Figtree Regular 20`) both count.
- **Removed and hidden layers:** a layer that's gone or hidden in Figma but rendered in code (or the reverse) is a 🔧 row.
- **Shared code:** when two Figma components render through the same code (variants of one UCL component), a value changed in one is checked in the other. If they disagree, the newer one wins unless DESIGN.md says otherwise; record the older one as behind.
- **Hover/state variants:** diff each against Default and confirm every property that changes has a code branch.
- Instance internals (a Badge inside the card) belong to that component: a difference there is usually 📌 (it's the nested component's own decision) unless the instance overrides it.

## 3. Report

End the update with the table's 🔧, 📌 and ⚠️ rows, grouped, so the user sees everything that was checked and changed, not only what they asked for. Rows that are ✅ are summarized as a count ("38 properties match").
