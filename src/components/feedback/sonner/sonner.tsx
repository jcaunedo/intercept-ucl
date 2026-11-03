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
import { Toaster as Sonner, toast, useSonner, type ExternalToast, type ToasterProps } from "sonner";

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

// How long the stack stays expanded after the pointer leaves it, so it can cross to the actions above it without the
// stack collapsing (and the actions dropping) under it.
const holdOpenDelay = 250;
// The actions sit this far above the top toast.
const actionsGap = 8;
// Pointer targets that keep the stack expanded once it is: the stack, the actions and the Don't show menu.
const actionsSelector = "[data-slot=toaster-actions], [data-toaster-menu]";

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

/** Closes every toast, running each one's close handler first. */
function closeAllToasts() {
	const handlers = [...closeHandlers.values()];
	closeHandlers.clear();
	toast.dismiss();
	for (const handler of handlers) handler();
}

/* -------------------------------------------------------------------------- */
/* Muting                                                                     */
/* -------------------------------------------------------------------------- */

// Whether toasts are muted: `until` a timestamp (Don't show), or `untilReload` (the muted notice closed with its ×), or
// neither. One for the whole app, like the Toaster; replaced on each change, so it can be a store snapshot.
type MuteState = { until: number | null; untilReload: boolean };
const unmuted: MuteState = { until: null, untilReload: false };
let muteState: MuteState = unmuted;
const muteListeners = new Set<() => void>();

/**
 * Stops alert toasts, an unaddressed Critical included (Nov 3, 2026, user's call), until `until`, or
 * until the app reloads with `"reload"`, or shows them again with `null`. `toastAlert()` checks it (`toastsMuted()`)
 * before showing a toast; the Toaster's Don't show menu and its muted notice set it.
 */
function muteToasts(until: Date | "reload" | null) {
	muteState =
		until === "reload"
			? { until: null, untilReload: true }
			: until && until.getTime() > Date.now()
				? { until: until.getTime(), untilReload: false }
				: unmuted;
	muteListeners.forEach((listener) => listener());
}

/** When muted toasts may show again, or undefined when they aren't muted or are muted until the app reloads. */
function toastsMutedUntil(): Date | undefined {
	const { until } = muteState;
	return until !== null && until > Date.now() ? new Date(until) : undefined;
}

/** Whether toasts are muted, for a time or until the app reloads. */
function toastsMuted(): boolean {
	return muteState.untilReload || toastsMutedUntil() !== undefined;
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

// Sonner pauses every toast's timer while its stack is hovered (which expands it) or pressed (`interacting`, set by a
// pointerdown on its list and cleared by a pointerup), and has no other way in. Pressing changes nothing on screen, so
// holding the timers sends the list a pointerdown, and letting them go a pointerup. Counted, so the actions row and
// `hidden` can each hold them. The pressed state is the Toaster's and outlives its list, which only exists while there
// are toasts: a change with no list waits for the next one (`syncPause`, which the Toaster runs as toasts come and go),
// so the timers never stay held, nor miss a hold.
let pauseCount = 0;
let pressed = false;

function syncPause() {
	const want = pauseCount > 0;
	if (want === pressed) return;
	const list = document.querySelector<HTMLElement>("[data-sonner-toaster]");
	if (!list) return;
	list.dispatchEvent(new PointerEvent(want ? "pointerdown" : "pointerup", { bubbles: true }));
	pressed = want;
}

/** Holds every toast's timer while `paused`, without moving the stack: toasts neither leave nor expire meanwhile. */
function usePauseToasts(paused: boolean) {
	React.useEffect(() => {
		if (!paused) return;
		pauseCount++;
		syncPause();
		return () => {
			pauseCount--;
			syncPause();
		};
	}, [paused]);
}

/* -------------------------------------------------------------------------- */
/* Actions over the stack                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Where the actions go: `bottom` (px from the viewport's bottom) puts them `actionsGap` above the top toast showing, or
 * null without toasts. Read from the toasts' boxes each frame, so they follow the stack as toasts arrive, leave, collapse
 * and expand (Sonner animates them with CSS transforms, which only the boxes report).
 */
function useStackTop(active: boolean) {
	const [bottom, setBottom] = React.useState<number | null>(null);
	React.useEffect(() => {
		if (!active) {
			setBottom(null);
			return;
		}
		let frame = 0;
		const measure = () => {
			let top = Infinity;
			for (const element of document.querySelectorAll<HTMLElement>("[data-sonner-toaster] [data-sonner-toast]")) {
				if (element.dataset.removed === "true" || element.dataset.visible === "false") continue;
				top = Math.min(top, element.getBoundingClientRect().top);
			}
			const next = Number.isFinite(top) ? Math.round(window.innerHeight - top + actionsGap) : null;
			setBottom((current) => (current === next ? current : next));
			frame = requestAnimationFrame(measure);
		};
		measure();
		return () => cancelAnimationFrame(frame);
	}, [active]);
	return bottom;
}

/**
 * The row over the stack, right-aligned with it. With any toast, Don't show (a menu of how long: closes every toast on
 * screen and holds every new one back, Critical too); with two or more, Close all too (closes every toast
 * as its × would, running its close handler; alerts stay in the queue). While muted, "Muted until 4:42 PM", there even
 * without toasts, with Play to show toasts again and × to close the notice and keep them muted until the app reloads
 * (Nov 3, 2026; the × showed them again before). Over it the stack stays as it was: expanded when the pointer comes from
 * it, collapsed when it comes from elsewhere, so the buttons never move away from the pointer. While the clinician is on
 * the row (pointer over it, keyboard focus in it, or its menu open), the toasts' timers hold (Nov 3, 2026, user's call),
 * so nothing leaves and the row stays put until they've chosen.
 */
function ToasterActions({
	right,
	closeAllLabel,
	muteLabel,
	onHoldOpenChange,
}: {
	right: number;
	closeAllLabel: string;
	muteLabel: string;
	onHoldOpenChange: (hold: boolean) => void;
}) {
	const { toasts } = useSonner();
	const { until: mutedUntilTime, untilReload } = useMuteState();
	const any = toasts.length > 0;
	const several = toasts.length >= 2;
	const show = any || mutedUntilTime !== null;
	const stackBottom = useStackTop(any);
	// Without toasts (muted), the row sits where the stack would.
	const bottom = stackBottom ?? right;
	const hold = React.useRef(false);
	const release = React.useRef<number | undefined>(undefined);
	const [menuOpen, setMenuOpen] = React.useState(false);
	const [pointerOn, setPointerOn] = React.useState(false);
	const [focusIn, setFocusIn] = React.useState(false);
	usePauseToasts(show && (pointerOn || focusIn || menuOpen));

	React.useEffect(() => {
		const setHold = (next: boolean) => {
			if (hold.current === next) return;
			hold.current = next;
			onHoldOpenChange(next);
		};
		const onPointerOver = (event: PointerEvent) => {
			const target = event.target instanceof Element ? event.target : null;
			const overStack = Boolean(target?.closest("[data-sonner-toaster]"));
			const overActions = Boolean(target?.closest(actionsSelector));
			// Tracked here, not with the row's pointerenter: an open menu blocks pointer events on the page, so closing it
			// with the pointer still on Don't show would end the hold until the pointer moved.
			if (event.pointerType !== "touch") setPointerOn(overActions);
			if (overStack || (overActions && hold.current)) {
				window.clearTimeout(release.current);
				setHold(true);
			} else if (!overActions && hold.current) {
				window.clearTimeout(release.current);
				release.current = window.setTimeout(() => setHold(false), holdOpenDelay);
			}
		};
		// Leaving the window ends it too.
		const onLeaveWindow = () => setPointerOn(false);
		document.addEventListener("pointerover", onPointerOver);
		document.documentElement.addEventListener("pointerleave", onLeaveWindow);
		return () => {
			document.removeEventListener("pointerover", onPointerOver);
			document.documentElement.removeEventListener("pointerleave", onLeaveWindow);
			window.clearTimeout(release.current);
		};
	}, [onHoldOpenChange]);

	// Gone with the toasts: let the stack collapse again next time.
	React.useEffect(() => {
		if (!any && hold.current) {
			hold.current = false;
			onHoldOpenChange(false);
		}
	}, [any, onHoldOpenChange]);

	const mute = (until: Date) => {
		muteToasts(until);
		// Every toast on screen goes, an alert that interrupts included, and new ones wait for the mute to end, Critical too
		// (Nov 3, 2026, user's calls). Their close handlers don't run: muting isn't closing, so their alerts can toast again
		// once the mute ends.
		toast.dismiss();
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
					// Above the toasts (Sonner's own z-index).
					className='fixed z-[999999999] flex items-center gap-2'
					style={{ right, bottom }}
					// Keyboard focus only: focus left by a click would hold the toasts after the pointer has gone.
					onFocus={(event) => setFocusIn(event.target.matches(":focus-visible"))}
					onBlur={(event) => {
						if (!event.currentTarget.contains(event.relatedTarget)) setFocusIn(false);
					}}
				>
					{mutedUntilTime !== null ? (
						<span className='inline-flex h-8 items-center gap-1 rounded-button-md border border-input bg-background pr-1 pl-3 text-sm text-foreground shadow-xs'>
							<BellOffIcon aria-hidden='true' className='size-4 text-muted-foreground' />
							<span className='px-1'>Muted until {muteTimeFormat.format(mutedUntilTime)}</span>
							{/* Each named in a tooltip, over the toasts like the row (Nov 3, 2026, user's call). */}
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button variant='ghost' size='icon-xs' aria-label='Resume toasts' onClick={() => muteToasts(null)}>
											<PlayIcon aria-hidden='true' />
										</Button>
									</TooltipTrigger>
									<TooltipContent side='top' className='z-[1000000000]'>
										Resume
									</TooltipContent>
								</Tooltip>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant='ghost'
											size='icon-xs'
											aria-label='Hide, and keep toasts muted until reload'
											onClick={() => muteToasts("reload")}
										>
											<XIcon aria-hidden='true' />
										</Button>
									</TooltipTrigger>
									<TooltipContent side='top' className='z-[1000000000]'>
										Hide
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						</span>
					) : any && !untilReload ? (
						<DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
							<DropdownMenuTrigger asChild>
								<Button variant='outline' size='sm'>
									{muteLabel}
									<ChevronDownIcon aria-hidden='true' />
								</Button>
							</DropdownMenuTrigger>
							{/* Over the toasts, like the row. */}
							<DropdownMenuContent align='end' data-toaster-menu='' className='z-[1000000000]'>
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
						<Button variant='outline' size='sm' onClick={closeAllToasts}>
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
 * Toasts stack bottom right, 16px from the screen's edges, at most three, the newest at the bottom. Collapsed, each one
 * behind peeks `peek` (12px) above the one in front; hovering the stack spreads them `gap` (8px) apart and pauses their
 * timers. "Don't show" (`muteLabel`: for 30 mins … until tomorrow) sits right-aligned 8px above the top toast, with
 * "Close all" (`closeAllLabel`) beside it from two toasts; while muted, "Muted until …" with Play and × takes Don't show's
 * place (× keeps them muted until the app reloads, and the notice goes). `hidden` fades the
 * stack and its buttons out while something covers the screen (e.g. a modal), keeping every toast: their timers pause,
 * new ones queue, and all of them fade back in when it's lifted.
 *
 * Figma: [intercept.ds › sonner](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1282-49)
 */
function Toaster({
	className,
	style,
	position = "bottom-right",
	visibleToasts = 3,
	gap = 8,
	peek = 12,
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
	// Kept expanded while the pointer crosses from the stack to the actions above it.
	const [holdOpen, setHoldOpen] = React.useState(false);
	const { resolve } = useMotionPreference();
	// Hidden toasts wait instead of expiring unseen.
	usePauseToasts(hidden);
	// A hold that changed while there was no list (no toasts) reaches the next one once it's on screen.
	const anyToast = useSonner().toasts.length > 0;
	React.useEffect(() => {
		const frame = requestAnimationFrame(syncPause);
		return () => cancelAnimationFrame(frame);
	}, [anyToast]);
	return (
		// The toasts and the buttons are fixed to the screen, so this wrapper takes no room; its opacity fades them both.
		// Hidden, they're out of reach too (`inert`), and invisible once faded.
		<motion.div
			data-slot='toaster-region'
			data-hidden={hidden || undefined}
			inert={hidden}
			initial={false}
			animate={
				hidden
					? { opacity: 0, transitionEnd: { visibility: "hidden" }, transition: resolve(exitTransition) }
					: { opacity: 1, visibility: "visible", transition: resolve(standardTransition) }
			}
		>
			<Sonner
				expand={expand || holdOpen}
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
						...style,
					} as React.CSSProperties
				}
				{...props}
			/>
			<ToasterActions
				right={typeof offset === "number" ? offset : 16}
				closeAllLabel={closeAllLabel}
				muteLabel={muteLabel}
				onHoldOpenChange={setHoldOpen}
			/>
		</motion.div>
	);
}

export { Toaster, toast, muteToasts, toastsMuted, toastsMutedUntil, setToastCloseHandler, type ExternalToast, type ToasterProps };
