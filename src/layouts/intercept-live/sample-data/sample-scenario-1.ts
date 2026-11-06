import type { AlertDetailData } from "../alert-modal/alert-modal";
import { sampleScenario1ResolvedDetail } from "../alert-modal/sample-alert-modal";
import type { CensusPatient } from "../census/census-panel";
import { sampleScenario1Census, sampleScenario1ResolvedCensus } from "../census/sample-census";
import type { MonitoringPatient, TriageAlert } from "../monitoring/monitoring";
import { sampleScenario1Monitoring, sampleScenario1ResolvedMonitoring } from "../monitoring/sample-monitoring";
import type { PatientActivity } from "../patient-details/activity";
import type { PatientRecord } from "../patient-details/patient-details";
import { sampleScenario1Record, sampleScenario1ResolvedRecord } from "../patient-details/sample-patient-records";
import { sampleScenario1ResolvedTimeline, sampleScenario1Timeline } from "../patient-details/sections/sample-timeline";
import { sampleScenario1ResolvedVitals, sampleScenario1Vitals } from "../patient-details/sections/sample-vitals";
import type { AlertNotice } from "../shared/alert-toasts";

// Story-only: Scenario 1 of the Demo Use Cases, "Heart failure at 2 a.m. in a 25-bed hospital", as beats the Prototype
// menu plays. Margaret Hayes (`p15`, Chadron, Med-Surg) starts just before it, holding at NEWS2 5;
// each beat changes her Census card, her monitor, her record, her alert modal and the alerts together, so every page
// tells the same story. Step 1 (early warning) plays when the scenario is picked; steps 2 to 5 are the clinician's, in
// the alert modal; step 6 (resolution) plays once she's kept at Chadron.

/** What a beat changes, by patient id, and the alerts it fires. */
type ScenarioChanges = {
	/** Patients who arrive now, on every page (Scenario 2's Dale Reynolds, whom the ED's consult request puts on the Census). */
	admit?: { census: CensusPatient; monitoring: MonitoringPatient; record: PatientRecord }[];
	census?: Record<string, Partial<CensusPatient>>;
	monitoring?: Record<string, Partial<MonitoringPatient>>;
	records?: Record<string, Partial<PatientRecord>>;
	/** Alerts that fire now (`firedAt` is set when the beat plays). */
	fire?: Omit<TriageAlert, "firedAt">[];
	/** Alerts resolved now, with who resolved them and why (`at` is set when the beat plays). */
	resolve?: Record<string, Omit<NonNullable<TriageAlert["addressed"]>, "at">>;
	/** Changes to an alert's modal, by alert id. */
	details?: Record<string, (detail: AlertDetailData) => AlertDetailData>;
	/** Lines for the patients' activity logs, e.g. the consult falling back to audio (`at` is when the beat plays). */
	log?: (Omit<PatientActivity, "id" | "at"> & { patientId: string })[];
	/**
	 * Something for the clinician to act on, shown as a toast unless its alert is open (Scenario 2's social needs). Its
	 * `id` is made unique per run when the beat plays.
	 */
	notices?: AlertNotice[];
};

type ScenarioBeat = {
	/**
	 * When it plays: when the scenario starts, once the scenario's video consult is on (its first time in a run), once
	 * the clinician keeps the patient (keep or transfer), or once they accept the scenario's pathway (Scenario 3).
	 */
	after: "start" | "consult" | "keep" | "pathway";
	/**
	 * Seconds after that. By default 1.5 s after the start, 6 s after the consult is on, 6 s after the keep and 6 s after
	 * the pathway is accepted.
	 */
	delay?: number;
	/** What happens, for the hospital bar's Live feed. */
	label: string;
	/** Built when the beat plays, so its times read "just now". */
	changes: () => ScenarioChanges;
};

/** A scenario: its patients and alerts (a new run starts them over) and its beats. */
type ScenarioDefinition = {
	patientIds: string[];
	alertIds: string[];
	beats: ScenarioBeat[];
};

const scenario1Beats: ScenarioBeat[] = [
	{
		after: "start",
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
	{
		after: "keep",
		// 6. Resolution (06:00): RR 20 and SpO₂ 95% on 2 L, so NEWS2 3, Low. Both checkpoints passed, so her alert is
		// resolved and the platform logs "transfer avoided" in her alert modal. Who resolves it isn't in the scenario: her
		// bedside nurse, as the feed's other resolutions.
		label: "06:00: Hayes is stable on 2 L, transfer avoided",
		changes: () => ({
			census: { p15: sampleScenario1ResolvedCensus },
			monitoring: { p15: sampleScenario1ResolvedMonitoring },
			// Her page follows: the brief, the score, the oxygen, the vitals and the timeline at 06:00.
			records: {
				p15: {
					...sampleScenario1ResolvedRecord(),
					vitals: sampleScenario1ResolvedVitals(),
					timeline: sampleScenario1ResolvedTimeline(),
				},
			},
			resolve: {
				"live-hayes": {
					by: "Kayla Brandt, RN",
					reason: "Treated",
					note: "RR 20, SpO₂ 95% on 2 L. Both checkpoints passed; kept at Chadron.",
				},
			},
			details: { "live-hayes": sampleScenario1ResolvedDetail },
		}),
	},
];

const sampleScenario1: ScenarioDefinition = {
	patientIds: ["p15"],
	alertIds: ["live-hayes"],
	beats: scenario1Beats,
};

export { sampleScenario1, type ScenarioBeat, type ScenarioChanges, type ScenarioDefinition };
