"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { CheckIcon, MinusIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type CheckboxProps = React.ComponentProps<typeof CheckboxPrimitive.Root>;

/**
 * A checkbox. Figma "Checkbox": Default, Selected (`checked`), Partial (`checked="indeterminate"`) and Disabled.
 * Put a Label right after it for Figma's option label. Figma has no Focus or Error state: focus uses Button's ring,
 * error uses Input's `destructive` border.
 */
function Checkbox({ className, ...props }: CheckboxProps) {
	return (
		<CheckboxPrimitive.Root
			data-slot='checkbox'
			className={cn(
				"peer size-4 shrink-0 rounded-sm border border-foreground bg-background shadow-xs transition-[color,background-color,border-color,box-shadow] outline-none",
				"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
				"aria-invalid:border-destructive",
				"data-[state=checked]:border-neutral data-[state=checked]:bg-neutral data-[state=checked]:text-neutral-foreground",
				"data-[state=indeterminate]:border-neutral data-[state=indeterminate]:bg-neutral data-[state=indeterminate]:text-neutral-foreground",
				// Figma Disabled is unchecked: `foreground-subtle` border, `shadow-sm`. Checked and disabled isn't drawn, so it fades.
				"disabled:cursor-not-allowed disabled:border-foreground-subtle disabled:shadow-sm disabled:data-[state=checked]:opacity-50 disabled:data-[state=indeterminate]:opacity-50",
				className,
			)}
			{...props}
		>
			{/* The indicator's own data-state picks the icon, so it works controlled and uncontrolled. */}
			<CheckboxPrimitive.Indicator
				data-slot='checkbox-indicator'
				className='group/indicator grid place-content-center text-current transition-none'
			>
				<CheckIcon className='size-3.5 group-data-[state=indeterminate]/indicator:hidden' />
				<MinusIcon className='hidden size-3.5 group-data-[state=indeterminate]/indicator:block' />
			</CheckboxPrimitive.Indicator>
		</CheckboxPrimitive.Root>
	);
}

export { Checkbox, type CheckboxProps };
