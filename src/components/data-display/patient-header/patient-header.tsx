import * as React from "react";
import { BellRingIcon, MapPinIcon, ZapIcon } from "lucide-react";

import { Button } from "@/components/buttons/button";
import { PatientCardScore, PatientCardTags, type PatientCensusCardProps } from "@/components/cards/patient-census-card";
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
		/** The hospital account (encounter) number, after the MRN: "MRN 01033876 · ACCT 6325DF2". */
		account?: string;
		/** The early-warning score with its level, e.g. NEWS2 10 High: the score line's start, as on the cards. */
		acuity?: PatientCensusCardProps["acuity"];
		/** The score's change in the last 24 h, e.g. ▲ +1: the score line's arrow and "1 point up in 24 h". */
		trajectory?: PatientCensusCardProps["trajectory"];
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
		/** Shows the Live feed button, e.g. to open a panel with this patient's live feed. */
		onOpenLiveFeed?: () => void;
		/** Whether the live feed is open: the button's pressed look and `aria-expanded`. */
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
		/** More of the bar's right side, after its buttons. */
		actions?: React.ReactNode;
		/** @deprecated Ignored since Nov 9, 2026: the header no longer has "View breakdown". */
		onViewScore?: () => void;
	};

type PatientHeaderAlertSeverity = "critical" | "high" | "medium" | "low";

/** Open alerts by severity. */
type PatientHeaderAlertCounts = Partial<Record<PatientHeaderAlertSeverity, number>>;

const alertSeverities: PatientHeaderAlertSeverity[] = ["critical", "high", "medium", "low"];

/**
 * Heads a patient's page: photo (a circle) beside the name, with sex and age after it, and a line with the MRN and
 * account number, the location after a pin, and the early-warning score as the cards write it; under them the tags,
 * from the left edge (one line that scrolls sideways). On the right, Live feed and the alerts ("2 active alerts" in red,
 * "No active alerts" in outline), each with its handler, then any `actions`.
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
	onViewScore: _onViewScore,
	onViewAlerts,
	alertsOpen,
	onOpenLiveFeed,
	liveFeedOpen = false,
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
	const hasButtons = Boolean(onOpenLiveFeed || onViewAlerts || actions);

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
							{acuity || trajectory ? <PatientCardScore acuity={acuity} trajectory={trajectory} className='text-base' /> : null}
						</div>
					</div>
				</div>

				{/* The cards' tag row, from the left edge under the avatar: 32px outline tags on one line that scrolls
				    sideways, each flag opening its popover. */}
				{tags.length ? <PatientCardTags tags={tags} name={`${firstName} ${lastName}`} /> : null}
			</div>

			{hasButtons ? (
				<div className='flex shrink-0 items-center gap-4'>
					{onOpenLiveFeed ? (
						// While its panel is open, the outline on the `accent` fill, as AppHeader's panel buttons.
						<Button
							variant='outline'
							size='lg'
							aria-expanded={liveFeedOpen}
							onClick={onOpenLiveFeed}
							className={cn(liveFeedOpen && "bg-accent")}
						>
							<ZapIcon aria-hidden='true' />
							Live feed
						</Button>
					) : null}
					{onViewAlerts ? (
						// Always there (Nov 11, 2026, user's call: "still missing the Alerts button"): red while an alert is open,
						// the outline look with none, pressed on `accent` like Live feed while its panel is open.
						<Button
							variant={openAlerts > 0 ? "destructive" : "outline"}
							size='lg'
							aria-expanded={alertsOpen}
							onClick={onViewAlerts}
							className={cn(openAlerts === 0 && alertsOpen && "bg-accent")}
						>
							<BellRingIcon aria-hidden='true' />
							{openAlerts > 0 ? `${openAlerts} active ${openAlerts === 1 ? "alert" : "alerts"}` : "No active alerts"}
						</Button>
					) : null}
					{actions}
				</div>
			) : null}
		</div>
	);
}

export { PatientHeader, type PatientHeaderAlertCounts, type PatientHeaderProps };
