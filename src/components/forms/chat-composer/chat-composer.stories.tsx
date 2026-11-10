import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";

import { ChatComposer, type ChatCommand } from "./chat-composer";

const commands: ChatCommand[] = [
	{ name: "summarize", description: "A patient's last 24 hours" },
	{ name: "changes", description: "What changed in the last hour" },
	{ name: "labs", description: "Latest labs" },
	{ name: "handoff", description: "Draft a handoff (I-PASS)" },
];

// As Ask Intercept Live shows them (Oct 31, 2026): names only.
const namesOnly: ChatCommand[] = commands.map(({ name }) => ({ name }));

const meta = {
	title: "Forms/Chat Composer",
	component: ChatComposer,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	args: {
		placeholder: "Ask a question or search",
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
 * A stand-in for the browser's speech recognition, so the story runs without a microphone: the play function says
 * what's "heard" through `FakeRecognition.current`.
 */
class FakeRecognition {
	static current: FakeRecognition | undefined;
	continuous = false;
	interimResults = false;
	lang = "";
	onresult: ((event: { resultIndex: number; results: unknown }) => void) | null = null;
	onerror: ((event: { error: string }) => void) | null = null;
	onend: (() => void) | null = null;
	start() {
		FakeRecognition.current = this;
	}
	abort() {
		if (FakeRecognition.current === this) FakeRecognition.current = undefined;
	}
	/** This run's results so far, each `[text, final]`. */
	hear(...results: [string, boolean][]) {
		this.onresult?.({
			resultIndex: 0,
			results: results.map(([transcript, isFinal]) => Object.assign([{ transcript }], { isFinal })),
		});
	}
}

/**
 * Built-in dictation (`dictation`): the microphone listens and writes what's heard into the field as it's said; while
 * it listens the button is Flat · Destructive with `mic-off`. It listens until the microphone is pressed again or "stop
 * listening" is said; sending (the button, or "send") and typing don't stop it. "Delete" removes the word before it. If
 * the microphone isn't allowed, a line under the field says so.
 */
export const Dictation: Story = {
	args: { dictation: true },
	beforeEach: () => {
		const speech = window as unknown as { SpeechRecognition?: unknown };
		const previous = speech.SpeechRecognition;
		speech.SpeechRecognition = FakeRecognition;
		return () => {
			speech.SpeechRecognition = previous;
			FakeRecognition.current = undefined;
		};
	},
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement);
		const field = canvas.getByRole("combobox", { name: "Ask Intercept Live" });

		await userEvent.click(canvas.getByRole("button", { name: "Dictate" }));
		const stop = canvas.getByRole("button", { name: "Stop dictating" });
		await expect(stop).toHaveAttribute("aria-pressed", "true");
		await expect(stop).toHaveAttribute("data-variant", "destructive-secondary");
		await expect(field).toHaveAttribute("placeholder", "Listening…");

		// What's being said shows at once, and is replaced as recognition settles on it.
		await waitFor(() => expect(FakeRecognition.current).toBeDefined());
		FakeRecognition.current?.hear(["what changed", false]);
		await waitFor(() => expect(field).toHaveValue("What changed"));
		// Settled with nothing more being said, a question shows its "?" (it goes again if the sentence carries on).
		FakeRecognition.current?.hear(["what changed in the last hour", true]);
		await waitFor(() => expect(field).toHaveValue("What changed in the last hour?"));

		// Spoken punctuation: "comma", "period" and "question mark" write the mark, a space after it; a period or question
		// mark starts a new sentence.
		FakeRecognition.current?.hear(
			["what changed in the last hour", true],
			["comma since midnight period is it worse question mark yes", false],
		);
		// A period that ends a question becomes "?".
		await waitFor(() => expect(field).toHaveValue("What changed in the last hour, since midnight? Is it worse? Yes"));
		FakeRecognition.current?.hear(["what changed in the last hour", true]);

		// Sending sends what was heard (a spoken question gets its "?") and goes on listening, from scratch.
		const said: [string, boolean][] = [["what changed in the last hour", true]];
		const hear = (...more: [string, boolean][]) => FakeRecognition.current?.hear(...said, ...more);
		await userEvent.click(canvas.getByRole("button", { name: "Send" }));
		await expect(args.onSubmit).toHaveBeenCalledWith("What changed in the last hour?");
		await expect(field).toHaveValue("");
		await expect(canvas.getByRole("button", { name: "Stop dictating" })).toHaveAttribute("aria-pressed", "true");
		said.push(["labs for", true]);
		hear();
		await waitFor(() => expect(field).toHaveValue("Labs for"));

		// Typing doesn't stop it either: what's said next goes after what's typed.
		await userEvent.type(field, " Sarah");
		said.push(["Miller", true]);
		hear();
		await waitFor(() => expect(field).toHaveValue("Labs for Sarah Miller"));
		await expect(canvas.getByRole("button", { name: "Stop dictating" })).toHaveAttribute("aria-pressed", "true");

		// "Delete" removes the word before it, one per "delete", reaching into typed text once the dictated words are gone.
		hear(["delete delete", false]);
		await waitFor(() => expect(field).toHaveValue("Labs for"));

		// "Send" (or "Submit") as the last word sends, as the Send button does, without the word, once recognition settles
		// on it; dictation goes on.
		said.push(["delete delete", true]);
		await userEvent.clear(field);
		hear(["what is pending", true], ["send", false]);
		// The command never shows, even as a guess; it acts once recognition settles on it.
		await waitFor(() => expect(field).toHaveValue("What is pending"));
		await expect(args.onSubmit).not.toHaveBeenCalledWith(expect.stringMatching(/pending/i));
		// More words after it: it was part of the message after all.
		hear(["what is pending", true], ["send me", false]);
		await waitFor(() => expect(field).toHaveValue("What is pending send me"));
		said.push(["what is pending", true], ["send.", true]);
		hear();
		await waitFor(() => expect(args.onSubmit).toHaveBeenCalledWith("What is pending?"));
		await expect(field).toHaveValue("");
		await expect(canvas.getByRole("button", { name: "Stop dictating" })).toHaveAttribute("aria-pressed", "true");

		// "Stop listening" ends it, as the microphone does, without the words; a question gets its "?". Like "send", it never
		// shows while recognition is still guessing.
		hear(["does she have a fever stop", false]);
		await waitFor(() => expect(field).toHaveValue("Does she have a fever"));
		hear(["does she have a fever stop listening", false]);
		await expect(field).toHaveValue("Does she have a fever");
		await expect(canvas.getByRole("button", { name: "Stop dictating" })).toHaveAttribute("aria-pressed", "true");
		hear(["does she have a fever stop listening", true]);
		await waitFor(() => expect(field).toHaveValue("Does she have a fever?"));
		await expect(canvas.getByRole("button", { name: "Dictate" })).toHaveAttribute("aria-pressed", "false");

		// Stopped with the microphone, a request stays as said.
		await userEvent.clear(field);
		await userEvent.click(canvas.getByRole("button", { name: "Dictate" }));
		await waitFor(() => expect(FakeRecognition.current).toBeDefined());
		FakeRecognition.current?.hear(["show me her labs", true]);
		await waitFor(() => expect(field).toHaveValue("Show me her labs"));
		await userEvent.click(canvas.getByRole("button", { name: "Stop dictating" }));
		await expect(field).toHaveValue("Show me her labs");

		// The microphone blocked: dictation stops and says why.
		await userEvent.click(canvas.getByRole("button", { name: "Dictate" }));
		await waitFor(() => expect(FakeRecognition.current).toBeDefined());
		FakeRecognition.current?.onerror?.({ error: "not-allowed" });
		const note = await canvas.findByText("Allow the microphone to dictate.");
		await waitFor(() => expect(note).toBeVisible());
		await expect(canvas.getByRole("button", { name: "Dictate" })).toHaveAttribute("aria-pressed", "false");
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

/** Commands without descriptions, as Ask Intercept Live lists them: the menu shows the names alone. */
export const CommandNamesOnly: Story = {
	args: { commands: namesOnly },
	parameters: { layout: "padded" },
	render: (args) => (
		<div className='flex h-80 items-end justify-center'>
			<ChatComposer {...args} />
		</div>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await userEvent.type(canvas.getByRole("combobox", { name: "Ask Intercept Live" }), "/");
		const options = canvas.getAllByRole("option");
		await expect(options.map((option) => option.textContent)).toEqual(["/summarize", "/changes", "/labs", "/handoff"]);
	},
};

/** A command that acts on its own (`onSelect`, e.g. /clear): picking it runs it at once and leaves the field empty. */
export const CommandThatActs: Story = {
	args: { commands: [...namesOnly, { name: "clear", onSelect: fn() }] },
	parameters: { layout: "padded" },
	render: (args) => (
		<div className='flex h-80 items-end justify-center'>
			<ChatComposer {...args} />
		</div>
	),
	play: async ({ args, canvasElement }) => {
		const canvas = within(canvasElement);
		const field = canvas.getByRole("combobox", { name: "Ask Intercept Live" });
		await userEvent.type(field, "/cl");
		await userEvent.keyboard("{Enter}");
		await expect(args.commands?.at(-1)?.onSelect).toHaveBeenCalledOnce();
		await expect(field).toHaveValue("");
		await expect(args.onSubmit).not.toHaveBeenCalled();
	},
};

/**
 * A command's `hint` guides what to write next: once the command is picked ("/labs "), the hint shows after it in the
 * field, muted, and the field is described by it. It's gone as soon as something follows the command.
 */
export const CommandHint: Story = {
	args: { commands: namesOnly.map((command) => ({ ...command, hint: "Add a patient's name" })) },
	parameters: { layout: "padded" },
	render: (args) => (
		<div className='flex h-80 items-end justify-center'>
			<ChatComposer {...args} />
		</div>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const field = canvas.getByRole("combobox", { name: "Ask Intercept Live" });
		await userEvent.type(field, "/la");
		await userEvent.keyboard("{Enter}");
		await expect(field).toHaveValue("/labs ");
		await expect(field).toHaveAccessibleDescription("Add a patient's name");
		await userEvent.type(field, "M");
		await expect(field).not.toHaveAccessibleDescription();
		await expect(canvas.queryByText("Add a patient's name")).not.toBeInTheDocument();
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

/**
 * Hands-free (`wakePhrase`; Ask Intercept Live used it until Nov 10, 2026, when the microphone became click-only because
 * it opens the microphone on mount): the composer listens for "Hey Intercept" only,
 * saying so in its placeholder; hearing it starts dictation, as the microphone would. Once dictation ends (the microphone,
 * or "stop listening"), it listens for the phrase again.
 */
export const WakePhrase: Story = {
	args: {
		dictation: true,
		onVoice: undefined,
		onDictate: undefined,
		wakePhrase: ["Hey Intercept", "Hey"],
		wakePlaceholder: 'Ask, search, or say "Hey Intercept"',
	},
	beforeEach: Dictation.beforeEach,
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement);
		const field = canvas.getByRole("combobox", { name: "Ask Intercept Live" });
		await expect(field).toHaveAttribute("placeholder", 'Ask, search, or say "Hey Intercept"');
		await waitFor(() => expect(FakeRecognition.current).toBeDefined());
		const wake = FakeRecognition.current;

		// Anything else is ignored: nothing shows, dictation doesn't start.
		wake?.hear(["what's the weather", false]);
		await expect(field).toHaveValue("");
		await expect(canvas.getByRole("button", { name: "Dictate" })).toHaveAttribute("aria-pressed", "false");

		// A phrase ("Hey Intercept", or just "Hey"), on recognition's first guess: dictation starts, on a recognition of its
		// own.
		wake?.hear(["what's the weather", true], ["hey", false]);
		await waitFor(() => expect(canvas.getByRole("button", { name: "Stop dictating" })).toHaveAttribute("aria-pressed", "true"));
		await expect(field).toHaveAttribute("placeholder", "Listening…");
		await waitFor(() => expect(FakeRecognition.current).not.toBe(wake));
		// "Hey" woke it before "Intercept" was said: that's the phrase's, not the message's. The rest is a question by its
		// structure ("Can you tell me…"), so it shows its "?" once recognition settles.
		FakeRecognition.current?.hear(["intercept can you tell me how is Emily doing", false]);
		await waitFor(() => expect(field).toHaveValue("Can you tell me how is Emily doing"));
		FakeRecognition.current?.hear(["intercept can you tell me how is Emily doing", true]);
		await waitFor(() => expect(field).toHaveValue("Can you tell me how is Emily doing?"));
		await userEvent.click(canvas.getByRole("button", { name: "Send" }));
		await expect(args.onSubmit).toHaveBeenCalledWith("Can you tell me how is Emily doing?");

		// A statement turned into a question by a tag, after a lead-in.
		FakeRecognition.current?.hear(
			["intercept can you tell me how is Emily doing", true],
			["okay so her lactate is down comma right", true],
		);
		await waitFor(() => expect(field).toHaveValue("Okay so her lactate is down, right?"));
		await userEvent.clear(field);

		// Dictation goes on after sending; ended with the microphone, it listens for the phrase again.
		await expect(field).toHaveAttribute("placeholder", "Listening…");
		await userEvent.click(canvas.getByRole("button", { name: "Stop dictating" }));
		await waitFor(() => expect(field).toHaveAttribute("placeholder", 'Ask, search, or say "Hey Intercept"'));
	},
};

/**
 * Without voice (Ask Intercept Live, Nov 6, 2026): nothing at the right end while the field is empty; Send slides in with
 * the first character, opening its own room (the microphone, when there is one, moves left), and leaves when the field
 * empties.
 */
export const SendOnly: Story = {
	args: { onAttach: undefined, onDictate: undefined, onVoice: undefined, commands: undefined },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const field = canvas.getByRole("textbox", { name: "Ask Intercept Live" });
		await expect(canvas.queryByRole("button", { name: "Send" })).toBeNull();
		await userEvent.type(field, "Labs");
		await expect(canvas.getByRole("button", { name: "Send" })).toBeEnabled();
		await userEvent.clear(field);
		await waitFor(() => expect(canvas.queryByRole("button", { name: "Send" })).toBeNull());
	},
};

/** As Ask Intercept Live has it: dictation, no voice. Send arrives with text, pushing the microphone left. */
export const DictationWithoutVoice: Story = {
	args: { onVoice: undefined, onDictate: undefined, dictation: true },
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
