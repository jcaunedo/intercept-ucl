import type { Meta, StoryObj } from "@storybook/react-vite";
import { FilterXIcon, InboxIcon } from "lucide-react";
import { fn } from "storybook/test";

import { EmptyState } from "./empty-state";

const meta = {
	title: "Feedback/EmptyState",
	component: EmptyState,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	args: {
		title: "No messages yet",
		description: "Messages from your care team will appear here.",
	},
	decorators: [
		(Story) => (
			<div className='w-[720px]'>
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Title and description: a view with nothing in it yet. */
export const Default: Story = {};

/** With a next step, e.g. when filters match nothing. */
export const WithAction: Story = {
	args: {
		title: "No patients match these filters",
		description: "Try another hospital, unit or quick view.",
		buttonLabel: "Clear filters",
		buttonIcon: <FilterXIcon aria-hidden='true' />,
		buttonProps: { onClick: fn() },
	},
};

/** With an icon above the title. */
export const WithIcon: Story = {
	args: {
		icon: <InboxIcon aria-hidden='true' className='size-8' />,
	},
};

/** Title only. */
export const TitleOnly: Story = {
	args: { description: undefined, title: "Nothing here yet" },
};

/** Every combination together. */
export const AllVariants: Story = {
	render: () => (
		<div className='flex flex-col gap-16'>
			<EmptyState title='Nothing here yet' />
			<EmptyState title='No messages yet' description='Messages from your care team will appear here.' />
			<EmptyState
				icon={<InboxIcon aria-hidden='true' className='size-8' />}
				title='No messages yet'
				description='Messages from your care team will appear here.'
			/>
			<EmptyState
				title='No patients match these filters'
				description='Try another hospital, unit or quick view.'
				buttonLabel='Clear filters'
				buttonIcon={<FilterXIcon aria-hidden='true' />}
			/>
		</div>
	),
};
