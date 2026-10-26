import * as React from "react";
import { ChevronDownIcon, MessageCircleMoreIcon, MoonIcon, SearchIcon, SunIcon } from "lucide-react";
import { motion } from "motion/react";

import { Avatar, AvatarFallback, AvatarGroup, AvatarImage, type AvatarFallbackProps } from "@/components/data-display/avatar";
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

type AppHeaderProps = React.ComponentProps<"header"> & {
	/** Preformatted date and time, e.g. "Wed Oct 21 · 4:54 PM". */
	clock: string;
	unreadMessages: number;
	/** The clinicians on shift with the user, shown overlapping in the team button. */
	team: AppHeaderPerson[];
	/** The signed-in user. */
	user: AppHeaderUser;
	onSearch?: () => void;
	onOpenMessages?: () => void;
	onToggleTheme?: () => void;
	/** The current color mode. The theme button shows the moon in light mode (to go dark) and the sun in dark mode. */
	theme?: "light" | "dark";
	onOpenTeam?: () => void;
	onOpenUserMenu?: () => void;
	/**
	 * Tighter vertical padding (8px instead of 16px), e.g. while the page is scrolled under a sticky header. The change
	 * animates, and is instant under reduced motion.
	 */
	compact?: boolean;
};

// Vertical padding in px, default and compact.
const headerPaddingY = { default: 16, compact: 8 } as const;

const pillClassName =
	"inline-flex h-12 shrink-0 items-center rounded-full border border-border text-foreground outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

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

	return (
		<span aria-hidden='true' className='grid size-6 *:col-start-1 *:row-start-1'>
			<motion.span initial={false} variants={variants} animate={theme === "dark" ? "hidden" : "shown"}>
				<MoonIcon className='size-6' />
			</motion.span>
			<motion.span initial={false} variants={variants} animate={theme === "dark" ? "shown" : "hidden"}>
				<SunIcon className='size-6' />
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

/**
 * Intercept Live's top bar: connection status and clock on the left; search, messages, theme, the team on shift and
 * the user's menu on the right. Each button calls its own handler; the header holds no state.
 *
 * Figma: [intercept.ds › Header](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1112-4116)
 */
function AppHeader({
	clock,
	unreadMessages,
	team,
	user,
	onSearch,
	onOpenMessages,
	onToggleTheme,
	theme = "light",
	onOpenTeam,
	onOpenUserMenu,
	compact = false,
	className,
	...props
}: AppHeaderProps) {
	const { resolve } = useMotionPreference();
	const paddingY = compact ? headerPaddingY.compact : headerPaddingY.default;

	return (
		<header
			data-slot='app-header'
			data-compact={compact ? "" : undefined}
			className={cn("border-b border-border px-6", className)}
			{...props}
		>
			{/* Motion animates the vertical padding here, so the header's own props stay plain HTML. */}
			<motion.div
				initial={false}
				animate={{ paddingTop: paddingY, paddingBottom: paddingY }}
				transition={resolve(standardTransition)}
				className='flex items-center justify-between'
			>
				<div className='flex items-center gap-[13px]'>
					<span className='inline-flex h-9 items-center gap-1.5 rounded-full border border-transparent bg-success-subtle px-3 text-sm/4.5 font-bold tracking-[0.03em] text-success uppercase'>
						<LiveDot />
						Online
					</span>
					<Typography as='p' size='xl' weight='semibold' className='tabular-nums'>
						{clock}
					</Typography>
				</div>

				<div className='flex items-center gap-2'>
					<button type='button' onClick={onSearch} className={cn(pillClassName, "gap-[11px] pr-3.5 pl-[11px]")}>
						<span className='inline-flex items-center gap-1.5 text-base font-medium'>
							<SearchIcon aria-hidden='true' className='size-6' />
							Search
						</span>
						<kbd className='min-w-[18px] rounded-[3px] border border-border bg-background-subtle px-[3px] text-center font-sans text-xs/4.5 font-medium'>
							/
						</kbd>
					</button>
					<button
						type='button'
						onClick={onOpenMessages}
						aria-label={`Messages, ${unreadMessages} unread`}
						className={cn(pillClassName, "gap-1.5 pr-3.5 pl-[11px] text-base font-semibold")}
					>
						<MessageCircleMoreIcon aria-hidden='true' className='size-[23px]' />
						{unreadMessages}
					</button>
					<button
						type='button'
						onClick={onToggleTheme}
						aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
						className={cn(pillClassName, "p-[11px]")}
					>
						<ThemeIcon theme={theme} />
					</button>
					<button
						type='button'
						onClick={onOpenTeam}
						aria-label={`Team on shift: ${team.map((person) => person.name).join(", ")}`}
						className={cn(pillClassName, "gap-1.5 pr-3 pl-1.5")}
					>
						<AvatarGroup aria-hidden='true'>
							{team.map((person) => (
								<PersonAvatar key={person.name} person={person} />
							))}
						</AvatarGroup>
						<ChevronDownIcon aria-hidden='true' className='size-4' />
					</button>
					<button type='button' onClick={onOpenUserMenu} className={cn(pillClassName, "gap-1.5 pr-3 pl-1.5")}>
						<span className='flex items-center gap-2'>
							<PersonAvatar person={user} />
							<span className='flex flex-col items-start'>
								<span className='text-sm/[19px] font-semibold'>{user.name}</span>
								<span className='text-xs/[14px]'>{user.shiftEnds}</span>
							</span>
						</span>
						<ChevronDownIcon aria-hidden='true' className='size-4' />
					</button>
				</div>
			</motion.div>
		</header>
	);
}

export { AppHeader, type AppHeaderPerson, type AppHeaderProps, type AppHeaderUser };
