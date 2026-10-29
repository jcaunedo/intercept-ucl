import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowRight, Maximize2 } from "lucide-react";

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
				"neutral",
				"destructive",
				"outline",
				"secondary",
				"ghost",
				"link",
				"circle",
			],
		},
		size: {
			control: "select",
			options: ["xs", "sm", "md", "lg", "icon-xs", "icon-sm", "icon-md", "icon-lg"],
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

/**
 * The circle variant: a white, round button that floats over a dark surface, the same in light and dark mode. Here at
 * 32px over a monitor, as PatientMonitoringCard uses it.
 */
export const Circle: Story = {
	render: () => (
		<div className='relative h-24 w-48 rounded-lg bg-monitor'>
			<Button variant='circle' size='icon-sm' aria-label='Show full monitor' className='absolute top-2 right-2'>
				<Maximize2 />
			</Button>
		</div>
	),
};

export const AllVariants: Story = {
	render: () => (
		<div className='flex flex-wrap items-center gap-3'>
			<Button>Default</Button>
			<Button variant='neutral'>Neutral</Button>
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
		<div className='flex flex-col gap-4'>
			<div className='flex flex-wrap items-center gap-3'>
				<Button size='xs'>Extra small</Button>
				<Button size='sm'>Small</Button>
				<Button size='md'>Medium</Button>
				<Button size='lg'>Large</Button>
			</div>
			<div className='flex flex-wrap items-center gap-3'>
				<Button size='xs'>
					Continue
					<ArrowRight aria-hidden='true' />
				</Button>
				<Button size='sm'>
					Continue
					<ArrowRight aria-hidden='true' />
				</Button>
				<Button>
					Continue
					<ArrowRight aria-hidden='true' />
				</Button>
				<Button size='lg'>
					Continue
					<ArrowRight aria-hidden='true' />
				</Button>
			</div>
			<div className='flex flex-wrap items-center gap-3'>
				{(["icon-xs", "icon-sm", "icon-md", "icon-lg"] as const).map((size) => (
					<Button key={size} size={size} variant='outline' aria-label='Continue'>
						<ArrowRight aria-hidden='true' />
					</Button>
				))}
			</div>
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
