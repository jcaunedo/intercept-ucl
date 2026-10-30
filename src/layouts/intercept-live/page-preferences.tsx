import * as React from "react";

// View choices the user makes on one page that hold across pages: the shell keeps them, so switching from the Census to
// Monitoring and back keeps them (Oct 30, 2026). Outside the shell (a page's own story) there's no provider, and each
// page keeps its own.

type PagePreferences = {
	/** Group by location's switch, on the Census and Monitoring. */
	groupByLocation: boolean;
	onGroupByLocationChange: (grouped: boolean) => void;
};

const PagePreferencesContext = React.createContext<PagePreferences | null>(null);

const PagePreferencesProvider = PagePreferencesContext.Provider;

/** The shell's page preferences, or null outside it. */
function usePagePreferences() {
	return React.useContext(PagePreferencesContext);
}

export { PagePreferencesProvider, usePagePreferences, type PagePreferences };
