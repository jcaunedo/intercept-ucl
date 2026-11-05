import * as React from "react";

import type { MonitorVitals } from "@/components/cards/patient-monitoring-card";

import type { AlertConsultState, AlertDetailData } from "../alert-modal/alert-modal";
import {
	COSIGN_DELAY_MS,
	type CarePathwayDecision,
	type CarePathwayOrder,
	type CarePathwayStatus,
} from "../alert-modal/care-pathway";
import { consentText, type DischargeDecision, type DischargePlan, type ReferralOutcome } from "../alert-modal/discharge-plan";
import type { KeepOrTransferDecision, TransferChoice } from "../alert-modal/keep-or-transfer";
import type { CensusPatient } from "../census/census-panel";
import type { MonitoringPatient, TriageAlert } from "../monitoring/monitoring";
import { sampleLiveScenario } from "../monitoring/sample-live-scenario";
import { sampleMonitoringAlerts, sampleMonitoringPatients } from "../monitoring/sample-monitoring";
import type { EscalationTarget, TriageAlertAction } from "../monitoring/triage-queue";
import type { PatientActivity, PatientCarePlan } from "../patient-details/activity";
import type { PatientRecord } from "../patient-details/patient-details";
import type { PatientNote } from "../patient-details/sections/notes-section";
import type { ActiveOrder, OrderRecommendation, PatientOrders } from "../patient-details/sections/orders-section";
import { sampleScenario1, type ScenarioBeat, type ScenarioChanges, type ScenarioDefinition } from "./sample-scenario-1";
import { sampleScenario2 } from "./sample-scenario-2";
import { sampleUser } from "./sample-workspace";

// Story-only helpers: they play the scripted live feed into the Census and Monitoring stories. Apps get the same data
// from their APIs instead.

// When the feed changes: the first resolve at 8 s, then a random 15 to 30 s between changes, as the panels' re-sorts,
// so the story stays calm and uneven, as a real feed is.
const firstChanges = [8];
const changeGap = [15, 30] as const;
const nextChangeIn = (tick: number) =>
	tick < firstChanges.length ? firstChanges[tick] : changeGap[0] + Math.random() * (changeGap[1] - changeGap[0]);

// The Prototype menu's scenarios (Demo Use Cases), by the id the menu starts them with.
const sampleScenarios = {
	"scenario-1": sampleScenario1,
	"scenario-2": sampleScenario2,
} satisfies Record<string, ScenarioDefinition>;

type ScenarioId = keyof typeof sampleScenarios;

const scenarioIds = Object.keys(sampleScenarios) as ScenarioId[];

/** The scenario an alert belongs to. */
const scenarioOfAlert = (alertId: string) => scenarioIds.find((id) => sampleScenarios[id].alertIds.includes(alertId));

// How long after its trigger a beat plays, unless it says (`delay`). The first beat: just before the panel's first
// re-sort when the menu opens Monitoring, so the change shows in the order at once. After the consult is on: time to see
// the call before something happens to it. The resolution: time to read "Keeping at …" and its checkpoints before they
// pass; the night goes by in these seconds.
const beatDelays: Record<ScenarioBeat["after"], number> = { start: 1.5, consult: 6, keep: 6 };

/**
 * What the clinician decided in an alert's modal: where its pathway is, the orders as sent (an edited dose, or their own
 * pathway) and keep or transfer. For the patient's page: when the pathway was sent (or declined) and co-signed, the
 * orders as suggested and which were edited, and a decline's reason.
 */
type ScenarioDecision = {
	pathwayStatus?: CarePathwayStatus;
	orders?: { title?: string; orders: CarePathwayOrder[] };
	transfer?: TransferChoice;
	sentAt?: string;
	cosignedAt?: string;
	suggested?: CarePathwayOrder[];
	edited?: string[];
	rationale?: string;
};

/** An activity log entry, with the patient it's about. */
type ScenarioActivity = PatientActivity & { patientId: string };

/** A consult note the clinician approved from the AI Notetaker, for the patient's Notes. */
type ScenarioNote = { id: string; patientId: string; at: string; text: string; sessionAt: string };

// The clinician's own actions read "You", as the triage queue's "by you".
const YOU = "You";

const severityLabels: Record<TriageAlert["severity"], string> = {
	critical: "Critical",
	high: "High",
	medium: "Medium",
	low: "Low",
};

const byTime = (a: { at: string }, b: { at: string }) => Date.parse(a.at) - Date.parse(b.at);

/** "1 h", "90 min". */
const afterLabel = (minutes: number) => (minutes % 60 ? `${minutes} min` : `${minutes / 60} h`);

/** "2 min 10 s", "45 s". */
function formatDuration(ms: number) {
	const seconds = Math.max(0, Math.round(ms / 1000));
	const minutes = Math.floor(seconds / 60);
	return minutes ? `${minutes} min${seconds % 60 ? ` ${seconds % 60} s` : ""}` : `${seconds} s`;
}

/** What an alert action reads as in the activity log. */
function alertActionEntry(
	alert: TriageAlert,
	action: TriageAlertAction,
	targets: EscalationTarget[],
): Omit<PatientActivity, "id" | "at"> {
	const about = (...parts: (string | undefined)[]) => parts.filter(Boolean).join(" · ");
	switch (action.type) {
		case "acknowledge":
			return { kind: "alert", title: "Alert acknowledged", detail: alert.title, by: YOU };
		case "unacknowledge":
			return { kind: "alert", title: "Acknowledge taken back", detail: alert.title, by: YOU };
		case "escalate": {
			const to = targets.find((target) => target.id === action.targetId)?.name ?? action.targetId;
			return { kind: "alert", title: `Alert escalated to ${to}`, detail: about(alert.title, action.note), by: YOU };
		}
		case "resolve":
			return { kind: "alert", title: "Alert resolved", detail: about(alert.title, action.reason, action.note), by: YOU };
		case "decline":
			return { kind: "alert", title: "Marked AI wrong", detail: about(alert.title, action.note), by: YOU };
	}
}

/**
 * The patient's care plan from an alert's detail as the clinician left it: the pathway once it was sent or declined
 * (its orders as sent, the edited ones marked with their suggestion), and keep or transfer once decided, with the
 * checkpoints' due times and results and "Transfer avoided".
 */
function carePlanOf(detail: AlertDetailData, decision?: ScenarioDecision): PatientCarePlan {
	const { pathway, transfer } = detail;
	const status = detail.pathwayStatus;
	const decided = transfer?.decided;
	return {
		pathway:
			pathway && decision?.sentAt && status && status !== "suggested"
				? {
						title: pathway.title,
						status: status === "declined" ? "declined" : decision.cosignedAt ? "active" : "pending",
						orders: pathway.orders.map((order) => ({
							name: order.name,
							dose: order.dose,
							suggested: decision.edited?.includes(order.id)
								? decision.suggested?.find((item) => item.id === order.id)?.dose
								: undefined,
						})),
						at: decision.sentAt,
						by: YOU,
						cosigner: pathway.cosigner.name,
						cosignedAt: decision.cosignedAt,
						rationale: decision.rationale,
					}
				: undefined,
		transfer:
			transfer && decided
				? {
						label:
							decided.type === "keep"
								? `Keeping at ${transfer.hospital}`
								: `Transfer to ${transfer.receiving.find((item) => item.id === decided.receivingId)?.name ?? "another hospital"}`,
						rationale: decided.rationale,
						at: decided.at,
						by: YOU,
						checkpoints:
							decided.type === "keep"
								? transfer.checkpoints.map((checkpoint) => ({
										id: checkpoint.id,
										label: afterLabel(checkpoint.after),
										due: new Date(Date.parse(decided.at) + checkpoint.after * 60_000).toISOString(),
										criteria: checkpoint.criteria,
										result: checkpoint.result,
									}))
								: [],
						outcome: transfer.outcome
							? {
									label: "Transfer avoided",
									items: [
										{ label: "Trip the family didn't make", value: transfer.outcome.distance },
										{ label: "Estimated transfer cost avoided", value: transfer.outcome.cost },
										...(transfer.outcome.careHours
											? [{ label: "ICU-level care delivered here", value: transfer.outcome.careHours }]
											: []),
									],
								}
							: undefined,
					}
				: undefined,
	};
}

/**
 * The patient's Orders with the pathway sent from an alert (DU-23): a Care pathway recommendation, accepted (with the
 * edited doses) and sent for co-signature, then signed by the local physician; once co-signed, its orders are active.
 */
function ordersWithPathway(
	record: PatientRecord,
	detail: AlertDetailData,
	pathway: NonNullable<PatientCarePlan["pathway"]>,
): PatientOrders {
	const edited = pathway.orders.filter((order) => order.suggested);
	const recommendation: OrderRecommendation = {
		id: `pathway-${detail.alert.id}`,
		agent: "Care pathway",
		kind: "care-pathway",
		title: pathway.title,
		order: pathway.orders.map((order) => `${order.name}: ${order.dose}`).join("; "),
		reason: detail.alert.reason ?? detail.alert.title,
		evidence: (detail.pathway?.orders ?? [])
			.filter((order) => order.evidence)
			.map((order) => ({ label: `${order.name}: based on ${order.evidence}`, source: detail.alert.source.name, at: detail.alert.firedAt })),
		protocol: { kind: "hospital", name: detail.pathway?.source ?? pathway.title },
		suggestedAt: detail.alert.firedAt,
		outcome:
			pathway.status === "declined"
				? { kind: "declined", at: pathway.at, by: "you", rationale: pathway.rationale }
				: {
						kind: "taken",
						at: pathway.at,
						by: "you",
						modified: edited.length ? edited.map((order) => `${order.name}: ${order.dose}`).join("; ") : undefined,
						writeBack: pathway.cosignedAt
							? { status: "signed", by: pathway.cosigner, at: pathway.cosignedAt }
							: { status: "sent", at: pathway.at },
					},
	};
	const active: ActiveOrder[] =
		pathway.status === "active"
			? pathway.orders.map((order, index) => ({
					id: `pathway-${detail.alert.id}-${index}`,
					type: /bipap|cpap|oxygen/i.test(order.name) ? "respiratory" : "medication",
					name: order.name,
					details: order.dose,
					orderedBy: `${sampleUser.name}, co-signed by ${pathway.cosigner}`,
					orderedAt: pathway.cosignedAt ?? pathway.at,
					status: "Active",
				}))
			: [];
	return {
		hospital: record.orders?.hospital ?? detail.patient.hospital ?? "",
		source: record.orders?.source ?? record.emr?.name ?? "the hospital's record",
		updatedAt: pathway.cosignedAt ?? pathway.at,
		writeBack: record.orders?.writeBack ?? true,
		supervisor: record.orders?.supervisor,
		recommendations: [recommendation, ...(record.orders?.recommendations ?? [])],
		checks: record.orders?.checks,
		active: [...active, ...(record.orders?.active ?? [])],
	};
}

// A pathway's status after each decision. Co-signature is simulated, so an accepted or written pathway counts as active.
const pathwayStatusAfter: Record<CarePathwayDecision["type"], CarePathwayStatus> = {
	accept: "active",
	create: "active",
	decline: "declined",
	undecline: "suggested",
};

/** The items, then the arrivals that aren't among them yet. */
function withAdmitted<T extends { id: string }>(items: T[], arrivals: T[]): T[] {
	const fresh = arrivals.filter((arrival) => !items.some((item) => item.id === arrival.id));
	return fresh.length ? [...items, ...fresh] : items;
}

/** Patches each item whose id has changes. */
function patch<T extends { id: string }>(items: T[], changes: Record<string, Partial<T>>): T[] {
	return items.map((item) => (changes[item.id] ? { ...item, ...changes[item.id] } : item));
}

/**
 * Plays `sampleLiveScenario`, one step at a time (at 8 s, then every 15 to 30 s), and starts over after the last
 * step: vitals change, alerts change severity, fire and resolve. A resolved alert leaves the feed (the feed resolved
 * it, not the clinician). `caption` is what the last change was, for the hospital bar's Live feed.
 *
 * `startScenario(id)` (the Prototype menu's Scenarios) puts the scenario's patients back to just before it and plays
 * its beats (`sampleScenario1`: Margaret Hayes; `sampleScenario2`: Dale Reynolds, who arrives with it): their alerts in
 * `alerts`, their monitors in `patients`, and their Census cards and records through `withScenarioCensus` and
 * `withScenarioRecords`, so every page and the chat follow. Until then they hold (or, arriving, aren't there). Each
 * scenario starts over on its own, so the other one's run stays. `onPathwayDecision` and `onTransferDecision` take what
 * the clinician decides in the alert modal, and `withScenarioAlertDetails` gives it back to the modal, so it doesn't
 * start over when it reopens. Keeping the patient plays the scenario's resolution a few seconds later: vitals recover,
 * the alert resolves and the transfer is avoided. Taking the decision back before then cancels it. `onDischargeDecision`
 * takes a discharge referral sent or skipped (Scenario 2, step 6), from the alert or the patient's page, by patient;
 * both give it back, so each shows what was done in the other.
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

	// The scenarios' beats played so far, each built when it played, and the clinician's decisions in the alert modal. A
	// scenario's new run starts its own from none.
	const [beats, setBeats] = React.useState<
		{ scenario: ScenarioId; after: ScenarioBeat["after"]; changes: ScenarioChanges; at: string }[]
	>([]);
	const [decisions, setDecisions] = React.useState<Record<string, ScenarioDecision>>({});
	// Each call's connection, by alert, over what the beats set (Nov 4, 2026, user's call): a dropped connection belongs to
	// that call. Ending the call puts it back on video; a later call starts on video and drops again, as the first did.
	const [callConnections, setCallConnections] = React.useState<
		Record<string, { mode: "video" } | { mode: "low-bandwidth"; since: string }>
	>({});
	const redrops = React.useRef<Record<string, number>>({});
	// The discharge referrals sent or skipped, by patient, then by referral.
	const [dischargeDecisions, setDischargeDecisions] = React.useState<Record<string, Record<string, ReferralOutcome>>>({});
	// The beats, for callbacks that mustn't change with them.
	const beatsPlayed = React.useRef(beats);
	beatsPlayed.current = beats;
	// The activity log and the consult notes, for the patients' pages: what the clinician did, as it happened.
	const [log, setLog] = React.useState<ScenarioActivity[]>([]);
	const [notes, setNotes] = React.useState<ScenarioNote[]>([]);
	const logCount = React.useRef(0);
	// When each alert's video consult started, while it's on.
	const consultStarted = React.useRef<Record<string, string>>({});
	// Co-signatures still to come, by alert, so a new run cancels its own.
	const timers = React.useRef<{ alertId: string; timer: number }[]>([]);
	// Each scenario's beats still to come, by their trigger.
	const beatTimers = React.useRef<{ scenario: ScenarioId; after: ScenarioBeat["after"]; timer: number }[]>([]);
	React.useEffect(
		() => () => {
			for (const { timer } of [...timers.current, ...beatTimers.current]) window.clearTimeout(timer);
		},
		[],
	);
	const addActivity = React.useCallback((patientId: string, entry: Omit<PatientActivity, "id" | "at">) => {
		logCount.current += 1;
		const id = `log-${logCount.current}`;
		setLog((current) => [...current, { ...entry, id, at: new Date().toISOString(), patientId }]);
	}, []);
	const playBeat = React.useCallback(
		(scenario: ScenarioId, beat: ScenarioBeat) => {
			const at = new Date().toISOString();
			const changes = beat.changes();
			setBeats((current) => [...current, { scenario, after: beat.after, changes, at }]);
			setCaption(beat.label);
			for (const { patientId, ...entry } of changes.log ?? []) addActivity(patientId, entry);
		},
		[addActivity],
	);
	/** Plays the scenario's beats for a trigger, each after its delay. */
	const schedule = React.useCallback(
		(scenario: ScenarioId, after: ScenarioBeat["after"]) => {
			for (const beat of sampleScenarios[scenario].beats.filter((item) => item.after === after)) {
				const timer = window.setTimeout(() => playBeat(scenario, beat), (beat.delay ?? beatDelays[after]) * 1000);
				beatTimers.current.push({ scenario, after, timer });
			}
		},
		[playBeat],
	);
	/** Cancels the scenario's beats still to come, for a trigger or all of them. */
	const cancel = React.useCallback((scenario: ScenarioId, after?: ScenarioBeat["after"]) => {
		beatTimers.current = beatTimers.current.filter((item) => {
			if (item.scenario !== scenario || (after && item.after !== after)) return true;
			window.clearTimeout(item.timer);
			return false;
		});
	}, []);
	const startScenario = React.useCallback(
		(scenario: ScenarioId) => {
			const { patientIds, alertIds } = sampleScenarios[scenario];
			setBeats((current) => current.filter((beat) => beat.scenario !== scenario));
			setDecisions((current) => Object.fromEntries(Object.entries(current).filter(([alertId]) => !alertIds.includes(alertId))));
			setDischargeDecisions((current) =>
				Object.fromEntries(Object.entries(current).filter(([patientId]) => !patientIds.includes(patientId))),
			);
			setCallConnections((current) =>
				Object.fromEntries(Object.entries(current).filter(([alertId]) => !alertIds.includes(alertId))),
			);
			for (const alertId of alertIds) {
				window.clearTimeout(redrops.current[alertId]);
				delete redrops.current[alertId];
			}
			setLog((current) => current.filter((entry) => !patientIds.includes(entry.patientId)));
			setNotes((current) => current.filter((note) => !patientIds.includes(note.patientId)));
			for (const alertId of alertIds) delete consultStarted.current[alertId];
			timers.current = timers.current.filter(({ alertId, timer }) => {
				if (!alertIds.includes(alertId)) return true;
				window.clearTimeout(timer);
				return false;
			});
			cancel(scenario);
			schedule(scenario, "start");
		},
		[cancel, schedule],
	);

	const onPathwayDecision = React.useCallback(
		(alertId: string, decision: CarePathwayDecision, detail?: AlertDetailData) => {
			const at = new Date().toISOString();
			setDecisions((current) => ({
				...current,
				[alertId]: {
					...current[alertId],
					pathwayStatus: pathwayStatusAfter[decision.type],
					// The orders as sent, so a reopened modal shows the edited dose; a decline or undo goes back to the suggestion.
					orders:
						decision.type === "accept"
							? { orders: decision.orders }
							: decision.type === "create"
								? { title: decision.title, orders: decision.orders }
								: undefined,
					sentAt: decision.type === "undecline" ? undefined : at,
					cosignedAt: undefined,
					suggested: decision.type === "accept" ? detail?.pathway?.orders : undefined,
					edited: decision.type === "accept" ? decision.edited : undefined,
					rationale: decision.type === "decline" ? decision.rationale : undefined,
				},
			}));
			if (!detail) return;
			const patientId = detail.alert.patientId;
			const title = decision.type === "create" ? decision.title : (detail.pathway?.title ?? "Care pathway");
			if (decision.type === "decline") {
				addActivity(patientId, { kind: "decision", title: `${title} declined`, detail: decision.rationale, by: YOU });
				return;
			}
			if (decision.type === "undecline") {
				addActivity(patientId, { kind: "decision", title: `${title}: decline taken back`, by: YOU });
				return;
			}
			const edited = decision.type === "accept" ? decision.edited : [];
			addActivity(patientId, {
				kind: "order",
				title: `${title} sent for co-signature`,
				detail: [
					decision.orders.map((order) => (edited.includes(order.id) ? `${order.name} (edited: ${order.dose})` : order.name)).join(", "),
					decision.type === "accept" && decision.note ? `Note: ${decision.note}` : undefined,
				]
					.filter(Boolean)
					.join(" · "),
				by: YOU,
			});
			// The local physician co-signs from home, as the alert stands it in (`COSIGN_DELAY_MS`).
			const cosigner = detail.pathway?.cosigner;
			timers.current.push({
				alertId,
				timer: window.setTimeout(() => {
					const cosignedAt = new Date().toISOString();
					setDecisions((current) =>
						current[alertId]?.sentAt === at ? { ...current, [alertId]: { ...current[alertId], cosignedAt } } : current,
					);
					addActivity(patientId, {
						kind: "order",
						title: "Orders co-signed",
						detail: "Orders active. The bedside team carries them out.",
						by: cosigner ? `${cosigner.name}, ${cosigner.role}` : undefined,
					});
				}, COSIGN_DELAY_MS),
			});
		},
		[addActivity],
	);
	const onTransferDecision = React.useCallback(
		(alertId: string, decision: KeepOrTransferDecision, detail?: AlertDetailData) => {
			const at = new Date().toISOString();
			const transfer: TransferChoice | undefined = decision.type === "undo" ? undefined : { ...decision, at };
			setDecisions((current) => ({ ...current, [alertId]: { ...current[alertId], transfer } }));
			if (detail?.transfer) {
				const { hospital, receiving, transport } = detail.transfer;
				const patientId = detail.alert.patientId;
				if (decision.type === "keep") {
					addActivity(patientId, { kind: "decision", title: `Keeping at ${hospital}`, detail: decision.rationale, by: YOU });
				} else if (decision.type === "transfer") {
					const to = receiving.find((item) => item.id === decision.receivingId)?.name;
					const by = transport.find((item) => item.id === decision.transportId)?.label;
					addActivity(patientId, {
						kind: "decision",
						title: to ? `Transfer requested to ${to}` : "Transfer requested",
						detail: [by, decision.rationale].filter(Boolean).join(" · "),
						by: YOU,
					});
				} else {
					addActivity(patientId, { kind: "decision", title: "Keep or transfer decision taken back", by: YOU });
				}
			}
			// Keeping the patient plays the scenario's resolution; taking it back, or transferring, cancels it. Only a run's
			// first keep plays it; once it has played, it stays.
			const scenario = scenarioOfAlert(alertId);
			if (!scenario) return;
			if (beats.some((beat) => beat.scenario === scenario && beat.after === "keep")) return;
			cancel(scenario, "keep");
			if (decision.type === "keep") schedule(scenario, "keep");
		},
		[beats, addActivity, cancel, schedule],
	);
	// A discharge referral sent, skipped or its skip taken back, wherever it was decided; in the log with the referral's name.
	const onDischargeDecision = React.useCallback(
		(patientId: string, decision: DischargeDecision) => {
			const at = new Date().toISOString();
			setDischargeDecisions((current) => {
				const { [decision.referralId]: _, ...rest } = current[patientId] ?? {};
				const outcome: ReferralOutcome | undefined =
					decision.type === "send"
						? { type: "sent", consent: decision.consent, at }
						: decision.type === "skip"
							? { type: "skipped", rationale: decision.rationale, at }
							: undefined;
				return { ...current, [patientId]: outcome ? { ...rest, [decision.referralId]: outcome } : rest };
			});
			const plan = beatsPlayed.current
				.map((beat) => beat.changes.records?.[patientId]?.discharge)
				.filter((item): item is DischargePlan => Boolean(item))
				.at(-1);
			const referral = plan?.referrals.find((item) => item.id === decision.referralId);
			const title = referral?.title ?? "Referral";
			if (decision.type === "send") {
				addActivity(patientId, {
					kind: "order",
					title: `Referral sent: ${title}`,
					detail: [referral ? `To ${referral.to}` : undefined, `Consent: ${consentText(decision.consent)}`]
						.filter(Boolean)
						.join(" · "),
					by: YOU,
				});
			} else if (decision.type === "skip") {
				addActivity(patientId, { kind: "decision", title: `Referral skipped: ${title}`, detail: decision.rationale, by: YOU });
			} else {
				addActivity(patientId, { kind: "decision", title: `Referral skip taken back: ${title}`, by: YOU });
			}
		},
		[addActivity],
	);
	// The video consult: its start (ringing the bedside) and its end, with how long it lasted.
	const onConsultChange = React.useCallback(
		(alertId: string, state: AlertConsultState, detail?: AlertDetailData) => {
			// The scenario's consult beats, the first time its call is on in a run (Scenario 2: the network drops).
			const scenario = scenarioOfAlert(alertId);
			const consultBeats = scenario ? sampleScenarios[scenario].beats.some((beat) => beat.after === "consult") : false;
			const dropPlayed = beatsPlayed.current.some((beat) => beat.scenario === scenario && beat.after === "consult");
			const dropPending = beatTimers.current.some((item) => item.scenario === scenario && item.after === "consult");
			if (state === "live" && scenario && consultBeats) {
				if (!dropPlayed) {
					// The first call: the beat drops it (still to come if an earlier call ended before it did).
					setCallConnections(({ [alertId]: _, ...rest }) => rest);
					if (!dropPending) schedule(scenario, "consult");
				} else {
					// A later call starts on video, and the connection, still bad, drops again as the first call's did.
					setCallConnections((current) => ({ ...current, [alertId]: { mode: "video" } }));
					window.clearTimeout(redrops.current[alertId]);
					redrops.current[alertId] = window.setTimeout(() => {
						delete redrops.current[alertId];
						setCallConnections((current) => ({
							...current,
							[alertId]: { mode: "low-bandwidth", since: new Date().toISOString() },
						}));
						if (detail) {
							addActivity(detail.alert.patientId, {
								kind: "consult",
								title: "Low-bandwidth mode: audio only",
								detail: "The connection dropped again mid-consult. Vitals every 30 s; photos sent as they're taken",
							});
						}
					}, beatDelays.consult * 1000);
				}
			}
			// Ending the call ends its connection: back on video for the next one.
			if (state === "idle" && scenario && consultBeats) {
				window.clearTimeout(redrops.current[alertId]);
				delete redrops.current[alertId];
				setCallConnections((current) => ({ ...current, [alertId]: { mode: "video" } }));
			}
			if (!detail) return;
			const started = consultStarted.current[alertId];
			if (state === "connecting" && !started) {
				consultStarted.current[alertId] = new Date().toISOString();
				const who = detail.bedside ? `${detail.bedside.name}, ${detail.bedside.role}` : "the bedside";
				addActivity(detail.alert.patientId, {
					kind: "consult",
					title: `Video consult with ${who}`,
					detail: detail.patient.bed ? `Bedside camera, ${detail.patient.bed}` : undefined,
					by: YOU,
				});
			} else if (state === "idle" && started) {
				delete consultStarted.current[alertId];
				addActivity(detail.alert.patientId, {
					kind: "consult",
					title: "Video consult ended",
					detail: `Lasted ${formatDuration(Date.now() - Date.parse(started))}`,
					by: YOU,
				});
			}
		},
		[addActivity, schedule],
	);
	// The AI Notetaker's draft, approved: a consult note for her Notes, a draft for signature.
	const onConsultNote = React.useCallback(
		(alertId: string, note: string, detail?: AlertDetailData) => {
			if (!detail) return;
			const at = new Date().toISOString();
			const patientId = detail.alert.patientId;
			const sessionAt = consultStarted.current[alertId] ?? at;
			setNotes((current) => [...current, { id: `consult-note-${current.length + 1}`, patientId, at, text: note, sessionAt }]);
			addActivity(patientId, {
				kind: "note",
				title: "Consult note approved",
				detail: "AI Notetaker draft, added to the chart for signature",
				by: YOU,
			});
		},
		[addActivity],
	);

	const scenario = React.useMemo(() => {
		const admitted: NonNullable<ScenarioChanges["admit"]> = [];
		const census: Record<string, Partial<CensusPatient>> = {};
		const monitoring: Record<string, Partial<MonitoringPatient>> = {};
		const records: Record<string, Partial<PatientRecord>> = {};
		const fired: TriageAlert[] = [];
		const resolved: Record<string, NonNullable<TriageAlert["addressed"]>> = {};
		const details: Record<string, ((detail: AlertDetailData) => AlertDetailData)[]> = {};
		for (const { changes, at } of beats) {
			for (const patient of changes.admit ?? []) {
				if (!admitted.some((item) => item.census.id === patient.census.id)) admitted.push(patient);
			}
			for (const [id, change] of Object.entries(changes.census ?? {})) census[id] = { ...census[id], ...change };
			for (const [id, change] of Object.entries(changes.monitoring ?? {})) monitoring[id] = { ...monitoring[id], ...change };
			for (const [id, change] of Object.entries(changes.records ?? {})) records[id] = { ...records[id], ...change };
			for (const alert of changes.fire ?? []) fired.push({ ...alert, firedAt: at });
			for (const [id, addressed] of Object.entries(changes.resolve ?? {})) resolved[id] = { ...addressed, at };
			for (const [id, change] of Object.entries(changes.details ?? {})) details[id] = [...(details[id] ?? []), change];
		}
		return { admitted, census, monitoring, records, fired, resolved, details };
	}, [beats]);

	const feed = React.useMemo(() => {
		if (step === 0) {
			firedAt.current = {};
			resolvedAt.current = {};
		}
		const vitals: Record<string, Partial<MonitorVitals>> = {};
		const updates: Record<string, Partial<TriageAlert>> = {};
		const fired: TriageAlert[] = [];
		// The scenario's resolutions too.
		const resolved = new Set<string>(Object.keys(scenario.resolved));
		const resolutions: Record<string, TriageAlert["addressed"]> = { ...scenario.resolved };
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
			patients: patch(
				withAdmitted(
					sampleMonitoringPatients,
					scenario.admitted.map((patient) => patient.monitoring),
				),
				scenario.monitoring,
			).map((patient) =>
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

	// An alert action, wherever it was taken (the alert, the live feed, the patient's page, the chat), in the log.
	const everyAlert = React.useRef<TriageAlert[]>([]);
	everyAlert.current = feed.everyAlert;
	const logAlertAction = React.useCallback(
		(alertId: string, action: TriageAlertAction, targets: EscalationTarget[] = []) => {
			const alert = everyAlert.current.find((item) => item.id === alertId);
			if (alert) addActivity(alert.patientId, alertActionEntry(alert, action, targets));
		},
		[addActivity],
	);

	// The scenarios' arrivals join the lists last, so everyone else keeps their place.
	const withScenarioCensus = React.useCallback(
		(patients: CensusPatient[]) =>
			patch(
				withAdmitted(
					patients,
					scenario.admitted.map((patient) => patient.census),
				),
				scenario.census,
			),
		[scenario],
	);
	// A discharge plan with what was sent or skipped. The same object while nothing changes, so the panel keeps its state.
	const withDischargeDecisions = React.useCallback(
		<T extends { discharge?: DischargePlan }>(item: T, patientId: string): T => {
			const decided = dischargeDecisions[patientId];
			return item.discharge && decided ? { ...item, discharge: { ...item.discharge, decided } } : item;
		},
		[dischargeDecisions],
	);
	const withScenarioRecords = React.useCallback(
		(records: PatientRecord[]) =>
			patch(
				withAdmitted(
					records,
					scenario.admitted.map((patient) => patient.record),
				),
				scenario.records,
			).map((record) => withDischargeDecisions(record, record.id)),
		[scenario, withDischargeDecisions],
	);
	// The modal's data with what the clinician decided (so it reopens as they left it), then the beats' changes.
	const withScenarioAlertDetails = React.useCallback(
		(alertDetails: AlertDetailData[]) =>
			alertDetails.map((detail) => {
				const decided = decisions[detail.alert.id];
				const withDecisions: AlertDetailData = decided
					? {
							...detail,
							pathwayStatus: decided.pathwayStatus ?? detail.pathwayStatus,
							pathway:
								detail.pathway && decided.orders
									? {
											...detail.pathway,
											title: decided.orders.title ?? detail.pathway.title,
											orders: decided.orders.orders,
										}
									: detail.pathway,
							transfer: detail.transfer && { ...detail.transfer, decided: decided.transfer },
						}
					: detail;
				const changed = (scenario.details[detail.alert.id] ?? []).reduce((current, change) => change(current), withDecisions);
				// The call's own connection, over the beats': back on video once it ended, dropped again on a later call.
				const call = callConnections[detail.alert.id];
				const connected =
					call && changed.connection
						? {
								...changed,
								connection: { ...changed.connection, mode: call.mode, since: call.mode === "video" ? undefined : call.since },
							}
						: changed;
				return withDischargeDecisions(connected, detail.alert.patientId);
			}),
		[decisions, scenario, withDischargeDecisions, callConnections],
	);
	/**
	 * The records with what was done and decided (Patient details): the activity log (the scenarios' alerts as they fired and
	 * resolved, its checkpoints and outcome, and everything the clinician did), the care plan from the alerts' decisions,
	 * the pathway in Orders and the approved consult notes in Notes. `alertDetails` are the alerts' details as the modal
	 * shows them, with the decisions applied (`withScenarioAlertDetails`).
	 */
	const withScenarioActivity = React.useCallback(
		(records: PatientRecord[], alertDetails: AlertDetailData[]) => {
			const entries: ScenarioActivity[] = [...log];
			for (const alert of scenario.fired) {
				entries.push({
					id: `fired-${alert.id}`,
					patientId: alert.patientId,
					at: alert.firedAt,
					kind: "alert",
					title: `${severityLabels[alert.severity]} alert: ${alert.title}`,
					detail: alert.reason,
					by: alert.source.name,
				});
			}
			// The resolution, as it played: the checkpoints that passed, the alert resolved and the transfer avoided.
			for (const [alertId, addressed] of Object.entries(scenario.resolved)) {
				const detail = alertDetails.find((item) => item.alert.id === alertId);
				if (!detail) continue;
				const patientId = detail.alert.patientId;
				for (const checkpoint of detail.transfer?.checkpoints ?? []) {
					if (!checkpoint.result) continue;
					entries.push({
						id: `checkpoint-${alertId}-${checkpoint.id}`,
						patientId,
						at: addressed.at,
						kind: "outcome",
						title: `${afterLabel(checkpoint.after)} checkpoint ${checkpoint.result.status}`,
						detail: checkpoint.result.detail,
					});
				}
				entries.push({
					id: `resolved-${alertId}`,
					patientId,
					at: addressed.at,
					kind: "alert",
					title: "Alert resolved",
					detail: [addressed.reason, addressed.note].filter(Boolean).join(" · ") || undefined,
					by: addressed.by,
				});
				const outcome = detail.transfer?.outcome;
				if (outcome) {
					entries.push({
						id: `outcome-${alertId}`,
						patientId,
						at: addressed.at,
						kind: "outcome",
						title: "Transfer avoided",
						detail: [
							`Trip the family didn't make: ${outcome.distance}`,
							outcome.careHours ? `ICU-level care delivered here: ${outcome.careHours}` : undefined,
							`Estimated transfer cost avoided: ${outcome.cost}`,
						]
							.filter(Boolean)
							.join(" · "),
					});
				}
			}

			return records.map((record) => {
				const activity = entries
					.filter((entry) => entry.patientId === record.id)
					.sort(byTime)
					.map(({ patientId: _, ...entry }) => entry);
				// The latest alert the clinician acted on gives the plan.
				const decided = alertDetails.filter(
					(detail) =>
						detail.alert.patientId === record.id && (decisions[detail.alert.id]?.sentAt || detail.transfer?.decided),
				);
				const planned = decided.at(-1);
				const carePlan = planned ? carePlanOf(planned, decisions[planned.alert.id]) : undefined;
				const consultNotes: PatientNote[] = notes
					.filter((note) => note.patientId === record.id)
					.map((note) => ({
						id: note.id,
						type: "Consult note",
						author: { name: sampleUser.name, role: "Intercept intensivist" },
						at: note.at,
						origin: "intercept",
						status: "draft",
						scribe: { sessionAt: note.sessionAt },
						sections: note.text
							.split("\n")
							.filter(Boolean)
							.map((text) => ({ text })),
					}));
				if (!activity.length && !carePlan && !consultNotes.length) return record;
				return {
					...record,
					activity: activity.length ? activity : record.activity,
					carePlan: carePlan ?? record.carePlan,
					orders: planned && carePlan?.pathway ? ordersWithPathway(record, planned, carePlan.pathway) : record.orders,
					notes: consultNotes.length
						? {
								emr: record.notes?.emr ?? record.emr?.name ?? "the hospital's record",
								notes: [...consultNotes.reverse(), ...(record.notes?.notes ?? [])],
							}
						: record.notes,
				};
			});
		},
		[log, notes, decisions, scenario],
	);

	return {
		...feed,
		caption,
		startScenario,
		withScenarioCensus,
		withScenarioRecords,
		withScenarioAlertDetails,
		withScenarioActivity,
		onPathwayDecision,
		onTransferDecision,
		onDischargeDecision,
		onConsultChange,
		onConsultNote,
		logAlertAction,
	};
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

export { useSampleLiveFeed, withFeedAlerts, type ScenarioId };
