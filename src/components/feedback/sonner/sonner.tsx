"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import {
	BellOffIcon,
	ChevronDownIcon,
	CircleCheckIcon,
	InfoIcon,
	Loader2Icon,
	OctagonXIcon,
	PlayIcon,
	TriangleAlertIcon,
	XIcon,
} from "lucide-react";
import { Toaster as Sonner, toast, useSonner, type ExternalToast, type ToasterProps } from "./vendor/sonner";

import { Button } from "@/components/buttons/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuShortcut,
	DropdownMenuTrigger,
} from "@/components/overlays/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/overlays/tooltip";
import { exitTransition, fadeVariants, standardTransition, useMotionPreference } from "@/lib/motion";
import { cn } from "@/lib/utils";

// The actions sit this far above the top toast.
const actionsGap = 8;
// The actions and the Don't show menu: a press there keeps a spread stack spread, as one on the stack does.
const actionsSelector = "[data-slot=toaster-actions], [data-toaster-menu]";
// The actions row's height (Button `sm`).
const actionsHeight = 32;
// Sonner's own timing for moving the stack (its CSS), so scrolling back as the stack collapses moves with it.
const stackTransition = "transform 0.4s ease, translate 0.4s ease";

/** How high the stack may reach, in px from the viewport's top: the screen's edge (`offset`), then the actions row. */
const stackTopLimit = (offset: number) => offset + actionsHeight + actionsGap;

/** The toasts on screen in the stack: not leaving, not past `visibleToasts`. */
const stackToasts = () =>
	[...document.querySelectorAll<HTMLElement>("[data-sonner-toaster] [data-sonner-toast]")].filter(
		(element) => element.dataset.removed !== "true" && element.dataset.visible !== "false",
	);

/* -------------------------------------------------------------------------- */
/* Closing                                                                    */
/* -------------------------------------------------------------------------- */

// What closing each toast does, by toast id, beyond dismissing it (e.g. AlertToast's `onClose`), so Close all closes
// every toast as its own × would. A toast's handler goes when it leaves.
const closeHandlers = new Map<string | number, () => void>();

/** Sets what closing the toast `id` does, with its × or Close all; `null` removes it. */
function setToastCloseHandler(id: string | number, handler: (() => void) | null) {
	if (handler) closeHandlers.set(id, handler);
	else closeHandlers.delete(id);
}

// Toasts every rule leaves on screen until they're acted on, by id: Close all, `hidden` and muting don't reach them (an
// incoming consult call, AlertToast's `consult-request`; Nov 4, 2026, user's call). While one is up, the Toaster shows.
const keptToasts = new Set<string | number>();
const keptListeners = new Set<() => void>();
// Bumped on every change, so a component can follow the set.
let keptVersion = 0;

/** Keeps the toast `id` on screen whatever the Toaster's rules (Close all, `hidden`), or stops keeping it. */
function setToastKept(id: string | number, kept: boolean) {
	if (kept === keptToasts.has(id)) return;
	if (kept) keptToasts.add(id);
	else keptToasts.delete(id);
	keptVersion++;
	keptListeners.forEach((listener) => listener());
}

function subscribeKept(listener: () => void) {
	keptListeners.add(listener);
	return () => keptListeners.delete(listener);
}

/** Whether a kept toast is up, which overrides the Toaster's `hidden`. */
function useKeptToastShown() {
	return React.useSyncExternalStore(
		subscribeKept,
		() => keptToasts.size > 0,
		() => false,
	);
}

/** Re-renders when a toast is kept or let go. */
function useKeptToastsVersion() {
	return React.useSyncExternalStore(
		subscribeKept,
		() => keptVersion,
		() => 0,
	);
}

// How many Toasters are showing their toasts: mounted and not `hidden` (or hidden but showing a kept toast). With none,
// a toast waits out of sight or has nowhere to show, so a sound that comes with it (Intercept Live's alert ping) waits
// too (Nov 4, 2026, user's call: "I hear a ping and nothing happened").
let toastersOnScreen = 0;
const onScreenListeners = new Set<() => void>();

/** Whether toasts show on screen right now: a Toaster is mounted and isn't hiding them. */
function toastsOnScreen(): boolean {
	return toastersOnScreen > 0;
}

function subscribeOnScreen(listener: () => void) {
	onScreenListeners.add(listener);
	return () => onScreenListeners.delete(listener);
}

/** `toastsOnScreen()`, following its changes. */
function useToastsOnScreen() {
	return React.useSyncExternalStore(subscribeOnScreen, toastsOnScreen, () => false);
}

/** Counts a Toaster as showing its toasts while `shown`. */
function useCountOnScreen(shown: boolean) {
	React.useEffect(() => {
		if (!shown) return;
		toastersOnScreen++;
		onScreenListeners.forEach((listener) => listener());
		return () => {
			toastersOnScreen--;
			onScreenListeners.forEach((listener) => listener());
		};
	}, [shown]);
}

/** Dismisses every toast but the kept ones. */
function dismissAllButKept() {
	if (keptToasts.size === 0) toast.dismiss();
	else for (const item of toast.getToasts()) if (!keptToasts.has(item.id)) toast.dismiss(item.id);
}

/** Closes every toast but the kept ones, running each one's close handler first. */
function closeAllToasts() {
	const handlers = [...closeHandlers.values()];
	closeHandlers.clear();
	dismissAllButKept();
	for (const handler of handlers) handler();
}

/* -------------------------------------------------------------------------- */
/* Muting                                                                     */
/* -------------------------------------------------------------------------- */

// Whether toasts are muted: `until` a timestamp (Don't show), `paused` with no end (Close all, until Resume), or
// `untilReload` (the muted notice closed with its ×), or none. One for the whole app, like the Toaster; replaced on each
// change, so it can be a store snapshot.
type MuteState = { until: number | null; paused: boolean; untilReload: boolean };
const unmuted: MuteState = { until: null, paused: false, untilReload: false };
let muteState: MuteState = unmuted;
const muteListeners = new Set<() => void>();

/**
 * Stops alert toasts, an unaddressed Critical included (Nov 3, 2026, user's call), until `until`, with no end until
 * they're resumed with `"paused"` (Close all, Nov 6, 2026, user's call), or until the app reloads with `"reload"`, or
 * shows them again with `null`. `toastAlert()` checks it (`toastsMuted()`) before showing a toast; the Toaster's Don't
 * show menu, its Close all and its muted notice set it.
 */
function muteToasts(until: Date | "paused" | "reload" | null) {
	muteState =
		until === "reload"
			? { until: null, paused: false, untilReload: true }
			: until === "paused"
				? { until: null, paused: true, untilReload: false }
				: until && until.getTime() > Date.now()
					? { until: until.getTime(), paused: false, untilReload: false }
					: unmuted;
	muteListeners.forEach((listener) => listener());
}

/** When muted toasts may show again, or undefined when they aren't muted or are muted until the app reloads. */
function toastsMutedUntil(): Date | undefined {
	const { until } = muteState;
	return until !== null && until > Date.now() ? new Date(until) : undefined;
}

/** Whether toasts are muted: for a time, until resumed (after Close all), or until the app reloads. */
function toastsMuted(): boolean {
	return muteState.untilReload || muteState.paused || toastsMutedUntil() !== undefined;
}

function useMuteState() {
	const state = React.useSyncExternalStore(
		(listener) => {
			muteListeners.add(listener);
			return () => muteListeners.delete(listener);
		},
		() => muteState,
		() => unmuted,
	);
	// Unmuted on its own once the time is up.
	React.useEffect(() => {
		if (state.until === null) return;
		const timer = window.setTimeout(() => muteToasts(null), Math.max(0, state.until - Date.now()));
		return () => window.clearTimeout(timer);
	}, [state.until]);
	return state;
}

/**
 * `toastsMuted()`, following its changes: true from Don't show until the time is up, Play, or the reload. Alert sounds
 * stop meanwhile (Nov 4, 2026, user's call: "When any Don't show is selected alert's sound should stop").
 */
function useToastsMuted() {
	const { until, untilReload } = useMuteState();
	return untilReload || until !== null;
}

// The clinician's shifts change at 7 (Nov 2, 2026): "this evening" is 7 PM today, "tomorrow" 7 AM tomorrow.
const muteOptions: { label: string; until: (now: Date) => Date | undefined }[] = [
	{ label: "For 30 mins", until: (now) => new Date(now.getTime() + 30 * 60_000) },
	{ label: "For 1 hour", until: (now) => new Date(now.getTime() + 60 * 60_000) },
	{ label: "For 2 hours", until: (now) => new Date(now.getTime() + 2 * 60 * 60_000) },
	{
		label: "Until this evening",
		// Only before the evening starts.
		until: (now) => {
			const evening = new Date(now);
			evening.setHours(19, 0, 0, 0);
			return evening > now ? evening : undefined;
		},
	},
	{
		label: "Until tomorrow",
		until: (now) => {
			const morning = new Date(now);
			morning.setDate(morning.getDate() + 1);
			morning.setHours(7, 0, 0, 0);
			return morning;
		},
	},
];

const muteTimeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

/* -------------------------------------------------------------------------- */
/* Pausing                                                                    */
/* -------------------------------------------------------------------------- */

// Sonner pauses every toast's timer while its stack is hovered, spread or pressed (`interacting`). UCL's copy
// takes a `paused` prop that holds them the same way, without moving anything on screen. Counted, so the actions row and
// `hidden` can each hold them, and kept here, outside the Toaster, so a hold made with no toasts reaches the next ones.
// ⚠️ Don't go back to pressing the list with a synthetic pointerdown (until Nov 5, 2026): it bubbled to the document,
// where an open Radix modal (the alert panel) took it for a click outside and closed (DESIGN.md "Sonner").
let pauseCount = 0;
const pauseListeners = new Set<() => void>();
const subscribePause = (listener: () => void) => {
	pauseListeners.add(listener);
	return () => {
		pauseListeners.delete(listener);
	};
};
const toastsPaused = () => pauseCount > 0;
const changePause = (delta: number) => {
	pauseCount += delta;
	for (const listener of pauseListeners) listener();
};

/** Holds every toast's timer while `paused`, without moving the stack: toasts neither leave nor expire meanwhile. */
function usePauseToasts(paused: boolean) {
	React.useEffect(() => {
		if (!paused) return;
		changePause(1);
		return () => changePause(-1);
	}, [paused]);
}

/* -------------------------------------------------------------------------- */
/* Scrolling a tall stack                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Spread (clicked), a stack taller than the screen scrolls (Nov 4, 2026, user's call: "I should be able to scroll and see
 * all sonner alerts"). Sonner places each toast from the bottom with transforms, so the list can't be a scroll container;
 * instead, the wheel (or trackpad) moves the whole list down (`translate`, apart from Sonner's `transform`) to bring the
 * toasts above the screen into view, and the list is clipped under the actions row (`limit`), which stays pinned at
 * the top. Focus moving to a toast out of view brings it in. Collapsed, the list moves back with Sonner's collapse.
 */
function useScrollableStack(active: boolean, limit: number) {
	React.useEffect(() => {
		if (!active) return;
		let scroll = 0;
		let frame = 0;
		const list = () => document.querySelector<HTMLElement>("[data-sonner-toaster]");
		// How far the spread stack runs above `limit` when not scrolled; 0 when it fits or is collapsed.
		const overflow = () => {
			const toasts = stackToasts();
			if (!toasts.some((toast) => toast.dataset.expanded === "true")) return 0;
			const highest = Math.min(...toasts.map((toast) => toast.getBoundingClientRect().top)) - scroll;
			return Math.max(0, Math.round(limit - highest));
		};
		const scrollTo = (element: HTMLElement, next: number, max: number) => {
			const clamped = Math.min(max, Math.max(0, next));
			if (clamped === scroll) return false;
			scroll = clamped;
			// Sonner's own transition (`transform` only), so the scroll follows the wheel at once.
			element.style.transition = "";
			element.style.translate = `0 ${scroll}px`;
			return true;
		};
		// Each frame: keep the scroll within the stack as toasts come, go, spread and collapse, and clip it under the row.
		const update = () => {
			const element = list();
			if (element) {
				const max = overflow();
				if (max === 0 && scroll > 0) {
					// Collapsing (or fits again): back down with the stack.
					scroll = 0;
					element.style.transition = stackTransition;
					element.style.translate = "";
				} else if (scroll > max) scrollTo(element, max, max);
				// The clip is in the list's own box, which the scroll moves: its top edge stays at `limit` on screen.
				element.style.clipPath =
					max > 0 ? `inset(${limit - element.getBoundingClientRect().top}px -100vw -100vh -100vw)` : "";
			}
			frame = requestAnimationFrame(update);
		};
		const onWheel = (event: WheelEvent) => {
			const element = list();
			if (!element || !(event.target instanceof Node) || !element.contains(event.target)) return;
			const max = overflow();
			// Wheeling up shows what's above, as in any list; at either end the page scrolls as usual.
			if (max > 0 && scrollTo(element, scroll - event.deltaY, max)) event.preventDefault();
		};
		const onFocusIn = (event: FocusEvent) => {
			const element = list();
			const toast = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-sonner-toast]") : null;
			if (!element || !toast || !element.contains(toast)) return;
			const max = overflow();
			if (max === 0) return;
			const box = toast.getBoundingClientRect();
			const bottom = window.innerHeight;
			if (box.top < limit) scrollTo(element, scroll + (limit - box.top), max);
			else if (box.bottom > bottom) scrollTo(element, scroll - (box.bottom - bottom), max);
		};
		update();
		document.addEventListener("wheel", onWheel, { passive: false });
		document.addEventListener("focusin", onFocusIn);
		return () => {
			cancelAnimationFrame(frame);
			document.removeEventListener("wheel", onWheel);
			document.removeEventListener("focusin", onFocusIn);
			const element = list();
			if (element) {
				element.style.translate = "";
				element.style.clipPath = "";
			}
		};
	}, [active, limit]);
}

/* -------------------------------------------------------------------------- */
/* Actions over the stack                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Where the actions go: `bottom` (px from the viewport's bottom) puts them `actionsGap` above the top toast showing, or
 * null without toasts. Read from the toasts' boxes each frame, so they follow the stack as toasts arrive, leave, collapse
 * and expand (Sonner animates them with CSS transforms, which only the boxes report). Never higher than `limit`: over a
 * stack taller than the screen, they stay pinned at its top (`useScrollableStack`).
 */
function useStackTop(active: boolean, limit: number) {
	const [bottom, setBottom] = React.useState<number | null>(null);
	React.useEffect(() => {
		if (!active) {
			setBottom(null);
			return;
		}
		let frame = 0;
		const measure = () => {
			let top = Infinity;
			for (const element of stackToasts()) top = Math.min(top, element.getBoundingClientRect().top);
			if (Number.isFinite(top)) top = Math.max(top, limit);
			const next = Number.isFinite(top) ? Math.round(window.innerHeight - top + actionsGap) : null;
			setBottom((current) => (current === next ? current : next));
			frame = requestAnimationFrame(measure);
		};
		measure();
		return () => cancelAnimationFrame(frame);
	}, [active, limit]);
	return bottom;
}

// The row floats over the page, so its buttons keep their opaque background on hover (Nov 3, 2026, user's call): the
// outline's hover fill (`accent`) is translucent in light mode, so it goes over the background as a layer instead of
// replacing it, and the page never shows through.
const floatingHover = "hover:bg-background hover:bg-linear-to-b hover:from-accent hover:to-accent";
// Button trims the padding on an icon's side assuming the icon leads; Don't show's chevron trails, so the trim goes to
// the right: the label 12px from the edge, the chevron 8px (less the outline's 1px border).
const trailingIcon = "has-[>svg]:pl-[11px] has-[>svg]:pr-[7px]";

/**
 * The row over the stack, right-aligned with it. With any toast, Don't show (a menu of how long: closes every toast on
 * screen and holds every new one back, Critical too); with two or more, Close all too (closes every toast
 * as its × would, running its close handler, and holds new ones back until Resume: "Alert notifications paused", "Toasts paused" until Nov 10, 2026; Nov 6, 2026, user's
 * call). While muted, "Muted until 4:42 PM" (or "Alert notifications paused"), there even without toasts, with Play to show toasts again and × to close the notice and keep them muted until the app reloads
 * (Nov 3, 2026; the × showed them again before). A click on it doesn't collapse a spread stack, so the buttons never move
 * away from the pointer (`keepExpandedWithin`). While the clinician is on
 * the row (pointer over it, keyboard focus in it, or its menu open), the toasts' timers hold (Nov 3, 2026, user's call),
 * so nothing leaves and the row stays put until they've chosen.
 */
function ToasterActions({
	right,
	closeAllLabel,
	muteLabel,
}: {
	right: number;
	closeAllLabel: string;
	muteLabel: string;
}) {
	const { toasts } = useSonner();
	const { until: mutedUntilTime, paused, untilReload } = useMuteState();
	// A kept toast (an incoming call) can't be muted or closed, so it doesn't count: with only kept toasts left, as after
	// Close all, the row goes (Nov 4, 2026, user's call). Close all shows with two toasts or more, one of them closable.
	useKeptToastsVersion();
	const closable = toasts.filter((item) => !keptToasts.has(item.id)).length;
	const any = closable > 0;
	const several = any && toasts.length >= 2;
	const show = any || mutedUntilTime !== null || paused;
	// Over every toast on screen, a ringing call included: with only the call left (paused by Close all, or muted), the
	// notice sits above it, never over it (Nov 10, 2026, user's call).
	const stackBottom = useStackTop(toasts.length > 0, stackTopLimit(right));
	// Without toasts (muted), the row sits where the stack would.
	const bottom = stackBottom ?? right;
	const [menuOpen, setMenuOpen] = React.useState(false);
	const [pointerOn, setPointerOn] = React.useState(false);
	const [focusIn, setFocusIn] = React.useState(false);
	usePauseToasts(show && (pointerOn || focusIn || menuOpen));

	React.useEffect(() => {
		// Tracked here, not with the row's pointerenter: an open menu blocks pointer events on the page, so closing it with
		// the pointer still on Don't show would end the hold until the pointer moved.
		const onPointerOver = (event: PointerEvent) => {
			const target = event.target instanceof Element ? event.target : null;
			if (event.pointerType !== "touch") setPointerOn(Boolean(target?.closest(actionsSelector)));
		};
		// Leaving the window ends it too.
		const onLeaveWindow = () => setPointerOn(false);
		document.addEventListener("pointerover", onPointerOver);
		document.documentElement.addEventListener("pointerleave", onLeaveWindow);
		return () => {
			document.removeEventListener("pointerover", onPointerOver);
			document.documentElement.removeEventListener("pointerleave", onLeaveWindow);
		};
	}, []);

	const mute = (until: Date) => {
		muteToasts(until);
		// Every toast on screen goes, an alert that interrupts included, and new ones wait for the mute to end, Critical too
		// (Nov 3, 2026, user's calls). Their close handlers don't run: muting isn't closing, so their alerts can toast again
		// once the mute ends. A kept toast (an incoming call) stays.
		dismissAllButKept();
	};
	const now = new Date();

	return (
		<AnimatePresence>
			{show ? (
				<motion.div
					key='toaster-actions'
					data-slot='toaster-actions'
					variants={fadeVariants}
					initial='initial'
					animate='animate'
					exit='exit'
					// With the toasts, under what the user opens (theme.css "Stacking order").
					className='fixed z-(--z-toast) flex items-center gap-2'
					style={{ right, bottom }}
					// Keyboard focus only: focus left by a click would hold the toasts after the pointer has gone.
					onFocus={(event) => setFocusIn(event.target.matches(":focus-visible"))}
					onBlur={(event) => {
						if (!event.currentTarget.contains(event.relatedTarget)) setFocusIn(false);
					}}
				>
					{mutedUntilTime !== null || paused ? (
						<span className='inline-flex h-8 items-center gap-1 rounded-button-md bg-neutral/80 pr-1 pl-3 text-sm text-neutral-foreground shadow-xs'>
							<BellOffIcon aria-hidden='true' className='size-4' />
							<span className='px-1'>
								{mutedUntilTime !== null ? `Muted until ${muteTimeFormat.format(mutedUntilTime)}` : "Alert notifications paused"}
							</span>
							{/* Each named in a tooltip, over the toasts like the row (Nov 3, 2026, user's call). */}
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant='ghost'
											size='icon-xs'
											aria-label='Resume alert notifications'
											className='hover:bg-neutral-foreground/15 hover:text-neutral-foreground'
											onClick={() => muteToasts(null)}
										>
											<PlayIcon aria-hidden='true' />
										</Button>
									</TooltipTrigger>
									<TooltipContent side='top' className='z-(--z-floating)'>
										Resume
									</TooltipContent>
								</Tooltip>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant='ghost'
											size='icon-xs'
											aria-label='Hide, and keep alert notifications muted until reload'
											className='hover:bg-neutral-foreground/15 hover:text-neutral-foreground'
											onClick={() => muteToasts("reload")}
										>
											<XIcon aria-hidden='true' />
										</Button>
									</TooltipTrigger>
									<TooltipContent side='top' className='z-(--z-floating)'>
										Hide
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						</span>
					) : any && !untilReload ? (
						<DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
							<DropdownMenuTrigger asChild>
								<Button variant='outline' size='sm' className={cn(floatingHover, trailingIcon)}>
									{muteLabel}
									<ChevronDownIcon aria-hidden='true' />
								</Button>
							</DropdownMenuTrigger>
							{/* Over the toasts, like the row. */}
							<DropdownMenuContent align='end' data-toaster-menu='' className='z-(--z-floating)'>
								{muteOptions.map(({ label, until }) => {
									const time = until(now);
									return time ? (
										<DropdownMenuItem key={label} onSelect={() => mute(time)}>
											{label}
											<DropdownMenuShortcut>{muteTimeFormat.format(time)}</DropdownMenuShortcut>
										</DropdownMenuItem>
									) : null;
								})}
							</DropdownMenuContent>
						</DropdownMenu>
					) : null}
					{several ? (
						<Button
							variant='outline'
							size='sm'
							// Closes every toast and stops new ones until Resume (Nov 6, 2026, user's call: alerts should stop),
							// alert sounds with them; an incoming call still rings.
							onClick={() => {
								closeAllToasts();
								muteToasts("paused");
							}}
							className={floatingHover}
						>
							{closeAllLabel}
						</Button>
					) : null}
				</motion.div>
			) : null}
		</AnimatePresence>
	);
}

/**
 * The app's toast region: render one, once, near the root, then call `toast()` (or `toastAlert()`) from anywhere.
 * shadcn's Radix Sonner, colored by UCL's tokens instead of Sonner's own theme (no `next-themes`), so `.dark` drives it
 * like everything else.
 * Toasts stack bottom right, 16px from the screen's edges, at most eight shown, the newest at the bottom. Collapsed, each one
 * behind peeks `peek` (16px) above the one in front. A click on the stack spreads them `gap` (8px) apart, and a click
 * outside it (or Escape) collapses it again (Nov 11, 2026, user's call; hovering spread it until then): on a collapsed
 * stack the click only spreads it, except on the front toast's own buttons. Hovering it pauses their timers. "Don't show" (`muteLabel`: for 30 mins … until tomorrow) sits right-aligned 8px above the top toast, with
 * "Close all" (`closeAllLabel`) beside it from two toasts; while muted, "Muted until …" with Play and × takes Don't show's
 * place (× keeps them muted until the app reloads, and the notice goes). `hidden` fades the
 * stack and its buttons out while something covers the screen (e.g. a modal), keeping every toast: their timers pause,
 * new ones queue, and all of them fade back in when it's lifted. A kept toast (`setToastKept`, e.g. an incoming consult
 * call) overrides all of it: Close all leaves it, and while it's up the stack shows even when `hidden`.
 *
 * Figma: [intercept.ds › sonner](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1282-49)
 */
function Toaster({
	className,
	style,
	position = "bottom-right",
	// Eight, since alert toasts no longer leave on their own (Nov 4, 2026, user's calls; was 3, then 5): the rest wait
	// behind.
	visibleToasts = 8,
	gap = 8,
	peek = 16,
	offset = 16,
	mobileOffset = 16,
	toastOptions,
	expand = false,
	closeAllLabel = "Close all",
	muteLabel = "Don't show",
	hidden = false,
	...props
}: ToasterProps & {
	/** Fades the toasts and their buttons out, keeping them: their timers pause until it's false again. */
	hidden?: boolean;
	/** How far each toast behind peeks out of a collapsed stack, in px. `gap` spaces the expanded stack. */
	peek?: number;
	/** The label of the button that closes every toast, shown with two or more. */
	closeAllLabel?: string;
	/** The label of the menu that holds toasts back for a while, shown with two or more. */
	muteLabel?: string;
}) {
	const { resolve } = useMotionPreference();
	// A kept toast (an incoming call) is never hidden: while one is up, the whole stack shows, the call in front.
	const kept = useKeptToastShown();
	const hiddenNow = hidden && !kept;
	// Hidden toasts wait instead of expiring unseen.
	usePauseToasts(hiddenNow);
	useCountOnScreen(!hiddenNow);
	const paused = React.useSyncExternalStore(subscribePause, toastsPaused, () => false);
	const anyToast = useSonner().toasts.length > 0;
	useScrollableStack(anyToast, stackTopLimit(typeof offset === "number" ? offset : 16));
	return (
		// The toasts and the buttons are fixed to the screen, so this wrapper takes no room; its opacity fades them both.
		// Hidden, they're out of reach too (`inert`), and invisible once faded.
		<motion.div
			data-slot='toaster-region'
			data-hidden={hiddenNow || undefined}
			inert={hiddenNow}
			initial={false}
			animate={
				hiddenNow
					? { opacity: 0, transitionEnd: { visibility: "hidden" }, transition: resolve(exitTransition) }
					: { opacity: 1, visibility: "visible", transition: resolve(standardTransition) }
			}
		>
			<Sonner
				paused={paused}
				expand={expand}
				keepExpandedWithin={actionsSelector}
				className={cn("toaster group", className)}
				position={position}
				visibleToasts={visibleToasts}
				gap={gap}
				offset={offset}
				mobileOffset={mobileOffset}
				toastOptions={{
					...toastOptions,
					// Sonner's own toasts only (a custom one, like AlertToast, brings its own shadow on its rounded surface). Sonner
					// sets its shadow with a stronger selector, so this one is marked important.
					classNames: {
						...toastOptions?.classNames,
						toast: cn("data-[styled=true]:shadow-toast!", toastOptions?.classNames?.toast),
					},
				}}
				icons={{
					success: <CircleCheckIcon className='size-4' />,
					info: <InfoIcon className='size-4' />,
					warning: <TriangleAlertIcon className='size-4' />,
					error: <OctagonXIcon className='size-4' />,
					loading: <Loader2Icon className='size-4 animate-spin' />,
				}}
				style={
					{
						"--normal-bg": "var(--popover)",
						"--normal-text": "var(--popover-foreground)",
						"--normal-border": "var(--border)",
						"--border-radius": "var(--radius-card)",
						// Wide enough for an alert's title and the patient's location on one line each.
						"--width": "400px",
						// Sonner reads `gap` for the expanded stack and this variable for the collapsed one's peek.
						"--gap": `${peek}px`,
						// Under the popovers, menus and tooltips the user opens, over dialogs (theme.css "Stacking order"); Sonner's
						// own is 999999999, above everything. While a call rings (a kept toast), above everything, its notice row
						// included (`--z-call`; Nov 10, 2026, user's call).
						zIndex: kept ? "var(--z-call)" : "var(--z-toast)",
						...style,
					} as React.CSSProperties
				}
				{...props}
			/>
			<ToasterActions
				right={typeof offset === "number" ? offset : 16}
				closeAllLabel={closeAllLabel}
				muteLabel={muteLabel}
			/>
		</motion.div>
	);
}

export {
	Toaster,
	toast,
	muteToasts,
	toastsMuted,
	toastsMutedUntil,
	toastsOnScreen,
	useToastsOnScreen,
	useToastsMuted,
	setToastCloseHandler,
	setToastKept,
	type ExternalToast,
	type ToasterProps,
};
