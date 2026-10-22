import type { Meta, StoryObj } from "@storybook/react-vite";
import {
	BoxIcon,
	ChartColumnIcon,
	CircleUserIcon,
	EyeIcon,
	HeartCrackIcon,
	HouseIcon,
	LayoutGridIcon,
	MessageCircleMoreIcon,
	ShieldIcon,
	SquareActivityIcon,
	TriangleAlertIcon,
} from "lucide-react";

import { BoxSolidIcon } from "./box-solid-icon";
import { ChartColumnSolidIcon } from "./chart-column-solid-icon";
import { CircleUserSolidIcon } from "./circle-user-solid-icon";
import { EyeSolidIcon } from "./eye-solid-icon";
import { HeartCrackSolidIcon } from "./heart-crack-solid-icon";
import { HomeSolidIcon } from "./home-solid-icon";
import { LayoutGridSolidIcon } from "./layout-grid-solid-icon";
import { MessageCircleMoreSolidIcon } from "./message-circle-more-solid-icon";
import { ShieldSolidIcon } from "./shield-solid-icon";
import { SquareActivitySolidIcon } from "./square-activity-solid-icon";
import { TriangleAlertSolidIcon } from "./triangle-alert-solid-icon";

// Each solid icon beside the lucide outline it replaces while a SidebarMenuButton is active.
const pairs = [
	["square-activity", SquareActivityIcon, SquareActivitySolidIcon],
	["layout-grid", LayoutGridIcon, LayoutGridSolidIcon],
	["box", BoxIcon, BoxSolidIcon],
	["circle-user", CircleUserIcon, CircleUserSolidIcon],
	["eye", EyeIcon, EyeSolidIcon],
	["triangle-alert", TriangleAlertIcon, TriangleAlertSolidIcon],
	["message-circle-more", MessageCircleMoreIcon, MessageCircleMoreSolidIcon],
	["heart-crack", HeartCrackIcon, HeartCrackSolidIcon],
	["shield", ShieldIcon, ShieldSolidIcon],
	["chart-column", ChartColumnIcon, ChartColumnSolidIcon],
	["house (home-line)", HouseIcon, HomeSolidIcon],
] as const;

const meta = {
	title: "Icons/Solid Icons",
	component: SquareActivitySolidIcon,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof SquareActivitySolidIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

/** One icon, at the Sidebar's 18px. */
export const Default: Story = {
	args: { className: "size-[18px] text-icon" },
};

/** Every solid icon (archielabs.ds) beside its outline, at 18px (Sidebar) and 24px. */
export const AllVariants: Story = {
	render: () => (
		<div className='grid grid-cols-[auto_repeat(4,2rem)] items-center gap-x-4 gap-y-3 text-sm text-foreground'>
			<span />
			<span className='col-span-2 text-xs text-muted-foreground'>18px</span>
			<span className='col-span-2 text-xs text-muted-foreground'>24px</span>
			{pairs.map(([name, Outline, Solid]) => (
				<div key={name} className='contents'>
					<span>{name}</span>
					<Outline className='size-[18px] text-icon-muted' />
					<Solid className='size-[18px] text-icon' />
					<Outline className='size-6 text-icon-muted' />
					<Solid className='size-6 text-icon' />
				</div>
			))}
		</div>
	),
};
