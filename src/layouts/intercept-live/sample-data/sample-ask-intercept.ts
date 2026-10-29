import { defaultMonitorLimits, type MonitorVitals } from "@/components/cards/patient-monitoring-card";

import type { AskInterceptAnswer, AskInterceptContext, AskInterceptResponder } from "../ask-intercept-panel";
import type { CensusPatient } from "../census/census-panel";
import { samplePatients } from "../census/sample-census";
import { sampleMonitoringAlerts, sampleMonitoringPatients } from "../monitoring/sample-monitoring";
import { compareTriageAlerts, isOpenAlert, type TriageAlert } from "../monitoring/triage-queue";
import type { PatientRecord } from "../patient-details/patient-details";
import { samplePatientRecords } from "../patient-details/sample-patient-details";
import { sampleHospitals, sampleTeam, sampleUser } from "./sample-workspace";

// Synthetic Ask Intercept Live (PRD Patient details PD-100): a stand-in for the Conversational Clinical Data Agent that
// answers from every sample file: the census, the monitoring panel's live values and alerts, each patient's record and
// sections (vitals, chart, timeline, medications, orders, EMR, notes, sepsis, camera), the hospitals, the user and the
// team. It works out who a question is about (a patient it names, else the patient on screen, else the census, narrowed
// by hospital, unit or "my patients") and what it's about, then builds the answer from the data, naming its sources.
// Within the agent's limits (Spec §8.7): it retrieves and summarizes, never diagnoses or recommends therapy, and says when
// the data can't answer. The real agent replaces all of this.

/* -------------------------------------------------------------------------- */
/* The data, joined per patient                                               */
/* -------------------------------------------------------------------------- */

type Patient = {
	census: CensusPatient;
	vitals?: MonitorVitals;
	record?: PatientRecord;
	alerts: TriageAlert[];
};

const patients: Patient[] = samplePatients.map((census) => ({
	census,
	vitals: sampleMonitoringPatients.find((item) => item.id === census.id)?.vitals,
	record: samplePatientRecords.find((item) => item.id === census.id),
	alerts: sampleMonitoringAlerts.filter((alert) => alert.patientId === census.id && isOpenAlert(alert)).sort(compareTriageAlerts),
}));

/* -------------------------------------------------------------------------- */
/* Words                                                                      */
/* -------------------------------------------------------------------------- */

const MINUTE = 60_000;

/** "just now", "12 min ago", "2 h 5 min ago", "yesterday", "3 days ago". */
function ago(iso: string) {
	const minutes = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / MINUTE));
	if (minutes < 1) return "just now";
	if (minutes < 60) return `${minutes} min ago`;
	if (minutes < 24 * 60) return `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} min` : ""} ago`;
	const days = Math.floor(minutes / (24 * 60));
	return days === 1 ? "yesterday" : `${days} days ago`;
}

/** "in 40 min" or "15 min overdue". */
function due(iso: string) {
	const minutes = Math.round((Date.parse(iso) - Date.now()) / MINUTE);
	if (minutes < 0) return `${-minutes < 60 ? `${-minutes} min` : `${Math.floor(-minutes / 60)} h ${-minutes % 60} min`} overdue`;
	return `in ${minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`}`;
}

const clock = (iso: string) => new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(iso));

// A patient's name is always bold in an answer, full ("**Miller, Sarah**") or first ("**Sarah**"), so it's found at a
// glance; `fullName` is the plain form, for matching.
const fullName = ({ census }: Patient) => `${census.lastName}, ${census.firstName}`;
const patientName = (patient: Patient) => `**${fullName(patient)}**`;
const firstName = ({ census }: Patient) => `**${census.firstName ?? census.lastName}**`;
const where = ({ census }: Patient) => [census.unit, census.bed].filter(Boolean).join(" ");
/** "**Miller, Sarah** (MICU Bed 11)". */
const who = (patient: Patient) => `${patientName(patient)} (${where(patient)})`;

const severityWords = { critical: "Critical", high: "High", medium: "Medium", low: "Low" } as const;
const levelWords = { low: "Low risk", moderate: "Moderate risk", high: "High risk", critical: "Critical risk", unknown: "Unknown risk" };
const flagWords = { high: "high", low: "low", critical: "critical" } as const;

const list = (items: string[]) => items.map((item) => `- ${item}`).join("\n");
const unique = (items: (string | undefined)[]) => [...new Set(items.filter((item): item is string => Boolean(item)))];
const sentence = (text: string) => text.split(/(?<=\.)\s/)[0];
/** Lowercases a label's first letter to run on in a sentence, unless it starts an abbreviation ("ABG", "SpO₂"). */
const runOn = (label: string) => (/^[A-Z][a-z]/.test(label) && !/^[A-Z][a-z]?[A-Z₀-₉]/.test(label) ? label.charAt(0).toLowerCase() + label.slice(1) : label);

/** A list of at most `max` items, then how many more there are. */
function capped(items: string[], max = 8) {
	return items.length > max ? `${list(items.slice(0, max))}\n…and ${items.length - max} more.` : list(items);
}

/** "A, B and C". */
function joinWords(items: string[]) {
	return items.length > 1 ? `${items.slice(0, -1).join(", ")} and ${items.at(-1)}` : (items[0] ?? "");
}

/* -------------------------------------------------------------------------- */
/* Who the question is about                                                  */
/* -------------------------------------------------------------------------- */

/** Patients the question names: by last name, by first name, or by "bed 11". */
function namedPatients(question: string) {
	const lower = question.toLowerCase();
	return patients.filter(({ census }) => {
		const names = [census.lastName, census.firstName].filter(Boolean).map((name) => name!.toLowerCase());
		return (
			names.some((name) => new RegExp(`\\b${name}\\b`).test(lower)) ||
			(census.bed !== undefined && census.unit !== undefined && lower.includes(`${census.unit.toLowerCase()} ${census.bed.toLowerCase()}`))
		);
	});
}

/** The census, narrowed by a hospital, a unit or "my patients" the question mentions. */
function censusScope(question: string) {
	const lower = question.toLowerCase();
	let scope = patients;
	const labels: string[] = [];
	const hospital = sampleHospitals.find(
		(item) => lower.includes(item.name.toLowerCase()) || lower.includes(item.name.split(" ")[0].toLowerCase()) || lower.includes(item.id),
	);
	if (hospital) {
		scope = scope.filter(({ census }) => census.hospitalId === hospital.id);
		labels.push(`at ${hospital.name}`);
	}
	const unit = unique(patients.map(({ census }) => census.unit)).find((name) => new RegExp(`\\b${name.toLowerCase()}\\b`).test(lower));
	if (unit) {
		scope = scope.filter(({ census }) => census.unit === unit);
		labels.push(`in the ${unit}`);
	}
	// "my patients", not "my shift".
	if (/\b(my patients|mine|assigned to me|my census)\b/.test(lower)) {
		scope = scope.filter(({ census }) => census.mine);
		labels.push("assigned to you");
	}
	return { scope, label: labels.join(" ") };
}

/* -------------------------------------------------------------------------- */
/* What it's about                                                            */
/* -------------------------------------------------------------------------- */

// Short names and words clinicians use for the results in the charts.
const labAliases: Record<string, RegExp> = {
	Potassium: /\b(k|potassium)\b/,
	Hemoglobin: /\b(hgb|hb|hemoglobin|haemoglobin)\b/,
	Creatinine: /\b(cr|creat|creatinine|kidney function)\b/,
	Platelets: /\b(plt|platelets?)\b/,
	WBC: /\b(wbc|white (blood )?count|white cells?)\b/,
	Procalcitonin: /\b(pct|procalcitonin)\b/,
	Sodium: /\b(na|sodium)\b/,
	Magnesium: /\b(mg|magnesium|mag)\b/,
	Lactate: /\b(lactate|lactic)\b/,
	Glucose: /\b(glucose|sugar|bg)\b/,
};

/** The chart results the question names, from every patient's chart. */
function namedLabs(question: string) {
	const lower = question.toLowerCase();
	const names = unique(
		patients.flatMap(({ record }) => [
			...(record?.chart?.panels.flatMap((panel) => panel.results.map((result) => result.name)) ?? []),
			...(record?.labs?.map((lab) => lab.name) ?? []),
		]),
	);
	return names.filter((name) => (labAliases[name] ?? new RegExp(`\\b${name.toLowerCase().replace(/[^a-z0-9 ]/g, ".")}\\b`)).test(lower));
}

// Drug groups clinicians ask about.
const drugGroups: Record<string, RegExp> = {
	pressors: /norepinephrine|epinephrine|vasopressin|phenylephrine|dopamine|dobutamine|milrinone/i,
	sedation: /propofol|midazolam|dexmedetomidine|fentanyl|ketamine|lorazepam|hydromorphone/i,
	antibiotics: /vancomycin|aztreonam|cefepime|ceftriaxone|meropenem|piperacillin|azithromycin|ampicillin|clindamycin|cefazolin|metronidazole|oseltamivir/i,
};
const drugAliases: Record<string, RegExp> = { Norepinephrine: /\b(norepi|levo|levophed)\b/i, Vasopressin: /\bvaso\b/i };

/** The drugs the question names, from every patient's medications. */
function namedDrugs(question: string) {
	const lower = question.toLowerCase();
	const drugs = unique(
		patients.flatMap(({ record }) => [
			...(record?.medications?.continuous.map((item) => item.drug) ?? []),
			...(record?.medications?.scheduled.map((item) => item.drug) ?? []),
			...(record?.medications?.prn.map((item) => item.drug) ?? []),
		]),
	);
	return drugs.filter((drug) => lower.includes(drug.split(/[ ,(]/)[0].toLowerCase()) || drugAliases[drug]?.test(lower));
}

type Topic =
	| "shift"
	| "help"
	| "summary"
	| "changes"
	| "attention"
	| "alerts"
	| "vitals"
	| "outside-limits"
	| "labs"
	| "pending"
	| "cultures"
	| "imaging"
	| "meds"
	| "due"
	| "ventilator"
	| "orders"
	| "notes"
	| "sepsis"
	| "team"
	| "safety"
	| "diagnosis"
	| "history"
	| "camera"
	| "emr"
	| "events"
	| "gaps"
	| "count";

// In order: the first that matches wins, so specific topics come before general ones.
const topics: [Topic, RegExp][] = [
	["shift", /shift|brief me|catch me up|up to speed|start of (my|the) day|morning report|sign.?out/i],
	["help", /^(hi|hello|hey|help|what can you|how do (i|you)|who are you)/i],
	["attention", /attention|first|priorit|sickest|worst|most urgent|who should i|triage|deteriorat|unstable/i],
	["gaps", /gap|not reporting|missing|stale|no data|offline|disconnect/i],
	["outside-limits", /outside( the)? limits|out of range|abnormal vitals|hypotens|tachy|brady|desat|low map|map (under|below)|hypox/i],
	["sepsis", /sepsis|sirs|sep-1|bundle|septic/i],
	["pending", /pending|waiting (on|for)|not (back|resulted)/i],
	["cultures", /culture|micro|organism|gram|grew|growth|susceptib|sensitiv/i],
	["imaging", /imaging|x-?ray|\bcxr\b|\bct\b|scan|echo|ultrasound|radiolog/i],
	["due", /due|overdue|next dose|missed/i],
	["ventilator", /vent|fio2|fio₂|peep|abg|blood gas|intubat|airway|bipap|niv|oxygen|cannula|breathing support/i],
	["orders", /order|recommendation|suggest/i],
	["notes", /note|documentation|h&p|progress|wrote|charted|scribe/i],
	["camera", /camera|look in|huddle|session|\broom\b|at the bedside|bedside now|video/i],
	["emr", /epic|emr|ehr|write.?back|feed|sync|connection|interface/i],
	["team", /team|nurse|attending|doctor|physician|who('s| is) (on|caring|looking)|contact|covering|staff/i],
	["safety", /allerg|code status|\bdnr\b|\bdni\b|full code|isolation|precaution/i],
	["history", /history|home med|social|smok|alcohol|surgical|past medical|\bpmh\b/i],
	["diagnosis", /diagnos|problem|why (is|was) .* (here|admitted)|admitted for|reason for/i],
	["meds", /med|drug|infusion|drip|pressor|sedat|antibiotic|pump|dose|insulin|heparin/i],
	["labs", /lab|result|level|value|trend/i],
	["vitals", /vital|heart rate|\bhr\b|blood pressure|\bbp\b|\bmap\b|spo2|spo₂|sat|resp|\brr\b|temp|fever|etco2/i],
	["alerts", /alert|alarm|concern|flag/i],
	["events", /event|timeline|what happened|overnight|today/i],
	["changes", /chang|since|new|latest|recent|last (hour|look)|update|anything/i],
	["count", /how many|count|number of|census|list (all|the|my)|who('s| is) on/i],
	["summary", /summar|overview|status|how is|how's|tell me about|doing|condition|24|story/i],
];

function topicOf(question: string, hasPatient: boolean): Topic | undefined {
	if (namedLabs(question).length && !/culture/i.test(question)) return "labs";
	if (namedDrugs(question).length || /pressor|sedat|antibiotic/i.test(question)) {
		const matched = topics.find(([, pattern]) => pattern.test(question))?.[0];
		return matched === "due" ? "due" : "meds";
	}
	const matched = topics.find(([, pattern]) => pattern.test(question))?.[0];
	return matched ?? (hasPatient ? "summary" : undefined);
}

/* -------------------------------------------------------------------------- */
/* Answers about one patient                                                  */
/* -------------------------------------------------------------------------- */

function vitalLines(patient: Patient) {
	const live = patient.vitals;
	const series = patient.record?.vitals?.series ?? [];
	const latest = (parameter: string) => series.find((item) => item.parameter === parameter)?.readings.at(-1);
	const lines: string[] = [];
	if (live?.hr !== undefined) lines.push(`Heart rate ${live.hr}${live.hr > defaultMonitorLimits.hr[1] ? " (above 120)" : live.hr < defaultMonitorLimits.hr[0] ? " (below 50)" : ""}`);
	if (live?.systolic !== undefined) lines.push(`Blood pressure ${live.systolic}/${live.diastolic}, MAP ${live.map}${(live.map ?? 99) < 65 ? " (under 65)" : ""}`);
	if (live?.spo2 !== undefined) lines.push(`SpO₂ ${live.spo2}%${live.spo2 < defaultMonitorLimits.spo2[0] ? " (below 90)" : ""}`);
	else lines.push("SpO₂ isn't reporting");
	if (live?.rr !== undefined) lines.push(`Respiratory rate ${live.rr}${live.rr > defaultMonitorLimits.rr[1] ? " (above 30)" : ""}`);
	else lines.push("Respiratory rate isn't reporting");
	const temp = latest("temp");
	if (temp) lines.push(`Temperature ${temp.value} °C, ${ago(temp.at)}${Date.now() - Date.parse(temp.at) > 60 * MINUTE ? " (stale)" : ""}`);
	const etco2 = latest("etco2");
	if (etco2) lines.push(`EtCO₂ ${etco2.value}`);
	return lines;
}

/** The trend of one vital over the last 12 hours, from the charted series. */
function vitalTrend(patient: Patient, parameter: "hr" | "map" | "spo2" | "rr" | "temp") {
	const readings = patient.record?.vitals?.series.find((item) => item.parameter === parameter)?.readings ?? [];
	const recent = readings.filter((reading) => Date.now() - Date.parse(reading.at) <= 12 * 60 * MINUTE);
	if (recent.length < 2) return undefined;
	const first = recent[0].value;
	const last = recent.at(-1)!.value;
	const values = recent.map((reading) => reading.value);
	return `${first} → ${last} over 12 h (range ${Math.min(...values)}–${Math.max(...values)})`;
}

function labLines(patient: Patient, names?: string[]) {
	const chart = patient.record?.chart;
	const results = chart?.panels.flatMap((panel) => panel.results) ?? [];
	const keyLabs = patient.record?.labs ?? [];
	const wanted = names?.length ? names : keyLabs.map((lab) => lab.name);
	return wanted.flatMap((name) => {
		const result = results.find((item) => item.name === name);
		const lab = keyLabs.find((item) => item.name === name);
		const value = result?.value ?? lab?.value;
		const unit = result?.unit ?? lab?.unit ?? "";
		const flag = result?.flag ?? lab?.flag;
		const at = result?.resultedAt ?? lab?.resultedAt;
		const previous = result?.previous ?? lab?.previous;
		if (!result && !lab) return [];
		if (value === undefined) {
			const collected = result?.collectedAt ?? lab?.collectedAt;
			return [`**${name}**: ${result?.status === "none" ? "no result in 24 h" : `pending${collected ? `, collected ${ago(collected)}` : ""}`}`];
		}
		return [
			`**${name}** ${value}${unit ? ` ${unit}` : ""}${flag ? ` (${flagWords[flag]})` : ""}${previous ? `, ${Number.parseFloat(value) > Number.parseFloat(previous.value) ? "up" : Number.parseFloat(value) < Number.parseFloat(previous.value) ? "down" : "unchanged"} from ${previous.value}` : ""}${at ? `, ${ago(at)}` : ""}${result?.range ? `. Range ${result.range}` : ""}`,
		];
	});
}

function medLines(patient: Patient, filter?: RegExp, names?: string[]) {
	const meds = patient.record?.medications;
	if (!meds) return [];
	const pick = (drug: string) => (!filter && !names?.length) || filter?.test(drug) || names?.includes(drug);
	return [
		...meds.continuous
			.filter((item) => pick(item.drug))
			.map(
				(item) =>
					`**${item.drug}** ${item.pumpRate ?? "rate unavailable"} (infusion)${item.change ? `, ${item.change.direction} from ${item.change.from} ${ago(item.change.at)}` : ""}${item.orderedRate ? `. Ordered ${item.orderedRate}` : ""}`,
			),
		...meds.scheduled
			.filter((item) => pick(item.drug))
			.map(
				(item) =>
					`**${item.drug}** ${item.dose} ${item.route} ${item.frequency.toLowerCase()}${item.lastGivenAt ? `, last given ${ago(item.lastGivenAt)}` : ""}${item.nextDueAt ? `, next ${due(item.nextDueAt)}` : ""}`,
			),
		...meds.prn
			.filter((item) => pick(item.drug))
			.map(
				(item) =>
					`**${item.drug}** ${item.dose} ${item.route} as needed${item.givenLast24h ? `, given ${item.givenLast24h} time${item.givenLast24h === 1 ? "" : "s"} in 24 h` : ", not given in 24 h"}`,
			),
	];
}

function summaryOf(patient: Patient): AskInterceptAnswer {
	const { census, record } = patient;
	const acuity = census.acuity?.level ? `${levelWords[census.acuity.level]}${census.acuity.score !== undefined ? `, SOFA ${census.acuity.score}` : ""}` : "Acuity unknown";
	const trend = census.trajectory?.value && census.trajectory.value !== "0" ? ` (${census.trajectory.value} in 24 h)` : "";
	const lines = [
		record?.diagnosis ? `**Diagnosis:** ${record.diagnosis}${record.icuAdmittedAt ? `, ICU day ${Math.floor((Date.now() - Date.parse(record.icuAdmittedAt)) / (24 * 60 * MINUTE)) + 1}` : ""}` : undefined,
		`**Acuity:** ${acuity}${trend}`,
		patient.alerts.length
			? `**Alerts:** ${patient.alerts.map((alert) => `${alert.title} (${severityWords[alert.severity]})`).join("; ")}`
			: "**Alerts:** none open",
		`**Vitals:** ${vitalLines(patient).slice(0, 4).join(", ")}`,
		record?.ventilator ? `**Breathing:** ${[record.ventilator.support, record.ventilator.mode].filter(Boolean).join(", ")}${record.ventilator.settings.length ? `, ${record.ventilator.settings.slice(0, 2).map((setting) => `${setting.label} ${setting.value}${setting.unit ? ` ${setting.unit}` : ""}`).join(", ")}` : ""}` : undefined,
		record?.infusions?.length ? `**Infusions:** ${record.infusions.map((item) => `${item.drug} ${item.rate ?? "rate unavailable"}`).join(", ")}` : undefined,
		record?.labs?.length
			? `**Labs:** ${record.labs.filter((lab) => lab.flag).map((lab) => `${lab.name} ${lab.value}${lab.unit ? ` ${lab.unit}` : ""}`).join(", ") || "nothing flagged"}`
			: undefined,
	].filter((line): line is string => Boolean(line));
	return {
		text: `${record?.brief ? `${record.brief.text}\n` : ""}${list(lines)}`,
		sources: ["Census", "Monitor", "Alerts", "Lab", "Pump", ...(record?.ventilator ? [record.ventilator.source] : [])],
	};
}

function changesFor(patient: Patient, since: number, label: string): AskInterceptAnswer {
	const events = (patient.record?.timeline?.events ?? []).filter((event) => Date.parse(event.at) >= since).sort((a, b) => b.at.localeCompare(a.at));
	const alerts = patient.alerts.filter((alert) => Date.parse(alert.firedAt) >= since);
	const lines = [
		...alerts.map((alert) => `${alert.title} (${severityWords[alert.severity]} alert), ${ago(alert.firedAt)}`),
		...events.filter((event) => event.kind !== "alert").map((event) => `${event.label}, ${ago(event.at)}`),
	];
	if (!lines.length) return { text: `Nothing new for ${firstName(patient)} ${label}. ${sentence(vitalLines(patient).join(", "))}.`, sources: ["Timeline", "Alerts"] };
	return { text: `For ${firstName(patient)} ${label}:\n${list(lines.slice(0, 8))}`, sources: ["Timeline", "Alerts"] };
}

function sepsisFor(patient: Patient): AskInterceptAnswer {
	const sepsis = patient.record?.sepsis;
	if (!sepsis) {
		const labs = labLines(patient, ["Lactate", "WBC"]);
		return {
			text: `${firstName(patient)} isn't under sepsis screening. The values sepsis screening looks at:\n${list([...vitalLines(patient).slice(0, 4), ...labs])}`,
			sources: ["Monitor", "Lab"],
		};
	}
	const describe = (criterion: (typeof sepsis.sirs)[number]) =>
		`${criterion.status === "met" ? "Met" : criterion.status === "missing" ? "Missing" : "Not met"}: ${criterion.label}${criterion.value ? ` (${criterion.value}${criterion.stale ? ", stale" : ""})` : criterion.missingLabel ? ` (${criterion.missingLabel.toLowerCase()})` : ""}`;
	const sirsMet = sepsis.sirs.filter((criterion) => criterion.status === "met").length;
	const organMet = sepsis.organDysfunction.filter((criterion) => criterion.status === "met").length;
	const open = sepsis.bundle.filter((element) => element.status === "due");
	const state = { candidate: "a sepsis candidate, waiting for validation", tracking: "validated and tracking", rejected: "rejected", excluded: "excluded" }[sepsis.state];
	return {
		text: `${firstName(patient)} is ${state}. ${sepsis.agent} flagged ${patient.census.sex === "M" ? "him" : patient.census.sex === "F" ? "her" : "them"} ${ago(sepsis.flaggedAt)}; time zero ${clock(sepsis.timeZero)}.\n**${sirsMet} of ${sepsis.sirs.length} SIRS** and **${organMet} of ${sepsis.organDysfunction.length} organ dysfunction** criteria are met:\n${list([...sepsis.sirs, ...sepsis.organDysfunction].map(describe))}\n${open.length ? `Bundle elements still open: ${open.map((element) => `${element.label} (${due(element.dueAt)})`).join("; ")}.` : "Every bundle element so far is addressed."}${sepsis.state === "candidate" ? " The decision to validate is a clinician's." : ""}`,
		sources: [sepsis.agent, "Monitor", "Lab", "Pump"],
	};
}

function answerForPatient(patient: Patient, topic: Topic, question: string): AskInterceptAnswer {
	const { census, record } = patient;
	const name = firstName(patient);
	switch (topic) {
		case "summary":
			return summaryOf(patient);
		case "changes": {
			const since = /since (i|you) (last )?(look|view|review|check)/i.test(question) && record?.brief?.lastViewedAt ? Date.parse(record.brief.lastViewedAt) : Date.now() - 60 * MINUTE;
			return changesFor(patient, since, since === Date.now() - 60 * MINUTE ? "in the last hour" : `since you last looked, ${ago(record!.brief!.lastViewedAt!)}`);
		}
		case "events":
			return changesFor(patient, Date.now() - 12 * 60 * MINUTE, "in the last 12 hours");
		case "attention":
		case "alerts":
			return {
				text: patient.alerts.length
					? `${name} has ${patient.alerts.length} open alert${patient.alerts.length === 1 ? "" : "s"}:\n${list(
							patient.alerts.map(
								(alert) =>
									`**${alert.title}** (${severityWords[alert.severity]}, ${alert.source.name}), ${ago(alert.firedAt)}${alert.respondBy && Date.parse(alert.respondBy) < Date.now() ? ", overdue" : ""}${alert.carriedOver ? ", carried over from last shift" : ""}${alert.rationale ? `. "${alert.rationale}"` : ""}`,
							),
						)}`
					: `${name} has no open alerts.`,
				sources: ["Alerts"],
			};
		case "vitals":
		case "outside-limits": {
			const trend = (["map", "hr", "spo2"] as const).map((parameter) => [parameter, vitalTrend(patient, parameter)] as const).filter(([, value]) => value);
			return {
				text: `${name}'s vitals now:\n${list(vitalLines(patient))}${trend.length ? `\nOver 12 hours: ${trend.map(([parameter, value]) => `${{ map: "MAP", hr: "HR", spo2: "SpO₂" }[parameter]} ${value}`).join("; ")}.` : ""}`,
				sources: unique(["Monitor", ...(record?.vitals?.series.map((item) => item.source.split(" · ")[0]) ?? [])]),
			};
		}
		case "labs": {
			const lines = labLines(patient, namedLabs(question));
			return lines.length
				? { text: `${name}'s ${namedLabs(question).length ? "results" : "key labs"}:\n${list(lines)}`, sources: [record?.chart?.source ?? "Lab"] }
				: { text: `${name} has no ${joinWords(namedLabs(question)) || "lab"} results in the record.`, sources: ["Lab"] };
		}
		case "pending": {
			const pending = (record?.chart?.panels.flatMap((panel) => panel.results) ?? []).filter((result) => result.status === "pending" || (result.value === undefined && result.status !== "none"));
			const cultures = (record?.chart?.cultures ?? []).filter((culture) => culture.status !== "final");
			const lines = [
				...pending.map((result) => `**${result.name}**: pending${result.collectedAt ? `, collected ${ago(result.collectedAt)}` : ""}`),
				...cultures.map((culture) => `**${culture.specimen}**: ${culture.summary}`),
			];
			return { text: lines.length ? `Still waiting on, for ${name}:\n${list(lines)}` : `Nothing is pending for ${name}.`, sources: ["Lab", "Microbiology"] };
		}
		case "cultures": {
			const cultures = record?.chart?.cultures ?? [];
			return {
				text: cultures.length
					? `${name}'s cultures:\n${list(cultures.map((culture) => `**${culture.specimen}**, collected ${ago(culture.collectedAt)}: ${culture.summary}${culture.organism ? ` (${culture.organism})` : ""}${culture.susceptibilities?.length ? `. Resistant to ${culture.susceptibilities.filter((item) => item.result === "R").map((item) => item.antibiotic).join(", ") || "nothing tested"}` : ""}`))}`
					: `${name} has no cultures in the record.`,
				sources: ["Microbiology"],
			};
		}
		case "imaging": {
			const imaging = record?.chart?.imaging ?? [];
			return {
				text: imaging.length
					? `${name}'s imaging:\n${list(imaging.map((report) => `**${report.study}**, ${ago(report.performedAt)} (${report.status}): ${report.impression}`))}`
					: `${name} has no imaging reports in the record.`,
				sources: ["Radiology"],
			};
		}
		case "meds": {
			const group = Object.entries(drugGroups).find(([key]) => new RegExp(key.slice(0, -1), "i").test(question))?.[1];
			const lines = medLines(patient, group, namedDrugs(question));
			return lines.length
				? { text: `${name}'s ${group ? Object.entries(drugGroups).find(([, value]) => value === group)?.[0] : namedDrugs(question).length ? "matching medications" : "medications"}:\n${list(lines)}`, sources: ["Pump", "MAR"] }
				: { text: `${name} isn't on ${joinWords(namedDrugs(question)) || (group ? Object.entries(drugGroups).find(([, value]) => value === group)?.[0] : "that")} right now.`, sources: ["MAR"] };
		}
		case "due": {
			const scheduled = (record?.medications?.scheduled ?? []).filter((item) => item.nextDueAt && Date.parse(item.nextDueAt) - Date.now() < 2 * 60 * MINUTE).sort((a, b) => a.nextDueAt!.localeCompare(b.nextDueAt!));
			return {
				text: scheduled.length
					? `Due for ${name} in the next 2 hours:\n${list(scheduled.map((item) => `**${item.drug}** ${item.dose} ${item.route}, ${due(item.nextDueAt!)}`))}`
					: `Nothing is due for ${name} in the next 2 hours.`,
				sources: ["MAR"],
			};
		}
		case "ventilator": {
			const vent = record?.ventilator;
			if (!vent) return { text: `There's no ventilator or oxygen data for ${name}.`, sources: ["Ventilator"] };
			return {
				text: `${name} is on ${[vent.support, vent.mode].filter(Boolean).join(", ").toLowerCase()}, ${ago(vent.updatedAt)}:\n${list([
					...vent.settings.map((setting) => `${setting.label} ${setting.value}${setting.unit ? ` ${setting.unit}` : ""}${setting.set ? ` (set ${setting.set})` : ""}`),
					...(vent.abg ? [`Last ABG ${ago(vent.abg.collectedAt)}: ${vent.abg.values}`] : []),
				])}${patient.alerts.some((alert) => alert.source.name === "Vent-Order Mismatch") ? "\nVent-Order Mismatch flagged a difference from the active order." : ""}`,
				sources: [vent.source],
			};
		}
		case "orders": {
			const orders = record?.orders;
			if (!orders) return { text: `There are no orders for ${name} in the record.`, sources: ["Orders"] };
			const open = orders.recommendations.filter((item) => !item.outcome);
			return {
				text: `${open.length ? `**${open.length} open recommendation${open.length === 1 ? "" : "s"}:**\n${list(open.map((item) => `${item.title} (${item.agent}): ${item.reason}`))}\n` : "No open recommendations.\n"}**Active orders** (${orders.active.length}): ${orders.active.slice(0, 6).map((order) => order.name).join(", ")}${orders.active.length > 6 ? "…" : ""}. Orders here are read-only.`,
				sources: [orders.source, ...unique(open.map((item) => item.agent))],
			};
		}
		case "notes": {
			const notes = [...(record?.notes?.notes ?? [])].sort((a, b) => b.at.localeCompare(a.at));
			const latest = notes[0];
			return notes.length
				? {
						text: `${name} has ${notes.length} notes. The latest is the **${latest.type}** by ${latest.author.name}, ${ago(latest.at)} (${latest.status.replace(/-/g, " ")}):\n${latest.sections.map((section) => `${section.heading ? `**${section.heading}:** ` : ""}${section.text}`).join("\n")}\nOthers: ${notes.slice(1, 5).map((note) => `${note.type} (${note.author.name}, ${ago(note.at)})`).join("; ")}.`,
						sources: [record?.notes?.emr ?? "Notes"],
					}
				: { text: `There are no notes for ${name}.`, sources: ["Notes"] };
		}
		case "sepsis":
			return sepsisFor(patient);
		case "team": {
			const team = record?.careTeam ?? [];
			return {
				text: team.length
					? `${name}'s care team:\n${list(team.map((member) => `**${member.name}${member.you ? " (you)" : ""}**, ${member.role}${member.organization ? ` at ${member.organization}` : ""}${member.presence ? `, ${member.presence}` : ""}`))}`
					: `No care team is recorded for ${name}.`,
				sources: ["Care team"],
			};
		}
		case "safety":
			return {
				text: list([
					`**Code status:** ${record?.codeStatus ?? "not documented"}`,
					`**Allergies:** ${record?.allergies === undefined ? "unknown" : record.allergies.length ? (record.chart?.allergies.map((allergy) => `${allergy.substance}${allergy.reaction ? ` (${allergy.reaction}${allergy.severity ? `, ${allergy.severity}` : ""})` : ""}`).join(", ") ?? record.allergies.join(", ")) : "no known allergies"}`,
					`**Isolation:** ${record?.isolation ?? "none"}`,
				]),
				sources: ["Epic"],
			};
		case "diagnosis":
			return {
				text: `${record?.diagnosis ? `${name} was admitted ${record.admittedAt ? `${ago(record.admittedAt)} ` : ""}${record.admittedFrom ? `from the ${record.admittedFrom.toLowerCase()} ` : ""}with ${record.diagnosis.charAt(0).toLowerCase()}${record.diagnosis.slice(1)}.` : `No diagnosis is recorded for ${name}.`}${record?.chart?.problems.length ? `\nActive problems:\n${list(record.chart.problems.filter((problem) => problem.status === "active").map((problem) => problem.name))}` : ""}`,
				sources: ["Epic"],
			};
		case "history": {
			const chart = record?.chart;
			return chart
				? {
						text: list([
							`**Medical:** ${chart.medicalHistory.map((item) => item.name).join(", ") || "none recorded"}`,
							`**Surgical:** ${chart.surgicalHistory.map((item) => item.name).join(", ") || "none recorded"}`,
							`**Social:** ${chart.socialHistory.join("; ") || "none recorded"}`,
							`**Home medications:** ${chart.homeMedications.map((item) => `${item.name}${item.inpatient ? ` (${item.inpatient})` : ""}`).join(", ") || "none recorded"}`,
						]),
						sources: [chart.source],
					}
				: { text: `There's no history for ${name} in the record.`, sources: ["Epic"] };
		}
		case "camera": {
			const camera = record?.camera;
			if (!camera) return { text: `There's no camera for ${name}'s room.`, sources: ["Camera"] };
			const present = camera.people.filter((person) => !person.you);
			return {
				text: `Who's around ${name} in ${where(patient)}:\n${list(present.map((person) => `**${person.name}**, ${person.role}: ${person.activity}`))}\n${camera.sessions.length ? `Last session: ${camera.sessions[0].kind === "huddle" ? "a huddle" : "a look-in"} by ${camera.sessions[0].by}, ${ago(camera.sessions[0].startedAt)}, ${camera.sessions[0].minutes} min.` : "No camera sessions yet."}`,
				sources: ["Camera", "Presence"],
			};
		}
		case "emr": {
			const emr = record?.emr;
			if (!emr) return { text: `There's no EMR connection for ${name}.`, sources: ["EMR"] };
			const delayed = emr.feeds.filter((feed) => feed.state !== "current");
			return {
				text: `${emr.name} at ${emr.hospital} is ${emr.state === "connected" ? "connected" : emr.state === "delayed" ? "partly delayed" : "unavailable"}.${delayed.length ? ` Behind: ${delayed.map((feed) => `${feed.label.toLowerCase()}${feed.updatedAt ? ` (last update ${ago(feed.updatedAt)})` : ""}`).join(", ")}.` : " Every feed is up to date."}${emr.writeBacks.length ? `\nRecent write-backs:\n${list(emr.writeBacks.slice(0, 4).map((item) => `${item.title} by ${item.author}, ${item.status === "failed" ? "failed" : item.status === "waiting" ? "waiting" : "written"} ${ago(item.at)}`))}` : ""}`,
				sources: [emr.name],
			};
		}
		case "gaps": {
			const lines = [
				...(patient.vitals?.spo2 === undefined ? ["SpO₂ isn't reporting"] : []),
				...(patient.vitals?.rr === undefined ? ["Respiratory rate isn't reporting"] : []),
				...(record?.vitals?.series ?? [])
					.filter((series) => series.readings.length && Date.now() - Date.parse(series.readings.at(-1)!.at) > series.staleAfterMinutes * MINUTE)
					.map((series) => `${series.parameter === "temp" ? "Temperature" : series.parameter.toUpperCase()} is ${ago(series.readings.at(-1)!.at).replace(" ago", "")} old`),
				...(record?.chart?.panels.flatMap((panel) => panel.results).filter((result) => result.status === "none").map((result) => `${result.name} has no result in 24 h`) ?? []),
				...(record?.emr?.feeds.filter((feed) => feed.state !== "current").map((feed) => `${feed.label} from ${record.emr!.name} is delayed`) ?? []),
			];
			return { text: lines.length ? `Data gaps for ${name}:\n${list(lines)}` : `No data gaps for ${name}.`, sources: ["Monitor", "Lab", "EMR"] };
		}
		case "help":
		case "count":
		default:
			return summaryOf(patient);
	}
}

/* -------------------------------------------------------------------------- */
/* Answers about the census                                                   */
/* -------------------------------------------------------------------------- */

const severityRank = { critical: 4, high: 3, medium: 2, low: 1 } as const;

/** How urgent a patient is: their worst open alert, then acuity, then a rising trend. */
function urgency({ census, alerts }: Patient) {
	return (alerts[0] ? severityRank[alerts[0].severity] * 100 : 0) + Number(census.acuity?.score ?? 0) * 2 + (census.trajectory?.trend === "up" ? 3 : 0);
}

function answerForCensus(topic: Topic | undefined, question: string, scope: Patient[], label: string): AskInterceptAnswer {
	const among = label ? ` ${label}` : "";
	if (!scope.length) return { text: `There are no patients${among}.`, sources: ["Census"] };
	switch (topic) {
		case "help":
			return {
				text: `I can answer from your census and each patient's record. For example:\n${list([
					"Who needs attention first?",
					"What changed for Miller in the last hour?",
					"Lactate for everyone in the MICU",
					"Which of my patients are on pressors?",
					"What's pending for Walker?",
					"Who's in Harris's room?",
				])}`,
			};
		case "shift": {
			const mine = scope.filter((patient) => patient.census.mine);
			const ranked = [...scope].sort((a, b) => urgency(b) - urgency(a)).slice(0, 3);
			const overdueAlerts = scope.flatMap((patient) =>
				patient.alerts.filter((alert) => alert.respondBy && Date.parse(alert.respondBy) < Date.now()).map((alert) => `${alert.title}: ${patientName(patient)}`),
			);
			const overdueMeds = scope.flatMap((patient) =>
				(patient.record?.medications?.scheduled ?? [])
					.filter((item) => item.nextDueAt && Date.parse(item.nextDueAt) < Date.now())
					.map((item) => `${item.drug}: ${patientName(patient)}, ${due(item.nextDueAt!)}`),
			);
			const overdueBundles = scope.flatMap((patient) =>
				(patient.record?.sepsis?.bundle ?? [])
					.filter((element) => element.status === "due" && Date.parse(element.dueAt) < Date.now())
					.map((element) => `${element.label} (sepsis bundle): ${patientName(patient)}`),
			);
			const carried = scope.flatMap((patient) =>
				patient.alerts.filter((alert) => alert.carriedOver).map((alert) => `${patientName(patient)}: ${alert.title.replace(/^Concern: /, "")}, raised by ${alert.source.name}${alert.rationale ? `. "${alert.rationale}"` : ""}`),
			);
			const pending = scope.flatMap((patient) => (patient.record?.labs ?? []).filter((lab) => lab.value === undefined).map((lab) => `${lab.name} for ${patientName(patient)}`));
			const gaps = scope.flatMap((patient) => [
				...(patient.vitals && patient.vitals.spo2 === undefined ? [`SpO₂ for ${patientName(patient)}`] : []),
				...(patient.vitals && patient.vitals.rr === undefined ? [`RR for ${patientName(patient)}`] : []),
			]);
			const hospitals = sampleHospitals.filter((hospital) => scope.some((patient) => patient.census.hospitalId === hospital.id));
			return {
				text: [
					`Here's your shift${among}, ${sampleUser.name.split(" ")[0]}. ${scope.length} patients across ${hospitals.length} hospital${hospitals.length === 1 ? "" : "s"}; ${mine.length} assigned to you. ${scope.filter((patient) => patient.alerts.length).length} have open alerts.`,
					`**Needs you first:**\n${list(ranked.map((patient) => `${who(patient)}: ${patient.alerts[0] ? `${patient.alerts[0].title} (${severityWords[patient.alerts[0].severity]})` : levelWords[patient.census.acuity?.level ?? "unknown"]}`))}`,
					overdueAlerts.length || overdueMeds.length || overdueBundles.length ? `**Overdue now:**\n${capped([...overdueAlerts, ...overdueBundles, ...overdueMeds], 6)}` : "**Overdue now:** nothing.",
					carried.length ? `**Carried over from last shift:**\n${list(carried)}` : undefined,
					pending.length ? `**Waiting on:** ${joinWords(pending)}.` : undefined,
					gaps.length ? `**Not reporting:** ${joinWords(gaps)}.` : undefined,
				]
					.filter(Boolean)
					.join("\n"),
				sources: ["Census", "Alerts", "MAR", "Sepsis Sniffer", "Lab", "Monitor"],
			};
		}
		case "attention": {
			const ranked = [...scope].sort((a, b) => urgency(b) - urgency(a)).slice(0, 3);
			return {
				text: `${ranked.length === 1 ? "One patient needs" : `${ranked.length} patients need`} you first${among}:\n${list(
					ranked.map(
						(patient) =>
							`${who(patient)}: ${patient.alerts.length ? `${severityWords[patient.alerts[0].severity]}, ${patient.alerts.map((alert) => alert.title).join("; ")}.` : `${levelWords[patient.census.acuity?.level ?? "unknown"]}.`} ${patient.record?.brief ? sentence(patient.record.brief.text) : ""}`.trim(),
					),
				)}\nRanked by alert severity, then acuity and how fast it's changing.`,
				sources: ["Alerts", "Census", "Monitor"],
			};
		}
		case "sepsis": {
			const cases = scope.filter((patient) => patient.record?.sepsis || patient.census.sepsisWatch);
			return {
				text: cases.length
					? `${cases.length} patient${cases.length === 1 ? " is" : "s are"} on sepsis watch${among}:\n${list(
							cases.map((patient) => {
								const sepsis = patient.record?.sepsis;
								if (!sepsis) return `${who(patient)}: on watch, no screening yet.`;
								const met = [...sepsis.sirs, ...sepsis.organDysfunction].filter((criterion) => criterion.status === "met").length;
								const overdue = sepsis.bundle.filter((element) => element.status === "due" && Date.parse(element.dueAt) < Date.now());
								return `${who(patient)}: ${sepsis.state === "candidate" ? "candidate" : sepsis.state === "tracking" ? "validated, tracking" : sepsis.state}, flagged ${ago(sepsis.flaggedAt)}. ${met} criteria met${overdue.length ? `; ${overdue.map((element) => element.label.toLowerCase()).join(", ")} overdue` : ""}.`;
							}),
						)}\nSepsis Sniffer flags candidates. The decision to validate is a clinician's.`
					: `No one${among} is on sepsis watch.`,
				sources: ["Sepsis Sniffer", "Lab", "Monitor"],
			};
		}
		case "changes":
		case "events": {
			const since = Date.now() - (topic === "events" ? 12 : 1) * 60 * MINUTE;
			const lines = scope.flatMap((patient) => {
				const events = (patient.record?.timeline?.events ?? []).filter((event) => Date.parse(event.at) >= since && event.kind !== "alert");
				const alerts = patient.alerts.filter((alert) => Date.parse(alert.firedAt) >= since);
				const items = [...alerts.map((alert) => alert.title), ...events.map((event) => runOn(event.label))];
				return items.length ? [`${patientName(patient)}: ${joinWords(unique(items).slice(0, 3))}.`] : [];
			});
			return {
				text: lines.length
					? `In the last ${topic === "events" ? "12 hours" : "hour"}${among}:\n${capped(lines)}\n${scope.length - lines.length ? `${scope.length - lines.length} other patient${scope.length - lines.length === 1 ? " is" : "s are"} steady.` : ""}`
					: `Nothing new${among} in the last ${topic === "events" ? "12 hours" : "hour"}.`,
				sources: ["Timeline", "Alerts"],
			};
		}
		case "alerts": {
			const alerts = scope.flatMap((patient) => patient.alerts.map((alert) => ({ patient, alert }))).sort((a, b) => compareTriageAlerts(a.alert, b.alert));
			return {
				text: alerts.length
					? `${alerts.length} open alert${alerts.length === 1 ? "" : "s"}${among}, highest first:\n${list(alerts.map(({ patient, alert }) => `**${severityWords[alert.severity]}** · ${alert.title}: ${patientName(patient)}, ${ago(alert.firedAt)}${alert.respondBy && Date.parse(alert.respondBy) < Date.now() ? ", overdue" : ""}`))}`
					: `No open alerts${among}.`,
				sources: ["Alerts"],
			};
		}
		case "outside-limits":
		case "vitals": {
			const lines = scope.flatMap((patient) => {
				const vitals = patient.vitals;
				if (!vitals) return [];
				const out = [
					vitals.hr !== undefined && (vitals.hr > defaultMonitorLimits.hr[1] || vitals.hr < defaultMonitorLimits.hr[0]) ? `HR ${vitals.hr}` : undefined,
					vitals.map !== undefined && vitals.map < 65 ? `MAP ${vitals.map}` : undefined,
					vitals.systolic !== undefined && vitals.systolic > defaultMonitorLimits.systolic[1] ? `BP ${vitals.systolic}/${vitals.diastolic}` : undefined,
					vitals.spo2 !== undefined && vitals.spo2 < defaultMonitorLimits.spo2[0] ? `SpO₂ ${vitals.spo2}%` : undefined,
					vitals.rr !== undefined && vitals.rr > defaultMonitorLimits.rr[1] ? `RR ${vitals.rr}` : undefined,
				].filter(Boolean);
				return out.length ? [`${who(patient)}: ${out.join(", ")}`] : [];
			});
			return {
				text: lines.length ? `Outside the alarm limits${among} right now:\n${list(lines)}` : `Everyone${among} is within limits right now.`,
				sources: ["Monitor"],
			};
		}
		case "gaps": {
			const lines = scope.flatMap((patient) => {
				const missing = [
					patient.vitals && patient.vitals.spo2 === undefined ? "SpO₂ not reporting" : undefined,
					patient.vitals && patient.vitals.rr === undefined ? "RR not reporting" : undefined,
					...(patient.record?.emr?.feeds.filter((feed) => feed.state !== "current").map((feed) => `${feed.label.toLowerCase()} delayed`) ?? []),
				].filter(Boolean);
				return missing.length ? [`${patientName(patient)}: ${missing.join(", ")}`] : [];
			});
			return { text: lines.length ? `Data gaps${among}:\n${capped(lines)}` : `No data gaps${among}.`, sources: ["Monitor", "EMR"] };
		}
		case "labs": {
			const names = namedLabs(question);
			const name = names[0] ?? "Lactate";
			const rows = scope
				.map((patient) => ({ patient, line: labLines(patient, [name])[0] }))
				.filter((row): row is { patient: Patient; line: string } => Boolean(row.line))
				.map(({ patient, line }) => ({ patient, line, value: Number.parseFloat(line.replace(/^\*\*[^*]+\*\* /, "")) }))
				.sort((a, b) => (Number.isNaN(b.value) ? -1 : b.value) - (Number.isNaN(a.value) ? -1 : a.value));
			return {
				text: rows.length ? `${name}${among}, highest first:\n${list(rows.map(({ patient, line }) => `${patientName(patient)}: ${line.replace(`**${name}** `, "")}`))}` : `No ${name} results${among}.`,
				sources: ["Lab"],
			};
		}
		case "pending": {
			const lines = scope.flatMap((patient) => {
				const pending = [
					...(patient.record?.labs?.filter((lab) => lab.value === undefined).map((lab) => lab.name) ?? []),
					...(patient.record?.chart?.cultures.filter((culture) => culture.status === "pending").map((culture) => culture.specimen) ?? []),
				];
				return pending.length ? [`${patientName(patient)}: ${unique(pending).join(", ")}`] : [];
			});
			return { text: lines.length ? `Pending${among}:\n${list(lines)}` : `Nothing pending${among}.`, sources: ["Lab", "Microbiology"] };
		}
		case "due": {
			const rows = scope
				.flatMap((patient) => (patient.record?.medications?.scheduled ?? []).filter((item) => item.nextDueAt && Date.parse(item.nextDueAt) - Date.now() < 60 * MINUTE).map((item) => ({ patient, item })))
				.sort((a, b) => a.item.nextDueAt!.localeCompare(b.item.nextDueAt!));
			return {
				text: rows.length ? `Due or overdue in the next hour${among}:\n${capped(rows.map(({ patient, item }) => `**${item.drug}** for ${patientName(patient)}, ${due(item.nextDueAt!)}`))}` : `Nothing is due in the next hour${among}.`,
				sources: ["MAR"],
			};
		}
		case "meds": {
			const group = Object.entries(drugGroups).find(([key]) => new RegExp(key.slice(0, -1), "i").test(question));
			const drugs = namedDrugs(question);
			const lines = scope.flatMap((patient) => {
				const items = medLines(patient, group?.[1], drugs).filter((line) => /\(infusion\)/.test(line) || drugs.length || group?.[0] === "antibiotics");
				return items.length ? [`${patientName(patient)}: ${items.map((line) => line.replace(/\*\*/g, "").split(", last given")[0]).join("; ")}`] : [];
			});
			const what = drugs.length ? joinWords(drugs) : (group?.[0] ?? "infusions");
			return { text: lines.length ? `On ${what}${among}:\n${list(lines)}` : `No one${among} is on ${what}.`, sources: ["Pump", "MAR"] };
		}
		case "ventilator": {
			const rows = scope.filter((patient) => patient.record?.ventilator && patient.record.ventilator.support !== "Room air");
			return {
				text: rows.length
					? `Breathing support${among}:\n${list(rows.map((patient) => { const vent = patient.record!.ventilator!; return `${who(patient)}: ${[vent.support, vent.mode].filter(Boolean).join(", ")}${vent.settings.length ? `, ${vent.settings.slice(0, 2).map((setting) => `${setting.label} ${setting.value}${setting.unit ? ` ${setting.unit}` : ""}`).join(", ")}` : ""}`; }))}`
					: `No one${among} is on breathing support.`,
				sources: ["Ventilator", "Nursing flowsheet"],
			};
		}
		case "orders": {
			const rows = scope.flatMap((patient) => (patient.record?.orders?.recommendations ?? []).filter((item) => !item.outcome).map((item) => ({ patient, item })));
			return {
				text: rows.length ? `${rows.length} open order recommendation${rows.length === 1 ? "" : "s"}${among}:\n${list(rows.map(({ patient, item }) => `${patientName(patient)}: ${item.title} (${item.agent})`))}` : `No open order recommendations${among}.`,
				sources: ["Order-Entry Suggestion", "Vent-Order Mismatch"],
			};
		}
		case "safety": {
			const rows = scope.filter((patient) => patient.record?.codeStatus !== "Full code" || patient.record?.isolation);
			return {
				text: `${list(rows.map((patient) => `${who(patient)}: ${[patient.record?.codeStatus ?? "code status not documented", patient.record?.isolation].filter(Boolean).join(", ")}`))}\nEveryone else${among} is full code with no isolation.`,
				sources: ["Epic"],
			};
		}
		case "team":
			return {
				text: `On shift with you, ${sampleUser.name}: ${joinWords(sampleTeam.map((person) => person.name))}. Each patient's bedside nurse and attending are on their page; ask about a patient by name.`,
				sources: ["Care team"],
			};
		case "count":
		default: {
			if (topic === undefined && !/patient|census|who|list/i.test(question)) {
				return { text: "I don't have enough information to answer that from the chart. Try asking about a patient by name, or about alerts, vitals, labs, medications or what changed." };
			}
			const byHospital = sampleHospitals
				.map((hospital) => ({ hospital, count: scope.filter((patient) => patient.census.hospitalId === hospital.id).length }))
				.filter((row) => row.count);
			const tagged = (tag: string) => scope.filter((patient) => patient.census.tags?.some((item) => item.label === tag)).length;
			return {
				text: `${scope.length} patient${scope.length === 1 ? "" : "s"}${among}: ${byHospital.map((row) => `${row.count} at ${row.hospital.name}`).join(", ")}.\n${list([
					`${tagged("Ventilated")} ventilated, ${tagged("NIV")} on NIV`,
					`${tagged("On pressors")} on pressors`,
					`${scope.filter((patient) => patient.alerts.length).length} with open alerts`,
					`${scope.filter((patient) => patient.census.mine).length} assigned to you`,
				])}`,
				sources: ["Census"],
			};
		}
	}
}

/* -------------------------------------------------------------------------- */
/* Slash commands                                                             */
/* -------------------------------------------------------------------------- */

/**
 * A draft handoff in I-PASS (PRD PD-110), from the patient's record: illness severity left for the clinician to set,
 * a summary, an action list from what's open, and what to watch. Never saved or sent.
 */
function handoffFor(patient: Patient): AskInterceptAnswer {
	const { census, record } = patient;
	const due = (record?.medications?.scheduled ?? []).filter((item) => item.nextDueAt && Date.parse(item.nextDueAt) - Date.now() < 4 * 60 * MINUTE);
	const pending = [
		...(record?.labs?.filter((lab) => lab.value === undefined).map((lab) => `${lab.name} pending`) ?? []),
		...(record?.chart?.cultures.filter((culture) => culture.status === "pending").map((culture) => `${culture.specimen}: ${culture.summary}`) ?? []),
	];
	const recommendations = (record?.orders?.recommendations ?? []).filter((item) => !item.outcome);
	const actions = [
		...patient.alerts.map((alert) => `Address: ${alert.title} (${severityWords[alert.severity]}, ${ago(alert.firedAt)})`),
		...due.map((item) => `${item.drug}${/per scale/i.test(item.dose) ? "" : ` ${item.dose}`} ${item.route}, ${(() => { const when = Date.parse(item.nextDueAt!) - Date.now(); return when < 0 ? "overdue" : `due ${clock(item.nextDueAt!)}`; })()}`),
		...pending.map((item) => `Follow up: ${item}`),
		...recommendations.map((item) => `Decide on the recommendation: ${item.title}`),
	];
	const watch = [
		record?.infusions?.length ? `Infusions: ${record.infusions.map((item) => `${item.drug} ${item.rate ?? "rate unavailable"}`).join(", ")}` : undefined,
		record?.ventilator ? `Breathing: ${[record.ventilator.support, record.ventilator.mode].filter(Boolean).join(", ")}` : undefined,
		record?.sepsis ? `Sepsis: ${record.sepsis.state === "candidate" ? "candidate, not yet validated" : record.sepsis.state}` : undefined,
		`Safety: ${record?.codeStatus ?? "code status not documented"}; ${record?.allergies?.length ? `allergic to ${record.allergies.join(", ")}` : record?.allergies ? "no known allergies" : "allergies unknown"}${record?.isolation ? `; ${record.isolation.toLowerCase()}` : ""}`,
	].filter((line): line is string => Boolean(line));

	return {
		text: [
			`**Draft handoff for ${fullName(patient)}** (${where(patient)}, ${census.hospital}). Review and edit it before you use it; it isn't saved or sent.`,
			`**Illness severity:** for you to set. Acuity is ${census.acuity?.level ? levelWords[census.acuity.level].toLowerCase() : "unknown"}${census.acuity?.score !== undefined ? `, SOFA ${census.acuity.score}` : ""}${census.trajectory?.value && census.trajectory.value !== "0" ? ` (${census.trajectory.value} in 24 h)` : ""}.`,
			`**Patient summary:** ${census.age ? `${census.age} ${census.sex ?? ""}`.trim() + ", " : ""}${record?.diagnosis ? record.diagnosis.charAt(0).toLowerCase() + record.diagnosis.slice(1) : "diagnosis not recorded"}${record?.icuAdmittedAt ? `, ICU day ${Math.floor((Date.now() - Date.parse(record.icuAdmittedAt)) / (24 * 60 * MINUTE)) + 1}` : ""}. ${record?.brief?.text ?? ""}`.trim(),
			`**Action list:**\n${actions.length ? list(actions) : "- Nothing open"}`,
			`**Situation awareness:**\n${list(watch)}`,
			"**Synthesis by receiver:** for the incoming clinician.",
		].join("\n"),
		sources: ["Alerts", "MAR", "Lab", "Orders", "Pump", "Epic"],
	};
}

// Each command as the question it stands for.
const commandQuestions: Record<string, string> = {
	summarize: "summary",
	changes: "what changed in the last hour",
	labs: "labs",
	meds: "medications",
	sepsis: "sepsis criteria",
};

/* -------------------------------------------------------------------------- */
/* The responder                                                              */
/* -------------------------------------------------------------------------- */

// Outside the agent's limits: what to do, not what's in the chart.
const asksForAdvice = /\b(should (i|we)|do you (recommend|suggest|think)|would you (recommend|give|start)|what (should|would) (i|we|you)|diagnose|prescribe|what dose|how much .* (give|start)|is it (safe|ok) to)\b/i;

const outOfScope: AskInterceptAnswer = {
	text: "I can't recommend a treatment or make a diagnosis. I can bring up the data behind the decision, like a trend, the latest results or the sepsis criteria.",
};

const sampleAskIntercept: AskInterceptResponder = (input, context: AskInterceptContext) => {
	// A slash command: "/handoff Miller", or "/labs" for the patient on screen.
	const command = /^\/(\w+)\s*(.*)$/.exec(input.trim());
	if (command) {
		const [, name, rest] = command;
		const target = namedPatients(rest)[0] ?? (context.patientName ? patients.find((patient) => fullName(patient) === context.patientName) : undefined);
		if (name === "handoff") {
			return target ? handoffFor(target) : { text: "Which patient? Add a name after the command, like **/handoff Miller**, or open the patient first." };
		}
		if (!commandQuestions[name]) return { text: `There's no **/${name}** command. Type **/** to see the commands.` };
		if (!target && name !== "changes") {
			return { text: `Which patient? Add a name after the command, like **/${name} Miller**, or open the patient first.` };
		}
		return sampleAskIntercept(`${commandQuestions[name]} ${rest}`.trim(), target ? { ...context, patientName: fullName(target) } : context);
	}
	const question = input;
	if (asksForAdvice.test(question)) return outOfScope;
	const named = namedPatients(question);
	const onScreen = context.patientName ? patients.filter((patient) => fullName(patient) === context.patientName) : [];
	const subjects = named.length ? named : /\b(everyone|all patients|census|unit|my patients|which patients|who)\b/i.test(question) ? [] : onScreen;
	const topic = topicOf(question, subjects.length > 0);

	if (subjects.length) {
		const answers = subjects.slice(0, 3).map((patient) => answerForPatient(patient, topic ?? "summary", question));
		if (answers.length === 1) return answers[0];
		return {
			text: subjects
				.slice(0, 3)
				.map((patient, index) => `${patientName(patient)}\n${answers[index].text}`)
				.join("\n"),
			sources: unique(answers.flatMap((answer) => answer.sources ?? [])),
		};
	}

	const { scope, label } = censusScope(question);
	return answerForCensus(topic, question, scope, label);
};

export { sampleAskIntercept };
