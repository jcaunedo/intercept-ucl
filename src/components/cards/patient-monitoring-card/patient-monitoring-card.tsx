"use client";

import * as React from "react";
import { BellRingIcon, Maximize2Icon, MapPinIcon } from "lucide-react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { cva, type VariantProps } from "class-variance-authority";

import { Button } from "@/components/buttons/button";
import {
	PatientCardMoreActions,
	PatientCardScore,
	PatientCardTags,
	patientCardInteractiveClassName,
	patientCardOpenTargetClassName,
	usePatientCardActionsReveal,
	usePatientCardAlertRing,
	type PatientCardAction,
	type PatientCardAlertVariant,
	type PatientCensusCardProps,
} from "@/components/cards/patient-census-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/data-display/avatar";
import {
	MonitorFullLanes,
	MonitorLane,
	MonitorNumeric,
	monitorParameterOrder,
	MonitorSparkline,
	resolveMonitorLimits,
	type MonitorAlarmLimits,
	type MonitorAlarmParameter,
	type MonitorAlarmPriorities,
	type MonitorTrends,
	type MonitorVitals,
} from "@/components/data-display/patient-monitor";
import { MessageCircleSolidIcon } from "@/components/icons/message-circle-solid-icon";
import { useCurrentSecond } from "@/lib/hooks/use-current-second";
import {
	exitTransition,
	fadeVariants,
	liftPattern,
	pressPattern,
	resolvedFadeTransition,
	standardTransition,
	useExpandClip,
	useMotionPreference,
} from "@/lib/motion";
import { cn } from "@/lib/utils";

// `md` for the Comfortable panel; `sm` for Compact (PRD Monitoring MON-012): tighter padding, smaller type and a shorter
// condensed monitor, so four fit a row at 1728. Padding is 1px less than the step because the border adds it. `min-w-0`,
// so in a flex or grid cell the card can be narrower than its one-line location, and the hospital truncates instead.
const patientMonitoringCardVariants = cva(
	"group/card relative isolate flex min-w-0 flex-col rounded-card border border-border bg-card text-card-foreground shadow-sm transition-[border-color,box-shadow] duration-160 ease-in-out",
	{
		variants: {
			size: {
				md: "gap-3 p-[15px]",
				sm: "gap-2 p-[11px]",
			},
		},
		defaultVariants: {
			size: "md",
		},
	},
);

type PatientMonitoringCardSize = NonNullable<VariantProps<typeof patientMonitoringCardVariants>["size"]>;

// The card's gap per size, which a section shown or hidden gives back as it closes.
const sectionGap: Record<PatientMonitoringCardSize, number> = { md: 12, sm: 8 };

/**
 * A section the page shows or hides (the score, the tags; e.g. Monitoring's Minimal view) opens and closes in place
 * (Expand: height and opacity), and so does its share of the card's gap (a negative top margin), so the card and its
 * neighbors glide instead of jumping (Oct 31, 2026, MOTION.md "Interaction reveals").
 */
const sectionVariants = (gap: number): Variants => ({
	initial: { height: 0, opacity: 0, marginTop: -gap },
	animate: { height: "auto", opacity: 1, marginTop: 0, transition: standardTransition },
	exit: { height: 0, opacity: 0, marginTop: -gap, transition: { ...standardTransition, opacity: exitTransition } },
});

// The score line under the location, 4px below it.
const scoreLineVariants = sectionVariants(4);

// The condensed monitor's height per size; the full monitor is 240px at both.
const condensedHeight: Record<PatientMonitoringCardSize, number> = { md: 120, sm: 104 };

// The condensed numerics' columns. The compact card gives ABP ("104/56") more room than the single numbers; so does the
// default card when it's under ~340px wide (a 308px monitor), e.g. five or six a row.
const condensedColumns: Record<PatientMonitoringCardSize, string> = {
	md: "grid-cols-[1fr_1fr_1.5fr_1fr] @min-[308px]/monitor:grid-cols-4",
	sm: "grid-cols-[1fr_1fr_1.5fr_1fr]",
};

/** An item in the card's "…" menu: PatientCardAction, under the name it had first. */
type PatientMonitoringCardAction = PatientCardAction;

type PatientMonitoringCardProps = Omit<
	React.ComponentProps<"article">,
	"children" | "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd"
> &
	Pick<
		PatientCensusCardProps,
		| "lastName"
		| "firstName"
		| "mrn"
		| "sex"
		| "age"
		| "hospital"
		| "unit"
		| "room"
		| "bed"
		| "alert"
		| "acuity"
		| "trajectory"
		| "photo"
		| "initials"
		| "tone"
		| "onOpen"
		| "href"
	> &
	VariantProps<typeof patientMonitoringCardVariants> & {
		/**
		 * The patient's tags (Ventilated, DNR…), on one line under the monitor, as on PatientCensusCard. Without it there's no
		 * row; an empty list shows "No tags", so cards with and without tags line up.
		 */
		tags?: PatientCensusCardProps["tags"];
		vitals?: MonitorVitals;
		/**
		 * Alarm limits per reading, `[low, high]`; `null` turns a side off (shown as OFF). A reading left out takes the
		 * common adult ICU defaults (`defaultMonitorLimits`); MAP has none.
		 */
		limits?: Partial<MonitorAlarmLimits>;
		/**
		 * The bedside monitor's priority for each limit alarm (`high` | `medium` | `low`). A value outside its limits then
		 * shows as the device does: its number in a red, yellow or cyan box, flashing for high and medium. Without a
		 * priority, it's marked ▲ / ▼ only.
		 */
		alarmPriorities?: MonitorAlarmPriorities;
		/** Limit alarms acknowledged at the bedside: they keep their ▲ / ▼ but lose the color, as on the central station. */
		acknowledgedAlarms?: MonitorAlarmParameter[];
		/**
		 * What the monitor plots, condensed or full: live waveforms (`waveform`, default) or each parameter's last hour
		 * (`trends`, from `trends`). Condensed, that's the ECG strip or a sparkline under each numeric; full, a waveform
		 * or a trend line in each lane.
		 */
		plot?: "waveform" | "trends";
		/** @deprecated Use `plot`, which now applies to the full monitor too. */
		condensedView?: "waveform" | "trends";
		/** The last hour of HR, SpO₂, systolic and RR, for the `trends` plot. */
		trends?: MonitorTrends;
		/**
		 * The full monitor (all waveforms) instead of the condensed one. The page sets it (e.g. Monitoring's monitor view);
		 * the card has no toggle of its own since Oct 30, 2026.
		 */
		expanded?: boolean;
		/** The view when `expanded` isn't passed. Defaults to condensed. */
		defaultExpanded?: boolean;
		/** @deprecated Never called: the card has no expand button since Oct 30, 2026. */
		onExpandedChange?: (expanded: boolean) => void;
		/**
		 * Unread messages from the patient's family. A message icon then shows right of the name, a button when
		 * `onOpenMessages` is passed.
		 */
		unreadMessages?: number;
		/** Opens the patient's family messages, from the message icon. */
		onOpenMessages?: () => void;
		/**
		 * Opens the patient's alert. The alert bar then becomes a button, with a maximize icon at its end, for any alert
		 * (every severity, Resolved and a message); "No active alerts" stays plain.
		 */
		onOpenAlert?: () => void;
		/** The "…" menu right of the name, shown on hover or keyboard focus in the card. Without items there's no button. */
		moreActions?: PatientMonitoringCardAction[];
	};

// The alert bar, by state: a severity's fill with white text (PatientCardAlert's colors), green when the last alert
// resolved, and a quiet grey without one. Stacked in one grid cell, so a change cross-fades without moving anything.
// As an alert panel's header (`header`), it's square, and a resolved one is green-100, a step darker than the panel's
// green-50, so it reads as the panel's header wherever a resolved alert is shown (Nov 10, 2026, user's call).
const alertBarVariants = cva("col-start-1 row-start-1 flex min-w-0 items-center gap-[7px] rounded-card [&_svg]:shrink-0", {
	variants: {
		variant: {
			critical: "bg-severity-critical text-severity-foreground",
			high: "bg-severity-high text-severity-foreground",
			medium: "bg-severity-medium text-severity-foreground",
			low: "bg-severity-low text-severity-foreground",
			resolved: "bg-badge-green text-badge-green-foreground",
			message: "bg-neutral-muted text-neutral-prominent",
			none: "bg-background-subtle text-muted-foreground",
		},
		size: {
			md: "h-7 px-2.5 text-sm [&_svg]:size-3.5",
			sm: "h-6 px-2 text-xs [&_svg]:size-3",
		},
		// An alert's bar opens it (`onOpenAlert`). On hover a 32% gray-700 overlay darkens the fill; a
		// primitive, not `foreground`, because the severity fills and their white text are the same in both modes. The
		// button's z-index makes it a stacking context, so the overlay's negative z-index puts it over the fill but under
		// the text.
		interactive: {
			true: "relative z-10 w-full cursor-pointer text-left outline-none before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-card before:bg-(--gray-700)/32 before:opacity-0 before:transition-opacity hover:before:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
			false: "",
		},
		header: {
			true: "rounded-none before:rounded-none",
			false: "",
		},
	},
	compoundVariants: [{ variant: "resolved", header: true, class: "bg-badge-green-muted" }],
	defaultVariants: { interactive: false, header: false },
});

const alertBarLabels: Record<Exclude<PatientCardAlertVariant, "message">, string> = {
	critical: "Critical",
	high: "High",
	medium: "Medium",
	low: "Low",
	resolved: "Resolved",
};

/**
 * How long ago `since` was. An open alert's runs like a clock, ticking each second: "3:34 m ago" under an hour, then
 * "15:05 h ago". A resolved one (`whole`) reads in whole units: "Just now", "24 m ago", "20 h ago".
 */
function AlertAge({ since, whole = false }: { since: string; whole?: boolean }) {
	const now = useCurrentSecond();
	const start = Date.parse(since);
	if (now === null || Number.isNaN(start)) return null;
	const seconds = Math.max(0, Math.floor((now - start) / 1000));
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const pad = (value: number) => String(value).padStart(2, "0");
	const [shown, spoken] = whole
		? hours
			? [`${hours} h ago`, `${hours} h ago`]
			: minutes
				? [`${minutes} m ago`, `${minutes} min ago`]
				: ["Just now", "just now"]
		: hours
			? [`${hours}:${pad(minutes % 60)} h ago`, `${hours} h ${minutes % 60} min ago`]
			: [`${minutes}:${pad(seconds % 60)} m ago`, minutes ? `${minutes} min ago` : "less than a minute ago"];

	return (
		<time dateTime={since} className='shrink-0 tabular-nums'>
			{/* Screen readers get it to the minute, in words. */}
			<span aria-hidden='true'>{shown}</span>
			<span className='sr-only'>{spoken}</span>
		</time>
	);
}

/**
 * The patient's alert as a full-width bar: the top severity with how many alerts the patient had in the last 24 h, and
 * how long ago it started; "No active alerts" without one. With `onOpen`, an alert's whole bar (any severity, Resolved or
 * a message) is a button that opens it, raised above the card's open target, with a maximize icon at its end. The alert
 * modal (Intercept Live) shows the same bar at the top of its alert; `header` styles it as that panel's header.
 */
function AlertBar({
	alert,
	size,
	onOpen,
	header = false,
	className,
}: {
	alert: PatientMonitoringCardProps["alert"];
	size: PatientMonitoringCardSize;
	onOpen?: () => void;
	/** The bar heads an alert panel: square corners, and Resolved in green-100 over the panel's green-50. */
	header?: boolean;
	className?: string;
}) {
	const { prefersReducedMotion } = useMotionPreference();
	const variant = alert?.variant ?? "none";
	const label = alert ? (alert.label ?? (alert.variant === "message" ? null : alertBarLabels[alert.variant])) : "No active alerts";
	const interactive = Boolean(onOpen && alert);

	const content = (
		<>
			{interactive ? <span className='sr-only'>Open alert: </span> : null}
			<span className='flex min-w-0 flex-1 items-center gap-1.5'>
				{variant === "message" ? <MessageCircleSolidIcon /> : <BellRingIcon aria-hidden='true' />}
				<span className='truncate'>
					<span className={alert ? "font-semibold" : undefined}>{label}</span>
					{alert?.inLast24h !== undefined ? (
						<span> · {alert.inLast24h} in the last 24 h</span>
					) : alert?.count !== undefined && alert.count > 1 ? (
						<span>
							<span aria-hidden='true'> · </span>
							{alert.count}
							<span className='sr-only'> alerts</span>
						</span>
					) : null}
				</span>
			</span>
			{alert?.since ? <AlertAge since={alert.since} whole={alert.variant === "resolved"} /> : null}
			{interactive ? <Maximize2Icon aria-hidden='true' /> : null}
		</>
	);

	return interactive ? (
		<motion.button
			type='button'
			onClick={onOpen}
			className={cn(alertBarVariants({ variant, size, interactive: true, header }), className)}
			{...(prefersReducedMotion ? {} : pressPattern)}
		>
			{content}
		</motion.button>
	) : (
		<div className={cn(alertBarVariants({ variant, size, header }), className)}>{content}</div>
	);
}

/**
 * A patient's identity and location, with their acuity score and its change as a line under it when passed, their alert as
 * a bar (or "No active alerts"), over a live bedside monitor, with their tags below it when passed. Right of the name: a family message icon
 * (`unreadMessages`) and a "…" menu (`moreActions`) that shows on hover; left of it, an avatar with `photo` or `initials`. Condensed by default (an ECG strip and HR, SpO₂, BP and
 * RR, or 1-hour sparklines with `plot="trends"`); with `expanded`, the full monitor, one lane per parameter (its waveform, or
 * its last hour with `plot="trends"`) with its numbers and alarm limits. `size="sm"` is the compact card. An alert behaves
 * as on PatientCensusCard (a ring that pulses until the card is clicked or the alert is addressed), and with `onOpen` or
 * `href` the whole card opens the patient. Draft: the monitor follows PRD Monitoring §3.3, not a Figma design yet.
 *
 * Figma: [intercept.ds › patient-monitoring-card-2](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1232-5403)
 */
function PatientMonitoringCard({
	lastName,
	firstName,
	mrn,
	sex,
	age,
	hospital,
	unit,
	room,
	bed,
	alert,
	acuity,
	trajectory,
	tags,
	photo,
	initials,
	tone,
	size = "md",
	vitals = {},
	limits: limitsProp,
	alarmPriorities = {},
	acknowledgedAlarms = [],
	plot: plotProp,
	condensedView,
	trends = {},
	expanded: expandedProp,
	defaultExpanded = false,
	onExpandedChange: _onExpandedChange,
	unreadMessages = 0,
	onOpenMessages,
	onOpenAlert,
	moreActions = [],
	onOpen,
	href,
	className,
	onClickCapture,
	onPointerEnter,
	onPointerLeave,
	onFocus,
	onBlur,
	...props
}: PatientMonitoringCardProps) {
	const { resolve, prefersReducedMotion } = useMotionPreference();
	const interactive = Boolean(onOpen || href);
	const alertRing = usePatientCardAlertRing({ alert, interactive });
	const expanded = expandedProp ?? defaultExpanded;
	const monitorId = React.useId();
	const limits = resolveMonitorLimits(limitsProp);
	const alarms = { priorities: alarmPriorities, acknowledged: acknowledgedAlarms };
	const cardSize = size ?? "md";
	const plot = plotProp ?? condensedView ?? "waveform";
	const sectionMotion = prefersReducedMotion ? fadeVariants : sectionVariants(sectionGap[cardSize]);
	const scoreClip = useExpandClip();
	const tagsClip = useExpandClip();

	const name = `${lastName}, ${firstName}`;
	const demographics = [sex, age].filter((part) => part !== undefined && part !== "").join(", ");
	const identity = [mrn, demographics].filter(Boolean).join(" - ");
	const roomAndBed = room && bed ? `${room} - ${bed}` : (room ?? bed);
	const placeInHospital = [unit, roomAndBed].filter(Boolean).join(" · ");
	// The "…" menu shows while the pointer is on the card, keyboard focus is in it or its menu is open.
	const actionsReveal = usePatientCardActionsReveal({ onPointerEnter, onPointerLeave, onFocus, onBlur });
	const messagesLabel = unreadMessages === 1 ? "1 new message from family" : `${unreadMessages} new messages from family`;

	const openRef = React.useRef<HTMLAnchorElement & HTMLButtonElement>(null);
	const nameContent = href ? (
		<a ref={openRef} href={href} className={patientCardOpenTargetClassName}>
			{name}
		</a>
	) : onOpen ? (
		<button ref={openRef} type='button' onClick={onOpen} className={cn("text-left", patientCardOpenTargetClassName)}>
			{name}
		</button>
	) : (
		name
	);

	return (
		// Same card behavior as PatientCensusCard: lift and hover border when it opens the patient, and the alert ring.
		<motion.article
			data-slot='patient-monitoring-card'
			data-size={cardSize}
			data-expanded={expanded ? "" : undefined}
			whileHover={interactive && !prefersReducedMotion ? liftPattern.whileHover : undefined}
			transition={liftPattern.transition}
			className={cn(
				patientMonitoringCardVariants({ size: cardSize }),
				interactive && patientCardInteractiveClassName,
				// The hover border is 2px, so the compact card's padding drops by 1px too.
				interactive && cardSize === "sm" && "hover:p-[10px]",
				className,
			)}
			// Capture, so any click on the card counts (the open target, the monitor).
			onClickCapture={(event) => {
				alertRing.markSeen();
				onClickCapture?.(event);
			}}
			{...actionsReveal.handlers}
			{...props}
		>
			{alertRing.ring}
			{/* Name and location, 8px apart: one section of the card. */}
			<div className='flex flex-col gap-2'>
				<div className='flex items-start'>
					{/* As on PatientCensusCard: centered on the name and identity, 44px (32px small). A margin, not the row's gap, so the
					    hidden "…" slot adds no space. */}
					{photo || initials ? (
						<Avatar
							aria-hidden='true'
							className={cn("pointer-events-none mr-2 self-center", cardSize === "sm" ? "size-8" : "size-11")}
						>
							{photo ? <AvatarImage src={photo} alt='' /> : null}
							<AvatarFallback tone={tone} className={cardSize === "sm" ? "text-[11px]" : "text-[15px]"}>
								{initials}
							</AvatarFallback>
						</Avatar>
					) : null}
					<div className='flex min-w-0 flex-1 flex-col'>
						{/* One line, truncated, full name in `title`, as on PatientCensusCard. */}
						<h3
							title={name}
							className={cn(
								"-mb-0.5 truncate font-bold text-foreground [&>*]:max-w-full [&>*]:truncate",
								cardSize === "sm" ? "text-base" : "text-xl",
							)}
						>
							{nameContent}
						</h3>
						{identity ? (
							<p className={cn("break-words text-muted-foreground", cardSize === "sm" ? "text-xs" : "text-sm")}>
								{identity}
							</p>
						) : null}
					</div>
					{/* A new message from the family stays in sight; the "…" menu shows only while it can be used. Both are raised
					    above the card's open target. */}
					{unreadMessages > 0 ? (
						onOpenMessages ? (
							<Button
								variant='ghost'
								size='icon-md'
								aria-label={messagesLabel}
								onClick={onOpenMessages}
								className='relative z-10 ml-2'
							>
								<MessageCircleSolidIcon className='size-[18px]' />
							</Button>
						) : (
							<span role='img' aria-label={messagesLabel} className='ml-2 flex size-9 shrink-0 items-center justify-center'>
								<MessageCircleSolidIcon className='size-[18px]' />
							</span>
						)
					) : null}
					{moreActions.length ? (
						<PatientCardMoreActions
							actions={moreActions}
							name={name}
							shown={actionsReveal.shown}
							onMenuOpenChange={actionsReveal.onMenuOpenChange}
						/>
					) : null}
				</div>

				{/* The location, then the score and its change, 4px apart. */}
				<div className='flex flex-col gap-1'>
					<p
						className={cn(
							"flex min-w-0 items-center gap-1 font-medium text-foreground",
							cardSize === "sm" ? "text-xs" : "text-sm",
						)}
					>
						<MapPinIcon aria-hidden='true' className='size-4 shrink-0 text-icon-muted' />
						{/* Only the hospital truncates; unit, room and bed always stay visible. */}
						<span className='flex min-w-0 flex-1'>
							{hospital ? (
								<span title={hospital} className='min-w-0 truncate'>
									{hospital}
								</span>
							) : null}
							{placeInHospital ? (
								<span className='shrink-0 whitespace-pre'>{hospital ? ` · ${placeInHospital}` : placeInHospital}</span>
							) : null}
						</span>
					</p>
					{/* A line the page can show or hide: it opens and closes in place, with its 4px gap. */}
					<AnimatePresence initial={false}>
						{acuity || trajectory ? (
							<motion.div
								key='score'
								{...scoreClip}
								variants={prefersReducedMotion ? fadeVariants : scoreLineVariants}
								initial='initial'
								animate='animate'
								exit='exit'
							>
								<PatientCardScore acuity={acuity} trajectory={trajectory} size={cardSize} />
							</motion.div>
						) : null}
					</AnimatePresence>
				</div>
			</div>

			{/* The alert bar. A new state cross-fades in; a "Resolved" bar fades out slowly (`resolvedFadeTransition`), so it's
			    seen leaving. */}
			<div className='grid'>
				<AnimatePresence initial={false}>
					<motion.div
						key={alert?.variant ?? "none"}
						variants={{
							initial: { opacity: 0 },
							animate: { opacity: 1, transition: resolve(standardTransition) },
							exit: {
								opacity: 0,
								transition: resolve(alert?.variant === "resolved" ? resolvedFadeTransition : standardTransition),
							},
						}}
						initial='initial'
						animate='animate'
						exit='exit'
						className='col-start-1 row-start-1 grid min-w-0'
					>
						<AlertBar alert={alert} size={cardSize} onOpen={onOpenAlert} />
					</motion.div>
				</AnimatePresence>
			</div>

			{/* Light in light mode, a dark screen in dark mode. The height animates between the two views (Expand pattern). */}
			<motion.section
				id={monitorId}
				aria-label={`Bedside monitor, ${name}`}
				initial={false}
				animate={{ height: expanded ? 240 : condensedHeight[cardSize] }}
				transition={resolve(standardTransition)}
				// A size container, so the numerics fit the card's width. On the monitor rather than the card: a card sized by
				// its content would collapse if it were the container itself. Positioned, so it paints over the card's open
				// target; it holds nothing interactive, so on a card that opens the patient, clicks pass through to the target.
				className={cn(
					"@container/monitor relative overflow-hidden rounded-lg bg-monitor text-monitor-foreground",
					interactive && "pointer-events-none",
				)}
			>
				<AnimatePresence initial={false} mode='wait'>
					{expanded ? (
						<motion.div
							key='full'
							variants={fadeVariants}
							initial='initial'
							animate='animate'
							exit='exit'
							className='grid h-60 grid-rows-4 divide-y divide-monitor-grid'
						>
							<MonitorFullLanes
								vitals={vitals}
								limits={limits}
								alarms={alarms}
								plot={plot}
								trends={trends}
								size={cardSize}
							/>
						</motion.div>
					) : (
						<motion.div
							key='condensed'
							variants={fadeVariants}
							initial='initial'
							animate='animate'
							exit='exit'
							style={{ height: condensedHeight[cardSize] }}
							className='flex flex-col'
						>
							{plot === "trends" ? (
								// Each numeric over its last hour.
								<div className={cn("grid h-full divide-x divide-monitor-grid py-1.5", condensedColumns[cardSize])}>
									{monitorParameterOrder.map((parameter) => (
										<div key={parameter} className='flex min-w-0 flex-col justify-between'>
											<MonitorNumeric
												parameter={parameter}
												vitals={vitals}
												limits={limits}
												alarms={alarms}
												size={cardSize}
												full={false}
											/>
											<MonitorSparkline
												parameter={parameter}
												values={trends[parameter === "bp" ? "systolic" : parameter]}
											/>
										</div>
									))}
								</div>
							) : (
								<>
									<MonitorLane parameter='hr' vitals={vitals} className='border-b border-monitor-grid' />
									<div
										className={cn(
											"grid h-[60px] shrink-0 divide-x divide-monitor-grid py-1",
											condensedColumns[cardSize],
										)}
									>
										{monitorParameterOrder.map((parameter) => (
											<MonitorNumeric
												key={parameter}
												parameter={parameter}
												vitals={vitals}
												limits={limits}
												alarms={alarms}
												size={cardSize}
												full={false}
											/>
										))}
									</div>
								</>
							)}
						</motion.div>
					)}
				</AnimatePresence>
			</motion.section>

			<AnimatePresence initial={false}>
				{tags ? (
					<motion.div
						key='tags'
						{...tagsClip}
						variants={sectionMotion}
						initial='initial'
						animate='animate'
						exit='exit'
						className='flex min-w-0 flex-col'
					>
						<PatientCardTags tags={tags} name={name} size={cardSize} openRef={interactive ? openRef : undefined} />
					</motion.div>
				) : null}
			</AnimatePresence>
		</motion.article>
	);
}

export {
	AlertBar,
	PatientMonitoringCard,
	patientMonitoringCardVariants,
	type PatientMonitoringCardAction,
	type PatientMonitoringCardProps,
	type PatientMonitoringCardSize,
};
