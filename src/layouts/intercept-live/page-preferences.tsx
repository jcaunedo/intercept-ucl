import * as React from "react";

import type { TriageAlertSeverity } from "./monitoring/triage-queue";
import type { PatientScope, SortOrderId } from "./shared/patient-panel";

// View choices the user makes on one page that hold across pages: the shell keeps them, so switching from the Census to
// Monitoring and back keeps them (Oct 30, 2026). Outside the shell (a page's own story) there's no provider, and each
// page keeps its own.

type PagePreferences = {
	/** Group by hospital's switch, on the Census and Monitoring. */
	groupByHospital: boolean;
	onGroupByHospitalChange: (grouped: boolean) => void;
	/** Each page's Sort by choice (Oct 31, 2026), by page: the Census and Monitoring offer different sorts. */
	sortBy: Partial<Record<SortPage, SortOrderId>>;
	onSortByChange: (page: SortPage, sortBy: SortOrderId) => void;
	/** Each page's My patients chip (Nov 2, 2026), by page, so the alert toasts follow the page on screen. */
	scope: Partial<Record<SortPage, PatientScope>>;
	onScopeChange: (page: SortPage, scope: PatientScope) => void;
	/**
	 * Whether Monitoring's Active alerts chip is on (Nov 10, 2026): the alert toasts ping only then. Monitoring reports it
	 * while it's open, and turns it off when it closes.
	 */
	activeAlerts: boolean;
	onActiveAlertsChange: (on: boolean) => void;
	/** The page on screen, when it's one of these (under a patient's details too); another page has no scope. */
	currentPage?: SortPage;
	/**
	 * The alert toasts the clinician closed (× or Close all), by alert id, with the severity the alert had then (Nov 3,
	 * 2026). They don't toast again until the app reloads, unless the alert goes above that severity (AlertToasts).
	 */
	closedAlertToasts: Readonly<Record<string, TriageAlertSeverity>>;
	onCloseAlertToast: (alertId: string, severity: TriageAlertSeverity) => void;
};

/** The pages with a Sort by menu and a My patients chip. */
type SortPage = "census" | "monitoring";

const PagePreferencesContext = React.createContext<PagePreferences | null>(null);

const PagePreferencesProvider = PagePreferencesContext.Provider;

/** The shell's page preferences, or null outside it. */
function usePagePreferences() {
	return React.useContext(PagePreferencesContext);
}

export { PagePreferencesProvider, usePagePreferences, type PagePreferences, type SortPage };
