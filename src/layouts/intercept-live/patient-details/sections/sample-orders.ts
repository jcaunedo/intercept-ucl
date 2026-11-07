import type { ActiveOrder, OrderAgentCheck, OrderRecommendation, PatientOrders } from "./orders-section";

// Synthetic data (PRD Patient details PD-150): every Census patient's orders, in step with their record in
// `sample-patient-records.ts` (infusions, ventilator or oxygen, therapy), their alerts and their sepsis case.
// Recommendations stay in the v1 classes (sepsis bundle, electrolyte replacement, vent-order alignment, glycemic
// management enrollment) and never propose insulin dosing. A patient with nothing to recommend gets an agent check
// that says why. Sarah Miller (`p1`) is written out in full; the others go through `patientOrders`.

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

const sarahOrders: PatientOrders = {
	hospital: "Sidney Regional",
	source: "Meditech",
	updatedAt: minutesAgo(2),
	writeBack: true,
	supervisor: "Joanna Smith",
	recommendations: [
		{
			id: "r1",
			agent: "Order-Entry Suggestion",
			kind: "sepsis-bundle",
			title: "Repeat lactate",
			order: "Lactate, whole blood · once",
			dueAt: minutesAgo(-210),
			reason: "The initial lactate was over 2, so SEP-1 asks for a repeat within 6 h of time zero.",
			evidence: [
				{ label: "Lactate 4.1", source: "Lab", at: minutesAgo(35) },
				{ label: "Lactate 2.2", source: "Lab", at: minutesAgo(330) },
				{ label: "Sepsis candidate", source: "Sepsis Sniffer", at: minutesAgo(2) },
			],
			protocol: { kind: "sep-1", name: "SEP-1" },
			suggestedAt: minutesAgo(2),
			needsCosign: true,
		},
		{
			id: "r2",
			agent: "Order-Entry Suggestion",
			kind: "electrolyte",
			title: "Potassium chloride 20 mEq IV",
			order: "Potassium chloride 20 mEq in 100 mL · IV over 2 h · once",
			reason: "Potassium is 3.3 and falling. The protocol halves the dose because creatinine is over 1.5.",
			evidence: [
				{ label: "K 3.3", source: "Lab", at: minutesAgo(95) },
				{ label: "K 3.8", source: "Lab", at: minutesAgo(1520) },
				{ label: "Creatinine 1.9", source: "Lab", at: minutesAgo(95) },
			],
			protocol: { kind: "hospital", name: "Sidney electrolyte replacement" },
			suggestedAt: minutesAgo(80),
			needsCosign: true,
		},
		{
			id: "r3",
			agent: "Order-Entry Suggestion",
			kind: "sepsis-bundle",
			title: "Blood cultures × 2 before antibiotics",
			order: "Blood culture, aerobic and anaerobic · 2 sets, 2 sites · now",
			reason: "Sepsis criteria were met and no cultures were drawn in the last 48 h.",
			evidence: [
				{ label: "Lactate 4.1", source: "Lab", at: minutesAgo(35) },
				{ label: "Temp 38.9", source: "Monitor", at: minutesAgo(92) },
			],
			protocol: { kind: "sep-1", name: "SEP-1" },
			suggestedAt: minutesAgo(70),
			outcome: { kind: "taken", at: minutesAgo(62), by: "Joanna Smith", writeBack: { status: "signed", by: "Laura Mitchell", at: minutesAgo(55) } },
		},
		{
			id: "r4",
			agent: "Order-Entry Suggestion",
			kind: "sepsis-bundle",
			title: "Lactated Ringer's 920 mL IV bolus",
			order: "Lactated Ringer's 920 mL · IV over 30 min · completes 30 mL/kg (1,920 mL)",
			reason: "1,000 of the 1,920 mL for 30 mL/kg is given, with MAP under 65.",
			evidence: [
				{ label: "MAP 58", source: "Monitor", at: minutesAgo(1) },
				{ label: "LR 1,000 mL", source: "Pump", at: minutesAgo(40) },
			],
			protocol: { kind: "sep-1", name: "SEP-1" },
			suggestedAt: minutesAgo(32),
			outcome: {
				kind: "declined",
				at: minutesAgo(25),
				by: "Joanna Smith",
				rationale: "Holding further fluid for ARDS. Reassessing with ultrasound.",
			},
		},
		{
			id: "r5",
			agent: "Order-Entry Suggestion",
			kind: "glucose",
			title: "Enroll in glycemic management",
			order: "Glycemic management protocol · enrollment",
			reason: "Type 2 diabetes, with two glucose results over 180 in 12 h.",
			evidence: [
				{ label: "Glucose 214", source: "Lab", at: minutesAgo(400) },
				{ label: "Glucose 196", source: "Lab", at: minutesAgo(640) },
			],
			protocol: { kind: "glycemic", name: "Glycemic management system" },
			suggestedAt: minutesAgo(400),
			outcome: { kind: "elapsed", at: minutesAgo(280) },
		},
	],
	checks: [
		{
			agent: "Vent-Order Mismatch",
			result: "No mismatch",
			detail: "Settings match the active order: AC/VC, rate 22, tidal volume 420 mL, FiO₂ 60%, PEEP 10. Measured rate 32 is her breathing over the set rate.",
			at: minutesAgo(2),
		},
	],
	active: [
		{ id: "o1", type: "medication", name: "Norepinephrine infusion", details: "0.01–0.5 mcg/kg/min IV · titrate to MAP 65 or more", orderedBy: "Laura Mitchell", orderedAt: minutesAgo(3100), status: "Active" },
		{ id: "o2", type: "medication", name: "Vasopressin infusion", details: "0.03 units/min IV · fixed rate", orderedBy: "Laura Mitchell", orderedAt: minutesAgo(1300), status: "Active" },
		{ id: "o3", type: "medication", name: "Vancomycin", details: "1,250 mg IV every 12 h · pharmacy to dose", orderedBy: "Laura Mitchell", orderedAt: minutesAgo(45), status: "Active" },
		{ id: "o4", type: "medication", name: "Aztreonam", details: "2 g IV every 8 h · penicillin allergy", orderedBy: "Laura Mitchell", orderedAt: minutesAgo(45), status: "Active" },
		{ id: "o5", type: "medication", name: "Propofol infusion", details: "5–50 mcg/kg/min IV · RASS −2 to 0", orderedBy: "Laura Mitchell", orderedAt: minutesAgo(3100), status: "Active" },
		{ id: "o6", type: "medication", name: "Fentanyl infusion", details: "25–100 mcg/h IV · CPOT under 3", orderedBy: "Laura Mitchell", orderedAt: minutesAgo(3100), status: "Active" },
		{ id: "o7", type: "medication", name: "Heparin", details: "5,000 units subcut every 8 h", orderedBy: "Laura Mitchell", orderedAt: minutesAgo(3100), status: "Active" },
		{ id: "o8", type: "lab", name: "Blood cultures × 2", details: "Aerobic and anaerobic · 2 sites", orderedBy: "Laura Mitchell", orderedAt: minutesAgo(58), status: "Collected" },
		{ id: "o9", type: "lab", name: "Procalcitonin", details: "Once", orderedBy: "Laura Mitchell", orderedAt: minutesAgo(58), status: "Collected" },
		{ id: "o10", type: "lab", name: "Basic metabolic panel", details: "Every 6 h", orderedBy: "Laura Mitchell", orderedAt: minutesAgo(3100), status: "Scheduled" },
		{ id: "o11", type: "lab", name: "Arterial blood gas", details: "Every 4 h and as needed", orderedBy: "James Turner", orderedAt: minutesAgo(180), status: "Active" },
		{ id: "o12", type: "imaging", name: "Chest X-ray, portable", details: "Daily at 05:00", orderedBy: "Laura Mitchell", orderedAt: minutesAgo(3100), status: "Scheduled" },
		{ id: "o13", type: "respiratory", name: "Mechanical ventilation", details: "AC/VC · rate 22 · tidal volume 420 mL · FiO₂ 60% · PEEP 10", orderedBy: "James Turner", orderedAt: minutesAgo(180), status: "Active" },
		{ id: "o14", type: "nursing", name: "Vital signs", details: "Every 15 min while on vasopressors", orderedBy: "Laura Mitchell", orderedAt: minutesAgo(3100), status: "Active" },
		{ id: "o15", type: "nursing", name: "Droplet isolation", details: "Until respiratory panel results", orderedBy: "Laura Mitchell", orderedAt: minutesAgo(3200), status: "Active" },
		{ id: "o16", type: "nursing", name: "Strict intake and output", details: "Hourly", orderedBy: "Laura Mitchell", orderedAt: minutesAgo(3100), status: "Active" },
		{ id: "o17", type: "diet", name: "NPO", details: "Except medications · tube feeds held", orderedBy: "Laura Mitchell", orderedAt: minutesAgo(1300), status: "Active" },
	],
};


/** Today at hh:mm, or yesterday if that hasn't come yet: for times the alerts quote as a clock ("10:42"). */
const clock = (hours: number, minutes: number) => {
	const date = new Date();
	date.setHours(hours, minutes, 0, 0);
	if (date.getTime() > Date.now()) date.setDate(date.getDate() - 1);
	return date.toISOString();
};

const hospitals = {
	alliance: { hospital: "Alliance Community", source: "Cerner" },
	// Meditech, as in `sample-data/sample-ehr.ts` (Epic until the hospital's rename, Nov 6, 2026).
	sidney: { hospital: "Sidney Regional", source: "Meditech" },
	chadron: { hospital: "Chadron Memorial", source: "Meditech" },
	// TruBridge, as in `sample-data/sample-ehr.ts` (Demo Use Cases, Scenario 4). Was Harbor Point General (Epic) until
	// Nov 6, 2026; its patients moved to Sidney.
	bridgeport: { hospital: "Bridgeport Valley", source: "TruBridge" },
};

/** An evidence value with its source, `minutes` ago or at a clock time. */
const evidence = (label: string, source: string, at: number | string) => ({
	label,
	source,
	at: typeof at === "number" ? minutesAgo(at) : at,
});

/** The Vent-Order Mismatch Agent found the ventilator matching its order. */
const ventMatches = (settings: string): OrderAgentCheck => ({
	agent: "Vent-Order Mismatch",
	result: "No mismatch",
	detail: `Settings match the active order: ${settings}.`,
	at: minutesAgo(2),
});

/** No ventilator, so the Vent-Order Mismatch Agent has nothing to compare. */
const noVentilator = (support: string): OrderAgentCheck => ({
	agent: "Vent-Order Mismatch",
	result: "Nothing to check",
	detail: `No ventilator. ${support}.`,
	at: minutesAgo(5),
});

/** The Order-Entry Suggestion Agent read the latest results and has nothing to suggest, and why. */
const nothingToRecommend = (why: string): OrderAgentCheck => ({
	agent: "Order-Entry Suggestion",
	result: "Nothing to recommend",
	detail: why,
	at: minutesAgo(10),
});

type Recommendation = Omit<OrderRecommendation, "id" | "agent" | "suggestedAt"> & {
	agent?: string;
	suggested: number;
};

/** type, name, details, ordered by, ordered (minutes ago or a clock time), status (Active by default). */
type OrderSpec = [ActiveOrder["type"], string, string, string, number | string, string?];

/** A patient's orders from a short spec: their hospital, recommendations, agent checks and active orders. */
function patientOrders(
	id: string,
	spec: { hospital: keyof typeof hospitals; recommendations?: Recommendation[]; checks: OrderAgentCheck[]; active: OrderSpec[] },
): PatientOrders {
	return {
		...hospitals[spec.hospital],
		updatedAt: minutesAgo(2),
		writeBack: true,
		supervisor: "Joanna Smith",
		recommendations: (spec.recommendations ?? []).map(({ agent = "Order-Entry Suggestion", suggested, ...item }, index) => ({
			id: `${id}-r${index + 1}`,
			agent,
			suggestedAt: minutesAgo(suggested),
			...item,
		})),
		checks: spec.checks,
		active: spec.active.map(([type, name, details, orderedBy, orderedAt, status = "Active"], index) => ({
			id: `${id}-o${index + 1}`,
			type,
			name,
			details,
			orderedBy,
			orderedAt: typeof orderedAt === "number" ? minutesAgo(orderedAt) : orderedAt,
			status,
		})),
	};
}

const sampleOrdersByPatient: Record<string, PatientOrders> = {
	p1: sarahOrders,

	// Severe ARDS from influenza, paralyzed and proned. Electrolytes are in range, so nothing to recommend.
	p2: patientOrders("p2", {
		hospital: "sidney",
		checks: [
			ventMatches("AC/VC, rate 26, tidal volume 450 mL, FiO₂ 80%, PEEP 14"),
			nothingToRecommend("Potassium 4.2 and creatinine 1.1 need no replacement, and there's no sepsis screen."),
		],
		active: [
			["medication", "Propofol infusion", "5–50 mcg/kg/min IV · RASS −4 while paralyzed", "Marcus Reed", 2280],
			["medication", "Fentanyl infusion", "25–150 mcg/h IV · CPOT under 3", "Marcus Reed", 2280],
			["medication", "Cisatracurium infusion", "3 mcg/kg/min IV · train-of-four 1 to 2", "Joanna Smith", 960],
			["medication", "Oseltamivir", "75 mg by feeding tube every 12 h", "Marcus Reed", 2300],
			["medication", "Heparin", "5,000 units subcut every 8 h", "Marcus Reed", 2280],
			["lab", "Arterial blood gas", "Every 4 h and as needed", "Joanna Smith", 960],
			["lab", "Basic metabolic panel", "Every 12 h", "Marcus Reed", 2280, "Scheduled"],
			["imaging", "Chest X-ray, portable", "Daily at 05:00", "Marcus Reed", 2280, "Scheduled"],
			["respiratory", "Mechanical ventilation", "AC/VC · rate 26 · tidal volume 450 mL · FiO₂ 80% · PEEP 14", "Joanna Smith", 180],
			["nursing", "Prone positioning", "16 h a day · next turn at 18:00", "Joanna Smith", 960],
			["nursing", "Droplet isolation", "Influenza A", "Marcus Reed", 2300],
			["diet", "Trophic tube feeds", "10 mL/h", "Marcus Reed", 1400],
		],
	}),

	// Septic shock improving on day 3 of ceftriaxone (sulfa allergy). The bundle's repeat lactate was taken overnight.
	p3: patientOrders("p3", {
		hospital: "sidney",
		recommendations: [
			{
				kind: "sepsis-bundle",
				title: "Repeat lactate",
				order: "Lactate, whole blood · once",
				reason: "Lactate was 2.4 at the last check while on norepinephrine.",
				evidence: [evidence("Lactate 2.4", "Lab", 430), evidence("NE 0.10", "Pump", 440)],
				protocol: { kind: "sep-1", name: "SEP-1" },
				suggested: 425,
				outcome: { kind: "taken", at: minutesAgo(420), by: "James Turner", writeBack: { status: "signed", by: "Ellen Parker", at: minutesAgo(405) } },
			},
		],
		checks: [
			ventMatches("AC/VC, rate 16, tidal volume 400 mL, FiO₂ 40%, PEEP 8"),
			nothingToRecommend("Potassium 4.6 needs no replacement, and lactate has cleared to 1.6."),
		],
		active: [
			["medication", "Norepinephrine infusion", "0.01–0.5 mcg/kg/min IV · titrate to MAP 65 or more", "Ellen Parker", 6900],
			["medication", "Ceftriaxone", "2 g IV every 24 h · day 3 of 7 · sulfa allergy", "Ellen Parker", 6850],
			["medication", "Propofol infusion", "5–50 mcg/kg/min IV · RASS −2 to 0", "Ellen Parker", 6900],
			["medication", "Fentanyl infusion", "25–100 mcg/h IV · CPOT under 3", "Ellen Parker", 6900],
			["medication", "Heparin", "5,000 units subcut every 12 h · dosed for CKD", "Ellen Parker", 6900],
			["lab", "Basic metabolic panel", "Daily at 04:00", "Ellen Parker", 6900, "Scheduled"],
			["lab", "Complete blood count", "Daily at 04:00", "Ellen Parker", 6900, "Scheduled"],
			["imaging", "Renal ultrasound", "Once · rule out obstruction", "Ellen Parker", 1500, "Scheduled"],
			["respiratory", "Mechanical ventilation", "AC/VC · rate 16 · tidal volume 400 mL · FiO₂ 40% · PEEP 8", "James Turner", 600],
			["respiratory", "Spontaneous breathing trial screen", "Daily at 07:00", "Joanna Smith", 1500],
			["nursing", "Vital signs", "Every 1 h", "Ellen Parker", 6900],
			["diet", "Tube feeds", "Renal formula · 40 mL/h", "Ellen Parker", 4200],
		],
	}),

	// Cardiogenic shock, DNR: nothing in the v1 classes applies, and nothing escalates beyond goals of care.
	p4: patientOrders("p4", {
		hospital: "sidney",
		checks: [
			noVentilator("Oxygen 3 L/min by nasal cannula, as ordered"),
			nothingToRecommend("Potassium 4.9 and creatinine 1.7 need no replacement. DNR, with goals of care documented yesterday."),
		],
		active: [
			["medication", "Norepinephrine infusion", "0.01–0.3 mcg/kg/min IV · titrate to MAP 65 or more", "Daniel Reyes", 4500],
			["medication", "Dobutamine infusion", "5 mcg/kg/min IV · fixed rate", "Daniel Reyes", 4400],
			["medication", "Heparin infusion", "ACS nomogram · anti-Xa 0.3–0.7", "Daniel Reyes", 4560],
			["medication", "Amiodarone infusion", "0.5 mg/min IV", "Daniel Reyes", 2900],
			["medication", "Aspirin", "81 mg by mouth daily", "Daniel Reyes", 4560],
			["medication", "Atorvastatin", "80 mg by mouth nightly", "Daniel Reyes", 4560],
			["lab", "Troponin I", "Every 6 h", "Daniel Reyes", 4560, "Collected"],
			["lab", "Anti-Xa", "Every 6 h", "Daniel Reyes", 4560],
			["lab", "Basic metabolic panel", "Every 12 h", "Daniel Reyes", 4560, "Scheduled"],
			["imaging", "Transthoracic echo", "Once · no contrast (contrast allergy)", "Daniel Reyes", 1500, "Scheduled"],
			["respiratory", "Oxygen", "Nasal cannula 2–4 L/min · SpO₂ 92% or more", "Daniel Reyes", 4500],
			["nursing", "Code status: DNR", "Goals of care documented yesterday", "Daniel Reyes", 1500],
			["diet", "Cardiac diet", "2 g sodium · carbohydrate consistent", "Daniel Reyes", 4400],
		],
	}),

	// Status asthmaticus: potassium 3.2 on continuous albuterol, normal kidneys, so the protocol's full dose.
	p5: patientOrders("p5", {
		hospital: "sidney",
		recommendations: [
			{
				kind: "electrolyte",
				title: "Potassium chloride 40 mEq IV",
				order: "Potassium chloride 20 mEq in 100 mL · IV over 2 h · 2 doses",
				reason: "Potassium is 3.2, down from 3.9, on continuous albuterol. Creatinine is 0.7, so the full dose applies.",
				evidence: [evidence("K 3.2", "Lab", 300), evidence("K 3.9", "Lab", 1150), evidence("Creatinine 0.7", "Lab", 300)],
				protocol: { kind: "hospital", name: "Sidney electrolyte replacement" },
				suggested: 290,
				needsCosign: true,
			},
		],
		checks: [ventMatches("BiPAP, IPAP 14, EPAP 6, rate 24, FiO₂ 45%")],
		active: [
			["medication", "Albuterol, continuous nebulized", "10 mg/h", "Laura Mitchell", 1180],
			["medication", "Ipratropium nebulized", "0.5 mg every 6 h", "Laura Mitchell", 1180],
			["medication", "Methylprednisolone", "60 mg IV every 6 h", "Laura Mitchell", 1180],
			["lab", "Arterial blood gas", "Every 4 h and as needed", "James Turner", 700],
			["lab", "Basic metabolic panel", "Every 6 h", "Laura Mitchell", 1180, "Scheduled"],
			["respiratory", "BiPAP", "IPAP 14 · EPAP 6 · rate 24 · FiO₂ 45%", "James Turner", 700],
			["nursing", "Continuous pulse oximetry", "Alarm under 92%", "Laura Mitchell", 1180],
			["nursing", "Latex precautions", "Latex allergy", "Laura Mitchell", 1180],
			["diet", "NPO", "While on BiPAP · ice chips allowed", "Laura Mitchell", 1180],
		],
	}),

	// Post-op hip with delirium: sodium 131 is outside the replacement protocol, so no recommendation.
	p6: patientOrders("p6", {
		hospital: "sidney",
		checks: [
			noVentilator("Room air"),
			nothingToRecommend("Sodium 131 is outside the replacement protocol, which covers potassium, magnesium and phosphate. Potassium is 4.0."),
		],
		active: [
			["medication", "Lactated Ringer's", "75 mL/h IV", "Samuel Grant", 2600],
			["medication", "Carbidopa-levodopa", "25/100 mg by mouth 3 times a day · don't skip", "Samuel Grant", 3800],
			["medication", "Enoxaparin", "40 mg subcut daily", "Samuel Grant", 2600],
			["medication", "Acetaminophen", "1 g by mouth every 6 h", "Samuel Grant", 2600],
			["medication", "Oxycodone", "2.5 mg by mouth every 4 h as needed", "Samuel Grant", 2600],
			["lab", "Complete blood count", "Daily at 04:00", "Samuel Grant", 2600, "Scheduled"],
			["lab", "Basic metabolic panel", "Daily at 04:00", "Samuel Grant", 2600, "Scheduled"],
			["lab", "Type and screen", "Valid 72 h", "Samuel Grant", 2600],
			["nursing", "Bed exit alarm", "On at all times", "Samuel Grant", 2600],
			["nursing", "Delirium screen (CAM-ICU)", "Every shift", "Joanna Smith", 1300],
			["nursing", "Weight bearing as tolerated", "Left leg · posterior hip precautions", "Samuel Grant", 2600],
			["diet", "Regular diet", "Aspiration precautions", "Samuel Grant", 2600],
		],
	}),

	// Improving after Hartmann's. Yesterday's potassium replacement was taken; nothing new.
	p7: patientOrders("p7", {
		hospital: "sidney",
		recommendations: [
			{
				kind: "electrolyte",
				title: "Potassium chloride 20 mEq IV",
				order: "Potassium chloride 20 mEq in 100 mL · IV over 2 h · once",
				reason: "Potassium was 3.5 on IV fluids with nothing by mouth.",
				evidence: [evidence("K 3.5", "Lab", 1680)],
				protocol: { kind: "hospital", name: "Sidney electrolyte replacement" },
				suggested: 1670,
				outcome: { kind: "taken", at: minutesAgo(1650), by: "James Turner", writeBack: { status: "signed", by: "Marcus Reed", at: minutesAgo(1630) } },
			},
		],
		checks: [noVentilator("Room air since this morning"), nothingToRecommend("Potassium is 3.7 after yesterday's replacement.")],
		active: [
			["medication", "Lactated Ringer's", "100 mL/h IV", "Marcus Reed", 360],
			["medication", "Piperacillin-tazobactam", "4.5 g IV every 8 h", "Marcus Reed", 5000],
			["medication", "Vancomycin", "1,000 mg IV every 12 h · pharmacy to dose · MRSA", "Marcus Reed", 2900],
			["medication", "Hydromorphone PCA", "0.2 mg every 10 min · codeine allergy", "Marcus Reed", 4800],
			["medication", "Levothyroxine", "75 mcg IV daily", "Marcus Reed", 4800],
			["medication", "Enoxaparin", "40 mg subcut daily", "Marcus Reed", 4800],
			["lab", "Complete blood count", "Daily at 04:00", "Marcus Reed", 4800, "Scheduled"],
			["lab", "Basic metabolic panel", "Daily at 04:00", "Marcus Reed", 4800, "Scheduled"],
			["nursing", "Contact isolation", "MRSA in the wound", "Marcus Reed", 2900],
			["nursing", "Ostomy and wound care", "Twice a day", "Marcus Reed", 4800],
			["diet", "Clear liquids", "Advance as tolerated", "Marcus Reed", 600],
		],
	}),

	// Upper GI bleed after clipping, stable. Nothing in the v1 classes applies.
	p8: patientOrders("p8", {
		hospital: "sidney",
		checks: [noVentilator("Room air"), nothingToRecommend("Potassium 4.1 needs no replacement, and there's no sepsis screen.")],
		active: [
			["medication", "Pantoprazole infusion", "8 mg/h IV · 72 h", "Laura Mitchell", 1980],
			["medication", "Thiamine", "100 mg IV daily", "Laura Mitchell", 1980],
			["medication", "Folic acid", "1 mg IV daily", "Laura Mitchell", 1980],
			["medication", "Lorazepam", "1–2 mg IV per CIWA as needed", "Laura Mitchell", 1980],
			["lab", "Hemoglobin", "Every 6 h", "Laura Mitchell", 1980],
			["lab", "Type and crossmatch", "2 units on hold", "Laura Mitchell", 1980],
			["lab", "Basic metabolic panel", "Daily at 04:00", "Laura Mitchell", 1980, "Scheduled"],
			["nursing", "CIWA assessment", "Every 4 h", "Laura Mitchell", 1980],
			["nursing", "Two large-bore IVs", "Keep in place", "Laura Mitchell", 1980],
			["diet", "Clear liquids", "Advance tomorrow if hemoglobin holds", "Laura Mitchell", 600],
		],
	}),

	// The ventilator reads PEEP 8 against James Turner's order of 10 from 10:42 (his Vent-Order Mismatch alert). Sepsis
	// Sniffer has him as a candidate: lactate 2.6 and MAP 64, so a repeat lactate and 30 mL/kg fluids.
	p9: patientOrders("p9", {
		hospital: "sidney",
		recommendations: [
			{
				agent: "Vent-Order Mismatch",
				kind: "vent-order",
				title: "Set PEEP to 10, as ordered",
				order: "Ventilator PEEP 10 cmH₂O · matches the active order",
				reason:
					"The ventilator has read PEEP 8 since 10:15. The active order from 10:42 is PEEP 10. Accept to ask respiratory therapy to set 10, or Modify to change the order to 8.",
				evidence: [
					evidence("PEEP 8", "Ventilator", 1),
					evidence("Order PEEP 10", "Meditech", clock(10, 42)),
					evidence("No change since 10:15", "Ventilator", clock(10, 15)),
				],
				protocol: { kind: "intercept", name: "Intercept vent-order alignment" },
				suggested: 18,
			},
			{
				kind: "sepsis-bundle",
				title: "Lactated Ringer's 2,340 mL IV",
				order: "Lactated Ringer's 2,340 mL (30 mL/kg) · IV in 500 mL boluses · reassess after each",
				reason: "MAP is 64 with lactate 2.6, so SEP-1 asks for 30 mL/kg within 3 h of time zero.",
				evidence: [evidence("MAP 64", "Monitor", 1), evidence("Lactate 2.6", "Lab", 55)],
				protocol: { kind: "sep-1", name: "SEP-1" },
				suggested: 40,
				needsCosign: true,
			},
			{
				kind: "sepsis-bundle",
				title: "Repeat lactate",
				order: "Lactate, whole blood · once",
				dueAt: minutesAgo(-305),
				reason: "Lactate rose from 1.9 to 2.6, so SEP-1 asks for a repeat within 6 h of time zero.",
				evidence: [evidence("Lactate 2.6", "Lab", 55), evidence("Lactate 1.9", "Lab", 400)],
				protocol: { kind: "sep-1", name: "SEP-1" },
				suggested: 40,
				needsCosign: true,
			},
		],
		checks: [nothingToRecommend("Potassium 3.9 needs no replacement.")],
		active: [
			["respiratory", "Mechanical ventilation", "AC/VC · rate 20 · tidal volume 440 mL · FiO₂ 50% · PEEP 10", "James Turner", clock(10, 42)],
			["medication", "Ampicillin-sulbactam", "3 g IV every 6 h", "Laura Mitchell", 1700],
			["medication", "Propofol infusion", "5–50 mcg/kg/min IV · RASS −2 to 0", "Laura Mitchell", 1560],
			["medication", "Fentanyl infusion", "25–100 mcg/h IV · morphine allergy", "Laura Mitchell", 1560],
			["medication", "Ipratropium-albuterol nebulized", "Every 6 h · COPD", "Laura Mitchell", 1560],
			["medication", "Metoprolol tartrate", "25 mg by feeding tube twice a day · hold for MAP under 65", "Laura Mitchell", 1560],
			["medication", "Heparin", "5,000 units subcut every 8 h", "Laura Mitchell", 1560],
			["lab", "Arterial blood gas", "Every 4 h and as needed", "James Turner", clock(10, 42)],
			["lab", "Basic metabolic panel", "Daily at 04:00", "Laura Mitchell", 1560, "Scheduled"],
			["imaging", "Chest X-ray, portable", "Daily at 05:00", "Laura Mitchell", 1560, "Scheduled"],
			["nursing", "Aspiration precautions", "Head of bed 30° or more", "Laura Mitchell", 1560],
			["diet", "NPO", "Tube feeds held · speech evaluation after extubation", "Laura Mitchell", 1560],
		],
	}),

	// Necrotizing soft tissue infection on CRRT. Potassium 5.4 is CRRT's to manage, so no replacement; the bundle's
	// fluids were declined for end-stage kidney disease.
	p10: patientOrders("p10", {
		hospital: "sidney",
		recommendations: [
			{
				kind: "sepsis-bundle",
				title: "Lactated Ringer's 2,220 mL IV",
				order: "Lactated Ringer's 2,220 mL (30 mL/kg) · IV in 500 mL boluses",
				reason: "MAP was under 65 with lactate 2.2 at time zero.",
				evidence: [evidence("MAP 59", "Monitor", 380), evidence("Lactate 2.2", "Lab", 420)],
				protocol: { kind: "sep-1", name: "SEP-1" },
				suggested: 370,
				outcome: {
					kind: "declined",
					at: minutesAgo(340),
					by: "Joanna Smith",
					rationale: "End-stage kidney disease on CRRT. Gave 500 mL and reassessing.",
				},
			},
			{
				kind: "sepsis-bundle",
				title: "Repeat lactate",
				order: "Lactate, whole blood · once",
				reason: "The initial lactate was over 2.",
				evidence: [evidence("Lactate 2.2", "Lab", 420)],
				protocol: { kind: "sep-1", name: "SEP-1" },
				suggested: 110,
				outcome: { kind: "taken", at: minutesAgo(100), by: "Joanna Smith", writeBack: { status: "signed", by: "Nathan Brooks", at: minutesAgo(90) } },
			},
		],
		checks: [
			noVentilator("Oxygen 2 L/min by nasal cannula, as ordered"),
			nothingToRecommend("Potassium 5.4 is managed by CRRT, so replacement doesn't apply."),
		],
		active: [
			["medication", "Norepinephrine infusion", "0.01–0.3 mcg/kg/min IV · titrate to MAP 65 or more", "Nathan Brooks", 400],
			["medication", "Vancomycin", "Per pharmacy · dosed for CRRT", "Nathan Brooks", 1600],
			["medication", "Piperacillin-tazobactam", "4.5 g IV every 8 h · dosed for CRRT", "Nathan Brooks", 1600],
			["medication", "Clindamycin", "900 mg IV every 8 h · toxin suppression", "Nathan Brooks", 1600],
			["medication", "CRRT (CVVHDF)", "Citrate · effluent 25 mL/kg/h · net removal 0 mL/h", "Nathan Brooks", 1300],
			["lab", "Ionized calcium", "Every 6 h on citrate", "Nathan Brooks", 1300],
			["lab", "Basic metabolic panel", "Every 6 h", "Nathan Brooks", 1300],
			["lab", "CK", "Daily at 04:00", "Nathan Brooks", 1300, "Scheduled"],
			["lab", "Blood cultures × 2", "Aerobic and anaerobic · 2 sites", "Nathan Brooks", 375, "Collected"],
			["respiratory", "Oxygen", "Nasal cannula 1–4 L/min · SpO₂ 92% or more", "Nathan Brooks", 1300],
			["nursing", "Wound care", "Left thigh · dressing change twice a day", "Nathan Brooks", 1300],
			["nursing", "Return to the OR", "Re-look debridement tomorrow at 07:30", "Nathan Brooks", 600, "Scheduled"],
			["diet", "NPO after midnight", "Renal, carbohydrate-consistent until then", "Nathan Brooks", 600],
		],
	}),

	// Hypertensive emergency with PRES, on nicardipine. Magnesium 2.0 is in range: no replacement, and glucose isn't resulted.
	p11: patientOrders("p11", {
		hospital: "sidney",
		checks: [
			noVentilator("Room air"),
			nothingToRecommend("Magnesium 2.0 is in range, so no replacement."),
		],
		active: [
			["medication", "Nicardipine infusion", "2.5–15 mg/h IV · systolic under 160", "Helen Foster", 1500],
			["medication", "Levetiracetam", "500 mg IV every 12 h", "Helen Foster", 1800],
			["medication", "Oseltamivir", "75 mg by mouth every 12 h", "Helen Foster", 1800],
			["medication", "Acetaminophen", "1 g by mouth every 6 h", "Helen Foster", 1800],
			["lab", "Magnesium level", "Daily at 04:00", "Helen Foster", 1800],
			["lab", "Platelets, AST, LDH", "Every 12 h", "Helen Foster", 1800, "Scheduled"],
			["nursing", "Neuro checks and urine output", "Every 1 h", "Helen Foster", 1800],
			["nursing", "Droplet isolation", "Influenza B", "Helen Foster", 1850],
			["nursing", "Seizure precautions", "Padded rails, suction at the bedside", "Helen Foster", 1800],
			["diet", "Clear liquids", "Advance as tolerated", "Helen Foster", 1500],
		],
	}),

	// Stroke after thrombectomy, DNR. Glucose 182 is one value under the enrollment threshold of two over 180.
	p12: patientOrders("p12", {
		hospital: "sidney",
		checks: [
			noVentilator("Oxygen 2 L/min by nasal cannula, as ordered"),
			nothingToRecommend("Glucose 182 is one result over 180; enrollment needs two in 12 h. Potassium 4.1. DNR, per her advance directive."),
		],
		active: [
			["medication", "Sodium chloride 3%", "30 mL/h IV by central line · sodium goal 145–155 · hold for sodium over 155", "Victor Hale", 1150],
			["lab", "Sodium", "Every 6 h while on 3% saline", "Victor Hale", 1150],
			["medication", "Aspirin", "81 mg by feeding tube daily · from 24 h after thrombectomy", "Victor Hale", 1500],
			["medication", "Atorvastatin", "80 mg by feeding tube nightly", "Victor Hale", 2800],
			["medication", "Heparin", "5,000 units subcut every 12 h", "Victor Hale", 1500],
			["lab", "Glucose, fingerstick", "Every 6 h", "Victor Hale", 2800],
			["lab", "Basic metabolic panel", "Daily at 04:00", "Victor Hale", 2800, "Scheduled"],
			["imaging", "MRI brain without contrast", "Tomorrow", "Victor Hale", 600, "Scheduled"],
			["respiratory", "Oxygen", "Nasal cannula 1–3 L/min · SpO₂ 94% or more", "Victor Hale", 2800],
			["nursing", "Neuro checks", "Every 2 h", "Victor Hale", 2800],
			["nursing", "Code status: DNR", "Per advance directive", "Victor Hale", 2900],
			["diet", "NPO", "Dysphagia · speech evaluation today", "Victor Hale", 2800],
		],
	}),

	// VA-ECMO after STEMI. Potassium 5.1 is high, so no replacement; the concern is ECMO flow, outside the v1 classes.
	p13: patientOrders("p13", {
		hospital: "sidney",
		checks: [
			ventMatches("PC, rate 10, FiO₂ 40%, PEEP 10"),
			nothingToRecommend("Potassium 5.1 is high, so no replacement. ECMO flow and pressors are outside the recommendation classes."),
		],
		active: [
			["medication", "Epinephrine infusion", "0.01–0.2 mcg/kg/min IV", "Daniel Reyes", 5800],
			["medication", "Norepinephrine infusion", "0.01–0.3 mcg/kg/min IV · titrate to MAP 65 or more", "Daniel Reyes", 5900],
			["medication", "Heparin infusion", "ECMO nomogram · anti-Xa 0.3–0.5", "Daniel Reyes", 5900],
			["medication", "Fentanyl infusion", "25–100 mcg/h IV · CPOT under 3", "Daniel Reyes", 5900],
			["medication", "Aspirin", "81 mg by feeding tube daily", "Daniel Reyes", 5900],
			["lab", "Lactate", "Every 2 h", "Daniel Reyes", 330, "Collected"],
			["lab", "Anti-Xa", "Every 6 h", "Daniel Reyes", 5900],
			["lab", "Plasma free hemoglobin", "Daily at 04:00", "Daniel Reyes", 5900, "Scheduled"],
			["imaging", "Chest X-ray, portable", "Daily at 05:00", "Daniel Reyes", 5900, "Scheduled"],
			["respiratory", "Mechanical ventilation", "PC · rate 10 · inspiratory pressure 15 · FiO₂ 40% · PEEP 10 (lung rest)", "Daniel Reyes", 5800],
			["nursing", "VA-ECMO", "Flow 3.8 L/min · sweep 3 L/min", "Daniel Reyes", 330],
			["nursing", "Distal limb perfusion checks", "Every 1 h", "Daniel Reyes", 5900],
			["diet", "Trophic tube feeds", "10 mL/h", "Daniel Reyes", 4300],
		],
	}),

	// New atrial fibrillation: magnesium 1.7 is under the protocol's 2.0 target, so replacement.
	p14: patientOrders("p14", {
		hospital: "sidney",
		recommendations: [
			{
				kind: "electrolyte",
				title: "Magnesium sulfate 2 g IV",
				order: "Magnesium sulfate 2 g in 50 mL · IV over 1 h · once",
				reason: "Magnesium is 1.7, under the protocol's target of 2.0 in atrial fibrillation. Creatinine is 0.8.",
				evidence: [evidence("Mg 1.7", "Lab", 240), evidence("Creatinine 0.8", "Lab", 240), evidence("K 3.6", "Lab", 240)],
				protocol: { kind: "hospital", name: "Sidney electrolyte replacement" },
				suggested: 230,
				needsCosign: true,
			},
		],
		checks: [noVentilator("Room air")],
		active: [
			["medication", "Diltiazem infusion", "5–15 mg/h IV · heart rate under 110", "Ellen Parker", 300],
			["medication", "Apixaban", "5 mg by mouth twice a day", "Ellen Parker", 280],
			["lab", "TSH", "Once", "Ellen Parker", 300, "Collected"],
			["lab", "Basic metabolic panel and magnesium", "Daily at 04:00", "Ellen Parker", 300, "Scheduled"],
			["imaging", "Transthoracic echo", "Once", "Ellen Parker", 280, "Scheduled"],
			["nursing", "Continuous telemetry", "Alarm for heart rate over 130", "Ellen Parker", 300],
			["nursing", "Code status", "Not yet documented · discuss today", "Joanna Smith", 120, "Pending"],
			["respiratory", "CPAP at night", "Home settings · sleep apnea", "Ellen Parker", 280],
			["diet", "Cardiac diet", "2 g sodium", "Ellen Parker", 280],
		],
	}),

	// Heart failure on the med-surg floor: her oxygen is at the order's 4 L ceiling. The CHF pathway (Scenario 1) isn't
	// built yet, so no agent recommends anything for her heart failure.
	p15: patientOrders("p15", {
		hospital: "chadron",
		checks: [
			noVentilator("Nasal cannula at 4 L/min"),
			nothingToRecommend("Potassium 4.6 and magnesium 2.0 are in range. Glucose 186 is covered by her sliding scale."),
		],
		active: [
			["medication", "Furosemide", "80 mg IV every 12 h", "Tom Weller", 1130],
			["medication", "Carvedilol", "6.25 mg by mouth twice a day", "Tom Weller", 1130],
			["medication", "Sacubitril-valsartan", "24/26 mg by mouth twice a day", "Tom Weller", 1130],
			["medication", "Heparin", "5,000 units SC every 8 h", "Tom Weller", 1130],
			["lab", "Basic metabolic panel and BNP", "Now", "Tom Weller", 140, "Collected"],
			["lab", "Basic metabolic panel and BNP", "Daily at 05:00", "Tom Weller", 1130, "Scheduled"],
			["imaging", "Chest X-ray", "In the morning", "Tom Weller", 1130, "Scheduled"],
			["respiratory", "Oxygen by nasal cannula", "Titrate to SpO₂ 92% or more, up to 4 L/min", "Tom Weller", 1130],
			["nursing", "Strict intake and output", "Every 4 h", "Tom Weller", 1130],
			["nursing", "Daily weight", "Before breakfast, same scale", "Tom Weller", 1130],
			["nursing", "Vital signs", "Every 4 h · continuous pulse oximetry", "Tom Weller", 1130],
			["nursing", "Fall precautions", "Bed alarm on · assist to stand", "Tom Weller", 1130],
			["diet", "Cardiac diet", "2 g sodium · 1.5 L fluid restriction", "Tom Weller", 1130],
		],
	}),

	// Pneumonia on the same floor, improving. Nothing in the v1 classes applies.
	p16: patientOrders("p16", {
		hospital: "chadron",
		checks: [
			noVentilator("Nasal cannula at 2 L/min"),
			nothingToRecommend("Sodium 136 and creatinine 1.1 are in range."),
		],
		active: [
			["medication", "Ceftriaxone", "1 g IV daily", "Tom Weller", 3950],
			["medication", "Azithromycin", "500 mg by mouth daily · 5 days", "Tom Weller", 3950],
			["medication", "Tiotropium", "18 mcg inhaled daily", "Tom Weller", 3950],
			["medication", "Enoxaparin", "40 mg SC daily", "Tom Weller", 3950],
			["lab", "Complete blood count", "Daily at 05:00", "Tom Weller", 3950, "Scheduled"],
			["respiratory", "Oxygen by nasal cannula", "Titrate to SpO₂ 90% or more · COPD", "Tom Weller", 3950],
			["nursing", "Code status", "DNR · do not resuscitate", "Tom Weller", 3950],
			["nursing", "Fall precautions", "Bed alarm on · walker", "Tom Weller", 3950],
			["diet", "Regular diet", "", "Tom Weller", 3950],
		],
	}),

	// Cellulitis on the same floor, improving. Nothing in the v1 classes applies.
	p19: patientOrders("p19", {
		hospital: "chadron",
		checks: [noVentilator("Room air"), nothingToRecommend("Creatinine 0.9 is in range; glucose is on the sliding scale.")],
		active: [
			["medication", "Cefazolin", "2 g IV every 8 h", "Tom Weller", 2350],
			["medication", "Insulin glargine", "20 units SC at bedtime", "Tom Weller", 2350],
			["medication", "Insulin lispro", "Sliding scale SC before meals and at bedtime", "Tom Weller", 2350],
			["medication", "Enoxaparin", "40 mg SC daily", "Tom Weller", 2350],
			["lab", "Complete blood count", "Daily at 05:00", "Tom Weller", 2350, "Scheduled"],
			["lab", "Glucose, point of care", "Before meals and at bedtime", "Tom Weller", 2350],
			["nursing", "Elevate the left leg", "Mark the redness border every shift", "Tom Weller", 2350],
			["diet", "Carbohydrate-controlled diet", "", "Tom Weller", 2350],
		],
	}),

	// Kidney injury from dehydration, improving. Nothing in the v1 classes applies.
	p20: patientOrders("p20", {
		hospital: "chadron",
		checks: [noVentilator("Room air"), nothingToRecommend("Potassium 4.2 is in range; creatinine 1.4 is falling.")],
		active: [
			["medication", "Normal saline", "100 mL/h IV", "Tom Weller", 600],
			["medication", "Heparin", "5,000 units SC every 8 h", "Tom Weller", 1750],
			["lab", "Basic metabolic panel", "Daily at 05:00", "Tom Weller", 1750, "Scheduled"],
			["nursing", "Strict intake and output", "Every 4 h", "Tom Weller", 1750],
			["diet", "Regular diet", "Encourage fluids by mouth", "Tom Weller", 1750],
		],
	}),

	// Post-op day 1, potassium 3.8 is in range. Nothing in the v1 classes applies.
	p17: patientOrders("p17", {
		hospital: "alliance",
		checks: [noVentilator("Nasal cannula at 2 L/min"), nothingToRecommend("Potassium 3.8 and creatinine 0.8 are in range.")],
		active: [
			["medication", "Lactated Ringer's", "100 mL/h IV", "Marcus Reed", 600],
			["medication", "Hydromorphone PCA", "0.3 mg every 10 min · 4-hour limit 6 mg", "Marcus Reed", 60],
			["medication", "Cefazolin", "2 g IV every 8 h · 24 h after surgery", "Marcus Reed", 1200],
			["medication", "Enoxaparin", "40 mg SC daily · from tomorrow", "Marcus Reed", 1200],
			["lab", "Complete blood count", "Daily at 04:00", "Marcus Reed", 1200, "Scheduled"],
			["lab", "Basic metabolic panel", "Daily at 04:00", "Marcus Reed", 1200, "Scheduled"],
			["nursing", "Nasogastric tube to low suction", "Record output every 4 h", "Marcus Reed", 1200],
			["respiratory", "Incentive spirometry", "Every hour awake", "Marcus Reed", 1200],
			["diet", "Nothing by mouth", "Ice chips", "Marcus Reed", 1200],
		],
	}),

	// DKA, nearly closed: the move to subcutaneous insulin is the team's plan, not a v1 class.
	p18: patientOrders("p18", {
		hospital: "alliance",
		checks: [noVentilator("Room air"), nothingToRecommend("Potassium 4.1 and phosphate 2.4 are covered by the DKA protocol.")],
		active: [
			["medication", "Insulin regular infusion", "DKA protocol · 3 units/h", "Marcus Reed", 1250],
			["medication", "Dextrose 5% with 0.45% saline", "125 mL/h IV", "Marcus Reed", 540],
			["medication", "Insulin glargine", "18 units SC once at 09:00", "Marcus Reed", 40, "Pending"],
			["medication", "Levothyroxine", "88 mcg by mouth daily", "Marcus Reed", 1200],
			["lab", "Glucose, point of care", "Every hour", "Marcus Reed", 1250],
			["lab", "Basic metabolic panel", "Every 4 h", "Marcus Reed", 1250, "Scheduled"],
			["nursing", "Diabetes education", "Today", "Marcus Reed", 40],
			["diet", "Consistent carbohydrate diet", "", "Marcus Reed", 120],
		],
	}),

	// Hip hemiarthroplasty, post-op day 1, on 2 L. Nothing in the v1 classes applies.
	p22: patientOrders("p22", {
		hospital: "alliance",
		checks: [noVentilator("Nasal cannula at 2 L/min"), nothingToRecommend("Potassium 4.0 and creatinine 1.0 are in range; hemoglobin 9.4 is expected after surgery.")],
		active: [
			["medication", "Lactated Ringer's", "75 mL/h IV", "Marcus Reed", 480],
			["medication", "Cefazolin", "2 g IV every 8 h · 24 h after surgery", "Marcus Reed", 1400],
			["medication", "Enoxaparin", "40 mg SC daily · from today", "Marcus Reed", 1400],
			["lab", "Complete blood count", "Daily at 04:00", "Marcus Reed", 1400, "Scheduled"],
			["nursing", "Fall precautions", "Bed alarm on, call light in reach", "Marcus Reed", 1400],
			["nursing", "Wean oxygen", "To keep SpO₂ 92% or more", "Marcus Reed", 120],
			["nursing", "Physical therapy", "Twice a day · weight bearing as tolerated", "Marcus Reed", 1400],
			["diet", "Regular diet", "", "Marcus Reed", 1400],
		],
	}),

	// Bridgeport's floor (Nov 6, 2026): nothing in the v1 classes applies to any of them.
	// Diverticulitis, improving on day 2.
	p25: patientOrders("p25", {
		hospital: "bridgeport",
		checks: [noVentilator("Room air"), nothingToRecommend("Potassium 3.9 and creatinine 1.0 are in range.")],
		active: [
			["medication", "Lactated Ringer's", "75 mL/h IV", "Paul Sorensen", 720],
			["medication", "Ceftriaxone", "2 g IV daily", "Paul Sorensen", 2600],
			["medication", "Metronidazole", "500 mg IV every 8 h", "Paul Sorensen", 2600],
			["medication", "Enoxaparin", "40 mg SC daily", "Paul Sorensen", 2600],
			["lab", "Complete blood count", "Daily at 05:00", "Paul Sorensen", 2600, "Scheduled"],
			["nursing", "Vital signs", "Every 4 h", "Paul Sorensen", 2600],
			["diet", "Clear liquid diet", "Advance to low-residue as tolerated", "Paul Sorensen", 1100],
		],
	}),

	// Influenza A pneumonia on 2 L; sodium 133 is mild and rising.
	p26: patientOrders("p26", {
		hospital: "bridgeport",
		checks: [
			noVentilator("Nasal cannula at 2 L/min"),
			nothingToRecommend("Sodium 133 is mild and rising; potassium 4.0 needs no replacement."),
		],
		active: [
			["medication", "Oseltamivir", "30 mg by mouth every 12 h · renal dose", "Paul Sorensen", 1060],
			["medication", "Ceftriaxone", "1 g IV daily · until the sputum culture is back", "Paul Sorensen", 1060],
			["medication", "Heparin", "5,000 units SC every 8 h", "Paul Sorensen", 1060],
			["lab", "Sputum culture", "Once", "Paul Sorensen", 1060, "Collected"],
			["lab", "Basic metabolic panel and CBC", "Daily at 05:00", "Paul Sorensen", 1060, "Scheduled"],
			["respiratory", "Oxygen by nasal cannula", "Titrate to SpO₂ 92% or more, up to 4 L/min", "Paul Sorensen", 1060],
			["nursing", "Droplet isolation", "Influenza A", "Paul Sorensen", 1140],
			["nursing", "Code status", "DNR · do not resuscitate", "Paul Sorensen", 1080],
			["diet", "Regular diet", "Encourage fluids", "Paul Sorensen", 1060],
		],
	}),

	// Rehab in a swing bed after a knee replacement.
	p27: patientOrders("p27", {
		hospital: "bridgeport",
		checks: [noVentilator("Room air"), nothingToRecommend("Potassium 4.3 and creatinine 0.9 are in range.")],
		active: [
			["medication", "Acetaminophen", "1,000 mg by mouth every 8 h", "Paul Sorensen", 4150],
			["medication", "Oxycodone", "5 mg by mouth every 4 h as needed · before therapy", "Paul Sorensen", 4150],
			["medication", "Aspirin", "81 mg by mouth twice a day · 4 weeks after surgery", "Paul Sorensen", 4150],
			["lab", "Complete blood count", "Twice a week", "Paul Sorensen", 4150, "Scheduled"],
			["nursing", "Physical therapy", "Twice a day · weight bearing as tolerated", "Paul Sorensen", 4150],
			["nursing", "Occupational therapy", "Daily", "Paul Sorensen", 4150],
			["nursing", "Fall precautions", "Bed alarm on · walker", "Paul Sorensen", 4150],
			["diet", "Carbohydrate-controlled diet", "", "Paul Sorensen", 4150],
		],
	}),

	// Upper GI bleed under observation; hemoglobin holding, the endoscopy next.
	p28: patientOrders("p28", {
		hospital: "bridgeport",
		checks: [noVentilator("Room air"), nothingToRecommend("Hemoglobin 10.6 is holding; creatinine 0.8 is in range.")],
		active: [
			["nursing", "Place in observation", "Bed 4", "Paul Sorensen", 955],
			["medication", "Normal saline", "75 mL/h IV", "Paul Sorensen", 480],
			["medication", "Pantoprazole", "40 mg IV every 12 h", "Paul Sorensen", 940],
			["lab", "Hemoglobin and hematocrit", "Every 6 h", "Paul Sorensen", 940],
			["lab", "Type and screen", "Once", "Ryan Mercer", 1000, "Resulted"],
			["nursing", "Upper endoscopy", "Visiting general surgeon · consent signed", "Paul Sorensen", 900, "Scheduled"],
			["nursing", "Hold NSAIDs and aspirin", "", "Paul Sorensen", 940],
			["nursing", "Orthostatic vital signs", "Every 8 h", "Paul Sorensen", 940],
			["diet", "Nothing by mouth", "For the endoscopy", "Paul Sorensen", 940],
		],
	}),

	// Asthma in the ED, better after three nebulizers; potassium 3.6 after albuterol.
	p29: patientOrders("p29", {
		hospital: "bridgeport",
		checks: [
			noVentilator("Room air, SpO₂ 96%"),
			nothingToRecommend("Potassium 3.6 is in range after albuterol and needs no replacement."),
		],
		active: [
			["medication", "Ipratropium-albuterol", "3 mL nebulized every 20 min × 3", "Ryan Mercer", 172, "Completed"],
			["medication", "Prednisone", "50 mg by mouth once", "Ryan Mercer", 165, "Completed"],
			["medication", "Albuterol", "2.5 mg nebulized every 4 h", "Ryan Mercer", 100],
			["lab", "Basic metabolic panel and CBC", "Once", "Ryan Mercer", 175, "Resulted"],
			["imaging", "Chest X-ray, 2 views", "Once", "Ryan Mercer", 175, "Resulted"],
			["nursing", "Peak flow", "Before and after each nebulizer", "Ryan Mercer", 172],
			["nursing", "Continuous pulse oximetry", "Alarm for SpO₂ under 92%", "Ryan Mercer", 175],
			["diet", "Regular diet", "", "Ryan Mercer", 100],
		],
	}),
};

/**
 * Dale Reynolds (Scenario 2): the ED's orders before the hub's COPD pathway, built when the scenario's first beat plays.
 * BiPAP is the ED physician's, without a repeat gas yet; the pathway (in his alert) adds the checkpoints.
 */
const sampleScenario2Orders = () =>
	patientOrders("p21", {
		hospital: "alliance",
		checks: [
			noVentilator("BiPAP, IPAP 12 / EPAP 5 cmH₂O, FiO₂ 35%"),
			nothingToRecommend("Potassium 4.3 and creatinine 0.9 are in range. Bicarbonate 33 is his chronic compensation."),
		],
		active: [
			["respiratory", "BiPAP", "IPAP 12 / EPAP 5 cmH₂O, FiO₂ 35% · target SpO₂ 88–92%", "Brian Keller", 20],
			["medication", "Ipratropium-albuterol", "3 mL nebulized every 4 h, in line", "Brian Keller", 36],
			["medication", "Methylprednisolone", "40 mg IV every 24 h", "Brian Keller", 30],
			["medication", "Azithromycin", "500 mg IV every 24 h", "Brian Keller", 20],
			["lab", "Arterial blood gas", "Once", "Brian Keller", 38, "Resulted"],
			["lab", "Sputum culture", "Once", "Brian Keller", 32, "Collected"],
			["imaging", "Chest X-ray, portable", "Once", "Brian Keller", 38, "Resulted"],
			["nursing", "Continuous pulse oximetry and cardiac monitor", "Alarm for SpO₂ under 85%", "Brian Keller", 40],
			["nursing", "Nothing by mouth", "While on BiPAP", "Brian Keller", 20],
		],
	});

/**
 * Rosa Medina (Scenario 3): Sidney ED's orders at the sepsis screen, built when the scenario's first beat plays. The
 * first labs and the doses given before it are done; with the screen, Jenna Collins, NP ordered blood cultures ×2 and
 * piperacillin-tazobactam after them (renally dosed after a full first dose). The rest of the bundle (fluids, the repeat
 * lactate, norepinephrine) comes from her alert's pathway during the scenario, so it isn't suggested here. Glycemic
 * management enrollment is (type 2 diabetes, glucose 390), without proposing an insulin dose. The monitoring and IV
 * orders are illustrative.
 */
const sampleScenario3Orders = () =>
	patientOrders("p23", {
		hospital: "sidney",
		recommendations: [
			{
				kind: "glucose",
				title: "Enroll in glycemic management",
				order: "Glycemic management protocol · enrollment",
				reason: "Type 2 diabetes on insulin, with glucose 390 in septic shock.",
				evidence: [evidence("Glucose 390", "Lab", 22), evidence("A1c 10.8%", "Chart", 60 * 24 * 50)],
				protocol: { kind: "glycemic", name: "Glycemic management system" },
				suggested: 1,
			},
		],
		checks: [
			noVentilator("Room air, SpO₂ 95%"),
			{
				agent: "Order-Entry Suggestion",
				result: "Sepsis bundle in the alert",
				detail: "The sepsis screen just fired. Its bundle (cultures, antibiotics, fluids, repeat lactate) is tracked in her alert's pathway, not suggested here. Potassium 5.1 needs no replacement.",
				at: minutesAgo(0),
			},
		],
		active: [
			["lab", "Blood cultures ×2", "Two sets from two sites, before antibiotics", "Jenna Collins", 0, "Pending"],
			["medication", "Piperacillin-tazobactam", "4.5 g IV once now, after blood cultures, then 2.25 g IV every 6 h · renal dose, CrCl about 27 mL/min", "Jenna Collins", 0],
			["medication", "Acetaminophen", "1,000 mg by mouth once", "Jenna Collins", 44, "Completed"],
			["medication", "Ondansetron", "4 mg IV every 6 h as needed for nausea", "Jenna Collins", 44],
			["lab", "Lactate", "Once", "Jenna Collins", 47, "Resulted"],
			["lab", "CBC with differential", "Once", "Jenna Collins", 47, "Resulted"],
			["lab", "Basic metabolic panel", "Once", "Jenna Collins", 47, "Resulted"],
			["lab", "Urinalysis with reflex culture", "Once", "Jenna Collins", 47, "Resulted"],
			["nursing", "Cardiac monitor and continuous pulse oximetry", "Vital signs every 15 min", "Jenna Collins", 45],
			["nursing", "Two peripheral IVs", "18 g or larger", "Jenna Collins", 45],
			["nursing", "Medical interpreter", "Spanish, for consent and care decisions", "Jenna Collins", 45],
			["diet", "Nothing by mouth", "Vomiting", "Jenna Collins", 45],
		],
	});

/**
 * Tyler Kessler (Scenario 4): Bridgeport's orders for his DKA, built when the scenario's first beat plays. The ED
 * physician's first orders (a liter of saline, ondansetron, the first labs) and the on-call APP's admission by phone,
 * then the DKA protocol started from the hub and co-signed by the APP: the insulin infusion, the fluids and potassium
 * by the hourly checks, and those checks. Insulin dosing is the protocol's, not a recommendation, so nothing is suggested
 * here. Ryan Mercer, the ED physician, and the nursing orders' details are illustrative.
 */
const sampleScenario4Orders = () =>
	patientOrders("p24", {
		hospital: "bridgeport",
		checks: [
			noVentilator("Room air, SpO₂ 99%"),
			{
				agent: "Order-Entry Suggestion",
				result: "DKA protocol in the alert",
				detail: "Insulin, fluids and potassium follow the DKA protocol's hourly checks in his alert, so nothing is suggested here. Potassium 5.6 needs no replacement while it's over 5.2.",
				at: minutesAgo(0),
			},
		],
		active: [
			["medication", "Insulin regular infusion", "DKA protocol · 0.1 units/kg/h, 7 units/h to start, then by the hourly glucose · no bolus", "Joanna Smith", 0],
			["medication", "0.9% saline", "1 L bolus, then 1,000 mL/h for 1 L; then 0.45% saline + KCl 20 mEq/L at 250 mL/h", "Ryan Mercer", 35],
			["medication", "D5 0.45% saline + KCl 20 mEq/L", "150 mL/h once glucose is under 250", "Joanna Smith", 0, "Pending"],
			[
				"medication",
				"Potassium chloride",
				"DKA protocol · none while potassium is over 5.2; 20 mEq/L in fluids from 3.3 to 5.2; 20 mEq/h IV under 3.3, with insulin held",
				"Joanna Smith",
				0,
			],
			["medication", "Ondansetron", "4 mg IV every 6 h as needed for nausea", "Ryan Mercer", 32],
			["lab", "Glucose, point of care", "Every hour on the insulin drip", "Joanna Smith", 0],
			["lab", "Basic metabolic panel", "Every hour on the insulin drip · potassium, anion gap, bicarbonate", "Joanna Smith", 0, "Scheduled"],
			["lab", "Venous blood gas", "Once", "Ryan Mercer", 22, "Resulted"],
			["lab", "Beta-hydroxybutyrate", "Once", "Ryan Mercer", 22, "Resulted"],
			["lab", "Basic metabolic panel, CBC and lipase", "Once", "Ryan Mercer", 22, "Resulted"],
			["nursing", "Admit to Med-Surg", "Bed 3 · phone order", "Derek Lawson", 12],
			["nursing", "Vital signs", "Every hour while on the insulin drip", "Derek Lawson", 12],
			["nursing", "Strict intake and output", "Hourly", "Derek Lawson", 12],
			["diet", "Nothing by mouth", "Ice chips; clear liquids once the vomiting stops", "Derek Lawson", 12],
		],
	});

export { sampleOrdersByPatient, sampleScenario2Orders, sampleScenario3Orders, sampleScenario4Orders };
