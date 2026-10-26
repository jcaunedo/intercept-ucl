import * as React from "react";

import { motionDuration } from "./tokens";

type UrgencyPhase = "calm" | "urgent";

// One clock for every Urgency element, aligned to the wall clock, so they all pulse in step: a ring that appears later
// joins the current beat instead of starting its own. Each cycle is `urgent` (fade in + thicken, then rest) followed by
// a short `calm`.
const urgentMs = (motionDuration.slow + motionDuration.urgencyRest) * 1000;
const cycleMs = urgentMs + motionDuration.urgencyCalm * 1000;

const phaseAt = (now: number): UrgencyPhase => (now % cycleMs < urgentMs ? "urgent" : "calm");

const listeners = new Set<(phase: UrgencyPhase) => void>();
let timer: number | undefined;

function tick() {
	const now = Date.now();
	const phase = phaseAt(now);
	listeners.forEach((listener) => listener(phase));
	const elapsed = now % cycleMs;
	// Wake at the next boundary (+1ms so it lands past it).
	timer = window.setTimeout(tick, (elapsed < urgentMs ? urgentMs : cycleMs) - elapsed + 1);
}

/**
 * The shared Urgency phase for `urgencyRingVariants`: `urgent` and `calm` in turn while `active`, in step with every
 * other active element on the page. When not `active` (the cause is addressed, or reduced motion), it stays `urgent`.
 */
function useUrgencyPhase(active: boolean): UrgencyPhase {
	const [phase, setPhase] = React.useState<UrgencyPhase>(() => (active ? phaseAt(Date.now()) : "urgent"));

	React.useEffect(() => {
		if (!active) {
			setPhase("urgent");
			return;
		}
		listeners.add(setPhase);
		setPhase(phaseAt(Date.now()));
		if (timer === undefined) tick();
		return () => {
			listeners.delete(setPhase);
			if (listeners.size === 0) {
				window.clearTimeout(timer);
				timer = undefined;
			}
		};
	}, [active]);

	return phase;
}

export { useUrgencyPhase, type UrgencyPhase };
