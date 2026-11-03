import * as React from "react";
import { ListFilterIcon, type LucideIcon } from "lucide-react";

import { Button } from "@/components/buttons/button";
import { Counter } from "@/components/data-display/counter";
import { Checkbox } from "@/components/forms/checkbox";
import { FieldLegend, FieldSet } from "@/components/forms/field";
import { Label } from "@/components/forms/label";
import { SearchInput } from "@/components/forms/search-input";
import {
	Sheet,
	SheetContent,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/overlays/sheet";
import { cn } from "@/lib/utils";

import { useHideToasts } from "../side-panel";
import { hasActiveAlert, type PanelPatient } from "./patient-panel";

// The Filters panel shared by the Census and Monitoring (Oct 30, 2026, user's call; from the "Census Hospital Filters"
// artifact, moved from its popover to a right side panel, then to a floating Sheet on Nov 1, 2026). Options in a group match any; groups match all. Each option's
// count is how many patients it would show with the other groups as they are. Each page builds its own groups; the ones
// both pages have are here.

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

/** The options picked in each group, by group id. */
type PatientFilters = Record<string, string[]>;

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
const filterCount = (filters: PatientFilters) => Object.values(filters).reduce((total, picked) => total + picked.length, 0);

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
			options: ["Ventilated", "NIV", "On pressors", "ECMO", "Dialysis"].map((label) => ({ id: label, label, matches: tagged(label) })),
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
 * The Filters, in a Sheet floating over the app from the right (Nov 1, 2026, Intercept-Live Filter example `205:5447`;
 * a side panel beside the canvas before). A checkbox per option with its count; options that would show no one are
 * muted, not disabled. The cards update behind the scrim as options change; Apply closes it.
 */
function FiltersPanel<Patient>({ id, open, onOpenChange, groups, filters, onFiltersChange, patients }: FiltersPanelProps<Patient>) {
	// The alert toasts hide while it's open (Nov 3, 2026, user's call) and come back when it closes.
	useHideToasts(open);
	const shown = patients.filter((patient) => passesFilters(patient, groups, filters)).length;
	// The search narrows the options shown, not the patients: an option whose name matches, or every option of a group
	// whose title matches. Picked options stay picked while hidden. It starts empty each time the sheet opens.
	const [query, setQuery] = React.useState("");
	React.useEffect(() => {
		if (!open) setQuery("");
	}, [open]);
	const needle = query.trim().toLocaleLowerCase();
	const shownGroups = needle
		? groups
				.map((group) =>
					group.title.toLocaleLowerCase().includes(needle)
						? group
						: { ...group, options: group.options.filter((option) => option.label.toLocaleLowerCase().includes(needle)) },
				)
				.filter((group) => group.options.length)
		: groups;

	const toggle = (groupId: string, optionId: string, checked: boolean) => {
		const picked = filters[groupId] ?? [];
		onFiltersChange({
			...filters,
			[groupId]: checked ? [...picked, optionId] : picked.filter((id) => id !== optionId),
		});
	};

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				id={id}
				closeLabel='Close Filters'
				// No description under the title (Nov 3, 2026, user's call); Radix expects one unless this is unset.
				aria-describedby={undefined}
				// With text in the search, Escape clears it first and keeps the sheet open; the next one closes it. Radix hears
				// Escape before the field does, so the clearing happens here.
				onEscapeKeyDown={(event) => {
					if (!query) return;
					event.preventDefault();
					setQuery("");
				}}
			>
				<SheetHeader>
					<SheetTitle>Filters</SheetTitle>
					{/* First in the sheet, so it takes the focus when the sheet opens. */}
					<SearchInput
						collapsible={false}
						expandedWidth='100%'
						placeholder='Search filters'
						value={query}
						onValueChange={setQuery}
						className='mt-2'
					/>
				</SheetHeader>
				<div className='flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto border-t border-border px-8 py-5 scrollbar-soft'>
					{needle && !shownGroups.length ? (
						<p className='text-sm text-muted-foreground'>No filters match "{query.trim()}"</p>
					) : null}
					{shownGroups.map((group) =>
						group.options.length ? (
							<FieldSet key={group.id} className='gap-1'>
								<FieldLegend
									variant='label'
									className={cn("text-xs font-semibold tracking-wide text-muted-foreground uppercase", group.description ? "mb-0.5" : "mb-2")}
								>
									{group.title}
								</FieldLegend>
								{group.description ? <p className='mb-2 text-xs text-muted-foreground'>{group.description}</p> : null}
								{group.options.map((option) => {
									const optionId = `${id}-${group.id}-${option.id}`;
									const checked = (filters[group.id] ?? []).includes(option.id);
									const count = patients.filter(
										(patient) => passesFilters(patient, groups, filters, group.id) && option.matches(patient),
									).length;
									return (
										<div
											key={option.id}
											className={cn(
												"-mx-2 flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-accent",
												!count && !checked && "text-muted-foreground",
											)}
										>
											<Checkbox
												id={optionId}
												checked={checked}
												onCheckedChange={(value) => toggle(group.id, option.id, value === true)}
											/>
											{option.swatch ? <span aria-hidden='true' className={cn("size-2 shrink-0 rounded-full", option.swatch)} /> : null}
											{option.icon ? <option.icon aria-hidden='true' className='size-4 shrink-0 text-icon' /> : null}
											<Label htmlFor={optionId} className='min-w-0 flex-1 cursor-pointer font-normal text-inherit'>
												{option.label}
											</Label>
											<span className='text-sm text-muted-foreground tabular-nums'>
												{count}
												<span className='sr-only'> patients</span>
											</span>
										</div>
									);
								})}
							</FieldSet>
						) : null,
					)}
				</div>
				<SheetFooter className='flex-wrap items-center justify-end border-t border-border pt-5'>
					<p aria-live='polite' className='mr-auto text-sm text-muted-foreground tabular-nums'>
						{shown} of {patients.length} patients in this view
					</p>
					<Button variant='ghost' disabled={!filterCount(filters)} onClick={() => onFiltersChange({})}>
						Clear all
					</Button>
					{/* The cards already follow each option; Apply closes the sheet (Nov 1, 2026, user's call; it read "Show n
					    patients" before). */}
					<Button onClick={() => onOpenChange(false)}>Apply</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
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
	const picked = filterCount(filters);
	return (
		<Button
			variant='outline'
			aria-expanded={open}
			aria-controls={panelId}
			aria-label={picked ? `Filters, ${picked} picked` : undefined}
			onClick={onClick}
		>
			<ListFilterIcon aria-hidden='true' />
			Filters
			{picked ? <Counter count={picked} /> : null}
		</Button>
	);
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
