import * as React from "react";

// How a page opens a patient's details over itself (PRD Patient details PD-001, PD-015). The shell provides it; a page
// calls it from a card, a list row or an alert. Outside the shell (a page's own story) there's no provider, and opening
// a patient only calls the page's `onOpenPatient`.

type PatientNavigation = {
	/**
	 * Opens the patient's details over the current page. `list` is the patients the page shows, in its current order and
	 * filters, so the details page can step to the previous and next one; without it (e.g. from an alert) there's no
	 * stepping.
	 */
	openPatient: (patientId: string, list?: string[]) => void;
	/** Whether the canvas is scrolled, so the header and the patient header compact together. */
	compact: boolean;
	/** Whether a patient's details are open, so the page under them is hidden. */
	patientOpen: boolean;
};

const PatientNavigationContext = React.createContext<PatientNavigation | null>(null);

const PatientNavigationProvider = PatientNavigationContext.Provider;

/** The shell's patient navigation, or null outside it. */
function usePatientNavigation() {
	return React.useContext(PatientNavigationContext);
}

export { PatientNavigationProvider, usePatientNavigation, type PatientNavigation };
