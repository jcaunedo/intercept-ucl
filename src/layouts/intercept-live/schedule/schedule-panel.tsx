import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import {
	ArrowLeftRightIcon,
	CalendarCheckIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	PalmtreeIcon,
	PlusIcon,
} from "lucide-react";

import { Button } from "@/components/buttons/button";
import { Checkbox } from "@/components/forms/checkbox";
import { Counter } from "@/components/data-display/counter";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/overlays/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/navigation/tabs";
import { Typography } from "@/components/typography/typography";
import { fadeVariants, slideVariants, useMotionPreference } from "@/lib/motion";
import { cn } from "@/lib/utils";

import type { PanelHospital } from "../shared/patient-panel";
import {
	MiniCalendar,
	MonthView,
	TimeGridView,
	addDays,
	addMonths,
	parseShift,
	shiftHours,
	shiftKindOrder,
	shiftKinds,
	startOfDay,
	startOfWeek,
	type ParsedShift,
	type ScheduleShift,
	type ScheduleShiftAction,
	type ScheduleShiftKind,
	type ScheduleShiftStatus,
} from "./schedule-calendar";

/** How much of the calendar shows at once. */
type ScheduleView = "month" | "week" | "day";
/** The clinician's own shifts, or the open shifts they can take. */
type ScheduleTab = "mine" | "open";
/** What New request asks the coordinator for. */
type ScheduleRequestKind = "time-off" | "swap" | "availability";

type SchedulePanelProps = {
	/** The clinician's shifts, on-call blocks and time off, published and draft. */
	shifts: ScheduleShift[];
	/** Shifts open for the clinician to take: only ones they're eligible for (Left Nav Spec). */
	openShifts?: ScheduleShift[];
	/** The hospitals the clinician covers, to filter by and to name in a shift's details. */
	hospitals: PanelHospital[];
	defaultView?: ScheduleView;
	defaultTab?: ScheduleTab;
	/** The day the calendar opens on, as an ISO date; today by default. */
	defaultDate?: string;
	/** Request swap, Give away, Cancel request (time off) or Request this shift (open), from a shift's details. */
	onShiftAction?: (shiftId: string, action: ScheduleShiftAction) => void;
	/** New request's items. Without it, no New request button. */
	onNewRequest?: (kind: ScheduleRequestKind) => void;
};

// New request's items.
const requestKinds: { kind: ScheduleRequestKind; label: string; icon: typeof PlusIcon }[] = [
	{ kind: "time-off", label: "Time off", icon: PalmtreeIcon },
	{ kind: "swap", label: "Shift swap", icon: ArrowLeftRightIcon },
	{ kind: "availability", label: "Availability", icon: CalendarCheckIcon },
];

const viewLabels: Record<ScheduleView, string> = { month: "Month", week: "Week", day: "Day" };

/** The time zone the calendar's times are in, e.g. "MST". */
function timeZoneName() {
	return new Intl.DateTimeFormat("en-US", { timeZoneName: "short" })
		.formatToParts(new Date())
		.find((part) => part.type === "timeZoneName")?.value;
}

/** The toolbar's title: "November 2026", "Nov 15 – 21, 2026" or "Tuesday, November 17, 2026". */
function periodTitle(view: ScheduleView, date: Date) {
	if (view === "month") return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
	if (view === "day") {
		return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
	}
	const first = startOfWeek(date);
	const last = addDays(first, 6);
	const sameMonth = first.getMonth() === last.getMonth();
	const from = first.toLocaleDateString("en-US", { month: "short", day: "numeric" });
	const to = last.toLocaleDateString("en-US", sameMonth ? { day: "numeric" } : { month: "short", day: "numeric" });
	return `${from} – ${to}, ${last.getFullYear()}`;
}

/** The date one period before or after (`step` -1 or 1). */
function stepPeriod(view: ScheduleView, date: Date, step: 1 | -1) {
	if (view === "month") return addMonths(date, step);
	return addDays(date, view === "week" ? 7 * step : step);
}

/** A key for the period on screen, so the calendar glides when it changes. */
function periodKey(view: ScheduleView, date: Date) {
	if (view === "month") return `month-${date.getFullYear()}-${date.getMonth()}`;
	if (view === "week") return `week-${startOfWeek(date).toDateString()}`;
	return `day-${date.toDateString()}`;
}

/**
 * Intercept Live's Schedule page (Left Nav Spec: "the clinician's own shifts across hospitals, plus an Open shifts
 * tab"; System Specification §5.15): a calendar of the clinician's shifts (Month, Week, Day), with a rail to jump to a
 * day and filter by shift type and hospital. A shift opens its details, where the clinician asks for a swap, gives it
 * away or, on Open shifts, asks to take one. PRD Schedule.
 */
function SchedulePanel({
	shifts,
	openShifts = [],
	hospitals,
	defaultView = "month",
	defaultTab = "mine",
	defaultDate,
	onShiftAction,
	onNewRequest,
}: SchedulePanelProps) {
	const { prefersReducedMotion } = useMotionPreference();
	const [today] = React.useState(() => startOfDay(new Date()));
	const [date, setDate] = React.useState(() => (defaultDate ? startOfDay(new Date(defaultDate)) : today));
	// Which way the calendar glides: forward (1) from the right, back (-1) from the left.
	const [direction, setDirection] = React.useState<1 | -1>(1);
	const [view, setView] = React.useState<ScheduleView>(defaultView);
	const [tab, setTab] = React.useState<ScheduleTab>(defaultTab);
	const [hiddenKinds, setHiddenKinds] = React.useState<ReadonlySet<ScheduleShiftKind>>(new Set());
	const [hiddenHospitals, setHiddenHospitals] = React.useState<ReadonlySet<string>>(new Set());
	// What the clinician did here, over the data, until the app sends the updated schedule back.
	const [statuses, setStatuses] = React.useState<Record<string, ScheduleShiftStatus>>({});
	const [cancelled, setCancelled] = React.useState<ReadonlySet<string>>(new Set());
	const [requested, setRequested] = React.useState<ReadonlySet<string>>(new Set());

	const mine = React.useMemo(
		() =>
			shifts
				.filter((shift) => !cancelled.has(shift.id))
				.map((shift) => parseShift({ ...shift, status: statuses[shift.id] ?? shift.status })),
		[shifts, statuses, cancelled],
	);
	const open = React.useMemo(
		() => openShifts.map((shift) => parseShift(shift, true)).filter((shift) => shift.endDate >= today),
		[openShifts, today],
	);
	const openCount = open.filter((shift) => !requested.has(shift.id)).length;

	const source = tab === "mine" ? mine : open;
	const visible = source
		.filter((shift) => !hiddenKinds.has(shift.kind))
		// Time off covers no hospital, so the hospital filter leaves it.
		.filter((shift) => !shift.hospitalIds.length || shift.hospitalIds.some((id) => !hiddenHospitals.has(id)))
		.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

	// The month on screen in numbers: the clinician's shifts in it (time off aside) and their hours.
	const monthShifts = mine.filter(
		(shift) =>
			shift.kind !== "time-off" &&
			shift.startDate.getFullYear() === date.getFullYear() &&
			shift.startDate.getMonth() === date.getMonth(),
	);
	const monthHours = monthShifts.reduce((total, shift) => total + shiftHours(shift), 0);

	const goTo = (next: Date) => {
		setDirection(next < date ? -1 : 1);
		setDate(startOfDay(next));
	};

	const handleAction = (shift: ParsedShift, action: ScheduleShiftAction) => {
		if (action === "pick-up") setRequested((ids) => new Set(ids).add(shift.id));
		else if (action === "cancel") setCancelled((ids) => new Set(ids).add(shift.id));
		else setStatuses((current) => ({ ...current, [shift.id]: action === "swap" ? "swap-requested" : "offered" }));
		onShiftAction?.(shift.id, action);
	};

	const toggle = <T,>(set: ReadonlySet<T>, value: T, shown: boolean) => {
		const next = new Set(set);
		if (shown) next.delete(value);
		else next.add(value);
		return next;
	};

	const zone = timeZoneName();
	const viewProps = { shifts: visible, hospitals, requestedIds: requested, onAction: handleAction, today };

	return (
		<>
			{/* My shifts and Open shifts, right under the header, as the Patients page's hospital bar. */}
			<div className='flex items-center justify-between gap-6 border-b border-border pr-6 pl-4'>
				<Tabs value={tab} onValueChange={(value) => setTab(value as ScheduleTab)} className='-mb-px min-w-0'>
					<TabsList variant='line' size='lg' aria-label='Schedule'>
						<TabsTrigger value='mine'>My shifts</TabsTrigger>
						<TabsTrigger value='open' aria-label={`Open shifts, ${openCount} you can take`}>
							Open shifts
							{openCount ? <Counter variant='secondary' count={openCount} /> : null}
						</TabsTrigger>
					</TabsList>
				</Tabs>
				{zone ? (
					<Typography size='sm' className='shrink-0 text-muted-foreground'>
						Times in {zone}
					</Typography>
				) : null}
			</div>

			{/* The page fills the canvas to the bottom of the screen: the calendar stretches, and the rail and the calendar
			    each scroll on their own when the screen is too short. The row is positioned over a `flex-1` box, so its
			    content (a week's 24 hours) never makes the canvas taller and the hours scroll inside the calendar instead of
			    the page (DESIGN.md "Schedule fills the screen"). */}
			<div className='relative flex-1'>
				<div className='absolute inset-0 flex'>
					{/* The rail: jump to a day, and what the calendar shows. From lg up; below, the toolbar is enough. */}
					<aside
						aria-label='Calendar options'
						className='hidden w-72 shrink-0 flex-col gap-6 overflow-y-auto border-r border-border p-6 lg:flex'
					>
						<MiniCalendar selected={date} onSelect={goTo} shifts={visible} today={today} />
						<Separator />

						<fieldset className='flex flex-col gap-3'>
							<legend className='mb-3 text-sm font-semibold'>Shift types</legend>
							{shiftKindOrder.map((kind) => (
								<FilterOption
									key={kind}
									label={shiftKinds[kind].label}
									swatch={shiftKinds[kind].swatch}
									checked={!hiddenKinds.has(kind)}
									onCheckedChange={(shown) => setHiddenKinds((set) => toggle(set, kind, shown))}
								/>
							))}
						</fieldset>
						<Separator />
						<fieldset className='flex flex-col gap-3'>
							<legend className='mb-3 text-sm font-semibold'>Hospitals</legend>
							{[...hospitals]
								.sort((a, b) => a.name.localeCompare(b.name))
								.map((hospital) => (
									<FilterOption
										key={hospital.id}
										label={hospital.name}
										checked={!hiddenHospitals.has(hospital.id)}
										onCheckedChange={(shown) => setHiddenHospitals((set) => toggle(set, hospital.id, shown))}
									/>
								))}
						</fieldset>

						<div className='flex flex-col gap-1 rounded-lg bg-background-subtle p-4'>
							<Typography size='sm' className='text-muted-foreground'>
								Your {date.toLocaleDateString("en-US", { month: "long" })}
							</Typography>
							<Typography size='base' weight='semibold'>
								{monthShifts.length} {monthShifts.length === 1 ? "shift" : "shifts"} · {monthHours} h
							</Typography>
						</div>
					</aside>

					<main className='flex min-h-0 min-w-0 flex-1 flex-col gap-6 overflow-y-auto p-6'>
						<div className='flex flex-wrap items-center gap-2'>
							<Typography as='h1' size='2xl' weight='bold' aria-live='polite' className='mr-2'>
								{periodTitle(view, date)}
							</Typography>
							<div className='flex items-center gap-2'>
								<Button
									variant='outline'
									size='icon-md'
									aria-label={`Previous ${view}`}
									onClick={() => goTo(stepPeriod(view, date, -1))}
								>
									<ChevronLeftIcon />
								</Button>
								<Button
									variant='outline'
									size='icon-md'
									aria-label={`Next ${view}`}
									onClick={() => goTo(stepPeriod(view, date, 1))}
								>
									<ChevronRightIcon />
								</Button>
								<Button variant='outline' onClick={() => goTo(today)}>
									Today
								</Button>
							</div>
							<div className='ml-auto flex items-center gap-2'>
								<Tabs value={view} onValueChange={(value) => setView(value as ScheduleView)}>
									<TabsList aria-label='View'>
										{(Object.keys(viewLabels) as ScheduleView[]).map((key) => (
											<TabsTrigger key={key} value={key}>
												{viewLabels[key]}
											</TabsTrigger>
										))}
									</TabsList>
								</Tabs>
								{onNewRequest ? (
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button>
												<PlusIcon />
												New request
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align='end'>
											{requestKinds.map(({ kind, label, icon: Icon }) => (
												<DropdownMenuItem key={kind} onSelect={() => onNewRequest(kind)}>
													<Icon />
													{label}
												</DropdownMenuItem>
											))}
										</DropdownMenuContent>
									</DropdownMenu>
								) : null}
							</div>
						</div>

						{tab === "open" ? (
							<Typography size='sm' className='-mt-3 text-muted-foreground'>
								Only shifts you can take: licensed in the state, privileged at the hospital and credentials current.
							</Typography>
						) : null}

						{/* Each period glides in from the side it's in (Glide); a fade under reduced motion. Clipped sideways only, so
						    the calendar keeps its minimum height and the page scrolls below it on a short screen. */}
						<div className={cn("relative flex flex-1 flex-col overflow-x-clip", view === "month" ? "min-h-[36rem]" : "min-h-96")}>
							<AnimatePresence mode='popLayout' initial={false} custom={direction}>
								<motion.div
									key={periodKey(view, date)}
									custom={direction}
									variants={prefersReducedMotion ? fadeVariants : slideVariants}
									initial='initial'
									animate='animate'
									exit='exit'
									className='flex min-h-0 flex-1 flex-col'
								>
									{view === "month" ? (
										<MonthView
											{...viewProps}
											month={date}
											onOpenDay={(day) => {
												goTo(day);
												setView("day");
											}}
										/>
									) : (
										<TimeGridView
											{...viewProps}
											days={
												view === "week"
													? Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(date), index))
													: [date]
											}
										/>
									)}
								</motion.div>
							</AnimatePresence>
						</div>
						{tab === "open" && !open.length ? (
							<Typography size='sm' className='text-center text-muted-foreground'>
								No open shifts you can take right now.
							</Typography>
						) : null}
					</main>
				</div>
			</div>
		</>
	);
}

/** The rail's rule between its sections (a fieldset's own border would run through its legend). */
function Separator() {
	return <hr className='border-border' />;
}

/** One of the rail's filters: a checkbox, an optional color swatch, the label. */
function FilterOption({
	label,
	swatch,
	checked,
	onCheckedChange,
}: {
	label: string;
	swatch?: string;
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
}) {
	const id = React.useId();
	return (
		<div className='flex items-center gap-2'>
			<Checkbox id={id} checked={checked} onCheckedChange={(value) => onCheckedChange(value === true)} />
			<label htmlFor={id} className='flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm'>
				<span className='truncate'>{label}</span>
				{swatch ? <span className={cn("ml-auto size-2.5 shrink-0 rounded-full", swatch)} aria-hidden /> : null}
			</label>
		</div>
	);
}

export {
	SchedulePanel,
	type ScheduleRequestKind,
	type ScheduleShift,
	type ScheduleShiftAction,
	type ScheduleShiftKind,
	type ScheduleShiftStatus,
	type SchedulePanelProps,
	type ScheduleTab,
	type ScheduleView,
};
