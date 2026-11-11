import type { LiveFeedEntry, LiveFeedKind, LiveFeedPatient } from "@/components/data-display/live-feed";

import { isOpenAlert, type TriageAlert, type TriageAlertSeverity } from "../monitoring/triage-queue";
import { withActivityEvents, type PatientActivity } from "../patient-details/activity";
import type { PatientTimeline } from "../patient-details/sections/timeline-section";

// The Live feed's lines for one patient (Nov 11, 2026, user's calls: "like a log, not just alerts", "keep historical
// data"; the same lines on the patient's page and in everyone's feed, "applied globally"): the record's timeline events
// and activity (care, drips, ventilator, labs, notes) and the patient's alerts, live, each as it fired and each change of
// status as its own line.

const severityWords: Record<TriageAlertSeverity, string> = { critical: "Critical", high: "High", medium: "Medium", low: "Low" };

const statusWords: Record<string, string> = {
	acknowledged: "Acknowledged",
	escalated: "Escalated",
	resolved: "Resolved",
	declined: "Declined",
};

type PatientFeedSource = {
	timeline?: PatientTimeline;
	activity?: PatientActivity[];
	/** The patient's alerts: the live ones, the ones the feed resolved and the record's history. One alert counts once. */
	alerts: TriageAlert[];
	/** Who the lines are about, in everyone's feed. Leave it out on the patient's own page. */
	patient?: LiveFeedPatient;
	/** Opens an open alert (its lines). A resolved alert's lines don't open it (Nov 11, 2026, user's call). */
	onOpenAlert?: (alertId: string) => void;
	/** What the other lines open, e.g. the patient's page from everyone's feed. */
	onOpenPatient?: () => void;
};

function patientFeedEntries({ timeline, activity, alerts, patient, onOpenAlert, onOpenPatient }: PatientFeedSource): LiveFeedEntry[] {
	const unique = [...new Map(alerts.map((alert) => [alert.id, alert])).values()];
	const titles = unique.map((alert) => alert.title.toLowerCase());
	const events = timeline ? withActivityEvents(timeline, activity).events : [];
	const prefix = patient ? `${patient.name}-` : "";
	return [
		// The timeline's own alert marks, unless the alert is in the live list (which has its status and times).
		...events
			.filter((event) => event.kind !== "alert" || !titles.some((title) => event.label.toLowerCase().includes(title)))
			.map(
				(event): LiveFeedEntry => ({
					id: `${prefix}event-${event.id}`,
					at: event.at,
					kind: event.kind as LiveFeedKind,
					title: event.label,
					patient,
					onSelect: onOpenPatient,
				}),
			),
		...unique.flatMap((alert): LiveFeedEntry[] => {
			const open = isOpenAlert(alert);
			const onSelect = open && onOpenAlert ? () => onOpenAlert(alert.id) : undefined;
			const fired: LiveFeedEntry = {
				id: `${prefix}alert-${alert.id}`,
				at: alert.firedAt,
				kind: "alert",
				title: `${severityWords[alert.severity]} alert: ${alert.title}`,
				detail: alert.reason,
				severity: alert.severity,
				patient,
				onSelect,
			};
			const status = alert.status && alert.status !== "active" ? alert.status : undefined;
			if (!status || !alert.addressed) return [fired];
			const who = [alert.addressed.by, alert.addressed.to ? `to ${alert.addressed.to}` : undefined].filter(Boolean).join(" ");
			return [
				fired,
				{
					id: `${prefix}alert-${alert.id}-${status}`,
					at: alert.addressed.at,
					kind: "alert-status",
					title: `${statusWords[status] ?? status}: ${alert.title}`,
					detail: [who, alert.addressed.reason ?? alert.addressed.note].filter(Boolean).join(" · ") || undefined,
					resolved: status === "resolved",
					patient,
					onSelect,
				},
			];
		}),
	];
}

export { patientFeedEntries, type PatientFeedSource };
