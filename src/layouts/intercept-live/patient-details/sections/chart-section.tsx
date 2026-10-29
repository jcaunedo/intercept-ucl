import * as React from "react";
import { ChevronDownIcon } from "lucide-react";

import { Button } from "@/components/buttons/button";
import { Badge, type BadgeProps } from "@/components/data-display/badge";
import { useCurrentMinute } from "@/lib/hooks/use-current-minute";
import { cn } from "@/lib/utils";

import { Detail, formatDateTime, formatTime, freshness, NoData, SectionCard } from "../section-parts";

// The Chart section (PRD Patient details §7, PD-040–PD-042): the slice of the hospital's record Intercept shows, read
// only. Results by panel in the main column, with microbiology and imaging reports; problems, allergies, history and
// home medications beside them. The hospital's record stays the source: every block names it and how fresh it is.

/* -------------------------------------------------------------------------- */
/* Data shapes (the app's API fills these)                                    */
/* -------------------------------------------------------------------------- */

type ChartProblem = {
	name: string;
	status: "active" | "resolved";
	/** Preformatted, e.g. "Oct 26" or "2019". */
	onset?: string;
	/** Who added it to the problem list, e.g. "Priya Shah, MD". */
	notedBy?: string;
};

type ChartAllergy = {
	substance: string;
	reaction?: string;
	severity?: "mild" | "moderate" | "severe";
};

type ChartHistoryItem = { name: string; detail?: string };

type ChartHomeMedication = {
	name: string;
	/** Dose, route and frequency, e.g. "1,000 mg by mouth twice a day". */
	dose: string;
	/** What the inpatient team did with it. */
	inpatient?: "held" | "continued" | "changed";
};

/** Outside the hospital's reference range. Shown as a word and a letter, never color alone (PRD PD-040). */
type ChartResultFlag = "high" | "low" | "critical";

type ChartResult = {
	name: string;
	value?: string;
	unit?: string;
	/** The hospital lab's reference range, preformatted ("3.5–5.1"). Never hard-coded (PRD PD-040). */
	range?: string;
	flag?: ChartResultFlag;
	/**
	 * `pending`: collected, not resulted. `corrected`: changed after it resulted; `original` keeps what was first
	 * reported. `none`: no result in the window, which reads "No result in 24 h" rather than looking normal.
	 */
	status?: "pending" | "resulted" | "corrected" | "none";
	resultedAt?: string;
	collectedAt?: string;
	previous?: { value: string; at: string };
	original?: string;
};

type ChartResultPanel = { name: string; results: ChartResult[] };

type ChartCulture = {
	specimen: string;
	collectedAt: string;
	status: "pending" | "no-growth" | "preliminary" | "final";
	/** The latest report in words, e.g. "No growth at 24 hours". */
	summary: string;
	organism?: string;
	susceptibilities?: { antibiotic: string; result: "S" | "I" | "R" }[];
	updatedAt?: string;
};

type ChartImagingReport = {
	study: string;
	performedAt: string;
	status: "preliminary" | "final";
	impression: string;
	findings: string;
	readBy?: string;
};

/** The hospital's record of the patient, as Intercept receives it. */
type PatientChart = {
	/** The record it comes from, e.g. "Epic". */
	source: string;
	updatedAt: string;
	problems: ChartProblem[];
	/** An empty list reads "No known allergies"; the Patient Header shows the same. */
	allergies: ChartAllergy[];
	medicalHistory: ChartHistoryItem[];
	surgicalHistory: ChartHistoryItem[];
	socialHistory: string[];
	homeMedications: ChartHomeMedication[];
	panels: ChartResultPanel[];
	cultures: ChartCulture[];
	imaging: ChartImagingReport[];
};

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

const severityLabels = { mild: "Mild", moderate: "Moderate", severe: "Severe" } as const;

const inpatientLabels = { held: "Held", continued: "Continued", changed: "Changed" } as const;

const TWELVE_HOURS = 12 * 60 * 60_000;

/** A time today, or a date and time for anything older (or before the first client render). */
function formatWhen(iso: string, now: number | null) {
	return now !== null && now - Date.parse(iso) < TWELVE_HOURS ? formatTime(iso) : formatDateTime(iso);
}

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
 * and previous value hide on a narrow column; the flag never does.
 */
function ResultsTable({ panels, now }: { panels: ChartResultPanel[]; now: number | null }) {
	return (
		<table className='w-full text-sm'>
			<caption className='sr-only'>Results by panel, newest first</caption>
			<thead>
				<tr className='border-b border-border text-left text-xs text-muted-foreground'>
					<th scope='col' className='py-1.5 pr-3 font-medium'>
						Test
					</th>
					<th scope='col' className='py-1.5 pr-3 font-medium'>
						Result
					</th>
					<th scope='col' className='hidden py-1.5 pr-3 font-medium @min-[40rem]:table-cell'>
						Range
					</th>
					<th scope='col' className='hidden py-1.5 pr-3 font-medium @min-[48rem]:table-cell'>
						Previous
					</th>
					<th scope='col' className='py-1.5 text-right font-medium'>
						Resulted
					</th>
				</tr>
			</thead>
			{panels.map((panel) => (
				<tbody key={panel.name} className='divide-y divide-border-muted'>
					<tr>
						<th scope='rowgroup' colSpan={5} className='pt-5 pb-1.5 text-left text-sm font-semibold text-foreground'>
							{panel.name}
						</th>
					</tr>
					{panel.results.map((result) => (
						<ResultRow key={result.name} result={result} now={now} />
					))}
				</tbody>
			))}
		</table>
	);
}

function ResultRow({ result, now }: { result: ChartResult; now: number | null }) {
	const flag = result.flag ? resultFlags[result.flag] : undefined;
	const direction = resultDirection(result);
	const status = result.status ?? "resulted";
	const hasValue = result.value !== undefined && status !== "pending" && status !== "none";

	return (
		<tr className='align-top'>
			<th scope='row' className='py-2 pr-3 text-left font-medium text-foreground'>
				{result.name}
			</th>
			<td className='py-2 pr-3'>
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
			</td>
			<td className='hidden py-2 pr-3 text-muted-foreground tabular-nums @min-[40rem]:table-cell'>{result.range ?? "--"}</td>
			<td className='hidden py-2 pr-3 text-muted-foreground tabular-nums @min-[48rem]:table-cell'>
				{result.previous ? (
					<>
						{direction ? <span aria-hidden='true'>{direction} </span> : null}
						{result.previous.value}
						<span className='text-xs'> · {formatWhen(result.previous.at, now)}</span>
					</>
				) : (
					"--"
				)}
			</td>
			<td className='py-2 text-right text-xs whitespace-nowrap text-muted-foreground tabular-nums'>
				{result.resultedAt ? formatWhen(result.resultedAt, now) : "--"}
			</td>
		</tr>
	);
}

/** One culture: specimen, collection time, status and the latest report, with susceptibilities once final. */
function CultureRow({ culture, now }: { culture: ChartCulture; now: number | null }) {
	const status = cultureStatuses[culture.status];
	return (
		<li className='flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0'>
			<div className='flex flex-wrap items-center justify-between gap-2'>
				<span className='text-sm font-medium text-foreground'>{culture.specimen}</span>
				<Badge variant={status.variant} size='xs'>
					{status.label}
				</Badge>
			</div>
			<p className='text-sm text-foreground'>
				{culture.organism ? <span className='font-semibold'>{culture.organism}. </span> : null}
				{culture.summary}
			</p>
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
			<p className='text-xs text-muted-foreground'>
				Collected {formatWhen(culture.collectedAt, now)}
				{culture.updatedAt ? ` · updated ${formatWhen(culture.updatedAt, now)}` : null}
			</p>
		</li>
	);
}

/** An imaging report: the impression first, the findings behind "Show full report" (Expand, as the triage evidence). */
function ImagingReport({ report, now }: { report: ChartImagingReport; now: number | null }) {
	const [open, setOpen] = React.useState(false);
	const findingsId = React.useId();
	return (
		<li className='flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0'>
			<div className='flex flex-wrap items-center justify-between gap-2'>
				<span className='text-sm font-medium text-foreground'>{report.study}</span>
				<Badge variant={report.status === "final" ? "outline" : "amber"} size='xs'>
					{report.status === "final" ? "Final" : "Preliminary"}
				</Badge>
			</div>
			<p className='text-sm text-foreground'>
				<span className='font-semibold'>Impression: </span>
				{report.impression}
			</p>
			<p className='text-xs text-muted-foreground'>
				{formatWhen(report.performedAt, now)}
				{report.readBy ? ` · read by ${report.readBy}` : null}
			</p>
			<div className='flex flex-col items-start gap-1.5'>
				<Button
					variant='ghost'
					size='xs'
					aria-expanded={open}
					aria-controls={findingsId}
					onClick={() => setOpen(!open)}
					className='-ml-2 text-link'
				>
					<ChevronDownIcon
						aria-hidden='true'
						className={cn("transition-transform duration-160 motion-reduce:transition-none", open && "rotate-180")}
					/>
					{open ? "Hide full report" : "Show full report"}
				</Button>
				{open ? (
					<p id={findingsId} className='w-full rounded-sm bg-background-subtle px-3 py-2 text-sm text-foreground'>
						<span className='font-semibold'>Findings: </span>
						{report.findings}
					</p>
				) : null}
			</div>
		</li>
	);
}

/* -------------------------------------------------------------------------- */
/* ChartSection                                                               */
/* -------------------------------------------------------------------------- */

type ChartSectionProps = { chart: PatientChart };

/**
 * The patient's record from the hospital, read only: results by panel, microbiology and imaging in the main column;
 * problems, allergies, history and home medications in a 22rem column beside them on a wide canvas, after them on a
 * narrow one.
 */
function ChartSection({ chart }: ChartSectionProps) {
	const now = useCurrentMinute();
	const source = freshness(chart.source, chart.updatedAt, now);
	const activeProblems = chart.problems.filter((problem) => problem.status === "active");
	const resolvedProblems = chart.problems.filter((problem) => problem.status === "resolved");

	return (
		<div className='@container'>
			<div className='grid gap-6 @min-[64rem]:grid-cols-[minmax(0,1fr)_22rem]'>
				<div className='flex min-w-0 flex-col gap-6 @container'>
					<SectionCard title='Results' meta={source}>
						{chart.panels.length ? (
							<ResultsTable panels={chart.panels} now={now} />
						) : (
							<NoData>No results in the last 72 hours.</NoData>
						)}
					</SectionCard>

					<div className='grid gap-6 @min-[44rem]:grid-cols-2'>
						<SectionCard title='Microbiology' meta={chart.source}>
							{chart.cultures.length ? (
								<ul className='flex flex-col divide-y divide-border-muted'>
									{chart.cultures.map((culture) => (
										<CultureRow key={`${culture.specimen}-${culture.collectedAt}`} culture={culture} now={now} />
									))}
								</ul>
							) : (
								<NoData>No cultures in the last 72 hours.</NoData>
							)}
						</SectionCard>

						<SectionCard title='Imaging reports' meta={chart.source}>
							{chart.imaging.length ? (
								<ul className='flex flex-col divide-y divide-border-muted'>
									{chart.imaging.map((report) => (
										<ImagingReport key={`${report.study}-${report.performedAt}`} report={report} now={now} />
									))}
								</ul>
							) : (
								<NoData>No imaging reports this stay.</NoData>
							)}
						</SectionCard>
					</div>
				</div>

				<div className='flex min-w-0 flex-col gap-6'>
					<SectionCard title='Problems' meta={chart.source}>
						{chart.problems.length ? (
							<div className='flex flex-col gap-3'>
								<ul className='flex flex-col gap-2'>
									{activeProblems.map((problem) => (
										<li key={problem.name} className='flex flex-col'>
											<span className='text-sm font-medium text-foreground'>{problem.name}</span>
											<span className='text-xs text-muted-foreground'>
												{[problem.onset ? `Since ${problem.onset}` : undefined, problem.notedBy].filter(Boolean).join(" · ")}
											</span>
										</li>
									))}
								</ul>
								{resolvedProblems.length ? (
									<div className='flex flex-col gap-1 border-t border-border-muted pt-3'>
										<h3 className='text-xs font-semibold text-muted-foreground'>Resolved</h3>
										<ul className='flex flex-col gap-1 text-sm text-muted-foreground'>
											{resolvedProblems.map((problem) => (
												<li key={problem.name}>
													{problem.name}
													{problem.onset ? ` · ${problem.onset}` : null}
												</li>
											))}
										</ul>
									</div>
								) : null}
							</div>
						) : (
							<NoData>No problems recorded.</NoData>
						)}
					</SectionCard>

					<SectionCard title='Allergies' meta={chart.source}>
						{chart.allergies.length ? (
							<ul className='flex flex-col gap-2'>
								{chart.allergies.map((allergy) => (
									<li key={allergy.substance} className='flex items-start justify-between gap-3'>
										<span className='flex flex-col'>
											<span className='text-sm font-medium text-foreground'>{allergy.substance}</span>
											{allergy.reaction ? <span className='text-xs text-muted-foreground'>{allergy.reaction}</span> : null}
										</span>
										{allergy.severity ? (
											<Badge variant={allergy.severity === "severe" ? "red" : "outline"} size='xs'>
												{severityLabels[allergy.severity]}
											</Badge>
										) : null}
									</li>
								))}
							</ul>
						) : (
							<NoData>No known allergies.</NoData>
						)}
					</SectionCard>

					<SectionCard title='History' meta={chart.source}>
						<dl className='flex flex-col gap-3'>
							<Detail label='Medical'>
								{chart.medicalHistory.length ? (
									<ul className='flex flex-col'>
										{chart.medicalHistory.map((item) => (
											<li key={item.name}>
												{item.name}
												{item.detail ? <span className='text-muted-foreground'> · {item.detail}</span> : null}
											</li>
										))}
									</ul>
								) : (
									<span className='text-muted-foreground'>None recorded</span>
								)}
							</Detail>
							<Detail label='Surgical'>
								{chart.surgicalHistory.length ? (
									<ul className='flex flex-col'>
										{chart.surgicalHistory.map((item) => (
											<li key={item.name}>
												{item.name}
												{item.detail ? <span className='text-muted-foreground'> · {item.detail}</span> : null}
											</li>
										))}
									</ul>
								) : (
									<span className='text-muted-foreground'>None recorded</span>
								)}
							</Detail>
							<Detail label='Social'>
								{chart.socialHistory.length ? chart.socialHistory.join(" · ") : <span className='text-muted-foreground'>None recorded</span>}
							</Detail>
						</dl>
					</SectionCard>

					<SectionCard title='Home medications' meta={chart.source}>
						{chart.homeMedications.length ? (
							<ul className='flex flex-col divide-y divide-border-muted'>
								{chart.homeMedications.map((medication) => (
									<li key={medication.name} className='flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0'>
										<span className='flex min-w-0 flex-col'>
											<span className='text-sm font-medium text-foreground'>{medication.name}</span>
											<span className='text-xs text-muted-foreground'>{medication.dose}</span>
										</span>
										{medication.inpatient ? (
											<span className='shrink-0 text-xs text-muted-foreground'>{inpatientLabels[medication.inpatient]}</span>
										) : null}
									</li>
								))}
							</ul>
						) : (
							<NoData>No home medications recorded.</NoData>
						)}
					</SectionCard>
				</div>
			</div>
		</div>
	);
}

export {
	ChartSection,
	type ChartAllergy,
	type ChartCulture,
	type ChartHistoryItem,
	type ChartHomeMedication,
	type ChartImagingReport,
	type ChartProblem,
	type ChartResult,
	type ChartResultFlag,
	type ChartResultPanel,
	type ChartSectionProps,
	type PatientChart,
};
