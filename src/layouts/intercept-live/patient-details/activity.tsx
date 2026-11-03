import * as React from "react";
import { CircleCheckIcon, ClockIcon, TriangleAlertIcon } from "lucide-react";

import { Button } from "@/components/buttons/button";
import { Badge, type BadgeProps } from "@/components/data-display/badge";
import { cn } from "@/lib/utils";

import { formatTime, NoData, SectionCard } from "./section-parts";
import type { PatientTimeline, TimelineEventKind } from "./sections/timeline-section";

// What was done and decided about the patient, so the page tracks it (Nov 3, 2026, user's call): the care plan in force,
// on the Overview (the pathway sent, and keep or transfer with its checkpoints: DU-22, DU-23), and the activity log, its
// latest entries on the Overview and all of it on the Timeline's events lane, so each decision lines up with the vitals.
// The app records the log as things happen, with who and when (PRD PD-133).

/* -------------------------------------------------------------------------- */
/* Data shapes (the app's API fills these)                                    */
/* -------------------------------------------------------------------------- */

type PatientActivityKind = "alert" | "consult" | "order" | "decision" | "note" | "outcome";

/** One thing done or decided about the patient. */
type PatientActivity = {
	id: string;
	at: string;
	kind: PatientActivityKind;
	/** What happened, e.g. "CHF exacerbation pathway sent for co-signature". */
	title: string;
	/** The particulars, e.g. the edited dose, or the reason for a decision. */
	detail?: string;
	/** Who: "You", "Dr. Tom Weller", "Kayla Brandt, RN", or what ("Deterioration score"). */
	by?: string;
};

/** One order of the pathway in force, with its dose as sent. */
type PatientCarePlanOrder = {
	name: string;
	dose: string;
	/** The suggested dose, when the clinician changed it before sending. */
	suggested?: string;
};

/** A check after a decision to keep: when it's due, what has to hold, and how it went. */
type PatientCarePlanCheckpoint = {
	id: string;
	/** "1 h", "4 h". */
	label: string;
	due: string;
	criteria: string;
	result?: { status: "passed" | "missed"; detail?: string };
};

/** The care plan in force: the pathway sent from an alert, and the decision to keep or transfer the patient. */
type PatientCarePlan = {
	pathway?: {
		title: string;
		/** Sent and waiting for the local co-signature, active once co-signed, or declined. */
		status: "pending" | "active" | "declined";
		orders: PatientCarePlanOrder[];
		/** When it was sent, or declined. */
		at: string;
		by?: string;
		/** Who co-signs it, e.g. "Dr. Tom Weller". */
		cosigner?: string;
		cosignedAt?: string;
		/** Why it was declined. */
		rationale?: string;
	};
	transfer?: {
		/** "Keeping at Chadron", "Transfer to Regional West Medical Center". */
		label: string;
		rationale: string;
		at: string;
		by?: string;
		/** A decision to keep only. */
		checkpoints: PatientCarePlanCheckpoint[];
		/** What keeping the patient saved, once every checkpoint passed: "Transfer avoided". */
		outcome?: { label: string; items: { label: string; value: string }[] };
	};
};

/* -------------------------------------------------------------------------- */
/* Product content                                                            */
/* -------------------------------------------------------------------------- */

type PathwayStatus = NonNullable<PatientCarePlan["pathway"]>["status"];

// The alert panel's words and colors for the same states.
const pathwayStatuses: Record<PathwayStatus, { label: string; variant: BadgeProps["variant"] }> = {
	pending: { label: "Awaiting co-signature", variant: "amber" },
	active: { label: "Active", variant: "green" },
	declined: { label: "Declined", variant: "secondary" },
};

// Where each kind sits on the Timeline's events lane: alerts as alerts, notes as notes, the rest as care events.
const timelineKinds: Record<PatientActivityKind, TimelineEventKind> = {
	alert: "alert",
	consult: "care",
	order: "care",
	decision: "care",
	note: "note",
	outcome: "care",
};

/** How many entries the Overview shows, newest first; the Timeline has all of them. */
const OVERVIEW_ENTRIES = 5;

const byTime = (a: { at: string }, b: { at: string }) => Date.parse(a.at) - Date.parse(b.at);

/* -------------------------------------------------------------------------- */
/* Parts                                                                      */
/* -------------------------------------------------------------------------- */

/** The pathway's state in words: who it waits on, who co-signed it, or why it was declined. */
function pathwayLine(pathway: NonNullable<PatientCarePlan["pathway"]>) {
	const by = pathway.by ? ` by ${pathway.by}` : "";
	switch (pathway.status) {
		case "declined":
			return `Declined${by} · ${formatTime(pathway.at)}${pathway.rationale ? `: “${pathway.rationale}”` : ""}`;
		case "active":
			return pathway.cosigner && pathway.cosignedAt
				? `Co-signed by ${pathway.cosigner} · ${formatTime(pathway.cosignedAt)}. Orders active.`
				: `Active · ${formatTime(pathway.at)}`;
		default:
			return `Sent${by} to ${pathway.cosigner ?? "the local physician"} for co-signature · ${formatTime(pathway.at)}`;
	}
}

/**
 * The care plan in force (Overview): the pathway sent from an alert, its orders as sent (an edited dose marked, the
 * suggestion struck through, as in the alert) and where co-signature is; then keep or transfer, its reason, the
 * checkpoints and how they went, and "Transfer avoided" once they've passed.
 */
function CarePlanCard({ plan }: { plan: PatientCarePlan }) {
	const { pathway, transfer } = plan;
	return (
		<SectionCard title='Care plan'>
			{pathway ? (
				<section aria-label={pathway.title} className='flex flex-col gap-2'>
					<div className='flex flex-wrap items-center gap-2'>
						<h3 className='text-sm font-semibold text-foreground'>{pathway.title}</h3>
						<Badge variant={pathwayStatuses[pathway.status].variant} size='xs'>
							{pathwayStatuses[pathway.status].label}
						</Badge>
					</div>
					{pathway.status === "declined" ? null : (
						<ul aria-label='Orders' className='flex flex-col gap-2 text-sm'>
							{pathway.orders.map((order) => (
								<li key={order.name} className='flex flex-col'>
									<span className='flex flex-wrap items-center gap-1.5 font-medium text-foreground'>
										{order.name}
										{order.suggested ? (
											<Badge variant='blue' size='xs'>
												Edited
											</Badge>
										) : null}
									</span>
									<span className='text-foreground'>{order.dose}</span>
									{order.suggested ? (
										<span className='text-xs text-muted-foreground'>
											Suggested: <s>{order.suggested}</s>
										</span>
									) : null}
								</li>
							))}
						</ul>
					)}
					<p className='text-xs text-muted-foreground'>{pathwayLine(pathway)}</p>
				</section>
			) : null}

			{pathway && transfer ? <hr className='border-border-muted' /> : null}

			{transfer ? (
				<section aria-label='Keep or transfer' className='flex flex-col gap-2'>
					<div className='flex flex-col'>
						<h3 className='text-sm font-semibold text-foreground'>{transfer.label}</h3>
						<p className='text-xs text-muted-foreground'>
							{transfer.by ? `${transfer.by} · ` : null}
							{formatTime(transfer.at)}
						</p>
					</div>
					<p className='text-sm text-foreground'>
						<span className='text-muted-foreground'>Why: </span>
						{transfer.rationale}
					</p>
					{transfer.checkpoints.length ? (
						<ol aria-label='Checkpoints' className='flex flex-col gap-2'>
							{transfer.checkpoints.map((checkpoint) => {
								const status = checkpoint.result?.status;
								const Icon = status === "passed" ? CircleCheckIcon : status === "missed" ? TriangleAlertIcon : ClockIcon;
								return (
									<li key={checkpoint.id} className='flex items-start gap-2'>
										<Icon
											aria-hidden='true'
											className={cn(
												"mt-0.5 size-4 shrink-0",
												status === "passed" ? "text-success" : status === "missed" ? "text-destructive" : "text-icon-muted",
											)}
										/>
										<div className='flex min-w-0 flex-col text-sm'>
											<span className='font-medium text-foreground'>
												{checkpoint.label} · {formatTime(checkpoint.due)}
												{status ? (
													<span className={status === "passed" ? "text-success" : "text-destructive"}>
														{" "}
														· {status === "passed" ? "Passed" : "Missed"}
													</span>
												) : null}
											</span>
											<span className='text-muted-foreground'>{checkpoint.criteria}</span>
											{checkpoint.result?.detail ? <span className='text-foreground'>{checkpoint.result.detail}</span> : null}
										</div>
									</li>
								);
							})}
						</ol>
					) : null}
					{transfer.outcome ? (
						<div className='flex flex-col gap-1 rounded-xl bg-badge-green p-3 text-sm text-foreground'>
							<span className='flex items-center gap-2 font-semibold'>
								<CircleCheckIcon aria-hidden='true' className='size-4 shrink-0 text-success' />
								{transfer.outcome.label}
							</span>
							{transfer.outcome.items.map((item) => (
								<span key={item.label}>
									<span className='text-muted-foreground'>{item.label}: </span>
									{item.value}
								</span>
							))}
						</div>
					) : null}
				</section>
			) : null}
		</SectionCard>
	);
}

/**
 * The latest activity (Overview): the newest entries first, each with its time, what happened, the particulars and
 * who. "View on Timeline" opens all of it on the Timeline, beside the vitals.
 */
function ActivityCard({ activity, onShowAll }: { activity: PatientActivity[]; onShowAll?: () => void }) {
	const latest = [...activity].sort(byTime).reverse().slice(0, OVERVIEW_ENTRIES);
	return (
		<SectionCard
			title='Activity'
			meta={activity.length > OVERVIEW_ENTRIES ? `Latest ${OVERVIEW_ENTRIES} of ${activity.length}` : undefined}
			action={
				onShowAll && activity.length ? (
					<Button variant='link' size='xs' onClick={onShowAll} className='h-auto p-0'>
						View on Timeline
					</Button>
				) : undefined
			}
		>
			{latest.length ? (
				<ol aria-label='Latest activity' className='flex flex-col gap-3'>
					{latest.map((entry) => (
						<li key={entry.id} className='grid grid-cols-[4rem_minmax(0,1fr)] gap-x-2 text-sm'>
							<time dateTime={entry.at} className='pt-px text-xs text-muted-foreground tabular-nums'>
								{formatTime(entry.at)}
							</time>
							<div className='flex min-w-0 flex-col'>
								<span className='font-medium text-foreground'>{entry.title}</span>
								{entry.detail ? <span className='text-muted-foreground'>{entry.detail}</span> : null}
								{entry.by ? <span className='text-xs text-muted-foreground'>{entry.by}</span> : null}
							</div>
						</li>
					))}
				</ol>
			) : (
				<NoData>Nothing done or decided yet.</NoData>
			)}
		</SectionCard>
	);
}

/** The Timeline with the activity on its events lane, in time order, each entry named with who did it. */
function withActivityEvents(timeline: PatientTimeline, activity?: PatientActivity[]): PatientTimeline {
	if (!activity?.length) return timeline;
	return {
		...timeline,
		events: [
			...timeline.events,
			...activity.map((entry) => ({
				id: `activity-${entry.id}`,
				at: entry.at,
				kind: timelineKinds[entry.kind],
				label: entry.by ? `${entry.title} · ${entry.by}` : entry.title,
			})),
		].sort(byTime),
	};
}

export {
	ActivityCard,
	CarePlanCard,
	withActivityEvents,
	type PatientActivity,
	type PatientActivityKind,
	type PatientCarePlan,
	type PatientCarePlanCheckpoint,
	type PatientCarePlanOrder,
};
