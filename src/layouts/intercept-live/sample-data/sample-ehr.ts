import { samplePatients } from "../census/sample-census";

// Story-only: each hospital's record system (EHR). Scenario 1's Chadron runs Meditech (Demo Use Cases: "pulled from
// the Meditech feed"); the other hospitals run Epic. Apps get it from each hospital's integration instead.

const sampleEhrByHospital: Record<string, string> = {
	"Harbor Point General": "Epic",
	"Mercy West Hospital": "Epic",
	CVMC: "Epic",
	"Chadron Community Hospital": "Meditech",
};

/** The record system at the patient's hospital ("Epic" when the hospital isn't known). */
const sampleEhrFor = (patientId: string) =>
	sampleEhrByHospital[samplePatients.find((patient) => patient.id === patientId)?.hospital ?? ""] ?? "Epic";

export { sampleEhrByHospital, sampleEhrFor };
