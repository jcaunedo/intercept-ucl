import type { Meta, StoryObj } from "@storybook/react-vite";
import {
	ArrowRightLeftIcon,
	ClipboardPlusIcon,
	ClockPlusIcon,
	FilePenLineIcon,
	GitForkIcon,
	LinkIcon,
	ListTodoIcon,
	SendIcon,
	StethoscopeIcon,
} from "lucide-react";
import { expect, fn, userEvent, within } from "storybook/test";

import samplePhoto1 from "@/components/data-display/avatar/images/sample-photo-1.png";
import samplePhoto2 from "@/components/data-display/avatar/images/sample-photo-2.png";
import samplePhoto3 from "@/components/data-display/avatar/images/sample-photo-3.png";

import { AppHeader } from "./app-header";

const meta = {
	title: "Navigation/AppHeader",
	component: AppHeader,
	parameters: {
		layout: "fullscreen",
	},
	tags: ["autodocs"],
	args: {
		clock: "Wed Oct 21 · 4:54 PM",
		team: [
			{ name: "Maria Ruiz", initials: "MR", src: samplePhoto2, tone: 3 },
			{ name: "James Turner", initials: "JT", src: samplePhoto1, tone: 6 },
			{ name: "Ava Brooks", initials: "AB", tone: 2 },
		],
		user: { name: "Joanna Smith", initials: "JS", src: samplePhoto3, tone: 1, shiftEnds: "Shift ends on 3:45" },
		onToggleTheme: fn(),
		onOpenTeam: fn(),
		onOpenUserMenu: fn(),
	},
} satisfies Meta<typeof AppHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** As in Figma: photos for most people, initials for one. */
export const Default: Story = {};

/** Tighter vertical padding (8px), e.g. while the page scrolls under a sticky header. Toggle `compact` to see it animate. */
export const Compact: Story = {
	args: { compact: true },
};

/** Dark mode: the theme button shows the sun (switch to light). Set the Theme toolbar to Dark to see the colors too. */
export const DarkTheme: Story = {
	args: { theme: "dark" },
};

/** No photos: every avatar falls back to initials on its tone. */
export const InitialsOnly: Story = {
	args: {
		team: [
			{ name: "Maria Ruiz", initials: "MR", tone: 3 },
			{ name: "James Turner", initials: "JT", tone: 6 },
			{ name: "Ava Brooks", initials: "AB", tone: 2 },
		],
		user: { name: "Joanna Smith", initials: "JS", tone: 1, shiftEnds: "Shift ends on 3:45" },
	},
};

/** A long name. */
export const LongContent: Story = {
	args: {
		user: {
			name: "Alexandra Montgomery-Whitfield",
			initials: "AM",
			tone: 7,
			shiftEnds: "Shift ends on 11:30",
		},
	},
};

const patientArgs = {
	variant: "patient",
	sourcePage: "Census",
	patientName: "Carter, Ellen",
	onBack: fn(),
	onToggleAskIntercept: fn(),
	onTogglePatientList: fn(),
	onVideoConsult: fn(),
	onOpenMessages: fn(),
	unreadMessages: 3,
	onOpenPathway: fn(),
	onRaiseConcern: fn(),
	onHuddleTeam: fn(),
	onEscalate: fn(),
	moreActions: [{ label: "Copy link", icon: LinkIcon, onSelect: fn() }],
	// The Create menu, the dark "+" before "…".
	createActions: [
		{ label: "New note", icon: FilePenLineIcon, onSelect: fn() },
		{ label: "New order", icon: ClipboardPlusIcon, onSelect: fn() },
		{ label: "New task", icon: ListTodoIcon, onSelect: fn() },
		{ label: "Request consult", icon: StethoscopeIcon, onSelect: fn() },
		{ label: "New referral", icon: SendIcon, onSelect: fn() },
		{ label: "Start pathway", icon: GitForkIcon, onSelect: fn() },
		{ label: "Log critical care time", icon: ClockPlusIcon, onSelect: fn() },
		{ label: "Prepare handoff", icon: ArrowRightLeftIcon, onSelect: fn() },
	],
	// The patient's care team, before the buttons; the first three show.
	team: [
		{ name: "Kayla Brandt", initials: "KB", src: samplePhoto3, tone: 1 },
		{ name: "Daniel Reyes", initials: "DR", src: samplePhoto1, tone: 6 },
		{ name: "Megan Hart", initials: "MH", tone: 2 },
		{ name: "Ryan Cole", initials: "RC", tone: 8 },
	],
	onOpenTeam: fn(),
} as const;

/**
 * On a patient's page: Back, the patient list and Ask Intercept (shown when the app handles them), then a breadcrumb
 * back to where the user came from; the patient's care team (its first three), then 16px to Video consult, Messages
 * (with its unread count) and Pathway, dark until their panel opens, then "+" and "…", all dark. "…" holds Raise concern, Huddle team and Escalate, then a rule, then
 * Copy link; "+" (Create) holds New note, New order, New task, Request consult, New referral, Start pathway, Log critical care time and Prepare handoff.
 */
export const PatientContext: Story = {
	render: (args) => (
		<AppHeader
			{...patientArgs}
			onToggleTheme={args.onToggleTheme}
			theme={args.theme}
			compact={args.compact}
		/>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.queryByRole("button", { name: "Escalate" })).toBeNull();
		// Video consult, then Messages, then Pathway, then Create, then "…" (no Theme on a patient's page).
		const buttons = within(canvas.getByRole("group", { name: "Patient actions" })).getAllByRole("button");
		await expect(buttons.map((button) => button.getAttribute("aria-label") ?? button.textContent)).toEqual([
			"Video consult",
			"Messages, 3 unread",
			"Pathway",
			"Create",
			"More actions",
		]);
		await expect(canvas.getByRole("button", { name: "Video consult" })).toHaveAttribute("data-variant", "neutral");
		await userEvent.click(canvas.getByRole("button", { name: "More actions" }));
		const menu = within(await within(document.body).findByRole("menu"));
		const items = menu.getAllByRole("menuitem").map((item) => item.textContent);
		await expect(items).toEqual(["Raise concern", "Huddle team", "Escalate", "Copy link"]);
		await expect(menu.getByRole("separator")).toBeInTheDocument();
		await userEvent.keyboard("{Escape}");
		await userEvent.click(canvas.getByRole("button", { name: "Create" }));
		const create = within(await within(document.body).findByRole("menu"));
		await expect(create.getAllByRole("menuitem").map((item) => item.textContent)).toEqual([
			"New note",
			"New order",
			"New task",
			"Request consult",
			"New referral",
			"Start pathway",
			"Log critical care time",
			"Prepare handoff",
		]);
		await userEvent.keyboard("{Escape}");
		// The care team: three avatars, everyone in its name, before the buttons.
		const careTeam = canvas.getByRole("button", { name: "Care team: Kayla Brandt, Daniel Reyes, Megan Hart, Ryan Cole" });
		await expect(careTeam).toBeVisible();
		await expect(
			careTeam.compareDocumentPosition(canvas.getByRole("group", { name: "Patient actions" })) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
		await expect(canvas.getByRole("button", { name: "More actions" })).toHaveAttribute("data-variant", "neutral");
	},
};

/**
 * The page's Video consult and Messages panels open (Intercept-Live `219:16129`): each button is an icon, pressed (the
 * `accent` fill), "Close video consult" and "Close messages", that closes its panel. Pathway shares the Messages
 * panel's place on the page, so it's open in the next story instead.
 */
export const PatientPanelsOpen: Story = {
	render: (args) => (
		<AppHeader
			{...patientArgs}
			videoConsultOpen
			messagesOpen
			unreadMessages={0}
			onToggleTheme={args.onToggleTheme}
			theme={args.theme}
		/>
	),
	play: async ({ canvasElement }) => {
		const actions = within(within(canvasElement).getByRole("group", { name: "Patient actions" }));
		for (const name of ["Close video consult", "Close messages"]) {
			await expect(actions.getByRole("button", { name })).toHaveAttribute("aria-expanded", "true");
		}
	},
};

/** The page's Pathway panel open (Nov 6, 2026): Pathway is pressed, "Close pathway", and closes it. */
export const PatientPathwayOpen: Story = {
	render: (args) => (
		<AppHeader {...patientArgs} pathwayOpen onToggleTheme={args.onToggleTheme} theme={args.theme} />
	),
	play: async ({ canvasElement }) => {
		const actions = within(within(canvasElement).getByRole("group", { name: "Patient actions" }));
		await expect(actions.getByRole("button", { name: "Close pathway" })).toHaveAttribute("aria-expanded", "true");
	},
};

/** Every state the header has: photo and initials avatars, short and long content, and the patient variant. */
export const AllVariants: Story = {
	render: (args) => (
		<div className='flex flex-col gap-6'>
			<AppHeader {...args} />
			<AppHeader {...args} {...InitialsOnly.args} />
			<AppHeader {...args} {...LongContent.args} />
			<AppHeader {...patientArgs} />
			<AppHeader {...patientArgs} videoConsultOpen messagesOpen unreadMessages={0} />
			<AppHeader {...patientArgs} videoConsultOpen pathwayOpen unreadMessages={0} />
		</div>
	),
};
