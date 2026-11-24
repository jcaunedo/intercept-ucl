import {
	ArrowRightLeftIcon,
	CircleCheckIcon,
	CircleDotIcon,
	CircleHelpIcon,
	HourglassIcon,
	type LucideIcon,
} from "lucide-react";

import type { BadgeProps } from "@/components/data-display/badge";

// The patient's census status (PRD Patients CEN-040): where they are in their stay, from ADT. The values are the
// Requirements Specification's Patient / Encounter contract ("Census status: admitted / transferred / discharged /
// pending reconciliation / unknown"), not a new concept. On screen, `admitted` reads "Admitted", ADT's own word (the
// patient is in hospital now; it read "Current" until Nov 24, 2026; glossary "Patient status").

type PatientCensusStatus = "admitted" | "transferred" | "discharged" | "pending-reconciliation" | "unknown";

type PatientStatusInfo = {
	label: string;
	/** Shown with the label, so the status never relies on color alone. */
	icon: LucideIcon;
	variant: NonNullable<BadgeProps["variant"]>;
	/** Still in hospital: on the census, and the census list's. */
	inHospital: boolean;
};

const patientStatuses: Record<PatientCensusStatus, PatientStatusInfo> = {
	admitted: { label: "Admitted", icon: CircleDotIcon, variant: "green", inHospital: true },
	"pending-reconciliation": { label: "Pending reconciliation", icon: HourglassIcon, variant: "amber", inHospital: true },
	transferred: { label: "Transferred", icon: ArrowRightLeftIcon, variant: "blue", inHospital: false },
	discharged: { label: "Discharged", icon: CircleCheckIcon, variant: "secondary", inHospital: false },
	unknown: { label: "Status unknown", icon: CircleHelpIcon, variant: "outline", inHospital: false },
};

/** The order statuses are listed in (the Filters panel's Patient status). */
const patientStatusOrder: PatientCensusStatus[] = ["admitted", "pending-reconciliation", "transferred", "discharged", "unknown"];

/** A patient's status: missing is Unknown, never Admitted (SV-08: missing is never shown as normal). */
const patientStatus = (patient: { status?: PatientCensusStatus }): PatientCensusStatus => patient.status ?? "unknown";

/**
 * How intensive an admitted patient's care is (PRD Patients CEN-040): from ADT, the unit's level of care as the hospital
 * maps it (a PCU or intermediate care unit is Step-down). A unit outside the three (the ED, Observation, a swing bed)
 * has none, and the status reads "Admitted" alone.
 */
type LevelOfCare = "icu" | "step-down" | "med-surg";

const levelsOfCare: Record<LevelOfCare, { label: string }> = {
	icu: { label: "ICU" },
	"step-down": { label: "Step-down" },
	"med-surg": { label: "Med-surg" },
};

/** Most intensive first: the order the Filters panel lists them in. */
const levelOfCareOrder: LevelOfCare[] = ["icu", "step-down", "med-surg"];

/** An admitted patient's level, if the record has one; none for any other status (the level is the stay's now). */
const patientLevelOfCare = (patient: { status?: PatientCensusStatus; levelOfCare?: LevelOfCare }): LevelOfCare | undefined =>
	patientStatus(patient) === "admitted" ? patient.levelOfCare : undefined;

/** The status as the screen writes it: "Admitted · ICU", "Admitted" without a level, else the status's own word. */
function patientStatusLabel(patient: { status?: PatientCensusStatus; levelOfCare?: LevelOfCare }) {
	const status = patientStatus(patient);
	const level = patientLevelOfCare(patient);
	return level ? `${patientStatuses[status].label} · ${levelsOfCare[level].label}` : patientStatuses[status].label;
}

export {
	levelOfCareOrder,
	levelsOfCare,
	patientLevelOfCare,
	patientStatus,
	patientStatusLabel,
	patientStatusOrder,
	patientStatuses,
	type LevelOfCare,
	type PatientCensusStatus,
	type PatientStatusInfo,
};
