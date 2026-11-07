import type { PatientTimeline, TimelineEventKind, TimelineLane, TimelineLaneColor, TimelinePoint } from "./timeline-section";

// Synthetic data (PRD Patient details PD-150): each Census patient's last 24 hours (less when the stay is shorter),
// telling the same story as their record's brief and alerts and ending at their live values on Monitoring. Lanes follow
// what the patient has: Ventilator only when ventilated, Oxygen when on charted oxygen, Pump for their infusions, Labs
// from their key labs. A parameter that stopped reporting is drawn as a gap, never interpolated (PD-031). Curves are
// deterministic, so every session reads the same.
//
// Sarah Miller (`p1`), the reference patient: MAP drifts down from 74 to 58 as norepinephrine goes 0.08 → 0.12 → 0.15
// → 0.22; FiO₂ and PEEP go up 2 h ago (FiO₂ 40 → 60%), SpO₂ recovers to 94 and falls back to 89; lactate 2.2 → 4.1; temperature
// 38.9 °C is 92 min old (stale). The SpO₂ probe was off for 20 min.

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

/** A small deterministic wobble, so curves look measured rather than drawn. */
const wobble = (minute: number, seed: number) => Math.sin(minute / 37 + seed) * 0.6 + Math.sin(minute / 11 + seed * 2) * 0.4;

/** Every 5 min over the last 24 h, oldest first. */
const monitorMinutes = Array.from({ length: 24 * 12 + 1 }, (_, index) => 24 * 60 - index * 5);

const heartRate: TimelinePoint[] = monitorMinutes.map((minute) => ({
	at: minutesAgo(minute),
	value: Math.round(104 + 24 * (1 - minute / 1440) ** 1.5 + (minute ? wobble(minute, 1) * 2 : 0)),
}));

/** MAP with its systolic–diastolic band: MAP = (systolic + 2 × diastolic) / 3. */
const meanArterialPressure: TimelinePoint[] = monitorMinutes.map((minute) => {
	const trend = minute > 420 ? 74 - (4 * (1440 - minute)) / 1020 : 70 - (12 * (420 - minute)) / 420;
	const map = Math.round(trend + (minute ? wobble(minute, 3) * 1.5 : 0));
	const systolic = Math.round(map * 1.41);
	return { at: minutesAgo(minute), value: map, high: systolic, low: Math.round((3 * map - systolic) / 2) };
});

const oxygenSaturation: TimelinePoint[] = monitorMinutes.map((minute) => {
	// The probe was off from 95 to 75 min ago.
	if (minute < 95 && minute > 75) return { at: minutesAgo(minute), value: null };
	const trend =
		minute > 118 ? 96 - (4 * (1440 - minute)) / 1322 : minute > 100 ? 92 + (2 * (118 - minute)) / 18 : 94 - (5 * (100 - minute)) / 100;
	return { at: minutesAgo(minute), value: Math.round(trend + (minute ? wobble(minute, 5) * 0.8 : 0)) };
});

const millerTimeline: PatientTimeline = {
	lanes: [
		{
			id: "hr",
			group: "monitor",
			label: "HR",
			unit: "bpm",
			kind: "line",
			color: "heart",
			source: "Monitor",
			limits: { low: 50, high: 120 },
			points: heartRate,
		},
		{
			id: "map",
			group: "monitor",
			label: "MAP",
			unit: "mmHg",
			kind: "band",
			color: "pressure",
			source: "Monitor",
			limits: { low: 65 },
			points: meanArterialPressure,
		},
		{
			id: "spo2",
			group: "monitor",
			label: "SpO₂",
			unit: "%",
			kind: "line",
			color: "oxygen",
			source: "Monitor",
			limits: { low: 90 },
			points: oxygenSaturation,
		},
		{
			id: "temp",
			group: "monitor",
			label: "Temp",
			unit: "°C",
			kind: "dots",
			color: "temperature",
			source: "Monitor",
			limits: { high: 38 },
			staleAfterMinutes: 60,
			points: [
				{ at: minutesAgo(1380), value: 37.4 },
				{ at: minutesAgo(1140), value: 37.6 },
				{ at: minutesAgo(900), value: 37.9 },
				{ at: minutesAgo(660), value: 38.2 },
				{ at: minutesAgo(420), value: 38.4 },
				{ at: minutesAgo(92), value: 38.9 },
			],
		},
		{
			id: "norepinephrine",
			group: "pump",
			label: "Norepinephrine",
			unit: "mcg/kg/min",
			kind: "step",
			color: "infusion",
			source: "Pump",
			points: [
				{ at: minutesAgo(1440), value: 0.08 },
				{ at: minutesAgo(420), value: 0.12 },
				{ at: minutesAgo(175), value: 0.15 },
				{ at: minutesAgo(40), value: 0.22 },
				{ at: minutesAgo(1), value: 0.22 },
			],
		},
		{
			id: "propofol",
			group: "pump",
			label: "Propofol",
			unit: "mcg/kg/min",
			kind: "step",
			color: "sedation",
			source: "Pump",
			points: [
				{ at: minutesAgo(1440), value: 40 },
				{ at: minutesAgo(130), value: 30 },
				{ at: minutesAgo(1), value: 30 },
			],
		},
		{
			id: "fio2",
			group: "ventilator",
			label: "FiO₂",
			unit: "%",
			kind: "step",
			color: "fio2",
			source: "Ventilator",
			points: [
				{ at: minutesAgo(1440), value: 40 },
				{ at: minutesAgo(118), value: 60 },
				{ at: minutesAgo(2), value: 60 },
			],
		},
		{
			id: "peep",
			group: "ventilator",
			label: "PEEP",
			unit: "cmH₂O",
			kind: "step",
			color: "peep",
			source: "Ventilator",
			points: [
				{ at: minutesAgo(1440), value: 8 },
				{ at: minutesAgo(118), value: 10 },
				{ at: minutesAgo(2), value: 10 },
			],
		},
		{
			id: "lactate",
			group: "labs",
			label: "Lactate",
			unit: "mmol/L",
			kind: "dots",
			color: "lab",
			source: "Lab",
			limits: { high: 2 },
			showValues: true,
			points: [
				{ at: minutesAgo(1300), value: 1.8 },
				{ at: minutesAgo(330), value: 2.2 },
				{ at: minutesAgo(35), value: 4.1 },
			],
		},
		{
			id: "creatinine",
			group: "labs",
			label: "Creatinine",
			unit: "mg/dL",
			kind: "dots",
			color: "lab-2",
			source: "Lab",
			limits: { high: 1.2 },
			showValues: true,
			points: [
				{ at: minutesAgo(1520), value: 1.4 },
				{ at: minutesAgo(95), value: 1.9 },
			],
		},
	],
	events: [
		{ id: "e1", at: minutesAgo(1300), kind: "lab", label: "Lactate 1.8 mmol/L resulted" },
		{ id: "e2", at: minutesAgo(960), kind: "note", label: "Progress note signed · Laura Mitchell" },
		{ id: "e3", at: minutesAgo(720), kind: "care", label: "Turned and repositioned · Kelly Ortiz" },
		{ id: "e4", at: minutesAgo(420), kind: "drip", label: "Norepinephrine 0.08 → 0.12 mcg/kg/min" },
		{ id: "e5", at: minutesAgo(330), kind: "lab", label: "Lactate 2.2 mmol/L resulted" },
		{ id: "e6", at: minutesAgo(260), kind: "care", label: "Suctioned, thick secretions · Kelly Ortiz" },
		{ id: "e8", at: minutesAgo(175), kind: "drip", label: "Norepinephrine 0.12 → 0.15 mcg/kg/min" },
		{ id: "e9", at: minutesAgo(130), kind: "drip", label: "Propofol 40 → 30 mcg/kg/min" },
		{ id: "e10", at: minutesAgo(120), kind: "care", label: "Blood cultures ×2 drawn" },
		{ id: "e7", at: minutesAgo(118), kind: "ventilator", label: "FiO₂ 40 → 60%, PEEP 8 → 10 cmH₂O" },
		{ id: "e11", at: minutesAgo(95), kind: "lab", label: "WBC 17.2 K/µL, creatinine 1.9 mg/dL resulted" },
		{ id: "e12", at: minutesAgo(85), kind: "care", label: "SpO₂ probe repositioned" },
		{ id: "e13", at: minutesAgo(40), kind: "drip", label: "Norepinephrine 0.15 → 0.22 mcg/kg/min" },
		{ id: "e14", at: minutesAgo(35), kind: "lab", label: "Lactate 4.1 mmol/L resulted" },
		{ id: "e17", at: minutesAgo(2), kind: "alert", label: "Sepsis candidate · Sepsis Sniffer" },
	],
};

/* -------------------------------------------------------------------------- */
/* Builders for the other patients                                            */
/* -------------------------------------------------------------------------- */

/** Key values as [minutes ago, value], oldest first. */
type Keys = [minutes: number, value: number][];

/** A stretch with no data, as [from, to] minutes ago (`to` 0: still missing now). */
type Gap = [from: number, to: number];

/** The value at a minute, read along straight lines between the keys. */
function along(keys: Keys, minute: number) {
	if (minute >= keys[0][0]) return keys[0][1];
	for (let index = 1; index < keys.length; index++) {
		const [fromMinute, fromValue] = keys[index - 1];
		const [toMinute, toValue] = keys[index];
		if (minute >= toMinute) return fromValue + ((toValue - fromValue) * (fromMinute - minute)) / (fromMinute - toMinute);
	}
	return keys[keys.length - 1][1];
}

/** Every 5 min over `span` minutes, oldest first. */
const minutesOver = (span: number) => Array.from({ length: Math.floor(span / 5) + 1 }, (_, index) => span - index * 5);

/** A drifting series through the keys, with a wobble of `noise`, ending exactly on the last key. */
function drift(keys: Keys, { span, seed, noise, gaps = [] }: { span: number; seed: number; noise: number; gaps?: Gap[] }): TimelinePoint[] {
	return minutesOver(span).map((minute) => ({
		at: minutesAgo(minute),
		value: gaps.some(([from, to]) => minute < from && minute >= to)
			? null
			: Math.round(along(keys, minute) + (minute ? wobble(minute, seed) * noise : 0)),
	}));
}

/** Steps from each change, held to a minute ago. */
const steps = (changes: Keys): TimelinePoint[] => [
	...changes.map(([minute, value]) => ({ at: minutesAgo(minute), value })),
	{ at: minutesAgo(1), value: changes[changes.length - 1][1] },
];

const dots = (readings: Keys): TimelinePoint[] => readings.map(([minute, value]) => ({ at: minutesAgo(minute), value }));

const laneId = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, "-");

/** Enough decimals for every value: none for whole numbers, one otherwise. */
const decimalsFor = (keys: Keys) => (keys.some(([, value]) => value % 1 !== 0) ? 1 : 0);

const pump = (label: string, unit: string, changes: Keys, color: TimelineLaneColor = "infusion"): TimelineLane => ({
	id: laneId(label),
	group: "pump",
	label,
	unit,
	kind: "step",
	color,
	source: "Pump",
	// Weight-based vasoactive doses read to two places (0.08, 0.10).
	decimals: unit === "mcg/kg/min" && changes.some(([, value]) => value < 1) ? 2 : decimalsFor(changes),
	points: steps(changes),
});

const ventilator = (label: string, unit: string, changes: Keys, color: TimelineLaneColor): TimelineLane => ({
	id: laneId(label),
	group: "ventilator",
	label,
	unit,
	kind: "step",
	color,
	source: "Ventilator",
	decimals: decimalsFor(changes),
	points: steps(changes),
});

/** Nasal cannula flow, charted by the bedside nurse. */
const oxygenFlow = (changes: Keys): TimelineLane => ({
	id: "o2-flow",
	group: "oxygen",
	label: "O₂ flow",
	unit: "L/min",
	kind: "step",
	color: "fio2",
	source: "Nursing flowsheet",
	points: steps(changes),
});

const labLane = (label: string, unit: string, results: Keys, limits: TimelineLane["limits"], color: TimelineLaneColor = "lab"): TimelineLane => ({
	id: laneId(label),
	group: "labs",
	label,
	unit,
	kind: "dots",
	color,
	source: "Lab",
	limits,
	showValues: true,
	decimals: decimalsFor(results),
	points: dots(results),
});

type PatientSpec = {
	/** Minutes of data: 24 h, or the stay so far. */
	span?: number;
	/** Sets each curve's wobble apart from the other patients'. */
	seed: number;
	hr: Keys;
	map: Keys;
	/** Current systolic and diastolic. Earlier readings keep the same ratio to MAP. */
	bp: [systolic: number, diastolic: number];
	mapLimits?: TimelineLane["limits"];
	spo2: Keys;
	rr: Keys;
	gaps?: { spo2?: Gap[]; rr?: Gap[] };
	temp: Keys;
	/** Pump, ventilator, oxygen, support and lab lanes, in that order. */
	lanes: TimelineLane[];
	events: [minutes: number, kind: TimelineEventKind, label: string][];
};

/** A patient's timeline: the monitor lanes from their curves, then their own lanes and events. */
function timeline({ span = 1440, seed, hr, map, bp, mapLimits, spo2, rr, gaps = {}, temp, lanes, events }: PatientSpec): PatientTimeline {
	const ratio = bp[0] / map[map.length - 1][1];
	const mapPoints = drift(map, { span, seed: seed + 1, noise: 1.5 }).map((point, index, all) => {
		if (point.value === null) return point;
		if (index === all.length - 1) return { ...point, high: bp[0], low: bp[1] };
		const systolic = Math.round(point.value * ratio);
		return { ...point, high: systolic, low: Math.round((3 * point.value - systolic) / 2) };
	});

	return {
		lanes: [
			{
				id: "hr",
				group: "monitor",
				label: "HR",
				unit: "bpm",
				kind: "line",
				color: "heart",
				source: "Monitor",
				limits: { low: 50, high: 120 },
				points: drift(hr, { span, seed, noise: 2 }),
			},
			{
				id: "map",
				group: "monitor",
				label: "MAP",
				unit: "mmHg",
				kind: "band",
				color: "pressure",
				source: "Monitor",
				limits: mapLimits ?? { low: 65 },
				points: mapPoints,
			},
			{
				id: "spo2",
				group: "monitor",
				label: "SpO₂",
				unit: "%",
				kind: "line",
				color: "oxygen",
				source: "Monitor",
				limits: { low: 90 },
				points: drift(spo2, { span, seed: seed + 2, noise: 0.8, gaps: gaps.spo2 }),
			},
			{
				id: "rr",
				group: "monitor",
				label: "RR",
				unit: "/min",
				kind: "line",
				color: "breathing",
				source: "Monitor",
				limits: { low: 8, high: 30 },
				points: drift(rr, { span, seed: seed + 3, noise: 1, gaps: gaps.rr }),
			},
			{
				id: "temp",
				group: "monitor",
				label: "Temp",
				unit: "°C",
				kind: "dots",
				color: "temperature",
				source: "Monitor",
				limits: { high: 38 },
				staleAfterMinutes: 60,
				decimals: 1,
				points: dots(temp),
			},
			...lanes,
		],
		events: events.map(([minute, kind, label], index) => ({ id: `e${index + 1}`, at: minutesAgo(minute), kind, label })),
	};
}

/* -------------------------------------------------------------------------- */
/* Patients                                                                   */
/* -------------------------------------------------------------------------- */

// Hayes: admitted 20 h ago with heart failure, on IV furosemide. Through the night HR creeps up and SpO₂ dips twice,
// each time back to 92–93% as her oxygen goes 2 → 3 → 4 L. BNP 1,850 → 2,400 and creatinine 1.6 → 1.9 on the repeat
// Dr. Weller ordered. At Scenario 1's early warning (`earlyWarning`), the last hour has RR 20 → 26, SpO₂ 89% and HR
// 112, so her NEWS2 jumps from 5 to 10 (`sample-vitals.ts`); before it, that hour holds.
function hayesTimeline(stage: "before" | "alert" | "resolved"): PatientTimeline {
	// The latest readings: holding before the scenario, the alert's at 01:40, and by 06:00 the alert's a few minutes back
	// (the prototype's night passes in seconds) and the recovery now.
	const latest = (before: number, alert: number, resolved: number): [number, number][] =>
		stage === "before" ? [[0, before]] : stage === "alert" ? [[0, alert]] : [[3, alert], [0, resolved]];
	return timeline({
		span: 1200,
		seed: 141,
		hr: [[1200, 92], [600, 98], [240, 104], [60, 106], ...latest(106, 112, 88)],
		map: [[1200, 100], ...latest(106, 107, 92)],
		bp: stage === "resolved" ? [128, 74] : stage === "alert" ? [148, 86] : [147, 85],
		spo2: [[1200, 94], [840, 94], [780, 93], [310, 93], [300, 90], [290, 93], [160, 92], [150, 89], [140, 92], [60, 92], ...latest(92, 89, 95)],
		rr: [[1200, 18], [600, 19], [300, 20], [60, 20], ...latest(20, 26, 20)],
		temp: [[1000, 36.7], [760, 36.8], [520, 36.6], [280, 36.7], [40, 36.8]],
		lanes: [
			oxygenFlow([[1200, 2], [300, 3], [150, 4], ...(stage === "resolved" ? ([[1, 2]] as [number, number][]) : [])]),
			labLane("BNP", "pg/mL", [[1180, 1850], [75, 2400]], { high: 100 }),
			labLane("Creatinine", "mg/dL", [[1180, 1.6], [75, 1.9]], { high: 1.0 }, "lab-2"),
		],
		events: [
			[1180, "lab", "BNP 1,850 pg/mL, creatinine 1.6 mg/dL resulted"],
			[1120, "care", "Furosemide 80 mg IV"],
			[1100, "note", "History and physical signed"],
			[400, "care", "Furosemide 80 mg IV"],
			[300, "care", "Oxygen 2 → 3 L/min for SpO₂ 90%"],
			[150, "care", "Oxygen 3 → 4 L/min for SpO₂ 89%"],
			[140, "note", "Dr. Weller called: repeat BMP and BNP"],
			[120, "care", "BMP and BNP drawn"],
			[75, "lab", "BNP 2,400 pg/mL, creatinine 1.9 mg/dL resulted"],
			[25, "note", "Nursing note: net +1.8 L, weight up 2.1 kg in 48 h"],
		],
	});
}

/**
 * Dale Reynolds (Scenario 2), in the ED since 40 min before the consult: 2 L by nasal cannula, then BiPAP 20 min ago
 * after a blood gas of pH 7.24 and PaCO₂ 78. By the resolution (2 h on NIV, a few minutes back here, as the night passes
 * in seconds) the repeat gas is pH 7.31 and PaCO₂ 64.
 */
function reynoldsTimeline(stage: "alert" | "resolved"): PatientTimeline {
	const resolved = stage === "resolved";
	const latest = (alert: number, recovered: number): [number, number][] =>
		resolved ? [[3, alert], [0, recovered]] : [[0, alert]];
	const after = (...keys: [number, number][]): [number, number][] => (resolved ? keys : []);
	return timeline({
		span: 45,
		seed: 211,
		hr: [[45, 104], [20, 110], ...latest(112, 96)],
		map: [[45, 107], ...latest(111, 101)],
		bp: resolved ? [138, 82] : [156, 88],
		spo2: [[45, 86], [25, 85], [20, 87], ...latest(88, 91)],
		rr: [[45, 26], [20, 28], ...latest(30, 21)],
		temp: [[35, 37.4], ...after([1, 37.2])],
		lanes: [
			ventilator("FiO₂", "%", [[20, 35], ...after([1, 30])], "fio2"),
			ventilator("IPAP", "cmH₂O", [[20, 12], ...after([1, 14])], "peep"),
			oxygenFlow([[45, 2], [20, 0]]),
			labLane("PaCO₂", "mmHg", [[30, 78], ...after([2, 64])], { high: 45 }),
			labLane("pH", "", [[30, 7.24], ...after([2, 7.31])], { low: 7.35 }, "lab-2"),
		],
		events: [
			[45, "care", "Arrived by ambulance on 2 L, SpO₂ 86%"],
			[40, "note", "ED triage: severe COPD, out of home oxygen for 4 days"],
			[35, "care", "Ipratropium-albuterol nebulizer"],
			[30, "lab", "ABG: pH 7.24 · PaCO₂ 78 · PaO₂ 58 · HCO₃ 33"],
			[28, "note", "Chest X-ray: hyperinflation, no pneumothorax or consolidation"],
			[25, "care", "Methylprednisolone 40 mg IV"],
			[20, "ventilator", "BiPAP started: IPAP 12, EPAP 5, FiO₂ 35%"],
			...(resolved
				? ([
						[2, "lab", "ABG: pH 7.31 · PaCO₂ 64 · PaO₂ 66"],
						[1, "ventilator", "IPAP 12 → 14 cmH₂O, FiO₂ 35 → 30%"],
					] as PatientSpec["events"])
				: []),
		],
	});
}

const sampleTimelineByPatient: Record<string, PatientTimeline> = {
	p1: millerTimeline,

	// Johnson: severe ARDS from influenza. FiO₂ and PEEP went up as SpO₂ fell; it has sat at 82–86% for 20 min on FiO₂
	// 80% and PEEP 14. Steady pressure, no pressors.
	p2: timeline({
		seed: 11,
		hr: [[1440, 102], [240, 108], [60, 114], [0, 118]],
		map: [[1440, 76], [0, 72]],
		bp: [104, 56],
		spo2: [[1440, 93], [300, 89], [230, 91], [100, 88], [25, 85], [0, 84]],
		rr: [[1440, 24], [240, 26], [0, 28]],
		temp: [[1320, 38.4], [1080, 38.1], [840, 38.3], [600, 38.0], [360, 38.4], [40, 38.6]],
		lanes: [
			pump("Propofol", "mcg/kg/min", [[1440, 40]], "sedation"),
			pump("Fentanyl", "mcg/h", [[1440, 75], [150, 100]], "sedation"),
			pump("Cisatracurium", "mcg/kg/min", [[1440, 3]], "other"),
			ventilator("FiO₂", "%", [[1440, 60], [240, 70], [90, 80]], "fio2"),
			ventilator("PEEP", "cmH₂O", [[1440, 12], [240, 14]], "peep"),
			labLane("Lactate", "mmol/L", [[420, 1.5], [45, 1.8]], { high: 2 }),
			labLane("WBC", "K/µL", [[1620, 12.9], [180, 11.4]], { high: 11 }, "lab-2"),
		],
		events: [
			[960, "note", "Progress note signed"],
			[420, "lab", "Lactate 1.5 mmol/L resulted"],
			[300, "care", "Suctioned, thick secretions"],
			[240, "ventilator", "FiO₂ 60 → 70%, PEEP 12 → 14 cmH₂O"],
			[180, "lab", "WBC 11.4 K/µL, procalcitonin 0.4 ng/mL resulted"],
			[150, "drip", "Fentanyl 75 → 100 mcg/h"],
			[90, "ventilator", "FiO₂ 70 → 80%"],
			[45, "lab", "ABG: PaO₂ 62, PaCO₂ 58 · P/F 78"],
			[9, "alert", "SpO₂ below 88% for 5 min · Low"],
		],
	}),

	// Davis: septic shock from an E. coli UTI, day 3 of ceftriaxone. Steady overnight: norepinephrine weaned to 0.08,
	// lactate cleared to 1.6, WBC down from 18 to 14.1.
	p3: timeline({
		seed: 21,
		hr: [[1440, 106], [600, 99], [0, 94]],
		map: [[1440, 64], [600, 66], [0, 68]],
		bp: [98, 53],
		spo2: [[1440, 94], [0, 93]],
		rr: [[1440, 20], [0, 18]],
		temp: [[1320, 38.3], [1080, 38.0], [840, 37.8], [600, 37.6], [360, 37.5], [45, 37.4]],
		lanes: [
			pump("Norepinephrine", "mcg/kg/min", [[1440, 0.14], [900, 0.12], [520, 0.1], [210, 0.08]]),
			pump("Propofol", "mcg/kg/min", [[1440, 20], [700, 15]], "sedation"),
			pump("Fentanyl", "mcg/h", [[1440, 25]], "sedation"),
			ventilator("FiO₂", "%", [[1440, 45], [800, 40]], "fio2"),
			ventilator("PEEP", "cmH₂O", [[1440, 8]], "peep"),
			labLane("Lactate", "mmol/L", [[1380, 3.1], [430, 2.4], [70, 1.6]], { high: 2 }),
			labLane("WBC", "K/µL", [[1700, 18], [260, 14.1]], { high: 11 }, "lab-2"),
		],
		events: [
			[1380, "lab", "Lactate 3.1 mmol/L resulted"],
			[900, "drip", "Norepinephrine 0.14 → 0.12 mcg/kg/min"],
			[800, "ventilator", "FiO₂ 45 → 40%"],
			[700, "drip", "Propofol 20 → 15 mcg/kg/min"],
			[600, "care", "Ceftriaxone 2 g IV given, day 3"],
			[520, "drip", "Norepinephrine 0.12 → 0.10 mcg/kg/min"],
			[430, "lab", "Lactate 2.4 mmol/L resulted"],
			[260, "lab", "WBC 14.1 K/µL, creatinine 2.4 mg/dL resulted"],
			[210, "drip", "Norepinephrine 0.10 → 0.08 mcg/kg/min"],
			[70, "lab", "Lactate 1.6 mmol/L resulted"],
		],
	}),

	// Thompson: cardiogenic shock after NSTEMI, DNR. Norepinephrine went up two steps in the last hour, 0.06 → 0.12,
	// with MAP holding at 66. Dobutamine unchanged; amiodarone stepped down after its load.
	p4: timeline({
		seed: 31,
		hr: [[1440, 82], [0, 88]],
		map: [[1440, 72], [120, 70], [55, 64], [0, 66]],
		bp: [96, 51],
		spo2: [[1440, 96], [0, 95]],
		rr: [[1440, 17], [0, 18]],
		temp: [[1320, 36.9], [1080, 37.0], [840, 37.1], [600, 36.9], [360, 37.0], [50, 37.0]],
		lanes: [
			pump("Norepinephrine", "mcg/kg/min", [[1440, 0.06], [50, 0.09], [28, 0.12]]),
			pump("Dobutamine", "mcg/kg/min", [[1440, 5]]),
			pump("Heparin", "units/h", [[1440, 1100]], "other"),
			pump("Amiodarone", "mg/min", [[1440, 1], [1080, 0.5]], "other"),
			oxygenFlow([[1440, 2], [200, 3]]),
			labLane("Lactate", "mmol/L", [[300, 1.7], [40, 2.3]], { high: 2 }),
			labLane("NT-proBNP", "pg/mL", [[1740, 5140], [300, 6820]], { high: 900 }, "lab-2"),
		],
		events: [
			[1380, "note", "Goals-of-care note signed: DNR"],
			[1080, "drip", "Amiodarone 1 → 0.5 mg/min after its load"],
			[300, "lab", "NT-proBNP 6,820 pg/mL, lactate 1.7 mmol/L resulted"],
			[200, "care", "Nasal cannula 2 → 3 L/min"],
			[50, "drip", "Norepinephrine 0.06 → 0.09 mcg/kg/min"],
			[40, "lab", "Lactate 2.3 mmol/L resulted"],
			[28, "drip", "Norepinephrine 0.09 → 0.12 mcg/kg/min"],
			[25, "care", "Troponin I drawn"],
		],
	}),

	// Carter: status asthmaticus, on BiPAP since last night. SpO₂ stopped reporting 14 min ago (a gap to now); PaCO₂ 52
	// on the last ABG and potassium down to 3.2 on continuous albuterol.
	p5: timeline({
		span: 1140,
		seed: 41,
		hr: [[1140, 124], [600, 110], [0, 102]],
		map: [[1140, 86], [0, 80]],
		bp: [112, 64],
		spo2: [[1140, 89], [900, 92], [0, 94]],
		rr: [[1140, 32], [600, 27], [0, 24]],
		gaps: { spo2: [[15, 0]] },
		temp: [[1080, 37.2], [840, 37.4], [600, 37.3], [360, 37.2], [60, 37.3]],
		lanes: [
			ventilator("FiO₂", "%", [[1140, 60], [600, 50], [240, 45]], "fio2"),
			ventilator("IPAP", "cmH₂O", [[1140, 12], [600, 14]], "peep"),
			ventilator("EPAP", "cmH₂O", [[1140, 6]], "lab-2"),
			labLane("Lactate", "mmol/L", [[600, 3.1], [110, 2.4]], { high: 2 }),
			labLane("Potassium", "mmol/L", [[1150, 3.9], [300, 3.2]], { low: 3.5 }, "lab-2"),
		],
		events: [
			[1130, "ventilator", "BiPAP started: IPAP 12, EPAP 6, FiO₂ 60%"],
			[1100, "care", "Continuous albuterol started"],
			[900, "care", "Magnesium 2 g IV given"],
			[600, "ventilator", "IPAP 12 → 14 cmH₂O, FiO₂ 60 → 50%"],
			[600, "lab", "Lactate 3.1 mmol/L resulted"],
			[300, "lab", "Potassium 3.2 mmol/L, magnesium 2.6 mg/dL resulted"],
			[240, "ventilator", "FiO₂ 50 → 45%"],
			[110, "lab", "ABG: pH 7.31, PaCO₂ 52 · lactate 2.4 mmol/L"],
		],
	}),

	// Anderson: day 2 after a left hip hemiarthroplasty, on room air. Confused overnight; the bed exit alarm went off 41
	// min ago. Hemoglobin 10.4 → 8.9, sodium 131.
	p6: timeline({
		seed: 51,
		hr: [[1440, 78], [600, 80], [0, 72]],
		map: [[1440, 88], [0, 85]],
		bp: [128, 64],
		spo2: [[1440, 96], [0, 97]],
		rr: [[1440, 16], [0, 14]],
		temp: [[1320, 37.8], [1080, 37.6], [840, 37.4], [600, 37.3], [360, 37.2], [70, 37.1]],
		lanes: [
			pump("Lactated Ringer's", "mL/h", [[1440, 75]], "fluid"),
			labLane("Hemoglobin", "g/dL", [[1650, 10.4], [210, 8.9]], { low: 10 }),
			labLane("Sodium", "mmol/L", [[1650, 134], [210, 131]], { low: 135 }, "lab-2"),
		],
		events: [
			[1200, "note", "Orthopedics post-op note signed"],
			[660, "care", "Confused, reoriented · CAM-ICU positive"],
			[480, "care", "Pulled at IV line, reinforced dressing"],
			[210, "lab", "Hemoglobin 8.9 g/dL, sodium 131 mmol/L resulted"],
			[41, "alert", "Bed exit alarm · Low"],
		],
	}),

	// Taylor: day 3 after a Hartmann's procedure, improving. Off oxygen since this morning; WBC 16.8 → 12.1, lactate
	// normal; MRSA in the wound swab.
	p7: timeline({
		seed: 61,
		hr: [[1440, 98], [600, 90], [0, 84]],
		map: [[1440, 76], [0, 82]],
		bp: [120, 63],
		spo2: [[1440, 95], [480, 94], [0, 96]],
		rr: [[1440, 19], [0, 16]],
		temp: [[1320, 38.1], [1080, 37.8], [840, 37.6], [600, 37.3], [360, 37.1], [90, 37.0]],
		lanes: [
			pump("Lactated Ringer's", "mL/h", [[1440, 150], [360, 100]], "fluid"),
			oxygenFlow([[1440, 2], [480, 0]]),
			labLane("WBC", "K/µL", [[1680, 16.8], [240, 12.1]], { high: 11 }),
			labLane("Lactate", "mmol/L", [[1680, 1.9], [240, 1.1]], { high: 2 }, "lab-2"),
		],
		events: [
			[1100, "note", "Surgery progress note signed"],
			[700, "note", "Wound swab: MRSA · contact isolation"],
			[480, "care", "Off oxygen, on room air"],
			[360, "drip", "Lactated Ringer's 150 → 100 mL/h"],
			[300, "care", "Up to the chair"],
			[240, "lab", "WBC 12.1 K/µL, lactate 1.1 mmol/L, CRP 88 mg/L resulted"],
		],
	}),

	// Wilson: upper GI bleed, the ulcer clipped at endoscopy yesterday. Hemoglobin 7.6 → 8.4 after one unit and has held;
	// HR settled after the transfusion. On a pantoprazole drip.
	p8: timeline({
		seed: 71,
		hr: [[1440, 98], [560, 94], [420, 82], [0, 76]],
		map: [[1440, 80], [560, 82], [420, 88], [0, 90]],
		bp: [128, 71],
		spo2: [[1440, 97], [0, 98]],
		rr: [[1440, 17], [0, 15]],
		temp: [[1320, 36.9], [1080, 37.0], [840, 37.1], [600, 36.8], [360, 36.9], [80, 37.0]],
		lanes: [
			pump("Pantoprazole", "mg/h", [[1440, 8]], "other"),
			labLane("Hemoglobin", "g/dL", [[1300, 7.9], [600, 7.6], [150, 8.4]], { low: 8 }),
			labLane("BUN", "mg/dL", [[1500, 46], [150, 38]], { high: 20 }, "lab-2"),
		],
		events: [
			[1300, "note", "Endoscopy report: duodenal ulcer clipped"],
			[1300, "lab", "Hemoglobin 7.9 g/dL resulted"],
			[600, "lab", "Hemoglobin 7.6 g/dL resulted"],
			[560, "care", "Red cells, 1 unit, started"],
			[240, "care", "No melena or hematemesis charted"],
			[150, "lab", "Hemoglobin 8.4 g/dL, BUN 38 mg/dL resulted"],
		],
	}),

	// Harris: aspiration pneumonia with sepsis. PEEP fell to 8 after a circuit change while the order is 10; Vent-Order
	// Mismatch flagged it 18 min ago. SpO₂ 91% on FiO₂ 50%; lactate 1.9 → 2.6.
	p9: timeline({
		seed: 81,
		hr: [[1440, 100], [400, 104], [0, 112]],
		map: [[1440, 72], [400, 69], [0, 64]],
		bp: [92, 50],
		spo2: [[1440, 94], [300, 92], [45, 93], [0, 91]],
		rr: [[1440, 21], [0, 26]],
		temp: [[1320, 38.0], [1080, 38.2], [840, 38.1], [600, 38.3], [360, 38.4], [60, 38.6]],
		lanes: [
			pump("Propofol", "mcg/kg/min", [[1440, 25]], "sedation"),
			pump("Fentanyl", "mcg/h", [[1440, 75]], "sedation"),
			ventilator("FiO₂", "%", [[1440, 40], [300, 50]], "fio2"),
			ventilator("PEEP", "cmH₂O", [[1440, 10], [45, 8]], "peep"),
			labLane("Lactate", "mmol/L", [[400, 1.9], [55, 2.6]], { high: 2 }),
			labLane("WBC", "K/µL", [[1540, 12.2], [160, 15.8]], { high: 11 }, "lab-2"),
		],
		events: [
			[1000, "note", "Admission note signed"],
			[400, "lab", "Lactate 1.9 mmol/L resulted"],
			[300, "ventilator", "FiO₂ 40 → 50%"],
			[160, "lab", "WBC 15.8 K/µL, procalcitonin 1.8 ng/mL resulted"],
			[150, "note", "Sepsis Sniffer started tracking"],
			[80, "lab", "ABG: pH 7.33, PaO₂ 64"],
			[55, "lab", "Lactate 2.6 mmol/L resulted"],
			[45, "care", "Ventilator circuit changed"],
			[45, "ventilator", "PEEP 10 → 8 cmH₂O, order is 10"],
		],
	}),

	// Moore: necrotizing soft tissue infection, back from debridement. CRRT paused for the OR; norepinephrine started at
	// 0.03 and doubled to 0.06 with MAP at 61. Lactate 2.2 → 3.0, potassium 5.4.
	p10: timeline({
		span: 1320,
		seed: 91,
		hr: [[1320, 92], [300, 96], [0, 98]],
		map: [[1320, 72], [420, 70], [300, 64], [150, 62], [0, 61]],
		bp: [88, 48],
		spo2: [[1320, 96], [0, 96]],
		rr: [[1320, 18], [0, 19]],
		temp: [[1260, 38.6], [1020, 38.9], [780, 38.7], [540, 38.4], [240, 38.3], [50, 38.2]],
		lanes: [
			pump("Norepinephrine", "mcg/kg/min", [[1320, 0], [280, 0.03], [140, 0.06]]),
			pump("CRRT citrate", "mL/h", [[1320, 180], [420, 0], [240, 180]], "other"),
			oxygenFlow([[1320, 2]]),
			labLane("Lactate", "mmol/L", [[420, 2.2], [60, 3.0]], { high: 2 }),
			labLane("Potassium", "mmol/L", [[1460, 5.9], [200, 5.4]], { high: 5 }, "lab-2"),
		],
		events: [
			[420, "care", "CRRT paused for the OR"],
			[420, "lab", "Lactate 2.2 mmol/L resulted"],
			[300, "care", "Back from the OR: left thigh debridement"],
			[280, "drip", "Norepinephrine started at 0.03 mcg/kg/min"],
			[240, "care", "CRRT restarted"],
			[200, "lab", "WBC 21.4 K/µL, potassium 5.4 mmol/L, CK 2,450 U/L resulted"],
			[150, "note", "Sepsis Sniffer started tracking"],
			[140, "drip", "Norepinephrine 0.03 → 0.06 mcg/kg/min"],
			[60, "lab", "Lactate 3.0 mmol/L resulted"],
		],
	}),

	// Clark: day 2 of a hypertensive emergency with PRES. Pressure climbed from 148/88 an hour ago to 162/96; nicardipine
	// went up to 7.5. Magnesium in range at 2.0; platelets 98, AST 142.
	p11: timeline({
		seed: 101,
		hr: [[1440, 98], [0, 92]],
		map: [[1440, 104], [300, 103], [60, 108], [0, 118]],
		bp: [162, 96],
		mapLimits: { low: 65, high: 110 },
		spo2: [[1440, 98], [0, 98]],
		rr: [[1440, 18], [0, 20]],
		temp: [[1320, 37.3], [1080, 37.1], [840, 37.2], [600, 37.0], [360, 37.1], [45, 37.2]],
		lanes: [
			pump("Nicardipine", "mg/h", [[1440, 5], [35, 7.5]]),
			labLane("Platelets", "K/µL", [[900, 131], [120, 98]], { low: 150 }),
			labLane("Magnesium", "mg/dL", [[300, 1.9], [60, 2.0]], { low: 1.8, high: 2.4 }, "lab-2"),
		],
		events: [
			[1200, "note", "Neurology consult note signed"],
			[900, "lab", "Platelets 131 K/µL, AST 88 U/L resulted"],
			[300, "lab", "Magnesium 1.9 mg/dL resulted"],
			[180, "care", "Neuro checks unchanged, no seizures"],
			[120, "lab", "Platelets 98 K/µL, AST 142 U/L, LDH 610 U/L resulted"],
			[60, "lab", "Magnesium 2.0 mg/dL resulted"],
			[35, "drip", "Nicardipine 5 → 7.5 mg/h"],
		],
	}),

	// Whitfield: day 2 after thrombectomy for a right MCA stroke, DNR. Early swelling on the CT 20 h ago, so normal saline
	// gave way to 3% saline, sodium 134 → 141 toward 145–155. Neuro checks unchanged overnight; RR stopped reporting 27 min
	// ago (a gap to now). Glucose up to 182.
	p12: timeline({
		seed: 111,
		hr: [[1440, 84], [0, 80]],
		map: [[1440, 78], [0, 74]],
		bp: [104, 59],
		spo2: [[1440, 95], [0, 94]],
		rr: [[1440, 16], [0, 16]],
		gaps: { rr: [[28, 0]] },
		temp: [[1320, 37.4], [1080, 37.2], [840, 37.3], [600, 37.1], [360, 37.2], [75, 37.2]],
		lanes: [
			pump("Normal saline", "mL/h", [[1440, 75], [1150, 0]], "fluid"),
			pump("Sodium chloride 3%", "mL/h", [[1440, 0], [1150, 30]]),
			oxygenFlow([[1440, 2]]),
			labLane("Glucose", "mg/dL", [[1200, 148], [450, 156], [90, 182]], { high: 180 }),
			labLane("Sodium", "mmol/L", [[1740, 136], [1200, 134], [840, 136], [480, 138], [120, 141]], { low: 135 }, "lab-2"),
		],
		events: [
			[1400, "note", "Advance directive on file: DNR"],
			[1320, "care", "Neuro check unchanged · NIHSS 9"],
			[1200, "note", "CT head: early swelling of the infarct, no midline shift"],
			[1200, "lab", "Sodium 134 mmol/L resulted"],
			[1150, "drip", "3% saline started at 30 mL/h, normal saline stopped · sodium goal 145–155"],
			[1080, "care", "Neuro check unchanged · NIHSS 9"],
			[840, "lab", "Sodium 136 mmol/L resulted"],
			[840, "care", "Neuro check unchanged · NIHSS 9"],
			[600, "care", "Neuro check unchanged · NIHSS 9"],
			[480, "lab", "Sodium 138 mmol/L resulted"],
			[450, "lab", "Glucose 156 mg/dL resulted"],
			[360, "care", "Neuro check unchanged · NIHSS 9"],
			[120, "lab", "Sodium 141 mmol/L resulted"],
			[120, "care", "Neuro check unchanged · NIHSS 9"],
			[90, "lab", "Glucose 182 mg/dL resulted"],
		],
	}),

	// Walker: cardiogenic shock after anterior STEMI, on VA-ECMO. Flow was cut from 4.4 to 3.8 L/min on the night shift
	// and lactate went 2.6 → 3.1; Maria Ruiz carried the concern over. MAP 55 on epinephrine and norepinephrine (up to
	// 0.18), HR 134. A repeat lactate is pending.
	p13: timeline({
		seed: 121,
		hr: [[1440, 116], [245, 122], [90, 130], [0, 134]],
		map: [[1440, 66], [245, 63], [90, 58], [0, 55]],
		bp: [84, 41],
		spo2: [[1440, 96], [0, 94]],
		rr: [[1440, 18], [0, 22]],
		temp: [[1320, 36.8], [1080, 36.9], [840, 36.8], [600, 36.9], [360, 36.7], [55, 36.8]],
		lanes: [
			pump("Epinephrine", "mcg/kg/min", [[1440, 0.04], [170, 0.07]]),
			pump("Norepinephrine", "mcg/kg/min", [[1440, 0.08], [600, 0.12], [90, 0.18]]),
			pump("Heparin", "units/h", [[1440, 900]], "other"),
			pump("Fentanyl", "mcg/h", [[1440, 50]], "sedation"),
			ventilator("FiO₂", "%", [[1440, 40]], "fio2"),
			ventilator("PEEP", "cmH₂O", [[1440, 10]], "peep"),
			{
				id: "ecmo-flow",
				group: "support",
				label: "ECMO flow",
				unit: "L/min",
				kind: "step",
				color: "lab-2",
				source: "ECMO console",
				decimals: 1,
				points: steps([[1440, 4.4], [245, 3.8]]),
			},
			labLane("Lactate", "mmol/L", [[1100, 2.2], [250, 2.6], [130, 3.1]], { high: 2 }),
			labLane("Creatinine", "mg/dL", [[1680, 1.8], [240, 2.1]], { high: 1.2 }, "lab-2"),
		],
		events: [
			[1100, "lab", "Lactate 2.2 mmol/L resulted"],
			[600, "drip", "Norepinephrine 0.08 → 0.12 mcg/kg/min"],
			[250, "lab", "Lactate 2.6 mmol/L resulted"],
			[245, "care", "ECMO flow 4.4 → 3.8 L/min"],
			[240, "lab", "Creatinine 2.1 mg/dL, anti-Xa 0.42 resulted"],
			[170, "drip", "Epinephrine 0.04 → 0.07 mcg/kg/min"],
			[130, "lab", "Lactate 3.1 mmol/L resulted"],
			[90, "drip", "Norepinephrine 0.12 → 0.18 mcg/kg/min"],
			[15, "care", "Repeat lactate drawn"],
		],
	}),

	// Bennett: admitted 6 h ago with new atrial fibrillation with a fast ventricular rate. Rate down from the 140s to 88
	// on diltiazem, which came down from 15 to 10. Magnesium low at 1.7; TSH pending.
	p14: timeline({
		span: 330,
		seed: 131,
		hr: [[330, 148], [290, 140], [200, 118], [120, 102], [0, 88]],
		map: [[330, 70], [0, 77]],
		bp: [110, 61],
		spo2: [[330, 96], [0, 97]],
		rr: [[330, 21], [0, 17]],
		temp: [[300, 37.0], [180, 36.9], [40, 37.0]],
		lanes: [
			pump("Diltiazem", "mg/h", [[330, 0], [290, 15], [120, 10]]),
			labLane("Magnesium", "mg/dL", [[240, 1.7]], { low: 1.8 }),
			labLane("Potassium", "mmol/L", [[240, 3.6]], { low: 3.5 }, "lab-2"),
		],
		events: [
			[300, "care", "Diltiazem 15 mg IV push"],
			[290, "drip", "Diltiazem started at 15 mg/h"],
			[280, "note", "Admission note signed"],
			[240, "care", "TSH drawn"],
			[240, "lab", "Magnesium 1.7 mg/dL, potassium 3.6 mmol/L resulted"],
			[200, "care", "Magnesium 2 g IV given"],
			[120, "drip", "Diltiazem 15 → 10 mg/h"],
		],
	}),

	// Hayes, just before Scenario 1 (`hayesTimeline`): the last hour holds at RR 20, SpO₂ 92% and HR 106.
	p15: hayesTimeline("before"),

	// Erickson: pneumonia, day 3. Last fever (38.2 °C) yesterday morning; oxygen 3 → 2 L; WBC 15.2 → 10.4.
	p16: timeline({
		seed: 151,
		hr: [[1440, 94], [900, 88], [0, 84]],
		map: [[1440, 85], [0, 90]],
		bp: [126, 72],
		spo2: [[1440, 95], [700, 94], [0, 96]],
		rr: [[1440, 20], [0, 18]],
		temp: [[1310, 38.2], [1070, 38.0], [830, 37.6], [590, 37.4], [350, 37.3], [110, 37.2]],
		lanes: [
			oxygenFlow([[1440, 3], [700, 2]]),
			labLane("WBC", "K/µL", [[1740, 15.2], [300, 10.4]], { high: 11 }),
		],
		events: [
			[1200, "care", "Ceftriaxone 1 g IV"],
			[1150, "note", "Progress note signed"],
			[700, "care", "Oxygen 3 → 2 L/min, SpO₂ 95%"],
			[420, "care", "Walked the hall with a walker"],
			[300, "lab", "WBC 10.4 K/µL, procalcitonin 0.4 ng/mL resulted"],
		],
	}),

	// Carlson: cellulitis, day 2. Last fever (38.3 °C) yesterday morning; WBC 13.8 → 9.6.
	p19: timeline({
		seed: 171,
		hr: [[1440, 92], [900, 82], [0, 76]],
		map: [[1440, 94], [0, 97]],
		bp: [134, 78],
		spo2: [[1440, 95], [0, 95]],
		rr: [[1440, 18], [0, 16]],
		temp: [[1300, 38.3], [1060, 37.8], [820, 37.3], [580, 37.1], [340, 37.0], [130, 37.0]],
		lanes: [labLane("WBC", "K/µL", [[1760, 13.8], [320, 9.6]], { high: 11 })],
		events: [
			[1260, "care", "Cefazolin 2 g IV"],
			[1180, "note", "Progress note signed"],
			[780, "care", "Redness inside the marked border"],
			[320, "lab", "WBC 9.6 K/µL, glucose 164 mg/dL resulted"],
		],
	}),

	// Hansen: kidney injury from dehydration, day 2. Saline 150 → 100 mL/h; creatinine 2.3 → 1.4.
	p20: timeline({
		seed: 181,
		hr: [[1440, 96], [900, 86], [0, 80]],
		map: [[1440, 84], [0, 93]],
		bp: [128, 76],
		spo2: [[1440, 97], [0, 97]],
		rr: [[1440, 17], [0, 16]],
		temp: [[1320, 37.1], [1080, 37.0], [840, 36.9], [600, 36.8], [360, 36.8], [150, 36.8]],
		lanes: [
			pump("Normal saline", "mL/h", [[1440, 150], [600, 100]], "fluid"),
			labLane("Creatinine", "mg/dL", [[1740, 2.3], [300, 1.4]], { high: 1.3 }),
		],
		events: [
			[1100, "note", "Progress note signed"],
			[600, "drip", "Normal saline 150 → 100 mL/h"],
			[540, "care", "Ate dinner, no nausea"],
			[300, "lab", "Creatinine 1.4 mg/dL, potassium 4.2 mmol/L resulted"],
		],
	}),

	// Ortega: out of the OR 20 h ago after a small bowel resection. RR 18 → 21 and HR 96 → 104 as she splints with pain;
	// the PCA went up 1 h ago. NEWS2 4 → 5 → 6 (`sample-vitals.ts`).
	p17: timeline({
		span: 1200,
		seed: 161,
		hr: [[1200, 96], [480, 100], [240, 102], [0, 104]],
		map: [[1200, 83], [0, 80]],
		bp: [112, 64],
		spo2: [[1200, 95], [600, 96], [240, 96], [0, 95]],
		rr: [[1200, 18], [600, 19], [240, 21], [0, 21]],
		temp: [[1050, 37.2], [810, 37.5], [570, 37.7], [330, 37.8], [45, 37.9]],
		lanes: [
			pump("Lactated Ringer's", "mL/h", [[1200, 125], [600, 100]], "fluid"),
			pump("Hydromorphone PCA", "mg", [[1200, 0.2], [60, 0.3]]),
			oxygenFlow([[1200, 2]]),
			labLane("Hemoglobin", "g/dL", [[1300, 12.6], [210, 10.8]], { low: 12 }),
		],
		events: [
			[1200, "note", "Operative note signed"],
			[1190, "care", "Arrived from the OR"],
			[600, "drip", "Lactated Ringer's 125 → 100 mL/h"],
			[210, "lab", "Hemoglobin 10.8 g/dL, lactate 1.4 mmol/L resulted"],
			[120, "care", "Incentive spirometry: 750 mL"],
			[60, "drip", "Hydromorphone PCA 0.2 → 0.3 mg"],
		],
	}),

	// Norman: DKA, admitted 21 h ago. Insulin 6 → 3 units/h as glucose fell, dextrose added; the anion gap 28 → 12.
	p18: timeline({
		span: 1260,
		seed: 171,
		hr: [[1260, 112], [900, 104], [480, 96], [0, 92]],
		map: [[1260, 75], [600, 86], [0, 92]],
		bp: [128, 74],
		spo2: [[1260, 98], [0, 98]],
		rr: [[1260, 24], [900, 21], [480, 18], [0, 16]],
		temp: [[1200, 36.4], [960, 36.6], [720, 36.8], [480, 36.9], [240, 36.9], [70, 36.9]],
		lanes: [
			pump("Insulin regular", "units/h", [[1250, 6], [240, 3]]),
			labLane("Anion gap", "mmol/L", [[1260, 28], [900, 22], [540, 16], [90, 12]], { high: 12 }),
			labLane("Glucose", "mg/dL", [[1260, 512], [900, 342], [540, 246], [25, 168]], { high: 180 }, "lab-2"),
		],
		events: [
			[1250, "drip", "Insulin started at 6 units/h"],
			[1240, "care", "Lactated Ringer's 1 L bolus"],
			[1200, "note", "History and physical signed"],
			[540, "drip", "Dextrose 5% with 0.45% saline added at 125 mL/h"],
			[240, "drip", "Insulin 6 → 3 units/h"],
			[90, "lab", "Anion gap 12, bicarbonate 20 mmol/L resulted"],
			[30, "care", "Breakfast tray: ate half"],
		],
	}),

	// Jensen: back from the OR 24 h ago after a right hip hemiarthroplasty. HR 98 → 86 and MAP 77 → 89 as fluids
	// and pain control caught up; hemoglobin 11.8 → 9.4 after surgery. NEWS2 5 → 3 (`sample-vitals.ts`).
	p22: timeline({
		seed: 191,
		hr: [[1440, 98], [720, 92], [0, 86]],
		map: [[1440, 77], [0, 89]],
		bp: [126, 70],
		spo2: [[1440, 94], [600, 95], [0, 95]],
		rr: [[1440, 18], [0, 16]],
		temp: [[1290, 37.4], [1050, 37.6], [810, 37.5], [570, 37.3], [330, 37.2], [50, 37.1]],
		lanes: [
			pump("Lactated Ringer's", "mL/h", [[1440, 100], [480, 75]], "fluid"),
			oxygenFlow([[1440, 2]]),
			labLane("Hemoglobin", "g/dL", [[2000, 11.8], [240, 9.4]], { low: 12 }),
		],
		events: [
			[1430, "care", "Arrived from the OR after a right hip hemiarthroplasty"],
			[1380, "note", "Operative note signed"],
			[480, "drip", "Lactated Ringer's 100 → 75 mL/h"],
			[240, "lab", "Hemoglobin 9.4 g/dL resulted"],
			[90, "care", "Stood at the bedside with physical therapy"],
		],
	}),

	// Peterson: diverticulitis, day 2. Last fever (38.4 °C) yesterday afternoon; fluids 125 → 75 mL/h; WBC 15.6 → 11.2.
	p25: timeline({
		seed: 201,
		hr: [[1440, 96], [800, 88], [0, 84]],
		map: [[1440, 92], [0, 95]],
		bp: [134, 76],
		spo2: [[1440, 96], [0, 97]],
		rr: [[1440, 18], [0, 16]],
		temp: [[1320, 38.4], [1080, 38.1], [840, 37.6], [600, 37.4], [360, 37.2], [120, 37.2]],
		lanes: [
			pump("Lactated Ringer's", "mL/h", [[1440, 125], [720, 75]], "fluid"),
			labLane("WBC", "K/µL", [[1700, 15.6], [280, 11.2]], { high: 11 }),
		],
		events: [
			[1260, "care", "Ceftriaxone 2 g IV and metronidazole 500 mg IV"],
			[1080, "note", "Progress note signed"],
			[720, "drip", "Lactated Ringer's 125 → 75 mL/h"],
			[540, "care", "Clear liquids, no nausea"],
			[280, "lab", "WBC 11.2 K/µL resulted"],
		],
	}),

	// Lambert: influenza A pneumonia, admitted 18 h ago on 2 L. The fever (38.4 °C) broke overnight; SpO₂ holds at 94%
	// and RR 22 → 21. NEWS2 6 → 5 (`sample-vitals.ts`).
	p26: timeline({
		span: 1080,
		seed: 211,
		hr: [[1080, 90], [540, 92], [0, 88]],
		map: [[1080, 79], [0, 84]],
		bp: [120, 66],
		spo2: [[1080, 94], [600, 93], [0, 94]],
		rr: [[1080, 22], [0, 21]],
		temp: [[1020, 38.4], [780, 38.2], [540, 37.6], [300, 37.3], [60, 37.6]],
		lanes: [oxygenFlow([[1080, 2]]), labLane("Sodium", "mmol/L", [[1100, 131], [300, 133]], { low: 135 })],
		events: [
			[1075, "care", "Arrived from the ED on 2 L, droplet isolation"],
			[1060, "care", "Oseltamivir 30 mg by mouth, renal dose"],
			[1000, "note", "History and physical signed"],
			[780, "care", "Temp 38.2 °C, acetaminophen 650 mg"],
			[300, "lab", "Sodium 133 mmol/L, procalcitonin 0.18 ng/mL resulted"],
		],
	}),

	// Jacobs: in a swing bed for rehab after a left knee replacement, steady. Hemoglobin 10.6 → 11.2 since surgery.
	p27: timeline({
		seed: 221,
		hr: [[1440, 76], [0, 72]],
		map: [[1440, 93], [0, 96]],
		bp: [136, 76],
		spo2: [[1440, 96], [0, 96]],
		rr: [[1440, 16], [0, 16]],
		temp: [[1380, 36.8], [1140, 36.9], [900, 36.7], [660, 36.8], [420, 36.8], [180, 36.7]],
		lanes: [labLane("Hemoglobin", "g/dL", [[4300, 10.6], [1500, 11.2]], { low: 12 })],
		events: [
			[1320, "care", "Physical therapy: walked 90 feet with a walker"],
			[1200, "note", "Swing bed progress note signed"],
			[840, "care", "Occupational therapy: dressing and bathroom transfers"],
			[600, "care", "Physical therapy: walked 120 feet, knee bent to 85°"],
			[540, "care", "Fall risk reassessed: Morse 55 → 45"],
		],
	}),

	// Hughes: upper GI bleed under observation, 16 h. HR 104 → 94 and MAP 76 → 82 on saline; hemoglobin 10.9 → 10.4 →
	// 10.6. NEWS2 2 → 1 (`sample-vitals.ts`).
	p28: timeline({
		span: 960,
		seed: 231,
		hr: [[960, 104], [480, 98], [0, 94]],
		map: [[960, 76], [0, 82]],
		bp: [114, 66],
		spo2: [[960, 98], [0, 98]],
		rr: [[960, 16], [0, 16]],
		temp: [[810, 36.7], [570, 36.6], [330, 36.8], [90, 36.7]],
		lanes: [
			pump("Normal saline", "mL/h", [[960, 150], [480, 75]], "fluid"),
			labLane("Hemoglobin", "g/dL", [[960, 10.9], [600, 10.4], [120, 10.6]], { low: 12 }),
		],
		events: [
			[950, "care", "Arrived from the ED for observation"],
			[940, "care", "Pantoprazole 40 mg IV"],
			[900, "note", "History and physical signed"],
			[600, "lab", "Hemoglobin 10.4 g/dL resulted"],
			[480, "drip", "Normal saline 150 → 75 mL/h"],
			[240, "care", "Fall risk assessed: Morse 45, lightheaded standing"],
			[120, "lab", "Hemoglobin 10.6 g/dL, BUN 34 mg/dL resulted"],
		],
	}),

	// Ramirez: in the ED 3 h with an asthma attack. Three nebulizers and prednisone: RR 24 → 20, SpO₂ 93 → 96% on room
	// air, HR up to 110 with the albuterol, now 104. NEWS2 5 → 1 (`sample-vitals.ts`).
	p29: timeline({
		span: 180,
		seed: 241,
		hr: [[180, 108], [110, 110], [0, 104]],
		map: [[180, 92], [0, 88]],
		bp: [124, 70],
		spo2: [[180, 93], [120, 95], [0, 96]],
		rr: [[180, 24], [60, 21], [0, 20]],
		temp: [[30, 36.9]],
		lanes: [labLane("Potassium", "mmol/L", [[150, 3.6]], { low: 3.5 })],
		events: [
			[178, "care", "Triage: wheezing, speaking in phrases, peak flow 38% of her best"],
			[170, "care", "Ipratropium-albuterol nebulizer"],
			[160, "care", "Prednisone 50 mg by mouth"],
			[150, "lab", "Potassium 3.6 mmol/L, glucose 142 mg/dL resulted"],
			[150, "care", "Ipratropium-albuterol nebulizer, second"],
			[130, "care", "Ipratropium-albuterol nebulizer, third"],
			[60, "care", "Peak flow 55% of her best"],
			[10, "care", "Peak flow 62% of her best"],
		],
	}),
};

/** Hayes's timeline at Scenario 1's early warning, built when the beat plays so it ends "now". */
const sampleScenario1Timeline = () => hayesTimeline("alert");
const sampleScenario1ResolvedTimeline = () => hayesTimeline("resolved");

const sampleScenario2Timeline = () => reynoldsTimeline("alert");
const sampleScenario2ResolvedTimeline = () => reynoldsTimeline("resolved");

/**
 * Rosa Medina (Scenario 3), in Sidney's ED since 50 min before the sepsis screen: triage BP 96/58, HR 112, T 39.0 °C;
 * labs at 45 min, acetaminophen and ondansetron at 40, lactate 3.8 and the BMP at 22, BP down to 84/48 at 5, the screen
 * now. No fluids or antibiotics before it. At the resolution the scenario's 12 h are compressed, as Dale Reynolds's 2 h
 * are: the screen sits 30 min back and each stage a few minutes after the last (after fluids 24, on norepinephrine 18,
 * at 6 h 10, at 12 h now); the labels give the scenario's times. The insulin and norepinephrine rates, the lactates and
 * glucoses follow `sample-patient-records.ts`.
 */
function medinaTimeline(stage: "alert" | "resolved"): PatientTimeline {
	const resolved = stage === "resolved";
	// Where the screen sits, and so where everything before it sits.
	const zero = resolved ? 30 : 0;
	const before = (minutes: number) => zero + minutes;
	const after = (...keys: [number, number][]): [number, number][] => (resolved ? keys : []);
	return timeline({
		span: before(50),
		seed: 231,
		hr: [[before(50), 112], [before(25), 116], [before(5), 122], [zero, 124], ...after([24, 112], [18, 104], [10, 96], [0, 88])],
		map: [[before(50), 71], [before(25), 68], [before(5), 60], [zero, 60], ...after([24, 62], [18, 67], [10, 77], [0, 83])],
		bp: resolved ? [118, 66] : [84, 48],
		spo2: [[before(50), 96], [zero, 95], ...after([24, 95], [18, 96], [10, 97], [0, 97])],
		rr: [[before(50), 22], [before(5), 24], [zero, 24], ...after([24, 22], [18, 20], [10, 18], [0, 16])],
		temp: [[before(50), 39.0], [before(5), 39.4], ...after([18, 38.6], [10, 37.8], [2, 37.4])],
		lanes: [
			...(resolved
				? [
						pump("Norepinephrine", "mcg/kg/min", [[21, 0.05], [18, 0.08], [10, 0.04], [4, 0]]),
						pump("Insulin, regular", "units/h", [[18, 3], [10, 2]], "other"),
					]
				: []),
			labLane("Lactate", "mmol/L", [[before(22), 3.8], ...after([16, 2.6], [10, 1.6])], { high: 2 }),
			labLane("Glucose", "mg/dL", [[before(22), 390], ...after([18, 312], [10, 172], [2, 158])], { high: 180 }, "lab-2"),
		],
		events: [
			[before(50), "care", "Walked in with her daughter: BP 96/58, HR 112, T 39.0 °C, RR 22, SpO₂ 96% on room air"],
			[before(48), "note", "ED triage: dysuria and left flank pain for 3 days, fevers and rigors, vomiting"],
			[before(45), "care", "Lactate, CBC, BMP, urinalysis and glucose drawn"],
			[before(40), "care", "Acetaminophen 1,000 mg by mouth, ondansetron 4 mg IV"],
			[before(22), "lab", "Lactate 3.8 mmol/L · creatinine 2.6, eGFR 22 · glucose 390 · WBC 18.6"],
			[before(20), "lab", "Urinalysis: nitrite positive, leukocyte esterase 3+, WBC over 50/hpf"],
			[before(5), "care", "BP 84/48 (MAP 60), HR 124, T 39.4 °C"],
			[zero, "alert", "Sepsis screen: probable septic shock · Critical"],
			...(resolved
				? ([
						[28, "care", "Blood cultures ×2 drawn, before antibiotics"],
						[27, "care", "Piperacillin-tazobactam 4.5 g IV, first dose"],
						[26, "care", "Lactated Ringer's 500 mL bolus, 1 of 4"],
						[24, "care", "2,000 mL of LR given (at 45 min); lungs clear at each reassessment"],
						[21, "drip", "Norepinephrine 0.05 mcg/kg/min, peripheral IV"],
						[18, "drip", "Norepinephrine 0.05 → 0.08 mcg/kg/min (at 1 h 15 min); insulin infusion 3 units/h"],
						[16, "lab", "Repeat lactate 2.6 mmol/L (at 2 h)"],
						[14, "note", "Renal ultrasound: swollen left kidney, no hydronephrosis or abscess"],
						[10, "drip", "Norepinephrine 0.08 → 0.04 mcg/kg/min, insulin 3 → 2 units/h (at 6 h)"],
						[10, "lab", "Lactate 1.6 mmol/L (at 6 h)"],
						[4, "drip", "Norepinephrine off (at 11 h)"],
						[2, "lab", "Blood cultures: gram-negative rods in 2 of 2, E. coli · creatinine 2.5"],
						[1, "care", "Admitted to Sidney's inpatient unit, hub co-management"],
					] as PatientSpec["events"])
				: []),
		],
	});
}

const sampleScenario3Timeline = (stage: "alert" | "resolved") => medinaTimeline(stage);

/**
 * Tyler Kessler (Scenario 4), in Bridgeport since 40 min before the alert: triage HR 116, BP 104/62, RR 24, a liter of
 * saline as a bolus, ondansetron, labs at 20 min, admitted to Med-Surg at 10, the second liter at 5, the critical labs
 * now. No insulin before the protocol. At `closed` the scenario's 14 h are compressed, as Rosa Medina's 12 h are: the
 * alert sits 44 min back and each hour of the protocol 3 min after the last, so the drip stops (hour 14) 2 min ago; the
 * labels give the scenario's times. The hourly checks and insulin rates are the protocol's (`sample-scenario-4.ts`).
 */
function kesslerTimeline(stage: "alert" | "closed"): PatientTimeline {
	const closed = stage === "closed";
	// Where the alert sits, and so where everything before it sits.
	const zero = closed ? 44 : 0;
	const before = (minutes: number) => zero + minutes;
	/** Minutes back to the protocol's hour `h` (23:00 is hour 0). */
	const hour = (h: number) => (14 - h) * 3 + 2;
	const after = (...keys: [number, number][]): [number, number][] => (closed ? keys : []);
	const checks = (values: number[]): [number, number][] => (closed ? values.map((value, h) => [hour(h), value]) : [[before(1), values[0]]]);
	return timeline({
		span: before(40),
		seed: 241,
		hr: [[before(40), 116], [before(20), 119], [zero, 122], ...after([hour(2), 108], [hour(6), 96], [0, 82])],
		map: [[before(40), 76], [before(20), 74], [zero, 71], ...after([hour(2), 79], [hour(6), 85], [0, 91])],
		bp: closed ? [122, 76] : [98, 58],
		spo2: [[before(40), 99], [zero, 99], ...after([0, 99])],
		rr: [[before(40), 24], [before(20), 28], [zero, 30], ...after([hour(2), 24], [hour(6), 20], [0, 16])],
		temp: [[before(40), 37.0], [before(5), 37.2], ...after([hour(6), 36.9], [hour(13), 36.8])],
		lanes: [
			...(closed
				? [
						pump("Insulin, regular", "units/h", [[hour(0), 7], [hour(3), 8], [hour(4), 0], [hour(5), 8], [hour(6), 3.5], [hour(10), 4], [hour(14), 0]]),
						pump("Potassium chloride", "mEq/h", [[hour(4), 20], [hour(5), 0]], "other"),
					]
				: []),
			pump("IV fluids", "mL/h", [[before(35), 2000], [before(5), 1000], ...after([hour(1), 250], [hour(6), 150], [hour(14), 0])], "fluid"),
			labLane("Anion gap", "mmol/L", checks([28, 26, 24, 22, 20, 19, 17, 16, 15, 14, 14, 13, 13, 11]), { high: 12 }),
			labLane("Glucose", "mg/dL", checks([520, 468, 415, 386, 318, 296, 238, 182, 176, 168, 205, 188, 172, 164]), { high: 180 }, "lab-2"),
			labLane("Potassium", "mmol/L", checks([5.6, 5.1, 4.4, 3.9, 3.1, 3.6, 3.9, 4.0, 4.1, 4.2, 4.2, 4.3, 4.3, 4.4]), { low: 3.5, high: 5 }),
		],
		events: [
			[before(40), "care", "Walked into the ED: HR 116, BP 104/62, RR 24, SpO₂ 99% on room air, T 37.0 °C"],
			[before(38), "note", "ED triage: type 1 diabetes, out of his glargine 2 days, vomiting since yesterday"],
			[before(35), "drip", "0.9% saline, 1 L bolus"],
			[before(30), "care", "Ondansetron 4 mg IV"],
			[before(20), "care", "Venous gas, BMP, beta-hydroxybutyrate, CBC and lipase drawn"],
			[before(10), "care", "Admitted to Med-Surg, Bed 3 · Derek Lawson, PA-C on call by phone"],
			[before(5), "drip", "0.9% saline, second liter at 1,000 mL/h"],
			[before(1), "lab", "pH 7.08 · bicarbonate 6 · gap 28 · glucose 520 · potassium 5.6 · beta-hydroxybutyrate 7.2"],
			[zero, "alert", "Critical labs: severe DKA · Critical"],
			...(closed
				? ([
						[hour(0) - 1, "drip", "DKA protocol started from the hub: insulin 7 units/h, 0.1 units/kg/h (23:00)"],
						[hour(1), "drip", "0.45% saline with KCl 20 mEq/L at 250 mL/h (00:00)"],
						[hour(3), "drip", "Insulin 7 → 8 units/h: glucose fell only 29 (02:00), signed on the phone in 38 s"],
						[hour(4), "lab", "Potassium 3.1 (03:00)"],
						[hour(4) - 1, "drip", "Insulin held; KCl 20 mEq/h IV"],
						[hour(5), "drip", "Potassium 3.6: insulin back at 8 units/h (04:00)"],
						[hour(6), "drip", "Glucose 238: D5 0.45% saline with KCl at 150 mL/h, insulin 8 → 3.5 units/h (05:00)"],
						[hour(7) - 1, "care", "06:00 check in 14 min late, after the nudge"],
						[hour(8), "care", "Day shift: Hannah Price, RN takes the checklist (07:00)"],
						[hour(8) - 1, "note", "History and physical signed: cost-related insulin rationing recorded (07:30)"],
						[hour(10), "drip", "Insulin 3.5 → 4 units/h: glucose 205 (09:00)"],
						[hour(13), "lab", "Anion gap 11, bicarbonate 19, pH 7.34: gap closed (12:00)"],
						[hour(13) - 1, "care", "Glargine 22 units SC and lispro 6 units with lunch (12:12)"],
						[hour(14), "drip", "Insulin drip stopped after 14 h (13:00)"],
					] as PatientSpec["events"])
				: []),
		],
	});
}

const sampleScenario4Timeline = (stage: "alert" | "closed") => kesslerTimeline(stage);

export {
	sampleScenario1ResolvedTimeline,
	sampleScenario1Timeline,
	sampleScenario2ResolvedTimeline,
	sampleScenario2Timeline,
	sampleScenario3Timeline,
	sampleScenario4Timeline,
	sampleTimelineByPatient,
};
