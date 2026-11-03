import * as React from "react";
import {
	ArrowUpFromLineIcon,
	CheckCheckIcon,
	CheckIcon,
	CircleUserIcon,
	LoaderCircleIcon,
	type LucideIcon,
	MapPinIcon,
	MicIcon,
	MicOffIcon,
	PhoneOffIcon,
	ScanEyeIcon,
	Undo2Icon,
	VideoIcon,
	VideoOffIcon,
	XIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@/components/buttons/button";
import {
	PatientCardScore,
	PatientCardTags,
	type PatientCardTag,
	type PatientCensusCardProps,
} from "@/components/cards/patient-census-card";
import { AlertBar, PatientMonitor, type PatientMonitorProps } from "@/components/cards/patient-monitoring-card";
import { Avatar, AvatarBadge, AvatarFallback, AvatarImage, type AvatarFallbackProps } from "@/components/data-display/avatar";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/overlays/dialog";
import { useCurrentSecond } from "@/lib/hooks/use-current-second";
import {
	confirmPattern,
	fadeVariants,
	iconSwapReducedVariants,
	iconSwapVariants,
	liveDotVariants,
	revealVariants,
	useMotionPreference,
} from "@/lib/motion";
import { cn } from "@/lib/utils";

import type { AlertControls, OpenAlert } from "../intercept-live";
import {
	compareTriageAlerts,
	EscalateForm,
	isOpenAlert,
	ResolveForm,
	stateLine,
	type EscalationTarget,
	type TriageAlert,
	type TriageAlertAction,
	type TriageAlertSeverity,
} from "../monitoring/triage-queue";
import { RoomScene, RoomVideo, type RoomEquipment } from "../patient-details/sections/camera-section";
import { SourceLabel } from "../shared/source-label";
import { CarePathwayPanel, type CarePathway, type CarePathwayDecision } from "./care-pathway";

// The alert modal that a Monitoring card's alert bar and an alert toast's maximize button open (DESIGN.md "Alert
// modal"). Scenario 1, steps 2 to 4. Left, what's happening: the alert, the patient's score, monitor and score inputs,
// the key clinical findings behind the alert and the history and labs the intensivist needs. Right, what to do about it:
// a one-click video consult to the bedside and step 4's care pathway (`care-pathway.tsx`, exploration).

/* -------------------------------------------------------------------------- */
/* Data shapes (the app's API fills these)                                    */
/* -------------------------------------------------------------------------- */

type AlertDetailPatient = {
	lastName: string;
	firstName?: string;
	photo?: string;
	initials?: string;
	tone?: AvatarFallbackProps["tone"];
	sex?: string;
	age?: number | string;
	mrn?: string;
	hospital?: string;
	unit?: string;
	bed?: string;
};

/**
 * One phrase of the alert's reason line and the numbers behind it, e.g. "Rising work of breathing": "RR 18 → 26/min…".
 * A `lead`, e.g. "EF 25%", shows semibold before the detail, separated by a comma.
 */
type AlertDetailReason = { label: string; detail: string; lead?: string };

/**
 * A line of history or a lab, e.g. "BNP": "2,400 pg/mL", "up from 1,850 on admission · normal < 100". `items` lists
 * it instead (home meds: each drug's name, then its dose).
 */
type AlertDetailFact = {
	label: string;
	value?: string;
	detail?: string;
	items?: { name: string; detail?: string }[];
	/** How much the value matters now: `critical` (out of range and acting on tonight's alert) or `low` (abnormal but
	 * known, e.g. a chronic EF). Colors the value. */
	severity?: "critical" | "low";
};

/** Who the consult calls: the nurse at the bedside, from Presence and Status. */
type AlertDetailBedside = {
	name: string;
	role: string;
	initials: string;
	src?: string;
	tone?: AvatarFallbackProps["tone"];
	presence: "online" | "away" | "offline";
	/** Where they are, e.g. "At the bedside". */
	activity: string;
};

type AlertDetailData = {
	alert: TriageAlert;
	patient: AlertDetailPatient;
	/** How many alerts the patient had in the last 24 h, in the alert bar. */
	inLast24h?: number;
	/** The patient's acuity score and its change, as on their card. */
	acuity?: PatientCensusCardProps["acuity"];
	trajectory?: PatientCensusCardProps["trajectory"];
	/** The patient's bedside monitor. */
	monitor?: Pick<PatientMonitorProps, "vitals" | "limits" | "alarmPriorities" | "acknowledgedAlarms">;
	/** The reason line, phrase by phrase. */
	reasons: AlertDetailReason[];
	/** The patient's tags, as on their card. Without them there's no tag row; `[]` says "No tags". */
	tags?: PatientCardTag[];
	/** History and labs, for the consult. */
	history: AlertDetailFact[];
	bedside?: AlertDetailBedside;
	/** The room's equipment, for the drawn camera feed. */
	room?: RoomEquipment;
	/** The room's camera, a video URL for the consult. Without it, or if it can't load, the consult draws the room. */
	video?: string;
	/** A suggested care pathway and its order set, e.g. Scenario 1's CHF exacerbation pathway (exploration). */
	pathway?: CarePathway;
};

/** The consult call: not started, ringing the bedside, or on video. */
type AlertConsultState = "idle" | "connecting" | "live";

type AlertDetailAction = "acknowledge" | "escalate" | "resolve" | "decline";

type AlertDetailModalProps = {
	open?: boolean;
	defaultOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
	data: AlertDetailData;
	/** The consult's state when the modal opens. */
	defaultConsult?: AlertConsultState;
	onConsultChange?: (state: AlertConsultState) => void;
	/**
	 * The alert's lifecycle actions (DU-13), as the triage queue sends them: Acknowledge at once, Escalate with who it
	 * goes to and a note, Resolve with a reason and a note (Decline, with an optional note, for an AI recommendation).
	 */
	onAction?: (action: TriageAlertAction) => void;
	/**
	 * Which lifecycle buttons show. By default, the triage queue's: Acknowledge while the alert is active (then Acknowledged,
	 * done, once it's acknowledged), Escalate unless it's escalated (and only with `escalationTargets`), and Mark as
	 * resolved (Decline for AI) while it's open.
	 */
	actions?: AlertDetailAction[];
	/** Who Escalate can send the alert to, as in the triage queue. */
	escalationTargets?: EscalationTarget[];
	/** The patient's name opens their details. */
	onOpenPatient?: () => void;
	/** The intensivist accepted the pathway's orders (with any edited dose) or declined it. */
	onPathwayDecision?: (decision: CarePathwayDecision) => void;
};

/* -------------------------------------------------------------------------- */
/* Product content                                                            */
/* -------------------------------------------------------------------------- */

// Stands in for the call ringing at the bedside, so the prototype shows Calling.
const CONNECT_DELAY_MS = 1200;

const sourceLabels: Record<TriageAlert["source"]["kind"], string> = {
	ai: "AI",
	device: "Device",
	rule: "Rule",
	manual: "Concern",
	system: "System",
};

const presenceLabels = { online: "Online", away: "Away", offline: "Offline" } as const;

const actions: Record<AlertDetailAction, { label: string; icon: LucideIcon }> = {
	acknowledge: { label: "Acknowledge", icon: ScanEyeIcon },
	escalate: { label: "Escalate", icon: ArrowUpFromLineIcon },
	resolve: { label: "Mark as resolved", icon: CheckCheckIcon },
	// An AI recommendation can also be marked wrong (the decline outcome BR-07 records): the clinician's verdict, said
	// plainly, so it reads as feedback on the AI rather than turning the alert down.
	decline: { label: "Feedback", icon: Undo2Icon },
};

// The alert's panel in its severity's tones: a pale fill, the title in the darkest step, the source a step lighter.
const severityTones: Record<TriageAlertSeverity, { panel: string; title: string; source: string }> = {
	critical: {
		panel: "bg-severity-critical-subtle",
		title: "text-severity-critical-strong",
		source: "text-severity-critical-prominent",
	},
	high: { panel: "bg-severity-high-subtle", title: "text-severity-high-strong", source: "text-severity-high-prominent" },
	medium: {
		panel: "bg-severity-medium-subtle",
		title: "text-severity-medium-strong",
		source: "text-severity-medium-prominent",
	},
	low: { panel: "bg-severity-low-subtle", title: "text-severity-low-strong", source: "text-severity-low-prominent" },
};

// A resolved alert's panel takes the Resolved bar's green, so bar and panel read as one; its words drop the severity's
// tones, which no longer matter.
const resolvedTones = { panel: "bg-badge-green", title: "text-foreground", source: "text-muted-foreground" };

// The low step is the strong one: the base low blue is too light for text on white.
const factSeverityClassNames: Record<NonNullable<AlertDetailFact["severity"]>, string> = {
	critical: "text-severity-critical",
	low: "text-severity-low-strong",
};

/* -------------------------------------------------------------------------- */
/* Parts                                                                      */
/* -------------------------------------------------------------------------- */

function formatElapsed(seconds: number) {
	const minutes = Math.floor(seconds / 60);
	return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

/** A column's label, e.g. "Clinical info": what the column holds, over its sections. */
function ColumnLabel({ id, children }: { id: string; children: React.ReactNode }) {
	return (
		<h2 id={id} className='text-xs font-medium tracking-[0.04em] text-muted-foreground uppercase'>
			{children}
		</h2>
	);
}

/** A section's heading in a column, e.g. "Key clinical findings". */
function SectionHeading({ children }: { children: React.ReactNode }) {
	return <h3 className='text-base font-bold text-foreground'>{children}</h3>;
}

/** A section's line when it has nothing to show, so the section stays in place from alert to alert. */
function SectionEmpty({ children }: { children: React.ReactNode }) {
	return <p className='text-sm text-muted-foreground'>{children}</p>;
}

/**
 * The key clinical findings: each phrase of the reason line with its numbers. An alert without them shows its own
 * evidence and recommendation instead; one with neither says so.
 */
function KeyFindings({ data }: { data: AlertDetailData }) {
	const { reasons, alert } = data;
	const evidence = alert.evidence ?? [];
	return (
		<section aria-label='Key clinical findings' className='flex flex-col gap-3'>
			<SectionHeading>Key clinical findings</SectionHeading>
			{reasons.length ? (
				<dl className='flex flex-col gap-3 text-sm'>
					{reasons.map((reason) => (
						<div key={reason.label}>
							<dt className='text-muted-foreground'>{reason.label}</dt>
							<dd className='font-medium text-foreground'>
								{reason.lead ? <span className='font-semibold'>{reason.lead}, </span> : null}
								{reason.detail}
							</dd>
						</div>
					))}
				</dl>
			) : !evidence.length && !alert.recommendation ? (
				<SectionEmpty>No key findings for this alert.</SectionEmpty>
			) : (
				<>
					{evidence.length ? (
						<ul className='flex list-disc flex-col gap-1.5 pl-5 text-sm font-medium text-foreground'>
							{evidence.map((item) => (
								<li key={item}>{item}</li>
							))}
						</ul>
					) : null}
					{alert.recommendation ? <p className='text-sm font-medium text-foreground'>{alert.recommendation}</p> : null}
				</>
			)}
		</section>
	);
}

/**
 * History and labs for the consult: the value in its severity's color, its detail under it. Without any, it says so.
 */
function HistoryAndLabs({ data }: { data: AlertDetailData }) {
	return (
		<section aria-label='History and labs' className='flex flex-col gap-3'>
			<SectionHeading>History and labs</SectionHeading>
			{data.history.length ? (
				<dl className='flex flex-col gap-3 text-sm'>
					{data.history.map((fact) => (
						<div key={fact.label}>
							<dt className='font-bold text-foreground'>{fact.label}</dt>
							<dd className='font-medium text-foreground'>
								{fact.items ? (
									<ul className='list-disc pl-5'>
										{fact.items.map((item) => (
											<li key={item.name}>
												<span className='font-semibold'>{item.name}</span>
												{item.detail ? ` ${item.detail}` : null}
											</li>
										))}
									</ul>
								) : null}
								{fact.value ? (
									<span className={cn("block font-semibold", fact.severity && factSeverityClassNames[fact.severity])}>
										{fact.value}
									</span>
								) : null}
								{fact.detail ? <span className='block'>{fact.detail}</span> : null}
							</dd>
						</div>
					))}
				</dl>
			) : (
				<SectionEmpty>No history or labs on file for this patient.</SectionEmpty>
			)}
		</section>
	);
}

/** The call's Live dot (MOTION.md Live): it breathes while the call is on, still under reduced motion. */
function LiveDot() {
	const { prefersReducedMotion } = useMotionPreference();
	return (
		<motion.span
			aria-hidden='true'
			variants={liveDotVariants}
			animate={prefersReducedMotion ? undefined : "live"}
			className='size-2 rounded-full bg-(--destructive-400)'
		/>
	);
}

/**
 * The video consult, once the footer's Video call button calls the bedside nurse: ringing, then the room's camera.
 * Dark in both themes, as the camera feed is; the live view fades in over the ringing one (`fadeVariants`), so the tile
 * never changes size.
 */
function ConsultTile({
	data,
	state,
	onEnd,
}: {
	data: AlertDetailData;
	state: Exclude<AlertConsultState, "idle">;
	onEnd: () => void;
}) {
	const { bedside, patient, room, video } = data;
	const now = useCurrentSecond();
	const [startedAt, setStartedAt] = React.useState<number | null>(null);
	const [muted, setMuted] = React.useState(false);
	React.useEffect(() => {
		if (state === "live") setStartedAt((current) => current ?? Date.now());
		else setStartedAt(null);
	}, [state]);
	const elapsed = startedAt !== null && now !== null ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;
	const who = bedside ? `${bedside.name}, ${bedside.role}` : "the bedside";

	return (
		<section
			aria-label='Video consult'
			className='relative h-62 w-full shrink-0 overflow-hidden rounded-card bg-(--gray-900)'
		>
			<AnimatePresence initial={false}>
				{state === "connecting" ? (
					<motion.div
						key='connecting'
						variants={fadeVariants}
						initial='initial'
						animate='animate'
						exit='exit'
						className='absolute inset-0 flex flex-col items-center justify-center gap-3 bg-(--gray-900) p-4 text-center text-(--gray-50)'
					>
						{bedside ? (
							<>
								<Avatar size='lg' className='overflow-visible'>
									{bedside.src ? <AvatarImage src={bedside.src} alt='' /> : null}
									<AvatarFallback tone={bedside.tone}>{bedside.initials}</AvatarFallback>
									{bedside.presence === "online" ? <AvatarBadge className='ring-(--gray-900)' /> : null}
								</Avatar>
								<p className='text-sm'>
									<span className='font-semibold'>{who}</span>
									<span className='block text-(--gray-300)'>
										{presenceLabels[bedside.presence]} · {bedside.activity}
									</span>
								</p>
							</>
						) : null}
						<p role='status' className='flex items-center gap-2 text-sm text-(--gray-200)'>
							<LoaderCircleIcon aria-hidden='true' className='size-4 animate-spin motion-reduce:animate-none' />
							Calling {bedside?.name ?? "the bedside"}…
						</p>
					</motion.div>
				) : (
					<motion.div
						key='live'
						variants={fadeVariants}
						initial='initial'
						animate='animate'
						exit='exit'
						className='absolute inset-0 bg-(--gray-900) text-(--gray-50)'
					>
						<div
							role='img'
							aria-label={
								video
									? `Live camera, ${patient.bed ?? "the room"}`
									: `Live camera, ${patient.bed ?? "the room"}: the patient in bed on oxygen, the monitor on the wall`
							}
							className='absolute inset-0'
						>
							{video ? (
								<RoomVideo src={video} fallback={<RoomScene preset='bed' equipment={room ?? { airway: "oxygen", pumps: 1 }} />} />
							) : (
								<RoomScene preset='bed' equipment={room ?? { airway: "oxygen", pumps: 1 }} />
							)}
						</div>
						<div className='absolute inset-x-3 top-3 flex items-center justify-between gap-2 text-xs font-medium'>
							<span className='flex items-center gap-1.5 rounded-full bg-(--gray-950)/70 px-2.5 py-1'>
								<LiveDot />
								Live · <time className='tabular-nums'>{formatElapsed(elapsed)}</time>
							</span>
							{patient.bed ? <span className='rounded-full bg-(--gray-950)/70 px-2.5 py-1'>{patient.bed}</span> : null}
						</div>
						<div className='absolute inset-x-3 bottom-3 flex items-end justify-between gap-2'>
							{bedside ? (
								<span className='flex items-center gap-2 rounded-full bg-(--gray-950)/70 py-1 pr-3 pl-1 text-xs font-medium'>
									<Avatar size='xs'>
										{bedside.src ? <AvatarImage src={bedside.src} alt='' /> : null}
										<AvatarFallback tone={bedside.tone}>{bedside.initials}</AvatarFallback>
									</Avatar>
									{who} joined
								</span>
							) : (
								<span />
							)}
							<div className='flex gap-2'>
								<Button
									variant='circle'
									size='icon-md'
									aria-label={muted ? "Unmute" : "Mute"}
									aria-pressed={muted}
									onClick={() => setMuted((current) => !current)}
								>
									{muted ? <MicOffIcon /> : <MicIcon />}
								</Button>
								<Button variant='destructive' size='md' onClick={onEnd} className='rounded-full'>
									<PhoneOffIcon />
									End
								</Button>
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</section>
	);
}

/**
 * The call, floating over the bottom of the Clinical info column while it's on: it fades in and rises (Reveal), so the
 * findings stay in place under it; a fade under reduced motion.
 */
function ConsultReveal({ children }: { children: React.ReactNode }) {
	const { prefersReducedMotion } = useMotionPreference();
	return (
		<motion.div
			variants={prefersReducedMotion ? fadeVariants : revealVariants}
			initial='initial'
			animate='animate'
			exit='exit'
			className='absolute inset-x-6 bottom-4'
		>
			{children}
		</motion.div>
	);
}

/* -------------------------------------------------------------------------- */
/* Alert modal                                                                */
/* -------------------------------------------------------------------------- */

/**
 * An alert, opened, 1400px wide in three columns. The patient: who they are, the alert (its bar, title, source and
 * lifecycle actions), their score, monitor and tags, then Open patient and Video call (the bedside nurse). Clinical
 * info: the key clinical findings and the history and labs, with the video consult floating over its bottom once it's on. Pathway,
 * for acting on it: the suggested care pathway with its decision at the bottom. Each column scrolls on its own.
 *
 * Figma: [intercept.ds › alert-modal](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1321-10102)
 */
function AlertDetailModal({
	open,
	defaultOpen,
	onOpenChange,
	data,
	defaultConsult = "idle",
	onConsultChange,
	onAction,
	actions: actionsProp,
	escalationTargets = [],
	onOpenPatient,
	onPathwayDecision,
}: AlertDetailModalProps) {
	const { alert, patient } = data;
	const [consult, setConsultState] = React.useState<AlertConsultState>(defaultConsult);
	const setConsult = (next: AlertConsultState) => {
		setConsultState(next);
		onConsultChange?.(next);
	};
	React.useEffect(() => {
		if (consult !== "connecting") return;
		const timer = window.setTimeout(() => setConsult("live"), CONNECT_DELAY_MS);
		return () => window.clearTimeout(timer);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [consult]);

	const name = [patient.lastName, patient.firstName].filter(Boolean).join(", ");
	const identity = [[patient.sex, patient.age].filter(Boolean).join(", "), patient.mrn ? `MRN ${patient.mrn}` : undefined]
		.filter(Boolean)
		.join(" · ");
	const location = [patient.hospital, patient.unit, patient.bed].filter(Boolean).join(" · ");
	// The reason line leads; the alert's own title follows it. An alert without a reason leads with its title.
	const heading = alert.reason ?? alert.title;
	const supporting = alert.reason ? alert.title : undefined;
	const status = alert.status ?? "active";
	const tones = status === "resolved" ? resolvedTones : severityTones[alert.severity];
	const ai = alert.source.kind === "ai";
	const shownActions =
		actionsProp ??
		(isOpenAlert(alert)
			? ([
					(status === "active" || status === "acknowledged") && "acknowledge",
					status !== "escalated" && escalationTargets.length && "escalate",
					"resolve",
					// An AI recommendation is resolved when it was right and it's handled, declined when it was wrong.
					ai && "decline",
				].filter(Boolean) as AlertDetailAction[])
			: []);
	const alertActions = onAction ? shownActions : [];
	// Escalate, Mark as resolved and Decline open their form under the buttons, one at a time; sending it closes it.
	const [form, setForm] = React.useState<"escalate" | "resolve" | "decline" | null>(null);
	// Four buttons don't fit at equal widths: each takes its label's width and they share what's left, and Mark as
	// resolved shortens to Resolve (the triage queue's word).
	const crowded = alertActions.length > 3;
	const act = (action: TriageAlertAction) => {
		setForm(null);
		onAction?.(action);
	};
	const { prefersReducedMotion } = useMotionPreference();
	// Who did what, and when, as in the triage queue ("Acknowledged by you · 1:42 AM").
	const state = stateLine(alert, escalationTargets);
	// An open dose edit or decline in the pathway takes Escape before the modal does.
	const pathwayEscape = React.useRef<(() => boolean) | null>(null);

	return (
		<Dialog open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton={false}
				onEscapeKeyDown={(event) => {
					// An open form takes Escape first: it closes, the modal stays.
					if (form) {
						setForm(null);
						event.preventDefault();
					} else if (pathwayEscape.current?.()) event.preventDefault();
				}}
				// When it grows tall it keeps 80px from the viewport's top and bottom edges (user's call, Nov 2, 2026).
				className='max-h-[calc(100dvh-160px)] w-[1400px] flex-row'
			>
				{/* Each column is raised over the one to its right, so its shadow falls on it. */}
				<div className='relative z-20 flex min-w-0 flex-1 flex-col bg-background shadow-[0_0_50px_-12px_var(--shadow-color-lg)]'>
					<div className='flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 pt-6 pb-5'>
						<div className='flex flex-col gap-2 pr-10'>
							<div className='flex items-center gap-1.5'>
								<Avatar aria-hidden='true' className='size-12'>
									{patient.photo ? <AvatarImage src={patient.photo} alt='' /> : null}
									<AvatarFallback tone={patient.tone} className='text-base font-bold'>
										{patient.initials}
									</AvatarFallback>
								</Avatar>
								<div className='min-w-0'>
									<p className='truncate font-display text-2xl font-bold text-foreground'>{name}</p>
									{identity ? <p className='truncate text-sm text-muted-foreground'>{identity}</p> : null}
								</div>
							</div>
							{location ? (
								<p className='flex items-center gap-1 text-sm font-medium text-foreground'>
									<MapPinIcon aria-hidden='true' className='size-4 shrink-0 text-icon-muted' />
									<span className='truncate'>{location}</span>
								</p>
							) : null}
						</div>

						<section aria-label='Alert' className={cn("flex shrink-0 flex-col gap-2 overflow-hidden rounded-xl", tones.panel)}>
							<AlertBar
								alert={{
									variant: status === "resolved" ? "resolved" : alert.severity,
									inLast24h: data.inLast24h,
									since: status === "resolved" ? alert.addressed?.at : alert.firedAt,
								}}
								size='md'
								className='rounded-none'
							/>
							<div className='flex flex-col gap-2 px-4 pb-2.5'>
								<div>
									<DialogTitle className={cn("pr-0 text-xl font-bold", tones.title)}>{heading}</DialogTitle>
									{supporting ? (
										<DialogDescription className={cn("text-base", tones.title)}>{supporting}</DialogDescription>
									) : null}
								</div>
								<div className='flex flex-col gap-0.5'>
									<SourceLabel className={cn("gap-1.5 text-sm", tones.source)}>
										Source: {sourceLabels[alert.source.kind]} · {alert.source.name}
									</SourceLabel>
									{/* Appears once the alert is addressed (Reveal), e.g. right after Acknowledge. It reads like the source
									    line: the same size, weight and icon. */}
									<AnimatePresence initial={false}>
										{state ? (
											<motion.div
												key={state.text}
												role='status'
												variants={prefersReducedMotion ? fadeVariants : revealVariants}
												initial='initial'
												animate='animate'
												exit='exit'
												className='text-sm text-foreground'
											>
												<p className='flex items-center gap-1.5'>
													<state.icon aria-hidden='true' className='size-3 shrink-0' />
													{state.text}
												</p>
												{/* The note left with the action, under the line and aligned with its words. */}
												{alert.addressed?.note ? (
													<p className='pl-4.5'>
														<span className='text-muted-foreground'>Note: </span>
														{alert.addressed.note}
													</p>
												) : null}
											</motion.div>
										) : null}
									</AnimatePresence>
								</div>
								{alertActions.length ? (
									<div className='flex gap-2'>
										{alertActions.map((action) => {
											const { icon: Icon } = actions[action];
											const label = action === "resolve" && crowded ? "Resolve" : actions[action].label;
											const opensForm = action !== "acknowledge";
											// Acknowledge confirms in place: the check swaps in, the label bumps (Confirm), and the button
											// stays, pressed, so its neighbors don't move. Clicking Acknowledged again undoes it.
											const done = action === "acknowledge" && status === "acknowledged";
											return (
												<Button
													key={action}
													variant='outline'
													size='sm'
													aria-pressed={opensForm ? undefined : done}
													aria-expanded={opensForm ? form === action : undefined}
													title={done ? "Undo acknowledge" : undefined}
													onClick={() =>
														opensForm
															? setForm((current) => (current === action ? null : action))
															: act({ type: done ? "unacknowledge" : "acknowledge" })
													}
													className={cn(crowded ? "flex-auto" : "flex-1", "aria-expanded:bg-accent")}
												>
													<AnimatePresence mode='popLayout' initial={false}>
														<motion.span
															key={done ? "done" : "icon"}
															variants={prefersReducedMotion ? iconSwapReducedVariants : iconSwapVariants}
															initial='hidden'
															animate='shown'
															exit='hidden'
															className='flex'
														>
															{done ? <CheckIcon className='text-success' /> : <Icon />}
														</motion.span>
													</AnimatePresence>
													<motion.span key={done ? "done" : "label"} {...(done && !prefersReducedMotion ? confirmPattern : {})}>
														{done ? "Acknowledged" : label}
													</motion.span>
												</Button>
											);
										})}
									</div>
								) : null}
								<AnimatePresence initial={false}>
									{form === "resolve" || form === "decline" ? (
										<ResolveForm key={form} alert={alert} kind={form} onAction={act} onCancel={() => setForm(null)} />
									) : form === "escalate" ? (
										<EscalateForm
											key='escalate'
											targets={escalationTargets}
											onAction={act}
											onCancel={() => setForm(null)}
										/>
									) : null}
								</AnimatePresence>
							</div>
						</section>

						{/* Its own block, as in the card, so the score sits between two rules. */}
						{data.acuity || data.trajectory ? (
							<div className='flex flex-col'>
								<PatientCardScore acuity={data.acuity} trajectory={data.trajectory} />
							</div>
						) : null}
						{data.monitor ? <PatientMonitor aria-label={`${name}'s monitor`} className='shrink-0' {...data.monitor} /> : null}
						{data.tags ? (
							<>
								<hr className='border-border' />
								<PatientCardTags tags={data.tags} name={name} />
							</>
						) : null}
					</div>

					<footer className='flex shrink-0 gap-2 border-t border-border px-6 py-4'>
						{onOpenPatient ? (
							<Button variant='neutral' size='md' onClick={onOpenPatient} className='flex-1'>
								<CircleUserIcon />
								Open patient
							</Button>
						) : null}
						{/* Calls the bedside nurse, by first name and role so it's clear who picks up; while the call is on, ends it (the call's
						own End does too). */}
						{consult === "idle" ? (
							<Button variant='neutral' size='md' onClick={() => setConsult("connecting")} className='flex-1'>
								<VideoIcon />
								{data.bedside ? `Video call ${data.bedside.name.split(" ")[0]}, ${data.bedside.role}` : "Video call bedside"}
							</Button>
						) : consult === "connecting" ? (
							<Button variant='neutral' size='md' disabled className='flex-1'>
								<LoaderCircleIcon className='animate-spin motion-reduce:animate-none' />
								Calling…
							</Button>
						) : (
							// Ending the call reads as stopping something: the destructive tone, flat.
							<Button
								variant='neutral'
								size='md'
								onClick={() => setConsult("idle")}
								className='flex-1 bg-destructive-subtle text-destructive hover:bg-destructive-muted'
							>
								<VideoOffIcon />
								End call
							</Button>
						)}
					</footer>

					{/* The column scrolls under it, so it keeps the background. */}
					<DialogClose asChild>
						<Button
							variant='ghost'
							size='icon-sm'
							aria-label='Close'
							className='absolute top-5 right-5 rounded-button-md bg-background'
						>
							<XIcon />
						</Button>
					</DialogClose>
				</div>

				<div className='relative z-10 flex w-[400px] shrink-0 flex-col bg-background shadow-2xl'>
					<section
						aria-labelledby='alert-modal-clinical-info'
						className={cn(
							"flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6",
							// While the call is on, room under the last line so it can scroll clear of the call (248px, 16px from the
							// bottom, 16px above it).
							consult !== "idle" && "pb-70",
						)}
					>
						<ColumnLabel id='alert-modal-clinical-info'>Clinical info</ColumnLabel>
						<KeyFindings data={data} />
						<hr className='border-border' />
						<HistoryAndLabs data={data} />
					</section>
					<AnimatePresence initial={false}>
						{consult !== "idle" ? (
							<ConsultReveal key='consult'>
								<ConsultTile data={data} state={consult} onEnd={() => setConsult("idle")} />
							</ConsultReveal>
						) : null}
					</AnimatePresence>
				</div>

				<section
					aria-labelledby='alert-modal-pathway'
					className='flex w-[400px] shrink-0 flex-col gap-4 overflow-y-auto bg-background px-6 pt-6 pb-4'
				>
					<ColumnLabel id='alert-modal-pathway'>Pathway</ColumnLabel>
					{data.pathway ? (
						<CarePathwayPanel
							pathway={data.pathway}
							onDecision={onPathwayDecision}
							escapeRef={pathwayEscape}
							className='flex-1'
						/>
					) : (
						<p className='text-sm text-muted-foreground'>No care pathway suggested for this alert.</p>
					)}
				</section>
			</DialogContent>
		</Dialog>
	);
}

/* -------------------------------------------------------------------------- */
/* In the shell                                                               */
/* -------------------------------------------------------------------------- */

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The detail for an opened alert: by its id, or, from a card's bar (no id), the patient's alert the bar shows: their
 * highest-priority open alert, else their latest.
 */
function pickAlertDetail(details: AlertDetailData[], alerts: TriageAlert[], { patientId, alertId }: OpenAlert) {
	const id =
		alertId ??
		[...alerts.filter((alert) => alert.patientId === patientId)].sort(
			(a, b) => Number(isOpenAlert(b)) - Number(isOpenAlert(a)) || compareTriageAlerts(a, b),
		)[0]?.id;
	return details.find((detail) => detail.alert.id === id);
}

/**
 * The shell's `renderAlert` for a layout (Census, Monitoring): the alert modal for the opened alert, with its live state
 * and the patient's alerts in the last 24 h from `alerts`. Acknowledge shows while the alert is open and unaddressed, and
 * closes the modal after; Escalate and Resolve need the queue's reason and note, not built here yet. An alert without a
 * detail renders nothing, and the shell opens the patient instead.
 */
function alertModalRenderer({
	details,
	alerts,
	escalationTargets,
	onAlertAction,
}: {
	details: AlertDetailData[];
	alerts: TriageAlert[];
	escalationTargets?: EscalationTarget[];
	onAlertAction: (alertId: string, action: TriageAlertAction) => void;
}) {
	return (target: OpenAlert, { open, onOpenChange, openPatient }: AlertControls) => {
		const detail = pickAlertDetail(details, alerts, target);
		if (!detail) return null;
		// An alert that left the page's alerts (the feed resolved it) opens as resolved.
		const alert: TriageAlert = alerts.find((item) => item.id === detail.alert.id) ?? { ...detail.alert, status: "resolved" };
		const gone = !alerts.some((item) => item.id === alert.id);
		// The resolved alert that left the list still counts.
		const inLast24h =
			alerts.filter((item) => item.patientId === alert.patientId && Date.now() - Date.parse(item.firedAt) < DAY_MS)
				.length + (gone && Date.now() - Date.parse(alert.firedAt) < DAY_MS ? 1 : 0);
		return (
			<AlertDetailModal
				data={{ ...detail, alert, inLast24h: detail.inLast24h ?? inLast24h }}
				defaultConsult={target.consult ? "connecting" : "idle"}
				open={open}
				onOpenChange={onOpenChange}
				onOpenPatient={openPatient}
				escalationTargets={escalationTargets}
				onAction={(action) => {
					onAlertAction(alert.id, action);
					// Acknowledging (or undoing it) keeps the modal open, confirmed in place: the clinician often goes on to the
					// consult or the pathway. Escalating or resolving hands the alert on, so the modal closes.
					if (action.type !== "acknowledge" && action.type !== "unacknowledge") onOpenChange(false);
				}}
			/>
		);
	};
}

export {
	AlertDetailModal,
	alertModalRenderer,
	type AlertConsultState,
	type AlertDetailAction,
	type AlertDetailBedside,
	type AlertDetailData,
	type AlertDetailFact,
	type AlertDetailModalProps,
	type AlertDetailPatient,
	type AlertDetailReason,
};
