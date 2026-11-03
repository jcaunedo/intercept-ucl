"use client";

import * as React from "react";
import { BellRingIcon, EllipsisIcon, Maximize2Icon, MapPinIcon, type LucideIcon } from "lucide-react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { cva, type VariantProps } from "class-variance-authority";

import { Button } from "@/components/buttons/button";
import {
	PatientCardScore,
	PatientCardTags,
	patientCardInteractiveClassName,
	patientCardOpenTargetClassName,
	usePatientCardAlertRing,
	type PatientCardAlertVariant,
	type PatientCensusCardProps,
} from "@/components/cards/patient-census-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/data-display/avatar";
import { MessageCircleSolidIcon } from "@/components/icons/message-circle-solid-icon";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/overlays/dropdown-menu";
import { useCurrentSecond } from "@/lib/hooks/use-current-second";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import {
	exitTransition,
	fadeVariants,
	motionDistance,
	liftPattern,
	pressPattern,
	resolvedFadeTransition,
	standardTransition,
	useDeviceAlarmFlash,
	useExpandClip,
	useMotionPreference,
	type DeviceAlarmPriority,
} from "@/lib/motion";
import { cn } from "@/lib/utils";

import { MonitorWaveform, type WaveformKind } from "./monitor-waveform";

/** Live bedside values. A missing value shows "--", never zero (PRD PC-143). */
type MonitorVitals = {
	/** Heart rate, bpm. Also paces the ECG, pleth and arterial waveforms. */
	hr?: number;
	/** SpO₂, %. */
	spo2?: number;
	/** Arterial pressure, mmHg. */
	systolic?: number;
	diastolic?: number;
	/** Mean arterial pressure, mmHg. */
	map?: number;
	/** Respiratory rate, breaths/min. Also paces the respiration waveform. */
	rr?: number;
};

/**
 * The last hour of each primary numeric, oldest first, for the monitor's `trends` plot. Points are spread
 * evenly, so any interval works (one a minute is typical); a missing series shows no sparkline.
 */
type MonitorTrends = Partial<Record<"hr" | "spo2" | "systolic" | "rr", number[]>>;

/** Alarm limits as [low, high]. A value outside them is marked as an alarm. */
type MonitorLimits = {
	hr: [number, number];
	spo2: [number, number];
	systolic: [number, number];
	rr: [number, number];
};

/**
 * The bedside monitor's alarm priority for each parameter's limit alarm, from its device profile (PRD AL-02: device
 * alarm priority is the device's own attribute). A value outside its limits shows the priority's color and flash.
 */
type MonitorAlarmPriorities = Partial<Record<keyof MonitorLimits, DeviceAlarmPriority>>;

/** What the numerics need to show device alarms: each limit alarm's priority, and the ones acknowledged at the bedside. */
type MonitorAlarmState = { priorities: MonitorAlarmPriorities; acknowledged: readonly (keyof MonitorLimits)[] };

// A numeric in alarm, by priority: the device's colored box with its text color. Full class names, so Tailwind sees them.
const deviceAlarmClassNames: Record<DeviceAlarmPriority, string> = {
	high: "bg-device-alarm-high text-device-alarm-high-foreground",
	medium: "bg-device-alarm-medium text-device-alarm-medium-foreground",
	low: "bg-device-alarm-low text-device-alarm-low-foreground",
};

// Common adult ICU defaults; an app passes the patient's own limits. Exported so a page can filter on the same limits.
const defaultMonitorLimits: MonitorLimits = { hr: [50, 120], spo2: [90, 100], systolic: [90, 160], rr: [8, 30] };

type ParameterKey = "hr" | "spo2" | "bp" | "rr";

// One color per parameter, everywhere (PRD Monitoring MON-072), with its waveform and its trend's lane label (ABP's
// trend is the systolic).
const parameters: Record<
	ParameterKey,
	{ label: string; wave: string; trend: string; unit: string; color: string; kind: WaveformKind }
> = {
	hr: { label: "HR", wave: "II", trend: "HR · 1 h", unit: "bpm", color: "text-monitor-ecg", kind: "ecg" },
	spo2: { label: "SpO₂", wave: "Pleth", trend: "SpO₂ · 1 h", unit: "%", color: "text-monitor-spo2", kind: "pleth" },
	bp: { label: "ABP", wave: "ABP", trend: "Sys · 1 h", unit: "mmHg", color: "text-monitor-abp", kind: "abp" },
	rr: { label: "RR", wave: "Resp", trend: "RR · 1 h", unit: "rpm", color: "text-monitor-resp", kind: "resp" },
};
const parameterOrder: ParameterKey[] = ["hr", "spo2", "bp", "rr"];

/**
 * The out-of-limits mark: ▲ above the alarm limits, ▼ below, the same triangles as PatientCensusCard's "Change in last 24 h",
 * a size smaller (12px). Its `className` sets the color. Decorative: say the side in words beside it for screen readers.
 * Shared with Monitoring's List table.
 */
function MonitorAlarmIcon({ side, className }: { side: "above" | "below"; className?: string }) {
	return (
		<span aria-hidden='true' className={cn("shrink-0 text-xs leading-none", className)}>
			{side === "above" ? "▲" : "▼"}
		</span>
	);
}

/**
 * A value in device alarm, as the bedside monitor shows it: in its priority's box (red with white text, yellow or cyan
 * with black), flashing for high and medium in step with every other alarm of that priority, steady for low and under
 * reduced motion. Without a `priority`, the value in its own `color`. The box's padding is there in every state (offset
 * by a negative margin), so flashing never moves the number. Shared with Monitoring's List table.
 */
function DeviceAlarmValue({
	priority,
	color,
	className,
	children,
}: {
	priority?: DeviceAlarmPriority;
	color?: string;
	className?: string;
	children: React.ReactNode;
}) {
	const { prefersReducedMotion } = useMotionPreference();
	const on = useDeviceAlarmFlash(priority, !prefersReducedMotion);

	return (
		<span
			data-device-alarm={priority}
			className={cn("-mx-1 rounded-sm px-1", className, priority && on ? deviceAlarmClassNames[priority] : color)}
		>
			{children}
		</span>
	);
}

/** Which side of its alarm limits a value is on, if it's outside them. */
const alarmSide = (value: number | undefined, [low, high]: [number, number]) =>
	value === undefined ? undefined : value > high ? "above" : value < low ? "below" : undefined;

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

// The condensed monitor's height per size; the full monitor is 240px at both.
const condensedHeight: Record<PatientMonitoringCardSize, number> = { md: 120, sm: 104 };

// The condensed numerics' columns. The compact card gives ABP ("104/56") more room than the single numbers; so does the
// default card when it's under ~340px wide (a 308px monitor), e.g. five or six a row.
const condensedColumns: Record<PatientMonitoringCardSize, string> = {
	md: "grid-cols-[1fr_1fr_1.5fr_1fr] @min-[308px]/monitor:grid-cols-4",
	sm: "grid-cols-[1fr_1fr_1.5fr_1fr]",
};

/** An item in the card's "…" menu. `divider` draws a separator under it, setting it apart from the items below. */
type PatientMonitoringCardAction = { label: string; icon?: LucideIcon; onSelect?: () => void; divider?: boolean };

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
		/** Alarm limits; defaults to common adult ICU limits. */
		limits?: Partial<MonitorLimits>;
		/**
		 * The bedside monitor's priority for each limit alarm (`high` | `medium` | `low`). A value outside its limits then
		 * shows as the device does: its number in a red, yellow or cyan box, flashing for high and medium. Without a
		 * priority, it's marked ▲ / ▼ only.
		 */
		alarmPriorities?: MonitorAlarmPriorities;
		/** Limit alarms acknowledged at the bedside: they keep their ▲ / ▼ but lose the color, as on the central station. */
		acknowledgedAlarms?: (keyof MonitorLimits)[];
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

/** One parameter's numbers: label, value, unit, and in the full monitor its alarm limits. */
function MonitorNumeric({
	parameter,
	vitals,
	limits,
	alarms,
	full,
	size,
}: {
	parameter: ParameterKey;
	vitals: MonitorVitals;
	limits: MonitorLimits;
	alarms: MonitorAlarmState;
	full: boolean;
	size: PatientMonitoringCardSize;
}) {
	const { label, unit, color } = parameters[parameter];
	const value =
		parameter === "bp"
			? vitals.systolic !== undefined && vitals.diastolic !== undefined
				? `${vitals.systolic}/${vitals.diastolic}`
				: "--"
			: (vitals[parameter] ?? "--");
	const limitKey = parameter === "bp" ? "systolic" : parameter;
	const limit = limits[limitKey];
	const alarm = alarmSide(parameter === "bp" ? vitals.systolic : vitals[parameter], limit);
	// The device's alarm, as the monitor shows it, until it's resolved or acknowledged at the bedside.
	const priority = alarm && !alarms.acknowledged.includes(limitKey) ? alarms.priorities[limitKey] : undefined;

	// A value outside its alarm limits gets a small triangle in the label row, in the monitor's neutral ink: drift shows
	// in place, before (or without) an alert, and the parameter keeps its color (PRD Monitoring MON-073). In the label row
	// rather than by the number, so the numerics keep their width.
	const alarmTag = alarm ? <MonitorAlarmIcon side={alarm} className='text-monitor-foreground' /> : null;

	return (
		<div
			data-alarm={alarm}
			className={cn(
				"flex min-w-0 flex-1 flex-col justify-center gap-0.5 rounded-sm py-0.5",
				size === "sm" ? "px-1.5" : full ? "px-2" : "px-1.5 @min-[308px]/monitor:px-2",
			)}
		>
			<span className={cn("flex w-full items-center justify-between gap-1 text-xs/4 font-semibold", color)}>
				<span className='flex min-w-0 items-center gap-1'>
					{label}
					{/* The mean pressure sits by the label, as on a bedside monitor. */}
					{full && parameter === "bp" && vitals.map !== undefined ? (
						<span className='font-normal text-monitor-foreground tabular-nums'>({vitals.map})</span>
					) : null}
					{full ? alarmTag : null}
				</span>
				{/* Condensed cells are too narrow for both, so the tag takes the unit's place there; the compact card's are too
				    narrow for units at all (the full monitor shows them), and so are the default card's under a 308px monitor. */}
				{alarm && !full ? (
					alarmTag
				) : full ? (
					<span className='font-normal text-monitor-foreground'>{unit}</span>
				) : size === "md" ? (
					<span className='hidden font-normal text-monitor-foreground @min-[308px]/monitor:inline'>{unit}</span>
				) : null}
			</span>
			<span className='flex w-full items-end justify-between gap-1'>
				{/* Alarm limits, high over low, small beside the value. */}
				{full ? (
					<span className='flex flex-col text-xs/3.5 text-monitor-foreground tabular-nums'>
						<span>{limit[1]}</span>
						<span>{limit[0]}</span>
					</span>
				) : null}
				<DeviceAlarmValue
					priority={priority}
					color={color}
					className={cn(
						"font-semibold tabular-nums leading-none",
						full ? (size === "sm" ? "text-xl" : "text-2xl") : size === "sm" ? "text-lg" : "text-xl",
					)}
				>
					{value}
					{alarm ? (
						<span className='sr-only'>
							, {alarm} alarm limits{priority ? `, ${priority} priority alarm` : ""}
						</span>
					) : null}
				</DeviceAlarmValue>
			</span>
		</div>
	);
}

/**
 * A waveform lane with its label in the parameter's color, top left. The trace fills the space below the label, sized
 * by the lane (a canvas's own 150px default height would otherwise push the lane open).
 */
function MonitorLane({ parameter, vitals, className }: { parameter: ParameterKey; vitals: MonitorVitals; className?: string }) {
	const { wave, color, kind } = parameters[parameter];
	const rate = kind === "resp" ? vitals.rr : vitals.hr;

	return (
		<div className={cn("relative min-h-0 min-w-0 flex-1", className)}>
			<span className={cn("absolute top-0.5 left-2 text-xs font-semibold", color)}>{wave}</span>
			<div className={cn("absolute inset-x-0 top-4 bottom-1", color)}>
				<MonitorWaveform kind={kind} rate={rate} />
			</div>
		</div>
	);
}

/**
 * A parameter's last hour as a line in its color, scaled to its own range (at least 4 units tall, so a steady value
 * stays flat instead of magnifying noise). Decorative: the number beside it carries the value.
 */
function MonitorSparkline({
	parameter,
	values,
	className,
}: {
	parameter: ParameterKey;
	values?: number[];
	className?: string;
}) {
	if (!values || values.length < 2) return <span className='h-6 shrink-0' />;
	const low = Math.min(...values);
	const high = Math.max(...values);
	const middle = (low + high) / 2;
	const [bottom, top] = high - low < 4 ? [middle - 2, middle + 2] : [low, high];
	const points = values
		.map((value, index) => {
			const x = (index / (values.length - 1)) * 100;
			const y = 22 - ((value - bottom) / (top - bottom)) * 20;
			return `${x.toFixed(1)},${y.toFixed(1)}`;
		})
		.join(" ");

	return (
		<svg
			aria-hidden='true'
			viewBox='0 0 100 24'
			preserveAspectRatio='none'
			className={cn("h-6 w-full shrink-0 px-2", parameters[parameter].color, className)}
		>
			<polyline
				points={points}
				fill='none'
				stroke='currentColor'
				strokeWidth={1.5}
				strokeLinejoin='round'
				vectorEffect='non-scaling-stroke'
			/>
		</svg>
	);
}

/** The full monitor's lane for the `trends` plot: the parameter's last hour across the lane, labeled like a waveform. */
function MonitorTrendLane({ parameter, values }: { parameter: ParameterKey; values?: number[] }) {
	const { trend, color } = parameters[parameter];

	return (
		<div className='relative min-h-0 min-w-0 flex-1'>
			<span className={cn("absolute top-0.5 left-2 text-xs font-semibold", color)}>{trend}</span>
			<div className='absolute inset-x-0 top-4 bottom-1'>
				<MonitorSparkline parameter={parameter} values={values} className='h-full' />
			</div>
		</div>
	);
}

// The alert bar, by state: a severity's fill with white text (PatientCardAlert's colors), green when the last alert
// resolved, and a quiet grey without one. Stacked in one grid cell, so a change cross-fades without moving anything.
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
	},
	defaultVariants: { interactive: false },
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
 * modal (Intercept Live) shows the same bar at the top of its alert.
 */
function AlertBar({
	alert,
	size,
	onOpen,
	className,
}: {
	alert: PatientMonitoringCardProps["alert"];
	size: PatientMonitoringCardSize;
	onOpen?: () => void;
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
			className={cn(alertBarVariants({ variant, size, interactive: true }), className)}
			{...(prefersReducedMotion ? {} : pressPattern)}
		>
			{content}
		</motion.button>
	) : (
		<div className={cn(alertBarVariants({ variant, size }), className)}>{content}</div>
	);
}

type PatientMonitorProps = Omit<React.ComponentProps<"section">, "children"> &
	Pick<PatientMonitoringCardProps, "vitals" | "limits" | "alarmPriorities" | "acknowledgedAlarms" | "plot" | "trends">;

/**
 * The full bedside monitor on its own, without the card: one lane per parameter (its waveform, or its last hour with
 * `plot="trends"`) beside its numbers and alarm limits, as in PatientMonitoringCard's full view. For a page that already
 * shows who the patient is, e.g. Patient details. 240px tall by default; a height in `className` stretches the lanes.
 * Pass an `aria-label` that names the patient.
 */
function PatientMonitor({
	vitals = {},
	limits: limitsProp,
	alarmPriorities = {},
	acknowledgedAlarms = [],
	plot = "waveform",
	trends = {},
	className,
	...props
}: PatientMonitorProps) {
	const limits = { ...defaultMonitorLimits, ...limitsProp };
	const alarms = { priorities: alarmPriorities, acknowledged: acknowledgedAlarms };

	return (
		<section
			data-slot='patient-monitor'
			className={cn(
				"grid h-60 grid-rows-4 divide-y divide-monitor-grid overflow-hidden rounded-lg bg-monitor text-monitor-foreground",
				className,
			)}
			{...props}
		>
			{parameterOrder.map((parameter) => (
				<div key={parameter} className='flex min-h-0'>
					{plot === "trends" ? (
						<MonitorTrendLane parameter={parameter} values={trends[parameter === "bp" ? "systolic" : parameter]} />
					) : (
						<MonitorLane parameter={parameter} vitals={vitals} />
					)}
					<div className='flex w-32 shrink-0 border-l border-monitor-grid py-0.5'>
						<MonitorNumeric parameter={parameter} vitals={vitals} limits={limits} alarms={alarms} size='md' full />
					</div>
				</div>
			))}
		</section>
	);
}

/**
 * A patient's identity and location, their alert as a bar (or "No active alerts"), optionally their acuity score and its
 * change, over a live bedside monitor, with their tags below it when passed. Right of the name: a family message icon
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
	const limits = { ...defaultMonitorLimits, ...limitsProp };
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
	// The "…" menu shows while the pointer is on the card, keyboard focus is in it or its menu is open; always where the
	// device can't hover.
	const [hovered, setHovered] = React.useState(false);
	const [focused, setFocused] = React.useState(false);
	const [menuOpen, setMenuOpen] = React.useState(false);
	const canHover = useMediaQuery("(hover: hover)");
	const actionsShown = hovered || focused || menuOpen || !canHover;
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
			onPointerEnter={(event) => {
				setHovered(true);
				onPointerEnter?.(event);
			}}
			onPointerLeave={(event) => {
				setHovered(false);
				onPointerLeave?.(event);
			}}
			onFocus={(event) => {
				setFocused(true);
				onFocus?.(event);
			}}
			onBlur={(event) => {
				if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
				onBlur?.(event);
			}}
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
						// Its slot opens as it shows, so the name and the message icon glide aside rather than jump (as
						// SearchInput opens: `standardTransition` in, `exitTransition` out), and the button fades in from the
						// right. Hidden, it's only clipped, so Tab still reaches it (and shows it). The slot's 4px past the button
						// on three sides (offset by negative margins) keeps its focus ring from being clipped.
						<motion.div
							initial={false}
							animate={actionsShown ? { width: 48, opacity: 1 } : { width: 0, opacity: 0 }}
							transition={resolve(actionsShown ? standardTransition : exitTransition)}
							className='-my-1 -mr-1 flex shrink-0 justify-end overflow-hidden py-1 pr-1'
						>
							<DropdownMenu onOpenChange={setMenuOpen}>
								<DropdownMenuTrigger asChild>
									<Button
										asChild
										variant='ghost'
										size='icon-md'
										aria-label={`More actions for ${name}`}
										className='relative z-10'
									>
										<motion.button
											type='button'
											initial={false}
											animate={{ x: actionsShown ? 0 : motionDistance.subtle }}
											transition={resolve(actionsShown ? standardTransition : exitTransition)}
										>
											<EllipsisIcon aria-hidden='true' />
										</motion.button>
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align='end'>
									{moreActions.map(({ label, icon: Icon, onSelect, divider }, index) => (
										<React.Fragment key={label}>
											<DropdownMenuItem onSelect={onSelect}>
												{Icon ? <Icon aria-hidden='true' /> : null}
												{label}
											</DropdownMenuItem>
											{divider && index < moreActions.length - 1 ? <DropdownMenuSeparator /> : null}
										</React.Fragment>
									))}
								</DropdownMenuContent>
							</DropdownMenu>
						</motion.div>
					) : null}
				</div>

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

			{/* The acuity score and its change, as on PatientCensusCard's compact card. */}
			<AnimatePresence initial={false}>
				{acuity || trajectory ? (
					<motion.div
						key='score'
						{...scoreClip}
						variants={sectionMotion}
						initial='initial'
						animate='animate'
						exit='exit'
						className='flex flex-col'
					>
						<PatientCardScore acuity={acuity} trajectory={trajectory} size={cardSize} />
					</motion.div>
				) : null}
			</AnimatePresence>

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
							{parameterOrder.map((parameter) => (
								<div key={parameter} className='flex min-h-0'>
									{plot === "trends" ? (
										<MonitorTrendLane
											parameter={parameter}
											values={trends[parameter === "bp" ? "systolic" : parameter]}
										/>
									) : (
										<MonitorLane parameter={parameter} vitals={vitals} />
									)}
									<div
										className={cn(
											"flex shrink-0 border-l border-monitor-grid py-0.5",
											cardSize === "sm" ? "w-28" : "w-32",
										)}
									>
										<MonitorNumeric parameter={parameter} vitals={vitals} limits={limits} alarms={alarms} size={cardSize} full />
									</div>
								</div>
							))}
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
									{parameterOrder.map((parameter) => (
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
										{parameterOrder.map((parameter) => (
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
	defaultMonitorLimits,
	DeviceAlarmValue,
	MonitorAlarmIcon,
	PatientMonitor,
	PatientMonitoringCard,
	patientMonitoringCardVariants,
	type MonitorAlarmPriorities,
	type PatientMonitoringCardAction,
	type MonitorLimits,
	type MonitorTrends,
	type MonitorVitals,
	type PatientMonitoringCardProps,
	type PatientMonitorProps,
	type PatientMonitoringCardSize,
};
