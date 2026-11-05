import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, userEvent, waitFor, within } from "storybook/test";

import { TagsPopover } from "./tags-popover";

// Times relative to when the story loads, so "1 min ago" reads the same in every session.
const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

const meta = {
	title: "Overlays/Tags Popover",
	component: TagsPopover,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		variant: { control: "select", options: ["outline", "secondary", "neutral"] },
		size: { control: "select", options: ["xs", "sm", "md", "lg"] },
	},
	args: {
		label: "2 pressors",
		variant: "outline",
		size: "sm",
		details: {
			changes: ["Epinephrine drip increased by 75% in the last 3 hours"],
			items: [
				{ label: "Epinephrine", value: "0.07 mcg/kg/min" },
				{ label: "Norepinephrine", value: "0.18 mcg/kg/min" },
			],
			source: "Pump",
			updatedAt: minutesAgo(1),
		},
	},
} satisfies Meta<typeof TagsPopover>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A flag with what changed and what's behind it: a click opens it; Escape closes it and returns focus to the tag.
 */
export const Default: Story = {
	play: async ({ canvas }) => {
		const tag = canvas.getByRole("button", { name: "2 pressors" });
		await userEvent.click(tag);
		const popover = within(await screen.findByRole("dialog", { name: "2 pressors" }));
		await expect(popover.getByText("Epinephrine drip increased by 75% in the last 3 hours")).toBeInTheDocument();
		await expect(popover.getByText("0.07 mcg/kg/min")).toBeInTheDocument();
		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
		await expect(tag).toHaveFocus();
	},
};

/** Nothing changed lately: a muted line in place of the changes. */
export const NoChanges: Story = {
	args: {
		label: "Ventilated",
		details: {
			description: "No changes in the last 12 hours",
			items: [
				{ label: "Mode", value: "AC/VC" },
				{ label: "FiO₂", value: "40%" },
				{ label: "PEEP", value: "8 cmH₂O" },
			],
			source: "Ventilator",
			updatedAt: minutesAgo(2),
		},
	},
};

/**
 * An alert's findings, each a sentence after a bold term, so a scan picks out every finding by its name (DESIGN.md
 * "Tags popover").
 */
export const Findings: Story = {
	args: {
		label: "COPD exacerbation",
		details: {
			items: [
				{ term: "Hypercapnic respiratory failure:", label: "pH 7.24, PaCO₂ 78, PaO₂ 58, HCO₃ 33 on arrival" },
				{ term: "Severe COPD:", label: "GOLD 3, 40 pack-years, home oxygen 2 L, out of it for 4 days" },
				{ term: "On BiPAP:", label: "20 min, IPAP 12 / EPAP 5, FiO₂ 35%. RR 30, HR 112, SpO₂ 88%" },
			],
			source: "Concern · ED consult request",
			updatedAt: minutesAgo(0),
		},
	},
	play: async ({ canvas }) => {
		await userEvent.click(canvas.getByRole("button", { name: "COPD exacerbation" }));
		const popover = within(await screen.findByRole("dialog", { name: "COPD exacerbation" }));
		await expect(popover.getByText("Severe COPD:")).toHaveClass("font-bold");
	},
};

/** The tag at each Badge size the cards and the patient header use, and in their variants. */
export const AllVariants: Story = {
	render: (args) => (
		<div className='flex flex-col items-start gap-3'>
			{(["xs", "sm"] as const).map((size) => (
				<div key={size} className='flex gap-2'>
					{(["outline", "secondary", "neutral"] as const).map((variant) => (
						<TagsPopover key={variant} {...args} label={`${variant} · ${size}`} variant={variant} size={size} />
					))}
				</div>
			))}
		</div>
	),
};
