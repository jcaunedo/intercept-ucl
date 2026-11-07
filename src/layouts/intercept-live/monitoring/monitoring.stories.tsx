import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

// Story-only helper, not part of the card's public API.
import { useLivePatients } from "@/components/cards/patient-monitoring-card/use-live-vitals";
import { expect, fn, screen, waitFor, within } from "storybook/test";

import { sampleAlertDetails, samplePatientConsults } from "../alert-modal/sample-alert-modal";
import { samplePatients } from "../census/sample-census";
import { samplePatientRecords } from "../patient-details/sample-patient-details";
import { sampleHospitals, sampleShiftEndsAt, sampleTeam, sampleUser } from "../sample-data/sample-workspace";
import { sampleAskIntercept, useLiveAskIntercept } from "../sample-data/sample-ask-intercept";
import { interceptLivePages } from "../intercept-live";
import { prototypeShortcuts, resetPrototype, usePrototypeLocation } from "../sample-data/prototype-links";
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
 * End, then Video consult to call again. Pathway says there's none: pathways come with an alert.
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
		// The actions row, as on an alert: the call's button (Calling… while it rings), Messages and Pathway.
		await expect(consult.getByRole("button", { name: /End call|Calling…/ })).toBeInTheDocument();
		// Messages, in the row only (the Video consult panel's header has none since Nov 5, 2026), with the messages his
		// nurse sent before the call (his record counts them unread).
		await expect(consult.getAllByRole("button", { name: /^Messages(, \d+ new)?$/ })).toHaveLength(1);
		await userEvent.click(consult.getByRole("button", { name: "Pathway" }));
		await expect(await consult.findByText("No care pathway")).toBeInTheDocument();
		await userEvent.click(consult.getByRole("button", { name: "Hide pathway" }));
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
 * NEWS2 crosses into High (5 → 10) and her Critical alert leads the live feed's queue. Ask in her toast (or Ask
 * Intercept Live in her card's menu) answers why she's #1, the reason line explained, then her history and labs.
 */
export const Scenario1HeartFailure: Story = {
	render: (args) => <LiveMonitoring {...args} />,
	play: async ({ canvas, userEvent }) => {
		const title = "NEWS2 10, High: up 5 in 4 h";
		const feed = await openLiveFeed(canvas, userEvent);
		await expect(feed.queryByText(title)).toBeNull();
		await userEvent.click(canvas.getByRole("button", { name: "Prototype" }));
		await userEvent.click(await screen.findByRole("menuitem", { name: "Scenario 1: Heart failure" }));
		await expect(await feed.findByText(title, {}, { timeout: 4000 })).toBeInTheDocument();
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
		await expect(await consult.findByRole("button", { name: "Hide messages" })).toBeInTheDocument();
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
		// Her log has the call, and not as ended: the alert closing behind her page didn't end it.
		const log = within(canvas.getByRole("region", { name: "Log" }));
		await expect(await log.findByText("Video consult with Kayla Brandt, RN")).toBeInTheDocument();
		await expect(log.queryByText("Video consult ended")).toBeNull();
		// Opened from the alert, her page still has the patient list: Monitoring's, as it shows now.
		await userEvent.click(canvas.getByRole("button", { name: "Patient list" }));
		const list = within(await canvas.findByRole("complementary", { name: "Patients" }));
		await expect(list.getByText(/^From the Monitoring, in its order · \d+ of \d+$/)).toBeInTheDocument();
		// Ended on her page, the call is logged as ended, against her alert.
		await userEvent.click(canvas.getByRole("button", { name: "Close video consult" }));
		await expect(await log.findByText("Video consult ended")).toBeInTheDocument();
	},
};

/**
 * Scenario 1, steps 4 to 6: in Hayes's alert modal the intensivist accepts the CHF pathway and keeps her at Chadron. A
 * few seconds later it's 06:00: both checkpoints pass, the panel logs Transfer avoided, her alert resolves (by her
 * bedside nurse) and her card settles at NEWS2 3, Low. Reopened, the modal keeps the decision.
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
		await userEvent.click(await modal.findByRole("button", { name: "Accept" }));
		const panel = within(await modal.findByRole("region", { name: "Keep or transfer" }));
		await userEvent.click(panel.getByRole("button", { name: "Keep at Chadron" }));
		// The form's own button: the one that opened it may still be fading out.
		const form = within(await panel.findByRole("form", { name: "Keep at Chadron" }));
		await userEvent.type(form.getByRole("textbox", { name: "Why keep at Chadron?" }), "BiPAP and RT are here");
		await userEvent.click(form.getByRole("button", { name: "Keep at Chadron" }));
		// 06:00, while the modal is open: the checkpoints pass and the transfer is avoided.
		await expect(await panel.findByText("Transfer avoided", {}, { timeout: 10000 })).toBeInTheDocument();
		await expect(panel.getAllByText(/Passed/)).toHaveLength(2);
		// The Pathway column scrolls to its end, so the result is in view.
		const column = (await panel.findByText("Transfer avoided")).closest(".overflow-y-auto") as HTMLElement;
		await waitFor(() => expect(column.scrollHeight - column.clientHeight - column.scrollTop).toBeLessThan(2));
		await expect(await modal.findByText(/Resolved by Kayla Brandt, RN/)).toBeInTheDocument();
		// Closed and reopened, the decision and the outcome stay.
		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
		const card = within(hayes() as HTMLElement);
		await waitFor(() => expect(card.getByText("3")).toBeInTheDocument());
		// Once the Critical bar has faded out, only the Resolved one is left.
		await waitFor(() => expect(card.getAllByRole("button", { name: /Open alert/ })).toHaveLength(1));
		await userEvent.click(card.getByRole("button", { name: /Open alert/ }));
		const reopened = within(await screen.findByRole("dialog"));
		await expect(await reopened.findByText(/Keeping at Chadron/)).toBeInTheDocument();
		await expect(reopened.getByText("Transfer avoided")).toBeInTheDocument();
		// Her page tracks it all: the care plan, and the log with who did what.
		await userEvent.click(reopened.getByRole("button", { name: "Hayes, Margaret, open patient" }));
		const plan = within(await screen.findByRole("region", { name: "Care plan" }));
		await expect(plan.getByText("Keeping at Chadron")).toBeInTheDocument();
		await expect(plan.getByText("Transfer avoided")).toBeInTheDocument();
		const log = within(screen.getByRole("region", { name: "Log" }));
		await expect(log.getByText("Alert resolved")).toBeInTheDocument();
	},
};

/**
 * The Prototype menu's "Scenario 2: COPD": Dale Reynolds isn't on Monitoring until it's picked; 1.5 s later Alliance's
 * ED requests the hub's consult and he joins with his Critical alert. On the video consult, Alliance's connection drops:
 * the call goes on as audio, in low-bandwidth mode, and the BiPAP's photo arrives. The intensivist accepts the COPD
 * pathway and keeps him at Alliance: air is grounded and the road closed, so there's no transfer to pick. A few seconds
 * later it's 2 h on NIV: both checkpoints pass, his alert resolves (by his nurse) and his card settles at NEWS2 5.
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
		await expect(await modal.findByText("COPD exacerbation pathway")).toBeInTheDocument();
		await userEvent.click(await modal.findByRole("button", { name: "Accept" }));
		const panel = within(await modal.findByRole("region", { name: "Keep or transfer" }));
		await expect(panel.getByText(/Grounded by the storm/)).toBeInTheDocument();
		await expect(panel.getByText(/Highway to Scottsbluff closed/)).toBeInTheDocument();
		await userEvent.click(panel.getByRole("button", { name: "Keep at Alliance" }));
		const form = within(await panel.findByRole("form", { name: "Keep at Alliance" }));
		await userEvent.type(form.getByRole("textbox", { name: "Why keep at Alliance?" }), "No way out tonight; NIV with checkpoints");
		await userEvent.click(form.getByRole("button", { name: "Keep at Alliance" }));
		// 2 h on NIV, while the modal is open: the blood gases' photos and Megan's note arrive, and Messages opens on its own
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
		await waitFor(() => expect(within(reynolds() as HTMLElement).getByText("5")).toBeInTheDocument());
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
 * Sort by Alerts (the default): patients with an open alert first, the newest alert on top, so Anderson's Low bed exit (1 min ago)
 * leads, then Johnson's Low SpO₂ (9 min), then Miller's Critical sepsis alert (16 min); everyone else follows by name.
 * The Active alerts chip orders them by who to see first instead: Miller (Critical), then Johnson, then Anderson.
 */
export const SortByAlerts: Story = {
	play: async ({ canvas, userEvent }) => {
		await expect(canvas.getByRole("combobox", { name: "Sort by" })).toHaveTextContent("Alerts");
		const names = () =>
			canvas.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent?.split(",")[0]);
		await waitFor(() => expect(names().slice(0, 3)).toEqual(["Anderson", "Johnson", "Miller"]));
		// Active alerts orders by who to see first instead: Miller (Critical), then the two Lows by acuity band, Johnson
		// (NEWS2 15, High) above Anderson (3, Low).
		await userEvent.click(canvas.getByRole("button", { name: /Active alerts/ }));
		await waitFor(() => expect(names()).toEqual(["Miller", "Johnson", "Anderson"]));
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
		const scores = () => canvas.queryAllByText("NEWS2");
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
		await expect(row.getByText(/Escalated to James Turner by you/)).toBeVisible();
	},
};

/** Resolving needs a reason. The alert leaves Active for Resolved, and Anderson's card loses its pill. */
export const ResolveAlert: Story = {
	play: async ({ canvas, userEvent }) => {
		const queue = await openLiveFeed(canvas, userEvent);
		const row = within(queue.getByText("Bed exit alarm").closest("li") as HTMLElement);
		await userEvent.click(row.getByRole("button", { name: "Resolve" }));
		await expect(row.getByRole("button", { name: "Mark as resolved" })).toBeDisabled();
		await userEvent.click(row.getByRole("radio", { name: "Artifact or false alarm" }));
		await userEvent.click(row.getByRole("button", { name: "Mark as resolved" }));
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
			onLocationChange={location.onLocationChange}
		/>
	);
}
