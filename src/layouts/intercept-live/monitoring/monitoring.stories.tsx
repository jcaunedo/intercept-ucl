import type { Meta, StoryObj } from "@storybook/react-vite";

// Story-only helper, not part of the card's public API.
import { useLivePatients } from "@/components/cards/patient-monitoring-card/use-live-vitals";
import { expect, fn, screen, waitFor, within } from "storybook/test";

import { samplePatients } from "../census/sample-census";
import { samplePatientRecords } from "../patient-details/sample-patient-details";
import { sampleHospitals, sampleShiftEndsAt, sampleTeam, sampleUser } from "../sample-data/sample-workspace";
import { sampleAskIntercept } from "../sample-data/sample-ask-intercept";
import { useSampleLiveFeed, withFeedAlerts } from "../sample-data/use-sample-live-feed";
import { Monitoring, type MonitoringProps } from "./monitoring";
import { sampleEscalationTargets, sampleMonitoringAlerts, sampleMonitoringPatients } from "./sample-monitoring";

const meta = {
	title: "Layouts/Intercept Live/Monitoring",
	component: Monitoring,
	parameters: {
		layout: "fullscreen",
	},
	// The monitors are live in every story: the numbers vary as on a bedside monitor (`useLivePatients`), without
	// crossing an alarm limit, so tags, filters and tests stay put.
	render: function Render(args) {
		return <Monitoring {...args} patients={useLivePatients(args.patients)} />;
	},
	args: {
		hospitals: sampleHospitals,
		patients: sampleMonitoringPatients,
		alerts: sampleMonitoringAlerts,
		escalationTargets: sampleEscalationTargets,
		onAlertAction: fn(),
		censusPatients: samplePatients,
		patientRecords: samplePatientRecords,
		onPatientDetailsAction: fn(),
		user: sampleUser,
		askIntercept: sampleAskIntercept,
		shiftEndsAt: sampleShiftEndsAt,
		team: sampleTeam,
		unreadMessages: 3,
		onOpenPatient: fn(),
		onPatientActions: fn(),
		onOpenLiveFeed: fn(),
	},
} satisfies Meta<typeof Monitoring>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Opens the live feed panel (the triage queue) from the hospital bar and returns it to query. */
async function openLiveFeed(
	canvas: ReturnType<typeof within>,
	userEvent: { click: (element: Element) => Promise<void> },
) {
	await userEvent.click(canvas.getByRole("button", { name: /^Live feed/ }));
	return within(await canvas.findByRole("complementary", { name: "Live feed" }));
}

/**
 * The screen with a simulated live feed (PRD SV-081): at 1.5 s, at 8 s, then every 15 to 30 s, a patient's vitals and
 * alerts change; an alert's severity goes up or down (a Medium becomes High, a Critical eases to Medium), a new one
 * fires, another resolves. Sorted by Alert, the cards move to their new place (Reorder motion) at the panel's next
 * re-sort (2 s after the page opens, then every 15 to 30 s; a resolve moves its card at once, after a moment saying
 * "Resolved"), highest severity first, and the triage queue reorders right away; the hospital bar says what changed ("Live feed: …", the page's `liveFeed`). Then it loops. The hospital tabs, the patients pill and
 * Unit narrow the panel's scope; the queue always shows every alert on it.
 * ⚠️ Cards moving on their own is what PRD SV-013 rules out ("Panel order changed · Update"); this shows the live
 * alternative for comparison (SV-OD-05).
 */
export const Default: Story = {
	render: (args) => <LiveMonitoring {...args} />,
};

/** The same screen without the scripted feed: the sample as it starts, alerts unchanged, the monitors still live. */
export const Static: Story = {};

/**
 * Values outside their alarm limits are tagged ↑ / ↓ by their label, in place, alert or not: Moore's and Clark's
 * pressures have drifted without one. There's no "Outside limits" filter; the panel stays whole.
 */
export const OutsideLimits: Story = {
	play: async ({ canvas }) => {
		const moore = within(canvas.getByRole("region", { name: "Bedside monitor, Moore, Patricia" }));
		await expect(moore.getByText(/below alarm limits/)).toBeInTheDocument();
		const clark = within(canvas.getByRole("region", { name: "Bedside monitor, Clark, Jennifer" }));
		await expect(clark.getByText(/above alarm limits/)).toBeInTheDocument();
	},
};

/** Full monitors (the monitor-view buttons): every card shows all four waveform lanes, with their alarm limits. */
export const FullMonitors: Story = {
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Full monitors" }));
		await waitFor(() =>
			expect(canvas.getAllByRole("button", { name: "Show condensed monitor" })).toHaveLength(sampleMonitoringPatients.length),
		);
	},
};

/** No patients on the panel: the summary reads 0 and an empty state explains what will appear. */
export const Empty: Story = {
	args: { patients: [] },
};

/** A unit with nobody in it (Trauma ICU): an empty state with Clear filters, which brings every patient back. */
export const NoMatches: Story = {
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("combobox", { name: "Unit" }));
		await userEvent.click(await screen.findByRole("option", { name: "Trauma ICU" }));
		// The empty state Reveals in (opacity 0 → 1), so wait for it to finish appearing.
		await waitFor(() => expect(canvas.getByText("No patients match these filters")).toBeVisible());
	},
};

/** Acknowledging the queue's first alert: it stays in the queue, marked with who and when, and Miller's ring stops pulsing. */
export const AcknowledgeAlert: Story = {
	play: async ({ args, canvas, userEvent }) => {
		const queue = await openLiveFeed(canvas, userEvent);
		await userEvent.click(queue.getAllByRole("button", { name: "Acknowledge" })[0]);
		await expect(args.onAlertAction).toHaveBeenCalledWith("a1", { type: "acknowledge" });
		await expect(queue.getByText(/Acknowledged by you/)).toBeVisible();
	},
};

/** Escalating Johnson's SpO₂ alert to the intensivist on call. */
export const EscalateAlert: Story = {
	play: async ({ canvas, userEvent }) => {
		const queue = await openLiveFeed(canvas, userEvent);
		const row = within(queue.getByText("SpO₂ below 88% for 5 min").closest("li") as HTMLElement);
		await userEvent.click(row.getByRole("button", { name: "Escalate" }));
		await userEvent.type(row.getByRole("textbox", { name: "Note (optional)" }), "Desaturating on FiO₂ 70%");
		await userEvent.click(row.getByRole("button", { name: "Escalate" }));
		await expect(row.getByText(/Escalated to James Tan by you/)).toBeVisible();
	},
};

/** Resolving needs a reason. The alert leaves Active for Resolved, and Anderson's card loses its pill. */
export const ResolveAlert: Story = {
	play: async ({ canvas, userEvent }) => {
		const queue = await openLiveFeed(canvas, userEvent);
		const row = within(queue.getByText("Bed exit alarm").closest("li") as HTMLElement);
		await userEvent.click(row.getByRole("button", { name: "Resolve" }));
		await expect(row.getByRole("button", { name: "Resolve alert" })).toBeDisabled();
		await userEvent.click(row.getByRole("radio", { name: "Artifact or false alarm" }));
		await userEvent.click(row.getByRole("button", { name: "Resolve alert" }));
		await waitFor(() => expect(queue.queryByText("Bed exit alarm")).not.toBeInTheDocument());
		await userEvent.click(queue.getByRole("tab", { name: /Resolved/ }));
		await expect(await queue.findByText(/Resolved by you · .* · Artifact or false alarm/)).toBeVisible();
	},
};

/** No alerts on the panel: the queue says so, and no card has a pill. */
export const EmptyQueue: Story = {
	args: { alerts: [] },
	play: async ({ canvas, userEvent }) => {
		const queue = await openLiveFeed(canvas, userEvent);
		await expect(queue.getByText("No active alerts")).toBeVisible();
	},
};

/**
 * The live feed panel: "Live feed" in the hospital bar opens the triage queue right of the canvas, like the chat on
 * the left; it resizes from its left edge, and its close button, Escape inside it or the link again closes it.
 */
export const LiveFeedPanel: Story = {
	play: async ({ canvas, userEvent }) => {
		const link = canvas.getByRole("button", { name: /^Live feed/ });
		await expect(link).toHaveAttribute("aria-expanded", "false");
		const panel = await openLiveFeed(canvas, userEvent);
		await expect(link).toHaveAttribute("aria-expanded", "true");
		await expect(panel.getByRole("tab", { name: /Active/ })).toHaveTextContent("3");
		await expect(panel.getByRole("separator", { name: "Resize Live feed" })).toBeInTheDocument();
		await userEvent.click(panel.getByRole("button", { name: "Close Live feed" }));
		await waitFor(() => expect(canvas.queryByRole("complementary", { name: "Live feed" })).not.toBeInTheDocument());
		// The link toggles it too.
		await openLiveFeed(canvas, userEvent);
		await userEvent.click(link);
		await waitFor(() => expect(canvas.queryByRole("complementary", { name: "Live feed" })).not.toBeInTheDocument());
	},
};

/** Compact density: smaller cards, five a row at 1728. */
export const Compact: Story = {
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Compact" }));
		await waitFor(() => expect(canvas.getAllByRole("article")[0]).toHaveAttribute("data-size", "sm"));
	},
};

/** List density: one row per patient, the primary numerics as columns, marked when outside their limits. */
export const List: Story = {
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "List" }));
		const table = within(await canvas.findByRole("table"));
		await expect(table.getAllByRole("row")).toHaveLength(sampleMonitoringPatients.length + 1);
		await expect(table.getByRole("button", { name: "Miller, Sarah" })).toBeVisible();
	},
};

/** 1 h trends: each card shows its numerics over their last hour instead of the ECG strip. */
export const Trends: Story = {
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "1 h trends" }));
		await waitFor(() => expect(canvas.queryByText("II")).not.toBeInTheDocument());
	},
};

/** 1 h trends in the full monitors: each lane is a parameter's last hour, and ECG strip switches back to waveforms. */
export const FullTrends: Story = {
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Full monitors" }));
		await userEvent.click(canvas.getByRole("button", { name: "1 h trends" }));
		await waitFor(() => expect(canvas.getAllByText("HR · 1 h")).toHaveLength(sampleMonitoringPatients.length));
		await userEvent.click(canvas.getByRole("button", { name: "ECG strip" }));
		await waitFor(() => expect(canvas.queryByText("HR · 1 h")).not.toBeInTheDocument());
		await expect(canvas.getAllByText("Pleth")).toHaveLength(sampleMonitoringPatients.length);
	},
};

/**
 * The Outside limits filter keeps the patients outside their alarm limits when it's pressed: Miller, Johnson, Walker,
 * Moore and Clark. Membership holds while readings move; pressing it again shows everyone.
 */
export const OutsideLimitsFilter: Story = {
	play: async ({ canvas, userEvent }) => {
		const chip = canvas.getByRole("button", { name: /Outside limits/ });
		await expect(chip).toHaveTextContent(/Outside limits\s*·\s*5/);
		await userEvent.click(chip);
		await waitFor(() => expect(canvas.getAllByRole("article")).toHaveLength(5));
		await userEvent.click(chip);
		await waitFor(() => expect(canvas.getAllByRole("article")).toHaveLength(sampleMonitoringPatients.length));
	},
};

function LiveMonitoring(props: MonitoringProps) {
	const { patients: fed, alerts, caption } = useSampleLiveFeed();
	const patients = useLivePatients(fed);
	// What the feed just changed shows at the right of the hospital bar. The Census page (Sidebar) follows the same feed.
	return (
		<Monitoring
			{...props}
			patients={patients}
			alerts={alerts}
			liveFeed={caption}
			censusPatients={props.censusPatients && withFeedAlerts(props.censusPatients, alerts)}
		/>
	);
}
