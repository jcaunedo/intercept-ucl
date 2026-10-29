import * as React from "react";
import { ClockIcon, SearchIcon } from "lucide-react";

import { Button } from "@/components/buttons/button";
import { Counter } from "@/components/data-display/counter";
import { Input } from "@/components/forms/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/navigation/tabs";
import { useCurrentMinute } from "@/lib/hooks/use-current-minute";
import { cn } from "@/lib/utils";

import { formatDateTime, formatElapsed, formatTime, freshness, NoData, SectionCard } from "../section-parts";

// Patient details › Medications (PRD PD-050): the active medications from the hospital's record, read-only. Continuous
// infusions show the ordered rate beside the pump's when both are known; a difference isn't flagged until an infusion
// mismatch rule is approved (PD-OD-08). Scheduled medications say when they're due; as-needed ones, when they were last
// given and how often today.

/* -------------------------------------------------------------------------- */
/* Data shapes (the app's API fills these)                                    */
/* -------------------------------------------------------------------------- */

/** Where a row's data comes from, e.g. "Pump", "MAR", "Order", and when it last changed. */
type MedicationProvenance = { source: string; updatedAt: string };

type ContinuousMedication = MedicationProvenance & {
	drug: string;
	/** e.g. "8 mg in 250 mL NS". */
	concentration?: string;
	/** The order's rate or range, with units. */
	orderedRate?: string;
	/** The order's titration goal, e.g. "Titrate to MAP 65 or more". */
	titration?: string;
	/** The pump's rate with units. Missing reads "Rate unavailable", never "stopped" (PRD PC-060). */
	pumpRate?: string;
	/** The last rate change on the pump: its direction, the rate before it (same units) and when. */
	change?: { direction: "up" | "down"; from: string; at: string };
};

type ScheduledMedication = MedicationProvenance & {
	drug: string;
	dose: string;
	route: string;
	/** e.g. "Every 8 h". */
	frequency: string;
	indication?: string;
	lastGivenAt?: string;
	nextDueAt?: string;
};

type PrnMedication = MedicationProvenance & {
	drug: string;
	dose: string;
	route: string;
	frequency: string;
	/** What it's given for, e.g. "Fever over 38.5 °C". */
	indication?: string;
	lastGivenAt?: string;
	/** Doses given in the last 24 hours. */
	givenLast24h: number;
};

type PatientMedications = {
	/** The hospital whose record they come from, for the data-depth line. */
	hospital: string;
	/** When the record was last read. */
	updatedAt: string;
	continuous: ContinuousMedication[];
	scheduled: ScheduledMedication[];
	prn: PrnMedication[];
};

type MedicationsSectionProps = {
	medications: PatientMedications;
	/** Shows an infusion's pump values on the Timeline. Without it, there's no link. */
	onShowPumpValues?: (drug: string) => void;
};

/* -------------------------------------------------------------------------- */
/* Product content                                                            */
/* -------------------------------------------------------------------------- */

type GroupId = "all" | "continuous" | "scheduled" | "prn";

const groupLabels: Record<Exclude<GroupId, "all">, string> = {
	continuous: "Continuous infusions",
	scheduled: "Scheduled",
	prn: "As needed",
};

// "Due in 40 min" from this close; a time further out.
const DUE_SOON = 60;

const matches = (query: string, ...fields: (string | undefined)[]) =>
	!query || fields.some((field) => field?.toLowerCase().includes(query.toLowerCase()));

/** "Overdue · 15 min", "Due in 40 min", or the due time, in words with a glyph, never color alone. */
function DueLabel({ at, now }: { at?: string; now: number | null }) {
	if (!at) return <span className='text-muted-foreground'>--</span>;
	if (now === null) return <span>{formatTime(at)}</span>;
	const minutes = Math.round((Date.parse(at) - now) / 60_000);
	if (minutes < 0) {
		return (
			<span className='inline-flex items-center gap-1 font-semibold whitespace-nowrap text-foreground'>
				<ClockIcon aria-hidden='true' className='size-3.5' />
				Overdue · {formatElapsed(at, now).replace(" ago", "")}
			</span>
		);
	}
	if (minutes <= DUE_SOON) return <span className='font-semibold whitespace-nowrap text-foreground'>Due in {minutes} min</span>;
	const sameDay = new Date(at).toDateString() === new Date(now).toDateString();
	return <span>{sameDay ? formatTime(at) : formatDateTime(at)}</span>;
}

/** "10:02 AM · 2 h 10 min ago", or "Not given" when it hasn't been. */
function GivenLabel({ at, now }: { at?: string; now: number | null }) {
	if (!at) return <span className='text-muted-foreground'>Not given</span>;
	return (
		<span>
			{formatTime(at)}
			{now !== null ? <span className='block text-xs whitespace-nowrap text-muted-foreground'>{formatElapsed(at, now)}</span> : null}
		</span>
	);
}

/**
 * The drug's name with its source and age under it (PRD PD-050: every row has source and time). A row whose Last given
 * already shows the time only names the source.
 */
function DrugCell({
	drug,
	detail,
	provenance,
	now,
	timeShown,
}: {
	drug: string;
	detail?: string;
	provenance: MedicationProvenance;
	now: number | null;
	timeShown?: boolean;
}) {
	return (
		<>
			<span className='block font-medium text-foreground'>{drug}</span>
			{detail ? <span className='block text-xs text-muted-foreground'>{detail}</span> : null}
			<span className='block text-xs text-muted-foreground'>
				{timeShown ? provenance.source : freshness(provenance.source, provenance.updatedAt, now)}
			</span>
		</>
	);
}

/* -------------------------------------------------------------------------- */
/* Groups                                                                     */
/* -------------------------------------------------------------------------- */

// Tables on a wide card; on a narrow one, the same rows stacked as label-over-value pairs. Only one of the two is
// displayed, so screen readers meet each row once.
const tableClass = "hidden w-full border-separate border-spacing-0 text-sm @min-[56rem]:table";
const headClass = "border-b border-border-muted px-2 py-2 text-left text-xs font-medium text-muted-foreground first:pl-0 last:pr-0";
const cellClass = "border-b border-border-muted px-2 py-2.5 align-top first:pl-0 last:pr-0 [tr:last-child_&]:border-b-0";
const stackClass = "flex flex-col divide-y divide-border-muted @min-[56rem]:hidden";

/** A stacked row's label-over-value pairs. */
function StackedRow({ title, items }: { title: React.ReactNode; items: [string, React.ReactNode][] }) {
	return (
		<li className='flex flex-col gap-2 py-3 text-sm first:pt-0 last:pb-0'>
			<div>{title}</div>
			<dl className='grid grid-cols-2 gap-x-4 gap-y-2'>
				{items.map(([label, value]) => (
					<div key={label} className='flex flex-col'>
						<dt className='text-xs text-muted-foreground'>{label}</dt>
						<dd className='text-foreground'>{value}</dd>
					</div>
				))}
			</dl>
		</li>
	);
}

function ContinuousGroup({
	items,
	now,
	onShowPumpValues,
}: {
	items: ContinuousMedication[];
	now: number | null;
	onShowPumpValues?: (drug: string) => void;
}) {
	const pump = (item: ContinuousMedication) => (
		<span className='flex flex-col items-start'>
			{item.pumpRate ? (
				<span className='font-semibold text-foreground tabular-nums'>{item.pumpRate}</span>
			) : (
				<span className='text-muted-foreground'>Rate unavailable</span>
			)}
			{item.change ? (
				<span className='text-xs text-muted-foreground'>
					<span aria-hidden='true'>{item.change.direction === "up" ? "▲" : "▼"} </span>
					{item.change.direction === "up" ? "Up" : "Down"} from {item.change.from} at {formatTime(item.change.at)}
				</span>
			) : null}
			{onShowPumpValues ? (
				<Button variant='link' size='xs' className='h-auto px-0' onClick={() => onShowPumpValues(item.drug)}>
					Pump values
				</Button>
			) : null}
		</span>
	);
	const ordered = (item: ContinuousMedication) => (
		<span className='flex flex-col'>
			<span className='tabular-nums'>{item.orderedRate ?? <span className='text-muted-foreground'>--</span>}</span>
			{item.titration ? <span className='text-xs text-muted-foreground'>{item.titration}</span> : null}
		</span>
	);

	return (
		<>
			<table className={tableClass}>
				<caption className='sr-only'>Continuous infusions: ordered rate and pump rate</caption>
				<thead>
					<tr>
						<th scope='col' className={cn(headClass, "w-[34%]")}>
							Medication
						</th>
						<th scope='col' className={headClass}>
							Ordered
						</th>
						<th scope='col' className={headClass}>
							Pump
						</th>
					</tr>
				</thead>
				<tbody>
					{items.map((item) => (
						<tr key={item.drug}>
							<th scope='row' className={cn(cellClass, "text-left font-normal")}>
								<DrugCell drug={item.drug} detail={item.concentration} provenance={item} now={now} />
							</th>
							<td className={cellClass}>{ordered(item)}</td>
							<td className={cellClass}>{pump(item)}</td>
						</tr>
					))}
				</tbody>
			</table>
			<ul className={stackClass}>
				{items.map((item) => (
					<StackedRow
						key={item.drug}
						title={<DrugCell drug={item.drug} detail={item.concentration} provenance={item} now={now} />}
						items={[
							["Ordered", ordered(item)],
							["Pump", pump(item)],
						]}
					/>
				))}
			</ul>
		</>
	);
}

function ScheduledGroup({ items, now }: { items: ScheduledMedication[]; now: number | null }) {
	return (
		<>
			<table className={tableClass}>
				<caption className='sr-only'>Scheduled medications: dose, frequency, last given and next due</caption>
				<thead>
					<tr>
						<th scope='col' className={cn(headClass, "w-[34%]")}>
							Medication
						</th>
						<th scope='col' className={headClass}>
							Dose · route
						</th>
						<th scope='col' className={headClass}>
							Frequency
						</th>
						<th scope='col' className={headClass}>
							Last given
						</th>
						<th scope='col' className={headClass}>
							Next due
						</th>
					</tr>
				</thead>
				<tbody>
					{items.map((item) => (
						<tr key={item.drug}>
							<th scope='row' className={cn(cellClass, "text-left font-normal")}>
								<DrugCell drug={item.drug} detail={item.indication} provenance={item} now={now} timeShown={item.lastGivenAt === item.updatedAt} />
							</th>
							<td className={cn(cellClass, "tabular-nums")}>
								{item.dose} · {item.route}
							</td>
							<td className={cellClass}>{item.frequency}</td>
							<td className={cellClass}>
								<GivenLabel at={item.lastGivenAt} now={now} />
							</td>
							<td className={cellClass}>
								<DueLabel at={item.nextDueAt} now={now} />
							</td>
						</tr>
					))}
				</tbody>
			</table>
			<ul className={stackClass}>
				{items.map((item) => (
					<StackedRow
						key={item.drug}
						title={<DrugCell drug={item.drug} detail={item.indication} provenance={item} now={now} timeShown={item.lastGivenAt === item.updatedAt} />}
						items={[
							["Dose · route", `${item.dose} · ${item.route}`],
							["Frequency", item.frequency],
							["Last given", <GivenLabel key='given' at={item.lastGivenAt} now={now} />],
							["Next due", <DueLabel key='due' at={item.nextDueAt} now={now} />],
						]}
					/>
				))}
			</ul>
		</>
	);
}

function PrnGroup({ items, now }: { items: PrnMedication[]; now: number | null }) {
	const given = (count: number) => (count ? `${count} ${count === 1 ? "dose" : "doses"}` : "None");

	return (
		<>
			<table className={tableClass}>
				<caption className='sr-only'>As-needed medications: dose, when to give, last given and doses in 24 hours</caption>
				<thead>
					<tr>
						<th scope='col' className={cn(headClass, "w-[34%]")}>
							Medication
						</th>
						<th scope='col' className={headClass}>
							Dose · route
						</th>
						<th scope='col' className={headClass}>
							Frequency
						</th>
						<th scope='col' className={headClass}>
							Last given
						</th>
						<th scope='col' className={headClass}>
							In 24 h
						</th>
					</tr>
				</thead>
				<tbody>
					{items.map((item) => (
						<tr key={item.drug}>
							<th scope='row' className={cn(cellClass, "text-left font-normal")}>
								<DrugCell drug={item.drug} detail={item.indication} provenance={item} now={now} timeShown={item.lastGivenAt === item.updatedAt} />
							</th>
							<td className={cn(cellClass, "tabular-nums")}>
								{item.dose} · {item.route}
							</td>
							<td className={cellClass}>{item.frequency}</td>
							<td className={cellClass}>
								<GivenLabel at={item.lastGivenAt} now={now} />
							</td>
							<td className={cn(cellClass, "tabular-nums")}>{given(item.givenLast24h)}</td>
						</tr>
					))}
				</tbody>
			</table>
			<ul className={stackClass}>
				{items.map((item) => (
					<StackedRow
						key={item.drug}
						title={<DrugCell drug={item.drug} detail={item.indication} provenance={item} now={now} timeShown={item.lastGivenAt === item.updatedAt} />}
						items={[
							["Dose · route", `${item.dose} · ${item.route}`],
							["Frequency", item.frequency],
							["Last given", <GivenLabel key='given' at={item.lastGivenAt} now={now} />],
							["In 24 h", given(item.givenLast24h)],
						]}
					/>
				))}
			</ul>
		</>
	);
}

/* -------------------------------------------------------------------------- */
/* MedicationsSection                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Patient details › Medications (PRD PD-050): continuous infusions, scheduled and as-needed medications from the
 * hospital's record, read-only, each with its source and time. Filtered by group, and by name.
 */
function MedicationsSection({ medications, onShowPumpValues }: MedicationsSectionProps) {
	const now = useCurrentMinute();
	const searchId = React.useId();
	const [group, setGroup] = React.useState<GroupId>("all");
	const [query, setQuery] = React.useState("");
	const filtered = {
		continuous: medications.continuous.filter((item) => matches(query, item.drug, item.concentration)),
		scheduled: medications.scheduled.filter((item) => matches(query, item.drug, item.indication)),
		prn: medications.prn.filter((item) => matches(query, item.drug, item.indication)),
	};
	const counts = {
		continuous: medications.continuous.length,
		scheduled: medications.scheduled.length,
		prn: medications.prn.length,
	};
	const total = counts.continuous + counts.scheduled + counts.prn;
	const shown = (Object.keys(groupLabels) as (keyof typeof groupLabels)[]).filter((id) => group === "all" || group === id);
	const nothingFound = shown.every((id) => filtered[id].length === 0);

	return (
		<div className='flex flex-col gap-6 @container'>
			<div className='flex flex-col gap-3 @min-[48rem]:flex-row @min-[48rem]:items-center @min-[48rem]:justify-between'>
				<Tabs value={group} onValueChange={(value) => setGroup(value as GroupId)}>
					<TabsList aria-label='Medication groups' className='max-w-full overflow-x-auto'>
						<TabsTrigger value='all'>
							All
							<Counter variant='neutral' count={total} />
						</TabsTrigger>
						{(Object.keys(groupLabels) as (keyof typeof groupLabels)[]).map((id) => (
							<TabsTrigger key={id} value={id}>
								{groupLabels[id]}
								<Counter variant='neutral' count={counts[id]} />
							</TabsTrigger>
						))}
					</TabsList>
				</Tabs>
				<div className='relative @min-[48rem]:w-64'>
					<label htmlFor={searchId} className='sr-only'>
						Find a medication
					</label>
					<SearchIcon aria-hidden='true' className='pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-icon-muted' />
					<Input
						id={searchId}
						type='search'
						placeholder='Find a medication'
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						className='pl-9'
					/>
				</div>
			</div>

			<p className='-mt-3 text-xs text-muted-foreground'>
				Medications from {medications.hospital}'s record · read-only
				{now !== null ? ` · updated ${formatElapsed(medications.updatedAt, now)}` : null}
			</p>

			{nothingFound && query ? (
				<NoData>No medications match “{query}”.</NoData>
			) : (
				shown.map((id) => {
					const items = filtered[id];
					// A group the search emptied is left out, so the result reads as one list.
					if (query && !items.length) return null;
					return (
						<SectionCard
							key={id}
							title={groupLabels[id]}
							meta={id === "continuous" && items.length ? "Ordered and pump rates" : undefined}
						>
							{!items.length ? (
								<NoData>
									{id === "continuous"
										? "No infusions running."
										: id === "scheduled"
											? "No scheduled medications."
											: "No as-needed medications."}
								</NoData>
							) : id === "continuous" ? (
								<ContinuousGroup items={filtered.continuous} now={now} onShowPumpValues={onShowPumpValues} />
							) : id === "scheduled" ? (
								<ScheduledGroup items={filtered.scheduled} now={now} />
							) : (
								<PrnGroup items={filtered.prn} now={now} />
							)}
						</SectionCard>
					);
				})
			)}
		</div>
	);
}

export {
	MedicationsSection,
	type ContinuousMedication,
	type MedicationProvenance,
	type MedicationsSectionProps,
	type PatientMedications,
	type PrnMedication,
	type ScheduledMedication,
};
