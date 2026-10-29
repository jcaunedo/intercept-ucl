import type { PatientInfusion } from "../patient-details";
import { samplePatientBaseRecords } from "../sample-patient-records";
import type { ContinuousMedication, PatientMedications, PrnMedication, ScheduledMedication } from "./medications-section";

// Synthetic data (PRD Patient details PD-150): the active medications of every patient on the Census, from their
// hospital's record. Continuous infusions are the record's own (`sample-patient-records.ts`): same drugs, rates and last
// changes, with the order's concentration, range and titration goal added. Scheduled and as-needed medications fit each
// diagnosis, allergy and hospital. No insulin infusion is proposed for anyone; sliding-scale orders are the hospital's.
//
// Sarah Miller (`p1`) is written out by hand, in step with her penicillin allergy and her sepsis bundle
// (`sample-sepsis.ts`): vancomycin and aztreonam went in 30 min ago, after cultures. Azithromycin is due in 40 min;
// heparin is 15 min overdue.

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
const minutesFromNow = (minutes: number) => minutesAgo(-minutes);

const millerMedications: PatientMedications = {
	hospital: "Harbor Point General",
	updatedAt: minutesAgo(4),
	continuous: [
		{
			drug: "Norepinephrine",
			concentration: "8 mg in 250 mL NS",
			orderedRate: "0.02–0.5 mcg/kg/min",
			titration: "Titrate to MAP 65 or more",
			pumpRate: "0.22 mcg/kg/min",
			change: { direction: "up", from: "0.15", at: minutesAgo(40) },
			source: "Pump",
			updatedAt: minutesAgo(1),
		},
		{
			drug: "Vasopressin",
			concentration: "20 units in 100 mL NS",
			orderedRate: "0.03 units/min",
			titration: "Fixed rate",
			pumpRate: "0.03 units/min",
			source: "Pump",
			updatedAt: minutesAgo(1),
		},
		{
			drug: "Propofol",
			concentration: "1,000 mg in 100 mL",
			orderedRate: "5–50 mcg/kg/min",
			titration: "Titrate to RASS −2 to 0",
			pumpRate: "30 mcg/kg/min",
			change: { direction: "down", from: "40", at: minutesAgo(130) },
			source: "Pump",
			updatedAt: minutesAgo(1),
		},
		{
			drug: "Fentanyl",
			concentration: "2,500 mcg in 250 mL NS",
			orderedRate: "25–200 mcg/h",
			titration: "Titrate to CPOT under 3",
			pumpRate: "50 mcg/h",
			source: "Pump",
			updatedAt: minutesAgo(1),
		},
	],
	scheduled: [
		{
			drug: "Vancomycin",
			dose: "1,250 mg",
			route: "IV",
			frequency: "Every 12 h",
			indication: "Pneumonia",
			lastGivenAt: minutesAgo(30),
			nextDueAt: minutesFromNow(690),
			source: "MAR",
			updatedAt: minutesAgo(30),
		},
		{
			drug: "Aztreonam",
			dose: "2 g",
			route: "IV",
			frequency: "Every 8 h",
			indication: "Pneumonia · penicillin allergy",
			lastGivenAt: minutesAgo(30),
			nextDueAt: minutesFromNow(450),
			source: "MAR",
			updatedAt: minutesAgo(30),
		},
		{
			drug: "Azithromycin",
			dose: "500 mg",
			route: "IV",
			frequency: "Every 24 h",
			indication: "Pneumonia",
			lastGivenAt: minutesAgo(1400),
			nextDueAt: minutesFromNow(40),
			source: "MAR",
			updatedAt: minutesAgo(1400),
		},
		{
			drug: "Insulin lispro, sliding scale",
			dose: "Per scale",
			route: "SC",
			frequency: "Every 6 h with glucose",
			indication: "Last dose 2 units for glucose 214",
			lastGivenAt: minutesAgo(150),
			nextDueAt: minutesFromNow(210),
			source: "MAR",
			updatedAt: minutesAgo(150),
		},
		{
			drug: "Heparin",
			dose: "5,000 units",
			route: "SC",
			frequency: "Every 8 h",
			indication: "DVT prophylaxis",
			lastGivenAt: minutesAgo(495),
			nextDueAt: minutesAgo(15),
			source: "MAR",
			updatedAt: minutesAgo(495),
		},
		{
			drug: "Pantoprazole",
			dose: "40 mg",
			route: "IV",
			frequency: "Every 24 h",
			indication: "Stress ulcer prophylaxis",
			lastGivenAt: minutesAgo(300),
			nextDueAt: minutesFromNow(1140),
			source: "MAR",
			updatedAt: minutesAgo(300),
		},
		{
			drug: "Chlorhexidine 0.12% oral rinse",
			dose: "15 mL",
			route: "Oral",
			frequency: "Every 12 h",
			indication: "Ventilator bundle",
			lastGivenAt: minutesAgo(100),
			nextDueAt: minutesFromNow(620),
			source: "MAR",
			updatedAt: minutesAgo(100),
		},
	],
	prn: [
		{
			drug: "Acetaminophen",
			dose: "650 mg",
			route: "Feeding tube",
			frequency: "Every 6 h as needed",
			indication: "Fever over 38.5 °C",
			lastGivenAt: minutesAgo(88),
			givenLast24h: 2,
			source: "MAR",
			updatedAt: minutesAgo(88),
		},
		{
			drug: "Fentanyl",
			dose: "25 mcg",
			route: "IV push",
			frequency: "Every 1 h as needed",
			indication: "Breakthrough pain, CPOT 3 or more",
			lastGivenAt: minutesAgo(190),
			givenLast24h: 3,
			source: "MAR",
			updatedAt: minutesAgo(190),
		},
		{
			drug: "Ipratropium-albuterol",
			dose: "3 mL",
			route: "Inhaled",
			frequency: "Every 4 h as needed",
			indication: "Wheeze or thick secretions",
			lastGivenAt: minutesAgo(110),
			givenLast24h: 1,
			source: "MAR",
			updatedAt: minutesAgo(110),
		},
		{
			drug: "Ondansetron",
			dose: "4 mg",
			route: "IV",
			frequency: "Every 6 h as needed",
			indication: "Nausea",
			givenLast24h: 0,
			source: "Order",
			updatedAt: minutesAgo(3240),
		},
	],
};

/* -------------------------------------------------------------------------- */
/* Builders for the other patients                                            */
/* -------------------------------------------------------------------------- */

// The order behind each infusion: concentration, ordered rate or range, and titration goal. A fixed-rate order's rate is
// the pump's (`undefined` here).
const drips: Record<string, { concentration?: string; orderedRate?: string; titration: string }> = {
	Norepinephrine: { concentration: "8 mg in 250 mL NS", orderedRate: "0.02–0.5 mcg/kg/min", titration: "Titrate to MAP 65 or more" },
	Epinephrine: { concentration: "4 mg in 250 mL NS", orderedRate: "0.01–0.3 mcg/kg/min", titration: "Titrate to MAP 65 or more" },
	Vasopressin: { concentration: "20 units in 100 mL NS", titration: "Fixed rate" },
	Dobutamine: { concentration: "500 mg in 250 mL D5W", titration: "Fixed rate" },
	Propofol: { concentration: "1,000 mg in 100 mL", orderedRate: "5–50 mcg/kg/min", titration: "Titrate to RASS −2 to 0" },
	Fentanyl: { concentration: "2,500 mcg in 250 mL NS", orderedRate: "25–200 mcg/h", titration: "Titrate to CPOT under 3" },
	Cisatracurium: { concentration: "200 mg in 200 mL NS", orderedRate: "1–5 mcg/kg/min", titration: "Titrate to train-of-four 1 to 2 of 4" },
	Heparin: { concentration: "25,000 units in 250 mL", orderedRate: "Per heparin nomogram", titration: "Adjust to anti-Xa 0.3–0.7" },
	Amiodarone: { concentration: "450 mg in 250 mL D5W", titration: "Maintenance, after the load" },
	"Lactated Ringer's": { titration: "Maintenance fluid" },
	"Normal saline": { titration: "Maintenance fluid" },
	Pantoprazole: { concentration: "80 mg in 100 mL NS", titration: "For 72 h after endoscopy" },
	"CRRT citrate": { concentration: "ACD-A", orderedRate: "Per CRRT protocol", titration: "Adjust to post-filter ionized calcium" },
	"Magnesium sulfate": { concentration: "40 g in 1,000 mL", titration: "Seizure prophylaxis, 24 h after delivery" },
	Nicardipine: { concentration: "40 mg in 200 mL NS", orderedRate: "5–15 mg/h", titration: "Titrate to BP under 160/110" },
	Diltiazem: { concentration: "125 mg in 125 mL D5W", orderedRate: "5–15 mg/h", titration: "Titrate to HR under 110" },
};

/** The record's infusions as continuous medications, with their orders. */
const continuousFrom = (infusions: PatientInfusion[] = []): ContinuousMedication[] =>
	infusions.map((infusion) => {
		const order = drips[infusion.drug] ?? { titration: "Per order" };
		return {
			drug: infusion.drug,
			concentration: order.concentration,
			orderedRate: order.orderedRate ?? infusion.rate,
			titration: order.titration,
			pumpRate: infusion.rate,
			change: infusion.change,
			source: "Pump",
			updatedAt: infusion.updatedAt,
		};
	});

/**
 * A scheduled medication, last given `lastGiven` min ago and due every `hours`, so it's overdue once `lastGiven` passes
 * the interval. Not given yet: `firstDueIn` min from now, from its order `ordered` min ago.
 */
function scheduled(
	drug: string,
	dose: string,
	route: string,
	[frequency, hours]: [string, number],
	lastGiven: number | { firstDueIn: number; ordered: number },
	indication?: string,
): ScheduledMedication {
	if (typeof lastGiven === "number") {
		return {
			drug,
			dose,
			route,
			frequency,
			indication,
			lastGivenAt: minutesAgo(lastGiven),
			nextDueAt: minutesFromNow(hours * 60 - lastGiven),
			source: "MAR",
			updatedAt: minutesAgo(lastGiven),
		};
	}
	return {
		drug,
		dose,
		route,
		frequency,
		indication,
		nextDueAt: minutesFromNow(lastGiven.firstDueIn),
		source: "Order",
		updatedAt: minutesAgo(lastGiven.ordered),
	};
}

/** An as-needed medication, last given `lastGiven` min ago (or never, from its order 2 days ago), `count` times in 24 h. */
function prn(drug: string, dose: string, route: string, frequency: string, indication: string, lastGiven?: number, count = 0): PrnMedication {
	return {
		drug,
		dose,
		route,
		frequency,
		indication,
		lastGivenAt: lastGiven === undefined ? undefined : minutesAgo(lastGiven),
		givenLast24h: lastGiven === undefined ? 0 : count,
		source: lastGiven === undefined ? "Order" : "MAR",
		updatedAt: minutesAgo(lastGiven ?? 2880),
	};
}

const every = (hours: number): [string, number] => [`Every ${hours} h`, hours];
const daily: [string, number] = ["Every 24 h", 24];
const nightly: [string, number] = ["Nightly", 24];

/** A patient's medications: the hospital and infusions from their record, plus their scheduled and as-needed orders. */
function medicationsFor(id: string, scheduledMeds: ScheduledMedication[], prnMeds: PrnMedication[]): PatientMedications {
	const record = samplePatientBaseRecords.find((item) => item.id === id);
	const hospital = record?.careTeam?.find((member) => member.organization)?.organization ?? "";
	return { hospital, updatedAt: minutesAgo(4), continuous: continuousFrom(record?.infusions), scheduled: scheduledMeds, prn: prnMeds };
}

/* -------------------------------------------------------------------------- */
/* Patients                                                                   */
/* -------------------------------------------------------------------------- */

const sampleMedicationsByPatient: Record<string, PatientMedications> = {
	p1: millerMedications,
	// Johnson: influenza ARDS, no known allergies; vancomycin due in 20 min.
	p2: medicationsFor(
		"p2",
		[
			scheduled("Oseltamivir", "75 mg", "Feeding tube", every(12), 300, "Influenza A"),
			scheduled("Ceftriaxone", "2 g", "IV", daily, 600, "Secondary bacterial pneumonia"),
			scheduled("Vancomycin", "1,750 mg", "IV", every(12), 700, "Secondary bacterial pneumonia"),
			scheduled("Heparin", "7,500 units", "SC", every(8), 420, "DVT prophylaxis"),
			scheduled("Pantoprazole", "40 mg", "IV", daily, 540, "Stress ulcer prophylaxis"),
			scheduled("Chlorhexidine 0.12% oral rinse", "15 mL", "Oral", every(12), 260, "Ventilator bundle"),
		],
		[
			prn("Acetaminophen", "1,000 mg", "Feeding tube", "Every 6 h as needed", "Fever over 38.5 °C", 200, 2),
			prn("Fentanyl", "50 mcg", "IV push", "Every 1 h as needed", "Breakthrough pain, CPOT 3 or more", 130, 2),
			prn("Midazolam", "2 mg", "IV push", "Every 2 h as needed", "Ventilator dyssynchrony", 310, 1),
		],
	),
	// Davis: E. coli bacteremia on day 3 of ceftriaxone; sulfa allergy.
	p3: medicationsFor(
		"p3",
		[
			scheduled("Ceftriaxone", "2 g", "IV", daily, 480, "E. coli bacteremia, day 3"),
			scheduled("Heparin", "5,000 units", "SC", every(8), 380, "DVT prophylaxis"),
			scheduled("Pantoprazole", "40 mg", "IV", daily, 600, "Stress ulcer prophylaxis"),
			scheduled("Atorvastatin", "40 mg", "Feeding tube", nightly, 1080),
			scheduled("Chlorhexidine 0.12% oral rinse", "15 mL", "Oral", every(12), 420, "Ventilator bundle"),
		],
		[
			prn("Acetaminophen", "650 mg", "Feeding tube", "Every 6 h as needed", "Fever over 38.5 °C", 900, 1),
			prn("Fentanyl", "25 mcg", "IV push", "Every 1 h as needed", "Breakthrough pain, CPOT 3 or more", 240, 1),
			prn("Ondansetron", "4 mg", "IV", "Every 6 h as needed", "Nausea"),
		],
	),
	// Thompson: cardiogenic shock after NSTEMI, on heparin and amiodarone drips; contrast allergy; DNR.
	p4: medicationsFor(
		"p4",
		[
			scheduled("Aspirin", "81 mg", "PO", daily, 420, "After NSTEMI"),
			scheduled("Clopidogrel", "75 mg", "PO", daily, 420, "After NSTEMI"),
			scheduled("Atorvastatin", "80 mg", "PO", nightly, 1020),
			scheduled("Furosemide", "40 mg", "IV", every(12), 690, "Volume overload"),
			scheduled("Insulin lispro, sliding scale", "Per scale", "SC", ["Before meals and at bedtime", 6], 200, "Last dose 2 units for glucose 196"),
			scheduled("Pantoprazole", "40 mg", "PO", daily, 420, "Stress ulcer prophylaxis"),
		],
		[
			prn("Acetaminophen", "650 mg", "PO", "Every 6 h as needed", "Pain or fever", 380, 1),
			prn("Ondansetron", "4 mg", "IV", "Every 6 h as needed", "Nausea", 600, 1),
			prn("Melatonin", "3 mg", "PO", "Nightly as needed", "Sleep", 1060, 1),
		],
	),
	// Carter: status asthmaticus on BiPAP, no infusions; latex allergy.
	p5: medicationsFor(
		"p5",
		[
			scheduled("Albuterol, continuous", "10 mg/h", "Nebulized via BiPAP", ["Continuous", 24], 2, "Status asthmaticus"),
			scheduled("Ipratropium", "0.5 mg", "Nebulized", every(6), 330, "Status asthmaticus"),
			scheduled("Methylprednisolone", "60 mg", "IV", every(6), 250, "Status asthmaticus"),
			scheduled("Famotidine", "20 mg", "IV", every(12), 500, "Stress ulcer prophylaxis on steroids"),
			scheduled("Heparin", "5,000 units", "SC", every(12), 420, "DVT prophylaxis"),
		],
		[
			prn("Lorazepam", "0.5 mg", "IV", "Every 6 h as needed", "Anxiety on BiPAP", 480, 1),
			prn("Acetaminophen", "650 mg", "PO", "Every 6 h as needed", "Pain or fever"),
		],
	),
	// Anderson: post-op day 2 after hemiarthroplasty, delirium, Parkinson's (carbidopa-levodopa on time; no haloperidol).
	p6: medicationsFor(
		"p6",
		[
			scheduled("Carbidopa-levodopa", "25/100 mg", "PO", every(6), 340, "Parkinson's disease, give on time"),
			scheduled("Enoxaparin", "40 mg", "SC", daily, 600, "DVT prophylaxis after hip surgery"),
			scheduled("Acetaminophen", "1,000 mg", "PO", every(8), 400, "Post-op pain"),
			scheduled("Quetiapine", "12.5 mg", "PO", nightly, 1080, "Delirium"),
			scheduled("Senna", "2 tablets", "PO", nightly, 1080, "Constipation on opioids"),
		],
		[
			prn("Oxycodone", "5 mg", "PO", "Every 4 h as needed", "Moderate pain", 180, 2),
			prn("Ondansetron", "4 mg", "IV", "Every 6 h as needed", "Nausea"),
		],
	),
	// Taylor: after Hartmann's, MRSA in the wound; codeine allergy (hydromorphone for pain).
	p7: medicationsFor(
		"p7",
		[
			scheduled("Piperacillin-tazobactam", "4.5 g", "IV", every(6), 320, "Perforated diverticulitis"),
			scheduled("Vancomycin", "1,250 mg", "IV", every(12), 680, "MRSA wound"),
			scheduled("Levothyroxine", "75 mcg", "PO", daily, 600, "Hypothyroidism"),
			scheduled("Enoxaparin", "40 mg", "SC", daily, 540, "DVT prophylaxis"),
			scheduled("Pantoprazole", "40 mg", "IV", daily, 600, "Stress ulcer prophylaxis"),
		],
		[
			prn("Hydromorphone", "0.5 mg", "IV push", "Every 3 h as needed", "Moderate to severe pain", 150, 3),
			prn("Ondansetron", "4 mg", "IV", "Every 6 h as needed", "Nausea", 500, 1),
			prn("Acetaminophen", "1,000 mg", "IV", "Every 6 h as needed", "Fever over 38.5 °C"),
		],
	),
	// Wilson: after clipping a duodenal ulcer, on a pantoprazole drip; alcohol use disorder (CIWA, thiamine).
	p8: medicationsFor(
		"p8",
		[
			scheduled("Thiamine", "100 mg", "IV", daily, 560, "Alcohol use disorder"),
			scheduled("Folic acid", "1 mg", "IV", daily, 560, "Alcohol use disorder"),
			scheduled("Multivitamin", "1 tablet", "PO", daily, 560),
		],
		[
			prn("Lorazepam", "1 mg", "IV push", "Every 1 h as needed", "Per CIWA score 10 or more", 260, 2),
			prn("Acetaminophen", "650 mg", "PO", "Every 6 h as needed, 2 g a day at most", "Pain or fever"),
			prn("Ondansetron", "4 mg", "IV", "Every 6 h as needed", "Nausea", 720, 1),
		],
	),
	// Harris: aspiration pneumonia with sepsis, COPD, AF; morphine allergy (fentanyl for pain).
	p9: medicationsFor(
		"p9",
		[
			scheduled("Ampicillin-sulbactam", "3 g", "IV", every(6), 390, "Aspiration pneumonia"),
			scheduled("Ipratropium-albuterol", "3 mL", "Nebulized", every(6), 300, "COPD"),
			scheduled("Budesonide", "0.5 mg", "Nebulized", every(12), 640, "COPD"),
			scheduled("Metoprolol tartrate", "12.5 mg", "Feeding tube", every(12), 700, "AF rate control, hold for SBP under 90"),
			scheduled("Heparin", "5,000 units", "SC", every(8), 450, "DVT prophylaxis"),
			scheduled("Chlorhexidine 0.12% oral rinse", "15 mL", "Oral", every(12), 520, "Ventilator bundle"),
		],
		[
			prn("Fentanyl", "25 mcg", "IV push", "Every 1 h as needed", "Breakthrough pain, CPOT 3 or more", 95, 2),
			prn("Acetaminophen", "650 mg", "Feeding tube", "Every 6 h as needed", "Fever over 38.5 °C", 50, 2),
		],
	),
	// Moore: necrotizing soft tissue infection after debridement, on CRRT; dosed for CRRT.
	p10: medicationsFor(
		"p10",
		[
			scheduled("Meropenem", "1 g", "IV", every(12), 300, "Necrotizing soft tissue infection"),
			scheduled("Vancomycin", "1,000 mg", "IV", daily, 1320, "Necrotizing soft tissue infection, dosed for CRRT"),
			scheduled("Clindamycin", "900 mg", "IV", every(8), 500, "Toxin suppression"),
			scheduled("Insulin lispro, sliding scale", "Per scale", "SC", every(6), 230, "Last dose 4 units for glucose 248"),
			scheduled("Heparin", "5,000 units", "SC", every(8), 360, "DVT prophylaxis"),
		],
		[
			prn("Hydromorphone", "0.5 mg", "IV push", "Every 2 h as needed", "Wound pain", 110, 5),
			prn("Acetaminophen", "650 mg", "PO", "Every 6 h as needed", "Fever over 38.5 °C", 300, 2),
		],
	),
	// Clark: postpartum day 1 with severe preeclampsia and influenza B.
	p11: medicationsFor(
		"p11",
		[
			scheduled("Oseltamivir", "75 mg", "PO", every(12), 380, "Influenza B"),
			scheduled("Labetalol", "200 mg", "PO", every(12), 650, "Blood pressure"),
			scheduled("Enoxaparin", "40 mg", "SC", daily, 700, "DVT prophylaxis after cesarean"),
			scheduled("Acetaminophen", "1,000 mg", "PO", every(6), 330, "Post-op pain"),
			scheduled("Docusate", "100 mg", "PO", every(12), 400),
		],
		[
			prn("Hydralazine", "10 mg", "IV", "Every 20 min as needed", "BP 160/110 or more for 15 min", 40, 2),
			prn("Oxycodone", "5 mg", "PO", "Every 4 h as needed", "Moderate pain", 200, 3),
			prn("Ondansetron", "4 mg", "IV", "Every 6 h as needed", "Nausea", 800, 1),
		],
	),
	// Whitfield: after thrombectomy for a right MCA stroke, dysphagia (by tube or rectally); sulfa allergy; DNR.
	p12: medicationsFor(
		"p12",
		[
			scheduled("Aspirin", "81 mg", "Feeding tube", daily, 620, "Stroke"),
			scheduled("Atorvastatin", "80 mg", "Feeding tube", nightly, 1100, "Stroke"),
			scheduled("Heparin", "5,000 units", "SC", every(8), 400, "DVT prophylaxis"),
			scheduled("Insulin lispro, sliding scale", "Per scale", "SC", every(6), 90, "Last dose 2 units for glucose 182"),
		],
		[
			prn("Labetalol", "10 mg", "IV push", "Every 15 min as needed", "SBP over 180"),
			prn("Acetaminophen", "650 mg", "Rectal", "Every 6 h as needed", "Fever or headache", 600, 1),
			prn("Ondansetron", "4 mg", "IV", "Every 6 h as needed", "Nausea"),
		],
	),
	// Walker: VA-ECMO after anterior STEMI, on heparin, epinephrine and norepinephrine.
	p13: medicationsFor(
		"p13",
		[
			scheduled("Aspirin", "81 mg", "Feeding tube", daily, 500, "After STEMI"),
			scheduled("Ticagrelor", "90 mg", "Feeding tube", every(12), 560, "After STEMI"),
			scheduled("Atorvastatin", "80 mg", "Feeding tube", nightly, 1060),
			scheduled("Cefazolin", "2 g", "IV", every(8), 470, "ECMO cannula sites"),
			scheduled("Pantoprazole", "40 mg", "IV", daily, 500, "Stress ulcer prophylaxis"),
			scheduled("Chlorhexidine 0.12% oral rinse", "15 mL", "Oral", every(12), 380, "Ventilator bundle"),
		],
		[
			prn("Fentanyl", "25 mcg", "IV push", "Every 1 h as needed", "Breakthrough pain, CPOT 3 or more", 70, 3),
			prn("Acetaminophen", "650 mg", "Feeding tube", "Every 6 h as needed", "Pain or fever"),
		],
	),
	// Bennett: new AF with rapid response, admitted 5 h ago; first metoprolol dose is due as the drip comes down.
	p14: medicationsFor(
		"p14",
		[
			scheduled("Apixaban", "5 mg", "PO", every(12), 220, "Stroke prevention in AF"),
			scheduled("Metoprolol tartrate", "25 mg", "PO", every(6), { firstDueIn: 50, ordered: 70 }, "AF rate control, transition off diltiazem"),
			scheduled("Magnesium oxide", "400 mg", "PO", every(12), 230, "Low magnesium"),
		],
		[
			prn("Acetaminophen", "650 mg", "PO", "Every 6 h as needed", "Pain or fever"),
			prn("Melatonin", "3 mg", "PO", "Nightly as needed", "Sleep"),
		],
	),
	// Hayes: GI bleed on daily naproxen, so acetaminophen for her knees and no NSAIDs.
	p15: medicationsFor(
		"p15",
		[scheduled("Acetaminophen", "650 mg", "PO", every(6), 150, "Knee pain, in place of naproxen")],
		[
			prn("Ondansetron", "4 mg", "IV push", "Every 6 h as needed", "Nausea", 300, 1),
			prn("Melatonin", "3 mg", "PO", "Nightly as needed", "Sleep"),
		],
	),
};

export { sampleMedicationsByPatient };
