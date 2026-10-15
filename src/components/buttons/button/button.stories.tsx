import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowRight } from "lucide-react";

import { Button } from "./button";

const meta = {
	title: "Buttons/Button",
	component: Button,
	parameters: {
		layout: "centered",
	},
	argTypes: {
		variant: {
			control: "select",
			options: [
				"default",
				"destructive",
				"outline",
				"secondary",
				"ghost",
				"link",
			],
		},
		size: {
			control: "select",
			options: ["default", "sm", "lg", "icon"],
		},
	},
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		children: "Continue",
	},
};

export const AllVariants: Story = {
	render: () => (
		<div className='flex flex-wrap items-center gap-3'>
			<Button>Default</Button>
			<Button variant='secondary'>Secondary</Button>
			<Button variant='outline'>Outline</Button>
			<Button variant='ghost'>Ghost</Button>
			<Button variant='link'>Link</Button>
			<Button variant='destructive'>Delete</Button>
		</div>
	),
};

export const Sizes: Story = {
	render: () => (
		<div className='flex flex-wrap items-center gap-3'>
			<Button size='sm'>Small</Button>
			<Button>Default</Button>
			<Button size='lg'>Large</Button>
			<Button size='icon' aria-label='Continue'>
				<ArrowRight aria-hidden='true' />
			</Button>
		</div>
	),
};

export const WithIcon: Story = {
	args: {
		children: (
			<>
				Continue
				<ArrowRight aria-hidden='true' />
			</>
		),
	},
};

export const Disabled: Story = {
	args: {
		children: "Continue",
		disabled: true,
	},
};

export const AsLink: Story = {
	render: () => (
		<Button asChild variant='outline'>
			<a href='#'>View details</a>
		</Button>
	),
};
