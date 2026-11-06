import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";

// Story-only helper, not part of the card's public API.
import { useLivePatients } from "@/components/cards/patient-monitoring-card/use-live-vitals";

import { samplePatientConsults } from "../alert-modal/sample-alert-modal";
import { Census } from "../census/census";
import { samplePatients, sampleScenario1ResolvedCensus } from "../census/sample-census";
import { Monitoring } from "../monitoring/monitoring";
import { sampleEscalationTargets, sampleMonitoringAlerts, sampleMonitoringPatients } from "../monitoring/sample-monitoring";
import { sampleHospitals, sampleShiftEndsAt, sampleTeam, sampleUser } from "../sample-data/sample-workspace";
import { sampleAskIntercept } from "../sample-data/sample-ask-intercept";
import { sortOrderById } from "../shared/patient-panel";
import { sampleScenario1Activity, sampleScenario1CarePlan } from "./sample-patient-activity";
import { samplePatientRecords } from "./sample-patient-details";
import { sampleScenario1ResolvedRecord } from "./sample-patient-records";
import { sampleScenario1ResolvedTimeline } from "./sections/sample-timeline";
import { sampleScenario1ResolvedVitals } from "./sections/sample-vitals";

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
		// Opened from the Census (the app opens on Monitoring).
		defaultPage: "Census",
		hospitals: sampleHospitals,
		patients: samplePatients,
		monitoringPatients: sampleMonitoringPatients,
		patientRecords: samplePatientRecords,
		patientConsults: samplePatientConsults({
			censusPatients: samplePatients,
			monitoringPatients: sampleMonitoringPatients,
			records: samplePatientRecords,
		}),
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
 * ("← Census › Miller, Sarah") with Video consult, Messages (3 unread) and "…" (Raise concern, Huddle team,
 * Escalate, then New note, Prepare handoff, Copy link), then her care team. The Patient Header shows her photo and name,
 * then MRN, sex and age, and location, then her flags (organ support, code status only when it limits care, allergy
 * and isolation, all outline). Line tabs: Overview (the AI brief, live monitor, ventilator, infusions and key labs in the main column; her alerts, care team and encounter in the rail), then
 * Vitals, Chart, Timeline, Medications, Orders, Epic, Notes, Sepsis and Camera view. Every Census patient has the same
 * depth of data: go back and open another. Back returns to the Census as it was.
 */
export const Default: Story = {
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement);
		await expect(await canvas.findByRole("heading", { level: 1, name: "Miller, Sarah" })).toBeVisible();
		await expect(canvas.getByText("Allergy: Penicillin")).toBeVisible();
		// The allergy tag opens the allergy list: reaction, severity and whether it's confirmed.
		await userEvent.click(canvas.getByRole("button", { name: /Allergy: Penicillin/ }));
		await expect(await within(document.body).findByText("Hives and lip swelling, moderate · confirmed")).toBeVisible();
		await userEvent.keyboard("{Escape}");

		// Actions are reported to the app. The patient's actions are in the app header's "…" menu.
		const actions = within(canvas.getByRole("group", { name: "Patient actions" }));
		await userEvent.click(actions.getByRole("button", { name: "More actions" }));
		await userEvent.click(await within(document.body).findByRole("menuitem", { name: "Escalate" }));
		await expect(args.onPatientDetailsAction).toHaveBeenCalledWith("p1", "escalate");
		// Video consult and Messages are in the app header's patient actions, with her care team after "…".
		await expect(actions.getByRole("button", { name: "Video consult" })).toBeVisible();
		await expect(actions.getByRole("button", { name: "Messages, 3 unread" })).toBeVisible();
		await expect(canvas.getByRole("button", { name: /^Care team: / })).toBeVisible();
	},
};

/**
 * Video consult and Messages (Intercept-Live `219:16129`): the app header's Video consult opens the call in a panel right
 * of the page and rings the bedside (Start notetaker in the panel's header), and turns into a pressed icon that ends the
 * call and closes it. Messages opens the thread with her nurse to its right, the three unread messages in it; its count
 * clears. Its filter narrows the thread by sender and to photos; × closes it.
 */
export const VideoConsultAndMessages: Story = {
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement);
		await canvas.findByRole("heading", { level: 1, name: "Miller, Sarah" });
		const actions = within(canvas.getByRole("group", { name: "Patient actions" }));

		await userEvent.click(actions.getByRole("button", { name: "Video consult" }));
		await expect(args.onPatientDetailsAction).toHaveBeenCalledWith("p1", "video-consult");
		const consult = within(await canvas.findByRole("complementary", { name: "Video consult" }));
		await expect(await consult.findByText(/^Calling /)).toBeVisible();
		await expect(consult.getByRole("button", { name: "Start notetaker" })).toBeDisabled();
		await expect(actions.getByRole("button", { name: "Close video consult" })).toHaveAttribute("aria-expanded", "true");

		await userEvent.click(actions.getByRole("button", { name: "Messages, 3 unread" }));
		await expect(args.onPatientDetailsAction).toHaveBeenCalledWith("p1", "messages");
		const messages = within(await canvas.findByRole("complementary", { name: "Messages" }));
		await expect(within(messages.getByRole("log")).getAllByRole("listitem")).toHaveLength(3);
		await expect(actions.getByRole("button", { name: "Close messages" })).toHaveAttribute("aria-expanded", "true");

		// The filter: Photos only leaves none of her nurse's three; Escape closes the menu, not the panel; Show all.
		await userEvent.click(messages.getByRole("button", { name: "Filter messages" }));
		await userEvent.click(await within(document.body).findByRole("menuitemcheckbox", { name: "Photos only" }));
		await expect(await messages.findByText("No messages match the filter")).toBeVisible();
		await userEvent.keyboard("{Escape}");
		await expect(canvas.getByRole("complementary", { name: "Messages" })).toBeVisible();
		await userEvent.click(messages.getByRole("button", { name: "Filter messages, filtered" }));
		await userEvent.click(await within(document.body).findByRole("menuitem", { name: "Show all" }));
		await waitFor(() => expect(within(messages.getByRole("log")).getAllByRole("listitem")).toHaveLength(3));

		// Closing both: the messages' ×, then the pressed Video consult, which ends the call.
		await userEvent.click(messages.getByRole("button", { name: "Close messages" }));
		await waitFor(() => expect(canvas.queryByRole("complementary", { name: "Messages" })).toBeNull());
		await expect(actions.getByRole("button", { name: "Messages" })).toBeVisible();
		await userEvent.click(actions.getByRole("button", { name: "Close video consult" }));
		await waitFor(() => expect(canvas.queryByRole("complementary", { name: "Video consult" })).toBeNull());
		await expect(actions.getByRole("button", { name: "Video consult" })).toBeVisible();
	},
};

/** The breadcrumb's back link returns to the Census as it was (PRD PD-AC-04). */
export const BackToCensus: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await canvas.findByRole("heading", { level: 1, name: "Miller, Sarah" });
		const breadcrumb = within(canvas.getByRole("navigation", { name: "Breadcrumb" }));
		await userEvent.click(breadcrumb.getByRole("button", { name: "Census" }));
		// The Census glides back in.
		const title = await canvas.findByRole("heading", { level: 1, name: /21 patients/ });
		await waitFor(() => expect(title).toBeVisible());
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

/**
 * Margaret Hayes after Scenario 1 (06:00): her page tracks what was done and decided. In the rail, under her alerts, the
 * Care plan (the CHF exacerbation pathway, co-signed, with the edited furosemide dose; Keeping at Chadron, both
 * checkpoints passed, Transfer avoided) and the latest Activity, with who and when; View on Timeline opens all of it on
 * the Timeline's events lane, beside her vitals. Her brief, score and vitals are at 06:00.
 */
export const CarePlanAndActivity: Story = {
	args: {
		patients: samplePatients.map((patient) => (patient.id === "p15" ? { ...patient, ...sampleScenario1ResolvedCensus } : patient)),
		patientRecords: samplePatientRecords.map((record) =>
			record.id === "p15"
				? {
						...record,
						...sampleScenario1ResolvedRecord(),
						vitals: sampleScenario1ResolvedVitals(),
						timeline: sampleScenario1ResolvedTimeline(),
						activity: sampleScenario1Activity,
						carePlan: sampleScenario1CarePlan,
					}
				: record,
		),
		defaultPatient: { id: "p15", list: censusOrder },
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await canvas.findByRole("heading", { level: 1, name: "Hayes, Margaret" });
		const plan = within(canvas.getByRole("region", { name: "Care plan" }));
		await expect(plan.getByText("Edited")).toBeVisible();
		await expect(plan.getByText("Keeping at Chadron")).toBeVisible();
		await expect(plan.getAllByText(/Passed/)).toHaveLength(2);
		await expect(plan.getByText("Transfer avoided")).toBeVisible();
		// The newest first: the resolution, then back through the night.
		const activity = within(canvas.getByRole("region", { name: "Activity" }));
		await expect(activity.getByText("Latest 5 of 12")).toBeVisible();
		await expect(activity.getAllByRole("listitem")[0]).toHaveTextContent("Transfer avoided");
		await userEvent.click(activity.getByRole("button", { name: "View on Timeline" }));
		await expect(canvas.getByRole("tab", { name: "Timeline" })).toHaveAttribute("aria-selected", "true");
	},
};
