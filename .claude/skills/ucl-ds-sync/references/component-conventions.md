# Component conventions

The full conventions live in CLAUDE.md ("Creating a Custom Component", "Code style", "Current Component APIs") and DESIGN.md. This is the short list to keep in mind during a sync.

## Patterns

- Variant management with `cva`; merge classes with `cn()` from `@/lib/utils`.
- Type props as `React.ComponentProps<"el"> & VariantProps<typeof variants> & { ...extras }`. Follow CLAUDE.md → "Code style" for refs (React 19: `ref` is a regular prop).
- Use design-system tokens via Tailwind utilities (`bg-primary`, `text-foreground`, `border-border`, `rounded-md`, `text-sm`, `size-4`…), never hardcoded hex.
- Translate Figma's generated output into clean utilities. Figma emits auto-layout artifacts (negative margins like `mr-[-7px]`, nested padding, `content-stretch`, `data-node-id`) — **do not** copy those; express the design intent with `gap`, `px`/`py`, `h-*`/`size-*`.
- Spacing and icon sizes match Figma's literal values (DESIGN.md "Gaps, margins and padding match Figma's literal value" and "Icon sizes match Figma's defined instance size").
- For darken-on-hover that Figma expresses as a black/white overlay, use `color-mix` (e.g. `hover:bg-[color-mix(in_srgb,var(--destructive)_90%,black)]`), not opacity `/90` (which lightens on light backgrounds).

## Every component change touches these places

1. `src/components/<category>/<name>/<name>.tsx` — the component.
2. `<name>.stories.tsx` — one story per variant/state + an `AllVariants` story.
3. `<name>.mdx` — if the component has a docs page, keep it in step with the API.
4. The folder `index.ts` and `src/index.ts` — exports.
5. CLAUDE.md → "Current Component APIs" — when variants, sizes or props change.

Renaming a `cva` variant key or an exported type is **breaking** for consumers; update stories + exports in the same change so `tsc --noEmit` stays green.

## Verify

From the repo root: `npm run lint` then `npm run build`. Optionally `npm run build-storybook` to confirm CSS and fonts.
