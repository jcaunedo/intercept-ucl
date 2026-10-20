import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Figma "Input", Type=Textfield. States map to native/ARIA states, not variants: Hover → `hover:`, Focus →
// `focus-visible:`, Error → `aria-invalid`, Read-only → `read-only:`, Disabled → `disabled:`. HasValue is just a value.
// `read-only:` also matches disabled inputs, which share the Read-only fill and border in Figma.
const inputVariants = cva(
	[
		"flex w-full min-w-0 rounded-input border border-input bg-background px-3 text-base text-foreground shadow-xs transition-[color,background-color,border-color,box-shadow] outline-none md:text-sm",
		"selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground",
		"file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
		"hover:not-read-only:not-aria-invalid:border-input-ring",
		"focus-visible:border-ring focus-visible:shadow-none focus-visible:ring-[3px] focus-visible:ring-ring-outside",
		"aria-invalid:border-destructive aria-invalid:bg-destructive-subtle aria-invalid:text-destructive aria-invalid:placeholder:text-destructive aria-invalid:focus-visible:ring-destructive/20",
		"read-only:border-input-disabled read-only:bg-background-subtle read-only:shadow-none",
		"disabled:cursor-not-allowed disabled:text-foreground-subtle disabled:placeholder:text-foreground-subtle",
	],
	{
		variants: {
			size: {
				// Figma Size=lg · 36
				default: "h-9",
				// Figma Size=xl · 40
				lg: "h-10",
			},
		},
		defaultVariants: {
			size: "default",
		},
	},
);

// The native `size` attribute (width in characters) is replaced by the height variant.
type InputProps = Omit<React.ComponentProps<"input">, "size"> & VariantProps<typeof inputVariants>;

/** A single-line text field. Pair it with a label; set `aria-invalid` for the error state. */
function Input({ className, type, size = "default", ...props }: InputProps) {
	return (
		<input
			type={type}
			data-slot='input'
			data-size={size}
			className={cn(inputVariants({ size, className }))}
			{...props}
		/>
	);
}

export { Input, inputVariants, type InputProps };
