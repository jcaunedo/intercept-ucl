import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, screen, waitFor } from "storybook/test";

import { sampleMonitoringPatients } from "../monitoring/sample-monitoring";
import { sampleHospitals, sampleTeam, sampleUser } from "../sample-data/sample-workspace";
import { Census } from "./census";
import { samplePatients } from "./sample-census";

const meta = {
	title: "Layouts/Intercept Live/Census",
	component: Census,
	parameters: {
		layout: "fullscreen",
	},
	args: {
		hospitals: sampleHospitals,
		patients: samplePatients,
		monitoringPatients: sampleMonitoringPatients,
		user: sampleUser,
		team: sampleTeam,
		unreadMessages: 3,
		onOpenPatient: fn(),
		onPatientActions: fn(),
	},
} satisfies Meta<typeof Census>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Hospital tabs, My Patients and the quick views filter the grid; cards are sorted by alert severity. */
export const Default: Story = {};

/** The Sidebar's Monitoring opens the Monitoring page: the same patients as live monitors. */
export const GoToMonitoring: Story = {
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Monitoring" }));
		await waitFor(() => expect(canvas.getByRole("switch", { name: "Full monitors" })).toBeVisible());
	},
};

/** No patients at all: the title reads 0 and an empty state explains what will appear. */
export const Empty: Story = {
	args: { patients: [] },
};

/** Filters that match nobody (Data gap in OB-ICU): an empty state with Clear filters, which brings every patient back. */
export const NoMatches: Story = {
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: /Data gap/ }));
		await userEvent.click(canvas.getByRole("combobox", { name: "Unit" }));
		await userEvent.click(await screen.findByRole("option", { name: "OB-ICU" }));
		// The empty state Reveals in (opacity 0 → 1), so wait for it to finish appearing.
		await waitFor(() => expect(canvas.getByText("No patients match these filters")).toBeVisible());
	},
};

/** A page that isn't built yet (here Alert Queue): its title and an empty state. Every Sidebar page but Census has one. */
export const EmptyPage: Story = {
	args: { defaultPage: "Alert Queue" },
};
