// Intercept's note types and their templates (PRD Notes §4, NTE-002, NTE-003): product content, from Intercept's
// tele-critical care templates in a client hospital's Epic (`documents/notes/`). Each template is a note type's sections
// in order: what the clinician writes (required ones block signing, as Epic's `***`), what the chart fills in, the ICU
// best practices and the attestation. The Attending attestation (NTE-013) isn't offered yet.

/** Chart data a section fills from (PRD NTE-004). The page reads each one from the patient's record. */
type NoteChartBlockId =
	"vitals" | "io" | "medications" | "home-medications" | "allergies" | "history" | "drips" | "oxygen" | "labs";

/** What the AI can draft for a section (PRD NTE-007): the clinician pulls it in, then edits or accepts it. */
type NoteAiField = "summary" | "plan";

type NoteTemplateSection =
	| {
			kind: "text";
			id: string;
			heading: string;
			required?: boolean;
			placeholder?: string;
			/** The AI draft this section can take, when the page has one. */
			ai?: NoteAiField;
			/** Headings from earlier drafts that land here when a draft opens in the editor. */
			aliases?: string[];
	  }
	| { kind: "chart"; id: string; heading: string; block: NoteChartBlockId }
	| { kind: "best-practices"; id: string; heading: string }
	| { kind: "attestation"; id: string; heading: string };

type NoteTypeId = "initial" | "progress" | "event" | "brief-event";

type NoteTemplate = {
	id: NoteTypeId;
	/** The note's type, as the list and its filter show it. */
	name: string;
	/** When it's written, under its name in New note's menu. */
	description: string;
	sections: NoteTemplateSection[];
};

/* -------------------------------------------------------------------------- */
/* Sections the templates share                                               */
/* -------------------------------------------------------------------------- */

const hpi: NoteTemplateSection = {
	kind: "text",
	id: "hpi",
	heading: "HPI",
	required: true,
	placeholder: "What's happening and why the tele-ICU is involved",
	ai: "summary",
	aliases: ["hpi", "history of present illness", "subjective", "summary"],
};

const issue: NoteTemplateSection = {
	kind: "text",
	id: "issue",
	heading: "Issue",
	required: true,
	placeholder: "What happened",
	ai: "summary",
	aliases: ["issue", "event", "reason"],
};

const exam: NoteTemplateSection = {
	kind: "text",
	id: "exam",
	heading: "Camera / physical exam",
	required: true,
	placeholder: "What you saw on the camera, and what the bedside team examined",
	aliases: ["exam", "physical exam", "camera exam", "camera / physical exam", "objective"],
};

const assessmentPlan: NoteTemplateSection = {
	kind: "text",
	id: "ap",
	heading: "Assessment and plan",
	required: true,
	placeholder: "Assessment, then the plan by problem",
	ai: "plan",
	aliases: ["assessment", "plan", "assessment and plan", "a/p", "recommendations"],
};

const discussed: NoteTemplateSection = {
	kind: "text",
	id: "discussed",
	heading: "Discussed with",
	required: true,
	placeholder: "Bedside RN, the attending of record, family…",
	aliases: ["discussed", "discussed with", "present"],
};

const chart = (block: NoteChartBlockId, heading: string): NoteTemplateSection => ({ kind: "chart", id: block, heading, block });

const bestPractices: NoteTemplateSection = {
	kind: "best-practices",
	id: "best-practices",
	heading: "ICU best practices",
};
const attestation: NoteTemplateSection = {
	kind: "attestation",
	id: "attestation",
	heading: "Telemedicine attestation",
};

/* -------------------------------------------------------------------------- */
/* Templates                                                                  */
/* -------------------------------------------------------------------------- */

const noteTemplates: NoteTemplate[] = [
	{
		id: "progress",
		name: "Tele-ICU progress note",
		description: "Daily follow-up",
		sections: [
			hpi,
			chart("vitals", "Vitals"),
			chart("io", "Intake and output"),
			chart("medications", "Current medications"),
			chart("allergies", "Allergies"),
			exam,
			chart("drips", "Drips"),
			chart("oxygen", "Oxygen device settings"),
			assessmentPlan,
			bestPractices,
			discussed,
			attestation,
		],
	},
	{
		id: "event",
		name: "Tele-ICU event note",
		description: "Something happened and you examined the patient",
		sections: [
			issue,
			exam,
			chart("oxygen", "Oxygen device settings"),
			chart("drips", "Drips"),
			chart("labs", "Labs"),
			assessmentPlan,
			discussed,
			attestation,
		],
	},
	{
		id: "brief-event",
		name: "Tele-ICU brief event note",
		description: "A small intervention",
		sections: [
			issue,
			{
				kind: "text",
				id: "interventions",
				heading: "Interventions",
				required: true,
				placeholder: "What was done",
				aliases: ["interventions", "plan"],
			},
			discussed,
		],
	},
	{
		id: "initial",
		name: "Tele-ICU initial note",
		description: "Taking over the patient",
		sections: [
			hpi,
			chart("history", "History"),
			chart("home-medications", "Outpatient medications"),
			chart("allergies", "Allergies"),
			chart("io", "Intake and output"),
			exam,
			chart("drips", "Drips"),
			chart("oxygen", "Oxygen device settings"),
			chart("labs", "Labs, last 24 h"),
			assessmentPlan,
			bestPractices,
			discussed,
			attestation,
		],
	},
];

/** The template a note type starts from, by the type's name; earlier names ("Tele-ICU admission note") included. */
function noteTemplateFor(type: string): NoteTemplate | undefined {
	const name = type.toLowerCase();
	return (
		noteTemplates.find((template) => template.name.toLowerCase() === name) ??
		(name.startsWith("tele-icu") && /admission|initial/.test(name) ? noteTemplates.find((t) => t.id === "initial") : undefined)
	);
}

/** The ICU best practices the initial and progress notes check every day (PRD NTE-008). */
const bestPracticeItems = [
	{ id: "vte", label: "VTE prophylaxis" },
	{ id: "stress-ulcer", label: "Stress ulcer prophylaxis" },
	{ id: "nutrition", label: "Nutrition" },
	{ id: "glycemic", label: "Glycemic control" },
	{ id: "vent", label: "Vent liberation (if applicable)" },
] as const;

type BestPracticeId = (typeof bestPracticeItems)[number]["id"];

/** The attestation's two versions (PRD Notes §4.3), the wording as Intercept's templates have it. */
type AttestationVersion = "critical-care" | "standard";

const attestationVersions: Record<AttestationVersion, { label: string; description: string; text: (minutes: string) => string }> =
	{
		"critical-care": {
			label: "Critical care",
			description: "30 minutes or more of critical care time (CPT 99291 / 99292)",
			text: (minutes) =>
				`I spent a total of ${minutes} minutes of aggregate critical care time on this patient's care today exclusive of procedural time. There is a high probability of sudden clinical deterioration due to acute impairment of vital organ systems that require complex and urgent medical decision making to frequently assess, manipulate, and support vital life-sustaining functions. Lack of these complex and urgent medical care would probably cause rapid clinical deterioration and possible death.`,
		},
		standard: {
			label: "Standard",
			description: "Time spent on the patient's care",
			text: (minutes) => `I spent a total of ${minutes} minutes of time on this patient's care.`,
		},
	};

/** The telehealth lines every attestation ends with. Consent and the audiovisual line are fixed. */
const attestationLines = {
	consent: "Telemedicine consent: in chart",
	audiovisual: "Patient seen via two-way interactive audiovisual telecommunication.",
};

export {
	attestationLines,
	attestationVersions,
	bestPracticeItems,
	noteTemplateFor,
	noteTemplates,
	type AttestationVersion,
	type BestPracticeId,
	type NoteAiField,
	type NoteChartBlockId,
	type NoteTemplate,
	type NoteTemplateSection,
	type NoteTypeId,
};
