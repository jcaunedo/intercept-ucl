import * as React from "react";

/** A bedside monitor's alarm priority (IEC 60601-1-8): high (red), medium (yellow), low (cyan). */
type DeviceAlarmPriority = "high" | "medium" | "low";

// How fast a device alarm flashes, as on the bedside monitor: on and off, half the cycle each (GE CARESCAPE Central
// Station manual 2048001-001E, "Visual alarm indicator characteristics": high about 1.5 Hz, medium about 0.5 Hz, 50%
// duty; low doesn't flash). Within IEC 60601-1-8's ranges, and under WCAG 2.3.1's three flashes a second.
const deviceAlarmFlashHz: Record<DeviceAlarmPriority, number | null> = { high: 1.5, medium: 0.5, low: null };

// One clock per rate, aligned to the wall clock, so every alarm of a priority flashes in step, as on a monitor wall.
const clocks = new Map<number, { listeners: Set<(on: boolean) => void>; timer?: number }>();

const onAt = (now: number, periodMs: number) => now % periodMs < periodMs / 2;

function tick(periodMs: number) {
	const clock = clocks.get(periodMs);
	if (!clock) return;
	const now = Date.now();
	const on = onAt(now, periodMs);
	clock.listeners.forEach((listener) => listener(on));
	// Wake at the next half-cycle boundary (+1ms so it lands past it).
	clock.timer = window.setTimeout(() => tick(periodMs), periodMs / 2 - (now % (periodMs / 2)) + 1);
}

/**
 * Whether a device alarm's color shows right now: it turns on and off at its priority's rate while `active`, in step
 * with every other alarm of that priority on the page. Steady on for low priority, when not `active` (e.g. reduced
 * motion), or without a priority.
 */
function useDeviceAlarmFlash(priority: DeviceAlarmPriority | undefined, active: boolean): boolean {
	const hz = priority ? deviceAlarmFlashHz[priority] : null;
	const periodMs = hz && active ? 1000 / hz : null;
	const [on, setOn] = React.useState(() => (periodMs ? onAt(Date.now(), periodMs) : true));

	React.useEffect(() => {
		if (!periodMs) {
			setOn(true);
			return;
		}
		let clock = clocks.get(periodMs);
		if (!clock) {
			clock = { listeners: new Set() };
			clocks.set(periodMs, clock);
		}
		clock.listeners.add(setOn);
		setOn(onAt(Date.now(), periodMs));
		if (clock.timer === undefined) tick(periodMs);
		return () => {
			clock.listeners.delete(setOn);
			if (clock.listeners.size === 0) {
				window.clearTimeout(clock.timer);
				clocks.delete(periodMs);
			}
		};
	}, [periodMs]);

	return on;
}

export { deviceAlarmFlashHz, useDeviceAlarmFlash, type DeviceAlarmPriority };
