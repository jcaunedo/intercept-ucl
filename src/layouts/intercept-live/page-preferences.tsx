import * as React from "react";

import type { SortOrderId } from "./shared/patient-panel";

// View choices the user makes on one page that hold across pages: the shell keeps them, so switching from the Census to
// Monitoring and back keeps them (Oct 30, 2026). Outside the shell (a page's own story) there's no provider, and each
// page keeps its own.

type PagePreferences = {
	/** Group by location's switch, on the Census and Monitoring. */
	groupByLocation: boolean;
	onGroupByLocationChange: (grouped: boolean) => void;
	/** Each page's Sort by choice (Oct 31, 2026), by page: the Census and Monitoring offer different sorts. */
	sortBy: Partial<Record<SortPage, SortOrderId>>;
	onSortByChange: (page: SortPage, sortBy: SortOrderId) => void;
};

/** The pages with a Sort by menu. */
type SortPage = "census" | "monitoring";

const PagePreferencesContext = React.createContext<PagePreferences | null>(null);

const PagePreferencesProvider = PagePreferencesContext.Provider;

/** The shell's page preferences, or null outside it. */
function usePagePreferences() {
	return React.useContext(PagePreferencesContext);
}

export { PagePreferencesProvider, usePagePreferences, type PagePreferences, type SortPage };
