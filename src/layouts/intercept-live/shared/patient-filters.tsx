import * as React from "react";
import type { LucideIcon } from "lucide-react";

import {
	FilterPanel,
	FilterPanelButton,
	filterPanelCount,
	type FilterPanelGroup,
	type FilterPanelValue,
} from "@/components/forms/filter-panel";

import { useHideToasts } from "../side-panel";
import { hasActiveAlert, type PanelPatient } from "./patient-panel";
import { isPressorFlag } from "./pressors";

// The Filters shared by the Census and Monitoring (Oct 30, 2026, user's call; from the "Census Hospital Filters"
// artifact): the patients' filter groups, what each option matches, and UCL's FilterPanel with their counts. Options in
// a group match any; groups match all. Each page builds its own groups; the ones both pages have are here.

type FilterOption<Patient> = {
	id: string;
	label: string;
	matches: (patient: Patient) => boolean;
	/** A severity dot before the label (Highest alert). */
	swatch?: string;
	/** An icon before the label, e.g. the alert action's (Alert status). */
	icon?: LucideIcon;
	/** Matches on live readings: once picked, it keeps the patients who matched then, so cards don't come and go as the
	 * readings move (PRD MON-013). */
	live?: boolean;
};

type FilterGroup<Patient> = {
	id: string;
	title: string;
	/** A line under the title, e.g. for a group whose options hold their patients. */
	description?: string;
	options: FilterOption<Patient>[];
};

/** The options picked in each group, by group id: UCL's FilterPanelValue. */
type PatientFilters = FilterPanelValue;

/** The patients each picked live option holds, by "group:option". */
type HeldFilters = Record<string, ReadonlySet<string>>;

const heldKey = (groupId: string, optionId: string) => `${groupId}:${optionId}`;

/** Whether a patient passes every group with something picked, leaving out `except` (for that group's counts). */
function passesFilters<Patient>(patient: Patient, groups: FilterGroup<Patient>[], filters: PatientFilters, except?: string) {
	return groups.every((group) => {
		const picked = filters[group.id] ?? [];
		if (group.id === except || !picked.length) return true;
		return group.options.some((option) => picked.includes(option.id) && option.matches(patient));
	});
}

/** How many options are picked across the groups: the Filters button's count. */
const filterCount = filterPanelCount;

/**
 * The picked filters, and the patients each picked live option holds: snapshotted from `patients` when it's picked,
 * dropped when it's cleared. `apply` swaps a held option's test for its snapshot; `setFilters` takes the groups as built
 * now, to know which options are live and who they match.
 */
function usePatientFilters<Patient extends { id: string }>() {
	const [state, setState] = React.useState<{ filters: PatientFilters; held: HeldFilters }>({ filters: {}, held: {} });

	const setFilters = (filters: PatientFilters, groups: FilterGroup<Patient>[], patients: Patient[]) =>
		setState((current) => {
			const held: HeldFilters = {};
			for (const group of groups) {
				for (const option of group.options) {
					const key = heldKey(group.id, option.id);
					if (!option.live || !(filters[group.id] ?? []).includes(option.id)) continue;
					held[key] =
						current.held[key] ?? new Set(patients.filter(option.matches).map((patient) => patient.id));
				}
			}
			return { filters, held };
		});

	const apply = (groups: FilterGroup<Patient>[]): FilterGroup<Patient>[] =>
		groups.map((group) => ({
			...group,
			options: group.options.map((option) => {
				const ids = state.held[heldKey(group.id, option.id)];
				return ids ? { ...option, matches: (patient: Patient) => ids.has(patient.id) } : option;
			}),
		}));

	return { filters: state.filters, setFilters, apply };
}

/* -------------------------------------------------------------------------- */
/* Groups both pages have                                                     */
/* -------------------------------------------------------------------------- */

type FilterablePatient = PanelPatient;

const tagged = (label: string) => (patient: FilterablePatient) => (patient.tags ?? []).some((tag) => tag.label === label);

const severities = [
	{ id: "critical", label: "Critical", swatch: "bg-severity-critical" },
	{ id: "high", label: "High", swatch: "bg-severity-high" },
	{ id: "medium", label: "Medium", swatch: "bg-severity-medium" },
	{ id: "low", label: "Low", swatch: "bg-severity-low" },
] as const;

/** Unit: the units among `patients` (the hospital tab's), plus any already picked. */
function unitFilterGroup<Patient extends FilterablePatient>(patients: Patient[], filters: PatientFilters): FilterGroup<Patient> {
	const units = [...new Set([...patients.map((patient) => patient.unit), ...(filters.unit ?? [])])]
		.filter((unit): unit is string => Boolean(unit))
		.sort();
	return { id: "unit", title: "Unit", options: units.map((unit) => ({ id: unit, label: unit, matches: (patient) => patient.unit === unit })) };
}

/** Highest alert: each severity, by its dot, and No active alerts. */
function alertFilterGroup<Patient extends FilterablePatient>(): FilterGroup<Patient> {
	return {
		id: "alert",
		title: "Highest alert",
		options: [
			...severities.map(({ id, label, swatch }) => ({
				id,
				label,
				swatch,
				matches: (patient: Patient) => hasActiveAlert(patient) && patient.alert?.variant === id,
			})),
			{ id: "none", label: "No active alerts", swatch: "bg-border", matches: (patient) => !hasActiveAlert(patient) },
		],
	};
}

/** Organ support, and Code status & safety: the patient's tags. */
function tagFilterGroups<Patient extends FilterablePatient>(): FilterGroup<Patient>[] {
	return [
		{
			id: "support",
			title: "Organ support",
			// On pressors matches any count ("1 pressor", "2 pressors").
			options: ["Ventilated", "NIV", "On pressors", "ECMO", "Dialysis"].map((label) => ({
				id: label,
				label,
				matches:
					label === "On pressors"
						? (patient: Patient) => (patient.tags ?? []).some((tag) => isPressorFlag(tag.label))
						: tagged(label),
			})),
		},
		{
			id: "safety",
			title: "Code status & safety",
			options: ["DNR", "Contact isolation", "Droplet isolation", "Fall risk"].map((label) => ({
				id: label,
				label,
				matches: tagged(label),
			})),
		},
	];
}

/* -------------------------------------------------------------------------- */
/* FiltersPanel                                                               */
/* -------------------------------------------------------------------------- */

type FiltersPanelProps<Patient> = {
	/** The panel's id, for the Filters button's `aria-controls`. */
	id: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	groups: FilterGroup<Patient>[];
	filters: PatientFilters;
	onFiltersChange: (filters: PatientFilters) => void;
	/** The patients in view before these filters: the hospital tab, My patients, the search and the page's chips. */
	patients: Patient[];
};

/**
 * UCL's FilterPanel with the patients' counts (Nov 1, 2026, Intercept-Live Filter example `205:5447`): each option's is
 * how many patients it would show with the other groups as they are, and the footer says how many of the view's are
 * shown. The cards update behind the scrim as options change.
 */
function FiltersPanel<Patient>({ id, open, onOpenChange, groups, filters, onFiltersChange, patients }: FiltersPanelProps<Patient>) {
	// The alert toasts hide while it's open (Nov 3, 2026, user's call) and come back when it closes.
	useHideToasts(open);
	const shown = patients.filter((patient) => passesFilters(patient, groups, filters)).length;
	const panelGroups: FilterPanelGroup[] = groups.map((group) => ({
		id: group.id,
		title: group.title,
		description: group.description,
		options: group.options.map((option) => ({
			id: option.id,
			label: option.label,
			swatch: option.swatch,
			icon: option.icon,
			count: patients.filter((patient) => passesFilters(patient, groups, filters, group.id) && option.matches(patient))
				.length,
		})),
	}));

	return (
		<FilterPanel
			id={id}
			open={open}
			onOpenChange={onOpenChange}
			groups={panelGroups}
			value={filters}
			onValueChange={onFiltersChange}
			countLabel='patients'
			summary={`${shown} of ${patients.length} patients in this view`}
		/>
	);
}

/* -------------------------------------------------------------------------- */
/* FiltersButton                                                              */
/* -------------------------------------------------------------------------- */

/** The toolbar's Filters button: opens the panel `panelId`; the counter is how many options are picked. */
function FiltersButton({
	panelId,
	open,
	filters,
	onClick,
}: {
	panelId: string;
	open: boolean;
	filters: PatientFilters;
	onClick: () => void;
}) {
	return <FilterPanelButton panelId={panelId} open={open} count={filterCount(filters)} onClick={onClick} />;
}

export {
	alertFilterGroup,
	filterCount,
	FiltersButton,
	FiltersPanel,
	passesFilters,
	tagFilterGroups,
	unitFilterGroup,
	usePatientFilters,
	type FilterGroup,
	type FilterOption,
	type PatientFilters,
};
