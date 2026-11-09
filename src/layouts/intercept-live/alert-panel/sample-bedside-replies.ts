import type { MonitorVitals } from "@/components/cards/patient-monitoring-card";

// Story-only: the bedside nurse's simulated replies in the consult's Messages (prototype only; an app gets real replies
// from the hospital's messaging). Each reply answers what the clinician wrote (Nov 5, 2026, user's call: "related with
// the message the user sent … conversational, in context"): an acknowledgment gets a short one back, a question about
// the numbers gets the patient's live numbers, an order gets "on it", and the scenario's own topics (Scenario 2's blood
// gas and BiPAP, Scenario 1's breathing and fluids) get the scenario's answers. Short, as a nurse writes from the
// bedside, and nothing a nurse wouldn't do on their own.

/** What the replies know about the patient: who, how they're doing now and which scenario they're in. */
type BedsideReplyContext = {
	firstName?: string;
	sex?: string;
	/** The patient's live numbers, read when the reply is written. */
	vitals?: MonitorVitals;
	/** Scenario 2 (COPD on BiPAP, Alliance ED), Scenario 1 (heart failure, Chadron), or any other patient. */
	scenario?: "copd" | "chf";
	/** On a ventilator (a Ventilated flag): sedated, so not "awake and talking". */
	ventilated?: boolean;
};

// An order: the message starts with what to do ("start a fluid bolus", "recheck the lactate").
const orderVerbs =
	/^(please )?(give|start|hang|push|increase|decrease|raise|lower|titrate|change|set|turn|bump|wean|draw|call|page|recheck|repeat|send|get|stop|hold)\b/;

const has = (text: string, pattern: RegExp) => pattern.test(text);

/** Answers each message from what it says, with the patient's numbers at the time. */
function sampleBedsideReplier({ firstName, sex, vitals, scenario, ventilated = false }: BedsideReplyContext) {
	const he = sex === "F" ? "she" : sex === "M" ? "he" : "they";
	const him = sex === "F" ? "her" : sex === "M" ? "him" : "them";
	const He = he[0].toUpperCase() + he.slice(1);
	const name = firstName ?? him;
	const n = (value: number | undefined) => (value === undefined ? undefined : Math.round(value));
	const { hr, spo2, systolic, diastolic, rr } = {
		hr: n(vitals?.hr),
		spo2: n(vitals?.spo2),
		systolic: n(vitals?.systolic),
		diastolic: n(vitals?.diastolic),
		rr: n(vitals?.rr),
	};
	const onSupport = scenario === "copd" ? " on BiPAP" : ventilated ? " on the vent" : "";

	return (message: string): string | undefined => {
		const text = message.toLowerCase().trim();
		if (!text) return undefined;

		// Thanks, okay, "let me check": a short word back, varied by the message (the replier is rebuilt each render).
		if (has(text, /^(ok|okay|k|kk|thanks|thank you|thx|ty|great|perfect|good|got it|sounds good|will do|let me|i'?ll|one sec|give me)\b/)) {
			const replies = [
				`Sounds good. I'm here with ${name}.`,
				"Okay. Message me if you need anything else.",
				`Thanks. I'll stay with ${him}.`,
			];
			return replies[text.length % replies.length];
		}

		// An order comes first, whatever it's about.
		if (has(text, orderVerbs)) return "On it. I'll message you when it's done.";

		// The scenario's own topics.
		if (has(text, /\b(gas|gases|abg|ph|p?a?co2|co₂|blood gas)\b/))
			return scenario === "copd"
				? "Rachel's drawing the 1 h gas now. I'll send it here as soon as it's back."
				: "I can get one drawn now. Want an ABG?";
		if (has(text, /\b(bipap|ipap|epap|mask|leak|niv|settings?)\b/))
			return scenario === "copd"
				? "IPAP 12, EPAP 5, FiO₂ 35%. Mask is sealing well, leak around 16."
				: `${He}'s not on BiPAP. Want me to call RT?`;
		if (has(text, /\b(lactate)\b/)) return "Repeat lactate is drawn. Should be back in about 20 min.";
		if (has(text, /\b(urine|output|foley|lasix|furosemide|diures|fluids?|i ?& ?o|intake)\b/))
			return scenario === "chf"
				? "Output's been low tonight. I'll tell you after this hour's measure."
				: "I'll check the I&O and let you know.";

		// The numbers, live.
		if (has(text, /\b(sats?|spo2|spo₂|o2|oxygen|saturation)\b/) && spo2 !== undefined)
			return `SpO₂ is ${spo2}%${onSupport} right now.`;
		if (has(text, /\b(rr|resp|breathing|breath|wob|work of breathing|short of breath|sob)\b/) && rr !== undefined)
			return scenario === "copd"
				? `RR ${rr}. Still working to breathe, using ${his(sex)} neck muscles, but a bit easier than on arrival.`
				: scenario === "chf"
					? `RR ${rr}. More short of breath lying flat, so I've sat ${him} up.`
					: ventilated
						? `RR ${rr} on the vent, SpO₂ ${spo2 ?? "--"}%. Not fighting it.`
						: `RR ${rr}. Breathing looks steady from here.`;
		if (has(text, /\b(hr|heart rate|pulse|bp|blood pressure|pressure|map)\b/) && hr !== undefined)
			return `HR ${hr}, BP ${systolic ?? "--"}/${diastolic ?? "--"}.`;
		if (has(text, /\b(vitals?|numbers|vs)\b/) && hr !== undefined)
			return `HR ${hr}, BP ${systolic ?? "--"}/${diastolic ?? "--"}, RR ${rr ?? "--"}, SpO₂ ${spo2 ?? "--"}%${onSupport}.`;

		// How they look.
		if (has(text, /\b(alert|awake|confus\w*|mental|talking|speaking|sleepy|drowsy|how('?s| is| are) (he|she|they|him|her|it going))\b/))
			return scenario === "copd"
				? "Awake and answering in short sentences. Tired, but following everything."
				: ventilated
					? `Sedated on the vent, settles when we turn ${him}. I'm right here with ${him}.`
					: `Awake and talking. Comfortable for now, I'm right here with ${him}.`;
		if (has(text, /\b(family|wife|husband|daughter|son)\b/))
			return scenario === "copd" ? "His daughter Amy is on her way in." : "I'll call them and let you know.";

		// Something to do.
		if (has(text, /\b(give|start|hang|push|increase|decrease|raise|lower|titrate|change|set|turn|bump|wean|draw|call|page|recheck|repeat|check|send|get)\b/))
			return "On it. I'll message you when it's done.";

		return text.includes("?") ? "Let me check and get back to you in a minute." : "Okay, got it.";
	};
}

const his = (sex: string | undefined) => (sex === "F" ? "her" : sex === "M" ? "his" : "their");

export { sampleBedsideReplier, type BedsideReplyContext };
