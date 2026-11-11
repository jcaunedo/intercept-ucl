import type { PatientCardTag, PatientCardTagDetails } from "@/components/cards/patient-census-card";
import type { TagsPopoverActionResolver } from "@/components/overlays/tags-popover";

import type { PatientInfusion, PatientRecord, PatientVentilator } from "../patient-details/patient-details";
import { isPressorFlag, pressorPattern } from "./pressors";
import { isOpenAlert, type TriageAlert } from "../monitoring/triage-queue";

// What a patient's flags say when clicked (client feedback, Nov 4, 2026; PRD Patient card §15.1 "Flag details"): what
// the bedside team changed lately, then what's behind the flag now, and where that comes from. Nurses titrate drips and
// respiratory therapists change vent settings on their own, from the patient's status or labs, and often don't tell the
// intensivist; the popover is where Intercept sees it. The flag's meaning isn't shown: the clinicians reading it know it.
// Every flag opens one (Nov 5, 2026, user's call; until then DNR, isolation, Fall risk and ECMO were plain badges, and a
// click on one opened the patient): Fall risk shows the latest fall assessment, DNR the code status order, isolation
// why and since when, ECMO the console's settings. A flag the record has nothing on says so (`noRecordText`).

/** How far back a change still shows. A shift. */
const changeWindowMinutes = 12 * 60;

/** Said when nothing behind the flag changed in that window, so "no line" never has to mean "no change". */
const noChangesText = "No changes in the last 12 hours";

/** Said by a flag the record has nothing behind, so it still opens and says where it stands. */
const noRecordText = "Nothing more on this in the record";

/** A care team member's name by role, e.g. the bedside nurse. */
const careTeamName = (record: PatientRecord, role: string) => record.careTeam?.find((member) => member.role === role)?.name;


// The drips behind a flag, by name, and the lab watched with them.
const flagDrips: Record<string, { drip: RegExp; lab?: string }> = {
	Dialysis: { drip: /crrt|dialysis/i },
	"3% NaCl": { drip: /sodium chloride 3%|3% saline|hypertonic/i, lab: "Sodium" },
	"Insulin infusion": { drip: /insulin/i, lab: "Glucose" },
};

type Change = { text: string; at: string };

const minutesSince = (at: string) => (Date.now() - Date.parse(at)) / 60_000;

/** "in the last 40 minutes", "in the last hour", "in the last 3 hours": from an hour up, to the nearest hour. */
function since(at: string) {
	const minutes = Math.max(1, Math.round(minutesSince(at)));
	if (minutes < 60) return `in the last ${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
	const hours = Math.round(minutes / 60);
	return hours === 1 ? "in the last hour" : `in the last ${hours} hours`;
}

/** "40 minutes ago", "an hour ago", "4 hours ago": `since`'s rounding. */
const ago = (at: string) => since(at).replace("in the last hour", "an hour ago").replace(/^in the last (.+)$/, "$1 ago");

const recent = (at: string) => minutesSince(at) <= changeWindowMinutes;

/**
 * A titration, by how much the rate moved since the titrating began: "Epinephrine drip increased by 75% in the last 3
 * hours". A drip that was off and is running again says when it started.
 */
function dripChange({ drug, rate, change }: PatientInfusion): Change | undefined {
	if (!change || !recent(change.at)) return undefined;
	const from = Number.parseFloat(change.from);
	if (change.direction === "up" && from === 0) return { text: `${drug} drip started ${ago(change.at)}`, at: change.at };
	const verb = change.direction === "up" ? "increased" : "decreased";
	const to = rate ? Number.parseFloat(rate) : Number.NaN;
	const by = from > 0 && !Number.isNaN(to) ? ` by ${Math.round((Math.abs(to - from) / from) * 100)}%` : "";
	return { text: `${drug} drip ${verb}${by} ${since(change.at)}`, at: change.at };
}

/** A setting change, from and to: "FiO₂ increased from 40% to 60% in the last 2 hours". */
function settingChange(setting: PatientVentilator["settings"][number]): Change | undefined {
	const { change } = setting;
	if (!change || !recent(change.at)) return undefined;
	// A setting with a set value changed there; the measured value follows the patient.
	const to = setting.set ?? setting.value;
	const verb = Number.parseFloat(to) > Number.parseFloat(change.from) ? "increased" : "decreased";
	const unit = setting.unit ? ` ${setting.unit}` : "";
	return { text: `${setting.label} ${verb} from ${change.from} to ${to}${unit} ${since(change.at)}`, at: change.at };
}

/** The changes, newest first, or the line that says there were none. */
function changeLines(changes: (Change | undefined)[]): Pick<PatientCardTagDetails, "changes" | "description"> {
	const found = changes.filter((change): change is Change => Boolean(change)).sort((a, b) => b.at.localeCompare(a.at));
	return found.length ? { changes: found.map((change) => change.text) } : { description: noChangesText };
}

/**
 * Every drip titration and ventilator setting change in the record in the last 12 hours, newest first, in the flags'
 * words: Ask Intercept Live's "Changed at the bedside" line in a patient's summary. `undefined` when the record has no
 * drips and no settings to change; `[]` when nothing changed.
 */
function bedsideChanges(record?: PatientRecord): string[] | undefined {
	const infusions = record?.infusions ?? [];
	const settings = record?.ventilator?.settings ?? [];
	if (!infusions.length && !settings.length) return undefined;
	return changeLines([...infusions.map(dripChange), ...settings.map(settingChange)]).changes ?? [];
}

/** The newest of the lines' times. */
const newest =(times: (string | undefined)[]) => times.filter((time): time is string => Boolean(time)).sort().at(-1);

const rateItem = (infusion: PatientInfusion) => ({ label: infusion.drug, value: infusion.rate ?? "Rate unavailable" });

/** The popover of a flag the record has nothing behind. */
const noRecordDetails: PatientCardTagDetails = { description: noRecordText };

/**
 * One flag's popover, from the patient's record: what's behind it, or `noRecordDetails` when the record has nothing.
 * `undefined` only without a record. Its `subject` is the patient, so the app's TagsPopoverActionsProvider knows whose
 * flag it is (`fallPathwayActions`).
 */
function flagDetails(label: string, record?: PatientRecord): PatientCardTagDetails | undefined {
	if (!record) return undefined;
	return { ...(recordDetails(label, record) ?? noRecordDetails), subject: record.id };
}

/**
 * The Allergy tag: each allergy's reaction, severity and whether it's confirmed, newest addition first in the change
 * line. A list without details still shows its substances, with "Reaction not recorded".
 */
function allergyDetails(record: PatientRecord): PatientCardTagDetails | undefined {
	const allergies = record.allergies ?? [];
	if (!allergies.length) return undefined;
	const entries = allergies.map((substance) => record.allergyDetails?.find((entry) => entry.substance === substance));
	const added = entries
		.filter((entry) => entry && recent(entry.recordedAt))
		.map((entry) => ({ text: `${entry!.substance} added to the allergy list ${ago(entry!.recordedAt)}`, at: entry!.recordedAt }));
	return {
		...changeLines(added),
		items: allergies.map((substance, index) => {
			const entry = entries[index];
			if (!entry) return { label: substance, value: "Reaction not recorded" };
			const status = [entry.kind === "intolerance" ? "intolerance" : undefined, entry.verified ? "confirmed" : "patient reported"]
				.filter(Boolean)
				.join(", ");
			return { label: substance, value: `${entry.reaction}, ${entry.severity} · ${status}` };
		}),
		source: "Allergy list",
		updatedAt: newest(entries.map((entry) => entry?.recordedAt)),
	};
}

/** What the record has behind a flag, or undefined. */
function recordDetails(label: string, record: PatientRecord): PatientCardTagDetails | undefined {
	if (/^Allerg(y|ies): /.test(label)) return allergyDetails(record);

	if (label === "Fall risk" && record.fallRisk) {
		const { scale, score, risk, assessedAt, previous, precautions } = record.fallRisk;
		const nurse = careTeamName(record, "Bedside nurse");
		const changed =
			previous && previous.score !== score && recent(assessedAt)
				? {
						text: `${scale} score ${score > previous.score ? "up" : "down"} from ${previous.score} to ${score} ${since(assessedAt)}`,
						at: assessedAt,
					}
				: undefined;
		return {
			...changeLines([changed]),
			items: [
				{ label: scale, value: `${score}, ${risk.toLowerCase()}` },
				// A precaution can have a comma of its own ("Low bed, locked"), so they're set apart with dots.
				...(precautions.length ? [{ label: "Precautions", value: precautions.join(" · ") }] : []),
				...(nurse ? [{ label: "Assessed by", value: `${nurse}, RN` }] : []),
			],
			source: "Nursing assessment",
			updatedAt: assessedAt,
		};
	}

	if (label === record.codeStatus && record.codeStatusOrder) {
		const { orderedAt, discussedWith, previous } = record.codeStatusOrder;
		const attending = careTeamName(record, "Attending of record");
		const changed =
			previous && recent(orderedAt)
				? { text: `Changed from ${previous.status} to ${record.codeStatus} ${since(orderedAt)}`, at: orderedAt }
				: undefined;
		return {
			...changeLines([changed]),
			items: [
				// When it was ordered is the source line's time.
				...(attending ? [{ label: "Ordered by", value: `Dr. ${attending}` }] : []),
				...(discussedWith ? [{ label: "Discussed with", value: discussedWith }] : []),
			],
			source: "Code status order",
			updatedAt: orderedAt,
		};
	}

	if (label === record.isolation && record.isolationOrder) {
		const { reason, orderedAt } = record.isolationOrder;
		const started = recent(orderedAt) ? { text: `Isolation started ${ago(orderedAt)}`, at: orderedAt } : undefined;
		return {
			...changeLines([started]),
			// When it started is the change line while it's recent, and the source line's time.
			items: [{ label: "Reason", value: reason }],
			source: "Infection prevention order",
			updatedAt: orderedAt,
		};
	}

	if (label === "ECMO" && record.ecmo) {
		const { mode, settings, source, updatedAt } = record.ecmo;
		return {
			...changeLines(settings.map(settingChange)),
			items: [
				{ label: "Mode", value: mode },
				...settings.map((setting) => ({ label: setting.label, value: [setting.value, setting.unit].filter(Boolean).join(" ") })),
			],
			source,
			updatedAt,
		};
	}

	if (isPressorFlag(label)) {
		const drips = (record.infusions ?? []).filter((infusion) => pressorPattern.test(infusion.drug));
		if (!drips.length) return undefined;
		return {
			...changeLines(drips.map(dripChange)),
			items: drips.map(rateItem),
			source: "Pump",
			updatedAt: newest(drips.map((infusion) => infusion.updatedAt)),
		};
	}

	if ((label === "Ventilated" || label === "NIV") && record.ventilator) {
		const { mode, settings, source, updatedAt } = record.ventilator;
		return {
			...changeLines(settings.map(settingChange)),
			items: [
				...(mode ? [{ label: "Mode", value: mode }] : []),
				...settings.map((setting) => ({
					label: setting.label,
					value: [setting.value, setting.unit].filter(Boolean).join(" ") + (setting.set ? ` (set ${setting.set})` : ""),
				})),
			],
			source,
			updatedAt,
		};
	}

	const watched = flagDrips[label];
	if (watched) {
		const drips = (record.infusions ?? []).filter((infusion) => watched.drip.test(infusion.drug));
		const lab = watched.lab ? record.labs?.find((item) => item.name === watched.lab && item.value) : undefined;
		if (!drips.length && !lab) return undefined;
		return {
			...(drips.length ? changeLines(drips.map(dripChange)) : {}),
			items: [
				...drips.map(rateItem),
				...(lab ? [{ label: `${lab.name}, latest`, value: [lab.value, lab.unit].filter(Boolean).join(" ") }] : []),
			],
			source: drips.length && lab ? "Pump and lab" : lab ? "Lab" : "Pump",
			updatedAt: newest([...drips.map((infusion) => infusion.updatedAt), lab?.resultedAt]),
		};
	}

	return undefined;
}

/** The patients with their flags' popovers filled in from their records. */
function withFlagDetails<Patient extends { id: string; tags?: PatientCardTag[] }>(
	patients: Patient[],
	records: PatientRecord[] = [],
): Patient[] {
	return patients.map((patient) => {
		if (!patient.tags?.length) return patient;
		const record = records.find((item) => item.id === patient.id);
		return {
			...patient,
			tags: patient.tags.map((tag) => {
				const details = tag.details ? { ...tag.details, subject: tag.details.subject ?? patient.id } : flagDetails(tag.label, record);
				return details ? { ...tag, details } : tag;
			}),
		};
	});
}

/**
 * The flags in words, for Ask Intercept Live's answers about one patient (Nov 3, 2026, user's call): a line for each
 * flag with what's behind it ("**2 pressors:** Epinephrine 0.07 mcg/kg/min, Norepinephrine 0.18 mcg/kg/min"), then the
 * others by name ("**Flags:** DNR, Fall risk"). What changed is its own line (`bedsideChanges`). `covers` says whether
 * a line covers the ventilator.
 */
function flagSummary(tags: PatientCardTag[] = [], record?: PatientRecord) {
	const detailed: string[] = [];
	const plain: string[] = [];
	for (const tag of tags) {
		const items = flagDetails(tag.label, record)?.items ?? [];
		if (items.length) detailed.push(`**${tag.label}:** ${items.map((item) => (item.value ? `${item.label} ${item.value}` : item.label)).join(", ")}`);
		else plain.push(tag.label);
	}
	return {
		lines: [...detailed, ...(plain.length ? [`**Flags:** ${plain.join(", ")}`] : [])],
		coversVentilator: tags.some((tag) => (tag.label === "Ventilated" || tag.label === "NIV") && record?.ventilator),
	};
}

/** Whether an alert's pathway is a fall prevention pathway: a bed sensor alert's is (`samplePathway`). */
const isFallPathwayAlert = (alert: Pick<TriageAlert, "source">) => alert.source.name === "Bed sensor";

/**
 * The alert whose pathway is the patient's fall prevention pathway: their newest Bed sensor alert, open ones first (the
 * fall prevention pathway is what a bed sensor alert suggests, `samplePathway`). Undefined when they have none.
 */
function fallPathwayAlert(patientId: string, alerts: TriageAlert[]) {
	return alerts
		.filter((alert) => alert.patientId === patientId && isFallPathwayAlert(alert))
		.sort((a, b) => Number(isOpenAlert(b)) - Number(isOpenAlert(a)) || b.firedAt.localeCompare(a.firedAt))[0];
}

/** Fall risk's button: the patient's fall prevention pathway. */
const fallPathwayLabel = "View fall prevention pathway";

/**
 * The Fall risk flag's button to the patient's fall prevention pathway (Nov 10, 2026, user's call), for the app's
 * TagsPopoverActionsProvider: "View fall prevention pathway" at the bottom of every Fall risk popover, on the cards, the
 * patient's page and the alert modal alike (Nov 11, 2026, user's call: it belongs to the popover, not to each page), when
 * the patient has one (`fallPathwayAlert`). `openPathway` opens it by the patient and its alert. Other flags get nothing
 * from it; `fallback` (the provider around this one) answers for them.
 */
function fallPathwayActions(
	alerts: TriageAlert[],
	openPathway: (patientId: string, alertId: string) => void,
	fallback?: TagsPopoverActionResolver | null,
): TagsPopoverActionResolver {
	return (tag) => {
		const patientId = tag.details.subject;
		const alert = tag.label === "Fall risk" && patientId ? fallPathwayAlert(patientId, alerts) : undefined;
		if (!alert || !patientId) return fallback?.(tag);
		return { label: fallPathwayLabel, onSelect: () => openPathway(patientId, alert.id) };
	};
}

export { bedsideChanges, fallPathwayActions, fallPathwayAlert, fallPathwayLabel, isFallPathwayAlert, flagDetails, flagSummary, withFlagDetails };
