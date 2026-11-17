import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, screen, userEvent, within } from "storybook/test";
import {
	BookOpenTextIcon,
	BuildingIcon,
	CalendarCheckIcon,
	CalendarClockIcon,
	CalendarIcon,
	ChartColumnIcon,
	CircleUserIcon,
	ContactIcon,
	FileTextIcon,
	HeartCrackIcon,
	HomeIcon,
	InboxIcon,
	LifeBuoyIcon,
	ListCheckIcon,
	MenuIcon,
	MessageCircleMoreIcon,
	RadarIcon,
	SettingsIcon,
	ShieldCheckIcon,
	SparklesIcon,
	SquareActivityIcon,
	Undo2Icon,
	UserSearchIcon,
	UsersIcon,
} from "lucide-react";

import { CalendarSolidIcon } from "@/components/icons/calendar-solid-icon";
import { ChartColumnSolidIcon } from "@/components/icons/chart-column-solid-icon";
import { CircleUserSolidIcon } from "@/components/icons/circle-user-solid-icon";
import { HeartCrackSolidIcon } from "@/components/icons/heart-crack-solid-icon";
import { HomeSolidIcon } from "@/components/icons/home-solid-icon";
import { InboxSolidIcon } from "@/components/icons/inbox-solid-icon";
import { MessageCircleMoreSolidIcon } from "@/components/icons/message-circle-more-solid-icon";
import { SparklesSolidIcon } from "@/components/icons/sparkles-solid-icon";
import { SquareActivitySolidIcon } from "@/components/icons/square-activity-solid-icon";
import {
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
} from "@/components/overlays/dropdown-menu";
import { Sidebar, SidebarMenuButton, type SidebarNavItem } from "./sidebar";

// Each workspace passes its own items (intercept.ds `sidebar` Role=Clinical, Marketplace, Administration; Left Nav Spec,
// PRD Sidebar). Solid icons show while an item is active; items without one keep their outline icon. lucide has no AI
// icon for Ask Intercept; Sparkles stands in.
const ask: SidebarNavItem = { icon: SparklesIcon, activeIcon: SparklesSolidIcon, label: "Ask Intercept" };

const clinicalGroups: SidebarNavItem[][] = [
	[ask],
	[
		{ icon: SquareActivityIcon, activeIcon: SquareActivitySolidIcon, label: "Monitoring" },
		{ icon: InboxIcon, activeIcon: InboxSolidIcon, label: "Inbox" },
		{ icon: MessageCircleMoreIcon, activeIcon: MessageCircleMoreSolidIcon, label: "Messages" },
		{ icon: ListCheckIcon, label: "Protocols" },
		{ icon: HeartCrackIcon, activeIcon: HeartCrackSolidIcon, label: "Virtual Sepsis" },
	],
	[
		{ icon: CircleUserIcon, activeIcon: CircleUserSolidIcon, label: "Patients" },
		{ icon: CalendarIcon, activeIcon: CalendarSolidIcon, label: "Schedule" },
		{ icon: ChartColumnIcon, activeIcon: ChartColumnSolidIcon, label: "Analytics" },
	],
];

// The hospital side's Marketplace sidebar: Requests is where it lands.
const marketplaceGroups: SidebarNavItem[][] = [
	[ask],
	[
		{ icon: UserSearchIcon, label: "Requests" },
		{ icon: CalendarClockIcon, label: "Open shifts" },
		{ icon: UsersIcon, label: "Clinician network" },
	],
	[{ icon: FileTextIcon, label: "Contracts & billing" }],
];

// Intercept's Administration sidebar: Operations is where it lands.
const administrationGroups: SidebarNavItem[][] = [
	[ask],
	[
		{ icon: RadarIcon, label: "Operations" },
		{ icon: CalendarCheckIcon, label: "Coverage" },
		{ icon: ContactIcon, label: "Providers" },
		{ icon: BuildingIcon, label: "Hospitals" },
	],
	[
		{ icon: ShieldCheckIcon, label: "Compliance" },
		{ icon: SettingsIcon, label: "System" },
	],
];

const onSelectScenario = fn();
const onResetPrototype = fn();

// Prototype opens a menu above itself: the prototype's scenarios, then "Reset prototype" after a divider.
const footerItems: SidebarNavItem[] = [
	{ icon: BookOpenTextIcon, label: "Documentation" },
	{ icon: LifeBuoyIcon, label: "Support" },
	{
		icon: MenuIcon,
		label: "Prototype",
		menu: (
			<>
				<DropdownMenuGroup>
					<DropdownMenuLabel>Scenarios</DropdownMenuLabel>
					<DropdownMenuItem onSelect={onSelectScenario}>Scenario 1 · Heart failure at 2 a.m.</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuItem onSelect={onResetPrototype}>
					<Undo2Icon aria-hidden='true' />
					Reset prototype
				</DropdownMenuItem>
			</>
		),
	},
];

const meta = {
	title: "Navigation/Sidebar",
	component: Sidebar,
	parameters: {
		layout: "fullscreen",
		// On the docs page each story renders in its own 720px iframe, so the full-height rail doesn't stretch the page.
		docs: { story: { inline: false, height: "720px" } },
	},
	tags: ["autodocs"],
	args: {
		groups: clinicalGroups,
		footerItems,
		// The first item (Ask Intercept) is an action, not a page. Monitoring is the first page and the default one.
		defaultActiveItem: "Monitoring",
	},
	decorators: [
		// The rail fills the viewport height (Sidebar is `h-screen`).
		(Story) => (
			<div className='flex h-screen bg-background-subtle'>
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The Clinical workspace. Click the collapse button, or anywhere on the rail's empty space, to collapse it. */
export const Default: Story = {
	args: { className: "h-full" },
};

/** Hover the rail to swap the mark for the expand icon; hover an item for its label. */
export const Collapsed: Story = {
	args: { className: "h-full", defaultCollapsed: true },
};

/** The Marketplace workspace, hospital side: it lands on Requests. */
export const Marketplace: Story = {
	args: { className: "h-full", groups: marketplaceGroups, defaultActiveItem: "Requests" },
};

/** The Administration workspace, Intercept's side: it lands on Operations. */
export const Administration: Story = {
	args: { className: "h-full", groups: administrationGroups, defaultActiveItem: "Operations" },
};

/** An active item other than the first, with a trailing suffix. */
export const ActiveItemAndSuffix: Story = {
	args: {
		className: "h-full",
		defaultActiveItem: "Inbox",
		groups: clinicalGroups.map((group) =>
			group.map((item) => (item.label === "Inbox" ? { ...item, suffix: 8 } : item)),
		),
	},
};

/** The page shell owns the state: `collapsed` + `onCollapsedChange`, and `activeItem` + `onNavigate`. */
export const Controlled: Story = {
	render: (args) => {
		const [collapsed, setCollapsed] = React.useState(false);
		const [active, setActive] = React.useState("Monitoring");
		const routed = args.groups.map((group) => group.map((item) => ({ ...item, navigateTo: item.label })));

		return (
			<>
				<Sidebar
					{...args}
					className='h-full'
					groups={routed}
					collapsed={collapsed}
					onCollapsedChange={setCollapsed}
					activeItem={active}
					onNavigate={setActive}
				/>
				<p className='p-6 text-sm text-foreground'>
					{collapsed ? "Collapsed" : "Expanded"} · {active}
				</p>
			</>
		);
	},
};

/** SidebarMenuButton: default, hover (the hover fill, held on) and active, plus collapsed, and each alert severity. */
export const MenuButtonStates: Story = {
	render: () => (
		<div className='flex flex-col gap-4 bg-sidebar p-4'>
			<div className='w-[232px]'>
				<SidebarMenuButton icon={HomeIcon} label='Default' />
			</div>
			<div className='w-[232px]'>
				<SidebarMenuButton icon={HomeIcon} label='Hover' className='bg-active text-foreground [&_svg]:text-icon' />
			</div>
			<div className='w-[232px]'>
				<SidebarMenuButton icon={HomeIcon} activeIcon={HomeSolidIcon} label='Active' active />
			</div>
			<div className='w-[232px]'>
				<SidebarMenuButton icon={SparklesIcon} activeIcon={SparklesSolidIcon} label='Pressed (panel open)' pressed />
			</div>
			<div className='w-[232px]'>
				<SidebarMenuButton icon={HomeIcon} label='With suffix' suffix='Suffix' />
			</div>
			<SidebarMenuButton icon={HomeIcon} label='Collapsed' collapsed />
			{(["critical", "high", "medium", "low", "resolved"] as const).map((alert) => (
				<div key={alert} className='flex items-center gap-4'>
					<div className='w-[232px]'>
						<SidebarMenuButton icon={HomeIcon} label={`Alert · ${alert}`} alert={alert} />
					</div>
					<SidebarMenuButton icon={HomeIcon} label={`Alert · ${alert}`} alert={alert} collapsed />
				</div>
			))}
		</div>
	),
};

/**
 * Ask Intercept opens a column, never a page: while it's open its row is pressed (`aria-pressed`), with the solid
 * sparkles but no semibold label, and Monitoring stays the current page.
 */
export const AskOpen: Story = {
	args: {
		className: "h-full",
		groups: clinicalGroups.map((group) => group.map((item) => (item === ask ? { ...item, pressed: true } : item))),
	},
	play: async ({ canvas }) => {
		await expect(canvas.getByRole("button", { name: "Ask Intercept", pressed: true })).toBeVisible();
		await expect(canvas.getByRole("button", { name: "Monitoring" })).toHaveAttribute("aria-current", "page");
	},
};

/**
 * An item with an active alert shows a dot on its icon in the severity's color; a resolved alert, or none, shows no dot.
 * Here Monitoring has a critical alert and Inbox a medium one. The page shell passes the most severe open alert.
 * Messages has unread messages: `unread`, a brand-colored dot that flashes every 2 s (MOTION.md Unread).
 */
export const ItemAlerts: Story = {
	args: {
		className: "h-full",
		groups: clinicalGroups.map((group) =>
			group.map((item) => {
				if (item.label === "Monitoring") return { ...item, alert: "critical" as const };
				if (item.label === "Inbox") return { ...item, alert: "medium" as const };
				if (item.label === "Virtual Sepsis") return { ...item, alert: "resolved" as const };
				if (item.label === "Messages") return { ...item, alert: "unread" as const };
				return item;
			}),
		),
	},
	play: async ({ canvas, canvasElement }) => {
		await expect(canvas.getByRole("button", { name: "Monitoring, Critical alert" })).toBeInTheDocument();
		await expect(canvas.getByRole("button", { name: "Inbox, Medium alert" })).toBeInTheDocument();
		await expect(canvas.getByRole("button", { name: "Virtual Sepsis" })).toBeInTheDocument();
		await expect(canvas.getByRole("button", { name: "Messages, Unread" })).toBeInTheDocument();
		const dots = canvasElement.querySelectorAll("[data-slot=sidebar-menu-button-alert][data-severity]");
		await expect(dots).toHaveLength(3);
		// Figma puts the 6px dot 24px from the row's left edge and 2px from its top (2px over the 18px icon's corner).
		const dot = dots[0].getBoundingClientRect();
		const row = canvas.getByRole("button", { name: "Monitoring, Critical alert" }).getBoundingClientRect();
		await expect([dot.width, dot.left - row.left, dot.top - row.top]).toEqual([6, 24, 2]);
	},
};

/**
 * A footer item with a `menu` opens it above itself instead of acting, and never becomes active: here Prototype, with
 * the prototype's scenarios and "Reset prototype".
 */
export const ItemWithMenu: Story = {
	args: { className: "h-full" },
	play: async ({ canvas }) => {
		const prototype = canvas.getByRole("button", { name: "Prototype" });
		await userEvent.click(prototype);
		const menu = within(await screen.findByRole("menu"));
		await expect(prototype).toHaveAttribute("aria-expanded", "true");
		await userEvent.click(menu.getByRole("menuitem", { name: "Scenario 1 · Heart failure at 2 a.m." }));
		await expect(onSelectScenario).toHaveBeenCalled();
		await expect(prototype).not.toHaveAttribute("aria-current");
		await userEvent.click(prototype);
		await userEvent.click(await screen.findByRole("menuitem", { name: "Reset prototype" }));
		await expect(onResetPrototype).toHaveBeenCalled();
	},
};

/** Figma's four: Clinical expanded and collapsed, then Marketplace and Administration expanded. */
export const AllVariants: Story = {
	render: (args) => (
		<div className='flex h-full gap-8'>
			<Sidebar {...args} className='h-full' />
			<Sidebar {...args} className='h-full' defaultCollapsed />
			<Sidebar {...args} className='h-full' groups={marketplaceGroups} defaultActiveItem='Requests' />
			<Sidebar {...args} className='h-full' groups={administrationGroups} defaultActiveItem='Operations' />
		</div>
	),
};
