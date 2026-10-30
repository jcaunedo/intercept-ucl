import * as React from "react";

import { PatientCardAlert, patientCardAcuityLevels, type PatientCardProps } from "@/components/cards/patient-card";
import { cn } from "@/lib/utils";

import { SidePanel } from "./side-panel";

// The patient switcher (PRD Patient details PD-015): on a patient's page, the list the user came from (the Census's or
// Monitoring's patients, in their current order and filters), opened from the app header's list button. Picking a
// patient switches the page to them and keeps the list open, so the user can work down it. Ahead of Figma: intercept.ds
// draws the button, not the panel.

/** One patient in the list, as the source page shows them. */
type PatientListEntry = {
	id: string;
	/** "Miller, Sarah". */
	name: string;
	/** "MICU · Bed 11 · Harbor Point General", broad to specific within the unit. */
	location?: string;
	alert?: PatientCardProps["alert"];
	acuity?: PatientCardProps["acuity"];
};

/**
 * The list beside the canvas, between the Sidebar and the page (the same place as Ask Intercept Live, which it takes
 * turns with). The open patient is marked and scrolled into view.
 */
function PatientListPanel({
	open,
	onOpenChange,
	carded,
	width,
	onWidthChange,
	sourcePage,
	patients,
	currentId,
	onSelectPatient,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** The canvas's card edge, for when the Sidebar is collapsed. */
	carded: boolean;
	width: number;
	onWidthChange: (width: number) => void;
	/** The page the list comes from, e.g. "Census". */
	sourcePage: string;
	patients: PatientListEntry[];
	currentId: string;
	onSelectPatient: (patientId: string) => void;
}) {
	const currentRef = React.useRef<HTMLButtonElement>(null);
	const index = patients.findIndex((patient) => patient.id === currentId);

	// Keep the open patient in view as the user steps through the list.
	React.useEffect(() => {
		if (open) currentRef.current?.scrollIntoView({ block: "nearest" });
	}, [open, currentId]);

	return (
		<SidePanel
			id='patient-list'
			side='left'
			title='Patients'
			description={`From the ${sourcePage}, in its order${index >= 0 ? ` · ${index + 1} of ${patients.length}` : ""}`}
			open={open}
			onOpenChange={onOpenChange}
			width={width}
			onWidthChange={onWidthChange}
			className={cn(
				"transition-[border-radius,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
				carded && "rounded-l-2xl shadow-[0_0_26px_0_oklch(0_0_0/8%)]",
			)}
		>
			<ul className='scrollbar-soft flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 pb-4'>
				{patients.map((patient) => {
					const current = patient.id === currentId;
					const level = patient.acuity?.level ?? (patient.acuity && patient.acuity.score === undefined ? "unknown" : undefined);
					return (
						<li key={patient.id}>
							<button
								ref={current ? currentRef : undefined}
								type='button'
								aria-current={current ? "page" : undefined}
								onClick={() => onSelectPatient(patient.id)}
								className={cn(
									"flex w-full flex-col gap-0.5 rounded-lg px-3 py-2 text-left transition-colors outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
									current && "bg-accent",
								)}
							>
								<span className='flex items-center justify-between gap-2'>
									<span className={cn("truncate text-sm text-foreground", current ? "font-semibold" : "font-medium")}>
										{patient.name}
									</span>
									{patient.alert ? (
										<PatientCardAlert variant={patient.alert.variant} count={patient.alert.count} className='shrink-0 py-0.5 text-xs' />
									) : null}
								</span>
								{patient.location ? <span className='truncate text-xs text-muted-foreground'>{patient.location}</span> : null}
								{level ? (
									<span className={cn("text-xs font-medium", patientCardAcuityLevels[level].className)}>
										{patient.acuity ? `${patient.acuity.label} ${patient.acuity.score ?? "--"} · ` : null}
										{patientCardAcuityLevels[level].label}
									</span>
								) : null}
							</button>
						</li>
					);
				})}
			</ul>
		</SidePanel>
	);
}

export { PatientListPanel, type PatientListEntry };
