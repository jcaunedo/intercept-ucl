import type { Meta, StoryObj } from "@storybook/react-vite";
import { Plus } from "lucide-react";
import { expect, within } from "storybook/test";

import { Button } from "@/components/buttons/button";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

const meta = {
	title: "Overlays/Tooltip",
	component: TooltipContent,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	decorators: [(Story) => <TooltipProvider>{Story()}</TooltipProvider>],
	argTypes: {
		size: { control: "select", options: ["default", "sm"] },
		side: { control: "select", options: ["top", "right", "bottom", "left"] },
	},
	args: {
		size: "default",
		side: "top",
		children: "Add module",
	},
	render: (args) => (
		<Tooltip defaultOpen>
			<TooltipTrigger asChild>
				<Button size='icon' variant='outline' aria-label='Add module'>
					<Plus aria-hidden='true' />
				</Button>
			</TooltipTrigger>
			<TooltipContent {...args} />
		</Tooltip>
	),
} satisfies Meta<typeof TooltipContent>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Figma Size=Medium. */
export const Default: Story = {};

/** Figma Size=Small. */
export const Small: Story = {
	args: { size: "sm" },
};

/** It opens on the side you pick and moves in from the trigger. */
export const Sides: Story = {
	render: (args) => (
		<div className='grid grid-cols-2 gap-x-24 gap-y-16 p-16'>
			{(["top", "right", "bottom", "left"] as const).map((side) => (
				<Tooltip key={side} defaultOpen>
					<TooltipTrigger asChild>
						<Button variant='outline'>{side}</Button>
					</TooltipTrigger>
					<TooltipContent {...args} side={side}>
						Opens {side}
					</TooltipContent>
				</Tooltip>
			))}
		</div>
	),
};

/** Test: the tooltip opens on keyboard focus and is announced as the trigger's description. */
export const OnFocus: Story = {
	render: (args) => (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button size='icon' variant='outline' aria-label='Add module'>
					<Plus aria-hidden='true' />
				</Button>
			</TooltipTrigger>
			<TooltipContent {...args}>Add a module to the blueprint</TooltipContent>
		</Tooltip>
	),
	play: async ({ canvasElement, userEvent }) => {
		const canvas = within(canvasElement);
		const trigger = canvas.getByRole("button", { name: "Add module" });
		await userEvent.tab();
		await expect(trigger).toHaveFocus();

		// Content renders in a portal, outside the story's canvas.
		const body = within(canvasElement.ownerDocument.body);
		const tooltip = await body.findByRole("tooltip");
		await expect(tooltip).toHaveTextContent("Add a module to the blueprint");
		await expect(trigger).toHaveAccessibleDescription("Add a module to the blueprint");

		await userEvent.keyboard("{Escape}");
		await expect(body.queryByRole("tooltip")).not.toBeInTheDocument();
	},
};

export const AllVariants: Story = {
	render: () => (
		<div className='flex items-center gap-16 p-12'>
			{(["default", "sm"] as const).map((size) => (
				<Tooltip key={size} defaultOpen>
					<TooltipTrigger asChild>
						<Button variant='outline'>{size}</Button>
					</TooltipTrigger>
					<TooltipContent size={size}>Tooltip</TooltipContent>
				</Tooltip>
			))}
		</div>
	),
};
