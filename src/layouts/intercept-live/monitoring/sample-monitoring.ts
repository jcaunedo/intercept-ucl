import type { EscalationTarget, MonitoringPatient, TriageAlert } from "./monitoring";

// Synthetic data (PRD MON-080): the Census's 15 patients on the monitoring panel, with live bedside values, and the
// panel's alerts for the triage queue. The alerts give each card its pill, the same as the Census's; acuity and tags
// match the Census too. MAP is (systolic + 2 × diastolic) / 3. Outside the default alarm limits: Miller and Johnson
// (with alerts), Walker, Moore, Clark and Hayes (without one, so "Outside limits" finds them first). Carter has no SpO₂
// and Whitfield no RR (Data gap). Hayes (Chadron, Med-Surg) is Scenario 1 at 01:40 (Demo Use Cases): heart failure getting
// worse, RR 26 and SpO₂ 89% on 4 L; her early-warning alert is still to come.

const sofa = "SOFA acuity score";
const change = "Change in last 24 h";

const monitoringPatients: MonitoringPatient[] = [
	{
		id: "p1",
		hospitalId: "hpg",
		mine: true,
		lastName: "Miller",
		firstName: "Sarah",
		mrn: "01033876",
		sex: "F",
		age: 39,
		hospital: "Harbor Point General",
		unit: "MICU",
		bed: "Bed 11",
		acuity: { label: sofa, score: 13, level: "critical" },
		trajectory: { label: change, value: "+4", trend: "up" },
		tags: [{ label: "Ventilated" }, { label: "On pressors" }],
		vitals: { hr: 128, spo2: 89, systolic: 82, diastolic: 46, map: 58, rr: 32 },
	},
	{
		id: "p2",
		hospitalId: "mwh",
		mine: true,
		lastName: "Johnson",
		firstName: "Daniel",
		mrn: "00482917",
		sex: "M",
		age: 58,
		hospital: "Mercy West Hospital",
		unit: "MICU",
		bed: "Bed 3",
		acuity: { label: sofa, score: 11, level: "high" },
		trajectory: { label: change, value: "+3", trend: "up" },
		tags: [{ label: "Ventilated" }],
		vitals: { hr: 118, spo2: 84, systolic: 104, diastolic: 56, map: 72, rr: 28 },
	},
	{
		id: "p3",
		hospitalId: "cvmc",
		lastName: "Davis",
		firstName: "Linda",
		mrn: "00519364",
		sex: "F",
		age: 67,
		hospital: "CVMC",
		unit: "MICU",
		bed: "Bed 7",
		acuity: { label: sofa, score: 12, level: "critical" },
		trajectory: { label: change, value: "0" },
		tags: [{ label: "Ventilated" }, { label: "On pressors" }],
		vitals: { hr: 94, spo2: 93, systolic: 98, diastolic: 53, map: 68, rr: 18 },
	},
	{
		id: "p4",
		hospitalId: "cvmc",
		mine: true,
		lastName: "Thompson",
		firstName: "Robert",
		mrn: "00290451",
		sex: "M",
		age: 72,
		hospital: "CVMC",
		unit: "CVICU",
		bed: "Bed 5",
		acuity: { label: sofa, score: 8, level: "moderate" },
		trajectory: { label: change, value: "0" },
		tags: [{ label: "On pressors" }, { label: "DNR" }],
		vitals: { hr: 88, spo2: 95, systolic: 96, diastolic: 51, map: 66, rr: 18 },
	},
	{
		id: "p5",
		hospitalId: "hpg",
		lastName: "Carter",
		firstName: "Emily",
		mrn: "00956113",
		sex: "F",
		age: 29,
		hospital: "Harbor Point General",
		unit: "MICU",
		bed: "Bed 6",
		acuity: { label: sofa },
		trajectory: { label: change, variant: "missing" },
		tags: [{ label: "NIV" }],
		vitals: { hr: 102, systolic: 112, diastolic: 64, map: 80, rr: 24 },
	},
	{
		id: "p6",
		hospitalId: "cvmc",
		lastName: "Anderson",
		firstName: "James",
		mrn: "00164529",
		sex: "M",
		age: 81,
		hospital: "CVMC",
		unit: "SICU",
		bed: "Bed 2",
		acuity: { label: sofa, score: 3, level: "low" },
		trajectory: { label: change, value: "+1", trend: "up" },
		tags: [{ label: "Fall risk" }],
		vitals: { hr: 72, spo2: 97, systolic: 128, diastolic: 64, map: 85, rr: 14 },
	},
	{
		id: "p7",
		hospitalId: "mwh",
		mine: true,
		lastName: "Taylor",
		firstName: "Susan",
		mrn: "00377208",
		sex: "F",
		age: 45,
		hospital: "Mercy West Hospital",
		unit: "SICU",
		bed: "Bed 12",
		acuity: { label: sofa, score: 4, level: "low" },
		trajectory: { label: change, value: "−2", trend: "down" },
		tags: [{ label: "Contact isolation" }],
		vitals: { hr: 84, spo2: 96, systolic: 120, diastolic: 63, map: 82, rr: 16 },
	},
	{
		id: "p8",
		hospitalId: "hpg",
		lastName: "Wilson",
		firstName: "Michael",
		mrn: "00841290",
		sex: "M",
		age: 54,
		hospital: "Harbor Point General",
		unit: "PCU",
		bed: "Bed 14",
		acuity: { label: sofa, score: 2, level: "low" },
		trajectory: { label: change, value: "−1", trend: "down" },
		vitals: { hr: 76, spo2: 98, systolic: 128, diastolic: 71, map: 90, rr: 15 },
	},
	{
		id: "p9",
		hospitalId: "hpg",
		mine: true,
		lastName: "Harris",
		firstName: "William",
		mrn: "00615874",
		sex: "M",
		age: 70,
		hospital: "Harbor Point General",
		unit: "MICU",
		bed: "Bed 8",
		acuity: { label: sofa, score: 10, level: "high" },
		trajectory: { label: change, value: "+2", trend: "up" },
		tags: [{ label: "Ventilated" }],
		vitals: { hr: 112, spo2: 91, systolic: 92, diastolic: 50, map: 64, rr: 26 },
	},
	{
		id: "p10",
		hospitalId: "hpg",
		lastName: "Moore",
		firstName: "Patricia",
		mrn: "01120438",
		sex: "F",
		age: 61,
		hospital: "Harbor Point General",
		unit: "SICU",
		bed: "Bed 4",
		acuity: { label: sofa, score: 7, level: "moderate" },
		trajectory: { label: change, value: "+2", trend: "up" },
		tags: [{ label: "On pressors" }, { label: "Dialysis" }],
		vitals: { hr: 98, spo2: 96, systolic: 88, diastolic: 48, map: 61, rr: 19 },
	},
	{
		id: "p11",
		hospitalId: "hpg",
		lastName: "Clark",
		firstName: "Jennifer",
		mrn: "00908135",
		sex: "F",
		age: 34,
		hospital: "Harbor Point General",
		unit: "OB-ICU",
		bed: "Bed 1",
		acuity: { label: sofa, score: 5, level: "moderate" },
		trajectory: { label: change, value: "+1", trend: "up" },
		tags: [{ label: "Droplet isolation" }],
		vitals: { hr: 92, spo2: 98, systolic: 162, diastolic: 96, map: 118, rr: 20 },
	},
	{
		id: "p12",
		hospitalId: "hpg",
		lastName: "Whitfield",
		firstName: "Grace",
		mrn: "00257719",
		sex: "F",
		age: 88,
		hospital: "Harbor Point General",
		unit: "Neuro ICU",
		bed: "Bed 2",
		acuity: { label: sofa, score: 5, level: "low" },
		trajectory: { label: change, value: "0" },
		tags: [{ label: "DNR" }, { label: "Fall risk" }],
		vitals: { hr: 80, spo2: 94, systolic: 104, diastolic: 59, map: 74 },
	},
	{
		id: "p13",
		hospitalId: "cvmc",
		mine: true,
		lastName: "Walker",
		firstName: "Thomas",
		mrn: "00733062",
		sex: "M",
		age: 63,
		hospital: "CVMC",
		unit: "CVICU",
		bed: "Bed 3",
		acuity: { label: sofa, score: 12, level: "critical" },
		trajectory: { label: change, value: "+2", trend: "up" },
		tags: [{ label: "Ventilated" }, { label: "On pressors" }, { label: "ECMO" }],
		vitals: { hr: 134, spo2: 94, systolic: 84, diastolic: 41, map: 55, rr: 22 },
	},
	{
		id: "p14",
		hospitalId: "cvmc",
		lastName: "Bennett",
		firstName: "Karen",
		mrn: "00499320",
		sex: "F",
		age: 50,
		hospital: "CVMC",
		unit: "CCU",
		bed: "Bed 9",
		acuity: { label: sofa },
		trajectory: { label: change, variant: "missing" },
		vitals: { hr: 88, spo2: 97, systolic: 110, diastolic: 61, map: 77, rr: 17 },
	},
	{
		id: "p15",
		hospitalId: "chadron",
		lastName: "Hayes",
		firstName: "Margaret",
		mrn: "00826154",
		sex: "F",
		age: 72,
		hospital: "Chadron Community Hospital",
		unit: "Med-Surg",
		bed: "Bed 4",
		acuity: { label: sofa, score: 3, level: "low" },
		trajectory: { label: change, value: "+2", trend: "up" },
		tags: [{ label: "Fall risk" }],
		vitals: { hr: 112, spo2: 89, systolic: 148, diastolic: 86, map: 107, rr: 26 },
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

const sampleMonitoringPatients: MonitoringPatient[] = monitoringPatients.map((patient, index) => {
	const { hr, spo2, systolic, rr } = patient.vitals ?? {};
	const direction = patient.trajectory?.trend === "up" ? 1 : patient.trajectory?.trend === "down" ? -0.5 : 0;
	return {
		...patient,
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

// Three alerts on three patients, as the Census's pills (Oct 29, 2026, user request: 1 Critical and 2 Low to start):
// Miller's Sepsis candidate (Critical), Johnson's SpO₂ and Anderson's bed exit (Low). The live feed adds and changes the
// rest (`sample-live-scenario.ts`).
const sampleMonitoringAlerts: TriageAlert[] = [
	{
		id: "a1",
		patientId: "p1",
		severity: "critical",
		title: "Sepsis candidate",
		source: { kind: "ai", name: "Sepsis Sniffer" },
		firedAt: minutesAgo(2),
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
		firedAt: minutesAgo(41),
		respondBy: minutesAgo(-19),
	},
];

const sampleEscalationTargets: EscalationTarget[] = [
	{ id: "intensivist", name: "James Tan", description: "Intensivist on call, Tele-ICU" },
	{ id: "bedside", name: "Bedside charge nurse", description: "The patient's unit, through Messages" },
];

export { sampleEscalationTargets, sampleMonitoringAlerts, sampleMonitoringPatients };
