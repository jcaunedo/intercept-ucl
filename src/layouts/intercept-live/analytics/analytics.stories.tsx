import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, screen, waitFor, within } from "storybook/test";

import { sampleHospitals, sampleShift, sampleShiftEndsAt, sampleTeam, sampleUser } from "../sample-data/sample-workspace";
import { samplePatients } from "../sample-data/sample-census";
import { samplePatientRecords } from "../patient-details/sample-patient-details";
import { sampleMonitoringAlerts, sampleMonitoringPatients } from "../monitoring/sample-monitoring";
import { clearPrototypeLocation } from "../sample-data/prototype-links";
import { Analytics } from "./analytics";
import { sampleOutcomes } from "./sample-analytics";

// The Analytics layout (`analytics.tsx`): Intercept Live's shell opened on Analytics, the outcomes dashboard Scenario 6
// closes on. Its content is `AnalyticsPanel`; the month is synthetic, and its export says so.
const meta = {
	title: "Layouts/Intercept Live/Analytics",
	component: Analytics,
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
		analytics: { data: sampleOutcomes, onExport: fn() },
	},
} satisfies Meta<typeof Analytics>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The pilot's month against the baseline: four headline tiles, then Access, Quality and Affordability (with each
 * hospital's share), and the demo's scenarios the month includes. No Synthetic data badge (Nov 18, 2026).
 */
export const Default: Story = {
	play: async ({ canvas }) => {
		await expect(await canvas.findByRole("heading", { level: 1, name: "Outcomes" })).toBeVisible();
		await expect(canvas.queryByText("Synthetic data")).toBeNull();
		const tiles = within(canvas.getByRole("list", { name: "Headline outcomes" }));
		await expect(tiles.getAllByRole("listitem")).toHaveLength(4);
		await expect(tiles.getByText("6 min")).toBeVisible();
		await expect(canvas.getByRole("heading", { name: "Access" })).toBeVisible();
		await expect(canvas.getByRole("heading", { name: "By hospital" })).toBeVisible();
	},
};

/**
 * By payer: every metric's table shows each payer's pilot value and its change from that payer's own baseline. A site
 * measure (coverage hours) isn't a patient's, so it shows "—" there.
 */
export const ByPayer: Story = {
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(await canvas.findByRole("tab", { name: "By payer" }));
		// The overall tables fade out first, then the breakdown's fade in.
		await waitFor(() => expect(canvas.getAllByRole("columnheader", { name: "Uninsured" })[0]).toBeVisible(), { timeout: 5000 });
		// Once the overall tables are gone (they fade out first).
		await waitFor(() => expect(canvas.queryByRole("columnheader", { name: "Baseline" })).toBeNull(), { timeout: 5000 });
		const access = within(canvas.getByRole("table", { name: "Access" }));
		await expect(access.getAllByText(/A site measure/)).not.toHaveLength(0);
		await expect(canvas.queryByRole("heading", { name: "By hospital" })).toBeNull();
	},
};

/** By rurality: the same, by county rurality code. */
export const ByRurality: Story = {
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(await canvas.findByRole("tab", { name: "By rurality" }));
		await waitFor(() => expect(canvas.getAllByRole("columnheader", { name: "RUCC 9" })[0]).toBeVisible(), { timeout: 5000 });
		await waitFor(() => expect(canvas.queryByRole("columnheader", { name: "Baseline" })).toBeNull(), { timeout: 5000 });
		const quality = within(canvas.getByRole("table", { name: "Quality" }));
		await expect(quality.getByRole("columnheader", { name: "RUCC 9" })).toBeVisible();
	},
};

/** Export quarterly report: one click builds the DHHS report and the milestone evidence pack, each a CSV to download. */
export const ExportReport: Story = {
	play: async ({ canvas, userEvent, args }) => {
		await userEvent.click(await canvas.findByRole("button", { name: "Export quarterly report" }));
		await expect(args.analytics.onExport).toHaveBeenCalled();
		const dialog = within(await screen.findByRole("dialog", { name: "Quarterly report" }));
		await waitFor(() => expect(dialog.getByRole("button", { name: "Download Q4 2026 DHHS quarterly report" })).toBeVisible(), {
			timeout: 3000,
		});
		await expect(dialog.getByRole("button", { name: "Download Milestone 2 evidence pack" })).toBeVisible();
	},
};
