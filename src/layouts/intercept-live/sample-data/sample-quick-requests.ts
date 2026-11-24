import type { QuickRequest } from "../shared/quick-requests";

// The signed-in clinician's own quick requests, saved from earlier (PRD Messages MSG-005): each has instructions, so
// Intercept drafts it from the conversation and the patient's chart. The app loads them from the clinician's account.
const sampleSavedQuickRequests: QuickRequest[] = [
	{
		name: "trend",
		description: "Ask how the patient is trending",
		message: "How is {first name} doing? I want to keep an eye on the trend.",
		instructions: "Mention the vitals that changed most since the nurse's last message, with their values.",
		custom: true,
	},
	{
		name: "redraw",
		description: "Ask to repeat the flagged labs",
		message: "Can you repeat {first name}'s flagged labs and message me when they're back?",
		instructions: "Mention the latest flagged labs with their previous values.",
		custom: true,
	},
	{
		name: "titrate",
		description: "Confirm the drips before titrating",
		message: "Before I change anything for {first name}, can you confirm the pumps match this?",
		instructions: "List the current drips and their recent rate changes.",
		custom: true,
	},
	{
		name: "catchup",
		description: "Tell the nurse what you're seeing",
		message: "Thanks, {nurse}. Catching up on {first name}:",
		instructions: "Summarize the patient's situation in a sentence.",
		custom: true,
	},
	{
		name: "safety",
		description: "Safety check before a procedure",
		message: "Before we go ahead with {first name}, quick safety check:",
		instructions: "Include code status, allergies and isolation.",
		custom: true,
	},
];

export { sampleSavedQuickRequests };
