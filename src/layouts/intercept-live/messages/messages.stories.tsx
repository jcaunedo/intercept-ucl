import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, screen, waitFor, within } from "storybook/test";

import { sampleHospitals, sampleShift, sampleShiftEndsAt, sampleTeam, sampleUser } from "../sample-data/sample-workspace";
import { sampleDraftQuickRequest } from "../sample-data/sample-quick-request-drafter";
import { sampleSavedQuickRequests } from "../sample-data/sample-quick-requests";
import { samplePatients } from "../sample-data/sample-census";
import { samplePatientRecords } from "../patient-details/sample-data/sample-patient-details";
import { sampleMonitoringAlerts, sampleMonitoringPatients } from "../monitoring/sample-data/sample-monitoring";
import { Messages } from "./messages";
import { clearPrototypeLocation } from "../sample-data/prototype-links";
import { sampleMessageConversations } from "./sample-data/sample-messages";

// The Messages layout (`messages.tsx`): Intercept Live's shell opened on Messages, so the Sidebar, the header and
// opening a patient are the app's. Its content is `MessagesPanel`.
const meta = {
	title: "Layouts/Intercept Live/Messages",
	component: Messages,
	parameters: {
		layout: "fullscreen",
	},
	beforeEach: () => clearPrototypeLocation({ onlyInTests: true }),
	args: {
		hospitals: sampleHospitals,
		patients: sampleMonitoringPatients,
		alerts: sampleMonitoringAlerts,
		censusPatients: samplePatients,
		patientRecords: samplePatientRecords,
		draftQuickRequest: sampleDraftQuickRequest,
		savedQuickRequests: sampleSavedQuickRequests,
		user: sampleUser,
		shiftEndsAt: sampleShiftEndsAt,
		shift: sampleShift,
		team: sampleTeam,
		unreadMessages: 3,
		messages: { conversations: sampleMessageConversations, onSendMessage: fn(), onNewConversation: fn() },
	},
} satisfies Meta<typeof Messages>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Every conversation, one per person and patient, newest first, from all four hospitals: each row leads with who wrote
 * (their role and hospital), then the last message, then the patient it's about when there is one, Urgent and the
 * unread count. The newest opens (and is read); who it's with and its patient are on the right from xl up.
 */
export const Default: Story = {
	play: async ({ canvas }) => {
		const conversations = within(await canvas.findByRole("region", { name: "Conversations" }));
		const first = within(conversations.getByRole("list")).getAllByRole("button")[0];
		await expect(first).toHaveAttribute("aria-current", "true");
		await expect(first).toHaveAccessibleName(/^Kelly Ortiz, RN, Urgent, About Miller, Sarah/);
		await expect(await canvas.findByRole("log", { name: "Messages with Kelly Ortiz, RN" })).toBeVisible();
	},
};

/**
 * One patient per conversation, never mixed: Kelly Ortiz writes about three patients, so she has three conversations,
 * each about one of them. The open one is about Sarah Miller alone; its patient can't be changed, and Emily Carter's
 * messages are in her own conversation.
 */
export const OnePatientPerConversation: Story = {
	play: async ({ canvas, userEvent }) => {
		const conversations = within(await canvas.findByRole("region", { name: "Conversations" }));
		const kelly = conversations.getAllByRole("button", { name: /^Kelly Ortiz, RN/ });
		await expect(kelly).toHaveLength(3);
		await expect(await canvas.findByRole("region", { name: "Conversation with Kelly Ortiz, RN about Sarah Miller" })).toBeVisible();
		const log = within(canvas.getByRole("log", { name: "Messages with Kelly Ortiz, RN" }));
		await expect(log.queryByText(/NIV mask/)).toBeNull();
		await expect(canvas.queryByRole("button", { name: "Change who the message is about" })).toBeNull();
		await expect(canvas.getByRole("combobox", { name: "Message Kelly Ortiz, RN" })).toHaveAttribute(
			"placeholder",
			"Message about Sarah Miller…",
		);
		await userEvent.click(conversations.getByRole("button", { name: /^Kelly Ortiz, RN, About Carter, Emily/ }));
		await expect(await canvas.findByRole("region", { name: "Conversation with Kelly Ortiz, RN about Emily Carter" })).toBeVisible();
		const emily = within(canvas.getByRole("log", { name: "Messages with Kelly Ortiz, RN" }));
		await expect(emily.getByText(/NIV mask/)).toBeVisible();
		await expect(emily.queryByText(/MAP 58/)).toBeNull();
	},
};

/** A conversation about no patient (Chadron's charge nurse): no patient bar, a plain message box. */
export const NoPatient: Story = {
	play: async ({ canvas, userEvent }) => {
		const conversations = within(await canvas.findByRole("region", { name: "Conversations" }));
		await userEvent.click(conversations.getByRole("button", { name: /^Nicole Bennett, RN, 2 unread/ }));
		const field = await canvas.findByRole("combobox", { name: "Message Nicole Bennett, RN" });
		await expect(field).toHaveAttribute("placeholder", "Send a message…");
		await expect(canvas.queryByRole("button", { name: "Change who the message is about" })).toBeNull();
	},
};

/** Opening an unread conversation reads it: its count leaves the row and the Unread tab. */
export const ReadAConversation: Story = {
	play: async ({ canvas, userEvent }) => {
		const conversations = within(await canvas.findByRole("region", { name: "Conversations" }));
		const row = conversations.getByRole("button", { name: /^Brittany Cole, RN, 3 unread/ });
		await userEvent.click(row);
		await waitFor(() => expect(row).toHaveAccessibleName(/^Brittany Cole, RN, About Peterson, Gary/));
		await expect(canvas.getByRole("log", { name: "Messages with Brittany Cole, RN" })).toBeVisible();
	},
};

/**
 * The Sidebar's Messages dot follows what's unread: reading the last unread conversation clears it, and the Unread tab
 * says "You're all caught up".
 */
export const ReadEverything: Story = {
	play: async ({ canvas, userEvent }) => {
		const conversations = within(await canvas.findByRole("region", { name: "Conversations" }));
		await expect(canvas.getByRole("button", { name: "Messages, Unread" })).toBeInTheDocument();
		for (const name of [/^Nicole Bennett, RN, 2 unread/, /^Kayla Brandt, RN, 1 unread/, /^Brittany Cole, RN, 3 unread/]) {
			await userEvent.click(conversations.getByRole("button", { name }));
		}
		await waitFor(() => expect(canvas.queryByRole("button", { name: "Messages, Unread" })).toBeNull());
		await expect(canvas.getByRole("button", { name: "Messages" })).toBeInTheDocument();
		await userEvent.click(canvas.getByRole("tab", { name: /^Unread/ }));
		await expect(await canvas.findByText("You're all caught up")).toBeVisible();
	},
};

/** Sending a message: it's about the conversation's patient, shows on the right, the app gets it, and the nurse answers (prototype only). */
export const SendAMessage: Story = {
	play: async ({ canvas, userEvent, args }) => {
		const field = await canvas.findByRole("combobox", { name: "Message Kelly Ortiz, RN" });
		await userEvent.type(field, "Start vasopressin 0.03{Enter}");
		await expect(args.messages?.onSendMessage).toHaveBeenCalledWith("c-kelly-ortiz-p1", "Start vasopressin 0.03", "p1");
		const log = within(canvas.getByRole("log", { name: "Messages with Kelly Ortiz, RN" }));
		// It rises in (Reveal), so wait for it.
		await waitFor(() => expect(log.getByText("Start vasopressin 0.03")).toBeVisible());
		await waitFor(() => expect(log.getByText(/is typing…/)).toBeVisible(), { timeout: 4000 });
	},
};

/** Urgent: only the conversations with an urgent clinical message, apart from routine chat. */
export const Urgent: Story = {
	args: { messages: { ...meta.args.messages, defaultTab: "urgent" } },
	play: async ({ canvas }) => {
		const conversations = within(await canvas.findByRole("region", { name: "Conversations" }));
		await expect(within(conversations.getByRole("list")).getAllByRole("button")).toHaveLength(2);
	},
};

/**
 * Filters (the icon right of the search): a popover with the Hospital group, each hospital with its conversations in the tab. Picking
 * one narrows the list and counts on the button. The square-pen button starts a conversation (shown with its handler).
 */
export const FilterByHospital: Story = {
	play: async ({ canvas, userEvent, args }) => {
		const conversations = within(await canvas.findByRole("region", { name: "Conversations" }));
		const rows = () => within(conversations.getByRole("list")).getAllByRole("button");
		const all = rows().length;
		await userEvent.click(conversations.getByRole("button", { name: /^Filters/ }));
		// A popover, not a sheet: it renders in a portal, outside the story's canvas, and stays open while picking.
		const menu = within(await screen.findByRole("menu"));
		await userEvent.click(menu.getByRole("menuitemcheckbox", { name: /Chadron Memorial/ }));
		await waitFor(() => expect(rows().length).toBeLessThan(all));
		await expect(menu.getByRole("menuitemcheckbox", { name: /Chadron Memorial/ })).toHaveAttribute("aria-checked", "true");
		await expect(screen.queryByRole("dialog", { name: "Filters" })).not.toBeInTheDocument();
		await userEvent.keyboard("{Escape}");
		await expect(conversations.getByRole("button", { name: /^Filters, 1/ })).toBeInTheDocument();
		await userEvent.click(conversations.getByRole("button", { name: "New conversation" }));
		await expect(args.messages?.onNewConversation).toHaveBeenCalled();
	},
};

/** No conversations at all. */
export const Empty: Story = {
	args: { messages: { conversations: [] } },
	play: async ({ canvas }) => {
		await expect(await canvas.findByRole("heading", { name: "No messages yet" })).toBeVisible();
	},
};

/**
 * The composer's + and /: a quick request writes itself into the field to finish and send; + picks a file, an image
 * sent as a photo and anything else as a file card with its name and size.
 */
export const QuickRequestsAndAttachments: Story = {
	play: async ({ canvas, userEvent }) => {
		const field = await canvas.findByRole("combobox", { name: "Message Kelly Ortiz, RN" });
		await userEvent.click(canvas.getByRole("button", { name: "Commands" }));
		await userEvent.click(await canvas.findByRole("option", { name: /^\/vitals/ }));
		await waitFor(() => expect(field).toHaveValue("Can you send a new set of vitals?"));
		await userEvent.clear(field);
		const picker = canvasElementFileInput(canvas.getByRole("log", { name: "Messages with Kelly Ortiz, RN" }));
		await userEvent.upload(picker, new File(["%PDF"], "Lactate trend.pdf", { type: "application/pdf" }));
		const log = within(canvas.getByRole("log", { name: "Messages with Kelly Ortiz, RN" }));
		await waitFor(() => expect(log.getByRole("link", { name: /Lactate trend\.pdf/ })).toBeVisible());
	},
};

/**
 * Add command, last in the commands menu: the clinician's own quick request. Typing "/sitrep" offers "Add command:
 * /sitrep", which opens the form with the name filled in; the message is required. Saved, the command is in the menu,
 * and picking it writes its message with the patient's first name filled in.
 */
export const AddCommand: Story = {
	play: async ({ canvas, userEvent }) => {
		const field = await canvas.findByRole("combobox", { name: "Message Kelly Ortiz, RN" });
		await userEvent.click(canvas.getByRole("button", { name: "Commands" }));
		await expect(await canvas.findByRole("option", { name: "Add command" })).toBeInTheDocument();
		await userEvent.type(field, "sitrep");
		await userEvent.click(await canvas.findByRole("option", { name: "Add command: /sitrep" }));
		const dialog = within(await screen.findByRole("dialog", { name: "Add command" }));
		await expect(dialog.getByLabelText("Command")).toHaveValue("sitrep");
		await userEvent.click(dialog.getByRole("button", { name: "Add command" }));
		await expect(dialog.getByText("Write the message it sends.")).toBeVisible();
		await userEvent.type(dialog.getByLabelText("Description"), "Ask for a situation update");
		await userEvent.type(dialog.getByLabelText("Message"), "Can you give me a quick update on {{first name}?");
		await userEvent.click(dialog.getByRole("button", { name: "Add command" }));
		await waitFor(() => expect(screen.queryByRole("dialog", { name: "Add command" })).not.toBeInTheDocument());
		await userEvent.type(field, "/sit");
		await userEvent.click(await canvas.findByRole("option", { name: /^\/sitrep Ask for a situation update/ }));
		await waitFor(() => expect(field).toHaveValue("Can you give me a quick update on Sarah?"));
	},
};

/**
 * A command with instructions drafts from context: Intercept reads the thread and the patient's chart (here Sarah
 * Miller's vitals since Kelly's last message, and her labs), Stop showing meanwhile, then writes the draft into the field
 * to review, marked as Intercept's. Nothing is sent on its own.
 */
export const CommandDraftsFromContext: Story = {
	play: async ({ canvas, userEvent, args }) => {
		const field = await canvas.findByRole("combobox", { name: "Message Kelly Ortiz, RN" });
		await userEvent.type(field, "/sitrep");
		await userEvent.click(await canvas.findByRole("option", { name: "Add command: /sitrep" }));
		const dialog = within(await screen.findByRole("dialog", { name: "Add command" }));
		await userEvent.type(dialog.getByLabelText("Message"), "Can you give me a quick update on {{first name}?");
		await userEvent.type(
			dialog.getByLabelText(/Instructions for Intercept/),
			"Mention the vitals that changed most since the nurse's last message, and the latest labs.",
		);
		await userEvent.click(dialog.getByRole("button", { name: "Add command" }));
		await waitFor(() => expect(screen.queryByRole("dialog", { name: "Add command" })).not.toBeInTheDocument());
		await userEvent.type(field, "/sitrep");
		await userEvent.keyboard("{Enter}");
		await expect(await canvas.findByText("Drafting /sitrep from the conversation and the chart…")).toBeVisible();
		await expect(canvas.getByRole("button", { name: /stop/i })).toBeInTheDocument();
		const value = () => (field as HTMLTextAreaElement).value;
		await waitFor(() => expect(value()).toMatch(/^Can you give me a quick update on Sarah\? I'm seeing /), { timeout: 3000 });
		await expect(value()).toContain("Latest labs: Lactate 4.1 (was 2.2)");
		await expect(canvas.getByText(/Drafted by Intercept/)).toBeVisible();
		await expect(args.messages?.onSendMessage).not.toHaveBeenCalled();
	},
};

/**
 * The clinician's saved commands (`savedQuickRequests`) follow the built-in ones, each with instructions and marked with
 * Intercept's AI mark (read "Drafted by Intercept"): /titrate drafts
 * Sarah Miller's current drips and their rate changes into the message, to review before sending.
 */
export const SavedCommands: Story = {
	play: async ({ canvas, userEvent }) => {
		const field = await canvas.findByRole("combobox", { name: "Message Kelly Ortiz, RN" });
		await userEvent.click(canvas.getByRole("button", { name: "Commands" }));
		for (const name of ["trend", "redraw", "titrate", "catchup", "safety"]) {
			await expect(await canvas.findByRole("option", { name: new RegExp(`^/${name} `) })).toBeInTheDocument();
		}
		// Saved commands draft, so each carries Intercept's AI mark, read "Drafted by Intercept"; built-in ones don't.
		await expect(canvas.getByRole("option", { name: /^\/titrate Drafted by Intercept / })).toBeInTheDocument();
		await expect(canvas.getByRole("option", { name: /^\/vitals / })).not.toHaveAccessibleName(/Drafted by Intercept/);
		await userEvent.click(canvas.getByRole("option", { name: /^\/titrate / }));
		const value = () => (field as HTMLTextAreaElement).value;
		await waitFor(() => expect(value()).toMatch(/^Before I change anything for Sarah, .* Currently on /), { timeout: 3000 });
		await expect(canvas.getByText(/Drafted by Intercept/)).toBeVisible();
	},
};

/** The thread's hidden file input, next to its composer. */
function canvasElementFileInput(log: HTMLElement) {
	const input = log.parentElement?.querySelector<HTMLInputElement>("input[type=file]");
	if (!input) throw new Error("No file input next to the thread");
	return input;
}

/**
 * The keyboard: Tab reaches the list once (the open conversation), then Down or Right opens the next one, Up or Left
 * the one before, Home and End the first and last; focus follows.
 */
export const ArrowKeys: Story = {
	play: async ({ canvas, userEvent }) => {
		const conversations = within(await canvas.findByRole("region", { name: "Conversations" }));
		const rows = () => within(conversations.getByRole("list")).getAllByRole("button");
		const [first, second] = rows();
		await expect(first).toHaveAttribute("tabindex", "0");
		await expect(second).toHaveAttribute("tabindex", "-1");
		first.focus();
		await userEvent.keyboard("{ArrowDown}");
		await waitFor(() => expect(rows()[1]).toHaveFocus());
		await expect(rows()[1]).toHaveAttribute("aria-current", "true");
		await userEvent.keyboard("{ArrowRight}");
		await waitFor(() => expect(rows()[2]).toHaveAttribute("aria-current", "true"));
		await userEvent.keyboard("{ArrowLeft}{ArrowUp}");
		await waitFor(() => expect(rows()[0]).toHaveFocus());
		await userEvent.keyboard("{End}");
		await waitFor(() => expect(rows().at(-1)).toHaveAttribute("aria-current", "true"));
	},
};

/**
 * The details column starts closed. From xl the patient bar opens it; below xl (the test browser is narrower) the column
 * can't show, so the bar opens the patient instead. Test: no column, and the bar isn't a toggle here.
 */
export const DetailsClosedByDefault: Story = {
	play: async ({ canvas, canvasElement }) => {
		await canvas.findByRole("log", { name: "Messages with Kelly Ortiz, RN" });
		await expect(canvasElement.querySelector("aside[aria-label='Patient details']")).toBeNull();
		const bar = canvasElement.querySelector("[data-slot='message-header-patient']");
		await expect(bar).not.toBeNull();
		await expect(bar).not.toHaveAttribute("aria-expanded");
	},
};

/**
 * A short clinical snapshot under the summary, to answer without leaving Messages: one line each for the vitals, oxygen,
 * infusions, abnormal labs and medications; the patient page has the rest. Who the conversation is with isn't repeated
 * (the header says it). Test: the snapshot names Sarah Miller's norepinephrine and lactate, and there's no From section.
 */
export const ClinicalSnapshot: Story = {
	args: { messages: { ...meta.args.messages, defaultDetailsOpen: true } },
	play: async ({ canvasElement }) => {
		await waitFor(() => expect(canvasElement.querySelector("aside[aria-label='Patient details']")).not.toBeNull());
		const details = within(canvasElement.querySelector<HTMLElement>("aside[aria-label='Patient details']")!);
		const snapshot = details.getByRole("region", { name: "Clinical snapshot", hidden: true });
		await expect(snapshot).toHaveTextContent(/Norepinephrine/);
		await expect(snapshot).toHaveTextContent(/Lactate 4\.1/);
		await expect(details.queryByRole("heading", { name: "From", hidden: true })).toBeNull();
	},
};

/**
 * The details column's edge resizes it, as the side panels' does (their `ResizeHandle`): drag, the arrow keys, Home and
 * End, and a double-click back to the breakpoints' width. Test: Home narrows it to 320px (a width of its own), and a
 * double-click drops that width. The column shows from xl, wider than the test browser, so the keys go to the handle
 * through the DOM.
 */
export const ResizeDetails: Story = {
	args: { messages: { ...meta.args.messages, defaultDetailsOpen: true } },
	play: async ({ canvasElement }) => {
		await waitFor(() => expect(canvasElement.querySelector("aside[aria-label='Patient details']")).not.toBeNull());
		const aside = canvasElement.querySelector<HTMLElement>("aside[aria-label='Patient details']")!;
		const handle = within(aside).getByRole("separator", { name: "Resize patient details", hidden: true });
		handle.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
		await waitFor(() => expect(handle).toHaveAttribute("aria-valuenow", "320"));
		await expect(aside.style.getPropertyValue("--details-width")).toBe("320px");
		handle.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
		await waitFor(() => expect(aside.style.getPropertyValue("--details-width")).toBe(""));
	},
};

/**
 * The patient's name in the details opens their page, as the alert modal's name does: underlined, an arrow after it.
 * Test: it's a button named "Miller, Sarah, open patient", and clicking it opens the patient's page.
 */
export const OpenPatientFromDetails: Story = {
	args: { messages: { ...meta.args.messages, defaultDetailsOpen: true } },
	play: async ({ canvas, canvasElement }) => {
		await waitFor(() => expect(canvasElement.querySelector("aside[aria-label='Patient details']")).not.toBeNull());
		const details = within(canvasElement.querySelector<HTMLElement>("aside[aria-label='Patient details']")!);
		const name = details.getByRole("button", { name: "Miller, Sarah, open patient", hidden: true });
		name.click();
		// The patient's page opens over Messages (which stays mounted, hidden) with its Reveal (1 s): a longer wait.
		const heading = await canvas.findByRole("heading", { level: 1, name: "Miller, Sarah" }, { timeout: 3000 });
		await waitFor(() => expect(heading).toBeVisible(), { timeout: 3000 });
	},
};

/**
 * The details column's flags are the Monitoring card's: 32px, each a popover with its details (what changed, what's
 * behind it). The column shows from xl, wider than the test browser, so this checks the wiring, not a click.
 */
export const PatientFlags: Story = {
	args: { messages: { ...meta.args.messages, defaultDetailsOpen: true } },
	play: async ({ canvasElement }) => {
		await waitFor(() => expect(canvasElement.querySelector("aside[aria-label='Patient details']")).not.toBeNull());
		const details = canvasElement.querySelector<HTMLElement>("aside[aria-label='Patient details']")!;
		const flag = within(details).getByRole("button", { name: /^Ventilated/, hidden: true });
		await expect(flag).toHaveAttribute("aria-expanded", "false");
	},
};

/**
 * Under the flags, a short summary of the patient: the AI brief with its sources and age (Sarah Miller's: MAP and
 * lactate), then code status and allergies. No Open patient or Ask button in the column.
 */
export const PatientSummary: Story = {
	args: { messages: { ...meta.args.messages, defaultDetailsOpen: true } },
	play: async ({ canvasElement }) => {
		await waitFor(() => expect(canvasElement.querySelector("aside[aria-label='Patient details']")).not.toBeNull());
		const details = within(canvasElement.querySelector<HTMLElement>("aside[aria-label='Patient details']")!);
		const summary = details.getByRole("region", { name: "Patient summary", hidden: true });
		await expect(summary).toHaveTextContent(/MAP has fallen/);
		await expect(summary).toHaveTextContent(/AI summary · 23 sources/);
		await expect(summary).toHaveTextContent(/Full code · Allergies: Penicillin · Droplet isolation/);
		await expect(details.queryAllByRole("button", { name: /Ask Intercept Live/i, hidden: true })).toHaveLength(0);
	},
};
