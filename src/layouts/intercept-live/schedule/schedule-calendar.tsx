import * as React from "react";
import {
	ArrowLeftRightIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	MoonIcon,
	PalmtreeIcon,
	PhoneIcon,
	SunIcon,
	type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/data-display/badge";
import { Button } from "@/components/buttons/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/overlays/popover";
import { Typography } from "@/components/typography/typography";
import { useCurrentMinute } from "@/lib/hooks/use-current-minute";
import { cn } from "@/lib/utils";

import type { PanelHospital } from "../shared/patient-panel";

/* -------------------------------------------------------------------------- */
/* Data                                                                       */
/* -------------------------------------------------------------------------- */

/** What a block of time on the schedule is. */
type ScheduleShiftKind = "day" | "night" | "on-call" | "time-off";

/**
 * Where a shift or request stands: `published` (on the schedule), `draft` (the coordinator's, past the published
 * horizon; can still change), `swap-requested` (offered to a colleague), `offered` (given away, waiting for someone to
 * pick it up), and for time off `pending` / `approved`.
 */
type ScheduleShiftStatus = "published" | "draft" | "swap-requested" | "offered" | "pending" | "approved";

/** One shift, on-call block or time off, in the clinician's schedule or open for them to take. */
type ScheduleShift = {
	id: string;
	kind: ScheduleShiftKind;
	/** ISO date-times. A night shift ends the next morning; time off runs from midnight to midnight. */
	start: string;
	end: string;
	/** The hospitals the shift covers (one shift often covers several). None for time off. */
	hospitalIds: string[];
	/** The clinician's role on it, e.g. "Tele-ICU intensivist". */
	role?: string;
	/** The hub's call queues the clinician is in during the shift. */
	callQueues?: string[];
	status?: ScheduleShiftStatus;
	/** A line under the details (why it's open, who a swap went to, a time-off reason). */
	note?: string;
};

/** What the clinician can do from a shift's details. */
type ScheduleShiftAction = "swap" | "give-away" | "cancel" | "pick-up";

/* -------------------------------------------------------------------------- */
/* Product content                                                            */
/* -------------------------------------------------------------------------- */

// Each kind's words, icon and color (Badge's category tones), the same in the legend, the month's chips and the
// week's blocks.
const shiftKinds: Record<
	ScheduleShiftKind,
	{ label: string; short: string; icon: LucideIcon; chip: string; swatch: string; border: string }
> = {
	day: {
		label: "Day shift",
		short: "Day",
		icon: SunIcon,
		chip: "bg-badge-yellow text-badge-yellow-foreground",
		swatch: "bg-badge-yellow-foreground",
		border: "border-badge-yellow-foreground",
	},
	night: {
		label: "Night shift",
		short: "Night",
		icon: MoonIcon,
		chip: "bg-badge-purple text-badge-purple-foreground",
		swatch: "bg-badge-purple-foreground",
		border: "border-badge-purple-foreground",
	},
	"on-call": {
		label: "On call",
		short: "On call",
		icon: PhoneIcon,
		chip: "bg-badge-blue text-badge-blue-foreground",
		swatch: "bg-badge-blue-foreground",
		border: "border-badge-blue-foreground",
	},
	"time-off": {
		label: "Time off",
		short: "Time off",
		icon: PalmtreeIcon,
		chip: "bg-badge-green text-badge-green-foreground",
		swatch: "bg-badge-green-foreground",
		border: "border-badge-green-foreground",
	},
};

const shiftKindOrder: ScheduleShiftKind[] = ["day", "night", "on-call", "time-off"];

const statusLabels: Partial<Record<ScheduleShiftStatus, string>> = {
	draft: "Draft",
	"swap-requested": "Swap requested",
	offered: "Given away",
	pending: "Pending approval",
	approved: "Approved",
};

const weekdayLetters = ["S", "M", "T", "W", "T", "F", "S"];

/* -------------------------------------------------------------------------- */
/* Dates                                                                      */
/* -------------------------------------------------------------------------- */

const HOUR = 3_600_000;

function startOfDay(date: Date) {
	const day = new Date(date);
	day.setHours(0, 0, 0, 0);
	return day;
}

function addDays(date: Date, days: number) {
	const next = new Date(date);
	next.setDate(next.getDate() + days);
	return next;
}

/** The same day `months` later, or the month's last day when it's shorter. */
function addMonths(date: Date, months: number) {
	const first = new Date(date.getFullYear(), date.getMonth() + months, 1);
	const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
	first.setDate(Math.min(date.getDate(), last));
	return first;
}

function startOfWeek(date: Date) {
	return addDays(startOfDay(date), -date.getDay());
}

function isSameDay(a: Date, b: Date) {
	return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** The weeks shown for a month: Sunday to Saturday, from the week of the 1st to the week of the last day. */
function monthWeeks(month: Date) {
	const first = new Date(month.getFullYear(), month.getMonth(), 1);
	const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
	const weeks: Date[][] = [];
	for (let start = startOfWeek(first); start <= last; start = addDays(start, 7)) {
		weeks.push(Array.from({ length: 7 }, (_, index) => addDays(start, index)));
	}
	return weeks;
}

/** "8 AM", "8:30 PM". */
function formatTime(date: Date) {
	return date.toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: date.getMinutes() ? "2-digit" : undefined,
	});
}

/** "Tue, Nov 17". */
function formatDay(date: Date) {
	return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

/** A shift with its dates parsed, as every view reads it. */
type ParsedShift = ScheduleShift & { startDate: Date; endDate: Date; open?: boolean };

function parseShift(shift: ScheduleShift, open?: boolean): ParsedShift {
	return { ...shift, startDate: new Date(shift.start), endDate: new Date(shift.end), open };
}

/**
 * Whether a shift shows on a day of the month view: on the day it starts, and time off on every day it covers. A night
 * shift belongs to the evening it starts on, not the morning it ends.
 */
function showsOnDay(shift: ParsedShift, day: Date) {
	if (shift.kind !== "time-off") return isSameDay(shift.startDate, day);
	const dayStart = startOfDay(day);
	return shift.startDate < addDays(dayStart, 1) && shift.endDate > dayStart;
}

/** A shift on its way to someone else: a swap asked for, or given away. */
function isHandedOff(shift: ScheduleShift) {
	return shift.status === "swap-requested" || shift.status === "offered";
}

function shiftHours(shift: ParsedShift) {
	return Math.round((shift.endDate.getTime() - shift.startDate.getTime()) / HOUR);
}

/** "8 AM – 8 PM (12 h)", or the days for time off ("Sat, Dec 5 – Mon, Dec 7"). */
function shiftWhen(shift: ParsedShift) {
	if (shift.kind === "time-off") {
		const lastDay = addDays(shift.endDate, -1);
		return isSameDay(shift.startDate, lastDay)
			? `${formatDay(shift.startDate)}, all day`
			: `${formatDay(shift.startDate)} – ${formatDay(lastDay)}`;
	}
	return `${formatDay(shift.startDate)} · ${formatTime(shift.startDate)} – ${formatTime(shift.endDate)} (${shiftHours(shift)} h)`;
}

/** The chip's or block's accessible name: what, when, and where it stands. */
function shiftLabel(shift: ParsedShift) {
	const status = shift.open ? "Open shift" : shift.status && statusLabels[shift.status];
	return [shiftKinds[shift.kind].label, shiftWhen(shift), status].filter(Boolean).join(", ");
}

/* -------------------------------------------------------------------------- */
/* Shift details                                                              */
/* -------------------------------------------------------------------------- */

type ShiftDetailsProps = {
	shift: ParsedShift;
	hospitals: PanelHospital[];
	/** Open shifts the clinician asked for, waiting on the coordinator. */
	requested?: boolean;
	onAction?: (shift: ParsedShift, action: ScheduleShiftAction) => void;
	children: React.ReactElement;
};

/** A shift's chip or block, which opens its details in a Popover: when, where, the call queues, and what can be done. */
function ShiftDetails({ shift, hospitals, requested, onAction, children }: ShiftDetailsProps) {
	const [open, setOpen] = React.useState(false);
	const kind = shiftKinds[shift.kind];
	const Icon = kind.icon;
	const past = shift.endDate.getTime() < Date.now();
	const covered = hospitals.filter((hospital) => shift.hospitalIds.includes(hospital.id));
	const status = shift.open ? (requested ? "Requested" : "Open") : shift.status && statusLabels[shift.status];

	const act = (action: ScheduleShiftAction) => {
		onAction?.(shift, action);
		setOpen(false);
	};

	// What can be done depends on whose shift it is and where it stands. Nothing on a shift that's over.
	let actions: React.ReactNode = null;
	if (!past && onAction) {
		if (shift.open) {
			actions = (
				<Button size='sm' className='w-full' disabled={requested} onClick={() => act("pick-up")}>
					{requested ? "Requested, waiting for approval" : "Request this shift"}
				</Button>
			);
		} else if (shift.kind === "time-off") {
			actions =
				shift.status === "pending" ? (
					<Button variant='outline' size='sm' className='w-full' onClick={() => act("cancel")}>
						Cancel request
					</Button>
				) : null;
		} else if (!isHandedOff(shift)) {
			actions = (
				<div className='grid grid-cols-2 gap-2'>
					<Button variant='outline' size='sm' onClick={() => act("swap")}>
						Request swap
					</Button>
					<Button variant='outline' size='sm' onClick={() => act("give-away")}>
						Give away
					</Button>
				</div>
			);
		}
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>{children}</PopoverTrigger>
			<PopoverContent align='start' className='flex w-80 flex-col gap-4'>
				<div className='flex items-start gap-3'>
					<span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", kind.chip)}>
						<Icon className='size-4' aria-hidden />
					</span>
					<div className='flex min-w-0 flex-1 flex-col'>
						<div className='flex items-center gap-2'>
							<Typography as='h3' size='base' weight='semibold'>
								{shift.open ? `Open ${kind.label.toLowerCase()}` : kind.label}
							</Typography>
							{status ? (
								<Badge variant='secondary' size='xs'>
									{status}
								</Badge>
							) : null}
						</div>
						<Typography size='sm' className='text-muted-foreground'>
							{shiftWhen(shift)}
						</Typography>
					</div>
				</div>
				{shift.kind !== "time-off" ? (
					<dl className='grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm'>
						{shift.role ? (
							<>
								<dt className='text-muted-foreground'>Role</dt>
								<dd>{shift.role}</dd>
							</>
						) : null}
						<dt className='text-muted-foreground'>Hospitals</dt>
						<dd className='flex flex-col'>
							{covered.length ? covered.map((hospital) => <span key={hospital.id}>{hospital.name}</span>) : "None"}
						</dd>
						{shift.callQueues?.length ? (
							<>
								<dt className='text-muted-foreground'>Call queues</dt>
								<dd>{shift.callQueues.join(", ")}</dd>
							</>
						) : null}
					</dl>
				) : null}
				{shift.note ? <Typography size='sm'>{shift.note}</Typography> : null}
				{actions}
			</PopoverContent>
		</Popover>
	);
}

/** The chip a shift shows as in the month view. */
function ShiftChip({ shift, ...props }: { shift: ParsedShift } & React.ComponentProps<"button">) {
	const kind = shiftKinds[shift.kind];
	const Icon = kind.icon;
	return (
		<button
			type='button'
			aria-label={shiftLabel(shift)}
			className={cn(
				"flex h-6 w-full min-w-0 items-center gap-1.5 rounded-md px-1.5 text-left text-xs font-medium transition-[filter] hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
				kind.chip,
				// A draft and an open shift are dashed: not settled yet, or not the clinician's yet.
				(shift.status === "draft" || shift.open) && cn("border border-dashed", kind.border),
				shift.open && "bg-transparent",
			)}
			{...props}
		>
			<Icon className='size-3 shrink-0' aria-hidden />
			<span className='truncate'>
				{shift.kind === "time-off" ? kind.short : `${formatTime(shift.startDate)} ${kind.short}`}
			</span>
			{isHandedOff(shift) ? <ArrowLeftRightIcon className='ml-auto size-3 shrink-0' aria-hidden /> : null}
		</button>
	);
}

/* -------------------------------------------------------------------------- */
/* Month view                                                                 */
/* -------------------------------------------------------------------------- */

type ViewProps = {
	shifts: ParsedShift[];
	hospitals: PanelHospital[];
	requestedIds: ReadonlySet<string>;
	onAction?: (shift: ParsedShift, action: ScheduleShiftAction) => void;
	today: Date;
};

// A day shows this many chips, then "+n more", which opens the day.
const MAX_CHIPS = 3;

/** The month as a grid of weeks, each day with its shifts as chips. Days outside the month are muted. */
function MonthView({
	month,
	shifts,
	hospitals,
	requestedIds,
	onAction,
	today,
	onOpenDay,
}: ViewProps & { month: Date; onOpenDay: (day: Date) => void }) {
	const weeks = monthWeeks(month);
	return (
		<div className='flex min-h-0 flex-1 flex-col overflow-hidden rounded-card border border-border'>
			<div className='grid grid-cols-7 border-b border-border bg-background-subtle' aria-hidden>
				{weeks[0].map((day) => (
					<div key={day.getDay()} className='px-3 py-2 text-xs font-medium text-muted-foreground'>
						{day.toLocaleDateString("en-US", { weekday: "short" })}
					</div>
				))}
			</div>
			<ol className='grid flex-1 auto-rows-fr grid-cols-7' aria-label={month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}>
				{weeks.flat().map((day, index) => {
					const dayShifts = shifts.filter((shift) => showsOnDay(shift, day));
					const inMonth = day.getMonth() === month.getMonth();
					const isToday = isSameDay(day, today);
					const hidden = dayShifts.length - MAX_CHIPS;
					return (
						<li
							key={day.toISOString()}
							className={cn(
								"flex min-h-0 min-w-0 flex-col gap-1 overflow-hidden border-border p-1.5",
								index % 7 !== 6 && "border-r",
								index < weeks.length * 7 - 7 && "border-b",
								!inMonth && "bg-background-subtle",
							)}
						>
							<button
								type='button'
								onClick={() => onOpenDay(day)}
								aria-label={`${day.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}${isToday ? ", today" : ""}, ${dayShifts.length ? `${dayShifts.length} on the schedule` : "nothing scheduled"}`}
								aria-current={isToday ? "date" : undefined}
								className={cn(
									"flex size-7 items-center justify-center self-start rounded-full text-sm hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
									!inMonth && "text-muted-foreground",
									isToday && "bg-foreground font-semibold text-background hover:bg-foreground",
								)}
							>
								{day.getDate()}
							</button>
							{dayShifts.slice(0, hidden > 0 ? MAX_CHIPS - 1 : MAX_CHIPS).map((shift) => (
								<ShiftDetails
									key={shift.id}
									shift={shift}
									hospitals={hospitals}
									requested={requestedIds.has(shift.id)}
									onAction={onAction}
								>
									<ShiftChip shift={shift} />
								</ShiftDetails>
							))}
							{hidden > 0 ? (
								<button
									type='button'
									onClick={() => onOpenDay(day)}
									className='h-6 rounded-md px-1.5 text-left text-xs font-medium text-muted-foreground hover:bg-accent'
								>
									+{hidden + 1} more
								</button>
							) : null}
						</li>
					);
				})}
			</ol>
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/* Week and day views                                                         */
/* -------------------------------------------------------------------------- */

const HOUR_HEIGHT = 48;
// The grid opens scrolled to just above 6 AM, so its label and a day shift are in view.
const FIRST_HOUR_IN_VIEW = 6;

/**
 * Days as columns on a 24-hour grid (a week, or one day), each shift a block from its start to its end. A night shift
 * runs into the next day's column. Time off sits in the all-day row above the hours.
 */
function TimeGridView({ days, shifts, hospitals, requestedIds, onAction, today }: ViewProps & { days: Date[] }) {
	const scrollRef = React.useRef<HTMLDivElement>(null);
	const now = useCurrentMinute();

	React.useLayoutEffect(() => {
		if (scrollRef.current) scrollRef.current.scrollTop = (FIRST_HOUR_IN_VIEW - 0.5) * HOUR_HEIGHT;
	}, []);

	const columns = `3.5rem repeat(${days.length}, minmax(0, 1fr))`;
	const allDay = shifts.filter((shift) => shift.kind === "time-off");
	const timed = shifts.filter((shift) => shift.kind !== "time-off");

	return (
		<div className='flex min-h-0 flex-1 flex-col overflow-hidden rounded-card border border-border'>
			{/* Day headings and the all-day row stay put while the hours scroll. */}
			<div className='grid border-b border-border bg-background-subtle' style={{ gridTemplateColumns: columns }}>
				<div />
				{days.map((day) => {
					const isToday = isSameDay(day, today);
					return (
						<div key={day.toISOString()} className='flex items-center gap-1.5 border-l border-border px-3 py-2'>
							<span className='text-xs font-medium text-muted-foreground'>
								{day.toLocaleDateString("en-US", { weekday: "short" })}
							</span>
							<span
								aria-current={isToday ? "date" : undefined}
								className={cn(
									"flex size-6 items-center justify-center rounded-full text-sm",
									isToday && "bg-foreground font-semibold text-background",
								)}
							>
								{day.getDate()}
							</span>
						</div>
					);
				})}
				<div className='flex items-center justify-end border-t border-border pr-2 text-[11px] text-muted-foreground'>
					All day
				</div>
				{days.map((day) => (
					<div key={day.toISOString()} className='flex min-h-8 flex-col gap-1 border-t border-l border-border p-1'>
						{allDay
							.filter((shift) => showsOnDay(shift, day))
							.map((shift) => (
								<ShiftDetails
									key={shift.id}
									shift={shift}
									hospitals={hospitals}
									requested={requestedIds.has(shift.id)}
									onAction={onAction}
								>
									<ShiftChip shift={shift} />
								</ShiftDetails>
							))}
					</div>
				))}
			</div>

			<div ref={scrollRef} className='min-h-0 flex-1 overflow-y-auto'>
				<div className='relative grid' style={{ gridTemplateColumns: columns, height: 24 * HOUR_HEIGHT }}>
					{/* Hour labels, each on its line. */}
					<div className='relative' aria-hidden>
						{Array.from({ length: 23 }, (_, index) => index + 1).map((hour) => (
							<span
								key={hour}
								className='absolute right-2 -translate-y-1/2 text-[11px] text-muted-foreground'
								style={{ top: hour * HOUR_HEIGHT }}
							>
								{formatTime(new Date(2000, 0, 1, hour))}
							</span>
						))}
					</div>
					{days.map((day) => {
						const dayStart = startOfDay(day);
						const dayEnd = addDays(dayStart, 1);
						const isToday = isSameDay(day, today);
						return (
							<div
								key={day.toISOString()}
								className='relative border-l border-border bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_47px,var(--color-border)_47px,var(--color-border)_48px)]'
							>
								{timed
									.filter((shift) => shift.startDate < dayEnd && shift.endDate > dayStart)
									.map((shift) => {
										const from = Math.max(shift.startDate.getTime(), dayStart.getTime());
										const to = Math.min(shift.endDate.getTime(), dayEnd.getTime());
										const top = ((from - dayStart.getTime()) / HOUR) * HOUR_HEIGHT;
										const height = ((to - from) / HOUR) * HOUR_HEIGHT;
										const kind = shiftKinds[shift.kind];
										const Icon = kind.icon;
										const continues = shift.startDate < dayStart;
										return (
											<ShiftDetails
												key={shift.id}
												shift={shift}
												hospitals={hospitals}
												requested={requestedIds.has(shift.id)}
												onAction={onAction}
											>
												<button
													type='button'
													aria-label={shiftLabel(shift)}
													className={cn(
														"absolute inset-x-1 flex flex-col gap-0.5 overflow-hidden rounded-md border-l-2 px-2 py-1 text-left text-xs transition-[filter] hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
														kind.chip,
														kind.border,
														(shift.status === "draft" || shift.open) && "border border-l-2 border-dashed",
														shift.open && "bg-background",
													)}
													style={{ top: top + 1, height: height - 2 }}
												>
													<span className='flex items-center gap-1 font-semibold'>
														<Icon className='size-3 shrink-0' aria-hidden />
														<span className='truncate'>
															{shift.open ? `Open ${kind.short.toLowerCase()}` : kind.label}
															{continues ? " (cont.)" : ""}
														</span>
														{isHandedOff(shift) ? (
															<ArrowLeftRightIcon className='ml-auto size-3 shrink-0' aria-hidden />
														) : null}
													</span>
													<span className='truncate'>
														{formatTime(shift.startDate)} – {formatTime(shift.endDate)}
													</span>
													{height > 3 * HOUR_HEIGHT && shift.callQueues?.length ? (
														<span className='truncate opacity-80'>{shift.callQueues.join(", ")}</span>
													) : null}
												</button>
											</ShiftDetails>
										);
									})}
								{/* Now, on today's column. */}
								{isToday && now !== null ? (
									<div
										className='pointer-events-none absolute inset-x-0 z-10 flex items-center'
										style={{ top: ((now - dayStart.getTime()) / HOUR) * HOUR_HEIGHT }}
										aria-hidden
									>
										<span className='-ml-1 size-2 rounded-full bg-destructive' />
										<span className='h-px flex-1 bg-destructive' />
									</div>
								) : null}
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/* Mini calendar                                                              */
/* -------------------------------------------------------------------------- */

/**
 * A small month to jump to a day, with a dot under each day that has something on the schedule (its first shift's
 * color). Picking a day moves the calendar there.
 */
function MiniCalendar({
	selected,
	onSelect,
	shifts,
	today,
}: {
	selected: Date;
	onSelect: (day: Date) => void;
	shifts: ParsedShift[];
	today: Date;
}) {
	const [month, setMonth] = React.useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1));
	// Follows the calendar when it moves to another month.
	React.useEffect(() => {
		setMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
	}, [selected]);

	const label = month.toLocaleDateString("en-US", { month: "long", year: "numeric" });

	return (
		<div className='flex flex-col gap-2'>
			<div className='flex items-center justify-between'>
				<Typography size='sm' weight='semibold' aria-live='polite'>
					{label}
				</Typography>
				<div className='flex gap-1'>
					<Button variant='ghost' size='icon-xs' aria-label='Previous month' onClick={() => setMonth(addMonths(month, -1))}>
						<ChevronLeftIcon />
					</Button>
					<Button variant='ghost' size='icon-xs' aria-label='Next month' onClick={() => setMonth(addMonths(month, 1))}>
						<ChevronRightIcon />
					</Button>
				</div>
			</div>
			<div className='grid grid-cols-7 text-center'>
				{weekdayLetters.map((letter, index) => (
					<span key={index} className='pb-1 text-[11px] font-medium text-muted-foreground' aria-hidden>
						{letter}
					</span>
				))}
				{monthWeeks(month)
					.flat()
					.map((day) => {
						const first = shifts.find((shift) => showsOnDay(shift, day));
						const inMonth = day.getMonth() === month.getMonth();
						const isSelected = isSameDay(day, selected);
						const isToday = isSameDay(day, today);
						return (
							<button
								key={day.toISOString()}
								type='button'
								onClick={() => onSelect(day)}
								aria-label={day.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
								aria-pressed={isSelected}
								aria-current={isToday ? "date" : undefined}
								className={cn(
									"relative mx-auto flex size-8 items-center justify-center rounded-lg text-xs hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
									!inMonth && "text-muted-foreground",
									isToday && "font-bold text-primary",
									isSelected && "bg-neutral text-neutral-foreground hover:bg-neutral",
								)}
							>
								{day.getDate()}
								{first ? (
									<span
										className={cn("absolute bottom-1 size-1 rounded-full", shiftKinds[first.kind].swatch)}
										aria-hidden
									/>
								) : null}
							</button>
						);
					})}
			</div>
		</div>
	);
}

export {
	MiniCalendar,
	MonthView,
	TimeGridView,
	addDays,
	addMonths,
	isSameDay,
	parseShift,
	shiftHours,
	shiftKindOrder,
	shiftKinds,
	showsOnDay,
	startOfDay,
	startOfWeek,
	type ParsedShift,
	type ScheduleShift,
	type ScheduleShiftAction,
	type ScheduleShiftKind,
	type ScheduleShiftStatus,
};
