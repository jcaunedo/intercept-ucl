import * as React from "react";

// How a page opens a patient's details over itself (PRD Patient details PD-001, PD-015). The shell provides it; a page
// calls it from a card, a list row or an alert. Outside the shell (a page's own story) there's no provider, and opening
// a patient only calls the page's `onOpenPatient`.

type PatientNavigation = {
	/**
	 * Opens the patient's details over the current page. `list` is the patients the page shows, in its current order and
	 * filters, so the details page can step to the previous and next one; without it (e.g. from an alert) the patient gets
	 * the page's list as `setPageList` last set it. `consult: "answered"` opens it with the video consult already on: a
	 * consult request answered on the patient's page (Nov 9, 2026, user's call). `pathway` opens it with an alert's
	 * pathway out in its Pathway panel, at `focus` (e.g. the discharge referrals).
	 */
	openPatient: (
		patientId: string,
		list?: string[],
		options?: { consult?: "answered"; pathway?: { alertId?: string; focus?: "discharge" } },
	) => void;
	/**
	 * The patients the page shows now, in its order and filters. A patient opened without a list (an alert, a toast, the
	 * live feed, the chat) gets this one, so the patient list is always there (Nov 3, 2026, user's call).
	 */
	setPageList: (list: string[]) => void;
	/**
	 * Opens one of the patient's alerts, from its bar on a monitoring card or the maximize button in its toast: the alert
	 * modal when the layout has one (`renderAlert`), else the patient's details. `consult` opens it with the video consult
	 * already calling the bedside (a card's Video consult); with no active alert, the modal without one (Nov 4, 2026).
	 */
	/**
	 * `consult`: with the video consult ringing the bedside (`true`), or already on, a consult request answered
	 * (`"answered"`). `focus`: opened at a part of its pathway, e.g. the discharge referrals a notice is about: the
	 * patient's page opens instead, its Pathway panel there, since the alert has no pathway (Nov 10, 2026, user's call).
	 */
	openAlert: (
		patientId: string,
		alertId?: string,
		options?: { consult?: boolean | "answered"; focus?: "discharge" },
	) => void;
	/** The patient whose alert is open now (the alert modal), so a toast about it can stay away. */
	alertPatientId?: string;
	/**
	 * Opens Ask Intercept Live about the patient, from any page (e.g. Ask in an alert toast), and asks for a quick
	 * overview. The chat stays about them until the chip is removed, the chat closes or another patient's details open.
	 * `tags` are the patient's tags ("Ventilated"…), for the chat's questions about them. `question` asks something else
	 * first, e.g. the Overview's brief asks what's behind it.
	 */
	askAboutPatient: (patientId: string, patientName: string, tags?: string[], question?: string) => void;
	/**
	 * Opens Monitoring on a hospital tab (`"all"` for All hospitals) with the Active alerts chip on, from a hospital tab's
	 * alert count on any page (Nov 5, 2026, user's call). `scope` carries the source page's My patients, so Monitoring
	 * shows the patients the count counted. Undefined when the layout has no Monitoring page.
	 */
	showActiveAlerts?: (hospitalId: string, scope?: "all" | "mine") => void;
	/** The pending `showActiveAlerts` request, which Monitoring applies when it opens (or at once, if it's on screen). */
	activeAlertsRequest: ActiveAlertsRequest | null;
	/** Monitoring calls it once it has applied the request, so coming back later opens it as usual. */
	clearActiveAlertsRequest: () => void;
	/** Whether the canvas is scrolled, so the header and the patient header compact together. */
	compact: boolean;
	/** Whether a patient's details are open, so the page under them is hidden. */
	patientOpen: boolean;
	/** When the clinician opened each patient's details in this session, ISO 8601 by patient id (Recently viewed). */
	viewedAt: Record<string, string>;
};

/** A hospital tab's alert count, clicked: the hospital to open Monitoring on. `key` tells one click from the next. */
type ActiveAlertsRequest = { hospitalId: string; key: number };

const PatientNavigationContext =React.createContext<PatientNavigation | null>(null);

const PatientNavigationProvider = PatientNavigationContext.Provider;

/** The shell's patient navigation, or null outside it. */
function usePatientNavigation() {
	return React.useContext(PatientNavigationContext);
}

export { PatientNavigationProvider, usePatientNavigation, type ActiveAlertsRequest, type PatientNavigation };
