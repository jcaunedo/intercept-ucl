"use client";

import * as React from "react";
import { motion } from "motion/react";
import { SparklesIcon, VideoIcon, VideoOffIcon, XIcon } from "lucide-react";

import { Button } from "@/components/buttons/button";
import { PatientCardAlert } from "@/components/cards/patient-census-card";
import { Avatar, AvatarFallback, AvatarImage, type AvatarFallbackProps } from "@/components/data-display/avatar";
import { setToastCloseHandler, setToastKept, toast, toastsMuted, useToastsMuted } from "@/components/feedback/sonner";
import { useCurrentMinute } from "@/lib/hooks/use-current-minute";
import { useCurrentSecond } from "@/lib/hooks/use-current-second";
import { useRingtone, type RingUrgency } from "@/lib/hooks/use-ringtone";
import { arriveVariants, fadeVariants, useMotionPreference } from "@/lib/motion";
import { formatRelativeDate } from "@/lib/relative-date";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* AlertToast                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The alert's severity, PatientCardAlert's names, or `resolved` once it's resolved. `consult-request`: a hospital calling
 * the hub for a video consult, which rings until it's answered or declined (Figma Severity=Consult request).
 */
type AlertToastSeverity = "critical" | "high" | "medium" | "low" | "resolved" | "consult-request";

// PatientCard's alert ring, so a toast and its patient's card look alike.
const ringClassNames: Record<AlertToastSeverity, string> = {
	critical: "border-severity-critical bg-severity-critical/5",
	high: "border-severity-high bg-severity-high/5",
	medium: "border-severity-medium bg-severity-medium/5",
	low: "border-severity-low bg-severity-low/5",
	resolved: "border-success bg-success/5",
	// Critical's ring: the call is as urgent (Nov 4, 2026, user's call; Figma's tint is bound to Resolved's green).
	"consult-request": "border-severity-critical bg-severity-critical/5",
};

/** Who's calling for a consult, e.g. Dr. Brian Keller, ED physician, at Alliance ED. */
type AlertToastRequester = {
	/** "Dr. Brian Keller". */
	name: string;
	/** "ED physician", after the name. */
	role?: string;
	/** Where they're calling from, e.g. "Alliance ED". */
	site?: string;
	photo?: string;
	initials?: string;
	tone?: AvatarFallbackProps["tone"];
};

type AlertToastOwnProps = {
	severity?: AlertToastSeverity;
	/** What changed, after the time, e.g. "Up from Medium", "Acknowledged". Nothing for a new alert. */
	change?: string;
	/**
	 * Nothing left to do: someone addressed it, it eased or it's resolved. A Critical toast isn't announced as urgent and
	 * can be swiped away. A `resolved` toast is always addressed.
	 */
	addressed?: boolean;
	/** What happened, e.g. "Deterioration score crossed threshold". */
	title: string;
	/**
	 * When it fired, ISO 8601 or a Date. Shown in the first row, right after the pill and before `change`, as a relative
	 * time ("Just now", "14 min ago"), updated each minute; the exact time is in its tooltip.
	 */
	firedAt?: string | Date;
	/** Why it matters for this patient, e.g. "Rising RR, SpO₂ decline, positive fluid balance, HFrEF". */
	reason?: string;
	/** Repeats of the same condition, shown as "· 3" in the pill when 2 or more: one toast per condition (AL-11). */
	count?: number;
	/** "Hayes, Margaret". */
	patientName: string;
	/** "Chadron · Med-Surg · Bed 4". The hospital truncates first. */
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
	/** Closes the toast; the alert stays in the queue. Without it, there's no close button. A consult request has none. */
	onClose?: () => void;
	closeLabel?: string;
	/** A consult request: who's calling. Shown in the patient's place, with the patient under it. */
	requester?: AlertToastRequester;
	/** A consult request: the latest values the platform has, e.g. "pH 7.24 · PaCO₂ 78 · RR 30 · SpO₂ 88% on BiPAP". */
	latest?: string;
	/** A consult request: answers the call. */
	onAnswer?: () => void;
	answerLabel?: string;
	/** A consult request: declines the call. */
	onDecline?: () => void;
	declineLabel?: string;
	/**
	 * A consult request: plays a ringtone while it rings (two soft notes every 2.5 s), until it's answered, declined or
	 * addressed. On by default; browsers hold it until the user has clicked or typed on the page.
	 */
	ringtone?: boolean;
	/**
	 * A consult request: how urgent the call is, which sets how fast its ringtone rings: `high` every 0.55 s (its notes at
	 * double tempo), `medium` every 1.7 s, `low` (default) every 2.5 s.
	 */
	urgency?: RingUrgency;
	/** A consult request's labels over the requester ("Incoming call from"), the patient, the reason and the latest values. */
	requesterLabel?: string;
	patientLabel?: string;
	reasonLabel?: string;
	latestLabel?: string;
};

type AlertToastProps = Omit<React.ComponentProps<"div">, keyof AlertToastOwnProps> & AlertToastOwnProps;

/** How long a consult request has been ringing, "0:42", "12:05", each second. Its own component, so only it re-renders. */
function RingingTime({ since }: { since: Date }) {
	const now = useCurrentSecond();
	if (now === null) return null;
	const seconds = Math.max(0, Math.floor((now - since.getTime()) / 1000));
	const label = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
	return (
		<time dateTime={since.toISOString()} className='shrink-0 text-sm font-semibold tabular-nums'>
			{label}
		</time>
	);
}

/** A person on a consult request's card, the caller or the patient: 32px avatar, name, and a line under it. */
function CallPerson({
	name,
	detail,
	photo,
	initials,
	tone,
}: {
	name: string;
	detail?: string;
	photo?: string;
	initials?: string;
	tone?: AvatarFallbackProps["tone"];
}) {
	return (
		<div className='flex min-w-0 items-center gap-2'>
			{photo || initials ? (
				<Avatar size='sm'>
					{photo ? <AvatarImage src={photo} alt='' /> : null}
					{initials ? <AvatarFallback tone={tone}>{initials}</AvatarFallback> : null}
				</Avatar>
			) : null}
			<div className='flex min-w-0 flex-col'>
				<p className='truncate text-base font-semibold'>{name}</p>
				{/* 2px into the name's line, as Figma draws it. */}
				{detail ? <p className='-mt-0.5 truncate text-sm'>{detail}</p> : null}
			</div>
		</div>
	);
}

/**
 * A change in a patient's alert: severity and what changed, when, what happened, why, and the patient, with Open
 * patient and Ask Intercept Live. A still ring in the severity's color frames it; no toast pulses (Nov 4, 2026, user's
 * call). An unaddressed Critical toast is announced at once (`role='alert'`); the others
 * politely, by the Toaster's live region. `severity="consult-request"` is a hospital calling the hub instead: who's calling,
 * the patient, the reason and the latest values, how long it has rung, and Decline and Answer, on the `neutral` surface.
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
	requester,
	latest,
	onAnswer,
	answerLabel = "Answer",
	onDecline,
	declineLabel = "Decline",
	ringtone = true,
	urgency = "low",
	requesterLabel = "Incoming call from",
	patientLabel = "Patient",
	reasonLabel = "Reason",
	latestLabel = "Latest values",
	...props
}: AlertToastProps) {
	const consult = severity === "consult-request";
	const addressed = addressedProp || severity === "resolved";
	// A consult request rings until it's answered or declined, unless its ringtone is turned off or toasts are muted (Don't
	// show; Nov 4, 2026, user's call): the call stays on screen, silent.
	const muted = useToastsMuted();
	useRingtone(consult && ringtone && !addressed && !muted, urgency);
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

	const ring = (
		// Still, on every toast: none pulses (Nov 4, 2026, user's call: "remove flashing to all sonners"). A wrapper, so a
		// collapsed stack and the hover can hide the ring with the opacity of their own.
		<span
			data-slot='alert-toast-ring'
			aria-hidden='true'
			className={cn("pointer-events-none absolute -inset-px -z-10", onOpenAlert && !consult && "group-hover/toast:opacity-0")}
		>
			<span className={cn("absolute inset-0 rounded-card border-2", ringClassNames[severity])} />
		</span>
	);

	if (consult) {
		const details = [
			{ label: reasonLabel, value: reason },
			{ label: latestLabel, value: latest },
		].filter((item): item is { label: string; value: string } => Boolean(item.value));
		return (
			// The call card: the `neutral` surface (dark in light mode, light in dark mode), so it reads as a call, not an alert.
			// Announced at once, until answered or declined.
			<div
				data-slot='alert-toast'
				data-severity={severity}
				data-addressed={addressed || undefined}
				role={addressed ? undefined : "alert"}
				className={cn(
					"relative isolate flex w-[var(--width,400px)] max-w-full flex-col gap-3 rounded-card bg-neutral p-4 font-sans text-on-foreground shadow-toast",
					className,
				)}
				{...props}
			>
				{ring}

				<div className='flex items-center justify-between gap-2'>
					<p className='flex min-w-0 items-center gap-2 text-sm'>
						<VideoIcon aria-hidden='true' className='size-4 shrink-0' />
						<span className='truncate'>{title}</span>
					</p>
					{hasTime ? <RingingTime since={firedTime} /> : null}
				</div>

				{requester ? (
					<div className='flex min-w-0 flex-col gap-0.5'>
						<p className='text-sm text-foreground-subtle'>{requesterLabel}</p>
						<CallPerson
							name={requester.role ? `${requester.name}, ${requester.role}` : requester.name}
							detail={requester.site}
							photo={requester.photo}
							initials={requester.initials}
							tone={requester.tone}
						/>
					</div>
				) : null}

				{/* The patient, then the caller's question and the latest values: label over value, 8px apart. */}
				<dl className='flex flex-col gap-2 text-sm'>
					<div className='flex min-w-0 flex-col gap-0.5'>
						<dt className='text-foreground-subtle'>{patientLabel}</dt>
						<dd className='min-w-0'>
							<CallPerson name={patientName} detail={location} photo={photo} initials={initials} tone={tone} />
						</dd>
					</div>
					{details.map((item) => (
							<div key={item.label} className='flex flex-col'>
								<dt className='text-foreground-subtle'>{item.label}</dt>
								<dd>{item.value}</dd>
							</div>
						))}
				</dl>

				{onDecline || onAnswer ? (
					<div className='flex gap-2'>
						{onDecline ? (
							<Button variant='destructive' size='sm' onClick={onDecline} className='flex-1'>
								<VideoOffIcon aria-hidden='true' />
								{declineLabel}
							</Button>
						) : null}
						{onAnswer ? (
							<Button variant='success' size='sm' onClick={onAnswer} className='flex-1'>
								<VideoIcon aria-hidden='true' />
								{answerLabel}
							</Button>
						) : null}
					</div>
				) : null}
			</div>
		);
	}

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
			{...props}
		>
			{ring}

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
				{/* The time always comes first after the pill, so it sits in the same place on every toast, with or without
				    a change. See DESIGN.md → AlertToast layout. */}
				{firedLabel ? (
					<time dateTime={firedTime?.toISOString()} title={firedLabel.title} className='text-sm text-foreground'>
						{firedLabel.label}
					</time>
				) : null}
				{change ? <span className='text-sm font-medium text-muted-foreground'>{change}</span> : null}
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
						<p className='-mt-0.5 truncate text-sm text-muted-foreground' title={location}>
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
 * An incoming toast's arrival (MOTION.md Arrive, Nov 4, 2026, user's call): it rises, overshoots its place and settles,
 * on top of the Toaster's slide-in. Once per toast: an update in place (same id) re-renders it without arriving again. A
 * fade under reduced motion. `h-full`, so a collapsed stack can still cut the toast to the front one's height.
 */
function ToastArrival({ children }: { children: React.ReactNode }) {
	const { prefersReducedMotion } = useMotionPreference();
	return (
		<motion.div
			className='h-full'
			variants={prefersReducedMotion ? fadeVariants : arriveVariants}
			initial='initial'
			animate='animate'
		>
			{children}
		</motion.div>
	);
}

/**
 * How long a toast stays, in ms: 10 s.
 *
 * @deprecated Since Nov 4, 2026, `toastAlert()` no longer uses it: a Critical, High, Medium or Low alert's toast stays
 * until the clinician acts on it or closes it. Kept for apps that pass it as a `duration`.
 */
const alertToastDuration = 10_000;

/**
 * How long a Resolved toast stays, in ms: 5 s (3 s until Nov 4, 2026, user's call: "2 more secs"). Nothing is left to do,
 * so it only lets the clinician know, then goes.
 */
const resolvedToastDuration = 5_000;

// A collapsed stack sizes the toasts behind the front one to its height. As Sonner does for its own toasts, those keep
// their surface, shadow and ring and hide their content (invisible, so a taller toast doesn't show through), and the
// edges of the stack stay visible. Not clipped: the ring sits 1px outside the toast's edge (`-inset-px`), and clipping
// cut its 2px stroke to 1px on the edge that peeks out (Nov 4, 2026, user's call: "keep this stroke in 2px").
const stackedToastClassName = cn(
	"[&_[data-slot=alert-toast]>*]:transition-opacity",
	"data-[expanded=false]:data-[front=false]:[&_[data-slot=alert-toast]]:h-full",
	"data-[expanded=false]:data-[front=false]:[&_[data-slot=alert-toast]>*:not([data-slot=alert-toast-ring])]:opacity-0",
);

// Where each kind of toast stacks in the Toaster: the higher in front, the newest first within one. Every alert has the
// same priority, so the newest alert is in front whatever its severity (Nov 4, 2026, user's call: "the latest always
// first without taking the severity in consideration"). A consult request, a call ringing, stays in front of them.
// Sonner's own toasts (`toast()`) have 0, behind every alert.
const alertToastPriority: Record<AlertToastSeverity, number> = {
	"consult-request": 2,
	critical: 1,
	high: 1,
	medium: 1,
	low: 1,
	resolved: 1,
};

type ToastAlertOptions = AlertToastOwnProps & {
	/**
	 * The alert's id. A second toast with the same id updates the first instead of stacking a new one (AL-11), and moves it
	 * to the front.
	 */
	id?: string | number;
	/**
	 * Overrides the duration, in ms: until closed for a Critical, High, Medium or Low alert and a consult request;
	 * `resolvedToastDuration` for a Resolved alert.
	 */
	duration?: number;
};

/**
 * Shows an AlertToast in the app's Toaster and returns its id. Open patient, Ask Intercept Live and opening the alert run their
 * handler, then close the toast; the close button and the Toaster's Close all close it and call `onClose`. Only a Resolved
 * toast leaves on its own; every other alert stays until the clinician acts on it or closes it. The newest alert is in
 * front, whatever its severity, and an alert that changes (the same `id` again) moves to the front. An unaddressed Critical toast can't be swiped away, so it isn't lost by accident. While toasts are muted (the Toaster's Don't show, `muteToasts()`), it shows nothing and
 * returns undefined, an unaddressed Critical included (Nov 3, 2026, user's call; until then it still interrupted, AL-02).
 */
function toastAlert({
	id,
	duration,
	onOpen,
	onAcknowledge: _onAcknowledge,
	onAsk,
	onOpenAlert,
	onClose,
	onAnswer,
	onDecline,
	...props
}: ToastAlertOptions) {
	const consult = props.severity === "consult-request";
	const interrupts = (consult || (props.severity ?? "critical") === "critical") && !props.addressed;
	if (toastsMuted() && !consult) return undefined;
	// Its handlers leave with it, however it goes.
	const forget = () => {
		setToastCloseHandler(toastId, null);
		setToastKept(toastId, false);
	};
	const toastId = toast.custom(
		(toastId) => (
			<ToastArrival>
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
					onClose={
						consult
							? undefined
							: () => {
									toast.dismiss(toastId);
									onClose?.();
								}
					}
					onAnswer={
						onAnswer &&
						(() => {
							onAnswer();
							toast.dismiss(toastId);
						})
					}
					onDecline={
						onDecline &&
						(() => {
							onDecline();
							toast.dismiss(toastId);
						})
					}
				/>
			</ToastArrival>
		),
		{
			id,
			// An open alert never leaves on its own, addressed or not (Nov 4, 2026, user's call): only a Resolved one does.
			duration: duration ?? (props.severity === "resolved" ? resolvedToastDuration : Number.POSITIVE_INFINITY),
			dismissible: !interrupts,
			// The newest alert in front, whatever its severity (Nov 4, 2026, user's call; was the most severe first). An alert
			// that changes (the same id again) is the newest: it moves to the front too (Nov 4, 2026, user's call).
			priority: alertToastPriority[props.severity ?? "critical"],
			moveToFrontOnUpdate: true,
			className: stackedToastClassName,
			onDismiss: forget,
			onAutoClose: forget,
		},
	);
	// Close all closes it as its × does. A later toast with the same id replaces the handler. A consult request has no ×:
	// Close all leaves it ringing.
	setToastCloseHandler(toastId, consult ? null : (onClose ?? null));
	setToastKept(toastId, consult);
	return toastId;
}

export {
	AlertToast,
	type AlertToastRequester,
	toastAlert,
	alertToastDuration,
	resolvedToastDuration,
	type AlertToastProps,
	type AlertToastSeverity,
	type ToastAlertOptions,
};
