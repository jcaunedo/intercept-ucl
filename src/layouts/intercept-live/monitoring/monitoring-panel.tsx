import * as React from "react";
import { BadgeCheckIcon, BellRingIcon, FilterXIcon, GaugeIcon, HandHeartIcon, TriangleIcon, WifiOffIcon } from "lucide-react";

import {
	defaultMonitorLimits,
	PatientMonitoringCard,
	type MonitorLimits,
	type PatientMonitoringCardProps,
} from "@/components/cards/patient-monitoring-card";
import { EmptyState } from "@/components/feedback/empty-state";
import { Switch } from "@/components/forms/switch";
import { Typography } from "@/components/typography/typography";

import {
	activeAlertCount,
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
	type PanelPatient,
	type QuickView,
	type SortOrderId,
} from "../shared/patient-panel";

/* -------------------------------------------------------------------------- */
/* Data shapes (the app's API fills these)                                    */
/* -------------------------------------------------------------------------- */

type MonitoringHospital = PanelHospital;

/**
 * A patient on the monitoring panel: the card's identity, location, alert and live values. Acuity, its 24h change and
 * tags aren't on the monitoring card, but the filters and sort orders use them, as on the Census.
 */
type MonitoringPatient = PanelPatient &
	Pick<PatientMonitoringCardProps, "mrn" | "sex" | "age" | "room" | "vitals" | "limits">;

type MonitoringPanelProps = {
	hospitals: MonitoringHospital[];
	patients: MonitoringPatient[];
	onOpenPatient?: (patientId: string) => void;
};

/* -------------------------------------------------------------------------- */
/* Product content                                                            */
/* -------------------------------------------------------------------------- */

/** Whether any primary numeric is outside the patient's alarm limits (the card's own limits, defaults included). */
const isOutsideLimits = ({ vitals = {}, limits }: MonitoringPatient) => {
	const { hr, spo2, systolic, rr }: MonitorLimits = { ...defaultMonitorLimits, ...limits };
	const outside = (value: number | undefined, [low, high]: [number, number]) =>
		value !== undefined && (value < low || value > high);
	return (
		outside(vitals.hr, hr) || outside(vitals.spo2, spo2) || outside(vitals.systolic, systolic) || outside(vitals.rr, rr)
	);
};

/** Whether any primary numeric is missing (the monitor shows "--"). */
const hasDataGap = ({ vitals = {} }: MonitoringPatient) =>
	[vitals.hr, vitals.spo2, vitals.systolic, vitals.diastolic, vitals.rr].some((value) => value === undefined);

// Quick views, the Census's set tuned for live monitoring: "Outside limits" finds a patient whose numerics have left
// their alarm limits before (or without) an alert, and "Data gap" means a missing monitor value. Sepsis watch stays on
// the Census and Virtual Sepsis.
const quickViews: QuickView<MonitoringPatient>[] = [
	{ id: "all", label: "All Patients", icon: BadgeCheckIcon, matches: () => true },
	{ id: "attention", label: "Needs attention", icon: BellRingIcon, showCount: true, matches: hasActiveAlert },
	{ id: "limits", label: "Outside limits", icon: GaugeIcon, showCount: true, matches: isOutsideLimits },
	{ id: "rising", label: "Rising acuity", icon: TriangleIcon, matches: hasRisingAcuity },
	{ id: "organ", label: "Organ support", icon: HandHeartIcon, matches: hasOrganSupport },
	{ id: "data", label: "Data gap", icon: WifiOffIcon, matches: hasDataGap },
];

/* -------------------------------------------------------------------------- */
/* Monitoring                                                                 */
/* -------------------------------------------------------------------------- */

/** The Monitoring page's content: the clinician's panel as live monitoring cards, with its filter bar. */
function MonitoringPanel({ hospitals, patients, onOpenPatient }: MonitoringPanelProps) {
	const [hospitalId, setHospitalId] = React.useState("all");
	const [quickView, setQuickView] = React.useState("all");
	const [onlyMine, setOnlyMine] = React.useState(false);
	const [alertsOnly, setAlertsOnly] = React.useState(false);
	const [unit, setUnit] = React.useState("all");
	const [sortBy, setSortBy] = React.useState<SortOrderId>("alert");
	// Cards showing the full monitor. Each card's own button toggles it; "Full monitors" sets every card.
	const [expandedIds, setExpandedIds] = React.useState<ReadonlySet<string>>(() => new Set());

	// Same narrowing as the Census: My Patients and Alerts only apply to everything below them, the tab counters included.
	const mine = onlyMine ? patients.filter((patient) => patient.mine) : patients;
	const assigned = alertsOnly ? mine.filter(hasActiveAlert) : mine;
	const inHospital = hospitalId === "all" ? assigned : assigned.filter((patient) => patient.hospitalId === hospitalId);
	const inUnit = unit === "all" ? inHospital : inHospital.filter((patient) => patient.unit === unit);
	const activeView = quickViews.find((view) => view.id === quickView) ?? quickViews[0];
	const visible = inUnit.filter(activeView.matches).sort(sortOrderById(sortBy).compare);
	const alertCount = activeAlertCount(visible);
	const allExpanded = visible.length > 0 && visible.every((patient) => expandedIds.has(patient.id));

	const setExpanded = (patientId: string, expanded: boolean) =>
		setExpandedIds((current) => {
			const next = new Set(current);
			if (expanded) next.add(patientId);
			else next.delete(patientId);
			return next;
		});

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
					<div className='flex items-center gap-6'>
						<Switch label='Alerts only' checked={alertsOnly} onCheckedChange={setAlertsOnly} />
						<Switch label='My Patients' checked={onlyMine} onCheckedChange={setOnlyMine} />
					</div>
				</div>
			</div>

			<main className='flex flex-1 flex-col gap-6 px-6 pb-6'>
				<div className='flex flex-col gap-4'>
					{/* The panel summary (PRD Monitoring §3.1): patients shown and their active alerts. */}
					<Typography as='h1' size='2xl' weight='regular' aria-live='polite'>
						<span className='font-bold'>
							{visible.length} {visible.length === 1 ? "patient" : "patients"}
						</span>{" "}
						· {alertCount} active {alertCount === 1 ? "alert" : "alerts"}
					</Typography>

					<div className='flex flex-wrap items-center justify-between gap-4'>
						<QuickViewChips views={quickViews} value={quickView} onValueChange={setQuickView} patients={inUnit} />
						<div className='flex items-center gap-2'>
							<UnitSelect value={unit} onValueChange={setUnit} />
							<SortSelect value={sortBy} onValueChange={setSortBy} />
							{/* A view option, not a filter: it changes how much of each monitor shows, not who's on the panel. Set
							    apart from the menus by the same 24px as the switches above. */}
							<div className='ml-4 flex'>
								<Switch
									label='Full monitors'
									checked={allExpanded}
									onCheckedChange={(checked) =>
										setExpandedIds(checked ? new Set(patients.map((patient) => patient.id)) : new Set())
									}
								/>
							</div>
						</div>
					</div>
				</div>

				{/* Three cards a row at Figma's 1728 width (PRD SV-012, Comfortable), four from 1920. `items-start`: a card
				    showing the full monitor grows on its own, without stretching its row. */}
				<PanelGrid
					patients={visible}
					hospitals={hospitals}
					grouped={sortBy === "location"}
					className='items-start lg:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4'
					renderCard={({ id, hospitalId: _hospitalId, mine: _mine, acuity: _acuity, trajectory: _trajectory, tags: _tags, ...card }) => (
						<PatientMonitoringCard
							{...card}
							expanded={expandedIds.has(id)}
							onExpandedChange={(expanded) => setExpanded(id, expanded)}
							onOpen={onOpenPatient ? () => onOpenPatient(id) : undefined}
						/>
					)}
				/>

				{/* Nothing to show: an empty panel, or filters that match none (with a way back). */}
				{visible.length === 0 ? (
					<PanelEmpty>
						{patients.length === 0 ? (
							<EmptyState
								title='No patients being monitored'
								description="Patients you're monitoring will appear here, with their live vitals and trends."
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
	MonitoringPanel,
	type MonitoringHospital,
	type MonitoringPanelProps,
	type MonitoringPatient,
};
