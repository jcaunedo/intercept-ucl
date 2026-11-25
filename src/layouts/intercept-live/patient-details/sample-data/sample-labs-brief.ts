import type { PatientBrief, PatientRecord } from "../patient-details";
import { sampleChartByPatient } from "./sample-chart";
import { samplePatientBaseRecords } from "./sample-patient-records";

// Synthetic data (PRD Patient details PD-150): the Labs tab's AI summary (PD-024's brief, about the labs alone), as
// Intercept's Conversational Clinical Data Agent would write it. Sarah Miller's (`p1`) is written by hand, in step with
// her chart and her Lab trends history (`sample-lab-trends.ts`); every other patient's is put together from their key
// labs, so it never says anything their tiles don't show.

const MINUTE = 60_000;
const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * MINUTE).toISOString();

const millerLabsBrief: PatientBrief = {
	text: "Lactate has risen from 2.2 to 4.1 mmol/L, after coming down to 1.8 with fluids on arrival. WBC is up from 13.9 to 17.2 K/µL and procalcitonin was rising before the latest draw, still pending. Creatinine has climbed from 1.4 to 1.9 mg/dL, more than twice her outpatient baseline of 0.8. Potassium has dropped to 3.3 mmol/L and hemoglobin to 9.8 g/dL, both below the reference range.",
	sourceCount: 17,
	updatedAt: minutesAgo(33),
};

const flagWords = { high: "above the reference range", low: "below the reference range", critical: "at a critical value" } as const;

/** A sentence per key lab: its change since the previous result, or where it stands, and what's still pending. */
function labsBriefFrom(record: PatientRecord): PatientBrief | undefined {
	const labs = record.labs ?? [];
	if (!labs.length) return undefined;
	const sentences: string[] = [];
	for (const lab of labs) {
		const unit = lab.unit ? ` ${lab.unit}` : "";
		if (lab.value === undefined) {
			if (lab.collectedAt) sentences.push(`${lab.name} is pending.`);
			continue;
		}
		const where = lab.flag ? `, ${flagWords[lab.flag]}` : ", within the reference range";
		const before = lab.previous ? Number.parseFloat(lab.previous.value) : Number.NaN;
		const now = Number.parseFloat(lab.value);
		if (!Number.isNaN(before) && !Number.isNaN(now) && before !== now) {
			sentences.push(`${lab.name} has ${now > before ? "risen" : "fallen"} from ${lab.previous!.value} to ${lab.value}${unit}${where}.`);
		} else sentences.push(`${lab.name} is ${lab.value}${unit}${where}.`);
	}
	if (!sentences.length) return undefined;
	const resulted = labs.flatMap((lab) => (lab.resultedAt ? [Date.parse(lab.resultedAt)] : []));
	return {
		text: sentences.join(" "),
		sourceCount: sampleChartByPatient[record.id]?.panels.reduce((count, panel) => count + panel.results.length, 0) ?? labs.length,
		updatedAt: new Date(resulted.length ? Math.max(...resulted) : Date.now()).toISOString(),
	};
}

const sampleLabsBriefByPatient: Record<string, PatientBrief> = Object.fromEntries(
	samplePatientBaseRecords.flatMap((record) => {
		const brief = record.id === "p1" ? millerLabsBrief : labsBriefFrom(record);
		return brief ? [[record.id, brief]] : [];
	}),
);

export { sampleLabsBriefByPatient };
