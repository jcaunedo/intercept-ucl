import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// States are native/ARIA states, not variants: `hover:`, `focus-visible:`, `aria-invalid`, `read-only:`, `disabled:`.
// `read-only:` also matches disabled inputs, which share the read-only fill and border.
const inputVariants = cva(
	[
		"flex w-full min-w-0 rounded-input border border-input bg-background px-3 text-base text-foreground shadow-xs transition-[color,background-color,border-color,box-shadow] outline-none md:text-sm",
		"selection:bg-primary selection:text-primary-foreground placeholder:text-foreground-subtle",
		"file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
		"hover:not-read-only:not-aria-invalid:border-input-ring",
		"focus-visible:border-ring focus-visible:shadow-none focus-visible:ring-[3px] focus-visible:ring-ring-outside",
		"aria-invalid:border-destructive aria-invalid:bg-destructive-subtle aria-invalid:text-destructive aria-invalid:placeholder:text-destructive aria-invalid:focus-visible:ring-destructive/20",
		"read-only:border-input-disabled read-only:bg-background-subtle read-only:shadow-none",
		"disabled:cursor-not-allowed disabled:text-muted-foreground disabled:placeholder:text-muted-foreground",
	],
	{
		variants: {
			size: {
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

// The native `size` attribute (width in characters) is replaced by the height variant.
type InputProps = Omit<React.ComponentProps<"input">, "size"> & VariantProps<typeof inputVariants>;

/**
 * A single-line text field. Pair it with a label; set `aria-invalid` for the error state.
 *
 * Figma: [intercept.ds › Input](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1018-8360)
 */
function Input({ className, type, size = "md", ...props }: InputProps) {
	return (
		<input
			type={type}
			data-slot='input'
			data-size={size === "default" ? "md" : size}
			className={cn(inputVariants({ size, className }))}
			{...props}
		/>
	);
}

export { Input, inputVariants, type InputProps };
