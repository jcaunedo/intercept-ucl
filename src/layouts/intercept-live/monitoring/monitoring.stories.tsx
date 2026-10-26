import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, screen, waitFor } from "storybook/test";

import { samplePatients } from "../census/sample-census";
import { sampleHospitals, sampleTeam, sampleUser } from "../sample-data/sample-workspace";
import { Monitoring } from "./monitoring";
import { sampleMonitoringPatients } from "./sample-monitoring";

const meta = {
	title: "Layouts/Intercept Live/Monitoring",
	component: Monitoring,
	parameters: {
		layout: "fullscreen",
	},
	args: {
		hospitals: sampleHospitals,
		patients: sampleMonitoringPatients,
		censusPatients: samplePatients,
		user: sampleUser,
		team: sampleTeam,
		unreadMessages: 3,
		onOpenPatient: fn(),
		onPatientActions: fn(),
	},
} satisfies Meta<typeof Monitoring>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The panel as live monitors, worst alert first. Hospital tabs, the switches and the quick views filter it. */
export const Default: Story = {};

/** Outside limits: patients whose numerics have left their alarm limits, with or without an alert. */
export const OutsideLimits: Story = {
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: /Outside limits/ }));
		await waitFor(() => expect(canvas.getAllByRole("article")).toHaveLength(5));
	},
};

/** Full monitors: every card shows all four waveform lanes, with their alarm limits. */
export const FullMonitors: Story = {
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("switch", { name: "Full monitors" }));
		await waitFor(() =>
			expect(canvas.getAllByRole("button", { name: "Show condensed monitor" })).toHaveLength(sampleMonitoringPatients.length),
		);
	},
};

/** No patients on the panel: the summary reads 0 and an empty state explains what will appear. */
export const Empty: Story = {
	args: { patients: [] },
};

/** Filters that match nobody (Data gap in CCU): an empty state with Clear filters, which brings every patient back. */
export const NoMatches: Story = {
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: /Data gap/ }));
		await userEvent.click(canvas.getByRole("combobox", { name: "Unit" }));
		await userEvent.click(await screen.findByRole("option", { name: "CCU" }));
		// The empty state Reveals in (opacity 0 → 1), so wait for it to finish appearing.
		await waitFor(() => expect(canvas.getByText("No patients match these filters")).toBeVisible());
	},
};
