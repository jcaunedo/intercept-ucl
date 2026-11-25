import * as React from "react";

import { Badge, type BadgeProps } from "@/components/data-display/badge";
import { labTileFlags } from "@/components/data-display/lab-tile";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/data-display/table";
import { FilterBarChip } from "@/components/forms/filter-bar";
import { useCurrentMinute } from "@/lib/hooks/use-current-minute";
import { formatDayLabel } from "@/lib/relative-date";
import { cn } from "@/lib/utils";

import { formatTime, formatWhen, freshness, NoData, SectionGroup } from "../section-parts";
import { SourceLabel } from "../../shared/source-label";
import {
	emrLabel,
	type ChartCulture,
	type ChartResult,
	type ChartResultFlag,
	type ChartResultPanel,
	type ChartSectionProps,
} from "./chart-section";

// The Labs tab (PRD Patient details §7, PD-040–PD-042): results by panel, then microbiology, from the hospital's record,
// read only. Its data is the record's `chart`, the same the Chart tab reads (`chart-section.tsx` has the data shapes).

/* -------------------------------------------------------------------------- */
/* Product content                                                            */
/* -------------------------------------------------------------------------- */

// A result's flag, colored as the Overview's lab tiles and the Messages snapshot color it (LabTile's `labTileFlags`), so a
// flag looks the same wherever a lab shows. The table has room for the word, so Critical stays spelled out (PD-040).
const resultFlags: Record<ChartResultFlag, { letter: string; label: string; className: string }> = {
	high: labTileFlags.high,
	low: labTileFlags.low,
	critical: { ...labTileFlags.critical, letter: "Critical" },
};

const cultureStatuses: Record<ChartCulture["status"], { label: string; variant: BadgeProps["variant"] }> = {
	pending: { label: "Pending", variant: "secondary" },
	"no-growth": { label: "No growth to date", variant: "secondary" },
	preliminary: { label: "Preliminary", variant: "amber" },
	final: { label: "Final", variant: "outline" },
};

const susceptibilityLabels = { S: "Susceptible", I: "Intermediate", R: "Resistant" } as const;

const hasResult = (result: ChartResult) => {
	const status = result.status ?? "resulted";
	return result.value !== undefined && status !== "pending" && status !== "none";
};

/** Waiting on the lab: collected and not resulted. "No result in 24 h" isn't pending, nothing was sent. */
const isPending = (result: ChartResult) => !hasResult(result) && result.status !== "none";

/**
 * Not known to be normal: flagged, pending, or no result in the window. What "Abnormal only" keeps, since a result that
 * hasn't come back can't be ruled normal.
 */
const needsAttention = (result: ChartResult) => !!result.flag || !hasResult(result);

/** "Today" → "11:06 AM", "Yesterday 10:21 AM", else "Nov 22, 10:21 AM": a lab's day is what tells two draws apart. */
function formatResultTime(iso: string, now: number | null) {
	if (now === null) return formatWhen(iso, now);
	const day = formatDayLabel(iso, now);
	if (day === "Today") return formatTime(iso);
	if (day === "Yesterday") return `Yesterday ${formatTime(iso)}`;
	return formatWhen(iso, now);
}

/**
 * The hospital's reference range as numbers: "0.5–2.0", "Under 0.25" (no low side), "Over 60" (no high side). Words
 * ("Negative", "None") give none, so a change there is never called better or worse.
 */
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

/** How far a value is outside its range; 0 inside it. */
function distanceFromRange(value: number, range: { low?: number; high?: number }) {
	if (range.low !== undefined && value < range.low) return range.low - value;
	if (range.high !== undefined && value > range.high) return value - range.high;
	return 0;
}

const decimalsOf = (value: string) => value.match(/\.(\d+)/)?.[1].length ?? 0;

/**
 * The change since the previous result: its arrow, the difference with its sign ("+1.9", "−0.5", in the values'
 * precision), and whether it moved further out of range (worse). Nothing without a previous value or a number.
 */
function resultChange(result: ChartResult) {
	if (!result.previous || !hasResult(result)) return undefined;
	const current = Number.parseFloat(result.value!);
	const before = Number.parseFloat(result.previous.value);
	if (Number.isNaN(current) || Number.isNaN(before)) return undefined;
	const decimals = Math.max(decimalsOf(result.value!), decimalsOf(result.previous.value));
	const delta = Number((current - before).toFixed(decimals));
	const range = parseRange(result.range);
	const worse = !!range && distanceFromRange(current, range) > distanceFromRange(before, range);
	return {
		arrow: delta > 0 ? "▲" : delta < 0 ? "▼" : undefined,
		words: delta > 0 ? "Up" : delta < 0 ? "Down" : "No change",
		delta: delta === 0 ? "No change" : `${delta > 0 ? "+" : "−"}${Math.abs(delta).toFixed(decimals)}`,
		worse,
	};
}

/** The time most of a panel's results came back: a panel is usually drawn and resulted together. */
function panelResultedAt(panel: ChartResultPanel) {
	const counts = new Map<string, number>();
	for (const result of panel.results) {
		if (hasResult(result) && result.resultedAt) counts.set(result.resultedAt, (counts.get(result.resultedAt) ?? 0) + 1);
	}
	let most: string | undefined;
	for (const [at, count] of counts) if (!most || count > counts.get(most)!) most = at;
	return most;
}

/* -------------------------------------------------------------------------- */
/* Results                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * "11 abnormal · 1 critical · 1 pending" over the table, and the Abnormal only chip, which leaves out the results within
 * range (flagged, pending and missing ones stay). No chip when everything is in range.
 */
function ResultsSummary({
	panels,
	abnormalOnly,
	onAbnormalOnlyChange,
}: {
	panels: ChartResultPanel[];
	abnormalOnly: boolean;
	onAbnormalOnlyChange: (abnormalOnly: boolean) => void;
}) {
	const results = panels.flatMap((panel) => panel.results);
	const abnormal = results.filter((result) => hasResult(result) && result.flag).length;
	const critical = results.filter((result) => hasResult(result) && result.flag === "critical").length;
	const pending = results.filter(isPending).length;
	const hideable = results.some((result) => !needsAttention(result));
	return (
		<div className='flex flex-wrap items-center gap-x-3 gap-y-2'>
			{abnormal && hideable ? (
				<FilterBarChip pressed={abnormalOnly} onPressedChange={onAbnormalOnlyChange}>
					Abnormal only
				</FilterBarChip>
			) : null}
			<p className='text-sm text-muted-foreground'>
				{abnormal ? (
					<>
						<span className='font-semibold text-foreground'>{abnormal}</span> abnormal
					</>
				) : (
					"All results in range"
				)}
				{critical ? (
					<>
						{" · "}
						<span className={cn("font-semibold", resultFlags.critical.className)}>{critical} critical</span>
					</>
				) : null}
				{pending ? ` · ${pending} pending` : null}
			</p>
		</div>
	);
}

/**
 * Every panel in one table, so the columns line up across panels; each panel is a row group headed by its name and the
 * time it resulted. Test, Result and Range keep fixed widths, so a value sits next to its range on any screen, and Change
 * takes the rest. Range and Change hide on a narrow column; the flag never does. A UCL Table (Nov 13, 2026, user's call).
 */
function ResultsTable({ panels, now }: { panels: ChartResultPanel[]; now: number | null }) {
	return (
		<Table size='md'>
			<TableCaption className='sr-only'>Results by panel, newest first</TableCaption>
			<TableHeader variant='flat'>
				<TableRow className='hover:bg-transparent'>
					<TableHead scope='col' className='w-48'>
						Test
					</TableHead>
					<TableHead scope='col' className='w-60'>
						Result
					</TableHead>
					<TableHead scope='col' className='hidden w-32 @min-[40rem]:table-cell'>
						Range
					</TableHead>
					<TableHead scope='col' className='hidden @min-[48rem]:table-cell'>
						Change
					</TableHead>
				</TableRow>
			</TableHeader>
			{panels.map((panel) => {
				const resultedAt = panelResultedAt(panel);
				return (
					<TableBody key={panel.name}>
						<TableRow className='hover:bg-transparent'>
							<TableHead scope='rowgroup' colSpan={4} className='h-auto pt-5 pb-1.5'>
								{panel.name}
								{resultedAt ? (
									<span className='text-xs font-normal text-muted-foreground'>
										{" · "}Resulted {formatResultTime(resultedAt, now)}
									</span>
								) : null}
							</TableHead>
						</TableRow>
						{panel.results.map((result) => (
							<ResultRow key={result.name} result={result} panelResultedAt={resultedAt} now={now} />
						))}
					</TableBody>
				);
			})}
		</Table>
	);
}

function ResultRow({
	result,
	panelResultedAt,
	now,
}: {
	result: ChartResult;
	/** The panel's time, in its heading; the row names its own only when it differs (a repeat lactate, a correction). */
	panelResultedAt?: string;
	now: number | null;
}) {
	const flag = result.flag ? resultFlags[result.flag] : undefined;
	const change = resultChange(result);
	const status = result.status ?? "resulted";
	const ownTime = result.resultedAt && result.resultedAt !== panelResultedAt ? result.resultedAt : undefined;
	// Each note on its own line, so a time never breaks across two.
	const notes = [
		status === "corrected" ? `Corrected${result.original ? ` · first reported ${result.original}` : ""}` : undefined,
		ownTime ? `Resulted ${formatResultTime(ownTime, now)}` : undefined,
	].filter((note) => note !== undefined);

	return (
		<TableRow>
			<TableCell>{result.name}</TableCell>
			<TableCell>
				{hasResult(result) ? (
					<span className='flex flex-wrap items-baseline gap-x-1.5'>
						<span className={cn("font-semibold tabular-nums", result.flag === "critical" ? "text-severity-critical" : "text-foreground")}>
							{result.value}
						</span>
						{result.unit ? <span className='text-xs text-muted-foreground'>{result.unit}</span> : null}
						{flag ? (
							<span className={cn("text-xs font-bold", flag.className)}>
								<span aria-hidden='true'>{flag.letter}</span>
								<span className='sr-only'>{flag.label}</span>
							</span>
						) : null}
						{notes.map((note) => (
							<span key={note} className='w-full text-xs whitespace-normal text-muted-foreground'>
								{note}
							</span>
						))}
					</span>
				) : (
					<span className='text-muted-foreground'>
						--
						<span className='ml-1.5 text-xs'>
							{status === "none"
								? "No result in 24 h"
								: result.collectedAt
									? `Pending · collected ${formatTime(result.collectedAt)}`
									: "Pending"}
						</span>
					</span>
				)}
			</TableCell>
			<TableCell className='hidden text-muted-foreground tabular-nums @min-[40rem]:table-cell'>{result.range ?? "--"}</TableCell>
			{/* "▲ +1.9 from 2.2 · 6:11 AM": the arrow and difference in the flag's color when the value moved further out of
			    range, muted otherwise (back toward range, or within it), as LabTile colors its previous line. */}
			<TableCell className='hidden text-muted-foreground tabular-nums @min-[48rem]:table-cell'>
				{result.previous ? (
					<>
						{change ? (
							<span className={cn(change.worse && "font-semibold", change.worse && flag?.className)}>
								{change.arrow ? <span aria-hidden='true'>{change.arrow} </span> : null}
								<span className='sr-only'>{change.words} </span>
								{change.delta}
								{change.worse ? <span className='sr-only'>, further out of range</span> : null}
							</span>
						) : null}
						<span className='text-xs'>
							{change ? " from " : "Was "}
							{result.previous.value} · {formatResultTime(result.previous.at, now)}
						</span>
					</>
				) : (
					"--"
				)}
			</TableCell>
		</TableRow>
	);
}

/**
 * The cultures as a UCL Table (Nov 13, 2026, user's call): the specimen, its status, the latest report (the organism,
 * the summary and, once final, the susceptibilities) and when it was collected and updated.
 */
function CulturesTable({ cultures, now }: { cultures: ChartCulture[]; now: number | null }) {
	return (
		<Table size='md'>
			<TableCaption className='sr-only'>Cultures: status, latest report and when collected</TableCaption>
			<TableHeader variant='flat'>
				<TableRow className='hover:bg-transparent'>
					<TableHead scope='col'>Specimen</TableHead>
					<TableHead scope='col'>Status</TableHead>
					<TableHead scope='col'>Report</TableHead>
					<TableHead scope='col'>Collected</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{cultures.map((culture) => {
					const status = cultureStatuses[culture.status];
					return (
						<TableRow key={`${culture.specimen}-${culture.collectedAt}`}>
							<TableCell>{culture.specimen}</TableCell>
							<TableCell>
								<Badge variant={status.variant} size='xs'>
									{status.label}
								</Badge>
							</TableCell>
							{/* The report wraps: it's the one long column. */}
							<TableCell className='min-w-[18rem] whitespace-normal'>
								<span className='flex flex-col gap-1.5'>
									<span>
										{culture.organism ? <span className='font-semibold'>{culture.organism}. </span> : null}
										{culture.summary}
									</span>
									{culture.susceptibilities?.length ? (
										<ul className='flex flex-wrap gap-1.5' aria-label='Susceptibilities'>
											{culture.susceptibilities.map((item) => (
												<li key={item.antibiotic}>
													<Badge variant={item.result === "R" ? "red" : "outline"} size='xs'>
														{item.antibiotic} <span aria-hidden='true'>{item.result}</span>
														<span className='sr-only'>{susceptibilityLabels[item.result]}</span>
													</Badge>
												</li>
											))}
										</ul>
									) : null}
								</span>
							</TableCell>
							<TableCell className='tabular-nums'>
								<span className='flex flex-col'>
									<span>{formatWhen(culture.collectedAt, now)}</span>
									{culture.updatedAt ? (
										<span className='text-xs text-muted-foreground'>Updated {formatWhen(culture.updatedAt, now)}</span>
									) : null}
								</span>
							</TableCell>
						</TableRow>
					);
				})}
			</TableBody>
		</Table>
	);
}

/* -------------------------------------------------------------------------- */
/* LabsSection                                                                */
/* -------------------------------------------------------------------------- */

/**
 * The Labs tab (Nov 11, 2026, user's call: Labs and Chart are their own tabs): results by panel, then microbiology,
 * from the hospital's record, read only.
 */
function LabsSection({ chart }: ChartSectionProps) {
	const now = useCurrentMinute();
	// Each card names the record as the tab does, "EMR", whatever its system (`chart.source`, e.g. Meditech; Nov 11, 2026,
	// user's call), so every hospital's page reads the same.
	const source = freshness(emrLabel, chart.updatedAt, now);
	// Abnormal only: each panel keeps its flagged, pending and missing results; a panel left with none drops out.
	const [abnormalOnly, setAbnormalOnly] = React.useState(false);
	const panels = abnormalOnly
		? chart.panels
				.map((panel) => ({ ...panel, results: panel.results.filter(needsAttention) }))
				.filter((panel) => panel.results.length)
		: chart.panels;

	return (
		<div className='flex min-w-0 flex-col gap-6 @container'>
			<SectionGroup title='Results' meta={<SourceLabel>{source}</SourceLabel>}>
				{chart.panels.length ? (
					<>
						<ResultsSummary panels={chart.panels} abnormalOnly={abnormalOnly} onAbnormalOnlyChange={setAbnormalOnly} />
						<ResultsTable panels={panels} now={now} />
					</>
				) : (
					<NoData>No results in the last 72 hours.</NoData>
				)}
			</SectionGroup>
			<SectionGroup title='Microbiology' meta={<SourceLabel>{emrLabel}</SourceLabel>}>
				{chart.cultures.length ? <CulturesTable cultures={chart.cultures} now={now} /> : <NoData>No cultures in the last 72 hours.</NoData>}
			</SectionGroup>
		</div>
	);
}

export { LabsSection };
