import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { CircleCheckIcon, FileTextIcon, PhoneIcon, RotateCcwIcon, SendIcon, StethoscopeIcon, UserRoundSearchIcon } from "lucide-react";

import { Button } from "@/components/buttons/button";
import { Badge, type BadgeProps } from "@/components/data-display/badge";
import { fadeVariants } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { Expand } from "../../alert-panel/care-pathway";
import { usePatientNavigation } from "../../patient-navigation";
import { SourceLabel } from "../../shared/source-label";

// Exploration (PRD Transitions of care): Scenario 6 of the Demo Use Cases, "After the ICU, a readmission caught early".
// At discharge the platform drafts a one-page handoff to the patient's primary-care clinic, in a format the clinic can
// read without a shared EHR; scores the readmission risk from the record (never from payer or rurality, which are for
// reporting only); and schedules the follow-up that risk calls for, the hub tele-RN's phone check and the clinic visit.
// When the patient comes back to one of the network's hospitals, the return is matched to this stay and shown here.
// Nothing goes out on its own: the clinician reviews the handoff and sends it (PRD PD-061, as the discharge referrals).
// It shows as the patient page's Discharge section, above the social needs and referrals when there are any.

/* -------------------------------------------------------------------------- */
/* Data shapes (the app's API fills these)                                    */
/* -------------------------------------------------------------------------- */

/** One medication on the handoff, as it changed during the stay. */
type HandoffMedication = {
	name: string;
	/** What happened to it: new, dose changed, stopped, or the same as before. */
	change: "new" | "changed" | "stopped" | "same";
	/** The dose now, e.g. "40 mg by mouth daily". For a stopped one, what it was. */
	dose: string;
	/** Why, or what it was before, e.g. "Was 20 mg daily". */
	detail?: string;
};

/** The one-page handoff to the primary-care clinic. */
type PrimaryCareHandoff = {
	/** Who receives it. */
	to: { clinic: string; clinician?: string; place?: string };
	/** How it reaches the clinic without a shared EHR, e.g. "PDF by Direct secure message, with a fax copy". */
	delivery: string;
	/** Whether that delivery is a mock in this build (the Demo Use Cases: "Funded"). Shows a Preview label. */
	deliveryPreview?: boolean;
	/** The stay it's about. ISO 8601. */
	stay: { hospital: string; unit?: string; from: string; to: string };
	/** What happened, in a few sentences. */
	summary: string[];
	medications: HandoffMedication[];
	/** The weight at discharge and what to do with daily weights at home. */
	weights: { discharge: string; instructions: string[] };
	/** The follow-up booked, one line each. */
	followUp: string[];
	/** Who to call, e.g. `{ label: "Hub tele-RN", value: "Ava Brooks, RN · (308) 555-0148" }`. */
	contacts?: { label: string; value: string }[];
	/** Who drafted and reviewed it, e.g. "Drafted by Intercept from her Chadron record". */
	author: string;
	/** Sent: when (ISO 8601) and by whom. */
	sent?: { at: string; by: string };
	/** The clinic opened it: when (ISO 8601). */
	receivedAt?: string;
};

/** The readmission risk at discharge, with the factors behind it. */
type ReadmissionRisk = {
	level: "low" | "medium" | "high";
	/** The factors found in the record, e.g. "HFrEF (EF 25%)". */
	factors: { label: string; detail?: string }[];
	/** Where it comes from, e.g. "Readmission risk score, from her record at discharge". */
	source: string;
	/** What the level sets in motion, e.g. "High risk schedules a 72-hour nurse phone check". */
	action?: string;
};

/** A follow-up the risk scheduled: a phone check, a clinic visit. */
type FollowUpTask = {
	id: string;
	kind: "call" | "visit";
	title: string;
	/** Who does it, e.g. "Ava Brooks, RN · hub tele-RN". */
	who: string;
	/** When it's due or booked, ISO 8601. */
	dueAt: string;
	status: "scheduled" | "done" | "overdue";
	/** Where it's tracked, e.g. "On the hub tele-RN's list". */
	tracked?: string;
	/** The page that tracks it, as a link after `tracked`, e.g. `{ label: "Open Inbox", page: "Inbox" }`. */
	opens?: { label: string; page: string };
	/** Done: when (ISO 8601) and what was found. */
	done?: { at: string; result: string };
};

/** The patient back at one of the network's hospitals, matched to this stay. */
type CareReturn = {
	/** When they arrived, ISO 8601. */
	at: string;
	/** Where, e.g. "Chadron Memorial ED". */
	where: string;
	/** How long after discharge, e.g. "7 days after discharge". */
	after: string;
	/** What the match used, e.g. ["Name", "Date of birth", "Address", "Medicare ID"]. */
	matchedOn: string[];
	/** What brought them back. */
	findings: string[];
	/** How it ended, once it has: `avoided` is sent home without admission. */
	outcome?: { type: "avoided" | "readmitted"; detail: string };
};

/** A patient's transition of care: the handoff, the risk, the follow-up and a return if there's one. */
type CareTransition = {
	/** Where it comes from, e.g. "Discharge workflow, from her Chadron stay". */
	source: string;
	handoff: PrimaryCareHandoff;
	risk?: ReadmissionRisk;
	followUps: FollowUpTask[];
	return?: CareReturn;
};

/** What the clinician did here: sent the handoff to the clinic. */
type TransitionDecision = { type: "send-handoff" };

/* -------------------------------------------------------------------------- */
/* Product content                                                            */
/* -------------------------------------------------------------------------- */

const riskBadges: Record<ReadmissionRisk["level"], { label: string; variant: BadgeProps["variant"] }> = {
	high: { label: "High", variant: "red" },
	medium: { label: "Medium", variant: "amber" },
	low: { label: "Low", variant: "green" },
};

const medicationChanges: Record<HandoffMedication["change"], { label: string; variant: BadgeProps["variant"] }> = {
	new: { label: "New", variant: "blue" },
	changed: { label: "Dose changed", variant: "amber" },
	stopped: { label: "Stopped", variant: "secondary" },
	same: { label: "No change", variant: "outline" },
};

const followUpStatus: Record<FollowUpTask["status"], { label: string; variant: BadgeProps["variant"] }> = {
	scheduled: { label: "Scheduled", variant: "blue" },
	done: { label: "Done", variant: "green" },
	overdue: { label: "Overdue", variant: "red" },
};

const formatDay = (iso: string) => new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
const formatDayTime = (iso: string) =>
	new Date(iso).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/** The section's state in a badge: what's next for the transition. */
function transitionBadge(transition: CareTransition) {
	if (transition.return?.outcome?.type === "avoided") return { key: "avoided", label: "Readmission avoided", variant: "green" as const };
	if (transition.return) return { key: "returned", label: "Back in the ED", variant: "red" as const };
	if (!transition.handoff.sent) return { key: "send", label: "Handoff to send", variant: "yellow" as const };
	if (transition.followUps.every((task) => task.status === "done")) return { key: "done", label: "Follow-up done", variant: "green" as const };
	return { key: "sent", label: "Handoff sent", variant: "blue" as const };
}

/* -------------------------------------------------------------------------- */
/* Parts                                                                      */
/* -------------------------------------------------------------------------- */

/** A titled group of the section, as in the discharge plan. */
function Group({ title, children }: { title: string; children: React.ReactNode }) {
	const id = React.useId();
	return (
		<section aria-labelledby={id} className='flex flex-col gap-2'>
			<h3 id={id} className='text-sm font-semibold text-foreground'>
				{title}
			</h3>
			{children}
		</section>
	);
}

/** A part of the handoff page, with its heading. */
function DocumentPart({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div className='flex flex-col gap-1.5'>
			<h4 className='text-xs font-semibold tracking-wide text-muted-foreground uppercase'>{title}</h4>
			{children}
		</div>
	);
}

/**
 * The handoff as the clinic reads it: one page, what happened, the medication changes, daily weights, the follow-up and
 * who to call. A document, so it reads as one in the page (the paper's border and padding).
 */
function HandoffDocument({ handoff, patientName }: { handoff: PrimaryCareHandoff; patientName: string }) {
	const titleId = React.useId();
	return (
		<article
			aria-labelledby={titleId}
			data-slot='handoff-document'
			className='flex flex-col gap-4 rounded-lg border border-border bg-background p-5 shadow-xs'
		>
			<header className='flex flex-col gap-1 border-b border-border pb-3'>
				<div className='flex items-center gap-2 text-xs text-muted-foreground'>
					<FileTextIcon aria-hidden='true' className='size-3.5' />
					<span>Primary-care handoff · 1 page</span>
				</div>
				<h4 id={titleId} className='text-base font-bold text-foreground'>
					{patientName}
				</h4>
				<p className='text-sm text-muted-foreground'>
					{[handoff.stay.hospital, handoff.stay.unit].filter(Boolean).join(", ")} · {formatDay(handoff.stay.from)} to{" "}
					{formatDay(handoff.stay.to)}
				</p>
			</header>
			<DocumentPart title='What happened'>
				{handoff.summary.map((line) => (
					<p key={line} className='text-sm text-foreground'>
						{line}
					</p>
				))}
			</DocumentPart>
			<DocumentPart title='Medication changes'>
				<ul className='flex flex-col divide-y divide-border'>
					{handoff.medications.map((medication) => {
						const change = medicationChanges[medication.change];
						return (
							<li key={medication.name} className='flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 py-2 first:pt-0 last:pb-0'>
								<span className='flex flex-col'>
									<span className={cn("text-sm font-semibold text-foreground", medication.change === "stopped" && "line-through")}>
										{medication.name}
									</span>
									<span className='text-sm text-foreground'>{medication.dose}</span>
									{medication.detail ? <span className='text-xs text-muted-foreground'>{medication.detail}</span> : null}
								</span>
								<Badge variant={change.variant} size='xs'>
									{change.label}
								</Badge>
							</li>
						);
					})}
				</ul>
			</DocumentPart>
			<DocumentPart title='Daily weights'>
				<p className='text-sm text-foreground'>
					<span className='text-muted-foreground'>Weight at discharge: </span>
					<span className='font-semibold'>{handoff.weights.discharge}</span>
				</p>
				<ul className='list-disc pl-5 text-sm text-foreground'>
					{handoff.weights.instructions.map((line) => (
						<li key={line}>{line}</li>
					))}
				</ul>
			</DocumentPart>
			<DocumentPart title='Follow-up'>
				<ul className='list-disc pl-5 text-sm text-foreground'>
					{handoff.followUp.map((line) => (
						<li key={line}>{line}</li>
					))}
				</ul>
			</DocumentPart>
			{handoff.contacts?.length ? (
				<DocumentPart title='Who to call'>
					<dl className='grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm'>
						{handoff.contacts.map((contact) => (
							<React.Fragment key={contact.label}>
								<dt className='text-muted-foreground'>{contact.label}</dt>
								<dd className='text-foreground'>{contact.value}</dd>
							</React.Fragment>
						))}
					</dl>
				</DocumentPart>
			) : null}
			<footer className='border-t border-border pt-3 text-xs text-muted-foreground'>{handoff.author}</footer>
		</article>
	);
}

/** The handoff: who it goes to and how, the page itself, then Send, or when it was sent and opened. */
function HandoffCard({
	handoff,
	patientName,
	onSend,
}: {
	handoff: PrimaryCareHandoff;
	patientName: string;
	onSend?: () => void;
}) {
	return (
		<div
			data-state={handoff.sent ? "sent" : "draft"}
			className={cn(
				"flex flex-col gap-4 rounded-card border bg-card p-4 transition-colors",
				handoff.sent ? "border-border" : "border-dashed border-muted-foreground",
			)}
		>
			<div className='flex flex-col gap-1'>
				<p className='text-sm text-foreground'>
					<span className='text-muted-foreground'>To </span>
					<span className='font-semibold'>{handoff.to.clinic}</span>
					{handoff.to.clinician ? <span> · {handoff.to.clinician}</span> : null}
				</p>
				<p className='flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
					<span>{handoff.delivery}</span>
					{handoff.deliveryPreview ? (
						<Badge variant='outline' size='xs'>
							Preview
						</Badge>
					) : null}
				</p>
			</div>
			<HandoffDocument handoff={handoff} patientName={patientName} />
			<AnimatePresence initial={false} mode='popLayout'>
				{handoff.sent ? (
					<Expand key='sent'>
						<div role='status' className='flex flex-col gap-1.5'>
							<p className='flex items-start gap-2 text-sm text-foreground'>
								<CircleCheckIcon aria-hidden='true' className='mt-0.5 size-4 shrink-0 text-success' />
								<span>
									Sent to {handoff.to.clinic}
									<span className='text-muted-foreground'>
										{" "}
										· {formatDayTime(handoff.sent.at)} · {handoff.sent.by}
									</span>
								</span>
							</p>
							<AnimatePresence initial={false}>
								{handoff.receivedAt ? (
									<Expand key='received'>
										<p className='flex items-start gap-2 text-sm text-foreground'>
											<CircleCheckIcon aria-hidden='true' className='mt-0.5 size-4 shrink-0 text-success' />
											<span>
												Opened by the clinic
												<span className='text-muted-foreground'> · {formatDayTime(handoff.receivedAt)}</span>
											</span>
										</p>
									</Expand>
								) : null}
							</AnimatePresence>
						</div>
					</Expand>
				) : onSend ? (
					<Expand key='send'>
						<div className='flex flex-wrap items-center justify-between gap-3'>
							<p className='text-sm text-muted-foreground'>Review it, then send it to the clinic.</p>
							<Button variant='neutral' size='sm' onClick={onSend}>
								<SendIcon />
								Send to clinic
							</Button>
						</div>
					</Expand>
				) : null}
			</AnimatePresence>
		</div>
	);
}

/** The risk level, the factors the record gave it, what it sets in motion, and what it never uses. */
function RiskCard({ risk }: { risk: ReadmissionRisk }) {
	const badge = riskBadges[risk.level];
	return (
		<div className='flex flex-col gap-3 rounded-card border border-border bg-card p-4'>
			{/* The group's heading names it; the card leads with the level. */}
			<div className='flex flex-wrap items-center gap-2'>
				<Badge variant={badge.variant} size='sm'>
					{badge.label}
				</Badge>
				<span className='text-sm text-muted-foreground'>
					{risk.factors.length} {risk.factors.length === 1 ? "factor" : "factors"} in the record
				</span>
			</div>
			<ul className='flex flex-col divide-y divide-border'>
				{risk.factors.map((factor) => (
					<li key={factor.label} className='flex flex-col gap-0.5 py-2 first:pt-0 last:pb-0'>
						<span className='text-sm font-semibold text-foreground'>{factor.label}</span>
						{factor.detail ? <span className='text-sm text-foreground'>{factor.detail}</span> : null}
					</li>
				))}
			</ul>
			{risk.action ? <p className='text-sm text-foreground'>{risk.action}</p> : null}
			<div className='flex flex-col gap-1 border-t border-border pt-3 text-xs text-muted-foreground'>
				<SourceLabel>{risk.source}</SourceLabel>
				{/* Demo rules: payer and rurality feed reporting only, never a score (PRD Transitions of care TOC-021). */}
				<span>Payer and county rurality aren't inputs: they're used for reporting only.</span>
			</div>
		</div>
	);
}

/** One follow-up: what, who, when, and once done, what was found. */
function FollowUpRow({ task }: { task: FollowUpTask }) {
	const navigation = usePatientNavigation();
	const status = followUpStatus[task.status];
	const openPage = task.opens && navigation?.openPage;
	const Icon = task.kind === "call" ? PhoneIcon : StethoscopeIcon;
	return (
		<li data-status={task.status} className='flex gap-3 py-3 first:pt-0 last:pb-0'>
			<Icon aria-hidden='true' className='mt-0.5 size-4 shrink-0 text-icon-subtle' />
			<div className='flex min-w-0 flex-1 flex-col gap-0.5'>
				<div className='flex flex-wrap items-center gap-2'>
					<span className='text-sm font-semibold text-foreground'>{task.title}</span>
					<AnimatePresence mode='wait' initial={false}>
						<motion.span key={task.status} variants={fadeVariants} initial='initial' animate='animate' exit='exit'>
							<Badge variant={status.variant} size='xs'>
								{status.label}
							</Badge>
						</motion.span>
					</AnimatePresence>
				</div>
				<span className='text-sm text-foreground'>{task.who}</span>
				<span className='flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground'>
					<span>
						{task.status === "done" && task.done ? `Done ${formatDayTime(task.done.at)}` : `Due ${formatDayTime(task.dueAt)}`}
						{task.tracked && task.status !== "done" ? ` · ${task.tracked}` : null}
					</span>
					{task.opens && openPage && task.status !== "done" ? (
						<Button variant='link' size='xs' className='h-auto px-0' onClick={() => openPage(task.opens!.page)}>
							{task.opens.label}
						</Button>
					) : null}
				</span>
				<AnimatePresence initial={false}>
					{task.done ? (
						<Expand key='result'>
							<p className='pt-1 text-sm text-foreground'>{task.done.result}</p>
						</Expand>
					) : null}
				</AnimatePresence>
			</div>
		</li>
	);
}

/** The patient back at a network hospital: where and when, what matched them to this stay, why, and how it ended. */
function ReturnCard({ visit }: { visit: CareReturn }) {
	return (
		<div
			className={cn(
				"flex flex-col gap-3 rounded-card border p-4",
				visit.outcome?.type === "avoided" ? "border-border bg-card" : "border-severity-high bg-severity-high/5",
			)}
		>
			<div className='flex items-start gap-3'>
				<UserRoundSearchIcon aria-hidden='true' className='mt-0.5 size-4 shrink-0 text-icon-subtle' />
				<div className='flex flex-col gap-0.5'>
					<span className='text-sm font-bold text-foreground'>
						{visit.where}, {visit.after}
					</span>
					<span className='text-xs text-muted-foreground'>
						Arrived {formatDayTime(visit.at)} · Matched to this stay on {visit.matchedOn.join(", ")}
					</span>
				</div>
			</div>
			<ul className='list-disc pl-12 text-sm text-foreground'>
				{visit.findings.map((finding) => (
					<li key={finding}>{finding}</li>
				))}
			</ul>
			<AnimatePresence initial={false}>
				{visit.outcome ? (
					<Expand key='outcome'>
						<p role='status' className='flex items-start gap-2 border-t border-border pt-3 text-sm text-foreground'>
							{visit.outcome.type === "avoided" ? (
								<CircleCheckIcon aria-hidden='true' className='mt-0.5 size-4 shrink-0 text-success' />
							) : (
								<RotateCcwIcon aria-hidden='true' className='mt-0.5 size-4 shrink-0 text-icon-subtle' />
							)}
							<span>
								<span className='font-semibold'>{visit.outcome.type === "avoided" ? "Readmission avoided" : "Readmitted"}</span>
								<span className='block'>{visit.outcome.detail}</span>
							</span>
						</p>
					</Expand>
				) : null}
			</AnimatePresence>
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/* TransitionSection                                                          */
/* -------------------------------------------------------------------------- */

/**
 * The patient's transition of care (Scenario 6): a return to the network, if there's one, first; then the one-page
 * primary-care handoff, which the clinician sends (`onDecision`); the readmission risk with its factors; and the
 * follow-up it scheduled, each marked done as it's done. `headingLevel` is `h2` as a section of the patient's page.
 */
function TransitionSection({
	transition,
	patientName,
	onDecision,
	headingLevel = "h2",
	className,
}: {
	transition: CareTransition;
	/** As the handoff names them: "Margaret Hayes, 72, F". */
	patientName: string;
	onDecision?: (decision: TransitionDecision) => void;
	headingLevel?: "h2" | "h3";
	className?: string;
}) {
	// Sent here at once, so the button doesn't wait on the app; the record wins when it says so.
	const [sentHere, setSentHere] = React.useState<{ at: string; by: string } | undefined>();
	const handoff = transition.handoff.sent || !sentHere ? transition.handoff : { ...transition.handoff, sent: sentHere };
	const shown = { ...transition, handoff };
	const badge = transitionBadge(shown);
	const Heading = headingLevel;

	return (
		<section aria-label='Transition of care' className={cn("flex flex-col gap-5", className)}>
			<div className='flex flex-col gap-1'>
				<div className='flex flex-wrap items-center gap-2'>
					<Heading className='text-base font-bold text-foreground'>Transition of care</Heading>
					<AnimatePresence mode='wait' initial={false}>
						<motion.span key={badge.key} variants={fadeVariants} initial='initial' animate='animate' exit='exit'>
							<Badge variant={badge.variant} size='xs'>
								{badge.label}
							</Badge>
						</motion.span>
					</AnimatePresence>
				</div>
				<SourceLabel className='text-xs text-muted-foreground'>Source: {transition.source}</SourceLabel>
			</div>

			<AnimatePresence initial={false}>
				{transition.return ? (
					<Expand key='return'>
						<Group title='Back in the network'>
							<ReturnCard visit={transition.return} />
						</Group>
					</Expand>
				) : null}
			</AnimatePresence>

			<Group title='Primary-care handoff'>
				<HandoffCard
					handoff={handoff}
					patientName={patientName}
					onSend={
						onDecision
							? () => {
									setSentHere({ at: new Date().toISOString(), by: "You" });
									onDecision({ type: "send-handoff" });
								}
							: undefined
					}
				/>
			</Group>

			{transition.risk ? (
				<Group title='Readmission risk'>
					<RiskCard risk={transition.risk} />
				</Group>
			) : null}

			{transition.followUps.length ? (
				<Group title='Follow-up'>
					<div className='rounded-card border border-border bg-card p-4'>
						<ul className='flex flex-col divide-y divide-border'>
							{transition.followUps.map((task) => (
								<FollowUpRow key={task.id} task={task} />
							))}
						</ul>
					</div>
				</Group>
			) : null}
		</section>
	);
}

export {
	TransitionSection,
	type CareReturn,
	type CareTransition,
	type FollowUpTask,
	type HandoffMedication,
	type PrimaryCareHandoff,
	type ReadmissionRisk,
	type TransitionDecision,
};
