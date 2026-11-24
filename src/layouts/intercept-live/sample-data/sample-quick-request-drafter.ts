import type { PatientRecord } from "../patient-details/patient-details";
import { samplePatientRecords } from "../patient-details/sample-data/sample-patient-details";
import type { VitalParameter, VitalSeries } from "../patient-details/sections/vitals-section";
import {
	fillQuickRequest,
	type QuickRequest,
	type QuickRequestDraftContext,
	type QuickRequestDrafter,
} from "../shared/quick-requests";

// The prototype's stand-in for the clinical data agent drafting a quick request (PRD Messages MSG-005): it reads the
// command's instructions for what they ask about (vitals, labs, drips, the nurse's last message, the summary, safety)
// and adds those facts from the patient's sample chart and the thread to the command's message. The app replaces it
// with the agent (`InterceptLive`'s `draftQuickRequest`).

const draftDelayMs = 900;

const vitalLabels: Record<VitalParameter, { label: string; unit?: string }> = {
	hr: { label: "HR" },
	bp: { label: "BP" },
	map: { label: "MAP" },
	spo2: { label: "SpO₂", unit: "%" },
	rr: { label: "RR" },
	temp: { label: "Temp", unit: "°C" },
	etco2: { label: "EtCO₂" },
	glucose: { label: "Glucose" },
};

const formatVital = (series: VitalSeries, value: number, diastolic?: number) =>
	`${series.parameter === "bp" && diastolic !== undefined ? `${value}/${diastolic}` : value}${vitalLabels[series.parameter].unit ?? ""}`;

/** The vitals that moved most since `since` (or the last 2 h), latest value and the one before: "MAP 58 (was 70)". */
function vitalsChanges(record: PatientRecord, since: number) {
	const changes = (record.vitals?.series ?? []).flatMap((series) => {
		const latest = series.readings.at(-1);
		const before = [...series.readings].reverse().find((reading) => Date.parse(reading.at) <= since) ?? series.readings[0];
		if (!latest || !before || latest === before || latest.value === before.value) return [];
		const change = Math.abs(latest.value - before.value) / Math.max(Math.abs(before.value), 1);
		return [
			{
				change,
				text: `${vitalLabels[series.parameter].label} ${formatVital(series, latest.value, latest.diastolic)} (was ${formatVital(series, before.value, before.diastolic)})`,
			},
		];
	});
	return changes
		.sort((a, b) => b.change - a.change)
		.slice(0, 2)
		.map((item) => item.text);
}

const join = (items: string[]) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`);

/** Flagged labs with their previous value: "Lactate 4.1 (was 2.2)". */
function labChanges(record: PatientRecord) {
	return (record.labs ?? [])
		.filter((lab) => lab.flag && lab.value)
		.slice(0, 2)
		.map((lab) => `${lab.name} ${lab.value}${lab.previous ? ` (was ${lab.previous.value})` : ""}`);
}

/** Drips whose rate changed: "norepinephrine 0.22 mcg/kg/min (up from 0.15)". */
function dripChanges(record: PatientRecord) {
	const infusions = record.infusions ?? [];
	const changed = infusions.filter((infusion) => infusion.change && infusion.rate);
	return (changed.length ? changed : infusions.filter((infusion) => infusion.rate))
		.slice(0, 2)
		.map(
			(infusion) =>
				`${infusion.drug.toLowerCase()} ${infusion.rate}${infusion.change ? ` (${infusion.change.direction} from ${infusion.change.from})` : ""}`,
		);
}

const shorten = (text: string, words = 10) => {
	const parts = text.split(/\s+/);
	return parts.length > words ? `${parts.slice(0, words).join(" ")}…` : text;
};

const sampleDraftQuickRequest: QuickRequestDrafter = async (request: QuickRequest, context: QuickRequestDraftContext) => {
	await new Promise((resolve) => setTimeout(resolve, draftDelayMs));
	const message = fillQuickRequest(request.message, context);
	const instructions = request.instructions?.toLowerCase() ?? "";
	const record = samplePatientRecords.find((item) => item.id === context.patientId);
	const lastFromBedside = [...context.messages].reverse().find((item) => item.from === "bedside");
	const sinceMessage = /since/.test(instructions) && lastFromBedside;
	const since = sinceMessage ? Date.parse(lastFromBedside.sentAt) : Date.now() - 2 * 60 * 60_000;

	const lead: string[] = [];
	const facts: string[] = [];
	// Quoting what the nurse said only when asked to reply to it ("since their last message" is a time, not a reply).
	if (lastFromBedside && /repl|answer|respond|follow(ing)? up on|refer to|quote|what (they|she|he) said/.test(instructions)) {
		lead.push(`Following up on "${shorten(lastFromBedside.text)}":`);
	}
	if (record) {
		if (/vital|map|pressure|spo|saturation|heart rate|resp|temp|changed/.test(instructions)) {
			const vitals = vitalsChanges(record, since);
			if (vitals.length) facts.push(`I'm seeing ${join(vitals)}${sinceMessage ? " since your last message" : ""}.`);
		}
		if (/lab|lactate|potassium|creatinine|wbc/.test(instructions)) {
			const labs = labChanges(record);
			if (labs.length) facts.push(`Latest labs: ${join(labs)}.`);
		}
		if (/drip|infusion|pressor|norepi|sedation/.test(instructions)) {
			const drips = dripChanges(record);
			if (drips.length) facts.push(`Currently on ${join(drips)}.`);
		}
		if (/allerg|code status|isolation|safety/.test(instructions)) {
			facts.push(
				[record.codeStatus, record.allergies?.length ? `allergic to ${record.allergies.join(", ").toLowerCase()}` : undefined, record.isolation?.toLowerCase()]
					.filter(Boolean)
					.join(", ")
					.replace(/^./, (letter) => letter.toUpperCase()) + ".",
			);
		}
		if (!facts.length && /summar|context|situation|update|brief|what'?s going on/.test(instructions) && record.brief?.title) {
			facts.push(`${record.brief.title}.`);
		}
	}
	const shortOnly = /short|concise|one line|brief and/.test(instructions);
	return [...lead, message.trim(), ...(shortOnly ? facts.slice(0, 1) : facts)].join(" ");
};

export { sampleDraftQuickRequest };
