import * as React from "react";

// Layout options the prototype compares, switched from the Prototype menu's Views (not product settings). Each holds
// for the whole prototype until it's chosen again, and resets when the page reloads.

type PrototypeViews = {
	/** "Timeline option 2" (Nov 24, 2026, Intercept-Live `316:16920`): the Timeline's Previous and Now columns on the left. */
	timelineOption2: boolean;
};

let views: PrototypeViews = { timelineOption2: false };
const listeners = new Set<() => void>();

function setView(view: keyof PrototypeViews, on: boolean) {
	views = { ...views, [view]: on };
	for (const listener of listeners) listener();
}

const subscribe = (listener: () => void) => {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
};

const useView = (view: keyof PrototypeViews) =>
	React.useSyncExternalStore(
		subscribe,
		() => views[view],
		() => false,
	);

const setTimelineOption2 = (on: boolean) => setView("timelineOption2", on);
/** Whether "Timeline option 2" is on. */
const useTimelineOption2 = () => useView("timelineOption2");

export { setTimelineOption2, useTimelineOption2 };
