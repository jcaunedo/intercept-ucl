import type { PatientChart } from "../sections/chart-section";
import type { LabTrendBaseline, LabTrendEvent, LabTrendPoint, PatientLabTrends } from "../sections/lab-trends";
import { sampleChartByPatient } from "./sample-chart";
import { samplePatientBaseRecords } from "./sample-patient-records";

// Synthetic data (PRD Patient details PD-150) for the Labs tab's Lab trends: each Census patient's earlier results,
// before the chart's previous and latest, so every test has a history to chart. Draws are once a day in the early
// morning from admission (up to six days back), drifting from a value near the edge of the range toward the chart's
// previous result, with a small deterministic wobble. Sarah Miller (`p1`) is written by hand to tell her sepsis story:
// lactate 3.4 on arrival, down to 1.8 with fluids, back up to 2.2 and 4.1 as she becomes septic again; creatinine from
// her outpatient 0.8 to 1.9; procalcitonin rising, the latest one pending.

const MINUTE = 60_000;
const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * MINUTE).toISOString();
const hoursAgo = (hours: number) => minutesAgo(hours * 60);
/** "Aug 18": the day `days` ago, for an outpatient baseline. */
const dayLabel = (days: number) => new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(Date.now() - days * 24 * 60 * MINUTE);

/** A stable number from a string, so every session draws the same history. */
const hash = (text: string) => [...text].reduce((total, char) => (total * 31 + char.charCodeAt(0)) % 1_000_003, 7);
const wobble = (seed: number, step: number) => Math.sin(seed / 97 + step * 1.7) * 0.6 + Math.sin(seed / 31 + step * 3.1) * 0.4;

const toNumber = (value: string | undefined) => (value === undefined ? Number.NaN : Number.parseFloat(value.replace(/,/g, "")));
const decimalsOf = (value: string) => value.match(/\.(\d+)/)?.[1].length ?? 0;

function rangeOf(range: string | undefined) {
	if (!range) return undefined;
	const between = range.match(/^\s*(-?\d+(?:\.\d+)?)\s*[–-]\s*(-?\d+(?:\.\d+)?)\s*$/);
	if (between) return { low: Number(between[1]), high: Number(between[2]) };
	const under = range.match(/^\s*under\s+(\d+(?:\.\d+)?)\s*$/i);
	if (under) return { high: Number(under[1]) };
	const over = range.match(/^\s*over\s+(\d+(?:\.\d+)?)\s*$/i);
	if (over) return { low: Number(over[1]) };
	return undefined;
}

/**
 * Earlier daily draws for every numeric test in a chart: from admission (at most six days back) up to the day before
 * the chart's previous result (or its latest, without one).
 */
function generatedHistory(chart: PatientChart, admittedHoursAgo: number): Record<string, LabTrendPoint[]> {
	const history: Record<string, LabTrendPoint[]> = {};
	for (const panel of chart.panels) {
		for (const result of panel.results) {
			const anchorValue = toNumber(result.previous?.value ?? result.value);
			const anchorAt = result.previous?.at ?? result.resultedAt ?? result.collectedAt;
			if (Number.isNaN(anchorValue) || !anchorAt) continue;
			const latest = toNumber(result.value);
			const range = rangeOf(result.range);
			const seed = hash(`${chart.updatedAt.slice(0, 10)}${result.name}`);
			const decimals = Math.max(decimalsOf(result.value ?? ""), decimalsOf(result.previous?.value ?? ""));
			// Where it started: inside the range, at the side the patient is heading to, so the line tells the change.
			const heading = Number.isNaN(latest) ? 0 : Math.sign(latest - anchorValue);
			const start =
				range?.low !== undefined && range.high !== undefined
					? heading > 0
						? range.low + (range.high - range.low) * 0.7
						: heading < 0
							? range.low + (range.high - range.low) * 0.3
							: anchorValue
					: anchorValue * (heading > 0 ? 0.8 : heading < 0 ? 1.15 : 1);
			const anchorHours = (Date.now() - Date.parse(anchorAt)) / (60 * MINUTE);
			const days = Math.min(6, Math.floor((admittedHoursAgo - anchorHours) / 24));
			if (days < 1) continue;
			const points: LabTrendPoint[] = [];
			for (let day = days; day >= 1; day--) {
				// Early morning draws, a little apart each day.
				const hours = anchorHours + day * 24 + ((seed + day * 13) % 50) / 60;
				const share = 1 - day / (days + 1);
				const value = start + (anchorValue - start) * share + wobble(seed, day) * Math.abs(anchorValue) * 0.04;
				points.push({
					at: hoursAgo(hours),
					resultedAt: hoursAgo(hours - 0.75),
					value: Math.max(0, value).toFixed(decimals),
				});
			}
			history[result.name] = points;
		}
	}
	return history;
}

/**
 * Each earlier result with the flag the lab gave it, from its test's range in the chart (the sample stands in for the
 * lab: Lab trends never works a flag out itself).
 */
function withFlags(history: Record<string, LabTrendPoint[]>, chart: PatientChart): Record<string, LabTrendPoint[]> {
	const ranges = new Map(chart.panels.flatMap((panel) => panel.results.map((result) => [result.name, rangeOf(result.range)] as const)));
	return Object.fromEntries(
		Object.entries(history).map(([name, points]) => {
			const range = ranges.get(name);
			return [
				name,
				points.map((point) => {
					const value = toNumber(point.value);
					if (!range || Number.isNaN(value)) return point;
					const flag = range.low !== undefined && value < range.low ? "low" : range.high !== undefined && value > range.high ? "high" : undefined;
					return flag ? { ...point, flag } : point;
				}),
			];
		}),
	);
}

/** An outpatient creatinine, when the patient had one: their kidneys' normal before this illness. */
function creatinineBaseline(problems: string[], sex: "F" | "M"): LabTrendBaseline | undefined {
	if (problems.some((problem) => /end-stage|dialysis/i.test(problem))) return undefined;
	if (problems.some((problem) => /chronic kidney/i.test(problem))) return { value: 1.7, label: `Outpatient, ${dayLabel(84)}` };
	return { value: sex === "M" ? 1 : 0.8, label: `Outpatient, ${dayLabel(97)}` };
}

const at = (minutes: number, value: string, note?: string): LabTrendPoint => ({
	at: minutesAgo(minutes),
	resultedAt: minutesAgo(minutes - 40),
	value,
	note,
});

/** Sarah Miller's sepsis story, by hand (her chart holds the previous and latest results). */
const millerTrends: PatientLabTrends = {
	history: {
		Lactate: [at(55 * 60, "3.4"), at(49 * 60, "2.6"), at(1300, "1.8")],
		WBC: [at(55 * 60, "15.6"), at(49 * 60, "14.8")],
		Creatinine: [at(55 * 60, "1.1"), at(49 * 60, "1.2")],
		Potassium: [at(55 * 60, "4.1"), at(49 * 60, "3.9")],
		Hemoglobin: [at(55 * 60, "11.9"), at(49 * 60, "11.2")],
		Procalcitonin: [at(54 * 60, "2.4"), at(1490, "3.1"), at(330, "6.8")],
		Platelets: [at(55 * 60, "214"), at(49 * 60, "196")],
		BUN: [at(55 * 60, "22"), at(49 * 60, "25")],
		Bicarbonate: [at(55 * 60, "22"), at(49 * 60, "22")],
		Glucose: [at(55 * 60, "248"), at(49 * 60, "201")],
		Sodium: [at(55 * 60, "134"), at(49 * 60, "137")],
	},
	baselines: {
		Creatinine: { value: 0.8, label: `Outpatient, ${dayLabel(97)}` },
		Hemoglobin: { value: 12.9, label: `Outpatient, ${dayLabel(97)}` },
	},
	events: [
		{ id: "ev-fluids", at: hoursAgo(54.5), label: "Crystalloid 30 mL/kg" },
		{ id: "ev-abx-1", at: hoursAgo(54), label: "Ceftriaxone and azithromycin started" },
		{ id: "ev-intubated", at: hoursAgo(50), label: "Intubated" },
		{ id: "ev-norepi", at: hoursAgo(26), label: "Norepinephrine started" },
		{ id: "ev-norepi-up", at: minutesAgo(40), label: "Norepinephrine 0.15 → 0.22 mcg/kg/min" },
		{ id: "ev-abx-2", at: minutesAgo(30), label: "Vancomycin and aztreonam started" },
	],
};

const sampleLabTrendsByPatient: Record<string, PatientLabTrends> = Object.fromEntries(
	samplePatientBaseRecords
		.filter((record) => sampleChartByPatient[record.id])
		.map((record) => {
			const chart = sampleChartByPatient[record.id];
			if (record.id === "p1") return [record.id, { ...millerTrends, history: withFlags(millerTrends.history ?? {}, chart) }];
			const admittedAt = record.icuAdmittedAt ?? record.admittedAt;
			const admittedHoursAgo = admittedAt ? (Date.now() - Date.parse(admittedAt)) / (60 * MINUTE) : 72;
			const problems = [record.diagnosis ?? "", ...(record.problems ?? [])];
			const sex = chart.panels.some((panel) => panel.results.some((result) => result.name === "Hemoglobin" && result.range === "12.0–17.0")) ? "M" : "F";
			const baseline = creatinineBaseline(problems, sex);
			const events: LabTrendEvent[] = admittedAt ? [{ id: `${record.id}-admitted`, at: admittedAt, label: "Admitted" }] : [];
			const trends: PatientLabTrends = {
				history: withFlags(generatedHistory(chart, admittedHoursAgo), chart),
				baselines: baseline ? { Creatinine: baseline } : undefined,
				events,
			};
			return [record.id, trends];
		}),
);

export { sampleLabTrendsByPatient };
