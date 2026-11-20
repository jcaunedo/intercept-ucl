import type { InboxItem } from "../inbox-panel";

// Synthetic work for the signed-in clinician (Joanna Smith) besides alerts, which the Inbox takes from the layout's own
// alerts: AI Scribe drafts to sign, suggested orders, an EMR write-back that failed and items handed over from the last
// shift (Spec §6.21). Times count back from when the stories load.

const MINUTE = 60_000;
const ago = (minutes: number) => new Date(Date.now() - minutes * MINUTE).toISOString();
const inMinutes = (minutes: number) => new Date(Date.now() + minutes * MINUTE).toISOString();

const sampleInboxItems: InboxItem[] = [
	{
		id: "order-vasopressin",
		kind: "order",
		patientId: "p1",
		title: "Vasopressin 0.03 units/min",
		detail: "MAP under 65 on norepinephrine 0.2 for 15 min",
		source: "Sepsis bundle",
		priority: "high",
		receivedAt: ago(4),
		dueAt: inMinutes(11),
		unread: true,
	},
	{
		id: "writeback-davis",
		kind: "write-back",
		patientId: "p3",
		title: "Progress note didn't reach the EHR",
		detail: "Signed at 9:40 AM; Sidney Regional's EHR timed out and nothing was written",
		source: "EHR write-back",
		priority: "high",
		receivedAt: ago(38),
		unread: true,
	},
	{
		id: "sign-miller",
		kind: "signature",
		patientId: "p1",
		title: "Video consult note",
		detail: "Draft from your 10:12 AM consult with Kelly Ortiz, RN",
		source: "AI Scribe",
		priority: "routine",
		receivedAt: ago(52),
		dueAt: inMinutes(4 * 60),
	},
	{
		id: "order-furosemide",
		kind: "order",
		patientId: "p15",
		title: "Furosemide 40 mg IV once",
		detail: "Two pillows to lie flat, crackles at both bases",
		source: "Heart failure pathway",
		priority: "routine",
		receivedAt: ago(18),
		unread: true,
	},
	{
		id: "handoff-peterson",
		kind: "handoff",
		patientId: "p25",
		title: "Follow up the 4 PM blood gas",
		detail: "BiPAP changed at 6 AM, repeat ABG due at 4 PM",
		source: "James Turner, night shift",
		priority: "routine",
		receivedAt: ago(4 * 60),
		dueAt: inMinutes(5 * 60),
	},
	{
		id: "sign-lambert",
		kind: "signature",
		patientId: "p26",
		title: "Daily progress note",
		detail: "Draft from this morning's rounds",
		source: "AI Scribe",
		priority: "routine",
		receivedAt: ago(3 * 60),
	},
	{
		id: "sign-harris",
		kind: "signature",
		patientId: "p9",
		title: "Admission note",
		detail: "Draft from yesterday's admission",
		source: "AI Scribe",
		priority: "routine",
		receivedAt: ago(9 * 60),
		done: { at: ago(7 * 60) },
	},
];

export { sampleInboxItems };
