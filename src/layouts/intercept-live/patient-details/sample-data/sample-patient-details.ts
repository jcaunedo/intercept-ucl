import type { PatientRecord } from "../patient-details";
import type { PatientTimeline, TimelinePoint } from "../sections/timeline-section";
import type { PatientVitals } from "../sections/vitals-section";
import { sampleAlertHistoryByPatient } from "./sample-alert-history";
import { sampleAllergiesByPatient } from "./sample-allergies";
import { samplePatientBaseRecords } from "./sample-patient-records";
import { sampleCameraByPatient } from "./sample-camera";
import { sampleChartByPatient } from "./sample-chart";
import { sampleEmrByPatient } from "./sample-epic";
import { withGlucose } from "./sample-glucose";
import { sampleLabTrendsByPatient } from "./sample-lab-trends";
import { sampleLabsBriefByPatient } from "./sample-labs-brief";
import { sampleMedicationsByPatient } from "./sample-medications";
import { sampleNotesByPatient } from "./sample-notes";
import { sampleOrdersByPatient } from "./sample-orders";
import { sampleSepsisByPatient } from "./sample-sepsis";
import { sampleTimelineByPatient } from "./sample-timeline";
import { sampleVitalsByPatient } from "./sample-vitals";

// Synthetic data (PRD Patient details PD-150): every Census patient's record (`sample-patient-records.ts`) with each
// section's data, which has its own file here (`sample-<name>.ts`), keyed by patient.
// A patient with EtCO₂ (the intubated ones) gets its lane on the Timeline, from the same charted readings as the latest
// value's tile (Nov 11, 2026: Vitals merged into the Timeline). A stretch longer than two charting intervals is a gap.
function withEtco2Lane(timeline?: PatientTimeline, vitals?: PatientVitals): PatientTimeline | undefined {
	const series = vitals?.series.find((item) => item.parameter === "etco2");
	if (!timeline || !series || timeline.lanes.some((lane) => lane.id === "etco2")) return timeline;
	const points: TimelinePoint[] = [];
	series.readings.forEach((reading, index) => {
		const previous = series.readings[index - 1];
		if (previous && Date.parse(reading.at) - Date.parse(previous.at) > 2 * series.chartedEveryMinutes * 60_000) {
			points.push({ at: new Date(Date.parse(previous.at) + series.chartedEveryMinutes * 60_000).toISOString(), value: null });
		}
		points.push({ at: reading.at, value: reading.value });
	});
	const lane = {
		id: "etco2",
		group: "monitor" as const,
		label: "EtCO₂",
		unit: "mmHg",
		kind: "line" as const,
		color: "other" as const,
		source: series.source,
		limits: series.limits ? { low: series.limits[0], high: series.limits[1] } : undefined,
		staleAfterMinutes: series.staleAfterMinutes,
		points,
	};
	// After the other monitor lanes.
	const lastMonitor = timeline.lanes.map((item) => item.group).lastIndexOf("monitor");
	const lanes = [...timeline.lanes];
	lanes.splice(lastMonitor + 1, 0, lane);
	return { ...timeline, lanes };
}

const samplePatientRecords: PatientRecord[] = samplePatientBaseRecords.map((record) => ({
	...record,
	// Blood glucose on the Timeline's latest values and chart (`sample-glucose.ts`), after EtCO₂'s lane.
	...withGlucose(record.id, {
		vitals: sampleVitalsByPatient[record.id],
		timeline: withEtco2Lane(sampleTimelineByPatient[record.id], sampleVitalsByPatient[record.id]),
		admittedAt: record.icuAdmittedAt ?? record.admittedAt,
	}),
	allergyDetails: sampleAllergiesByPatient[record.id],
	alertHistory: sampleAlertHistoryByPatient[record.id],
	chart: sampleChartByPatient[record.id],
	labsBrief: sampleLabsBriefByPatient[record.id],
	labTrends: sampleLabTrendsByPatient[record.id],
	medications: sampleMedicationsByPatient[record.id],
	orders: sampleOrdersByPatient[record.id],
	emr: sampleEmrByPatient[record.id],
	notes: sampleNotesByPatient[record.id],
	sepsis: sampleSepsisByPatient[record.id],
	camera: sampleCameraByPatient[record.id],
}));

export { samplePatientRecords, withEtco2Lane };
