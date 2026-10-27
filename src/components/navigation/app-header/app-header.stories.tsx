import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import samplePhoto1 from "@/components/data-display/avatar/images/sample-photo-1.png";
import samplePhoto2 from "@/components/data-display/avatar/images/sample-photo-2.png";
import samplePhoto3 from "@/components/data-display/avatar/images/sample-photo-3.png";

import { AppHeader } from "./app-header";

const meta = {
	title: "Navigation/AppHeader",
	component: AppHeader,
	parameters: {
		layout: "fullscreen",
	},
	tags: ["autodocs"],
	args: {
		clock: "Wed Oct 21 · 4:54 PM",
		unreadMessages: 3,
		team: [
			{ name: "Maria Ruiz", initials: "MR", src: samplePhoto2, tone: 3 },
			{ name: "James Tan", initials: "JT", src: samplePhoto1, tone: 6 },
			{ name: "Ava Brooks", initials: "AB", tone: 2 },
		],
		user: { name: "Joanna Smith", initials: "JS", src: samplePhoto3, tone: 1, shiftEnds: "Shift ends on 3:45" },
		onOpenMessages: fn(),
		onToggleTheme: fn(),
		onOpenTeam: fn(),
		onOpenUserMenu: fn(),
	},
} satisfies Meta<typeof AppHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** As in Figma: photos for most people, initials for one. */
export const Default: Story = {};

/** Tighter vertical padding (8px), e.g. while the page scrolls under a sticky header. Toggle `compact` to see it animate. */
export const Compact: Story = {
	args: { compact: true },
};

/** Dark mode: the theme button shows the sun (switch to light). Set the Theme toolbar to Dark to see the colors too. */
export const DarkTheme: Story = {
	args: { theme: "dark" },
};

/** No photos: every avatar falls back to initials on its tone. */
export const InitialsOnly: Story = {
	args: {
		team: [
			{ name: "Maria Ruiz", initials: "MR", tone: 3 },
			{ name: "James Tan", initials: "JT", tone: 6 },
			{ name: "Ava Brooks", initials: "AB", tone: 2 },
		],
		user: { name: "Joanna Smith", initials: "JS", tone: 1, shiftEnds: "Shift ends on 3:45" },
	},
};

/** One unread message: the label turns singular. */
export const OneMessage: Story = {
	args: { unreadMessages: 1 },
};

/** A long name and a large unread count. */
export const LongContent: Story = {
	args: {
		unreadMessages: 128,
		user: {
			name: "Alexandra Montgomery-Whitfield",
			initials: "AM",
			tone: 7,
			shiftEnds: "Shift ends on 11:30",
		},
	},
};

/** Every state the header has: photo and initials avatars, one and many messages, short and long content. */
export const AllVariants: Story = {
	render: (args) => (
		<div className='flex flex-col gap-6'>
			<AppHeader {...args} />
			<AppHeader {...args} {...InitialsOnly.args} />
			<AppHeader {...args} {...OneMessage.args} />
			<AppHeader {...args} {...LongContent.args} />
		</div>
	),
};
