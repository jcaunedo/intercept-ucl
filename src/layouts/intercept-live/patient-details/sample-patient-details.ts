import type { PatientRecord } from "./patient-details";
import { samplePatientBaseRecords } from "./sample-patient-records";
import { sampleCameraByPatient } from "./sections/sample-camera";
import { sampleChartByPatient } from "./sections/sample-chart";
import { sampleEmrByPatient } from "./sections/sample-epic";
import { sampleMedicationsByPatient } from "./sections/sample-medications";
import { sampleNotesByPatient } from "./sections/sample-notes";
import { sampleOrdersByPatient } from "./sections/sample-orders";
import { sampleSepsisByPatient } from "./sections/sample-sepsis";
import { sampleTimelineByPatient } from "./sections/sample-timeline";
import { sampleVitalsByPatient } from "./sections/sample-vitals";

// Synthetic data (PRD Patient details PD-150): every Census patient's record (`sample-patient-records.ts`) with each
// section's data, which lives beside its section (`sections/sample-*.ts`), keyed by patient.
const samplePatientRecords: PatientRecord[] = samplePatientBaseRecords.map((record) => ({
	...record,
	vitals: sampleVitalsByPatient[record.id],
	chart: sampleChartByPatient[record.id],
	timeline: sampleTimelineByPatient[record.id],
	medications: sampleMedicationsByPatient[record.id],
	orders: sampleOrdersByPatient[record.id],
	emr: sampleEmrByPatient[record.id],
	notes: sampleNotesByPatient[record.id],
	sepsis: sampleSepsisByPatient[record.id],
	camera: sampleCameraByPatient[record.id],
}));

export { samplePatientRecords };
