import { Badge, type BadgeProps } from "@/components/data-display/badge";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/data-display/table";
import { useCurrentMinute } from "@/lib/hooks/use-current-minute";
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

const resultFlags: Record<ChartResultFlag, { letter: string; label: string; className: string }> = {
	high: { letter: "H", label: "High", className: "text-badge-amber-foreground" },
	low: { letter: "L", label: "Low", className: "text-badge-amber-foreground" },
	critical: { letter: "Critical", label: "Critical", className: "text-severity-critical" },
};

const cultureStatuses: Record<ChartCulture["status"], { label: string; variant: BadgeProps["variant"] }> = {
	pending: { label: "Pending", variant: "secondary" },
	"no-growth": { label: "No growth to date", variant: "secondary" },
	preliminary: { label: "Preliminary", variant: "amber" },
	final: { label: "Final", variant: "outline" },
};

const susceptibilityLabels = { S: "Susceptible", I: "Intermediate", R: "Resistant" } as const;

function resultDirection(result: ChartResult) {
	if (!result.previous || result.value === undefined) return undefined;
	const delta = Number.parseFloat(result.value) - Number.parseFloat(result.previous.value);
	return delta > 0 ? "▲" : delta < 0 ? "▼" : undefined;
}

/* -------------------------------------------------------------------------- */
/* Results                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Every panel in one table, so the columns line up across panels; each panel is a row group headed by its name. Range
 * and previous value hide on a narrow column; the flag never does. A UCL Table (Nov 13, 2026, user's call).
 */
function ResultsTable({ panels, now }: { panels: ChartResultPanel[]; now: number | null }) {
	return (
		<Table size='md'>
			<TableCaption className='sr-only'>Results by panel, newest first</TableCaption>
			<TableHeader variant='flat'>
				<TableRow className='hover:bg-transparent'>
					<TableHead scope='col'>Test</TableHead>
					<TableHead scope='col'>Result</TableHead>
					<TableHead scope='col' className='hidden @min-[40rem]:table-cell'>
						Range
					</TableHead>
					<TableHead scope='col' className='hidden @min-[48rem]:table-cell'>
						Previous
					</TableHead>
					<TableHead scope='col' className='text-right'>
						Resulted
					</TableHead>
				</TableRow>
			</TableHeader>
			{panels.map((panel) => (
				<TableBody key={panel.name}>
					<TableRow className='hover:bg-transparent'>
						<TableHead scope='rowgroup' colSpan={5} className='h-auto pt-5 pb-1.5'>
							{panel.name}
						</TableHead>
					</TableRow>
					{panel.results.map((result) => (
						<ResultRow key={result.name} result={result} now={now} />
					))}
				</TableBody>
			))}
		</Table>
	);
}

function ResultRow({ result, now }: { result: ChartResult; now: number | null }) {
	const flag = result.flag ? resultFlags[result.flag] : undefined;
	const direction = resultDirection(result);
	const status = result.status ?? "resulted";
	const hasValue = result.value !== undefined && status !== "pending" && status !== "none";

	return (
		<TableRow>
			<TableCell>{result.name}</TableCell>
			<TableCell>
				{hasValue ? (
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
						{status === "corrected" ? (
							<span className='w-full text-xs text-muted-foreground'>
								Corrected{result.original ? ` · first reported ${result.original}` : null}
							</span>
						) : null}
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
			<TableCell className='hidden text-muted-foreground tabular-nums @min-[48rem]:table-cell'>
				{result.previous ? (
					<>
						{direction ? <span aria-hidden='true'>{direction} </span> : null}
						{result.previous.value}
						<span className='text-xs'> · {formatWhen(result.previous.at, now)}</span>
					</>
				) : (
					"--"
				)}
			</TableCell>
			<TableCell className='text-right text-xs text-muted-foreground tabular-nums'>
				{result.resultedAt ? formatWhen(result.resultedAt, now) : "--"}
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

	return (
		<div className='flex min-w-0 flex-col gap-6 @container'>
			<SectionGroup title='Results' meta={<SourceLabel>{source}</SourceLabel>}>
				{chart.panels.length ? (
					<ResultsTable panels={chart.panels} now={now} />
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
