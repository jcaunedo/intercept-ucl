import type { PatientCardTag, PatientCardTagDetails } from "@/components/cards/patient-census-card";

import type { PatientRecord } from "../patient-details/patient-details";
import { isPressorFlag, pressorPattern } from "./pressors";

// What a patient's flags say when clicked (Nov 3, 2026, user's call): what each one means, then what's behind it now
// from the patient's record (the drips and their rates, the ventilator's settings, the lab that's watched), and where
// that comes from. A flag the app doesn't know stays a plain badge. ⚠️ The meanings are drafts for clinical review.

const meanings: Record<string, string> = {
	Ventilated: "Breathing with an invasive ventilator, through a breathing tube.",
	NIV: "Non-invasive ventilation: a mask, no breathing tube.",
	ECMO: "A machine outside the body that pumps and oxygenates the blood.",
	Dialysis: "Kidney replacement therapy.",
	"3% NaCl": "Hypertonic saline, a high-risk continuous infusion. Sodium is checked often so it doesn't rise too fast.",
	"Insulin infusion": "A continuous insulin drip, a high-risk infusion. Glucose is checked often.",
	DNR: "Do not resuscitate: no CPR or defibrillation if the heart stops. Other treatment continues.",
	"Contact isolation": "Gown and gloves to enter the room, so an infection doesn't spread by touch.",
	"Droplet isolation": "A mask near the patient, so an infection doesn't spread by droplets.",
	"Fall risk": "At higher risk of falling; the bedside team takes fall precautions.",
};

// The drips behind a flag, by name, and the lab watched with them.
const flagDrips: Record<string, { drip: RegExp; lab?: string }> = {
	Dialysis: { drip: /crrt|dialysis/i },
	"3% NaCl": { drip: /sodium chloride 3%|3% saline|hypertonic/i, lab: "Sodium" },
	"Insulin infusion": { drip: /insulin/i, lab: "Glucose" },
};

/** The newest of the lines' times. */
const newest = (times: (string | undefined)[]) => times.filter((time): time is string => Boolean(time)).sort().at(-1);

/** One flag's popover, from what it means and the patient's record; none for a flag the app doesn't know. */
function flagDetails(label: string, record?: PatientRecord): PatientCardTagDetails | undefined {
	if (isPressorFlag(label)) {
		const drips = (record?.infusions ?? []).filter((infusion) => pressorPattern.test(infusion.drug));
		return {
			description: "Drips that raise blood pressure, running now.",
			items: drips.map((infusion) => ({ label: infusion.drug, value: infusion.rate ?? "Rate unavailable" })),
			source: drips.length ? "Pump" : undefined,
			updatedAt: newest(drips.map((infusion) => infusion.updatedAt)),
		};
	}

	const meaning = meanings[label];
	if (!meaning) return undefined;

	if ((label === "Ventilated" || label === "NIV") && record?.ventilator) {
		const { mode, settings, source, updatedAt } = record.ventilator;
		return {
			description: meaning,
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
	if (watched && record) {
		const drips = (record.infusions ?? []).filter((infusion) => watched.drip.test(infusion.drug));
		const lab = watched.lab ? record.labs?.find((item) => item.name === watched.lab && item.value) : undefined;
		return {
			description: meaning,
			items: [
				...drips.map((infusion) => ({ label: infusion.drug, value: infusion.rate ?? "Rate unavailable" })),
				...(lab ? [{ label: `${lab.name}, latest`, value: [lab.value, lab.unit].filter(Boolean).join(" ") }] : []),
			],
			source: drips.length && lab ? "Pump and lab" : lab ? "Lab" : drips.length ? "Pump" : undefined,
			updatedAt: newest([...drips.map((infusion) => infusion.updatedAt), lab?.resultedAt]),
		};
	}

	return { description: meaning };
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
				const details = tag.details ?? flagDetails(tag.label, record);
				return details ? { ...tag, details } : tag;
			}),
		};
	});
}

/**
 * The flags in words, for Ask Intercept Live's answers about one patient (Nov 3, 2026, user's call): a line for each
 * flag with what's behind it ("**2 pressors:** Norepinephrine 0.22 mcg/kg/min, Vasopressin 0.03 units/min"), then the
 * others by name ("**Flags:** DNR, Fall risk"). `covers` says whether a line covers the ventilator.
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

export { flagDetails, flagSummary, withFlagDetails };
