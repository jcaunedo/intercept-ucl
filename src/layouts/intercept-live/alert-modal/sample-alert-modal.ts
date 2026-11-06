import type { CensusPatient } from "../census/census-panel";
import type { MonitoringPatient, TriageAlert } from "../monitoring/monitoring";
import { sampleMonitoringPatients, sampleScenario1Monitoring, sampleScenario2Monitoring } from "../monitoring/sample-monitoring";
import type { PatientRecord } from "../patient-details/patient-details";
import { sampleCameraVideo } from "../sample-data/sample-camera-video";
import { avatarTones, patientInitials } from "../shared/patient-avatar";
import type { AlertDetailData, PatientConsultData } from "./alert-modal";
import type { CarePathway, CarePathwayCosigner, CarePathwayOrder } from "./care-pathway";
import { sampleBedsideThread } from "./sample-bedside-messages";
import { sampleBedsideReplier } from "./sample-bedside-replies";
import { sampleConsultTranscript } from "./sample-consult-transcript";

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
		hospital: "Chadron",
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
	// The flag her findings open from in the alert panel: her alert's title is the score.
	flag: "CHF exacerbation",
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
	// What the notetaker hears: Kayla, Margaret herself, then the plan for tonight.
	transcript: sampleConsultTranscript({ patientId: "p15", firstName: "Margaret", sex: "F", nurse: "Kayla Brandt" }),
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
		source: "Chadron tonight, and the regional transfer center",
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

/**
 * Dale Reynolds's alert in Scenario 2 (Demo Use Cases, "COPD respiratory failure during a blizzard"), opened: the
 * Alliance ED's consult request at 22:15, with the same numbers as his record, monitor and card (`sample-scenario-2.ts`).
 * Step 1 is the consult; step 3, keep or transfer with air grounded and the road closed; step 4, the COPD pathway's NIV
 * checkpoints and the intubation plan prepared in advance. Doses, settings and checkpoints are illustrative until
 * Intercept's COPD protocol is reviewed (the scenario's "Clinical review needed").
 */
const sampleScenario2AlertDetail = (): AlertDetailData => {
	const monitor = sampleScenario2Monitoring();
	return {
		alert: {
			id: "live-reynolds",
			patientId: "p21",
			severity: "critical",
			title: "ED consult: hypercapnic respiratory failure",
			reason: "pH 7.24 and PaCO₂ 78 on arrival, severe COPD, on BiPAP",
			source: { kind: "manual", name: "ED consult request" },
			firedAt: new Date().toISOString(),
		},
		patient: {
			lastName: "Reynolds",
			firstName: "Dale",
			initials: "RD",
			tone: 2,
			sex: "M",
			age: 64,
			mrn: "00973518",
			hospital: "Alliance",
			unit: "ED",
			bed: "Bay 3",
		},
		inLast24h: 1,
		acuity: monitor.acuity,
		trajectory: monitor.trajectory,
		monitor: { vitals: monitor.vitals, limits: monitor.limits, alarmPriorities: monitor.alarmPriorities },
		reasons: [
			{
				label: "Hypercapnic respiratory failure",
				lead: "pH 7.24",
				detail: "PaCO₂ 78, PaO₂ 58, HCO₃ 33 on arrival, 30 min ago. His last PaCO₂ at discharge was 55",
			},
			{ label: "Severe COPD", lead: "GOLD 3", detail: "40 pack-years, home oxygen 2 L, out of it for 4 days" },
			{ label: "On BiPAP", detail: "20 min, IPAP 12 / EPAP 5, FiO₂ 35%. RR 30, HR 112, SpO₂ 88% (target 88–92%)" },
		],
		// The flag his findings open from in the alert panel.
		flag: "COPD exacerbation",
		// As on his card.
		tags: [{ label: "NIV" }],
		history: [
			{
				label: "Home meds",
				items: [
					{ name: "Tiotropium", detail: "18 mcg inhaled daily" },
					{ name: "Fluticasone-salmeterol", detail: "250/50 mcg twice a day" },
					{ name: "Albuterol", detail: "as needed, every 1–2 h this week" },
					{ name: "Home oxygen", detail: "2 L/min, ran out 4 days ago" },
				],
			},
			{
				label: "Chest X-ray",
				value: "Hyperinflation, no pneumothorax or consolidation",
				detail: "35 min ago, Alliance ED",
				severity: "low",
			},
			{ label: "ABG", value: "pH 7.24 · PaCO₂ 78", detail: "On arrival · baseline PaCO₂ about 55 (2025)", severity: "critical" },
			{ label: "Bicarbonate", value: "33 mmol/L", detail: "Chronic CO₂ retention, compensated · normal 22–26", severity: "low" },
		],
		bedside: { name: "Megan Foster", role: "RN", initials: "MF", tone: 6, presence: "online", activity: "At the bedside" },
		// What the notetaker hears, on audio only: Megan, Rachel at the BiPAP, then his wife.
		transcript: sampleConsultTranscript({ patientId: "p21", firstName: "Dale", sex: "M", nurse: "Megan Foster" }),
		room: { airway: "niv", pumps: 0 },
		video: sampleCameraVideo,
		pathway: {
			title: "COPD exacerbation pathway",
			source: "Reference protocol, COPD exacerbation with hypercapnia (configurable per hospital)",
			orders: [
				{
					id: "bipap",
					name: "BiPAP",
					dose: "IPAP 14 / EPAP 5 cmH₂O, FiO₂ 35%",
					detail: "Target SpO₂ 88–92%. Raise IPAP by 2 if PaCO₂ isn't falling at 1 h",
					evidence: "pH 7.24, PaCO₂ 78, RR 30/min on IPAP 12",
				},
				{
					id: "bronchodilators",
					name: "Ipratropium-albuterol",
					dose: "3 mL nebulized in line every 20 min × 3, then every 4 h",
					detail: "Through the BiPAP circuit",
					evidence: "wheeze, RR 30/min",
				},
				{
					id: "steroids",
					name: "Methylprednisolone IV",
					dose: "40 mg every 24 h for 5 days",
					detail: "Switch to prednisone by mouth once off BiPAP",
				},
				{
					id: "antibiotic",
					name: "Azithromycin IV",
					dose: "500 mg every 24 h",
					detail: "Purulent sputum; sputum culture sent",
					evidence: "green sputum for 3 days, WBC 12.8",
				},
				{
					id: "intubation",
					name: "Intubation readiness",
					dose: "Checklist done; ventilator set to AC, VT 450 mL, rate 14, PEEP 5, FiO₂ 40%",
					detail: "Prepared with Dr. Keller now, used only if NIV fails at a checkpoint",
				},
			],
			cosigner: { name: "Dr. Brian Keller", role: "ED physician" },
		},
		// Step 3: the plan's needs against what Alliance has tonight, and a transfer nobody can make: air is grounded and
		// the highway is closed. So the plan is to stabilize here, with the checkpoints as the failure plan: miss one and he's
		// intubated here, with the settings prepared in the pathway.
		transfer: {
			hospital: "Alliance",
			source: "Alliance tonight, the regional transfer center and road and weather reports",
			needs: [
				{ id: "bipap", label: "BiPAP", available: "On him now; a second machine in respiratory", status: "met" },
				{ id: "rt", label: "Respiratory therapist", available: "Rachel Lindgren, RRT, at the bedside", status: "met" },
				{ id: "airway", label: "Intubation if NIV fails", available: "Dr. Keller in the ED, airway cart and a ventilator ready", status: "met" },
				{ id: "monitoring", label: "Continuous monitoring", available: "ED Bay 3, then a monitored step-down bed", status: "met" },
				{ id: "rn", label: "Nurse capacity", available: "2 ED nurses; Megan Foster stays with him for the first 2 h", status: "limited" },
			],
			receiving: [
				{
					id: "regional-west",
					name: "Regional West Medical Center",
					place: "Scottsbluff, NE · 60 mi",
					bed: "ICU, 1 bed open",
					accepting: true,
				},
			],
			transport: [
				{ id: "air", label: "Air", status: "Grounded by the storm · no flights until it clears", available: false },
				{ id: "ground", label: "Ground", status: "Highway to Scottsbluff closed · ETA unknown", available: false },
			],
			checkpoints: [
				{ id: "1h", after: 60, criteria: "Repeat ABG: pH rising and PaCO₂ falling; mental status and work of breathing no worse" },
				{ id: "2h", after: 120, criteria: "Repeat ABG: pH 7.30 or more, or still rising; alert; RR under 25" },
			],
		},
	};
};

/**
 * Dale Reynolds's alert at Scenario 2's resolution (2 h on NIV): both checkpoints passed with his repeat gases, and no
 * transfer was needed (the scenario's metrics: NIV success without intubation, transfer not required). The cost is a
 * placeholder until it's sourced.
 */
function sampleScenario2ResolvedDetail(detail: AlertDetailData): AlertDetailData {
	if (!detail.transfer) return detail;
	const [oneHour, twoHours, ...rest] = detail.transfer.checkpoints;
	return {
		...detail,
		pathwayStatus: "active",
		transfer: {
			...detail.transfer,
			checkpoints: [
				{ ...oneHour, result: { status: "passed", detail: "pH 7.28, PaCO₂ 70, RR 24, more alert" } },
				{ ...twoHours, result: { status: "passed", detail: "pH 7.31, PaCO₂ 64, RR 21, alert, speaking in full sentences" } },
				...rest,
			],
			outcome: { distance: "60 mi each way, on a closed road", cost: "$ to be sourced", careHours: "2 h of NIV, no intubation" },
		},
	};
}

const airways = { Invasive: "ventilator", NIV: "niv", Oxygen: "oxygen" } as const;

type SampleVitals = MonitoringPatient["vitals"];


// No thread starts with a message (Nov 5, 2026, user's call: "If I am initiating the messages interaction, no incoming
// message should be there"): the clinician writes first, and the nurse's replies (`scriptedReplies`) follow. Scenario 2's
// beats add the ED's messages as they play (`sample-scenario-2.ts`), and each opens the Messages column.

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

type SamplePatients = {
	censusPatients?: CensusPatient[];
	monitoringPatients?: MonitoringPatient[];
	records?: PatientRecord[];
};

/**
 * What the alert panel shows about a patient, alert or not: who they are (from their card), their score, monitor and
 * tags as their cards show them now, and who a video consult reaches (their bedside nurse) in which room (from their
 * record).
 */
function samplePatientParts(
	patientId: string,
	{ censusPatients = [], monitoringPatients = [], records = [] }: SamplePatients,
	tones: Map<string, PatientConsultData["patient"]["tone"]>,
): PatientConsultData | undefined {
	const monitored = monitoringPatients.find((item) => item.id === patientId);
	const patient = censusPatients.find((item) => item.id === patientId) ?? monitored;
	if (!patient) return undefined;
	const record = records.find((item) => item.id === patientId);
	const nurse = record?.careTeam?.find((member) => member.role === "Bedside nurse");
	const support = record?.ventilator?.support;
	return {
		patientId,
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
		tags: monitored?.tags ?? patient.tags,
		acuity: monitored?.acuity ?? patient.acuity,
		trajectory: monitored?.trajectory ?? patient.trajectory,
		monitor: monitored
			? {
					vitals: monitored.vitals,
					limits: monitored.limits,
					alarmPriorities: monitored.alarmPriorities,
					acknowledgedAlarms: monitored.acknowledgedAlarms,
				}
			: undefined,
		bedside: nurse
			? { name: nurse.name, role: "RN", initials: nurse.initials, src: nurse.src, tone: nurse.tone, presence: nurse.presence ?? "online", activity: "At the bedside" }
			: undefined,
		// What the notetaker hears on the call: the nurse's update, the plan, the family (`sample-consult-transcript.ts`).
		transcript: nurse
			? sampleConsultTranscript({
					patientId,
					firstName: patient.firstName,
					lastName: patient.lastName,
					sex: patient.sex,
					vitals: monitored?.vitals,
					nurse: nurse.name,
					record,
				})
			: undefined,
		// The nurse answers what the clinician writes, with the patient's live numbers (`sample-bedside-replies.ts`).
		scriptedReplies: nurse
			? sampleBedsideReplier({
					firstName: patient.firstName,
					sex: patient.sex,
					vitals: monitored?.vitals,
					ventilated: (monitored?.tags ?? patient.tags)?.some((tag) => tag.label === "Ventilated"),
				})
			: undefined,
		room: {
			airway: support && support in airways ? airways[support as keyof typeof airways] : "none",
			pumps: Math.min(4, record?.infusions?.length ?? 0),
		},
		video: sampleCameraVideo,
		// The messages the nurse wrote before the page opened, as many as the record counts unread.
		messages: record?.unreadMessages
			? sampleBedsideThread({
					patientId,
					firstName: patient.firstName,
					sex: patient.sex,
					vitals: monitored?.vitals,
					count: record.unreadMessages,
				})
			: undefined,
	};
}

/**
 * Each patient's video consult without an alert (Nov 4, 2026, user's call), what a card's Video consult opens when the
 * patient has no active alert: the patient and who the call reaches, as their alerts' details have them.
 */
function samplePatientConsults(patients: SamplePatients): PatientConsultData[] {
	const { censusPatients = [], monitoringPatients = [] } = patients;
	const tones = avatarTones([...censusPatients, ...monitoringPatients]);
	const ids = [...new Set([...censusPatients, ...monitoringPatients].map((patient) => patient.id))];
	return ids.flatMap((id) => samplePatientParts(id, patients, tones) ?? []);
}

// The scenarios' alerts, written out in full: Hayes's (Scenario 1) and Reynolds's (Scenario 2).
const scenarioAlertDetails: Record<string, () => AlertDetailData> = {
	"live-hayes": sampleScenario1AlertDetail,
	"live-reynolds": sampleScenario2AlertDetail,
};

/**
 * A detail for each alert: the scenarios' alerts (Hayes's Scenario 1, Reynolds's Scenario 2) from their own samples;
 * the rest from the patient's card (identity, location, avatar), their record (bedside nurse, the room's equipment) and
 * the alert's own evidence. Only the scenarios' have the reason line explained and the history and labs; every alert
 * has a suggested pathway (`samplePathway`).
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
						// For the last hour's trends, which the monitor shows in low-bandwidth mode.
						trends: monitored.trends,
					}
				: undefined,
		};
		const scenarioDetail = scenarioAlertDetails[alert.id];
		if (scenarioDetail) {
			const scenario = scenarioDetail();
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
					scriptedReplies:
						scenario.scriptedReplies ??
						sampleBedsideReplier({
							firstName: scenario.patient.firstName,
							sex: scenario.patient.sex,
							vitals: live.monitor?.vitals ?? scenario.monitor?.vitals,
							scenario: alert.id === "live-reynolds" ? "copd" : alert.id === "live-hayes" ? "chf" : undefined,
							ventilated: (live.tags ?? scenario.tags)?.some((tag) => tag.label === "Ventilated"),
						}),
					messages: scenario.messages,
				},
			];
		}
		const parts = samplePatientParts(alert.patientId, { censusPatients, monitoringPatients, records }, tones);
		if (!patient || !parts) return [];
		const { patientId: _patientId, ...shared } = parts;
		const record = records.find((item) => item.id === alert.patientId);
		const attending = record?.careTeam?.find((member) => member.role === "Attending of record");
		const cosigner: CarePathwayCosigner = attending
			? { name: `Dr. ${attending.name}`, role: "attending of record" }
			: { name: "the attending of record", role: patient.hospital ?? "at the hospital" };
		return [
			{
				alert,
				...shared,
				reasons: [],
				history: [],
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

export {
	sampleAlertDetails,
	samplePatientConsults,
	sampleScenario1AlertDetail,
	sampleScenario1ResolvedDetail,
	sampleScenario2AlertDetail,
	sampleScenario2ResolvedDetail,
};
