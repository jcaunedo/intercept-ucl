import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CopyIcon, MoreHorizontalIcon, PencilIcon, SlidersHorizontalIcon, Trash2Icon } from "lucide-react";
import { expect, screen, waitFor } from "storybook/test";

import { Button } from "@/components/buttons/button";

import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuTrigger,
} from "./dropdown-menu";

const meta = {
	title: "Overlays/DropdownMenu",
	component: DropdownMenuContent,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof DropdownMenuContent>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Actions on an item. Destructive ones go last, after a separator. */
export const Actions: Story = {
	render: (args) => (
		<DropdownMenu defaultOpen>
			<DropdownMenuTrigger asChild>
				<Button variant='outline' size='icon-md' aria-label='More actions'>
					<MoreHorizontalIcon />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='end' {...args}>
				<DropdownMenuItem>
					<PencilIcon />
					Rename
					<DropdownMenuShortcut>⌘R</DropdownMenuShortcut>
				</DropdownMenuItem>
				<DropdownMenuItem>
					<CopyIcon />
					Duplicate
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem variant='destructive'>
					<Trash2Icon />
					Delete
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	),
	play: async () => {
		// The menu fades in, so wait for it.
		const item = await screen.findByRole("menuitem", { name: /Delete/ });
		await waitFor(() => expect(item).toBeVisible());
	},
};

function ViewOptions(args: React.ComponentProps<typeof DropdownMenuContent>) {
	const [strip, setStrip] = React.useState("waveform");
	const [full, setFull] = React.useState(false);

	return (
		<DropdownMenu defaultOpen>
			<DropdownMenuTrigger asChild>
				<Button variant='outline'>
					<SlidersHorizontalIcon />
					View
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='end' className='w-56' {...args}>
				<DropdownMenuGroup>
					<DropdownMenuLabel>Card monitor</DropdownMenuLabel>
					<DropdownMenuRadioGroup value={strip} onValueChange={setStrip}>
						<DropdownMenuRadioItem value='waveform'>ECG strip</DropdownMenuRadioItem>
						<DropdownMenuRadioItem value='trends'>1 h trends</DropdownMenuRadioItem>
					</DropdownMenuRadioGroup>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuCheckboxItem checked={full} onCheckedChange={setFull}>
					Full monitors
				</DropdownMenuCheckboxItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

/** Options: a radio group (one choice) and a checkbox item (on or off), as Monitoring's former View menu. */
export const Options: Story = {
	render: (args) => <ViewOptions {...args} />,
	play: async ({ userEvent }) => {
		await userEvent.click(await screen.findByRole("menuitemradio", { name: "1 h trends" }));
		await expect(screen.queryByRole("menu")).not.toBeInTheDocument();
	},
};
