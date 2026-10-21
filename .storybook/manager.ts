import { addons } from "storybook/manager-api";

import { theme } from "./theme";

// Storybook saves the layout in local and session storage, and the saved layout wins over `setConfig`, so a browser
// that has shown the toolbar once keeps showing it. This file runs before Storybook reads that storage: clear the saved
// toolbar flag so every load starts with the toolbar hidden. ⌥T still shows it until the next reload.
const STORE_KEY = "@storybook/manager/store";

for (const storage of [globalThis.localStorage, globalThis.sessionStorage]) {
	try {
		const saved = JSON.parse(storage.getItem(STORE_KEY) ?? "null");
		if (saved?.layout) {
			saved.layout.showToolbar = false;
			storage.setItem(STORE_KEY, JSON.stringify(saved));
		}
	} catch {
		// Storage blocked or unreadable: fall back to the config below.
	}
}

addons.setConfig({ theme, layout: { showToolbar: false } });
