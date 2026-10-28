import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { ChatComposer, type ChatCommand } from "./chat-composer";

const commands: ChatCommand[] = [
	{ name: "summarize", description: "A patient's last 24 hours" },
	{ name: "changes", description: "What changed in the last hour" },
	{ name: "labs", description: "Latest labs" },
	{ name: "handoff", description: "Draft a handoff (I-PASS)" },
];

const meta = {
	title: "Forms/Chat Composer",
	component: ChatComposer,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	args: {
		placeholder: "How can I help?",
		label: "Ask Intercept Live",
		onSubmit: fn(),
		onAttach: fn(),
		onDictate: fn(),
		onVoice: fn(),
		commands,
		className: "w-90",
	},
} satisfies Meta<typeof ChatComposer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Empty: +, the microphone and the voice button. Enter sends; Shift+Enter starts a new line. */
export const Default: Story = {
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement);
		const field = canvas.getByRole("combobox", { name: "Ask Intercept Live" });
		await expect(canvas.getByRole("button", { name: "Start voice conversation" })).toBeVisible();

		// Typing swaps voice for Send; Enter sends the trimmed text and clears the field.
		await userEvent.type(field, "  What changed in the last hour?  ");
		await expect(canvas.getByRole("button", { name: "Send" })).toBeEnabled();
		await userEvent.keyboard("{Enter}");
		await expect(args.onSubmit).toHaveBeenCalledWith("What changed in the last hour?");
		await expect(field).toHaveValue("");
	},
};

/**
 * Slash commands: the slash button, or "/" at the start, opens the menu above the box. It filters as you type; ↑ ↓
 * move, Enter or Tab picks ("/handoff "), Escape closes it.
 */
export const Commands: Story = {
	parameters: { layout: "padded" },
	render: (args) => (
		<div className='flex h-80 items-end justify-center'>
			<ChatComposer {...args} />
		</div>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const field = canvas.getByRole("combobox", { name: "Ask Intercept Live" });

		await userEvent.type(field, "/");
		await expect(canvas.getByRole("listbox", { name: "Commands" })).toBeInTheDocument();
		await expect(canvas.getAllByRole("option")).toHaveLength(4);

		// Typing filters; Enter picks the highlighted command.
		await userEvent.type(field, "ha");
		await expect(canvas.getAllByRole("option")).toHaveLength(1);
		await userEvent.keyboard("{Enter}");
		await expect(field).toHaveValue("/handoff ");
		await expect(canvas.queryByRole("listbox")).toBeNull();

		// The slash button opens it over text already there; Escape closes it.
		await userEvent.clear(field);
		await userEvent.click(canvas.getByRole("button", { name: "Commands" }));
		await expect(field).toHaveValue("/");
		await userEvent.keyboard("{Escape}");
		await expect(canvas.queryByRole("listbox")).toBeNull();
	},
};

/** With text: Send takes the voice button's place. */
export const WithText: Story = {
	args: { defaultValue: "Summarize the last 24 hours for Miller, Sarah" },
};

/** A long message grows the field up to 160px, then it scrolls. */
export const LongText: Story = {
	args: {
		defaultValue:
			"Show me the lactate trend with the antibiotic timeline overlaid, and list every positive blood culture in the last 72 hours, with the organism and its susceptibilities when they're final. Then tell me what changed since I last reviewed this patient.",
	},
};

/** Without the optional handlers: no +, commands or microphone, and Send stays until there's text to send. */
export const SendOnly: Story = {
	args: { onAttach: undefined, onDictate: undefined, onVoice: undefined, commands: undefined },
};

/** While an answer is being written: Stop replaces Send, and Enter doesn't send. */
export const Generating: Story = {
	args: { generating: true, onStop: fn(), defaultValue: "And the lactate trend?" },
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement);
		await userEvent.click(canvas.getByRole("combobox"));
		await userEvent.keyboard("{Enter}");
		await expect(args.onSubmit).not.toHaveBeenCalled();
		await userEvent.click(canvas.getByRole("button", { name: "Stop generating" }));
		await expect(args.onStop).toHaveBeenCalled();
	},
};

export const Disabled: Story = {
	args: { disabled: true },
};

/** Every state together: empty, with text, send only, generating and disabled. */
export const AllVariants: Story = {
	render: (args) => (
		<div className='flex flex-col gap-6'>
			<ChatComposer {...args} />
			<ChatComposer {...args} {...WithText.args} />
			<ChatComposer {...args} {...SendOnly.args} />
			<ChatComposer {...args} {...Generating.args} />
			<ChatComposer {...args} {...Disabled.args} />
		</div>
	),
};
