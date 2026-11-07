import * as React from "react";
import {
	ArrowUpFromLineIcon,
	BellRingIcon,
	CheckCheckIcon,
	GaugeIcon,
	ScanEyeIcon,
	TriangleIcon,
	Undo2Icon,
	WifiOffIcon,
	XIcon,
	type LucideIcon,
} from "lucide-react";

import {
	defaultMonitorLimits,
	PatientMonitoringCard,
	type MonitorLimits,
	type PatientMonitoringCardProps,
} from "@/components/cards/patient-monitoring-card";
import { EmptyState } from "@/components/feedback/empty-state";
import { FilterBar, FilterBarControls, FilterBarFilters } from "@/components/forms/filter-bar";
import { SearchInput } from "@/components/forms/search-input";
import { Switch } from "@/components/forms/switch";
import { Typography } from "@/components/typography/typography";

import {
	activeAlertCount,
	hasActiveAlert,
	hasRisingAcuity,
	HospitalTabs,
	matchesSearch,
	MyPatientsChip,
	PanelEmpty,
	PanelGrid,
	QuickViewChips,
	StickyFilterBar,
	PanelBoard,
	useChangedSinceMount,
	useSnapOrder,
	panelOrder,
	patientCardActions,
	resolvedTimes,
	useGrouping,
	type GroupedView,
	SortSelect,
	shownAlert,
	useHeldOrder,
	useRecentActivity,
	useResolvedHolds,
	usePatientScope,
	useSortBy,
	useSortCadence,
	useSortOnNewAlert,
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
	lastFiredAt,
	type EscalationTarget,
	type TriageAlert,
	type TriageAlertAction,
} from "./triage-queue";
import { LiveFeed, LiveFeedPanel, useAddressedAlerts } from "../shared/live-feed";
import { avatarTone, avatarTones, patientInitials } from "../shared/patient-avatar";
import {
	alertFilterGroup,
	FiltersButton,
	FiltersPanel,
	passesFilters,
	tagFilterGroups,
	unitFilterGroup,
	usePatientFilters,
	type FilterGroup,
	type PatientFilters,
} from "../shared/patient-filters";
import { MonitoringList } from "./monitoring-list";
import {
	DensityToggle,
	MonitorPlotToggle,
	MonitorViewToggle,
	type MonitorPlot,
	type MonitorView,
	type PanelDensity,
} from "./view-controls";

/* -------------------------------------------------------------------------- */
/* Data shapes (the app's API fills these)                                    */
/* -------------------------------------------------------------------------- */

type MonitoringHospital = PanelHospital;

/**
 * A patient on the monitoring panel: the card's identity, location and live values, plus the acuity score, its 24h
 * change and the tags. The card's alert bar comes from the patient's alerts in the triage queue, so the two never
 * disagree.
 */
type MonitoringPatient = Omit<PanelPatient, "alert"> &
	Pick<
		PatientMonitoringCardProps,
		| "mrn"
		| "sex"
		| "age"
		| "room"
		| "photo"
		| "vitals"
		| "limits"
		| "alarmPriorities"
		| "acknowledgedAlarms"
		| "trends"
	>;

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
	/** How Group by hospital shows: `board`, a Kanban column per hospital (default), or `sections` in the grid. */
	groupedView?: GroupedView;
	/** Called when the hospital bar's "Live feed" opens or closes the live feed panel (the triage queue). */
	onOpenLiveFeed?: () => void;
	/**
	 * When each patient's Resolved toast was closed, ISO 8601 by patient id (`useClosedResolutions`). The card drops
	 * resolutions up to then and shows no alert; a later one shows again.
	 */
	closedResolutions?: Record<string, string>;
};

/* -------------------------------------------------------------------------- */
/* Product content                                                            */
/* -------------------------------------------------------------------------- */

// An acknowledged alert leaves the card (Nov 2, 2026, user's call): acknowledged in a toast, the live feed or the
// patient's details, or by someone else, the card shows the patient's next alert or none. It stays in the triage queue
// until it's resolved (MON-AC-04).
const isCardAlert = (alert: TriageAlert) => isOpenAlert(alert) && alert.status !== "acknowledged";

/**
 * The card's alert from the patient's open alerts (`shows`, the card's by default): the top severity, how many are open,
 * and whether one at that severity is still unaddressed (the card's ring pulses until it is); for the alert bar, when
 * the top alert fired and how many alerts the patient had in the last 24 h, resolved ones included.
 */
function alertPill(patientAlerts: TriageAlert[], shows = isCardAlert): PanelPatient["alert"] {
	const open = patientAlerts.filter(shows).sort(compareTriageAlerts);
	if (!open.length) return undefined;
	const top = open.filter((alert) => alert.severity === open[0].severity);
	const unaddressed = top.some((alert) => (alert.status ?? "active") === "active");
	const status = unaddressed ? "active" : top[0].status === "escalated" ? "escalated" : "acknowledged";
	const dayAgo = Date.now() - 24 * 3_600_000;
	const inLast24h = patientAlerts.filter((alert) => Date.parse(alert.firedAt) >= dayAgo).length;
	return { variant: open[0].severity, count: open.length, status, since: open[0].firedAt, inLast24h };
}

/** An alert the feed resolved in this session: it dropped out of the alerts, so the page keeps when. */
type FeedResolution = { patientId: string; firedAt: string; resolvedAt: string };

/**
 * A patient without an open alert whose last alert resolved in the last 24 h: the card's Resolved bar, with when the
 * latest one resolved and how many alerts they had in that window (Oct 31, 2026, intercept.ds
 * `patient-monitoring-card-2` resolved example `1232:5526`). Resolved by the clinician, an alert carries when
 * (`addressed.at`); resolved by the feed, it's in `feedResolved`. The newest wins, so a fresh resolution reads "Just now"
 * (user's call), not an older one's time.
 */
function recentResolution(
	patientAlerts: TriageAlert[],
	feedResolved: FeedResolution[] = [],
	closedAt?: string,
): PanelPatient["alert"] {
	const dayAgo = Date.now() - 24 * 3_600_000;
	// Resolutions up to when the patient's Resolved toast was closed are cleared from the card (Nov 2, 2026, user's call).
	const from = Math.max(dayAgo, closedAt ? Date.parse(closedAt) + 1 : 0);
	const times = [
		...patientAlerts.filter((alert) => alert.status === "resolved" && alert.addressed).map((alert) => alert.addressed!.at),
		...feedResolved.map((resolution) => resolution.resolvedAt),
	].filter((at) => Date.parse(at) >= from);
	if (!times.length) return undefined;
	const since = times.reduce((latest, at) => (Date.parse(at) > Date.parse(latest) ? at : latest));
	const inLast24h = [...patientAlerts, ...feedResolved].filter((alert) => Date.parse(alert.firedAt) >= dayAgo).length;
	return { variant: "resolved", since, inLast24h };
}

/**
 * The open alerts the feed resolved in this session, by alert id, with when: they drop out of `alerts` rather than
 * turning `resolved`. One that comes back (the feed restarting) is forgotten.
 */
function useFeedResolutions(alerts: TriageAlert[]) {
	const [resolutions, setResolutions] = React.useState<Record<string, FeedResolution>>({});
	const previous = React.useRef<TriageAlert[] | null>(null);
	React.useEffect(() => {
		const before = previous.current;
		previous.current = alerts;
		if (!before) return;
		const ids = new Set(alerts.map((alert) => alert.id));
		const dropped = before.filter((alert) => isOpenAlert(alert) && !ids.has(alert.id));
		const back = Object.keys(resolutions).filter((id) => ids.has(id));
		if (!dropped.length && !back.length) return;
		const resolvedAt = new Date().toISOString();
		setResolutions((current) => {
			const next = { ...current };
			for (const id of back) delete next[id];
			for (const alert of dropped) next[alert.id] = { patientId: alert.patientId, firedAt: alert.firedAt, resolvedAt };
			return next;
		});
	}, [alerts, resolutions]);
	return Object.values(resolutions);
}

// The chips stay in context (Oct 27, 2026): Monitoring narrows the panel's scope (hospital, My patients), sets how it
// looks, and has status chips of its own, Active alerts (Oct 31, 2026, user request) and Outside limits. The rest of
// what needs attention is the triage queue's job, so the Census's other quick views stay there. Acuity sorts are left out too (the score can be hidden from the cards); Group
// by location is a switch, as on the Census. The Filters panel (Oct 30, 2026, user's call) adds Unit, Highest alert, alarm
// limits per parameter and the tags.
// Alerts first in the menu (Oct 31, 2026, user's call; labeled "Recent alerts" until Nov 2, 2026): patients with an open alert first,
// the newest alert first (the Active alerts chip orders by severity). The default since Nov 2, 2026 (user's call; was
// Patient name).
const sortOrderIds: readonly SortOrderId[] = ["alert", "name", "viewed", "resolved", "messages"];

/** The primary numerics with alarm limits, by the card's labels. */
const limitParameters = [
	{ id: "hr", label: "HR" },
	{ id: "spo2", label: "SpO₂" },
	{ id: "systolic", label: "ABP" },
	{ id: "rr", label: "RR" },
] as const satisfies readonly { id: keyof MonitorLimits; label: string }[];

/** Whether a numeric is outside the patient's alarm limits (the card's own limits, defaults included). */
const isOutside =
	(parameter: keyof MonitorLimits) =>
	({ vitals = {}, limits }: PanelMonitoringPatient) => {
		const value = vitals[parameter];
		const [low, high] = { ...defaultMonitorLimits, ...limits }[parameter];
		return value !== undefined && (value < low || value > high);
	};

/** Whether any primary numeric is outside the patient's alarm limits. */
const isOutsideLimits = (patient: PanelMonitoringPatient) => limitParameters.some(({ id }) => isOutside(id)(patient));

/** Whether a primary numeric isn't reporting: the card shows "--". */
const isNotReporting = ({ vitals = {} }: PanelMonitoringPatient) => limitParameters.some(({ id }) => vitals[id] === undefined);

/** Where a patient's alerts stand after the clinician's actions, for the Filters panel's Alert status. */
type AlertState = "acknowledged" | "escalated" | "resolved" | "declined";

// The alert actions' words as states, with the actions' icons (the alert modal's buttons; Nov 3, 2026, user's call).
// Feedback is an AI alert marked wrong (`declined`).
const alertStateOptions: { id: AlertState; label: string; icon: LucideIcon }[] = [
	{ id: "acknowledged", label: "Acknowledged", icon: ScanEyeIcon },
	{ id: "escalated", label: "Escalated", icon: ArrowUpFromLineIcon },
	{ id: "resolved", label: "Resolved", icon: CheckCheckIcon },
	{ id: "declined", label: "Feedback", icon: Undo2Icon },
];

/**
 * The Filters panel's groups: Unit (the hospital tab's units, plus any picked), Highest alert, Alert status (from
 * `alertStates`, by patient id), Outside alarm limits per parameter with Not reporting, and the tags. The limits options
 * read live numbers, so they hold the patients who matched when picked, as the Outside limits chip does (PRD MON-013).
 */
function monitoringFilterGroups(
	patients: PanelMonitoringPatient[],
	filters: PatientFilters,
	alertStates: (patientId: string) => ReadonlySet<AlertState>,
): FilterGroup<PanelMonitoringPatient>[] {
	return [
		unitFilterGroup(patients, filters),
		alertFilterGroup(),
		{
			id: "status",
			title: "Alert status",
			options: alertStateOptions.map(({ id, label, icon }) => ({
				id,
				label,
				icon,
				matches: (patient: PanelMonitoringPatient) => alertStates(patient.id).has(id),
			})),
		},
		{
			id: "limits",
			title: "Outside alarm limits",
			description: "Keeps the patients who matched when picked, so cards stay put as readings move.",
			options: [
				...limitParameters.map(({ id, label }) => ({ id, label, live: true, matches: isOutside(id) })),
				{ id: "missing", label: "Not reporting", live: true, matches: isNotReporting },
			],
		},
		...tagFilterGroups<PanelMonitoringPatient>(),
	];
}

// The panel's status chips, one at a time: patients with an active alert (any severity; resolved alerts and messages
// don't count), a rising score, the drift a filter finds better than the card's ▲ / ▼ marks on a large panel
// ("Limits": the monitor's alarm limits), and data gaps.
const statusFilters: QuickView<PanelMonitoringPatient>[] = [
	// Live (Nov 2, 2026, user's call), as on the Census: a patient whose alert fires joins at once, as its toast says, and
	// one whose alert resolves shows "Resolved" in place, then leaves. The view, the count and the summary always agree.
	{ id: "alerts", label: "Active alerts", icon: BellRingIcon, matches: hasActiveAlert },
	// Deterioration, as the card's score row shows it (Nov 1, 2026, user's call; the Census's chip of the same name).
	// Held when pressed, like the others, since scores change.
	{ id: "rising", label: "Rising score", icon: TriangleIcon, matches: hasRisingAcuity },
	{ id: "limits", label: "Outside limits", icon: GaugeIcon, matches: isOutsideLimits },
	// A vital that isn't reporting, the card's "--" (Nov 1, 2026, user's call: data gaps are live monitoring data, PRD
	// Census CEN-OD-07). Held when pressed, like Outside limits.
	{ id: "missing", label: "Not reporting", icon: WifiOffIcon, matches: isNotReporting },
];

// Columns follow the page's width (a container query), fewer while the live feed panel takes room beside the canvas.
// Comfortable shows 3 cards a row above lg (1024), 4 above xl (1280), still 4 at 2.5xl (Nov 4, 2026, user's call), 5
// above 2.5xl (1728), still 5 at 3xl and 3.5xl
// (Oct 30 and Nov 2, 2026, user's calls) and 6 above 3.5xl (2048), with the rail collapsed and no panel open: the page is
// the window less the 64px rail. From there a column joins every 296px (a ~280px card and its gap), 7 from a 2168px
// window up to 13 from 3944px, the same windows as the Census, which shows 6 from 1921px; except 8, which waits until
// above 4xl (2560; Nov 2, 2026, user's call), so the 4xl frame shows 7 (the Census shows 8 from 2464px).
// Compact (`sm` cards) shows one more a row at every width (Oct 30, 2026), from 2 at 608px. All in px: Tailwind can't order container queries in mixed units, and a px one placed
// before a rem one loses to it. `items-start`: a card showing the full monitor grows on its own, without stretching its
// row.
// The Kanban board's columns share the width, at least one card wide each (Compact's small card is narrower).
const boardClassNames: Record<Exclude<PanelDensity, "list">, string> = {
	comfortable: "[--board-column:minmax(340px,1fr)]",
	compact: "[--board-column:minmax(260px,1fr)]",
};

const gridClassNames: Record<Exclude<PanelDensity, "list">, string> = {
	comfortable:
		"items-start @min-[744px]:grid-cols-2 @min-[961px]:grid-cols-3 @min-[1217px]:grid-cols-4 @min-[1665px]:grid-cols-5 @min-[1985px]:grid-cols-6 @min-[2104px]:grid-cols-7 @min-[2497px]:grid-cols-8 @min-[2696px]:grid-cols-9 @min-[2992px]:grid-cols-10 @min-[3288px]:grid-cols-11 @min-[3584px]:grid-cols-12 @min-[3880px]:grid-cols-13",
	compact:
		"items-start gap-3 @min-[608px]:grid-cols-2 @min-[744px]:grid-cols-3 @min-[961px]:grid-cols-4 @min-[1217px]:grid-cols-5 @min-[1665px]:grid-cols-6 @min-[1985px]:grid-cols-7 @min-[2104px]:grid-cols-8 @min-[2497px]:grid-cols-9 @min-[2696px]:grid-cols-10 @min-[2992px]:grid-cols-11 @min-[3288px]:grid-cols-12 @min-[3584px]:grid-cols-13 @min-[3880px]:grid-cols-14",
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
	groupedView = "board",
	closedResolutions = {},
}: MonitoringPanelProps) {
	const navigation = usePatientNavigation();
	// A hospital tab's alert count, clicked on another page, opens Monitoring on that tab with Active alerts on.
	const activeAlertsRequest = navigation?.activeAlertsRequest ?? null;
	const [hospitalId, setHospitalId] = React.useState(() => activeAlertsRequest?.hospitalId ?? "all");
	const [scope, setScope] = usePatientScope("monitoring");
	// The pressed status chip. A held chip keeps the patients who matched when it was pressed (`ids`): readings move every
	// second and a live filter would add and drop cards under the clinician's eyes (PRD MON-013). Active alerts has none
	// and matches live. While a held chip is pressed, every held chip's count holds too (`counted`, each chip's patients
	// when it was pressed; Nov 6, 2026, user's call): numbers ticking beside a view that stands still read as noise.
	// Pressing it again clears it, and the counts go live again.
	const [statusFilter, setStatusFilter] = React.useState<{
		id: string;
		ids?: ReadonlySet<string>;
		counted?: Record<string, ReadonlySet<string>>;
	} | null>(() => (activeAlertsRequest ? { id: "alerts" } : null));
	const inStatusFilter = (patient: PanelMonitoringPatient) =>
		!statusFilter ||
		(statusFilter.ids
			? statusFilter.ids.has(patient.id)
			: Boolean(statusFilters.find((view) => view.id === statusFilter.id)?.matches(patient)));
	// The Filters panel's options, by group (Unit among them since Oct 30, 2026: the Unit menu moved there).
	const { filters, setFilters, apply: holdFilters } = usePatientFilters<PanelMonitoringPatient>();
	// The filter bar's search: name, MRN, unit, room or bed.
	const [query, setQuery] = React.useState("");
	// Remembered across pages and patient details (`useSortBy`).
	const [sortBy, setSortBy] = useSortBy("monitoring", "alert");
	const [density, setDensity] = React.useState<PanelDensity>("comfortable");
	// Where the board's header row sticks: under the sticky filter bar, which reports it as its height changes.
	const [boardTop, setBoardTop] = React.useState(0);
	// Group by hospital: a Kanban column per hospital, the sort inside each; or, with the sections view, a grid section each.
	// A view picked in the Prototype menu shows at once: cards, across all hospitals.
	const [groupedChoice, setGrouped] = useGrouping(groupedView, () => {
		setDensity((current) => (current === "list" ? "comfortable" : current));
		setHospitalId("all");
	});
	// One hospital has nothing to group: picking it on its tab turns grouping off (and the switch, disabled), and All
	// hospitals brings back the user's choice (Oct 30, 2026, user's call).
	const grouped = groupedChoice && hospitalId === "all";
	const board = grouped && groupedView === "board" && density !== "list";
	// The board fades its columns in when the user switches to it, not when the page opens on it.
	const boardSwitched = useChangedSinceMount(board);
	const [plot, setPlot] = React.useState<MonitorPlot>("waveform");
	// Full, condensed or minimal view, for every card at once (the cards have no toggle of their own). Full by default.
	const [monitorView, setMonitorView] = React.useState<MonitorView>("full");
	// The panel right of the canvas: the live feed (the triage queue) or Filters, one at a time, as on the Census.
	// The live feed sits beside the canvas; Filters floats over everything (a Sheet), so the two no longer take turns.
	const [rightPanel, setRightPanel] = React.useState<"feed" | null>(null);
	const toggleRightPanel = (panel: "feed") => setRightPanel((current) => (current === panel ? null : panel));
	const [filtersOpen, setFiltersOpen] = React.useState(false);
	const { alerts, handleAlertAction } = useAddressedAlerts(alertsProp, onAlertAction);
	// With Active alerts on, the order follows the alerts even under the pointer, so who to see first is always on top.
	const { paused, pauseProps } = useSortPause(statusFilter?.id !== "alerts");
	const { sorts, sortNow } = useSortCadence(paused);
	// Inside the shell, a card or a list row opens the patient's details over the page, stepping through the panel as it's
	// shown now; an alert in the live feed opens them with the page's list as it stands (PRD PD-015).
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
	// Every patient's avatar color, from the whole roster, so the page's sort and filters don't change them.
	const tones = React.useMemo(() => avatarTones(patientsProp), [patientsProp]);
	const withAlerts = patientsProp.map((patient) => {
		const own = alerts.filter((alert) => alert.patientId === patient.id);
		return { ...patient, alert: alertPill(own), lastAlertAt: lastFiredAt(own.filter(isOpenAlert)) };
	});
	// A new alert re-sorts the panel at once (the cadence otherwise waits 15–30 s).
	useSortOnNewAlert(withAlerts, sortNow);
	// A patient whose last alert just resolved keeps its old place for a moment while its card says "Resolved", then sorts
	// as a patient without an alert and moves at once, still saying it, so the clinician can follow the card to its new
	// place; the pill fades out once it has landed (useResolvedHolds).
	// Holds follow every open alert, acknowledged ones included, so a card cleared by acknowledging doesn't say "Resolved".
	const resolvedHolds = useResolvedHolds(
		patientsProp.map((patient) => ({
			id: patient.id,
			alert: alertPill(
				alerts.filter((alert) => alert.patientId === patient.id),
				isOpenAlert,
			),
		})),
		sortNow,
	);
	const patients: PanelMonitoringPatient[] = withResolvedHolds(withAlerts, resolvedHolds);
	/**
	 * The alert the card shows: its own; "Resolved" while held and moving; then, while the last alert resolved in the last
	 * 24 h, the Resolved bar with when; otherwise none. The List's Alert column shows the same.
	 */
	const ownAlerts = new Map(withAlerts.map((patient) => [patient.id, patient.alert]));
	const feedResolutions = useFeedResolutions(alerts);
	const recentResolutions = new Map(
		patientsProp.map((patient) => [
			patient.id,
			recentResolution(
				alerts.filter((alert) => alert.patientId === patient.id),
				feedResolutions.filter((resolution) => resolution.patientId === patient.id),
				closedResolutions[patient.id],
			),
		]),
	);
	const cardAlert = (id: string) => {
		const shown = shownAlert(ownAlerts.get(id), resolvedHolds[id]);
		if (shown && shown.variant !== "resolved") return shown;
		// A closed Resolved toast clears the card at once, even while its "Resolved" pill is still held.
		return recentResolutions.get(id) ?? (closedResolutions[id] ? undefined : shown);
	};

	const inTab = (scoped: PanelMonitoringPatient[]) =>
		hospitalId === "all" ? scoped : scoped.filter((patient) => patient.hospitalId === hospitalId);
	// Alert status: an open alert acknowledged or escalated, an AI alert given feedback, or the card's Resolved (the last
	// alert resolved in the last 24 h), with the clinician's own actions applied.
	const alertStates = (patientId: string) => {
		const states = new Set<AlertState>();
		for (const alert of alerts) {
			if (alert.patientId !== patientId) continue;
			if (alert.status === "acknowledged" || alert.status === "escalated" || alert.status === "declined") states.add(alert.status);
		}
		if (cardAlert(patientId)?.variant === "resolved") states.add("resolved");
		return states;
	};
	// The Filters panel's groups, from the hospital tab's patients (its units); picked limits options hold their patients.
	const rawFilterGroups = monitoringFilterGroups(inTab(patients), filters, alertStates);
	const filterGroups = holdFilters(rawFilterGroups);
	// Scope only: My patients applies to everything below it, the tab counters included; then hospital and the search
	// (`searched`, where the Filters panel's counts start), then the panel's filters. They run on both scopes, so the
	// summary can say "6 of 14 patients", as on the Census.
	const searched = (scoped: PanelMonitoringPatient[]) =>
		// The card's live numbers count too: HR, SpO₂, ABP and MAP, RR.
		inTab(scoped).filter(({ vitals = {}, ...patient }) =>
			matchesSearch(patient, query, [
				vitals.hr,
				vitals.spo2 === undefined ? undefined : `${vitals.spo2}%`,
				vitals.systolic === undefined ? undefined : `${vitals.systolic}/${vitals.diastolic ?? "--"}`,
				vitals.map,
				vitals.rr,
			]),
		);
	const located = (scoped: PanelMonitoringPatient[]) =>
		searched(scoped).filter((patient) => passesFilters(patient, filterGroups, filters));
	const filtered = (scoped: PanelMonitoringPatient[]) =>
		located(scoped).filter(inStatusFilter);
	// The Recently viewed and Recently resolved sorts count what happened in this session too: the patients opened, and the
	// alerts resolved in the live feed.
	const recent = useRecentActivity(patients, resolvedTimes(alerts));
	const assigned = scope === "mine" ? recent.filter((patient) => patient.mine) : recent;
	const inStatus = (scoped: PanelMonitoringPatient[]) =>
		scoped.filter(inStatusFilter);
	// The panel re-sorts now and then (useSortCadence), never while the pointer is over it (or keyboard focus is in it),
	// so cards and rows don't move under the clinician's hand; a re-sort that came due runs when they leave. Except
	// with Active alerts on, which re-sorts under the hand too (useSortPause above).
	// With Active alerts on, who to see first (severity, acuity band, 4 h rise, time waiting, score), whatever the sort.
	const alertPriority = statusFilter?.id === "alerts";
	const visible = useHeldOrder(
		[...filtered(assigned)].sort(panelOrder(sortBy, grouped, alertPriority)),
		sorts,
		`${sortBy}:${grouped}:${alertPriority}`,
	);
	// Tells the shell what the page shows, so a patient opened from an alert, a toast or the chat gets this list too.
	const setPageList = navigation?.setPageList;
	const visibleKey = visible.map((patient) => patient.id).join(",");
	React.useLayoutEffect(() => {
		setPageList?.(visibleKey ? visibleKey.split(",") : []);
	}, [setPageList, visibleKey]);
	const everyoneCount = scope === "mine" ? filtered(patients).length : visible.length;
	const hospitalCount = new Set(visible.map((patient) => patient.hospitalId)).size;
	// As on the Census: one hospital, picked on its tab or the only one the filters leave, reads by name ("14 patients at
	// Sidney"); otherwise "across 3 hospitals".
	const singleHospital =
		hospitalId !== "all"
			? hospitals.find((hospital) => hospital.id === hospitalId)
			: hospitalCount === 1
				? hospitals.find((hospital) => hospital.id === visible[0].hospitalId)
				: undefined;
	// A hospital tab with no patients at all (a hospital whose patients have all left, say) says so, rather than
	// blaming the filters.
	const emptyHospital = hospitalId !== "all" && !patients.some((patient) => patient.hospitalId === hospitalId) ? singleHospital : undefined;

	// Active alerts re-sorts by who to see first on the click itself: the cards land in their places, no glide.
	const [snapOrder, snapNextOrder] = useSnapOrder();
	const pressStatusFilter = (id: string | null) => {
		if (id === "alerts" || statusFilter?.id === "alerts") snapNextOrder();
		const filter = statusFilters.find((view) => view.id === id);
		const matching = (matches: (patient: PanelMonitoringPatient) => boolean) =>
			new Set(patients.filter(matches).map((patient) => patient.id));
		setStatusFilter(
			!filter
				? null
				: filter.id === "alerts"
					? { id: filter.id }
					: {
							id: filter.id,
							ids: matching(filter.matches),
							counted: Object.fromEntries(
								statusFilters.filter((view) => view.id !== "alerts").map((view) => [view.id, matching(view.matches)]),
							),
						},
		);
	};
	// The held chips' counts while one is pressed: the patients each matched then, still narrowed by the hospital tab, the
	// unit and My patients as they change.
	const heldStatusCounts = statusFilter?.counted
		? Object.fromEntries(
				Object.entries(statusFilter.counted).map(([id, ids]) => [
					id,
					located(assigned).filter((patient) => ids.has(patient.id)).length,
				]),
			)
		: undefined;
	// A hospital tab's alert count: that tab, with Active alerts on and nothing else narrowing it, so the cards are the
	// alerts the count counted (Nov 5, 2026, user's call).
	const showActiveAlerts = (id: string) => {
		setHospitalId(id);
		changeFilters({});
		setQuery("");
		pressStatusFilter("alerts");
	};
	// The same, asked from another page's tab (`navigation.showActiveAlerts`): opening on it is the initial state above;
	// a request made while Monitoring is on screen is applied here. Cleared either way, so a later visit opens as usual.
	const appliedRequest = React.useRef(activeAlertsRequest?.key);
	React.useEffect(() => {
		if (!activeAlertsRequest) return;
		if (appliedRequest.current !== activeAlertsRequest.key) showActiveAlerts(activeAlertsRequest.hospitalId);
		appliedRequest.current = activeAlertsRequest.key;
		navigation?.clearActiveAlertsRequest();
		// eslint-disable-next-line react-hooks/exhaustive-deps -- only a new request applies.
	}, [activeAlertsRequest]);
	const alertCount = activeAlertCount(visible);
	const renderCard = ({
		id,
		hospitalId: _hospitalId,
		mine: _mine,
		scoreChange4h: _scoreChange4h,
		lastViewedAt: _lastViewedAt,
		lastResolvedAt: _lastResolvedAt,
		lastAlertAt: _lastAlertAt,
		acuity,
		trajectory,
		tags,
		...card
	}: PanelMonitoringPatient) => (
		// The avatar, as on the Census's cards and the Patient details header: the photo, or the initials in the patient's
		// color (`shared/patient-avatar.ts`).
		<PatientMonitoringCard
			{...card}
			initials={patientInitials(card)}
			tone={tones.get(id) ?? avatarTone(id)}
			// The score and tags show except in Minimal view (Oct 31, 2026, user's call), where the card is the condensed
			// monitor alone; a patient without tags says "No tags", so the cards line up.
			acuity={monitorView === "minimal" ? undefined : acuity}
			trajectory={monitorView === "minimal" ? undefined : trajectory}
			tags={monitorView === "minimal" ? undefined : (tags ?? [])}
			alert={cardAlert(id)}
			size={density === "compact" ? "sm" : "md"}
			plot={plot}
			expanded={monitorView === "full"}
			moreActions={patientCardActions(navigation, {
				id,
				name: `${card.lastName}, ${card.firstName}`,
				tags,
				showsAlert: Boolean(cardAlert(id)),
				alertCount: cardAlert(id)?.count,
			})}
			onOpen={canOpenPatient ? () => openPatient(id) : undefined}
			// The alert bar opens the alert; only inside the shell, which holds where it opens.
			onOpenAlert={navigation ? () => navigation.openAlert(id) : undefined}
		/>
	);

	const changeFilters = (next: PatientFilters) => setFilters(next, rawFilterGroups, patients);

	const clearFilters = () => {
		setHospitalId("all");
		changeFilters({});
		setScope("all");
		setStatusFilter(null);
		setQuery("");
	};

	return (
		// The page is a size container, so the grid's columns follow the room the live feed panel leaves.
		<div className='flex flex-1'>
			<div className='@container flex min-w-0 flex-1 flex-col'>
				{/* The hospital bar, right under the header, as on the Census (Intercept-Live Census `83:2515`), with Group by
				    hospital at its right (label first). */}
				<div className='flex items-center justify-between gap-6 border-b border-border pr-6 pl-4'>
					<HospitalTabs
						hospitals={hospitals}
						patients={assigned}
						value={hospitalId}
						onValueChange={setHospitalId}
						onShowAlerts={showActiveAlerts}
					/>
					<div className='shrink-0'>
						<Switch
							label='Group by hospital'
							labelSide='left'
							checked={grouped}
							disabled={hospitalId !== "all"}
							onCheckedChange={setGrouped}
						/>
					</div>
				</div>

				<main className='flex flex-1 flex-col gap-6 p-6'>
					{/* As on the Census (Intercept-Live Census `167:5543`): the summary with the live feed's latest change at its
					    right, which opens the live feed panel; then the filter chips, with the page's actions at the right, 8px
					    apart; 24px between the rows. */}
					<div className='flex min-h-9 items-center gap-2'>
						{/* The panel summary (PRD Monitoring §3.1): patients shown, where, and their active alerts. */}
						<Typography as='h1' size='2xl' weight='regular' aria-live='polite' className='min-w-0 flex-1'>
							<span className='font-bold'>
								{scope === "mine" ? `${visible.length} of ${everyoneCount}` : visible.length}{" "}
								{everyoneCount === 1 ? "patient" : "patients"}{" "}
								{singleHospital
									? `at ${singleHospital.name}`
									: `across ${hospitalCount} ${hospitalCount === 1 ? "hospital" : "hospitals"}`}
							</span>{" "}
							· {alertCount} active {alertCount === 1 ? "alert" : "alerts"}
						</Typography>
						<LiveFeed
							change={liveFeed}
							open={rightPanel === "feed"}
							onOpen={() => {
								toggleRightPanel("feed");
								onOpenLiveFeed?.();
							}}
						/>
					</div>

					{/* Sticks under the page header while the page scrolls (StickyFilterBar). */}
					<StickyFilterBar onBoardTopChange={setBoardTop}>
						<FilterBar aria-label='Patient filters'>
							{/* The search leads the chips, as on the Census, and pushes them along as it opens. */}
							<FilterBarFilters>
								<SearchInput label='Search patients' value={query} onValueChange={setQuery} />
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
									counts={heldStatusCounts}
								/>
							</FilterBarFilters>
							{/* View controls (PRD MON-015): card monitor, monitor view, then density, the switches of one view, and the
							    cards' details; then Sort and Filters, as on the Census. */}
							<FilterBarControls>
								<MonitorPlotToggle value={plot} onValueChange={setPlot} density={density} />
								<MonitorViewToggle
									density={density}
									value={monitorView}
									onValueChange={(view) => view && setMonitorView(view)}
								/>
								<DensityToggle value={density} onValueChange={setDensity} />
								<SortSelect value={sortBy} onValueChange={setSortBy} orders={sortOrderIds} />
								{/* Opens the Filters panel (Unit is one of its groups). */}
								<FiltersButton
									panelId='monitoring-filters'
									open={filtersOpen}
									filters={filters}
									onClick={() => setFiltersOpen((current) => !current)}
								/>
							</FilterBarControls>
						</FilterBar>
					</StickyFilterBar>

					{density === "list" ? (
						<MonitoringList
							{...pauseProps}
							patients={visible.map((patient) => ({
								...patient,
								tone: tones.get(patient.id) ?? avatarTone(patient.id),
								alert: cardAlert(patient.id),
							}))}
							hospitals={hospitals}
							grouped={grouped}
							onOpenPatient={canOpenPatient ? openPatient : undefined}
						/>
					) : board ? (
						<PanelBoard
							stickyTop={boardTop}
							{...pauseProps}
							animateIn={boardSwitched}
							patients={visible}
							snap={snapOrder}
							hospitals={hospitals}
							className={boardClassNames[density]}
							spareColumns={density === "compact" ? 1 : 0}
							renderCard={renderCard}
						/>
					) : (
						<PanelGrid
							{...pauseProps}
							patients={visible}
							snap={snapOrder}
							hospitals={hospitals}
							grouped={grouped}
							className={gridClassNames[density]}
							renderCard={renderCard}
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
							) : emptyHospital ? (
								<EmptyState
									title={`No patients at ${emptyHospital.name}`}
									description='Patients admitted there will appear here.'
									buttonLabel='Show all hospitals'
									buttonProps={{ onClick: () => setHospitalId("all") }}
								/>
							) : (
								<EmptyState
									title='No patients match these filters'
									description='Try another hospital, unit or filter, or show all patients.'
									buttonLabel='Clear filters'
									buttonIcon={<XIcon aria-hidden='true' />}
									buttonProps={{ onClick: clearFilters }}
								/>
							)}
						</PanelEmpty>
					) : null}
				</main>
			</div>

			<FiltersPanel
				id='monitoring-filters'
				open={filtersOpen}
				onOpenChange={setFiltersOpen}
				groups={filterGroups}
				filters={filters}
				onFiltersChange={changeFilters}
				patients={inStatus(searched(assigned))}
			/>
			<LiveFeedPanel
				open={rightPanel === "feed"}
				onOpenChange={(open) => setRightPanel(open ? "feed" : null)}
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
