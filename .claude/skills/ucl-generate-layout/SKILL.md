---
name: ucl-generate-layout
description: Translate a Figma page/screen (from the design system file or a product file) into a full-page reference layout under src/layouts, assembled from existing UCL components — or refine an existing layout after the Figma design has been revised. Trigger when the user gives a Figma URL and asks to "build/create/implement this page/screen", "turn this into a UCL layout", "code this Figma page", or — for an already-generated layout — "sync/update/refine this layout to match the updated Figma design". Requires a URL that points at a page/screen/frame composing multiple components — NOT a single component (use ucl-generate-component for that).
---

# Figma → UCL layout

Turn **one** Figma page/screen into a full-page reference layout in this UCL, under `src/layouts/`. Unlike a single component, a layout is a **composition** — the goal is almost never to invent new UI, it's to assemble the page correctly out of components that already exist (`Button` and whatever else `src/index.ts` exports).

This skill has two workflows:

- **[A. Create](#workflow-a-create-a-new-layout)** — no layout exists yet for this Figma page.
- **[B. Refine](#workflow-b-refine-an-existing-layout)** — a layout already exists at `src/layouts/<name>/` and the Figma design has since changed (spacing, tokens, copy) and the code needs to catch up.

Figure out which one applies before doing anything: check whether `src/layouts/<name>/` already exists for the page in question. If the user says "sync"/"update"/"refine"/"this wasn't 100% accurate" about a layout that's already in the repo, that's Workflow B — do not regenerate the file from scratch.

Both workflows share the same two governing rules with [[ucl-generate-component]]:

1. **Reuse before invention.** Assemble from existing `src/index.ts` exports. If the page needs a piece of UI that has no existing component, **STOP and ask** — do not invent a new component silently mid-layout.
2. **No assumptions.** Ambiguous copy, unclear states, a value with no matching token — **ask** rather than guess.

## Project rules come first

Before anything else, read the repo's `CLAUDE.md` and `DESIGN.md`. They hold everything specific to this project: package name, stack, the Figma design system file, the list of apps and flows, current component APIs, tokens and design contracts. If the work involves animation, also read `MOTION.md`. **When this skill and those files disagree, the files win.** If a value this skill needs isn't defined there, ask the user, then record the answer in the right file.

## Where the layout goes & what it's named

- **Layouts are grouped by app.** Each app built from UCL has its own folder under `src/layouts/<app>/`; the list of apps is in CLAUDE.md → "Architecture". A layout used by more than one app lives in `src/layouts/shared/`. Inside an app folder, each page/section is a direct subfolder (no `pages/` level), next to the app's shell (`<app>/<app>.tsx`). Storybook titles follow the same grouping: `Layouts/<App>/<Name>`. Ask which app a new page belongs to if it isn't clear, and record a new app in CLAUDE.md. Below, `src/layouts/<name>/` means `src/layouts/<app>/<name>/`.
- **Location is fixed:** `src/layouts/<app>/<name>/<name>.tsx` + `src/layouts/<app>/<name>/<name>.stories.tsx`. No `index.ts` — layouts are **not** exported from `src/index.ts`. They are a Storybook-previewed reference for how to compose the page from UCL components, not a page a consumer imports directly (a consuming app has its own routing/data and re-implements the composition there).
- **Images go in `src/layouts/<name>/images/`.** Any exported Figma asset (hero photos, logos, illustrations) is saved into an `images/` subfolder alongside the layout, e.g. `src/layouts/shared/sign-up-sign-in/images/hero.png`. Import with a relative path: `import heroImage from "./images/hero.png"`.
- **Name comes from Figma.** Take the name from the Figma frame/page name (e.g. "Social Login" screen → `sign-up-sign-in`, or match what the user calls it). Normalize to kebab-case for the file, PascalCase for the exported component. If the Figma name is generic (`Frame`, `Screen 1`) or ambiguous, propose a name and confirm before creating files.

## Prerequisites (both workflows)

- **Load the `figma-use` skill before any `use_figma` call** (mandatory) — layouts rarely need `use_figma` (no writing to Figma), but load it anyway if any write/inspection beyond `get_metadata`/`get_design_context` is needed.
- Batch-load Figma MCP tool schemas in one `ToolSearch`: `select:get_metadata,get_design_context,get_variable_defs,get_screenshot`.
- Read [references/ucl-conventions.md](../ucl-generate-component/references/ucl-conventions.md) (shared with `ucl-generate-component`) for the token/prop vocabulary.
- Read [references/layout-conventions.md](references/layout-conventions.md) for file skeletons specific to layouts.

## Workflow A: create a new layout

### A0. Hard precondition: it must be a page, not a component

A Figma **URL is required**, and it must resolve to a page/screen-shaped node.

1. Parse the URL: `figma.com/design/:fileKey/...?node-id=:nodeId` → convert `-` to `:` (`23-600` → `23:600`).
2. Run `get_metadata` on the node. It should be a `FRAME`/`SECTION` whose children are themselves multiple components/frames (columns, a form, a hero image, several instances) — a composed screen.
3. If it resolves to a single `COMPONENT` or `COMPONENT_SET`: **stop.** That's a job for `ucl-generate-component`, not this skill — tell the user and point them there.
4. If the metadata is ambiguous (e.g. a frame with just one child), inspect further before assuming; ask if still unclear.

No URL, or a URL you can't resolve → ask for a valid page/screen URL. Do not start coding.

### A1. Intake: gather the URL _and_ the brief

Before resolving the node or writing any code:

1. **The Figma page/screen URL** (see precondition above).
2. **Any additional specs** — target route/consumer app this mirrors, copy overrides, whether interactive behavior (form submission, auth wiring) should be stubbed or left as visual-only, accessibility requirements.

If the user gave only the URL, ask briefly: "Got it — this looks like a full page. Any specs on behavior (stub vs. fully wired form), copy, or the consuming app/route this represents? Reply 'none' to treat it as a visual-only reference."

### A2. Inventory what exists (reuse pass) — do this before decoding Figma in detail

- Read `src/index.ts` for the full list of exported components and their prop APIs.
- Skim `src/styles/theme.css` for tokens (spacing, radii, colors).
- Note anything the page will need that looks custom (e.g. a specific hero-image treatment, a two-column split) — that's likely just layout markup (grid/flex), not a new component.

### A3. Decode the page in Figma

1. `get_metadata` on the frame to map its structure: sections, columns, and — critically — which **instances** map to existing UCL components (an `instance` named "Button" maps to `Button`, and so on). Note: `get_metadata`'s `width`/`height` are resolved pixel values at capture time — do **not** use them to infer a split ratio (e.g. two ~equal-looking column widths do not mean a 50/50 split); get the real ratio from `get_design_context` (below).
2. `get_screenshot` on the top frame for a visual sanity check of the whole page.
3. `get_design_context` on the sections that aren't obviously composed of existing components (e.g. novel text blocks, copy, exact spacing between sections) — skip pulling full context for instances that are clearly existing components; you already know their API. For any top-level split (hero + form columns, sidebar + content, etc.), this is also where the **real track-sizing ratio** lives: look for `grid-cols-[minmax(0,Xfr)_minmax(0,Yfr)]` or `flex-[X_Y_0]` in the generated code and use that exact ratio (e.g. `grid-cols-[0.75fr_1fr]`), not a same-width guess like `grid-cols-2`.
4. `get_variable_defs` only if a raw value doesn't obviously map to an existing token.

### A4. Map Figma → composition (not invention)

- **Every `instance` node first**: try to match it to an existing exported component by name/shape before writing any bespoke markup. Prefer existing components over recreating their look inline.
- **Pure layout structure** (two-column split, hero image container, centered form column, spacing between sections): plain `div`s with Tailwind (`grid`, `flex`, `gap-*`), using tokens for color/spacing/radius — never raw hex/px.
- **Spacing accuracy**: every `gap-*`/`p-*`/`px-*`/`py-*`/`m-*` value must match Figma's literal number for that exact node, not the nearest-looking token. If a Figma value matches an existing spacing token, use that token's utility; if it doesn't, use the literal value as an arbitrary class (`gap-[2px]`, `pl-[13px]`) instead of rounding to the closest token "for consistency" with a nearby value — two elements that look like they should share a gap can have genuinely different Figma-authored values. See [DESIGN.md "Gaps, margins and padding match Figma's literal value"](../../../DESIGN.md#gaps-margins-and-padding-match-figmas-literal-value) for the concrete bug this guards against.
- **Copy**: pull real text from the Figma text nodes (`get_design_context`) rather than placeholder lorem ipsum.
- **Text styles**: match every text node's font-family, size, weight, color, and line-height exactly — see [Text style accuracy](#text-style-accuracy) below. Don't eyeball `size="base"` vs `size="lg"` from the screenshot; read the actual bound style/values.
- **Images**: reference Figma image fills as an external asset only if the user asks for the actual image; otherwise a neutral placeholder (styled div or img with alt text) is fine for a reference layout — ask if unsure whether real asset export is wanted. When exporting real assets, save them into `src/layouts/<name>/images/` (see naming section above) — never loose in the layout's root folder.
- **If a needed piece has no existing component equivalent** (truly new UI, not just layout glue) — stop and ask whether to punt to `ucl-generate-component` first, or inline a one-off for this layout only.

### Text style accuracy

Text is the easiest thing to get "close enough" and the easiest to get visibly wrong — a heading one size off, or a muted color rendered at full-opacity foreground, still reads as "basically right" in a quick visual scan but is a real drift from Figma. Verify every distinct text node explicitly, not by impression. Steps 2–4 and 6 assume a `Typography` component; if CLAUDE.md → "Current Component APIs" has none, map the same values to the theme's text tokens (`text-*`, `font-*`, `leading-*`) and the same rules apply:

1. **Pull the actual style, not just the string.** `get_design_context` returns each node's resolved typography (family, style/weight, size, line-height, letter-spacing) either inline in the generated `className`/style props or in the "styles contained in the design" summary appended to the response (e.g. `3xl/3xl-medium: Font(family: "font-family/headline", style: Medium, size: font-size/3xl, weight: ..., lineHeight: line-height/3xl, ...)`). Read that summary — don't infer size/weight from how large the text looks in the screenshot.
2. **Font-family → `Typography`'s `size` already encodes this, don't fight it.** Per `ucl-conventions.md`, sizes `xs`–`lg` render `font-sans` (body font) and `xl`+ render `font-display` (headline font). If Figma's node uses `font-family/headline` at a size ≤ `lg`, or `font-family/bodytext` at `xl`+, that's a real mismatch worth flagging (ask before overriding `Typography`'s font pairing with a raw class) — but the common case is Figma's family assignment already lines up with the size, so this is a check, not a fight.
3. **Size → nearest `Typography` `size` step**, matched by the token name Figma reports (`font-size/3xl` → `size="3xl"`), not by eyeballing px against the scale. If a Figma size falls between two `Typography` steps or uses a raw px with no matching token, **stop and ask** rather than picking the nearest one silently.
4. **Weight → `Typography`'s `weight` prop** (`regular`/`medium`/`semibold`/`bold`/`black`), matched to Figma's `style`/`weight` field exactly — `Medium` is `weight="medium"`, not the `regular` default left unset. Don't rely on `Typography`'s default (`regular`) when Figma specifies something else; set `weight` explicitly whenever it's non-default.
5. **Color → the semantic Tailwind class for the bound token**, not a raw hex. Map by the Figma variable name in the `color:` value (e.g. `color/foreground/foreground` → default text color, no override needed; `color/foreground/muted` → `text-muted-foreground`; `color/tone/brand/brand` → `text-primary`), the same token vocabulary as everywhere else in `ucl-conventions.md`. A node with no explicit color override in Figma should get no explicit color class in code — don't add `text-foreground` defensively where the design doesn't bind one.
6. **Line-height is carried automatically by `Typography`'s `size` step** (each step pairs a font-size with its matching `--line-height-*` token) — don't add a manual `leading-*` override unless Figma's `lineHeight` value diverges from that step's paired default, which is rare and worth double-checking against `theme.css` before assuming drift.
7. **State, if the text has one** (placeholder vs. filled, error, disabled, muted-until-hover, a link's hover/visited treatment): match it to the same Tailwind state-utility vocabulary used by form/interactive components (`aria-invalid:text-destructive`, `hover:underline`, `disabled:opacity-50`, etc.) rather than a bespoke class — check whether the surrounding component (e.g. `Input`, `Button`) already expresses that state and mirror it, don't invent a new pattern for the same concept.
8. **When two text nodes look visually similar but Figma reports different values for any one of the above** (e.g. same size, but one is `color/foreground/foreground` and the other `color/foreground/muted`), treat them as distinct — this is exactly the kind of drift that's invisible in a casual side-by-side and only surfaces once someone diffs the actual token.

### A5. Write the layout

- `src/layouts/<name>/<name>.tsx` — a single exported component, composed from imports off `@/` (or relative imports matching how other components import each other) of existing UCL components plus plain Tailwind markup for structure.
- `src/layouts/<name>/<name>.stories.tsx` — one `Default` story. Set `parameters: { layout: "fullscreen" }` in the story meta so it previews full-bleed with no Storybook canvas padding.
- Do **not** touch `src/index.ts` — layouts aren't part of the public package API.

### A6. Preview

- Run Storybook (`npm run storybook`) and open the story's direct URL with `?viewMode=story` (e.g. `http://localhost:6006/iframe.html?id=layouts-<name>--default&viewMode=story`) — this renders full-bleed in the plain browser tab, without the Storybook sidebar/toolbar/addons chrome, since `layout: "fullscreen"` is set.
- Take a screenshot (or ask the user to look) and compare against the Figma screenshot from step A3.

## Workflow B: refine an existing layout

Use this when `src/layouts/<name>/<name>.tsx` **already exists** and the Figma design has been revised since — e.g. the user updated spacing/padding/margins on semantic tokens in Figma, or tweaked copy, and the generated code needs to catch up. This is a **targeted patch against a diff**, not a regeneration: preserve everything in the existing file that Figma didn't change (state hooks, event handlers, structure, component choices) and only touch the values that actually drifted.

### B0. Locate the existing layout

- Confirm `src/layouts/<name>/<name>.tsx` exists. If the user only gave a Figma URL and it's unclear which layout it maps to, check `src/layouts/*/` and match by name/content before assuming.
- Read the existing `<name>.tsx` in full before touching Figma — you need its current state as the baseline for the diff.

### B1. Re-pull the current Figma state

1. `get_metadata` + `get_design_context` (`excludeScreenshot: true` unless a visual check is needed) on the same frame/node used originally, to get the **current** spacing, radius, color, and typography values — including any semantic token bindings the user just added.
2. `get_variable_defs` on nodes whose bound variable may have changed, to confirm the token name (e.g. `--spacing-4` vs. a raw `16px` that's now bound to a token).
3. Prefer bound variable names over recomputing raw px — if Figma now binds a value to a semantic token, that token's existing Tailwind utility/class is the target (see `references/ucl-conventions.md`), not a hardcoded arbitrary value.

### B2. Diff against the existing code

For each node section in the existing `<name>.tsx`, compare against the freshly pulled Figma values:

- **Track sizing (grid columns/rows, flex ratios) — check this explicitly, don't eyeball it.** If the top-level layout splits space between sections (e.g. a hero column + a form column), `get_design_context`'s generated code exposes the real ratio as a `grid-cols-[minmax(0,Xfr)_minmax(0,Yfr)]` (or `flex-[X_Y_0]`) track definition — this is the source of truth for the split, not the literal pixel `width` values `get_metadata` reports (those are just the resolved size at whatever the frame happened to be when captured, and can look deceptively like an even split). Compare the `fr` ratio (or flex-grow values) against whatever the code currently uses (e.g. a naive `grid-cols-2`) and correct it to the same ratio using an arbitrary value (`grid-cols-[0.75fr_1fr]`) since Tailwind has no built-in utility for non-1:1 splits.
- **Spacing (margin/padding/gap):** compare Figma's current `padding-*`/`gap-*`/margin values against the Tailwind spacing utilities in the code (`p-*`, `px-*`, `py-*`, `gap-*`). Patch only the classes whose value actually changed — to the *exact* value, not the nearest token: if the new Figma value doesn't match a spacing token, use an arbitrary class (`gap-[2px]`) rather than rounding to whatever token is closest, and check this per section/element independently since two visually-similar elements can carry different, non-matching Figma values for the same-looking gap (see [DESIGN.md "Gaps, margins and padding match Figma's literal value"](../../../DESIGN.md#gaps-margins-and-padding-match-figmas-literal-value)).
- **Tokens:** if Figma now binds a value to a semantic token that has a UCL equivalent (e.g. `--color/border/border` → `border-border`), swap any raw/mismatched utility for the token-backed one.
- **Copy:** if text nodes changed, update the literal strings in place.
- **Text styles:** even when only the copy changed, re-check that node's font-family/size/weight/color/line-height/state against the current Figma values per [Text style accuracy](#text-style-accuracy) — a copy edit in Figma is also when a designer most often nudges the style, and it's easy to patch the string while leaving a now-stale `size`/`weight`/color class untouched.
- **Everything else stays untouched** — don't restructure JSX, rename props, change component choices, or "clean up" code that Figma didn't change. This is a sync, not a rewrite.

### B3. Apply and verify

- Edit the existing `<name>.tsx` (and `<name>.stories.tsx` only if the story itself needs to change, which is rare) with targeted patches — use `Edit`, not a full rewrite via `Write`.
- Follow the same "Always verify" and preview steps as Workflow A (lint, build, Storybook fullscreen preview) and compare the new screenshot against the updated Figma screenshot to confirm the drift is resolved.

## Always verify

From the repo root:

- `npm run lint` (`tsc --noEmit`) — must pass.
- `npm run build` — must succeed (layouts aren't exported, but must not break the build).

## Stop-and-ask checklist (do not assume)

- The URL resolves to a single `COMPONENT`/`COMPONENT_SET` (page vs. component precondition) → redirect to `ucl-generate-component`.
- The Figma frame/page name is missing/generic/ambiguous → propose a name, confirm.
- An instance in the design doesn't match any existing exported component → ask before inlining new bespoke UI or before creating a new component out-of-band.
- A visual value maps to no existing token.
- Unclear whether behavior (form submission, auth, navigation) should be stubbed, mocked, or left purely presentational.
- Unclear whether images should be exported as real assets or left as placeholders.
- **(Workflow B)** Unclear which existing `src/layouts/<name>/` a Figma URL corresponds to.
- **(Workflow B)** A diffed value doesn't map to any existing token (same rule as Workflow A — don't hardcode a raw value to "match" Figma; ask whether a token should be added).
- **(Workflow B)** The diff implies a structural change (not just spacing/token/copy) — e.g. a section was added/removed/reordered — confirm before restructuring, since this workflow is meant for drift, not redesign.
