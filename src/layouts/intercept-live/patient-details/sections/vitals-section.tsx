import * as React from "react";

import type { MonitorVitals } from "@/components/cards/patient-monitoring-card";
import { Tabs, TabsList, TabsTrigger } from "@/components/navigation/tabs";
import { useCurrentMinute } from "@/lib/hooks/use-current-minute";
import { cn } from "@/lib/utils";

import type { PatientMonitorData } from "../patient-details";
import { formatElapsed, formatTime, NoData, SectionCard } from "../section-parts";

// Patient details › Vitals: each vital sign's latest value with its source, age and recent trend, then the hourly
// flowsheet. Live monitor values replace the charted ones on the tiles when the patient is on Monitoring. Out-of-limit
// values carry a glyph and words, and the flowsheet marks them with a neutral wash, never a severity color (PRD SV-073).

/* -------------------------------------------------------------------------- */
/* Data shapes (the app's API fills these)                                    */
/* -------------------------------------------------------------------------- */

type VitalParameter = "hr" | "bp" | "map" | "spo2" | "rr" | "temp" | "etco2";

/** One charted value. For BP, `value` is the systolic and `diastolic` the diastolic. */
type VitalReading = { at: string; value: number; diastolic?: number };

type VitalSeries = {
	parameter: VitalParameter;
	/** Where the values come from, e.g. "Monitor", "Manual · Kevin Ortiz, RN", "Capnography". */
	source: string;
	/** Alarm limits as [low, high]; for BP, the systolic's. */
	limits?: [number, number];
	/** Past this age the latest value is Stale: kept, dimmed, with its age (PRD PD-120). */
	staleAfterMinutes: number;
	/** How often it's charted. A longer stretch without a reading is a gap, drawn as one (PRD PD-031). */
	chartedEveryMinutes: number;
	/** Oldest first. A time with no reading is missing, never zero. */
	readings: VitalReading[];
};

type PatientVitals = { series: VitalSeries[] };

type VitalsSectionProps = {
	vitals: PatientVitals;
	/** The live bedside values, when the patient is on Monitoring. They replace the charted values on the tiles. */
	monitor?: PatientMonitorData;
};

/* -------------------------------------------------------------------------- */
/* Product content                                                            */
/* -------------------------------------------------------------------------- */

// One color per parameter, the monitor's where it has one (PRD SV-072), so a value reads the same on every surface.
const parameters: Record<VitalParameter, { label: string; name: string; unit: string; color: string; digits?: number }> = {
	hr: { label: "HR", name: "Heart rate", unit: "bpm", color: "text-monitor-ecg-ink" },
	bp: { label: "BP", name: "Blood pressure", unit: "mmHg", color: "text-monitor-abp-ink" },
	map: { label: "MAP", name: "Mean arterial pressure", unit: "mmHg", color: "text-monitor-abp-ink" },
	spo2: { label: "SpO₂", name: "Oxygen saturation", unit: "%", color: "text-monitor-spo2-ink" },
	rr: { label: "RR", name: "Respiratory rate", unit: "/min", color: "text-monitor-resp-ink" },
	temp: { label: "Temp", name: "Temperature", unit: "°C", color: "text-foreground", digits: 1 },
	etco2: { label: "EtCO₂", name: "End-tidal CO₂", unit: "mmHg", color: "text-foreground" },
};

// Tiles show BP with its MAP, so MAP has no tile of its own; the flowsheet keeps it as a row.
const tileOrder: VitalParameter[] = ["hr", "bp", "spo2", "rr", "temp", "etco2"];
const rowOrder: VitalParameter[] = ["hr", "bp", "map", "spo2", "rr", "temp", "etco2"];

const windows = [
	{ value: "12", label: "12 h" },
	{ value: "24", label: "24 h" },
] as const;

const HOUR = 60 * 60_000;
// The sparklines show the last 6 hours.
const SPARK_WINDOW = 6 * HOUR;

const formatValue = (parameter: VitalParameter, value: number) => value.toFixed(parameters[parameter].digits ?? 0);

/** Where a value sits against its limits. */
function limitState(value: number | undefined, limits?: [number, number]) {
	if (value === undefined || !limits) return undefined;
	if (value > limits[1]) return { glyph: "↑", words: `Above ${limits[1]}` };
	if (value < limits[0]) return { glyph: "↓", words: `Below ${limits[0]}` };
	return undefined;
}

/** The live value for a parameter, when the monitor has one. */
function liveReading(parameter: VitalParameter, vitals?: MonitorVitals): Omit<VitalReading, "at"> | undefined {
	if (!vitals) return undefined;
	switch (parameter) {
		case "hr":
			return vitals.hr === undefined ? undefined : { value: vitals.hr };
		case "spo2":
			return vitals.spo2 === undefined ? undefined : { value: vitals.spo2 };
		case "rr":
			return vitals.rr === undefined ? undefined : { value: vitals.rr };
		case "map":
			return vitals.map === undefined ? undefined : { value: vitals.map };
		case "bp":
			return vitals.systolic === undefined ? undefined : { value: vitals.systolic, diastolic: vitals.diastolic };
		default:
			return undefined;
	}
}

/* -------------------------------------------------------------------------- */
/* Sparkline                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The last hours of a series as a small line, scaled to its own values so a change shows. A limit inside that range is
 * a dashed line. A stretch longer than the series' charting interval is left as a gap, never joined. Decorative: the
 * tile's words carry the trend for screen readers.
 */
function Sparkline({ series, now, className }: { series: VitalSeries; now: number; className?: string }) {
	const from = now - SPARK_WINDOW;
	const points = series.readings.filter((reading) => Date.parse(reading.at) >= from);
	if (points.length < 2) return <div aria-hidden='true' className={cn("h-8", className)} />;

	const values = points.map((point) => point.value);
	const spread = Math.max(...values) - Math.min(...values) || 1;
	// A little room above and below, so the line never sits on the edge.
	const min = Math.min(...values) - spread * 0.15;
	const max = Math.max(...values) + spread * 0.15;
	const x = (at: string) => ((Date.parse(at) - from) / SPARK_WINDOW) * 100;
	const y = (value: number) => 31 - ((value - min) / (max - min)) * 30;
	const limits = (series.limits ?? []).filter((limit) => limit > min && limit < max);

	// Split into runs wherever a reading is missing.
	const runs: VitalReading[][] = [];
	points.forEach((point, index) => {
		const previous = points[index - 1];
		const gap = previous && Date.parse(point.at) - Date.parse(previous.at) > series.chartedEveryMinutes * 60_000 * 1.5;
		if (!previous || gap) runs.push([point]);
		else runs[runs.length - 1].push(point);
	});

	return (
		<svg aria-hidden='true' viewBox='0 0 100 32' preserveAspectRatio='none' className={cn("h-8 w-full", className)}>
			{limits.map((limit) => (
				<line
					key={limit}
					x1='0'
					x2='100'
					y1={y(limit)}
					y2={y(limit)}
					strokeWidth='1'
					strokeDasharray='3 3'
					vectorEffect='non-scaling-stroke'
					className='stroke-border-defined'
				/>
			))}
			{runs.map((run) =>
				run.length === 1 ? (
					<circle key={run[0].at} cx={x(run[0].at)} cy={y(run[0].value)} r='1.5' className='fill-current' />
				) : (
					<polyline
						key={run[0].at}
						points={run.map((point) => `${x(point.at)},${y(point.value)}`).join(" ")}
						fill='none'
						stroke='currentColor'
						strokeWidth='1.5'
						strokeLinejoin='round'
						vectorEffect='non-scaling-stroke'
					/>
				),
			)}
		</svg>
	);
}

/* -------------------------------------------------------------------------- */
/* Tiles                                                                      */
/* -------------------------------------------------------------------------- */

/** "↑ Above 120": a value outside its limits, in a glyph and words. */
function LimitTag({ state }: { state: NonNullable<ReturnType<typeof limitState>> }) {
	return (
		<span className='inline-flex items-center gap-0.5 rounded-sm bg-neutral-muted px-1 text-xs font-semibold text-foreground'>
			<span aria-hidden='true'>{state.glyph}</span>
			{state.words}
		</span>
	);
}

/**
 * One parameter's latest value: the live monitor value when there is one, otherwise the last charted reading. Says
 * where it's from and how old it is; a stale value stays, dimmed, with its age.
 */
function VitalTile({
	series,
	mapSeries,
	monitor,
	now,
}: {
	series: VitalSeries;
	mapSeries?: VitalSeries;
	monitor?: PatientMonitorData;
	now: number | null;
}) {
	const { parameter } = series;
	const meta = parameters[parameter];
	const live = liveReading(parameter, monitor?.vitals);
	const charted = series.readings.at(-1);
	const reading = live ?? charted;
	const mapValue = parameter === "bp" ? (liveReading("map", monitor?.vitals) ?? mapSeries?.readings.at(-1))?.value : undefined;
	const ageMinutes = !live && charted && now !== null ? (now - Date.parse(charted.at)) / 60_000 : undefined;
	const stale = ageMinutes !== undefined && ageMinutes > series.staleAfterMinutes;
	const state = limitState(reading?.value, series.limits);
	const mapState = limitState(mapValue, mapSeries?.limits);
	const first = now !== null ? series.readings.find((item) => Date.parse(item.at) >= now - SPARK_WINDOW) : undefined;

	return (
		<li className='flex min-w-0 flex-col gap-1.5 rounded-lg bg-background-subtle px-3 py-2.5'>
			<div className='flex items-baseline justify-between gap-2 text-xs'>
				<span className={cn("font-semibold", meta.color)}>
					<abbr title={meta.name} className='no-underline'>
						{meta.label}
					</abbr>
				</span>
				<span className='text-muted-foreground'>{meta.unit}</span>
			</div>

			{reading ? (
				<p className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-1", stale && "opacity-60")}>
					<span className='text-3xl font-semibold text-foreground tabular-nums'>
						{formatValue(parameter, reading.value)}
						{reading.diastolic !== undefined ? `/${reading.diastolic}` : null}
					</span>
					{mapValue !== undefined ? (
						<span className='text-sm text-muted-foreground tabular-nums'>
							MAP <span className='font-semibold text-foreground'>{mapValue}</span>
						</span>
					) : null}
				</p>
			) : (
				<p className='text-3xl font-semibold text-muted-foreground'>--</p>
			)}

			{state || mapState ? (
				<p className='flex flex-wrap gap-1'>
					{state ? <LimitTag state={state} /> : null}
					{mapState ? <LimitTag state={{ ...mapState, words: `MAP ${mapState.words.toLowerCase()}` }} /> : null}
				</p>
			) : null}

			{now !== null ? <Sparkline series={series} now={now} className={cn("mt-auto", meta.color)} /> : null}
			{first && reading && now !== null ? (
				<span className='sr-only'>
					{`${formatValue(parameter, first.value)} six hours ago, ${formatValue(parameter, reading.value)} now.`}
				</span>
			) : null}

			<p className='text-xs text-muted-foreground'>
				{live ? (
					<span className='inline-flex items-center gap-1.5'>
						<span aria-hidden='true' className='size-1.5 rounded-full bg-success' />
						Live · {series.source}
					</span>
				) : charted ? (
					<>
						{series.source}
						{now !== null ? ` · ${formatElapsed(charted.at, now)}` : null}
						{stale ? <span className='font-semibold text-badge-amber-foreground'> · Stale</span> : null}
					</>
				) : (
					`No ${meta.name.toLowerCase()} recorded`
				)}
			</p>
		</li>
	);
}

/* -------------------------------------------------------------------------- */
/* Flowsheet                                                                  */
/* -------------------------------------------------------------------------- */

/** The latest reading in each hour, by the hour's start time. */
function byHour(readings: VitalReading[]) {
	const buckets = new Map<number, VitalReading>();
	for (const reading of readings) {
		const time = Date.parse(reading.at);
		buckets.set(time - (time % HOUR), reading);
	}
	return buckets;
}

/**
 * The hourly flowsheet: one row per parameter, one column per hour, oldest on the left and newest on the right, as on
 * the Timeline and the sparklines, so time always runs the same way. It opens scrolled to the newest hour, with the
 * parameter column pinned. Each cell is the last value charted in that hour.
 */
function Flowsheet({ series, now }: { series: VitalSeries[]; now: number }) {
	const [hours, setHours] = React.useState<(typeof windows)[number]["value"]>("12");
	const scrollRef = React.useRef<HTMLDivElement>(null);
	const currentHour = now - (now % HOUR);
	const columns = Array.from({ length: Number(hours) }, (_, index) => currentHour - (Number(hours) - 1 - index) * HOUR);
	const rows = rowOrder
		.map((parameter) => series.find((item) => item.parameter === parameter))
		.filter((item): item is VitalSeries => Boolean(item))
		.map((item) => ({ series: item, buckets: byHour(item.readings) }));

	React.useLayoutEffect(() => {
		const scroller = scrollRef.current;
		if (scroller) scroller.scrollLeft = scroller.scrollWidth;
	}, [hours]);

	return (
		<SectionCard
			title='Flowsheet'
			meta='Hourly · newest on the right'
			action={
				<Tabs value={hours} onValueChange={(value) => setHours(value as typeof hours)}>
					<TabsList aria-label='Flowsheet window'>
						{windows.map((window) => (
							<TabsTrigger key={window.value} value={window.value}>
								{window.label}
							</TabsTrigger>
						))}
					</TabsList>
				</Tabs>
			}
		>
			{/* Focusable, so the table scrolls from the keyboard. */}
			<div
				ref={scrollRef}
				tabIndex={0}
				className='-mx-4 -mb-4 overflow-x-auto rounded-b-card outline-none focus-visible:ring-2 focus-visible:ring-ring'
			>
				<table className='w-full border-separate border-spacing-0 text-sm'>
					<caption className='sr-only'>
						Vital signs, the last value charted each hour for the last {hours} hours, oldest first. Values outside their
						limits say above or below.
					</caption>
					<thead>
						<tr>
							<th
								scope='col'
								className='sticky left-0 z-10 min-w-36 border-y border-border-muted bg-card px-4 py-2 text-left text-xs font-medium text-muted-foreground'
							>
								Parameter
							</th>
							{columns.map((hour) => (
								<th
									key={hour}
									scope='col'
									className='min-w-18 border-y border-border-muted px-2 py-2 text-right text-xs font-medium whitespace-nowrap text-muted-foreground tabular-nums last:pr-4'
								>
									{hour === currentHour ? <span className='block text-foreground'>Now</span> : null}
									{formatTime(new Date(hour).toISOString())}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{rows.map(({ series: item, buckets }) => {
							const meta = parameters[item.parameter];
							return (
								<tr key={item.parameter}>
									<th
										scope='row'
										className='sticky left-0 z-10 border-b border-border-muted bg-card px-4 py-2 text-left font-normal'
									>
										<span className={cn("block text-sm font-semibold", meta.color)}>{meta.label}</span>
										<span className='block text-xs whitespace-nowrap text-muted-foreground'>
											{meta.unit} · {item.source}
										</span>
									</th>
									{columns.map((hour) => {
										const reading = buckets.get(hour);
										const state = limitState(reading?.value, item.limits);
										return (
											<td
												key={hour}
												className={cn(
													"border-b border-border-muted px-2 py-2 text-right whitespace-nowrap tabular-nums last:pr-4",
													state && "bg-neutral-subtle font-semibold",
													!reading && "text-muted-foreground",
												)}
											>
												{reading ? (
													<>
														{state ? <span aria-hidden='true'>{state.glyph} </span> : null}
														{formatValue(item.parameter, reading.value)}
														{reading.diastolic !== undefined ? `/${reading.diastolic}` : null}
														{state ? <span className='sr-only'>, {state.words.toLowerCase()}</span> : null}
													</>
												) : (
													<>
														<span aria-hidden='true'>--</span>
														<span className='sr-only'>No value</span>
													</>
												)}
											</td>
										);
									})}
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</SectionCard>
	);
}

/* -------------------------------------------------------------------------- */
/* VitalsSection                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Patient details › Vitals: the latest value of each vital sign, with its source, age, limits and last 6 hours, then
 * the hourly flowsheet.
 */
function VitalsSection({ vitals, monitor }: VitalsSectionProps) {
	const now = useCurrentMinute();
	const seriesFor = (parameter: VitalParameter) => vitals.series.find((item) => item.parameter === parameter);
	const tiles = tileOrder.map(seriesFor).filter((item): item is VitalSeries => Boolean(item));

	return (
		<div className='flex flex-col gap-6 @container'>
			<SectionCard
				title='Latest values'
				meta={
					monitor?.vitals ? (
						<>
							<span aria-hidden='true' className='size-2 rounded-full bg-success' />
							Live · Monitor
						</>
					) : (
						"Last 6 h trend on each"
					)
				}
			>
				{tiles.length ? (
					<ul className='grid grid-cols-2 gap-2 @min-[40rem]:grid-cols-3 @min-[80rem]:grid-cols-6'>
						{tiles.map((series) => (
							<VitalTile
								key={series.parameter}
								series={series}
								mapSeries={series.parameter === "bp" ? seriesFor("map") : undefined}
								monitor={monitor}
								now={now}
							/>
						))}
					</ul>
				) : (
					<NoData>No vital signs recorded for this patient.</NoData>
				)}
			</SectionCard>

			{vitals.series.length && now !== null ? <Flowsheet series={vitals.series} now={now} /> : null}
		</div>
	);
}

export {
	VitalsSection,
	type PatientVitals,
	type VitalParameter,
	type VitalReading,
	type VitalSeries,
	type VitalsSectionProps,
};
