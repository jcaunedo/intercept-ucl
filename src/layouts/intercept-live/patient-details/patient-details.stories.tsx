import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";

// Story-only helper, not part of the card's public API.
import { useLivePatients } from "@/components/data-display/patient-monitor/use-live-vitals";
import { scrollContainerOf } from "@/lib/motion";

import { sampleAlertDetails, samplePatientConsults } from "../alert-panel/sample-data/sample-alert-panel";
import { Patients } from "../patients/patients";
import { samplePatients, sampleScenario1ResolvedCensus } from "../sample-data/sample-census";
import { sampleDraftQuickRequest } from "../sample-data/sample-quick-request-drafter";
import { sampleSavedQuickRequests } from "../sample-data/sample-quick-requests";
import { Monitoring } from "../monitoring/monitoring";
import { sampleEscalationTargets, sampleMonitoringAlerts, sampleMonitoringPatients } from "../monitoring/sample-data/sample-monitoring";
import { sampleHospitals, sampleShift, sampleShiftEndsAt, sampleTeam, sampleUser } from "../sample-data/sample-workspace";
import { sampleAskIntercept } from "../sample-data/sample-ask-intercept";
import { sortOrderById } from "../shared/patient-panel";
import { sampleScenario1Activity, sampleScenario1CarePlan } from "./sample-data/sample-patient-activity";
import { samplePatientRecords } from "./sample-data/sample-patient-details";
import { sampleScenario1ResolvedRecord } from "./sample-data/sample-patient-records";
import { sampleScenario1ResolvedTimeline } from "./sample-data/sample-timeline";
import { sampleScenario1ResolvedVitals } from "./sample-data/sample-vitals";
import { withGlucose } from "./sample-data/sample-glucose";

// The Census's grid as it starts (every patient, sorted by Alert), so the details step through it as from a card.
const censusOrder = [...samplePatients].sort(sortOrderById("alert").compare).map((patient) => patient.id);

const meta = {
	title: "Layouts/Intercept Live/Patient details",
	component: Patients,
	parameters: {
		layout: "fullscreen",
	},
	// Opened over the Census, with live monitors (`useLivePatients`).
	render: function Render(args) {
		return <Patients {...args} monitoringPatients={useLivePatients(args.monitoringPatients ?? [])} />;
	},
	args: {
		// Opened from the Census (the app opens on Monitoring).
		defaultPage: "Patients",
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
		draftQuickRequest: sampleDraftQuickRequest,
		savedQuickRequests: sampleSavedQuickRequests,
		shiftEndsAt: sampleShiftEndsAt,
		shift: sampleShift,
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
 * ("← Census › Miller, Sarah") with Video consult, Messages (3 unread), "…" (Raise concern, Huddle team,
 * Escalate, then Admission note and Share patient link) and "+" (Create: New note, New order, New task, Request specialist, New referral, Start pathway, Log critical care time, Prepare handoff), then her care team. The Patient Header shows her photo and name,
 * then MRN, sex and age, and location, then her flags (organ support, code status only when it limits care, allergy
 * and isolation, all outline). Line tabs: Overview (the AI clinical summary across the top, then her clinical findings:
 * key labs, temperature, MAP and the ventilator; then cards: live monitoring, care plan, Up next, medications, oxygen and
 * infusions, recent orders, encounter and referrals; her alerts are in the Alerts panel, from View alerts), then
 * Timeline (every value on one time axis, each lane ending in its Previous and Now values), Labs, Chart, Care Plan, Sepsis, Medications, Orders, Notes, EMR and Live
 * Camera. Every Census patient has the same
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
 * The Timeline (Nov 24, 2026, Intercept-Live `311:8791`): a filter bar (search, a chip per lane group, the events shown,
 * 15 m to 24 h, chart or table), then the chart as a table: time columns over an events lane, each lane ending in an
 * earlier value (Previous: at the window's start, or wherever the pointer is on the chart, its header then that time)
 * beside its value now. Events are a letter on their kind's color; an alert is Monitoring's bell
 * in its severity's color, and an open one opens the alert. A sideways swipe over the plot or the table scrolls through
 * time (Now, by the window toggle, brings it back), and so do the arrow keys past the window's edge.
 */
export const Timeline: Story = {
	// The alerts' details, so a bell has an alert modal to open.
	args: {
		alertDetails: sampleAlertDetails({
			alerts: sampleMonitoringAlerts,
			censusPatients: samplePatients,
			monitoringPatients: sampleMonitoringPatients,
			records: samplePatientRecords,
		}),
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await canvas.findByRole("heading", { level: 1, name: "Miller, Sarah" });
		await userEvent.click(canvas.getByRole("tab", { name: "Timeline" }));
		// The tab is heavy (every lane drawn); under a full test run it can take more than a second.
		const chart = within(await canvas.findByRole("group", { name: /^Timeline chart/ }, { timeout: 5000 }));
		// The latest values are the chart's last two columns, no longer tiles over it.
		await expect(chart.getByText("Previous")).toBeInTheDocument();
		await expect(chart.getByText("Now")).toBeInTheDocument();
		await expect(canvas.queryByRole("heading", { name: "Latest values" })).toBeNull();
		await expect(chart.getByText("Last 12 h")).toBeInTheDocument();
		// The arrow keys move the crosshair: Previous reads it (its header the time), Now stays now.
		const chartGroup = canvas.getByRole("group", { name: /^Timeline chart/ });
		chartGroup.focus();
		await userEvent.keyboard("{ArrowLeft}");
		await expect(chart.queryByText("Previous")).toBeNull();
		await expect(chart.getByText("Now")).toBeInTheDocument();
		await userEvent.keyboard("{Escape}");
		await expect(chart.getByText("Previous")).toBeInTheDocument();

		// A chip shows its group's lanes alone; pressed again, every lane is back.
		const filters = within(canvas.getByRole("group", { name: "Timeline filters" }));
		const labs = filters.getByRole("button", { name: "Labs" });
		await userEvent.click(labs);
		await expect(labs).toHaveAttribute("aria-pressed", "true");
		await expect(chart.queryByText("HR")).toBeNull();
		await expect(chart.getByText("Lactate")).toBeInTheDocument();
		await userEvent.click(labs);
		await expect(chart.getByText("HR")).toBeInTheDocument();

		// The ICU's short windows.
		await userEvent.click(within(filters.getByRole("group", { name: "Time window" })).getByRole("button", { name: "15 m" }));
		await expect(chart.getByText("Last 15 min")).toBeInTheDocument();

		// A sideways swipe over the plot scrolls back in time: the corner shows the window's span and Now; an up-and-down
		// one leaves the window alone. Now brings it back. Past the window's left edge, the arrow keys scroll too.
		const plot = canvasElement.querySelector<HTMLElement>("[data-timeline-plot]")!;
		const swipe = (deltaX: number, deltaY = 0) =>
			plot.dispatchEvent(new WheelEvent("wheel", { deltaX, deltaY, bubbles: true, cancelable: true }));
		swipe(0, -400);
		await expect(chart.getByText("Last 15 min")).toBeInTheDocument();
		await expect(swipe(-400)).toBe(false);
		// Now sits by the window toggle, so it's there in the table view too.
		const backToNow = await filters.findByRole("button", { name: "Back to now" });
		await expect(chart.queryByText("Last 15 min")).toBeNull();
		await userEvent.click(backToNow);
		await expect(chart.getByText("Last 15 min")).toBeInTheDocument();
		await waitFor(() => expect(filters.queryByRole("button", { name: "Back to now" })).toBeNull());
		chartGroup.focus();
		await userEvent.keyboard("{Home}{ArrowLeft}");
		await userEvent.click(await filters.findByRole("button", { name: "Back to now" }));
		await waitFor(() => expect(filters.queryByRole("button", { name: "Back to now" })).toBeNull());
		await userEvent.click(within(filters.getByRole("group", { name: "Time window" })).getByRole("button", { name: "12 h" }));

		// Her open alert's bell opens the alert.
		await userEvent.click(chart.getByRole("button", { name: /Critical alert: Sepsis candidate\. Open alert$/ }));
		const alert = within(await within(document.body).findByRole("dialog"));
		// The modal fades in, so its heading turns visible a moment after it's there.
		const heading = await alert.findByRole("heading", { name: "Sepsis candidate" });
		await waitFor(() => expect(heading).toBeVisible());
		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(within(document.body).queryByRole("dialog")).toBeNull());

		// The table view lists the events with their kind.
		await userEvent.click(within(filters.getByRole("group", { name: "View" })).getByRole("button", { name: "Table" }));
		const events = within(await canvas.findByRole("table", { name: "Events, newest first." }));
		await expect(events.getAllByText("Critical alert").length).toBeGreaterThan(0);
		// A sideways swipe over the table scrolls back in time too, once the table can't scroll sideways itself.
		const values = canvasElement.querySelector<HTMLElement>("[data-timeline-table]")!;
		values.scrollLeft = 0;
		const firstTime = values.querySelector("tbody th")!.textContent;
		values.dispatchEvent(new WheelEvent("wheel", { deltaX: -2000, bubbles: true, cancelable: true }));
		await userEvent.click(await filters.findByRole("button", { name: "Back to now" }));
		await waitFor(() => expect(values.querySelector("tbody th")!.textContent).toBe(firstTime));
	},
};

/**
 * Live feed, right of the tabs as on Monitoring (Nov 11, 2026, user's call: it left the Patient Header), opens this
 * patient's feed beside the page: a log of everything that happened to her, newest first by day, her earlier alerts
 * included, not only alerts; × closes it.
 */
export const PatientLiveFeed: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await canvas.findByRole("heading", { level: 1, name: "Miller, Sarah" });
		// On a patient's page no Sidebar item is active (Nov 11, 2026, user's call).
		await expect(canvasElement.querySelector("[data-active][aria-current='page']")).toBeNull();
		const button = canvas.getByRole("button", { name: /^Live feed/ });
		await userEvent.click(button);
		const panel = within(await canvas.findByRole("complementary", { name: "Live feed" }));
		await expect(button).toHaveAttribute("aria-expanded", "true");
		const log = within(panel.getByRole("log", { name: "Live feed" }));
		await expect(log.getAllByRole("heading", { level: 3 })[0]).toHaveTextContent("Today");
		// Her history stays (the MAP alert 20 h ago), and it isn't only alerts: care, drips, labs and notes are there too.
		// It fired and was resolved: a line each.
		await expect(log.getByText(/^Low alert: MAP below 65 for 10 min|alert: MAP below 65 for 10 min$/)).toBeInTheDocument();
		await expect(log.getByText(/^Resolved: MAP below 65 for 10 min$/)).toBeInTheDocument();
		const kinds = log.getAllByRole("listitem").map((item) => item.textContent?.split(":")[0]);
		await expect(kinds.some((kind) => kind !== "Alert")).toBe(true);
		await expect(panel.queryByText(/Johnson, Daniel/)).toBeNull();
		// Its filter sits left of ×, as the Messages panel's.
		await expect(panel.getByRole("button", { name: "Filter live feed" })).toBeInTheDocument();
		await userEvent.click(panel.getByRole("button", { name: "Close live feed" }));
		await waitFor(() => expect(canvas.queryByRole("complementary", { name: "Live feed" })).toBeNull());
	},
};

/**
 * The header's alerts button ("2 active alerts") opens the Alerts panel (Nov 9, 2026, user's call): every alert of the
 * patient, the unresolved at the top, then the resolved; × closes it. Every alert stays (Nov 10, 2026, user's call): her
 * earlier ones, from her record's history, are listed with the resolved, grouped by the day they fired ("Yesterday",
 * "Sunday, Nov 8"). Each card's bottom padding matches its sides, 16px (Nov 11, 2026, user's call).
 */
export const ViewAlertsOpensPanel: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await canvas.findByRole("heading", { level: 1, name: "Miller, Sarah" });
		await userEvent.click(canvas.getByRole("button", { name: /^\d+ active alerts?$/ }));
		const panel = within(await canvas.findByRole("complementary", { name: "Alerts" }));
		await expect(panel.getByRole("region", { name: "Alerts" })).toBeInTheDocument();
		await expect(panel.queryByRole("button", { name: /Show resolved/ })).toBeNull();
		// Her history: the MAP alert 20 h ago and the sepsis candidate 52 h ago, under their days.
		await expect(panel.getByRole("heading", { name: "MAP below 65 for 10 min" })).toBeInTheDocument();
		await expect(panel.getByRole("heading", { name: "Lactate 4.1, fever, new infiltrate" })).toBeInTheDocument();
		await expect(panel.getAllByRole("heading", { level: 3 }).some((heading) => /^(Today|Yesterday)$/.test(heading.textContent ?? ""))).toBe(true);
		// Each card: as much room under its last line as beside it (16px), resolved ones included.
		for (const card of panel.getAllByRole("group")) {
			const content = card.lastElementChild as HTMLElement;
			const last = [...content.children].filter((child) => (child as HTMLElement).offsetHeight > 0).at(-1) as HTMLElement;
			const box = card.getBoundingClientRect();
			await expect(Math.round(box.bottom - last.getBoundingClientRect().bottom)).toBe(16);
			await expect(Math.round(last.getBoundingClientRect().left - box.left)).toBe(16);
			// A resolved alert's bar doesn't open it (no maximize icon); an open one's does (Nov 11, 2026, user's call).
			const resolved = /^Resolved/.test(card.firstElementChild?.textContent ?? "") || /Resolved ·/.test(card.textContent ?? "");
			const opens = within(card).queryAllByRole("button", { name: /^Open alert/ });
			if (resolved) await expect(opens).toHaveLength(0);
		}
		await expect(panel.queryAllByRole("button", { name: /^Open alert/ }).length).toBeGreaterThan(0);
		await userEvent.click(panel.getByRole("button", { name: "Close alerts" }));
		await waitFor(() => expect(canvas.queryByRole("complementary", { name: "Alerts" })).toBeNull());
	},
};

/**
 * The brief opens Ask Intercept Live (Nov 6, 2026): clicking it opens the chat about Sarah ("About Miller, Sarah") and
 * asks what's behind the brief. The answer leads with the brief, then her diagnosis, score, alerts, vitals, organ
 * support and flagged labs, then what changed since she was last looked at. Clicked again, it closes the chat.
 */
export const BriefOpensAsk: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await canvas.findByRole("heading", { level: 1, name: "Miller, Sarah" });
		await userEvent.click(within(canvas.getByRole("region", { name: "AI clinical summary" })).getByRole("button", { name: /Ask Intercept Live for more/ }));
		const chat = within(await canvas.findByRole("complementary", { name: "Ask Intercept Live" }));
		await expect(await chat.findByText("Summarize what's behind the brief")).toBeInTheDocument();
		await expect(await chat.findByText(/since you last looked/, {}, { timeout: 10000 })).toBeInTheDocument();
		// Clicked again while the chat is open about her, the brief closes it (Nov 25, 2026, user's call).
		await userEvent.click(within(canvas.getByRole("region", { name: "AI clinical summary" })).getByRole("button", { name: /Close Ask Intercept Live/ }));
		await waitFor(() => expect(canvas.queryByRole("complementary", { name: "Ask Intercept Live" })).toBeNull());
	},
};

/**
 * An Overview key lab opens its trend (Nov 25, 2026, user's call): clicking Sarah's Creatinine tile opens the Labs tab
 * with Creatinine alone on Lab trends, in Actual values.
 */
export const LabTileOpensTrend: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await userEvent.click(await canvas.findByRole("button", { name: "Creatinine, view trend" }));
		await expect(await canvas.findByRole("tab", { name: "Labs", selected: true })).toBeVisible();
		const legend = within(await canvas.findByRole("list", { name: "Tests on the chart" }));
		await expect(await legend.findByRole("button", { name: "Creatinine", pressed: true })).toBeVisible();
		await expect(legend.getByRole("button", { name: "Lactate", pressed: false })).toBeVisible();
		await expect(canvas.getByRole("button", { name: "Actual values" })).toHaveAttribute("aria-pressed", "true");
	},
};

/**
 * The Sidebar's Ask Intercept Live on a patient's page opens the chat about that patient (Nov 6, 2026, user's call): the
 * Miller, Sarah chip over the message box, her avatar leading it (Nov 11, 2026, user's call: in place of "About"),
 * without asking anything for the user.
 */
export const SidebarAskInPatientContext: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await canvas.findByRole("heading", { level: 1, name: "Miller, Sarah" });
		const sidebar = within(canvas.getByRole("navigation", { name: "Main" }));
		await userEvent.click(sidebar.getByRole("button", { name: "Ask Intercept Live" }));
		const chat = within(await canvas.findByRole("complementary", { name: "Ask Intercept Live" }));
		const remove = await chat.findByRole("button", { name: "Remove Miller, Sarah from the chat" });
		await expect(remove.parentElement?.querySelector("[data-slot='avatar']")).not.toBeNull();
		await expect(chat.queryByText("Quick overview")).toBeNull();
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

/**
 * The pathway on the patient's page (Nov 6, 2026): Sarah's open alert suggests a pathway, so her Care plan shows it
 * dashed, "Suggested", with Review pathway (the app header has no Pathway since Nov 9, 2026: it belongs to the alert).
 * Review pathway opens the alert panel's Pathway column as a panel right of the page, in Messages' place (Messages takes
 * it back, the Care plan brings it again), where she can edit a dose, accept or decline as on the alert. Accepting sends the orders for co-signature. × closes it.
 */
export const Pathway: Story = {
	args: {
		alertDetails: sampleAlertDetails({
			alerts: sampleMonitoringAlerts,
			censusPatients: samplePatients,
			monitoringPatients: sampleMonitoringPatients,
			records: samplePatientRecords,
		}),
		onPathwayDecision: fn(),
	},
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement);
		await canvas.findByRole("heading", { level: 1, name: "Miller, Sarah" });
		const overviewPlan = within(canvas.getByRole("region", { name: "Care plan" }));
		await expect(overviewPlan.getByText("Needs review")).toBeVisible();
		// The Overview's card has no way into the pathway (Nov 13, 2026); the Care Plan tab's pathway blocks do.
		await expect(overviewPlan.queryByRole("button", { name: /pathway/i })).toBeNull();
		await userEvent.click(canvas.getByRole("tab", { name: "Care Plan" }));
		const plan = within(await canvas.findByRole("tabpanel", { name: "Care Plan" }));
		const reviewPathway = async () => (await plan.findAllByRole("button", { name: "Review pathway" }))[0];

		// A suggested pathway's Review pathway opens the panel. The header has no Pathway: it belongs to the alert (Nov 9, 2026).
		await userEvent.click(await reviewPathway());
		await canvas.findByRole("complementary", { name: "Pathway" });
		const actions = within(canvas.getByRole("group", { name: "Patient actions" }));
		await expect(actions.queryByRole("button", { name: /pathway/i })).toBeNull();

		// Messages takes its place, and the Care plan brings Pathway back.
		await userEvent.click(actions.getByRole("button", { name: "Messages, 3 unread" }));
		await waitFor(() => expect(canvas.queryByRole("complementary", { name: "Pathway" })).toBeNull());
		await userEvent.click(await reviewPathway());
		await waitFor(() => expect(canvas.queryByRole("complementary", { name: "Messages" })).toBeNull());

		// Accept, as on the alert: the orders go for co-signature.
		const reopened = within(await canvas.findByRole("complementary", { name: "Pathway" }));
		await userEvent.click(await reopened.findByRole("button", { name: "Accept" }));
		// The banner expands in, so it's visible once it has.
		const sent = await reopened.findByText(/^Sent to .* for co-signature/);
		await waitFor(() => expect(sent).toBeVisible());
		await expect(args.onPathwayDecision).toHaveBeenCalled();

		await userEvent.click(reopened.getByRole("button", { name: "Close pathway" }));
		await waitFor(() => expect(canvas.queryByRole("complementary", { name: "Pathway" })).toBeNull());
	},
};

/**
 * The Alerts panel has no View pathway under an open alert's buttons (Nov 10, 2026, user's call, as on the alert
 * panel): the Care plan opens the pathway.
 */
export const AlertPathwayBesideAlerts: Story = {
	args: Pathway.args,
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await canvas.findByRole("heading", { level: 1, name: "Miller, Sarah" });
		await userEvent.click(canvas.getByRole("button", { name: /^\d+ active alerts?$/ }));
		const alertsPanel = await canvas.findByRole("complementary", { name: "Alerts" });
		await expect(within(alertsPanel).queryByRole("button", { name: /pathway/i })).toBeNull();
	},
};

/**
 * Three panels at once (Nov 9, 2026, user's call): the video consult, Alerts and Messages, in that order left to right.
 */
export const ThreePanels: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await canvas.findByRole("heading", { level: 1, name: "Miller, Sarah" });
		const actions = within(canvas.getByRole("group", { name: "Patient actions" }));
		await userEvent.click(actions.getByRole("button", { name: "Video consult" }));
		await userEvent.click(actions.getByRole("button", { name: "Messages, 3 unread" }));
		await userEvent.click(canvas.getByRole("button", { name: /^\d+ active alerts?$/ }));
		const consult = await canvas.findByRole("complementary", { name: "Video consult" });
		const alerts = await canvas.findByRole("complementary", { name: "Alerts" });
		const messages = await canvas.findByRole("complementary", { name: "Messages" });
		await waitFor(() => {
			expect(consult.getBoundingClientRect().left).toBeLessThan(alerts.getBoundingClientRect().left);
			expect(alerts.getBoundingClientRect().left).toBeLessThan(messages.getBoundingClientRect().left);
		});
	},
};

/** The breadcrumb's back link returns to the Census as it was (PRD PD-AC-04). */
export const BackToCensus: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await canvas.findByRole("heading", { level: 1, name: "Miller, Sarah" });
		const breadcrumb = within(canvas.getByRole("navigation", { name: "Breadcrumb" }));
		await userEvent.click(breadcrumb.getByRole("button", { name: "Patients" }));
		// Patients glides back in.
		const title = await canvas.findByRole("heading", { level: 1, name: /patients$/ });
		await waitFor(() => expect(title).toBeVisible());
	},
};

/**
 * Scrolling (PRD Patient details PD-016): scrolling down slides the app header up out of view and the Patient Header
 * sticks to the top of the canvas, with the shadow the app header has on other pages. Scrolling up, from anywhere,
 * brings the app header back and the Patient Header sticks right under it; scrolling down again hides it again.
 */
export const ScrollHidesAppHeader: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await canvas.findByRole("heading", { level: 1, name: "Miller, Sarah" });
		const appHeader = canvasElement.querySelector<HTMLElement>("[data-slot='app-header']")!;
		const patientHeader = canvasElement.querySelector<HTMLElement>("[data-slot='patient-header']")!.parentElement!;
		const scroller = scrollContainerOf(patientHeader);
		const offset = (element: HTMLElement) =>
			element.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
		const scrollTo = async (top: number) => {
			scroller.scrollTop = top;
			scroller.dispatchEvent(new Event("scroll"));
		};

		// Down: the app header leaves, the Patient Header sticks at the top with the shadow.
		await scrollTo(200);
		await scrollTo(400);
		await waitFor(() => expect(appHeader.getBoundingClientRect().bottom).toBeLessThanOrEqual(scroller.getBoundingClientRect().top + 1));
		await waitFor(() => expect(Math.abs(offset(patientHeader))).toBeLessThan(1));
		await expect(patientHeader).toHaveClass("shadow-sm", "after:opacity-100");
		await expect(appHeader).toHaveClass("shadow-none");

		// Up: both come back, the Patient Header under the app header.
		await scrollTo(350);
		await waitFor(() => expect(Math.abs(offset(appHeader))).toBeLessThan(1));
		await waitFor(() => expect(Math.abs(offset(patientHeader) - appHeader.offsetHeight)).toBeLessThan(1));
		await expect(patientHeader).toHaveClass("shadow-sm");

		// Down again: hidden again.
		await scrollTo(500);
		await waitFor(() => expect(Math.abs(offset(patientHeader))).toBeLessThan(1));

		// Back at the top: the app header shows and the Patient Header is in its place, without the shadow.
		await scrollTo(0);
		await waitFor(() => expect(patientHeader).toHaveClass("shadow-none", "after:opacity-0"));
		await waitFor(() => expect(Math.abs(offset(appHeader))).toBeLessThan(1));
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
		await expect(canvas.getByText("No ventilator or oxygen data for this patient.")).toBeVisible();
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
 * Margaret Hayes after Scenario 1 (06:00): her page tracks what was done and decided. Her findings show SBP 128 against
 * "Nitro stops < 110" and a temperature charted 2 h ago. The Care plan: the CHF exacerbation pathway, co-signed; Keeping
 * at Chadron, 2 of 2 checkpoints passed, Transfer avoided (the orders and checkpoints are in its full plan). Up next
 * lists her scheduled medications. Every action and decision, with who and when, is on the Timeline's events lane,
 * beside her vitals. Her brief and vitals are at 06:00.
 */
export const CarePlanAndActivity: Story = {
	args: {
		patients: samplePatients.map((patient) => (patient.id === "p15" ? { ...patient, ...sampleScenario1ResolvedCensus } : patient)),
		patientRecords: samplePatientRecords.map((record) =>
			record.id === "p15"
				? {
						...record,
						...sampleScenario1ResolvedRecord(),
						...withGlucose("p15", { vitals: sampleScenario1ResolvedVitals(), timeline: sampleScenario1ResolvedTimeline() }),
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
		await expect(plan.getByText("Keeping at Chadron")).toBeVisible();
		await expect(plan.getByText("2 of 2 checkpoints passed")).toBeVisible();
		await expect(plan.getByText("Transfer avoided")).toBeVisible();
		// Her findings: SBP against the nitro rule, and the charted temperature gone stale.
		const findings = within(canvas.getByRole("region", { name: "Clinical findings" }));
		await expect(findings.getByText("Nitro stops < 110")).toBeVisible();
		await expect(findings.getByText("2 h old")).toBeVisible();
		await expect(within(canvas.getByRole("region", { name: "Up next" })).getAllByRole("listitem").length).toBeGreaterThan(0);

		// The Care Plan tab: a problem's View history button opens its history and its pathway's orders in place, and closes them.
		await userEvent.click(canvas.getByRole("tab", { name: "Care Plan" }));
		const tab = within(await canvas.findByRole("tabpanel", { name: "Care Plan" }));
		const problem = await tab.findByRole("region", { name: /^Acute on chronic heart failure/ });
		const heartFailure = within(problem).getByRole("button", { name: "View history" });
		await expect(heartFailure).toHaveAttribute("aria-expanded", "false");
		await userEvent.click(heartFailure);
		await expect(heartFailure).toHaveAttribute("aria-expanded", "true");
		// The details expand in, so they're visible once they have.
		await waitFor(() => expect(tab.getByText("Co-signed by Dr. Tom Weller")).toBeVisible());
		await waitFor(() => expect(tab.getByText("Furosemide IV")).toBeVisible());
		await waitFor(() => expect(tab.getByText("Edited")).toBeVisible());
		await userEvent.click(heartFailure);
		await waitFor(() => expect(tab.queryByText("Co-signed by Dr. Tom Weller")).toBeNull());
	},
};
