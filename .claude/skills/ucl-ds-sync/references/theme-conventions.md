# theme.css conventions

`src/styles/theme.css` is the token file (shadcn + Tailwind v4). It ships raw to consumers as `dist/styles.css`. CLAUDE.md → "Theme & Tokens" is the source of truth for this project's specifics (color format, modes, radius base). This file covers the mechanics that apply to any project.

## Structure (top to bottom)

1. `@theme inline { ... }`: maps Tailwind utilities to the `:root` vars (`--color-primary: var(--primary)`), so `.dark` overrides work. Also registers `--radius-*`, and, when the design system defines them, `--text-*` (with paired `--text-*--line-height`), `--font-weight-*` and primitive color ramps.
2. `@theme { ... }`: values Tailwind must emit as real variables or use for variants: breakpoints (see DESIGN.md "Breakpoints include their own width") and font families (`--font-sans`, `--font-display`), which must be non-inline so they reach `:root`.
3. `:root { ... }`: **primitives first** (color ramps, white/black), then **semantic** roles referencing them.
4. `.dark { ... }`: dark values. If the Figma file has no dark mode, this block is a derived placeholder; say so in a comment.

## Mapping rules

- **Primitives** → `--<scale>-<step>` (e.g. `--blue-500`).
- **Semantic** → shadcn role names so components work unchanged: `--background`, `--foreground`, `--card`, `--popover`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive` (each with `-foreground`), `--border`, `--input`, `--ring`. Semantic roles reference primitives (`--primary: var(--blue-600)`) rather than repeating raw values.
- New semantic roles the design system adds beyond shadcn's set (e.g. `success`, `warning`) follow the same pattern: `:root` + `.dark` value, plus a `--color-*` mapping in `@theme inline`.
- **Spacing** inherits Tailwind's default 4px scale. Don't redefine it unless the design system's scale differs, and record that decision in DESIGN.md.
- **Naming collisions:** shadcn's `--accent` is a neutral hover/selected surface. If the design system has a brand "accent" color, give it a distinct name (e.g. `--tone-accent`) and record the distinction in DESIGN.md.

## Project values

Don't keep a list of this project's token values here. `theme.css` is the record; DESIGN.md records the decisions behind any value that isn't a straight copy of Figma.
