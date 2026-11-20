import type { AlertDetailData } from "../alert-panel/alert-panel";
import type { OverflowStep } from "../alert-panel/overflow";
import {
	sampleScenario5LindaAlertDetail,
	sampleScenario5LindaTransfer,
	sampleScenario5WalterAlertDetail,
} from "../alert-panel/sample-data/sample-alert-panel";
import {
	sampleScenario5LindaCensus,
	sampleScenario5LindaCensusAt,
	sampleScenario5WalterCensusAt,
} from "./sample-census";
import {
	sampleScenario5LindaMonitoring,
	sampleScenario5LindaMonitoringAt,
	sampleScenario5WalterMonitoringAt,
} from "../monitoring/sample-data/sample-monitoring";
import type { ScenarioBeat, ScenarioDefinition } from "./sample-scenario-1";
import { pierceRecord, sampleScenario5DocumentationMinutes, sampleScenario5Staff, shawRecord } from "./sample-scenario-5-patients";
import { sampleUser } from "./sample-workspace";

// Story-only: Scenario 5 of the Demo Use Cases, "Surge night across five hospitals and four EHRs", as beats the
// Prototype menu plays. Regional West's hub at 03:10, a Regional West intensivist on the console (the user), Intercept as
// backup. The census is five sites on four record systems (each card's badge says which: step 1, always on).
//
// 2. Two events at once: Walter Pierce (`p30`, Regional West ICU, a base patient) desaturates to 86% on the ventilator,
//    and a minute later Sidney's ED calls a stroke code for Linda Shaw (`p31`, who arrives with it). Both Critical
//    alerts go to the top; a notice says how they rank and why.
// 3. Overflow: the clinician takes Walter (his video consult). Linda's alert offers her to Intercept's backup
//    intensivist with one click (`overflow` in her alert); sending it plays the backup's steps: accepted, connected in
//    under 5 min, tenecteplase at Sidney under remote direction.
// 4. The right transfer: the CTA shows a right M1 occlusion, so her alert gets the transfer (receiving centers, the
//    packet built from the record, door-in-door-out). Requesting it plays the rest: packet sent and accepted, the
//    helicopter, door-out at 1 h 46 min, alert resolved, outcomes written.
// 5. Walter stabilized: accepting his ventilator and bronchodilator pathway plays his recovery; his score drops back
//    down the list and his alert resolves.
// 6. Documentation returned: once each encounter is done, the AI drafts its note for the intensivist to edit and sign
//    (on the patient's page); after both, a notice says the 07:00 handoff report is ready, with the documentation
//    minutes saved this shift.
//
// The night goes by in seconds, as in Scenarios 1 to 4. The labels and the transfer's times are the scenario's
// (`clock()`, from 03:10).

/* -------------------------------------------------------------------------- */
/* The scenario's clock                                                       */
/* -------------------------------------------------------------------------- */

// 03:10, the last one before the scenario is picked, so the night reads as it happened. Set by the first beat.
let start = lastTenPastThree();

function lastTenPastThree() {
	const at = new Date();
	at.setHours(3, 10, 0, 0);
	if (at.getTime() > Date.now()) at.setDate(at.getDate() - 1);
	return at.getTime();
}

/** The scenario's time, `minutes` after 03:10 (ISO 8601). */
const clock = (minutes: number) => new Date(start + minutes * 60_000).toISOString();

// The encounters whose AI note is drafted in this run, for the handoff's documentation count. Reset by the first beat.
let drafted = new Set<"walter" | "linda">();

const { lauren, kevin, ashley, jenna, mark } = sampleScenario5Staff;
const INTENSIVIST = `${sampleUser.name}, MD`;

/* -------------------------------------------------------------------------- */
/* Linda's alert as the backup works it                                       */
/* -------------------------------------------------------------------------- */

/** Adds the backup's next step to Linda's overflow. */
const withStep =
	(step: OverflowStep) =>
	(detail: AlertDetailData): AlertDetailData =>
		detail.overflow
			? { ...detail, overflow: { ...detail.overflow, steps: [...(detail.overflow.steps ?? []).filter((item) => item.id !== step.id), step] } }
			: detail;

/** Changes Linda's transfer. */
const withTransfer =
	(change: (transfer: NonNullable<AlertDetailData["transfer"]>) => NonNullable<AlertDetailData["transfer"]>) =>
	(detail: AlertDetailData): AlertDetailData =>
		detail.transfer ? { ...detail, transfer: change(detail.transfer) } : detail;

/** The receiving center the clinician picked, by name; the first accepting one until then. */
const receivingName = (transfer: NonNullable<AlertDetailData["transfer"]>) => {
	const decided = transfer.decided;
	const id = decided?.type === "transfer" ? decided.receivingId : transfer.receiving.find((item) => item.accepting)?.id;
	return transfer.receiving.find((item) => item.id === id)?.name ?? "the receiving center";
};

/** Several detail changes, in order. */
const all =
	(...changes: ((detail: AlertDetailData) => AlertDetailData)[]) =>
	(detail: AlertDetailData) =>
		changes.reduce((current, change) => change(current), detail);

/* -------------------------------------------------------------------------- */
/* Beats                                                                      */
/* -------------------------------------------------------------------------- */

const scenario5Beats: ScenarioBeat[] = [
	{
		after: "start",
		// 2. 03:10: Walter's SpO₂ falls to 86% on FiO₂ 0.40; peak pressure 48, auto-PEEP 9, RR 30 over a set 18. NEWS2 up 5
		// in 4 h, into High. His Critical alert lands at the top.
		label: "Regional West, 03:10: Pierce desaturates to 86% on the ventilator",
		changes: () => {
			start = lastTenPastThree();
			drafted = new Set();
			const detail = sampleScenario5WalterAlertDetail();
			return {
				census: { p30: sampleScenario5WalterCensusAt("desat") },
				monitoring: { p30: sampleScenario5WalterMonitoringAt("desat") },
				records: { p30: pierceRecord("desat") },
				fire: [
					{
						...detail.alert,
						evidence: [
							"SpO₂ 86% on FiO₂ 0.40, PEEP 5 (92% 20 min ago)",
							"Peak pressure 48 cmH₂O, plateau 26: auto-PEEP 9",
							"RR 30 over a set rate of 18, HR 118, BP 158/90",
							"COPD GOLD 3 and obesity (BMI 41), intubated 2 days ago",
						],
					},
				],
				log: [
					{ patientId: "p30", kind: "alert", title: "Ventilator alarm: low SpO₂, high pressure", detail: "SpO₂ 86%, peak 48 cmH₂O", by: "Ventilator" },
				],
			};
		},
	},
	{
		after: "start",
		delay: 6,
		// 2. 03:11: Sidney's ED calls a stroke code: left-sided weakness, NIHSS 9, last known well 02:30, AFib off apixaban
		// for 4 months (cost). CT shows no bleed. Her NEWS2 is low; the stroke code makes her Critical.
		label: "Sidney ED, 03:11: stroke code for Shaw, NIHSS 9. Two Critical alerts at once",
		changes: () => {
			const detail = sampleScenario5LindaAlertDetail();
			return {
				admit: [{ census: sampleScenario5LindaCensus(), monitoring: sampleScenario5LindaMonitoring(), record: shawRecord("alert") }],
				fire: [
					{
						...detail.alert,
						evidence: [
							"NIHSS 9 at 02:58: left face and arm weakness, dysarthria, gaze to the right",
							"Last known well 02:30; in the ED at 02:52",
							"CT head at 03:05: no bleed, ASPECTS 9. CTA being read",
							"AFib, HR 112; off apixaban 4 months for cost. BP 192/104",
						],
					},
				],
				log: [
					{ patientId: "p31", kind: "alert", title: "Stroke code called", detail: "NIHSS 9, last known well 02:30. CT: no bleed", by: jenna },
				],
			};
		},
	},
	{
		after: "start",
		delay: 9,
		// 2. How they rank, and why: both Critical. Walter's score is High (10) and rose 5 in 4 h, so he's #1. Linda's
		// NEWS2 is Low (3): the score doesn't see a stroke, so Active alerts ranks her after him and after any older
		// Critical alert on a High score (Sarah Miller's, while it lasts). The notice says so rather than a fixed rank.
		label: "Two Critical alerts in a minute: Pierce ranked #1, Shaw after him",
		changes: () => ({
			notices: [
				{
					id: "surge-ranking",
					patientId: "p30",
					alertId: "live-pierce",
					title: "2 Critical alerts in a minute",
					description:
						"#1 Pierce, Regional West: SpO₂ 86% on the ventilator, NEWS2 10 High, up 5 in 4 h. Shaw, Sidney: stroke code, NIHSS 9, inside the thrombolysis window. NEWS2 doesn't score a stroke (hers is 3, Low), so she ranks after him. Intercept's backup can take one.",
					actionLabel: "Open Pierce's alert",
				},
			],
		}),
	},
	{
		after: "consult",
		alertId: "live-pierce",
		delay: 5,
		// 3. The clinician took Walter: the platform offers Linda to the backup.
		label: "You're on Pierce's consult. Shaw's stroke code can go to Intercept's backup",
		changes: () => ({
			notices: [
				{
					id: "shaw-overflow",
					patientId: "p31",
					alertId: "live-shaw",
					title: "Send Shaw to Intercept's backup?",
					description:
						"You're on Pierce's consult. Intercept's backup intensivist, Mark Sullivan, MD, can take the stroke code now: the panel, CT images and NIHSS go with it.",
					actionLabel: "Open Shaw's alert",
				},
			],
		}),
	},

	// 3. Overflow, once Linda's alert is sent to the backup (escalated to Intercept's backup intensivist).
	{
		after: "overflow",
		alertId: "live-shaw",
		delay: 3,
		label: "Intercept's backup intensivist accepts Shaw's stroke code",
		changes: () => ({
			details: {
				"live-shaw": all(
					// Sent at 03:12, on the scenario's clock, as the coverage service records it.
					(detail) => (detail.overflow ? { ...detail, overflow: { ...detail.overflow, sentAt: clock(2) } } : detail),
					withStep({ id: "accepted", label: "Accepted by Mark Sullivan, MD", at: clock(3), detail: "Intercept backup intensivist, reviewing the panel and CT" }),
				),
			},
			log: [{ patientId: "p31", kind: "consult", title: "Stroke code accepted by Intercept's backup", detail: "Panel, CT images and NIHSS received", by: mark }],
		}),
	},
	{
		after: "overflow",
		alertId: "live-shaw",
		delay: 7,
		label: "Intercept on video with Sidney's ED: 3 min 50 s after the offer",
		changes: () => ({
			details: {
				"live-shaw": withStep({
					id: "connected",
					label: "On video with Sidney's ED",
					at: clock(6),
					detail: `3 min 50 s after the offer: under 5 min. With ${ashley} and ${jenna}`,
				}),
			},
			log: [
				{ patientId: "p31", kind: "consult", title: "Video consult with Sidney's ED", detail: "Intercept's backup intensivist, 3 min 50 s after the offer", by: mark },
				{ patientId: "p31", kind: "outcome", title: "Overflow response time", detail: "Offered 03:12, connected 03:16: 3 min 50 s (goal under 5 min)" },
			],
		}),
	},
	{
		after: "overflow",
		alertId: "live-shaw",
		delay: 14,
		// 4. Under the backup's direction: labetalol for BP 192/104, then tenecteplase at 03:31, door-to-needle 39 min.
		label: "Shaw, 03:31: tenecteplase at Sidney under Intercept's direction, door-to-needle 39 min",
		changes: () => ({
			census: { p31: sampleScenario5LindaCensusAt("lysed") },
			monitoring: { p31: sampleScenario5LindaMonitoringAt("lysed") },
			records: { p31: shawRecord("lysed") },
			details: {
				"live-shaw": all(
					withStep({ id: "bp", label: "Labetalol 10 mg IV", at: clock(14), detail: "BP 192/104 → 172/94, under 185/110" }),
					withStep({ id: "lysis", label: "Tenecteplase 18 mg IV", at: clock(21), detail: "0.25 mg/kg. Door-to-needle 39 min" }),
					// The backup accepted her stroke pathway and Sidney's APP co-signed it: it reads Active, unless the hub
					// already decided it (its own decision stands).
					(detail) =>
						detail.pathwayStatus && detail.pathwayStatus !== "suggested"
							? detail
							: {
									...detail,
									pathwayStatus: "active",
									pathwayRecord: { sentAt: clock(12), cosignedAt: clock(13), note: `Directed by ${mark} (Intercept)` },
								},
				),
			},
			log: [
				{ patientId: "p31", kind: "order", title: "Labetalol 10 mg IV", detail: "BP 192/104 → 172/94", by: mark },
				{ patientId: "p31", kind: "order", title: "Tenecteplase 18 mg IV given", detail: "0.25 mg/kg at 03:31. Door-to-needle 39 min", by: ashley },
			],
		}),
	},
	{
		after: "overflow",
		alertId: "live-shaw",
		delay: 20,
		// 4. CTA read at 03:40: right M1 occlusion. Sidney can't do a thrombectomy, so the transfer comes up, with the
		// centers, the packet built from her record and door-in-door-out from 02:52.
		label: "Shaw's CTA: right M1 occlusion. Transfer for thrombectomy, packet built",
		changes: () => ({
			details: {
				"live-shaw": all(
					withStep({ id: "cta", label: "CTA: right M1 occlusion", at: clock(30), detail: "Large-vessel occlusion: needs a thrombectomy" }),
					(detail) => ({ ...detail, transfer: { ...sampleScenario5LindaTransfer(clock), decided: detail.transfer?.decided } }),
				),
			},
			log: [{ patientId: "p31", kind: "alert", title: "CTA: right M1 occlusion", detail: "Thrombectomy needed. Transfer packet built from the record", by: "Radiology, Sidney" }],
			notices: [
				{
					id: "shaw-transfer",
					patientId: "p31",
					alertId: "live-shaw",
					title: "Transfer needed: right M1 occlusion",
					description: "Shaw needs a thrombectomy. Two centers are accepting, and her transfer packet is built from the record.",
					actionLabel: "Open transfer",
				},
			],
		}),
	},

	// 4. The transfer, once requested.
	{
		after: "transfer",
		alertId: "live-shaw",
		delay: 3,
		label: "Shaw's transfer packet sent and accepted",
		changes: () => ({
			details: {
				"live-shaw": withTransfer((transfer) => ({
					...transfer,
					packet: transfer.packet && { ...transfer.packet, sent: { at: clock(34), to: receivingName(transfer) } },
				})),
			},
			log: [{ patientId: "p31", kind: "order", title: "Transfer packet sent", detail: "Images, NIHSS, times, tenecteplase, labs, consent. Bed accepted", by: "Transfer center" }],
		}),
	},
	{
		after: "transfer",
		alertId: "live-shaw",
		delay: 8,
		label: "Shaw, 04:05: the helicopter lifts off from Scottsbluff",
		changes: () => ({
			log: [{ patientId: "p31", kind: "order", title: "Helicopter dispatched", detail: "25 min to Sidney. NIHSS 6 at 04:15", by: "Transfer center" }],
		}),
	},
	{
		after: "transfer",
		alertId: "live-shaw",
		delay: 14,
		// 4. Door-out at 04:38: door-in-door-out 1 h 46 min, under the 2 h goal. Her alert resolves and the outcomes are
		// written for the night's report (Scenario 6).
		label: "Shaw leaves Sidney at 04:38: door-in-door-out 1 h 46 min",
		changes: () => ({
			census: { p31: sampleScenario5LindaCensusAt("transferred") },
			monitoring: { p31: sampleScenario5LindaMonitoringAt("transferred") },
			records: { p31: shawRecord("transferred") },
			details: {
				"live-shaw": withTransfer((transfer) => ({
					...transfer,
					doorInDoorOut: transfer.doorInDoorOut && { ...transfer.doorInDoorOut, doorOut: clock(88) },
				})),
			},
			resolve: {
				"live-shaw": {
					by: mark,
					reason: "Transferred",
					note: "Tenecteplase at 03:31; right M1 occlusion, to a thrombectomy center by helicopter at 04:38.",
				},
			},
			log: [
				{
					patientId: "p31",
					kind: "outcome",
					title: "Stroke outcomes recorded",
					detail:
						"Time to intensivist 5 min (overflow to Intercept, 3 min 50 s) · Door-to-needle 39 min · Door-in-door-out 1 h 46 min (goal 2 h) · Payer: Medicaid",
				},
			],
		}),
	},
	{
		after: "transfer",
		alertId: "live-shaw",
		delay: 20,
		// 6. Linda's encounter is done: the AI drafts its note from the data and the call, for Mark Sullivan to sign.
		label: "AI drafted the note for Shaw's stroke code",
		changes: () => {
			drafted.add("linda");
			return {
				records: { p31: shawRecord("transferred", { drafted: true }) },
				log: [{ patientId: "p31", kind: "note", title: "Event note drafted by AI", detail: `From the data and the call, for ${mark} to edit and sign`, by: "AI Scribe" }],
			};
		},
	},

	// 5. Walter stabilized, once his pathway is accepted.
	{
		after: "pathway",
		alertId: "live-pierce",
		delay: 4,
		label: "Pierce: FiO₂ 0.60, rate 14, nebulizers in. Thick plug suctioned",
		changes: () => ({
			log: [
				{ patientId: "p30", kind: "order", title: "Ventilator changed", detail: "FiO₂ 0.60, rate 14, I:E 1:4", by: kevin },
				{ patientId: "p30", kind: "order", title: "Albuterol and ipratropium in-line", detail: "First of three, every 2 h", by: kevin },
				{ patientId: "p30", kind: "order", title: "Suctioned: thick tan plug", detail: "SpO₂ 86% → 89%", by: lauren },
			],
		}),
	},
	{
		after: "pathway",
		alertId: "live-pierce",
		delay: 12,
		// 5. 04:30: SpO₂ 92% on FiO₂ 0.45, auto-PEEP 3, peak 34, RR 20. NEWS2 back to Medium, so he drops down the list.
		label: "Pierce, 04:30: SpO₂ 92%, auto-PEEP 3. His score drops back down the list",
		changes: () => ({
			census: { p30: sampleScenario5WalterCensusAt("stabilized") },
			monitoring: { p30: sampleScenario5WalterMonitoringAt("stabilized") },
			records: { p30: pierceRecord("stabilized") },
			resolve: {
				"live-pierce": {
					by: INTENSIVIST,
					reason: "Treated",
					note: "Plug suctioned, air trapping eased (rate 14, I:E 1:4), bronchodilators every 2 h. SpO₂ 92% on FiO₂ 0.45.",
				},
			},
			log: [
				{ patientId: "p30", kind: "outcome", title: "SpO₂ 92% on FiO₂ 0.45", detail: "Auto-PEEP 3, peak 34. ABG pH 7.34, PaCO₂ 56", by: "Lab, Regional West" },
				{ patientId: "p30", kind: "outcome", title: "Ventilator event outcomes recorded", detail: "Time to intensivist 2 min · SpO₂ back in range in 80 min · Payer: Medicare" },
			],
		}),
	},
	{
		after: "pathway",
		alertId: "live-pierce",
		delay: 18,
		// 6. Walter's encounter is done: the AI drafts its note for the clinician to edit and sign on his page.
		label: "AI drafted the note for Pierce's ventilator event",
		changes: () => {
			drafted.add("walter");
			return {
				records: { p30: pierceRecord("stabilized", { drafted: true }) },
				log: [{ patientId: "p30", kind: "note", title: "Event note drafted by AI", detail: "From the ventilator data and your call, to edit and sign", by: "AI Scribe" }],
				notices: [
					{
						id: "pierce-note",
						patientId: "p30",
						title: "Pierce's event note is drafted",
						description: `Drafted by AI from the ventilator data and your call: review, edit and sign it in Notes. About ${sampleScenario5DocumentationMinutes.walter} min of typing saved.`,
						actionLabel: "Open patient",
						opens: "patient",
					},
				],
			};
		},
	},
	// 6. The 07:00 handoff report builds itself once the night's events are in; it counts the documentation minutes the
	// drafts saved this shift. After Walter's pathway or Linda's transfer, whichever comes last.
	...(["pathway", "transfer"] as const).map(
		(after): ScenarioBeat => ({
			after,
			alertId: after === "pathway" ? "live-pierce" : "live-shaw",
			delay: 26,
			label: "07:00 handoff report built from the night's events",
			changes: () => {
				// Only once both encounters are drafted, so it plays after whichever finishes last.
				if (!(drafted.has("walter") && drafted.has("linda"))) return {};
				const minutes = sampleScenario5DocumentationMinutes.walter + sampleScenario5DocumentationMinutes.linda;
				return {
					notices: [
						{
							id: "surge-handoff",
							patientId: "p30",
							title: "07:00 handoff report is ready",
							description: `Built from the night across five hospitals: 2 events, 1 overflow, 1 transfer. 2 notes drafted by AI: ${minutes} min of documentation saved this shift.`,
							actionLabel: "Open handoff",
							opens: "handoff",
						},
					],
				};
			},
		}),
	),
];

const sampleScenario5: ScenarioDefinition = {
	patientIds: ["p30", "p31"],
	alertIds: ["live-pierce", "live-shaw"],
	beats: scenario5Beats,
};

export { sampleScenario5 };
