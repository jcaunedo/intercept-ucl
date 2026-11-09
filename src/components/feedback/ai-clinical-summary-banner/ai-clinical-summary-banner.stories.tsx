import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";

import { AiClinicalSummaryBanner } from "./ai-clinical-summary-banner";

const meta = {
	title: "Feedback/AiClinicalSummaryBanner",
	component: AiClinicalSummaryBanner,
	parameters: {
		layout: "padded",
	},
	tags: ["autodocs"],
	args: {
		title: "Worsening hemodynamic and respiratory status",
		children:
			"MAP decreased from 70 to 58 mmHg, lactate increased from 2.2 to 4.1 mmol/L, and SpO₂ is 86%. A sepsis screening algorithm has flagged possible sepsis.",
		source: "17 sources · 3 h 10 min ago",
		onClose: fn(),
	},
} satisfies Meta<typeof AiClinicalSummaryBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

/** As in Figma: the sparkle, the headline over the summary, the sources and how fresh it is, and ×. */
export const Default: Story = {
	play: async ({ canvas, args }) => {
		await expect(canvas.getByText("AI clinical summary: Worsening hemodynamic and respiratory status")).toBeVisible();
		canvas.getByRole("button", { name: "Dismiss summary" }).click();
		await expect(args.onClose).toHaveBeenCalled();
	},
};

/** With `onOpen` the whole banner is one click target (× stays its own); hover darkens the fill. */
export const Openable: Story = {
	args: { onOpen: fn() },
	play: async ({ canvas, args }) => {
		canvas.getByRole("button", { name: /Ask Intercept Live for more/ }).click();
		await expect(args.onOpen).toHaveBeenCalled();
		await expect(args.onClose).not.toHaveBeenCalled();
	},
};

/** No headline: the label alone on the top line. */
export const WithoutTitle: Story = {
	args: { title: undefined },
};

/** No sources and no ×: the summary alone. */
export const Minimal: Story = {
	args: { source: undefined, onClose: undefined },
};

/** A long summary in a narrow space: each line cut off with an ellipsis, the full text in its hover title. */
export const Narrow: Story = {
	decorators: [
		(Story) => (
			<div className='max-w-xl'>
				<Story />
			</div>
		),
	],
};

/** Every state together. */
export const AllVariants: Story = {
	render: (args) => (
		<div className='flex flex-col gap-4'>
			<AiClinicalSummaryBanner {...args} />
			<AiClinicalSummaryBanner {...args} onOpen={fn()} />
			<AiClinicalSummaryBanner {...args} title={undefined} />
			<AiClinicalSummaryBanner {...args} source={undefined} onClose={undefined} />
		</div>
	),
};
