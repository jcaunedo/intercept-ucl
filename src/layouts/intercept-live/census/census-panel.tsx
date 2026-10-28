import * as React from "react";
import { BellRingIcon, FilterXIcon, GaugeIcon, GermIcon, HandHeartIcon, ListFilterIcon, TriangleIcon, WifiOffIcon } from "lucide-react";

import { Button } from "@/components/buttons/button";
import { PatientCard, type PatientCardProps } from "@/components/cards/patient-card";
import { EmptyState } from "@/components/feedback/empty-state";
import type { AppHeaderUser } from "@/components/navigation/app-header";
import { Typography } from "@/components/typography/typography";

import {
	hasActiveAlert,
	hasOrganSupport,
	hasRisingAcuity,
	HospitalTabs,
	MyPatientsChip,
	PanelEmpty,
	PanelGrid,
	QuickViewChips,
	sortOrderById,
	SortSelect,
	UnitSelect,
	useFadingResolvedAlerts,
	usePausedOrder,
	useSortPause,
	type PanelHospital,
	type PatientScope,
	type QuickView,
	type SortOrderId,
} from "../shared/patient-panel";
import { usePatientNavigation } from "../patient-navigation";
import { LiveFeed, LiveFeedPanel, useAddressedAlerts } from "../shared/live-feed";
import type { EscalationTarget, TriageAlert, TriageAlertAction } from "../monitoring/triage-queue";

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
	/** Every alert on the census, for the live feed panel's triage queue. Resolved and declined ones show under Resolved. */
	alerts?: TriageAlert[];
	/** Who the queue's Escalate can send an alert to. Without any, rows don't offer Escalate. */
	escalationTargets?: EscalationTarget[];
	/** An action on an alert in the queue. The layout applies it at once; the app sends it to Clinical Alerting. */
	onAlertAction?: (alertId: string, action: TriageAlertAction) => void;
	/** The latest change from the live feed, e.g. "Moore worsens: Medium becomes Critical". Shown at the right of the
	 * hospital bar as "Live feed: …"; just "Live feed" without it. */
	liveFeed?: string;
	/** Called when the hospital bar's "Live feed" opens or closes the live feed panel (the triage queue). */
	onOpenLiveFeed?: () => void;
};

/* -------------------------------------------------------------------------- */
/* Product content                                                            */
/* -------------------------------------------------------------------------- */

/** Whether any vital is outside its normal range, the ↑ / ↓ on the card. */
const isOutOfRange = (patient: CensusPatient) => (patient.vitals ?? []).some((vital) => vital.range !== undefined);

const hasDataGap = (patient: CensusPatient) =>
	patient.acuity?.score === undefined || (patient.vitals ?? []).some((vital) => vital.variant === "missing");

// Quick views. At most one is active; pressing it again turns it off. My patients is its own chip before them, so it
// combines with any quick view.
const quickViews: QuickView<CensusPatient>[] = [
	// Every patient with an active alert, any severity (resolved alerts and messages don't count). The only alert filter:
	// an "Alerts only" switch did the same and was removed (Oct 27, 2026).
	{ id: "alerts", label: "With alerts", icon: BellRingIcon, matches: hasActiveAlert },
	// Any vital the card marks outside its normal range (↑ / ↓), alert or not: the card's own wording. Not "Outside
	// limits", which Monitoring's alarm limits use.
	{ id: "range", label: "Out of range", icon: GaugeIcon, matches: isOutOfRange },
	{ id: "rising", label: "Rising acuity", icon: TriangleIcon, matches: hasRisingAcuity },
	{ id: "organ", label: "Organ support", icon: HandHeartIcon, matches: hasOrganSupport },
	{ id: "sepsis", label: "Sepsis watch", icon: GermIcon, matches: (patient) => Boolean(patient.sepsisWatch) },
	{ id: "data", label: "Data gap", icon: WifiOffIcon, matches: hasDataGap },
];

/* -------------------------------------------------------------------------- */
/* Census                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * The Census page's content: every patient across the user's hospitals as cards, with its filter bar, and the live feed
 * panel of their alerts.
 */
function CensusPanel({
	hospitals,
	patients: patientsProp,
	onOpenPatient,
	onPatientActions,
	alerts: alertsProp = [],
	escalationTargets = [],
	onAlertAction,
	liveFeed,
	onOpenLiveFeed,
}: CensusPanelProps) {
	// Alerts resolved in this session: opening a card with an active alert resolves it (prototype behavior; an app
	// resolves through Clinical Alerting). Applied before filtering, so counters and filters see it.
	const [resolvedIds, setResolvedIds] = React.useState<ReadonlySet<string>>(() => new Set());
	const withResolved = React.useMemo(
		() =>
			patientsProp.map((patient) =>
				resolvedIds.has(patient.id) && hasActiveAlert(patient) ? { ...patient, alert: { variant: "resolved" as const } } : patient,
			),
		[patientsProp, resolvedIds],
	);
	// The grid holds its order while the pointer is over it (or keyboard focus is in it); a "Resolved" pill fades once
	// its card has moved.
	const { paused, pauseProps } = useSortPause();
	const patients = useFadingResolvedAlerts(withResolved, paused);
	// Inside the shell, a card opens the patient's details over the page, stepping through the grid as it's shown now; an
	// alert in the live feed opens them on their own (PRD PD-015).
	const navigation = usePatientNavigation();
	const openPatient = (patientId: string) => {
		setResolvedIds((current) => (current.has(patientId) ? current : new Set(current).add(patientId)));
		navigation?.openPatient(
			patientId,
			visible.map((patient) => patient.id),
		);
		onOpenPatient?.(patientId);
	};
	const openAlertPatient = (patientId: string) => {
		navigation?.openPatient(patientId);
		onOpenPatient?.(patientId);
	};
	const [hospitalId, setHospitalId] = React.useState("all");
	const [quickView, setQuickView] = React.useState<string | null>(null);
	const [scope, setScope] = React.useState<PatientScope>("all");
	const [unit, setUnit] = React.useState("all");
	const [sortBy, setSortBy] = React.useState<SortOrderId>("alert");
	// The live feed panel, right of the canvas: the triage queue, as on Monitoring. The cards keep their own alert pills.
	const [feedOpen, setFeedOpen] = React.useState(false);
	const { alerts, handleAlertAction } = useAddressedAlerts(alertsProp, onAlertAction);

	// My patients narrows everything below it, the tab counters included. The other filters run on both scopes, so the
	// title can say "6 of 14 patients": the user's own among everyone the filters match.
	const filtered = (scoped: CensusPatient[]) => {
		const inHospital = hospitalId === "all" ? scoped : scoped.filter((patient) => patient.hospitalId === hospitalId);
		// The unit menu always lists the common units; one with no patients here shows the no-matches state.
		const inUnit = unit === "all" ? inHospital : inHospital.filter((patient) => patient.unit === unit);
		const activeView = quickViews.find((view) => view.id === quickView);
		return { inUnit, visible: activeView ? inUnit.filter(activeView.matches) : inUnit };
	};
	const assigned = scope === "mine" ? patients.filter((patient) => patient.mine) : patients;
	const { inUnit, visible: unsorted } = filtered(assigned);
	const visible = usePausedOrder(unsorted.sort(sortOrderById(sortBy).compare), paused);
	const everyoneCount = scope === "mine" ? filtered(patients).visible.length : visible.length;
	const hospitalCount = new Set(visible.map((patient) => patient.hospitalId)).size;
	// One hospital, picked on its tab or the only one the filters leave, reads by name: "7 patients at CVMC".
	const singleHospital =
		hospitalId !== "all"
			? hospitals.find((hospital) => hospital.id === hospitalId)
			: hospitalCount === 1
				? hospitals.find((hospital) => hospital.id === visible[0].hospitalId)
				: undefined;

	const clearFilters = () => {
		setHospitalId("all");
		setQuickView(null);
		setUnit("all");
		setScope("all");
	};

	return (
		<>
			{/* The hospital bar, right under the header (Intercept-Live Census `83:2515`), with the live feed's latest change
			    at its right (`141:22191`), which opens the live feed panel. The tabs keep their width; a long change
			    truncates. */}
			<div className='flex items-center justify-between gap-6 border-b border-border px-4'>
				<HospitalTabs hospitals={hospitals} patients={assigned} value={hospitalId} onValueChange={setHospitalId} />
				<LiveFeed
					change={liveFeed}
					open={feedOpen}
					onOpen={() => {
						setFeedOpen((open) => !open);
						onOpenLiveFeed?.();
					}}
				/>
			</div>

			{/* A size container, so the grid's columns follow the room the live feed panel leaves. */}
			<main className='@container flex flex-1 flex-col gap-6 p-6'>
				<div className='flex flex-col gap-4'>
					<Typography as='h1' size='2xl' weight='regular' aria-live='polite'>
						{/* "6 of 14 patients" with My patients: the user's own among everyone the other filters match. */}
						<span className='font-bold'>
							{scope === "mine" ? `${visible.length} of ${everyoneCount}` : visible.length}{" "}
							{everyoneCount === 1 ? "patient" : "patients"}
						</span>{" "}
						{singleHospital
							? `at ${singleHospital.name}`
							: `across ${hospitalCount} ${hospitalCount === 1 ? "hospital" : "hospitals"}`}
					</Typography>

					<div className='flex flex-wrap items-center justify-between gap-4'>
						<div className='flex flex-wrap items-center gap-1'>
							<MyPatientsChip
								value={scope}
								onValueChange={setScope}
								count={filtered(patients).inUnit.filter((patient) => patient.mine).length}
							/>
							<QuickViewChips views={quickViews} value={quickView} onValueChange={setQuickView} patients={inUnit} />
						</div>
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
					{...pauseProps}
					patients={visible}
					hospitals={hospitals}
					grouped={sortBy === "location"}
					// The columns the md, xl and 2xl breakpoints gave beside the collapsed rail, measured inside the page's padding.
					className='@min-[41rem]:grid-cols-2 @min-[73rem]:grid-cols-3 @min-[89rem]:grid-cols-4'
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

			<LiveFeedPanel
				open={feedOpen}
				onOpenChange={setFeedOpen}
				alerts={alerts}
				patients={patients}
				escalationTargets={escalationTargets}
				onOpenPatient={openAlertPatient}
				onAlertAction={handleAlertAction}
			/>
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
