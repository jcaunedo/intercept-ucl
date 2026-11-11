import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test";

import { Button } from "@/components/buttons/button";
import { muteToasts, Toaster, toast } from "@/components/feedback/sonner";

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
	location: "Chadron Memorial · Med-Surg · Bed 4",
	initials: "HM",
	tone: 3,
} satisfies ToastAlertOptions;

const moore = {
	severity: "medium",
	title: "MAP below 65 mmHg",
	firedAt: threeMinutesAgo,
	reason: "MAP 57 mmHg, HR 108 bpm",
	patientName: "Moore, Patricia",
	location: "Sidney Regional · SICU · Bed 4",
	initials: "MP",
	tone: 6,
} satisfies ToastAlertOptions;

const anderson = {
	severity: "low",
	title: "Heart rate trending up",
	firedAt: justNow,
	reason: "HR 102 bpm, up from 84 over 2 h",
	patientName: "Anderson, James",
	location: "Sidney Regional · SICU · Bed 2",
	initials: "AJ",
	tone: 2,
} satisfies ToastAlertOptions;

// Scenario 2: Alliance's ED physician calls the hub about Dale Reynolds. Ringing for 42 s.
const reynoldsConsult = {
	severity: "consult-request",
	title: "Urgent video consult request",
	firedAt: new Date(Date.now() - 42_000).toISOString(),
	requester: { name: "Dr. Brian Keller", role: "ED physician", site: "Alliance ED", initials: "BK", tone: 4 },
	patientName: "Reynolds, Dale",
	location: "64 M · ED Bay 3",
	initials: "DR",
	tone: 7,
	reason: "Hypercapnic failure on BiPAP. Can we keep him here?",
	latest: "pH 7.24 · PaCO₂ 78 · RR 30 · SpO₂ 88% on BiPAP",
	urgency: "high",
} satisfies ToastAlertOptions;

const meta = {
	title: "Feedback/AlertToast",
	component: AlertToast,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	// Close all pauses toasts for the whole app until Resume, so each story starts with them showing.
	beforeEach: () => {
		muteToasts(null);
	},
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

/** Medium (T2): stays until acted on or closed, as every open alert does. */
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
 * What changed, after the pill. Up a severity needs the clinician; acknowledged by someone else and resolved are
 * addressed. Every ring is still. A Resolved toast leaves after 5 s; the others stay until closed.
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

		// With two or more, a click on the collapsed stack only spreads it (Nov 11, 2026, user's call); spread, a click on a
		// toast opens its alert. The Toaster marks the collapsed stack (`data-stack-collapsed`), which drops the toasts' hover
		// border until it's spread.
		openMooreAlert.mockClear();
		toastAlert({ ...hayes, id: "hayes-stacked", onOpenAlert: fn() });
		toastAlert({ ...moore, id: "moore-stacked", onOpenAlert: openMooreAlert });
		await waitFor(() => expect(document.querySelectorAll("[data-sonner-toast]:not([data-removed=true])")).toHaveLength(2));
		const toaster = document.querySelector("[data-sonner-toaster]");
		await expect(toaster).toHaveAttribute("data-stack-collapsed", "true");
		const openMoore = await screen.findByRole("button", { name: `Open alert: ${moore.title}` });
		await userEvent.click(openMoore);
		await waitFor(() => expect(document.querySelector<HTMLElement>("[data-sonner-toast]")?.dataset.expanded).toBe("true"));
		await expect(toaster).toHaveAttribute("data-stack-collapsed", "false");
		await expect(openMooreAlert).not.toHaveBeenCalled();
		await userEvent.click(openMoore);
		await waitFor(() => expect(openMooreAlert).toHaveBeenCalledTimes(1));
		toast.dismiss();
	},
};

// The alert titles in the stack, front first.
const stackOrder = () =>
	[...document.querySelectorAll<HTMLElement>("[data-sonner-toast]:not([data-removed=true])")].map(
		(element) => [hayes, moore, anderson].find((alert) => element.textContent?.includes(alert.title))?.title,
	);

/**
 * The newest alert is always in front, whatever its severity. Hayes's Critical comes first, then Moore's Medium and
 * Anderson's Low: Anderson's is in front, Hayes's at the back. An alert that changes is the newest: Moore's going up to
 * High moves it to the front.
 */
export const NewestFirst: Story = {
	parameters: { layout: "padded" },
	render: () => (
		<div className='flex flex-wrap gap-2'>
			<Toaster />
			<Button
				onClick={() => {
					toastAlert({ ...hayes, id: "newest-hayes", onOpen: fn() });
					toastAlert({ ...moore, id: "newest-moore", onOpen: fn() });
					toastAlert({ ...anderson, id: "newest-anderson", onOpen: fn() });
				}}
			>
				Three alerts
			</Button>
			<Button
				variant='outline'
				onClick={() => toastAlert({ ...moore, id: "newest-moore", severity: "high", change: "Up from Medium", onOpen: fn() })}
			>
				Moore up to High
			</Button>
		</div>
	),
	play: async ({ canvas }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Three alerts" }));
		await waitFor(() => expect(stackOrder()).toEqual([anderson.title, moore.title, hayes.title]));
		await userEvent.click(canvas.getByRole("button", { name: "Moore up to High" }));
		await waitFor(() => expect(stackOrder()).toEqual([moore.title, anderson.title, hayes.title]));
		// Open alerts don't leave on their own: Close all clears them and pauses new ones until Resume (Nov 6, 2026, user's
		// call): "Alert notifications paused" takes Don't show's place, and a new alert waits.
		await userEvent.click(screen.getByRole("button", { name: "Close all" }));
		await waitFor(() => expect(stackOrder()).toEqual([]));
		await expect(await screen.findByText("Alert notifications paused")).toBeVisible();
		await userEvent.click(canvas.getByRole("button", { name: "Moore up to High" }));
		await expect(stackOrder()).toEqual([]);
		// Resume shows them again.
		await userEvent.click(screen.getByRole("button", { name: "Resume alert notifications" }));
		await waitFor(() => expect(screen.queryByText("Alert notifications paused")).toBeNull());
	},
};

// Eight alerts, oldest first: more than a screen holds once the stack spreads.
const tallStack = Array.from({ length: 8 }, (_, index) => ({
	...[hayes, moore, anderson][index % 3],
	id: `tall-${index}`,
	title: `Alert ${index + 1}`,
}));

/**
 * Spread, a stack taller than the screen scrolls: the wheel brings the toasts above the screen into view, under Don't
 * show and Close all, which stay at the top. Click the stack to spread it, then scroll up.
 */
export const TallStackScrolls: Story = {
	parameters: { layout: "padded" },
	render: () => (
		<div className='flex flex-wrap gap-2'>
			<Toaster />
			<Button onClick={() => tallStack.forEach((alert) => toastAlert({ ...alert, onOpen: fn() }))}>Eight alerts</Button>
		</div>
	),
	play: async ({ canvas }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Eight alerts" }));
		const oldest = () => screen.getByText("Alert 1").closest<HTMLElement>("[data-sonner-toast]")!;
		await waitFor(() => expect(oldest()).toBeInTheDocument());
		// Spread it with a click, and wait for the oldest to rise past the top of the screen.
		await userEvent.click(screen.getByText("Alert 8"));
		await waitFor(() => expect(oldest().getBoundingClientRect().top).toBeLessThan(0));
		// Scrolled up as far as it goes, the oldest sits under the actions row (16px from the top, 32px tall, 8px gap).
		screen.getByText("Alert 8").dispatchEvent(new WheelEvent("wheel", { deltaY: -5000, bubbles: true, cancelable: true }));
		await waitFor(() => expect(Math.round(oldest().getBoundingClientRect().top)).toBe(56));
		await expect(screen.getByRole("button", { name: "Close all" }).getBoundingClientRect().top).toBe(16);
		// Collapsed by a click outside, it goes back.
		await userEvent.click(document.body);
		await waitFor(() => expect(document.querySelector<HTMLElement>("[data-sonner-toaster]")!.style.translate).toBe(""));
		await userEvent.click(screen.getByRole("button", { name: "Close all" }));
		await waitFor(() => expect(stackOrder()).toEqual([]));
	},
};

/**
 * A consult request: a hospital calling the hub for a video consult, on the `neutral` surface with Critical's ring, which
 * rings until it's answered or declined. Who's calling, the patient, the reason in their words and the latest values,
 * how long it has rung, then Decline and Answer. No ×: a call is answered or declined. The green video button by the
 * patient answers on the patient's page instead (`onAnswerOnPatientPage`).
 */
export const ConsultRequest: Story = {
	// Silent on the docs page, which shows every story at once; turn it on in Controls to hear it.
	args: { ...reynoldsConsult, onAnswer: fn(), onAnswerOnPatientPage: fn(), onDecline: fn(), ringtone: false },
	play: async ({ canvas, args }) => {
		await expect(canvas.getByText("Incoming call from")).toBeInTheDocument();
		await expect(canvas.getByRole("alert")).toHaveTextContent("Dr. Brian Keller, ED physician");
		await expect(canvas.getByText("Reynolds, Dale")).toBeInTheDocument();
		await expect(canvas.getByText("64 M · ED Bay 3")).toBeInTheDocument();
		await expect(canvas.queryByRole("button", { name: "Dismiss alert" })).not.toBeInTheDocument();
		await expect(canvas.queryByRole("button", { name: "Open patient" })).not.toBeInTheDocument();
		await userEvent.click(canvas.getByRole("button", { name: "Answer on the patient's page" }));
		await expect(args.onAnswerOnPatientPage).toHaveBeenCalled();
		await userEvent.click(canvas.getByRole("button", { name: "Answer" }));
		await expect(args.onAnswer).toHaveBeenCalled();
	},
};

// The consult request's Answer, so the story can check it after the Toaster's rules.
const answerConsult = fn();

function ConsultInToasterExample() {
	const [hidden, setHidden] = React.useState(false);
	return (
		<div className='flex flex-wrap gap-2'>
			<Toaster hidden={hidden} />
			<Button
				onClick={() => {
					toastAlert({ ...moore, id: "kept-moore", onOpen: fn() });
					toastAlert({ ...anderson, id: "kept-anderson", onOpen: fn() });
					toastAlert({ ...reynoldsConsult, id: "kept-reynolds", onAnswer: answerConsult, onDecline: fn() });
				}}
			>
				Two alerts and a call
			</Button>
			<Button variant='outline' onClick={() => setHidden(!hidden)}>
				{hidden ? "Show toasts" : "Hide toasts"}
			</Button>
		</div>
	);
}

/**
 * A consult request overrides the Toaster's rules (Nov 4, 2026, user's call): it rings (its ringtone plays from the click),
 * stacks in front of every alert, Close all
 * leaves it ringing, and it shows even while the Toaster is `hidden` (the alert modal or a patient's page is open) or
 * muted. Only Answer or Decline takes it away.
 */
export const ConsultRequestInToaster: Story = {
	parameters: { layout: "padded" },
	render: () => <ConsultInToasterExample />,
	play: async ({ canvas }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Two alerts and a call" }));
		// Other stories' toasts can still be up: the call is the alert with its title.
		await waitFor(() =>
			expect(screen.getAllByRole("alert").some((item) => item.textContent?.includes(reynoldsConsult.title))).toBe(true),
		);
		// Close all closes the alerts and leaves the call.
		await userEvent.click(await screen.findByRole("button", { name: "Close all" }));
		await waitFor(() => expect(screen.queryByText(moore.title)).not.toBeInTheDocument());
		await expect(screen.getByRole("alert")).toHaveTextContent(reynoldsConsult.title);
		// With only the call left, Don't show and Close all go: neither applies to a call.
		await waitFor(() => expect(screen.queryByRole("button", { name: "Close all" })).not.toBeInTheDocument());
		await waitFor(() => expect(screen.queryByRole("button", { name: /Don't show/ })).not.toBeInTheDocument());
		// Paused by Close all, the notice sits above the call, never over it, and the ringing call is above everything
		// (Nov 10, 2026, user's call).
		const notice = await screen.findByText("Alert notifications paused");
		await waitFor(() =>
			expect(notice.getBoundingClientRect().bottom).toBeLessThanOrEqual(screen.getByRole("alert").getBoundingClientRect().top),
		);
		await expect(getComputedStyle(document.querySelector("[data-sonner-toaster]") as Element).zIndex).toBe("80");
		// Hidden, the Toaster still shows while the call rings.
		await userEvent.click(canvas.getByRole("button", { name: "Hide toasts" }));
		await waitFor(() =>
			expect(document.querySelector("[data-slot='toaster-region']")).not.toHaveAttribute("data-hidden"),
		);
		await userEvent.click(within(screen.getByRole("alert")).getByRole("button", { name: "Answer" }));
		await waitFor(() => expect(answerConsult).toHaveBeenCalled());
		await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
		// With the call gone, hidden hides again.
		await waitFor(() => expect(document.querySelector("[data-slot='toaster-region']")).toHaveAttribute("data-hidden"));
	},
};
