import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, screen, waitFor, within } from "storybook/test";

// Story-only helper, not part of the card's public API.
import { useLivePatients } from "@/components/cards/patient-monitoring-card/use-live-vitals";

import { sampleEscalationTargets, sampleMonitoringAlerts, sampleMonitoringPatients } from "../monitoring/sample-monitoring";
import { samplePatientRecords } from "../patient-details/sample-patient-details";
import { sampleHospitals, sampleShiftEndsAt, sampleTeam, sampleUser } from "../sample-data/sample-workspace";
import { sampleAskIntercept, useLiveAskIntercept } from "../sample-data/sample-ask-intercept";
import { prototypeShortcuts, resetPrototype } from "../sample-data/prototype-links";
import { useSampleLiveFeed, withFeedAlerts } from "../sample-data/use-sample-live-feed";
import { Census } from "./census";
import { samplePatients } from "./sample-census";

const meta = {
	title: "Layouts/Intercept Live/Census",
	component: Census,
	parameters: {
		layout: "fullscreen",
	},
	// The Monitoring page's monitors are live here too (`useLivePatients`), and Ask Intercept Live answers from the same
	// alerts (with the queue's actions) and values (`useLiveAskIntercept`).
	render: function Render(args) {
		const monitoringPatients = useLivePatients(args.monitoringPatients ?? []);
		const live = useLiveAskIntercept(args.alerts ?? [], monitoringPatients, args.onAlertAction);
		return (
			<Census
				{...args}
				monitoringPatients={monitoringPatients}
				askIntercept={live.askIntercept}
			askInterceptNotice={live.notice}
				onAlertAction={live.onAlertAction}
			/>
		);
	},
	args: {
		// The app opens on Monitoring; these stories show the Census page.
		defaultPage: "Census",
		hospitals: sampleHospitals,
		patients: samplePatients,
		monitoringPatients: sampleMonitoringPatients,
		patientRecords: samplePatientRecords,
		onPatientDetailsAction: fn(),
		alerts: sampleMonitoringAlerts,
		escalationTargets: sampleEscalationTargets,
		user: sampleUser,
		askIntercept: sampleAskIntercept,
		shiftEndsAt: sampleShiftEndsAt,
		team: sampleTeam,
		unreadMessages: 3,
		onOpenPatient: fn(),
		onAlertAction: fn(),
		onOpenLiveFeed: fn(),
	},
} satisfies Meta<typeof Census>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Hospital tabs, the My patients chip and the quick views filter the grid; cards are sorted by score (NEWS2).
 * The live feed plays as on Monitoring (PRD SV-081): at 1.5 s, at 8 s, then every 15 to 30 s, an alert fires, changes
 * severity or resolves. The hospital bar says what changed ("Live feed: …"), and the live feed panel's queue, the counts
 * and the List's Alert column follow (`withFeedAlerts`). The cards hold still and show no alert: the Census is for
 * managing patients, so it never re-sorts on its own (Monitoring does, and shows alerts on its cards). Then it loops.
 */
export const Default: Story = {
	render: (args) => <LiveCensus {...args} />,
};

/** The same screen without the scripted feed: the sample as it starts, nothing changing. */
export const Static: Story = {};

/**
 * My patients: a chip like the quick views, off by default, so the grid starts with everyone. Pressed, it narrows the
 * grid to the user's own and the title reads "6 of 18 patients"; pressed again, everyone is back.
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
		await expect(args.onAlertAction).toHaveBeenCalledWith("a1", { type: "acknowledge" });
		await expect(queue.getByText(/Acknowledged by you/)).toBeVisible();
	},
};

/**
 * Group by location (the switch at the right of the filter chips): a Kanban board, a column per hospital, the sort
 * inside each.
 */
export const GroupByLocation: Story = {
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("switch", { name: "Group by location" }));
		for (const hospital of new Set(samplePatients.map((patient) => patient.hospital))) {
			await waitFor(() => expect(canvas.getByRole("region", { name: hospital })).toBeInTheDocument());
		}
	},
};

/** Filters that empty a hospital keep its column, so the board's columns don't move or widen. */
export const KanbanFiltered: Story = {
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("switch", { name: "Group by location" }));
		await userEvent.click(canvas.getByRole("button", { name: /^Sepsis watch/ }));
		for (const hospital of new Set(samplePatients.map((patient) => patient.hospital))) {
			await waitFor(() => expect(canvas.getByRole("region", { name: hospital })).toBeInTheDocument());
		}
		await expect(canvas.getAllByText("No patients match these filters").length).toBeGreaterThan(0);
	},
};

/** Group by location holds across pages: the shell keeps it, so Monitoring opens grouped and the Census stays so. */
export const GroupingAcrossPages: Story = {
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("switch", { name: "Group by location" }));
		await userEvent.click(canvas.getByRole("button", { name: "Monitoring" }));
		await waitFor(() => expect(canvas.getByRole("switch", { name: "Group by location" })).toBeChecked());
		await userEvent.click(canvas.getByRole("button", { name: "Census" }));
		await waitFor(() => expect(canvas.getByRole("heading", { level: 1, name: /across/ })).toBeInTheDocument());
		await expect(canvas.getByRole("switch", { name: "Group by location" })).toBeChecked();
	},
};

/**
 * The search leads the filter chips: it opens on click, narrows the cards and the chips' counts, and clears. It
 * searches everything the card shows, the score included.
 */
export const Search: Story = {
	play: async ({ canvas, userEvent }) => {
		const search = canvas.getByRole("searchbox", { name: "Search patients" });
		await userEvent.click(search);
		await userEvent.type(search, "hayes");
		await waitFor(() => expect(canvas.getByRole("heading", { level: 1 })).toHaveTextContent(/^1 patient at /));
		await expect(canvas.getByRole("button", { name: /^My patients/ })).toHaveTextContent(/1$/);
		await userEvent.click(canvas.getByRole("button", { name: "Clear search" }));
		await waitFor(() => expect(canvas.getByRole("heading", { level: 1 })).toHaveTextContent(/^18 patients/));
		// Anything the card shows: Miller's score, "NEWS2 17".
		await userEvent.type(search, "17");
		await waitFor(() => expect(canvas.getByRole("heading", { level: 1 })).toHaveTextContent(/^2 patients/));
		await expect(canvas.getByText("Miller, Sarah")).toBeInTheDocument();
	},
};

/**
 * Filters opens a panel on the right (where the live feed opens). Options narrow the cards as they're picked, the
 * button counts them, and Clear all brings everyone back.
 */
export const Filters: Story = {
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Filters" }));
		const ventilated = await screen.findByRole("checkbox", { name: "Ventilated" });
		await userEvent.click(ventilated);
		await expect(screen.getByText("5 of 18 patients in this view")).toBeInTheDocument();
		// A modal: the page behind is hidden from assistive tech until Apply closes the sheet.
		await userEvent.click(screen.getByRole("button", { name: "Apply" }));
		await waitFor(() => expect(screen.queryByRole("dialog", { name: "Filters" })).not.toBeInTheDocument());
		await expect(canvas.getByRole("heading", { level: 1 })).toHaveTextContent(/^5 patients/);
		const filtersButton = canvas.getByRole("button", { name: "Filters, 1 picked" });
		await expect(filtersButton).toHaveAttribute("aria-expanded", "false");
		await userEvent.click(filtersButton);
		await userEvent.click(await screen.findByRole("button", { name: "Clear all" }));
		await userEvent.click(screen.getByRole("button", { name: "Apply" }));
		await waitFor(() => expect(canvas.getByRole("heading", { level: 1 })).toHaveTextContent(/^18 patients/));
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
		await expect(screen.getByRole("checkbox", { name: "Ventilated" })).toBeInTheDocument();
		await expect(screen.queryByRole("checkbox", { name: "OB-ICU" })).not.toBeInTheDocument();
		await userEvent.clear(search);
		await userEvent.type(search, "unit");
		await expect(screen.getByRole("checkbox", { name: "OB-ICU" })).toBeInTheDocument();
		await expect(screen.queryByRole("checkbox", { name: "Ventilated" })).not.toBeInTheDocument();
		await userEvent.clear(search);
		await userEvent.type(search, "zzz");
		await expect(screen.getByText('No filters match "zzz"')).toBeInTheDocument();
		await userEvent.keyboard("{Escape}");
		await expect(search).toHaveValue("");
		await expect(screen.getByRole("dialog", { name: "Filters" })).toBeInTheDocument();
		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(screen.queryByRole("dialog", { name: "Filters" })).not.toBeInTheDocument());
	},
};

/** Group by location's other view (`groupedView="sections"`, the Prototype menu's Sections by location): a grid section each. */
export const GroupedGrid: Story = {
	args: { groupedView: "sections" },
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("switch", { name: "Group by location" }));
		const hospitals = new Set(samplePatients.map((patient) => patient.hospital)).size;
		await waitFor(() => expect(canvas.getAllByRole("heading", { level: 2 })).toHaveLength(hospitals));
		await expect(canvas.queryByRole("region", { name: "CVMC" })).not.toBeInTheDocument();
	},
};

/**
 * One hospital picked on its tab turns Group by location off (the switch disabled); All hospitals brings back the
 * user's choice, here the board.
 */
export const GroupingOneHospital: Story = {
	play: async ({ canvas, userEvent }) => {
		const grouping = canvas.getByRole("switch", { name: "Group by location" });
		await userEvent.click(grouping);
		await waitFor(() => expect(canvas.getByRole("region", { name: "CVMC" })).toBeInTheDocument());
		await userEvent.click(canvas.getByRole("tab", { name: /^CVMC/ }));
		await waitFor(() => expect(canvas.queryByRole("region", { name: "CVMC" })).not.toBeInTheDocument());
		await expect(grouping).not.toBeChecked();
		await expect(grouping).toBeDisabled();
		await userEvent.click(canvas.getByRole("tab", { name: /^All hospitals/ }));
		await waitFor(() => expect(canvas.getByRole("region", { name: "CVMC" })).toBeInTheDocument());
		await expect(grouping).toBeChecked();
	},
};

/** The Prototype menu's Sections by location (Views) turns grouping on, as hospital sections in the grid. */
export const GroupedGridFromPrototypeMenu: Story = {
	render: (args) => <LiveCensus {...args} />,
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Prototype" }));
		await userEvent.click(await screen.findByRole("menuitemcheckbox", { name: "Sections by location" }));
		await waitFor(() => expect(canvas.getByRole("switch", { name: "Group by location" })).toBeChecked());
		await expect(canvas.queryByRole("region", { name: "CVMC" })).not.toBeInTheDocument();
	},
};

/** Compact density: the small card (`size="sm"`), one more a row than Comfortable at every width. */
export const Compact: Story = {
	play: async ({ canvas, canvasElement, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Compact" }));
		await waitFor(() =>
			expect(canvasElement.querySelectorAll("[data-slot='patient-card'][data-size='sm']")).toHaveLength(samplePatients.length),
		);
	},
};

/** List density: the census as a table, a row per patient with its alert, NEWS2, 24 h change and tags. */
export const List: Story = {
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "List" }));
		const table = await canvas.findByRole("table");
		await expect(within(table).getByRole("columnheader", { name: "NEWS2" })).toBeInTheDocument();
		// One header row plus a row per patient.
		await expect(within(table).getAllByRole("row")).toHaveLength(samplePatients.length + 1);
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

/** Filters that match nobody (Rising score in OB-ICU): an empty state with Clear filters, which brings every patient back. */
export const NoMatches: Story = {
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: /Rising score/ }));
		await userEvent.click(canvas.getByRole("button", { name: "Filters" }));
		await userEvent.click(await screen.findByRole("checkbox", { name: "OB-ICU" }));
		// The empty state Reveals in (opacity 0 → 1), so wait for it to finish appearing.
		await waitFor(() => expect(canvas.getByText("No patients match these filters")).toBeVisible());
	},
};

/** A page that isn't built yet (here Alert Queue): its title and an empty state. Every Sidebar page but Census has one. */
export const EmptyPage: Story = {
	args: { defaultPage: "Alert Queue" },
};

/** Plays the sample live feed into the Census: its alerts and the Monitoring page's values. */
function LiveCensus(props: React.ComponentProps<typeof Census>) {
	const { patients: monitoring, alerts, caption, restart } = useSampleLiveFeed();
	// The Prototype menu's Sections by location view (Group by location's Kanban board is the default).
	const [groupedGrid, setGroupedGrid] = React.useState(false);
	const monitoringPatients = useLivePatients(monitoring);
	const live = useLiveAskIntercept(alerts, monitoringPatients, props.onAlertAction);
	return (
		<Census
			{...props}
			patients={withFeedAlerts(props.patients, alerts)}
			monitoringPatients={monitoringPatients}
			alerts={alerts}
			askIntercept={live.askIntercept}
			askInterceptNotice={live.notice}
			onAlertAction={live.onAlertAction}
			liveFeed={caption}
			prototype={prototypeShortcuts({
				restartLiveFeed: restart,
				groupedGrid,
				onToggleGroupedGrid: () => setGroupedGrid(!groupedGrid),
			})}
			groupedView={groupedGrid ? "sections" : "board"}
			onResetPrototype={resetPrototype}
		/>
	);
}
