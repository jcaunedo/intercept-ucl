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
import {
	AppHeader,
	type AppHeaderPatientProps,
	type AppHeaderPerson,
	type AppHeaderUser,
} from "@/components/navigation/app-header";
import { Sidebar, type SidebarNavItem } from "@/components/navigation/sidebar";
import { Typography } from "@/components/typography/typography";
import { useCurrentMinute } from "@/lib/hooks/use-current-minute";
import { cn } from "@/lib/utils";

import { AskInterceptPanel, type AskInterceptResponder } from "./ask-intercept-panel";
import { PatientListPanel, type PatientListEntry } from "./patient-list-panel";
import { PatientNavigationProvider, type PatientNavigation } from "./patient-navigation";
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

/**
 * The sticky header, with a subtle shadow while the page scrolls under it, fading with the padding (same 300ms and
 * curve as standardTransition).
 */
const headerClassName = (compact: boolean) =>
	cn(
		"sticky top-0 z-20 bg-background transition-shadow duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none",
		compact ? "shadow-sm" : "shadow-none",
	);

/* -------------------------------------------------------------------------- */
/* Intercept Live shell                                                       */
/* -------------------------------------------------------------------------- */

/** A patient's details, as the shell shows them: the name for the header's breadcrumb, the page, and the header's actions. */
type PatientDetailsView = {
	name: string;
	content: React.ReactNode;
	headerActions?: Pick<AppHeaderPatientProps, "onRaiseConcern" | "onHuddleTeam" | "onEscalate" | "moreActions">;
	/** The patients of the list the patient was opened from, in its order, for the patient list (PRD PD-015). */
	patientList?: PatientListEntry[];
};

/** Where the open patient sits in the list it was opened from, to step to the previous or next one (PRD PD-015). */
type PatientStepper = {
	previousId?: string;
	nextId?: string;
	/** 1-based, e.g. 3 of 14. Missing when the patient wasn't opened from a list. */
	position?: { index: number; count: number };
	/** The ids of the list the patient was opened from, in its order. Missing when there's no list (e.g. from an alert). */
	list?: string[];
	onSelectPatient: (patientId: string) => void;
};

/** The patient whose details are open, and the list they were opened from. */
type OpenPatient = { id: string; list?: string[] };

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
	/**
	 * A patient's details page (PRD Patient details), shown over the current page when the page opens one of its
	 * patients: the header turns to its patient variant, with a breadcrumb back. Gets the patient's id and where they sit
	 * in the list they were opened from; returns their name and page, or null for a patient it can't show. Without it,
	 * opening a patient leaves the page as it is.
	 */
	renderPatientDetails?: (patientId: string, stepper: PatientStepper) => PatientDetailsView | null;
	/** A patient whose details show first, over `defaultPage`, with the list to step through. */
	defaultPatient?: OpenPatient;
	/**
	 * Answers questions in Ask Intercept Live, with the page and the patient on screen. Without it, the chat greets the
	 * user and says it can't answer yet.
	 */
	askIntercept?: AskInterceptResponder;
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
	renderPatientDetails,
	defaultPatient,
	askIntercept,
}: InterceptLiveProps) {
	const [sidebarCollapsed, setSidebarCollapsed] = React.useState(true);
	const [page, setPage] = React.useState<InterceptLivePage>(defaultPage);
	// Patient details open over the page, which stays the Sidebar's active item (PRD PD-001).
	const [openPatient, setOpenPatient] = React.useState<OpenPatient | null>(defaultPatient ?? null);
	// The left side panel: Ask Intercept Live (an action, not a page: it leaves the current page as it is) or, on a
	// patient's page, the patient list. They share the place, so opening one closes the other.
	const [leftPanel, setLeftPanel] = React.useState<"chat" | "patients" | null>(null);
	const chatOpen = leftPanel === "chat";
	const setChatOpen = React.useCallback((open: boolean) => setLeftPanel(open ? "chat" : null), []);
	const toggleLeftPanel = React.useCallback(
		(panel: "chat" | "patients") => setLeftPanel((current) => (current === panel ? null : panel)),
		[],
	);
	const [patientListWidth, setPatientListWidth] = React.useState<number>(sidePanelWidth.min);
	// Where the current page's side panel renders (PagePanel).
	const [panelSlot, setPanelSlot] = React.useState<HTMLDivElement | null>(null);
	// Kept here, so the chat reopens at the width it was left at.
	const [chatWidth, setChatWidth] = React.useState<number>(sidePanelWidth.default);
	const groups = React.useMemo(
		() =>
			navGroups.map((group) =>
				group.map((item) =>
					item.label === askInterceptLabel ? { ...item, onClick: () => toggleLeftPanel("chat") } : item,
				),
			),
		[toggleLeftPanel],
	);
	// The header sticks to the top of the canvas and tightens once the canvas scrolls; back at the top it relaxes.
	const canvasRef = React.useRef<HTMLDivElement>(null);
	const { scrollY } = useScroll({ container: canvasRef });
	const [headerCompact, setHeaderCompact] = React.useState(false);
	// The page's scroll position, restored on Back from a patient's details (PRD PD-AC-04). It's kept from the scroll
	// events while the page shows, not read when a patient opens: by then React's focus restore may have moved it. The
	// details start at the top, and so does each patient stepped to.
	const pageScroll = React.useRef(0);
	const openPatientId = openPatient?.id ?? null;
	const patientWasOpen = React.useRef(openPatientId !== null);
	useMotionValueEvent(scrollY, "change", (y) => {
		setHeaderCompact(y > 0);
		if (!patientWasOpen.current) pageScroll.current = y;
	});
	React.useLayoutEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		if (openPatientId !== null) canvas.scrollTop = 0;
		else if (patientWasOpen.current) canvas.scrollTop = pageScroll.current;
		patientWasOpen.current = openPatientId !== null;
	}, [openPatientId]);
	const navigation = React.useMemo<PatientNavigation>(
		() => ({
			openPatient: (patientId, list) => {
				if (!renderPatientDetails) return;
				setOpenPatient({ id: patientId, list });
			},
			compact: headerCompact,
			patientOpen: openPatientId !== null,
			openAskIntercept: () => setChatOpen(true),
		}),
		[renderPatientDetails, headerCompact, openPatientId],
	);
	const patientView = (() => {
		if (!openPatient || !renderPatientDetails) return null;
		const { id, list } = openPatient;
		const index = list ? list.indexOf(id) : -1;
		return renderPatientDetails(id, {
			previousId: index > 0 ? list?.[index - 1] : undefined,
			nextId: index >= 0 ? list?.[index + 1] : undefined,
			position: list && index >= 0 ? { index: index + 1, count: list.length } : undefined,
			list,
			onSelectPatient: (patientId) => setOpenPatient({ id: patientId, list }),
		});
	})();
	// The patient list shows only on a patient's page with a list; leaving it closes the list.
	const patientListOpen = leftPanel === "patients" && Boolean(patientView?.patientList);
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
		<PatientNavigationProvider value={navigation}>
			<PagePanelSlotProvider value={panelSlot}>
				<div className='flex h-screen bg-background-subtle'>
					<Sidebar
						groups={groups}
						footerItems={navFooter}
						activeItem={page}
						onNavigate={(navigateTo) => {
							setOpenPatient(null);
							setPage(navigateTo as InterceptLivePage);
						}}
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
						context={{ page, patientName: patientView?.name }}
						respond={askIntercept}
					/>

					{/* On a patient's page opened from a list: that list, to switch patient (PRD PD-015). */}
					{patientView?.patientList && openPatient ? (
						<PatientListPanel
							open={patientListOpen}
							onOpenChange={(open) => setLeftPanel(open ? "patients" : null)}
							carded={sidebarCollapsed}
							width={patientListWidth}
							onWidthChange={setPatientListWidth}
							sourcePage={page}
							patients={patientView.patientList}
							currentId={openPatient.id}
							onSelectPatient={(patientId) => setOpenPatient({ id: patientId, list: openPatient.list })}
						/>
					) : null}

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
							// With a left panel open the panel takes the card edge, and the canvas keeps its shadow plus a 1px `border` on its
							// left, a divider that still shows in dark mode, where the shadow doesn't (Intercept-Live "Chat open").
							chatOpen || patientListOpen
								? "rounded-none border-l border-border shadow-[0_0_26px_0_oklch(0_0_0/8%)]"
								: sidebarCollapsed
									? "rounded-l-2xl shadow-[0_0_26px_0_oklch(0_0_0/8%)]"
									: "rounded-none shadow-none",
						)}
					>
						{/* A direct child of the canvas, so it can stay stuck for the whole scroll (sticky can't leave its parent). On
						    a patient's details, the patient variant: a breadcrumb back to the page, and the patient's actions. */}
						{patientView ? (
							<AppHeader
								variant='patient'
								sourcePage={page}
								patientName={patientView.name}
								onBack={() => setOpenPatient(null)}
								onToggleAskIntercept={() => toggleLeftPanel("chat")}
								askInterceptOpen={chatOpen}
								// Only with a list to switch through (not when the patient was opened from an alert).
								onTogglePatientList={patientView.patientList ? () => toggleLeftPanel("patients") : undefined}
								patientListOpen={patientListOpen}
								{...patientView.headerActions}
								compact={headerCompact}
								theme={theme}
								onToggleTheme={toggleTheme}
								className={headerClassName(headerCompact)}
							/>
						) : (
							<AppHeader
								clock={shownClock}
								user={shownUser}
								team={team}
								unreadMessages={unreadMessages}
								compact={headerCompact}
								theme={theme}
								onToggleTheme={toggleTheme}
								className={headerClassName(headerCompact)}
							/>
						)}

						{/* Under an open patient the page stays mounted, hidden, so its filters, sort and scroll are as they were on
						    Back (PRD PD-AC-04). Its side panel hides with it (no slot) and comes back open if it was. */}
						<div hidden={Boolean(patientView)} className='contents'>
							<PagePanelSlotProvider value={patientView ? null : panelSlot}>
								{pages[page] ?? (
									// A page this layout doesn't build: its title, and an empty state centered, both ways, in the page area
									// below the header.
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
							</PagePanelSlotProvider>
						</div>
						{patientView?.content}
					</motion.div>

					{/* The current page's side panel (PagePanel) lands here, between the canvas and the screen's right edge.
					    `contents`, so the panel is a flex item of this row. */}
					<div ref={setPanelSlot} className='contents' />
				</div>
			</PagePanelSlotProvider>
		</PatientNavigationProvider>
	);
}

export {
	InterceptLive,
	type InterceptLivePage,
	type InterceptLiveProps,
	type OpenPatient,
	type PatientDetailsView,
	type PatientStepper,
};
