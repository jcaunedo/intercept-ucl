import { samplePatientPhotos } from "../sample-data/sample-patient-photos";
import type { CensusPatient } from "./census";

// Synthetic data (PRD PC-180). The first eight patients are Figma's; thirteen more fill the hospital counts (Sidney 14,
// Alliance 3, Chadron 4, Bridgeport none). Eight of Sidney's were at Harbor Point General until Nov 6, 2026, when it
// became Bridgeport, a critical access hospital with no ICU (user's call). Scenario 2's Dale Reynolds joins Alliance when
// it plays, and Scenario 4's Tyler Kessler is Bridgeport's first. My patients (`mine`) are Chadron's three and Alliance's, Dale included, plus Johnson and Harris: 8, then 9
// with Dale (DESIGN.md "My patients").
// Acuity is the NEWS2-style score, the same as on Monitoring (`sample-monitoring.ts` says how it's worked out).

const news2 = "NEWS2";
const change = "Change in last 24 h";
// When the clinician last opened a patient, or a patient's last alert resolved (the Recently viewed and Recently
// resolved sorts): Thompson, Davis, Miller and Clark were viewed; Wilson, Bennett, Harris and Taylor had one resolve.
// When each arrived on their unit, as their record says (ICU admission, else hospital admission): seven in the last
// 24 h for New patients, Carter, Harris, Moore, Bennett, Hayes, Ortega and Norman.
const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();

const samplePatients: CensusPatient[] = [
	{
		id: "p1",
		hospitalId: "sidney",
		photo: samplePatientPhotos.p1,
		lastName: "Miller",
		firstName: "Sarah",
		mrn: "01033876",
		sex: "F",
		age: 39,
		hospital: "Sidney Regional",
		unit: "MICU",
		bed: "Bed 11",
		arrivedAt: hoursAgo(52),
		alert: { variant: "critical" },
		acuity: { label: news2, score: 17, level: "high" },
		trajectory: { label: change, value: "+7", trend: "up", trendVariant: "critical" },
		scoreChange4h: 0,
		lastViewedAt: hoursAgo(2),
		vitals: [
			{ label: "Heart Rate", shortLabel: "HR", value: 128, variant: "destructive", range: "above" },
			{ label: "MAP", value: 58, variant: "destructive", range: "below" },
			{ label: "SpO₂", value: "90%", variant: "destructive", range: "below" },
			{ label: "Resp. Rate", shortLabel: "RR", value: 30, variant: "destructive", range: "above" },
		],
		tags: [{ label: "Ventilated" }, { label: "2 pressors" }],
		sepsisWatch: true,
	},
	{
		id: "p2",
		hospitalId: "sidney",
		mine: true,
		photo: samplePatientPhotos.p2,
		lastName: "Johnson",
		firstName: "Daniel",
		mrn: "00482917",
		sex: "M",
		age: 58,
		hospital: "Sidney Regional",
		unit: "MICU",
		bed: "Bed 3",
		arrivedAt: hoursAgo(38),
		alert: { variant: "low" },
		acuity: { label: news2, score: 15, level: "high" },
		trajectory: { label: change, value: "+1", trend: "up", trendVariant: "critical" },
		scoreChange4h: 0,
		vitals: [
			{ label: "Heart Rate", shortLabel: "HR", value: 118, variant: "destructive", range: "above" },
			{ label: "MAP", value: 72 },
			{ label: "SpO₂", value: "82%", variant: "destructive", range: "below" },
			{ label: "Resp. Rate", shortLabel: "RR", value: 28, variant: "destructive", range: "above" },
		],
		tags: [{ label: "Ventilated" }],
	},
	{
		id: "p3",
		hospitalId: "sidney",
		lastName: "Davis",
		firstName: "Linda",
		unreadMessages: 2,
		mrn: "00519364",
		sex: "F",
		age: 67,
		hospital: "Sidney Regional",
		unit: "MICU",
		bed: "Bed 7",
		arrivedAt: hoursAgo(116),
		acuity: { label: news2, score: 10, level: "high" },
		trajectory: { label: change, value: "−2", trend: "down", trendVariant: "success" },
		scoreChange4h: 0,
		lastViewedAt: hoursAgo(0.7),
		vitals: [
			{ label: "Heart Rate", shortLabel: "HR", value: 94 },
			{ label: "MAP", value: 68 },
			{ label: "SpO₂", value: "93%" },
			{ label: "Resp. Rate", shortLabel: "RR", value: 18 },
		],
		tags: [{ label: "Ventilated" }, { label: "1 pressor" }],
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
		arrivedAt: hoursAgo(75),
		acuity: { label: news2, score: 5, level: "medium" },
		trajectory: { label: change, value: "+1", trend: "up", trendVariant: "critical" },
		scoreChange4h: 0,
		lastViewedAt: hoursAgo(0.2),
		vitals: [
			{ label: "Heart Rate", shortLabel: "HR", value: 88 },
			{ label: "MAP", value: 66 },
			{ label: "SpO₂", value: "95%" },
			{ label: "Resp. Rate", shortLabel: "RR", value: 18 },
		],
		tags: [{ label: "2 pressors" }, { label: "DNR" }],
	},
	{
		id: "p5",
		hospitalId: "sidney",
		photo: samplePatientPhotos.p5,
		lastName: "Carter",
		firstName: "Emily",
		mrn: "00956113",
		sex: "F",
		age: 29,
		hospital: "Sidney Regional",
		unit: "MICU",
		bed: "Bed 6",
		arrivedAt: hoursAgo(19),
		acuity: { label: news2 },
		trajectory: { label: change, variant: "missing" },
		vitals: [
			{ label: "Heart Rate", shortLabel: "HR", value: 102, variant: "destructive", range: "above" },
			{ label: "MAP", value: 80 },
			{ label: "SpO₂", variant: "missing" },
			{ label: "Resp. Rate", shortLabel: "RR", value: 24, variant: "destructive", range: "above" },
		],
		tags: [{ label: "NIV" }],
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
		arrivedAt: hoursAgo(44),
		alert: { variant: "low" },
		acuity: { label: news2, score: 3, level: "low" },
		trajectory: { label: change, value: "+2", trend: "up", trendVariant: "critical" },
		scoreChange4h: 0,
		vitals: [
			{ label: "Heart Rate", shortLabel: "HR", value: 72 },
			{ label: "MAP", value: 85 },
			{ label: "SpO₂", value: "97%" },
			{ label: "Resp. Rate", shortLabel: "RR", value: 14 },
		],
		tags: [{ label: "Fall risk" }],
	},
	{
		id: "p7",
		hospitalId: "sidney",
		lastName: "Taylor",
		firstName: "Susan",
		mrn: "00377208",
		sex: "F",
		age: 45,
		hospital: "Sidney Regional",
		unit: "SICU",
		bed: "Bed 12",
		arrivedAt: hoursAgo(80),
		acuity: { label: news2, score: 0, level: "low" },
		trajectory: { label: change, value: "−3", trend: "down", trendVariant: "success" },
		scoreChange4h: 0,
		lastResolvedAt: hoursAgo(20),
		vitals: [
			{ label: "Heart Rate", shortLabel: "HR", value: 84 },
			{ label: "MAP", value: 82 },
			{ label: "SpO₂", value: "96%" },
			{ label: "Resp. Rate", shortLabel: "RR", value: 16 },
		],
		tags: [{ label: "Contact isolation" }],
	},
	{
		id: "p8",
		hospitalId: "sidney",
		lastName: "Wilson",
		firstName: "Michael",
		mrn: "00841290",
		sex: "M",
		age: 54,
		hospital: "Sidney Regional",
		unit: "PCU",
		bed: "Bed 14",
		arrivedAt: hoursAgo(33),
		acuity: { label: news2, score: 0, level: "low" },
		trajectory: { label: change, value: "0" },
		scoreChange4h: 0,
		lastResolvedAt: hoursAgo(0.4),
		vitals: [
			{ label: "Heart Rate", shortLabel: "HR", value: 76 },
			{ label: "MAP", value: 90 },
			{ label: "SpO₂", value: "98%" },
			{ label: "Resp. Rate", shortLabel: "RR", value: 15 },
		],
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
		arrivedAt: hoursAgo(16),
		acuity: { label: news2, score: 16, level: "high" },
		trajectory: { label: change, value: "+6", trend: "up", trendVariant: "critical" },
		scoreChange4h: 2,
		lastResolvedAt: hoursAgo(6),
		vitals: [
			{ label: "Heart Rate", shortLabel: "HR", value: 112, variant: "destructive", range: "above" },
			{ label: "MAP", value: 64 },
			{ label: "SpO₂", value: "91%", variant: "destructive", range: "below" },
			{ label: "Resp. Rate", shortLabel: "RR", value: 26, variant: "destructive", range: "above" },
		],
		tags: [{ label: "Ventilated" }],
		sepsisWatch: true,
	},
	{
		id: "p10",
		hospitalId: "sidney",
		lastName: "Moore",
		firstName: "Patricia",
		unreadMessages: 1,
		mrn: "01120438",
		sex: "F",
		age: 61,
		hospital: "Sidney Regional",
		unit: "SICU",
		bed: "Bed 4",
		arrivedAt: hoursAgo(22),
		acuity: { label: news2, score: 7, level: "high" },
		trajectory: { label: change, value: "+1", trend: "up", trendVariant: "critical" },
		scoreChange4h: 0,
		vitals: [
			{ label: "Heart Rate", shortLabel: "HR", value: 98 },
			{ label: "MAP", value: 61, variant: "destructive", range: "below" },
			{ label: "SpO₂", value: "96%" },
			{ label: "Resp. Rate", shortLabel: "RR", value: 19 },
		],
		tags: [{ label: "1 pressor" }, { label: "Dialysis" }],
		sepsisWatch: true,
	},
	{
		id: "p11",
		hospitalId: "sidney",
		lastName: "Clark",
		firstName: "Jennifer",
		mrn: "00908135",
		sex: "F",
		age: 34,
		hospital: "Sidney Regional",
		unit: "OB-ICU",
		bed: "Bed 1",
		arrivedAt: hoursAgo(26),
		acuity: { label: news2, score: 1, level: "low" },
		trajectory: { label: change, value: "0" },
		scoreChange4h: 0,
		lastViewedAt: hoursAgo(5),
		vitals: [
			{ label: "Heart Rate", shortLabel: "HR", value: 92 },
			{ label: "MAP", value: 118, variant: "destructive", range: "above" },
			{ label: "SpO₂", value: "98%" },
			{ label: "Resp. Rate", shortLabel: "RR", value: 20 },
		],
		tags: [{ label: "Droplet isolation" }],
	},
	{
		id: "p12",
		hospitalId: "sidney",
		lastName: "Whitfield",
		firstName: "Grace",
		mrn: "00257719",
		sex: "F",
		age: 88,
		hospital: "Sidney Regional",
		unit: "Neuro ICU",
		bed: "Bed 2",
		arrivedAt: hoursAgo(47),
		acuity: { label: news2 },
		trajectory: { label: change, variant: "missing" },
		vitals: [
			{ label: "Heart Rate", shortLabel: "HR", value: 80 },
			{ label: "MAP", value: 74 },
			{ label: "SpO₂", value: "94%" },
			{ label: "Resp. Rate", shortLabel: "RR", variant: "missing" },
		],
		tags: [{ label: "3% NaCl" }, { label: "DNR" }, { label: "Fall risk" }],
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
		arrivedAt: hoursAgo(99),
		acuity: { label: news2, score: 14, level: "high" },
		trajectory: { label: change, value: "+5", trend: "up", trendVariant: "critical" },
		scoreChange4h: 1,
		vitals: [
			{ label: "Heart Rate", shortLabel: "HR", value: 134, variant: "destructive", range: "above" },
			{ label: "MAP", value: 55, variant: "destructive", range: "below" },
			{ label: "SpO₂", value: "94%" },
			{ label: "Resp. Rate", shortLabel: "RR", value: 22 },
		],
		tags: [{ label: "Ventilated" }, { label: "2 pressors" }, { label: "ECMO" }],
	},
	{
		id: "p14",
		hospitalId: "sidney",
		lastName: "Bennett",
		firstName: "Karen",
		unreadMessages: 1,
		mrn: "00499320",
		sex: "F",
		age: 50,
		hospital: "Sidney Regional",
		unit: "CCU",
		bed: "Bed 9",
		arrivedAt: hoursAgo(5),
		acuity: { label: news2, score: 1, level: "low" },
		trajectory: { label: change, value: "−6", trend: "down", trendVariant: "success" },
		scoreChange4h: -6,
		lastResolvedAt: hoursAgo(1.5),
		vitals: [
			{ label: "Heart Rate", shortLabel: "HR", value: 88 },
			{ label: "MAP", value: 77 },
			{ label: "SpO₂", value: "97%" },
			{ label: "Resp. Rate", shortLabel: "RR", value: 17 },
		],
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
		arrivedAt: hoursAgo(20),
		// Just before Scenario 1: NEWS2 5, up 1 from admission and steady over 4 h (`sampleScenario1Census`, 01:40).
		acuity: { label: news2, score: 5, level: "medium" },
		trajectory: { label: change, value: "+1", trend: "up", trendVariant: "medium" },
		scoreChange4h: 0,
		vitals: [
			{ label: "Heart Rate", shortLabel: "HR", value: 106 },
			{ label: "MAP", value: 106 },
			{ label: "SpO₂", value: "92%" },
			{ label: "Resp. Rate", shortLabel: "RR", value: 20 },
		],
		tags: [{ label: "Fall risk" }],
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
		arrivedAt: hoursAgo(66),
		acuity: { label: news2, score: 2, level: "low" },
		trajectory: { label: change, value: "−3", trend: "down", trendVariant: "success" },
		scoreChange4h: 0,
		vitals: [
			{ label: "Heart Rate", shortLabel: "HR", value: 84 },
			{ label: "MAP", value: 90 },
			{ label: "SpO₂", value: "96%" },
			{ label: "Resp. Rate", shortLabel: "RR", value: 18 },
		],
		tags: [{ label: "DNR" }, { label: "Fall risk" }],
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
		arrivedAt: hoursAgo(40),
		acuity: { label: news2, score: 1, level: "low" },
		trajectory: { label: change, value: "−2", trend: "down", trendVariant: "success" },
		scoreChange4h: 0,
		vitals: [
			{ label: "Heart Rate", shortLabel: "HR", value: 76 },
			{ label: "MAP", value: 97 },
			{ label: "SpO₂", value: "95%" },
			{ label: "Resp. Rate", shortLabel: "RR", value: 16 },
		],
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
		arrivedAt: hoursAgo(30),
		acuity: { label: news2, score: 0, level: "low" },
		trajectory: { label: change, value: "−1", trend: "down", trendVariant: "success" },
		scoreChange4h: 0,
		vitals: [
			{ label: "Heart Rate", shortLabel: "HR", value: 80 },
			{ label: "MAP", value: 93 },
			{ label: "SpO₂", value: "97%" },
			{ label: "Resp. Rate", shortLabel: "RR", value: 16 },
		],
	},
	{
		id: "p17",
		hospitalId: "alliance",
		mine: true,
		photo: samplePatientPhotos.p17,
		lastName: "Ortega",
		firstName: "Lucía",
		mrn: "00658213",
		sex: "F",
		age: 67,
		hospital: "Alliance Community",
		unit: "Med-Surg",
		bed: "Bed 10",
		arrivedAt: hoursAgo(20),
		acuity: { label: news2, score: 6, level: "medium" },
		trajectory: { label: change, value: "+2", trend: "up", trendVariant: "critical" },
		scoreChange4h: 1,
		vitals: [
			{ label: "Heart Rate", shortLabel: "HR", value: 104 },
			{ label: "MAP", value: 80 },
			{ label: "SpO₂", value: "95%" },
			{ label: "Resp. Rate", shortLabel: "RR", value: 21 },
		],
	},
	{
		id: "p18",
		hospitalId: "alliance",
		mine: true,
		photo: samplePatientPhotos.p18,
		lastName: "Norman",
		firstName: "Keith",
		mrn: "00914370",
		sex: "M",
		age: 54,
		hospital: "Alliance Community",
		unit: "Med-Surg",
		bed: "Bed 5",
		arrivedAt: hoursAgo(21),
		acuity: { label: news2, score: 1, level: "low" },
		trajectory: { label: change, value: "−4", trend: "down", trendVariant: "success" },
		scoreChange4h: 0,
		vitals: [
			{ label: "Heart Rate", shortLabel: "HR", value: 92 },
			{ label: "MAP", value: 92 },
			{ label: "SpO₂", value: "98%" },
			{ label: "Resp. Rate", shortLabel: "RR", value: 16 },
		],
		tags: [{ label: "Insulin infusion" }],
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
		arrivedAt: hoursAgo(34),
		acuity: { label: news2, score: 3, level: "low" },
		trajectory: { label: change, value: "−2", trend: "down", trendVariant: "success" },
		scoreChange4h: 0,
		vitals: [
			{ label: "Heart Rate", shortLabel: "HR", value: 86 },
			{ label: "MAP", value: 89 },
			{ label: "SpO₂", value: "95%" },
			{ label: "Resp. Rate", shortLabel: "RR", value: 16 },
		],
		tags: [{ label: "Fall risk" }],
	},
];

/** Hayes's card at Scenario 1's early warning (Demo Use Cases, 01:40): NEWS2 10, High, up 5 in 4 h and 6 in 24 h. */
const sampleScenario1Census: Partial<CensusPatient> = {
	acuity: { label: news2, score: 10, level: "high" },
	trajectory: { label: change, value: "+6", trend: "up", trendVariant: "critical" },
	scoreChange4h: 5,
	vitals: [
		{ label: "Heart Rate", shortLabel: "HR", value: 112 },
		{ label: "MAP", value: 107 },
		{ label: "SpO₂", value: "89%", variant: "destructive", range: "below" },
		{ label: "Resp. Rate", shortLabel: "RR", value: 26 },
	],
};

/** Hayes's card at Scenario 1's resolution (06:00): NEWS2 3, Low, 1 below yesterday's; RR 20, SpO₂ 95% on 2 L. */
const sampleScenario1ResolvedCensus: Partial<CensusPatient> = {
	acuity: { label: news2, score: 3, level: "low" },
	trajectory: { label: change, value: "-1", trend: "down", trendVariant: "success" },
	scoreChange4h: -7,
	vitals: [
		{ label: "Heart Rate", shortLabel: "HR", value: 88 },
		{ label: "MAP", value: 92 },
		{ label: "SpO₂", value: "95%" },
		{ label: "Resp. Rate", shortLabel: "RR", value: 20 },
	],
};

/**
 * Dale Reynolds (Scenario 2, Demo Use Cases, "COPD respiratory failure during a blizzard"): severe COPD, in Alliance's
 * ED on BiPAP. Not on the Census until the ED requests the hub's consult, the scenario's first beat, so his card is
 * built then (he arrived 40 min before it). NEWS2 on SpO₂ scale 2 (`sample-patient-records.ts` says why): 6 on arrival,
 * 7 now. His SpO₂ of 88% is on target, so it isn't flagged; RR 30 is.
 */
const sampleScenario2Census = (): CensusPatient => ({
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
	arrivedAt: hoursAgo(40 / 60),
	acuity: { label: news2, score: 7, level: "high" },
	trajectory: { label: change, value: "+1", trend: "up", trendVariant: "medium" },
	scoreChange4h: 1,
	vitals: [
		{ label: "Heart Rate", shortLabel: "HR", value: 112 },
		{ label: "MAP", value: 111 },
		{ label: "SpO₂", value: "88%" },
		{ label: "Resp. Rate", shortLabel: "RR", value: 30, variant: "destructive", range: "above" },
	],
	tags: [{ label: "NIV" }],
});

/** Dale Reynolds's card at Scenario 2's resolution (2 h on NIV): NEWS2 5, Medium, 1 below arrival; RR 21, SpO₂ 91%. */
const sampleScenario2ResolvedCensus: Partial<CensusPatient> = {
	acuity: { label: news2, score: 5, level: "medium" },
	trajectory: { label: change, value: "−1", trend: "down", trendVariant: "success" },
	scoreChange4h: -2,
	vitals: [
		{ label: "Heart Rate", shortLabel: "HR", value: 96 },
		{ label: "MAP", value: 101 },
		{ label: "SpO₂", value: "91%" },
		{ label: "Resp. Rate", shortLabel: "RR", value: 21 },
	],
};

/* -------------------------------------------------------------------------- */
/* Scenario 3: Rosa Medina                                                    */
/* -------------------------------------------------------------------------- */

/** The stages of Scenario 3 after its first beat, in order (Demo Use Cases, "Sepsis in a patient with diabetes and kidney disease"). */
type Scenario3Stage = "fluids" | "pressor" | "6h" | "resolved";

/**
 * Rosa Medina's two flags, the same on her Census card, her monitor card and her alert, each with what's behind it.
 * Given here rather than worked out from her record (`shared/flag-details.ts` has no rule for either). Built when the
 * beat plays, so "Registration · 50 min ago" reads from then. Her preferred language is from registration on arrival;
 * the renal dosing rule fired when her BMP resulted, 22 min before the screen.
 */
const sampleScenario3Flags = (): NonNullable<CensusPatient["tags"]> => [
	{
		label: "Spanish interpreter",
		details: {
			items: [
				{ label: "Preferred language", value: "Spanish" },
				{ term: "Interpreter:", label: "A certified medical interpreter for consent and care decisions, not family" },
				{ term: "At the bedside:", label: "Her daughter Elena, 24, who speaks English" },
			],
			source: "Registration",
			updatedAt: hoursAgo(50 / 60),
		},
	},
	{
		label: "Renal dosing",
		details: {
			items: [
				{ label: "eGFR", value: "22 mL/min/1.73 m²" },
				{ label: "CKD", value: "Stage 4 · baseline creatinine 2.4" },
				{ label: "Check the dose of every renally cleared drug" },
			],
			source: "Pharmacy rule",
			updatedAt: hoursAgo(22 / 60),
		},
	},
];

/**
 * Rosa Medina (Scenario 3, Demo Use Cases, "Sepsis in a patient with diabetes and kidney disease"): 51, type 2 diabetes
 * and CKD stage 4, boarding in Sidney's ED (its inpatient unit is full). Not on the Census until the sepsis screen fires,
 * the scenario's first beat (15:30), so her card is built then; she walked in 50 min before it. NEWS2 10, High, up 3
 * from 7 at triage: HR 124 and MAP 60 (BP 84/48) are outside the limits; RR 24 and SpO₂ 95% on room air aren't flagged.
 * Sidney isn't one of "my" hospitals, so no `mine`. On the sepsis watch list from the screen.
 */
const sampleScenario3Census = (): CensusPatient => ({
	id: "p23",
	hospitalId: "sidney",
	lastName: "Medina",
	firstName: "Rosa",
	mrn: "01147382",
	sex: "F",
	age: 51,
	hospital: "Sidney Regional",
	unit: "ED",
	bed: "Bay 2",
	arrivedAt: hoursAgo(50 / 60),
	acuity: { label: news2, score: 10, level: "high" },
	trajectory: { label: change, value: "+3", trend: "up", trendVariant: "critical" },
	scoreChange4h: 3,
	vitals: [
		{ label: "Heart Rate", shortLabel: "HR", value: 124, variant: "destructive", range: "above" },
		{ label: "MAP", value: 60, variant: "destructive", range: "below" },
		{ label: "SpO₂", value: "95%" },
		{ label: "Resp. Rate", shortLabel: "RR", value: 24 },
	],
	tags: sampleScenario3Flags(),
	sepsisWatch: true,
});

/**
 * Rosa Medina's card at each later stage of Scenario 3. The change in 24 h is against her first score, 7 at triage (she
 * has none before); the 4 h change against her score about 4 h before the stage.
 * - `fluids` (2,000 mL of LR, about 45 min in): NEWS2 9, High; MAP 62 still under 65.
 * - `pressor` (norepinephrine 0.08, about 1 h 15 min): NEWS2 3, Low. NEWS2 doesn't count the norepinephrine she needs
 *   to hold MAP 67, so Low here doesn't mean well.
 * - `6h`: NEWS2 1 (HR 96), on norepinephrine 0.04; 4 h earlier she was 3.
 * - `resolved` (12 h, about 03:30): NEWS2 0, off norepinephrine for 1 h; 8 h earlier she was 1.
 */
function sampleScenario3CensusAt(stage: Scenario3Stage): Partial<CensusPatient> {
	switch (stage) {
		case "fluids":
			return {
				acuity: { label: news2, score: 9, level: "high" },
				trajectory: { label: change, value: "+2", trend: "up", trendVariant: "critical" },
				scoreChange4h: 2,
				vitals: [
					{ label: "Heart Rate", shortLabel: "HR", value: 112 },
					{ label: "MAP", value: 62, variant: "destructive", range: "below" },
					{ label: "SpO₂", value: "95%" },
					{ label: "Resp. Rate", shortLabel: "RR", value: 22 },
				],
			};
		case "pressor":
			return {
				acuity: { label: news2, score: 3, level: "low" },
				trajectory: { label: change, value: "−4", trend: "down", trendVariant: "success" },
				scoreChange4h: -4,
				vitals: [
					{ label: "Heart Rate", shortLabel: "HR", value: 104 },
					{ label: "MAP", value: 67 },
					{ label: "SpO₂", value: "96%" },
					{ label: "Resp. Rate", shortLabel: "RR", value: 20 },
				],
			};
		case "6h":
			return {
				acuity: { label: news2, score: 1, level: "low" },
				trajectory: { label: change, value: "−6", trend: "down", trendVariant: "success" },
				scoreChange4h: -2,
				vitals: [
					{ label: "Heart Rate", shortLabel: "HR", value: 96 },
					{ label: "MAP", value: 77 },
					{ label: "SpO₂", value: "97%" },
					{ label: "Resp. Rate", shortLabel: "RR", value: 18 },
				],
			};
		case "resolved":
			return {
				acuity: { label: news2, score: 0, level: "low" },
				trajectory: { label: change, value: "−7", trend: "down", trendVariant: "success" },
				scoreChange4h: -1,
				vitals: [
					{ label: "Heart Rate", shortLabel: "HR", value: 88 },
					{ label: "MAP", value: 83 },
					{ label: "SpO₂", value: "97%" },
					{ label: "Resp. Rate", shortLabel: "RR", value: 16 },
				],
			};
	}
}

/* -------------------------------------------------------------------------- */
/* Scenario 4: Tyler Kessler                                                  */
/* -------------------------------------------------------------------------- */

/** The stages of Scenario 4 after its first beat, in order (Demo Use Cases, "DKA caused by insulin rationing, managed by one night nurse"). */
type Scenario4Stage = "early" | "dextrose" | "closed";

/**
 * Tyler Kessler's flags, the same on his Census card, his monitor card and his alert, each with what's behind it.
 * "Coverage lapsed" is registration's from his arrival (22:20, 40 min before the alert). "Insulin rationing" joins it
 * once the APP's admission note (07:30) records it as a structured social need (`rationing`), not free text (step 5).
 * Built when the beat plays, so "1 min ago" reads from then.
 */
const sampleScenario4Flags = (rationing = false): NonNullable<CensusPatient["tags"]> => [
	...(rationing
		? [
				{
					label: "Insulin rationing",
					details: {
						items: [
							{ term: "Social need, structured:", label: "Cost-related insulin rationing (Z91.120)" },
							{ term: "Why:", label: "Stretching his glargine and lispro for 3 months, since losing Medicaid" },
							{ term: "At discharge:", label: "Referrals for insulin assistance and a diabetes educator" },
						],
						source: "Admission note · Derek Lawson, PA-C",
						updatedAt: hoursAgo(1 / 60),
					},
				},
			]
		: []),
	{
		label: "Coverage lapsed",
		details: {
			items: [
				{ label: "Payer", value: "Uninsured" },
				{ label: "Medicaid", value: "Ended at redetermination in August" },
			],
			source: "Registration",
			updatedAt: hoursAgo(40 / 60),
		},
	},
];

/**
 * Tyler Kessler (Scenario 4, Demo Use Cases, "DKA caused by insulin rationing, managed by one night nurse"): 24, type 1
 * diabetes since 11, out of his glargine for 2 days. In Bridgeport's ED from 22:20, admitted to its inpatient side (Med-
 * Surg, Bed 3). Not on the Census until his labs cross the critical thresholds, the scenario's first beat (23:00), so his
 * card is built then. NEWS2 7, High, up 2 from 5 at triage: RR 30 (Kussmaul) and HR 122 are outside the limits; BP 98/58
 * (MAP 71) and SpO₂ 99% on room air aren't flagged. Bridgeport isn't one of "my" hospitals, so no `mine`.
 */
const sampleScenario4Census = (): CensusPatient => ({
	id: "p24",
	hospitalId: "bridgeport",
	lastName: "Kessler",
	firstName: "Tyler",
	mrn: "01208854",
	sex: "M",
	age: 24,
	hospital: "Bridgeport Valley",
	unit: "Med-Surg",
	bed: "Bed 3",
	arrivedAt: hoursAgo(40 / 60),
	acuity: { label: news2, score: 7, level: "high" },
	trajectory: { label: change, value: "+2", trend: "up", trendVariant: "critical" },
	scoreChange4h: 2,
	vitals: [
		{ label: "Heart Rate", shortLabel: "HR", value: 122, variant: "destructive", range: "above" },
		{ label: "MAP", value: 71 },
		{ label: "SpO₂", value: "99%" },
		{ label: "Resp. Rate", shortLabel: "RR", value: 30, variant: "destructive", range: "above" },
	],
	tags: sampleScenario4Flags(),
});

/**
 * Tyler Kessler's card at each later stage of Scenario 4. The change in 24 h is against his first score, 5 at triage
 * (he has none before); the 4 h change against his score about 4 h before the stage (triage's for `early`, the oldest
 * in its window). No `tags`: the beat that records the rationing sets them on their own.
 * - `early` (01:00, 2 h on insulin): NEWS2 4, Low; HR 108, BP 108/64, RR 24.
 * - `dextrose` (05:00, glucose 238, D5 started): NEWS2 1 (HR 96); 4 h earlier he was 4.
 * - `closed` (12:00, gap closed): NEWS2 0; 4 h earlier (08:00) he was 1.
 */
function sampleScenario4CensusAt(stage: Scenario4Stage): Partial<CensusPatient> {
	switch (stage) {
		case "early":
			return {
				acuity: { label: news2, score: 4, level: "low" },
				trajectory: { label: change, value: "−1", trend: "down", trendVariant: "success" },
				scoreChange4h: -1,
				vitals: [
					{ label: "Heart Rate", shortLabel: "HR", value: 108 },
					{ label: "MAP", value: 79 },
					{ label: "SpO₂", value: "99%" },
					{ label: "Resp. Rate", shortLabel: "RR", value: 24 },
				],
			};
		case "dextrose":
			return {
				acuity: { label: news2, score: 1, level: "low" },
				trajectory: { label: change, value: "−4", trend: "down", trendVariant: "success" },
				scoreChange4h: -3,
				vitals: [
					{ label: "Heart Rate", shortLabel: "HR", value: 96 },
					{ label: "MAP", value: 85 },
					{ label: "SpO₂", value: "99%" },
					{ label: "Resp. Rate", shortLabel: "RR", value: 20 },
				],
			};
		case "closed":
			return {
				acuity: { label: news2, score: 0, level: "low" },
				trajectory: { label: change, value: "−5", trend: "down", trendVariant: "success" },
				scoreChange4h: -1,
				vitals: [
					{ label: "Heart Rate", shortLabel: "HR", value: 82 },
					{ label: "MAP", value: 91 },
					{ label: "SpO₂", value: "99%" },
					{ label: "Resp. Rate", shortLabel: "RR", value: 16 },
				],
			};
	}
}

export {
	samplePatients,
	sampleScenario1Census,
	sampleScenario1ResolvedCensus,
	sampleScenario2Census,
	sampleScenario2ResolvedCensus,
	sampleScenario3Census,
	sampleScenario3CensusAt,
	sampleScenario3Flags,
	sampleScenario4Census,
	sampleScenario4CensusAt,
	sampleScenario4Flags,
	type Scenario3Stage,
	type Scenario4Stage,
};
