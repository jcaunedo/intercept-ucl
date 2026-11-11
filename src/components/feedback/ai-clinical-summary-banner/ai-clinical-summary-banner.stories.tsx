import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, fn, screen, userEvent } from "storybook/test";

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

/**
 * As in Figma: the sparkle, then one line, the headline in bold and the summary after it, the sources and how fresh it
 * is, and ×. Hovering it names it: "AI clinical summary".
 */
export const Default: Story = {
	play: async ({ canvas, args }) => {
		await expect(canvas.getByText("Worsening hemodynamic and respiratory status:")).toBeVisible();
		await expect(canvas.getByRole("region", { name: "AI clinical summary" })).toBeInTheDocument();
		const region = canvas.getByRole("region", { name: "AI clinical summary" });
		await userEvent.hover(region);
		await expect(await screen.findByRole("tooltip")).toHaveTextContent("AI clinical summary");
		// A scroll under a still mouse (a trackpad's momentum) keeps it open; Radix alone would close it at once.
		const box = region.getBoundingClientRect();
		fireEvent.pointerMove(region, { pointerType: "mouse", clientX: box.left + box.width / 2, clientY: box.top + box.height / 2 });
		document.dispatchEvent(new Event("scroll"));
		await new Promise((resolve) => setTimeout(resolve, 100));
		await expect(screen.getByRole("tooltip")).toHaveTextContent("AI clinical summary");
		await userEvent.unhover(region);
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

/** No headline: the summary alone on its line. */
export const WithoutTitle: Story = {
	args: { title: undefined },
};

/** No sources and no ×: the summary alone. */
export const Minimal: Story = {
	args: { source: undefined, onClose: undefined },
};

/** A long summary in a narrow space: the line cut off with an ellipsis (the full text for screen readers). */
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
