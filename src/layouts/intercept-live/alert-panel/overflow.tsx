import * as React from "react";
import { CircleCheckIcon, ClockIcon, ForwardIcon, UsersIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@/components/buttons/button";
import { Avatar, AvatarFallback, type AvatarFallbackProps } from "@/components/data-display/avatar";
import { Badge } from "@/components/data-display/badge";
import { fadeVariants } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { Expand } from "./care-pathway";

// Exploration (Demo Use Cases, Scenario 5, step 3: "Overflow"): two emergencies at once and one intensivist on the hub's
// console. While the clinician is on another patient's consult, the platform offers this alert to the backup coverage
// (Intercept's backup intensivist) with one click, sending the full panel, the images and the scores. Sending it is the
// alert's Escalate to that target, so the alert's state line, the activity log and the triage queue all say so. Once
// sent, the backup's steps show as they happen: accepted, connected to the bedside, and what they did. Mock: the app's
// coverage service routes it and reports the steps.

/* -------------------------------------------------------------------------- */
/* Data shapes (the app's API fills these)                                    */
/* -------------------------------------------------------------------------- */

/** Who backs the hub up, e.g. Intercept's backup intensivist on now. */
type OverflowCoverage = {
	name: string;
	/** E.g. "Backup intensivist". */
	role: string;
	/** Who they work for, e.g. "Intercept". */
	organization: string;
	initials: string;
	tone?: AvatarFallbackProps["tone"];
};

/** One step the backup took once the alert was sent, e.g. accepted, connected to the bedside, a drug given. */
type OverflowStep = {
	id: string;
	label: string;
	at: string;
	/** E.g. "3 min 50 s after the offer". */
	detail?: string;
};

type AlertOverflow = {
	/** The escalation target sending it goes to (`EscalationTarget.id`): sent is the alert escalated to it. */
	targetId: string;
	to: OverflowCoverage;
	/** Why the platform offers it now, e.g. "You're on Walter Pierce's consult at Regional West." */
	reason: string;
	/** What goes with it, e.g. "Full panel", "CT head and CTA images", "NIHSS 9". */
	sends: string[];
	/** How fast the backup connects, as promised, e.g. "Connects in under 5 min". */
	goal?: string;
	/** The backup's steps once sent, oldest first. */
	steps?: OverflowStep[];
	/** When it was sent, as the coverage service recorded it. Without it, when the alert was escalated (`sentAt`). */
	sentAt?: string;
};

const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

/* -------------------------------------------------------------------------- */
/* Overflow                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The overflow offer under the alert's actions: who it would go to, why now, and what goes with it, then Send to
 * {organization} backup (one click). Once sent (`sentAt`, when the alert was escalated to the target), it reads "Sent to
 * …" with the backup's steps as they come in. Hidden when the alert is closed and was never sent.
 */
function OverflowOffer({
	overflow,
	sentAt,
	open,
	onSend,
	className,
}: {
	overflow: AlertOverflow;
	/** When the alert was sent to the backup; without it, it's still an offer. */
	sentAt?: string;
	/** The alert is still open, so it can be sent. */
	open: boolean;
	onSend?: () => void;
	className?: string;
}) {
	const { to } = overflow;
	const sent = Boolean(sentAt);
	if (!sent && (!open || !onSend)) return null;
	const steps = overflow.steps ?? [];

	return (
		<section
			aria-label='Overflow to backup coverage'
			data-state={sent ? "sent" : "offered"}
			className={cn("flex flex-col gap-3 rounded-card border border-border bg-background p-4", className)}
		>
			<div className='flex flex-wrap items-center gap-2'>
				<UsersIcon aria-hidden='true' className='size-4 shrink-0 text-icon-muted' />
				<h3 className='text-sm font-semibold text-foreground'>Overflow to backup coverage</h3>
				<AnimatePresence mode='wait' initial={false}>
					<motion.span key={sent ? "sent" : "offered"} variants={fadeVariants} initial='initial' animate='animate' exit='exit'>
						<Badge variant={sent ? "green" : "yellow"} size='xs'>
							{sent ? "Sent" : "Suggested"}
						</Badge>
					</motion.span>
				</AnimatePresence>
			</div>

			<div className='flex items-center gap-3'>
				<Avatar size='sm'>
					<AvatarFallback tone={to.tone}>{to.initials}</AvatarFallback>
				</Avatar>
				<div className='flex min-w-0 flex-col text-sm'>
					<span className='font-semibold text-foreground'>{to.name}</span>
					<span className='text-muted-foreground'>
						{to.role}, {to.organization}
					</span>
				</div>
			</div>

			<AnimatePresence initial={false} mode='popLayout'>
				{sent ? (
					<Expand key='sent'>
						<ol aria-label='What the backup did' className='flex flex-col gap-2'>
							<Step label={`Sent to ${to.organization}`} at={overflow.sentAt ?? sentAt} detail={overflow.sends.join(", ")} done />
							{steps.map((step) => (
								<Step key={step.id} label={step.label} at={step.at} detail={step.detail} done />
							))}
							{/* What's still to come, until the backup is on. */}
							{steps.length === 0 ? (
								<Step label={`Waiting for ${to.name.split(",")[0]} to accept`} detail={overflow.goal} />
							) : null}
						</ol>
					</Expand>
				) : (
					<Expand key='offer'>
						<div className='flex flex-col gap-3 text-sm'>
							<p className='text-foreground'>{overflow.reason}</p>
							<div className='flex flex-col gap-1'>
								<span className='text-xs font-semibold text-muted-foreground'>Sends</span>
								<ul className='flex flex-col gap-1'>
									{overflow.sends.map((item) => (
										<li key={item} className='flex items-start gap-2 text-foreground'>
											<CircleCheckIcon aria-hidden='true' className='mt-0.5 size-4 shrink-0 text-success' />
											{item}
										</li>
									))}
								</ul>
							</div>
							{overflow.goal ? <p className='text-muted-foreground'>{overflow.goal}.</p> : null}
							<Button variant='neutral' size='md' onClick={onSend} className='self-start'>
								<ForwardIcon />
								Send to {to.organization} backup
							</Button>
						</div>
					</Expand>
				)}
			</AnimatePresence>
		</section>
	);
}

/** A step in the backup's log: a check once done, a clock while waiting; its time and a detail under it. */
function Step({ label, at, detail, done = false }: { label: string; at?: string; detail?: string; done?: boolean }) {
	const Icon = done ? CircleCheckIcon : ClockIcon;
	return (
		<motion.li variants={fadeVariants} initial='initial' animate='animate' className='flex items-start gap-2 text-sm'>
			<Icon aria-hidden='true' className={cn("mt-0.5 size-4 shrink-0", done ? "text-success" : "text-icon-muted")} />
			<div className='flex min-w-0 flex-col'>
				<span className='font-semibold text-foreground'>
					{label}
					{at ? <span className='font-normal text-muted-foreground'> · {formatTime(at)}</span> : null}
				</span>
				{detail ? <span className='text-muted-foreground'>{detail}</span> : null}
			</div>
		</motion.li>
	);
}

export { OverflowOffer, type AlertOverflow, type OverflowCoverage, type OverflowStep };
