import * as React from "react";

import { Switch } from "@/components/forms/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/navigation/tabs";
import { useCurrentMinute } from "@/lib/hooks/use-current-minute";
import { cn } from "@/lib/utils";

import { formatDateTime, formatTime, NoData, SectionCard } from "../section-parts";

// Patient details › Timeline (PRD PD-030–PD-032): the patient's monitor, pump, ventilator and lab values and the
// events between them on one time axis, so cause and effect line up. A crosshair (pointer, or the arrow keys once the
// chart has focus) reads every lane at one moment; "Show as table" is the chart's table alternative (PD-AC-17).

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
	/** Print each dot's value above it (labs). */
	showValues?: boolean;
	/** Decimal places to show, so 3.0 doesn't read as 3. Values print as given when unset. */
	decimals?: number;
	/** Oldest first. */
	points: TimelinePoint[];
};

type TimelineEventKind = "care" | "drip" | "ventilator" | "lab" | "note" | "alert";

type TimelineEvent = { id: string; at: string; kind: TimelineEventKind; label: string };

type PatientTimeline = { lanes: TimelineLane[]; events: TimelineEvent[] };

type TimelineSectionProps = {
	timeline: PatientTimeline;
	/** When the signed-in clinician last viewed the patient: everything after it is shaded. */
	lastViewedAt?: string;
};

/* -------------------------------------------------------------------------- */
/* Product content                                                            */
/* -------------------------------------------------------------------------- */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

const windows = [
	{ id: "6", label: "6 h", hours: 6, tickHours: 1, tableMinutes: 30, keyStep: 5 },
	{ id: "12", label: "12 h", hours: 12, tickHours: 2, tableMinutes: 60, keyStep: 10 },
	{ id: "24", label: "24 h", hours: 24, tickHours: 4, tableMinutes: 120, keyStep: 20 },
] as const;

type TimelineWindow = (typeof windows)[number];

const groups: { id: TimelineLaneGroup; label: string }[] = [
	{ id: "monitor", label: "Monitor" },
	{ id: "pump", label: "Pump" },
	{ id: "ventilator", label: "Ventilator" },
	{ id: "oxygen", label: "Oxygen" },
	{ id: "support", label: "Other support" },
	{ id: "labs", label: "Labs" },
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

const eventKinds: Record<TimelineEventKind, { label: string; className: string }> = {
	care: { label: "Care event", className: "fill-foreground bg-foreground" },
	drip: { label: "Drip change", className: "fill-badge-blue-foreground bg-badge-blue-foreground" },
	ventilator: { label: "Ventilator change", className: "fill-chart-4 bg-chart-4" },
	lab: { label: "Lab result", className: "fill-chart-2 bg-chart-2" },
	note: { label: "Note", className: "fill-icon-muted bg-icon-muted" },
	alert: { label: "Alert", className: "fill-severity-critical bg-severity-critical" },
};

const laneHeights: Record<TimelineLane["kind"], number> = { line: 52, band: 52, step: 40, dots: 44 };

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

/** Hour ticks for the axis, on the window's tick interval. */
function hourTicks(start: number, end: number, tickHours: number) {
	const ticks: number[] = [];
	const first = new Date(start);
	first.setMinutes(0, 0, 0);
	for (let tick = first.getTime() + HOUR; tick < end; tick += HOUR) {
		if (new Date(tick).getHours() % tickHours === 0) ticks.push(tick);
	}
	return ticks;
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

/** What every row draws behind its content: the hour grid, the "since you last looked" shading, and the crosshair. */
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
	const height = laneHeights[lane.kind];
	const top = lane.showValues ? 16 : 6;
	const bottom = height - 6;
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
						return (
							<g key={point.at}>
								<circle cx={x} cy={y(point.value)} r={3.5} className='fill-current' />
								{lane.showValues ? (
									<text
										x={Math.min(Math.max(x, 12), frame.width - 12)}
										y={y(point.value) - 7}
										textAnchor='middle'
										className='fill-foreground font-mono text-[10px]'
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

/** The events lane: one marker per event, an alert as a diamond. Each names itself on hover. */
function EventsPlot({ events, frame }: { events: TimelineEvent[]; frame: Frame }) {
	const height = 32;
	return (
		<svg width={frame.width} height={height} aria-hidden='true' className='block overflow-hidden'>
			<Backdrop frame={frame} height={height} />
			{events.map((event) => {
				const x = frame.x(time(event));
				const kind = eventKinds[event.kind];
				return (
					<g key={event.id} className={kind.className}>
						<title>{`${formatTime(event.at)} · ${event.label}`}</title>
						{event.kind === "alert" ? (
							<rect x={x - 4} y={height / 2 - 4} width={8} height={8} transform={`rotate(45 ${x} ${height / 2})`} />
						) : (
							<rect x={x - 4} y={height / 2 - 4} width={8} height={8} rx={2} />
						)}
					</g>
				);
			})}
			<Crosshair frame={frame} height={height} />
		</svg>
	);
}

/* -------------------------------------------------------------------------- */
/* Rows                                                                       */
/* -------------------------------------------------------------------------- */

// Every row shares the columns, so the plots line up on one axis: the lane's name, its plot, its value now (or at the
// crosshair).
const rowColumns = "grid grid-cols-[6.5rem_minmax(0,1fr)_7rem] @min-[48rem]:grid-cols-[8.5rem_minmax(0,1fr)_7.5rem]";

/** A reading's time, with its date when it's from another day. */
const readingTime = (at: string, now: number) =>
	new Date(at).toDateString() === new Date(now).toDateString() ? formatTime(at) : formatDateTime(at);

/** The lane's value cell: the reading at the crosshair, or the latest one, with its unit, range or time. */
function LaneValue({ lane, at, live, now }: { lane: TimelineLane; at: number; live: boolean; now: number }) {
	const point = valueAt(lane, at);
	if (!point || point.value === null) {
		return (
			<>
				<span className='font-mono text-sm text-muted-foreground'>--</span>
				<span className='text-xs text-muted-foreground'>{live ? "No current reading" : "No reading"}</span>
			</>
		);
	}
	const stale = live && lane.staleAfterMinutes !== undefined && now - time(point) > lane.staleAfterMinutes * MINUTE;
	const detail =
		lane.kind === "band" && point.high !== undefined && point.low !== undefined
			? `${point.high}/${point.low}`
			: stale
				? `${readingTime(point.at, now)} · stale`
				: lane.kind === "dots"
					? readingTime(point.at, now)
					: lane.unit;

	return (
		<>
			<span className={cn("font-mono text-sm font-semibold tabular-nums", stale ? "text-muted-foreground" : "text-foreground")}>
				{formatValue(lane, point.value)}
				<Flag lane={lane} value={point.value} />
			</span>
			<span className={cn("text-xs", stale ? "text-badge-amber-foreground" : "text-muted-foreground")}>{detail}</span>
		</>
	);
}

/* -------------------------------------------------------------------------- */
/* Table alternative                                                          */
/* -------------------------------------------------------------------------- */

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
						Values every {timeWindow.tableMinutes >= 60 ? `${timeWindow.tableMinutes / 60} h` : `${timeWindow.tableMinutes} min`}, newest first.
						Lab results show in the interval they resulted in.
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
									<td className='px-3 py-2 whitespace-nowrap text-muted-foreground'>{eventKinds[event.kind].label}</td>
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
 * The patient's Timeline (PRD PD-030): an events lane, then the Monitor, Pump, Ventilator and Labs lanes on one time
 * axis over 6, 12 or 24 h, with dashed limits, gaps drawn as gaps and what's new since the clinician last looked
 * shaded. Each lane's value at the right is the latest, or the crosshair's.
 */
function TimelineSection({ timeline, lastViewedAt }: TimelineSectionProps) {
	const now = useCurrentMinute();
	const [windowId, setWindowId] = React.useState<TimelineWindow["id"]>("6");
	const [showTable, setShowTable] = React.useState(false);
	const [cursor, setCursor] = React.useState<number | null>(null);
	const [announcement, setAnnouncement] = React.useState("");
	const [width, setWidth] = React.useState(0);
	const plotRef = React.useRef<HTMLDivElement>(null);
	const summaryId = React.useId();

	const timeWindow = windows.find((item) => item.id === windowId) ?? windows[0];
	// Before the first client render there's no clock; the latest reading stands in for it.
	const end =
		now ??
		Math.max(...timeline.lanes.flatMap((lane) => lane.points.map(time)), ...timeline.events.map(time), 0);
	const start = end - timeWindow.hours * HOUR;

	React.useEffect(() => {
		const element = plotRef.current;
		if (!element) return;
		const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
		observer.observe(element);
		return () => observer.disconnect();
	}, [showTable]);

	// A new window drops the crosshair, which may be outside it.
	React.useEffect(() => setCursor(null), [windowId]);

	const frame: Frame = {
		start,
		end,
		width,
		ticks: hourTicks(start, end, timeWindow.tickHours),
		lastViewed: lastViewedAt ? Date.parse(lastViewedAt) : undefined,
		cursor,
		x: (at) => ((at - start) / (end - start)) * width,
	};
	const lastViewedX = frame.lastViewed !== undefined && frame.lastViewed > start ? frame.x(frame.lastViewed) : undefined;
	const windowEvents = timeline.events.filter((event) => time(event) >= start - 10 * MINUTE && time(event) <= end);
	const at = cursor ?? end;
	// The "Since you last looked" label sits on the axis; hour labels under it give way.
	// It reads to the right of its line, or to the left when the line is near now.
	const sinceLabelShown = cursor === null && lastViewedX !== undefined && Math.max(lastViewedX, width - lastViewedX) > 150;
	const sinceLabelLeft = lastViewedX !== undefined && width - lastViewedX < 150;
	const underSinceLabel = (x: number) =>
		sinceLabelShown &&
		lastViewedX !== undefined &&
		(sinceLabelLeft ? x > lastViewedX - 150 && x < lastViewedX + 20 : x > lastViewedX - 20 && x < lastViewedX + 150);

	const readout = (moment: number) =>
		`${formatTime(new Date(moment).toISOString())}: ${timeline.lanes
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
	const summary = `Last ${timeWindow.hours} hours. ${timeline.lanes
		.map((lane) => {
			const values = lane.points
				.filter((point) => time(point) >= start && time(point) <= end)
				.flatMap((point) => (point.value === null ? [] : [point.value]));
			const latest = valueAt(lane, end)?.value;
			if (!values.length) return `${lane.label}: no readings in this window.`;
			const [min, max] = [Math.min(...values), Math.max(...values)];
			if (values.length === 1) return `${lane.label} ${min} ${lane.unit}, one reading.`;
			return min === max
				? `${lane.label} ${min} ${lane.unit} throughout.`
				: `${lane.label} ${min} to ${max} ${lane.unit}, latest ${latest ?? "none"}.`;
		})
		.join(" ")} ${windowEvents.length} events.`;

	return (
		<div className='@container'>
			<SectionCard
				title='Timeline'
				action={
					<div className='flex items-center gap-4'>
						<Switch size='sm' label='Show as table' checked={showTable} onCheckedChange={setShowTable} />
						<Tabs value={windowId} onValueChange={(value) => setWindowId(value as TimelineWindow["id"])}>
							<TabsList aria-label='Time window'>
								{windows.map((item) => (
									<TabsTrigger key={item.id} value={item.id}>
										{item.label}
									</TabsTrigger>
								))}
							</TabsList>
						</Tabs>
					</div>
				}
			>
				{!timeline.lanes.length ? (
					<NoData>No values recorded for this patient yet.</NoData>
				) : showTable ? (
					<TimelineTable timeline={timeline} timeWindow={timeWindow} start={start} end={end} />
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
							{/* Axis: hour ticks, where "since you last looked" starts, and the crosshair's time. */}
							<div className={cn(rowColumns, "border-b border-border")}>
								<div />
								<div ref={plotRef} className='relative h-8'>
									{width ? (
										<svg width={width} height={32} aria-hidden='true' className='block overflow-hidden'>
											{lastViewedX !== undefined ? (
												<>
													<rect x={lastViewedX} y={0} width={width - lastViewedX} height={32} className='fill-info-subtle' />
													<line x1={lastViewedX} x2={lastViewedX} y1={0} y2={32} strokeDasharray='3 3' className='stroke-info' />
												</>
											) : null}
											{frame.ticks.map((tick) =>
												frame.x(tick) > 16 && frame.x(tick) < width - 16 && !underSinceLabel(frame.x(tick)) ? (
													<text
														key={tick}
														x={frame.x(tick)}
														y={20}
														textAnchor='middle'
														className='fill-muted-foreground font-mono text-[11px]'
													>
														{hourFormat.format(tick)}
													</text>
												) : null,
											)}
										</svg>
									) : null}
									{sinceLabelShown ? (
										<span
											className='absolute top-1.5 rounded-sm bg-card px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap text-info'
											style={sinceLabelLeft ? { right: width - (lastViewedX ?? 0) + 4 } : { left: (lastViewedX ?? 0) + 4 }}
										>
											Since you last looked
										</span>
									) : null}
									{cursor !== null ? (
										<span
											className='absolute top-1 -translate-x-1/2 rounded-sm bg-foreground px-1.5 py-0.5 font-mono text-[11px] text-background tabular-nums'
											style={{ left: Math.min(Math.max(frame.x(cursor), 32), width - 32) }}
										>
											{formatTime(new Date(cursor).toISOString())}
										</span>
									) : null}
								</div>
								<div className='flex items-center justify-end px-3 text-xs text-muted-foreground'>
									{cursor === null ? "Now" : "At crosshair"}
								</div>
							</div>

							<div className={cn(rowColumns, "border-b border-border")}>
								<div className='flex items-center px-3 text-sm font-semibold text-foreground'>Events</div>
								<div>{width ? <EventsPlot events={windowEvents} frame={frame} /> : null}</div>
								<div className='flex items-center justify-end px-3 text-xs text-muted-foreground'>
									{windowEvents.length} {windowEvents.length === 1 ? "event" : "events"}
								</div>
							</div>

							{groups.map((group) => {
								const lanes = timeline.lanes.filter((lane) => lane.group === group.id);
								if (!lanes.length) return null;
								return (
									<React.Fragment key={group.id}>
										<div className='border-b border-border bg-background-subtle px-3 py-1 text-xs font-medium text-muted-foreground'>
											{group.label}
										</div>
										{lanes.map((lane) => (
											<div key={lane.id} className={cn(rowColumns, "border-b border-border-muted last:border-b-0")}>
												<div className='flex min-w-0 flex-col justify-center px-3'>
													{/* The name in text color for contrast; the swatch ties it to the lane's color. */}
													<span className='flex items-center gap-1.5 text-sm font-semibold text-foreground'>
														<span aria-hidden='true' className={cn("h-0.5 w-2.5 shrink-0 rounded-full bg-current", laneColors[lane.color])} />
														{lane.label}
													</span>
													<span className='truncate pl-4 text-xs text-muted-foreground'>{lane.unit}</span>
												</div>
												<div>{width ? <LanePlot lane={lane} frame={frame} /> : null}</div>
												<div className='flex flex-col items-end justify-center px-3 text-right whitespace-nowrap'>
													<LaneValue lane={lane} at={at} live={cursor === null} now={end} />
												</div>
											</div>
										))}
									</React.Fragment>
								);
							})}
						</div>

						<ul aria-label='Legend' className='flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground'>
							{Object.entries(eventKinds).map(([kind, item]) => (
								<li key={kind} className='flex items-center gap-1.5'>
									<span
										aria-hidden='true'
										className={cn("size-2", kind === "alert" ? "rotate-45" : "rounded-[2px]", item.className)}
									/>
									{item.label}
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
			</SectionCard>
		</div>
	);
}

export {
	TimelineSection,
	type PatientTimeline,
	type TimelineEvent,
	type TimelineEventKind,
	type TimelineLane,
	type TimelineLaneColor,
	type TimelineLaneGroup,
	type TimelinePoint,
	type TimelineSectionProps,
};
