import * as React from "react";

// How a page opens a patient's details over itself (PRD Patient details PD-001, PD-015). The shell provides it; a page
// calls it from a card, a list row or an alert. Outside the shell (a page's own story) there's no provider, and opening
// a patient only calls the page's `onOpenPatient`.

type PatientNavigation = {
	/**
	 * Opens the patient's details over the current page. `list` is the patients the page shows, in its current order and
	 * filters, so the details page can step to the previous and next one; without it (e.g. from an alert) the patient gets
	 * the page's list as `setPageList` last set it.
	 */
	openPatient: (patientId: string, list?: string[]) => void;
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
	/** `consult`: with the video consult ringing the bedside (`true`), or already on, a consult request answered (`"answered"`). */
	openAlert: (patientId: string, alertId?: string, options?: { consult?: boolean | "answered" }) => void;
	/**
	 * Opens Ask Intercept Live about the patient, from any page (e.g. Ask in an alert toast), and asks for a quick
	 * overview. The chat stays about them until the chip is removed, the chat closes or another patient's details open.
	 * `tags` are the patient's tags ("Ventilated"…), for the chat's questions about them.
	 */
	askAboutPatient: (patientId: string, patientName: string, tags?: string[]) => void;
	/** Whether the canvas is scrolled, so the header and the patient header compact together. */
	compact: boolean;
	/** Whether a patient's details are open, so the page under them is hidden. */
	patientOpen: boolean;
	/** When the clinician opened each patient's details in this session, ISO 8601 by patient id (Recently viewed). */
	viewedAt: Record<string, string>;
};

const PatientNavigationContext = React.createContext<PatientNavigation | null>(null);

const PatientNavigationProvider = PatientNavigationContext.Provider;

/** The shell's patient navigation, or null outside it. */
function usePatientNavigation() {
	return React.useContext(PatientNavigationContext);
}

export { PatientNavigationProvider, usePatientNavigation, type PatientNavigation };
