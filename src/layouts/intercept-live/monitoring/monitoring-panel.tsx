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
import { motionDuration } from "@/lib/motion";

import {
	activeAlertCount,
	HospitalTabs,
	PanelEmpty,
	PanelGrid,
	PatientScopeSelect,
	QuickViewChips,
	sortOrderById,
	SortSelect,
	UnitSelect,
	type PanelHospital,
	type PanelPatient,
	type PatientScope,
	type QuickView,
	type SortOrderId,
} from "../shared/patient-panel";
import {
	compareTriageAlerts,
	isOpenAlert,
	type EscalationTarget,
	type TriageAlert,
	type TriageAlertAction,
	type TriageAlertSeverity,
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

// The filters stay in context (Oct 27, 2026): Monitoring narrows the panel's scope (hospital, All / My patients, unit),
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

// Columns follow the page's width (a container query), with a minimum card width per density: ~340px Comfortable,
// ~272px Compact: four Comfortable or five Compact cards a row at Figma's 1728 width (PRD SV-012), fewer while the
// live feed panel takes room beside the canvas. `items-start`: a card showing the full monitor grows on its own, without stretching
// its row.
const gridClassNames: Record<Exclude<PanelDensity, "list">, string> = {
	comfortable: "items-start @min-[46.5rem]:grid-cols-2 @min-[69rem]:grid-cols-3 @min-[91rem]:grid-cols-4",
	compact:
		"items-start gap-3 @min-[38rem]:grid-cols-2 @min-[55.5rem]:grid-cols-3 @min-[73.5rem]:grid-cols-4 @min-[91rem]:grid-cols-5",
};

// How long a card says "Resolved" in its old place (its ring blinks green once meanwhile) after its last alert resolves,
// before it moves.
const RESOLVED_PILL_MS = 2000;
// The move (`reorderSpring`, about `deliberate`), waited out so the pill is still there when the card lands; then it
// fades out slowly (`resolvedFadeTransition`).
const RESOLVED_MOVE_MS = motionDuration.deliberate * 1000;

type ResolvedHold = { severity: TriageAlertSeverity; moved: boolean };

/**
 * Patients whose last open alert just resolved, by id, with the severity they had: held in place for `RESOLVED_PILL_MS`
 * showing "Resolved", then `moved` to their new place still showing it, then released once they've landed, when the
 * pill fades out. Covers resolving in the queue and alerts that resolve or drop out of the feed.
 */
function useResolvedHolds(patients: Pick<PanelMonitoringPatient, "id" | "alert">[]) {
	const [holds, setHolds] = React.useState<Record<string, ResolvedHold>>({});
	const previous = React.useRef<Record<string, TriageAlertSeverity> | null>(null);
	const timers = React.useRef<number[]>([]);
	const open: Record<string, TriageAlertSeverity> = {};
	for (const patient of patients) {
		const variant = patient.alert?.variant;
		if (variant === "critical" || variant === "high" || variant === "medium" || variant === "low") open[patient.id] = variant;
	}
	const openKey = JSON.stringify(open);

	React.useEffect(() => {
		const before = previous.current;
		previous.current = open;
		if (!before) return;
		const resolved = Object.keys(before).filter((id) => !open[id]);
		if (!resolved.length) return;
		const update = (change: (hold: ResolvedHold) => ResolvedHold | null) =>
			setHolds((current) => {
				const next = { ...current };
				for (const id of resolved) {
					const changed = next[id] ? change(next[id]) : null;
					if (changed) next[id] = changed;
					else delete next[id];
				}
				return next;
			});
		setHolds((current) => ({
			...current,
			...Object.fromEntries(resolved.map((id) => [id, { severity: before[id], moved: false }])),
		}));
		timers.current.push(
			window.setTimeout(() => update((hold) => ({ ...hold, moved: true })), RESOLVED_PILL_MS),
			window.setTimeout(() => update(() => null), RESOLVED_PILL_MS + RESOLVED_MOVE_MS),
		);
		// Keyed on the open alerts' contents, not the object (a new one every render).
	}, [openKey]);

	React.useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

	return holds;
}

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
	// would add and drop cards under the clinician's eyes (PRD SV-013). Its count stays live; pressing it again clears it.
	const [statusFilter, setStatusFilter] = React.useState<{ id: string; ids: ReadonlySet<string> } | null>(null);
	const [unit, setUnit] = React.useState("all");
	const [sortBy, setSortBy] = React.useState<SortOrderId>("alert");
	const [density, setDensity] = React.useState<PanelDensity>("comfortable");
	const [plot, setPlot] = React.useState<MonitorPlot>("waveform");
	// Cards showing the full monitor. Each card's own button toggles it; "Full monitors" sets every card.
	const [expandedIds, setExpandedIds] = React.useState<ReadonlySet<string>>(() => new Set());
	// The live feed panel, right of the canvas: the triage queue.
	const [feedOpen, setFeedOpen] = React.useState(false);
	const { alerts, handleAlertAction } = useAddressedAlerts(alertsProp, onAlertAction);
	const withAlerts = patientsProp.map((patient) => ({
		...patient,
		alert: alertPill(alerts.filter((alert) => alert.patientId === patient.id)),
	}));
	const resolvedHolds = useResolvedHolds(withAlerts);
	// A patient whose last alert just resolved keeps its old place for a moment while its card says "Resolved", then sorts
	// as a patient without an alert and moves, still saying it, so the clinician can follow the card to its new place;
	// the pill fades out once it has landed. The held severity counts no alerts (count 0), so the summary already drops
	// them.
	const patients: PanelMonitoringPatient[] = withAlerts.map((patient) => {
		const hold = resolvedHolds[patient.id];
		return hold && !hold.moved && !patient.alert ? { ...patient, alert: { variant: hold.severity, count: 0 } } : patient;
	});
	/** The pill the card shows: "Resolved" while held and moving, then nothing (it fades out), otherwise its own. */
	const shownAlert = (patient: PanelMonitoringPatient): PanelMonitoringPatient["alert"] => {
		const hold = resolvedHolds[patient.id];
		if (!hold || withAlerts.find((other) => other.id === patient.id)?.alert) return patient.alert;
		return { variant: "resolved" };
	};

	// Scope only: All / My patients applies to everything below it, the tab counters included; then hospital and unit.
	// Hospital and unit run on both scopes, so the summary can say "6 of 14 patients", as on the Census.
	const located = (scoped: PanelMonitoringPatient[]) => {
		const inHospital = hospitalId === "all" ? scoped : scoped.filter((patient) => patient.hospitalId === hospitalId);
		return unit === "all" ? inHospital : inHospital.filter((patient) => patient.unit === unit);
	};
	const filtered = (scoped: PanelMonitoringPatient[]) =>
		statusFilter ? located(scoped).filter((patient) => statusFilter.ids.has(patient.id)) : located(scoped);
	const assigned = scope === "mine" ? patients.filter((patient) => patient.mine) : patients;
	const visible = [...filtered(assigned)].sort(sortOrderById(sortBy).compare);
	const everyoneCount = scope === "mine" ? filtered(patients).length : visible.length;

	const pressStatusFilter = (id: string | null) => {
		const filter = statusFilters.find((view) => view.id === id);
		setStatusFilter(
			filter ? { id: filter.id, ids: new Set(patients.filter(filter.matches).map((patient) => patient.id)) } : null,
		);
	};
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
								<PatientScopeSelect value={scope} onValueChange={setScope} />
								<QuickViewChips
									views={statusFilters}
									value={statusFilter?.id ?? null}
									onValueChange={pressStatusFilter}
									patients={located(assigned)}
								/>
							</div>
							<UnitSelect value={unit} onValueChange={setUnit} />
							<SortSelect value={sortBy} onValueChange={setSortBy} orders={sortOrderIds} />
							{/* View controls (PRD SV-015) at the end of the bar: they change how the panel looks, not who's on it. */}
							<div className='ml-auto flex items-center gap-2'>
								{/* Card monitor, monitor view, then density: 8px apart, the switches of one view. */}
								<MonitorPlotToggle value={plot} onValueChange={setPlot} density={density} />
								<MonitorViewToggle
									density={density}
									value={allExpanded ? "full" : expandedIds.size === 0 ? "condensed" : null}
									onValueChange={(view) =>
										setExpandedIds(view === "full" ? new Set(patients.map((patient) => patient.id)) : new Set())
									}
								/>
								<DensityToggle value={density} onValueChange={setDensity} />
							</div>
						</div>
					</div>

					{density === "list" ? (
						<MonitoringList
							patients={visible.map((patient) => ({ ...patient, alert: shownAlert(patient) }))}
							hospitals={hospitals}
							grouped={sortBy === "location"}
							onOpenPatient={onOpenPatient}
						/>
					) : (
						<PanelGrid
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
									alert={shownAlert({ id, ...card } as PanelMonitoringPatient)}
									size={density === "compact" ? "sm" : "md"}
									plot={plot}
									expanded={expandedIds.has(id)}
									onExpandedChange={(expanded) => setExpanded(id, expanded)}
									onOpen={onOpenPatient ? () => onOpenPatient(id) : undefined}
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
				onOpenPatient={onOpenPatient}
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
