import * as React from "react";

import {
	PatientCardAlert,
	patientCardAcuityLevels,
	type PatientCardProps,
} from "@/components/cards/patient-card";
import { Avatar, AvatarFallback, AvatarImage, type AvatarFallbackProps } from "@/components/data-display/avatar";
import { Badge } from "@/components/data-display/badge";
import { Typography } from "@/components/typography/typography";
import { cn } from "@/lib/utils";

const trendVariantClassNames = { critical: "text-severity-critical", success: "text-success" } as const;

type PatientHeaderProps = Omit<React.ComponentProps<"div">, "children"> &
	Pick<
		PatientCardProps,
		| "lastName"
		| "firstName"
		| "mrn"
		| "sex"
		| "age"
		| "hospital"
		| "unit"
		| "room"
		| "bed"
		| "alert"
		| "acuity"
		| "trajectory"
		| "tags"
	> & {
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

/**
 * Heads a patient's page: photo (a circle), name and top alert, then the acuity score by its name ("NEWS2 10 High"), its 24h change, demographics, MRN and location on one
 * line, then badges (safety and organ support). An optional slot on the right takes actions.
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
	const acuityLevel = acuity?.level ?? (acuity && acuity.score === undefined ? "unknown" : undefined);
	const demographics = [age, sex].filter((part) => part !== undefined && part !== "").join(" ");
	const facts = [demographics, mrn ? `MRN ${mrn}` : undefined, hospital, unit, room, bed, ...details].filter(Boolean);
	const change = trajectory?.value !== undefined && trajectory.value !== "0" && trajectory.variant !== "missing";

	return (
		<div data-slot='patient-header' className={cn("flex items-center gap-4 px-6", className)} {...props}>
			<div className='flex min-w-0 flex-1 items-start gap-4'>
				{/* 64px, above Avatar's sizes, and Avatar's circle; the initials keep Avatar's proportion (11px at 32px). */}
				<Avatar aria-hidden='true' className='size-16'>
					{photo ? <AvatarImage src={photo} alt='' /> : null}
					<AvatarFallback tone={tone} className='text-[22px]'>
						{initials}
					</AvatarFallback>
				</Avatar>

				<div className='flex min-w-0 flex-1 flex-col gap-2.5'>
					<div className='flex flex-col gap-px'>
						<div className='flex flex-wrap items-center gap-x-4 gap-y-1'>
							<Typography as={headingLevel} size='3xl' weight='bold' className='break-words'>
								{lastName}, {firstName}
							</Typography>
							{alert ? (
								<PatientCardAlert variant={alert.variant} count={alert.count}>
									{alert.label}
								</PatientCardAlert>
							) : null}
						</div>
						<p className='text-base text-foreground'>
							{acuity ? (
								<>
									<span className='font-bold'>
										{acuity.label} {acuity.score ?? "--"}
									</span>
									{acuityLevel ? (
										<span className={cn("ml-2 font-semibold", patientCardAcuityLevels[acuityLevel].className)}>
											{patientCardAcuityLevels[acuityLevel].label}
										</span>
									) : null}
								</>
							) : null}
							{change ? (
								<>
									{acuity ? " · " : null}
									{trajectory.trend ? (
										<span
											aria-hidden='true'
											className={cn(
												"font-bold",
												trajectory.trendVariant ? trendVariantClassNames[trajectory.trendVariant] : undefined,
											)}
										>
											{trajectory.trend === "up" ? "▲" : "▼"}{" "}
										</span>
									) : null}
									<span className='font-bold'>{trajectory.value}</span> in last 24 h
								</>
							) : null}
							{facts.length ? `${acuity || change ? " · " : ""}${facts.join(" · ")}` : null}
						</p>
					</div>

					{tags.length ? (
						<ul aria-label='Badges' className='flex flex-wrap gap-1.5'>
							{tags.map((tag) => (
								<li key={tag.label}>
									<Badge variant={tag.variant ?? "secondary"} size='xs'>
										{tag.label}
									</Badge>
								</li>
							))}
						</ul>
					) : null}
				</div>
			</div>

			{actions ? <div className='flex shrink-0 items-center gap-2'>{actions}</div> : null}
		</div>
	);
}

export { PatientHeader, type PatientHeaderProps };
