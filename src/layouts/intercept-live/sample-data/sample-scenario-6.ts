import { sampleScenario6ReturnAlertDetail } from "../alert-panel/sample-data/sample-alert-panel";
import type { InboxItem } from "../inbox/inbox-panel";
import type { MonitoringPatient } from "../monitoring/monitoring";
import type { CensusPatient } from "../patients/patients-panel";
import type { CareTransition, FollowUpTask } from "../patient-details/sections/transition-section";
import type { ScenarioBeat, ScenarioDefinition } from "./sample-scenario-1";

// Story-only: Scenario 6 of the Demo Use Cases, "After the ICU, a readmission caught early and the outcomes report", as
// beats the Prototype menu plays. Margaret Hayes (`p15`) from Scenario 1, kept at Chadron, on day 4 of her stay.
//
// 1. Primary-care handoff: she's ready to go home. The platform has drafted her one-page handoff to Chadron Rural Health
//    Clinic (what happened, the medication changes, daily weights, a 7-day visit), in a format the clinic reads without a
//    shared EHR. A notice opens it in her page's Discharge section; the clinician sends it.
// 2. Readmission risk: High (HFrEF, lives alone, ICU-level care this stay), so sending it schedules a 72-hour nurse phone
//    check on the hub tele-RN's list (an Inbox follow-up, Ava Brooks) and books the clinic visit. She goes home: off
//    Monitoring, Discharged on Patients.
//    Day 7: the phone check is done (the Inbox row moves to Done). Day 9: the clinic visit, within 7 days.
// 3. The catch: day 11, she comes to Chadron's ED, weight up 1.5 kg and new orthopnea. The platform matches her to the
//    stay and alerts the hub (High, `live-hayes-return`), with the ED's diuretic adjustment as the pathway. Accepting it
//    plays the rest: 4 h later she's lost 1.6 L and lies flat, and goes home without admission (alert resolved,
//    readmission avoided, a phone check tomorrow on the tele-RN's list).
// 4. Outcomes dashboard: the last notice opens Analytics, the pilot's synthetic month with these scenarios in it, where
//    the presenter shows the payer and rurality breakdown (5) and the quarterly export (6).
//
// The days go by in seconds, as the nights of Scenarios 1 to 5. Dates in her handoff and follow-up are the scenario's
// (`day()`: today is day 4, her discharge); the lists' times (Inbox, activity) are when each beat plays.

/* -------------------------------------------------------------------------- */
/* The scenario's clock                                                       */
/* -------------------------------------------------------------------------- */

// Day 4 of her stay, 10:30, is today: set by the first beat.
let today = new Date().setHours(10, 30, 0, 0);

/** The scenario's time on day `n` of her stay (day 0 is Scenario 1's night), ISO 8601. */
const day = (n: number, hours: number, minutes = 0) => {
	const at = new Date(today);
	at.setDate(at.getDate() + n - 4);
	at.setHours(hours, minutes, 0, 0);
	return at.toISOString();
};

const now = () => new Date().toISOString();
const inHours = (hours: number) => new Date(Date.now() + hours * 3_600_000).toISOString();

const TELE_RN = "Ava Brooks, RN";
const CLINIC = "Chadron Rural Health Clinic";

/* -------------------------------------------------------------------------- */
/* Her card and monitor                                                       */
/* -------------------------------------------------------------------------- */

const news2 = "NEWS2";
const change = "Change in last 24 h";

/** Her card and monitor at each stage: ready to go home, back in the ED, home again. */
const hayesAt = (stage: "discharge-ready" | "returned" | "home-again") => {
	if (stage === "returned") {
		// Day 11, Chadron ED: RR 22 (2), SpO₂ 93% on room air (2), HR 98 (1), BP 152/88: NEWS2 5, Medium.
		const census: Partial<CensusPatient> = {
			status: "admitted",
			statusAt: now(),
			unit: "ED",
			// The ED has no level of care: her Med-surg level from the stay before doesn't carry over.
			levelOfCare: undefined,
			bed: "Bay 1",
			arrivedAt: now(),
			acuity: { label: news2, score: 5, level: "medium" },
			trajectory: { label: change, value: "+4", trend: "up", trendVariant: "critical" },
			scoreChange4h: 4,
			vitals: [
				{ label: "Heart Rate", shortLabel: "HR", value: 98 },
				{ label: "MAP", value: 109 },
				{ label: "SpO₂", value: "93%" },
				{ label: "Resp. Rate", shortLabel: "RR", value: 22 },
			],
		};
		const monitoring: Partial<MonitoringPatient> = {
			unit: "ED",
			bed: "Bay 1",
			acuity: { label: news2, score: 5, level: "medium" },
			trajectory: { label: change, value: "+4", trend: "up" },
			scoreChange4h: 4,
			vitals: { hr: 98, spo2: 93, systolic: 152, diastolic: 88, map: 109, rr: 22 },
		};
		return { census, monitoring };
	}
	// Ready to go home (day 4) and home again from the ED (day 11): RR 16, SpO₂ 95% on room air, NEWS2 1, Low.
	const census: Partial<CensusPatient> = {
		acuity: { label: news2, score: 1, level: "low" },
		trajectory: { label: change, value: stage === "home-again" ? "-4" : "-1", trend: "down", trendVariant: "success" },
		scoreChange4h: stage === "home-again" ? -4 : 0,
		vitals: [
			{ label: "Heart Rate", shortLabel: "HR", value: 78 },
			{ label: "MAP", value: 88 },
			{ label: "SpO₂", value: "95%" },
			{ label: "Resp. Rate", shortLabel: "RR", value: 16 },
		],
	};
	const monitoring: Partial<MonitoringPatient> = {
		acuity: { label: news2, score: 1, level: "low" },
		trajectory: { label: change, value: stage === "home-again" ? "-4" : "-1", trend: "down" },
		scoreChange4h: stage === "home-again" ? -4 : 0,
		vitals: { hr: 78, spo2: 95, systolic: 124, diastolic: 70, map: 88, rr: 16 },
	};
	return { census, monitoring };
};

/* -------------------------------------------------------------------------- */
/* Her transition of care                                                     */
/* -------------------------------------------------------------------------- */

type Stage = "draft" | "sent" | "called" | "visited" | "returned" | "avoided";
const stages: Stage[] = ["draft", "sent", "called", "visited", "returned", "avoided"];
const reached = (stage: Stage, from: Stage) => stages.indexOf(stage) >= stages.indexOf(from);

/**
 * Her transition at each stage. The handoff's `sent` comes from the clinician's Send (the feed keeps it); the beats set
 * what the clinic and the follow-up did after.
 */
function hayesTransition(stage: Stage): CareTransition {
	const call: FollowUpTask = {
		id: "call-72h",
		kind: "call",
		title: "72-hour nurse phone check",
		who: `${TELE_RN} · hub tele-RN`,
		dueAt: day(7, 10, 30),
		status: reached(stage, "called") ? "done" : "scheduled",
		tracked: "On the hub tele-RN's list",
		opens: { label: "Open Inbox", page: "Inbox" },
		done: reached(stage, "called")
			? {
					at: day(7, 10, 40),
					result: "Weight 71.6 kg (−0.3 from discharge). No breathlessness lying flat. Taking furosemide 60 mg; knows when to call.",
				}
			: undefined,
	};
	const visit: FollowUpTask = {
		id: "visit-7d",
		kind: "visit",
		title: "Clinic visit within 7 days",
		who: `${CLINIC} · Dr. Tom Weller`,
		dueAt: day(9, 9, 30),
		status: reached(stage, "visited") ? "done" : "scheduled",
		tracked: "Booked with the clinic",
		done: reached(stage, "visited")
			? { at: day(9, 9, 50), result: "Seen 5 days after discharge. Weight 72.0 kg, creatinine 1.5: spironolactone stays held." }
			: undefined,
	};
	const followUps: FollowUpTask[] = [call, visit];
	if (reached(stage, "avoided")) {
		followUps.push({
			id: "call-after-ed",
			kind: "call",
			title: "Phone check the day after the ED visit",
			who: `${TELE_RN} · hub tele-RN`,
			dueAt: day(12, 10, 0),
			status: "scheduled",
			tracked: "On the hub tele-RN's list",
			opens: { label: "Open Inbox", page: "Inbox" },
		});
	}
	return {
		source: "Discharge workflow, from her Chadron stay",
		handoff: {
			to: { clinic: CLINIC, clinician: "Dr. Tom Weller, family physician" },
			delivery: "A PDF by Direct secure message, with a fax copy: the clinic doesn't need Chadron Memorial's EHR",
			deliveryPreview: true,
			stay: { hospital: "Chadron Memorial", unit: "Med-Surg", from: day(-1, 5, 40), to: day(4, 11, 15) },
			summary: [
				"Admitted with a heart failure exacerbation (HFrEF, EF 25%). On night 1 her breathing worsened: NEWS2 rose from 5 to 10.",
				"The tele-ICU intensivist managed her at Chadron with BiPAP and IV diuretics instead of a transfer. Off BiPAP by 06:00; net −4.2 L over the stay.",
				"Creatinine peaked at 1.9 mg/dL (baseline 1.5, CKD 3) and was 1.5 at discharge.",
			],
			medications: [
				{ name: "Furosemide", change: "changed", dose: "60 mg by mouth daily", detail: "Was 40 mg daily" },
				{
					name: "Spironolactone",
					change: "stopped",
					dose: "Was 12.5 mg daily",
					detail: "Held: creatinine rose to 1.9. Restart at the visit if it's back to baseline",
				},
				{ name: "Carvedilol", change: "same", dose: "6.25 mg twice daily" },
				{ name: "Sacubitril-valsartan", change: "same", dose: "24/26 mg twice daily" },
			],
			weights: {
				discharge: "71.9 kg (158.5 lb)",
				instructions: [
					"Weigh every morning, after the bathroom and before breakfast.",
					"Call the clinic if up 1 kg (2 lb) in a day or 2 kg (5 lb) in a week, or if it's hard to breathe lying flat.",
				],
			},
			followUp: [
				`Clinic visit with Dr. Tom Weller by ${new Date(day(9, 9, 30)).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })} (within 7 days): weight, creatinine, potassium; spironolactone.`,
				"A hub nurse calls her at 72 hours.",
				"Lives alone: her daughter, Karen Hayes, checks in daily.",
			],
			contacts: [
				{ label: "Hub tele-RN", value: `${TELE_RN} · (308) 555-0148` },
				{ label: "Chadron Memorial", value: "(308) 555-0100, ask for the floor" },
			],
			author: "Drafted by Intercept from her Chadron record · reviewed and sent by her tele-ICU intensivist",
			// Opened at the clinic that afternoon.
			receivedAt: reached(stage, "sent") ? day(4, 14, 20) : undefined,
		},
		risk: {
			level: "high",
			factors: [
				{ label: "HFrEF", detail: "EF 25%, two heart failure admissions this year" },
				{ label: "Lives alone", detail: "Social history: her daughter checks in daily" },
				{ label: "ICU-level care this stay", detail: "BiPAP and IV diuretics on night 1, managed at Chadron" },
			],
			source: "Readmission risk score, from her record at discharge",
			action: "High risk schedules a 72-hour nurse phone check on the hub tele-RN's list and a clinic visit within 7 days.",
		},
		followUps: reached(stage, "sent")
			? followUps
			: followUps.map((task) => ({ ...task, tracked: "Scheduled once the handoff is sent", opens: undefined })),
		return: reached(stage, "returned")
			? {
					at: day(11, 6, 50),
					where: "Chadron Memorial ED",
					after: "7 days after discharge",
					matchedOn: ["name", "date of birth", "address", "Medicare ID"],
					findings: [
						"Weight 73.4 kg: up 1.5 kg from discharge, 1.4 kg since her clinic visit",
						"New orthopnea: two pillows to sleep since last night",
						"Crackles at both bases, SpO₂ 93% on room air",
					],
					outcome: reached(stage, "avoided")
						? {
								type: "avoided",
								detail:
									"Furosemide 80 mg IV in the ED: 1.6 L out in 4 h, lies flat, SpO₂ 96% on room air. Home on 80 mg daily, with a phone check tomorrow and a clinic visit in 2 days.",
							}
						: undefined,
				}
			: undefined,
	};
}

/* -------------------------------------------------------------------------- */
/* The tele-RN's list                                                         */
/* -------------------------------------------------------------------------- */

const followUpItem = (item: Partial<InboxItem> & Pick<InboxItem, "id" | "title">): InboxItem => ({
	kind: "follow-up",
	patientId: "p15",
	source: "Readmission risk",
	priority: "routine",
	receivedAt: now(),
	assignee: `${TELE_RN} (hub tele-RN)`,
	section: "discharge",
	...item,
});

/* -------------------------------------------------------------------------- */
/* Beats                                                                      */
/* -------------------------------------------------------------------------- */

const returnAlertId = "live-hayes-return";

const scenario6Beats: ScenarioBeat[] = [
	{
		after: "start",
		// 1. Day 4, 10:30: she's ready to go home; her handoff is drafted, her risk scored. The clinician reviews and sends it.
		label: "Day 4: Hayes is ready to go home; her primary-care handoff is drafted",
		changes: () => {
			today = new Date().setHours(10, 30, 0, 0);
			const { census, monitoring } = hayesAt("discharge-ready");
			return {
				census: { p15: { ...census, status: "admitted", unit: "Med-Surg", levelOfCare: "med-surg", bed: "Bed 4" } },
				monitoring: { p15: { ...monitoring, unit: "Med-Surg", bed: "Bed 4" } },
				leave: { p15: false },
				records: { p15: { transition: hayesTransition("draft") } },
				log: [
					{
						patientId: "p15",
						kind: "decision",
						title: "Ready for discharge",
						detail: "Off oxygen, weight 71.9 kg. Readmission risk: High",
						by: "Dr. Tom Weller",
					},
				],
				notices: [
					{
						id: "hayes-handoff",
						patientId: "p15",
						title: "Primary-care handoff ready",
						description: `Hayes goes home today. Her one-page handoff to ${CLINIC} is drafted: what happened, medication changes, daily weights and a 7-day visit. Review it and send it.`,
						actionLabel: "Review handoff",
						opens: "patient",
						section: "discharge",
					},
				],
			};
		},
	},
	{
		after: "handoff",
		// 2. The handoff sent: the clinic opens it that afternoon; the 72-hour check lands on the tele-RN's list and the visit
		// is booked. She goes home.
		label: "Day 4: handoff sent; Hayes goes home with a 72-hour phone check on the tele-RN's list",
		changes: () => ({
			census: { p15: { status: "discharged", statusAt: now() } },
			leave: { p15: true },
			records: { p15: { transition: hayesTransition("sent") } },
			inbox: [
				followUpItem({
					id: "follow-up-hayes-72h",
					title: "72-hour nurse phone check",
					detail: "Readmission risk High: HFrEF, lives alone, ICU-level care this stay",
					dueAt: inHours(72),
					unread: true,
				}),
			],
			log: [
				{ patientId: "p15", kind: "order", title: "72-hour phone check scheduled", detail: `For ${TELE_RN}, hub tele-RN`, by: "Readmission risk" },
				{ patientId: "p15", kind: "outcome", title: "Discharged home", detail: `Clinic visit booked with Dr. Tom Weller, ${CLINIC}` },
			],
			notices: [
				{
					id: "hayes-follow-up",
					patientId: "p15",
					title: "Follow-up on the tele-RN's list",
					description: `Her readmission risk is High, so a 72-hour phone check is on ${TELE_RN}'s list and a clinic visit is booked within 7 days.`,
					actionLabel: "Open Inbox",
					opens: "page",
					page: "Inbox",
				},
			],
		}),
	},
	{
		after: "handoff",
		delay: 16,
		// Day 7: the tele-RN's call. Its row moves to Done, by her.
		label: "Day 7: the hub tele-RN's 72-hour phone check is done",
		changes: () => ({
			records: { p15: { transition: hayesTransition("called") } },
			inbox: [
				followUpItem({
					id: "follow-up-hayes-72h",
					title: "72-hour nurse phone check",
					detail: "Weight 71.6 kg, no orthopnea, taking furosemide 60 mg",
					receivedAt: now(),
					done: { at: now(), by: TELE_RN },
				}),
			],
			log: [{ patientId: "p15", kind: "outcome", title: "72-hour phone check done", detail: "Weight 71.6 kg, no orthopnea", by: TELE_RN }],
		}),
	},
	{
		after: "handoff",
		delay: 22,
		// Day 9: the clinic visit, 5 days after discharge: follow-up within 7 days.
		label: "Day 9: clinic visit 5 days after discharge, follow-up within 7 days",
		changes: () => ({
			records: { p15: { transition: hayesTransition("visited") } },
			log: [
				{
					patientId: "p15",
					kind: "outcome",
					title: "Follow-up within 7 days",
					detail: "Seen at the clinic 5 days after discharge. Weight 72.0 kg",
					by: CLINIC,
				},
			],
		}),
	},
	{
		after: "handoff",
		delay: 30,
		// 3. Day 11, 06:50: back at Chadron's ED. Matched to her stay; the hub's alert, High, with the ED's diuretic pathway.
		label: "Day 11: Hayes is back at Chadron's ED, matched to her stay: a High alert",
		changes: () => {
			const { census, monitoring } = hayesAt("returned");
			const { firedAt: _firedAt, ...alert } = sampleScenario6ReturnAlertDetail().alert;
			return {
				census: { p15: census },
				monitoring: { p15: monitoring },
				leave: { p15: false },
				records: { p15: { transition: hayesTransition("returned") } },
				fire: [
					{
						...alert,
						evidence: [
							"Matched to her Chadron stay, discharged 7 days ago (name, date of birth, address, Medicare ID)",
							"Weight 73.4 kg, up 1.5 kg from discharge",
							"New orthopnea, crackles at both bases, SpO₂ 93% on room air",
							"Readmission risk High at discharge: HFrEF, lives alone, ICU-level care",
						],
					},
				],
				log: [{ patientId: "p15", kind: "alert", title: "Return matched to her Chadron stay", detail: "Chadron Memorial ED, 7 days after discharge", by: "Patient matching" }],
			};
		},
	},
	{
		after: "pathway",
		alertId: returnAlertId,
		// 3. 4 h after the IV dose: 1.6 L out, lies flat, SpO₂ 96% on room air. Home without admission.
		label: "Day 11: 1.6 L out in 4 h; Hayes goes home from the ED, readmission avoided",
		changes: () => {
			const { census, monitoring } = hayesAt("home-again");
			return {
				census: { p15: { ...census, status: "discharged", statusAt: now() } },
				monitoring: { p15: monitoring },
				leave: { p15: true },
				records: { p15: { transition: hayesTransition("avoided") } },
				resolve: {
					[returnAlertId]: {
						by: "Lisa Grant, RN",
						reason: "Treated",
						note: "1.6 L out in 4 h, lies flat, SpO₂ 96% on room air. Home on furosemide 80 mg daily.",
					},
				},
				inbox: [
					followUpItem({
						id: "follow-up-hayes-after-ed",
						title: "Phone check the day after the ED visit",
						detail: "Home on furosemide 80 mg daily: weight and breathing",
						dueAt: inHours(24),
						unread: true,
					}),
				],
				log: [
					{
						patientId: "p15",
						kind: "outcome",
						title: "Readmission avoided",
						detail: "Treated in the ED and sent home on day 11 · Follow-up within 7 days · Payer: dual-eligible",
					},
				],
				notices: [
					{
						id: "hayes-avoided",
						patientId: "p15",
						title: "Readmission avoided",
						description:
							"Hayes went home from the ED on a higher diuretic dose. The outcome is written with the month's others, by payer and rurality.",
						actionLabel: "Open outcomes",
						opens: "page",
						page: "Analytics",
					},
				],
			};
		},
	},
];

const sampleScenario6: ScenarioDefinition = {
	patientIds: ["p15"],
	alertIds: [returnAlertId],
	beats: scenario6Beats,
};

export { hayesTransition, sampleScenario6 };
