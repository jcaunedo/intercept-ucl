import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Figma "badge" (intercept.ds 1014:50), on shadcn's Badge. Figma's Style × Tone pairs map one-to-one onto shadcn's
// variants. Every variant and size: radius/badge (full), 4px gap, medium label on an 18px line, 12px icon, 1px border
// (transparent unless Outline). Hover only applies when the badge is a link (`asChild` with an `<a>`).
const badgeVariants = cva(
	[
		"inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent font-medium whitespace-nowrap transition-[color,background-color,box-shadow] outline-none",
		"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
		"[&>svg]:pointer-events-none [&>svg]:size-3 [&>svg]:shrink-0",
	],
	{
		variants: {
			variant: {
				// Style=Solid, Tone=Brand: tone/brand/brand fill, tone/brand/on-brand label.
				default: "bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
				// Style=Flat, Tone=Neutral: tone/neutral/muted fill, foreground/foreground label.
				secondary: "bg-neutral-muted text-foreground [a&]:hover:bg-neutral-muted/80",
				// Style=Solid, Tone=Destructive: tone/destructive/destructive fill, white label.
				destructive: "bg-destructive text-white [a&]:hover:bg-destructive/90",
				// Style=Outline, Tone=Neutral: border/border stroke, foreground/foreground label.
				outline: "border-border text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
				// Style=Ghost, Tone=Neutral: no fill or stroke, foreground/foreground label.
				ghost: "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
				// Style=Link, Tone=Brand: tone/brand/brand label, always underlined at the font's own offset (shadcn
				// underlines on hover only).
				link: "text-primary underline",
				// Style=Flat, Tone=Blue / Green / Sky / Purple / Red: badge/<tone>/background fill (Tailwind 50),
				// badge/<tone>/foreground label (Tailwind 700). Category colors, not status: use `destructive` for errors.
				blue: "bg-badge-blue text-badge-blue-foreground [a&]:hover:bg-badge-blue/80",
				green: "bg-badge-green text-badge-green-foreground [a&]:hover:bg-badge-green/80",
				sky: "bg-badge-sky text-badge-sky-foreground [a&]:hover:bg-badge-sky/80",
				purple: "bg-badge-purple text-badge-purple-foreground [a&]:hover:bg-badge-purple/80",
				red: "bg-badge-red text-badge-red-foreground [a&]:hover:bg-badge-red/80",
			},
			// The control size scale (SIZE-SCALE.md). Heights come from the 18px line + padding + 1px border. The line height
			// rides on the text class (`text-sm/4.5`): a separate `leading-*` is dropped by `cn()` when a `text-*` follows.
			size: {
				// Figma Size=xs: 24px, 8 × 2px padding, xs (12px) label.
				xs: "px-2 py-0.5 text-xs/4.5",
				// Figma Size=sm: 32px, 10 × 6px padding, sm (14px) label.
				sm: "px-2.5 py-1.5 text-sm/4.5",
				// Figma Size=md (default): 36px, 12 × 8px padding, sm (14px) label.
				md: "px-3 py-2 text-sm/4.5",
				// Figma Size=lg: 40px, 14 × 10px padding, sm (14px) label.
				lg: "px-3.5 py-2.5 text-sm/4.5",
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

/** A small label for a status, count or category. Use `asChild` with a link to make it clickable. */
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
