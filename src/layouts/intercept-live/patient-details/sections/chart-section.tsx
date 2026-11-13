import * as React from "react";
import { ChevronDownIcon } from "lucide-react";

import { Button } from "@/components/buttons/button";
import { Badge, type BadgeProps } from "@/components/data-display/badge";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/data-display/table";
import { useCurrentMinute } from "@/lib/hooks/use-current-minute";
import { cn } from "@/lib/utils";

import { Detail, formatDateTime, formatTime, freshness, NoData, SectionCard, SectionGroup } from "../section-parts";
import { SourceLabel } from "../../shared/source-label";

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
	/** Who added it to the problem list, e.g. "Laura Mitchell, MD". */
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
	/** The record it comes from, e.g. "Epic". The cards say "EMR" (`emrLabel`), as the tab does. */
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

/** What the cards call the hospital's record: the EMR tab's name. */
const emrLabel = "EMR";

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

/**
 * The Chart tab: the rest of the hospital's record, read only. Problems and history in the main column, allergies and
 * home medications in a 22rem column beside them on a wide canvas (after them on a narrow one), then imaging reports.
 */
function ChartSection({ chart }: ChartSectionProps) {
	const now = useCurrentMinute();
	const activeProblems = chart.problems.filter((problem) => problem.status === "active");
	const resolvedProblems = chart.problems.filter((problem) => problem.status === "resolved");

	return (
		<div className='@container'>
			<div className='grid gap-6 @min-[64rem]:grid-cols-[minmax(0,1fr)_22rem]'>
				<div className='flex min-w-0 flex-col gap-6'>
					<SectionCard title='Problems' meta={<SourceLabel>{emrLabel}</SourceLabel>}>
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
					<SectionCard title='History' meta={<SourceLabel>{emrLabel}</SourceLabel>}>
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
					<SectionCard title='Imaging reports' meta={<SourceLabel>{emrLabel}</SourceLabel>}>
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
				<div className='flex min-w-0 flex-col gap-6'>
					<SectionCard title='Allergies' meta={<SourceLabel>{emrLabel}</SourceLabel>}>
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
					<SectionCard title='Home medications' meta={<SourceLabel>{emrLabel}</SourceLabel>}>
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
	LabsSection,
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
