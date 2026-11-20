import type { ScheduleShift } from "./schedule-panel";

// Synthetic schedule for the signed-in clinician (Joanna Smith, Intensivist), built around today so the calendar always
// opens on a live month. Today is the middle of a three-day block of day shifts, ending at 8:00 PM as in the account
// menu's My shift (`sampleShiftEndsAt`).

const DAY_SHIFT = { start: 8, hours: 12 };
const NIGHT_SHIFT = { start: 20, hours: 12 };
const ON_CALL = { start: 17, hours: 15 };

const allHospitals = ["bridgeport", "alliance", "sidney", "chadron"];

/** A date `offset` days from today at `hour` (local time), as an ISO string. */
function at(offset: number, hour: number) {
	const date = new Date();
	date.setHours(0, 0, 0, 0);
	date.setDate(date.getDate() + offset);
	date.setHours(hour);
	return date;
}

function shiftAt(offset: number, time: { start: number; hours: number }) {
	const start = at(offset, time.start);
	const end = new Date(start);
	end.setHours(end.getHours() + time.hours);
	return { start: start.toISOString(), end: end.toISOString() };
}

// A 14-day rotation from yesterday: three days, three off, three nights, two off, one on call, two off.
const rotation = ["day", "day", "day", null, null, null, "night", "night", "night", null, null, "on-call", null, null] as const;

// Three days of approved time off, which the rotation skips. A pending request (below) keeps the shifts it covers.
const timeOffDays = new Set([18, 19, 20]);

// The schedule is published four weeks ahead; past that it's a draft the coordinator can still change (§5.15).
const publishedThrough = 28;

const sampleScheduleShifts: ScheduleShift[] = (() => {
	const shifts: ScheduleShift[] = [];
	for (let offset = -45; offset <= 60; offset++) {
		if (timeOffDays.has(offset)) continue;
		const kind = rotation[(((offset + 1) % 14) + 14) % 14];
		if (!kind) continue;
		const status = offset > publishedThrough ? "draft" : "published";
		const id = `shift-${offset}`;
		if (kind === "day") {
			shifts.push({
				id,
				kind,
				...shiftAt(offset, DAY_SHIFT),
				hospitalIds: allHospitals,
				role: "Tele-ICU intensivist",
				callQueues: ["Tele-ICU", "Rapid response"],
				status,
			});
		} else if (kind === "night") {
			shifts.push({
				id,
				kind,
				...shiftAt(offset, NIGHT_SHIFT),
				hospitalIds: ["chadron", "alliance", "bridgeport"],
				role: "Tele-ICU intensivist",
				callQueues: ["Tele-ICU"],
				// One night is up for a swap, waiting on a colleague to take it.
				status: offset === 6 ? "swap-requested" : status,
				note: offset === 6 ? "Swap offered to James Turner" : undefined,
			});
		} else {
			shifts.push({
				id,
				kind,
				...shiftAt(offset, ON_CALL),
				hospitalIds: ["sidney", "bridgeport"],
				role: "Backup intensivist, from home",
				callQueues: ["Rapid response"],
				status,
			});
		}
	}
	shifts.push(
		{
			id: "time-off-1",
			kind: "time-off",
			start: at(18, 0).toISOString(),
			end: at(21, 0).toISOString(),
			hospitalIds: [],
			status: "approved",
			note: "Family visit",
		},
		{
			id: "time-off-2",
			kind: "time-off",
			start: at(33, 0).toISOString(),
			end: at(35, 0).toISOString(),
			hospitalIds: [],
			status: "pending",
			note: "Conference",
		},
	);
	return shifts;
})();

// Open shifts the clinician is eligible for (licensed in Nebraska, privileged at the hospital, credentials current;
// Left Nav Spec): each falls on one of their days off.
const sampleOpenShifts: ScheduleShift[] = [
	{
		id: "open-1",
		kind: "night",
		...shiftAt(4, NIGHT_SHIFT),
		hospitalIds: ["sidney"],
		role: "Tele-ICU intensivist",
		callQueues: ["Tele-ICU"],
		note: "Coverage gap: the scheduled intensivist is out sick",
	},
	{
		id: "open-2",
		kind: "day",
		...shiftAt(9, DAY_SHIFT),
		hospitalIds: ["alliance", "chadron"],
		role: "Tele-ICU intensivist",
		callQueues: ["Tele-ICU", "Rapid response"],
	},
	{
		id: "open-3",
		kind: "on-call",
		...shiftAt(12, ON_CALL),
		hospitalIds: ["bridgeport"],
		role: "Backup intensivist, from home",
		callQueues: ["Rapid response"],
	},
	{
		id: "open-4",
		kind: "day",
		...shiftAt(16, DAY_SHIFT),
		hospitalIds: ["bridgeport", "sidney"],
		role: "Tele-ICU intensivist",
		callQueues: ["Tele-ICU"],
	},
	{
		id: "open-5",
		kind: "night",
		...shiftAt(23, NIGHT_SHIFT),
		hospitalIds: ["chadron"],
		role: "Tele-ICU intensivist",
		callQueues: ["Tele-ICU"],
		note: "Holiday coverage",
	},
	{
		id: "open-6",
		kind: "day",
		...shiftAt(25, DAY_SHIFT),
		hospitalIds: allHospitals,
		role: "Tele-ICU intensivist",
		callQueues: ["Tele-ICU", "Rapid response"],
	},
];

export { sampleOpenShifts, sampleScheduleShifts };
