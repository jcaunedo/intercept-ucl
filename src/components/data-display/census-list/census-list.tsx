import * as React from "react";

import {
	PatientCardAlert,
	patientCardAcuityLevels,
	type PatientCensusCardProps,
} from "@/components/cards/patient-census-card";
import { cn } from "@/lib/utils";

/** One patient in the census list. */
type CensusListPatient = {
	id: string;
	/** "Miller, Sarah". */
	name: string;
	/** "MICU · Bed 11 · Sidney Regional", broad to specific. */
	location?: string;
	/** The patient's alert, shown as its severity pill. */
	alert?: PatientCensusCardProps["alert"];
	/** The score, shown as "NEWS2 17 · High" in its band's color. */
	acuity?: PatientCensusCardProps["acuity"];
	/**
	 * False for a patient no longer in hospital (discharged, transferred out), whom the list leaves out: the census is the
	 * patients in hospital now. In hospital unless said otherwise.
	 */
	inHospital?: boolean;
};

type CensusListProps = Omit<React.ComponentProps<"ul">, "children"> & {
	/** The patients, in the order to show them; those with `inHospital: false` are left out. */
	patients: CensusListPatient[];
	/** The patient on screen: marked, and kept in view. */
	currentId?: string;
	/** Picking a patient. Without it, the rows aren't buttons. */
	onSelectPatient?: (patientId: string) => void;
	/** Shown when no patient is in hospital. */
	emptyText?: string;
};

/** The census among `patients` (those in hospital), in their order. */
function censusOf<T extends Pick<CensusListPatient, "inHospital">>(patients: T[]) {
	return patients.filter((patient) => patient.inHospital !== false);
}

/**
 * Where `currentId` sits in the census of `patients`: 1-based `position` (none when it isn't in it) and the `count`, for
 * a line like "12 of 26".
 */
function censusListPosition(patients: CensusListPatient[], currentId?: string) {
	const census = censusOf(patients);
	const index = census.findIndex((patient) => patient.id === currentId);
	return { position: index >= 0 ? index + 1 : undefined, count: census.length };
}

/**
 * The census, the patients in hospital now, as a list to jump between them: each patient's name, alert pill, location
 * and score, the one on screen marked and kept in view. Patients no longer in hospital never show. Intercept Live's
 * census list, on a patient's page (PRD Census list).
 *
 * Figma: none yet; intercept.ds draws the header's list button, not the list.
 */
function CensusList({
	patients,
	currentId,
	onSelectPatient,
	emptyText = "No patients in hospital",
	className,
	...props
}: CensusListProps) {
	const census = React.useMemo(() => censusOf(patients), [patients]);
	const currentRef = React.useRef<HTMLElement>(null);

	// Keep the patient on screen in view as the user steps through the list (and when the list first shows).
	React.useEffect(() => {
		currentRef.current?.scrollIntoView({ block: "nearest" });
	}, [currentId]);

	if (census.length === 0) {
		return (
			<p data-slot='census-list' className={cn("px-6 py-4 text-sm text-muted-foreground", className)}>
				{emptyText}
			</p>
		);
	}

	return (
		<ul
			data-slot='census-list'
			className={cn("scrollbar-soft flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 pb-4", className)}
			{...props}
		>
			{census.map((patient) => {
				const current = patient.id === currentId;
				// No score is "Unknown", never a band (PRD Patient card).
				const level =
					patient.acuity?.level ?? (patient.acuity && patient.acuity.score === undefined ? "unknown" : undefined);
				const content = (
					<>
						<span className='flex items-center justify-between gap-2'>
							<span className={cn("truncate text-sm text-foreground", current ? "font-semibold" : "font-medium")}>
								{patient.name}
							</span>
							{patient.alert ? (
								<PatientCardAlert
									variant={patient.alert.variant}
									count={patient.alert.count}
									className='shrink-0 py-0.5 text-xs'
								/>
							) : null}
						</span>
						{patient.location ? <span className='truncate text-xs text-muted-foreground'>{patient.location}</span> : null}
						{level ? (
							<span className={cn("text-xs font-medium", patientCardAcuityLevels[level].className)}>
								{patient.acuity ? `${patient.acuity.label} ${patient.acuity.score ?? "--"} · ` : null}
								{patientCardAcuityLevels[level].label}
							</span>
						) : null}
					</>
				);
				const rowClassName = cn("flex w-full flex-col gap-0.5 rounded-lg px-3 py-2 text-left", current && "bg-accent");
				return (
					<li key={patient.id}>
						{onSelectPatient ? (
							<button
								ref={current ? (currentRef as React.Ref<HTMLButtonElement>) : undefined}
								type='button'
								aria-current={current ? "page" : undefined}
								onClick={() => onSelectPatient(patient.id)}
								className={cn(
									rowClassName,
									"transition-colors outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
								)}
							>
								{content}
							</button>
						) : (
							<div
								ref={current ? (currentRef as React.Ref<HTMLDivElement>) : undefined}
								aria-current={current ? "page" : undefined}
								className={rowClassName}
							>
								{content}
							</div>
						)}
					</li>
				);
			})}
		</ul>
	);
}

export { CensusList, censusListPosition, type CensusListPatient, type CensusListProps };
