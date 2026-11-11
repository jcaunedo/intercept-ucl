import type { PatientHeaderClinicalStatus, PatientHeaderClinicalStatusValue } from "@/components/data-display/patient-header";

// Synthetic data (PRD Patient details PD-150): each patient's clinical status, the Patient Header's Clinical status
// column (Nov 11, 2026, user's call: sample data per patient, set by hand, no calculation). It's the bedside team's
// documented assessment (PRD PC-031), so it can differ from the score: Clark's NEWS2 is 1 and steady, but her pressure
// is climbing on nicardipine, so she's Deteriorating. Carter and Whitfield have a vital that stopped reporting
// (Insufficient data). The scenario patients start Deteriorating; their records' later stages turn it
// (`clinicalStatusAt`). Minutes since the last assessment, so "Last assessed 2 min ago" reads the same in every session.

const statuses: Record<string, [status: PatientHeaderClinicalStatusValue, assessedMinutesAgo: number]> = {
	p1: ["deteriorating", 2],
	p2: ["deteriorating", 9],
	p3: ["improving", 34],
	p4: ["stable", 18],
	p5: ["insufficient-data", 41],
	p6: ["deteriorating", 6],
	p7: ["improving", 52],
	p8: ["stable", 27],
	p9: ["deteriorating", 4],
	p10: ["stable", 22],
	p11: ["deteriorating", 31],
	p12: ["insufficient-data", 46],
	p13: ["deteriorating", 12],
	p14: ["improving", 15],
	p15: ["stable", 38],
	p16: ["improving", 55],
	p19: ["improving", 48],
	p20: ["improving", 44],
	p17: ["deteriorating", 11],
	p18: ["improving", 26],
	p22: ["improving", 37],
	p25: ["improving", 58],
	p26: ["stable", 19],
	p27: ["stable", 50],
	p28: ["stable", 24],
	p29: ["improving", 8],
	// The scenario patients, on arrival.
	p21: ["deteriorating", 3],
	p23: ["deteriorating", 3],
	p24: ["deteriorating", 3],
};

/** A patient's clinical status, assessed relative to now. */
function sampleClinicalStatus(patientId: string): PatientHeaderClinicalStatus | undefined {
	const entry = statuses[patientId];
	return entry ? clinicalStatusAt(entry[0], entry[1]) : undefined;
}

/** A clinical status assessed some minutes ago, for a scenario's later stage. */
function clinicalStatusAt(status: PatientHeaderClinicalStatusValue, assessedMinutesAgo = 0): PatientHeaderClinicalStatus {
	return { status, assessedAt: new Date(Date.now() - assessedMinutesAgo * 60_000).toISOString() };
}

export { clinicalStatusAt, sampleClinicalStatus };
