import * as React from "react";

import { PatientMonitor } from "@/components/data-display/patient-monitor";
import { Badge, type BadgeProps } from "@/components/data-display/badge";
import { LabTile } from "@/components/data-display/lab-tile";
import { AiClinicalSummaryBanner } from "@/components/feedback/ai-clinical-summary-banner";
import { useCurrentMinute } from "@/lib/hooks/use-current-minute";
import { formatRelativeDate } from "@/lib/relative-date";

import { usePatientNavigation } from "../patient-navigation";
import type { PatientBrief, PatientDetailsProps, PatientLab, PatientRecord } from "./patient-details";
import {
	CardLink,
	CardList,
	CardRow,
	CardSource,
	CardToggle,
	Detail,
	dueChip,
	formatElapsed,
	formatTime,
	freshness,
	latest,
	NoData,
	OverviewCard,
	RowTime,
} from "./section-parts";
import { CarePlanCard, pathwaySummary, type OverviewPathway } from "./sections/care-plan-section";
import { trendableTests } from "./sections/lab-trends";

// The Overview (PRD Patient details §5; Intercept-Live `149:4464`, rebuilt Nov 9, 2026): what matters about the patient
// now, and what's being done about it. The AI clinical summary across the top, the clinical findings (key labs and what
// matters for this patient) under it, then a grid of cards: live monitoring, the care plan, Up next; medications, oxygen
// and infusions, recent orders; the encounter and referrals. The Care plan card is the Care Plan tab's
// (`sections/care-plan-section.tsx`), capped here; the cards' parts are in `section-parts.tsx`. The alerts aren't here:
// they're in the page's Alerts panel (`sections/alerts-section.tsx`), which the patient header opens. Data that's missing
// says it's missing, and only an empty list says there's none.

/** The tabs the Overview links to. */
type OverviewLinkedSection = "medications" | "orders" | "care-plan";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** How far ahead Up next looks. */
const UP_NEXT_HOURS = 12;
/** Up next's items before "View all". */
const UP_NEXT_ITEMS = 5;

/* -------------------------------------------------------------------------- */
/* Brief                                                                      */
/* -------------------------------------------------------------------------- */

/** What the brief asks Ask Intercept Live when it's clicked: the summary behind it and what changed since the last look. */
const briefQuestion = "Summarize what's behind the brief";

/**
 * An AI brief across the top of a tab (PRD PD-024): UCL's AiClinicalSummaryBanner (intercept.ds `1467:13678`, Nov 9,
 * 2026), what matters now under a headline, with how many sources it read and how fresh it is. The Overview's covers
 * the patient; the Labs tab's, their labs (`title` "Labs summary", Intercept-Live `320:9153`, Nov 25, 2026). The whole
 * banner is a button (Nov 6, 2026, user's call): it opens Ask Intercept Live about the patient and asks `question`,
 * which answers with the details and what changed since the clinician last looked; clicked again while the chat is open
 * about them, it closes the chat. × hides it until a newer brief or another patient.
 */
function PatientBriefBanner({
	patient,
	brief,
	title = brief.title,
	label,
	question = briefQuestion,
}: Pick<PatientDetailsProps, "patient"> & {
	brief: PatientBrief;
	/** The headline before the text; the brief's own by default. */
	title?: string;
	/** Its accessible name and tooltip, "AI clinical summary" by default. */
	label?: string;
	question?: string;
}) {
	const now = useCurrentMinute();
	const navigation = usePatientNavigation();
	const key = `${patient.id}:${brief.updatedAt}`;
	const [dismissed, setDismissed] = React.useState<string>();
	if (dismissed === key) return null;
	const name = `${patient.lastName}, ${patient.firstName}`;
	const askOpen = navigation?.askPatientId === patient.id;
	return (
		<AiClinicalSummaryBanner
			label={label}
			title={title}
			source={`${brief.sourceCount} sources${now === null ? "" : ` · ${formatElapsed(brief.updatedAt, now)}`}`}
			// A second click, while the chat is open about this patient, closes it (Nov 25, 2026, user's call).
			onOpen={
				navigation
					? askOpen && navigation.closeAsk
						? navigation.closeAsk
						: () => navigation.askAboutPatient(patient.id, name, patient.tags?.map((tag) => tag.label), question)
					: undefined
			}
			openLabel={askOpen ? "Close Ask Intercept Live" : undefined}
			onClose={() => setDismissed(key)}
		>
			{brief.text}
		</AiClinicalSummaryBanner>
	);
}

/* -------------------------------------------------------------------------- */
/* Up next, Now and the log                                                   */
/* -------------------------------------------------------------------------- */

type UpNextItem = { id: string; at: string; title: string; detail?: string };

/** What the pathway has due: the bundle's open elements, the protocol's checks, and the open bedside tasks once sent. */
function pathwayUpNext({ detail, status }: OverviewPathway): UpNextItem[] {
	const { bundle, protocol, tasks } = detail;
	const sent = status === "pending" || status === "active";
	return [
		...(bundle?.elements ?? []).flatMap((element) =>
			element.status === "pending" || element.status === "in-progress"
				? [
						{
							id: `bundle-${element.id}`,
							at: new Date(Date.parse(bundle!.startedAt) + (element.dueAfter ?? 60) * MINUTE).toISOString(),
							title: element.label,
							detail: `Hour-1 sepsis bundle · ${element.target}`,
						},
					]
				: [],
		),
		// The checks open now (due or overdue), then only the next one coming.
		...(protocol && !protocol.stopped
			? [
					...protocol.checks.filter((check) => check.status === "due" || check.status === "overdue"),
					...protocol.checks.filter((check) => check.status === "upcoming").slice(0, 1),
				]
			: []
		).map((check) => ({ id: `dka-${check.id}`, at: check.at, title: `Hour ${check.hour} check`, detail: protocol!.title })),
		...(tasks && sent ? tasks.tasks : []).flatMap((task) =>
			task.status === "open" && task.dueAt
				? [{ id: `task-${task.id}`, at: task.dueAt, title: task.title, detail: `${task.assignee} · ${task.from}` }]
				: [],
		),
	];
}

/**
 * What's due in the next hours, soonest first: scheduled medications, the care plan's checkpoints not yet recorded,
 * order recommendations waiting with a due time, and what the pathway has due (its bundle, protocol checks and tasks).
 */
function upNextItems(record: PatientRecord | undefined, now: number, pathway?: OverviewPathway): UpNextItem[] {
	const until = now + UP_NEXT_HOURS * HOUR;
	const items: UpNextItem[] = [
		...(record?.medications?.scheduled ?? []).flatMap((med) =>
			med.nextDueAt
				? [
						{
							id: `med-${med.drug}`,
							at: med.nextDueAt,
							title: `${med.drug} ${med.dose === "Per scale" ? "" : `${med.dose} `}${med.route}`.trim(),
							detail: [med.frequency, med.indication].filter(Boolean).join(" · "),
						},
					]
				: [],
		),
		...(record?.carePlan?.transfer?.checkpoints ?? []).flatMap((checkpoint) =>
			checkpoint.result
				? []
				: [
						{
							id: `checkpoint-${checkpoint.id}`,
							at: checkpoint.due,
							title: `${checkpoint.label} checkpoint: ${record?.carePlan?.transfer?.label.toLowerCase()}`,
							detail: checkpoint.criteria,
						},
					],
		),
		...(record?.orders?.recommendations ?? []).flatMap((recommendation) =>
			recommendation.dueAt && !recommendation.outcome
				? [{ id: `rec-${recommendation.id}`, at: recommendation.dueAt, title: recommendation.title, detail: recommendation.order }]
				: [],
		),
		...(pathway ? pathwayUpNext(pathway) : []),
	];
	// Overdue items stay until they're done; the rest only within the window.
	return items.filter((item) => Date.parse(item.at) <= until).sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

/* -------------------------------------------------------------------------- */
/* Clinical findings                                                          */
/* -------------------------------------------------------------------------- */

/** "2 h old", "45 min old": how stale a charted value is. */
function formatAge(at: string, now: number) {
	const minutes = Math.max(0, Math.round((now - Date.parse(at)) / MINUTE));
	return minutes < 60 ? `${minutes} min old` : `${Math.floor(minutes / 60)} h old`;
}

/**
 * One key lab as a UCL LabTile (PRD PD-025): the Overview's clinical findings and the top of the Labs tab. With
 * `onOpenTrend` the tile is a button that opens the lab's trend in Lab trends (Nov 25, 2026, user's call), the same on
 * both tabs.
 */
function KeyLabTile({ lab, onOpenTrend, pressed }: { lab: PatientLab; onOpenTrend?: () => void; pressed?: boolean }) {
	return (
		<LabTile
			className='flex-1'
			onOpen={onOpenTrend}
			pressed={onOpenTrend ? pressed : undefined}
			name={lab.name}
			value={lab.value}
			unit={lab.unit}
			flag={lab.flag}
			resultedAt={lab.resultedAt}
			previous={lab.previous}
			collectedAt={lab.collectedAt}
		/>
	);
}

/** The key-lab grid's columns, as the room allows: two, three, four, then six to a row. */
const keyLabsGrid = "grid grid-cols-2 gap-2 @min-[36rem]:grid-cols-3 @min-[60rem]:grid-cols-4 @min-[80rem]:grid-cols-6";

/**
 * The clinical findings across the top (PRD PD-025; Intercept-Live `242:11805`, Nov 9, 2026: "primarily reserved for
 * contextual clinical findings"): the key labs as UCL LabTiles, then what matters for this patient's situation (a vital
 * with the rule it's watched against, the breathing support since it started), so the clinician reads the numbers the
 * plan turns on first. A finding charted too long ago says how old it is, in red, instead of its context.
 */
function ClinicalFindings({
	record,
	now,
	onOpenLabTrend,
}: {
	record?: PatientRecord;
	now: number | null;
	/** Opens a key lab's trend on the Labs tab; only labs Lab trends can chart get it. */
	onOpenLabTrend?: (test: string) => void;
}) {
	const labs = record?.labs ?? [];
	const trendable = React.useMemo(
		() => (record?.chart ? trendableTests(record.chart, record.labTrends) : new Set<string>()),
		[record?.chart, record?.labTrends],
	);
	const findings = record?.findings ?? [];
	if (!labs.length && !findings.length)
		return <NoData>{record?.labs ? "No labs resulted in the last 72 hours." : "No lab data for this patient."}</NoData>;
	return (
		<section aria-label='Clinical findings'>
			<ul className={keyLabsGrid}>
				{labs.map((lab) => (
					<li key={`lab-${lab.name}`} className='flex'>
						<KeyLabTile
							lab={lab}
							onOpenTrend={onOpenLabTrend && trendable.has(lab.name) ? () => onOpenLabTrend(lab.name) : undefined}
						/>
					</li>
				))}
				{findings.map((finding) => {
					const stale =
						finding.chartedAt && finding.staleAfterMinutes !== undefined && now !== null
							? now - Date.parse(finding.chartedAt) > finding.staleAfterMinutes * MINUTE
							: false;
					const context = finding.since ? `Since ${formatTime(finding.since)}` : finding.context;
					return (
						<li key={`finding-${finding.name}`} className='flex'>
							<LabTile
								className='flex-1'
								name={finding.name}
								value={finding.value}
								unit={finding.unit}
								previous={finding.previous}
								meta={
									stale && finding.chartedAt && now !== null ? (
										<span className='text-severity-critical-prominent'>{formatAge(finding.chartedAt, now)}</span>
									) : (
										context
									)
								}
								note={finding.note}
							/>
						</li>
					);
				})}
			</ul>
		</section>
	);
}

/* -------------------------------------------------------------------------- */
/* Cards                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The patient's live bedside monitor (PRD PD-021) under "Live monitoring", with how many of the patient's devices are
 * reporting: the monitor, and the ventilator and the pumps when the record has them.
 */
function LiveMonitoringCard({
	record,
	monitor,
	name,
}: {
	record?: PatientRecord;
	monitor: PatientDetailsProps["monitor"];
	name: string;
}) {
	const devices = [Boolean(monitor?.vitals), ...(record?.ventilator ? [true] : []), ...(record?.infusions?.length ? [true] : [])];
	const connected = devices.filter(Boolean).length;
	return (
		<OverviewCard
			title='Live monitoring'
			leading={
				monitor?.vitals ? <span aria-hidden='true' className='size-2.5 shrink-0 rounded-full bg-success' /> : undefined
			}
			meta={`${connected}/${devices.length} ${devices.length === 1 ? "device" : "devices"} connected`}
		>
			{monitor?.vitals ? (
				<PatientMonitor
					aria-label={`Bedside monitor, ${name}`}
					vitals={monitor.vitals}
					limits={monitor.limits}
					alarmPriorities={monitor.alarmPriorities}
					acknowledgedAlarms={monitor.acknowledgedAlarms}
					trends={monitor.trends}
					className='min-h-60 flex-1'
				/>
			) : (
				<NoData>No live monitor data for this patient.</NoData>
			)}
		</OverviewCard>
	);
}

/** What's due next, soonest first (Intercept-Live `239:11497`): each with its time and how soon. */
function UpNextCard({ record, now, pathway }: { record?: PatientRecord; now: number | null; pathway?: OverviewPathway }) {
	const [showAll, setShowAll] = React.useState(false);
	const items = now === null ? [] : upNextItems(record, now, pathway);
	const shown = showAll ? items : items.slice(0, UP_NEXT_ITEMS);
	return (
		<OverviewCard
			title='Up next'
			actions={
				items.length > UP_NEXT_ITEMS ? (
					<CardToggle expanded={showAll} total={items.length} onToggle={() => setShowAll(!showAll)} />
				) : undefined
			}
		>
			{items.length ? (
				<CardList capped={!showAll}>
					{shown.map((item) => {
						const chip = now === null ? undefined : dueChip(item.at, now);
						return (
							<CardRow
								key={item.id}
								title={item.title}
								detail={<time dateTime={item.at}>{formatTime(item.at)}</time>}
								extra={item.detail}
								aside={
									chip ? (
										<Badge variant={chip.variant} size='xs'>
											{chip.label}
										</Badge>
									) : undefined
								}
							/>
						);
					})}
				</CardList>
			) : (
				<NoData>Nothing scheduled in the next {UP_NEXT_HOURS} hours.</NoData>
			)}
		</OverviewCard>
	);
}

/** Scheduled medications the Overview lists; View all opens Medications with every one. */
const MEDICATION_ROWS = 5;

/**
 * What the patient is on: the scheduled medications, each with when it was last given (when it's next due is Up
 * next's), and the infusions and as-needed ones counted under them. **View all** opens Medications.
 */
function MedicationsCard({ record, now, onShowAll }: { record?: PatientRecord; now: number | null; onShowAll?: () => void }) {
	const medications = record?.medications;
	// The most recently given first.
	const scheduled = [...(medications?.scheduled ?? [])].sort(
		(a, b) => (b.lastGivenAt ? Date.parse(b.lastGivenAt) : 0) - (a.lastGivenAt ? Date.parse(a.lastGivenAt) : 0),
	);
	const total = medications ? medications.continuous.length + medications.scheduled.length + medications.prn.length : 0;
	const moreScheduled = scheduled.length - MEDICATION_ROWS;
	const others = [
		moreScheduled > 0 ? `${moreScheduled} more scheduled` : undefined,
		medications?.continuous.length
			? `${medications.continuous.length} ${medications.continuous.length === 1 ? "infusion" : "infusions"}`
			: undefined,
		medications?.prn.length ? `${medications.prn.length} as needed: ${medications.prn.map((med) => med.drug.toLowerCase()).join(", ")}` : undefined,
	].filter(Boolean);

	return (
		<OverviewCard
			title='Medications'
			actions={
				onShowAll && total ? (
					<CardLink onClick={onShowAll} aria-label={`View all ${total} medications`}>
						View all · {total}
					</CardLink>
				) : undefined
			}
			footer={others.length ? <p className='text-sm text-muted-foreground'>Plus {`${others.slice(0, -1).join(", ")}${others.length > 1 ? " and " : ""}${others.at(-1)}`}.</p> : undefined}
		>
			{medications ? (
				scheduled.length ? (
					<CardList>
						{scheduled.slice(0, MEDICATION_ROWS).map((med) => (
							<CardRow
								key={med.drug}
								title={`${med.drug} ${med.dose === "Per scale" ? "" : `${med.dose} `}${med.route}`.replace(/\s+/g, " ")}
								detail={med.frequency}
								extra={med.indication}
								aside={
									<RowTime>
										{med.lastGivenAt
											? now !== null && Date.parse(med.lastGivenAt) < now - 12 * HOUR
												? `Given ${formatRelativeDate(med.lastGivenAt, now).label.toLowerCase()}`
												: `Given ${formatTime(med.lastGivenAt)}`
											: "Not given yet"}
									</RowTime>
								}
							/>
						))}
					</CardList>
				) : (
					<NoData>No scheduled medications.</NoData>
				)
			) : (
				<NoData>No medication data for this patient.</NoData>
			)}
		</OverviewCard>
	);
}

/** "0.22 mcg/kg/min": the number medium, the unit regular. */
function Rate({ rate }: { rate?: string }) {
	if (!rate) return <span className='text-base text-muted-foreground'>Rate unavailable</span>;
	const space = rate.indexOf(" ");
	return (
		<span className='text-base text-foreground tabular-nums'>
			<span className='font-medium'>{space < 0 ? rate : rate.slice(0, space)}</span>
			{space < 0 ? null : rate.slice(space)}
		</span>
	);
}

/**
 * Organ support (PRD PD-022) and fluids (DU-18) in one card (Intercept-Live `252:10474`): the breathing support and its
 * main settings with the last ABG, each infusion's rate and last change, then intake and output (✅ user's call, kept
 * here) and where it all comes from.
 */
function OxygenAndInfusionsCard({ record, now, onShowAll }: { record?: PatientRecord; now: number | null; onShowAll?: () => void }) {
	const ventilator = record?.ventilator;
	const infusions = record?.infusions;
	const fluids = record?.fluids;
	const updated = latest([ventilator?.updatedAt, ...(infusions?.map((infusion) => infusion.updatedAt) ?? [])]);
	const source = [ventilator?.source, infusions?.length ? "Pump" : undefined].filter(Boolean).join(", ");

	return (
		<OverviewCard
			title='Oxygen and infusions'
			actions={
				onShowAll && infusions?.length ? (
					<CardLink onClick={onShowAll} aria-label={`View all ${infusions.length} infusions`}>
						View all · {infusions.length}
					</CardLink>
				) : undefined
			}
			footer={
				<>
					{fluids ? (
						<p className='text-sm text-muted-foreground'>
							<span className='text-foreground'>Net balance {fluids.netBalance}</span> · weight {fluids.weightChange} over{" "}
							{fluids.window} · charted{fluids.chartedBy ? ` by ${fluids.chartedBy}` : null} at {formatTime(fluids.chartedAt)}
						</p>
					) : (
						<NoData>No intake and output charted for this patient.</NoData>
					)}
					{updated && source ? <CardSource>{freshness(source, updated, now)}</CardSource> : null}
				</>
			}
		>
			{ventilator || infusions?.length ? (
				<CardList>
					{ventilator ? (
						<CardRow
							title={ventilator.support === "Invasive" ? "Ventilator" : ventilator.support}
							detail={ventilator.mode}
							extra={ventilator.abg ? `Last ABG ${formatTime(ventilator.abg.collectedAt)}` : undefined}
							aside={
								<span className='text-base text-foreground tabular-nums'>
									{ventilator.settings.slice(0, 2).map((setting, index) => (
										<React.Fragment key={setting.label}>
											{index ? " · " : null}
											{setting.label} <span className='font-medium'>{setting.value}</span>
										</React.Fragment>
									))}
								</span>
							}
						/>
					) : null}
					{infusions?.map((infusion) => (
						<CardRow
							key={infusion.drug}
							title={infusion.drug}
							detail={
								infusion.change ? (
									<>
										<span aria-hidden='true'>{infusion.change.direction === "up" ? "▲" : "▼"} </span>
										{infusion.change.direction === "up" ? "Up" : "Down"} from {infusion.change.from}
									</>
								) : undefined
							}
							extra={infusion.change ? `at ${formatTime(infusion.change.at)}` : undefined}
							join=' '
							aside={<Rate rate={infusion.rate} />}
						/>
					))}
				</CardList>
			) : null}
			{ventilator ? null : <NoData>No ventilator or oxygen data for this patient.</NoData>}
			{infusions ? (infusions.length ? null : <NoData>No infusions running.</NoData>) : <NoData>No pump data for this patient.</NoData>}
		</OverviewCard>
	);
}

// Orders' status colors (Intercept-Live `252:10517`: Active green, Collected sky).
const orderStatusVariants: Record<string, BadgeProps["variant"]> = {
	Active: "green",
	Collected: "sky",
	Scheduled: "secondary",
	Pending: "yellow",
};

/** How many recent orders the Overview lists; Orders has them all. */
const RECENT_ORDERS = 4;

/**
 * The newest active orders with their status, and the order recommendations waiting for a decision as a link. Both
 * links open Orders.
 */
function RecentOrdersCard({ record, now, onShowAll }: { record?: PatientRecord; now: number | null; onShowAll?: () => void }) {
	const orders = record?.orders;
	const recent = [...(orders?.active ?? [])].sort((a, b) => Date.parse(b.orderedAt) - Date.parse(a.orderedAt)).slice(0, RECENT_ORDERS);
	const waiting = orders?.recommendations.filter((recommendation) => !recommendation.outcome).length ?? 0;

	return (
		<OverviewCard
			title='Recent orders'
			actions={
				onShowAll && orders ? (
					<>
						{waiting ? (
							<CardLink onClick={onShowAll}>
								{waiting} {waiting === 1 ? "recommendation" : "recommendations"}
							</CardLink>
						) : null}
						<CardLink onClick={onShowAll}>All orders</CardLink>
					</>
				) : undefined
			}
			footer={orders ? <CardSource>{freshness(orders.source, orders.updatedAt, now)}</CardSource> : undefined}
		>
			{orders ? (
				recent.length ? (
					<CardList>
						{recent.map((order) => (
							<CardRow
								key={order.id}
								title={order.name}
								detail={order.details}
								extra={order.orderedBy}
								aside={
									<Badge variant={orderStatusVariants[order.status] ?? "secondary"} size='xs'>
										{order.status}
									</Badge>
								}
							/>
						))}
					</CardList>
				) : (
					<NoData>No active orders.</NoData>
				)
			) : (
				<NoData>No order data for this patient.</NoData>
			)}
		</OverviewCard>
	);
}

/** Why the patient is here (PRD PD-026): the admitting diagnosis, the problem list and when and where from. */
// "ICU day 3": the day count since the ICU admission, the first day being day 1.
const icuDay = (since: string, now: number) => Math.floor((now - Date.parse(since)) / (24 * 60 * 60_000)) + 1;

/**
 * Diagnosis, problems and admission, then the ICU day and weight, which left the Patient Header on Nov 11, 2026 (user's
 * call, following intercept.ds).
 */
function EncounterCard({ record, now }: { record?: PatientRecord; now: number | null }) {
	return (
		<OverviewCard title='Encounter'>
			{record?.diagnosis || record?.admittedAt || record?.problems?.length || record?.icuAdmittedAt || record?.weight ? (
				<dl className='flex flex-col gap-3'>
					{record.diagnosis ? <Detail label='Diagnosis'>{record.diagnosis}</Detail> : null}
					{record.problems?.length ? (
						<Detail label='Problems'>
							<ul className='flex flex-col'>
								{record.problems.map((problem) => (
									<li key={problem}>{problem}</li>
								))}
							</ul>
						</Detail>
					) : null}
					{record.admittedAt ? (
						<Detail label='Admitted'>
							{new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(record.admittedAt))},{" "}
							{formatTime(record.admittedAt)}
							{record.admittedFrom ? ` from ${record.admittedFrom.toLowerCase()}` : null}
						</Detail>
					) : null}
					{record.icuAdmittedAt && now !== null ? (
						<Detail label='ICU day'>{icuDay(record.icuAdmittedAt, now)}</Detail>
					) : null}
					{record.weight ? <Detail label='Weight'>{record.weight}</Detail> : null}
				</dl>
			) : (
				<NoData>No diagnosis or encounter details yet.</NoData>
			)}
		</OverviewCard>
	);
}

/**
 * The patient's referrals (Intercept-Live `242:11802`, Nov 9, 2026, user's call: built with an empty state, as Figma
 * draws only the title): the discharge workflow's, each with who receives it and whether it was sent, skipped or is
 * still to send. None says so.
 */
function ReferralsCard({ record }: { record?: PatientRecord }) {
	const referrals = record?.discharge?.referrals ?? [];
	const decided = record?.discharge?.decided ?? {};
	return (
		<OverviewCard title='Referrals'>
			{referrals.length ? (
				<CardList>
					{referrals.map((referral) => {
						const outcome = decided[referral.id];
						return (
							<CardRow
								key={referral.id}
								title={referral.title}
								detail={referral.to}
								extra={referral.detail}
								aside={
									outcome?.type === "sent" ? (
										<Badge variant='green' size='xs'>
											Sent
										</Badge>
									) : outcome?.type === "skipped" ? (
										<Badge variant='secondary' size='xs'>
											Skipped
										</Badge>
									) : (
										<Badge variant='yellow' size='xs'>
											To send
										</Badge>
									)
								}
							/>
						);
					})}
				</CardList>
			) : (
				<NoData>No referrals for this patient.</NoData>
			)}
		</OverviewCard>
	);
}

/* -------------------------------------------------------------------------- */
/* PatientOverview                                                            */
/* -------------------------------------------------------------------------- */

/**
 * The Overview (Intercept-Live `149:4464`, Nov 9, 2026): the AI clinical summary (PD-024) across the top, then the
 * clinical findings (key labs, PD-025, and what matters for this patient), then a grid of cards: live monitoring
 * (PD-021), the care plan, Up next; medications, oxygen and infusions (PD-022, DU-18), recent orders; the encounter
 * (PD-026) and referrals. Three to a row from 80rem of room, two from 50rem, one under that.
 *
 * The alerts aren't here (Nov 9, 2026, user's call): the patient header shows their count and opens them in the Alerts
 * panel. The log moved to the Timeline, and the score breakdown left with the header's View breakdown.
 */
function PatientOverview({
	patient,
	record,
	monitor,
	onShowSection,
	pathway,
	onOpenLabTrend,
}: Pick<PatientDetailsProps, "patient" | "record" | "monitor"> & {
	/** Opens another tab: Medications or Orders. */
	onShowSection?: (section: OverviewLinkedSection) => void;
	/** The pathway an open alert brought: the Care plan shows it (suggested, or what it runs) and Up next what it has due. */
	pathway?: OverviewPathway;
	/** Opens the Labs tab on a key lab's trend. */
	onOpenLabTrend?: (test: string) => void;
}) {
	const now = useCurrentMinute();
	const { suggestion, running } = pathway ? pathwaySummary(pathway, now) : { suggestion: undefined, running: [] };
	const showMedications = onShowSection && (() => onShowSection("medications"));

	return (
		// A size container, so the layout follows the room the side panels leave.
		<div className='@container'>
			<div className='flex flex-col gap-4'>
				{/* The brief is optional (PRD §3.4). */}
				{record?.brief ? <PatientBriefBanner patient={patient} brief={record.brief} /> : null}

				<ClinicalFindings record={record} now={now} onOpenLabTrend={onOpenLabTrend} />

				<div className='grid gap-4 @min-[50rem]:grid-cols-2 @min-[80rem]:grid-cols-3'>
					<LiveMonitoringCard record={record} monitor={monitor} name={`${patient.lastName}, ${patient.firstName}`} />
					<CarePlanCard
						plan={record?.carePlan}
						planOfCare={record?.planOfCare}
						suggestion={suggestion}
						running={running}
						now={now}
						onShowAll={onShowSection && (() => onShowSection("care-plan"))}
					/>
					<UpNextCard record={record} now={now} pathway={pathway} />
					<MedicationsCard record={record} now={now} onShowAll={showMedications} />
					<OxygenAndInfusionsCard record={record} now={now} onShowAll={showMedications} />
					<RecentOrdersCard record={record} now={now} onShowAll={onShowSection && (() => onShowSection("orders"))} />
					<EncounterCard record={record} now={now} />
					<ReferralsCard record={record} />
				</div>
			</div>
		</div>
	);
}

export { KeyLabTile, keyLabsGrid, PatientBriefBanner, PatientOverview, type OverviewLinkedSection };
