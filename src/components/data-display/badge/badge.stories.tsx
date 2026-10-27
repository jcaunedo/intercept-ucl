import type { Meta, StoryObj } from "@storybook/react-vite";
import { BadgeCheckIcon, ChevronDownIcon } from "lucide-react";

import { Badge } from "./badge";

const variants = ["default", "secondary", "neutral", "destructive", "outline", "ghost", "link"] as const;
const tones = ["blue", "green", "sky", "purple", "red", "yellow", "amber"] as const;
const sizes = ["xs", "xs-alt", "sm", "md", "lg"] as const;

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

export const Default: Story = {};

export const Secondary: Story = {
	args: { variant: "secondary" },
};

export const Destructive: Story = {
	args: { variant: "destructive" },
};

export const Outline: Story = {
	args: { variant: "outline" },
};

export const Ghost: Story = {
	args: { variant: "ghost" },
};

export const Link: Story = {
	args: { variant: "link" },
};

/** Category colors, in light and dark. */
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

/** An optional leading icon as the first child, sized by the badge (12px, 14px at `sm`, 16px at `md`, 14px at `lg`); its
 * side's padding is 2px less, as in Figma. */
export const WithIcon: Story = {
	render: (args) => (
		<Badge {...args}>
			<BadgeCheckIcon />
			Verified
		</Badge>
	),
};

/** `count` adds "· n" after the label, 3px apart, in the label's style; it works with an icon and with `asChild`. */
export const WithCount: Story = {
	render: () => (
		<div className='flex items-center gap-4'>
			{sizes.map((size) => (
				<Badge key={size} size={size} variant='secondary' count={6}>
					<BadgeCheckIcon />
					With alerts
				</Badge>
			))}
		</div>
	),
};

/**
 * A trailing icon as the last child (Figma's Icon R, hidden by default there), here with a count: label, count, then the
 * icon. Sized like the leading icon: 12px at xs and xs-alt, 14px at sm and lg, 16px at md.
 */
export const WithTrailingIcon: Story = {
	render: () => (
		<div className='flex items-center gap-4'>
			{sizes.map((size) => (
				<Badge key={size} size={size} variant='outline' count={3}>
					Filters
					<ChevronDownIcon />
				</Badge>
			))}
		</div>
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

/** xs (20px), xs-alt (24px), sm (32px), md (36px, the default) and lg (40px). */
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

/** Every variant at every size, with and without an icon. */
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
