import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test";

import samplePhoto3 from "@/components/data-display/avatar/images/sample-photo-3.png";

import { LiveFeed, LiveFeedFilter, type LiveFeedEntry, type LiveFeedFilterId } from "./live-feed";

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

// One patient's day, as their own page shows it: no patient on the lines.
const patientEntries: LiveFeedEntry[] = [
	{
		id: "a1",
		at: minutesAgo(2),
		kind: "alert",
		title: "Critical alert: Sepsis candidate",
		detail: "Lactate 4.1, fever, new infiltrate",
		severity: "critical",
		onSelect: fn(),
	},
	{ id: "d1", at: minutesAgo(18), kind: "drip", title: "Norepinephrine up to 0.22 mcg/kg/min · Lucy Hart, RN" },
	{ id: "l1", at: minutesAgo(40), kind: "lab", title: "Lactate 4.1 mmol/L (was 2.2)" },
	{ id: "v1", at: minutesAgo(95), kind: "ventilator", title: "PEEP 10 → 12 cmH₂O" },
	{ id: "c1", at: minutesAgo(130), kind: "care", title: "Blood cultures drawn · Lucy Hart, RN" },
	{ id: "n1", at: minutesAgo(300), kind: "note", title: "Progress note signed · Dr. James Carter" },
	{
		id: "a2-resolved",
		at: minutesAgo(60 * 20),
		kind: "alert-status",
		title: "Resolved: MAP below 65 for 10 min",
		detail: "Lucy Hart, RN · Treated",
		resolved: true,
	},
	{ id: "a2", at: minutesAgo(60 * 20 + 30), kind: "alert", title: "Low alert: MAP below 65 for 10 min", severity: "low" },
];

const miller = { name: "Miller, Sarah", detail: "Sidney Regional · MICU Bed 11", photo: samplePhoto3, initials: "SM", tone: 1 as const };
const johnson = { name: "Johnson, Daniel", detail: "Sidney Regional · MICU Bed 3", initials: "DJ", tone: 4 as const };

const meta = {
	title: "Data Display/LiveFeed",
	component: LiveFeed,
	parameters: { layout: "padded" },
	tags: ["autodocs"],
	args: { entries: patientEntries },
	decorators: [
		(Story) => (
			<div className='max-w-sm'>
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof LiveFeed>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * On a patient's own page: newest first by day, each line its time, its kind's icon (an alert's bell in its severity's
 * color, a green check for a resolution) and what happened. An alert's line opens it.
 */
export const Default: Story = {
	play: async ({ canvas, args }) => {
		const log = within(canvas.getByRole("log", { name: "Live feed" }));
		await expect(log.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)).toEqual(["Today", "Yesterday"]);
		await userEvent.click(log.getByRole("button", { name: /Sepsis candidate/ }));
		await expect(args.entries[0].onSelect).toHaveBeenCalled();
	},
};

function FilteredExample(args: React.ComponentProps<typeof LiveFeed>) {
	const [hiddenKinds, setHiddenKinds] = React.useState<LiveFeedFilterId[]>([]);
	return (
		<div className='flex flex-col gap-3'>
			{/* As in a panel's header, left of its ×. */}
			<div className='flex items-center justify-between border-b border-border pb-3'>
				<span className='font-medium'>Live feed</span>
				<LiveFeedFilter entries={args.entries} value={hiddenKinds} onValueChange={setHiddenKinds} />
			</div>
			<LiveFeed {...args} hiddenKinds={hiddenKinds} />
		</div>
	);
}

/**
 * LiveFeedFilter, as the Messages panel's filter: a ghost button opening "Show" with a box per kind the log has, all
 * checked; unchecking one leaves it out, and Show all brings everything back. The button sits on the hover fill while
 * filtered.
 */
export const Filtered: Story = {
	render: (args) => <FilteredExample {...args} />,
	play: async ({ canvas }) => {
		// Counted in the DOM: the open menu hides the page from role queries.
		const lines = () => canvas.getByRole("log", { name: "Live feed", hidden: true }).querySelectorAll("li");
		await userEvent.click(canvas.getByRole("button", { name: "Filter live feed" }));
		await userEvent.click(await screen.findByRole("menuitemcheckbox", { name: "Alerts" }));
		await waitFor(() => expect(lines()).toHaveLength(patientEntries.length - 3));
		await expect(canvas.getByRole("button", { name: "Filter live feed, filtered", hidden: true })).toBeInTheDocument();
		await userEvent.click(screen.getByRole("menuitem", { name: "Show all" }));
		await waitFor(() => expect(lines()).toHaveLength(patientEntries.length));
	},
};

/** Everyone's feed: each line starts with who it's about, as the chat's patient rows, the time on the right. */
export const WithPatients: Story = {
	args: {
		entries: [
			{ ...patientEntries[0], patient: miller },
			{ id: "j1", at: minutesAgo(9), kind: "alert", title: "Low alert: SpO₂ below 88% for 5 min", severity: "low", patient: johnson, onSelect: fn() },
			{ ...patientEntries[1], patient: miller },
			{ id: "j2", at: minutesAgo(25), kind: "alert-status", title: "Acknowledged: SpO₂ below 88% for 5 min", detail: "Lucy Hart, RN", patient: johnson },
			{ ...patientEntries[2], patient: miller },
		],
	},
};

/** Nothing yet. */
export const Empty: Story = {
	args: { entries: [] },
};
