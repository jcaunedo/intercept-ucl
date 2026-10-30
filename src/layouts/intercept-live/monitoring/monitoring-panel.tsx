import * as React from "react";
import { FilterXIcon, GaugeIcon } from "lucide-react";

import {
	defaultMonitorLimits,
	PatientMonitoringCard,
	type MonitorLimits,
	type PatientMonitoringCardProps,
} from "@/components/cards/patient-monitoring-card";
import { EmptyState } from "@/components/feedback/empty-state";
import { Typography } from "@/components/typography/typography";

import {
	activeAlertCount,
	HospitalTabs,
	MyPatientsChip,
	PanelEmpty,
	PanelGrid,
	QuickViewChips,
	sortOrderById,
	SortSelect,
	UnitSelect,
	shownAlert,
	useHeldOrder,
	useResolvedHolds,
	useSortCadence,
	useSortPause,
	withResolvedHolds,
	type PanelHospital,
	type PanelPatient,
	type PatientScope,
	type QuickView,
	type SortOrderId,
} from "../shared/patient-panel";
import { usePatientNavigation } from "../patient-navigation";
import {
	compareTriageAlerts,
	isOpenAlert,
	type EscalationTarget,
	type TriageAlert,
	type TriageAlertAction,
} from "./triage-queue";
import { LiveFeed, LiveFeedPanel, useAddressedAlerts } from "../shared/live-feed";
import { MonitoringList } from "./monitoring-list";
import { DensityToggle, MonitorPlotToggle, MonitorViewToggle, type MonitorPlot, type PanelDensity } from "./view-controls";

/* -------------------------------------------------------------------------- */
/* Data shapes (the app's API fills these)                                    */
/* -------------------------------------------------------------------------- */

type MonitoringHospital = PanelHospital;

/**
 * A patient on the monitoring panel: the card's identity, location and live values. Acuity, its 24h change and tags
 * aren't on the monitoring card; acuity only breaks ties in the Alert order. The card's alert pill comes from the
 * patient's alerts in the triage queue, so the two never disagree.
 */
type MonitoringPatient = Omit<PanelPatient, "alert"> &
	Pick<PatientMonitoringCardProps, "mrn" | "sex" | "age" | "room" | "vitals" | "limits" | "trends">;

/** A monitoring patient with the alert pill worked out from their alerts. */
type PanelMonitoringPatient = MonitoringPatient & Pick<PanelPatient, "alert">;

type MonitoringPanelProps = {
	hospitals: MonitoringHospital[];
	patients: MonitoringPatient[];
	/** Every alert on the panel, for the triage queue. Resolved and declined ones show under Resolved. */
	alerts?: TriageAlert[];
	/** Who the queue's Escalate can send an alert to. Without any, rows don't offer Escalate. */
	escalationTargets?: EscalationTarget[];
	onOpenPatient?: (patientId: string) => void;
	/** An action on an alert in the queue. The layout applies it at once; the app sends it to Clinical Alerting. */
	onAlertAction?: (alertId: string, action: TriageAlertAction) => void;
	/** The latest change from the live feed, e.g. "Moore worsens: Medium becomes Critical". Shown at the right of the
	 * hospital bar as "Live feed: …"; nothing shows without it. */
	liveFeed?: string;
	/** Called when the hospital bar's "Live feed" opens or closes the live feed panel (the triage queue). */
	onOpenLiveFeed?: () => void;
};

/* -------------------------------------------------------------------------- */
/* Product content                                                            */
/* -------------------------------------------------------------------------- */

/**
 * The card's alert pill from the patient's open alerts: the top severity, how many are open, and whether one at that
 * severity is still unaddressed (the card's ring pulses until it is).
 */
function alertPill(patientAlerts: TriageAlert[]): PanelPatient["alert"] {
	const open = patientAlerts.filter(isOpenAlert).sort(compareTriageAlerts);
	if (!open.length) return undefined;
	const top = open.filter((alert) => alert.severity === open[0].severity);
	const unaddressed = top.some((alert) => (alert.status ?? "active") === "active");
	const status = unaddressed ? "active" : top[0].status === "escalated" ? "escalated" : "acknowledged";
	return { variant: open[0].severity, count: open.length, status };
}

// The filters stay in context (Oct 27, 2026): Monitoring narrows the panel's scope (hospital, My patients, unit),
// sets how it looks, and has one status filter of its own, Outside limits. What needs attention is the triage queue's
// job, and acuity and tags aren't on the monitoring card, so the Census's other quick views stay there. Acuity sorts are
// left out too.
const sortOrderIds: readonly SortOrderId[] = ["alert", "location", "name"];

/** Whether any primary numeric is outside the patient's alarm limits (the card's own limits, defaults included). */
const isOutsideLimits = ({ vitals = {}, limits }: PanelMonitoringPatient) => {
	const { hr, spo2, systolic, rr }: MonitorLimits = { ...defaultMonitorLimits, ...limits };
	const outside = (value: number | undefined, [low, high]: [number, number]) =>
		value !== undefined && (value < low || value > high);
	return (
		outside(vitals.hr, hr) || outside(vitals.spo2, spo2) || outside(vitals.systolic, systolic) || outside(vitals.rr, rr)
	);
};

// The drift a filter finds better than the card's ↑ / ↓ tags on a large panel. "Limits", not the Census's "Out of
// range": these are the monitor's alarm limits.
const statusFilters: QuickView<PanelMonitoringPatient>[] = [
	{ id: "limits", label: "Outside limits", icon: GaugeIcon, matches: isOutsideLimits },
];

// Columns follow the page's width (a container query), fewer while the live feed panel takes room beside the canvas.
// Comfortable shows 3 cards a row above lg (1024), 4 above xl (1280), 5 above 2xl (1536) and 6 above 2.5xl (1728), with
// the rail collapsed and no panel open: the page is the window less the 64px rail. Above 3xl (1920) a column joins every
// 296px (a ~280px card and its gap), 7 from a 2168px window up to 13 from 3944px, the same windows as the Census.
// Compact (`sm` cards) shows one more a row at every width (Oct 30, 2026), from 2 at 608px. All in px: Tailwind can't order container queries in mixed units, and a px one placed
// before a rem one loses to it. `items-start`: a card showing the full monitor grows on its own, without stretching its
// row.
const gridClassNames: Record<Exclude<PanelDensity, "list">, string> = {
	comfortable:
		"items-start @min-[744px]:grid-cols-2 @min-[961px]:grid-cols-3 @min-[1217px]:grid-cols-4 @min-[1473px]:grid-cols-5 @min-[1665px]:grid-cols-6 @min-[2104px]:grid-cols-7 @min-[2400px]:grid-cols-8 @min-[2696px]:grid-cols-9 @min-[2992px]:grid-cols-10 @min-[3288px]:grid-cols-11 @min-[3584px]:grid-cols-12 @min-[3880px]:grid-cols-13",
	compact:
		"items-start gap-3 @min-[608px]:grid-cols-2 @min-[744px]:grid-cols-3 @min-[961px]:grid-cols-4 @min-[1217px]:grid-cols-5 @min-[1473px]:grid-cols-6 @min-[1665px]:grid-cols-7 @min-[2104px]:grid-cols-8 @min-[2400px]:grid-cols-9 @min-[2696px]:grid-cols-10 @min-[2992px]:grid-cols-11 @min-[3288px]:grid-cols-12 @min-[3584px]:grid-cols-13 @min-[3880px]:grid-cols-14",
};

/* -------------------------------------------------------------------------- */
/* Monitoring                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The Monitoring page's content: the clinician's panel as live monitoring cards, with its filter bar, beside the triage
 * queue of the panel's alerts.
 */
function MonitoringPanel({
	hospitals,
	patients: patientsProp,
	alerts: alertsProp = [],
	escalationTargets = [],
	onOpenPatient,
	onAlertAction,
	liveFeed,
	onOpenLiveFeed,
}: MonitoringPanelProps) {
	const [hospitalId, setHospitalId] = React.useState("all");
	const [scope, setScope] = React.useState<PatientScope>("all");
	// Outside limits keeps the patients who matched when it was pressed: readings move every second, and a live filter
	// would add and drop cards under the clinician's eyes (PRD MON-013). Its count stays live; pressing it again clears it.
	const [statusFilter, setStatusFilter] = React.useState<{ id: string; ids: ReadonlySet<string> } | null>(null);
	const [unit, setUnit] = React.useState("all");
	const [sortBy, setSortBy] = React.useState<SortOrderId>("alert");
	const [density, setDensity] = React.useState<PanelDensity>("comfortable");
	const [plot, setPlot] = React.useState<MonitorPlot>("waveform");
	// Condensed or full monitors, for every card at once (the cards have no toggle of their own).
	const [monitorView, setMonitorView] = React.useState<"condensed" | "full">("condensed");
	// The live feed panel, right of the canvas: the triage queue.
	const [feedOpen, setFeedOpen] = React.useState(false);
	const { alerts, handleAlertAction } = useAddressedAlerts(alertsProp, onAlertAction);
	const { paused, pauseProps } = useSortPause();
	const { sorts, sortNow } = useSortCadence(paused);
	// Inside the shell, a card or a list row opens the patient's details over the page, stepping through the panel as it's
	// shown now; an alert in the live feed opens them on their own (PRD PD-015).
	const navigation = usePatientNavigation();
	const openPatient = (patientId: string) => {
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
	const canOpenPatient = Boolean(navigation || onOpenPatient);
	const withAlerts = patientsProp.map((patient) => ({
		...patient,
		alert: alertPill(alerts.filter((alert) => alert.patientId === patient.id)),
	}));
	// A patient whose last alert just resolved keeps its old place for a moment while its card says "Resolved", then sorts
	// as a patient without an alert and moves at once, still saying it, so the clinician can follow the card to its new
	// place; the pill fades out once it has landed (useResolvedHolds).
	const resolvedHolds = useResolvedHolds(withAlerts, sortNow);
	const patients: PanelMonitoringPatient[] = withResolvedHolds(withAlerts, resolvedHolds);
	/** The pill the card shows: "Resolved" while held and moving, then nothing (it fades out), otherwise its own. */
	const ownAlerts = new Map(withAlerts.map((patient) => [patient.id, patient.alert]));
	const cardAlert = (id: string) => shownAlert(ownAlerts.get(id), resolvedHolds[id]);

	// Scope only: My patients applies to everything below it, the tab counters included; then hospital and unit.
	// Hospital and unit run on both scopes, so the summary can say "6 of 14 patients", as on the Census.
	const located = (scoped: PanelMonitoringPatient[]) => {
		const inHospital = hospitalId === "all" ? scoped : scoped.filter((patient) => patient.hospitalId === hospitalId);
		return unit === "all" ? inHospital : inHospital.filter((patient) => patient.unit === unit);
	};
	const filtered = (scoped: PanelMonitoringPatient[]) =>
		statusFilter ? located(scoped).filter((patient) => statusFilter.ids.has(patient.id)) : located(scoped);
	const assigned = scope === "mine" ? patients.filter((patient) => patient.mine) : patients;
	// The panel re-sorts now and then (useSortCadence), never while the pointer is over it (or keyboard focus is in it),
	// so cards and rows don't move under the clinician's hand; a re-sort that came due runs when they leave.
	const visible = useHeldOrder([...filtered(assigned)].sort(sortOrderById(sortBy).compare), sorts, sortBy);
	const everyoneCount = scope === "mine" ? filtered(patients).length : visible.length;

	const pressStatusFilter = (id: string | null) => {
		const filter = statusFilters.find((view) => view.id === id);
		setStatusFilter(
			filter ? { id: filter.id, ids: new Set(patients.filter(filter.matches).map((patient) => patient.id)) } : null,
		);
	};
	const alertCount = activeAlertCount(visible);

	const clearFilters = () => {
		setHospitalId("all");
		setUnit("all");
		setScope("all");
		setStatusFilter(null);
	};

	return (
		// The page is a size container, so the grid's columns follow the room the live feed panel leaves.
		<div className='flex flex-1'>
			<div className='@container flex min-w-0 flex-1 flex-col'>
				{/* The hospital bar, right under the header, as on the Census, with the live feed's latest change at its right
				    (Intercept-Live Census `141:22191`), which opens the live feed panel. The tabs keep their width; a long
				    change truncates. */}
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

				<main className='flex flex-1 flex-col gap-6 p-6'>
					<div className='flex flex-col gap-4'>
						{/* The panel summary (PRD Monitoring §3.1): patients shown and their active alerts. */}
						<Typography as='h1' size='2xl' weight='regular' aria-live='polite'>
							<span className='font-bold'>
								{scope === "mine" ? `${visible.length} of ${everyoneCount}` : visible.length}{" "}
								{everyoneCount === 1 ? "patient" : "patients"}
							</span>{" "}
							· {alertCount} active {alertCount === 1 ? "alert" : "alerts"}
						</Typography>

						<div className='flex flex-wrap items-center gap-2'>
							<div className='flex flex-wrap items-center gap-1'>
								<MyPatientsChip
									value={scope}
									onValueChange={setScope}
									count={located(patients).filter((patient) => patient.mine).length}
								/>
								<QuickViewChips
									views={statusFilters}
									value={statusFilter?.id ?? null}
									onValueChange={pressStatusFilter}
									patients={located(assigned)}
								/>
							</div>
							<UnitSelect value={unit} onValueChange={setUnit} />
							<SortSelect value={sortBy} onValueChange={setSortBy} orders={sortOrderIds} />
							{/* View controls (PRD MON-015) at the end of the bar: they change how the panel looks, not who's on it. */}
							<div className='ml-auto flex items-center gap-2'>
								{/* Card monitor, monitor view, then density: 8px apart, the switches of one view. */}
								<MonitorPlotToggle value={plot} onValueChange={setPlot} density={density} />
								<MonitorViewToggle
									density={density}
									value={monitorView}
									onValueChange={(view) => view && setMonitorView(view)}
								/>
								<DensityToggle value={density} onValueChange={setDensity} />
							</div>
						</div>
					</div>

					{density === "list" ? (
						<MonitoringList
							{...pauseProps}
							patients={visible.map((patient) => ({ ...patient, alert: cardAlert(patient.id) }))}
							hospitals={hospitals}
							grouped={sortBy === "location"}
							onOpenPatient={canOpenPatient ? openPatient : undefined}
						/>
					) : (
						<PanelGrid
							{...pauseProps}
							patients={visible}
							hospitals={hospitals}
							grouped={sortBy === "location"}
							className={gridClassNames[density]}
							renderCard={({
								id,
								hospitalId: _hospitalId,
								mine: _mine,
								acuity: _acuity,
								trajectory: _trajectory,
								tags: _tags,
								...card
							}) => (
								<PatientMonitoringCard
									{...card}
									alert={cardAlert(id)}
									size={density === "compact" ? "sm" : "md"}
									plot={plot}
									expanded={monitorView === "full"}
									onOpen={canOpenPatient ? () => openPatient(id) : undefined}
								/>
							)}
						/>
					)}

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
									description='Try another hospital, unit or filter, or show all patients.'
									buttonLabel='Clear filters'
									buttonIcon={<FilterXIcon aria-hidden='true' />}
									buttonProps={{ onClick: clearFilters }}
								/>
							)}
						</PanelEmpty>
					) : null}
				</main>
			</div>

			<LiveFeedPanel
				open={feedOpen}
				onOpenChange={setFeedOpen}
				alerts={alerts}
				patients={patients}
				escalationTargets={escalationTargets}
				onOpenPatient={canOpenPatient ? openAlertPatient : undefined}
				onAlertAction={handleAlertAction}
			/>
		</div>
	);
}

export {
	MonitoringPanel,
	type EscalationTarget,
	type MonitoringHospital,
	type MonitoringPanelProps,
	type MonitoringPatient,
	type TriageAlert,
	type TriageAlertAction,
};
