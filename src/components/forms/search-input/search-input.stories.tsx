import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";

import { SearchInput } from "./search-input";

const meta = {
	title: "Forms/SearchInput",
	component: SearchInput,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		size: {
			control: "select",
			options: ["md", "lg"],
		},
	},
	args: {
		placeholder: "Search",
	},
	// A fixed-width frame, so the field opens without moving the story.
	decorators: [
		(Story) => (
			<div className='flex h-16 w-72 items-center'>
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof SearchInput>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Closed: the magnifier alone. A click or Tab opens it; it closes again when left empty. */
export const Default: Story = {
	play: async ({ canvas, canvasElement, userEvent }) => {
		const field = canvasElement.querySelector<HTMLElement>("[data-slot='search-input']");
		await expect(field).toHaveAttribute("data-state", "closed");
		await userEvent.click(field!);
		await expect(canvas.getByRole("searchbox", { name: "Search" })).toHaveFocus();
		await expect(field).toHaveAttribute("data-state", "open");
		await userEvent.tab();
		await waitFor(() => expect(field).toHaveAttribute("data-state", "closed"));
	},
};

/** Typing shows the clear button; it empties the field and keeps focus in it. */
export const Dirty: Story = {
	play: async ({ canvas, userEvent }) => {
		const input = canvas.getByRole("searchbox", { name: "Search" });
		await userEvent.click(input);
		await userEvent.type(input, "abc");
		await userEvent.click(await canvas.findByRole("button", { name: "Clear search" }));
		await expect(input).toHaveValue("");
		await expect(input).toHaveFocus();
	},
};

/** With text and not focused, the field stays open, without the clear button. */
export const HasValue: Story = {
	args: { defaultValue: "abc" },
	play: async ({ canvas, canvasElement }) => {
		await expect(canvasElement.querySelector("[data-slot='search-input']")).toHaveAttribute("data-state", "open");
		await expect(canvas.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument();
	},
};

/** Escape clears the text first, then leaves the field. */
export const Escape: Story = {
	play: async ({ canvas, userEvent }) => {
		const input = canvas.getByRole("searchbox", { name: "Search" });
		await userEvent.click(input);
		await userEvent.type(input, "abc{Escape}");
		await expect(input).toHaveValue("");
		await expect(input).toHaveFocus();
		await userEvent.keyboard("{Escape}");
		await expect(input).not.toHaveFocus();
	},
};

/** `collapsible={false}` keeps the field open while empty. */
export const AlwaysOpen: Story = {
	args: { collapsible: false },
};

/** Controlled, with `value` and `onValueChange`. */
export const Controlled: Story = {
	render: (args) => {
		const [value, setValue] = React.useState("Miller");
		return <SearchInput {...args} value={value} onValueChange={setValue} />;
	},
};

/** Disabled. */
export const Disabled: Story = {
	args: { disabled: true, collapsible: false },
};

/** Both sizes, closed and with text: `md` is 36px (the default), `lg` is 40px. */
export const AllVariants: Story = {
	decorators: [
		(Story) => (
			<div className='w-[520px]'>
				<Story />
			</div>
		),
	],
	render: (args) => (
		<div className='grid grid-cols-2 gap-4'>
			<SearchInput {...args} />
			<SearchInput {...args} size='lg' />
			<SearchInput {...args} defaultValue='abc' />
			<SearchInput {...args} size='lg' defaultValue='abc' />
			<SearchInput {...args} collapsible={false} />
			<SearchInput {...args} size='lg' collapsible={false} />
		</div>
	),
};
