# UCL component conventions (for ucl-generate-component and ucl-generate-layout)

How a component in `src/components/<category>/<component-name>/` is written, so new code is indistinguishable from hand-written code. Project specifics are in CLAUDE.md ("Code style", "Creating a Custom Component", "Current Component APIs", "Theme & Tokens") and DESIGN.md — read those first; they win over this file.

## File layout

- Component: `src/components/<category>/<component-name>/<component-name>.tsx` (kebab-case folder + file).
- Stories: `<component-name>.stories.tsx` in the same folder.
- Docs page (optional): `<component-name>.mdx` in the same folder, when the component needs usage guidance beyond props.
- Local export: `index.ts` re-exports the component, its `<name>Variants`, and any prop types.
- Top-level export: the same names from `src/index.ts`, under the category's comment banner.
- Categories: the list in CLAUDE.md → "Architecture". Don't invent one without asking.
- Name: kebab-case folder/file, PascalCase export, `<name>Variants` for the `cva` (e.g. `Badge` + `badgeVariants`).

## Component skeleton

Follow CLAUDE.md → "Code style" for indentation and quotes. Use `buttons/button/button.tsx` as the living reference.

```tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot"; // only if asChild is needed
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const <name>Variants = cva(
	"…base classes shared by every variant…",
	{
		variants: {
			variant: {
				// label each key with its Figma variant name
				default: "…",
			},
			size: {
				default: "…",
			},
		},
		defaultVariants: { variant: "default", size: "default" },
	},
);

type <Name>Props = React.ComponentProps<"div"> &
	VariantProps<typeof <name>Variants> & {
		asChild?: boolean;
	};

/** One-line JSDoc: what this component is + its Figma origin. */
function <Name>({
	className,
	variant = "default",
	size = "default",
	asChild = false,
	...props
}: <Name>Props) {
	const Component = asChild ? Slot : "div";

	return (
		<Component
			data-slot='<name>'
			data-variant={variant}
			data-size={size}
			className={cn(<name>Variants({ variant, size, className }))}
			{...props}
		/>
	);
}

export { <Name>, <name>Variants, type <Name>Props };
```

## Breakpoints

See DESIGN.md "Breakpoints include their own width". In short: `lg:` means **above** the lg frame width, `max-lg:` means at it and below. Write the usual `sm:`…`3xl:` classes, never an arbitrary `min-[…px]:` for a standard breakpoint. JS media queries use `mediaAbove()` + `useMediaQuery()`.

Design mobile-first: base (smallest) styles unprefixed, then `md:`/`lg:` overrides, e.g. `grid-cols-1 md:grid-cols-[0.75fr_1fr]`. A one-off breakpoint Figma actually specifies uses bracket syntax (`min-[825px]:flex`); otherwise reuse the nearest standard prefix.

## Established vocabulary to reuse

- **Tokens:** read `src/styles/theme.css` for the current semantic roles (`primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `input`, `ring`, …), radii and any brand ramps. Use them via Tailwind utilities — never raw hex/px.
- **Component APIs:** CLAUDE.md → "Current Component APIs" lists every component's variant keys, sizes and props. Mirror those names when the concept matches; a new name for an existing concept is a bug.

## Translation rules (Figma → clean UCL)

- **Variant matrix → `cva` groups.** Reuse existing variant keys when the meaning matches. New axis/value with no equivalent → ask before naming.
- **Interaction states are utilities, not variants:** `hover:…`, `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`, `disabled:pointer-events-none disabled:opacity-50`, `aria-invalid:border-destructive`. Match the focus treatment the existing components use.
- **Cursor:** if DESIGN.md defines a global cursor rule, don't add per-component `cursor-*` classes. Otherwise follow what the existing components do.
- **Strip Figma auto-layout noise:** drop `mr-[-7px]`, `content-stretch`, wrapper padding, `data-node-id`. Re-express with `inline-flex items-center`, `gap-*`, `px-*`/`py-*`, `h-*`/`size-*`.
- **Hover-darken:** `hover:bg-[color-mix(in_srgb,var(--primary)_90%,black)]` — not `/90` opacity, which lightens on light fills.
- **Icon slots:** style icons passed into the component with direct-child or own-content selectors, and size them to Figma's instance size (DESIGN.md "Icon sizes match Figma's defined instance size", "Composed components are black boxes to their parents").
- **Spacing is pixel-accurate to Figma — never rounded to the nearest token.** Pull the exact value from `get_design_context`/`get_variable_defs` for the specific node (not a similar sibling, not another variant/state):
  - Matches a spacing token exactly → that token's utility (`gap-2`, `p-6`).
  - Matches no token → arbitrary class (`gap-[2px]`, `pl-[13px]`). See [DESIGN.md "Gaps, margins and padding match Figma's literal value"](../../../../DESIGN.md#gaps-margins-and-padding-match-figmas-literal-value).
  - Same visual role with different values across variants → keep the difference; if it looks like a Figma slip, ask which wins.
  - Re-verify on every refine, not only on first creation.

## Stories skeleton

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";

import { <Name> } from "./<name>";

const meta = {
	title: "<Category>/<Name>",
	component: <Name>,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"], // remove when the component has its own <name>.mdx page
} satisfies Meta<typeof <Name>>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { /* … */ } };
// one story per variant/state…
export const AllVariants: Story = {
	render: () => (/* every variant × size together */),
};
```

## Verify (from the repo root)

- `npm run lint` (`tsc --noEmit`) — must pass. Renaming a `cva` variant key or exported type breaks the folder's stories, its `index.ts` and `src/index.ts`; fix them all in the same change.
- `npm run build` — must succeed.
