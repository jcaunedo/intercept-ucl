import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { AnimatePresence, motion, type Transition, type Variants } from "motion/react";

import type { PatientCardAlertVariant, PatientCardProps } from "@/components/cards/patient-card";
import { Badge } from "@/components/data-display/badge";
import { Counter, type CounterProps } from "@/components/data-display/counter";
import { HospitalSectionHeader } from "@/components/data-display/hospital-section-header";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
} from "@/components/forms/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/navigation/tabs";
import { layoutSpring, pressPattern, reducedMotionTransition, revealVariants, useMotionPreference } from "@/lib/motion";
import { cn } from "@/lib/utils";

// The patient list both Census and Monitoring filter, sort and group, so the two pages behave the same (PRD Monitoring
// AC-11). Each page adds the data its own card needs.

/* -------------------------------------------------------------------------- */
/* Data shapes (the app's API fills these)                                    */
/* -------------------------------------------------------------------------- */

type PanelHospital = { id: string; name: string };

type PanelPatient = Pick<
	PatientCardProps,
	"lastName" | "firstName" | "hospital" | "unit" | "bed" | "alert" | "acuity" | "trajectory" | "tags"
> & {
	id: string;
	hospitalId: string;
	/** Assigned to the signed-in clinician this shift. */
	mine?: boolean;
};

/* -------------------------------------------------------------------------- */
/* Product content                                                            */
/* -------------------------------------------------------------------------- */

// The units the menu offers: the most common critical-care units, plus step-down. Product content, not data: a hospital
// may not have every unit, and choosing one with no patients shows the no-matches state.
const unitGroups = [
	{
		label: "Intensive care",
		units: ["MICU", "SICU", "CVICU", "CCU", "Neuro ICU", "Trauma ICU", "Burn ICU", "OB-ICU"],
	},
	{ label: "Step-down", units: ["PCU"] },
];

const severityRank: Record<PatientCardAlertVariant, number> = {
	critical: 4,
	high: 3,
	medium: 2,
	low: 1,
	resolved: 0,
	message: 0,
};

const organSupportTags = ["Ventilated", "On pressors", "NIV", "ECMO", "Dialysis"];

/** Whether a patient has an active alert: a severity, not a resolved alert or a message. */
const hasActiveAlert = (patient: PanelPatient) =>
	Boolean(patient.alert && patient.alert.variant !== "resolved" && patient.alert.variant !== "message");

const hasRisingAcuity = (patient: PanelPatient) => patient.trajectory?.trend === "up";

const hasOrganSupport = (patient: PanelPatient) =>
	(patient.tags ?? []).some((tag) => organSupportTags.includes(tag.label));

/** Active alerts across patients: each card's count (1 when it has none), leaving out resolved alerts and messages. */
const activeAlertCount = (patients: PanelPatient[]) =>
	patients.reduce((total, patient) => (hasActiveAlert(patient) ? total + (patient.alert?.count ?? 1) : total), 0);

/** The counter on a hospital tab takes the color of the worst alert among its patients. */
function topSeverity(patients: PanelPatient[]): CounterProps["variant"] {
	const worst = patients.reduce<PatientCardAlertVariant | undefined>((current, patient) => {
		if (!patient.alert) return current;
		return !current || severityRank[patient.alert.variant] > severityRank[current] ? patient.alert.variant : current;
	}, undefined);
	return worst === "critical" || worst === "high" || worst === "medium" || worst === "low" ? worst : "secondary";
}

const byName = (a: PanelPatient, b: PanelPatient) =>
	a.lastName.localeCompare(b.lastName) || (a.firstName ?? "").localeCompare(b.firstName ?? "");

// Descending by a number; patients without one go last.
const descending = (value: (patient: PanelPatient) => number | undefined) => (a: PanelPatient, b: PanelPatient) => {
	const left = value(a);
	const right = value(b);
	if (left === undefined || right === undefined) return left === right ? 0 : left === undefined ? 1 : -1;
	return right - left;
};

// The 24h SOFA change arrives preformatted ("+2", "−1", "0"). An API would send the number; the layout reads it back.
const acuityChange = (patient: PanelPatient) => {
	const value = patient.trajectory?.value;
	if (value === undefined || patient.trajectory?.variant === "missing") return undefined;
	const number = Number(String(value).replace("−", "-"));
	return Number.isNaN(number) ? undefined : number;
};

// Worst alert first; patients without one last.
const byAlert = (a: PanelPatient, b: PanelPatient) =>
	(b.alert ? severityRank[b.alert.variant] : -1) - (a.alert ? severityRank[a.alert.variant] : -1);

// Highest acuity score first; patients without one last.
const byAcuity = descending((patient) => (typeof patient.acuity?.score === "number" ? patient.acuity.score : undefined));

// Sort orders. Alert and Acuity break ties by each other, so both signals count in either lens; then by name, so the
// order is stable.
const sortOrders = [
	{ id: "alert", label: "Alert", compare: (a: PanelPatient, b: PanelPatient) => byAlert(a, b) || byAcuity(a, b) || byName(a, b) },
	{ id: "acuity", label: "Acuity", compare: (a: PanelPatient, b: PanelPatient) => byAcuity(a, b) || byAlert(a, b) || byName(a, b) },
	{
		id: "change",
		label: "Acuity change",
		compare: (a: PanelPatient, b: PanelPatient) => descending(acuityChange)(a, b) || byName(a, b),
	},
	{ id: "name", label: "Name", compare: byName },
	{
		id: "location",
		label: "Location",
		compare: (a: PanelPatient, b: PanelPatient) =>
			a.hospital?.localeCompare(b.hospital ?? "") ||
			(a.unit ?? "").localeCompare(b.unit ?? "") ||
			(a.bed ?? "").localeCompare(b.bed ?? "", undefined, { numeric: true }) ||
			byName(a, b),
	},
] as const;

type SortOrderId = (typeof sortOrders)[number]["id"];

const sortOrderById = (id: SortOrderId) => sortOrders.find((order) => order.id === id) ?? sortOrders[0];

/** A quick view: one chip in the row, matching a subset of patients. `showCount` adds " · n" to its label. */
type QuickView<Patient> = {
	id: string;
	label: string;
	icon: LucideIcon;
	showCount?: boolean;
	matches: (patient: Patient) => boolean;
};

/* -------------------------------------------------------------------------- */
/* Filter bar parts                                                           */
/* -------------------------------------------------------------------------- */

/** Hospital tabs: All hospitals, then one per hospital, each with its patient count in the color of its worst alert. */
function HospitalTabs({
	hospitals,
	patients,
	value,
	onValueChange,
}: {
	hospitals: PanelHospital[];
	/** The patients the counters count (already narrowed by the switches). */
	patients: PanelPatient[];
	value: string;
	onValueChange: (value: string) => void;
}) {
	return (
		<Tabs value={value} onValueChange={onValueChange}>
			<TabsList variant='line' size='lg' aria-label='Hospital'>
				<TabsTrigger value='all'>
					All hospitals
					<Counter variant='neutral' count={patients.length} />
				</TabsTrigger>
				{hospitals.map((hospital) => {
					const hospitalPatients = patients.filter((patient) => patient.hospitalId === hospital.id);
					return (
						<TabsTrigger key={hospital.id} value={hospital.id}>
							{hospital.name}
							<Counter variant={topSeverity(hospitalPatients)} count={hospitalPatients.length} />
						</TabsTrigger>
					);
				})}
			</TabsList>
		</Tabs>
	);
}

/** The quick-view chips: toggle buttons, one pressed at a time. */
function QuickViewChips<Patient>({
	views,
	value,
	onValueChange,
	patients,
}: {
	views: readonly QuickView<Patient>[];
	value: string;
	onValueChange: (value: string) => void;
	/** The patients a chip's count counts. */
	patients: Patient[];
}) {
	const { prefersReducedMotion } = useMotionPreference();

	return (
		<div role='group' aria-label='Quick views' className='flex flex-wrap gap-1'>
			{views.map((view) => {
				const Icon = view.icon;
				const pressed = value === view.id;
				return (
					// An unpressed chip cross-fades to the outline look, with a `foreground` border, on hover (160ms, the `fast`
					// duration) and presses on tap (Press). Both are instant under reduced motion.
					<Badge
						key={view.id}
						asChild
						variant={pressed ? "neutral" : "secondary"}
						className={cn(
							"transition-[color,background-color,border-color,box-shadow] duration-160 ease-out motion-reduce:transition-none",
							!pressed && "hover:border-foreground hover:bg-background",
						)}
					>
						<motion.button
							type='button'
							aria-pressed={pressed}
							onClick={() => onValueChange(view.id)}
							{...(prefersReducedMotion ? {} : pressPattern)}
						>
							<Icon aria-hidden='true' />
							{view.label}
							{view.showCount ? ` · ${patients.filter(view.matches).length}` : null}
						</motion.button>
					</Badge>
				);
			})}
		</div>
	);
}

// Both menus show the chosen value in semibold and any label ("Sort by:") in regular. Radix drops `className` on
// SelectValue, so the trigger styles it.
const menuTriggerClassName = "gap-1.5 [&_[data-slot=select-value]]:font-semibold";

/** The unit menu: All Units, then the common units, grouped. */
function UnitSelect({ value, onValueChange }: { value: string; onValueChange: (value: string) => void }) {
	return (
		<Select value={value} onValueChange={onValueChange}>
			<SelectTrigger aria-label='Unit' className={menuTriggerClassName}>
				<SelectValue />
			</SelectTrigger>
			<SelectContent position='popper' align='start'>
				<SelectItem value='all'>All Units</SelectItem>
				{unitGroups.map((group) => (
					<React.Fragment key={group.label}>
						<SelectSeparator />
						<SelectGroup>
							<SelectLabel>{group.label}</SelectLabel>
							{group.units.map((name) => (
								<SelectItem key={name} value={name}>
									{name}
								</SelectItem>
							))}
						</SelectGroup>
					</React.Fragment>
				))}
			</SelectContent>
		</Select>
	);
}

/** The sort menu. Re-sorting reuses the grid's glide: cards are keyed by patient, so they move to their new slots. */
function SortSelect({ value, onValueChange }: { value: SortOrderId; onValueChange: (value: SortOrderId) => void }) {
	return (
		<Select value={value} onValueChange={(next) => onValueChange(next as SortOrderId)}>
			<SelectTrigger aria-label='Sort by' className={menuTriggerClassName}>
				<span>
					Sort by: <SelectValue />
				</span>
			</SelectTrigger>
			<SelectContent position='popper' align='start'>
				{sortOrders.map((order) => (
					<SelectItem key={order.id} value={order.id}>
						{order.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

/* -------------------------------------------------------------------------- */
/* Grid                                                                       */
/* -------------------------------------------------------------------------- */

// Under reduced motion a filtered card still fades in and out, just at once and without the upward move. Variants carry
// their own transitions, so this needs its own set rather than a resolve() override.
const cardReducedVariants: Variants = {
	initial: { opacity: 0 },
	animate: { opacity: 1, transition: reducedMotionTransition },
	exit: { opacity: 0, transition: reducedMotionTransition },
};

/** One grid item, wrapped for the filter motion (Reveal in, fade out, glide between slots). */
function PanelItem({
	reducedMotion,
	layoutTransition,
	className,
	children,
	ref,
}: {
	reducedMotion: boolean;
	layoutTransition: Transition;
	className?: string;
	children: React.ReactNode;
	ref?: React.Ref<HTMLDivElement>;
}) {
	return (
		<motion.div
			ref={ref}
			layout='position'
			variants={reducedMotion ? cardReducedVariants : revealVariants}
			initial='initial'
			animate='animate'
			exit='exit'
			transition={{ layout: layoutTransition }}
			className={className}
		>
			{children}
		</motion.div>
	);
}

/**
 * The patient grid. When a filter, the sort or the data changes the set, cards that join Reveal, cards that leave fade
 * out and the rest glide to their new slots. Grouped, it splits into a section per hospital: a heading row, then that
 * hospital's cards (the patients must already be sorted by hospital).
 */
function PanelGrid<Patient extends PanelPatient>({
	patients,
	hospitals,
	grouped,
	renderCard,
	className,
}: {
	patients: Patient[];
	hospitals: PanelHospital[];
	grouped: boolean;
	renderCard: (patient: Patient) => React.ReactNode;
	className?: string;
}) {
	const { prefersReducedMotion, resolve } = useMotionPreference();
	const reducedMotion = Boolean(prefersReducedMotion);
	const layoutTransition = resolve(layoutSpring);

	// A heading goes in wherever the hospital changes.
	const items = patients.flatMap((patient, index) => {
		const card = { kind: "card" as const, patient };
		if (!grouped || patients[index - 1]?.hospitalId === patient.hospitalId) return [card];
		const sectionPatients = patients.filter((other) => other.hospitalId === patient.hospitalId);
		const name = hospitals.find((hospital) => hospital.id === patient.hospitalId)?.name ?? patient.hospital ?? "";
		return [{ kind: "section" as const, id: patient.hospitalId, name, patients: sectionPatients }, card];
	});

	return (
		// popLayout takes a leaving card out of the grid at once (the grid is `relative` for it), so the others move while
		// it fades. initial={false}: the first render doesn't animate. Hospital sections are full-width heading rows in the
		// same grid, so cards keep their parent and key and glide into their section instead of remounting. Hidden once
		// empty (after any exits), so it adds no gap above the empty state.
		<div className={cn("relative grid grid-cols-1 gap-4 empty:hidden", className)}>
			<AnimatePresence initial={false} mode='popLayout'>
				{items.map((item) =>
					item.kind === "section" ? (
						<PanelItem
							key={`section-${item.id}`}
							reducedMotion={reducedMotion}
							layoutTransition={layoutTransition}
							className='col-span-full first:mt-2 not-first:mt-4'
						>
							<HospitalSectionHeader
								name={item.name}
								patientCount={item.patients.length}
								alertCount={activeAlertCount(item.patients)}
							/>
						</PanelItem>
					) : (
						<PanelItem
							key={item.patient.id}
							reducedMotion={reducedMotion}
							layoutTransition={layoutTransition}
							className='grid'
						>
							{renderCard(item.patient)}
						</PanelItem>
					),
				)}
			</AnimatePresence>
		</div>
	);
}

/** Wraps the page's empty state: Reveals in, centered both ways in the space below the filter bar. */
function PanelEmpty({ children }: { children: React.ReactNode }) {
	const { prefersReducedMotion } = useMotionPreference();

	return (
		<motion.div
			variants={prefersReducedMotion ? cardReducedVariants : revealVariants}
			initial='initial'
			animate='animate'
			className='flex flex-1 items-center justify-center py-16'
		>
			{children}
		</motion.div>
	);
}

export {
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
};
