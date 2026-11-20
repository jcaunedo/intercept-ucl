import type { PatientActivity, PatientCarePlan } from "./activity";

// Story-only: Scenario 1 after 06:00, what was done and decided about Margaret Hayes (`p15`) as the app records it. In
// the prototype the live feed builds the same from the clinician's own actions (`useSampleLiveFeed`'s
// `withScenarioActivity`); this is the record a story opens on.

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

const sampleScenario1Activity: PatientActivity[] = [
	{
		id: "a1",
		at: minutesAgo(42),
		kind: "alert",
		title: "Critical alert: NEWS2 10, High: up 5 in 4 h",
		detail: "Rising work of breathing, positive fluid balance, HFrEF",
		by: "Deterioration score",
	},
	{ id: "a2", at: minutesAgo(40), kind: "alert", title: "Alert acknowledged", detail: "NEWS2 10, High: up 5 in 4 h", by: "You" },
	{
		id: "a3",
		at: minutesAgo(39),
		kind: "consult",
		title: "Video consult with Kayla Brandt, RN",
		detail: "Bedside camera, Bed 4",
		by: "You",
	},
	{
		id: "a4",
		at: minutesAgo(33),
		kind: "order",
		title: "CHF exacerbation pathway sent for co-signature",
		detail: "BiPAP, Furosemide IV (edited: 120 mg IV bolus, then 10 mg/h infusion), Nitroglycerin IV",
		by: "You",
	},
	{
		id: "a5",
		at: minutesAgo(32),
		kind: "order",
		title: "Orders co-signed",
		detail: "Orders active. The bedside team carries them out.",
		by: "Dr. Tom Weller, family physician on call",
	},
	{ id: "a6", at: minutesAgo(31), kind: "consult", title: "Video consult ended", detail: "Lasted 8 min", by: "You", durationMs: 8 * 60_000 },
	{
		id: "a7",
		at: minutesAgo(30),
		kind: "note",
		title: "Consult note approved",
		detail: "AI Notetaker draft, added to the chart for signature",
		by: "You",
	},
	{
		id: "a8",
		at: minutesAgo(28),
		kind: "decision",
		title: "Keeping at Chadron",
		detail: "BiPAP and RT are here; a 2 h ride is the bigger risk tonight",
		by: "You",
	},
	{ id: "a9", at: minutesAgo(2), kind: "outcome", title: "1 h checkpoint passed", detail: "RR 22, SpO₂ 94% on BiPAP" },
	{
		id: "a10",
		at: minutesAgo(2),
		kind: "outcome",
		title: "4 h checkpoint passed",
		detail: "Urine output 140 mL/h, SBP 128, RR 20, SpO₂ 95% on 2 L",
	},
	{
		id: "a11",
		at: minutesAgo(2),
		kind: "alert",
		title: "Alert resolved",
		detail: "Treated · RR 20, SpO₂ 95% on 2 L. Both checkpoints passed; kept at Chadron.",
		by: "Kayla Brandt, RN",
	},
	{
		id: "a12",
		at: minutesAgo(2),
		kind: "outcome",
		title: "Transfer avoided",
		detail:
			"Trip the family didn't make: 100 mi each way · ICU-level care delivered here: 4 h 20 min · Estimated transfer cost avoided: $ to be sourced",
	},
];

const sampleScenario1CarePlan: PatientCarePlan = {
	pathway: {
		title: "CHF exacerbation pathway",
		status: "active",
		orders: [
			{ name: "BiPAP", dose: "IPAP 10 / EPAP 5 cmH₂O, FiO₂ 40%" },
			{
				name: "Furosemide IV",
				dose: "120 mg IV bolus, then 10 mg/h infusion",
				suggested: "80 mg IV bolus, then 10 mg/h infusion",
			},
			{ name: "Nitroglycerin IV", dose: "10 mcg/min, up 10 mcg/min every 5 min" },
		],
		at: minutesAgo(33),
		by: "You",
		cosigner: "Dr. Tom Weller",
		cosignedAt: minutesAgo(32),
	},
	transfer: {
		label: "Keeping at Chadron",
		rationale: "BiPAP and RT are here; a 2 h ride is the bigger risk tonight",
		at: minutesAgo(28),
		by: "You",
		checkpoints: [
			{
				id: "1h",
				label: "1 h",
				due: minutesAgo(28 - 60),
				criteria: "RR under 24 and SpO₂ ≥ 92% on BiPAP",
				result: { status: "passed", detail: "RR 22, SpO₂ 94% on BiPAP" },
			},
			{
				id: "4h",
				label: "4 h",
				due: minutesAgo(28 - 240),
				criteria: "Urine output ≥ 100 mL/h, SBP ≥ 100 mmHg, RR and SpO₂ holding",
				result: { status: "passed", detail: "Urine output 140 mL/h, SBP 128, RR 20, SpO₂ 95% on 2 L" },
			},
		],
		outcome: {
			label: "Transfer avoided",
			items: [
				{ label: "Trip the family didn't make", value: "100 mi each way" },
				{ label: "Estimated transfer cost avoided", value: "$ to be sourced" },
				{ label: "ICU-level care delivered here", value: "4 h 20 min" },
			],
		},
	},
};

export { sampleScenario1Activity, sampleScenario1CarePlan };
