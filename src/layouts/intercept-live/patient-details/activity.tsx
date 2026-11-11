import * as React from "react";
import { CircleCheckIcon, ClockIcon, GitForkIcon, TriangleAlertIcon } from "lucide-react";

import { Button } from "@/components/buttons/button";
import { Badge, type BadgeProps } from "@/components/data-display/badge";
import { cn } from "@/lib/utils";

import { formatTime, SectionCard } from "./section-parts";
import type { PatientTimeline, TimelineEventKind } from "./sections/timeline-section";

// What was done and decided about the patient, so the page tracks it (Nov 3, 2026, user's call): the care plan in force,
// on the Overview (the pathway sent, and keep or transfer with its checkpoints: DU-22, DU-23), and the activity log, in
// the Overview's log (`patient-overview.tsx`) and on the Timeline's events lane, so each decision lines up with the vitals.
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

/** How a plan-of-care goal is going, as the bedside team last evaluated it. */
type PatientPlanOfCareStatus = "progressing" | "not-progressing" | "met";

/** One problem of the plan of care, with its goal and what the team does toward it. */
type PatientPlanOfCareItem = {
	/** The problem, e.g. "Hypertensive emergency with PRES". */
	problem: string;
	/** The goal, measurable where it can be: "SBP 140–160 mmHg". */
	goal: string;
	/** What the team does toward it: "Nicardipine titration · neuro checks every hour". */
	interventions?: string;
	status: PatientPlanOfCareStatus;
};

/**
 * The hospital's plan of care, from its record system: every admitted patient has one (CMS and Joint Commission), kept
 * by the bedside team and reviewed on rounds. Intercept's own decisions (`PatientCarePlan`) add to it.
 */
type PatientPlanOfCare = {
	items: PatientPlanOfCareItem[];
	/** The record system it comes from: "Meditech", "Cerner". */
	source: string;
	/** When it was last reviewed. */
	reviewedAt: string;
};

/**
 * A pathway an open alert suggests that nobody has decided on yet: the Care plan shows it dashed, as the alert does, so
 * the clinician who opens the patient first sees what's waiting for them (Nov 6, 2026).
 */
type PatientPathwaySuggestion = {
	title: string;
	/** Where it comes from, e.g. "Reference protocol, CHF exacerbation (configurable per hospital)". */
	source: string;
	/** How many orders it holds. */
	orders: number;
};

/** Something the pathway runs now, in a line: "Hour-1 sepsis bundle", "3 of 5 done · 42 min left". */
type PatientPathwayRunning = {
	label: string;
	detail?: string;
	/** Overdue, or past its deadline: the line turns red. */
	overdue?: boolean;
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
 * The care plan (Overview): the pathway sent from an alert, its orders as sent (an edited dose marked, the suggestion
 * struck through, as in the alert) and where co-signature is; then keep or transfer, its reason, the checkpoints and how
 * they went, and "Transfer avoided" once they've passed. Before anything is decided, the pathway an open alert suggests,
 * dashed, as in the alert. What the pathway runs now (a sepsis bundle, a DKA protocol, the bedside tasks) follows in a
 * line each. `onOpenPathway` adds the way to the pathway itself, in the heading row: Review pathway while it's a
 * suggestion, Open pathway after (Nov 6, 2026: the page's Pathway panel, where the clinician acts on it).
 */
function CarePlanCard({
	plan = {},
	suggestion,
	running = [],
	onOpenPathway,
	headingLevel = "h2",
	className,
}: {
	plan?: PatientCarePlan;
	suggestion?: PatientPathwaySuggestion;
	running?: PatientPathwayRunning[];
	onOpenPathway?: () => void;
	/** The card's heading; its parts' headings are one level below. */
	headingLevel?: "h2" | "h3";
	className?: string;
}) {
	const { pathway, transfer } = plan;
	const Part = headingLevel === "h2" ? "h3" : "h4";
	const suggested = !pathway && suggestion;
	return (
		<SectionCard
			title='Care plan'
			headingLevel={headingLevel}
			className={className}
			action={
				onOpenPathway ? (
					<Button variant='outline' size='sm' onClick={onOpenPathway}>
						<GitForkIcon aria-hidden='true' />
						{suggested ? "Review pathway" : "Open pathway"}
					</Button>
				) : undefined
			}
		>
			{suggested ? (
				// Dashed while it's a suggestion, as the alert's order set.
				<section
					aria-label={suggestion.title}
					className='flex flex-col gap-1 rounded-xl border border-dashed border-muted-foreground p-3'
				>
					<div className='flex flex-wrap items-center gap-2'>
						<Part className='text-sm font-semibold text-foreground'>{suggestion.title}</Part>
						<Badge variant='secondary' size='xs'>
							Suggested
						</Badge>
					</div>
					<p className='text-sm text-foreground'>
						{suggestion.orders === 1 ? "1 order" : `${suggestion.orders} orders`} waiting for your review
					</p>
					<p className='text-xs text-muted-foreground'>Source: {suggestion.source}</p>
				</section>
			) : null}
			{pathway ? (
				<section aria-label={pathway.title} className='flex flex-col gap-2'>
					<div className='flex flex-wrap items-center gap-2'>
						<Part className='text-sm font-semibold text-foreground'>{pathway.title}</Part>
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

			{running.length ? (
				<ul aria-label='Running now' className='flex flex-col gap-1'>
					{running.map((item) => (
						<li
							key={item.label}
							className='flex flex-col rounded-lg bg-background-subtle px-3 py-2 text-sm'
						>
							<span className='font-medium text-foreground'>{item.label}</span>
							{item.detail ? (
								<span className={cn("text-xs", item.overdue ? "text-destructive" : "text-muted-foreground")}>
									{item.detail}
								</span>
							) : null}
						</li>
					))}
				</ul>
			) : null}

			{(pathway || suggested || running.length > 0) && transfer ? <hr className='border-border-muted' /> : null}

			{transfer ? (
				<section aria-label='Keep or transfer' className='flex flex-col gap-2'>
					<div className='flex flex-col'>
						<Part className='text-sm font-semibold text-foreground'>{transfer.label}</Part>
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
	CarePlanCard,
	pathwayLine,
	pathwayStatuses,
	timelineKinds as activityTimelineKinds,
	withActivityEvents,
	type PatientActivity,
	type PatientActivityKind,
	type PatientCarePlan,
	type PatientCarePlanCheckpoint,
	type PatientCarePlanOrder,
	type PatientPathwayRunning,
	type PatientPathwaySuggestion,
	type PatientPlanOfCare,
	type PatientPlanOfCareItem,
	type PatientPlanOfCareStatus,
};
