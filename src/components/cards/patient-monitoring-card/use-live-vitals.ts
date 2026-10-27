import * as React from "react";

import { defaultMonitorLimits, type MonitorLimits, type MonitorVitals } from "./patient-monitoring-card";

// Story-only, not exported from the package: makes sample vitals behave like a bedside monitor's, so every story that
// shows a monitor is live. An app passes its real readings instead.

type Offsets = { hr: number; spo2: number; systolic: number; diastolic: number; rr: number };

// How each numeric moves on a bedside monitor, around the value it's given: the chance it refreshes each second, the
// largest step, and how far it can wander. HR shifts most often (beat to beat), the arterial pressure every couple of
// seconds, SpO₂ (averaged over several seconds) and RR (counted over breaths) more slowly.
const noiseModel: Record<keyof Offsets, { chance: number; step: number; range: number }> = {
	hr: { chance: 0.7, step: 2, range: 4 },
	spo2: { chance: 0.25, step: 1, range: 1 },
	systolic: { chance: 0.5, step: 2, range: 4 },
	diastolic: { chance: 0.5, step: 1, range: 3 },
	rr: { chance: 0.3, step: 1, range: 2 },
};

const noOffsets: Offsets = { hr: 0, spo2: 0, systolic: 0, diastolic: 0, rr: 0 };

/** One second's change: each numeric may step a little, pulled back toward zero so it wanders but doesn't drift away. */
function nextOffsets(current: Offsets): Offsets {
	const next = { ...current };
	for (const key of Object.keys(noiseModel) as (keyof Offsets)[]) {
		const { chance, step, range } = noiseModel[key];
		if (Math.random() > chance) continue;
		const moved = Math.round(next[key] * 0.6 + (Math.random() * 2 - 1) * step);
		next[key] = Math.max(-range, Math.min(range, moved));
	}
	return next;
}

/**
 * Keeps a varied value on the same side of its alarm limits as the value it varies around, so the noise never sets or
 * clears an alarm (the ↑ / ↓ tags and "Outside limits" stay put); only a real change in the reading does.
 */
function sameSide(base: number, value: number, [low, high]: [number, number]) {
	if (base > high) return Math.max(value, high + 1);
	if (base < low) return Math.min(value, low - 1);
	return Math.max(low, Math.min(high, value));
}

function applyOffsets(vitals: MonitorVitals, offsets: Offsets, limitsProp?: Partial<MonitorLimits>): MonitorVitals {
	const limits = { ...defaultMonitorLimits, ...limitsProp };
	const vary = (base: number | undefined, offset: number, limit?: [number, number]) =>
		base === undefined ? undefined : limit ? sameSide(base, base + offset, limit) : base + offset;
	const systolic = vary(vitals.systolic, offsets.systolic, limits.systolic);
	const diastolic = vary(vitals.diastolic, offsets.diastolic);
	const spo2 = vary(vitals.spo2, offsets.spo2, limits.spo2);
	return {
		...vitals,
		hr: vary(vitals.hr, offsets.hr, limits.hr),
		spo2: spo2 === undefined ? undefined : Math.min(100, spo2),
		systolic,
		diastolic,
		// MAP follows the pressures.
		map: systolic !== undefined && diastolic !== undefined ? Math.round((systolic + 2 * diastolic) / 3) : vitals.map,
		rr: vary(vitals.rr, offsets.rr, limits.rr),
	};
}

/** Offsets per key, stepped once a second. Each key moves on its own, so cards don't change in step. */
function useOffsets(keys: string[]) {
	const [offsets, setOffsets] = React.useState<Record<string, Offsets>>({});
	const keysRef = React.useRef(keys);
	keysRef.current = keys;

	React.useEffect(() => {
		const timer = window.setInterval(() => {
			setOffsets((current) =>
				Object.fromEntries(keysRef.current.map((key) => [key, nextOffsets(current[key] ?? noOffsets)])),
			);
		}, 1000);
		return () => window.clearInterval(timer);
	}, []);

	return offsets;
}

/** One patient's vitals, varying as on a bedside monitor. */
function useLiveVitals(vitals: MonitorVitals | undefined, limits?: Partial<MonitorLimits>) {
	const offsets = useOffsets(["patient"]).patient;
	return vitals && offsets ? applyOffsets(vitals, offsets, limits) : vitals;
}

/** Every patient's vitals, varying as on a bedside monitor, each on its own. */
function useLivePatients<Patient extends { id: string; vitals?: MonitorVitals; limits?: Partial<MonitorLimits> }>(
	patients: Patient[],
): Patient[] {
	const offsets = useOffsets(patients.map((patient) => patient.id));
	return patients.map((patient) =>
		patient.vitals && offsets[patient.id]
			? { ...patient, vitals: applyOffsets(patient.vitals, offsets[patient.id], patient.limits) }
			: patient,
	);
}

export { useLivePatients, useLiveVitals };
