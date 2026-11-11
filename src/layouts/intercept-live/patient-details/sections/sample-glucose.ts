import type { PatientTimeline, TimelineLane } from "./timeline-section";
import type { PatientVitals, VitalSeries } from "./vitals-section";

// Synthetic data (PRD Patient details PD-150): each patient's blood glucose, on the Timeline tab's latest values and as
// a lane on its chart (Nov 11, 2026, the clinical advisor's request). Fingerstick (point-of-care) checks charted by the
// bedside nurse: every hour on an insulin infusion (Miller), every 6 h for an ICU or diabetic patient, every 12 h on the
// floor, from admission. Values follow each record: diabetics run higher, Carter's steroids push hers over 180, Clark
// and Hayes drift up. Whitfield and Norman already have their lab glucose on the Timeline, so their tile reads it
// (`withGlucose`).

type GlucoseSpec = {
	/** Hours between checks. */
	every: number;
	/** First and last value; the checks between follow a line with a small deterministic wobble. */
	range: [number, number];
	/** Minutes since the last check. */
	last: number;
};

const glucose: Record<string, GlucoseSpec> = {
	p1: { every: 1, range: [212, 168], last: 18 },
	p2: { every: 6, range: [152, 142], last: 74 },
	p3: { every: 6, range: [134, 118], last: 130 },
	p4: { every: 6, range: [190, 164], last: 96 },
	p5: { every: 6, range: [148, 186], last: 52 },
	p6: { every: 6, range: [112, 108], last: 210 },
	p7: { every: 6, range: [126, 116], last: 165 },
	p8: { every: 6, range: [98, 104], last: 240 },
	p9: { every: 6, range: [140, 158], last: 41 },
	p10: { every: 6, range: [198, 172], last: 88 },
	p11: { every: 6, range: [168, 188], last: 63 },
	p13: { every: 6, range: [146, 136], last: 112 },
	p14: { every: 6, range: [122, 112], last: 47 },
	p15: { every: 6, range: [158, 176], last: 140 },
	p16: { every: 12, range: [106, 110], last: 300 },
	p19: { every: 6, range: [188, 164], last: 70 },
	p20: { every: 6, range: [176, 150], last: 205 },
	p17: { every: 6, range: [128, 138], last: 33 },
	p22: { every: 12, range: [114, 106], last: 380 },
	p25: { every: 12, range: [110, 102], last: 420 },
	p26: { every: 12, range: [116, 124], last: 260 },
	p27: { every: 6, range: [144, 128], last: 150 },
	p28: { every: 12, range: [104, 98], last: 330 },
	p29: { every: 6, range: [142, 142], last: 150 },
	// The scenario patients, from arrival.
	p21: { every: 6, range: [132, 132], last: 30 },
};

const LIMITS: [number, number] = [70, 180];

/** The patient's fingerstick glucose over the last 24 h, from admission when that's more recent. */
function fingerstickSeries(spec: GlucoseSpec, nurse: string, admittedAt?: string): VitalSeries {
	const now = Date.now();
	const since = Math.max(now - 24 * 3_600_000, admittedAt ? Date.parse(admittedAt) : 0);
	const times: number[] = [];
	for (let at = now - spec.last * 60_000; at >= since; at -= spec.every * 3_600_000) times.unshift(at);
	const [start, end] = spec.range;
	return {
		parameter: "glucose",
		source: `Fingerstick · ${nurse}`,
		limits: LIMITS,
		staleAfterMinutes: spec.every * 60 + 30,
		chartedEveryMinutes: spec.every * 60,
		readings: times.map((at, index) => {
			const progress = times.length === 1 ? 1 : index / (times.length - 1);
			const wobble = index === times.length - 1 ? 0 : Math.sin(index * 1.7 + start) * 6;
			return { at: new Date(at).toISOString(), value: Math.round(start + (end - start) * progress + wobble) };
		}),
	};
}

/**
 * Adds glucose to a patient's latest values and Timeline. A Timeline that already has a Glucose lane (lab glucose)
 * gives the tile its readings; otherwise the fingerstick checks give both the tile and a lane among the labs.
 */
function withGlucose(
	patientId: string,
	{ vitals, timeline, admittedAt }: { vitals?: PatientVitals; timeline?: PatientTimeline; admittedAt?: string },
): { vitals?: PatientVitals; timeline?: PatientTimeline } {
	if (vitals?.series.some((series) => series.parameter === "glucose")) return { vitals, timeline };
	const labLane = timeline?.lanes.find((lane) => lane.label === "Glucose");
	if (labLane) {
		const readings = labLane.points.flatMap((point) => (point.value === null ? [] : [{ at: point.at, value: point.value }]));
		const gaps = readings.slice(1).map((reading, index) => Date.parse(reading.at) - Date.parse(readings[index].at));
		const every = gaps.length ? Math.round(Math.min(...gaps) / 60_000) : 360;
		const series: VitalSeries = {
			parameter: "glucose",
			source: labLane.source,
			limits: LIMITS,
			staleAfterMinutes: every + 30,
			chartedEveryMinutes: every,
			readings,
		};
		return { vitals: vitals ? { series: [...vitals.series, series] } : vitals, timeline };
	}
	const spec = glucose[patientId];
	if (!spec || !vitals) return { vitals, timeline };
	// Charted by the nurse who charts the temperature.
	const nurse = vitals.series.find((item) => item.parameter === "temp")?.source.replace(/^Manual · /, "") ?? "Bedside RN";
	const series = fingerstickSeries(spec, nurse, admittedAt);
	const lane: TimelineLane = {
		id: "glucose",
		group: "labs",
		label: "Glucose",
		unit: "mg/dL",
		kind: "dots",
		color: "lab-2",
		source: "Fingerstick",
		limits: { low: LIMITS[0], high: LIMITS[1] },
		staleAfterMinutes: series.staleAfterMinutes,
		showValues: true,
		points: series.readings.map((reading) => ({ at: reading.at, value: reading.value })),
	};
	return {
		vitals: { series: [...vitals.series, series] },
		timeline: timeline ? { ...timeline, lanes: [...timeline.lanes, lane] } : timeline,
	};
}

export { withGlucose };
