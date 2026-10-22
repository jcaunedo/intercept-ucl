import type { Meta, StoryObj } from "@storybook/react-vite";

import { Logo, LogoSymbol } from "./logo";

const meta = {
	title: "Data Display/Logo",
	component: Logo,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof Logo>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Figma "Logo": the expanded Sidebar's wordmark. */
export const Default: Story = {};

/** Figma "Logo Symbol": the collapsed Sidebar's mark. */
export const MarkOnly: Story = {
	render: () => <LogoSymbol />,
};

/** Both, at their Figma size (31px tall) and scaled up. */
export const AllVariants: Story = {
	render: () => (
		<div className='flex flex-col items-start gap-8'>
			<div className='flex items-center gap-8'>
				<Logo />
				<LogoSymbol />
			</div>
			<div className='flex items-center gap-8'>
				<Logo className='h-16' />
				<LogoSymbol className='h-16' />
			</div>
		</div>
	),
};
