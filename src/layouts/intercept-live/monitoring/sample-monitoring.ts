import {
	sampleScenario3CensusAt,
	sampleScenario3Flags,
	sampleScenario4CensusAt,
	sampleScenario4Flags,
	type Scenario3Stage,
	type Scenario4Stage,
} from "../census/sample-census";
import { samplePatientPhotos } from "../sample-data/sample-patient-photos";
import type { EscalationTarget, MonitoringPatient, TriageAlert } from "./monitoring";

// Synthetic data (PRD MON-080): the Census's 26 patients on the monitoring panel, with live bedside values, and the
// panel's alerts for the triage queue. The alerts give each card its pill, the same as the Census's; acuity and tags
// match the Census too. MAP is (systolic + 2 × diastolic) / 3. Outside the default alarm limits: Miller and Johnson
// (with alerts), Walker, Moore and Clark (without one, so "Outside limits" finds them first). Carter has no SpO₂ and
// Whitfield no RR (Data gap). Hayes (Chadron, Med-Surg) is Scenario 1 (Demo Use Cases) just before it starts: heart
// failure, holding at SpO₂ 92% on 4 L and NEWS2 5. The Prototype menu's Scenario 1 plays her early warning at 01:40
// (`sampleScenario1Monitoring`, `sample-data/sample-scenario-1.ts`).
// Erickson, Carlson and Hansen (Chadron) are the floor's other patients, Ortega, Norman and Jensen (Alliance's med-surg floor) fill its
// count, and Peterson, Lambert, Jacobs, Hughes and Ramirez are Bridgeport's (Med-Surg, a swing bed, observation and
// the ED; Nov 6, 2026, user's call); all eleven inside the limits, with no alert. My patients are the same as on the
// Census (`sample-census.ts`).
//
// Acuity is the NEWS2-style current-state score (DU-14, scale 1), worked out from each patient's charted vitals in
// `sample-vitals.ts`: ventilated patients are sedated (not Alert), Anderson is newly confused, and oxygen follows each
// record. Carter's SpO₂ and Whitfield's RR stopped reporting, so their score is Unknown. `scoreChange4h` is the score's
// change over 4 h, which ranks the work list (DU-09).

const news2 = "NEWS2";
const change = "Change in last 24 h";
// When the clinician last opened a patient (the Recently viewed sort): Thompson, Davis, Miller and Clark. Unread family
// messages (the card's message icon): Davis 2, Bennett and Moore 1.
const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();

const monitoringPatients: MonitoringPatient[] = [
	{
		id: "p1",
		hospitalId: "sidney",
		lastName: "Miller",
		firstName: "Sarah",
		photo: samplePatientPhotos.p1,
		mrn: "01033876",
		sex: "F",
		age: 59,
		hospital: "Sidney Regional",
		unit: "MICU",
		bed: "Bed 11",
		acuity: { label: news2, score: 17, level: "high" },
		trajectory: { label: change, value: "+7", trend: "up" },
		scoreChange4h: 0,
		lastViewedAt: hoursAgo(2),
		tags: [{ label: "Ventilated" }, { label: "2 pressors" }],
		vitals: { hr: 128, spo2: 89, systolic: 82, diastolic: 46, map: 58, rr: 32 },
	},
	{
		id: "p2",
		hospitalId: "sidney",
		mine: true,
		lastName: "Johnson",
		firstName: "Daniel",
		photo: samplePatientPhotos.p2,
		mrn: "00482917",
		sex: "M",
		age: 58,
		hospital: "Sidney Regional",
		unit: "MICU",
		bed: "Bed 3",
		acuity: { label: news2, score: 15, level: "high" },
		trajectory: { label: change, value: "+1", trend: "up" },
		scoreChange4h: 0,
		tags: [{ label: "Ventilated" }],
		vitals: { hr: 118, spo2: 84, systolic: 104, diastolic: 56, map: 72, rr: 28 },
	},
	{
		id: "p3",
		hospitalId: "sidney",
		lastName: "Davis",
		firstName: "Linda",
		mrn: "00519364",
		sex: "F",
		age: 67,
		hospital: "Sidney Regional",
		unit: "MICU",
		bed: "Bed 7",
		acuity: { label: news2, score: 10, level: "high" },
		trajectory: { label: change, value: "−2", trend: "down" },
		scoreChange4h: 0,
		unreadMessages: 2,
		lastViewedAt: hoursAgo(0.7),
		tags: [{ label: "Ventilated" }, { label: "1 pressor" }],
		vitals: { hr: 94, spo2: 93, systolic: 98, diastolic: 53, map: 68, rr: 18 },
	},
	{
		id: "p4",
		hospitalId: "sidney",
		lastName: "Thompson",
		firstName: "Robert",
		mrn: "00290451",
		sex: "M",
		age: 72,
		hospital: "Sidney Regional",
		unit: "CVICU",
		bed: "Bed 5",
		acuity: { label: news2, score: 5, level: "medium" },
		trajectory: { label: change, value: "+1", trend: "up" },
		scoreChange4h: 0,
		lastViewedAt: hoursAgo(0.2),
		tags: [{ label: "2 pressors" }, { label: "DNR" }],
		vitals: { hr: 88, spo2: 95, systolic: 96, diastolic: 51, map: 66, rr: 18 },
	},
	{
		id: "p5",
		hospitalId: "sidney",
		lastName: "Carter",
		firstName: "Emily",
		photo: samplePatientPhotos.p5,
		mrn: "00956113",
		sex: "F",
		age: 62,
		hospital: "Sidney Regional",
		unit: "MICU",
		bed: "Bed 6",
		acuity: { label: news2 },
		trajectory: { label: change, variant: "missing" },
		tags: [{ label: "NIV" }],
		vitals: { hr: 102, systolic: 112, diastolic: 64, map: 80, rr: 24 },
	},
	{
		id: "p6",
		hospitalId: "sidney",
		lastName: "Anderson",
		firstName: "James",
		mrn: "00164529",
		sex: "M",
		age: 81,
		hospital: "Sidney Regional",
		unit: "SICU",
		bed: "Bed 2",
		acuity: { label: news2, score: 3, level: "low" },
		trajectory: { label: change, value: "+2", trend: "up" },
		scoreChange4h: 0,
		tags: [{ label: "Fall risk" }],
		vitals: { hr: 72, spo2: 97, systolic: 128, diastolic: 64, map: 85, rr: 14 },
	},
	{
		id: "p7",
		hospitalId: "sidney",
		lastName: "Taylor",
		firstName: "Susan",
		mrn: "00377208",
		sex: "F",
		age: 65,
		hospital: "Sidney Regional",
		unit: "SICU",
		bed: "Bed 12",
		acuity: { label: news2, score: 0, level: "low" },
		trajectory: { label: change, value: "−3", trend: "down" },
		scoreChange4h: 0,
		tags: [{ label: "Contact isolation" }],
		vitals: { hr: 84, spo2: 96, systolic: 120, diastolic: 63, map: 82, rr: 16 },
	},
	{
		id: "p8",
		hospitalId: "sidney",
		lastName: "Wilson",
		firstName: "Michael",
		mrn: "00841290",
		sex: "M",
		age: 60,
		hospital: "Sidney Regional",
		unit: "PCU",
		bed: "Bed 14",
		acuity: { label: news2, score: 0, level: "low" },
		trajectory: { label: change, value: "0" },
		scoreChange4h: 0,
		vitals: { hr: 76, spo2: 98, systolic: 128, diastolic: 71, map: 90, rr: 15 },
	},
	{
		id: "p9",
		hospitalId: "sidney",
		mine: true,
		lastName: "Harris",
		firstName: "William",
		mrn: "00615874",
		sex: "M",
		age: 70,
		hospital: "Sidney Regional",
		unit: "MICU",
		bed: "Bed 8",
		acuity: { label: news2, score: 16, level: "high" },
		trajectory: { label: change, value: "+6", trend: "up" },
		scoreChange4h: 2,
		tags: [{ label: "Ventilated" }],
		vitals: { hr: 112, spo2: 91, systolic: 92, diastolic: 50, map: 64, rr: 26 },
	},
	{
		id: "p10",
		hospitalId: "sidney",
		lastName: "Moore",
		firstName: "Patricia",
		mrn: "01120438",
		sex: "F",
		age: 61,
		hospital: "Sidney Regional",
		unit: "SICU",
		bed: "Bed 4",
		acuity: { label: news2, score: 7, level: "high" },
		trajectory: { label: change, value: "+1", trend: "up" },
		scoreChange4h: 0,
		unreadMessages: 1,
		tags: [{ label: "1 pressor" }, { label: "Dialysis" }],
		vitals: { hr: 98, spo2: 96, systolic: 88, diastolic: 48, map: 61, rr: 19 },
	},
	{
		id: "p11",
		hospitalId: "sidney",
		lastName: "Clark",
		firstName: "Jennifer",
		mrn: "00908135",
		sex: "F",
		age: 69,
		hospital: "Sidney Regional",
		unit: "MICU",
		bed: "Bed 1",
		acuity: { label: news2, score: 1, level: "low" },
		trajectory: { label: change, value: "0" },
		scoreChange4h: 0,
		lastViewedAt: hoursAgo(5),
		tags: [{ label: "Droplet isolation" }],
		vitals: { hr: 92, spo2: 98, systolic: 162, diastolic: 96, map: 118, rr: 20 },
	},
	{
		id: "p12",
		hospitalId: "sidney",
		lastName: "Whitfield",
		firstName: "Grace",
		mrn: "00257719",
		sex: "F",
		age: 83,
		hospital: "Sidney Regional",
		unit: "Neuro ICU",
		bed: "Bed 2",
		acuity: { label: news2 },
		trajectory: { label: change, variant: "missing" },
		tags: [{ label: "3% NaCl" }, { label: "DNR" }, { label: "Fall risk" }],
		vitals: { hr: 80, spo2: 94, systolic: 104, diastolic: 59, map: 74 },
	},
	{
		id: "p13",
		hospitalId: "sidney",
		lastName: "Walker",
		firstName: "Thomas",
		mrn: "00733062",
		sex: "M",
		age: 63,
		hospital: "Sidney Regional",
		unit: "CVICU",
		bed: "Bed 3",
		acuity: { label: news2, score: 14, level: "high" },
		trajectory: { label: change, value: "+5", trend: "up" },
		scoreChange4h: 1,
		tags: [{ label: "Ventilated" }, { label: "2 pressors" }, { label: "ECMO" }],
		vitals: { hr: 134, spo2: 94, systolic: 84, diastolic: 41, map: 55, rr: 22 },
	},
	{
		id: "p14",
		hospitalId: "sidney",
		lastName: "Bennett",
		firstName: "Karen",
		mrn: "00499320",
		sex: "F",
		age: 63,
		hospital: "Sidney Regional",
		unit: "CCU",
		bed: "Bed 9",
		acuity: { label: news2, score: 1, level: "low" },
		trajectory: { label: change, value: "−6", trend: "down" },
		scoreChange4h: -6,
		unreadMessages: 1,
		vitals: { hr: 88, spo2: 97, systolic: 110, diastolic: 61, map: 77, rr: 17 },
	},
	{
		id: "p15",
		hospitalId: "chadron",
		mine: true,
		lastName: "Hayes",
		firstName: "Margaret",
		mrn: "00826154",
		sex: "F",
		age: 72,
		hospital: "Chadron Memorial",
		unit: "Med-Surg",
		bed: "Bed 4",
		// Just before Scenario 1 (`sampleScenario1Monitoring`, 01:40): inside her alarm limits. Her med-surg bed alarms on
		// RR above 24, where NEWS2 gives RR its full 3 points (illustrative, as the priorities below), so at 01:40 her RR
		// 26 shows ▲ beside SpO₂'s ▼: breathing faster as her oxygen drops.
		limits: { rr: [8, 24] },
		acuity: { label: news2, score: 5, level: "medium" },
		trajectory: { label: change, value: "+1", trend: "up" },
		scoreChange4h: 0,
		tags: [{ label: "Fall risk" }],
		vitals: { hr: 106, spo2: 92, systolic: 147, diastolic: 85, map: 106, rr: 20 },
	},
	{
		id: "p16",
		hospitalId: "chadron",
		lastName: "Erickson",
		firstName: "Walter",
		mrn: "00731942",
		sex: "M",
		age: 79,
		hospital: "Chadron Memorial",
		unit: "Med-Surg",
		bed: "Bed 6",
		acuity: { label: news2, score: 2, level: "low" },
		trajectory: { label: change, value: "−3", trend: "down" },
		scoreChange4h: 0,
		tags: [{ label: "DNR" }, { label: "Fall risk" }],
		vitals: { hr: 84, spo2: 96, systolic: 126, diastolic: 72, map: 90, rr: 18 },
	},
	{
		id: "p19",
		hospitalId: "chadron",
		mine: true,
		lastName: "Carlson",
		firstName: "Linda",
		mrn: "00749318",
		sex: "F",
		age: 68,
		hospital: "Chadron Memorial",
		unit: "Med-Surg",
		bed: "Bed 2",
		acuity: { label: news2, score: 1, level: "low" },
		trajectory: { label: change, value: "−2", trend: "down" },
		scoreChange4h: 0,
		vitals: { hr: 76, spo2: 95, systolic: 134, diastolic: 78, map: 97, rr: 16 },
	},
	{
		id: "p20",
		hospitalId: "chadron",
		mine: true,
		lastName: "Hansen",
		firstName: "Robert",
		mrn: "00862047",
		sex: "M",
		age: 61,
		hospital: "Chadron Memorial",
		unit: "Med-Surg",
		bed: "Bed 8",
		acuity: { label: news2, score: 0, level: "low" },
		trajectory: { label: change, value: "−1", trend: "down" },
		scoreChange4h: 0,
		vitals: { hr: 80, spo2: 97, systolic: 128, diastolic: 76, map: 93, rr: 16 },
	},
	{
		id: "p17",
		hospitalId: "alliance",
		mine: true,
		lastName: "Ortega",
		firstName: "Lucía",
		photo: samplePatientPhotos.p17,
		mrn: "00658213",
		sex: "F",
		age: 67,
		hospital: "Alliance Community",
		unit: "Med-Surg",
		bed: "Bed 10",
		acuity: { label: news2, score: 6, level: "medium" },
		trajectory: { label: change, value: "+2", trend: "up" },
		scoreChange4h: 1,
		vitals: { hr: 104, spo2: 95, systolic: 112, diastolic: 64, map: 80, rr: 21 },
	},
	{
		id: "p18",
		hospitalId: "alliance",
		mine: true,
		lastName: "Norman",
		firstName: "Keith",
		photo: samplePatientPhotos.p18,
		mrn: "00914370",
		sex: "M",
		age: 58,
		hospital: "Alliance Community",
		unit: "Med-Surg",
		bed: "Bed 5",
		acuity: { label: news2, score: 1, level: "low" },
		trajectory: { label: change, value: "−4", trend: "down" },
		scoreChange4h: 0,
		tags: [{ label: "Insulin infusion" }],
		vitals: { hr: 92, spo2: 98, systolic: 128, diastolic: 74, map: 92, rr: 16 },
	},
	{
		id: "p22",
		hospitalId: "alliance",
		mine: true,
		lastName: "Jensen",
		firstName: "Carol",
		mrn: "00684529",
		sex: "F",
		age: 79,
		hospital: "Alliance Community",
		unit: "Med-Surg",
		bed: "Bed 3",
		acuity: { label: news2, score: 3, level: "low" },
		trajectory: { label: change, value: "−2", trend: "down" },
		scoreChange4h: 0,
		tags: [{ label: "Fall risk" }],
		vitals: { hr: 86, spo2: 95, systolic: 126, diastolic: 70, map: 89, rr: 16 },
	},
	{
		id: "p25",
		hospitalId: "bridgeport",
		lastName: "Peterson",
		firstName: "Gary",
		mrn: "01183420",
		sex: "M",
		age: 66,
		hospital: "Bridgeport Valley",
		unit: "Med-Surg",
		bed: "Bed 1",
		acuity: { label: news2, score: 0, level: "low" },
		trajectory: { label: change, value: "−2", trend: "down" },
		scoreChange4h: 0,
		vitals: { hr: 84, spo2: 97, systolic: 134, diastolic: 76, map: 95, rr: 16 },
	},
	{
		id: "p26",
		hospitalId: "bridgeport",
		lastName: "Lambert",
		firstName: "Dorothy",
		mrn: "01219567",
		sex: "F",
		age: 83,
		hospital: "Bridgeport Valley",
		unit: "Med-Surg",
		bed: "Bed 2",
		acuity: { label: news2, score: 5, level: "medium" },
		trajectory: { label: change, value: "−1", trend: "down" },
		scoreChange4h: 0,
		tags: [{ label: "Droplet isolation" }, { label: "DNR" }],
		vitals: { hr: 88, spo2: 94, systolic: 120, diastolic: 66, map: 84, rr: 21 },
	},
	{
		id: "p27",
		hospitalId: "bridgeport",
		lastName: "Jacobs",
		firstName: "Harold",
		mrn: "01164093",
		sex: "M",
		age: 78,
		hospital: "Bridgeport Valley",
		unit: "Swing bed",
		bed: "Bed 6",
		acuity: { label: news2, score: 0, level: "low" },
		trajectory: { label: change, value: "0" },
		scoreChange4h: 0,
		tags: [{ label: "Fall risk" }],
		vitals: { hr: 72, spo2: 96, systolic: 136, diastolic: 76, map: 96, rr: 16 },
	},
	{
		id: "p28",
		hospitalId: "bridgeport",
		lastName: "Hughes",
		firstName: "Brenda",
		mrn: "01197715",
		sex: "F",
		age: 58,
		hospital: "Bridgeport Valley",
		unit: "Observation",
		bed: "Bed 4",
		acuity: { label: news2, score: 1, level: "low" },
		trajectory: { label: change, value: "−1", trend: "down" },
		scoreChange4h: 0,
		tags: [{ label: "Fall risk" }],
		vitals: { hr: 94, spo2: 98, systolic: 114, diastolic: 66, map: 82, rr: 16 },
	},
	{
		id: "p29",
		hospitalId: "bridgeport",
		lastName: "Ramirez",
		firstName: "Sofia",
		mrn: "01231148",
		sex: "F",
		age: 59,
		hospital: "Bridgeport Valley",
		unit: "ED",
		bed: "Bay 1",
		acuity: { label: news2, score: 1, level: "low" },
		trajectory: { label: change, value: "−4", trend: "down" },
		scoreChange4h: -4,
		vitals: { hr: 104, spo2: 96, systolic: 124, diastolic: 70, map: 88, rr: 20 },
	},
];

// The last hour of each primary numeric, one point a minute, ending at the current value: a rising acuity drifts in
// from better values, a falling one from worse, and every series wobbles a little (deterministic, so screenshots
// match). Missing values have no series.
function lastHour(end: number | undefined, worseBy: number, wobble: number, seed: number) {
	if (end === undefined) return undefined;
	return Array.from({ length: 60 }, (_, minute) => {
		const remaining = (59 - minute) / 59;
		const noise = Math.sin(minute * 0.21 + seed) * wobble + Math.sin(minute * 0.6 + seed * 2) * (wobble / 4);
		return Math.round((end - worseBy * remaining + (minute === 59 ? 0 : noise)) * 10) / 10;
	});
}

// Each bed's monitor alarm priorities, as its device profile would set them (illustrative, pending the client's CARESCAPE
// configuration, SQ-13): SpO₂ high (red, fast flash), HR and systolic medium (yellow, slow flash), RR low (cyan, steady).
// So Miller and Johnson flash red for SpO₂ (Hayes too, from Scenario 1's early warning), Miller's RR is cyan, Clark and
// Moore flash yellow for ABP. Walker's HR alarm was acknowledged at the bedside, so it keeps its ▲ without the color.
const sampleAlarmPriorities: MonitoringPatient["alarmPriorities"] = { hr: "medium", spo2: "high", systolic: "medium", rr: "low" };

const sampleMonitoringPatients: MonitoringPatient[] = monitoringPatients.map((patient, index) => {
	const { hr, spo2, systolic, rr } = patient.vitals ?? {};
	const direction = patient.trajectory?.trend === "up" ? 1 : patient.trajectory?.trend === "down" ? -0.5 : 0;
	return {
		...patient,
		alarmPriorities: sampleAlarmPriorities,
		acknowledgedAlarms: patient.lastName === "Walker" ? ["hr"] : [],
		trends: {
			hr: lastHour(hr, 12 * direction, 2, index),
			// SpO₂ tops out at 100%.
			spo2: lastHour(spo2, -3 * direction, 0.6, index + 1)?.map((value) => Math.min(100, value)),
			systolic: lastHour(systolic, -12 * direction, 2.5, index + 2),
			rr: lastHour(rr, 5 * direction, 1, index + 3),
		},
	};
});

// Times are relative to when the sample loads, so ages ("6 min") and Overdue read the same in every session.
const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

// Three open alerts on three patients, as the Census's pills (Oct 29, 2026, user request: 1 Critical and 2 Low to start):
// Miller's Sepsis candidate (Critical), Johnson's SpO₂ and Anderson's bed exit (Low). Their times run against their
// severity (Anderson's Low is the newest, Miller's Critical the oldest; Oct 31, 2026), so their ages and the
// Active alerts chip's order (most severe first) visibly differ. The live feed adds and changes the
// rest (`sample-live-scenario.ts`). Then alerts resolved earlier in the last 24 h (Oct 31, 2026, user request), so cards
// show the Resolved bar: Wilson 24 min ago, Bennett (3 in 24 h) 1.5 h ago, Harris 6 h ago, Taylor 20 h ago.
const resolved = (minutes: number, reason: string) => ({
	status: "resolved" as const,
	addressed: { at: minutesAgo(minutes), reason },
});

const sampleMonitoringAlerts: TriageAlert[] = [
	{
		id: "a1",
		patientId: "p1",
		severity: "critical",
		title: "Sepsis candidate",
		source: { kind: "ai", name: "Sepsis Sniffer" },
		firedAt: minutesAgo(16),
		respondBy: minutesAgo(-3),
		recommendation: "Review against the sepsis bundle.",
		evidence: ["Lactate 4.1 mmol/L, up from 2.2 at 08:10", "MAP 58 mmHg on norepinephrine 0.22", "Temp 38.9 °C · WBC 17.2"],
	},
	{
		id: "a4",
		patientId: "p2",
		severity: "low",
		title: "SpO₂ below 88% for 5 min",
		source: { kind: "rule", name: "Oxygenation" },
		firedAt: minutesAgo(9),
		respondBy: minutesAgo(-51),
	},
	{
		id: "a8",
		patientId: "p6",
		severity: "low",
		title: "Bed exit alarm",
		source: { kind: "device", name: "Bed sensor" },
		firedAt: minutesAgo(1),
		respondBy: minutesAgo(-19),
	},
	{
		id: "r1",
		patientId: "p8",
		severity: "high",
		title: "Heart rate above 120 for 10 min",
		source: { kind: "rule", name: "Vitals" },
		firedAt: minutesAgo(52),
		...resolved(24, "Treated"),
	},
	{
		id: "r2",
		patientId: "p14",
		severity: "medium",
		title: "Out of bed without assistance",
		source: { kind: "device", name: "Bed sensor" },
		firedAt: minutesAgo(250),
		...resolved(238, "Treated"),
	},
	{
		id: "r3",
		patientId: "p14",
		severity: "low",
		title: "SpO₂ probe off",
		source: { kind: "device", name: "Pulse oximeter" },
		firedAt: minutesAgo(152),
		...resolved(146, "Treated"),
	},
	{
		id: "r4",
		patientId: "p14",
		severity: "medium",
		title: "MAP below 65 for 5 min",
		source: { kind: "rule", name: "Hemodynamics" },
		firedAt: minutesAgo(110),
		...resolved(90, "Treated"),
	},
	{
		id: "r5",
		patientId: "p9",
		severity: "low",
		title: "Vitals check overdue",
		source: { kind: "rule", name: "Nursing" },
		firedAt: minutesAgo(420),
		...resolved(360, "Treated"),
	},
	{
		id: "r6",
		patientId: "p7",
		severity: "high",
		title: "Respiratory rate above 28 for 10 min",
		source: { kind: "rule", name: "Vitals" },
		firedAt: minutesAgo(1260),
		...resolved(1200, "Expected for this patient"),
	},
];

const sampleEscalationTargets: EscalationTarget[] = [
	{ id: "intensivist", name: "James Turner", description: "Intensivist on call, Tele-ICU" },
	{ id: "bedside", name: "Bedside charge nurse", description: "The patient's unit, through Messages" },
];

/**
 * Hayes's monitor at Scenario 1's early warning (Demo Use Cases, 01:40): RR 26, SpO₂ 89% on 4 L, HR 112, so NEWS2 10,
 * High, up 5 in 4 h. Her last hour climbs to these from the values before it.
 */
const hayesIndex = monitoringPatients.findIndex((patient) => patient.id === "p15");
const sampleScenario1Monitoring: Partial<MonitoringPatient> = {
	acuity: { label: news2, score: 10, level: "high" },
	trajectory: { label: change, value: "+6", trend: "up" },
	scoreChange4h: 5,
	vitals: { hr: 112, spo2: 89, systolic: 148, diastolic: 86, map: 107, rr: 26 },
	trends: {
		hr: lastHour(112, 6, 2, hayesIndex),
		spo2: lastHour(89, -3, 0.6, hayesIndex + 1)?.map((value) => Math.min(100, value)),
		systolic: lastHour(148, 1, 2.5, hayesIndex + 2),
		rr: lastHour(26, 6, 1, hayesIndex + 3),
	},
};

/**
 * Hayes's monitor at Scenario 1's resolution (06:00): RR 20, SpO₂ 95% on 2 L, HR 88, BP 128/74, so NEWS2 3, Low (SpO₂ 1
 * point, oxygen 2), down 7 since 02:00 and 1 below yesterday's. Her last hour settles to these from a little worse.
 */
const sampleScenario1ResolvedMonitoring: Partial<MonitoringPatient> = {
	acuity: { label: news2, score: 3, level: "low" },
	trajectory: { label: change, value: "-1", trend: "down" },
	scoreChange4h: -7,
	vitals: { hr: 88, spo2: 95, systolic: 128, diastolic: 74, map: 92, rr: 20 },
	trends: {
		hr: lastHour(88, -8, 2, hayesIndex),
		spo2: lastHour(95, 2, 0.6, hayesIndex + 1)?.map((value) => Math.min(100, value)),
		systolic: lastHour(128, -6, 2.5, hayesIndex + 2),
		rr: lastHour(20, -3, 1, hayesIndex + 3),
	},
};

// Dale Reynolds (Scenario 2): his monitor's seed, after everyone on the Census.
const reynoldsSeed = monitoringPatients.length;

/**
 * Dale Reynolds's monitor at Scenario 2's first beat (Alliance ED, 22:15): on BiPAP 20 min, RR 30, HR 112, BP 156/88,
 * SpO₂ 88%, NEWS2 7 (SpO₂ scale 2). Not on the Census until then. The ED set his SpO₂ alarm for his 88–92% target, so
 * 88% sits inside it and RR 30 shows ▲. His last hour: the ambulance and the ED on 2 L (SpO₂ 86%, RR 26), then BiPAP.
 */
const sampleScenario2Monitoring = (): MonitoringPatient => ({
	id: "p21",
	hospitalId: "alliance",
	mine: true,
	lastName: "Reynolds",
	firstName: "Dale",
	mrn: "00973518",
	sex: "M",
	age: 64,
	hospital: "Alliance Community",
	unit: "ED",
	bed: "Bay 3",
	limits: { spo2: [85, 100], rr: [8, 28] },
	alarmPriorities: sampleAlarmPriorities,
	acknowledgedAlarms: [],
	acuity: { label: news2, score: 7, level: "high" },
	trajectory: { label: change, value: "+1", trend: "up" },
	scoreChange4h: 1,
	tags: [{ label: "NIV" }],
	vitals: { hr: 112, spo2: 88, systolic: 156, diastolic: 88, map: 111, rr: 30 },
	trends: {
		hr: lastHour(112, 8, 2, reynoldsSeed),
		spo2: lastHour(88, 2, 0.6, reynoldsSeed + 1)?.map((value) => Math.min(100, value)),
		systolic: lastHour(156, 6, 2.5, reynoldsSeed + 2),
		rr: lastHour(30, 4, 1, reynoldsSeed + 3),
	},
});

/**
 * Dale Reynolds's monitor at Scenario 2's resolution (2 h on NIV): RR 21, HR 96, BP 138/82, SpO₂ 91%, so NEWS2 5,
 * Medium. His last hour settles to these from the alert's values.
 */
const sampleScenario2ResolvedMonitoring: Partial<MonitoringPatient> = {
	acuity: { label: news2, score: 5, level: "medium" },
	trajectory: { label: change, value: "−1", trend: "down" },
	scoreChange4h: -2,
	vitals: { hr: 96, spo2: 91, systolic: 138, diastolic: 82, map: 101, rr: 21 },
	trends: {
		hr: lastHour(96, -16, 2, reynoldsSeed),
		spo2: lastHour(91, 3, 0.6, reynoldsSeed + 1)?.map((value) => Math.min(100, value)),
		systolic: lastHour(138, -18, 2.5, reynoldsSeed + 2),
		rr: lastHour(21, -9, 1, reynoldsSeed + 3),
	},
};

// Rosa Medina (Scenario 3): her monitor's seed, after Dale Reynolds's four.
const medinaSeed = reynoldsSeed + 4;

type MonitorVitals = NonNullable<MonitoringPatient["vitals"]>;

/**
 * Rosa Medina's monitor values at each point of Scenario 3 (Demo Use Cases, "Sepsis in a patient with diabetes and
 * kidney disease"), from the scenario's facts. MAP is (systolic + 2 × diastolic) / 3, as everywhere here, so the
 * diastolic is set to give the scenario's MAP: 88/49 for MAP 62 (`fluids`) and 104/49 for MAP 67 (`pressor`), where the
 * scenario's 88/50 and 104/56 would work out to 63 and 72.
 */
const medinaVitals: Record<"triage" | "alert" | Scenario3Stage, MonitorVitals> = {
	triage: { hr: 112, spo2: 96, systolic: 96, diastolic: 58, map: 71, rr: 22 },
	alert: { hr: 124, spo2: 95, systolic: 84, diastolic: 48, map: 60, rr: 24 },
	fluids: { hr: 112, spo2: 95, systolic: 88, diastolic: 49, map: 62, rr: 22 },
	pressor: { hr: 104, spo2: 96, systolic: 104, diastolic: 49, map: 67, rr: 20 },
	"6h": { hr: 96, spo2: 97, systolic: 112, diastolic: 60, map: 77, rr: 18 },
	resolved: { hr: 88, spo2: 97, systolic: 118, diastolic: 66, map: 83, rr: 16 },
};

/** Her last hour, moving from one point's values to the next's (the next's are the end). */
const medinaTrends = (from: MonitorVitals, to: MonitorVitals): MonitoringPatient["trends"] => ({
	hr: lastHour(to.hr, (to.hr ?? 0) - (from.hr ?? 0), 2, medinaSeed),
	spo2: lastHour(to.spo2, (to.spo2 ?? 0) - (from.spo2 ?? 0), 0.6, medinaSeed + 1)?.map((value) => Math.min(100, value)),
	systolic: lastHour(to.systolic, (to.systolic ?? 0) - (from.systolic ?? 0), 2.5, medinaSeed + 2),
	rr: lastHour(to.rr, (to.rr ?? 0) - (from.rr ?? 0), 1, medinaSeed + 3),
});

/**
 * Rosa Medina's monitor at Scenario 3's first beat (Sidney ED Bay 2, 15:30): BP 84/48 (MAP 60), HR 124, RR 24, SpO₂
 * 95% on room air, T 39.4 °C, so NEWS2 10, High, up 3 from triage. Not on the Census until then. The monitor has no MAP
 * alarm, so her systolic one says it: the adult default (90–160) flags 84 with ▼, and HR 124 is over the default 120
 * (▲). Her last hour: from triage, 50 min ago (BP 96/58, HR 112, RR 22), to now.
 */
const sampleScenario3Monitoring = (): MonitoringPatient => ({
	id: "p23",
	hospitalId: "sidney",
	lastName: "Medina",
	firstName: "Rosa",
	mrn: "01147382",
	sex: "F",
	age: 58,
	hospital: "Sidney Regional",
	unit: "ED",
	bed: "Bay 2",
	// The ED's adult limits, written out so the low systolic stays flagged whatever the card's defaults become.
	limits: { systolic: [90, 160], hr: [50, 120] },
	alarmPriorities: sampleAlarmPriorities,
	acknowledgedAlarms: [],
	acuity: { label: news2, score: 10, level: "high" },
	trajectory: { label: change, value: "+3", trend: "up" },
	scoreChange4h: 3,
	tags: sampleScenario3Flags(),
	vitals: medinaVitals.alert,
	trends: medinaTrends(medinaVitals.triage, medinaVitals.alert),
});

/**
 * Rosa Medina's monitor at each later stage of Scenario 3, as on her Census card (`sampleScenario3CensusAt` says how the
 * scores are worked out). Each stage's last hour settles to its values from the stage before.
 */
function sampleScenario3MonitoringAt(stage: Scenario3Stage): Partial<MonitoringPatient> {
	const census = sampleScenario3CensusAt(stage);
	const previous = { fluids: "alert", pressor: "fluids", "6h": "pressor", resolved: "6h" } as const;
	return {
		acuity: census.acuity,
		// Monitoring's change arrow takes its color from the value, so no `trendVariant` here.
		trajectory: census.trajectory && { label: census.trajectory.label, value: census.trajectory.value, trend: census.trajectory.trend },
		scoreChange4h: census.scoreChange4h,
		vitals: medinaVitals[stage],
		trends: medinaTrends(medinaVitals[previous[stage]], medinaVitals[stage]),
	};
}

// Tyler Kessler (Scenario 4): his monitor's seed, after Rosa Medina's four.
const kesslerSeed = medinaSeed + 4;

/**
 * Tyler Kessler's monitor values at each point of Scenario 4 (Demo Use Cases, "DKA caused by insulin rationing, managed
 * by one night nurse"). Triage's RR is 24, not the 26 first given, so triage scores NEWS2 5 as the cards say (26 would
 * score 3 for RR and make it 6).
 */
const kesslerVitals: Record<"triage" | "alert" | Scenario4Stage, MonitorVitals> = {
	triage: { hr: 116, spo2: 99, systolic: 104, diastolic: 62, map: 76, rr: 24 },
	alert: { hr: 122, spo2: 99, systolic: 98, diastolic: 58, map: 71, rr: 30 },
	early: { hr: 108, spo2: 99, systolic: 108, diastolic: 64, map: 79, rr: 24 },
	dextrose: { hr: 96, spo2: 99, systolic: 116, diastolic: 70, map: 85, rr: 20 },
	closed: { hr: 82, spo2: 99, systolic: 122, diastolic: 76, map: 91, rr: 16 },
};

/** His last hour, moving from one point's values to the next's (the next's are the end). */
const kesslerTrends = (from: MonitorVitals, to: MonitorVitals): MonitoringPatient["trends"] => ({
	hr: lastHour(to.hr, (to.hr ?? 0) - (from.hr ?? 0), 2, kesslerSeed),
	spo2: lastHour(to.spo2, (to.spo2 ?? 0) - (from.spo2 ?? 0), 0.6, kesslerSeed + 1)?.map((value) => Math.min(100, value)),
	systolic: lastHour(to.systolic, (to.systolic ?? 0) - (from.systolic ?? 0), 2.5, kesslerSeed + 2),
	rr: lastHour(to.rr, (to.rr ?? 0) - (from.rr ?? 0), 1, kesslerSeed + 3),
});

/**
 * Tyler Kessler's monitor at Scenario 4's first beat (Bridgeport Med-Surg Bed 3, 23:00): HR 122, BP 98/58 (MAP 71), RR
 * 30 and deep (Kussmaul), SpO₂ 99% on room air, so NEWS2 7, High, up 2 from triage. Not on the Census until then.
 * Bridgeport's med-surg limits flag RR over 28 (▲) and HR over 120 (▲). His last hour: from triage, 40 min ago (HR 116,
 * BP 104/62, RR 24), to now.
 */
const sampleScenario4Monitoring = (): MonitoringPatient => ({
	id: "p24",
	hospitalId: "bridgeport",
	lastName: "Kessler",
	firstName: "Tyler",
	mrn: "01208854",
	sex: "M",
	age: 60,
	hospital: "Bridgeport Valley",
	unit: "Med-Surg",
	bed: "Bed 3",
	limits: { hr: [50, 120], rr: [8, 28] },
	alarmPriorities: sampleAlarmPriorities,
	acknowledgedAlarms: [],
	acuity: { label: news2, score: 7, level: "high" },
	trajectory: { label: change, value: "+2", trend: "up" },
	scoreChange4h: 2,
	tags: sampleScenario4Flags(),
	vitals: kesslerVitals.alert,
	trends: kesslerTrends(kesslerVitals.triage, kesslerVitals.alert),
});

/**
 * Tyler Kessler's monitor at each later stage of Scenario 4, as on his Census card (`sampleScenario4CensusAt` says how
 * the scores are worked out). Each stage's last hour settles to its values from the stage before. No `tags`, as there.
 */
function sampleScenario4MonitoringAt(stage: Scenario4Stage): Partial<MonitoringPatient> {
	const census = sampleScenario4CensusAt(stage);
	const previous = { early: "alert", dextrose: "early", closed: "dextrose" } as const;
	return {
		acuity: census.acuity,
		// Monitoring's change arrow takes its color from the value, so no `trendVariant` here.
		trajectory: census.trajectory && { label: census.trajectory.label, value: census.trajectory.value, trend: census.trajectory.trend },
		scoreChange4h: census.scoreChange4h,
		vitals: kesslerVitals[stage],
		trends: kesslerTrends(kesslerVitals[previous[stage]], kesslerVitals[stage]),
	};
}

export {
	sampleEscalationTargets,
	sampleMonitoringAlerts,
	sampleMonitoringPatients,
	sampleScenario1Monitoring,
	sampleScenario1ResolvedMonitoring,
	sampleScenario2Monitoring,
	sampleScenario2ResolvedMonitoring,
	sampleScenario3Monitoring,
	sampleScenario3MonitoringAt,
	sampleScenario4Monitoring,
	sampleScenario4MonitoringAt,
};
