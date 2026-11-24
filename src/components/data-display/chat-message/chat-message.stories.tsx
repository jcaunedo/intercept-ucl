import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";

import samplePhoto from "@/components/data-display/avatar/images/sample-photo-1.png";

import { ChatDayDivider, ChatMessage } from "./chat-message";

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

const kelly = { name: "Kelly Ortiz, RN", initials: "KO", tone: 4, presence: "online" } as const;
const you = { name: "You", initials: "JS", photo: samplePhoto };

const meta = {
	title: "Data Display/ChatMessage",
	component: ChatMessage,
	tags: ["autodocs"],
	args: { author: kelly, sentAt: minutesAgo(60), children: "Lactate 3.8, down from 4.6." },
	decorators: [
		(Story) => (
			<div className='w-[45rem] max-w-full'>
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof ChatMessage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Received: on the left, the sender's avatar (with their presence) before the name and time, a bordered bubble. */
export const Received: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByText("Kelly Ortiz, RN")).toBeVisible();
		await expect(canvas.getByText("Lactate 3.8, down from 4.6.")).toBeVisible();
	},
};

/** Sent: on the right, "You · 1 hr ago" then the clinician's avatar, a `neutral-muted` bubble. */
export const Sent: Story = {
	args: { variant: "sent", author: you, children: "Can you send me Sarah's 2nd lactate when it's back?" },
};

/** A long message wraps at 584px of text, or 85% of a narrower thread. */
export const LongMessage: Story = {
	args: {
		children:
			"MAP 58 on norepi 0.2 for the last 15 min. Want me to go up, or start vasopressin? Her lactate is pending and she's still mottled at the knees.",
	},
};

/** No photo or initials: the name row without an avatar. */
export const NoAvatar: Story = {
	args: { author: { name: "Rachel Lindgren, RRT" } },
};

/**
 * Several messages within 30 seconds: the ones after the first drop the name and time and sit 8px under it, so the
 * run reads as one (intercept.ds "several messages example"). The author is still read out.
 */
export const Grouped: Story = {
	render: (args) => (
		<div className='flex flex-col gap-2'>
			<ChatMessage {...args}>MAP 58 on norepi 0.2 for the last 15 min. Want me to go up, or start vasopressin?</ChatMessage>
			<ChatMessage {...args} showMeta={false}>
				Her family is here too and asking for you.
			</ChatMessage>
		</div>
	),
	play: async ({ canvasElement }) => {
		await expect(within(canvasElement).getAllByText("Kelly Ortiz, RN")).toHaveLength(2);
	},
};

/** The day divider: the day between two zigzag rules, before a day's first message. */
export const DayDivider: Story = {
	render: () => <ChatDayDivider>Today</ChatDayDivider>,
	play: async ({ canvasElement }) => {
		await expect(within(canvasElement).getByRole("heading", { name: "Today" })).toBeVisible();
	},
};

/** A thread: sent, received, a grouped run, the day divider. */
export const AllVariants: Story = {
	render: (args) => (
		<div className='flex flex-col'>
			<ChatMessage {...args} variant='sent' author={you} sentAt={minutesAgo(62)}>
				Can you send me Sarah's 2nd lactate when it's back?
			</ChatMessage>
			<ChatMessage {...args} className='mt-4' />
			<ChatMessage {...args} className='mt-4' sentAt={minutesAgo(55)}>
				MAP 58 on norepi 0.2 for the last 15 min. Want me to go up, or start vasopressin?
			</ChatMessage>
			<ChatMessage {...args} className='mt-2' showMeta={false}>
				Her family is here too and asking for you.
			</ChatMessage>
			<ChatDayDivider className='mt-4'>Today</ChatDayDivider>
			<ChatMessage {...args} className='mt-4' sentAt={minutesAgo(0)}>
				She's asking for water.
			</ChatMessage>
		</div>
	),
};
