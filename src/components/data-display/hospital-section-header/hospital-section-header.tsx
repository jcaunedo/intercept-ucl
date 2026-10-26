import * as React from "react";
import { HospitalIcon, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type HospitalSectionHeaderProps = React.ComponentProps<"div"> & {
	/** The hospital's name. Rendered as the section's heading. */
	name: string;
	patientCount: number;
	/** Active alerts across the section's patients. At 0 the line says "No alerts". */
	alertCount: number;
	/** Heading level for the name. Defaults to `h2`, under the page's `h1`. */
	headingLevel?: "h2" | "h3" | "h4";
	/** Replaces the hospital icon. */
	icon?: LucideIcon;
};

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/**
 * Heads a group of patients from one hospital, e.g. when the census is sorted by location: an icon tile, the
 * hospital's name, and how many patients and active alerts it has.
 *
 * Figma: [intercept.ds › hospital-section-header](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1118-4281)
 */
function HospitalSectionHeader({
	name,
	patientCount,
	alertCount,
	headingLevel: Heading = "h2",
	icon: Icon = HospitalIcon,
	className,
	...props
}: HospitalSectionHeaderProps) {
	return (
		<div data-slot='hospital-section-header' className={cn("flex items-center gap-3", className)} {...props}>
			<span aria-hidden='true' className='grid shrink-0 place-items-center rounded-lg bg-background-subtle p-2.5'>
				<Icon className='size-6 text-icon' />
			</span>
			<div className='flex min-w-0 flex-col whitespace-nowrap'>
				<Heading className='truncate text-xl/6 font-bold text-foreground'>{name}</Heading>
				<p className='flex gap-1 text-sm text-foreground'>
					<span>{plural(patientCount, "patient", "patients")}</span>
					<span aria-hidden='true' className='text-muted-foreground'>
						·
					</span>
					{/* Always the critical red, as Figma draws it: it's the only severity color that reads as text on white. */}
					{alertCount > 0 ? (
						<span className='text-severity-critical'>{plural(alertCount, "alert", "alerts")}</span>
					) : (
						<span className='text-muted-foreground'>No alerts</span>
					)}
				</p>
			</div>
		</div>
	);
}

export { HospitalSectionHeader, type HospitalSectionHeaderProps };
