import * as React from "react";

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
		 * The score's change in the last 24 h, e.g. ▲ +1 (`trend`, `value`): the second column, with "Previous: 9" when
		 * both the score and the change are numbers.
		 */
		trajectory?: PatientCensusCardProps["trajectory"];
		/**
		 * The patient's worst open alert, with `count` the number of open alerts: the "Active alerts" column, the count in
		 * the alert's severity color. Without one, or `resolved`, it reads 0.
		 */
		alert?: PatientCensusCardProps["alert"];
		/** Shows "View breakdown" under the score, e.g. to go to the score's inputs. */
		onViewScore?: () => void;
		/** Shows "View alerts" under the count, e.g. to go to the patient's alerts. */
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

const alertCountClassNames = {
	critical: "text-severity-critical",
	high: "text-severity-high",
	medium: "text-severity-medium",
	low: "text-severity-low",
} as const;

// The score's change arrives preformatted ("+1", "−2"); an API would send the number.
const toNumber = (value: React.ReactNode) => {
	if (typeof value === "number") return value;
	if (typeof value !== "string" || value.trim() === "") return undefined;
	const number = Number(value.replace(/[−–]/g, "-"));
	return Number.isFinite(number) ? number : undefined;
};

/**
 * One column on the header's right: a muted label over a large value at the top, a line at the bottom. A rule on its
 * left separates it from what comes before.
 */
function PatientHeaderStat({ label, value, footer }: { label: string; value: React.ReactNode; footer?: React.ReactNode }) {
	return (
		<div className='flex min-w-0 flex-1 items-stretch gap-4'>
			<span aria-hidden='true' className='w-px shrink-0 bg-border' />
			<div className='flex min-w-0 flex-1 flex-col justify-between gap-2 px-2 py-1'>
				<div className='flex flex-col gap-1.5'>
					<span className='truncate text-base font-medium text-muted-foreground'>{label}</span>
					<span className='flex items-center whitespace-nowrap'>{value}</span>
				</div>
				{footer ? <div className='text-sm'>{footer}</div> : null}
			</div>
		</div>
	);
}

/**
 * "View breakdown" and "View alerts": text links in the line's own size and color, always underlined so they read as
 * links among the plain lines ("Previous: 9"); hover thickens the underline.
 */
function PatientHeaderLink({ children, ...props }: React.ComponentProps<"button">) {
	return (
		<button
			type='button'
			className='rounded-sm text-foreground underline underline-offset-4 outline-none hover:decoration-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
			{...props}
		>
			{children}
		</button>
	);
}

/**
 * Heads a patient's page: photo (a circle) beside the name and one line with MRN, sex and age, and location; under them
 * the tags, from the left edge (one line that scrolls sideways). On the right half, with a score, change or alert: the
 * early-warning score, its change in the last 24 h and the open alerts, in columns. An optional slot at the end takes
 * actions.
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
	acuity,
	trajectory,
	onViewScore,
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
	const change = toNumber(trajectory?.value);
	const score = toNumber(acuity?.score);
	const previous = score !== undefined && change !== undefined ? score - change : undefined;
	const openAlert = alert && alert.variant !== "resolved" && alert.variant !== "message" ? alert.variant : undefined;
	const alertCount = openAlert ? (alert?.count ?? 1) : 0;
	const hasStats = Boolean(acuity || trajectory || alert || onViewAlerts);

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
				// The right half, as wide as the patient's side, 12px from it: one column per number, each after a rule.
				<div data-slot='patient-header-stats' className='-ml-1 flex min-w-0 flex-1 basis-0 gap-4 self-stretch'>
					{acuity ? (
						<PatientHeaderStat
							label={acuity.label}
							value={
								<span className='flex items-baseline gap-2'>
									<span className='text-[28px]/[30px] font-semibold text-foreground tabular-nums'>{acuity.score ?? "--"}</span>
									{acuityLevel ? (
										<span className={cn("text-2xl/[30px]", patientCardAcuityLevels[acuityLevel].className)}>
											{patientCardAcuityLevels[acuityLevel].label}
										</span>
									) : null}
								</span>
							}
							footer={onViewScore ? <PatientHeaderLink onClick={onViewScore}>View breakdown</PatientHeaderLink> : null}
						/>
					) : null}
					{trajectory ? (
						<PatientHeaderStat
							label={trajectory.label ?? "Change in last 24 h"}
							value={
								<span className='flex items-center gap-0.5'>
									{trajectory.trend ? (
										<span aria-hidden='true' className={cn("text-[22px]/6 font-semibold", scoreTrendClassName(trajectory))}>
											{trajectory.trend === "up" ? "▲" : "▼"}
										</span>
									) : null}
									<span className='text-[28px]/[30px] font-semibold text-foreground tabular-nums'>
										{trajectory.trend ? <span className='sr-only'>{trajectory.trend === "up" ? "Up " : "Down "}</span> : null}
										{trajectory.value ?? "--"}
									</span>
								</span>
							}
							footer={
								previous !== undefined ? (
									<span className='text-muted-foreground'>
										Previous: <span className='text-foreground tabular-nums'>{previous}</span>
									</span>
								) : null
							}
						/>
					) : null}
					<PatientHeaderStat
						label='Active alerts'
						value={
							<span
								className={cn(
									"text-[28px]/[30px] font-semibold tabular-nums",
									openAlert ? alertCountClassNames[openAlert] : "text-foreground",
								)}
							>
								{alertCount}
							</span>
						}
						footer={onViewAlerts ? <PatientHeaderLink onClick={onViewAlerts}>View alerts</PatientHeaderLink> : null}
					/>
				</div>
			) : null}

			{actions ? <div className='flex shrink-0 items-center gap-2'>{actions}</div> : null}
		</div>
	);
}

export { PatientHeader, type PatientHeaderProps };
