import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, waitFor, within } from "storybook/test";

import { sampleHospitals, sampleShift, sampleShiftEndsAt, sampleTeam, sampleUser } from "../sample-data/sample-workspace";
import { samplePatients } from "../sample-data/sample-census";
import { samplePatientRecords } from "../patient-details/sample-patient-details";
import { sampleMonitoringAlerts, sampleMonitoringPatients } from "../monitoring/sample-monitoring";
import { Messages } from "./messages";
import { clearPrototypeLocation } from "../sample-data/prototype-links";
import { sampleMessageConversations } from "./sample-messages";

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
		user: sampleUser,
		shiftEndsAt: sampleShiftEndsAt,
		shift: sampleShift,
		team: sampleTeam,
		unreadMessages: 3,
		messages: { conversations: sampleMessageConversations, onSendMessage: fn() },
	},
} satisfies Meta<typeof Messages>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Every conversation, one per person, newest first, from all four hospitals: each row leads with who wrote (their role
 * and hospital), then the last message, then the patient it's about when there is one, Urgent and the unread count. The
 * newest opens (and is read); who it's with and its patients are on the right from xl up.
 */
export const Default: Story = {
	play: async ({ canvas }) => {
		const conversations = within(await canvas.findByRole("region", { name: "Conversations" }));
		const first = conversations.getAllByRole("button")[0];
		await expect(first).toHaveAttribute("aria-current", "true");
		await expect(first).toHaveAccessibleName(/^Kelly Ortiz, RN, Urgent, About Sarah Miller/);
		await expect(await canvas.findByRole("log", { name: "Messages with Kelly Ortiz, RN" })).toBeVisible();
	},
};

/**
 * One conversation about three patients: Kelly Ortiz writes about William Harris, Emily Carter and Sarah Miller, each
 * change of patient marked in the thread. The next message is about Sarah Miller, the latest one's patient, until
 * another is picked.
 */
export const AcrossPatients: Story = {
	play: async ({ canvas, userEvent }) => {
		const log = within(await canvas.findByRole("log", { name: "Messages with Kelly Ortiz, RN" }));
		await expect(log.getByText(/^About William Harris/)).toBeVisible();
		await expect(log.getByText(/^About Emily Carter/)).toBeVisible();
		await expect(log.getByText(/^About Sarah Miller/)).toBeVisible();
		const field = canvas.getByRole("textbox", { name: "Message Kelly Ortiz, RN" });
		await expect(field).toHaveAttribute("placeholder", "Message about Sarah Miller…");
		await userEvent.click(canvas.getByRole("button", { name: "Change who the message is about" }));
		await userEvent.click(await within(document.body).findByRole("menuitem", { name: /^Emily Carter/ }));
		await waitFor(() => expect(field).toHaveAttribute("placeholder", "Message about Emily Carter…"));
	},
};

/** A conversation about no patient (Chadron's charge nurse): no patient bar, no marks, a plain message box. */
export const NoPatient: Story = {
	play: async ({ canvas, userEvent }) => {
		const conversations = within(await canvas.findByRole("region", { name: "Conversations" }));
		await userEvent.click(conversations.getByRole("button", { name: /^Nicole Bennett, RN, 2 unread/ }));
		const field = await canvas.findByRole("textbox", { name: "Message Nicole Bennett, RN" });
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
		await waitFor(() => expect(row).toHaveAccessibleName(/^Brittany Cole, RN, About Gary Peterson/));
		await expect(canvas.getByRole("log", { name: "Messages with Brittany Cole, RN" })).toBeVisible();
	},
};

/** Sending a message: it's about the patient picked, shows on the right, the app gets it, and the nurse answers (prototype only). */
export const SendAMessage: Story = {
	play: async ({ canvas, userEvent, args }) => {
		const field = await canvas.findByRole("textbox", { name: "Message Kelly Ortiz, RN" });
		await userEvent.type(field, "Start vasopressin 0.03{Enter}");
		await expect(args.messages?.onSendMessage).toHaveBeenCalledWith("c-kelly-ortiz", "Start vasopressin 0.03", "p1");
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
		await expect(conversations.getAllByRole("button")).toHaveLength(2);
	},
};

/** No conversations at all. */
export const Empty: Story = {
	args: { messages: { conversations: [] } },
	play: async ({ canvas }) => {
		await expect(await canvas.findByRole("heading", { name: "No messages yet" })).toBeVisible();
	},
};
