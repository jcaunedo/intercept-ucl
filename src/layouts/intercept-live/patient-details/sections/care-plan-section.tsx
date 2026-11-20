import * as React from "react";
import { ChevronDownIcon, CircleAlertIcon, CircleCheckIcon, GitForkIcon, InfoIcon, TrendingUpIcon, type LucideIcon } from "lucide-react";
import { AnimatePresence } from "motion/react";

import { Button } from "@/components/buttons/button";
import { CarePlanPathway, CarePlanProblemCard, carePlanProblemStatuses } from "@/components/cards/care-plan-problem-card";
import { Badge, type BadgeProps } from "@/components/data-display/badge";
import { FilterBar, FilterBarChip, FilterBarFilters } from "@/components/forms/filter-bar";
import { useCurrentMinute } from "@/lib/hooks/use-current-minute";
import { formatRelativeDate } from "@/lib/relative-date";
import { cn } from "@/lib/utils";

import type { AlertDetailData } from "../../alert-panel/alert-panel";
import { Expand } from "../../alert-panel/care-pathway";
import type { CarePathwayStatus } from "../../alert-panel/care-pathway";
import {
	pathwayLine,
	pathwayStatuses,
	type PatientCarePlan,
	type PatientPathwayRunning,
	type PatientPathwaySuggestion,
	type PatientPlanOfCare,
	type PatientPlanOfCareItem,
	type PatientPlanOfCareStatus,
} from "../activity";
import type { PatientRecord } from "../patient-details";
import {
	CardLink,
	CardList,
	CardRow,
	CardSource,
	CardToggle,
	Detail,
	dueChip,
	formatSpan,
	formatTime,
	formatWhen,
	freshness,
	latest,
	NoData,
	OverviewCard,
} from "../section-parts";

// The care plan (PRD Patient details, "Care Plan tab"): what's wrong with the patient (the problems), what the team wants
// for each (a measurable goal), what it does toward it (the interventions) and whether it's working (the status). The
// hospital keeps it, its plan of care in the record system; Intercept adds pathways (order sets an alert suggested, sent
// for the local physician's co-signature), what they run (a bundle, a protocol, bedside tasks) and keep or transfer.
//
// The Care Plan tab (`CarePlanSection`, Nov 20, 2026, user's call: problem-centered) shows it problem by problem, each
// pathway inside the problem it treats (`problemId`). The Overview's Care plan (`CarePlanCard`) is its compact summary.
// The data types are in `../activity.tsx`, shared with the alert modal's care plan.

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/* -------------------------------------------------------------------------- */
/* The pathway's lines                                                        */
/* -------------------------------------------------------------------------- */

/**
 * The pathway an open alert brought, as the Overview shows it (Nov 6, 2026): the alert's detail (its pathway, sepsis
 * bundle, protocol and bedside tasks), where the pathway is now, and the way to the page's Pathway panel.
 */
type OverviewPathway = {
	detail: AlertDetailData;
	status: CarePathwayStatus;
	/** When the clinician marked it completed, as the session has it. */
	completedAt?: string;
	onOpen?: () => void;
};

type RecordedPathway = NonNullable<PatientCarePlan["pathway"]>;

/**
 * The pathway as it stands: an active pathway is **Completed** when the clinician marked it (`sessionStatus`), or when the
 * bedside team evaluated the problem it treats as Met (Nov 20, 2026, user's call: the problem's goal says when the
 * pathway worked), then with when and why.
 */
function withCompletion(
	pathway: RecordedPathway,
	planOfCare: PatientPlanOfCare | undefined,
	sessionStatus?: CarePathwayStatus,
	sessionCompletedAt?: string,
): RecordedPathway {
	if (pathway.status !== "active") return pathway;
	if (sessionStatus === "completed")
		return { ...pathway, status: "completed", completedAt: sessionCompletedAt ?? pathway.completedAt };
	const problem = planOfCare?.items.find((item) => item.id === pathway.problemId);
	if (problem?.status !== "met") return pathway;
	return {
		...pathway,
		status: "completed",
		completedAt: problem.evaluatedAt ?? planOfCare?.reviewedAt,
		completedBecause: `${problem.problem} met`,
	};
}

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

/* -------------------------------------------------------------------------- */
/* CarePlanCard                                                               */
/* -------------------------------------------------------------------------- */

// A plan-of-care goal's status, in the words of the nursing care plan's evaluation: the problem card's own words.
const planOfCareStatuses: Record<PatientPlanOfCareStatus, { label: string; variant: BadgeProps["variant"] }> =
	carePlanProblemStatuses;

/**
 * The Care plan's rows on the Overview, Intercept's included, before View all: its three-line rows fill about the height
 * of Up next's five two-line rows (Nov 13, 2026, user's call: Up next is the reference, no scrolling inside a card).
 */
const CARE_PLAN_ROWS = 4;

/**
 * The care plan (Intercept-Live `242:12310`, Nov 9, 2026, user's call: Figma's rows): a row each for the pathway (the
 * suggestion waiting for review, or the one sent with where co-signature is) with what it runs now under it, and the
 * decision to keep or transfer with how its checkpoints went. Under them, the hospital's plan of care from its record
 * system (Nov 11, 2026, user's call: every admitted patient has one): a row per problem with its goal, what's done toward
 * it and how it's going. A source line each, Intercept's and the record system's. The Overview's compact summary; the
 * Care Plan tab (`CarePlanSection`) shows the same plan problem by problem.
 */
function CarePlanCard({
	plan,
	planOfCare,
	suggestion,
	running,
	now,
	onShowAll,
	className,
}: {
	plan?: PatientCarePlan;
	planOfCare?: PatientPlanOfCare;
	suggestion?: PatientPathwaySuggestion;
	running: PatientPathwayRunning[];
	now: number | null;
	/** "View all · n" opens the Care Plan tab instead of showing the rest in place. */
	onShowAll?: () => void;
	className?: string;
}) {
	const [showAll, setShowAll] = React.useState(false);
	const pathway = plan?.pathway && withCompletion(plan.pathway, planOfCare);
	const transfer = plan?.transfer;
	const passed = transfer?.checkpoints.filter((checkpoint) => checkpoint.result?.status === "passed").length ?? 0;
	const missed = transfer?.checkpoints.some((checkpoint) => checkpoint.result?.status === "missed");
	const updated = latest([pathway?.at, pathway?.cosignedAt, transfer?.at]);
	const hasPathwayRow = Boolean(pathway || suggestion);
	const hasInterceptRows = hasPathwayRow || running.length > 0 || Boolean(transfer);
	const planItems = planOfCare?.items ?? [];
	// The problems fill the rows Intercept's (the pathway or what runs, keep or transfer) leave, at least one.
	const interceptRows = (hasPathwayRow ? 1 : running.length) + (transfer ? 1 : 0);
	const problemRows = Math.max(1, CARE_PLAN_ROWS - interceptRows);
	const hasMore = planItems.length > problemRows;
	const shownPlanItems = showAll ? planItems : planItems.slice(0, problemRows);

	return (
		<OverviewCard
			title='Care plan'
			className={className}
			// No "View full plan" since Nov 13, 2026 (user's call): the Care Plan tab's pathway blocks open the pathway.
			actions={
				hasMore ? (
					onShowAll ? (
						<CardLink onClick={onShowAll} aria-label={`View all ${planItems.length} problems of the care plan`}>
							View all · {planItems.length}
						</CardLink>
					) : (
						<CardToggle expanded={showAll} total={planItems.length} onToggle={() => setShowAll(!showAll)} />
					)
				) : undefined
			}
			footer={
				updated || planOfCare ? (
					<>
						{updated ? <CardSource>{freshness("Intercept", updated, now)}</CardSource> : null}
						{planOfCare ? <CardSource>{freshness(planOfCare.source, planOfCare.reviewedAt, now)}</CardSource> : null}
					</>
				) : undefined
			}
		>
			{hasInterceptRows || planItems.length ? (
				<CardList capped={!showAll}>
					{pathway ? (
						<CardRow
							title={pathway.title}
							detail={`${pathway.orders.length} ${pathway.orders.length === 1 ? "order" : "orders"}`}
							extra={pathwayLine(pathway, now)}
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
							extra={[transfer.by, formatWhen(transfer.at, now)].filter(Boolean).join(" · ")}
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
					{shownPlanItems.map((item) => (
						<CardRow
							key={item.problem}
							title={item.problem}
							detail={`Goal: ${item.goal}`}
							aside={
								<Badge variant={planOfCareStatuses[item.status].variant} size='xs'>
									{planOfCareStatuses[item.status].label}
								</Badge>
							}
						>
							{item.interventions ? <p className='text-sm text-muted-foreground'>{item.interventions}</p> : null}
						</CardRow>
					))}
				</CardList>
			) : (
				<NoData>Care plan not received from the record system yet.</NoData>
			)}
		</OverviewCard>
	);
}

/* -------------------------------------------------------------------------- */
/* CarePlanSection                                                            */
/* -------------------------------------------------------------------------- */

/** A pathway as the tab shows it, from an alert or from the recorded plan. */
type PathwayBlockData = {
	key: string;
	title: string;
	/** Needs review (suggested), Awaiting co-signature, Active, Declined; or, for what runs without a pathway, In progress / Overdue. */
	badge: { label: string; variant: BadgeProps["variant"] };
	suggested: boolean;
	/** Under the title: the orders waiting for review, or where the pathway is, with when. */
	line?: string;
	/** Muted, after the line: where a suggestion comes from, how many orders were sent. */
	extra?: string;
	running: PatientPathwayRunning[];
	/** The plan-of-care problem it treats. */
	problemId?: string;
	onOpen?: () => void;
	/** Its steps, for its problem's history: the alert that suggested it, sent, co-signed, declined, completed. */
	events: ProblemEvent[];
	/** Its orders, for its problem's details, with their status from the pathway (none while it's suggested). */
	orders: ProblemOrder[];
};

/** One line of a problem's history: an evaluation by the bedside team (`status`), or a step of a pathway that treats it. */
type ProblemEvent = { key: string; at: string; title: string; detail?: string; by?: string; status?: PatientPlanOfCareStatus };

/** One order of a pathway, as the problem's details list it. `suggested`: the dose it replaced, when edited. */
type ProblemOrder = { name: string; dose: string; suggested?: string; status?: { label: string; variant: BadgeProps["variant"] } };

const severityWords = { critical: "Critical", high: "High", medium: "Medium", low: "Low" } as const;

/** The alert that suggested a pathway, as its first step. */
const alertEvent = (detail: AlertDetailData, pathwayTitle?: string): ProblemEvent => ({
	key: `${detail.alert.id}-alert`,
	at: detail.alert.firedAt,
	title: `${severityWords[detail.alert.severity] ?? "An"} alert: ${detail.alert.title}`,
	detail: pathwayTitle ? `Suggested the ${pathwayTitle}` : undefined,
	by: detail.alert.source.name,
});

/** A pathway's steps once it was decided: sent, co-signed, declined, completed. */
function decidedEvents(key: string, state: RecordedPathway): ProblemEvent[] {
	if (state.status === "declined")
		return [{ key: `${key}-declined`, at: state.at, title: `${state.title} declined`, detail: state.rationale, by: state.by }];
	const edited = state.orders.filter((order) => order.suggested).length;
	return [
		{
			key: `${key}-sent`,
			at: state.at,
			title: `${state.title} sent for co-signature`,
			detail: edited ? `${edited} edited ${edited === 1 ? "dose" : "doses"}` : undefined,
			by: state.by,
		},
		...(state.cosignedAt
			? [{ key: `${key}-cosigned`, at: state.cosignedAt, title: `Co-signed by ${state.cosigner ?? "the local physician"}`, detail: "Orders active" }]
			: []),
		...(state.status === "completed" && state.completedAt
			? [
					{
						key: `${key}-completed`,
						at: state.completedAt,
						title: `${state.title} completed`,
						detail: state.completedBecause,
						by: state.completedBecause ? undefined : (state.by ?? "You"),
					},
				]
			: []),
	];
}

/** A pathway's orders with their status: awaiting co-signature, or active (still once it's completed). */
function pathwayOrders(state: RecordedPathway | undefined, orders: { name: string; dose: string; suggested?: string }[]): ProblemOrder[] {
	if (state?.status === "declined") return [];
	const status = !state
		? undefined
		: state.status === "pending"
			? { label: "Awaiting co-signature", variant: "amber" as const }
			: { label: "Active", variant: "green" as const };
	return orders.map((order) => ({ ...order, status }));
}

/** The tab's chips, in the problems' order: what needs the clinician first, then each status. */
type CarePlanFilterId = "review" | PatientPlanOfCareStatus;

const carePlanFilters: { id: CarePlanFilterId; label: string; icon: LucideIcon; empty: string }[] = [
	{ id: "review", label: "Needs review", icon: GitForkIcon, empty: "No pathway is waiting for review." },
	{ id: "not-progressing", label: "Not progressing", icon: CircleAlertIcon, empty: "Every problem is progressing or met." },
	{ id: "progressing", label: "Progressing", icon: TrendingUpIcon, empty: "No problem is progressing." },
	{ id: "met", label: "Met", icon: CircleCheckIcon, empty: "No problem is met yet." },
];

/** Where each problem sits: one with a pathway waiting for review first, then not progressing, progressing, met. */
const problemOrder: Record<PatientPlanOfCareStatus, number> = { "not-progressing": 1, progressing: 2, met: 3 };

/** "9 h ago", "just now": how long ago, for "Evaluated 9 h ago" and "Meditech · reviewed 9 h ago". */
const ago = (at: string, now: number) => formatRelativeDate(at, now).label.toLowerCase();

const ordersLabel = (count: number) => `${count} ${count === 1 ? "order" : "orders"}`;

/**
 * The tab's pathways: each alert's (suggested, or where it is, from the recorded plan when it's the same pathway), what
 * each runs, and the recorded plan's pathway when no alert brings it (the alert has left). An alert with no pathway but
 * something running (a sepsis bundle before its pathway) shows each running line as its own block, as the Overview does.
 */
function pathwayBlocks(
	plan: PatientCarePlan | undefined,
	planOfCare: PatientPlanOfCare | undefined,
	pathways: OverviewPathway[],
	now: number | null,
): PathwayBlockData[] {
	const recorded = plan?.pathway && withCompletion(plan.pathway, planOfCare);
	const blocks: PathwayBlockData[] = [];
	let recordedShown = false;
	for (const item of pathways) {
		const { detail, status, onOpen } = item;
		const { suggestion, running } = pathwaySummary(item, now);
		const problemId = detail.problemId;
		const key = detail.alert.id;
		if (suggestion) {
			blocks.push({
				key,
				title: suggestion.title,
				badge: { label: "Needs review", variant: "yellow" },
				suggested: true,
				line: `${ordersLabel(suggestion.orders)} waiting for your review`,
				extra: suggestion.source,
				running,
				problemId,
				onOpen,
				events: [alertEvent(detail, suggestion.title)],
				orders: pathwayOrders(undefined, detail.pathway?.orders ?? []),
			});
		} else if (detail.pathway) {
			const same = recorded && recorded.title === detail.pathway.title ? recorded : undefined;
			if (same) recordedShown = true;
			const record = detail.pathwayRecord;
			// The recorded plan when it has this pathway; the alert's record of it otherwise. Completed when marked, or when
			// its problem is Met.
			const recordedState: RecordedPathway | undefined =
				same ??
				(status !== "suggested" && record?.sentAt
					? {
							title: detail.pathway.title,
							status: status === "completed" ? "active" : status,
							orders: detail.pathway.orders,
							at: record.sentAt,
							cosigner: detail.pathway.cosigner.name,
							cosignedAt: record?.cosignedAt,
							completedAt: record?.completedAt,
							rationale: record?.rationale,
							problemId,
						}
					: undefined);
			const state =
				recordedState &&
				withCompletion(
					{ ...recordedState, problemId: recordedState.problemId ?? problemId },
					planOfCare,
					status,
					item.completedAt,
				);
			const done = (state?.status ?? status) === "completed";
			const badgeStatus = status === "suggested" ? "pending" : status;
			const edited = same
				? same.orders.filter((order) => order.suggested).length
				: (record?.edited?.length ?? 0);
			const count = same ? same.orders.length : detail.pathway.orders.length;
			blocks.push({
				key,
				title: detail.pathway.title,
				badge: pathwayStatuses[state?.status ?? badgeStatus],
				suggested: false,
				line: state
					? pathwayLine(state, now)
					: done && item.completedAt
						? `Completed · ${formatWhen(item.completedAt, now)}`
						: undefined,
				extra: [ordersLabel(count), edited ? `${edited} edited` : undefined].filter(Boolean).join(" · "),
				// Nothing runs once it's done.
				running: done ? [] : running,
				problemId: same?.problemId ?? problemId,
				onOpen,
				events: [alertEvent(detail, detail.pathway.title), ...(state ? decidedEvents(key, state) : [])],
				orders: pathwayOrders(
					state,
					same
						? same.orders
						: detail.pathway.orders.map((order) => ({
								name: order.name,
								dose: order.dose,
								suggested: record?.edited?.includes(order.id)
									? record.suggested?.find((item) => item.id === order.id)?.dose
									: undefined,
							})),
				),
			});
		} else {
			for (const line of running)
				blocks.push({
					key: `${key}-${line.label}`,
					title: line.label,
					badge: line.overdue ? { label: "Overdue", variant: "red" } : { label: "In progress", variant: "blue" },
					suggested: false,
					line: line.detail,
					running: [],
					problemId,
					onOpen,
					events: [{ ...alertEvent(detail), key: `${key}-${line.label}-alert`, detail: `Started ${line.label}` }],
					orders: [],
				});
		}
	}
	if (recorded && !recordedShown) {
		const edited = recorded.orders.filter((order) => order.suggested).length;
		blocks.push({
			key: "recorded",
			title: recorded.title,
			badge: pathwayStatuses[recorded.status],
			suggested: false,
			line: pathwayLine(recorded, now),
			extra: [ordersLabel(recorded.orders.length), edited ? `${edited} edited` : undefined].filter(Boolean).join(" · "),
			running: [],
			problemId: recorded.problemId,
			events: decidedEvents("recorded", recorded),
			orders: pathwayOrders(recorded, recorded.orders),
		});
	}
	return blocks;
}

/**
 * A pathway inside its problem's card: its title and status, where it is (with when), its orders, what it runs now, and
 * the way to it, **Review pathway** while it's a suggestion, **Open pathway** after (the page's Pathway panel, or the
 * alert without one). A suggestion is dashed, as in the alert.
 */
function PathwayBlock({ block }: { block: PathwayBlockData }) {
	return (
		<CarePlanPathway
			title={block.title}
			status={block.badge}
			suggested={block.suggested}
			line={block.line}
			extra={block.extra}
			action={block.onOpen ? { label: block.suggested ? "Review pathway" : "Open pathway", onSelect: block.onOpen } : undefined}
		>
			{block.running.length
				? block.running.map((item) => <RunningLine key={item.label} item={item} />)
				: null}
		</CarePlanPathway>
	);
}

/** A problem's history, newest first: the bedside team's evaluations, then the steps of every pathway that treats it. */
function problemHistory(item: PatientPlanOfCareItem, blocks: PathwayBlockData[]): ProblemEvent[] {
	const evaluations: ProblemEvent[] = (item.history ?? []).map((evaluation, index) => ({
		key: `${item.id}-evaluation-${index}`,
		at: evaluation.at,
		title: "Evaluated",
		detail: evaluation.note,
		by: evaluation.by,
		status: evaluation.status,
	}));
	return [...evaluations, ...blocks.flatMap((block) => block.events)].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

/**
 * One problem of the plan of care: the problem and how it's going, its goal, what the bedside team does toward it, when
 * it was last evaluated, then the pathways that treat it (UCL's CarePlanProblemCard). Its History button opens its details
 * in place (Nov 20, 2026, user's call: read-only, the plan is the hospital's): its history, newest first, and the orders
 * its pathways placed.
 */
function ProblemCard({
	item,
	evaluatedAt,
	blocks,
	now,
}: {
	item: PatientPlanOfCareItem;
	evaluatedAt?: string;
	blocks: PathwayBlockData[];
	now: number | null;
}) {
	const history = problemHistory(item, blocks);
	const orders = blocks.flatMap((block) => block.orders.map((order) => ({ ...order, key: `${block.key}-${order.name}` })));
	return (
		<CarePlanProblemCard
			problem={item.problem}
			status={item.status}
			goal={item.goal}
			interventions={item.interventions}
			footer={evaluatedAt && now !== null ? `Evaluated ${ago(evaluatedAt, now)}` : undefined}
			details={
				<div className='flex flex-col gap-4'>
					<div className='flex flex-col gap-1'>
						<h4 className='text-sm font-semibold text-foreground'>History</h4>
						<ul className='flex flex-col'>
							{history.map((event) => (
								<li
									key={event.key}
									className='flex items-start gap-4 border-b border-border py-2.5 first:border-t'
								>
									<time dateTime={event.at} className='w-28 shrink-0 text-sm text-muted-foreground tabular-nums'>
										{formatWhen(event.at, now)}
									</time>
									<div className='flex min-w-0 flex-1 flex-col'>
										<span className='flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-foreground'>
											{event.title}
											{event.status ? (
												<Badge variant={planOfCareStatuses[event.status].variant} size='xs'>
													{planOfCareStatuses[event.status].label}
												</Badge>
											) : null}
										</span>
										{event.detail || event.by ? (
											<span className='text-sm text-muted-foreground'>
												{[event.detail, event.by].filter(Boolean).join(" · ")}
											</span>
										) : null}
									</div>
								</li>
							))}
						</ul>
					</div>
					{orders.length ? (
						<div className='flex flex-col gap-1'>
							<h4 className='text-sm font-semibold text-foreground'>Orders</h4>
							<ul className='flex flex-col'>
								{orders.map((order) => (
									<li
										key={order.key}
										className='flex items-start justify-between gap-3 border-b border-border py-2.5 first:border-t'
									>
										<div className='flex min-w-0 flex-col'>
											<span className='flex flex-wrap items-center gap-x-2 text-sm font-medium text-foreground'>
												{order.name}
												{order.suggested ? (
													<Badge variant='secondary' size='xs'>
														Edited
													</Badge>
												) : null}
											</span>
											<span className='text-sm text-foreground'>{order.dose}</span>
											{order.suggested ? (
												<span className='text-sm text-muted-foreground line-through'>{order.suggested}</span>
											) : null}
										</div>
										{order.status ? (
											<Badge variant={order.status.variant} size='xs' className='shrink-0'>
												{order.status.label}
											</Badge>
										) : null}
									</li>
								))}
							</ul>
						</div>
					) : null}
				</div>
			}
		>
			{blocks.length ? blocks.map((block) => <PathwayBlock key={block.key} block={block} />) : null}
		</CarePlanProblemCard>
	);
}

/**
 * Keep or transfer: the decision, who made it and when, the reason, each checkpoint (when it's due or how soon, what it
 * checks, how it went) and what keeping the patient saved once every checkpoint passed.
 */
function DispositionCard({ transfer, now }: { transfer: NonNullable<PatientCarePlan["transfer"]>; now: number | null }) {
	const passed = transfer.checkpoints.filter((checkpoint) => checkpoint.result?.status === "passed").length;
	return (
		<OverviewCard
			title={transfer.label}
			actions={
				transfer.outcome ? (
					<Badge variant='green' size='sm'>
						{transfer.outcome.label}
					</Badge>
				) : undefined
			}
		>
			<div className='flex flex-col gap-3'>
				<div className='flex flex-col gap-0.5'>
					<p className='text-sm text-foreground'>{transfer.rationale}</p>
					<p className='text-sm text-muted-foreground'>
						{[transfer.by ? `Decided by ${transfer.by}` : "Decided", formatWhen(transfer.at, now)].join(" · ")}
					</p>
				</div>
				{transfer.checkpoints.length ? (
					<div className='flex flex-col gap-2'>
						<h4 className='text-sm font-semibold text-foreground'>
							Checkpoints · {passed} of {transfer.checkpoints.length} passed
						</h4>
						<ul className='flex flex-col'>
							{transfer.checkpoints.map((checkpoint) => {
								const chip = checkpoint.result
									? checkpoint.result.status === "passed"
										? { label: "Passed", variant: "green" as const }
										: { label: "Missed", variant: "red" as const }
									: now === null
										? undefined
										: dueChip(checkpoint.due, now);
								return (
									<li
										key={checkpoint.id}
										className='flex items-start justify-between gap-3 border-b border-border py-2.5 first:border-t'
									>
										<div className='flex min-w-0 flex-col'>
											<span className='text-sm font-medium text-foreground'>
												{checkpoint.label} · {formatWhen(checkpoint.due, now)}
											</span>
											<span className='text-sm text-muted-foreground'>{checkpoint.criteria}</span>
											{checkpoint.result?.detail ? (
												<span className='text-sm text-foreground'>{checkpoint.result.detail}</span>
											) : null}
										</div>
										{chip ? (
											<Badge variant={chip.variant} size='xs' className='shrink-0'>
												{chip.label}
											</Badge>
										) : null}
									</li>
								);
							})}
						</ul>
					</div>
				) : null}
				{transfer.outcome?.items.length ? (
					<dl className='grid gap-x-6 gap-y-2 @min-[32rem]:grid-cols-3'>
						{transfer.outcome.items.map((item) => (
							<Detail key={item.label} label={item.label}>
								{item.value}
							</Detail>
						))}
					</dl>
				) : null}
			</div>
		</OverviewCard>
	);
}

/**
 * The Care Plan tab (Nov 20, 2026, user's call: problem-centered): a summary line and the plan's sources, then a card per
 * problem of the plan of care, a pathway waiting for review first, then not progressing, progressing and met, each with
 * the pathways that treat it inside; the pathways that treat no problem on the plan; then keep or transfer.
 */
function CarePlanSection({ record, pathways = [] }: { record?: PatientRecord; pathways?: OverviewPathway[] }) {
	const now = useCurrentMinute();
	const planOfCare = record?.planOfCare;
	const transfer = record?.carePlan?.transfer;
	const blocks = pathwayBlocks(record?.carePlan, planOfCare, pathways, now);
	const items = planOfCare?.items ?? [];
	const problemIds = new Set(items.map((item) => item.id));
	const blocksFor = (id: string) => blocks.filter((block) => block.problemId === id);
	const unlinked = blocks.filter((block) => !block.problemId || !problemIds.has(block.problemId));
	const needsReview = (id: string) => blocksFor(id).some((block) => block.suggested);
	const problems = items
		.map((item, index) => ({ item, index }))
		.sort(
			(a, b) =>
				Number(needsReview(b.item.id)) - Number(needsReview(a.item.id)) ||
				problemOrder[a.item.status] - problemOrder[b.item.status] ||
				a.index - b.index,
		)
		.map(({ item }) => item);
	// Met problems fold away under the others (Nov 20, 2026, user's call), behind "Show met (n)", as the Alerts panel's
	// resolved alerts: unless one has a pathway waiting for review, or every problem is met (nothing to fold under).
	const [showMet, setShowMet] = React.useState(false);
	const folded = problems.filter((item) => item.status === "met" && !needsReview(item.id));
	const foldMet = folded.length > 0 && folded.length < problems.length;
	const shownProblems = foldMet ? problems.filter((item) => !folded.includes(item)) : problems;
	const problemCard = (item: PatientPlanOfCareItem) => (
		<ProblemCard key={item.id} item={item} evaluatedAt={item.evaluatedAt} blocks={blocksFor(item.id)} now={now} />
	);
	const updated = latest([record?.carePlan?.pathway?.at, record?.carePlan?.pathway?.cosignedAt, transfer?.at]);
	// The chips (Nov 20, 2026, user's call: Monitoring's quick views): one at a time, each narrowing the plan to what it
	// names, pressed again to show everything. Every chip shows its count, 0 included.
	const [filter, setFilter] = React.useState<CarePlanFilterId | null>(null);
	const matches = (id: CarePlanFilterId, item: PatientPlanOfCareItem) =>
		id === "review" ? needsReview(item.id) : item.status === id;
	const counts: Record<CarePlanFilterId, number> = {
		review: blocks.filter((block) => block.suggested).length,
		"not-progressing": items.filter((item) => item.status === "not-progressing").length,
		progressing: items.filter((item) => item.status === "progressing").length,
		met: items.filter((item) => item.status === "met").length,
	};
	const filtered = filter ? problems.filter((item) => matches(filter, item)) : [];
	// Under a filter, only its pathways that aren't tied to a problem: the ones waiting for review.
	const shownUnlinked = filter === null ? unlinked : filter === "review" ? unlinked.filter((block) => block.suggested) : [];

	return (
		<div className='@container flex flex-col gap-4'>
			<FilterBar aria-label='Care plan filters'>
				<FilterBarFilters>
					{carePlanFilters.map(({ id, icon: Icon, label }) => (
						<FilterBarChip
							key={id}
							count={counts[id]}
							pressed={filter === id}
							onPressedChange={(pressed) => setFilter(pressed ? id : null)}
						>
							<Icon aria-hidden='true' />
							{label}
						</FilterBarChip>
					))}
				</FilterBarFilters>
			</FilterBar>
			{planOfCare ? null : <NoData>Care plan not received from the record system yet.</NoData>}
			{filter ? (
				filtered.length || shownUnlinked.length ? (
					filtered.map(problemCard)
				) : (
					<NoData>{carePlanFilters.find((item) => item.id === filter)?.empty}</NoData>
				)
			) : (
				shownProblems.map(problemCard)
			)}
			{!filter && foldMet ? (
				<>
					<Button
						variant='ghost'
						size='xs'
						aria-expanded={showMet}
						onClick={() => setShowMet(!showMet)}
						className='self-start text-link'
					>
						<ChevronDownIcon
							aria-hidden='true'
							className={cn("transition-transform duration-160 motion-reduce:transition-none", showMet && "rotate-180")}
						/>
						{showMet ? "Hide met" : `Show met (${folded.length})`}
					</Button>
					<AnimatePresence initial={false}>
						{showMet ? (
							<Expand key='met' className='flex flex-col gap-4'>
								{folded.map(problemCard)}
							</Expand>
						) : null}
					</AnimatePresence>
				</>
			) : null}
			{shownUnlinked.length ? (
				<OverviewCard title={items.length ? "Other pathways" : "Pathways"}>
					<div className='flex flex-col gap-3'>
						{items.length ? (
							<p className='text-sm text-muted-foreground'>Not tied to a problem on the plan of care.</p>
						) : null}
						{shownUnlinked.map((block) => (
							<PathwayBlock key={block.key} block={block} />
						))}
					</div>
				</OverviewCard>
			) : null}
			{transfer && !filter ? <DispositionCard transfer={transfer} now={now} /> : null}
			{/* Where the plan comes from, at the bottom of the tab (Nov 20, 2026, user's call), as the cards' source lines. */}
			{planOfCare || updated ? (
				<div className='flex flex-col gap-1'>
					{planOfCare ? (
						<CardSource>
							{now === null ? planOfCare.source : `${planOfCare.source} · reviewed ${ago(planOfCare.reviewedAt, now)}`}
						</CardSource>
					) : null}
					{updated ? <CardSource>{freshness("Intercept", updated, now)}</CardSource> : null}
				</div>
			) : null}
		</div>
	);
}

export { CarePlanCard, CarePlanSection, pathwaySummary, type OverviewPathway };
