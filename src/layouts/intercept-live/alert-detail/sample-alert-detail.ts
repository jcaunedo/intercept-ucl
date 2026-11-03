import type { CensusPatient } from "../census/census-panel";
import type { MonitoringPatient, TriageAlert } from "../monitoring/monitoring";
import { sampleMonitoringPatients, sampleScenario1Monitoring } from "../monitoring/sample-monitoring";
import type { PatientRecord } from "../patient-details/patient-details";
import { sampleCameraVideo } from "../sample-data/sample-camera-video";
import { avatarTones, patientInitials } from "../shared/patient-avatar";
import type { AlertDetailData } from "./alert-detail";
import type { CarePathway, CarePathwayCosigner, CarePathwayOrder } from "./care-pathway";

// Margaret Hayes's alert at 01:40 in Scenario 1 (Demo Use Cases), opened: the same numbers as her record, monitor and
// card after the Prototype menu's beat 1 (`sample-scenario-1.ts`). A function, so the alert fires as it opens.
// `sampleAlertDetails` gives every other alert in the feed a detail from the patient's card and record, for the
// prototype's alert modal.

// Her bed's alarm limits and priorities.
const hayesMonitor = sampleMonitoringPatients.find((patient) => patient.id === "p15");

const sampleScenario1AlertDetail = (): AlertDetailData => ({
	alert: {
		id: "live-hayes",
		patientId: "p15",
		severity: "critical",
		title: "NEWS2 10, High: up 5 in 4 h",
		reason: "Rising work of breathing, positive fluid balance, HFrEF",
		source: { kind: "rule", name: "Deterioration score" },
		firedAt: new Date().toISOString(),
	},
	patient: {
		lastName: "Hayes",
		firstName: "Margaret",
		initials: "HM",
		tone: 8,
		sex: "F",
		age: 72,
		mrn: "00826154",
		hospital: "Chadron Community Hospital",
		unit: "Med-Surg",
		bed: "Bed 4",
	},
	inLast24h: 3,
	acuity: sampleScenario1Monitoring.acuity,
	trajectory: sampleScenario1Monitoring.trajectory,
	monitor: {
		vitals: sampleScenario1Monitoring.vitals,
		limits: hayesMonitor?.limits,
		alarmPriorities: hayesMonitor?.alarmPriorities,
	},
	reasons: [
		{ label: "Rising work of breathing", detail: "RR 18 → 26/min, SpO₂ 94% → 89%, now on 4 L/min" },
		{
			label: "Positive fluid balance",
			detail: "Net +1.8 L, weight +2.1 kg over 48 h on IV furosemide. Chest X-ray 19 h ago: pulmonary vascular congestion, small bilateral effusions",
		},
		{ label: "HFrEF", lead: "EF 25%", detail: "two admissions this year" },
	],
	// As on her card.
	tags: [{ label: "Fall risk" }],
	history: [
		{
			label: "Home meds",
			items: [
				{ name: "Furosemide", detail: "40 mg PO daily (now IV)" },
				{ name: "Carvedilol", detail: "6.25 mg BID" },
				{ name: "Sacubitril-valsartan", detail: "24/26 mg BID" },
				{ name: "Spironolactone", detail: "12.5 mg daily (held)" },
			],
		},
		{
			label: "Last echo",
			value: "EF 25%, dilated LV with global hypokinesis",
			detail: "Moderate functional MR, PASP 48 mmHg · 4 months ago, Regional West",
			severity: "low",
		},
		{ label: "Creatinine", value: "1.6 → 1.9 mg/dL", detail: "On admission → 75 min ago · baseline 1.5 (CKD 3)", severity: "critical" },
		{ label: "BNP", value: "2,400 pg/mL", detail: "Up from 1,850 on admission · normal < 100", severity: "critical" },
	],
	bedside: { name: "Kayla Brandt", role: "RN", initials: "KB", tone: 5, presence: "online", activity: "At the bedside" },
	room: { airway: "oxygen", pumps: 1 },
	video: sampleCameraVideo,
	// Step 4: BiPAP, escalated IV diuretic with a urine-output target, and nitrate if blood pressure allows. Doses and
	// settings are illustrative until clinical review; the protocol is the hospital's (BR-15).
	pathway: {
		title: "CHF exacerbation pathway",
		source: "Reference protocol, CHF exacerbation (configurable per hospital)",
		orders: [
			{
				id: "bipap",
				name: "BiPAP",
				dose: "IPAP 10 / EPAP 5 cmH₂O, FiO₂ 40%",
				detail: "Target SpO₂ ≥ 92%, RR under 24",
				evidence: "SpO₂ 89% on 4 L, RR 26/min",
			},
			{
				id: "furosemide",
				name: "Furosemide IV",
				dose: "80 mg IV bolus, then 10 mg/h infusion",
				detail: "Target urine output ≥ 100 mL/h over the next 2 h",
				evidence: "net +1.8 L and +2.1 kg in 48 h on 40 mg IV, BNP 2,400 pg/mL",
			},
			{
				id: "nitroglycerin",
				name: "Nitroglycerin IV",
				dose: "10 mcg/min, up 10 mcg/min every 5 min",
				detail: "Only while SBP ≥ 110 mmHg (now 148)",
				evidence: "SBP 148 mmHg",
			},
		],
		// Her attending of record at Chadron, the family physician on call from home tonight.
		cosigner: { name: "Dr. Tom Weller", role: "family physician on call" },
	},
	// Step 5: what the plan needs against what Chadron has tonight, and the transfer it would take. The checkpoints follow
	// the pathway's targets. Capacities, times and the second receiving hospital are illustrative; the checkpoints need
	// clinical review.
	transfer: {
		hospital: "Chadron",
		source: "Chadron Community Hospital tonight, and the regional transfer center",
		needs: [
			{
				id: "bipap",
				label: "BiPAP",
				available: "1 machine, free in the ER",
				status: "met",
			},
			{
				id: "rt",
				label: "Respiratory therapist",
				available: "On call from home, 20 min away",
				status: "met",
			},
			{
				id: "vitals",
				label: "Hourly vitals",
				available: "Kayla Brandt, RN, and the bedside monitor",
				status: "met",
			},
			{
				id: "rn",
				label: "Nurse capacity",
				available: "1 RN for the floor's 9 patients; the on-call nurse can come in",
				status: "limited",
			},
		],
		receiving: [
			{
				id: "regional-west",
				name: "Regional West Medical Center",
				place: "Scottsbluff, NE · 100 mi",
				bed: "ICU, 2 beds open",
				accepting: true,
			},
			{
				id: "rapid-city",
				name: "Monument Health Rapid City Hospital",
				place: "Rapid City, SD · 105 mi",
				bed: "ICU, 1 bed open",
				accepting: true,
			},
		],
		transport: [
			{
				id: "ground",
				label: "Ground",
				status: "Chadron's ambulance · about 2 h to Scottsbluff",
				available: true,
			},
			{
				id: "air",
				label: "Air",
				status: "35 min to launch, then a 40 min flight",
				available: true,
			},
		],
		checkpoints: [
			{ id: "1h", after: 60, criteria: "RR under 24 and SpO₂ ≥ 92% on BiPAP" },
			{
				id: "4h",
				after: 240,
				criteria: "Urine output ≥ 100 mL/h, SBP ≥ 100 mmHg, RR and SpO₂ holding",
			},
		],
	},
});

const airways = { Invasive: "ventilator", NIV: "niv", Oxygen: "oxygen" } as const;

type SampleVitals = MonitoringPatient["vitals"];

// A reading for an order's "Based on", or nothing when the monitor doesn't have it.
const reading = (label: string, value: number | undefined, unit: string) =>
	value === undefined ? undefined : `${label} ${value}${unit}`;
const readings = (...items: (string | undefined)[]) => items.filter(Boolean).join(", ") || undefined;

/**
 * A suggested pathway for every alert (user's call, Nov 2, 2026: "suggest always a pathway"): the reference protocol
 * for the alert's kind, matched on its source and title, with the patient's own readings as the evidence. An alert
 * that matches none gets a bedside reassessment. Made up for the prototype; the doses need clinical review.
 */
function samplePathway(alert: TriageAlert, vitals: SampleVitals | undefined, cosigner: CarePathwayCosigner): CarePathway {
	const v = vitals ?? {};
	const source = (name: string) => `Reference protocol, ${name} (configurable per hospital)`;
	const pathway = (title: string, protocol: string, orders: CarePathwayOrder[]): CarePathway => ({
		title,
		source: source(protocol),
		orders,
		cosigner,
	});
	const title = alert.title.toLowerCase();
	const evidence = alert.evidence?.[0];

	switch (alert.source.name) {
		case "Sepsis Sniffer":
			return pathway("Sepsis bundle, hour 1", "Surviving Sepsis hour-1 bundle", [
				{ id: "cultures", name: "Blood cultures × 2", dose: "Two sets, two sites", detail: "Before the first antibiotic dose", evidence },
				{
					id: "antibiotics",
					name: "Piperacillin-tazobactam IV",
					dose: "4.5 g IV over 30 min, then every 6 h",
					detail: "Within 1 h of recognition",
					evidence: alert.evidence?.[2],
				},
				{
					id: "fluids",
					name: "Lactated Ringer's IV",
					dose: "30 mL/kg over 3 h",
					detail: "Reassess after each liter; stop for signs of overload",
					evidence: alert.evidence?.[1] ?? reading("MAP", v.map, " mmHg"),
				},
				{ id: "lactate", name: "Repeat lactate", dose: "In 2 h", detail: "Target a fall of 10% or more", evidence },
			]);
		case "Hemodynamics":
			return pathway("Hypotension pathway", "hypotension", [
				{
					id: "bolus",
					name: "Lactated Ringer's IV bolus",
					dose: "500 mL over 15 min",
					detail: "Reassess MAP after; repeat once if it rises",
					evidence: readings(reading("MAP", v.map, " mmHg"), reading("HR", v.hr, "/min")),
				},
				{
					id: "norepinephrine",
					name: "Norepinephrine IV",
					dose: "Start at 0.05 mcg/kg/min, titrate every 5 min",
					detail: "Target MAP ≥ 65 mmHg",
					evidence: reading("MAP", v.map, " mmHg"),
				},
				{ id: "lactate", name: "Lactate", dose: "Now", detail: "Repeat in 2 h if above 2 mmol/L" },
			]);
		case "Vasopressors":
			return pathway("Escalating vasopressor pathway", "refractory shock", [
				{
					id: "vasopressin",
					name: "Vasopressin IV",
					dose: "0.03 units/min, fixed",
					detail: "Added to norepinephrine above 0.25 mcg/kg/min",
					evidence: readings(alert.title, reading("MAP", v.map, " mmHg")),
				},
				{
					id: "hydrocortisone",
					name: "Hydrocortisone IV",
					dose: "50 mg IV every 6 h",
					detail: "While on two vasopressors",
				},
				{ id: "echo", name: "Bedside echo", dose: "Now", detail: "Check for cardiac function and volume status" },
			]);
		case "Oxygenation":
			return pathway("Hypoxemia pathway", "acute hypoxemia", [
				{
					id: "hfnc",
					name: "High-flow nasal cannula",
					dose: "40 L/min, FiO₂ 50%",
					detail: "Target SpO₂ 92–96%; titrate FiO₂ down first",
					evidence: readings(reading("SpO₂", v.spo2, "%"), reading("RR", v.rr, "/min")),
				},
				{ id: "abg", name: "Arterial blood gas", dose: "Now, and 1 h after the change" },
				{ id: "cxr", name: "Chest X-ray, portable", dose: "Now", detail: "Look for a new infiltrate, effusion or pneumothorax" },
			]);
		case "Vent-Order Mismatch":
			return pathway("Ventilator order check", "ventilator safety", [
				{
					id: "peep",
					name: "PEEP",
					dose: "Set to 10 cmH₂O, as ordered",
					detail: "Respiratory therapist confirms at the ventilator",
					evidence: alert.evidence?.join(" · "),
				},
				{ id: "abg", name: "Arterial blood gas", dose: "30 min after the change", evidence: reading("SpO₂", v.spo2, "%") },
			]);
		case "Bed sensor":
			return pathway("Fall prevention pathway", "fall prevention", [
				{ id: "bed", name: "Bed low and locked, exit alarm on", dose: "Now and at every handoff", evidence: alert.title },
				{ id: "rounding", name: "Hourly rounding", dose: "Toileting, pain and position every hour" },
				{ id: "delirium", name: "Delirium screen (CAM-ICU)", dose: "Now, then every shift", detail: "Restlessness can be the first sign" },
				{ id: "pt", name: "Physical therapy consult", dose: "Mobility and transfer assessment" },
			]);
		case "Pulse oximeter":
			return pathway("Monitoring check", "continuous monitoring", [
				{ id: "probe", name: "Reapply SpO₂ probe", dose: "Now, another site if the waveform stays poor" },
				{ id: "spotcheck", name: "SpO₂ spot check", dose: "Every 15 min until the signal holds" },
			]);
		case "Nursing":
			return pathway("Vitals monitoring", "nursing assessment", [
				{ id: "vitals", name: "Full set of vitals", dose: "Now", detail: "HR, BP, RR, SpO₂, temperature, pain" },
				{ id: "frequency", name: "Vitals frequency", dose: "Every hour × 4, then per unit routine" },
			]);
	}
	if (title.includes("heart rate"))
		return pathway("Tachycardia pathway", "sustained tachycardia", [
			{ id: "ecg", name: "12-lead ECG", dose: "Now", detail: "Sinus or not; rule out a new arrhythmia", evidence: reading("HR", v.hr, "/min") },
			{ id: "labs", name: "Potassium, magnesium, CBC", dose: "Now", detail: "Replace K to ≥ 4.0, Mg to ≥ 2.0" },
			{ id: "causes", name: "Bedside assessment", dose: "Pain, fever, volume, bleeding", evidence: reading("MAP", v.map, " mmHg") },
		]);
	if (title.includes("respiratory rate"))
		return pathway("Respiratory distress pathway", "acute respiratory distress", [
			{ id: "abg", name: "Arterial blood gas", dose: "Now", evidence: readings(reading("RR", v.rr, "/min"), reading("SpO₂", v.spo2, "%")) },
			{ id: "cxr", name: "Chest X-ray, portable", dose: "Now" },
			{ id: "hfnc", name: "High-flow nasal cannula", dose: "40 L/min, FiO₂ 40%", detail: "Only if SpO₂ falls under 92%" },
		]);
	return pathway("Bedside reassessment", "early deterioration", [
		{
			id: "assess",
			name: "Bedside assessment by the nurse",
			dose: "Now",
			detail: "Report back by video consult",
			evidence: evidence ?? readings(reading("HR", v.hr, "/min"), reading("MAP", v.map, " mmHg")),
		},
		{ id: "vitals", name: "Vitals", dose: "Every 15 min × 4" },
	]);
}

/**
 * A detail for each alert: Hayes's Scenario 1 alert from `sampleScenario1AlertDetail`; the rest from the patient's card
 * (identity, location, avatar), their record (bedside nurse, the room's equipment) and the alert's own
 * evidence. Only Hayes's has the reason line explained and the history and labs; every alert has a suggested pathway
 * (`samplePathway`).
 */
function sampleAlertDetails({
	alerts,
	censusPatients = [],
	monitoringPatients = [],
	records = [],
}: {
	alerts: TriageAlert[];
	censusPatients?: CensusPatient[];
	monitoringPatients?: MonitoringPatient[];
	records?: PatientRecord[];
}): AlertDetailData[] {
	const tones = avatarTones([...censusPatients, ...monitoringPatients]);
	return alerts.flatMap((alert): AlertDetailData[] => {
		const monitored = monitoringPatients.find((item) => item.id === alert.patientId);
		const patient = censusPatients.find((item) => item.id === alert.patientId) ?? monitored;
		// The score row, the monitor and the tags as the patient's cards show them now.
		const live: Partial<AlertDetailData> = {
			tags: monitored?.tags ?? patient?.tags,
			acuity: monitored?.acuity ?? patient?.acuity,
			trajectory: monitored?.trajectory ?? patient?.trajectory,
			monitor: monitored
				? {
						vitals: monitored.vitals,
						limits: monitored.limits,
						alarmPriorities: monitored.alarmPriorities,
						acknowledgedAlarms: monitored.acknowledgedAlarms,
					}
				: undefined,
		};
		if (alert.id === "live-hayes") {
			const scenario = sampleScenario1AlertDetail();
			return [
				{
					...scenario,
					// The page's alerts give the count in the last 24 h.
					inLast24h: undefined,
					acuity: live.acuity ?? scenario.acuity,
					trajectory: live.trajectory ?? scenario.trajectory,
					monitor: live.monitor ?? scenario.monitor,
					tags: live.tags ?? scenario.tags,
					alert,
					patient: { ...scenario.patient, tone: tones.get(alert.patientId) ?? scenario.patient.tone },
				},
			];
		}
		if (!patient) return [];
		const record = records.find((item) => item.id === alert.patientId);
		const nurse = record?.careTeam?.find((member) => member.role === "Bedside nurse");
		const attending = record?.careTeam?.find((member) => member.role === "Attending of record");
		const cosigner: CarePathwayCosigner = attending
			? { name: `Dr. ${attending.name}`, role: "attending of record" }
			: { name: "the attending of record", role: patient.hospital ?? "at the hospital" };
		const support = record?.ventilator?.support;
		return [
			{
				alert,
				patient: {
					lastName: patient.lastName,
					firstName: patient.firstName,
					photo: patient.photo,
					initials: patientInitials(patient),
					tone: tones.get(patient.id),
					sex: patient.sex,
					age: patient.age,
					mrn: patient.mrn,
					hospital: patient.hospital,
					unit: patient.unit,
					bed: patient.bed,
				},
				...live,
				reasons: [],
				history: [],
				bedside: nurse
					? { name: nurse.name, role: "RN", initials: nurse.initials, src: nurse.src, tone: nurse.tone, presence: nurse.presence ?? "online", activity: "At the bedside" }
					: undefined,
				room: {
					airway: support && support in airways ? airways[support as keyof typeof airways] : "none",
					pumps: Math.min(4, record?.infusions?.length ?? 0),
				},
				video: sampleCameraVideo,
				pathway: samplePathway(alert, monitored?.vitals, cosigner),
			},
		];
	});
}

/**
 * Hayes's alert at Scenario 1's resolution (06:00): the pathway active, both checkpoints passed with her readings, and
 * the transfer avoided (the scenario's metrics; the cost is a placeholder until it's sourced). Applied over her detail
 * once she's kept at Chadron.
 */
function sampleScenario1ResolvedDetail(detail: AlertDetailData): AlertDetailData {
	if (!detail.transfer) return detail;
	const [oneHour, fourHours, ...rest] = detail.transfer.checkpoints;
	return {
		...detail,
		pathwayStatus: "active",
		transfer: {
			...detail.transfer,
			checkpoints: [
				{ ...oneHour, result: { status: "passed", detail: "RR 22, SpO₂ 94% on BiPAP" } },
				{ ...fourHours, result: { status: "passed", detail: "Urine output 140 mL/h, SBP 128, RR 20, SpO₂ 95% on 2 L" } },
				...rest,
			],
			outcome: { distance: "100 mi each way", cost: "$ to be sourced", careHours: "4 h 20 min" },
		},
	};
}

export { sampleAlertDetails, sampleScenario1AlertDetail, sampleScenario1ResolvedDetail };
