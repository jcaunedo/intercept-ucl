"use client";

import * as React from "react";

import { useDeviceAlarmFlash, useMotionPreference, type DeviceAlarmPriority } from "@/lib/motion";
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

/** The readings with limit alarms. ABP alarms on its systolic and on its mean (MAP). */
type MonitorAlarmParameter = "hr" | "spo2" | "systolic" | "map" | "rr";

/**
 * One reading's alarm limits as [low, high]. `null` turns that side's alarm off, as device profiles do for one-sided
 * limits ("RR > 30": `[null, 30]`; "MAP < 65": `[65, null]`); the full monitor shows that side as OFF.
 */
type MonitorAlarmLimit = readonly [low: number | null, high: number | null];

/** Alarm limits per reading, as `limits` takes them. A value outside them is marked as an alarm. */
type MonitorAlarmLimits = Record<MonitorAlarmParameter, MonitorAlarmLimit>;

/**
 * Alarm limits with both sides set, as `defaultMonitorLimits` holds them (no MAP). `limits` takes the wider
 * `MonitorAlarmLimits`, so a `MonitorLimits` still fits it.
 */
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
type MonitorAlarmPriorities = Partial<Record<MonitorAlarmParameter, DeviceAlarmPriority>>;

/** What the numerics need to show device alarms: each limit alarm's priority, and the ones acknowledged at the bedside. */
type MonitorAlarmState = { priorities?: MonitorAlarmPriorities; acknowledged?: readonly MonitorAlarmParameter[] };

// A numeric in alarm, by priority: the device's colored box with its text color. Full class names, so Tailwind sees them.
const deviceAlarmClassNames: Record<DeviceAlarmPriority, string> = {
	high: "bg-device-alarm-high text-device-alarm-high-foreground",
	medium: "bg-device-alarm-medium text-device-alarm-medium-foreground",
	low: "bg-device-alarm-low text-device-alarm-low-foreground",
};

// Common adult ICU defaults; an app passes the patient's own limits. Exported so a page can filter on the same limits.
const defaultMonitorLimits: MonitorLimits = { hr: [50, 120], spo2: [90, 100], systolic: [90, 160], rr: [8, 30] };

/**
 * The limits a monitor works with: the app's for every reading it passes, as passed (a `null` side stays off; it never
 * falls back to a default), and `defaultMonitorLimits` for a reading it leaves out. MAP has no default, so it alarms
 * only with limits of its own. Exported so a page filters on the same limits as the monitor.
 */
function resolveMonitorLimits(limits: Partial<MonitorAlarmLimits> = {}): MonitorAlarmLimits {
	return {
		hr: limits.hr ?? defaultMonitorLimits.hr,
		spo2: limits.spo2 ?? defaultMonitorLimits.spo2,
		systolic: limits.systolic ?? defaultMonitorLimits.systolic,
		map: limits.map ?? [null, null],
		rr: limits.rr ?? defaultMonitorLimits.rr,
	};
}

/** Which side of its alarm limits a value is on, if it's outside them. A side that's off (`null`) never alarms. */
function monitorAlarmSide(value: number | undefined, [low, high]: MonitorAlarmLimit): "above" | "below" | undefined {
	if (value === undefined) return undefined;
	if (high !== null && value > high) return "above";
	if (low !== null && value < low) return "below";
	return undefined;
}

const alarmPriorityRank: Record<DeviceAlarmPriority, number> = { high: 0, medium: 1, low: 2 };

/**
 * A displayed numeric's alarm across the readings behind it (ABP: systolic, then MAP). The first reading outside its
 * limits gives the side (and `source`, the reading); the highest priority among the alarms not acknowledged at the
 * bedside gives the device alarm. Exported so Monitoring's list marks a value as the monitor does.
 */
function monitorAlarm(
	vitals: MonitorVitals,
	limits: MonitorAlarmLimits,
	readings: readonly MonitorAlarmParameter[],
	{ priorities = {}, acknowledged = [] }: MonitorAlarmState = {},
) {
	let side: "above" | "below" | undefined;
	let source: MonitorAlarmParameter | undefined;
	let priority: DeviceAlarmPriority | undefined;
	for (const reading of readings) {
		const readingSide = monitorAlarmSide(vitals[reading], limits[reading]);
		if (!readingSide) continue;
		side ??= readingSide;
		source ??= reading;
		const readingPriority = acknowledged.includes(reading) ? undefined : priorities[reading];
		if (readingPriority && (!priority || alarmPriorityRank[readingPriority] < alarmPriorityRank[priority]))
			priority = readingPriority;
	}
	return { side, source, priority };
}

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

// The readings each numeric alarms on, in order: ABP on its systolic, then its mean.
const alarmReadings: Record<ParameterKey, readonly MonitorAlarmParameter[]> = {
	hr: ["hr"],
	spo2: ["spo2"],
	bp: ["systolic", "map"],
	rr: ["rr"],
};

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

/** `md` (default) or `sm`, the compact card's: a narrower numerics column and smaller numbers. */
type PatientMonitorSize = "md" | "sm";

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
	limits: MonitorAlarmLimits;
	alarms: MonitorAlarmState;
	full: boolean;
	size: PatientMonitorSize;
}) {
	const { label, unit, color } = parameters[parameter];
	const value =
		parameter === "bp"
			? vitals.systolic !== undefined && vitals.diastolic !== undefined
				? `${vitals.systolic}/${vitals.diastolic}`
				: "--"
			: (vitals[parameter] ?? "--");
	// The device's alarm, as the monitor shows it, until it's resolved or acknowledged at the bedside.
	const { side: alarm, source, priority } = monitorAlarm(vitals, limits, alarmReadings[parameter], alarms);
	// The limits beside the value: the reading in alarm's, so the numbers explain the mark (ABP alarming on MAP shows
	// MAP's). Otherwise ABP shows the systolic's, or MAP's when the systolic has no alarm at all and MAP does.
	const shownReading: MonitorAlarmParameter =
		source ??
		(parameter !== "bp"
			? parameter
			: limits.systolic.every((side) => side === null) && limits.map.some((side) => side !== null)
				? "map"
				: "systolic");
	const limit = limits[shownReading];
	const alarmWords = alarm ? `${source === "map" ? "mean pressure " : ""}${alarm} alarm limits` : undefined;

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
				{/* Alarm limits, high over low, small beside the value; a side that's off reads OFF, as on a bedside
				    monitor (never blank or "--", which would read as missing data). */}
				{full ? (
					<span className='flex flex-col text-xs/3.5 text-monitor-foreground tabular-nums'>
						<span>{limit[1] ?? "OFF"}</span>
						<span>{limit[0] ?? "OFF"}</span>
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
					{alarmWords ? (
						<span className='sr-only'>
							, {alarmWords}
							{priority ? `, ${priority} priority alarm` : ""}
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

/**
 * The full monitor's four lanes, HR, SpO₂, ABP and RR, each its waveform (or its last hour with `plot="trends"`) beside
 * its numbers and alarm limits. PatientMonitor's body and PatientMonitoringCard's full view, so the two can't drift.
 */
function MonitorFullLanes({
	vitals,
	limits,
	alarms,
	plot,
	trends,
	size,
}: {
	vitals: MonitorVitals;
	limits: MonitorAlarmLimits;
	alarms: MonitorAlarmState;
	plot: "waveform" | "trends";
	trends: MonitorTrends;
	size: PatientMonitorSize;
}) {
	return (
		<>
			{parameterOrder.map((parameter) => (
				<div key={parameter} className='flex min-h-0'>
					{plot === "trends" ? (
						<MonitorTrendLane parameter={parameter} values={trends[parameter === "bp" ? "systolic" : parameter]} />
					) : (
						<MonitorLane parameter={parameter} vitals={vitals} />
					)}
					<div className={cn("flex shrink-0 border-l border-monitor-grid py-0.5", size === "sm" ? "w-28" : "w-32")}>
						<MonitorNumeric parameter={parameter} vitals={vitals} limits={limits} alarms={alarms} size={size} full />
					</div>
				</div>
			))}
		</>
	);
}

type PatientMonitorProps = Omit<React.ComponentProps<"section">, "children"> & {
	/** Live bedside values. A missing value shows "--", never zero. */
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
	/** What each lane plots: the live waveform (`waveform`, default) or the parameter's last hour (`trends`, from `trends`). */
	plot?: "waveform" | "trends";
	/** The last hour of HR, SpO₂, systolic and RR, for the `trends` plot. */
	trends?: MonitorTrends;
	/** `md` (default) or `sm`, the compact size: a narrower numerics column and smaller numbers. */
	size?: PatientMonitorSize;
};

/**
 * A live bedside monitor: one lane per parameter (HR, SpO₂, ABP, RR), each its waveform (or its last hour with
 * `plot="trends"`) beside its numbers and alarm limits, marking values outside them as the bedside device does. For a
 * page that already shows who the patient is (Patient details, the alert modal); PatientMonitoringCard shows the same
 * monitor in its full view. 240px tall by default; a height in `className` stretches the lanes. Pass an `aria-label`
 * that names the patient.
 *
 * Figma: [intercept.ds › patient-monitor](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1240-2210)
 */
function PatientMonitor({
	vitals = {},
	limits: limitsProp,
	alarmPriorities = {},
	acknowledgedAlarms = [],
	plot = "waveform",
	trends = {},
	size = "md",
	className,
	...props
}: PatientMonitorProps) {
	const limits = resolveMonitorLimits(limitsProp);
	const alarms = { priorities: alarmPriorities, acknowledged: acknowledgedAlarms };

	return (
		<section
			data-slot='patient-monitor'
			data-size={size}
			className={cn(
				"grid h-60 grid-rows-4 divide-y divide-monitor-grid overflow-hidden rounded-lg bg-monitor text-monitor-foreground",
				className,
			)}
			{...props}
		>
			<MonitorFullLanes vitals={vitals} limits={limits} alarms={alarms} plot={plot} trends={trends} size={size} />
		</section>
	);
}

export {
	defaultMonitorLimits,
	DeviceAlarmValue,
	MonitorAlarmIcon,
	monitorAlarm,
	monitorAlarmSide,
	MonitorFullLanes,
	MonitorLane,
	MonitorNumeric,
	MonitorSparkline,
	parameterOrder as monitorParameterOrder,
	PatientMonitor,
	resolveMonitorLimits,
	type MonitorAlarmLimit,
	type MonitorAlarmLimits,
	type MonitorAlarmParameter,
	type MonitorAlarmPriorities,
	type MonitorAlarmState,
	type MonitorLimits,
	type MonitorTrends,
	type MonitorVitals,
	type PatientMonitorProps,
	type PatientMonitorSize,
};
