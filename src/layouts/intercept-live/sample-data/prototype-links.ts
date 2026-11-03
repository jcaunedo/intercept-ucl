import * as React from "react";

import type { InterceptLivePage, OpenPatient, PrototypeShortcut } from "../intercept-live";

// Story-only: the Sidebar's Prototype menu for the Intercept Live stories (as bethere-ucl's prototype links). Not part
// of the product, and not exported from the package. Add new scenarios, views and shortcuts here; "Reset prototype"
// always comes last, after a divider.

/**
 * The menu's entries. Scenario 1: Heart failure (Demo Use Cases, "Heart failure at 2 a.m. in a 25-bed hospital")
 * opens Monitoring and plays the scenario's beats from the start: Margaret Hayes, holding until then, has her early
 * warning (NEWS2 5 → 10) and her Critical alert ranks #1. Sections by location shows Group by location as the grid's
 * hospital sections instead of the Kanban board (the default), on the Census and Monitoring, until chosen again.
 */
const prototypeShortcuts = ({
	startScenario1,
	groupedGrid,
	onToggleGroupedGrid,
}: {
	startScenario1: () => void;
	groupedGrid: boolean;
	onToggleGroupedGrid: () => void;
}): PrototypeShortcut[] => [
	{ group: "Scenarios", label: "Scenario 1: Heart failure", page: "Monitoring", onSelect: startScenario1 },
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
		for (const name of locationParams) url.searchParams.delete(name);
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

/* -------------------------------------------------------------------------- */
/* Shareable links                                                            */
/* -------------------------------------------------------------------------- */

// The page and the open patient, in the address: `?page=census&patient=p15`. Read once when the prototype opens, and
// kept in step as the user moves, so a copied link opens the same place (Nov 2, 2026, user's call).
const locationParams = ["page", "patient"] as const;

/**
 * The windows whose address holds the story: the story frame itself (`iframe.html?id=…`) and, inside Storybook's UI
 * (same origin, `?path=/story/…`), the UI's too, since that's the address people copy there.
 */
function storyWindows(): Window[] {
	const windows: Window[] = [window];
	try {
		if (window.top && window.top !== window && new URL(window.top.location.href).searchParams.has("path")) windows.push(window.top);
	} catch {
		// A cross-origin parent: only the frame's address.
	}
	return windows;
}

/** A param from the frame's address, or Storybook UI's when the frame's doesn't have it. */
function readParam(name: (typeof locationParams)[number]) {
	for (const target of storyWindows()) {
		const value = new URL(target.location.href).searchParams.get(name);
		if (value) return value;
	}
	return undefined;
}

/**
 * The prototype's address: where it opens (`page`, `patient` from the URL, else the story's own) and `onLocationChange`
 * for InterceptLive, which writes each move back to the URL without adding history entries. Pages go by their Sidebar
 * name, lowercased ("monitoring", "census"); a patient by id. Unknown values are ignored.
 */
function usePrototypeLocation(pages: readonly InterceptLivePage[], fallback: { page?: InterceptLivePage; patient?: OpenPatient } = {}) {
	const [initial] = React.useState(() => {
		const page = pages.find((name) => name.toLowerCase() === readParam("page")?.toLowerCase());
		const patient = readParam("patient");
		return { page: page ?? fallback.page, patient: patient ? { id: patient } : fallback.patient };
	});
	const onLocationChange = React.useCallback(({ page, patientId }: { page: InterceptLivePage; patientId?: string }) => {
		for (const target of storyWindows()) {
			const url = new URL(target.location.href);
			url.searchParams.set("page", page.toLowerCase());
			if (patientId) url.searchParams.set("patient", patientId);
			else url.searchParams.delete("patient");
			if (url.href !== target.location.href) target.history.replaceState(target.history.state, "", url);
		}
	}, []);
	return { defaultPage: initial.page, defaultPatient: initial.patient, onLocationChange };
}

export { prototypeShortcuts, resetPrototype, usePrototypeLocation };
