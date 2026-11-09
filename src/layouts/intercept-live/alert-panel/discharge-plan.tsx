import * as React from "react";
import { CircleCheckIcon, RotateCcwIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@/components/buttons/button";
import { Badge } from "@/components/data-display/badge";
import { Input } from "@/components/forms/input";
import { Label } from "@/components/forms/label";
import { RadioGroup, RadioGroupItem } from "@/components/forms/radio-group";
import { Textarea } from "@/components/forms/textarea";
import { fadeVariants } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { SourceLabel } from "../shared/source-label";
import { Expand } from "./care-pathway";

// Exploration (DESIGN.md "Alert panel" › "Social needs at discharge"): Scenario 2, step 6. The discharge workflow reads
// the chart's social history, flags the needs it finds ("Uninsured", "Can't afford home oxygen") and drafts a referral
// for each. As with the care pathway, nothing goes out on its own (PRD PD-061): the clinician sends each referral, or
// skips it with a reason. A referral records who agreed to it: the patient, a family member, or consent already on
// file (Nov 4, 2026, user's call). The same panel shows in the alert's Pathway panel, after keep or transfer, and as the
// Discharge section of the patient's page.

/* -------------------------------------------------------------------------- */
/* Data shapes (the app's API fills these)                                    */
/* -------------------------------------------------------------------------- */

/** A need the discharge workflow found in the chart, e.g. "Uninsured". */
type SocialNeed = {
	id: string;
	/** The flag, as on the patient's card: "Uninsured", "Can't afford home oxygen". */
	label: string;
	/** What's behind it, e.g. "Since a seasonal job ended in 2025". */
	detail?: string;
	/** The chart's words it comes from, e.g. "Social history, Oct 2026". */
	evidence?: string;
};

/** A referral the workflow drafted for one or more needs. */
type DischargeReferral = {
	id: string;
	/** What's referred, e.g. "Medicaid eligibility screening". */
	title: string;
	/** Who receives it, e.g. "Alliance financial counseling". */
	to: string;
	/** What it does for the patient, e.g. "If eligible, Medicaid covers his home oxygen". */
	detail?: string;
	/** The needs it answers, by id. */
	needIds: string[];
	/** Why else it's suggested, when it isn't a flagged need, e.g. "Severe COPD, 60 mi from Scottsbluff". */
	reason?: string;
};

/** Who agreed to a referral. `who` names the family member, e.g. "Amy Reynolds, daughter". */
type ReferralConsent = { by: "patient" | "family" | "on-file"; who?: string };

/** What was done with a referral, and when (ISO 8601). */
type ReferralOutcome =
	| { type: "sent"; consent: ReferralConsent; at: string }
	| { type: "skipped"; rationale: string; at: string };

/** The discharge workflow's social needs and referrals for one patient. */
type DischargePlan = {
	/** Where the flags come from, e.g. "Discharge workflow, from his chart's social history". */
	source: string;
	needs: SocialNeed[];
	referrals: DischargeReferral[];
	/** The payer on record, e.g. "Uninsured". */
	payer?: string;
	/** What was done with each referral so far, by referral id. Without one, it's to send. */
	decided?: Record<string, ReferralOutcome>;
};

/** What the clinician did with a referral: sent it, skipped it with a reason, or took the skip back. */
type DischargeDecision =
	| { type: "send"; referralId: string; consent: ReferralConsent }
	| { type: "skip"; referralId: string; rationale: string }
	| { type: "undo"; referralId: string };

/* -------------------------------------------------------------------------- */
/* Product content                                                            */
/* -------------------------------------------------------------------------- */

const consentOptions: { value: ReferralConsent["by"]; label: string }[] = [
	{ value: "patient", label: "The patient" },
	{ value: "family", label: "Family" },
	{ value: "on-file", label: "On file" },
];

/** "the patient", "family (Amy Reynolds, daughter)", "on file": after "Consent:". */
function consentText(consent: ReferralConsent) {
	if (consent.by === "patient") return "the patient";
	if (consent.by === "on-file") return "on file";
	return consent.who ? `family (${consent.who})` : "family";
}

const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

/** The panel's state in a badge: how many referrals are left to send. */
function planBadge(referrals: DischargeReferral[], outcomes: Record<string, ReferralOutcome>) {
	const open = referrals.filter((referral) => !outcomes[referral.id]).length;
	if (open === 0) return { key: "done", label: "Done", variant: "green" as const };
	return { key: `open-${open}`, label: `${open} to send`, variant: "yellow" as const };
}

/* -------------------------------------------------------------------------- */
/* Parts                                                                      */
/* -------------------------------------------------------------------------- */

/** A titled group of the panel, as in keep or transfer. */
function Group({ title, children }: { title: string; children: React.ReactNode }) {
	const id = React.useId();
	return (
		<section aria-labelledby={id} className='flex flex-col gap-2'>
			<h4 id={id} className='text-sm font-semibold text-foreground'>
				{title}
			</h4>
			{children}
		</section>
	);
}

/**
 * One referral: what, to whom and why, then who agreed and Send, or Skip with a reason. Dashed while it's a draft,
 * solid once sent, as the care pathway's orders.
 */
function ReferralCard({
	referral,
	needs,
	outcome,
	onDecision,
}: {
	referral: DischargeReferral;
	needs: SocialNeed[];
	outcome?: ReferralOutcome;
	onDecision: (decision: DischargeDecision) => void;
}) {
	const [consentBy, setConsentBy] = React.useState<ReferralConsent["by"] | "">("");
	const [who, setWho] = React.useState("");
	const [skipping, setSkipping] = React.useState(false);
	const [rationale, setRationale] = React.useState("");
	const ids = { title: React.useId(), consent: React.useId(), who: React.useId(), rationale: React.useId() };
	const because = [
		...needs.filter((need) => referral.needIds.includes(need.id)).map((need) => need.label),
		...(referral.reason ? [referral.reason] : []),
	];

	const send = () => {
		if (!consentBy) return;
		onDecision({
			type: "send",
			referralId: referral.id,
			consent: consentBy === "family" && who.trim() ? { by: consentBy, who: who.trim() } : { by: consentBy },
		});
	};
	const skip = () => {
		const reason = rationale.trim();
		if (!reason) return;
		setSkipping(false);
		onDecision({ type: "skip", referralId: referral.id, rationale: reason });
	};

	return (
		<li
			aria-labelledby={ids.title}
			data-outcome={outcome?.type ?? "open"}
			className={cn(
				"flex flex-col gap-3 rounded-card border bg-background p-4 transition-colors",
				outcome ? "border-border" : "border-dashed border-muted-foreground",
			)}
		>
			<div className='flex flex-col gap-1'>
				<div className='flex flex-wrap items-center gap-2'>
					<span id={ids.title} className={cn("text-sm font-bold text-foreground", outcome?.type === "skipped" && "opacity-60")}>
						{referral.title}
					</span>
					<AnimatePresence mode='wait' initial={false}>
						{outcome ? (
							<motion.span key={outcome.type} variants={fadeVariants} initial='initial' animate='animate' exit='exit'>
								<Badge variant={outcome.type === "sent" ? "green" : "secondary"} size='xs'>
									{outcome.type === "sent" ? "Sent" : "Skipped"}
								</Badge>
							</motion.span>
						) : null}
					</AnimatePresence>
				</div>
				<p className='text-sm text-foreground'>To {referral.to}</p>
				{referral.detail ? <p className='text-sm text-foreground'>{referral.detail}</p> : null}
				{because.length ? <p className='text-xs text-muted-foreground'>For {because.join(" · ")}</p> : null}
			</div>

			<AnimatePresence initial={false} mode='popLayout'>
				{!outcome && !skipping ? (
					<Expand key='send'>
						<form
							className='flex flex-col gap-3'
							onSubmit={(event) => {
								event.preventDefault();
								send();
							}}
						>
							<div className='flex flex-col gap-2'>
								<span id={ids.consent} className='text-sm font-medium text-foreground'>
									Who agreed?
								</span>
								<RadioGroup
									value={consentBy}
									onValueChange={(value) => setConsentBy(value as ReferralConsent["by"])}
									aria-labelledby={ids.consent}
									className='flex flex-wrap gap-x-4 gap-y-2'
								>
									{consentOptions.map((option) => {
										const id = `${ids.consent}-${option.value}`;
										return (
											<div key={option.value} className='flex items-center gap-2'>
												<RadioGroupItem id={id} value={option.value} />
												<Label htmlFor={id} className='font-normal'>
													{option.label}
												</Label>
											</div>
										);
									})}
								</RadioGroup>
								<AnimatePresence initial={false}>
									{consentBy === "family" ? (
										<Expand key='who'>
											<div className='flex flex-col gap-1.5 pt-1'>
												<Label htmlFor={ids.who}>Who in the family (optional)</Label>
												<Input
													id={ids.who}
													value={who}
													onChange={(event) => setWho(event.target.value)}
													placeholder='E.g. his daughter, Amy Reynolds'
												/>
											</div>
										</Expand>
									) : null}
								</AnimatePresence>
							</div>
							<div className='flex gap-2'>
								<Button type='button' variant='outline' size='sm' onClick={() => setSkipping(true)} className='flex-1'>
									Skip
								</Button>
								<Button type='submit' variant='neutral' size='sm' disabled={!consentBy} className='flex-1'>
									Send referral
								</Button>
							</div>
						</form>
					</Expand>
				) : null}
				{!outcome && skipping ? (
					<Expand key='skip'>
						<form
							className='flex flex-col gap-2'
							onSubmit={(event) => {
								event.preventDefault();
								skip();
							}}
						>
							<Label htmlFor={ids.rationale}>Why skip?</Label>
							<Textarea
								id={ids.rationale}
								value={rationale}
								onChange={(event) => setRationale(event.target.value)}
								placeholder='E.g. he declined, or it was already done'
								autoFocus
							/>
							<div className='flex justify-end gap-2'>
								<Button type='button' variant='ghost' size='sm' onClick={() => setSkipping(false)}>
									Cancel
								</Button>
								<Button type='submit' variant='neutral' size='sm' disabled={!rationale.trim()}>
									Skip referral
								</Button>
							</div>
						</form>
					</Expand>
				) : null}
				{outcome?.type === "sent" ? (
					<Expand key='sent'>
						<p role='status' className='flex items-start gap-2 text-sm text-foreground'>
							<CircleCheckIcon aria-hidden='true' className='mt-0.5 size-4 shrink-0 text-success' />
							<span>
								Sent to {referral.to}
								<span className='text-muted-foreground'> · {formatTime(outcome.at)}</span>
								<span className='block text-muted-foreground'>Consent: {consentText(outcome.consent)}</span>
							</span>
						</p>
					</Expand>
				) : null}
				{outcome?.type === "skipped" ? (
					<Expand key='skipped'>
						<div className='flex flex-col gap-2'>
							<p className='text-sm text-foreground'>
								<span className='font-medium'>Skipped: </span>
								{outcome.rationale}
							</p>
							<div>
								<Button
									variant='ghost'
									size='sm'
									onClick={() => onDecision({ type: "undo", referralId: referral.id })}
								>
									<RotateCcwIcon />
									Undo skip
								</Button>
							</div>
						</div>
					</Expand>
				) : null}
			</AnimatePresence>
		</li>
	);
}

/* -------------------------------------------------------------------------- */
/* DischargePlanPanel                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Social needs at discharge (Scenario 2, step 6): the needs the discharge workflow flagged from the chart, the payer on
 * record, and a referral for each need, which the clinician sends (with who agreed to it) or skips with a reason. Each
 * decision goes to `onDecision`; `plan.decided` gives back what was decided before, so the panel reopens as it was left.
 * `headingLevel` is `h3` in the alert's Pathway panel, `h2` as a section of the patient's page.
 */
function DischargePlanPanel({
	plan,
	onDecision,
	headingLevel = "h3",
	className,
}: {
	plan: DischargePlan;
	onDecision?: (decision: DischargeDecision) => void;
	headingLevel?: "h2" | "h3";
	className?: string;
}) {
	const [outcomes, setOutcomes] = React.useState<Record<string, ReferralOutcome>>(plan.decided ?? {});
	// The app's record wins when it changes (a decision made on the patient's page, then the alert opened, or back).
	React.useEffect(() => {
		if (plan.decided) setOutcomes(plan.decided);
	}, [plan.decided]);

	const decide = (decision: DischargeDecision) => {
		const at = new Date().toISOString();
		setOutcomes((current) => {
			const { [decision.referralId]: _, ...rest } = current;
			if (decision.type === "undo") return rest;
			return {
				...rest,
				[decision.referralId]:
					decision.type === "send"
						? { type: "sent", consent: decision.consent, at }
						: { type: "skipped", rationale: decision.rationale, at },
			};
		});
		onDecision?.(decision);
	};

	const badge = planBadge(plan.referrals, outcomes);
	const Heading = headingLevel;

	return (
		<section aria-label='Social needs at discharge' className={cn("flex flex-col gap-4", className)}>
			<div className='flex flex-col gap-1'>
				<div className='flex flex-wrap items-center gap-2'>
					<Heading className='text-base font-bold text-foreground'>Social needs at discharge</Heading>
					<AnimatePresence mode='wait' initial={false}>
						<motion.span key={badge.key} variants={fadeVariants} initial='initial' animate='animate' exit='exit'>
							<Badge variant={badge.variant} size='xs'>
								{badge.label}
							</Badge>
						</motion.span>
					</AnimatePresence>
				</div>
				<SourceLabel className='text-xs text-muted-foreground'>Source: {plan.source}</SourceLabel>
			</div>

			<Group title='Flagged'>
				<div className='rounded-card border border-border bg-background p-4'>
					<ul className='flex flex-col divide-y divide-border'>
						{plan.needs.map((need) => (
							<li key={need.id} className='flex flex-col gap-0.5 py-3 first:pt-0 last:pb-0'>
								<span className='text-sm font-bold text-foreground'>{need.label}</span>
								{need.detail ? <span className='text-sm text-foreground'>{need.detail}</span> : null}
								{need.evidence ? <span className='text-xs text-muted-foreground'>Based on {need.evidence}</span> : null}
							</li>
						))}
					</ul>
					{plan.payer ? (
						<p className='mt-3 border-t border-border pt-3 text-sm text-foreground'>
							<span className='text-muted-foreground'>Payer on record: </span>
							<span className='font-medium'>{plan.payer}</span>
						</p>
					) : null}
				</div>
			</Group>

			<Group title='Referrals'>
				<ul className='flex flex-col gap-3'>
					{plan.referrals.map((referral) => (
						<ReferralCard
							key={referral.id}
							referral={referral}
							needs={plan.needs}
							outcome={outcomes[referral.id]}
							onDecision={decide}
						/>
					))}
				</ul>
			</Group>
		</section>
	);
}

export {
	consentText,
	DischargePlanPanel,
	type DischargeDecision,
	type DischargePlan,
	type DischargeReferral,
	type ReferralConsent,
	type ReferralOutcome,
	type SocialNeed,
};
