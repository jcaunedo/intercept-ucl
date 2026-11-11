import * as React from "react";
import { ArrowUpRightIcon, GitBranchIcon, MapPinIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@/components/buttons/button";
import {
	PatientCardScore,
	PatientCardTags,
	type PatientCardTag,
	type PatientCensusCardProps,
} from "@/components/cards/patient-census-card";
import { AlertBar, PatientMonitor, type PatientMonitorProps } from "@/components/cards/patient-monitoring-card";
import { Avatar, AvatarFallback, AvatarImage, type AvatarFallbackProps } from "@/components/data-display/avatar";
import { fadeVariants, revealVariants, standardTransition, useMotionPreference } from "@/lib/motion";
import { cn } from "@/lib/utils";

type AlertModalSeverity = "critical" | "high" | "medium" | "low";

// The alert's panel in its severity's tones: a pale fill, the title in the darkest step, the source a step lighter.
// Resolved takes the Resolved bar's green, and its words drop the severity's tones. Its header (the alert bar) is a step
// darker, green-100, set by AlertBar's `header` (Nov 10, 2026, user's call), so it reads as the panel's header.
const alertTones: Record<AlertModalSeverity | "resolved", { panel: string; title: string; source: string }> = {
	critical: {
		panel: "bg-severity-critical-subtle",
		title: "text-severity-critical-strong",
		source: "text-severity-critical-prominent",
	},
	high: {
		panel: "bg-severity-high-subtle",
		title: "text-severity-high-strong",
		source: "text-severity-high-prominent",
	},
	medium: {
		panel: "bg-severity-medium-subtle",
		title: "text-severity-medium-strong",
		source: "text-severity-medium-prominent",
	},
	low: {
		panel: "bg-severity-low-subtle",
		title: "text-severity-low-strong",
		source: "text-severity-low-prominent",
	},
	resolved: {
		panel: "bg-badge-green",
		title: "text-foreground",
		source: "text-muted-foreground",
	},
};

type AlertModalProps = Omit<React.ComponentProps<"div">, "title"> &
	Pick<
		PatientCensusCardProps,
		"lastName" | "mrn" | "sex" | "age" | "hospital" | "unit" | "room" | "bed" | "acuity" | "trajectory"
	> & {
		firstName?: string;
		/** Photo URL. Without it, the avatar shows `initials`. */
		photo?: string;
		initials?: string;
		/** The initials' color. */
		tone?: AvatarFallbackProps["tone"];
		/** The patient's page: the name becomes a link to it, with an arrow. */
		href?: string;
		/** Opens the patient: the name becomes a button, with an arrow. */
		onOpenPatient?: () => void;
		/** Read after the name by screen readers, when it opens the patient. */
		openPatientLabel?: string;
		/**
		 * The alert's bar: its severity (or `resolved`), how many alerts in the last 24 h, and since when. Without it, the
		 * patient alone, e.g. a video consult with no alert open: no alert panel, and the name is the heading (`titleAs`).
		 */
		alert?: {
			variant: AlertModalSeverity | "resolved";
			inLast24h?: number;
			since?: string;
		};
		/** The alert's heading: its reason line, or its title without one. Ignored without `alert`. */
		title?: React.ReactNode;
		/** Under the heading: the alert's own title when the heading is its reason line. */
		description?: React.ReactNode;
		/** Where the alert comes from, after the source icon ("Source: Rule · Deterioration score"). */
		source?: React.ReactNode;
		/** At the end of the source line: an action on the source itself, e.g. Feedback on an AI recommendation (Button `link`). */
		sourceAction?: React.ReactNode;
		/** Under the source: who did what and when ("Acknowledged by you · 1:42 AM"). */
		status?: React.ReactNode;
		/** The alert's lifecycle buttons (Button `neutral` `sm`), one row at equal widths. */
		alertActions?: React.ReactNode;
		/** Under the lifecycle buttons, inside the alert's panel, e.g. the form an action opens. */
		children?: React.ReactNode;
		/** The heading's element. Inside a Dialog, pass `DialogTitle` so the dialog is named by it. */
		titleAs?: React.ElementType;
		/** The description's element. Inside a Dialog, pass `DialogDescription`. */
		descriptionAs?: React.ElementType;
		/**
		 * A control at the end of the score line, right-aligned and level with its last line, e.g. Intercept Live's
		 * Pathway (Button `link`, an icon then its label).
		 */
		scoreAction?: React.ReactNode;
		/** The buttons under the alert (Button `outline` `md`), one row at equal widths. */
		actions?: React.ReactNode;
		/**
		 * Buttons right of the patient's name, before the × (Button `neutral` `icon-md`, 8px apart), sticking with the name,
		 * e.g. Intercept Live's Video consult and Messages.
		 */
		headerActions?: React.ReactNode;
		/** The patient's live bedside monitor, the full four lanes. */
		monitor?: PatientMonitorProps;
		/**
		 * A line right over the monitor about its data, e.g. that its numbers are held in low-bandwidth mode and how old
		 * they are, so nobody takes them for live.
		 */
		monitorStatus?: React.ReactNode;
		/** The patient's tags, as on their card. Without them there's no row; `[]` says "No tags". */
		tags?: PatientCardTag[];
		/** Shows a × that calls it. */
		onClose?: () => void;
		/** The ×'s accessible name. */
		closeLabel?: string;
		/** A × of its own in the corner, in place of `onClose`'s, e.g. `<DialogClose asChild><AlertModalClose /></DialogClose>`. */
		close?: React.ReactNode;
		/**
		 * The side panels, left to right (e.g. the video consult while it's on, then the messages): each a 432px column that
		 * slides out on the right with its label over its content, and slides back when it's taken away. Each column scrolls
		 * on its own, so a long one never makes the alert taller, with the shadow of the column on its left in its gutter.
		 * On a screen too narrow for them, the panels narrow to 360px and then the alert column to 480px, so the card fits.
		 */
		panels?: AlertModalPanel[];
	};

/** One side panel: its label (also its accessible name) and its content. */
type AlertModalPanel = {
	/** Stable across renders, so the panel slides in and out on its own. */
	id: string;
	label: string;
	content: React.ReactNode;
	/** The panel's scrolling column (it takes focus with `tabIndex={-1}`), e.g. to move focus there when it opens. */
	ref?: React.Ref<HTMLDivElement>;
	/**
	 * A control at the right of the label, sticking with it, e.g. a Button `outline` `xs` that opens another panel. Up to
	 * 24px tall, the label's line, so the header keeps its height.
	 */
	action?: React.ReactNode;
	/**
	 * Adds a × at the right of the label, after `action` (Nov 10, 2026, user's call): a ghost icon button, as the
	 * modal's own. What closing does is the page's, e.g. the video consult's ends the call.
	 */
	onClose?: () => void;
	/** The ×'s accessible name, e.g. "Close video consult". Defaults to "Close {label}". */
	closeLabel?: string;
	/**
	 * Pinned under the scrolling content, 16px from the panel's bottom, e.g. the video consult's Add a note field. An
	 * empty element (a portal target that's empty for now) takes no room.
	 */
	footer?: React.ReactNode;
};

/** Each side panel's width, which it opens to when there's room. */
const panelWidth = 432;
/** How narrow a side panel gets on a narrow screen. */
const panelMinWidth = 360;
/** The alert column's width (`w-150`); it gives way to `min-w-120` once the panels are at their narrowest. */
const alertWidth = 600;
/** What the card keeps clear of the viewport's edges: 16px on each side, as a Dialog does. */
const viewportGutter = 32;

/**
 * The width each side panel opens to. With room, 432px. On a narrower screen the panels share what the alert column
 * leaves, down to 360px each; past that, the alert column shrinks (to 480px), so the card never runs off the screen
 * (Nov 3, 2026, user's call: at 1280px the call and the pathway cut off the patient's name). Each panel's content is laid
 * at this width, so it doesn't reflow while the panel slides.
 */
function usePanelWidth(count: number) {
	const [viewport, setViewport] = React.useState<number | null>(null);
	React.useEffect(() => {
		const update = () => setViewport(window.innerWidth);
		update();
		window.addEventListener("resize", update);
		return () => window.removeEventListener("resize", update);
	}, []);
	if (!count || viewport === null) return panelWidth;
	// The card's border and the rules between its columns, 1px each.
	const borders = count + 2;
	const room = (viewport - viewportGutter - alertWidth - borders) / count;
	return Math.floor(Math.min(panelWidth, Math.max(panelMinWidth, room)));
}

// The shadow the column on a panel's left casts on it: a gradient in the panel's 24px left gutter, from 5% black
// (`shadow-color-sm`; softened twice, Nov 3, 2026, user's calls: the alert modal's was 25%, then 10%) to nothing. It's in the gutter, laid
// over the panel's content and fixed as it scrolls, so it never shades a card or a line (a box shadow from the column
// would fall across them) and runs unbroken past the sticky label and buttons.
const columnShadow =
	"before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:z-30 before:w-6 before:bg-linear-to-r before:from-(--shadow-color-sm) before:to-transparent";

/**
 * The panel's ×: a ghost icon button on the panel's background, so content scrolling under it stays hidden. Pass it to
 * `close` wrapped in the closing element (a DialogClose, a PopoverClose).
 */
function AlertModalClose({
	className,
	"aria-label": ariaLabel = "Close",
	...props
}: React.ComponentProps<typeof Button>) {
	return (
		<Button
			data-slot='alert-modal-close'
			variant='ghost'
			size='icon-sm'
			aria-label={ariaLabel}
			className={cn("rounded-button-md bg-background", className)}
			{...props}
		>
			<XIcon />
		</Button>
	);
}

/**
 * One patient's alert, expanded: who they are (the name opens them), the alert as its bar over a panel in its severity's
 * tones with its heading, source, state and lifecycle actions (with `headerActions` right of the name), the patient's score, live
 * monitor and tags. The panel the alert modal opens with, and a standalone card where one alert needs the room.
 *
 * Figma: [intercept.ds › alert-modal](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1355-14776)
 */
function AlertModal({
	className,
	lastName,
	firstName,
	photo,
	initials,
	tone,
	mrn,
	sex,
	age,
	hospital,
	unit,
	room,
	bed,
	href,
	onOpenPatient,
	openPatientLabel = "open patient",
	alert,
	title,
	description,
	source,
	sourceAction,
	status,
	alertActions,
	children,
	titleAs: Title = "h2",
	descriptionAs: Description = "p",
	scoreAction,
	actions,
	headerActions,
	acuity,
	trajectory,
	monitor,
	monitorStatus,
	tags,
	onClose,
	closeLabel = "Close",
	close,
	panels = [],
	...props
}: AlertModalProps) {
	const { prefersReducedMotion } = useMotionPreference();
	const width = usePanelWidth(panels.length);
	const name = [lastName, firstName].filter(Boolean).join(", ");
	const roomAndBed = [room, bed].filter(Boolean).join(" - ");
	// Under the name, who: "F, 72 · MRN 00826154"; then where, on its own line after the pin, as on the patient's card:
	// "Chadron · Med-Surg · Bed 4".
	const details = [
		[sex, age].filter((part) => part !== undefined && part !== "").join(", "),
		mrn ? `MRN ${mrn}` : undefined,
	]
		.filter(Boolean)
		.join(" · ");
	const location = [hospital, unit, roomAndBed].filter(Boolean).join(" · ");
	const tones = alert ? alertTones[alert.variant] : undefined;
	const corner = close ?? (onClose ? <AlertModalClose aria-label={closeLabel} onClick={onClose} /> : null);
	// Whether the column has scrolled, for the rule under the sticky patient.
	const [scrolled, setScrolled] = React.useState(false);

	// The name, underlined, then the arrow: the link (or button) to the patient's page.
	const nameContent = (
		<>
			<span className='truncate underline decoration-foreground-subtle decoration-from-font [text-underline-position:from-font] transition-[text-decoration-color] group-hover/name:decoration-foreground'>
				{name}
			</span>
			<ArrowUpRightIcon aria-hidden='true' className='size-6 shrink-0' />
		</>
	);
	const nameClassName =
		"group/name inline-flex max-w-full min-w-0 items-center gap-[5px] rounded-md font-display text-2xl font-bold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring";

	const nameNode = href ? (
		<a href={href} aria-label={`${name}, ${openPatientLabel}`} className={nameClassName}>
			{nameContent}
		</a>
	) : onOpenPatient ? (
		<button
			type='button'
			onClick={onOpenPatient}
			aria-label={`${name}, ${openPatientLabel}`}
			className={cn(nameClassName, "text-left")}
		>
			{nameContent}
		</button>
	) : (
		<p className='truncate font-display text-2xl font-bold text-foreground'>{name}</p>
	);

	return (
		<div
			data-slot='alert-modal'
			data-variant={alert?.variant}
			data-panels={panels.length || undefined}
			// No wider than its container, so on a narrow screen the alert column gives way (`usePanelWidth`).
			className={cn(
				"flex w-fit max-w-full overflow-hidden rounded-card border border-border bg-background shadow-2xl",
				className,
			)}
			{...props}
		>
			<article
				aria-label={name}
				// With a side panel open, a rule between the two; the panel draws the alert's shadow in its gutter.
				className={cn(
					"relative z-30 flex min-h-0 w-150 min-w-120 shrink flex-col gap-4 overflow-y-auto bg-background px-6 pt-6 pb-5",
					panels.length > 0 && "border-r border-border",
				)}
				onScroll={(event) => setScrolled(event.currentTarget.scrollTop > 0)}
			>
				{/* The ×, 20px from the top and right. Sticky, so when the panel scrolls (a height in `className` and
			    `overflow-y-auto`) it stays in the corner and the content passes under it; it takes no room in the column. Sticky offsets count from
			    inside the column's 24px padding, and its 1px border, so `-top-[5px]` is 20px from its outer edge, as in Figma. */}
				{corner ? (
					<div
						className={cn(
							"pointer-events-none sticky z-10 -mr-1 flex h-8 justify-end *:pointer-events-auto",
							// With buttons right of the name, centered on them (and the avatar), 29px down, as Figma's row
							// (Nov 9, 2026); the bottom margin keeps the same 21px taken back, so the name doesn't move.
							headerActions ? "top-[4px] mt-[4px] -mb-[57px]" : "-top-[5px] -mt-[5px] -mb-12",
						)}
					>
						{corner}
					</div>
				) : null}

				{/* The patient, sticky: while the column scrolls, the name stays at its top with the content passing under it, and
				    a rule fades in under it. A direct child of the column, since sticky can't leave its parent. It spans the
				    column's padding (`-mx-6 px-6`) and starts at its top edge (`-mt-[19px] pt-[19px]`: the × above it takes no
				    room, so the name sat 19px down), so nothing shows above it; `-top-6` sticks it there, the padding counted.
				    Under the ×, which stays in the corner. */}
				<div
					data-slot='alert-modal-patient'
					data-stuck={scrolled || undefined}
					className={cn(
						"sticky -top-6 z-[5] -mx-6 -mt-[19px] flex items-center gap-1.5 border-b border-transparent bg-background px-6 pt-[19px] pb-2 transition-[border-color] duration-300 ease-out motion-reduce:transition-none data-stuck:border-border",
						// Room for the ×: 10px between it and the header's buttons, 16px between it and the name without them.
						corner && (headerActions ? "pr-[62px]" : "pr-16"),
					)}
				>
					<Avatar aria-hidden='true' className='size-12'>
						{photo ? <AvatarImage src={photo} alt='' /> : null}
						<AvatarFallback tone={tone} className='text-base font-bold'>
							{initials}
						</AvatarFallback>
					</Avatar>
					<div className='flex min-w-0 flex-col'>
						{alert ? (
							nameNode
						) : href || onOpenPatient ? (
							// No alert to head the card: the name is its heading, so a dialog is named by it.
							// The row keeps the corner's room, so a DialogTitle's own `pr-10` is dropped.
							<Title className='flex min-w-0 pr-0'>{nameNode}</Title>
						) : (
							<Title className='truncate pr-0 font-display text-2xl font-bold text-foreground'>{name}</Title>
						)}
						{details ? <p className='truncate text-sm text-muted-foreground'>{details}</p> : null}
					</div>
					{headerActions ? <div className='ml-auto flex shrink-0 items-center gap-2 pl-2'>{headerActions}</div> : null}
				</div>
				{/* Under the name: its 8px padding and 1px rule, the column's 16px gap taken back. Never pulled up into the
				    sticky patient, whose background would mask the pin's top (Nov 9, 2026, user's report). */}
				{location || acuity || trajectory || scoreAction ? (
					// The location, then the score and its change, 4px apart, as on the patient's card; `scoreAction` on the
					// right, level with the last line.
					<div className='-mt-4 flex items-end gap-1'>
						<div className='flex min-w-0 flex-1 flex-col gap-1'>
							{location ? (
								<p className='flex items-center gap-1 text-sm font-medium text-foreground'>
									<MapPinIcon aria-hidden='true' className='size-4 shrink-0 text-icon-muted' />
									<span className='truncate'>{location}</span>
								</p>
							) : null}
							{acuity || trajectory ? <PatientCardScore acuity={acuity} trajectory={trajectory} /> : null}
						</div>
						{scoreAction ? <div className='flex shrink-0 items-center'>{scoreAction}</div> : null}
					</div>
				) : null}

				{alert && tones ? (
					<section
						aria-label='Alert'
						className={cn("flex shrink-0 flex-col gap-2 overflow-hidden rounded-xl pb-1.5", tones.panel)}
					>
						<AlertBar alert={alert} size='md' header />
						<div className='flex flex-col gap-2 px-4 pb-2.5'>
							<div>
								<Title className={cn("text-xl font-bold", tones.title)}>{title}</Title>
								{description ? <Description className={cn("text-base", tones.title)}>{description}</Description> : null}
							</div>
							{source || status ? (
								<div className='flex flex-col gap-0.5'>
									{source ? (
										<div className={cn("flex items-start justify-between gap-3 text-sm", tones.source)}>
											<p className='flex items-start gap-1.5'>
												{/* A box one line tall, so the icon stays on the first line when the words wrap. */}
												<span className='flex h-[1lh] shrink-0 items-center'>
													<GitBranchIcon aria-hidden='true' className='size-3' />
												</span>
												<span>{source}</span>
											</p>
											{sourceAction ? <div className='flex h-[1lh] shrink-0 items-center'>{sourceAction}</div> : null}
										</div>
									) : null}
									{status}
								</div>
							) : null}
							{alertActions ? <div className='flex gap-2'>{alertActions}</div> : null}
							{children}
						</div>
					</section>
				) : null}

				{actions ? <div className='flex gap-2 *:flex-1'>{actions}</div> : null}

				{monitor ? (
					monitorStatus ? (
						// The status sits with the monitor it's about, closer than the card's gap.
						<div className='flex shrink-0 flex-col gap-2'>
							{monitorStatus}
							<PatientMonitor aria-label={`${name}'s monitor`} {...monitor} />
						</div>
					) : (
						<PatientMonitor aria-label={`${name}'s monitor`} className='shrink-0' {...monitor} />
					)
				) : null}
				{tags ? (
					<div className='py-2'>
						<PatientCardTags tags={tags} name={name} />
					</div>
				) : null}
			</article>

			{/* The side panels slide out on the right, one after another: each opens to its width (standard) as its content
			    rises in (Reveal), and both go back when it's taken away. A fade only under reduced motion. Each column's
			    content is laid over it and scrolls on its own, so the alert column sets the card's height; each draws the
			    shadow of the column on its left in its gutter. */}
			<AnimatePresence initial={false}>
				{panels.map((item, index) => {
					const last = index === panels.length - 1;
					return (
						<motion.aside
							key={item.id}
							aria-label={item.label}
							initial={prefersReducedMotion ? { width, opacity: 0 } : { width: 0 }}
							animate={{ width, opacity: 1, transition: standardTransition }}
							exit={
								prefersReducedMotion
									? { opacity: 0, transition: standardTransition }
									: { width: 0, transition: standardTransition }
							}
							style={{ zIndex: 20 - index }}
							className={cn("relative shrink-0 overflow-hidden bg-background", columnShadow, !last && "border-r border-border")}
						>
							<motion.div
								variants={prefersReducedMotion ? fadeVariants : revealVariants}
								initial='initial'
								animate='animate'
								exit='exit'
								className='absolute inset-y-0 left-0 flex flex-col'
								style={{ width }}
							>
								<div
									ref={item.ref}
									tabIndex={item.ref ? -1 : undefined}
									className='flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 pt-4 pb-6 outline-none'
								>
									{/* The label sticks to the top of its column as it scrolls (Nov 3, 2026, user's call), on the column's
									    background, taking over the 16px padding above it and the 16px gap under it: 16px over and under the
									    label (Nov 9, 2026, user's call). */}
									<div className='sticky -top-4 z-10 -mx-6 -mt-4 -mb-4 flex items-center justify-between gap-2 bg-background px-6 pt-4 pb-4'>
										<h3 className='text-base font-semibold text-foreground'>{item.label}</h3>
										{item.action || item.onClose ? (
											// The × is 32px; its -4px margins keep the header on the label's 24px line.
											<div className='flex shrink-0 items-center gap-2'>
												{item.action}
												{item.onClose ? (
													<AlertModalClose
														aria-label={item.closeLabel ?? `Close ${item.label.toLowerCase()}`}
														onClick={item.onClose}
														className='-my-1'
													/>
												) : null}
											</div>
										) : null}
									</div>
									{item.content}
								</div>
								{item.footer ? <div className='shrink-0 px-6 pb-4 has-[>:empty]:hidden'>{item.footer}</div> : null}
							</motion.div>
						</motion.aside>
					);
				})}
			</AnimatePresence>
		</div>
	);
}

/** @deprecated Renamed `AlertModal` (Nov 9, 2026). */
const AlertExpanded = AlertModal;
/** @deprecated Renamed `AlertModalClose` (Nov 9, 2026). */
const AlertExpandedClose = AlertModalClose;
/** @deprecated Renamed `AlertModalPanel` (Nov 9, 2026). */
type AlertExpandedPanel = AlertModalPanel;
/** @deprecated Renamed `AlertModalProps` (Nov 9, 2026). */
type AlertExpandedProps = AlertModalProps;
/** @deprecated Renamed `AlertModalSeverity` (Nov 9, 2026). */
type AlertExpandedSeverity = AlertModalSeverity;

export {
	AlertModal,
	AlertModalClose,
	type AlertModalPanel,
	type AlertModalProps,
	type AlertModalSeverity,
	AlertExpanded,
	AlertExpandedClose,
	type AlertExpandedPanel,
	type AlertExpandedProps,
	type AlertExpandedSeverity,
};
