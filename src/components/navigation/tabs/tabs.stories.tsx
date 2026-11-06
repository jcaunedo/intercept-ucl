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

/**
 * `baseline` (Line only): the row sits on a 1px `border` rule, under every tab and the gaps between them; the active
 * tab's 2px underline covers it. Figma's Line · "Default (line)" state. Here the row fills its container.
 */
export const LineBaseline: Story = {
	render: (args) => (
		<Tabs {...args} className='w-[480px]'>
			<TabsList variant='line' baseline className='w-full justify-start'>
				<TabsTrigger value='account' className='flex-none'>
					Account
				</TabsTrigger>
				<TabsTrigger value='password' className='flex-none'>
					Password
				</TabsTrigger>
				<TabsTrigger value='settings' className='flex-none'>
					Settings
				</TabsTrigger>
			</TabsList>
		</Tabs>
	),
	play: async ({ canvasElement }) => {
		const list = canvasElement.querySelector<HTMLElement>("[data-slot=tabs-list]");
		await expect(list && getComputedStyle(list).boxShadow).toMatch(/inset/);
	},
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
 * Counters after the label, as Figma's Line tabs draw them: a count (`secondary`), an alert count in its severity's
 * color, or both, 2px apart. They look the same in every tab state. Name each tab with what the numbers count, since a
 * number alone has no context.
 */
export const WithCounters: Story = {
	args: { defaultValue: "active" },
	render: (args) => (
		<Tabs {...args}>
			<TabsList variant='line'>
				<TabsTrigger value='active' aria-label='Active, 12 patients, 3 critical alerts'>
					Active
					<Counter variant='secondary' count={12} />
					<Counter variant='critical' count={3} />
				</TabsTrigger>
				<TabsTrigger value='watching' aria-label='Watching, 5 patients, 1 low alert'>
					Watching
					<Counter variant='secondary' count={5} />
					<Counter variant='low' count={1} />
				</TabsTrigger>
				<TabsTrigger value='resolved' aria-label='Resolved, 8 patients'>
					Resolved
					<Counter variant='secondary' count={8} />
				</TabsTrigger>
			</TabsList>
		</Tabs>
	),
	play: async ({ canvas }) => {
		const [count, alerts] = canvas
			.getByRole("tab", { name: /^Active/ })
			.querySelectorAll<HTMLElement>("[data-slot='counter']");
		await expect(alerts.getBoundingClientRect().left - count.getBoundingClientRect().right).toBeCloseTo(2, 0);
	},
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

/** Both variants at both sizes, as Figma's Tabs Groups shows them, then Line with its baseline. */
export const AllVariants: Story = {
	render: (args) => (
		<div className='flex flex-col items-start gap-6'>
			{(["default", "line", "line-baseline"] as const).flatMap((variant) =>
				(["md", "lg"] as const).map((size) => (
					<Tabs key={`${variant}-${size}`} {...args}>
						<TabsList
							variant={variant === "default" ? "default" : "line"}
							baseline={variant === "line-baseline"}
							size={size}
						>
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
