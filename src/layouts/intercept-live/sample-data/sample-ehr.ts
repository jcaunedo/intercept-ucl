import { samplePatients } from "./sample-census";
import { sampleHospitals } from "./sample-workspace";

// Story-only: each hospital's record system (EHR), from the Demo Use Cases' site table, as `sampleHospitals` sets it:
// Scenario 1's Chadron and Scenario 3's Sidney run Meditech ("pulled from the Meditech feed"), Scenario 2's Alliance
// Cerner, Scenario 4's Bridgeport TruBridge and the hub, Regional West, Epic (Scenario 5, Nov 17, 2026). Epic stays the
// fallback name. Apps get it from each hospital's integration instead.

const sampleEhrByHospital: Record<string, string> = Object.fromEntries(
	sampleHospitals.flatMap((hospital) => (hospital.ehr ? [[hospital.name, hospital.ehr]] : [])),
);

/** The record system at the patient's hospital ("Epic" when the hospital isn't known). */
const sampleEhrFor = (patientId: string) =>
	sampleEhrByHospital[samplePatients.find((patient) => patient.id === patientId)?.hospital ?? ""] ?? "Epic";

export { sampleEhrByHospital, sampleEhrFor };
