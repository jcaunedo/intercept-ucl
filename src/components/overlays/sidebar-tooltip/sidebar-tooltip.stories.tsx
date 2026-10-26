import type { Meta, StoryObj } from "@storybook/react-vite";
import { HomeIcon } from "lucide-react";

import { SidebarMenuButton } from "@/components/navigation/sidebar";
import { SidebarTooltip } from "./sidebar-tooltip";

const meta = {
	title: "Overlays/SidebarTooltip",
	component: SidebarTooltip,
	tags: ["autodocs"],
	decorators: [
		(Story) => (
			<div className='flex min-h-40 items-center justify-center bg-background p-16'>
				<Story />
			</div>
		),
	],
	args: {
		label: "Label",
		children: <button type='button'>Hover me</button>,
	},
} satisfies Meta<typeof SidebarTooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

const trigger = (
	<button
		type='button'
		className='rounded-lg px-3 py-1.5 text-sm text-foreground outline-none hover:bg-active focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
	>
		Hover me
	</button>
);

/** Hover or focus the trigger. */
export const Default: Story = {
	render: (args) => <SidebarTooltip {...args}>{trigger}</SidebarTooltip>,
};

/** Shown open. */
export const Open: Story = {
	render: (args) => (
		<SidebarTooltip {...args} defaultOpen>
			{trigger}
		</SidebarTooltip>
	),
};

/** In context: a collapsed SidebarMenuButton shows its label on hover and focus. */
export const OnCollapsedMenuButton: Story = {
	render: () => <SidebarMenuButton icon={HomeIcon} label='Provider Desktop' collapsed />,
};

/** Every side, open. The Sidebar uses `right`. */
export const AllVariants: Story = {
	render: () => (
		<div className='grid grid-cols-2 gap-x-40 gap-y-20 py-10'>
			{(["top", "right", "bottom", "left"] as const).map((side) => (
				<SidebarTooltip key={side} label={side} side={side} defaultOpen>
					{trigger}
				</SidebarTooltip>
			))}
		</div>
	),
};
