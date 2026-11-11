import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, userEvent, waitFor, within } from "storybook/test";

import { Button } from "@/components/buttons/button";

import { muteToasts, Toaster, toast, toastsMuted } from "./sonner";

const meta = {
	title: "Feedback/Sonner",
	component: Toaster,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	// Close all pauses toasts for the whole app until Resume, so each story starts with them showing.
	beforeEach: () => {
		muteToasts(null);
	},
} satisfies Meta<typeof Toaster>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A plain message. Alerts use `toastAlert()` (Feedback/AlertToast) in the same Toaster. */
export const Default: Story = {
	render: (args) => (
		<>
			<Toaster {...args} />
			<Button variant='outline' onClick={() => toast("Handoff note saved")}>
				Show toast
			</Button>
		</>
	),
	play: async ({ canvasElement }) => {
		await userEvent.click(within(canvasElement).getByRole("button", { name: "Show toast" }));
		await expect(await screen.findByText("Handoff note saved")).toBeInTheDocument();
		// Under the popovers, menus and tooltips the user opens (70), over dialogs (50): theme.css "Stacking order".
		await expect(getComputedStyle(document.querySelector("[data-sonner-toaster]") as Element).zIndex).toBe("60");
	},
};

function SpreadOnClickExample(args: React.ComponentProps<typeof Toaster>) {
	const [undone, setUndone] = React.useState(false);
	return (
		<>
			<Toaster {...args} />
			<div className='flex flex-col items-center gap-2'>
				<Button
					variant='outline'
					onClick={() => {
						setUndone(false);
						toast("Vitals synced", { duration: Number.POSITIVE_INFINITY });
						toast("Handoff note saved", {
							duration: Number.POSITIVE_INFINITY,
							action: { label: "Undo", onClick: () => setUndone(true) },
						});
					}}
				>
					Show two toasts
				</Button>
				<span>{undone ? "Undone" : null}</span>
			</div>
		</>
	);
}

const stackSpread = () =>
	[...document.querySelectorAll<HTMLElement>("[data-sonner-toast]")].every((item) => item.dataset.expanded === "true");

/**
 * A click spreads the stack, not hovering (Nov 11, 2026, user's call): on a collapsed stack a click on a toast only
 * spreads it, a click outside collapses it again, and the front toast's own buttons (here Undo) act at once.
 */
export const SpreadOnClick: Story = {
	render: (args) => <SpreadOnClickExample {...args} />,
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		toast.dismiss();
		await userEvent.click(canvas.getByRole("button", { name: "Show two toasts" }));
		const front = await screen.findByText("Handoff note saved");
		await waitFor(() => expect(document.querySelectorAll("[data-sonner-toast]")).toHaveLength(2));
		// Hovering holds the timers but leaves the stack collapsed.
		await userEvent.hover(front);
		await new Promise((resolve) => setTimeout(resolve, 400));
		await expect(stackSpread()).toBe(false);
		// A click on the front toast spreads it, and a click outside collapses it.
		await userEvent.click(front);
		await waitFor(() => expect(stackSpread()).toBe(true));
		await userEvent.click(document.body);
		await waitFor(() => expect(stackSpread()).toBe(false));
		// The front toast's own button acts on a collapsed stack, without spreading it.
		await userEvent.click(screen.getByRole("button", { name: "Undo" }));
		await expect(await canvas.findByText("Undone")).toBeInTheDocument();
		toast.dismiss();
	},
};

function HiddenExample(args: React.ComponentProps<typeof Toaster>) {
	const [hidden, setHidden] = React.useState(false);
	return (
		<>
			<Toaster {...args} hidden={hidden} />
			<div className='flex gap-2'>
				<Button variant='outline' onClick={() => toast("Camera session ended")}>
					Show toast
				</Button>
				<Button variant='outline' aria-pressed={hidden} onClick={() => setHidden(!hidden)}>
					{hidden ? "Show toasts" : "Hide toasts"}
				</Button>
			</div>
		</>
	);
}

/**
 * `hidden`, as under Intercept Live's alert modal: the toasts fade out and wait (their timers pause), then fade back in.
 */
export const Hidden: Story = {
	render: (args) => <HiddenExample {...args} />,
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await userEvent.click(canvas.getByRole("button", { name: "Show toast" }));
		await waitFor(() => expect(screen.getByText("Camera session ended")).toBeVisible());
		await userEvent.click(canvas.getByRole("button", { name: "Hide toasts" }));
		const region = document.querySelector("[data-slot='toaster-region']");
		await expect(region).toHaveAttribute("data-hidden");
		await waitFor(() => expect(screen.getByText("Camera session ended")).not.toBeVisible());
		await userEvent.click(canvas.getByRole("button", { name: "Show toasts" }));
		await waitFor(() => expect(screen.getByText("Camera session ended")).toBeVisible());
	},
};

/**
 * Muted (Don't show): "Muted until …" over the stack, there even without toasts. Play (tooltip Resume) shows toasts
 * again; × (tooltip Hide) closes the notice and keeps them muted until the app reloads.
 */
export const Muted: Story = {
	render: (args) => (
		<>
			<Toaster {...args} />
			<Button variant='outline' onClick={() => muteToasts(new Date(Date.now() + 30 * 60_000))}>
				Mute for 30 mins
			</Button>
		</>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await userEvent.click(canvas.getByRole("button", { name: "Mute for 30 mins" }));
		await expect(await screen.findByText(/^Muted until/)).toBeInTheDocument();
		await userEvent.click(screen.getByRole("button", { name: "Resume alert notifications" }));
		await waitFor(() => expect(screen.queryByText(/^Muted until/)).not.toBeInTheDocument());
		await expect(toastsMuted()).toBe(false);
		await userEvent.click(canvas.getByRole("button", { name: "Mute for 30 mins" }));
		await userEvent.click(await screen.findByRole("button", { name: "Hide, and keep alert notifications muted until reload" }));
		await waitFor(() => expect(screen.queryByText(/^Muted until/)).not.toBeInTheDocument());
		await expect(toastsMuted()).toBe(true);
		// Other stories share the page's mute.
		muteToasts(null);
	},
};

/**
 * While the pointer is on the row over the stack (Don't show, Close all) or its menu is open, the toasts' timers hold, so
 * nothing leaves or moves until the clinician has chosen; they run again once the pointer leaves.
 */
export const HoldWhileChoosing: Story = {
	render: (args) => (
		<>
			<Toaster {...args} />
			<Button variant='outline' onClick={() => toast("Vitals synced", { duration: 1500 })}>
				Show short toast
			</Button>
		</>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await userEvent.click(canvas.getByRole("button", { name: "Show short toast" }));
		await expect(await screen.findByText("Vitals synced")).toBeInTheDocument();
		// From the toast up to the row, as the pointer goes.
		await userEvent.hover(screen.getByText("Vitals synced"));
		await userEvent.unhover(screen.getByText("Vitals synced"));
		await userEvent.hover(await screen.findByRole("button", { name: "Don't show" }));
		await new Promise((resolve) => setTimeout(resolve, 2500));
		await expect(screen.getByText("Vitals synced")).toBeInTheDocument();
		// Opening the menu and closing it without choosing, the pointer still on Don't show: still held.
		await userEvent.click(screen.getByRole("button", { name: "Don't show" }));
		await expect(await screen.findByRole("menu")).toBeInTheDocument();
		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
		await new Promise((resolve) => setTimeout(resolve, 2000));
		await expect(screen.getByText("Vitals synced")).toBeInTheDocument();
		// Leaving the row, and its keyboard focus (Escape gave it back to Don't show), lets the timer run.
		await userEvent.unhover(screen.getByRole("button", { name: "Don't show" }));
		await userEvent.hover(canvas.getByRole("button", { name: "Show short toast" }));
		(document.activeElement as HTMLElement | null)?.blur();
		await waitFor(() => expect(screen.queryByText("Vitals synced")).not.toBeInTheDocument(), { timeout: 4000 });
	},
};

/** Each of Sonner's types, as on shadcn's page: Default (with a description), Success, Info, Warning, Error, Promise. */
export const AllVariants: Story = {
	render: (args) => (
		<div className='flex flex-wrap gap-2'>
			<Toaster {...args} />
			<Button variant='outline' onClick={() => toast("Handoff note saved", { description: "Visible to the night team." })}>
				Default
			</Button>
			<Button variant='outline' onClick={() => toast.success("Consult request sent")}>
				Success
			</Button>
			<Button variant='outline' onClick={() => toast.info("Chadron's feed is back")}>
				Info
			</Button>
			<Button variant='outline' onClick={() => toast.warning("Bridgeport data is delayed")}>
				Warning
			</Button>
			<Button variant='outline' onClick={() => toast.error("Couldn't send the escalation")}>
				Error
			</Button>
			<Button
				variant='outline'
				onClick={() =>
					toast.promise(new Promise((resolve) => setTimeout(resolve, 2000)), {
						loading: "Sending consult request…",
						success: "Consult request sent",
						error: "Couldn't send the consult request",
					})
				}
			>
				Promise
			</Button>
		</div>
	),
};
