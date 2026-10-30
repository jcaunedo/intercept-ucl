import type { PatientVitals, VitalReading, VitalSeries } from "./vitals-section";

// Synthetic data (PRD Patient details PD-150): the last 24 hours of charted vitals for every patient on the Census, in
// step with their records and alerts. Each series ends at the patient's live value in `sample-monitoring.ts` and follows
// their story. Temperatures are charted by hand every 4 hours. EtCO₂ is only for intubated patients. A stay shorter than
// 24 hours starts at ICU admission. Carter's SpO₂ (14 min) and Whitfield's RR (27 min) have stopped reporting, so their
// last values are Stale.
//
// Sarah Miller (`p1`) is written out by hand: MAP falls from about 75 to 58 as norepinephrine goes up; SpO₂ recovers to
// 94% after FiO₂ goes to 60% about 3 hours ago, then falls back to 89%; HR climbs to 128 and RR to 32. Her last
// temperature is 92 min old (Stale). EtCO₂ has a 2-hour gap while the sensor was off.

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

/** The start of the hour `hoursBack` hours ago. */
function hourMark(hoursBack: number) {
	const date = new Date();
	date.setMinutes(0, 0, 0);
	date.setHours(date.getHours() - hoursBack);
	return date.toISOString();
}

/**
 * 24 hourly readings, oldest first: one at the start of each past hour and the newest 2 min ago. `null` is a missing
 * reading.
 */
const hourly = (values: (number | null)[], diastolic?: number[]): VitalReading[] =>
	values.flatMap((value, index) =>
		value === null
			? []
			: [
					{
						at: index === values.length - 1 ? minutesAgo(2) : hourMark(values.length - 1 - index),
						value,
						...(diastolic ? { diastolic: diastolic[index] } : {}),
					},
				],
	);

const systolic = [108, 106, 107, 105, 104, 103, 104, 102, 100, 99, 98, 97, 96, 95, 94, 92, 91, 90, 88, 87, 86, 85, 84, 82];
const diastolic = [58, 57, 58, 57, 56, 56, 55, 55, 54, 54, 53, 53, 52, 52, 51, 51, 50, 49, 49, 48, 48, 47, 47, 46];
// MAP is (systolic + 2 × diastolic) / 3, as on Monitoring.
const map = systolic.map((value, index) => Math.round((value + 2 * diastolic[index]) / 3));

const millerVitals: PatientVitals = {
	series: [
		{
			parameter: "hr",
			source: "Monitor",
			limits: [50, 120],
			staleAfterMinutes: 10,
			chartedEveryMinutes: 60,
			readings: hourly([104, 105, 103, 106, 108, 107, 109, 110, 108, 111, 112, 113, 114, 116, 115, 117, 118, 120, 121, 122, 124, 125, 127, 128]),
		},
		{
			parameter: "bp",
			source: "Arterial line",
			limits: [90, 160],
			staleAfterMinutes: 10,
			chartedEveryMinutes: 60,
			readings: hourly(systolic, diastolic),
		},
		{
			parameter: "map",
			source: "Arterial line",
			limits: [65, 110],
			staleAfterMinutes: 10,
			chartedEveryMinutes: 60,
			readings: hourly(map),
		},
		{
			parameter: "spo2",
			source: "Monitor",
			limits: [90, 100],
			staleAfterMinutes: 10,
			chartedEveryMinutes: 60,
			readings: hourly([96, 96, 95, 96, 95, 95, 95, 94, 94, 94, 93, 93, 92, 92, 91, 91, 90, 90, 89, 90, 91, 94, 92, 89]),
		},
		{
			parameter: "rr",
			source: "Ventilator",
			limits: [8, 30],
			staleAfterMinutes: 10,
			chartedEveryMinutes: 60,
			readings: hourly([22, 22, 23, 22, 23, 24, 24, 24, 25, 25, 26, 26, 27, 27, 28, 28, 29, 29, 30, 30, 31, 31, 32, 32]),
		},
		{
			parameter: "temp",
			source: "Manual · Kevin Ortiz, RN",
			limits: [36, 38],
			staleAfterMinutes: 60,
			chartedEveryMinutes: 240,
			readings: [
				{ at: minutesAgo(1292), value: 37.6 },
				{ at: minutesAgo(1052), value: 37.9 },
				{ at: minutesAgo(812), value: 38.1 },
				{ at: minutesAgo(572), value: 38.4 },
				{ at: minutesAgo(332), value: 38.6 },
				{ at: minutesAgo(92), value: 38.9 },
			],
		},
		{
			parameter: "etco2",
			source: "Capnography",
			limits: [35, 45],
			staleAfterMinutes: 10,
			chartedEveryMinutes: 60,
			readings: hourly([38, 38, 39, 39, 39, 40, 40, 40, 41, 41, 41, 42, 42, 42, null, null, 44, 44, 44, 45, 45, 46, 46, 46]),
		},
	],
};

/* -------------------------------------------------------------------------- */
/* Builders for the other patients                                            */
/* -------------------------------------------------------------------------- */

const limits = {
	hr: [50, 120],
	bp: [90, 160],
	map: [65, 110],
	spo2: [90, 100],
	rr: [8, 30],
	temp: [36, 38],
	etco2: [35, 45],
} satisfies Record<VitalSeries["parameter"], [number, number]>;

/**
 * 24 hourly values from `start` to `end`, with a small deterministic wobble (none on the last, which matches the
 * monitor). Hours before ICU admission (`hours` back) are missing. More than two values are the hourly readings
 * themselves, oldest first, ending now.
 */
function trend(course: number[], wobble: number, seed: number, hours = 24): (number | null)[] {
	if (course.length > 2) return [...Array<null>(24 - course.length).fill(null), ...course];
	const [start, end] = course;
	const first = 24 - hours;
	return Array.from({ length: 24 }, (_, index) => {
		if (index < first) return null;
		const progress = first === 23 ? 1 : (index - first) / (23 - first);
		const noise = index === 23 ? 0 : Math.sin(index * 0.9 + seed) * wobble + Math.sin(index * 2.3 + seed * 3) * (wobble / 3);
		return Math.round(start + (end - start) * progress + noise);
	});
}

/** A series that stopped reporting `minutes` ago: its latest value moves to just before then, and nothing comes after. */
function stoppedFor(readings: VitalReading[], minutes: number) {
	const latest = readings.at(-1);
	const before = readings.filter((reading) => Date.parse(reading.at) <= Date.now() - minutes * 60_000);
	return latest ? [...before.slice(0, -1), { ...latest, at: minutesAgo(minutes + 1) }] : before;
}

type VitalsSpec = {
	seed: number;
	/** Hours since ICU admission, when under 24. */
	hours?: number;
	/** `[start, end]`, or every hourly reading (see `trend`). */
	hr: number[];
	systolic: number[];
	diastolic: number[];
	spo2: number[];
	rr: number[];
	/** Intubated: end-tidal CO₂ from capnography. */
	etco2?: [number, number];
	/** An arterial line, or a cuff. */
	arterialLine: boolean;
	/** On a ventilator or NIV, which reports RR. */
	ventilated: boolean;
	/** The bedside nurse who charts temperature, and the readings every 4 h, oldest first, the last `lastTemp` min ago. */
	nurse: string;
	temps: number[];
	lastTemp: number;
	/** Minutes since SpO₂ or RR stopped reporting. */
	spo2Stopped?: number;
	rrStopped?: number;
};

function buildVitals(spec: VitalsSpec): PatientVitals {
	const { seed, hours } = spec;
	const systolic = trend(spec.systolic, 2.5, seed, hours);
	const diastolic = trend(spec.diastolic, 1.5, seed + 1, hours);
	const map = systolic.map((value, index) =>
		value === null || diastolic[index] === null ? null : Math.round((value + 2 * (diastolic[index] ?? 0)) / 3),
	);
	const bpSource = spec.arterialLine ? "Arterial line" : "Cuff";
	const monitored = { staleAfterMinutes: 10, chartedEveryMinutes: 60 };
	const spo2 = hourly(trend(spec.spo2, 0.7, seed + 2, hours).map((value) => (value === null ? null : Math.min(100, value))));
	const rr = hourly(trend(spec.rr, 0.8, seed + 3, hours));
	const temps = spec.temps.slice(-Math.ceil((hours ?? 24) / 4));

	const series: VitalSeries[] = [
		{ parameter: "hr", source: "Monitor", limits: limits.hr, ...monitored, readings: hourly(trend(spec.hr, 2, seed, hours)) },
		{
			parameter: "bp",
			source: bpSource,
			limits: limits.bp,
			...monitored,
			readings: hourly(
				systolic,
				diastolic.map((value) => value ?? 0),
			),
		},
		{ parameter: "map", source: bpSource, limits: limits.map, ...monitored, readings: hourly(map) },
		{
			parameter: "spo2",
			source: "Monitor",
			limits: limits.spo2,
			...monitored,
			readings: spec.spo2Stopped ? stoppedFor(spo2, spec.spo2Stopped) : spo2,
		},
		{
			parameter: "rr",
			source: spec.ventilated ? "Ventilator" : "Monitor",
			limits: limits.rr,
			...monitored,
			readings: spec.rrStopped ? stoppedFor(rr, spec.rrStopped) : rr,
		},
		{
			parameter: "temp",
			source: `Manual · ${spec.nurse}, RN`,
			limits: limits.temp,
			staleAfterMinutes: 60,
			chartedEveryMinutes: 240,
			readings: temps.map((value, index) => ({ at: minutesAgo(spec.lastTemp + (temps.length - 1 - index) * 240), value })),
		},
	];
	if (spec.etco2) {
		series.push({
			parameter: "etco2",
			source: "Capnography",
			limits: limits.etco2,
			...monitored,
			readings: hourly(trend(spec.etco2, 0.8, seed + 4, hours)),
		});
	}
	return { series };
}

/* -------------------------------------------------------------------------- */
/* Patients                                                                   */
/* -------------------------------------------------------------------------- */

const sampleVitalsByPatient: Record<string, PatientVitals> = {
	p1: millerVitals,
	// Johnson: severe ARDS from influenza, desaturating on FiO₂ 80% with permissive hypercapnia.
	p2: buildVitals({
		seed: 2,
		hr: [104, 118],
		systolic: [112, 104],
		diastolic: [60, 56],
		spo2: [92, 84],
		rr: [24, 28],
		etco2: [44, 52],
		arterialLine: true,
		ventilated: true,
		nurse: "Aisha Bello",
		temps: [38.6, 38.9, 38.4, 38.7, 38.5, 38.8],
		lastTemp: 50,
	}),
	// Davis: septic shock improving on day 3 of ceftriaxone; norepinephrine coming down.
	p3: buildVitals({
		seed: 3,
		hr: [108, 94],
		systolic: [88, 98],
		diastolic: [48, 53],
		spo2: [92, 93],
		rr: [20, 18],
		etco2: [40, 38],
		arterialLine: true,
		ventilated: true,
		nurse: "Tom Becker",
		temps: [38.3, 38.1, 37.9, 37.7, 37.5, 37.4],
		lastTemp: 70,
	}),
	// Thompson: cardiogenic shock, pressure sagging over the last hours as norepinephrine goes up.
	p4: buildVitals({
		seed: 4,
		hr: [84, 88],
		systolic: [104, 96],
		diastolic: [56, 51],
		spo2: [95, 95],
		rr: [18, 18],
		arterialLine: true,
		ventilated: false,
		nurse: "Grace Okafor",
		temps: [36.8, 36.7, 36.9, 36.8, 36.6, 36.8],
		lastTemp: 40,
	}),
	// Carter: status asthmaticus easing on BiPAP; SpO₂ stopped reporting 14 min ago.
	p5: buildVitals({
		seed: 5,
		hours: 19,
		hr: [124, 102],
		systolic: [128, 112],
		diastolic: [72, 64],
		spo2: [90, 94],
		rr: [30, 24],
		arterialLine: false,
		ventilated: true,
		nurse: "Kevin Ortiz",
		temps: [37.2, 37.1, 37.3, 37.0, 37.1, 37.0],
		lastTemp: 120,
		spo2Stopped: 14,
	}),
	// Anderson: post-op day 2, hemodynamically steady.
	p6: buildVitals({
		seed: 6,
		hr: [78, 72],
		systolic: [134, 128],
		diastolic: [68, 64],
		spo2: [96, 97],
		rr: [16, 14],
		arterialLine: false,
		ventilated: false,
		nurse: "Lucy Nguyen",
		temps: [37.4, 37.6, 37.3, 37.5, 37.2, 37.3],
		lastTemp: 30,
	}),
	// Taylor: improving after Hartmann's; fever settling, off oxygen.
	p7: buildVitals({
		seed: 7,
		hr: [98, 84],
		systolic: [112, 120],
		diastolic: [60, 63],
		spo2: [94, 96],
		rr: [20, 16],
		arterialLine: false,
		ventilated: false,
		nurse: "Hannah Cole",
		temps: [38.1, 37.9, 37.7, 37.5, 37.3, 37.2],
		lastTemp: 55,
	}),
	// Wilson: stable after the ulcer was clipped and one unit went in.
	p8: buildVitals({
		seed: 8,
		hr: [92, 76],
		systolic: [112, 128],
		diastolic: [64, 71],
		spo2: [98, 98],
		rr: [16, 15],
		arterialLine: false,
		ventilated: false,
		nurse: "Rosa Delgado",
		temps: [36.9, 37.0, 36.8, 36.9, 37.0, 36.9],
		lastTemp: 100,
	}),
	// Harris: aspiration pneumonia getting worse; febrile, pressure drifting down, PEEP below its order.
	p9: buildVitals({
		seed: 9,
		hr: [98, 112],
		systolic: [104, 92],
		diastolic: [56, 50],
		spo2: [94, 91],
		rr: [22, 26],
		etco2: [42, 47],
		arterialLine: true,
		ventilated: true,
		nurse: "Kevin Ortiz",
		temps: [38.0, 38.1, 38.3, 38.2, 38.5, 38.6],
		lastTemp: 45,
	}),
	// Moore: after debridement, MAP 61 as norepinephrine doubled; febrile.
	p10: buildVitals({
		seed: 10,
		hr: [102, 98],
		systolic: [100, 88],
		diastolic: [54, 48],
		spo2: [96, 96],
		rr: [20, 19],
		arterialLine: true,
		ventilated: false,
		nurse: "Rosa Delgado",
		temps: [38.8, 38.6, 38.9, 38.5, 38.7, 38.4],
		lastTemp: 65,
	}),
	// Clark: severe preeclampsia, pressure climbing on nicardipine.
	p11: buildVitals({
		seed: 11,
		hr: [88, 92],
		systolic: [146, 162],
		diastolic: [86, 96],
		spo2: [98, 98],
		rr: [18, 20],
		arterialLine: true,
		ventilated: false,
		nurse: "Amara Diallo",
		temps: [37.9, 37.6, 37.8, 37.5, 37.7, 37.6],
		lastTemp: 35,
	}),
	// Whitfield: after thrombectomy, pressure kept down; RR stopped reporting 27 min ago.
	p12: buildVitals({
		seed: 12,
		hr: [82, 80],
		systolic: [118, 104],
		diastolic: [66, 59],
		spo2: [95, 94],
		rr: [16, 16],
		arterialLine: false,
		ventilated: false,
		nurse: "Amara Diallo",
		temps: [37.1, 37.0, 37.2, 37.1, 37.0, 37.1],
		lastTemp: 85,
		rrStopped: 27,
	}),
	// Walker: on VA-ECMO, MAP 55 and HR 134 after the flow cut; low EtCO₂ is expected on ECMO.
	p13: buildVitals({
		seed: 13,
		hr: [118, 134],
		systolic: [92, 84],
		diastolic: [48, 41],
		spo2: [97, 94],
		rr: [14, 22],
		etco2: [28, 30],
		arterialLine: true,
		ventilated: true,
		nurse: "Grace Okafor",
		temps: [36.6, 36.5, 36.7, 36.6, 36.5, 36.6],
		lastTemp: 25,
	}),
	// Bennett: admitted 5 h ago in rapid AF, rate controlled on diltiazem.
	p14: buildVitals({
		seed: 14,
		hours: 5,
		hr: [148, 88],
		systolic: [98, 110],
		diastolic: [58, 61],
		spo2: [96, 97],
		rr: [22, 17],
		arterialLine: false,
		ventilated: false,
		nurse: "Lucy Nguyen",
		temps: [36.9, 37.0],
		lastTemp: 60,
	}),
	// Hayes: heart failure getting worse overnight on the med-surg floor, admitted 20 h ago. Hour by hour, so her NEWS2
	// crosses 7 only now (Scenario 1, 01:40): 4 on admission, 5 through the night as HR creeps up and SpO₂ holds at
	// 92–93% while her oxygen goes 2 → 4 L, then 10 in the last hour, with RR 20 → 26, SpO₂ 89% and HR 112. BP stays
	// up, so a nitrate is an option.
	p15: buildVitals({
		seed: 15,
		hours: 20,
		hr: [92, 93, 92, 94, 93, 95, 96, 95, 97, 98, 99, 100, 101, 102, 103, 104, 104, 105, 106, 112],
		systolic: [138, 137, 139, 138, 140, 139, 141, 140, 142, 141, 143, 142, 144, 143, 145, 144, 146, 145, 147, 148],
		diastolic: [80, 80, 81, 80, 81, 81, 82, 81, 82, 82, 83, 82, 83, 83, 84, 84, 85, 84, 85, 86],
		spo2: [94, 94, 95, 94, 94, 94, 93, 93, 93, 93, 93, 93, 93, 92, 92, 93, 92, 92, 92, 89],
		rr: [18, 18, 17, 18, 18, 18, 18, 19, 18, 19, 19, 19, 19, 19, 20, 20, 19, 20, 20, 26],
		arterialLine: false,
		ventilated: false,
		nurse: "Kayla Brandt",
		temps: [36.7, 36.8, 36.6, 36.7, 36.8],
		lastTemp: 40,
	}),
};

export { sampleVitalsByPatient };
