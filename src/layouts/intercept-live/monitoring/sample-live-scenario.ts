import type { MonitorVitals } from "@/components/cards/patient-monitoring-card";

import type { TriageAlert } from "./monitoring";

// Synthetic data (PRD MON-080, MON-081): a scripted live feed for the Monitoring Live story. Each step changes some
// patients' vitals and alerts, over `sampleMonitoringPatients` / `sampleMonitoringAlerts`: an alert's severity goes up or
// down (a Medium becomes High, a Critical eases to Medium), a new one fires, others resolve. Sorted by Alert, the
// panel moves patients as their worst alert changes, highest severity first. After the last step the feed returns to
// the start.

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
		label: "Moore's pressure drifts down: a new Medium alert",
		vitals: { p10: { hr: 108, systolic: 82, diastolic: 44, map: 57 } },
		fire: [
			{ id: "live-1", patientId: "p10", severity: "medium", title: "MAP below 65 mmHg", source: { kind: "rule", name: "Hemodynamics" } },
		],
	},
	{
		// Walker's card is in the first row, so the resolve (green blink, "Resolved", then the move) is easy to see.
		label: "Walker's lactate comes back down: the concern is resolved",
		vitals: { p13: { hr: 112, systolic: 96, diastolic: 51, map: 66 } },
		resolve: ["a7"],
	},
	{
		label: "Thompson's pressor dose climbs again: Medium becomes High",
		vitals: { p4: { hr: 104, systolic: 88, diastolic: 47, map: 61 } },
		update: { a6: { severity: "high", title: "Norepinephrine up 3 steps in 1 h" } },
	},
	{
		label: "Moore worsens: Medium becomes Critical",
		vitals: { p10: { hr: 124, systolic: 74, diastolic: 40, map: 51, rr: 28 } },
		update: { "live-1": { severity: "critical", title: "MAP below 60 mmHg" } },
	},
	{
		// Both of Miller's Critical alerts ease, so her card drops to her next worst, High.
		label: "Miller responds to treatment: both Critical alerts ease to Medium",
		vitals: { p1: { hr: 114, systolic: 96, diastolic: 56, map: 69 } },
		update: {
			a1: { severity: "medium", title: "Sepsis candidate, bundle started" },
			a2: { severity: "medium", title: "MAP recovering, 69 mmHg" },
		},
	},
	{
		label: "Johnson desaturates: Low becomes High",
		vitals: { p2: { hr: 126, spo2: 81 } },
		update: { a4: { severity: "high", title: "SpO₂ below 82%" } },
	},
	{
		label: "Harris's PEEP is corrected: High eases to Low",
		update: { a5: { severity: "low", title: "PEEP corrected, confirm with the order" } },
	},
	{
		// Johnson is third in the first row by now.
		label: "Johnson's SpO₂ recovers: the alert is resolved",
		vitals: { p2: { hr: 104, spo2: 94 } },
		resolve: ["a4"],
	},
];

export { sampleLiveScenario, type LiveStep };
