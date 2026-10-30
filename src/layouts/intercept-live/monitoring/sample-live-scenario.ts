import type { MonitorVitals } from "@/components/cards/patient-monitoring-card";

import type { TriageAlert } from "./monitoring";

// Synthetic data (PRD MON-080, MON-081): a scripted live feed for the Monitoring Live story. Each step changes some
// patients' vitals and alerts, over `sampleMonitoringPatients` / `sampleMonitoringAlerts`: an alert's severity goes up or
// down (a Medium becomes High, a Critical eases to Medium), new ones fire, others resolve. It starts from the three
// default alerts (Miller Critical, Johnson and Anderson Low) and builds up from there. Sorted by Alert, the
// panel moves patients as their worst alert changes, highest severity first. After the last step the feed returns to
// the start.
//
// The first step is Scenario 1's early warning (Demo Use Cases, Chadron at 01:40): Margaret Hayes's NEWS2 crosses into
// the High band, 5 an hour ago and 10 now, and her Critical alert lands at #1, above Miller's older one, because her
// score rose 5 in 4 h and Miller's held steady (DU-09). Her vitals are already the 01:40 values.

type LiveStep = {
	/** What happens, for the story's caption. */
	label: string;
	/** Vitals that change, by patient id. MAP is (systolic + 2 × diastolic) / 3. */
	vitals?: Record<string, Partial<MonitorVitals>>;
	/** Existing alerts whose severity (and wording) changes, by alert id. */
	update?: Record<string, Partial<Pick<TriageAlert, "severity" | "title">>>;
	/** Alerts that fire now (`firedAt` is set when the step runs). */
	fire?: Omit<TriageAlert, "firedAt">[];
	/** Ids of alerts resolved now. */
	resolve?: string[];
};

const sampleLiveScenario: LiveStep[] = [
	{
		label: "Hayes's NEWS2 rises to 10: a new Critical alert",
		fire: [
			{
				id: "live-hayes",
				patientId: "p15",
				severity: "critical",
				title: "NEWS2 10, High: up 5 in 4 h",
				reason: "Rising work of breathing, positive fluid balance, HFrEF",
				source: { kind: "rule", name: "Deterioration score" },
				// The score's inputs with their points, then the trend that isn't in the score.
				evidence: [
					"RR 26/min, 3 points (20 an hour ago)",
					"SpO₂ 89% on 4 L/min oxygen, 3 + 2 points",
					"HR 112 bpm, 2 points",
					"BP 148/86, temp 36.8 °C, alert: 0 points",
					"Net fluid balance +1.8 L, weight +2.1 kg in 48 h (charted)",
				],
			},
		],
	},
	{
		// Johnson's card is in the first row, so the resolve (green blink, "Resolved", then the move) is easy to see.
		label: "Johnson's SpO₂ recovers: the alert is resolved",
		vitals: { p2: { hr: 104, spo2: 94 } },
		resolve: ["a4"],
	},
	{
		label: "Moore's pressure drifts down: a new Medium alert",
		vitals: { p10: { hr: 108, systolic: 82, diastolic: 44, map: 57 } },
		fire: [
			{ id: "live-1", patientId: "p10", severity: "medium", title: "MAP below 65 mmHg", source: { kind: "rule", name: "Hemodynamics" } },
		],
	},
	{
		label: "Thompson's pressor dose climbs: a new Medium alert",
		vitals: { p4: { hr: 104, systolic: 88, diastolic: 47, map: 61 } },
		fire: [
			{ id: "live-2", patientId: "p4", severity: "medium", title: "Norepinephrine up 2 steps in 1 h", source: { kind: "rule", name: "Vasopressors" } },
		],
	},
	{
		label: "Moore worsens: Medium becomes Critical",
		vitals: { p10: { hr: 124, systolic: 74, diastolic: 40, map: 51, rr: 28 } },
		update: { "live-1": { severity: "critical", title: "MAP below 60 mmHg" } },
	},
	{
		label: "Miller responds to treatment: Critical eases to Medium",
		vitals: { p1: { hr: 114, systolic: 96, diastolic: 56, map: 69 } },
		update: { a1: { severity: "medium", title: "Sepsis candidate, bundle started" } },
	},
	{
		label: "Harris's PEEP differs from the order: a new High alert",
		fire: [
			{
				id: "live-3",
				patientId: "p9",
				severity: "high",
				title: "PEEP differs from the active order",
				source: { kind: "ai", name: "Vent-Order Mismatch" },
				recommendation: "Check the ventilator against the order.",
				evidence: ["Ventilator PEEP 8 cmH₂O", "Active order: PEEP 10 cmH₂O (James Tan, 10:42)"],
			},
		],
	},
	{
		label: "Thompson's pressor dose climbs again: Medium becomes High",
		vitals: { p4: { hr: 110, systolic: 84, diastolic: 45, map: 58 } },
		update: { "live-2": { severity: "high", title: "Norepinephrine up 3 steps in 1 h" } },
	},
	{
		label: "Harris's PEEP is corrected: the alert is resolved",
		resolve: ["live-3"],
	},
];

export { sampleLiveScenario, type LiveStep };
