import * as React from "react";
import { createPortal } from "react-dom";
import {
	ArrowUpFromLineIcon,
	CheckCheckIcon,
	CheckIcon,
	CircleStopIcon,
	GitForkIcon,
	LoaderCircleIcon,
	type LucideIcon,
	MessageCircleMoreIcon,
	MicIcon,
	MicOffIcon,
	PencilLineIcon,
	PhoneOffIcon,
	PlayIcon,
	ScanEyeIcon,
	SparklesIcon,
	Undo2Icon,
	VideoIcon,
	VideoOffIcon,
	XIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@/components/buttons/button";
import type { PatientCardTag, PatientCensusCardProps } from "@/components/cards/patient-census-card";
import type { PatientMonitorProps } from "@/components/cards/patient-monitoring-card";
import {
	Avatar,
	AvatarBadge,
	AvatarFallback,
	AvatarImage,
	type AvatarFallbackProps,
} from "@/components/data-display/avatar";
import { EmptyState } from "@/components/feedback/empty-state";
import { Textarea } from "@/components/forms/textarea";
import { AlertExpanded, AlertExpandedClose } from "@/components/overlays/alert-expanded";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/overlays/dialog";
import { useCurrentMinute } from "@/lib/hooks/use-current-minute";
import { useCurrentSecond } from "@/lib/hooks/use-current-second";
import {
	confirmPattern,
	fadeVariants,
	iconSwapReducedVariants,
	iconSwapVariants,
	liveDotVariants,
	motionDuration,
	revealVariants,
	scrollIntoViewSmoothly,
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
} from "../monitoring/triage-queue";
import { CarePlanCard, type PatientCarePlan } from "../patient-details/activity";
import type { PatientRecord } from "../patient-details/patient-details";
import { RoomScene, RoomVideo, type RoomEquipment } from "../patient-details/sections/camera-section";
import { withFlagDetails } from "../shared/flag-details";
import {
	CarePathwayPanel,
	Expand,
	pathwaySessionKey,
	type CarePathway,
	type CarePathwayDecision,
	type CarePathwayRecord,
	type CarePathwayStatus,
} from "./care-pathway";
import { useCallAudio } from "./call-audio";
import { ConsultSessionScope, useSessionState } from "./consult-session";
import { ConsultTranscriptView, type ConsultNote, type ConsultTranscript } from "./consult-transcript";
import { BedsideTaskList, type BedsideTasks } from "./bedside-tasks";
import { DischargePlanPanel, type DischargeDecision, type DischargePlan } from "./discharge-plan";
import {
	ConsultField,
	ConsultMessages,
	ConsultMessagesButton,
	useConsultMessages,
	useNewIncoming,
	useUnreadMessages,
	type ConsultMessage,
	type ConsultReplies,
} from "./consult-messages";
import { InterpreterPrompt, type ConsultInterpreter } from "./interpreter";
import { KeepOrTransferPanel, type KeepOrTransfer, type KeepOrTransferDecision } from "./keep-or-transfer";
import {
	defaultVitalsEvery,
	LowBandwidthBanner,
	MonitorHeldLine,
	useHeldValue,
	type ConsultConnection,
} from "./low-bandwidth";
import { DkaProtocolPanel, type DkaProtocol } from "./dka-protocol";
import { SepsisBundlePanel, type BundleDecision, type SepsisBundle } from "./sepsis-bundle";

// The alert modal that a Monitoring card's alert bar and an alert toast's maximize button open (DESIGN.md "Alert
// modal"). Scenario 1, steps 2 to 4. Left, what's happening: the alert, the patient's score, monitor and score inputs,
// the key clinical findings behind the alert and the history and labs the intensivist needs. Right, what to do about it:
// a one-click video consult to the bedside, step 4's care pathway (`care-pathway.tsx`) and, once its orders are sent,
// step 5's keep or transfer (`keep-or-transfer.tsx`), both explorations. Scenario 3 adds the hour-1 sepsis bundle
// (`sepsis-bundle.tsx`) before the pathway, the bedside tasks its orders generate (`bedside-tasks.tsx`) and the interpreter
// prompt in the call (`interpreter.tsx`). Scenario 4 adds the DKA protocol's hourly checklist (`dka-protocol.tsx`) under
// the pathway that starts it.

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
	/**
	 * The patient's preferred language when it isn't English, e.g. "Spanish": the video consult offers a medical
	 * interpreter (Scenario 3, step 2).
	 */
	preferredLanguage?: string;
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
	monitor?: Pick<PatientMonitorProps, "vitals" | "limits" | "alarmPriorities" | "acknowledgedAlarms" | "trends">;
	/** The reason line, phrase by phrase. */
	reasons: AlertDetailReason[];
	/** The patient's tags, as on their card. Without them there's no tag row; `[]` says "No tags". */
	tags?: PatientCardTag[];
	/**
	 * The flag that holds the key findings in the alert panel's tag row, named for what the alert says, e.g. "CHF
	 * exacerbation". Without it, the alert's title ("Sepsis candidate").
	 */
	flag?: string;
	/** History and labs, for the consult. */
	history: AlertDetailFact[];
	bedside?: AlertDetailBedside;
	/**
	 * Who the AI Notetaker records besides the clinician, and whether each approves on their own (a standing consent on
	 * file): the others get a request and recording waits for their approval. Without it, the bedside nurse, who
	 * approves each time.
	 */
	notetakerParties?: { name: string; autoApprove: boolean }[];
	/**
	 * What the AI Notetaker hears from the call, as speech recognition writes it: it streams in while the notetaker
	 * records (`consult-transcript.tsx`). The prototype's is sample data; the clinician's own words are added from their
	 * microphone either way.
	 */
	transcript?: ConsultTranscript;
	/** The room's equipment, for the drawn camera feed. */
	room?: RoomEquipment;
	/** The room's camera, a video URL for the consult. Without it, or if it can't load, the consult draws the room. */
	video?: string;
	/**
	 * The consult's connection to the hospital. In low-bandwidth mode the call is audio only, the monitor's numbers are
	 * held and refreshed every few seconds, and the bedside's photos show under the call (Scenario 2, step 2).
	 */
	connection?: ConsultConnection;
	/**
	 * The consult's thread with the bedside nurse, oldest first (their hospital's messaging, bridged): the Video consult
	 * panel's Messages opens it in the third column. Without it, the thread starts empty.
	 */
	messages?: ConsultMessage[];
	/**
	 * The prototype's simulated replies from the bedside, the nurse typing first (simulator US7.2): a list, one for each
	 * message the clinician sends in order, or a function that answers each from what it says. The app leaves it out;
	 * real replies come in `messages`.
	 */
	scriptedReplies?: ConsultReplies;
	/**
	 * Who the hospital's interpreter service sends when the clinician adds one to the call, for a patient with a
	 * `preferredLanguage` (Scenario 3, step 2; mock).
	 */
	interpreter?: ConsultInterpreter;
	/**
	 * The hour-1 sepsis bundle, element by element, with its timer from time zero (Scenario 3; exploration). It leads the
	 * Pathway panel, which opens with the alert.
	 */
	bundle?: SepsisBundle;
	/** A suggested care pathway and its order set, e.g. Scenario 1's CHF exacerbation pathway (exploration). */
	pathway?: CarePathway;
	/** Where the pathway is when the modal opens, e.g. `active` once its orders were co-signed. Suggested by default. */
	pathwayStatus?: CarePathwayStatus;
	/**
	 * What was decided about the pathway, as the app recorded it: when it was sent and co-signed, the note, a decline's
	 * reason, the edited doses and whether it's the intensivist's own. The Pathway panel starts from it, so a reopened
	 * alert or the patient's page shows the pathway as it was left.
	 */
	pathwayRecord?: CarePathwayRecord;
	/**
	 * The bedside nurses' tasks from the pathway's orders, shared with them (Scenario 3, step 5; exploration). Shows under
	 * the pathway once its orders are sent.
	 */
	tasks?: BedsideTasks;
	/**
	 * A protocol the pathway's orders start, run at the bedside hour by hour (Scenario 4's DKA insulin protocol;
	 * exploration). Shows under the pathway, and the column brings it into view as it arrives.
	 */
	protocol?: DkaProtocol;
	/**
	 * Keep or transfer, for a hospital that may not be able to hold the patient (Scenario 1, step 5; exploration). It
	 * shows under the pathway once its orders are sent, or at once when a decision was already made.
	 */
	transfer?: KeepOrTransfer;
	/**
	 * Social needs at discharge (Scenario 2, step 6; exploration): the needs the discharge workflow flagged and its
	 * referrals. Shows under keep or transfer once the patient is kept; the patient's page shows the same.
	 */
	discharge?: DischargePlan;
};

/**
 * A patient's video consult without an alert (Nov 4, 2026, user's call): a card's Video consult when the patient has no
 * open alert. Who they are, their score, monitor and tags, and who the call reaches, as an alert's detail has them.
 */
type PatientConsultData = Pick<
	AlertDetailData,
	"patient" | "acuity" | "trajectory" | "monitor" | "tags" | "bedside" | "notetakerParties" | "transcript" | "room" | "video" | "connection" | "messages" | "scriptedReplies" | "interpreter"
> & {
	patientId: string;
};

/** What the call and its notetaker read: the patient and who the call reaches, and the alert when there is one. */
type ConsultData = Pick<
	AlertDetailData,
	"patient" | "bedside" | "notetakerParties" | "transcript" | "room" | "video" | "connection" | "monitor" | "interpreter"
> &
	Partial<Pick<AlertDetailData, "alert" | "reasons" | "pathway">>;

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
	/** The clinician approved the AI Notetaker's draft of the consult (the alert panel's Video consult). */
	onConsultNote?: (note: string) => void;
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
	/** The intensivist decided to keep or transfer the patient, or took the decision back. */
	onTransferDecision?: (decision: KeepOrTransferDecision) => void;
	/** A discharge referral sent (with who agreed to it) or skipped, or a skip taken back. */
	onDischargeDecision?: (decision: DischargeDecision) => void;
	/** A sepsis bundle element's check confirmed (a renal dose review), or taken back. */
	onBundleDecision?: (decision: BundleDecision) => void;
};

/* -------------------------------------------------------------------------- */
/* Product content                                                            */
/* -------------------------------------------------------------------------- */

// Stands in for the call ringing at the bedside, so the prototype shows Calling: long enough to read as the nurse
// picking up (4.5 s; Nov 3, 2026, user's call, it was 1.2 s).
const CONNECT_DELAY_MS = 4500;

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
	// Resolve, the triage queue's word; its form sends with Mark as resolved (Nov 3, 2026, user's call).
	resolve: { label: "Resolve", icon: CheckCheckIcon },
	// An AI recommendation can also be marked wrong (the decline outcome BR-07 records): the clinician's verdict, said
	// plainly, so it reads as feedback on the AI rather than turning the alert down.
	decline: { label: "Feedback", icon: Undo2Icon },
};

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
	// Sticks to the top of its column as the column scrolls, on the column's background. It takes over the column's top
	// padding (24px) and the 16px gap under it, so the label keeps its space above and below, at rest and stuck. Sticky
	// offsets count from inside the column's padding, hence `-top-6`.
	return (
		<h2
			id={id}
			className='sticky -top-6 z-10 -mx-6 -mt-6 -mb-4 bg-background px-6 pt-6 pb-4 text-xs font-medium tracking-[0.04em] text-muted-foreground uppercase'
		>
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
 * The alert's key findings as a flag, first in the alert panel's tag row (Nov 3, 2026, user's calls): named for what the
 * alert says (`flag`, else its title: "Sepsis candidate", not "Sepsis", since a flag reads as a fact about the patient and
 * the alert may be wrong). Its popover lists the reason line's phrases with their numbers, or the alert's own evidence,
 * under its recommendation, with its source. Only while the alert is open; none without findings. The patient's
 * Monitoring card shows it too (`withAlertFlags`).
 */
/**
 * An evidence line as a popover line: what it's about (the words before its first number, "Lactate") as the term, the
 * reading after it, so the term reads semibold. A line without a number stays whole.
 */
function evidenceItem(line: string) {
	const match = /^(\D+?)\s+(?=[\d<>≥≤−+-])(.*)$/.exec(line);
	return match ? { term: match[1], label: match[2] } : { label: line };
}

function findingsFlag(data: AlertDetailData): PatientCardTag | undefined {
	const { alert, reasons } = data;
	const evidence = alert.evidence ?? [];
	if (!isOpenAlert(alert) || (!reasons.length && !evidence.length && !alert.recommendation)) return undefined;
	return {
		label: data.flag ?? alert.title,
		details: {
			description: alert.recommendation,
			// One line each: the popover sets a value apart on the right, which suits a reading, not a sentence.
			items: reasons.length
				? reasons.map((reason) => ({
						term: `${reason.label}:`,
						label: `${reason.lead ? `${reason.lead}, ` : ""}${reason.detail}`,
					}))
				: evidence.map(evidenceItem),
			source: `${sourceLabels[alert.source.kind]} · ${alert.source.name}`,
			updatedAt: alert.firedAt,
		},
	};
}

/**
 * The patients with each open alert's flag first in their tags, for their Monitoring cards (Nov 3, 2026, user's call:
 * the flag shows on the card as well as in the alert panel): from the alert's detail with its live state, the patient's
 * highest-priority alert first, one flag per name. A patient without one keeps their tags as they are.
 */
function withAlertFlags<Patient extends { id: string; tags?: PatientCardTag[] }>(
	patients: Patient[],
	alerts: TriageAlert[],
	details: AlertDetailData[] = [],
): Patient[] {
	return patients.map((patient) => {
		const flags = alerts
			.filter((alert) => alert.patientId === patient.id && isOpenAlert(alert))
			.sort(compareTriageAlerts)
			.flatMap((alert) => {
				const detail = details.find((item) => item.alert.id === alert.id);
				const flag = detail && findingsFlag({ ...detail, alert });
				return flag ? [flag] : [];
			})
			.filter((flag, index, all) => all.findIndex((other) => other.label === flag.label) === index);
		return flags.length ? { ...patient, tags: [...flags, ...(patient.tags ?? [])] } : patient;
	});
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
 * The clinician's own camera, as the bedside sees them (Nov 5, 2026, user's call: "Active computer's camera"): the
 * computer's camera, mirrored, in a small picture in the call's top right, 12px from its edges, fading in. It turns the
 * camera on as it mounts and off again (the device's light too) as it leaves: the clinician turns their camera off (the
 * box goes), the call goes audio only or ends. With no camera or no permission the box says so; the call goes on.
 */
function SelfView() {
	const video = React.useRef<HTMLVideoElement>(null);
	const [status, setStatus] = React.useState<"starting" | "on" | "unavailable">("starting");
	React.useEffect(() => {
		if (!navigator.mediaDevices?.getUserMedia) {
			setStatus("unavailable");
			return;
		}
		const element = video.current;
		let stream: MediaStream | null = null;
		let cancelled = false;
		navigator.mediaDevices
			.getUserMedia({ video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: "user" }, audio: false })
			.then((started) => {
				if (cancelled) {
					started.getTracks().forEach((track) => track.stop());
					return;
				}
				stream = started;
				if (element) element.srcObject = started;
				setStatus("on");
			})
			.catch(() => {
				if (!cancelled) setStatus("unavailable");
			});
		return () => {
			cancelled = true;
			stream?.getTracks().forEach((track) => track.stop());
			if (element) element.srcObject = null;
		};
	}, []);
	const showing = status === "on";
	return (
		<motion.div
			variants={fadeVariants}
			initial='initial'
			animate='animate'
			exit='exit'
			role='img'
			aria-label={status === "unavailable" ? "Your camera isn't available" : "Your camera"}
			// A quarter of the call's width, 3:2, on the call's dark overlay until the picture comes.
			className='absolute top-3 right-3 aspect-[3/2] w-1/4 overflow-hidden rounded-lg border-2 border-(--white) bg-(--gray-950)/70'
		>
			<video
				ref={video}
				autoPlay
				muted
				playsInline
				className={cn("size-full -scale-x-100 object-cover", !showing && "invisible")}
			/>
			{showing ? null : (
				<span className='absolute inset-0 flex items-center justify-center text-(--gray-200)'>
					{status === "unavailable" ? (
						<VideoOffIcon aria-hidden='true' className='size-4' />
					) : (
						<LoaderCircleIcon aria-hidden='true' className='size-4 animate-spin motion-reduce:animate-none' />
					)}
				</span>
			)}
		</motion.div>
	);
}

// When the connection drops, the video freezes this long, saying it's switching, before the call goes audio only.
const FREEZE_MS = 2500;

/**
 * The video consult, once the footer's Video consult button calls the bedside nurse: ringing, then the room's camera.
 * Dark in both themes, as the camera feed is; the live view fades in over the ringing one (`fadeVariants`), so the tile
 * never changes size. In low-bandwidth mode (`data.connection`) the picture freezes, greyed, with "Switching to audio
 * only…", then the call goes on as audio: the nurse, the timer and the same controls.
 */
function ConsultTile({
	data,
	state,
	onEnd,
	onStart,
	onMutedChange,
}: {
	data: ConsultData;
	state: AlertConsultState;
	onEnd: () => void;
	/**
	 * The tile runs the call itself (a consult with no alert, Nov 4, 2026, user's call): Cancel while it rings, and once
	 * it's ended the nurse with Video consult to call again. Without it, the button under the alert runs the call and the
	 * tile shows only while it's on.
	 */
	onStart?: () => void;
	/** The clinician muted or unmuted their microphone: the notetaker stops or starts transcribing them. */
	onMutedChange?: (muted: boolean) => void;
}) {
	const { bedside, patient, room, video, connection } = data;
	const now = useCurrentSecond();
	const lowBandwidth = connection?.mode === "low-bandwidth";
	// The freeze: from when the mode started, for `FREEZE_MS`. A call that starts in low-bandwidth mode is audio at once.
	// Worked out as the tile renders, so the render where the connection drops is already frozen: set from an effect, it
	// came a render late and the audio-only view flashed for a frame before the freeze. The timer only re-renders the
	// tile when the freeze is over.
	const since = connection?.since ? Date.parse(connection.since) : null;
	const freezeLeft = lowBandwidth && since !== null ? FREEZE_MS - (Date.now() - since) : 0;
	const freezing = freezeLeft > 0;
	const [, setFreezeOver] = React.useState(0);
	React.useEffect(() => {
		if (!lowBandwidth || since === null) return;
		const left = FREEZE_MS - (Date.now() - since);
		if (left <= 0) return;
		const timer = window.setTimeout(() => setFreezeOver((count) => count + 1), left);
		return () => window.clearTimeout(timer);
	}, [lowBandwidth, since]);
	const audioOnly = state === "live" && lowBandwidth && !freezing;
	// Kept in the patient's consult session, so the call goes on where the patient is shown next: its timer, mute, camera.
	const [startedAt, setStartedAt] = useSessionState<number | null>("callStartedAt", null);
	const [muted, setMuted] = useSessionState("callMuted", false);
	const mutedChange = React.useRef(onMutedChange);
	mutedChange.current = onMutedChange;
	React.useEffect(() => mutedChange.current?.(muted), [muted]);
	// The clinician's own camera, which the bedside sees (Nov 4, 2026, user's call). Audio only, it's off for everyone.
	const [cameraOff, setCameraOff] = useSessionState("callCameraOff", false);
	// The call's sound: ringback, the join and end chimes, the room (the monitor at the patient's heart rate, the BiPAP), the
	// drop and the phone-line band while audio only (Nov 4, 2026, user's call). Mute silences it.
	const vitals = data.monitor?.vitals;
	useCallAudio({
		state,
		freezing: state === "live" && freezing,
		audioOnly,
		heartRate: vitals?.hr,
		spo2: vitals?.spo2,
		respiratoryRate: vitals?.rr,
		muted,
	});
	React.useEffect(() => {
		if (state === "live") setStartedAt((current) => current ?? Date.now());
		else setStartedAt(null);
		// Each call starts with the camera and the sound on.
		if (state === "idle") {
			setCameraOff(false);
			setMuted(false);
		}
	}, [state]);
	const elapsed = startedAt !== null && now !== null ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;
	const who = bedside ? `${bedside.name}, ${bedside.role}` : "the bedside";
	// The nurse, as the call shows them before they've joined: avatar, name, presence and where they are.
	const nurse = bedside ? (
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
	) : null;
	// The call's top row, on video or audio: the Live dot with how long it's been on, then the bed beside it on the left
	// (Nov 5, 2026, user's call: the top right holds the clinician's own camera).
	const callTop = (label: string) => (
		<div className='absolute top-3 left-3 flex items-center gap-2 text-xs font-medium'>
			<span className='flex items-center gap-1.5 rounded-full bg-(--gray-950)/70 px-2.5 py-1'>
				<LiveDot />
				{label} · <time className='tabular-nums'>{formatElapsed(elapsed)}</time>
			</span>
			{patient.bed ? <span className='rounded-full bg-(--gray-950)/70 px-2.5 py-1'>{patient.bed}</span> : null}
		</div>
	);
	// A control that's off (camera or mic) reverses (Nov 5, 2026, user's call): a white icon on the call's dark overlay, as
	// the nurse's name label, so off reads at a glance against the white circles that are on. Disabled too (audio only).
	const offControl =
		"data-off:bg-(--gray-950)/70 data-off:text-(--white) data-off:hover:bg-(--gray-950)/85 data-off:disabled:bg-(--gray-950)/70 data-off:disabled:text-(--white)/70";
	const callControls = (
		<div className='flex gap-2'>
			<Button
				variant='circle'
				size='icon-md'
				aria-label={audioOnly ? "Camera off for low bandwidth" : cameraOff ? "Turn on camera" : "Turn off camera"}
				aria-pressed={audioOnly ? undefined : cameraOff}
				data-off={audioOnly || cameraOff || undefined}
				className={offControl}
				disabled={audioOnly}
				onClick={() => setCameraOff((current) => !current)}
			>
				{audioOnly || cameraOff ? <VideoOffIcon /> : <VideoIcon />}
			</Button>
			<Button
				variant='circle'
				size='icon-md'
				aria-label={muted ? "Unmute" : "Mute"}
				aria-pressed={muted}
				data-off={muted || undefined}
				className={offControl}
				onClick={() => setMuted((current) => !current)}
			>
				{muted ? <MicOffIcon /> : <MicIcon />}
			</Button>
			<Button variant='destructive' size='md' onClick={onEnd} className='rounded-full'>
				<PhoneOffIcon />
				End
			</Button>
		</div>
	);

	return (
		<section
			aria-label='Video consult'
			// Figma's 352 × 248 at any width: 248px tall in the modal's 352px, 270px in AlertExpanded's 384px panel.
			className='relative aspect-[352/248] w-full shrink-0 overflow-hidden rounded-card bg-(--gray-900)'
		>
			<AnimatePresence initial={false}>
				{state === "idle" ? (
					<motion.div
						key='idle'
						variants={fadeVariants}
						initial='initial'
						animate='animate'
						exit='exit'
						className='absolute inset-0 flex flex-col items-center justify-center gap-3 bg-(--gray-900) p-4 text-center text-(--gray-50)'
					>
						{nurse}
						<p role='status' className='text-sm text-(--gray-200)'>
							Call ended
						</p>
						{onStart ? (
							<Button variant='circle' size='md' onClick={onStart}>
								<VideoIcon />
								Video consult
							</Button>
						) : null}
					</motion.div>
				) : state === "connecting" ? (
					<motion.div
						key='connecting'
						variants={fadeVariants}
						initial='initial'
						animate='animate'
						exit='exit'
						className='absolute inset-0 flex flex-col items-center justify-center gap-3 bg-(--gray-900) p-4 text-center text-(--gray-50)'
					>
						{nurse}
						<p role='status' className='flex items-center gap-2 text-sm text-(--gray-200)'>
							<LoaderCircleIcon aria-hidden='true' className='size-4 animate-spin motion-reduce:animate-none' />
							Calling {bedside?.name ?? "the bedside"}…
						</p>
						{onStart ? (
							<Button variant='destructive' size='md' onClick={onEnd} className='rounded-full'>
								<PhoneOffIcon />
								Cancel
							</Button>
						) : null}
					</motion.div>
				) : audioOnly ? (
					<motion.div
						key='audio'
						variants={fadeVariants}
						initial='initial'
						animate='animate'
						exit='exit'
						className='absolute inset-0 flex flex-col items-center justify-center gap-3 bg-(--gray-900) p-4 pb-14 text-center text-(--gray-50)'
					>
						{callTop("Audio only")}
						{nurse}
						<p className='flex items-center gap-1.5 text-sm text-(--gray-200)'>
							<VideoOffIcon aria-hidden='true' className='size-4' />
							Video paused for low bandwidth
						</p>
						<div className='absolute inset-x-3 bottom-3 flex justify-end'>{callControls}</div>
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
								<RoomVideo
									src={video}
									fallback={<RoomScene preset='bed' equipment={room ?? { airway: "oxygen", pumps: 1 }} />}
								/>
							) : (
								<RoomScene preset='bed' equipment={room ?? { airway: "oxygen", pumps: 1 }} />
							)}
						</div>
						{/* The connection dropping: the picture holds, greyed, while the call switches to audio. */}
						<AnimatePresence>
							{freezing ? (
								<motion.div
									key='freezing'
									variants={fadeVariants}
									initial='initial'
									animate='animate'
									exit='exit'
									role='status'
									className='absolute inset-0 flex flex-col items-center justify-center gap-2 bg-(--gray-950)/60 text-sm font-medium backdrop-grayscale'
								>
									<LoaderCircleIcon aria-hidden='true' className='size-5 animate-spin motion-reduce:animate-none' />
									Connection weak · switching to audio only…
								</motion.div>
							) : null}
						</AnimatePresence>
						{callTop("Live")}
						{/* Turned off, the box leaves (Nov 5, 2026, user's call: "If user turn off camera, remove frame"), fading. */}
						<AnimatePresence>{cameraOff ? null : <SelfView key='self' />}</AnimatePresence>
						<div className='absolute inset-x-3 bottom-3 flex items-end justify-between gap-2'>
							{bedside ? (
								<span className='flex items-center gap-2 rounded-full bg-(--gray-950)/70 py-1 pr-3 pl-1 text-xs font-medium'>
									<Avatar size='xs'>
										{bedside.src ? <AvatarImage src={bedside.src} alt='' /> : null}
										<AvatarFallback tone={bedside.tone}>{bedside.initials}</AvatarFallback>
									</Avatar>
									{/* Who's on the call, without "joined" (Nov 5, 2026, user's call). */}
									{who}
								</span>
							) : (
								<span />
							)}
							{callControls}
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
/* Shared by the alert panel and the alert modal                               */
/* -------------------------------------------------------------------------- */

/**
 * On open, focus goes to the dialog itself, not its first button (the ×): opened from a menu or a toast, the browser
 * would draw the ×'s focus ring (Nov 4, 2026, user's call). Keyboard users are in the dialog; Tab reaches the × first.
 */
function focusDialog(event: Event) {
	event.preventDefault();
	(event.target as HTMLElement | null)?.focus({ preventScroll: true });
}

/**
 * The video consult's state, and the Calling stand-in: ringing turns live after `CONNECT_DELAY_MS`. A consult that opens
 * ringing (a card's Video consult) is reported as it opens, and closing the alert mid-call ends the call, so the app's
 * record of the consult has both ends.
 */
function useConsult(defaultConsult: AlertConsultState, onConsultChange?: (state: AlertConsultState) => void) {
	// The call, in the patient's consult session: shown elsewhere next (the patient's page), it's still on.
	const [consult, setConsultState] = useSessionState<AlertConsultState>("call", defaultConsult);
	// The latest state and callback, read through a ref: the app passes a new callback on every render (live vitals
	// re-render it each second), which mustn't restart the ringing timer below.
	const latest = React.useRef({ consult, onConsultChange });
	latest.current = { consult, onConsultChange };
	const setConsult = React.useCallback((next: AlertConsultState) => {
		setConsultState(next);
		latest.current.onConsultChange?.(next);
	}, []);
	React.useEffect(() => {
		if (latest.current.consult !== "idle") latest.current.onConsultChange?.(latest.current.consult);
		return () => {
			if (latest.current.consult !== "idle") latest.current.onConsultChange?.("idle");
		};
	}, []);
	React.useEffect(() => {
		if (consult !== "connecting") return;
		const timer = window.setTimeout(() => setConsult("live"), CONNECT_DELAY_MS);
		return () => window.clearTimeout(timer);
	}, [consult, setConsult]);
	return [consult, setConsult] as const;
}

/**
 * The consult's button: Video consult calls the bedside nurse ("Video consult" everywhere in the app; the call names who
 * picks up), Calling… while it rings, then End call while it's on (the call's own End ends it too).
 */
function ConsultButton({
	consult,
	onConsultChange,
}: {
	consult: AlertConsultState;
	onConsultChange: (state: AlertConsultState) => void;
}) {
	// Solid, as the actions row's other buttons (Nov 5, 2026, user's call: swapped with the lifecycle buttons' outline).
	if (consult === "idle")
		return (
			<Button variant='neutral' onClick={() => onConsultChange("connecting")}>
				<VideoIcon />
				Video consult
			</Button>
		);
	if (consult === "connecting")
		return (
			<Button variant='neutral' disabled>
				<LoaderCircleIcon className='animate-spin motion-reduce:animate-none' />
				Calling…
			</Button>
		);
	// Ending the call reads as stopping something: the destructive tone, flat.
	return (
		<Button variant='destructive-secondary' onClick={() => onConsultChange("idle")}>
			<VideoOffIcon />
			End call
		</Button>
	);
}

/**
 * The alert's lifecycle, as the triage queue runs it (DU-13): which buttons show, the form an action opens, and who did
 * what. Returns AlertExpanded's `status`, `alertActions` and `children` (the open form), and `escape`, which closes an
 * open form and says whether it did, so Escape takes the form first.
 */
function useAlertLifecycle({
	alert,
	actions: actionsProp,
	escalationTargets,
	onAction,
}: {
	alert: TriageAlert;
	actions?: AlertDetailAction[];
	escalationTargets: EscalationTarget[];
	onAction?: (action: TriageAlertAction) => void;
}) {
	const { prefersReducedMotion } = useMotionPreference();
	const status = alert.status ?? "active";
	const ai = alert.source.kind === "ai";
	const shown =
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
	// Feedback on an AI recommendation isn't a step in the alert's lifecycle, so it's a link on the source line, not a
	// button in the row (Nov 3, 2026, user's call).
	const alertActions = (onAction ? shown : []).filter((action) => action !== "decline");
	const feedback = Boolean(onAction) && shown.includes("decline");
	// Escalate, Resolve and Feedback open their form under the buttons, one at a time; sending it closes it.
	const [form, setForm] = React.useState<"escalate" | "resolve" | "decline" | null>(null);
	// Four buttons don't fit at equal widths: each takes its label's width and they share what's left.
	const crowded = alertActions.length > 3;
	const act = (action: TriageAlertAction) => {
		setForm(null);
		onAction?.(action);
	};
	// Who did what, and when, as in the triage queue, plus how long ago ("Acknowledged by you · 1:42 AM · 12 min ago"),
	// updated each minute.
	const now = useCurrentMinute();
	const state = stateLine(alert, escalationTargets, now);

	return {
		status,
		escape: () => {
			if (!form) return false;
			setForm(null);
			return true;
		},
		statusNode: (
			// Appears once the alert is addressed (Reveal), e.g. right after Acknowledge. It reads like the source line: the
			// same size, weight and icon.
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
		),
		alertActionsNode: alertActions.length
			? alertActions.map((action) => {
					const { icon: Icon } = actions[action];
					const { label } = actions[action];
					const opensForm = action !== "acknowledge";
					// Acknowledge confirms in place: the check swaps in, the label bumps (Confirm), and the button stays, pressed,
					// so its neighbors don't move. Clicking Acknowledged again undoes it.
					const done = action === "acknowledge" && status === "acknowledged";
					return (
						<Button
							key={action}
							// Outline, under the actions row's solid buttons (Nov 5, 2026, user's call: the two rows swapped).
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
							className={cn(crowded ? "flex-auto" : "flex-1", "font-semibold aria-expanded:bg-accent")}
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
				})
			: undefined,
		feedbackNode: feedback ? (
			<Button
				variant='link'
				size='xs'
				aria-expanded={form === "decline"}
				onClick={() => setForm((current) => (current === "decline" ? null : "decline"))}
				className='h-auto gap-1 p-0 text-sm font-medium text-inherit underline-offset-2 aria-expanded:underline [&_svg:not([class*=size-])]:size-3.5'
			>
				<Undo2Icon />
				{actions.decline.label}
			</Button>
		) : undefined,
		formNode: (
			<AnimatePresence initial={false}>
				{form === "resolve" || form === "decline" ? (
					<ResolveForm key={form} alert={alert} kind={form} onAction={act} onCancel={() => setForm(null)} />
				) : form === "escalate" ? (
					<EscalateForm key='escalate' targets={escalationTargets} onAction={act} onCancel={() => setForm(null)} />
				) : null}
			</AnimatePresence>
		),
	};
}

/** What AlertExpanded shows of the patient and the alert, from the alert's detail. */
function expandedContent(data: AlertDetailData, status: string) {
	const { alert, patient } = data;
	return {
		lastName: patient.lastName,
		firstName: patient.firstName,
		photo: patient.photo,
		initials: patient.initials,
		tone: patient.tone,
		sex: patient.sex,
		age: patient.age,
		mrn: patient.mrn,
		hospital: patient.hospital,
		unit: patient.unit,
		bed: patient.bed,
		alert: {
			variant: status === "resolved" ? ("resolved" as const) : alert.severity,
			inLast24h: data.inLast24h,
			since: status === "resolved" ? alert.addressed?.at : alert.firedAt,
		},
		// The reason line leads; the alert's own title follows it. An alert without a reason leads with its title.
		title: alert.reason ?? alert.title,
		description: alert.reason ? alert.title : undefined,
		source: `Source: ${sourceLabels[alert.source.kind]} · ${alert.source.name}`,
		acuity: data.acuity,
		trajectory: data.trajectory,
		monitor: data.monitor,
		tags: data.tags,
	};
}

/**
 * The monitor as the alert shows it: live, or in low-bandwidth mode (Scenario 2, step 2) its numbers held and refreshed
 * every `vitalsEvery` seconds, its lanes the last hour's trends instead of a streaming waveform, and a line over it
 * saying so (`monitorStatus`).
 */
function useConnectionMonitor(monitor: AlertDetailData["monitor"], connection: ConsultConnection | undefined) {
	const lowBandwidth = connection?.mode === "low-bandwidth";
	const every = connection?.vitalsEvery ?? defaultVitalsEvery;
	const held = useHeldValue(monitor?.vitals, every, lowBandwidth);
	if (!monitor || !lowBandwidth) return { monitor, monitorStatus: undefined };
	return {
		monitor: { ...monitor, vitals: held.value, plot: monitor.trends ? ("trends" as const) : undefined },
		monitorStatus: <MonitorHeldLine every={every} updatedAt={held.updatedAt} />,
	};
}

/**
 * The Video consult panel's content: the low-bandwidth banner while the connection is down, the call, the interpreter
 * prompt for a patient who prefers another language (while the call is live), and the AI Notetaker.
 */
function ConsultPanelContent({
	data,
	tile,
	notetaker,
	live = false,
}: {
	data: ConsultData;
	tile: React.ReactNode;
	notetaker: React.ReactNode;
	/** The call is on: the interpreter prompt shows. */
	live?: boolean;
}) {
	const { connection, patient } = data;
	const language = patient.preferredLanguage;
	return (
		<>
			<AnimatePresence initial={false}>
				{connection?.mode === "low-bandwidth" ? (
					<Expand key='low-bandwidth'>
						<LowBandwidthBanner connection={connection} />
					</Expand>
				) : null}
			</AnimatePresence>
			{tile}
			{language && language !== "English" ? (
				<InterpreterPrompt
					firstName={patient.firstName}
					language={language}
					interpreter={data.interpreter}
					live={live}
				/>
			) : null}
			{notetaker}
		</>
	);
}

/**
 * The hour-1 sepsis bundle when there is one (Scenario 3), the care pathway (Scenario 1, step 4), the protocol it
 * starts once it's running (Scenario 4's DKA checklist), the bedside tasks its orders generate once they're sent
 * (Scenario 3, step 5), then keep or transfer once its orders are sent (step 5), or at
 * once when a decision was already made, then social needs at discharge once the discharge workflow has flagged them
 * (Scenario 2, step 6). `escapeRef` closes an open dose edit, decline or form first.
 */
function PathwayContent({
	data,
	onPathwayDecision,
	onTransferDecision,
	onDischargeDecision,
	onBundleDecision,
	escapeRef,
	fill = false,
	focusDischarge = false,
}: {
	data: AlertDetailData;
	onPathwayDecision?: (decision: CarePathwayDecision) => void;
	onTransferDecision?: (decision: KeepOrTransferDecision) => void;
	onDischargeDecision?: (decision: DischargeDecision) => void;
	onBundleDecision?: (decision: BundleDecision) => void;
	escapeRef: React.RefObject<(() => boolean) | null>;
	/** Alone, the pathway fills its column, so its decision sits at the bottom. */
	fill?: boolean;
	/** Scrolls the column to the discharge referrals as it opens (a notice's Review referrals). */
	focusDischarge?: boolean;
}) {
	const pathwayEscape = React.useRef<(() => boolean) | null>(null);
	// Opened from a notice: the referrals come to the top of the column, under its sticky label, as the panel slides out.
	const dischargeRef = React.useRef<HTMLDivElement>(null);
	const { prefersReducedMotion } = useMotionPreference();
	React.useEffect(() => {
		if (!focusDischarge || !dischargeRef.current) return;
		return scrollIntoViewSmoothly(dischargeRef.current, { reducedMotion: Boolean(prefersReducedMotion), block: "start" });
		// eslint-disable-next-line react-hooks/exhaustive-deps -- once, as it opens.
	}, []);
	const transferEscape = React.useRef<(() => boolean) | null>(null);
	escapeRef.current = () => Boolean(pathwayEscape.current?.() || transferEscape.current?.());
	// The same session key as the pathway's own status, so the alert panel and the patient's page agree on it.
	const [pathwayStatus, setPathwayStatus] = useSessionState<CarePathwayStatus>(
		pathwaySessionKey(data.alert.id, "status"),
		data.pathwayStatus ?? "suggested",
	);
	const pathwaySent = pathwayStatus === "pending" || pathwayStatus === "active";
	const showTransfer = Boolean(data.transfer && (data.transfer.decided || pathwaySent));
	const showTasks = Boolean(data.tasks && pathwaySent);
	// Scenario 3: the pathway arrives under the bundle while the column is open (fluids in, MAP still under 65), so the
	// column brings it into view as it opens, under its sticky label. Not when the panel opens on it.
	const arrivedRef = React.useRef<HTMLDivElement>(null);
	// Keyed on whether there's a pathway, not the objects: the feed rebuilds them on every change, and a re-run would
	// cancel the scroll.
	const hasBundle = Boolean(data.bundle);
	const hasPathway = Boolean(data.pathway);
	const hadPathway = React.useRef(hasPathway);
	React.useEffect(() => {
		const arrived = hasBundle && hasPathway && !hadPathway.current;
		hadPathway.current = hasPathway;
		if (!arrived || !arrivedRef.current) return;
		return scrollIntoViewSmoothly(arrivedRef.current, { reducedMotion: Boolean(prefersReducedMotion), block: "start" });
		// eslint-disable-next-line react-hooks/exhaustive-deps -- once, as the pathway arrives.
	}, [hasBundle, hasPathway]);
	// Scenario 4: the protocol arrives just after its pathway is accepted, under it; the column brings it into view, as
	// the pathway's arrival above. Not when the panel opens with it running.
	const protocolRef = React.useRef<HTMLDivElement>(null);
	const hasProtocol = Boolean(data.protocol);
	const hadProtocol = React.useRef(hasProtocol);
	React.useEffect(() => {
		const arrived = hasProtocol && !hadProtocol.current;
		hadProtocol.current = hasProtocol;
		if (!arrived || !protocolRef.current) return;
		return scrollIntoViewSmoothly(protocolRef.current, { reducedMotion: Boolean(prefersReducedMotion), block: "start" });
		// eslint-disable-next-line react-hooks/exhaustive-deps -- once, as the protocol arrives.
	}, [hasProtocol]);
	const pathwayPanel = data.pathway ? (
		<CarePathwayPanel
			pathway={data.pathway}
			defaultStatus={data.pathwayStatus}
			record={data.pathwayRecord}
			sessionKey={data.alert.id}
			onDecision={onPathwayDecision}
			onStatusChange={setPathwayStatus}
			escapeRef={pathwayEscape}
			className={cn(fill && !showTransfer && !showTasks && !data.bundle && !data.protocol && "flex-1")}
		/>
	) : null;
	return (
		<>
			{data.bundle ? <SepsisBundlePanel bundle={data.bundle} onDecision={onBundleDecision} /> : null}
			{data.bundle ? (
				// With a bundle, the pathway comes later (Scenario 3: once fluids leave MAP under 65) and opens under it.
				<AnimatePresence initial={false}>
					{pathwayPanel ? (
						<Expand key='pathway'>
							<div ref={arrivedRef} className='flex scroll-mt-6 flex-col gap-4 pt-4'>
								<hr className='border-border' />
								{pathwayPanel}
							</div>
						</Expand>
					) : null}
				</AnimatePresence>
			) : (
				(pathwayPanel ?? <p className='text-sm text-muted-foreground'>No care pathway suggested for this alert.</p>)
			)}
			<AnimatePresence initial={false}>
				{data.protocol ? (
					<Expand key='protocol'>
						<div ref={protocolRef} className='flex scroll-mt-6 flex-col gap-4 pt-4'>
							<hr className='border-border' />
							<DkaProtocolPanel protocol={data.protocol} />
						</div>
					</Expand>
				) : null}
				{showTasks && data.tasks ? (
					<Expand key='tasks'>
						<div className='flex flex-col gap-4 pt-4'>
							<hr className='border-border' />
							<BedsideTaskList tasks={data.tasks} />
						</div>
					</Expand>
				) : null}
				{showTransfer && data.transfer ? (
					<Expand key='transfer'>
						<div className='flex flex-col gap-4 pt-4'>
							<hr className='border-border' />
							<KeepOrTransferPanel data={data.transfer} onDecision={onTransferDecision} escapeRef={transferEscape} />
						</div>
					</Expand>
				) : null}
				{data.discharge ? (
					<Expand key='discharge'>
						<div ref={dischargeRef} className='flex scroll-mt-6 flex-col gap-4 pt-4'>
							<hr className='border-border' />
							<DischargePlanPanel plan={data.discharge} onDecision={onDischargeDecision} />
						</div>
					</Expand>
				) : null}
			</AnimatePresence>
		</>
	);
}

type NotetakerState = "idle" | "consent" | "recording" | "paused" | "processing" | "ready";

// Stands in for the AI turning the recording into notes, so the prototype shows Preparing notes.
const NOTES_DELAY_MS = 3000;
// Stands in for the other parties approving the request on their side, so the prototype shows Waiting for approval.
const CONSENT_DELAY_MS = 2500;

// Each state's title and supporting text (Nov 3, 2026, user's copy).
const notetakerCopy: Record<NotetakerState, { title: string; text: string }> = {
	// Not started yet: a quiet line under `pencil-line`, not a title (Intercept-Live `230:6416`, Nov 6, 2026, user's copy).
	idle: { title: "Getting ready…", text: "" },
	consent: { title: "Waiting for approval", text: "" },
	recording: { title: "Capturing consultation", text: "Listening and organizing your notes in real time." },
	// Stopped by the clinician, to resume (Nov 5, 2026, user's call: "the user can stop and resume").
	paused: { title: "Notetaker stopped", text: "Nothing is captured until you resume." },
	processing: { title: "Preparing notes", text: "Turning the consultation into a structured clinical summary." },
	ready: { title: "Notes ready for review", text: "Review, edit, and approve your draft notes." },
};

/**
 * The draft the notetaker writes from the consult: who was on it, the alert, what was found, the clinician's own notes
 * (Add a note) and the plan. Without an alert, it says there was none open.
 */
function draftConsultNote(data: ConsultData, notes: readonly ConsultNote[] = []) {
	const { alert, bedside, pathway, reasons = [] } = data;
	return [
		`Video consult${bedside ? ` with ${bedside.name}, ${bedside.role}, at the bedside` : " with the bedside team"}.`,
		alert ? `Alert: ${alert.reason ?? alert.title}.` : "No active alert.",
		reasons.length
			? `Findings: ${reasons.map((reason) => `${reason.label} (${reason.detail})`).join("; ")}.`
			: undefined,
		notes.length ? `Clinician notes: ${notes.map((note) => note.text.replace(/[.\s]+$/, "")).join("; ")}.` : undefined,
		`Plan: ${pathway ? `${pathway.title}, sent for local co-signature` : "continue monitoring"}; reassess at the bedside.`,
	]
		.filter(Boolean)
		.join("\n");
}

/**
 * The AI Notetaker under the call (intercept.ds `alert-expanded` Video; Nov 3, 2026, user's calls): Start notetaker
 * sends an approval request to everyone on the call who doesn't approve on their own, and recording starts once they
 * have (consent before capture, PD-073); with no one to ask, it starts at once. It then prepares the notes and offers
 * the draft for review: the draft says it's AI-written and needs the clinician's approval (Spec §5.4, §8.6). Ending the
 * call while it records stops it, and the notes are prepared from what it captured. Fills the column under the call.
 * While it records, the conversation streams in under the state line (`ConsultTranscriptView`, Nov 5, 2026, user's
 * call): the call's side from `data.transcript`, the clinician's from their microphone unless they're muted. It stays
 * there, top-aligned, while the notes are prepared and until Review notes opens the draft in its place. It starts on
 * its own as the call connects (`autoStart`); Start notetaker is there for a call where it was cancelled. Stop pauses
 * it (the call goes on, uncaptured, marked in the transcript), Resume picks it up again, and Prepare notes, while
 * stopped, turns what was captured into the draft without ending the call.
 */
function ConsultNotetaker({
	data,
	live,
	onApprove,
	actionSlot,
	noteSlot,
	muted = false,
	autoStart = true,
}: {
	data: ConsultData;
	live: boolean;
	/**
	 * Starts on its own once the call connects (Nov 5, 2026, user's call: "notetaker by default"): the approval request
	 * goes out as the call goes live, and recording starts once it's approved, as Start notetaker does. Once per call: a
	 * request the clinician cancels isn't sent again until the next call.
	 */
	autoStart?: boolean;
	/** The clinician's microphone is muted on the call: the transcript doesn't capture them. */
	muted?: boolean;
	/** The clinician approved the draft: it goes to the chart as a draft for signature. */
	onApprove?: (note: string) => void;
	/**
	 * Where the notetaker's button goes (Start notetaker, Cancel request, Stop, Resume, Review notes) when it
	 * isn't under the state line: the patient page's Video consult panel puts it in the panel's header (Intercept-Live
	 * `219:16129`, Nov 5, 2026). Null until that element is there.
	 */
	actionSlot?: HTMLElement | null;
	/**
	 * Where Add a note goes (Intercept-Live `230:6415`, Nov 6, 2026): the patient page's Video consult panel pins it to
	 * the panel's bottom. Without a slot there's no field (the alert panel). Shown while the call is live or the
	 * transcript shows; each note joins the transcript at its time into the consult and goes into the draft.
	 */
	noteSlot?: HTMLElement | null;
}) {
	const { prefersReducedMotion } = useMotionPreference();
	// In the patient's consult session, so the notetaker goes on where the call does.
	const [state, setState] = useSessionState<NotetakerState>("notetaker", "idle");
	const [reviewing, setReviewing] = useSessionState("notetakerReviewing", false);
	const [draft, setDraft] = useSessionState("notetakerDraft", () => draftConsultNote(data));
	const [approvedAt, setApprovedAt] = useSessionState<string | null>("notetakerApprovedAt", null);
	// The clinician's own notes during the consult, and one not yet added.
	const [notes, setNotes] = useSessionState<ConsultNote[]>("consultNotes", []);
	const [noteDraft, setNoteDraft] = useSessionState("consultNoteDraft", "");
	const parties =
		data.notetakerParties ??
		(data.bedside ? [{ name: `${data.bedside.name}, ${data.bedside.role}`, autoApprove: false }] : []);
	const asked = parties.filter((party) => !party.autoApprove).map((party) => party.name);
	// The call ending stops recording (or a stop), and drops a request still waiting.
	React.useEffect(() => {
		if (live) return;
		if (state === "recording" || state === "paused") setState("processing");
		if (state === "consent") setState("idle");
	}, [live, state]);
	// On by default: each call starts it as it connects, from idle only (notes from an earlier call stay as they are).
	const [autoStarted, setAutoStarted] = useSessionState("notetakerAutoStarted", false);
	React.useEffect(() => {
		if (!live) {
			setAutoStarted(false);
			return;
		}
		if (!autoStart || autoStarted) return;
		setAutoStarted(true);
		if (state === "idle") setState(asked.length ? "consent" : "recording");
		// eslint-disable-next-line react-hooks/exhaustive-deps -- once per call, as it connects.
	}, [live, autoStart]);
	React.useEffect(() => {
		if (state !== "consent" && state !== "processing") return;
		const timer = window.setTimeout(
			() => setState(state === "consent" ? "recording" : "ready"),
			state === "consent" ? CONSENT_DELAY_MS : NOTES_DELAY_MS,
		);
		return () => window.clearTimeout(timer);
	}, [state]);
	const title = notetakerCopy[state].title;
	const text =
		state === "consent"
			? `Recording starts once ${joinNames(asked)} ${asked.length === 1 ? "approves" : "approve"}.`
			: notetakerCopy[state].text;

	// The one thing to do next, by state.
	const action =
		state === "idle" ? (
			<Button
				variant='outline'
				size='md'
				disabled={!live}
				onClick={() => setState(asked.length ? "consent" : "recording")}
			>
				{/* Intercept-Live `222:18365`: lucide `pencil-line` (Nov 5, 2026, user's call). */}
				<PencilLineIcon aria-hidden='true' />
				Start notetaker
			</Button>
		) : state === "consent" ? (
			<Button variant='ghost' size='md' onClick={() => setState("idle")}>
				Cancel request
			</Button>
		) : state === "recording" ? (
			<Button variant='outline' size='md' onClick={() => setState("paused")}>
				<CircleStopIcon aria-hidden='true' />
				Stop
			</Button>
		) : state === "paused" ? (
			<Button variant='outline' size='md' onClick={() => setState("recording")}>
				<PlayIcon aria-hidden='true' />
				Resume
			</Button>
		) : state === "ready" && !reviewing ? (
			<Button
				variant='outline'
				size='md'
				onClick={() => {
					// The draft takes every note added up to now.
					setDraft(draftConsultNote(data, notes));
					setReviewing(true);
				}}
			>
				Review notes
			</Button>
		) : null;

	// Recording and after: the transcript fills the column under a top-aligned state line, until the draft opens.
	const captured = state === "recording" || state === "paused" || state === "processing" || state === "ready";
	const transcribing = captured && !reviewing;
	const noteField =
		noteSlot && (live || transcribing) && !reviewing
			? createPortal(
					<ConsultField
						value={noteDraft}
						onValueChange={setNoteDraft}
						onSubmit={(text) => {
							setNotes((current) => [...current, { id: crypto.randomUUID(), text }]);
							setNoteDraft("");
						}}
						placeholder='Add a note'
						label='Add a note to the consult'
						submitLabel='Add'
					/>,
					noteSlot,
				)
			: null;

	return (
		<div
			className={cn(
				"flex flex-1 flex-col gap-4",
				transcribing ? "min-h-0" : "items-center justify-center px-12 py-6 text-center",
			)}
		>
			<div className={cn("flex w-full", transcribing ? "items-start justify-between gap-3" : "flex-col items-center gap-4")}>
				<AnimatePresence mode='wait' initial={false}>
					<motion.div
						key={state}
						variants={fadeVariants}
						initial='initial'
						animate='animate'
						exit='exit'
						role='status'
						className={cn(
							"flex flex-col",
							state === "idle" ? "gap-2" : "gap-1",
							transcribing ? "min-w-0 flex-1 items-start" : "w-full items-center",
						)}
					>
						{state === "idle" ? (
							// The icon in `icon-subtle` over the line, 8px apart, as Messages' "No messages".
							<>
								<PencilLineIcon aria-hidden='true' className='size-5 text-icon-subtle' />
								<p className='text-sm text-muted-foreground'>{title}</p>
							</>
						) : (
							<>
								{/* Waiting for approval in medium, the other states bold (Nov 6, 2026, user's call). */}
								<p
									className={cn(
										"flex items-center gap-1.5 text-base text-foreground",
										state === "consent" ? "font-medium" : "font-semibold",
									)}
								>
									{state === "recording" ? <LiveDot /> : null}
									{state === "consent" || state === "processing" ? (
										<LoaderCircleIcon
											aria-hidden='true'
											className='size-3.5 animate-spin text-icon-muted motion-reduce:animate-none'
										/>
									) : null}
									{title}
								</p>
								<p className='text-xs text-muted-foreground'>{text}</p>
								{/* Stopped, the notes can be prepared from what was captured, without ending the call. */}
								{state === "paused" ? (
									<Button variant='link' size='xs' className='h-auto px-0' onClick={() => setState("processing")}>
										Prepare notes
									</Button>
								) : null}
							</>
						)}
					</motion.div>
				</AnimatePresence>

				{actionSlot === undefined ? action : actionSlot ? createPortal(action, actionSlot) : null}
			</div>

			{/* Kept mounted from recording to review, so what it captured stays. */}
			{captured ? (
				<ConsultTranscriptView
					transcript={data.transcript}
					status={state === "recording" ? "capturing" : state === "paused" ? "paused" : "stopped"}
					muted={muted}
					notes={notes}
					className={cn(!transcribing && "hidden")}
				/>
			) : null}
			{noteField}

			<AnimatePresence initial={false}>
				{state === "ready" && reviewing ? (
					<motion.div
						key='review'
						variants={prefersReducedMotion ? fadeVariants : revealVariants}
						initial='initial'
						animate='animate'
						exit='exit'
						className='flex w-full flex-col gap-2 text-left'
					>
						<p className='flex items-center gap-1.5 text-xs font-medium text-muted-foreground'>
							<SparklesIcon aria-hidden='true' className='size-3.5' />
							AI draft: review and edit before approving
						</p>
						<Textarea
							aria-label='Draft consult note'
							value={draft}
							onChange={(event) => setDraft(event.target.value)}
							readOnly={approvedAt !== null}
							className='min-h-40 text-sm'
						/>
						{approvedAt ? (
							<p role='status' className='flex items-center gap-1.5 text-xs text-foreground'>
								<CheckIcon aria-hidden='true' className='size-3.5 text-success' />
								Approved by you · {approvedAt}. Added to the chart as a draft for signature.
							</p>
						) : (
							<div className='flex justify-end'>
								<Button
									variant='neutral'
									size='sm'
									disabled={!draft.trim()}
									onClick={() => {
										setApprovedAt(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
										onApprove?.(draft.trim());
									}}
								>
									Approve notes
								</Button>
							</div>
						)}
					</motion.div>
				) : null}
			</AnimatePresence>
		</div>
	);
}

/** "Kayla Brandt, RN", "A and B", "A, B and C". */
function joinNames(names: string[]) {
	return names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

/* -------------------------------------------------------------------------- */
/* Alert panel                                                                */
/* -------------------------------------------------------------------------- */

type AlertPanelProps = Omit<AlertDetailModalProps, "open" | "defaultOpen" | "onOpenChange"> & {
	/**
	 * Shows the pathway in the side panel when it opens. By default, when it has been acted on (its orders sent, or keep or
	 * transfer decided), so a reopened alert shows where it was left.
	 */
	defaultPathwayOpen?: boolean;
	/** Opened at the discharge referrals (a notice's Review referrals): Pathway open, scrolled to them. */
	focusDischarge?: boolean;
	/** The heading's element; inside a Dialog, `DialogTitle`. */
	titleAs?: React.ElementType;
	/** The description's element; inside a Dialog, `DialogDescription`. */
	descriptionAs?: React.ElementType;
	/** The × (AlertExpanded's `close`), e.g. a DialogClose around AlertExpandedClose. */
	close?: React.ReactNode;
	onClose?: () => void;
	/** Set to what Escape should close first: an open form, dose edit or decision. Returns whether it closed one. */
	escapeRef?: React.RefObject<(() => boolean) | null>;
	/** A message the clinician sent the bedside nurse from the Messages column. */
	onSendMessage?: (text: string) => void;
	className?: string;
};

/** Who the consult's thread is with, "Kelly Ortiz, RN". */
const threadWith = (bedside?: AlertDetailBedside) => (bedside ? `${bedside.name}, ${bedside.role}` : "the bedside nurse");

/**
 * One alert, expanded, with everything the alert modal did (it replaces the modal, Nov 3, 2026, user's call): UCL's
 * AlertExpanded with the alert's lifecycle (Acknowledge, Escalate and Resolve, each form under the buttons),
 * Video consult and Pathway. Each opens a side panel that slides out on the right, the pathway's to the right of
 * the call's when both are open: the call, with the AI Notetaker under it (Scenario 1, step 3), and the care pathway
 * with keep or transfer (steps 4 and 5). The alert's key findings are a flag, first in its tag row.
 *
 * Figma: [intercept.ds › alert-expanded](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1355-14776)
 */
function AlertPanel(props: AlertPanelProps) {
	return (
		<ConsultSessionScope patientId={props.data.alert.patientId}>
			<AlertPanelContent {...props} />
		</ConsultSessionScope>
	);
}

/** The alert panel, inside its patient's consult session (`AlertPanel`). */
function AlertPanelContent({
	data,
	defaultConsult = "idle",
	onConsultChange,
	onConsultNote,
	onAction,
	actions: actionsProp,
	escalationTargets = [],
	onOpenPatient,
	onPathwayDecision,
	onTransferDecision,
	onDischargeDecision,
	onBundleDecision,
	focusDischarge = false,
	// A sepsis bundle opens with the alert, so its hour-1 timer is in view from the start (Scenario 3, step 1); so does a
	// running protocol, so a nudge about an overdue check opens on the checklist (Scenario 4, step 3).
	defaultPathwayOpen = focusDischarge ||
		Boolean(data.bundle) ||
		Boolean(data.protocol) ||
		(data.pathwayStatus !== undefined && data.pathwayStatus !== "suggested") ||
		Boolean(data.transfer?.decided),
	titleAs,
	descriptionAs,
	close,
	onClose,
	escapeRef,
	onSendMessage,
	className,
}: AlertPanelProps) {
	// Opened to call the bedside (a card's Video consult, the Prototype menu's Alert with video consult, `?consult=1`): it
	// starts idle and calls once the modal has come in, so the Video consult panel slides out as it does from the button
	// (Nov 5, 2026, user's call). Opened already on (a consult request answered) shows the panel at once.
	const callOnOpen = defaultConsult === "connecting";
	const [consult, setConsult] = useConsult(callOnOpen ? "idle" : defaultConsult, onConsultChange);
	// The call's microphone, so the notetaker stops transcribing the clinician while they're muted.
	const [micMuted, setMicMuted] = React.useState(false);
	React.useEffect(() => {
		// A call already on (picked up from the patient's page) isn't called again.
		if (!callOnOpen || consult !== "idle") return;
		const timer = window.setTimeout(() => setConsult("connecting"), motionDuration.normal * 1000);
		return () => window.clearTimeout(timer);
		// eslint-disable-next-line react-hooks/exhaustive-deps -- once, as the modal opens.
	}, []);
	const lifecycle = useAlertLifecycle({ alert: data.alert, actions: actionsProp, escalationTargets, onAction });
	const consultOn = consult !== "idle";
	// The third column (Nov 5, 2026, user's call): the pathway, or the messages with the bedside nurse, one at a time.
	// The messages open from the actions row, with or without a call, and stay when the call ends (Nov 5, 2026, user's
	// call); only there (the Video consult panel's header lost its own, user's call, same day).
	// Messages open or closed goes with the consult session too, both ways between here and the patient's page.
	// So is Pathway (Nov 6, 2026): open on the patient's page, the alert opens with it, and the other way round.
	const [sharedMessagesOpen, setSharedMessagesOpen] = useSessionState("messagesOpen", false);
	const [sharedPathwayOpen, setSharedPathwayOpen] = useSessionState("pathwayOpen", false);
	const [sidePanel, setSidePanel] = React.useState<"pathway" | "messages" | null>(
		sharedMessagesOpen ? "messages" : defaultPathwayOpen || sharedPathwayOpen ? "pathway" : null,
	);
	const pathwayOpen = sidePanel === "pathway";
	const messagesOpen = sidePanel === "messages";
	React.useEffect(() => setSharedMessagesOpen(messagesOpen), [messagesOpen, setSharedMessagesOpen]);
	React.useEffect(() => setSharedPathwayOpen(pathwayOpen), [pathwayOpen, setSharedPathwayOpen]);
	// The message field takes focus when the clinician opens the column, not when it opens on its own (below).
	const [focusMessages, setFocusMessages] = React.useState(false);
	const togglePanel = (panel: "pathway" | "messages") => {
		setFocusMessages(panel === "messages");
		setSidePanel((current) => (current === panel ? null : panel));
	};
	const [messages, sendMessage, nurseTyping] = useConsultMessages(
		data.messages,
		data.connection?.photos,
		onSendMessage,
		data.scriptedReplies,
	);
	// Only a new message from the bedside opens the column on its own, in Pathway's place and without moving focus; the
	// connection dropping doesn't (Nov 5, 2026, user's call). The Messages buttons count what came while the alert wasn't open.
	if (useNewIncoming(messages) && sidePanel !== "messages") {
		setFocusMessages(false);
		setSidePanel("messages");
	}
	const unread = useUnreadMessages(messages, messagesOpen);
	const pathwayEscape = React.useRef<(() => boolean) | null>(null);
	if (escapeRef) escapeRef.current = () => lifecycle.escape() || Boolean(pathwayOpen && pathwayEscape.current?.());
	// Pathway: the pathway section takes focus as it opens, so the keyboard lands there too.
	const pathwayRef = React.useRef<HTMLDivElement>(null);
	React.useEffect(() => {
		if (pathwayOpen) pathwayRef.current?.focus({ preventScroll: true });
	}, [pathwayOpen]);
	const alertFlag = findingsFlag(data);
	const connectionMonitor = useConnectionMonitor(data.monitor, data.connection);

	return (
		<AlertExpanded
			{...expandedContent(data, lifecycle.status)}
			monitor={connectionMonitor.monitor}
			monitorStatus={connectionMonitor.monitorStatus}
			tags={alertFlag ? [alertFlag, ...(data.tags ?? [])] : data.tags}
			onOpenPatient={onOpenPatient}
			titleAs={titleAs}
			descriptionAs={descriptionAs}
			sourceAction={lifecycle.feedbackNode}
			status={lifecycle.statusNode}
			alertActions={lifecycle.alertActionsNode}
			actions={
				<>
					<ConsultButton consult={consult} onConsultChange={setConsult} />
					{/* Messages with the bedside nurse, between the call and Pathway, always shown (Nov 5, 2026, user's calls);
					    the only Messages button (the Video consult panel's header had one too until the same day). */}
					<ConsultMessagesButton
						size='md'
						solid
						icon={MessageCircleMoreIcon}
						open={messagesOpen}
						unread={unread}
						onToggle={() => togglePanel("messages")}
					/>
					{data.pathway || data.bundle ? (
						<Button
							// Solid while closed; open, the outline on `accent`, as before (Nov 5, 2026, user's call).
							variant={pathwayOpen ? "outline" : "neutral"}
							aria-expanded={pathwayOpen}
							onClick={() => togglePanel("pathway")}
							className='aria-expanded:bg-accent'
						>
							<GitForkIcon />
							{/* "Pathway" (Nov 5, 2026, user's call; it was View pathway), Hide pathway while it's open. */}
							{pathwayOpen ? "Hide pathway" : "Pathway"}
						</Button>
					) : null}
				</>
			}
			panels={[
				...(consultOn
					? [
							{
								id: "consult",
								label: "Video consult",
								// The call and the notetaker under it (Nov 3, 2026, user's call: the history and labs aren't in the
								// panel). The key findings are the alert's flag, in the tag row (`findingsFlag`).
								content: (
									<ConsultPanelContent
										data={data}
										live={consult === "live"}
										tile={
											<ConsultTile
												data={data}
												state={consult}
												onEnd={() => setConsult("idle")}
												onMutedChange={setMicMuted}
											/>
										}
										notetaker={
											<ConsultNotetaker
												data={data}
												live={consult === "live"}
												muted={micMuted}
												onApprove={onConsultNote}
											/>
										}
									/>
								),
							},
						]
					: []),
				// The third column, in the pathway's place (intercept.ds `alert-expanded` › Messages `1375:8218`).
				...(messagesOpen
					? [
							{
								id: "messages",
								label: "Messages",
								content: (
									<ConsultMessages
										messages={messages}
										onSend={sendMessage}
										nurse={threadWith(data.bedside)}
										typing={nurseTyping}
										autoFocus={focusMessages}
									/>
								),
							},
						]
					: []),
				// Its own column, to the right of the call's when both are open.
				...(pathwayOpen
					? [
							{
								id: "pathway",
								label: "Pathway",
								ref: pathwayRef,
								content: (
									// It fills the panel, so the decision sits at the bottom however short the pathway is.
									<PathwayContent
										data={data}
										onPathwayDecision={onPathwayDecision}
										onTransferDecision={onTransferDecision}
										onDischargeDecision={onDischargeDecision}
										onBundleDecision={onBundleDecision}
										escapeRef={pathwayEscape}
										fill
										focusDischarge={focusDischarge}
									/>
								),
							},
						]
					: []),
			]}
			close={close}
			onClose={onClose}
			className={className}
		>
			{lifecycle.formNode}
		</AlertExpanded>
	);
}

/**
 * The alert panel in a Dialog: what a card's alert bar, an alert toast and a card's Video consult open (it replaced the
 * three-column alert modal, Nov 3, 2026, user's call). Escape closes an open form, dose edit or decision first, then
 * the dialog.
 */
function AlertPanelDialog({
	open,
	defaultOpen,
	onOpenChange,
	...props
}: AlertDetailModalProps & { defaultPathwayOpen?: boolean; focusDischarge?: boolean }) {
	const escapeRef = React.useRef<(() => boolean) | null>(null);
	return (
		<Dialog open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton={false}
				onOpenAutoFocus={focusDialog}
				onEscapeKeyDown={(event) => {
					if (escapeRef.current?.()) event.preventDefault();
				}}
				// It sizes to the panel, which grows as its side panel slides out, and keeps 80px from the viewport's top and
				// bottom (as the modal did).
				className='max-h-[calc(100dvh-160px)] w-fit'
			>
				<AlertPanel
					{...props}
					titleAs={DialogTitle}
					descriptionAs={DialogDescription}
					close={
						<DialogClose asChild>
							<AlertExpandedClose />
						</DialogClose>
					}
					escapeRef={escapeRef}
					// The dialog is the surface: its corners, shadow and background.
					className='max-h-full min-h-0 rounded-none border-0 shadow-none'
				/>
			</DialogContent>
		</Dialog>
	);
}

/**
 * A video consult with no alert open (Nov 4, 2026, user's calls): what a card's Video consult opens when the patient has
 * no active alert. The alert panel without its alert: the patient (the name, the heading, opens their details), the
 * actions row (Nov 5, 2026, user's call: Video consult, Messages and Pathway, as on the alert panel), their score, monitor
 * and tags, and the Video consult panel, always open, with the AI Notetaker under the call (already ringing; Cancel,
 * End, then Video consult to call again, in its tile or the row). Messages and Pathway share the third column, one at a
 * time; with no alert there's no pathway suggested, which its column says. No lifecycle buttons: no alert to act on.
 */
function PatientConsultDialog(props: React.ComponentProps<typeof PatientConsultDialogContent>) {
	// The dialog stays mounted once closed (to animate out); it's in the patient's consult session only while open.
	return (
		<ConsultSessionScope patientId={props.data.patientId} active={props.open ?? true}>
			<PatientConsultDialogContent {...props} />
		</ConsultSessionScope>
	);
}

/** The patient consult, inside its patient's consult session (`PatientConsultDialog`). */
function PatientConsultDialogContent({
	data,
	open,
	onOpenChange,
	defaultConsult = "connecting",
	onConsultChange,
	onConsultNote,
	onOpenPatient,
	onSendMessage,
	carePlan,
}: {
	data: PatientConsultData;
	/**
	 * The patient's care plan in force, from an earlier alert: the Pathway column shows it (read-only, as on their page)
	 * instead of saying there's no pathway (Nov 6, 2026).
	 */
	carePlan?: PatientCarePlan;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	defaultConsult?: AlertConsultState;
	onConsultChange?: (state: AlertConsultState) => void;
	onConsultNote?: (note: string) => void;
	onOpenPatient?: () => void;
	onSendMessage?: (text: string) => void;
}) {
	const [consult, setConsult] = useConsult(defaultConsult, onConsultChange);
	const [micMuted, setMicMuted] = React.useState(false);
	// The third column, as on the alert panel: the messages with the bedside nurse, or the pathway, one at a time. Messages
	// open or closed goes with the consult session.
	const [sharedMessagesOpen, setSharedMessagesOpen] = useSessionState("messagesOpen", false);
	const [sidePanel, setSidePanel] = React.useState<"pathway" | "messages" | null>(sharedMessagesOpen ? "messages" : null);
	const messagesOpen = sidePanel === "messages";
	React.useEffect(() => setSharedMessagesOpen(messagesOpen), [messagesOpen, setSharedMessagesOpen]);
	const pathwayOpen = sidePanel === "pathway";
	const [focusMessages, setFocusMessages] = React.useState(false);
	const togglePanel = (panel: "pathway" | "messages") => {
		setFocusMessages(panel === "messages");
		setSidePanel((current) => (current === panel ? null : panel));
	};
	const [messages, sendMessage, nurseTyping] = useConsultMessages(
		data.messages,
		data.connection?.photos,
		onSendMessage,
		data.scriptedReplies,
	);
	// A new message from the bedside opens the column, and the buttons count the ones not yet seen, as on the alert panel.
	if (useNewIncoming(messages) && sidePanel !== "messages") {
		setFocusMessages(false);
		setSidePanel("messages");
	}
	const unread = useUnreadMessages(messages, messagesOpen);
	const { patient } = data;
	const connectionMonitor = useConnectionMonitor(data.monitor, data.connection);
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton={false}
				onOpenAutoFocus={focusDialog}
				// No alert to describe: the patient's name names the dialog.
				aria-describedby={undefined}
				className='max-h-[calc(100dvh-160px)] w-fit'
			>
				<AlertExpanded
					lastName={patient.lastName}
					firstName={patient.firstName}
					photo={patient.photo}
					initials={patient.initials}
					tone={patient.tone}
					sex={patient.sex}
					age={patient.age}
					mrn={patient.mrn}
					hospital={patient.hospital}
					unit={patient.unit}
					bed={patient.bed}
					actions={
						<>
							<ConsultButton consult={consult} onConsultChange={setConsult} />
							<ConsultMessagesButton
								size='md'
								solid
								icon={MessageCircleMoreIcon}
								open={messagesOpen}
								unread={unread}
								onToggle={() => togglePanel("messages")}
							/>
							<Button
								variant={pathwayOpen ? "outline" : "neutral"}
								aria-expanded={pathwayOpen}
								onClick={() => togglePanel("pathway")}
								className='aria-expanded:bg-accent'
							>
								<GitForkIcon />
								{pathwayOpen ? "Hide pathway" : "Pathway"}
							</Button>
						</>
					}
					acuity={data.acuity}
					trajectory={data.trajectory}
					monitor={connectionMonitor.monitor}
					monitorStatus={connectionMonitor.monitorStatus}
					tags={data.tags}
					onOpenPatient={onOpenPatient}
					titleAs={DialogTitle}
					panels={[
						{
							id: "consult",
							label: "Video consult",
							content: (
								<ConsultPanelContent
									data={data}
									live={consult === "live"}
									tile={
										<ConsultTile
											data={data}
											state={consult}
											onEnd={() => setConsult("idle")}
											onStart={() => setConsult("connecting")}
											onMutedChange={setMicMuted}
										/>
									}
									notetaker={
										<ConsultNotetaker
											data={data}
											live={consult === "live"}
											muted={micMuted}
											onApprove={onConsultNote}
										/>
									}
								/>
							),
						},
						...(messagesOpen
							? [
									{
										id: "messages",
										label: "Messages",
										content: (
											<ConsultMessages
												messages={messages}
												onSend={sendMessage}
												nurse={threadWith(data.bedside)}
												typing={nurseTyping}
												autoFocus={focusMessages}
											/>
										),
									},
								]
							: []),
						...(pathwayOpen
							? [
									{
										id: "pathway",
										label: "Pathway",
										content: carePlan?.pathway || carePlan?.transfer ? (
											// The plan an earlier alert's pathway put in force; acting on it is the alert's.
											<CarePlanCard plan={carePlan} headingLevel='h3' className='border-0 bg-transparent p-0' />
										) : (
											// No alert, so nothing suggested: pathways come with an alert's findings.
											<EmptyState
												icon={<GitForkIcon />}
												title='No care pathway'
												description={`Pathways are suggested with an alert. ${patient.firstName ?? "This patient"} has no active alert.`}
												headingLevel='h3'
												className='flex-1'
											/>
										),
									},
								]
							: []),
					]}
					close={
						<DialogClose asChild>
							<AlertExpandedClose />
						</DialogClose>
					}
					className='max-h-full min-h-0 rounded-none border-0 shadow-none'
				/>
			</DialogContent>
		</Dialog>
	);
}

/* -------------------------------------------------------------------------- */
/* Alert modal (three columns, replaced by the alert panel)                    */
/* -------------------------------------------------------------------------- */

/**
 * An alert, opened, 1400px wide in three columns. The patient: who they are, the alert (its bar, title, source and
 * lifecycle actions), their score, monitor and tags, then Video consult and Pathway. Clinical info: the key
 * clinical findings and the history and labs, with the video consult floating over its bottom once it's on. Pathway,
 * for acting on it: the suggested care pathway with its decision at the bottom, then keep or transfer once the orders
 * are sent. Each column scrolls on its own. Replaced in the app by the alert panel (AlertPanelDialog, Nov 3, 2026).
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
	onTransferDecision,
	onDischargeDecision,
}: AlertDetailModalProps) {
	const [consult, setConsult] = useConsult(defaultConsult, onConsultChange);
	const lifecycle = useAlertLifecycle({ alert: data.alert, actions: actionsProp, escalationTargets, onAction });
	const { prefersReducedMotion } = useMotionPreference();
	const pathwayEscape = React.useRef<(() => boolean) | null>(null);
	// Pathway: the Pathway column back at its top, with focus, so the keyboard lands there too.
	const pathwayRef = React.useRef<HTMLElement>(null);
	const viewPathway = () => {
		const column = pathwayRef.current;
		if (!column) return;
		column.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
		column.focus({ preventScroll: true });
	};

	return (
		<Dialog open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton={false}
				onEscapeKeyDown={(event) => {
					// An open form takes Escape first: it closes, the modal stays.
					if (lifecycle.escape() || pathwayEscape.current?.()) event.preventDefault();
				}}
				// When it grows tall it keeps 80px from the viewport's top and bottom edges (user's call, Nov 2, 2026).
				className='max-h-[calc(100dvh-160px)] w-[1400px] flex-row'
			>
				{/* The patient and the alert (UCL AlertExpanded), raised over the column to its right so its shadow falls on it.
				    It scrolls on its own; its × stays in the corner. */}
				<AlertExpanded
					{...expandedContent(data, lifecycle.status)}
					onOpenPatient={onOpenPatient}
					titleAs={DialogTitle}
					descriptionAs={DialogDescription}
					sourceAction={lifecycle.feedbackNode}
					status={lifecycle.statusNode}
					alertActions={lifecycle.alertActionsNode}
					actions={
						<>
							<ConsultButton consult={consult} onConsultChange={setConsult} />
							{/* Takes the clinician (and focus) to the Pathway column, back at its top. */}
							{data.pathway ? (
								<Button variant='outline' onClick={viewPathway}>
									<GitForkIcon />
									Pathway
								</Button>
							) : null}
						</>
					}
					close={
						<DialogClose asChild>
							<AlertExpandedClose />
						</DialogClose>
					}
					// In the modal: no corners, and only its right border shows, the rule before Clinical info (the others stay,
					// transparent, so the × keeps its 20px).
					className='z-20 w-auto min-w-0 flex-1 rounded-none border-transparent border-r-border shadow-[0_0_50px_-12px_var(--shadow-color-lg)]'
				>
					{lifecycle.formNode}
				</AlertExpanded>

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

				{/* Its own layer, under the other columns, so its sticky label stays under the shadow Clinical info casts on it. */}
				<section
					ref={pathwayRef}
					tabIndex={-1}
					aria-labelledby='alert-modal-pathway'
					className='relative z-0 flex w-[400px] shrink-0 flex-col gap-4 overflow-y-auto bg-background p-6 outline-none'
				>
					<ColumnLabel id='alert-modal-pathway'>Pathway</ColumnLabel>
					<PathwayContent
						data={data}
						onPathwayDecision={onPathwayDecision}
						onTransferDecision={onTransferDecision}
						onDischargeDecision={onDischargeDecision}
						escapeRef={pathwayEscape}
						fill
					/>
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
 * highest-priority open alert, else their latest. One that has left the page's alerts (resolved by the feed) still
 * has its detail, so a Resolved bar opens it, and a modal open on it stays open when it resolves.
 */
function pickAlertDetail(details: AlertDetailData[], alerts: TriageAlert[], { patientId, alertId }: OpenAlert) {
	const id =
		alertId ??
		[...alerts.filter((alert) => alert.patientId === patientId)].sort(
			(a, b) => Number(isOpenAlert(b)) - Number(isOpenAlert(a)) || compareTriageAlerts(a, b),
		)[0]?.id ??
		details
			.map((detail) => detail.alert)
			.filter((alert) => alert.patientId === patientId)
			.sort((a, b) => b.firedAt.localeCompare(a.firedAt))[0]?.id;
	return details.find((detail) => detail.alert.id === id);
}

/**
 * The shell's `renderAlert` for a layout (Census, Monitoring): the alert panel (AlertPanelDialog, which replaced the
 * three-column modal on Nov 3, 2026) for the opened alert, with its live state
 * and the patient's alerts in the last 24 h from `alerts`. Acknowledge shows while the alert is open and unaddressed, and
 * closes the modal after; Escalate and Resolve need the queue's reason and note, not built here yet. An alert without a
 * detail renders nothing, and the shell opens the patient instead.
 */
function alertModalRenderer({
	details,
	consults = [],
	alerts,
	escalationTargets,
	onAlertAction,
	onPathwayDecision,
	onTransferDecision,
	onDischargeDecision,
	onBundleDecision,
	onConsultChange,
	onConsultNote,
	records,
}: {
	details: AlertDetailData[];
	/**
	 * Each patient's video consult without an alert, by patient: a card's Video consult opens it when the patient has no
	 * active alert (Nov 4, 2026, user's call). Without one, that patient opens their details, as before.
	 */
	consults?: PatientConsultData[];
	alerts: TriageAlert[];
	/** The patients' records, so each flag opens what changed and what's behind it now, as on the cards. */
	records?: PatientRecord[];
	escalationTargets?: EscalationTarget[];
	onAlertAction: (alertId: string, action: TriageAlertAction) => void;
	/**
	 * The pathway decided in the modal, by alert, so the app keeps it after the modal closes. Each callback also gets the
	 * alert's detail as opened (the patient, the pathway as suggested, keep or transfer), for the app's record of it.
	 */
	onPathwayDecision?: (alertId: string, decision: CarePathwayDecision, detail: AlertDetailData) => void;
	/** Keep or transfer decided in the modal, by alert. */
	onTransferDecision?: (alertId: string, decision: KeepOrTransferDecision, detail: AlertDetailData) => void;
	/** A discharge referral decided in the modal, by patient: the patient's page shows the same referrals. */
	onDischargeDecision?: (patientId: string, decision: DischargeDecision) => void;
	/** A sepsis bundle check confirmed or taken back in the modal (Scenario 3's renal dose review), by alert. */
	onBundleDecision?: (alertId: string, decision: BundleDecision) => void;
	/** The video consult rang, went live or ended (closing the modal ends it), by alert. */
	onConsultChange?: (alertId: string, state: AlertConsultState, detail: AlertDetailData) => void;
	/** The AI Notetaker's draft of the consult, approved, by alert. */
	onConsultNote?: (alertId: string, note: string, detail: AlertDetailData) => void;
}) {
	return (target: OpenAlert, { open, onOpenChange, openPatient }: AlertControls) => {
		// Video consult with no active alert: the call, without an alert on it.
		if (
			target.consult &&
			!target.alertId &&
			!alerts.some((alert) => alert.patientId === target.patientId && isOpenAlert(alert))
		) {
			const consult = consults.find((item) => item.patientId === target.patientId);
			if (consult) {
				const [flagged] = withFlagDetails([{ id: consult.patientId, tags: consult.tags }], records);
				return (
					<PatientConsultDialog
						data={{ ...consult, tags: consult.tags && flagged.tags }}
						carePlan={records?.find((record) => record.id === consult.patientId)?.carePlan}
						open={open}
						onOpenChange={onOpenChange}
						onOpenPatient={openPatient}
					/>
				);
			}
		}
		const detail = pickAlertDetail(details, alerts, target);
		if (!detail) return null;
		// An alert that left the page's alerts (the feed resolved it) opens as resolved.
		const alert: TriageAlert = alerts.find((item) => item.id === detail.alert.id) ?? {
			...detail.alert,
			status: "resolved",
		};
		const gone = !alerts.some((item) => item.id === alert.id);
		// The resolved alert that left the list still counts.
		const inLast24h =
			alerts.filter((item) => item.patientId === alert.patientId && Date.now() - Date.parse(item.firedAt) < DAY_MS)
				.length + (gone && Date.now() - Date.parse(alert.firedAt) < DAY_MS ? 1 : 0);
		// The flags open their details, as on the patient's card.
		const [flagged] = withFlagDetails([{ id: alert.patientId, tags: detail.tags }], records);
		const data = { ...detail, alert, inLast24h: detail.inLast24h ?? inLast24h, tags: detail.tags && flagged.tags };
		return (
			<AlertPanelDialog
				data={data}
				// A consult request answered from its toast is on at once; Video consult from a card rings the bedside first.
				defaultConsult={target.consult === "answered" ? "live" : target.consult ? "connecting" : "idle"}
				// A notice's Review referrals opens it at the discharge referrals.
				focusDischarge={target.focus === "discharge"}
				open={open}
				onOpenChange={onOpenChange}
				onOpenPatient={openPatient}
				escalationTargets={escalationTargets}
				onPathwayDecision={onPathwayDecision && ((decision) => onPathwayDecision(alert.id, decision, data))}
				onTransferDecision={onTransferDecision && ((decision) => onTransferDecision(alert.id, decision, data))}
				onDischargeDecision={onDischargeDecision && ((decision) => onDischargeDecision(alert.patientId, decision))}
				onBundleDecision={onBundleDecision && ((decision) => onBundleDecision(alert.id, decision))}
				onConsultChange={onConsultChange && ((state) => onConsultChange(alert.id, state, data))}
				onConsultNote={onConsultNote && ((note) => onConsultNote(alert.id, note, data))}
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
	AlertPanel,
	AlertPanelDialog,
	PatientConsultDialog,
	PathwayContent,
	alertModalRenderer,
	withAlertFlags,
	ConsultNotetaker,
	ConsultPanelContent,
	ConsultTile,
	CONNECT_DELAY_MS,
	threadWith,
	useAlertLifecycle,
	useConsult,
	sourceLabels as alertSourceLabels,
	type AlertConsultState,
	type PatientConsultData,
	type AlertDetailAction,
	type AlertDetailBedside,
	type ConsultMessage,
	type AlertDetailData,
	type AlertDetailFact,
	type AlertDetailModalProps,
	type AlertPanelProps,
	type AlertDetailPatient,
	type AlertDetailReason,
};
