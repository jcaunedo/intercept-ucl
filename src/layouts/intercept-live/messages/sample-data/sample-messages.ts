import type { ConsultMessage, ConsultReplies } from "../alert-panel/consult-messages";
import { sampleBedsideReplier } from "../alert-panel/sample-bedside-replies";
import { samplePatients } from "../sample-data/sample-census";
import { sampleHospitals } from "../sample-data/sample-workspace";
import type { MessageContact, MessageConversation } from "./messages-panel";

// Synthetic inbox for the signed-in clinician (Joanna Smith): one conversation per person and patient at the four
// hospitals, newest first. A conversation is never about two patients (PRD Messages MSG-001): Kelly Ortiz has three of
// Sidney's MICU patients, so she has three conversations, one each; Brittany Cole has two at Bridgeport. The charge
// nurse and the pharmacist write about no patient. Two are urgent; the unread ones end with the person's latest
// messages. Times are counted back from when the stories load.

const MINUTE = 60_000;

/** A message `minutesAgo` before now. */
const at = (minutesAgo: number) => new Date(Date.now() - minutesAgo * MINUTE).toISOString();

/** Who wrote, how long ago, and what. */
type Line = [from: "bedside" | "you", minutesAgo: number, text: string];

const hospitalName = (hospitalId: string) => sampleHospitals.find((hospital) => hospital.id === hospitalId)?.name ?? "";

// The people (every nurse is a woman, CLAUDE.md "Sample Data"); the bedside nurses as their patients' records name them.
const kellyOrtiz: MessageContact = { name: "Kelly Ortiz", credential: "RN", role: "Bedside nurse", initials: "KO", tone: 4, presence: "online" };
const brittanyCole: MessageContact = { name: "Brittany Cole", credential: "RN", role: "Bedside nurse", initials: "BC", tone: 6, presence: "online" };
const ashleyBell: MessageContact = { name: "Ashley Bell", credential: "RN", role: "Bedside nurse", initials: "AB", tone: 7, presence: "online" };
const kaylaBrandt: MessageContact = { name: "Kayla Brandt", credential: "RN", role: "Bedside nurse", initials: "KB", tone: 5, presence: "online" };
const taraBecker: MessageContact = { name: "Tara Becker", credential: "RN", role: "Bedside nurse", initials: "TB", tone: 5, presence: "online" };
const nicoleBennett: MessageContact = { name: "Nicole Bennett", credential: "RN", role: "Charge nurse", initials: "NB", tone: 3, presence: "online" };
const markEllison: MessageContact = { name: "Mark Ellison", credential: "PharmD", role: "Pharmacist", initials: "ME", tone: 10, presence: "away" };

/** Replies about no patient: a short word back, or "will do" for an ask. */
const generalReplies: ConsultReplies = (message) =>
	/\?\s*$/.test(message.trim()) ? "Let me check and get back to you." : "Thanks, will do.";

/** A conversation with `contact` about one patient (`patientId`), or about none (`undefined`). */
function conversation(
	id: string,
	contact: MessageContact,
	hospitalId: string,
	patientId: string | undefined,
	lines: Line[],
	options: {
		unread?: number;
		urgent?: boolean;
		photos?: ConsultMessage[];
		scenario?: "chf" | "copd";
	} = {},
): MessageConversation {
	const patient = patientId ? samplePatients.find((item) => item.id === patientId) : undefined;
	if (patientId && !patient) throw new Error(`No sample patient ${patientId}`);
	const messages: ConsultMessage[] = [
		...lines.map(([from, minutesAgo, text], index) => ({
			id: `${id}-${index}`,
			from,
			text,
			patientId,
			sentAt: at(minutesAgo),
		})),
		...(options.photos ?? []),
	].sort((a, b) => Date.parse(a.sentAt) - Date.parse(b.sentAt));
	return {
		id,
		with: contact,
		hospitalId,
		hospital: hospitalName(hospitalId),
		channel: "Hospital messaging",
		patient,
		messages,
		unread: options.unread,
		urgent: options.urgent,
		replies: patient
			? sampleBedsideReplier({
					firstName: patient.firstName,
					sex: patient.sex,
					scenario: options.scenario,
					ventilated: patient.tags?.some((tag) => tag.label === "Ventilated"),
				})
			: generalReplies,
	};
}

const sampleMessageConversations: MessageConversation[] = [
	// Kelly Ortiz has three of Sidney's MICU patients, a conversation each. Septic shock: Sarah Miller's MAP under target
	// on norepinephrine. Urgent, unread.
	conversation("c-kelly-ortiz-p1", kellyOrtiz, "sidney", "p1", [
		["you", 95, "Can you send me Sarah's 2nd lactate when it's back?"],
		["bedside", 80, "Lactate 3.8, down from 4.6."],
		["you", 78, "Thanks. Keep norepi titrating to MAP 65 or more."],
		["bedside", 6, "MAP 58 on norepi 0.2 for the last 15 min. Want me to go up, or start vasopressin?"],
		["bedside", 3, "Her family is here too and asking for you."],
	], { unread: 2, urgent: true }),
	// This morning, Emily Carter's NIV mask.
	conversation("c-kelly-ortiz-p5", kellyOrtiz, "sidney", "p5", [
		["bedside", 240, "Emily's NIV mask is leaking and the bridge of her nose is getting red. OK to switch to the full face mask?"],
		["you", 235, "Yes, switch it, and pad her nose."],
		["bedside", 220, "Done. Leak is down."],
	]),
	// Yesterday, William Harris's blood cultures.
	conversation("c-kelly-ortiz-p9", kellyOrtiz, "sidney", "p9", [
		["bedside", 26 * 60, "Blood cultures are drawn on Mr. Harris, antibiotics started at 6:10."],
		["you", 26 * 60 - 5, "Thanks. Let me know when the first set is back."],
	]),
	// Chadron's charge nurse, about no patient: short-staffed tonight.
	conversation("c-nicole-bennett", nicoleBennett, "chadron", undefined, [
		["bedside", 15, "Heads up: we're down one nurse until 11 PM. Kayla has beds 3 to 8 tonight."],
		["bedside", 14, "Can you keep a closer eye on those on camera until then?"],
	], { unread: 2 }),
	// Scenario 1's patient at Chadron, before her early warning.
	conversation("c-kayla-brandt-p15", kaylaBrandt, "chadron", "p15", [
		["bedside", 140, "Mrs. Hayes is asking if she can have her evening meds early, she wants to sleep."],
		["you", 132, "That's fine, give them now."],
		["bedside", 22, "She needed 2 pillows to lie flat tonight. Lungs sound wetter than this morning."],
	], { unread: 1, scenario: "chf" }),
	// Brittany Cole at Bridgeport, a conversation per patient: a blood gas for Gary Peterson, as a photo...
	conversation("c-brittany-cole-p25", brittanyCole, "bridgeport", "p25", [
		["bedside", 32, "Repeat ABG on Mr. Peterson after the BiPAP change. Photo below."],
		["bedside", 30, "He looks more comfortable, RR down to 22."],
	], {
		unread: 3,
		photos: [
			{
				id: "c-brittany-cole-p25-abg",
				from: "bedside",
				patientId: "p25",
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
	}),
	// ...and this morning's word on Dorothy Lambert.
	conversation("c-brittany-cole-p26", brittanyCole, "bridgeport", "p26", [
		["bedside", 380, "Dorothy's night was quiet. Pain 2/10, ate half her breakfast."],
		["you", 370, "Great, thanks for the update."],
	]),
	// Short of breath at Alliance. Urgent, already read: the clinician answered.
	conversation("c-ashley-bell-p17", ashleyBell, "alliance", "p17", [
		["bedside", 48, "Lucía is more short of breath. SpO₂ 88% on 4 L, RR 28."],
		["you", 46, "Go up to 6 L and get a chest X-ray. I'll look in on the camera."],
		["bedside", 41, "On 6 L, SpO₂ 92%. X-ray is ordered."],
	], { urgent: true }),
	// Sidney's pharmacist, about no patient: a shortage that bears on Kelly's vasopressin question.
	conversation("c-mark-ellison", markEllison, "sidney", undefined, [
		["bedside", 150, "Vasopressin is short this week: 6 vials left in the hospital. Please check with me before starting it."],
		["you", 145, "Understood, thanks for the warning."],
	]),
	conversation("c-tara-becker-p3", taraBecker, "sidney", "p3", [
		["you", 210, "Did the family meeting happen?"],
		["bedside", 190, "Yes. They want to keep full code for now and talk again tomorrow."],
	]),
];

export { sampleMessageConversations };
