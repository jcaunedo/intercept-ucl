import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// shadcn's Badge. Every variant has a 1px border (transparent unless `outline`) so sizes match. Hover only applies
// when the badge is a link (`asChild` with an `<a>`).
const badgeVariants = cva(
	[
		"inline-flex w-fit shrink-0 items-center justify-center overflow-hidden rounded-full border border-transparent font-medium whitespace-nowrap transition-[color,background-color,box-shadow] outline-none",
		"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
		"[&>svg]:pointer-events-none [&>svg]:shrink-0",
	],
	{
		variants: {
			// Each variant is one Figma Style × Tone pair, noted beside it.
			variant: {
				// Solid, Brand
				default: "bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
				// Flat, Neutral
				secondary: "bg-neutral-muted text-foreground [a&]:hover:bg-neutral-muted/80",
				// Solid, Neutral
				neutral: "bg-neutral text-neutral-foreground [a&]:hover:bg-neutral/90",
				// Solid, Destructive
				destructive: "bg-destructive text-white [a&]:hover:bg-destructive/90",
				// Outline, Neutral
				outline: "border-border bg-background text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
				// Ghost, Neutral
				ghost: "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
				// Link, Brand. Always underlined (shadcn underlines on hover only).
				link: "text-primary underline",
				// Flat, Blue / Green / Sky / Purple / Red / Yellow / Amber. Category colors, not status: use `destructive` for errors.
				blue: "bg-badge-blue text-badge-blue-foreground [a&]:hover:bg-badge-blue/80",
				green: "bg-badge-green text-badge-green-foreground [a&]:hover:bg-badge-green/80",
				sky: "bg-badge-sky text-badge-sky-foreground [a&]:hover:bg-badge-sky/80",
				purple: "bg-badge-purple text-badge-purple-foreground [a&]:hover:bg-badge-purple/80",
				red: "bg-badge-red text-badge-red-foreground [a&]:hover:bg-badge-red/80",
				yellow: "bg-badge-yellow text-badge-yellow-foreground [a&]:hover:bg-badge-yellow/80",
				amber: "bg-badge-amber text-badge-amber-foreground [a&]:hover:bg-badge-amber/80",
			},
			// Heights come from the label's line + padding + 1px border; Figma's labels use an auto line height, 14px for
			// the 12px label and 18px above it. The line height rides on the text class (`text-sm/4.5`): a separate
			// `leading-*` is dropped by `cn()` when a `text-*` follows. sm–lg follow the control size scale (SIZE-SCALE.md).
			size: {
				// 20px
				xs: "gap-1 px-2 py-0.5 text-xs/3.5 [&>svg]:size-3",
				// 24px with the larger label, for a badge beside a value (e.g. an acuity category)
				"xs-alt": "gap-1 px-2 py-0.5 text-sm/4.5 [&>svg]:size-3",
				// 32px
				sm: "gap-1 px-2.5 py-1.5 text-sm/4.5 [&>svg]:size-3",
				// 36px
				md: "gap-1.5 px-3 py-2 text-base/4.5 [&>svg]:size-4",
				// 40px. Figma's lg icon is 14px, smaller than md's (DESIGN.md "Badge").
				lg: "gap-1.5 px-3.5 py-2.5 text-base/4.5 [&>svg]:size-3.5",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "md",
		},
	},
);

type BadgeProps = React.ComponentProps<"span"> &
	VariantProps<typeof badgeVariants> & {
		asChild?: boolean;
	};

/**
 * A small label for a status, count or category. Use `asChild` with a link to make it clickable.
 *
 * Figma: [intercept.ds › badge](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1014-50)
 */
function Badge({ className, variant = "default", size = "md", asChild = false, ...props }: BadgeProps) {
	const Component = asChild ? Slot : "span";

	return (
		<Component
			data-slot='badge'
			data-variant={variant}
			data-size={size}
			className={cn(badgeVariants({ variant, size, className }))}
			{...props}
		/>
	);
}

export { Badge, badgeVariants, type BadgeProps };
