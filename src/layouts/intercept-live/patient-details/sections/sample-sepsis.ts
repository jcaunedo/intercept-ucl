import type { SepsisCase, SepsisCriterion } from "./sepsis-section";

// Synthetic data (PRD Patient details PD-150): a case for each patient on sepsis watch in the Census, in step with
// their record, live values and orders (`sample-orders.ts`). Three states:
// - Sarah Miller (`p1`), a candidate flagged 2 min ago. Time zero is 2 h 30 min ago; the 3-hour elements are done or
//   declined and the 6-hour ones are due. 64 kg, so 30 mL/kg is 1,920 mL. Penicillin allergy: vancomycin and aztreonam.
// - William Harris (`p9`), a candidate early in screening: lactate 2.6 with MAP 64, fluids and cultures still open.
// - Patricia Moore (`p10`), validated and tracking: most elements done, fluids declined for end-stage kidney disease,
//   and the 6-hour reassessment overdue.

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
const timeZero = 150;

const sarahSepsis: SepsisCase = {
	state: "candidate",
	agent: "Sepsis Sniffer",
	flaggedAt: minutesAgo(2),
	timeZero: minutesAgo(timeZero),
	timeZeroBasis: "Lactate over 2 and MAP under 65 on a vasopressor, first met together",
	sirs: [
		{ id: "temp", label: "Temperature over 38 °C", status: "met", value: "38.9 °C", at: minutesAgo(92), source: "Monitor", stale: true },
		{ id: "hr", label: "Heart rate over 90", status: "met", value: "128", at: minutesAgo(1), source: "Monitor" },
		{ id: "rr", label: "Respiratory rate over 20", status: "met", value: "32", at: minutesAgo(1), source: "Ventilator" },
		{ id: "wbc", label: "WBC over 12 or under 4", status: "met", value: "17.2", at: minutesAgo(95), source: "Lab" },
	],
	organDysfunction: [
		{ id: "lactate", label: "Lactate over 2", status: "met", value: "4.1", at: minutesAgo(35), source: "Lab" },
		{ id: "pressor", label: "Vasopressor for MAP under 65", status: "met", value: "NE 0.22", at: minutesAgo(1), source: "Pump" },
		{ id: "creatinine", label: "Creatinine over 2.0", status: "not-met", value: "1.9", at: minutesAgo(95), source: "Lab" },
		{ id: "bilirubin", label: "Bilirubin 2 or more", status: "not-met", value: "1.4", at: minutesAgo(1520), source: "Lab" },
		{ id: "platelets", label: "Platelets under 100", status: "not-met", value: "142", at: minutesAgo(95), source: "Lab" },
		{ id: "inr", label: "INR over 1.5", status: "missing", missingLabel: "No result in 24 h" },
	],
	bundle: [
		{
			id: "lactate",
			window: "3h",
			label: "Initial lactate",
			status: "done",
			doneAt: minutesAgo(60),
			detail: "4.1 mmol/L",
			dueAt: minutesAgo(timeZero - 180),
		},
		{
			id: "cultures",
			window: "3h",
			label: "Blood cultures before antibiotics",
			status: "done",
			doneAt: minutesAgo(50),
			detail: "2 sets",
			dueAt: minutesAgo(timeZero - 180),
		},
		{
			id: "antibiotics",
			window: "3h",
			label: "Broad-spectrum antibiotics",
			status: "done",
			doneAt: minutesAgo(30),
			detail: "Vancomycin and aztreonam (penicillin allergy)",
			dueAt: minutesAgo(timeZero - 180),
		},
		{
			id: "fluids",
			window: "3h",
			label: "30 mL/kg crystalloid",
			status: "declined",
			detail: "1,000 of 1,920 mL given",
			dueAt: minutesAgo(timeZero - 180),
			addressed: {
				at: minutesAgo(25),
				by: "Joanna Smith",
				rationale: "Holding further fluid for ARDS. Reassessing with ultrasound.",
			},
		},
		{
			id: "pressors",
			window: "6h",
			label: "Vasopressors for persistent hypotension",
			status: "done",
			doneAt: minutesAgo(420),
			detail: "Norepinephrine, now 0.22 mcg/kg/min",
			dueAt: minutesAgo(timeZero - 360),
		},
		{
			id: "repeat-lactate",
			window: "6h",
			label: "Repeat lactate",
			status: "due",
			detail: "Initial lactate was over 2",
			dueAt: minutesAgo(timeZero - 360),
		},
		{
			id: "reassessment",
			window: "6h",
			label: "Volume status and perfusion reassessment",
			status: "due",
			detail: "Hypotension persists after fluids",
			dueAt: minutesAgo(timeZero - 360),
		},
	],
	hospitalProtocol: {
		name: "Harbor Point General sepsis protocol",
		elements: [
			{
				id: "huddle",
				label: "Sepsis huddle with the bedside RN",
				status: "due",
				detail: "Within 1 h of the flag",
				dueAt: minutesAgo(-58),
			},
			{
				id: "vitals",
				label: "Vital signs documented every 15 min on vasopressors",
				status: "due",
				detail: "Last documented 22 min ago",
				dueAt: minutesAgo(7),
			},
			{
				id: "procalcitonin",
				label: "Procalcitonin with the cultures",
				status: "done",
				doneAt: minutesAgo(50),
				detail: "Collected, pending",
				dueAt: minutesAgo(timeZero - 180),
			},
			{
				id: "attending",
				label: "Notify the attending of record",
				status: "done",
				doneAt: minutesAgo(1),
				detail: "Priya Shah",
				dueAt: minutesAgo(-28),
			},
		],
	},
};


/** A resulted criterion, `minutes` ago. */
const criterion = (
	id: string,
	label: string,
	status: SepsisCriterion["status"],
	value: string,
	minutes: number,
	source: string,
): SepsisCriterion => ({ id, label, status, value, at: minutesAgo(minutes), source });

const harrisTimeZero = 55;

const harrisSepsis: SepsisCase = {
	state: "candidate",
	agent: "Sepsis Sniffer",
	flaggedAt: minutesAgo(40),
	timeZero: minutesAgo(harrisTimeZero),
	timeZeroBasis: "Lactate over 2 and MAP under 65, first met together",
	sirs: [
		criterion("temp", "Temperature over 38 °C", "met", "38.3 °C", 30, "Monitor"),
		criterion("hr", "Heart rate over 90", "met", "112", 1, "Monitor"),
		criterion("rr", "Respiratory rate over 20", "met", "26", 1, "Ventilator"),
		criterion("wbc", "WBC over 12 or under 4", "met", "15.8", 160, "Lab"),
	],
	organDysfunction: [
		criterion("lactate", "Lactate over 2", "met", "2.6", 55, "Lab"),
		criterion("hypotension", "Systolic under 90 or MAP under 65", "met", "MAP 64", 1, "Monitor"),
		criterion("creatinine", "Creatinine over 2.0", "not-met", "1.3", 160, "Lab"),
		{ id: "bilirubin", label: "Bilirubin 2 or more", status: "missing", missingLabel: "No result in 24 h" },
		criterion("platelets", "Platelets under 100", "not-met", "214", 160, "Lab"),
		{ id: "inr", label: "INR over 1.5", status: "missing", missingLabel: "No result in 24 h" },
	],
	bundle: [
		{
			id: "lactate",
			window: "3h",
			label: "Initial lactate",
			status: "done",
			doneAt: minutesAgo(55),
			detail: "2.6 mmol/L",
			dueAt: minutesAgo(harrisTimeZero - 180),
		},
		{
			id: "cultures",
			window: "3h",
			label: "Blood cultures before antibiotics",
			status: "done",
			doneAt: minutesAgo(1720),
			detail: "2 sets, on the ward",
			dueAt: minutesAgo(harrisTimeZero - 180),
		},
		{
			id: "antibiotics",
			window: "3h",
			label: "Broad-spectrum antibiotics",
			status: "done",
			doneAt: minutesAgo(1700),
			detail: "Ampicillin-sulbactam, started on the ward",
			dueAt: minutesAgo(harrisTimeZero - 180),
		},
		{
			id: "fluids",
			window: "3h",
			label: "30 mL/kg crystalloid",
			status: "due",
			detail: "2,340 mL for 78 kg · MAP 64 with lactate 2.6",
			dueAt: minutesAgo(harrisTimeZero - 180),
		},
		{
			id: "repeat-lactate",
			window: "6h",
			label: "Repeat lactate",
			status: "due",
			detail: "Initial lactate was over 2",
			dueAt: minutesAgo(harrisTimeZero - 360),
		},
		{
			id: "reassessment",
			window: "6h",
			label: "Volume status and perfusion reassessment",
			status: "due",
			detail: "If MAP stays under 65 after fluids",
			dueAt: minutesAgo(harrisTimeZero - 360),
		},
	],
	hospitalProtocol: {
		name: "Harbor Point General sepsis protocol",
		elements: [
			{
				id: "huddle",
				label: "Sepsis huddle with the bedside RN",
				status: "due",
				detail: "Within 1 h of the flag",
				dueAt: minutesAgo(-20),
			},
			{
				id: "procalcitonin",
				label: "Procalcitonin with the cultures",
				status: "done",
				doneAt: minutesAgo(160),
				detail: "1.8 ng/mL",
				dueAt: minutesAgo(harrisTimeZero - 180),
			},
			{
				id: "attending",
				label: "Notify the attending of record",
				status: "done",
				doneAt: minutesAgo(30),
				detail: "Priya Shah",
				dueAt: minutesAgo(10),
			},
		],
	},
};

const mooreTimeZero = 380;

const mooreSepsis: SepsisCase = {
	state: "tracking",
	agent: "Sepsis Sniffer",
	flaggedAt: minutesAgo(375),
	timeZero: minutesAgo(mooreTimeZero),
	timeZeroBasis: "Lactate over 2 and MAP under 65, first met together",
	decision: { at: minutesAgo(330), by: "Joanna Smith" },
	sirs: [
		criterion("temp", "Temperature over 38 °C", "met", "38.6 °C", 40, "Monitor"),
		criterion("hr", "Heart rate over 90", "met", "98", 1, "Monitor"),
		criterion("rr", "Respiratory rate over 20", "not-met", "19", 1, "Monitor"),
		criterion("wbc", "WBC over 12 or under 4", "met", "21.4", 200, "Lab"),
	],
	organDysfunction: [
		criterion("lactate", "Lactate over 2", "met", "3.0", 60, "Lab"),
		criterion("pressor", "Vasopressor for MAP under 65", "met", "NE 0.06", 1, "Pump"),
		// Her creatinine is her end-stage kidney disease, not a new dysfunction.
		criterion("creatinine", "Creatinine over 2.0, not counted with ESKD", "not-met", "5.8", 200, "Lab"),
		criterion("bilirubin", "Bilirubin 2 or more", "not-met", "0.9", 200, "Lab"),
		criterion("platelets", "Platelets under 100", "not-met", "168", 200, "Lab"),
		criterion("inr", "INR over 1.5", "not-met", "1.3", 200, "Lab"),
	],
	bundle: [
		{
			id: "lactate",
			window: "3h",
			label: "Initial lactate",
			status: "done",
			doneAt: minutesAgo(420),
			detail: "2.2 mmol/L",
			dueAt: minutesAgo(mooreTimeZero - 180),
		},
		{
			id: "cultures",
			window: "3h",
			label: "Blood cultures before antibiotics",
			status: "done",
			doneAt: minutesAgo(375),
			detail: "2 sets",
			dueAt: minutesAgo(mooreTimeZero - 180),
		},
		{
			id: "antibiotics",
			window: "3h",
			label: "Broad-spectrum antibiotics",
			status: "done",
			doneAt: minutesAgo(360),
			detail: "Vancomycin, piperacillin-tazobactam and clindamycin",
			dueAt: minutesAgo(mooreTimeZero - 180),
		},
		{
			id: "fluids",
			window: "3h",
			label: "30 mL/kg crystalloid",
			status: "declined",
			detail: "500 of 2,220 mL given",
			dueAt: minutesAgo(mooreTimeZero - 180),
			addressed: {
				at: minutesAgo(340),
				by: "Joanna Smith",
				rationale: "End-stage kidney disease on CRRT. Gave 500 mL and reassessing.",
			},
		},
		{
			id: "pressors",
			window: "6h",
			label: "Vasopressors for persistent hypotension",
			status: "done",
			doneAt: minutesAgo(400),
			detail: "Norepinephrine, now 0.06 mcg/kg/min",
			dueAt: minutesAgo(mooreTimeZero - 360),
		},
		{
			id: "repeat-lactate",
			window: "6h",
			label: "Repeat lactate",
			status: "done",
			doneAt: minutesAgo(60),
			detail: "3.0 mmol/L, up from 2.2",
			dueAt: minutesAgo(mooreTimeZero - 360),
		},
		{
			id: "reassessment",
			window: "6h",
			label: "Volume status and perfusion reassessment",
			status: "due",
			detail: "MAP is 61 after 500 mL",
			dueAt: minutesAgo(mooreTimeZero - 360),
		},
	],
	hospitalProtocol: {
		name: "Harbor Point General sepsis protocol",
		elements: [
			{
				id: "huddle",
				label: "Sepsis huddle with the bedside RN",
				status: "done",
				doneAt: minutesAgo(320),
				detail: "With Rosa Delgado",
				dueAt: minutesAgo(315),
			},
			{
				id: "vitals",
				label: "Vital signs documented every 15 min on vasopressors",
				status: "due",
				detail: "Last documented 7 min ago",
				dueAt: minutesAgo(-8),
			},
			{
				id: "lactate-trend",
				label: "Lactate every 2 h while over 2",
				status: "due",
				detail: "Last 3.0, 1 h ago",
				dueAt: minutesAgo(-60),
			},
			{
				id: "attending",
				label: "Notify the attending of record",
				status: "done",
				doneAt: minutesAgo(370),
				detail: "Nathan Brooks",
				dueAt: minutesAgo(345),
			},
		],
	},
};

/** Only patients on sepsis watch have a case. */
const sampleSepsisByPatient: Record<string, SepsisCase> = {
	p1: sarahSepsis,
	p9: harrisSepsis,
	p10: mooreSepsis,
};

export { sampleSepsisByPatient };
