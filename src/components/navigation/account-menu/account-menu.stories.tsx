import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChevronDownIcon } from "lucide-react";
import { expect, fn, screen, userEvent, within } from "storybook/test";

import { Button } from "@/components/buttons/button";
import samplePhoto3 from "@/components/data-display/avatar/images/sample-photo-3.png";

import { AccountMenu, type AccountMenuStatus, type AccountMenuWorkspace } from "./account-menu";

// The three workspaces (Left Nav Spec), each with its one line; Marketplace is in preview.
const workspaces: AccountMenuWorkspace[] = [
	{ id: "clinical", label: "Clinical", description: "Patients, alerts and messages" },
	{ id: "marketplace", label: "Marketplace", description: "Open shifts and coverage requests", tag: "Preview" },
	{ id: "administration", label: "Administration", description: "Operations, coverage and providers" },
];

const meta = {
	title: "Navigation/AccountMenu",
	component: AccountMenu,
	tags: ["autodocs"],
	parameters: { layout: "centered" },
	args: {
		children: (
			<Button variant='outline'>
				Joanna Smith
				<ChevronDownIcon aria-hidden='true' />
			</Button>
		),
		user: { name: "Joanna Smith", initials: "JS", src: samplePhoto3, tone: 1, role: "Intensivist" },
		status: "available",
		onStatusChange: fn(),
		workspaces,
		workspace: "clinical",
		onWorkspaceChange: fn(),
		shift: {
			hospitals: ["Alliance Community", "Bridgeport Valley", "Chadron Memorial", "Sidney Regional"],
			callQueues: ["Tele-ICU", "Rapid response"],
			ends: "Ends in 7h 58m",
		},
		onStartHandoff: fn(),
		preferences: {
			theme: "light",
			onThemeChange: fn(),
			monitoringView: "full",
			onMonitoringViewChange: fn(),
			alertSounds: true,
			onAlertSoundsChange: fn(),
		},
		onOpenProfile: fn(),
		onOpenShortcuts: fn(),
		shortcutsKey: "?",
		onSignOut: fn(),
		align: "center",
	},
	decorators: [
		(Story) => (
			<div className='flex h-[560px] items-start'>
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof AccountMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Everything in it: the user and their status, the three workspaces, Status, My shift, Start handoff, Preferences, Profile & credentials, Keyboard shortcuts and Sign out. */
export const Default: Story = {
	args: { defaultOpen: true },
};

/** Picking a workspace switches to it and closes the menu. */
export const SwitchWorkspace: Story = {
	play: async ({ args, canvasElement }) => {
		await userEvent.click(within(canvasElement).getByRole("button", { name: /Joanna Smith/ }));
		await userEvent.click(await screen.findByRole("menuitemradio", { name: /Administration/ }));
		await expect(args.onWorkspaceChange).toHaveBeenCalledWith("administration");
		await expect(screen.queryByRole("menu")).toBeNull();
	},
};

/** Status is a submenu: Available, Busy or Away. The header's line follows it. */
export const ChangeStatus: Story = {
	render: function Render(args) {
		const [status, setStatus] = React.useState<AccountMenuStatus>("available");
		return <AccountMenu {...args} status={status} onStatusChange={setStatus} />;
	},
	play: async ({ canvasElement }) => {
		await userEvent.click(within(canvasElement).getByRole("button", { name: /Joanna Smith/ }));
		await userEvent.click(await screen.findByRole("menuitem", { name: /Status/ }));
		await userEvent.click(await screen.findByRole("menuitemradio", { name: "Away" }));
		await userEvent.click(within(canvasElement).getByRole("button", { name: /Joanna Smith/ }));
		await expect(await screen.findByRole("menuitem", { name: /Status\s*Away/ })).toBeInTheDocument();
	},
};

/** In a camera session the platform sets the status: it says so, and none of the three is picked. */
export const AutomaticStatus: Story = {
	args: { status: "in-camera", defaultOpen: true },
};

/** One workspace: no Workspace group (Left Nav Spec: people with one workspace never see the switcher). */
export const SingleWorkspace: Story = {
	args: { workspaces: [workspaces[0]], defaultOpen: true },
};

/** Off shift: no My shift and no Start handoff. */
export const OffShift: Story = {
	args: { shift: undefined, defaultOpen: true },
};
