import * as React from "react";

import type { MonitorVitals } from "@/components/cards/patient-monitoring-card";

import type { CensusPatient } from "../census/census-panel";
import type { MonitoringPatient, TriageAlert } from "../monitoring/monitoring";
import { sampleLiveScenario } from "../monitoring/sample-live-scenario";
import { sampleMonitoringAlerts, sampleMonitoringPatients } from "../monitoring/sample-monitoring";
import type { PatientRecord } from "../patient-details/patient-details";
import { sampleScenario1, type ScenarioChanges } from "./sample-scenario-1";

// Story-only helpers: they play the scripted live feed into the Census and Monitoring stories. Apps get the same data
// from their APIs instead.

// When the feed changes: the first resolve at 8 s, then a random 15 to 30 s between changes, as the panels' re-sorts,
// so the story stays calm and uneven, as a real feed is.
const firstChanges = [8];
const changeGap = [15, 30] as const;
const nextChangeIn = (tick: number) =>
	tick < firstChanges.length ? firstChanges[tick] : changeGap[0] + Math.random() * (changeGap[1] - changeGap[0]);

// Scenario 1's first beat plays this long after it's picked from the Prototype menu: just before the panel's first
// re-sort when the menu opens Monitoring, so the change shows in the order at once.
const scenarioDelay = 1.5;

/** Patches each item whose id has changes. */
function patch<T extends { id: string }>(items: T[], changes: Record<string, Partial<T>>): T[] {
	return items.map((item) => (changes[item.id] ? { ...item, ...changes[item.id] } : item));
}

/**
 * Plays `sampleLiveScenario`, one step at a time (at 8 s, then every 15 to 30 s), and starts over after the last
 * step: vitals change, alerts change severity, fire and resolve. A resolved alert leaves the feed (the feed resolved
 * it, not the clinician). `caption` is what the last change was, for the hospital bar's Live feed.
 *
 * `startScenario1` (the Prototype menu's Scenario 1) puts Margaret Hayes back to just before the scenario and plays
 * its beats (`sampleScenario1`): her alerts in `alerts`, her monitor in `patients`, and her Census card and record
 * through `withScenarioCensus` and `withScenarioRecords`, so every page and the chat follow. Until then she holds.
 */
function useSampleLiveFeed() {
	const [step, setStep] = React.useState(0);
	const [tick, setTick] = React.useState(0);
	const [caption, setCaption] = React.useState("Start of the shift");
	const firedAt = React.useRef<Record<string, string>>({});
	const resolvedAt = React.useRef<Record<string, string>>({});

	React.useEffect(() => {
		const timer = window.setTimeout(() => {
			const next = (step + 1) % (sampleLiveScenario.length + 1);
			setStep(next);
			setCaption(next === 0 ? "Start of the shift" : sampleLiveScenario[next - 1].label);
			setTick((current) => current + 1);
		}, nextChangeIn(tick) * 1000);
		return () => window.clearTimeout(timer);
	}, [tick, step]);

	// Scenario 1: the beats played so far, each built when it played. A new run starts from none.
	const [run, setRun] = React.useState(0);
	const [beats, setBeats] = React.useState<{ changes: ScenarioChanges; at: string }[]>([]);
	const startScenario1 = React.useCallback(() => {
		setBeats([]);
		setRun((current) => current + 1);
	}, []);
	React.useEffect(() => {
		if (!run) return;
		const beat = sampleScenario1[0];
		const timer = window.setTimeout(() => {
			setBeats([{ changes: beat.changes(), at: new Date().toISOString() }]);
			setCaption(beat.label);
		}, scenarioDelay * 1000);
		return () => window.clearTimeout(timer);
	}, [run]);

	const scenario = React.useMemo(() => {
		const census: Record<string, Partial<CensusPatient>> = {};
		const monitoring: Record<string, Partial<MonitoringPatient>> = {};
		const records: Record<string, Partial<PatientRecord>> = {};
		const fired: TriageAlert[] = [];
		for (const { changes, at } of beats) {
			for (const [id, change] of Object.entries(changes.census ?? {})) census[id] = { ...census[id], ...change };
			for (const [id, change] of Object.entries(changes.monitoring ?? {})) monitoring[id] = { ...monitoring[id], ...change };
			for (const [id, change] of Object.entries(changes.records ?? {})) records[id] = { ...records[id], ...change };
			for (const alert of changes.fire ?? []) fired.push({ ...alert, firedAt: at });
		}
		return { census, monitoring, records, fired };
	}, [beats]);

	const feed = React.useMemo(() => {
		if (step === 0) {
			firedAt.current = {};
			resolvedAt.current = {};
		}
		const vitals: Record<string, Partial<MonitorVitals>> = {};
		const updates: Record<string, Partial<TriageAlert>> = {};
		const fired: TriageAlert[] = [];
		const resolved = new Set<string>();
		const resolutions: Record<string, TriageAlert["addressed"]> = {};
		for (const live of sampleLiveScenario.slice(0, step)) {
			for (const [id, change] of Object.entries(live.vitals ?? {})) vitals[id] = { ...vitals[id], ...change };
			for (const [id, change] of Object.entries(live.update ?? {})) updates[id] = { ...updates[id], ...change };
			for (const alert of live.fire ?? []) {
				firedAt.current[alert.id] ??= new Date().toISOString();
				fired.push({ ...alert, firedAt: firedAt.current[alert.id] });
			}
			for (const id of live.resolve ?? []) {
				resolved.add(id);
				resolvedAt.current[id] ??= new Date().toISOString();
				resolutions[id] = { at: resolvedAt.current[id], ...live.resolvedBy?.[id] };
			}
		}
		return {
			patients: patch(sampleMonitoringPatients, scenario.monitoring).map((patient) =>
				vitals[patient.id] ? { ...patient, vitals: { ...patient.vitals, ...vitals[patient.id] } } : patient,
			),
			alerts: [...sampleMonitoringAlerts, ...fired, ...scenario.fired]
				.filter((alert) => !resolved.has(alert.id))
				.map((alert) => ({ ...alert, ...updates[alert.id] })),
			// Every alert so far, the resolved ones too, so a resolved alert's toast still has an alert modal to open.
			everyAlert: [...sampleMonitoringAlerts, ...fired, ...scenario.fired].map((alert) => ({
				...alert,
				...updates[alert.id],
				...(resolved.has(alert.id) ? { status: "resolved" as const, addressed: resolutions[alert.id] } : {}),
			})),
		};
	}, [step, scenario]);

	const withScenarioCensus = React.useCallback(
		(patients: CensusPatient[]) => patch(patients, scenario.census),
		[scenario],
	);
	const withScenarioRecords = React.useCallback(
		(records: PatientRecord[]) => patch(records, scenario.records),
		[scenario],
	);
	return { ...feed, caption, startScenario1, withScenarioCensus, withScenarioRecords };
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
