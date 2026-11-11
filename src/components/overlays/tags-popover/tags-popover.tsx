"use client";

import * as React from "react";

import { Button } from "@/components/buttons/button";
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
	/**
	 * A button at the bottom to what the flag leads to, e.g. "View fall prevention pathway" on Fall risk (Nov 10, 2026,
	 * user's call; intercept.ds `Popover` `1352:13395`). Selecting it closes the popover, then runs `onSelect`.
	 */
	action?: { label: string; onSelect: () => void };
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

/** Eats the click that ends the current press, and nothing later: a press that ends in a drag, not a click, lets go. */
function swallowNextClick() {
	const swallow = (event: MouseEvent) => {
		event.stopPropagation();
		event.preventDefault();
	};
	document.addEventListener("click", swallow, { capture: true, once: true });
	document.addEventListener(
		"pointerup",
		() => window.setTimeout(() => document.removeEventListener("click", swallow, { capture: true })),
		{ capture: true, once: true },
	);
}

// While a tag popover is open, the page outside it and its tag shows the plain arrow, since a click there only closes the
// popover (Nov 10, 2026, user's call). Injected once; on while `<html>` has `data-tags-popover-open`.
const outsideCursorCss =
	"html[data-tags-popover-open] body *:not([data-tags-popover-inside], [data-tags-popover-inside] *) { cursor: default !important; }";

function useOutsideArrowCursor(open: boolean) {
	React.useEffect(() => {
		if (!open) return;
		if (!document.getElementById("tags-popover-outside-cursor")) {
			const style = document.createElement("style");
			style.id = "tags-popover-outside-cursor";
			style.textContent = outsideCursorCss;
			document.head.append(style);
		}
		const root = document.documentElement;
		root.setAttribute("data-tags-popover-open", "");
		return () => root.removeAttribute("data-tags-popover-open");
	}, [open]);
}

/**
 * A press outside the open popover (and outside its tag) only closes it (Nov 10, 2026, user's call: "the click should be
 * to close the Popover and nothing else"): caught before anything under it sees the press, then its click is eaten, so
 * a card under it doesn't open, a button doesn't act and a menu doesn't open. Radix alone lets that click through.
 */
function useOutsidePressOnlyCloses(
	open: boolean,
	close: () => void,
	inside: readonly React.RefObject<HTMLElement | null>[],
) {
	React.useEffect(() => {
		if (!open) return;
		const onPointerDown = (event: PointerEvent) => {
			const target = event.target as Node | null;
			if (target && inside.some((ref) => ref.current?.contains(target))) return;
			event.stopPropagation();
			event.preventDefault();
			close();
			swallowNextClick();
		};
		document.addEventListener("pointerdown", onPointerDown, true);
		return () => document.removeEventListener("pointerdown", onPointerDown, true);
	}, [open, close, inside]);
}

type TagsPopoverGroupState = {
	/** The open popover in the row, by its id. */
	openId: string | null;
	/** Whether it opened on hover (a swap), so it doesn't take focus from the page. */
	viaHover: boolean;
};

type TagsPopoverGroupValue = {
	state: React.RefObject<TagsPopoverGroupState>;
	openId: string | null;
	open: (id: string, viaHover: boolean) => void;
	close: (id: string) => void;
	/** Each tag's button, by id, so Tab can step through them in the row's order. */
	register: (id: string, trigger: React.RefObject<HTMLButtonElement | null>) => () => void;
	/** Opens the next tag's popover (`1`) or the previous one's (`-1`), looping, and moves focus to that tag. */
	step: (fromId: string, direction: 1 | -1) => void;
};

const TagsPopoverGroupContext = React.createContext<TagsPopoverGroupValue | null>(null);

/**
 * A row of tags whose popovers work as one (Nov 10, 2026, user's call): one open at a time, and once one is open (a
 * click), moving the mouse onto another tag in the row opens its popover in place of the first, without another click.
 * Tab does the same from the keyboard: the next tag's popover, looping from the last to the first (Shift+Tab goes back),
 * focus on the tag. Wrap the row's TagsPopovers in it; PatientCardTags does.
 */
function TagsPopoverGroup({ children }: { children: React.ReactNode }) {
	const [openState, setOpenState] = React.useState<TagsPopoverGroupState>({ openId: null, viaHover: false });
	// The latest state, for Radix's focus callbacks, which run between renders.
	const state = React.useRef(openState);
	state.current = openState;
	const open = React.useCallback((id: string, viaHover: boolean) => {
		state.current = { openId: id, viaHover };
		setOpenState(state.current);
	}, []);
	const close = React.useCallback((id: string) => {
		if (state.current.openId !== id) return;
		state.current = { openId: null, viaHover: false };
		setOpenState(state.current);
	}, []);
	const triggers = React.useRef(new Map<string, React.RefObject<HTMLButtonElement | null>>());
	const register = React.useCallback((id: string, trigger: React.RefObject<HTMLButtonElement | null>) => {
		triggers.current.set(id, trigger);
		return () => {
			triggers.current.delete(id);
		};
	}, []);
	const step = React.useCallback(
		(fromId: string, direction: 1 | -1) => {
			// In the order they're on the page, whatever order they mounted in.
			const row = [...triggers.current]
				.filter(([, trigger]) => trigger.current)
				.sort(([, a], [, b]) =>
					a.current!.compareDocumentPosition(b.current!) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
				);
			const index = row.findIndex(([id]) => id === fromId);
			if (index < 0 || row.length < 2) return;
			const [nextId, trigger] = row[(index + direction + row.length) % row.length];
			// As a hover swap: the popover doesn't take focus, the tag does, so the next Tab goes on from it.
			open(nextId, true);
			trigger.current?.focus();
		},
		[open],
	);
	const value = React.useMemo(
		() => ({ state, openId: openState.openId, open, close, register, step }),
		[openState.openId, open, close, register, step],
	);
	return <TagsPopoverGroupContext.Provider value={value}>{children}</TagsPopoverGroupContext.Provider>;
}

/**
 * A patient's tag (a flag) with details: a Badge button that opens them in a popover. The popover stays open wherever
 * the mouse goes, so its text can be selected and copied; a click outside it (the tag included) or Escape closes it
 * (Nov 10, 2026, user's call). In a TagsPopoverGroup, once one is open, hovering another tag of the row opens that one
 * instead. Its clicks, and the popover's, stop at the tag, so on a card they never
 * reach the card's open target. Used by the patient cards' tag rows and PatientHeader; built on Popover.
 */
function TagsPopover({ label, details, variant = "outline", size = "sm" }: TagsPopoverProps) {
	const id = React.useId();
	const group = React.useContext(TagsPopoverGroupContext);
	const [ownOpen, setOwnOpen] = React.useState(false);
	const open = group ? group.openId === id : ownOpen;
	const setOpen = React.useCallback(
		(next: boolean) => {
			if (!group) return setOwnOpen(next);
			if (next) group.open(id, false);
			else group.close(id);
		},
		[group, id],
	);
	const stop = (event: React.SyntheticEvent) => event.stopPropagation();
	const triggerRef = React.useRef<HTMLButtonElement>(null);
	const contentRef = React.useRef<HTMLDivElement>(null);
	const inside = React.useMemo(() => [triggerRef, contentRef], []);
	// Closed with Escape: the tag gets focus back without its ring (`data-quiet-focus`) until the next key or blur.
	const escaped = React.useRef(false);
	const ringAgain = () => triggerRef.current?.removeAttribute("data-quiet-focus");
	const register = group?.register;
	React.useEffect(() => register?.(id, triggerRef), [register, id]);
	// While its popover is open, Tab, wherever focus is (a hover swap leaves it on the tag first clicked), opens the next
	// tag's in the row, looping, and Shift+Tab the previous one's (Nov 10, 2026, user's call), as the mouse does along the
	// row. Only the open one listens.
	const step = group?.step;
	React.useEffect(() => {
		if (!open || !step) return;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Tab" || event.altKey || event.ctrlKey || event.metaKey) return;
			event.preventDefault();
			event.stopPropagation();
			step(id, event.shiftKey ? -1 : 1);
		};
		document.addEventListener("keydown", onKeyDown, true);
		return () => document.removeEventListener("keydown", onKeyDown, true);
	}, [open, step, id]);
	const close = React.useCallback(() => setOpen(false), [setOpen]);
	useOutsidePressOnlyCloses(open, close, inside);
	useOutsideArrowCursor(open);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			{/* A click on the tag toggles it; a click anywhere else only closes it (useOutsidePressOnlyCloses); moving the
			    mouse away doesn't. With another of the row's popovers open, the mouse coming onto this tag swaps to it. */}
			<PopoverTrigger
				ref={triggerRef}
				data-tags-popover-inside=''
				asChild
				onClick={stop}
				onKeyDown={ringAgain}
				onBlur={ringAgain}
				onPointerEnter={(event) => {
					if (event.pointerType === "mouse" && group?.openId && group.openId !== id) group.open(id, true);
				}}
			>
				{/* On hover, and while its popover is open: the hover fill and a `foreground` border. */}
				<Badge
					asChild
					variant={variant}
					size={size}
					className='shrink-0 transition-[color,background-color,border-color,box-shadow] hover:border-foreground hover:bg-accent data-[state=open]:border-foreground data-[state=open]:bg-accent data-quiet-focus:focus-visible:ring-0 data-quiet-focus:focus-visible:ring-offset-0'
				>
					<button type='button'>{label}</button>
				</Badge>
			</PopoverTrigger>
			{/* React sends a portal's events up its component tree, so the popover's clicks stop here too. */}
			<PopoverContent
				ref={contentRef}
				data-tags-popover-inside=''
				align='start'
				aria-label={label}
				onClick={stop}
				// Opened by a hover swap, it leaves focus where it was; closed by one, it doesn't pull focus back to its tag.
				onOpenAutoFocus={(event) => {
					if (group?.state.current.viaHover) event.preventDefault();
				}}
				onEscapeKeyDown={() => {
					escaped.current = true;
				}}
				onCloseAutoFocus={(event) => {
					const openId = group?.state.current.openId;
					if (openId && openId !== id) {
						event.preventDefault();
						return;
					}
					// Escape gives focus back to the tag, for the keyboard, without its ring (Nov 10, 2026, user's call: "if I hit
					// esc, outline should be not visible anymore"); the next key on it, or leaving it, brings the ring back.
					if (escaped.current) triggerRef.current?.setAttribute("data-quiet-focus", "");
					escaped.current = false;
				}}
			>
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
				{/* Last, full width, 16px under the content (the popover's 12px gap plus 4px; intercept.ds `1352:13395`). */}
				{details.action ? (
					<Button
						variant='outline'
						size='sm'
						className='mt-1 w-full'
						onClick={() => {
							close();
							details.action?.onSelect();
						}}
					>
						{details.action.label}
					</Button>
				) : null}
			</PopoverContent>
		</Popover>
	);
}

export { TagsPopover, TagsPopoverGroup, type TagsPopoverDetails, type TagsPopoverProps };
