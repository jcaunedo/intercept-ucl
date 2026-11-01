"use client";

import * as React from "react";
import { SearchIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cva, type VariantProps } from "class-variance-authority";

import {
	exitTransition,
	iconSwapReducedVariants,
	iconSwapVariants,
	standardTransition,
	useMotionPreference,
} from "@/lib/motion";
import { cn } from "@/lib/utils";

// Input's look on the field's frame (the input inside is bare): border, fill, hover and the focus ring, which shows
// while focus is anywhere in the field (the input or its clear button). Keep it in step with `inputVariants`.
const searchInputVariants = cva(
	[
		"flex shrink-0 cursor-text items-center gap-1.5 overflow-hidden rounded-input border border-input bg-background text-foreground shadow-xs transition-[color,background-color,border-color,box-shadow]",
		"hover:not-focus-within:border-input-ring",
		// Closed, it reads as a button: a click opens it. The input fills it, so it takes the pointer too.
		"data-[state=closed]:cursor-pointer data-[state=closed]:[&_input]:cursor-pointer",
		"focus-within:border-ring focus-within:shadow-none focus-within:ring-[3px] focus-within:ring-ring-outside",
		"has-disabled:cursor-not-allowed has-disabled:border-input-disabled has-disabled:bg-background-subtle has-disabled:shadow-none",
	],
	{
		variants: {
			// The border sits inside the padding, as Figma draws its stroke inside: 1px + 8px is Figma's 9px at `md`.
			size: {
				md: "h-9 pr-[7px] pl-2",
				lg: "h-10 pr-[7px] pl-[11px]",
			},
		},
		defaultVariants: {
			size: "md",
		},
	},
);

// Closed, the field is a square around the magnifier (Figma's Default: 36 × 36 at `md`, 42 × 40 at `lg`).
const collapsedWidths = { md: 36, lg: 42 } as const;

type SearchInputProps = Omit<React.ComponentProps<"input">, "size" | "value" | "defaultValue" | "type"> &
	VariantProps<typeof searchInputVariants> & {
		value?: string;
		defaultValue?: string;
		onValueChange?: (value: string) => void;
		/** Closed to the magnifier while empty and not focused (default). `false` keeps the field open. */
		collapsible?: boolean;
		/** The open field's width: px (Figma: 240), or a percentage of its container, e.g. `"100%"` to fill it. */
		expandedWidth?: number | `${number}%`;
		/** The field's accessible name. Defaults to `placeholder`, then "Search". */
		label?: string;
	};

/**
 * A search field. Empty and unfocused it closes to the magnifier; a click or Tab opens it (Expand, MOTION.md). While
 * it's focused with text, a clear button empties it; Escape clears it, then leaves it. It stays open while it holds
 * text.
 *
 * Figma: [intercept.ds › Input (Type=Search)](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1222-3378)
 */
function SearchInput({
	className,
	size = "md",
	value: valueProp,
	defaultValue = "",
	onValueChange,
	collapsible = true,
	expandedWidth = 240,
	label,
	placeholder = "Search",
	disabled,
	ref,
	onFocus,
	onBlur,
	onKeyDown,
	...props
}: SearchInputProps) {
	const resolvedSize = size ?? "md";
	const { prefersReducedMotion, resolve } = useMotionPreference();
	const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
	const value = valueProp ?? uncontrolledValue;
	const setValue = (next: string) => {
		setUncontrolledValue(next);
		onValueChange?.(next);
	};
	// Focus anywhere in the field: the input or its clear button, so clicking clear doesn't close the field under it.
	const [focused, setFocused] = React.useState(false);
	const inputRef = React.useRef<HTMLInputElement>(null);
	const open = !collapsible || focused || value !== "";

	const focusInput = () => inputRef.current?.focus();

	return (
		<motion.div
			data-slot='search-input'
			data-size={resolvedSize}
			data-state={open ? "open" : "closed"}
			initial={false}
			animate={{ width: open ? expandedWidth : collapsedWidths[resolvedSize] }}
			// Opens at the standard pace and closes faster, as exits are (MOTION.md); near-instant under reduced motion.
			transition={resolve(open ? standardTransition : exitTransition)}
			className={cn(searchInputVariants({ size: resolvedSize }), className)}
			// A click anywhere on the frame (the magnifier, the padding) lands in the input.
			onMouseDown={(event) => {
				if (disabled || event.target === inputRef.current) return;
				if ((event.target as HTMLElement).closest("button")) return;
				event.preventDefault();
				focusInput();
			}}
			onFocus={() => setFocused(true)}
			onBlur={(event) => {
				if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
			}}
		>
			<SearchIcon aria-hidden='true' className='size-[18px] shrink-0 text-foreground' />
			<input
				ref={(node) => {
					inputRef.current = node;
					if (typeof ref === "function") ref(node);
					else if (ref) ref.current = node;
				}}
				type='search'
				data-slot='search-input-field'
				aria-label={label ?? placeholder}
				placeholder={placeholder}
				disabled={disabled}
				value={value}
				onChange={(event) => setValue(event.target.value)}
				onFocus={onFocus}
				onBlur={onBlur}
				onKeyDown={(event) => {
					onKeyDown?.(event);
					if (event.defaultPrevented || event.key !== "Escape") return;
					// Escape empties the field first, and leaves it when it's already empty.
					if (value) setValue("");
					else event.currentTarget.blur();
				}}
				// 16px at every width, unlike Input's 14px above `md`. The browser's own clear button is replaced by ours.
				className='min-w-0 flex-1 bg-transparent text-base outline-none selection:bg-primary selection:text-primary-foreground placeholder:text-foreground-subtle disabled:cursor-not-allowed disabled:text-muted-foreground [&::-webkit-search-cancel-button]:appearance-none'
				{...props}
			/>
			<AnimatePresence initial={false}>
				{focused && value ? (
					<motion.button
						key='clear'
						type='button'
						aria-label='Clear search'
						variants={prefersReducedMotion ? iconSwapReducedVariants : iconSwapVariants}
						initial='hidden'
						animate='shown'
						exit='hidden'
						onClick={() => {
							setValue("");
							focusInput();
						}}
						className='grid size-5 shrink-0 cursor-pointer place-items-center rounded-full bg-background-subtle text-icon-muted transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring'
					>
						<XIcon aria-hidden='true' className='size-3' />
					</motion.button>
				) : null}
			</AnimatePresence>
		</motion.div>
	);
}

export { SearchInput, searchInputVariants, type SearchInputProps };
