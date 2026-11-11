import * as React from "react";
import { ArrowUpRightIcon, BellIcon, ChevronDownIcon, CircleAlertIcon, GitBranchIcon, InfoIcon } from "lucide-react";
import { AnimatePresence, motion, type Variants } from "motion/react";

import { Button } from "@/components/buttons/button";
import { AlertBar, PatientMonitor } from "@/components/cards/patient-monitoring-card";
import { Badge, type BadgeProps } from "@/components/data-display/badge";
import { LabTile } from "@/components/data-display/lab-tile";
import { AiClinicalSummaryBanner } from "@/components/feedback/ai-clinical-summary-banner";
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
	pathwayLine,
	pathwayStatuses,
	type PatientCarePlan,
	type PatientPathwayRunning,
	type PatientPathwaySuggestion,
} from "./activity";
import type { PatientBrief, PatientDetailsProps, PatientRecord } from "./patient-details";
import { Detail, formatElapsed, formatTime, freshness, NoData } from "./section-parts";

// The Overview (PRD Patient details §5; Intercept-Live `149:4464`, rebuilt Nov 9, 2026): what matters about the patient
// now, and what's being done about it. The AI clinical summary across the top, the clinical findings (key labs and what
// matters for this patient) under it, then a grid of cards: live monitoring, the care plan, Up next; medications, oxygen
// and infusions, recent orders; the encounter and referrals. The alerts live in the page's Alerts panel (`AlertsSection`,
// exported from here), which the patient header opens. Data that's missing says it's missing, and only an empty list
// says there's none.

/** The alert list's default id. */
const overviewSectionIds = { alerts: "patient-overview-alerts" } as const;

/** The tabs the Overview links to. */
type OverviewLinkedSection = "medications" | "orders";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** How far ahead Up next looks. */
const UP_NEXT_HOURS = 12;
/** Up next's items before "View all". */
const UP_NEXT_ITEMS = 5;

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
 * The AI brief (PRD PD-024): UCL's AiClinicalSummaryBanner (intercept.ds `1467:13678`, Nov 9, 2026), what matters now
 * under a headline, across the top, with how many sources it read and how fresh it is. With `onAsk` the whole banner
 * is a button (Nov 6, 2026, user's call): it opens Ask Intercept Live about the patient and asks what's behind the brief,
 * which answers with the details and what changed since the clinician last looked. × hides it until a newer brief.
 */
function BriefBanner({
	brief,
	now,
	onAsk,
	onClose,
}: {
	brief: PatientBrief;
	now: number | null;
	onAsk?: () => void;
	onClose?: () => void;
}) {
	return (
		<AiClinicalSummaryBanner
			title={brief.title}
			source={`${brief.sourceCount} sources${now === null ? "" : ` · ${formatElapsed(brief.updatedAt, now)}`}`}
			onOpen={onAsk}
			onClose={onClose}
		>
			{brief.text}
		</AiClinicalSummaryBanner>
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

/** The day an alert fired, for the Alerts panel's history: "Today", "Yesterday", or "Saturday, Nov 7". */
function alertDayLabel(firedAt: string, now: number | null) {
	const day = new Date(firedAt);
	const today = new Date(now ?? Date.now());
	const startOf = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
	const days = Math.round((startOf(today) - startOf(day)) / (24 * HOUR));
	if (days <= 0) return "Today";
	if (days === 1) return "Yesterday";
	return day.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

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
	onTogglePathway,
	pathwayShown = false,
}: {
	alert: TriageAlert;
	inLast24h: number;
	escalationTargets: NonNullable<PatientDetailsProps["escalationTargets"]>;
	onAlertAction?: (alertId: string, action: TriageAlertAction) => void;
	onOpen?: () => void;
	/** The alert comes with a pathway: a resolved alert's card opens it (or closes it) in the page's Pathway panel. */
	onTogglePathway?: () => void;
	/** Its pathway is the one the Pathway panel shows. */
	pathwayShown?: boolean;
}) {
	const resolved = !isOpenAlert(alert);
	// Acknowledge, Escalate and Resolve in the row, as on the alert panel; no View pathway link under it since Nov 10,
	// 2026 (user's call; intercept.ds `alert-modal`): an open alert's pathway opens from the Overview's Care plan. A
	// resolved alert's whole card opens its pathway (Nov 9, 2026, user's call): nothing left to act on but its record.
	const opensPathway = resolved && onTogglePathway !== undefined;
	const lifecycle = useAlertLifecycle({
		alert,
		escalationTargets,
		onAction: onAlertAction ? (action) => onAlertAction(alert.id, action) : undefined,
	});
	const tones = alertTones[resolved ? "resolved" : alert.severity];
	const headingId = React.useId();

	return (
		<div
			role='group'
			aria-labelledby={headingId}
			className={cn(
				"relative flex flex-col gap-2 overflow-hidden rounded-xl pb-1.5",
				tones.panel,
			)}
		>
			{opensPathway ? (
				// The whole card's click target, under its own controls (Feedback, a form).
				<button
					type='button'
					aria-expanded={pathwayShown}
					aria-controls={pathwayShown ? "patient-pathway" : undefined}
					aria-label={`${pathwayShown ? "Hide" : "Show"} pathway: ${alert.reason ?? alert.title}`}
					onClick={onTogglePathway}
					// On hover, and while its pathway is open, the whole card darkens (Nov 9, 2026, user's call: no outline).
					className={cn(
						"absolute inset-0 z-[1] cursor-pointer rounded-xl outline-none transition-colors duration-160 hover:bg-foreground/5 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset motion-reduce:transition-none",
						pathwayShown && "bg-foreground/5",
					)}
				/>
			) : null}
			<AlertBar
				alert={{
					variant: resolved ? "resolved" : alert.severity,
					inLast24h,
					since: resolved ? (alert.addressed?.at ?? alert.firedAt) : alert.firedAt,
				}}
				size='md'
				// A card that opens its pathway is one click target: its bar no longer opens the alert, so no maximize icon
				// (Nov 9, 2026, user's call).
				onOpen={opensPathway ? undefined : onOpen}
				header
			/>
			<div className='flex flex-col gap-2 px-4 pb-2.5'>
				{/* The reason leads; the alert's own title follows it, as in the alert panel. */}
				<div className='min-w-0'>
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
						{lifecycle.feedbackNode ? (
							<div className='relative z-[2] flex h-[1lh] shrink-0 items-center'>{lifecycle.feedbackNode}</div>
						) : null}
					</div>
					{lifecycle.statusNode}
				</div>
				{/* Over the card's click target, so its own controls stay theirs. */}
				{lifecycle.alertActionsNode ? <div className='relative z-[2] flex gap-2'>{lifecycle.alertActionsNode}</div> : null}
				{lifecycle.formNode ? <div className='relative z-[2]'>{lifecycle.formNode}</div> : null}
			</div>
		</div>
	);
}

/**
 * The patient's alerts (PRD PD-020, mandatory, PRD §3.4): every open one, highest severity first, then the ones addressed
 * this shift behind "Show resolved". With none open: "No active alerts · Last alert 2:14 PM" (MON-051).
 */
function AlertsSection({
	id = overviewSectionIds.alerts,
	patientId,
	alerts: currentAlerts,
	history = [],
	escalationTargets,
	onAlertAction,
	allResolved = false,
	pathwayAlertIds = [],
	pathwayShownId,
	onTogglePathway,
}: {
	id?: string;
	patientId: string;
	alerts: TriageAlert[];
	/**
	 * Earlier alerts, all resolved (the record's history, and ones the feed resolved), listed with the resolved ones;
	 * one already in `alerts` shows once, as `alerts` has it.
	 */
	history?: TriageAlert[];
	escalationTargets: NonNullable<PatientDetailsProps["escalationTargets"]>;
	onAlertAction?: (alertId: string, action: TriageAlertAction) => void;
	/**
	 * Every alert at once, the unresolved first and the resolved under them, with no Show resolved (the page's Alerts
	 * panel, Nov 9, 2026, user's call: "unresolved at the top").
	 */
	allResolved?: boolean;
	/** Alerts that come with a pathway: their cards get Pathway, which calls `onTogglePathway` with the alert's id. */
	pathwayAlertIds?: string[];
	/** The alert whose pathway the Pathway panel shows. */
	pathwayShownId?: string;
	onTogglePathway?: (alertId: string) => void;
}) {
	const navigation = usePatientNavigation();
	const { prefersReducedMotion, resolve } = useMotionPreference();
	const [resolvedToggled, setShowResolved] = React.useState(false);
	const showResolved = allResolved || resolvedToggled;
	const now = useCurrentMinute();
	// Every alert the patient had: the current ones, then the history they don't already hold.
	const alerts = [...currentAlerts, ...history.filter((alert) => !currentAlerts.some((item) => item.id === alert.id))];
	const active = alerts.filter(isOpenAlert).sort(compareTriageAlerts);
	// In the Alerts panel, newest fired first, so they fall into their days; elsewhere, newest addressed first.
	const resolved = allResolved
		? alerts.filter((alert) => !isOpenAlert(alert)).sort((a, b) => b.firedAt.localeCompare(a.firedAt))
		: sortAddressedAlerts(alerts.filter((alert) => !isOpenAlert(alert)));
	const lastFired = lastFiredAt(alerts);
	const inLast24h = now === null ? alerts.length : alerts.filter((alert) => now - Date.parse(alert.firedAt) < 24 * HOUR).length;
	const shown = showResolved ? [...active, ...resolved] : active;
	const order = shown.map((alert) => alert.id).join();
	// With every alert listed (the Alerts panel), the resolved ones are grouped by the day they fired: "Today",
	// "Yesterday", "Saturday, Nov 7" (Nov 10, 2026, user's call: the history stays). A label goes before the first alert of
	// each day; the open alerts lead without one.
	const dayLabels = new Map<string, string>();
	if (allResolved) {
		let previous: string | undefined;
		for (const alert of resolved) {
			const label = alertDayLabel(alert.firedAt, now);
			if (label !== previous) dayLabels.set(alert.id, label);
			previous = label;
		}
	}

	return (
		<section
			id={id}
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
						className={cn(dayLabels.has(alert.id) && "flex flex-col gap-2")}
						layout='position'
						layoutDependency={order}
						variants={prefersReducedMotion ? reducedCardVariants : cardVariants}
						initial='initial'
						animate='animate'
						exit='exit'
						transition={{ layout: resolve(reorderSpring) }}
					>
						{dayLabels.has(alert.id) ? (
							<h3 className={cn("text-sm font-medium text-muted-foreground", alert !== shown[0] && "pt-2")}>
								{dayLabels.get(alert.id)}
							</h3>
						) : null}
						<OverviewAlertCard
							alert={alert}
							inLast24h={inLast24h}
							escalationTargets={escalationTargets}
							onAlertAction={onAlertAction}
							onOpen={navigation ? () => navigation.openAlert(patientId, alert.id) : undefined}
							onTogglePathway={
								onTogglePathway && pathwayAlertIds.includes(alert.id) ? () => onTogglePathway(alert.id) : undefined
							}
							pathwayShown={pathwayShownId === alert.id}
						/>
					</motion.div>
				))}
			</AnimatePresence>
			{resolved.length && !allResolved ? (
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

/* -------------------------------------------------------------------------- */
/* Card parts                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * One of the Overview's cards (Intercept-Live `149:4464`, Nov 9, 2026): the title with the card's links at the right, its
 * content, and a footer at the bottom (where the data comes from, or a note). Cards in a row of the grid share its
 * height, so their footers line up.
 */
function OverviewCard({
	title,
	leading,
	meta,
	actions,
	footer,
	className,
	children,
}: {
	title: string;
	/** Before the title, e.g. Live monitoring's live dot. */
	leading?: React.ReactNode;
	/** Right of the title, muted, e.g. "3/3 devices connected". */
	meta?: React.ReactNode;
	/** The card's links, at the right of the title. */
	actions?: React.ReactNode;
	footer?: React.ReactNode;
	className?: string;
	children: React.ReactNode;
}) {
	const headingId = React.useId();
	return (
		<section
			aria-labelledby={headingId}
			className={cn(
				"flex min-w-0 flex-col justify-between gap-4 rounded-xl border border-border bg-card px-5 py-4 shadow-sm",
				className,
			)}
		>
			<div className='flex min-h-0 flex-1 flex-col gap-2'>
				<div className='flex min-h-8 flex-wrap items-center gap-x-2 gap-y-1'>
					{leading}
					<h2 id={headingId} className='min-w-0 flex-1 text-lg font-semibold text-foreground'>
						{title}
					</h2>
					{meta ? <p className='text-sm text-muted-foreground'>{meta}</p> : null}
					{actions ? <div className='-mr-1 flex items-center'>{actions}</div> : null}
				</div>
				{children}
			</div>
			{footer ? <div className='flex flex-col gap-1'>{footer}</div> : null}
		</section>
	);
}

/** A card's source line: the source icon, then where the data comes from and how old it is. */
function CardSource({ children }: { children: React.ReactNode }) {
	return (
		<p className='text-xs text-muted-foreground'>
			<SourceLabel>{children}</SourceLabel>
		</p>
	);
}

/** A card's link to where its whole list lives (another tab, the Pathway panel), with the ↗ that says it goes there. */
function CardLink({ children, ...props }: Omit<React.ComponentProps<typeof Button>, "variant" | "size">) {
	return (
		<Button variant='ghost' size='sm' className='text-link hover:text-link' {...props}>
			{children}
			<ArrowUpRightIcon aria-hidden='true' />
		</Button>
	);
}

/** A card's "View all" that shows the rest of the list in place, then "Show fewer". */
function CardToggle({ expanded, total, onToggle }: { expanded: boolean; total: number; onToggle: () => void }) {
	return (
		<Button variant='ghost' size='sm' aria-expanded={expanded} onClick={onToggle} className='text-link hover:text-link'>
			{expanded ? "Show fewer" : `View all · ${total}`}
			<ChevronDownIcon
				aria-hidden='true'
				className={cn("transition-transform duration-160 motion-reduce:transition-none", expanded && "rotate-180")}
			/>
		</Button>
	);
}

/** A card's list: rows between rules, the first with one above it too. */
function CardList({ children, ...props }: React.ComponentProps<"ul">) {
	return (
		<ul className='flex flex-col' {...props}>
			{children}
		</ul>
	);
}

/**
 * One row of a card's list: what it is (base semibold), then a line with its particulars (`detail` in `foreground`,
 * `extra` muted after it), and at the right a status Badge or a time (`aside`). `children` add lines under them.
 */
function CardRow({
	title,
	detail,
	extra,
	join = " · ",
	aside,
	children,
}: {
	title: React.ReactNode;
	detail?: React.ReactNode;
	extra?: React.ReactNode;
	/** What goes between `detail` and `extra`. */
	join?: string;
	aside?: React.ReactNode;
	children?: React.ReactNode;
}) {
	return (
		<li className='flex items-center justify-between gap-3 border-b border-border px-2 py-3 first:border-t'>
			<div className='flex min-w-0 flex-col gap-1'>
				<div className='flex flex-col'>
					<span className='text-base font-semibold text-foreground'>{title}</span>
					{detail || extra ? (
						<span className='text-sm text-muted-foreground'>
							{detail ? <span className='text-foreground'>{detail}</span> : null}
							{detail && extra ? join : null}
							{extra}
						</span>
					) : null}
				</div>
				{children}
			</div>
			{aside ? <div className='shrink-0'>{aside}</div> : null}
		</li>
	);
}

/** A time at the right of a row: "Given 2:53 PM", "Just now". */
function RowTime({ children }: { children: React.ReactNode }) {
	return <span className='text-xs text-muted-foreground'>{children}</span>;
}

/* -------------------------------------------------------------------------- */
/* Clinical findings                                                          */
/* -------------------------------------------------------------------------- */

/** "2 h old", "45 min old": how stale a charted value is. */
function formatAge(at: string, now: number) {
	const minutes = Math.max(0, Math.round((now - Date.parse(at)) / MINUTE));
	return minutes < 60 ? `${minutes} min old` : `${Math.floor(minutes / 60)} h old`;
}

/**
 * The clinical findings across the top (PRD PD-025; Intercept-Live `242:11805`, Nov 9, 2026: "primarily reserved for
 * contextual clinical findings"): the key labs as UCL LabTiles, then what matters for this patient's situation (a vital
 * with the rule it's watched against, the breathing support since it started), so the clinician reads the numbers the
 * plan turns on first. A finding charted too long ago says how old it is, in red, instead of its context.
 */
function ClinicalFindings({ record, now }: { record?: PatientRecord; now: number | null }) {
	const labs = record?.labs ?? [];
	const findings = record?.findings ?? [];
	if (!labs.length && !findings.length)
		return <NoData>{record?.labs ? "No labs resulted in the last 72 hours." : "No lab data for this patient."}</NoData>;
	return (
		<section aria-label='Clinical findings'>
			<ul className='grid grid-cols-2 gap-2 @min-[36rem]:grid-cols-3 @min-[60rem]:grid-cols-4 @min-[80rem]:grid-cols-6'>
				{labs.map((lab) => (
					<li key={`lab-${lab.name}`} className='flex'>
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
				{findings.map((finding) => {
					const stale =
						finding.chartedAt && finding.staleAfterMinutes !== undefined && now !== null
							? now - Date.parse(finding.chartedAt) > finding.staleAfterMinutes * MINUTE
							: false;
					const context = finding.since ? `Since ${formatTime(finding.since)}` : finding.context;
					return (
						<li key={`finding-${finding.name}`} className='flex'>
							<LabTile
								className='flex-1'
								name={finding.name}
								value={finding.value}
								unit={finding.unit}
								previous={finding.previous}
								meta={
									stale && finding.chartedAt && now !== null ? (
										<span className='text-severity-critical-prominent'>{formatAge(finding.chartedAt, now)}</span>
									) : (
										context
									)
								}
								note={finding.note}
							/>
						</li>
					);
				})}
			</ul>
		</section>
	);
}

/* -------------------------------------------------------------------------- */
/* Cards                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The patient's live bedside monitor (PRD PD-021) under "Live monitoring", with how many of the patient's devices are
 * reporting: the monitor, and the ventilator and the pumps when the record has them.
 */
function LiveMonitoringCard({
	record,
	monitor,
	name,
}: {
	record?: PatientRecord;
	monitor: PatientDetailsProps["monitor"];
	name: string;
}) {
	const devices = [Boolean(monitor?.vitals), ...(record?.ventilator ? [true] : []), ...(record?.infusions?.length ? [true] : [])];
	const connected = devices.filter(Boolean).length;
	return (
		<OverviewCard
			title='Live monitoring'
			leading={
				monitor?.vitals ? <span aria-hidden='true' className='size-2.5 shrink-0 rounded-full bg-success' /> : undefined
			}
			meta={`${connected}/${devices.length} ${devices.length === 1 ? "device" : "devices"} connected`}
		>
			{monitor?.vitals ? (
				<PatientMonitor
					aria-label={`Bedside monitor, ${name}`}
					vitals={monitor.vitals}
					limits={monitor.limits}
					alarmPriorities={monitor.alarmPriorities}
					acknowledgedAlarms={monitor.acknowledgedAlarms}
					trends={monitor.trends}
					className='min-h-60 flex-1'
				/>
			) : (
				<NoData>No live monitor data for this patient.</NoData>
			)}
		</OverviewCard>
	);
}

/** A thing the pathway runs, under its row: the info icon, or the alert icon in red when it's overdue. */
function RunningLine({ item }: { item: PatientPathwayRunning }) {
	const Icon = item.overdue ? CircleAlertIcon : InfoIcon;
	return (
		<p
			className={cn(
				"flex items-start gap-1.5 text-sm font-medium",
				item.overdue ? "text-severity-critical-prominent" : "text-info",
			)}
		>
			<span className='flex h-[1lh] shrink-0 items-center'>
				<Icon aria-hidden='true' className='size-4' />
			</span>
			<span>
				{item.label}
				{item.detail ? ` · ${item.detail}` : null}
				{item.overdue ? <span className='sr-only'> (overdue)</span> : null}
			</span>
		</p>
	);
}

/**
 * The care plan (Intercept-Live `242:12310`, Nov 9, 2026, user's call: Figma's rows): a row each for the pathway (the
 * suggestion waiting for review, or the one sent with where co-signature is) with what it runs now under it, and the
 * decision to keep or transfer with how its checkpoints went. The orders, doses and checkpoint details are behind
 * **View full plan**, the page's Pathway panel.
 */
function CarePlanCard({
	plan,
	suggestion,
	running,
	now,
	onOpenPathway,
}: {
	plan?: PatientCarePlan;
	suggestion?: PatientPathwaySuggestion;
	running: PatientPathwayRunning[];
	now: number | null;
	onOpenPathway?: () => void;
}) {
	const pathway = plan?.pathway;
	const transfer = plan?.transfer;
	const passed = transfer?.checkpoints.filter((checkpoint) => checkpoint.result?.status === "passed").length ?? 0;
	const missed = transfer?.checkpoints.some((checkpoint) => checkpoint.result?.status === "missed");
	const updated = latest([pathway?.at, pathway?.cosignedAt, transfer?.at]);
	const hasPathwayRow = Boolean(pathway || suggestion);

	return (
		<OverviewCard
			title='Care plan'
			actions={onOpenPathway ? <CardLink onClick={onOpenPathway}>View full plan</CardLink> : undefined}
			footer={updated ? <CardSource>{freshness("Intercept", updated, now)}</CardSource> : undefined}
		>
			{hasPathwayRow || running.length || transfer ? (
				<CardList>
					{pathway ? (
						<CardRow
							title={pathway.title}
							detail={`${pathway.orders.length} ${pathway.orders.length === 1 ? "order" : "orders"}`}
							extra={pathwayLine(pathway)}
							aside={
								<Badge variant={pathwayStatuses[pathway.status].variant} size='xs'>
									{pathwayStatuses[pathway.status].label}
								</Badge>
							}
						>
							{running.map((item) => (
								<RunningLine key={item.label} item={item} />
							))}
						</CardRow>
					) : suggestion ? (
						<CardRow
							title={suggestion.title}
							detail={`${suggestion.orders === 1 ? "1 order" : `${suggestion.orders} orders`} waiting for your review`}
							aside={
								<Badge variant='yellow' size='xs'>
									Needs review
								</Badge>
							}
						>
							{running.map((item) => (
								<RunningLine key={item.label} item={item} />
							))}
						</CardRow>
					) : (
						running.map((item) => (
							<CardRow
								key={item.label}
								title={item.label}
								detail={item.detail}
								aside={
									<Badge variant={item.overdue ? "red" : "blue"} size='xs'>
										{item.overdue ? "Overdue" : "In progress"}
									</Badge>
								}
							/>
						))
					)}
					{transfer ? (
						<CardRow
							title={transfer.label}
							detail={
								transfer.checkpoints.length
									? `${passed} of ${transfer.checkpoints.length} checkpoints passed`
									: transfer.rationale
							}
							extra={[transfer.by, formatTime(transfer.at)].filter(Boolean).join(" · ")}
							aside={
								transfer.outcome ? (
									<Badge variant='green' size='xs'>
										{transfer.outcome.label}
									</Badge>
								) : missed ? (
									<Badge variant='red' size='xs'>
										Checkpoint missed
									</Badge>
								) : transfer.checkpoints.length > passed ? (
									<Badge variant='secondary' size='xs'>
										Checkpoints due
									</Badge>
								) : undefined
							}
						/>
					) : null}
				</CardList>
			) : (
				<NoData>No care plan recorded for this patient.</NoData>
			)}
		</OverviewCard>
	);
}

/** What's due next, soonest first (Intercept-Live `239:11497`): each with its time and how soon. */
function UpNextCard({ record, now, pathway }: { record?: PatientRecord; now: number | null; pathway?: OverviewPathway }) {
	const [showAll, setShowAll] = React.useState(false);
	const items = now === null ? [] : upNextItems(record, now, pathway);
	const shown = showAll ? items : items.slice(0, UP_NEXT_ITEMS);
	return (
		<OverviewCard
			title='Up next'
			actions={
				items.length > UP_NEXT_ITEMS ? (
					<CardToggle expanded={showAll} total={items.length} onToggle={() => setShowAll(!showAll)} />
				) : undefined
			}
		>
			{items.length ? (
				<CardList>
					{shown.map((item) => {
						const chip = now === null ? undefined : dueChip(item.at, now);
						return (
							<CardRow
								key={item.id}
								title={item.title}
								detail={<time dateTime={item.at}>{formatTime(item.at)}</time>}
								extra={item.detail}
								aside={
									chip ? (
										<Badge variant={chip.variant} size='xs'>
											{chip.label}
										</Badge>
									) : undefined
								}
							/>
						);
					})}
				</CardList>
			) : (
				<NoData>Nothing scheduled in the next {UP_NEXT_HOURS} hours.</NoData>
			)}
		</OverviewCard>
	);
}

/**
 * What the patient is on: the scheduled medications, each with when it was last given (when it's next due is Up
 * next's), and the infusions and as-needed ones counted under them. **View all** opens Medications.
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
		<OverviewCard
			title='Medications'
			actions={
				onShowAll && total ? (
					<CardLink onClick={onShowAll} aria-label={`View all ${total} medications`}>
						View all · {total}
					</CardLink>
				) : undefined
			}
			footer={others.length ? <p className='text-sm text-muted-foreground'>Plus {others.join(" and ")}.</p> : undefined}
		>
			{medications ? (
				scheduled.length ? (
					<CardList>
						{scheduled.map((med) => (
							<CardRow
								key={med.drug}
								title={`${med.drug} ${med.dose === "Per scale" ? "" : `${med.dose} `}${med.route}`.replace(/\s+/g, " ")}
								detail={med.frequency}
								extra={med.indication}
								aside={
									<RowTime>
										{med.lastGivenAt
											? now !== null && Date.parse(med.lastGivenAt) < now - 12 * HOUR
												? `Given ${formatRelativeDate(med.lastGivenAt, now).label.toLowerCase()}`
												: `Given ${formatTime(med.lastGivenAt)}`
											: "Not given yet"}
									</RowTime>
								}
							/>
						))}
					</CardList>
				) : (
					<NoData>No scheduled medications.</NoData>
				)
			) : (
				<NoData>No medication data for this patient.</NoData>
			)}
		</OverviewCard>
	);
}

/** "0.22 mcg/kg/min": the number medium, the unit regular. */
function Rate({ rate }: { rate?: string }) {
	if (!rate) return <span className='text-base text-muted-foreground'>Rate unavailable</span>;
	const space = rate.indexOf(" ");
	return (
		<span className='text-base text-foreground tabular-nums'>
			<span className='font-medium'>{space < 0 ? rate : rate.slice(0, space)}</span>
			{space < 0 ? null : rate.slice(space)}
		</span>
	);
}

/**
 * Organ support (PRD PD-022) and fluids (DU-18) in one card (Intercept-Live `252:10474`): the breathing support and its
 * main settings with the last ABG, each infusion's rate and last change, then intake and output (✅ user's call, kept
 * here) and where it all comes from.
 */
function OxygenAndInfusionsCard({ record, now, onShowAll }: { record?: PatientRecord; now: number | null; onShowAll?: () => void }) {
	const ventilator = record?.ventilator;
	const infusions = record?.infusions;
	const fluids = record?.fluids;
	const updated = latest([ventilator?.updatedAt, ...(infusions?.map((infusion) => infusion.updatedAt) ?? [])]);
	const source = [ventilator?.source, infusions?.length ? "Pump" : undefined].filter(Boolean).join(", ");

	return (
		<OverviewCard
			title='Oxygen and infusions'
			actions={
				onShowAll && infusions?.length ? (
					<CardLink onClick={onShowAll} aria-label={`View all ${infusions.length} infusions`}>
						View all · {infusions.length}
					</CardLink>
				) : undefined
			}
			footer={
				<>
					{fluids ? (
						<p className='text-sm text-muted-foreground'>
							<span className='text-foreground'>Net balance {fluids.netBalance}</span> · weight {fluids.weightChange} over{" "}
							{fluids.window} · charted{fluids.chartedBy ? ` by ${fluids.chartedBy}` : null} at {formatTime(fluids.chartedAt)}
						</p>
					) : (
						<NoData>No intake and output charted for this patient.</NoData>
					)}
					{updated && source ? <CardSource>{freshness(source, updated, now)}</CardSource> : null}
				</>
			}
		>
			{ventilator || infusions?.length ? (
				<CardList>
					{ventilator ? (
						<CardRow
							title={ventilator.support === "Invasive" ? "Ventilator" : ventilator.support}
							detail={ventilator.mode}
							extra={ventilator.abg ? `Last ABG ${formatTime(ventilator.abg.collectedAt)}` : undefined}
							aside={
								<span className='text-base text-foreground tabular-nums'>
									{ventilator.settings.slice(0, 2).map((setting, index) => (
										<React.Fragment key={setting.label}>
											{index ? " · " : null}
											{setting.label} <span className='font-medium'>{setting.value}</span>
										</React.Fragment>
									))}
								</span>
							}
						/>
					) : null}
					{infusions?.map((infusion) => (
						<CardRow
							key={infusion.drug}
							title={infusion.drug}
							detail={
								infusion.change ? (
									<>
										<span aria-hidden='true'>{infusion.change.direction === "up" ? "▲" : "▼"} </span>
										{infusion.change.direction === "up" ? "Up" : "Down"} from {infusion.change.from}
									</>
								) : undefined
							}
							extra={infusion.change ? `at ${formatTime(infusion.change.at)}` : undefined}
							join=' '
							aside={<Rate rate={infusion.rate} />}
						/>
					))}
				</CardList>
			) : null}
			{ventilator ? null : <NoData>No ventilator or oxygen data for this patient.</NoData>}
			{infusions ? (infusions.length ? null : <NoData>No infusions running.</NoData>) : <NoData>No pump data for this patient.</NoData>}
		</OverviewCard>
	);
}

// Orders' status colors (Intercept-Live `252:10517`: Active green, Collected sky).
const orderStatusVariants: Record<string, BadgeProps["variant"]> = {
	Active: "green",
	Collected: "sky",
	Scheduled: "secondary",
	Pending: "yellow",
};

/** How many recent orders the Overview lists; Orders has them all. */
const RECENT_ORDERS = 4;

/**
 * The newest active orders with their status, and the order recommendations waiting for a decision as a link. Both
 * links open Orders.
 */
function RecentOrdersCard({ record, now, onShowAll }: { record?: PatientRecord; now: number | null; onShowAll?: () => void }) {
	const orders = record?.orders;
	const recent = [...(orders?.active ?? [])].sort((a, b) => Date.parse(b.orderedAt) - Date.parse(a.orderedAt)).slice(0, RECENT_ORDERS);
	const waiting = orders?.recommendations.filter((recommendation) => !recommendation.outcome).length ?? 0;

	return (
		<OverviewCard
			title='Recent orders'
			actions={
				onShowAll && orders ? (
					<>
						{waiting ? (
							<CardLink onClick={onShowAll}>
								{waiting} {waiting === 1 ? "recommendation" : "recommendations"}
							</CardLink>
						) : null}
						<CardLink onClick={onShowAll}>All orders</CardLink>
					</>
				) : undefined
			}
			footer={orders ? <CardSource>{freshness(orders.source, orders.updatedAt, now)}</CardSource> : undefined}
		>
			{orders ? (
				recent.length ? (
					<CardList>
						{recent.map((order) => (
							<CardRow
								key={order.id}
								title={order.name}
								detail={order.details}
								extra={order.orderedBy}
								aside={
									<Badge variant={orderStatusVariants[order.status] ?? "secondary"} size='xs'>
										{order.status}
									</Badge>
								}
							/>
						))}
					</CardList>
				) : (
					<NoData>No active orders.</NoData>
				)
			) : (
				<NoData>No order data for this patient.</NoData>
			)}
		</OverviewCard>
	);
}

/** Why the patient is here (PRD PD-026): the admitting diagnosis, the problem list and when and where from. */
function EncounterCard({ record }: { record?: PatientRecord }) {
	return (
		<OverviewCard title='Encounter'>
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
		</OverviewCard>
	);
}

/**
 * The patient's referrals (Intercept-Live `242:11802`, Nov 9, 2026, user's call: built with an empty state, as Figma
 * draws only the title): the discharge workflow's, each with who receives it and whether it was sent, skipped or is
 * still to send. None says so.
 */
function ReferralsCard({ record }: { record?: PatientRecord }) {
	const referrals = record?.discharge?.referrals ?? [];
	const decided = record?.discharge?.decided ?? {};
	return (
		<OverviewCard title='Referrals'>
			{referrals.length ? (
				<CardList>
					{referrals.map((referral) => {
						const outcome = decided[referral.id];
						return (
							<CardRow
								key={referral.id}
								title={referral.title}
								detail={referral.to}
								extra={referral.detail}
								aside={
									outcome?.type === "sent" ? (
										<Badge variant='green' size='xs'>
											Sent
										</Badge>
									) : outcome?.type === "skipped" ? (
										<Badge variant='secondary' size='xs'>
											Skipped
										</Badge>
									) : (
										<Badge variant='yellow' size='xs'>
											To send
										</Badge>
									)
								}
							/>
						);
					})}
				</CardList>
			) : (
				<NoData>No referrals for this patient.</NoData>
			)}
		</OverviewCard>
	);
}

/* -------------------------------------------------------------------------- */
/* PatientOverview                                                            */
/* -------------------------------------------------------------------------- */

/**
 * The Overview (Intercept-Live `149:4464`, Nov 9, 2026): the AI clinical summary (PD-024) across the top, then the
 * clinical findings (key labs, PD-025, and what matters for this patient), then a grid of cards: live monitoring
 * (PD-021), the care plan, Up next; medications, oxygen and infusions (PD-022, DU-18), recent orders; the encounter
 * (PD-026) and referrals. Three to a row from 80rem of room, two from 50rem, one under that.
 *
 * The alerts aren't here (Nov 9, 2026, user's call): the patient header shows their count and opens them in the Alerts
 * panel. The log moved to the Timeline, and the score breakdown left with the header's View breakdown.
 */
function PatientOverview({
	patient,
	record,
	monitor,
	onShowSection,
	pathway,
}: Pick<PatientDetailsProps, "patient" | "record" | "monitor"> & {
	/** Opens another tab: Medications or Orders. */
	onShowSection?: (section: OverviewLinkedSection) => void;
	/** The pathway an open alert brought: the Care plan shows it (suggested, or what it runs) and Up next what it has due. */
	pathway?: OverviewPathway;
}) {
	const now = useCurrentMinute();
	const navigation = usePatientNavigation();
	const name = `${patient.lastName}, ${patient.firstName}`;
	const { suggestion, running } = pathway ? pathwaySummary(pathway, now) : { suggestion: undefined, running: [] };
	// × hides the brief until a newer one (its own time) or another patient; the brief is optional (PRD §3.4).
	const briefKey = record?.brief ? `${patient.id}:${record.brief.updatedAt}` : undefined;
	const [dismissedBrief, setDismissedBrief] = React.useState<string>();
	const showMedications = onShowSection && (() => onShowSection("medications"));

	return (
		// A size container, so the layout follows the room the side panels leave.
		<div className='@container'>
			<div className='flex flex-col gap-6'>
				{record?.brief && briefKey !== dismissedBrief ? (
					<BriefBanner
						brief={record.brief}
						now={now}
						onClose={() => setDismissedBrief(briefKey)}
						onAsk={
							navigation
								? () => navigation.askAboutPatient(patient.id, name, patient.tags?.map((tag) => tag.label), briefQuestion)
								: undefined
						}
					/>
				) : null}

				<ClinicalFindings record={record} now={now} />

				<div className='grid gap-4 @min-[50rem]:grid-cols-2 @min-[80rem]:grid-cols-3'>
					<LiveMonitoringCard record={record} monitor={monitor} name={name} />
					<CarePlanCard
						plan={record?.carePlan}
						suggestion={suggestion}
						running={running}
						now={now}
						onOpenPathway={pathway?.onOpen}
					/>
					<UpNextCard record={record} now={now} pathway={pathway} />
					<MedicationsCard record={record} now={now} onShowAll={showMedications} />
					<OxygenAndInfusionsCard record={record} now={now} onShowAll={showMedications} />
					<RecentOrdersCard record={record} now={now} onShowAll={onShowSection && (() => onShowSection("orders"))} />
					<EncounterCard record={record} />
					<ReferralsCard record={record} />
				</div>
			</div>
		</div>
	);
}

export { AlertsSection, PatientOverview, type OverviewLinkedSection, type OverviewPathway };
