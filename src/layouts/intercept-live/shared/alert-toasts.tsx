import * as React from "react";

import { toastAlert } from "@/components/feedback/alert-toast";
import { toast } from "@/components/feedback/sonner";

import {
	type TriageAlert,
	type TriageAlertAction,
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
// 2026, user's call).

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

type AlertToastPatient = TriageQueuePatient & { photo?: string; mine?: boolean };

type AlertToastsProps = {
	/** The feed's alerts, without the clinician's queue actions, so their own actions don't toast back at them. */
	alerts: TriageAlert[];
	/** The page's patients, for the toast's name, location and avatar. */
	patients: AlertToastPatient[];
	/** Acknowledge in a toast, as in the triage queue. */
	onAlertAction: (alertId: string, action: TriageAlertAction) => void;
	/** A Resolved toast closed with its ×: the patient's card drops its Resolved bar (`useClosedResolutions`). */
	onCloseResolved?: (patientId: string) => void;
};

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
function AlertToasts({ alerts, patients, onAlertAction, onCloseResolved }: AlertToastsProps) {
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
		for (const change of changes) {
			const { alert } = change;
			const patient = byId.get(alert.patientId);
			if (!patient) continue;
			shown.current.set(alert.id, patient.id);
			const attention = needsAttention(change);
			const name = `${patient.lastName}, ${patient.firstName}`;
			toastAlert({
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
				onAcknowledge: attention ? () => onAlertAction(alert.id, { type: "acknowledge" }) : undefined,
				// Ask Intercept Live about the patient, starting with a quick overview (Nov 2, 2026, user's call).
				onAsk: askAboutPatient ? () => askAboutPatient(patient.id, name) : undefined,
				onOpenAlert: openAlert ? () => openAlert(patient.id, alert.id) : undefined,
				onClose: change.kind === "resolved" && onCloseResolved ? () => onCloseResolved(patient.id) : undefined,
			});
		}
	}, [alerts, patients, mineOnly, tones, openPatient, openAlert, askAboutPatient, onAlertAction, onCloseResolved]);

	return null;
}

export { AlertToasts, useClosedResolutions, type AlertToastPatient, type AlertToastsProps };
