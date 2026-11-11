import type { TriageAlert } from "../monitoring/triage-queue";

// Synthetic data: each patient's earlier alerts, before the ones the live feed shows (PRD Patient details, Alerts panel:
// every alert stays, Nov 10, 2026, user's call). All resolved, between 14 h and 4 days ago, matched to each patient's
// diagnosis (`sample-patient-records.ts`). Times are relative to when the sample loads.

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();

/** A resolved alert from `hours` ago, resolved `after` minutes later. */
function earlier(
	id: string,
	patientId: string,
	hours: number,
	alert: Pick<TriageAlert, "severity" | "title" | "source"> & Partial<Pick<TriageAlert, "reason">>,
	resolution: { after: number; reason: string; by?: string; note?: string },
): TriageAlert {
	return {
		id,
		patientId,
		firedAt: hoursAgo(hours),
		status: "resolved",
		addressed: {
			at: hoursAgo(hours - resolution.after / 60),
			reason: resolution.reason,
			by: resolution.by,
			note: resolution.note,
		},
		...alert,
	};
}

const vitals = { kind: "rule", name: "Vitals" } as const;
const oxygenation = { kind: "rule", name: "Oxygenation" } as const;
const hemodynamics = { kind: "rule", name: "Hemodynamics" } as const;
const nursing = { kind: "rule", name: "Nursing" } as const;
const bedSensor = { kind: "device", name: "Bed sensor" } as const;
const oximeter = { kind: "device", name: "Pulse oximeter" } as const;
const sepsisSniffer = { kind: "ai", name: "Sepsis Sniffer" } as const;

const sampleAlertHistoryByPatient: Record<string, TriageAlert[]> = {
	// Miller: septic shock from pneumonia.
	p1: [
		earlier("h-p1-1", "p1", 20, { severity: "high", title: "MAP below 65 for 10 min", source: hemodynamics }, {
			after: 18,
			reason: "Treated",
			note: "Norepinephrine up to 0.12 mcg/kg/min.",
		}),
		earlier(
			"h-p1-2",
			"p1",
			52,
			{
				severity: "critical",
				title: "Sepsis candidate",
				reason: "Lactate 4.1, fever, new infiltrate",
				source: sepsisSniffer,
			},
			{ after: 35, reason: "Treated", by: "Dr. Joanna Smith", note: "Hour-1 bundle completed." },
		),
	],
	// Johnson: ARDS from influenza.
	p2: [
		earlier("h-p2-1", "p2", 16, { severity: "high", title: "SpO₂ below 88% for 5 min", source: oxygenation }, {
			after: 12,
			reason: "Treated",
			note: "PEEP 12 → 14.",
		}),
		earlier("h-p2-2", "p2", 40, { severity: "low", title: "SpO₂ probe off", source: oximeter }, {
			after: 4,
			reason: "Artifact or false alarm",
			by: "Ashley Bell, RN",
		}),
	],
	// Davis: urosepsis.
	p3: [
		earlier("h-p3-1", "p3", 30, { severity: "medium", title: "Temperature above 38.5 °C", source: vitals }, {
			after: 25,
			reason: "Expected for this patient",
		}),
	],
	// Thompson: cardiogenic shock after NSTEMI.
	p4: [
		earlier("h-p4-1", "p4", 18, { severity: "high", title: "Heart rate above 120 for 10 min", source: vitals }, {
			after: 20,
			reason: "Treated",
			note: "Amiodarone bolus; back in sinus.",
		}),
		earlier("h-p4-2", "p4", 66, { severity: "medium", title: "Urine output under 0.5 mL/kg/h for 2 h", source: nursing }, {
			after: 40,
			reason: "Treated",
			by: "Dr. Samuel Grant",
		}),
	],
	// Carter: status asthmaticus.
	p5: [
		earlier("h-p5-1", "p5", 22, { severity: "high", title: "Respiratory rate above 30 for 10 min", source: vitals }, {
			after: 15,
			reason: "Treated",
			note: "Continuous albuterol, magnesium 2 g IV.",
		}),
	],
	// Anderson: hip fracture after hemiarthroplasty, confused overnight.
	p6: [
		earlier("h-p6-1", "p6", 14, { severity: "medium", title: "Out of bed without assistance", source: bedSensor }, {
			after: 6,
			reason: "Treated",
			by: "Lucy Hart, RN",
			note: "Back to bed, no fall. Bed alarm volume up.",
		}),
		earlier("h-p6-2", "p6", 38, { severity: "low", title: "Bed exit alarm", source: bedSensor }, {
			after: 3,
			reason: "Artifact or false alarm",
			by: "Lucy Hart, RN",
		}),
		earlier("h-p6-3", "p6", 62, { severity: "medium", title: "Vitals check overdue", source: nursing }, {
			after: 30,
			reason: "Treated",
			by: "Lucy Hart, RN",
		}),
	],
	// Taylor: perforated diverticulitis after Hartmann's.
	p7: [
		earlier("h-p7-1", "p7", 26, { severity: "medium", title: "Heart rate above 110 for 15 min", source: vitals }, {
			after: 30,
			reason: "Treated",
			note: "Pain controlled; HR 92.",
		}),
	],
	// Wilson: upper GI bleed after clipping.
	p8: [
		earlier("h-p8-1", "p8", 34, { severity: "high", title: "Systolic BP below 90", source: hemodynamics }, {
			after: 22,
			reason: "Treated",
			by: "Dr. Samuel Grant",
			note: "1 unit PRBCs.",
		}),
	],
	// Harris: aspiration pneumonia with sepsis.
	p9: [
		earlier("h-p9-1", "p9", 19, { severity: "medium", title: "SpO₂ below 90% for 5 min", source: oxygenation }, {
			after: 10,
			reason: "Treated",
			note: "Suctioned; 2 L → 4 L nasal cannula.",
		}),
		earlier("h-p9-2", "p9", 70, { severity: "high", title: "Sepsis candidate", source: sepsisSniffer }, {
			after: 45,
			reason: "Treated",
			by: "Dr. Joanna Smith",
		}),
	],
	// Moore: necrotizing soft tissue infection after debridement.
	p10: [
		earlier("h-p10-1", "p10", 28, { severity: "medium", title: "Temperature above 38.5 °C", source: vitals }, {
			after: 35,
			reason: "Expected for this patient",
		}),
	],
	// Clark: hypertensive emergency with PRES.
	p11: [
		earlier("h-p11-1", "p11", 24, { severity: "high", title: "Systolic BP above 180", source: hemodynamics }, {
			after: 20,
			reason: "Treated",
			note: "Nicardipine titrated to 7.5 mg/h.",
		}),
	],
	// Whitfield: stroke after thrombectomy.
	p12: [
		earlier("h-p12-1", "p12", 15, { severity: "medium", title: "Neuro check overdue", source: nursing }, {
			after: 12,
			reason: "Treated",
		}),
	],
	// Walker: cardiogenic shock on VA-ECMO.
	p13: [
		earlier("h-p13-1", "p13", 21, { severity: "high", title: "MAP below 65 for 10 min", source: hemodynamics }, {
			after: 16,
			reason: "Treated",
			by: "Dr. Samuel Grant",
		}),
		earlier("h-p13-2", "p13", 58, { severity: "low", title: "SpO₂ probe off", source: oximeter }, {
			after: 5,
			reason: "Artifact or false alarm",
		}),
	],
	// Bennett: AF with RVR.
	p14: [
		earlier("h-p14-1", "p14", 30, { severity: "high", title: "Heart rate above 140 for 5 min", source: vitals }, {
			after: 25,
			reason: "Treated",
			note: "Diltiazem drip started.",
		}),
	],
	// Hayes: heart failure (Scenario 1).
	p15: [
		earlier("h-p15-1", "p15", 46, { severity: "medium", title: "Weight up 2 kg in 24 h", source: nursing }, {
			after: 60,
			reason: "Treated",
			note: "Furosemide 40 mg IV.",
		}),
	],
	// Erickson: pneumonia.
	p16: [
		earlier("h-p16-1", "p16", 36, { severity: "low", title: "SpO₂ below 92% for 5 min", source: oxygenation }, {
			after: 10,
			reason: "Treated",
		}),
	],
};

export { sampleAlertHistoryByPatient };
