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

// The story "Reset prototype" starts over in: Monitoring's live prototype, the app's default page.
const resetStoryId = "layouts-intercept-live-monitoring--default";

/**
 * "Reset prototype": loads the prototype afresh on Monitoring, from the Census's story too, so every page, panel,
 * alert action and the live feed start over. In Storybook's UI it changes the story in the address bar (keeping the
 * toolbar's globals, e.g. the theme); in the bare story frame (`iframe.html`), the frame's. Elsewhere it reloads.
 */
function resetPrototype() {
	const go = (target: Window, param: "path" | "id", value: string) => {
		const url = new URL(target.location.href);
		url.searchParams.set(param, value);
		url.searchParams.delete("args");
		target.location.assign(url.toString());
	};
	try {
		// Storybook's UI hosts the story in a same-origin frame and reads the story from `?path=`.
		if (window.top && window.top !== window && new URL(window.top.location.href).searchParams.has("path")) {
			go(window.top, "path", `/story/${resetStoryId}`);
			return;
		}
	} catch {
		// A cross-origin parent: fall through to the frame itself.
	}
	if (new URL(window.location.href).searchParams.has("id")) go(window, "id", resetStoryId);
	else window.location.reload();
}

export { prototypeShortcuts, resetPrototype };
