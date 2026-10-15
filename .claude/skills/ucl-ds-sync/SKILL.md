---
name: ucl-ds-sync
description: Sync the project's design system from Figma into this UCL component library — design tokens into theme.css and components/typography into src/components. Trigger whenever the user shares a URL from the design system Figma file named in CLAUDE.md, asks to import/update tokens, colors, typography, or a component (button, card, input, etc.) "from Figma", or to make UCL match the design system.
---

# Figma → UCL sync

Translate the project's design system in Figma into this UCL library. This is a recurring task: pull tokens / text styles / component specs from the Figma file, then apply them to `theme.css` or the relevant component using the repo's conventions.

## Project rules come first

Before anything else, read the repo's `CLAUDE.md` and `DESIGN.md`. They hold everything specific to this project: package name, stack, the Figma design system file and its modes, component categories, current component APIs, and design contracts. **When this skill and those files disagree, the files win.** If a value this skill needs isn't defined there, ask the user, then record the answer in the right file.

## Key facts (from CLAUDE.md)

- **Figma file:** CLAUDE.md → "Figma" holds the design system file name and `fileKey`. URLs look like `figma.com/design/<fileKey>/...?node-id=9-860` → nodeId `9:860`. If a URL's `fileKey` doesn't match, flag it before proceeding. If no file is recorded yet, ask for it and record it.
- **Modes:** CLAUDE.md → "Figma" says whether the design system has dark mode. If it's light only, don't invent dark values: mark the `.dark` block as a derived placeholder.
- **Token file (ships to consumers):** `src/styles/theme.css` → copied raw to `dist/styles.css`.
- **Storybook entry CSS (internal only):** `src/styles/globals.css`.
- **Components:** `src/components/<category>/<name>/`, public API in `src/index.ts` (CLAUDE.md → "Architecture").

## Prerequisites

- **Load the `figma-use` skill before any `use_figma` call** (mandatory).
- Batch-load Figma MCP tool schemas in one `ToolSearch`: `select:use_figma,get_design_context,get_metadata,get_variable_defs`.
- `get_variable_defs` only returns variables **bound to a selected node** — it can't enumerate collections. To list all variables/text styles, use `use_figma` with the Plugin API (scripts below).

## Workflow

### A. Syncing tokens (colors, spacing, radius, typography scale)

1. Enumerate all local variable collections + variables, resolving alias chains to final values. Cross-file aliases ("external") must be resolved separately by ID with `getVariableByIdAsync`. (Script: `references/enumerate-variables.js`.) The scripts read each collection's first mode; if the file has several modes (e.g. light and dark), resolve each mode separately.
2. Map primitives → `:root` raw values; map semantic tokens → shadcn role names so existing components pick them up. See `references/theme-conventions.md`.
3. **Diff every single token against the current `theme.css` value — no sampling, no "looks about right."** Build a table (Figma name → resolved value → current CSS var → current value → match?) and go through it exhaustively, including tokens whose current value already looks plausible. A wrong-but-plausible value (wrong hue, wrong alpha, stale value) is invisible unless it's actually compared. Specifically:
   - Compare the **raw RGBA object** at each alias hop, not a flattened hex string — an 8-digit hex can hide a hue mismatch behind a matching alpha, or vice versa.
   - For every token flagged `external: true` by the enumeration script, resolve it explicitly with `getVariableByIdAsync` in a follow-up `use_figma` call — never leave it unresolved or guess its value.
   - Treat "current CSS value has no matching Figma variable at all" as its own reportable category — flag it to the user as "hand-authored, no Figma source" rather than silently skipping or silently "fixing" it.
   - Report the full diff table's outcome to the user (even if the answer is "N tokens checked, 1 drifted, 2 have no Figma source"), not just the deltas — so an all-clear is visibly a checked all-clear, not an assumed one.
4. Edit `theme.css` for every confirmed drift, keeping the color format CLAUDE.md → "Theme & Tokens" specifies. Verify with `npm run build` and grep `dist/styles.css`.
5. Record design decisions that came out of the sync (a token intentionally not mirrored, a hand-authored value kept on purpose) in DESIGN.md, so the next sync doesn't undo them.

### B. Syncing a component (button, card, …)

1. `get_metadata` on the component frame to decode the variant matrix (Type × Size × Style × State from the symbol names).
2. `get_design_context` on a few **representative** nodes (default state of each style, plus one of each size) — not every variant. Use `excludeScreenshot: true` to save context. Pull every interaction state individually; never infer one.
3. Translate Figma's auto-layout output (negative margins, nested padding, `data-node-id`s) into clean `cva` variants using UCL tokens — do **not** copy the raw Figma classes. Conventions: `references/component-conventions.md`.
4. Update the component, its stories (and `.mdx` page if it has one), its folder `index.ts` and `src/index.ts` together, then update CLAUDE.md → "Current Component APIs" if the API changed.

For a full create/refine workflow on a single component, use the `ucl-generate-component` skill.

### C. Syncing typography

Typography lives in Figma **text styles**, not on a node. Enumerate with `getLocalTextStylesAsync` (script: `references/enumerate-text-styles.js`). Map the scale to tokens in `theme.css` (`--text-*` with paired line heights, `--font-weight-*`, `--font-*`). If the project has a `Typography` component (CLAUDE.md → "Current Component APIs"), keep its `size`/`weight` scale in step with the text styles.

## Always verify

From the repo root:

- `npm run lint` (`tsc --noEmit`) — must pass; renaming cva variants/types breaks stories and `index.ts`, fix them in the same change.
- `npm run build` — must succeed; for token changes, grep `dist/styles.css` to confirm.

## Known gotchas

- **Webfonts:** don't `@import` a webfont URL from `theme.css`. Consumers import Tailwind first, so a `url()` `@import` in shipped CSS is invalid there. Declare the `--font-*` tokens only, and document in CLAUDE.md → "Consumer Integration" how apps load the font. For Storybook, load the font as the first line of `globals.css` or in `.storybook/preview-head.html`.
- **`@theme inline` vs `@theme` for fonts:** font vars must be in a non-inline `@theme` block so `--font-sans` is emitted to `:root` and feeds the base font; `@theme inline` only inlines into utilities.
- **Color format:** keep the format CLAUDE.md specifies. Figma reports RGB; convert rather than mixing formats in one file.
- **Breaking changes:** renaming or removing a token, cva variant key or exported type is breaking for apps consuming the package. Call it out explicitly.
