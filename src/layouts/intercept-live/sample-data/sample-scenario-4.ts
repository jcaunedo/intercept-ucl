import type { AlertDetailData } from "../alert-panel/alert-panel";
import { dkaCalculate, type DkaCheck, type DkaProtocol, type DkaReadings } from "../alert-panel/dka-protocol";
import {
	sampleScenario4AlertDetail,
	sampleScenario4Discharge,
	sampleScenario4Overlap,
	sampleScenario4Protocol,
} from "../alert-panel/sample-alert-panel";
import { sampleScenario4Census, sampleScenario4CensusAt, sampleScenario4Flags } from "../census/sample-census";
import { sampleScenario4Monitoring, sampleScenario4MonitoringAt } from "../monitoring/sample-monitoring";
import type { PatientRecord } from "../patient-details/patient-details";
import { sampleScenario4BaseRecord, sampleScenario4RecordAt, type Scenario4RecordStage } from "../patient-details/sample-patient-records";
import { sampleScenario4Camera } from "../patient-details/sections/sample-camera";
import { sampleScenario4Chart } from "../patient-details/sections/sample-chart";
import { sampleScenarioEmr } from "../patient-details/sections/sample-epic";
import { sampleScenario4Medications } from "../patient-details/sections/sample-medications";
import { sampleScenario4Notes } from "../patient-details/sections/sample-notes";
import { sampleScenario4Orders } from "../patient-details/sections/sample-orders";
import { sampleScenario4Timeline } from "../patient-details/sections/sample-timeline";
import { sampleScenario4Vitals } from "../patient-details/sections/sample-vitals";
import { sampleEhrByHospital } from "./sample-ehr";
import type { ScenarioBeat, ScenarioDefinition } from "./sample-scenario-1";
import { withGlucose } from "../patient-details/sections/sample-glucose";

// Story-only: Scenario 4 of the Demo Use Cases, "DKA caused by insulin rationing, managed by one night nurse", as beats
// the Prototype menu plays. Tyler Kessler (`p24`), 60, type 1 diabetes since 11, works at a grain elevator, lost
// Medicaid at redetermination three months ago (five years short of Medicare) and has been stretching his insulin.
// Bridgeport at 23:00: one RN on the inpatient side (Brittany Cole), an APP on call from home (Derek Lawson, PA-C), the
// hub's tele-RN (Ava Brooks) and intensivist covering remotely. Harbor Point General was renamed Bridgeport for it (Nov 6, 2026, user's call).
//
// 1. Protocol launch (the clinician's): he arrives on every page with his Critical alert and the DKA pathway suggested.
//    Accepting it starts the protocol: the nurse's screen becomes an hourly checklist, and the hub sees the same one.
// 2. Built-in calculator (once the pathway is accepted): each check's glucose sets the next insulin rate. At 03:00
//    potassium 3.1 holds insulin and prompts replacement; at 05:00 glucose 238 prompts dextrose.
// 3. Hourly nudges: the 06:00 check is 10 min overdue, so the nurse and the tele-RN are nudged. Rate changes are signed
//    off from the intensivist's phone in under a minute (mock).
// 4. Gap closure: the gap closes at hour 13 (12:00); the platform walks the subcutaneous overlap, and the drip stops at
//    hour 14.
// 5. The cause, captured: the APP's admission note (07:30) records "cost-related insulin rationing" as a structured
//    social-needs field, and it becomes a flag on his cards.
// 6. Prevention at discharge: referrals for Medicaid re-enrollment, a manufacturer insulin-assistance program and a
//    diabetes educator visit at Bridgeport's rural health clinic, for the clinician to send.
//
// The 14 hours go by in about 100 s, as the night does in Scenarios 1 to 3. The protocol's times are the scenario's
// (23:00 to 13:00), so the checklist reads as the night did; each beat's label says the scenario's time too.

/** Tyler Kessler's record with every section, at a stage of the scenario; built when the beat plays. */
function kesslerRecord(stage: "alert" | Scenario4RecordStage, noted = false): PatientRecord {
	const census = sampleScenario4Census();
	const base = sampleScenario4BaseRecord();
	const record: PatientRecord = stage === "alert" ? base : { ...base, ...sampleScenario4RecordAt(stage) };
	// The APP's admission note, with its structured social need, is signed at 07:30 (step 5).
	const notes = sampleScenario4Notes(noted ? "noted" : "admission");
	return {
		...record,
		...withGlucose("p24", {
			vitals: sampleScenario4Vitals(stage === "closed" ? "closed" : "alert"),
			timeline: sampleScenario4Timeline(stage === "closed" ? "closed" : "alert"),
		}),
		chart: sampleScenario4Chart(base),
		medications: sampleScenario4Medications(stage),
		orders: sampleScenario4Orders(),
		emr: sampleScenarioEmr(record, census, notes),
		notes: { emr: sampleEhrByHospital[census.hospital ?? ""] ?? "TruBridge", notes },
		camera: sampleScenario4Camera(),
	};
}

/* -------------------------------------------------------------------------- */
/* The scenario's clock                                                       */
/* -------------------------------------------------------------------------- */

// The protocol's times: 23:00 is when the drip starts (hour 0). The last 23:00 before the scenario is picked, so the
// night reads as it happened. Set by the first beat.
let start = lastElevenPm();

function lastElevenPm() {
	const at = new Date();
	at.setHours(23, 0, 0, 0);
	if (at.getTime() > Date.now()) at.setDate(at.getDate() - 1);
	return at.getTime();
}

/** The scenario's time, hours and minutes after the drip started (ISO 8601). */
const clock = (hour: number, minute = 0) => new Date(start + hour * 60 * 60_000 + minute * 60_000).toISOString();

/* -------------------------------------------------------------------------- */
/* The protocol as the bedside fills it in                                    */
/* -------------------------------------------------------------------------- */

const BRITTANY = "Brittany Cole, RN";
const HANNAH = "Hannah Price, RN";
const DEREK = "Derek Lawson, PA-C";
const AVA = "Ava Brooks, tele-RN";
const INTENSIVIST = "Joanna Smith, MD";

/** Changes the alert's protocol. */
const withProtocol =
	(change: (protocol: DkaProtocol) => DkaProtocol) =>
	(detail: AlertDetailData): AlertDetailData =>
		detail.protocol ? { ...detail, protocol: change(detail.protocol) } : detail;

/** Changes one check. */
const withCheckChange = (id: string, change: (check: DkaCheck) => Partial<DkaCheck>) =>
	withProtocol((protocol) => ({
		...protocol,
		checks: protocol.checks.map((check) => (check.id === id ? { ...check, ...change(check) } : check)),
	}));

/**
 * A check entered at the bedside: the calculator sets the rate from its readings and the check before, raises its
 * prompts, and a changed rate goes to the intensivist's phone (`signOff`). The next hour's check comes due, unless
 * this one closes the gap.
 */
function entered(
	hour: number,
	readings: DkaReadings,
	by: string,
	{ minute = 4, signOff, last = false }: { minute?: number; signOff?: NonNullable<DkaCheck["rateChange"]>["signOff"]; last?: boolean } = {},
) {
	return withProtocol((protocol) => {
		const previous = protocol.checks.filter((check) => check.status === "done").at(-1);
		const { insulin, prompts } = dkaCalculate(protocol, readings, previous);
		const before = previous?.insulin;
		// A sign-off is for a rate the calculator changed; a hold is a hard stop, and coming off one resumes the rate.
		const changed = before && !before.held && !insulin.held && before.rate !== insulin.rate;
		const existing = protocol.checks.find((check) => check.id === `h${hour}`);
		const check: DkaCheck = {
			id: `h${hour}`,
			hour,
			at: clock(hour),
			status: "done",
			readings,
			insulin,
			prompts: prompts.map((prompt, index) => ({ ...prompt, id: `h${hour}-${index}` })),
			rateChange: changed ? { from: before.rate, to: insulin.rate, signOff } : undefined,
			done: { by, at: clock(hour, minute) },
			// The overdue nudge stays on the check it was for.
			nudge: existing?.nudge,
		};
		const next: DkaCheck[] = last ? [] : [{ id: `h${hour + 1}`, hour: hour + 1, at: clock(hour + 1), status: "due" }];
		return { ...protocol, checks: [...protocol.checks.filter((item) => item.id !== check.id), check, ...next] };
	});
}

/** A prompt documented at the bedside, by its title, on the check that raised it. */
const promptDone = (hour: number, title: string, by: string, minute: number, result?: string) =>
	withCheckChange(`h${hour}`, (check) => ({
		prompts: check.prompts?.map((prompt) => (prompt.title === title ? { ...prompt, done: { by, at: clock(hour, minute), result } } : prompt)),
	}));

/** A rate change signed on the intensivist's phone, `seconds` after the request. */
const signedOnPhone = (hour: number, minute: number, seconds: number) => ({
	status: "signed" as const,
	by: INTENSIVIST,
	at: clock(hour, minute),
	via: "phone" as const,
	seconds,
});

/** Several detail changes, in order. */
const all =
	(...changes: ((detail: AlertDetailData) => AlertDetailData)[]) =>
	(detail: AlertDetailData) =>
		changes.reduce((current, change) => change(current), detail);

const FLUIDS_NS = "0.9% saline 1,000 mL/h, second liter";
const FLUIDS_HALF = "0.45% saline + KCl 20 mEq/L, 250 mL/h";
const FLUIDS_KCL = "0.45% saline + KCl 20 mEq/L, 250 mL/h; KCl 20 mEq/h IV";
const FLUIDS_D5 = "D5 0.45% saline + KCl 20 mEq/L, 150 mL/h";

/** A check's log line: the readings and the rate. */
const checkLog = (hour: number, readings: DkaReadings, detail: string, by: string) => ({
	patientId: "p24",
	kind: "order" as const,
	title: `Hour ${hour} check: glucose ${readings.glucose}, K ${readings.potassium}, gap ${readings.gap}`,
	detail,
	by,
});

/* -------------------------------------------------------------------------- */
/* Beats                                                                      */
/* -------------------------------------------------------------------------- */

const H = {
	0: { glucose: 520, potassium: 5.6, gap: 28, bicarbonate: 6, fluids: FLUIDS_NS },
	1: { glucose: 468, potassium: 5.1, gap: 26, bicarbonate: 8, fluids: FLUIDS_HALF },
	2: { glucose: 415, potassium: 4.4, gap: 24, bicarbonate: 10, fluids: FLUIDS_HALF },
	3: { glucose: 386, potassium: 3.9, gap: 22, bicarbonate: 11, fluids: FLUIDS_HALF },
	4: { glucose: 318, potassium: 3.1, gap: 20, bicarbonate: 12, fluids: FLUIDS_HALF },
	5: { glucose: 296, potassium: 3.6, gap: 19, bicarbonate: 13, fluids: FLUIDS_KCL },
	6: { glucose: 238, potassium: 3.9, gap: 17, bicarbonate: 14, fluids: FLUIDS_HALF },
	7: { glucose: 182, potassium: 4.0, gap: 16, bicarbonate: 15, fluids: FLUIDS_D5 },
	8: { glucose: 176, potassium: 4.1, gap: 15, bicarbonate: 16, fluids: FLUIDS_D5 },
	9: { glucose: 168, potassium: 4.2, gap: 14, bicarbonate: 17, fluids: FLUIDS_D5 },
	10: { glucose: 205, potassium: 4.2, gap: 14, bicarbonate: 17, fluids: FLUIDS_D5 },
	11: { glucose: 188, potassium: 4.3, gap: 13, bicarbonate: 18, fluids: FLUIDS_D5 },
	12: { glucose: 172, potassium: 4.3, gap: 13, bicarbonate: 18, fluids: FLUIDS_D5 },
	13: { glucose: 164, potassium: 4.4, gap: 11, bicarbonate: 19, fluids: FLUIDS_D5 },
} satisfies Record<number, DkaReadings>;

const scenario4Beats: ScenarioBeat[] = [
	{
		after: "start",
		// 1. Bridgeport, 23:00: pH 7.08, bicarbonate 6, gap 28, glucose 520, potassium 5.6. Kussmaul breathing, HR 122,
		// BP 98/58: NEWS2 7, High. His Critical alert comes from the critical labs, with the DKA pathway suggested.
		label: "Bridgeport: Kessler in severe DKA, pH 7.08. DKA pathway suggested",
		changes: () => {
			start = lastElevenPm();
			const detail = sampleScenario4AlertDetail();
			return {
				admit: [{ census: sampleScenario4Census(), monitoring: sampleScenario4Monitoring(), record: kesslerRecord("alert") }],
				fire: [
					{
						...detail.alert,
						evidence: [
							"pH 7.08, bicarbonate 6 mEq/L, anion gap 28 (venous gas and BMP, 20 min ago)",
							"Glucose 520 mg/dL, potassium 5.6 mEq/L, beta-hydroxybutyrate 7.2 mmol/L",
							"RR 30, deep (Kussmaul), HR 122, BP 98/58",
							"Type 1 diabetes since age 11; off his basal insulin 2 days",
						],
					},
				],
				log: [{ patientId: "p24", kind: "alert", title: "Critical labs: severe DKA", detail: "pH 7.08, bicarbonate 6, gap 28. DKA pathway suggested to the hub", by: "Critical labs" }],
			};
		},
	},
	{
		after: "pathway",
		delay: 2,
		// 1. Protocol launch: the drip starts at 7 units/h and the first check is in. The nurse's screen is the checklist.
		label: "Kessler: DKA protocol started, insulin 7 units/h. Hourly checklist on Bridgeport's screen",
		changes: () => ({
			details: { "live-kessler": all((detail) => ({ ...detail, protocol: sampleScenario4Protocol(clock(0)) }), entered(0, H[0], BRITTANY, { minute: 5 })) },
			log: [
				{ patientId: "p24", kind: "decision", title: "DKA protocol started from the hub", detail: "Insulin 0.1 units/kg/h, 7 units/h. Hourly checklist on Bridgeport's screen", by: INTENSIVIST },
				checkLog(0, H[0], "Insulin 7 units/h. No potassium in the fluids while it's over 5.2", BRITTANY),
			],
		}),
	},
	{
		after: "pathway",
		delay: 8,
		label: "Kessler, 00:00: glucose 468, on target. Potassium added to fluids",
		changes: () => ({
			details: { "live-kessler": entered(1, H[1], BRITTANY) },
			log: [checkLog(1, H[1], "Glucose fell 52: rate stays 7 units/h. KCl 20 mEq/L in fluids", BRITTANY)],
		}),
	},
	{
		after: "pathway",
		delay: 14,
		label: "Kessler, 01:00: glucose 415, on target",
		changes: () => ({
			census: { p24: sampleScenario4CensusAt("early") },
			monitoring: { p24: sampleScenario4MonitoringAt("early") },
			details: { "live-kessler": entered(2, H[2], BRITTANY, { minute: 3 }) },
			log: [checkLog(2, H[2], "Glucose fell 53: rate stays 7 units/h", BRITTANY)],
		}),
	},
	{
		after: "pathway",
		delay: 20,
		// 2 and 3. Glucose fell only 29: the calculator raises the rate, and the intensivist signs it on her phone.
		label: "Kessler, 02:00: glucose fell only 29. Rate up to 8 units/h, signed on the phone in 38 s",
		changes: () => ({
			details: { "live-kessler": entered(3, H[3], BRITTANY, { signOff: signedOnPhone(3, 5, 38) }) },
			log: [
				checkLog(3, H[3], "Glucose fell 29, under 50: up 1 unit/h to 8", BRITTANY),
				{ patientId: "p24", kind: "decision", title: "Rate change signed: 7 → 8 units/h", detail: "On her phone, 38 s after the request", by: INTENSIVIST },
			],
		}),
	},
	{
		after: "pathway",
		delay: 27,
		// 2. Hard stop: potassium 3.1. Insulin held, replacement prompted.
		label: "Kessler, 03:00: potassium 3.1. Insulin held, replacement prompted",
		changes: () => ({
			details: { "live-kessler": entered(4, H[4], BRITTANY, { minute: 3 }) },
			log: [
				checkLog(4, H[4], "Potassium under 3.3: insulin held. KCl 20 mEq/h IV prompted", BRITTANY),
				{ patientId: "p24", kind: "alert", title: "Hard stop: insulin held", detail: "Potassium 3.1, under 3.3. No insulin until it's 3.3 or more", by: "DKA protocol" },
			],
		}),
	},
	{
		after: "pathway",
		delay: 32,
		label: "Kessler: KCl 20 mEq/h running",
		changes: () => ({
			details: { "live-kessler": all(promptDone(4, "Replace potassium", BRITTANY, 8, "KCl 20 mEq/h IV, recheck at 04:00"), promptDone(4, "Insulin held", BRITTANY, 6, "drip paused")) },
			log: [{ patientId: "p24", kind: "order", title: "Potassium replacement started", detail: "KCl 20 mEq/h IV. Insulin paused", by: BRITTANY }],
		}),
	},
	{
		after: "pathway",
		delay: 38,
		label: "Kessler, 04:00: potassium 3.6. Insulin back on at 8 units/h",
		changes: () => ({
			details: { "live-kessler": entered(5, H[5], BRITTANY, { minute: 2 }) },
			log: [checkLog(5, H[5], "Potassium 3.3 or more: insulin back on at 8 units/h", BRITTANY)],
		}),
	},
	{
		after: "pathway",
		delay: 45,
		// 2. Glucose 238, under 250: dextrose in, and the rate drops to 0.05 units/kg/h. The change waits for sign-off.
		label: "Kessler, 05:00: glucose 238. Dextrose prompted, rate down to 3.5 units/h for sign-off",
		changes: () => ({
			census: { p24: sampleScenario4CensusAt("dextrose") },
			monitoring: { p24: sampleScenario4MonitoringAt("dextrose") },
			records: { p24: kesslerRecord("dextrose") },
			details: {
				"live-kessler": entered(6, H[6], BRITTANY, {
					minute: 3,
					signOff: { status: "pending", sentTo: "Dr. Smith", at: clock(6, 3) },
				}),
			},
			log: [checkLog(6, H[6], "Glucose under 250: D5 0.45% saline, rate to 3.5 units/h (waiting for sign-off)", BRITTANY)],
		}),
	},
	{
		after: "pathway",
		delay: 50,
		// 3. Signed on her phone in 41 s; the nurse switches the fluids.
		label: "Kessler: rate change signed on the phone in 41 s. Dextrose running",
		changes: () => ({
			details: {
				"live-kessler": all(
					withCheckChange("h6", (check) => ({ rateChange: check.rateChange && { ...check.rateChange, signOff: signedOnPhone(6, 4, 41) } })),
					promptDone(6, "Add dextrose", BRITTANY, 7, "D5 0.45% saline + KCl 20 mEq/L at 150 mL/h"),
				),
			},
			log: [{ patientId: "p24", kind: "decision", title: "Rate change signed: 8 → 3.5 units/h", detail: "On her phone, 41 s after the request. D5 0.45% saline started", by: INTENSIVIST }],
		}),
	},
	{
		after: "pathway",
		delay: 56,
		// 3. The 06:00 check is 10 min overdue: Brittany is with another patient. The nurse and the tele-RN are nudged.
		label: "Kessler's 06:00 check is 10 min overdue. Bedside RN and tele-RN nudged",
		changes: () => ({
			details: { "live-kessler": withCheckChange("h7", () => ({ status: "overdue", nudge: { at: clock(7, 10), to: [BRITTANY, AVA] } })) },
			log: [{ patientId: "p24", kind: "alert", title: "Hourly check 10 min overdue", detail: `06:00 check. Nudged ${BRITTANY} and ${AVA}`, by: "DKA protocol" }],
			notices: [
				{
					id: "kessler-overdue",
					patientId: "p24",
					alertId: "live-kessler",
					title: "Hourly check 10 min overdue",
					description: `Kessler's 06:00 DKA check isn't in. ${BRITTANY} and ${AVA} were nudged.`,
					actionLabel: "Open protocol",
				},
			],
		}),
	},
	{
		after: "pathway",
		delay: 61,
		label: "Kessler, 06:14: check in, glucose 182 on dextrose",
		changes: () => ({
			details: { "live-kessler": entered(7, H[7], BRITTANY, { minute: 14 }) },
			log: [checkLog(7, H[7], "14 min late, after the nudge. Glucose in range on dextrose: rate stays 3.5 units/h", BRITTANY)],
		}),
	},
	{
		after: "pathway",
		delay: 68,
		// 5. The cause, captured: the APP admits him in the morning and records the rationing as a structured field.
		label: "Kessler's admission note: cost-related insulin rationing recorded as a social need",
		changes: () => ({
			census: { p24: { tags: sampleScenario4Flags(true) } },
			monitoring: { p24: { tags: sampleScenario4Flags(true) } },
			records: { p24: { notes: { emr: "TruBridge", notes: sampleScenario4Notes("noted") } } },
			details: { "live-kessler": (detail) => ({ ...detail, tags: sampleScenario4Flags(true) }) },
			log: [
				{
					patientId: "p24",
					kind: "note",
					title: "Admission note signed",
					detail: "Social need, structured: cost-related insulin rationing. Coverage lapsed at Medicaid redetermination",
					by: DEREK,
				},
			],
		}),
	},
	{
		after: "pathway",
		delay: 75,
		// Hours 8 to 12 on time, by the day nurse from 07:00. One rate change (glucose 205), signed in 29 s.
		label: "Kessler, 07:00 to 11:00: every check on time, gap 15 → 13",
		changes: () => ({
			details: {
				"live-kessler": all(
					entered(8, H[8], HANNAH, { minute: 3 }),
					entered(9, H[9], HANNAH, { minute: 2 }),
					entered(10, H[10], HANNAH, { minute: 4, signOff: signedOnPhone(10, 5, 29) }),
					entered(11, H[11], HANNAH, { minute: 3 }),
					entered(12, H[12], HANNAH, { minute: 2 }),
				),
			},
			log: [
				checkLog(8, H[8], "Day shift: Hannah Price, RN takes over the checklist. Rate stays 3.5 units/h", HANNAH),
				{ patientId: "p24", kind: "decision", title: "Rate change signed: 3.5 → 4 units/h", detail: "Glucose 205 on dextrose. On her phone, 29 s after the request", by: INTENSIVIST },
				checkLog(12, H[12], "Hours 8 to 12 on time. Gap 13, one from closed", HANNAH),
			],
		}),
	},
	{
		after: "pathway",
		delay: 82,
		// 4. Gap closure at hour 13 (12:00): gap 11, bicarbonate 19, pH 7.34. He's eating, so the overlap starts.
		label: "Kessler, 12:00: gap closed at hour 13. Moving to subcutaneous insulin",
		changes: () => ({
			census: { p24: sampleScenario4CensusAt("closed") },
			monitoring: { p24: sampleScenario4MonitoringAt("closed") },
			details: {
				"live-kessler": all(
					entered(13, H[13], HANNAH, { minute: 3, last: true }),
					withProtocol((protocol) => ({
						...protocol,
						gapClosed: { at: clock(13, 3), hour: 13, gap: 11, bicarbonate: 19 },
						overlap: sampleScenario4Overlap({ closed: { by: HANNAH, at: clock(13, 3) }, basal: { by: HANNAH, at: clock(13, 12) } }),
					})),
				),
			},
			log: [
				{ patientId: "p24", kind: "outcome", title: "Anion gap closed at hour 13", detail: "Gap 11, bicarbonate 19, pH 7.34. Glucose 164", by: "Lab, Bridgeport" },
				{ patientId: "p24", kind: "order", title: "Basal insulin given", detail: "Glargine 22 units SC and lispro 6 units with lunch. Drip runs 1 h more", by: HANNAH },
			],
		}),
	},
	{
		after: "pathway",
		delay: 89,
		// 4. The overlap's hour is up: the drip stops at hour 14. His APP resolves the alert, and the outcomes are written.
		label: "Kessler, 13:00: drip stopped after 14 h, on subcutaneous insulin",
		changes: () => ({
			// His page follows once the drip is off: glargine and lispro given, the drip stopped, labs at gap closure.
			records: { p24: kesslerRecord("closed", true) },
			resolve: {
				"live-kessler": {
					by: DEREK,
					reason: "Treated",
					note: "Gap closed at 13 h. Glargine given at 12:12; drip stopped at 13:00. Staying at Bridgeport.",
				},
			},
			details: {
				"live-kessler": withProtocol((protocol) => ({
					...protocol,
					overlap: sampleScenario4Overlap({
						closed: { by: HANNAH, at: clock(13, 3) },
						basal: { by: HANNAH, at: clock(13, 12) },
						overlap: { by: HANNAH, at: clock(14) },
						stop: { by: HANNAH, at: clock(14, 1) },
					}),
					stopped: { at: clock(14, 1), hours: 14 },
				})),
			},
			log: [
				{ patientId: "p24", kind: "decision", title: "Insulin drip stopped", detail: "After a 1 h overlap with glargine. Fingersticks before meals and at bedtime", by: HANNAH },
				{
					patientId: "p24",
					kind: "outcome",
					title: "DKA outcomes recorded",
					detail:
						"Gap closed at 13 h · Checks on time 13 of 14 (one 14 min late, nudged) · Hypoglycemia 0 · Hypokalemia 1, caught: insulin held · Social need recorded · Payer: uninsured (coverage lapsed)",
				},
			],
		}),
	},
	{
		after: "pathway",
		delay: 96,
		// 6. Prevention at discharge: the referrals, for the clinician to send.
		label: "Kessler's discharge: Medicaid re-enrollment, insulin assistance and a diabetes educator to send",
		changes: () => ({
			records: { p24: { discharge: sampleScenario4Discharge() } },
			details: { "live-kessler": (detail) => ({ ...detail, discharge: sampleScenario4Discharge() }) },
			log: [{ patientId: "p24", kind: "note", title: "Discharge referrals drafted", detail: "Medicaid re-enrollment, an insulin-assistance program and a diabetes educator visit", by: "Discharge workflow" }],
			notices: [
				{
					id: "kessler-referrals",
					patientId: "p24",
					alertId: "live-kessler",
					title: "3 referrals to send",
					description: "Kessler's discharge: Medicaid re-enrollment, an insulin-assistance program and a diabetes educator at Bridgeport's clinic.",
					actionLabel: "Review referrals",
					focus: "discharge",
				},
			],
		}),
	},
];

const sampleScenario4: ScenarioDefinition = {
	patientIds: ["p24"],
	alertIds: ["live-kessler"],
	beats: scenario4Beats,
};

export { sampleScenario4 };
