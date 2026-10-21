# Design & Component Contracts

Durable, team-visible rules about *why* things are built the way they are. Without them, a future edit or a Figma/shadcn resync could silently break these decisions. This file is committed, so it travels with the repo and every contributor (human or AI) sees it. The skills in `.claude/skills/` read it before they start.

Add an entry when a fix or convention:

- took real iteration to land on and could plausibly be "fixed" back to a worse state by someone who doesn't know the history, or
- is a contract between two pieces of code (e.g. two rules that must change together) that isn't obvious from reading either one alone.

Each entry says what the rule is, why it exists, and how to apply it. Don't restate what the code already makes obvious. Name the file it governs in the heading when there is one.

---

## Design quality bar: internal tools and customer-facing products are equal

**Rule:** every product is designed to be intuitive, efficient and human. That bar applies equally to customer-facing experiences and internal or operational tools.

**Why:** it's easy to treat internal screens as lower priority because they have no external audience. This rule stops that assumption from quietly lowering the bar.

**How to apply:** don't reach for a lower-effort pattern (skipping states, motion or copy quality) because a screen is internal-only.

---

## Brand names

⚠️ **Decision needed:** set by `ucl-setup`. Define how each product or brand name is written (capitalization, spacing), the forms that are never correct, and which names must never be used interchangeably. Identifiers that aren't user-facing (the npm package, CSS/JS names) keep their lowercase forms.

---

## Brand voice

⚠️ **Decision needed:** not defined yet. The `ucl-ux-copywriter` skill reads this section. Until it's filled in, the skill falls back to general rules and says which assumptions it made. Define:

- **Audiences:** who reads the UI (e.g. builders creating apps, team admins, internal operators), and the tone for each.
- **Voice:** three to five words for how the product sounds, plus what it never sounds like.
- **Terminology:** the words the product uses for its core objects and states (e.g. "project", "workspace", "draft"), and words to avoid.

---

## Gaps, margins and padding match Figma's literal value

**Rule:** when a Figma spacing value (gap, margin, padding) doesn't exactly match an existing spacing token, use the literal value as an arbitrary Tailwind class (e.g. `gap-[2px]`). Don't round it to the nearest token-backed utility (`gap-2` = 8px) for the sake of "consistency" with another variant or a nearby value. Check every value against the exact Figma node, per variant and state.

**Why:** in a previous UCL, a card's two variants had a real, Figma-authored difference: one used a raw `2px` gap, the other an `8px` token. The `2px` was normalized to `8px` to "avoid a non-token literal". That looked reasonable, but it was wrong. It built and rendered plausibly, so nobody caught it until a pixel comparison against Figma.

**How to apply:**

- Pull the literal value from `get_design_context` or `get_variable_defs` for the **exact node**, not a similar sibling or a different variant.
- If it matches a token's value, use that token's utility.
- If it matches no token, use the arbitrary class. An honest raw value is correct; a token that's a few pixels off is not.
- If the same visual role has different values across variants, keep the difference. If it looks like a Figma slip, ask which value wins instead of picking one.
- Applies to every component and layout, on first build and on every resync.

---

## Icon sizes match Figma's defined instance size

**Rule:** when Figma defines an icon instance at a given size (e.g. 24×24), render it at that size. Don't measure a smaller shape nested inside the instance and conclude the "visible" size is smaller.

**Why:** in a previous UCL, a plus icon was defined at 24×24, but its inner vector measured 16×16 because of a 4px inset in the source asset. It shipped at `size-4` and had to be corrected back to `size-6`. The inset is how the asset was drawn, not an instruction to shrink it.

**How to apply:**

- Take the size from the instance node's own width/height (`get_metadata` / `get_design_context`), not from a child layer.
- If a nested shape seems to disagree with the instance size, ask. Don't substitute the smaller number.

---

## Composed components are black boxes to their parents

**Rule:** once a component is placed inside another component or a layout, the parent never modifies or reaches into its internals. No deep descendant selectors (`[&_svg]:size-12`) that also match elements inside a child component's own markup.

**Why:** in a previous UCL, a card's icon slot used `[&_svg]:size-12` to size a logo passed into it. When a component with its own internal icon went into that slot, the same selector reached two levels down and resized the child's icon too. It rendered something plausible, so nothing caught it short of a visual diff.

**How to apply:**

- Scope slot styling to **direct children only** (`[&>svg]`, `[&>img]`), never `[&_svg]`.
- If a child needs to look different in a given context, add a prop or variant to the child. Don't override it from the parent with CSS.
- Before reusing a slot for a new component, check that the slot's selectors are scoped to direct children.

ℹ️ `Button`'s own `[&_svg]` rules style the icons passed directly into it, which is the component styling its own content. Don't nest another component that renders its own SVG inside a `Button` without checking this.

---

## Breakpoints include their own width (`src/styles/theme.css`, `src/lib/breakpoints.ts`)

**Rule:** a breakpoint covers widths up to and including its frame width. The frames are:

| Name  | Frame width |
| ----- | ----------- |
| `sm`  | 640         |
| `md`  | 768         |
| `lg`  | 1024        |
| `xl`  | 1280        |
| `2xl` | 1536        |
| `2.5xl` | 1728      |
| `3xl` | 1920        |

So the lg frame at exactly 1024px gets the "lg and below" layout, and the next layout starts at 1025px.

**Why:** designs are reviewed at those exact frame widths, and each frame must show the layout designed for it. With Tailwind's default min-width breakpoints, a frame at exactly 1024px got the next layout up. Same convention as bethere-ucl and verita-ai.

**How to apply:**

- `theme.css` registers each Tailwind breakpoint 1px past its frame width (`--breakpoint-lg: 1025px`). `lg:` means above 1024 and `max-lg:` means 1024 and below. Write the usual `lg:`/`xl:` classes, never an arbitrary `min-[1025px]:`.
- `2.5xl` (1728, custom, halfway between `2xl` and `3xl`) is registered as `--breakpoint-2\.5xl`. The dot has to be escaped, because Tailwind turns `--breakpoint-2_5xl` into `max-2.5xl:` only, with no `2.5xl:`.
- JS media queries use `mediaAbove("lg")` from `@/lib/breakpoints` with `useMediaQuery` from `@/lib/hooks/use-media-query`, never a hand-written `(min-width: …)`.
- Keep `theme.css` and `src/lib/breakpoints.ts` in sync when a breakpoint changes.
- Describe breakpoints as "at `lg` (1024) and below" / "above `lg`", not "below `lg`" / "from `lg`".

⚠️ **Constraint:** `theme.css` ships to consumers, so the apps' own `sm:`–`3xl:` classes follow these boundaries too.

---

## Row removal motion: fade out, then the rows below glide up (`src/lib/motion/variants.ts`)

**Rule:** when a row leaves a table or list because its data was removed, it doesn't just vanish. It fades out on `exitTransition` (160ms), then the rows below move up into its space on `layoutSpring`. Use `rowRemoveVariants` with the wiring below, not a one-off animation.

```tsx
const MotionTableRow = motion.create(TableRow);
const { resolve } = useMotionPreference();

<TableBody>
	<AnimatePresence initial={false}>
		{rows.map((row) => (
			<MotionTableRow
				key={row.id}
				layout='position'
				variants={rowRemoveVariants}
				initial='initial'
				animate='animate'
				exit='exit'
				transition={{ layout: resolve(layoutSpring) }}
			>
				…
			</MotionTableRow>
		))}
	</AnimatePresence>
</TableBody>;
```

**Behavior:**

- **Opacity only.** No `y` nudge, because a `<tr>` moving down overlaps the next row's border.
- **No entrance.** `initial` equals `animate` and `AnimatePresence` has `initial={false}`, so rows on first render or added by a data update just appear.
- **Sequenced.** The row finishes fading before the gap closes. That's `AnimatePresence`'s default `"sync"` mode.
- **Reduced motion:** `resolve(layoutSpring)` closes the gap at once. The fade stays, so the removal is still visible.
- **Search/filter changes** use the same motion.

⚠️ **Constraint:** never `mode="popLayout"` on table rows. It pulls the exiting row out with `position: absolute`, and a `<tr>` loses its table layout: its cells collapse while it fades.

⚠️ **Constraint:** keys are the record id, never the array index, or the wrong row fades out.

---

---

## Every clickable element shows the pointer cursor (`src/styles/theme.css`)

**Rule:** anything clickable shows `cursor: pointer` on hover, and disabled controls show `cursor: not-allowed`. One global `@layer base` rule at the end of `theme.css` enforces it, not each component. Don't add `cursor-pointer` to a component.

The rule matches real interactive elements and roles: `button`, `a[href]`, `label[for]`, `summary`, `select`, the clickable `input` types, `[role="button"]`, and the roles Radix renders (`checkbox`, `radio`, `switch`, `tab`, `option`, `menuitem`, `menuitemcheckbox`, `menuitemradio`). Roles are skipped when `aria-disabled="true"` or `data-disabled` is set.

**Why:** Tailwind 4's preflight sets `cursor: default` on `<button>`, a change from v3's `pointer`. Left alone, every control showed the arrow unless someone remembered `cursor-pointer`. Same rule as archie-ucl and bethere-ucl.

**How to apply:**

- A new component built on a real interactive element or role gets the cursor for free.
- A custom clickable element (a `div` acting as a button) needs `role="button"`, plus `aria-disabled="true"` when disabled.
- A new interactive role that isn't covered: extend the selector list in `theme.css` and this section together. Never patch the one component.
- A component that needs a different cursor (`cursor-text`, `cursor-grab`) sets it with a utility. Utilities win over `@layer base`.

⚠️ **Constraint:** `theme.css` ships to consumers, so the apps' own buttons, links and controls get the pointer cursor too.

---

## Forms, Overlays and Typography come from archie-ucl (`src/components/{forms,overlays,typography}`)

**Rule:** these components were ported from archie-ucl on Oct 20, 2026. archie-ucl builds from the same archielabs.ds file in its Archie modes, so component structure and Figma bindings are shared, and only mode values differ. Those come from `theme.css`, never from a hard-coded value in the component.

**Why:** two libraries built from one Figma file should only differ where the modes differ. Porting the components, then re-pointing their tokens, keeps fixes portable both ways.

**How to apply:**

- When archie-ucl fixes one of these components, bring the fix here, and check whether the token it uses has a different value in `intercept` mode.
- When a component binds a Figma variable whose value differs by mode, add a token for it. It never hard-codes the Archie value. Done so far: `radius/input` → `rounded-input` (10px, Archie 8px) in Input and Textarea, and `radius/menu/container` → `rounded-menu` (16px, Archie 6px) in Tooltip.
- archie-ucl's DESIGN.md has the full Figma history for each component: Input "how Figma's Textfield maps to tokens", "Checkbox, Radio Group and Switch", "Tooltip".

---

## Input and Textarea: how Figma's Textfield maps to tokens (`src/components/forms/input/input.tsx`)

**Rule:** `Input` follows Figma's "Input" set (archielabs.ds, node `61:133`), Type=Textfield. Every state is a straight copy of its Figma bindings:

| State | Border | Fill | Text |
| --- | --- | --- | --- |
| Default / HasValue | `input` | `background`, `shadow-xs` | `foreground`, placeholder `muted-foreground` |
| Hover | `input-ring` (`input/ring`: gray-400), lighter than Focus | | |
| Focus | `ring` + 3px `ring-outside` halo, no shadow | | |
| Error (`aria-invalid`) | `destructive` | `destructive-subtle` | `destructive` |
| Read-only | `input-disabled` | `background-subtle`, no shadow | `foreground` |
| Disabled | `input-disabled` | `background-subtle`, no shadow | `foreground-subtle` |

- **Sizes:** Figma `lg · 36` → `size="default"` (`h-9`), `xl · 40` → `size="lg"` (`h-10`), mirroring Button's names.
- **Radius:** `rounded-input`, Figma `radius/input` (10px in intercept mode).
- **Font size:** `text-base md:text-sm`. Figma draws 14px, used above `md`. Below it, 16px stops iOS Safari from zooming into a focused field.
- **Textarea** copies Input's state classes. Keep the two in sync. Its `size` is a minimum height, and `field-sizing-content` grows it.

⚠️ **Accessibility (light mode):** the placeholder is `muted-foreground` (`foreground/muted`, gray-400), 2.6:1 on white, under 4.5:1. The Default border (`input/border`, gray-200) is 1.3:1, under WCAG's 3:1 for a control's boundary; archie-ucl's Archie mode has the same border. The Error text (destructive-500 on destructive-50) passes at 4.84:1. UCL mirrors Figma. ⚠️ **Decision needed (designer):** see "Intercept mode values that look like Figma slips" in the token map. In dark mode all three pass: placeholder 7.18:1, border (gray-500) 3.7:1, error 5.22:1.

---

## Checkbox, Radio Group and Switch (`src/components/forms/{checkbox,radio-group,switch}`)

**Rule:** the three controls follow Figma's "Checkbox" (`662:123`), "Radio Button" (`662:157`) and "Switch" (`295:2020`) sets:

- **Colors:** checkbox and radio have a `foreground` border on `background` with `shadow-xs`; selected, they fill with `neutral` and a `neutral-foreground` mark. The switch is `neutral` when on and `input` when off, with a `background` thumb. Disabled uses `foreground-subtle` and `shadow-sm`; selected + disabled isn't drawn, so it fades to 50%.
- **Focus and error aren't in Figma.** Focus uses Button's ring (`ring-2 ring-ring ring-offset-2`). Error uses Input's `destructive` border.
- **Option labels:** an option label is regular weight and turns `muted-foreground` when its control is disabled; a field label is medium weight. `Label` tells them apart with `peer`: the control comes first and carries `peer` plus its `data-slot`. Keep the `peer-data-[slot=…]` rules in `label.tsx` in sync when adding a control.
- **Whole-pixel sizes for Figma's scaled drawings:** the small Switch is 28 × 16 with a 12px thumb (Figma 0.8× scale), and the radio dot is 10px (Figma 10.2px). These are scaling artifacts, so the literal-spacing rule doesn't apply.

---

## Tooltip: no arrow, motion from the trigger (`src/components/overlays/tooltip/tooltip.tsx`)

**Rule:** Tooltip follows Figma's "Tooltip" (Feedback page, node `1172:2290`) on shadcn's structure, with three differences:

- **No arrow:** Figma draws none, so `sideOffset` defaults to 4px. ⚠️ **Decision needed:** Figma doesn't specify the gap; 4px is a placeholder.
- **Motion from `src/lib/motion`:** the surface fades in and moves `motionDistance.subtle` from the trigger's side with `enterTransition`. Reduced motion keeps only the fade. Radix unmounts it on close, so the exit is instant.
- **Sizes:** Figma Medium → `size="default"` (`sm/sm`, 6 × 14 padding), Small → `size="sm"` (`xs/xs`, 4 × 8). Colors are `foreground` / `background`, so in intercept mode it's a dark (gray-800) tooltip on the white page. Radius is `rounded-menu` (`radius/menu/container`, 16px in intercept mode).

**How to apply:** wrap the app once in `TooltipProvider`. Put interactive triggers in `TooltipTrigger asChild`. The tooltip becomes the trigger's accessible description, so it says what the control does, not repeat its label.

---

## Typography specs live in three places (`typography.tsx`, `typography.mdx`, `foundations/typography.mdx`)

**Rule:** the full typography spec (fonts, every size with its line height, the weights, heading defaults, page title, the color rule) is written out in the spec comment at the top of `src/components/typography/typography/typography.tsx`, on Storybook "Typography/Typography" (`typography.mdx`), and on "Foundations/Typography", whose tables are generated from `theme.css`. Any change to a type token (`--text-*`, `--font-weight-*`, `--font-*`) or to `typographyHeadings` updates all three in the same change.

**Why:** a value changed in `theme.css` alone leaves the hand-written tables in the other two quietly wrong. The Foundations tables regenerate on their own; the component's comment and MDX tables don't.

---

## Heading element → Typography pairing (`src/components/typography/typography/typography.tsx`)

**Rule:** `Typography` with `as="h1"`–`"h4"` and no `size`/`weight` renders these defaults (`typographyHeadings`):

| Element | `size` / `weight` | Figma text style | Metrics | Source |
| --- | --- | --- | --- | --- |
| `h1` | `2xl` / `semibold` | `2xl/2xl -semibold` | 24/32 | Figma description "h1 / Modal Title" |
| `h2` | `xl` / `semibold` | `xl/xl -semibold` | 20/30 | Figma description "h2" |
| `h3` | `lg` / `semibold` | `lg/lg -semibold` | 18/28 | Figma description "h3" |
| `h4` | `base` / `semibold` | `base/base -semibold` | 16/24 | Figma description "h4" |

A **page title** is Figma's `3xl/3xl -bold` ("Page Title"). It's still the page's `h1`: write `<Typography as="h1" size="3xl" weight="bold">`. A modal title uses the plain `h1` default.

**Why:** the Figma text style descriptions are the source. Without set defaults, every heading picks a plausible size by eye. ✅ **Resolved in Figma (Oct 20, 2026):** the designer tagged all four levels, at semibold. They had been a product decision at bold (only `h1` was tagged, as `2xl/2xl -bold`), so the sync moved every default from bold to semibold. The page title stays bold.

**How to apply:**

- Write `<Typography as="h2">` and let the default apply. Pass `size`/`weight` only when a specific Figma frame binds something else; that value wins for that instance.
- Pick the element for meaning (heading level), not for looks.
- On each sync, read the text style descriptions: a moved tag moves the default here, in `typography.tsx`, `typography.mdx` and Foundations/Typography together ("Typography specs live in three places").

ℹ️ Sizes up to `xl` use `font-sans` and `2xl` and up use `font-display`, because the Figma text styles bind `font-family/bodytext` and `/headline` that way. Both are Figtree in intercept mode. There's no letter spacing at any size.

---

## Figma → theme.css token map (`src/styles/theme.css`)

**Rule:** `theme.css` mirrors the `semantic` collection of archielabs.ds: the `intercept` mode in `:root, .dark` and `intercept-dark` in `.dark`. Primitives come from the `primitives` collection. The mapping is the same as archie-ucl's, so the two libraries share token names. A resync keeps these decisions, not "fixing" them back to shadcn defaults or to a literal Figma name.

**Why:** the Figma file uses a tone system (`tone/<tone>/<step>`, surfaces with `subtle`/`muted`/`defined`), not shadcn's role names. Several shadcn roles have no Figma variable of their own. They map to the variable the matching Figma component binds, which is invisible from either file alone.

**How to apply:**

- Naming: drop `colors/`, join the path with `-`, and drop the repeated last segment (`colors/tone/brand/brand` → `--brand`, `colors/card/subtle` → `--card-subtle`). `on-<tone>` becomes `--<tone>-foreground`.
- Diff every mapped variable on each sync against the resolved `theme.css` value. The first sync (Oct 20, 2026) took 127 semantic variables in intercept mode and 68 primitive colors (57 of them match archie-ucl's exactly; indigo is new).
- **Second sync (Oct 20, 2026):** intercept mode had been redesigned as a light theme. 199 values checked (90 semantic tokens, 68 primitives, 35 type, radius and font values, 6 shadows): 72 semantic colors and the 3 shadow colors drifted, and the type, radius and font tokens matched. The brand moved from indigo to `catalina` (catalina-800), the accent tone to `elf` and emphasis to `corn`; indigo is no longer referenced and was removed. A re-run after the update found 0 drift.
- **intercept-dark (Oct 20, 2026):** created from UCL (see "intercept-dark mode" below) and synced into `.dark`. All 90 mapped tokens checked against the new mode: 0 drift.
- ℹ️ False alarms to skip on the next sync: `success-500`, `elf-500`, `elf-600` and `corn-400` (and the tokens that alias them, `tone-accent` and `emphasis`) differ by 1–3 in one 8-bit channel when `theme.css`'s oklch is converted back to RGB. Figma's exact 8-bit values convert to the same oklch strings that `theme.css` has; it's 3-decimal rounding on saturated colors.
- ℹ️ `states/highlight` and `sidebar/active` use Figma's alias-with-opacity format (`{ color: alias, opacity }`): catalina-100 at 15% and catalina-50 at 20%. A resolver that only follows `VARIABLE_ALIAS` reads them as unresolved; resolve `value.color`, then apply `opacity`.

### Mapping decisions

| CSS token | Figma variable | Why |
| --- | --- | --- |
| `--primary` / `-foreground` | `tone/brand/brand` / `tone/brand/on-brand` | Button Solid · Brand |
| `--secondary` / `-foreground` | `tone/brand/subtle` / `tone/brand/brand` | Button Flat · Brand |
| `--accent` / `-foreground` | `states/hover` / `foreground/foreground` | shadcn `accent` is the hover surface |
| `--destructive-foreground` | `tone/brand/on-brand` | There's no `on-destructive` |
| `--muted` / `-foreground` | `background/muted` / `foreground/muted` | |
| `--input` | `input/border` | |
| `--ring` | `input/ring-focus` | Focus ring. `input/ring` → `--input-ring` (hover) |
| `--card-foreground`, `--popover-foreground` | `foreground/foreground` | No Figma variable of their own |
| `--tone-accent*` | `tone/accent/*` | Prefixed: Figma's "accent" tone is not shadcn's `--accent` |
| `--veil`, `--veil-soft` | `base/opacity-veil`, `base/opacity-soft` | |
| `--shadow-color-sm/md/lg` | `shadow/sm/md/lg` | Colors for the `shadow-*` scale, which mirrors the effect styles |
| `--radius`, `--radius-input`, `--radius-menu` | `radius/default`, `radius/input`, `radius/menu/container` | Only the component radii a built component uses |

### Deliberately not mirrored

- **Primitives as utilities:** only the palettes intercept mode references (gray, catalina, elf, corn, info, success, warning, destructive) are declared, as `:root` variables, not as Tailwind colors.
- **Font weights:** `font-weight/*` in intercept mode are 300–900, Tailwind's defaults, so they aren't redefined.
- **Not synced yet:** `code/*`, `decorative/decorative-1`, `linear-1A/1B`, the `components` collection, the other `radius/*` component radii (button 10px, card 12px, badge and chip full), the `Sonner` effect style, `paragraph-gap/*` and `breakpoint/width|height`. Add each with the component that needs it.

### Intercept mode values that look like Figma slips

⚠️ **Decision needed (designer):** mirrored as Figma has them:

- **`foreground/muted` and `/subtle` look swapped:** muted is gray-400 and subtle gray-500. The Archie modes have the reverse. ⚠️ **Accessibility:** gray-400 is 2.6:1 on white, so every `text-muted-foreground` (descriptions, helper text, placeholders) fails 4.5:1. gray-500 would pass at 5.05:1.
- **Dark steps on a light theme:** `tone/info/subtle` and `/muted` are info-800 and -700, and `tone/warning/subtle` and `/muted` are warning-800 and -900. Every other tone uses its 50 and 100 steps, as the Archie mode does for info and warning.
- ⚠️ **Accessibility:** `input/border` (gray-200) is 1.3:1 on white, under 3:1 for a control's boundary. It also colors the Switch's off track. Same value as Archie mode.
- ✅ **Resolved in Figma:** the earlier slips are gone. Emphasis is set (corn), success, disabled and sidebar-hover now suit a light theme, `icon/brand` is the brand color, and all three button labels pass (primary 13.3:1, secondary 11.88:1, destructive 5.78:1).

### Storybook chrome (`.storybook/theme.ts`)

Storybook's own theme (sidebar, docs pages) takes hex values, not CSS variables. `.storybook/theme.ts` copies the intercept values of `--background`, `--background-subtle`, `--foreground`, `--foreground-subtle`, `--border`, `--input`, `--brand` and `--link`. Change them together. The toolbar's Theme switch previews stories in `intercept-dark`; the Storybook chrome stays light.

---

## intercept-dark mode (Figma `semantic` collection, `.dark` in `src/styles/theme.css`)

**Rule:** `intercept-dark` was created from UCL on Oct 20, 2026, at the user's request, in the shared archielabs.ds file. It follows Archie-dark's structure for neutrals and surfaces, recolors the tones with Intercept's palettes, and copies every non-color variable (radius, font, weight, breakpoint) from `intercept`. Every color aliases a primitive, except where the other modes use raw values too (charts, code, gradients, veils, shadows, highlight).

| Role | intercept-dark | Contrast |
| --- | --- | --- |
| Page / text / muted text | gray-950 / gray-200 / gray-400 | 14.41 / 7.18 |
| Surfaces | `subtle` gray-900, `muted` gray-800, `defined` gray-700; card gray-900, popover gray-800 | |
| Brand (primary button) | catalina-400 with a gray-950 label (`on-brand`) | 5.64, fill 5.64 on the page |
| Secondary button | catalina-400 on catalina-900 | 4.74 |
| Destructive button / error text | destructive-300 with gray-950 label / on destructive-950 | 5.3 / 5.22 |
| Input border / focus ring | gray-500 / catalina-300 | 3.7 / 8.75 |
| Accent (elf), emphasis (corn), neutral | elf-400, corn-400, gray-200, each with gray-950 text; `subtle` 950, `muted` 900, `defined` 700 | 8.38 / 10.85 / 14.41 |
| Info, success, warning | info-400, success-500, warning-400; `subtle` 950, `muted` 900 | 4.94 / 6.4 / 7.6 |

**Why:** Intercept's light brand (catalina-800) is too dark to see on a dark page, so the dark brand steps up to catalina-400 with a dark label, as Archie-dark does with `on-brand` gray-950. Archie-dark's slips were not copied: `active-alt` is gray-800 (not white), `icon/brand` is the brand color, and every tone's `subtle` → `muted` → `defined` gets lighter in the same direction.

**How to apply:**

- ⚠️ **Decision needed (designer):** review the mode in Figma. These are UCL's proposal, not a designer's. When the designer changes a value, run `ucl-ds-sync`; Figma wins.
- `states/highlight` and `sidebar/active` are raw catalina-400 at 15% and 20%. The Plugin API can't write Figma's alias-with-opacity format, which the light mode uses.
- A new semantic variable needs an `intercept-dark` value in Figma and, if it differs from light, a line in `.dark`.

---

## Semantic tokens are declared on `:root, .dark` (`src/styles/theme.css`)

**Rule:** the intercept (light) semantic block uses the selector `:root, .dark`, not just `:root`. The `.dark` block after it overrides only the values that differ.

**Why:** many tokens are aliases, such as `--primary: var(--brand)`. A custom property's `var()` resolves on the element that declares it, and descendants inherit the result. If the aliases were declared only on `:root` and `.dark` were applied to a wrapper below `<html>` (a Storybook preview, a dark section, the Colors page's dark column), `--primary` would keep the light brand inside it. Redeclaring the aliases on `.dark` makes them resolve against the dark values there. Same rule as archie-ucl.

**How to apply:** add new semantic tokens to the `:root, .dark` block. Add them to `.dark` too only when the dark value differs. Keep `.dark` after the shared block, because both selectors have the same specificity. Primitives stay in plain `:root`.
