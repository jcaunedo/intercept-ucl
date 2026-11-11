import type { PatientPlanOfCare, PatientPlanOfCareItem, PatientPlanOfCareStatus } from "./activity";

// Synthetic data (PRD Patient details PD-150): every patient's plan of care, as the hospital's record system holds it
// (Nov 11, 2026, user's call: every admitted patient has one, ICU or not). A row per problem: its goal, what the bedside
// team does toward it and how it's going, in step with each patient's diagnosis and problems
// (`sample-patient-records.ts`), live values and alerts (`sample-monitoring.ts`): Miller's MAP and Clark's pressure
// aren't at goal, Anderson's, Erickson's and Hughes's alerts show in their fall risk or pain goals. Each hospital's record
// system as in `sample-data/sample-ehr.ts`. The scenario patients' plans start on arrival, with their main problem not
// progressing; their records' later stages turn it (`planOfCareWith`).

type PlanSpec = {
	/** The record system: Sidney and Chadron Meditech, Alliance Cerner, Bridgeport TruBridge. */
	source: string;
	/** Hours since the plan was last reviewed (morning rounds, or the admitting nurse for a new patient). */
	reviewedHoursAgo: number;
	items: PatientPlanOfCareItem[];
};

const item = (
	problem: string,
	goal: string,
	interventions: string,
	status: PatientPlanOfCareStatus = "progressing",
): PatientPlanOfCareItem => ({ problem, goal, interventions, status });

const sidney = "Meditech";
const chadron = "Meditech";
const alliance = "Cerner";
const bridgeport = "TruBridge";

const glucose = (interventions = "Insulin before meals and at bedtime · glucose checks before meals") =>
	item("Type 2 diabetes", "Glucose 140–180 mg/dL", interventions);
const noFalls = (interventions: string, status?: PatientPlanOfCareStatus) => item("Fall risk", "No falls", interventions, status);
const droplet = (virus: string, antiviral = "oseltamivir 75 mg twice a day") =>
	item(virus, "No spread on the unit", `Droplet isolation · ${antiviral}`);

const plans: Record<string, PlanSpec> = {
	p1: {
		source: sidney,
		reviewedHoursAgo: 7,
		items: [
			item(
				"Septic shock from community-acquired pneumonia",
				"MAP 65 mmHg or more, lactate clearing",
				"Norepinephrine and vasopressin titration · ceftriaxone and azithromycin",
				"not-progressing",
			),
			item(
				"ARDS, moderate",
				"SpO₂ 88–95%, plateau pressure under 30",
				"Lung-protective ventilation, 6 mL/kg · prone if P/F under 150",
				"not-progressing",
			),
			item(
				"Acute kidney injury, stage 2",
				"Urine output 0.5 mL/kg/h or more",
				"Strict intake and output · renal dosing · no nephrotoxins",
			),
			item(
				"Sedated on the ventilator",
				"RASS −1 to 0, daily awakening trial",
				"Head of bed 30° · oral care every 4 h · awakening trial at 6 AM",
			),
			glucose("Insulin infusion protocol · glucose every hour"),
		],
	},
	p2: {
		source: sidney,
		reviewedHoursAgo: 7,
		items: [
			item(
				"Severe ARDS from influenza A pneumonia",
				"SpO₂ 88–95%",
				"Lung-protective ventilation · prone 16 h a day",
				"not-progressing",
			),
			droplet("Influenza A"),
			item("Skin while prone", "No pressure injury", "Turn every 2 h · face and pressure-point checks"),
		],
	},
	p3: {
		source: sidney,
		reviewedHoursAgo: 7,
		items: [
			item("Septic shock from E. coli bacteremia", "MAP 65 mmHg or more off norepinephrine", "Ceftriaxone, day 5 · norepinephrine wean"),
			item(
				"Acute kidney injury on chronic kidney disease",
				"Creatinine back toward her baseline of 1.3",
				"Strict intake and output · daily weights · renal dosing",
			),
			item("Atrial fibrillation", "HR under 110", "Telemetry · rate control · anticoagulation per pharmacy"),
		],
	},
	p4: {
		source: sidney,
		reviewedHoursAgo: 7,
		items: [
			item(
				"Cardiogenic shock after NSTEMI",
				"MAP 65 mmHg or more, cardiac index 2.2 or more",
				"Dobutamine and norepinephrine · lactate every 4 h",
			),
			item("Heart failure, EF 25%", "Net 1 L negative a day", "Furosemide infusion · daily weights · strict intake and output"),
			item("Goals of care", "Care in line with his DNR, family updated daily", "Palliative care consult · family meeting today"),
			glucose(),
		],
	},
	p5: {
		source: sidney,
		reviewedHoursAgo: 7,
		items: [
			item(
				"Status asthmaticus",
				"Peak flow 60% of her best, no accessory muscle use",
				"Continuous albuterol · methylprednisolone · magnesium given",
			),
			item("Oxygenation", "SpO₂ 92–96%", "Oxygen to target · blood gas if she tires"),
			item("Anxiety disorder", "Calm and able to rest", "Coaching, low-stimulation room · hydroxyzine as needed"),
		],
	},
	p6: {
		source: sidney,
		reviewedHoursAgo: 7,
		items: [
			noFalls("Bed alarm on · low bed · hourly rounding", "not-progressing"),
			item(
				"Postoperative delirium",
				"CAM-ICU negative, oriented",
				"Reorientation · sleep protocol · no benzodiazepines",
				"not-progressing",
			),
			item("Hyponatremia", "Sodium 130 or more, up no more than 8 in 24 h", "Fluid restriction 1.2 L · sodium every 6 h"),
			item(
				"Left hip fracture, after hemiarthroplasty",
				"Pain 3/10 or less, out of bed to the chair",
				"Scheduled acetaminophen · physical therapy twice a day · hip precautions",
			),
			item("Parkinson's disease", "Carbidopa-levodopa on time", "Each dose within 30 min of its time", "met"),
		],
	},
	p7: {
		source: sidney,
		reviewedHoursAgo: 7,
		items: [
			item(
				"Perforated diverticulitis, after Hartmann's procedure",
				"Stoma pink and working, pain 3/10 or less",
				"Stoma checks every 4 h · epidural · diet as tolerated",
			),
			item("Intra-abdominal infection", "No fever for 48 h, WBC falling", "Piperacillin-tazobactam · drain output every shift"),
			item("MRSA wound colonization", "No spread on the unit", "Contact isolation · wound care daily"),
		],
	},
	p8: {
		source: sidney,
		reviewedHoursAgo: 7,
		items: [
			item(
				"Upper GI bleed, after endoscopic clipping",
				"Hemoglobin 7 or more, no rebleeding",
				"Pantoprazole infusion · hemoglobin every 6 h · two large IVs",
			),
			item("Alcohol withdrawal risk", "CIWA score under 10", "CIWA every 2 h · thiamine and folate"),
			item("Nutrition", "Clear liquids 24 h after endoscopy", "Diet advanced by GI", "met"),
		],
	},
	p9: {
		source: sidney,
		reviewedHoursAgo: 7,
		items: [
			item("Aspiration pneumonia with sepsis", "No fever, SpO₂ 88–92%", "Ampicillin-sulbactam · oxygen to target"),
			item("Dysphagia after stroke", "No further aspiration", "Nothing by mouth until a swallow study · head of bed 30°"),
			item("COPD", "SpO₂ 88–92%, CO₂ not rising", "Scheduled bronchodilators · blood gas if drowsy"),
			item("Atrial fibrillation", "HR under 110", "Telemetry · rate control"),
		],
	},
	p10: {
		source: sidney,
		reviewedHoursAgo: 7,
		items: [
			item(
				"Necrotizing soft tissue infection, after debridement",
				"Clean wound bed at the second look",
				"Vancomycin, piperacillin-tazobactam and clindamycin · back to the OR tomorrow",
			),
			item(
				"End-stage kidney disease, on hemodialysis",
				"Potassium under 5.5, fluid even",
				"Dialysis today · renal dosing",
			),
			glucose("Insulin sliding scale · glucose every 6 h"),
			item("Peripheral artery disease", "Both feet warm, pulses unchanged", "Pulse checks every 4 h"),
		],
	},
	p11: {
		source: sidney,
		reviewedHoursAgo: 7,
		items: [
			item(
				"Hypertensive emergency with PRES",
				"SBP 140–160 mmHg",
				"Nicardipine titration · arterial line · labetalol by mouth to take over",
				"not-progressing",
			),
			item("Seizures from PRES", "No seizures", "Levetiracetam · neuro checks every hour · seizure precautions"),
			droplet("Influenza B"),
			glucose(),
		],
	},
	p12: {
		source: sidney,
		reviewedHoursAgo: 7,
		items: [
			item(
				"Right MCA stroke, after thrombectomy",
				"Neuro exam stable, SBP under 140",
				"Neuro checks every hour · nicardipine as needed",
			),
			item("Dysphagia", "No aspiration", "Nothing by mouth except medications · speech therapy"),
			noFalls("Bed alarm on · assist of 2 · hourly rounding"),
			item("Atrial fibrillation", "Anticoagulation started safely", "Telemetry · anticoagulation after the 48 h CT"),
		],
	},
	p13: {
		source: sidney,
		reviewedHoursAgo: 7,
		items: [
			item(
				"Cardiogenic shock on VA-ECMO",
				"MAP 65–80 mmHg, lactate under 2",
				"ECMO flow 4 L/min · cannula and leg checks every hour",
			),
			item("Anticoagulation on ECMO", "Anti-Xa 0.3–0.5, no bleeding", "Heparin per the ECMO protocol"),
			item("Acute kidney injury, stage 1", "Urine output 0.5 mL/kg/h or more", "Strict intake and output · renal dosing"),
		],
	},
	p14: {
		source: sidney,
		reviewedHoursAgo: 4,
		items: [
			item(
				"New atrial fibrillation with rapid ventricular response",
				"HR under 110 at rest",
				"Diltiazem infusion · telemetry · TSH and echo",
			),
			item("Stroke prevention", "Anticoagulation decided and charted", "CHA₂DS₂-VASc 3 · heparin infusion"),
			item("Code status", "Charted after talking with him", "Discuss on rounds today"),
			item("Obstructive sleep apnea", "SpO₂ 92% or more asleep", "Home CPAP at night"),
		],
	},
	p15: {
		source: chadron,
		reviewedHoursAgo: 9,
		items: [
			item(
				"Acute on chronic heart failure",
				"Net 1–1.5 L negative a day, SpO₂ 92% or more",
				"Furosemide 40 mg IV twice a day · daily weights · strict intake and output",
			),
			item("Chronic kidney disease, stage 3", "Creatinine near her baseline", "Renal dosing · BMP daily"),
			noFalls("Bed alarm on · non-slip socks · toileting every 2 h"),
			glucose(),
		],
	},
	p16: {
		source: chadron,
		reviewedHoursAgo: 9,
		items: [
			item(
				"Community-acquired pneumonia, right lower lobe",
				"No fever, SpO₂ 92% or more on room air",
				"Ceftriaxone and azithromycin, day 3 · incentive spirometer",
			),
			noFalls("Bed alarm on · low bed · hourly rounding", "not-progressing"),
			item("Benign prostatic hyperplasia", "Voiding without retention", "Bladder scan after voiding · tamsulosin"),
		],
	},
	p19: {
		source: chadron,
		reviewedHoursAgo: 9,
		items: [
			item(
				"Cellulitis, left lower leg",
				"Redness inside the marked line, no fever",
				"Cefazolin · leg raised · line redrawn each shift",
			),
			glucose(),
			item("Skin", "No new breakdown on the legs", "Skin check every shift"),
		],
	},
	p20: {
		source: chadron,
		reviewedHoursAgo: 9,
		items: [
			item(
				"Acute kidney injury, prerenal",
				"Creatinine back to his baseline of 1.0",
				"IV fluids · strict intake and output · lisinopril and metformin held",
			),
			item("Gastroenteritis", "Eating, no vomiting for 24 h", "Ondansetron as needed · diet as tolerated", "met"),
			item("Hypertension", "BP under 160/100 off lisinopril", "BP every 4 h"),
		],
	},
	p17: {
		source: alliance,
		reviewedHoursAgo: 8,
		items: [
			item(
				"Adhesive small bowel obstruction",
				"Passing gas, NG output under 500 mL a day",
				"NG tube to suction · nothing by mouth · surgery reviews each morning",
				"not-progressing",
			),
			item("Fluids and electrolytes", "Potassium 4 or more, magnesium 2 or more", "IV fluids · electrolyte replacement"),
			item("Pain", "Pain 4/10 or less", "Hydromorphone as needed · reassessed 1 h after each dose"),
		],
	},
	p18: {
		source: alliance,
		reviewedHoursAgo: 8,
		items: [
			item(
				"Diabetic ketoacidosis",
				"Anion gap closed, then insulin under the skin",
				"Insulin infusion · glucose every hour · BMP every 2 h",
			),
			item("Type 1 diabetes", "Back on his home insulin, missed doses explained", "Diabetes educator · check he can get insulin"),
			item("Hypothyroidism", "Levothyroxine on time", "Daily dose before breakfast", "met"),
		],
	},
	p22: {
		source: alliance,
		reviewedHoursAgo: 8,
		items: [
			item(
				"Right hip fracture, after hemiarthroplasty",
				"Out of bed to the chair twice a day, pain 4/10 or less",
				"Physical therapy twice a day · hip precautions · scheduled acetaminophen",
			),
			noFalls("Bed alarm on · assist of 1 · hourly rounding"),
			item("Blood clot prevention", "No DVT", "Enoxaparin · compression devices in bed"),
			item("Osteoporosis", "Bone health plan before discharge", "Vitamin D · DEXA referral"),
		],
	},
	p25: {
		source: bridgeport,
		reviewedHoursAgo: 10,
		items: [
			item(
				"Acute sigmoid diverticulitis",
				"Pain 3/10 or less on clear liquids",
				"Amoxicillin-clavulanate IV · diet as tolerated",
			),
			item("Discharge", "Home on antibiotics by mouth", "Diet teaching · GI follow-up in 6 weeks"),
		],
	},
	p26: {
		source: bridgeport,
		reviewedHoursAgo: 10,
		items: [
			item(
				"Influenza A with viral pneumonia",
				"SpO₂ 92% or more, RR 20 or less",
				"Oxygen by nasal cannula · incentive spirometer",
				"not-progressing",
			),
			droplet("Influenza A"),
			item("Goals of care", "Care in line with her DNR", "Daughter updated each day"),
		],
	},
	p27: {
		source: bridgeport,
		reviewedHoursAgo: 10,
		items: [
			item(
				"Left knee replacement, rehabilitation",
				"Knee bends 90°, walks 150 ft with a walker",
				"Physical and occupational therapy twice a day · ice and elevation",
			),
			noFalls("Walker within reach · assist of 1 to the bathroom"),
			item("Blood clot prevention", "No DVT", "Aspirin twice a day · compression devices in bed"),
		],
	},
	p28: {
		source: bridgeport,
		reviewedHoursAgo: 10,
		items: [
			item(
				"Upper GI bleed, suspected NSAID ulcer",
				"Hemoglobin stable, no black stools",
				"Pantoprazole IV twice a day · hemoglobin every 8 h · no NSAIDs",
			),
			item(
				"Chronic low back pain",
				"Pain 4/10 or less without NSAIDs",
				"Scheduled acetaminophen · lidocaine patch · reassessed 1 h after each dose",
				"not-progressing",
			),
			noFalls("Bed alarm on · call light within reach"),
		],
	},
	p29: {
		source: bridgeport,
		reviewedHoursAgo: 2,
		items: [
			item(
				"Asthma exacerbation",
				"Peak flow 70% of her best, SpO₂ 94% or more on room air",
				"Nebulizers every 4 h · prednisone 50 mg",
			),
			item("Discharge", "Home with an asthma action plan", "Inhaler teaching · prednisone burst · follow-up in a week"),
		],
	},
	// The scenario patients, started on arrival by the admitting nurse.
	p21: {
		source: alliance,
		reviewedHoursAgo: 0.3,
		items: [
			item(
				"Hypercapnic respiratory failure, COPD exacerbation",
				"SpO₂ 88–92%, pH 7.30 or more on BiPAP",
				"BiPAP · blood gas at 1 and 2 h",
				"not-progressing",
			),
			item("COPD exacerbation", "Less work of breathing", "Nebulizers · methylprednisolone · azithromycin"),
			item("Tobacco use", "Nicotine replacement offered", "Nicotine patch"),
		],
	},
	p23: {
		source: sidney,
		reviewedHoursAgo: 0.3,
		items: [
			item(
				"Septic shock from left pyelonephritis",
				"MAP 65 mmHg or more, lactate clearing",
				"Hour-1 bundle: cultures, antibiotics, 30 mL/kg fluids",
				"not-progressing",
			),
			item("Chronic kidney disease, stage 4", "Creatinine back toward her baseline of 2.4", "Renal dosing · strict intake and output"),
			glucose("Insulin per protocol · glucose every hour"),
			item("Communication", "An interpreter at every update", "Spanish interpreter by video"),
		],
	},
	p24: {
		source: bridgeport,
		reviewedHoursAgo: 0.3,
		items: [
			item(
				"Severe diabetic ketoacidosis",
				"Anion gap closed, then insulin under the skin",
				"DKA protocol: fluids, insulin infusion, potassium · glucose every hour",
				"not-progressing",
			),
			item("Acute kidney injury from dehydration", "Creatinine back to his baseline of 0.9", "IV fluids · strict intake and output"),
			item("Type 1 diabetes", "Insulin he can afford, before discharge", "Social work · diabetes educator"),
		],
	},
};

/** A patient's plan of care, reviewed relative to now (so its age reads the same in every session). */
function samplePlanOfCare(patientId: string): PatientPlanOfCare | undefined {
	const plan = plans[patientId];
	if (!plan) return undefined;
	return {
		items: plan.items,
		source: plan.source,
		reviewedAt: new Date(Date.now() - plan.reviewedHoursAgo * 3_600_000).toISOString(),
	};
}

/**
 * The plan of care with some goals' status changed, by row (0 is the main problem), as a scenario's later stage
 * re-evaluates them, reviewed just now.
 */
function planOfCareWith(
	patientId: string,
	statuses: Record<number, PatientPlanOfCareStatus>,
	reviewedMinutesAgo = 0,
): PatientPlanOfCare | undefined {
	const plan = samplePlanOfCare(patientId);
	if (!plan) return undefined;
	return {
		...plan,
		items: plan.items.map((row, index) => (statuses[index] ? { ...row, status: statuses[index] } : row)),
		reviewedAt: new Date(Date.now() - reviewedMinutesAgo * 60_000).toISOString(),
	};
}

export { planOfCareWith, samplePlanOfCare };
