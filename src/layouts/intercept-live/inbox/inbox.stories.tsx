import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, screen, waitFor, within } from "storybook/test";

import { sampleHospitals, sampleShift, sampleShiftEndsAt, sampleTeam, sampleUser } from "../sample-data/sample-workspace";
import { samplePatients } from "../sample-data/sample-census";
import { samplePatientRecords } from "../patient-details/sample-patient-details";
import { sampleMonitoringAlerts, sampleMonitoringPatients } from "../monitoring/sample-monitoring";
import { Inbox } from "./inbox";
import { clearPrototypeLocation } from "../sample-data/prototype-links";
import { sampleInboxItems } from "./sample-inbox";

// The Inbox layout (`inbox.tsx`): Intercept Live's shell opened on Inbox. Its alerts are Monitoring's, so an alert
// acknowledged here is acknowledged on Monitoring too. Its content is `InboxPanel`.
const meta = {
	title: "Layouts/Intercept Live/Inbox",
	component: Inbox,
	parameters: {
		layout: "fullscreen",
	},
	beforeEach: () => clearPrototypeLocation({ onlyInTests: true }),
	args: {
		hospitals: sampleHospitals,
		patients: sampleMonitoringPatients,
		alerts: sampleMonitoringAlerts,
		onAlertAction: fn(),
		censusPatients: samplePatients,
		patientRecords: samplePatientRecords,
		user: sampleUser,
		shiftEndsAt: sampleShiftEndsAt,
		shift: sampleShift,
		team: sampleTeam,
		inbox: { items: sampleInboxItems, onItemAction: fn() },
	},
} satisfies Meta<typeof Inbox>;

export default meta;
type Story = StoryObj<typeof meta>;

const toDo = (canvas: ReturnType<typeof within>) => canvas.findByRole("table", { name: "To do" });

/**
 * Everything to act on, the most urgent first: alerts to acknowledge (Monitoring's own), the sepsis bundle's suggested
 * vasopressin, a progress note that didn't reach the EHR, AI Scribe drafts to sign and an item handed over from the
 * night shift. To do's count is red while anything critical waits.
 */
export const Default: Story = {
	play: async ({ canvas }) => {
		const table = within(await toDo(canvas));
		const rows = table.getAllByRole("row").slice(1);
		await expect(within(rows[0]).getByText("Critical alert")).toBeVisible();
		await expect(canvas.getByRole("tab", { name: /^To do, \d+ items, \d+ critical/ })).toBeVisible();
	},
};

/** Acknowledging an alert here acknowledges it everywhere: the layout gets the action, and the row moves to Done. */
export const AcknowledgeAnAlert: Story = {
	play: async ({ canvas, userEvent, args }) => {
		const table = within(await toDo(canvas));
		const [first] = table.getAllByRole("button", { name: "Acknowledge" });
		await userEvent.click(first);
		await expect(args.onAlertAction).toHaveBeenCalledWith(expect.any(String), { type: "acknowledge" });
		await userEvent.click(canvas.getByRole("tab", { name: "Done" }));
		await expect(await canvas.findByRole("table", { name: "Done" })).toBeVisible();
	},
};

/** Several at once: pick rows, then Mark done. */
export const MarkSeveralDone: Story = {
	play: async ({ canvas, userEvent, args }) => {
		const table = within(await toDo(canvas));
		await userEvent.click(table.getByRole("checkbox", { name: "Select Daily progress note" }));
		await userEvent.click(table.getByRole("checkbox", { name: "Select Follow up the 4 PM blood gas" }));
		const bar = within(await canvas.findByRole("region", { name: "Selected items" }));
		// The bar expands in (Expand), so wait for it.
		await waitFor(() => expect(bar.getByText("2 selected")).toBeVisible());
		await userEvent.click(bar.getByRole("button", { name: "Mark done" }));
		await expect(args.inbox?.onItemAction).toHaveBeenCalledWith("sign-lambert", "done");
		await expect(args.inbox?.onItemAction).toHaveBeenCalledWith("handoff-peterson", "done");
	},
};

/** Filter by kind: only the drafts to sign. */
export const ToSign: Story = {
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(await canvas.findByRole("button", { name: /^To sign/ }));
		const table = within(await toDo(canvas));
		await waitFor(() => expect(table.getAllByRole("row")).toHaveLength(3));
	},
};

/**
 * Unread, right after the search: only the new items, each with the blue dot, as many as the chip counts. It combines
 * with the kind chips, and Done has none.
 */
export const Unread: Story = {
	play: async ({ canvas, userEvent }) => {
		const chip = await canvas.findByRole("button", { name: /^Unread/ });
		const count = Number(chip.textContent?.match(/(\d+)$/)?.[1]);
		await expect(count).toBeGreaterThan(0);
		await userEvent.click(chip);
		const table = within(await toDo(canvas));
		await waitFor(() => expect(table.getAllByRole("row")).toHaveLength(count + 1));
		await expect(table.getAllByRole("img", { name: "New" })).toHaveLength(count);
		await userEvent.click(canvas.getByRole("tab", { name: /^Done/ }));
		await waitFor(() => expect(canvas.queryByRole("button", { name: /^Unread/ })).toBeNull());
	},
};

/** A suggested order declined from its row's menu leaves To do. */
export const DeclineAnOrder: Story = {
	play: async ({ canvas, userEvent, args }) => {
		const table = within(await toDo(canvas));
		await userEvent.click(table.getByRole("button", { name: "More for Furosemide 40 mg IV once" }));
		await userEvent.click(await screen.findByRole("menuitem", { name: "Decline order" }));
		await expect(args.inbox?.onItemAction).toHaveBeenCalledWith("order-furosemide", "decline");
	},
};

/** Nothing to do. */
export const AllCaughtUp: Story = {
	args: { alerts: [], inbox: { items: [] } },
	play: async ({ canvas }) => {
		await expect(await canvas.findByRole("heading", { name: "You're all caught up" })).toBeVisible();
	},
};
