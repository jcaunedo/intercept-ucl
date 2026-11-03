import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test";

import { Button } from "@/components/buttons/button";
import { Toaster } from "@/components/feedback/sonner";

import { AlertToast, toastAlert, type ToastAlertOptions } from "./alert-toast";

// Scenario 1 (Demo Use Cases): at Chadron, Margaret Hayes's deterioration score crosses its threshold. The times are
// relative to now, so the toast reads "Just now" and "3 min ago".
const justNow = new Date().toISOString();
const threeMinutesAgo = new Date(Date.now() - 3 * 60_000).toISOString();

const hayes = {
	severity: "critical",
	title: "Deterioration score crossed threshold",
	firedAt: justNow,
	reason: "Rising RR, SpO₂ decline, positive fluid balance, HFrEF",
	patientName: "Hayes, Margaret",
	location: "Chadron Community Hospital · Med-Surg · Bed 4",
	initials: "HM",
	tone: 3,
} satisfies ToastAlertOptions;

const moore = {
	severity: "medium",
	title: "MAP below 65 mmHg",
	firedAt: threeMinutesAgo,
	reason: "MAP 57 mmHg, HR 108 bpm",
	patientName: "Moore, Patricia",
	location: "Harbor Point General · SICU · Bed 4",
	initials: "MP",
	tone: 6,
} satisfies ToastAlertOptions;

const meta = {
	title: "Feedback/AlertToast",
	component: AlertToast,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	args: {
		...hayes,
		onOpen: fn(),
		onAcknowledge: fn(),
		onAsk: fn(),
		onOpenAlert: fn(),
		onClose: fn(),
	},
} satisfies Meta<typeof AlertToast>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Critical (T1): Margaret Hayes's deterioration score crosses its threshold. Stays until acted on or closed. */
export const Critical: Story = {
	play: async ({ args, canvasElement }) => {
		const canvas = within(canvasElement);
		// Maximize sits left of the close button and opens the alert.
		await userEvent.click(canvas.getByRole("button", { name: /^Open alert/ }));
		await expect(args.onOpenAlert).toHaveBeenCalledTimes(1);
	},
};

/** Medium (T2): leaves after 10 s unless the pointer is over the stack. */
export const Medium: Story = {
	args: { ...moore },
};

/** The same condition fired again: the toast updates its count instead of stacking a second one (AL-11). */
export const Repeated: Story = {
	args: { count: 3 },
};

/** Without a reason, avatar or actions: what happened, when, and who. */
export const Minimal: Story = {
	args: {
		reason: undefined,
		initials: undefined,
		onOpen: undefined,
		onAcknowledge: undefined,
		onAsk: undefined,
		onOpenAlert: undefined,
	},
};

/** Both severities, side by side. */
export const AllVariants: Story = {
	render: (args) => (
		<div className='flex flex-col gap-4'>
			<AlertToast {...args} {...hayes} />
			<AlertToast {...args} {...moore} />
		</div>
	),
};

/**
 * What changed, after the pill. Up a severity needs the clinician (pulsing ring, Acknowledge); acknowledged by someone
 * else and resolved are addressed: a still ring, no Acknowledge, and they leave after 10 s.
 */
export const Changes: Story = {
	render: (args) => (
		<div className='flex flex-col gap-4'>
			<AlertToast {...args} {...moore} severity='high' change='Up from Medium' />
			<AlertToast {...args} {...moore} change='Acknowledged' addressed onAcknowledge={undefined} />
			<AlertToast {...args} {...moore} severity='resolved' onAcknowledge={undefined} />
		</div>
	),
};

// Moore's Open alert, so the story can check a click anywhere in the header opens it.
const openMooreAlert = fn();

function ToasterExample() {
	const repeats = React.useRef(1);
	return (
		<div className='flex flex-wrap gap-2'>
			<Toaster />
			<Button onClick={() => toastAlert({ ...hayes, id: "hayes", onOpen: fn(), onAcknowledge: fn(), onAsk: fn(), onOpenAlert: fn() })}>Critical alert</Button>
			<Button variant='outline' onClick={() => toastAlert({ ...moore, id: "moore", onOpen: fn(), onAcknowledge: fn(), onAsk: fn(), onOpenAlert: openMooreAlert })}>
				Medium alert
			</Button>
			<Button
				variant='outline'
				onClick={() => {
					repeats.current += 1;
					toastAlert({ ...hayes, id: "hayes", count: repeats.current, onOpen: fn(), onAcknowledge: fn(), onAsk: fn(), onOpenAlert: fn() });
				}}
			>
				Repeat critical
			</Button>
		</div>
	);
}

/**
 * In the app: `<Toaster />` once at the root, then `toastAlert()` for each alert. Repeat critical fires the same alert
 * id again, so its toast counts up instead of stacking.
 */
export const InToaster: Story = {
	parameters: { layout: "padded" },
	render: () => <ToasterExample />,
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await userEvent.click(canvas.getByRole("button", { name: "Critical alert" }));
		const alert = await screen.findByRole("alert");
		await expect(within(alert).getByText("Deterioration score crossed threshold")).toBeInTheDocument();

		await userEvent.click(canvas.getByRole("button", { name: "Repeat critical" }));
		await waitFor(() => expect(screen.getAllByRole("alert")).toHaveLength(1));

		await userEvent.click(within(screen.getByRole("alert")).getByRole("button", { name: "Acknowledge" }));
		await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());

		// In the Toaster, a click on the header's words (not only the icon) opens the alert: Sonner doesn't take it as a swipe.
		await userEvent.click(canvas.getByRole("button", { name: "Medium alert" }));
		const header = await screen.findByRole("button", { name: /^Open alert: Medium/ });
		await userEvent.click(within(header).getByText("Medium"));
		await waitFor(() => expect(openMooreAlert).toHaveBeenCalled());
	},
};
