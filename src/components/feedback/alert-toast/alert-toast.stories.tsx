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

const anderson = {
	severity: "low",
	title: "Heart rate trending up",
	firedAt: justNow,
	reason: "HR 102 bpm, up from 84 over 2 h",
	patientName: "Anderson, James",
	location: "CVMC · SICU · Bed 2",
	initials: "AJ",
	tone: 2,
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
		// The whole toast opens the alert…
		await userEvent.click(canvas.getByRole("button", { name: `Open alert: ${hayes.title}` }));
		await expect(args.onOpenAlert).toHaveBeenCalledTimes(1);
		// …except its own buttons, which do only what they say.
		await userEvent.click(canvas.getByRole("button", { name: "Ask Intercept Live" }));
		await expect(args.onAsk).toHaveBeenCalledTimes(1);
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
 * What changed, after the pill. Up a severity needs the clinician (pulsing ring); acknowledged by someone else and
 * resolved are addressed: a still ring, and they leave after 10 s.
 */
export const Changes: Story = {
	render: (args) => (
		<div className='flex flex-col gap-4'>
			<AlertToast {...args} {...moore} severity='high' change='Up from Medium' />
			<AlertToast {...args} {...moore} change='Acknowledged' addressed />
			<AlertToast {...args} {...moore} severity='resolved' />
		</div>
	),
};

// Moore's Open alert, so the story can check a click on the toast opens it.
const openMooreAlert = fn();

function ToasterExample() {
	const repeats = React.useRef(1);
	return (
		<div className='flex flex-wrap gap-2'>
			<Toaster />
			<Button onClick={() => toastAlert({ ...hayes, id: "hayes", onOpen: fn(), onAsk: fn(), onOpenAlert: fn() })}>Critical alert</Button>
			<Button variant='outline' onClick={() => toastAlert({ ...moore, id: "moore", onOpen: fn(), onAsk: fn(), onOpenAlert: openMooreAlert })}>
				Medium alert
			</Button>
			<Button
				variant='outline'
				onClick={() => {
					repeats.current += 1;
					toastAlert({ ...hayes, id: "hayes", count: repeats.current, onOpen: fn(), onAsk: fn(), onOpenAlert: fn() });
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

		await userEvent.click(within(screen.getByRole("alert")).getByRole("button", { name: "Open patient" }));
		await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());

		// In the Toaster, a click on the toast opens the alert: Sonner doesn't take it as a swipe.
		await userEvent.click(canvas.getByRole("button", { name: "Medium alert" }));
		await userEvent.click(await screen.findByRole("button", { name: `Open alert: ${moore.title}` }));
		await waitFor(() => expect(openMooreAlert).toHaveBeenCalled());
	},
};

// The alert titles in the stack, front first.
const stackOrder = () =>
	[...document.querySelectorAll<HTMLElement>("[data-sonner-toast]:not([data-removed=true])")].map(
		(element) => [hayes, moore, anderson].find((alert) => element.textContent?.includes(alert.title))?.title,
	);

/**
 * The most severe alert is always in front, whatever arrives after it, and the newest within a severity. Hayes's
 * Critical comes first, then Moore's Medium and Anderson's Low: Hayes stays in front. Anderson's alert going up to High
 * moves it ahead of Moore's.
 */
export const SortedBySeverity: Story = {
	parameters: { layout: "padded" },
	render: () => (
		<div className='flex flex-wrap gap-2'>
			<Toaster />
			<Button
				onClick={() => {
					toastAlert({ ...hayes, id: "sorted-hayes", onOpen: fn() });
					toastAlert({ ...moore, id: "sorted-moore", onOpen: fn() });
					toastAlert({ ...anderson, id: "sorted-anderson", onOpen: fn() });
				}}
			>
				Three alerts
			</Button>
			<Button
				variant='outline'
				onClick={() => toastAlert({ ...anderson, id: "sorted-anderson", severity: "high", change: "Up from Low", onOpen: fn() })}
			>
				Anderson up to High
			</Button>
		</div>
	),
	play: async ({ canvas }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Three alerts" }));
		await waitFor(() => expect(stackOrder()).toEqual([hayes.title, moore.title, anderson.title]));
		await userEvent.click(canvas.getByRole("button", { name: "Anderson up to High" }));
		await waitFor(() => expect(stackOrder()).toEqual([hayes.title, anderson.title, moore.title]));
	},
};
