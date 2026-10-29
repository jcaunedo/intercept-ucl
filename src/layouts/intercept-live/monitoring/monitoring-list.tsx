import * as React from "react";
import { AnimatePresence, motion } from "motion/react";

import { PatientCardAlert } from "@/components/cards/patient-card";
import {
	defaultMonitorLimits,
	type MonitorLimits,
	type MonitorVitals,
} from "@/components/cards/patient-monitoring-card";
import { HospitalSectionHeader } from "@/components/data-display/hospital-section-header";
import { exitTransition, resolvedFadeTransition, useMotionPreference } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { activeAlertCount, type PanelHospital, type PanelPatient } from "../shared/patient-panel";

// The panel's List density (PRD Monitoring MON-012): one row per patient, the primary numerics as columns, for large
// panels. The numbers keep their parameter colors (MON-072), in the `-ink` shades that read on the page's surface.

type MonitoringListPatient = PanelPatient & {
	mrn?: string;
	sex?: string;
	age?: number | string;
	vitals?: MonitorVitals;
	limits?: Partial<MonitorLimits>;
};

type Column = {
	key: "hr" | "spo2" | "bp" | "map" | "rr";
	label: string;
	unit: string;
	color: string;
	limit?: keyof MonitorLimits;
};

const columns: Column[] = [
	{ key: "hr", label: "HR", unit: "bpm", color: "text-monitor-ecg-ink", limit: "hr" },
	{ key: "spo2", label: "SpO₂", unit: "%", color: "text-monitor-spo2-ink", limit: "spo2" },
	{ key: "bp", label: "ABP", unit: "mmHg", color: "text-monitor-abp-ink", limit: "systolic" },
	{ key: "map", label: "MAP", unit: "mmHg", color: "text-monitor-abp-ink" },
	{ key: "rr", label: "RR", unit: "rpm", color: "text-monitor-resp-ink", limit: "rr" },
];

/** A column's value, its "--" when missing (never zero), and which side of its alarm limits it's on. */
function reading(patient: MonitoringListPatient, column: Column) {
	const vitals = patient.vitals ?? {};
	const raw = column.key === "bp" ? vitals.systolic : vitals[column.key];
	const text =
		column.key === "bp"
			? vitals.systolic !== undefined && vitals.diastolic !== undefined
				? `${vitals.systolic}/${vitals.diastolic}`
				: undefined
			: raw;
	if (!column.limit || raw === undefined) return { text, alarm: undefined };
	const [low, high] = { ...defaultMonitorLimits, ...patient.limits }[column.limit];
	return { text, alarm: raw > high ? "above" : raw < low ? "below" : undefined };
}

/** One patient's row. The name opens the patient; the whole row does too, for the mouse. */
function ListRow({ patient, onOpenPatient }: { patient: MonitoringListPatient; onOpenPatient?: (id: string) => void }) {
	const name = `${patient.lastName}, ${patient.firstName}`;
	const identity = [patient.mrn, [patient.sex, patient.age].filter(Boolean).join(", ")].filter(Boolean).join(" - ");
	const { resolve } = useMotionPreference();

	return (
		<tr
			onClick={onOpenPatient ? () => onOpenPatient(patient.id) : undefined}
			className={cn("border-b border-border-muted last:border-b-0", onOpenPatient && "cursor-pointer hover:bg-accent")}
		>
			<td className='px-4 py-2.5'>
				{onOpenPatient ? (
					<button
						type='button'
						onClick={(event) => {
							event.stopPropagation();
							onOpenPatient(patient.id);
						}}
						className='rounded-sm text-left font-bold text-foreground outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring'
					>
						{name}
					</button>
				) : (
					<span className='font-bold text-foreground'>{name}</span>
				)}
				{identity ? <div className='text-xs text-muted-foreground'>{identity}</div> : null}
			</td>
			<td className='px-4 py-2.5'>
				<div className='text-sm text-foreground'>{[patient.unit, patient.bed].filter(Boolean).join(" · ")}</div>
				<div className='text-xs text-muted-foreground'>{patient.hospital}</div>
			</td>
			<td className='px-4 py-2.5'>
				{/* As on the cards, a "Resolved" pill moves with its row, then fades out slowly; the dash follows it. */}
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
			{columns.map((column) => {
				const { text, alarm } = reading(patient, column);
				return (
					<td
						key={column.key}
						data-alarm={alarm}
						className={cn(
							"px-4 py-2.5 text-right text-base font-semibold whitespace-nowrap tabular-nums",
							text === undefined ? "text-muted-foreground" : column.color,
						)}
					>
						{/* The same ↑ / ↓ tag as on the card's monitor, in the page's ink (PRD MON-014, MON-073). */}
						{alarm ? (
							<span
								aria-hidden='true'
								className='mr-1.5 inline-grid size-3.5 place-items-center rounded-sm bg-foreground align-[1px] text-[10px] leading-none font-bold text-background'
							>
								{alarm === "above" ? "↑" : "↓"}
							</span>
						) : null}
						{text ?? "--"}
						{alarm ? <span className='sr-only'>, {alarm} alarm limits</span> : null}
					</td>
				);
			})}
		</tr>
	);
}

/**
 * The panel as a table. Location groups it by hospital, with a HospitalSectionHeader row per hospital (the patients
 * must already be sorted by hospital). Scrolls sideways inside its frame when the page is narrow.
 */
function MonitoringList({
	patients,
	hospitals,
	grouped,
	onOpenPatient,
	className,
	...props
}: Omit<React.ComponentProps<"div">, "children"> & {
	patients: MonitoringListPatient[];
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

	return (
		<div className={cn("overflow-x-auto rounded-card border border-border bg-card shadow-sm", className)} {...props}>
			<table className='w-full min-w-[56rem] border-collapse text-sm'>
				<thead>
					<tr className='border-b border-border text-left text-xs font-semibold text-muted-foreground'>
						<th scope='col' className='px-4 py-2.5 font-semibold'>
							Patient
						</th>
						<th scope='col' className='px-4 py-2.5 font-semibold'>
							Location
						</th>
						<th scope='col' className='px-4 py-2.5 font-semibold'>
							Alert
						</th>
						{columns.map((column) => (
							<th key={column.key} scope='col' className='px-4 py-2.5 text-right font-semibold whitespace-nowrap'>
								<span className={column.color}>{column.label}</span> {column.unit}
							</th>
						))}
					</tr>
				</thead>
				{sections.map(({ hospital, patients: rows }) => (
					<tbody key={hospital?.id ?? "all"}>
						{hospital ? (
							<tr className='border-b border-border'>
								<td colSpan={3 + columns.length} className='px-4 pt-4 pb-3'>
									<HospitalSectionHeader
										name={hospital.name}
										patientCount={rows.length}
										alertCount={activeAlertCount(rows)}
									/>
								</td>
							</tr>
						) : null}
						{rows.map((patient) => (
							<ListRow key={patient.id} patient={patient} onOpenPatient={onOpenPatient} />
						))}
					</tbody>
				))}
			</table>
		</div>
	);
}

export { MonitoringList, type MonitoringListPatient };
