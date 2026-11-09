import * as React from "react";
import { BellIcon, ChevronDownIcon, ChevronRightIcon, GitBranchIcon } from "lucide-react";
import { AnimatePresence, motion, type Variants } from "motion/react";

import { Button } from "@/components/buttons/button";
import { patientCardAcuityLevels } from "@/components/cards/patient-census-card";
import { AlertBar, PatientMonitor } from "@/components/cards/patient-monitoring-card";
import { Badge, type BadgeProps } from "@/components/data-display/badge";
import { LabTile } from "@/components/data-display/lab-tile";
import { useCurrentMinute } from "@/lib/hooks/use-current-minute";
import { formatRelativeDate } from "@/lib/relative-date";
import {
	reducedMotionTransition,
	reorderSpring,
	revealVariants,
	rowRemoveVariants,
	useMotionPreference,
} from "@/lib/motion";
import { cn } from "@/lib/utils";

import { alertSourceLabels, useAlertLifecycle, type AlertDetailData } from "../alert-panel/alert-panel";
import type { CarePathwayStatus } from "../alert-panel/care-pathway";
import {
	compareTriageAlerts,
	isOpenAlert,
	lastFiredAt,
	sortAddressedAlerts,
	type TriageAlert,
	type TriageAlertAction,
} from "../monitoring/triage-queue";
import { usePatientNavigation } from "../patient-navigation";
import { SourceLabel } from "../shared/source-label";
import {
	activityTimelineKinds,
	CarePlanCard,
	type PatientActivity,
	type PatientPathwayRunning,
	type PatientPathwaySuggestion,
} from "./activity";
import aiBriefIcon from "./images/ai-brief.svg";
import type { PatientBrief, PatientDetailsProps, PatientEarlyWarning, PatientRecord } from "./patient-details";
import { Detail, formatElapsed, formatTime, freshness, NoData, SectionCard } from "./section-parts";
import { timelineEventKinds, type TimelineEventKind } from "./sections/timeline-section";

// The Overview (PRD Patient details §5; Intercept-Live `149:4464`, Nov 6, 2026): what matters about the patient now, and
// what's being done about it. The brief across the top. The main column reads down a time line: the open alerts with
// their actions, the care plan in force, what's due next, a Now line, then what happened, newest first, shaded since the
// clinician last looked. The rail holds the patient's state: the live monitor, the early warning score, key labs, oxygen
// and infusions with intake and output, medications, recent orders and the encounter. Data that's missing says it's
// missing, and only an empty list says there's none.

/** The Overview's parts the patient header's "View breakdown" and "View alerts" bring into view. */
const overviewSectionIds = { earlyWarning: "patient-overview-early-warning", alerts: "patient-overview-alerts" } as const;

/** The tabs the Overview links to. */
type OverviewLinkedSection = "timeline" | "medications" | "orders";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** How far ahead Up next looks, and how far back the log goes before "Show earlier". */
const UP_NEXT_HOURS = 12;
const LOG_HOURS = 24;
/** Up next's items before "Show all". */
const UP_NEXT_ITEMS = 5;
/** The log's entries before "Show earlier". */
const LOG_ENTRIES = 12;

/** The latest of the timestamps, for a section's freshness. */
const latest = (times: (string | undefined)[]) =>
	times.reduce<string | undefined>((last, time) => (time && (!last || time > last) ? time : last), undefined);

/** "45 min", "2 h 39 min", "5 h". */
function formatSpan(minutes: number) {
	const hours = Math.floor(minutes / 60);
	const rest = minutes % 60;
	if (!hours) return `${rest} min`;
	return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

/** When something is due, as a chip: overdue in red, within the hour in amber, later in grey. */
function dueChip(at: string, now: number): { label: string; variant: BadgeProps["variant"] } {
	const minutes = Math.round((Date.parse(at) - now) / MINUTE);
	if (minutes < 0) return { label: `Overdue ${formatSpan(-minutes)}`, variant: "red" };
	if (minutes < 1) return { label: "Due now", variant: "amber" };
	if (minutes <= 60) return { label: `In ${formatSpan(minutes)}`, variant: "amber" };
	return { label: `In ${formatSpan(minutes)}`, variant: "secondary" };
}

/* -------------------------------------------------------------------------- */
/* Brief                                                                      */
/* -------------------------------------------------------------------------- */

/** What the brief asks Ask Intercept Live when it's clicked: the summary behind it and what changed since the last look. */
const briefQuestion = "Summarize what's behind the brief";

/**
 * The AI brief (PRD PD-024; Intercept-Live `149:4464`): what matters now in a sentence or two, across the top. Marked as
 * Intercept's by its icon and for screen readers, with how many sources it read and how fresh it is. With `onAsk` the
 * whole banner is a button (Nov 6, 2026, user's call): it opens Ask Intercept Live about the patient and asks what's
 * behind the brief, which answers with the details and what changed since the clinician last looked.
 */
function BriefBanner({ brief, now, onAsk }: { brief: PatientBrief; now: number | null; onAsk?: () => void }) {
	const content = (
		<>
			<img src={aiBriefIcon} alt='' className='size-4 shrink-0' />
			{/* One line, cut off with an ellipsis (Nov 6, 2026, user's call); the whole brief is in the hover title and
			    for screen readers, and the banner opens it in Ask Intercept Live. */}
			<span title={brief.text} className='min-w-0 flex-1 truncate text-base text-foreground'>
				<span className='sr-only'>Written by Intercept: </span>
				{brief.text}
			</span>
			<SourceLabel className='shrink-0 text-xs text-muted-foreground'>
				{brief.sourceCount} sources{now === null ? null : ` · ${formatElapsed(brief.updatedAt, now)}`}
			</SourceLabel>
			{onAsk ? (
				<ChevronRightIcon
					aria-hidden='true'
					className='size-4 shrink-0 text-tone-accent transition-transform duration-160 ease-out group-hover/brief:translate-x-0.5 motion-reduce:transition-none'
				/>
			) : null}
		</>
	);
	const surface = "flex w-full items-center gap-3 rounded-lg border border-tone-accent-defined bg-tone-accent-subtle px-4 py-2 text-left";

	return (
		<section aria-label='Brief'>
			{onAsk ? (
				<button
					type='button'
					onClick={onAsk}
					title='Ask Intercept Live for more'
					className={cn(
						surface,
						"group/brief outline-none transition-colors duration-160 ease-out hover:border-tone-accent hover:bg-tone-accent-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none",
					)}
				>
					{content}
					<span className='sr-only'>. Ask Intercept Live for more.</span>
				</button>
			) : (
				<p className={surface}>{content}</p>
			)}
		</section>
	);
}

/* -------------------------------------------------------------------------- */
/* Alerts                                                                     */
/* -------------------------------------------------------------------------- */

// The alert panel's tones (UCL AlertModal): a pale fill, the title in the darkest step, the source a step lighter.
const alertTones = {
	critical: { panel: "bg-severity-critical-subtle", title: "text-severity-critical-strong", source: "text-severity-critical-prominent" },
	high: { panel: "bg-severity-high-subtle", title: "text-severity-high-strong", source: "text-severity-high-prominent" },
	medium: { panel: "bg-severity-medium-subtle", title: "text-severity-medium-strong", source: "text-severity-medium-prominent" },
	low: { panel: "bg-severity-low-subtle", title: "text-severity-low-strong", source: "text-severity-low-prominent" },
	resolved: { panel: "bg-badge-green", title: "text-foreground", source: "text-muted-foreground" },
} as const;

// Cards Reveal in and fade out while the others glide, as the triage queue's rows do; a fade under reduced motion.
const cardVariants: Variants = { ...revealVariants, exit: rowRemoveVariants.exit };
const reducedCardVariants: Variants = {
	initial: { opacity: 0 },
	animate: { opacity: 1, transition: reducedMotionTransition },
	exit: { opacity: 0, transition: reducedMotionTransition },
};

/**
 * One alert as the alert panel shows it (PRD PD-020): its bar (which opens the alert, with the consult, the pathway and
 * the messages), the reason and title, the source with Feedback for an AI alert, who did what, and the lifecycle
 * buttons with their forms. The same hook as the alert panel, so an action here is the same action there.
 */
function OverviewAlertCard({
	alert,
	inLast24h,
	escalationTargets,
	onAlertAction,
	onOpen,
}: {
	alert: TriageAlert;
	inLast24h: number;
	escalationTargets: NonNullable<PatientDetailsProps["escalationTargets"]>;
	onAlertAction?: (alertId: string, action: TriageAlertAction) => void;
	onOpen?: () => void;
}) {
	const lifecycle = useAlertLifecycle({
		alert,
		escalationTargets,
		onAction: onAlertAction ? (action) => onAlertAction(alert.id, action) : undefined,
	});
	const resolved = !isOpenAlert(alert);
	const tones = alertTones[resolved ? "resolved" : alert.severity];
	const headingId = React.useId();

	return (
		<div
			role='group'
			aria-labelledby={headingId}
			className={cn("flex flex-col gap-2 overflow-hidden rounded-xl pb-1.5", tones.panel)}
		>
			<AlertBar
				alert={{
					variant: resolved ? "resolved" : alert.severity,
					inLast24h,
					since: resolved ? (alert.addressed?.at ?? alert.firedAt) : alert.firedAt,
				}}
				size='md'
				onOpen={onOpen}
				className='rounded-none'
			/>
			<div className='flex flex-col gap-2 px-4 pb-2.5'>
				{/* The reason leads; the alert's own title follows it, as in the alert panel. */}
				<div>
					<h3 id={headingId} className={cn("text-lg font-bold", tones.title)}>
						{alert.reason ?? alert.title}
					</h3>
					{alert.reason ? <p className={cn("text-sm", tones.title)}>{alert.title}</p> : null}
				</div>
				<div className='flex flex-col gap-0.5'>
					<div className={cn("flex items-start justify-between gap-3 text-sm", tones.source)}>
						<p className='flex items-start gap-1.5'>
							<span className='flex h-[1lh] shrink-0 items-center'>
								<GitBranchIcon aria-hidden='true' className='size-3' />
							</span>
							<span>
								Source: {alertSourceLabels[alert.source.kind]} · {alert.source.name}
							</span>
						</p>
						{lifecycle.feedbackNode ? <div className='flex h-[1lh] shrink-0 items-center'>{lifecycle.feedbackNode}</div> : null}
					</div>
					{lifecycle.statusNode}
				</div>
				{lifecycle.alertActionsNode ? <div className='flex gap-2'>{lifecycle.alertActionsNode}</div> : null}
				{lifecycle.formNode}
			</div>
		</div>
	);
}

/**
 * The patient's alerts (PRD PD-020, mandatory, PRD §3.4): every open one, highest severity first, then the ones addressed
 * this shift behind "Show resolved". With none open: "No active alerts · Last alert 2:14 PM" (MON-051).
 */
function AlertsSection({
	patientId,
	alerts,
	escalationTargets,
	onAlertAction,
}: {
	patientId: string;
	alerts: TriageAlert[];
	escalationTargets: NonNullable<PatientDetailsProps["escalationTargets"]>;
	onAlertAction?: (alertId: string, action: TriageAlertAction) => void;
}) {
	const navigation = usePatientNavigation();
	const { prefersReducedMotion, resolve } = useMotionPreference();
	const [showResolved, setShowResolved] = React.useState(false);
	const now = useCurrentMinute();
	const active = alerts.filter(isOpenAlert).sort(compareTriageAlerts);
	const resolved = sortAddressedAlerts(alerts.filter((alert) => !isOpenAlert(alert)));
	const lastFired = lastFiredAt(alerts);
	const inLast24h = now === null ? alerts.length : alerts.filter((alert) => now - Date.parse(alert.firedAt) < 24 * HOUR).length;
	const shown = showResolved ? [...active, ...resolved] : active;
	const order = shown.map((alert) => alert.id).join();

	return (
		<section
			id={overviewSectionIds.alerts}
			aria-label='Alerts'
			tabIndex={-1}
			className='flex scroll-mt-20 flex-col gap-3 outline-none'
		>
			{active.length ? null : (
				<p className='flex items-center gap-2 rounded-xl bg-background-subtle px-4 py-2.5 text-sm text-muted-foreground'>
					<BellIcon aria-hidden='true' className='size-4 shrink-0' />
					{lastFired ? `No active alerts · Last alert ${formatTime(lastFired)}` : "No active alerts"}
				</p>
			)}
			<AnimatePresence initial={false}>
				{shown.map((alert) => (
					<motion.div
						key={alert.id}
						layout='position'
						layoutDependency={order}
						variants={prefersReducedMotion ? reducedCardVariants : cardVariants}
						initial='initial'
						animate='animate'
						exit='exit'
						transition={{ layout: resolve(reorderSpring) }}
					>
						<OverviewAlertCard
							alert={alert}
							inLast24h={inLast24h}
							escalationTargets={escalationTargets}
							onAlertAction={onAlertAction}
							onOpen={navigation ? () => navigation.openAlert(patientId, alert.id) : undefined}
						/>
					</motion.div>
				))}
			</AnimatePresence>
			{resolved.length ? (
				<Button
					variant='ghost'
					size='xs'
					aria-expanded={showResolved}
					onClick={() => setShowResolved(!showResolved)}
					className='self-start text-link'
				>
					<ChevronDownIcon
						aria-hidden='true'
						className={cn("transition-transform duration-160 motion-reduce:transition-none", showResolved && "rotate-180")}
					/>
					{showResolved ? "Hide resolved" : `Show resolved (${resolved.length})`}
				</Button>
			) : null}
		</section>
	);
}

/* -------------------------------------------------------------------------- */
/* Up next, Now and the log                                                   */
/* -------------------------------------------------------------------------- */

type UpNextItem = { id: string; at: string; title: string; detail?: string };

/**
 * The pathway an open alert brought, as the Overview shows it (Nov 6, 2026): the alert's detail (its pathway, sepsis
 * bundle, protocol and bedside tasks), where the pathway is now, and the way to the page's Pathway panel.
 */
type OverviewPathway = {
	detail: AlertDetailData;
	status: CarePathwayStatus;
	onOpen?: () => void;
};

/** A bedside task is overdue 10 min past its due time (DU-25), as in the alert's task list. */
const TASK_OVERDUE_AFTER = 10 * MINUTE;

/**
 * The Care plan's lines from the pathway: the suggestion while nobody has decided on it, and what it runs now, a line
 * each: the hour-1 bundle (done so far, time left), the protocol (its next check), the bedside tasks once the orders are
 * sent (how many are open, overdue ones first).
 */
function pathwaySummary(
	{ detail, status }: OverviewPathway,
	now: number | null,
): { suggestion?: PatientPathwaySuggestion; running: PatientPathwayRunning[] } {
	const running: PatientPathwayRunning[] = [];
	const { bundle, protocol, tasks, pathway } = detail;
	if (bundle) {
		const elements = bundle.elements.filter((element) => element.status !== "not-applicable");
		const done = elements.filter((element) => element.status === "complete").length;
		const left = now === null ? null : Math.round((Date.parse(bundle.startedAt) + HOUR - now) / MINUTE);
		running.push({
			label: "Hour-1 sepsis bundle",
			detail: [
				`${done} of ${elements.length} done`,
				done === elements.length || left === null
					? undefined
					: left >= 0
						? `${formatSpan(left)} left`
						: `Past the hour by ${formatSpan(-left)}`,
			]
				.filter(Boolean)
				.join(" · "),
			overdue: left !== null && left < 0 && done < elements.length,
		});
	}
	if (protocol) {
		const next = protocol.checks.find((check) => check.status !== "done");
		running.push({
			label: protocol.title,
			detail: protocol.stopped
				? "Drip stopped"
				: protocol.gapClosed
					? `Gap closed at hour ${protocol.gapClosed.hour}`
					: next
						? `Hour ${next.hour} check ${next.status === "upcoming" ? `at ${formatTime(next.at)}` : next.status}`
						: undefined,
			overdue: !protocol.stopped && next?.status === "overdue",
		});
	}
	const sent = status === "pending" || status === "active";
	if (tasks && sent) {
		const open = tasks.tasks.filter((task) => task.status === "open");
		const overdue =
			now === null ? [] : open.filter((task) => task.dueAt && now - Date.parse(task.dueAt) > TASK_OVERDUE_AFTER);
		if (open.length)
			running.push({
				label: "Bedside tasks",
				detail: [
					`${open.length} open`,
					overdue.length ? `${overdue.length} overdue` : undefined,
					`shared with ${tasks.sharedWith}`,
				]
					.filter(Boolean)
					.join(" · "),
				overdue: overdue.length > 0,
			});
	}
	return {
		suggestion:
			pathway && status === "suggested"
				? { title: pathway.title, source: pathway.source, orders: pathway.orders.length }
				: undefined,
		running,
	};
}

/** What the pathway has due: the bundle's open elements, the protocol's checks, and the open bedside tasks once sent. */
function pathwayUpNext({ detail, status }: OverviewPathway): UpNextItem[] {
	const { bundle, protocol, tasks } = detail;
	const sent = status === "pending" || status === "active";
	return [
		...(bundle?.elements ?? []).flatMap((element) =>
			element.status === "pending" || element.status === "in-progress"
				? [
						{
							id: `bundle-${element.id}`,
							at: new Date(Date.parse(bundle!.startedAt) + (element.dueAfter ?? 60) * MINUTE).toISOString(),
							title: element.label,
							detail: `Hour-1 sepsis bundle · ${element.target}`,
						},
					]
				: [],
		),
		// The checks open now (due or overdue), then only the next one coming.
		...(protocol && !protocol.stopped
			? [
					...protocol.checks.filter((check) => check.status === "due" || check.status === "overdue"),
					...protocol.checks.filter((check) => check.status === "upcoming").slice(0, 1),
				]
			: []
		).map((check) => ({ id: `dka-${check.id}`, at: check.at, title: `Hour ${check.hour} check`, detail: protocol!.title })),
		...(tasks && sent ? tasks.tasks : []).flatMap((task) =>
			task.status === "open" && task.dueAt
				? [{ id: `task-${task.id}`, at: task.dueAt, title: task.title, detail: `${task.assignee} · ${task.from}` }]
				: [],
		),
	];
}

/**
 * What's due in the next hours, soonest first: scheduled medications, the care plan's checkpoints not yet recorded,
 * order recommendations waiting with a due time, and what the pathway has due (its bundle, protocol checks and tasks).
 */
function upNextItems(record: PatientRecord | undefined, now: number, pathway?: OverviewPathway): UpNextItem[] {
	const until = now + UP_NEXT_HOURS * HOUR;
	const items: UpNextItem[] = [
		...(record?.medications?.scheduled ?? []).flatMap((med) =>
			med.nextDueAt
				? [
						{
							id: `med-${med.drug}`,
							at: med.nextDueAt,
							title: `${med.drug} ${med.dose === "Per scale" ? "" : `${med.dose} `}${med.route}`.trim(),
							detail: [med.frequency, med.indication].filter(Boolean).join(" · "),
						},
					]
				: [],
		),
		...(record?.carePlan?.transfer?.checkpoints ?? []).flatMap((checkpoint) =>
			checkpoint.result
				? []
				: [
						{
							id: `checkpoint-${checkpoint.id}`,
							at: checkpoint.due,
							title: `${checkpoint.label} checkpoint: ${record?.carePlan?.transfer?.label.toLowerCase()}`,
							detail: checkpoint.criteria,
						},
					],
		),
		...(record?.orders?.recommendations ?? []).flatMap((recommendation) =>
			recommendation.dueAt && !recommendation.outcome
				? [{ id: `rec-${recommendation.id}`, at: recommendation.dueAt, title: recommendation.title, detail: recommendation.order }]
				: [],
		),
		...(pathway ? pathwayUpNext(pathway) : []),
	];
	// Overdue items stay until they're done; the rest only within the window.
	return items.filter((item) => Date.parse(item.at) <= until).sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

/** What's due next (Intercept-Live `149:4464`), soonest first, each with its time and how soon. */
function UpNextCard({ record, now, pathway }: { record?: PatientRecord; now: number | null; pathway?: OverviewPathway }) {
	const [showAll, setShowAll] = React.useState(false);
	const items = now === null ? [] : upNextItems(record, now, pathway);
	const shown = showAll ? items : items.slice(0, UP_NEXT_ITEMS);
	return (
		<SectionCard title='Up next' meta={`Next ${UP_NEXT_HOURS} h`}>
			{items.length ? (
				<ol className='flex flex-col gap-1'>
					{shown.map((item) => {
						const chip = now === null ? undefined : dueChip(item.at, now);
						return (
							<li
								key={item.id}
								className='grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-start gap-x-3 rounded-lg bg-background-subtle px-3 py-2'
							>
								<time dateTime={item.at} className='pt-px text-sm text-muted-foreground tabular-nums'>
									{formatTime(item.at)}
								</time>
								<div className='flex min-w-0 flex-col'>
									<span className='text-sm font-medium text-foreground'>{item.title}</span>
									{item.detail ? <span className='text-xs text-muted-foreground'>{item.detail}</span> : null}
								</div>
								{chip ? (
									<Badge variant={chip.variant} size='xs'>
										{chip.label}
									</Badge>
								) : null}
							</li>
						);
					})}
				</ol>
			) : (
				<NoData>Nothing scheduled in the next {UP_NEXT_HOURS} hours.</NoData>
			)}
			{items.length > UP_NEXT_ITEMS ? (
				<Button
					variant='ghost'
					size='xs'
					aria-expanded={showAll}
					onClick={() => setShowAll(!showAll)}
					className='-mt-1 self-start text-link'
				>
					<ChevronDownIcon
						aria-hidden='true'
						className={cn("transition-transform duration-160 motion-reduce:transition-none", showAll && "rotate-180")}
					/>
					{showAll ? "Show fewer" : `Show all ${items.length}`}
				</Button>
			) : null}
		</SectionCard>
	);
}

type LogEntry = {
	id: string;
	at: string;
	/** For the dot's color, as on the Timeline's events lane. */
	kind: TimelineEventKind;
	/** The kind in words, e.g. "Pump", "Decision". */
	label: string;
	title: string;
	detail?: string;
	by?: string;
};

const activityLabels: Record<PatientActivity["kind"], string> = {
	alert: "Alert",
	consult: "Video consult",
	order: "Order",
	decision: "Decision",
	note: "Note",
	outcome: "Outcome",
};

const eventLabels: Record<TimelineEventKind, string> = {
	care: "Care",
	drip: "Pump",
	ventilator: "Ventilator",
	lab: "Lab",
	note: "Note",
	alert: "Alert",
};

/** A Timeline event's label ends with who, after " · ", when a person did it ("Turned and repositioned · Kelly Ortiz"). */
function splitWho(label: string) {
	const at = label.lastIndexOf(" · ");
	if (at < 0) return { title: label };
	const who = label.slice(at + 3);
	return /\d/.test(who) ? { title: label } : { title: label.slice(0, at), by: who };
}

/** The decisions and actions (the activity log) and the Timeline's events, newest first. */
function logEntries(record: PatientRecord | undefined): LogEntry[] {
	return [
		...(record?.activity ?? []).map((entry) => ({
			id: `activity-${entry.id}`,
			at: entry.at,
			kind: activityTimelineKinds[entry.kind],
			label: activityLabels[entry.kind],
			title: entry.title,
			detail: entry.detail,
			by: entry.by,
		})),
		...(record?.timeline?.events ?? []).map((event) => ({
			id: `event-${event.id}`,
			at: event.at,
			kind: event.kind,
			label: eventLabels[event.kind],
			...splitWho(event.label),
		})),
	].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

/** One line of the log: its time, a dot in the event's color on the time line, the kind, what happened and who. */
function LogRow({ entry, fresh }: { entry: LogEntry; fresh: boolean }) {
	return (
		<li
			className={cn(
				"grid grid-cols-[4.5rem_1rem_minmax(0,1fr)] gap-x-2 rounded-lg px-2 py-2",
				fresh && "bg-info-subtle",
			)}
		>
			<time dateTime={entry.at} className='pt-px text-right text-xs text-muted-foreground tabular-nums'>
				{formatTime(entry.at)}
			</time>
			<span aria-hidden='true' className='flex justify-center pt-1.5'>
				<span className={cn("size-2 rounded-full", timelineEventKinds[entry.kind].className)} />
			</span>
			<div className='flex min-w-0 flex-col'>
				<p className='text-sm text-foreground'>
					<span
						className={cn(
							"mr-1.5 text-xs font-semibold tracking-wide uppercase",
							entry.kind === "alert" ? "text-severity-critical-prominent" : "text-muted-foreground",
						)}
					>
						{entry.label}
					</span>
					<span className='font-medium'>{entry.title}</span>
				</p>
				{entry.detail ? <p className='text-sm text-foreground'>{entry.detail}</p> : null}
				{entry.by ? <p className='text-xs text-muted-foreground'>{entry.by}</p> : null}
			</div>
		</li>
	);
}

/**
 * The Now line and, under it, what happened (PRD PD-023 What changed; the activity log, PD-133): the decisions and
 * actions with who, and the pump, ventilator, lab, care and note events, newest first, over the last day. What's new
 * since the clinician last looked is shaded, as on the Timeline, above a "You last looked at" rule.
 */
function PatientLog({
	record,
	now,
	onShowTimeline,
}: {
	record?: PatientRecord;
	now: number | null;
	onShowTimeline?: () => void;
}) {
	const [showAll, setShowAll] = React.useState(false);
	const lastViewedAt = record?.brief?.lastViewedAt;
	const lastViewed = lastViewedAt ? Date.parse(lastViewedAt) : undefined;
	const entries = logEntries(record).filter((entry) => now === null || now - Date.parse(entry.at) <= LOG_HOURS * HOUR);
	const shown = showAll ? entries : entries.slice(0, LOG_ENTRIES);
	const isFresh = (entry: LogEntry) => lastViewed !== undefined && Date.parse(entry.at) > lastViewed;
	const freshCount = entries.filter(isFresh).length;

	return (
		<section aria-label='Log' className='flex flex-col gap-2'>
			<div className='flex items-center gap-3'>
				<h2 className='text-xs font-semibold tracking-wide text-tone-accent uppercase'>
					Now{now === null ? null : ` · ${formatTime(new Date(now).toISOString())}`}
				</h2>
				<span aria-hidden='true' className='h-px flex-1 bg-tone-accent' />
				{onShowTimeline ? (
					<Button variant='link' size='xs' onClick={onShowTimeline} className='h-auto p-0'>
						Open Timeline
					</Button>
				) : null}
			</div>

			{lastViewedAt && entries.length && !freshCount ? (
				<p className='px-2 text-xs text-muted-foreground'>Nothing new since you last looked at {formatTime(lastViewedAt)}.</p>
			) : null}

			{shown.length ? (
				<ol aria-label={`Last ${LOG_HOURS} hours, newest first`} className='flex flex-col gap-1'>
					{shown.map((entry, index) => (
						<React.Fragment key={entry.id}>
							<LogRow entry={entry} fresh={isFresh(entry)} />
							{/* The rule under the last new entry, where the clinician left off. */}
							{freshCount && lastViewedAt && index === freshCount - 1 && index < shown.length - 1 ? (
								<li className='flex items-center gap-3 px-2 py-1 text-xs text-muted-foreground'>
									<span aria-hidden='true' className='h-px flex-1 bg-border' />
									You last looked at {formatTime(lastViewedAt)}
									<span aria-hidden='true' className='h-px flex-1 bg-border' />
								</li>
							) : null}
						</React.Fragment>
					))}
				</ol>
			) : (
				<NoData>Nothing recorded in the last {LOG_HOURS} hours.</NoData>
			)}

			{entries.length > LOG_ENTRIES ? (
				<Button
					variant='ghost'
					size='xs'
					aria-expanded={showAll}
					onClick={() => setShowAll(!showAll)}
					className='self-start text-link'
				>
					<ChevronDownIcon
						aria-hidden='true'
						className={cn("transition-transform duration-160 motion-reduce:transition-none", showAll && "rotate-180")}
					/>
					{showAll ? "Show fewer" : `Show earlier (${entries.length - LOG_ENTRIES})`}
				</Button>
			) : null}
		</section>
	);
}

/* -------------------------------------------------------------------------- */
/* Rail                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * The score's trend as a line, oldest to newest, over a dashed line at the alert threshold. Decorative: the values and
 * times are the list under it.
 */
function ScoreTrendLine({ trend, threshold }: Pick<PatientEarlyWarning, "trend" | "threshold">) {
	const times = trend.map((point) => Date.parse(point.at));
	const start = times[0];
	const span = Math.max(1, times[times.length - 1] - start);
	const top = Math.max(threshold + 3, ...trend.map((point) => point.value + 1));
	const y = (value: number) => 40 - (value / top) * 40;
	const points = trend.map((point, index) => `${((times[index] - start) / span) * 100},${y(point.value)}`).join(" ");

	return (
		<svg aria-hidden='true' viewBox='0 0 100 40' preserveAspectRatio='none' className='h-10 w-full overflow-visible'>
			<line
				x1='0'
				x2='100'
				y1={y(threshold)}
				y2={y(threshold)}
				className='stroke-severity-high'
				strokeWidth='1'
				strokeDasharray='4 3'
				vectorEffect='non-scaling-stroke'
			/>
			<polyline
				points={points}
				fill='none'
				className='stroke-foreground'
				strokeWidth='2'
				strokeLinejoin='round'
				vectorEffect='non-scaling-stroke'
			/>
		</svg>
	);
}

/**
 * The deterioration score (PRD PC-030, DU-14): its value and band, whether it has crossed into the alert band, its
 * trend and the inputs that make it up, each with its points. The patient header's "View breakdown" brings it into view.
 * A current-state score: it says where the patient is now, never where they're going.
 */
function EarlyWarningCard({
	warning,
	acuity,
	now,
}: {
	warning?: PatientEarlyWarning;
	/** The score as the patient header shows it, for a record without the breakdown. */
	acuity?: PatientDetailsProps["patient"]["acuity"];
	now: number | null;
}) {
	const crossed = warning?.crossedAt !== undefined;
	return (
		<SectionCard
			id={overviewSectionIds.earlyWarning}
			title={warning ? `${warning.score} breakdown` : acuity?.score !== undefined ? `${acuity.label} breakdown` : "Early warning score"}
			meta={warning ? <SourceLabel>{freshness("Vitals", warning.updatedAt, now)}</SourceLabel> : undefined}
		>
			{warning ? (
				<>
					<div className='flex flex-col'>
						<p className='flex items-baseline gap-2'>
							<span className='text-3xl font-semibold text-foreground tabular-nums'>{warning.value}</span>
							<span className='text-sm font-medium text-foreground'>{warning.band}</span>
						</p>
						<p className={cn("text-xs", crossed ? "font-medium text-severity-high-prominent" : "text-muted-foreground")}>
							{warning.crossedAt
								? `Crossed into ${warning.alertBand} (${warning.threshold} or more) at ${formatTime(warning.crossedAt)}`
								: `Below ${warning.alertBand} (${warning.threshold} or more)`}
						</p>
					</div>

					{warning.trend.length > 1 ? (
						<div className='flex flex-col gap-1.5'>
							<ScoreTrendLine trend={warning.trend} threshold={warning.threshold} />
							<ol aria-label='Trend' className='flex justify-between gap-2 text-xs text-muted-foreground'>
								{warning.trend.map((point, index) => (
									<li key={point.at} className='flex flex-col last:items-end'>
										<span className='font-semibold text-foreground tabular-nums'>{point.value}</span>
										{index === warning.trend.length - 1 ? "Now" : formatTime(point.at)}
									</li>
								))}
							</ol>
						</div>
					) : null}

					<table className='w-full text-sm'>
						<caption className='sr-only'>What makes up the score</caption>
						<thead className='sr-only'>
							<tr>
								<th scope='col'>Input</th>
								<th scope='col'>Value</th>
								<th scope='col'>Points</th>
							</tr>
						</thead>
						<tbody className='divide-y divide-border-muted'>
							{warning.inputs.map((input) => (
								<tr key={input.label} className={input.points ? "text-foreground" : "text-muted-foreground"}>
									<th scope='row' className='py-1 text-left font-normal'>
										{input.label}
									</th>
									<td className='py-1 text-right tabular-nums'>{input.value}</td>
									<td className={cn("w-16 py-1 text-right tabular-nums", input.points ? "font-semibold" : undefined)}>
										{input.points} {input.points === 1 ? "pt" : "pts"}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</>
			) : acuity?.score !== undefined ? (
				// The header's score with "View breakdown" lands here: show the score, and say the inputs are missing.
				<>
					<p className='flex items-baseline gap-2'>
						<span className='text-3xl font-semibold text-foreground tabular-nums'>{acuity.score}</span>
						<span className='text-sm font-medium text-foreground'>
							{patientCardAcuityLevels[acuity.level ?? "unknown"].label}
						</span>
					</p>
					<NoData>The inputs behind this score aren't in the record yet.</NoData>
				</>
			) : (
				<NoData>No early warning score for this patient.</NoData>
			)}
		</SectionCard>
	);
}

/** Key labs (PRD PD-025) as tiles, two to a row; a pending lab says when it was collected. */
function KeyLabsCard({ record, now }: { record?: PatientRecord; now: number | null }) {
	const labs = record?.labs;
	const latestLab = latest(labs?.map((lab) => lab.resultedAt) ?? []);
	return (
		<SectionCard title='Key labs' meta={latestLab ? <SourceLabel>{freshness("Lab", latestLab, now)}</SourceLabel> : undefined}>
			{labs?.length ? (
				<ul className='grid grid-cols-2 gap-2'>
					{labs.map((lab) => (
						<li key={lab.name} className='flex'>
							<LabTile
								className='flex-1'
								name={lab.name}
								value={lab.value}
								unit={lab.unit}
								flag={lab.flag}
								resultedAt={lab.resultedAt}
								previous={lab.previous}
								collectedAt={lab.collectedAt}
							/>
						</li>
					))}
				</ul>
			) : labs ? (
				<NoData>No labs resulted in the last 72 hours.</NoData>
			) : (
				<NoData>No lab data for this patient.</NoData>
			)}
		</SectionCard>
	);
}

/**
 * Organ support (PRD PD-022) and fluids (DU-18) in one card: the respiratory support and its settings with the last ABG,
 * each infusion's rate and last change, then the net fluid balance and weight change.
 */
function OxygenAndInfusionsCard({ record, now }: { record?: PatientRecord; now: number | null }) {
	const ventilator = record?.ventilator;
	const infusions = record?.infusions;
	const fluids = record?.fluids;
	const updated = latest([ventilator?.updatedAt, ...(infusions?.map((infusion) => infusion.updatedAt) ?? [])]);
	const source = [ventilator?.source, infusions?.length ? "Pump" : undefined].filter(Boolean).join(", ");

	return (
		<SectionCard
			title='Oxygen and infusions'
			meta={updated && source ? <SourceLabel>{freshness(source, updated, now)}</SourceLabel> : undefined}
		>
			<div className='flex flex-col gap-3 divide-y divide-border-muted *:pb-3 *:last:pb-0'>
				{ventilator ? (
					<div className='flex flex-col gap-2'>
						<p className='text-sm font-semibold text-foreground'>{[ventilator.support, ventilator.mode].filter(Boolean).join(" · ")}</p>
						<dl className='grid grid-cols-2 gap-x-4 gap-y-2'>
							{ventilator.settings.map((setting) => (
								<Detail key={setting.label} label={setting.label}>
									<span className='font-semibold tabular-nums'>{setting.value}</span>
									{setting.unit ? <span className='text-muted-foreground'> {setting.unit}</span> : null}
									{setting.set ? <span className='text-muted-foreground'> · set {setting.set}</span> : null}
								</Detail>
							))}
						</dl>
						{ventilator.abg ? (
							<p className='text-xs text-muted-foreground'>
								<span className='font-medium text-foreground'>Last ABG</span> {formatTime(ventilator.abg.collectedAt)} ·{" "}
								{ventilator.abg.values}
							</p>
						) : null}
					</div>
				) : (
					<NoData>No ventilator or oxygen data for this patient.</NoData>
				)}

				{infusions?.length ? (
					<ul className='flex flex-col gap-2'>
						{infusions.map((infusion) => (
							<li key={infusion.drug} className='flex items-start justify-between gap-3'>
								<span className='text-sm font-medium text-foreground'>{infusion.drug}</span>
								<span className='flex flex-col items-end text-right'>
									<span className='text-sm font-semibold text-foreground tabular-nums'>
										{infusion.rate ?? <span className='font-normal text-muted-foreground'>Rate unavailable</span>}
									</span>
									{infusion.change ? (
										<span className='text-xs text-muted-foreground'>
											<span aria-hidden='true'>{infusion.change.direction === "up" ? "▲" : "▼"} </span>
											{infusion.change.direction === "up" ? "Up" : "Down"} from {infusion.change.from} at{" "}
											{formatTime(infusion.change.at)}
										</span>
									) : null}
								</span>
							</li>
						))}
					</ul>
				) : infusions ? (
					<NoData>No infusions running.</NoData>
				) : (
					<NoData>No pump data for this patient.</NoData>
				)}

				{fluids ? (
					<div className='flex flex-col gap-1'>
						<dl className='grid grid-cols-2 gap-x-4'>
							<Detail label={`Net balance · ${fluids.window}`}>
								<span className='font-semibold tabular-nums'>{fluids.netBalance}</span>
							</Detail>
							<Detail label={`Weight · ${fluids.window}`}>
								<span className='font-semibold tabular-nums'>{fluids.weightChange}</span>
							</Detail>
						</dl>
						<p className='text-xs text-muted-foreground'>
							Charted{fluids.chartedBy ? ` by ${fluids.chartedBy}` : null} at {formatTime(fluids.chartedAt)}
						</p>
					</div>
				) : (
					<NoData>No intake and output charted for this patient.</NoData>
				)}
			</div>
		</SectionCard>
	);
}

/**
 * What the patient is on: the scheduled medications, each with when it was last given (when it's next due is Up
 * next's), and the infusions and as-needed ones counted under them. "All n active" opens Medications.
 */
function MedicationsCard({ record, now, onShowAll }: { record?: PatientRecord; now: number | null; onShowAll?: () => void }) {
	const medications = record?.medications;
	// The most recently given first.
	const scheduled = [...(medications?.scheduled ?? [])].sort(
		(a, b) => (b.lastGivenAt ? Date.parse(b.lastGivenAt) : 0) - (a.lastGivenAt ? Date.parse(a.lastGivenAt) : 0),
	);
	const total = medications ? medications.continuous.length + medications.scheduled.length + medications.prn.length : 0;
	const others = [
		medications?.continuous.length
			? `${medications.continuous.length} ${medications.continuous.length === 1 ? "infusion" : "infusions"}`
			: undefined,
		medications?.prn.length ? `${medications.prn.length} as needed: ${medications.prn.map((med) => med.drug.toLowerCase()).join(", ")}` : undefined,
	].filter(Boolean);

	return (
		<SectionCard
			title='Medications'
			action={
				onShowAll && total ? (
					<Button variant='link' size='xs' onClick={onShowAll} className='h-auto p-0'>
						All {total} active
					</Button>
				) : undefined
			}
		>
			{medications ? (
				<>
					{scheduled.length ? (
						<ul className='flex flex-col divide-y divide-border-muted'>
							{scheduled.map((med) => (
								<li key={med.drug} className='flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0'>
									<div className='flex min-w-0 flex-col'>
										<span className='text-sm font-medium text-foreground'>
											{med.drug} {med.dose === "Per scale" ? null : med.dose} {med.route}
										</span>
										<span className='text-xs text-muted-foreground'>{med.frequency}</span>
									</div>
									<span className='shrink-0 pt-px text-xs text-muted-foreground'>
										{med.lastGivenAt
											? now !== null && Date.parse(med.lastGivenAt) < now - 12 * HOUR
												? `Given ${formatRelativeDate(med.lastGivenAt, now).label.toLowerCase()}`
												: `Given ${formatTime(med.lastGivenAt)}`
											: "Not given yet"}
									</span>
								</li>
							))}
						</ul>
					) : (
						<NoData>No scheduled medications.</NoData>
					)}
					{others.length ? <p className='text-xs text-muted-foreground'>Plus {others.join(" and ")}.</p> : null}
				</>
			) : (
				<NoData>No medication data for this patient.</NoData>
			)}
		</SectionCard>
	);
}

// Orders' status colors.
const orderStatusVariants: Record<string, BadgeProps["variant"]> = {
	Active: "green",
	Collected: "blue",
	Scheduled: "secondary",
	Pending: "yellow",
};

/** How many recent orders the Overview lists; Orders has them all. */
const RECENT_ORDERS = 4;

/** The newest active orders, and order recommendations waiting for a decision. "All orders" opens Orders. */
function RecentOrdersCard({ record, now, onShowAll }: { record?: PatientRecord; now: number | null; onShowAll?: () => void }) {
	const orders = record?.orders;
	const recent = [...(orders?.active ?? [])].sort((a, b) => Date.parse(b.orderedAt) - Date.parse(a.orderedAt)).slice(0, RECENT_ORDERS);
	const waiting = orders?.recommendations.filter((recommendation) => !recommendation.outcome).length ?? 0;

	return (
		<SectionCard
			title='Recent orders'
			action={
				onShowAll && orders ? (
					<Button variant='link' size='xs' onClick={onShowAll} className='h-auto p-0'>
						All orders
					</Button>
				) : undefined
			}
		>
			{orders ? (
				<>
					{waiting ? (
						<p className='rounded-lg bg-severity-medium-subtle px-3 py-2 text-sm text-severity-medium-strong'>
							{waiting} order {waiting === 1 ? "recommendation" : "recommendations"} to review
						</p>
					) : null}
					{recent.length ? (
						<ul className='flex flex-col divide-y divide-border-muted'>
							{recent.map((order) => (
								<li key={order.id} className='flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0'>
									<div className='flex min-w-0 flex-col'>
										<span className='text-sm font-medium text-foreground'>{order.name}</span>
										<span className='text-xs text-muted-foreground'>
											{[order.details, order.orderedBy].filter(Boolean).join(" · ")}
										</span>
									</div>
									<div className='flex shrink-0 flex-col items-end gap-1'>
										<Badge variant={orderStatusVariants[order.status] ?? "secondary"} size='xs'>
											{order.status}
										</Badge>
										{now !== null ? (
											<span className='text-xs text-muted-foreground'>{formatRelativeDate(order.orderedAt, now).label}</span>
										) : null}
									</div>
								</li>
							))}
						</ul>
					) : (
						<NoData>No active orders.</NoData>
					)}
				</>
			) : (
				<NoData>No order data for this patient.</NoData>
			)}
		</SectionCard>
	);
}

/** Why the patient is here (PRD PD-026): the admitting diagnosis, the problem list and when and where from. */
function EncounterCard({ record }: { record?: PatientRecord }) {
	return (
		<SectionCard title='Encounter'>
			{record?.diagnosis || record?.admittedAt || record?.problems?.length ? (
				<dl className='flex flex-col gap-3'>
					{record.diagnosis ? <Detail label='Diagnosis'>{record.diagnosis}</Detail> : null}
					{record.problems?.length ? (
						<Detail label='Problems'>
							<ul className='flex flex-col'>
								{record.problems.map((problem) => (
									<li key={problem}>{problem}</li>
								))}
							</ul>
						</Detail>
					) : null}
					{record.admittedAt ? (
						<Detail label='Admitted'>
							{new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(record.admittedAt))},{" "}
							{formatTime(record.admittedAt)}
							{record.admittedFrom ? ` from ${record.admittedFrom.toLowerCase()}` : null}
						</Detail>
					) : null}
				</dl>
			) : (
				<NoData>No diagnosis or encounter details yet.</NoData>
			)}
		</SectionCard>
	);
}

/* -------------------------------------------------------------------------- */
/* PatientOverview                                                            */
/* -------------------------------------------------------------------------- */

/**
 * The Overview: the AI brief (PD-024); alerts and concerns (PD-020), the care plan, Up next and the log (PD-023, PD-133)
 * in the main column; the live monitor (PD-021), the early warning score (PC-030, DU-14), key labs (PD-025), organ
 * support and fluids (PD-022, DU-18), medications, orders and the encounter (PD-026) in the rail.
 *
 * From 60rem of room, a main column and a 26rem rail; narrower, one column: the brief, the alerts (mandatory, PRD §3.4,
 * so they never sink below the physiology), the rail, then Up next and the log.
 */
function PatientOverview({
	patient,
	record,
	monitor,
	alerts = [],
	escalationTargets = [],
	onAlertAction,
	onShowSection,
	pathway,
}: Pick<PatientDetailsProps, "patient" | "record" | "monitor" | "alerts" | "escalationTargets" | "onAlertAction"> & {
	/** Opens another tab: the Timeline (the whole log), Medications or Orders. */
	onShowSection?: (section: OverviewLinkedSection) => void;
	/** The pathway an open alert brought: the Care plan shows it (suggested, or what it runs) and Up next what it has due. */
	pathway?: OverviewPathway;
}) {
	const now = useCurrentMinute();
	const navigation = usePatientNavigation();
	const name = `${patient.lastName}, ${patient.firstName}`;
	const { suggestion, running } = pathway ? pathwaySummary(pathway, now) : { suggestion: undefined, running: [] };

	return (
		// A size container, so the layout follows the room the side panels leave.
		<div className='@container'>
			<div
				className={cn(
					"grid gap-6",
					"@min-[60rem]:grid-cols-[minmax(0,1fr)_26rem] @min-[60rem]:grid-rows-[auto_auto_1fr]",
					"@min-[60rem]:[grid-template-areas:'brief_brief'_'alerts_rail'_'log_rail']",
				)}
			>
				{record?.brief ? (
					<div className='min-w-0 @min-[60rem]:[grid-area:brief]'>
						<BriefBanner
							brief={record.brief}
							now={now}
							onAsk={
								navigation
									? () => navigation.askAboutPatient(patient.id, name, patient.tags?.map((tag) => tag.label), briefQuestion)
									: undefined
							}
						/>
					</div>
				) : null}

				<div className='flex min-w-0 flex-col gap-6 @min-[60rem]:[grid-area:alerts]'>
					<AlertsSection
						patientId={patient.id}
						alerts={alerts}
						escalationTargets={escalationTargets}
						onAlertAction={onAlertAction}
					/>
					{record?.carePlan || suggestion || running.length ? (
						<CarePlanCard
							plan={record?.carePlan}
							suggestion={suggestion}
							running={running}
							onOpenPathway={pathway?.onOpen}
						/>
					) : null}
				</div>

				<div className='flex min-w-0 flex-col gap-4 self-start @min-[60rem]:[grid-area:rail]'>
					<SectionCard
						title='Monitor'
						meta={
							monitor?.vitals ? (
								<>
									<span aria-hidden='true' className='size-2 rounded-full bg-success' />
									Live · Monitor
								</>
							) : undefined
						}
					>
						{monitor?.vitals ? (
							<PatientMonitor
								aria-label={`Bedside monitor, ${name}`}
								vitals={monitor.vitals}
								limits={monitor.limits}
								alarmPriorities={monitor.alarmPriorities}
								acknowledgedAlarms={monitor.acknowledgedAlarms}
								trends={monitor.trends}
								className='h-64'
							/>
						) : (
							<NoData>No live monitor data for this patient.</NoData>
						)}
					</SectionCard>
					<EarlyWarningCard warning={record?.earlyWarning} acuity={patient.acuity} now={now} />
					<KeyLabsCard record={record} now={now} />
					<OxygenAndInfusionsCard record={record} now={now} />
					<MedicationsCard record={record} now={now} onShowAll={onShowSection && (() => onShowSection("medications"))} />
					<RecentOrdersCard record={record} now={now} onShowAll={onShowSection && (() => onShowSection("orders"))} />
					<EncounterCard record={record} />
				</div>

				<div className='flex min-w-0 flex-col gap-4 self-start @min-[60rem]:[grid-area:log]'>
					<UpNextCard record={record} now={now} pathway={pathway} />
					<PatientLog record={record} now={now} onShowTimeline={onShowSection && (() => onShowSection("timeline"))} />
				</div>
			</div>
		</div>
	);
}

export { PatientOverview, overviewSectionIds, type OverviewLinkedSection, type OverviewPathway };
