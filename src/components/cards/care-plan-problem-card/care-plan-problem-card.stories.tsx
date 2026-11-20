import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";

import { CarePlanPathway, CarePlanProblemCard } from "./care-plan-problem-card";

// Synthetic patient (PRD PC-180): Scenario 3's sepsis, as the Care Plan tab shows it.
const septicShock = {
	problem: "Septic shock from community-acquired pneumonia",
	goal: "MAP 65 mmHg or more, lactate clearing",
	interventions: "Norepinephrine and vasopressin titration · ceftriaxone and azithromycin",
};

const history = (
	<div className='flex flex-col gap-1'>
		<h4 className='text-sm font-semibold text-foreground'>History</h4>
		<ul className='flex flex-col'>
			<li className='flex items-start gap-4 border-y border-border py-2.5 text-sm'>
				<span className='w-28 shrink-0 text-muted-foreground tabular-nums'>2:10 AM</span>
				<span className='flex flex-col'>
					<span className='font-medium text-foreground'>Critical alert: Sepsis candidate</span>
					<span className='text-muted-foreground'>Suggested the Sepsis bundle, hour 1 · Intercept</span>
				</span>
			</li>
			<li className='flex items-start gap-4 border-b border-border py-2.5 text-sm'>
				<span className='w-28 shrink-0 text-muted-foreground tabular-nums'>Nov 19, 8:00 PM</span>
				<span className='flex flex-col'>
					<span className='font-medium text-foreground'>Evaluated</span>
					<span className='text-muted-foreground'>Bedside nurse</span>
				</span>
			</li>
		</ul>
	</div>
);

const meta = {
	title: "Cards/CarePlanProblemCard",
	component: CarePlanProblemCard,
	parameters: { layout: "padded" },
	tags: ["autodocs"],
	args: { ...septicShock, status: "not-progressing" },
} satisfies Meta<typeof CarePlanProblemCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Figma's card: a problem not progressing, with a pathway waiting for review and its history behind the button. */
export const Default: Story = {
	args: {
		details: history,
		children: (
			<CarePlanPathway
				title='Sepsis bundle, hour 1'
				status={{ label: "Needs review", variant: "yellow" }}
				suggested
				line='4 orders waiting for your review'
				extra='Reference protocol, Surviving Sepsis hour-1 bundle (configurable per hospital)'
				action={{ label: "Review pathway", onSelect: fn() }}
			/>
		),
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const button = canvas.getByRole("button", { name: "View history" });
		await expect(button).toHaveAttribute("aria-expanded", "false");
		await userEvent.click(button);
		await expect(button).toHaveAttribute("aria-expanded", "true");
		// The details expand in, so they're visible once they have.
		await waitFor(() => expect(canvas.getByText("Critical alert: Sepsis candidate")).toBeVisible());
	},
};

/** Its history open. */
export const HistoryOpen: Story = {
	args: { ...Default.args, defaultDetailsOpen: true },
};

/** A pathway sent for co-signature: a solid border, Open pathway, and what it runs under its lines. */
export const SentPathway: Story = {
	args: {
		details: history,
		children: (
			<CarePlanPathway
				title='Sepsis bundle, hour 1'
				status={{ label: "Awaiting co-signature", variant: "amber" }}
				line='Sent to Dr. Tom Weller · 2:24 AM'
				extra='4 orders · 1 edited'
				action={{ label: "Open pathway", onSelect: fn() }}
			>
				<p className='text-sm font-medium text-info'>Lactate repeat · In 45 min</p>
			</CarePlanPathway>
		),
	},
};

/** Progressing, with no pathway, and when the bedside team last evaluated it. */
export const Progressing: Story = {
	args: {
		problem: "Acute kidney injury, stage 2",
		status: "progressing",
		goal: "Urine output 0.5 mL/kg/h or more",
		interventions: "Strict intake and output · renal dosing · no nephrotoxins",
		footer: "Evaluated 8 hr ago",
		details: history,
	},
};

/** Met, without details: no History button. */
export const Met: Story = {
	args: {
		problem: "Hypokalemia",
		status: "met",
		goal: "Potassium 3.5–5.0 mEq/L",
		interventions: "Potassium chloride replaced · recheck in the morning",
	},
};

export const AllVariants: Story = {
	render: (args) => (
		<div className='flex flex-col gap-3'>
			<CarePlanProblemCard {...args} {...Default.args} />
			<CarePlanProblemCard {...args} {...SentPathway.args} status='not-progressing' />
			<CarePlanProblemCard {...args} {...Progressing.args} />
			<CarePlanProblemCard {...args} {...Met.args} />
		</div>
	),
};
