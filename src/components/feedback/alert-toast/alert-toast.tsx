"use client";

import * as React from "react";
import { motion } from "motion/react";
import { SparklesIcon, XIcon } from "lucide-react";

import { Button } from "@/components/buttons/button";
import { PatientCardAlert } from "@/components/cards/patient-census-card";
import { Avatar, AvatarFallback, AvatarImage, type AvatarFallbackProps } from "@/components/data-display/avatar";
import { setToastCloseHandler, toast, toastsMuted } from "@/components/feedback/sonner";
import { useCurrentMinute } from "@/lib/hooks/use-current-minute";
import { urgencyRingVariants, useMotionPreference, useUrgencyPhase } from "@/lib/motion";
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
	/** @deprecated Ignored since Nov 3, 2026: the toast has no Acknowledge button (user's call). */
	onAcknowledge?: () => void;
	/** @deprecated Ignored, with `onAcknowledge`. */
	acknowledgeLabel?: string;
	/** Asks Intercept Live about this alert. Without it, there's no Ask Intercept Live button. */
	onAsk?: () => void;
	askLabel?: string;
	/**
	 * Opens the alert. The whole toast becomes one click target, except its buttons (Open patient, Ask Intercept Live
	 * and the close button). No icon marks it since Nov 3, 2026; the hover border does.
	 */
	onOpenAlert?: () => void;
	/** The click target's name, before the title: "Open alert: Deterioration score crossed threshold". */
	openAlertLabel?: string;
	/** Closes the toast; the alert stays in the queue. Without it, there's no close button. */
	onClose?: () => void;
	closeLabel?: string;
};

type AlertToastProps = Omit<React.ComponentProps<"div">, keyof AlertToastOwnProps> & AlertToastOwnProps;

/**
 * A change in a patient's alert: severity and what changed, when, what happened, why, and the patient, with Open
 * patient and Ask Intercept Live. Until it's addressed, its ring pulses (Urgency, in step with the patient cards) until the
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
	onAcknowledge: _onAcknowledge,
	acknowledgeLabel: _acknowledgeLabel,
	onAsk,
	askLabel = "Ask Intercept Live",
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
	const hasActions = Boolean(onOpen || onAsk);
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
				"group/toast relative isolate flex w-[var(--width,400px)] max-w-full flex-col gap-3 rounded-card border border-border bg-popover p-4 font-sans text-popover-foreground shadow-toast transition-[border-color] duration-160 ease-in-out",
				// Opening the alert, it takes the patient cards' hover: a 2px `foreground` border (the ring hides meanwhile), the
				// padding 1px less so the content stays put.
				onOpenAlert && "hover:border-2 hover:border-foreground hover:p-[15px]",
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
			<span
				data-slot='alert-toast-ring'
				aria-hidden='true'
				className={cn("pointer-events-none absolute -inset-px -z-10", onOpenAlert && "group-hover/toast:opacity-0")}
			>
				<motion.span
					initial={false}
					animate={pulse}
					variants={urgencyRingVariants}
					className={cn("absolute inset-0 rounded-card border-2", ringClassNames[severity])}
				/>
			</span>

			{onOpenAlert ? (
				// The whole toast opens the alert: one button over it, under its own buttons (z-2), which keep their clicks. It's
				// over the avatar too, which is positioned. Sonner starts a swipe (and captures the pointer) on a press that
				// doesn't land on a <button>; this is one, and the press stays here, so the toast isn't swiped away.
				<button
					type='button'
					data-slot='alert-toast-open'
					aria-label={`${openAlertLabel}: ${title}`}
					onClick={onOpenAlert}
					onPointerDown={(event) => event.stopPropagation()}
					className='absolute inset-0 z-1 cursor-pointer rounded-card outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset'
				/>
			) : null}

			<div className='flex items-center gap-2'>
				<PatientCardAlert variant={severity} count={count} />
				{change ? <span className='text-sm font-medium text-muted-foreground'>{change}</span> : null}
				{firedLabel ? (
					<time dateTime={firedTime?.toISOString()} title={firedLabel.title} className='text-sm text-foreground'>
						{firedLabel.label}
					</time>
				) : null}
				{closeButton ? (
					// 4px into the padding.
					<div className='relative z-2 -my-1 -mr-1 ml-auto flex'>{closeButton}</div>
				) : null}
			</div>

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
				<div className='relative z-2 flex items-center gap-2 self-start'>
					{onOpen ? (
						<Button variant='outline' size='sm' onClick={onOpen}>
							{openLabel}
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

// Where each severity stacks in the Toaster: the higher in front. Sonner's own toasts (`toast()`) have 0, behind every alert.
const alertToastPriority: Record<AlertToastSeverity, number> = { critical: 5, high: 4, medium: 3, low: 2, resolved: 1 };

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
 * Shows an AlertToast in the app's Toaster and returns its id. Open patient, Ask Intercept Live and opening the alert run their
 * handler, then close the toast; the close button and the Toaster's Close all close it and call `onClose`. An unaddressed Critical toast can't be swiped away, so
 * it isn't lost by accident. While toasts are muted (the Toaster's Don't show, `muteToasts()`), it shows nothing and
 * returns undefined, an unaddressed Critical included (Nov 3, 2026, user's call; until then it still interrupted, AL-02).
 */
function toastAlert({ id, duration, onOpen, onAcknowledge: _onAcknowledge, onAsk, onOpenAlert, onClose, ...props }: ToastAlertOptions) {
	const interrupts = (props.severity ?? "critical") === "critical" && !props.addressed;
	if (toastsMuted()) return undefined;
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
			// The most severe alert is in front, the newest first within a severity (Nov 3, 2026, user's call).
			priority: alertToastPriority[props.severity ?? "critical"],
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
