import * as React from "react";
import {
	BellRingIcon,
	BookOpenTextIcon,
	BoxIcon,
	ChartColumnIcon,
	CircleUserIcon,
	ExternalLinkIcon,
	HeartCrackIcon,
	LayoutGridIcon,
	LifeBuoyIcon,
	type LucideIcon,
	MenuIcon,
	MessageCircleMoreIcon,
	ShieldIcon,
	SparklesIcon,
	SquareActivityIcon,
	Undo2Icon,
} from "lucide-react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";

import { BoxSolidIcon } from "@/components/icons/box-solid-icon";
import { ChartColumnSolidIcon } from "@/components/icons/chart-column-solid-icon";
import { CircleUserSolidIcon } from "@/components/icons/circle-user-solid-icon";
import { HeartCrackSolidIcon } from "@/components/icons/heart-crack-solid-icon";
import { LayoutGridSolidIcon } from "@/components/icons/layout-grid-solid-icon";
import { MessageCircleMoreSolidIcon } from "@/components/icons/message-circle-more-solid-icon";
import { ShieldSolidIcon } from "@/components/icons/shield-solid-icon";
import { SquareActivitySolidIcon } from "@/components/icons/square-activity-solid-icon";
import { EmptyState } from "@/components/feedback/empty-state";
import { Toaster } from "@/components/feedback/sonner";
import {
	AppHeader,
	type AppHeaderPatientProps,
	type AppHeaderPerson,
	type AppHeaderUser,
} from "@/components/navigation/app-header";
import { Sidebar, type SidebarAlert, type SidebarNavItem } from "@/components/navigation/sidebar";
import {
	DropdownMenuCheckboxItem,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
} from "@/components/overlays/dropdown-menu";
import { Typography } from "@/components/typography/typography";
import { useCurrentMinute } from "@/lib/hooks/use-current-minute";
import {
	enterTransition,
	exitTransition,
	fadeVariants,
	motionDistance,
	motionDuration,
	revealVariants,
	useMotionPreference,
} from "@/lib/motion";
import { cn } from "@/lib/utils";

import { ConsultSessionProvider } from "./alert-modal/consult-session";
import { AskInterceptPanel, type AskInterceptNotice, type AskInterceptResponder } from "./ask-intercept-panel";
import { PatientListPanel, type PatientListEntry } from "./patient-list-panel";
import { PagePreferencesProvider, type PagePreferences } from "./page-preferences";
import { PatientNavigationProvider, type ActiveAlertsRequest, type PatientNavigation } from "./patient-navigation";
import {
	PageHidesToastsProvider,
	PagePanelSlotProvider,
	PatientHeaderActionsProvider,
	sidePanelWidth,
	type PatientHeaderActions,
} from "./side-panel";
import { useLayoutSidebar } from "./use-layout-sidebar";

// A patient's details reveal at twice Reveal's duration (1 s; Oct 31, 2026, user's call), so the page change reads. On
// Back they leave sliding right as they fade (Glide), while the page comes in from the left.
const detailsRevealVariants = {
	...revealVariants,
	animate: { opacity: 1, x: 0, y: 0, transition: { ...enterTransition, duration: motionDuration.slow * 2 } },
	exit: { opacity: 0, x: motionDistance.medium, transition: exitTransition },
};

/* -------------------------------------------------------------------------- */
/* Product content                                                            */
/* -------------------------------------------------------------------------- */

// The chat's Sidebar item: an action, matched by its label (Oct 27, 2026: "Ask Intercept Live", was "Ask Intercept").
const askInterceptLabel = "Ask Intercept Live";
// What Ask in an alert toast asks for the clinician (Scenario 1, step 3: the patient at a glance).
const patientOverviewQuestion = "Quick overview";

// No Search item (Oct 31, 2026, intercept.ds `sidebar` `1001:544`, user's call): search happens in Ask Intercept Live.
const navGroups: SidebarNavItem[][] = [
	[{ icon: SparklesIcon, label: askInterceptLabel }],
	[
		{ icon: SquareActivityIcon, activeIcon: SquareActivitySolidIcon, label: "Monitoring", navigateTo: "Monitoring" },
		{ icon: CircleUserIcon, activeIcon: CircleUserSolidIcon, label: "Census", navigateTo: "Census" },
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

// Every Sidebar page, with the empty state it shows when a layout doesn't render it. Ask Intercept isn't a page (it
// opens over the current one), so it has no entry.
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

/** Every Sidebar page, in the Sidebar's order. */
const interceptLivePages = Object.keys(emptyPages) as InterceptLivePage[];

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
	headerActions?: Pick<
		AppHeaderPatientProps,
		| "onVideoConsult"
		| "onOpenMessages"
		| "unreadMessages"
		| "onRaiseConcern"
		| "onHuddleTeam"
		| "onEscalate"
		| "moreActions"
		| "team"
		| "onOpenTeam"
	>;
	/** The patients of the list the patient was opened from, in its order, for the patient list (PRD PD-015). */
	patientList?: PatientListEntry[];
	/** The patient's tags ("Ventilated"…), for Ask Intercept Live's questions about them. */
	tags?: string[];
};

/** Where the open patient sits in the list it was opened from, to step to the previous or next one (PRD PD-015). */
type PatientStepper = {
	previousId?: string;
	nextId?: string;
	/** 1-based, e.g. 3 of 14. Missing when the patient wasn't opened from a list. */
	position?: { index: number; count: number };
	/** The ids of the list the patient was opened from, in its order; the page's own list when opened from elsewhere. */
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
	/** The page shown first. Monitoring by default, the Sidebar's first page. */
	defaultPage?: InterceptLivePage;
	/**
	 * A patient's details page (PRD Patient details), shown over the current page when the page opens one of its
	 * patients: the header turns to its patient variant, with a breadcrumb back. Gets the patient's id and where they sit
	 * in the list they were opened from; returns their name and page, or null for a patient it can't show. Without it,
	 * opening a patient leaves the page as it is.
	 */
	renderPatientDetails?: (patientId: string, stepper: PatientStepper) => PatientDetailsView | null;
	/**
	 * An alert, opened (the alert modal), when a page opens one: a monitoring card's alert bar or an alert toast's maximize
	 * button. Gets the patient and the alert (none from a card: the layout picks the one its bar shows), and `open` /
	 * `onOpenChange` for the modal, kept after it closes so it can animate out. Without it, opening an alert opens the
	 * patient's details.
	 */
	renderAlert?: (target: OpenAlert, controls: AlertControls) => React.ReactNode;
	/** A patient whose details show first, over `defaultPage`, with the list to step through. */
	defaultPatient?: OpenPatient;
	/**
	 * An alert open from the start, over the page (and `defaultPatient`, if set), as if the user had opened it: the
	 * patient's alert modal (their top alert without an `alertId`, as a card's alert bar opens it), with `consult: true`
	 * its video consult already calling, as its Video consult button does. Needs `renderAlert`.
	 */
	defaultAlert?: OpenAlert;
	/**
	 * Where the user is, each time it changes (and once at the start): the Sidebar's page, and the patient whose details
	 * are open over it, if any. E.g. to keep the address in step, so a shared link opens the same place.
	 */
	onLocationChange?: (location: {
		page: InterceptLivePage;
		patientId?: string;
		/** The alert open over it (the alert modal), if any, and whether it was opened with its video consult calling. */
		alert?: { patientId: string; consult?: boolean };
	}) => void;
	/**
	 * Answers questions in Ask Intercept Live, with the page and the patient on screen. Without it, the chat greets the
	 * user and says it can't answer yet.
	 */
	askIntercept?: AskInterceptResponder;
	/**
	 * What Ask Intercept Live tells the user unasked, e.g. that patients' alerts changed. Each new `id` is posted once in
	 * the conversation, whether the chat is open or not.
	 */
	askInterceptNotice?: AskInterceptNotice;
	/**
	 * The Sidebar's Prototype menu (prototype only, not the product): scenarios, views and shortcuts that jump to a
	 * specific moment of the prototype, grouped by `group`. With `onResetPrototype`, "Reset prototype" closes the menu
	 * after a divider. Without either, there's no Prototype item.
	 */
	prototype?: PrototypeShortcut[];
	/** "Reset prototype": starts the prototype over, in its initial state. */
	onResetPrototype?: () => void;
	/**
	 * An alert dot on Sidebar items, by page: the severity to show, e.g. Monitoring's worst open alert. It flashes while
	 * shown; none, or `resolved`, shows no dot.
	 */
	navAlerts?: Partial<Record<InterceptLivePage, SidebarAlert>>;
	/** Parts the layout adds inside the shell, where they can open patients, e.g. its alert toasts (`AlertToasts`). */
	children?: React.ReactNode;
};

/**
 * The alert a page opened: the patient's, and which one when the page knows (a toast does, a card's bar doesn't).
 * `consult`: opened to start the video consult, so the call is already ringing.
 */
type OpenAlert = { patientId: string; alertId?: string; consult?: boolean | "answered"; focus?: "discharge" };

/** What the alert modal needs from the shell. */
type AlertControls = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Closes the modal and opens the patient's details. */
	openPatient: () => void;
};

/** One entry in the Sidebar's Prototype menu. */
type PrototypeShortcut = {
	/** The menu group it sits in, e.g. "Scenarios", "Views", "Shortcuts". */
	group: string;
	label: string;
	/** The page it opens. */
	page?: InterceptLivePage;
	/** A patient whose details it opens, over `page`. */
	patientId?: string;
	/** An alert it opens (the alert modal) over `page`, with `consult: true` its video consult calling. */
	alert?: OpenAlert;
	/** Anything else it does, e.g. restart the scripted live feed. */
	onSelect?: () => void;
	/** A view that stays on until chosen again (e.g. the Kanban board): shown with a check while it's on. */
	checked?: boolean;
	/** A page outside the prototype it opens in a new tab instead (e.g. a demo storyboard), with an external-link icon. */
	href?: string;
	/** An icon at the item's end, where a storyboard's external-link icon sits, e.g. play for a scenario. */
	icon?: LucideIcon;
};

/**
 * Intercept Live's Provider Desktop: the Sidebar (collapsed to its rail by default, and on its own at lg and below;
 * DESIGN.md "Sidebar auto-collapses at lg and below") beside the canvas, with the sticky
 * AppHeader over the current page. Figma origin: Intercept-Live › Census (1:350).
 */
function InterceptLive({
	clock,
	user,
	shiftEndsAt,
	team,
	unreadMessages,
	pages,
	defaultPage = "Monitoring",
	renderPatientDetails,
	renderAlert,
	defaultPatient,
	defaultAlert,
	onLocationChange,
	askIntercept,
	askInterceptNotice,
	prototype = [],
	onResetPrototype,
	navAlerts,
	children,
}: InterceptLiveProps) {
	// Collapsed to the rail by default, and always at lg (1024) and below.
	const { sidebarCollapsed, handleSidebarCollapsedChange } = useLayoutSidebar(true);
	const [page, setPage] = React.useState<InterceptLivePage>(defaultPage);
	// Patient details open over the page, which stays the Sidebar's active item (PRD PD-001).
	const [openPatient, setOpenPatient] = React.useState<OpenPatient | null>(defaultPatient ?? null);
	// The alert modal over everything. The last alert stays after it closes, so the modal can animate out.
	// `key` counts the openings, so each one starts the modal afresh (its consult, its scroll).
	const [openAlert, setOpenAlert] = React.useState<(OpenAlert & { open: boolean; key: number }) | null>(() =>
		defaultAlert ? { ...defaultAlert, open: true, key: 1 } : null,
	);
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
	// View choices that hold across pages (Group by hospital, each page's sort and My patients), so switching pages, or
	// opening a patient and coming back, keeps them.
	const [groupByHospital, setGroupByHospital] = React.useState(false);
	const [sortBy, setSortBy] = React.useState<PagePreferences["sortBy"]>({});
	const [scope, setScope] = React.useState<PagePreferences["scope"]>({});
	// Closed alert toasts stay closed across pages, until a reload.
	const [closedAlertToasts, setClosedAlertToasts] = React.useState<PagePreferences["closedAlertToasts"]>({});
	const currentPage = page === "Census" ? "census" : page === "Monitoring" ? "monitoring" : undefined;
	const pagePreferences = React.useMemo<PagePreferences>(
		() => ({
			groupByHospital,
			onGroupByHospitalChange: setGroupByHospital,
			sortBy,
			onSortByChange: (page, next) => setSortBy((current) => ({ ...current, [page]: next })),
			scope,
			onScopeChange: (page, next) => setScope((current) => ({ ...current, [page]: next })),
			currentPage,
			closedAlertToasts,
			onCloseAlertToast: (alertId, severity) =>
				setClosedAlertToasts((current) => ({ ...current, [alertId]: severity })),
		}),
		[groupByHospital, sortBy, scope, currentPage, closedAlertToasts],
	);
	// Where the current page's side panel renders (PagePanel).
	const [panelSlot, setPanelSlot] = React.useState<HTMLDivElement | null>(null);
	// A patient page's own header actions (its video consult and messages panels; usePatientHeaderActions), over the
	// view's `headerActions`.
	const [patientHeaderActions, setPatientHeaderActions] = React.useState<PatientHeaderActions | null>(null);
	// How many of a page's panels hide the toasts (the live feed, Filters; useHideToasts): both can be open, so closing one
	// keeps them hidden while the other stays.
	const [panelsHidingToasts, setPanelsHidingToasts] = React.useState(0);
	const setPanelHidesToasts = React.useCallback(
		(hidden: boolean) => setPanelsHidingToasts((count) => Math.max(0, count + (hidden ? 1 : -1))),
		[],
	);
	// Kept here, so the chat reopens at the width it was left at.
	const [chatWidth, setChatWidth] = React.useState<number>(sidePanelWidth.default);
	const groups = React.useMemo(
		() =>
			navGroups.map((group) =>
				group.map((item) =>
					item.label === askInterceptLabel
						? { ...item, onClick: () => toggleLeftPanel("chat") }
						: item.navigateTo && navAlerts?.[item.navigateTo as InterceptLivePage]
							? { ...item, alert: navAlerts[item.navigateTo as InterceptLivePage] }
							: item,
				),
			),
		[toggleLeftPanel, navAlerts],
	);
	// The Prototype menu: its shortcuts by group, a divider between groups, then "Reset prototype" after a divider (as in
	// bethere-ucl).
	const prototypeGroups = [...new Set(prototype.map((shortcut) => shortcut.group))];
	const openShortcut = (shortcut: PrototypeShortcut) => {
		if (shortcut.page) setPage(shortcut.page);
		setOpenPatient(shortcut.patientId ? { id: shortcut.patientId } : null);
		const { alert } = shortcut;
		if (alert) setOpenAlert((current) => ({ ...alert, open: true, key: (current?.key ?? 0) + 1 }));
		shortcut.onSelect?.();
	};
	const prototypeMenu =
		prototype.length || onResetPrototype ? (
			<>
				{prototypeGroups.map((group, index) => (
					<DropdownMenuGroup key={group}>
						{index > 0 ? <DropdownMenuSeparator /> : null}
						<DropdownMenuLabel>{group}</DropdownMenuLabel>
						{prototype
							.filter((shortcut) => shortcut.group === group)
							.map((shortcut) =>
								shortcut.href ? (
									<DropdownMenuItem key={shortcut.label} asChild>
										<a href={shortcut.href} target='_blank' rel='noopener noreferrer'>
											{shortcut.label}
											<ExternalLinkIcon aria-hidden='true' className='ml-auto size-3.5 text-muted-foreground' />
											<span className='sr-only'>(opens in a new tab)</span>
										</a>
									</DropdownMenuItem>
								) : shortcut.checked === undefined ? (
									<DropdownMenuItem key={shortcut.label} onSelect={() => openShortcut(shortcut)}>
										{shortcut.label}
										{shortcut.icon ? (
											<shortcut.icon aria-hidden='true' className='ml-auto size-3.5 text-muted-foreground' />
										) : null}
									</DropdownMenuItem>
								) : (
									<DropdownMenuCheckboxItem
										key={shortcut.label}
										checked={shortcut.checked}
										onSelect={() => openShortcut(shortcut)}
									>
										{shortcut.label}
									</DropdownMenuCheckboxItem>
								),
							)}
					</DropdownMenuGroup>
				))}
				{prototype.length && onResetPrototype ? <DropdownMenuSeparator /> : null}
				{onResetPrototype ? (
					<DropdownMenuItem onSelect={onResetPrototype}>
						<Undo2Icon aria-hidden='true' />
						Reset prototype
					</DropdownMenuItem>
				) : null}
			</>
		) : null;
	const footerItems = prototypeMenu
		? [...navFooter, { icon: MenuIcon, label: "Prototype", menu: prototypeMenu }]
		: navFooter;
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
	// Who the chat is about. From the app header's Ask Intercept button (Oct 31, 2026, user's call) it's the patient on
	// screen, with no name of its own: it holds while their details are open, and it asks for their Quick overview. From Ask in an alert toast (Nov 2, 2026,
	// user's call) it carries the name, so it holds on any page. Removing the patient (the chip over the message box),
	// closing the chat or opening another patient's details ends it. From the Sidebar, the chat is general.
	const [chatPatient, setChatPatient] = React.useState<{ id: string; name?: string; tags?: string[] } | null>(null);
	// The question asked for the user when Ask in a toast opens the chat (AskInterceptPanel's `opener`).
	const [chatOpener, setChatOpener] = React.useState<{ id: string; question: string } | undefined>(undefined);
	const openerCount = React.useRef(0);
	// Reported after each navigation, not on every render: the latest callback is read when it fires.
	const onLocationChangeRef = React.useRef(onLocationChange);
	onLocationChangeRef.current = onLocationChange;
	const alertPatientId = openAlert?.open ? openAlert.patientId : undefined;
	const alertConsult = Boolean(openAlert?.open && openAlert.consult);
	React.useEffect(() => {
		onLocationChangeRef.current?.({
			page,
			patientId: openPatientId ?? undefined,
			alert: alertPatientId ? { patientId: alertPatientId, consult: alertConsult || undefined } : undefined,
		});
	}, [page, openPatientId, alertPatientId, alertConsult]);
	// Each patient whose details open, from a page or stepped to, for the pages' Recently viewed sort.
	const [viewedAt, setViewedAt] = React.useState<Record<string, string>>({});
	React.useEffect(() => {
		if (openPatientId !== null) setViewedAt((current) => ({ ...current, [openPatientId]: new Date().toISOString() }));
	}, [openPatientId]);
	// The patients the current page shows, as it last reported them (`setPageList`), tagged with the page.
	const [pageList, setPageList] = React.useState<{ page: InterceptLivePage; ids: string[] }>({ page, ids: [] });
	const reportPageList = React.useCallback(
		(ids: string[]) =>
			setPageList((current) =>
				current.page === page && current.ids.join() === ids.join() ? current : { page, ids },
			),
		[page],
	);
	// A patient opened without a list (an alert, a toast, the live feed, the chat, a shortcut) takes the page's list as it
	// shows now, so the header's patient list is always there (Nov 3, 2026, user's call; it was only for a patient opened
	// from a card or a row). A patient the page filters out comes first. Taken once, so the list doesn't reorder under
	// the clinician; before paint, so the header doesn't jump.
	React.useLayoutEffect(() => {
		if (!openPatient || openPatient.list) return;
		const ids = pageList.page === page ? pageList.ids : [];
		setOpenPatient({ id: openPatient.id, list: ids.includes(openPatient.id) ? ids : [openPatient.id, ...ids] });
	}, [openPatient, pageList, page]);
	// A hospital tab's alert count, clicked on any page: Monitoring, on that tab, with Active alerts on.
	const [activeAlertsRequest, setActiveAlertsRequest] = React.useState<ActiveAlertsRequest | null>(null);
	const hasMonitoring = Boolean(pages.Monitoring);
	const navigation = React.useMemo<PatientNavigation>(
		() => ({
			showActiveAlerts: hasMonitoring
				? (hospitalId, patientScope) => {
						setOpenPatient(null);
						setPage("Monitoring");
						if (patientScope) setScope((current) => ({ ...current, monitoring: patientScope }));
						setActiveAlertsRequest((current) => ({ hospitalId, key: (current?.key ?? 0) + 1 }));
					}
				: undefined,
			activeAlertsRequest,
			clearActiveAlertsRequest: () => setActiveAlertsRequest(null),
			openPatient: (patientId, list) => {
				if (!renderPatientDetails) return;
				setOpenPatient({ id: patientId, list });
			},
			// The alert modal (`renderAlert`); without one, the patient's details.
			openAlert: (patientId, alertId, options) => {
				if (renderAlert)
					setOpenAlert((current) => ({
						patientId,
						alertId,
						consult: options?.consult,
						focus: options?.focus,
						open: true,
						key: (current?.key ?? 0) + 1,
					}));
				else if (renderPatientDetails) setOpenPatient({ id: patientId });
			},
			askAboutPatient: (patientId, patientName, tags) => {
				setChatPatient({ id: patientId, name: patientName, tags });
				setChatOpener({ id: String(openerCount.current++), question: patientOverviewQuestion });
				setChatOpen(true);
			},
			setPageList: reportPageList,
			alertPatientId,
			compact: headerCompact,
			patientOpen: openPatientId !== null,
			viewedAt,
		}),
		[
			renderPatientDetails,
			renderAlert,
			reportPageList,
			headerCompact,
			openPatientId,
			viewedAt,
			setChatOpen,
			hasMonitoring,
			activeAlertsRequest,
			alertPatientId,
		],
	);
	const openAlertPatient = (patientId: string) => {
		setOpenAlert((current) => (current ? { ...current, open: false } : current));
		if (renderPatientDetails) setOpenPatient({ id: patientId });
	};
	const alertView =
		openAlert && renderAlert
			? renderAlert(openAlert, {
					open: openAlert.open,
					onOpenChange: (open) => setOpenAlert((current) => (current ? { ...current, open } : current)),
					openPatient: () => openAlertPatient(openAlert.patientId),
				})
			: null;
	// An alert the layout can't show (no detail for it): its patient's details instead, as without `renderAlert`.
	const alertMissing = Boolean(openAlert?.open && renderAlert && alertView == null);
	React.useEffect(() => {
		if (!alertMissing || !openAlert) return;
		setOpenAlert(null);
		if (renderPatientDetails) setOpenPatient({ id: openAlert.patientId });
	}, [alertMissing, openAlert, renderPatientDetails]);
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
	// Opening a patient reveals the details (MOTION.md Reveal: a fade and an 8px rise, over 1 s; Oct 31, 2026, user's
	// call, it was a Glide from the right). Back slides right (Glide): the details leave to the right and the page comes
	// in from the left. Once per navigation, not on stepping between patients; opacity only under reduced motion.
	const { prefersReducedMotion } = useMotionPreference();
	const glideDistance = prefersReducedMotion ? 0 : motionDistance.medium;
	// Not when the app opens on a patient: only a navigation glides.
	const mounted = React.useRef(false);
	React.useEffect(() => {
		mounted.current = true;
	}, []);
	// The name the chat's context shows: the open patient's, or the one Ask in a toast gave while no details are open.
	const chatPatientName = !chatOpen || !chatPatient
		? undefined
		: chatPatient.id === openPatientId
			? patientView?.name
			: openPatientId === null
				? chatPatient.name
				: undefined;
	// Their tags, from the same place as the name.
	const chatPatientTags =
		chatPatientName === undefined ? undefined : chatPatient?.id === openPatientId ? patientView?.tags : chatPatient?.tags;
	// The app header's button is filled while the chat is about someone.
	const chatInPatientContext = chatPatientName !== undefined;
	React.useEffect(() => {
		if (!chatOpen) setChatPatient(null);
	}, [chatOpen]);
	React.useEffect(() => {
		if (openPatientId !== null) setChatPatient((current) => (current && current.id !== openPatientId ? null : current));
	}, [openPatientId]);
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
			{/* A patient's consult (the call, its notetaker, the thread) goes with them between the alert and their page. */}
			<ConsultSessionProvider>
			<PagePreferencesProvider value={pagePreferences}>
				<PagePanelSlotProvider value={panelSlot}>
					<PageHidesToastsProvider value={setPanelHidesToasts}>
						<PatientHeaderActionsProvider value={setPatientHeaderActions}>
							<div className='flex h-screen bg-background-subtle'>
								<Sidebar
									groups={groups}
									footerItems={footerItems}
									activeItem={page}
									onNavigate={(navigateTo) => {
										setOpenPatient(null);
										setPage(navigateTo as InterceptLivePage);
									}}
									collapsed={sidebarCollapsed}
									onCollapsedChange={handleSidebarCollapsedChange}
									className='h-full'
								/>
	
								{/* Global: opens on every page, between the Sidebar and the page. */}
								<AskInterceptPanel
									open={chatOpen}
									onOpenChange={setChatOpen}
									carded={sidebarCollapsed}
									width={chatWidth}
									onWidthChange={setChatWidth}
									context={{
										page,
										patientName: chatPatientName,
										patientTags: chatPatientTags,
										openPatientId: openPatientId ?? undefined,
									}}
									respond={askIntercept}
									notice={askInterceptNotice}
									onRemovePatientContext={chatInPatientContext ? () => setChatPatient(null) : undefined}
									opener={chatOpener}
									onOpenPatient={renderPatientDetails ? (patientId) => navigation.openPatient(patientId) : undefined}
									onOpenAlert={renderAlert ? (patientId, alertId) => navigation.openAlert(patientId, alertId) : undefined}
								/>
	
								{/* On a patient's page: the list they were opened from, else the page's, to switch patient (PRD PD-015). */}
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
								    (0 0 26px; 16% since Nov 4, 2026, user's call, Figma 8%; no effect style yet). Expanded, it meets the white rail flush. Both change with the rail's
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
											? "rounded-none border-l border-border shadow-[0_0_26px_0_oklch(0_0_0/16%)]"
											: sidebarCollapsed
												? "rounded-l-2xl shadow-[0_0_26px_0_oklch(0_0_0/16%)]"
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
											// Opens the chat about this patient (or makes an open chat about them) with their Quick overview, as Ask in a
											// toast does: a conversation about anyone else is cleared first (Nov 4, 2026, user's call: it kept the last
											// patient's overview under this one's chip). Pressed again, closes it.
											onToggleAskIntercept={() => {
												if (chatInPatientContext) setChatOpen(false);
												else {
													if (openPatientId !== null) {
														setChatPatient({ id: openPatientId });
														setChatOpener({ id: String(openerCount.current++), question: patientOverviewQuestion });
													}
													setChatOpen(true);
												}
											}}
											askInterceptOpen={chatOpen}
											// Always: a patient opened from an alert gets the page's list (Nov 3, 2026, user's call).
											onTogglePatientList={patientView.patientList ? () => toggleLeftPanel("patients") : undefined}
											patientListOpen={patientListOpen}
											{...patientView.headerActions}
											{...patientHeaderActions}
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
									    Back (PRD PD-AC-04). Its side panel hides with it (no slot) and comes back open if it was. It leaves at once
									    and glides back in on Back. */}
									<motion.div
										initial={false}
										animate={
											patientView
												? { opacity: 0, x: -glideDistance, transition: { duration: 0 } }
												: { opacity: 1, x: 0, transition: enterTransition }
										}
										className={cn("flex min-w-0 flex-1 flex-col", patientView && "hidden")}
									>
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
									</motion.div>
									{/* popLayout: on Back the leaving details are taken out of the flow (over the page) while they slide out, so
									    the page takes its place at once and comes in beside them. */}
									<AnimatePresence mode='popLayout' initial={false}>
										{patientView ? (
											<motion.div
												key='details'
												variants={prefersReducedMotion ? fadeVariants : detailsRevealVariants}
												initial={mounted.current ? "initial" : false}
												animate='animate'
												exit='exit'
												className='flex min-w-0 flex-1 flex-col'
											>
												{patientView.content}
											</motion.div>
										) : null}
									</AnimatePresence>
								</motion.div>
	
								{/* The current page's side panel (PagePanel) lands here, between the canvas and the screen's right edge.
								    `contents`, so the panel is a flex item of this row. */}
								<div ref={setPanelSlot} className='contents' />
							</div>
							{children}
							{alertView ? (
								<React.Fragment key={openAlert?.key}>{alertView}</React.Fragment>
							) : null}
							{/* The app's one toast region: alert toasts and any other message. Hidden while the alert modal or a patient's
							    page is open, so a toast never covers them, and while the live feed is open, which already lists every
							    alert; they come back, with any that arrived meanwhile, when it closes. */}
							<Toaster hidden={Boolean((openAlert?.open && alertView) || patientView || panelsHidingToasts > 0)} />
						</PatientHeaderActionsProvider>
					</PageHidesToastsProvider>
				</PagePanelSlotProvider>
			</PagePreferencesProvider>
			</ConsultSessionProvider>
		</PatientNavigationProvider>
	);
}

export {
	InterceptLive,
	interceptLivePages,
	type AlertControls,
	type InterceptLivePage,
	type InterceptLiveProps,
	type OpenAlert,
	type OpenPatient,
	type PatientDetailsView,
	type PatientStepper,
	type PrototypeShortcut,
};
