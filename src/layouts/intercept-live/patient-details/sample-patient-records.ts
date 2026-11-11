import samplePhoto1 from "@/components/data-display/avatar/images/sample-photo-1.png";
import samplePhoto2 from "@/components/data-display/avatar/images/sample-photo-2.png";
import samplePhoto3 from "@/components/data-display/avatar/images/sample-photo-3.png";

import { samplePatientPhotos } from "../sample-data/sample-patient-photos";
import type { CareTeamMember, PatientEarlyWarning, PatientLab, PatientRecord, PatientVentilator } from "./patient-details";
import { clinicalStatusAt, sampleClinicalStatus } from "./sample-clinical-status";
import { planOfCareWith, samplePlanOfCare } from "./sample-plan-of-care";
// Synthetic data (PRD Patient details PD-150). The reference patient is Sarah Miller (`p1`: Sidney, MICU
// Bed 11, SOFA 13, ventilated, on pressors), in step with her alerts in `sample-monitoring.ts`: lactate 4.1 up from 2.2,
// MAP 58 on norepinephrine 0.22, temperature 38.9 °C, WBC 17.2. Every other patient on the Census has a record as full
// as hers, in step with their card's tags, their live values in `sample-monitoring.ts` and their alerts. These are the
// records without their sections' data: `sample-patient-details.ts` adds it from `sections/sample-*.ts`, which build on
// these records (so they import this file, never `sample-patient-details.ts`).

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
const hoursAgo = (hours: number) => minutesAgo(hours * 60);

/** A resulted lab, `minutes` ago, with its previous value `previousMinutes` ago. */
const lab = (
	name: string,
	value: string,
	unit: string,
	minutes: number,
	flag?: PatientLab["flag"],
	previous?: [value: string, minutes: number],
): PatientLab => ({
	name,
	value,
	unit,
	flag,
	resultedAt: minutesAgo(minutes),
	previous: previous ? { value: previous[0], at: minutesAgo(previous[1]) } : undefined,
});

// The Intercept team covers every patient this shift; the hospital's own staff differ by patient.
const interceptTeam: CareTeamMember[] = [
	{ role: "Intercept intensivist", name: "Joanna Smith", initials: "JS", src: samplePhoto3, tone: 1, presence: "online", you: true },
	{ role: "Intercept APP", name: "James Turner", initials: "JT", src: samplePhoto1, tone: 6, presence: "online" },
	{ role: "Intercept RN", name: "Maria Ruiz", initials: "MR", src: samplePhoto2, tone: 3, presence: "away" },
];

const hospitalStaff = (
	organization: string,
	nurse: [name: string, initials: string, tone: CareTeamMember["tone"], presence: CareTeamMember["presence"]],
	attending: [name: string, initials: string, tone: CareTeamMember["tone"], presence: CareTeamMember["presence"]],
): CareTeamMember[] => [
	{ role: "Bedside nurse", name: nurse[0], initials: nurse[1], tone: nurse[2], organization, presence: nurse[3] },
	{ role: "Attending of record", name: attending[0], initials: attending[1], tone: attending[2], organization, presence: attending[3] },
];

/** Oxygen or room air, charted by the bedside nurse rather than read from a ventilator. */
const charted = (support: string, minutes: number, settings: PatientVentilator["settings"] = []): PatientVentilator => ({
	support,
	settings,
	source: "Nursing flowsheet",
	updatedAt: minutesAgo(minutes),
});

const baseRecords: PatientRecord[] = [
	{
		id: "p1",
		photo: samplePatientPhotos.p1,
		account: "6325DF2",
		weight: "64 kg",
		unreadMessages: 3,
		// The brief Intercept-Live draws (`157:9660`), in step with her alerts and values.
		brief: {
			title: "Worsening hemodynamic and respiratory status",
			text: "MAP has fallen from 70 to 58 mmHg as norepinephrine went up to 0.22, lactate has nearly doubled to 4.1, and Sepsis Sniffer flagged her as a sepsis candidate 2 min ago. SpO₂ is 89% on FiO₂ 60%.",
			sourceCount: 23,
			updatedAt: minutesAgo(141),
			lastViewedAt: minutesAgo(190),
		},
		codeStatus: "Full code",
		allergies: ["Penicillin"],
		isolation: "Droplet isolation",
		diagnosis: "Septic shock from community-acquired pneumonia",
		problems: ["ARDS, moderate", "Acute kidney injury, stage 2", "Type 2 diabetes"],
		admittedAt: hoursAgo(55),
		admittedFrom: "Emergency department",
		icuAdmittedAt: hoursAgo(52),
		ventilator: {
			support: "Invasive",
			mode: "Volume control (AC/VC)",
			source: "Ventilator",
			updatedAt: minutesAgo(2),
			settings: [
				// The respiratory therapist's change, made without a call to Intercept (client feedback, Nov 4, 2026).
				{ label: "FiO₂", value: "60%", change: { from: "40%", at: minutesAgo(118) } },
				{ label: "PEEP", value: "10", unit: "cmH₂O", change: { from: "8", at: minutesAgo(118) } },
				{ label: "Tidal volume", value: "410", unit: "mL", set: "420" },
				{ label: "Rate", value: "32", unit: "/min", set: "22" },
				{ label: "Plateau pressure", value: "28", unit: "cmH₂O" },
			],
			abg: { values: "pH 7.29 · PaCO₂ 46 · PaO₂ 61 · HCO₃ 19", collectedAt: minutesAgo(70) },
		},
		infusions: [
			{
				drug: "Norepinephrine",
				rate: "0.22 mcg/kg/min",
				change: { direction: "up", from: "0.15", at: minutesAgo(40) },
				updatedAt: minutesAgo(1),
			},
			{ drug: "Vasopressin", rate: "0.03 units/min", updatedAt: minutesAgo(1) },
			{
				drug: "Propofol",
				rate: "30 mcg/kg/min",
				change: { direction: "down", from: "40", at: minutesAgo(130) },
				updatedAt: minutesAgo(1),
			},
			{ drug: "Fentanyl", rate: "50 mcg/h", updatedAt: minutesAgo(1) },
		],
		labs: [
			{
				name: "Lactate",
				value: "4.1",
				unit: "mmol/L",
				flag: "high",
				resultedAt: minutesAgo(35),
				previous: { value: "2.2", at: minutesAgo(330) },
			},
			{
				name: "WBC",
				value: "17.2",
				unit: "K/µL",
				flag: "high",
				resultedAt: minutesAgo(95),
				previous: { value: "13.9", at: minutesAgo(1520) },
			},
			{
				name: "Creatinine",
				value: "1.9",
				unit: "mg/dL",
				flag: "high",
				resultedAt: minutesAgo(95),
				previous: { value: "1.4", at: minutesAgo(1520) },
			},
			{
				name: "Potassium",
				value: "3.3",
				unit: "mmol/L",
				flag: "low",
				resultedAt: minutesAgo(95),
				previous: { value: "3.8", at: minutesAgo(1520) },
			},
			{
				name: "Hemoglobin",
				value: "9.8",
				unit: "g/dL",
				flag: "low",
				resultedAt: minutesAgo(95),
				previous: { value: "10.6", at: minutesAgo(1520) },
			},
			{ name: "Procalcitonin", collectedAt: minutesAgo(50) },
		],
		// What her septic shock turns on: the fever (charted, so it goes stale), MAP against its target, and the ventilator
		// since the respiratory therapist's change.
		findings: [
			{ name: "Temp", value: "38.9", unit: "°C", chartedAt: minutesAgo(130), staleAfterMinutes: 60, note: "Charted · Fever" },
			{ name: "MAP", value: "58", unit: "mmHg", context: "Target 65 or more", previous: { value: "70", at: minutesAgo(180) } },
			{ name: "Ventilator", value: "60% · 10", since: minutesAgo(118), note: "FiO₂ · PEEP" },
		],
		careTeam: [
			{ role: "Bedside nurse", name: "Kelly Ortiz", initials: "KO", tone: 4, organization: "Sidney Regional", presence: "online" },
			{ role: "Attending of record", name: "Laura Mitchell", initials: "LM", tone: 8, organization: "Sidney Regional", presence: "away" },
			{ role: "Intercept intensivist", name: "Joanna Smith", initials: "JS", src: samplePhoto3, tone: 1, presence: "online", you: true },
			{ role: "Intercept APP", name: "James Turner", initials: "JT", src: samplePhoto1, tone: 6, presence: "online" },
			{ role: "Intercept RN", name: "Maria Ruiz", initials: "MR", src: samplePhoto2, tone: 3, presence: "away" },
		],
	},
	{
		id: "p2",
		photo: samplePatientPhotos.p2,
		account: "7B13550",
		weight: "92 kg",
		unreadMessages: 1,
		brief: {
			title: "Persistent hypoxemia on high ventilator support",
			text: "SpO₂ has sat between 82 and 86% for the last 20 min on FiO₂ 80% and PEEP 14, and the oxygenation rule flagged it 9 min ago. P/F ratio is 78. Hemodynamics are steady without pressors.",
			sourceCount: 17,
			updatedAt: minutesAgo(9),
			lastViewedAt: minutesAgo(65),
		},
		codeStatus: "Full code",
		allergies: [],
		isolation: "Droplet isolation",
		diagnosis: "Severe ARDS from influenza A pneumonia",
		problems: ["Influenza A", "Obesity", "Hypertension"],
		admittedAt: hoursAgo(40),
		admittedFrom: "Emergency department",
		icuAdmittedAt: hoursAgo(38),
		ventilator: {
			support: "Invasive",
			mode: "Volume control (AC/VC)",
			source: "Ventilator",
			updatedAt: minutesAgo(1),
			settings: [
				{ label: "FiO₂", value: "80%", change: { from: "70%", at: minutesAgo(90) } },
				{ label: "PEEP", value: "14", unit: "cmH₂O", change: { from: "12", at: minutesAgo(240) } },
				{ label: "Tidal volume", value: "450", unit: "mL", set: "450" },
				{ label: "Rate", value: "28", unit: "/min", set: "26" },
				{ label: "Plateau pressure", value: "31", unit: "cmH₂O" },
			],
			abg: { values: "pH 7.27 · PaCO₂ 58 · PaO₂ 62 · HCO₃ 25", collectedAt: minutesAgo(45) },
		},
		infusions: [
			{ drug: "Propofol", rate: "40 mcg/kg/min", updatedAt: minutesAgo(1) },
			{ drug: "Fentanyl", rate: "100 mcg/h", change: { direction: "up", from: "75", at: minutesAgo(150) }, updatedAt: minutesAgo(1) },
			{ drug: "Cisatracurium", rate: "3 mcg/kg/min", updatedAt: minutesAgo(1) },
		],
		labs: [
			lab("Lactate", "1.8", "mmol/L", 45, undefined, ["1.5", 420]),
			lab("WBC", "11.4", "K/µL", 180, "high", ["12.9", 1620]),
			lab("Creatinine", "1.1", "mg/dL", 180, undefined, ["1.0", 1620]),
			lab("Potassium", "4.2", "mmol/L", 180, undefined, ["4.0", 1620]),
			lab("Hemoglobin", "12.1", "g/dL", 180, undefined, ["12.6", 1620]),
			lab("Procalcitonin", "0.4", "ng/mL", 180, "high"),
		],
		careTeam: [
			...hospitalStaff("Sidney Regional", ["Brooke Sullivan", "BS", 9, "online"], ["Laura Mitchell", "LM", 8, "away"]),
			...interceptTeam,
		],
	},
	{
		id: "p3",
		account: "2DC2762",
		weight: "71 kg",
		brief: {
			title: "Improving on day 3 of treatment",
			text: "Steady overnight. Norepinephrine is down to 0.08 from 0.10, lactate cleared to 1.6, and WBC fell from 18 to 14.1 on day 3 of ceftriaxone. Creatinine is 2.4, slightly better.",
			sourceCount: 21,
			updatedAt: minutesAgo(70),
			lastViewedAt: minutesAgo(240),
		},
		codeStatus: "Full code",
		allergies: ["Sulfa drugs"],
		diagnosis: "Septic shock from E. coli urinary tract infection with bacteremia",
		problems: ["Acute kidney injury, stage 2", "Atrial fibrillation", "Chronic kidney disease, stage 3"],
		admittedAt: hoursAgo(118),
		admittedFrom: "Emergency department",
		icuAdmittedAt: hoursAgo(116),
		ventilator: {
			support: "Invasive",
			mode: "Volume control (AC/VC)",
			source: "Ventilator",
			updatedAt: minutesAgo(3),
			settings: [
				{ label: "FiO₂", value: "40%" },
				{ label: "PEEP", value: "8", unit: "cmH₂O" },
				{ label: "Tidal volume", value: "400", unit: "mL", set: "400" },
				{ label: "Rate", value: "18", unit: "/min", set: "16" },
				{ label: "Plateau pressure", value: "22", unit: "cmH₂O" },
			],
			abg: { values: "pH 7.38 · PaCO₂ 41 · PaO₂ 88 · HCO₃ 23", collectedAt: minutesAgo(200) },
		},
		infusions: [
			{ drug: "Norepinephrine", rate: "0.08 mcg/kg/min", change: { direction: "down", from: "0.10", at: minutesAgo(210) }, updatedAt: minutesAgo(1) },
			{ drug: "Propofol", rate: "15 mcg/kg/min", updatedAt: minutesAgo(1) },
			{ drug: "Fentanyl", rate: "25 mcg/h", updatedAt: minutesAgo(1) },
		],
		labs: [
			lab("Lactate", "1.6", "mmol/L", 70, undefined, ["2.4", 430]),
			lab("WBC", "14.1", "K/µL", 260, "high", ["18.0", 1700]),
			lab("Creatinine", "2.4", "mg/dL", 260, "high", ["2.6", 1700]),
			lab("Potassium", "4.6", "mmol/L", 260, undefined, ["4.9", 1700]),
			lab("Hemoglobin", "8.7", "g/dL", 260, "low", ["9.0", 1700]),
			lab("Procalcitonin", "3.2", "ng/mL", 260, "high", ["7.8", 1700]),
		],
		careTeam: [
			...hospitalStaff("Sidney Regional", ["Tara Becker", "TB", 5, "online"], ["Ellen Parker", "EP", 9, "away"]),
			...interceptTeam,
		],
	},
	{
		id: "p4",
		account: "C126FE6",
		weight: "84 kg",
		unreadMessages: 2,
		brief: {
			title: "Rising pressor needs",
			text: "Norepinephrine went up two steps in the last hour, from 0.06 to 0.12, with MAP holding at 66. Dobutamine is unchanged at 5. NT-proBNP is 6,820 and lactate 2.3. DNR, with goals of care documented yesterday.",
			sourceCount: 19,
			updatedAt: minutesAgo(24),
			lastViewedAt: minutesAgo(130),
		},
		codeStatus: "DNR",
		codeStatusOrder: { orderedAt: hoursAgo(30), discussedWith: "Patient and wife", previous: { status: "Full code", at: hoursAgo(76) } },
		allergies: ["Iodinated contrast"],
		diagnosis: "Cardiogenic shock after NSTEMI",
		problems: ["Ischemic cardiomyopathy, EF 25%", "Chronic kidney disease, stage 3", "Type 2 diabetes"],
		admittedAt: hoursAgo(76),
		admittedFrom: "Cath lab",
		icuAdmittedAt: hoursAgo(75),
		ventilator: charted("Oxygen", 35, [{ label: "Nasal cannula", value: "3", unit: "L/min" }]),
		infusions: [
			{ drug: "Norepinephrine", rate: "0.12 mcg/kg/min", change: { direction: "up", from: "0.06", at: minutesAgo(50) }, updatedAt: minutesAgo(1) },
			{ drug: "Dobutamine", rate: "5 mcg/kg/min", updatedAt: minutesAgo(1) },
			{ drug: "Heparin", rate: "1,100 units/h", updatedAt: minutesAgo(1) },
			{ drug: "Amiodarone", rate: "0.5 mg/min", updatedAt: minutesAgo(1) },
		],
		labs: [
			lab("Lactate", "2.3", "mmol/L", 40, "high", ["1.7", 300]),
			lab("NT-proBNP", "6,820", "pg/mL", 300, "high", ["5,140", 1740]),
			lab("Creatinine", "1.7", "mg/dL", 300, "high", ["1.5", 1740]),
			lab("Potassium", "4.9", "mmol/L", 300, undefined, ["4.4", 1740]),
			lab("Hemoglobin", "11.2", "g/dL", 300, "low", ["11.6", 1740]),
			{ name: "Troponin I", collectedAt: minutesAgo(25) },
		],
		careTeam: [
			...hospitalStaff("Sidney Regional", ["Grace Holloway", "GH", 8, "online"], ["Daniel Reyes", "DR", 4, "online"]),
			...interceptTeam,
		],
	},
	{
		id: "p5",
		photo: samplePatientPhotos.p5,
		account: "CC80E64",
		weight: "61 kg",
		brief: {
			title: "SpO₂ not reporting",
			text: "SpO₂ stopped reporting 14 min ago, so oxygenation is unknown right now. On BiPAP since last night. Last ABG showed PaCO₂ 52, and potassium is low at 3.2 on continuous albuterol.",
			sourceCount: 12,
			updatedAt: minutesAgo(14),
			lastViewedAt: minutesAgo(95),
		},
		codeStatus: "Full code",
		allergies: ["Latex"],
		diagnosis: "Status asthmaticus",
		problems: ["Severe persistent asthma", "Anxiety disorder"],
		admittedAt: hoursAgo(20),
		admittedFrom: "Emergency department",
		icuAdmittedAt: hoursAgo(19),
		ventilator: {
			support: "NIV",
			mode: "BiPAP",
			source: "Ventilator",
			updatedAt: minutesAgo(2),
			settings: [
				{ label: "FiO₂", value: "45%", change: { from: "50%", at: minutesAgo(240) } },
				{ label: "IPAP", value: "14", unit: "cmH₂O", change: { from: "12", at: minutesAgo(600) } },
				{ label: "EPAP", value: "6", unit: "cmH₂O" },
				{ label: "Rate", value: "24", unit: "/min" },
			],
			abg: { values: "pH 7.31 · PaCO₂ 52 · PaO₂ 78 · HCO₃ 25", collectedAt: minutesAgo(110) },
		},
		infusions: [],
		labs: [
			lab("Lactate", "2.4", "mmol/L", 110, "high", ["3.1", 600]),
			lab("WBC", "13.0", "K/µL", 300, "high", ["9.2", 1150]),
			lab("Creatinine", "0.7", "mg/dL", 300, undefined),
			lab("Potassium", "3.2", "mmol/L", 300, "low", ["3.9", 1150]),
			lab("Hemoglobin", "13.4", "g/dL", 300, undefined),
			lab("Magnesium", "2.6", "mg/dL", 300, "high", ["1.9", 1150]),
		],
		careTeam: [
			...hospitalStaff("Sidney Regional", ["Kelly Ortiz", "KO", 4, "online"], ["Laura Mitchell", "LM", 8, "away"]),
			...interceptTeam,
		],
	},
	{
		id: "p6",
		account: "29AB8A3",
		weight: "70 kg",
		brief: {
			title: "Confused after hip surgery, hemoglobin falling",
			text: "Post-op day 2 after a left hip hemiarthroplasty. The bed exit alarm went off 41 min ago; he's been confused overnight. Hemoglobin dropped from 10.4 to 8.9, and sodium is 131.",
			sourceCount: 14,
			updatedAt: minutesAgo(41),
			lastViewedAt: minutesAgo(300),
		},
		codeStatus: "Full code",
		fallRisk: {
			scale: "Morse Fall Scale",
			score: 55,
			risk: "High risk",
			assessedAt: hoursAgo(5),
			previous: { score: 45, at: hoursAgo(17) },
			precautions: ["Bed alarm on", "Low bed, locked", "Non-slip socks", "Call light in reach"],
		},
		allergies: [],
		diagnosis: "Left hip fracture, after hemiarthroplasty",
		problems: ["Postoperative delirium", "Hyponatremia", "Parkinson's disease"],
		admittedAt: hoursAgo(64),
		admittedFrom: "Emergency department",
		icuAdmittedAt: hoursAgo(44),
		ventilator: charted("Room air", 60),
		infusions: [{ drug: "Lactated Ringer's", rate: "75 mL/h", updatedAt: minutesAgo(2) }],
		labs: [
			lab("Hemoglobin", "8.9", "g/dL", 210, "low", ["10.4", 1650]),
			lab("Sodium", "131", "mmol/L", 210, "low", ["134", 1650]),
			lab("Creatinine", "1.2", "mg/dL", 210, "high", ["1.1", 1650]),
			lab("Potassium", "4.0", "mmol/L", 210, undefined, ["4.2", 1650]),
			lab("WBC", "10.2", "K/µL", 210, undefined, ["11.0", 1650]),
			lab("INR", "1.1", "", 210, undefined),
		],
		careTeam: [
			...hospitalStaff("Sidney Regional", ["Lucy Hart", "LH", 2, "online"], ["Samuel Grant", "SG", 6, "offline"]),
			...interceptTeam,
		],
	},
	{
		id: "p7",
		account: "DAC78AD",
		weight: "66 kg",
		brief: {
			title: "Improving after surgery",
			text: "Improving. Post-op day 3 after a Hartmann's procedure. WBC is down from 16.8 to 12.1, lactate is normal, and she's off oxygen since this morning. MRSA in the wound swab, so she's on contact isolation.",
			sourceCount: 16,
			updatedAt: minutesAgo(180),
			lastViewedAt: minutesAgo(200),
		},
		codeStatus: "Full code",
		isolationOrder: { reason: "MRSA in the wound swab", orderedAt: hoursAgo(40) },
		allergies: ["Codeine"],
		isolation: "Contact isolation",
		diagnosis: "Perforated sigmoid diverticulitis, after Hartmann's procedure",
		problems: ["MRSA wound colonization", "Hypothyroidism"],
		admittedAt: hoursAgo(84),
		admittedFrom: "Operating room",
		icuAdmittedAt: hoursAgo(80),
		ventilator: charted("Room air", 90),
		infusions: [{ drug: "Lactated Ringer's", rate: "100 mL/h", change: { direction: "down", from: "150", at: minutesAgo(360) }, updatedAt: minutesAgo(3) }],
		labs: [
			lab("WBC", "12.1", "K/µL", 240, "high", ["16.8", 1680]),
			lab("Lactate", "1.1", "mmol/L", 240, undefined, ["1.9", 1680]),
			lab("Creatinine", "0.9", "mg/dL", 240, undefined, ["1.0", 1680]),
			lab("Potassium", "3.7", "mmol/L", 240, undefined, ["3.5", 1680]),
			lab("Hemoglobin", "10.9", "g/dL", 240, "low", ["11.2", 1680]),
			lab("CRP", "88", "mg/L", 240, "high", ["164", 1680]),
		],
		careTeam: [
			...hospitalStaff("Sidney Regional", ["Hannah Cole", "HC", 10, "online"], ["Samuel Grant", "SG", 6, "away"]),
			...interceptTeam,
		],
	},
	{
		id: "p8",
		account: "F014E5C",
		weight: "88 kg",
		brief: {
			title: "Stable after a bleeding ulcer was clipped",
			text: "Stable since the endoscopy yesterday clipped a bleeding duodenal ulcer. Hemoglobin rose to 8.4 after one unit and has held. No new bleeding charted. On a pantoprazole drip.",
			sourceCount: 13,
			updatedAt: minutesAgo(150),
			lastViewedAt: minutesAgo(160),
		},
		codeStatus: "Full code",
		allergies: [],
		diagnosis: "Upper GI bleed from a duodenal ulcer, after endoscopic clipping",
		problems: ["Alcohol use disorder", "Hypertension"],
		admittedAt: hoursAgo(34),
		admittedFrom: "Emergency department",
		icuAdmittedAt: hoursAgo(33),
		ventilator: charted("Room air", 120),
		infusions: [{ drug: "Pantoprazole", rate: "8 mg/h", updatedAt: minutesAgo(4) }],
		labs: [
			lab("Hemoglobin", "8.4", "g/dL", 150, "low", ["7.6", 600]),
			lab("BUN", "38", "mg/dL", 150, "high", ["46", 1500]),
			lab("Creatinine", "1.0", "mg/dL", 150, undefined, ["1.1", 1500]),
			lab("Potassium", "4.1", "mmol/L", 150, undefined, ["3.8", 1500]),
			lab("INR", "1.2", "", 150, undefined, ["1.3", 1500]),
			lab("Lactate", "1.0", "mmol/L", 600, undefined, ["2.1", 1950]),
		],
		careTeam: [
			...hospitalStaff("Sidney Regional", ["Rachel Dixon", "RD", 3, "online"], ["Laura Mitchell", "LM", 8, "away"]),
			...interceptTeam,
		],
	},
	{
		id: "p9",
		account: "822FD5A",
		weight: "78 kg",
		unreadMessages: 2,
		brief: {
			title: "Ventilator settings don't match the order",
			text: "Ventilator PEEP is 8, but the active order is 10, and Vent-Order Mismatch flagged it 18 min ago. SpO₂ is 91% on FiO₂ 50%. Lactate rose from 1.9 to 2.6 and Sepsis Sniffer is tracking him.",
			sourceCount: 20,
			updatedAt: minutesAgo(18),
			lastViewedAt: minutesAgo(90),
		},
		codeStatus: "Full code",
		allergies: ["Morphine"],
		diagnosis: "Aspiration pneumonia with sepsis",
		problems: ["COPD", "Dysphagia after stroke", "Atrial fibrillation"],
		admittedAt: hoursAgo(30),
		admittedFrom: "Medical ward",
		icuAdmittedAt: hoursAgo(16),
		ventilator: {
			support: "Invasive",
			mode: "Volume control (AC/VC)",
			source: "Ventilator",
			updatedAt: minutesAgo(1),
			settings: [
				{ label: "FiO₂", value: "50%", change: { from: "40%", at: minutesAgo(300) } },
				{ label: "PEEP", value: "8", unit: "cmH₂O", set: "10" },
				{ label: "Tidal volume", value: "430", unit: "mL", set: "440" },
				{ label: "Rate", value: "26", unit: "/min", set: "20" },
				{ label: "Plateau pressure", value: "24", unit: "cmH₂O" },
			],
			abg: { values: "pH 7.33 · PaCO₂ 49 · PaO₂ 64 · HCO₃ 26", collectedAt: minutesAgo(80) },
		},
		infusions: [
			{ drug: "Propofol", rate: "25 mcg/kg/min", updatedAt: minutesAgo(1) },
			{ drug: "Fentanyl", rate: "75 mcg/h", updatedAt: minutesAgo(1) },
		],
		labs: [
			lab("Lactate", "2.6", "mmol/L", 55, "high", ["1.9", 400]),
			lab("WBC", "15.8", "K/µL", 160, "high", ["12.2", 1540]),
			lab("Creatinine", "1.3", "mg/dL", 160, "high", ["1.1", 1540]),
			lab("Potassium", "3.9", "mmol/L", 160, undefined, ["4.1", 1540]),
			lab("Hemoglobin", "11.0", "g/dL", 160, "low", ["11.4", 1540]),
			lab("Procalcitonin", "1.8", "ng/mL", 160, "high"),
		],
		careTeam: [
			...hospitalStaff("Sidney Regional", ["Kelly Ortiz", "KO", 4, "online"], ["Laura Mitchell", "LM", 8, "away"]),
			...interceptTeam,
		],
	},
	{
		id: "p10",
		account: "5F412B6",
		weight: "74 kg",
		brief: {
			title: "Low blood pressure on rising pressors",
			text: "MAP is 61 on norepinephrine 0.06, doubled from 0.03 since debridement. Lactate is 3.0 and WBC 21.4. CRRT is running for her end-stage kidney disease; potassium is 5.4. Sepsis Sniffer is tracking her.",
			sourceCount: 22,
			updatedAt: minutesAgo(60),
			lastViewedAt: minutesAgo(180),
		},
		codeStatus: "Full code",
		allergies: ["Shellfish"],
		diagnosis: "Necrotizing soft tissue infection of the left thigh, after debridement",
		problems: ["End-stage kidney disease, on hemodialysis", "Type 2 diabetes", "Peripheral artery disease"],
		admittedAt: hoursAgo(28),
		admittedFrom: "Operating room",
		icuAdmittedAt: hoursAgo(22),
		ventilator: charted("Oxygen", 50, [{ label: "Nasal cannula", value: "2", unit: "L/min" }]),
		infusions: [
			{ drug: "Norepinephrine", rate: "0.06 mcg/kg/min", change: { direction: "up", from: "0.03", at: minutesAgo(140) }, updatedAt: minutesAgo(1) },
			{ drug: "CRRT citrate", rate: "180 mL/h", change: { direction: "up", from: "0", at: minutesAgo(240) }, updatedAt: minutesAgo(2) },
		],
		labs: [
			lab("Lactate", "3.0", "mmol/L", 60, "high", ["2.2", 420]),
			lab("WBC", "21.4", "K/µL", 200, "high", ["17.9", 1460]),
			lab("Creatinine", "5.8", "mg/dL", 200, "high", ["6.4", 1460]),
			lab("Potassium", "5.4", "mmol/L", 200, "high", ["5.9", 1460]),
			lab("Hemoglobin", "9.1", "g/dL", 200, "low", ["9.8", 1460]),
			lab("CK", "2,450", "U/L", 200, "high", ["1,380", 1460]),
		],
		careTeam: [
			...hospitalStaff("Sidney Regional", ["Rachel Dixon", "RD", 3, "online"], ["Nathan Brooks", "NB", 5, "online"]),
			...interceptTeam,
		],
	},
	{
		id: "p11",
		account: "16D619B",
		weight: "79 kg",
		unreadMessages: 1,
		brief: {
			title: "Blood pressure rising on nicardipine",
			text: "Blood pressure is 162/96 on a nicardipine drip, up from 148/88 an hour ago. Day 2 of a hypertensive emergency with PRES, after a seizure at home. Platelets are 98 and AST 142. No seizures since on levetiracetam.",
			sourceCount: 15,
			updatedAt: minutesAgo(30),
			lastViewedAt: minutesAgo(140),
		},
		codeStatus: "Full code",
		isolationOrder: { reason: "Influenza B, PCR positive", orderedAt: hoursAgo(30) },
		allergies: [],
		isolation: "Droplet isolation",
		diagnosis: "Hypertensive emergency with PRES",
		problems: ["Influenza B", "Type 2 diabetes"],
		admittedAt: hoursAgo(31),
		admittedFrom: "Emergency department",
		icuAdmittedAt: hoursAgo(26),
		ventilator: charted("Room air", 45),
		infusions: [
			{ drug: "Nicardipine", rate: "7.5 mg/h", change: { direction: "up", from: "5", at: minutesAgo(35) }, updatedAt: minutesAgo(2) },
		],
		labs: [
			lab("Platelets", "98", "K/µL", 120, "low", ["131", 900]),
			lab("AST", "142", "U/L", 120, "high", ["88", 900]),
			lab("LDH", "610", "U/L", 120, "high", ["455", 900]),
			lab("Creatinine", "1.1", "mg/dL", 120, "high", ["0.9", 900]),
			lab("Magnesium", "2.0", "mg/dL", 60, undefined, ["1.9", 300]),
			lab("Hemoglobin", "10.2", "g/dL", 120, "low", ["11.0", 900]),
		],
		careTeam: [
			...hospitalStaff("Sidney Regional", ["Amy Dalton", "AD", 7, "online"], ["Helen Foster", "HF", 1, "online"]),
			...interceptTeam,
		],
	},
	{
		id: "p12",
		account: "BFF30D1",
		weight: "52 kg",
		brief: {
			title: "Respiratory rate not reporting",
			text: "Respiratory rate stopped reporting 27 min ago. Day 2 after thrombectomy for a right MCA stroke, with early swelling on last night's CT: 3% saline is running and sodium is 141, aiming for 145 to 155. Neuro checks unchanged overnight. Glucose is 182. DNR, per her advance directive.",
			sourceCount: 11,
			updatedAt: minutesAgo(27),
			lastViewedAt: minutesAgo(260),
		},
		codeStatus: "DNR",
		codeStatusOrder: {
			orderedAt: hoursAgo(4),
			discussedWith: "Daughter, health care proxy",
			previous: { status: "Full code", at: hoursAgo(50) },
		},
		fallRisk: {
			scale: "Morse Fall Scale",
			score: 75,
			risk: "High risk",
			assessedAt: hoursAgo(9),
			precautions: ["Bed alarm on", "Low bed, locked", "Hourly rounding", "Left-side neglect: items on her right"],
		},
		allergies: ["Sulfa drugs"],
		diagnosis: "Right MCA ischemic stroke, after thrombectomy",
		problems: ["Atrial fibrillation", "Dysphagia", "Hypertension"],
		admittedAt: hoursAgo(50),
		admittedFrom: "Emergency department",
		icuAdmittedAt: hoursAgo(47),
		ventilator: charted("Oxygen", 75, [{ label: "Nasal cannula", value: "2", unit: "L/min" }]),
		infusions: [{ drug: "Sodium chloride 3%", rate: "30 mL/h", updatedAt: minutesAgo(5) }],
		labs: [
			lab("Glucose", "182", "mg/dL", 90, "high", ["156", 450]),
			lab("Sodium", "141", "mmol/L", 120, undefined, ["138", 480]),
			lab("Creatinine", "0.9", "mg/dL", 300, undefined, ["0.9", 1740]),
			lab("Potassium", "4.1", "mmol/L", 300, undefined, ["3.9", 1740]),
			lab("Hemoglobin", "11.6", "g/dL", 300, "low", ["12.0", 1740]),
			lab("WBC", "9.0", "K/µL", 300, undefined, ["8.4", 1740]),
		],
		careTeam: [
			...hospitalStaff("Sidney Regional", ["Amy Dalton", "AD", 7, "online"], ["Victor Hale", "VH", 9, "away"]),
			...interceptTeam,
		],
	},
	{
		id: "p13",
		account: "85AADCC",
		weight: "95 kg",
		unreadMessages: 4,
		brief: {
			title: "Shock on two pressors, ECMO flow cut",
			text: "MAP is 55 on epinephrine and norepinephrine, with HR 134. Maria Ruiz carried over a concern from the night shift: ECMO flow was cut to 3.8 L/min at 05:30 and lactate went from 2.6 to 3.1. A repeat lactate is pending.",
			sourceCount: 26,
			updatedAt: minutesAgo(20),
			lastViewedAt: minutesAgo(150),
		},
		codeStatus: "Full code",
		ecmo: {
			mode: "VA-ECMO",
			source: "ECMO console",
			updatedAt: minutesAgo(10),
			settings: [
				{ label: "Flow", value: "4.2", unit: "L/min", change: { from: "3.6", at: hoursAgo(2) } },
				{ label: "Sweep", value: "4", unit: "L/min" },
				{ label: "FdO₂", value: "70%" },
				{ label: "Pump speed", value: "3,350", unit: "RPM" },
			],
		},
		allergies: [],
		diagnosis: "Cardiogenic shock after anterior STEMI, on VA-ECMO",
		problems: ["Ischemic cardiomyopathy", "Acute kidney injury, stage 1", "Hyperlipidemia"],
		admittedAt: hoursAgo(100),
		admittedFrom: "Cath lab",
		icuAdmittedAt: hoursAgo(99),
		ventilator: {
			support: "Invasive",
			mode: "Pressure control (PC)",
			source: "Ventilator",
			updatedAt: minutesAgo(2),
			settings: [
				{ label: "FiO₂", value: "40%" },
				{ label: "PEEP", value: "10", unit: "cmH₂O" },
				{ label: "Tidal volume", value: "380", unit: "mL" },
				{ label: "Rate", value: "12", unit: "/min", set: "10" },
				{ label: "Peak pressure", value: "25", unit: "cmH₂O" },
			],
			abg: { values: "pH 7.34 · PaCO₂ 38 · PaO₂ 142 · HCO₃ 20", collectedAt: minutesAgo(130) },
		},
		infusions: [
			// The bedside nurse's titration, made without a call to Intercept (client feedback, Nov 4, 2026).
			{ drug: "Epinephrine", rate: "0.07 mcg/kg/min", change: { direction: "up", from: "0.04", at: minutesAgo(170) }, updatedAt: minutesAgo(1) },
			{ drug: "Norepinephrine", rate: "0.18 mcg/kg/min", change: { direction: "up", from: "0.12", at: minutesAgo(90) }, updatedAt: minutesAgo(1) },
			{ drug: "Heparin", rate: "900 units/h", updatedAt: minutesAgo(1) },
			{ drug: "Fentanyl", rate: "50 mcg/h", updatedAt: minutesAgo(1) },
		],
		labs: [
			lab("Lactate", "3.1", "mmol/L", 130, "high", ["2.6", 250]),
			lab("Creatinine", "2.1", "mg/dL", 240, "high", ["1.8", 1680]),
			lab("Potassium", "5.1", "mmol/L", 240, "high", ["4.7", 1680]),
			lab("Hemoglobin", "8.2", "g/dL", 240, "low", ["8.9", 1680]),
			lab("Anti-Xa", "0.42", "units/mL", 240, undefined, ["0.28", 1680]),
			{ name: "Lactate (repeat)", collectedAt: minutesAgo(15) },
		],
		careTeam: [
			...hospitalStaff("Sidney Regional", ["Grace Holloway", "GH", 8, "online"], ["Daniel Reyes", "DR", 4, "online"]),
			...interceptTeam,
		],
	},
	{
		id: "p14",
		account: "083EDBA",
		weight: "68 kg",
		brief: {
			title: "New atrial fibrillation, rate controlled",
			text: "Admitted 6 h ago with new atrial fibrillation with a fast ventricular rate. Rate is down to 88 on diltiazem. Magnesium is low at 1.7; TSH is pending. Code status isn't documented yet.",
			sourceCount: 8,
			updatedAt: minutesAgo(40),
		},
		allergies: [],
		diagnosis: "New-onset atrial fibrillation with rapid ventricular response",
		problems: ["Hypertension", "Obstructive sleep apnea"],
		admittedAt: hoursAgo(6),
		admittedFrom: "Emergency department",
		icuAdmittedAt: hoursAgo(5),
		ventilator: charted("Room air", 30),
		infusions: [{ drug: "Diltiazem", rate: "10 mg/h", change: { direction: "down", from: "15", at: minutesAgo(120) }, updatedAt: minutesAgo(2) }],
		labs: [
			lab("Potassium", "3.6", "mmol/L", 240, undefined),
			lab("Magnesium", "1.7", "mg/dL", 240, "low"),
			lab("Troponin I", "0.02", "ng/mL", 240, undefined),
			lab("Creatinine", "0.8", "mg/dL", 240, undefined),
			lab("Hemoglobin", "13.1", "g/dL", 240, undefined),
			{ name: "TSH", collectedAt: minutesAgo(240) },
		],
		careTeam: [
			...hospitalStaff("Sidney Regional", ["Lucy Hart", "LH", 2, "online"], ["Ellen Parker", "EP", 9, "online"]),
			...interceptTeam,
		],
	},
	{
		// Scenario 1 (Demo Use Cases), just before it starts: heart failure on a 25-bed hospital's med-surg floor, needing
		// more oxygen overnight but holding. Not in an ICU, so no ICU day; no one from Intercept has looked in yet. At 01:40
		// her score crosses into High: the Prototype menu's Scenario 1 plays that (`sampleScenario1Record`).
		id: "p15",
		account: "BA82902",
		weight: "78 kg",
		brief: {
			title: "Needing more oxygen overnight",
			text: "Holding overnight, but on more oxygen: SpO₂ 92% on 4 L, up from 2 L on admission, with RR 20 and HR 106, creeping up. NEWS2 is 5 (Medium), up from 4 on admission. Net fluid balance is +1.8 L and weight is up 2.1 kg over 48 h on IV furosemide. BNP is 2,400, up from 1,850 on admission, and creatinine 1.9 from 1.6.",
			sourceCount: 12,
			updatedAt: minutesAgo(20),
		},
		codeStatus: "Full code",
		fallRisk: {
			scale: "Morse Fall Scale",
			score: 50,
			risk: "High risk",
			assessedAt: hoursAgo(3),
			previous: { score: 35, at: hoursAgo(20) },
			precautions: ["Bed alarm on", "Commode at bedside", "Non-slip socks"],
		},
		allergies: ["Codeine"],
		diagnosis: "Acute on chronic heart failure with reduced ejection fraction (EF 25%)",
		problems: ["Chronic kidney disease, stage 3", "Type 2 diabetes", "Hypertension"],
		admittedAt: hoursAgo(20),
		admittedFrom: "Emergency department",
		ventilator: charted("Oxygen", 150, [{ label: "Nasal cannula", value: "4", unit: "L/min" }]),
		// NEWS2 from her vitals in `sample-vitals.ts`: 4 on admission, 5 through the night, below High (7).
		earlyWarning: {
			score: "NEWS2",
			value: 5,
			band: "Medium",
			alertBand: "High",
			threshold: 7,
			updatedAt: minutesAgo(2),
			trend: [
				{ at: hoursAgo(20), value: 4 },
				{ at: hoursAgo(4), value: 5 },
				{ at: hoursAgo(1), value: 5 },
				{ at: minutesAgo(2), value: 5 },
			],
			inputs: [
				{ label: "Respiratory rate", value: "20/min", points: 0 },
				{ label: "SpO₂", value: "92%", points: 2 },
				{ label: "Oxygen", value: "4 L/min", points: 2 },
				{ label: "Heart rate", value: "106 bpm", points: 1 },
				{ label: "Systolic BP", value: "147 mmHg", points: 0 },
				{ label: "Consciousness", value: "Alert", points: 0 },
				{ label: "Temperature", value: "36.8 °C", points: 0 },
			],
		},
		// The nurse's 25 min ago.
		fluids: { netBalance: "+1.8 L", weightChange: "+2.1 kg", window: "48 h", chartedAt: minutesAgo(25), chartedBy: "Kayla Brandt, RN" },
		labs: [
			lab("BNP", "2,400", "pg/mL", 75, "high", ["1,850", 1180]),
			lab("Creatinine", "1.9", "mg/dL", 75, "high", ["1.6", 1180]),
			lab("BUN", "44", "mg/dL", 75, "high", ["36", 1180]),
			lab("Potassium", "4.6", "mmol/L", 75, undefined, ["4.2", 1180]),
			lab("Sodium", "132", "mmol/L", 75, "low", ["134", 1180]),
			lab("Glucose", "186", "mg/dL", 75, "high", ["214", 1180]),
		],
		careTeam: [
			...hospitalStaff("Chadron Memorial", ["Kayla Brandt", "KB", 5, "online"], ["Tom Weller", "TW", 8, "away"]),
			...interceptTeam,
		],
	},
	{
		// Hayes's neighbor on the med-surg floor, with the same night nurse: pneumonia, improving on day 3.
		id: "p16",
		account: "9E2AAE6",
		weight: "71 kg",
		brief: {
			title: "Pneumonia improving",
			text: "Improving on day 3 of community-acquired pneumonia. Fever is gone since yesterday afternoon, oxygen is down from 3 to 2 L with SpO₂ 96%, and WBC fell from 15.2 to 10.4. NEWS2 is 2 (Low), down from 5.",
			sourceCount: 9,
			updatedAt: minutesAgo(95),
		},
		codeStatus: "DNR",
		codeStatusOrder: { orderedAt: hoursAgo(66), discussedWith: "Patient; advance directive on file" },
		fallRisk: {
			scale: "Morse Fall Scale",
			score: 60,
			risk: "High risk",
			assessedAt: hoursAgo(14),
			precautions: ["Bed alarm on", "Low bed, locked", "Non-slip socks"],
		},
		allergies: [],
		diagnosis: "Community-acquired pneumonia, right lower lobe",
		problems: ["COPD, mild", "Benign prostatic hyperplasia"],
		admittedAt: hoursAgo(66),
		admittedFrom: "Emergency department",
		ventilator: charted("Oxygen", 110, [{ label: "Nasal cannula", value: "2", unit: "L/min" }]),
		labs: [
			lab("WBC", "10.4", "K/µL", 300, undefined, ["15.2", 1740]),
			lab("Procalcitonin", "0.4", "ng/mL", 300, "high", ["1.8", 1740]),
			lab("Creatinine", "1.1", "mg/dL", 300, undefined, ["1.3", 1740]),
			lab("Sodium", "136", "mmol/L", 300, undefined, ["133", 1740]),
		],
		careTeam: [
			...hospitalStaff("Chadron Memorial", ["Kayla Brandt", "KB", 5, "online"], ["Tom Weller", "TW", 8, "away"]),
			...interceptTeam,
		],
	},
	{
		// On the same floor, stable: cellulitis improving on day 2 of IV antibiotics.
		id: "p19",
		account: "F0EDB06",
		weight: "84 kg",
		brief: {
			title: "Cellulitis improving",
			text: "Cellulitis of the left lower leg, day 2 of IV cefazolin and improving. The redness is inside the marked border, she's had no fever since yesterday morning, and WBC fell from 13.8 to 9.6. Glucose 140 to 180 on her home insulin. NEWS2 is 1 (Low), SpO₂ 95% on room air.",
			sourceCount: 7,
			updatedAt: minutesAgo(130),
		},
		codeStatus: "Full code",
		allergies: ["Penicillin (rash)"],
		diagnosis: "Cellulitis, left lower leg",
		problems: ["Type 2 diabetes", "Obesity", "Chronic venous insufficiency"],
		admittedAt: hoursAgo(40),
		admittedFrom: "Emergency department",
		ventilator: charted("Room air", 130),
		labs: [
			lab("WBC", "9.6", "K/µL", 320, undefined, ["13.8", 1760]),
			lab("Glucose", "164", "mg/dL", 320, "high", ["248", 1760]),
			lab("Creatinine", "0.9", "mg/dL", 320, undefined, ["1.0", 1760]),
			lab("CRP", "4.2", "mg/dL", 320, "high", ["9.1", 1760]),
		],
		careTeam: [
			...hospitalStaff("Chadron Memorial", ["Kayla Brandt", "KB", 5, "online"], ["Tom Weller", "TW", 8, "away"]),
			...interceptTeam,
		],
	},
	{
		// On the same floor, stable: kidney injury from dehydration, back toward his baseline on IV fluids.
		id: "p20",
		account: "F270140",
		weight: "88 kg",
		brief: {
			title: "Kidney injury improving",
			text: "Acute kidney injury from dehydration after three days of gastroenteritis, improving. Creatinine 1.4, down from 2.3, on IV fluids; urine output 70 mL/h. Eating and drinking since last evening, no vomiting. Lisinopril and metformin are on hold. NEWS2 is 0 (Low).",
			sourceCount: 8,
			updatedAt: minutesAgo(150),
		},
		codeStatus: "Full code",
		allergies: [],
		diagnosis: "Acute kidney injury, prerenal, from gastroenteritis",
		problems: ["Hypertension", "Type 2 diabetes"],
		admittedAt: hoursAgo(30),
		admittedFrom: "Emergency department",
		ventilator: charted("Room air", 150),
		infusions: [{ drug: "Normal saline", rate: "100 mL/h", change: { direction: "down", from: "150", at: minutesAgo(600) }, updatedAt: minutesAgo(5) }],
		labs: [
			lab("Creatinine", "1.4", "mg/dL", 300, "high", ["2.3", 1740]),
			lab("BUN", "28", "mg/dL", 300, "high", ["46", 1740]),
			lab("Potassium", "4.2", "mmol/L", 300, undefined, ["3.3", 1740]),
			lab("Sodium", "139", "mmol/L", 300, undefined, ["146", 1740]),
		],
		careTeam: [
			...hospitalStaff("Chadron Memorial", ["Kayla Brandt", "KB", 5, "online"], ["Tom Weller", "TW", 8, "away"]),
			...interceptTeam,
		],
	},
	{
		// Post-op day 1 after a small bowel resection: breathing a little faster and HR up, so NEWS2 is Medium. Pain and
		// splinting are the likely cause; nothing has fired.
		id: "p17",
		photo: samplePatientPhotos.p17,
		account: "6EFA3B6",
		weight: "62 kg",
		brief: {
			title: "Score rising after bowel surgery",
			text: "Post-op day 1 after a small bowel resection for an adhesive obstruction. NEWS2 is 6 (Medium), up from 4: RR 21, HR 104 and SpO₂ 95% on 2 L. She's splinting with pain; the PCA was increased 1 h ago. Urine output 40 mL/h, lactate 1.4.",
			sourceCount: 11,
			updatedAt: minutesAgo(30),
		},
		codeStatus: "Full code",
		allergies: ["Sulfa drugs"],
		diagnosis: "Adhesive small bowel obstruction, after small bowel resection",
		problems: ["Hypertension", "Osteoarthritis"],
		admittedAt: hoursAgo(20),
		admittedFrom: "Operating room",
		icuAdmittedAt: hoursAgo(20),
		ventilator: charted("Oxygen", 40, [{ label: "Nasal cannula", value: "2", unit: "L/min" }]),
		infusions: [
			{ drug: "Lactated Ringer's", rate: "100 mL/h", updatedAt: minutesAgo(4) },
			{ drug: "Hydromorphone PCA", rate: "0.3 mg every 10 min", change: { direction: "up", from: "0.2", at: minutesAgo(60) }, updatedAt: minutesAgo(4) },
		],
		labs: [
			lab("Hemoglobin", "10.8", "g/dL", 210, "low", ["12.6", 1300]),
			lab("WBC", "11.9", "K/µL", 210, "high", ["9.8", 1300]),
			lab("Lactate", "1.4", "mmol/L", 210, undefined, ["2.1", 1180]),
			lab("Potassium", "3.8", "mmol/L", 210, undefined),
			lab("Creatinine", "0.8", "mg/dL", 210, undefined),
		],
		careTeam: [
			...hospitalStaff("Alliance Community", ["Ashley Bell", "AB", 7, "online"], ["Marcus Reed", "MR", 2, "away"]),
			...interceptTeam,
		],
	},
	{
		// Diabetic ketoacidosis, nearly closed: the insulin drip comes off once the gap stays closed and he's eating.
		id: "p18",
		photo: samplePatientPhotos.p18,
		account: "B33CB99",
		weight: "74 kg",
		brief: {
			title: "Ketoacidosis resolving",
			text: "Diabetic ketoacidosis, resolving. The anion gap is 12, down from 28, and bicarbonate 20 from 9. Glucose 168 on insulin at 3 units/h with dextrose. Eating breakfast, so the plan is subcutaneous insulin and the drip off 2 h later. NEWS2 is 1 (Low), down from 5.",
			sourceCount: 14,
			updatedAt: minutesAgo(50),
		},
		codeStatus: "Full code",
		allergies: [],
		diagnosis: "Diabetic ketoacidosis, from missed insulin doses",
		problems: ["Type 1 diabetes", "Hypothyroidism"],
		admittedAt: hoursAgo(22),
		admittedFrom: "Emergency department",
		icuAdmittedAt: hoursAgo(21),
		ventilator: charted("Room air", 120),
		infusions: [
			{ drug: "Insulin regular", rate: "3 units/h", change: { direction: "down", from: "6", at: minutesAgo(240) }, updatedAt: minutesAgo(3) },
			{ drug: "Dextrose 5% with 0.45% saline", rate: "125 mL/h", updatedAt: minutesAgo(3) },
		],
		labs: [
			lab("Anion gap", "12", "mmol/L", 90, undefined, ["28", 1260]),
			lab("Bicarbonate", "20", "mmol/L", 90, "low", ["9", 1260]),
			lab("Glucose", "168", "mg/dL", 25, "high", ["512", 1260]),
			lab("Potassium", "4.1", "mmol/L", 90, undefined, ["5.6", 1260]),
			lab("Beta-hydroxybutyrate", "0.8", "mmol/L", 90, "high", ["6.4", 1260]),
		],
		careTeam: [
			...hospitalStaff("Alliance Community", ["Ashley Bell", "AB", 7, "online"], ["Marcus Reed", "MR", 2, "online"]),
			...interceptTeam,
		],
	},
	{
		// Right hip hemiarthroplasty after a fall on the ice, post-op day 1: stable on 2 L while she gets moving.
		id: "p22",
		account: "09A0F85",
		weight: "61 kg",
		brief: {
			title: "Recovering after hip surgery",
			text: "Post-op day 1 after a right hip hemiarthroplasty for a femoral neck fracture; she slipped on ice outside her home. NEWS2 is 3 (Low), down from 5 after surgery: HR 86, BP 126/70, SpO₂ 95% on 2 L. Hemoglobin 9.4, down from 11.8, with no bleeding at the wound. Stood at the bedside with physical therapy this morning.",
			sourceCount: 10,
			updatedAt: minutesAgo(40),
		},
		codeStatus: "Full code",
		fallRisk: {
			scale: "Morse Fall Scale",
			score: 65,
			risk: "High risk",
			assessedAt: hoursAgo(2),
			precautions: ["Bed alarm on", "Low bed, locked", "Hip precautions", "Walker at bedside"],
		},
		allergies: ["Codeine"],
		diagnosis: "Right femoral neck fracture, after hemiarthroplasty",
		problems: ["Hypertension", "Osteoporosis"],
		admittedAt: hoursAgo(34),
		admittedFrom: "Emergency department",
		ventilator: charted("Oxygen", 50, [{ label: "Nasal cannula", value: "2", unit: "L/min" }]),
		infusions: [
			{ drug: "Lactated Ringer's", rate: "75 mL/h", change: { direction: "down", from: "100", at: minutesAgo(480) }, updatedAt: minutesAgo(6) },
		],
		labs: [
			lab("Hemoglobin", "9.4", "g/dL", 240, "low", ["11.8", 2000]),
			lab("WBC", "10.6", "K/µL", 240, undefined, ["9.1", 2000]),
			lab("Sodium", "134", "mmol/L", 240, "low", ["138", 2000]),
			lab("Potassium", "4.0", "mmol/L", 240, undefined),
			lab("Creatinine", "1.0", "mg/dL", 240, undefined, ["1.1", 2000]),
		],
		careTeam: [
			...hospitalStaff("Alliance Community", ["Ashley Bell", "AB", 7, "online"], ["Marcus Reed", "MR", 2, "away"]),
			...interceptTeam,
		],
	},
	// Bridgeport's inpatient side (Nov 6, 2026, user's call): its one night RN, Brittany Cole (Scenario 4's), and the
	// family physician of record, Paul Sorensen, off shift while the APP is on call. Then a patient in its ED.
	{
		// Diverticulitis, improving on day 2 of IV antibiotics.
		id: "p25",
		account: "D0CAB9F",
		weight: "92 kg",
		brief: {
			title: "Diverticulitis improving",
			text: "Acute sigmoid diverticulitis without an abscess on CT, day 2 of IV ceftriaxone and metronidazole. Pain is down from 7/10 to 3/10, no fever since yesterday afternoon, and WBC fell from 15.6 to 11.2. Tolerating clear liquids. NEWS2 is 0 (Low), down from 2.",
			sourceCount: 8,
			updatedAt: minutesAgo(120),
		},
		codeStatus: "Full code",
		allergies: [],
		diagnosis: "Acute sigmoid diverticulitis, uncomplicated",
		problems: ["Hypertension", "Hyperlipidemia"],
		admittedAt: hoursAgo(44),
		admittedFrom: "Emergency department",
		ventilator: charted("Room air", 120),
		infusions: [{ drug: "Lactated Ringer's", rate: "75 mL/h", change: { direction: "down", from: "125", at: minutesAgo(720) }, updatedAt: minutesAgo(5) }],
		labs: [
			lab("WBC", "11.2", "K/µL", 280, "high", ["15.6", 1700]),
			lab("Creatinine", "1.0", "mg/dL", 280, undefined, ["1.2", 1700]),
			lab("Potassium", "3.9", "mmol/L", 280, undefined, ["3.6", 1700]),
			lab("Sodium", "138", "mmol/L", 280, undefined),
		],
		careTeam: [
			...hospitalStaff("Bridgeport Valley", ["Brittany Cole", "BC", 6, "online"], ["Paul Sorensen", "PS", 9, "offline"]),
			...interceptTeam,
		],
	},
	{
		// Influenza A with viral pneumonia, day 1: on 2 L, the fever gone overnight. DNR, as her POLST says.
		id: "p26",
		account: "E23BCF2",
		weight: "58 kg",
		brief: {
			title: "Influenza pneumonia, slightly better",
			text: "Influenza A with viral pneumonia, day 1 of oseltamivir. NEWS2 is 5 (Medium), down from 6 on arrival: RR 21 and SpO₂ 94% on 2 L, HR 88. The fever broke overnight with acetaminophen. Procalcitonin 0.18, so ceftriaxone stops if her sputum culture stays negative. Drinking with encouragement, eating little.",
			sourceCount: 9,
			updatedAt: minutesAgo(60),
		},
		codeStatus: "DNR",
		codeStatusOrder: { orderedAt: hoursAgo(18), discussedWith: "Patient and her daughter; POLST on file" },
		isolationOrder: { reason: "Influenza A, PCR positive", orderedAt: hoursAgo(19) },
		allergies: ["Sulfa drugs"],
		isolation: "Droplet isolation",
		diagnosis: "Influenza A with viral pneumonia",
		problems: ["Hypothyroidism", "Osteoarthritis"],
		admittedAt: hoursAgo(18),
		admittedFrom: "Emergency department",
		ventilator: charted("Oxygen", 60, [{ label: "Nasal cannula", value: "2", unit: "L/min" }]),
		labs: [
			lab("WBC", "7.8", "K/µL", 300, undefined, ["9.4", 1100]),
			lab("Procalcitonin", "0.18", "ng/mL", 300, undefined),
			lab("Sodium", "133", "mmol/L", 300, "low", ["131", 1100]),
			lab("Creatinine", "1.1", "mg/dL", 300, "high", ["1.3", 1100]),
			lab("Potassium", "4.0", "mmol/L", 300, undefined),
		],
		careTeam: [
			...hospitalStaff("Bridgeport Valley", ["Brittany Cole", "BC", 6, "online"], ["Paul Sorensen", "PS", 9, "offline"]),
			...interceptTeam,
		],
	},
	{
		// A swing bed for rehab after a knee replacement at Sidney Regional; going home with his wife.
		id: "p27",
		account: "825ACFC",
		weight: "86 kg",
		brief: {
			title: "Rehab after knee replacement, on track",
			text: "In a swing bed for rehab, day 3, after a left total knee replacement at Sidney Regional 6 days ago. Walking 120 feet with a walker, the knee bending to 85°. Pain 2–4/10 on scheduled acetaminophen, with oxycodone before therapy. Incision dry. NEWS2 is 0 (Low). Home in 2 to 3 days if he manages the three steps at his door.",
			sourceCount: 6,
			updatedAt: minutesAgo(180),
		},
		codeStatus: "Full code",
		fallRisk: {
			scale: "Morse Fall Scale",
			score: 45,
			risk: "High risk",
			assessedAt: hoursAgo(9),
			previous: { score: 55, at: hoursAgo(70) },
			precautions: ["Bed alarm on", "Walker at bedside", "Call before getting up"],
		},
		allergies: ["Morphine"],
		diagnosis: "Left total knee arthroplasty, rehabilitation",
		problems: ["Osteoarthritis, both knees", "Hypertension", "Type 2 diabetes, diet-controlled"],
		admittedAt: hoursAgo(70),
		admittedFrom: "Transfer from Sidney Regional",
		ventilator: charted("Room air", 180),
		labs: [
			lab("Hemoglobin", "11.2", "g/dL", 1500, "low", ["10.6", 4300]),
			lab("Creatinine", "0.9", "mg/dL", 1500, undefined),
			lab("Potassium", "4.3", "mmol/L", 1500, undefined),
			lab("Sodium", "139", "mmol/L", 1500, undefined),
		],
		careTeam: [
			...hospitalStaff("Bridgeport Valley", ["Brittany Cole", "BC", 6, "online"], ["Paul Sorensen", "PS", 9, "offline"]),
			...interceptTeam,
		],
	},
	{
		// Observation for an upper GI bleed from ibuprofen: hemoglobin holding, endoscopy next.
		id: "p28",
		account: "8FC5C29",
		weight: "70 kg",
		brief: {
			title: "GI bleed, hemoglobin holding",
			text: "Observation for an upper GI bleed: two days of black stools after a week of ibuprofen for back pain. Hemoglobin 10.6 and holding (10.9 on arrival, 10.4 at 6 h), no more black stools since she arrived, BUN 34. Pantoprazole IV every 12 h, nothing by mouth for an upper endoscopy by the visiting general surgeon. NEWS2 is 1 (Low): HR 94, BP 114/66.",
			sourceCount: 7,
			updatedAt: minutesAgo(90),
		},
		codeStatus: "Full code",
		fallRisk: {
			scale: "Morse Fall Scale",
			score: 45,
			risk: "High risk",
			assessedAt: hoursAgo(4),
			precautions: ["Bed alarm on", "Call before getting up", "Sit before standing"],
		},
		allergies: ["Latex"],
		diagnosis: "Upper GI bleed, suspected NSAID-related ulcer",
		problems: ["Chronic low back pain", "Hypertension"],
		admittedAt: hoursAgo(16),
		admittedFrom: "Emergency department",
		ventilator: charted("Room air", 90),
		infusions: [{ drug: "Normal saline", rate: "75 mL/h", change: { direction: "down", from: "150", at: minutesAgo(480) }, updatedAt: minutesAgo(5) }],
		labs: [
			lab("Hemoglobin", "10.6", "g/dL", 120, "low", ["10.4", 600]),
			lab("BUN", "34", "mg/dL", 120, "high", ["38", 960]),
			lab("Creatinine", "0.8", "mg/dL", 120, undefined),
			lab("INR", "1.0", "", 960, undefined),
		],
		careTeam: [
			...hospitalStaff("Bridgeport Valley", ["Brittany Cole", "BC", 6, "online"], ["Paul Sorensen", "PS", 9, "offline"]),
			...interceptTeam,
		],
	},
	{
		// In Bridgeport's ED with an asthma attack, better after three nebulizers; likely home tonight.
		id: "p29",
		account: "0C655EB",
		weight: "66 kg",
		brief: {
			title: "Asthma attack improving",
			text: "Asthma exacerbation after a cold, improving in the ED. After three ipratropium-albuterol nebulizers and prednisone 50 mg, peak flow is 62% of her best, up from 38%, with SpO₂ 96% on room air and RR 20. HR 104 from the albuterol. NEWS2 is 1 (Low), down from 5. Observing 1 more hour; home on a prednisone burst if she holds.",
			sourceCount: 5,
			updatedAt: minutesAgo(15),
		},
		codeStatus: "Full code",
		allergies: [],
		diagnosis: "Asthma exacerbation, moderate",
		problems: ["Asthma, moderate persistent", "Allergic rhinitis"],
		admittedAt: hoursAgo(3),
		admittedFrom: "Walked into Bridgeport's ED",
		ventilator: charted("Room air", 20),
		labs: [
			lab("Potassium", "3.6", "mmol/L", 150, undefined),
			lab("Glucose", "142", "mg/dL", 150, "high"),
			lab("WBC", "9.8", "K/µL", 150, undefined),
		],
		// The ED's nurse and physician tonight.
		careTeam: [
			...hospitalStaff("Bridgeport Valley", ["Kelsey Morgan", "KM", 4, "online"], ["Ryan Mercer", "RM", 10, "online"]),
			...interceptTeam,
		],
	},
];

// Every patient's plan of care, from their hospital's record system (`sample-plan-of-care.ts`), and clinical status
// (`sample-clinical-status.ts`).
const samplePatientBaseRecords: PatientRecord[] = baseRecords.map((record) => ({
	...record,
	planOfCare: samplePlanOfCare(record.id),
	clinicalStatus: sampleClinicalStatus(record.id),
}));

/**
 * Scenario 1's early warning (Demo Use Cases, Chadron at 01:40): what changes in Margaret Hayes's record when her NEWS2
 * crosses into High, 5 an hour ago and 10 now, with RR 20 → 26, SpO₂ 89% and HR 112 (`sampleScenario1Vitals`). Built
 * when the Prototype menu's Scenario 1 plays it, so its times read "just now".
 */
const sampleScenario1Record = (): Partial<PatientRecord> => ({
	// The night nurse re-evaluates her heart failure goal: not progressing.
	planOfCare: planOfCareWith("p15", { 0: "not-progressing" }, 5),
	clinicalStatus: clinicalStatusAt("deteriorating", 1),
	brief: {
		title: "Breathing harder in the last hour",
		text: "Breathing harder in the last hour: RR up from 20 to 26 and SpO₂ down to 89% on 4 L, with HR 112, so NEWS2 is 10 (High), up from 5. Overnight her oxygen went from 2 to 4 L to hold SpO₂ at 92%. Net fluid balance is +1.8 L and weight is up 2.1 kg over 48 h on IV furosemide. BNP is 2,400, up from 1,850 on admission, and creatinine 1.9 from 1.6.",
		sourceCount: 12,
		updatedAt: minutesAgo(0),
	},
	findings: [
		{ name: "Temp", value: "36.8", unit: "°C", chartedAt: minutesAgo(125), staleAfterMinutes: 60, note: "Charted · Normal" },
		{ name: "Oxygen", value: "4 L/min", since: minutesAgo(150), note: "Nasal cannula · up from 2 L" },
		{ name: "SBP", value: "148", unit: "mmHg", previous: { value: "132", at: hoursAgo(4) } },
	],
	earlyWarning: {
		score: "NEWS2",
		value: 10,
		band: "High",
		alertBand: "High",
		threshold: 7,
		updatedAt: minutesAgo(0),
		crossedAt: minutesAgo(0),
		trend: [
			{ at: hoursAgo(20), value: 4 },
			{ at: hoursAgo(4), value: 5 },
			{ at: hoursAgo(1), value: 5 },
			{ at: minutesAgo(0), value: 10 },
		],
		inputs: [
			{ label: "Respiratory rate", value: "26/min", points: 3 },
			{ label: "SpO₂", value: "89%", points: 3 },
			{ label: "Oxygen", value: "4 L/min", points: 2 },
			{ label: "Heart rate", value: "112 bpm", points: 2 },
			{ label: "Systolic BP", value: "148 mmHg", points: 0 },
			{ label: "Consciousness", value: "Alert", points: 0 },
			{ label: "Temperature", value: "36.8 °C", points: 0 },
		],
	},
});

// Scenario 1's resolution (06:00): RR 20 and SpO₂ 95% on 2 L, so NEWS2 3, Low; both checkpoints passed and she stays at
// Chadron. Her plan, the decisions and who made them come from the app's record of them (the feed's activity).
const sampleScenario1ResolvedRecord = (): Partial<PatientRecord> => ({
	planOfCare: planOfCareWith("p15", { 0: "progressing" }, 20),
	clinicalStatus: clinicalStatusAt("improving", 20),
	brief: {
		title: "Stable on 2 L by morning",
		text: "Stable on 2 L by morning: RR 20 and SpO₂ 95%, with HR 88, so NEWS2 is 3 (Low), down from 10 at the alert. The CHF exacerbation pathway is running, with urine output above its target on the furosemide infusion. Both checkpoints passed, so she stays at Chadron: the transfer was avoided.",
		sourceCount: 14,
		updatedAt: minutesAgo(0),
	},
	// The tiles Intercept-Live draws (`242:11805`): the charted temperature gone stale, and SBP against the nitro rule.
	findings: [
		{ name: "Temp", value: "36.8", unit: "°C", chartedAt: minutesAgo(130), staleAfterMinutes: 60, note: "Charted · Normal" },
		{ name: "Oxygen", value: "2 L/min", since: minutesAgo(40), note: "Nasal cannula" },
		{ name: "SBP", value: "128", unit: "mmHg", context: "Nitro stops < 110", previous: { value: "148", at: hoursAgo(4) } },
	],
	earlyWarning: {
		score: "NEWS2",
		value: 3,
		band: "Low",
		alertBand: "High",
		threshold: 7,
		updatedAt: minutesAgo(0),
		trend: [
			{ at: hoursAgo(20), value: 4 },
			{ at: hoursAgo(4), value: 5 },
			{ at: minutesAgo(5), value: 10 },
			{ at: minutesAgo(0), value: 3 },
		],
		inputs: [
			{ label: "Respiratory rate", value: "20/min", points: 0 },
			{ label: "SpO₂", value: "95%", points: 1 },
			{ label: "Oxygen", value: "2 L/min", points: 2 },
			{ label: "Heart rate", value: "88 bpm", points: 0 },
			{ label: "Systolic BP", value: "128 mmHg", points: 0 },
			{ label: "Consciousness", value: "Alert", points: 0 },
			{ label: "Temperature", value: "36.8 °C", points: 0 },
		],
	},
	ventilator: charted("Oxygen", 0, [{ label: "Nasal cannula", value: "2", unit: "L/min" }]),
});

/* -------------------------------------------------------------------------- */
/* Scenario 2: Dale Reynolds                                                  */
/* -------------------------------------------------------------------------- */

// Scenario 2 (Demo Use Cases, "COPD respiratory failure during a blizzard"): Dale Reynolds, 64, a rancher with severe
// COPD, in Alliance's ED, as in the scenario. He isn't on the Census until the ED requests a
// consult, which is the scenario's first beat, so his record is built when it plays (its times read "just now") and
// isn't in `samplePatientBaseRecords`.
//
// NEWS2 on SpO₂ scale 2 (target 88–92%), the scale for hypercapnic respiratory failure: on scale 1 his SpO₂ at target
// would score 3 points and keep him High after NIV works. Which patients go on scale 2, and who decides, is still open
// (PRD Patient card, open question on scale 2); this is the one patient on it.

// The ED's nurse and physician tonight; the physician co-signs the hub's orders at the bedside.
const reynoldsCareTeam: CareTeamMember[] = [
	...hospitalStaff("Alliance Community", ["Megan Foster", "MF", 6, "online"], ["Brian Keller", "BK", 3, "online"]),
	...interceptTeam,
];

// Rosa Medina (Scenario 3, below): Sidney ED's day shift. Her bedside nurse (the one the video consult calls), the second
// ED nurse, and the hospitalist APP leading her case, who is the attending of record for this ED encounter and co-signs
// the hub's orders. Built directly rather than with `hospitalStaff`: the APP isn't an "Attending of record" MD, and
// there are two nurses.
const medinaCareTeam: CareTeamMember[] = [
	{ role: "Bedside nurse", name: "Ashley Brooks", initials: "AB", tone: 4, organization: "Sidney Regional", presence: "online" },
	{ role: "ED nurse", name: "Kristen Webb", initials: "KW", tone: 2, organization: "Sidney Regional", presence: "online" },
	{ role: "Hospitalist APP", name: "Jenna Collins", initials: "JC", tone: 7, organization: "Sidney Regional", presence: "online" },
	...interceptTeam,
];

// Tyler Kessler (Scenario 4, below): Bridgeport's night. The one RN on the inpatient side (the one the video consult
// calls), the day nurse who takes over at 07:00, and the APP on call from home, who admits him and co-signs the hub's
// orders. The hub's tele-RN tonight is Ava Brooks, who gets the overdue-check nudges with the bedside nurse, so she
// takes the Intercept RN's place on his team.
const kesslerCareTeam: CareTeamMember[] = [
	{ role: "Bedside nurse", name: "Brittany Cole", initials: "BC", tone: 6, organization: "Bridgeport Valley", presence: "online" },
	{ role: "Day nurse, from 07:00", name: "Hannah Price", initials: "HP", tone: 8, organization: "Bridgeport Valley", presence: "offline" },
	{ role: "APP on call", name: "Derek Lawson", initials: "DL", tone: 5, organization: "Bridgeport Valley", presence: "online" },
	...interceptTeam.filter((member) => member.role !== "Intercept RN"),
	{ role: "Intercept tele-RN", name: "Ava Brooks", initials: "AB", tone: 2, presence: "online" },
];

/** Care teams of the patients a scenario adds to the Census, by id, for the sections that look a record up by id. */
const sampleScenarioCareTeams: Record<string, CareTeamMember[]> = { p21: reynoldsCareTeam, p23: medinaCareTeam, p24: kesslerCareTeam };

/**
 * Dale Reynolds's record at Scenario 2's first beat (22:15): in the ED 40 min, blood gas 30 min ago (pH 7.24, PaCO₂
 * 78), on BiPAP for 20 min with the hub consult just requested. NEWS2 6 on arrival, 7 now (High).
 */
const sampleScenario2BaseRecord = (): PatientRecord => ({
	id: "p21",
	planOfCare: samplePlanOfCare("p21"),
	clinicalStatus: sampleClinicalStatus("p21"),
	account: "F7C7964",
	weight: "82 kg",
	brief: {
		title: "COPD exacerbation, out of home oxygen",
		text: "Severe COPD on home oxygen, brought in by ambulance through the storm after three days of worsening breathlessness. He ran out of oxygen 4 days ago. Blood gas on arrival: pH 7.24, PaCO₂ 78, so acute on chronic hypercapnic respiratory failure. On BiPAP for 20 min: SpO₂ 88%, inside his 88–92% target, but RR 30 and HR 112. Alert, talking in short phrases. NEWS2 7 (High, SpO₂ scale 2), up from 6 on arrival.",
		sourceCount: 9,
		updatedAt: minutesAgo(0),
	},
	codeStatus: "Full code",
	allergies: [],
	diagnosis: "Acute on chronic hypercapnic respiratory failure, COPD exacerbation",
	problems: ["COPD, severe (GOLD 3) · home oxygen 2 L", "Tobacco use, 40 pack-years", "Secondary polycythemia"],
	admittedAt: minutesAgo(40),
	admittedFrom: "Ambulance from home",
	ventilator: {
		support: "NIV",
		mode: "BiPAP",
		source: "Ventilator",
		updatedAt: minutesAgo(1),
		settings: [
			{ label: "FiO₂", value: "35%" },
			{ label: "IPAP", value: "12", unit: "cmH₂O" },
			{ label: "EPAP", value: "5", unit: "cmH₂O" },
			{ label: "Rate", value: "12", unit: "/min" },
		],
		abg: { values: "pH 7.24 · PaCO₂ 78 · PaO₂ 58 · HCO₃ 33", collectedAt: minutesAgo(30) },
	},
	earlyWarning: {
		score: "NEWS2",
		value: 7,
		band: "High",
		alertBand: "High",
		threshold: 7,
		updatedAt: minutesAgo(0),
		crossedAt: minutesAgo(0),
		trend: [
			{ at: minutesAgo(40), value: 6 },
			{ at: minutesAgo(0), value: 7 },
		],
		inputs: [
			{ label: "Respiratory rate", value: "30/min", points: 3 },
			{ label: "SpO₂ (scale 2)", value: "88%", points: 0 },
			{ label: "Oxygen", value: "BiPAP, FiO₂ 35%", points: 2 },
			{ label: "Heart rate", value: "112 bpm", points: 2 },
			{ label: "Systolic BP", value: "156 mmHg", points: 0 },
			{ label: "Consciousness", value: "Alert", points: 0 },
			{ label: "Temperature", value: "37.4 °C", points: 0 },
		],
	},
	labs: [
		lab("Bicarbonate", "33", "mmol/L", 30, "high"),
		lab("WBC", "12.8", "K/µL", 30, "high"),
		lab("Hemoglobin", "17.6", "g/dL", 30, "high"),
		lab("Potassium", "4.3", "mmol/L", 30, undefined),
		lab("Creatinine", "0.9", "mg/dL", 30, undefined),
		lab("Lactate", "1.4", "mmol/L", 30, undefined),
	],
	careTeam: reynoldsCareTeam,
});

/**
 * Scenario 2's resolution (2 h on NIV): the repeat gas is pH 7.31 and PaCO₂ 64, RR 21, HR 96, SpO₂ 91%, alert, so
 * NEWS2 5 (Medium). Both checkpoints passed; he stays at Alliance, without intubation or a transfer.
 */
const sampleScenario2ResolvedRecord = (): Partial<PatientRecord> => ({
	planOfCare: planOfCareWith("p21", { 0: "progressing" }, 10),
	clinicalStatus: clinicalStatusAt("improving", 10),
	brief: {
		title: "NIV is working",
		text: "NIV is working: at 2 h the repeat gas is pH 7.31 and PaCO₂ 64, from 7.24 and 78 on arrival. RR 21, HR 96 and SpO₂ 91% on BiPAP, more alert and speaking in full sentences. NEWS2 5 (Medium), down from 7. Both checkpoints passed, so he stays at Alliance in a monitored bed, with no intubation and no transfer.",
		sourceCount: 12,
		updatedAt: minutesAgo(0),
	},
	earlyWarning: {
		score: "NEWS2",
		value: 5,
		band: "Medium",
		alertBand: "High",
		threshold: 7,
		updatedAt: minutesAgo(0),
		trend: [
			{ at: minutesAgo(45), value: 6 },
			{ at: minutesAgo(5), value: 7 },
			{ at: minutesAgo(0), value: 5 },
		],
		inputs: [
			{ label: "Respiratory rate", value: "21/min", points: 2 },
			{ label: "SpO₂ (scale 2)", value: "91%", points: 0 },
			{ label: "Oxygen", value: "BiPAP, FiO₂ 30%", points: 2 },
			{ label: "Heart rate", value: "96 bpm", points: 1 },
			{ label: "Systolic BP", value: "138 mmHg", points: 0 },
			{ label: "Consciousness", value: "Alert", points: 0 },
			{ label: "Temperature", value: "37.2 °C", points: 0 },
		],
	},
	ventilator: {
		support: "NIV",
		mode: "BiPAP",
		source: "Ventilator",
		updatedAt: minutesAgo(0),
		settings: [
			{ label: "FiO₂", value: "30%", change: { from: "35%", at: minutesAgo(1) } },
			{ label: "IPAP", value: "14", unit: "cmH₂O", change: { from: "12", at: minutesAgo(1) } },
			{ label: "EPAP", value: "5", unit: "cmH₂O" },
			{ label: "Rate", value: "12", unit: "/min" },
		],
		abg: { values: "pH 7.31 · PaCO₂ 64 · PaO₂ 66 · HCO₃ 32", collectedAt: minutesAgo(2) },
	},
});

/* -------------------------------------------------------------------------- */
/* Scenario 3: Rosa Medina                                                    */
/* -------------------------------------------------------------------------- */

// Scenario 3 (Demo Use Cases, "Sepsis in a patient with diabetes and kidney disease"): Rosa Medina, 58, type 2 diabetes
// on insulin and CKD stage 4, boarding in Sidney's ED because its inpatient unit is full. She walked in with her daughter
// 50 min before the sepsis screen fires (15:30), the scenario's first beat, so her record is built when it plays (its
// times read "just now") and isn't in `samplePatientBaseRecords`. Every value is illustrative until clinical review.
//
// The scenario's 12 h pass in a few beats, so each later stage's earlier points sit a couple of minutes apart, as Dale
// Reynolds's 2 h do; the brief says the real times ("at 6 h").

type Scenario3RecordStage = "pressor" | "6h" | "resolved";

/** The scenario's points in order: NEWS2 at each, from the facts' vitals. */
const medinaScores: [stage: "triage" | "alert" | "fluids" | Scenario3RecordStage, news2: number][] = [
	["triage", 7],
	["alert", 10],
	["fluids", 9],
	["pressor", 3],
	["6h", 1],
	["resolved", 0],
];

/** Minutes back from `stage` to the first beat (the screen), with the stages between two minutes apart. */
const medinaAlertBack = (stage: "alert" | Scenario3RecordStage) =>
	(medinaScores.findIndex(([name]) => name === stage) - 1) * 2;

/** Her NEWS2 trend up to `stage`: triage 50 min before the screen, then each stage. */
function medinaScoreTrend(stage: "alert" | Scenario3RecordStage): PatientEarlyWarning["trend"] {
	const last = medinaScores.findIndex(([name]) => name === stage);
	const alertBack = medinaAlertBack(stage);
	return medinaScores.slice(0, last + 1).map(([, value], index) => ({
		at: minutesAgo(index === 0 ? alertBack + 50 : (last - index) * 2),
		value,
	}));
}

/**
 * Her key labs at the screen and after: the first draw resulted 22 min before the screen (lactate, BMP, CBC); the
 * repeat lactate (at 2 h in the scenario) comes with `pressor`, 1.6 at `6h`, creatinine 2.5 by the morning. Baseline
 * creatinine 2.4 is from her nephrology clinic 3 months ago. Plausible where the scenario is silent: potassium 4.6 at
 * the 4 h check on insulin, then 4.4; WBC 14.2, bicarbonate 20 and hemoglobin 10.6 (after 2 L of fluid) by morning.
 */
function medinaLabs(stage: "alert" | Scenario3RecordStage): PatientLab[] {
	const first = medinaAlertBack(stage) + 22;
	const baseline = 90 * 24 * 60;
	const at = (point: "pressor" | "6h" | "resolved") => medinaAlertBack(stage) - medinaAlertBack(point);
	const reached = (point: Scenario3RecordStage) =>
		stage !== "alert" && medinaScores.findIndex(([name]) => name === stage) >= medinaScores.findIndex(([name]) => name === point);
	const lactate = reached("6h")
		? lab("Lactate", "1.6", "mmol/L", at("6h"), undefined, ["2.6", at("pressor")])
		: reached("pressor")
			? lab("Lactate", "2.6", "mmol/L", at("pressor"), "high", ["3.8", first])
			: lab("Lactate", "3.8", "mmol/L", first, "high");
	const glucose = reached("resolved")
		? lab("Glucose", "158", "mg/dL", at("resolved"), "high", ["172", at("6h")])
		: reached("6h")
			? lab("Glucose", "172", "mg/dL", at("6h"), "high", ["312", at("pressor")])
			: reached("pressor")
				? lab("Glucose", "312", "mg/dL", at("pressor"), "high", ["390", first])
				: lab("Glucose", "390", "mg/dL", first, "high");
	const morning = reached("resolved");
	return [
		lactate,
		morning
			? lab("Creatinine", "2.5", "mg/dL", at("resolved"), "high", ["2.6", first])
			: lab("Creatinine", "2.6", "mg/dL", first, "high", ["2.4", baseline]),
		morning ? lab("eGFR", "23", "mL/min/1.73 m²", at("resolved"), "low", ["22", first]) : lab("eGFR", "22", "mL/min/1.73 m²", first, "low"),
		glucose,
		morning ? lab("WBC", "14.2", "K/µL", at("resolved"), "high", ["18.6", first]) : lab("WBC", "18.6", "K/µL", first, "high"),
		morning
			? lab("Potassium", "4.4", "mmol/L", at("resolved"), undefined, ["4.6", at("6h")])
			: reached("6h")
				? lab("Potassium", "4.6", "mmol/L", at("6h"), undefined, ["5.1", first])
				: lab("Potassium", "5.1", "mmol/L", first, "high"),
		morning ? lab("Bicarbonate", "20", "mmol/L", at("resolved"), "low", ["17", first]) : lab("Bicarbonate", "17", "mmol/L", first, "low"),
		morning ? lab("Hemoglobin", "10.6", "g/dL", at("resolved"), "low", ["11.2", first]) : lab("Hemoglobin", "11.2", "g/dL", first, "low"),
	];
}

/**
 * Rosa Medina's record at Scenario 3's first beat (Sidney ED, 15:30): BP 84/48 (MAP 60), HR 124, T 39.4 °C, RR 24,
 * SpO₂ 95% on room air, alert; lactate 3.8, urinalysis positive. The sepsis screen fires: probable septic shock, time
 * zero now. No fluids or antibiotics yet (they're the bundle). NEWS2 10 (High), up from 7 at triage, which was already
 * in the alert band, so it crossed then.
 */
const sampleScenario3BaseRecord = (): PatientRecord => ({
	id: "p23",
	planOfCare: samplePlanOfCare("p23"),
	clinicalStatus: sampleClinicalStatus("p23"),
	account: "B8837D8",
	weight: "68 kg",
	brief: {
		title: "Possible urosepsis, blood pressure falling",
		text: "Walked in 50 min ago with her daughter after 3 days of dysuria and left flank pain, with fevers and rigors since last night and vomiting this morning. Her pressure has fallen to 84/48 (MAP 60) with HR 124, T 39.4 °C and RR 24, SpO₂ 95% on room air, still alert. Lactate 3.8, WBC 18.6, and the urinalysis is positive for nitrite and leukocytes: probable septic shock from left pyelonephritis. No fluids or antibiotics yet. Type 2 diabetes with glucose 390, and CKD stage 4 (creatinine 2.6, eGFR 22), so every drug needs renal dosing and no CT contrast. Prefers Spanish. NEWS2 10 (High), up from 7 at triage.",
		sourceCount: 11,
		updatedAt: minutesAgo(0),
	},
	codeStatus: "Full code",
	allergies: ["Sulfonamides"],
	// On her list since a rash on trimethoprim-sulfamethoxazole for an earlier UTI (when, illustrative).
	allergyDetails: [{ substance: "Sulfonamides", reaction: "Rash", severity: "mild", verified: true, recordedAt: hoursAgo(24 * 400) }],
	diagnosis: "Septic shock from left pyelonephritis",
	problems: [
		"Type 2 diabetes, A1c 10.8% · on insulin",
		"CKD stage 4, eGFR 22 · baseline creatinine 2.4",
		"Hypertension",
		"Anemia of CKD",
	],
	admittedAt: minutesAgo(50),
	admittedFrom: "Walk-in, with her daughter",
	ventilator: charted("Room air", 5),
	earlyWarning: {
		score: "NEWS2",
		value: 10,
		band: "High",
		alertBand: "High",
		threshold: 7,
		updatedAt: minutesAgo(0),
		crossedAt: minutesAgo(50),
		trend: medinaScoreTrend("alert"),
		inputs: [
			{ label: "Respiratory rate", value: "24/min", points: 2 },
			{ label: "SpO₂", value: "95%", points: 1 },
			{ label: "Oxygen", value: "Room air", points: 0 },
			{ label: "Heart rate", value: "124 bpm", points: 2 },
			{ label: "Systolic BP", value: "84 mmHg", points: 3 },
			{ label: "Consciousness", value: "Alert", points: 0 },
			{ label: "Temperature", value: "39.4 °C", points: 2 },
		],
	},
	labs: medinaLabs("alert"),
	careTeam: medinaCareTeam,
});

/**
 * Rosa Medina's record at a later stage of Scenario 3, over her base record:
 * - `pressor` (about 1 h 15 min): 2,000 mL of LR given, lungs clear at each reassessment, MAP still 62, so peripheral
 *   norepinephrine, now 0.08: MAP 67. Repeat lactate 2.6. Insulin infusion at 3 units/h for glucose 390 → 312. NEWS2 3.
 * - `6h`: lactate 1.6, BP 112/60 on norepinephrine 0.04, glucose 172 on insulin 2 units/h. NEWS2 1.
 * - `resolved` (12 h, about 03:30): off norepinephrine for 1 h, BP 118/66, glucose 158 on the insulin infusion (2 units/h
 *   is illustrative; the scenario doesn't say), creatinine 2.5, E. coli in 2 of 2 blood cultures. Admitted to Sidney's
 *   inpatient unit under hub co-management. NEWS2 0.
 */
function sampleScenario3RecordAt(stage: Scenario3RecordStage): Partial<PatientRecord> {
	const earlyWarning = (value: number, band: string, inputs: PatientEarlyWarning["inputs"]): PatientEarlyWarning => ({
		score: "NEWS2",
		value,
		band,
		alertBand: "High",
		threshold: 7,
		updatedAt: minutesAgo(0),
		trend: medinaScoreTrend(stage),
		inputs,
	});
	const vitalsInputs = (rr: number, spo2: number, hr: [number, number], sbp: [number, number], temp: [number, number]) => [
		{ label: "Respiratory rate", value: `${rr}/min`, points: 0 },
		{ label: "SpO₂", value: `${spo2}%`, points: 0 },
		{ label: "Oxygen", value: "Room air", points: 0 },
		{ label: "Heart rate", value: `${hr[0]} bpm`, points: hr[1] },
		{ label: "Systolic BP", value: `${sbp[0]} mmHg`, points: sbp[1] },
		{ label: "Consciousness", value: "Alert", points: 0 },
		{ label: "Temperature", value: `${temp[0]} °C`, points: temp[1] },
	];
	const labs = medinaLabs(stage);

	switch (stage) {
		case "pressor":
			return {
				brief: {
					title: "Responding to the sepsis bundle",
					text: "Responding to the sepsis bundle. Blood cultures ×2 were drawn, then piperacillin-tazobactam 4.5 g IV, a full first dose, then 2.25 g every 6 h for CrCl about 27 mL/min. She had 2,000 mL of lactated Ringer's in four 500 mL boluses with her lungs clear at each reassessment, but MAP stayed at 62, so peripheral norepinephrine was started and is at 0.08 mcg/kg/min: BP 104/49 (MAP 67), HR 104, T 38.6 °C. Repeat lactate 2.6, from 3.8. Glucose 312, from 390, on an insulin infusion at 3 units/h. NEWS2 3 (Low), down from 10, but it doesn't count the norepinephrine holding her pressure.",
					sourceCount: 16,
					updatedAt: minutesAgo(0),
				},
				// NEWS2 scores what it sees: it has no input for vasopressors, so 3 here is on norepinephrine 0.08.
				earlyWarning: earlyWarning(3, "Low", vitalsInputs(20, 96, [104, 1], [104, 1], [38.6, 1])),
				labs,
				infusions: [
					{ drug: "Norepinephrine", rate: "0.08 mcg/kg/min", change: { direction: "up", from: "0.05", at: minutesAgo(1) }, updatedAt: minutesAgo(0) },
					{ drug: "Insulin, regular", rate: "3 units/h", updatedAt: minutesAgo(1) },
				],
			};
		case "6h":
			return {
				planOfCare: planOfCareWith("p23", { 0: "progressing" }, 10),
				clinicalStatus: clinicalStatusAt("improving", 10),
				brief: {
					title: "Bundle done, lactate cleared",
					text: "At 6 h the bundle is done and lactate has cleared to 1.6. BP 112/60 (MAP 77) on norepinephrine weaned to 0.04 mcg/kg/min, HR 96, RR 18, SpO₂ 97% on room air, T 37.8 °C. Glucose 172 on the insulin infusion, down to 2 units/h. Piperacillin-tazobactam continues at the renal dose. Still boarding in the ED. NEWS2 1 (Low).",
					sourceCount: 19,
					updatedAt: minutesAgo(0),
				},
				earlyWarning: earlyWarning(1, "Low", vitalsInputs(18, 97, [96, 1], [112, 0], [37.8, 0])),
				labs,
				infusions: [
					{ drug: "Norepinephrine", rate: "0.04 mcg/kg/min", change: { direction: "down", from: "0.08", at: minutesAgo(1) }, updatedAt: minutesAgo(0) },
					{ drug: "Insulin, regular", rate: "2 units/h", change: { direction: "down", from: "3", at: minutesAgo(1) }, updatedAt: minutesAgo(0) },
				],
			};
		case "resolved":
			return {
				planOfCare: planOfCareWith("p23", { 0: "met" }, 30),
				clinicalStatus: clinicalStatusAt("improving", 30),
				brief: {
					title: "Out of shock by morning",
					text: "Out of shock by morning: off norepinephrine for 1 h with BP 118/66 (MAP 83), HR 88, RR 16, SpO₂ 97% on room air, T 37.4 °C. Blood cultures grew gram-negative rods in 2 of 2 sets, E. coli, sensitivities pending; piperacillin-tazobactam continues at the renal dose. Creatinine 2.5, from 2.6, near her baseline of 2.4. Glucose 158 on the insulin infusion, with a move to basal-bolus insulin planned this morning. A bed opened, so she's admitted to Sidney's inpatient unit under hub co-management. NEWS2 0 (Low).",
					sourceCount: 23,
					updatedAt: minutesAgo(0),
				},
				earlyWarning: earlyWarning(0, "Low", vitalsInputs(16, 97, [88, 0], [118, 0], [37.4, 0])),
				labs,
				// Norepinephrine is off, so it isn't on the pump list.
				infusions: [{ drug: "Insulin, regular", rate: "2 units/h", updatedAt: minutesAgo(0) }],
				ventilator: charted("Room air", 0),
			};
	}
}

/* -------------------------------------------------------------------------- */
/* Scenario 4: Tyler Kessler                                                  */
/* -------------------------------------------------------------------------- */

// Scenario 4 (Demo Use Cases, "DKA caused by insulin rationing, managed by one night nurse"): Tyler Kessler, 60, type 1
// diabetes since 11, uninsured since Medicaid ended at redetermination in August. He came into Bridgeport's ED at 22:20
// and was admitted to its inpatient side; his labs cross the critical thresholds at 23:00, the scenario's first beat, so
// his record is built when it plays (its times read "just now") and isn't in `samplePatientBaseRecords`. Every value is
// illustrative until clinical review.
//
// The scenario's 14 h pass in a few beats, so each later stage's earlier points sit a couple of minutes apart, as Rosa
// Medina's do; the brief says the real times ("at 05:00").

type Scenario4RecordStage = "dextrose" | "closed";

/** The scenario's points in order: NEWS2 at each, from the vitals (`kesslerVitals` in `sample-monitoring.ts`). */
const kesslerScores: [stage: "triage" | "alert" | "early" | Scenario4RecordStage, news2: number][] = [
	["triage", 5],
	["alert", 7],
	["early", 4],
	["dextrose", 1],
	["closed", 0],
];

const kesslerIndex = (stage: (typeof kesslerScores)[number][0]) => kesslerScores.findIndex(([name]) => name === stage);

/** Minutes back from `stage` to the first beat (the alert), with the stages between two minutes apart. */
const kesslerAlertBack = (stage: "alert" | Scenario4RecordStage) => (kesslerIndex(stage) - 1) * 2;

/** His NEWS2 trend up to `stage`: triage 40 min before the alert, then each stage. */
function kesslerScoreTrend(stage: "alert" | Scenario4RecordStage): PatientEarlyWarning["trend"] {
	const last = kesslerIndex(stage);
	const alertBack = kesslerAlertBack(stage);
	return kesslerScores.slice(0, last + 1).map(([, value], index) => ({
		at: minutesAgo(index === 0 ? alertBack + 40 : (last - index) * 2),
		value,
	}));
}

/**
 * His key labs at each stage. The first draw (venous gas, BMP, beta-hydroxybutyrate) was at 22:40 and resulted as the
 * alert fired; baseline creatinine 0.9 is from April, with his A1c. Then the protocol's checks: the 05:00 BMP (glucose
 * 238, potassium 3.9, gap 17, bicarbonate 14) and the 12:00 one that closes the gap (164, 4.4, 11, 19, pH 7.34).
 * Illustrative where the scenario is silent: sodium 135 and creatinine 1.1 at 05:00, 137 and 0.9 at 12:00.
 */
function kesslerLabs(stage: "alert" | Scenario4RecordStage): PatientLab[] {
	const first = kesslerAlertBack(stage) + 1;
	const april = 210 * 24 * 60;
	const at = (point: Scenario4RecordStage) => kesslerAlertBack(stage) - kesslerAlertBack(point);
	if (stage === "closed") {
		return [
			lab("pH, venous", "7.34", "", at("closed"), "low", ["7.08", first]),
			lab("Bicarbonate", "19", "mmol/L", at("closed"), "low", ["18", at("closed") + 1]),
			lab("Anion gap", "11", "mmol/L", at("closed"), undefined, ["13", at("closed") + 1]),
			lab("Glucose", "164", "mg/dL", at("closed"), "high", ["172", at("closed") + 1]),
			lab("Potassium", "4.4", "mmol/L", at("closed"), undefined, ["4.3", at("closed") + 1]),
			lab("Creatinine", "0.9", "mg/dL", at("closed"), undefined, ["1.1", at("dextrose")]),
			lab("Sodium", "137", "mmol/L", at("closed"), undefined, ["135", at("dextrose")]),
		];
	}
	if (stage === "dextrose") {
		return [
			lab("Bicarbonate", "14", "mmol/L", at("dextrose"), "low", ["13", at("dextrose") + 1]),
			lab("Anion gap", "17", "mmol/L", at("dextrose"), "high", ["19", at("dextrose") + 1]),
			lab("Glucose", "238", "mg/dL", at("dextrose"), "high", ["296", at("dextrose") + 1]),
			lab("Potassium", "3.9", "mmol/L", at("dextrose"), undefined, ["3.6", at("dextrose") + 1]),
			lab("Creatinine", "1.1", "mg/dL", at("dextrose"), "high", ["1.4", first]),
			lab("Sodium", "135", "mmol/L", at("dextrose"), undefined, ["131", first]),
		];
	}
	return [
		lab("pH, venous", "7.08", "", first, "critical"),
		lab("Bicarbonate", "6", "mmol/L", first, "critical"),
		lab("Anion gap", "28", "mmol/L", first, "high"),
		lab("Glucose", "520", "mg/dL", first, "critical"),
		lab("Potassium", "5.6", "mmol/L", first, "high"),
		lab("Beta-hydroxybutyrate", "7.2", "mmol/L", first, "high"),
		lab("Creatinine", "1.4", "mg/dL", first, "high", ["0.9", april]),
		lab("Sodium", "131", "mmol/L", first, "low"),
	];
}

/** His NEWS2 inputs on room air and alert: RR, HR and systolic with their points, and temperature. */
const kesslerInputs = (rr: [number, number], hr: [number, number], sbp: [number, number], temp: number) => [
	{ label: "Respiratory rate", value: `${rr[0]}/min`, points: rr[1] },
	{ label: "SpO₂", value: "99%", points: 0 },
	{ label: "Oxygen", value: "Room air", points: 0 },
	{ label: "Heart rate", value: `${hr[0]} bpm`, points: hr[1] },
	{ label: "Systolic BP", value: `${sbp[0]} mmHg`, points: sbp[1] },
	{ label: "Consciousness", value: "Alert", points: 0 },
	{ label: "Temperature", value: `${temp} °C`, points: 0 },
];

/**
 * Tyler Kessler's record at Scenario 4's first beat (Bridgeport Med-Surg Bed 3, 23:00): venous pH 7.08, bicarbonate 6,
 * gap 28, glucose 520, potassium 5.6; RR 30 (Kussmaul), HR 122, BP 98/58, SpO₂ 99% on room air, alert. Severe DKA. The
 * ED's first liter of saline is in and the second is running; no insulin until the hub starts the DKA protocol. NEWS2 7
 * (High), up from 5 at triage, so it crossed now.
 */
const sampleScenario4BaseRecord = (): PatientRecord => ({
	id: "p24",
	planOfCare: samplePlanOfCare("p24"),
	clinicalStatus: sampleClinicalStatus("p24"),
	account: "0DD16F0",
	weight: "70 kg",
	brief: {
		title: "Ketoacidosis after rationing insulin",
		text: "Type 1 diabetes since age 11. He lost Medicaid in August and has been stretching his insulin; out of his glargine for 2 days and vomiting since yesterday. Came into the ED at 22:20 and was admitted to Med-Surg. Venous pH 7.08, bicarbonate 6, anion gap 28, beta-hydroxybutyrate 7.2 and glucose 520: severe DKA. Potassium 5.6 before any insulin, so it will fall once the drip starts. Breathing deep and fast at 30 (Kussmaul), HR 122, BP 98/58, SpO₂ 99% on room air, alert. Creatinine 1.4 from a baseline of 0.9. Second liter of saline running; no insulin yet, with the DKA pathway suggested. One RN on the inpatient side tonight. NEWS2 7 (High), up from 5 at triage.",
		sourceCount: 10,
		updatedAt: minutesAgo(0),
	},
	codeStatus: "Full code",
	allergies: [],
	diagnosis: "Severe diabetic ketoacidosis",
	problems: ["Type 1 diabetes, A1c 9.6% in April", "Acute kidney injury from dehydration · creatinine 1.4, baseline 0.9"],
	admittedAt: minutesAgo(40),
	admittedFrom: "Walked into Bridgeport's ED",
	ventilator: charted("Room air", 5),
	earlyWarning: {
		score: "NEWS2",
		value: 7,
		band: "High",
		alertBand: "High",
		threshold: 7,
		updatedAt: minutesAgo(0),
		crossedAt: minutesAgo(0),
		trend: kesslerScoreTrend("alert"),
		inputs: kesslerInputs([30, 3], [122, 2], [98, 2], 37.2),
	},
	// The ED's second liter; insulin starts with the protocol.
	infusions: [{ drug: "Normal saline", rate: "1,000 mL/h", updatedAt: minutesAgo(5) }],
	labs: kesslerLabs("alert"),
	careTeam: kesslerCareTeam,
});

/**
 * Tyler Kessler's record at a later stage of Scenario 4, over his base record:
 * - `dextrose` (05:00, hour 6): glucose 238, so D5 0.45% saline with KCl at 150 mL/h and insulin down to 3.5 units/h,
 *   signed on the intensivist's phone. Gap 17, bicarbonate 14. Potassium 3.1 at 03:00 held insulin for an hour. NEWS2 1.
 * - `closed` (hour 13 to 14): gap 11, bicarbonate 19, pH 7.34 at 12:00. Glargine at 12:12, lispro with lunch, the drip
 *   stopped at 13:00 after 14 h. The day nurse has the bedside; the night nurse is off shift. NEWS2 0.
 */
function sampleScenario4RecordAt(stage: Scenario4RecordStage): Partial<PatientRecord> {
	const earlyWarning = (value: number, inputs: PatientEarlyWarning["inputs"]): PatientEarlyWarning => ({
		score: "NEWS2",
		value,
		band: "Low",
		alertBand: "High",
		threshold: 7,
		updatedAt: minutesAgo(0),
		trend: kesslerScoreTrend(stage),
		inputs,
	});
	const labs = kesslerLabs(stage);

	switch (stage) {
		case "dextrose":
			return {
				planOfCare: planOfCareWith("p24", { 0: "progressing" }, 10),
				clinicalStatus: clinicalStatusAt("improving", 10),
				brief: {
					title: "DKA protocol, 6 hours in",
					text: "Six hours into the DKA protocol. Glucose 238, from 520, so dextrose is in (D5 0.45% saline with KCl 20 mEq/L at 150 mL/h) and insulin came down to 3.5 units/h (0.05 units/kg/h), signed on the intensivist's phone. Anion gap 17 and bicarbonate 14, closing. Potassium fell to 3.1 at 03:00, so insulin was held for an hour while KCl 20 mEq/h ran; it's 3.9 now. HR 96, BP 116/70, RR 20, SpO₂ 99% on room air, alert. Every hourly check on time so far, with one RN on the floor. NEWS2 1 (Low).",
					sourceCount: 17,
					updatedAt: minutesAgo(0),
				},
				earlyWarning: earlyWarning(1, kesslerInputs([20, 0], [96, 1], [116, 0], 36.9)),
				labs,
				infusions: [
					{ drug: "Insulin, regular", rate: "3.5 units/h", change: { direction: "down", from: "8", at: minutesAgo(1) }, updatedAt: minutesAgo(0) },
					{ drug: "D5 0.45% saline + KCl 20 mEq/L", rate: "150 mL/h", updatedAt: minutesAgo(1) },
				],
			};
		case "closed":
			return {
				planOfCare: planOfCareWith("p24", { 0: "met" }, 10),
				clinicalStatus: clinicalStatusAt("improving", 10),
				brief: {
					title: "Anion gap closed, back on home insulin",
					text: "The anion gap closed at hour 13 (12:00): gap 11, bicarbonate 19, pH 7.34, glucose 164. He ate lunch. Glargine 22 units SC, his home dose, at 12:12 and lispro 6 units with the meal; the drip ran 1 h more and stopped at 13:00, after 14 h. One low potassium (3.1 at 03:00), caught by the protocol with insulin held; no hypoglycemia. Creatinine 0.9, back to his baseline. HR 82, BP 122/76, RR 16, SpO₂ 99% on room air. The APP's admission note records cost-related insulin rationing after he lost Medicaid in August. Staying at Bridgeport, with referrals to send at discharge. NEWS2 0 (Low).",
					sourceCount: 26,
					updatedAt: minutesAgo(0),
				},
				earlyWarning: earlyWarning(0, kesslerInputs([16, 0], [82, 0], [122, 0], 36.8)),
				labs,
				// The drip and its dextrose stopped at 13:00, so nothing is on the pumps.
				infusions: [],
				careTeam: [
					{ role: "Bedside nurse", name: "Hannah Price", initials: "HP", tone: 8, organization: "Bridgeport Valley", presence: "online" },
					{ role: "Night nurse", name: "Brittany Cole", initials: "BC", tone: 6, organization: "Bridgeport Valley", presence: "offline" },
					...kesslerCareTeam.filter((member) => member.organization !== "Bridgeport Valley" || member.name === "Derek Lawson"),
				],
			};
	}
}

export {
	samplePatientBaseRecords,
	sampleScenario1Record,
	sampleScenario1ResolvedRecord,
	sampleScenario2BaseRecord,
	sampleScenario2ResolvedRecord,
	sampleScenario3BaseRecord,
	sampleScenario3RecordAt,
	sampleScenario4BaseRecord,
	sampleScenario4RecordAt,
	sampleScenarioCareTeams,
	type Scenario4RecordStage,
};
