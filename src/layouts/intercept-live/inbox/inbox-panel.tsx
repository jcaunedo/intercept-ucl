import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import {
	ArrowUpRightIcon,
	BellRingIcon,
	CheckIcon,
	CloudOffIcon,
	EllipsisIcon,
	FileSignatureIcon,
	HandHelpingIcon,
	InboxIcon,
	PhoneIcon,
	PillIcon,
	type LucideIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/data-display/avatar";
import { Badge, type BadgeProps } from "@/components/data-display/badge";
import { Button } from "@/components/buttons/button";
import { Checkbox } from "@/components/forms/checkbox";
import { Counter } from "@/components/data-display/counter";
import { EmptyState } from "@/components/feedback/empty-state";
import { FilterBar, FilterBarChip, FilterBarControls, FilterBarFilters } from "@/components/forms/filter-bar";
import { SearchInput } from "@/components/forms/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/forms/select";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/overlays/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/data-display/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/navigation/tabs";
import { Typography } from "@/components/typography/typography";
import { useCurrentMinute } from "@/lib/hooks/use-current-minute";
import { expandVariants, fadeVariants, useMotionPreference } from "@/lib/motion";
import { formatRelativeDate } from "@/lib/relative-date";
import { cn } from "@/lib/utils";

import type { TriageAlert, TriageAlertAction, TriageAlertSeverity } from "../monitoring/triage-queue";
import { usePatientNavigation } from "../patient-navigation";
import { patientInitials } from "../shared/patient-avatar";
import { usePatientTones } from "../shared/patient-tones";

/* -------------------------------------------------------------------------- */
/* Data                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * What a work item asks for (Spec §6.21; Left Nav Spec: "alerts to acknowledge, AI Scribe drafts to sign, suggested
 * orders, failed EMR write-backs"), plus items handed over from the last shift and follow-ups after discharge (a nurse
 * phone check the readmission risk scheduled, Scenario 6; PRD Inbox INB-002). Alerts come from the alerts themselves.
 */
type InboxItemKind = "signature" | "order" | "write-back" | "handoff" | "follow-up";

/** One work item that isn't an alert. */
type InboxItem = {
	id: string;
	kind: InboxItemKind;
	/** The patient it's about. */
	patientId?: string;
	/** What to act on: "Video consult note", "Vasopressin 0.03 units/min". */
	title: string;
	/** Why, or where it came from, in a line. */
	detail?: string;
	/** What produced it: "AI Scribe", "Sepsis bundle", "EHR write-back". */
	source?: string;
	/** `high` ranks it with High alerts; `routine` after them. */
	priority?: "high" | "routine";
	/** ISO 8601. */
	receivedAt: string;
	/** When it's due, ISO 8601. Past it, the row says Overdue. */
	dueAt?: string;
	/** New since the clinician last looked. */
	unread?: boolean;
	/** Completed: when, and by whom when it wasn't the signed-in clinician. */
	done?: { at: string; by?: string };
	/**
	 * Who it's for when that isn't the signed-in clinician, e.g. "Ava Brooks, RN (hub tele-RN)": the row says so, and the
	 * team sees it (a follow-up on the hub tele-RN's list).
	 */
	assignee?: string;
	/** The patient page's tab the item opens on, e.g. `"discharge"` (a follow-up). The Overview without it. */
	section?: string;
};

/** What the clinician did to an item from the Inbox. */
type InboxItemAction = "done" | "undo" | "decline";

/** The patient a row names. Census and Monitoring patients both fit. */
type InboxPatient = {
	id: string;
	lastName: string;
	firstName?: string;
	hospital?: string;
	unit?: string;
	room?: string;
	bed?: string;
	photo?: string;
};

type InboxPanelProps = {
	/** Work besides alerts: drafts to sign, suggested orders, failed write-backs, handed-over items. */
	items: InboxItem[];
	/** The layout's alerts, the same as Monitoring's: the active ones are to acknowledge, the rest are done. */
	alerts?: TriageAlert[];
	/** To name each row's patient. */
	patients: InboxPatient[];
	/** Acknowledge from the Inbox, as from the alert itself. */
	onAlertAction?: (alertId: string, action: TriageAlertAction) => void;
	/** An item marked done, declined or undone, for the app to record. */
	onItemAction?: (itemId: string, action: InboxItemAction) => void;
};

/* -------------------------------------------------------------------------- */
/* Product content                                                            */
/* -------------------------------------------------------------------------- */

/** The rows' filter chips, by what the work is. */
type InboxFilter = "alerts" | InboxItemKind;

const filterLabels: Record<InboxFilter, { label: string; icon: LucideIcon }> = {
	alerts: { label: "Alerts", icon: BellRingIcon },
	signature: { label: "To sign", icon: FileSignatureIcon },
	order: { label: "Suggested orders", icon: PillIcon },
	"write-back": { label: "Write-backs", icon: CloudOffIcon },
	handoff: { label: "Handoff", icon: HandHelpingIcon },
	"follow-up": { label: "Follow-ups", icon: PhoneIcon },
};
const filterOrder: InboxFilter[] = ["alerts", "signature", "order", "write-back", "handoff", "follow-up"];

const severityBadges: Record<TriageAlertSeverity, { label: string; variant: BadgeProps["variant"] }> = {
	critical: { label: "Critical alert", variant: "red" },
	high: { label: "High alert", variant: "amber" },
	medium: { label: "Medium alert", variant: "yellow" },
	low: { label: "Low alert", variant: "sky" },
};

const kindBadges: Record<InboxItemKind, { label: string; variant: BadgeProps["variant"] }> = {
	signature: { label: "To sign", variant: "purple" },
	order: { label: "Suggested order", variant: "blue" },
	"write-back": { label: "Write-back failed", variant: "outline" },
	handoff: { label: "Handoff", variant: "green" },
	"follow-up": { label: "Follow-up", variant: "sky" },
};

/** Each item's main action, and what it does. */
const primaryActions: Record<InboxItemKind, { label: string; opens?: boolean }> = {
	signature: { label: "Review", opens: true },
	order: { label: "Accept" },
	"write-back": { label: "Retry" },
	handoff: { label: "Accept" },
	// A follow-up is done where it's recorded (the patient's Discharge section), so its button opens it there.
	"follow-up": { label: "Open", opens: true },
};

type SortBy = "priority" | "newest" | "due";
const sortLabels: Record<SortBy, string> = { priority: "Priority", newest: "Newest", due: "Due soonest" };

/* -------------------------------------------------------------------------- */
/* Rows                                                                       */
/* -------------------------------------------------------------------------- */

/** An alert or an item, as one row of the queue. */
type Row = {
	id: string;
	filter: InboxFilter;
	patientId?: string;
	title: string;
	detail?: string;
	source?: string;
	badge: { label: string; variant: BadgeProps["variant"] };
	/** Lower first: Critical 0, High 1, Medium 2, routine 3, Low 4. */
	rank: number;
	receivedAt: string;
	dueAt?: string;
	unread: boolean;
	done?: { at: string; by?: string };
	alert?: TriageAlert;
	item?: InboxItem;
};

const severityRank: Record<TriageAlertSeverity, number> = { critical: 0, high: 1, medium: 2, low: 4 };

const UNREAD_ALERT_MINUTES = 60;

function alertRow(alert: TriageAlert, now: number): Row {
	const status = alert.status ?? "active";
	// A clinician's concern (Clinician Intuition Alert, Spec §5.6) is an alert from a person: it says so.
	const concern = alert.source.kind === "manual";
	return {
		id: alert.id,
		filter: "alerts",
		patientId: alert.patientId,
		title: alert.title,
		detail: alert.reason ?? alert.recommendation,
		source: concern ? `Concern from ${alert.source.name}` : alert.source.name,
		badge: concern ? { label: "Concern", variant: "sky" } : severityBadges[alert.severity],
		rank: severityRank[alert.severity],
		receivedAt: alert.firedAt,
		dueAt: alert.respondBy,
		unread: status === "active" && now - Date.parse(alert.firedAt) < UNREAD_ALERT_MINUTES * 60_000,
		// Acknowledged, escalated, resolved or declined: nothing left to do here.
		done: status === "active" ? undefined : { at: alert.addressed?.at ?? alert.firedAt, by: alert.addressed?.by },
		alert,
	};
}

function itemRow(item: InboxItem): Row {
	return {
		id: item.id,
		filter: item.kind,
		patientId: item.patientId,
		title: item.title,
		detail: [item.detail, item.assignee && `For ${item.assignee}`].filter(Boolean).join(" · ") || undefined,
		source: item.source,
		badge: kindBadges[item.kind],
		rank: item.priority === "high" ? 1 : 3,
		receivedAt: item.receivedAt,
		dueAt: item.dueAt,
		unread: Boolean(item.unread),
		done: item.done,
		item,
	};
}

const compareRows: Record<SortBy, (a: Row, b: Row) => number> = {
	priority: (a, b) =>
		a.rank - b.rank ||
		Date.parse(a.dueAt ?? "9999") - Date.parse(b.dueAt ?? "9999") ||
		Date.parse(b.receivedAt) - Date.parse(a.receivedAt),
	newest: (a, b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt),
	due: (a, b) =>
		Date.parse(a.dueAt ?? "9999") - Date.parse(b.dueAt ?? "9999") || a.rank - b.rank,
};

/** "Due in 12 min", "Due in 4 h", "Overdue 6 min". */
function dueLabel(dueAt: string, now: number) {
	const minutes = Math.round((Date.parse(dueAt) - now) / 60_000);
	const span = (value: number) => (value >= 90 ? `${Math.round(value / 60)} h` : `${value} min`);
	return minutes < 0 ? { text: `Overdue ${span(-minutes)}`, overdue: true } : { text: `Due in ${span(minutes)}`, overdue: false };
}

const fullName = (patient: InboxPatient) => [patient.firstName, patient.lastName].filter(Boolean).join(" ");
const place = (patient: InboxPatient) =>
	[patient.hospital, patient.unit, patient.bed ?? patient.room].filter(Boolean).join(" · ");

/* -------------------------------------------------------------------------- */
/* Panel                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Intercept Live's Inbox (Left Nav Spec: "one queue: alerts to acknowledge, AI Scribe drafts to sign, suggested orders,
 * failed EMR write-backs"; Spec §6.21 Work Management and Inbox): everything the clinician has to act on, in one table
 * (intercept.ds Inbox table), the most urgent first. Its alerts are the layout's own, so acknowledging one here
 * acknowledges it everywhere. To do and Done; filter by kind, search, sort, and act on several at once. PRD Inbox.
 */
function InboxPanel({ items, alerts = [], patients, onAlertAction, onItemAction }: InboxPanelProps) {
	const navigation = usePatientNavigation();
	const minute = useCurrentMinute();
	const { prefersReducedMotion } = useMotionPreference();
	const now = minute ?? Date.now();
	const [tab, setTab] = React.useState<"todo" | "done">("todo");
	const [query, setQuery] = React.useState("");
	const [filters, setFilters] = React.useState<ReadonlySet<InboxFilter>>(new Set());
	// Unread, the chip before the kinds (Nov 17, 2026, user's call): the new items only, with any kinds picked. To do only.
	const [unreadOnly, setUnreadOnly] = React.useState(false);
	const [sortBy, setSortBy] = React.useState<SortBy>("priority");
	const [selected, setSelected] = React.useState<ReadonlySet<string>>(new Set());
	// What the clinician did here, over the data, until the app sends the items back.
	const [doneHere, setDoneHere] = React.useState<Record<string, string>>({});
	const [undone, setUndone] = React.useState<ReadonlySet<string>>(new Set());
	const [seen, setSeen] = React.useState<ReadonlySet<string>>(new Set());

	// A patient can come from both the census and Monitoring: once each.
	const patientById = React.useMemo(() => new Map(patients.map((patient) => [patient.id, patient])), [patients]);
	const roster = React.useMemo(() => [...patientById.values()], [patientById]);
	// The app's colors (`patient-tones.tsx`), as on the cards.
	const tones = usePatientTones(roster);

	const rows = [...alerts.map((alert) => alertRow(alert, now)), ...items.map(itemRow)].map((row) => {
		const done = undone.has(row.id) ? undefined : doneHere[row.id] ? { at: doneHere[row.id] } : row.done;
		return { ...row, done, unread: row.unread && !seen.has(row.id) && !done };
	});
	const todo = rows.filter((row) => !row.done);
	const done = rows.filter((row) => row.done);
	const criticalCount = todo.filter((row) => row.rank === 0).length;
	const source = tab === "todo" ? todo : done;

	const needle = query.trim().toLowerCase();
	const ofKinds = source.filter((row) => !filters.size || filters.has(row.filter));
	const unreadCount = ofKinds.filter((row) => row.unread).length;
	const shown = ofKinds
		.filter((row) => tab !== "todo" || !unreadOnly || row.unread)
		.filter((row) => {
			if (!needle) return true;
			const patient = row.patientId ? patientById.get(row.patientId) : undefined;
			return [row.title, row.detail, row.source, row.badge.label, patient && fullName(patient), patient?.hospital]
				.join(" ")
				.toLowerCase()
				.includes(needle);
		})
		.sort(tab === "done" ? (a, b) => Date.parse(b.done!.at) - Date.parse(a.done!.at) : compareRows[sortBy]);
	const selectedRows = shown.filter((row) => selected.has(row.id));

	const markDone = (targets: Row[]) => {
		const at = new Date().toISOString();
		for (const row of targets) {
			if (row.alert) onAlertAction?.(row.alert.id, { type: "acknowledge" });
			else onItemAction?.(row.id, "done");
		}
		setDoneHere((current) => ({ ...current, ...Object.fromEntries(targets.map((row) => [row.id, at])) }));
		setUndone((ids) => new Set([...ids].filter((id) => !targets.some((row) => row.id === id))));
		setSelected(new Set());
	};

	const undo = (row: Row) => {
		if (row.alert) onAlertAction?.(row.alert.id, { type: "unacknowledge" });
		else onItemAction?.(row.id, "undo");
		setDoneHere(({ [row.id]: _removed, ...rest }) => rest);
		setUndone((ids) => new Set(ids).add(row.id));
	};

	const open = (row: Row) => {
		setSeen((ids) => new Set(ids).add(row.id));
		if (!row.patientId || !navigation) return;
		if (row.alert) navigation.openAlert(row.patientId, row.alert.id);
		else navigation.openPatient(row.patientId, undefined, row.item?.section ? { section: row.item.section } : undefined);
	};

	const toggleSelected = (id: string, checked: boolean) =>
		setSelected((ids) => {
			const next = new Set(ids);
			if (checked) next.add(id);
			else next.delete(id);
			return next;
		});
	const allSelected = shown.length > 0 && selectedRows.length === shown.length;

	const filterCounts = Object.fromEntries(
		filterOrder.map((filter) => [filter, source.filter((row) => row.filter === filter).length]),
	) as Record<InboxFilter, number>;

	return (
		<>
			{/* To do and Done, right under the header, as the Patients page's hospital bar. */}
			<div className='flex items-center justify-between gap-6 border-b border-border pr-6 pl-4'>
				<Tabs
					value={tab}
					onValueChange={(value) => {
						setTab(value as "todo" | "done");
						setSelected(new Set());
					}}
					className='-mb-px min-w-0'
				>
					<TabsList variant='line' size='lg' aria-label='Inbox'>
						<TabsTrigger
							value='todo'
							aria-label={`To do, ${todo.length} items${criticalCount ? `, ${criticalCount} critical` : ""}`}
						>
							To do
							{todo.length ? (
								// Red while anything critical is waiting (Left Nav Spec: a count that includes critical items).
								<Counter variant={criticalCount ? "critical" : "secondary"} count={todo.length} />
							) : null}
						</TabsTrigger>
						<TabsTrigger value='done'>Done</TabsTrigger>
					</TabsList>
				</Tabs>
				<Typography size='sm' className='hidden shrink-0 text-muted-foreground md:block'>
					What's left goes to the next shift at handoff
				</Typography>
			</div>

			<main className='flex min-w-0 flex-1 flex-col gap-6 p-6'>
				<Typography as='h1' size='2xl' weight='regular' aria-live='polite'>
					{tab === "todo" ? (
						<>
							<span className='font-bold'>
								{todo.length} {todo.length === 1 ? "item" : "items"} to act on
							</span>
							{criticalCount ? <span className='text-severity-critical'> · {criticalCount} critical</span> : null}
						</>
					) : (
						<span className='font-bold'>
							{done.length} done
						</span>
					)}
				</Typography>

				<FilterBar aria-label='Inbox filters'>
					<FilterBarFilters>
						<SearchInput value={query} onValueChange={setQuery} placeholder='Search inbox' />
						{/* The new items, marked by the same dot as their rows. Done has nothing unread, so it's on To do only. */}
						{tab === "todo" ? (
							<FilterBarChip pressed={unreadOnly} onPressedChange={setUnreadOnly} count={unreadCount}>
								<span aria-hidden='true' className='size-2 shrink-0 rounded-full bg-inbox-unread' />
								Unread
							</FilterBarChip>
						) : null}
						{filterOrder.map((filter) => {
							const { label, icon: Icon } = filterLabels[filter];
							return (
								<FilterBarChip
									key={filter}
									pressed={filters.has(filter)}
									onPressedChange={(pressed) =>
										setFilters((current) => {
											const next = new Set(current);
											if (pressed) next.add(filter);
											else next.delete(filter);
											return next;
										})
									}
									count={filterCounts[filter]}
								>
									<Icon />
									{label}
								</FilterBarChip>
							);
						})}
					</FilterBarFilters>
					{tab === "todo" ? (
						<FilterBarControls>
							<Select value={sortBy} onValueChange={(value) => setSortBy(value as SortBy)}>
								<SelectTrigger aria-label='Sort' className='w-40'>
									<SelectValue />
								</SelectTrigger>
								<SelectContent position='popper' align='end'>
									{(Object.keys(sortLabels) as SortBy[]).map((key) => (
										<SelectItem key={key} value={key}>
											{sortLabels[key]}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</FilterBarControls>
					) : null}
				</FilterBar>

				{/* Several at once (Spec §6.21 bulk operations): appears with the first row picked. */}
				<AnimatePresence initial={false}>
					{selectedRows.length ? (
						<motion.div
							key='bulk'
							variants={prefersReducedMotion ? fadeVariants : expandVariants}
							initial='initial'
							animate='animate'
							exit='exit'
							className='overflow-hidden'
						>
							<div
								role='region'
								aria-label='Selected items'
								className='flex items-center gap-3 rounded-lg bg-background-subtle px-4 py-2'
							>
								<Typography size='sm' weight='semibold' className='flex-1'>
									{selectedRows.length} selected
								</Typography>
								<Button variant='outline' size='sm' onClick={() => markDone(selectedRows)}>
									<CheckIcon />
									Mark done
								</Button>
								<Button variant='ghost' size='sm' onClick={() => setSelected(new Set())}>
									Clear
								</Button>
							</div>
						</motion.div>
					) : null}
				</AnimatePresence>

				{/* The space between columns grows with the viewport (Nov 17, 2026, user's call: 3x on a wide screen):
				    `--inbox-gap` stays 24px (the cells' own spacing) up to a 1280px viewport, so Item keeps its room there, then
				    grows with it to 72px at 1920px (`7.5vw - 72px`). Every column after the first starts with it, and the fixed columns are widened by the same extra, so their content keeps its room. */}
				{shown.length ? (
					<Table
						size='lg'
						aria-label={tab === "todo" ? "To do" : "Done"}
						className='min-w-[60rem] table-fixed [--inbox-gap:clamp(1.5rem,7.5vw-4.5rem,4.5rem)] [&_:is(td,th):not(:first-child)]:pl-[calc(var(--inbox-gap)-0.75rem)]'
					>
						{/* Each column as wide as its content plus the cells' 24px (Nov 17, 2026, user's calls): Patient fits a name with
						    its full location ("Bridgeport Valley · Med-Surg · Bed 2") and no more; Type the longest badge (Write-back
						    failed, 141px); Received "Due in 24 min"; the actions an Acknowledge-wide button and the "…". Item takes the
						    rest, so the gaps between the right-hand columns stay even. */}
						<colgroup>
							<col className='w-[23rem]' />
							<col />
							<col className='w-[calc(9rem+var(--inbox-gap))]' />
							<col className='w-[calc(6rem+var(--inbox-gap))]' />
							<col className='w-[calc(10rem+var(--inbox-gap))]' />
						</colgroup>
						<TableHeader variant='flat'>
							<TableRow className='hover:bg-transparent'>
								<TableHead>
									<div className='flex items-center gap-3'>
										{tab === "todo" ? (
											<Checkbox
												aria-label='Select every item'
												checked={allSelected ? true : selectedRows.length ? "indeterminate" : false}
												onCheckedChange={(checked) =>
													setSelected(checked === true ? new Set(shown.map((row) => row.id)) : new Set())
												}
											/>
										) : null}
										Patient
									</div>
								</TableHead>
								<TableHead>Item</TableHead>
								<TableHead>Type</TableHead>
								<TableHead>{tab === "todo" ? "Received" : "Done"}</TableHead>
								<TableHead>
									<span className='sr-only'>Actions</span>
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{shown.map((row) => {
								const patient = row.patientId ? patientById.get(row.patientId) : undefined;
								const received = formatRelativeDate(row.done?.at ?? row.receivedAt, now);
								const due = !row.done && row.dueAt ? dueLabel(row.dueAt, now) : undefined;
								const primary = row.item ? primaryActions[row.item.kind] : undefined;
								return (
									<TableRow key={row.id} data-state={selected.has(row.id) ? "selected" : undefined}>
										<TableCell>
											<div className='flex items-center gap-2'>
												{tab === "todo" ? (
													<Checkbox
														aria-label={`Select ${row.title}`}
														checked={selected.has(row.id)}
														onCheckedChange={(checked) => toggleSelected(row.id, checked === true)}
													/>
												) : null}
												{/* The Inbox row's unread dot, on To do only: its slot keeps read and unread rows aligned there. Done has
												    no checkbox or dot, so the avatar starts at the row's edge, under the heading (Nov 17, 2026). */}
												{tab === "todo" ? (
													<span
														aria-label={row.unread ? "New" : undefined}
														role={row.unread ? "img" : undefined}
														className={cn("size-2 shrink-0 rounded-full", row.unread && "bg-inbox-unread")}
													/>
												) : null}
												{patient ? (
													<div className='flex min-w-0 items-center gap-2'>
														<Avatar size='md' className='shrink-0'>
															{patient.photo ? <AvatarImage src={patient.photo} alt='' /> : null}
															<AvatarFallback tone={tones.get(patient.id)}>{patientInitials(patient)}</AvatarFallback>
														</Avatar>
														<div className='flex min-w-0 flex-col gap-0.5'>
															{/* Unread: the name bold, as the title (Inbox row State=Unread). */}
															<span className={cn("truncate", row.unread && "font-bold")}>{fullName(patient)}</span>
															<span className='truncate font-normal text-muted-foreground'>{place(patient)}</span>
														</div>
													</div>
												) : (
													<span className='text-muted-foreground'>No patient</span>
												)}
											</div>
										</TableCell>
										<TableCell>
											{/* The item's open target: an alert opens the alert, anything else the patient. */}
											<button
												type='button'
												onClick={() => open(row)}
												className='flex w-full min-w-0 flex-col gap-0.5 rounded-sm text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
											>
												<span
													className={cn(
														"truncate hover:underline",
														row.unread ? "font-bold" : "font-semibold",
														row.done && "text-muted-foreground",
													)}
												>
													{row.title}
												</span>
												<span className={cn("truncate", row.done && "text-muted-foreground")}>
													{[row.source, row.detail].filter(Boolean).join(" · ")}
												</span>
											</button>
										</TableCell>
										<TableCell>
											<Badge variant={row.badge.variant} size='xs'>
												{row.item?.kind === "write-back" ? <CloudOffIcon /> : null}
												{row.badge.label}
											</Badge>
										</TableCell>
										<TableCell>
											<div className='flex flex-col gap-0.5'>
												<time dateTime={row.done?.at ?? row.receivedAt} title={received.title}>
													{received.label}
												</time>
												{due ? (
													<span
														className={cn("text-xs", due.overdue ? "text-destructive" : "text-muted-foreground")}
													>
														{due.text}
													</span>
												) : row.done?.by ? (
													<span className='truncate text-xs text-muted-foreground'>by {row.done.by}</span>
												) : null}
											</div>
										</TableCell>
										<TableCell>
											{/* Every row's action button is one width (Acknowledge's), so the buttons line up and the space before
											    them is the same on every row (Nov 17, 2026, user's call). */}
											<div className='flex items-center justify-end gap-4'>
												{row.done ? null : row.alert ? (
													<Button variant='outline' size='sm' className='min-w-28' onClick={() => markDone([row])}>
														Acknowledge
													</Button>
												) : primary ? (
													<Button
														variant='outline'
														size='sm'
														className='min-w-28'
														onClick={() => (primary.opens ? open(row) : markDone([row]))}
													>
														{primary.label}
													</Button>
												) : null}
												<RowMenu
													row={row}
													onOpen={navigation && row.patientId ? () => open(row) : undefined}
													onOpenPatient={
														navigation && row.patientId && row.alert
															? () => navigation.openPatient(row.patientId!)
															: undefined
													}
													onDone={row.done ? undefined : () => markDone([row])}
													onDecline={
														!row.done && row.item?.kind === "order"
															? () => {
																	onItemAction?.(row.id, "decline");
																	setDoneHere((current) => ({ ...current, [row.id]: new Date().toISOString() }));
																}
															: undefined
													}
													// Only what was done here: an alert someone else addressed isn't the clinician's to undo.
													onUndo={row.done && doneHere[row.id] ? () => undo(row) : undefined}
												/>
											</div>
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				) : (
					<EmptyState
						className='py-16'
						icon={<InboxIcon />}
						title={
							tab === "todo"
								? source.length
									? "Nothing matches"
									: "You're all caught up"
								: source.length
									? "Nothing matches"
									: "Nothing done yet"
						}
						description={
							tab === "todo"
								? source.length
									? "Try another search or filter."
									: "Alerts, drafts to sign and suggested orders will appear here as they come in."
								: source.length
									? "Try another search or filter."
									: "What you complete this shift will appear here."
						}
					/>
				)}
			</main>
		</>
	);
}

/** A row's "…": open it, its patient, mark done, decline an order, undo. */
function RowMenu({
	row,
	onOpen,
	onOpenPatient,
	onDone,
	onDecline,
	onUndo,
}: {
	row: Row;
	onOpen?: () => void;
	onOpenPatient?: () => void;
	onDone?: () => void;
	onDecline?: () => void;
	onUndo?: () => void;
}) {
	if (!onOpen && !onOpenPatient && !onDone && !onDecline && !onUndo) return <span className='size-8' />;
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				{/* Outlined and 32px, as the row's action (intercept.ds Inbox row). */}
				<Button variant='outline' size='icon-sm' aria-label={`More for ${row.title}`}>
					<EllipsisIcon />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='end'>
				{onOpen ? (
					<DropdownMenuItem onSelect={onOpen}>
						<ArrowUpRightIcon />
						{row.alert ? "Open alert" : "Open patient"}
					</DropdownMenuItem>
				) : null}
				{onOpenPatient ? (
					<DropdownMenuItem onSelect={onOpenPatient}>
						<ArrowUpRightIcon />
						Open patient
					</DropdownMenuItem>
				) : null}
				{(onOpen || onOpenPatient) && (onDone || onDecline || onUndo) ? <DropdownMenuSeparator /> : null}
				{onDone ? (
					<DropdownMenuItem onSelect={onDone}>
						<CheckIcon />
						{row.alert ? "Acknowledge" : "Mark done"}
					</DropdownMenuItem>
				) : null}
				{onDecline ? (
					<DropdownMenuItem variant='destructive' onSelect={onDecline}>
						Decline order
					</DropdownMenuItem>
				) : null}
				{onUndo ? <DropdownMenuItem onSelect={onUndo}>Move back to To do</DropdownMenuItem> : null}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export {
	InboxPanel,
	type InboxItem,
	type InboxItemAction,
	type InboxItemKind,
	type InboxPanelProps,
	type InboxPatient,
};
