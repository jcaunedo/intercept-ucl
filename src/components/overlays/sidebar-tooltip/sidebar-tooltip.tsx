"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { AnimatePresence, motion } from "motion/react";

import { enterTransition, exitTransition, motionDistance, useMotionPreference } from "@/lib/motion";
import { cn } from "@/lib/utils";

type SidebarTooltipSide = "top" | "right" | "bottom" | "left";

/** Where the bubble starts and ends relative to its resting spot: back toward the trigger. */
const glideFrom: Record<SidebarTooltipSide, { x?: number; y?: number }> = {
	right: { x: -motionDistance.subtle },
	left: { x: motionDistance.subtle },
	bottom: { y: -motionDistance.subtle },
	top: { y: motionDistance.subtle },
};

type SidebarTooltipProps = Omit<
	React.ComponentProps<typeof TooltipPrimitive.Content>,
	"children" | "asChild" | "forceMount" | "side"
> & {
	/** The tooltip text, e.g. a collapsed nav item's label. Also what screen readers announce. */
	label: string;
	/** The trigger. Rendered through Radix `asChild`, so it must forward refs and props (a native element does). */
	children: React.ReactElement;
	/** Side of the trigger the bubble sits on. Defaults to `"right"`, beside the collapsed rail. */
	side?: SidebarTooltipSide;
	/** Never opens, e.g. while the sidebar is expanded and the label is already visible. */
	disabled?: boolean;
	/** Starts open (uncontrolled), e.g. for Storybook. */
	defaultOpen?: boolean;
};

/**
 * Pill-shaped label for a collapsed sidebar item, shown on hover and focus. Built on Radix's tooltip (hover, focus,
 * Escape, `role="tooltip"`) and opens without delay.
 *
 * Motion (same as bethere-ucl): fades in while gliding `motionDistance.subtle` (8px) out from the trigger on
 * `enterTransition`, and leaves the same way on the shorter `exitTransition` (MOTION.md "Menus/dropdowns": short fade,
 * small movement from the trigger). Opacity only under reduced motion.
 *
 * Figma: [intercept.ds › sidebar-tooltip](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1003-1512)
 */
function SidebarTooltip({
	label,
	children,
	side = "right",
	sideOffset = 8,
	disabled = false,
	defaultOpen = false,
	className,
	...props
}: SidebarTooltipProps) {
	const [open, setOpen] = React.useState(defaultOpen);
	const [prevDisabled, setPrevDisabled] = React.useState(disabled);
	const { resolve, prefersReducedMotion } = useMotionPreference();

	// Radix still reports hover and focus while `open` is held false, but never the matching close (it thinks the
	// tooltip is already closed). So ignore open requests while disabled, and drop any open state whenever `disabled`
	// flips. Otherwise every item hovered while the sidebar was expanded pops open at once when it collapses.
	if (disabled !== prevDisabled) {
		setPrevDisabled(disabled);
		setOpen(false);
	}
	const handleOpenChange = (next: boolean) => setOpen(disabled ? false : next);
	const isOpen = open && !disabled;
	const offset = prefersReducedMotion ? {} : glideFrom[side];

	return (
		// `disableHoverableContent`: the bubble ignores the pointer, so it closes as soon as the pointer leaves the
		// trigger instead of waiting for it to travel toward the bubble.
		<TooltipPrimitive.Provider delayDuration={0} disableHoverableContent>
			<TooltipPrimitive.Root open={isOpen} onOpenChange={handleOpenChange}>
				<TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
				<AnimatePresence>
					{isOpen ? (
						// AnimatePresence keeps it mounted through the exit; `forceMount` stops Radix from unmounting the
						// content itself as soon as `open` turns false.
						<TooltipPrimitive.Portal key='sidebar-tooltip' forceMount>
							<TooltipPrimitive.Content
								forceMount
								asChild
								side={side}
								sideOffset={sideOffset}
								// Radix announces the content through a hidden copy. With `asChild` that copy would be the whole
								// bubble, so give it the plain label instead.
								aria-label={label}
								{...props}
							>
								<motion.div
									data-slot='sidebar-tooltip'
									initial={{ opacity: 0, ...offset }}
									animate={{ opacity: 1, x: 0, y: 0, transition: resolve(enterTransition) }}
									exit={{ opacity: 0, ...offset, transition: resolve(exitTransition) }}
									className={cn(
										"pointer-events-none z-50 inline-flex items-center justify-center rounded-full border border-border bg-background px-4 py-2 text-base/5 font-medium whitespace-nowrap text-foreground shadow-xl",
										className,
									)}
								>
									{label}
								</motion.div>
							</TooltipPrimitive.Content>
						</TooltipPrimitive.Portal>
					) : null}
				</AnimatePresence>
			</TooltipPrimitive.Root>
		</TooltipPrimitive.Provider>
	);
}

export { SidebarTooltip, type SidebarTooltipProps, type SidebarTooltipSide };
