import { patientCardAcuityLevels, type PatientCardAcuityLevel } from "@/components/cards/patient-card";

import {
	alertFilterGroup,
	tagFilterGroups,
	unitFilterGroup,
	type FilterGroup,
	type PatientFilters,
} from "../shared/patient-filters";
import type { CensusPatient } from "./census-panel";

// The Census's groups for the shared Filters panel (`shared/patient-filters.tsx`). Groups the census has no data for
// (alert type, the sepsis validation steps) are left out until it does.

// The card's "Change in last 24 h" as a number: "+7", "−3", "0"; none without a value.
const change = (patient: CensusPatient) => {
	const value = patient.trajectory?.value;
	if (patient.trajectory?.variant === "missing" || value === undefined) return undefined;
	const number = Number(String(value).replace("−", "-"));
	return Number.isNaN(number) ? undefined : number;
};

// Score bands, most severe first; a score shows only the bands its patients have.
const levelOrder: PatientCardAcuityLevel[] = ["critical", "high", "moderate", "medium", "low"];

/**
 * The filter groups for these patients. Unit lists the units among `patients` (the hospital tab's), plus any already
 * picked; the score group is titled by the score's name ("NEWS2") and lists its bands.
 */
function censusFilterGroups(patients: CensusPatient[], filters: PatientFilters): FilterGroup<CensusPatient>[] {
	const scoreName = patients.find((patient) => patient.acuity)?.acuity?.label ?? "Score";
	const levels = levelOrder.filter((level) => patients.some((patient) => patient.acuity?.level === level));

	return [
		unitFilterGroup(patients, filters),
		alertFilterGroup(),
		{
			id: "score",
			title: scoreName,
			options: [
				...levels.map((level) => ({
					id: level,
					label: patientCardAcuityLevels[level].label,
					matches: (patient: CensusPatient) => patient.acuity?.level === level,
				})),
				{ id: "none", label: "No score", matches: (patient) => patient.acuity?.score === undefined },
			],
		},
		{
			id: "change",
			title: "Change in last 24 h",
			options: [
				{ id: "rise2", label: "Rising 2 or more", matches: (patient) => (change(patient) ?? 0) >= 2 },
				{ id: "rise1", label: "Rising 1", matches: (patient) => change(patient) === 1 },
				{ id: "flat", label: "No change", matches: (patient) => change(patient) === 0 },
				{ id: "fall", label: "Falling", matches: (patient) => (change(patient) ?? 0) < 0 },
			],
		},
		...tagFilterGroups<CensusPatient>(),
		{
			id: "sepsis",
			title: "Sepsis",
			options: [{ id: "watch", label: "Sepsis watch", matches: (patient) => Boolean(patient.sepsisWatch) }],
		},
	];
}

export { censusFilterGroups };
