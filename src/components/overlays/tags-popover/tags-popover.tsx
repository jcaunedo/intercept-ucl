"use client";

import * as React from "react";

import { Badge, type BadgeProps } from "@/components/data-display/badge";
import {
	Popover,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
} from "@/components/overlays/popover";
import { formatRelativeDate } from "@/lib/relative-date";
import { cn } from "@/lib/utils";

/** What a tag's popover says: what changed lately, what's behind it now, and where that comes from. */
type TagsPopoverDetails = {
	/**
	 * What the bedside team changed lately, newest first, one sentence each, e.g. "Epinephrine drip increased by 75% in
	 * the last 3 hours". The popover leads with these.
	 */
	changes?: string[];
	/** A muted line under the changes, e.g. "No changes in the last 12 hours". */
	description?: string;
	/**
	 * What's behind it now, one line each, e.g. `{ label: "Norepinephrine", value: "0.22 mcg/kg/min" }`. A sentence with
	 * a name before it takes `term` ("Severe COPD:"), shown semibold, with the rest of the line regular after it. A line
	 * without a term shows its `label` semibold and its `value` regular, so a scan picks out what each line is about.
	 */
	items?: { label: string; value?: string; term?: string }[];
	/** Where the lines come from, e.g. "Pump". */
	source?: string;
	/** When the newest line was updated, ISO 8601; shown after the source as it opens ("Pump · 1 min ago"). */
	updatedAt?: string;
};

type TagsPopoverProps = {
	/** The tag's text, and the popover's title. */
	label: string;
	details: TagsPopoverDetails;
	/** The tag's Badge variant. */
	variant?: BadgeProps["variant"];
	/** The tag's Badge size. */
	size?: BadgeProps["size"];
};

type TagsPopoverItem = NonNullable<TagsPopoverDetails["items"]>[number];

/**
 * One line of what's behind the tag. A short value sits beside its label, right-aligned ("Norepinephrine 0.22
 * mcg/kg/min"). A value that's a sentence, one that wraps beside its label, moves under it as a paragraph, left-aligned
 * (Nov 5, 2026, user's call): two rows read better than two narrow columns.
 */
function DetailsItem({ item }: { item: TagsPopoverItem }) {
	const valueRef = React.useRef<HTMLElement>(null);
	const [stacked, setStacked] = React.useState(false);

	// Measured before paint: a value taller than one line wraps, so it stacks. Once stacked it stays (it has the full
	// width then, so measuring again would always say it fits).
	React.useLayoutEffect(() => {
		const value = valueRef.current;
		if (!value || stacked) return;
		const lineHeight = Number.parseFloat(getComputedStyle(value).lineHeight);
		if (value.offsetHeight > lineHeight * 1.5) setStacked(true);
	}, [item.value, stacked]);

	return (
		<div className={cn("flex", stacked ? "flex-col gap-0.5" : "items-baseline justify-between gap-3")}>
			{/* The main term reads semibold against a regular line, so a scan picks out each finding (Nov 5, 2026, user's call;
			    DESIGN.md "Tags popover"). */}
			<dt
				className={cn(
					"text-foreground",
					item.term ? "font-normal" : "font-semibold",
					// A short name beside its value stays on one line; the value wraps instead.
					item.value && !stacked && "shrink-0",
				)}
			>
				{item.term ? <span className='font-semibold'>{item.term} </span> : null}
				{item.label}
			</dt>
			{item.value ? (
				<dd ref={valueRef} className={cn("tabular-nums text-foreground", !stacked && "text-right")}>
					{item.value}
				</dd>
			) : null}
		</div>
	);
}

/**
 * A patient's tag (a flag) with details: a Badge button that opens them in a popover, and a mouse leaving the tag closes
 * it, so it's there only while the clinician points at it. Touch and keyboard close it with Escape or a click outside (a
 * tap also sends a leave). Its clicks, and the popover's, stop at the tag, so on a card they never reach the card's open
 * target. Used by the patient cards' tag rows and PatientHeader; built on Popover.
 */
function TagsPopover({ label, details, variant = "outline", size = "sm" }: TagsPopoverProps) {
	const [open, setOpen] = React.useState(false);
	const stop = (event: React.SyntheticEvent) => event.stopPropagation();

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				asChild
				onClick={stop}
				onPointerLeave={(event) => {
					if (event.pointerType === "mouse") setOpen(false);
				}}
			>
				{/* On hover, and while its popover is open: the hover fill and a `foreground` border. */}
				<Badge
					asChild
					variant={variant}
					size={size}
					className='shrink-0 transition-[color,background-color,border-color,box-shadow] hover:border-foreground hover:bg-accent data-[state=open]:border-foreground data-[state=open]:bg-accent'
				>
					<button type='button'>{label}</button>
				</Badge>
			</PopoverTrigger>
			{/* React sends a portal's events up its component tree, so the popover's clicks stop here too. */}
			<PopoverContent align='start' aria-label={label} onClick={stop}>
				{/* What changed, in `foreground`, then what's behind it now. No rule between them (Nov 4, 2026, user's call). */}
				<PopoverHeader>
					<PopoverTitle>{label}</PopoverTitle>
					{details.changes?.length ? (
						<ul className='flex flex-col gap-1 text-foreground'>
							{details.changes.map((change) => (
								<li key={change}>{change}</li>
							))}
						</ul>
					) : null}
					{details.description ? <PopoverDescription>{details.description}</PopoverDescription> : null}
				</PopoverHeader>
				{details.items?.length ? (
					<dl className='flex flex-col gap-1.5'>
						{details.items.map((item) => (
							<DetailsItem key={`${item.term ?? ""}${item.label}`} item={item} />
						))}
					</dl>
				) : null}
				{details.source ? (
					<p className='text-xs text-muted-foreground'>
						{details.source}
						{details.updatedAt ? ` · ${formatRelativeDate(details.updatedAt).label}` : null}
					</p>
				) : null}
			</PopoverContent>
		</Popover>
	);
}

export { TagsPopover, type TagsPopoverDetails, type TagsPopoverProps };
