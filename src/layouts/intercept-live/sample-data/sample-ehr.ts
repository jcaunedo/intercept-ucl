import { samplePatients } from "../census/sample-census";

// Story-only: each hospital's record system (EHR). Scenario 1's Chadron and Scenario 3's Sidney run Meditech (Demo Use Cases: "pulled from
// the Meditech feed"), Scenario 2's Alliance Cerner and Scenario 4's Bridgeport TruBridge (the Demo Use Cases' site table). No
// hospital runs Epic since Harbor Point General became Bridgeport (Nov 6, 2026); Epic stays the fallback name. Apps get it from each
// hospital's integration instead.

const sampleEhrByHospital: Record<string, string> = {
	"Alliance Community": "Cerner",
	// Meditech, as in the Demo Use Cases' site table (Scenario 3). CVMC until Nov 6, 2026, on Epic.
	"Sidney Regional": "Meditech",
	"Chadron Memorial": "Meditech",
	// TruBridge, as in the Demo Use Cases' site table (Scenario 4). Harbor Point General until Nov 6, 2026, on Epic.
	"Bridgeport Valley": "TruBridge",
};

/** The record system at the patient's hospital ("Epic" when the hospital isn't known). */
const sampleEhrFor = (patientId: string) =>
	sampleEhrByHospital[samplePatients.find((patient) => patient.id === patientId)?.hospital ?? ""] ?? "Epic";

export { sampleEhrByHospital, sampleEhrFor };
