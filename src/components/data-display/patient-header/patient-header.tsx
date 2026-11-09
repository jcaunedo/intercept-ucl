import * as React from "react";

import { Button } from "@/components/buttons/button";
import {
	PatientCardTags,
	patientCardAcuityLevels,
	scoreTrendClassName,
	type PatientCensusCardProps,
} from "@/components/cards/patient-census-card";
import { Avatar, AvatarFallback, AvatarImage, type AvatarFallbackProps } from "@/components/data-display/avatar";
import { Typography } from "@/components/typography/typography";
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
		/** The early-warning score with its level, e.g. NEWS2 10 High: the first column on the right. */
		acuity?: PatientCensusCardProps["acuity"];
		/**
		 * The score's change in the last 24 h, e.g. ▲ +1 (`trend`, `value`): the second column.
		 */
		trajectory?: PatientCensusCardProps["trajectory"];
		/**
		 * The patient's worst open alert, with `count` the number of open alerts: the "Active alerts" column, the count in
		 * the alert's severity color. Without one, or `resolved`, it reads 0.
		 */
		alert?: PatientCensusCardProps["alert"];
		/**
		 * The open alerts by severity, e.g. `{ critical: 1, low: 1 }`: when given, the count is their total, in the worst
		 * one's color. Without it, `alert` sets both.
		 */
		alertCounts?: PatientHeaderAlertCounts;
		/** @deprecated Ignored since Nov 9, 2026: the header no longer has "View breakdown". */
		onViewScore?: () => void;
		/** Shows "View alerts" after the count, e.g. to open a panel with the patient's alerts. */
		onViewAlerts?: () => void;
		/** Photo URL. Without it, the avatar shows `initials`. */
		photo?: string;
		initials?: string;
		/** Initials color, 1–10. */
		tone?: AvatarFallbackProps["tone"];
		/** More facts after the location, e.g. "ICU day 3", "64 kg". */
		details?: string[];
		/** Heading level for the name. Defaults to `h1`: the bar heads the patient's page. */
		headingLevel?: "h1" | "h2";
		/** The bar's right side, e.g. a Messages button. */
		actions?: React.ReactNode;
	};

type PatientHeaderAlertSeverity = "critical" | "high" | "medium" | "low";

/** Open alerts by severity. */
type PatientHeaderAlertCounts = Partial<Record<PatientHeaderAlertSeverity, number>>;

// Worst first: the count's color comes from the first with any.
const alertSeverities: PatientHeaderAlertSeverity[] = ["critical", "high", "medium", "low"];

const alertCountClassNames: Record<PatientHeaderAlertSeverity, string> = {
	critical: "text-severity-critical",
	high: "text-severity-high",
	medium: "text-severity-medium",
	low: "text-severity-low",
};

/** The 1px rule before each of the header's right-hand columns, full height. */
function PatientHeaderRule() {
	return <span aria-hidden='true' className='w-px shrink-0 self-stretch bg-border' />;
}

/** One column on the header's right: a label over a large value, centered in the column's height. */
function PatientHeaderStat({ label, value }: { label: string; value: React.ReactNode }) {
	return (
		<div className='flex min-w-0 flex-1 flex-col justify-center px-2 py-1'>
			<div className='flex min-w-0 flex-col gap-3'>
				<span className='truncate text-lg/7 text-foreground'>{label}</span>
				<span className='flex items-center whitespace-nowrap'>{value}</span>
			</div>
		</div>
	);
}

/**
 * Heads a patient's page: photo (a circle) beside the name and one line with MRN, sex and age, and location; under them
 * the tags, from the left edge (one line that scrolls sideways). On the right half, with a score, change or alert: the
 * early-warning score, its change in the last 24 h and the open alerts (in the worst one's severity color, with View
 * alerts after it), in three equal columns. An optional slot at the end takes actions.
 *
 * Figma: [intercept.ds › Patient Header](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1191-3147)
 */
function PatientHeader({
	lastName,
	firstName,
	mrn,
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
	onViewScore: _onViewScore,
	onViewAlerts,
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
	// "MRN 01033876 - F, 59": the identifiers first, then sex and age, as intercept.ds writes them.
	const demographics = [sex, age].filter((part) => part !== undefined && part !== "").join(", ");
	const identity = [mrn ? `MRN ${mrn}` : undefined, demographics].filter(Boolean).join(" - ");
	const facts = [identity, hospital, unit, room, bed, ...details].filter(Boolean);

	const acuityLevel = acuity?.level ?? (acuity && acuity.score === undefined ? "unknown" : undefined);
	// From the counts by severity when given; otherwise the worst alert and its count.
	const severityCounts = alertSeverities
		.map((severity) => ({ severity, count: alertCounts?.[severity] ?? 0 }))
		.filter(({ count }) => count > 0);
	const pillSeverity = alert && alert.variant !== "resolved" && alert.variant !== "message" ? alert.variant : undefined;
	const worstSeverity = severityCounts[0]?.severity ?? pillSeverity;
	const alertCount = severityCounts.length
		? severityCounts.reduce((total, { count }) => total + count, 0)
		: pillSeverity
			? (alert?.count ?? 1)
			: 0;
	const hasStats = Boolean(acuity || trajectory || alert || alertCounts || onViewAlerts);

	return (
		<div data-slot='patient-header' className={cn("flex items-center gap-4 px-6 py-4", className)} {...props}>
			<div className='flex min-w-0 flex-1 basis-0 flex-col gap-3'>
				<div className='flex min-w-0 items-center gap-4'>
					{/* 56px, above Avatar's sizes, and Avatar's circle; the initials keep Avatar's proportion (11px at 32px). */}
					<Avatar aria-hidden='true' className='size-14'>
						{photo ? <AvatarImage src={photo} alt='' /> : null}
						<AvatarFallback tone={tone} className='text-[19px]'>
							{initials}
						</AvatarFallback>
					</Avatar>

					<div className='flex min-w-0 flex-1 flex-col gap-px'>
						<Typography as={headingLevel} size='3xl' weight='bold' className='break-words'>
							{lastName}, {firstName}
						</Typography>
						{facts.length ? <p className='text-base text-foreground'>{facts.join(" · ")}</p> : null}
					</div>
				</div>

				{/* The cards' tag row, from the left edge under the avatar: 32px outline tags on one line that scrolls
				    sideways, each flag opening its popover. */}
				{tags.length ? <PatientCardTags tags={tags} name={`${firstName} ${lastName}`} /> : null}
			</div>

			{hasStats ? (
				// The right half, as wide as the patient's side, 12px from it: the score, its change and the open alerts in
				// equal columns, each after a rule, 16px apart.
				<div data-slot='patient-header-stats' className='-ml-1 flex min-w-0 flex-1 basis-0 gap-4 self-stretch'>
					{acuity ? (
						<>
							<PatientHeaderRule />
							<PatientHeaderStat
								label={acuity.label}
								value={
									<span className='flex items-baseline gap-2'>
										<span className='text-[32px]/[30px] font-semibold text-foreground tabular-nums'>{acuity.score ?? "--"}</span>
										{acuityLevel ? (
											<span className={cn("text-2xl/[30px]", patientCardAcuityLevels[acuityLevel].className)}>
												{patientCardAcuityLevels[acuityLevel].label}
											</span>
										) : null}
									</span>
								}
							/>
						</>
					) : null}
					{trajectory ? (
						<>
							<PatientHeaderRule />
							<PatientHeaderStat
								label={trajectory.label ?? "Change in last 24 h"}
								value={
									<span className='flex items-center gap-0.5'>
										{trajectory.trend ? (
											<span aria-hidden='true' className={cn("text-[32px]/6 font-semibold", scoreTrendClassName(trajectory))}>
												{trajectory.trend === "up" ? "▲" : "▼"}
											</span>
										) : null}
										<span className='text-[32px]/[30px] font-medium text-foreground tabular-nums'>
											{trajectory.trend ? <span className='sr-only'>{trajectory.trend === "up" ? "Up " : "Down "}</span> : null}
											{trajectory.value ?? "--"}
										</span>
									</span>
								}
							/>
						</>
					) : null}
					<PatientHeaderRule />
					<PatientHeaderStat
						label='Active alerts'
						value={
							// The count, then 12px to View alerts (Button `outline` `sm`), centered on each other.
							<span className='flex items-center gap-3'>
								<span
									className={cn(
										"text-[32px]/[30px] font-semibold tabular-nums",
										worstSeverity && alertCount ? alertCountClassNames[worstSeverity] : "text-foreground",
									)}
								>
									{alertCount}
								</span>
								{onViewAlerts ? (
									<Button variant='outline' size='sm' onClick={onViewAlerts}>
										View alerts
									</Button>
								) : null}
							</span>
						}
					/>
				</div>
			) : null}

			{actions ? <div className='flex shrink-0 items-center gap-2'>{actions}</div> : null}
		</div>
	);
}

export { PatientHeader, type PatientHeaderAlertCounts, type PatientHeaderProps };
