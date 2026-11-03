import * as React from "react";
import { ChevronDownIcon, MessageCircleIcon } from "lucide-react";

import { Button } from "@/components/buttons/button";
import { PatientMonitor } from "@/components/cards/patient-monitoring-card";
import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from "@/components/data-display/avatar";
import { useCurrentMinute } from "@/lib/hooks/use-current-minute";
import { formatRelativeDate } from "@/lib/relative-date";
import { cn } from "@/lib/utils";

import {
	compareTriageAlerts,
	isOpenAlert,
	lastFiredAt,
	sortAddressedAlerts,
	TriageAlertList,
	type TriageAlert,
} from "../monitoring/triage-queue";
import { ActivityCard, CarePlanCard } from "./activity";
import aiBriefIcon from "./images/ai-brief.svg";
import type { PatientBrief, PatientDetailsProps, PatientEarlyWarning, PatientFluids, PatientLab } from "./patient-details";
import { Detail, formatElapsed, formatTime, freshness, NoData, SectionCard } from "./section-parts";
import { SourceLabel } from "../shared/source-label";

// The Overview (PRD Patient details §5): what matters about the patient now. The AI brief, the live monitor, the early
// warning score with intake and output, organ support and key labs in the main column; alerts, the care team and the
// encounter in a narrow rail on the right. Data that's missing says it's missing, and only an empty list says there's
// none.

// Flags in words and a letter, never color alone (PRD PD-040).
const labFlags: Record<NonNullable<PatientLab["flag"]>, { letter: string; label: string; className: string }> = {
	high: { letter: "H", label: "High", className: "text-badge-amber-foreground" },
	low: { letter: "L", label: "Low", className: "text-badge-amber-foreground" },
	critical: { letter: "Critical", label: "Critical", className: "text-severity-critical" },
};

/** The change since the previous result, as an arrow. */
function labDirection(lab: PatientLab) {
	if (!lab.previous || lab.value === undefined) return undefined;
	const delta = Number.parseFloat(lab.value) - Number.parseFloat(lab.previous.value);
	return delta > 0 ? "▲" : delta < 0 ? "▼" : undefined;
}

/**
 * One lab as a tile: name, value with its unit and flag, the previous value and when it resulted. A lab that isn't
 * resulted yet shows "--" and when it was collected.
 */
function LabTile({ lab, now }: { lab: PatientLab; now: number | null }) {
	const flag = lab.flag ? labFlags[lab.flag] : undefined;
	const pending = lab.value === undefined;
	const direction = labDirection(lab);

	return (
		<li className='flex min-w-0 flex-col gap-1 rounded-lg bg-background-subtle px-3 py-2.5'>
			<span className='flex items-baseline justify-between gap-2 text-xs'>
				<span className='truncate font-medium text-muted-foreground'>{lab.name}</span>
				{!pending && lab.resultedAt && now !== null ? (
					<span className='shrink-0 text-muted-foreground'>{formatRelativeDate(lab.resultedAt, now).label}</span>
				) : null}
			</span>
			{pending ? (
				<>
					<span className='text-2xl font-semibold text-muted-foreground'>--</span>
					<span className='text-xs text-muted-foreground'>
						{lab.collectedAt ? `Pending · collected ${formatTime(lab.collectedAt)}` : "Pending"}
					</span>
				</>
			) : (
				<>
					<span className='flex items-baseline gap-1'>
						<span className='text-2xl font-semibold text-foreground tabular-nums'>{lab.value}</span>
						{lab.unit ? <span className='text-xs text-muted-foreground'>{lab.unit}</span> : null}
						{flag ? (
							<span className={cn("ml-auto text-xs font-bold", flag.className)}>
								<span aria-hidden='true'>{flag.letter}</span>
								<span className='sr-only'>{flag.label}</span>
							</span>
						) : null}
					</span>
					{lab.previous ? (
						<span className='text-xs text-muted-foreground'>
							{direction ? <span aria-hidden='true'>{direction} </span> : null}
							Was {lab.previous.value} at {formatTime(lab.previous.at)}
						</span>
					) : null}
				</>
			)}
		</li>
	);
}

const presenceLabels = { online: "Online", away: "Away", offline: "Offline" } as const;

/**
 * The AI brief (PRD PD-024; Intercept-Live `157:9656`): what matters now, in a sentence or two, marked as Intercept's,
 * with how many sources it read and how fresh it is. It updates as data arrives.
 */
function BriefCard({ brief, now }: { brief: PatientBrief; now: number | null }) {
	const footer = [
		`From ${brief.sourceCount} sources`,
		now === null ? null : `last change ${formatElapsed(brief.updatedAt, now)}.`,
	]
		.filter(Boolean)
		.join(" · ");

	return (
		<section
			aria-label='Brief'
			className='flex flex-col gap-2 rounded-lg border border-tone-accent-defined bg-tone-accent-subtle px-5 py-4'
		>
			<p className='flex items-center gap-2 text-xs text-tone-accent'>
				<img src={aiBriefIcon} alt='' className='size-4' />
				Brief written by Intercept, updates as data arrives
			</p>
			<p className='text-xl text-foreground'>{brief.text}</p>
			<p className='text-xs text-muted-foreground'>
				<SourceLabel className='mr-1 align-[-2px]'>{footer}</SourceLabel>
				{brief.lastViewedAt ? ` You last looked at ${formatTime(brief.lastViewedAt)}.` : null} What's new to you is
				shaded on the timeline.
			</p>
		</section>
	);
}

/**
 * The score's trend as a line, oldest to newest, over a dashed line at the alert threshold. Decorative: the values and
 * times are the list under it.
 */
function ScoreTrendLine({ trend, threshold }: Pick<PatientEarlyWarning, "trend" | "threshold">) {
	const times = trend.map((point) => Date.parse(point.at));
	const start = times[0];
	const span = Math.max(1, times[times.length - 1] - start);
	const top = Math.max(threshold + 3, ...trend.map((point) => point.value + 1));
	const y = (value: number) => 40 - (value / top) * 40;
	const points = trend.map((point, index) => `${((times[index] - start) / span) * 100},${y(point.value)}`).join(" ");

	return (
		<svg aria-hidden='true' viewBox='0 0 100 40' preserveAspectRatio='none' className='h-12 w-full overflow-visible'>
			<line
				x1='0'
				x2='100'
				y1={y(threshold)}
				y2={y(threshold)}
				className='stroke-severity-high'
				strokeWidth='1'
				strokeDasharray='4 3'
				vectorEffect='non-scaling-stroke'
			/>
			<polyline
				points={points}
				fill='none'
				className='stroke-foreground'
				strokeWidth='2'
				strokeLinejoin='round'
				vectorEffect='non-scaling-stroke'
			/>
		</svg>
	);
}

/**
 * The deterioration score (PRD PC-030, DU-14): its value and band, whether it has crossed into the alert band, its
 * trend and the inputs that make it up, each with its points. A current-state score: it says where the patient is now,
 * never where they're going.
 */
function EarlyWarningCard({ warning, now }: { warning?: PatientEarlyWarning; now: number | null }) {
	const crossed = warning?.crossedAt !== undefined;
	return (
		<SectionCard title='Early warning score' meta={warning ? <SourceLabel>{freshness("Vitals", warning.updatedAt, now)}</SourceLabel> : undefined}>
			{warning ? (
				<>
					<div className='flex flex-wrap items-baseline gap-x-3 gap-y-1'>
						<span className='text-3xl font-semibold text-foreground tabular-nums'>{warning.value}</span>
						<span className='text-sm font-medium text-foreground'>
							{warning.score} · {warning.band}
						</span>
						<span className={cn("text-sm", crossed ? "font-medium text-severity-high" : "text-muted-foreground")}>
							{warning.crossedAt
								? `Crossed into ${warning.alertBand} (${warning.threshold} or more) at ${formatTime(warning.crossedAt)}`
								: `Below ${warning.alertBand} (${warning.threshold} or more)`}
						</span>
					</div>

					{warning.trend.length > 1 ? (
						<div className='flex flex-col gap-1.5'>
							<ScoreTrendLine trend={warning.trend} threshold={warning.threshold} />
							<ol aria-label='Trend' className='flex justify-between gap-2 text-xs text-muted-foreground'>
								{warning.trend.map((point, index) => (
									<li key={point.at} className='flex flex-col last:items-end'>
										<span className='font-semibold text-foreground tabular-nums'>{point.value}</span>
										{index === warning.trend.length - 1 ? "Now" : formatTime(point.at)}
									</li>
								))}
							</ol>
						</div>
					) : null}

					<table className='w-full text-sm'>
						<caption className='sr-only'>What makes up the score</caption>
						<thead className='sr-only'>
							<tr>
								<th scope='col'>Input</th>
								<th scope='col'>Value</th>
								<th scope='col'>Points</th>
							</tr>
						</thead>
						<tbody className='divide-y divide-border-muted'>
							{warning.inputs.map((input) => (
								<tr key={input.label} className={input.points ? "text-foreground" : "text-muted-foreground"}>
									<th scope='row' className='py-1.5 text-left font-normal'>
										{input.label}
									</th>
									<td className='py-1.5 text-right tabular-nums'>{input.value}</td>
									<td className={cn("w-20 py-1.5 text-right tabular-nums", input.points ? "font-semibold" : undefined)}>
										{input.points} {input.points === 1 ? "point" : "points"}
									</td>
								</tr>
							))}
						</tbody>
						<tfoot>
							<tr className='border-t border-border font-semibold text-foreground'>
								<th scope='row' className='pt-2 text-left'>
									Total
								</th>
								<td />
								<td className='pt-2 text-right tabular-nums'>{warning.value}</td>
							</tr>
						</tfoot>
					</table>
				</>
			) : (
				<NoData>No early warning score for this patient.</NoData>
			)}
		</SectionCard>
	);
}

/** Charted intake and output (DU-18): the net fluid balance and the weight change over the same period. */
function FluidsCard({ fluids, now }: { fluids?: PatientFluids; now: number | null }) {
	return (
		<SectionCard title='Intake and output' meta={fluids ? <SourceLabel>{freshness("Charted", fluids.chartedAt, now)}</SourceLabel> : undefined}>
			{fluids ? (
				<>
					<dl className='grid grid-cols-2 gap-x-4 gap-y-3'>
						<Detail label={`Net balance · ${fluids.window}`}>
							<span className='text-2xl font-semibold tabular-nums'>{fluids.netBalance}</span>
						</Detail>
						<Detail label={`Weight · ${fluids.window}`}>
							<span className='text-2xl font-semibold tabular-nums'>{fluids.weightChange}</span>
						</Detail>
					</dl>
					{fluids.chartedBy ? (
						<p className='text-xs text-muted-foreground'>
							Charted by {fluids.chartedBy} at {formatTime(fluids.chartedAt)}
						</p>
					) : null}
				</>
			) : (
				<NoData>No intake and output charted for this patient.</NoData>
			)}
		</SectionCard>
	);
}

/**
 * The patient's alerts (PRD PD-020): the open ones, highest severity first, with the triage queue's rows and actions,
 * and the ones addressed this shift behind "Show resolved". Sized for the Overview's rail, so it has no tabs.
 */
function AlertsSection({
	alerts,
	escalationTargets,
	onAlertAction,
}: Pick<PatientDetailsProps, "escalationTargets" | "onAlertAction"> & { alerts: TriageAlert[] }) {
	const [showResolved, setShowResolved] = React.useState(false);
	const active = alerts.filter(isOpenAlert).sort(compareTriageAlerts);
	const resolved = sortAddressedAlerts(alerts.filter((alert) => !isOpenAlert(alert)));
	const lastFired = lastFiredAt(alerts);
	const list = (items: TriageAlert[]) => (
		<TriageAlertList
			alerts={items}
			patients={[]}
			escalationTargets={escalationTargets ?? []}
			onAction={(alertId, action) => onAlertAction?.(alertId, action)}
		/>
	);

	return (
		<SectionCard title='Alerts' meta={active.length ? `${active.length} active` : undefined}>
			{active.length ? (
				list(active)
			) : (
				<NoData>{lastFired ? `No active alerts · Last alert ${formatTime(lastFired)}` : "No active alerts."}</NoData>
			)}
			{resolved.length ? (
				<div className='flex flex-col items-start gap-2'>
					<Button
						variant='ghost'
						size='xs'
						aria-expanded={showResolved}
						onClick={() => setShowResolved(!showResolved)}
						className='-ml-2 text-link'
					>
						<ChevronDownIcon
							aria-hidden='true'
							className={cn("transition-transform duration-160 motion-reduce:transition-none", showResolved && "rotate-180")}
						/>
						{showResolved ? "Hide resolved" : `Show resolved (${resolved.length})`}
					</Button>
					{showResolved ? <div className='w-full'>{list(resolved)}</div> : null}
				</div>
			) : null}
		</SectionCard>
	);
}

/** The latest of the timestamps, for a section's freshness. */
const latest = (times: (string | undefined)[]) =>
	times.reduce<string | undefined>((last, time) => (time && (!last || time > last) ? time : last), undefined);

/**
 * The Overview: alerts and concerns (PD-020), the live monitor (PD-021), the early warning score (PC-030, DU-14) and
 * intake and output (DU-18), organ support (PD-022), the AI brief (PD-024), key labs (PD-025) and context (PD-026).
 *
 * On a wide canvas, the physiology is the main column (brief, monitor, score and fluids, ventilator and infusions,
 * labs) and a 22rem rail on the right holds the alerts, then what's being done about them (the care plan and the latest
 * activity, when the record has them), then the care team and encounter. On a narrow one it's a single column, with the
 * alerts straight after the brief: they're mandatory (PRD §3.4), so they never sink below the physiology.
 */
function PatientOverview({
	patient,
	record,
	monitor,
	alerts = [],
	escalationTargets = [],
	onAlertAction,
	onShowTimeline,
}: Pick<PatientDetailsProps, "patient" | "record" | "monitor" | "alerts" | "escalationTargets" | "onAlertAction"> & {
	/** Opens the Timeline, where the whole activity log is. */
	onShowTimeline?: () => void;
}) {
	const now = useCurrentMinute();
	const name = `${patient.lastName}, ${patient.firstName}`;
	const ventilator = record?.ventilator;
	const infusions = record?.infusions;
	const labs = record?.labs;
	const careTeam = record?.careTeam;
	const latestInfusion = latest(infusions?.map((infusion) => infusion.updatedAt) ?? []);
	const latestLab = latest(labs?.map((lab) => lab.resultedAt) ?? []);

	return (
		// A size container, so the layout follows the room the side panels leave. The grid areas apply only on a wide
		// canvas; a narrow one stacks them in source order.
		<div className='@container'>
			<div
				className={cn(
					"grid gap-6",
					"@min-[60rem]:grid-cols-[minmax(0,1fr)_22rem] @min-[60rem]:grid-rows-[auto_auto_1fr]",
					"@min-[60rem]:[grid-template-areas:'brief_alerts'_'main_alerts'_'main_context']",
				)}
			>
				{record?.brief ? (
					<div className='min-w-0 @min-[60rem]:[grid-area:brief]'>
						<BriefCard brief={record.brief} now={now} />
					</div>
				) : null}

				<div className='flex min-w-0 flex-col gap-6 self-start @min-[60rem]:[grid-area:alerts]'>
					<AlertsSection alerts={alerts} escalationTargets={escalationTargets} onAlertAction={onAlertAction} />
					{record?.carePlan ? <CarePlanCard plan={record.carePlan} /> : null}
					{record?.activity ? <ActivityCard activity={record.activity} onShowAll={onShowTimeline} /> : null}
				</div>

				{/* Its own size container, so ventilator and infusions sit side by side once the column has room. */}
				<div className='flex min-w-0 flex-col gap-6 self-start @container @min-[60rem]:[grid-area:main]'>
					<SectionCard
						title='Monitor'
						meta={
							monitor?.vitals ? (
								<>
									<span aria-hidden='true' className='size-2 rounded-full bg-success' />
									Live · Monitor
								</>
							) : undefined
						}
					>
						{monitor?.vitals ? (
							<PatientMonitor
								aria-label={`Bedside monitor, ${name}`}
								vitals={monitor.vitals}
								limits={monitor.limits}
								alarmPriorities={monitor.alarmPriorities}
								acknowledgedAlarms={monitor.acknowledgedAlarms}
								trends={monitor.trends}
								className='h-80'
							/>
						) : (
							<NoData>No live monitor data for this patient.</NoData>
						)}
					</SectionCard>

					<div className='grid gap-6 @min-[36rem]:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]'>
						<EarlyWarningCard warning={record?.earlyWarning} now={now} />
						<div className='self-start'>
							<FluidsCard fluids={record?.fluids} now={now} />
						</div>
					</div>

					<div className='grid gap-6 @min-[36rem]:grid-cols-2'>
						<SectionCard
							title='Ventilator'
							meta={ventilator ? <SourceLabel>{freshness(ventilator.source, ventilator.updatedAt, now)}</SourceLabel> : undefined}
						>
							{ventilator ? (
								<>
									<p className='text-sm font-medium text-foreground'>
										{[ventilator.support, ventilator.mode].filter(Boolean).join(" · ")}
									</p>
									<dl className='grid grid-cols-2 gap-x-4 gap-y-3'>
										{ventilator.settings.map((setting) => (
											<Detail key={setting.label} label={setting.label}>
												<span className='font-semibold tabular-nums'>{setting.value}</span>
												{setting.unit ? <span className='text-muted-foreground'> {setting.unit}</span> : null}
												{setting.set ? <span className='text-muted-foreground'> · set {setting.set}</span> : null}
											</Detail>
										))}
									</dl>
									{ventilator.abg ? (
										<p className='border-t border-border-muted pt-3 text-xs text-muted-foreground'>
											<span className='font-medium text-foreground'>Last ABG</span> {formatTime(ventilator.abg.collectedAt)}
											<br />
											{ventilator.abg.values}
										</p>
									) : null}
								</>
							) : (
								<NoData>No ventilator data for this patient.</NoData>
							)}
						</SectionCard>

						<SectionCard title='Infusions' meta={latestInfusion ? <SourceLabel>{freshness("Pump", latestInfusion, now)}</SourceLabel> : undefined}>
							{infusions?.length ? (
								<ul className='flex flex-col divide-y divide-border-muted'>
									{infusions.map((infusion) => (
										<li key={infusion.drug} className='flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0'>
											<span className='text-sm font-medium text-foreground'>{infusion.drug}</span>
											<span className='flex flex-col items-end text-right'>
												<span className='text-sm font-semibold text-foreground tabular-nums'>
													{infusion.rate ?? <span className='font-normal text-muted-foreground'>Rate unavailable</span>}
												</span>
												{infusion.change ? (
													<span className='text-xs text-muted-foreground'>
														<span aria-hidden='true'>{infusion.change.direction === "up" ? "▲" : "▼"} </span>
														{infusion.change.direction === "up" ? "Up" : "Down"} from {infusion.change.from} at{" "}
														{formatTime(infusion.change.at)}
													</span>
												) : null}
											</span>
										</li>
									))}
								</ul>
							) : infusions ? (
								<NoData>No infusions running.</NoData>
							) : (
								<NoData>No pump data for this patient.</NoData>
							)}
						</SectionCard>
					</div>

					<SectionCard title='Key labs' meta={latestLab ? <SourceLabel>{freshness("Lab", latestLab, now)}</SourceLabel> : undefined}>
						{labs?.length ? (
							<ul className='grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-2'>
								{labs.map((lab) => (
									<LabTile key={lab.name} lab={lab} now={now} />
								))}
							</ul>
						) : labs ? (
							<NoData>No labs resulted in the last 72 hours.</NoData>
						) : (
							<NoData>No lab data for this patient.</NoData>
						)}
					</SectionCard>
				</div>

				<div className='flex min-w-0 flex-col gap-6 self-start @min-[60rem]:[grid-area:context]'>
					<SectionCard title='Care team'>
						{careTeam?.length ? (
							<ul className='flex flex-col gap-3'>
								{careTeam.map((member) => (
									<li key={member.role} className='flex items-center gap-3'>
										<Avatar size='sm'>
											{member.src ? <AvatarImage src={member.src} alt='' /> : null}
											<AvatarFallback tone={member.tone}>{member.initials}</AvatarFallback>
											{member.presence === "online" ? <AvatarBadge /> : null}
										</Avatar>
										<div className='flex min-w-0 flex-1 flex-col'>
											<span className='truncate text-sm font-medium text-foreground'>
												{member.name}
												{member.you ? <span className='font-normal text-muted-foreground'> (you)</span> : null}
											</span>
											<span className='truncate text-xs text-muted-foreground'>
												{[member.role, member.organization, member.presence ? presenceLabels[member.presence] : undefined]
													.filter(Boolean)
													.join(" · ")}
											</span>
										</div>
										{member.you ? null : (
											<Button variant='ghost' size='icon-sm' aria-label={`Message ${member.name}`}>
												<MessageCircleIcon aria-hidden='true' />
											</Button>
										)}
									</li>
								))}
							</ul>
						) : (
							<NoData>No care team recorded.</NoData>
						)}
					</SectionCard>

					<SectionCard title='Encounter'>
						{record?.diagnosis || record?.admittedAt || record?.problems?.length ? (
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
							</dl>
						) : (
							<NoData>No diagnosis or encounter details yet.</NoData>
						)}
					</SectionCard>
				</div>
			</div>
		</div>
	);
}

export { PatientOverview };
