import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDownIcon, ArrowUpIcon, CircleCheckIcon, DownloadIcon, FileSpreadsheetIcon, MinusIcon } from "lucide-react";

import { Button } from "@/components/buttons/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/overlays/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/data-display/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/navigation/tabs";
import { Typography } from "@/components/typography/typography";
import { fadeVariants } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { SourceLabel } from "../shared/source-label";

// Exploration (PRD Outcomes dashboard): Scenario 6 of the Demo Use Cases closes on it. The pilot's outcomes for one month
// against the baseline before the pilot, in the grant's three groups (Access, Quality, Affordability), with one toggle
// that breaks every metric down by payer or by county rurality (who benefited), and one click that exports the
// quarterly DHHS report and the evidence pack for the next milestone payment. The month is static synthetic data in
// this build (Demo Use Cases: "Mock"); the exported files say so.

/* -------------------------------------------------------------------------- */
/* Data shapes (the app's API fills these)                                    */
/* -------------------------------------------------------------------------- */

/** How a metric's numbers read: 2,976 h, 6 min, 61%, 3.6 days, 0.93, $487K, 19. */
type OutcomeFormat = "hours" | "minutes" | "percent" | "days" | "ratio" | "usd" | "count";

/** One value: the baseline (null when there was none to measure) and the pilot's. */
type OutcomeValue = { baseline: number | null; pilot: number };

/** A way to break the metrics down, with its groups in the order they're shown. */
type OutcomeBreakdownId = "payer" | "rurality";

type OutcomeBreakdown = {
	id: OutcomeBreakdownId;
	/** The toggle's label: "By payer". */
	label: string;
	groups: { id: string; label: string; detail?: string; patients: number }[];
};

type OutcomeMetric = {
	id: string;
	label: string;
	/** What it counts, e.g. "Observed / expected deaths, risk-adjusted". */
	detail?: string;
	format: OutcomeFormat;
	/** Which way is better. */
	better: "up" | "down";
	overall: OutcomeValue;
	/**
	 * The values by breakdown, by group id. A group without one (null) isn't measured that way, e.g. coverage hours are a
	 * site's, not a patient's; `notByPatient` says why for the whole breakdown.
	 */
	by?: Partial<Record<OutcomeBreakdownId, Record<string, OutcomeValue | null>>>;
	/** Why the metric can't be broken down by patient (coverage hours: "A site measure"). */
	notByPatient?: string;
};

type OutcomeSection = {
	id: "access" | "quality" | "affordability";
	title: string;
	/** The grant's words for it, e.g. "Who can get ICU-level care, and how fast". */
	description: string;
	metrics: OutcomeMetric[];
};

/** One hospital's share of the month: transfers kept, their cost avoided, the revenue it kept. */
type OutcomeHospital = {
	id: string;
	name: string;
	role: "hub" | "spoke";
	transfersRetained: number;
	costAvoided: number;
	/** Null for the hub, whose patients were never the spokes' to keep. */
	revenueRetained: number | null;
};

/** A scenario the month includes, as it wrote its events to the outcomes layer. */
type OutcomeScenarioEvent = {
	id: string;
	scenario: string;
	patient: string;
	hospital: string;
	/** What was written, e.g. "Transfer avoided · Readmission avoided · Follow-up in 5 days". */
	written: string;
	payer: string;
};

/** What the quarterly export holds. */
type OutcomeReport = {
	/** "Q4 2026 DHHS quarterly report". */
	title: string;
	/** "Milestone 2 evidence pack". */
	evidenceTitle: string;
	/** What the report covers, one line each. */
	contents: string[];
	/** What the evidence pack holds, one line each. */
	evidence: string[];
};

type OutcomesData = {
	/** The month shown, e.g. "Oct 19 – Nov 18, 2026". */
	period: string;
	/** What the pilot is compared with, e.g. "the same month in 2025, before the pilot". */
	baseline: string;
	/** Where the numbers come from, e.g. "Outcomes layer: every alert, decision and outcome the platform recorded". */
	source: string;
	/** Synthetic data: the export says so (the report, the evidence pack and the export dialog). */
	synthetic?: boolean;
	/** The headline tiles, by metric id, in order. */
	headline: string[];
	breakdowns: OutcomeBreakdown[];
	sections: OutcomeSection[];
	hospitals: OutcomeHospital[];
	scenarios: OutcomeScenarioEvent[];
	report: OutcomeReport;
};

type AnalyticsPanelProps = {
	data: OutcomesData;
	/** The quarterly report exported (the prototype only reports it; the files are built in the page). */
	onExport?: () => void;
};

/* -------------------------------------------------------------------------- */
/* Formatting                                                                 */
/* -------------------------------------------------------------------------- */

const number = new Intl.NumberFormat("en-US");

/** A value in its format: "2,976 h", "6 min", "61%", "3.6 days", "0.93", "$487K", "19". */
function formatValue(value: number, format: OutcomeFormat) {
	switch (format) {
		case "hours":
			return `${number.format(value)} h`;
		case "minutes":
			return `${number.format(value)} min`;
		case "percent":
			return `${value}%`;
		case "days":
			return `${value.toFixed(1)} days`;
		case "ratio":
			return value.toFixed(2);
		case "usd":
			return value >= 1_000_000 ? `$${(value / 1_000_000).toFixed(1)}M` : value >= 1000 ? `$${Math.round(value / 1000)}K` : `$${value}`;
		case "count":
			return number.format(value);
	}
}

/** The change from the baseline: "−41 min", "+27 pts", "−0.21", or New when there was nothing before. */
function formatChange(value: OutcomeValue, format: OutcomeFormat, better: OutcomeMetric["better"]) {
	if (value.baseline === null || (value.baseline === 0 && value.pilot !== 0)) {
		return { text: "New", direction: "new" as const, words: "new with the pilot" };
	}
	const delta = value.pilot - value.baseline;
	const sign = delta > 0 ? "+" : delta < 0 ? "−" : "";
	const size = Math.abs(delta);
	const text =
		format === "percent"
			? `${sign}${Number(size.toFixed(1))} pts`
			: format === "ratio"
				? `${sign}${size.toFixed(2)}`
				: format === "days"
					? `${sign}${size.toFixed(1)} d`
					: format === "usd"
						? `${sign}${formatValue(size, "usd")}`
						: `${sign}${formatValue(size, format)}`;
	if (delta === 0) return { text: "No change", direction: "same" as const, words: "no change" };
	const improved = (delta > 0) === (better === "up");
	return { text, direction: improved ? ("better" as const) : ("worse" as const), words: improved ? "better" : "worse" };
}

/** The change, with an arrow and its color from whether it's better, never color alone (the words are read out). */
function Change({ value, metric, className }: { value: OutcomeValue; metric: OutcomeMetric; className?: string }) {
	const change = formatChange(value, metric.format, metric.better);
	const delta = value.baseline === null ? 0 : value.pilot - value.baseline;
	const Icon = change.direction === "new" || change.direction === "same" ? MinusIcon : delta > 0 ? ArrowUpIcon : ArrowDownIcon;
	return (
		<span
			data-direction={change.direction}
			className={cn(
				"inline-flex items-center gap-1 whitespace-nowrap",
				change.direction === "better" && "text-success",
				change.direction === "worse" && "text-destructive",
				(change.direction === "new" || change.direction === "same") && "text-muted-foreground",
				className,
			)}
		>
			{change.direction === "new" || change.direction === "same" ? null : <Icon aria-hidden='true' className='size-3.5' />}
			{change.text}
			<span className='sr-only'>, {change.words}</span>
		</span>
	);
}

/* -------------------------------------------------------------------------- */
/* Parts                                                                      */
/* -------------------------------------------------------------------------- */

/** A headline tile: the metric, the pilot's value, and its change from the baseline. */
function StatTile({ metric, baseline }: { metric: OutcomeMetric; baseline: string }) {
	return (
		<li className='flex flex-col gap-2 rounded-card border border-border bg-card p-4'>
			<span className='text-sm font-medium text-muted-foreground'>{metric.label}</span>
			<span className='font-display text-3xl font-semibold text-foreground'>
				{formatValue(metric.overall.pilot, metric.format)}
			</span>
			<span className='flex flex-wrap items-baseline gap-x-2 text-sm'>
				<Change value={metric.overall} metric={metric} className='font-semibold' />
				<span className='text-muted-foreground'>
					{metric.overall.baseline === null ? `vs ${baseline}` : `from ${formatValue(metric.overall.baseline, metric.format)}`}
				</span>
			</span>
		</li>
	);
}

/** One section's metrics: overall (baseline, pilot, change) or by the breakdown's groups (each group's pilot and change). */
function SectionTable({ section, breakdown }: { section: OutcomeSection; breakdown?: OutcomeBreakdown }) {
	const id = React.useId();
	return (
		<section aria-labelledby={id} className='flex flex-col gap-3'>
			<div className='flex flex-col gap-0.5'>
				<Typography as='h2' id={id} size='lg' weight='semibold'>
					{section.title}
				</Typography>
				<Typography size='sm' className='text-muted-foreground'>
					{section.description}
				</Typography>
			</div>
			<Table size='md' aria-labelledby={id}>
				<TableHeader variant='flat'>
					<TableRow>
						<TableHead className='w-[32%]'>Metric</TableHead>
						{breakdown ? (
							breakdown.groups.map((group) => (
								<TableHead key={group.id} className='text-right'>
									{group.label}
								</TableHead>
							))
						) : (
							<>
								<TableHead className='text-right'>Baseline</TableHead>
								<TableHead className='text-right'>Pilot</TableHead>
								<TableHead className='text-right'>Change</TableHead>
							</>
						)}
					</TableRow>
				</TableHeader>
				<TableBody>
					{section.metrics.map((metric) => (
						<TableRow key={metric.id}>
							<TableCell className='whitespace-normal'>
								<div className='flex flex-col gap-0.5'>
									<span>{metric.label}</span>
									{metric.detail ? <span className='text-xs font-normal text-muted-foreground'>{metric.detail}</span> : null}
								</div>
							</TableCell>
							{breakdown ? (
								breakdown.groups.map((group) => {
									const value = metric.by?.[breakdown.id]?.[group.id];
									return (
										<TableCell key={group.id} className='text-right'>
											{value ? (
												<div className='flex flex-col items-end gap-0.5'>
													<span className='font-medium text-foreground'>{formatValue(value.pilot, metric.format)}</span>
													<Change value={value} metric={metric} className='text-xs' />
												</div>
											) : (
												<span className='text-muted-foreground' title={metric.notByPatient}>
													—<span className='sr-only'>{metric.notByPatient ? `, ${metric.notByPatient}` : ", not measured"}</span>
												</span>
											)}
										</TableCell>
									);
								})
							) : (
								<>
									<TableCell className='text-right text-muted-foreground'>
										{metric.overall.baseline === null ? "—" : formatValue(metric.overall.baseline, metric.format)}
									</TableCell>
									<TableCell className='text-right font-semibold text-foreground'>
										{formatValue(metric.overall.pilot, metric.format)}
									</TableCell>
									<TableCell className='text-right'>
										<Change value={metric.overall} metric={metric} />
									</TableCell>
								</>
							)}
						</TableRow>
					))}
				</TableBody>
			</Table>
		</section>
	);
}

/** Each hospital's share of the month: the transfers it kept, their cost avoided, the revenue it kept. */
function HospitalsTable({ hospitals }: { hospitals: OutcomeHospital[] }) {
	const id = React.useId();
	return (
		<section aria-labelledby={id} className='flex flex-col gap-3'>
			<Typography as='h3' id={id} size='base' weight='semibold'>
				By hospital
			</Typography>
			<Table size='sm' aria-labelledby={id}>
				<TableHeader variant='flat'>
					<TableRow>
						<TableHead>Hospital</TableHead>
						<TableHead className='text-right'>Transfers kept</TableHead>
						<TableHead className='text-right'>Transfer costs avoided</TableHead>
						<TableHead className='text-right'>Revenue kept</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{hospitals.map((hospital) => (
						<TableRow key={hospital.id}>
							<TableCell>
								{hospital.name}
								{hospital.role === "hub" ? <span className='font-normal text-muted-foreground'> · hub</span> : null}
							</TableCell>
							<TableCell className='text-right'>{hospital.transfersRetained}</TableCell>
							<TableCell className='text-right'>{formatValue(hospital.costAvoided, "usd")}</TableCell>
							<TableCell className='text-right'>
								{hospital.revenueRetained === null ? (
									<span className='text-muted-foreground'>
										—<span className='sr-only'>, not a spoke</span>
									</span>
								) : (
									formatValue(hospital.revenueRetained, "usd")
								)}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</section>
	);
}

/** The demo's scenarios in the month, as each wrote its events to the outcomes layer. */
function ScenariosTable({ scenarios }: { scenarios: OutcomeScenarioEvent[] }) {
	const id = React.useId();
	return (
		<section aria-labelledby={id} className='flex flex-col gap-3'>
			<div className='flex flex-col gap-0.5'>
				<Typography as='h2' id={id} size='lg' weight='semibold'>
					Events this month includes
				</Typography>
				<Typography size='sm' className='text-muted-foreground'>
					Each scenario wrote its events to the outcomes layer, so the metrics above count them.
				</Typography>
			</div>
			<Table size='md' aria-labelledby={id}>
				<TableHeader variant='flat'>
					<TableRow>
						<TableHead>Patient</TableHead>
						<TableHead>What was written</TableHead>
						<TableHead>Payer</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{scenarios.map((event) => (
						<TableRow key={event.id}>
							<TableCell>
								<div className='flex flex-col gap-0.5'>
									<span>{event.patient}</span>
									<span className='text-xs font-normal text-muted-foreground'>
										{event.scenario} · {event.hospital}
									</span>
								</div>
							</TableCell>
							<TableCell className='whitespace-normal'>{event.written}</TableCell>
							<TableCell className='text-muted-foreground'>{event.payer}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</section>
	);
}

/* -------------------------------------------------------------------------- */
/* Export                                                                     */
/* -------------------------------------------------------------------------- */

const csvCell = (value: string | number) => {
	const text = String(value);
	return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};
const csv = (rows: (string | number)[][]) => rows.map((row) => row.map(csvCell).join(",")).join("\n");

/** The report: every metric overall, then by each breakdown's groups. */
function reportCsv(data: OutcomesData) {
	const rows: (string | number)[][] = [
		[data.report.title],
		["Period", data.period],
		["Baseline", data.baseline],
		...(data.synthetic ? [["Synthetic data: not real outcomes"]] : []),
		[],
		["Group", "Metric", "Breakdown", "Group", "Baseline", "Pilot"],
	];
	for (const section of data.sections) {
		for (const metric of section.metrics) {
			const value = (item: OutcomeValue) => [item.baseline === null ? "" : item.baseline, item.pilot];
			rows.push([section.title, metric.label, "Overall", "All patients", ...value(metric.overall)]);
			for (const breakdown of data.breakdowns) {
				for (const group of breakdown.groups) {
					const item = metric.by?.[breakdown.id]?.[group.id];
					if (item) rows.push([section.title, metric.label, breakdown.label, group.label, ...value(item)]);
				}
			}
		}
	}
	return csv(rows);
}

/** The evidence pack: the scenarios' events and each hospital's share. */
function evidenceCsv(data: OutcomesData) {
	return csv([
		[data.report.evidenceTitle],
		["Period", data.period],
		...(data.synthetic ? [["Synthetic data: not real outcomes"]] : []),
		[],
		["Scenario", "Patient", "Hospital", "Payer", "Written to the outcomes layer"],
		...data.scenarios.map((event) => [event.scenario, event.patient, event.hospital, event.payer, event.written]),
		[],
		["Hospital", "Role", "Transfers kept", "Transfer costs avoided (USD)", "Revenue kept (USD)"],
		...data.hospitals.map((hospital) => [
			hospital.name,
			hospital.role,
			hospital.transfersRetained,
			hospital.costAvoided,
			hospital.revenueRetained ?? "",
		]),
	]);
}

function download(name: string, content: string) {
	const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
	const link = document.createElement("a");
	link.href = url;
	link.download = name;
	link.click();
	window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const fileName = (title: string) =>
	`${title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")}.csv`;

/**
 * The export, opened by its one click: it builds the report and the evidence pack (a moment, then ready), says what each
 * holds, and downloads each one.
 */
function ExportDialog({ data, open, onOpenChange }: { data: OutcomesData; open: boolean; onOpenChange: (open: boolean) => void }) {
	const [ready, setReady] = React.useState(false);
	React.useEffect(() => {
		if (!open) return;
		setReady(false);
		const timer = window.setTimeout(() => setReady(true), 1200);
		return () => window.clearTimeout(timer);
	}, [open]);
	const files = [
		{ title: data.report.title, lines: data.report.contents, build: () => reportCsv(data) },
		{ title: data.report.evidenceTitle, lines: data.report.evidence, build: () => evidenceCsv(data) },
	];
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='w-[520px]'>
				<DialogHeader>
					<DialogTitle>Quarterly report</DialogTitle>
					<DialogDescription>
						{data.period} against {data.baseline}.
						{data.synthetic ? " Built from synthetic data: not real outcomes." : null}
					</DialogDescription>
				</DialogHeader>
				<div className='flex flex-col gap-3 px-6 pb-2'>
					<AnimatePresence mode='wait' initial={false}>
						{ready ? (
							<motion.ul key='ready' variants={fadeVariants} initial='initial' animate='animate' exit='exit' className='flex flex-col gap-3'>
								{files.map((file) => (
									<li key={file.title} className='flex flex-col gap-2 rounded-card border border-border p-4'>
										<div className='flex items-start justify-between gap-3'>
											<span className='flex items-center gap-2 text-sm font-semibold text-foreground'>
												<FileSpreadsheetIcon aria-hidden='true' className='size-4 text-icon-subtle' />
												{file.title}
											</span>
											<Button
												variant='outline'
												size='sm'
												aria-label={`Download ${file.title}`}
												onClick={() => download(fileName(file.title), file.build())}
											>
												<DownloadIcon />
												CSV
											</Button>
										</div>
										<ul className='list-disc pl-5 text-sm text-muted-foreground'>
											{file.lines.map((line) => (
												<li key={line}>{line}</li>
											))}
										</ul>
									</li>
								))}
							</motion.ul>
						) : (
							<motion.p
								key='building'
								role='status'
								variants={fadeVariants}
								initial='initial'
								animate='animate'
								exit='exit'
								className='py-6 text-center text-sm text-muted-foreground'
							>
								Building the report and the evidence pack…
							</motion.p>
						)}
					</AnimatePresence>
					{ready ? (
						<p role='status' className='flex items-center gap-2 text-sm text-foreground'>
							<CircleCheckIcon aria-hidden='true' className='size-4 text-success' />
							Ready to send with the quarterly filing
						</p>
					) : null}
				</div>
				<DialogFooter>
					<Button variant='outline' onClick={() => onOpenChange(false)}>
						Close
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

/* -------------------------------------------------------------------------- */
/* AnalyticsPanel                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Intercept Live's Analytics page: the outcomes dashboard (PRD Outcomes dashboard). The pilot's month against the
 * baseline: headline tiles, then Access, Quality and Affordability, each hospital's share and the events the month
 * includes. "Overall · By payer · By rurality" breaks every metric down by group; payer and rurality are for reporting
 * only. Export quarterly report builds the DHHS report and the milestone evidence pack in one click.
 */
function AnalyticsPanel({ data, onExport }: AnalyticsPanelProps) {
	const [view, setView] = React.useState<"overall" | OutcomeBreakdownId>("overall");
	const [exporting, setExporting] = React.useState(false);
	const breakdown = data.breakdowns.find((item) => item.id === view);
	const metrics = data.sections.flatMap((section) => section.metrics);
	const headline = data.headline
		.map((id) => metrics.find((metric) => metric.id === id))
		.filter((metric): metric is OutcomeMetric => Boolean(metric));

	return (
		<>
			{/* The breakdown, right under the header, as the Inbox's tab bar. */}
			<div className='flex flex-wrap items-center justify-between gap-x-6 border-b border-border pr-6 pl-4'>
				<Tabs value={view} onValueChange={(value) => setView(value as typeof view)} className='-mb-px min-w-0'>
					<TabsList variant='line' size='lg' aria-label='Break down by'>
						<TabsTrigger value='overall'>Overall</TabsTrigger>
						{data.breakdowns.map((item) => (
							<TabsTrigger key={item.id} value={item.id}>
								{item.label}
							</TabsTrigger>
						))}
					</TabsList>
				</Tabs>
				<Typography size='sm' className='hidden shrink-0 text-muted-foreground md:block'>
					Payer and rurality are for reporting only, never a score
				</Typography>
			</div>

			<main className='flex min-w-0 flex-1 flex-col gap-8 p-6'>
				<div className='flex flex-wrap items-start justify-between gap-4'>
					<div className='flex flex-col gap-1'>
						{/* No Synthetic data badge (Nov 18, 2026, user's call); the export still says so. */}
						<Typography as='h1' size='2xl' weight='bold'>
							Outcomes
						</Typography>
						<Typography size='sm' className='text-muted-foreground'>
							{data.period} · compared with {data.baseline}
						</Typography>
						<SourceLabel className='text-xs text-muted-foreground'>{data.source}</SourceLabel>
					</div>
					<Button
						variant='neutral'
						onClick={() => {
							setExporting(true);
							onExport?.();
						}}
					>
						<DownloadIcon />
						Export quarterly report
					</Button>
				</div>

				<ul aria-label='Headline outcomes' className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
					{headline.map((metric) => (
						<StatTile key={metric.id} metric={metric} baseline={data.baseline} />
					))}
				</ul>

				<AnimatePresence mode='wait' initial={false}>
					<motion.div
						key={view}
						variants={fadeVariants}
						initial='initial'
						animate='animate'
						exit='exit'
						className='flex flex-col gap-8'
					>
						{breakdown ? (
							<p className='text-sm text-muted-foreground'>
								Each group's pilot value, then its change from its own baseline.{" "}
								{breakdown.groups.map((group) => `${group.label}: ${group.patients} patients`).join(" · ")}
							</p>
						) : null}
						{data.sections.map((section) => (
							<React.Fragment key={section.id}>
								<SectionTable section={section} breakdown={breakdown} />
								{section.id === "affordability" && !breakdown ? <HospitalsTable hospitals={data.hospitals} /> : null}
							</React.Fragment>
						))}
					</motion.div>
				</AnimatePresence>

				<ScenariosTable scenarios={data.scenarios} />
			</main>

			<ExportDialog data={data} open={exporting} onOpenChange={setExporting} />
		</>
	);
}

export {
	AnalyticsPanel,
	formatChange,
	formatValue,
	type AnalyticsPanelProps,
	type OutcomeBreakdown,
	type OutcomeBreakdownId,
	type OutcomeFormat,
	type OutcomeHospital,
	type OutcomeMetric,
	type OutcomeReport,
	type OutcomeScenarioEvent,
	type OutcomeSection,
	type OutcomesData,
	type OutcomeValue,
};
