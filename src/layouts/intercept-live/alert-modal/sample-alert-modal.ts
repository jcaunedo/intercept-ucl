import type { CensusPatient } from "../census/census-panel";
import type { MonitoringPatient, TriageAlert } from "../monitoring/monitoring";
import {
	sampleMonitoringPatients,
	sampleScenario1Monitoring,
	sampleScenario2Monitoring,
	sampleScenario3Monitoring,
	sampleScenario4Monitoring,
} from "../monitoring/sample-monitoring";
import type { PatientRecord } from "../patient-details/patient-details";
import { sampleCameraVideo } from "../sample-data/sample-camera-video";
import { avatarTones, patientInitials } from "../shared/patient-avatar";
import type { AlertDetailData, PatientConsultData } from "./alert-modal";
import type { BedsideTasks } from "./bedside-tasks";
import type { CarePathway, CarePathwayCosigner, CarePathwayOrder } from "./care-pathway";
import type { DischargePlan } from "./discharge-plan";
import type { DkaProtocol, DkaRules } from "./dka-protocol";
import type { SepsisBundle } from "./sepsis-bundle";
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
		hospital: "Chadron Memorial",
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
			hospital: "Alliance Community",
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

/* -------------------------------------------------------------------------- */
/* Scenario 3: Rosa Medina, septic shock at Sidney ED                         */
/* -------------------------------------------------------------------------- */

const minutesFromNow = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();

/**
 * Rosa Medina's hour-1 bundle at the screen (Scenario 3, step 1): time zero is now; the lactate behind the screen is
 * already in, so it starts green. The antibiotic carries the renal dose review for her eGFR of 22, the fluids the
 * fluid-tolerance check for her CKD (step 4). 30 mL/kg × 68 kg is 2,040 mL. Doses are illustrative until clinical review.
 */
const sampleScenario3Bundle = (startedAt: string): SepsisBundle => ({
	source: "Surviving Sepsis Campaign hour-1 bundle (configurable per hospital)",
	startedAt,
	startedBy: "Sepsis Sniffer, confirmed by Jenna Collins, NP",
	sharedWith: "Sidney ED",
	elements: [
		{
			id: "lactate",
			label: "Lactate",
			target: "Measure now; repeat if over 2 mmol/L",
			status: "complete",
			result: "3.8 mmol/L",
			documented: { by: "Lab, Sidney", at: new Date(Date.parse(startedAt) - 22 * 60_000).toISOString() },
		},
		{
			id: "cultures",
			label: "Blood cultures before antibiotics",
			target: "2 sets, from 2 sites, before the first antibiotic dose",
			status: "pending",
		},
		{
			id: "antibiotics",
			label: "Broad-spectrum antibiotics",
			target: "Piperacillin-tazobactam IV, first dose now",
			status: "pending",
			check: {
				label: "Renal dose review",
				reason: "eGFR 22, CKD stage 4",
				suggestion:
					"Give the first dose in full, 4.5 g IV. Then 2.25 g every 6 h for a CrCl of about 27 mL/min (68 kg, creatinine 2.6).",
				source: "Pharmacy rule, renal dosing (configurable per hospital)",
				confirm: true,
			},
		},
		{
			id: "fluids",
			label: "Crystalloid 30 mL/kg",
			target: "Lactated Ringer's in 500 mL boluses, reassessed after each",
			status: "pending",
			fluids: { perKg: 30, weight: 68, boluses: [] },
			check: {
				label: "Fluid-tolerance check",
				reason: "CKD stage 4, at risk of fluid overload",
				suggestion:
					"Before each next bolus: lung sounds, SpO₂, RR, neck veins and edema. Stop and call the hub for new crackles, SpO₂ falling or RR rising.",
				source: "Sidney sepsis protocol (configurable per hospital)",
			},
		},
		{
			id: "repeat-lactate",
			label: "Repeat lactate",
			target: "Within 2 h, because the first was over 2",
			status: "pending",
			dueAfter: 120,
		},
	],
});

/**
 * Step 5: MAP stays under 65 after 2,040 mL, so the pathway suggests peripheral norepinephrine per protocol, with the
 * insulin infusion for her glucose (step 6), the renal maintenance dose and amlodipine held. Jenna Collins, NP, who
 * leads at the bedside, co-signs. Illustrative until Intercept's peripheral vasopressor protocol is reviewed.
 */
const sampleScenario3Pathway = (): CarePathway => ({
	title: "Septic shock after fluids",
	source: "Reference protocol, septic shock with a peripheral vasopressor (configurable per hospital)",
	orders: [
		{
			id: "norepinephrine",
			name: "Norepinephrine, peripheral IV",
			dose: "Start 0.05 mcg/kg/min; up 0.02 every 5 min to MAP ≥ 65; at most 0.2 peripherally",
			detail: "18 g or larger, antecubital or above. IV site check every hour; central line above 0.2 or after 24 h",
			evidence: "MAP 62 after 2,040 mL",
		},
		{
			id: "insulin",
			name: "Insulin infusion, regular",
			dose: "Start 3 units/h per protocol",
			detail: "Glucose every hour, target 140–180 mg/dL; potassium every 4 h",
			evidence: "glucose 390 mg/dL, A1c 10.8%",
		},
		{
			id: "pip-tazo",
			name: "Piperacillin-tazobactam IV",
			dose: "2.25 g every 6 h, from 6 h after the first dose",
			detail: "Renal dose for a CrCl of about 27 mL/min",
			evidence: "eGFR 22",
		},
		{ id: "amlodipine", name: "Hold amlodipine", dose: "Until she's off norepinephrine" },
	],
	cosigner: { name: "Jenna Collins, NP", role: "hospitalist APP" },
});

/**
 * The bedside nurses' tasks the pathway's orders generate once accepted (step 5), the peripheral line's site checks
 * among them. Due times count from when the pathway is suggested.
 */
const sampleScenario3Tasks = (): BedsideTasks => ({
	sharedWith: "Sidney ED's nurses",
	source: "The accepted orders and Sidney's peripheral vasopressor protocol",
	tasks: [
		{
			id: "iv-site",
			title: "IV site check, norepinephrine",
			detail: "18 g, right antecubital: redness, swelling, blanching or pain. Stop the infusion and call if any.",
			every: "Every hour",
			from: "Norepinephrine, peripheral IV",
			assignee: "Ashley Brooks, RN",
			status: "open",
			dueAt: minutesFromNow(5),
		},
		{
			id: "blood-pressure",
			title: "Blood pressure while titrating",
			detail: "Every 5 min until MAP ≥ 65 holds 30 min, then every 15 min",
			every: "Every 5 min",
			from: "Norepinephrine, peripheral IV",
			assignee: "Ashley Brooks, RN",
			status: "open",
			dueAt: minutesFromNow(5),
		},
		{
			id: "glucose",
			title: "Glucose check",
			detail: "Fingerstick, entered so the insulin rate updates",
			every: "Every hour",
			from: "Insulin infusion, regular",
			assignee: "Kristen Webb, RN",
			status: "open",
			dueAt: minutesFromNow(60),
		},
		{
			id: "potassium",
			title: "Potassium",
			detail: "With the next labs; replace per protocol under 3.5",
			every: "Every 4 h",
			from: "Insulin infusion, regular",
			assignee: "Kristen Webb, RN",
			status: "open",
			dueAt: minutesFromNow(240),
		},
		{
			id: "urine-output",
			title: "Urine output",
			detail: "Call the hub if under 34 mL/h (0.5 mL/kg/h) for 2 h",
			every: "Every hour",
			from: "Septic shock after fluids",
			assignee: "Ashley Brooks, RN",
			status: "open",
			dueAt: minutesFromNow(60),
		},
	],
});

/**
 * Rosa Medina's alert in Scenario 3 (Demo Use Cases, "Sepsis in a patient with diabetes and kidney disease"), opened:
 * Sidney ED at 15:30, boarding because the inpatient unit is full, with Jenna Collins, NP leading and two nurses. The
 * Sepsis Sniffer flags probable septic shock from her vitals and lactate; the APP confirms it, which sets time zero and
 * starts the hour-1 bundle on both screens. The same numbers as her record, monitor and card (`sample-scenario-3.ts`).
 * She prefers Spanish, so the consult offers an interpreter. The pathway arrives with step 5, once fluids are in.
 */
const sampleScenario3AlertDetail = (firedAt = new Date().toISOString()): AlertDetailData => {
	const monitor = sampleScenario3Monitoring();
	return {
		alert: {
			id: "live-medina",
			patientId: "p23",
			severity: "critical",
			title: "Probable septic shock: hour-1 bundle started",
			reason: "BP 84/48 and lactate 3.8 with fever and a urinary source, on diabetes and CKD 4",
			source: { kind: "ai", name: "Sepsis Sniffer" },
			firedAt,
		},
		patient: {
			lastName: "Medina",
			firstName: "Rosa",
			initials: "MR",
			tone: 9,
			sex: "F",
			age: 58,
			mrn: "01147382",
			hospital: "Sidney Regional",
			unit: "ED",
			bed: "Bay 2",
			preferredLanguage: "Spanish",
		},
		inLast24h: 1,
		acuity: monitor.acuity,
		trajectory: monitor.trajectory,
		monitor: { vitals: monitor.vitals, limits: monitor.limits, alarmPriorities: monitor.alarmPriorities },
		reasons: [
			{ label: "Hypotension", lead: "BP 84/48", detail: "MAP 60, from 96/58 at triage 50 min ago. HR 124" },
			{ label: "Lactate 3.8", detail: "Drawn 45 min ago, resulted 22 min ago · normal under 2" },
			{ label: "Fever with a urinary source", lead: "39.4 °C", detail: "3 days of dysuria and left flank pain; urine nitrite positive" },
			{ label: "Diabetes and CKD 4", detail: "Glucose 390, A1c 10.8%. eGFR 22: doses and fluids need checking" },
		],
		flag: "Septic shock",
		tags: monitor.tags,
		history: [
			{
				label: "Home meds",
				items: [
					{ name: "Insulin glargine", detail: "20 units at bedtime" },
					{ name: "Insulin lispro", detail: "sliding scale with meals" },
					{ name: "Amlodipine", detail: "10 mg daily" },
					{ name: "Atorvastatin", detail: "40 mg daily" },
					{ name: "Sodium bicarbonate", detail: "650 mg twice a day" },
					{ name: "Calcitriol", detail: "0.25 mcg daily" },
				],
			},
			{ label: "Lactate", value: "3.8 mmol/L", detail: "22 min ago · normal < 2", severity: "critical" },
			{ label: "Creatinine", value: "2.6 mg/dL", detail: "eGFR 22 · baseline 2.4 (Aug 2026)", severity: "low" },
			{ label: "Glucose", value: "390 mg/dL", detail: "A1c 10.8% three weeks ago", severity: "critical" },
			{ label: "WBC", value: "18.6 K/µL", detail: "Urinalysis: nitrite +, leukocyte esterase 3+", severity: "critical" },
			{ label: "Allergy", value: "Sulfonamides", detail: "Rash" },
		],
		bedside: { name: "Ashley Brooks", role: "RN", initials: "AB", tone: 4, presence: "online", activity: "At the bedside" },
		interpreter: { name: "Lucía Herrera", role: "Medical interpreter, Spanish", initials: "LH", tone: 5 },
		transcript: sampleConsultTranscript({ patientId: "p23", firstName: "Rosa", sex: "F", nurse: "Ashley Brooks" }),
		room: { airway: "none", pumps: 1 },
		video: sampleCameraVideo,
		bundle: sampleScenario3Bundle(firedAt),
	};
};

/* -------------------------------------------------------------------------- */
/* Scenario 4: Tyler Kessler, DKA at Bridgeport                               */
/* -------------------------------------------------------------------------- */

/**
 * The DKA pathway the hub accepts to start the protocol (Scenario 4, step 1). Typical DKA protocol values, as the
 * Demo Use Cases give them, until Intercept's protocol replaces them. Derek Lawson, PA-C, Bridgeport's APP on call from
 * home, co-signs.
 */
const sampleScenario4Pathway = (): CarePathway => ({
	title: "DKA pathway",
	source: "Reference protocol, diabetic ketoacidosis (typical values until Intercept's protocol replaces them)",
	orders: [
		{
			id: "insulin",
			name: "Insulin infusion, regular",
			dose: "0.1 units/kg/h, 7 units/h; no bolus",
			detail: "The rate follows each hourly glucose: a fall of 50–75 mg/dL an hour",
			evidence: "glucose 520 mg/dL, pH 7.08",
		},
		{
			id: "fluids",
			name: "IV fluids",
			dose: "0.9% saline 1 L/h for 2 h, then 0.45% saline 250 mL/h",
			detail: "D5 0.45% saline at 150 mL/h once glucose is under 250",
			evidence: "BP 98/58, HR 122",
		},
		{
			id: "potassium",
			name: "Potassium, per protocol",
			dose: "None while over 5.2; KCl 20 mEq/L in fluids from 3.3 to 5.2",
			detail: "Under 3.3: hold insulin and give KCl 20 mEq/h IV",
			evidence: "K 5.6 mEq/L",
		},
		{
			id: "checks",
			name: "Hourly checks at the bedside",
			dose: "Glucose, potassium, anion gap, fluids and the insulin rate, every hour",
			detail: "A check 10 min overdue nudges the nurse and the hub's tele-RN",
			evidence: "One RN on the inpatient side tonight",
		},
	],
	cosigner: { name: "Derek Lawson, PA-C", role: "on-call APP" },
});

/** The protocol's thresholds: typical DKA values (Demo Use Cases, Scenario 4) until Intercept's protocol replaces them. */
const sampleDkaRules: DkaRules = {
	startPerKg: 0.1,
	targetFall: [50, 75],
	holdInsulinBelow: 3.3,
	noPotassiumAbove: 5.2,
	dextroseBelow: 250,
	dextrosePerKg: 0.05,
	dextroseRange: [150, 200],
	closedGap: 12,
	closedBicarbonate: 15,
};

/** Tyler Kessler's DKA protocol as it starts, before the first check (step 1). 70 kg. */
const sampleScenario4Protocol = (startedAt: string): DkaProtocol => ({
	title: "DKA insulin protocol",
	source: "Typical DKA protocol values, until Intercept's protocol replaces them (configurable per hospital)",
	startedAt,
	startedBy: "started from the hub by Joanna Smith, MD",
	sharedWith: "Bridgeport",
	weight: 70,
	rules: sampleDkaRules,
	checks: [],
});

type OverlapDone = { by: string; at: string };

/** The move to subcutaneous insulin once his gap closes (step 4), with the steps done so far. */
const sampleScenario4Overlap = (done: {
	closed?: OverlapDone;
	basal?: OverlapDone;
	overlap?: OverlapDone;
	stop?: OverlapDone;
}): NonNullable<DkaProtocol["overlap"]> => ({
	title: "Moving to subcutaneous insulin",
	steps: [
		{ id: "closed", label: "Gap closed and eating", detail: "Gap 12 or under, HCO₃ 15 or more, and he can eat", done: done.closed },
		{
			id: "basal",
			label: "Basal insulin, then the meal dose",
			detail: "Glargine 22 units SC, his home dose, and lispro 6 units with lunch",
			done: done.basal,
		},
		{
			id: "overlap",
			label: "Keep the drip 1 h more",
			detail: "So the glargine is working before the drip stops (typical overlap: 1 to 2 h)",
			done: done.overlap,
		},
		{ id: "stop", label: "Stop the drip", detail: "Fingersticks before meals and at bedtime; lispro by his correction scale", done: done.stop },
	],
});

/**
 * Tyler Kessler's social needs and referrals at discharge (step 6), from the structured field in his admission note
 * and registration. For the clinician to send, each with who agreed.
 */
const sampleScenario4Discharge = (): DischargePlan => ({
	source: "Discharge workflow, from the structured social need in his admission note and registration",
	payer: "Uninsured (Medicaid lapsed in August)",
	needs: [
		{
			id: "rationing",
			label: "Insulin rationing",
			detail: "Stretching his insulin for 3 months because of the cost",
			evidence: "Admission note, structured field · Derek Lawson, PA-C",
		},
		{
			id: "coverage",
			label: "Coverage lapsed",
			detail: "Lost Medicaid at redetermination, 3 months ago",
			evidence: "Registration · payer: uninsured",
		},
	],
	referrals: [
		{
			id: "medicaid",
			title: "Medicaid re-enrollment",
			to: "Bridgeport financial counseling",
			detail: "Help reapplying, so his insulin and supplies are covered again",
			needIds: ["coverage"],
		},
		{
			id: "insulin-assistance",
			title: "Insulin assistance program",
			to: "His insulin maker's patient assistance program",
			detail: "Free or low-cost insulin until his coverage is back",
			needIds: ["rationing"],
		},
		{
			id: "educator",
			title: "Diabetes educator visit",
			to: "Bridgeport Rural Health Clinic",
			detail: "Within 7 days: sick-day rules, and what to do before he runs short",
			needIds: ["rationing"],
			reason: "Type 1 diabetes, his first DKA admission in 6 years",
		},
	],
});

/**
 * Tyler Kessler's alert in Scenario 4 (Demo Use Cases, "DKA caused by insulin rationing, managed by one night nurse"),
 * opened: Bridgeport at 23:00, one RN on the inpatient side, the APP on call from home. His labs cross the critical
 * thresholds, and the DKA pathway is suggested for the hub to start (step 1). The same numbers as his record, monitor
 * and card (`sample-scenario-4.ts`). The protocol arrives once the pathway is accepted.
 */
const sampleScenario4AlertDetail = (firedAt = new Date().toISOString()): AlertDetailData => {
	const monitor = sampleScenario4Monitoring();
	return {
		alert: {
			id: "live-kessler",
			patientId: "p24",
			severity: "critical",
			title: "Severe DKA: pH 7.08, gap 28",
			reason: "pH 7.08, bicarbonate 6 and glucose 520 in type 1 diabetes, insulin stretched for weeks",
			source: { kind: "rule", name: "Critical labs" },
			firedAt,
		},
		patient: {
			lastName: "Kessler",
			firstName: "Tyler",
			initials: "TK",
			tone: 3,
			sex: "M",
			age: 60,
			mrn: "01208854",
			hospital: "Bridgeport Valley",
			unit: "Med-Surg",
			bed: "Bed 3",
		},
		inLast24h: 1,
		acuity: monitor.acuity,
		trajectory: monitor.trajectory,
		monitor: { vitals: monitor.vitals, limits: monitor.limits, alarmPriorities: monitor.alarmPriorities },
		reasons: [
			{ label: "Severe acidosis", lead: "pH 7.08", detail: "Bicarbonate 6, anion gap 28, beta-hydroxybutyrate 7.2" },
			{ label: "Glucose 520", detail: "Potassium 5.6 before insulin; it falls once the drip starts" },
			{ label: "Kussmaul breathing", lead: "RR 30", detail: "HR 122, BP 98/58. Vomiting since yesterday" },
			{ label: "Insulin stretched", detail: "Type 1 since age 11. Off his glargine 2 days; lost Medicaid 3 months ago" },
		],
		flag: "DKA",
		tags: monitor.tags,
		history: [
			{
				label: "Home meds",
				items: [
					{ name: "Insulin glargine", detail: "22 units at bedtime; none for 2 days" },
					{ name: "Insulin lispro", detail: "4–8 units with meals; stretched" },
				],
			},
			{ label: "pH", value: "7.08", detail: "Venous gas, 20 min ago", severity: "critical" },
			{ label: "Bicarbonate", value: "6 mEq/L", detail: "Anion gap 28", severity: "critical" },
			{ label: "Glucose", value: "520 mg/dL", detail: "A1c 9.6% in April", severity: "critical" },
			{ label: "Potassium", value: "5.6 mEq/L", detail: "Falls with insulin: checked every hour" },
			{ label: "Creatinine", value: "1.4 mg/dL", detail: "Baseline 0.9: dehydration", severity: "low" },
		],
		bedside: { name: "Brittany Cole", role: "RN", initials: "BC", tone: 6, presence: "online", activity: "At the bedside" },
		transcript: sampleConsultTranscript({ patientId: "p24", firstName: "Tyler", sex: "M", nurse: "Brittany Cole" }),
		room: { airway: "none", pumps: 2 },
		video: sampleCameraVideo,
		pathway: sampleScenario4Pathway(),
	};
};

const airways = { Invasive: "ventilator", NIV: "niv", Oxygen: "oxygen" } as const;

type SampleVitals = MonitoringPatient["vitals"];


// A thread starts empty (Nov 5, 2026, user's call: "If I am initiating the messages interaction, no incoming message
// should be there"): the clinician writes first, and the nurse's replies (`scriptedReplies`) follow. The exception is a
// patient whose record counts unread messages: their thread holds that many from the nurse (`samplePatientParts`,
// `sampleBedsideThread`), so the unread count and the thread agree. Scenario 2's beats add the ED's messages as they play
// (`sample-scenario-2.ts`), and each opens the Messages column.

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
// Each gets the alert as it fired, for what counts from it (Scenario 3's bundle timer starts at time zero).
const scenarioAlertDetails: Record<string, (firedAt: string) => AlertDetailData> = {
	"live-hayes": sampleScenario1AlertDetail,
	"live-reynolds": sampleScenario2AlertDetail,
	"live-medina": sampleScenario3AlertDetail,
	"live-kessler": sampleScenario4AlertDetail,
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
			const scenario = scenarioDetail(alert.firedAt);
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
	sampleScenario3AlertDetail,
	sampleScenario3Pathway,
	sampleScenario3Tasks,
	sampleScenario4AlertDetail,
	sampleScenario4Discharge,
	sampleScenario4Overlap,
	sampleScenario4Pathway,
	sampleScenario4Protocol,
};
