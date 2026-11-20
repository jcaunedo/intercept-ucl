import type { OutcomeMetric, OutcomesData, OutcomeValue } from "./analytics-panel";

// Synthetic data: one pilot month across the five hospitals, against the same month before the pilot (Demo Use Cases,
// Scenario 6: "the pilot dashboard, populated with one synthetic month that includes the scenarios above"). Every number
// is made up for the demo and labeled so on screen; only the measured cohort results from Intercept's existing service
// are real outcomes, and they don't belong here. The counties' rurality codes (RUCC) are illustrative too.

/** `[baseline, pilot]` → a value. */
const v = ([baseline, pilot]: [number | null, number]): OutcomeValue => ({ baseline, pilot });

/** A metric's values by payer, in the groups' order: Medicare, Dual-eligible, Medicaid, Commercial, Uninsured. */
const byPayer = (...values: ([number | null, number] | null)[]) =>
	Object.fromEntries(payerIds.map((id, index) => [id, values[index] ? v(values[index]!) : null]));

/** A metric's values by county rurality, in the groups' order: RUCC 5, RUCC 7, RUCC 9. */
const byRurality = (...values: ([number | null, number] | null)[]) =>
	Object.fromEntries(ruralityIds.map((id, index) => [id, values[index] ? v(values[index]!) : null]));

const payerIds = ["medicare", "dual", "medicaid", "commercial", "uninsured"];
const ruralityIds = ["rucc-5", "rucc-7", "rucc-9"];

const metric = (
	item: Omit<OutcomeMetric, "overall" | "by"> & {
		overall: [number | null, number];
		payer?: ([number | null, number] | null)[];
		rurality?: ([number | null, number] | null)[];
	},
): OutcomeMetric => {
	const { overall, payer, rurality, ...rest } = item;
	return {
		...rest,
		overall: v(overall),
		by: {
			payer: payer ? byPayer(...payer) : byPayer(),
			rurality: rurality ? byRurality(...rurality) : byRurality(),
		},
	};
};

const sampleOutcomes: OutcomesData = {
	period: "Oct 19 – Nov 18, 2026",
	baseline: "the same month in 2025, before the pilot",
	source: "Outcomes layer: every alert, decision and outcome the platform recorded across the five hospitals",
	synthetic: true,
	headline: ["alert-to-intensivist", "transfers-retained", "readmissions", "transfer-costs"],
	breakdowns: [
		{
			id: "payer",
			label: "By payer",
			groups: [
				{ id: "medicare", label: "Medicare", patients: 118 },
				{ id: "dual", label: "Dual-eligible", patients: 46 },
				{ id: "medicaid", label: "Medicaid", patients: 54 },
				{ id: "commercial", label: "Commercial", patients: 49 },
				{ id: "uninsured", label: "Uninsured", patients: 19 },
			],
		},
		{
			id: "rurality",
			label: "By rurality",
			groups: [
				{ id: "rucc-5", label: "RUCC 5", detail: "Scotts Bluff County", patients: 96 },
				{ id: "rucc-7", label: "RUCC 7", detail: "Dawes, Box Butte, Cheyenne counties", patients: 152 },
				{ id: "rucc-9", label: "RUCC 9", detail: "Morrill County", patients: 38 },
			],
		},
	],
	sections: [
		{
			id: "access",
			title: "Access",
			description: "Who can get ICU-level care where they are, and how fast an intensivist answers.",
			metrics: [
				metric({
					id: "coverage-hours",
					label: "ICU-level coverage hours at spoke sites",
					detail: "Hours a spoke hospital had an intensivist on the console",
					format: "hours",
					better: "up",
					overall: [0, 2976],
					// A site's hours, not a patient's: by county they're the spokes' in it; by payer they don't apply.
					rurality: [null, [0, 2232], [0, 744]],
					notByPatient: "A site measure, not a patient's",
				}),
				metric({
					id: "alert-to-intensivist",
					label: "Median time from alert to intensivist",
					detail: "From a Critical or High alert to an intensivist on it",
					format: "minutes",
					better: "down",
					overall: [47, 6],
					payer: [[45, 6], [49, 6], [46, 5], [44, 6], [55, 7]],
					rurality: [[22, 4], [51, 6], [68, 8]],
				}),
			],
		},
		{
			id: "quality",
			title: "Quality",
			description: "Whether patients do better, and stay closer to home.",
			metrics: [
				metric({
					id: "transfers-retained",
					label: "Patients kept at their hospital",
					detail: "Patients a transfer was considered for who stayed and did well",
					format: "percent",
					better: "up",
					overall: [34, 61],
					payer: [[36, 63], [31, 58], [33, 60], [38, 62], [26, 57]],
					rurality: [[79, 88], [30, 58], [22, 52]],
				}),
				metric({
					id: "bundle-compliance",
					label: "Sepsis bundle compliance",
					detail: "SEP-1: every element on time",
					format: "percent",
					better: "up",
					overall: [52, 81],
					payer: [[54, 82], [48, 79], [50, 80], [57, 84], [41, 76]],
					rurality: [[71, 88], [47, 79], [38, 74]],
				}),
				metric({
					id: "length-of-stay",
					label: "ICU-level length of stay",
					detail: "Mean days of ICU-level care per episode",
					format: "days",
					better: "down",
					overall: [4.3, 3.6],
					payer: [[4.4, 3.7], [4.8, 3.9], [4.2, 3.5], [3.9, 3.2], [4.5, 3.6]],
					rurality: [[4.0, 3.4], [4.4, 3.6], [4.7, 3.9]],
				}),
				metric({
					id: "follow-up-7-days",
					label: "Follow-up within 7 days of discharge",
					detail: "A primary-care visit or nurse call within 7 days",
					format: "percent",
					better: "up",
					overall: [41, 78],
					payer: [[44, 80], [35, 74], [37, 76], [52, 83], [22, 63]],
					rurality: [[55, 84], [38, 77], [29, 71]],
				}),
				metric({
					id: "readmissions",
					label: "30-day readmissions",
					detail: "Back as an inpatient within 30 days of discharge",
					format: "percent",
					better: "down",
					overall: [19.8, 13.1],
					payer: [[20.1, 13.6], [24.4, 15.2], [21.0, 12.9], [14.8, 10.2], [23.5, 14.3]],
					rurality: [[15.9, 11.4], [20.6, 13.3], [25.0, 15.8]],
				}),
				metric({
					id: "mortality",
					label: "Mortality against benchmark",
					detail: "Observed / expected deaths, risk-adjusted (under 1.00 is better than expected)",
					format: "ratio",
					better: "down",
					overall: [1.14, 0.93],
					payer: [[1.12, 0.94], [1.21, 0.97], [1.15, 0.91], [1.02, 0.88], [1.3, 0.99]],
					rurality: [[1.01, 0.89], [1.16, 0.94], [1.27, 0.97]],
				}),
			],
		},
		{
			id: "affordability",
			title: "Affordability",
			description: "What the network didn't spend on transfers, and the revenue each hospital kept.",
			metrics: [
				metric({
					id: "transfer-costs",
					label: "Transfer costs avoided",
					detail: "Ground and air transfers that didn't happen, at each route's average cost",
					format: "usd",
					better: "up",
					overall: [0, 487_000],
					payer: [[0, 198_000], [0, 96_000], [0, 88_000], [0, 64_000], [0, 41_000]],
					rurality: [[0, 22_000], [0, 341_000], [0, 124_000]],
				}),
				metric({
					id: "revenue-retained",
					label: "Revenue kept by the spoke hospitals",
					detail: "Care billed at the patient's own hospital instead of the receiving one",
					format: "usd",
					better: "up",
					overall: [0, 612_000],
					payer: [[0, 262_000], [0, 104_000], [0, 118_000], [0, 109_000], [0, 19_000]],
					// Scotts Bluff County is the hub's: none of it is a spoke's.
					rurality: [null, [0, 468_000], [0, 144_000]],
				}),
			],
		},
	],
	hospitals: [
		{ id: "regional-west", name: "Regional West", role: "hub", transfersRetained: 1, costAvoided: 22_000, revenueRetained: null },
		{ id: "chadron", name: "Chadron Memorial", role: "spoke", transfersRetained: 6, costAvoided: 152_000, revenueRetained: 196_000 },
		{ id: "alliance", name: "Alliance Community", role: "spoke", transfersRetained: 5, costAvoided: 118_000, revenueRetained: 162_000 },
		{ id: "sidney", name: "Sidney Regional", role: "spoke", transfersRetained: 3, costAvoided: 71_000, revenueRetained: 110_000 },
		{ id: "bridgeport", name: "Bridgeport Valley", role: "spoke", transfersRetained: 4, costAvoided: 124_000, revenueRetained: 144_000 },
	],
	// The demo's six scenarios, as each wrote its events (their own "outcomes recorded" lines).
	scenarios: [
		{
			id: "s1",
			scenario: "Scenario 1",
			patient: "Margaret Hayes",
			hospital: "Chadron Memorial",
			written: "Transfer avoided · ICU-level care at Chadron 4 h 20 min",
			payer: "Dual-eligible",
		},
		{
			id: "s2",
			scenario: "Scenario 2",
			patient: "Dale Reynolds",
			hospital: "Alliance Community",
			written: "BiPAP success at 2 h · No air transport in the blizzard",
			payer: "Uninsured",
		},
		{
			id: "s3",
			scenario: "Scenario 3",
			patient: "Rosa Medina",
			hospital: "Sidney Regional",
			written: "Antibiotics at 24 min · Bundle 5 of 5 · Cared for at Sidney",
			payer: "Medicaid",
		},
		{
			id: "s4",
			scenario: "Scenario 4",
			patient: "Tyler Kessler",
			hospital: "Bridgeport Valley",
			written: "Gap closed at 13 h · Checks on time 13 of 14 · Social need recorded, insulin access referral",
			payer: "Uninsured",
		},
		{
			id: "s5-walter",
			scenario: "Scenario 5",
			patient: "Walter Pierce",
			hospital: "Regional West",
			written: "Time to intensivist 2 min · SpO₂ back in range in 80 min",
			payer: "Medicare",
		},
		{
			id: "s5-linda",
			scenario: "Scenario 5",
			patient: "Linda Shaw",
			hospital: "Sidney Regional",
			written: "Overflow to Intercept in 3 min 50 s · Door-in-door-out 1 h 46 min",
			payer: "Medicaid",
		},
		{
			id: "s6",
			scenario: "Scenario 6",
			patient: "Margaret Hayes",
			hospital: "Chadron Memorial",
			written: "Follow-up within 7 days · Readmission avoided on day 11",
			payer: "Dual-eligible",
		},
	],
	report: {
		title: "Q4 2026 DHHS quarterly report",
		evidenceTitle: "Milestone 2 evidence pack",
		contents: [
			"Access, quality and affordability metrics against the baseline",
			"Every metric by payer and by county rurality",
			"Coverage at each spoke hospital",
		],
		evidence: [
			"The month's events from the outcomes layer, by scenario",
			"Transfers kept, their cost avoided and the revenue kept, by hospital",
		],
	},
};

export { sampleOutcomes };
