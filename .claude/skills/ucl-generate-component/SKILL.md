---
name: ucl-generate-component
description: Translate a SINGLE Figma component (from the project's design system file) into a UCL React component under src/components/<category>/<component-name>/, using shadcn/Tailwind conventions and reusing the existing token + prop vocabulary — or refine an existing component after the Figma design has been revised. Trigger when the user gives a Figma URL and asks to "build/create/implement this component", "turn this into a UCL component", "code this Figma component", or — for a component that already exists in the repo — "sync/update/refine this component to match the updated Figma design". Requires a URL that points at a component — NOT a page, screen, artwork, or arbitrary frame.
---

# Figma → UCL component

Turn **one** Figma component into a clean UCL React component. The output must look like it was written by hand in this repo — shadcn-style `cva` variants, UCL design tokens, existing prop vocabulary — never a paste of Figma's generated classes.

This skill has two workflows:

- **[A. Create](#workflow-a-create-a-new-component)** — no component exists yet for this Figma design.
- **[B. Refine](#workflow-b-refine-an-existing-component)** — the component already exists at `src/components/<category>/<component-name>/<component-name>.tsx` and the Figma design has since changed (spacing, tokens, sizing, a new variant) and the code needs to catch up.

Figure out which one applies before doing anything: check whether a folder for this component already exists under `src/components/<category>/`. If the user says "sync"/"update"/"refine"/"this wasn't quite right" about a component that's already in the repo, that's Workflow B — do not regenerate the file from scratch.

Both workflows are deliberate about two things the user cares about:

1. **Reuse before invention.** Reuse existing tokens, variant names, prop names, and patterns. When the design needs something that does not yet exist (a new token, a new variant axis, a new prop), **STOP and ask** — do not invent it silently.
2. **No assumptions.** When the Figma source is ambiguous (unclear states, missing variants, unnamed layers, a value that doesn't map to a token), **ask** rather than guess.

## Project rules come first

Before anything else, read the repo's `CLAUDE.md` and `DESIGN.md`. They hold everything specific to this project: package name, stack, the Figma design system file, component categories, current component APIs, tokens and design contracts. If the work involves animation, also read `MOTION.md`. **When this skill and those files disagree, the files win.** If a value this skill needs isn't defined there, ask the user, then record the answer in the right file.

## Where the component goes & what it's named

- **Location:** every component lives in its own folder at `src/components/<category>/<component-name>/`, containing `<component-name>.tsx`, `<component-name>.stories.tsx`, an `index.ts` that re-exports the component (and its variants/types), and optionally a `<component-name>.mdx` docs page. This matches every existing component (e.g. `components/buttons/button/`). `src/components/ui/` is only a staging folder for the shadcn CLI (CLAUDE.md → "Adding a shadcn Primitive").
- **Category is one of the categories listed in CLAUDE.md → "Architecture"** (a category folder is created when its first component arrives). Pick the category by what the component *is*, matching the existing grouping (e.g. a new input-like control → `forms`; a new card variant → `cards`; a modal/menu/tooltip → `overlays`; a status/message component like Alert, Toast, or Progress → `feedback`, not `data-display` — `data-display` is for presenting data/content (tables, badges, avatars), `feedback` is for communicating status to the user). If it doesn't clearly fit an existing category, **ask** rather than inventing a new top-level folder silently.
- **Name comes from Figma.** Take the component name from the Figma component/component-set name. Normalize it to the repo convention: **kebab-case** for the folder and file (`segmented-control/segmented-control.tsx`), **PascalCase** for the exported component (`SegmentedControl`).
- **Always confirm category + name with the user before creating files** — propose both (e.g. "I'll create this as `forms/segmented-control/`, exported as `SegmentedControl` — sound right?") and wait for confirmation, even if the Figma name seems clear. If the Figma name is missing, generic (`Component 1`, `Frame`), or ambiguous, propose a name explicitly and don't silently pick one.

## Prerequisites (both workflows)

- **Load the `figma-use` skill before any `use_figma` call** (mandatory).
- Batch-load the Figma MCP tool schemas in one `ToolSearch`:
  `select:get_metadata,get_design_context,get_variable_defs,use_figma`
- Read [references/ucl-conventions.md](references/ucl-conventions.md) before writing code — it captures how components are written here (file layout, skeleton, translation rules). Project specifics come from CLAUDE.md and DESIGN.md.

## Workflow A: create a new component

### A0. Hard precondition: it must be a component

A Figma **URL is required**, and it must resolve to a single component.

1. Parse the URL: `figma.com/design/:fileKey/...?node-id=:nodeId` → convert `-` to `:` in the nodeId (`9-860` → `9:860`). Compare the URL's fileKey with the design system file in CLAUDE.md → "Figma"; if it differs, flag it before proceeding.
2. Run `get_metadata` on the node and check `type`. Proceed only if it is `COMPONENT` or `COMPONENT_SET`.
3. If it is a `FRAME`, `SECTION`, `INSTANCE`, `GROUP`, `CANVAS`, or anything page/screen/artwork-shaped: **stop.** Report what the node actually is, list any `COMPONENT`/`COMPONENT_SET` nodes found inside it (from the metadata), and ask the user to point at one. Never try to "best-effort" a screen into a component.

No URL, or a URL you can't resolve → ask for a valid component URL. Do not start coding.

### A1. Intake: gather the URL _and_ the brief

Before resolving the node or writing any code, make sure you have these inputs:

1. **The Figma component URL** (see the precondition above) — the source of truth for the visual design.
2. **A base-library reference URL — when the component is a native primitive of the base library in CLAUDE.md → "Stack".** The steps below are written for shadcn/ui; for another library (e.g. Untitled UI), use its docs and source the same way. Many of these components (input, checkbox, select, switch, textarea, dialog, etc.) already exist in shadcn/ui. When the thing being added maps to one of those, **ask the user for the shadcn.com component URL** (or confirm which shadcn primitive it corresponds to). The Figma URL is best for _custom_ components that have no shadcn equivalent; for native ones, the shadcn reference anchors the structure, prop API, accessibility, and Tailwind class patterns so the Figma design is translated to _match and follow shadcn/Tailwind UI_ rather than reinvented. If the user isn't sure whether it's a native primitive, check the shadcn/ui catalog by the component's name and propose the match.
3. **Any additional specifications, notes, or directions** the user wants applied — e.g. a specific component/prop name, variant axes to include or skip, accessibility requirements, behavior the design doesn't show, or tokens to prefer/avoid.

If the user gave a URL but not the rest, **ask explicitly** before proceeding — e.g. "Got the Figma URL. Is this a native shadcn/ui component (input, select, checkbox…)? If so, share the shadcn.com reference URL so I match its structure and API. Any other specs, notes, or directions (naming, props/variants to include or skip, a11y, behavior, token preferences)? Reply 'none' to use the design as-is." Treat anything they provide as authoritative: it overrides the defaults in this skill, and any direction that conflicts with a stop-and-ask item resolves that question instead of pausing on it.

**How the two sources combine:** the shadcn reference defines the component's _skeleton_ — element structure, prop names, base Tailwind classes, accessibility, and behavior. The Figma node defines its _skin_ — which UCL tokens, sizes, radii, and variant values to bind. Where Figma and shadcn disagree on structure or behavior, prefer the shadcn baseline and flag the discrepancy; where they disagree on visual values, follow Figma (mapped to UCL tokens). If a Figma detail can't be reconciled with the shadcn primitive, **stop and ask**.

**Always verify against shadcn's actual current source, not memory or the docs page.** For any component that maps to a shadcn/ui primitive (native or being refined), pull the real source file before writing or diffing code — `https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/new-york-v4/ui/<component>.tsx` (the `ui.shadcn.com/docs/...` page itself often only shows usage examples, not the implementation — it will not have default prop values like `position`/`align`/`side` or the full className string). Check specifically for: default prop values (e.g. `position="item-aligned"`, `size="default"`), the exact element/wrapper structure (which primitive parts are composed, in what nesting), and the base className string (spacing, radius, states) — shadcn revises these over time, and a component built from an older mental model of "how shadcn does it" silently drifts from the current baseline. This isn't optional context gathering — a wrong assumption here (e.g. defaulting to `popper` mode when shadcn's actual default is `item-aligned`) produces working-but-wrong code that only surfaces as a visual bug later.

### A2. Read the design system you already have (reuse pass)

Before touching Figma, inventory what exists so you reuse it:

- **Tokens:** skim `src/styles/theme.css` for the available semantic roles (`primary`, `accent`, `destructive`, `border`, `muted-foreground`, radii, etc.) and brand scales.
- **Components & props:** read CLAUDE.md → "Current Component APIs", `src/index.ts` and the relevant `src/components/<category>/*` files. Note the established prop names and variant keys (e.g. Button's `variant`/`size`/`asChild`). New components should mirror these names where the concept is the same.
- **When reusing an existing component as a subcomponent (e.g. embedding `Button` inside a new composition), check its baked-in default sizing/spacing against this specific Figma instance — don't assume the default fits.** Many components hardcode a default size in their base class (e.g. a fixed `h-11`) that suits their *typical* usage but not every instance. Read the Figma frame's actual measured dimensions for that sub-element (from `get_design_context`/`get_metadata` on its node) and compare against the subcomponent's rendered default. If they differ, override via the subcomponent's `className` prop (`cn()`/`tailwind-merge` will resolve the conflict) rather than shipping the component at its default size and assuming it matches. This is a distinct failure mode from A6's token/state re-check: the composed component builds and renders *something* plausible-looking, so nothing catches a silently-wrong inherited size short of measuring the actual instance.

### A3. Decode the component in Figma

1. `get_metadata` on the component/component-set to read the **full variant matrix** — every `prop=value` pair across every child symbol/frame in the set (e.g. `Type=Primary, Size=Md, State=Default`), not just the ones visible in the node the user linked. This tells you which `cva` axes exist and their values, and it's the source of the component's **name**. **List every symbol name from this response before moving on** — this list is the checklist A6 verifies against, so an incomplete read here silently produces an incomplete component.
2. `get_variable_defs` on the node to get the **bound variables** (fills, radius, spacing, typography) → these are your token names. Prefer the bound token over a raw hex/px value. **Resolve the bound token's own hex/px value and cross-check it against the Tailwind utility you're about to write** — do not pick a token by name-association with the component (e.g. reaching for `sidebar-background` just because the component is a sidebar). Read the value `get_variable_defs` returned for the exact variable name Figma bound (e.g. `color/background/background`), then grep `theme.css` for which CSS var/Tailwind utility resolves to that same value. If a same-family, plausible-sounding token exists with a *different* value (e.g. `--sidebar-background` vs `--background` resolve to different hex codes), the mismatch is exactly the kind of error that ships invisibly — Storybook still renders *a* color, just the wrong one. When two candidate tokens share a value in the current theme but could diverge (e.g. a dark-mode override), prefer the more specific token only if Figma's variable name actually indicates that scope; otherwise default to the semantic token Figma named.
3. `get_design_context` on a **representative subset** to establish the visual pattern (base style + one of each size) — with `excludeScreenshot: true`. You may infer *sizes* and *style/type* variants from the pattern once it's clear. **Never infer interaction states this way** — `Hover`, `Focus`, `Active`, `Disabled`, `Done`/completed-style states, etc. must each be individually pulled via `get_design_context` (or read from their fill/effect values) and implemented, even when they look like they'd follow the same formula as a state you already fetched. States are exactly where components most often ship incomplete, because they're easy to assume rather than check.
4. **Nested instances have their own states too.** If the component's Figma layers include instances of other components (e.g. an icon button used inside a larger composition), those instances typically carry no visible state variants of their own at the composition's scope — but the composed component still needs hover/focus-visible/disabled treatment on them in code. Don't leave a nested interactive element as a bare unstyled element just because Figma didn't show you a state matrix for it in this context; apply the same interaction-state vocabulary used elsewhere in the library (see `references/ucl-conventions.md`), and if the right visual direction is genuinely ambiguous (e.g. no Figma source for what hover should look like), **ask** rather than invent silently.

### A4. Map Figma → UCL (the translation rules)

- **Variant axes → `cva` variants.** Figma's `Type`/`Style`/`Size`/`State` become `cva` variant groups. **Reuse existing variant key names** when the meaning matches the existing API (listed in CLAUDE.md → "Current Component APIs"). If Figma introduces a genuinely new axis or value with no existing equivalent → **ask** how to name it before adding.
- **States.** `hover`/`focus`/`active`/`disabled` are **not** `cva` variants — express them as Tailwind state utilities (`hover:`, `focus-visible:`, `disabled:`, `aria-*:`) matching the patterns in the existing components.
- **Values → tokens, never hex/px literals.** Use `bg-primary`, `text-foreground`, `border-border`, `rounded-xl`, `text-sm`, `size-4`, `gap-2`, etc. If a Figma color, radius or type value maps to **no existing token**, do not hardcode the raw value — **stop and ask** whether to add a token (and what to call it) or reuse the nearest existing one.
- **Discard Figma auto-layout artifacts.** Negative margins (`mr-[-7px]`), `content-stretch`, nested wrapper padding, and `data-node-id` attributes are generation noise. Re-express the _intent_ with `gap`, `px`/`py`, `h-*`/`size-*`, `inline-flex items-center`.
- **Hover-darken** that Figma renders as a black overlay → `color-mix` (e.g. `hover:bg-[color-mix(in_srgb,var(--primary)_90%,black)]`), not `/90` opacity (which lightens on light fills).

See [references/ucl-conventions.md](references/ucl-conventions.md) for the full pattern catalog and worked examples.

### A5. Write the component (consistency + semantics)

- Create `src/components/<category>/<component-name>/<component-name>.tsx` (kebab-case folder/file, PascalCase export — see naming rules above).
- `cva` for variants, `cn()` from `@/lib/utils` to merge, `defaultVariants` set.
- Type props as `React.ComponentProps<"el"> & VariantProps<typeof variants> & { ...extras }`.
- Add `data-slot="<name>"` and `data-variant`/`data-size` attributes like Button does, for styling hooks and consistency.
- **Semantics:** add the accessibility and documentation meaning the raw Figma lacks — correct element (`button`/`a`/`nav`/`ul`…), `aria-*` for state, `role` where needed, and a one-line JSDoc on the exported component that ends with its Figma reference (CLAUDE.md → "Code style"). Comment behavior and non-obvious intent only: don't label classes with Figma variant, layer or token names (those go in DESIGN.md).
- **Reuse props:** match existing prop names/shapes across the library. A new prop is fine when the design truly needs it — but if it overlaps an existing concept under a different name, prefer the existing name; if unsure whether to add one, **ask**.

### A6. Verify full state coverage before wiring up exports

Before moving on, re-check the component file against the symbol list from A3 step 1: **every state named in the Figma set must have a corresponding branch in the code** — a `cva` variant value, a Tailwind state utility (`hover:`/`focus-visible:`/`disabled:`/`aria-*:`), or (for nested instances) an added interaction class per A3 step 4. Go down the list name by name; do not eyeball it. If a state was intentionally left out (e.g. it's a Figma-only presentation aid with no code equivalent), that's fine — but it should be a deliberate decision you could explain, not a state you simply didn't get to.

**Also re-verify every token you bound, not just the states.** Go back through the component file line by line and, for each `bg-*`/`text-*`/`border-*` token utility, confirm it against the actual `get_variable_defs` output from A3 step 2 — not against what "sounds right" for a component with this name. This is a separate failure mode from missing states: the code compiles, builds, and renders *something* plausible, so nothing catches a same-family wrong-token swap (e.g. writing `bg-sidebar-background` for a component named Sidebar when Figma actually bound the root fill to the generic `color/background/background` token) short of this explicit re-check. Re-derive each Tailwind class from the resolved hex/px value, don't trust the first token name that pattern-matched while writing the JSX.

**Also re-verify the rendered size of every reused subcomponent against its Figma instance, not just its own tokens.** For each existing component you embedded (per A2's reuse-pass note), diff its actual rendered dimensions (height/width from its own base classes) against the measured size of that element in the Figma frame from A3. A mismatch here doesn't fail lint or build and doesn't look wrong without a side-by-side comparison — it ships as a plausible-looking but incorrectly-sized instance (e.g. shipping a subcomponent at its default 44px when this instance measures 28px in Figma) until someone compares pixels.

**Also re-verify every gap/margin/padding value, per variant/state — never rounded to the nearest token.** This is a third, independent failure mode from the two above: go through every `gap-*`/`p-*`/`px-*`/`py-*`/`m-*` class and re-derive it from the exact px value `get_design_context`/`get_variable_defs` reports for that specific node (not a sibling node, not a different variant of the same component — each variant/state can have its own distinct spacing). If the value matches an existing spacing token, use that token's utility; if it doesn't, use the literal value as an arbitrary class (`gap-[2px]`) rather than snapping to the closest token "for consistency" — a component can legitimately have two different variants with two different, non-matching values for what looks like the same visual role, and collapsing them to one shared value is a real bug, not a cleanup. See [DESIGN.md "Gaps, margins and padding match Figma's literal value"](../../../DESIGN.md#gaps-margins-and-padding-match-figmas-literal-value) for the precedent.

Every new component touches:

1. `src/components/<category>/<component-name>/<component-name>.tsx` — the component.
2. `src/components/<category>/<component-name>/<component-name>.stories.tsx` — one story per variant/state + an `AllVariants` story; `tags: ["autodocs"]` unless the component gets its own `<component-name>.mdx` page.
3. `src/components/<category>/<component-name>/index.ts` — re-export the component, its `<name>Variants`, and any exported prop types from the folder (e.g. `components/buttons/button/index.ts`).
4. `src/index.ts` — re-export the same names from the component's `index.ts`, grouped under the matching category comment banner (e.g. `/* Buttons */`), matching how every existing component is wired up.
5. CLAUDE.md → "Current Component APIs" — add the new component's variants, sizes and props.

Renaming a `cva` variant key or exported type is **breaking** for apps consuming the package — call it out, and fix stories + exports in the same change so types stay green.

## Workflow B: refine an existing component

Use this when `src/components/<category>/<component-name>/<component-name>.tsx` **already exists** and the Figma design has been revised since — e.g. a size/spacing value changed, an icon's scale within its slot changed, a color was rebound to a different token, or a variant was tweaked. This is a **targeted patch against a diff**, not a regeneration: preserve everything in the existing file that Figma didn't change (prop API, variant keys, structure, accessibility semantics) and only touch the values that actually drifted.

Because `src/components/**` components are shared across every consumer (layouts, other components, external apps via the published package), a fix here has wider blast radius than a layout fix — check for other `src/components/*/*` or `src/layouts/*` files that render this component and consider whether the same drift shows up there too (usually it won't, since they just consume the component's API, but a prop default change can ripple).

### B0. Locate the existing component

- Confirm `src/components/<category>/<component-name>/<component-name>.tsx` exists. If the user only gave a Figma URL and it's unclear which component it maps to, check the folders under `src/components/*/` and match by name/shape before assuming.
- Read the existing `<component-name>.tsx` (and its `.stories.tsx`) in full before touching Figma — you need the current `cva` variants, prop API, and class values as the baseline for the diff.

### B1. Re-pull the current Figma state

1. `get_metadata` + `get_design_context` (`excludeScreenshot: true` unless a visual check is needed) on the same component/component-set node used originally, to get the **current, full** variant matrix — list every symbol name in the response, not just the ones the user pointed at — plus spacing, radius, color, typography, and icon/asset sizing, including any semantic token bindings that changed. Treat this the same as A3 step 1: the fresh symbol list is what B2 diffs against, so read it completely even when you only expect one small change — Figma often carries other new states/values alongside the one the user mentioned.
2. `get_variable_defs` on nodes whose bound variable may have changed, to confirm the token name.
3. Prefer bound variable names over recomputing raw px — if Figma now binds a value to a semantic token, that token's existing Tailwind utility is the target (see [references/ucl-conventions.md](references/ucl-conventions.md)), not a hardcoded arbitrary value.
4. **If this component maps to a shadcn/ui primitive, also re-pull shadcn's actual current source** (`https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/new-york-v4/ui/<component>.tsx`) — not just Figma — before diffing. Default prop values, wrapper structure, and base classNames are exactly the kind of thing that silently drifts across a component's history in this repo (each refine pass tends to patch one symptom at a time), so re-anchoring against the real upstream source periodically, not just the last-known local baseline, catches accumulated drift that a Figma-only diff would miss entirely (Figma has no opinion on Radix positioning modes, default props, or DOM structure).

### B2. Diff against the existing code

Compare the freshly pulled Figma values against the existing `cva` definition and markup, section by section:

- **Variant matrix:** if Figma added/removed/renamed a `Type`/`Size`/`State` value, treat it like Workflow A4 — reuse existing key names where the concept matches, and **stop and ask** before adding a genuinely new variant axis or value with no existing equivalent.
- **Icon size inside a fixed slot — check this explicitly, don't eyeball it.** When a component renders an icon/glyph/image inside a fixed-size container (e.g. a `size-10` button slot), the meaningful value is the *icon's* size relative to the slot, not just the slot size. Use the icon instance's own defined size from Figma (DESIGN.md "Icon sizes match Figma's defined instance size"); Figma's raw inset/scale math on a cropped source image reflects the asset's bleed, not a size to copy. If the instance size and what the export suggests disagree, ask the user.
- **Spacing (margin/padding/gap):** compare Figma's current `padding-*`/`gap-*`/margin values against the Tailwind spacing utilities in the code. Patch only the classes whose value actually changed — but patch to the *exact* new value, not the nearest existing token: if Figma's new value doesn't match a spacing token, use an arbitrary class (`gap-[2px]`) rather than rounding to whatever token is closest. Check each variant/state independently — a component's two variants can legitimately carry different, non-matching spacing values for what looks like the same visual role (see [DESIGN.md "Gaps, margins and padding match Figma's literal value"](../../../DESIGN.md#gaps-margins-and-padding-match-figmas-literal-value)), so don't assume a value patched in one variant should propagate to the others without checking Figma for each.
- **Positioning offsets on floating/portal content (popover, select, dropdown, tooltip panels) are a distinct category from ordinary padding/margin/gap — measure them, don't infer them from the className.** A Radix `Content` panel's X/Y placement relative to its trigger is computed by the primitive's positioning mode (`item-aligned` vs `popper`, `align`, `side`, `sideOffset`), not by a Tailwind spacing class you can diff by eye — the same `min-w-[8rem]`-style width can render flush with the trigger at one size and a few px off at another, because the drift comes from Radix's internal item/content geometry, not from a stale utility class. Before touching any position/size fix on this class of component: (1) get a live pixel measurement of both the trigger's and the content's bounding box (e.g. via a quick Playwright check in Storybook — `boundingBox()` on `[data-slot="<x>-trigger"]` and `[data-slot="<x>-content"]`), not a visual guess from a screenshot; (2) re-measure after every attempted fix, across every relevant size/variant, since a correction tuned for one size can move a different size in the wrong direction (a fixed px transform that zeroes the offset at `sm`/`lg` can overshoot at `xl` if that size's internal padding differs); (3) confirm which Radix CSS vars are actually populated in the mode you're using before relying on one — e.g. `--radix-select-trigger-width` is only set in `popper` mode, not `item-aligned`, so referencing it in `item-aligned` silently resolves to nothing rather than erroring.
- **Reused subcomponent sizing:** if the component embeds another UCL component (e.g. `Button`) whose own default size doesn't match this instance's measured Figma dimensions, patch the override className rather than assuming the default still applies — see A2's reuse-pass note.
- **Tokens/colors:** if Figma now binds a value to a semantic token that has a UCL equivalent, swap any raw/mismatched utility for the token-backed one.
- **Everything else stays untouched** — don't restructure the component, rename props/variant keys, or "clean up" code Figma didn't change. This is a sync, not a rewrite. Renaming a `cva` variant key or exported type is still **breaking** for consumers — flag it if the diff seems to require one.

### B3. Apply and verify

- Edit the existing `<component-name>.tsx` (and its folder's `.stories.tsx`/`index.ts`, plus the top-level `src/index.ts`, only if the diff actually requires it — e.g. a new variant needs a new story, or a renamed export) with targeted patches — use `Edit`, not a full rewrite via `Write`.
- Run the same state-coverage check as A6: walk the full symbol list from B1 step 1 name by name and confirm each has a code branch. This catches the common case where the user asks about one specific state change but Figma's set has grown other new states in the same pass.
- Follow the same "Always verify" steps as Workflow A (lint, build) and check the component's Storybook stories (and any layout that renders it) to confirm the drift is resolved.

## Always verify

From the repo root:

- `npm run lint` (`tsc --noEmit`) — must pass.
- `npm run build` — must succeed.

## Stop-and-ask checklist (do not assume)

Pause and ask the user when any of these is true:

- You don't have a Figma URL yet, or the user hasn't provided one — **ask for it** before doing anything else.
- You have the URL but haven't yet asked, up front, whether it's a native shadcn primitive **and for its shadcn.com reference URL if so** — this is required before proceeding, not optional context. If the user hasn't given one, ask explicitly.
- You haven't yet confirmed the **category** (from CLAUDE.md → "Architecture") and the **component name** with the user — always propose both and get confirmation before creating files, even when the Figma name looks obvious.
- The component looks like a native shadcn/ui primitive but you have no shadcn reference to anchor its structure/API (propose the match, ask to confirm).
- The URL is missing, unresolvable, or not a `COMPONENT`/`COMPONENT_SET`.
- The Figma component name is missing/generic/ambiguous (propose a name, confirm).
- The component doesn't clearly fit one of the existing category folders (propose a category or a new one, confirm).
- A Figma color, radius or type value maps to no existing token (spacing and icon sizes follow DESIGN.md instead).
- Figma introduces a variant axis/value or a prop with no existing equivalent.
- A state, interaction, or layer is unnamed/ambiguous in Figma.
- Reusing an existing variant name would change its current meaning (breaking change).
- A nested instance (e.g. an icon button inside a composed component) needs interaction states but Figma gives no source for what they should look like — propose a direction using existing library patterns rather than inventing one silently.
- **(Workflow B)** Unclear which existing `src/components/<category>/<component-name>/<component-name>.tsx` a Figma URL corresponds to.
- **(Workflow B)** A diffed value doesn't map to any existing token.
- **(Workflow B)** The diff implies a structural change (new variant axis, renamed prop, different element) rather than a value tweak — confirm before restructuring, since this workflow is meant for drift, not redesign.

<!-- Review this Figma screen against our design system docs and existing codebase.
Check if the component choices, token usage, states, and interaction patterns are aligned.
Do not suggest new components unless the existing system cannot support the design. -->
