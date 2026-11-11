import type { AlertDetailData } from "../alert-panel/alert-panel";
import type { BedsideTask } from "../alert-panel/bedside-tasks";
import {
	sampleScenario3AlertDetail,
	sampleScenario3Pathway,
	sampleScenario3Tasks,
} from "../alert-panel/sample-alert-panel";
import type { BundleElement, FluidBolus } from "../alert-panel/sepsis-bundle";
import { sampleScenario3Census, sampleScenario3CensusAt } from "../census/sample-census";
import { sampleScenario3Monitoring, sampleScenario3MonitoringAt } from "../monitoring/sample-monitoring";
import type { PatientRecord } from "../patient-details/patient-details";
import { sampleScenario3BaseRecord, sampleScenario3RecordAt } from "../patient-details/sample-patient-records";
import { sampleScenario3Camera } from "../patient-details/sections/sample-camera";
import { sampleScenario3Chart } from "../patient-details/sections/sample-chart";
import { sampleScenarioEmr } from "../patient-details/sections/sample-epic";
import { sampleScenario3Medications } from "../patient-details/sections/sample-medications";
import { sampleScenario3Notes } from "../patient-details/sections/sample-notes";
import { sampleScenario3Orders } from "../patient-details/sections/sample-orders";
import type { SepsisBundleElement, SepsisCase } from "../patient-details/sections/sepsis-section";
import { sampleScenario3Timeline } from "../patient-details/sections/sample-timeline";
import { sampleScenario3Vitals } from "../patient-details/sections/sample-vitals";
import { sampleEhrByHospital } from "./sample-ehr";
import type { ScenarioBeat, ScenarioDefinition } from "./sample-scenario-1";
import { withGlucose } from "../patient-details/sections/sample-glucose";

// Story-only: Scenario 3 of the Demo Use Cases, "Sepsis in a patient with diabetes and kidney disease", as beats the
// Prototype menu plays. Rosa Medina (`p23`), 58, type 2 diabetes and CKD stage 4, on Medicaid, prefers Spanish. In
// Sidney's ED, boarding because the inpatient unit is full, with a hospitalist APP (Jenna Collins, NP) and two nurses.
// CVMC was renamed Sidney for it (Nov 6, 2026, user's call).
//
// 1. Sepsis screen (start): she arrives on every page with her Critical alert, and the hour-1 bundle starts, its timer on
//    the hub's screen and Sidney ED's. The lactate behind the screen is in, so that element starts green.
// 2. Interpreter (the clinician's): her preferred language makes the video consult offer an interpreter
//    (`interpreter.tsx`), as soon as the call is on.
// 3. Bundle tracker (once the call is on): the bedside documents each element and it turns green, cultures before
//    antibiotics, then the boluses, each with its reassessment.
// 4. Chronic-aware checks: the renal dose review on the antibiotic (the clinician confirms it) and the fluid-tolerance
//    check after each bolus, both in the bundle from the start.
// 5. Vasopressor guidance: MAP is still 62 after 2,040 mL, so the pathway suggests peripheral norepinephrine with the
//    insulin infusion; accepting it generates the nurses' tasks, the IV site checks among them.
// 6. Glucose and resolution (once the pathway is accepted): MAP 67 on norepinephrine, the repeat lactate completes the
//    bundle, then lactate 1.6 at 6 h, and at 12 h she's off pressors and admitted at Sidney under hub co-management.
//
// The night goes by in seconds, as in Scenarios 1 and 2; each beat's label says the scenario's time.

/** Rosa Medina's record with every section, at a stage of the scenario; built when the beat plays. */
function medinaRecord(stage: "alert" | "6h" | "resolved"): PatientRecord {
	const census = sampleScenario3Census();
	const base = sampleScenario3BaseRecord();
	const record: PatientRecord = stage === "alert" ? base : { ...base, ...sampleScenario3RecordAt(stage) };
	const notes = sampleScenario3Notes();
	return {
		...record,
		...withGlucose("p23", {
			vitals: sampleScenario3Vitals(stage === "resolved" ? "resolved" : "alert"),
			timeline: sampleScenario3Timeline(stage === "resolved" ? "resolved" : "alert"),
		}),
		chart: sampleScenario3Chart(base),
		medications: sampleScenario3Medications(stage === "resolved" ? "resolved" : "alert"),
		orders: sampleScenario3Orders(),
		emr: sampleScenarioEmr(record, census, notes),
		notes: { emr: sampleEhrByHospital[census.hospital ?? ""] ?? "Meditech", notes },
		camera: sampleScenario3Camera(),
	};
}

/* -------------------------------------------------------------------------- */
/* The bundle as it's documented                                              */
/* -------------------------------------------------------------------------- */

// What the bedside has documented so far in this run, by element, for her page's Sepsis section (SEP-1). Set as each beat
// plays; the first beat starts it over, as does a new run.
type Documented = { at: string; detail: string };
let timeZero = new Date().toISOString();
let documented: Record<string, Documented> = {};

const minutesAfterZero = (minutes: number) => new Date(Date.parse(timeZero) + minutes * 60_000).toISOString();
const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

/**
 * Her page's Sepsis section: the same case as SEP-1 tracks it, validated at the bedside by Jenna Collins, NP, with the
 * 3-hour and 6-hour elements counted from time zero and what's been documented so far. The hour-1 timer is the alert's.
 */
function medinaSepsis(): SepsisCase {
	const element = (
		id: string,
		window: "3h" | "6h",
		label: string,
		open: string,
	): SepsisBundleElement => {
		const done = documented[id];
		return {
			id,
			window,
			label,
			status: done ? "done" : "due",
			doneAt: done?.at,
			detail: done?.detail ?? open,
			dueAt: minutesAfterZero(window === "3h" ? 180 : 360),
		};
	};
	return {
		state: "tracking",
		agent: "Sepsis Sniffer",
		flaggedAt: timeZero,
		timeZero,
		timeZeroBasis: "Systolic BP under 90 with lactate over 2 and a suspected urinary infection, first met together",
		sirs: [
			{ id: "temp", label: "Temperature over 38 °C", status: "met", value: "39.4 °C", at: minutesAgo(5), source: "Monitor" },
			{ id: "hr", label: "Heart rate over 90", status: "met", value: "124", at: minutesAgo(1), source: "Monitor" },
			{ id: "rr", label: "Respiratory rate over 20", status: "met", value: "24", at: minutesAgo(1), source: "Monitor" },
			{ id: "wbc", label: "WBC over 12 or under 4", status: "met", value: "18.6", at: minutesAgo(22), source: "Lab" },
		],
		organDysfunction: [
			{ id: "lactate", label: "Lactate over 2", status: "met", value: "3.8", at: minutesAgo(22), source: "Lab" },
			{ id: "sbp", label: "Systolic BP under 90", status: "met", value: "84", at: minutesAgo(5), source: "Monitor" },
			// Her CKD's baseline is 2.4: over 2.0, but not new. A reviewer would mark it chronic.
			{ id: "creatinine", label: "Creatinine over 2.0", status: "met", value: "2.6", at: minutesAgo(22), source: "Lab" },
			{ id: "platelets", label: "Platelets under 100", status: "not-met", value: "162", at: minutesAgo(22), source: "Lab" },
			{ id: "bilirubin", label: "Bilirubin 2 or more", status: "not-met", value: "0.6", at: minutesAgo(22), source: "Lab" },
			{ id: "inr", label: "INR over 1.5", status: "missing", missingLabel: "Not drawn" },
		],
		bundle: [
			element("lactate", "3h", "Initial lactate", "Due"),
			element("cultures", "3h", "Blood cultures before antibiotics", "2 sets"),
			element("antibiotics", "3h", "Broad-spectrum antibiotics", "Piperacillin-tazobactam"),
			element("fluids", "3h", "30 mL/kg crystalloid", "2,040 mL for 68 kg"),
			element("pressors", "6h", "Vasopressors for persistent hypotension", "If MAP stays under 65 after fluids"),
			element("repeat-lactate", "6h", "Repeat lactate", "Initial lactate was over 2"),
			element("reassessment", "6h", "Volume status and perfusion reassessment", "Hypotension persists after fluids"),
		],
		decision: {
			at: minutesAfterZero(1),
			by: "Jenna Collins, NP",
			note: "Confirmed at the bedside: pyelonephritis with septic shock.",
		},
	};
}

/** Records an element as documented now, for the SEP-1 case, and returns the case. */
function document(id: string, detail: string): SepsisCase {
	documented = { ...documented, [id]: { at: new Date().toISOString(), detail } };
	return medinaSepsis();
}

/** Changes one bundle element in the alert's detail. */
const withElement =
	(id: string, change: (element: BundleElement) => Partial<BundleElement>) =>
	(detail: AlertDetailData): AlertDetailData =>
		detail.bundle
			? {
					...detail,
					bundle: {
						...detail.bundle,
						elements: detail.bundle.elements.map((element) =>
							element.id === id ? { ...element, ...change(element) } : element,
						),
					},
				}
			: detail;

/** An element documented by someone at the bedside, now: it turns green. */
const completed = (id: string, result: string, by: string, at: string) =>
	withElement(id, () => ({ status: "complete", result, documented: { by, at } }));

/** A bolus in and its reassessment, on the fluids element: in progress until the last one reaches the target. */
const withBolus = (bolus: FluidBolus, last = false) =>
	withElement("fluids", (element) => {
		const boluses = [...(element.fluids?.boluses ?? []), bolus];
		const given = boluses.reduce((sum, item) => sum + item.volume, 0);
		return {
			status: last ? "complete" : "in-progress",
			fluids: element.fluids && { ...element.fluids, boluses },
			...(last
				? { result: `${given.toLocaleString("en-US")} mL Lactated Ringer's, 30 mL/kg`, documented: { by: bolus.by, at: bolus.at } }
				: {}),
		};
	});

/** Changes some of the bedside tasks. */
const withTasks =
	(changes: Record<string, Partial<BedsideTask>>) =>
	(detail: AlertDetailData): AlertDetailData =>
		detail.tasks
			? {
					...detail,
					tasks: {
						...detail.tasks,
						tasks: detail.tasks.tasks.map((task) => (changes[task.id] ? { ...task, ...changes[task.id] } : task)),
					},
				}
			: detail;

const ASHLEY = "Ashley Brooks, RN";
const KRISTEN = "Kristen Webb, RN";
const JENNA = "Jenna Collins, NP";

/** A bolus beat: the bolus in now, reassessed by the APP before the next. */
function bolusBeat(index: number, volume: number, reassessment: string, delay: number, last = false): ScenarioBeat {
	return {
		after: "consult",
		delay,
		label: last
			? "Medina: 2,040 mL in, MAP still 62. Vasopressor pathway suggested"
			: `Medina: bolus ${index} in (${volume} mL), tolerated. ${reassessment}`,
		changes: () => {
			const at = new Date().toISOString();
			const bolus: FluidBolus = { id: `bolus-${index}`, volume, at, reassessment, tolerated: true, by: JENNA };
			const addBolus = withBolus(bolus, last);
			if (!last) {
				return {
					details: { "live-medina": addBolus },
					log: [{ patientId: "p23", kind: "order", title: `Fluid bolus ${index}: ${volume} mL LR`, detail: `Tolerated: ${reassessment}`, by: JENNA }],
				};
			}
			// Step 5: fluids are in and MAP is still under 65. The pathway is suggested under the bundle, with the tasks it
			// would generate (shown once it's accepted).
			const pathway = sampleScenario3Pathway();
			const tasks = sampleScenario3Tasks();
			return {
				census: { p23: sampleScenario3CensusAt("fluids") },
				monitoring: { p23: sampleScenario3MonitoringAt("fluids") },
				records: { p23: { sepsis: document("fluids", "2,040 mL Lactated Ringer's, reassessed after each bolus") } },
				details: { "live-medina": (detail) => ({ ...addBolus(detail), pathway, tasks }) },
				log: [
					{ patientId: "p23", kind: "order", title: `Fluid bolus ${index}: ${volume} mL LR`, detail: `Tolerated: ${reassessment}. 2,040 mL in all, 30 mL/kg`, by: JENNA },
					{ patientId: "p23", kind: "alert", title: "MAP under 65 after fluids", detail: "MAP 62 after 2,040 mL. Septic shock pathway suggested: peripheral norepinephrine", by: "Care pathway" },
				],
			};
		},
	};
}

/* -------------------------------------------------------------------------- */
/* Beats                                                                      */
/* -------------------------------------------------------------------------- */

const scenario3Beats: ScenarioBeat[] = [
	{
		after: "start",
		// 1. Sepsis screen (15:30): BP 84/48, HR 124, 39.4 °C, lactate 3.8, glucose 390. NEWS2 10 (High), up from 7 at
		// triage. The bundle's timer starts on both screens.
		label: "Sidney ED: Medina screens for septic shock. Hour-1 bundle started",
		changes: () => {
			timeZero = new Date().toISOString();
			documented = { lactate: { at: minutesAgo(22), detail: "3.8 mmol/L" } };
			const detail = sampleScenario3AlertDetail();
			return {
				admit: [
					{
						census: { ...sampleScenario3Census(), sepsisWatch: true },
						monitoring: sampleScenario3Monitoring(),
						record: { ...medinaRecord("alert"), sepsis: medinaSepsis() },
					},
				],
				fire: [
					{
						...detail.alert,
						evidence: [
							"BP 84/48 (MAP 60), HR 124, RR 24, 39.4 °C (5 min ago)",
							"Lactate 3.8 mmol/L, WBC 18.6 (resulted 22 min ago)",
							"Urine nitrite positive, leukocyte esterase 3+; left flank pain",
							"Type 2 diabetes (glucose 390), CKD stage 4 (eGFR 22)",
							"Confirmed at the bedside by Jenna Collins, NP",
						],
					},
				],
				log: [{ patientId: "p23", kind: "decision", title: "Sepsis confirmed: hour-1 bundle started", detail: "Time zero set. The same timer shows on Sidney ED's screen", by: JENNA }],
			};
		},
	},
	{
		after: "consult",
		delay: 8,
		// 3. Cultures drawn, both sets, before the antibiotic.
		label: "Medina: blood cultures drawn, 2 sets",
		changes: () => {
			const at = new Date().toISOString();
			return {
				records: { p23: { sepsis: document("cultures", "2 sets, both arms, before antibiotics") } },
				details: { "live-medina": completed("cultures", "2 sets, both arms", ASHLEY, at) },
				log: [{ patientId: "p23", kind: "order", title: "Blood cultures drawn", detail: "2 sets, both arms, before antibiotics", by: ASHLEY }],
			};
		},
	},
	{
		after: "consult",
		delay: 15,
		// The first dose in full; the renal dose review is about the doses after it (step 4).
		label: "Medina: piperacillin-tazobactam 4.5 g IV given",
		changes: () => {
			const at = new Date().toISOString();
			return {
				records: { p23: { sepsis: document("antibiotics", "Piperacillin-tazobactam 4.5 g IV, first dose") } },
				details: { "live-medina": completed("antibiotics", "Piperacillin-tazobactam 4.5 g IV, first dose", ASHLEY, at) },
				log: [{ patientId: "p23", kind: "order", title: "Antibiotic given: piperacillin-tazobactam 4.5 g IV", detail: "First dose, in full", by: ASHLEY }],
			};
		},
	},
	// 3 and 4. The boluses, each reassessed before the next (the fluid-tolerance check). 30 mL/kg × 68 kg = 2,040 mL, so
	// the last is 540 mL.
	bolusBeat(1, 500, "Lungs clear, SpO₂ 95%, RR 22, MAP 61", 22),
	bolusBeat(2, 500, "Lungs clear, SpO₂ 95%, RR 22, MAP 61", 29),
	bolusBeat(3, 500, "Lungs clear, no edema, SpO₂ 95%, MAP 62", 36),
	bolusBeat(4, 540, "Lungs clear, SpO₂ 95%, RR 22, MAP 62", 43, true),
	{
		after: "pathway",
		// 5. Norepinephrine running peripherally, titrated to 0.08: MAP 67. The first IV site check is done.
		label: "Medina on norepinephrine 0.08 peripherally: MAP 67",
		changes: () => {
			const at = new Date().toISOString();
			return {
				census: { p23: sampleScenario3CensusAt("pressor") },
				monitoring: { p23: sampleScenario3MonitoringAt("pressor") },
				records: { p23: { ...sampleScenario3RecordAt("pressor"), sepsis: document("pressors", "Norepinephrine 0.08 mcg/kg/min, peripheral") } },
				details: {
					"live-medina": withTasks({
						"iv-site": { status: "open", done: { by: ASHLEY, at, result: "site clean, no swelling or blanching" }, dueAt: new Date(Date.now() + 60 * 60_000).toISOString() },
						"blood-pressure": { done: { by: ASHLEY, at, result: "104/49, MAP 67" } },
					}),
				},
				log: [{ patientId: "p23", kind: "order", title: "Norepinephrine started, peripheral IV", detail: "Titrated to 0.08 mcg/kg/min. MAP 67. IV site clean", by: ASHLEY }],
			};
		},
	},
	{
		after: "pathway",
		delay: 12,
		// The repeat lactate (2 h) completes the bundle; the insulin infusion is running, glucose falling.
		label: "Medina's repeat lactate 2.6, down from 3.8: hour-1 bundle complete",
		changes: () => {
			const at = new Date().toISOString();
			return {
				records: { p23: { sepsis: document("repeat-lactate", "2.6 mmol/L, down from 3.8") } },
				details: {
					"live-medina": (detail) =>
						withTasks({ glucose: { done: { by: KRISTEN, at, result: "312 mg/dL, insulin 3 units/h" } } })(
							completed("repeat-lactate", "2.6 mmol/L, down from 3.8", "Lab, Sidney", at)(detail),
						),
				},
				log: [
					{ patientId: "p23", kind: "outcome", title: "Repeat lactate 2.6 mmol/L", detail: "Down from 3.8. Hour-1 bundle complete", by: "Lab, Sidney" },
					{ patientId: "p23", kind: "order", title: "Insulin infusion started", detail: "3 units/h. Glucose 312, from 390", by: KRISTEN },
				],
			};
		},
	},
	{
		after: "pathway",
		delay: 18,
		// 6. At 6 h: lactate 1.6, MAP 77 on norepinephrine 0.04, glucose 172 on 2 units/h.
		label: "Medina at 6 h: lactate 1.6, MAP 77 on less norepinephrine",
		changes: () => {
			const at = new Date().toISOString();
			return {
				census: { p23: sampleScenario3CensusAt("6h") },
				monitoring: { p23: sampleScenario3MonitoringAt("6h") },
				records: { p23: { ...medinaRecord("6h"), sepsis: document("reassessment", "Lactate 1.6, MAP 77, urine 45 mL/h") } },
				details: {
					"live-medina": withTasks({
						"iv-site": { done: { by: ASHLEY, at, result: "site clean" } },
						glucose: { done: { by: KRISTEN, at, result: "172 mg/dL, insulin 2 units/h" } },
						"urine-output": { done: { by: ASHLEY, at, result: "45 mL/h" } },
					}),
				},
				log: [{ patientId: "p23", kind: "outcome", title: "6 h: lactate 1.6 mmol/L", detail: "MAP 77 on norepinephrine 0.04. Glucose 172", by: "Lab, Sidney" }],
			};
		},
	},
	{
		after: "pathway",
		delay: 24,
		// 6. At 12 h: off norepinephrine for an hour, MAP 83. A bed opened, so she's admitted at Sidney under hub
		// co-management: care delivered locally. Her APP resolves the alert, as the bedside does in Scenarios 1 and 2.
		label: "Medina at 12 h: off pressors, admitted at Sidney under hub co-management",
		changes: () => {
			const at = new Date().toISOString();
			const location = { unit: "Med-Surg", bed: "Bed 6" };
			return {
				census: { p23: { ...sampleScenario3CensusAt("resolved"), ...location } },
				monitoring: { p23: { ...sampleScenario3MonitoringAt("resolved"), ...location } },
				records: { p23: { ...medinaRecord("resolved"), sepsis: medinaSepsis() } },
				resolve: {
					"live-medina": {
						by: JENNA,
						reason: "Treated",
						note: "Off norepinephrine since 11 h, MAP 83. Lactate 1.6. Admitted at Sidney under hub co-management.",
					},
				},
				details: {
					"live-medina": (detail) => ({
						...withTasks({
							"iv-site": { status: "done", dueAt: undefined, done: { by: ASHLEY, at, result: "norepinephrine off, site clean" } },
							"blood-pressure": { status: "done", dueAt: undefined },
						})(detail),
						patient: { ...detail.patient, ...location },
					}),
				},
				log: [
					{ patientId: "p23", kind: "decision", title: "Admitted at Sidney under hub co-management", detail: "Med-Surg, Bed 6. Off norepinephrine since 11 h", by: JENNA },
					{
						patientId: "p23",
						kind: "outcome",
						title: "Sepsis outcomes recorded",
						detail:
							"Antibiotics at 24 min · Bundle 5 of 5 · MAP ≥ 65 at 1 h 20 min · Pressor-free at 11 h · Cared for at Sidney · Payer: Medicaid · Language: Spanish",
					},
				],
			};
		},
	},
];

const sampleScenario3: ScenarioDefinition = {
	patientIds: ["p23"],
	alertIds: ["live-medina"],
	beats: scenario3Beats,
};

export { sampleScenario3 };
