import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// The state classes are a copy of Input's, so keep the two in sync. Height is a minimum: `field-sizing-content` grows
// the field with its text.
const textareaVariants = cva(
	[
		"flex field-sizing-content w-full min-w-0 rounded-input border border-input bg-background px-3 py-2 text-base text-foreground shadow-xs transition-[color,background-color,border-color,box-shadow] outline-none md:text-sm",
		"selection:bg-primary selection:text-primary-foreground placeholder:text-foreground-subtle",
		"hover:not-read-only:not-aria-invalid:border-input-ring",
		"focus-visible:border-ring focus-visible:shadow-none focus-visible:ring-[3px] focus-visible:ring-ring-outside",
		"aria-invalid:border-destructive aria-invalid:bg-destructive-subtle aria-invalid:text-destructive aria-invalid:placeholder:text-destructive aria-invalid:focus-visible:ring-destructive/20",
		"read-only:border-input-disabled read-only:bg-background-subtle read-only:shadow-none",
		"disabled:cursor-not-allowed disabled:text-muted-foreground disabled:placeholder:text-muted-foreground",
	],
	{
		variants: {
			size: {
				md: "min-h-9",
				lg: "min-h-10",
				/** @deprecated Use `md`. */
				default: "min-h-9",
			},
		},
		defaultVariants: {
			size: "md",
		},
	},
);

type TextareaProps = React.ComponentProps<"textarea"> & VariantProps<typeof textareaVariants>;

/**
 * A multi-line text field that grows with its content. Pair it with a label; set `aria-invalid` for the error state.
 *
 * Figma: [intercept.ds › Input](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1018-8360), Type=Textarea
 */
function Textarea({ className, size = "md", ...props }: TextareaProps) {
	return (
		<textarea
			data-slot='textarea'
			data-size={size === "default" ? "md" : size}
			className={cn(textareaVariants({ size, className }))}
			{...props}
		/>
	);
}

export { Textarea, textareaVariants, type TextareaProps };
