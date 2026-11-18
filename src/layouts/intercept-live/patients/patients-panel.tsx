import * as React from "react";
import { ChevronDownIcon, CircleDotIcon, LayoutGridIcon, RotateCwIcon, Rows3Icon, XIcon } from "lucide-react";

import { Button } from "@/components/buttons/button";
import { PatientCensusCard, type PatientCensusCardProps } from "@/components/cards/patient-census-card";
import { EmptyState } from "@/components/feedback/empty-state";
import { FilterBar, FilterBarChip, FilterBarControls, FilterBarFilters } from "@/components/forms/filter-bar";
import { SearchInput } from "@/components/forms/search-input";
import type { AppHeaderUser } from "@/components/navigation/app-header";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/overlays/dropdown-menu";
import { Typography } from "@/components/typography/typography";
import { mediaAbove } from "@/lib/breakpoints";
import { useMediaQuery } from "@/lib/hooks/use-media-query";

import {
	MyPatientsChip,
	PanelEmpty,
	PanelGrid,
	SortSelect,
	StickyFilterBar,
	panelOrder,
	useRecentActivity,
	usePatientScope,
	useSortBy,
	type PanelHospital,
	type SortOrderId,
} from "../shared/patient-panel";
import { usePatientNavigation } from "../patient-navigation";
import { avatarTone, patientInitials } from "../shared/patient-avatar";
import { usePatientTones } from "../shared/patient-tones";
import { useLocationFlag } from "../location-state";
import type { PatientRecord } from "../patient-details/patient-details";
import { SegmentedToggle, type ToggleOption } from "../monitoring/view-controls";
import { FiltersButton, FiltersPanel, passesFilters, type FilterGroup, type PatientFilters } from "../shared/patient-filters";
import { patientStatus, patientStatuses, type PatientCensusStatus } from "./patient-status";
import { patientsFilterGroups } from "./patients-filters";
import { Attending, LastEncounter, PatientStatus, copyPatientLink, directoryName } from "./patients-parts";
import { PatientsTable, PatientsTableSkeleton } from "./patients-table";

// Patients (PRD Patients): the directory of every patient the clinician is authorized to see, in hospital or not, to
// find a patient and open their record. It answers "how do I find or return to a patient's record?". Monitoring
// answers "who needs my clinical attention right now?", so nothing here is live, ranked by acuity or about alerts: no
// live feed, no score-first order, no NEWS2 column, no Monitoring chips (Nov 17, 2026, product).

/* -------------------------------------------------------------------------- */
/* Data shapes (the app's API fills these)                                    */
/* -------------------------------------------------------------------------- */

type CensusHospital = PanelHospital;

type CensusPatient = Omit<PatientCensusCardProps, "onOpen" | "href" | "alertRing" | "onMoreActions" | "className" | "children"> & {
	id: string;
	hospitalId: string;
	/** Assigned to the signed-in clinician this shift. */
	mine?: boolean;
	/**
	 * Where the patient is in their stay (ADT; Requirements Specification, Patient / Encounter: "Census status"). Missing
	 * reads "Status unknown", never Current (PRD Patients CEN-040).
	 */
	status?: PatientCensusStatus;
	/** When the status last changed, ISO 8601: when a transferred or discharged patient left. */
	statusAt?: string;
	/** Where a transferred patient went, e.g. "Denver Health". */
	transferredTo?: string;
	/** When the patient was admitted to the hospital, ISO 8601. Without it, the patient's record's `admittedAt`. */
	admittedAt?: string;
	/** On the Virtual Sepsis watch list. */
	sepsisWatch?: boolean;
	/** The acuity score's change over the last 4 h, which ranks patients within an alert severity (DU-09). */
	scoreChange4h?: number;
	/** When the patient arrived on their unit, admitted or moved in (ADT), ISO 8601. */
	arrivedAt?: string;
	/** When the signed-in clinician last opened the patient's details, ISO 8601. For Recently viewed. */
	lastViewedAt?: string;
	/** When the patient's most recent alert was resolved, ISO 8601. For Monitoring's Recently resolved sort. */
	lastResolvedAt?: string;
	/** Unread messages from the patient's family. For Monitoring's Family messages sort. */
	unreadMessages?: number;
};

/** A patient as the directory shows them: the API's data plus what their record says about the clinician's relationship. */
type DirectoryPatient = CensusPatient & {
	/** The signed-in clinician is on the patient's care team (the record's `careTeam`, `you`). */
	onCareTeam?: boolean;
	/** The attending of record, from the record's care team. */
	attending?: string;
	/** The latest stay is still going: the patient is in hospital (their status's `inHospital`). */
	encounterOngoing: boolean;
	/** When the latest stay started (ongoing: the admission) or ended (when the patient left), ISO 8601. */
	lastEncounterAt?: string;
};

type CensusUser = AppHeaderUser;

type PatientsPanelProps = {
	hospitals: CensusHospital[];
	/** Every patient the clinician is authorized to see: the census and the patients treated before. */
	patients: CensusPatient[];
	onOpenPatient?: (patientId: string) => void;
	/** The patients' records: their care team (the attending, and whether the clinician is on it) and admission. */
	records?: PatientRecord[];
	/** The directory is loading: placeholder rows in its layout. */
	loading?: boolean;
	/** The directory couldn't load: an error state, with Try again when `onRetry` is given. */
	loadError?: boolean;
	onRetry?: () => void;
	/** A link to a patient's page, for Copy patient link. Without it, this page's address with `?patient=` (the prototype). */
	patientHref?: (patientId: string) => string;
};

/* -------------------------------------------------------------------------- */
/* Product content                                                            */
/* -------------------------------------------------------------------------- */

type DirectoryView = "table" | "cards";

const views: ToggleOption<DirectoryView>[] = [
	{ id: "table", label: "Table", icon: Rows3Icon },
	{ id: "cards", label: "Cards", icon: LayoutGridIcon },
];

// Sorts (PRD Patients CEN-013), in the menu's order: Recently viewed first (the default). No NEWS2 sort: ranking by acuity
// is Monitoring's (Nov 17, 2026, user's call).
const sortOrderIds: readonly SortOrderId[] = ["viewed", "name", "encounter", "admitted", "hospital", "unit"];

// How many patients show before Show more (PRD Patients CEN-012): the table stays quick past the census's few dozen.
const pageSize = 50;


const searchable = (text: string) => text.toLowerCase().replace(/[−–]/g, "-");

/** Every word typed (commas ignored, so "Miller, Sarah" works) appears in the patient's name, MRN, hospital, unit, room or bed. */
const matchesDirectorySearch = (patient: DirectoryPatient, query: string) => {
	const words = searchable(query).split(/[\s,]+/).filter(Boolean);
	if (!words.length) return true;
	const text = searchable(
		[patient.lastName, patient.firstName, patient.mrn, patient.hospital, patient.unit, patient.room, patient.bed]
			.filter(Boolean)
			.join(" "),
	);
	return words.every((word) => text.includes(word));
};

// The cards' grid, as Patients' Comfortable cards were: 2 a row above 657px of page, then one more every ~256px.
const gridClassName =
	"@min-[657px]:grid-cols-2 @min-[913px]:grid-cols-3 @min-[1169px]:grid-cols-4 @min-[1617px]:grid-cols-5 @min-[1809px]:grid-cols-6 @min-[2056px]:grid-cols-7 @min-[2352px]:grid-cols-8";

/* -------------------------------------------------------------------------- */
/* Hospital and Unit menus                                                    */
/* -------------------------------------------------------------------------- */

/**
 * A filter bar menu over one Filters group (Hospital, Unit): its options as checkboxes, "All …" to clear. The trigger
 * names what's picked: "All hospitals", the one picked, or "2 hospitals". The Filters panel shows the same group.
 */
function FilterGroupMenu({
	group,
	picked,
	allLabel,
	plural,
	onPickedChange,
}: {
	group: FilterGroup<DirectoryPatient>;
	picked: string[];
	allLabel: string;
	plural: string;
	onPickedChange: (picked: string[]) => void;
}) {
	const label =
		picked.length === 0
			? allLabel
			: picked.length === 1
				? (group.options.find((option) => option.id === picked[0])?.label ?? picked[0])
				: `${picked.length} ${plural}`;
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant='outline' aria-label={`${group.title}: ${label}`} className='font-semibold'>
					{label}
					<ChevronDownIcon aria-hidden='true' className='text-icon-muted' />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='start' className='min-w-56'>
				<DropdownMenuItem onSelect={() => onPickedChange([])}>{allLabel}</DropdownMenuItem>
				<DropdownMenuSeparator />
				{group.options.map((option) => (
					<DropdownMenuCheckboxItem
						key={option.id}
						checked={picked.includes(option.id)}
						// Stays open, so several can be picked.
						onSelect={(event) => event.preventDefault()}
						onCheckedChange={(checked) =>
							onPickedChange(checked ? [...picked, option.id] : picked.filter((id) => id !== option.id))
						}
					>
						{option.label}
					</DropdownMenuCheckboxItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

/* -------------------------------------------------------------------------- */
/* Patients                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The Patients page's content: the patient directory. Search first, then My patients and Current, the
 * Hospital and Unit menus and Filters; the count, Sort and the Table / Cards switch; then the patients. A row or card
 * opens the patient's page.
 */
function PatientsPanel({
	hospitals,
	patients: patientsProp,
	onOpenPatient,
	records,
	loading = false,
	loadError = false,
	onRetry,
	patientHref,
}: PatientsPanelProps) {
	// Every patient's avatar color, the app's (`patient-tones.tsx`), so sorting and filtering don't change them.
	const tones = usePatientTones(patientsProp);
	// The API's data with what the record adds: the clinician's relationship, the attending and admission; then the last
	// encounter, from the admission and the status.
	const directory = React.useMemo<DirectoryPatient[]>(() => {
		const recordById = new Map((records ?? []).map((record) => [record.id, record]));
		return patientsProp.map((patient) => {
			const record = recordById.get(patient.id);
			const team = record?.careTeam ?? [];
			const admittedAt = patient.admittedAt ?? record?.admittedAt;
			const encounterOngoing = patientStatuses[patientStatus(patient)].inHospital;
			return {
				...patient,
				tone: patient.tone ?? tones.get(patient.id) ?? avatarTone(patient.id),
				photo: patient.photo ?? record?.photo,
				admittedAt,
				encounterOngoing,
				lastEncounterAt: encounterOngoing ? admittedAt : patient.statusAt,
				onCareTeam: team.some((member) => member.you),
				attending: team.find((member) => /attending/i.test(member.role))?.name,
			};
		});
	}, [patientsProp, records, tones]);
	// The Recently viewed sort counts this session's views too (the patients opened in the shell).
	const patients = useRecentActivity(directory, {});

	const navigation = usePatientNavigation();
	const [scope, setScope] = usePatientScope("patients");
	const [currentOnly, setCurrentOnly] = React.useState(false);
	const [filters, setFilters] = React.useState<PatientFilters>({});
	const [query, setQuery] = React.useState("");
	const [sortBy, setSortBy] = useSortBy("patients", "viewed");
	// Table by default on a desktop; cards where a table can't fit (below md), until the clinician picks one.
	const wide = useMediaQuery(mediaAbove("md"));
	const [viewChoice, setViewChoice] = React.useState<DirectoryView | null>(null);
	const view = viewChoice ?? (wide ? "table" : "cards");
	const [filtersOpen, setFiltersOpen] = useLocationFlag("filters");
	const [limit, setLimit] = React.useState(pageSize);

	const filterGroups = patientsFilterGroups(patients, hospitals, filters);
	const hospitalGroup = filterGroups.find((group) => group.id === "hospital") as FilterGroup<DirectoryPatient>;
	const unitGroup = filterGroups.find((group) => group.id === "unit") as FilterGroup<DirectoryPatient>;
	const setGroupPicked = (groupId: string) => (picked: string[]) =>
		setFilters((current) => {
			const next = { ...current, [groupId]: picked };
			// A unit outside the hospitals picked no longer applies.
			if (groupId === "hospital" && picked.length) {
				const units = new Set(patients.filter((patient) => picked.includes(patient.hospitalId)).map((patient) => patient.unit));
				next.unit = (current.unit ?? []).filter((unit) => units.has(unit));
			}
			return next;
		});

	// The chips, each a test; a chip's count is with the others as they are.
	const chips = {
		mine: (patient: DirectoryPatient) => scope !== "mine" || Boolean(patient.mine),
		current: (patient: DirectoryPatient) => !currentOnly || patientStatus(patient) === "admitted",
	};
	const searched = patients.filter((patient) => matchesDirectorySearch(patient, query));
	const inPanel = searched.filter((patient) => passesFilters(patient, filterGroups, filters));
	const passesChips = (patient: DirectoryPatient, except?: keyof typeof chips) =>
		(Object.keys(chips) as (keyof typeof chips)[]).every((key) => key === except || chips[key](patient));
	const chipCount = (key: keyof typeof chips, matches: (patient: DirectoryPatient) => boolean) =>
		inPanel.filter((patient) => passesChips(patient, key) && matches(patient)).length;
	// Before the Filters panel: what its counts count.
	const inView = searched.filter((patient) => passesChips(patient));
	const visible = inPanel.filter((patient) => passesChips(patient)).sort(panelOrder(sortBy, false));
	const shown = visible.slice(0, limit);

	// A new search, filter or sort starts from the first page again.
	const resultsKey = `${query}|${JSON.stringify(filters)}|${scope}|${currentOnly}|${sortBy}`;
	React.useEffect(() => setLimit(pageSize), [resultsKey]);

	// Tells the shell what the page shows, so a patient opened here steps through this list (PRD PD-015).
	const setPageList = navigation?.setPageList;
	const visibleKey = visible.map((patient) => patient.id).join(",");
	React.useLayoutEffect(() => {
		setPageList?.(visibleKey ? visibleKey.split(",") : []);
	}, [setPageList, visibleKey]);

	const openPatient = (patientId: string) => {
		navigation?.openPatient(
			patientId,
			visible.map((patient) => patient.id),
		);
		onOpenPatient?.(patientId);
	};

	const filtered = Boolean(scope === "mine" || currentOnly || Object.values(filters).some((picked) => picked?.length));
	const clearFilters = () => {
		setScope("all");
		setCurrentOnly(false);
		setFilters({});
	};
	// Matches the status filters hide (Current, Patient status): a search for someone discharged must not read as "no
	// such patient" (PRD Patients CEN-050).
	const hiddenByStatus =
		visible.length === 0 && query
			? searched.filter(
					(patient) =>
						chips.mine(patient) &&
						passesFilters(patient, filterGroups, { ...filters, status: [] }),
				).length
			: 0;
	const showAllStatuses = () => {
		setCurrentOnly(false);
		setFilters((current) => ({ ...current, status: [] }));
	};

	const renderCard = (patient: DirectoryPatient) => (
		<PatientCensusCard
			lastName={patient.lastName}
			firstName={patient.firstName}
			mrn={patient.mrn}
			sex={patient.sex}
			age={patient.age}
			hospital={patient.hospital}
			unit={patient.unit}
			room={patient.room}
			bed={patient.bed}
			photo={patient.photo}
			initials={patientInitials(patient)}
			tone={patient.tone}
			// No score, alert, ring or tags: identity, status, location and relationship lead (PRD Patients CEN-010). The
			// flags stay in the table's Clinical context column and the Filters panel.
			alertRing={false}
			moreActions={[
				{ label: "Open patient", onSelect: () => openPatient(patient.id) },
				{ label: "Copy patient link", onSelect: () => void copyPatientLink(patient.id, directoryName(patient), patientHref) },
			]}
			onOpen={() => openPatient(patient.id)}
		>
			<div className='flex'>
				<PatientStatus patient={patient} detail={false} />
			</div>
			<Attending patient={patient} labeled />
			<p className='text-muted-foreground'>
				Last encounter: <LastEncounter patient={patient} className='text-foreground' />
			</p>
		</PatientCensusCard>
	);

	const results = loading ? (
		view === "table" ? (
			<PatientsTableSkeleton />
		) : (
			<div aria-hidden='true' className={`grid gap-4 ${gridClassName}`}>
				{Array.from({ length: 8 }, (_, index) => (
					<div key={index} className='h-48 rounded-card border border-border bg-muted/40 motion-safe:animate-pulse' />
				))}
			</div>
		)
	) : loadError ? null : view === "table" ? (
		<PatientsTable patients={shown} onOpenPatient={openPatient} patientHref={patientHref} />
	) : (
		<PanelGrid patients={shown} hospitals={hospitals} grouped={false} className={gridClassName} renderCard={renderCard} />
	);

	return (
		<>
			{/* A size container, so the filter bar and the cards follow the page's width. */}
			<main className='@container flex flex-1 flex-col gap-6 p-6' aria-busy={loading || undefined}>
				{/* The page summary, styled as Monitoring's (Nov 17, 2026, user's call): a 2xl regular h1 whose bold part is the
				    count, "36 patients", "11 of 36 patients" while filtered. No hospital count (PRD Patients §3). */}
				<div className='flex min-h-9 items-center gap-2'>
					<Typography as='h1' size='2xl' weight='regular' aria-live='polite' className='min-w-0 flex-1'>
						<span data-results-count='' className='font-bold'>
							{loading
								? "Loading patients…"
								: `${visible.length === patients.length ? visible.length : `${visible.length} of ${patients.length}`} ${patients.length === 1 ? "patient" : "patients"}`}
						</span>
					</Typography>
				</div>

				{/* One row, as on Monitoring (Nov 17, 2026, user's call): the search, Filters (the icon alone), then the
				    chips; on the right Sort, Hospital, Unit and the view. Sticks under the page header while the page scrolls (StickyFilterBar). */}
				<StickyFilterBar>
					<FilterBar aria-label='Patient filters'>
						<FilterBarFilters>
							{/* As on Monitoring (Nov 17, 2026, user's call): a magnifier while empty and unfocused, opening to 240px and
							    pushing the chips along. It covers name, MRN, hospital, unit, room and bed (PRD Patients CEN-005); date of
							    birth isn't in the data yet. */}
							<div role='search' className='contents'>
								<SearchInput label='Search patients' value={query} onValueChange={setQuery} />
							</div>
							{/* Filters, the icon alone, right of the search (Nov 17, 2026, user's call); its panel holds every group. */}
							<FiltersButton
								panelId='patients-filters'
								open={filtersOpen}
								filters={filters}
								onClick={() => setFiltersOpen((current) => !current)}
							/>
							<MyPatientsChip
								value={scope}
								onValueChange={setScope}
								count={chipCount("mine", (patient) => Boolean(patient.mine))}
							/>
							<FilterBarChip
								pressed={currentOnly}
								onPressedChange={setCurrentOnly}
								count={chipCount("current", (patient) => patientStatus(patient) === "admitted")}
							>
								<CircleDotIcon aria-hidden='true' />
								Current
							</FilterBarChip>
						</FilterBarFilters>
						<FilterBarControls>
							<SortSelect value={sortBy} onValueChange={setSortBy} orders={sortOrderIds} />
							{/* Hospital and Unit filter the directory; they never change the page. Narrower, they're in Filters only. */}
							<div className='hidden items-center gap-2 @min-[1400px]:flex'>
								<FilterGroupMenu
									group={hospitalGroup}
									picked={filters.hospital ?? []}
									allLabel='All hospitals'
									plural='hospitals'
									onPickedChange={setGroupPicked("hospital")}
								/>
								<FilterGroupMenu
									group={unitGroup}
									picked={filters.unit ?? []}
									allLabel='All units'
									plural='units'
									onPickedChange={setGroupPicked("unit")}
								/>
							</div>
							{/* The view last, as Monitoring's view controls follow its Sort (Nov 17, 2026, user's call). */}
							<SegmentedToggle label='View' options={views} value={view} onValueChange={setViewChoice} iconOnly />
						</FilterBarControls>
					</FilterBar>
				</StickyFilterBar>

				{results}

				{!loading && !loadError && visible.length > shown.length ? (
					<div className='flex justify-center'>
						<Button variant='outline' onClick={() => setLimit((current) => current + pageSize)}>
							Show {Math.min(pageSize, visible.length - shown.length)} more
						</Button>
					</div>
				) : null}

				{/* The states with nothing to list: an error, no patients at all, or a search or filters that match none. */}
				{loadError ? (
					<PanelEmpty>
						<EmptyState
							title="Patients couldn't load"
							description='Check your connection and try again.'
							buttonLabel={onRetry ? "Try again" : undefined}
							buttonIcon={<RotateCwIcon aria-hidden='true' />}
							buttonProps={{ onClick: onRetry }}
						/>
					</PanelEmpty>
				) : !loading && visible.length === 0 ? (
					<PanelEmpty>
						{patients.length === 0 ? (
							<EmptyState
								title='No patients yet'
								description='Patients from your authorized hospitals will appear here.'
							/>
						) : hiddenByStatus ? (
							<EmptyState
								title='No current patients found'
								description={`${hiddenByStatus} ${hiddenByStatus === 1 ? "patient who is" : "patients who are"} no longer in hospital ${hiddenByStatus === 1 ? "matches" : "match"} your search.`}
								buttonLabel='Show all statuses'
								buttonProps={{ onClick: showAllStatuses }}
							/>
						) : query ? (
							<EmptyState
								title='No patients found'
								description='Try another name, MRN, hospital, unit, or adjust your filters.'
								buttonLabel={filtered ? "Clear filters" : undefined}
								buttonIcon={<XIcon aria-hidden='true' />}
								buttonProps={{ onClick: clearFilters }}
							/>
						) : (
							<EmptyState
								title='No patients match these filters'
								description='Try another hospital, unit or status.'
								buttonLabel='Clear filters'
								buttonIcon={<XIcon aria-hidden='true' />}
								buttonProps={{ onClick: clearFilters }}
							/>
						)}
					</PanelEmpty>
				) : null}
			</main>

			<FiltersPanel
				id='patients-filters'
				open={filtersOpen}
				onOpenChange={setFiltersOpen}
				groups={filterGroups}
				filters={filters}
				onFiltersChange={setFilters}
				patients={inView}
			/>
		</>
	);
}

export {
	PatientsPanel,
	type CensusHospital,
	type CensusPatient,
	type CensusUser,
	type DirectoryPatient,
	type PatientsPanelProps,
};
