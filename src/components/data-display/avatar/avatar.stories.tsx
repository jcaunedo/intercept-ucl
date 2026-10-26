import type { Meta, StoryObj } from "@storybook/react-vite";

import { Avatar, AvatarAdd, AvatarBadge, AvatarFallback, AvatarGroup, AvatarImage } from "./avatar";
import samplePhoto1 from "./images/sample-photo-1.png";
import samplePhoto2 from "./images/sample-photo-2.png";
import samplePhoto3 from "./images/sample-photo-3.png";

const sizes = ["xs", "sm", "md", "lg"] as const;
const tones = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

const meta = {
	title: "Data Display/Avatar",
	component: Avatar,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A photo, with initials behind it in case it doesn't load. */
export const Default: Story = {
	render: (args) => (
		<Avatar {...args}>
			<AvatarImage src={samplePhoto3} alt='Joanna Smith' />
			<AvatarFallback tone={1}>JS</AvatarFallback>
		</Avatar>
	),
};

/** No photo: initials on the person's tone. */
export const Initials: Story = {
	render: (args) => (
		<Avatar {...args}>
			<AvatarFallback tone={2}>AB</AvatarFallback>
		</Avatar>
	),
};

/** The photo fails to load, so the fallback shows. */
export const BrokenImage: Story = {
	render: (args) => (
		<Avatar {...args}>
			<AvatarImage src='/missing-avatar.png' alt='Marcus Reed' />
			<AvatarFallback tone={6}>MR</AvatarFallback>
		</Avatar>
	),
};

/** No tone: the neutral fallback. */
export const NeutralFallback: Story = {
	render: (args) => (
		<Avatar {...args}>
			<AvatarFallback>JT</AvatarFallback>
		</Avatar>
	),
};

/** The online dot (Figma's Show Dot). */
export const WithBadge: Story = {
	render: (args) => (
		<Avatar {...args}>
			<AvatarImage src={samplePhoto3} alt='Joanna Smith, online' />
			<AvatarFallback tone={1}>JS</AvatarFallback>
			<AvatarBadge />
		</Avatar>
	),
};

/** Overlapping avatars, as in AppHeader's team button. The first sits on top. */
export const Group: Story = {
	render: () => (
		<AvatarGroup>
			<Avatar size='md'>
				<AvatarImage src={samplePhoto2} alt='Maria Ruiz' />
				<AvatarFallback tone={3}>MR</AvatarFallback>
			</Avatar>
			<Avatar size='md'>
				<AvatarImage src={samplePhoto1} alt='James Tan' />
				<AvatarFallback tone={6}>JT</AvatarFallback>
			</Avatar>
			<Avatar size='md'>
				<AvatarFallback tone={2}>AB</AvatarFallback>
			</Avatar>
		</AvatarGroup>
	),
};

/** The "add" button (Figma's Add variant). */
export const Add: Story = {
	render: () => <AvatarAdd label='Add a clinician' />,
};

/** Every size, tone, the badge and the add button. */
export const AllVariants: Story = {
	render: () => (
		<div className='flex flex-col gap-6'>
			{sizes.map((size) => (
				<div key={size} className='flex items-center gap-3'>
					<span className='w-6 text-xs text-muted-foreground'>{size}</span>
					<Avatar size={size}>
						<AvatarImage src={samplePhoto3} alt='Joanna Smith' />
						<AvatarFallback tone={1}>JS</AvatarFallback>
					</Avatar>
					<Avatar size={size}>
						<AvatarImage src={samplePhoto2} alt='Maria Ruiz, online' />
						<AvatarFallback tone={3}>MR</AvatarFallback>
						<AvatarBadge />
					</Avatar>
					<Avatar size={size}>
						<AvatarFallback>AB</AvatarFallback>
					</Avatar>
					{tones.map((tone) => (
						<Avatar key={tone} size={size}>
							<AvatarFallback tone={tone}>AB</AvatarFallback>
						</Avatar>
					))}
					<AvatarAdd size={size} />
				</div>
			))}
		</div>
	),
};
