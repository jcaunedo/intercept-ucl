import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, waitFor, within } from "storybook/test";

import { sampleHospitals, sampleShift, sampleShiftEndsAt, sampleTeam, sampleUser } from "../sample-data/sample-workspace";
import { samplePatients } from "../sample-data/sample-census";
import { samplePatientRecords } from "../patient-details/sample-patient-details";
import { sampleMonitoringAlerts, sampleMonitoringPatients } from "../monitoring/sample-monitoring";
import { Messages } from "./messages";
import { clearPrototypeLocation } from "../sample-data/prototype-links";
import { sampleMessageThreads } from "./sample-messages";

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
		messages: { threads: sampleMessageThreads, onSendMessage: fn() },
	},
} satisfies Meta<typeof Messages>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Every thread with the bedside, newest first, from all four hospitals: each with the patient, the last message, where
 * the patient is, Urgent and the unread count. The newest opens (and is read); the patient and who the thread is with
 * are on the right from xl up.
 */
export const Default: Story = {
	play: async ({ canvas }) => {
		const threads = within(await canvas.findByRole("region", { name: "Threads" }));
		const first = threads.getAllByRole("button")[0];
		await expect(first).toHaveAttribute("aria-current", "true");
		await expect(first).toHaveAccessibleName(/^Sarah Miller, Urgent/);
		await expect(await canvas.findByRole("log", { name: "Messages with Kelly Ortiz, RN" })).toBeVisible();
	},
};

/** Opening an unread thread reads it: its count leaves the row and the Unread tab. */
export const ReadAThread: Story = {
	play: async ({ canvas, userEvent }) => {
		const threads = within(await canvas.findByRole("region", { name: "Threads" }));
		const row = threads.getByRole("button", { name: /^Gary Peterson, 3 unread/ });
		await userEvent.click(row);
		await waitFor(() => expect(row).toHaveAccessibleName(/^Gary Peterson, You: |^Gary Peterson, Brittany Cole: /));
		await expect(canvas.getByRole("log", { name: /^Messages with / })).toBeVisible();
	},
};

/** Sending a message: it shows on the right, the app gets it, and the nurse answers (prototype only). */
export const SendAMessage: Story = {
	play: async ({ canvas, userEvent, args }) => {
		const field = await canvas.findByRole("textbox", { name: "Message Kelly Ortiz, RN" });
		await userEvent.type(field, "Start vasopressin 0.03{Enter}");
		await expect(args.messages?.onSendMessage).toHaveBeenCalledWith("p1", "Start vasopressin 0.03");
		const log = within(canvas.getByRole("log", { name: "Messages with Kelly Ortiz, RN" }));
		// It rises in (Reveal), so wait for it.
		await waitFor(() => expect(log.getByText("Start vasopressin 0.03")).toBeVisible());
		await waitFor(() => expect(log.getByText(/is typing…/)).toBeVisible(), { timeout: 4000 });
	},
};

/** Urgent: only the threads with an urgent clinical message, apart from routine chat. */
export const Urgent: Story = {
	args: { messages: { ...meta.args.messages, defaultTab: "urgent" } },
	play: async ({ canvas }) => {
		const threads = within(await canvas.findByRole("region", { name: "Threads" }));
		await expect(threads.getAllByRole("button")).toHaveLength(2);
	},
};

/** No threads at all. */
export const Empty: Story = {
	args: { messages: { threads: [] } },
	play: async ({ canvas }) => {
		await expect(await canvas.findByRole("heading", { name: "No messages yet" })).toBeVisible();
	},
};
