import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, screen, waitFor, within } from "storybook/test";

// Story-only helper, not part of the card's public API.
import { useLivePatients } from "@/components/data-display/patient-monitor/use-live-vitals";

import { sampleAlertDetails, samplePatientConsults } from "../alert-panel/sample-data/sample-alert-panel";
import { sampleEscalationTargets, sampleMonitoringAlerts, sampleMonitoringPatients } from "../monitoring/sample-data/sample-monitoring";
import { samplePatientRecords } from "../patient-details/sample-data/sample-patient-details";
import { sampleHospitals, sampleShift, sampleShiftEndsAt, sampleTeam, sampleUser } from "../sample-data/sample-workspace";
import { sampleDraftQuickRequest } from "../sample-data/sample-quick-request-drafter";
import { sampleOpenShifts, sampleScheduleShifts } from "../schedule/sample-data/sample-schedule";
import { sampleMessageConversations } from "../messages/sample-data/sample-messages";
import { sampleInboxItems } from "../inbox/sample-data/sample-inbox";
import { sampleOutcomes } from "../analytics/sample-data/sample-analytics";
import { sampleAskIntercept, useLiveAskIntercept } from "../sample-data/sample-ask-intercept";
import { interceptLivePages } from "../intercept-live";
import { clearPrototypeLocation, prototypeShortcuts, resetPrototype, usePrototypeLocation } from "../sample-data/prototype-links";
import { useSampleLiveFeed, withFeedAlerts } from "../sample-data/use-sample-live-feed";
import { Patients } from "./patients";
import { samplePastPatients, samplePatients, sampleUncertainStatusPatients } from "../sample-data/sample-census";

const meta = {
	title: "Layouts/Intercept Live/Patients",
	component: Patients,
	parameters: {
		layout: "fullscreen",
	},
	// As tests, each story starts with a clean address: the stories of a file share one, and a tab, panel or modal an
	// earlier story left there would open in the next (Storybook itself keeps a shared link's).
	beforeEach: () => clearPrototypeLocation({ onlyInTests: true }),
	// The Monitoring page's monitors are live here too (`useLivePatients`), and Ask Intercept Live answers from the same
	// alerts (with the queue's actions) and values (`useLiveAskIntercept`).
	render: function Render(args) {
		const monitoringPatients = useLivePatients(args.monitoringPatients ?? []);
		const live = useLiveAskIntercept(args.alerts ?? [], monitoringPatients, args.onAlertAction);
		return (
			<Patients
				{...args}
				monitoringPatients={monitoringPatients}
				askIntercept={live.askIntercept}
			askInterceptNotice={live.notice}
				onAlertAction={live.onAlertAction}
			/>
		);
	},
	args: {
		// The app opens on Monitoring; these stories show the Patients page.
		defaultPage: "Patients",
		hospitals: sampleHospitals,
		// The Sidebar's Schedule: the clinician's shifts and the open shifts they can take.
		schedule: { shifts: sampleScheduleShifts, openShifts: sampleOpenShifts, onShiftAction: fn(), onNewRequest: fn() },
		// The Sidebar's Messages: every thread with the bedside, across the hospitals.
		messages: { conversations: sampleMessageConversations, onSendMessage: fn() },
		// The Sidebar's Inbox: work besides alerts (the alerts come from `alerts`).
		inbox: { items: sampleInboxItems, onItemAction: fn() },
		// The Sidebar's Analytics: the outcomes dashboard, one synthetic month (Scenario 6 ends on it).
		analytics: { data: sampleOutcomes, onExport: fn() },
		// The directory: the census, the patients treated before (discharged, transferred) and two with an uncertain status (pending reconciliation, unknown).
		patients: [...samplePatients, ...samplePastPatients, ...sampleUncertainStatusPatients],
		monitoringPatients: sampleMonitoringPatients,
		patientRecords: samplePatientRecords,
		onPatientDetailsAction: fn(),
		alerts: sampleMonitoringAlerts,
		escalationTargets: sampleEscalationTargets,
		user: sampleUser,
		askIntercept: sampleAskIntercept,
		draftQuickRequest: sampleDraftQuickRequest,
		shiftEndsAt: sampleShiftEndsAt,
		shift: sampleShift,
		team: sampleTeam,
		unreadMessages: 3,
		onOpenPatient: fn(),
		onAlertAction: fn(),
		onOpenLiveFeed: fn(),
	},
} satisfies Meta<typeof Patients>;

export default meta;

/**
 * The chat panel once it has slid open. It moves focus to its heading as the slide ends, so a story that types right
 * away would lose the rest of its keys to it when the machine is slow.
 */
async function openedChat(canvas: ReturnType<typeof within>) {
	const panel = await canvas.findByRole("complementary", { name: "Ask Intercept Live" });
	await waitFor(() => expect(panel.contains(document.activeElement)).toBe(true));
	return within(panel);
}
type Story = StoryObj<typeof meta>;

/**
 * Patients, the directory: search first, then My patients and Current, the Hospital and Unit menus and
 * Filters; the count, Sort (Recently viewed) and Table / Cards. Current and past patients together, each with their
 * status. The live feed plays in the shell (toasts, Monitoring), but nothing on this page moves or ranks by alerts or
 * NEWS2: that's Monitoring's (PRD Patients).
 */
export const Default: Story = {
	render: (args) => <LiveDirectory {...args} />,
};

/** The same screen without the scripted feed: the sample as it starts, nothing changing. */
export const Static: Story = {};

/**
 * The Sidebar's Ask Intercept Live opens the chat panel from the left, on any page: the page narrows beside it. Its
 * close button, Escape or Ask Intercept Live again closes it. The greeting writes itself without a Stop button, and a
 * question sent meanwhile is asked, the greeting finishing at once.
 */
export const AskIntercept: Story = {
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Ask Intercept Live" }));
		const panel = await canvas.findByRole("complementary", { name: "Ask Intercept Live" });
		await waitFor(() => expect(panel).toHaveStyle({ width: "400px" }));
		const chat = within(panel);
		await waitFor(() => expect(chat.getByRole("log", { name: "Conversation" })).toHaveAttribute("aria-busy", "true"));
		await expect(chat.queryByRole("button", { name: "Stop generating" })).toBeNull();
		await userEvent.type(chat.getByRole("combobox", { name: "Ask Intercept Live" }), "What changed?{Enter}");
		const question = await chat.findByText("What changed?");
		await waitFor(() => expect(question).toBeVisible());
		await userEvent.click(canvas.getByRole("button", { name: "Close Ask Intercept Live" }));
		await waitFor(() => expect(canvas.queryByRole("complementary", { name: "Ask Intercept Live" })).not.toBeInTheDocument());
		await userEvent.click(canvas.getByRole("button", { name: "Ask Intercept Live" }));
	},
};

/**
 * An answer's counts are links to their patients (Nov 10, 2026, user's call): "5 on pressors" lists them under its line,
 * each with where they are, and a patient opens their details.
 */
export const AskInterceptPatientLists: Story = {
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Ask Intercept Live" }));
		const chat = await openedChat(canvas);
		await userEvent.type(chat.getByRole("combobox", { name: "Ask Intercept Live" }), "fall risk patients?{Enter}");
		const pressors = await chat.findByRole("button", { name: /on pressors/ }, { timeout: 15_000 });
		await expect(pressors).toHaveAttribute("aria-expanded", "false");
		await userEvent.click(pressors);
		await expect(pressors).toHaveAttribute("aria-expanded", "true");
		const list = within(await chat.findByRole("list", { name: "Patients on pressors" }));
		const rows = list.getAllByRole("button", { name: /^Open patient details:/ });
		await expect(rows).toHaveLength(Number(pressors.textContent?.match(/\d+/)?.[0]));
		// Each with their avatar, as on their card.
		for (const row of rows) await expect(row.querySelector("[data-slot='avatar']")).not.toBeNull();
		const name = rows[0].textContent?.replace("Open patient details: ", "").split(",")[0] ?? "";
		await userEvent.click(rows[0]);
		await waitFor(() => expect(canvas.getByRole("heading", { level: 1 })).toHaveTextContent(name));
	},
};

/**
 * An answer that lists patients line by line shows each one's avatar before their line, as on their card, in place of
 * the bullet (Nov 10, 2026, user's call).
 */
export const AskInterceptPatientAvatars: Story = {
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Ask Intercept Live" }));
		const chat = await openedChat(canvas);
		await userEvent.type(chat.getByRole("combobox", { name: "Ask Intercept Live" }), "Who is on oxygen?{Enter}");
		const intro = await chat.findByText(/^Breathing support.*:$/, {}, { timeout: 15_000 });
		const answer = intro.closest("div")?.parentElement as HTMLElement;
		// A name is a link as soon as it shows, while the answer still streams (Nov 11, 2026, user's call).
		await waitFor(() => expect(answer.querySelector("li p button")).not.toBeNull(), { timeout: 15_000 });
		await expect(chat.getByRole("log", { name: "Conversation" })).toHaveAttribute("aria-busy", "true");
		await waitFor(
			() => {
				const lines = [...answer.querySelectorAll("li")];
				expect(lines.length).toBeGreaterThan(1);
				for (const line of lines) expect(line.querySelector("[data-slot='avatar']")).not.toBeNull();
			},
			{ timeout: 20_000 },
		);
		// As a count's patient list shows them: the avatar centered on the name and where they are in grey ("Sidney
		// Regional · MICU Bed 11"); then the answer's details below.
		await waitFor(() => expect(chat.getByRole("log", { name: "Conversation" })).toHaveAttribute("aria-busy", "false"), {
			timeout: 30_000,
		});
		for (const line of answer.querySelectorAll("li")) {
			const [name, place, details] = line.querySelectorAll("p");
			await expect(name.textContent).toMatch(/^[^(:]+, [^(:]+$/);
			await expect(place.textContent).toMatch(/^[^(]+ · [^(]+$/);
			await expect(details.textContent).not.toMatch(/^[(:]/);
			const avatar = line.querySelector("[data-slot='avatar']")!.getBoundingClientRect();
			const middle = (name.getBoundingClientRect().top + place.getBoundingClientRect().bottom) / 2;
			await expect(Math.abs(avatar.top + avatar.height / 2 - middle)).toBeLessThanOrEqual(1);
		}
		// Each name opens the patient's page, and the chat closes and starts over (Nov 11, 2026, user's calls).
		const first = answer.querySelector("li p") as HTMLElement;
		const patientName = first.textContent ?? "";
		await userEvent.click(within(first).getByRole("button", { name: patientName }));
		await expect(await canvas.findByRole("heading", { level: 1, name: patientName })).toBeInTheDocument();
		await waitFor(() => expect(canvas.queryByRole("complementary", { name: "Ask Intercept Live" })).toBeNull());
		// The Sidebar's (the patient's header has one too).
		await userEvent.click(canvas.getAllByRole("button", { name: "Ask Intercept Live" })[0]);
		const reopened = within(await canvas.findByRole("complementary", { name: "Ask Intercept Live" }));
		await expect(reopened.queryByText("Who is on oxygen?")).toBeNull();
	},
};

/**
 * The latest activity (Nov 10, 2026, user's calls): what a physician reviewing it asks next, as follow-ups. A list cut
 * at 8 patients ends "…and 18 more." with Show all on that line, which expands the same list with only the patients it
 * hadn't shown.
 */
export const AskInterceptActivityFollowUps: Story = {
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Ask Intercept Live" }));
		const chat = await openedChat(canvas);
		await userEvent.type(chat.getByRole("combobox", { name: "Ask Intercept Live" }), "What happened overnight?{Enter}");
		const followUps = within(await chat.findByRole("list", { name: "Follow-up actions" }, { timeout: 30_000 }));
		await expect(followUps.getAllByRole("button").map((button) => button.textContent)).toEqual([
			"Who needs attention first?",
			"Which alerts are still open?",
			"What's overdue?",
			"Any results still pending?",
			"What changed in the last hour?",
		]);
		const showAll = chat.getByRole("button", { name: "Show all" });
		const cut = showAll.closest("p") as HTMLElement;
		await expect(cut).toHaveTextContent(/^…and \d+ more\. Show all$/);
		const hidden = Number(cut.textContent?.match(/\d+/)?.[0]);
		const answer = cut.parentElement as HTMLElement;
		const shown = answer.querySelectorAll("li").length;
		await userEvent.click(showAll);
		// The same answer's list expands in place with only the ones it hadn't shown: no new question, no "…and n more".
		await waitFor(() => expect(answer.querySelectorAll("li")).toHaveLength(shown + hidden));
		await expect(chat.queryByText(/^…and \d+ more/)).toBeNull();
		await expect(chat.queryByRole("button", { name: "Show all" })).toBeNull();
		await expect(chat.getAllByText("What happened overnight?")).toHaveLength(1);
	},
};

/**
 * An answer with no follow-ups of its own, the shift brief, ends with suggested questions not asked yet (Nov 10, 2026,
 * user's call): up to 4, for where the clinician is in their shift (starting it, or on it a while).
 */
export const AskInterceptSuggestedFollowUps: Story = {
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Ask Intercept Live" }));
		const chat = await openedChat(canvas);
		const suggestions = within(await chat.findByRole("list", { name: "Suggested questions" }, { timeout: 15_000 }));
		const offered = suggestions.getAllByRole("button").map((button) => button.textContent ?? "");
		const brief = "Brief me for the start of my shift";
		await userEvent.type(chat.getByRole("combobox", { name: "Ask Intercept Live" }), `${brief}{Enter}`);
		const followUps = within(await chat.findByRole("list", { name: "Follow-up actions" }, { timeout: 30_000 }));
		const next = followUps.getAllByRole("button").map((button) => button.textContent ?? "");
		// The set the chat started with for this point of the shift, in its order, less the one asked, up to 4.
		await expect(next).toEqual(offered.filter((question) => question !== brief).slice(0, 4));
	},
};

/** Everyone on the sample directory: the census, the patients treated before and two with an uncertain status (pending reconciliation, unknown). */
const directory = [...samplePatients, ...samplePastPatients, ...sampleUncertainStatusPatients];

/** What the results line says: "34 patients", "11 of 34 patients". */
const resultsCount = (canvasElement: HTMLElement) =>
	canvasElement.querySelector("[data-results-count]")?.textContent?.trim() ?? "";

/** The Table view (the default on a desktop; the test browser is narrow, so cards are its default) and its table. */
async function showTable(canvas: ReturnType<typeof within>, userEvent: { click: (element: Element) => Promise<void> }) {
	const button = canvas.getByRole("button", { name: "Table" });
	if (button.getAttribute("aria-pressed") !== "true") await userEvent.click(button);
	return canvas.findByRole("table", { name: "Patients" });
}

/**
 * The directory's table: identity, status, location, the attending, last encounter, clinical context and the "…"
 * menu. No NEWS2 or alert column: those are Monitoring's. A row per patient, past patients included.
 */
export const TableView: Story = {
	play: async ({ canvas, userEvent }) => {
		const table = within(await showTable(canvas, userEvent));
		const headers = table.getAllByRole("columnheader").map((header) => header.textContent);
		await expect(headers).toEqual([
			"Patient",
			"Status",
			"Location",
			"Attending",
			"Last encounter",
			"Clinical context",
			"Actions",
		]);
		await expect(table.queryByRole("columnheader", { name: "NEWS2" })).toBeNull();
		await expect(table.getAllByRole("row")).toHaveLength(directory.length + 1);
		// Every status the data can have shows: Current, Pending reconciliation, Transferred, Discharged, Status unknown.
		for (const status of ["Current", "Pending reconciliation", "Transferred", "Discharged", "Status unknown"]) {
			await expect(table.getAllByText(status).length).toBeGreaterThan(0);
		}
		// A transfer says where it went; status is a word and an icon, never color alone.
		const foster = table.getByRole("row", { name: /Foster, Gary/ });
		await expect(foster).toHaveTextContent("Transferred");
		await expect(foster).toHaveTextContent("To Denver Health");
	},
};

/**
 * A status's details show on hover (or keyboard focus) of its badge, in a tooltip, so the column stays one line: where a
 * transfer went and when, when a patient was discharged, what an uncertain status means. Screen readers get them with
 * the badge.
 */
export const StatusDetails: Story = {
	play: async ({ canvas, userEvent }) => {
		const table = within(await showTable(canvas, userEvent));
		const foster = within(table.getByRole("row", { name: /Foster, Gary/ }));
		const badge = foster.getByText("Transferred");
		await expect(badge).toBeVisible();
		// Not on screen until hovered.
		await expect(document.querySelector("[data-slot='tooltip-content']")).toBeNull();
		await userEvent.hover(badge);
		await waitFor(() => {
			const tooltip = document.querySelector("[data-slot='tooltip-content']");
			expect(tooltip).toHaveTextContent("To Denver Health");
			expect(tooltip).toHaveTextContent(/Transferred .* · \d+ hr ago/);
		});
	},
};

/** The whole row opens the patient's page; so does Enter on the name, the row's keyboard target. */
export const OpenFromRow: Story = {
	play: async ({ canvas, userEvent }) => {
		const table = within(await showTable(canvas, userEvent));
		await userEvent.click(within(table.getByRole("row", { name: /Davis, Linda/ })).getByText("Sidney Regional"));
		await waitFor(() => expect(canvas.getByRole("heading", { level: 1 })).toHaveTextContent("Davis"));
	},
};

/** By keyboard: the name is a button in the row's first cell; Enter opens the patient, a discharged one too. */
export const OpenWithKeyboard: Story = {
	play: async ({ canvas, userEvent }) => {
		const table = within(await showTable(canvas, userEvent));
		table.getByRole("button", { name: "Brooks, Karen" }).focus();
		await userEvent.keyboard("{Enter}");
		await waitFor(() => expect(canvas.getByRole("heading", { level: 1 })).toHaveTextContent("Brooks"));
	},
};

/** The "…" menu: Open patient and Copy patient link, no clinical actions. */
export const RowActions: Story = {
	play: async ({ canvas, userEvent }) => {
		await showTable(canvas, userEvent);
		await userEvent.click(canvas.getByRole("button", { name: "More for Miller, Sarah" }));
		const items = (await screen.findAllByRole("menuitem")).map((item) => item.textContent);
		await expect(items).toEqual(["Open patient", "Copy patient link"]);
		await userEvent.click(screen.getByRole("menuitem", { name: "Open patient" }));
		await waitFor(() => expect(canvas.getByRole("heading", { level: 1 })).toHaveTextContent("Miller"));
	},
};

/** My patients narrows to the clinician's own, past patients included: "11 of 34 patients". Pressed again, everyone. */
export const MyPatients: Story = {
	play: async ({ canvas, canvasElement, userEvent }) => {
		const mine = directory.filter((patient) => patient.mine).length;
		const chip = canvas.getByRole("button", { name: /^My patients/ });
		await expect(chip).toHaveAttribute("aria-pressed", "false");
		await expect(chip).toHaveTextContent(new RegExp(`·\\s*${mine}$`));
		await expect(resultsCount(canvasElement)).toBe(`${directory.length} patients`);
		await userEvent.click(chip);
		await waitFor(() => expect(resultsCount(canvasElement)).toBe(`${mine} of ${directory.length} patients`));
		await userEvent.click(chip);
		await waitFor(() => expect(resultsCount(canvasElement)).toBe(`${directory.length} patients`));
	},
};

/** Current: the patients in hospital now. The rest stay on the page until it's pressed: they're still patients. */
export const CurrentPatients: Story = {
	play: async ({ canvas, canvasElement, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: /^Current/ }));
		await waitFor(() => expect(resultsCount(canvasElement)).toBe(`${samplePatients.length} of ${directory.length} patients`));
	},
};

/**
 * Search leads the filter bar, as on Monitoring: a magnifier that opens on click. Name, MRN, hospital, unit, room or bed;
 * Clear brings everyone back.
 */
export const Search: Story = {
	play: async ({ canvas, canvasElement, userEvent }) => {
		const search = canvas.getByRole("searchbox", { name: "Search patients" });
		await userEvent.click(search);
		await userEvent.type(search, "01033876");
		await waitFor(() => expect(resultsCount(canvasElement)).toBe(`1 of ${directory.length} patients`));
		await expect(canvas.getByText("Miller, Sarah")).toBeInTheDocument();
		await userEvent.click(canvas.getByRole("button", { name: "Clear search" }));
		await waitFor(() => expect(resultsCount(canvasElement)).toBe(`${directory.length} patients`));
		// A hospital and a unit together.
		await userEvent.type(search, "chadron med-surg");
		const chadron = directory.filter((patient) => patient.hospitalId === "chadron" && patient.unit === "Med-Surg").length;
		await waitFor(() => expect(resultsCount(canvasElement)).toBe(`${chadron} of ${directory.length} patients`));
	},
};

/**
 * A search that only matches patients no longer in hospital, with Current on: the page says they exist rather than "no
 * patients found", and Show all statuses brings them in.
 */
export const SearchFindsPastPatients: Story = {
	play: async ({ canvas, canvasElement, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: /^Current/ }));
		await userEvent.click(canvas.getByRole("searchbox", { name: "Search patients" }));
		await userEvent.type(canvas.getByRole("searchbox", { name: "Search patients" }), "Brooks");
		await waitFor(() => expect(canvas.getByText("No current patients found")).toBeVisible());
		await userEvent.click(canvas.getByRole("button", { name: "Show all statuses" }));
		await waitFor(() => expect(resultsCount(canvasElement)).toBe(`1 of ${directory.length} patients`));
		await expect(canvas.getByRole("button", { name: /^Current/ })).toHaveAttribute("aria-pressed", "false");
	},
};

/** Filters: Hospital, Unit, Care team, Patient status, Last encounter and Clinical context. Discharged finds the past stays. */
export const Filters: Story = {
	play: async ({ canvas, canvasElement, userEvent }) => {
		const discharged = directory.filter((patient) => patient.status === "discharged").length;
		await userEvent.click(canvas.getByRole("button", { name: "Filters" }));
		const dialog = within(await screen.findByRole("dialog", { name: "Filters" }));
		for (const group of ["Hospital", "Unit", "Care team", "Patient status", "Last encounter", "Clinical context"]) {
			await expect(dialog.getByText(group)).toBeInTheDocument();
		}
		await expect(dialog.queryByText("NEWS2")).toBeNull();
		await userEvent.click(dialog.getByRole("checkbox", { name: /^Discharged/ }));
		await userEvent.click(dialog.getByRole("button", { name: "Done" }));
		await waitFor(() => expect(screen.queryByRole("dialog", { name: "Filters" })).not.toBeInTheDocument());
		await expect(resultsCount(canvasElement)).toBe(`${discharged} of ${directory.length} patients`);
		await userEvent.click(canvas.getByRole("button", { name: "Filters, 1 picked" }));
		await userEvent.click(await screen.findByRole("button", { name: "Clear all" }));
		await userEvent.click(screen.getByRole("button", { name: "Close Filters" }));
		await waitFor(() => expect(resultsCount(canvasElement)).toBe(`${directory.length} patients`));
	},
};

/**
 * The Filters panel's search narrows the options it shows: "vent" leaves Ventilated, a group's title ("unit") shows its
 * whole group, and a miss says so. Escape clears the search first, then closes the panel.
 */
export const FiltersSearch: Story = {
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Filters" }));
		const search = await screen.findByRole("searchbox", { name: "Search filters" });
		await waitFor(() => expect(search).toHaveFocus());
		await userEvent.type(search, "vent");
		await expect(screen.getByRole("checkbox", { name: /^Ventilated/ })).toBeInTheDocument();
		await expect(screen.queryByRole("checkbox", { name: /^CCU/ })).not.toBeInTheDocument();
		await userEvent.clear(search);
		await userEvent.type(search, "unit");
		await expect(screen.getByRole("checkbox", { name: /^CCU/ })).toBeInTheDocument();
		await expect(screen.queryByRole("checkbox", { name: /^Ventilated/ })).not.toBeInTheDocument();
		await userEvent.clear(search);
		await userEvent.type(search, "zzz");
		await expect(screen.getByText('No filters match "zzz"')).toBeInTheDocument();
		await userEvent.keyboard("{Escape}");
		await expect(search).toHaveValue("");
		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(screen.queryByRole("dialog", { name: "Filters" })).not.toBeInTheDocument());
	},
};

/** Sort: Recently viewed by default, the latest first. No NEWS2 sort: ranking by acuity is Monitoring's. */
export const Sort: Story = {
	play: async ({ canvas, userEvent }) => {
		const sort = canvas.getByRole("combobox", { name: "Sort by" });
		await expect(sort).toHaveTextContent("Recently viewed");
		const latest = [...directory]
			.filter((patient) => patient.lastViewedAt)
			.sort((a, b) => Date.parse(b.lastViewedAt ?? "") - Date.parse(a.lastViewedAt ?? ""))[0];
		const byViewed = within(await showTable(canvas, userEvent));
		await expect(byViewed.getAllByRole("row")[1]).toHaveTextContent(`${latest.lastName}, ${latest.firstName}`);
		await userEvent.click(sort);
		const options = (await screen.findAllByRole("option")).map((option) => option.textContent);
		await expect(options).toEqual([
			"Recently viewed",
			"Patient name",
			"Most recent encounter",
			"Admission date",
			"Hospital",
			"Unit",
		]);
		await userEvent.click(screen.getByRole("option", { name: "Patient name" }));
		const table = within(await showTable(canvas, userEvent));
		const first = [...directory].sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName))[0];
		await expect(table.getAllByRole("row")[1]).toHaveTextContent(`${first.lastName}, ${first.firstName}`);
	},
};

/**
 * Cards: identity, location, status, the attending and last encounter, no flags. No score line: NEWS2 isn't
 * how the directory reads.
 */
export const Cards: Story = {
	play: async ({ canvas, canvasElement, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Cards" }));
		await waitFor(() =>
			expect(canvasElement.querySelectorAll("[data-slot='patient-census-card']")).toHaveLength(directory.length),
		);
		const cards = [...canvasElement.querySelectorAll("[data-slot='patient-census-card']")];
		await expect(cards.some((card) => card.textContent?.includes("NEWS2"))).toBe(false);
		await expect(cards.some((card) => card.textContent?.includes("No tags"))).toBe(false);
		const miller = cards.find((card) => card.textContent?.includes("Miller, Sarah")) as HTMLElement;
		await expect(miller).toHaveTextContent("Current");
		await expect(miller).toHaveTextContent(/Last encounter/);
	},
};

/** A search that matches no one: "No patients found", pointing at what can be searched. */
export const NoResults: Story = {
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("searchbox", { name: "Search patients" }));
		await userEvent.type(canvas.getByRole("searchbox", { name: "Search patients" }), "zzzz");
		await waitFor(() => expect(canvas.getByText("No patients found")).toBeVisible());
		await expect(canvas.getByText("Try another name, MRN, hospital, unit, or adjust your filters.")).toBeInTheDocument();
	},
};

/** Filters that match no one (Current and Discharged): Clear filters brings every patient back. */
export const NoMatches: Story = {
	play: async ({ canvas, canvasElement, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: /^Current/ }));
		await userEvent.click(canvas.getByRole("button", { name: "Filters" }));
		await userEvent.click(await screen.findByRole("checkbox", { name: /^Discharged/ }));
		await userEvent.click(screen.getByRole("button", { name: "Done" }));
		await waitFor(() => expect(canvas.getByText("No patients match these filters")).toBeVisible());
		await userEvent.click(canvas.getByRole("button", { name: "Clear filters" }));
		await waitFor(() => expect(resultsCount(canvasElement)).toBe(`${directory.length} patients`));
	},
};

/**
 * A directory far past the census's few dozen: 50 rows, then Show more adds the next 50. The table stays semantic and
 * quick; filters and search work on everyone, not only what's shown.
 */
export const LargeDirectory: Story = {
	args: {
		patients: Array.from({ length: 4 }, (_, copy) =>
			directory.map((patient) => ({
				...patient,
				id: `${patient.id}-${copy}`,
				mrn: `${copy}${patient.mrn?.slice(1)}`,
			})),
		).flat(),
	},
	play: async ({ canvas, canvasElement, userEvent }) => {
		const total = directory.length * 4;
		const table = within(await showTable(canvas, userEvent));
		await expect(resultsCount(canvasElement)).toBe(`${total} patients`);
		await expect(table.getAllByRole("row")).toHaveLength(50 + 1);
		await userEvent.click(canvas.getByRole("button", { name: "Show 50 more" }));
		await waitFor(() => expect(table.getAllByRole("row")).toHaveLength(100 + 1));
		await expect(canvas.getByRole("button", { name: `Show ${total - 100} more` })).toBeInTheDocument();
	},
};

/** Loading: placeholder rows in the view's shape, and the count line says so. */
export const Loading: Story = {
	args: { loading: true },
	play: async ({ canvasElement }) => {
		await expect(resultsCount(canvasElement)).toBe("Loading patients…");
	},
};

/** The directory couldn't load: an error state, with Try again. */
export const LoadError: Story = {
	args: { loadError: true, onRetry: fn() },
	play: async ({ args, canvas, userEvent }) => {
		// The empty state Reveals in (opacity 0 → 1).
		await waitFor(() => expect(canvas.getByText("Patients couldn't load")).toBeVisible());
		await userEvent.click(canvas.getByRole("button", { name: "Try again" }));
		await expect(args.onRetry).toHaveBeenCalled();
	},
};

/** The Sidebar's Monitoring opens the Monitoring page: the census as live monitors, where alerts and NEWS2 lead. */
export const GoToMonitoring: Story = {
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: /^Monitoring/ }));
		await waitFor(() => expect(canvas.getByRole("group", { name: "Density" })).toBeVisible());
	},
};

/** No patients at all: an empty state explains what will appear. */
export const Empty: Story = {
	args: { patients: [] },
	play: async ({ canvas }) => {
		await waitFor(() => expect(canvas.getByText("No patients yet")).toBeVisible());
	},
};

/**
 * The Messages page from the Patients layout: every conversation, one per person, the same as the Messages layout shows
 * (they come in through `messages`). The first, Kelly Ortiz's urgent one, is open; the Sidebar moves back to Patients.
 */
export const MessagesPage: Story = {
	args: { defaultPage: "Messages" },
	play: async ({ canvas, canvasElement, userEvent }) => {
		const conversations = within(await canvas.findByRole("region", { name: "Conversations" }));
		const first = within(conversations.getByRole("list")).getAllByRole("button")[0];
		await expect(first).toHaveAttribute("aria-current", "true");
		await expect(first).toHaveAccessibleName(/^Kelly Ortiz, RN, Urgent/);
		await expect(await canvas.findByRole("log", { name: "Messages with Kelly Ortiz, RN" })).toBeVisible();
		await userEvent.click(canvas.getByRole("button", { name: "Patients" }));
		await waitFor(() => expect(resultsCount(canvasElement)).toBe(`${directory.length} patients`));
	},
};

/**
 * Messages has no Ask Intercept Live of its own: the Sidebar's opens about the open conversation's patient (here Kelly
 * Ortiz's, about Sarah Miller), as it does on a patient's page, without asking anything. Another conversation, opened
 * with the chat closed, gives the next opening its patient.
 */
export const AskFromMessages: Story = {
	args: { defaultPage: "Messages" },
	play: async ({ canvas, canvasElement, userEvent }) => {
		const conversations = within(await canvas.findByRole("region", { name: "Conversations" }));
		await expect(canvas.queryByRole("button", { name: /^Ask Intercept Live about/ })).not.toBeInTheDocument();
		const first = within(conversations.getByRole("list")).getAllByRole("button")[0];
		const about = /About (.+?), /.exec(first.getAttribute("aria-label") ?? "")?.[1] ?? "";
		await expect(about).not.toBe("");
		// The details column has no Ask button of its own; below xl the header's patient bar opens the patient.
		const details = canvasElement.querySelector<HTMLElement>("[aria-label='Patient details']");
		if (details) await expect(within(details).queryAllByRole("button", { name: /Ask Intercept Live/i, hidden: true })).toHaveLength(0);
		await expect(canvas.getByRole("button", { name: `${about}, open patient` })).toBeVisible();
		await userEvent.click(canvas.getByRole("button", { name: "Ask Intercept Live" }));
		const panel = within(await canvas.findByRole("complementary", { name: "Ask Intercept Live" }));
		const [firstName, ...rest] = about.split(" ");
		await expect(
			await panel.findByRole("button", { name: `Remove ${rest.join(" ")}, ${firstName} from the chat` }),
		).toBeVisible();
	},
};

/**
 * A page that isn't built yet (here Protocols): its title and an empty state. Inbox, Messages, Schedule and Analytics are
 * built (this layout passes their data), so they're no longer empty pages.
 */
export const EmptyPage: Story = {
	args: { defaultPage: "Protocols" },
};

/** Plays the sample live feed into the shell: its alerts and the Monitoring page's values. Patients holds still. */
function LiveDirectory(props: React.ComponentProps<typeof Patients>) {
	const {
		patients: monitoring,
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
		onTransitionDecision,
		withScenarioInbox,
		onBundleDecision,
		onConsultChange,
		onConsultNote,
		logAlertAction,
	} = useSampleLiveFeed();
	// The page and patient in the address (`?page=…&patient=…`), so a copied link opens the same place.
	const location = usePrototypeLocation(interceptLivePages, {
		page: props.defaultPage ?? "Patients",
		patient: props.defaultPatient,
	});
	const monitoringPatients = useLivePatients(monitoring);
	// The scenarios change their patients' Census cards and records too (and add Scenario 2's arrival), so their cards, their details and the chat follow.
	const censusPatients = withScenarioCensus(props.patients);
	const scenarioRecords = props.patientRecords && withScenarioRecords(props.patientRecords);
	const alertDetails = withScenarioAlertDetails(
		sampleAlertDetails({ alerts: everyAlert, censusPatients, monitoringPatients, records: scenarioRecords }),
	);
	// Her page tracks what was done and decided: the activity log, the care plan, the orders and the consult note.
	const patientRecords = scenarioRecords && withScenarioActivity(scenarioRecords, alertDetails);
	// Every alert action goes in the log, wherever it was taken.
	const live = useLiveAskIntercept(
		alerts,
		monitoringPatients,
		(alertId, action) => {
			logAlertAction(alertId, action, props.escalationTargets);
			props.onAlertAction?.(alertId, action);
		},
		{ censusPatients, patientRecords },
	);
	return (
		<Patients
			{...props}
			patients={withFeedAlerts(censusPatients, alerts)}
			patientRecords={patientRecords}
			monitoringPatients={monitoringPatients}
			alertDetails={alertDetails}
			patientConsults={samplePatientConsults({ censusPatients, monitoringPatients: monitoringPatients, records: patientRecords })}
			onPathwayDecision={onPathwayDecision}
			onTransferDecision={onTransferDecision}
			onDischargeDecision={onDischargeDecision}
			onTransitionDecision={onTransitionDecision}
			// Scenario 6 adds a follow-up to the Inbox (the hub tele-RN's phone check), then marks it done.
			inbox={props.inbox && { ...props.inbox, items: withScenarioInbox(props.inbox.items) }}
			onBundleDecision={onBundleDecision}
			onConsultChange={onConsultChange}
			onConsultNote={onConsultNote}
			alerts={alerts}
			askIntercept={live.askIntercept}
			askInterceptNotice={live.notice}
			onAlertAction={live.onAlertAction}
			liveFeed={caption}
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
