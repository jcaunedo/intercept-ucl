import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// The table's size sets its cells' height, padding and distance from the row's edges as variables, so a part (the
// footer) can set its own for the cells inside it. Cells are 24px apart (12px each side).
const tableVariants = cva("w-full caption-bottom text-sm text-foreground", {
	variants: {
		size: {
			sm: "[--table-cell-h:2.5rem] [--table-cell-py:0.375rem] [--table-edge:0.5rem] [--table-head-h:2.5rem] [--table-head-py:0.375rem]",
			md: "[--table-cell-h:3rem] [--table-cell-py:0.5rem] [--table-edge:0.5rem] [--table-head-h:2.5rem] [--table-head-py:0.375rem]",
			lg: "[--table-cell-h:auto] [--table-cell-py:0.75rem] [--table-edge:0.75rem] [--table-head-h:2.75rem] [--table-head-py:0.75rem]",
		},
	},
	defaultVariants: { size: "sm" },
});

type TableProps = React.ComponentProps<"table"> & VariantProps<typeof tableVariants>;

/**
 * A data table: shadcn's Table, styled from intercept.ds. `size` sets the body rows: `sm` 40px, `md` 48px (a cell with
 * two lines grows its row, e.g. an avatar with a name and a detail, 56px), `lg` the roomier Inbox rows (12px above and
 * below the content: 70px with two lines of text, Figma's 16px around its 16px-tall text boxes; a 44px heading row). Scrolls sideways when it's wider than its container.
 *
 * Figma: [intercept.ds › Table Row](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1531-4265)
 */
function Table({ className, size = "sm", ...props }: TableProps) {
	return (
		<div data-slot='table-container' className='relative w-full overflow-x-auto'>
			<table data-slot='table' data-size={size} className={cn(tableVariants({ size, className }))} {...props} />
		</div>
	);
}

const tableHeaderVariants = cva("[&_tr]:border-b [&_tr]:border-border", {
	variants: {
		variant: {
			default: "bg-background",
			// On a grey fill with its top corners rounded, for a table that stands on its own.
			flat: "bg-background-subtle [&_th:first-child]:rounded-tl-lg [&_th:last-child]:rounded-tr-lg",
		},
	},
	defaultVariants: { variant: "default" },
});

type TableHeaderProps = React.ComponentProps<"thead"> & VariantProps<typeof tableHeaderVariants>;

/** The column headings' row group: `default` on the page's background, `flat` on a grey fill. */
function TableHeader({ className, variant = "default", ...props }: TableHeaderProps) {
	return (
		<thead
			data-slot='table-header'
			data-variant={variant}
			className={cn(tableHeaderVariants({ variant, className }))}
			{...props}
		/>
	);
}

/** The rows. Every row keeps its bottom rule, the last one included. */
function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
	return <tbody data-slot='table-body' className={className} {...props} />;
}

/**
 * The total row: on a grey fill with no rules, 16px from the row's edges, its label medium and its last cell (the
 * total) semibold and right-aligned.
 */
function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
	return (
		<tfoot
			data-slot='table-footer'
			className={cn(
				"bg-background-subtle font-medium [--table-cell-h:2.5rem] [--table-cell-py:0.625rem] [--table-edge:1rem] [&_td:first-child]:font-medium [&_td:last-child]:text-right [&_td:last-child]:font-semibold [&_tr]:border-b-0",
				className,
			)}
			{...props}
		/>
	);
}

/** One row, with a rule under it. A selected row (`data-state='selected'`) and the row under the pointer are tinted. */
function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
	return (
		<tr
			data-slot='table-row'
			className={cn(
				"border-b border-border transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
				className,
			)}
			{...props}
		/>
	);
}

// The space between cells and from the row's edges, shared by headings and cells.
const cellSpacing = "px-3 first:pl-(--table-edge) last:pr-(--table-edge)";

/** A column heading: 14/20 semibold, on a 40px row (44px at `lg`). */
function TableHead({ className, ...props }: React.ComponentProps<"th">) {
	return (
		<th
			data-slot='table-head'
			className={cn("h-(--table-head-h) py-(--table-head-py) text-left align-middle font-semibold whitespace-nowrap text-foreground", cellSpacing, className)}
			{...props}
		/>
	);
}

/**
 * A cell: 14/20 regular, the row's first cell semibold (what the row is about). Its height follows the table's size,
 * as at least that tall: content taller than it (two lines) grows the row.
 */
function TableCell({ className, ...props }: React.ComponentProps<"td">) {
	return (
		<td
			data-slot='table-cell'
			className={cn(
				"h-(--table-cell-h) py-(--table-cell-py) align-middle whitespace-nowrap first:font-semibold",
				cellSpacing,
				className,
			)}
			{...props}
		/>
	);
}

/** A caption under the table, muted. */
function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
	return <caption data-slot='table-caption' className={cn("mt-4 text-sm text-muted-foreground", className)} {...props} />;
}

export {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableFooter,
	TableHead,
	TableHeader,
	TableRow,
	tableHeaderVariants,
	tableVariants,
	type TableHeaderProps,
	type TableProps,
};
