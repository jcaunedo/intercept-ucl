import { isOpenAlert, severityOrder, type TriageAlert, type TriageAlertSeverity } from "../monitoring/triage-queue";

// What changed in the page's alerts between two updates of the feed, one entry per alert. Ask Intercept Live's alert
// updates and the alert toasts both read it, so the chat and the toasts report the same changes.

type AlertChange =
	/** A new open alert. */
	| { kind: "new"; alert: TriageAlert }
	/** Its severity went up or down. */
	| { kind: "raised" | "lowered"; alert: TriageAlert; from: TriageAlertSeverity }
	/** Someone else acknowledged or escalated it, or it became active again. */
	| { kind: "status"; alert: TriageAlert; status: "active" | "acknowledged" | "escalated" }
	/** It left the open alerts: resolved or declined. */
	| { kind: "resolved"; alert: TriageAlert };

/**
 * The changes from `before` to `after`, both the feed's alerts. Give it the feed's alerts, not the ones with the
 * clinician's queue actions applied, so their own actions aren't reported back to them.
 */
function alertChanges(before: TriageAlert[], after: TriageAlert[]): AlertChange[] {
	const open = (alerts: TriageAlert[]) => new Map(alerts.filter(isOpenAlert).map((alert) => [alert.id, alert]));
	const was = open(before);
	const now = open(after);
	const changes: AlertChange[] = [];
	for (const [id, alert] of now) {
		const previous = was.get(id);
		if (!previous) changes.push({ kind: "new", alert });
		else if (previous.severity !== alert.severity)
			changes.push({
				kind: severityOrder.indexOf(alert.severity) < severityOrder.indexOf(previous.severity) ? "raised" : "lowered",
				alert,
				from: previous.severity,
			});
		// A status the feed changed (someone else acknowledged or escalated it; Oct 31, 2026, user's call).
		else if ((previous.status ?? "active") !== (alert.status ?? "active"))
			changes.push({ kind: "status", alert, status: (alert.status ?? "active") as "active" | "acknowledged" | "escalated" });
	}
	for (const [id, alert] of was)
		if (!now.has(id)) changes.push({ kind: "resolved", alert: after.find((next) => next.id === id) ?? alert });
	return changes;
}

export { alertChanges, type AlertChange };
