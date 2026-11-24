import * as React from "react";
import { ArrowUpRightIcon, EllipsisIcon, LinkIcon } from "lucide-react";

import { Button } from "@/components/buttons/button";
import { Badge } from "@/components/data-display/badge";
import { toast } from "@/components/feedback/sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/overlays/tooltip";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/overlays/dropdown-menu";
import { useCurrentMinute } from "@/lib/hooks/use-current-minute";
import { formatRelativeDate } from "@/lib/relative-date";
import { cn } from "@/lib/utils";

import { patientStatus, patientStatusLabel, patientStatuses } from "./patient-status";
import type { DirectoryPatient } from "./patients-panel";

// The pieces the Patients table and cards share (PRD Patients CEN-010, CEN-040–CEN-042), so the two views always say the
// same thing the same way.

/** "Miller, Sarah", as every patient list names a patient. */
const directoryName = (patient: Pick<DirectoryPatient, "lastName" | "firstName">) => `${patient.lastName}, ${patient.firstName}`;

/** "01033876 · F · 59": the MRN, sex and age. */
const directoryIdentity = (patient: DirectoryPatient) =>
	[patient.mrn, patient.sex, patient.age].filter((part) => part !== undefined && part !== "").join(" · ");

/** "MICU · Bed 11": where in the hospital, room and bed together. */
const directoryPlace = (patient: DirectoryPatient) =>
	[patient.unit, patient.room && patient.bed ? `${patient.room} - ${patient.bed}` : (patient.room ?? patient.bed)]
		.filter(Boolean)
		.join(" · ");

/**
 * A time as the directory shows it: "18 min ago", "Yesterday", "Nov 2, 2026", the exact time in `title` (a convenience,
 * never the only place it's said: the label is the value). Updated each minute. A missing time reads "—", and
 * screen readers hear `missing` ("Unknown") instead.
 */
function RelativeTime({ value, missing = "Unknown", className }: { value?: string; missing?: string; className?: string }) {
	const now = useCurrentMinute() ?? Date.now();
	if (!value) {
		return (
			<span className={cn("text-muted-foreground", className)}>
				<span aria-hidden='true'>—</span>
				<span className='sr-only'>{missing}</span>
			</span>
		);
	}
	const { label, title } = formatRelativeDate(value, now);
	return (
		<time dateTime={value} title={title} className={className}>
			{label}
		</time>
	);
}

// What each status adds beyond its word, in the badge's tooltip (PRD Patients CEN-040).
const statusExplanations: Partial<Record<ReturnType<typeof patientStatus>, string>> = {
	"pending-reconciliation": "The hospital's record of this stay needs confirming.",
	unknown: "The hospital hasn't sent a status for this patient.",
};

/** The status's details: where a transfer went, when the patient left (exact, then relative), what an uncertain status means. */
function statusDetails(patient: DirectoryPatient, now: number) {
	const status = patientStatus(patient);
	const left = !patientStatuses[status].inHospital && patient.statusAt ? formatRelativeDate(patient.statusAt, now) : undefined;
	return [
		patient.transferredTo ? `To ${patient.transferredTo}` : undefined,
		left ? `${status === "transferred" ? "Transferred" : status === "discharged" ? "Discharged" : "Left"} ${left.title} · ${left.label}` : undefined,
		statusExplanations[status],
	].filter((line): line is string => Boolean(line));
}

/**
 * The patient's status as a badge, its icon and word (never color alone). Its details (where a transfer went, when the
 * patient left, what an uncertain status means) show in a tooltip on hover or keyboard focus (Nov 17, 2026, user's call),
 * so the column stays one line; screen readers get them with the badge, so they're never only in the tooltip.
 * `detail={false}` (the cards, whose whole surface opens the patient) shows the badge alone.
 */
function PatientStatus({ patient, detail = true }: { patient: DirectoryPatient; detail?: boolean }) {
	const status = patientStatus(patient);
	const { icon: Icon, variant } = patientStatuses[status];
	const label = patientStatusLabel(patient);
	const now = useCurrentMinute() ?? Date.now();
	const details = detail ? statusDetails(patient, now) : [];
	const badge = (
		<Badge variant={variant} size='xs'>
			<Icon aria-hidden='true' />
			{label}
		</Badge>
	);
	if (!details.length) return <div className='flex'>{badge}</div>;
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					{/* Focusable, so the keyboard opens the tooltip too; a click still reaches the row and opens the patient. */}
					<span
						tabIndex={0}
						className='inline-flex rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring'
					>
						{badge}
						<span className='sr-only'>. {details.join(". ")}</span>
					</span>
				</TooltipTrigger>
				<TooltipContent side='top' arrow aria-hidden='true' className='flex flex-col gap-0.5'>
					{details.map((line) => (
						<span key={line}>{line}</span>
					))}
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

/**
 * The doctor in charge of the patient's stay: the attending of record, from the record's care team (PRD Patients
 * CEN-042). The table's Attending column shows the name alone; a card, with no column header, says "Attending: …". None
 * recorded reads "—" ("No attending recorded"), and a card shows nothing.
 */
function Attending({ patient, labeled = false }: { patient: DirectoryPatient; labeled?: boolean }) {
	if (!patient.attending) {
		return labeled ? null : (
			<span className='text-muted-foreground'>
				<span aria-hidden='true'>—</span>
				<span className='sr-only'>No attending recorded</span>
			</span>
		);
	}
	return (
		<span title={patient.attending} className={cn("block max-w-full truncate", labeled && "text-muted-foreground")}>
			{labeled ? `Attending: ${patient.attending}` : patient.attending}
		</span>
	);
}

/**
 * A link to the patient's page: the app's (`patientHref`), else this page's address with the patient in it, the
 * prototype's shareable link (`?patient=…`).
 */
const defaultPatientHref = (patientId: string) => {
	const url = new URL(window.location.href);
	url.searchParams.set("patient", patientId);
	return url.toString();
};

async function copyPatientLink(patientId: string, name: string, patientHref = defaultPatientHref) {
	try {
		await navigator.clipboard.writeText(patientHref(patientId));
		toast.success(`Link to ${name} copied`);
	} catch {
		toast.error("Couldn't copy the link. Try again.");
	}
}

/**
 * A row's "…" menu (PRD Patients CEN-015): Open patient and Copy patient link. No clinical actions: the directory finds
 * and opens records; acting on a patient happens on their page or on Monitoring.
 */
function DirectoryActions({
	patient,
	onOpen,
	patientHref,
}: {
	patient: DirectoryPatient;
	onOpen: () => void;
	patientHref?: (patientId: string) => string;
}) {
	const name = directoryName(patient);
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant='ghost' size='icon-xs' aria-label={`More for ${name}`} className='text-icon-subtle'>
					<EllipsisIcon />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='end'>
				<DropdownMenuItem onSelect={onOpen}>
					<ArrowUpRightIcon />
					Open patient
				</DropdownMenuItem>
				<DropdownMenuItem onSelect={() => void copyPatientLink(patient.id, name, patientHref)}>
					<LinkIcon />
					Copy patient link
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

/**
 * The patient's last encounter, their latest hospital stay (glossary "Admission / encounter"): "Admitted 3 days ago"
 * while it goes on, "Ended 20 hr ago" once they've left, the exact time in `title`. Updated each minute. Without the
 * time it reads "—" ("Unknown" to screen readers).
 */
function LastEncounter({ patient, className }: { patient: DirectoryPatient; className?: string }) {
	const now = useCurrentMinute() ?? Date.now();
	if (!patient.lastEncounterAt) return <RelativeTime className={className} />;
	const { label, title } = formatRelativeDate(patient.lastEncounterAt, now);
	const verb = patient.encounterOngoing ? "Admitted" : "Ended";
	return (
		<time dateTime={patient.lastEncounterAt} title={`${verb} ${title}`} className={className}>
			{verb} {label}
		</time>
	);
}

export {
	Attending,
	copyPatientLink,
	DirectoryActions,
	directoryIdentity,
	directoryName,
	directoryPlace,
	LastEncounter,
	PatientStatus,
	RelativeTime,
};
