import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { Input } from "./input";

const meta = {
	title: "Forms/Input",
	component: Input,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		size: {
			control: "select",
			options: ["md", "lg"],
		},
	},
	args: {
		"aria-label": "App name",
		placeholder: "My new app",
		className: "w-60",
	},
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Figma State=Default: empty, showing the placeholder. */
export const Default: Story = {};

/** Figma Size: `default` is 36px, `lg` is 40px. */
export const Sizes: Story = {
	render: (args) => (
		<div className='flex flex-col gap-3'>
			<Input {...args} />
			<Input {...args} size='lg' />
		</div>
	),
};

/** Figma State=HasValue. */
export const WithValue: Story = {
	args: { defaultValue: "Inventory tracker" },
};

/** Figma State=Focus. Click or tab into the field to see it; `autoFocus` shows it on load. */
export const Focus: Story = {
	args: { autoFocus: true },
};

/**
 * Figma State=Error. Set `aria-invalid` and point `aria-describedby` at the message.
 * Test: the field is marked invalid and its error is its accessible description.
 */
export const Invalid: Story = {
	render: (args) => (
		<div className='flex flex-col gap-2'>
			<Input {...args} type='email' defaultValue='julio@' aria-label='Work email' aria-invalid='true' aria-describedby='email-error' />
			<p id='email-error' className='text-sm text-destructive'>
				Enter a complete email, like name@company.com.
			</p>
		</div>
	),
	play: async ({ canvas }) => {
		const input = canvas.getByRole("textbox", { name: "Work email" });
		await expect(input).toBeInvalid();
		await expect(input).toHaveAccessibleDescription("Enter a complete email, like name@company.com.");
	},
};

/** Figma State=Read-only: the value can be selected and copied, not changed. Test: typing leaves the value as it was. */
export const ReadOnly: Story = {
	args: { readOnly: true, defaultValue: "inventory-tracker" },
	play: async ({ canvas, userEvent }) => {
		const input = canvas.getByRole("textbox");
		await userEvent.type(input, "-v2");
		await expect(input).toHaveValue("inventory-tracker");
	},
};

/** Figma State=Disabled. */
export const Disabled: Story = {
	args: { disabled: true },
};

export const File: Story = {
	args: { type: "file", "aria-label": "Logo", placeholder: undefined },
};

export const AllVariants: Story = {
	render: (args) => (
		<div className='grid grid-cols-[auto_15rem_15rem] items-center gap-x-6 gap-y-3 text-sm text-muted-foreground'>
			<span />
			<span>default · 36</span>
			<span>lg · 40</span>
			{(
				[
					["Default", {}],
					["Has value", { defaultValue: "Inventory tracker" }],
					["Error", { defaultValue: "julio@", "aria-invalid": true }],
					["Read-only", { readOnly: true, defaultValue: "inventory-tracker" }],
					["Disabled", { disabled: true }],
				] as const
			).map(([label, state]) => (
				<div key={label} className='contents'>
					<span>{label}</span>
					<Input {...args} {...state} className='w-full' />
					<Input {...args} {...state} size='lg' className='w-full' />
				</div>
			))}
		</div>
	),
};
