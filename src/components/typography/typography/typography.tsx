import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Type scale. `size` carries font-size + line-height (via the --text-* tokens)
 * plus the font assignment: sizes up to `lg` use the body font (`font-sans`),
 * `xl` and larger use the display font (`font-display`). `weight` is an
 * independent axis.
 */
const typographyVariants = cva("", {
	variants: {
		size: {
			xs: "font-sans text-xs",
			sm: "font-sans text-sm",
			base: "font-sans text-base",
			lg: "font-sans text-lg tracking-[0.01em]",
			xl: "font-display text-xl tracking-[0.01em]",
			"2xl": "font-display text-2xl",
			"3xl": "font-display text-3xl",
			"4xl": "font-display text-4xl",
			"5xl": "font-display text-5xl",
			"6xl": "font-display text-6xl",
			"7xl": "font-display text-7xl",
		},
		weight: {
			regular: "font-normal",
			medium: "font-medium",
			semibold: "font-semibold",
			bold: "font-bold",
			black: "font-black",
		},
	},
	defaultVariants: {
		size: "base",
		weight: "regular",
	},
});

type TypographySize = NonNullable<
	VariantProps<typeof typographyVariants>["size"]
>;
type TypographyWeight = NonNullable<
	VariantProps<typeof typographyVariants>["weight"]
>;

/**
 * Heading definitions. Rendering `as="h1" | "h2" | "h3" | "h4"` without
 * `size`/`weight` applies these. Pass `size`/`weight` to override for a Figma
 * frame that binds something else. See DESIGN.md "Heading element →
 * `Typography` `size` pairing".
 */
const typographyHeadings = {
	h1: { size: "2xl", weight: "semibold" },
	h2: { size: "xl", weight: "semibold" },
	h3: { size: "lg", weight: "semibold" },
	h4: { size: "base", weight: "semibold" },
} as const satisfies Record<
	string,
	{ size: TypographySize; weight: TypographyWeight }
>;

type TypographyHeading = keyof typeof typographyHeadings;

// Polymorphic via `as`, so props and ref are typed against HTMLElement rather
// than a single tag.
type TypographyProps = React.HTMLAttributes<HTMLElement> &
	VariantProps<typeof typographyVariants> & {
		ref?: React.Ref<HTMLElement>;
		/**
		 * Element to render. Defaults to a <p>. Use this for semantics, e.g. as="h1".
		 * `h1`–`h4` also default `size`/`weight` to the heading definitions
		 * (`typographyHeadings`).
		 */
		as?: React.ElementType;
	};

/** Renders text on the type scale, with heading elements defaulting to their size and weight. */
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
			className={cn(
				typographyVariants({ size: resolvedSize, weight: resolvedWeight }),
				className,
			)}
			{...props}
		/>
	);
}

export {
	Typography,
	typographyVariants,
	typographyHeadings,
	type TypographyHeading,
	type TypographyProps,
	type TypographySize,
	type TypographyWeight,
};
