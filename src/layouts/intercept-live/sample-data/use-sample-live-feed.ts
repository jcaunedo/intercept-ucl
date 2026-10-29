import * as React from "react";

import type { MonitorVitals } from "@/components/cards/patient-monitoring-card";

import type { CensusPatient } from "../census/census-panel";
import type { TriageAlert } from "../monitoring/monitoring";
import { sampleLiveScenario } from "../monitoring/sample-live-scenario";
import { sampleMonitoringAlerts, sampleMonitoringPatients } from "../monitoring/sample-monitoring";

// Story-only helpers: they play the scripted live feed into the Census and Monitoring stories. Apps get the same data
// from their APIs instead.

// When the feed changes (Oct 29, 2026): the first change just before the panels' first re-sort (2 s), so it shows in the
// order at once; the first resolve at 8 s; then a random 15 to 30 s between changes, as the panels' re-sorts, so the
// story stays calm and uneven, as a real feed is.
const firstChanges = [1.5, 6.5];
const changeGap = [15, 30] as const;
const nextChangeIn = (tick: number) =>
	tick < firstChanges.length ? firstChanges[tick] : changeGap[0] + Math.random() * (changeGap[1] - changeGap[0]);

/**
 * Plays `sampleLiveScenario`, one step at a time (at 1.5 s, at 8 s, then every 15 to 30 s), and starts over after the
 * last step: vitals change, alerts change severity, fire and resolve. A resolved alert leaves the feed (the
 * feed resolved it, not the clinician). `caption` is what the last step changed, for the hospital bar's Live feed.
 */
function useSampleLiveFeed() {
	const [step, setStep] = React.useState(0);
	const [tick, setTick] = React.useState(0);
	const firedAt = React.useRef<Record<string, string>>({});

	React.useEffect(() => {
		const timer = window.setTimeout(() => {
			setStep((current) => (current + 1) % (sampleLiveScenario.length + 1));
			setTick((current) => current + 1);
		}, nextChangeIn(tick) * 1000);
		return () => window.clearTimeout(timer);
	}, [tick]);

	return React.useMemo(() => {
		if (step === 0) firedAt.current = {};
		const vitals: Record<string, Partial<MonitorVitals>> = {};
		const updates: Record<string, Partial<TriageAlert>> = {};
		const fired: TriageAlert[] = [];
		const resolved = new Set<string>();
		for (const live of sampleLiveScenario.slice(0, step)) {
			for (const [id, change] of Object.entries(live.vitals ?? {})) vitals[id] = { ...vitals[id], ...change };
			for (const [id, change] of Object.entries(live.update ?? {})) updates[id] = { ...updates[id], ...change };
			for (const alert of live.fire ?? []) {
				firedAt.current[alert.id] ??= new Date().toISOString();
				fired.push({ ...alert, firedAt: firedAt.current[alert.id] });
			}
			for (const id of live.resolve ?? []) resolved.add(id);
		}
		return {
			patients: sampleMonitoringPatients.map((patient) =>
				vitals[patient.id] ? { ...patient, vitals: { ...patient.vitals, ...vitals[patient.id] } } : patient,
			),
			alerts: [...sampleMonitoringAlerts, ...fired]
				.filter((alert) => !resolved.has(alert.id))
				.map((alert) => ({ ...alert, ...updates[alert.id] })),
			caption: step === 0 ? "Start of the shift" : sampleLiveScenario[step - 1].label,
		};
	}, [step]);
}

const severityOrder = ["critical", "high", "medium", "low"] as const;

/**
 * The Census cards with their alert pills taken from the feed's alerts: the worst open severity and how many are open,
 * so the cards, the live feed panel and the hospital bar tell the same story. A patient with no open alert loses the
 * pill. The cards' own pills are otherwise app data (CensusPanel doesn't derive them).
 */
function withFeedAlerts(patients: CensusPatient[], alerts: TriageAlert[]): CensusPatient[] {
	return patients.map((patient) => {
		const open = alerts.filter(
			(alert) => alert.patientId === patient.id && alert.status !== "resolved" && alert.status !== "declined",
		);
		const worst = severityOrder.find((severity) => open.some((alert) => alert.severity === severity));
		if (!worst) return patient.alert ? { ...patient, alert: undefined } : patient;
		return { ...patient, alert: { variant: worst, count: open.length > 1 ? open.length : undefined } };
	});
}

export { useSampleLiveFeed, withFeedAlerts };
