"use client";

import * as React from "react";
import { ListFilterIcon, type LucideIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@/components/buttons/button";
import { Counter } from "@/components/data-display/counter";
import { Checkbox } from "@/components/forms/checkbox";
import { FieldLegend, FieldSet } from "@/components/forms/field";
import { Label } from "@/components/forms/label";
import { SearchInput } from "@/components/forms/search-input";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/overlays/sheet";
import { expandVariants, fadeVariants, useExpandClip, useMotionPreference } from "@/lib/motion";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Data                                                                       */
/* -------------------------------------------------------------------------- */

/** One option: a checkbox with its label and, when given, how many records it would show. */
type FilterPanelOption = {
	id: string;
	label: string;
	/** How many records the option would show with the other groups as they are. 0 mutes it (still clickable). */
	count?: number;
	/** A color dot before the label, as a background class, e.g. "bg-severity-critical". */
	swatch?: string;
	/** An icon before the label. */
	icon?: LucideIcon;
};

/** A group of options, under an uppercase legend. Options in a group usually match any; groups match all. */
type FilterPanelGroup = {
	id: string;
	title: string;
	/** A line under the title, e.g. how the group's options behave. */
	description?: string;
	options: FilterPanelOption[];
};

/** The options picked in each group, by group id. */
type FilterPanelValue = Record<string, string[]>;

/** How many options are picked across the groups: the Filters button's count. */
const filterPanelCount = (value: FilterPanelValue) =>
	Object.values(value).reduce((total, picked) => total + picked.length, 0);

/* -------------------------------------------------------------------------- */
/* FilterPanel                                                                */
/* -------------------------------------------------------------------------- */

type FilterPanelProps = Omit<React.ComponentProps<typeof SheetContent>, "children" | "title" | "defaultValue"> & {
	open?: boolean;
	defaultOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
	groups: FilterPanelGroup[];
	value?: FilterPanelValue;
	defaultValue?: FilterPanelValue;
	/** Each change, as it's made: the list behind can follow it at once. */
	onValueChange?: (value: FilterPanelValue) => void;
	title?: string;
	/** A search over the options, first in the panel. On by default. */
	searchable?: boolean;
	searchPlaceholder?: string;
	/** What a search that matches nothing says. */
	noMatchesText?: (query: string) => string;
	/** Read after each count, e.g. "patients" ("5 patients"). */
	countLabel?: string;
	/** The footer's line, e.g. "5 of 18 patients in this view". */
	summary?: React.ReactNode;
	clearLabel?: string;
	doneLabel?: string;
	/** Done closes the panel; this runs first. */
	onDone?: () => void;
};

/**
 * Filters for a list, in a Sheet from the right: an optional search over the options, then the groups, each option a
 * checkbox with its count. Options apply as they're checked, so the list behind follows. With something picked, a
 * footer slides in: the `summary`, **Clear all** and **Done** (closes the panel). Pair it with `FilterPanelButton` in
 * the Filter Bar, with the panel's `id`.
 *
 * Figma: not drawn in intercept.ds yet; [Intercept-Live › Filter example](https://www.figma.com/design/EKg9ovtsHlQoK3DAS0F5IM/Intercept-Live?node-id=205-5447)
 */
function FilterPanel({
	open: openProp,
	defaultOpen = false,
	onOpenChange,
	groups,
	value: valueProp,
	defaultValue = {},
	onValueChange,
	title = "Filters",
	searchable = true,
	searchPlaceholder = "Search filters",
	noMatchesText = (query) => `No filters match "${query}"`,
	countLabel = "results",
	summary,
	clearLabel = "Clear all",
	doneLabel = "Done",
	onDone,
	closeLabel = `Close ${title}`,
	onEscapeKeyDown,
	className,
	...props
}: FilterPanelProps) {
	const [openState, setOpenState] = React.useState(defaultOpen);
	const open = openProp ?? openState;
	const setOpen = (next: boolean) => {
		if (openProp === undefined) setOpenState(next);
		onOpenChange?.(next);
	};
	const [valueState, setValueState] = React.useState(defaultValue);
	const value = valueProp ?? valueState;
	const setValue = (next: FilterPanelValue) => {
		if (valueProp === undefined) setValueState(next);
		onValueChange?.(next);
	};
	const picked = filterPanelCount(value);
	const fieldId = React.useId();

	// The search narrows the options shown, not the records: an option whose label matches, or a whole group whose title
	// matches. Picked options stay picked while hidden. It starts empty each time the panel opens.
	const [query, setQuery] = React.useState("");
	React.useEffect(() => {
		if (!open) setQuery("");
	}, [open]);
	const needle = query.trim().toLocaleLowerCase();
	const shownGroups = needle
		? groups
				.map((group) =>
					group.title.toLocaleLowerCase().includes(needle)
						? group
						: { ...group, options: group.options.filter((option) => option.label.toLocaleLowerCase().includes(needle)) },
				)
				.filter((group) => group.options.length)
		: groups;

	const toggle = (groupId: string, optionId: string, checked: boolean) => {
		const current = value[groupId] ?? [];
		setValue({ ...value, [groupId]: checked ? [...current, optionId] : current.filter((id) => id !== optionId) });
	};

	const { prefersReducedMotion } = useMotionPreference();
	const clip = useExpandClip();

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetContent
				data-slot='filter-panel'
				closeLabel={closeLabel}
				// No description under the title; Radix expects one unless this is unset.
				aria-describedby={undefined}
				// With text in the search, Escape clears it first and keeps the panel open; the next one closes it. Radix hears
				// Escape before the field does, so the clearing happens here.
				onEscapeKeyDown={(event) => {
					onEscapeKeyDown?.(event);
					if (event.defaultPrevented || !query) return;
					event.preventDefault();
					setQuery("");
				}}
				// 24px in on every side (the Sheet's own is 32px), and its close button moved to match: centered on the title, its
				// icon on the content's right edge.
				className={cn("[&>[data-slot=button]]:top-5 [&>[data-slot=button]]:right-4", className)}
				{...props}
			>
				<SheetHeader className='p-6'>
					<SheetTitle>{title}</SheetTitle>
					{searchable ? (
						// First in the panel, so it takes the focus when the panel opens.
						<SearchInput
							collapsible={false}
							expandedWidth='100%'
							placeholder={searchPlaceholder}
							value={query}
							onValueChange={setQuery}
							className='mt-2'
						/>
					) : null}
				</SheetHeader>
				<div className='flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto border-t border-border p-6 scrollbar-soft'>
					{needle && !shownGroups.length ? <p className='text-sm text-muted-foreground'>{noMatchesText(query.trim())}</p> : null}
					{shownGroups.map((group) => (
						<FieldSet key={group.id} className='gap-1'>
							<FieldLegend
								variant='label'
								className={cn(
									"text-xs font-semibold tracking-wide text-muted-foreground uppercase",
									group.description ? "mb-0.5" : "mb-2",
								)}
							>
								{group.title}
							</FieldLegend>
							{group.description ? <p className='mb-2 text-xs text-muted-foreground'>{group.description}</p> : null}
							{group.options.map((option) => {
								const optionId = `${fieldId}-${group.id}-${option.id}`;
								const checked = (value[group.id] ?? []).includes(option.id);
								return (
									<div
										key={option.id}
										data-slot='filter-panel-option'
										className={cn(
											"-mx-2 flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-accent",
											option.count === 0 && !checked && "text-muted-foreground",
										)}
									>
										<Checkbox
											id={optionId}
											checked={checked}
											onCheckedChange={(next) => toggle(group.id, option.id, next === true)}
										/>
										{option.swatch ? (
											<span aria-hidden='true' className={cn("size-2 shrink-0 rounded-full", option.swatch)} />
										) : null}
										{option.icon ? <option.icon aria-hidden='true' className='size-4 shrink-0 text-icon' /> : null}
										<Label htmlFor={optionId} className='min-w-0 flex-1 cursor-pointer font-normal text-inherit'>
											{option.label}
										</Label>
										{option.count !== undefined ? (
											<span className='text-sm text-muted-foreground tabular-nums'>
												{option.count}
												<span className='sr-only'> {countLabel}</span>
											</span>
										) : null}
									</div>
								);
							})}
						</FieldSet>
					))}
				</div>
				{/* Only with something picked: there's nothing to clear or apply before. It opens and closes in place (Expand). */}
				<AnimatePresence initial={false}>
					{picked ? (
						<motion.div
							key='footer'
							{...clip}
							variants={prefersReducedMotion ? fadeVariants : expandVariants}
							initial='initial'
							animate='animate'
							exit='exit'
							className='shrink-0'
						>
							<SheetFooter className='flex-row items-center gap-2 border-t border-border p-6'>
								{summary ? (
									<p aria-live='polite' className='mr-auto min-w-0 text-sm text-muted-foreground tabular-nums'>
										{summary}
									</p>
								) : null}
								<div className='ml-auto flex shrink-0 gap-2'>
									<Button variant='ghost' onClick={() => setValue({})}>
										{clearLabel}
									</Button>
									<Button
										onClick={() => {
											onDone?.();
											setOpen(false);
										}}
									>
										{doneLabel}
									</Button>
								</div>
							</SheetFooter>
						</motion.div>
					) : null}
				</AnimatePresence>
			</SheetContent>
		</Sheet>
	);
}

/* -------------------------------------------------------------------------- */
/* FilterPanelButton                                                          */
/* -------------------------------------------------------------------------- */

type FilterPanelButtonProps = Omit<React.ComponentProps<typeof Button>, "children"> & {
	/** The FilterPanel's `id`, for `aria-controls`. */
	panelId?: string;
	/** Whether the panel is open, for `aria-expanded`. */
	open?: boolean;
	/** How many options are picked (`filterPanelCount`); a Counter after the label from 1. */
	count?: number;
	label?: string;
};

/**
 * The Filter Bar's Filters button: opens the FilterPanel `panelId`, and counts the options picked ("Filters, 2 picked"
 * to screen readers).
 */
function FilterPanelButton({
	panelId,
	open,
	count = 0,
	label = "Filters",
	variant = "outline",
	...props
}: FilterPanelButtonProps) {
	return (
		<Button
			data-slot='filter-panel-button'
			variant={variant}
			aria-expanded={open}
			aria-controls={panelId}
			aria-label={count ? `${label}, ${count} picked` : undefined}
			{...props}
		>
			<ListFilterIcon aria-hidden='true' />
			{label}
			{count ? <Counter count={count} /> : null}
		</Button>
	);
}

export {
	FilterPanel,
	FilterPanelButton,
	filterPanelCount,
	type FilterPanelButtonProps,
	type FilterPanelGroup,
	type FilterPanelOption,
	type FilterPanelProps,
	type FilterPanelValue,
};
