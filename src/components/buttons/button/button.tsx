import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// The md sizes, shared with their deprecated aliases (`default`, `icon`) so the two never drift apart. md follows
// intercept.ds Button lg · 36: 12px radius, 14px semibold label, 6px between icon and label, 14px to the label's side
// and 10px to an icon's (the outline variant's 1px border is inside those, see compoundVariants).
const mdSize = "h-9 gap-1.5 rounded-button-md px-3.5 font-semibold has-[>svg]:pl-2.5";
const iconMdSize = "size-9 rounded-button-md";

const buttonVariants = cva(
	"inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
	{
		variants: {
			variant: {
				default: "bg-primary text-primary-foreground hover:bg-primary/90",
				// Solid · Neutral: a dark fill for strong actions that aren't the page's brand action. The label is
				// `neutral-foreground`, which turns dark with the fill in dark mode.
				neutral: "bg-neutral text-neutral-foreground hover:bg-neutral/90",
				destructive:
					"bg-destructive text-destructive-foreground hover:bg-destructive/90",
				outline:
					"border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground",
				secondary:
					"bg-secondary text-secondary-foreground hover:bg-secondary/80",
				ghost: "hover:bg-accent hover:text-accent-foreground",
				link: "text-primary underline-offset-4 hover:underline",
				// A white, fully round button for floating over a dark surface (e.g. a monitor), so it keeps the same light
				// look in both modes. Usually icon only; round at every size (see compoundVariants).
				circle: "rounded-full bg-(--white) text-(--gray-700) hover:bg-(--gray-100)",
			},
			// The control size scale (SIZE-SCALE.md): xs 24, sm 32, md 36, lg 40, and an icon-only square at each height.
			// Classes are shadcn's, value for value; UCL names its 36px step `md` where shadcn says `default`. A button
			// with an icon child gets less side padding.
			size: {
				xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
				sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
				md: mdSize,
				lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
				"icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
				"icon-sm": "size-8",
				"icon-md": iconMdSize,
				"icon-lg": "size-10",
				/** @deprecated Use `md`. */
				default: mdSize,
				/** @deprecated Use `icon-md`. */
				icon: iconMdSize,
			},
		},
		// The outline border takes 1px of the padding, so its label and icon land where the other variants' do.
		compoundVariants: [
			{ variant: "outline", size: ["md", "default"], className: "px-[13px] has-[>svg]:pl-[9px]" },
			// The sizes set their own radius; the circle stays round at all of them.
			{ variant: "circle", className: "rounded-full" },
		],
		defaultVariants: {
			variant: "default",
			size: "md",
		},
	},
);

type ButtonProps = React.ComponentProps<"button"> &
	VariantProps<typeof buttonVariants> & {
		asChild?: boolean;
	};

/** Triggers an action or event, such as submitting a form or moving to the next step. */
function Button({
	className,
	variant = "default",
	size = "md",
	asChild = false,
	...props
}: ButtonProps) {
	const Component = asChild ? Slot : "button";

	return (
		<Component
			data-slot='button'
			data-variant={variant}
			// Deprecated aliases report their current name, so styling hooks only need `md` / `icon-md`.
			data-size={size === "default" ? "md" : size === "icon" ? "icon-md" : size}
			className={cn(buttonVariants({ variant, size, className }))}
			{...props}
		/>
	);
}

export { Button, buttonVariants, type ButtonProps };
