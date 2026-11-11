import * as React from "react";
import {
	ActivityIcon,
	ArrowRightLeftIcon,
	BookOpenIcon,
	ChartSplineIcon,
	ClipboardListIcon,
	DoorOpenIcon,
	FileTextIcon,
	FilePenLineIcon,
	HeartCrackIcon,
	HospitalIcon,
	LinkIcon,
	PillIcon,
	VideoIcon,
	type LucideIcon,
} from "lucide-react";

import type { PatientCensusCardProps } from "@/components/cards/patient-census-card";
import type { MonitorLimits, MonitorTrends, MonitorVitals, PatientMonitorProps } from "@/components/cards/patient-monitoring-card";
import type { AvatarFallbackProps } from "@/components/data-display/avatar";
import { PatientHeader, type PatientHeaderProps } from "@/components/data-display/patient-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/navigation/tabs";
import { useCurrentMinute } from "@/lib/hooks/use-current-minute";
import { useMotionPreference } from "@/lib/motion";

import type { PatientDetailsView, PatientStepper } from "../intercept-live";
import { compareTriageAlerts, isOpenAlert, type EscalationTarget, type TriageAlert, type TriageAlertAction } from "../monitoring/triage-queue";
import { flagDetails, withFallPathwayLink } from "../shared/flag-details";
import { avatarTone, avatarTones, patientInitials } from "../shared/patient-avatar";
import type { AlertConsultState, AlertDetailData, PatientConsultData } from "../alert-panel/alert-panel";
import { pathwaySessionKey, type CarePathwayDecision, type CarePathwayStatus } from "../alert-panel/care-pathway";
import { ConsultSessionScope, useSessionState } from "../alert-panel/consult-session";
import { DischargePlanPanel, type DischargeDecision, type DischargePlan } from "../alert-panel/discharge-plan";
import type { KeepOrTransferDecision } from "../alert-panel/keep-or-transfer";
import type { BundleDecision } from "../alert-panel/sepsis-bundle";
import { usePatientNavigation } from "../patient-navigation";
import { withActivityEvents, type PatientActivity, type PatientCarePlan } from "./activity";
import {
	PatientAlertsPanel,
	PatientConsultPanels,
	useAlertPathwayPanel,
	useOpenAlertsPanel,
	useOpenPathwayPanel,
	type PatientPathways,
} from "./consult-panels";
import { AlertsSection, PatientOverview } from "./patient-overview";
import { CameraSection, type PatientCamera } from "./sections/camera-section";
import { ChartSection, type PatientChart } from "./sections/chart-section";
import { EpicSection, type PatientEmr } from "./sections/epic-section";
import { MedicationsSection, type PatientMedications } from "./sections/medications-section";
import { NotesSection, type PatientNotes } from "./sections/notes-section";
import { OrdersSection, type PatientOrders } from "./sections/orders-section";
import { SepsisSection, type SepsisCase } from "./sections/sepsis-section";
import { TimelineSection, type PatientTimeline } from "./sections/timeline-section";
import { VitalsSection, type PatientVitals } from "./sections/vitals-section";

// Patient details (PRD Patient details): one patient's page, opened over the Census or Monitoring. Follows
// Intercept-Live › Patient Details (`149:4464`, Oct 28, 2026): the app header's patient actions, the Patient Header, Line
// tabs, and the Overview (rebuilt from the screen Nov 9, 2026). The other sections (`sections/`) are from the PRD
// (§5–§12) until Figma draws them. A section the record has no data for shows an empty state saying what it will hold.

/* -------------------------------------------------------------------------- */
/* Data shapes (the app's API fills these)                                    */
/* -------------------------------------------------------------------------- */

/** Who the patient is and where, as the Census and Monitoring know them. */
type PatientDetailsPatient = Pick<
	PatientCensusCardProps,
	| "lastName"
	| "firstName"
	| "photo"
	| "mrn"
	| "sex"
	| "age"
	| "hospital"
	| "unit"
	| "room"
	| "bed"
	| "acuity"
	| "trajectory"
	| "tags"
> & {
	id: string;
	/** Under sepsis screening or tracking: adds the Sepsis section (PRD PD-080). */
	sepsisWatch?: boolean;
};

/** A ventilator setting: the measured value, and the set value when the two differ (e.g. tidal volume, rate). */
type VentilatorSetting = {
	label: string;
	value: string;
	unit?: string;
	set?: string;
	/** The last change to the setting (the set value when there is one): the value before it, same units, and when. */
	change?: { from: string; at: string };
};

type PatientVentilator = {
	/** Invasive, NIV, high-flow, oxygen, room air. */
	support: string;
	mode?: string;
	settings: VentilatorSetting[];
	/** The last arterial blood gas, preformatted ("pH 7.29 · PaCO₂ 46 · …"). */
	abg?: { values: string; collectedAt: string };
	/** Where the values come from, e.g. "Ventilator" (PRD SV-074). */
	source: string;
	updatedAt: string;
};

/** The latest fall risk assessment, behind the Fall risk flag. Who assessed is the bedside nurse (`careTeam`). */
type PatientFallRisk = {
	/** "Morse Fall Scale". */
	scale: string;
	score: number;
	/** "High risk": the scale's band for the score. */
	risk: string;
	assessedAt: string;
	/** The assessment before, when the score changed. */
	previous?: { score: number; at: string };
	/** What's in place, e.g. "Bed alarm on", "Low bed". */
	precautions: string[];
};

/** The order behind a code status flag (DNR). Who ordered it is the attending of record (`careTeam`). */
type PatientCodeStatusOrder = {
	orderedAt: string;
	/** Who it was discussed with, e.g. "Patient and wife". */
	discussedWith?: string;
	/** The code status before, when it changed. */
	previous?: { status: string; at: string };
};

/** One entry on the patient's allergy list, behind the Allergy tag's popover (Nov 5, 2026, user's call). */
type PatientAllergy = {
	/** As it reads in `allergies`, e.g. "Iodinated contrast". */
	substance: string;
	/** "Hives and itching". */
	reaction: string;
	severity: "mild" | "moderate" | "severe";
	/** An intolerance (nausea from codeine) rather than an allergy. Defaults to allergy. */
	kind?: "allergy" | "intolerance";
	/** Confirmed by a clinician or pharmacist, or only reported by the patient or family. */
	verified: boolean;
	/** When it was added to the list. */
	recordedAt: string;
};

/** The order behind an isolation flag: why, and since when. */
type PatientIsolationOrder = {
	/** "MRSA in the wound swab". */
	reason: string;
	orderedAt: string;
};

/** The ECMO circuit, behind the ECMO flag: the console's settings, written like the ventilator's. */
type PatientEcmo = {
	/** "VA-ECMO". */
	mode: string;
	settings: VentilatorSetting[];
	source: string;
	updatedAt: string;
};

type PatientInfusion = {
	drug: string;
	/** Rate with its units, e.g. "0.22 mcg/kg/min". Missing reads "Rate unavailable", never "stopped" (PRD PC-060). */
	rate?: string;
	/** The last rate change: its direction, the rate before it (same units) and when. */
	change?: { direction: "up" | "down"; from: string; at: string };
	updatedAt: string;
};

type PatientLab = {
	name: string;
	value?: string;
	unit?: string;
	/** Outside the hospital's reference range. Shown as words and a letter, not color alone (PRD PD-040). */
	flag?: "high" | "low" | "critical";
	resultedAt?: string;
	previous?: { value: string; at: string };
	/** Collected but not resulted: shows "Pending · collected 13:10". */
	collectedAt?: string;
};

type CareTeamMember = {
	role: string;
	name: string;
	initials: string;
	src?: string;
	tone?: AvatarFallbackProps["tone"];
	/** The hospital, for the hospital's own staff. */
	organization?: string;
	presence?: "online" | "away" | "offline";
	/** The signed-in clinician. */
	you?: boolean;
};

/** An AI-written brief of what matters now (PRD PD-024), by the Conversational Clinical Data Agent. */
type PatientBrief = {
	/** Its headline, e.g. "Worsening hemodynamic and respiratory status". */
	title?: string;
	text: string;
	/** How many sources it was written from. */
	sourceCount: number;
	/** When the data behind it last changed. */
	updatedAt: string;
	/** When the signed-in clinician last viewed the patient. */
	lastViewedAt?: string;
};

/** What the page knows about the patient beyond the card: safety, encounter, organ support, labs and care team. */
/**
 * The deterioration score with what drove it (PRD PC-030, SV-09, DU-14): its value and band, its trend, each input with
 * its points, and when it crossed into its alert band, if it has. A current-state score, never a prediction.
 */
type PatientEarlyWarning = {
	/** The score's name, e.g. "NEWS2". */
	score: string;
	value: number;
	/** The band the value is in, e.g. "Medium". */
	band: string;
	/** The alert band and its threshold, e.g. "High" at 7. */
	alertBand: string;
	threshold: number;
	/** When the score was last worked out, ISO 8601. */
	updatedAt: string;
	/** When it crossed into the alert band, ISO 8601. Missing while it's below the threshold. */
	crossedAt?: string;
	/** Earlier values, oldest first, for the trend. The current value is the last point. */
	trend: { at: string; value: number }[];
	/** Each input with its value and points, e.g. RR "26/min", 3. */
	inputs: { label: string; value: string; points: number }[];
};

/** Charted intake and output (DU-18): the net fluid balance and the weight change, preformatted ("+1.8 L"). */
type PatientFluids = {
	netBalance: string;
	weightChange: string;
	/** The period both cover, e.g. "48 h". */
	window: string;
	/** When the nurse charted them, ISO 8601. */
	chartedAt: string;
	/** Who charted them, e.g. "Kayla Brandt, RN". */
	chartedBy?: string;
};

/**
 * A finding that matters for this patient's situation, shown after the key labs (Intercept-Live `242:11805`, Nov 9, 2026:
 * "contextual clinical findings"): a vital watched against a rule, or the breathing support and since when.
 */
type PatientFinding = {
	/** "Temp", "SBP", "BiPAP". */
	name: string;
	/** As charted, e.g. "36.8", "10/5 · 40%". */
	value: string;
	unit?: string;
	/** Why it's watched, at the top right: "Nitro stops < 110". */
	context?: string;
	/** When the current support started, ISO 8601: "Since 8:03 AM" at the top right, in place of `context`. */
	since?: string;
	/** When it was charted, ISO 8601. Older than `staleAfterMinutes`, "2 h old" in red takes the top right. */
	chartedAt?: string;
	staleAfterMinutes?: number;
	/** The line under the value when there's no previous: "Charted · Normal", "IPAP/EPAP · FiO₂". */
	note?: string;
	/** The value before this one: "▲ Was 117 at 2:43 AM". */
	previous?: { value: string; at: string };
};

type PatientRecord = {
	id: string;
	/** Photo URL, for the Patient Header's avatar. */
	photo?: string;
	/** Preformatted, e.g. "64 kg". */
	weight?: string;
	/** Unread messages in the patient's thread. */
	unreadMessages?: number;
	brief?: PatientBrief;
	/**
	 * The patient's earlier alerts, before the ones the live feed shows, all resolved: the Alerts panel lists every alert
	 * the patient had (Nov 10, 2026, user's call: "all alerts, historical data, should stay").
	 */
	alertHistory?: TriageAlert[];
	/** "Full code", "DNR", "DNR/DNI". Missing reads "Code status unknown", never blank (PRD PD-011). */
	codeStatus?: string;
	/** An empty list reads "No known allergies"; missing reads "Allergies unknown". */
	allergies?: string[];
	/** Each allergy's reaction, severity and status, behind the Allergy tag's popover. */
	allergyDetails?: PatientAllergy[];
	isolation?: string;
	diagnosis?: string;
	problems?: string[];
	admittedAt?: string;
	admittedFrom?: string;
	/** When the patient came to the ICU, for "ICU day 3". */
	icuAdmittedAt?: string;
	ventilator?: PatientVentilator;
	infusions?: PatientInfusion[];
	labs?: PatientLab[];
	/** What matters for this patient's situation beyond the labs, after them on the Overview. */
	findings?: PatientFinding[];
	careTeam?: CareTeamMember[];
	/** Each section's data. A section without it shows its empty state. */
	vitals?: PatientVitals;
	chart?: PatientChart;
	timeline?: PatientTimeline;
	medications?: PatientMedications;
	orders?: PatientOrders;
	emr?: PatientEmr;
	notes?: PatientNotes;
	/** Only for a patient under sepsis screening or tracking (PRD PD-080). */
	sepsis?: SepsisCase;
	camera?: PatientCamera;
	/** Behind the Fall risk, DNR, isolation and ECMO flags' popovers (Nov 5, 2026, user's call: every flag opens one). */
	fallRisk?: PatientFallRisk;
	codeStatusOrder?: PatientCodeStatusOrder;
	isolationOrder?: PatientIsolationOrder;
	ecmo?: PatientEcmo;
	/** The deterioration score's breakdown, for the Overview's Early warning score. */
	earlyWarning?: PatientEarlyWarning;
	fluids?: PatientFluids;
	/** What was done and decided about the patient, with who and when: the Overview's Activity and the Timeline's events. */
	activity?: PatientActivity[];
	/** The care plan in force: the pathway sent from an alert and the decision to keep or transfer, for the Overview. */
	carePlan?: PatientCarePlan;
	/**
	 * Social needs at discharge, once the discharge workflow has flagged them (Scenario 2, step 6): adds the Discharge
	 * section, the same panel as in the alert's Pathway panel.
	 */
	discharge?: DischargePlan;
};

/** The patient's live bedside values, from Monitoring. */
type PatientMonitorData = Pick<
	PatientMonitorProps,
	"vitals" | "limits" | "alarmPriorities" | "acknowledgedAlarms" | "trends"
>;

type PatientDetailsProps = {
	patient: PatientDetailsPatient;
	/** The avatar's color, as on the patient's card (`avatarTones` over the roster). Without it, one from their id. */
	tone?: AvatarFallbackProps["tone"];
	record?: PatientRecord;
	monitor?: PatientMonitorData;
	/** The patient's alerts, for the Overview's alerts (PRD PD-020). */
	alerts?: TriageAlert[];
	/**
	 * Alerts that left `alerts` (the feed resolved them), shown as resolved in the Alerts panel with the record's
	 * `alertHistory`, so every alert the patient had stays there.
	 */
	leftAlerts?: TriageAlert[];
	escalationTargets?: EscalationTarget[];
	onAlertAction?: (alertId: string, action: TriageAlertAction) => void;
	/** A patient action (Messages here; the app header's Raise concern, Escalate…). The prototype only reports it. */
	onAction?: (action: PatientAction) => void;
	/** A referral in the Discharge section sent (with who agreed to it) or skipped, or a skip taken back. */
	onDischargeDecision?: (decision: DischargeDecision) => void;
	/**
	 * Who the patient's video consult reaches and their thread with the bedside nurse: with it, the app header's Video
	 * consult and Messages open their panels right of the page (`consult-panels.tsx`). Without it, they only report the
	 * click (`onAction`).
	 */
	consult?: PatientConsultData;
	/**
	 * The call's state as the page opens: `live` when it opens answering a consult request (the toast's answer on the
	 * patient's page, Nov 9, 2026), with the Video consult panel open. Idle by default.
	 */
	defaultConsult?: AlertConsultState;
	/**
	 * Opens the page with an alert's pathway out in the Pathway panel, at `focus` (a notice's Review referrals opens the
	 * discharge referrals). Needs `consult`, as the panel does.
	 */
	defaultPathway?: { alertId?: string; focus?: "discharge" };
	/**
	 * The patient's alerts that come with a pathway (or a sepsis bundle, or a protocol), the one to show first leading:
	 * the Overview's Care plan shows it (suggested, or what it runs) and opens it in the Pathway panel right of the page.
	 * The same pathway as the alert panel's (View suggested pathway), kept in step through the consult session. The panel
	 * needs `consult` (it's one of the page's panels); without it, the Care plan's way to it opens the alert.
	 */
	pathways?: PatientPathways;
};

/* -------------------------------------------------------------------------- */
/* Product content                                                            */
/* -------------------------------------------------------------------------- */

/** The patient's actions (PRD PD-014): the app header's, the "…" menu's, and the Patient Header's Video consult and Messages. */
type PatientAction =
	| "raise-concern"
	| "huddle-team"
	| "video-consult"
	| "escalate"
	| "messages"
	| "new-note"
	| "handoff"
	| "copy-link"
	| "care-team";

type SectionId =
	| "overview"
	| "vitals"
	| "chart"
	| "timeline"
	| "medications"
	| "orders"
	| "discharge"
	| "epic"
	| "notes"
	| "sepsis"
	| "camera";

// The sections after Overview, in Intercept-Live's order, with the empty state each shows when the record has no data
// for it.
const pendingSections: { id: Exclude<SectionId, "overview">; label: string; icon: LucideIcon; title: string; description: string }[] = [
	{
		id: "vitals",
		label: "Vitals",
		icon: ActivityIcon,
		title: "No vitals yet",
		description: "Vital signs and their trends will appear here, with each value's source and time.",
	},
	{
		id: "chart",
		label: "Chart",
		icon: BookOpenIcon,
		title: "No chart yet",
		description: "The patient's record from the hospital will appear here: problems, history and results.",
	},
	{
		id: "timeline",
		label: "Timeline",
		icon: ChartSplineIcon,
		title: "No timeline yet",
		description: "Vitals, infusions, ventilator settings, labs and events will appear here on one time axis.",
	},
	{
		id: "medications",
		label: "Medications",
		icon: PillIcon,
		title: "No medications yet",
		description: "Scheduled, as-needed and continuous medications from the hospital's record will appear here.",
	},
	{
		id: "orders",
		label: "Orders",
		icon: ClipboardListIcon,
		title: "No orders yet",
		description: "Active orders and order recommendations will appear here.",
	},
	{
		id: "discharge",
		label: "Discharge",
		icon: DoorOpenIcon,
		title: "No discharge plan yet",
		description: "Social needs and referrals for discharge will appear here.",
	},
	{
		id: "epic",
		label: "Epic",
		icon: HospitalIcon,
		title: "Nothing from Epic yet",
		description: "The patient's record in Epic will appear here, where the hospital allows it.",
	},
	{
		id: "notes",
		label: "Notes",
		icon: FileTextIcon,
		title: "No notes yet",
		description: "Notes from the hospital's record and Intercept notes will appear here, newest first.",
	},
	{
		id: "sepsis",
		label: "Sepsis",
		icon: HeartCrackIcon,
		title: "No sepsis screening yet",
		description: "Screening criteria, validation and bundle tracking for this patient will appear here.",
	},
	{
		id: "camera",
		label: "Camera view",
		icon: VideoIcon,
		title: "Camera is off",
		description: "The bedside camera will appear here when you start a video consult.",
	},
];

const DAY = 24 * 60 * 60_000;

/** "ICU day 3": the day of the ICU stay, counting the first as day 1. */
const icuDay = (since: string, now: number) => Math.floor((now - Date.parse(since)) / DAY) + 1;

/** The Patient Header's badges: safety first, in words (PRD PD-011), then the patient's tags. */
/** "Full code": no limit on resuscitation, every patient's default. */
const isFullCode = (codeStatus?: string) => codeStatus?.trim().toLowerCase() === "full code";

function patientBadges(patient: PatientDetailsPatient, record?: PatientRecord): NonNullable<PatientHeaderProps["tags"]> {
	const allergies = record?.allergies;
	// A card tag that repeats the record's code status or isolation ("DNR", "Contact isolation") shows once, as the
	// safety badge.
	const shown = [record?.codeStatus, record?.isolation].map((label) => label?.toLowerCase());
	// intercept.ds `Patient Header` (`1191:3147`, Nov 5, 2026): every tag is Badge `outline` (PatientHeader's default),
	// the words carry the meaning (PRD PD-011); the interventions come first, then the safety tags.
	return [
		// Every flag opens its popover here too.
		...(patient.tags ?? [])
			.filter(({ label }) => !shown.includes(label.toLowerCase()))
			.map(({ label, details }) => ({ label, details: details ?? flagDetails(label, record) })),
		// The safety badges open what's behind them too, as every flag does (Nov 5, 2026, user's call): the code status
		// order, the allergy list, the isolation order, or "Nothing more on this in the record".
		// Full code, the default (everything is done if the heart or breathing stops), isn't a tag (Nov 5, 2026, user's
		// call): only a limit on it (DNR, DNR/DNI) or not knowing it changes what the team does.
		...[
			...(isFullCode(record?.codeStatus) ? [] : [record?.codeStatus ?? "Code status unknown"]),
			allergies === undefined
				? "Allergies unknown"
				: allergies.length
					? `${allergies.length === 1 ? "Allergy" : "Allergies"}: ${allergies.join(", ")}`
					: "No known allergies",
			...(record?.isolation ? [record.isolation] : []),
		].map((label) => ({ label, details: flagDetails(label, record) })),
	];
}

/** The bar's alert pill from the patient's open alerts, as on the cards: the worst severity and how many are open. */
function alertPill(alerts: TriageAlert[]): PatientHeaderProps["alert"] {
	const open = alerts.filter(isOpenAlert).sort(compareTriageAlerts);
	return open.length ? { variant: open[0].severity, count: open.length } : undefined;
}

/** The header's alert box breakdown: the patient's open alerts by severity ("1 critical · 1 low"). */
function alertCountsBySeverity(alerts: TriageAlert[]): NonNullable<PatientHeaderProps["alertCounts"]> {
	const counts: NonNullable<PatientHeaderProps["alertCounts"]> = {};
	for (const alert of alerts.filter(isOpenAlert)) counts[alert.severity] = (counts[alert.severity] ?? 0) + 1;
	return counts;
}

/** The Create menu, the header's "+" (PRD PD-014; Nov 9, 2026, user's call: out of "…"). */
const createActions: { label: string; icon: LucideIcon; action: PatientAction }[] = [
	{ label: "New note", icon: FilePenLineIcon, action: "new-note" },
	{ label: "Prepare handoff", icon: ArrowRightLeftIcon, action: "handoff" },
];

/** The "…" menu's own items, after the patient's actions (PRD PD-014 More). */
const moreActions: { label: string; icon: LucideIcon; action: PatientAction }[] = [
	{ label: "Copy link", icon: LinkIcon, action: "copy-link" },
];

/** A section's content from the patient's record, or null when the record has nothing for it. */
function sectionContent(
	id: Exclude<SectionId, "overview">,
	{
		patient,
		record,
		monitor,
		onAction,
		onDischargeDecision,
		onShowSection,
	}: Pick<PatientDetailsProps, "patient" | "record" | "monitor" | "onAction" | "onDischargeDecision"> & {
		onShowSection: (id: SectionId) => void;
	},
): React.ReactNode {
	switch (id) {
		case "vitals":
			return record?.vitals ? <VitalsSection vitals={record.vitals} monitor={monitor} /> : null;
		case "chart":
			return record?.chart ? <ChartSection chart={record.chart} /> : null;
		case "timeline":
			// The activity log on the events lane, so each decision lines up with the vitals.
			return record?.timeline ? (
				<TimelineSection
					timeline={withActivityEvents(record.timeline, record.activity)}
					lastViewedAt={record.brief?.lastViewedAt}
				/>
			) : null;
		case "medications":
			// An infusion's pump values are on the Timeline.
			return record?.medications ? (
				<MedicationsSection medications={record.medications} onShowPumpValues={() => onShowSection("timeline")} />
			) : null;
		case "orders":
			return record?.orders ? <OrdersSection orders={record.orders} /> : null;
		case "discharge":
			return record?.discharge ? (
				<DischargePlanPanel plan={record.discharge} onDecision={onDischargeDecision} headingLevel='h2' className='max-w-2xl' />
			) : null;
		case "epic":
			return record?.emr ? <EpicSection emr={record.emr} /> : null;
		case "notes":
			return record?.notes ? <NotesSection notes={record.notes} onNewNote={() => onAction?.("new-note")} /> : null;
		case "sepsis":
			return record?.sepsis ? <SepsisSection sepsis={record.sepsis} /> : null;
		case "camera":
			return record?.camera ? (
				<CameraSection
					patient={patient}
					camera={record.camera}
					vitals={monitor?.vitals}
					infusions={record.infusions}
					ventilator={record.ventilator}
				/>
			) : null;
	}
}

const patientName = (patient: Pick<PatientDetailsPatient, "lastName" | "firstName">) =>
	`${patient.lastName}, ${patient.firstName}`;

/* -------------------------------------------------------------------------- */
/* PatientDetails                                                             */
/* -------------------------------------------------------------------------- */

/**
 * One patient's page (PRD Patient details): the Patient Header, then the sections as Line tabs (PD-OD-02), Overview first.
 * Stepping to another patient keeps the section and announces the new patient to screen readers (PD-015). The page is
 * in the patient's consult session (`consult-session.tsx`), so its panels, its Care plan and the alert panel share the
 * call, the thread and the pathway.
 */
function PatientDetails(props: PatientDetailsProps) {
	return (
		<ConsultSessionScope patientId={props.patient.id}>
			<PatientDetailsContent {...props} />
		</ConsultSessionScope>
	);
}

/** The page, inside the patient's consult session (`PatientDetails`). */
function PatientDetailsContent({
	patient,
	tone,
	record,
	monitor,
	alerts = [],
	leftAlerts = [],
	escalationTargets = [],
	onAlertAction,
	onAction,
	onDischargeDecision,
	consult,
	defaultConsult,
	defaultPathway,
	pathways,
}: PatientDetailsProps) {
	const [section, setSection] = React.useState<SectionId>("overview");
	// The pathway the Overview shows: the first alert's, where it is now (the session's, as the panels have it, or the
	// app's), and the way to it: the page's Pathway panel, or the alert without one.
	const navigation = usePatientNavigation();
	const openPathwayPanel = useOpenPathwayPanel();
	const openAlertsPanel = useOpenAlertsPanel();
	const alertPathway = useAlertPathwayPanel();
	const pathwayDetail = pathways?.details[0];
	const [pathwayStatus] = useSessionState<CarePathwayStatus>(
		pathwaySessionKey(pathwayDetail?.alert.id ?? "", "status"),
		pathwayDetail?.pathwayStatus ?? "suggested",
	);
	const overviewPathway = pathwayDetail
		? {
				detail: pathwayDetail,
				status: pathwayStatus,
				// The page's Pathway panel; without one (no consult), the alert, with its pathway (back Nov 11, 2026).
				onOpen: consult
					? openPathwayPanel
					: navigation
						? () => navigation.openAlert(patient.id, pathwayDetail.alert.id)
						: undefined,
			}
		: undefined;
	// Sepsis is a section only while the patient is under screening or tracking (PRD PD-080), Discharge only once the
	// discharge workflow has flagged social needs (Scenario 2, step 6).
	// The hospital's record section is named after its system (Epic, Meditech…).
	const sections = pendingSections
		.filter((item) => item.id !== "sepsis" || patient.sepsisWatch)
		.filter((item) => item.id !== "discharge" || record?.discharge)
		.map((item) =>
			item.id === "epic" && record?.emr
				? { ...item, label: record.emr.name, title: `Nothing from ${record.emr.name} yet` }
				: item,
		);
	const shownSection = sections.some((item) => item.id === section) ? section : "overview";

	// A switch is announced, so it's never mistaken for an update; the first patient isn't (the page title says it).
	const [announcement, setAnnouncement] = React.useState("");
	const now = useCurrentMinute();
	const details = [
		record?.icuAdmittedAt && now !== null ? `ICU day ${icuDay(record.icuAdmittedAt, now)}` : undefined,
		record?.weight,
	].filter((detail): detail is string => Boolean(detail));
	// The header's "View breakdown" and "View alerts" open the Overview and bring the card into view, with focus on it.
	const { prefersReducedMotion } = useMotionPreference();
	const showOverviewCard = (id: string) => {
		setSection("overview");
		requestAnimationFrame(() => {
			const card = document.getElementById(id);
			card?.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
			card?.focus({ preventScroll: true });
		});
	};
	const shownId = React.useRef(patient.id);
	React.useEffect(() => {
		if (shownId.current === patient.id) return;
		shownId.current = patient.id;
		setAnnouncement(`${patientName(patient)}${patient.mrn ? `, MRN ${patient.mrn}` : ""}`);
	}, [patient]);

	return (
		<main data-patient-id={patient.id} className='flex flex-1 flex-col'>
			<p aria-live='polite' className='sr-only'>
				{announcement}
			</p>
			{/* Keyed by patient: switching patient ends the call and closes both panels. */}
			{consult ? (
				<PatientConsultPanels
					key={patient.id}
					data={consult}
					defaultConsult={defaultConsult}
					defaultPathway={defaultPathway}
					pathways={pathways}
					onOpenConsult={() => onAction?.("video-consult")}
					onOpenMessages={() => onAction?.("messages")}
				/>
			) : null}
			{/* The header's View alerts opens every alert here, the unresolved at the top (Nov 9, 2026, user's call). */}
			<PatientAlertsPanel>
				<AlertsSection
					id='patient-alerts-list'
					patientId={patient.id}
					alerts={alerts}
					// Every alert the patient had stays here (Nov 10, 2026, user's call): the ones the feed resolved, then the
					// record's history.
					history={[...leftAlerts, ...(record?.alertHistory ?? [])]}
					escalationTargets={escalationTargets}
					onAlertAction={onAlertAction}
					allResolved
					// Each alert that comes with a pathway opens it right of the panel, Alerts staying open.
					pathwayAlertIds={pathways?.details.map((detail) => detail.alert.id)}
					pathwayShownId={alertPathway.shownAlertId}
					onTogglePathway={alertPathway.toggle}
				/>
			</PatientAlertsPanel>
			{/* 16px below the app header and above the tabs: the header's own padding (intercept.ds `1191:3147`). */}
			<PatientHeader
				lastName={patient.lastName}
				firstName={patient.firstName}
				photo={record?.photo}
				initials={patientInitials(patient)}
				tone={tone ?? avatarTone(patient.id)}
				mrn={patient.mrn}
				sex={patient.sex}
				age={patient.age}
				hospital={patient.hospital}
				unit={patient.unit}
				room={patient.room}
				bed={patient.bed}
				details={details}
				// Fall risk's link opens the fall prevention pathway in the page's Pathway panel (Nov 10, 2026, user's call).
				tags={withFallPathwayLink(
					patientBadges(patient, record),
					patient.id,
					alerts,
					consult && pathways
						? (alertId) => {
								if (alertPathway.shownAlertId !== alertId) alertPathway.toggle(alertId);
							}
						: undefined,
				)}
				acuity={patient.acuity}
				trajectory={patient.trajectory}
				alert={alertPill(alerts)}
				alertCounts={alertCountsBySeverity(alerts)}
				onViewAlerts={openAlertsPanel}
			/>

			<Tabs
				value={shownSection}
				onValueChange={(value) => setSection(value as SectionId)}
				className='flex flex-1 flex-col gap-0'
			>
				<div className='border-y border-border px-4'>
					<TabsList variant='line' size='lg' aria-label='Patient sections'>
						<TabsTrigger value='overview'>Overview</TabsTrigger>
						{sections.map((item) => (
							<TabsTrigger key={item.id} value={item.id}>
								{item.label}
							</TabsTrigger>
						))}
					</TabsList>
				</div>
				<TabsContent value='overview' className='p-6'>
					<PatientOverview
						patient={patient}
						record={record}
						monitor={monitor}
						onShowSection={setSection}
						pathway={overviewPathway}
					/>
				</TabsContent>
				{sections.map((item) => {
					const content = sectionContent(item.id, {
						patient,
						record,
						monitor,
						onAction,
						onDischargeDecision,
						onShowSection: setSection,
					});
					// Keyed by patient, so a section's local state (an open form, an accepted recommendation) never
					// carries over to the next patient. Block, not flex: the sections are size containers, which a flex
					// row would shrink to nothing.
					return content ? (
						<TabsContent key={`${item.id}-${patient.id}`} value={item.id} className='p-6'>
							{content}
						</TabsContent>
					) : (
						<TabsContent key={item.id} value={item.id} className='flex flex-1 p-6'>
							<EmptyState
								className='m-auto py-16'
								headingLevel='h2'
								icon={<item.icon aria-hidden='true' />}
								title={item.title}
								description={item.description}
							/>
						</TabsContent>
					);
				})}
			</Tabs>
		</main>
	);
}

/* -------------------------------------------------------------------------- */
/* Assembling a patient for the shell                                         */
/* -------------------------------------------------------------------------- */

type PatientDetailsSources = {
	/** The census's patients: identity, location, acuity and tags. */
	patients?: PatientDetailsPatient[];
	/** The monitoring panel's patients: live values, and identity for a patient the census doesn't list. */
	monitoringPatients?: (Omit<PatientDetailsPatient, "sepsisWatch"> & PatientMonitorData)[];
	records?: PatientRecord[];
	alerts?: TriageAlert[];
	escalationTargets?: EscalationTarget[];
	onAlertAction?: (alertId: string, action: TriageAlertAction) => void;
	onAction?: (patientId: string, action: PatientAction) => void;
	/** A referral in a patient's Discharge section, by patient. */
	onDischargeDecision?: (patientId: string, decision: DischargeDecision) => void;
	/** Each patient's video consult and thread with the bedside nurse, for the page's Video consult and Messages panels. */
	consults?: PatientConsultData[];
	/**
	 * The alerts' details, as the alert panel shows them: a patient's alerts that come with a pathway give their page's
	 * Pathway panel and Care plan (Nov 6, 2026).
	 */
	alertDetails?: AlertDetailData[];
	/** A pathway accepted, declined or written on a patient's page, by alert, as from the alert panel. */
	onPathwayDecision?: (alertId: string, decision: CarePathwayDecision, detail: AlertDetailData) => void;
	/** Keep or transfer decided on a patient's page, by alert. */
	onTransferDecision?: (alertId: string, decision: KeepOrTransferDecision, detail: AlertDetailData) => void;
	/** A sepsis bundle check confirmed or undone on a patient's page, by alert. */
	onBundleDecision?: (alertId: string, decision: BundleDecision) => void;
};

/**
 * The patient's consult with the bedside connection their alert carries (its photos: the BiPAP screen, the blood gases;
 * low-bandwidth mode), when the consult has none of its own. The pathway is decided on this page since Nov 10, 2026, so
 * what the bedside sends with its beats (Scenario 2's resolution) has to reach this page's thread too.
 */
function withAlertConnection(consult: PatientConsultData | undefined, details: AlertDetailData[]) {
	const connection = details.find((detail) => detail.connection)?.connection;
	return consult && connection && !consult.connection ? { ...consult, connection } : consult;
}

/**
 * A patient's alerts that come with a pathway, a sepsis bundle or a protocol, with each alert as it stands now: the
 * open ones first, most urgent first (the alert their cards show), then the rest, newest first.
 */
function patientPathwayDetails(patientId: string, details: AlertDetailData[], alerts: TriageAlert[]) {
	return details
		.filter((detail) => detail.alert.patientId === patientId && (detail.pathway || detail.bundle || detail.protocol))
		.map((detail) => ({ ...detail, alert: alerts.find((alert) => alert.id === detail.alert.id) ?? detail.alert }))
		.sort(
			(a, b) =>
				Number(isOpenAlert(b.alert)) - Number(isOpenAlert(a.alert)) ||
				(isOpenAlert(a.alert) ? compareTriageAlerts(a.alert, b.alert) : b.alert.firedAt.localeCompare(a.alert.firedAt)),
		);
}

/**
 * A patient's details for the shell's `renderPatientDetails`: their name for the breadcrumb and the page, from the
 * census, the monitoring panel and the patient's record. Null for a patient none of them has.
 */
function patientDetailsView(
	patientId: string,
	// The shell's previous / next isn't shown (Intercept-Live's Patient Header has none); its list feeds the app header's
	// patient list instead.
	stepper: PatientStepper,
	{
		patients = [],
		monitoringPatients = [],
		records = [],
		alerts = [],
		escalationTargets,
		onAlertAction,
		onAction,
		onDischargeDecision,
		consults = [],
		alertDetails = [],
		onPathwayDecision,
		onTransferDecision,
		onBundleDecision,
	}: PatientDetailsSources,
): PatientDetailsView | null {
	const find = (id?: string) => patients.find((item) => item.id === id) ?? monitoringPatients.find((item) => item.id === id);
	const patient = find(patientId);
	if (!patient) return null;
	const live = monitoringPatients.find((item) => item.id === patientId);
	const {
		vitals: _vitals,
		limits: _limits,
		alarmPriorities: _alarmPriorities,
		acknowledgedAlarms: _acknowledgedAlarms,
		trends: _trends,
		...identity
	} = patient as PatientDetailsPatient & PatientMonitorData;

	const act = (action: PatientAction) => () => onAction?.(patientId, action);
	const pathwayDetails = patientPathwayDetails(patientId, alertDetails, alerts);

	// The list the patient was opened from, as the source page shows it (PRD PD-015). Patients none of the sources has
	// are left out.
	const patientList = stepper.list
		?.map((id) => find(id))
		.filter((item): item is NonNullable<typeof item> => Boolean(item))
		.map((item) => ({
			id: item.id,
			name: patientName(item),
			location: [item.unit, item.bed, item.hospital].filter(Boolean).join(" · "),
			alert: alertPill(alerts.filter((alert) => alert.patientId === item.id)),
			acuity: item.acuity,
		}));

	return {
		name: patientName(patient),
		patientList,
		tags: patient.tags?.map((tag) => tag.label),
		headerActions: {
			// Video consult and Messages are in the app header since Nov 5, 2026 (intercept.ds `1169:319`, user's call). With
			// the patient's consult, the page runs them instead (its panels, the thread's unread count; `consult-panels.tsx`).
			onVideoConsult: act("video-consult"),
			onOpenMessages: act("messages"),
			unreadMessages: records.find((item) => item.id === patientId)?.unreadMessages,
			onRaiseConcern: act("raise-concern"),
			onHuddleTeam: act("huddle-team"),
			onEscalate: act("escalate"),
			moreActions: moreActions.map(({ label, icon, action }) => ({ label, icon, onSelect: act(action) })),
			createActions: createActions.map(({ label, icon, action }) => ({ label, icon, onSelect: act(action) })),
			// The patient's care team, after "…" (intercept.ds `1169:319`, Nov 5, 2026, user's call).
			team: records
				.find((item) => item.id === patientId)
				?.careTeam?.map(({ name, initials, src, tone }) => ({ name, initials, src, tone })),
			onOpenTeam: act("care-team"),
		},
		content: (
			<PatientDetails
				patient={identity}
				tone={avatarTones([...patients, ...monitoringPatients]).get(patientId)}
				record={records.find((item) => item.id === patientId)}
				monitor={
					live
						? {
								vitals: live.vitals,
								limits: live.limits,
								alarmPriorities: live.alarmPriorities,
								acknowledgedAlarms: live.acknowledgedAlarms,
								trends: live.trends,
							}
						: undefined
				}
				alerts={alerts.filter((alert) => alert.patientId === patientId)}
				// Alerts the feed resolved drop out of `alerts`; their details keep them, so the Alerts panel still lists them.
				leftAlerts={alertDetails
					.filter((detail) => detail.alert.patientId === patientId && !alerts.some((alert) => alert.id === detail.alert.id))
					.map((detail): TriageAlert => ({ ...detail.alert, status: "resolved" }))}
				escalationTargets={escalationTargets}
				onAlertAction={onAlertAction}
				onAction={onAction ? (action) => onAction(patientId, action) : undefined}
				onDischargeDecision={onDischargeDecision ? (decision) => onDischargeDecision(patientId, decision) : undefined}
				consult={withAlertConnection(
					consults.find((item) => item.patientId === patientId),
					pathwayDetails,
				)}
				defaultConsult={stepper.consult === "answered" ? "live" : undefined}
				defaultPathway={stepper.pathway}
				pathways={
					pathwayDetails.length
						? {
								details: pathwayDetails,
								onPathwayDecision,
								onTransferDecision,
								onBundleDecision,
								onDischargeDecision: onDischargeDecision && ((decision) => onDischargeDecision(patientId, decision)),
							}
						: undefined
				}
			/>
		),
	};
}

export {
	PatientDetails,
	patientDetailsView,
	type CareTeamMember,
	type PatientDetailsPatient,
	type PatientDetailsProps,
	type PatientDetailsSources,
	type PatientInfusion,
	type PatientFallRisk,
	type PatientAllergy,
	type PatientCodeStatusOrder,
	type PatientIsolationOrder,
	type PatientEcmo,
	type PatientLab,
	type PatientAction,
	type PatientBrief,
	type PatientMonitorData,
	type PatientEarlyWarning,
	type PatientFinding,
	type PatientFluids,
	type PatientRecord,
	type PatientVentilator,
	type VentilatorSetting,
};
