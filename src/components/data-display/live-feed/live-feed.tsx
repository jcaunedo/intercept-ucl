import * as React from "react";
import {
	BellRingIcon,
	CircleCheckIcon,
	FileTextIcon,
	FlaskConicalIcon,
	ListFilterIcon,
	type LucideIcon,
	StethoscopeIcon,
	SyringeIcon,
	WindIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@/components/buttons/button";
import { Avatar, AvatarFallback, AvatarImage, type AvatarFallbackProps } from "@/components/data-display/avatar";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/overlays/dropdown-menu";
import { useCurrentMinute } from "@/lib/hooks/use-current-minute";
import { revealVariants, useMotionPreference } from "@/lib/motion";
import { formatDayLabel } from "@/lib/relative-date";
import { cn } from "@/lib/utils";

/** What a line is: an alert as it fired, a change of an alert's status, or something done or measured. */
type LiveFeedKind = "alert" | "alert-status" | "care" | "drip" | "ventilator" | "lab" | "note";

type LiveFeedSeverity = "critical" | "high" | "medium" | "low";

/** Who a line is about, outside a patient's own page: as the chat's patient rows show them. */
type LiveFeedPatient = {
	/** "Miller, Sarah". */
	name: string;
	/** Where they are, in grey under the name: "Sidney Regional · MICU Bed 11". */
	detail?: string;
	photo?: string;
	initials?: string;
	tone?: AvatarFallbackProps["tone"];
};

type LiveFeedEntry = {
	id: string;
	/** When it happened, ISO 8601. */
	at: string;
	kind: LiveFeedKind;
	/** What happened, e.g. "Critical alert: Sepsis candidate", "Norepinephrine up to 0.22 mcg/kg/min". */
	title: string;
	/** A second line in grey: the reason, who did it, a note. */
	detail?: string;
	/** An alert's severity: its bell takes the severity's color and its line is medium weight. */
	severity?: LiveFeedSeverity;
	/** A resolution: a green check in place of the icon. */
	resolved?: boolean;
	/** Who it's about. Leave it out on a patient's own page. */
	patient?: LiveFeedPatient;
	/** Makes the line a button, e.g. to open the alert or the patient. */
	onSelect?: () => void;
};

type LiveFeedProps = Omit<React.ComponentProps<"div">, "children"> & {
	entries: LiveFeedEntry[];
	/** The log's name for screen readers. Defaults to "Live feed". */
	label?: string;
	/** The kinds left out, from `LiveFeedFilter` (e.g. `["drips", "labs"]`). Everything shows without it. */
	hiddenKinds?: LiveFeedFilterId[];
	/** What an empty log says. */
	emptyText?: string;
};

const kindIcons: Record<LiveFeedKind, LucideIcon> = {
	alert: BellRingIcon,
	"alert-status": BellRingIcon,
	care: StethoscopeIcon,
	drip: SyringeIcon,
	ventilator: WindIcon,
	lab: FlaskConicalIcon,
	note: FileTextIcon,
};

// Read before a line's text, so a screen reader knows what it is.
const kindLabels: Record<LiveFeedKind, string> = {
	alert: "Alert",
	"alert-status": "Alert",
	care: "Care event",
	drip: "Drip change",
	ventilator: "Ventilator change",
	lab: "Lab result",
	note: "Note",
};

/** A filter of `LiveFeedFilter`: an alert and its status changes are one ("alerts"). */
type LiveFeedFilterId = "alerts" | "care" | "drips" | "ventilator" | "labs" | "notes";

// The filters, in the menu's order.
const filters: { id: LiveFeedFilterId; label: string; kinds: LiveFeedKind[] }[] = [
	{ id: "alerts", label: "Alerts", kinds: ["alert", "alert-status"] },
	{ id: "care", label: "Care", kinds: ["care"] },
	{ id: "drips", label: "Drips", kinds: ["drip"] },
	{ id: "ventilator", label: "Ventilator", kinds: ["ventilator"] },
	{ id: "labs", label: "Labs", kinds: ["lab"] },
	{ id: "notes", label: "Notes", kinds: ["note"] },
];

const severityClassNames: Record<LiveFeedSeverity, string> = {
	critical: "text-severity-critical",
	high: "text-severity-high",
	medium: "text-severity-medium",
	low: "text-severity-low",
};

const formatTime = (iso: string) => new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(iso));

/** "Today", "Yesterday", or "Saturday, Nov 7" (the shared day heading). */
const dayLabel = (at: string, now: number | null) => formatDayLabel(at, now ?? Date.now());

/** The line's icon: a green check for a resolution, a bell in the severity's color for an alert, else its kind's. */
function EntryIcon({ entry }: { entry: LiveFeedEntry }) {
	const Icon = entry.resolved ? CircleCheckIcon : kindIcons[entry.kind];
	return (
		<Icon
			aria-hidden='true'
			className={cn(
				"size-4 shrink-0",
				entry.resolved ? "text-success" : entry.severity ? severityClassNames[entry.severity] : "text-icon-muted",
			)}
		/>
	);
}

/** What happened: the title (medium for an alert as it fired) and its detail in grey. */
function EntryText({ entry }: { entry: LiveFeedEntry }) {
	return (
		<span className='min-w-0 flex-1'>
			<span className='sr-only'>{kindLabels[entry.kind]}: </span>
			<span className={cn("block text-sm text-foreground", entry.kind === "alert" && "font-medium")}>{entry.title}</span>
			{entry.detail ? <span className='block text-xs text-muted-foreground'>{entry.detail}</span> : null}
		</span>
	);
}

const timeClassName = "shrink-0 text-xs text-muted-foreground tabular-nums";

function EntryBody({ entry }: { entry: LiveFeedEntry }) {
	const time = (
		<time dateTime={entry.at} className={cn(timeClassName, !entry.patient && "w-14 pt-px")}>
			{formatTime(entry.at)}
		</time>
	);
	if (!entry.patient) {
		// On a patient's own page: the time, the icon, what happened.
		return (
			<span className='flex w-full gap-2'>
				{time}
				<span className='flex h-5 shrink-0 items-center'>
					<EntryIcon entry={entry} />
				</span>
				<EntryText entry={entry} />
			</span>
		);
	}
	// Everyone's feed: who, as the chat's patient rows (avatar centered on the name and where they are), the time on the
	// right; then what happened under the name, after its icon.
	const { patient } = entry;
	return (
		<span className='flex w-full flex-col gap-1'>
			<span className='flex items-center gap-2'>
				<Avatar size='sm' className='shrink-0'>
					{patient.photo ? <AvatarImage src={patient.photo} alt='' /> : null}
					<AvatarFallback tone={patient.tone}>{patient.initials}</AvatarFallback>
				</Avatar>
				<span className='min-w-0 flex-1'>
					<span className='block truncate text-sm font-semibold text-foreground'>{patient.name}</span>
					{patient.detail ? <span className='block truncate text-xs text-muted-foreground'>{patient.detail}</span> : null}
				</span>
				{time}
			</span>
			<span className='flex gap-2 pl-10'>
				<span className='flex h-5 shrink-0 items-center'>
					<EntryIcon entry={entry} />
				</span>
				<EntryText entry={entry} />
			</span>
		</span>
	);
}

/**
 * A live log of what happens: newest first, by day ("Today", "Yesterday", "Saturday, Nov 7"), each line its time, an
 * icon for what it is (an alert's bell in its severity's color, a green check for a resolution) and what happened.
 * With a `patient`, a line starts with who it's about, as the chat's patient rows. `hiddenKinds` leaves kinds out (pair it
 * with `LiveFeedFilter` in the panel's header). A line that arrives while it's on screen grows in (Reveal); `onSelect`
 * makes a line a button.
 */
function LiveFeed({
	entries,
	label = "Live feed",
	hiddenKinds = [],
	emptyText = "Nothing has happened yet.",
	className,
	...props
}: LiveFeedProps) {
	const now = useCurrentMinute();
	const { prefersReducedMotion } = useMotionPreference();
	const sorted = React.useMemo(() => [...entries].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)), [entries]);
	const left = new Set(filters.filter((filter) => hiddenKinds.includes(filter.id)).flatMap((filter) => filter.kinds));
	const shown = sorted.filter((entry) => !left.has(entry.kind));

	const days: { label: string; entries: LiveFeedEntry[] }[] = [];
	for (const entry of shown) {
		const day = dayLabel(entry.at, now);
		const last = days.at(-1);
		if (last?.label === day) last.entries.push(entry);
		else days.push({ label: day, entries: [entry] });
	}
	const idPrefix = React.useId();

	return (
		<div data-slot='live-feed' className={cn("flex flex-col gap-4", className)} {...props}>
			{shown.length ? (
				<div role='log' aria-label={label} className='flex flex-col gap-5'>
					{days.map((day) => (
						<section key={day.label} aria-labelledby={`${idPrefix}-${day.label}`} className='flex flex-col gap-1'>
							<h3 id={`${idPrefix}-${day.label}`} className='text-sm font-semibold text-foreground'>
								{day.label}
							</h3>
							<ul className='flex flex-col'>
								<AnimatePresence initial={false}>
									{day.entries.map((entry) => (
										<motion.li
											key={entry.id}
											variants={prefersReducedMotion ? undefined : revealVariants}
											initial='initial'
											animate='animate'
											className='border-b border-border last:border-b-0'
										>
											{entry.onSelect ? (
												<button
													type='button'
													onClick={entry.onSelect}
													className='flex w-full cursor-pointer rounded-md px-1 py-2 text-left outline-none transition-colors duration-160 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none'
												>
													<EntryBody entry={entry} />
												</button>
											) : (
												<div className='flex px-1 py-2'>
													<EntryBody entry={entry} />
												</div>
											)}
										</motion.li>
									))}
								</AnimatePresence>
							</ul>
						</section>
					))}
				</div>
			) : (
				<p className='text-sm text-muted-foreground'>{entries.length ? "Nothing matches these filters." : emptyText}</p>
			)}
		</div>
	);
}

/**
 * The Live feed's filter, for the panel's header, left of its ×: a ghost `list-filter` button, on the hover fill while a
 * filter is on, opening a menu as the Messages panel's does: "Show", a checkbox per kind the log has (all checked at
 * first), then Show all while anything is left out. The menu stays open while boxes are ticked. Pass `value` to
 * LiveFeed's `hiddenKinds`.
 */
function LiveFeedFilter({
	entries,
	value,
	onValueChange,
	label = "Filter live feed",
	size = "icon-md",
	className,
}: {
	/** The log's lines: only kinds it has get a box. */
	entries: LiveFeedEntry[];
	/** The kinds left out. */
	value: LiveFeedFilterId[];
	onValueChange: (value: LiveFeedFilterId[]) => void;
	/** The button's name. Defaults to "Filter live feed"; ", filtered" follows it while a filter is on. */
	label?: string;
	/** The button's size, to match the × beside it. */
	size?: "icon-sm" | "icon-md";
	className?: string;
}) {
	const available = filters.filter((filter) => entries.some((entry) => filter.kinds.includes(entry.kind)));
	const filtered = available.some((filter) => value.includes(filter.id));
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant='ghost'
					size={size}
					aria-label={filtered ? `${label}, filtered` : label}
					className={cn(filtered && "bg-accent", className)}
				>
					<ListFilterIcon aria-hidden='true' />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='end'>
				<DropdownMenuLabel>Show</DropdownMenuLabel>
				{available.map((filter) => (
					<DropdownMenuCheckboxItem
						key={filter.id}
						checked={!value.includes(filter.id)}
						onCheckedChange={(checked) =>
							onValueChange(checked ? value.filter((id) => id !== filter.id) : [...value, filter.id])
						}
						onSelect={(event) => event.preventDefault()}
					>
						{filter.label}
					</DropdownMenuCheckboxItem>
				))}
				{filtered ? (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuItem onSelect={() => onValueChange([])}>Show all</DropdownMenuItem>
					</>
				) : null}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export {
	LiveFeed,
	LiveFeedFilter,
	type LiveFeedFilterId,
	type LiveFeedEntry,
	type LiveFeedKind,
	type LiveFeedPatient,
	type LiveFeedProps,
	type LiveFeedSeverity,
};
