import * as React from "react";
import { BellRingIcon, ChartLineIcon, TableIcon } from "lucide-react";

import { PatientCardAlert } from "@/components/cards/patient-census-card";
import type { MonitorVitals } from "@/components/data-display/patient-monitor";
import { FilterBar, FilterBarChip, FilterBarControls, FilterBarFilters } from "@/components/forms/filter-bar";
import { SearchInput } from "@/components/forms/search-input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/overlays/tooltip";
import { useCurrentMinute } from "@/lib/hooks/use-current-minute";
import { cn } from "@/lib/utils";

import { SegmentedToggle, type ToggleOption } from "../../monitoring/view-controls";
import { formatDateTime, formatTime, NoData } from "../section-parts";

// Patient details › Timeline (PRD PD-030–PD-032): the patient's monitor, pump, ventilator and lab values and the
// events between them on one time axis, so cause and effect line up. A crosshair (pointer, or the arrow keys once the
// chart has focus) reads every lane at one moment; the table view is the chart's table alternative (PD-AC-17).

/* -------------------------------------------------------------------------- */
/* Data shapes (the app's API fills these)                                    */
/* -------------------------------------------------------------------------- */

/** One reading. `null` is a gap (no data), drawn as a gap, never interpolated (PD-031). */
type TimelinePoint = {
	at: string;
	value: number | null;
	/** A band lane's range around the value, e.g. systolic (`high`) and diastolic (`low`) around MAP. */
	low?: number;
	high?: number;
};

/** `oxygen` is charted oxygen (nasal cannula, mask); `support` is other organ support (ECMO, CRRT) by device. */
type TimelineLaneGroup = "monitor" | "pump" | "ventilator" | "oxygen" | "support" | "labs";

/** Each parameter keeps one color across the page (PRD SV-072). */
type TimelineLaneColor =
	| "heart"
	| "pressure"
	| "oxygen"
	| "breathing"
	| "temperature"
	| "infusion"
	| "sedation"
	| "fluid"
	| "other"
	| "fio2"
	| "peep"
	| "lab"
	| "lab-2";

type TimelineLane = {
	/** A monitor lane named after a monitor reading (`hr`, `spo2`, `map`, `rr`) shows the live value in Now. */
	id: string;
	group: TimelineLaneGroup;
	label: string;
	unit: string;
	/** `line` for continuous values, `band` for a line with its range, `step` for settings and rates, `dots` for discrete results. */
	kind: "line" | "band" | "step" | "dots";
	color: TimelineLaneColor;
	/** Where the values come from, e.g. "Monitor", "Pump", "Lab" (PD-032). */
	source: string;
	/** Alarm or reference limits, drawn as dashed lines. */
	limits?: { low?: number; high?: number };
	/** A latest reading older than this reads stale: kept, dimmed, with its time (PD-120). */
	staleAfterMinutes?: number;
	/** Print each dot's value beside it (labs). */
	showValues?: boolean;
	/** Decimal places to show, so 3.0 doesn't read as 3. Values print as given when unset. */
	decimals?: number;
	/** Oldest first. */
	points: TimelinePoint[];
};

type TimelineEventKind = "care" | "drip" | "ventilator" | "lab" | "note" | "alert";

/** An alert's severity, as Monitoring's alert badge shows it; `resolved` marks when it was resolved. */
type TimelineAlertSeverity = "critical" | "high" | "medium" | "low" | "resolved";

type TimelineEvent = {
	id: string;
	at: string;
	kind: TimelineEventKind;
	label: string;
	/** An alert's severity: its bell takes the severity's color. An alert without one (a status change) shows a grey bell. */
	severity?: TimelineAlertSeverity;
	/** An open alert's id: its bell opens the alert (`onOpenAlert`). A resolved alert's doesn't, as in the Live feed. */
	alertId?: string;
};

type PatientTimeline = { lanes: TimelineLane[]; events: TimelineEvent[] };

type TimelineSectionProps = {
	timeline: PatientTimeline;
	/** When the signed-in clinician last viewed the patient: everything after it is shaded. */
	lastViewedAt?: string;
	/** The bedside monitor's live readings: Now shows them on the lanes they name. */
	liveVitals?: MonitorVitals;
	/** Opens an open alert (its bell on the events lane) in the alert modal. */
	onOpenAlert?: (alertId: string) => void;
	/**
	 * Where Previous and Now sit: `right` (default) after the plot, or `left` between each lane's name and its plot
	 * ("Timeline option 2", Intercept-Live `316:16920`, a prototype View).
	 */
	valuesSide?: "right" | "left";
};

/* -------------------------------------------------------------------------- */
/* Product content                                                            */
/* -------------------------------------------------------------------------- */

const MINUTE = 60_000;

// 15 m, 30 m and 1 h for the ICU's minute-by-minute view (PD-030, Nov 24, 2026); 12 h is the default.
const windows = [
	{ id: "15m", label: "15 m", name: "15 min", minutes: 15, tickMinutes: 5, tableMinutes: 1, keyStep: 0.5 },
	{ id: "30m", label: "30 m", name: "30 min", minutes: 30, tickMinutes: 5, tableMinutes: 5, keyStep: 1 },
	{ id: "1h", label: "1 h", name: "1 h", minutes: 60, tickMinutes: 10, tableMinutes: 5, keyStep: 1 },
	{ id: "6h", label: "6 h", name: "6 h", minutes: 360, tickMinutes: 60, tableMinutes: 30, keyStep: 5 },
	{ id: "12h", label: "12 h", name: "12 h", minutes: 720, tickMinutes: 120, tableMinutes: 60, keyStep: 10 },
	{ id: "24h", label: "24 h", name: "24 h", minutes: 1440, tickMinutes: 240, tableMinutes: 120, keyStep: 20 },
] as const;

type TimelineWindow = (typeof windows)[number];
type TimelineWindowId = TimelineWindow["id"];
type TimelineView = "chart" | "table";

const windowOptions: ToggleOption<TimelineWindowId>[] = windows.map(({ id, label }) => ({ id, label }));
const viewOptions: ToggleOption<TimelineView>[] = [
	{ id: "chart", label: "Chart", icon: ChartLineIcon },
	{ id: "table", label: "Table", icon: TableIcon },
];

/** `label` names the group's filter chip; `heading` its rows. */
const groups: { id: TimelineLaneGroup; label: string; heading: string }[] = [
	{ id: "monitor", label: "Monitor", heading: "Monitoring" },
	{ id: "pump", label: "Pump", heading: "Pump" },
	{ id: "ventilator", label: "Ventilator", heading: "Ventilator" },
	{ id: "oxygen", label: "Oxygen", heading: "Oxygen" },
	{ id: "support", label: "Other support", heading: "Other support" },
	{ id: "labs", label: "Labs", heading: "Labs" },
];

const laneColors: Record<TimelineLaneColor, string> = {
	heart: "text-monitor-ecg-ink",
	pressure: "text-monitor-abp-ink",
	oxygen: "text-monitor-spo2-ink",
	breathing: "text-monitor-resp-ink",
	temperature: "text-badge-amber-foreground",
	infusion: "text-badge-blue-foreground",
	sedation: "text-badge-sky-foreground",
	fluid: "text-badge-green-foreground",
	other: "text-badge-yellow-foreground",
	fio2: "text-chart-4",
	peep: "text-chart-3",
	lab: "text-chart-2",
	"lab-2": "text-chart-1",
};

// Each kind's marker: a letter on its color, so the kind never rests on color alone. Alerts are Monitoring's bell in
// the severity's color instead (PatientCardAlert), so `letter` is unset. The fills are the same in both modes, under white.
const eventKinds: Record<TimelineEventKind, { label: string; plural: string; letter?: string; className: string }> = {
	alert: { label: "Alert", plural: "Alerts", className: "bg-neutral-prominent text-white" },
	care: { label: "Care event", plural: "Care events", letter: "C", className: "bg-(--pink-700) text-white" },
	drip: { label: "Drip change", plural: "Drip changes", letter: "D", className: "bg-(--blue-700) text-white" },
	ventilator: { label: "Ventilator change", plural: "Ventilator changes", letter: "V", className: "bg-chart-4 text-white" },
	lab: { label: "Lab result", plural: "Lab results", letter: "L", className: "bg-tone-accent text-tone-accent-foreground" },
	note: { label: "Note", plural: "Notes", letter: "N", className: "bg-(--gray-500) text-white" },
};

const eventKindOrder: TimelineEventKind[] = ["alert", "care", "drip", "ventilator", "lab", "note"];

const severityWords: Record<TimelineAlertSeverity, string> = {
	critical: "Critical alert",
	high: "High alert",
	medium: "Medium alert",
	low: "Low alert",
	resolved: "Alert resolved",
};

// Every lane row is 56px with its rule; the plot takes the rest.
const LANE_HEIGHT = 55;
const EVENTS_HEIGHT = 31;
const MARKER = 24;
const MARKER_GAP = 2;

// A line or band reading counts at a moment if it's within this of it; further away, the moment has no reading.
const NEAREST = 10 * MINUTE;

/* -------------------------------------------------------------------------- */
/* Reading values                                                             */
/* -------------------------------------------------------------------------- */

const time = (point: { at: string }) => Date.parse(point.at);

/** The lane's reading at a moment: the nearest line reading (a gap reads as none), or the step or result in force. */
function valueAt(lane: TimelineLane, at: number): TimelinePoint | undefined {
	if (lane.kind === "step" || lane.kind === "dots") {
		let found: TimelinePoint | undefined;
		for (const point of lane.points) {
			if (time(point) > at) break;
			if (point.value !== null) found = point;
		}
		return found;
	}
	let nearest: TimelinePoint | undefined;
	for (const point of lane.points) {
		const distance = Math.abs(time(point) - at);
		if (distance <= NEAREST && (!nearest || distance < Math.abs(time(nearest) - at))) nearest = point;
	}
	return nearest?.value === null ? undefined : nearest;
}

/** A reading as the lane writes it. */
const formatValue = (lane: TimelineLane, value: number) => (lane.decimals === undefined ? String(value) : value.toFixed(lane.decimals));

/** Above or below the lane's limits, in words (flags never rely on color alone). */
function limitFlag(lane: TimelineLane, value: number) {
	if (lane.limits?.high !== undefined && value > lane.limits.high) return { letter: "H", label: "above limit" };
	if (lane.limits?.low !== undefined && value < lane.limits.low) return { letter: "L", label: "below limit" };
	return undefined;
}

function Flag({ lane, value }: { lane: TimelineLane; value: number }) {
	const flag = limitFlag(lane, value);
	if (!flag) return null;
	return (
		<span className='ml-1 text-xs font-bold text-foreground'>
			<span aria-hidden='true'>{flag.letter}</span>
			<span className='sr-only'>, {flag.label}</span>
		</span>
	);
}

/** The values a lane shows in the window, with any step in force at its start, for its scale. */
function visibleValues(lane: TimelineLane, start: number, end: number) {
	const values: number[] = [];
	lane.points.forEach((point, index) => {
		const at = time(point);
		const next = lane.points[index + 1];
		// A step in force at the window's start counts, though it began before it.
		const inForce = (lane.kind === "step" && at < start && next && time(next) > start) || false;
		if ((at >= start && at <= end) || inForce) {
			if (point.value !== null) values.push(point.value);
			if (point.low !== undefined) values.push(point.low);
			if (point.high !== undefined) values.push(point.high);
		}
	});
	return values;
}

/**
 * The lane's vertical range: steps from zero (their fill is an amount), the rest padded around what's visible. A limit
 * near the values joins the range so its line shows; a far one (HR's low limit beside a tachycardia) would flatten the
 * line, so it stays out.
 */
function laneDomain(lane: TimelineLane, start: number, end: number): [number, number] {
	const values = visibleValues(lane, start, end);
	if (!values.length) return [0, 1];
	let min = Math.min(...values);
	let max = Math.max(...values);
	if (lane.kind === "step") return [0, max * 1.25 || 1];
	// One reading has no spread to judge by, so its limit may sit further away.
	const reach = max > min ? Math.max(max - min, Math.abs(max) * 0.1) : Math.abs(max) * 0.5;
	for (const limit of [lane.limits?.low, lane.limits?.high]) {
		if (limit !== undefined && limit >= min - reach && limit <= max + reach) {
			min = Math.min(min, limit);
			max = Math.max(max, limit);
		}
	}
	const pad = (max - min) * 0.2 || Math.abs(max) * 0.1 || 1;
	return [min - pad, max + pad];
}

const hourFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric" });
const dayFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

/** The tick at or before a moment: the clock's last multiple of `tickMinutes` (10 PM, 12 AM… or 10:25, 10:30…). */
function floorTick(at: number, tickMinutes: number) {
	const date = new Date(at);
	const minutes = date.getHours() * 60 + date.getMinutes();
	date.setHours(0, Math.floor(minutes / tickMinutes) * tickMinutes, 0, 0);
	return date.getTime();
}

/** Ticks inside the window, on the clock's multiples of the window's tick. */
function windowTicks(start: number, end: number, tickMinutes: number) {
	const ticks: number[] = [];
	for (let tick = floorTick(start, tickMinutes) + tickMinutes * MINUTE; tick < end; tick += tickMinutes * MINUTE) ticks.push(tick);
	return ticks;
}

const tickLabel = (at: number, tickMinutes: number) =>
	tickMinutes >= 60 ? hourFormat.format(at) : formatTime(new Date(at).toISOString());

/** A reading's time, with its date when it's from another day. */
const readingTime = (at: string, now: number) =>
	new Date(at).toDateString() === new Date(now).toDateString() ? formatTime(at) : formatDateTime(at);

type Reading = { value: number; detail?: string; stale?: boolean };

/** The lane's reading at a moment, with what goes under it: the range for a band, the time for a result, else the unit. */
function readingAt(lane: TimelineLane, at: number, now: number, latest: boolean): Reading | undefined {
	const point = valueAt(lane, at);
	if (!point || point.value === null) return undefined;
	const stale = latest && lane.staleAfterMinutes !== undefined && now - time(point) > lane.staleAfterMinutes * MINUTE;
	const detail =
		lane.kind === "band" && point.high !== undefined && point.low !== undefined
			? `${point.high}/${point.low}`
			: stale
				? `${readingTime(point.at, now)} · stale`
				: lane.kind === "dots"
					? readingTime(point.at, now)
					: lane.unit;
	return { value: point.value, detail, stale };
}

const liveReadings = ["hr", "spo2", "map", "rr"] as const;

/** The monitor's live value for a lane named after one of its readings. */
function liveReading(lane: TimelineLane, vitals?: MonitorVitals): Reading | undefined {
	const id = liveReadings.find((item) => item === lane.id);
	const value = id ? vitals?.[id] : undefined;
	if (!id || value === undefined) return undefined;
	const range = id === "map" && vitals?.systolic !== undefined && vitals.diastolic !== undefined;
	return { value, detail: range ? `${vitals.systolic}/${vitals.diastolic}` : lane.unit };
}

/* -------------------------------------------------------------------------- */
/* Drawing                                                                    */
/* -------------------------------------------------------------------------- */

type Frame = {
	start: number;
	end: number;
	width: number;
	ticks: number[];
	lastViewed?: number;
	cursor: number | null;
	x: (at: number) => number;
};

/** What every row draws behind its content: the tick grid, the "since you last looked" shading, and the crosshair. */
function Backdrop({ frame, height }: { frame: Frame; height: number }) {
	const lastViewedX = frame.lastViewed !== undefined && frame.lastViewed > frame.start ? frame.x(frame.lastViewed) : undefined;
	return (
		<>
			{lastViewedX !== undefined ? (
				<>
					<rect x={lastViewedX} y={0} width={frame.width - lastViewedX} height={height} className='fill-info-subtle' />
					<line x1={lastViewedX} x2={lastViewedX} y1={0} y2={height} strokeDasharray='3 3' className='stroke-info' />
				</>
			) : null}
			{frame.ticks.map((tick) => (
				<line key={tick} x1={frame.x(tick)} x2={frame.x(tick)} y1={0} y2={height} strokeDasharray='2 3' className='stroke-border' />
			))}
		</>
	);
}

function Crosshair({ frame, height }: { frame: Frame; height: number }) {
	if (frame.cursor === null) return null;
	const x = frame.x(frame.cursor);
	return <line x1={x} x2={x} y1={0} y2={height} className='stroke-foreground/50' />;
}

/** A lane's plot: its limits, then its line, band, steps or dots. */
function LanePlot({ lane, frame }: { lane: TimelineLane; frame: Frame }) {
	const height = LANE_HEIGHT;
	// A result's value sits beside its dot, so dots keep clear of the edges.
	const top = lane.kind === "dots" ? 10 : 6;
	const bottom = height - (lane.kind === "dots" ? 10 : 6);
	const [low, high] = laneDomain(lane, frame.start, frame.end);
	const y = (value: number) => bottom - ((value - low) / (high - low)) * (bottom - top);
	const points = lane.points.filter((point) => time(point) <= frame.end);

	// Lines and bands break at every gap.
	const segments: TimelinePoint[][] = [];
	if (lane.kind === "line" || lane.kind === "band") {
		let current: TimelinePoint[] = [];
		for (const point of points) {
			if (point.value === null) {
				if (current.length) segments.push(current);
				current = [];
			} else current.push(point);
		}
		if (current.length) segments.push(current);
	}
	const linePath = (segment: TimelinePoint[], key: "value" | "low" | "high" = "value") =>
		segment.map((point, index) => `${index ? "L" : "M"}${frame.x(time(point)).toFixed(1)} ${y(point[key] ?? 0).toFixed(1)}`).join(" ");

	// Steps hold each value until the next one, up to the last reading.
	const valued = points.filter((point): point is TimelinePoint & { value: number } => point.value !== null);
	const stepPath = valued
		.map((point, index) => {
			const x = frame.x(time(point)).toFixed(1);
			return index ? `H${x} V${y(point.value).toFixed(1)}` : `M${x} ${y(point.value).toFixed(1)}`;
		})
		.join(" ");
	const cursorPoint = frame.cursor !== null ? valueAt(lane, frame.cursor) : undefined;

	return (
		<svg width={frame.width} height={height} aria-hidden='true' className={cn("block overflow-hidden", laneColors[lane.color])}>
			<Backdrop frame={frame} height={height} />
			{[lane.limits?.low, lane.limits?.high].map((limit, index) =>
				limit !== undefined && limit > low && limit < high ? (
					<line
						key={index}
						x1={0}
						x2={frame.width}
						y1={y(limit)}
						y2={y(limit)}
						strokeDasharray='4 3'
						className='stroke-severity-critical/60'
					/>
				) : null,
			)}
			{lane.kind === "band"
				? segments.map((segment, index) => (
						<path
							key={`band-${index}`}
							d={`${linePath(segment, "high")} ${linePath([...segment].reverse(), "low").replace(/^M/, "L")} Z`}
							className='fill-current opacity-15'
						/>
					))
				: null}
			{lane.kind === "line" || lane.kind === "band"
				? segments.map((segment, index) => (
						<path
							key={`line-${index}`}
							d={linePath(segment)}
							fill='none'
							strokeWidth={1.75}
							strokeLinejoin='round'
							className='stroke-current'
						/>
					))
				: null}
			{lane.kind === "step" && valued.length ? (
				<>
					<path d={`${stepPath} V${bottom} H${frame.x(time(valued[0])).toFixed(1)} Z`} className='fill-current opacity-12' />
					<path d={stepPath} fill='none' strokeWidth={1.75} className='stroke-current' />
				</>
			) : null}
			{lane.kind === "dots"
				? valued.map((point) => {
						const x = frame.x(time(point));
						if (x < -8 || x > frame.width + 8) return null;
						const dotY = y(point.value);
						// The value under a dot in the lane's top half, over one in its bottom half, so it stays in the lane.
						const textY = dotY < height / 2 ? dotY + 17 : dotY - 7;
						return (
							<g key={point.at}>
								<circle cx={x} cy={dotY} r={3} className='fill-current' />
								{lane.showValues ? (
									<text
										x={Math.min(Math.max(x, 14), frame.width - 14)}
										y={textY}
										textAnchor='middle'
										className='fill-foreground text-sm font-medium tabular-nums'
									>
										{formatValue(lane, point.value)}
									</text>
								) : null}
							</g>
						);
					})
				: null}
			<Crosshair frame={frame} height={height} />
			{cursorPoint && cursorPoint.value !== null && lane.kind !== "dots" ? (
				<circle
					cx={frame.x(frame.cursor ?? 0)}
					cy={y(cursorPoint.value)}
					r={3}
					strokeWidth={1.5}
					className='fill-card stroke-current'
				/>
			) : null}
		</svg>
	);
}

/* -------------------------------------------------------------------------- */
/* Events                                                                     */
/* -------------------------------------------------------------------------- */

const markerClassName =
	"inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-1.5 text-xs leading-[18px] font-semibold whitespace-nowrap";

/** An event as its tooltip and the table read it: "4:02 AM · Lab result: Lactate 4.1". */
const eventWords = (event: TimelineEvent) =>
	`${formatTime(event.at)} · ${event.kind === "alert" && event.severity ? severityWords[event.severity] : eventKinds[event.kind].label}: ${event.label}`;

/** A kind's marker: its letter on its color, or the bell (in the severity's color for an alert that has one). */
function EventKindMarker({ kind, severity, className }: { kind: TimelineEventKind; severity?: TimelineAlertSeverity; className?: string }) {
	if (kind === "alert" && severity) {
		return (
			<PatientCardAlert
				aria-hidden='true'
				variant={severity}
				iconOnly
				className={cn("h-6 w-6 justify-center p-0 [&>svg]:size-3", className)}
			/>
		);
	}
	const item = eventKinds[kind];
	return (
		<span aria-hidden='true' className={cn(markerClassName, item.className, className)}>
			{item.letter ?? <BellRingIcon className='size-3' />}
		</span>
	);
}

type Marker = { key: string; left: number } & ({ type: "event"; event: TimelineEvent } | { type: "more"; events: TimelineEvent[] });

/**
 * Markers sit at their time. Ones that would overlap sit side by side from the first; past two non-alert events in a
 * run, they all become one neutral cluster showing how many ("4"), listed in its tooltip. Alerts never fold, so each stays one
 * click from its alert.
 */
function layoutMarkers(events: TimelineEvent[], frame: Frame): Marker[] {
	const runs: { x: number; lastX: number; events: TimelineEvent[] }[] = [];
	for (const event of [...events].sort((a, b) => time(a) - time(b))) {
		const x = frame.x(time(event));
		const run = runs.at(-1);
		if (run && x - run.lastX < MARKER + MARKER_GAP) {
			run.events.push(event);
			run.lastX = x;
		} else runs.push({ x, lastX: x, events: [event] });
	}
	const markers: Marker[] = runs.flatMap((run) => {
		const others = run.events.filter((event) => event.kind !== "alert");
		// Past two, the run's events become one cluster, where the first of them was (Nov 24, 2026, user's call).
		const folded = others.length > 2 ? others : [];
		const items: ({ type: "event"; event: TimelineEvent } | { type: "more"; events: TimelineEvent[] })[] = [];
		for (const event of run.events) {
			if (event === folded[0]) items.push({ type: "more", events: folded });
			if (folded.includes(event)) continue;
			items.push({ type: "event", event });
		}
		return items.map((item, index) => ({
			...item,
			key: item.type === "event" ? item.event.id : `more-${item.events[0].id}`,
			left: run.x - MARKER / 2 + index * (MARKER + MARKER_GAP),
		}));
	});
	// Keep every marker inside the lane without covering another: push right past the one before, then back left from
	// the lane's end (a run near now would otherwise slide over the run before it).
	const step = MARKER + MARKER_GAP;
	markers.forEach((marker, index) => {
		marker.left = Math.max(marker.left, index ? markers[index - 1].left + step : 0);
	});
	for (let index = markers.length - 1; index >= 0; index--) {
		const limit = index === markers.length - 1 ? frame.width - MARKER : markers[index + 1].left - step;
		markers[index].left = Math.max(0, Math.min(markers[index].left, limit));
	}
	return markers;
}

/** One marker on the events lane, named in a tooltip; an open alert's bell is a button that opens the alert. */
function EventMarker({ marker, onOpenAlert }: { marker: Marker; onOpenAlert?: (alertId: string) => void }) {
	const style = { left: marker.left };
	// A marker only names itself (its tooltip), so the arrow cursor, and its letter isn't selectable text. An open
	// alert's bell, a button, takes the pointer.
	const position = "absolute top-1/2 -translate-y-1/2 cursor-default select-none";

	if (marker.type === "more") {
		return (
			<Tooltip>
				<TooltipTrigger asChild>
					<span aria-hidden='true' style={style} className={cn(position, markerClassName, "bg-foreground text-background")}>
						{marker.events.length}
					</span>
				</TooltipTrigger>
				<TooltipContent side='top' className='flex flex-col items-start'>
					{marker.events.map((event) => (
						<span key={event.id}>{eventWords(event)}</span>
					))}
				</TooltipContent>
			</Tooltip>
		);
	}

	const { event } = marker;
	const words = eventWords(event);
	if (event.kind === "alert" && event.alertId && onOpenAlert) {
		const alertId = event.alertId;
		return (
			<Tooltip>
				<TooltipTrigger asChild>
					<button
						type='button'
						aria-label={`${words}. Open alert`}
						style={style}
						onClick={() => onOpenAlert(alertId)}
						className={cn(position, "group/alert flex cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring")}
					>
						{/* Monitoring's alert badge hover: a dark layer under the bell. */}
						<EventKindMarker
							kind='alert'
							severity={event.severity}
							className='relative isolate before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-full before:bg-(--gray-700)/32 before:opacity-0 before:transition-opacity group-hover/alert:before:opacity-100'
						/>
					</button>
				</TooltipTrigger>
				<TooltipContent side='top'>{`${words} · Open alert`}</TooltipContent>
			</Tooltip>
		);
	}
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<span aria-hidden='true' style={style} className={cn(position, "flex")}>
					<EventKindMarker kind={event.kind} severity={event.severity} />
				</span>
			</TooltipTrigger>
			<TooltipContent side='top'>{words}</TooltipContent>
		</Tooltip>
	);
}

/** The events lane: the grid and shading, then each event's marker at its time. */
function EventsLane({
	events,
	frame,
	onOpenAlert,
}: {
	events: TimelineEvent[];
	frame: Frame;
	onOpenAlert?: (alertId: string) => void;
}) {
	return (
		<div className='relative h-full'>
			<svg width={frame.width} height={EVENTS_HEIGHT} aria-hidden='true' className='absolute inset-0 block overflow-hidden'>
				<Backdrop frame={frame} height={EVENTS_HEIGHT} />
				<Crosshair frame={frame} height={EVENTS_HEIGHT} />
			</svg>
			{layoutMarkers(events, frame).map((marker) => (
				<EventMarker key={marker.key} marker={marker} onOpenAlert={onOpenAlert} />
			))}
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/* Header and rows                                                            */
/* -------------------------------------------------------------------------- */

// Every row shares the columns, so the plots line up on one axis: the lane's name and unit, its plot, its earlier value
// (Previous: at the crosshair, else at the window's start), and its value now, to compare the two. The values sit after
// the plot (`right`) or before it (`left`, "Timeline option 2"). Cells name their column and row, so the DOM order (name,
// plot, Previous, Now) holds either way; a rule on the left of whatever follows another cell.
const valueLayouts = {
	right: {
		columns: "grid grid-cols-[7.5rem_minmax(0,1fr)_6.5rem_6.5rem] @min-[72rem]:grid-cols-[233px_minmax(0,1fr)_120px_120px]",
		plot: "col-start-2",
		previous: "col-start-3 border-l border-border",
		now: "col-start-4 border-l border-border",
	},
	left: {
		columns: "grid grid-cols-[7.5rem_6.5rem_6.5rem_minmax(0,1fr)] @min-[72rem]:grid-cols-[233px_120px_120px_minmax(0,1fr)]",
		plot: "col-start-4 border-l border-border",
		previous: "col-start-2",
		now: "col-start-3 border-l border-border",
	},
} as const;

/** The time axis as a table head: one column per tick interval, named by its start, the date over a new day's first. */
function TimeHeader({ frame, tickMinutes, lastViewedX }: { frame: Frame; tickMinutes: number; lastViewedX?: number }) {
	const bounds = [frame.start, ...frame.ticks, frame.end];
	const columns = bounds.slice(0, -1).map((from, index) => {
		const labelAt = index === 0 ? floorTick(frame.start, tickMinutes) : from;
		return { from, to: bounds[index + 1], labelAt };
	});
	return (
		<>
			{lastViewedX !== undefined ? (
				<div aria-hidden='true' className='absolute inset-y-0 right-0 bg-info-subtle' style={{ left: lastViewedX }} />
			) : null}
			{columns.map((column, index) => {
				const left = frame.x(column.from);
				const width = frame.x(column.to) - left;
				const previous = columns[index - 1];
				const newDay = previous && new Date(previous.labelAt).toDateString() !== new Date(column.labelAt).toDateString();
				return (
					<div
						key={column.from}
						aria-hidden='true'
						style={{ left, width }}
						className={cn(
							"absolute inset-y-0 flex flex-col items-center justify-center whitespace-nowrap text-foreground",
							index > 0 && "border-l border-border",
						)}
					>
						{/* A sliver of an interval at either end has no room for its name. */}
						{width >= 44 ? (
							<>
								{newDay ? <span className='text-xs'>{dayFormat.format(column.labelAt)}</span> : null}
								<span className='text-sm font-medium'>{tickLabel(column.labelAt, tickMinutes)}</span>
							</>
						) : null}
					</div>
				);
			})}
			{frame.cursor !== null ? (
				<>
					<div aria-hidden='true' className='absolute inset-y-0 w-px bg-foreground/50' style={{ left: frame.x(frame.cursor) }} />
					<span
						aria-hidden='true'
						className='absolute top-1.5 -translate-x-1/2 rounded-sm bg-foreground px-1.5 py-0.5 text-xs text-background tabular-nums'
						style={{ left: Math.min(Math.max(frame.x(frame.cursor), 36), frame.width - 36) }}
					>
						{formatTime(new Date(frame.cursor).toISOString())}
					</span>
				</>
			) : null}
		</>
	);
}

/** A value cell: the reading large, its unit, range or time under it; a stale one dimmed, with its time in amber. */
function ValueCell({ lane, reading, className }: { lane: TimelineLane; reading?: Reading; className?: string }) {
	return (
		<div className={cn("flex flex-col items-end justify-center px-3 text-right whitespace-nowrap", className)}>
			{reading ? (
				<>
					<span
						className={cn(
							"-mb-[3px] text-xl font-semibold tabular-nums",
							reading.stale ? "text-muted-foreground" : "text-foreground",
						)}
					>
						{formatValue(lane, reading.value)}
						<Flag lane={lane} value={reading.value} />
					</span>
					{reading.detail ? (
						<span className={cn("text-xs", reading.stale ? "text-badge-amber-foreground" : "text-muted-foreground")}>
							{reading.detail}
						</span>
					) : null}
				</>
			) : (
				<>
					<span className='-mb-[3px] text-xl text-muted-foreground'>--</span>
					<span className='text-xs text-muted-foreground'>No reading</span>
				</>
			)}
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/* Table alternative                                                          */
/* -------------------------------------------------------------------------- */

const intervalWords = (minutes: number) => (minutes >= 60 ? `${minutes / 60} h` : `${minutes} min`);

/** The chart as tables (PD-AC-17): each lane's value at regular times, newest first, then the events. */
function TimelineTable({
	timeline,
	timeWindow,
	start,
	end,
}: {
	timeline: PatientTimeline;
	timeWindow: TimelineWindow;
	start: number;
	end: number;
}) {
	const interval = timeWindow.tableMinutes * MINUTE;
	// Now, then round times back to the window's start (10:30, 10:00…), so rows read like a flowsheet.
	const times: number[] = [end];
	const zone = new Date(end).getTimezoneOffset() * MINUTE;
	for (let at = Math.floor((end - zone) / interval) * interval + zone; at >= start; at -= interval) {
		if (at < end) times.push(at);
	}
	const events = timeline.events.filter((event) => time(event) >= start && time(event) <= end).reverse();

	const cell = (lane: TimelineLane, at: number) => {
		if (lane.kind === "dots") {
			const result = lane.points.find((point) => point.value !== null && time(point) > at - interval && time(point) <= at);
			return result?.value != null ? (
				<>
					{formatValue(lane, result.value)}
					<Flag lane={lane} value={result.value} />
				</>
			) : null;
		}
		const point = valueAt(lane, at);
		return point?.value != null ? (
			<>
				{formatValue(lane, point.value)}
				<Flag lane={lane} value={point.value} />
			</>
		) : (
			<span className='text-muted-foreground'>--</span>
		);
	};

	return (
		<div className='flex flex-col gap-4'>
			<div className='overflow-x-auto rounded-lg border border-border'>
				<table className='w-full text-sm'>
					<caption className='sr-only'>
						Values every {intervalWords(timeWindow.tableMinutes)}, newest first. Lab results show in the interval they resulted in.
					</caption>
					<thead className='bg-background-subtle text-xs text-muted-foreground'>
						<tr>
							<th scope='col' className='px-3 py-2 text-left font-medium'>
								Time
							</th>
							{timeline.lanes.map((lane) => (
								<th key={lane.id} scope='col' className='px-3 py-2 text-right font-medium whitespace-nowrap'>
									{lane.label}
									<span className='block font-normal'>{lane.unit}</span>
								</th>
							))}
						</tr>
					</thead>
					<tbody className='divide-y divide-border-muted'>
						{times.map((at) => (
							<tr key={at}>
								<th scope='row' className='px-3 py-2 text-left font-medium whitespace-nowrap text-foreground'>
									{formatTime(new Date(at).toISOString())}
								</th>
								{timeline.lanes.map((lane) => (
									<td key={lane.id} className='px-3 py-2 text-right font-mono tabular-nums whitespace-nowrap'>
										{cell(lane, at)}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<div className='overflow-x-auto rounded-lg border border-border'>
				<table className='w-full text-sm'>
					<caption className='sr-only'>Events, newest first.</caption>
					<thead className='bg-background-subtle text-xs text-muted-foreground'>
						<tr>
							<th scope='col' className='px-3 py-2 text-left font-medium'>
								Time
							</th>
							<th scope='col' className='px-3 py-2 text-left font-medium'>
								Type
							</th>
							<th scope='col' className='px-3 py-2 text-left font-medium'>
								Event
							</th>
						</tr>
					</thead>
					<tbody className='divide-y divide-border-muted'>
						{events.length ? (
							events.map((event) => (
								<tr key={event.id}>
									<td className='px-3 py-2 whitespace-nowrap text-foreground'>{formatTime(event.at)}</td>
									<td className='px-3 py-2 whitespace-nowrap text-muted-foreground'>
										<span className='inline-flex items-center gap-2'>
											<EventKindMarker kind={event.kind} severity={event.severity} />
											{event.kind === "alert" && event.severity ? severityWords[event.severity] : eventKinds[event.kind].label}
										</span>
									</td>
									<td className='px-3 py-2 text-foreground'>{event.label}</td>
								</tr>
							))
						) : (
							<tr>
								<td colSpan={3} className='px-3 py-2 text-muted-foreground'>
									No events in this window.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/* TimelineSection                                                            */
/* -------------------------------------------------------------------------- */

/**
 * The patient's Timeline (PRD PD-030): a filter bar (search, a chip per lane group, the events shown, the window and
 * chart or table), then an events lane and the Monitor, Pump, Ventilator, Oxygen and Labs lanes on one time axis over
 * 15 min to 24 h, with dashed limits, gaps drawn as gaps and what's new since the clinician last looked shaded. Each
 * lane ends in an earlier value (Previous: at the crosshair while it's on, else at the window's start) beside its value
 * now, live from the monitor where it has one, so the two compare (Nov 24, 2026, user's call: hovering changes Previous,
 * never Now).
 *
 * Figma: [Intercept-Live › Timeline](https://www.figma.com/design/EKg9ovtsHlQoK3DAS0F5IM/Intercept-Live?node-id=311-8791)
 */
function TimelineSection({ timeline, lastViewedAt, liveVitals, onOpenAlert, valuesSide = "right" }: TimelineSectionProps) {
	const layout = valueLayouts[valuesSide];
	const now = useCurrentMinute();
	// 12 h by default (Nov 11, 2026, user's call): its table is hourly, the old flowsheet's step.
	const [windowId, setWindowId] = React.useState<TimelineWindowId>("12h");
	const [view, setView] = React.useState<TimelineView>("chart");
	const [query, setQuery] = React.useState("");
	const [pickedGroups, setPickedGroups] = React.useState<TimelineLaneGroup[]>([]);
	const [cursor, setCursor] = React.useState<number | null>(null);
	const [announcement, setAnnouncement] = React.useState("");
	const [width, setWidth] = React.useState(0);
	const plotRef = React.useRef<HTMLDivElement>(null);
	const summaryId = React.useId();

	const timeWindow = windows.find((item) => item.id === windowId) ?? windows[4];
	// Before the first client render there's no clock; the latest reading stands in for it. The clock ticks each minute,
	// so a reading or event newer than its last tick moves the end up to it, rather than falling off the right edge.
	const latest = Math.max(...timeline.lanes.flatMap((lane) => lane.points.map(time)), ...timeline.events.map(time), 0);
	const end = now === null ? latest : Math.max(now, latest);
	const start = end - timeWindow.minutes * MINUTE;

	React.useEffect(() => {
		const element = plotRef.current;
		if (!element) return;
		const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
		observer.observe(element);
		return () => observer.disconnect();
	}, [view]);

	// A new window drops the crosshair, which may be outside it.
	React.useEffect(() => setCursor(null), [windowId]);

	// What the filter bar leaves: lanes in the picked groups (all when none is picked) whose name or group matches the
	// search, and events that match it. Every kind of event shows (no events menu since Nov 24, 2026, user's call).
	const search = query.trim().toLowerCase();
	const presentGroups = groups.filter((group) => timeline.lanes.some((lane) => lane.group === group.id));
	const presentKinds = eventKindOrder.filter((kind) => timeline.events.some((event) => event.kind === kind));
	const lanes = timeline.lanes.filter((lane) => {
		const group = groups.find((item) => item.id === lane.group);
		if (pickedGroups.length && !pickedGroups.includes(lane.group)) return false;
		return !search || [lane.label, group?.label, group?.heading].some((text) => text?.toLowerCase().includes(search));
	});
	const events = timeline.events.filter(
		(event) => !search || `${event.label} ${eventKinds[event.kind].label}`.toLowerCase().includes(search),
	);
	const shown: PatientTimeline = { lanes, events };

	const frame: Frame = {
		start,
		end,
		width,
		ticks: windowTicks(start, end, timeWindow.tickMinutes),
		lastViewed: lastViewedAt ? Date.parse(lastViewedAt) : undefined,
		cursor,
		x: (at) => ((at - start) / (end - start)) * width,
	};
	const lastViewedX = frame.lastViewed !== undefined && frame.lastViewed > start ? frame.x(frame.lastViewed) : undefined;
	const windowEvents = events.filter((event) => time(event) >= start && time(event) <= end);
	// Previous reads the crosshair while it's on, else the window's start; Now always reads now.
	const previousAt = cursor ?? start;

	const readout = (moment: number) =>
		`${formatTime(new Date(moment).toISOString())}: ${lanes
			.map((lane) => {
				const point = valueAt(lane, moment);
				return point?.value != null ? `${lane.label} ${formatValue(lane, point.value)} ${lane.unit}` : `${lane.label} no reading`;
			})
			.join(", ")}`;

	const moveCursor = (next: number, announce: boolean) => {
		const clamped = Math.min(end, Math.max(start, next));
		setCursor(clamped);
		if (announce) setAnnouncement(readout(clamped));
	};

	const onKeyDown = (event: React.KeyboardEvent) => {
		const step = timeWindow.keyStep * MINUTE * (event.shiftKey ? 6 : 1);
		const from = cursor ?? end;
		if (event.key === "ArrowLeft") moveCursor(cursor === null ? end : from - step, true);
		else if (event.key === "ArrowRight") moveCursor(from + step, true);
		else if (event.key === "Home") moveCursor(start, true);
		else if (event.key === "End") moveCursor(end, true);
		else if (event.key === "Escape") setCursor(null);
		else return;
		event.preventDefault();
	};

	const onPointerMove = (event: React.PointerEvent) => {
		const rect = plotRef.current?.getBoundingClientRect();
		if (!rect || !width) return;
		const x = event.clientX - rect.left;
		if (x < 0 || x > rect.width) setCursor(null);
		else moveCursor(start + (x / rect.width) * (end - start), false);
	};

	// The chart in words for screen readers: each lane's range in the window and its latest value.
	const summary = `Last ${timeWindow.name}. ${lanes
		.map((lane) => {
			const values = lane.points
				.filter((point) => time(point) >= start && time(point) <= end)
				.flatMap((point) => (point.value === null ? [] : [point.value]));
			const latestValue = valueAt(lane, end)?.value;
			if (!values.length) return `${lane.label}: no readings in this window.`;
			const [min, max] = [Math.min(...values), Math.max(...values)];
			if (values.length === 1) return `${lane.label} ${min} ${lane.unit}, one reading.`;
			return min === max
				? `${lane.label} ${min} ${lane.unit} throughout.`
				: `${lane.label} ${min} to ${max} ${lane.unit}, latest ${latestValue ?? "none"}.`;
		})
		.join(" ")} ${windowEvents.length} events.`;

	if (!timeline.lanes.length) return <NoData>No values recorded for this patient yet.</NoData>;

	return (
		<TooltipProvider>
			<div className='@container flex flex-col gap-6'>
				<FilterBar aria-label='Timeline filters'>
					<FilterBarFilters>
						<SearchInput label='Search the timeline' value={query} onValueChange={setQuery} />
						{presentGroups.length > 1
							? presentGroups.map((group) => (
									<FilterBarChip
										key={group.id}
										pressed={pickedGroups.includes(group.id)}
										onPressedChange={(pressed) =>
											setPickedGroups((current) =>
												pressed ? [...current, group.id] : current.filter((item) => item !== group.id),
											)
										}
									>
										{group.label}
									</FilterBarChip>
								))
							: null}
					</FilterBarFilters>
					<FilterBarControls className='gap-3'>
						<SegmentedToggle label='Time window' options={windowOptions} value={windowId} onValueChange={setWindowId} />
						<SegmentedToggle label='View' options={viewOptions} value={view} onValueChange={setView} iconOnly />
					</FilterBarControls>
				</FilterBar>

				{view === "table" ? (
					<TimelineTable timeline={shown} timeWindow={timeWindow} start={start} end={end} />
				) : (
					<>
						<p id={summaryId} className='sr-only'>
							{summary}
						</p>
						<p aria-live='polite' className='sr-only'>
							{announcement}
						</p>
						<div
							role='group'
							tabIndex={0}
							aria-label='Timeline chart. Left and right arrow keys read every lane at one moment; Escape returns to now.'
							aria-describedby={summaryId}
							onKeyDown={onKeyDown}
							onPointerMove={onPointerMove}
							onPointerLeave={() => setCursor(null)}
							className='overflow-hidden rounded-lg border border-border outline-none focus-visible:ring-2 focus-visible:ring-ring'
						>
							{/* The head: the window and its time columns over the events lane; Previous and Now span both rows. */}
							<div className={cn(layout.columns, "grid-rows-[56px_32px]")}>
								<div className='col-start-1 row-start-1 flex items-center border-r border-b border-border px-3 text-sm text-foreground'>
									Last {timeWindow.name}
								</div>
								<div ref={plotRef} className={cn("row-start-1 relative overflow-hidden border-b border-border", layout.plot)}>
									{width ? <TimeHeader frame={frame} tickMinutes={timeWindow.tickMinutes} lastViewedX={lastViewedX} /> : null}
								</div>
								<div
									className={cn(
										"row-span-2 row-start-1 flex flex-col items-center justify-center border-b border-border bg-background-subtle px-3 text-sm font-medium text-foreground tabular-nums",
										layout.previous,
									)}
								>
									{/* Previous says the moment it reads (Nov 24, 2026, user's call): a lab or charted value shows the
									    result current then, which can be the same one as Now, taken earlier. */}
									{cursor === null ? (
										<>
											Previous
											<span className='text-xs font-normal text-muted-foreground'>
												<span className='sr-only'>, </span>
												{formatTime(new Date(start).toISOString())}
											</span>
										</>
									) : (
										formatTime(new Date(cursor).toISOString())
									)}
								</div>
								<div
									className={cn(
										"row-span-2 row-start-1 flex flex-col items-center justify-center border-b border-border px-3 text-sm font-medium text-foreground tabular-nums",
										layout.now,
									)}
								>
									Now
									{/* The clock's time, updated each minute (user's call), as Previous shows its moment. */}
									{now !== null ? (
										<span className='text-xs font-normal text-muted-foreground'>
											<span className='sr-only'>, </span>
											{formatTime(new Date(now).toISOString())}
										</span>
									) : null}
								</div>
								<div className='col-start-1 row-start-2 flex items-center border-r border-b border-border px-3 text-sm text-foreground'>
									Events
								</div>
								<div className={cn("row-start-2 overflow-hidden border-b border-border", layout.plot)}>
									{width ? <EventsLane events={windowEvents} frame={frame} onOpenAlert={onOpenAlert} /> : null}
								</div>
							</div>

							{lanes.length ? (
								groups.map((group) => {
									const groupLanes = lanes.filter((lane) => lane.group === group.id);
									if (!groupLanes.length) return null;
									return (
										<React.Fragment key={group.id}>
											<div className='flex h-6 items-center border-b border-border px-3 text-xs text-muted-foreground'>
												{group.heading}
											</div>
											{groupLanes.map((lane) => (
												<div key={lane.id} className={cn(layout.columns, "h-14 border-b border-border last:border-b-0")}>
													<div className='col-start-1 row-start-1 flex min-w-0 items-center justify-between gap-2 border-r border-border px-3'>
														<span className='truncate text-sm font-semibold text-foreground'>{lane.label}</span>
														<span className='shrink-0 text-xs text-muted-foreground'>{lane.unit}</span>
													</div>
													<div className={cn("row-start-1 overflow-hidden", layout.plot)}>
														{width ? <LanePlot lane={lane} frame={frame} /> : null}
													</div>
													<ValueCell
														lane={lane}
														reading={readingAt(lane, previousAt, end, false)}
														className={cn("row-start-1 bg-background-subtle", layout.previous)}
													/>
													<ValueCell
														lane={lane}
														reading={liveReading(lane, liveVitals) ?? readingAt(lane, end, end, true)}
														className={cn("row-start-1", layout.now)}
													/>
												</div>
											))}
										</React.Fragment>
									);
								})
							) : (
								<p className='px-3 py-4 text-sm text-muted-foreground'>No values match these filters.</p>
							)}
						</div>

						<ul aria-label='Legend' className='flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground'>
							{/* The markers' key: each kind the patient's timeline has, its letter or the bell. */}
							{presentKinds.map((kind) => (
								<li key={kind} className='flex items-center gap-1.5'>
									<EventKindMarker
										kind={kind}
										severity={kind === "alert" ? "critical" : undefined}
										className='h-4 w-auto min-w-4 px-1 text-[10px] leading-none [&>svg]:size-2.5'
									/>
									{kind === "alert" ? "Alert, in its severity's color" : eventKinds[kind].label}
								</li>
							))}
							<li className='flex items-center gap-1.5'>
								<span aria-hidden='true' className='w-4 border-t border-dashed border-severity-critical/60' />
								Limit
							</li>
							{lastViewedX !== undefined ? (
								<li className='flex items-center gap-1.5'>
									<span aria-hidden='true' className='size-3 rounded-[2px] border border-dashed border-info bg-info-subtle' />
									Since you last looked
								</li>
							) : null}
							<li>Gaps in a line mean no data.</li>
						</ul>
					</>
				)}
			</div>
		</TooltipProvider>
	);
}

export {
	TimelineSection,
	eventKinds as timelineEventKinds,
	type PatientTimeline,
	type TimelineAlertSeverity,
	type TimelineEvent,
	type TimelineEventKind,
	type TimelineLane,
	type TimelineLaneColor,
	type TimelineLaneGroup,
	type TimelinePoint,
	type TimelineSectionProps,
};
