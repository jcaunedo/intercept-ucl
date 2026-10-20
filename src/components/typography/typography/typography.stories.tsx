import type { Meta, StoryObj } from "@storybook/react-vite";

import { Typography } from "./typography";

const SIZES = [
	"7xl",
	"6xl",
	"5xl",
	"4xl",
	"3xl",
	"2xl",
	"xl",
	"lg",
	"base",
	"sm",
	"xs",
] as const;

const WEIGHTS = ["regular", "medium", "semibold", "bold", "black"] as const;

const meta = {
	title: "Typography/Typography",
	component: Typography,
	tags: ["autodocs"],
	argTypes: {
		size: {
			control: "select",
			options: [...SIZES].reverse(),
		},
		weight: {
			control: "select",
			options: WEIGHTS,
		},
		as: {
			control: "text",
			description: "Override the rendered HTML element (e.g. h1, span)",
		},
	},
} satisfies Meta<typeof Typography>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		children: "The quick brown fox jumps over the lazy dog",
	},
};

export const Display: Story = {
	args: {
		size: "5xl",
		weight: "bold",
		as: "h1",
		children: "Display heading",
	},
};

/**
 * Heading definitions: `as` alone sets the size and weight. h1 = 2xl semibold (also page and
 * modal titles), h2 = xl semibold, h3 = lg semibold, h4 = base semibold.
 */
export const Headings: Story = {
	render: () => (
		<div className='space-y-3'>
			<Typography as='h1'>h1 — Page title</Typography>
			<Typography as='h2'>h2 — Section heading</Typography>
			<Typography as='h3'>h3 — Subsection heading</Typography>
			<Typography as='h4'>h4 — Group heading</Typography>
		</div>
	),
};

export const Body: Story = {
	args: {
		size: "base",
		weight: "regular",
		children:
			"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
	},
};

export const Caption: Story = {
	args: {
		size: "xs",
		weight: "medium",
		children: "Caption / fine print",
	},
};

export const AllVariants: Story = {
	render: () => (
		<div className='space-y-2'>
			{SIZES.map((size) => (
				<Typography key={size} size={size} weight='medium'>
					{size} — Almost before we knew it, we had left the ground
				</Typography>
			))}
		</div>
	),
};

export const Weights: Story = {
	render: () => (
		<div className='space-y-2'>
			{WEIGHTS.map((weight) => (
				<Typography key={weight} size='2xl' weight={weight}>
					{weight}
				</Typography>
			))}
		</div>
	),
};
