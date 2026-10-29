import * as React from "react";
import {
	ArrowUpIcon,
	ChevronDownIcon,
	EllipsisIcon,
	FlagIcon,
	ListIcon,
	MessageCircleMoreIcon,
	MoonIcon,
	SunIcon,
	WebcamIcon,
	type LucideIcon,
} from "lucide-react";
import { motion } from "motion/react";

import { Button } from "@/components/buttons/button";
import { Avatar, AvatarFallback, AvatarGroup, AvatarImage, type AvatarFallbackProps } from "@/components/data-display/avatar";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/navigation/breadcrumb";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/overlays/dropdown-menu";
import { Typography } from "@/components/typography/typography";
import {
	iconSwapReducedVariants,
	iconSwapVariants,
	liveDotVariants,
	liveHaloVariants,
	standardTransition,
	useMotionPreference,
} from "@/lib/motion";
import { cn } from "@/lib/utils";

type AppHeaderPerson = {
	name: string;
	/** Shown while the photo loads, or instead of it. */
	initials: string;
	/** Photo URL. */
	src?: string;
	/** Initials color, 1–10. */
	tone?: AvatarFallbackProps["tone"];
};

type AppHeaderUser = AppHeaderPerson & {
	/** Preformatted, e.g. "Shift ends on 3:45". */
	shiftEnds: string;
};

/** An item in the patient variant's "…" menu. */
type AppHeaderMenuAction = { label: string; icon?: LucideIcon; onSelect?: () => void };

/** What both variants share: Theme on the right, and the compact padding. */
type AppHeaderCommonProps = React.ComponentProps<"header"> & {
	onToggleTheme?: () => void;
	/** The current color mode. The theme button shows the moon in light mode (to go dark) and the sun in dark mode. */
	theme?: "light" | "dark";
	/**
	 * Tighter vertical padding (8px instead of 12px), e.g. while the page is scrolled under a sticky header. The change
	 * animates, and is instant under reduced motion.
	 */
	compact?: boolean;
};

type AppHeaderDefaultProps = AppHeaderCommonProps & {
	/** `default`: connection status and clock on the left, the team and the user's menu on the right. */
	variant?: "default";
	/** Preformatted date and time, e.g. "Wed Oct 21 · 4:54 PM". */
	clock: string;
	/** The clinicians on shift with the user, shown overlapping in the team button. */
	team: AppHeaderPerson[];
	/** The signed-in user. */
	user: AppHeaderUser;
	onOpenUserMenu?: () => void;
	unreadMessages: number;
	onOpenMessages?: () => void;
	/**
	 * @deprecated The header no longer has a Search button (search is in the Sidebar). Ignored; removed in the next
	 * breaking release.
	 */
	onSearch?: () => void;
	onOpenTeam?: () => void;
};

type AppHeaderPatientProps = AppHeaderCommonProps & {
	/**
	 * `patient`: on a patient's page, Ask Intercept and the patient list (when the app handles them), then a breadcrumb
	 * back to where the user came from, on the left; the patient's actions (Raise concern, Huddle team, Escalate), Theme
	 * and a "…" menu on the right.
	 */
	variant: "patient";
	/** The page the user came from, e.g. "Census". The breadcrumb's back link. */
	sourcePage: string;
	/** The patient's name as the page shows it, e.g. "Carter, Ellen". The breadcrumb's current page. */
	patientName: string;
	/** Makes the back link a link to this URL. Without it, the back link is a button that calls `onBack`. */
	backHref?: string;
	onBack?: () => void;
	/** Opens or closes Ask Intercept Live. Without it, there's no Ask Intercept button. */
	onToggleAskIntercept?: () => void;
	/** Whether Ask Intercept Live is open, for its button's pressed state. */
	askInterceptOpen?: boolean;
	/** Opens or closes the list of patients the user came from, to switch patient. Without it, there's no list button. */
	onTogglePatientList?: () => void;
	/** Whether the patient list is open, for its button's pressed state. */
	patientListOpen?: boolean;
	/** Raises a concern about the patient (a Clinician Intuition Alert). */
	onRaiseConcern?: () => void;
	/** Starts a huddle with the patient's team. */
	onHuddleTeam?: () => void;
	onEscalate?: () => void;
	/** The "…" menu's items. Without any, there's no "…" button. */
	moreActions?: AppHeaderMenuAction[];
};

type AppHeaderProps = AppHeaderDefaultProps | AppHeaderPatientProps;

// Every variant's own props, so they can be taken out before the rest reaches the <header>.
type AppHeaderAllProps = AppHeaderCommonProps &
	Partial<Omit<AppHeaderDefaultProps, keyof AppHeaderCommonProps | "variant">> &
	Partial<Omit<AppHeaderPatientProps, keyof AppHeaderCommonProps | "variant">> & { variant?: "default" | "patient" };

// Vertical padding in px, default and compact. The bottom loses 1px to the border line, so the header is 60px (52px
// compact), as Figma draws it with the line inside.
const headerPaddingY = { default: 12, compact: 8 } as const;

const focusClassName = "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

// Team and Account: no edge at rest; on hover an `accent` fill that reaches 4px past the pill (a spread shadow, so
// nothing moves).
const menuClassName = cn(
	"group/menu inline-flex shrink-0 items-center gap-1.5 rounded-full pr-1.5 text-foreground transition-[background-color,box-shadow] hover:bg-accent hover:shadow-[0_0_0_4px_var(--color-accent)]",
	focusClassName,
);

/**
 * The Online dot, with a static ring that straddles its edge (1px inside as the border, 1px outside as the ring). It
 * shows the connection is live with the Live pattern: the dot breathes and a blurred copy of the ring spreads out and
 * fades. Under reduced motion it stays still.
 */
function LiveDot() {
	const { prefersReducedMotion } = useMotionPreference();

	return (
		<span aria-hidden='true' className='relative size-[11px] shrink-0'>
			{prefersReducedMotion ? null : (
				<motion.span
					variants={liveHaloVariants}
					animate='live'
					className='absolute -inset-px rounded-full border-2 border-success-glow'
				/>
			)}
			<motion.span
				variants={liveDotVariants}
				animate={prefersReducedMotion ? undefined : "live"}
				className='absolute inset-0 rounded-full border border-success-glow bg-success ring-1 ring-success-glow'
			/>
		</span>
	);
}

/** Moon in light mode, sun in dark mode, swapping in place (Swap pattern; instant under reduced motion). */
function ThemeIcon({ theme }: { theme: "light" | "dark" }) {
	const { prefersReducedMotion } = useMotionPreference();
	const variants = prefersReducedMotion ? iconSwapReducedVariants : iconSwapVariants;

	// The icons carry their own size: Button sizes any unsized svg inside it to 16px.
	return (
		<span aria-hidden='true' className='grid size-[18px] *:col-start-1 *:row-start-1'>
			<motion.span initial={false} variants={variants} animate={theme === "dark" ? "hidden" : "shown"}>
				<MoonIcon className='size-[18px]' />
			</motion.span>
			<motion.span initial={false} variants={variants} animate={theme === "dark" ? "shown" : "hidden"}>
				<SunIcon className='size-[18px]' />
			</motion.span>
		</span>
	);
}

function PersonAvatar({ person }: { person: AppHeaderPerson }) {
	return (
		<Avatar size='md'>
			{person.src ? <AvatarImage src={person.src} alt='' /> : null}
			<AvatarFallback tone={person.tone}>{person.initials}</AvatarFallback>
		</Avatar>
	);
}

/** Online badge and clock. */
function StatusAndClock({ clock }: { clock: string }) {
	return (
		<div className='flex items-center gap-3'>
			{/* Figma counts this badge's 1px border in its layout, so the paddings sit inside it. */}
			<span className='inline-flex h-7 items-center gap-1.5 rounded-full border border-transparent bg-success-subtle pr-3 pl-2.5 text-sm/4.5 font-bold tracking-[0.03em] text-success uppercase'>
				<LiveDot />
				Online
			</span>
			<Typography as='p' size='xl' weight='medium' className='tabular-nums'>
				{clock}
			</Typography>
		</div>
	);
}

/**
 * The Ask Intercept sparkle, outlined: Figma's stroke, drawn as the shape stroked inside its own mask (so the stroke
 * stays within the outline), in `currentColor`. Not in lucide; the filled, gradient sparkle is the AI mark elsewhere.
 */
function SparkleOutlineIcon(props: React.SVGProps<SVGSVGElement>) {
	const maskId = React.useId();
	const shape =
		"M7.53516 2.92969C7.83571 2.92969 8.07776 3.17473 8.09766 3.47461C8.33561 7.07134 10.9287 9.66525 14.5254 9.90332C14.8253 9.92316 15.0702 10.1643 15.0703 10.4648C15.0703 10.7654 14.8253 11.0075 14.5254 11.0273C10.9288 11.2654 8.33576 13.8585 8.09766 17.4551C8.07781 17.755 7.83574 18 7.53516 18C7.23464 17.9999 6.99347 17.755 6.97363 17.4551C6.73555 13.8584 4.14165 11.2653 0.544922 11.0273C0.24503 11.0075 0 10.7654 0 10.4648C9.93602e-05 10.1644 0.245109 9.92322 0.544922 9.90332C4.14175 9.66537 6.73568 7.07143 6.97363 3.47461C6.99354 3.1748 7.23469 2.92978 7.53516 2.92969ZM15 0C15.1197 0 15.2167 0.0973811 15.2246 0.216797C15.3193 1.64874 16.3513 2.68149 17.7832 2.77637C17.9026 2.78427 18 2.88032 18 3C18 3.11966 17.9026 3.21573 17.7832 3.22363C16.3513 3.31852 15.3194 4.35127 15.2246 5.7832C15.2167 5.90259 15.1197 6 15 6C14.8805 5.9998 14.7843 5.90246 14.7764 5.7832C14.6816 4.35116 13.6488 3.31837 12.2168 3.22363C12.0976 3.21553 12 3.11952 12 3C12 2.88047 12.0976 2.78447 12.2168 2.77637C13.6489 2.68163 14.6816 1.64885 14.7764 0.216797C14.7843 0.0975081 14.8805 0.000199607 15 0Z";
	return (
		<svg xmlns='http://www.w3.org/2000/svg' width={18} height={18} viewBox='0 0 18 18' fill='none' aria-hidden='true' {...props}>
			<mask id={maskId} fill='white'>
				<path d={shape} />
			</mask>
			<path d={shape} stroke='currentColor' strokeWidth={3} mask={`url(#${maskId})`} />
		</svg>
	);
}

/** A 1px rule between the left side's parts. */
function HeaderDivider() {
	return <div aria-hidden='true' className='h-[33px] w-px shrink-0 bg-border' />;
}

/**
 * Patient, left side: Ask Intercept and the patient list (each only when the app handles it, each followed by a rule),
 * then the source page and the patient's name. The source page is the link back.
 */
function PatientNavigation({
	sourcePage,
	patientName,
	backHref,
	onBack,
	onToggleAskIntercept,
	askInterceptOpen = false,
	onTogglePatientList,
	patientListOpen = false,
}: AppHeaderPatientProps) {
	// An open panel's button keeps its hover fill, so the toggle shows it's on. The back link is medium here, like the
	// patient's name; Breadcrumb's own links are regular.
	return (
		<div className='flex min-w-0 items-center gap-4'>
			{onToggleAskIntercept ? (
				<>
					<Button variant='ghost' size='icon-md' className='aria-pressed:bg-accent' aria-pressed={askInterceptOpen} aria-label='Ask Intercept Live' onClick={onToggleAskIntercept}>
						<SparkleOutlineIcon className='size-[18px]' />
					</Button>
					<HeaderDivider />
				</>
			) : null}
			{onTogglePatientList ? (
				<>
					<Button variant='ghost' size='icon-md' className='aria-pressed:bg-accent' aria-pressed={patientListOpen} aria-label='Patient list' onClick={onTogglePatientList}>
						<ListIcon aria-hidden='true' className='size-[18px]' />
					</Button>
					<HeaderDivider />
				</>
			) : null}
			<Breadcrumb className='min-w-0 px-2'>
				<BreadcrumbList size='sm'>
					<BreadcrumbItem>
						{backHref ? (
							<BreadcrumbLink href={backHref} onClick={onBack} className='font-medium'>
								{sourcePage}
							</BreadcrumbLink>
						) : (
							<BreadcrumbLink asChild className='font-medium'>
								<button type='button' onClick={onBack}>
									{sourcePage}
								</button>
							</BreadcrumbLink>
						)}
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>{patientName}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>
		</div>
	);
}

/** The team on shift, overlapping, opening the team menu. */
function TeamMenu({ team, onOpenTeam }: Pick<AppHeaderDefaultProps, "team" | "onOpenTeam">) {
	return (
		<button
			type='button'
			onClick={onOpenTeam}
			aria-label={`Team on shift: ${team.map((person) => person.name).join(", ")}`}
			className={menuClassName}
		>
			{/* Full 36px photos with a 2.7px separating ring outside them, as Figma draws it (AvatarGroup's own ring is
			    a border inside the avatar). On hover the rings take the hover fill so the avatars stay cut out of it:
			    `accent` is a see-through overlay, so it's layered over `background` to stay opaque over the next photo. */}
			<AvatarGroup
				aria-hidden='true'
				className='*:data-[slot=avatar]:border-0 *:data-[slot=avatar]:shadow-[0_0_0_2.7px_var(--color-background)] *:data-[slot=avatar]:transition-shadow group-hover/menu:*:data-[slot=avatar]:shadow-[0_0_0_2.7px_var(--color-accent),0_0_0_2.7px_var(--color-background)]'
			>
				{team.map((person) => (
					<PersonAvatar key={person.name} person={person} />
				))}
			</AvatarGroup>
			<ChevronDownIcon aria-hidden='true' className='size-4 text-icon' />
		</button>
	);
}

/** The signed-in user, with their shift, opening their menu. */
function AccountMenu({ user, onOpenUserMenu }: Pick<AppHeaderDefaultProps, "user" | "onOpenUserMenu">) {
	return (
		<button type='button' onClick={onOpenUserMenu} className={menuClassName}>
			<span className='flex items-center gap-2'>
				<PersonAvatar person={user} />
				<span className='flex flex-col items-start'>
					<span className='text-sm/[19px] font-bold'>{user.name}</span>
					<span className='text-sm/[14px]'>{user.shiftEnds}</span>
				</span>
			</span>
			<ChevronDownIcon aria-hidden='true' className='size-4 text-icon' />
		</button>
	);
}

/** Default: Messages, Theme, the team and the user's menu, one 8px row. */
function DefaultActions({
	unreadMessages,
	onOpenMessages,
	team,
	onOpenTeam,
	user,
	onOpenUserMenu,
	themeButton,
}: AppHeaderDefaultProps & { themeButton: React.ReactNode }) {
	const messagesLabel = `${unreadMessages} ${unreadMessages === 1 ? "message" : "messages"}`;

	return (
		<div className='flex items-center gap-2'>
			{/* The accessible name starts with the visible label, so voice control users can say what they see. */}
			<Button variant='outline' onClick={onOpenMessages} aria-label={`${messagesLabel} unread`}>
				<MessageCircleMoreIcon aria-hidden='true' />
				{messagesLabel}
			</Button>
			{themeButton}
			<TeamMenu team={team} onOpenTeam={onOpenTeam} />
			<AccountMenu user={user} onOpenUserMenu={onOpenUserMenu} />
		</div>
	);
}

/** Patient: the patient's actions, Theme and the "…" menu, one 8px row. */
function PatientActions({
	onRaiseConcern,
	onHuddleTeam,
	onEscalate,
	moreActions = [],
	themeButton,
}: AppHeaderPatientProps & { themeButton: React.ReactNode }) {
	return (
		<div role='group' aria-label='Patient actions' className='flex items-center gap-2'>
			<Button variant='outline' onClick={onRaiseConcern}>
				<FlagIcon aria-hidden='true' />
				Raise concern
			</Button>
			<Button variant='outline' onClick={onHuddleTeam}>
				<WebcamIcon aria-hidden='true' />
				Huddle team
			</Button>
			<Button variant='outline' onClick={onEscalate}>
				<ArrowUpIcon aria-hidden='true' />
				Escalate
			</Button>
			{themeButton}
			{moreActions.length ? (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant='outline' size='icon-md' aria-label='More actions'>
							<EllipsisIcon aria-hidden='true' />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align='end'>
						{moreActions.map(({ label, icon: Icon, onSelect }) => (
							<DropdownMenuItem key={label} onSelect={onSelect}>
								{Icon ? <Icon aria-hidden='true' /> : null}
								{label}
							</DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>
			) : null}
		</div>
	);
}

/**
 * Intercept Live's top bar. `default`: connection status and clock on the left; messages, theme, the team on shift and
 * the user's menu on the right. `patient`: Ask Intercept, the patient list and a breadcrumb back from a patient's page
 * on the left; the patient's actions, theme and a "…" menu on the right. Each button calls its own handler; the header holds no state.
 *
 * Figma: [intercept.ds › app-header](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1169-318)
 */
function AppHeader(props: AppHeaderProps) {
	// Take every variant's own props out, so only HTML attributes reach the <header>. `onSearch` is deprecated and
	// ignored, but taking it out keeps it from reaching the DOM as a `search` listener.
	const {
		variant = "default",
		clock: _clock,
		team: _team,
		onSearch: _onSearch,
		onOpenTeam: _onOpenTeam,
		sourcePage: _sourcePage,
		patientName: _patientName,
		backHref: _backHref,
		onBack: _onBack,
		onToggleAskIntercept: _onToggleAskIntercept,
		askInterceptOpen: _askInterceptOpen,
		onTogglePatientList: _onTogglePatientList,
		patientListOpen: _patientListOpen,
		user: _user,
		onOpenUserMenu: _onOpenUserMenu,
		unreadMessages: _unreadMessages,
		onOpenMessages: _onOpenMessages,
		onRaiseConcern: _onRaiseConcern,
		onHuddleTeam: _onHuddleTeam,
		onEscalate: _onEscalate,
		moreActions: _moreActions,
		onToggleTheme,
		theme = "light",
		compact = false,
		className,
		...headerProps
	} = props as AppHeaderAllProps;
	const { resolve } = useMotionPreference();
	const paddingY = compact ? headerPaddingY.compact : headerPaddingY.default;
	const themeButton = (
		<Button
			variant='outline'
			size='icon-md'
			onClick={onToggleTheme}
			aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
		>
			<ThemeIcon theme={theme} />
		</Button>
	);

	return (
		<header
			data-slot='app-header'
			data-variant={variant}
			data-compact={compact ? "" : undefined}
			className={cn("border-b border-border bg-background px-4", className)}
			{...headerProps}
		>
			{/* Motion animates the vertical padding here, so the header's own props stay plain HTML. */}
			<motion.div
				initial={false}
				animate={{ paddingTop: paddingY, paddingBottom: paddingY - 1 }}
				transition={resolve(standardTransition)}
				className='flex items-center justify-between gap-4'
			>
				{props.variant === "patient" ? <PatientNavigation {...props} /> : <StatusAndClock clock={props.clock} />}

				{props.variant === "patient" ? (
					<PatientActions {...props} themeButton={themeButton} />
				) : (
					<DefaultActions {...props} themeButton={themeButton} />
				)}
			</motion.div>
		</header>
	);
}

export {
	AppHeader,
	type AppHeaderMenuAction,
	type AppHeaderDefaultProps,
	type AppHeaderPatientProps,
	type AppHeaderPerson,
	type AppHeaderProps,
	type AppHeaderUser,
};
