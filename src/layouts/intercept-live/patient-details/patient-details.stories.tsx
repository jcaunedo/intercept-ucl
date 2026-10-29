import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";

// Story-only helper, not part of the card's public API.
import { useLivePatients } from "@/components/cards/patient-monitoring-card/use-live-vitals";

import { Census } from "../census/census";
import { samplePatients } from "../census/sample-census";
import { Monitoring } from "../monitoring/monitoring";
import { sampleEscalationTargets, sampleMonitoringAlerts, sampleMonitoringPatients } from "../monitoring/sample-monitoring";
import { sampleHospitals, sampleShiftEndsAt, sampleTeam, sampleUser } from "../sample-data/sample-workspace";
import { sampleAskIntercept } from "../sample-data/sample-ask-intercept";
import { sortOrderById } from "../shared/patient-panel";
import { samplePatientRecords } from "./sample-patient-details";

// The Census's grid as it starts (every patient, sorted by Alert), so the details step through it as from a card.
const censusOrder = [...samplePatients].sort(sortOrderById("alert").compare).map((patient) => patient.id);

const meta = {
	title: "Layouts/Intercept Live/Patient details",
	component: Census,
	parameters: {
		layout: "fullscreen",
	},
	// Opened over the Census, with live monitors (`useLivePatients`).
	render: function Render(args) {
		return <Census {...args} monitoringPatients={useLivePatients(args.monitoringPatients ?? [])} />;
	},
	args: {
		hospitals: sampleHospitals,
		patients: samplePatients,
		monitoringPatients: sampleMonitoringPatients,
		patientRecords: samplePatientRecords,
		alerts: sampleMonitoringAlerts,
		escalationTargets: sampleEscalationTargets,
		user: sampleUser,
		askIntercept: sampleAskIntercept,
		shiftEndsAt: sampleShiftEndsAt,
		team: sampleTeam,
		unreadMessages: 3,
		defaultPatient: { id: "p1", list: censusOrder },
		onOpenPatient: fn(),
		onPatientActions: fn(),
		onAlertAction: fn(),
		onOpenLiveFeed: fn(),
		onPatientDetailsAction: fn(),
	},
} satisfies Meta<typeof Census>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Sarah Miller, opened from the Census (Intercept-Live › Patient Details). The app header turns to its patient variant
 * ("← Census › Miller, Sarah") with Raise concern, Huddle team, Escalate, Theme and "…". The Patient Header shows her
 * photo, name and alert, acuity and its 24h change, demographics, MRN and location, then code status, allergy, isolation
 * and organ support, with Live Camera and Messages on the right. Line tabs: Overview (the AI brief, live
 * monitor, ventilator, infusions and key labs in the main column; her alerts, care team and encounter in the rail), then
 * Vitals, Chart, Timeline, Medications, Orders, Epic, Notes, Sepsis and Camera view. Every Census patient has the same
 * depth of data: go back and open another. Back returns to the Census as it was.
 */
export const Default: Story = {
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement);
		await expect(await canvas.findByRole("heading", { level: 1, name: "Miller, Sarah" })).toBeVisible();
		await expect(canvas.getByText("Allergy: Penicillin")).toBeVisible();

		// Actions are reported to the app.
		const actions = within(canvas.getByRole("group", { name: "Patient actions" }));
		await userEvent.click(actions.getByRole("button", { name: "Escalate" }));
		await expect(args.onPatientDetailsAction).toHaveBeenCalledWith("p1", "escalate");
		// Live Camera is on the Patient Header.
		await userEvent.click(canvas.getByRole("button", { name: "Live Camera" }));
		await expect(args.onPatientDetailsAction).toHaveBeenCalledWith("p1", "live-camera");
	},
};

/** The breadcrumb's back link returns to the Census as it was (PRD PD-AC-04). */
export const BackToCensus: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await canvas.findByRole("heading", { level: 1, name: "Miller, Sarah" });
		const breadcrumb = within(canvas.getByRole("navigation", { name: "Breadcrumb" }));
		await userEvent.click(breadcrumb.getByRole("button", { name: "Census" }));
		await expect(await canvas.findByRole("heading", { level: 1, name: /14 patients/ })).toBeVisible();
	},
};

/**
 * A patient whose record hasn't arrived (Anderson's, left out here): what the card and the monitor know. Code status and
 * allergies say they're unknown, never blank (PRD PD-011), and each section without data says so.
 */
export const WithoutRecord: Story = {
	args: {
		defaultPatient: { id: "p6", list: censusOrder },
		patientRecords: samplePatientRecords.filter((record) => record.id !== "p6"),
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(await canvas.findByText("Code status unknown")).toBeVisible();
		await expect(canvas.getByText("Allergies unknown")).toBeVisible();
		await expect(canvas.getByText("No ventilator data for this patient.")).toBeVisible();
	},
};

/** Opened from Monitoring: the breadcrumb goes back to Monitoring. */
export const FromMonitoring: Story = {
	render: function Render(args) {
		return (
			<Monitoring
				hospitals={args.hospitals}
				patients={useLivePatients(sampleMonitoringPatients)}
				censusPatients={args.patients}
				patientRecords={args.patientRecords}
				alerts={args.alerts}
				escalationTargets={args.escalationTargets}
				user={args.user}
				askIntercept={args.askIntercept}
				shiftEndsAt={args.shiftEndsAt}
				team={args.team}
				unreadMessages={args.unreadMessages}
				defaultPatient={{ id: "p1" }}
				onAlertAction={args.onAlertAction}
				onPatientDetailsAction={args.onPatientDetailsAction}
			/>
		);
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await canvas.findByRole("heading", { level: 1, name: "Miller, Sarah" });
		const breadcrumb = within(canvas.getByRole("navigation", { name: "Breadcrumb" }));
		await expect(breadcrumb.getByRole("button", { name: "Monitoring" })).toBeVisible();
	},
};
