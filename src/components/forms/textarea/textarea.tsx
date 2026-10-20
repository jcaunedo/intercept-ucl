import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Figma "Input", Type=Textarea. The states match Input's exactly (see DESIGN.md "Input: how Figma's Textfield maps to
// tokens"), so keep the two in sync. Height is a minimum: `field-sizing-content` grows the field with its text.
// Figma's 3px right and bottom insets place its drawn resize grip; the browser draws its own, so padding is py-2 px-3.
const textareaVariants = cva(
	[
		"flex field-sizing-content w-full min-w-0 rounded-input border border-input bg-background px-3 py-2 text-base text-foreground shadow-xs transition-[color,background-color,border-color,box-shadow] outline-none md:text-sm",
		"selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground",
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
				default: "min-h-9",
				// Figma Size=xl · 40
				lg: "min-h-10",
			},
		},
		defaultVariants: {
			size: "default",
		},
	},
);

type TextareaProps = React.ComponentProps<"textarea"> & VariantProps<typeof textareaVariants>;

/** A multi-line text field that grows with its content. Pair it with a label; set `aria-invalid` for the error state. */
function Textarea({ className, size = "default", ...props }: TextareaProps) {
	return (
		<textarea
			data-slot='textarea'
			data-size={size}
			className={cn(textareaVariants({ size, className }))}
			{...props}
		/>
	);
}

export { Textarea, textareaVariants, type TextareaProps };
