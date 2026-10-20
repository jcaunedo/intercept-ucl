import type { Meta, StoryObj } from "@storybook/react-vite";

import { Input } from "@/components/forms/input";

import { Label } from "./label";

const meta = {
	title: "Forms/Label",
	component: Label,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	args: {
		children: "App name",
	},
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** `htmlFor` ties the label to its field: clicking the label focuses the input. */
export const WithInput: Story = {
	render: (args) => (
		<div className='flex w-60 flex-col gap-2'>
			<Label {...args} htmlFor='app-name' />
			<Input id='app-name' placeholder='My new app' />
		</div>
	),
};

/** The label keeps its color next to a disabled field, as in Figma. */
export const WithDisabledInput: Story = {
	render: (args) => (
		<div className='flex w-60 flex-col gap-2'>
			<Label {...args} htmlFor='app-name-disabled' />
			<Input id='app-name-disabled' placeholder='My new app' disabled />
		</div>
	),
};
