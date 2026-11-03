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

// When toasts may show again, as a timestamp, or null when they aren't muted. One for the whole app, like the Toaster.
let mutedUntil: number | null = null;
const muteListeners = new Set<() => void>();

/**
 * Stops toasts that can be put off (every one but an alert that interrupts: an unaddressed Critical) until `until`, or
 * shows them again with `null`. `toastAlert()` checks it before showing a toast; the Toaster's Don't show menu sets it.
 */
function muteToasts(until: Date | null) {
	mutedUntil = until && until.getTime() > Date.now() ? until.getTime() : null;
	muteListeners.forEach((listener) => listener());
}

/** When muted toasts may show again, or undefined when they aren't muted. */
function toastsMutedUntil(): Date | undefined {
	return mutedUntil !== null && mutedUntil > Date.now() ? new Date(mutedUntil) : undefined;
}

function useToastsMutedUntil() {
	const until = React.useSyncExternalStore(
		(listener) => {
			muteListeners.add(listener);
			return () => muteListeners.delete(listener);
		},
		() => mutedUntil,
		() => null,
	);
	// Unmuted on its own once the time is up.
	React.useEffect(() => {
		if (until === null) return;
		const timer = window.setTimeout(() => muteToasts(null), Math.max(0, until - Date.now()));
		return () => window.clearTimeout(timer);
	}, [until]);
	return until;
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
 * The row over the stack, right-aligned with it. With two or more toasts: Don't show (a menu of how long: closes the
 * toasts that can wait and holds new ones back, except an alert that interrupts) and Close all (closes every toast as
 * its × would, running its close handler; alerts stay in the queue). While muted, "Muted until 4:42 PM" with a × to show toasts again, there even without toasts
 * so it can always be undone. Over it the stack stays as it was: expanded when the pointer comes from it, collapsed when
 * it comes from elsewhere, so the buttons never move away from the pointer.
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
	const mutedUntilTime = useToastsMutedUntil();
	const several = toasts.length >= 2;
	const show = several || mutedUntilTime !== null;
	const stackBottom = useStackTop(show && toasts.length > 0);
	// Without toasts (muted), the row sits where the stack would.
	const bottom = stackBottom ?? right;
	const hold = React.useRef(false);
	const release = React.useRef<number | undefined>(undefined);
	const [menuOpen, setMenuOpen] = React.useState(false);

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
			if (overStack || (overActions && hold.current)) {
				window.clearTimeout(release.current);
				setHold(true);
			} else if (!overActions && hold.current) {
				window.clearTimeout(release.current);
				release.current = window.setTimeout(() => setHold(false), holdOpenDelay);
			}
		};
		document.addEventListener("pointerover", onPointerOver);
		return () => {
			document.removeEventListener("pointerover", onPointerOver);
			window.clearTimeout(release.current);
		};
	}, [onHoldOpenChange]);

	// Gone with the toasts: let the stack collapse again next time.
	React.useEffect(() => {
		if (!several && hold.current) {
			hold.current = false;
			onHoldOpenChange(false);
		}
	}, [several, onHoldOpenChange]);

	const mute = (until: Date) => {
		muteToasts(until);
		// The toasts that can wait go; an alert that interrupts (Sonner's `dismissible: false`) stays.
		for (const item of toasts) if (item.dismissible !== false) toast.dismiss(item.id);
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
				>
					{mutedUntilTime !== null ? (
						<span className='inline-flex h-8 items-center gap-1 rounded-button-md border border-input bg-background pr-1 pl-3 text-sm text-foreground shadow-xs'>
							<BellOffIcon aria-hidden='true' className='size-4 text-muted-foreground' />
							<span className='px-1'>Muted until {muteTimeFormat.format(mutedUntilTime)}</span>
							<Button variant='ghost' size='icon-xs' aria-label='Show toasts again' onClick={() => muteToasts(null)}>
								<XIcon aria-hidden='true' />
							</Button>
						</span>
					) : several ? (
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
 * timers. With two or more, "Don't show" (`muteLabel`: for 30 mins … until tomorrow) and "Close all" (`closeAllLabel`) sit
 * right-aligned 8px above the top toast; while muted, "Muted until …" with a × takes Don't show's place. `hidden` fades the
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
				// Sonner pauses a toast's timer while the stack is expanded, so hidden toasts wait instead of expiring unseen.
				expand={expand || holdOpen || hidden}
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

export { Toaster, toast, muteToasts, toastsMutedUntil, setToastCloseHandler, type ExternalToast, type ToasterProps };
