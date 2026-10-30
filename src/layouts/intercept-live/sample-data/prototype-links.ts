import type { PrototypeShortcut } from "../intercept-live";

// Story-only: the Sidebar's Prototype menu for the Intercept Live stories (as bethere-ucl's prototype links). Not part
// of the product, and not exported from the package. Add new scenarios, views and shortcuts here; "Reset prototype"
// always comes last, after a divider.

/**
 * The menu's entries. Scenario 1 (Demo Use Cases, "Heart failure at 2 a.m. in a 25-bed hospital") opens Monitoring
 * and plays the live feed from the start of the shift, so Margaret Hayes's early-warning alert fires and she ranks #1.
 * Sections by location shows Group by location as the grid's hospital sections instead of the Kanban board (the default), on
 * the Census and Monitoring, until chosen again.
 */
const prototypeShortcuts = ({
	restartLiveFeed,
	groupedGrid,
	onToggleGroupedGrid,
}: {
	restartLiveFeed: () => void;
	groupedGrid: boolean;
	onToggleGroupedGrid: () => void;
}): PrototypeShortcut[] => [
	{ group: "Scenarios", label: "Scenario 1 · Heart failure at 2 a.m.", page: "Monitoring", onSelect: restartLiveFeed },
	{ group: "Views", label: "Sections by location", checked: groupedGrid, onSelect: onToggleGroupedGrid },
];

/**
 * "Reset prototype": reloads the story, so every page, panel, alert action and the live feed start over, as when it
 * first opened.
 */
function resetPrototype() {
	window.location.reload();
}

export { prototypeShortcuts, resetPrototype };
