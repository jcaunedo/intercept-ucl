import { samplePatients } from "../../census/sample-census";
import { sampleEhrByHospital } from "../../sample-data/sample-ehr";
import type { PatientRecord } from "../patient-details";
import { samplePatientBaseRecords } from "../sample-patient-records";
import type { EmrFeed, EmrWriteBack, PatientEmr } from "./epic-section";
import type { PatientNote } from "./notes-section";
import { sampleNotesByPatient } from "./sample-notes";

// Synthetic data (PRD Patient details PD-150): each Census patient's hospital record (Epic, Cerner at Alliance, Meditech at Chadron). Each hospital tells a
// different data-depth story, in plain words (PD-121, PD-134):
// - Harbor Point General: charted vitals are behind, so a charted temperature can read stale (Sarah Miller's 38.9 °C);
//   signed Intercept notes are written back.
// - Alliance (Cerner): everything is up to date, and signed Intercept notes are written back.
// - CVMC: lab results arrive late, and the hospital doesn't take Intercept notes back yet.
// - Chadron: up to date, but charted vitals come every 4 h on its med-surg floor, and it doesn't
//   take Intercept notes back yet.
// Orders are read-only everywhere. Write-backs come from each patient's notes in `sample-notes.ts`, so the two agree.

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

type HospitalProfile = {
	prefix: string;
	state: PatientEmr["state"];
	/** The results feed, given the patient's latest result. */
	results: (latest?: string) => Pick<EmrFeed, "state" | "updatedAt" | "note">;
	vitals: Pick<EmrFeed, "state" | "updatedAt" | "note">;
	notes: Pick<EmrFeed, "access" | "note">;
};

const profiles: Record<string, HospitalProfile> = {
	"Harbor Point General": {
		prefix: "HPG",
		state: "delayed",
		results: (latest) => ({ state: "current", updatedAt: latest }),
		vitals: {
			state: "delayed",
			updatedAt: minutesAgo(92),
			note: "Nothing new for about 90 minutes, so a charted value like temperature can read stale. Monitor values on this page come from the bedside, not from here.",
		},
		notes: { access: "write" },
	},
	"Alliance": {
		prefix: "ACH",
		state: "connected",
		results: (latest) => ({ state: "current", updatedAt: latest }),
		vitals: { state: "current", updatedAt: minutesAgo(6) },
		notes: { access: "write" },
	},
	CVMC: {
		prefix: "CVMC",
		state: "delayed",
		results: (latest) => ({
			state: "delayed",
			updatedAt: latest,
			note: "CVMC's lab results are arriving late today. A result that's been drawn may not be here yet; check pending labs before acting on a trend.",
		}),
		vitals: { state: "current", updatedAt: minutesAgo(8) },
		notes: {
			access: "read",
			note: "CVMC doesn't take Intercept notes back yet. Signed Intercept notes stay in Intercept.",
		},
	},
	"Chadron": {
		prefix: "CCH",
		state: "connected",
		results: (latest) => ({ state: "current", updatedAt: latest }),
		vitals: {
			state: "current",
			updatedAt: minutesAgo(40),
			note: "Vitals are charted every 4 hours on this floor. Monitor values on this page come from the bedside, not from here.",
		},
		notes: {
			access: "read",
			note: "Chadron doesn't take Intercept notes back yet. Signed Intercept notes stay in Intercept.",
		},
	},
};

const latest = (times: (string | undefined)[]) =>
	times.reduce<string | undefined>((last, time) => (time && (!last || time > last) ? time : last), undefined);

function buildEmr(
	record: PatientRecord,
	index: number,
	patient: { hospital?: string; unit?: string } | undefined = samplePatients.find((item) => item.id === record.id),
	notes: PatientNote[] = sampleNotesByPatient[record.id]?.notes ?? [],
): PatientEmr | undefined {
	const hospital = patient?.hospital;
	const profile = hospital ? profiles[hospital] : undefined;
	if (!patient || !hospital || !profile) return undefined;
	const hospitalNotes = notes.filter((note) => note.origin === "hospital");

	const writeBacks: EmrWriteBack[] = notes
		.filter((note) => note.origin === "intercept" && (note.status === "written-back" || note.status === "write-back-failed"))
		.sort((a, b) => b.at.localeCompare(a.at))
		.map((note) => ({
			id: note.id,
			title: note.type,
			author: `${note.author.name}, ${note.author.role}`,
			at: note.writtenBackAt ?? note.at,
			status: note.status === "written-back" ? "written" : "failed",
			detail: note.failure,
		}));

	return {
		name: sampleEhrByHospital[hospital] ?? "Epic",
		hospital,
		state: profile.state,
		checkedAt: minutesAgo(1),
		encounter: {
			status: patient.unit ? `Inpatient · ${patient.unit}` : "Inpatient",
			admittedAt: record.admittedAt,
			account: `${profile.prefix}-${4400 + index * 37}-${String(1000 + index * 211).slice(-4)}`,
		},
		feeds: [
			{
				id: "adt",
				label: "Admissions and transfers",
				description: "Location, encounter, ICU admission and transfers",
				state: "current",
				updatedAt: minutesAgo(2),
				access: "read",
			},
			{
				id: "results",
				label: "Results",
				description: "Labs, microbiology and imaging reports",
				access: "read",
				...profile.results(latest((record.labs ?? []).map((lab) => lab.resultedAt))),
			},
			{
				id: "flowsheets",
				label: "Charted vitals",
				description: "Nurse-charted vitals, intake and output",
				access: "read",
				...profile.vitals,
			},
			{
				id: "medications",
				label: "Medications",
				description: "Active medications and what was given",
				state: "current",
				updatedAt: minutesAgo(4),
				access: "read",
			},
			{
				id: "orders",
				label: "Orders",
				description: "Active orders",
				state: "current",
				updatedAt: minutesAgo(12),
				access: "read-only",
			},
			{
				id: "notes",
				label: "Notes",
				description: profile.notes.access === "write" ? "Notes from the hospital; signed Intercept notes go back" : "Notes from the hospital",
				state: "current",
				updatedAt: latest(hospitalNotes.map((note) => note.at)),
				...profile.notes,
			},
		],
		writeBacks,
	};
}

const sampleEmrByPatient: Record<string, PatientEmr> = Object.fromEntries(
	samplePatientBaseRecords.flatMap((record, index) => {
		const emr = buildEmr(record, index);
		return emr ? [[record.id, emr]] : [];
	}),
);

/** A scenario patient's record system, from their card and notes (Scenario 2's Dale Reynolds isn't on the Census yet). */
const sampleScenarioEmr = (record: PatientRecord, patient: { hospital?: string; unit?: string }, notes: PatientNote[]) =>
	buildEmr(record, samplePatientBaseRecords.length, patient, notes);

export { sampleEmrByPatient, sampleScenarioEmr };
