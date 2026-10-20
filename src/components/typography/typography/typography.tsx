import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Intercept's typography spec. This comment, the Storybook pages "Typography/Typography" (`typography.mdx`) and
 * "Foundations/Typography" are the full record; change all three with any type token (DESIGN.md "Typography specs
 * live in three places"). Source: Figma `archielabs.ds` text styles `<size>/<size> -<weight>`, `intercept` mode,
 * values in `theme.css`.
 *
 * Fonts: Figtree for all interface text, Roboto Mono (`font-mono`) for code. Sizes up to `xl` use `font-sans`
 * (Figma `font-family/bodytext`) and `2xl` and up use `font-display` (`font-family/headline`), as the Figma text
 * styles bind them. Both are Figtree today. No letter spacing at any size.
 *
 * Sizes (`size`, the `--text-*` tokens). Font size / line height in px:
 *
 * | `size` | Font size / line height |
 * | ------ | ----------------------- |
 * | `xs`   | 12 / 18                 |
 * | `sm`   | 14 / 20                 |
 * | `base` | 16 / 24                 |
 * | `lg`   | 18 / 28                 |
 * | `xl`   | 20 / 30                 |
 * | `2xl`  | 24 / 32                 |
 * | `3xl`  | 30 / 36                 |
 * | `4xl`  | 36 / 54                 |
 * | `5xl`  | 48 / 64                 |
 * | `6xl`  | 64 / 96                 |
 * | `7xl`  | 80 / 120                |
 *
 * Weights (`weight`): Tailwind's defaults, which match Figma `font-weight/*` in intercept mode:
 *
 * | `weight`   | Utility         | Value | Figma           |
 * | ---------- | --------------- | ----- | --------------- |
 * | `regular`  | `font-normal`   | 400   | `<size>/<size>` |
 * | `medium`   | `font-medium`   | 500   | `-medium`       |
 * | `semibold` | `font-semibold` | 600   | `-semibold`     |
 * | `bold`     | `font-bold`     | 700   | `-bold`         |
 * | `black`    | `font-black`    | 900   | `-black`        |
 *
 * Headings (`typographyHeadings`, below): `h1` 2xl bold ("h1, Modal Title"), `h2` xl bold, `h3` lg bold, `h4` base
 * bold. Page title: `as="h1" size="3xl"` (Figma "Page Title", 3xl bold).
 *
 * Color is never part of Typography: pass a text token in `className` (`text-muted-foreground`).
 */
const typographyVariants = cva("", {
	variants: {
		size: {
			// Figma `font-family/bodytext`
			xs: "font-sans text-xs",
			sm: "font-sans text-sm",
			base: "font-sans text-base",
			lg: "font-sans text-lg",
			xl: "font-sans text-xl",
			// Figma `font-family/headline`
			"2xl": "font-display text-2xl",
			"3xl": "font-display text-3xl",
			"4xl": "font-display text-4xl",
			"5xl": "font-display text-5xl",
			"6xl": "font-display text-6xl",
			"7xl": "font-display text-7xl",
		},
		weight: {
			// Figma `<size>/<size>`: 400
			regular: "font-normal",
			// Figma `-medium`: 500
			medium: "font-medium",
			// Figma `-semibold`: 600
			semibold: "font-semibold",
			// Figma `-bold`: 700
			bold: "font-bold",
			// Figma `-black`: 900
			black: "font-black",
		},
	},
	defaultVariants: {
		size: "base",
		weight: "regular",
	},
});

type TypographySize = NonNullable<VariantProps<typeof typographyVariants>["size"]>;
type TypographyWeight = NonNullable<VariantProps<typeof typographyVariants>["weight"]>;

/**
 * Heading defaults. `h1` is Figma's `2xl/2xl -bold` ("h1, Modal Title"). `h2`–`h4` aren't tagged in Figma yet: they
 * step down one size each at the same weight (product decision in archie-ucl, Oct 20, 2026, same Figma file). Page titles are Figma's
 * `3xl/3xl -bold` ("Page Title"): write `as="h1" size="3xl"`. See DESIGN.md "Heading element → Typography pairing".
 */
const typographyHeadings = {
	h1: { size: "2xl", weight: "bold" },
	h2: { size: "xl", weight: "bold" },
	h3: { size: "lg", weight: "bold" },
	h4: { size: "base", weight: "bold" },
} as const satisfies Record<string, { size: TypographySize; weight: TypographyWeight }>;

type TypographyHeading = keyof typeof typographyHeadings;

type TypographyProps = React.HTMLAttributes<HTMLElement> &
	VariantProps<typeof typographyVariants> & {
		/** Element to render, `p` by default. `h1`–`h4` also default `size` and `weight` to `typographyHeadings`. */
		as?: React.ElementType;
		ref?: React.Ref<HTMLElement>;
	};

/** Text in Intercept's type scale. Pick the element for meaning with `as`, and the look with `size` and `weight`. */
function Typography({ className, size, weight, as, ...props }: TypographyProps) {
	const Component = as ?? "p";
	const heading =
		typeof Component === "string" && Component in typographyHeadings
			? typographyHeadings[Component as TypographyHeading]
			: undefined;
	const resolvedSize = size ?? heading?.size ?? "base";
	const resolvedWeight = weight ?? heading?.weight ?? "regular";

	return (
		<Component
			data-slot='typography'
			data-size={resolvedSize}
			data-weight={resolvedWeight}
			className={cn(typographyVariants({ size: resolvedSize, weight: resolvedWeight }), className)}
			{...props}
		/>
	);
}

export {
	Typography,
	typographyHeadings,
	typographyVariants,
	type TypographyHeading,
	type TypographyProps,
	type TypographySize,
	type TypographyWeight,
};
