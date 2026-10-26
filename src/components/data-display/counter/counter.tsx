import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Badge's variant names and tokens, with tighter padding, plus the alert severities (PatientCardAlert's names). A 20px
// minimum width keeps a narrow digit ("1") from looking pinched. Every variant has a 1px border (transparent unless
// `outline`) so sizes match.
const counterVariants = cva(
	"inline-flex min-w-5 shrink-0 items-center justify-center gap-1 rounded-full border border-transparent px-[5px] text-xs/4.5 font-medium whitespace-nowrap tabular-nums",
	{
		variants: {
			variant: {
				// Solid · Default
				default: "bg-primary text-primary-foreground",
				// Solid · Neutral (Badge's `neutral`)
				neutral: "bg-neutral text-neutral-foreground",
				// Flat · Default, and Flat · Message
				secondary: "bg-neutral-muted text-foreground",
				// Outlined · Default
				outline: "border-border text-foreground",
				// Solid · Critical / High / Medium / Low / Resolved
				critical: "bg-severity-critical text-severity-foreground",
				high: "bg-severity-high text-severity-foreground",
				medium: "bg-severity-medium text-severity-foreground",
				low: "bg-severity-low text-severity-foreground",
				resolved: "bg-success text-severity-foreground",
			},
			size: {
				// 20px
				xxs: "",
				// 24px
				xs: "py-0.5",
			},
		},
		// Figma pads the xs Default tones 6px and everything else 5px (DESIGN.md "Counter").
		compoundVariants: [{ variant: ["default", "neutral", "secondary", "outline"], size: "xs", className: "px-1.5" }],
		defaultVariants: {
			variant: "default",
			size: "xxs",
		},
	},
);

type CounterProps = React.ComponentProps<"span"> &
	VariantProps<typeof counterVariants> & {
		/** The number to show. Without it, `children` is shown as given. */
		count?: number;
		/** Caps `count`: above it the counter shows "{max}+". */
		max?: number;
	};

/**
 * A small count, e.g. unread items on a tab or nav item, or alerts of one severity. Give the surrounding control an
 * accessible name that includes what is counted ("Messages, 3 unread"); the number alone has no context.
 *
 * Figma: [intercept.ds › counter](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1092-4013)
 */
function Counter({ className, variant = "default", size = "xxs", count, max, children, ...props }: CounterProps) {
	const content = count === undefined ? children : max !== undefined && count > max ? `${max}+` : count;

	return (
		<span
			data-slot='counter'
			data-variant={variant}
			data-size={size}
			className={cn(counterVariants({ variant, size, className }))}
			{...props}
		>
			{content}
		</span>
	);
}

export { Counter, counterVariants, type CounterProps };
