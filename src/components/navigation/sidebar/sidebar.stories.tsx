import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
	BookOpenTextIcon,
	BoxIcon,
	ChartColumnIcon,
	CircleUserIcon,
	HeartCrackIcon,
	HomeIcon,
	LayoutGridIcon,
	LifeBuoyIcon,
	MessageCircleMoreIcon,
	SearchIcon,
	ShieldIcon,
	SparklesIcon,
	SquareActivityIcon,
	TriangleAlertIcon,
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
import { TriangleAlertSolidIcon } from "@/components/icons/triangle-alert-solid-icon";
import { Sidebar, SidebarMenuButton, type SidebarNavItem } from "./sidebar";

// Solid icons show while an item is active. Search, Ask Intercept and the footer items have none yet, so they keep
// their outline icon. lucide has no AI icon for Ask Intercept; Sparkles stands in.
const groups: SidebarNavItem[][] = [
	[
		{ icon: SearchIcon, label: "Search" },
		{ icon: SparklesIcon, label: "Ask Intercept" },
	],
	[
		{ icon: CircleUserIcon, activeIcon: CircleUserSolidIcon, label: "Census" },
		{ icon: SquareActivityIcon, activeIcon: SquareActivitySolidIcon, label: "Monitoring" },
		{ icon: TriangleAlertIcon, activeIcon: TriangleAlertSolidIcon, label: "Alert Queue" },
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

const footerItems: SidebarNavItem[] = [
	{ icon: BookOpenTextIcon, label: "Documentation" },
	{ icon: LifeBuoyIcon, label: "Support" },
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
		// The first item (Search) is an action, not a page.
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
		const [active, setActive] = React.useState("Census");
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

/** SidebarMenuButton: default, hover (the hover fill, held on) and active, plus collapsed. */
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
		</div>
	),
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
