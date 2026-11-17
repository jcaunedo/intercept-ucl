import * as React from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/data-display/avatar";
import { Badge } from "@/components/data-display/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/data-display/table";
import { TagsPopover, TagsPopoverGroup } from "@/components/overlays/tags-popover";
import { cn } from "@/lib/utils";

import { patientInitials } from "../shared/patient-avatar";
import { patientStatus, patientStatuses } from "./patient-status";
import { isClinicalContextFlag } from "./patients-filters";
import {
	Attending,
	DirectoryActions,
	directoryIdentity,
	directoryName,
	directoryPlace,
	PatientStatus,
	RelativeTime,
} from "./patients-parts";
import type { DirectoryPatient } from "./patients-panel";

// Patients' Table view, the default (PRD Patients CEN-012): one row per patient, identity first, then status, location,
// the attending, last activity and clinical context. No score column: NEWS2 isn't how a directory is read (it's
// Monitoring's); no alert column either. No Last viewed column (Nov 17, 2026, user's call): it drives Recently viewed.

// Up to this many flags show in a row; the rest count as "+n" (all of them are in its accessible name).
const maxFlags = 2;

/** One patient's row. The name is the row's keyboard target; a click anywhere on the row (but its menu) opens too. */
function PatientsTableRow({
	patient,
	onOpenPatient,
	patientHref,
}: {
	patient: DirectoryPatient;
	onOpenPatient: (patientId: string) => void;
	patientHref?: (patientId: string) => string;
}) {
	const name = directoryName(patient);
	const identity = directoryIdentity(patient);
	const place = directoryPlace(patient);
	const inHospital = patientStatuses[patientStatus(patient)].inHospital;
	const flags = (patient.tags ?? []).filter((tag) => isClinicalContextFlag(tag.label));
	const open = () => onOpenPatient(patient.id);

	// The last row has no bottom rule: it would double the frame's bottom border.
	return (
		<TableRow onClick={open} className='cursor-pointer last:border-b-0'>
			<TableCell className='max-w-80'>
				<div className='flex items-center gap-3'>
					{/* Decorative: the name beside it says who it is. */}
					<Avatar aria-hidden='true' className='shrink-0'>
						{patient.photo ? <AvatarImage src={patient.photo} alt='' /> : null}
						<AvatarFallback tone={patient.tone}>{patient.initials ?? patientInitials(patient)}</AvatarFallback>
					</Avatar>
					<div className='flex min-w-0 flex-col'>
						<button
							type='button'
							title={name}
							onClick={(event) => {
								// The row's own click opens; this one is the keyboard's way in.
								event.stopPropagation();
								open();
							}}
							className='max-w-full truncate rounded-sm text-left font-semibold text-foreground outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring'
						>
							{name}
						</button>
						{identity ? <span className='truncate text-xs font-normal text-muted-foreground'>{identity}</span> : null}
					</div>
				</div>
			</TableCell>
			<TableCell>
				<PatientStatus patient={patient} />
			</TableCell>
			<TableCell className='max-w-80'>
				{/* One line, as on the patient cards and the Patient Header: "Sidney Regional · SICU · Bed 2". Only the hospital
				    truncates (full name in `title`); unit, room and bed always stay visible. Always `foreground` (Nov 17, 2026, user's
				    call): out of hospital it's the last place they were, which the Status column says; screen readers hear "Last
				    location". */}
				<div className='flex min-w-0'>
					{!inHospital ? <span className='sr-only'>Last location: </span> : null}
					{patient.hospital ? (
						<span title={patient.hospital} className='min-w-0 truncate'>
							{patient.hospital}
						</span>
					) : null}
					{place ? <span className='shrink-0 whitespace-pre'>{patient.hospital ? ` · ${place}` : place}</span> : null}
					{!patient.hospital && !place ? "—" : null}
				</div>
			</TableCell>
			<TableCell className='max-w-56'>
				<Attending patient={patient} />
			</TableCell>
			<TableCell>
				<RelativeTime value={patient.lastActivityAt} />
			</TableCell>
			<TableCell>
				{flags.length ? (
					<div className='flex items-center gap-1' aria-label={flags.map((tag) => tag.label).join(", ")} role='group'>
						{/* The same flags as the patient cards' (PatientCardTags): a flag with details opens them in its popover, one
						    open at a time, the mouse swapping between them once one is open. Its clicks stay off the row. */}
						<TagsPopoverGroup>
							{flags.slice(0, maxFlags).map((tag) =>
								tag.details ? (
									<TagsPopover key={tag.label} label={tag.label} variant={tag.variant} details={tag.details} size='xs' />
								) : (
									<Badge key={tag.label} variant={tag.variant ?? "outline"} size='xs' className='shrink-0'>
										{tag.label}
									</Badge>
								),
							)}
						</TagsPopoverGroup>
						{flags.length > maxFlags ? (
							<Badge variant='ghost' size='xs' aria-hidden='true' title={flags.slice(maxFlags).map((tag) => tag.label).join(", ")}>
								+{flags.length - maxFlags}
							</Badge>
						) : null}
					</div>
				) : (
					<span className='text-muted-foreground'>
						<span aria-hidden='true'>—</span>
						<span className='sr-only'>None</span>
					</span>
				)}
			</TableCell>
			{/* The menu's clicks (its portal's too: React events follow the tree) stay off the row. */}
			<TableCell onClick={(event) => event.stopPropagation()} className='w-10'>
				<DirectoryActions patient={patient} onOpen={open} patientHref={patientHref} />
			</TableCell>
		</TableRow>
	);
}

/** The directory as a table: semantic markup, a row per patient. Scrolls sideways inside its frame when the page is narrow. */
function PatientsTable({
	patients,
	onOpenPatient,
	patientHref,
	className,
}: {
	patients: DirectoryPatient[];
	onOpenPatient: (patientId: string) => void;
	patientHref?: (patientId: string) => string;
	className?: string;
}) {
	if (!patients.length) return null;
	return (
		<div className={cn("rounded-card border border-border bg-card shadow-sm", className)}>
			<Table size='md' aria-label='Patients' className='min-w-[64rem]'>
				<TableHeader variant='flat'>
					<TableRow className='hover:bg-transparent'>
						<TableHead scope='col'>Patient</TableHead>
						<TableHead scope='col'>Status</TableHead>
						<TableHead scope='col'>Location</TableHead>
						<TableHead scope='col'>Attending</TableHead>
						<TableHead scope='col'>Last activity</TableHead>
						<TableHead scope='col'>Clinical context</TableHead>
						<TableHead scope='col'>
							<span className='sr-only'>Actions</span>
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{patients.map((patient) => (
						<PatientsTableRow key={patient.id} patient={patient} onOpenPatient={onOpenPatient} patientHref={patientHref} />
					))}
				</TableBody>
			</Table>
		</div>
	);
}

/** Placeholder rows while the directory loads: the table's shape, pulsing (still under reduced motion). */
function PatientsTableSkeleton({ rows = 8 }: { rows?: number }) {
	return (
		<div aria-hidden='true' className='rounded-card border border-border bg-card shadow-sm'>
			<div className='h-10 rounded-t-card border-b border-border bg-background-subtle' />
			{Array.from({ length: rows }, (_, index) => (
				<div key={index} className='flex h-14 items-center gap-6 border-b border-border px-2 last:border-b-0'>
					<div className='flex w-72 items-center gap-3'>
						<div className='size-8 shrink-0 rounded-full bg-muted motion-safe:animate-pulse' />
						<div className='flex flex-1 flex-col gap-1.5'>
							<div className='h-3 w-3/4 rounded bg-muted motion-safe:animate-pulse' />
							<div className='h-2.5 w-1/2 rounded bg-muted motion-safe:animate-pulse' />
						</div>
					</div>
					<div className='h-5 w-20 rounded-full bg-muted motion-safe:animate-pulse' />
					<div className='h-3 w-40 rounded bg-muted motion-safe:animate-pulse' />
					<div className='h-3 w-28 rounded bg-muted motion-safe:animate-pulse' />
				</div>
			))}
		</div>
	);
}

export { PatientsTable, PatientsTableSkeleton };
