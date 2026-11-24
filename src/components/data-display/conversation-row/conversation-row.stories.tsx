import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ImageIcon } from "lucide-react";
import { expect, fn, userEvent, within } from "storybook/test";

import { ConversationRow } from "./conversation-row";

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

const meta = {
	title: "Data Display/ConversationRow",
	component: ConversationRow,
	tags: ["autodocs"],
	args: {
		person: { name: "Kelly Ortiz, RN", initials: "KO", tone: 4, presence: "online" },
		role: "Bedside nurse · Sidney Regional",
		preview: "Her family is here too and asking for you.",
		sentAt: minutesAgo(2),
		patient: { name: "Miller, Sarah", place: "MICU · Bed 11", initials: "SM", tone: 3 },
		onClick: fn(),
	},
	decorators: [
		// The list's surface, as Messages draws it: rows span it, the selected one white.
		(Story) => (
			<ul className='w-[22rem] bg-background-subtle py-2'>
				<li>
					<Story />
				</li>
			</ul>
		),
	],
} satisfies Meta<typeof ConversationRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvasElement, args }) => {
		const row = within(canvasElement).getByRole("button");
		await userEvent.click(row);
		await expect(args.onClick).toHaveBeenCalled();
		await expect(row).toHaveAccessibleName(/Kelly Ortiz, RN/);
	},
};

/** Unread: the bold name and the unread icon after the time; the count is read to screen readers. */
export const Unread: Story = {
	args: { unread: 3 },
	play: async ({ canvasElement }) => {
		await expect(within(canvasElement).getByRole("button")).toHaveAccessibleName(/3 unread/);
		await expect(within(canvasElement).getByTitle("Unread")).toBeVisible();
	},
};

/** Unread and urgent: the unread icon, then Urgent 4px after it. Without a count, the row reads "Unread". */
export const UnreadUrgent: Story = {
	args: { unread: true, urgent: true },
	play: async ({ canvasElement }) => {
		await expect(within(canvasElement).getByRole("button")).toHaveAccessibleName(/^Kelly Ortiz, RN, Urgent, Unread,/);
	},
};

/** Reading a conversation: the unread icon's slot closes and the time slides over (no jump). Click to toggle. */
export const MarkAsRead: Story = {
	args: { urgent: true },
	render: function Render(args) {
		const [unread, setUnread] = React.useState(true);
		return <ConversationRow {...args} unread={unread} onClick={() => setUnread((value) => !value)} />;
	},
};

/** The open conversation: the `background` fill on the list's surface and a dark bar on its left edge. */
export const Selected: Story = {
	args: { selected: true },
	play: async ({ canvasElement }) => {
		await expect(within(canvasElement).getByRole("button")).toHaveAttribute("aria-current", "true");
	},
};

/** Urgent: a red alert icon after the time, "Urgent" for screen readers and in its tooltip. */
export const Urgent: Story = {
	args: { urgent: true },
	play: async ({ canvasElement }) => {
		await expect(within(canvasElement).getByRole("button")).toHaveAccessibleName(/Urgent/);
	},
};

/** A conversation about no patient (staffing, a drug shortage): no patient line. */
export const NoPatient: Story = {
	args: {
		person: { name: "Mark Ellison, PharmD", initials: "ME", tone: 7, presence: "away" },
		role: "Pharmacist · Sidney Regional",
		preview: "You: Understood, thanks for the warning.",
		sentAt: minutesAgo(120),
		patient: undefined,
	},
};

/** A photo with no text: its title after an image icon. */
export const Photo: Story = {
	args: {
		preview: (
			<>
				<ImageIcon aria-hidden className='mr-1 inline size-3.5 align-[-2px]' />
				Photo: Left forearm IV site
			</>
		),
	},
};

/** A long message, cut at two lines. */
export const LongPreview: Story = {
	args: {
		person: { name: "Kayla Brandt, RN", initials: "KB", tone: 8, presence: "online" },
		role: "Bedside nurse · Chadron Memorial",
		preview: "She needed 2 pillows to lie flat tonight. Lungs sound wetter than this morning, and she's asking whether her son can stay past visiting hours.",
		patient: { name: "Margaret Hayes", place: "Med-Surg · Bed 4", initials: "MH", tone: 9 },
	},
};

/** Every state in one list, as Messages shows them. */
export const AllVariants: Story = {
	decorators: [(Story) => <Story />],
	render: (args) => (
		<ul className='w-[22rem] bg-background-subtle py-2'>
			<li>
				<ConversationRow {...args} urgent />
			</li>
			<li>
				<ConversationRow
					{...args}
					urgent
					unread={1}
					person={{ name: "Laura Price, RN", initials: "LP", tone: 2, presence: "online" }}
					preview='MAP 58 again after the bolus. Can you look now?'
					sentAt={minutesAgo(1)}
				/>
			</li>
			<li>
				<ConversationRow
					{...args}
					selected
					person={{ name: "Nicole Bennett, RN", initials: "NB", tone: 6, presence: "online" }}
					role='Charge nurse · Chadron Memorial'
					preview='Can you keep a closer eye on those on camera until then?'
					sentAt={minutesAgo(13)}
					patient={undefined}
				/>
			</li>
			<li>
				<ConversationRow
					{...args}
					unread={2}
					person={{ name: "Kayla Brandt, RN", initials: "KB", tone: 8, presence: "online" }}
					role='Bedside nurse · Chadron Memorial'
					preview='She needed 2 pillows to lie flat tonight. Lungs sound wetter than this morning.'
					sentAt={minutesAgo(21)}
					patient={{ name: "Hayes, Margaret", place: "Med-Surg · Bed 4", initials: "MH", tone: 9 }}
				/>
			</li>
			<li>
				<ConversationRow
					{...args}
					person={{ name: "Mark Ellison, PharmD", initials: "ME", tone: 7, presence: "away" }}
					role='Pharmacist · Sidney Regional'
					preview='You: Understood, thanks for the warning.'
					sentAt={minutesAgo(120)}
					patient={undefined}
				/>
			</li>
		</ul>
	),
};
