import { samplePatientPhotos } from "./sample-patient-photos";
import type { CensusPatient } from "../patients/patients";

// Synthetic data (PRD PC-180). The first eight patients are Figma's; nineteen more fill the hospital counts (Sidney 14,
// Chadron 4, Alliance 3, Bridgeport 5, Regional West 1: 27). Regional West, the hub's own ICU on Epic, joined on Nov 17,
// 2026 (user's call) with Walter Pierce, Scenario 5's ventilated patient, so the census shows five sites and four EHRs. Eight of Sidney's were at Harbor Point General until Nov 6, 2026, when it
// became Bridgeport, a critical access hospital with no ICU (user's call). Bridgeport's five (Med-Surg, a swing bed, an
// observation bed and its ED) joined it the same day (user's call). Scenario 2's Dale Reynolds joins Alliance when it
// plays, and Scenario 4's Tyler Kessler joins Bridgeport's five (Med-Surg Bed 3). My patients (`mine`) are Chadron's
// three and Alliance's, Dale included, plus Johnson and Harris: 8, then 9 with Dale (DESIGN.md "My patients").
// Acuity is the NEWS2-style score, the same as on Monitoring (`sample-monitoring.ts` says how it's worked out).

const news2 = "NEWS2";
const change = "Change in last 24 h";
// When the clinician last opened a patient, or a patient's last alert resolved (the Recently viewed and Recently
// resolved sorts): Thompson, Davis, Miller and Clark were viewed; Wilson, Bennett, Harris and Taylor had one resolve.
// When each arrived on their unit, as their record says (ICU admission, else hospital admission): ten in the last
// 24 h for New patients, Carter, Harris, Moore, Bennett, Hayes, Ortega, Norman, Lambert, Hughes and Ramirez.
const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();

const censusPatients: CensusPatient[] = [
	{
		id: "p1",
		hospitalId: "sidney",
		photo: samplePatientPhotos.p1,
		lastName: "Miller",
		firstName: "Sarah",
		mrn: "01033876",
		sex: "F",
		age: 59,
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
		age: 62,
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
		age: 65,
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
		age: 60,
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
		age: 69,
		hospital: "Sidney Regional",
		unit: "MICU",
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
		age: 83,
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
		age: 63,
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
		age: 58,
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
	// Bridgeport's inpatient side (Nov 6, 2026, user's call): Med-Surg, a swing bed and an observation bed, with one RN
	// at night, and a patient in its ED. Mostly stable, inside the limits, no alerts; Bridgeport isn't one of "my"
	// hospitals, so none is `mine`. Med-Surg Bed 3 is left for Scenario 4's Tyler Kessler.
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
		arrivedAt: hoursAgo(44),
		acuity: { label: news2, score: 0, level: "low" },
		trajectory: { label: change, value: "−2", trend: "down", trendVariant: "success" },
		scoreChange4h: 0,
		vitals: [
			{ label: "Heart Rate", shortLabel: "HR", value: 84 },
			{ label: "MAP", value: 95 },
			{ label: "SpO₂", value: "97%" },
			{ label: "Resp. Rate", shortLabel: "RR", value: 16 },
		],
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
		arrivedAt: hoursAgo(18),
		acuity: { label: news2, score: 5, level: "medium" },
		trajectory: { label: change, value: "−1", trend: "down", trendVariant: "success" },
		scoreChange4h: 0,
		vitals: [
			{ label: "Heart Rate", shortLabel: "HR", value: 88 },
			{ label: "MAP", value: 84 },
			{ label: "SpO₂", value: "94%" },
			{ label: "Resp. Rate", shortLabel: "RR", value: 21 },
		],
		tags: [{ label: "Droplet isolation" }, { label: "DNR" }],
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
		arrivedAt: hoursAgo(70),
		acuity: { label: news2, score: 0, level: "low" },
		trajectory: { label: change, value: "0" },
		scoreChange4h: 0,
		vitals: [
			{ label: "Heart Rate", shortLabel: "HR", value: 72 },
			{ label: "MAP", value: 96 },
			{ label: "SpO₂", value: "96%" },
			{ label: "Resp. Rate", shortLabel: "RR", value: 16 },
		],
		tags: [{ label: "Fall risk" }],
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
		arrivedAt: hoursAgo(16),
		acuity: { label: news2, score: 1, level: "low" },
		trajectory: { label: change, value: "−1", trend: "down", trendVariant: "success" },
		scoreChange4h: 0,
		vitals: [
			{ label: "Heart Rate", shortLabel: "HR", value: 94 },
			{ label: "MAP", value: 82 },
			{ label: "SpO₂", value: "98%" },
			{ label: "Resp. Rate", shortLabel: "RR", value: 16 },
		],
		tags: [{ label: "Fall risk" }],
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
		arrivedAt: hoursAgo(3),
		acuity: { label: news2, score: 1, level: "low" },
		trajectory: { label: change, value: "−4", trend: "down", trendVariant: "success" },
		scoreChange4h: -4,
		vitals: [
			{ label: "Heart Rate", shortLabel: "HR", value: 104 },
			{ label: "MAP", value: 88 },
			{ label: "SpO₂", value: "96%" },
			{ label: "Resp. Rate", shortLabel: "RR", value: 20 },
		],
	},
	{
		// Scenario 5 (Demo Use Cases, "Surge night across five hospitals and four EHRs"), just before it starts: COPD and
		// obesity, intubated 2 days ago, holding on the ventilator in the hub's own ICU. At 03:10 he desaturates to 86%: the
		// Prototype menu's Scenario 5 plays that (`sampleScenario5WalterCensusAt`). NEWS2 5 (Medium, SpO₂ scale 1, as every
		// patient but Dale Reynolds): SpO₂ 92% 2, the ventilator's oxygen 2, HR 92 1; awake on light sedation, so Alert. 6
		// yesterday. Regional West isn't one of "my" hospitals, so no `mine`.
		id: "p30",
		hospitalId: "regional-west",
		lastName: "Pierce",
		firstName: "Walter",
		mrn: "01250417",
		sex: "M",
		age: 71,
		hospital: "Regional West",
		unit: "MICU",
		bed: "Bed 4",
		arrivedAt: hoursAgo(50),
		acuity: { label: news2, score: 5, level: "medium" },
		trajectory: { label: change, value: "−1", trend: "down", trendVariant: "success" },
		scoreChange4h: 0,
		vitals: [
			{ label: "Heart Rate", shortLabel: "HR", value: 92 },
			{ label: "MAP", value: 98 },
			{ label: "SpO₂", value: "92%" },
			{ label: "Resp. Rate", shortLabel: "RR", value: 18 },
		],
		tags: sampleScenario5WalterFlags(),
	},
];

// Minutes since each patient's latest chart activity (a note, an order, a charted result; PRD Patients CEN-014): what the
// API's last-activity field would return. The census is in hospital now, so every one of them is admitted (Current).
const lastActivityMinutes: Record<string, number> = {
	p1: 18, p2: 6, p3: 41, p4: 12, p5: 3, p6: 95, p7: 27, p8: 64, p9: 9, p10: 2, p11: 130, p12: 52, p13: 210,
	p14: 15, p15: 33, p16: 75, p19: 160, p20: 240, p17: 22, p18: 48, p22: 85, p25: 300, p26: 11, p27: 190, p28: 36,
	p29: 58, p30: 14,
};

const samplePatients: CensusPatient[] = censusPatients.map((patient) => ({
	status: "admitted",
	lastActivityAt: hoursAgo((lastActivityMinutes[patient.id] ?? 60) / 60),
	...patient,
}));

const daysAgo = (days: number) => hoursAgo(days * 24);

/**
 * Patients the program treated before, no longer in hospital (PRD Patients CEN-001, CEN-040): on Patients only, never on
 * Monitoring or the census list. Their location is the last one they had; `statusAt` is when they left, `transferredTo`
 * where a transfer went. Synthetic (PRD PC-180). Keep them out of the scenario rosters: none has an alert or a record.
 */
const samplePastPatients: CensusPatient[] = [
	{
		id: "h1",
		hospitalId: "sidney",
		lastName: "Brooks",
		firstName: "Karen",
		mrn: "00871244",
		sex: "F",
		age: 66,
		hospital: "Sidney Regional",
		unit: "MICU",
		bed: "Bed 9",
		status: "discharged",
		statusAt: daysAgo(1.2),
		admittedAt: daysAgo(6),
		lastActivityAt: daysAgo(1.2),
		lastViewedAt: daysAgo(1.5),
		tags: [{ label: "Fall risk" }],
	},
	{
		id: "h2",
		hospitalId: "chadron",
		mine: true,
		lastName: "Foster",
		firstName: "Gary",
		mrn: "00663017",
		sex: "M",
		age: 71,
		hospital: "Chadron Memorial",
		unit: "Med-Surg",
		bed: "Bed 2",
		status: "transferred",
		statusAt: hoursAgo(20),
		transferredTo: "Denver Health",
		admittedAt: daysAgo(3),
		lastActivityAt: hoursAgo(20),
		lastViewedAt: hoursAgo(21),
		tags: [{ label: "DNR" }],
	},
	{
		id: "h3",
		hospitalId: "alliance",
		mine: true,
		lastName: "Simmons",
		firstName: "Paula",
		mrn: "00592260",
		sex: "F",
		age: 54,
		hospital: "Alliance Community",
		unit: "ED",
		bed: "Bay 1",
		status: "discharged",
		statusAt: daysAgo(3),
		admittedAt: daysAgo(4),
		lastActivityAt: daysAgo(3),
		lastViewedAt: daysAgo(3),
	},
	{
		id: "h4",
		hospitalId: "sidney",
		lastName: "Powell",
		firstName: "Steven",
		mrn: "00744981",
		sex: "M",
		age: 63,
		hospital: "Sidney Regional",
		unit: "CVICU",
		bed: "Bed 2",
		status: "transferred",
		statusAt: daysAgo(5),
		transferredTo: "UCHealth Medical Center of the Rockies",
		admittedAt: daysAgo(8),
		lastActivityAt: daysAgo(5),
		tags: [{ label: "Dialysis" }],
	},
	{
		id: "h5",
		hospitalId: "bridgeport",
		lastName: "Long",
		firstName: "Deborah",
		mrn: "00418735",
		sex: "F",
		age: 79,
		hospital: "Bridgeport Valley",
		unit: "Swing bed",
		bed: "Bed 6",
		status: "discharged",
		statusAt: daysAgo(12),
		admittedAt: daysAgo(26),
		lastActivityAt: daysAgo(12),
		tags: [{ label: "Fall risk" }, { label: "DNR" }],
	},
	{
		id: "h6",
		hospitalId: "sidney",
		lastName: "Bailey",
		firstName: "Brian",
		mrn: "00350612",
		sex: "M",
		age: 47,
		hospital: "Sidney Regional",
		unit: "MICU",
		bed: "Bed 4",
		status: "discharged",
		statusAt: daysAgo(21),
		admittedAt: daysAgo(27),
		lastActivityAt: daysAgo(21),
	},
	{
		id: "h7",
		hospitalId: "chadron",
		mine: true,
		lastName: "Gray",
		firstName: "Nancy",
		mrn: "00602298",
		sex: "F",
		age: 83,
		hospital: "Chadron Memorial",
		unit: "Med-Surg",
		bed: "Bed 5",
		status: "discharged",
		statusAt: daysAgo(9),
		admittedAt: daysAgo(14),
		lastActivityAt: daysAgo(9),
		lastViewedAt: daysAgo(10),
	},
	{
		id: "h8",
		hospitalId: "sidney",
		lastName: "Price",
		firstName: "Michael",
		mrn: "00986504",
		sex: "M",
		age: 58,
		hospital: "Sidney Regional",
		unit: "CVICU",
		bed: "Bed 8",
		status: "discharged",
		statusAt: daysAgo(45),
		admittedAt: daysAgo(52),
		lastActivityAt: daysAgo(45),
		tags: [{ label: "Contact isolation" }],
	},
];

/**
 * Patients whose census state is uncertain (PRD Patients CEN-031, CEN-040), so the page shows every status. On Patients
 * only, like the past patients: not on the census Monitoring shows, no alert, no record. Synthetic (PRD PC-180).
 * - Rebecca Ward: **Pending reconciliation**. Bridgeport Valley runs without automated ADT (Overlay mode), and her ED
 *   visit was never closed or turned into an admission, so she stays pending until someone confirms it.
 * - Gregory Mason: **Status unknown**. His record came over without a census status (no `status`): the page says so,
 *   never Current (SV-08). His location is the last one on file.
 */
const sampleUncertainStatusPatients: CensusPatient[] = [
	{
		id: "r1",
		hospitalId: "bridgeport",
		lastName: "Ward",
		firstName: "Rebecca",
		mrn: "01198246",
		sex: "F",
		age: 68,
		hospital: "Bridgeport Valley",
		unit: "ED",
		bed: "Bay 2",
		status: "pending-reconciliation",
		admittedAt: hoursAgo(14),
		lastActivityAt: hoursAgo(9),
		lastViewedAt: hoursAgo(10),
		tags: [{ label: "Fall risk" }],
	},
	{
		id: "u1",
		hospitalId: "alliance",
		lastName: "Mason",
		firstName: "Gregory",
		mrn: "00527713",
		sex: "M",
		age: 74,
		hospital: "Alliance Community",
		unit: "Med-Surg",
		bed: "Bed 7",
		admittedAt: daysAgo(16),
		lastActivityAt: daysAgo(15),
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
	status: "admitted",
	lastActivityAt: hoursAgo(10 / 60),
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
	status: "admitted",
	lastActivityAt: hoursAgo(10 / 60),
	hospitalId: "sidney",
	lastName: "Medina",
	firstName: "Rosa",
	mrn: "01147382",
	sex: "F",
	age: 58,
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
	status: "admitted",
	lastActivityAt: hoursAgo(10 / 60),
	hospitalId: "bridgeport",
	lastName: "Kessler",
	firstName: "Tyler",
	mrn: "01208854",
	sex: "M",
	age: 60,
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

/* -------------------------------------------------------------------------- */
/* Scenario 5: Walter Pierce and Linda Shaw                                   */
/* -------------------------------------------------------------------------- */

// Every synthetic patient carries a payer tag that feeds reporting only, never the risk score (Demo Use Cases, "Demo
// rules"). Scenario 5 shows it on its two patients; the rest of the census doesn't carry one yet.
// A function declaration, as Walter's flags are: the census above calls them as the module loads.
function payerFlag(payer: string, minutes: number): NonNullable<CensusPatient["tags"]>[number] {
	return {
		label: payer,
		details: {
			items: [
				{ label: "Payer", value: payer },
				{ term: "Reporting only:", label: "Payer tags feed reporting only, never the risk score" },
			],
			source: "Registration",
			updatedAt: hoursAgo(minutes / 60),
		},
	};
}

/** Walter Pierce's flags, on his cards and his alert: ventilated, and his payer (Medicare), from admission 2 days ago. */
function sampleScenario5WalterFlags(): NonNullable<CensusPatient["tags"]> {
	return [{ label: "Ventilated" }, payerFlag("Medicare", 52 * 60)];
}

/**
 * Linda Shaw's flags, the same on her Census card, her monitor card and her alert. Triage recorded that she stopped her
 * apixaban 4 months ago because of its cost, as a structured social need (Z91.120, intentional underdosing due to
 * financial hardship): with atrial fibrillation, the likely source of tonight's stroke. Medicaid from registration on
 * arrival (02:52, 19 min before the alert). Built when the beat plays, so the times read from then.
 */
const sampleScenario5LindaFlags = (): NonNullable<CensusPatient["tags"]> => [
	{
		label: "Off anticoagulation",
		details: {
			items: [
				{ term: "Social need, structured:", label: "Stopped apixaban 4 months ago because of cost (Z91.120)" },
				{ term: "Why it matters:", label: "Atrial fibrillation, untreated: the likely source of tonight's stroke" },
				{ term: "Before discharge:", label: "An anticoagulant she can afford" },
			],
			source: "ED triage note · Ashley Brooks, RN",
			updatedAt: hoursAgo(14 / 60),
		},
	},
	payerFlag("Medicaid", 19),
];

/** The stages of Scenario 5 after its first beat (Demo Use Cases, "Surge night across five hospitals and four EHRs"). */
type Scenario5WalterStage = "desat" | "stabilized";
type Scenario5LindaStage = "lysed" | "transferred";

/**
 * Walter Pierce's card at each stage of Scenario 5 (his base card is the census's `p30`). The change in 24 h is against
 * yesterday's 6; the 4 h change against his score about 4 h before the stage (5 both times).
 * - `desat` (03:10): mucus plug, bronchospasm and air trapping (auto-PEEP 9). SpO₂ 86% on FiO₂ 40%, RR 30 over the
 *   ventilator's 18, HR 118, BP 158/90 (MAP 113): NEWS2 10, High (SpO₂ 3, oxygen 2, RR 3, HR 2), up 5 in 4 h. His ICU's
 *   limits flag SpO₂ under 88% and RR over 28.
 * - `stabilized` (about 04:30): suctioned, bronchodilators, methylprednisolone, rate 14 with I:E 1:4, FiO₂ 45%. SpO₂ 92%,
 *   RR 20, HR 96, BP 134/76 (MAP 95): NEWS2 5, Medium (SpO₂ 2, oxygen 2, HR 1), so he drops down the list.
 */
function sampleScenario5WalterCensusAt(stage: Scenario5WalterStage): Partial<CensusPatient> {
	switch (stage) {
		case "desat":
			return {
				acuity: { label: news2, score: 10, level: "high" },
				trajectory: { label: change, value: "+4", trend: "up", trendVariant: "critical" },
				scoreChange4h: 5,
				vitals: [
					{ label: "Heart Rate", shortLabel: "HR", value: 118 },
					{ label: "MAP", value: 113 },
					{ label: "SpO₂", value: "86%", variant: "destructive", range: "below" },
					{ label: "Resp. Rate", shortLabel: "RR", value: 30, variant: "destructive", range: "above" },
				],
			};
		case "stabilized":
			return {
				acuity: { label: news2, score: 5, level: "medium" },
				trajectory: { label: change, value: "−1", trend: "down", trendVariant: "success" },
				scoreChange4h: 0,
				vitals: [
					{ label: "Heart Rate", shortLabel: "HR", value: 96 },
					{ label: "MAP", value: 95 },
					{ label: "SpO₂", value: "92%" },
					{ label: "Resp. Rate", shortLabel: "RR", value: 20 },
				],
			};
	}
}

/**
 * Linda Shaw (Scenario 5): 66, uncontrolled hypertension, atrial fibrillation off apixaban for 4 months because of cost,
 * Medicaid. Sudden left-sided weakness, last known well 02:30; in Sidney's ED (Bay 4) from 02:52. Not on the Census until
 * her stroke alert (03:11), the scenario's first beat, so her card is built then. NEWS2 3, Low (HR 112 2, SpO₂ 95% 1),
 * the same as at triage: NEWS2 doesn't see a stroke, so her alert comes from the stroke code, not the score. BP 192/104
 * (MAP 133) is over the ED's 185 for thrombolysis (her monitor's ▲), but the card shows MAP. Sidney isn't one of "my"
 * hospitals, so no `mine`.
 */
const sampleScenario5LindaCensus = (): CensusPatient => ({
	id: "p31",
	status: "admitted",
	lastActivityAt: hoursAgo(5 / 60),
	hospitalId: "sidney",
	lastName: "Shaw",
	firstName: "Linda",
	mrn: "01262093",
	sex: "F",
	age: 66,
	hospital: "Sidney Regional",
	unit: "ED",
	bed: "Bay 4",
	arrivedAt: hoursAgo(19 / 60),
	acuity: { label: news2, score: 3, level: "low" },
	trajectory: { label: change, value: "0" },
	scoreChange4h: 0,
	vitals: [
		{ label: "Heart Rate", shortLabel: "HR", value: 112 },
		{ label: "MAP", value: 133 },
		{ label: "SpO₂", value: "95%" },
		{ label: "Resp. Rate", shortLabel: "RR", value: 18 },
	],
	tags: sampleScenario5LindaFlags(),
});

/**
 * Linda Shaw's card at each later stage of Scenario 5. The changes are against triage's 3 (she has no score before).
 * - `lysed` (about 04:15): tenecteplase at 03:31 after labetalol; HR 104, BP 172/94 (MAP 120), SpO₂ 96%: NEWS2 1 (HR).
 *   NIHSS 6, but the CTA shows a right M1 occlusion, so she goes for thrombectomy.
 * - `transferred` (04:38): door-out by helicopter to Front Range Comprehensive Stroke Center, Denver; door-in-door-out
 *   1 h 46 min. HR 98, BP 168/92 (MAP 117): NEWS2 1. She leaves the census (Patients lists her as transferred).
 */
function sampleScenario5LindaCensusAt(stage: Scenario5LindaStage): Partial<CensusPatient> {
	const lysed: Partial<CensusPatient> = {
		acuity: { label: news2, score: 1, level: "low" },
		trajectory: { label: change, value: "−2", trend: "down", trendVariant: "success" },
		scoreChange4h: -2,
		vitals: [
			{ label: "Heart Rate", shortLabel: "HR", value: 104 },
			{ label: "MAP", value: 120 },
			{ label: "SpO₂", value: "96%" },
			{ label: "Resp. Rate", shortLabel: "RR", value: 16 },
		],
	};
	if (stage === "lysed") return lysed;
	return {
		...lysed,
		status: "transferred",
		statusAt: hoursAgo(0),
		lastActivityAt: hoursAgo(0),
		transferredTo: "Front Range Comprehensive Stroke Center",
		vitals: [
			{ label: "Heart Rate", shortLabel: "HR", value: 98 },
			{ label: "MAP", value: 117 },
			{ label: "SpO₂", value: "97%" },
			{ label: "Resp. Rate", shortLabel: "RR", value: 16 },
		],
	};
}

export {
	samplePastPatients,
	sampleUncertainStatusPatients,
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
	sampleScenario5LindaCensus,
	sampleScenario5LindaCensusAt,
	sampleScenario5LindaFlags,
	sampleScenario5WalterCensusAt,
	sampleScenario5WalterFlags,
	type Scenario3Stage,
	type Scenario4Stage,
	type Scenario5LindaStage,
	type Scenario5WalterStage,
};
