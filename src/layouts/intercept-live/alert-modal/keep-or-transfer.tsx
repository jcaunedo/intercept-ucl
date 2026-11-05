import * as React from "react";
import { AmbulanceIcon, CircleCheckIcon, CircleXIcon, ClockIcon, RotateCcwIcon, TriangleAlertIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@/components/buttons/button";
import { Badge } from "@/components/data-display/badge";
import { Label } from "@/components/forms/label";
import { RadioGroup, RadioGroupItem } from "@/components/forms/radio-group";
import { Textarea } from "@/components/forms/textarea";
import { fadeVariants, scrollIntoViewSmoothly, useMotionPreference } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { SourceLabel } from "../shared/source-label";
import { Expand } from "./care-pathway";

// Exploration (DESIGN.md "Alert modal" › "Keep or transfer"): Scenario 1, step 5. Once the pathway's orders are sent,
// the panel sets what the plan needs against what the hospital has tonight, and the transfer it would take (receiving
// bed, transport and its time). The intensivist decides, with a reason: keep, with checkpoints at 1 h and 4 h (a missed
// one raises a High alert and brings transfer back), or transfer. The platform lays out the facts and doesn't pick one
// (DU-22).

/* -------------------------------------------------------------------------- */
/* Data shapes (the app's API fills these)                                    */
/* -------------------------------------------------------------------------- */

/** Whether the hospital covers a need tonight. */
type TransferNeedStatus = "met" | "limited" | "unmet";

/** One thing the plan needs, against what the hospital has now. */
type TransferNeed = {
	id: string;
	/** E.g. "BiPAP". */
	label: string;
	/** What the hospital has tonight, e.g. "1 machine, free in the ER". */
	available: string;
	status: TransferNeedStatus;
};

/** A hospital that could take the patient. */
type TransferReceiving = {
	id: string;
	/** E.g. "Regional West Medical Center". */
	name: string;
	/** Where, and how far, e.g. "Scottsbluff, NE · 100 mi". */
	place: string;
	/** Its bed tonight, e.g. "ICU, 2 beds open". */
	bed: string;
	/** One that can't take the patient now is listed, but can't be picked. */
	accepting: boolean;
};

/** A way to get there, from the transfer center. */
type TransferTransport = {
	id: string;
	/** E.g. "Ground". */
	label: string;
	/** Its status and time, e.g. "Chadron's ambulance · about 2 h to Scottsbluff". */
	status: string;
	available: boolean;
};

/** A check after a decision to keep: what has to hold by then. */
type TransferCheckpoint = {
	id: string;
	/** Minutes after the decision, e.g. 60. */
	after: number;
	/** What has to hold, e.g. "RR under 24 and SpO₂ ≥ 92% on BiPAP". */
	criteria: string;
	/** Passed or missed, once it's due, with the readings behind it. */
	result?: { status: "passed" | "missed"; detail?: string };
};

/** The decision, its reason and when it was made: keep, or transfer to a receiving hospital by a transport. */
type TransferChoice =
	| { type: "keep"; rationale: string; at: string }
	| {
			type: "transfer";
			rationale: string;
			at: string;
			receivingId: string;
			transportId: string;
	  };

/** What keeping the patient saved, once the checkpoints have passed (Scenario 1, step 6). */
type TransferOutcome = {
	/** The trip the family didn't make, e.g. "100 mi each way". */
	distance: string;
	/** The estimated transfer cost avoided. */
	cost: string;
	/** ICU-level care delivered at the hospital, e.g. "4 h 20 min". */
	careHours?: string;
};

type KeepOrTransfer = {
	/** The hospital's short name, e.g. "Chadron", for "Keep at Chadron". */
	hospital: string;
	/** Where the needs and the transfer options come from. */
	source: string;
	needs: TransferNeed[];
	receiving: TransferReceiving[];
	transport: TransferTransport[];
	checkpoints: TransferCheckpoint[];
	/** A decision already made. Without it, the intensivist decides here. */
	decided?: TransferChoice;
	/** "Transfer avoided", once the patient was kept and every checkpoint passed. */
	outcome?: TransferOutcome;
};

/** What the intensivist did: decided (without the time, which the app records), or took the decision back. */
type KeepOrTransferDecision =
	| { type: "keep"; rationale: string }
	| {
			type: "transfer";
			rationale: string;
			receivingId: string;
			transportId: string;
	  }
	| { type: "undo" };

/* -------------------------------------------------------------------------- */
/* Product content                                                            */
/* -------------------------------------------------------------------------- */

const needIcons: Record<TransferNeedStatus, { icon: typeof CircleCheckIcon; className: string; label: string }> = {
	met: { icon: CircleCheckIcon, className: "text-success", label: "Covered" },
	limited: {
		icon: TriangleAlertIcon,
		className: "text-warning",
		label: "Limited",
	},
	unmet: {
		icon: CircleXIcon,
		className: "text-destructive",
		label: "Not available",
	},
};

const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const formatAfter = (minutes: number) => (minutes % 60 ? `${minutes} min` : `${minutes / 60} h`);

/* -------------------------------------------------------------------------- */
/* Parts                                                                      */
/* -------------------------------------------------------------------------- */

/** A titled card, as the pathway's order set. */
function Group({ title, children }: { title: string; children: React.ReactNode }) {
	const id = React.useId();
	return (
		<section aria-labelledby={id} className='flex flex-col gap-2'>
			<h4 id={id} className='text-sm font-semibold text-foreground'>
				{title}
			</h4>
			<div className='rounded-card border border-border bg-background p-4'>{children}</div>
		</section>
	);
}

/** The checkpoints after a decision to keep: when each is due, what has to hold, and whether it passed. */
function Checkpoints({ checkpoints, from }: { checkpoints: TransferCheckpoint[]; from?: Date }) {
	return (
		<ol aria-label='Checkpoints' className='flex flex-col gap-3'>
			{checkpoints.map((checkpoint) => {
				const due = from ? new Date(from.getTime() + checkpoint.after * 60_000) : undefined;
				const result = checkpoint.result?.status;
				const Icon = result === "passed" ? CircleCheckIcon : result === "missed" ? TriangleAlertIcon : ClockIcon;
				return (
					<li key={checkpoint.id} className='flex items-start gap-2'>
						<Icon
							aria-hidden='true'
							className={cn(
								"mt-0.5 size-4 shrink-0",
								result === "passed" ? "text-success" : result === "missed" ? "text-destructive" : "text-icon-muted",
							)}
						/>
						<div className='flex min-w-0 flex-col text-sm'>
							<span className='font-semibold text-foreground'>
								{due ? `${formatAfter(checkpoint.after)} · ${formatTime(due)}` : `In ${formatAfter(checkpoint.after)}`}
								{result ? (
									<span className={cn("font-medium", result === "passed" ? "text-success" : "text-destructive")}>
										{" "}
										· {result === "passed" ? "Passed" : "Missed"}
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
	);
}

/* -------------------------------------------------------------------------- */
/* Keep or transfer                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Keep or transfer, for a patient a small hospital may not be able to hold: what the plan needs against what the
 * hospital has tonight, the transfer it would take, and the intensivist's decision with its reason. Keeping sets
 * checkpoints; transferring names the receiving hospital and the transport. `escapeRef` lets the modal hand Escape to an
 * open form, which it closes, instead of closing.
 */
function KeepOrTransferPanel({
	data,
	onDecision,
	escapeRef,
	className,
}: {
	data: KeepOrTransfer;
	onDecision?: (decision: KeepOrTransferDecision) => void;
	escapeRef?: React.RefObject<(() => boolean) | null>;
	className?: string;
}) {
	const [choice, setChoice] = React.useState<TransferChoice | null>(data.decided ?? null);
	const [form, setForm] = React.useState<"keep" | "transfer" | null>(null);
	const [rationale, setRationale] = React.useState("");
	const accepting = data.receiving.filter((receiving) => receiving.accepting);
	const transports = data.transport.filter((transport) => transport.available);
	const [receivingId, setReceivingId] = React.useState(accepting[0]?.id ?? "");
	const [transportId, setTransportId] = React.useState(transports[0]?.id ?? "");
	const fieldId = React.useId();

	React.useEffect(() => {
		if (!escapeRef) return;
		escapeRef.current = () => {
			if (!form) return false;
			setForm(null);
			return true;
		};
		return () => {
			escapeRef.current = null;
		};
	}, [escapeRef, form]);

	const decide = () => {
		const reason = rationale.trim();
		if (!reason || !form) return;
		const at = new Date().toISOString();
		if (form === "keep") {
			setChoice({ type: "keep", rationale: reason, at });
			onDecision?.({ type: "keep", rationale: reason });
		} else {
			if (!receivingId || !transportId) return;
			setChoice({
				type: "transfer",
				rationale: reason,
				at,
				receivingId,
				transportId,
			});
			onDecision?.({
				type: "transfer",
				rationale: reason,
				receivingId,
				transportId,
			});
		}
		setForm(null);
	};
	// Back to deciding; the reason stays in the form.
	const undo = () => {
		setChoice(null);
		onDecision?.({ type: "undo" });
	};

	const badge =
		choice?.type === "keep"
			? {
					key: "keep",
					label: `Keep at ${data.hospital}`,
					variant: "green" as const,
				}
			: choice?.type === "transfer"
				? {
						key: "transfer",
						label: "Transfer requested",
						variant: "amber" as const,
					}
				: { key: "open", label: "To decide", variant: "yellow" as const };
	const decidedAt = choice ? new Date(choice.at) : undefined;
	const receiving =
		choice?.type === "transfer" ? data.receiving.find((item) => item.id === choice.receivingId) : undefined;
	const transport =
		choice?.type === "transfer" ? data.transport.find((item) => item.id === choice.transportId) : undefined;
	const missed =
		choice?.type === "keep" && data.checkpoints.some((checkpoint) => checkpoint.result?.status === "missed");
	const outcome = choice?.type === "keep" && !missed ? data.outcome : undefined;

	// When a checkpoint passes, and when the transfer is avoided, the column scrolls to its end so the result is seen
	// (Nov 3, 2026, user's call). Not when the modal opens on results already in.
	const passed =
		choice?.type === "keep" ? data.checkpoints.filter((checkpoint) => checkpoint.result?.status === "passed").length : 0;
	const progress = passed + (outcome ? 1 : 0);
	const seenProgress = React.useRef(progress);
	const endRef = React.useRef<HTMLDivElement>(null);
	const { prefersReducedMotion } = useMotionPreference();
	React.useEffect(() => {
		const grew = progress > seenProgress.current;
		seenProgress.current = progress;
		if (!grew || !endRef.current) return;
		return scrollIntoViewSmoothly(endRef.current, { reducedMotion: Boolean(prefersReducedMotion) });
	}, [progress, prefersReducedMotion]);

	return (
		<section
			aria-label='Keep or transfer'
			data-decision={choice?.type ?? "open"}
			className={cn("relative flex flex-col gap-4", className)}
		>
			{/* The panel's end, for the scroll to it; clear of the column's bottom padding. */}
			<div ref={endRef} aria-hidden='true' className='pointer-events-none absolute inset-x-0 bottom-0 h-px scroll-mb-4' />
			<div className='flex flex-col gap-1'>
				<div className='flex flex-wrap items-center gap-2'>
					<h3 className='text-base font-bold text-foreground'>Keep or transfer</h3>
					<AnimatePresence mode='wait' initial={false}>
						<motion.span key={badge.key} variants={fadeVariants} initial='initial' animate='animate' exit='exit'>
							<Badge variant={badge.variant} size='xs'>
								{badge.label}
							</Badge>
						</motion.span>
					</AnimatePresence>
				</div>
				<SourceLabel className='text-xs text-muted-foreground'>Source: {data.source}</SourceLabel>
			</div>

			<Group title={`What the plan needs, against ${data.hospital} tonight`}>
				<ul className='flex flex-col divide-y divide-border'>
					{data.needs.map((need) => {
						const { icon: Icon, className: tone, label } = needIcons[need.status];
						return (
							<li key={need.id} className='flex items-start gap-2 py-3 first:pt-0 last:pb-0'>
								<Icon aria-hidden='true' className={cn("mt-0.5 size-4 shrink-0", tone)} />
								<div className='flex min-w-0 flex-col text-sm'>
									<span className='font-bold text-foreground'>
										{need.label}
										<span className='sr-only'>: {label}</span>
									</span>
									<span className='text-muted-foreground'>{need.available}</span>
								</div>
							</li>
						);
					})}
				</ul>
			</Group>

			{/* The transfer form lists the same options to pick from, so the card folds away while it's open. */}
			<AnimatePresence initial={false}>
				{form !== "transfer" || choice ? (
					<Expand key='options'>
						<Group title='If transferred'>
							<div className='flex flex-col gap-3'>
								<ul aria-label='Receiving hospitals' className='flex flex-col gap-2'>
									{data.receiving.map((item) => (
										<li key={item.id} className='flex flex-col text-sm'>
											<span className='font-bold text-foreground'>{item.name}</span>
											<span className='text-muted-foreground'>
												{item.place} · {item.bed}
											</span>
										</li>
									))}
								</ul>
								<hr className='border-border' />
								<ul aria-label='Transport' className='flex flex-col gap-2'>
									{data.transport.map((item) => (
										// Not faded when unavailable (Nov 5, 2026, user's call: "difficult to read"): why air or ground
										// can't go is what the decision turns on, so it reads in full, flagged with the alert triangle as
										// the plan's limited needs are (user's call, same day); available, the check.
										<li key={item.id} className='flex items-start gap-2 text-sm'>
											{item.available ? (
												<CircleCheckIcon aria-hidden='true' className='mt-0.5 size-4 shrink-0 text-success' />
											) : (
												<TriangleAlertIcon aria-hidden='true' className='mt-0.5 size-4 shrink-0 text-warning' />
											)}
											<div className='flex min-w-0 flex-col'>
												<span className='font-bold text-foreground'>
													{item.label}
													<span className='sr-only'>: {item.available ? "Available" : "Not available"}</span>
												</span>
												<span className='text-foreground'>{item.status}</span>
											</div>
										</li>
									))}
								</ul>
							</div>
						</Group>
					</Expand>
				) : null}
			</AnimatePresence>

			{/* The decision and what follows it. */}
			<AnimatePresence initial={false} mode='popLayout'>
				{!choice && !form ? (
					<Expand key='decide'>
						<div className='flex flex-col gap-3'>
							<p className='text-sm text-muted-foreground'>
								Keeping sets checkpoints at{" "}
								{data.checkpoints.map((checkpoint) => formatAfter(checkpoint.after)).join(" and ")}. A missed one raises
								a High alert.
							</p>
							<div className='flex gap-2'>
								<Button variant='outline' size='md' onClick={() => setForm("transfer")} className='flex-1'>
									Transfer
								</Button>
								<Button variant='outline' size='md' onClick={() => setForm("keep")} className='flex-1'>
									Keep at {data.hospital}
								</Button>
							</div>
						</div>
					</Expand>
				) : null}
				{!choice && form ? (
					<Expand key={`form-${form}`}>
						<form
							aria-label={form === "keep" ? `Keep at ${data.hospital}` : "Transfer"}
							className='flex flex-col gap-4'
							onSubmit={(event) => {
								event.preventDefault();
								decide();
							}}
						>
							{form === "transfer" ? (
								<>
									<fieldset className='flex flex-col gap-2'>
										<legend className='mb-2 text-xs font-semibold text-muted-foreground'>Receiving hospital</legend>
										<RadioGroup value={receivingId} onValueChange={setReceivingId} className='grid gap-3'>
											{data.receiving.map((item) => (
												<div key={item.id} className='flex items-start gap-2'>
													<RadioGroupItem
														id={`${fieldId}-${item.id}`}
														value={item.id}
														disabled={!item.accepting}
														className='mt-0.5'
													/>
													<Label htmlFor={`${fieldId}-${item.id}`} className='flex flex-col items-start gap-0'>
														<span className='font-semibold'>{item.name}</span>
														<span className='text-xs font-normal text-muted-foreground'>
															{item.place} · {item.bed}
														</span>
													</Label>
												</div>
											))}
										</RadioGroup>
									</fieldset>
									<fieldset className='flex flex-col gap-2'>
										<legend className='mb-2 text-xs font-semibold text-muted-foreground'>Transport</legend>
										<RadioGroup value={transportId} onValueChange={setTransportId} className='grid gap-3'>
											{data.transport.map((item) => (
												<div key={item.id} className='flex items-start gap-2'>
													<RadioGroupItem
														id={`${fieldId}-${item.id}`}
														value={item.id}
														disabled={!item.available}
														className='mt-0.5'
													/>
													<Label htmlFor={`${fieldId}-${item.id}`} className='flex flex-col items-start gap-0'>
														<span className='font-semibold'>{item.label}</span>
														<span className='text-xs font-normal text-muted-foreground'>{item.status}</span>
													</Label>
												</div>
											))}
										</RadioGroup>
									</fieldset>
								</>
							) : (
								<div className='flex flex-col gap-2'>
									<span className='text-xs font-semibold text-muted-foreground'>Checkpoints</span>
									<Checkpoints checkpoints={data.checkpoints} />
								</div>
							)}
							<div className='flex flex-col gap-2'>
								<Label htmlFor={`${fieldId}-rationale`}>
									{form === "keep" ? `Why keep at ${data.hospital}?` : "Why transfer?"}
								</Label>
								<Textarea
									id={`${fieldId}-rationale`}
									value={rationale}
									onChange={(event) => setRationale(event.target.value)}
									placeholder={
										form === "keep"
											? "E.g. BiPAP and RT are here; a 2 h ride is the bigger risk tonight"
											: "E.g. needs more than the floor can give overnight"
									}
									autoFocus={form === "keep"}
								/>
							</div>
							<div className='flex justify-end gap-2'>
								<Button type='button' variant='ghost' size='md' onClick={() => setForm(null)}>
									Cancel
								</Button>
								<Button
									type='submit'
									variant='neutral'
									size='md'
									disabled={!rationale.trim() || (form === "transfer" && (!receivingId || !transportId))}
								>
									{form === "keep" ? `Keep at ${data.hospital}` : "Request transfer"}
								</Button>
							</div>
						</form>
					</Expand>
				) : null}
				{choice ? (
					<Expand key={`decided-${choice.type}`}>
						<div className='flex flex-col gap-4'>
							<div role='status' className='flex items-start gap-2 text-sm text-foreground'>
								{choice.type === "keep" ? (
									<CircleCheckIcon aria-hidden='true' className='mt-0.5 size-4 shrink-0 text-success' />
								) : (
									<AmbulanceIcon aria-hidden='true' className='mt-0.5 size-4 shrink-0 text-icon-muted' />
								)}
								<div className='flex min-w-0 flex-col'>
									<span>
										{choice.type === "keep"
											? `Keeping at ${data.hospital}`
											: `Transfer requested to ${receiving?.name ?? "the receiving hospital"}${transport ? `, by ${transport.label.toLowerCase()}` : ""}`}
										{decidedAt ? <span className='text-muted-foreground'> · {formatTime(decidedAt)}</span> : null}
									</span>
									<span>
										<span className='text-muted-foreground'>Why: </span>
										{choice.rationale}
									</span>
									{choice.type === "transfer" ? (
										<span className='text-muted-foreground'>The transfer center confirms the bed and the crew.</span>
									) : null}
								</div>
							</div>
							{choice.type === "keep" ? (
								<div className='flex flex-col gap-2'>
									<span className='text-xs font-semibold text-muted-foreground'>Checkpoints</span>
									<Checkpoints checkpoints={data.checkpoints} from={decidedAt} />
									{missed ? (
										<p className='text-sm text-destructive'>
											A checkpoint was missed, so a High alert was raised. Consider transfer again.
										</p>
									) : null}
								</div>
							) : null}
							{outcome ? (
								<div className='flex flex-col gap-1 rounded-xl bg-badge-green p-4 text-sm text-foreground'>
									<span className='flex items-center gap-2 text-base font-bold'>
										<CircleCheckIcon aria-hidden='true' className='size-4 shrink-0 text-success' />
										Transfer avoided
									</span>
									<span>
										<span className='text-muted-foreground'>Trip the family didn't make: </span>
										{outcome.distance}
									</span>
									<span>
										<span className='text-muted-foreground'>Estimated transfer cost avoided: </span>
										{outcome.cost}
									</span>
									{outcome.careHours ? (
										<span>
											<span className='text-muted-foreground'>ICU-level care delivered here: </span>
											{outcome.careHours}
										</span>
									) : null}
								</div>
							) : (
								<Button variant='link' size='sm' onClick={undo} className='h-auto self-start px-0 has-[>svg]:px-0'>
									<RotateCcwIcon />
									Change decision
								</Button>
							)}
						</div>
					</Expand>
				) : null}
			</AnimatePresence>
		</section>
	);
}

export {
	KeepOrTransferPanel,
	type KeepOrTransfer,
	type KeepOrTransferDecision,
	type TransferCheckpoint,
	type TransferChoice,
	type TransferNeed,
	type TransferNeedStatus,
	type TransferOutcome,
	type TransferReceiving,
	type TransferTransport,
};
