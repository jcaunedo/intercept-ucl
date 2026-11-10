"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { motion } from "motion/react";

import { quickFadeVariants } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * shadcn's Popover on Radix: a trigger that opens a small panel of information or controls next to it. Unlike Tooltip
 * it opens on click, takes focus and can hold interactive content; Escape or a click outside closes it and focus
 * returns to the trigger.
 *
 * Figma: [intercept.ds › Popover](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1352-13395)
 */
function Popover(props: React.ComponentProps<typeof PopoverPrimitive.Root>) {
	return <PopoverPrimitive.Root data-slot='popover' {...props} />;
}

/** The element that opens the popover. Use `asChild` with a Button or a Badge. */
function PopoverTrigger(props: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
	return <PopoverPrimitive.Trigger data-slot='popover-trigger' {...props} />;
}

/** Positions the popover against something other than its trigger. */
function PopoverAnchor(props: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
	return <PopoverPrimitive.Anchor data-slot='popover-anchor' {...props} />;
}

/**
 * The panel: 300px wide by default (a width in `className`), 24px in, above everything in a portal. It fades in when it
 * opens, no movement (`quickFadeVariants`), and closes at once: Radix unmounts it (Nov 10, 2026, user's call).
 */
function PopoverContent({
	className,
	align = "center",
	sideOffset = 4,
	children,
	...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
	return (
		<PopoverPrimitive.Portal>
			<PopoverPrimitive.Content
				asChild
				data-slot='popover-content'
				align={align}
				sideOffset={sideOffset}
				className={cn(
					"z-(--z-floating) flex w-75 flex-col gap-3 rounded-menu border border-border-defined bg-popover p-6 text-sm text-popover-foreground shadow-2xl outline-hidden",
					className,
				)}
				{...props}
			>
				<motion.div variants={quickFadeVariants} initial='initial' animate='animate'>
					{children}
				</motion.div>
			</PopoverPrimitive.Content>
		</PopoverPrimitive.Portal>
	);
}

function PopoverHeader({ className, ...props }: React.ComponentProps<"div">) {
	return <div data-slot='popover-header' className={cn("flex flex-col gap-1", className)} {...props} />;
}

function PopoverTitle({ className, ...props }: React.ComponentProps<"h2">) {
	return <h2 data-slot='popover-title' className={cn("text-lg font-semibold text-foreground", className)} {...props} />;
}

function PopoverDescription({ className, ...props }: React.ComponentProps<"p">) {
	return <p data-slot='popover-description' className={cn("text-muted-foreground", className)} {...props} />;
}

export { Popover, PopoverAnchor, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger };
