import * as React from "react";
import {
	ActivityIcon,
	ArrowRightLeftIcon,
	BookOpenIcon,
	ChartSplineIcon,
	ClipboardListIcon,
	FileTextIcon,
	FilePenLineIcon,
	HeartCrackIcon,
	HospitalIcon,
	LinkIcon,
	MessageCircleMoreIcon,
	PillIcon,
	VideoIcon,
	type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/buttons/button";
import type { PatientCardProps } from "@/components/cards/patient-card";
import type { MonitorLimits, MonitorTrends, MonitorVitals } from "@/components/cards/patient-monitoring-card";
import type { AvatarFallbackProps } from "@/components/data-display/avatar";
import { PatientHeader, type PatientHeaderProps } from "@/components/data-display/patient-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/navigation/tabs";
import { useCurrentMinute } from "@/lib/hooks/use-current-minute";

import type { PatientDetailsView, PatientStepper } from "../intercept-live";
import { compareTriageAlerts, isOpenAlert, type EscalationTarget, type TriageAlert, type TriageAlertAction } from "../monitoring/triage-queue";
import { usePatientNavigation } from "../patient-navigation";
import aiAskIcon from "./images/ai-ask.svg";
import { PatientOverview } from "./patient-overview";
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
// tabs, and the Overview's AI brief. The Overview's other blocks and the other sections (`sections/`) are from the PRD
// (§5–§12) until Figma draws them. A section the record has no data for shows an empty state saying what it will hold.

/* -------------------------------------------------------------------------- */
/* Data shapes (the app's API fills these)                                    */
/* -------------------------------------------------------------------------- */

/** Who the patient is and where, as the Census and Monitoring know them. */
type PatientDetailsPatient = Pick<
	PatientCardProps,
	"lastName" | "firstName" | "mrn" | "sex" | "age" | "hospital" | "unit" | "room" | "bed" | "acuity" | "trajectory" | "tags"
> & {
	id: string;
	/** Under sepsis screening or tracking: adds the Sepsis section (PRD PD-080). */
	sepsisWatch?: boolean;
};

/** A ventilator setting: the measured value, and the set value when the two differ (e.g. tidal volume, rate). */
type VentilatorSetting = { label: string; value: string; unit?: string; set?: string };

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
	text: string;
	/** How many sources it was written from. */
	sourceCount: number;
	/** When the data behind it last changed. */
	updatedAt: string;
	/** When the signed-in clinician last viewed the patient. */
	lastViewedAt?: string;
};

/** What the page knows about the patient beyond the card: safety, encounter, organ support, labs and care team. */
type PatientRecord = {
	id: string;
	/** Photo URL, for the Patient Header's avatar. */
	photo?: string;
	/** Preformatted, e.g. "64 kg". */
	weight?: string;
	/** Unread messages in the patient's thread. */
	unreadMessages?: number;
	brief?: PatientBrief;
	/** "Full code", "DNR", "DNR/DNI". Missing reads "Code status unknown", never blank (PRD PD-011). */
	codeStatus?: string;
	/** An empty list reads "No known allergies"; missing reads "Allergies unknown". */
	allergies?: string[];
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
};

/** The patient's live bedside values, from Monitoring. */
type PatientMonitorData = { vitals?: MonitorVitals; limits?: Partial<MonitorLimits>; trends?: MonitorTrends };

type PatientDetailsProps = {
	patient: PatientDetailsPatient;
	record?: PatientRecord;
	monitor?: PatientMonitorData;
	/** The patient's alerts, for the Overview's alerts (PRD PD-020). */
	alerts?: TriageAlert[];
	escalationTargets?: EscalationTarget[];
	onAlertAction?: (alertId: string, action: TriageAlertAction) => void;
	/** A patient action (Messages here; the app header's Raise concern, Escalate…). The prototype only reports it. */
	onAction?: (action: PatientAction) => void;
};

/* -------------------------------------------------------------------------- */
/* Product content                                                            */
/* -------------------------------------------------------------------------- */

/** The patient's actions (PRD PD-014): the app header's, the "…" menu's, and the Patient Header's Live Camera, Messages and Ask Intercept. */
type PatientAction =
	| "raise-concern"
	| "huddle-team"
	| "live-camera"
	| "ask-intercept"
	| "escalate"
	| "messages"
	| "new-note"
	| "handoff"
	| "copy-link";

type SectionId =
	| "overview"
	| "vitals"
	| "chart"
	| "timeline"
	| "medications"
	| "orders"
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
		description: "The bedside camera will appear here when you start Live Camera.",
	},
];

const DAY = 24 * 60 * 60_000;

/** "ICU day 3": the day of the ICU stay, counting the first as day 1. */
const icuDay = (since: string, now: number) => Math.floor((now - Date.parse(since)) / DAY) + 1;

/** The Patient Header's badges: safety first, in words (PRD PD-011), then the patient's tags. */
function patientBadges(patient: PatientDetailsPatient, record?: PatientRecord): NonNullable<PatientHeaderProps["tags"]> {
	const allergies = record?.allergies;
	// A card tag that repeats the record's code status or isolation ("DNR", "Contact isolation") shows once, as the
	// safety badge.
	const shown = [record?.codeStatus, record?.isolation].map((label) => label?.toLowerCase());
	return [
		record?.codeStatus ? { label: record.codeStatus, variant: "outline" } : { label: "Code status unknown" },
		allergies === undefined
			? { label: "Allergies unknown" }
			: allergies.length
				? { label: `${allergies.length === 1 ? "Allergy" : "Allergies"}: ${allergies.join(", ")}`, variant: "red" }
				: { label: "No known allergies", variant: "outline" },
		...(record?.isolation ? [{ label: record.isolation, variant: "amber" as const }] : []),
		...(patient.tags ?? []).filter(({ label }) => !shown.includes(label.toLowerCase())).map(({ label }) => ({ label })),
	];
}

/** The bar's alert pill from the patient's open alerts, as on the cards: the worst severity and how many are open. */
function alertPill(alerts: TriageAlert[]): PatientHeaderProps["alert"] {
	const open = alerts.filter(isOpenAlert).sort(compareTriageAlerts);
	return open.length ? { variant: open[0].severity, count: open.length } : undefined;
}

/** The "…" menu (PRD PD-014 More). */
const moreActions: { label: string; icon: LucideIcon; action: PatientAction }[] = [
	{ label: "New note", icon: FilePenLineIcon, action: "new-note" },
	{ label: "Prepare handoff", icon: ArrowRightLeftIcon, action: "handoff" },
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
		onShowSection,
	}: Pick<PatientDetailsProps, "patient" | "record" | "monitor" | "onAction"> & { onShowSection: (id: SectionId) => void },
): React.ReactNode {
	switch (id) {
		case "vitals":
			return record?.vitals ? <VitalsSection vitals={record.vitals} monitor={monitor} /> : null;
		case "chart":
			return record?.chart ? <ChartSection chart={record.chart} /> : null;
		case "timeline":
			return record?.timeline ? <TimelineSection timeline={record.timeline} lastViewedAt={record.brief?.lastViewedAt} /> : null;
		case "medications":
			// An infusion's pump values are on the Timeline.
			return record?.medications ? (
				<MedicationsSection medications={record.medications} onShowPumpValues={() => onShowSection("timeline")} />
			) : null;
		case "orders":
			return record?.orders ? <OrdersSection orders={record.orders} /> : null;
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
 * Stepping to another patient keeps the section and announces the new patient to screen readers (PD-015).
 */
function PatientDetails({
	patient,
	record,
	monitor,
	alerts = [],
	escalationTargets = [],
	onAlertAction,
	onAction,
}: PatientDetailsProps) {
	const [section, setSection] = React.useState<SectionId>("overview");
	// Sepsis is a section only while the patient is under screening or tracking (PRD PD-080).
	const sections = pendingSections.filter((item) => item.id !== "sepsis" || patient.sepsisWatch);
	const shownSection = sections.some((item) => item.id === section) ? section : "overview";

	// A switch is announced, so it's never mistaken for an update; the first patient isn't (the page title says it).
	const [announcement, setAnnouncement] = React.useState("");
	const navigation = usePatientNavigation();
	const now = useCurrentMinute();
	const details = [
		record?.icuAdmittedAt && now !== null ? `ICU day ${icuDay(record.icuAdmittedAt, now)}` : undefined,
		record?.weight,
	].filter((detail): detail is string => Boolean(detail));
	const unread = record?.unreadMessages;
	const messagesLabel = unread === undefined ? undefined : `${unread} ${unread === 1 ? "message" : "messages"}`;
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
			{/* 16px below the app header and above the tabs (Intercept-Live's Top Container). */}
			<PatientHeader
				lastName={patient.lastName}
				firstName={patient.firstName}
				photo={record?.photo}
				initials={`${patient.lastName[0] ?? ""}${patient.firstName?.[0] ?? ""}`}
				mrn={patient.mrn}
				sex={patient.sex}
				age={patient.age}
				hospital={patient.hospital}
				unit={patient.unit}
				room={patient.room}
				bed={patient.bed}
				alert={alertPill(alerts)}
				acuity={patient.acuity}
				trajectory={patient.trajectory}
				details={details}
				tags={patientBadges(patient, record)}
				actions={
					<>
						<Button variant='outline' onClick={() => onAction?.("live-camera")}>
							<VideoIcon aria-hidden='true' />
							Live Camera
						</Button>
						<Button
							variant='neutral'
							onClick={() => onAction?.("messages")}
							aria-label={messagesLabel ? `${messagesLabel} unread` : undefined}
						>
							<MessageCircleMoreIcon aria-hidden='true' />
							{messagesLabel ?? "Messages"}
						</Button>
						{/* Ask Intercept about this patient (PRD PD-100; PD-OD-04 answered with the shell's chat panel). Outside
						    the shell there's no panel, so the action is only reported. */}
						<Button
							variant='outline'
							size='icon-md'
							aria-label={`Ask Intercept about ${patientName(patient)}`}
							onClick={() => {
								navigation?.openAskIntercept();
								onAction?.("ask-intercept");
							}}
						>
							<img src={aiAskIcon} alt='' className='size-[18px]' />
						</Button>
					</>
				}
				className='mt-4'
			/>

			<Tabs
				value={shownSection}
				onValueChange={(value) => setSection(value as SectionId)}
				className='mt-4 flex flex-1 flex-col gap-0'
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
						alerts={alerts}
						escalationTargets={escalationTargets}
						onAlertAction={onAlertAction}
					/>
				</TabsContent>
				{sections.map((item) => {
					const content = sectionContent(item.id, { patient, record, monitor, onAction, onShowSection: setSection });
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
};

/**
 * A patient's details for the shell's `renderPatientDetails`: their name for the breadcrumb and the page, from the
 * census, the monitoring panel and the patient's record. Null for a patient none of them has.
 */
function patientDetailsView(
	patientId: string,
	// The shell's previous / next isn't shown: Intercept-Live's Patient Header has none (Oct 28, 2026).
	_stepper: PatientStepper,
	{ patients = [], monitoringPatients = [], records = [], alerts = [], escalationTargets, onAlertAction, onAction }: PatientDetailsSources,
): PatientDetailsView | null {
	const find = (id?: string) => patients.find((item) => item.id === id) ?? monitoringPatients.find((item) => item.id === id);
	const patient = find(patientId);
	if (!patient) return null;
	const live = monitoringPatients.find((item) => item.id === patientId);
	const { vitals: _vitals, limits: _limits, trends: _trends, ...identity } = patient as PatientDetailsPatient & PatientMonitorData;

	const act = (action: PatientAction) => () => onAction?.(patientId, action);

	return {
		name: patientName(patient),
		headerActions: {
			onRaiseConcern: act("raise-concern"),
			onHuddleTeam: act("huddle-team"),
			onEscalate: act("escalate"),
			moreActions: moreActions.map(({ label, icon, action }) => ({ label, icon, onSelect: act(action) })),
		},
		content: (
			<PatientDetails
				patient={identity}
				record={records.find((item) => item.id === patientId)}
				monitor={live ? { vitals: live.vitals, limits: live.limits, trends: live.trends } : undefined}
				alerts={alerts.filter((alert) => alert.patientId === patientId)}
				escalationTargets={escalationTargets}
				onAlertAction={onAlertAction}
				onAction={onAction ? (action) => onAction(patientId, action) : undefined}
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
	type PatientLab,
	type PatientAction,
	type PatientBrief,
	type PatientMonitorData,
	type PatientRecord,
	type PatientVentilator,
	type VentilatorSetting,
};
