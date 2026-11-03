import * as React from "react";
import { AnimatePresence, motion } from "motion/react";

import { PatientCardAlert, patientCardAcuityLevels, scoreTrendClassName } from "@/components/cards/patient-census-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/data-display/avatar";
import { Badge } from "@/components/data-display/badge";
import { HospitalSectionHeader } from "@/components/data-display/hospital-section-header";
import { exitTransition, resolvedFadeTransition, useMotionPreference } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { patientInitials } from "../shared/patient-avatar";
import { activeAlertCount, type PanelHospital } from "../shared/patient-panel";
import type { CensusPatient } from "./census-panel";

// The Census's List density: one row per patient with what the card shows (identity, location, top alert, score, its
// 24 h change and tags) as columns. Built like Monitoring's List (`monitoring/monitoring-list.tsx`), without vitals:
// live values belong on Monitoring.


/** One patient's row. The name opens the patient; the whole row does too, for the mouse. */
function CensusListRow({ patient, onOpenPatient }: { patient: CensusPatient; onOpenPatient?: (id: string) => void }) {
	const name = `${patient.lastName}, ${patient.firstName}`;
	const identity = [patient.mrn, [patient.sex, patient.age].filter(Boolean).join(", ")].filter(Boolean).join(" - ");
	const { resolve } = useMotionPreference();
	const { acuity, trajectory } = patient;
	const level = acuity?.level ?? (acuity && acuity.score === undefined ? "unknown" : undefined);
	const change = trajectory && trajectory.variant !== "missing" && trajectory.value !== undefined ? trajectory : undefined;

	return (
		<tr
			onClick={onOpenPatient ? () => onOpenPatient(patient.id) : undefined}
			className={cn("border-b border-border-muted last:border-b-0", onOpenPatient && "cursor-pointer hover:bg-accent")}
		>
			<td className='max-w-72 px-4 py-2.5'>
				{/* The patient's avatar, as on their card: the photo, or the initials in their color. Decorative. */}
				<div className='flex items-center gap-3'>
					<Avatar aria-hidden='true'>
						{patient.photo ? <AvatarImage src={patient.photo} alt='' /> : null}
						<AvatarFallback tone={patient.tone}>{patient.initials ?? patientInitials(patient)}</AvatarFallback>
					</Avatar>
					<div className='min-w-0'>
						{onOpenPatient ? (
							<button
								type='button'
								title={name}
								onClick={(event) => {
									event.stopPropagation();
									onOpenPatient(patient.id);
								}}
								className='block max-w-full truncate rounded-sm text-left font-bold text-foreground outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring'
							>
								{name}
							</button>
						) : (
							<span title={name} className='block truncate font-bold text-foreground'>
								{name}
							</span>
						)}
						{identity ? <div className='text-xs text-muted-foreground'>{identity}</div> : null}
					</div>
				</div>
			</td>
			<td className='px-4 py-2.5'>
				<div className='text-sm whitespace-nowrap text-foreground'>
					{[patient.unit, patient.room && patient.bed ? `${patient.room} - ${patient.bed}` : (patient.room ?? patient.bed)]
						.filter(Boolean)
						.join(" · ")}
				</div>
				<div className='text-xs text-muted-foreground'>{patient.hospital}</div>
			</td>
			<td className='px-4 py-2.5'>
				{/* As on the cards, a "Resolved" pill fades out slowly; the dash follows it. */}
				<AnimatePresence initial={false} mode='wait'>
					{patient.alert ? (
						<motion.div
							key='alert'
							exit={{
								opacity: 0,
								transition: resolve(patient.alert.variant === "resolved" ? resolvedFadeTransition : exitTransition),
							}}
							className='flex'
						>
							<PatientCardAlert variant={patient.alert.variant} count={patient.alert.count} className='py-1 text-xs'>
								{patient.alert.label}
							</PatientCardAlert>
						</motion.div>
					) : (
						<span key='none' className='text-muted-foreground'>
							<span aria-hidden='true'>—</span>
							<span className='sr-only'>No alert</span>
						</span>
					)}
				</AnimatePresence>
			</td>
			<td className='px-4 py-2.5 whitespace-nowrap'>
				{acuity ? (
					<>
						<span className='text-base font-semibold text-foreground tabular-nums'>{acuity.score ?? "--"}</span>
						{level ? (
							<span className={cn("ml-2 text-base", patientCardAcuityLevels[level].className)}>
								{patientCardAcuityLevels[level].label}
							</span>
						) : null}
					</>
				) : (
					<span className='text-muted-foreground'>--</span>
				)}
			</td>
			<td className='px-4 py-2.5 text-base font-semibold whitespace-nowrap tabular-nums'>
				{change ? (
					<>
						{change.trend ? (
							<span
								aria-hidden='true'
								className={cn("mr-0.5", scoreTrendClassName(change))}
							>
								{change.trend === "up" ? "▲" : "▼"}
							</span>
						) : null}
						{change.trend ? <span className='sr-only'>{change.trend === "up" ? "rising " : "falling "}</span> : null}
						{change.value}
					</>
				) : (
					<span className='text-muted-foreground'>--</span>
				)}
			</td>
			<td className='px-4 py-2.5'>
				{patient.tags?.length ? (
					<div className='flex flex-wrap gap-1'>
						{patient.tags.map((tag) => (
							<Badge key={tag.label} variant={tag.variant ?? "outline"} size='xs'>
								{tag.label}
							</Badge>
						))}
					</div>
				) : null}
			</td>
		</tr>
	);
}

/**
 * The census as a table. Location groups it by hospital, with a HospitalSectionHeader row per hospital (the patients
 * must already be sorted by hospital). Scrolls sideways inside its frame when the page is narrow.
 */
function CensusList({
	patients,
	hospitals,
	grouped,
	onOpenPatient,
	className,
	...props
}: Omit<React.ComponentProps<"div">, "children"> & {
	patients: CensusPatient[];
	hospitals: PanelHospital[];
	grouped: boolean;
	onOpenPatient?: (patientId: string) => void;
}) {
	if (!patients.length) return null;
	const sections = grouped
		? hospitals
				.map((hospital) => ({ hospital, patients: patients.filter((patient) => patient.hospitalId === hospital.id) }))
				.filter((section) => section.patients.length)
		: [{ hospital: undefined, patients }];
	// The score column takes the score's name ("NEWS2"), as the card's label does.
	const scoreName = patients.find((patient) => patient.acuity)?.acuity?.label ?? "Score";
	const headers = ["Patient", "Location", "Alert", scoreName, "Change in 24 h", "Tags"];

	return (
		<div className={cn("overflow-x-auto rounded-card border border-border bg-card shadow-sm", className)} {...props}>
			<table className='w-full min-w-[56rem] border-collapse text-sm'>
				<thead>
					<tr className='border-b border-border text-left text-xs font-semibold text-muted-foreground'>
						{headers.map((header) => (
							<th key={header} scope='col' className='px-4 py-2.5 font-semibold whitespace-nowrap'>
								{header}
							</th>
						))}
					</tr>
				</thead>
				{sections.map(({ hospital, patients: rows }, index) => (
					<tbody key={hospital?.id ?? "all"}>
						{hospital ? (
							// A line between one hospital's last patient and the next hospital.
							<tr className={cn("border-b border-border", index > 0 && "border-t")}>
								<td colSpan={headers.length} className='px-4 pt-4 pb-3'>
									<HospitalSectionHeader name={hospital.name} patientCount={rows.length} alertCount={activeAlertCount(rows)} />
								</td>
							</tr>
						) : null}
						{rows.map((patient) => (
							<CensusListRow key={patient.id} patient={patient} onOpenPatient={onOpenPatient} />
						))}
					</tbody>
				))}
			</table>
		</div>
	);
}

export { CensusList };
