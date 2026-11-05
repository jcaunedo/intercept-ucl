import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowRight, Maximize2, VideoIcon, VideoOffIcon } from "lucide-react";
import { expect, fn, userEvent, within } from "storybook/test";

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
				"neutral",
				"brand",
				"destructive",
				"destructive-secondary",
				"success",
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
			<Button>Neutral</Button>
			<Button variant='brand'>Brand</Button>
			<Button variant='secondary'>Secondary</Button>
			<Button variant='outline'>Outline</Button>
			<Button variant='ghost'>Ghost</Button>
			<Button variant='link'>Link</Button>
			<Button variant='destructive'>Delete</Button>
			<Button variant='destructive-secondary'>
				<VideoOffIcon aria-hidden='true' />
				End call
			</Button>
			<Button variant='success'>
				<VideoIcon aria-hidden='true' />
				Answer
			</Button>
		</div>
	),
};

/** Disabled, every variant: the `disabled` fill and a `foreground-subtle` label, no opacity; the outline keeps its fill. */
export const DisabledVariants: Story = {
	render: () => (
		<div className='flex flex-wrap items-center gap-3'>
			{(["neutral", "secondary", "destructive", "destructive-secondary", "success", "outline", "ghost", "link"] as const).map((variant) => (
				<Button key={variant} variant={variant} disabled>
					{variant}
				</Button>
			))}
		</div>
	),
};

/**
 * Loading: a spinner in place of the label, which screen readers still read. The button keeps its look and ignores
 * clicks until it's done.
 */
export const Loading: Story = {
	args: {
		children: "Save",
		loading: true,
		onClick: fn(),
	},
	play: async ({ canvasElement, args }) => {
		const button = within(canvasElement).getByRole("button", { name: "Save" });
		await expect(button).toHaveAttribute("aria-busy", "true");
		await userEvent.click(button, { pointerEventsCheck: 0 });
		await expect(args.onClick).not.toHaveBeenCalled();
	},
};

/** Loading at each size and in the three styles Figma draws it in. */
export const LoadingVariants: Story = {
	render: () => (
		<div className='flex flex-col gap-3'>
			{(["neutral", "outline", "secondary"] as const).map((variant) => (
				<div key={variant} className='flex flex-wrap items-center gap-3'>
					{(["xs", "sm", "md", "lg"] as const).map((size) => (
						<Button key={size} variant={variant} size={size} loading>
							Save
						</Button>
					))}
				</div>
			))}
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
