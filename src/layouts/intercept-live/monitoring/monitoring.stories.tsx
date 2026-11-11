import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

// Story-only helper, not part of the card's public API.
import { useLivePatients } from "@/components/cards/patient-monitoring-card/use-live-vitals";
import { expect, fn, screen, waitFor, within } from "storybook/test";

import { sampleAlertDetails, samplePatientConsults } from "../alert-panel/sample-alert-panel";
import { samplePatients } from "../census/sample-census";
import { samplePatientRecords } from "../patient-details/sample-patient-details";
import { sampleHospitals, sampleShiftEndsAt, sampleTeam, sampleUser } from "../sample-data/sample-workspace";
import { sampleAskIntercept, useLiveAskIntercept } from "../sample-data/sample-ask-intercept";
import { interceptLivePages } from "../intercept-live";
import { clearPrototypeLocation, prototypeShortcuts, resetPrototype, usePrototypeLocation } from "../sample-data/prototype-links";
import { useSampleLiveFeed, withFeedAlerts } from "../sample-data/use-sample-live-feed";
import { Monitoring, type MonitoringProps } from "./monitoring";
import { sampleEscalationTargets, sampleMonitoringAlerts, sampleMonitoringPatients } from "./sample-monitoring";

const meta = {
	title: "Layouts/Intercept Live/Monitoring",
	component: Monitoring,
	parameters: {
		layout: "fullscreen",
	},
	// As tests, each story starts with a clean address: the stories of a file share one, and a tab, panel or modal an
	// earlier story left there would open in the next (Storybook itself keeps a shared link's).
	beforeEach: () => clearPrototypeLocation({ onlyInTests: true }),
	// The monitors are live in every story: the numbers vary as on a bedside monitor (`useLivePatients`), without
	// crossing an alarm limit, so tags, filters and tests stay put. Ask Intercept Live answers from the same alerts
	// (with the queue's actions) and values the cards show (`useLiveAskIntercept`).
	render: function Render(args) {
		const patients = useLivePatients(args.patients);
		const live = useLiveAskIntercept(args.alerts ?? [], patients, args.onAlertAction);
		return <Monitoring {...args} patients={patients} askIntercept={live.askIntercept}
			askInterceptNotice={live.notice} onAlertAction={live.onAlertAction} />;
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
 * The screen with a simulated live feed (PRD SV-081): at 8 s, then every 15 to 30 s, a patient's vitals and
 * alerts change; an alert's severity goes up or down (a Medium becomes High, a Critical eases to Medium), a new one
 * fires, another resolves. The cards' alert bars follow. Sorted by Alerts (the default), they move to their new place (Reorder motion) at the panel's next re-sort, 2 s after the page
 * opens, then every 15 to 30 s, the newest alert first; sorted by Patient name, they keep their order. The triage queue reorders right away; the hospital bar says what changed ("Live
 * feed: …", the page's `liveFeed`). Then it loops. The hospital tabs, the chips and Filters narrow the panel; the queue
 * always shows every alert on it.
 * Margaret Hayes holds at NEWS2 5 until the Prototype menu's "Scenario 1: Heart failure" plays her early warning: her
 * NEWS2 reaches 10 and her Critical alert lands at #1 in the queue, above Miller's, because her score rose 5 in 4 h
 * (DU-09). Her card, monitor and record (score breakdown, vitals, timeline) change with it.
 * ⚠️ Cards moving on their own is what PRD SV-013 rules out ("Panel order changed · Update"); this shows the live
 * alternative for comparison (SV-OD-05).
 */
export const Default: Story = {
	render: (args) => <LiveMonitoring {...args} />,
};

/**
 * Video consult in the "…" menu of a patient with no active alert (Thomas Walker) still opens the modal, without an
 * alert on it: his name heads it, the actions row (Video consult, Messages, Pathway, as on an alert; Nov 5, 2026), his
 * score, monitor and flags under it, and the Video consult panel open with the call to his bedside nurse already ringing.
 * End, then Video consult to call again. No Pathway (Nov 10, 2026, user's call): pathways are on the patient's page.
 */
export const VideoConsultWithoutAlert: Story = {
	render: (args) => <LiveMonitoring {...args} />,
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(await canvas.findByRole("button", { name: "More actions for Walker, Thomas" }, { timeout: 10000 }));
		await userEvent.click(await screen.findByRole("menuitem", { name: "Video consult" }));
		const consult = within(await screen.findByRole("dialog", { name: /Walker, Thomas/ }, { timeout: 5000 }));
		await expect(consult.getByRole("heading", { level: 2 })).toHaveTextContent("Walker, Thomas");
		// Focus lands on the dialog, not its ×, so no focus ring shows as it opens.
		await expect(screen.getByRole("dialog")).toHaveFocus();
		await expect(await consult.findByText("Calling Grace Holloway…")).toBeInTheDocument();
		await expect(consult.queryByRole("region", { name: "Alert" })).toBeNull();
		await expect(consult.getByRole("button", { name: "2 pressors" })).toBeInTheDocument();
		// Right of the name (Nov 9, 2026): the call's button (End call while it rings or is on) and Messages; no Pathway.
		await expect(consult.getByRole("button", { name: "End call" })).toBeInTheDocument();
		// Messages, in the header only (the Video consult panel's header has none since Nov 5, 2026), with the messages
		// his nurse sent before the call (his record counts them unread).
		await expect(consult.getAllByRole("button", { name: /^Messages(, \d+ new)?$/ })).toHaveLength(1);
		await expect(consult.queryByRole("button", { name: /pathway/i })).toBeNull();
		// Live: the calling screen (which names the nurse too) has gone, and the nurse's label is on the video.
		await waitFor(
			() => {
				expect(consult.queryByText(/^Calling /)).not.toBeInTheDocument();
				expect(consult.getByText("Grace Holloway, RN")).toBeInTheDocument();
			},
			{ timeout: 7000 },
		);
		// The AI Notetaker starts on its own as the call connects, asking the nurse first.
		await expect(await consult.findByText("Waiting for approval")).toBeInTheDocument();
		await userEvent.click(consult.getByRole("button", { name: "End" }));
		await expect(await consult.findByText("Call ended")).toBeInTheDocument();
		// Video consult calls again, from the tile or the row.
		await userEvent.click(consult.getAllByRole("button", { name: "Video consult" })[0]);
		await expect(await consult.findByText("Calling Grace Holloway…")).toBeInTheDocument();
		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
	},
};

/**
 * The Prototype menu's "Scenario 1: Heart failure": Margaret Hayes has no alert until it's picked; 1.5 s later her
 * NEWS2 crosses into High (5 → 10) and her Critical alert arrives at the top of the live feed. Ask in her toast (or Ask
 * Intercept Live in her card's menu) answers why she's #1, the reason line explained, then her history and labs.
 */
export const Scenario1HeartFailure: Story = {
	render: (args) => <LiveMonitoring {...args} />,
	play: async ({ canvas, userEvent }) => {
		const title = "NEWS2 10, High: up 5 in 4 h";
		const feed = await openLiveFeed(canvas, userEvent);
		await expect(feed.queryByText(`Critical alert: ${title}`)).toBeNull();
		await userEvent.click(canvas.getByRole("button", { name: "Prototype" }));
		await userEvent.click(await screen.findByRole("menuitem", { name: "Scenario 1: Heart failure" }));
		await expect(await feed.findByText(`Critical alert: ${title}`, {}, { timeout: 4000 })).toBeInTheDocument();
		// Her toast waits while the feed is open (it lists the alert already) and shows once the feed closes.
		await userEvent.click(canvas.getByRole("button", { name: /^Live feed/ }));
		await waitFor(() => expect(canvas.queryByRole("complementary", { name: "Live feed" })).not.toBeInTheDocument());
		const toast = (await screen.findAllByText("Hayes, Margaret", { selector: "[data-sonner-toast] *" }))[0].closest("[data-sonner-toast]");
		await userEvent.click(within(toast as HTMLElement).getByRole("button", { name: /^Ask/ }));
		const chat = within(await screen.findByRole("complementary", { name: /Ask Intercept Live/ }));
		await expect(await chat.findByText(/#1/, { selector: "strong" }, { timeout: 20000 })).toBeInTheDocument();
		// The answer types out, so the consult's last line comes later.
		await expect(await chat.findByText(/Normal is under 100 pg\/mL/, {}, { timeout: 20000 })).toBeInTheDocument();
		// Then its follow-ups: her details first, then her active Critical alert, then what a physician asks next about her.
		const followUps = within(await chat.findByRole("list", { name: "Follow-up actions" }, { timeout: 20000 }));
		await expect(followUps.getAllByRole("button").map((button) => button.textContent)).toEqual([
			"Open patient details",
			"Open the Critical alert",
			"What changed since I last looked?",
			"Ventilator and last blood gas",
			"What's due in the next 2 hours?",
			"Latest imaging",
		]);
		// Her card's alert bar opens the alert panel: the reason line as its title, and the one-click consult.
		const card = canvas.getAllByRole("article").find((article) => within(article).queryByText("Hayes, Margaret"));
		await userEvent.click(within(card as HTMLElement).getByRole("button", { name: /Open alert/ }));
		const reason = "Rising work of breathing, positive fluid balance, HFrEF";
		const modal = within(await screen.findByRole("dialog", { name: reason }));
		await expect(modal.getByRole("button", { name: "Video consult" })).toBeInTheDocument();
		// The toasts hide while the modal is open and come back when it closes.
		const toasts = () => document.querySelector("[data-slot='toaster-region']");
		await expect(toasts()).toHaveAttribute("data-hidden");
		// Video consult in her card's "…" menu is the one click: the same modal, the call already ringing, then live.
		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
		await expect(toasts()).not.toHaveAttribute("data-hidden");
		await userEvent.click(within(card as HTMLElement).getByRole("button", { name: "More actions for Hayes, Margaret" }));
		await userEvent.click(await screen.findByRole("menuitem", { name: "Video consult" }));
		const consult = within(await screen.findByRole("dialog", { name: reason }));
		await expect(await consult.findByText("Calling Kayla Brandt…")).toBeInTheDocument();
		// Live: the calling screen (which names the nurse too) has gone, and the nurse's label is on the video.
		await waitFor(
			() => {
				expect(consult.queryByText(/^Calling /)).not.toBeInTheDocument();
				expect(consult.getByText("Kayla Brandt, RN")).toBeInTheDocument();
			},
			{ timeout: 7000 },
		);
		// Under the call, the AI Notetaker, started on its own: it asks Kayla before it captures the consultation.
		await expect(await consult.findByText("Waiting for approval")).toBeInTheDocument();
		// Messages open too, so her page picks them up.
		await userEvent.click(consult.getByRole("button", { name: "Messages" }));
		// The header's and the panel's × (Nov 10, 2026).
		await expect(await consult.findAllByRole("button", { name: "Close messages" })).toHaveLength(2);
		// Her name leaves the modal for her page; the toasts stay hidden there too.
		await userEvent.click(consult.getByRole("button", { name: "Hayes, Margaret, open patient" }));
		await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
		await expect(toasts()).toHaveAttribute("data-hidden");
		// The call goes with her: her page opens with the Video consult panel, still live (no ringing again), the notetaker
		// where it was, and Messages open as they were.
		const pageCall = within(await canvas.findByRole("complementary", { name: "Video consult" }));
		await expect(pageCall.getByText("Kayla Brandt, RN")).toBeInTheDocument();
		await expect(pageCall.queryByText(/^Calling /)).not.toBeInTheDocument();
		await expect(pageCall.queryByText("AI Notetaker")).not.toBeInTheDocument();
		await expect(await canvas.findByRole("complementary", { name: "Messages" })).toBeInTheDocument();
		// Her Timeline has the call, and not as ended: the alert closing behind her page didn't end it.
		await userEvent.click(canvas.getByRole("tab", { name: "Timeline" }));
		await userEvent.click(await canvas.findByRole("switch", { name: "Show as table" }));
		const events = () => within(canvas.getByRole("table", { name: "Events, newest first." }));
		await expect(await events().findByText(/^Video consult with Kayla Brandt, RN/)).toBeInTheDocument();
		await expect(events().queryByText(/^Video consult ended/)).toBeNull();
		// Opened from the alert, her page still has the patient list: Monitoring's, as it shows now.
		await userEvent.click(canvas.getByRole("button", { name: "Patient list" }));
		const list = within(await canvas.findByRole("complementary", { name: "Patients" }));
		await expect(list.getByText(/^From the Monitoring, in its order · \d+ of \d+$/)).toBeInTheDocument();
		// Ended on her page (the panel's ×, as the header's), the call is logged as ended, against her alert.
		await userEvent.click(pageCall.getByRole("button", { name: "Close video consult" }));
		await expect(await events().findByText(/^Video consult ended/)).toBeInTheDocument();
	},
};

/**
 * Fall risk's popover links to the patient's fall prevention pathway (Nov 10, 2026, user's call): on Anderson's card
 * (his bed exit alarm suggested it), View fall prevention pathway opens his page with the pathway out, its reason, the
 * hospital's protocol and the event behind it.
 */
export const FallPreventionPathway: Story = {
	// Starts on Monitoring, whatever page, patient or alert an earlier story left in the prototype's address.
	beforeEach: () => clearPrototypeLocation(),
	render: (args) => <LiveMonitoring {...args} />,
	play: async ({ canvas, userEvent }) => {
		const anderson = await waitFor(
			() => canvas.getAllByRole("article").find((article) => within(article).queryByText("Anderson, James")) as HTMLElement,
			{ timeout: 10000 },
		);
		await userEvent.click(within(anderson).getByRole("button", { name: "Fall risk" }));
		const popover = within(await screen.findByRole("dialog", { name: "Fall risk" }));
		await userEvent.click(popover.getByRole("button", { name: "View fall prevention pathway" }));
		const pathway = within(await screen.findByRole("complementary", { name: "Pathway" }, { timeout: 5000 }));
		const section = within(await pathway.findByRole("region", { name: "Fall prevention pathway" }));
		await expect(section.getByText("Patient identified as at risk for falls")).toBeInTheDocument();
		await expect(section.getByText(/Hospital fall prevention protocol/)).toBeInTheDocument();
		await expect(section.getByText("Related event: Bed exit alarm")).toBeInTheDocument();
	},
};

/** The prototype's address, the frame's own (the test runs in the bare story frame). */
const addressParam = (name: string) => new URL(window.location.href).searchParams.get(name);

/**
 * A shared link opens the same place (Nov 11, 2026, user's call): the patient's tab, the panels and the chat in the
 * address open as they were, and each change goes back into it. Here Sarah Miller's EMR tab with Alerts open and the
 * chat beside it; then Chart, Alerts closed, Back, and the live feed.
 */
export const ShareableLink: Story = {
	beforeEach: () => {
		clearPrototypeLocation();
		const url = new URL(window.location.href);
		const link = { page: "monitoring", patient: "p1", tab: "emr", panels: "alerts", side: "chat" };
		for (const [name, value] of Object.entries(link)) url.searchParams.set(name, value);
		window.history.replaceState(window.history.state, "", url);
		return () => clearPrototypeLocation();
	},
	render: (args) => <LiveMonitoring {...args} />,
	play: async ({ canvas, userEvent }) => {
		// Opened as the link says.
		await expect(await canvas.findByRole("tab", { name: "EMR", selected: true }, { timeout: 10000 })).toBeInTheDocument();
		await expect(await canvas.findByRole("complementary", { name: "Alerts" })).toBeInTheDocument();
		await expect(await canvas.findByRole("complementary", { name: "Ask Intercept Live" })).toBeInTheDocument();
		// Each change goes into the address.
		await userEvent.click(canvas.getByRole("tab", { name: "Labs" }));
		await waitFor(() => expect(addressParam("tab")).toBe("chart"));
		await userEvent.click(canvas.getByRole("button", { name: "Close alerts" }));
		await waitFor(() => expect(addressParam("panels")).toBeNull());
		await expect(addressParam("side")).toBe("chat");
		// Back: no patient, so no tab either; the page's own panels go in instead.
		await userEvent.click(canvas.getByRole("button", { name: "Back to Monitoring" }));
		await waitFor(() => expect(addressParam("patient")).toBeNull());
		await expect(addressParam("tab")).toBeNull();
		// Her page has left (it has a Live feed button of its own, right of its tabs).
		await waitFor(() => expect(canvas.queryByRole("heading", { level: 1, name: "Miller, Sarah" })).toBeNull());
		await openLiveFeed(canvas, userEvent);
		await waitFor(() => expect(addressParam("feed")).toBe("1"));
	},
};

/**
 * The alert modal's panels in a shared link (`alertPanels`): Sarah Miller's alert opens with Messages out, and closing
 * the modal takes the alert and its panels out of the address.
 */
export const ShareableLinkAlert: Story = {
	beforeEach: () => {
		clearPrototypeLocation();
		const url = new URL(window.location.href);
		const link = { page: "monitoring", alert: "p1", alertPanels: "messages" };
		for (const [name, value] of Object.entries(link)) url.searchParams.set(name, value);
		window.history.replaceState(window.history.state, "", url);
		return () => clearPrototypeLocation();
	},
	render: (args) => <LiveMonitoring {...args} />,
	play: async ({ userEvent }) => {
		const alert = within(await screen.findByRole("dialog", {}, { timeout: 10000 }));
		await expect(await alert.findByRole("complementary", { name: "Messages" })).toBeInTheDocument();
		await waitFor(() => expect(addressParam("alertPanels")).toBe("messages"));
		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(addressParam("alert")).toBeNull());
		await expect(addressParam("alertPanels")).toBeNull();
	},
};

/**
 * Scenario 1, steps 4 to 6: in Hayes's alert the intensivist opens Pathway (back Nov 11, 2026, user's
 * call), accepts the CHF pathway and keeps her at Chadron. A few seconds later it's 06:00: both checkpoints pass, the
 * panel logs Transfer avoided, her alert resolves (by her bedside nurse) and her card settles at NEWS2 3, Low. Reopened,
 * the alert keeps the decision, and her page's Care plan tracks it.
 */
export const Scenario1Resolution: Story = {
	render: (args) => <LiveMonitoring {...args} />,
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Prototype" }));
		await userEvent.click(await screen.findByRole("menuitem", { name: "Scenario 1: Heart failure" }));
		const hayes = () => canvas.getAllByRole("article").find((article) => within(article).queryByText("Hayes, Margaret"));
		await waitFor(() => expect(within(hayes() as HTMLElement).getByRole("button", { name: /Open alert/ })).toBeInTheDocument(), {
			timeout: 4000,
		});
		await userEvent.click(within(hayes() as HTMLElement).getByRole("button", { name: /Open alert/ }));
		const modal = within(await screen.findByRole("dialog"));
		await userEvent.click(modal.getByRole("button", { name: "Pathway" }));
		const pathway = within(await modal.findByRole("complementary", { name: "Pathway" }));
		await userEvent.click(await pathway.findByRole("button", { name: "Accept" }));
		const panel = within(await pathway.findByRole("region", { name: "Keep or transfer" }));
		await userEvent.click(panel.getByRole("button", { name: "Keep at Chadron" }));
		// The form's own button: the one that opened it may still be fading out.
		const form = within(await panel.findByRole("form", { name: "Keep at Chadron" }));
		await userEvent.type(form.getByRole("textbox", { name: "Why keep at Chadron?" }), "BiPAP and RT are here");
		await userEvent.click(form.getByRole("button", { name: "Keep at Chadron" }));
		// 06:00, while the alert is open: the checkpoints pass and the transfer is avoided.
		await expect(await panel.findByText("Transfer avoided", {}, { timeout: 10000 })).toBeInTheDocument();
		await expect(panel.getAllByText(/Passed/)).toHaveLength(2);
		await expect(await modal.findByText(/Resolved by Kayla Brandt, RN/)).toBeInTheDocument();
		// Closed and reopened, the decision and the outcome stay.
		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
		const card = within(hayes() as HTMLElement);
		await waitFor(() => expect(card.getByText(/NEWS2: 3/)).toBeInTheDocument());
		// Once the Critical bar has faded out, only the Resolved one is left.
		await waitFor(() => expect(card.getAllByRole("button", { name: /Open alert/ })).toHaveLength(1));
		await userEvent.click(card.getByRole("button", { name: /Open alert/ }));
		const reopened = within(await screen.findByRole("dialog"));
		await expect(await reopened.findByText(/Keeping at Chadron/)).toBeInTheDocument();
		await expect(reopened.getByText("Transfer avoided")).toBeInTheDocument();
		// Her page tracks it all in the care plan.
		await userEvent.click(reopened.getByRole("button", { name: "Hayes, Margaret, open patient" }));
		const plan = within(await screen.findByRole("region", { name: "Care plan" }, { timeout: 5000 }));
		await expect(plan.getByText("Keeping at Chadron")).toBeInTheDocument();
		await expect(plan.getByText("Transfer avoided")).toBeInTheDocument();
	},
};

/**
 * The Prototype menu's "Scenario 2: COPD": Dale Reynolds isn't on Monitoring until it's picked; 1.5 s later Alliance's
 * ED requests the hub's consult and he joins with his Critical alert. On the video consult, Alliance's connection drops:
 * the call goes on as audio, in low-bandwidth mode, and the BiPAP's photo arrives. The intensivist opens Pathway,
 * accepts the COPD pathway and keeps him at Alliance: air is grounded and the road closed, so there's no transfer to
 * pick. A few seconds later it's 2 h on NIV: both checkpoints pass, his alert resolves (by his nurse) and
 * his card settles at NEWS2 5.
 */
export const Scenario2Copd: Story = {
	render: (args) => <LiveMonitoring {...args} />,
	play: async ({ canvas, userEvent }) => {
		const reynolds = () => canvas.queryAllByRole("article").find((article) => within(article).queryByText("Reynolds, Dale"));
		await expect(reynolds()).toBeUndefined();
		await userEvent.click(canvas.getByRole("button", { name: "Prototype" }));
		await userEvent.click(await screen.findByRole("menuitem", { name: "Scenario 2: COPD" }));
		await waitFor(() => expect(within(reynolds() as HTMLElement).getByRole("button", { name: /Open alert/ })).toBeInTheDocument(), {
			timeout: 4000,
		});
		await userEvent.click(within(reynolds() as HTMLElement).getByRole("button", { name: /Open alert/ }));
		const modal = within(await screen.findByRole("dialog", { name: "pH 7.24 and PaCO₂ 78 on arrival, severe COPD, on BiPAP" }));
		// Step 2: 6 s after the call is on, Alliance's connection drops. The call goes on as audio, the banner says so, the
		// monitor's numbers are held, and the BiPAP's photo arrives 8 s later.
		await userEvent.click(modal.getByRole("button", { name: "Video consult" }));
		// Live: the calling screen (which names the nurse too) has gone, and the nurse's label is on the video.
		await waitFor(
			() => {
				expect(modal.queryByText(/^Calling /)).not.toBeInTheDocument();
				expect(modal.getByText("Megan Foster, RN")).toBeInTheDocument();
			},
			{ timeout: 7000 },
		);
		await expect(await modal.findByText("Low-bandwidth mode", {}, { timeout: 10000 })).toBeInTheDocument();
		await expect(modal.getByText("Low bandwidth:")).toBeInTheDocument();
		await expect(await modal.findByText("Video paused for low bandwidth", {}, { timeout: 5000 })).toBeInTheDocument();
		await expect(await modal.findByText("BiPAP screen", {}, { timeout: 12000 })).toBeInTheDocument();
		await userEvent.click(modal.getByRole("button", { name: "Pathway" }));
		const pathway = within(await modal.findByRole("complementary", { name: "Pathway" }));
		await expect(await pathway.findByText("COPD exacerbation pathway")).toBeInTheDocument();
		await userEvent.click(await pathway.findByRole("button", { name: "Accept" }));
		const panel = within(await pathway.findByRole("region", { name: "Keep or transfer" }));
		await expect(panel.getByText(/Grounded by the storm/)).toBeInTheDocument();
		await expect(panel.getByText(/Highway to Scottsbluff closed/)).toBeInTheDocument();
		await userEvent.click(panel.getByRole("button", { name: "Keep at Alliance" }));
		const form = within(await panel.findByRole("form", { name: "Keep at Alliance" }));
		await userEvent.type(form.getByRole("textbox", { name: "Why keep at Alliance?" }), "No way out tonight; NIV with checkpoints");
		await userEvent.click(form.getByRole("button", { name: "Keep at Alliance" }));
		// 2 h on NIV, while the alert is open: the blood gases' photos and Megan's note arrive, and Messages opens on its own
		// in Pathway's place.
		await expect(await modal.findByText("Blood gas, 2 h on BiPAP", {}, { timeout: 10000 })).toBeInTheDocument();
		await expect(await modal.findByText(/Resolved by Megan Foster, RN/)).toBeInTheDocument();
		// Back to Pathway: both checkpoints passed and no transfer was needed.
		await userEvent.click(modal.getByRole("button", { name: "Pathway" }));
		const resolved = within(await modal.findByRole("region", { name: "Keep or transfer" }));
		await expect(await resolved.findByText("Transfer avoided")).toBeInTheDocument();
		await expect(resolved.getAllByText(/Passed/)).toHaveLength(2);
		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
		await waitFor(() => expect(within(reynolds() as HTMLElement).getByText(/NEWS2: 5/)).toBeInTheDocument());
	},
};

/**
 * The same screen without the scripted feed: the sample as it starts, alerts unchanged, the monitors still live. The
 * Sidebar's Monitoring carries the worst open alert's dot, flashing: Miller's Critical sepsis alert.
 */
export const Static: Story = {
	play: async ({ canvas }) => {
		const monitoring = await canvas.findByRole("button", { name: "Monitoring, Critical alert" });
		await expect(monitoring.querySelector("[data-slot='sidebar-menu-button-alert']")).toHaveAttribute("data-severity", "critical");
	},
};

/**
 * Sort by offers Patient name (the default) and Recently viewed, nothing else (Nov 10, 2026, user's call). The Active
 * alerts chip orders the patients by who to see first instead: Miller (Critical), Erickson (High), Lambert (Medium),
 * then the Lows.
 */
export const SortOrders: Story = {
	play: async ({ canvas, userEvent }) => {
		const sort = canvas.getByRole("combobox", { name: "Sort by" });
		await expect(sort).toHaveTextContent("Patient name");
		await userEvent.click(sort);
		const options = await within(document.body).findAllByRole("option");
		await expect(options.map((option) => option.textContent)).toEqual(["Patient name", "Recently viewed"]);
		await userEvent.keyboard("{Escape}");
		const names = () =>
			canvas.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent?.split(",")[0]);
		// Active alerts orders by who to see first instead: Miller (Critical), Erickson (High), Lambert (Medium), then the
		// Lows by acuity band, Johnson (NEWS2 15, High) first, then the three Low bands by the longest wait: Carlson
		// (22 min), Hughes (12 min), Anderson (1 min).
		await userEvent.click(canvas.getByRole("button", { name: /Active alerts/ }));
		await waitFor(() =>
			expect(names()).toEqual(["Miller", "Erickson", "Lambert", "Johnson", "Carlson", "Hughes", "Anderson"]),
		);
	},
};

/**
 * Values outside their alarm limits are marked ▲ / ▼ by their label, in place, alert or not: Moore's and Clark's
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

/**
 * The monitor-view buttons (Full is the default): Condensed view shows the ECG strip over the four numerics on every
 * card; Minimal view is that alone, without the NEWS2 row or the tags, which close as it's picked; Full view brings back
 * the four waveform lanes, the score and the tags.
 */
export const MonitorViews: Story = {
	play: async ({ canvas, canvasElement, userEvent }) => {
		const expandedCards = () => canvasElement.querySelectorAll("[data-slot='patient-monitoring-card'][data-expanded]");
		const scores = () => canvas.queryAllByText(/^NEWS2: /);
		await expect(expandedCards()).toHaveLength(sampleMonitoringPatients.length);
		await userEvent.click(canvas.getByRole("button", { name: "Condensed view" }));
		await waitFor(() => expect(expandedCards()).toHaveLength(0));
		await expect(scores().length).toBeGreaterThan(0);
		await userEvent.click(canvas.getByRole("button", { name: "Minimal view" }));
		await waitFor(() => expect(scores()).toHaveLength(0));
		await expect(expandedCards()).toHaveLength(0);
		await userEvent.click(canvas.getByRole("button", { name: "Full view" }));
		await waitFor(() => expect(expandedCards()).toHaveLength(sampleMonitoringPatients.length));
		await waitFor(() => expect(scores().length).toBeGreaterThan(0));
	},
};

/** No patients on the panel: the summary reads 0 and an empty state explains what will appear. */
export const Empty: Story = {
	args: { patients: [] },
};

/**
 * A hospital with no patients at all (here Bridgeport, its five left out of the roster): its tab says so, "No patients
 * at Bridgeport Valley", rather than blaming the filters, and Show all hospitals goes back to everyone.
 */
export const EmptyHospital: Story = {
	args: {
		patients: sampleMonitoringPatients.filter((patient) => patient.hospitalId !== "bridgeport"),
		censusPatients: samplePatients.filter((patient) => patient.hospitalId !== "bridgeport"),
	},
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("tab", { name: /^Bridgeport/ }));
		await waitFor(() => expect(canvas.getByText("No patients at Bridgeport Valley")).toBeVisible());
		await expect(canvas.queryByText("No patients match these filters")).not.toBeInTheDocument();
		await userEvent.click(canvas.getByRole("button", { name: "Show all hospitals" }));
		await waitFor(() => expect(canvas.getByRole("tab", { name: /^All hospitals/ })).toHaveAttribute("aria-selected", "true"));
		await expect(canvas.queryByText("No patients at Bridgeport Valley")).not.toBeInTheDocument();
	},
};

/** Filters that match nobody (CCU and ECMO): an empty state with Clear filters, which brings every patient back. */
export const NoMatches: Story = {
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Filters" }));
		await userEvent.click(await screen.findByRole("checkbox", { name: "CCU" }));
		await userEvent.click(screen.getByRole("checkbox", { name: "ECMO" }));
		await userEvent.click(screen.getByRole("button", { name: "Done" }));
		// The empty state Reveals in (opacity 0 → 1), so wait for it to finish appearing.
		await waitFor(() => expect(canvas.getByText("No patients match these filters")).toBeVisible());
	},
};

/**
 * The Filters panel, as on the Census: Unit, Highest alert, Outside alarm limits (per parameter, and Not reporting; a
 * picked option holds the patients who matched then), Organ support and Code status & safety. It opens where the live
 * feed does, one at a time.
 */
export const Filters: Story = {
	play: async ({ canvas, userEvent }) => {
		await expect(canvas.queryByRole("combobox", { name: "Unit" })).not.toBeInTheDocument();
		await userEvent.click(canvas.getByRole("button", { name: "Filters" }));
		await userEvent.click(await screen.findByRole("checkbox", { name: "Ventilated" }));
		await expect(screen.getByText(`5 of ${sampleMonitoringPatients.length} patients in this view`)).toBeInTheDocument();
		// A modal: the page behind is hidden from assistive tech until Done closes the sheet.
		await userEvent.click(screen.getByRole("button", { name: "Done" }));
		await waitFor(() => expect(screen.queryByRole("dialog", { name: "Filters" })).not.toBeInTheDocument());
		await expect(canvas.getByRole("heading", { level: 1 })).toHaveTextContent(/^5 patients/);
		const filtersButton = canvas.getByRole("button", { name: "Filters, 1 picked" });
		await expect(filtersButton).toHaveAttribute("aria-expanded", "false");
		await userEvent.click(filtersButton);
		await userEvent.click(await screen.findByRole("button", { name: "Clear all" }));
		// With nothing picked, the footer (Clear all, Done) leaves; the close button closes the sheet.
		await waitFor(() => expect(screen.queryByRole("button", { name: "Done" })).not.toBeInTheDocument());
		await userEvent.click(screen.getByRole("button", { name: "Close Filters" }));
		await waitFor(() =>
			expect(canvas.getByRole("heading", { level: 1 })).toHaveTextContent(
				new RegExp(`^${sampleMonitoringPatients.length} patients`),
			),
		);
	},
};

/**
 * Everyone's live feed (Nov 11, 2026, user's calls): a log, each line starting with its patient as the chat's patient
 * rows. An open alert's line opens the alert (here, without alert details, the patient's page, the shell's fallback);
 * the actions (Acknowledge, Escalate, Resolve) are in the alert modal, no longer in the feed.
 */
export const FeedLineOpensAlert: Story = {
	play: async ({ canvas, userEvent }) => {
		const feed = await openLiveFeed(canvas, userEvent);
		const log = within(feed.getByRole("log", { name: "Live feed" }));
		const line = log.getAllByRole("button", { name: /Critical alert: / }).find((button) => button.textContent?.includes("Miller, Sarah"));
		await expect(line).toBeDefined();
		await userEvent.click(line as HTMLElement);
		await expect(await canvas.findByRole("heading", { level: 1, name: "Miller, Sarah" })).toBeInTheDocument();
	},
};

/** The feed's filter, in its header left of ×, as the Messages panel's: unchecking Alerts leaves every other kind. */
export const FeedFilters: Story = {
	play: async ({ canvas, userEvent }) => {
		const feed = await openLiveFeed(canvas, userEvent);
		const all = within(feed.getByRole("log", { name: "Live feed" })).getAllByRole("listitem").length;
		await userEvent.click(feed.getByRole("button", { name: "Filter live feed" }));
		await userEvent.click(await screen.findByRole("menuitemcheckbox", { name: "Alerts" }));
		// Counted in the DOM: the open menu hides the page from role queries.
		const lines = () => [...feed.getByRole("log", { name: "Live feed", hidden: true }).querySelectorAll("li")];
		await waitFor(() => expect(lines().length).toBeLessThan(all));
		for (const line of lines()) await expect(line.textContent).not.toMatch(/Alert: /);
	},
};

/**
 * The live feed panel: "Live feed" in the hospital bar opens everyone's log right of the canvas, like the chat on the
 * left; it resizes from its left edge, and its close button, Escape inside it or the link again closes it.
 */
export const LiveFeedPanel: Story = {
	play: async ({ canvas, userEvent }) => {
		const link = canvas.getByRole("button", { name: /^Live feed/ });
		await expect(link).toHaveAttribute("aria-expanded", "false");
		const panel = await openLiveFeed(canvas, userEvent);
		await expect(link).toHaveAttribute("aria-expanded", "true");
		// Each line names its patient, with the avatar, as the chat's patient rows.
		const firstLine = within(panel.getByRole("log", { name: "Live feed" })).getAllByRole("listitem")[0];
		await expect(firstLine.querySelector("[data-slot='avatar']")).not.toBeNull();
		await expect(panel.getByRole("separator", { name: "Resize Live feed" })).toBeInTheDocument();
		// The feed lists every alert, so the toasts hide (paused) while it's open and come back when it closes.
		const toasts = () => document.querySelector("[data-slot='toaster-region']");
		await waitFor(() => expect(toasts()).toHaveAttribute("data-hidden"));
		await userEvent.click(panel.getByRole("button", { name: "Close Live feed" }));
		await waitFor(() => expect(canvas.queryByRole("complementary", { name: "Live feed" })).not.toBeInTheDocument());
		await waitFor(() => expect(toasts()).not.toHaveAttribute("data-hidden"));
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

/** 1 h trends in condensed monitors: each card shows its numerics over their last hour instead of the ECG strip. */
export const Trends: Story = {
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Condensed view" }));
		await userEvent.click(canvas.getByRole("button", { name: "1 h trends" }));
		await waitFor(() => expect(canvas.queryByText("II")).not.toBeInTheDocument());
	},
};

/** 1 h trends in the full monitors (the default): each lane is a parameter's last hour; ECG strip brings back waveforms. */
export const FullTrends: Story = {
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "1 h trends" }));
		await waitFor(() => expect(canvas.getAllByText("HR · 1 h")).toHaveLength(sampleMonitoringPatients.length));
		await userEvent.click(canvas.getByRole("button", { name: "ECG strip" }));
		await waitFor(() => expect(canvas.queryByText("HR · 1 h")).not.toBeInTheDocument());
		await expect(canvas.getAllByText("Pleth")).toHaveLength(sampleMonitoringPatients.length);
	},
};

/**
 * The Outside limits filter keeps the patients outside their alarm limits when it's pressed: Miller, Johnson, Walker,
 * Moore and Clark (Hayes only once Scenario 1 plays). Membership holds while readings move; pressing it again shows everyone.
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
	const {
		patients: fed,
		alerts,
		everyAlert,
		notices,
		caption,
		startScenario,
		withScenarioCensus,
		withScenarioRecords,
		withScenarioAlertDetails,
		withScenarioActivity,
		onPathwayDecision,
		onTransferDecision,
		onDischargeDecision,
		onBundleDecision,
		onConsultChange,
		onConsultNote,
		logAlertAction,
	} = useSampleLiveFeed();
	// The page and patient in the address (`?page=…&patient=…`), so a copied link opens the same place.
	const location = usePrototypeLocation(interceptLivePages, {
		page: props.defaultPage ?? "Monitoring",
		patient: props.defaultPatient,
	});
	const patients = useLivePatients(fed);
	// The scenarios change their patients' Census cards and records too (and add Scenario 2's arrival), so the Census page, their details and the chat follow.
	const censusPatients = props.censusPatients && withScenarioCensus(props.censusPatients);
	const scenarioRecords = props.patientRecords && withScenarioRecords(props.patientRecords);
	const alertDetails = withScenarioAlertDetails(
		sampleAlertDetails({ alerts: everyAlert, censusPatients, monitoringPatients: patients, records: scenarioRecords }),
	);
	// Her page tracks what was done and decided: the activity log, the care plan, the orders and the consult note.
	const patientRecords = scenarioRecords && withScenarioActivity(scenarioRecords, alertDetails);
	// Every alert action goes in the log, wherever it was taken.
	const live = useLiveAskIntercept(
		alerts,
		patients,
		(alertId, action) => {
			logAlertAction(alertId, action, props.escalationTargets);
			props.onAlertAction?.(alertId, action);
		},
		{ censusPatients, patientRecords },
	);
	// What the feed just changed shows at the right of the hospital bar. The Census page (Sidebar) follows the same feed.
	return (
		<Monitoring
			{...props}
			patients={patients}
			alerts={alerts}
			askIntercept={live.askIntercept}
			askInterceptNotice={live.notice}
			onAlertAction={live.onAlertAction}
			liveFeed={caption}
			censusPatients={censusPatients && withFeedAlerts(censusPatients, alerts)}
			patientRecords={patientRecords}
			alertDetails={alertDetails}
			patientConsults={samplePatientConsults({ censusPatients, monitoringPatients: patients, records: patientRecords })}
			onPathwayDecision={onPathwayDecision}
			onTransferDecision={onTransferDecision}
			onDischargeDecision={onDischargeDecision}
			onBundleDecision={onBundleDecision}
			onConsultChange={onConsultChange}
			onConsultNote={onConsultNote}
			notices={notices}
			prototype={prototypeShortcuts({ startScenario })}
			onResetPrototype={resetPrototype}
			defaultPage={location.defaultPage}
			defaultPatient={location.defaultPatient}
			defaultAlert={location.defaultAlert}
			defaultLocationState={location.defaultLocationState}
			onLocationChange={location.onLocationChange}
		/>
	);
}

/**
 * Scenario 2's consult request answered from its toast, then the patient's name in the alert panel: the call goes on on
 * his page, live, with the same nurse (Nov 10, 2026, user's report: the answered call was lost on the way, because a
 * call that opens already live wasn't in the patient's consult session until its next change).
 */
export const AnsweredCallGoesToPatientPage: Story = {
	render: (args) => <LiveMonitoring {...args} />,
	play: async ({ canvas, userEvent }) => {
		const reynolds = () => canvas.queryAllByRole("article").find((article) => within(article).queryByText("Reynolds, Dale"));
		await userEvent.click(canvas.getByRole("button", { name: "Prototype" }));
		await userEvent.click(await screen.findByRole("menuitem", { name: "Scenario 2: COPD" }));
		await waitFor(() => expect(within(reynolds() as HTMLElement).getByRole("button", { name: /Open alert/ })).toBeInTheDocument(), { timeout: 4000 });
		const call = await screen.findByRole("button", { name: "Answer" }, { timeout: 10000 });
		await userEvent.click(call);
		const modal = within(await screen.findByRole("dialog", { name: "pH 7.24 and PaCO₂ 78 on arrival, severe COPD, on BiPAP" }));
		await waitFor(() => expect(modal.getByText("Megan Foster, RN")).toBeInTheDocument(), { timeout: 7000 });
		await userEvent.click(modal.getByRole("button", { name: "Reynolds, Dale, open patient" }));
		await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
		const pageCall = within(await canvas.findByRole("complementary", { name: "Video consult" }, { timeout: 5000 }));
		await expect(pageCall.getByText("Megan Foster, RN")).toBeInTheDocument();
		await expect(pageCall.queryByText(/^Calling /)).not.toBeInTheDocument();
	},
};
