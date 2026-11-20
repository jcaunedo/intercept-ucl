import * as React from "react";
import { CircleAlertIcon, InfoIcon } from "lucide-react";

import { Badge, type BadgeProps } from "@/components/data-display/badge";
import { useCurrentMinute } from "@/lib/hooks/use-current-minute";
import { cn } from "@/lib/utils";

import type { AlertDetailData } from "../../alert-panel/alert-panel";
import type { CarePathwayStatus } from "../../alert-panel/care-pathway";
import {
	pathwayLine,
	pathwayStatuses,
	type PatientCarePlan,
	type PatientPathwayRunning,
	type PatientPathwaySuggestion,
	type PatientPlanOfCare,
	type PatientPlanOfCareStatus,
} from "../activity";
import type { PatientRecord } from "../patient-details";
import {
	CardLink,
	CardList,
	CardRow,
	CardSource,
	CardToggle,
	formatSpan,
	formatTime,
	freshness,
	latest,
	NoData,
	OverviewCard,
} from "../section-parts";

// The Care Plan tab (Nov 11, 2026): the Overview's Care plan card at full length. Intercept's rows (the pathway an open
// alert brought, what it runs now, the decision to keep or transfer), then the hospital's plan of care from its record
// system, a row per problem. The Overview shows the same card, capped, from here (`CarePlanCard`), so the two never
// drift apart. The data types are in `../activity.tsx`, shared with the alert modal's care plan.

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

// A plan-of-care goal's status, in the words of the nursing care plan's evaluation.
const planOfCareStatuses: Record<PatientPlanOfCareStatus, { label: string; variant: BadgeProps["variant"] }> = {
	progressing: { label: "Progressing", variant: "blue" },
	"not-progressing": { label: "Not progressing", variant: "red" },
	met: { label: "Met", variant: "green" },
};

/**
 * The Care plan's rows on the Overview, Intercept's included, before View all: its three-line rows fill about the height
 * of Up next's five two-line rows (Nov 13, 2026, user's call: Up next is the reference, no scrolling inside a card).
 */
const CARE_PLAN_ROWS = 4;

/**
 * The care plan (Intercept-Live `242:12310`, Nov 9, 2026, user's call: Figma's rows): a row each for the pathway (the
 * suggestion waiting for review, or the one sent with where co-signature is) with what it runs now under it, and the
 * decision to keep or transfer with how its checkpoints went. The orders, doses and checkpoint details are behind
 * **View full plan** on the Care Plan tab (the Overview's card has none since Nov 13, 2026), the page's Pathway panel. Under them, the hospital's plan of care from its record system (Nov 11,
 * 2026, user's call: every admitted patient has one): a row per problem with its goal, what's done toward it and how
 * it's going. A source line each, Intercept's and the record system's.
 */
function CarePlanCard({
	plan,
	planOfCare,
	suggestion,
	running,
	now,
	onOpenPathway,
	onShowAll,
	expanded = false,
	className,
}: {
	plan?: PatientCarePlan;
	planOfCare?: PatientPlanOfCare;
	suggestion?: PatientPathwaySuggestion;
	running: PatientPathwayRunning[];
	now: number | null;
	onOpenPathway?: () => void;
	/** "View all · n" opens the Care Plan tab instead of showing the rest in place. */
	onShowAll?: () => void;
	/** Every problem, no View all: the Care Plan tab. */
	expanded?: boolean;
	className?: string;
}) {
	const [showAllInPlace, setShowAll] = React.useState(false);
	const showAll = expanded || showAllInPlace;
	const pathway = plan?.pathway;
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
			// The Overview's card has no "View full plan" since Nov 13, 2026 (user's call); the Care Plan tab keeps it.
			actions={
				onOpenPathway || (!expanded && hasMore) ? (
					<>
						{!expanded && hasMore ? (
							onShowAll ? (
								<CardLink onClick={onShowAll} aria-label={`View all ${planItems.length} problems of the care plan`}>
									View all · {planItems.length}
								</CardLink>
							) : (
								<CardToggle expanded={showAll} total={planItems.length} onToggle={() => setShowAll(!showAll)} />
							)
						) : null}
						{onOpenPathway ? <CardLink onClick={onOpenPathway}>View full plan</CardLink> : null}
					</>
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
				<CardList capped={!expanded}>
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

/**
 * The Care Plan tab (Nov 11, 2026, user's call): the Overview's Care plan at full length, every problem of the plan of
 * care shown, with the same rows and the same way to the pathway.
 */
function CarePlanSection({ record, pathway }: { record?: PatientRecord; pathway?: OverviewPathway }) {
	const now = useCurrentMinute();
	const { suggestion, running } = pathway ? pathwaySummary(pathway, now) : { suggestion: undefined, running: [] };
	return (
		<CarePlanCard
			plan={record?.carePlan}
			planOfCare={record?.planOfCare}
			suggestion={suggestion}
			running={running}
			now={now}
			onOpenPathway={pathway?.onOpen}
			expanded
			className='max-w-4xl'
		/>
	);
}

export { CarePlanCard, CarePlanSection, pathwaySummary, type OverviewPathway };
