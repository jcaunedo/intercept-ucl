"use client";

import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";

import { cn } from "@/lib/utils";

type RadioGroupProps = React.ComponentProps<typeof RadioGroupPrimitive.Root>;

/** A set of options where only one can be selected. Arrow keys move between items. */
function RadioGroup({ className, ...props }: RadioGroupProps) {
	return <RadioGroupPrimitive.Root data-slot='radio-group' className={cn("grid gap-3", className)} {...props} />;
}

type RadioGroupItemProps = React.ComponentProps<typeof RadioGroupPrimitive.Item>;

/**
 * One option. Figma "Radio Button": Default, Selected (`checked`) and Disabled. Put a Label right after it.
 * Figma has no Focus or Error state: focus uses Button's ring, error uses Input's `destructive` border.
 */
function RadioGroupItem({ className, ...props }: RadioGroupItemProps) {
	return (
		<RadioGroupPrimitive.Item
			data-slot='radio-group-item'
			className={cn(
				"peer aspect-square size-4 shrink-0 rounded-full border border-foreground bg-background shadow-xs transition-[color,border-color,box-shadow] outline-none",
				"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
				"aria-invalid:border-destructive",
				"data-[state=checked]:border-neutral",
				// Figma Disabled is unselected: `foreground-subtle` border, `shadow-sm`. Selected and disabled isn't drawn, so it fades.
				"disabled:cursor-not-allowed disabled:border-foreground-subtle disabled:shadow-sm disabled:data-[state=checked]:opacity-50",
				className,
			)}
			{...props}
		>
			<RadioGroupPrimitive.Indicator data-slot='radio-group-indicator' className='flex size-full items-center justify-center'>
				{/* Figma draws a 10.2px dot (a scaled 9px); 10px is the nearest whole size. */}
				<span className='size-2.5 rounded-full bg-neutral' />
			</RadioGroupPrimitive.Indicator>
		</RadioGroupPrimitive.Item>
	);
}

export { RadioGroup, RadioGroupItem, type RadioGroupItemProps, type RadioGroupProps };
