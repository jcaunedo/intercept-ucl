import type { MonitorVitals } from "@/components/data-display/patient-monitor";

import type { PatientRecord } from "../patient-details";
import type { NoteAiField, NoteChartBlockId } from "./note-templates";
import type { VitalParameter, VitalSeries } from "./vitals-section";

// What a note fills in from the patient's data (PRD Notes NTE-004, NTE-007, NTE-009), read from the record the page
// already has. Read once when a section is inserted, and again on its Refresh: a signed note keeps what it read.

/** A table of readings, columns oldest first: the Vitals block. */
type NoteChartTable = {
	columns: string[];
	rows: { label: string; cells: { value: string; abnormal?: boolean }[] }[];
};

/** One chart section's content, as read at `asOf`. */
type NoteChartBlock = {
	/** Where it comes from: "Monitor and flowsheet", "MAR", "Ventilator". */
	source: string;
	/** When it was read into the note, ISO 8601. */
	asOf: string;
	table?: NoteChartTable;
	lines?: string[];
};

type NoteChart = Partial<Record<NoteChartBlockId, NoteChartBlock>>;

/** Who writes the patient's new notes: the signed-in clinician. */
type NoteAuthor = { name: string; role: string };

/** What the note editor gets from the page. */
type NoteContext = {
	author: NoteAuthor;
	/** Reads the chart sections now. */
	readChart: () => NoteChart;
	/** AI drafts the clinician can pull into a section (PRD NTE-007). */
	ai?: Partial<Record<NoteAiField, string>>;
	/** Video consult time logged today for the patient, in minutes, for the attestation (PRD NTE-009). */
	loggedMinutes?: number;
	/** Who was involved besides the patient, for the attestation: "Kelly Ortiz, RN". */
	participants?: string[];
};

/* -------------------------------------------------------------------------- */
/* Reading the record                                                         */
/* -------------------------------------------------------------------------- */

const timeLabel = (iso: string) =>
	new Intl.DateTimeFormat(undefined, {
		hour: "numeric",
		minute: "2-digit",
	}).format(new Date(iso));

const vitalRows: { parameter: VitalParameter; label: string }[] = [
	{ parameter: "bp", label: "BP" },
	{ parameter: "hr", label: "Pulse" },
	{ parameter: "rr", label: "Resp" },
	{ parameter: "temp", label: "Temp" },
	{ parameter: "spo2", label: "SpO₂" },
];

const COLUMNS = 6;
const NEAR_MS = 7 * 60_000;

/**
 * The last few charted times (the BP's, else the pulse's), each parameter's reading nearest to it, then the monitor's
 * reading now. Outside the alarm limits is marked, as Epic's (!).
 */
function vitalsTable(series: VitalSeries[], monitor?: MonitorVitals): NoteChartTable | undefined {
	const by = (parameter: VitalParameter) => series.find((item) => item.parameter === parameter);
	const anchor = by("bp") ?? by("hr");
	if (!anchor?.readings.length) return undefined;
	const times = anchor.readings.slice(-COLUMNS).map((reading) => Date.parse(reading.at));
	const outside = (item: VitalSeries, value: number) => (item.limits ? value < item.limits[0] || value > item.limits[1] : false);
	// The monitor's reading now, marked against the same limits.
	const reading = (value: number | null | undefined, text?: string) =>
		value != null ? { value: text ?? `${value}`, number: value } : undefined;
	const live: Partial<Record<VitalParameter, { value: string; number: number }>> = monitor
		? {
				bp: monitor.diastolic != null ? reading(monitor.systolic, `${monitor.systolic}/${monitor.diastolic}`) : undefined,
				hr: reading(monitor.hr),
				rr: reading(monitor.rr),
				spo2: reading(monitor.spo2, `${monitor.spo2}%`),
			}
		: {};
	return {
		columns: [...times.map((time) => timeLabel(new Date(time).toISOString())), ...(monitor ? ["Now"] : [])],
		rows: vitalRows.flatMap(({ parameter, label }) => {
			const item = by(parameter);
			if (!item) return [];
			const cells = times.map((time) => {
				const reading = item.readings.reduce<(typeof item.readings)[number] | undefined>((best, current) => {
					const distance = Math.abs(Date.parse(current.at) - time);
					return distance <= NEAR_MS && (!best || distance < Math.abs(Date.parse(best.at) - time)) ? current : best;
				}, undefined);
				if (!reading) return { value: "" };
				const value =
					parameter === "bp" && reading.diastolic != null
						? `${reading.value}/${reading.diastolic}`
						: parameter === "spo2"
							? `${reading.value}%`
							: `${reading.value}`;
				return { value, abnormal: outside(item, reading.value) };
			});
			return [
				{
					label,
					cells: monitor
						? [
								...cells,
								{
									value: live[parameter]?.value ?? "",
									abnormal: live[parameter] ? outside(item, live[parameter].number) : undefined,
								},
							]
						: cells,
				},
			];
		}),
	};
}

const DAY_MS = 24 * 3_600_000;

/** The chart sections a note can fill, read from the patient's record now. A section the record has nothing for is left out. */
function readNoteChart(record: PatientRecord, monitor?: MonitorVitals): NoteChart {
	const asOf = new Date().toISOString();
	const chart: NoteChart = {};

	const table = record.vitals ? vitalsTable(record.vitals.series, monitor) : undefined;
	if (table)
		chart.vitals = {
			source: monitor ? "Flowsheet and monitor" : "Flowsheet",
			asOf,
			table,
		};

	if (record.fluids) {
		const { netBalance, weightChange, window, chartedBy } = record.fluids;
		chart.io = {
			source: chartedBy ? `Charted by ${chartedBy}` : "Flowsheet",
			asOf,
			lines: [`Net balance ${netBalance} over ${window}`, `Weight change ${weightChange}`],
		};
	}

	if (record.medications) {
		const { continuous, scheduled, prn } = record.medications;
		chart.medications = {
			source: "MAR",
			asOf,
			lines: [
				...continuous.map((item) => `${item.drug} ${item.pumpRate ?? "rate unavailable"}`),
				...scheduled.map((item) => `${item.drug} ${item.dose} ${item.route} ${item.frequency.toLowerCase()}`),
				...prn.map((item) => `${item.drug} ${item.dose} ${item.route} as needed, ${item.givenLast24h} in 24 h`),
			],
		};
	}

	if (record.chart?.homeMedications.length) {
		chart["home-medications"] = {
			source: record.chart.source,
			asOf,
			lines: record.chart.homeMedications.map((item) => `${item.name} ${item.dose}`),
		};
	}

	const allergies = record.chart?.allergies;
	if (allergies || record.allergies) {
		chart.allergies = {
			source: record.chart?.source ?? "Hospital record",
			asOf,
			lines: allergies
				? allergies.length
					? allergies.map((item) =>
							[item.substance, [item.reaction, item.severity].filter(Boolean).join(", ")].filter(Boolean).join(": "),
						)
					: ["No known allergies"]
				: record.allergies?.length
					? record.allergies
					: ["No known allergies"],
		};
	}

	if (record.chart) {
		const { medicalHistory, surgicalHistory, socialHistory, source } = record.chart;
		const names = (items: { name: string; detail?: string }[]) =>
			items.map((item) => (item.detail ? `${item.name} (${item.detail})` : item.name)).join(", ");
		chart.history = {
			source,
			asOf,
			lines: [
				`Medical: ${medicalHistory.length ? names(medicalHistory) : "none recorded"}`,
				`Surgical: ${surgicalHistory.length ? names(surgicalHistory) : "none recorded"}`,
				`Social: ${socialHistory.length ? socialHistory.join("; ") : "none recorded"}`,
			],
		};
	}

	if (record.infusions) {
		chart.drips = {
			source: "Pump",
			asOf,
			lines: record.infusions.length
				? record.infusions.map((item) =>
						[
							`${item.drug} ${item.rate ?? "rate unavailable"}`,
							item.change
								? `${item.change.direction === "up" ? "up" : "down"} from ${item.change.from} at ${timeLabel(item.change.at)}`
								: "",
						]
							.filter(Boolean)
							.join(", "),
					)
				: ["No infusions running"],
		};
	}

	if (record.ventilator) {
		const { support, mode, settings, abg, source } = record.ventilator;
		chart.oxygen = {
			source,
			asOf,
			lines: [
				[support, mode].filter(Boolean).join(" · "),
				settings.map((item) => `${item.label} ${item.set ?? item.value}${item.unit ? ` ${item.unit}` : ""}`).join(" · "),
				...(abg ? [`ABG ${timeLabel(abg.collectedAt)}: ${abg.values}`] : []),
			].filter(Boolean),
		};
	}

	// The last 24 h of results, one line per panel, out-of-range values marked.
	const panels = record.chart?.panels
		.map((panel) => ({
			name: panel.name,
			results: panel.results.filter(
				(result) => result.value && result.resultedAt && Date.now() - Date.parse(result.resultedAt) <= DAY_MS,
			),
		}))
		.filter((panel) => panel.results.length);
	if (panels?.length) {
		const flag = { high: "H", low: "L", critical: "C" } as const;
		chart.labs = {
			source: record.chart?.source ?? "Lab",
			asOf,
			lines: panels.map(
				(panel) =>
					`${panel.name}: ${panel.results
						.map((result) => `${result.name} ${result.value}${result.flag ? ` (${flag[result.flag]})` : ""}`)
						.join(", ")}`,
			),
		};
	}

	return chart;
}

/** Video consult minutes logged for the patient today, from the activity's ended consults. */
function loggedConsultMinutes(record: PatientRecord): number | undefined {
	const midnight = new Date();
	midnight.setHours(0, 0, 0, 0);
	const total = (record.activity ?? [])
		.filter((item) => item.kind === "consult" && item.durationMs && Date.parse(item.at) >= midnight.getTime())
		.reduce((sum, item) => sum + (item.durationMs ?? 0), 0);
	return total ? Math.max(1, Math.round(total / 60_000)) : undefined;
}

/**
 * Everything a new note needs from the patient's page: the author (the care team's signed-in clinician), the chart, the
 * AI drafts (the brief as the summary, the pathway in force as the plan), the day's consult minutes and the bedside nurse.
 * Null without a signed-in clinician on the care team.
 */
function noteContextFrom(record: PatientRecord, monitor?: MonitorVitals): NoteContext | null {
	const you = record.careTeam?.find((member) => member.you);
	if (!you) return null;
	const nurse = record.careTeam?.find((member) => member.role === "Bedside nurse");
	const pathway = record.carePlan?.pathway;
	return {
		author: { name: you.name, role: you.role },
		readChart: () => readNoteChart(record, monitor),
		ai: {
			summary: record.brief?.text,
			plan:
				pathway && pathway.status !== "declined"
					? `${pathway.title}: ${pathway.orders.map((order) => `${order.name} ${order.dose}`).join("; ")}.${pathway.cosigner ? ` Sent for co-signature by ${pathway.cosigner}.` : ""}`
					: undefined,
		},
		loggedMinutes: loggedConsultMinutes(record),
		participants: nurse ? [`${nurse.name}, RN`] : [],
	};
}

export {
	noteContextFrom,
	readNoteChart,
	type NoteAuthor,
	type NoteChart,
	type NoteChartBlock,
	type NoteChartTable,
	type NoteContext,
};
