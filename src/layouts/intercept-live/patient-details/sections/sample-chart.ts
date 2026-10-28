import { samplePatients } from "../../census/sample-census";
import type { PatientRecord } from "../patient-details";
import { samplePatientBaseRecords } from "../sample-patient-records";
import type { ChartCulture, ChartHomeMedication, ChartImagingReport, ChartProblem, ChartResult, ChartResultPanel, PatientChart } from "./chart-section";

// Synthetic data (PRD Patient details PD-150): every Census patient's record at their hospital. Each chart is built
// from the patient's base record (`sample-patient-records.ts`), so its results hold their key labs with the same values
// and times, its problems start with their diagnosis, and its allergies match the Patient Header. A short spec per
// patient adds the rest: history, home medications, more results, cultures and reports. Sarah Miller (`p1`) is the
// reference: her last ABG and the labs in her sepsis story (lactate 4.1 up from 2.2, cultures before antibiotics).

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
const hoursAgo = (hours: number) => minutesAgo(hours * 60);
/** "Oct 26": the day `hours` ago, for problem onsets. */
const dayAgo = (hours: number) =>
	new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(Date.now() - hours * 3_600_000);

/* -------------------------------------------------------------------------- */
/* Reference ranges (one hospital lab's, shared so flags never contradict)    */
/* -------------------------------------------------------------------------- */

type Panel = "Chemistry" | "Hematology" | "Blood gases" | "Coagulation" | "Cardiac" | "Other";
type Reference = { unit?: string; range: string | { F: string; M: string }; panel: Panel };

const references: Record<string, Reference> = {
	Lactate: { unit: "mmol/L", range: "0.5–2.0", panel: "Chemistry" },
	"Lactate (repeat)": { unit: "mmol/L", range: "0.5–2.0", panel: "Chemistry" },
	Sodium: { unit: "mmol/L", range: "135–145", panel: "Chemistry" },
	Potassium: { unit: "mmol/L", range: "3.5–5.0", panel: "Chemistry" },
	Bicarbonate: { unit: "mmol/L", range: "22–29", panel: "Chemistry" },
	BUN: { unit: "mg/dL", range: "7–20", panel: "Chemistry" },
	Creatinine: { unit: "mg/dL", range: { F: "0.5–1.0", M: "0.7–1.1" }, panel: "Chemistry" },
	Glucose: { unit: "mg/dL", range: "70–140", panel: "Chemistry" },
	Magnesium: { unit: "mg/dL", range: "1.8–2.4", panel: "Chemistry" },
	Albumin: { unit: "g/dL", range: "3.5–5.0", panel: "Chemistry" },
	AST: { unit: "U/L", range: "10–40", panel: "Chemistry" },
	ALT: { unit: "U/L", range: "7–56", panel: "Chemistry" },
	LDH: { unit: "U/L", range: "120–250", panel: "Chemistry" },
	CK: { unit: "U/L", range: "30–170", panel: "Chemistry" },
	CRP: { unit: "mg/L", range: "Under 10", panel: "Chemistry" },
	Bilirubin: { unit: "mg/dL", range: "0.1–1.2", panel: "Chemistry" },
	Procalcitonin: { unit: "ng/mL", range: "Under 0.25", panel: "Chemistry" },
	WBC: { unit: "K/µL", range: "4.5–11.0", panel: "Hematology" },
	Neutrophils: { unit: "%", range: "40–70", panel: "Hematology" },
	Hemoglobin: { unit: "g/dL", range: { F: "12.0–15.5", M: "12.0–17.0" }, panel: "Hematology" },
	Platelets: { unit: "K/µL", range: "150–400", panel: "Hematology" },
	pH: { range: "7.35–7.45", panel: "Blood gases" },
	"PaCO₂": { unit: "mmHg", range: "35–45", panel: "Blood gases" },
	"PaO₂": { unit: "mmHg", range: "80–100", panel: "Blood gases" },
	"HCO₃": { unit: "mmol/L", range: "22–26", panel: "Blood gases" },
	INR: { range: "0.9–1.2", panel: "Coagulation" },
	aPTT: { unit: "s", range: "25–35", panel: "Coagulation" },
	Fibrinogen: { unit: "mg/dL", range: "200–400", panel: "Coagulation" },
	"Anti-Xa": { unit: "units/mL", range: "0.3–0.7", panel: "Coagulation" },
	"NT-proBNP": { unit: "pg/mL", range: "Under 450", panel: "Cardiac" },
	"Troponin I": { unit: "ng/mL", range: "Under 0.04", panel: "Cardiac" },
	"Hemoglobin A1c": { unit: "%", range: "4.0–5.6", panel: "Other" },
	TSH: { unit: "mIU/L", range: "0.4–4.0", panel: "Other" },
};

const panelOrder: Panel[] = ["Chemistry", "Hematology", "Blood gases", "Coagulation", "Cardiac", "Other"];

const number = (value: string) => Number.parseFloat(value.replace(/,/g, ""));

/** The flag a value earns against its range ("3.5–5.0" or "Under 450"). */
function flagFor(value: string, range: string): ChartResult["flag"] {
	const under = range.match(/^Under ([\d.,]+)/);
	if (under) return number(value) > number(under[1]) ? "high" : undefined;
	const [low, high] = range.split("–").map(number);
	return number(value) < low ? "low" : number(value) > high ? "high" : undefined;
}

/* -------------------------------------------------------------------------- */
/* Builders                                                                   */
/* -------------------------------------------------------------------------- */

/** A result beyond the key labs: value (null when there's none), and when; flag from the range. */
type ExtraResult = [
	name: string,
	value: string | null,
	options?: { minutes?: number; previous?: [value: string, minutes: number]; status?: ChartResult["status"]; original?: string },
];

type ChartSpec = {
	/** Onset of each of the record's problems, in its order: hours ago, or a year or month. */
	onsets: (number | string)[];
	/** Problems the record's short list leaves out. */
	moreProblems?: [name: string, onset: number | string][];
	resolved?: [name: string, when: string][];
	medical: string[];
	surgical: string[];
	social: string[];
	home: [name: string, dose: string, inpatient?: ChartHomeMedication["inpatient"]][];
	extras: ExtraResult[];
	/** The ABG before the last one, for its previous values. */
	abgBefore?: [values: string, hours: number];
	/** Ranges this patient reads against instead, e.g. a therapeutic magnesium level. */
	ranges?: Record<string, string>;
	cultures: ChartCulture[];
	imaging: ChartImagingReport[];
};

const culture = (
	specimen: string,
	collectedHours: number,
	status: ChartCulture["status"],
	summary: string,
	more: Partial<ChartCulture> & { updatedHours?: number } = {},
): ChartCulture => {
	const { updatedHours, ...rest } = more;
	return {
		specimen,
		collectedAt: hoursAgo(collectedHours),
		status,
		summary,
		updatedAt: updatedHours === undefined ? undefined : hoursAgo(updatedHours),
		...rest,
	};
};

const radiologists = {
	"Harbor Point General": "Alan Reyes, MD, Radiology",
	"Mercy West Hospital": "Owen Mitchell, MD, Radiology",
	CVMC: "Farah Haddad, MD, Radiology",
} as Record<string, string>;

const report = (
	study: string,
	hours: number,
	impression: string,
	findings: string,
	readBy: string,
	status: ChartImagingReport["status"] = "final",
): ChartImagingReport => ({ study, performedAt: hoursAgo(hours), status, impression, findings, readBy });

/** "pH 7.29 · PaCO₂ 46 · …" as name and value pairs. */
const abgValues = (values: string) =>
	values.split(" · ").map((part) => {
		const [name, value] = part.split(" ");
		return { name, value };
	});

function buildChart(record: PatientRecord, spec: ChartSpec): PatientChart {
	const patient = samplePatients.find((item) => item.id === record.id);
	const sex = patient?.sex === "M" ? "M" : "F";
	const rangeOf = (name: string) => {
		const reference = references[name];
		if (spec.ranges?.[name]) return spec.ranges[name];
		if (!reference) return undefined;
		return typeof reference.range === "string" ? reference.range : reference.range[sex];
	};
	const attending = record.careTeam?.find((member) => member.role === "Attending of record")?.name;
	const notedBy = attending ? `${attending}, MD` : undefined;
	const onset = (value: number | string) => (typeof value === "number" ? dayAgo(value) : value);
	const labs = record.labs ?? [];
	// Most of the key labs come from one morning draw; the extras result with it.
	const morning = labs.find((lab) => lab.name === "Creatinine" || lab.name === "Hemoglobin")?.resultedAt ?? labs[0]?.resultedAt ?? minutesAgo(120);

	const results: (ChartResult & { panel: Panel })[] = [
		...labs.map((lab) => ({
			name: lab.name,
			value: lab.value,
			unit: lab.unit || references[lab.name]?.unit,
			range: rangeOf(lab.name),
			flag: lab.flag,
			status: lab.value === undefined ? ("pending" as const) : undefined,
			resultedAt: lab.resultedAt,
			collectedAt: lab.collectedAt,
			previous: lab.previous,
			panel: references[lab.name]?.panel ?? "Other",
		})),
		...spec.extras.map(([name, value, options = {}]) => {
			const range = rangeOf(name);
			return {
				name,
				value: value ?? undefined,
				unit: references[name]?.unit,
				range,
				flag: value !== null && range ? flagFor(value, range) : undefined,
				status: options.status,
				original: options.original,
				resultedAt: value === null ? undefined : options.minutes === undefined ? morning : minutesAgo(options.minutes),
				previous: options.previous ? { value: options.previous[0], at: minutesAgo(options.previous[1]) } : undefined,
				panel: references[name]?.panel ?? "Other",
			};
		}),
	];

	const abg = record.ventilator?.abg;
	if (abg) {
		const before = spec.abgBefore ? abgValues(spec.abgBefore[0]) : [];
		for (const { name, value } of abgValues(abg.values)) {
			const range = rangeOf(name);
			const previous = before.find((item) => item.name === name);
			results.push({
				name,
				value,
				unit: references[name]?.unit,
				range,
				flag: range ? flagFor(value, range) : undefined,
				resultedAt: abg.collectedAt,
				previous: previous && spec.abgBefore ? { value: previous.value, at: hoursAgo(spec.abgBefore[1]) } : undefined,
				panel: "Blood gases",
			});
		}
	}

	const panels: ChartResultPanel[] = panelOrder
		.map((panel) => ({
			name: panel,
			results: results.filter((result) => result.panel === panel).map(({ panel: _panel, ...result }) => result),
		}))
		.filter((panel) => panel.results.length);

	const problems: ChartProblem[] = [
		...(record.diagnosis ? [{ name: record.diagnosis, status: "active" as const, onset: dayAgo(record.admittedAt ? (Date.now() - Date.parse(record.admittedAt)) / 3_600_000 : 0), notedBy }] : []),
		...(record.problems ?? []).map((name, index) => ({
			name,
			status: "active" as const,
			onset: spec.onsets[index] === undefined ? undefined : onset(spec.onsets[index]),
			notedBy: typeof spec.onsets[index] === "number" ? notedBy : undefined,
		})),
		...(spec.moreProblems ?? []).map(([name, when]) => ({ name, status: "active" as const, onset: onset(when), notedBy })),
		...(spec.resolved ?? []).map(([name, when]) => ({ name, status: "resolved" as const, onset: when })),
	];

	const updatedAt = results.reduce<string>(
		(latest, result) => (result.resultedAt && result.resultedAt > latest ? result.resultedAt : latest),
		hoursAgo(24),
	);

	return {
		source: "Epic",
		updatedAt,
		problems,
		allergies: (record.allergies ?? []).map((substance) => ({ substance, ...allergyDetails[substance] })),
		medicalHistory: spec.medical.map((item) => {
			const [name, detail] = item.split(" · ");
			return { name, detail };
		}),
		surgicalHistory: spec.surgical.map((item) => {
			const [name, detail] = item.split(" · ");
			return { name, detail };
		}),
		socialHistory: spec.social,
		homeMedications: spec.home.map(([name, dose, inpatient]) => ({ name, dose, inpatient })),
		panels,
		cultures: spec.cultures,
		imaging: spec.imaging,
	};
}

const allergyDetails: Record<string, { reaction: string; severity: "mild" | "moderate" | "severe" }> = {
	Penicillin: { reaction: "Rash, hives", severity: "moderate" },
	"Sulfa drugs": { reaction: "Rash", severity: "mild" },
	"Iodinated contrast": { reaction: "Hives", severity: "moderate" },
	Latex: { reaction: "Contact dermatitis", severity: "mild" },
	Codeine: { reaction: "Nausea and vomiting", severity: "mild" },
	Morphine: { reaction: "Itching, hives", severity: "moderate" },
	Shellfish: { reaction: "Anaphylaxis", severity: "severe" },
};

/* -------------------------------------------------------------------------- */
/* Patients                                                                   */
/* -------------------------------------------------------------------------- */

const hpg = radiologists["Harbor Point General"];
const mwh = radiologists["Mercy West Hospital"];
const cvmc = radiologists.CVMC;
const day = 1520;

const chartSpecs: Record<string, ChartSpec> = {
	// Sarah Miller: cultures ×2 drawn just before vancomycin and aztreonam went in, 30 min ago.
	p1: {
		onsets: [30, 26, "2019"],
		moreProblems: [["Community-acquired pneumonia, right lower lobe", 55], ["Hypokalemia", 2]],
		resolved: [["Gestational diabetes", "2014"]],
		medical: ["Type 2 diabetes · A1c 8.1% in August", "Hypertension", "Mild intermittent asthma · childhood"],
		surgical: ["Laparoscopic cholecystectomy · 2016", "Cesarean section · 2014"],
		social: ["Never smoker", "Alcohol socially", "Lives with husband and two children", "Teacher"],
		home: [
			["Metformin", "1,000 mg by mouth twice a day", "held"],
			["Lisinopril", "10 mg by mouth daily", "held"],
			["Atorvastatin", "20 mg by mouth at bedtime", "continued"],
			["Albuterol inhaler", "2 puffs as needed for wheeze", "changed"],
		],
		extras: [
			["Sodium", "136", { previous: ["138", day] }],
			["Bicarbonate", "19", { previous: ["21", day] }],
			["BUN", "38", { previous: ["29", day] }],
			["Glucose", "212", { previous: ["186", day] }],
			["Magnesium", "1.8", { minutes: 80, previous: ["1.9", day], status: "corrected", original: "1.4 (hemolyzed sample)" }],
			["Neutrophils", "88", { previous: ["84", day] }],
			["Platelets", "142", { previous: ["168", day] }],
			["INR", null, { status: "none", previous: ["1.3", 2880] }],
			["aPTT", null, { status: "none", previous: ["33", 2880] }],
			["Fibrinogen", "512"],
		],
		abgBefore: ["pH 7.33 · PaCO₂ 42 · PaO₂ 68 · HCO₃ 21", 9],
		cultures: [
			culture("Blood culture, set 1 (left arm)", 40 / 60, "pending", "Received in the lab. First read at 24 hours."),
			culture("Blood culture, set 2 (right IJ line)", 38 / 60, "pending", "Received in the lab. First read at 24 hours."),
			culture("Sputum culture (endotracheal aspirate)", 50, "preliminary", "Gram-positive cocci in clusters, moderate growth. Identification and susceptibilities to follow.", { updatedHours: 8 }),
			culture("Blood cultures ×2 (admission)", 55, "no-growth", "No growth at 48 hours.", { updatedHours: 7 }),
			culture("MRSA nares PCR", 54, "final", "Positive for MRSA colonization.", {
				organism: "Staphylococcus aureus, methicillin-resistant",
				susceptibilities: [
					{ antibiotic: "Vancomycin", result: "S" },
					{ antibiotic: "Linezolid", result: "S" },
					{ antibiotic: "Oxacillin", result: "R" },
				],
				updatedHours: 30,
			}),
		],
		imaging: [
			report(
				"Chest X-ray, portable",
				6,
				"Worse bilateral airspace opacities, most in the right lower lobe, consistent with ARDS and pneumonia.",
				"Endotracheal tube 4 cm above the carina. Right internal jugular line with its tip at the cavoatrial junction. Orogastric tube below the diaphragm. Bilateral patchy airspace opacities, worse than yesterday, densest in the right lower lobe. Small right pleural effusion. No pneumothorax.",
				hpg,
			),
			report(
				"Chest X-ray, portable (after intubation)",
				51,
				"Endotracheal tube in good position. Right lower lobe consolidation.",
				"Endotracheal tube 5 cm above the carina. Right lower lobe consolidation with air bronchograms. Left lung clear. No effusion or pneumothorax.",
				hpg,
			),
		],
	},
	p2: {
		onsets: [40, "2012", "2016"],
		medical: ["Obesity · BMI 34", "Hypertension", "Gout"],
		surgical: ["Right knee arthroscopy · 2010"],
		social: ["Former smoker, 10 pack-years", "Drinks rarely", "Lives with his wife", "Truck dispatcher"],
		home: [
			["Amlodipine", "10 mg by mouth daily", "held"],
			["Allopurinol", "300 mg by mouth daily", "continued"],
		],
		extras: [["Sodium", "141"], ["Bicarbonate", "25"], ["Glucose", "168"], ["Platelets", "162"], ["INR", "1.1"]],
		abgBefore: ["pH 7.30 · PaCO₂ 54 · PaO₂ 70 · HCO₃ 25", 6],
		cultures: [
			culture("Respiratory viral PCR", 40, "final", "Influenza A detected.", { updatedHours: 37 }),
			culture("Sputum culture (endotracheal aspirate)", 37, "final", "Normal respiratory flora. No Staphylococcus aureus or Pseudomonas.", { updatedHours: 6 }),
			culture("Blood cultures ×2 (admission)", 40, "no-growth", "No growth at 24 hours.", { updatedHours: 15 }),
		],
		imaging: [
			report("Chest X-ray, portable", 8, "Diffuse bilateral opacities, unchanged from yesterday.", "Endotracheal tube 4 cm above the carina. Left internal jugular line tip in the superior vena cava. Diffuse bilateral airspace opacities, no larger than yesterday. No pneumothorax.", mwh),
		],
	},
	p3: {
		onsets: [110, "2020", "2019"],
		medical: ["Atrial fibrillation · on apixaban", "Chronic kidney disease, stage 3", "Recurrent urinary tract infections", "Osteoporosis"],
		surgical: ["Hysterectomy · 2004", "Right hip replacement · 2021"],
		social: ["Never smoker", "No alcohol", "Widowed, lives alone", "Daughter is her healthcare proxy"],
		home: [
			["Apixaban", "5 mg by mouth twice a day", "held"],
			["Metoprolol tartrate", "25 mg by mouth twice a day", "held"],
			["Alendronate", "70 mg by mouth weekly", "held"],
		],
		extras: [["Sodium", "139"], ["Bicarbonate", "21"], ["Glucose", "128"], ["Platelets", "118"], ["INR", "1.4"]],
		cultures: [
			culture("Blood cultures ×2 (admission)", 116, "final", "Grew in both sets.", {
				organism: "Escherichia coli",
				susceptibilities: [
					{ antibiotic: "Ceftriaxone", result: "S" },
					{ antibiotic: "Piperacillin-tazobactam", result: "S" },
					{ antibiotic: "Ciprofloxacin", result: "R" },
					{ antibiotic: "TMP-SMX", result: "R" },
				],
				updatedHours: 70,
			}),
			culture("Urine culture", 116, "final", "Over 100,000 CFU/mL.", { organism: "Escherichia coli", updatedHours: 92 }),
			culture("Blood cultures ×2 (repeat)", 72, "no-growth", "No growth at 48 hours.", { updatedHours: 24 }),
		],
		imaging: [
			report("CT abdomen and pelvis, without contrast", 114, "Left pyelonephritis. No abscess or obstruction.", "Mild left perinephric stranding with a swollen left kidney. No hydronephrosis or stone. No abscess. Bladder decompressed around a Foley catheter.", cvmc),
		],
	},
	p4: {
		onsets: ["2023", "2018", "2009"],
		medical: ["Coronary artery disease · LAD stent 2019", "Ischemic cardiomyopathy", "Type 2 diabetes", "Hyperlipidemia"],
		surgical: ["PCI to the circumflex · this admission", "PCI to the LAD · 2019"],
		social: ["Former smoker, quit 2015", "No alcohol", "Lives with his wife", "Retired machinist"],
		home: [
			["Metformin", "500 mg by mouth twice a day", "held"],
			["Atorvastatin", "80 mg by mouth at bedtime", "continued"],
			["Metoprolol succinate", "50 mg by mouth daily", "held"],
			["Aspirin", "81 mg by mouth daily", "continued"],
		],
		extras: [["Sodium", "133"], ["Bicarbonate", "22"], ["Glucose", "176"], ["Platelets", "188"], ["aPTT", "68"]],
		cultures: [culture("MRSA nares PCR", 74, "final", "Negative.", { updatedHours: 60 })],
		imaging: [
			report("Echocardiogram, transthoracic", 30, "EF 20 to 25% with anterior and apical akinesis. Moderate mitral regurgitation.", "Severely reduced left ventricular function. Akinetic anterior wall and apex, no thrombus seen. Moderate functional mitral regurgitation. Right ventricle mildly reduced.", "Kofi Mensah, MD, Cardiology"),
			report("Chest X-ray, portable", 6, "Mild pulmonary vascular congestion. Small bilateral effusions.", "Enlarged cardiac silhouette. Mild vascular congestion. Small bilateral pleural effusions. Right internal jugular line tip in the superior vena cava.", cvmc),
		],
	},
	p5: {
		onsets: ["2005", "2018"],
		medical: ["Severe persistent asthma · two ICU stays, intubated once in 2019", "Anxiety disorder", "Eczema"],
		surgical: ["Tonsillectomy · 2003"],
		social: ["Never smoker", "Vaped occasionally, stopped in June", "Lives with a roommate", "Graduate student"],
		home: [
			["Budesonide-formoterol", "160/4.5, 2 puffs twice a day", "changed"],
			["Albuterol inhaler", "2 puffs as needed", "changed"],
			["Montelukast", "10 mg by mouth at bedtime", "continued"],
			["Sertraline", "50 mg by mouth daily", "continued"],
		],
		extras: [["Sodium", "138"], ["Bicarbonate", "25"], ["Glucose", "158"], ["Platelets", "312"]],
		abgBefore: ["pH 7.26 · PaCO₂ 61 · PaO₂ 70 · HCO₃ 26", 14],
		cultures: [culture("Respiratory viral PCR", 20, "final", "Rhinovirus/enterovirus detected.", { updatedHours: 16 })],
		imaging: [report("Chest X-ray, portable", 19, "Hyperinflated lungs. No pneumothorax or pneumonia.", "Hyperinflated lungs with flattened diaphragms. No consolidation, effusion or pneumothorax.", hpg)],
	},
	p6: {
		onsets: [40, 30, "2017"],
		medical: ["Parkinson's disease", "Benign prostatic hyperplasia", "Mild cognitive impairment"],
		surgical: ["Left hip hemiarthroplasty · post-op day 2", "Cataract surgery · 2018"],
		social: ["Former smoker", "No alcohol", "Lives with his son", "Walks with a cane at home"],
		home: [
			["Carbidopa-levodopa", "25/100 mg by mouth three times a day", "continued"],
			["Tamsulosin", "0.4 mg by mouth at bedtime", "continued"],
		],
		extras: [["Bicarbonate", "24"], ["Glucose", "112"], ["Platelets", "174"], ["Albumin", "3.0"]],
		cultures: [culture("Urine culture", 30, "final", "No growth.", { updatedHours: 8 })],
		imaging: [
			report("CT head, without contrast", 10, "No acute intracranial abnormality.", "No hemorrhage, mass or acute infarct. Chronic small-vessel changes and age-appropriate volume loss.", cvmc),
			report("X-ray, left hip", 46, "Left hip hemiarthroplasty in good position.", "Cemented left hip hemiarthroplasty, well seated. No periprosthetic fracture.", cvmc),
		],
	},
	p7: {
		onsets: [30, "2014"],
		medical: ["Hypothyroidism", "Diverticulitis · 2022, treated without surgery"],
		surgical: ["Hartmann's procedure · post-op day 3", "Appendectomy · 1995"],
		social: ["Never smoker", "Alcohol socially", "Married", "Accountant"],
		home: [["Levothyroxine", "100 mcg by mouth daily", "continued"]],
		extras: [["Sodium", "139"], ["Bicarbonate", "24"], ["Glucose", "118"], ["Platelets", "286"], ["Albumin", "2.9"]],
		cultures: [
			culture("Wound swab, midline incision", 50, "final", "Moderate growth.", {
				organism: "Staphylococcus aureus, methicillin-resistant",
				susceptibilities: [
					{ antibiotic: "Vancomycin", result: "S" },
					{ antibiotic: "Doxycycline", result: "S" },
					{ antibiotic: "Oxacillin", result: "R" },
				],
				updatedHours: 30,
			}),
			culture("Peritoneal fluid culture", 82, "final", "Mixed enteric flora.", { organism: "Escherichia coli and Bacteroides fragilis", updatedHours: 40 }),
			culture("Blood cultures ×2 (admission)", 84, "final", "No growth at 5 days.", { updatedHours: 2 }),
		],
		imaging: [report("CT abdomen and pelvis, with contrast", 85, "Perforated sigmoid diverticulitis with free air and a pelvic fluid collection.", "Sigmoid wall thickening with surrounding inflammation and extraluminal gas. 4 cm pelvic fluid collection. Free air under the diaphragm.", mwh)],
	},
	p8: {
		onsets: ["2015", "2017"],
		medical: ["Alcohol use disorder", "Hypertension", "Gastroesophageal reflux"],
		surgical: [],
		social: ["Drinks 6 to 8 beers a day, last drink 2 days ago", "Smokes a pack a day", "Lives alone", "Construction foreman"],
		home: [
			["Lisinopril", "20 mg by mouth daily", "held"],
			["Omeprazole", "20 mg by mouth daily", "changed"],
		],
		extras: [["Sodium", "136"], ["Bicarbonate", "23"], ["Glucose", "104"], ["Platelets", "132"], ["AST", "68"], ["ALT", "54"]],
		cultures: [culture("Helicobacter pylori, gastric biopsy", 22, "final", "Positive.", { updatedHours: 4 })],
		imaging: [report("Upper endoscopy", 22, "Bleeding duodenal ulcer, treated with two clips and epinephrine.", "Duodenal bulb ulcer, 12 mm, with a visible vessel. Two clips placed and epinephrine injected. No active bleeding at the end. Mild gastritis; biopsies taken.", "Rafael Soto, MD, Gastroenterology")],
	},
	p9: {
		onsets: ["2012", "2024", "2020"],
		medical: ["COPD", "Stroke · 2024, left-sided weakness", "Atrial fibrillation", "Hypertension"],
		surgical: ["Carotid endarterectomy · 2024"],
		social: ["Former smoker, 40 pack-years", "Lives in a nursing facility since the stroke", "His wife visits daily"],
		home: [
			["Apixaban", "5 mg twice a day by feeding tube", "held"],
			["Tiotropium", "1 inhalation daily", "changed"],
			["Metoprolol tartrate", "25 mg twice a day", "held"],
		],
		extras: [["Sodium", "140"], ["Bicarbonate", "26"], ["Glucose", "132"], ["Platelets", "214"], ["INR", null, { status: "none", previous: ["1.3", 2880] }]],
		cultures: [
			culture("Blood cultures ×2", 1, "pending", "Received in the lab. First read at 24 hours."),
			culture("Sputum culture (endotracheal aspirate)", 25, "preliminary", "Gram-negative rods, many. Identification to follow.", { updatedHours: 5 }),
			culture("Blood cultures ×2 (admission)", 28, "no-growth", "No growth at 24 hours.", { updatedHours: 4 }),
		],
		imaging: [report("Chest X-ray, portable", 7, "Right lower lobe consolidation, larger than on admission.", "Endotracheal tube 5 cm above the carina. Right lower lobe consolidation, larger than on admission. Hyperinflated lungs. No pneumothorax.", hpg)],
	},
	p10: {
		onsets: ["2019", "2004", "2020"],
		medical: ["End-stage kidney disease · hemodialysis Monday, Wednesday, Friday", "Type 2 diabetes", "Peripheral artery disease", "Hypertension"],
		surgical: ["Debridement, left thigh · yesterday", "Left arm fistula · 2019", "Right femoral-popliteal bypass · 2021"],
		social: ["Never smoker", "No alcohol", "Lives with her husband", "Retired"],
		home: [
			["Insulin glargine", "20 units at bedtime", "changed"],
			["Sevelamer", "800 mg by mouth with meals", "held"],
			["Clopidogrel", "75 mg by mouth daily", "continued"],
		],
		extras: [["Sodium", "134"], ["Bicarbonate", "20"], ["Glucose", "214"], ["Bilirubin", "0.9"], ["Platelets", "168"], ["INR", "1.3"]],
		cultures: [
			culture("Tissue culture, left thigh", 24, "preliminary", "Heavy growth. Susceptibilities to follow.", { organism: "Streptococcus pyogenes (group A)", updatedHours: 6 }),
			culture("Blood cultures ×2", 27, "preliminary", "Gram-positive cocci in chains in 1 of 2 sets.", { updatedHours: 12 }),
		],
		imaging: [report("CT left thigh, without contrast", 30, "Gas along the fascia of the left thigh, consistent with necrotizing infection.", "Soft tissue gas tracking along the fascial planes of the anterior left thigh with surrounding edema. No drainable collection.", hpg)],
	},
	p11: {
		onsets: [31, "July"],
		ranges: { Magnesium: "4.8–8.4 on infusion" },
		medical: ["Gestational diabetes · this pregnancy", "Migraine"],
		surgical: ["Cesarean delivery · post-op day 1"],
		social: ["Never smoker", "No alcohol in pregnancy", "Married", "Her son is in the well-baby nursery"],
		home: [
			["Prenatal vitamin", "1 tablet by mouth daily", "continued"],
			["Insulin aspart", "Sliding scale with meals", "held"],
		],
		extras: [["Sodium", "137"], ["Bicarbonate", "22"], ["Glucose", "124"], ["ALT", "98"], ["Fibrinogen", "410"], ["INR", "1.0"]],
		cultures: [culture("Respiratory viral PCR", 30, "final", "Influenza B detected.", { updatedHours: 27 })],
		imaging: [],
	},
	p12: {
		onsets: ["2016", 45, "1998"],
		medical: ["Atrial fibrillation · not anticoagulated after a fall in 2023", "Hypertension", "Osteoarthritis"],
		surgical: ["Thrombectomy, right MCA · 2 days ago", "Left knee replacement · 2009"],
		social: ["Never smoker", "Lives at home with her daughter", "Advance directive on file"],
		home: [
			["Amlodipine", "5 mg by mouth daily", "held"],
			["Acetaminophen", "650 mg by mouth as needed", "continued"],
		],
		extras: [["Bicarbonate", "25"], ["Platelets", "201"], ["INR", "1.0"], ["Hemoglobin A1c", "6.8"]],
		cultures: [culture("Urine culture", 24, "no-growth", "No growth at 24 hours.", { updatedHours: 2 })],
		imaging: [
			report("CT head, without contrast", 20, "Evolving right MCA infarct without hemorrhage. No midline shift.", "Hypodensity in the right frontal and temporal lobes and insula, as expected after the stroke. No hemorrhage. No mass effect.", hpg),
			report("CT angiography, head and neck", 50, "Occlusion of the right M1 segment.", "Abrupt occlusion of the right middle cerebral artery's M1 segment. Carotids patent without significant narrowing.", hpg),
		],
	},
	p13: {
		onsets: [99, 50, "2015"],
		medical: ["Hyperlipidemia"],
		surgical: ["PCI to the proximal LAD · this admission", "VA-ECMO cannulation, right femoral · this admission"],
		social: ["Former smoker, quit 2020", "Alcohol socially", "Married, two adult sons", "Electrician"],
		home: [["Atorvastatin", "40 mg by mouth at bedtime", "changed"]],
		extras: [["Sodium", "136"], ["Bicarbonate", "20"], ["Glucose", "152"], ["Platelets", "96"], ["Fibrinogen", "260"], ["LDH", "480"]],
		cultures: [
			culture("Blood cultures ×2", 50, "no-growth", "No growth at 48 hours.", { updatedHours: 2 }),
			culture("Sputum culture (endotracheal aspirate)", 50, "final", "Normal respiratory flora.", { updatedHours: 10 }),
		],
		imaging: [
			report("Echocardiogram, transthoracic", 20, "EF 10 to 15%. The aortic valve opens with every beat on ECMO.", "Severely reduced left ventricular function with an akinetic anterior wall. Aortic valve opening every beat. No pericardial effusion.", "Kofi Mensah, MD, Cardiology"),
			report("Chest X-ray, portable", 6, "Cannulas stable. Mild pulmonary edema.", "Endotracheal tube in good position. ECMO return cannula unchanged. Mild interstitial edema, unchanged.", cvmc),
		],
	},
	p14: {
		onsets: ["2018", "2021"],
		medical: ["Hypertension", "Obstructive sleep apnea · uses CPAP"],
		surgical: [],
		social: ["Never smoker", "2 to 3 glasses of wine most nights", "Lives with her partner", "Teacher"],
		home: [
			["Losartan", "50 mg by mouth daily", "held"],
			["CPAP", "Nightly", "continued"],
		],
		extras: [["Sodium", "139"], ["Bicarbonate", "24"], ["Glucose", "109"], ["WBC", "8.1"], ["Platelets", "245"], ["INR", "1.0"]],
		cultures: [],
		imaging: [
			report("Chest X-ray, portable", 5, "No acute findings.", "Normal heart size. Lungs clear. No effusion.", cvmc),
			report("Echocardiogram, transthoracic", 2, "Normal left ventricular size. EF about 50%.", "Normal left ventricular size, low-normal function in atrial fibrillation. Left atrium mildly enlarged. No significant valve disease.", "Kofi Mensah, MD, Cardiology", "preliminary"),
		],
	},
};

const sampleChartByPatient: Record<string, PatientChart> = Object.fromEntries(
	samplePatientBaseRecords
		.filter((record) => chartSpecs[record.id])
		.map((record) => [record.id, buildChart(record, chartSpecs[record.id])]),
);

export { sampleChartByPatient };
