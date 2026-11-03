import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, screen, userEvent, within } from "storybook/test";
import {
	BellRingIcon,
	BookOpenTextIcon,
	BoxIcon,
	ChartColumnIcon,
	CircleUserIcon,
	HeartCrackIcon,
	HomeIcon,
	LayoutGridIcon,
	LifeBuoyIcon,
	MenuIcon,
	MessageCircleMoreIcon,
	ShieldIcon,
	SparklesIcon,
	SquareActivityIcon,
	Undo2Icon,
} from "lucide-react";

import { BoxSolidIcon } from "@/components/icons/box-solid-icon";
import { ChartColumnSolidIcon } from "@/components/icons/chart-column-solid-icon";
import { CircleUserSolidIcon } from "@/components/icons/circle-user-solid-icon";
import { HeartCrackSolidIcon } from "@/components/icons/heart-crack-solid-icon";
import { HomeSolidIcon } from "@/components/icons/home-solid-icon";
import { LayoutGridSolidIcon } from "@/components/icons/layout-grid-solid-icon";
import { MessageCircleMoreSolidIcon } from "@/components/icons/message-circle-more-solid-icon";
import { ShieldSolidIcon } from "@/components/icons/shield-solid-icon";
import { SquareActivitySolidIcon } from "@/components/icons/square-activity-solid-icon";
import {
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
} from "@/components/overlays/dropdown-menu";
import { Sidebar, SidebarMenuButton, type SidebarNavItem } from "./sidebar";

// Solid icons show while an item is active. Ask Intercept and the footer items have none yet, so they keep their outline
// icon. lucide has no AI icon for Ask Intercept; Sparkles stands in. No Search item since Oct 31, 2026: search is in the
// chat.
const groups: SidebarNavItem[][] = [
	[{ icon: SparklesIcon, label: "Ask Intercept" }],
	[
		{ icon: SquareActivityIcon, activeIcon: SquareActivitySolidIcon, label: "Monitoring" },
		{ icon: CircleUserIcon, activeIcon: CircleUserSolidIcon, label: "Census" },
		{ icon: BellRingIcon, label: "Alert Queue" },
		{ icon: MessageCircleMoreIcon, activeIcon: MessageCircleMoreSolidIcon, label: "Messages" },
		{ icon: HeartCrackIcon, activeIcon: HeartCrackSolidIcon, label: "Virtual Sepsis" },
	],
	[
		{ icon: ShieldIcon, activeIcon: ShieldSolidIcon, label: "Compliance" },
		{ icon: ChartColumnIcon, activeIcon: ChartColumnSolidIcon, label: "Analytics" },
		{ icon: BoxIcon, activeIcon: BoxSolidIcon, label: "Marketplace" },
		{ icon: LayoutGridIcon, activeIcon: LayoutGridSolidIcon, label: "Administration" },
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
		groups,
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

/** Click the collapse button, or anywhere on the rail's empty space, to collapse it. */
export const Default: Story = {
	args: { className: "h-full" },
};

/** Hover the rail to swap the mark for the expand icon; hover an item for its label. */
export const Collapsed: Story = {
	args: { className: "h-full", defaultCollapsed: true },
};

/** An active item other than the first, with a trailing suffix. */
export const ActiveItemAndSuffix: Story = {
	args: {
		className: "h-full",
		defaultActiveItem: "Alert Queue",
		groups: groups.map((group) =>
			group.map((item) => (item.label === "Alert Queue" ? { ...item, suffix: 12 } : item)),
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
 * An item with an active alert shows a dot on its icon in the severity's color; a resolved alert, or none, shows no dot.
 * Here Monitoring has a critical alert and Alert Queue a medium one. The page shell passes the most severe open alert.
 */
export const ItemAlerts: Story = {
	args: {
		className: "h-full",
		groups: groups.map((group) =>
			group.map((item) => {
				if (item.label === "Monitoring") return { ...item, alert: "critical" as const };
				if (item.label === "Alert Queue") return { ...item, alert: "medium" as const };
				if (item.label === "Census") return { ...item, alert: "resolved" as const };
				return item;
			}),
		),
	},
	play: async ({ canvas, canvasElement }) => {
		await expect(canvas.getByRole("button", { name: "Monitoring, Critical alert" })).toBeInTheDocument();
		await expect(canvas.getByRole("button", { name: "Alert Queue, Medium alert" })).toBeInTheDocument();
		await expect(canvas.getByRole("button", { name: "Census" })).toBeInTheDocument();
		const dots = canvasElement.querySelectorAll("[data-slot=sidebar-menu-button-alert][data-severity]");
		await expect(dots).toHaveLength(2);
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

/** Expanded and collapsed side by side. */
export const AllVariants: Story = {
	render: (args) => (
		<div className='flex h-full gap-8'>
			<Sidebar {...args} className='h-full' />
			<Sidebar {...args} className='h-full' defaultCollapsed />
		</div>
	),
};
