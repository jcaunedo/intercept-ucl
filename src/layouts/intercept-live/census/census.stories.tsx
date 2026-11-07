import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, screen, waitFor, within } from "storybook/test";

// Story-only helper, not part of the card's public API.
import { useLivePatients } from "@/components/cards/patient-monitoring-card/use-live-vitals";

import { sampleAlertDetails, samplePatientConsults } from "../alert-modal/sample-alert-modal";
import { sampleEscalationTargets, sampleMonitoringAlerts, sampleMonitoringPatients } from "../monitoring/sample-monitoring";
import { samplePatientRecords } from "../patient-details/sample-patient-details";
import { sampleHospitals, sampleShiftEndsAt, sampleTeam, sampleUser } from "../sample-data/sample-workspace";
import { sampleAskIntercept, useLiveAskIntercept } from "../sample-data/sample-ask-intercept";
import { interceptLivePages } from "../intercept-live";
import { prototypeShortcuts, resetPrototype, usePrototypeLocation } from "../sample-data/prototype-links";
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
 * grid to the user's own and the title reads "8 of 26 patients"; pressed again, everyone is back.
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

/** New patients, right after My patients: the ten who arrived on their unit in the last 24 h. */
export const NewPatients: Story = {
	play: async ({ canvas, userEvent }) => {
		const chip = canvas.getByRole("button", { name: /^New patients/ });
		await expect(chip).toHaveTextContent(/·\s*10$/);
		await userEvent.click(chip);
		await waitFor(() =>
			expect(canvas.getByRole("heading", { level: 1 })).toHaveTextContent(/^10 patients/),
		);
	},
};

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
		await expect(await chat.findByText("What changed?")).toBeVisible();
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
 * Group by hospital (the switch at the right of the filter chips): a Kanban board, a column per hospital, the sort
 * inside each.
 */
export const GroupByHospital: Story = {
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("switch", { name: "Group by hospital" }));
		for (const hospital of new Set(samplePatients.map((patient) => patient.hospital))) {
			await waitFor(() => expect(canvas.getByRole("region", { name: hospital })).toBeInTheDocument());
		}
	},
};

/** Filters that empty a hospital drop its column: only hospitals with patients show (Nov 3, 2026). */
export const KanbanFiltered: Story = {
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("switch", { name: "Group by hospital" }));
		const hospitals = [...new Set(samplePatients.map((patient) => patient.hospital))];
		for (const hospital of hospitals) {
			await waitFor(() => expect(canvas.getByRole("region", { name: hospital })).toBeInTheDocument());
		}
		await userEvent.click(canvas.getByRole("button", { name: /^Sepsis watch/ }));
		await waitFor(() => {
			const shown = hospitals.filter((hospital) => canvas.queryByRole("region", { name: hospital }));
			expect(shown.length).toBeGreaterThan(0);
			expect(shown.length).toBeLessThan(hospitals.length);
		});
		await expect(canvas.queryByText("No patients match these filters")).not.toBeInTheDocument();
	},
};

/** Group by hospital holds across pages: the shell keeps it, so Monitoring opens grouped and the Census stays so. */
export const GroupingAcrossPages: Story = {
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("switch", { name: "Group by hospital" }));
		await userEvent.click(canvas.getByRole("button", { name: /^Monitoring/ }));
		await waitFor(() => expect(canvas.getByRole("switch", { name: "Group by hospital" })).toBeChecked());
		await userEvent.click(canvas.getByRole("button", { name: "Census" }));
		await waitFor(() => expect(canvas.getByRole("heading", { level: 1, name: /across/ })).toBeInTheDocument());
		await expect(canvas.getByRole("switch", { name: "Group by hospital" })).toBeChecked();
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
		await waitFor(() => expect(canvas.getByRole("heading", { level: 1 })).toHaveTextContent(new RegExp(`^${samplePatients.length} patients`)));
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
		await expect(screen.getByText(`5 of ${samplePatients.length} patients in this view`)).toBeInTheDocument();
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
		await waitFor(() => expect(canvas.getByRole("heading", { level: 1 })).toHaveTextContent(new RegExp(`^${samplePatients.length} patients`)));
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
		await expect(screen.queryByRole("checkbox", { name: "CCU" })).not.toBeInTheDocument();
		await userEvent.clear(search);
		await userEvent.type(search, "unit");
		await expect(screen.getByRole("checkbox", { name: "CCU" })).toBeInTheDocument();
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

/** Group by hospital's other view (`groupedView="sections"`): a grid section each. */
export const GroupedGrid: Story = {
	args: { groupedView: "sections" },
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("switch", { name: "Group by hospital" }));
		const hospitals = new Set(samplePatients.map((patient) => patient.hospital)).size;
		await waitFor(() => expect(canvas.getAllByRole("heading", { level: 2 })).toHaveLength(hospitals));
		await expect(canvas.queryByRole("region", { name: "Sidney Regional" })).not.toBeInTheDocument();
	},
};

/**
 * One hospital picked on its tab turns Group by hospital off (the switch disabled); All hospitals brings back the
 * user's choice, here the board.
 */
export const GroupingOneHospital: Story = {
	play: async ({ canvas, userEvent }) => {
		const grouping = canvas.getByRole("switch", { name: "Group by hospital" });
		await userEvent.click(grouping);
		await waitFor(() => expect(canvas.getByRole("region", { name: "Sidney Regional" })).toBeInTheDocument());
		await userEvent.click(canvas.getByRole("tab", { name: /^Sidney/ }));
		await waitFor(() => expect(canvas.queryByRole("region", { name: "Sidney Regional" })).not.toBeInTheDocument());
		await expect(grouping).not.toBeChecked();
		await expect(grouping).toBeDisabled();
		await userEvent.click(canvas.getByRole("tab", { name: /^All hospitals/ }));
		await waitFor(() => expect(canvas.getByRole("region", { name: "Sidney Regional" })).toBeInTheDocument());
		await expect(grouping).toBeChecked();
	},
};

/** Compact density: the small card (`size="sm"`), one more a row than Comfortable at every width. */
export const Compact: Story = {
	play: async ({ canvas, canvasElement, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Compact" }));
		await waitFor(() =>
			expect(canvasElement.querySelectorAll("[data-slot='patient-census-card'][data-size='sm']")).toHaveLength(samplePatients.length),
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
		await userEvent.click(canvas.getByRole("button", { name: /^Monitoring/ }));
		await waitFor(() => expect(canvas.getByRole("group", { name: "Density" })).toBeVisible());
	},
};

/** No patients at all: the title reads 0 and an empty state explains what will appear. */
export const Empty: Story = {
	args: { patients: [] },
};

/**
 * A hospital with no patients at all (here Bridgeport, its five left out of the roster): its tab says so, "No patients
 * at Bridgeport Valley", rather than blaming the filters, and Show all hospitals goes back to everyone.
 */
export const EmptyHospital: Story = {
	args: {
		patients: samplePatients.filter((patient) => patient.hospitalId !== "bridgeport"),
		monitoringPatients: sampleMonitoringPatients.filter((patient) => patient.hospitalId !== "bridgeport"),
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

/** Filters that match nobody (Rising score in CCU): an empty state with Clear filters, which brings every patient back. */
export const NoMatches: Story = {
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: /Rising score/ }));
		await userEvent.click(canvas.getByRole("button", { name: "Filters" }));
		await userEvent.click(await screen.findByRole("checkbox", { name: "CCU" }));
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
		onBundleDecision,
		onConsultChange,
		onConsultNote,
		logAlertAction,
	} = useSampleLiveFeed();
	// The page and patient in the address (`?page=…&patient=…`), so a copied link opens the same place.
	const location = usePrototypeLocation(interceptLivePages, {
		page: props.defaultPage ?? "Census",
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
		<Census
			{...props}
			patients={withFeedAlerts(censusPatients, alerts)}
			patientRecords={patientRecords}
			monitoringPatients={monitoringPatients}
			alertDetails={alertDetails}
			patientConsults={samplePatientConsults({ censusPatients, monitoringPatients: monitoringPatients, records: patientRecords })}
			onPathwayDecision={onPathwayDecision}
			onTransferDecision={onTransferDecision}
			onDischargeDecision={onDischargeDecision}
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
			onLocationChange={location.onLocationChange}
		/>
	);
}
