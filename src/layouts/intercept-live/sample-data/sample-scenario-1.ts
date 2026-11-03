import type { CensusPatient } from "../census/census-panel";
import { sampleScenario1Census } from "../census/sample-census";
import type { MonitoringPatient, TriageAlert } from "../monitoring/monitoring";
import { sampleScenario1Monitoring } from "../monitoring/sample-monitoring";
import type { PatientRecord } from "../patient-details/patient-details";
import { sampleScenario1Record } from "../patient-details/sample-patient-records";
import { sampleScenario1Timeline } from "../patient-details/sections/sample-timeline";
import { sampleScenario1Vitals } from "../patient-details/sections/sample-vitals";

// Story-only: Scenario 1 of the Demo Use Cases, "Heart failure at 2 a.m. in a 25-bed hospital", as beats the Prototype
// menu plays. Margaret Hayes (`p15`, Chadron Community Hospital, Med-Surg) starts just before it, holding at NEWS2 5;
// each beat changes her Census card, her monitor, her record and the alerts together, so every page tells the same
// story. Only beat 1 is built so far.

/** What a beat changes, by patient id, and the alerts it fires. */
type ScenarioChanges = {
	census?: Record<string, Partial<CensusPatient>>;
	monitoring?: Record<string, Partial<MonitoringPatient>>;
	records?: Record<string, Partial<PatientRecord>>;
	/** Alerts that fire now (`firedAt` is set when the beat plays). */
	fire?: Omit<TriageAlert, "firedAt">[];
};

type ScenarioBeat = {
	/** What happens, for the hospital bar's Live feed. */
	label: string;
	/** Built when the beat plays, so its times read "just now". */
	changes: () => ScenarioChanges;
};

const sampleScenario1: ScenarioBeat[] = [
	{
		// 1. Early warning (01:40): RR 20 → 26, SpO₂ 89% on 4 L, HR 112, net +1.8 L and +2.1 kg in 48 h. NEWS2 crosses into
		// High, 5 an hour ago and 10 now, and her Critical alert lands at #1, above Miller's older one, because her score
		// rose 5 in 4 h and Miller's held steady (DU-09).
		label: "Hayes's NEWS2 rises to 10: a new Critical alert",
		changes: () => ({
			census: { p15: sampleScenario1Census },
			monitoring: { p15: sampleScenario1Monitoring },
			records: {
				p15: { ...sampleScenario1Record(), vitals: sampleScenario1Vitals(), timeline: sampleScenario1Timeline() },
			},
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
		}),
	},
];

export { sampleScenario1, type ScenarioBeat, type ScenarioChanges };
