import { samplePatients } from "../census/sample-census";

// Story-only: each hospital's record system (EHR). Scenario 1's Chadron runs Meditech (Demo Use Cases: "pulled from
// the Meditech feed") and Scenario 2's Alliance Cerner (the Demo Use Cases' site table); the other hospitals run Epic. Apps get it from each hospital's integration instead.

const sampleEhrByHospital: Record<string, string> = {
	"Harbor Point General": "Epic",
	"Alliance": "Cerner",
	CVMC: "Epic",
	"Chadron": "Meditech",
};

/** The record system at the patient's hospital ("Epic" when the hospital isn't known). */
const sampleEhrFor = (patientId: string) =>
	sampleEhrByHospital[samplePatients.find((patient) => patient.id === patientId)?.hospital ?? ""] ?? "Epic";

export { sampleEhrByHospital, sampleEhrFor };
