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
 * The Ask Intercept icon: a person (lucide `user-plus`'s figure) with the two-point AI sparkle where the plus would be,
 * in `currentColor`. Not in lucide.
 */
function AskInterceptIcon(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg xmlns='http://www.w3.org/2000/svg' width={18} height={18} viewBox='0 0 18 18' fill='none' aria-hidden='true' {...props}>
			<path
				d='M12 15.75V14.25C12 13.4544 11.6839 12.6913 11.1213 12.1287C10.5587 11.5661 9.79565 11.25 9 11.25H4.5C3.70435 11.25 2.94129 11.5661 2.37868 12.1287C1.81607 12.6913 1.5 13.4544 1.5 14.25V15.75M9.75 5.25C9.75 6.90685 8.40685 8.25 6.75 8.25C5.09315 8.25 3.75 6.90685 3.75 5.25C3.75 3.59315 5.09315 2.25 6.75 2.25C8.40685 2.25 9.75 3.59315 9.75 5.25Z'
				stroke='currentColor'
				strokeWidth={1.5}
				strokeLinecap='round'
				strokeLinejoin='round'
			/>
			<path
				d='M13.6308 5.7123C13.7561 5.7123 13.8569 5.81487 13.8652 5.93984C13.9645 7.43831 15.0454 8.51842 16.5439 8.61758C16.6687 8.62602 16.7704 8.72689 16.7705 8.85195C16.7705 8.97707 16.6687 9.07788 16.5439 9.08633C15.0453 9.1855 13.9643 10.2664 13.8652 11.765C13.8568 11.8899 13.756 11.9916 13.6308 11.9916C13.5057 11.9915 13.4048 11.8899 13.3964 11.765C13.2973 10.2664 12.2172 9.18561 10.7187 9.08633C10.5937 9.07806 10.4912 8.9772 10.4912 8.85195C10.4912 8.72677 10.5938 8.62584 10.7187 8.61758C12.217 8.5183 13.2971 7.4382 13.3964 5.93984C13.4047 5.81492 13.5056 5.71238 13.6308 5.7123ZM16.9912 4.4916C17.041 4.4916 17.0816 4.53266 17.0849 4.58242C17.1246 5.17887 17.5548 5.60935 18.1513 5.64883C18.2008 5.65234 18.2411 5.69191 18.2412 5.7416C18.2412 5.79133 18.2009 5.83186 18.1513 5.83535C17.5547 5.87483 17.1244 6.30506 17.0849 6.90176C17.0814 6.95133 17.0409 6.9916 16.9912 6.9916C16.9415 6.99155 16.9019 6.95127 16.8984 6.90176C16.8589 6.30518 16.4285 5.87498 15.832 5.83535C15.7822 5.83206 15.7412 5.79147 15.7412 5.7416C15.7412 5.69176 15.7822 5.65212 15.832 5.64883C16.4284 5.60923 16.8588 5.1788 16.8984 4.58242C16.9017 4.53269 16.9413 4.49165 16.9912 4.4916Z'
				fill='currentColor'
			/>
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
						<AskInterceptIcon className='size-[18px]' />
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
