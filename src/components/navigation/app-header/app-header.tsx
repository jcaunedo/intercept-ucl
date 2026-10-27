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
	 * Tighter vertical padding (8px instead of 12px), e.g. while the page is scrolled under a sticky header. The change
	 * animates, and is instant under reduced motion.
	 */
	compact?: boolean;
};

// Vertical padding in px, default and compact. The bottom loses 1px to the border line, so the header is 60px (52px
// compact), as Figma draws it with the line inside.
const headerPaddingY = { default: 12, compact: 8 } as const;

const focusClassName = "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

// Search, Messages and Theme: outlined 36px pills with a raised edge. Figma's paddings include the 1px border (it draws
// strokes inside), so the side paddings here are 1px less.
const pillClassName = cn(
	"inline-flex h-9 shrink-0 items-center rounded-full border border-input bg-background text-base font-semibold text-foreground shadow-xs transition-colors hover:bg-accent [&_svg]:size-5",
	focusClassName,
);

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

	return (
		<span aria-hidden='true' className='grid size-[18px] *:col-start-1 *:row-start-1 [&_svg]:size-[18px]'>
			<motion.span initial={false} variants={variants} animate={theme === "dark" ? "hidden" : "shown"}>
				<MoonIcon />
			</motion.span>
			<motion.span initial={false} variants={variants} animate={theme === "dark" ? "shown" : "hidden"}>
				<SunIcon />
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
			className={cn("border-b border-border bg-background px-4", className)}
			{...props}
		>
			{/* Motion animates the vertical padding here, so the header's own props stay plain HTML. */}
			<motion.div
				initial={false}
				animate={{ paddingTop: paddingY, paddingBottom: paddingY - 1 }}
				transition={resolve(standardTransition)}
				className='flex items-center justify-between'
			>
				<div className='flex items-center gap-3'>
					<span className='inline-flex h-9 items-center gap-1.5 rounded-full border border-transparent bg-success-subtle px-3 text-sm/4.5 font-bold tracking-[0.03em] text-success uppercase'>
						<LiveDot />
						Online
					</span>
					<Typography as='p' size='xl' weight='semibold' className='tabular-nums'>
						{clock}
					</Typography>
				</div>

				<div className='flex items-center gap-4'>
					<div className='flex items-center gap-3'>
						<button type='button' onClick={onSearch} className={cn(pillClassName, "gap-2 pr-[15px] pl-[9px]")}>
							<span className='inline-flex items-center gap-2'>
								<SearchIcon aria-hidden='true' />
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
							className={cn(pillClassName, "gap-2 pr-[15px] pl-[9px]")}
						>
							<MessageCircleMoreIcon aria-hidden='true' />
							{unreadMessages}
						</button>
						<button
							type='button'
							onClick={onToggleTheme}
							aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
							className={cn(pillClassName, "w-9 justify-center")}
						>
							<ThemeIcon theme={theme} />
						</button>
					</div>
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
				</div>
			</motion.div>
		</header>
	);
}

export { AppHeader, type AppHeaderPerson, type AppHeaderProps, type AppHeaderUser };
