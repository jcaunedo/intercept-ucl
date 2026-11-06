import type { MonitorVitals } from "@/components/cards/patient-monitoring-card";

import type { PatientRecord } from "../patient-details/patient-details";
import type { ConsultTranscript, ConsultTranscriptSegment } from "./consult-transcript";

// Story-only: what the AI Notetaker hears on a video consult, as speech recognition writes it (prototype only; an app
// gets real segments from its transcription service). Each conversation is the intensivist and the bedside nurse going
// over the patient: how they're doing, the numbers, the plan and what the pathway could be, and the family. Sarah Miller
// (p1), Margaret Hayes (Scenario 1), Dale Reynolds (Scenario 2), Rosa Medina (Scenario 3) and Tyler Kessler (Scenario 4)
// have their own, from their charts and scenarios; every other patient's is built from their record. Doses and settings are illustrative until clinical review. A `heard` line
// is recognition's first guess at a word it mishears, corrected as the segment ends, as Whisper does.
// Nobody says the clinician's name or Intercept's (Nov 5, 2026, user's call: "so it is agnostic"): the script fits
// whoever is on the call; the transcript labels them You.

type ConsultTranscriptContext = {
	patientId: string;
	firstName?: string;
	lastName?: string;
	sex?: string;
	/** The patient's live numbers. */
	vitals?: MonitorVitals;
	/** The bedside nurse's name, "Kelly Ortiz". */
	nurse?: string;
	/** The patient's chart: diagnosis, drips, labs, code status, allergies, care team. */
	record?: PatientRecord;
};

type Say = [speaker: string, text: string, heard?: string, pause?: number];

const segments = (lines: Say[]): ConsultTranscriptSegment[] =>
	lines.map(([speaker, text, heard, pause]) => ({ speaker, text, heard, pause }));

const firstOf = (name: string) => name.split(" ")[0];

/** The clinician on the call: the record's "you", else Intercept's intensivist. */
const clinicianOf = (record?: PatientRecord) => record?.careTeam?.find((member) => member.you)?.name ?? "Joanna Smith";

/* -------------------------------------------------------------------------- */
/* Sarah Miller (p1): septic shock from pneumonia, ARDS, Sidney               */
/* -------------------------------------------------------------------------- */

function sarahMiller(nurse: string, clinician: string): ConsultTranscript {
	const n = firstOf(nurse);
	return {
		speakers: [
			{ id: "you", name: clinician, you: true },
			{ id: "nurse", name: `${nurse}, RN` },
			{ id: "family", name: "Mark Miller, husband" },
		],
		segments: segments([
			["you", `Hi ${n}. I've got Sarah's chart up. Can you walk me through the last hour?`],
			["nurse", `Hi. So her pressure's been drifting all evening. MAP was 70 at six, it's 58 now.`],
			["nurse", "I went up on the norepi to 0.22 about forty minutes ago and she's barely responded.", "I went up on the nora P to 0.22 about forty minutes ago and she's barely responded."],
			["nurse", "Vaso's still running at 0.03."],
			["you", "Okay. And she's tachy at 128. Is that new?"],
			["nurse", "New since about seven. Sinus on the monitor, no ectopy that I've seen."],
			["you", "Lactate came back at 4.1. That's up from 2.2 this afternoon, so she's not clearing."],
			["nurse", "I saw that. Procalcitonin's drawn, it's still pending.", "I saw that. Pro calcitonin's drawn, it's still pending."],
			["you", "What about her lungs? I see RT went up on her settings."],
			["nurse", "Yeah, RT bumped her to FiO₂ 60 and a PEEP of 10 a couple of hours ago. Her sats were dropping into the mid-eighties.", "Yeah, RT bumped her to FIO 2 60 and a peep of 10 a couple of hours ago. Her sats were dropping into the mid-eighties."],
			["nurse", "She's sitting at 89, 90 now. Plateau was 28 when they checked."],
			["you", "She's breathing at 32 over a set rate of 22. Is she fighting the vent?"],
			["nurse", "A little. She started over-breathing after we came down on the propofol. She's at 30 right now."],
			["you", "Let's go up on the fentanyl to 75 first and give it ten minutes. If she's still over-breathing, then back up on the propofol."],
			["nurse", "Okay. I didn't want to push the propofol with her pressure where it is."],
			["you", "Agreed. And let's drop her tidal volume to 380. She's at about seven per kilo of ideal body weight, I want her closer to six.", "Agreed. And let's drop her tidal volume to 3 80. She's at about seven per kilo of ideal body weight, I want her closer to six."],
			["nurse", "380. I'll let RT know."],
			["you", "Her last gas was 7.29, CO₂ 46. Repeat it thirty minutes after the change.", "Her last gas was 7 29, CO2 46. Repeat it thirty minutes after the change."],
			["you", "If her P/F stays under 150 on that gas, I want to talk about proning tonight. Do you have the people for it?", "If her P over F stays under 150 on that gas, I want to talk about proning tonight. Do you have the people for it?"],
			["nurse", "We've got four of us on tonight, plus RT. We did one last week, it took about twenty minutes."],
			["you", "Good. Let's plan for it, but not before the gas."],
			["you", "Now the shock. She's on norepi and vaso and still under 65. I want to start hydrocortisone, 50 every six hours."],
			["nurse", "Okay. Her sugars have been running high though, 240 at the last check."],
			["you", "Right, she's diabetic. Go up on the insulin drip per protocol, and check her every hour while she's on the steroid."],
			["you", "Has she had any fluid since this afternoon?"],
			["nurse", "A liter at four. Nothing since. She's put out about 15 an hour for the last three hours."],
			["you", "And her creatinine's 1.9, up from 1.4. Can you do a passive leg raise while I'm on? I want to see if her pressure responds before we give more."],
			["nurse", "Sure, give me a second.", undefined, 1.2],
			["nurse", "Okay, legs are up. MAP's coming up to 63, 64.", "Okay, legs are up. MAPs coming up to 63 64.", 4],
			["you", "That's a response. Give her 500 of lactated Ringer's over thirty minutes.", "That's a response. Give her 500 of lactated ringers over thirty minutes."],
			["you", "And her potassium's 3.3. Replace that, 40 IV through the central line."],
			["nurse", "Okay. What about antibiotics? She's been on cefepime, vanc and azithro since admission.", "Okay. What about antibiotics? She's been on cefa pine, vank and azithro since admission."],
			["you", "Is the sputum culture back?"],
			["nurse", "Preliminary is gram-negative rods. No sensitivities yet.", "Preliminary is gram negative rods. No sensitivities yet."],
			["you", "She has a penicillin allergy listed. Do we know what kind?"],
			["nurse", "Her husband said a rash when she was a kid. She's done fine on the cefepime."],
			["you", "Okay. She's getting worse on day three, so I want to switch the cefepime to meropenem until the sensitivities are back. I'll put that in.", "Okay. She's getting worse on day three, so I want to switch the cefepime to mero penem until the sensitivities are back. I'll put that in."],
			["nurse", "Got it. Her husband's actually here, he's been asking to talk to someone. Is now okay?"],
			["you", "Yes, of course. Bring him in."],
			["nurse", "Mark, this is the ICU doctor on the video. They've been watching Sarah tonight.", undefined, 3],
			["you", "Hi Mark. Before we start, a notetaker is recording this call for Sarah's chart. Is that all right with you?"],
			["family", "Yeah. Yeah, that's fine."],
			["family", "I just... nobody's really told me what's going on. The nurse said her blood pressure is low?"],
			["you", "That's right. Sarah has a serious infection in her lungs, a pneumonia, and it's affecting her whole body. That's why her pressure is low, and why she needs the breathing machine."],
			["you", "We're giving her medicines to hold her blood pressure up, and tonight we're adding a steroid and changing her antibiotic."],
			["family", "Is she going to be okay?"],
			["you", "She's very sick, Mark. I won't pretend she isn't. The next day or two matter a lot. She's young and she was healthy, and that's on her side."],
			["family", "Okay.", undefined, 1.8],
			["family", "Our kids keep asking if they can see her. They're eight and eleven.", undefined, 1.6],
			["nurse", "She's on droplet precautions, so they'd need masks. We can set it up with child life in the morning."],
			["you", `I think that's a good idea. ${n} can help you get them ready for what they'll see, the tubes and the monitors.`],
			["family", "Thank you. And she'd want everything done. We talked about it before."],
			["you", "Understood. She's full code, and that's what we're doing. If anything changes, I'll call you myself."],
			["you", `${n}, do we have a good number for him?`],
			["nurse", "Yes, he's her emergency contact in the chart."],
			["you", "Great. So, to recap for the note. Fentanyl up to 75, then propofol if she's still dyssynchronous. Tidal volume 380, gas in thirty minutes.", "Great. So, to recap for the note. Fentanyl up to 75, then propofol if she's still dis synchronous. Tidal volume 380, gas in thirty minutes.", 2],
			["you", "Hydrocortisone 50 every six, insulin per protocol. 500 of LR now, potassium 40. Switch cefepime to meropenem."],
			["you", "If her P/F is under 150 on the next gas, we prone. I'll update Dr. Mitchell when she's out of the OR."],
			["nurse", "Got it. I'll message you the gas as soon as it's back."],
			["you", `Thanks, ${n}. Call me if her MAP drops under 60 or she desats below 88.`],
		]),
	};
}

/* -------------------------------------------------------------------------- */
/* Margaret Hayes (Scenario 1): heart failure at 2 a.m., Chadron              */
/* -------------------------------------------------------------------------- */

function margaretHayes(nurse: string, clinician: string): ConsultTranscript {
	const n = firstOf(nurse);
	return {
		speakers: [
			{ id: "you", name: clinician, you: true },
			{ id: "nurse", name: `${nurse}, RN` },
			{ id: "patient", name: "Margaret Hayes, patient" },
		],
		segments: segments([
			["you", `Hi ${n}. Her score jumped and I wanted to see Margaret with you.`],
			["nurse", `Thanks for calling. She's been more short of breath since about midnight. She can't lie flat, she's been sitting up on the edge of the bed.`],
			["nurse", "Respiratory rate's 26 now, it was 18 at eight. Sats 89 on 4 liters."],
			["you", "What does her chest sound like?"],
			["nurse", "Crackles halfway up on both sides. Worse than this evening. And her legs are more swollen, 2-plus up to the knees.", "Crackles halfway up on both sides. Worse than this evening. And her legs are more swollen, 2 plus up to the knees."],
			["you", "She's net 1.8 liters positive and up 2.1 kilos over two days, on 40 of IV furosemide. So the diuretic isn't keeping up.", "She's net 1.8 liters positive and up 2.1 kilos over two days, on 40 of IV furosemide. So the diuretic isn't keeping up."],
			["nurse", "Her output's been poor tonight. Maybe 150 since ten."],
			["you", "Her BNP's 2,400, up from 1,850, and creatinine's 1.9. Her baseline is about 1.5.", "Her BNP's 2400, up from 1850, and creatinine's 1.9. Her baseline is about 1.5."],
			["you", "Can I talk to her for a second?"],
			["nurse", "Margaret, the doctor on the screen wants to talk to you.", undefined, 1.2],
			["you", "Hi Margaret. How's your breathing right now?"],
			["patient", "Not good. It feels like... like I can't get a full breath.", undefined, 1.4],
			["patient", "Same as last time. When I came in in the spring."],
			["you", "Okay. We're going to help you with that tonight. Any chest pain?"],
			["patient", "No. No pain. Just tired."],
			["you", "Thank you. Stay sitting up, that helps.", undefined, 1],
			["you", `${n}, her pressure's 148 systolic. I'd like to put her on BiPAP. Do you have a machine?`],
			["nurse", "There's one free in the ER. Respiratory's on call from home, about twenty minutes out."],
			["you", "Let's call them in now. IPAP 10, EPAP 5, FiO₂ 40%. Target sats 92 or better, rate under 24.", "Let's call them in now. I pap 10, E pap 5, FIO 2 40%. Target sats 92 or better, rate under 24."],
			["you", "Furosemide 80 IV now, then a drip at 10 an hour. We want 100 an hour of urine over the next two hours."],
			["you", "And nitroglycerin, start at 10 micrograms a minute, up 10 every five minutes, only while her systolic stays over 110."],
			["nurse", "Okay. She's got a Foley in, so I can give you hourly outputs."],
			["you", "Good. These need Dr. Weller's co-signature, I'll send them to him now."],
			["nurse", "He's on call from home tonight. He usually answers fast."],
			["you", "Is there any family we should update?"],
			["nurse", "Her daughter Linda's in Omaha. She asked to be called if anything changed, any time of night."],
			["you", "I'll call her after this. Is Margaret still full code?"],
			["nurse", "Full code. She said so again on admission."],
			["you", "Okay. Here's the question for tonight. If she's not better on BiPAP, she'd need to go to Regional West. How are you staffed?"],
			["nurse", "It's just me on the floor with nine patients. The on-call nurse can come in if we need her."],
			["you", "Then let's call her in for the first couple of hours. I'd rather keep Margaret here if she turns around."],
			["you", "We'll check at one hour. If her rate's under 24 and her sats are 92 or better, she stays. If not, we start the transfer."],
			["nurse", "Got it. I'll get the BiPAP from the ER and page respiratory now."],
			["you", `Thanks, ${n}. I'll stay on the monitor. Message me her numbers once she's on the mask.`],
		]),
	};
}

/* -------------------------------------------------------------------------- */
/* Dale Reynolds (Scenario 2): COPD in a blizzard, Alliance ED               */
/* -------------------------------------------------------------------------- */

function daleReynolds(nurse: string, clinician: string): ConsultTranscript {
	const n = firstOf(nurse);
	return {
		speakers: [
			{ id: "you", name: clinician, you: true },
			{ id: "nurse", name: `${nurse}, RN` },
			{ id: "rt", name: "Rachel Lindgren, RRT" },
			{ id: "family", name: "Carol Reynolds, wife" },
		],
		segments: segments([
			["you", `Hi ${n}. The video dropped, so we're on audio. Can you hear me okay?`],
			["nurse", "I can hear you. It's choppy, but okay."],
			["you", "Good. Tell me about Dale."],
			["nurse", "64, severe COPD, on 2 liters at home. He ran out of oxygen four days ago, the roads have been closed with the storm."],
			["nurse", "His wife drove him in tonight. He's been on BiPAP about twenty minutes."],
			["you", "His gas on arrival was 7.24, CO₂ 78. What's his baseline?", "His gas on arrival was 7 24, CO2 78. What's his baseline?"],
			["nurse", "His last CO₂ at discharge was 55.", "His last CO2 at discharge was 55."],
			["you", "So he's well above his usual. How's he looking on the mask?"],
			["nurse", "Rate's 30, heart rate 112, sats 88. He's working hard, but he's following commands."],
			["you", "Rachel, are you there? What are the settings?"],
			["rt", "IPAP 12, EPAP 5, FiO₂ 35%. Mask's sealing well, leak around 16.", "I pap 12, E pap 5, FIO 2 35%. Mask's sealing well, leak around 16."],
			["you", "Let's go up to an IPAP of 14. Keep sats 88 to 92, no higher."],
			["rt", "14, okay. I'll put the nebs in line too."],
			["you", "Yes. DuoNeb every twenty minutes times three, then every four hours. Methylprednisolone 40 IV, and azithromycin 500.", "Yes. Duo neb every twenty minutes times three, then every four hours. Methylprednisolone 40 IV, and azithromycin 500."],
			["nurse", "He's had green sputum for three days, his wife said. White count's 12.8."],
			["you", "Good, send a sputum culture before the azithro."],
			["you", "Now, transfer. What's the word on Regional West?"],
			["nurse", "They have a bed, but air's grounded and the highway to Scottsbluff is closed. No one knows when it'll open."],
			["you", "Then we stabilize him here. Repeat the gas at one hour. If his pH isn't rising and his CO₂ isn't coming down, we intubate here.", "Then we stabilize him here. Repeat the gas at one hour. If his pH isn't rising and his CO2 isn't coming down, we intubate here."],
			["you", "I'd like to go over the intubation plan with Dr. Keller now, so it's ready if we need it."],
			["nurse", "He's two bays down. I'll grab him after this."],
			["nurse", "His wife Carol is right here. She wants to say something.", undefined, 1.4],
			["family", "Hi. Is he... is he going to need the breathing tube?"],
			["you", "Hi Carol. We're doing everything we can so he doesn't. The mask is helping him breathe out the carbon dioxide that's built up."],
			["you", "We'll know a lot more in an hour, when we check his blood again. If he needs the tube, the team here is ready, and I'll be watching with them."],
			["family", "He'd want that. He's said before, he wants everything done."],
			["you", "Thank you for telling me. We'll make sure that's in his chart."],
			["you", `${n}, can you send me a photo of the gas when it's back? The video's not going to hold.`],
			["nurse", "Yes. I'll send it in Messages."],
			["you", "Thanks. Call me sooner if he gets drowsy or his rate goes over 35."],
		]),
	};
}

/**
 * Rosa Medina (Scenario 3): Sidney ED, with Jenna Collins, NP leading at the bedside and a Spanish interpreter on the
 * call. Rosa speaks Spanish; the interpreter gives it in English, which is what the notes keep. The bundle, the renal
 * dose and the fluid-tolerance check, then the plan if MAP stays under 65.
 */
function rosaMedina(nurse: string, clinician: string): ConsultTranscript {
	const n = firstOf(nurse);
	return {
		speakers: [
			{ id: "you", name: clinician, you: true },
			{ id: "nurse", name: `${nurse}, RN` },
			{ id: "app", name: "Jenna Collins, NP" },
			{ id: "interpreter", name: "Lucía Herrera, interpreter" },
			{ id: "patient", name: "Rosa Medina" },
		],
		segments: segments([
			["you", `Hi ${n}. I'm watching Rosa's bundle with you. Is Jenna there?`],
			["app", "I'm here. 51, diabetes and CKD 4, three days of flank pain and burning. Pressure's 84 over 48, lactate 3.8."],
			["you", "Agreed, septic shock from the kidney. Cultures first, then the pip-tazo.", "Agreed, septic shock from the kidney. Cultures first, then the pip tazo."],
			["nurse", "Both sets are drawn. The antibiotic is hanging now."],
			["you", "Give the first dose in full. With her eGFR of 22, the next doses are 2.25 every six hours. I've confirmed it on the bundle.", "Give the first dose in full. With her EGFR of 22, the next doses are 2.25 every six hours. I've confirmed it on the bundle."],
			["you", "Fluids in 500 boluses. Listen to her lungs and check her sats before each one; her kidneys won't clear much.", "Fluids in 500 boluses. Listen to her lungs and check her SATs before each one; her kidneys won't clear much."],
			["app", "Will do. First one's running."],
			["you", "Lucía, can you tell Rosa who I am, and ask how she's feeling?"],
			["interpreter", "Of course."],
			["patient", "Me duele mucho el costado y tengo frío. ¿Me voy a quedar aquí?", undefined, 1.2],
			["interpreter", "She says her side hurts a lot and she feels cold. She's asking if she'll be staying here."],
			["you", "Tell her we're treating the infection in her kidney now, and we're working to keep her here in Sidney, close to her daughter."],
			["interpreter", "She says thank you. Her daughter Elena is with her."],
			["you", "Jenna, if her MAP is still under 65 after the fluids, we'll start norepinephrine through a peripheral line. Is there a good IV above the wrist?", "Jenna, if her map is still under 65 after the fluids, we'll start norepinephrine through a peripheral line. Is there a good IV above the wrist?"],
			["nurse", "18 gauge in the right antecubital. It's clean."],
			["you", "Good. Site checks every hour, and her glucose is 390, so we'll start the insulin drip too."],
			["you", "Call me after the fourth bolus, or sooner if she gets crackles or her sats drop.", "Call me after the fourth bolus, or sooner if she gets crackles or her SATs drop."],
		]),
	};
}

/**
 * Tyler Kessler (Scenario 4): Bridgeport at 23:00, with Brittany Cole, the one night RN on the inpatient side, at the
 * bedside. Tyler is drowsy but talking: he tells them he's been stretching his insulin since he lost Medicaid. The
 * protocol's start, the potassium to watch as insulin pushes it down, and why the hourly checklist matters with one
 * nurse on.
 */
function tylerKessler(nurse: string, clinician: string): ConsultTranscript {
	const n = firstOf(nurse);
	return {
		speakers: [
			{ id: "you", name: clinician, you: true },
			{ id: "nurse", name: `${nurse}, RN` },
			{ id: "patient", name: "Tyler Kessler" },
		],
		segments: segments([
			["you", `Hi ${n}. I've got Tyler's labs up. pH 7.08, bicarb 6, gap 28. How is he?`, `Hi ${n}. I've got Tyler's labs up. PH 7.08, bicarb 6, gap 28. How is he?`],
			["nurse", "Drowsy, but he answers. Breathing deep and fast, about 30. Heart rate 122, pressure 98 over 58."],
			["nurse", "Second liter of saline is running. Nothing else yet."],
			["you", "Okay. I'm starting the DKA protocol from here. Insulin at 7 units an hour, no bolus. Derek will co-sign."],
			["you", "His potassium is 5.6 now, but it'll fall fast once the insulin's in. No potassium in the fluids while it's over 5.2."],
			["nurse", "Got it. And under 3.3?"],
			["you", "Under 3.3 the protocol holds the insulin and asks for KCl. It'll tell you on the checklist; you don't have to do the math."],
			["you", "Can I talk to Tyler for a second?", undefined, 1.0],
			["nurse", "Tyler, the doctor on the screen wants to talk to you."],
			["patient", "Yeah. Hi. Sorry. I feel really sick."],
			["you", "Hi Tyler. You're in the right place. When did you last take your long-acting insulin?"],
			["patient", "Two days ago. I ran out. I've been, like, stretching it since I lost my Medicaid in August."],
			["patient", "I'd skip the shots at meals and take less at night so a pen would last longer.", undefined, 1.2],
			["you", "Thank you for telling me. That's not on you. We'll get you through tonight, and before you go home we'll work on getting you insulin you can afford."],
			["patient", "Okay. Thanks."],
			["you", `${n}, you're the only nurse on tonight, right?`],
			["nurse", "Just me on the inpatient side. Derek's on call from home."],
			["you", "Then lean on the checklist. Glucose and potassium every hour; it sets the rate from each glucose, and if a check runs ten minutes late, you and our tele-RN both get a nudge."],
			["you", "Rate changes come to my phone. I'll sign them right away."],
			["nurse", "Okay. First check at midnight."],
			["you", "Call me if he gets more drowsy, if potassium comes back under 3.3, or if his pressure drops under 90."],
		]),
	};
}

/* -------------------------------------------------------------------------- */
/* Every other patient, from their chart                                      */
/* -------------------------------------------------------------------------- */

/** "Septic shock" → "septic shock", leaving "ARDS" and "COPD" alone. */
const sentenceCase = (text: string) => (/^[A-Z][A-Z]/.test(text) ? text : text.charAt(0).toLowerCase() + text.slice(1));

/** A consult built from the patient's record: the nurse's update, a drip, a lab, the plan, code status and family. */
function fromRecord({ firstName, sex, vitals, record }: ConsultTranscriptContext, nurseName: string, clinician: string): ConsultTranscript {
	const n = firstOf(nurseName);
	const name = firstName ?? "the patient";
	const he = sex === "F" ? "she" : sex === "M" ? "he" : "they";
	const He = he.charAt(0).toUpperCase() + he.slice(1);
	const his = sex === "F" ? "her" : sex === "M" ? "his" : "their";
	const is = he === "they" ? "are" : "is";
	const has = he === "they" ? "have" : "has";
	const round = (value: number | undefined) => (value === undefined ? undefined : Math.round(value));
	const [hr, systolic, diastolic, spo2, rr] = [round(vitals?.hr), round(vitals?.systolic), round(vitals?.diastolic), round(vitals?.spo2), round(vitals?.rr)];
	const support = record?.ventilator?.support;
	const onSupport = support === "Invasive" ? " on the vent" : support === "NIV" ? " on BiPAP" : "";
	const drip = record?.infusions?.find((infusion) => infusion.change) ?? record?.infusions?.[0];
	const lab = record?.labs?.find((item) => item.value && item.flag && item.previous) ?? record?.labs?.find((item) => item.value && item.flag);
	const allergy = record?.allergies?.[0];
	const code = record?.codeStatus;

	const lines: (Say | false | "" | undefined)[] = [
		["you", `Hi ${n}. I'm looking at ${name}'s numbers. How ${is} ${he} doing?`],
		record?.diagnosis
			? ["nurse", `Hi. So ${he}'s here with ${sentenceCase(record.diagnosis)}. ${He}'s been about the same this last hour, maybe a little more tired.`]
			: ["nurse", `Hi. ${He}'s been about the same this last hour, maybe a little more tired.`],
		hr !== undefined && systolic !== undefined && spo2 !== undefined && [
			"nurse",
			`Heart rate's ${hr}, pressure ${systolic} over ${diastolic ?? "--"}, sats ${spo2}%${onSupport}${rr !== undefined ? `, breathing at ${rr}` : ""}.`,
		],
		drip?.rate && [
			"nurse",
			drip.change
				? `${drip.drug} is at ${drip.rate}. We went ${drip.change.direction} from ${drip.change.from} earlier.`
				: `${drip.drug} is running at ${drip.rate}, no changes tonight.`,
		],
		lab && [
			"you",
			lab.previous
				? `I see ${his} ${lab.name} came back at ${lab.value}, from ${lab.previous.value} before. Did you see that?`
				: `I see ${his} ${lab.name} came back at ${lab.value}${lab.flag ? `, ${lab.flag}` : ""}. Did you see that?`,
		],
		lab && ["nurse", "I did. Do you want it repeated?"],
		lab && ["you", "Yes, repeat it in four hours, and let's trend it with the morning labs."],
		["you", `What's ${he} like at the bedside? Anything I can't see from here?`],
		[
			"nurse",
			support === "Invasive"
				? `${He}'s sedated, comfortable. Suctioned a little while ago, secretions are thinner than this morning.`
				: `${He}'s awake, a bit anxious. ${He} says ${he} feels okay, just tired.`,
		],
		drip?.rate && ["you", `Okay. Keep the ${drip.drug.toLowerCase()} where it is for now and call me if you need to go up again.`],
		["you", `Let's get vitals every fifteen minutes for the next hour, and I'll check back in after that.`],
		allergy && ["you", `I have ${allergy.toLowerCase()} as an allergy. Is that right?`],
		allergy && ["nurse", "Yes, that's confirmed in the chart."],
		code && ["you", `And ${he} ${is} still ${code === "Full code" ? "full code" : code}?`],
		code && ["nurse", code === "Full code" ? "Full code. Nothing's changed." : `Yes, ${code}. The family's aware.`],
		["nurse", `${His(his)} family called earlier asking for an update. They're coming in this morning.`],
		["you", `I'll call them before they come in. Is there someone who ${has} been the main contact?`],
		["nurse", `${His(his)} ${sex === "F" ? "husband" : sex === "M" ? "wife" : "son"}. The number's in the chart.`],
		["you", `Great. So for the note: repeat labs in four hours, vitals every fifteen minutes, and I'll update the family. Thanks, ${n}.`],
		["nurse", "Sounds good. I'll message you if anything changes."],
	];
	return {
		speakers: [
			{ id: "you", name: clinician, you: true },
			{ id: "nurse", name: `${nurseName}, RN` },
		],
		segments: segments(lines.filter((line): line is Say => Boolean(line))),
	};
}

const His = (his: string) => his.charAt(0).toUpperCase() + his.slice(1);

/**
 * What the notetaker hears on a consult about this patient: their scenario's or chart's conversation between the
 * intensivist and the bedside nurse, and at times the family or the patient.
 */
function sampleConsultTranscript(context: ConsultTranscriptContext): ConsultTranscript {
	const nurse = context.nurse ?? context.record?.careTeam?.find((member) => member.role === "Bedside nurse")?.name ?? "the bedside nurse";
	const clinician = clinicianOf(context.record);
	if (context.patientId === "p1") return sarahMiller(nurse, clinician);
	if (context.patientId === "p15") return margaretHayes(nurse, clinician);
	if (context.patientId === "p21") return daleReynolds(nurse, clinician);
	if (context.patientId === "p23") return rosaMedina(nurse, clinician);
	if (context.patientId === "p24") return tylerKessler(nurse, clinician);
	return fromRecord(context, nurse, clinician);
}

export { sampleConsultTranscript, type ConsultTranscriptContext };
