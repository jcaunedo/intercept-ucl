import { isPressorFlag } from "../shared/pressors";
import { unitFilterGroup, type FilterGroup, type PatientFilters } from "../shared/patient-filters";
import type { PanelHospital } from "../shared/patient-panel";
import { levelOfCareOrder, levelsOfCare, patientLevelOfCare, patientStatus, patientStatusOrder, patientStatuses } from "./patient-status";
import type { DirectoryPatient } from "./patients-panel";

// Patients' groups for the shared Filters panel (`shared/patient-filters.tsx`; PRD Patients CEN-003): a directory's
// filters, never Monitoring's. Hospital and Unit first (the filter bar's Hospital and Unit menus set the same groups),
// then care team, status, recency and, last and secondary, clinical context. No score, alert or live-data
// group: those are Monitoring's.

const dayMs = 24 * 3_600_000;

/** Within the last `days` days (today: since midnight). */
const within = (iso: string | undefined, days: number | "today") => {
	if (!iso) return false;
	const time = Date.parse(iso);
	if (days === "today") {
		const midnight = new Date();
		midnight.setHours(0, 0, 0, 0);
		return time >= midnight.getTime();
	}
	return Date.now() - time < days * dayMs;
};

const tagged = (match: (label: string) => boolean) => (patient: DirectoryPatient) =>
	(patient.tags ?? []).some((tag) => match(tag.label));

// Clinical context: the flags that help tell patients apart in a directory (PRD Patients CEN-003). Secondary.
const clinicalOptions = [
	{ id: "ventilated", label: "Ventilated", matches: tagged((label) => label === "Ventilated") },
	{ id: "pressor", label: "On pressors", matches: tagged(isPressorFlag) },
	{ id: "dialysis", label: "Dialysis", matches: tagged((label) => label === "Dialysis") },
	{ id: "isolation", label: "Isolation", matches: tagged((label) => /isolation/i.test(label)) },
	{ id: "dnr", label: "DNR", matches: tagged((label) => /^DNR/.test(label)) },
	{ id: "fall", label: "Fall risk", matches: tagged((label) => label === "Fall risk") },
];

/** Whether a flag is one the directory shows as clinical context (the table's column, the card's tag row). */
const isClinicalContextFlag = (label: string) =>
	label === "Ventilated" || isPressorFlag(label) || label === "Dialysis" || /isolation/i.test(label) || /^DNR/.test(label) || label === "Fall risk";

/**
 * The filter groups for these patients. Unit lists the units among `patients` in the picked hospitals (all of them
 * without one), plus any already picked; Care team lists the attendings the patients have.
 */
function patientsFilterGroups(
	patients: DirectoryPatient[],
	hospitals: PanelHospital[],
	filters: PatientFilters,
): FilterGroup<DirectoryPatient>[] {
	const pickedHospitals = filters.hospital ?? [];
	const inHospitals = pickedHospitals.length
		? patients.filter((patient) => pickedHospitals.includes(patient.hospitalId))
		: patients;
	const attendings = [...new Set(patients.map((patient) => patient.attending).filter((name): name is string => Boolean(name)))].sort();
	const statuses = patientStatusOrder.filter((status) => patients.some((patient) => patientStatus(patient) === status));

	return [
		{
			id: "hospital",
			title: "Hospital",
			options: hospitals.map((hospital) => ({
				id: hospital.id,
				label: hospital.name,
				matches: (patient: DirectoryPatient) => patient.hospitalId === hospital.id,
			})),
		},
		unitFilterGroup(inHospitals, filters),
		{
			id: "relationship",
			title: "Care team",
			options: [
				// My patients is the filter bar's chip, not repeated here.
				{ id: "team", label: "On my care team", matches: (patient) => Boolean(patient.onCareTeam) },
				...attendings.map((name) => ({
					id: `attending:${name}`,
					label: `${name} (attending)`,
					matches: (patient: DirectoryPatient) => patient.attending === name,
				})),
			],
		},
		{
			id: "status",
			title: "Patient status",
			// Admitted splits by level of care, most intensive first, then admitted on another unit (PRD Patients CEN-040).
			options: statuses.flatMap((status) => {
				const { label, icon } = patientStatuses[status];
				if (status !== "admitted") {
					return [{ id: status, label, icon, matches: (patient: DirectoryPatient) => patientStatus(patient) === status }];
				}
				const admitted = patients.filter((patient) => patientStatus(patient) === "admitted");
				const levels = levelOfCareOrder.filter((level) => admitted.some((patient) => patientLevelOfCare(patient) === level));
				return [
					...levels.map((level) => ({
						id: `admitted:${level}`,
						label: `${label} · ${levelsOfCare[level].label}`,
						icon,
						matches: (patient: DirectoryPatient) => patientStatus(patient) === "admitted" && patientLevelOfCare(patient) === level,
					})),
					...(admitted.some((patient) => !patientLevelOfCare(patient))
						? [
								{
									id: "admitted:other",
									label: `${label} · Other unit`,
									icon,
									matches: (patient: DirectoryPatient) => patientStatus(patient) === "admitted" && !patientLevelOfCare(patient),
								},
							]
						: []),
				];
			}),
		},
		{
			id: "recency",
			title: "Last encounter",
			options: [
				// A stay still going is in every window; one that ended, by when it ended.
				{ id: "today", label: "Today", matches: (patient) => patient.encounterOngoing || within(patient.lastEncounterAt, "today") },
				{ id: "7d", label: "Last 7 days", matches: (patient) => patient.encounterOngoing || within(patient.lastEncounterAt, 7) },
				{ id: "30d", label: "Last 30 days", matches: (patient) => patient.encounterOngoing || within(patient.lastEncounterAt, 30) },
			],
		},
		{ id: "clinical", title: "Clinical context", options: clinicalOptions },
	];
}

export { isClinicalContextFlag, patientsFilterGroups };
