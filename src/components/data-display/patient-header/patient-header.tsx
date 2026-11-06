import * as React from "react";

import { PatientCardTags, type PatientCensusCardProps } from "@/components/cards/patient-census-card";
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
		/**
		 * @deprecated Ignored since Nov 5, 2026: the header no longer shows the score and its change (user's call,
		 * following intercept.ds `1191:3147`). The page's Overview shows the Early warning score.
		 */
		acuity?: PatientCensusCardProps["acuity"];
		/** @deprecated Ignored since Nov 5, 2026, with `acuity`. */
		trajectory?: PatientCensusCardProps["trajectory"];
		/**
		 * @deprecated Ignored since Nov 5, 2026: the header no longer shows the alert pill (intercept.ds `1191:3147`). The
		 * page shows its alerts on the Overview and in toasts.
		 */
		alert?: PatientCensusCardProps["alert"];
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
 * Heads a patient's page: photo (a circle) beside the name and one line with MRN, sex and age, and location; under them
 * the tags, from the left edge (one line that scrolls sideways). An optional slot on the right takes actions.
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
	alert: _alert,
	acuity: _acuity,
	trajectory: _trajectory,
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
	// "MRN 01033876 - F, 39": the identifiers first, then sex and age, as intercept.ds writes them.
	const demographics = [sex, age].filter((part) => part !== undefined && part !== "").join(", ");
	const identity = [mrn ? `MRN ${mrn}` : undefined, demographics].filter(Boolean).join(" - ");
	const facts = [identity, hospital, unit, room, bed, ...details].filter(Boolean);

	return (
		<div data-slot='patient-header' className={cn("flex items-center gap-4 px-6", className)} {...props}>
			<div className='flex min-w-0 flex-1 flex-col gap-3'>
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

			{actions ? <div className='flex shrink-0 items-center gap-2'>{actions}</div> : null}
		</div>
	);
}

export { PatientHeader, type PatientHeaderProps };
