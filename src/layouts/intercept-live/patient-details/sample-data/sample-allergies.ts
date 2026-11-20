import type { PatientAllergy } from "./patient-details";

// Synthetic data (PRD Patient details PD-150): the allergy list behind each patient's Allergy tag, one entry per
// substance in their record's `allergies` (`sample-patient-records.ts`). Robert Thompson (`p4`) had hives during the
// cardiac cath for his NSTEMI, so iodinated contrast went on his list this shift and his popover leads with it.

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();

const sampleAllergiesByPatient: Partial<Record<string, PatientAllergy[]>> = {
	p1: [{ substance: "Penicillin", reaction: "Hives and lip swelling", severity: "moderate", verified: true, recordedAt: hoursAgo(54) }],
	p3: [{ substance: "Sulfa drugs", reaction: "Rash", severity: "mild", verified: true, recordedAt: hoursAgo(116) }],
	p4: [{ substance: "Iodinated contrast", reaction: "Hives and itching during the cardiac cath", severity: "moderate", verified: true, recordedAt: hoursAgo(6) }],
	p5: [{ substance: "Latex", reaction: "Contact dermatitis", severity: "mild", verified: false, recordedAt: hoursAgo(30) }],
	p7: [{ substance: "Codeine", reaction: "Nausea and vomiting", severity: "mild", kind: "intolerance", verified: false, recordedAt: hoursAgo(70) }],
	p9: [{ substance: "Morphine", reaction: "Itching", severity: "mild", kind: "intolerance", verified: true, recordedAt: hoursAgo(48) }],
	p10: [{ substance: "Shellfish", reaction: "Anaphylaxis", severity: "severe", verified: true, recordedAt: hoursAgo(90) }],
	p12: [{ substance: "Sulfa drugs", reaction: "Rash", severity: "mild", verified: false, recordedAt: hoursAgo(40) }],
	p15: [{ substance: "Codeine", reaction: "Nausea", severity: "mild", kind: "intolerance", verified: false, recordedAt: hoursAgo(20) }],
	p17: [{ substance: "Sulfa drugs", reaction: "Hives", severity: "moderate", verified: true, recordedAt: hoursAgo(60) }],
	p19: [{ substance: "Penicillin (rash)", reaction: "Rash", severity: "mild", verified: false, recordedAt: hoursAgo(26) }],
	p22: [{ substance: "Codeine", reaction: "Confusion", severity: "moderate", kind: "intolerance", verified: true, recordedAt: hoursAgo(50) }],
	p26: [{ substance: "Sulfa drugs", reaction: "Rash", severity: "mild", verified: false, recordedAt: hoursAgo(18) }],
	p27: [{ substance: "Morphine", reaction: "Itching", severity: "mild", kind: "intolerance", verified: true, recordedAt: hoursAgo(70) }],
	p28: [{ substance: "Latex", reaction: "Hives from gloves", severity: "moderate", verified: true, recordedAt: hoursAgo(16) }],
};

export { sampleAllergiesByPatient };
