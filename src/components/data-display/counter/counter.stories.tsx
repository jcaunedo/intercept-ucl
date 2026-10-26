import type { Meta, StoryObj } from "@storybook/react-vite";

import { Counter } from "./counter";

const variants = ["default", "neutral", "secondary", "outline", "critical", "high", "medium", "low", "resolved"] as const;
const sizes = ["xxs", "xs"] as const;

const meta = {
	title: "Data Display/Counter",
	component: Counter,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	args: { count: 3 },
} satisfies Meta<typeof Counter>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Solid: the brand fill. */
export const Default: Story = {};

/** Flat: a neutral fill, for counts that shouldn't draw attention. */
export const Secondary: Story = {
	args: { variant: "secondary" },
};

/** Outlined: a border only. */
export const Outline: Story = {
	args: { variant: "outline" },
};

/** The alert severities, with PatientCardAlert's names and colors. */
export const Severities: Story = {
	render: (args) => (
		<div className='flex items-center gap-2'>
			{(["critical", "high", "medium", "low", "resolved"] as const).map((variant) => (
				<Counter key={variant} {...args} variant={variant} />
			))}
		</div>
	),
};

/** `size="xs"`: 24px tall. */
export const ExtraSmall: Story = {
	args: { size: "xs" },
};

/** `max` caps the count: 120 with `max={99}` shows "99+". */
export const Capped: Story = {
	args: { count: 120, max: 99 },
};

/** Every variant at both sizes, with one, two and capped counts. */
export const AllVariants: Story = {
	render: () => (
		<div className='flex flex-col gap-3'>
			{sizes.map((size) => (
				<div key={size} className='flex flex-wrap items-center gap-2'>
					{variants.map((variant) => (
						<div key={variant} className='flex items-center gap-1.5'>
							<Counter variant={variant} size={size} count={3} />
							<Counter variant={variant} size={size} count={42} />
							<Counter variant={variant} size={size} count={120} max={99} />
						</div>
					))}
				</div>
			))}
		</div>
	),
};
