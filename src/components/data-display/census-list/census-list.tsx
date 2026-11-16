import * as React from "react";

import { PatientCardAlert, PatientCardScore, type PatientCensusCardProps } from "@/components/cards/patient-census-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/data-display/avatar";
import { cn } from "@/lib/utils";

/** One patient in the census list. */
type CensusListPatient = {
	id: string;
	/** "Miller, Sarah". */
	name: string;
	/** "MICU · Bed 11 · Sidney Regional", broad to specific. */
	location?: string;
	/** Their avatar before the name, as on their card: the photo, else `initials` in `tone`. */
	photo?: PatientCensusCardProps["photo"];
	initials?: PatientCensusCardProps["initials"];
	tone?: PatientCensusCardProps["tone"];
	/** The patient's alert, shown as its severity pill. */
	alert?: PatientCensusCardProps["alert"];
	/** The score, as the card's score line: "NEWS2: 17 High", the band in its color. */
	acuity?: PatientCensusCardProps["acuity"];
	/** The score's change, after it as on the card: the trend arrow and "2 points up in 24 h". */
	trajectory?: PatientCensusCardProps["trajectory"];
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
 * The census, the patients in hospital now, as a list to jump between them: each patient's avatar, name, alert pill,
 * location and score line (the patient cards'), the one on screen marked and kept in view. Patients no longer in hospital never show. Intercept Live's
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
	const withAvatars = census.some((patient) => patient.photo || patient.initials);

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
				const hasAvatar = Boolean(patient.photo || patient.initials);
				// As a patient in Ask Intercept Live's answers: the avatar centered on the name and location, the score line under the
				// avatar. A row without an avatar keeps its room while others have one, so the names line up.
				const content = (
					<>
						<span className='flex items-center gap-2'>
							{hasAvatar ? (
								<Avatar size='sm' className='shrink-0'>
									{patient.photo ? <AvatarImage src={patient.photo} alt='' /> : null}
									<AvatarFallback tone={patient.tone}>{patient.initials}</AvatarFallback>
								</Avatar>
							) : withAvatars ? (
								<span aria-hidden='true' className='size-8 shrink-0' />
							) : null}
							<span className='flex min-w-0 flex-1 flex-col'>
								<span className='flex items-center justify-between gap-2'>
									<span className='truncate text-sm font-semibold text-foreground'>{patient.name}</span>
									{patient.alert ? (
										<PatientCardAlert
											variant={patient.alert.variant}
											count={patient.alert.count}
											className='shrink-0 py-0.5 text-xs'
										/>
									) : null}
								</span>
								{patient.location ? (
									<span className='truncate text-xs text-muted-foreground'>{patient.location}</span>
								) : null}
							</span>
						</span>
						{/* The card's score line (no score reads "NEWS2: -- Unknown"), under the avatar, from the row's edge, not indented
						    to the name (Nov 16, 2026, user's call). */}
						{patient.acuity || patient.trajectory ? (
							<PatientCardScore acuity={patient.acuity} trajectory={patient.trajectory} size='sm' />
						) : null}
					</>
				);
				const rowClassName = cn("flex w-full flex-col gap-1 rounded-lg px-3 py-2 text-left", current && "bg-accent");
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
