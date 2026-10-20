"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Figma "Switch": State ON (`checked`) / OFF, Size Default / Small. The track has 2px padding around the thumb.
// Figma's Small is a 0.8× scaled copy (28.8 × 16 track, 12.8px thumb, 1.6px padding); UCL uses the whole-pixel
// equivalent: 28 × 16 track, 12px thumb, 2px padding.
const switchVariants = cva(
	[
		"peer group/switch inline-flex shrink-0 items-center rounded-full p-0.5 transition-colors outline-none",
		"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
		"data-[state=checked]:bg-neutral data-[state=unchecked]:bg-input",
		"aria-invalid:ring-1 aria-invalid:ring-destructive",
		"disabled:cursor-not-allowed disabled:opacity-50",
	],
	{
		variants: {
			size: {
				// Figma Size=Default: 36 × 20
				default: "h-5 w-9",
				// Figma Size=Small: 28 × 16
				sm: "h-4 w-7",
			},
		},
		defaultVariants: {
			size: "default",
		},
	},
);

type SwitchProps = React.ComponentProps<typeof SwitchPrimitive.Root> & VariantProps<typeof switchVariants>;

/** An on/off toggle that applies immediately. Put a Label right after it. */
function Switch({ className, size = "default", ...props }: SwitchProps) {
	return (
		<SwitchPrimitive.Root
			data-slot='switch'
			data-size={size}
			className={cn(switchVariants({ size, className }))}
			{...props}
		>
			<SwitchPrimitive.Thumb
				data-slot='switch-thumb'
				className={cn(
					"pointer-events-none block rounded-full bg-background shadow-sm ring-0 transition-transform data-[state=unchecked]:translate-x-0",
					"group-data-[size=default]/switch:size-4 group-data-[size=default]/switch:data-[state=checked]:translate-x-4",
					"group-data-[size=sm]/switch:size-3 group-data-[size=sm]/switch:data-[state=checked]:translate-x-3",
				)}
			/>
		</SwitchPrimitive.Root>
	);
}

export { Switch, switchVariants, type SwitchProps };
