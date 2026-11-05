import * as React from "react";

import { toastAlert } from "@/components/feedback/alert-toast";
import { toast, toastsMuted, toastsOnScreen, useToastsMuted, useToastsOnScreen } from "@/components/feedback/sonner";
import { playAlertPing, stopAlertPing } from "@/lib/alert-ping";

import {
	severityOrder,
	type TriageAlert,
	type TriageAlertSeverity,
	type TriageQueuePatient,
} from "../monitoring/triage-queue";
import { usePagePreferences } from "../page-preferences";
import { usePatientNavigation } from "../patient-navigation";
import { alertChanges, type AlertChange } from "./alert-changes";
import { avatarTone, avatarTones, patientInitials } from "./patient-avatar";

// A toast for every change in any patient's alert (Nov 2, 2026, user's call): a new alert, a severity going up or down,
// someone else acknowledging or escalating it, or its resolution. Render it inside InterceptLive, which shows the toasts
// and opens the patients. With My patients on in the page on screen, only the clinician's own patients toast (Nov 2,
// 2026, user's call). A toast the clinician closes (× or Close all) stays closed until the app reloads, whatever its
// severity, Critical and High included; the alert toasts again only if it goes above the severity it had when closed (Nov 3,
// 2026, user's call). Other alerts, the same patient's new ones included, still toast. A new alert a hospital is calling
// about (`consultRequest`, Scenario 2) rings as a consult request instead, whatever the scope or what was closed: it rings
// until answered or declined (Nov 4, 2026, user's call), `ringAfter` seconds after the alert reaches the card. Answer opens
// the alert with the call on. A toast that appears or moves to the front pings once (`playAlertPing`, Nov 4, 2026, user's calls).

const severityWords: Record<TriageAlertSeverity, string> = { critical: "Critical", high: "High", medium: "Medium", low: "Low" };

const changeWords = (change: AlertChange) => {
	switch (change.kind) {
		case "raised":
			return `Up from ${severityWords[change.from]}`;
		case "lowered":
			return `Down from ${severityWords[change.from]}`;
		case "status":
			return { active: "Active again", acknowledged: "Acknowledged", escalated: "Escalated" }[change.status];
		default:
			return undefined;
	}
};

// Changes that need the clinician: the rest (eased, addressed by someone else, resolved) are for their information.
const needsAttention = (change: AlertChange) =>
	change.kind === "new" || change.kind === "raised" || (change.kind === "status" && change.status === "active");

type AlertToastPatient = TriageQueuePatient & {
	photo?: string;
	mine?: boolean;
	tags?: { label: string }[];
	age?: number | string;
	sex?: string;
};

type AlertToastsProps = {
	/** The feed's alerts, without the clinician's queue actions, so their own actions don't toast back at them. */
	alerts: TriageAlert[];
	/** The page's patients, for the toast's name, location and avatar. */
	patients: AlertToastPatient[];
	/** A Resolved toast closed with its ×: the patient's card drops its Resolved bar (`useClosedResolutions`). */
	onCloseResolved?: (patientId: string) => void;
};

// The ping, on the timeout right after Sonner places the toast; skipped if toasts were muted in between.
const pingUnlessMuted = () =>
	window.setTimeout(() => {
		if (!toastsMuted()) playAlertPing();
	});

/**
 * When each patient's Resolved toast was last closed, by patient id, for Monitoring's `closedResolutions`: closing it
 * resets the card to no alert (Nov 2, 2026, user's call). Kept above the pages, like the toasts.
 */
function useClosedResolutions() {
	const [closed, setClosed] = React.useState<Record<string, string>>({});
	const closeResolved = React.useCallback(
		(patientId: string) => setClosed((current) => ({ ...current, [patientId]: new Date().toISOString() })),
		[],
	);
	return { closedResolutions: closed, closeResolved };
}

/**
 * Shows a toast each time a patient's alert changes. The first alerts (the page opening) don't toast. One toast per
 * alert: a later change to the same alert replaces its toast (AL-11). With My patients on in the page on screen, only
 * their patients toast, and turning it on closes the toasts of the others.
 */
function AlertToasts({ alerts, patients, onCloseResolved }: AlertToastsProps) {
	const navigation = usePatientNavigation();
	const openPatient = navigation?.openPatient;
	const askAboutPatient = navigation?.askAboutPatient;
	const openAlert = navigation?.openAlert;
	const preferences = usePagePreferences();
	const mineOnly = Boolean(preferences?.currentPage && preferences.scope[preferences.currentPage] === "mine");
	const tones = React.useMemo(() => avatarTones(patients), [patients]);
	const previous = React.useRef(alerts);
	// The patient behind each toast shown, by alert id (the toast's id), so My patients can close the others' toasts.
	const shown = React.useRef(new Map<string, string>());
	// Toasts that arrived or moved while the toasts were off screen (hidden, or no Toaster), by id: their ping waits.
	const unheard = React.useRef(new Set<string>());
	const onScreen = useToastsOnScreen();
	// The toasts are back on screen: the ones that arrived or moved meanwhile fade in, with one ping, if any is still up.
	React.useEffect(() => {
		if (!onScreen || !unheard.current.size) return;
		const waiting = unheard.current;
		unheard.current = new Set();
		if (toast.getToasts().some((item) => waiting.has(String(item.id)))) pingUnlessMuted();
	}, [onScreen]);
	// Don't show stops alert sounds (Nov 4, 2026, user's call): a ping still sounding, and the ones held for hidden toasts.
	const muted = useToastsMuted();
	React.useEffect(() => {
		if (!muted) return;
		stopAlertPing();
		unheard.current.clear();
	}, [muted]);
	// Consult requests waiting to ring (`ringAfter`), cleared if the toasts go.
	const ringTimers = React.useRef<number[]>([]);
	React.useEffect(
		() => () => {
			for (const timer of ringTimers.current) window.clearTimeout(timer);
		},
		[],
	);
	// The closed toasts, kept by the shell across pages; a page on its own keeps them itself.
	const [ownClosed, setOwnClosed] = React.useState<Record<string, TriageAlertSeverity>>({});
	const closed = preferences?.closedAlertToasts ?? ownClosed;
	const closeToast =
		preferences?.onCloseAlertToast ??
		((alertId: string, severity: TriageAlertSeverity) => setOwnClosed((current) => ({ ...current, [alertId]: severity })));

	React.useEffect(() => {
		if (!mineOnly) return;
		const mine = new Set(patients.filter((patient) => patient.mine).map((patient) => patient.id));
		for (const [alertId, patientId] of shown.current)
			if (!mine.has(patientId)) {
				toast.dismiss(alertId);
				shown.current.delete(alertId);
			}
	}, [mineOnly, patients]);

	React.useEffect(() => {
		if (previous.current === alerts) return;
		const changes = alertChanges(previous.current, alerts);
		previous.current = alerts;
		if (!changes.length) return;

		const inScope = mineOnly ? patients.filter((patient) => patient.mine) : patients;
		const byId = new Map(inScope.map((patient) => [patient.id, patient]));
		// One ping per batch of changes, however many alerts it brings, for the toasts that arrived or moved.
		const pinged: string[] = [];
		for (const change of changes) {
			const { alert } = change;
			const request = change.kind === "new" ? alert.consultRequest : undefined;
			if (request) {
				const caller = patients.find((item) => item.id === alert.patientId);
				if (!caller) continue;
				shown.current.set(alert.id, caller.id);
				const ring = () =>
					toastAlert({
						id: alert.id,
						severity: "consult-request",
						title: request.title,
						// The counter starts when it rings.
						firedAt: new Date().toISOString(),
						requester: request.requester,
						patientName: `${caller.lastName}, ${caller.firstName}`,
						// "64 M · ED Bay 3": who, and where in the hospital the caller is.
						location: [
							[caller.age, caller.sex].filter((part) => part !== undefined).join(" "),
							[caller.unit, caller.bed].filter(Boolean).join(" "),
						]
							.filter(Boolean)
							.join(" · "),
						// The patient's avatar, as on their card.
						photo: caller.photo,
						initials: patientInitials(caller),
						tone: tones.get(caller.id) ?? avatarTone(caller.id),
						reason: request.question ?? alert.reason,
						latest: request.latest,
						urgency: request.urgency,
						onAnswer: openAlert ? () => openAlert(caller.id, alert.id, { consult: "answered" }) : undefined,
						// Declined, the alert stays in the queue and on the card; handing it to another intensivist isn't built yet.
						onDecline: () => {},
					});
				// The alert reaches the card first; the call rings `ringAfter` seconds later (Nov 4, 2026, user's call: 4 s).
				if (request.ringAfter) ringTimers.current.push(window.setTimeout(ring, request.ringAfter * 1000));
				else ring();
				continue;
			}
			const patient = byId.get(alert.patientId);
			if (!patient) continue;
			const closedAs = closed[alert.id];
			if (closedAs && severityOrder.indexOf(alert.severity) >= severityOrder.indexOf(closedAs)) continue;
			shown.current.set(alert.id, patient.id);
			const attention = needsAttention(change);
			const name = `${patient.lastName}, ${patient.firstName}`;
			const shownId = toastAlert({
				id: alert.id,
				severity: change.kind === "resolved" ? "resolved" : alert.severity,
				change: changeWords(change),
				addressed: !attention,
				title: alert.title,
				firedAt: alert.firedAt,
				reason: alert.reason,
				patientName: name,
				location: [patient.hospital, patient.unit, patient.bed].filter(Boolean).join(" · "),
				photo: patient.photo,
				initials: patientInitials(patient),
				tone: tones.get(patient.id) ?? avatarTone(patient.id),
				// Outside the shell there's nowhere to open the patient.
				onOpen: openPatient ? () => openPatient(patient.id) : undefined,
				// Ask Intercept Live about the patient, starting with a quick overview (Nov 2, 2026, user's call).
				onAsk: askAboutPatient
					? () => askAboutPatient(patient.id, name, patient.tags?.map((tag) => tag.label))
					: undefined,
				onOpenAlert: openAlert ? () => openAlert(patient.id, alert.id) : undefined,
				onClose: () => {
					closeToast(alert.id, alert.severity);
					if (change.kind === "resolved") onCloseResolved?.(patient.id);
				},
			});
			// A toast that appears (a new alert) or moves to the front (its status changed: raised, lowered, acknowledged,
			// escalated, active again, resolved) pings, once (Nov 4, 2026, user's call). None while toasts are muted (no toast).
			if (shownId !== undefined) pinged.push(alert.id);
		}
		// It plays as the toast arrives or moves to the front (Nov 4, 2026, user's call: "at the same time sonner move"):
		// Sonner places toasts on a timeout after `toastAlert()`, so the ping waits for the same one, which runs right after
		// Sonner's.
		// Only while the toasts are on screen (Nov 4, 2026, user's call: "I hear a ping and nothing happened"): with the
		// Toaster hidden (the alert modal, a patient's page, the live feed panel) or not mounted, the ping waits for them.
		if (!pinged.length) return;
		if (toastsOnScreen()) pingUnlessMuted();
		else for (const id of pinged) unheard.current.add(id);
	}, [alerts, patients, mineOnly, tones, openPatient, openAlert, askAboutPatient, onCloseResolved, closed, closeToast]);

	return null;
}

export { AlertToasts, useClosedResolutions, type AlertToastPatient, type AlertToastsProps };
