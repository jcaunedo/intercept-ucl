import * as React from "react";
import { BellRingIcon, MapPinIcon, MinusIcon, TrendingDownIcon, TrendingUpIcon } from "lucide-react";

import { Button } from "@/components/buttons/button";
import {
	PatientCardTags,
	patientCardAcuityLevels,
	scoreChangeSummary,
	scoreTrendClassName,
	type PatientCensusCardProps,
} from "@/components/cards/patient-census-card";
import { Avatar, AvatarFallback, AvatarImage, type AvatarFallbackProps } from "@/components/data-display/avatar";
import { Typography } from "@/components/typography/typography";
import { useCurrentMinute } from "@/lib/hooks/use-current-minute";
import { formatRelativeDate } from "@/lib/relative-date";
import { cn } from "@/lib/utils";

type PatientHeaderProps = Omit<React.ComponentProps<"div">, "children"> &
	Pick<
		PatientCensusCardProps,
		| "lastName"
		| "firstName"
		| "mrn"
		| "sex"
		| "age"
		| "hospital"
		| "unit"
		| "room"
		| "bed"
		| "tags"
	> & {
		/** The hospital account (encounter) number, after the MRN: "MRN 01033876 · ACCT 6325DF2". */
		account?: string;
		/** The early-warning score with its level, e.g. NEWS2 10 High: the first column on the right, named by the score. */
		acuity?: PatientCensusCardProps["acuity"];
		/** The score's change in the last 24 h, e.g. +1: the arrow and "1 point up in 24 h" under the score. */
		trajectory?: PatientCensusCardProps["trajectory"];
		/**
		 * How the patient is doing, from a documented clinical assessment or an approved calculation (PRD PC-031), and
		 * when it was last assessed: the Clinical status column ("Deteriorating", "Last assessed 2 min ago").
		 */
		clinicalStatus?: PatientHeaderClinicalStatus;
		/** Every alert in a recent window, resolved ones included: "Alerts · 6 alerts in last 12 h". */
		recentAlerts?: { count: number; period: string };
		/**
		 * The patient's worst open alert, with `count` the number of open alerts: the alerts button's count when there's no
		 * `alertCounts`. Without one, or `resolved`, there are none.
		 */
		alert?: PatientCensusCardProps["alert"];
		/** The open alerts by severity, e.g. `{ critical: 1, low: 1 }`: when given, the alerts button counts their total. */
		alertCounts?: PatientHeaderAlertCounts;
		/**
		 * Shows the alerts button, e.g. to open a panel with the patient's alerts: "2 active alerts" (red) while any is open,
		 * "No active alerts" (outline) otherwise, so earlier alerts are still a click away.
		 */
		onViewAlerts?: () => void;
		/** Whether what the alerts button opens is open (`aria-expanded`). */
		alertsOpen?: boolean;
		/** @deprecated Ignored since Nov 11, 2026: Live feed moved to AppHeader's patient variant (`onOpenLiveFeed`). */
		onOpenLiveFeed?: () => void;
		/** @deprecated Ignored since Nov 11, 2026, with `onOpenLiveFeed`. */
		liveFeedOpen?: boolean;
		/** Photo URL. Without it, the avatar shows `initials`. */
		photo?: string;
		initials?: string;
		/** Initials color, 1–10. */
		tone?: AvatarFallbackProps["tone"];
		/** More facts after the location, e.g. "ICU day 3", "64 kg". Intercept Live passes none since Nov 11, 2026. */
		details?: string[];
		/** Heading level for the name. Defaults to `h1`: the bar heads the patient's page. */
		headingLevel?: "h1" | "h2";
		/** More of the bar's right side, after its columns. */
		actions?: React.ReactNode;
		/** @deprecated Ignored since Nov 9, 2026: the header no longer has "View breakdown". */
		onViewScore?: () => void;
	};

type PatientHeaderAlertSeverity = "critical" | "high" | "medium" | "low";

/** Open alerts by severity. */
type PatientHeaderAlertCounts = Partial<Record<PatientHeaderAlertSeverity, number>>;

const alertSeverities: PatientHeaderAlertSeverity[] = ["critical", "high", "medium", "low"];

// The alerts button by the highest open severity: its fill and white label, as the cards' alert bar, darkened under the
// solid buttons' 20% black on hover. Full class names, so Tailwind sees them.
const alertButtonSeverityClassNames: Record<PatientHeaderAlertSeverity, string> = {
	critical: "bg-severity-critical text-severity-foreground hover:bg-[color-mix(in_srgb,var(--severity-critical)_80%,black)]",
	high: "bg-severity-high text-severity-foreground hover:bg-[color-mix(in_srgb,var(--severity-high)_80%,black)]",
	medium: "bg-severity-medium text-severity-foreground hover:bg-[color-mix(in_srgb,var(--severity-medium)_80%,black)]",
	low: "bg-severity-low text-severity-foreground hover:bg-[color-mix(in_srgb,var(--severity-low)_80%,black)]",
};

/** PRD PC-031's trajectory statuses. */
type PatientHeaderClinicalStatusValue = "improving" | "stable" | "deteriorating" | "insufficient-data";

type PatientHeaderClinicalStatus = {
	status: PatientHeaderClinicalStatusValue;
	/** When it was last assessed: "Last assessed 2 min ago", updated each minute. */
	assessedAt?: string;
};

const clinicalStatusLabels: Record<PatientHeaderClinicalStatusValue, string> = {
	improving: "Improving",
	stable: "Relatively stable",
	deteriorating: "Deteriorating",
	"insufficient-data": "Insufficient data",
};

/**
 * One of the right side's columns, after a rule: its label, then its value and the line under it, centered. A column
 * whose content is a single control (`bottom`) puts it 2px above the bottom of the same 50px, level with the others'
 * last line.
 */
function PatientHeaderColumn({
	label,
	bottom = false,
	children,
}: {
	label: React.ReactNode;
	bottom?: boolean;
	children: React.ReactNode;
}) {
	const labelId = React.useId();
	return (
		<>
			<span aria-hidden='true' className='w-px shrink-0 self-stretch bg-border' />
			<div role='group' aria-labelledby={labelId} className='flex min-w-0 flex-1 flex-col justify-center gap-2'>
				<p id={labelId} className='text-sm text-foreground'>
					{label}
				</p>
				<div className={cn("flex min-w-0 flex-col items-start", bottom && "min-h-[50px] justify-end pb-0.5")}>{children}</div>
			</div>
		</>
	);
}

/**
 * Heads a patient's page: photo (a circle) beside the name, with sex and age after it, and a line with the MRN and
 * account number and the location after a pin; under them the tags, from the left edge (one line that scrolls
 * sideways). On the right, as wide as the patient's side, columns after rules: the early-warning score with its change,
 * the clinical status with when it was assessed, and the alerts ("2 active alerts" in red, "No active alerts" in
 * outline, with `onViewAlerts`), each shown with its data; then any `actions`.
 *
 * Figma: [intercept.ds › Patient Header](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1191-3147)
 */
function PatientHeader({
	lastName,
	firstName,
	mrn,
	account,
	sex,
	age,
	hospital,
	unit,
	room,
	bed,
	alert,
	alertCounts,
	acuity,
	trajectory,
	clinicalStatus,
	recentAlerts,
	onViewScore: _onViewScore,
	onViewAlerts,
	alertsOpen,
	onOpenLiveFeed: _onOpenLiveFeed,
	liveFeedOpen: _liveFeedOpen,
	tags = [],
	photo,
	initials,
	tone,
	details = [],
	headingLevel = "h1",
	actions,
	className,
	...props
}: PatientHeaderProps) {
	// "Miller, Sarah - F, 59": sex and age after the name, regular.
	const demographics = [sex, age].filter((part) => part !== undefined && part !== "").join(", ");
	// "{hospital} · {unit} · {room} - {bed}", then any details.
	const place = [room, bed].filter(Boolean).join(" - ");
	const location = [hospital, unit, place, ...details].filter(Boolean).join(" · ");

	// The open alerts: the counts by severity when given, else the worst alert's count.
	const counted = alertSeverities.reduce((total, severity) => total + (alertCounts?.[severity] ?? 0), 0);
	const pillOpen = alert && alert.variant !== "resolved" && alert.variant !== "message";
	const openAlerts = alertCounts ? counted : pillOpen ? (alert?.count ?? 1) : 0;
	// The highest open severity colors the alerts button: the first in the counts, else the worst alert's.
	const topSeverity: PatientHeaderAlertSeverity | undefined =
		openAlerts === 0
			? undefined
			: ((alertCounts
					? alertSeverities.find((severity) => (alertCounts[severity] ?? 0) > 0)
					: pillOpen
						? (alert?.variant as PatientHeaderAlertSeverity)
						: undefined) ?? "critical");
	const now = useCurrentMinute();
	const acuityLevel = acuity?.level ?? (acuity && acuity.score === undefined ? "unknown" : undefined);
	const { direction, text: changeText } = scoreChangeSummary(trajectory);
	const TrendIcon = direction === "up" ? TrendingUpIcon : direction === "down" ? TrendingDownIcon : MinusIcon;
	const hasColumns = Boolean(acuity || trajectory || clinicalStatus || onViewAlerts || actions);

	return (
		<div data-slot='patient-header' className={cn("flex items-center gap-4 py-4 pr-10 pl-6", className)} {...props}>
			<div className='flex min-w-0 flex-1 flex-col gap-2'>
				<div className='flex min-w-0 items-center gap-4'>
					{/* 56px, above Avatar's sizes, and Avatar's circle; the initials keep Avatar's proportion (11px at 32px). */}
					<Avatar aria-hidden='true' className='size-14'>
						{photo ? <AvatarImage src={photo} alt='' /> : null}
						<AvatarFallback tone={tone} className='text-[19px]'>
							{initials}
						</AvatarFallback>
					</Avatar>

					<div className='flex min-w-0 flex-1 flex-col'>
						{/* Sex and age follow the name on its line, outside the heading, so the page is still named by the
						    patient alone (PRD PD-OD-01). */}
						<p className='min-w-0 font-display text-3xl break-words text-foreground'>
							<Typography as={headingLevel} size='3xl' weight='bold' className='inline'>
								{lastName}, {firstName}
							</Typography>
							{/* 24px regular, on the name's baseline (inline text shares it). */}
							{demographics ? <span className='text-2xl'> - {demographics}</span> : null}
						</p>
						{/* One line, 12px between its parts, wrapping part by part when the room runs out. */}
						<div className='flex min-w-0 flex-wrap items-center gap-x-3 text-base font-medium text-foreground'>
							{mrn || account ? (
								<p>
									{mrn ? (
										<>
											<span className='text-muted-foreground'>MRN</span> {mrn}
										</>
									) : null}
									{mrn && account ? " · " : null}
									{account ? (
										<>
											<span className='text-muted-foreground'>ACCT</span> {account}
										</>
									) : null}
								</p>
							) : null}
							{location ? (
								<p className='flex min-w-0 items-center gap-1'>
									<MapPinIcon aria-hidden='true' className='size-4.5 shrink-0 text-icon-muted' />
									<span className='sr-only'>Location: </span>
									{location}
								</p>
							) : null}
						</div>
					</div>
				</div>

				{/* The cards' tag row, from the left edge under the avatar: 32px outline tags on one line that scrolls
				    sideways, each flag opening its popover. */}
				{tags.length ? <PatientCardTags tags={tags} name={`${firstName} ${lastName}`} /> : null}
			</div>

			{hasColumns ? (
				// As wide as the patient's side, as tall as the bar's content: the columns' rules run its full height.
				<div data-slot='patient-header-columns' className='flex min-w-0 flex-1 items-stretch gap-4 self-stretch'>
					{acuity || trajectory ? (
						<PatientHeaderColumn label={acuity?.label ?? "Score"}>
							{acuity ? (
								<p className='flex items-baseline gap-2 text-xl/[30px] text-foreground'>
									<span className='font-semibold tabular-nums'>{acuity.score ?? "--"}</span>
									{/* The level keeps the cards' colors, so it reads the same everywhere. */}
									{acuityLevel ? (
										<span className={patientCardAcuityLevels[acuityLevel].className}>
											{patientCardAcuityLevels[acuityLevel].label}
										</span>
									) : null}
								</p>
							) : null}
							{changeText ? (
								<p
									className={cn(
										"flex items-center gap-1 text-sm",
										direction ? scoreTrendClassName({ ...trajectory, trend: direction }) : "text-muted-foreground",
									)}
								>
									<TrendIcon aria-hidden='true' className='size-4 shrink-0' />
									{changeText}
								</p>
							) : null}
						</PatientHeaderColumn>
					) : null}
					{clinicalStatus ? (
						<PatientHeaderColumn label='Clinical status'>
							<p className='text-xl/[30px] font-semibold text-foreground'>{clinicalStatusLabels[clinicalStatus.status]}</p>
							{clinicalStatus.assessedAt && now !== null ? (
								<p className='text-sm text-muted-foreground'>
									Last assessed{" "}
									<time dateTime={clinicalStatus.assessedAt} title={formatRelativeDate(clinicalStatus.assessedAt, now).title}>
										{formatRelativeDate(clinicalStatus.assessedAt, now).label.replace(/^Just now$/, "just now")}
									</time>
								</p>
							) : null}
						</PatientHeaderColumn>
					) : null}
					{onViewAlerts ? (
						<PatientHeaderColumn
							bottom
							label={
								<>
									Alerts
									{recentAlerts ? (
										<span className='text-muted-foreground'>
											{" "}
											· {recentAlerts.count} {recentAlerts.count === 1 ? "alert" : "alerts"} in last {recentAlerts.period}
										</span>
									) : null}
								</>
							}
						>
							{/* While an alert is open, the highest open severity's color, as the cards' alert bar shows it (Critical
							    red, High orange, Medium amber, Low blue); the outline look with none, pressed on `accent` while its
							    panel is open. */}
							<Button
								variant={topSeverity ? "destructive" : "outline"}
								size='md'
								aria-expanded={alertsOpen}
								onClick={onViewAlerts}
								data-severity={topSeverity}
								className={cn(
									topSeverity && alertButtonSeverityClassNames[topSeverity],
									!topSeverity && alertsOpen && "bg-accent",
								)}
							>
								<BellRingIcon aria-hidden='true' />
								{openAlerts > 0 ? `${openAlerts} active ${openAlerts === 1 ? "alert" : "alerts"}` : "No active alerts"}
							</Button>
						</PatientHeaderColumn>
					) : null}
					{actions ? <div className='flex shrink-0 items-center gap-4'>{actions}</div> : null}
				</div>
			) : null}
		</div>
	);
}

export {
	PatientHeader,
	type PatientHeaderAlertCounts,
	type PatientHeaderClinicalStatus,
	type PatientHeaderClinicalStatusValue,
	type PatientHeaderProps,
};
