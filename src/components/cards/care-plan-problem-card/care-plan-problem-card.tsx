import * as React from "react";
import { GitForkIcon, HistoryIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@/components/buttons/button";
import { Badge, type BadgeProps } from "@/components/data-display/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/overlays/tooltip";
import { expandVariants, fadeVariants, useExpandClip, useMotionPreference } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** How a problem's goal is going, in the words of the nursing care plan's evaluation. */
type CarePlanProblemStatus = "not-progressing" | "progressing" | "met";

/** Each status's words and Badge tone: Not progressing red, Progressing blue, Met green. */
const carePlanProblemStatuses: Record<CarePlanProblemStatus, { label: string; variant: BadgeProps["variant"] }> = {
	"not-progressing": { label: "Not progressing", variant: "red" },
	progressing: { label: "Progressing", variant: "blue" },
	met: { label: "Met", variant: "green" },
};

type HeadingLevel = "h2" | "h3" | "h4";

const nextHeading: Record<HeadingLevel, "h3" | "h4" | "h5"> = { h2: "h3", h3: "h4", h4: "h5" };

type CarePlanProblemCardProps = Omit<React.ComponentProps<"section">, "children"> & {
	/** The problem, e.g. "Septic shock from community-acquired pneumonia". The card's heading. */
	problem: React.ReactNode;
	/** How its goal is going; the badge under the problem. None: no badge. */
	status?: CarePlanProblemStatus;
	/** The measurable goal, after "Goal: ". */
	goal?: React.ReactNode;
	/** What the bedside team does toward it, muted under the goal. */
	interventions?: React.ReactNode;
	/** The pathways that treat it (`CarePlanPathway`), under the goal. */
	children?: React.ReactNode;
	/** Under everything, e.g. "Evaluated 8 hr ago". */
	footer?: React.ReactNode;
	/**
	 * The problem's details (its history, its pathways' orders). With them, a History button on the right opens and closes
	 * them in place, under the card's content.
	 */
	details?: React.ReactNode;
	detailsOpen?: boolean;
	defaultDetailsOpen?: boolean;
	onDetailsOpenChange?: (open: boolean) => void;
	/** The History button's name and tooltip. */
	historyLabel?: string;
	/** The problem's heading element; the pathways' headings sit one level below. */
	headingLevel?: HeadingLevel;
};

const PathwayHeadingContext = React.createContext<"h3" | "h4" | "h5">("h4");

/**
 * One problem of a patient's plan of care: the problem, how its goal is going, the goal, what the bedside team does toward
 * it, then the pathways that treat it. A History button opens its details in place.
 *
 * Figma: [intercept.ds › careplan-card](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1590-4164)
 */
function CarePlanProblemCard({
	problem,
	status,
	goal,
	interventions,
	children,
	footer,
	details,
	detailsOpen,
	defaultDetailsOpen = false,
	onDetailsOpenChange,
	historyLabel = "History",
	headingLevel = "h3",
	className,
	...props
}: CarePlanProblemCardProps) {
	const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultDetailsOpen);
	const open = detailsOpen ?? uncontrolledOpen;
	const setOpen = (next: boolean) => {
		if (detailsOpen === undefined) setUncontrolledOpen(next);
		onDetailsOpenChange?.(next);
	};
	const headingId = React.useId();
	const detailsId = React.useId();
	const Heading = headingLevel;
	const statusInfo = status ? carePlanProblemStatuses[status] : undefined;
	const { prefersReducedMotion } = useMotionPreference();
	const clip = useExpandClip();

	return (
		<section
			data-slot='care-plan-problem-card'
			data-status={status}
			aria-labelledby={headingId}
			className={cn("flex min-w-0 flex-col gap-3 rounded-card border border-border bg-card px-4 pt-3 pb-3.5 shadow-sm", className)}
			{...props}
		>
			{/* The right padding lines the History button up with the pathways' buttons. */}
			<div className='flex items-center gap-3 pr-6'>
				<div className='flex min-w-0 flex-1 flex-col gap-2'>
					<div className='flex flex-col items-start gap-1'>
						<Heading id={headingId} className='text-lg font-bold text-foreground'>
							{problem}
						</Heading>
						{statusInfo ? (
							<Badge variant={statusInfo.variant} size='xs'>
								{statusInfo.label}
							</Badge>
						) : null}
					</div>
					{goal || interventions ? (
						<div className='flex flex-col gap-0.5'>
							{goal ? <p className='text-base text-foreground'>Goal: {goal}</p> : null}
							{interventions ? <p className='text-sm text-muted-foreground'>{interventions}</p> : null}
						</div>
					) : null}
				</div>
				{details ? (
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant='outline'
									size='icon-md'
									aria-label={historyLabel}
									aria-expanded={open}
									aria-controls={detailsId}
									onClick={() => setOpen(!open)}
									// While its details are open: the outline button on the hover fill, as the header's open panels.
									className={cn("shrink-0", open && "bg-accent")}
								>
									<HistoryIcon aria-hidden='true' />
								</Button>
							</TooltipTrigger>
							<TooltipContent side='bottom'>{historyLabel}</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				) : null}
			</div>
			{children ? (
				<PathwayHeadingContext.Provider value={nextHeading[headingLevel]}>
					<div className='flex flex-col gap-3'>{children}</div>
				</PathwayHeadingContext.Provider>
			) : null}
			{details ? (
				// Always there for `aria-controls`; it takes back the card's gap while closed, and the gap opens with the details.
				<div id={detailsId} className='-mt-3'>
					<AnimatePresence initial={false}>
						{open ? (
							<motion.div
								key='details'
								{...clip}
								variants={prefersReducedMotion ? fadeVariants : expandVariants}
								initial='initial'
								animate='animate'
								exit='exit'
							>
								<div className='pt-3'>{details}</div>
							</motion.div>
						) : null}
					</AnimatePresence>
				</div>
			) : null}
			{footer ? <div className='text-xs text-muted-foreground'>{footer}</div> : null}
		</section>
	);
}

type CarePlanPathwayProps = Omit<React.ComponentProps<"div">, "title"> & {
	/** The pathway, e.g. "Sepsis bundle, hour 1". */
	title: React.ReactNode;
	/** Where it is: Needs review, Awaiting co-signature, Active, Completed, Declined… The badge under the title. */
	status?: { label: string; variant: BadgeProps["variant"] };
	/** A suggestion waiting for review: a dashed border, as in the alert. */
	suggested?: boolean;
	/** Under the title: the orders waiting for review, or where the pathway is, with when. */
	line?: React.ReactNode;
	/** Muted under the line: where a suggestion comes from, how many orders were sent. */
	extra?: React.ReactNode;
	/** The way to it, on the right: Review pathway while suggested, Open pathway after. */
	action?: { label: string; onSelect: () => void };
	/** What it runs now (a bundle, a protocol, bedside tasks), under the lines. */
	children?: React.ReactNode;
};

/**
 * A pathway inside its problem's card: its title and status, where it is, what it runs now, and the way to it on the
 * right. A suggestion is dashed.
 *
 * Figma: [intercept.ds › careplan-card › PathwayBlock](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1590-4122)
 */
function CarePlanPathway({ title, status, suggested = false, line, extra, action, children, className, ...props }: CarePlanPathwayProps) {
	const Heading = React.useContext(PathwayHeadingContext);
	return (
		<div
			data-slot='care-plan-pathway'
			data-suggested={suggested || undefined}
			className={cn(
				"flex items-center gap-2 rounded-lg border bg-background-subtle pt-3 pr-6 pb-4 pl-4",
				suggested ? "border-dashed border-input-ring" : "border-border",
				className,
			)}
			{...props}
		>
			<div className='flex min-w-0 flex-1 flex-col gap-2'>
				<div className='flex flex-col items-start gap-1'>
					<Heading className='text-base font-bold text-foreground'>{title}</Heading>
					{status ? (
						<Badge variant={status.variant} size='xs'>
							{status.label}
						</Badge>
					) : null}
				</div>
				{line || extra ? (
					<div className='flex flex-col'>
						{line ? <p className='text-base text-foreground'>{line}</p> : null}
						{extra ? <p className='text-sm text-muted-foreground'>{extra}</p> : null}
					</div>
				) : null}
				{children ? <div className='flex flex-col gap-1'>{children}</div> : null}
			</div>
			{action ? (
				<Button variant='outline' size='md' className='shrink-0' onClick={action.onSelect}>
					<GitForkIcon aria-hidden='true' />
					{action.label}
				</Button>
			) : null}
		</div>
	);
}

export {
	CarePlanPathway,
	CarePlanProblemCard,
	carePlanProblemStatuses,
	type CarePlanPathwayProps,
	type CarePlanProblemCardProps,
	type CarePlanProblemStatus,
};
