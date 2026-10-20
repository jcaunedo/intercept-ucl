"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { Label } from "@/components/forms/label";
import { cn } from "@/lib/utils";

// Structure follows shadcn's Field. Figma's Input set supplies the skin: 8px between label, control and helper text;
// helper text in `xs` `muted-foreground`, red (`destructive`) when it's an error; the label keeps `foreground` in the
// Error and Disabled states. Spacing Figma doesn't draw (FieldSet, FieldGroup, FieldContent) keeps shadcn's values.

/** Groups related fields, such as an address, under one legend. */
function FieldSet({ className, ...props }: React.ComponentProps<"fieldset">) {
	return (
		<fieldset
			data-slot='field-set'
			className={cn(
				"flex flex-col gap-6",
				"has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3",
				className,
			)}
			{...props}
		/>
	);
}

type FieldLegendProps = React.ComponentProps<"legend"> & {
	/** `legend` titles a FieldSet; `label` makes it read like a field label. */
	variant?: "legend" | "label";
};

/** The title of a FieldSet. */
function FieldLegend({ className, variant = "legend", ...props }: FieldLegendProps) {
	return (
		<legend
			data-slot='field-legend'
			data-variant={variant}
			className={cn(
				"mb-3 font-medium text-foreground",
				"data-[variant=legend]:text-base",
				"data-[variant=label]:text-sm",
				className,
			)}
			{...props}
		/>
	);
}

/** Stacks fields with consistent spacing. */
function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot='field-group'
			className={cn(
				"group/field-group @container/field-group flex w-full flex-col gap-7 data-[slot=checkbox-group]:gap-3 [&>[data-slot=field-group]]:gap-4",
				className,
			)}
			{...props}
		/>
	);
}

const fieldVariants = cva("group/field flex w-full gap-2", {
	variants: {
		orientation: {
			// Figma's Input: label above the control.
			vertical: ["flex-col [&>*]:w-full [&>.sr-only]:w-auto"],
			// Checkbox, radio and switch rows: control and label side by side.
			horizontal: [
				"flex-row items-center",
				"[&>[data-slot=field-label]]:flex-auto",
				"has-[>[data-slot=field-content]]:items-start has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
			],
			// Vertical in a narrow FieldGroup, horizontal once the group is wide enough.
			responsive: [
				"flex-col @md/field-group:flex-row @md/field-group:items-center [&>*]:w-full @md/field-group:[&>*]:w-auto [&>.sr-only]:w-auto",
				"@md/field-group:[&>[data-slot=field-label]]:flex-auto",
				"@md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
			],
		},
	},
	defaultVariants: {
		orientation: "vertical",
	},
});

type FieldProps = React.ComponentProps<"div"> & VariantProps<typeof fieldVariants>;

/** One form field: a label, its control, and optional helper or error text. Set `data-invalid` when it has an error. */
function Field({ className, orientation = "vertical", ...props }: FieldProps) {
	return (
		<div
			role='group'
			data-slot='field'
			data-orientation={orientation}
			className={cn(fieldVariants({ orientation }), className)}
			{...props}
		/>
	);
}

/** Wraps a label and its description next to a checkbox, radio or switch. */
function FieldContent({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot='field-content'
			className={cn("group/field-content flex flex-1 flex-col gap-1.5", className)}
			{...props}
		/>
	);
}

/** The field's label. Wrapping a whole Field in it turns the field into a selectable card. */
function FieldLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
	return (
		<Label
			data-slot='field-label'
			className={cn(
				"group/field-label peer/field-label flex w-fit gap-2",
				"has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col has-[>[data-slot=field]]:rounded-md has-[>[data-slot=field]]:border [&>*]:data-[slot=field]:p-4",
				"has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5",
				className,
			)}
			{...props}
		/>
	);
}

/** A label-styled title for content that isn't a form control. */
function FieldTitle({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot='field-label'
			className={cn("flex w-fit items-center gap-2 text-sm font-medium text-foreground", className)}
			{...props}
		/>
	);
}

/** Helper text under the control. Figma's "Helper" layer (text style `xs/xs`). */
function FieldDescription({ className, ...props }: React.ComponentProps<"p">) {
	return (
		<p
			data-slot='field-description'
			className={cn(
				"text-xs font-normal text-muted-foreground group-has-[[data-orientation=horizontal]]/field:text-balance",
				"[&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary",
				className,
			)}
			{...props}
		/>
	);
}

type FieldErrorProps = React.ComponentProps<"div"> & {
	/** Validation errors, e.g. from react-hook-form. Duplicate messages are shown once. */
	errors?: Array<{ message?: string } | undefined>;
};

/** The error message under the control, replacing the helper text. Renders nothing when there's no error. */
function FieldError({ className, children, errors, ...props }: FieldErrorProps) {
	const content = React.useMemo(() => {
		if (children) {
			return children;
		}

		if (!errors?.length) {
			return null;
		}

		const uniqueErrors = [...new Map(errors.map((error) => [error?.message, error])).values()];

		if (uniqueErrors.length === 1) {
			return uniqueErrors[0]?.message;
		}

		return (
			<ul className='ml-4 flex list-disc flex-col gap-1'>
				{uniqueErrors.map((error, index) => error?.message && <li key={index}>{error.message}</li>)}
			</ul>
		);
	}, [children, errors]);

	if (!content) {
		return null;
	}

	return (
		<div role='alert' data-slot='field-error' className={cn("text-xs font-normal text-destructive", className)} {...props}>
			{content}
		</div>
	);
}

export {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
	FieldTitle,
	fieldVariants,
	type FieldErrorProps,
	type FieldLegendProps,
	type FieldProps,
};
