# Design & Component Contracts

Durable, team-visible rules about *why* things are built the way they are. Without them, a future edit or a Figma/shadcn resync could silently break these decisions. This file is committed, so it travels with the repo and every contributor (human or AI) sees it. The skills in `.claude/skills/` read it before they start.

Add an entry when a fix or convention:

- took real iteration to land on and could plausibly be "fixed" back to a worse state by someone who doesn't know the history, or
- is a contract between two pieces of code (e.g. two rules that must change together) that isn't obvious from reading either one alone, or
- settles a discrepancy between Figma and the code, or leaves one pending (CLAUDE.md → "Figma workflow").

Each entry says what the rule is, why it exists, and how to apply it. Don't restate what the code already makes obvious. Name the file it governs in the heading when there is one.

---

## Design quality bar: internal tools and customer-facing products are equal

**Rule:** every product is designed to be intuitive, efficient and human. That bar applies equally to customer-facing experiences and internal or operational tools.

**Why:** it's easy to treat internal screens as lower priority because they have no external audience. This rule stops that assumption from quietly lowering the bar.

**How to apply:** don't reach for a lower-effort pattern (skipping states, motion or copy quality) because a screen is internal-only.

---

## Brand names

- **Intercept Live** (Oct 27, 2026, from the product owner): the product's name, two capitalized words. Use the full name in UI copy that names the product, e.g. the Sidebar's **Ask Intercept Live** and the chat panel's heading. "Intercept" alone is the company (Intercept Telehealth), not the product. ⚠️ **Gap:** the name is still subject to brand review (prds/glossary.md "Intercept Live").
- ⚠️ **Decision needed:** the rest is set by `ucl-setup`: how each other name is written, the forms that are never correct, and which names must never be used interchangeably. Identifiers that aren't user-facing (the npm package, CSS/JS names) keep their lowercase forms.

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

**Rule:** everything clickable shows `cursor: pointer` on hover, with no exceptions unless one is recorded below, and disabled controls show `cursor: not-allowed`. Restated by the product owner on Oct 26, 2026. One global `@layer base` rule at the end of `theme.css` enforces it, not each component. Don't add `cursor-pointer` to a component.

The rule matches real interactive elements and roles: `button`, `a[href]`, `label[for]`, `summary`, `select`, the clickable `input` types, `[role="button"]`, and the roles Radix renders (`checkbox`, `radio`, `switch`, `tab`, `option`, `menuitem`, `menuitemcheckbox`, `menuitemradio`). Roles are skipped when `aria-disabled="true"` or `data-disabled` is set.

**Why:** Tailwind 4's preflight sets `cursor: default` on `<button>`, a change from v3's `pointer`. Left alone, every control showed the arrow unless someone remembered `cursor-pointer`. Same rule as archie-ucl and bethere-ucl.

**How to apply:**

- A new component built on a real interactive element or role gets the cursor for free.
- A custom clickable element (a `div` acting as a button) needs `role="button"`, plus `aria-disabled="true"` when disabled.
- A new interactive role that isn't covered: extend the selector list in `theme.css` and this section together. Never patch the one component.
- A component that needs a different cursor (`cursor-text`, `cursor-grab`) sets it with a utility. Utilities win over `@layer base`, so a stray cursor utility silently beats the rule. Record every such exception here.
- **Porting from shadcn:** shadcn's sources put `cursor-default` on clickable parts (Select items, menu items, command items). Strip it when porting; the global rule gives them the pointer. ✅ **Resolved (Oct 26, 2026):** removed from SelectItem (options showed the arrow).
- **Check:** after adding a clickable element, hover it in Storybook, or read `getComputedStyle(el).cursor`. Click targets that aren't the element itself (PatientCard's stretched `::after` link) inherit the pointer from their element.

**Exceptions:**

- **Sidebar rail's empty space** (`sidebar-rail-toggle`): `e-resize` collapsed / `w-resize` expanded, hinting that a click expands or collapses the rail (from bethere-ucl). ⚠️ **Decision needed:** keep the resize hint or switch it to `pointer` like everything else.
- **Select scroll buttons** keep `cursor-default`: they scroll on hover and take no click.

**Audit (Oct 26, 2026):** Census: Sidebar items, AppHeader pills, hospital tabs, My Patients switch and label, quick-view chips, Select triggers and options, Filters, the PatientCard body (stretched link) and its "…" button all show `pointer`.

⚠️ **Constraint:** `theme.css` ships to consumers, so the apps' own buttons, links and controls get the pointer cursor too.

---

## Text rendering: antialiased, kerned, no faux styles (`src/styles/theme.css`)

**Rule:** one global `@layer base` rule on `html` at the end of `theme.css` sets how every app renders text. Added Oct 25, 2026.

| Property | Value | Effect |
| --- | --- | --- |
| `-webkit-font-smoothing` / `-moz-osx-font-smoothing` | `antialiased` / `grayscale` | macOS only (Chrome, Safari, Firefox): thinner, crisper text than the platform's heavier default smoothing. Same as Tailwind's `antialiased`. No effect on Windows or Linux |
| `font-kerning` | `normal` | The font's kerning at every size, not only where the browser decides |
| `font-synthesis` | `none` | The browser never fakes bold or italic. A weight an app didn't load falls back to a loaded weight instead of a blurry smeared one |
| `-webkit-text-size-adjust` / `text-size-adjust` | `100%` | iOS doesn't enlarge text after rotation |

**Why:** browser defaults rendered Figtree heavier on macOS than Figma draws it, and a missing webfont weight would show as faux bold. UCL declares the fonts but doesn't load them (CLAUDE.md "Consumer Integration"), so `font-synthesis: none` protects apps that load fewer weights than the components use.

**How to apply:**

- Don't add `antialiased` or these properties to a component. The global rule covers it.
- `text-rendering: optimizeLegibility` is deliberately not set globally: modern browsers already kern and apply ligatures, and on long pages it can slow rendering. Use it per element only if a specific heading needs it.
- Apps load Figtree's full weight range (300–900, as the README's `<link>` and `.storybook/preview-head.html` do), since Typography goes up to `black` (900). A weight that isn't loaded falls back to the nearest loaded one.
- Digits that line up in columns use `tabular-nums` per element. That's a typographic choice, not part of this rule.

⚠️ **Constraint:** `theme.css` ships to consumers, so every app's text renders this way, including text outside UCL components. `antialiased` makes text look slightly lighter on macOS: compare it with Figma before changing font weights to make up for it.

---

## Forms, Overlays and Typography come from archie-ucl (`src/components/{forms,overlays,typography}`)

**Rule:** these components were ported from archie-ucl on Oct 20, 2026. archie-ucl builds from the same archielabs.ds file in its Archie modes, so component structure and Figma bindings are shared, and only mode values differ. Those come from `theme.css`, never from a hard-coded value in the component.

ℹ️ Since Oct 21, 2026 the form controls' source is their copy in intercept.ds (CLAUDE.md "Figma"): Input `1018:8360` (Textfield and Textarea), Checkbox `1018:9305`, Radio Button `1018:9320`, Switch `1018:9286`. The copies were checked against the built components on that date and match, state by state. Tooltip and Typography still point at archielabs.ds.

**Why:** two libraries built from one Figma file should only differ where the modes differ. Porting the components, then re-pointing their tokens, keeps fixes portable both ways.

**How to apply:**

- When archie-ucl fixes one of these components, bring the fix here, and check whether the token it uses has a different value in `intercept` mode.
- When a component binds a Figma variable whose value differs by mode, add a token for it. It never hard-codes the Archie value. Done so far: `radius/input` → `rounded-input` (10px, Archie 8px) in Input and Textarea, and `radius/menu/container` → `rounded-menu` (16px, Archie 6px) in Tooltip.
- archie-ucl's DESIGN.md has the full Figma history for each component: Input "how Figma's Textfield maps to tokens", "Checkbox, Radio Group and Switch", "Tooltip".

---

## Input and Textarea: how Figma's Textfield maps to tokens (`src/components/forms/input/input.tsx`)

**Rule:** `Input` follows Figma's "Input" set (intercept.ds, node `1018:8360`; archielabs.ds `61:133` before Oct 21, 2026), Type=Textfield. Every state is a straight copy of its Figma bindings:

| State | Border | Fill | Text |
| --- | --- | --- | --- |
| Default / HasValue | `input` | `background`, `shadow-xs` | `foreground`, placeholder `foreground-subtle` |
| Hover | `input-ring` (`input/ring`: gray-400), lighter than Focus | | |
| Focus | `ring` + 3px `ring-outside` halo, no shadow | | |
| Error (`aria-invalid`) | `destructive` | `destructive-subtle` | `destructive` |
| Read-only | `input-disabled` | `background-subtle`, no shadow | `foreground` |
| Disabled | `input-disabled` | `background-subtle`, no shadow | `muted-foreground` |

- **Sizes:** `size="md"` (`h-9`, 36px, default) and `size="lg"` (`h-10`, 40px), the control size scale (SIZE-SCALE.md). Figma drew them as `lg · 36` and `xl · 40` before adopting the same names.
- **Radius:** `rounded-input`, Figma `radius/input` (10px in intercept mode).
- **Font size:** `text-base md:text-sm`. Figma draws 14px, used above `md`. Below it, 16px stops iOS Safari from zooming into a focused field.
- **Textarea** copies Input's state classes. Keep the two in sync. Its `size` is a minimum height, and `field-sizing-content` grows it. Figma's extra 3px right and bottom insets only place its drawn resize grip; the browser draws its own, so the padding is `py-2 px-3`.

⚠️ **Accessibility (light mode):** the placeholder is `foreground-subtle` (`foreground/subtle`, gray-400), 2.6:1 on white, under 4.5:1. The Default border (`input/border`, gray-200) is 1.3:1, under WCAG's 3:1 for a control's boundary; archie-ucl's Archie mode has the same border. The Error text (destructive-500 on destructive-50) passes at 4.84:1. UCL mirrors Figma. ⚠️ **Decision needed (designer):** see "Intercept mode values that look like Figma slips" in the token map. In dark mode all three pass: placeholder 7.18:1, border (gray-500) 3.7:1, error 5.22:1.

---

## Checkbox, Radio Group and Switch (`src/components/forms/{checkbox,radio-group,switch}`)

**Rule:** the three controls follow Figma's "Checkbox" (intercept.ds `1018:9305`), "Radio Button" (`1018:9320`) and "Switch" (`1018:9286`) sets (archielabs.ds `662:123`, `662:157` and `295:2020` before Oct 21, 2026):

- **Colors:** checkbox and radio have a `foreground` border on `background` with `shadow-xs`; selected, they fill with `neutral` and a `neutral-foreground` mark. The switch is `neutral` when on and `input` when off, with a `background` thumb. Disabled uses `muted-foreground` and `shadow-sm`; selected + disabled isn't drawn, so it fades to 50%.
- **Focus and error aren't in Figma.** Focus uses Button's ring (`ring-2 ring-ring ring-offset-2`). Error uses Input's `destructive` border.
- **Option labels:** an option label is regular weight and turns `foreground-subtle` when its control is disabled; a field label is medium weight. `Label` tells them apart with `peer`: the control comes first and carries `peer` plus its `data-slot`. Keep the `peer-data-[slot=…]` rules in `label.tsx` in sync when adding a control.
- **Switch label (intercept.ds `1018:9286` resync, Oct 26, 2026):** the set now carries its own label (Show Label Left / Right), so Switch has `label` and `labelSide`. Medium (500) weight, 16/24 at Default and 14/20 at Small, 8px from the track; `foreground/muted` while off and `foreground` while on (it reads the state through the wrapper with `has-`, so it works on either side, controlled or not), cross-fading over 160ms. ✅ **Resolved:** Label used to force a label after a switch to regular weight (`peer-data-[slot=switch]:font-normal`, from archie-ucl), which made the Census's "My Patients" 400 instead of Figma's 500. That rule is gone; labels after a checkbox or radio stay regular.
- **Whole-pixel sizes for Figma's scaled drawings:** the small Switch is 28 × 16 with a 12px thumb (Figma 0.8× scale), and the radio dot is 10px (Figma 10.2px). These are scaling artifacts, so the literal-spacing rule doesn't apply.

---

## Tooltip: no arrow, motion from the trigger (`src/components/overlays/tooltip/tooltip.tsx`)

**Rule:** Tooltip follows Figma's "Tooltip" (Feedback page, node `1172:2290`) on shadcn's structure, with three differences:

- **No arrow:** Figma draws none, so `sideOffset` defaults to 4px. ⚠️ **Decision needed:** Figma doesn't specify the gap; 4px is a placeholder.
- **Motion from `src/lib/motion`:** the surface fades in and moves `motionDistance.subtle` from the trigger's side with `enterTransition`. Reduced motion keeps only the fade. Radix unmounts it on close, so the exit is instant.
- **Sizes:** Figma Medium → `size="default"` (`sm/sm`, 6 × 14 padding), Small → `size="sm"` (`xs/xs`, 4 × 8). Colors are `foreground` / `background`, so in intercept mode it's a dark (gray-800) tooltip on the white page. Radius is `rounded-menu` (`radius/menu/container`, 16px in intercept mode).

**How to apply:** wrap the app once in `TooltipProvider`. Put interactive triggers in `TooltipTrigger asChild`. The tooltip becomes the trigger's accessible description, so it says what the control does, not repeat its label.

---

## Sidebar: intercept.ds look, bethere-ucl behavior (`src/components/navigation/sidebar/sidebar.tsx`)

**Rule:** the Sidebar, SidebarMenuButton, SidebarTooltip and Logo follow intercept.ds (nodes `1001:544`, `1001:501`, `1003:1512`) for layout and tokens, and bethere-ucl's Sidebar for behavior and motion. Built Oct 21, 2026.

- **Behavior (from bethere-ucl):** the width animates 280 ↔ 64px on `enterTransition` (72px before the Oct 25, 2026 resync). Clicking the rail's empty space toggles it. Hovering the collapsed rail swaps the mark for an expand icon (`iconSwapVariants`). Collapsed items show their label in a SidebarTooltip, which glides 8px out from the trigger. The wordmark goes to the first item. Collapsed state and active item work controlled or uncontrolled.
- **Label color is `foreground`.** ✅ **Resolved (Oct 26, 2026 sync):** archielabs.ds's `foreground/foreground` is now gray-700 (#31373f), the same as intercept.ds, so the earlier gray-800 vs gray-700 split is gone. Before: intercept.ds `colors/foreground/foreground` is gray-700, but archielabs.ds (the token source) is gray-800. `theme.css` wins. The tooltip fill is `foreground` for the same reason. Every other bound value matches `theme.css`: `states/active` → `bg-active`, `icon/foreground` → `text-icon`, `input/border` → `bg-input`, `sidebar/background` → `bg-sidebar`.
- **SidebarTooltip is light (Oct 26, 2026 resync, `1003:1512`):** the bubble is `bg-background` with `text-foreground` and effect style `shadow-xl` (0 8px 10px −6px + 0 6px 17px, `shadow/md`), replacing the dark `foreground` / `on-foreground` bubble with `shadow-card`. It's a 16 × 8px pill. ✅ **Resolved (second resync, Oct 26, 2026):** a 1px `border` stroke and a 16px medium label on a 20px line (was 14px, no stroke): 73 × 38px for "Label", as in Figma. In dark mode the tokens invert it to a dark bubble with light text. ℹ️ Tooltip (`overlays/tooltip`) is still dark; the two now differ on purpose.
- **States (Figma, Oct 21, 2026):** Default has a `muted-foreground` label and `icon-muted` icon (both gray-500). Hover adds the `bg-active` fill, and the label and icon go to `foreground` and `icon`. Active has no fill, a `foreground` label at semibold weight, and the item's `activeIcon` (a solid icon from archielabs.ds, `src/components/icons/`) in `icon`. Labels are sm (14px on a 20px line) since the second Oct 25 resync (base 16/24 before); Active is semibold. Figma binds the Hover label to `icon/foreground`; UCL uses `foreground` so Hover and Active labels match. The suffix is sm regular in `muted-foreground` (Figma `colors/foreground/muted`, gray-500; it was `foreground-subtle`, gray-400, before).
- **Rows hug their content** (Figma, second Oct 25, 2026 resync): 32px tall (6px vertical padding around the 20px label line), 8px horizontal padding, 10px apart in the nav and 12px in the footer. Collapsed, they're 32px squares in a 36px column, footer included.
- **Icons are 18px** (Figma, second Oct 25, 2026 resync; 20px before), in every state and in both rail modes.
- **Resync, Oct 25, 2026** (intercept.ds `sidebar` `1001:544`: New Default `1001:545`, New Collapsed `1001:610`): Figma's nav set is now Search, Ask Intercept / Surveillance, Alert Queue, Messages, Virtual Sepsis / Census, Marketplace, Administration / Compliance, Analytics. The stories follow it. Discrepancies, `sidebar.tsx` and `sidebar.stories.tsx`:
  - ✅ **Resolved (Oct 25, 2026):** in New Default, Search and Ask Intercept use the Active variant while Surveillance is the current page. Treated as a Figma slip: UCL renders them as Default rows, and only the current page is Active.
  - ✅ **Resolved (Oct 26, 2026, reversed):** New Collapsed fills the rail with `background/subtle`; the first resync treated that as a Figma slip, and it's now implemented. Collapsed is `bg-background-subtle` with no right stroke; expanded is `bg-sidebar` with the 1px `input/border` stroke. ⚠️ **Gap:** Figma still draws the stroke on New Collapsed; UCL drops it there (decided Oct 26, 2026). Action: remove it in Figma. The fill changes with the width (500ms, enter curve; none under reduced motion). Collapsed items hover in `sidebar-hover` (white; Figma `sidebar/hover`), because `bg-active` is the same gray-50 as the rail.
  - ✅ **Resolved (Oct 25, 2026):** New Collapsed still has the Oct 21 nav order. New Default is the source.
  - ⚠️ **Pending:** the wordmark goes to the first item, which is now Search, an action rather than a page. Action: decide whether the app puts a page first, or the Sidebar takes an optional `homeItem` (a label) that defaults to the first item (a minor version).
  - ⚠️ **Pending:** Ask Intercept's Figma icon is `AI-Outline` (`1042:2068`), which lucide doesn't have. The stories use Sparkles. Action: add it to `icons/` from archielabs.ds if the apps need the exact glyph.
- **Second resync, Oct 25, 2026** (same nodes, plus sidebar-menu-button `1001:501`): rows went from 36 to 32px (labels base → sm), icons from 20 to 18px, the nav gap from 12 to 10px, the collapsed rail from 72 to 64px (8px padding around 32px items), and the suffix from `foreground-subtle` to `muted-foreground`. Colors and the other bindings are unchanged. New Collapsed still has the slips above (subtle fill, no stroke, old nav order, and Search drawn 36px), which UCL keeps ignoring.
- **Third resync, Oct 25, 2026** (same nodes): the nav is now three groups, in both New Default and New Collapsed: Search, Ask Intercept / Census, Surveillance, Alert Queue, Messages, Virtual Sepsis / Compliance, Analytics, Marketplace, Administration. The stories follow it. Sizes and bindings are unchanged.
  - ✅ **Resolved (Oct 25, 2026):** New Collapsed's nav order now matches New Default (the Eye item is gone), which settles the old-order slip. Its subtle fill, missing stroke and 36px Search are still Figma slips.
- **Items without a solid icon** (Documentation, Support) keep their outline icon when active. Add the solid icon to `icons/` when Figma draws one.
- **The right stroke is a pseudo-element**, not a border, so rows keep Figma's 248px width. Expanded only.
- **Not built:** sidebar-menu-button's hidden "+" button and "Icon Right" slots. Add them when a design shows them.
- **Collapse button:** the panel icon is `icon-subtle` (Figma `colors/icon/subtle`, gray-400). Hover is Button's ghost hover (`bg-accent`, `text-accent-foreground`). The collapse and expand buttons show the pointer cursor; only the rail's empty space shows the resize cursors.
- **Logo wordmark is outlined text.** In Figma (Logo `1001:82`, revised twice on Oct 25, 2026; "live" dropped Oct 26, 2026) "intercept" (Space Grotesk Medium, -5% tracking) is live text at 104px on an 89 baseline, which UCL doesn't load. The frame stays 743 × 120, so the logo keeps its width with empty space on the right. `logo.tsx` holds the paths from Figma's SVG export of the inner frame `1005:2126` with outlined text (`exportAsync({ format: "SVG", svgOutlineText: true })` in a read-only `use_figma` call). The viewBox is that frame, 743 × 120; in the Sidebar it renders 191.94 × 31, the size of Figma's instance. When the wordmark changes in Figma, re-export it the same way and swap `WORDMARK_PATH`. The mark is Figma's vector; Logo and Logo Symbol share its 120-unit frame and its gradient: five stops (#07079F → #1760AC → #229CB5 → #9DD231 → #FCCD02) from (88.19, 22.11) to (16.82, 95.30) since Oct 26, 2026 (two stops, #32D9FF → #003CF0, before). Pixel diffs against Figma's renders: 27 of ~21,600 inked pixels (Logo) and 6 of ~7,100 (Logo Symbol) differ, all anti-aliased edges.
  - ✅ **Resolved (Oct 25, 2026):** Figma thickens "intercept" with a 1px outside stroke (first on Bold at 900, now on Medium). UCL draws the same edge with a centered 2px `stroke-foreground` over the fill. A pixel diff against Figma's render of the Medium revision matched (3 differing pixels of about 23,500). This is artwork, so DESIGN.md "Text rendering" (`font-synthesis: none`) doesn't apply.
- **"Surveillance" is labeled "Monitoring" (Oct 26, 2026, code ahead of Figma):** the nav item and its page are called Monitoring (plainer, and "surveillance" also means infection-prevention tracking in hospitals); the Specification's module keeps its name, Tele-Critical Care Clinical Surveillance (PRD Monitoring). Changed in the Sidebar stories and the Census prototype. ⚠️ **Pending:** rename the item in intercept.ds `sidebar` (`1001:544`) and the Intercept-Live screens.

---

## Button md follows intercept.ds lg · 36 (`src/components/buttons/button/button.tsx`)

**Rule (Oct 26, 2026, from the Census Filters button, intercept.ds Button `Type=Text, Size=lg · 36, Style=Outlined`):** the 36px button (`md`, and `icon-md`) has a 10px radius (`radius/button/lg` → `--radius-button-md`, `rounded-button-md`), a 14/20 **semibold** label, 6px between icon and label, 14px to the label's side and 10px to an icon's side. The outline variant adds `shadow-xs` and takes its 1px border out of the padding (13px / 9px, `compoundVariants`) so its content lands where the other variants' does. Measured on the Filters button: icon at 10px, gap 6px, label 14px from the edge, 85.2 × 36 (Figma 86 × 36; the rest is text rendering).

- ⚠️ **Pending:** xs, sm and lg (and Figma's 28px `sm · 28`, which has no UCL size) keep shadcn's `rounded-md` (6px), medium weight and padding until they're read from the Button set (`1018:4405`); the cloud Figma connector was down and the desktop one only reads the open page.
- ✅ **Resolved:** `cn()` now knows the project's radius sizes (`input`, `menu`, `card`, `button-md`, in `src/lib/utils.ts`). Before, tailwind-merge kept `rounded-md` next to a custom radius and CSS order decided, so `rounded-button-md` lost. Add each new `--radius-*` token there too.

## Badge: shadcn's Badge, Figma's sizes and tones (`src/components/data-display/badge/badge.tsx`)

**Rule:** Badge follows intercept.ds `badge` (`1014:50`) for sizes, tones and bindings. Resync Oct 26, 2026 (70 variants).

- **Variants:** one per Figma Style × Tone pair (comments in badge.tsx). Solid · Neutral is `neutral` (`bg-neutral`, `text-neutral-foreground`), added Oct 26, 2026. Outline fills `bg-background`, as Figma does, so it reads the same on any surface.
- **Sizes:** `xs` 20px (12px label; Figma's auto line height is 14px), `xs-alt` 24px (14px label), `sm` 32px (14px label, 14px icon), `md` 36px (16px label, 16px icon, 6px gap), `lg` 40px (16px label, 14px icon, 6px gap). xs and xs-alt use a 12px icon; xs–sm a 4px gap. Before Oct 26, 2026, `xs` was 24px and `md`/`lg` had 14px labels.
- **Trailing icon (Oct 27, 2026, third sync):** Figma adds `Icon R`, an icon after the label (and after the count) with the size's gap and no padding change. First drawn on sm only; the same day it was added to all 70 variants from UCL (Plugin API: the library's `chevron/chevron-down`, 12px at xs / xs-alt, 14px at sm and lg, 16px at md, its fill bound to the variant's leading-icon color) and the `Show Icon R` boolean now defaults to **false**, so it's hidden unless turned on. Code matches: no trailing icon unless one is passed. In code it's an icon as the last child, sized like the leading one. Only the leading icon trims its side's padding. Badge works out which end an icon is on (an element, not text, first or last among several children; `arrangeContent`) and sets `data-icon-start` for the padding, then places the count before a trailing icon. CSS can't: `:first-child` ignores text nodes, so in "Label [icon]" the icon matched as leading. With `asChild` it arranges the child's own children.
- **Icon-side padding (Oct 27, 2026 sync):** with a leading icon, xs–md pad that side 2px less: xs / xs-alt 6px (8px opposite), sm 8px (10px), md 10px (12px); lg stays 14px on both. `data-[icon-start]:pl-*` (set by Badge; see "Trailing icon"), so a badge without a leading icon keeps even padding (Figma draws every badge with its icon). The same sync took sm's icon from 12px to 14px.
- **Slots:** Figma's `show-icon` is an icon as the first child. Its `Show Counter` (Oct 27, 2026: now an inline "· #" in the label's style, no longer a nested Counter) is the **`count`** prop: "Label · 6", the dot and number 3px apart and 3px from the label (the count pulls back by the size's gap minus 3px: `-ms-px` at xs–sm, `-ms-[3px]` at md/lg). Shown whenever set, 0 included, unlike PatientCardAlert's count (2 or more). With `asChild` it's placed inside the child. The Census quick-view chips use it (`QuickViewChips`, "With alerts · 6").
- ⚠️ **Pending (Figma slips, not copied):** md and lg Flat · Red bind the label to `palettes/flamingo/700` instead of `badge/red/foreground` (xs and sm bind red), and md Solid · Brand and Flat · Neutral use a 4px gap where every other md uses 6px. UCL keeps red and 6px. lg's icon (14px) is smaller than md's (16px); UCL follows Figma's instance size (see "Icon sizes match Figma's defined instance size"). Action: confirm the lg icon size in Figma.
- ✅ **Resolved (Oct 26, 2026 sync):** Solid · Brand and Link bind `tone/brand/brand`, now `--brand` = denim-500 (#1160e8) in `theme.css` too.

---

## Avatar: shadcn's parts, intercept.ds's set (`src/components/data-display/avatar/avatar.tsx`)

**Rule:** Avatar follows intercept.ds `avatar` (`1112:4118`, Oct 26, 2026) on shadcn's current structure (Radix `@radix-ui/react-avatar`): Avatar, AvatarImage, AvatarFallback, AvatarBadge, AvatarGroup, plus AvatarAdd. The header's older instances point at a remote `Avatar / Users` library set; the local `avatar` set is the source from now on.

- **Figma's variants are content, not props:** w1–w10 / m1–m3 are photos → `AvatarImage src`; i1–i10 are initials on ten colors → `AvatarFallback tone={1…10}` (`--avatar-1` … `--avatar-10`, white initials as `text/on-primary` → `primary-foreground`); Show Dot → `AvatarBadge`; Add → `AvatarAdd`. Without a tone the fallback is shadcn's neutral (`muted`).
- **Sizes:** the UCL scale, `xs` 24 / `sm` 32 / `md` 36 / `lg` 40 (SIZE-SCALE.md names). Default `sm`: Figma's set and shadcn's default are both 32px. AppHeader uses `md` (Figma's header instances are 36px).
- **Initials:** Figtree Bold 11px at 32px, scaled in proportion at the other sizes (8.25 / 12.375 / 13.75px). Literal values, no font-size token (agreed Oct 26, 2026).
- **Dot:** 8px `success` with a 2px `background` ring (Figma's outside stroke), on the bottom-right corner; scaled with the size (6 / 8 / 9 / 10px). The root isn't clipped (shadcn's has `overflow-hidden`), so the dot isn't cut by the circle; the image and fallback round themselves.
- **Group:** 6px overlap (`-space-x-1.5`) and a 2.7px `background` border on each avatar (Figma's literal stroke in the header), the first avatar on top (Figma stacks z 3 / 2 / 1; shadcn puts the last on top).
- **Add:** a `<button>` with `aria-label` (default "Add"), `background` fill, `border` stroke and a `text-icon` plus (16px at 32, scaled). Hover `accent` and the focus ring come from Button's vocabulary; Figma draws no states.
- ⚠️ **Gap:** the ten fills are raw hexes in intercept.ds with no variables. Action: add them to archielabs.ds (e.g. `avatar/1` … `avatar/10`) and bind the set.

## AppHeader: intercept.ds Header (`src/components/navigation/app-header/app-header.tsx`)

**Rule:** AppHeader follows intercept.ds `Header` (`1112:4116`, Oct 26, 2026): the Online pill and clock on the left; Search (with a "/" hint), Messages, Theme, Team and User pills on the right. Data comes in through props (`clock`, `unreadMessages`, `team`, `user`) and each button calls its own handler (`onSearch`, `onOpenMessages`, `onToggleTheme`, `onOpenTeam`, `onOpenUserMenu`); it holds no state.

- **Theme button (Oct 26, 2026):** `theme` picks the icon: the moon in light mode ("Switch to dark mode"), the sun in dark mode ("Switch to light mode"). The two icons are stacked and cross-fade with the Swap pattern (`iconSwapVariants`; instant under reduced motion). AppHeader holds no theme state: the app passes `theme` and handles `onToggleTheme`.
- **Compact (Oct 26, 2026, code only):** `compact` animates the vertical padding from 16 to 8px (65px tall) on `standardTransition`, instant under reduced motion. Motion animates an inner wrapper's padding, so the `<header>` keeps plain HTML props and no CSS transitions the same property. No fill of its own: a sticky header gets `bg-background` from its page.
- **Layout:** 24 × 16px padding, a 1px `border` bottom line (81px tall), 13px between pill and clock, 8px between the 48px pills. Pills have no fill (Figma none), a `border` stroke, Figma's literal paddings, and the library's hover (`accent`) and focus ring, which Figma doesn't draw.
- **Online pill:** `success-subtle` / `success`, 14px bold, 0.03em tracking, uppercase. The 11px dot has a 2px ring straddling its edge in `--success-glow` (#53ff86). It's animated with the **Live** motion pattern (MOTION.md): the dot pulses every 1s (1.6s, and 2s before that, earlier on Oct 26, 2026): it grows from 50% (10% before Oct 26, 2026) to full size over half the beat and shrinks back over the other half, linear and without a hold, so it never stops dead (Oct 26, 2026; before, it popped with `backOut` and held) (made more prominent on Oct 26, 2026; it breathed to 1.15× before). The blurred ring fades in as the dot grows, then a blurred copy of the ring spreads to 2.2× while its blur goes 1 → 6px (3px before Oct 26, 2026) and it fades. It's still under reduced motion. ⚠️ **Gap:** the ring color is raw in Figma. Action: add a variable in archielabs.ds. ⚠️ **Gap:** Figma has no offline state; the pill always says Online.
- **Icons:** search and moon 24px, messages 23px (the Figma instance's size), chevrons 16px.
- **User name:** Figma fills it with raw black; code uses `foreground` (gray-700), like every other label. ⚠️ **Pending:** confirm in Figma and bind `colors/foreground/foreground`.
- ℹ️ The "/" hint is visual only; AppHeader doesn't bind the shortcut. Apps that want it listen for "/" and call their search.
- ℹ️ Intercept-Live's Census frame shows no bottom line, but the component has it, and the prototype should show it (Oct 26, 2026).

## PatientMonitoringCard: a live bedside monitor in a card (`src/components/cards/patient-monitoring-card/`)

**Rule (draft, Oct 26, 2026):** follows intercept.ds `patient-monitoring-card` (`1125:4328`) for the card (the monitor frame's radius is 8px, `rounded-lg`; Figma's value is raw, 4px before Oct 26, 2026): PatientCard's header (name, MRN · sex · age, optional `PatientCardAlert`) and location row, 16px padding and 12px gaps, `rounded-card`, `shadow-sm`. Figma's 366 × 240 monitor frame is empty, so the monitor follows PRD Monitoring §3.3 and the bedside-monitor references (§1.3), made realistic:

- **Condensed (default) / expanded:** condensed is 120px, an ECG strip over HR · SpO₂ · ABP · RR; expanded is Figma's 240px, four lanes (II, Pleth, ABP, Resp), each a waveform with its numerics box: label (and the mean pressure for ABP) and unit on top, alarm limits small (high over low) beside the large value. The toggle sits at the end of the location row (`Maximize2` / `Minimize2`, `aria-expanded`); the height animates on `standardTransition` and the views cross-fade (`fadeVariants`). ⚠️ **Gap:** Figma has no toggle; its placement is a proposal.
- **Waveforms** (`monitor-waveform.tsx`): canvas lanes that sweep left to right behind a 10px erase gap at 25 mm/s (50px/s; resp 18px/s), shaped like the real signals (ECG PQRST, pleth and arterial pulse with a dicrotic notch, faster inspiration) and paced by `vitals.hr` / `vitals.rr`. Illustrative, not diagnostic. A still trace under reduced motion; a flat line without a rate. Decorative (`aria-hidden`): the numerics carry the values.
- **Colors:** new `--monitor-*` tokens, the same in both modes (the screen is always dark): `monitor` (graphite-950; Figma's frame is #31373f, a placeholder), `monitor-grid`, `monitor-foreground`, and one color per parameter: ECG green, SpO₂ teal, ABP violet, resp warm white. None sits on an alert hue (PRD SV-073). ⚠️ **Decision needed:** the palette is a draft for SV-OD-10; add Figma variables once it's agreed.
- **Alarms:** ✅ **Resolved (Oct 27, 2026):** a value outside its limits gets a small ↑ / ↓ tag (14px, 4px radius, `monitor-foreground` fill, `monitor` glyph) in its label row, so drift shows on the card itself, with or without an alert. It replaced the Monitoring page's "Outside limits" filter (see Intercept Live › Monitoring). In the full monitor the tag follows the label (and MAP); in a condensed cell it takes the unit's place, because the cell is too narrow for both. Never next to the number, so the numerics keep their width, and the parameter's color never changes (SV-073). Screen readers hear "above alarm limits" / "below alarm limits"; the box's `data-alarm` is `above` or `below`. (The Oct 26 `severity-critical` ring and tint on the box stays removed: a severity hue on a numeric reads as an alert.) Default limits are common adult ICU values (HR 50–120, SpO₂ 90–100, systolic 90–160, RR 8–30); apps pass the patient's own.
- **Alerts behave as on the Census (Oct 26, 2026):** the same 2px ring and 5% tint, pulsing in step with every other alert card until the card is clicked or the alert is acknowledged or escalated, fading out when it resolves; `onOpen` / `href` make the whole card open the patient, with PatientCard's lift and `foreground` hover border; the expand button is raised above the open target. Both cards use the shared `usePatientCardAlertRing`, `patientCardOpenTargetClassName` and `patientCardInteractiveClassName` (`cards/patient-card/patient-card-parts.tsx`), so they can't drift apart.
- **Sizes (Oct 27, 2026, for Monitoring's densities):** `size` `md` (default, Comfortable) and `sm` (Compact; four a row at 1728 with the queue open). `sm`: 12px padding (11px + border; 10px on hover), 8px gaps, name 16px, MRN and location 12px, a 104px condensed monitor (ECG lane 44px), numerics 18px (20px in the full monitor, whose numeric column is 112px). Its condensed cells drop the units (the full monitor shows them) and give ABP 1.5× the width of the others (`grid-cols-[1fr_1fr_1.5fr_1fr]`), because "104/56" doesn't fit a quarter of a ~270px card. `data-size` on the root. ⚠️ **Pending:** draw the `sm` card in intercept.ds.
- **Trends view (Oct 27, 2026; PRD SV-OD-12):** `condensedView="trends"` swaps the ECG strip for a 1-hour sparkline under each numeric, from `trends` (`MonitorTrends`: `hr`, `spo2`, `systolic`, `rr`, oldest first). A 1.5px line in the parameter's color, each scaled to its own range but at least 4 units tall, so a steady value stays flat instead of magnifying noise. No endpoint dot: the SVG stretches to the cell, which would turn a dot into an ellipse. A missing series draws nothing. The full monitor always shows the waveforms. ⚠️ **Decision needed:** whether panel cards default to waveform or trends (SV-OD-12).
- **Full / condensed button (Oct 27, 2026, intercept.ds `patient-monitoring-card` Hover `1149:3763`):** it left the location row. It's Button's circle variant (see "Button circle variant") at 32px, over the monitor's top-right corner (8px in), shown on card hover or keyboard focus inside the card (opacity, 160ms) and always where the device can't hover (`@media (hover: none)`). Raised above the card's open target. In the 1 h trends view it covers the RR cell's top-right corner while shown.
- ⚠️ **Not yet:** the avatar Figma hides; numerics from ventilator and pumps (SV-074).

## HospitalSectionHeader (`src/components/data-display/hospital-section-header/hospital-section-header.tsx`)

**Rule:** follows intercept.ds `hospital-section-header` (`1118:4281`, Oct 26, 2026): a 44px tile (`background-subtle`, 8px radius, 10px padding) with lucide `hospital` at 24px in `icon`, 12px gap, then the name (20px bold, 24px line, `foreground`, the section's heading, `h2` by default) over "N patients · N alerts" (14/20 regular; count `foreground`, dot `muted-foreground`).

- **Alerts are always the critical red** (`severity-critical`), as Figma binds them, whatever the worst alert is. It's the only severity color that reads as text on white (≈4.5:1); high, medium and low are ≈3:1. ⚠️ **Decision needed:** a hospital whose only alert is Low still shows red "1 alert"; confirm that, or color it another way (e.g. an icon in the worst severity's color beside foreground text).
- **No alerts** shows "No alerts" in `muted-foreground`. ⚠️ **Gap:** Figma has no zero state; confirm it.
- A long name truncates; the counts never do. Singular forms: "1 patient", "1 alert".

## EmptyState: one layout for every empty view (`src/components/feedback/empty-state/empty-state.tsx`)

**Rule:** a view with nothing to show (a list with no items yet, filters that match nothing, a page that isn't built yet) uses EmptyState, ported from bethere-ucl (itself from verita-ai) on Oct 26, 2026, with the same API: an `lg` semibold title in `foreground`, an optional `base` description in `muted-foreground` (max 640px), 8px apart, and an optional primary `lg` Button 16px below. Only the copy, and whether there's an action, changes. ⚠️ **Gap:** no Figma design in intercept.ds yet.

**How to apply:**

- Title says what's missing ("No alerts in the queue"); the description says what will appear here, or how to get there. When the user caused the emptiness (filters), add the action that undoes it ("Clear filters").
- It centers itself in its parent: give it `flex-1` to fill a page, or vertical padding inside a section.
- ⚠️ **Decision needed:** the copy is a draft. DESIGN.md "Brand voice" isn't defined yet, so it's plain and calm by default; review it with the `ucl-ux-copywriter` skill once the voice exists.

## Select: shadcn's Select, Input's trigger (`src/components/forms/select/select.tsx`)

**Rule:** Select is shadcn's current Select on Radix (`@radix-ui/react-select`), with the same parts and props and the `item-aligned` default. Built Oct 26, 2026 for the Census menus. The list follows intercept.ds `Select / Content` (`1132:103`), `Select / Item` (`1132:32`: Default, Hover, Active, Disabled), `Select / Label` (`1132:33`) and `Select / Separator` (`1132:35`), drawn Oct 27, 2026. ⚠️ **Gap:** intercept.ds still has no Select trigger, so it follows Input.

- **Trigger = Input:** `rounded-input`, `border-input`, `bg-background`, `shadow-xs`, Input's hover, focus, `aria-invalid` and disabled styles, placeholder in `foreground-subtle`, chevron in `text-icon`. `size`: `sm` | `md` (default) | `lg` (32 / 36 / 40); `default` is a deprecated alias of `md`, so pasted shadcn code works.
- **List (resynced Oct 27, 2026 from the new Figma parts; it was 16px / 6px / 10px before):** at least 200px wide (`min-w-[200px]`, Figma's min width since the fourth Oct 27 sync; shadcn's 8rem before), `rounded-input` (10px, `radius/input`), `border`, `popover`, `shadow-xl` (the effect style; `shadow-md`, then `shadow-lg`, in earlier Oct 27 syncs, and Figma's description still says md), 4px padding. Items are 32px (`py-1.5`, 8px sides, 8px gap), `rounded-md` (6px; a raw value in Figma), so they stay concentric with the list; 14/20 medium `foreground` (`sm/sm -medium`; regular until the third Oct 27 sync). Hover and keyboard highlight is `accent` (`states/hover`); Active (the chosen value) adds a 16px check in `icon` at the end; Disabled is 50% opacity. A leading icon is 16px (Figma's `Icon L`; 18px in the first Oct 27 sync). Label: 28px (6px above, 4px below the 18px line), 12px `muted-foreground`. Separator: `border`, 4px above and below, spanning the list's padding (`-mx-1`). **2px between rows** (second Oct 27 sync): the viewport and each SelectGroup are a flex column with `gap-0.5`, so labels, items and groups are 2px apart; the separator adds its own 4px on top. Figma now matches shadcn's current classes, apart from the radii.
- **Motion:** shadcn's `animate-in` classes are replaced by a Motion surface like Tooltip's: it fades in and grows from `motionScale.popIn` on `enterTransition`, and in `popper` mode moves 8px in from the trigger's side. Fade only under reduced motion. Radix unmounts it on close, so the exit is instant.

## Intercept Live › Census (`src/layouts/intercept-live/census/census.tsx`)

**Rule:** the Census layout follows Intercept-Live `Census` (`1:350`, Oct 26, 2026), composed from UCL components. Data comes in through props; stories pass `sample-census.ts` (14 synthetic patients: Figma's 8 plus 6 that fill the hospital counts).

- **Shell:** Sidebar (starts collapsed, Census active; the layout owns `collapsed`) on a `background-subtle` page, with a 16px gap between the header block and the content. The canvas is `bg-background`. With the rail collapsed it's a card on the page: `rounded-l-2xl` (16px) and Figma's canvas shadow, `0 0 26px` black 8%. Expanded, it has no radius and no shadow, meeting the white rail and its stroke flush. The radius and shadow change with the rail's width (500ms, enter curve; none under reduced motion). ⚠️ **Gap:** the shadow is a raw effect in Intercept-Live with no effect style, so it's an arbitrary value in the layout. Action: add it to archielabs.ds as an effect style, then make it a `--shadow-*` token. ℹ️ Figma's collapsed sidebar has no fill, so the page shows through; UCL's keeps `bg-sidebar` (see "Sidebar").
- **Canvas resync (Oct 26, 2026):** The Intercept-Live frame has no header stroke paint, so the inline header briefly had no divider; ✅ **Superseded (Oct 26, 2026):** the header is now AppHeader, which keeps intercept.ds Header's 1px `border` bottom line (81px tall). The page, the collapsed rail and the canvas fills are unchanged (`background-subtle`, `background-subtle`, `background`). ✅ **Resolved:** the canvas shadow was hidden on its left side, because the Sidebar is `relative` and painted over the static canvas. The canvas is `relative` now, so it stacks above the rail and the shadow falls across it as in Figma (pixel-checked at the rail edge).
- **Light / dark (Oct 26, 2026):** the header's theme button toggles `.dark` on `<html>` (`useDocumentTheme` in the layout), so portaled menus and tooltips follow the page. The hook also watches that class, so Storybook's Theme toolbar and the button stay in sync. An app would own this in its theme provider instead.
- **Empty states (Oct 26, 2026, code only):** under the filter bar, EmptyState replaces the grid when nothing shows: "No patients on the census" when there's no data, or "No patients match these filters" with a **Clear filters** button (hospital, quick view, unit and My Patients back to their defaults). It Reveals in, centered both ways in the space between the filter bar and the bottom of the canvas (the grid hides itself when empty, so it adds no gap).
- **Other pages (Oct 26, 2026, code only; shell shared since Oct 26, 2026, see "Intercept Live › Monitoring"):** the Sidebar's sections (Monitoring, Alert Queue, Messages, Virtual Sepsis, Compliance, Analytics, Marketplace, Administration) switch the canvas to that page: its title (`h1`, 2xl bold) and an EmptyState centered both ways in the page area below the header (absolutely, so the title doesn't push it down), with copy per page (`emptyPages`, product content). The header and Sidebar stay. Search and Ask Intercept aren't pages, so they don't navigate. `defaultPage` picks the first page (stories). Like bethere-ucl's empty Provider Portal pages.
- **Sticky header (Oct 26, 2026, code only):** AppHeader is a direct child of the scrolling canvas (sticky can't leave its parent), `sticky top-0 z-20 bg-background`, so cards slide under it. It turns `compact` and takes a subtle `shadow-sm` (fading over 300ms on `standardTransition`'s curve; instant under reduced motion) as soon as the canvas scrolls (Motion's `useScroll` on the canvas) and relaxes back at the top. The tabs row follows with 8px above and 16px below, the same layout as before.
- **Clock (Oct 26, 2026):** the header shows the user's real date and time, in their locale ("Mon Oct 26 · 5:56 PM" in en-US, "lun 26 oct · 17:56" in es-ES): weekday, month and day without the locale's commas, then the time. `useCurrentMinute` (`src/lib/hooks`) ticks on each minute boundary with one shared timer and catches up when the tab is visible again; it's `null` on the server, so the first server render shows no clock instead of a time that disagrees with the client's. The `clock` prop still pins a time (e.g. for a screenshot). It's no longer sample data.
- **Header:** AppHeader (`navigation/app-header`, intercept.ds Header `1112:4116`) with the sample team and user (Figma's photos, plus initials for one). It replaced the layout's one-off header on Oct 26, 2026.
- **Hospital tabs:** Tabs `line` / `lg`. Each counter shows the hospital's patient count in the color of its worst alert (`Counter` severity variants); All hospitals uses `neutral`. ✅ **Resolved (Oct 27, 2026, Intercept-Live Census `1:350` / My Patients `111:15999`):** the **My Patients** switch is gone; whose patients is now a pill at the start of the filter row (`PatientScopeSelect`, shared with Monitoring): Badge `neutral` `md` rendered as the DropdownMenu trigger, with the scope's icon (lucide `users` for All patients, `user` for My patients), the label and a trailing `chevron-down` (Badge's Icon R), opening a menu of the two (radio items with their icons). It narrows everything below it, the tab counters included, and Clear filters resets it to All patients. With My patients the title reads "**6 of 14 patients** across 3 hospitals" (bold through "patients"): the user's own among everyone the other filters match. ⚠️ **Pending (Figma):** the All Patients frame (`1:350`) still hides the pill's chevron and both frames still draw the My Patients switch; UCL shows the chevron in both states (it opens a menu either way) and drops the switch, as asked. ✅ **Resolved (Oct 27, 2026):** the **Alerts only** switch was removed: it matched the same patients as the "With alerts" quick view.
- **Quick views:** Badge `md` chips rendered as toggle buttons (`asChild`, `aria-pressed`); the active one is `neutral`, the rest `secondary`. At most one at a time; pressing the active one turns it off (there's no "All Patients" chip since Oct 27, 2026: the scope pill took its place). Figma still labels the alert chip "Needs attention" and Sort "Severity"; UCL keeps "With alerts" and "Alert" (both renamed on purpose, see below and Sort by). **"With alerts"** ("Needs attention" until Oct 27, 2026: renamed to say what it filters) shows its count of patients and, since Oct 26, 2026, matches every patient with an active alert of any severity (it was Critical and High only); resolved alerts and messages don't count. Not "Active alerts": the summary counts alerts and the chip counts patients, so the same words would show two different numbers. **"Out of range"** (Oct 27, 2026, after With alerts, lucide `gauge`, with its count): patients with any vital marked outside its normal range on the card (`range`, the ↑ / ↓), alert or not; the card's own word. Not "Outside limits", which is Monitoring's alarm-limit wording. ⚠️ **Pending:** add the chip to Intercept-Live's Patient Status Filters. Icons from lucide match Figma's (badge-check, bell-ring, triangle, hand-heart, germ, wifi-off). Hover on an unpressed chip (Patient Filter Bar in Intercept-Live, Oct 26, 2026): it cross-fades to Badge `outline`'s look with a `foreground` (gray-700) border instead of `border` (`bg-background`, `border-foreground`; darker border since Oct 26, 2026) over 160ms (`motionDuration.fast`), and chips press (Press, 0.98) on tap; both instant under reduced motion. Badge's base already has a transparent 1px border, so nothing moves.
- **Menus (Oct 26, 2026):** both are Select (`forms/select`) in `popper` position, aligned to the trigger's start. **Units** (Oct 26, 2026, for the team demo) lists "All Units" and a fixed set of the most common units, grouped: **Intensive care** (MICU, SICU, CVICU, CCU, Neuro ICU, Trauma ICU, Burn ICU, OB-ICU) and **Step-down** (PCU). Product content (`unitGroups`), not derived from the data, so the menu looks the same in every hospital; choosing one filters the grid (with the filter motion) and the quick-view counts, and a unit with no patients shows the no-matches state. The sample spreads patients across MICU, SICU, CVICU, CCU, Neuro ICU, OB-ICU and PCU; Trauma and Burn ICU are empty on purpose. ⚠️ **Decision needed:** in the product, list the units configured per hospital (Client Administration) instead of a fixed set. Both triggers show the chosen value in semibold and any label ("Sort by:") in regular, as Intercept-Live draws them; Radix drops `className` on `SelectValue`, so the trigger styles it (`[&_[data-slot=select-value]]:font-semibold`). **Sort by** (Oct 26, 2026): **Alert** (default; worst active alert first, ties by acuity), **Acuity** (highest score first, ties by alert), Acuity change (largest 24h rise first), Name (A–Z) and Location (hospital, unit, then bed in numeric order). Then by name; patients missing the value go last. The card keeps the alert top-right (the "act now" signal, PRD §3.2 #3); the sort is the lens: Alert answers "who needs me now", Acuity "who's sickest". Alert and Acuity break ties by each other so both signals always count, e.g. a Critical-risk patient with no alert leads the no-alert group. "Severity" was renamed "Alert" because the word fit both scales. Re-sorting reuses the filter motion's glide. **Location groups by hospital** (Intercept-Live Census `111:15999`, Oct 26, 2026): a section per hospital, in name order, headed by HospitalSectionHeader ("CVMC · 5 patients · 3 alerts"; alerts are every active alert, a card's `count` included, resolved and messages left out). Spacing as in Figma: 32px from the filter bar to the first section and between sections, 16px from a header to its cards. The headings are full-width rows in the same grid (`col-span-full`, 16px extra space above all but the first), not separate grids: cards keep their parent and key, so switching to Location glides them into their sections instead of remounting them, and headings Reveal in and fade out like cards. ℹ️ The 24h change comes preformatted ("+2", "−1"), so the layout parses it; an app should sort on the API's number. ⚠️ **Decision needed:** the orders are a proposal, not from Figma or a PRD; confirm them with product. Filters is Button `outline` `md` with lucide `list-filter` (`ListFilterIcon`): the Lucide Figma kit's **`filter`** icon in archielabs.ds (`230:561`, three lines, shortest at the bottom; Oct 26, 2026, was `funnel`). ⚠️ **Constraint:** in lucide-react `Filter` / `FilterIcon` is an alias of `Funnel`, not this icon, so don't import it by the Figma name. The kit's copy is an older lucide drawing (lines x 3–21 at y 6/12/18); lucide-react 1.57 draws them 1px wider per side, invisible at 16px. ℹ️ Before this they were Input-styled `<button>`s, and Sort by showed Input's grey read-only fill: buttons match CSS `:read-only`. Don't style a button with `inputVariants()`.
- **Grid:** compact PatientCards (the default since Oct 26, 2026; Figma's Census still draws expanded ones), 4 columns at Figma's 1728 width (`2xl:`), 3 / 2 / 1 below; 16px gaps; sorted by alert severity, then name. The sample vitals carry `shortLabel`s (HR, RR) for the compact line.
- **Click resolves (Oct 26, 2026, prototype only):** opening a card with an active alert resolves it for the session (`resolvedIds`, applied before filtering): its pill becomes Resolved, the ring turns green and blinks once (since Oct 27, 2026; see Monitoring "Resolved hold"), and Needs attention, the tab and section counts and Alerts only update. An app resolves through Clinical Alerting instead; ⚠️ **Decision needed:** whether opening a patient should ever resolve an alert clinically (PRD PC-071 requires a documented resolution).
- **Sample alerts (Oct 26, 2026):** six of the 14 patients have an alert: 1 critical (Miller), 1 high (Harris), 2 medium (Walker, Thompson), 2 low (Johnson, Anderson; Johnson was high until Oct 27, 2026); the rest have none. Each hospital tab shows a different severity: Harbor Point red (critical), Mercy West blue (low), CVMC amber (medium). Needs attention shows 6 (every active alert). Davis (CVMC) has Critical risk acuity (SOFA 12, unchanged in 24h) and no alert, to show that the two scales are independent (high acuity isn't an alert, PRD PC-030).
- **Filter motion (Oct 26, 2026, code only: Figma has no prototype for it):** when a hospital tab, a quick view, My Patients or the data changes the visible set, cards that join Reveal (`revealVariants`), cards that leave fade out on the exit timing, and the rest glide to their new slots (`layout="position"`, `layoutSpring`). `AnimatePresence` runs in `popLayout` mode, so a leaving card is taken out of the grid at once and the others move while it fades; the grid is `relative` for it. `initial={false}`: the first render doesn't animate. The canvas is a `motion.div` with `layoutScroll`, so the glide stays right when it's scrolled. Under reduced motion cards appear and disappear at once (opacity only, `reducedMotionTransition`) and don't glide. The card's own hover Lift stays on the inner `article`, so no property is animated by both.
- ⚠️ **Not copied:** Figma's acuity badges all show Badge's placeholder `badge-check` icon, so the layout leaves the icon out.

---

## Intercept Live › Monitoring (`src/layouts/intercept-live/monitoring/monitoring.tsx`)

**Rule (Oct 26, 2026, code ahead of Figma):** the Monitoring page follows PRD Monitoring (SV-010–SV-014, SV-051, AC-11), not a Figma frame: Intercept-Live has no Monitoring screen yet. It's the Census's page with PatientMonitoringCards in place of PatientCards. ⚠️ **Pending:** draw the screen in Intercept-Live, then resync this layout. Data comes in through props; stories pass `sample-monitoring.ts` (the Census's 14 patients with live values).

- **Shell (shared with the Census):** `intercept-live/intercept-live.tsx` (`InterceptLive`) holds what was the Census's shell: Sidebar (starts collapsed to its rail), canvas, sticky AppHeader, theme and clock. **Shift countdown (Oct 27, 2026):** with `shiftEndsAt` (ISO), the header's line under the user's name counts down to the shift's end on the clock's minute tick (`useCurrentMinute`): "Shift ends in 3h 45m", "in 45m" under an hour, "Shift ended" after. Not "3:45", which reads as a clock time. AppHeader still takes the preformatted `user.shiftEnds`, shown as given before the first client render; the sample's shift ends at 8:00 PM (the next one, so the countdown always runs). It takes `pages` (content per Sidebar page); pages a layout doesn't pass show their title and empty state (`emptyPages`, Census included). **Ask Intercept chat (Oct 27, 2026; Intercept-Live "Chat open" `129:14814`):** a global panel (`intercept-live/ask-intercept-panel.tsx`), not a page: the Sidebar's **Ask Intercept Live** (relabeled from "Ask Intercept" on Oct 27, 2026, in the prototype only; intercept.ds and the Sidebar stories still say Ask Intercept) is an action (`onClick`) that toggles it on any page, and the current page stays. It opens between the Sidebar and the canvas at 400px, growing its width on `enterTransition` like the Sidebar (instant under reduced motion), so the page narrows instead of being covered. With the Sidebar collapsed the chat takes the canvas's card edge (16px left radius, `background`, Figma's raw 0 0 26px 8% shadow) and the canvas goes square but keeps its shadow, as Figma draws them, plus a 1px left border in `border` (`colors/border/border`, inside; added Oct 27, 2026) so the divider shows in dark mode, where the shadow doesn't. The close button or Escape inside it closes it, and focus moves to its heading when it opens. ⚠️ **Pending:** Figma draws the frame empty, so the panel has a heading ("Ask Intercept Live"), a close button and an EmptyState ("Ask about your patients") as placeholders until the conversation is designed; then build it from intercept.ds. Each page's content is its own component (`census/census-panel.tsx`, `monitoring/monitoring-panel.tsx`), and both layouts pass both pages, so the Sidebar's Census and Monitoring move between them (Census takes `monitoringPatients`, Monitoring takes `censusPatients`; without them that page shows its empty state). A page's filters reset when you leave it.
- **Filters in context (✅ Resolved, Oct 27, 2026; PRD SV-010, AC-11):** Monitoring narrows the panel's scope, sets how it looks, and has one status filter of its own. **Outside limits** (added later the same day; lucide `gauge`, with its count, a Badge chip after the All / My patients pill, as the Census's Patient Status Filters): patients with any primary numeric outside their alarm limits, the ones the card tags ↑ / ↓. It keeps the patients who matched **when it was pressed** (`statusFilter.ids`): readings move every second and a live filter would add and drop cards (SV-013); the count stays live, pressing it again clears it, Clear filters resets it. "Limits", not the Census's "Out of range", because these are alarm limits. Scope: the hospital tabs, the **All / My patients** pill (`PatientScopeSelect`, first in the toolbar row; the switch was removed Oct 27, 2026, as on the Census) and **Unit**. With My patients the summary reads "**6 of 14 patients** · 4 active alerts". Order: **Sort by** Alert, Location or Name (`SortSelect`'s `orders`); the acuity sorts are left out because the monitoring card doesn't show acuity. View: Full monitors. All of them come from `shared/patient-panel.tsx`, so they keep the Census's labels and behavior. The Census keeps its quick views and Alerts only; Monitoring drops them so it doesn't repeat what other parts of the page already do. Needs attention and Alerts only are what the triage queue is for. Outside limits is the card's ↑ / ↓ tag (PatientMonitoringCard "Alarms"). Data gap is a System alert in the queue ("SpO₂ not reporting"). Rising acuity and Organ support filter on data the monitoring card doesn't show. A status filter on a live panel would also make cards come and go as readings change (SV-013). The summary reads "**14 patients** · 10 active alerts" (PRD §3.1). There's no Filters button: on the Census it does nothing yet.
- **View controls (Oct 27, 2026, code ahead of Figma; PRD SV-015; `monitoring/view-controls.tsx`):** at the end of the Unit / Sort by row, pushed right. **Density** (Comfortable, Compact, List): icon-only toggle buttons (`aria-pressed`, named by `aria-label`) in a `role="group"` on the Tabs track, styled with `tabsListVariants` / `tabsTriggerVariants` (`default`, `md`) and `tabsIndicatorVariants`, the same sliding raised marker (`layoutId`, `layoutSpring`). A Tooltip (below, no delay) names each one on hover and keyboard focus (Oct 27, 2026; Tabs' icon-only use). The track sets its own `h-9`: Tabs' list height needs a Tabs root, which this isn't. Not a Tabs: it changes the view, with no tab panels. Icons: lucide `layout-grid`, `grid-3x3`, `rows-3`. **Card monitor** (Oct 27, 2026, moved out of the View menu): **ECG strip** (lucide `activity`) / **1 h trends** (`chart-spline`), the cards' `condensedView`, on the same track as Density but with icon and label, 8px to its left; disabled (50%) in List. Both are one `SegmentedToggle` (`iconOnly` for Density). **Monitor view** (Oct 27, 2026; it replaced the View menu and its Full monitors item): **Condensed monitors** / **Full monitors**, icon only with tooltips like Density, between Card monitor and Density (order: Card monitor, Monitor view, Density, 8px apart), using archielabs.ds's custom `monitor-view-minimized` (`6234:10234`) and `monitor-view-expanded` (`6234:10235`) icons (UCL `MonitorViewMinimizedIcon`, `MonitorViewExpandedIcon`). Either sets every shown card; each card's own button still toggles it alone, and while some cards are expanded and others aren't, neither button is pressed (SegmentedToggle takes `null`). Disabled in List. ⚠️ **Decision needed:** SV-OD-04 (which densities ship); whether view settings persist per clinician (SV-015).
- **List density (`monitoring/monitoring-list.tsx`):** one table row per patient in a `rounded-card` frame (scrolls sideways under 56rem): Patient (name opens it, then MRN - sex, age), Location (unit · bed over hospital), Alert (PatientCardAlert at `text-xs`, "—" when none), then HR, SpO₂, ABP, MAP, RR right-aligned, 16px semibold tabular. Numbers and header labels take the parameter's **ink** color (`text-monitor-*-ink`, which reads on the page's surface); a value outside its limits gets the same ↑ / ↓ tag as the card, inverted (`foreground` fill); missing values show "--" in `muted-foreground`. The whole row opens the patient on click; the name is the keyboard target. Location groups it with a HospitalSectionHeader row per hospital. No row motion yet.
- **Grid (Oct 27, 2026: container queries):** the page beside the queue is a size container (`@container`), so columns follow the room the queue leaves. Comfortable, at least ~340px a card: 2 from 46.5rem, 3 from 69rem, 4 from 91rem. Compact (`sm` cards, 12px gaps), at least ~272px: 2 from 38rem, 3 from 55.5rem, 4 from 73.5rem, 5 from 91rem. With the queue open that's 3 Comfortable or 4 Compact a row at Figma's 1728 width (PRD SV-012), and 4 or 5 at 1920; with it collapsed, the panel gains a column sooner. 16px gaps (Comfortable); `items-start`, so a card showing the full monitor grows alone. Location groups by hospital with HospitalSectionHeader, as on the Census. Same filter motion (shared `PanelGrid`).
- **Opening a card** calls `onOpenPatient` and stops its alert ring pulsing (the card's own behavior). Unlike the Census prototype, it doesn't resolve the alert (PRD PC-071: acknowledging never resolves).
- **Triage queue (Oct 27, 2026, code ahead of Figma; `monitoring/triage-queue.tsx`):** PRD SV-020–SV-023, taken from the Monitoring exploration (`explorations/index.md`). A 360px rail right of the page, `background-subtle` with a left border, sticky at `top-16` (the compact header's height) with its own scroll. Header: "Triage queue", "N active", a collapse button; Tabs **Active** / **Resolved** with Counters. Rows (`li`, never `article`, so the panel's card counts in tests stay right): PatientCardAlert at `text-xs` for the severity, title, age ("6 min", from `useCurrentMinute`), the patient (name opens the patient, then unit · bed · hospital), a source Badge `xs` (`purple` "AI · agent", `outline` "Device · Monitor" / "Rule · …" / "Clinician concern"), Overdue (clock icon, `foreground`, not a severity color) past the alert's `respondBy`, "Carried over from last shift". AI rows have a dashed `badge-purple-foreground` border, a "Recommendation:" line and Show evidence; a concern quotes its rationale. Actions: Open, Acknowledge, Escalate (inline form: a target, optional note), Resolve (inline form: a required reason, optional note) or, for AI, Decline (optional rationale, recorded as "Declined with rationale"). Every addressed alert says who and when ("Acknowledged by you · 10:24 AM"). Order: severity, then oldest first. Motion: rows Reveal in, fade out (`rowRemoveVariants`) while the rest glide (`layoutSpring`); the forms open with Expand; opacity only under reduced motion. Collapsed, it's a 56px rail with the active count (Counter in the top severity) and a vertical label.
- **Live feed (Oct 27, 2026; the Default story since the same day, `Static` is the still version):** the Default story plays `sample-live-scenario.ts` (synthetic, PRD SV-081) into the screen at an uneven rhythm, 2, 3, 5 and 10 s between changes in turn, and loops: vitals change, alerts change severity both ways (Medium → High, Critical → Medium), fire and resolve; feed-resolved alerts leave the queue. Sorted by Alert, cards move to their new slots with the Reorder motion pattern (MOTION.md; `reorderSpring`, the moving card raised above the others with `shadow-lg`, shared PanelGrid, so the Census's sort and filter moves too), highest severity first; the changed card's alert ring pulses again (Urgency). ⚠️ **Decision needed:** this is the live reorder PRD SV-013 rules out (cards move only after "Panel order changed · Update"); the story exists to compare the two (SV-OD-05). The panel keeps only the clinician's queue actions in its state (`addressed`, by alert id) over the `alerts` prop, so alerts that change from outside flow through.
- **Resolved hold (Oct 27, 2026):** when a patient's last open alert resolves (from the queue or the feed), the card keeps its slot and shows a green "Resolved" pill for 2 s while its alert ring turns green and blinks once (one Urgency pulse, `border-success`, in the shared `usePatientCardAlertRing`, so Census cards blink too), the pill fades out over 1 s (`resolvedFadeTransition`, `motionDuration.resolvedFade`), and only then does the card move to its new sort position. While held, the panel sorts the patient by the severity they just had (`useResolvedHolds` in `monitoring-panel.tsx`), so the confirmation is seen where the clinician was looking. A new alert on the patient cancels the hold. The same applies in List density (the pill fades, no ring). The live feed resolves Walker (step 2) and Johnson (last step) while each is in the first row, so the sequence is easy to see. ℹ️ Code ahead of Figma: intercept.ds draws the Resolved pill, not this sequence.
- **The alerts drive the pills:** the layout takes `alerts` (`TriageAlert[]`) and works out each card's pill from that patient's open alerts: top severity, count, and `status` (`active` until every alert at that severity is acknowledged or escalated, so the ring stops pulsing). The patients carry no `alert` of their own (`MonitoringPatient` omits it), so the queue and the cards can't disagree; filters, sort and the summary use the derived pill. Queue actions apply in the layout's state and call `onAlertAction(alertId, action)`; an app sends them to Clinical Alerting and passes the updated alerts back. Escalation targets come in as `escalationTargets`; without any, rows don't offer Escalate.
- ⚠️ **Pending:** draw the queue (rail, row, inline forms, collapsed rail) in intercept.ds, then extract it into a UCL component (PRD SV-083). ⚠️ **Decision needed:** response targets (OD-15; the sample sets `respondBy` per alert), a concern's severity (SV-OD-13), escalation targets per role (SV-OD-08), and whether the queue and the Alert Queue page both exist (SV-OD-03).
- **Not built yet:** the focus view, the bedside camera, live value updates from the simulator, data freshness and new-alert announcements (PRD SV-030–SV-031, SV-050, AC-02). The exploration shows them.

## DropdownMenu (`src/components/overlays/dropdown-menu/dropdown-menu.tsx`)

**Rule (Oct 27, 2026, code ahead of Figma):** shadcn's current DropdownMenu (new-york-v4) on `@radix-ui/react-dropdown-menu`, with all its parts, built for Monitoring's View menu (since replaced by buttons) and used by the All / My patients pill. It looks and moves like Select's list, so the two menus match, and it took Select's resync the same day: at least 200px wide, 10px `rounded-input`, `border`, `bg-popover`, `shadow-xl` (submenus too), 4px inner padding; items `rounded-md` (6px, concentric), 14px medium (as Select's), `focus:bg-accent`, icons 16px in `icon`. Labels and separators are Select's (28px label, 12px `muted-foreground`; separator `-mx-1`). Rows are 2px apart, as in Select (the surface, Group and RadioGroup are flex columns with `gap-0.5`). Checkbox and radio items are laid out like SelectItem (Oct 27, 2026, user's call): the label at the item's 8px edge and a 16px check at the right (`pr-8`, indicator at `right-2`) when on; a radio item uses the check too, as Select marks its chosen value, not shadcn's dot. Differs from shadcn, whose indicators sit in a left column that indents every label. Destructive items use `destructive` with a `destructive-subtle` focus fill. Motion: Select's surface (fade + grow from `motionScale.popIn` + `motionDistance.subtle` in from the trigger's side), reduced to a fade; the exit is instant (Radix unmounts it). No `cursor-default`: items take the global pointer. ⚠️ **Gap:** intercept.ds has no menu. Action: draw it with Select's list, then resync.

## Button circle variant (`src/components/buttons/button/button.tsx`)

**Rule (Oct 27, 2026, named by the designer):** when a request says "button circle variant", it means Button `variant="circle"`: a white, fully round button floating over a dark or busy surface, usually icon only. It's intercept.ds Button (Type=Icon, Size=md · 32, Style=Solid, Tone=Brand) with its fill and radius overridden: fill `colors/white`, radius full (36 in Figma), icon `colors/foreground/foreground`. First use: PatientMonitoringCard's full / condensed monitor button (`patient-monitoring-card` Hover, `1149:3780`).

- **Code:** `rounded-full bg-(--white) text-(--gray-700)`, i.e. the `white` and `gray-700` primitives rather than `background` / `foreground`, so it keeps the same light look in dark mode, where `foreground` turns light and the icon would vanish on the white fill. A `compoundVariants` entry keeps it round at every size; at 32px use `size="icon-sm"`. Hover is `gray-100` (code only: Figma has no hover state for it).
- ⚠️ **Pending:** make it a real Style in intercept.ds's Button set, so the instances stop being overrides.

## Counter: Badge's look, tighter (`src/components/data-display/counter/counter.tsx`)

**Rule:** Counter follows intercept.ds `counter` (`1092:4013`). Built Oct 26, 2026; resynced the same day when Figma added the Tone axis. It's its own component rather than a Badge size, because its padding and 20px size differ from Badge's.

- **Variants:** Badge's names for the Default tone: Solid → `default` (`bg-primary`), Flat → `secondary` (`bg-neutral-muted`, `text-foreground`; Flat · Message looks the same), Outlined → `outline` (`border-border`). The Solid severities use PatientCardAlert's names and tokens: `critical` / `high` / `medium` / `low` (`bg-severity-*`, Figma `alerts-patient/*`) and `resolved` (`bg-success`), all with `text-severity-foreground`.
- **Sizes:** `xxs` 20px (default) and `xs` 24px, from the 18px line, 1px border and 0 / 2px vertical padding. Below the control scale (SIZE-SCALE.md), so they keep Figma's names. Padding is 5px, so one digit is a 20px circle at `xxs`; numbers are tabular, and the minimum width is 20px.
- **States:** Figma briefly drew Default / Active / Disabled; the set now has only Active, which is what the variants render. No state API.
- **`max`** is code-only: Figma draws "#". `count={120} max={99}` shows "99+".
- ⚠️ **Pending (Figma slip?):** at `xs`, the Default tones (Solid, Flat, Outlined) use 6px padding and the severities 5px (22 vs 20px wide). UCL follows Figma literally. Action: confirm which padding xs should use.
- ✅ **Resolved (Oct 26, 2026 sync):** `--brand` is now denim-500 (#1160e8) and `--warning` warning-500 (#f37a00), matching intercept.ds's `tone/brand/brand` and `alerts-patient/medium`.

---

## Tabs: shadcn's default variant, sliding active fill (`src/components/navigation/tabs/tabs.tsx`)

**Rule:** Tabs follows shadcn's Tabs (structure, API, Radix behavior) and intercept.ds `Tabs Groups` (`1091:94`) and `Tabs Items` (`1090:54`) for the skin. Built Oct 26, 2026, default variant only.

- **List:** `bg-background-subtle` (`background/subtle`), `rounded-button-md` (10px, `radius/button/md`; 8px `radius/2` before the Oct 27, 2026 resync), 3px padding, 36px (`md`) or 40px (`lg`).
- **Trigger:** `rounded-lg` (`radius/menu/item`), 6px icon gap, a 16px icon, semibold label (Figma, second Oct 26 resync; medium before). Per size, set from the list's `data-size`: `md` is `px-2.5` with sm (14/20), `lg` is `px-3` with base (16/24) in a 34px trigger. Figma draws the lg label with a "normal" line height; UCL keeps base's 24px, which centers the same in the full-height trigger. Default is `muted-foreground`; Hover and Active are `foreground`; Active adds `bg-background` and two centered 2px blurs on the shadow colors (`shadow-[0_0_2px_var(--shadow-color-sm),0_0_2px_var(--shadow-color-md)]`, Figma's `shadow/sm` 5% + `shadow/md` 10%); Disabled is 50% opacity.
- **Differences from shadcn:**
  - Sizes are `md` / `lg` (SIZE-SCALE.md), not a fixed `h-9`.
  - Triggers are `h-full`, as Figma fills the list. shadcn's `h-[calc(100%-1px)]` and transparent border make room for a dark-mode border Figma doesn't draw.
  - UCL's focus ring (Button's), no `dark:` overrides (tokens cover dark mode).
  - The active fill is one `motion.span` with a shared `layoutId` on `layoutSpring` that slides between triggers (MOTION.md "Tabs"), instant under reduced motion. To know the active tab, Tabs keeps the value in context, controlled or not. A trigger outside a Tabs gets no fill.
- ✅ **Resolved (Oct 26, 2026):** Figma names the 36px size `ms - 36 (default)`; it's `md`. The `lg - 40` Tabs Groups was first drawn 36px tall; UCL used 40px, as its name and SIZE-SCALE.md say, and Figma now draws it 40px too.
- **Line variant (built Oct 26, 2026, third resync):** no track, a 4px gap, list 36/40px. Triggers are `px-2.5` at both sizes, semibold, with the same label colors as the default variant. Active is a 2px `foreground` underline. Each line trigger reserves it with a transparent 2px bottom border (right border when vertical), so labels don't shift; Figma draws the border on the active tab only. Disabled is a `foreground-subtle` label (Figma `foreground/subtle`, gray-400) with no opacity, unlike the default variant's 50% opacity. The underline is the same sliding `layoutId` element as the default variant's fill.
- ✅ **Resolved (Oct 26, 2026):** the second resync drew Line's disabled state as 50% opacity at md and a lighter label at lg. The third resync uses the lighter label at both sizes, and UCL follows it.
- ℹ️ The variant and size set the trigger's padding (`tabsTriggerVariants` compound variants: default md `px-2.5`, default lg `px-3`, line `px-2.5`), so TabsList passes them to its triggers through context.
- ✅ **Resolved (Oct 27, 2026, fourth resync): the active tab's shadow.** Figma's component description still says `shadow-xs`, but the drawn effect is two centered 2px blurs; UCL follows the drawing (user's call). `tabsIndicatorVariants` is exported, so other controls on the Tabs track (Monitoring's density toggle) use the same raised fill. ⚠️ **Pending:** correct the description in intercept.ds `Tabs Items` (`1090:54`).
- **Counter in a tab (Oct 27, 2026):** Figma's Line tabs can show an outlined Counter (xxs) after the label, in `muted-foreground` until the tab is active, then `foreground` (hover leaves it muted). The trigger styles a nested `[data-slot=counter][data-variant=outline]` that way; other Counter variants (e.g. HospitalTabs' severity counts) keep their own colors. Figma also adds an optional 8px alert-color dot before the label; it's a child like the icon, no API. **Label / icon (Oct 27, 2026):** Figma's `Show label` and `Show icon` booleans (label only, icon only, both) are the trigger's children in code, as in shadcn, not props: an icon-only tab passes the icon alone, keeps the same padding, and needs an `aria-label` (`IconOnly` story).
- ℹ️ **Disabled (Oct 27, 2026):** the fourth resync's set has no Disabled state (Default, Hover, Active only). UCL keeps its disabled styling (50% opacity, a lighter Line label): code ahead of Figma. ⚠️ **Pending:** draw Disabled back in intercept.ds or confirm it's dropped.
- **Focus ring only from the keyboard (Oct 26, 2026):** clicking a tab showed the focus ring in Chrome: it sometimes matches `:focus-visible` on a mouse click here (Radix's roving focus; the first click on a page, and every later tab click). TabsTrigger marks itself `data-pointer-focus` on pointer down and clears it on any key press or blur; the ring is `focus-visible:not-data-pointer-focus:ring-2`. Arrow keys and Tab still show it. Don't swap it back to plain `focus-visible:`.

---

## Patient card (`src/components/cards/patient-card/patient-card.tsx`)

**Rule:** PatientCard, PatientCardAlert and PatientCardMetric follow intercept.ds `patient-card` (`1058:2360`), `patient-card-alerts-badge` (`1060:3605`, renamed from `patient-card-alerts-icon`) and `patient-card-metrics` (`1053:4684`). Built Oct 26, 2026. The product spec is [prds/patient-card.md](prds/patient-card.md).

- **Layout (Figma):** 16px padding and 12px gaps, `rounded-card` (16px, `radius/card`), `border`, `shadow-sm`. The padding is 15px plus the 1px border, because Figma draws the stroke inside. The acuity and vitals rows have 8px × 12px padding with `border-muted` rules. The acuity row has no gap; the vitals row has 8px. Tags are Badge `outline` `sm`. The "…" is Button `ghost` `icon-sm` (32px).
- **Long content (Oct 26, 2026):** nothing on the card truncates except the hospital name. The name and identity line wrap, so a clinician always sees who the patient is. In the location line the hospital truncates (full name in `title`), and the unit, room and bed always stay visible.
- **Acuity levels never reuse alert words (Oct 26, 2026):** `acuity.level` is a fixed list (`low` | `moderate` | `high` | `critical` | `unknown`) shown as **Low risk**, **Moderate risk**, **High risk**, **Critical risk** and **Unknown**, so no acuity label matches an alert severity (Critical / High / Medium / Low). "Risk" follows NEWS2's own wording ("low / medium / high clinical risk"). Colors stay as before, as pale Badge tones: `secondary` (Low, and Unknown with muted text), `yellow`, `amber`, `red`; alerts keep their solid pills with a bell. Without a score the level is Unknown and the score shows "--". ⚠️ **Breaking:** replaces the free-text `acuity.category` (`{ label, variant }`). ⚠️ **Decision needed:** the clinical lead confirms the wording (OD-03, OD-05); PRD PC-030 and prds/glossary.md still list the bare category names. ℹ️ A neutral color ramp for acuity was tried and dropped the same day: the colors stay.
- **Alert ring pulses until clicked (Oct 26, 2026, code only):** the severity border is no longer the card's own border: a constant 2px ring with a 5% tint of the severity color (`AlertRing`) sits over the card's 1px `border` and white background, behind the content (the card is `isolate`, the ring `-z-10`), so nothing shifts and text isn't tinted. While the alert is active it pulses with the **Urgency** motion pattern: its opacity rises on a spring with no overshoot (`settleSpring`), so the border goes from the 1px `border` to 2px in the severity color and the background from `card` to the 5% tint together; it rests 1.4s, fades out (`standardTransition`), stays calm 0.4s and repeats. **Every active ring pulses at the same time** (one shared clock, `useUrgencyPhase`). It stops when the user **clicks the card** (anywhere, captured), or when the alert is addressed (`alert.status` `acknowledged` or `escalated`, PRD PC-071); a new severity pulses again. When the alert stops being a severity (e.g. it's resolved) the ring fades out. While an interactive card is hovered the ring hides, so the `foreground` hover border shows. Static under reduced motion. ℹ️ Only opacity animates: an animated border width steps a whole pixel and looks like a jump; a scale spring-out and an overshoot were tried and removed the same day.
- **Alert count (Oct 26, 2026):** a card with more than one active alert shows how many on its pill, "Critical · 3": the severity of the worst one and the total. One alert shows no number, even when `count` is 1. Screen readers hear "Critical 3 alerts" (the dot is hidden, "alerts" is `sr-only`). HospitalSectionHeader's "N alerts" adds these up, so Harbor Point with Miller (· 3) and Harris (1) reads "4 alerts".
- **Compact is the default (Oct 26, 2026):** `variant` defaults to `compact`; pass `variant="expanded"` for the metrics row. ⚠️ **Breaking:** apps that relied on the old default render compact cards until they set `expanded`. The Census layout uses compact.
- **Hover (Oct 26, 2026; intercept.ds `patient-card` `1108:3863` and `patient-card-compact` `1108:3964`, Variant2):** interactive cards only (`onOpen` / `href`). The border goes from 1px `border` to 2px `foreground` (`colors/foreground/foreground`) and the shadow from `shadow-sm` to `shadow-lg` (effect styles of the same names), over 160ms, with the padding at 14px so nothing shifts; the Lift (-3px) stays. ✅ **Resolved (Oct 26, 2026):** the hover border is `foreground` on every card, so a severity border turns `foreground` too while hovered (the alert pill keeps the severity). ℹ️ Figma names the state "Variant2"; renaming it "Hover" would help the next sync.
- **Compact variant (Oct 26, 2026):** intercept.ds `patient-card-compact` (`1108:3585`) is PatientCard `variant="compact"`, not a separate component, so both variants share one data model (PRD PC-001). The vitals move from their own row to one line 4px under the location: a 16px `square-activity` icon (`icon-muted`), then "HR: 77 · MAP: 83 · …" in sm medium, labels and separators `muted-foreground`, values `foreground`. Each vital's `shortLabel` gives the abbreviation (defaults to `label`). The line wraps rather than truncates. Everything else matches `expanded`.
  - ✅ **Resolved (Oct 26, 2026):** Figma draws only normal readings on the compact line. UCL gives out-of-range and missing readings the expanded card's treatment: a `destructive` value with its ↑/↓, or "--" in `muted-foreground`, with the same screen-reader words. Code ahead of Figma; add the state to the Figma component.
- **Severity border (Oct 26, 2026, code ahead of intercept.ds):** an `alert` of `critical` / `high` / `medium` / `low` gives the card a 2px `border-severity-*` border, with the padding at 14px so content stays 16px in. Intercept-Live's Census draws it as overrides on the library card, so it isn't in intercept.ds's `patient-card` yet. Action: add it to the Figma component. `resolved` and `message` keep the plain border.
- **Trend color (Oct 26, 2026):** PatientCardMetric's `trendVariant` colors only the ▲/▼: Census draws a rising SOFA in `critical` and a falling one in `success`. ⚠️ **Decision needed:** PRD PC-030 says a falling score is "never a good-news green"; the Census design uses green. Confirm with the clinical lead which wins.
- **Interaction (PRD PC-100):** with `onOpen` or `href`, the name is the card's one open control, and its `::after` covers the card. A click anywhere opens the patient, the focus ring outlines the whole card, and the "…" button (`z-10`) keeps its own target. The card lifts on hover (MOTION.md "Lift"), but not under reduced motion and not when it's static.
- **Alert pill (resynced Oct 27, 2026 from `patient-card-alerts-badge`, the renamed `1060:3605`):** 28px (`py-1` around the 20px line), `pl-2 pr-2.5`, 6px between icon and label, a 14px bell (16px for the `message` icon), sm medium label; "· n" 4px after the label. It was 32px, `pl-2.5 pr-3`, a 7px gap and a 16px bell before. Colors unchanged. The icon is lucide `BellRing`; the `message` variant uses `MessageCircleSolidIcon` (archielabs.ds `6158:10412`) on `neutral-muted` with `neutral-prominent` text.
- **Metric:** label xs medium, value xl semibold, arrows base, 2px gap. `default` has a `muted-foreground` label and a `foreground` value. `destructive` and `success` color the label too, as Figma draws them. `missing` shows "--" in `muted-foreground`, with "Not monitored" for screen readers. Every arrow has a screen-reader word.
- **New tokens (Oct 26, 2026):**
  - `--badge-yellow` (corn 100/800, dark 950/300) and `--badge-amber` (flamingo 100/700, dark 950/300), as Figma binds them. They use a 100 fill where the other tones use 50. The flamingo primitives come from archielabs.ds `palettes/flamingo/*`.
  - `--severity-critical | high | medium | low` and `--severity-foreground` (white). `--neutral-prominent` (`tone/neutral/prominent`: gray-600, dark gray-700). `--radius-card` (`radius/card`, 16px).
- ✅ **Resolved (Oct 26, 2026):** the identity line reads "{MRN} - {sex}, {age}" and the location "{hospital} · {unit} · {room} - {bed}", as Figma writes them; missing parts drop out. The acuity category badge takes its variant from the app (Moderate is `yellow` in Figma), because category colors still need clinical approval (PRD OD-03).
- ⚠️ **Pending:** intercept.ds now binds the severities to `alerts-patient/critical | high | medium | low | resolved | message` (Oct 26, 2026), same values as `--severity-*`, but the collection has a single mode, so `--severity-*` still hold one value for both modes. Action: add intercept-dark values to `alerts-patient/*`, then sync them.
- ⚠️ **Accessibility:** white 14px labels on the High, Medium and Low fills are under 4.5:1 (about 3:1). Action: design review of the severity fills or label color.
- ✅ **Resolved (Oct 26, 2026 sync):** `--warning` is warning-500 (#f37a00) and `xl` is 20/28, as archielabs.ds has them, so the card is 309px tall as in Figma.
- **Not built (no Figma state yet):** the hidden "Avatar / Users" (PRD PC-010), the metric's Stale and Loading states (named in Figma's description, not drawn), and the PRD's Compact/Expanded variants. Add them when Figma draws them.
- ✅ **Resolved (Oct 26, 2026):** the 36px Button now uses Figma's 10px radius (see "Button md follows intercept.ds lg · 36").

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

A **page title** is Figma's `3xl/3xl -semibold` ("Page Title"). It's still the page's `h1`: write `<Typography as="h1" size="3xl">`, which keeps `h1`'s semibold. A modal title uses the plain `h1` default.

**Why:** the Figma text style descriptions are the source. Without set defaults, every heading picks a plausible size by eye. ✅ **Resolved in Figma (Oct 20, 2026):** the designer tagged all four levels, at semibold. They had been a product decision at bold (only `h1` was tagged, as `2xl/2xl -bold`), so the sync moved every default from bold to semibold. The "Page Title" tag then moved from `3xl/3xl -bold` to `3xl/3xl -semibold` too, so a page title needs no `weight`.

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
- **Third sync (Oct 26, 2026):** 91 mapped tokens × 2 modes (182 values) plus the primitives. 28 drifted, all from a reworked intercept mode, and now match (a re-run found 0 drift):
  - **Brand → `denim`** (new palette): `brand` denim-500 (#1160e8), `brand-subtle` / `-muted` / `-defined` 50 / 100 / 300; dark 400, 900 / 800 / 600. `primary`, `secondary`, `icon-brand` follow. `on-brand` is white in intercept-dark too. Catalina stays for `ring`, `ring-outside`, `link`, `highlight` and `sidebar-active`.
  - **`foreground`** gray-800 → gray-700 (card, popover, accent, sidebar and emphasis foregrounds follow).
  - **`foreground/muted` ↔ `/subtle` swapped back** in intercept: `muted-foreground` gray-500, `foreground-subtle` gray-400 (dark unchanged: 400 / 500). Every component class was swapped with them, so usages keep their Figma variable and light mode looks the same.
  - **Warning:** primitive warning-500 is now #f37a00 and `--warning` uses it (dark keeps warning-400); `warning-subtle` / `-muted` use the new `amber` palette (50 / 100). **Info:** `info-subtle` / `-muted` are info-50 / -100. `neutral-defined` is gray-400.
  - **Type:** `lg` 18/26 and `xl` 20/28 (were 28 and 30); the other nine sizes matched.
  - ℹ️ Figma stores alias opacities as percentages (`opacity: 15`), not fractions; a resolver must divide by 100.
  - ℹ️ No archielabs.ds source (kept as is): `--severity-*` (intercept.ds `alerts-patient/*`) and `--badge-yellow` / `-amber` (+ foregrounds), which intercept.ds aliases straight to corn and flamingo.
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
| `--shadow-card` | effect style `shadow/card` (intercept.ds) | 0 4px 30px, black 8%. Raw value, as in Figma. Unused since Oct 26, 2026 (SidebarTooltip moved to `shadow-xl`); kept because removing a token is breaking. ⚠️ **Gap:** effect styles belong in archielabs.ds; this one was found in intercept.ds |
| `--avatar-1` … `--avatar-10` | intercept.ds `avatar` i1–i10 fills (raw hexes) | #335fb6, #33b677, #9e33b6, #b9ae11, #b66333, #029cc2, #d957c8, #268d11, #c3282b, #019aff. Same in both modes. ⚠️ **Gap:** no variables yet (see "Avatar") |
| `--success-glow` | intercept.ds Header's Online dot ring (raw) | #53ff86. ⚠️ **Gap:** no variable yet (see "AppHeader") |
| `--monitor-*` | none yet (draft, PatientMonitoringCard) | `monitor` graphite-950, `monitor-grid` white 8%, `monitor-foreground` graphite-300, `monitor-ecg` / `-spo2` / `-abp` / `-resp` green / teal / violet / warm white. Same in both modes. `monitor-*-ink` (Oct 27, 2026): the same parameters as text on the page's surfaces (Monitoring's List view), L 0.48 (resp 0.45) in intercept mode for ≥4.5:1 on white, the monitor colors in intercept-dark. ⚠️ **Decision needed:** SV-OD-10 |
| `--badge-<tone>` / `-foreground` (`blue`, `green`, `sky`, `purple`, `red`) | `colors/badge/<tone>/background` / `colors/badge/<tone>/foreground` | Badge category tones, created in archielabs.ds Oct 21, 2026 (web code syntax set). Light modes (intercept, Archie, Itopia) alias the 50 fill and 700 label; dark modes the 950 fill and 300 label. Primitives `--<color>-50/300/700/950` = `palettes/<color>/<step>`: blue, green, purple and red are Tailwind's (new); sky is the file's existing `palettes/sky`, so the Sky badge differs slightly from the first drawn hex. All pairs ≥ 4.5:1. ✅ **Resolved (Oct 26, 2026):** the intercept.ds badge set now binds `colors/badge/<tone>/*` (Yellow and Amber bind `palettes/corn` and `palettes/flamingo` directly) |
| `--radius`, `--radius-input`, `--radius-menu`, `--radius-card` | `radius/default`, `radius/input`, `radius/menu/container`, `radius/card` | Only the component radii a built component uses |

### Deliberately not mirrored

- **Primitives as utilities:** only the palettes intercept mode references (gray, catalina, denim, elf, corn, amber, info, success, warning, destructive, plus flamingo and the badge steps of blue, green, sky, purple and red) are declared, as `:root` variables, not as Tailwind colors.
- **Font weights:** `font-weight/*` in intercept mode are 300–900, Tailwind's defaults, so they aren't redefined.
- **Not synced yet:** `code/*`, `decorative/decorative-1`, `linear-1A/1B`, the `components` collection, the other `radius/*` component radii (button 10px, card 12px, badge and chip full), the `Sonner` effect style, `paragraph-gap/*` and `breakpoint/width|height`. Add each with the component that needs it.

### Intercept mode values that look like Figma slips

⚠️ **Decision needed (designer):** mirrored as Figma has them:

- ✅ **Resolved (Oct 26, 2026 sync):** `foreground/muted` and `/subtle` were swapped in intercept mode. Figma now has muted = gray-500 (`muted-foreground`) and subtle = gray-400 (`foreground-subtle`); intercept-dark keeps muted gray-400 and subtle gray-500. Every component class was swapped with the tokens, so each usage follows the Figma variable it binds and light mode looks the same. ⚠️ **Accessibility:** `foreground-subtle` (gray-400) is still 2.6:1 on white (placeholders, disabled labels).
- ✅ **Resolved (Oct 26, 2026 sync):** `tone/info/subtle` / `/muted` are now info-50 / -100, and `tone/warning/subtle` / `/muted` use the new `amber` palette (50 / 100), like every other tone.
- ⚠️ **Accessibility:** `input/border` (gray-200) is 1.3:1 on white, under 3:1 for a control's boundary. It also colors the Switch's off track. Same value as Archie mode.
- ✅ **Resolved in Figma:** the earlier slips are gone. Emphasis is set (corn), success, disabled and sidebar-hover now suit a light theme, `icon/brand` is the brand color, and all three button labels pass (primary 13.3:1, secondary 11.88:1, destructive 5.78:1).

### Storybook chrome (`.storybook/theme.ts`)

Storybook's own theme (sidebar, docs pages) takes hex values, not CSS variables. `.storybook/theme.ts` copies the intercept values of `--background`, `--background-subtle`, `--foreground`, `--muted-foreground`, `--border`, `--input`, `--brand` and `--link`. Change them together. The toolbar's Theme switch previews stories in `intercept-dark`; the Storybook chrome stays light.

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

**Neutral grays (Oct 26, 2026):** dark surfaces read too blue: the `gray` primitives carry chroma 0.016–0.035 at hue ≈260, invisible in light mode but strong across large dark areas. A new primitive scale, **`graphite`** (50–950), keeps gray's lightness steps at a quarter of its chroma (canvas 0.035 → 0.009), and every `intercept-dark` token that used `gray-*` now uses the same `graphite-*` step: the 35 `.dark` overrides plus `input-ring` (graphite-400; light keeps gray-400). Read "gray" as "graphite" in the table above for dark mode. Lightness is unchanged, so every contrast ratio here still holds. Light mode, other brands and the brand-tinted tokens (links, focus ring, `highlight`, `sidebar-active`, the secondary Button's `brand-subtle`) are untouched. The `gray` primitives aren't edited because they're shared with light mode and with Archie.

⚠️ **Pending (Figma):** mirror it in archielabs.ds: (1) add `graphite/50` … `graphite/950` to the primitives collection with the values in `theme.css`; (2) in the `semantic` collection's **`intercept-dark` mode only**, rebind each variable that aliases `gray/*` to the same `graphite/*` step, and `input/ring` to `graphite/400`. Not done yet: the cloud Figma MCP was disconnected (Oct 26, 2026). Until then, a `ucl-ds-sync` run would report these 36 tokens as drift: keep `theme.css`, update Figma.

**Why:** Intercept's light brand (catalina-800) is too dark to see on a dark page, so the dark brand steps up to catalina-400 with a dark label, as Archie-dark does with `on-brand` gray-950. Archie-dark's slips were not copied: `active-alt` is gray-800 (not white), `icon/brand` is the brand color, and every tone's `subtle` → `muted` → `defined` gets lighter in the same direction.

**How to apply:**

- ⚠️ **Decision needed (designer):** review the mode in Figma. These are UCL's proposal, not a designer's. When the designer changes a value, run `ucl-ds-sync`; Figma wins.
- `states/highlight` and `sidebar/active` are raw catalina-400 at 15% and 20%. The Plugin API can't write Figma's alias-with-opacity format, which the light mode uses.
- A new semantic variable needs an `intercept-dark` value in Figma and, if it differs from light, a line in `.dark`.

---

## Chart colors: brand hues, never status hues (`--chart-*` in `src/styles/theme.css`, Figma `chart/*`)

**Rule:** the five chart colors are for series identity only (which patient, metric or group). They come from Intercept's palettes and avoid red, orange and green, so a data series never reads as a clinical state. Set from UCL on Oct 21, 2026, at the user's request, in both `intercept` and `intercept-dark`.

| Token | Hue | intercept | intercept-dark | Contrast (white / gray-900 card) |
| --- | --- | --- | --- | --- |
| `chart-1` | brand indigo | catalina-500 | catalina-500 | 5.33 / 3.03 |
| `chart-2` | teal (accent) | elf-500 | elf-500 | 3.37 / 4.79 |
| `chart-3` | plum | oklch(0.45 0.17 325) | oklch(0.55 0.17 325) | 8.18 / 3.03 |
| `chart-4` | violet | oklch(0.66 0.17 290) | oklch(0.66 0.17 290) | 3.28 / 4.91 |
| `chart-5` | gold (emphasis) | corn-600 | corn-600 | 3.48 / 4.63 |

**Why:**

- In a clinical interface red, amber and green already mean critical, caution and normal (`destructive`, `warning`, `success`). A series in one of those hues would make a healthy trend look like an alarm, or the reverse. The old palette (violet, magenta, sky, yellow, light green) had a green series and no link to the brand.
- Plum and violet are new hues with no primitive ramp. They are raw values, like the other chart variables in this shared file, and fill the gap between catalina and the status hues.
- The order was picked by running the dataviz validator (OKLab ΔE ×100, Machado 2009 simulation) on every ordering. In both modes every adjacent pair clears ΔE 8 for color-blind vision (worst 8.7, plum ↔ elf in dark) and ΔE 15 for normal vision, every color is at least 3:1 on its surface, and the first three slots also pass when any two can touch (scatter plots).
- The dark mode keeps catalina-500 rather than the dark brand (catalina-400): at 400 the brand and violet slots are too close to tell apart. Only plum gets a lighter dark step, to reach 3:1 on the gray-900 card.

**How to apply:**

- Assign slots in order (`chart-1`, then `chart-2`…) and keep a series on its color when filters change the count. A sixth series becomes "Other" or a second chart, never a new color.
- Clinical states (out-of-range values, alerts, threshold bands) use the status tokens, always with an icon or label, never a chart slot. Reference ranges and baselines use neutral grays.
- ⚠️ **Constraint:** `chart-5` (gold) sits close to `warning` (ΔE 8.4 in light). Use it only when a chart needs five series, and always direct-label it. In scatter plots and small multiples, keep to the first three slots.
- ⚠️ **Accessibility:** never rely on color alone. Charts carry a legend (two or more series), direct labels where they fit, and a table view.
- ⚠️ **Decision needed (designer):** UCL's proposal, not a designer's. When the designer changes a value in Figma, run `ucl-ds-sync`; Figma wins.
- In Figma, `colors/charts/chart-1`, `-2` and `-5` alias `palettes/catalina/500`, `elf/500` and `corn/600` in both intercept modes; `chart-3` and `-4` are raw. Only the two intercept modes were written. ℹ️ The variables are still `ALL_SCOPES` with no code syntax; scopes are per variable, not per mode, so changing them would also touch the Archie and Itopia modes.

---

## Native controls follow the mode: `color-scheme` (`src/styles/theme.css`)

**Rule:** `:root` sets `color-scheme: light` and `.dark` sets `color-scheme: dark` (Oct 26, 2026), so the browser draws scrollbars, native form controls and autofill in the current mode. Without it, a dark page kept light scrollbars. Ships to consumers.

## Semantic tokens are declared on `:root, .dark` (`src/styles/theme.css`)

**Rule:** the intercept (light) semantic block uses the selector `:root, .dark`, not just `:root`. The `.dark` block after it overrides only the values that differ.

**Why:** many tokens are aliases, such as `--primary: var(--brand)`. A custom property's `var()` resolves on the element that declares it, and descendants inherit the result. If the aliases were declared only on `:root` and `.dark` were applied to a wrapper below `<html>` (a Storybook preview, a dark section, the Colors page's dark column), `--primary` would keep the light brand inside it. Redeclaring the aliases on `.dark` makes them resolve against the dark values there. Same rule as archie-ucl.

**How to apply:** add new semantic tokens to the `:root, .dark` block. Add them to `.dark` too only when the dark value differs. Keep `.dark` after the shared block, because both selectors have the same specificity. Primitives stay in plain `:root`.
