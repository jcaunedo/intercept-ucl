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
 * One option. Put a Label right after it. Focus uses Button's ring and error (`aria-invalid`) uses Input's
 * `destructive` border.
 *
 * Figma: [intercept.ds › Radio Button](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1018-9320)
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
				// Selected and disabled has no design of its own, so it fades.
				"disabled:cursor-not-allowed disabled:border-muted-foreground disabled:shadow-sm disabled:data-[state=checked]:opacity-50",
				className,
			)}
			{...props}
		>
			<RadioGroupPrimitive.Indicator data-slot='radio-group-indicator' className='flex size-full items-center justify-center'>
				<span className='size-2.5 rounded-full bg-neutral' />
			</RadioGroupPrimitive.Indicator>
		</RadioGroupPrimitive.Item>
	);
}

export { RadioGroup, RadioGroupItem, type RadioGroupItemProps, type RadioGroupProps };
