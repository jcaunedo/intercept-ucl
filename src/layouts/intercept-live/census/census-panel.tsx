import * as React from "react";
import { BadgeCheckIcon, BellRingIcon, FilterXIcon, GermIcon, HandHeartIcon, ListFilterIcon, TriangleIcon, WifiOffIcon } from "lucide-react";

import { Button } from "@/components/buttons/button";
import { PatientCard, type PatientCardProps } from "@/components/cards/patient-card";
import { EmptyState } from "@/components/feedback/empty-state";
import { Switch } from "@/components/forms/switch";
import type { AppHeaderUser } from "@/components/navigation/app-header";
import { Typography } from "@/components/typography/typography";

import {
	hasActiveAlert,
	hasOrganSupport,
	hasRisingAcuity,
	HospitalTabs,
	PanelEmpty,
	PanelGrid,
	QuickViewChips,
	sortOrderById,
	SortSelect,
	UnitSelect,
	type PanelHospital,
	type QuickView,
	type SortOrderId,
} from "../shared/patient-panel";

/* -------------------------------------------------------------------------- */
/* Data shapes (the app's API fills these)                                    */
/* -------------------------------------------------------------------------- */

type CensusHospital = PanelHospital;

type CensusPatient = Omit<PatientCardProps, "onOpen" | "href" | "onMoreActions" | "className"> & {
	id: string;
	hospitalId: string;
	/** Assigned to the signed-in clinician this shift. */
	mine?: boolean;
	/** On the Virtual Sepsis watch list. */
	sepsisWatch?: boolean;
};

type CensusUser = AppHeaderUser;

type CensusPanelProps = {
	hospitals: CensusHospital[];
	patients: CensusPatient[];
	onOpenPatient?: (patientId: string) => void;
	onPatientActions?: (patientId: string) => void;
};

/* -------------------------------------------------------------------------- */
/* Product content                                                            */
/* -------------------------------------------------------------------------- */

const hasDataGap = (patient: CensusPatient) =>
	patient.acuity?.score === undefined || (patient.vitals ?? []).some((vital) => vital.variant === "missing");

// Quick views. One is active at a time; "All Patients" clears the others.
const quickViews: QuickView<CensusPatient>[] = [
	{ id: "all", label: "All Patients", icon: BadgeCheckIcon, matches: () => true },
	// Every patient with an active alert, any severity (resolved alerts and messages don't count).
	{ id: "attention", label: "Needs attention", icon: BellRingIcon, showCount: true, matches: hasActiveAlert },
	{ id: "rising", label: "Rising acuity", icon: TriangleIcon, matches: hasRisingAcuity },
	{ id: "organ", label: "Organ support", icon: HandHeartIcon, matches: hasOrganSupport },
	{ id: "sepsis", label: "Sepsis watch", icon: GermIcon, matches: (patient) => Boolean(patient.sepsisWatch) },
	{ id: "data", label: "Data gap", icon: WifiOffIcon, matches: hasDataGap },
];

/* -------------------------------------------------------------------------- */
/* Census                                                                     */
/* -------------------------------------------------------------------------- */

/** The Census page's content: every patient across the user's hospitals as cards, with its filter bar. */
function CensusPanel({ hospitals, patients: patientsProp, onOpenPatient, onPatientActions }: CensusPanelProps) {
	// Alerts resolved in this session: opening a card with an active alert resolves it (prototype behavior; an app
	// resolves through Clinical Alerting). Applied before filtering, so counters and filters see it.
	const [resolvedIds, setResolvedIds] = React.useState<ReadonlySet<string>>(() => new Set());
	const patients = React.useMemo(
		() =>
			patientsProp.map((patient) =>
				resolvedIds.has(patient.id) && hasActiveAlert(patient) ? { ...patient, alert: { variant: "resolved" as const } } : patient,
			),
		[patientsProp, resolvedIds],
	);
	const openPatient = (patientId: string) => {
		setResolvedIds((current) => (current.has(patientId) ? current : new Set(current).add(patientId)));
		onOpenPatient?.(patientId);
	};
	const [hospitalId, setHospitalId] = React.useState("all");
	const [quickView, setQuickView] = React.useState("all");
	const [onlyMine, setOnlyMine] = React.useState(false);
	const [alertsOnly, setAlertsOnly] = React.useState(false);
	const [unit, setUnit] = React.useState("all");
	const [sortBy, setSortBy] = React.useState<SortOrderId>("alert");

	// My Patients and Alerts only narrow everything below them, the tab counters included.
	const mine = onlyMine ? patients.filter((patient) => patient.mine) : patients;
	const assigned = alertsOnly ? mine.filter(hasActiveAlert) : mine;
	const inHospital = hospitalId === "all" ? assigned : assigned.filter((patient) => patient.hospitalId === hospitalId);
	// The unit menu always lists the common units; one with no patients here shows the no-matches state.
	const inUnit = unit === "all" ? inHospital : inHospital.filter((patient) => patient.unit === unit);
	const activeView = quickViews.find((view) => view.id === quickView) ?? quickViews[0];
	const visible = inUnit.filter(activeView.matches).sort(sortOrderById(sortBy).compare);
	const hospitalCount = new Set(visible.map((patient) => patient.hospitalId)).size;

	const clearFilters = () => {
		setHospitalId("all");
		setQuickView("all");
		setUnit("all");
		setOnlyMine(false);
		setAlertsOnly(false);
	};

	return (
		<>
			<div className='mt-2 mb-4'>
				<div className='flex items-center justify-between gap-4 px-6 py-2'>
					<HospitalTabs hospitals={hospitals} patients={assigned} value={hospitalId} onValueChange={setHospitalId} />
					{/* Each label turns `foreground` while its filter is on (Switch's own label), so the state reads from the
					    text too. */}
					<div className='flex items-center gap-6'>
						<Switch label='Alerts only' checked={alertsOnly} onCheckedChange={setAlertsOnly} />
						<Switch label='My Patients' checked={onlyMine} onCheckedChange={setOnlyMine} />
					</div>
				</div>
			</div>

			<main className='flex flex-1 flex-col gap-6 px-6 pb-6'>
				<div className='flex flex-col gap-4'>
					<Typography as='h1' size='2xl' weight='regular' aria-live='polite'>
						<span className='font-bold'>
							{visible.length} {visible.length === 1 ? "patient" : "patients"}
						</span>{" "}
						across {hospitalCount} {hospitalCount === 1 ? "hospital" : "hospitals"}
					</Typography>

					<div className='flex flex-wrap items-center justify-between gap-4'>
						<QuickViewChips views={quickViews} value={quickView} onValueChange={setQuickView} patients={inUnit} />
						<div className='flex items-center gap-2'>
							<UnitSelect value={unit} onValueChange={setUnit} />
							<SortSelect value={sortBy} onValueChange={setSortBy} />
							<Button variant='outline'>
								<ListFilterIcon aria-hidden='true' />
								Filters
							</Button>
						</div>
					</div>
				</div>

				<PanelGrid
					patients={visible}
					hospitals={hospitals}
					grouped={sortBy === "location"}
					className='md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'
					renderCard={({ id, hospitalId: _hospitalId, mine: _mine, sepsisWatch: _sepsisWatch, ...card }) => (
						<PatientCard
							{...card}
							onOpen={() => openPatient(id)}
							onMoreActions={onPatientActions ? () => onPatientActions(id) : undefined}
						/>
					)}
				/>

				{/* Nothing to show: no patients at all, or filters that match none (with a way back). */}
				{visible.length === 0 ? (
					<PanelEmpty>
						{patients.length === 0 ? (
							<EmptyState
								title='No patients on the census'
								description='Patients admitted to your hospitals will appear here.'
							/>
						) : (
							<EmptyState
								title='No patients match these filters'
								description='Try another hospital, unit or filter.'
								buttonLabel='Clear filters'
								buttonIcon={<FilterXIcon aria-hidden='true' />}
								buttonProps={{ onClick: clearFilters }}
							/>
						)}
					</PanelEmpty>
				) : null}
			</main>
		</>
	);
}

export {
	CensusPanel,
	type CensusHospital,
	type CensusPanelProps,
	type CensusPatient,
	type CensusUser,
};
