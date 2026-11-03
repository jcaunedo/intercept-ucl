import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, userEvent, waitFor, within } from "storybook/test";

import { Button } from "@/components/buttons/button";

import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "./popover";

const meta = {
	title: "Overlays/Popover",
	component: PopoverContent,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		side: { control: "select", options: ["top", "right", "bottom", "left"] },
		align: { control: "select", options: ["start", "center", "end"] },
	},
	args: {
		side: "bottom",
		align: "center",
	},
	render: (args) => (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant='outline'>2 pressors</Button>
			</PopoverTrigger>
			<PopoverContent {...args}>
				<PopoverHeader>
					<PopoverTitle>2 pressors</PopoverTitle>
					<PopoverDescription>Drips that raise blood pressure, running now.</PopoverDescription>
				</PopoverHeader>
				<ul className='flex flex-col gap-1'>
					<li>Norepinephrine 0.22 mcg/kg/min</li>
					<li>Vasopressin 0.03 units/min</li>
				</ul>
			</PopoverContent>
		</Popover>
	),
} satisfies Meta<typeof PopoverContent>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Opens on click with focus inside; Escape closes it and returns focus to the trigger. */
export const Default: Story = {
	play: async ({ canvas }) => {
		const trigger = canvas.getByRole("button", { name: "2 pressors" });
		await userEvent.click(trigger);
		const dialog = await screen.findByRole("dialog");
		await expect(within(dialog).getByText("Norepinephrine 0.22 mcg/kg/min")).toBeInTheDocument();
		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
		await expect(trigger).toHaveFocus();
	},
};

/** Each side the popover can open on. */
export const AllVariants: Story = {
	render: (args) => (
		<div className='grid grid-cols-2 gap-40 p-40'>
			{(["top", "right", "bottom", "left"] as const).map((side) => (
				<Popover key={side} defaultOpen>
					<PopoverTrigger asChild>
						<Button variant='outline'>{side}</Button>
					</PopoverTrigger>
					<PopoverContent {...args} side={side} className='w-48'>
						<PopoverDescription>Opens on the {side}.</PopoverDescription>
					</PopoverContent>
				</Popover>
			))}
		</div>
	),
};
