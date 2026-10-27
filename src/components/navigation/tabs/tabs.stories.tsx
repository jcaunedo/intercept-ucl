import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { KeyRoundIcon, SettingsIcon, UserIcon } from "lucide-react";

import { Counter } from "@/components/data-display/counter";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

const meta = {
	title: "Navigation/Tabs",
	component: Tabs,
	subcomponents: { TabsList, TabsTrigger, TabsContent },
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	args: { defaultValue: "account" },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Figma's example. Click or use the arrow keys; the active fill slides to the selected tab. */
export const Default: Story = {
	render: (args) => (
		<Tabs {...args}>
			<TabsList>
				<TabsTrigger value='account'>Account</TabsTrigger>
				<TabsTrigger value='password'>Password</TabsTrigger>
				<TabsTrigger value='settings'>Settings</TabsTrigger>
			</TabsList>
			<TabsContent value='account' className='text-sm text-foreground'>
				Make changes to your account here.
			</TabsContent>
			<TabsContent value='password' className='text-sm text-foreground'>
				Change your password here.
			</TabsContent>
			<TabsContent value='settings' className='text-sm text-foreground'>
				Choose your preferences here.
			</TabsContent>
		</Tabs>
	),
};

/** `size="lg"`: a 40px list with 16px labels. */
export const Large: Story = {
	render: (args) => (
		<Tabs {...args}>
			<TabsList size='lg'>
				<TabsTrigger value='account'>Account</TabsTrigger>
				<TabsTrigger value='password'>Password</TabsTrigger>
				<TabsTrigger value='settings'>Settings</TabsTrigger>
			</TabsList>
		</Tabs>
	),
};

/** `variant="line"`: no track; the underline slides to the selected tab. A disabled tab has a lighter label. */
export const Line: Story = {
	render: (args) => (
		<Tabs {...args}>
			<TabsList variant='line'>
				<TabsTrigger value='account'>Account</TabsTrigger>
				<TabsTrigger value='password'>Password</TabsTrigger>
				<TabsTrigger value='settings' disabled>
					Settings
				</TabsTrigger>
			</TabsList>
		</Tabs>
	),
};

/** A 16px icon before the label. */
export const WithIcons: Story = {
	render: (args) => (
		<Tabs {...args}>
			<TabsList>
				<TabsTrigger value='account'>
					<UserIcon />
					Account
				</TabsTrigger>
				<TabsTrigger value='password'>
					<KeyRoundIcon />
					Password
				</TabsTrigger>
				<TabsTrigger value='settings'>
					<SettingsIcon />
					Settings
				</TabsTrigger>
			</TabsList>
		</Tabs>
	),
};

/**
 * Icon only (Figma's Show label off): the same padding, the 16px icon alone. Give each tab an `aria-label`, since there's
 * no text to name it.
 */
export const IconOnly: Story = {
	render: (args) => (
		<Tabs {...args}>
			<TabsList>
				<TabsTrigger value='account' aria-label='Account'>
					<UserIcon />
				</TabsTrigger>
				<TabsTrigger value='password' aria-label='Password'>
					<KeyRoundIcon />
				</TabsTrigger>
				<TabsTrigger value='settings' aria-label='Settings'>
					<SettingsIcon />
				</TabsTrigger>
			</TabsList>
		</Tabs>
	),
	play: async ({ canvas }) => {
		await expect(canvas.getByRole("tab", { name: "Password" })).toBeVisible();
	},
};

/**
 * An outlined Counter after the label, as Figma's Line tabs draw it. Its number follows the tab: muted, then
 * `foreground` on the active tab.
 */
export const WithCounters: Story = {
	render: (args) => (
		<Tabs {...args}>
			<TabsList variant='line'>
				<TabsTrigger value='account'>
					Account
					<Counter variant='outline' count={3} />
				</TabsTrigger>
				<TabsTrigger value='password'>
					Password
					<Counter variant='outline' count={12} />
				</TabsTrigger>
				<TabsTrigger value='settings'>
					Settings
					<Counter variant='outline' count={0} />
				</TabsTrigger>
			</TabsList>
		</Tabs>
	),
};

/** A disabled tab can't be selected or focused with the arrow keys. */
export const Disabled: Story = {
	render: (args) => (
		<Tabs {...args}>
			<TabsList>
				<TabsTrigger value='account'>Account</TabsTrigger>
				<TabsTrigger value='password' disabled>
					Password
				</TabsTrigger>
				<TabsTrigger value='settings'>Settings</TabsTrigger>
			</TabsList>
		</Tabs>
	),
};

/** `orientation="vertical"`: the list stacks and triggers align left. */
export const Vertical: Story = {
	render: (args) => (
		<Tabs {...args} orientation='vertical'>
			<TabsList>
				<TabsTrigger value='account'>Account</TabsTrigger>
				<TabsTrigger value='password'>Password</TabsTrigger>
				<TabsTrigger value='settings'>Settings</TabsTrigger>
			</TabsList>
		</Tabs>
	),
};

/** The app owns the value: `value` + `onValueChange`. */
export const Controlled: Story = {
	render: () => {
		const [value, setValue] = React.useState("password");
		return (
			<div className='flex flex-col items-start gap-3'>
				<Tabs value={value} onValueChange={setValue}>
					<TabsList>
						<TabsTrigger value='account'>Account</TabsTrigger>
						<TabsTrigger value='password'>Password</TabsTrigger>
						<TabsTrigger value='settings'>Settings</TabsTrigger>
					</TabsList>
				</Tabs>
				<p className='text-sm text-muted-foreground'>Selected: {value}</p>
			</div>
		);
	},
};

/** Both variants at both sizes, as Figma's Tabs Groups shows them. */
export const AllVariants: Story = {
	render: (args) => (
		<div className='flex flex-col items-start gap-6'>
			{(["default", "line"] as const).flatMap((variant) =>
				(["md", "lg"] as const).map((size) => (
					<Tabs key={`${variant}-${size}`} {...args}>
						<TabsList variant={variant} size={size}>
							<TabsTrigger value='account'>Account</TabsTrigger>
							<TabsTrigger value='password'>Password</TabsTrigger>
							<TabsTrigger value='settings'>Settings</TabsTrigger>
						</TabsList>
					</Tabs>
				)),
			)}
		</div>
	),
};
