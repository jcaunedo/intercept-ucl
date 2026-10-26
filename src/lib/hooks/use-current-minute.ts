import * as React from "react";

const MINUTE = 60_000;

// One timer for every subscriber, fired on each minute boundary, so all clocks on a page change together.
const listeners = new Set<() => void>();
let timer: number | undefined;

const notify = () => listeners.forEach((listener) => listener());

function scheduleNextMinute() {
	// A few ms past the boundary, so the new minute has started when the snapshot is read.
	timer = window.setTimeout(() => {
		notify();
		scheduleNextMinute();
	}, MINUTE - (Date.now() % MINUTE) + 20);
}

// Timers are late after the device sleeps or the tab is hidden, so catch up when the page is visible again.
const handleVisibilityChange = () => {
	if (document.visibilityState === "visible") notify();
};

function subscribe(onStoreChange: () => void) {
	listeners.add(onStoreChange);
	if (listeners.size === 1) {
		scheduleNextMinute();
		document.addEventListener("visibilitychange", handleVisibilityChange);
	}
	return () => {
		listeners.delete(onStoreChange);
		if (listeners.size === 0) {
			window.clearTimeout(timer);
			timer = undefined;
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		}
	};
}

// The current minute as a timestamp: stable within a minute, so React only re-renders when it changes.
const getSnapshot = () => Math.floor(Date.now() / MINUTE) * MINUTE;

/**
 * The current time, to the minute, as a timestamp that updates on each minute boundary (e.g. for a header clock).
 * `null` on the server, so server and client renders never disagree about the time; render a placeholder for it.
 */
function useCurrentMinute(): number | null {
	return React.useSyncExternalStore(subscribe, getSnapshot, () => null);
}

export { useCurrentMinute };
