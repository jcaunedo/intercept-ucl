import * as React from "react";
import { UsersIcon, type LucideIcon } from "lucide-react";
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
import {
	motionDuration,
	pressPattern,
	reducedMotionTransition,
	reorderSpring,
	revealVariants,
	useMotionPreference,
} from "@/lib/motion";
import { cn } from "@/lib/utils";

import { usePatientNavigation } from "../patient-navigation";

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

// Worst alert first; patients without one last. A resolved alert ranks as none, so its card moves once, when it
// resolves, and not again when its "Resolved" pill fades (useFadingResolvedAlerts).
const alertRank = (patient: PanelPatient) =>
	patient.alert && patient.alert.variant !== "resolved" ? severityRank[patient.alert.variant] : -1;
const byAlert = (a: PanelPatient, b: PanelPatient) => alertRank(b) - alertRank(a);

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

/* -------------------------------------------------------------------------- */
/* Holding the order                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Whether the panel's order is held: while the pointer is over the grid, or keyboard focus is in it, so cards don't
 * move under the clinician's hand or eyes (Oct 28, 2026). `pauseProps` go on the grid. Touch doesn't hold it (a tap
 * isn't a hover), and neither does focus left by a click, so moving the mouse away always resumes. It's also held while
 * a patient's details hide the page, and for a moment after Back, so a card that has to move does it in sight.
 */
function useSortPause() {
	const [hovered, setHovered] = React.useState(false);
	const [focused, setFocused] = React.useState(false);
	const grid = React.useRef<HTMLElement | null>(null);
	const hidden = usePatientNavigation()?.patientOpen ?? false;
	const [shown, setShown] = React.useState(!hidden);

	React.useEffect(() => {
		if (hidden) {
			// The page hides without a pointerleave or blur.
			setShown(false);
			setHovered(false);
			setFocused(false);
			return;
		}
		const timer = window.setTimeout(() => setShown(true), motionDuration.normal * 1000);
		return () => window.clearTimeout(timer);
	}, [hidden]);

	// A pointerleave can be missed (the grid hid or moved away under a still pointer), so the next pointer movement
	// anywhere else ends the hover.
	React.useEffect(() => {
		if (!hovered) return;
		const onPointerOver = (event: PointerEvent) => {
			if (!(event.target instanceof Node) || !grid.current?.contains(event.target)) setHovered(false);
		};
		document.addEventListener("pointerover", onPointerOver);
		return () => document.removeEventListener("pointerover", onPointerOver);
	}, [hovered]);

	const pauseProps = {
		onPointerEnter: (event: React.PointerEvent<HTMLElement>) => {
			grid.current = event.currentTarget;
			if (event.pointerType !== "touch") setHovered(true);
		},
		onPointerLeave: () => setHovered(false),
		onFocus: (event: React.FocusEvent) => setFocused(event.target.matches(":focus-visible")),
		onBlur: (event: React.FocusEvent<HTMLElement>) => {
			if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
		},
	} satisfies React.HTMLAttributes<HTMLElement>;
	return { paused: hovered || focused || !shown, pauseProps };
}

/**
 * The patients in the order they had when the pause began, while it lasts; their values keep updating. A patient who
 * leaves just drops out; one who joins (a filter changed) re-sorts everyone at once. When the pause ends, the patients
 * take their new order, and the cards move there (Reorder).
 */
function usePausedOrder<Patient extends { id: string }>(patients: Patient[], paused: boolean): Patient[] {
	const order = React.useRef<string[]>([]);
	const position = new Map(order.current.map((id, index) => [id, index]));
	if (paused && patients.every((patient) => position.has(patient.id))) {
		return [...patients].sort((a, b) => (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0));
	}
	order.current = patients.map((patient) => patient.id);
	return patients;
}

/**
 * A "Resolved" pill stays while its card moves to its new place, then fades `motionDuration.resolvedHold` after the
 * card lands (MOTION.md Urgency: the pill fades on `resolvedFadeTransition`). The hold doesn't start while the order is
 * held, since the card hasn't moved yet. A patient whose alert stops being resolved (a new one fired) shows the next
 * "Resolved" again.
 */
function useFadingResolvedAlerts<Patient extends PanelPatient>(patients: Patient[], paused: boolean): Patient[] {
	const [faded, setFaded] = React.useState<ReadonlySet<string>>(() => new Set());
	const timers = React.useRef(new Map<string, number>());
	const resolvedIds = patients.filter((patient) => patient.alert?.variant === "resolved").map((patient) => patient.id);
	const resolvedKey = resolvedIds.join();

	React.useEffect(() => {
		const resolved = new Set(resolvedKey ? resolvedKey.split(",") : []);
		for (const [id, timer] of timers.current) {
			if (paused || !resolved.has(id)) {
				window.clearTimeout(timer);
				timers.current.delete(id);
			}
		}
		if ([...faded].some((id) => !resolved.has(id))) {
			setFaded(new Set([...faded].filter((id) => resolved.has(id))));
			return;
		}
		if (paused) return;
		// The card's move (Reorder settles within `slow`), then the hold.
		const delay = (motionDuration.slow + motionDuration.resolvedHold) * 1000;
		for (const id of resolved) {
			if (faded.has(id) || timers.current.has(id)) continue;
			timers.current.set(
				id,
				window.setTimeout(() => {
					timers.current.delete(id);
					setFaded((current) => new Set(current).add(id));
				}, delay),
			);
		}
	}, [resolvedKey, paused, faded]);

	React.useEffect(() => {
		const pending = timers.current;
		return () => pending.forEach((timer) => window.clearTimeout(timer));
	}, []);

	return faded.size
		? patients.map((patient) =>
				patient.alert?.variant === "resolved" && faded.has(patient.id) ? { ...patient, alert: undefined } : patient,
			)
		: patients;
}

/** Whose patients the page shows: everyone's, or the signed-in clinician's (assigned this shift). */
type PatientScope = "all" | "mine";

/** A quick view: one chip in the row, matching a subset of patients. */
type QuickView<Patient> = {
	id: string;
	label: string;
	icon: LucideIcon;
	matches: (patient: Patient) => boolean;
};

/* -------------------------------------------------------------------------- */
/* Filter bar parts                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Hospital tabs: All hospitals, then one per hospital in alphabetical order (as Sort by Location groups them), each
 * with its patient count in the color of its worst alert. Fills the page's hospital bar: 40px tall, the active tab's
 * underline over the bar's bottom border.
 */
function HospitalTabs({
	hospitals,
	patients,
	value,
	onValueChange,
}: {
	hospitals: PanelHospital[];
	/** The patients the counters count (already narrowed to the patient scope). */
	patients: PanelPatient[];
	value: string;
	onValueChange: (value: string) => void;
}) {
	const alphabetical = [...hospitals].sort((a, b) => a.name.localeCompare(b.name));

	return (
		// When side panels leave the bar too little room, the tabs scroll sideways (scrollbar hidden; trackpads and the
		// arrow keys still reach every tab) instead of pushing the live feed out of the bar. The 1px overlap with the bar's
		// line is on the scroll box, so the active underline isn't clipped.
		<Tabs
			value={value}
			onValueChange={onValueChange}
			className='-mb-px min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
		>
			<TabsList variant='line' size='lg' aria-label='Hospital'>
				<TabsTrigger value='all'>
					All hospitals
					<Counter variant='neutral' count={patients.length} />
				</TabsTrigger>
				{alphabetical.map((hospital) => {
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

/**
 * One filter chip: a toggle button with its icon, label and how many patients it matches (" · n", Badge's `count`).
 * An unpressed chip cross-fades to the outline look, with a `foreground` border, on hover (160ms, the `fast` duration)
 * and presses on tap (Press). Both are instant under reduced motion.
 */
function FilterChip({
	icon: Icon,
	label,
	count,
	pressed,
	onPressedChange,
}: {
	icon: LucideIcon;
	label: string;
	count: number;
	pressed: boolean;
	onPressedChange: (pressed: boolean) => void;
}) {
	const { prefersReducedMotion } = useMotionPreference();

	return (
		<Badge
			asChild
			variant={pressed ? "neutral" : "secondary"}
			count={count}
			className={cn(
				"transition-[color,background-color,border-color,box-shadow] duration-160 ease-out motion-reduce:transition-none",
				!pressed && "hover:border-foreground hover:bg-background",
			)}
		>
			<motion.button
				type='button'
				aria-pressed={pressed}
				onClick={() => onPressedChange(!pressed)}
				{...(prefersReducedMotion ? {} : pressPattern)}
			>
				<Icon aria-hidden='true' />
				{label}
			</motion.button>
		</Badge>
	);
}

/**
 * My patients: a chip like the quick views, off by default, so the page shows everyone. On, it narrows everything below
 * it to the signed-in clinician's patients, the tab counters included. It's its own choice, so it combines with a quick
 * view. `count` is how many of the user's patients are in the current hospital and unit.
 */
function MyPatientsChip({
	value,
	onValueChange,
	count,
}: {
	value: PatientScope;
	onValueChange: (value: PatientScope) => void;
	count: number;
}) {
	return (
		<FilterChip
			icon={UsersIcon}
			label='My patients'
			count={count}
			pressed={value === "mine"}
			onPressedChange={(pressed) => onValueChange(pressed ? "mine" : "all")}
		/>
	);
}

/**
 * The quick-view chips: toggle buttons, at most one pressed; pressing the pressed one turns it off (`null`). Every chip
 * shows how many patients it matches among `patients`, so the counts follow the hospital tab, the unit and My patients.
 */
function QuickViewChips<Patient>({
	views,
	value,
	onValueChange,
	patients,
}: {
	views: readonly QuickView<Patient>[];
	value: string | null;
	onValueChange: (value: string | null) => void;
	/** The patients a chip's count counts: the page's patients in the current hospital, unit and scope. */
	patients: Patient[];
}) {
	return (
		<div role='group' aria-label='Quick views' className='flex flex-wrap gap-1'>
			{views.map((view) => (
				<FilterChip
					key={view.id}
					icon={view.icon}
					label={view.label}
					count={patients.filter(view.matches).length}
					pressed={value === view.id}
					onPressedChange={(pressed) => onValueChange(pressed ? view.id : null)}
				/>
			))}
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

/**
 * The sort menu. Re-sorting reuses the grid's glide: cards are keyed by patient, so they move to their new slots. A page
 * can offer only the `orders` that make sense on it (e.g. no acuity sorts where the card doesn't show acuity).
 */
function SortSelect({
	value,
	onValueChange,
	orders = sortOrders.map((order) => order.id),
}: {
	value: SortOrderId;
	onValueChange: (value: SortOrderId) => void;
	orders?: readonly SortOrderId[];
}) {
	return (
		<Select value={value} onValueChange={(next) => onValueChange(next as SortOrderId)}>
			<SelectTrigger aria-label='Sort by' className={menuTriggerClassName}>
				<span>
					Sort by: <SelectValue />
				</span>
			</SelectTrigger>
			<SelectContent position='popper' align='start'>
				{sortOrders
					.filter((order) => orders.includes(order.id))
					.map((order) => (
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

/**
 * One grid item, wrapped for the filter motion: Reveal in, fade out, and Reorder between slots (the reorder spring, and
 * while it travels it rises above the other cards with a larger shadow, so crossing cards stay readable).
 */
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
	const [moving, setMoving] = React.useState(false);

	return (
		<motion.div
			ref={ref}
			layout='position'
			variants={reducedMotion ? cardReducedVariants : revealVariants}
			initial='initial'
			animate='animate'
			exit='exit'
			transition={{ layout: layoutTransition }}
			onLayoutAnimationStart={() => setMoving(true)}
			onLayoutAnimationComplete={() => setMoving(false)}
			data-moving={moving ? "" : undefined}
			// The card is the item's child; its own shadow transition (160ms) eases the lift in and out.
			className={cn("relative data-moving:z-10 data-moving:*:shadow-lg", className)}
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
	...props
}: Omit<React.ComponentProps<"div">, "children"> & {
	patients: Patient[];
	hospitals: PanelHospital[];
	grouped: boolean;
	renderCard: (patient: Patient) => React.ReactNode;
}) {
	const { prefersReducedMotion, resolve } = useMotionPreference();
	const reducedMotion = Boolean(prefersReducedMotion);
	const layoutTransition = resolve(reorderSpring);

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
		<div className={cn("relative grid grid-cols-1 gap-4 empty:hidden", className)} {...props}>
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
	MyPatientsChip,
	PanelEmpty,
	PanelGrid,
	QuickViewChips,
	sortOrderById,
	useFadingResolvedAlerts,
	usePausedOrder,
	useSortPause,
	SortSelect,
	UnitSelect,
	type PanelHospital,
	type PanelPatient,
	type PatientScope,
	type QuickView,
	type SortOrderId,
};
