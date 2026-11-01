"use client";

import * as React from "react";
import { motion } from "motion/react";

import { Badge } from "@/components/data-display/badge";
import { pressPattern, useMotionPreference } from "@/lib/motion";
import { cn } from "@/lib/utils";

type FilterBarProps = React.ComponentProps<"div">;

/**
 * The row above a list of records that narrows and arranges it: `FilterBarFilters` on the left (search, then
 * `FilterBarChip`s), `FilterBarControls` on the right (view toggles, sort, the Filters button). What goes in each is up to
 * the page. Give it an `aria-label` ("Patient filters") so screen readers announce the group.
 *
 * Figma: [intercept.ds › Filter Bar](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1270-288)
 */
function FilterBar({ className, ...props }: FilterBarProps) {
	return (
		<div
			data-slot='filter-bar'
			role='group'
			// The filters wrap within their own area, so a search opening never pushes the controls off the row; only when
			// the row is too narrow for both do the controls move below.
			className={cn("flex flex-wrap items-start justify-between gap-4", className)}
			{...props}
		/>
	);
}

type FilterBarFiltersProps = React.ComponentProps<"div">;

/**
 * The left side: the search, then the chips, 4px apart. It takes the row's free width (at least 24rem, or the whole row
 * when narrower) and wraps chip by chip. A group of chips inside it can use `className='contents'` to flow with the rest.
 */
function FilterBarFilters({ className, ...props }: FilterBarFiltersProps) {
	return (
		<div
			data-slot='filter-bar-filters'
			className={cn("flex min-w-[min(100%,24rem)] flex-1 basis-0 flex-wrap items-center gap-1", className)}
			{...props}
		/>
	);
}

type FilterBarControlsProps = React.ComponentProps<"div">;

/** The right side: view toggles, sort and Filters, 8px apart, kept at the row's end. */
function FilterBarControls({ className, ...props }: FilterBarControlsProps) {
	return (
		<div
			data-slot='filter-bar-controls'
			className={cn("ml-auto flex shrink-0 flex-wrap items-center gap-2", className)}
			{...props}
		/>
	);
}

type FilterBarChipProps = Omit<React.ComponentProps<"button">, "onChange"> & {
	/** Whether the chip is on. Controlled; pair with `onPressedChange`. */
	pressed?: boolean;
	/** The starting state when uncontrolled. */
	defaultPressed?: boolean;
	onPressedChange?: (pressed: boolean) => void;
	/** How many records the chip matches, shown as " · n" after the label (0 included). */
	count?: number;
};

/**
 * One filter chip: a toggle button (`aria-pressed`) with an icon first in its children, then the label, and an optional
 * `count`. Off it's Badge `secondary`; on, `neutral`. An off chip cross-fades to the outline look, with a `foreground`
 * border, on hover (160ms, the `fast` duration), and every chip presses on tap (Press). Both are instant under reduced
 * motion.
 *
 * Figma: [intercept.ds › Filter Bar](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1270-288)
 */
function FilterBarChip({
	className,
	pressed: pressedProp,
	defaultPressed = false,
	onPressedChange,
	count,
	onClick,
	children,
	// `motion.button` types its drag and animation handlers differently from the DOM's; the chip doesn't use them.
	onDrag: _onDrag,
	onDragStart: _onDragStart,
	onDragEnd: _onDragEnd,
	onAnimationStart: _onAnimationStart,
	...props
}: FilterBarChipProps) {
	const { prefersReducedMotion } = useMotionPreference();
	const [uncontrolledPressed, setUncontrolledPressed] = React.useState(defaultPressed);
	const pressed = pressedProp ?? uncontrolledPressed;

	return (
		<Badge
			asChild
			variant={pressed ? "neutral" : "secondary"}
			count={count}
			className={cn(
				"transition-[color,background-color,border-color,box-shadow] duration-160 ease-out motion-reduce:transition-none",
				!pressed && "hover:border-foreground hover:bg-background",
				className,
			)}
		>
			<motion.button
				type='button'
				data-slot='filter-bar-chip'
				aria-pressed={pressed}
				onClick={(event) => {
					onClick?.(event);
					if (event.defaultPrevented) return;
					setUncontrolledPressed(!pressed);
					onPressedChange?.(!pressed);
				}}
				{...(prefersReducedMotion ? {} : pressPattern)}
				{...props}
			>
				{children}
			</motion.button>
		</Badge>
	);
}

export {
	FilterBar,
	FilterBarChip,
	FilterBarControls,
	FilterBarFilters,
	type FilterBarChipProps,
	type FilterBarControlsProps,
	type FilterBarFiltersProps,
	type FilterBarProps,
};
