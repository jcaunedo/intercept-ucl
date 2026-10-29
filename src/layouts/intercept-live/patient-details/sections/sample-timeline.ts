import type { PatientTimeline, TimelineEventKind, TimelineLane, TimelineLaneColor, TimelinePoint } from "./timeline-section";

// Synthetic data (PRD Patient details PD-150): each Census patient's last 24 hours (less when the stay is shorter),
// telling the same story as their record's brief and alerts and ending at their live values on Monitoring. Lanes follow
// what the patient has: Ventilator only when ventilated, Oxygen when on charted oxygen, Pump for their infusions, Labs
// from their key labs. A parameter that stopped reporting is drawn as a gap, never interpolated (PD-031). Curves are
// deterministic, so every session reads the same.
//
// Sarah Miller (`p1`), the reference patient: MAP drifts down from 74 to 58 as norepinephrine goes 0.08 → 0.12 → 0.15
// → 0.22; FiO₂ and PEEP go up 3 h ago, SpO₂ recovers to 94 and falls back to 89; lactate 2.2 → 4.1; temperature
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
		minute > 180 ? 96 - (4 * (1440 - minute)) / 1260 : minute > 150 ? 92 + (2 * (180 - minute)) / 30 : 94 - (5 * (150 - minute)) / 150;
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
				{ at: minutesAgo(180), value: 60 },
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
				{ at: minutesAgo(180), value: 10 },
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
		{ id: "e2", at: minutesAgo(960), kind: "note", label: "Progress note signed · Priya Shah" },
		{ id: "e3", at: minutesAgo(720), kind: "care", label: "Turned and repositioned · Kevin Ortiz" },
		{ id: "e4", at: minutesAgo(420), kind: "drip", label: "Norepinephrine 0.08 → 0.12 mcg/kg/min" },
		{ id: "e5", at: minutesAgo(330), kind: "lab", label: "Lactate 2.2 mmol/L resulted" },
		{ id: "e6", at: minutesAgo(260), kind: "care", label: "Suctioned, thick secretions · Kevin Ortiz" },
		{ id: "e7", at: minutesAgo(180), kind: "ventilator", label: "FiO₂ 40 → 60%, PEEP 8 → 10 cmH₂O" },
		{ id: "e8", at: minutesAgo(175), kind: "drip", label: "Norepinephrine 0.12 → 0.15 mcg/kg/min" },
		{ id: "e9", at: minutesAgo(130), kind: "drip", label: "Propofol 40 → 30 mcg/kg/min" },
		{ id: "e10", at: minutesAgo(120), kind: "care", label: "Blood cultures ×2 drawn" },
		{ id: "e11", at: minutesAgo(95), kind: "lab", label: "WBC 17.2 K/µL, creatinine 1.9 mg/dL resulted" },
		{ id: "e12", at: minutesAgo(85), kind: "care", label: "SpO₂ probe repositioned" },
		{ id: "e13", at: minutesAgo(40), kind: "drip", label: "Norepinephrine 0.15 → 0.22 mcg/kg/min" },
		{ id: "e14", at: minutesAgo(35), kind: "lab", label: "Lactate 4.1 mmol/L resulted" },
		{ id: "e15", at: minutesAgo(11), kind: "alert", label: "SpO₂ below 90% · High" },
		{ id: "e16", at: minutesAgo(6), kind: "alert", label: "MAP below 65 mmHg · Critical" },
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
			[24, "alert", "Norepinephrine up 2 steps in 1 h · Medium"],
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
			[14, "alert", "SpO₂ not reporting · Medium"],
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
			[18, "alert", "PEEP differs from the active order · High"],
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

	// Clark: postpartum day 1 after cesarean for severe preeclampsia. Pressure climbed from 148/88 an hour ago to 162/96;
	// nicardipine went up to 7.5. Magnesium level in range at 6.1; platelets 98, AST 142.
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
			pump("Magnesium sulfate", "g/h", [[1440, 2]], "other"),
			pump("Nicardipine", "mg/h", [[1440, 5], [35, 7.5]]),
			labLane("Platelets", "K/µL", [[900, 131], [120, 98]], { low: 150 }),
			labLane("Magnesium", "mg/dL", [[300, 5.2], [60, 6.1]], { low: 4.8, high: 8.4 }, "lab-2"),
		],
		events: [
			[1200, "note", "Obstetrics progress note signed"],
			[900, "lab", "Platelets 131 K/µL, AST 88 U/L resulted"],
			[300, "lab", "Magnesium 5.2 mg/dL resulted"],
			[180, "care", "Reflexes 2+, no clonus"],
			[120, "lab", "Platelets 98 K/µL, AST 142 U/L, LDH 610 U/L resulted"],
			[60, "lab", "Magnesium 6.1 mg/dL resulted"],
			[35, "drip", "Nicardipine 5 → 7.5 mg/h"],
		],
	}),

	// Whitfield: day 2 after thrombectomy for a right MCA stroke, DNR. Neuro checks unchanged overnight; RR stopped
	// reporting 27 min ago (a gap to now). Glucose up to 182.
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
			pump("Normal saline", "mL/h", [[1440, 75]], "fluid"),
			oxygenFlow([[1440, 2]]),
			labLane("Glucose", "mg/dL", [[1200, 148], [450, 156], [90, 182]], { high: 180 }),
			labLane("Sodium", "mmol/L", [[1740, 136], [300, 134]], { low: 135 }, "lab-2"),
		],
		events: [
			[1400, "note", "Advance directive on file: DNR"],
			[1320, "care", "Neuro check unchanged · NIHSS 9"],
			[1080, "care", "Neuro check unchanged · NIHSS 9"],
			[840, "care", "Neuro check unchanged · NIHSS 9"],
			[600, "care", "Neuro check unchanged · NIHSS 9"],
			[450, "lab", "Glucose 156 mg/dL resulted"],
			[360, "care", "Neuro check unchanged · NIHSS 9"],
			[300, "lab", "Sodium 134 mmol/L resulted"],
			[120, "care", "Neuro check unchanged · NIHSS 9"],
			[90, "lab", "Glucose 182 mg/dL resulted"],
			[27, "alert", "RR not reporting · Low"],
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
			pump("Epinephrine", "mcg/kg/min", [[1440, 0.05]]),
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
			[132, "alert", "Concern: lactate after ECMO flow change · Maria Ruiz"],
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
};

export { sampleTimelineByPatient };
