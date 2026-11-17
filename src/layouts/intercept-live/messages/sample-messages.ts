import type { ConsultMessage } from "../alert-panel/consult-messages";
import { sampleBedsideReplier } from "../alert-panel/sample-bedside-replies";
import { samplePatientRecords } from "../patient-details/sample-patient-details";
import { samplePatients } from "../sample-data/sample-census";
import type { MessageThread } from "./messages-panel";

// Synthetic inbox for the signed-in clinician (Joanna Smith): one thread per patient with their bedside nurse, across
// the four hospitals, newest first. Two are urgent; the unread ones end with the bedside's latest messages. Times are
// counted back from when the stories load.

const MINUTE = 60_000;

/** A message `minutesAgo` before now. */
const at = (minutesAgo: number) => new Date(Date.now() - minutesAgo * MINUTE).toISOString();

type Line = [from: "bedside" | "you", minutesAgo: number, text: string];

// Fallback nurses for patients whose record names none, one per hospital (every bedside nurse is a woman, CLAUDE.md
// "Sample Data").
const hospitalNurses: Record<string, MessageThread["bedside"]> = {
	sidney: { name: "Ashley Brooks", role: "RN", initials: "AB", tone: 4, presence: "online" },
	chadron: { name: "Megan Foster", role: "RN", initials: "MF", tone: 2, presence: "online" },
	alliance: { name: "Rachel Lindgren", role: "RN", initials: "RL", tone: 7, presence: "away" },
	bridgeport: { name: "Brittany Cole", role: "RN", initials: "BC", tone: 6, presence: "online" },
};

/** The patient's bedside nurse from their record's care team, else their hospital's. */
function bedsideFor(patientId: string, hospitalId: string): MessageThread["bedside"] {
	const nurse = samplePatientRecords
		.find((record) => record.id === patientId)
		?.careTeam?.find((member) => member.role === "Bedside nurse");
	return nurse
		? { name: nurse.name, role: "RN", initials: nurse.initials, tone: nurse.tone, presence: nurse.presence }
		: hospitalNurses[hospitalId];
}

function thread(
	patientId: string,
	lines: Line[],
	options: { unread?: number; urgent?: boolean; photos?: ConsultMessage[]; scenario?: "chf" | "copd" } = {},
): MessageThread {
	const patient = samplePatients.find((item) => item.id === patientId);
	if (!patient) throw new Error(`No sample patient ${patientId}`);
	const messages: ConsultMessage[] = [
		...lines.map(([from, minutesAgo, text], index) => ({
			id: `${patientId}-inbox-${index}`,
			from,
			text,
			sentAt: at(minutesAgo),
		})),
		...(options.photos ?? []),
	].sort((a, b) => Date.parse(a.sentAt) - Date.parse(b.sentAt));
	return {
		id: patientId,
		patient,
		bedside: bedsideFor(patientId, patient.hospitalId),
		channel: "Hospital messaging",
		messages,
		unread: options.unread,
		urgent: options.urgent,
		replies: sampleBedsideReplier({
			firstName: patient.firstName,
			sex: patient.sex,
			scenario: options.scenario,
			ventilated: patient.tags?.some((tag) => tag.label === "Ventilated"),
		}),
	};
}

const sampleMessageThreads: MessageThread[] = [
	// Septic shock at Sidney: MAP under target on norepinephrine. Urgent, unread.
	thread(
		"p1",
		[
			["you", 95, "Can you send me the 2nd lactate when it's back?"],
			["bedside", 80, "Lactate 3.8, down from 4.6."],
			["you", 78, "Thanks. Keep norepi titrating to MAP 65 or more."],
			["bedside", 6, "MAP 58 on norepi 0.2 for the last 15 min. Want me to go up, or start vasopressin?"],
			["bedside", 3, "Family is here too and asking for you."],
		],
		{ unread: 2, urgent: true },
	),
	// A blood gas from Bridgeport's floor, as a photo of the printout.
	thread(
		"p25",
		[
			["bedside", 32, "Repeat ABG after the BiPAP change. Photo below."],
			["bedside", 30, "He looks more comfortable, RR down to 22."],
		],
		{
			unread: 3,
			photos: [
				{
					id: "p25-inbox-abg",
					from: "bedside",
					sentAt: at(31),
					photo: {
						id: "p25-abg",
						title: "Arterial blood gas",
						kind: "blood-gas",
						values: [
							{ label: "pH", value: "7.31" },
							{ label: "pCO₂", value: "52" },
							{ label: "pO₂", value: "68" },
							{ label: "HCO₃", value: "26" },
						],
						takenAt: at(31),
						takenBy: "Brittany Cole, RN",
					},
				},
			],
		},
	),
	// Short of breath at Alliance. Urgent, already read: the clinician answered.
	thread(
		"p17",
		[
			["bedside", 48, "She's more short of breath. SpO₂ 88% on 4 L, RR 28."],
			["you", 46, "Go up to 6 L and get a chest X-ray. I'll look in on the camera."],
			["bedside", 41, "On 6 L, SpO₂ 92%. X-ray is ordered."],
		],
		{ urgent: true },
	),
	// Scenario 1's patient at Chadron, before her early warning.
	thread(
		"p15",
		[
			["bedside", 140, "Mrs. Hayes is asking if she can have her evening meds early, she wants to sleep."],
			["you", 132, "That's fine, give them now."],
			["bedside", 22, "She needed 2 pillows to lie flat tonight. Lungs sound wetter than this morning."],
		],
		{ unread: 1, scenario: "chf" },
	),
	thread(
		"p3",
		[
			["you", 210, "Did the family meeting happen?"],
			["bedside", 190, "Yes. They want to keep full code for now and talk again tomorrow."],
		],
	),
	thread(
		"p26",
		[
			["bedside", 380, "Night was quiet. Pain 2/10, ate half her breakfast."],
			["you", 370, "Great, thanks for the update."],
		],
	),
	thread(
		"p9",
		[
			["bedside", 26 * 60, "Blood cultures are drawn, antibiotics started at 6:10."],
			["you", 26 * 60 - 5, "Thanks. Let me know when the first set is back."],
		],
	),
];

export { sampleMessageThreads };
