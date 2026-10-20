"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "motion/react";

import { enterTransition, motionDistance, useMotionPreference } from "@/lib/motion";
import { cn } from "@/lib/utils";

// Figma "Tooltip" (archielabs.ds, Feedback page): `foreground` surface, `background` text, `radius/menu/container`
// (`rounded-menu`, 16px in intercept mode), no arrow.
const tooltipContentVariants = cva("z-50 w-fit rounded-menu bg-foreground text-balance text-background", {
	variants: {
		size: {
			// Figma Size=Medium: 6 × 14 padding, text style `sm/sm`
			default: "px-3.5 py-1.5 text-sm",
			// Figma Size=Small: 4 × 8 padding, text style `xs/xs`
			sm: "px-2 py-1 text-xs",
		},
	},
	defaultVariants: {
		size: "default",
	},
});

/** Shares the open delay between tooltips. Wrap the app (or a region) once. */
function TooltipProvider({ delayDuration = 0, ...props }: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
	return <TooltipPrimitive.Provider data-slot='tooltip-provider' delayDuration={delayDuration} {...props} />;
}

/** A short label shown on hover or keyboard focus of its trigger. */
function Tooltip(props: React.ComponentProps<typeof TooltipPrimitive.Root>) {
	return <TooltipPrimitive.Root data-slot='tooltip' {...props} />;
}

/** The element the tooltip describes. Use `asChild` to keep your own button or link. */
function TooltipTrigger(props: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
	return <TooltipPrimitive.Trigger data-slot='tooltip-trigger' {...props} />;
}

type TooltipSide = "top" | "right" | "bottom" | "left";

// The surface Radix positions. It fades in and moves `motionDistance.subtle` away from the trigger (MOTION.md:
// "short fade plus a small movement from the trigger"); reduced motion keeps the fade only. Radix unmounts it on close,
// so the exit is instant.
function TooltipSurface(props: React.ComponentProps<typeof motion.div> & { "data-side"?: TooltipSide }) {
	const { prefersReducedMotion, resolve } = useMotionPreference();
	const side = props["data-side"] ?? "top";
	const distance = motionDistance.subtle;
	const from = { top: { y: distance }, bottom: { y: -distance }, left: { x: distance }, right: { x: -distance } }[side];

	return (
		<motion.div
			initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, ...from }}
			animate={{ opacity: 1, x: 0, y: 0, transition: resolve(enterTransition) }}
			{...props}
		/>
	);
}

type TooltipContentProps = React.ComponentProps<typeof TooltipPrimitive.Content> & VariantProps<typeof tooltipContentVariants>;

/** The tooltip itself. `size` follows Figma's Medium (`default`) and Small (`sm`). */
function TooltipContent({ className, size = "default", sideOffset = 4, children, ...props }: TooltipContentProps) {
	return (
		<TooltipPrimitive.Portal>
			<TooltipPrimitive.Content
				asChild
				data-slot='tooltip-content'
				data-size={size}
				sideOffset={sideOffset}
				className={cn(tooltipContentVariants({ size }), className)}
				{...props}
			>
				<TooltipSurface>{children}</TooltipSurface>
			</TooltipPrimitive.Content>
		</TooltipPrimitive.Portal>
	);
}

export {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
	tooltipContentVariants,
	type TooltipContentProps,
};
