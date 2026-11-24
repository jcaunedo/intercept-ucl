import * as React from "react";

// Layout options the prototype compares, switched from the Prototype menu's Views (not product settings). Each holds
// for the whole prototype until it's chosen again, and resets when the page reloads.

/** "Timeline option 2" (Nov 24, 2026, Intercept-Live `316:16920`): the Timeline's Previous and Now columns on the left. */
let timelineOption2 = false;
const listeners = new Set<() => void>();

function setTimelineOption2(on: boolean) {
	timelineOption2 = on;
	for (const listener of listeners) listener();
}

const subscribe = (listener: () => void) => {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
};

/** Whether "Timeline option 2" is on. */
function useTimelineOption2() {
	return React.useSyncExternalStore(
		subscribe,
		() => timelineOption2,
		() => false,
	);
}

export { setTimelineOption2, useTimelineOption2 };
