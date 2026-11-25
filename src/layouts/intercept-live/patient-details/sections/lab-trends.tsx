import * as React from "react";
import { Maximize2Icon, PlusIcon } from "lucide-react";

import { Button } from "@/components/buttons/button";
import { labTileFlags } from "@/components/data-display/lab-tile";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/data-display/table";
import { Checkbox } from "@/components/forms/checkbox";
import { SearchInput } from "@/components/forms/search-input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/overlays/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/overlays/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/overlays/tooltip";
import { useCurrentMinute } from "@/lib/hooks/use-current-minute";
import { cn } from "@/lib/utils";

import { SegmentedToggle, type ToggleOption } from "../../monitoring/view-controls";
import { formatDateTime, formatTime } from "../section-parts";
import type { ChartResult, ChartResultFlag, PatientChart } from "./chart-section";

// Lab trends (PRD Patient details — Labs; Intercept-Live `320:9153`, Nov 25, 2026; an exploration until then, its
// artifact in explorations/index.md): one card under the Labs tab's key labs, the chart of the picked tests, in Actual
// values or Relative change, and under it a legend of the suggested tests, each a toggle that shows or hides its line
// (shadcn's chart legend), with Add test for any other test.
//
// Data integrity: only resulted numeric values are points (pending, cancelled and qualitative results never are); a
// point's flag is the lab's own, never worked out here; relative change is measured from a test's first result in the
// window and never from a zero or negative one; lines join real results only.

type LabTrendPoint = { at: string; value: string; resultedAt?: string; flag?: ChartResultFlag; note?: string };
type LabTrendBaseline = { value: number; label: string };
type LabTrendEvent = { id: string; at: string; label: string };
type PatientLabTrends = {
	history?: Record<string, LabTrendPoint[]>;
	baselines?: Record<string, LabTrendBaseline>;
	events?: LabTrendEvent[];
};
/** `show` charts the test alone in Actual values (Overview lab tile); `add` adds it (Results table's View trend). */
/**
 * `show` charts the test alone (an Overview key lab), `toggle` adds or removes it from the tiles' view (a Labs key lab;
 * the last one off puts back what was shown before), `add` adds it.
 */
type LabTrendsRequest = { test: string; action: "show" | "toggle" | "add"; id: number };

/** Which tests follow which kind of problem, for the first pick. ⚠️ Proposed, for clinical review. */
const labTrendProfiles: { id: string; label: string; match: RegExp; tests: string[] }[] = [
	{
		id: "sepsis",
		label: "sepsis",
		match: /seps|septic/i,
		tests: ["Lactate", "WBC", "Procalcitonin", "Creatinine", "Platelets", "Bilirubin"],
	},
	{
		id: "dka",
		label: "DKA",
		match: /ketoacidosis|\bDKA\b/i,
		tests: ["Glucose", "Anion gap", "Bicarbonate", "Potassium", "Beta-hydroxybutyrate", "pH, venous"],
	},
	{
		id: "cardiac",
		label: "heart failure",
		match: /heart failure|cardiogenic|cardiomyopathy|STEMI|myocard/i,
		tests: ["Troponin I", "BNP", "NT-proBNP", "Lactate", "Creatinine", "Potassium", "Magnesium"],
	},
	{
		id: "kidney",
		label: "kidney injury",
		match: /kidney|renal|\bAKI\b|dialysis/i,
		tests: ["Creatinine", "BUN", "Potassium", "Bicarbonate", "eGFR"],
	},
	{
		id: "respiratory",
		label: "breathing",
		match: /ARDS|respiratory|COPD|asthma|pneumonia|influenza/i,
		tests: ["pH", "PaCO₂", "PaO₂", "HCO₃"],
	},
	{ id: "bleeding", label: "bleeding", match: /bleed|hemorrhag/i, tests: ["Hemoglobin", "Platelets", "INR", "Fibrinogen"] },
	{ id: "ecmo", label: "ECMO", match: /ECMO/i, tests: ["Hemoglobin", "Platelets", "Anti-Xa", "Fibrinogen", "LDH"] },
	{ id: "stroke", label: "stroke", match: /stroke|PRES/i, tests: ["Glucose", "Sodium", "INR", "Platelets"] },
	{ id: "sodium", label: "sodium", match: /natremia/i, tests: ["Sodium"] },
	{ id: "rhythm", label: "arrhythmia", match: /atrial fibrillation|arrhythmia/i, tests: ["Potassium", "Magnesium", "TSH"] },
	{ id: "diabetes", label: "diabetes", match: /diabetes/i, tests: ["Glucose"] },
];

const maxSelected = 6;
const defaultCount = 3;
type TrendWindowId = "24h" | "48h" | "7d" | "encounter";
const trendWindows: { id: TrendWindowId; label: string; minutes?: number }[] = [
	{ id: "24h", label: "24h", minutes: 24 * 60 },
	{ id: "48h", label: "48h", minutes: 48 * 60 },
	{ id: "7d", label: "7d", minutes: 7 * 24 * 60 },
	{ id: "encounter", label: "Encounter" },
];
type TrendMode = "actual" | "relative";
/** By the slot a test took when picked: categorical colors (never severity), plus a dash so color isn't the only cue. */
const seriesStyles: { color: string; dash?: string }[] = [
	{ color: "text-chart-1" },
	{ color: "text-chart-3" },
	{ color: "text-chart-5" },
	{ color: "text-chart-4", dash: "7 4" },
	{ color: "text-chart-2", dash: "7 4" },
	{ color: "text-foreground", dash: "2 3" },
];
const MINUTE = 60_000;

function parseRange(range: string | undefined): { low?: number; high?: number } | undefined {
	if (!range) return undefined;
	const between = range.match(/^\s*(-?\d+(?:\.\d+)?)\s*[–-]\s*(-?\d+(?:\.\d+)?)\s*$/);
	if (between) return { low: Number(between[1]), high: Number(between[2]) };
	const under = range.match(/^\s*under\s+(\d+(?:\.\d+)?)\s*$/i);
	if (under) return { high: Number(under[1]) };
	const over = range.match(/^\s*over\s+(\d+(?:\.\d+)?)\s*$/i);
	if (over) return { low: Number(over[1]) };
	return undefined;
}
const decimalsOf = (value: string) => value.match(/\.(\d+)/)?.[1].length ?? 0;
const toNumber = (value: string | undefined) =>
	value === undefined || !/^\s*-?[\d,]*\.?\d+\s*$/.test(value) ? Number.NaN : Number.parseFloat(value.replace(/,/g, ""));

type Point = { at: number; value: number; text: string; collectedAt?: string; resultedAt?: string; flag?: ChartResultFlag; note?: string };
type LabTest = {
	name: string;
	panel: string;
	unit?: string;
	rangeText?: string;
	range?: { low?: number; high?: number };
	points: Point[];
	baseline?: LabTrendBaseline;
	latest: ChartResult;
};

function labTests(chart: PatientChart, trends: PatientLabTrends | undefined): LabTest[] {
	const tests: LabTest[] = [];
	for (const panel of chart.panels) {
		for (const result of panel.results) {
			const points: Point[] = [];
			for (const point of trends?.history?.[result.name] ?? []) {
				const value = toNumber(point.value);
				if (Number.isNaN(value)) continue;
				points.push({
					at: Date.parse(point.at),
					value,
					text: point.value,
					collectedAt: point.at,
					resultedAt: point.resultedAt,
					flag: point.flag,
					note: point.note,
				});
			}
			const previous = toNumber(result.previous?.value);
			if (result.previous && !Number.isNaN(previous)) {
				points.push({
					at: Date.parse(result.previous.at),
					value: previous,
					text: result.previous.value,
					resultedAt: result.previous.at,
					flag: result.previous.flag,
				});
			}
			const value = toNumber(result.value);
			const resulted = result.value !== undefined && result.status !== "pending" && result.status !== "none";
			if (resulted && !Number.isNaN(value) && (result.resultedAt || result.collectedAt)) {
				points.push({
					at: Date.parse(result.collectedAt ?? result.resultedAt!),
					value,
					text: result.value!,
					collectedAt: result.collectedAt,
					resultedAt: result.resultedAt,
					flag: result.flag,
					note: result.status === "corrected" ? `Corrected${result.original ? `, first reported ${result.original}` : ""}` : undefined,
				});
			}
			if (!points.length) continue;
			points.sort((a, b) => a.at - b.at);
			tests.push({
				name: result.name,
				panel: panel.name,
				unit: result.unit,
				rangeText: result.range,
				range: parseRange(result.range),
				points,
				baseline: trends?.baselines?.[result.name],
				latest: result,
			});
		}
	}
	return tests;
}
const trendableTests = (chart: PatientChart, trends?: PatientLabTrends) => new Set(labTests(chart, trends).map((test) => test.name));

function suggestTests(conditions: string[], tests: LabTest[]) {
	const available = new Set(tests.map((test) => test.name));
	const kinds: string[] = [];
	const names: string[] = [];
	for (const condition of conditions) {
		for (const profile of labTrendProfiles) {
			if (!profile.match.test(condition) || kinds.includes(profile.label)) continue;
			const picked = profile.tests.filter((name) => available.has(name) && !names.includes(name));
			if (!picked.length) continue;
			kinds.push(profile.label);
			names.push(...picked);
		}
	}
	if (names.length) return { names, reason: `Suggested for ${listWords(kinds)}` };
	const flagged = tests
		.filter((test) => test.points.at(-1)?.flag)
		.sort((a, b) => outsideBy(b) - outsideBy(a))
		.map((test) => test.name);
	return { names: flagged.slice(0, 6), reason: "Flagged now" };
}
function outsideBy(test: LabTest) {
	const last = test.points.at(-1);
	if (!last || !test.range) return 0;
	const { low, high } = test.range;
	const span = low !== undefined && high !== undefined ? high - low : Math.abs(high ?? low ?? 1) || 1;
	if (low !== undefined && last.value < low) return (low - last.value) / span;
	if (high !== undefined && last.value > high) return (last.value - high) / span;
	return 0;
}
const listWords = (words: string[]) => (words.length < 2 ? (words[0] ?? "") : `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`);
function defaultSelection(suggested: string[], tests: LabTest[]) {
	const byName = new Map(tests.map((test) => [test.name, test]));
	const trending = suggested.filter((name) => (byName.get(name)?.points.length ?? 0) > 1);
	const rest = suggested.filter((name) => !trending.includes(name));
	return [...trending, ...rest].slice(0, defaultCount);
}
/** One unit, values within 3× of each other; a test without a unit shares with none. */
function compatible(tests: LabTest[]) {
	if (tests.length < 2) return true;
	const unit = tests[0].unit;
	if (!unit || tests.some((test) => test.unit !== unit)) return false;
	const peaks = tests.map((test) => Math.max(...test.points.map((point) => Math.abs(point.value)), 0.001));
	return Math.max(...peaks) / Math.min(...peaks) <= 3;
}
function changeFrom(point: Point, before: Point | undefined) {
	if (!before) return undefined;
	const decimals = Math.max(decimalsOf(point.text), decimalsOf(before.text));
	const delta = Number((point.value - before.value).toFixed(decimals));
	if (delta === 0) return { arrow: "", words: "No change", amount: "No change", before };
	return {
		arrow: delta > 0 ? "▲" : "▼",
		words: delta > 0 ? "Up" : "Down",
		amount: `${delta > 0 ? "+" : "−"}${Math.abs(delta).toFixed(decimals)}`,
		before,
	};
}
function formatPercent(value: number) {
	const rounded = Math.abs(value) >= 100 ? Math.round(value) : Math.round(value * 10) / 10;
	if (rounded === 0) return "0%";
	return `${rounded > 0 ? "+" : "−"}${Math.abs(rounded)}%`;
}
function niceStep(span: number, count: number) {
	const raw = span / Math.max(count, 1);
	const power = 10 ** Math.floor(Math.log10(raw || 1));
	const unit = raw / power;
	return (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10) * power;
}
function axis(values: number[], { floorAtZero }: { floorAtZero: boolean }) {
	if (!values.length) return { min: 0, max: 1, ticks: [0, 1], step: 1 };
	let min = Math.min(...values);
	let max = Math.max(...values);
	if (min === max) {
		min -= Math.abs(min) * 0.1 || 1;
		max += Math.abs(max) * 0.1 || 1;
	}
	const step = niceStep(max - min, 4);
	min = Math.floor(min / step) * step;
	max = Math.ceil(max / step) * step;
	if (floorAtZero && min < 0 && Math.min(...values) >= 0) min = 0;
	const ticks: number[] = [];
	for (let tick = min; tick <= max + step / 2; tick += step) ticks.push(Number(tick.toFixed(6)));
	return { min, max, ticks, step };
}
const tickLabel = (value: number, step: number) => value.toFixed(Math.max(0, -Math.floor(Math.log10(step || 1))));
const hourFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric" });
const dayFormat = new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric" });
function timeTicks(start: number, end: number) {
	const span = end - start;
	const hours = span <= 36 * 60 * MINUTE ? 6 : span <= 4 * 24 * 60 * MINUTE ? 12 : 24;
	const ticks: { at: number; label: string; day: boolean }[] = [];
	const first = new Date(start);
	first.setMinutes(0, 0, 0);
	first.setHours(Math.ceil((first.getHours() + 1) / hours) * hours);
	const every = span > 10 * 24 * 60 * MINUTE ? 2 : 1;
	for (let at = first.getTime(), index = 0; at <= end; at += hours * 60 * MINUTE, index++) {
		const date = new Date(at);
		const midnight = date.getHours() === 0;
		if (hours === 24 && index % every) continue;
		ticks.push({ at, label: midnight ? dayFormat.format(date) : hourFormat.format(date), day: midnight });
	}
	return ticks;
}

type SeriesStyle = (typeof seriesStyles)[number];
type Series = {
	test: LabTest;
	style: SeriesStyle;
	points: (Point & { y: number; index: number })[];
	start?: Point;
	missing?: "none-in-range" | "zero-start";
};
function seriesFor(test: LabTest, style: SeriesStyle, mode: TrendMode, start: number, end: number): Series {
	const inRange = test.points.map((point, index) => ({ ...point, index })).filter((point) => point.at >= start && point.at <= end);
	if (!inRange.length) return { test, style, points: [], missing: "none-in-range" };
	if (mode === "actual") return { test, style, points: inRange.map((point) => ({ ...point, y: point.value })) };
	const first = inRange[0];
	if (!(first.value > 0)) return { test, style, points: [], start: first, missing: "zero-start" };
	return {
		test,
		style,
		start: first,
		points: inRange.map((point) => ({ ...point, y: ((point.value - first.value) / first.value) * 100 })),
	};
}

type Hover = { test: string; index: number; at: number };
function useWidth<T extends HTMLElement>() {
	const ref = React.useRef<T>(null);
	const [width, setWidth] = React.useState(0);
	React.useLayoutEffect(() => {
		const element = ref.current;
		if (!element) return;
		setWidth(element.getBoundingClientRect().width);
		const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
		observer.observe(element);
		return () => observer.disconnect();
	}, []);
	return [ref, width] as const;
}
function SeriesSwatch({ style, className }: { style: SeriesStyle; className?: string }) {
	return (
		<svg aria-hidden='true' width={16} height={6} className={cn("shrink-0", style.color, className)}>
			<line x1={1} x2={15} y1={3} y2={3} className='stroke-current' strokeWidth={2.5} strokeDasharray={style.dash} strokeLinecap='round' />
		</svg>
	);
}

/** One chart of the picked tests, in Actual values or Relative change. Hover or arrow keys through the results. */
function TrendPlot({
	series,
	mode,
	start,
	end,
	height,
	events,
	highlighted,
	onHighlight,
	hover,
	onHover,
	label,
}: {
	series: Series[];
	mode: TrendMode;
	start: number;
	end: number;
	height: number;
	events: LabTrendEvent[];
	highlighted: string | null;
	onHighlight: (name: string | null) => void;
	hover: Hover | null;
	onHover: (hover: Hover | null) => void;
	label: string;
}) {
	const [ref, width] = useWidth<HTMLDivElement>();
	const drawn = series.filter((item) => item.points.length);
	// The end-of-line labels are 16px (user's call), so they take a wider gutter and 20px apart.
	const labelled = width >= 600;
	const gutter = { left: 48, right: labelled ? 196 : 16, top: 24, bottom: 6 };
	const plotRight = width - gutter.right;
	const plotHeight = height - gutter.top - gutter.bottom;
	const x = (at: number) => gutter.left + ((at - start) / (end - start || 1)) * (plotRight - gutter.left);
	const values = drawn.flatMap((item) => item.points.map((point) => point.y));
	if (mode === "relative") values.push(0);
	else
		for (const item of drawn) {
			if (item.test.range) {
				if (item.test.range.low !== undefined) values.push(item.test.range.low);
				if (item.test.range.high !== undefined) values.push(item.test.range.high);
			}
			if (item.test.baseline) values.push(item.test.baseline.value);
		}
	const domain = axis(values, { floorAtZero: mode === "actual" });
	const y = (value: number) => gutter.top + plotHeight - ((value - domain.min) / (domain.max - domain.min || 1)) * plotHeight;
	const unit = mode === "relative" ? "%" : drawn[0]?.test.unit;
	const all = drawn.flatMap((item) => item.points.map((point) => ({ item, point })));
	const ordered = [...all].sort((a, b) => a.point.at - b.point.at);
	const hovered = hover ? all.find(({ item, point }) => item.test.name === hover.test && point.index === hover.index) : undefined;
	const dim = (name: string) => (highlighted && highlighted !== name ? 0.2 : 1);
	const set = (found: (typeof all)[number] | undefined) => {
		onHover(found ? { test: found.item.test.name, index: found.point.index, at: found.point.at } : null);
		onHighlight(found ? found.item.test.name : null);
	};
	const pick = (event: React.PointerEvent<SVGSVGElement>) => {
		const rect = event.currentTarget.getBoundingClientRect();
		const px = event.clientX - rect.left;
		const py = event.clientY - rect.top;
		let best: (typeof all)[number] | undefined;
		let bestDistance = Infinity;
		for (const entry of all) {
			const distance = Math.hypot(x(entry.point.at) - px, (y(entry.point.y) - py) / 2);
			if (distance < bestDistance) {
				bestDistance = distance;
				best = entry;
			}
		}
		set(best && bestDistance < 40 ? best : undefined);
	};
	const onKeyDown = (event: React.KeyboardEvent) => {
		if (!ordered.length) return;
		if (event.key === "Escape") return set(undefined);
		if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
		event.preventDefault();
		const current = hovered ? ordered.findIndex((entry) => entry.item === hovered.item && entry.point === hovered.point) : -1;
		const next =
			event.key === "Home"
				? 0
				: event.key === "End"
					? ordered.length - 1
					: current < 0
						? ordered.length - 1
						: Math.min(ordered.length - 1, Math.max(0, current + (event.key === "ArrowRight" ? 1 : -1)));
		set(ordered[next]);
	};
	const labels = drawn.map((item) => ({ item, last: item.points.at(-1)!, y: y(item.points.at(-1)!.y) })).sort((a, b) => a.y - b.y);
	for (let index = 1; index < labels.length; index++) labels[index].y = Math.max(labels[index].y, labels[index - 1].y + 20);
	const ticks = timeTicks(start, end);
	const shownEvents = events.filter((event) => Date.parse(event.at) >= start && Date.parse(event.at) <= end);

	return (
		<div ref={ref} className='relative min-w-0'>
			{width ? (
				<>
					<div
						role='group'
						tabIndex={0}
						aria-label={`${label}. Left and right arrow keys step through the results; Escape clears.`}
						onKeyDown={onKeyDown}
						onBlur={() => set(undefined)}
						className='rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring'
					>
						<svg
							width={width}
							height={height}
							aria-hidden='true'
							className='block'
							onPointerMove={pick}
							onPointerLeave={() => set(undefined)}
						>
							{unit ? (
								<text x={4} y={10} className='fill-muted-foreground text-[11px]'>
									{unit}
								</text>
							) : null}
							{domain.ticks.map((tick) => (
								<g key={tick}>
									<line
										x1={gutter.left}
										x2={plotRight}
										y1={y(tick)}
										y2={y(tick)}
										className={mode === "relative" && tick === 0 ? "stroke-foreground-subtle" : "stroke-border"}
										strokeWidth={1}
									/>
									<text
										x={gutter.left - 8}
										y={y(tick)}
										dy='0.32em'
										textAnchor='end'
										className='fill-muted-foreground text-[11px] tabular-nums'
									>
										{mode === "relative" ? formatPercent(tick) : tickLabel(tick, domain.step)}
									</text>
								</g>
							))}
							{mode === "actual"
								? drawn.map(({ test, style }) => {
										if (!test.range) return null;
										const top = y(Math.min(test.range.high ?? domain.max, domain.max));
										const bottom = y(Math.max(test.range.low ?? domain.min, domain.min));
										return (
											<g key={`range-${test.name}`} className={drawn.length > 1 ? style.color : "text-foreground"} opacity={dim(test.name)}>
												<rect
													x={gutter.left}
													width={plotRight - gutter.left}
													y={top}
													height={Math.max(0, bottom - top)}
													className='fill-current opacity-[0.07]'
												/>
												{test.range.high !== undefined && test.range.high <= domain.max ? (
													<line
														x1={gutter.left}
														x2={plotRight}
														y1={top}
														y2={top}
														className='stroke-current opacity-30'
														strokeDasharray='3 3'
													/>
												) : null}
												{test.range.low !== undefined && test.range.low >= domain.min ? (
													<line
														x1={gutter.left}
														x2={plotRight}
														y1={bottom}
														y2={bottom}
														className='stroke-current opacity-30'
														strokeDasharray='3 3'
													/>
												) : null}
											</g>
										);
									})
								: null}
							{mode === "actual"
								? drawn.map(({ test }) =>
										test.baseline ? (
											<g key={`baseline-${test.name}`} opacity={dim(test.name)}>
												<line
													x1={gutter.left}
													x2={plotRight}
													y1={y(test.baseline.value)}
													y2={y(test.baseline.value)}
													className='stroke-foreground-subtle'
													strokeDasharray='8 4'
												/>
												<text x={gutter.left + 4} y={y(test.baseline.value) - 4} className='fill-muted-foreground text-[11px]'>
													{drawn.length > 1 ? `${test.name} baseline` : "Baseline"} {test.baseline.value} · {test.baseline.label}
												</text>
											</g>
										) : null,
									)
								: null}
							{shownEvents.map((event) => (
								<line
									key={event.id}
									x1={x(Date.parse(event.at))}
									x2={x(Date.parse(event.at))}
									y1={gutter.top}
									y2={height - gutter.bottom}
									className='stroke-icon-muted opacity-50'
									strokeDasharray='2 3'
								/>
							))}
							{hovered ? (
								<line
									x1={x(hovered.point.at)}
									x2={x(hovered.point.at)}
									y1={gutter.top}
									y2={height - gutter.bottom}
									className='stroke-foreground opacity-30'
								/>
							) : null}
							{drawn.map(({ test, style, points }) => (
								<g key={test.name} className={style.color} opacity={dim(test.name)}>
									<polyline
										points={points.map((point) => `${x(point.at)},${y(point.y)}`).join(" ")}
										className='fill-none stroke-current'
										strokeWidth={highlighted === test.name ? 3 : 2}
										strokeDasharray={style.dash}
										strokeLinejoin='round'
									/>
									{points.map((point) => {
										const active = hovered?.item.test === test && hovered.point.index === point.index;
										return (
											<g key={point.index}>
												{point.flag === "critical" ? (
													<circle
														cx={x(point.at)}
														cy={y(point.y)}
														r={active ? 9 : 7}
														className='fill-none stroke-severity-critical'
														strokeWidth={2}
													/>
												) : null}
												<circle
													cx={x(point.at)}
													cy={y(point.y)}
													r={active ? 6 : highlighted === test.name ? 4.5 : 3.5}
													strokeWidth={2}
													className={cn("stroke-current", point.flag ? "fill-current" : "fill-background")}
												/>
											</g>
										);
									})}
								</g>
							))}
							{labelled
								? labels.map(({ item, last, y: labelY }) => (
										<g key={`label-${item.test.name}`} opacity={dim(item.test.name)}>
											<line
												x1={plotRight + 6}
												x2={plotRight + 18}
												y1={labelY}
												y2={labelY}
												className={cn("stroke-current", item.style.color)}
												strokeWidth={2.5}
												strokeDasharray={item.style.dash}
											/>
											<text x={plotRight + 22} y={labelY} dy='0.32em' className='fill-foreground text-base'>
												<tspan className='font-semibold'>
													{item.test.name.length > 13 ? `${item.test.name.slice(0, 12)}…` : item.test.name}
												</tspan>{" "}
												<tspan className='fill-muted-foreground tabular-nums'>
													{mode === "relative" ? formatPercent(last.y) : last.text}
												</tspan>
											</text>
										</g>
									))
								: null}
						</svg>
					</div>
					{shownEvents.length ? (
						<TooltipProvider>
							<ul aria-label='Clinical events' className='absolute top-1 right-0 left-0 h-4'>
								{shownEvents.map((event) => (
									<li key={event.id}>
										<Tooltip>
											<TooltipTrigger asChild>
												<button
													type='button'
													aria-label={`${event.label}, ${formatDateTime(event.at)}`}
													className='absolute top-1 size-2.5 -translate-x-1/2 rotate-45 rounded-[2px] bg-icon-muted outline-none hover:bg-foreground focus-visible:ring-2 focus-visible:ring-ring'
													style={{ left: x(Date.parse(event.at)) }}
												/>
											</TooltipTrigger>
											<TooltipContent size='sm'>
												{event.label} · {formatDateTime(event.at)}
											</TooltipContent>
										</Tooltip>
									</li>
								))}
							</ul>
						</TooltipProvider>
					) : null}
					<div className='relative h-5' aria-hidden='true'>
						{ticks.map((tick) => (
							<span
								key={tick.at}
								className={cn(
									"absolute top-0.5 -translate-x-1/2 text-[11px] whitespace-nowrap",
									tick.day ? "font-semibold text-foreground" : "text-muted-foreground",
								)}
								style={{ left: x(tick.at) }}
							>
								{tick.label}
							</span>
						))}
					</div>
					{hovered ? (
						<PointDetails
							series={hovered.item}
							point={hovered.point}
							mode={mode}
							x={x(hovered.point.at)}
							y={y(hovered.point.y)}
							width={width}
						/>
					) : null}
				</>
			) : null}
		</div>
	);
}

function PointDetails({
	series,
	point,
	mode,
	x,
	y,
	width,
}: {
	series: Series;
	point: Series["points"][number];
	mode: TrendMode;
	x: number;
	y: number;
	width: number;
}) {
	const { test } = series;
	const change = changeFrom(point, test.points[point.index - 1]);
	const flag = point.flag ? labTileFlags[point.flag] : undefined;
	const flip = x > width * 0.6;
	return (
		<div
			role='status'
			className={cn(
				"pointer-events-none absolute z-10 w-60 rounded-lg border border-border bg-popover p-3 text-xs text-popover-foreground shadow-lg",
				flip && "-translate-x-full",
			)}
			style={{ left: flip ? x - 12 : x + 12, top: Math.max(0, y - 28) }}
		>
			<p className='flex items-center gap-1.5 text-muted-foreground'>
				<SeriesSwatch style={series.style} />
				{test.name}
			</p>
			<p className='mt-0.5 flex items-baseline gap-1'>
				<span
					className={cn("text-lg font-semibold tabular-nums", point.flag === "critical" ? "text-severity-critical" : "text-foreground")}
				>
					{point.text}
				</span>
				{test.unit ? <span className='text-muted-foreground'>{test.unit}</span> : null}
				<span className={cn("ml-1", flag ? cn("font-bold", flag.className) : "text-muted-foreground")}>
					{flag ? flag.label : "Not flagged"}
				</span>
			</p>
			<dl className='mt-2 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-muted-foreground'>
				<dt>{point.collectedAt ? "Collected" : "Resulted"}</dt>
				<dd className='text-foreground tabular-nums'>{formatDateTime(new Date(point.at).toISOString())}</dd>
				{change ? (
					<>
						<dt>Change</dt>
						<dd className='text-foreground tabular-nums'>
							{change.arrow ? <span aria-hidden='true'>{change.arrow} </span> : null}
							<span className='sr-only'>{change.words} </span>
							<span className='font-bold'>{change.amount}</span> from {change.before.text}
						</dd>
					</>
				) : null}
				{mode === "relative" && series.start ? (
					<>
						<dt>From start</dt>
						<dd className='text-foreground tabular-nums'>
							<span className='font-bold'>{formatPercent(point.y)}</span> from {series.start.text} (
							{formatDateTime(new Date(series.start.at).toISOString())})
						</dd>
					</>
				) : null}
				{test.rangeText ? (
					<>
						<dt>Range</dt>
						<dd className='text-foreground tabular-nums'>{test.rangeText}</dd>
					</>
				) : null}
			</dl>
			{point.note ? <p className='mt-1.5 text-foreground'>{point.note}</p> : null}
		</div>
	);
}

function TestRow({
	test,
	checked,
	disabled,
	style,
	inRange,
	highlighted,
	onCheckedChange,
	onHighlight,
}: {
	test: LabTest;
	checked: boolean;
	disabled: boolean;
	style?: SeriesStyle;
	inRange: number;
	highlighted: boolean;
	onCheckedChange: (checked: boolean) => void;
	onHighlight: (on: boolean) => void;
}) {
	const id = React.useId();
	const last = test.points.at(-1)!;
	const pending = test.latest.value === undefined && test.latest.status === "pending";
	const flag = last.flag ? labTileFlags[last.flag] : undefined;
	const change = changeFrom(last, test.points.at(-2));
	return (
		<li data-test={test.name}>
			<label
				htmlFor={id}
				onPointerEnter={() => onHighlight(true)}
				onPointerLeave={() => onHighlight(false)}
				onFocus={() => onHighlight(true)}
				onBlur={() => onHighlight(false)}
				className={cn(
					"flex items-start gap-2.5 rounded-lg px-2 py-1.5 transition-colors",
					disabled ? "opacity-50" : "cursor-pointer hover:bg-accent",
					highlighted && checked && "bg-accent",
				)}
				title={disabled ? `Up to ${maxSelected} tests on the chart` : undefined}
			>
				<Checkbox
					id={id}
					checked={checked}
					disabled={disabled}
					onCheckedChange={(value) => onCheckedChange(value === true)}
					className='mt-0.5'
				/>
				<span className='flex min-w-0 flex-1 flex-col'>
					<span className='flex items-baseline gap-2'>
						<span className='flex min-w-0 flex-1 items-center gap-1.5 text-sm font-medium text-foreground'>
							{checked && style ? <SeriesSwatch style={style} className='self-center' /> : null}
							<span className='truncate'>{test.name}</span>
						</span>
						<span className='flex shrink-0 items-baseline gap-1'>
							<span
								className={cn(
									"text-sm font-semibold tabular-nums",
									last.flag === "critical" ? "text-severity-critical" : "text-foreground",
								)}
							>
								{last.text}
							</span>
							{test.unit ? <span className='text-xs text-muted-foreground'>{test.unit}</span> : null}
							{flag ? (
								<span className={cn("text-xs font-bold", flag.className)}>
									<span aria-hidden='true'>{flag.letter}</span>
									<span className='sr-only'>{flag.label}</span>
								</span>
							) : null}
						</span>
					</span>
					<span className='flex items-baseline gap-2 text-xs text-muted-foreground'>
						<span className='flex-1 truncate'>
							{change ? (
								<>
									{change.arrow ? <span aria-hidden='true'>{change.arrow} </span> : null}
									<span className='sr-only'>{change.words} </span>
									<span className='font-bold text-foreground tabular-nums'>{change.amount}</span>
									{` from ${change.before.text}`}
								</>
							) : (
								"One result"
							)}
						</span>
						<span className='shrink-0'>
							{pending
								? `Pending${test.latest.collectedAt ? ` · ${formatTime(test.latest.collectedAt)}` : ""}`
								: inRange === 0
									? "None in range"
									: `${inRange} in range`}
						</span>
					</span>
				</span>
			</label>
		</li>
	);
}

function TestPicker({
	tests,
	suggested,
	reason,
	selected,
	styleOf,
	inRangeOf,
	highlighted,
	notice,
	onToggle,
	onHighlight,
	className,
}: {
	className?: string;
	tests: LabTest[];
	suggested: string[];
	reason: string;
	selected: string[];
	styleOf: (name: string) => SeriesStyle | undefined;
	inRangeOf: (test: LabTest) => number;
	highlighted: string | null;
	notice?: string;
	onToggle: (name: string, on: boolean) => void;
	onHighlight: (name: string | null) => void;
}) {
	const [search, setSearch] = React.useState("");
	const query = search.trim().toLowerCase();
	const full = selected.length >= maxSelected;
	const row = (test: LabTest) => (
		<TestRow
			key={test.name}
			test={test}
			checked={selected.includes(test.name)}
			disabled={full && !selected.includes(test.name)}
			style={styleOf(test.name)}
			inRange={inRangeOf(test)}
			highlighted={highlighted === test.name}
			onCheckedChange={(on) => onToggle(test.name, on)}
			onHighlight={(on) => onHighlight(on ? test.name : null)}
		/>
	);
	const suggestedTests = suggested.map((name) => tests.find((test) => test.name === name)).filter((test): test is LabTest => Boolean(test));
	const others = tests.filter((test) => !suggested.includes(test.name));
	const panels = [...new Set(others.map((test) => test.panel))];
	const matches = tests.filter((test) => test.name.toLowerCase().includes(query) || test.panel.toLowerCase().includes(query));
	return (
		<section aria-label='All tests' className={cn("flex min-h-0 min-w-0 flex-1 flex-col gap-2", className)}>
			<div className='flex items-baseline justify-between gap-2 px-1'>
				<h3 className='text-sm font-semibold text-foreground'>Tests</h3>
				<p className='text-right text-xs text-muted-foreground' aria-live='polite'>
					{notice ?? `${selected.length} of ${maxSelected} on the chart`}
				</p>
			</div>
			<SearchInput collapsible={false} expandedWidth='100%' placeholder='Search tests' value={search} onValueChange={setSearch} />
			<div className='-mx-1 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto scrollbar-soft'>
				{query ? (
					matches.length ? (
						<ul aria-label='Matching tests'>{matches.map(row)}</ul>
					) : (
						<p className='px-3 py-2 text-sm text-muted-foreground'>No test matches “{search.trim()}”.</p>
					)
				) : (
					<>
						{suggestedTests.length ? (
							<section aria-label={reason}>
								<h4 className='px-3 pb-0.5 text-xs font-semibold text-muted-foreground'>{reason}</h4>
								<ul>{suggestedTests.map(row)}</ul>
							</section>
						) : null}
						{panels.map((panel) => (
							<section key={panel} aria-label={panel}>
								<h4 className='px-3 pb-0.5 text-xs font-semibold text-muted-foreground'>{panel}</h4>
								<ul>{others.filter((test) => test.panel === panel).map(row)}</ul>
							</section>
						))}
					</>
				)}
			</div>
		</section>
	);
}

/**
 * The tests under the chart, as shadcn's chart legend: each suggested test (and any added) is a toggle, its line's
 * color and dash while shown, muted while hidden. Hovering one highlights its line. Six at most are shown.
 */
function TestLegend({
	names,
	selected,
	styleOf,
	highlighted,
	notice,
	onToggle,
	onHighlight,
	children,
}: {
	names: string[];
	selected: string[];
	styleOf: (name: string) => SeriesStyle | undefined;
	highlighted: string | null;
	notice?: string;
	onToggle: (name: string, on: boolean) => void;
	onHighlight: (name: string | null) => void;
	children?: React.ReactNode;
}) {
	const full = selected.length >= maxSelected;
	return (
		<div className='flex flex-col items-center gap-1'>
			<ul aria-label='Tests on the chart' className='flex flex-wrap items-center justify-center gap-1'>
				{names.map((name) => {
					const on = selected.includes(name);
					const style = styleOf(name);
					return (
						<li key={name}>
							<button
								type='button'
								aria-pressed={on}
								disabled={full && !on}
								title={full && !on ? `Up to ${maxSelected} tests on the chart` : undefined}
								onClick={() => onToggle(name, !on)}
								onPointerEnter={() => on && onHighlight(name)}
								onPointerLeave={() => onHighlight(null)}
								onFocus={() => on && onHighlight(name)}
								onBlur={() => onHighlight(null)}
								className={cn(
									"inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2 text-sm font-medium transition-colors duration-160 ease-out outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent motion-reduce:transition-none",
									on ? "text-foreground" : "text-muted-foreground",
									on && highlighted === name && "bg-accent",
								)}
							>
								<SeriesSwatch style={on && style ? style : { color: "text-border-defined" }} />
								{name}
							</button>
						</li>
					);
				})}
				{children}
			</ul>
			<p aria-live='polite' className={notice ? "text-xs text-muted-foreground" : "sr-only"}>
				{notice ?? ""}
			</p>
		</div>
	);
}

function MeasurementsTable({ tests, start, end }: { tests: LabTest[]; start: number; end: number }) {
	const rows = tests
		.flatMap((test) => test.points.map((point, index) => ({ test, point, index })))
		.filter(({ point }) => point.at >= start && point.at <= end)
		.sort((a, b) => b.point.at - a.point.at);
	return (
		<Table size='sm'>
			<TableCaption className='sr-only'>Every result on the chart, newest first</TableCaption>
			<TableHeader variant='flat'>
				<TableRow className='hover:bg-transparent'>
					<TableHead scope='col'>Collected</TableHead>
					<TableHead scope='col'>Test</TableHead>
					<TableHead scope='col'>Result</TableHead>
					<TableHead scope='col'>Change</TableHead>
					<TableHead scope='col'>Resulted</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{rows.map(({ test, point, index }) => {
					const flag = point.flag ? labTileFlags[point.flag] : undefined;
					const change = changeFrom(point, test.points[index - 1]);
					return (
						<TableRow key={`${test.name}-${index}`}>
							<TableCell className='tabular-nums'>{point.collectedAt ? formatDateTime(point.collectedAt) : "--"}</TableCell>
							<TableCell>{test.name}</TableCell>
							<TableCell>
								<span className='flex items-baseline gap-1.5'>
									<span
										className={cn("font-semibold tabular-nums", point.flag === "critical" ? "text-severity-critical" : "text-foreground")}
									>
										{point.text}
									</span>
									{test.unit ? <span className='text-xs text-muted-foreground'>{test.unit}</span> : null}
									{flag ? (
										<span className={cn("text-xs font-bold", flag.className)}>
											<span aria-hidden='true'>{flag.letter}</span>
											<span className='sr-only'>{flag.label}</span>
										</span>
									) : null}
								</span>
							</TableCell>
							<TableCell className='text-muted-foreground tabular-nums'>
								{change ? (
									<>
										{change.arrow ? <span aria-hidden='true'>{change.arrow} </span> : null}
										<span className='sr-only'>{change.words} </span>
										{change.amount}
									</>
								) : (
									"--"
								)}
							</TableCell>
							<TableCell className='text-muted-foreground tabular-nums'>
								{point.resultedAt ? formatDateTime(point.resultedAt) : "--"}
							</TableCell>
						</TableRow>
					);
				})}
			</TableBody>
		</Table>
	);
}

type LabTrendsProps = {
	chart: PatientChart;
	trends?: PatientLabTrends;
	encounterStart?: string;
	source?: React.ReactNode;
	request?: LabTrendsRequest;
	/** The tests the key lab tiles put on the chart (`show` / `toggle`), until the last is off or a change by hand (`[]`). */
	onFocusChange?: (tests: string[]) => void;
};
const modeOptions = (any: boolean): ToggleOption<TrendMode>[] => [
	{ id: "actual", label: "Actual values", disabled: !any },
	{ id: "relative", label: "Relative change", disabled: !any },
];
const layoutOptions: ToggleOption<"single" | "separate">[] = [
	{ id: "single", label: "Single chart" },
	{ id: "separate", label: "Separate charts" },
];

/**
 * Lab trends: one chart of the picked tests over a time range, in Actual values (one unit and scale) or Relative change
 * (otherwise), beside the tests that drive it. Expand: the same tests, range and mode, larger, with separate charts on
 * request and every result in a table.
 */
function LabTrends({ chart, trends, encounterStart, source, request, onFocusChange }: LabTrendsProps) {
	const minute = useCurrentMinute();
	const now = minute ?? Date.now();
	const titleId = React.useId();
	const tests = React.useMemo(() => labTests(chart, trends), [chart, trends]);
	const byName = React.useMemo(() => new Map(tests.map((test) => [test.name, test])), [tests]);
	const conditionsKey = chart.problems
		.filter((problem) => problem.status === "active")
		.map((problem) => problem.name)
		.join("|");
	const suggestion = React.useMemo(() => suggestTests(conditionsKey ? conditionsKey.split("|") : [], tests), [conditionsKey, tests]);
	const initial = React.useMemo(() => defaultSelection(suggestion.names, tests), [suggestion, tests]);
	const initialSlots = () => Object.fromEntries(initial.map((name, index) => [name, index]));
	const [slots, setSlots] = React.useState<Record<string, number>>(initialSlots);
	const selected = Object.keys(slots).sort((a, b) => slots[a] - slots[b]);
	const styleOf = (name: string) => (name in slots ? seriesStyles[slots[name]] : undefined);
	const encounter = encounterStart
		? Date.parse(encounterStart)
		: Math.min(...tests.flatMap((test) => test.points.map((point) => point.at)), now);
	const [windowId, setWindowId] = React.useState<TrendWindowId>(() => (now - encounter <= 7 * 24 * 60 * MINUTE ? "encounter" : "7d"));
	// The mode is the user's (Nov 25, 2026, user's call): Actual values when the first pick shares a unit, Relative
	// change otherwise, then whatever they choose; picking a test never switches it.
	const initialMode = (): TrendMode =>
		compatible(initial.map((name) => byName.get(name)).filter((test): test is LabTest => Boolean(test))) ? "actual" : "relative";
	const [mode, setMode] = React.useState<TrendMode>(initialMode);
	const [expanded, setExpanded] = React.useState(false);
	const [layout, setLayout] = React.useState<"single" | "separate">("single");
	const [highlighted, setHighlighted] = React.useState<string | null>(null);
	const [hover, setHover] = React.useState<Hover | null>(null);
	const [notice, setNotice] = React.useState<string>();
	// Tests added from Add test (or a key lab tile) stay in the legend, after the suggested ones, until reset.
	const [added, setAdded] = React.useState<string[]>([]);
	const [adding, setAdding] = React.useState(false);
	// The key lab tiles' view: the tests they put on the chart, and what it showed before, put back when the last is off.
	type Snapshot = { slots: Record<string, number>; mode: TrendMode; windowId: TrendWindowId; added: string[] };
	const [focus, setFocus] = React.useState<{ tests: string[]; before: Snapshot } | null>(null);
	const focusKey = focus?.tests.join("|") ?? "";
	React.useEffect(() => onFocusChange?.(focusKey ? focusKey.split("|") : []), [focusKey]); // eslint-disable-line react-hooks/exhaustive-deps
	const remember = (name: string) => {
		if (!suggestion.names.includes(name)) setAdded((current) => (current.includes(name) ? current : [...current, name]));
	};
	const timeWindow = trendWindows.find((item) => item.id === windowId)!;
	const start = timeWindow.minutes ? now - timeWindow.minutes * MINUTE : Math.min(encounter, now - 60 * MINUTE);
	const picked = selected.map((name) => byName.get(name)).filter((test): test is LabTest => Boolean(test));
	const inRangeOf = (test: LabTest) => test.points.filter((point) => point.at >= start && point.at <= now).length;
	const series = picked.map((test) => seriesFor(test, styleOf(test.name)!, mode, start, now));
	const notShown = series.filter((item) => item.missing);
	// A highlighted test that left the chart dims nothing.
	const shownHighlight = highlighted && selected.includes(highlighted) ? highlighted : null;
	const changed = added.length > 0 || selected.join("|") !== initial.join("|");
	// Clinical events, the reference range and the baseline always show (Nov 25, 2026, user's call): no chips to hide them.
	const events = trends?.events ?? [];
	// In Actual values the chart holds one unit: a test that doesn't share it takes the chart alone. Relative change
	// takes any mix, up to six.
	const add = (name: string) =>
		setSlots((current) => {
			if (name in current) return current;
			const shown = Object.keys(current)
				.map((key) => byName.get(key))
				.filter((test): test is LabTest => Boolean(test));
			if (mode === "actual" && !compatible([...shown, byName.get(name)!])) return { [name]: 0 };
			if (shown.length >= maxSelected) return current;
			const used = new Set(Object.values(current));
			return { ...current, [name]: seriesStyles.findIndex((_, index) => !used.has(index)) };
		});
	// Choosing Actual values keeps the first test on the chart and those that share its unit.
	const chooseMode = (next: TrendMode) => {
		setNotice(undefined);
		setFocus(null);
		if (next === "actual" && !compatible(picked)) {
			const kept: LabTest[] = [];
			for (const test of picked) if (compatible([...kept, test])) kept.push(test);
			setSlots(Object.fromEntries(kept.map((test) => [test.name, slots[test.name]])));
		}
		setMode(next);
	};
	const toggle = (name: string, on: boolean) => {
		setNotice(undefined);
		setFocus(null);
		if (on) {
			add(name);
			remember(name);
		} else
			setSlots((current) => {
				const { [name]: _removed, ...rest } = current;
				return rest;
			});
	};
	React.useEffect(() => {
		if (!request || !byName.has(request.test)) return;
		const test = byName.get(request.test)!;
		const before: Snapshot = focus?.before ?? { slots, mode, windowId, added };
		if (request.action === "toggle" || request.action === "show") {
			setNotice(undefined);
			const current = request.action === "show" ? [] : (focus?.tests ?? []);
			const next = current.includes(request.test) ? current.filter((name) => name !== request.test) : [...current, request.test];
			if (!next.length) {
				// The last tile off: back to what the chart showed before the first.
				setSlots(before.slots);
				setMode(before.mode);
				setWindowId(before.windowId);
				setAdded(before.added);
				setFocus(null);
				setHighlighted(null);
				return;
			}
			if (next.length > maxSelected) {
				setNotice(`${maxSelected} at most: turn one off to add ${request.test}`);
				return;
			}
			const tests = next.map((name) => byName.get(name)!);
			next.forEach(remember);
			// Each test keeps its color while the tiles change; a new one takes the first free.
			setSlots(() => {
				const kept = Object.fromEntries(next.filter((name) => focus?.tests.includes(name) && name in slots).map((name) => [name, slots[name]]));
				for (const name of next)
					if (!(name in kept)) {
						const used = new Set(Object.values(kept));
						kept[name] = seriesStyles.findIndex((_, index) => !used.has(index));
					}
				return kept;
			});
			// One unit reads in Actual values; a mix needs Relative change.
			setMode(compatible(tests) ? "actual" : "relative");
			if (!current.length) {
				const holding = trendWindows.find(
					(item) => item.minutes && test.points.filter((point) => point.at >= now - item.minutes! * MINUTE).length > 1,
				);
				setWindowId(holding?.id ?? "encounter");
			}
			setFocus({ tests: next, before });
			setHighlighted(null);
			return;
		}
		remember(request.test);
		if (!(request.test in slots)) {
			if (selected.length >= maxSelected && !(mode === "actual" && !compatible([...picked, test]))) setNotice(`${maxSelected} at most: remove one to add ${request.test}`);
			else {
				add(request.test);
				setNotice(`${request.test} added`);
			}
		}
		setHighlighted(request.test);
	}, [request?.id]); // eslint-disable-line react-hooks/exhaustive-deps

	const rangeControl = (
		<SegmentedToggle
			label='Time range'
			options={trendWindows.map(({ id, label }) => ({ id, label }))}
			value={windowId}
			onValueChange={setWindowId}
		/>
	);
	const modeBar = (separate: boolean) => (
		<div className='flex min-h-9 flex-wrap items-center gap-x-3 gap-y-2'>
			{separate ? (
				<p className='text-sm text-muted-foreground'>Actual values, one chart per test</p>
			) : (
				<SegmentedToggle
					label='Visualization'
					options={modeOptions(picked.length > 0)}
					value={picked.length ? mode : null}
					onValueChange={chooseMode}
				/>
			)}
		</div>
	);
	const heading = (
		<div className='flex min-h-9 flex-wrap items-baseline gap-x-3 gap-y-1'>
			<h2 id={titleId} className='text-base font-semibold text-foreground'>
				Lab trends
			</h2>
			{source ? <p className='flex items-center gap-1.5 text-xs text-muted-foreground'>{source}</p> : null}
		</div>
	);
	const caption = (
		<div className='text-xs text-muted-foreground empty:hidden'>
			{notShown.length ? (
				<p>
					Not shown:{" "}
					{notShown
						.map(
							(item) =>
								`${item.test.name} (${item.missing === "none-in-range" ? "no results in this range" : `starts at ${item.start?.text}, nothing to measure change from`})`,
						)
						.join(", ")}
					.
				</p>
			) : null}
		</div>
	);
	const chartArea = (height: number, separate: boolean) =>
		picked.length ? (
			separate ? (
				<div className='flex flex-col gap-3'>
					{picked.map((test) => (
						<div key={test.name} className='flex flex-col'>
							<p className='flex items-center gap-1.5 text-xs'>
								<SeriesSwatch style={styleOf(test.name)!} />
								<span className='font-semibold text-foreground'>{test.name}</span>
							</p>
							<TrendPlot
								series={[seriesFor(test, styleOf(test.name)!, "actual", start, now)]}
								mode='actual'
								start={start}
								end={now}
								height={180}
								events={events}
								highlighted={shownHighlight}
								onHighlight={setHighlighted}
								hover={hover}
								onHover={setHover}
								label={`${test.name} over time${test.unit ? `, ${test.unit}` : ""}`}
							/>
						</div>
					))}
				</div>
			) : (
				<TrendPlot
					series={series}
					mode={mode}
					start={start}
					end={now}
					height={height}
					events={events}
					highlighted={shownHighlight}
					onHighlight={setHighlighted}
					hover={hover}
					onHover={setHover}
					label={`${picked.map((test) => test.name).join(", ")} over time, ${mode === "relative" ? "relative change" : `actual values${picked[0]?.unit ? ` in ${picked[0].unit}` : ""}`}`}
				/>
			)
		) : (
			<p
				className='flex items-center justify-center rounded-card border border-dashed border-border px-4 text-center text-sm text-muted-foreground'
				style={{ height: height + 20 }}
			>
				Select laboratory tests to compare their trends over time.
			</p>
		);
	const picker = (className?: string) => (
		<TestPicker
			className={className}
			tests={tests}
			suggested={suggestion.names}
			reason={suggestion.reason}
			selected={selected}
			styleOf={styleOf}
			inRangeOf={inRangeOf}
			highlighted={shownHighlight}
			notice={notice}
			onToggle={toggle}
			onHighlight={setHighlighted}
		/>
	);
	const legend = (
		<TestLegend
			names={[...suggestion.names, ...added]}
			selected={selected}
			styleOf={styleOf}
			highlighted={shownHighlight}
			notice={notice}
			onToggle={toggle}
			onHighlight={setHighlighted}
		>
			<li>
				<Popover open={adding} onOpenChange={setAdding}>
					<PopoverTrigger asChild>
						<Button variant='ghost' size='xs' className='text-sm text-muted-foreground'>
							<PlusIcon aria-hidden='true' />
							Add test
						</Button>
					</PopoverTrigger>
					<PopoverContent side='top' className='h-[28rem] w-90 p-4'>
						{picker()}
					</PopoverContent>
				</Popover>
			</li>
			{changed ? (
				<li>
					<Button
						variant='link'
						size='xs'
						className='text-sm'
						onClick={() => {
							setNotice(undefined);
							setAdded([]);
							setSlots(initialSlots());
							setMode(initialMode());
							setFocus(null);
						}}
					>
						Back to the suggested tests
					</Button>
				</li>
			) : null}
		</TestLegend>
	);

	return (
		<section aria-labelledby={titleId} className='flex min-w-0 scroll-mt-[calc(var(--patient-header-height,0px)+5rem)] flex-col gap-6 @container'>
			{tests.length ? (
				<>
					{/* The controls above the card, 24px from it, as the Timeline's time window sits above its chart: the mode on
					    the left, the range and Expand on the right. The heading opens the card (user's call, Nov 25, 2026). */}
					<div className='flex flex-wrap items-center justify-between gap-x-3 gap-y-2'>
						{modeBar(false)}
						<div className='flex items-center gap-2'>
							{rangeControl}
							<Button variant='outline' size='icon-md' aria-label='Expand lab trends' onClick={() => setExpanded(true)}>
								<Maximize2Icon aria-hidden='true' />
							</Button>
						</div>
					</div>
					{/* One card: the heading, the chart across its width, the legend of tests under it (user's call, Nov 25, 2026;
					    Figma `320:9153` had the tests in a column on the right). */}
					<div className='flex min-w-0 flex-col gap-2 rounded-card border border-border bg-background p-4'>
						{heading}
						{chartArea(240, false)}
						{legend}
						{caption}
					</div>
				</>
			) : (
				<>
					{heading}
					<p className='text-sm text-muted-foreground'>No numeric results to chart yet.</p>
				</>
			)}
			<Dialog open={expanded} onOpenChange={setExpanded}>
				<DialogContent className='w-[min(1280px,calc(100vw-48px))] max-w-none'>
					<DialogHeader>
						<DialogTitle>Lab trends</DialogTitle>
						<DialogDescription>{picked.length ? picked.map((test) => test.name).join(", ") : "No tests picked"}</DialogDescription>
					</DialogHeader>
					<div className='flex min-w-0 flex-col gap-4 px-6 pb-6 @container'>
						<div className='flex flex-wrap items-center justify-between gap-2'>
							<SegmentedToggle label='Layout' options={layoutOptions} value={layout} onValueChange={setLayout} />
							{rangeControl}
						</div>
						<div className='flex min-w-0 flex-col gap-2'>
							{modeBar(layout === "separate")}
							{chartArea(400, layout === "separate")}
							{legend}
							{layout === "single" ? caption : null}
						</div>
						{picked.length ? <MeasurementsTable tests={picked} start={start} end={now} /> : null}
					</div>
				</DialogContent>
			</Dialog>
		</section>
	);
}

export {
	LabTrends,
	labTrendProfiles,
	parseRange,
	trendableTests,
	type LabTrendBaseline,
	type LabTrendEvent,
	type LabTrendPoint,
	type LabTrendsProps,
	type LabTrendsRequest,
	type PatientLabTrends,
};
