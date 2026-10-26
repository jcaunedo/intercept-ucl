"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cva, type VariantProps } from "class-variance-authority";

import { Label } from "@/components/forms/label";
import { cn } from "@/lib/utils";

// The track has 2px padding around the thumb at both sizes.
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
				// 36 × 20
				default: "h-5 w-9",
				// 28 × 16
				sm: "h-4 w-7",
			},
		},
		defaultVariants: {
			size: "default",
		},
	},
);

type SwitchProps = React.ComponentProps<typeof SwitchPrimitive.Root> &
	VariantProps<typeof switchVariants> & {
		/** A label beside the switch. Clicking it toggles the switch. */
		label?: React.ReactNode;
		/** Which side the label sits on. Defaults to `right`. */
		labelSide?: "left" | "right";
	};

/**
 * An on/off toggle that applies immediately. Give it a `label` (right by default, or `left`): medium weight, muted while
 * off and `foreground` while on. Or put your own Label right after it.
 *
 * Figma: [intercept.ds › Switch](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1018-9286)
 */
function Switch({ className, size = "default", label, labelSide = "right", id, ...props }: SwitchProps) {
	const generatedId = React.useId();
	const switchId = id ?? (label ? generatedId : undefined);

	const control = (
		<SwitchPrimitive.Root
			data-slot='switch'
			data-size={size}
			id={switchId}
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

	if (!label) return control;

	// The label reads the switch's state through the wrapper (`has-`), so it works on either side and whether the
	// switch is controlled or not. The color change cross-fades over 160ms (the `fast` duration).
	const labelElement = (
		<Label
			htmlFor={switchId}
			data-slot='switch-label'
			className={cn(
				"font-medium text-muted-foreground transition-colors duration-160 ease-out motion-reduce:transition-none",
				"group-has-data-[state=checked]/switch-field:text-foreground group-has-disabled/switch-field:text-foreground-subtle",
				size === "sm" ? "text-sm/5" : "text-base/6",
			)}
		>
			{label}
		</Label>
	);

	return (
		<div data-slot='switch-field' className='group/switch-field inline-flex items-center gap-2'>
			{labelSide === "left" ? labelElement : null}
			{control}
			{labelSide === "right" ? labelElement : null}
		</div>
	);
}

export { Switch, switchVariants, type SwitchProps };
