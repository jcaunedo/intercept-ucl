import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import type { MonitorVitals } from "@/components/cards/patient-monitoring-card";
import { expect, fn, screen, waitFor, within } from "storybook/test";

import { samplePatients } from "../census/sample-census";
import { sampleHospitals, sampleShiftEndsAt, sampleTeam, sampleUser } from "../sample-data/sample-workspace";
import { Monitoring, type MonitoringProps, type TriageAlert } from "./monitoring";
import { sampleLiveScenario } from "./sample-live-scenario";
import { sampleEscalationTargets, sampleMonitoringAlerts, sampleMonitoringPatients } from "./sample-monitoring";

const meta = {
	title: "Layouts/Intercept Live/Monitoring",
	component: Monitoring,
	parameters: {
		layout: "fullscreen",
	},
	args: {
		hospitals: sampleHospitals,
		patients: sampleMonitoringPatients,
		alerts: sampleMonitoringAlerts,
		escalationTargets: sampleEscalationTargets,
		onAlertAction: fn(),
		censusPatients: samplePatients,
		user: sampleUser,
		shiftEndsAt: sampleShiftEndsAt,
		team: sampleTeam,
		unreadMessages: 3,
		onOpenPatient: fn(),
		onPatientActions: fn(),
	},
} satisfies Meta<typeof Monitoring>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The screen with a simulated live feed (PRD SV-081): after 2, 3, 5 or 10 s, in turn, a patient's vitals and alerts
 * change; an alert's severity goes up or down (a Medium becomes High, a Critical eases to Medium), a new one fires,
 * another resolves. Sorted by Alert, the cards move to their new place (Reorder motion), highest severity first, and the
 * triage queue reorders with them; a caption says what changed. Then it loops. The hospital tabs, the patients pill and
 * Unit narrow the panel's scope; the queue always shows every alert on it.
 * ⚠️ Cards moving on their own is what PRD SV-013 rules out ("Panel order changed · Update"); this shows the live
 * alternative for comparison (SV-OD-05).
 */
export const Default: Story = {
	render: (args) => <LiveMonitoring {...args} />,
};

/** The same screen with the feed paused: the sample as it starts, nothing changing. */
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
		const queue = within(canvas.getByRole("complementary", { name: "Triage queue" }));
		await userEvent.click(queue.getAllByRole("button", { name: "Acknowledge" })[0]);
		await expect(args.onAlertAction).toHaveBeenCalledWith("a2", { type: "acknowledge" });
		await expect(queue.getByText(/Acknowledged by you/)).toBeVisible();
	},
};

/** Escalating Johnson's SpO₂ alert to the intensivist on call. */
export const EscalateAlert: Story = {
	play: async ({ canvas, userEvent }) => {
		const queue = within(canvas.getByRole("complementary", { name: "Triage queue" }));
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
		const queue = within(canvas.getByRole("complementary", { name: "Triage queue" }));
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
	play: async ({ canvas }) => {
		const queue = within(canvas.getByRole("complementary", { name: "Triage queue" }));
		await expect(queue.getByText("No active alerts")).toBeVisible();
	},
};

/** The queue collapsed to a slim rail with its active count; the panel takes the room. */
export const QueueCollapsed: Story = {
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Hide triage queue" }));
		await expect(canvas.getByRole("button", { name: "Show triage queue, 10 active alerts" })).toBeVisible();
	},
};

/** Compact density: smaller cards, four a row at 1728 with the queue open. */
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

// Seconds between feed changes, in turn: an uneven rhythm, as a real feed has, rather than a steady beat.
const liveFeedDelays = [2, 3, 5, 10];

/**
 * Plays `sampleLiveScenario` into the screen, one step after each delay in `liveFeedDelays` (2, 3, 5, 10 s, then again),
 * and starts over after the last step: vitals change, alerts change severity, fire and resolve. A resolved alert leaves
 * the queue (the feed resolved it, not the clinician).
 */
function useLiveFeed() {
	const [step, setStep] = React.useState(0);
	const [tick, setTick] = React.useState(0);
	const firedAt = React.useRef<Record<string, string>>({});

	React.useEffect(() => {
		const timer = window.setTimeout(() => {
			setStep((current) => (current + 1) % (sampleLiveScenario.length + 1));
			setTick((current) => current + 1);
		}, liveFeedDelays[tick % liveFeedDelays.length] * 1000);
		return () => window.clearTimeout(timer);
	}, [tick]);

	return React.useMemo(() => {
		if (step === 0) firedAt.current = {};
		const vitals: Record<string, Partial<MonitorVitals>> = {};
		const updates: Record<string, Partial<TriageAlert>> = {};
		const fired: TriageAlert[] = [];
		const resolved = new Set<string>();
		for (const live of sampleLiveScenario.slice(0, step)) {
			for (const [id, change] of Object.entries(live.vitals ?? {})) vitals[id] = { ...vitals[id], ...change };
			for (const [id, change] of Object.entries(live.update ?? {})) updates[id] = { ...updates[id], ...change };
			for (const alert of live.fire ?? []) {
				firedAt.current[alert.id] ??= new Date().toISOString();
				fired.push({ ...alert, firedAt: firedAt.current[alert.id] });
			}
			for (const id of live.resolve ?? []) resolved.add(id);
		}
		return {
			patients: sampleMonitoringPatients.map((patient) =>
				vitals[patient.id] ? { ...patient, vitals: { ...patient.vitals, ...vitals[patient.id] } } : patient,
			),
			alerts: [...sampleMonitoringAlerts, ...fired]
				.filter((alert) => !resolved.has(alert.id))
				.map((alert) => ({ ...alert, ...updates[alert.id] })),
			caption: step === 0 ? "Start of the shift" : sampleLiveScenario[step - 1].label,
		};
	}, [step]);
}

function LiveMonitoring(props: MonitoringProps) {
	const { patients, alerts, caption } = useLiveFeed();
	return (
		<>
			<Monitoring {...props} patients={patients} alerts={alerts} />
			{/* Story-only caption: what the feed just changed. */}
			<p className='fixed bottom-4 left-20 z-50 rounded-full bg-foreground px-3 py-1.5 text-sm font-medium text-background shadow-lg'>
				Live · {caption}
			</p>
		</>
	);
}
