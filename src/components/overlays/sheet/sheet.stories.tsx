import type { Meta, StoryObj } from "@storybook/react-vite";
import { SlidersHorizontalIcon } from "lucide-react";
import { expect, screen, userEvent, waitFor } from "storybook/test";

import { Button } from "@/components/buttons/button";

import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
	type SheetSide,
} from "./sheet";

const meta = {
	title: "Overlays/Sheet",
	component: SheetContent,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	args: {
		side: "right",
	},
} satisfies Meta<typeof SheetContent>;

export default meta;
type Story = StoryObj<typeof meta>;

function Example({ side, label }: { side: SheetSide; label: string }) {
	return (
		<Sheet>
			<SheetTrigger asChild>
				<Button variant='outline'>
					<SlidersHorizontalIcon />
					{label}
				</Button>
			</SheetTrigger>
			<SheetContent side={side}>
				<SheetHeader>
					<SheetTitle>Filters</SheetTitle>
					<SheetDescription>Options in a group match any. Groups match all.</SheetDescription>
				</SheetHeader>
				<div className='flex-1 overflow-y-auto px-8 py-4 text-sm text-muted-foreground'>The sheet's content.</div>
				<SheetFooter className='justify-end'>
					<SheetClose asChild>
						<Button variant='ghost'>Cancel</Button>
					</SheetClose>
					<SheetClose asChild>
						<Button>Apply</Button>
					</SheetClose>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}

/**
 * From the right, as Intercept Live's Filters: 400px, over a scrim that covers the whole app. Escape, the close
 * button or a click on the scrim closes it, and focus returns to the button that opened it.
 */
export const Default: Story = {
	render: (args) => <Example side={args.side ?? "right"} label='Filters' />,
	play: async ({ canvas }) => {
		const trigger = canvas.getByRole("button", { name: "Filters" });
		await userEvent.click(trigger);
		const dialog = await screen.findByRole("dialog", { name: "Filters" });
		// It fades in: wait for it, rather than checking on the first frame.
		await waitFor(() => expect(dialog).toBeVisible());
		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
		await expect(trigger).toHaveFocus();
	},
};

/** From the left. */
export const Left: Story = {
	args: { side: "left" },
	render: (args) => <Example side={args.side ?? "left"} label='Open from the left' />,
};

/** Every side. */
export const AllVariants: Story = {
	render: () => (
		<div className='flex flex-wrap gap-2'>
			{(["right", "left", "top", "bottom"] as const).map((side) => (
				<Example key={side} side={side} label={`From the ${side}`} />
			))}
		</div>
	),
};
