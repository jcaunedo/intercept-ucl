import type { Meta, StoryObj } from "@storybook/react-vite";

import { Label } from "@/components/forms/label";

import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
} from "./select";

const units = ["CVICU", "MICU", "OB-ICU", "SICU"];

const meta = {
	title: "Forms/Select",
	component: SelectTrigger,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	args: { size: "md" },
	argTypes: { size: { control: "inline-radio", options: ["sm", "md", "lg"] } },
	render: (args) => (
		<Select defaultValue='all'>
			<SelectTrigger {...args} aria-label='Unit'>
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value='all'>All Units</SelectItem>
				{units.map((unit) => (
					<SelectItem key={unit} value={unit}>
						{unit}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	),
} satisfies Meta<typeof SelectTrigger>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Opens over the trigger, on the chosen item (Radix `item-aligned`, shadcn's default). */
export const Default: Story = {};

/** Opens below the trigger, like a menu. The Census filters use this. */
export const Popper: Story = {
	render: (args) => (
		<Select defaultValue='all'>
			<SelectTrigger {...args} aria-label='Unit'>
				<SelectValue />
			</SelectTrigger>
			<SelectContent position='popper' align='start'>
				<SelectItem value='all'>All Units</SelectItem>
				{units.map((unit) => (
					<SelectItem key={unit} value={unit}>
						{unit}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	),
};

/** No value yet: the placeholder shows. */
export const Placeholder: Story = {
	render: (args) => (
		<div className='flex flex-col gap-2'>
			<Label htmlFor='unit-select'>Unit</Label>
			<Select>
				<SelectTrigger {...args} id='unit-select' className='w-48'>
					<SelectValue placeholder='Choose a unit' />
				</SelectTrigger>
				<SelectContent>
					{units.map((unit) => (
						<SelectItem key={unit} value={unit}>
							{unit}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	),
};

/** Grouped items with labels and a separator. */
export const Groups: Story = {
	render: (args) => (
		<Select defaultValue='MICU'>
			<SelectTrigger {...args} aria-label='Unit' className='w-48'>
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				<SelectGroup>
					<SelectLabel>Intensive care</SelectLabel>
					<SelectItem value='MICU'>MICU</SelectItem>
					<SelectItem value='SICU'>SICU</SelectItem>
					<SelectItem value='CVICU'>CVICU</SelectItem>
				</SelectGroup>
				<SelectSeparator />
				<SelectGroup>
					<SelectLabel>Step-down</SelectLabel>
					<SelectItem value='PCU'>PCU</SelectItem>
					<SelectItem value='OB-ICU' disabled>
						OB-ICU (closed)
					</SelectItem>
				</SelectGroup>
			</SelectContent>
		</Select>
	),
};

/** Invalid and disabled triggers. */
export const States: Story = {
	render: (args) => (
		<div className='flex items-center gap-3'>
			<Select>
				<SelectTrigger {...args} aria-label='Unit' aria-invalid className='w-40'>
					<SelectValue placeholder='Required' />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value='MICU'>MICU</SelectItem>
				</SelectContent>
			</Select>
			<Select disabled defaultValue='MICU'>
				<SelectTrigger {...args} aria-label='Unit' className='w-40'>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value='MICU'>MICU</SelectItem>
				</SelectContent>
			</Select>
		</div>
	),
};

/** Every size, with a value and with the placeholder. */
export const AllVariants: Story = {
	render: () => (
		<div className='flex flex-col gap-3'>
			{(["sm", "md", "lg"] as const).map((size) => (
				<div key={size} className='flex items-center gap-3'>
					<span className='w-6 text-xs text-muted-foreground'>{size}</span>
					<Select defaultValue='all'>
						<SelectTrigger size={size} aria-label='Unit'>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value='all'>All Units</SelectItem>
						</SelectContent>
					</Select>
					<Select>
						<SelectTrigger size={size} aria-label='Unit' className='w-40'>
							<SelectValue placeholder='Choose a unit' />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value='MICU'>MICU</SelectItem>
						</SelectContent>
					</Select>
				</div>
			))}
		</div>
	),
};
