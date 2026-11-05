import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, userEvent, waitFor } from "storybook/test";

import { Button } from "@/components/buttons/button";

import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "./dialog";

const meta = {
	title: "Overlays/Dialog",
	component: DialogContent,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof DialogContent>;

export default meta;
type Story = StoryObj<typeof meta>;

function Example({ label, className }: { label: string; className?: string }) {
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant='outline'>{label}</Button>
			</DialogTrigger>
			<DialogContent className={className}>
				<DialogHeader>
					<DialogTitle>Resolve alert</DialogTitle>
					<DialogDescription>Pick why it's resolved. The alert leaves the queue for its history.</DialogDescription>
				</DialogHeader>
				<div className='px-6 py-2 text-sm text-muted-foreground'>The dialog's content.</div>
				<DialogFooter>
					<DialogClose asChild>
						<Button variant='ghost'>Cancel</Button>
					</DialogClose>
					<DialogClose asChild>
						<Button>Resolve</Button>
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

/**
 * 560px, in the middle of the screen over a scrim. Escape, the close button or a click on the scrim closes it, and
 * focus returns to the button that opened it.
 */
export const Default: Story = {
	render: () => <Example label='Open dialog' />,
	play: async ({ canvas }) => {
		const trigger = canvas.getByRole("button", { name: "Open dialog" });
		await userEvent.click(trigger);
		const dialog = await screen.findByRole("dialog", { name: "Resolve alert" });
		// It fades in: wait for it, rather than checking on the first frame.
		await waitFor(() => expect(dialog).toBeVisible());
		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
		await expect(trigger).toHaveFocus();
	},
};

/** A wider window: its width goes in `className`. */
export const Wide: Story = {
	render: () => <Example label='Open a wide dialog' className='w-[960px]' />,
};

/** Both widths. */
export const AllVariants: Story = {
	render: () => (
		<div className='flex flex-wrap gap-2'>
			<Example label='560px' />
			<Example label='960px' className='w-[960px]' />
		</div>
	),
};
