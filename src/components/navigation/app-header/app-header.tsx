import * as React from "react";
import {
	ArrowLeftIcon,
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
	liveGlowVariants,
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
	 * `patient`: on a patient's page, Back, Ask Intercept and the patient list (when the app handles them), then a
	 * breadcrumb back to where the user came from, on the left; the patient's actions (Raise concern, Huddle team, Escalate), Theme
	 * and a "…" menu on the right.
	 */
	variant: "patient";
	/** The page the user came from, e.g. "Census". The breadcrumb's back link. */
	sourcePage: string;
	/** The patient's name as the page shows it, e.g. "Carter, Ellen". The breadcrumb's current page. */
	patientName: string;
	/**
	 * Makes Back and the breadcrumb's back link links to this URL. Without it, they're buttons that call `onBack`. Back
	 * shows only with one of the two.
	 */
	backHref?: string;
	onBack?: () => void;
	/** Opens or closes Ask Intercept Live. Without it, there's no Ask Intercept button. */
	onToggleAskIntercept?: () => void;
	/** Whether Ask Intercept Live is open (`aria-expanded` on its button). */
	askInterceptOpen?: boolean;
	/**
	 * @deprecated The Ask Intercept button no longer shows whether the chat is about this patient; it's a plain ghost
	 * button (Nov 1, 2026). Ignored; removed in the next breaking release.
	 */
	askInterceptInContext?: boolean;
	/** Opens or closes the list of patients the user came from, to switch patient. Without it, there's no list button. */
	onTogglePatientList?: () => void;
	/** Whether the patient list is open (`aria-expanded` on its button; no pressed look since Oct 31, 2026). */
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
 * The Online dot. It shows the connection is live with the Live pattern: the dot breathes, changing color as it reaches
 * full size, and a blurred ring in that color spreads out from it and fades. In light mode it rests in the glow's bright
 * green and turns `success` at full size; in dark mode the other way round. The halo is `success-halo`, a lighter,
 * more saturated green in light mode and the glow's in dark (Oct 31, 2026, user's call). Under reduced motion it stays still, in its resting color.
 */
function LiveDot() {
	const { prefersReducedMotion } = useMotionPreference();

	return (
		<span aria-hidden='true' className='relative size-2.5 shrink-0'>
			{prefersReducedMotion ? null : (
				<motion.span
					variants={liveHaloVariants}
					animate='live'
					className='absolute -inset-px rounded-full border-2 border-success-halo'
				/>
			)}
			{/* The resting color, then the full-size color fading in with the halo (no outline since Oct 31, 2026). The app's
			    dark theme is a `.dark` class on the root, hence `in-[.dark]:`. */}
			<motion.span
				variants={liveDotVariants}
				animate={prefersReducedMotion ? undefined : "live"}
				className='absolute inset-0 rounded-full bg-success-glow in-[.dark]:bg-success'
			/>
			{prefersReducedMotion ? null : (
				<motion.span
					variants={liveGlowVariants}
					animate='live'
					className='absolute inset-0 rounded-full bg-success in-[.dark]:bg-success-glow'
				/>
			)}
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
 * The Ask Intercept icon: archielabs.ds `ai-patient` (`6294:10248`), a person in a circle with the two-point AI sparkle
 * breaking the circle at its top right; one filled shape in `currentColor`, drawn at 18px. Not in lucide.
 */
function AskInterceptIcon(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg xmlns='http://www.w3.org/2000/svg' width={18} height={18} viewBox='0 0 24 24' fill='none' aria-hidden='true' {...props}>
			<path
				d='M12 1C12.5523 1 13 1.44772 13 2C13 2.55228 12.5523 3 12 3C7.02944 3 3 7.02944 3 12C3 14.6717 4.165 17.0704 6.01367 18.7188C6.07886 18.0263 6.38299 17.3748 6.87891 16.8789C7.44151 16.3163 8.20435 16 9 16H15C15.7956 16 16.5585 16.3163 17.1211 16.8789C17.617 17.3748 17.9201 18.0263 17.9854 18.7188C19.8343 17.0704 21 14.6719 21 12C21 11.4477 21.4477 11 22 11C22.5523 11 23 11.4477 23 12C23 16.0441 20.8157 19.5751 17.5645 21.4863C17.5254 21.5131 17.4842 21.5365 17.4414 21.5576C15.8363 22.4734 13.9802 23 12 23C10.0195 23 8.16286 22.4737 6.55762 21.5576C6.51489 21.5365 6.47358 21.5131 6.43457 21.4863C3.18372 19.575 1 16.0438 1 12C1 5.92487 5.92487 1 12 1ZM9 18C8.73478 18 8.48051 18.1054 8.29297 18.293C8.10543 18.4805 8 18.7348 8 19V20.0615C9.20525 20.6607 10.5627 21 12 21C13.4373 21 14.7947 20.6607 16 20.0615V19C16 18.7348 15.8946 18.4805 15.707 18.293C15.5195 18.1054 15.2652 18 15 18H9ZM12 6C14.2091 6 16 7.79086 16 10C16 12.2091 14.2091 14 12 14C9.79086 14 8 12.2091 8 10C8 7.79086 9.79086 6 12 6ZM12 8C10.8954 8 10 8.89543 10 10C10 11.1046 10.8954 12 12 12C13.1046 12 14 11.1046 14 10C14 8.89543 13.1046 8 12 8ZM19.1855 0.62793C19.3525 0.628003 19.487 0.764096 19.498 0.930664C19.6303 2.9285 21.0707 4.36939 23.0684 4.50195C23.235 4.51298 23.3711 4.64746 23.3711 4.81445C23.3708 4.98123 23.2348 5.11496 23.0684 5.12598C21.0707 5.25854 19.6304 6.69947 19.498 8.69727C19.487 8.86383 19.3525 8.99993 19.1855 9C19.0187 8.99978 18.8841 8.86376 18.873 8.69727C18.7407 6.69918 17.2998 5.25818 15.3018 5.12598C15.1356 5.11465 14.9993 4.98101 14.999 4.81445C14.999 4.64768 15.1354 4.51329 15.3018 4.50195C17.2999 4.36976 18.7407 2.92879 18.873 0.930664C18.8841 0.764171 19.0187 0.628145 19.1855 0.62793Z'
				fill='currentColor'
			/>
		</svg>
	);
}

/** A 1px rule after each of the left side's buttons. */
function HeaderDivider() {
	return <div aria-hidden='true' className='h-9 w-px shrink-0 bg-border' />;
}

/**
 * Patient, left side: Back, the patient list and Ask Intercept (each only when the app handles it, each followed by a
 * rule), then the source page and the patient's name. Back and the source page both lead back.
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
	const hasBack = Boolean(backHref || onBack);
	const backIcon = <ArrowLeftIcon aria-hidden='true' className='size-[18px]' />;

	// Ask Intercept is filled while the chat is about this patient; the list button looks the same open or closed. The
	// back link is medium here, like the patient's name; Breadcrumb's own links are regular.
	return (
		<div className='flex min-w-0 items-center gap-4'>
			{hasBack || onToggleAskIntercept || onTogglePatientList ? (
				<div className='flex shrink-0 items-center gap-2'>
					{hasBack ? (
						<>
							{backHref ? (
								<Button asChild variant='ghost' size='icon-md'>
									<a href={backHref} onClick={onBack} aria-label={`Back to ${sourcePage}`}>
										{backIcon}
									</a>
								</Button>
							) : (
								<Button variant='ghost' size='icon-md' aria-label={`Back to ${sourcePage}`} onClick={onBack}>
									{backIcon}
								</Button>
							)}
							<HeaderDivider />
						</>
					) : null}
					{onTogglePatientList ? (
						<>
							<Button
								variant='ghost'
								size='icon-md'
								aria-expanded={patientListOpen}
								aria-label='Patient list'
								onClick={onTogglePatientList}
							>
								<ListIcon aria-hidden='true' className='size-[18px]' />
							</Button>
							<HeaderDivider />
						</>
					) : null}
					{onToggleAskIntercept ? (
						<>
							<Button
								variant='ghost'
								size='icon-md'
								aria-expanded={askInterceptOpen}
								aria-label='Ask Intercept Live'
								onClick={onToggleAskIntercept}
							>
								<AskInterceptIcon className='size-[18px]' />
							</Button>
							<HeaderDivider />
						</>
					) : null}
				</div>
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
 * the user's menu on the right. `patient`: Back, Ask Intercept, the patient list and a breadcrumb back from a patient's
 * page on the left; the patient's actions, theme and a "…" menu on the right. Each button calls its own handler; the header holds no state.
 *
 * Figma: [intercept.ds › app-header](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1169-318)
 */
function AppHeader(props: AppHeaderProps) {
	// Take every variant's own props out, so only HTML attributes reach the <header>. `onSearch` and
	// `askInterceptInContext` are deprecated and ignored, but taking them out keeps them off the DOM.
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
		askInterceptInContext: _askInterceptInContext,
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
