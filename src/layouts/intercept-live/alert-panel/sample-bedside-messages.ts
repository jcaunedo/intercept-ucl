import type { MonitorVitals } from "@/components/cards/patient-monitoring-card";

import type { ConsultMessage } from "./consult-messages";

// Story-only: what the bedside nurse wrote in a patient's thread before the page opened, one message per unread
// message the patient's record counts (`PatientRecord.unreadMessages`), so the header's Messages count and the thread
// agree. Short, as a nurse writes from the bedside, and nothing a nurse wouldn't do on their own.

type BedsideThreadContext = {
	patientId: string;
	firstName?: string;
	sex?: string;
	/** The patient's numbers when the messages were written. */
	vitals?: MonitorVitals;
	/** How many messages, oldest first, up to four. */
	count: number;
	/** The time to count back from, ms. Now by default. */
	now?: number;
};

const MINUTE_MS = 60 * 1000;

/** The thread's unread messages, oldest first, 12 minutes apart, the last one 4 minutes ago. */
function sampleBedsideThread({ patientId, firstName, sex, vitals, count, now = Date.now() }: BedsideThreadContext): ConsultMessage[] {
	const he = sex === "F" ? "she" : sex === "M" ? "he" : "they";
	const him = sex === "F" ? "her" : sex === "M" ? "him" : "them";
	const name = firstName ?? him;
	const n = (value: number | undefined) => (value === undefined ? undefined : Math.round(value));
	const [hr, systolic, diastolic, spo2] = [n(vitals?.hr), n(vitals?.systolic), n(vitals?.diastolic), n(vitals?.spo2)];
	const lines = [
		`Family is at the bedside and asking for an update on ${name} when you have a minute.`,
		hr !== undefined && systolic !== undefined && spo2 !== undefined
			? `Latest set: HR ${hr}, BP ${systolic}/${diastolic ?? "--"}, SpO₂ ${spo2}%. Want anything changed?`
			: `Repositioned ${him} and checked ${he === "they" ? "their" : sex === "F" ? "her" : "his"} skin. No new pressure areas.`,
		`${he[0].toUpperCase()}${he.slice(1)} ${he === "they" ? "were" : "was"} restless for the last hour. Gave the PRN as ordered and ${he} settled.`,
		"Morning labs are back. Can you take a look when you get a chance?",
	];
	const shown = lines.slice(0, Math.max(0, Math.min(count, lines.length)));
	return shown.map((text, index) => ({
		id: `${patientId}-bedside-${index}`,
		from: "bedside",
		text,
		sentAt: new Date(now - (4 + (shown.length - 1 - index) * 12) * MINUTE_MS).toISOString(),
	}));
}

export { sampleBedsideThread, type BedsideThreadContext };
