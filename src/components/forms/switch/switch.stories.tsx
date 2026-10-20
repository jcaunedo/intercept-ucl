import type { Meta, StoryObj } from "@storybook/react-vite";

import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/forms/field";
import { Label } from "@/components/forms/label";

import { Switch } from "./switch";

const meta = {
	title: "Forms/Switch",
	component: Switch,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		size: {
			control: "select",
			options: ["default", "sm"],
		},
	},
	args: {
		"aria-label": "Preview changes live",
	},
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Figma State=OFF, Size=Default. */
export const Default: Story = {};

/** Figma State=ON. */
export const Checked: Story = {
	args: { defaultChecked: true },
};

/** Figma Size: `default` 36 × 20, `sm` 28 × 16. */
export const Sizes: Story = {
	render: (args) => (
		<div className='flex items-center gap-4'>
			<Switch {...args} defaultChecked />
			<Switch {...args} size='sm' defaultChecked />
		</div>
	),
};

/** Figma's "Show Label Right". */
export const WithLabel: Story = {
	render: () => (
		<div className='flex flex-col gap-3'>
			<div className='flex items-center gap-2'>
				<Switch id='live-preview' defaultChecked />
				<Label htmlFor='live-preview'>Preview changes live</Label>
			</div>
			<div className='flex items-center gap-2'>
				<Switch id='auto-deploy' disabled />
				<Label htmlFor='auto-deploy'>Deploy on every change</Label>
			</div>
		</div>
	),
};

/** A settings row: label and description on the left, switch on the right. */
export const SettingsRow: Story = {
	render: () => (
		<Field orientation='horizontal' className='w-96'>
			<FieldContent>
				<FieldLabel htmlFor='staging'>Staging environment</FieldLabel>
				<FieldDescription>Test changes before they reach your users.</FieldDescription>
			</FieldContent>
			<Switch id='staging' defaultChecked />
		</Field>
	),
};

export const Disabled: Story = {
	render: (args) => (
		<div className='flex items-center gap-4'>
			<Switch {...args} disabled />
			<Switch {...args} disabled defaultChecked />
		</div>
	),
};

export const AllVariants: Story = {
	render: (args) => (
		<div className='grid grid-cols-[auto_auto_auto] items-center gap-x-6 gap-y-3 text-sm text-muted-foreground'>
			<span />
			<span>Off</span>
			<span>On</span>
			{(["default", "sm"] as const).map((size) => (
				<div key={size} className='contents'>
					<span>{size}</span>
					<Switch {...args} size={size} />
					<Switch {...args} size={size} defaultChecked />
				</div>
			))}
		</div>
	),
};
