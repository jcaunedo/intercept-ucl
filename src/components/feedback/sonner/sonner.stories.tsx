import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, userEvent, waitFor, within } from "storybook/test";

import { Button } from "@/components/buttons/button";

import { Toaster, toast } from "./sonner";

const meta = {
	title: "Feedback/Sonner",
	component: Toaster,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
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
			<Button variant='outline' onClick={() => toast.warning("Harbor Point data is delayed")}>
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
