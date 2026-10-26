import type { Meta, StoryObj } from "@storybook/react-vite";

import { Field, FieldDescription, FieldLabel, FieldLegend, FieldSet } from "@/components/forms/field";
import { Label } from "@/components/forms/label";

import { RadioGroup, RadioGroupItem } from "./radio-group";

const meta = {
	title: "Forms/Radio Group",
	component: RadioGroup,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

const options = [
	["web", "Web app"],
	["mobile", "Mobile app"],
	["api", "Backend only"],
] as const;

/** Arrow keys move the selection. */
export const Default: Story = {
	render: () => (
		<RadioGroup defaultValue='web' aria-label='App type'>
			{options.map(([value, label]) => (
				<div key={value} className='flex items-center gap-2'>
					<RadioGroupItem value={value} id={`type-${value}`} />
					<Label htmlFor={`type-${value}`}>{label}</Label>
				</div>
			))}
		</RadioGroup>
	),
};

/** Disabled, for one option and for the whole group. */
export const Disabled: Story = {
	render: () => (
		<div className='flex gap-12'>
			<RadioGroup defaultValue='web' aria-label='App type, one option disabled'>
				{options.map(([value, label]) => (
					<div key={value} className='flex items-center gap-2'>
						<RadioGroupItem value={value} id={`one-${value}`} disabled={value === "mobile"} />
						<Label htmlFor={`one-${value}`}>{label}</Label>
					</div>
				))}
			</RadioGroup>
			<RadioGroup defaultValue='web' disabled aria-label='App type, all disabled'>
				{options.map(([value, label]) => (
					<div key={value} className='flex items-center gap-2'>
						<RadioGroupItem value={value} id={`all-${value}`} />
						<Label htmlFor={`all-${value}`}>{label}</Label>
					</div>
				))}
			</RadioGroup>
		</div>
	),
};

/** A labelled group with a description, using FieldSet. */
export const InFieldSet: Story = {
	render: () => (
		<FieldSet className='w-80'>
			<FieldLegend variant='label'>Where should the app deploy?</FieldLegend>
			<RadioGroup defaultValue='managed'>
				<Field orientation='horizontal'>
					<RadioGroupItem value='managed' id='deploy-managed' />
					<FieldLabel htmlFor='deploy-managed'>Managed cloud</FieldLabel>
				</Field>
				<Field orientation='horizontal'>
					<RadioGroupItem value='own' id='deploy-own' />
					<FieldLabel htmlFor='deploy-own'>My own cloud</FieldLabel>
				</Field>
			</RadioGroup>
			<FieldDescription>You can change this before the first deploy.</FieldDescription>
		</FieldSet>
	),
};

export const Invalid: Story = {
	render: () => (
		<RadioGroup aria-label='App type' aria-invalid='true'>
			{options.map(([value, label]) => (
				<div key={value} className='flex items-center gap-2'>
					<RadioGroupItem value={value} id={`invalid-${value}`} aria-invalid='true' />
					<Label htmlFor={`invalid-${value}`}>{label}</Label>
				</div>
			))}
		</RadioGroup>
	),
};
