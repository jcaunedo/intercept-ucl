"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Maximize2Icon, SparklesIcon, XIcon } from "lucide-react";

import { Button } from "@/components/buttons/button";
import { PatientCardAlert } from "@/components/cards/patient-census-card";
import { Avatar, AvatarFallback, AvatarImage, type AvatarFallbackProps } from "@/components/data-display/avatar";
import { setToastCloseHandler, toast, toastsMuted } from "@/components/feedback/sonner";
import { useCurrentMinute } from "@/lib/hooks/use-current-minute";
import { pressPattern, urgencyRingVariants, useMotionPreference, useUrgencyPhase } from "@/lib/motion";
import { formatRelativeDate } from "@/lib/relative-date";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* AlertToast                                                                 */
/* -------------------------------------------------------------------------- */

/** The alert's severity, PatientCardAlert's names, or `resolved` once it's resolved. */
type AlertToastSeverity = "critical" | "high" | "medium" | "low" | "resolved";

// PatientCard's alert ring, so a toast and its patient's card look alike.
const ringClassNames: Record<AlertToastSeverity, string> = {
	critical: "border-severity-critical bg-severity-critical/5",
	high: "border-severity-high bg-severity-high/5",
	medium: "border-severity-medium bg-severity-medium/5",
	low: "border-severity-low bg-severity-low/5",
	resolved: "border-success bg-success/5",
};

type AlertToastOwnProps = {
	severity?: AlertToastSeverity;
	/** What changed, after the pill, e.g. "Up from Medium", "Acknowledged". Nothing for a new alert. */
	change?: string;
	/**
	 * Nothing left to do: someone addressed it, it eased or it's resolved. The ring stays still, a Critical toast leaves on
	 * its own like the others and isn't announced as urgent. A `resolved` toast is always addressed.
	 */
	addressed?: boolean;
	/** What happened, e.g. "Deterioration score crossed threshold". */
	title: string;
	/**
	 * When it fired, ISO 8601 or a Date. Shown in the first row as a relative time ("Just now", "14 min ago"), updated each
	 * minute; the exact time is in its tooltip.
	 */
	firedAt?: string | Date;
	/** Why it matters for this patient, e.g. "Rising RR, SpO₂ decline, positive fluid balance, HFrEF". */
	reason?: string;
	/** Repeats of the same condition, shown as "· 3" in the pill when 2 or more: one toast per condition (AL-11). */
	count?: number;
	/** "Hayes, Margaret". */
	patientName: string;
	/** "Chadron Community Hospital · Med-Surg · Bed 4". The hospital truncates first. */
	location?: string;
	/** @deprecated Ignored since Nov 2, 2026: the toast no longer shows the patient's risk rank. */
	rank?: number;
	photo?: string;
	initials?: string;
	tone?: AvatarFallbackProps["tone"];
	/** Opens the patient. Without it, there's no Open patient button. */
	onOpen?: () => void;
	openLabel?: string;
	/** Acknowledges the alert. Without it, there's no Acknowledge button. */
	onAcknowledge?: () => void;
	acknowledgeLabel?: string;
	/** Asks Intercept about this alert. Without it, there's no Ask button. */
	onAsk?: () => void;
	askLabel?: string;
	/**
	 * Opens the alert. The whole header row (the severity, what changed, the time and a maximize icon at its end) becomes
	 * one button, as the monitoring card's alert bar is. Without it, there's no maximize icon.
	 */
	onOpenAlert?: () => void;
	/** Read before the header's words, e.g. "Open alert: Medium, Just now". */
	openAlertLabel?: string;
	/** Closes the toast; the alert stays in the queue. Without it, there's no close button. */
	onClose?: () => void;
	closeLabel?: string;
};

type AlertToastProps = Omit<React.ComponentProps<"div">, keyof AlertToastOwnProps> & AlertToastOwnProps;

/**
 * A change in a patient's alert: severity and what changed, when, what happened, why, and the patient, with Open
 * patient, Acknowledge and Ask. Until it's addressed, its ring pulses (Urgency, in step with the patient cards) until the
 * pointer or keyboard focus reaches it. An unaddressed Critical toast is announced at once (`role='alert'`); the others
 * politely, by the Toaster's live region.
 * Show it with `toastAlert()`; render it directly only for a static preview.
 *
 * Figma: [intercept.ds › alert-toast](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1287-345)
 */
function AlertToast({
	className,
	severity = "critical",
	change,
	addressed: addressedProp = false,
	title,
	firedAt,
	reason,
	count,
	patientName,
	location,
	rank: _rank,
	photo,
	initials,
	tone,
	onOpen,
	openLabel = "Open patient",
	onAcknowledge,
	acknowledgeLabel = "Acknowledge",
	onAsk,
	askLabel = "Ask",
	onOpenAlert,
	openAlertLabel = "Open alert",
	onClose,
	closeLabel = "Dismiss alert",
	onPointerEnter,
	onFocus,
	...props
}: AlertToastProps) {
	const { prefersReducedMotion } = useMotionPreference();
	// Seen once the clinician points at it or tabs into it, as a card stops pulsing once clicked.
	const [seen, setSeen] = React.useState(false);
	const addressed = addressedProp || severity === "resolved";
	const pulse = useUrgencyPhase(!seen && !addressed && !prefersReducedMotion);
	const firedTime = firedAt === undefined ? undefined : new Date(firedAt);
	const hasTime = firedTime !== undefined && !Number.isNaN(firedTime.getTime());
	// Re-renders on each minute boundary, so "Just now" becomes "1 min ago" while the toast is open. Null on the server.
	const now = useCurrentMinute();
	const firedLabel = hasTime && now !== null ? formatRelativeDate(firedTime, now) : undefined;
	const hasActions = Boolean(onOpen || onAcknowledge || onAsk);
	const header = (
		<>
			{/* With `onOpenAlert`, the pill darkens while the row is hovered, as the cards' alert badge and alert bar do:
			    `--gray-700` at 32% over its fill, under its icon and words. */}
			<PatientCardAlert
				variant={severity}
				count={count}
				className={
					onOpenAlert
						? "relative isolate before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-full before:bg-(--gray-700)/32 before:opacity-0 before:transition-opacity group-hover/open:before:opacity-100"
						: undefined
				}
			/>
			{change ? <span className='text-sm font-medium text-muted-foreground'>{change}</span> : null}
			{firedLabel ? (
				<time dateTime={firedTime?.toISOString()} title={firedLabel.title} className='text-sm text-foreground'>
					{firedLabel.label}
				</time>
			) : null}
		</>
	);
	const closeButton = onClose ? (
		<Button variant='ghost' size='icon-sm' className='text-muted-foreground' aria-label={closeLabel} onClick={onClose}>
			<XIcon aria-hidden='true' />
		</Button>
	) : null;

	return (
		<div
			data-slot='alert-toast'
			data-severity={severity}
			data-addressed={addressed || undefined}
			role={severity === "critical" && !addressed ? "alert" : undefined}
			className={cn(
				"relative isolate flex w-[var(--width,400px)] max-w-full flex-col gap-3 rounded-card border border-border bg-popover p-4 font-sans text-popover-foreground shadow-toast",
				className,
			)}
			onPointerEnter={(event) => {
				setSeen(true);
				onPointerEnter?.(event);
			}}
			onFocus={(event) => {
				setSeen(true);
				onFocus?.(event);
			}}
			{...props}
		>
			{/* A static wrapper, so a collapsed stack can hide the ring without fighting its animated opacity. */}
			<span data-slot='alert-toast-ring' aria-hidden='true' className='pointer-events-none absolute -inset-px -z-10'>
				<motion.span
					initial={false}
					animate={pulse}
					variants={urgencyRingVariants}
					className={cn("absolute inset-0 rounded-card border-2", ringClassNames[severity])}
				/>
			</span>

			{onOpenAlert ? (
				// The row is one target for opening the alert, reaching 4px past the pill (its focus ring); no hover fill, the
				// maximize icon darkens instead. The close button stays its own, right after it, 4px into the padding.
				<div className='-m-1 flex items-center'>
					<motion.button
						type='button'
						onClick={onOpenAlert}
						// Sonner starts a swipe (and captures the pointer) on any press that doesn't land on a <button> itself, which
						// would swallow a click on the pill, the time or the icon. Keep the press here.
						onPointerDown={(event) => event.stopPropagation()}
						className='group/open flex min-w-0 flex-1 items-center gap-2 rounded-button-md p-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring'
						{...(prefersReducedMotion ? {} : pressPattern)}
					>
						<span className='sr-only'>{openAlertLabel}: </span>
						{header}
						{/* The icon darkens with the row's hover, so it reads as what the row does. */}
						<Maximize2Icon
							aria-hidden='true'
							className='mr-1 ml-auto size-4 shrink-0 text-muted-foreground transition-colors duration-160 ease-in-out group-hover/open:text-foreground'
						/>
					</motion.button>
					{closeButton}
				</div>
			) : (
				<div className='flex items-center gap-2'>
					{header}
					{closeButton ? <div className='-my-1 -mr-1 ml-auto flex'>{closeButton}</div> : null}
				</div>
			)}

			<div className='flex flex-col'>
				<p className='text-base font-bold text-foreground'>{title}</p>
				{reason ? <p className='text-sm text-foreground'>{reason}</p> : null}
			</div>

			<div className='flex min-w-0 items-center gap-2'>
				{photo || initials ? (
					<Avatar size='sm'>
						{photo ? <AvatarImage src={photo} alt='' /> : null}
						{initials ? <AvatarFallback tone={tone}>{initials}</AvatarFallback> : null}
					</Avatar>
				) : null}
				<div className='flex min-w-0 flex-col'>
					<p className='truncate text-base font-semibold text-foreground'>{patientName}</p>
					{location ? (
						<p className='truncate text-sm text-muted-foreground' title={location}>
							{location}
						</p>
					) : null}
				</div>
			</div>

			{hasActions ? (
				<div className='flex items-center gap-2'>
					{onOpen ? (
						<Button variant='neutral' size='sm' onClick={onOpen}>
							{openLabel}
						</Button>
					) : null}
					{onAcknowledge ? (
						<Button size='sm' variant='outline' onClick={onAcknowledge}>
							{acknowledgeLabel}
						</Button>
					) : null}
					{onAsk ? (
						<Button size='sm' variant='outline' onClick={onAsk}>
							<SparklesIcon aria-hidden='true' />
							{askLabel}
						</Button>
					) : null}
				</div>
			) : null}
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/* toastAlert                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * How long a toast stays, in ms: 10 s. An unaddressed Critical alert stays until the clinician acts on it or closes it.
 * Hovering the stack pauses the timer.
 */
const alertToastDuration = 10_000;

/** How long a Resolved toast stays, in ms: 3 s. Nothing is left to do, so it only lets the clinician know, then goes. */
const resolvedToastDuration = 3_000;

// A collapsed stack sizes the toasts behind the front one to its height. As Sonner does for its own toasts, those keep
// their surface, shadow and ring and hide their content, cut to that height, so a taller toast doesn't show through and
// the edges of the stack stay visible.
const stackedToastClassName = cn(
	"[&_[data-slot=alert-toast]>*]:transition-opacity",
	"data-[expanded=false]:data-[front=false]:[&_[data-slot=alert-toast]]:h-full",
	"data-[expanded=false]:data-[front=false]:[&_[data-slot=alert-toast]]:overflow-hidden",
	"data-[expanded=false]:data-[front=false]:[&_[data-slot=alert-toast]>*:not([data-slot=alert-toast-ring])]:opacity-0",
);

type ToastAlertOptions = AlertToastOwnProps & {
	/** The alert's id. A second toast with the same id updates the first instead of stacking a new one (AL-11). */
	id?: string | number;
	/**
	 * Overrides the duration (`alertToastDuration`; `resolvedToastDuration` for a Resolved alert; until closed for an
	 * unaddressed Critical alert), in ms.
	 */
	duration?: number;
};

/**
 * Shows an AlertToast in the app's Toaster and returns its id. Open patient, Acknowledge, Ask and maximize run their
 * handler, then close the toast; the close button and the Toaster's Close all close it and call `onClose`. An unaddressed Critical toast can't be swiped away, so
 * it isn't lost by accident. While toasts are muted (the Toaster's Don't show, `muteToasts()`), it shows nothing and
 * returns undefined, except for an unaddressed Critical, which still interrupts (AL-02).
 */
function toastAlert({ id, duration, onOpen, onAcknowledge, onAsk, onOpenAlert, onClose, ...props }: ToastAlertOptions) {
	const interrupts = (props.severity ?? "critical") === "critical" && !props.addressed;
	if (!interrupts && toastsMuted()) return undefined;
	// Its handler leaves with it, however it goes.
	const forget = () => setToastCloseHandler(toastId, null);
	const toastId = toast.custom(
		(toastId) => (
			<AlertToast
				{...props}
				onOpen={
					onOpen &&
					(() => {
						onOpen();
						toast.dismiss(toastId);
					})
				}
				onAcknowledge={
					onAcknowledge &&
					(() => {
						onAcknowledge();
						toast.dismiss(toastId);
					})
				}
				onAsk={
					onAsk &&
					(() => {
						onAsk();
						toast.dismiss(toastId);
					})
				}
				onOpenAlert={
					onOpenAlert &&
					(() => {
						onOpenAlert();
						toast.dismiss(toastId);
					})
				}
				onClose={() => {
					toast.dismiss(toastId);
					onClose?.();
				}}
			/>
		),
		{
			id,
			duration:
				duration ??
				(interrupts
					? Number.POSITIVE_INFINITY
					: props.severity === "resolved"
						? resolvedToastDuration
						: alertToastDuration),
			dismissible: !interrupts,
			className: stackedToastClassName,
			onDismiss: forget,
			onAutoClose: forget,
		},
	);
	// Close all closes it as its × does. A later toast with the same id replaces the handler.
	setToastCloseHandler(toastId, onClose ?? null);
	return toastId;
}

export {
	AlertToast,
	toastAlert,
	alertToastDuration,
	resolvedToastDuration,
	type AlertToastProps,
	type AlertToastSeverity,
	type ToastAlertOptions,
};
