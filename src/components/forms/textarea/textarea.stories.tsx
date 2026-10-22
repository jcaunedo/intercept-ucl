import type { Meta, StoryObj } from "@storybook/react-vite";

import { Field, FieldDescription, FieldLabel } from "@/components/forms/field";

import { Textarea } from "./textarea";

const meta = {
	title: "Forms/Textarea",
	component: Textarea,
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
		"aria-label": "Describe your app",
		placeholder: "An app to track inventory across three warehouses…",
		className: "w-72",
	},
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Figma State=Default. Starts one line tall and grows as you type. */
export const Default: Story = {};

/** Figma Size: minimum height `default` 36px, `lg` 40px. */
export const Sizes: Story = {
	render: (args) => (
		<div className='flex flex-col gap-3'>
			<Textarea {...args} />
			<Textarea {...args} size='lg' />
		</div>
	),
};

/** Figma State=HasValue, with several lines. */
export const WithValue: Story = {
	args: {
		defaultValue:
			"Staff log incoming stock by scanning a barcode. Admins see low-stock alerts and can reorder from the supplier list.",
	},
};

/** `rows` sets a taller starting height when you expect a long answer. */
export const WithRows: Story = {
	args: { rows: 4 },
};

/** Figma State=Focus. */
export const Focus: Story = {
	args: { autoFocus: true },
};

/** Figma State=Error. */
export const Invalid: Story = {
	args: { "aria-invalid": true, defaultValue: "Inventory" },
};

/** Figma State=Read-only. */
export const ReadOnly: Story = {
	args: { readOnly: true, defaultValue: "Generated from the blueprint on Oct 20, 2026." },
};

/** Figma State=Disabled. */
export const Disabled: Story = {
	args: { disabled: true },
};

export const InField: Story = {
	render: () => (
		<Field className='w-72'>
			<FieldLabel htmlFor='app-description'>Describe your app</FieldLabel>
			<Textarea id='app-description' rows={3} aria-describedby='app-description-help' />
			<FieldDescription id='app-description-help'>Used to draft the project overview.</FieldDescription>
		</Field>
	),
};

export const AllVariants: Story = {
	render: (args) => (
		<div className='grid grid-cols-[auto_15rem_15rem] items-start gap-x-6 gap-y-3 text-sm text-muted-foreground'>
			<span />
			<span>default · 36</span>
			<span>lg · 40</span>
			{(
				[
					["Default", {}],
					["Has value", { defaultValue: "Track stock across warehouses." }],
					["Error", { defaultValue: "Inventory", "aria-invalid": true }],
					["Read-only", { readOnly: true, defaultValue: "Generated from the blueprint." }],
					["Disabled", { disabled: true }],
				] as const
			).map(([label, state]) => (
				<div key={label} className='contents'>
					<span className='pt-2'>{label}</span>
					<Textarea {...args} {...state} className='w-full' />
					<Textarea {...args} {...state} size='lg' className='w-full' />
				</div>
			))}
		</div>
	),
};
