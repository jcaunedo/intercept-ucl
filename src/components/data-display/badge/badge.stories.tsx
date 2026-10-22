import type { Meta, StoryObj } from "@storybook/react-vite";
import { BadgeCheckIcon } from "lucide-react";

import { Badge } from "./badge";

const variants = ["default", "secondary", "destructive", "outline", "ghost", "link"] as const;
const tones = ["blue", "green", "sky", "purple", "red"] as const;
const sizes = ["xs", "sm", "md", "lg"] as const;

const meta = {
	title: "Data Display/Badge",
	component: Badge,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	args: {
		children: "Badge",
	},
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Figma Style=Solid, Tone=Brand. */
export const Default: Story = {};

/** Figma Style=Flat, Tone=Neutral. */
export const Secondary: Story = {
	args: { variant: "secondary" },
};

/** Figma Style=Solid, Tone=Destructive. */
export const Destructive: Story = {
	args: { variant: "destructive" },
};

/** Figma Style=Outline, Tone=Neutral. */
export const Outline: Story = {
	args: { variant: "outline" },
};

/** Figma Style=Ghost, Tone=Neutral. */
export const Ghost: Story = {
	args: { variant: "ghost" },
};

/** Figma Style=Link, Tone=Brand. */
export const Link: Story = {
	args: { variant: "link" },
};

/** Figma Style=Flat, Tone=Blue / Green / Sky / Purple / Red: category colors, in light and dark. */
export const Tones: Story = {
	render: () => (
		<div className='flex flex-col gap-4'>
			<div className='flex items-center gap-3'>
				{tones.map((tone) => (
					<Badge key={tone} variant={tone}>
						{tone}
					</Badge>
				))}
			</div>
			<div className='dark flex items-center gap-3 rounded-lg bg-background p-3'>
				{tones.map((tone) => (
					<Badge key={tone} variant={tone}>
						{tone}
					</Badge>
				))}
			</div>
		</div>
	),
};

/** Figma's optional leading icon (`showIcon`): any 12px icon as the first child. */
export const WithIcon: Story = {
	render: (args) => (
		<Badge {...args}>
			<BadgeCheckIcon />
			Verified
		</Badge>
	),
};

/** Rendered as a link with `asChild`: hover applies only then. */
export const AsLink: Story = {
	render: () => (
		<div className='flex gap-2'>
			{variants.map((variant) => (
				<Badge key={variant} variant={variant} asChild>
					<a href='#badge'>{variant}</a>
				</Badge>
			))}
		</div>
	),
};

/** Figma Size: xs (24px), sm (32px), md (36px, the default) and lg (40px). */
export const Sizes: Story = {
	render: () => (
		<div className='flex items-center gap-4'>
			{sizes.map((size) => (
				<Badge key={size} size={size}>
					{size}
				</Badge>
			))}
		</div>
	),
};

/** Every variant at every size, with and without an icon, as in Figma's set. */
export const AllVariants: Story = {
	render: () => (
		<div className='flex flex-col gap-4'>
			{sizes.map((size) => (
				<div key={size} className='flex items-center gap-6'>
					{[...variants, ...tones].map((variant) => (
						<Badge key={variant} variant={variant} size={size}>
							Badge
						</Badge>
					))}
					{variants.map((variant) => (
						<Badge key={`${variant}-icon`} variant={variant} size={size}>
							<BadgeCheckIcon />
							Badge
						</Badge>
					))}
				</div>
			))}
		</div>
	),
};
