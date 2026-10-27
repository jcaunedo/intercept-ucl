import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, screen, waitFor, within } from "storybook/test";

// Story-only helper, not part of the card's public API.
import { useLivePatients } from "@/components/cards/patient-monitoring-card/use-live-vitals";

import { sampleEscalationTargets, sampleMonitoringAlerts, sampleMonitoringPatients } from "../monitoring/sample-monitoring";
import { sampleHospitals, sampleShiftEndsAt, sampleTeam, sampleUser } from "../sample-data/sample-workspace";
import { useSampleLiveFeed, withFeedAlerts } from "../sample-data/use-sample-live-feed";
import { Census } from "./census";
import { samplePatients } from "./sample-census";

const meta = {
	title: "Layouts/Intercept Live/Census",
	component: Census,
	parameters: {
		layout: "fullscreen",
	},
	// The Monitoring page's monitors are live here too (`useLivePatients`).
	render: function Render(args) {
		return <Census {...args} monitoringPatients={useLivePatients(args.monitoringPatients ?? [])} />;
	},
	args: {
		hospitals: sampleHospitals,
		patients: samplePatients,
		monitoringPatients: sampleMonitoringPatients,
		alerts: sampleMonitoringAlerts,
		escalationTargets: sampleEscalationTargets,
		user: sampleUser,
		shiftEndsAt: sampleShiftEndsAt,
		team: sampleTeam,
		unreadMessages: 3,
		onOpenPatient: fn(),
		onPatientActions: fn(),
		onAlertAction: fn(),
		onOpenLiveFeed: fn(),
	},
} satisfies Meta<typeof Census>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Hospital tabs, the My patients chip and the quick views filter the grid; cards are sorted by alert severity.
 * The live feed plays as on Monitoring (PRD SV-081): after 2, 3, 5 or 10 s, in turn, an alert fires, changes severity
 * or resolves. The hospital bar says what changed ("Live feed: …"), the live feed panel's queue follows, and so do the
 * cards' alert pills (`withFeedAlerts`), so a card moves to its new place. Then it loops.
 */
export const Default: Story = {
	render: (args) => <LiveCensus {...args} />,
};

/** The same screen without the scripted feed: the sample as it starts, the cards' own alert pills, nothing changing. */
export const Static: Story = {};

/**
 * My patients: a chip like the quick views, off by default, so the grid starts with everyone. Pressed, it narrows the
 * grid to the user's own and the title reads "6 of 14 patients"; pressed again, everyone is back.
 */
export const MyPatients: Story = {
	play: async ({ canvas, userEvent }) => {
		const mine = samplePatients.filter((patient) => patient.mine).length;
		const chip = canvas.getByRole("button", { name: /^My patients/ });
		await expect(chip).toHaveAttribute("aria-pressed", "false");
		await expect(chip).toHaveTextContent(new RegExp(`·\\s*${mine}$`));
		await expect(canvas.getByRole("heading", { level: 1 })).toHaveTextContent(`${samplePatients.length} patients`);
		await userEvent.click(chip);
		await expect(chip).toHaveAttribute("aria-pressed", "true");
		await waitFor(() =>
			expect(canvas.getByRole("heading", { level: 1 })).toHaveTextContent(`${mine} of ${samplePatients.length} patients`),
		);
		await userEvent.click(chip);
		await waitFor(() => expect(canvas.getByRole("heading", { level: 1 })).not.toHaveTextContent(" of "));
	},
};

/**
 * The Sidebar's Ask Intercept Live opens the chat panel from the left, on any page: the page narrows beside it. Its
 * close button, Escape or Ask Intercept Live again closes it.
 */
export const AskIntercept: Story = {
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Ask Intercept Live" }));
		const panel = await canvas.findByRole("complementary", { name: "Ask Intercept Live" });
		await waitFor(() => expect(panel).toHaveStyle({ width: "400px" }));
		await userEvent.click(canvas.getByRole("button", { name: "Close Ask Intercept Live" }));
		await waitFor(() => expect(canvas.queryByRole("complementary", { name: "Ask Intercept Live" })).not.toBeInTheDocument());
		await userEvent.click(canvas.getByRole("button", { name: "Ask Intercept Live" }));
	},
};

/**
 * The hospital bar's Live feed opens the live feed panel right of the canvas, as on Monitoring: the triage queue of the
 * census's alerts, highest priority first. The grid drops a column for the room it takes; Live feed again closes it.
 */
export const LiveFeed: Story = {
	play: async ({ args, canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: /^Live feed/ }));
		const panel = await canvas.findByRole("complementary", { name: "Live feed" });
		await expect(args.onOpenLiveFeed).toHaveBeenCalled();
		const queue = within(panel);
		await userEvent.click(queue.getAllByRole("button", { name: "Acknowledge" })[0]);
		await expect(args.onAlertAction).toHaveBeenCalledWith("a2", { type: "acknowledge" });
		await expect(queue.getByText(/Acknowledged by you/)).toBeVisible();
	},
};

/** The Sidebar's Monitoring opens the Monitoring page: the same patients as live monitors. */
export const GoToMonitoring: Story = {
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Monitoring" }));
		await waitFor(() => expect(canvas.getByRole("group", { name: "Density" })).toBeVisible());
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

/** Plays the sample live feed into the Census: its alerts, the cards' pills from them, and the Monitoring page's values. */
function LiveCensus(props: React.ComponentProps<typeof Census>) {
	const { patients: monitoring, alerts, caption } = useSampleLiveFeed();
	const monitoringPatients = useLivePatients(monitoring);
	return (
		<Census
			{...props}
			patients={withFeedAlerts(props.patients, alerts)}
			monitoringPatients={monitoringPatients}
			alerts={alerts}
			liveFeed={caption}
		/>
	);
}
