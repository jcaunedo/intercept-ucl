import * as React from "react";
import {
	BellRingIcon,
	BookOpenTextIcon,
	BoxIcon,
	ChartColumnIcon,
	CircleUserIcon,
	HeartCrackIcon,
	LayoutGridIcon,
	LifeBuoyIcon,
	MessageCircleMoreIcon,
	SearchIcon,
	ShieldIcon,
	SparklesIcon,
	SquareActivityIcon,
} from "lucide-react";
import { motion, useMotionValueEvent, useScroll } from "motion/react";

import { BoxSolidIcon } from "@/components/icons/box-solid-icon";
import { ChartColumnSolidIcon } from "@/components/icons/chart-column-solid-icon";
import { CircleUserSolidIcon } from "@/components/icons/circle-user-solid-icon";
import { HeartCrackSolidIcon } from "@/components/icons/heart-crack-solid-icon";
import { LayoutGridSolidIcon } from "@/components/icons/layout-grid-solid-icon";
import { MessageCircleMoreSolidIcon } from "@/components/icons/message-circle-more-solid-icon";
import { ShieldSolidIcon } from "@/components/icons/shield-solid-icon";
import { SquareActivitySolidIcon } from "@/components/icons/square-activity-solid-icon";
import { EmptyState } from "@/components/feedback/empty-state";
import { AppHeader, type AppHeaderPerson, type AppHeaderUser } from "@/components/navigation/app-header";
import { Sidebar, type SidebarNavItem } from "@/components/navigation/sidebar";
import { Typography } from "@/components/typography/typography";
import { useCurrentMinute } from "@/lib/hooks/use-current-minute";
import { cn } from "@/lib/utils";

import { AskInterceptPanel } from "./ask-intercept-panel";
import { PagePanelSlotProvider, sidePanelWidth } from "./side-panel";

/* -------------------------------------------------------------------------- */
/* Product content                                                            */
/* -------------------------------------------------------------------------- */

// The chat's Sidebar item: an action, matched by its label (Oct 27, 2026: "Ask Intercept Live", was "Ask Intercept").
const askInterceptLabel = "Ask Intercept Live";

const navGroups: SidebarNavItem[][] = [
	[
		{ icon: SearchIcon, label: "Search" },
		{ icon: SparklesIcon, label: askInterceptLabel },
	],
	[
		{ icon: CircleUserIcon, activeIcon: CircleUserSolidIcon, label: "Census", navigateTo: "Census" },
		{ icon: SquareActivityIcon, activeIcon: SquareActivitySolidIcon, label: "Monitoring", navigateTo: "Monitoring" },
		{ icon: BellRingIcon, label: "Alert Queue", navigateTo: "Alert Queue" },
		{ icon: MessageCircleMoreIcon, activeIcon: MessageCircleMoreSolidIcon, label: "Messages", navigateTo: "Messages" },
		{ icon: HeartCrackIcon, activeIcon: HeartCrackSolidIcon, label: "Virtual Sepsis", navigateTo: "Virtual Sepsis" },
	],
	[
		{ icon: ShieldIcon, activeIcon: ShieldSolidIcon, label: "Compliance", navigateTo: "Compliance" },
		{ icon: ChartColumnIcon, activeIcon: ChartColumnSolidIcon, label: "Analytics", navigateTo: "Analytics" },
		{ icon: BoxIcon, activeIcon: BoxSolidIcon, label: "Marketplace", navigateTo: "Marketplace" },
		{ icon: LayoutGridIcon, activeIcon: LayoutGridSolidIcon, label: "Administration", navigateTo: "Administration" },
	],
];

const navFooter: SidebarNavItem[] = [
	{ icon: BookOpenTextIcon, label: "Documentation" },
	{ icon: LifeBuoyIcon, label: "Support" },
];

// Every Sidebar page, with the empty state it shows when a layout doesn't render it. Search and Ask Intercept aren't
// pages (they'd open over the current one), so they have no entry.
const emptyPages = {
	Census: {
		title: "No patients on the census",
		description: "Patients admitted to your hospitals will appear here.",
	},
	// The Monitoring page is the Specification's Tele-Critical Care Clinical Surveillance module.
	Monitoring: {
		title: "No patients being monitored",
		description: "Patients you're monitoring will appear here, with their live vitals and trends.",
	},
	"Alert Queue": {
		title: "No alerts in the queue",
		description: "New alerts for your patients will appear here, highest priority first.",
	},
	Messages: { title: "No messages yet", description: "Messages from your care team will appear here." },
	"Virtual Sepsis": {
		title: "No patients on sepsis watch",
		description: "Patients flagged by sepsis screening will appear here.",
	},
	Compliance: {
		title: "No compliance reports yet",
		description: "Protocol and documentation compliance for your units will appear here.",
	},
	Analytics: {
		title: "No analytics yet",
		description: "Once your census has activity, you'll see trends and outcomes here.",
	},
	Marketplace: {
		title: "Nothing in the Marketplace yet",
		description: "Clinical agents and integrations you can add to Intercept will appear here.",
	},
	Administration: {
		title: "Nothing to manage yet",
		description: "Users, hospitals and settings for your organization will appear here.",
	},
} satisfies Record<string, { title: string; description: string }>;

type InterceptLivePage = keyof typeof emptyPages;

/** "Wed Oct 21 · 4:54 PM" in the user's locale: weekday, month and day (without the locale's commas), then the time. */
function formatClock(date: Date) {
	const day = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" })
		.formatToParts(date)
		.filter((part) => part.type !== "literal")
		.map((part) => part.value)
		.join(" ");
	const time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
	return `${day} · ${time}`;
}

/** Time left in the shift, "Shift ends in 3h 45m" ("in 45m" under an hour), or "Shift ended" once it's past. */
function formatShiftRemaining(endsAt: string, now: number) {
	const minutes = Math.ceil((Date.parse(endsAt) - now) / 60_000);
	if (minutes <= 0) return "Shift ended";
	const hours = Math.floor(minutes / 60);
	return `Shift ends in ${hours ? `${hours}h ` : ""}${minutes % 60}m`;
}

/**
 * The page's color mode, kept as the `.dark` class on <html> (so portaled menus and tooltips follow it too). It also
 * watches the class, so anything else that changes it (e.g. Storybook's toolbar) stays in sync. An app would usually
 * own this in its theme provider instead.
 */
function useDocumentTheme() {
	const read = () =>
		typeof document !== "undefined" && document.documentElement.classList.contains("dark") ? "dark" : "light";
	const [theme, setTheme] = React.useState<"light" | "dark">(read);

	React.useEffect(() => {
		const observer = new MutationObserver(() => setTheme(read()));
		observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
		return () => observer.disconnect();
	}, []);

	const toggleTheme = React.useCallback(() => {
		document.documentElement.classList.toggle("dark", read() === "light");
	}, []);

	return { theme, toggleTheme };
}

/* -------------------------------------------------------------------------- */
/* Intercept Live shell                                                       */
/* -------------------------------------------------------------------------- */

type InterceptLiveProps = {
	/**
	 * Preformatted date and time, e.g. "Wed Oct 21 · 4:54 PM". Defaults to the user's current date and time, in their
	 * locale, updating every minute; pass one to pin the clock (e.g. for a screenshot).
	 */
	clock?: string;
	user: AppHeaderUser;
	/**
	 * When the user's shift ends, ISO 8601. The header counts down to it, updating each minute ("Shift ends in 3h 45m").
	 * Without it, or before the first client render, `user.shiftEnds` shows as given.
	 */
	shiftEndsAt?: string;
	/** The clinicians on shift with the user. */
	team: AppHeaderPerson[];
	unreadMessages: number;
	/**
	 * The content of each page the layout builds. The Sidebar's other pages show their title and an empty state. A page
	 * can open its own side panel right of the canvas with PagePanel (e.g. Monitoring's live feed).
	 */
	pages: Partial<Record<InterceptLivePage, React.ReactNode>>;
	/** The page shown first. */
	defaultPage?: InterceptLivePage;
};

/**
 * Intercept Live's Provider Desktop: the Sidebar (collapsed to its rail by default) beside the canvas, with the sticky
 * AppHeader over the current page. Figma origin: Intercept-Live › Census (1:350).
 */
function InterceptLive({
	clock,
	user,
	shiftEndsAt,
	team,
	unreadMessages,
	pages,
	defaultPage = "Census",
}: InterceptLiveProps) {
	const [sidebarCollapsed, setSidebarCollapsed] = React.useState(true);
	const [page, setPage] = React.useState<InterceptLivePage>(defaultPage);
	// Ask Intercept is an action, not a page: it toggles the chat panel and leaves the current page as it is.
	const [chatOpen, setChatOpen] = React.useState(false);
	// Where the current page's side panel renders (PagePanel).
	const [panelSlot, setPanelSlot] = React.useState<HTMLDivElement | null>(null);
	// Kept here, so the chat reopens at the width it was left at.
	const [chatWidth, setChatWidth] = React.useState<number>(sidePanelWidth.default);
	const groups = React.useMemo(
		() =>
			navGroups.map((group) =>
				group.map((item) =>
					item.label === askInterceptLabel ? { ...item, onClick: () => setChatOpen((open) => !open) } : item,
				),
			),
		[],
	);
	// The header sticks to the top of the canvas and tightens once the canvas scrolls; back at the top it relaxes.
	const canvasRef = React.useRef<HTMLDivElement>(null);
	const { scrollY } = useScroll({ container: canvasRef });
	const [headerCompact, setHeaderCompact] = React.useState(false);
	useMotionValueEvent(scrollY, "change", (y) => setHeaderCompact(y > 0));
	const { theme, toggleTheme } = useDocumentTheme();
	// The user's real date and time unless the app pins one. Empty for the first server render (see useCurrentMinute).
	const currentMinute = useCurrentMinute();
	const shownClock = clock ?? (currentMinute === null ? "" : formatClock(new Date(currentMinute)));
	// The shift countdown ticks on the same minute as the clock.
	const shownUser =
		shiftEndsAt && currentMinute !== null
			? { ...user, shiftEnds: formatShiftRemaining(shiftEndsAt, currentMinute) }
			: user;

	return (
		<PagePanelSlotProvider value={panelSlot}>
			<div className='flex h-screen bg-background-subtle'>
				<Sidebar
					groups={groups}
					footerItems={navFooter}
					activeItem={page}
					onNavigate={(navigateTo) => setPage(navigateTo as InterceptLivePage)}
					collapsed={sidebarCollapsed}
					onCollapsedChange={setSidebarCollapsed}
					className='h-full'
				/>

				{/* Global: opens on every page, between the Sidebar and the page. */}
				<AskInterceptPanel
					open={chatOpen}
					onOpenChange={setChatOpen}
					carded={sidebarCollapsed}
					width={chatWidth}
					onWidthChange={setChatWidth}
				/>

				{/* With the rail collapsed, the canvas sits on the page as a card: 16px left radius and Figma's raw canvas shadow
				    (0 0 26px, 8%; no effect style yet). Expanded, it meets the white rail flush. Both change with the rail's
				    width. `relative` puts the canvas above the Sidebar (itself `relative`), so the shadow falls over the rail
				    instead of under it. layoutScroll: the cards' layout animations measure against this scroll container, so they
				    stay right when it's scrolled. */}
				<motion.div
					ref={canvasRef}
					layoutScroll
					className={cn(
						"relative flex min-w-0 flex-1 flex-col overflow-y-auto bg-background transition-[border-radius,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
						// With the chat open the chat takes the card edge, and the canvas keeps its shadow plus a 1px `border` on its
						// left, a divider that still shows in dark mode, where the shadow doesn't (Intercept-Live "Chat open").
						chatOpen
							? "rounded-none border-l border-border shadow-[0_0_26px_0_oklch(0_0_0/8%)]"
							: sidebarCollapsed
								? "rounded-l-2xl shadow-[0_0_26px_0_oklch(0_0_0/8%)]"
								: "rounded-none shadow-none",
					)}
				>
					{/* A direct child of the canvas, so it can stay stuck for the whole scroll (sticky can't leave its parent). */}
					<AppHeader
						clock={shownClock}
						user={shownUser}
						team={team}
						unreadMessages={unreadMessages}
						compact={headerCompact}
						theme={theme}
						onToggleTheme={toggleTheme}
						// A subtle shadow while the page scrolls under it, fading with the padding (same 300ms and curve as
						// standardTransition).
						className={cn(
							"sticky top-0 z-20 bg-background transition-shadow duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none",
							headerCompact ? "shadow-sm" : "shadow-none",
						)}
					/>

					{pages[page] ?? (
						// A page this layout doesn't build: its title, and an empty state centered, both ways, in the page area below
						// the header.
						<main className='relative flex flex-1 flex-col p-6'>
							<Typography as='h1' size='2xl' weight='bold'>
								{page}
							</Typography>
							<EmptyState
								className='absolute inset-0 px-6'
								title={emptyPages[page].title}
								description={emptyPages[page].description}
							/>
						</main>
					)}
				</motion.div>

				{/* The current page's side panel (PagePanel) lands here, between the canvas and the screen's right edge.
				    `contents`, so the panel is a flex item of this row. */}
				<div ref={setPanelSlot} className='contents' />
			</div>
		</PagePanelSlotProvider>
	);
}

export { InterceptLive, type InterceptLivePage, type InterceptLiveProps };
