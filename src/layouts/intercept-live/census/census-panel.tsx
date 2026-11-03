import * as React from "react";
import { GermIcon, HandHeartIcon, TriangleIcon, UserPlusIcon, XIcon } from "lucide-react";

import { PatientCensusCard, type PatientCensusCardProps } from "@/components/cards/patient-census-card";
import { EmptyState } from "@/components/feedback/empty-state";
import { FilterBar, FilterBarControls, FilterBarFilters } from "@/components/forms/filter-bar";
import { SearchInput } from "@/components/forms/search-input";
import { Switch } from "@/components/forms/switch";
import type { AppHeaderUser } from "@/components/navigation/app-header";
import { Typography } from "@/components/typography/typography";

import {
	hasActiveAlert,
	hasOrganSupport,
	hasRisingAcuity,
	HospitalTabs,
	matchesSearch,
	MyPatientsChip,
	PanelEmpty,
	PanelGrid,
	QuickViewChips,
	PanelBoard,
	useChangedSinceMount,
	panelOrder,
	patientCardActions,
	resolvedTimes,
	useGrouping,
	type GroupedView,
	SortSelect,
	shownAlert,
	useFadingResolvedAlerts,
	useHeldOrder,
	useRecentActivity,
	useResolvedHolds,
	usePatientScope,
	useSortBy,
	type PanelHospital,
	type PatientScope,
	type QuickView,
	type SortOrderId,
} from "../shared/patient-panel";
import { usePatientNavigation } from "../patient-navigation";
import { avatarTone, avatarTones, patientInitials } from "../shared/patient-avatar";
import { LiveFeed, LiveFeedPanel, useAddressedAlerts } from "../shared/live-feed";
import { isOpenAlert, type EscalationTarget, type TriageAlert, type TriageAlertAction } from "../monitoring/triage-queue";
import { DensityToggle, type PanelDensity } from "../monitoring/view-controls";
import { FiltersButton, FiltersPanel, passesFilters, type PatientFilters } from "../shared/patient-filters";
import { censusFilterGroups } from "./census-filters";
import { CensusList } from "./census-list";

/* -------------------------------------------------------------------------- */
/* Data shapes (the app's API fills these)                                    */
/* -------------------------------------------------------------------------- */

type CensusHospital = PanelHospital;

type CensusPatient = Omit<PatientCensusCardProps, "onOpen" | "href" | "alertRing" | "onMoreActions" | "className"> & {
	id: string;
	hospitalId: string;
	/** Assigned to the signed-in clinician this shift. */
	mine?: boolean;
	/** On the Virtual Sepsis watch list. */
	sepsisWatch?: boolean;
	/** The acuity score's change over the last 4 h, which ranks patients within an alert severity (DU-09). */
	scoreChange4h?: number;
	/** When the patient arrived on their unit, admitted or moved in (ADT), ISO 8601. For New patients. */
	arrivedAt?: string;
	/** When the signed-in clinician last opened the patient's details, ISO 8601. For the Recently viewed sort. */
	lastViewedAt?: string;
	/** When the patient's most recent alert was resolved, ISO 8601. For the Recently resolved sort. */
	lastResolvedAt?: string;
	/** Unread messages from the patient's family. For the Family messages sort. */
	unreadMessages?: number;
};

// The Census's sorts: managing patients (PRD Census). No Alerts sort (Oct 31, 2026, user's call): its cards show no
// alert, so the order wouldn't explain itself; no Recently resolved, alert history is Monitoring's (Nov 1, 2026, user's
// call). Family messages, a patient-management task, joins Monitoring's (Nov 1, 2026, user's call).
const sortOrderIds: readonly SortOrderId[] = ["acuity", "change", "name", "viewed", "messages"];

// Comfortable, beside the collapsed rail: 2 a row above md (768), 3 above lg (1024), 4 above xl (1280), 5 above 2xl
// (1536), still 5 at 3xl (Oct 30, 2026, user's call) and 6 above 3xl (1920); then one more every 296px (a ~280px card
// and its gap), 7 from a 2168px window to 13 from 3944px. The page is 112px narrower than the window (64px rail, 24px padding each side). An open side
// panel takes its width off, so it drops columns. Compact (`sm` cards, 12px gaps) shows one more card a row at every
// width, from 2 at 520px, as on Monitoring. All in px: Tailwind can't order container queries in mixed units, and a px
// one placed before a rem one loses to it.
const gridClassNames: Record<Exclude<PanelDensity, "list">, string> = {
	comfortable:
		"@min-[657px]:grid-cols-2 @min-[913px]:grid-cols-3 @min-[1169px]:grid-cols-4 @min-[1425px]:grid-cols-5 @min-[1809px]:grid-cols-6 @min-[2056px]:grid-cols-7 @min-[2352px]:grid-cols-8 @min-[2648px]:grid-cols-9 @min-[2944px]:grid-cols-10 @min-[3240px]:grid-cols-11 @min-[3536px]:grid-cols-12 @min-[3832px]:grid-cols-13",
	compact:
		"gap-3 @min-[520px]:grid-cols-2 @min-[657px]:grid-cols-3 @min-[913px]:grid-cols-4 @min-[1169px]:grid-cols-5 @min-[1425px]:grid-cols-6 @min-[1809px]:grid-cols-7 @min-[2056px]:grid-cols-8 @min-[2352px]:grid-cols-9 @min-[2648px]:grid-cols-10 @min-[2944px]:grid-cols-11 @min-[3240px]:grid-cols-12 @min-[3536px]:grid-cols-13 @min-[3832px]:grid-cols-14",
};

// The Kanban board's columns share the width, at least one card wide each (Compact's small card is narrower).
const boardClassNames: Record<Exclude<PanelDensity, "list">, string> = {
	comfortable: "[--board-column:minmax(320px,1fr)]",
	compact: "[--board-column:minmax(240px,1fr)]",
};

type CensusUser = AppHeaderUser;

type CensusPanelProps = {
	hospitals: CensusHospital[];
	patients: CensusPatient[];
	onOpenPatient?: (patientId: string) => void;
	/** Every alert on the census, for the live feed panel's triage queue. Resolved and declined ones show under Resolved. */
	alerts?: TriageAlert[];
	/** Who the queue's Escalate can send an alert to. Without any, rows don't offer Escalate. */
	escalationTargets?: EscalationTarget[];
	/** An action on an alert in the queue. The layout applies it at once; the app sends it to Clinical Alerting. */
	onAlertAction?: (alertId: string, action: TriageAlertAction) => void;
	/** The latest change from the live feed, e.g. "Moore worsens: Medium becomes Critical". Shown at the right of the
	 * hospital bar as "Live feed: …"; just "Live feed" without it. */
	liveFeed?: string;
	/** How Group by hospital shows: `board`, a Kanban column per hospital (default), or `sections` in the grid. */
	groupedView?: GroupedView;
	/** Called when the hospital bar's "Live feed" opens or closes the live feed panel (the triage queue). */
	onOpenLiveFeed?: () => void;
};

/* -------------------------------------------------------------------------- */
/* Product content                                                            */
/* -------------------------------------------------------------------------- */

// New patients: arrived on their unit in the last 24 h, admitted or moved in (Nov 3, 2026, user's call; PRD Census CEN-030).
const newPatientWindow = 24 * 3_600_000;
const isNewPatient = (patient: CensusPatient) =>
	patient.arrivedAt !== undefined && Date.now() - Date.parse(patient.arrivedAt) < newPatientWindow;

// Quick views. At most one is active; pressing it again turns it off. My patients is its own chip before them, so it
// combines with any quick view. Only what the card shows: Out of range and Data gap are live monitoring data, so they're
// Monitoring's (Nov 1, 2026, PRD Census CEN-OD-07), and so is Active alerts (Nov 1, 2026, user's call): its cards show
// no alert, and the Filters panel's Highest alert still finds them.
// New patients first, beside My patients (Nov 3, 2026, user's call).
const quickViews: QuickView<CensusPatient>[] = [
	{ id: "new", label: "New patients", icon: UserPlusIcon, matches: isNewPatient },
	{ id: "rising", label: "Rising score", icon: TriangleIcon, matches: hasRisingAcuity },
	{ id: "organ", label: "Organ support", icon: HandHeartIcon, matches: hasOrganSupport },
	{ id: "sepsis", label: "Sepsis watch", icon: GermIcon, matches: (patient) => Boolean(patient.sepsisWatch) },
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
	alerts: alertsProp = [],
	escalationTargets = [],
	onAlertAction,
	liveFeed,
	onOpenLiveFeed,
	groupedView = "board",
}: CensusPanelProps) {
	// Alerts resolved in this session: opening a card with an active alert resolves it (prototype behavior; an app
	// resolves through Clinical Alerting). Applied before filtering, so counters and filters see it. Kept with when, for the
	// Recently resolved sort.
	const [resolvedIds, setResolvedIds] = React.useState<ReadonlyMap<string, string>>(() => new Map());
	// Every patient's avatar color, from the whole roster, so the page's sort and filters don't change them.
	const tones = React.useMemo(() => avatarTones(patientsProp), [patientsProp]);
	const withResolved = React.useMemo(
		() =>
			patientsProp.map((patient) =>
				resolvedIds.has(patient.id) && hasActiveAlert(patient) ? { ...patient, alert: { variant: "resolved" as const } } : patient,
			),
		[patientsProp, resolvedIds],
	);
	// The Census is for managing patients, not watching them (Monitoring is): its cards hold still and show no alert. The
	// order is taken when the user changes the sort, grouping or filters (or a patient joins what they show), not when
	// alerts change. In the List, a "Resolved" pill shows for a moment where its row is, then fades.
	const patients = useFadingResolvedAlerts(withResolved, false);
	const resolvedHolds = useResolvedHolds(patients, () => {});
	const ownAlerts = new Map(patients.map((patient) => [patient.id, patient.alert]));
	// Inside the shell, a card opens the patient's details over the page, stepping through the grid as it's shown now; an
	// alert in the live feed opens them with the page's list as it stands (PRD PD-015).
	const navigation = usePatientNavigation();
	const openPatient = (patientId: string) => {
		const resolvesAlert = patientsProp.some((patient) => patient.id === patientId && hasActiveAlert(patient));
		setResolvedIds((current) =>
			current.has(patientId) || !resolvesAlert ? current : new Map(current).set(patientId, new Date().toISOString()),
		);
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
	const [scope, setScope] = usePatientScope("census");
	// The Filters panel's options, by group (unit among them since Oct 30, 2026: the Unit menu moved there).
	const [filters, setFilters] = React.useState<PatientFilters>({});
	// The filter bar's search: everything the card shows.
	const [query, setQuery] = React.useState("");
	// The score first (Oct 31, 2026, user's call): the cards show no alert, so Alert isn't offered here; Monitoring keeps it.
	const [sortBy, setSortBy] = useSortBy("census", "acuity");
	// Comfortable and Compact cards, or the List table, as on Monitoring.
	const [density, setDensity] = React.useState<PanelDensity>("comfortable");
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
	// The panel right of the canvas: the live feed (the triage queue, as on Monitoring; the cards keep their own alert
	// pills) or Filters, one at a time.
	// The live feed sits beside the canvas; Filters floats over everything (a Sheet), so the two no longer take turns.
	const [rightPanel, setRightPanel] = React.useState<"feed" | null>(null);
	const toggleRightPanel = (panel: "feed") => setRightPanel((current) => (current === panel ? null : panel));
	const [filtersOpen, setFiltersOpen] = React.useState(false);
	const { alerts, handleAlertAction } = useAddressedAlerts(alertsProp, onAlertAction);

	const inTab = (scoped: CensusPatient[]) =>
		hospitalId === "all" ? scoped : scoped.filter((patient) => patient.hospitalId === hospitalId);
	// The Filters panel's groups, from the hospital tab's patients (its units, its score's bands).
	const filterGroups = censusFilterGroups(inTab(patients), filters);
	// My patients narrows everything below it, the tab counters included. The other filters run on both scopes, so the
	// title can say "6 of 14 patients": the user's own among everyone the filters match. `inView` is before the Filters
	// panel (its counts start there); `inUnit`, after it, is what the chips count.
	const filtered = (scoped: CensusPatient[]) => {
		const searched = inTab(scoped).filter((patient) => matchesSearch(patient, query));
		const activeView = quickViews.find((view) => view.id === quickView);
		const inView = activeView ? searched.filter(activeView.matches) : searched;
		const inUnit = searched.filter((patient) => passesFilters(patient, filterGroups, filters));
		return { inView, inUnit, visible: activeView ? inUnit.filter(activeView.matches) : inUnit };
	};
	// The Recently viewed and Recently resolved sorts count what happened in this session too: the patients opened, and the
	// alerts resolved here or in the live feed.
	const recent = useRecentActivity(patients, { ...resolvedTimes(alerts), ...Object.fromEntries(resolvedIds) });
	const assigned = scope === "mine" ? recent.filter((patient) => patient.mine) : recent;
	const { inView, inUnit, visible: unsorted } = filtered(assigned);
	const visible = useHeldOrder(unsorted.sort(panelOrder(sortBy, grouped)), 0, `${sortBy}:${grouped}`);
	// Tells the shell what the page shows, so a patient opened from an alert, a toast or the chat gets this list too.
	const setPageList = navigation?.setPageList;
	const visibleKey = visible.map((patient) => patient.id).join(",");
	React.useLayoutEffect(() => {
		setPageList?.(visibleKey ? visibleKey.split(",") : []);
	}, [setPageList, visibleKey]);
	const everyoneCount = scope === "mine" ? filtered(patients).visible.length : visible.length;
	const hospitalCount = new Set(visible.map((patient) => patient.hospitalId)).size;
	// One hospital, picked on its tab or the only one the filters leave, reads by name: "7 patients at CVMC".
	const singleHospital =
		hospitalId !== "all"
			? hospitals.find((hospital) => hospital.id === hospitalId)
			: hospitalCount === 1
				? hospitals.find((hospital) => hospital.id === visible[0].hospitalId)
				: undefined;

	// The cards show no alert, badge or ring (Oct 31, 2026, intercept.ds patient-card-compact; again Nov 2, 2026,
	// `patient-census-card` 1108:3964, user's call): the Census is for managing patients; Monitoring and the live feed show
	// alerts. The List keeps its Alert column.
	const renderCard = ({
		id,
		hospitalId: _hospitalId,
		mine: _mine,
		sepsisWatch: _sepsisWatch,
		alert: _alert,
		scoreChange4h: _scoreChange4h,
		lastViewedAt: _lastViewedAt,
		lastResolvedAt: _lastResolvedAt,
		unreadMessages: _unreadMessages,
		arrivedAt: _arrivedAt,
		...card
	}: CensusPatient) => (
		// The avatar (Oct 31, 2026, user request; intercept.ds `patient-card-compact`): the patient's photo, or their initials
		// in their own color, the same as on their Patient details header (`shared/patient-avatar.ts`).
		<PatientCensusCard
			{...card}
			initials={patientInitials(card)}
			tone={tones.get(id) ?? avatarTone(id)}
			size={density === "compact" ? "sm" : "md"}
			// The "…" menu on hover, as on Monitoring's cards (Nov 3, 2026, user's call). The card shows no alert, so no
			// Expand alert.
			moreActions={patientCardActions(navigation, {
				id,
				name: `${card.lastName}, ${card.firstName}`,
				tags: card.tags,
			})}
			onOpen={() => openPatient(id)}
		/>
	);

	const clearFilters = () => {
		setHospitalId("all");
		setQuickView(null);
		setFilters({});
		setScope("all");
		setQuery("");
	};

	return (
		<>
			{/* The hospital bar, right under the header (Intercept-Live Census `83:2515`), with Group by hospital at its right
			    (label first). */}
			<div className='flex items-center justify-between gap-6 border-b border-border pr-6 pl-4'>
				<HospitalTabs hospitals={hospitals} patients={assigned} value={hospitalId} onValueChange={setHospitalId} />
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

			{/* A size container, so the grid's columns follow the room the live feed panel leaves. */}
			<main className='@container flex flex-1 flex-col gap-6 p-6'>
				{/* Two rows, 24px apart (Intercept-Live Census `167:5543`): the summary with the live feed's latest change at its
				    right, which opens the live feed panel; then the filter chips, with the page's actions at the right, 8px
				    apart. */}
				<div className='flex flex-col gap-6'>
					<div className='flex min-h-9 items-center gap-2'>
						<Typography as='h1' size='2xl' weight='regular' aria-live='polite' className='min-w-0 flex-1'>
							{/* "6 of 14 patients" with My patients: the user's own among everyone the other filters match. */}
							<span className='font-bold'>
								{scope === "mine" ? `${visible.length} of ${everyoneCount}` : visible.length}{" "}
								{everyoneCount === 1 ? "patient" : "patients"}{" "}
								{singleHospital
									? `at ${singleHospital.name}`
									: `across ${hospitalCount} ${hospitalCount === 1 ? "hospital" : "hospitals"}`}
							</span>
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

					<FilterBar aria-label='Patient filters'>
						{/* The search leads the chips (Intercept-Live Census `183:9503`) and pushes them along as it opens. */}
						<FilterBarFilters>
							<SearchInput label='Search patients' value={query} onValueChange={setQuery} />
							<MyPatientsChip
								value={scope}
								onValueChange={setScope}
								count={filtered(patients).inUnit.filter((patient) => patient.mine).length}
							/>
							<QuickViewChips
								views={quickViews}
								value={quickView}
								onValueChange={setQuickView}
								patients={inUnit}
							/>
						</FilterBarFilters>
						<FilterBarControls>
							<DensityToggle value={density} onValueChange={setDensity} />
							<SortSelect
								value={sortBy}
								onValueChange={setSortBy}
								orders={sortOrderIds}
								scoreName={patients.find((patient) => patient.acuity)?.acuity?.label}
							/>
							{/* Opens the Filters panel (Unit is one of its groups). */}
							<FiltersButton
								panelId='census-filters'
								open={filtersOpen}
								filters={filters}
								onClick={() => setFiltersOpen((current) => !current)}
							/>
						</FilterBarControls>
					</FilterBar>
				</div>

				{density === "list" ? (
					<CensusList
						patients={visible.map((patient) => ({
							...patient,
							tone: tones.get(patient.id) ?? avatarTone(patient.id),
							alert: shownAlert(ownAlerts.get(patient.id), resolvedHolds[patient.id]),
						}))}
						hospitals={hospitals}
						grouped={grouped}
						onOpenPatient={openPatient}
					/>
				) : board ? (
					<PanelBoard
						animateIn={boardSwitched}
						patients={visible}
						hospitals={hospitals}
						className={boardClassNames[density]}
						spareColumns={density === "compact" ? 1 : 0}
						renderCard={renderCard}
					/>
				) : (
					<PanelGrid
						patients={visible}
						hospitals={hospitals}
						grouped={grouped}
						className={gridClassNames[density]}
						renderCard={renderCard}
					/>
				)}

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
								buttonIcon={<XIcon aria-hidden='true' />}
								buttonProps={{ onClick: clearFilters }}
							/>
						)}
					</PanelEmpty>
				) : null}
			</main>

			<FiltersPanel
				id='census-filters'
				open={filtersOpen}
				onOpenChange={setFiltersOpen}
				groups={filterGroups}
				filters={filters}
				onFiltersChange={setFilters}
				patients={inView}
			/>
			<LiveFeedPanel
				open={rightPanel === "feed"}
				onOpenChange={(open) => setRightPanel(open ? "feed" : null)}
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
