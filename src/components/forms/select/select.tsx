"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { cva, type VariantProps } from "class-variance-authority";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { motion } from "motion/react";

import { enterTransition, motionDistance, motionScale, useMotionPreference } from "@/lib/motion";
import { cn } from "@/lib/utils";

function Select(props: React.ComponentProps<typeof SelectPrimitive.Root>) {
	return <SelectPrimitive.Root data-slot='select' {...props} />;
}

function SelectGroup(props: React.ComponentProps<typeof SelectPrimitive.Group>) {
	return <SelectPrimitive.Group data-slot='select-group' {...props} />;
}

// Radix ignores `className` and `style` on the value. Style it from the trigger instead, e.g.
// `<SelectTrigger className='[&_[data-slot=select-value]]:font-semibold'>`.
function SelectValue(props: React.ComponentProps<typeof SelectPrimitive.Value>) {
	return <SelectPrimitive.Value data-slot='select-value' {...props} />;
}

// The trigger looks and behaves like Input: same border, fill, radius, heights and states. States are native/ARIA
// (`aria-invalid`, `disabled`, Radix's `data-placeholder`), not variants.
const selectTriggerVariants = cva(
	[
		"flex w-fit items-center justify-between gap-2 rounded-input border border-input bg-background px-3 text-sm whitespace-nowrap text-foreground shadow-xs transition-[color,background-color,border-color,box-shadow] outline-none",
		"hover:not-disabled:not-aria-invalid:border-input-ring",
		"focus-visible:border-ring focus-visible:shadow-none focus-visible:ring-[3px] focus-visible:ring-ring-outside",
		"aria-invalid:border-destructive aria-invalid:bg-destructive-subtle aria-invalid:focus-visible:ring-destructive/20",
		"disabled:cursor-not-allowed disabled:border-input-disabled disabled:bg-background-subtle disabled:text-muted-foreground disabled:shadow-none",
		"data-[placeholder]:text-foreground-subtle",
		"*:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2",
		"[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-icon",
	],
	{
		variants: {
			size: {
				sm: "h-8",
				md: "h-9",
				lg: "h-10",
				/** @deprecated Use `md`. */
				default: "h-9",
			},
		},
		defaultVariants: {
			size: "md",
		},
	},
);

type SelectTriggerProps = React.ComponentProps<typeof SelectPrimitive.Trigger> & VariantProps<typeof selectTriggerVariants>;

/**
 * The button that opens the list and shows the chosen value. Put a SelectValue inside it.
 *
 * Figma: none yet. intercept.ds has no Select, so the trigger follows Input (DESIGN.md "Select").
 */
function SelectTrigger({ className, size = "md", children, ...props }: SelectTriggerProps) {
	return (
		<SelectPrimitive.Trigger
			data-slot='select-trigger'
			data-size={size === "default" ? "md" : size}
			className={cn(selectTriggerVariants({ size }), className)}
			{...props}
		>
			{children}
			<SelectPrimitive.Icon asChild>
				<ChevronDownIcon />
			</SelectPrimitive.Icon>
		</SelectPrimitive.Trigger>
	);
}

type SelectSide = "top" | "right" | "bottom" | "left";

// The surface Radix positions. It fades in and grows from `motionScale.popIn`; in `popper` mode it also moves
// `motionDistance.subtle` in from the trigger's side (MOTION.md "Menus/dropdowns"). `item-aligned` sets no side, since
// the list opens over the trigger. Reduced motion keeps the fade only. Radix unmounts it on close, so the exit is
// instant.
function SelectSurface(props: React.ComponentProps<typeof motion.div> & { "data-side"?: SelectSide }) {
	const { prefersReducedMotion, resolve } = useMotionPreference();
	const side = props["data-side"];
	const distance = motionDistance.subtle;
	const from = side
		? { top: { y: distance }, bottom: { y: -distance }, left: { x: distance }, right: { x: -distance } }[side]
		: {};

	return (
		<motion.div
			initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: motionScale.popIn, ...from }}
			animate={{ opacity: 1, scale: 1, x: 0, y: 0, transition: resolve(enterTransition) }}
			{...props}
		/>
	);
}

/** The list. Defaults to Radix's `item-aligned` position (over the trigger, on the chosen item), as shadcn does. */
function SelectContent({
	className,
	children,
	position = "item-aligned",
	align = "center",
	...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
	return (
		<SelectPrimitive.Portal>
			<SelectPrimitive.Content
				asChild
				data-slot='select-content'
				position={position}
				align={align}
				className={cn(
					"relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-menu border border-border bg-popover text-popover-foreground shadow-md",
					position === "popper" &&
						"data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
					className,
				)}
				{...props}
			>
				<SelectSurface>
					<SelectScrollUpButton />
					<SelectPrimitive.Viewport
						className={cn(
							"p-1.5",
							position === "popper" &&
								"h-(--radix-select-trigger-height) w-full min-w-(--radix-select-trigger-width) scroll-my-1.5",
						)}
					>
						{children}
					</SelectPrimitive.Viewport>
					<SelectScrollDownButton />
				</SelectSurface>
			</SelectPrimitive.Content>
		</SelectPrimitive.Portal>
	);
}

function SelectLabel({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Label>) {
	return (
		<SelectPrimitive.Label
			data-slot='select-label'
			className={cn("px-2 py-1.5 text-xs text-muted-foreground", className)}
			{...props}
		/>
	);
}

// Items sit 6px inside the 16px list, so their 10px radius stays concentric with it. No `cursor-default` (shadcn's):
// options are clickable, so they take the global pointer (DESIGN.md "Every clickable element shows the pointer cursor").
function SelectItem({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Item>) {
	return (
		<SelectPrimitive.Item
			data-slot='select-item'
			className={cn(
				"relative flex w-full items-center gap-2 rounded-input py-1.5 pr-8 pl-2 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-icon *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
				className,
			)}
			{...props}
		>
			<span data-slot='select-item-indicator' className='absolute right-2 flex size-3.5 items-center justify-center'>
				<SelectPrimitive.ItemIndicator>
					<CheckIcon className='size-4' />
				</SelectPrimitive.ItemIndicator>
			</span>
			<SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
		</SelectPrimitive.Item>
	);
}

function SelectSeparator({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Separator>) {
	return (
		<SelectPrimitive.Separator
			data-slot='select-separator'
			className={cn("pointer-events-none -mx-1.5 my-1 h-px bg-border", className)}
			{...props}
		/>
	);
}

function SelectScrollUpButton({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
	return (
		<SelectPrimitive.ScrollUpButton
			data-slot='select-scroll-up-button'
			className={cn("flex cursor-default items-center justify-center py-1", className)}
			{...props}
		>
			<ChevronUpIcon className='size-4' />
		</SelectPrimitive.ScrollUpButton>
	);
}

function SelectScrollDownButton({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
	return (
		<SelectPrimitive.ScrollDownButton
			data-slot='select-scroll-down-button'
			className={cn("flex cursor-default items-center justify-center py-1", className)}
			{...props}
		>
			<ChevronDownIcon className='size-4' />
		</SelectPrimitive.ScrollDownButton>
	);
}

export {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectScrollDownButton,
	SelectScrollUpButton,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
	selectTriggerVariants,
	type SelectTriggerProps,
};
