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
// pending reconciliation / unknown"), not a new concept. On screen, `admitted` reads "Current" (the patient is in
// hospital now; glossary "Current patient").

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
	admitted: { label: "Current", icon: CircleDotIcon, variant: "green", inHospital: true },
	"pending-reconciliation": { label: "Pending reconciliation", icon: HourglassIcon, variant: "amber", inHospital: true },
	transferred: { label: "Transferred", icon: ArrowRightLeftIcon, variant: "blue", inHospital: false },
	discharged: { label: "Discharged", icon: CircleCheckIcon, variant: "secondary", inHospital: false },
	unknown: { label: "Status unknown", icon: CircleHelpIcon, variant: "outline", inHospital: false },
};

/** The order statuses are listed in (the Filters panel's Patient status). */
const patientStatusOrder: PatientCensusStatus[] = ["admitted", "pending-reconciliation", "transferred", "discharged", "unknown"];

/** A patient's status: missing is Unknown, never Current (SV-08: missing is never shown as normal). */
const patientStatus = (patient: { status?: PatientCensusStatus }): PatientCensusStatus => patient.status ?? "unknown";

export { patientStatus, patientStatusOrder, patientStatuses, type PatientCensusStatus, type PatientStatusInfo };
