import * as React from "react";

const SECOND = 1000;

// One timer for every subscriber, fired on each second boundary, so all elapsed times on a page tick together.
const listeners = new Set<() => void>();
let timer: number | undefined;

function scheduleNextSecond() {
	timer = window.setTimeout(() => {
		listeners.forEach((listener) => listener());
		scheduleNextSecond();
	}, SECOND - (Date.now() % SECOND) + 5);
}

function subscribe(onStoreChange: () => void) {
	listeners.add(onStoreChange);
	if (listeners.size === 1) scheduleNextSecond();
	return () => {
		listeners.delete(onStoreChange);
		if (listeners.size === 0) {
			window.clearTimeout(timer);
			timer = undefined;
		}
	};
}

// The current second as a timestamp: stable within a second, so React only re-renders when it changes.
const getSnapshot = () => Math.floor(Date.now() / SECOND) * SECOND;

/**
 * The current time, to the second, as a timestamp that updates on each second boundary (e.g. a running "3:34 m ago").
 * `null` on the server, so server and client renders never disagree about the time; render a placeholder for it.
 */
function useCurrentSecond(): number | null {
	return React.useSyncExternalStore(subscribe, getSnapshot, () => null);
}

export { useCurrentSecond };
