import type { PatientRecord } from "../patient-details";
import { samplePatientBaseRecords } from "../sample-patient-records";
import type { PatientNote, PatientNotes } from "./notes-section";
import { sampleEhrFor } from "../../sample-data/sample-ehr";

// Synthetic data (PRD Patient details PD-150): every Census patient's notes, newest first, written by their own care
// team (`sample-patient-records.ts`). Where a hospital takes Intercept notes back, signed Intercept notes are written to
// their record (Sidney and Alliance); elsewhere they stay signed in Intercept. Sidney took Harbor Point General's place
// here on Nov 6, 2026, when Harbor Point's patients moved to Sidney and it became Bridgeport (user's call).
// `sample-epic.ts` lists the same write-backs.
//
// Sarah Miller (`p1`) is the reference: one note of each status and an AI Scribe draft, in step with her record. She
// came in on aztreonam and azithromycin (penicillin allergy); vancomycin and aztreonam went in 30 min ago with her
// sepsis bundle, after blood cultures ×2.

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
const hoursAgo = (hours: number) => minutesAgo(hours * 60);

const writesBack: Record<string, boolean> = { "Alliance Community": true, "Sidney Regional": true, "Bridgeport Valley": false };

const sarahNotes: PatientNote[] = [
	{
		id: "p1-n1",
		type: "Tele-ICU progress note",
		author: { name: "Joanna Smith", role: "Intercept intensivist" },
		at: minutesAgo(18),
		origin: "intercept",
		status: "draft",
		sections: [
			{
				heading: "Assessment",
				text: "39-year-old woman, ICU day 3, septic shock from right lower lobe pneumonia with moderate ARDS and AKI stage 2. Worse over the last 6 hours: MAP 58 on norepinephrine 0.22 (from 0.08 this morning), lactate 4.1 from 2.2, SpO₂ 89% on FiO₂ 60% and PEEP 10. Flagged as a sepsis candidate by Sepsis Sniffer.",
			},
			{
				heading: "Plan",
				text: "Vancomycin and aztreonam given 30 min ago, after blood cultures ×2, for MRSA colonization and the preliminary sputum Gram stain. Vasopressin started. Repeat lactate in 2 hours. Discuss with Dr. Mitchell whether to keep azithromycin.",
			},
		],
	},
	{
		id: "p1-n2",
		type: "Huddle note",
		author: { name: "Joanna Smith", role: "Intercept intensivist" },
		at: minutesAgo(46),
		origin: "intercept",
		status: "draft",
		scribe: { sessionAt: minutesAgo(52) },
		sections: [
			{ heading: "Present", text: "Joanna Smith (Intercept intensivist), Kelly Ortiz (bedside RN), James Turner (Intercept APP)." },
			{
				heading: "Discussed",
				text: "Sats dipping to 88–89% with suctioning, thick secretions. MAP 58 to 62 on norepinephrine 0.22. Kelly reports cool extremities and urine output under 20 mL/h for 2 hours.",
			},
			{
				heading: "Tasks captured",
				text: "• Kelly: blood cultures ×2 now, then repeat lactate at 13:00.\n• James: ask pharmacy for vancomycin and aztreonam now, and vasopressin.\n• Joanna: call Dr. Mitchell about the antibiotics.",
			},
		],
	},
	{
		id: "p1-n3",
		type: "Nursing note",
		author: { name: "Kelly Ortiz", role: "RN", organization: "Sidney Regional" },
		at: minutesAgo(25),
		origin: "hospital",
		status: "signed",
		sections: [
			{
				text: "Norepinephrine titrated to 0.22 mcg/kg/min per order for MAP under 65. Blood cultures ×2 drawn, one peripheral and one from the right IJ line, then vancomycin and aztreonam started. Suctioned for thick tan secretions, SpO₂ 88% during suctioning, back to 92% after. Foley draining 15–20 mL/h, amber. Propofol 30. RASS -2.",
			},
		],
	},
	{
		id: "p1-n4",
		type: "Respiratory therapy note",
		author: { name: "Dana Brooks", role: "RRT", organization: "Sidney Regional" },
		at: hoursAgo(3),
		origin: "hospital",
		status: "signed",
		sections: [
			{
				text: "AC/VC, rate 22, tidal volume 420 mL. FiO₂ increased from 50% to 60% and PEEP from 8 to 10 per order for SpO₂ 87–89%. Plateau pressure 28 cmH₂O. Patient breathing over the set rate, total 30–32. Breath sounds coarse, diminished in the right base.",
			},
		],
	},
	{
		id: "p1-n5",
		type: "Tele-ICU progress note",
		author: { name: "James Turner", role: "Intercept APP" },
		at: hoursAgo(5),
		origin: "intercept",
		status: "written-back",
		writtenBackAt: minutesAgo(5 * 60 - 4),
		sections: [
			{
				heading: "Events",
				text: "MAP drifting to 62–66 overnight. Norepinephrine increased from 0.08 to 0.12 at 07:28 by the bedside team. Morning labs: creatinine 1.9 from 1.4, potassium 3.3.",
			},
			{ heading: "Plan", text: "Potassium replacement per protocol. Hold nephrotoxins. Reassess volume status with the bedside team." },
		],
	},
	{
		id: "p1-n6",
		type: "Event note",
		author: { name: "Maria Ruiz", role: "Intercept RN" },
		at: hoursAgo(7),
		origin: "intercept",
		status: "write-back-failed",
		failure:
			"Meditech didn't accept this note: Sidney closed the night encounter for review at 06:00. Your note is kept here. Try again, or ask Sidney's health information team to reopen it.",
		sections: [
			{
				text: "Camera check at the bedside team's request: patient comfortable on the ventilator, no distress. MAP 64 on norepinephrine 0.08. Bedside RN aware. No changes made.",
			},
		],
	},
	{
		id: "p1-n7",
		type: "ICU progress note",
		author: { name: "Laura Mitchell", role: "MD, Attending", organization: "Sidney Regional" },
		at: hoursAgo(26),
		origin: "hospital",
		status: "signed",
		sections: [
			{
				heading: "Assessment and plan",
				text: "Septic shock from community-acquired pneumonia, improving on norepinephrine 0.05. Moderate ARDS: low tidal volume ventilation, PEEP 8. AKI stage 2, creatinine 1.4, monitor. Continue aztreonam and azithromycin (penicillin allergy). Glucose by insulin protocol.",
			},
		],
	},
	{
		id: "p1-n8",
		type: "Tele-ICU admission note",
		author: { name: "Joanna Smith", role: "Intercept intensivist" },
		at: hoursAgo(50),
		origin: "intercept",
		status: "written-back",
		writtenBackAt: hoursAgo(50),
		sections: [
			{
				text: "Tele-ICU admission. Septic shock from right lower lobe pneumonia, intubated in the ED. Reviewed with Dr. Mitchell and the bedside team on camera. Lung-protective ventilation, norepinephrine for MAP under 65, aztreonam and azithromycin after cultures.",
			},
		],
	},
	{
		id: "p1-n9",
		type: "History and physical",
		author: { name: "Laura Mitchell", role: "MD, Attending", organization: "Sidney Regional" },
		at: hoursAgo(52),
		origin: "hospital",
		status: "signed",
		sections: [
			{
				heading: "History",
				text: "39-year-old woman with type 2 diabetes and hypertension, 4 days of cough, fever and shortness of breath. In the ED: SpO₂ 82% on room air, BP 84/50, lactate 3.4. Chest X-ray with right lower lobe consolidation. Intubated in the ED for hypoxic respiratory failure.",
			},
			{
				heading: "Plan",
				text: "Admit to MICU. Fluids 30 mL/kg, norepinephrine for MAP under 65, aztreonam and azithromycin after cultures (penicillin allergy). Lung-protective ventilation.",
			},
		],
	},
];

/* -------------------------------------------------------------------------- */
/* Builder                                                                    */
/* -------------------------------------------------------------------------- */

type NotesSpec = {
	/** The H&P: history, then the admission plan. */
	history: string;
	admitPlan: string;
	/** The bedside nurse's latest note, and how long ago. */
	nursing: [text: string, minutes: number];
	/** The respiratory therapist's note, for a patient on a ventilator. */
	rt?: string;
	/** The attending's progress note from yesterday, for a stay longer than a day. */
	yesterday?: string;
	/** James Turner's tele-ICU note this morning: events, then plan. */
	events: string;
	apPlan: string;
	/** Joanna Smith's draft today: the plan (the assessment is the brief's story). */
	plan: string;
};

const therapists: Record<string, [name: string, role: string]> = {
	"Alliance Community": ["Rachel Lindgren", "RRT"],
	"Sidney Regional": ["Ben Carter", "RRT"],
	// A critical access hospital: the respiratory therapist covers the ED and the floor.
	"Bridgeport Valley": ["Erin Walsh", "RRT"],
};

function buildNotes(record: PatientRecord, spec: NotesSpec): PatientNote[] {
	const staff = (role: string) => record.careTeam?.find((member) => member.role === role);
	const nurse = staff("Bedside nurse");
	const attending = staff("Attending of record");
	const hospital = nurse?.organization ?? attending?.organization ?? "";
	const hoursSince = (iso?: string) => (iso ? (Date.now() - Date.parse(iso)) / 3_600_000 : 0);
	const stay = hoursSince(record.admittedAt);
	const icu = hoursSince(record.icuAdmittedAt);
	// Signed Intercept notes: written to the hospital's record where it takes them back, otherwise signed in Intercept.
	const signed = (minutes: number): Pick<PatientNote, "status" | "writtenBackAt"> =>
		writesBack[hospital] ? { status: "written-back", writtenBackAt: minutesAgo(minutes - 3) } : { status: "signed" };
	const id = (n: number) => `${record.id}-n${n}`;
	const fromHospital = (name: string, role: string): PatientNote["author"] => ({ name, role, organization: hospital });
	const apMinutes = Math.min(300, Math.round((icu * 60) / 2));

	const notes: PatientNote[] = [
		{
			id: id(1),
			type: "Tele-ICU progress note",
			author: { name: "Joanna Smith", role: "Intercept intensivist" },
			at: minutesAgo(20),
			origin: "intercept",
			status: "draft",
			sections: [
				...(record.brief ? [{ heading: "Assessment", text: record.brief.text }] : []),
				{ heading: "Plan", text: spec.plan },
			],
		},
		...(nurse
			? [
					{
						id: id(2),
						type: "Nursing note",
						author: fromHospital(nurse.name, "RN"),
						at: minutesAgo(spec.nursing[1]),
						origin: "hospital" as const,
						status: "signed" as const,
						sections: [{ text: spec.nursing[0] }],
					},
				]
			: []),
		...(spec.rt
			? [
					{
						id: id(3),
						type: "Respiratory therapy note",
						author: fromHospital(...(therapists[hospital] ?? ["Respiratory therapist", "RRT"])),
						at: hoursAgo(3),
						origin: "hospital" as const,
						status: "signed" as const,
						sections: [{ text: spec.rt }],
					},
				]
			: []),
		{
			id: id(4),
			type: "Tele-ICU progress note",
			author: { name: "James Turner", role: "Intercept APP" },
			at: minutesAgo(apMinutes),
			origin: "intercept",
			...signed(apMinutes),
			sections: [
				{ heading: "Events", text: spec.events },
				{ heading: "Plan", text: spec.apPlan },
			],
		},
		...(spec.yesterday && attending && icu > 26
			? [
					{
						id: id(5),
						type: "ICU progress note",
						author: fromHospital(attending.name, "MD, Attending"),
						at: hoursAgo(26),
						origin: "hospital" as const,
						status: "signed" as const,
						sections: [{ heading: "Assessment and plan", text: spec.yesterday }],
					},
				]
			: []),
		{
			id: id(6),
			type: "Tele-ICU admission note",
			author: { name: "Joanna Smith", role: "Intercept intensivist" },
			at: hoursAgo(Math.max(icu - 1, 1)),
			origin: "intercept",
			...signed(Math.max(icu - 1, 1) * 60),
			sections: [
				{
					text: `Tele-ICU admission. ${record.diagnosis ?? "Diagnosis to follow"}.${attending ? ` Reviewed with Dr. ${attending.name.split(" ").pop()} and the bedside team on camera.` : ""} ${spec.admitPlan}`,
				},
			],
		},
		...(attending
			? [
					{
						id: id(7),
						type: "History and physical",
						author: fromHospital(attending.name, "MD, Attending"),
						at: hoursAgo(Math.max(stay - 1, 1)),
						origin: "hospital" as const,
						status: "signed" as const,
						sections: [
							{ heading: "History", text: spec.history },
							{ heading: "Plan", text: spec.admitPlan },
						],
					},
				]
			: []),
	];
	return notes;
}

/* -------------------------------------------------------------------------- */
/* Patients                                                                   */
/* -------------------------------------------------------------------------- */

const notesSpecs: Record<string, NotesSpec> = {
	p2: {
		history: "58-year-old man with obesity and hypertension, 5 days of fever, myalgia and cough, then worsening shortness of breath. Influenza A positive. SpO₂ 78% on a non-rebreather in the ED; intubated.",
		admitPlan: "Admit to MICU. Lung-protective ventilation, oseltamivir, ceftriaxone and vancomycin until cultures return. Droplet isolation.",
		nursing: ["Proned at 04:00, supine at 20:00 per protocol. Cisatracurium at 3, train-of-four 2 of 4. Skin intact. SpO₂ 82–86% on FiO₂ 80% this hour; RT and Intercept aware.", 30],
		rt: "AC/VC, tidal volume 450 mL, rate 26, PEEP 14, FiO₂ 80%. Plateau 31 cmH₂O. Recruitment maneuver tolerated, SpO₂ up 3 points for 20 min. ABG pH 7.27, PaCO₂ 58.",
		yesterday: "Severe ARDS from influenza A. P/F 96. Continue paralysis and prone positioning. Vancomycin stopped, MRSA swab negative. Oseltamivir day 2.",
		events: "Proned overnight, P/F 110 prone, 78 supine. Fentanyl increased to 100 for ventilator dyssynchrony.",
		apPlan: "Prone again this afternoon. Hold sedation wean while paralyzed. Daily ABG.",
		plan: "Prone now rather than at 16:00. If P/F stays under 80 prone, call Sidney's ECMO team for a consult. Conservative fluids.",
	},
	p3: {
		history: "67-year-old woman with CKD stage 3 and atrial fibrillation on apixaban, 2 days of confusion and fever. BP 78/40, lactate 4.6, pyuria. Intubated for airway protection after fluids.",
		admitPlan: "Admit to MICU. 30 mL/kg fluids, norepinephrine, ceftriaxone after blood and urine cultures. Hold apixaban and metoprolol.",
		nursing: ["Norepinephrine weaned to 0.08 per titration order, MAP 68–72. Urine output 40 mL/h. Afebrile overnight. Daughter called for an update.", 90],
		rt: "AC/VC, FiO₂ 40%, PEEP 8. Passed a spontaneous breathing trial for 30 min at 06:00, stopped for agitation. Plan another trial tomorrow.",
		yesterday: "E. coli bacteremia from the urine, sensitive to ceftriaxone. Norepinephrine 0.10. Creatinine 2.6, improving. Restart rate control when off pressors.",
		events: "Norepinephrine down to 0.08 from 0.10 overnight. Morning WBC 14.1 from 18.0, procalcitonin 3.2 from 7.8.",
		apPlan: "Keep weaning norepinephrine to MAP 65. Ceftriaxone day 3 of 7. Spontaneous breathing trial tomorrow.",
		plan: "Off norepinephrine by tonight if MAP holds. Ask Sidney's team about restarting apixaban once she's off pressors and creatinine keeps improving.",
	},
	p4: {
		history: "72-year-old man with ischemic cardiomyopathy, NSTEMI with cardiogenic shock. PCI to the circumflex in the cath lab, then dobutamine for a cardiac index of 1.8.",
		admitPlan: "Admit to CVICU. Dobutamine 5, heparin, aspirin and clopidogrel. Goals of care with family tomorrow. Contrast allergy premedication noted for the cath.",
		nursing: ["Norepinephrine up to 0.12 per titration order, MAP 66. Cool feet, cap refill 3 seconds. Urine 25 mL/h. Wife at the bedside, aware of the DNR order.", 35],
		yesterday: "Cardiogenic shock after NSTEMI. Cardiac index 2.1 on dobutamine 5. Goals of care meeting with the family: DNR, continue current treatment, no mechanical support.",
		events: "Norepinephrine 0.06 to 0.12 in the last hour by the bedside team. NT-proBNP up to 6,820. Troponin I pending.",
		apPlan: "Repeat lactate in 2 hours. Bedside echo. Check heparin level.",
		plan: "Discuss with Dr. Reyes whether to add milrinone, within the DNR goals agreed yesterday. Diuretics on hold while norepinephrine is going up.",
	},
	p5: {
		history: "29-year-old woman with severe persistent asthma, two prior ICU stays, 3 days of wheeze after a cold. Peak flow 30% of her best, PaCO₂ 61 in the ED. BiPAP, continuous albuterol, steroids and magnesium.",
		admitPlan: "Admit to MICU on BiPAP. Continuous albuterol, methylprednisolone 60 mg every 6 hours, low threshold to intubate.",
		nursing: ["SpO₂ probe off her finger and not reading since 14 min ago; replaced on the earlobe. Speaking in short sentences. On continuous albuterol. Anxious, reassured.", 12],
		rt: "BiPAP 14/6, FiO₂ 45%. Tolerating the mask. Continuous albuterol 10 mg/h. Wheeze less than at midnight. Peak flow 41% of her best.",
		events: "On BiPAP since last night, PaCO₂ 52 from 61. Potassium 3.2 on continuous albuterol.",
		apPlan: "Potassium replacement. Repeat ABG in 2 hours. Wean albuterol to every 2 hours if she keeps improving.",
		plan: "Confirm the SpO₂ reading is back before weaning anything. Repeat ABG at 2 hours. Intubate if PaCO₂ rises or she tires.",
	},
	p6: {
		history: "81-year-old man with Parkinson's disease, fell at home and broke his left hip. Hemiarthroplasty the next morning. Moved to the SICU for confusion and low blood pressure after surgery.",
		admitPlan: "Admit to SICU. Delirium precautions, carbidopa-levodopa on time, fluids for low blood pressure, check hemoglobin and sodium daily.",
		nursing: ["Bed exit alarm at 41 min ago; found sitting on the edge of the bed, not hurt. Confused to time and place overnight. Son coming in this afternoon. Carbidopa-levodopa given on time.", 38],
		yesterday: "Post-op day 1, hemiarthroplasty. Delirium, no new medications to blame. Sodium 134. Restart levodopa on schedule. Physical therapy tomorrow.",
		events: "Confused overnight, needed redirection. Hemoglobin 8.9 from 10.4, sodium 131 from 134.",
		apPlan: "Repeat hemoglobin this afternoon. Fluid restriction 1.5 L. No sedatives.",
		plan: "Bedside sitter or camera watch for the bed exits. Transfuse if hemoglobin is under 8 this afternoon. Ask Dr. Grant about a hip X-ray after the bed exit.",
	},
	p7: {
		history: "45-year-old woman with hypothyroidism, 2 days of left lower abdominal pain and fever. CT showed perforated sigmoid diverticulitis. Hartmann's procedure in the operating room.",
		admitPlan: "Admit to SICU after surgery. Piperacillin-tazobactam, fluids, pain control without codeine (allergy).",
		nursing: ["Off oxygen since 07:00, SpO₂ 96% on room air. Colostomy pink, small output. Walked to the chair twice. Contact isolation for MRSA in the wound.", 60],
		yesterday: "Post-op day 2, improving. WBC 14.0. Wound swab grew MRSA: contact isolation, add vancomycin. Advance diet as tolerated.",
		events: "Off oxygen this morning. WBC 12.1 from 16.8, lactate normal.",
		apPlan: "Fluids down to 100 mL/h. Clear diet. Plan transfer to the surgical floor tomorrow.",
		plan: "Ready for the floor tomorrow if WBC keeps falling. Ask Dr. Grant's surgical team about vancomycin's end date.",
	},
	p8: {
		history: "54-year-old man with alcohol use disorder, vomited blood twice at home. Hemoglobin 7.2 and BP 92/58 in the ED. 2 units of blood, pantoprazole, endoscopy.",
		admitPlan: "Admit to PCU after endoscopy. Pantoprazole drip, alcohol withdrawal watch, thiamine, hemoglobin every 6 hours.",
		nursing: ["No bleeding charted overnight. Hemoglobin 8.4 holding. Withdrawal score 6, no medication needed. Tolerating clear liquids.", 70],
		yesterday: "Duodenal ulcer, clipped. One more unit given, hemoglobin 8.4. Start H. pylori treatment when the biopsy is back.",
		events: "No new bleeding overnight. Hemoglobin 8.4, steady. H. pylori biopsy positive.",
		apPlan: "Switch to oral pantoprazole tomorrow if hemoglobin holds. Start H. pylori treatment.",
		plan: "Stable for the floor. Hemoglobin every 12 hours now. Social work consult about alcohol treatment before discharge.",
	},
	p9: {
		history: "70-year-old man in a nursing facility after a stroke, with COPD, coughing at meals for a week, then fever and low oxygen. Right lower lobe pneumonia. Intubated on the medical ward and moved to the MICU.",
		admitPlan: "Admit to MICU. Ventilator, ampicillin-sulbactam after cultures, hold apixaban until the airway is settled.",
		nursing: ["SpO₂ 91% on FiO₂ 50%. Thick yellow secretions, suctioned every 2 hours. Propofol 25. Low-grade temperature 38.2 °C. Wife at the bedside.", 50],
		rt: "AC/VC, FiO₂ 50%. PEEP reads 8, though the order is 10; set to 8 at 05:00 for a leak and not set back. Called Intercept.",
		events: "SpO₂ 90–92% overnight on FiO₂ 50%. Lactate 2.6 from 1.9. Sputum shows gram-negative rods.",
		apPlan: "Repeat blood cultures. Broaden to cefepime if gram-negative rods grow. Repeat lactate.",
		plan: "Ask RT to set PEEP back to 10 per the order, then recheck SpO₂ in 30 min. Repeat lactate in 2 hours. Sepsis bundle if it keeps rising.",
	},
	p10: {
		history: "61-year-old woman on hemodialysis with diabetes and PAD, 2 days of left thigh pain out of proportion to a red patch, then blistering. CK 1,380. Taken to the operating room for debridement.",
		admitPlan: "Admit to SICU. Vancomycin, piperacillin-tazobactam and clindamycin. CRRT for her kidney disease. Back to the OR tomorrow for a second look.",
		nursing: ["Norepinephrine up to 0.06 per titration order, MAP 61. Dressing on the left thigh with moderate drainage. CRRT running, no alarms. Glucose 214, insulin drip per protocol.", 45],
		events: "Norepinephrine doubled to 0.06 since debridement. Lactate 3.0, WBC 21.4. Potassium 5.4 on CRRT.",
		apPlan: "Second look in the OR this afternoon. Increase CRRT dose for potassium. Repeat lactate.",
		plan: "Confirm the OR time with Dr. Brooks's team. Group A Strep in the tissue: keep clindamycin. Sepsis bundle elements are done; keep MAP over 65.",
	},
	p11: {
		history: "34-year-old woman at 35 weeks with severe preeclampsia and influenza B. BP 178/110, platelets 131. Emergency cesarean delivery, then the OB-ICU for blood pressure and magnesium.",
		admitPlan: "Admit to OB-ICU. Magnesium 2 g/h for 24 hours, nicardipine for BP over 160/110, oseltamivir, droplet isolation.",
		nursing: ["BP 162/96, nicardipine up to 7.5 per order. Reflexes 2+, no clonus. Magnesium level 6.1. Breastmilk pumping. Husband visiting.", 30],
		events: "BP 148/88 an hour ago, now 162/96. Platelets 98 from 131, AST 142.",
		apPlan: "Labs every 6 hours for HELLP. Magnesium until 24 hours after delivery. Nicardipine to BP under 160/110.",
		plan: "Ask OB about adding oral labetalol. Repeat platelets and AST at 18:00. Stop magnesium at 24 hours if she stays well.",
	},
	p12: {
		history: "88-year-old woman with atrial fibrillation not on anticoagulation, sudden left-sided weakness and neglect. Right M1 occlusion; thrombectomy restored flow. DNR per her advance directive.",
		admitPlan: "Admit to Neuro ICU. Neuro checks every hour, BP under 180/105, swallow screen before food, start aspirin at 24 hours.",
		nursing: ["Neuro checks unchanged overnight. RR probe disconnected 27 min ago and replaced. Failed the swallow screen; nothing by mouth. Daughter at the bedside.", 25],
		yesterday: "Day 1 after thrombectomy. CT head without hemorrhage. Aspirin started. Failed the swallow screen. Speech therapy tomorrow.",
		events: "CT head with early swelling of the infarct, no midline shift; 3% saline started, sodium 134 to 141. Neuro checks unchanged. Glucose 182 to 156. RR not reporting at times.",
		apPlan: "Insulin sliding scale. Speech therapy today. Talk with the family about a feeding tube.",
		plan: "3% saline to sodium 145–155, sodium every 6 h. Check that respiratory rate is reporting again. Insulin sliding scale. Family meeting about feeding within her DNR wishes.",
	},
	p13: {
		history: "63-year-old man, anterior STEMI with cardiac arrest in the field, ROSC after 12 min. PCI to the proximal LAD, then VA-ECMO for refractory cardiogenic shock.",
		admitPlan: "Admit to CVICU on VA-ECMO. Heparin to anti-Xa 0.3–0.5, epinephrine and norepinephrine, targeted temperature 36 °C for 24 hours.",
		nursing: ["ECMO flow 3.8 L/min, sweep 3. MAP 55 on epinephrine and norepinephrine. Left foot pulses by Doppler. Repeat lactate drawn. Wife updated by phone.", 18],
		rt: "PC, FiO₂ 40%, PEEP 10. Lung rest settings on ECMO. Tidal volumes 380 mL. Secretions thin.",
		yesterday: "VA-ECMO day 4. Aortic valve opens every beat. AKI stage 1. Trial of lower ECMO flow tonight if lactate stays under 2.5.",
		events: "Maria Ruiz carried over a concern: ECMO flow cut to 3.8 L/min at 05:30, lactate 2.6 to 3.1. Norepinephrine up to 0.18.",
		apPlan: "Repeat lactate. If over 3, return flow to 4.2 L/min. Echo this morning.",
		plan: "Repeat lactate pending. If it's over 3, ask the perfusionist to return flow to 4.2 L/min. Call Dr. Reyes about the night's flow change.",
	},
	p14: {
		history: "50-year-old woman with hypertension and sleep apnea, 6 hours of palpitations. Atrial fibrillation at 150 in the ED. Diltiazem bolus, then infusion. No chest pain.",
		admitPlan: "Admit to CCU. Diltiazem infusion to HR under 110, magnesium and potassium replacement, TSH, echo, anticoagulation decision with the team. Code status to discuss.",
		nursing: ["HR 88 on diltiazem 10. BP 118/72. Magnesium replacement running. Asked about code status; she'd like to talk with her partner first.", 20],
		events: "Rate down to 88 on diltiazem, now 10 from 15. Magnesium 1.7. TSH pending.",
		apPlan: "Magnesium 2 g. Echo. Start heparin per Dr. Parker if no bleeding risk.",
		plan: "Document code status today with her and her partner. Decide on anticoagulation with Dr. Parker after the echo.",
	},
	p17: {
		history: "67-year-old woman with hypertension and a hysterectomy 12 years ago, 2 days of cramping, vomiting and no stool. CT showed an adhesive small bowel obstruction. Laparotomy, adhesions released, 20 cm of ischemic small bowel resected.",
		admitPlan: "Admit to med-surg after surgery, with tele-ICU coverage. Nasogastric tube to suction, fluids, hydromorphone PCA, enoxaparin from tomorrow. Incentive spirometry every hour awake.",
		nursing: ["Splinting with pain at 6/10, RR 21, HR 104. PCA increased to 0.3 mg per Dr. Reed. Incentive spirometry 750 mL. NG draining 150 mL bilious since 06:00. Urine 40 mL/h.", 35],
		events: "RR up to 21 and HR to 104 overnight, SpO₂ 95% on 2 L, so NEWS2 is 6. Lactate 1.4 from 2.1, hemoglobin 10.8 after the OR.",
		apPlan: "Pain control first; recheck RR and HR in an hour. Chest X-ray shows atelectasis only. Out of bed to the chair this morning.",
		plan: "Recheck her in an hour after the PCA change. If RR stays over 20, ask Dr. Reed about a chest exam and a CBC.",
	},
	p18: {
		history: "54-year-old man with type 1 diabetes, out of insulin for 3 days. Vomiting and abdominal pain. Glucose 512, bicarbonate 9, anion gap 28, beta-hydroxybutyrate 6.4.",
		admitPlan: "Admit to med-surg with tele-ICU coverage. DKA protocol: fluids, insulin infusion at 0.1 units/kg/h, potassium replacement, hourly glucose, BMP every 4 h. Social work for insulin access.",
		nursing: ["Gap closed at 12. Glucose 168 on insulin 3 units/h with dextrose. Ate half his breakfast without nausea. Asked about getting his insulin pump back.", 25],
		events: "Anion gap 12 from 28, bicarbonate 20. Insulin down to 3 units/h, dextrose running.",
		apPlan: "Glargine 18 units subcutaneous now, then stop the drip in 2 h. Diabetes educator and social work today.",
		plan: "Glargine at 09:00, drip off at 11:00 if glucose stays under 250. Social work about insulin coverage before he goes to the floor.",
	},
	p22: {
		history: "79-year-old woman with hypertension and osteoporosis who slipped on ice outside her home. Unable to bear weight on the right leg. X-ray showed a displaced right femoral neck fracture. Right hip hemiarthroplasty by the visiting orthopedic surgeon.",
		admitPlan: "Admit to med-surg with tele-ICU coverage. Pain control without codeine, cefazolin for 24 hours, enoxaparin from tomorrow, physical therapy on post-op day 1, fall precautions.",
		nursing: ["Pain 3/10 on scheduled acetaminophen, one dose of oxycodone overnight. Stood at the bedside with PT, weight bearing as tolerated. Dressing dry. SpO₂ 95% on 2 L; weaning as she moves more. Son visiting this afternoon.", 30],
		events: "HR 98 to 86 and BP up to 126/70 after fluids. Hemoglobin 9.4 from 11.8, expected after surgery, no bleeding at the wound. NEWS2 5 to 3.",
		apPlan: "Wean oxygen to room air today. Repeat hemoglobin tomorrow. PT twice a day. Case management about rehab at a skilled nursing facility.",
		plan: "Wean oxygen to keep SpO₂ 92% or more. If hemoglobin drops under 8, ask Dr. Reed about a transfusion. Rehab placement with case management before discharge.",
	},
};

// Margaret Hayes (`p15`), Scenario 1 at 01:40: only the hospital's notes. She's on a med-surg floor and no one from
// Intercept has looked in yet, so there's no Intercept note to draft or sign.
const chadron = "Chadron Memorial";
const hayesNotes: PatientNote[] = [
	{
		id: "p15-n1",
		type: "Nursing note",
		author: { name: "Kayla Brandt", role: "RN", organization: chadron },
		at: minutesAgo(25),
		origin: "hospital",
		status: "signed",
		sections: [
			{
				text: "Short of breath lying flat; head of bed up 45°. SpO₂ 89% on 4 L, RR 26, HR 112, BP 148/86. Crackles halfway up both lungs. 350 mL urine since 18:00 after IV furosemide; net +1.8 L since admission. Weight 78 kg, up 2.1 kg from her home weight 2 days ago. Paged Dr. Weller again.",
			},
		],
	},
	{
		id: "p15-n2",
		type: "Telephone encounter",
		author: { name: "Tom Weller", role: "MD, Family medicine", organization: chadron },
		at: minutesAgo(140),
		origin: "hospital",
		status: "signed",
		sections: [
			{
				text: "Called by the RN for rising oxygen needs, now 4 L. Repeat BMP and BNP now. Continue furosemide 80 mg IV every 12 h. Call back with the results or if she needs more than 4 L.",
			},
		],
	},
	{
		id: "p15-n3",
		type: "History and physical",
		author: { name: "Tom Weller", role: "MD, Family medicine", organization: chadron },
		at: hoursAgo(18),
		origin: "hospital",
		status: "signed",
		sections: [
			{
				heading: "History",
				text: "72-year-old woman with HFrEF (EF 25%), stage 3 CKD and type 2 diabetes. A week of weight gain and leg swelling, then two nights sleeping in her recliner. Lives alone 20 miles outside town and drove herself in. BNP 1,850, creatinine 1.6 from a baseline of 1.5. Chest X-ray: vascular congestion and small effusions.",
			},
			{
				heading: "Plan",
				text: "Admit to med-surg. Furosemide 80 mg IV every 12 h, strict intake and output, daily weights, 2 g sodium diet with a 1.5 L fluid limit. Oxygen to SpO₂ 92% or more. Hold spironolactone while creatinine is up. BMP and BNP in the morning.",
			},
		],
	},
];

// Walter Erickson (`p16`), on the same floor: also only the hospital's notes.
const ericksonNotes: PatientNote[] = [
	{
		id: "p16-n1",
		type: "Nursing note",
		author: { name: "Kayla Brandt", role: "RN", organization: chadron },
		at: minutesAgo(110),
		origin: "hospital",
		status: "signed",
		sections: [
			{
				text: "Sleeping well. SpO₂ 96% on 2 L, RR 18, afebrile since yesterday afternoon. Coughing up less. Bed alarm on; walked the hall with his walker this evening.",
			},
		],
	},
	{
		id: "p16-n2",
		type: "Progress note",
		author: { name: "Tom Weller", role: "MD, Family medicine", organization: chadron },
		at: hoursAgo(19),
		origin: "hospital",
		status: "signed",
		sections: [
			{
				heading: "Assessment",
				text: "Right lower lobe pneumococcal pneumonia, day 3, improving. WBC 10.4 from 15.2, procalcitonin 0.4 from 1.8.",
			},
			{
				heading: "Plan",
				text: "Continue ceftriaxone, finish azithromycin tomorrow. Wean oxygen to keep SpO₂ 90% or more (COPD). Switch to oral antibiotics and plan discharge home if he's on room air by Saturday. DNR, confirmed with him and his wife.",
			},
		],
	},
];

// Linda Carlson (`p19`) and Robert Hansen (`p20`), on the same floor: also only the hospital's notes.
const carlsonNotes: PatientNote[] = [
	{
		id: "p19-n1",
		type: "Nursing note",
		author: { name: "Kayla Brandt", role: "RN", organization: chadron },
		at: minutesAgo(130),
		origin: "hospital",
		status: "signed",
		sections: [
			{
				text: "Resting. Left leg elevated; redness inside the border marked this morning, less warm. Afebrile, SpO₂ 95% on room air. Bedtime glucose 172, 2 units lispro given.",
			},
		],
	},
	{
		id: "p19-n2",
		type: "Progress note",
		author: { name: "Tom Weller", role: "MD, Family medicine", organization: chadron },
		at: hoursAgo(20),
		origin: "hospital",
		status: "signed",
		sections: [
			{ heading: "Assessment", text: "Left lower leg cellulitis, day 2, improving. WBC 9.6 from 13.8. Ultrasound: no DVT, no abscess." },
			{ heading: "Plan", text: "Continue cefazolin; switch to oral cephalexin tomorrow if the redness keeps receding. Metformin on hold while she eats less; sliding scale insulin with her glargine." },
		],
	},
];

const hansenNotes: PatientNote[] = [
	{
		id: "p20-n1",
		type: "Nursing note",
		author: { name: "Kayla Brandt", role: "RN", organization: chadron },
		at: minutesAgo(150),
		origin: "hospital",
		status: "signed",
		sections: [
			{
				text: "Sleeping. Saline at 100 mL/h. Urine output 70 mL/h over the last 4 h. Ate dinner and drank 600 mL, no nausea or diarrhea since this afternoon.",
			},
		],
	},
	{
		id: "p20-n2",
		type: "Progress note",
		author: { name: "Tom Weller", role: "MD, Family medicine", organization: chadron },
		at: hoursAgo(18),
		origin: "hospital",
		status: "signed",
		sections: [
			{ heading: "Assessment", text: "Prerenal acute kidney injury from gastroenteritis, improving. Creatinine 1.4 from 2.3, potassium back to 4.2." },
			{ heading: "Plan", text: "Saline down to 100 mL/h, stop once he's drinking well. Keep lisinopril and metformin on hold until creatinine is near his baseline of 1.0. Home tomorrow if it keeps falling." },
		],
	},
];

const sampleNotesByPatient: Record<string, PatientNotes> = {
	p1: { emr: sampleEhrFor("p1"), notes: sarahNotes },
	p15: { emr: sampleEhrFor("p15"), notes: hayesNotes },
	p16: { emr: sampleEhrFor("p16"), notes: ericksonNotes },
	p19: { emr: sampleEhrFor("p19"), notes: carlsonNotes },
	p20: { emr: sampleEhrFor("p20"), notes: hansenNotes },
	...Object.fromEntries(
		samplePatientBaseRecords
			.filter((record) => notesSpecs[record.id])
			.map((record) => [record.id, { emr: sampleEhrFor(record.id), notes: buildNotes(record, notesSpecs[record.id]) }]),
	),
};

// Dale Reynolds (`p21`, Scenario 2): the ED's notes when the hub consult is requested. Built when the scenario's first
// beat plays, so their times read from then.
const sampleScenario2Notes = (): PatientNote[] => {
	const alliance = "Alliance Community";
	return [
		{
			id: "p21-n1",
			type: "ED provider note",
			author: { name: "Brian Keller", role: "MD, Emergency medicine", organization: alliance },
			at: minutesAgo(5),
			origin: "hospital",
			status: "signed",
			sections: [
				{
					heading: "History",
					text: "64-year-old rancher with severe COPD (GOLD 3) on 2 L home oxygen. Three days of worse breathlessness, cough and green sputum; out of oxygen for 4 days because he couldn't afford the refill. Uninsured. Brought in by ambulance through the storm.",
				},
				{
					heading: "Assessment",
					text: "Acute on chronic hypercapnic respiratory failure from a COPD exacerbation. ABG pH 7.24, PaCO₂ 78. Chest X-ray: hyperinflation, no pneumothorax. Alert, speaking in short phrases, using his neck muscles.",
				},
				{
					heading: "Plan",
					text: "BiPAP started, IPAP 12 / EPAP 5, FiO₂ 35% for SpO₂ 88–92%. Nebulizers, steroids, azithromycin. Requested the hub intensivist's consult. Transfer isn't possible tonight: air is grounded and the highway is closed.",
				},
			],
		},
		{
			id: "p21-n2",
			type: "Respiratory therapy note",
			author: { name: "Rachel Lindgren", role: "RRT", organization: alliance },
			at: minutesAgo(18),
			origin: "hospital",
			status: "signed",
			sections: [
				{
					text: "BiPAP on with a full-face mask, IPAP 12, EPAP 5, FiO₂ 35%. Tolerating it. Leak under 20 L/min. Nebulizer in line. Will stay at the bedside for the first hour.",
				},
			],
		},
		{
			id: "p21-n3",
			type: "ED triage note",
			author: { name: "Megan Foster", role: "RN", organization: alliance },
			at: minutesAgo(40),
			origin: "hospital",
			status: "signed",
			sections: [
				{
					text: "Arrived by ambulance on 2 L. SpO₂ 86%, RR 26, HR 104, BP 150/86, temp 37.4 °C. Tripod position, pursed lips, speaking in short phrases. Ran out of home oxygen 4 days ago. No insurance. ESI 2.",
				},
			],
		},
	];
};

// Rosa Medina (`p23`, Scenario 3): Sidney ED's notes when the sepsis screen fires. Built when the scenario's first beat
// plays, so their times read from then. Hospital notes, signed in Sidney's record (Meditech); none of them is an Intercept
// note, so there's nothing to write back. The nurse's note on the falling pressure is
// illustrative (the scenario only gives the reading, 5 min before the screen).
const sampleScenario3Notes = (): PatientNote[] => {
	const sidney = "Sidney Regional";
	return [
		{
			id: "p23-n1",
			type: "ED provider note",
			author: { name: "Jenna Collins", role: "NP, Hospital medicine", organization: sidney },
			at: minutesAgo(3),
			origin: "hospital",
			status: "signed",
			sections: [
				{
					heading: "History",
					text: "51-year-old woman with type 2 diabetes on insulin (A1c 10.8%) and CKD stage 4 (baseline creatinine 2.4). Three days of dysuria and left flank pain, fevers and rigors since last night, vomiting this morning. Walked in with her daughter. Prefers Spanish; history taken with a medical interpreter. Sulfonamide allergy (rash).",
				},
				{
					heading: "Assessment",
					text: "Sepsis from left pyelonephritis, now hypotensive: BP 84/48 (MAP 60), HR 124, T 39.4 °C, RR 24, SpO₂ 95% on room air, alert. Lactate 3.8, WBC 18.6. Urinalysis nitrite positive, leukocyte esterase 3+, WBC over 50/hpf. Creatinine 2.6 from her baseline 2.4, eGFR 22; potassium 5.1, bicarbonate 17, glucose 390. Left CVA tenderness. Probable septic shock.",
				},
				{
					heading: "Plan",
					text: "Sepsis screen positive. Blood cultures ×2, then piperacillin-tazobactam 4.5 g IV, then 2.25 g every 6 h for her kidney function. Fluids by 500 mL boluses with reassessment after each, given CKD 4. No CT contrast; renal ultrasound instead. Hold amlodipine. Hub intensivist to review. Boarding in the ED: our inpatient unit is full.",
				},
			],
		},
		{
			id: "p23-n2",
			type: "Nursing note",
			author: { name: "Ashley Brooks", role: "RN", organization: sidney },
			at: minutesAgo(5),
			origin: "hospital",
			status: "signed",
			sections: [
				{
					text: "BP down to 84/48 on recheck, HR 124, T 39.4 °C. Alert, says she feels worse, and her daughter says she's more tired. Second 18 g IV placed by Kristen. Jenna Collins, NP at the bedside.",
				},
			],
		},
		{
			id: "p23-n3",
			type: "ED triage note",
			author: { name: "Ashley Brooks", role: "RN", organization: sidney },
			at: minutesAgo(48),
			origin: "hospital",
			status: "signed",
			sections: [
				{
					text: "Walk-in with her daughter. Dysuria and left flank pain for 3 days, fevers and rigors since last night, vomited this morning. BP 96/58, HR 112, T 39.0 °C, RR 22, SpO₂ 96% on room air. Alert. Diabetic on insulin, kidney disease. Prefers Spanish; daughter interpreting for triage only, medical interpreter requested. ESI 2.",
				},
			],
		},
	];
};

// Tyler Kessler (`p24`, Scenario 4): Bridgeport's notes, built when a beat plays so their times read from then. Hospital
// notes in Bridgeport's record (TruBridge), none of them Intercept's, and Bridgeport doesn't take Intercept notes back
// anyway. At 23:00 (`admission`): the ED physician's note with triage, the on-call APP's phone orders from home, and the
// night RN's admission note. At 07:30 (`noted`) the APP's history and physical joins them: it records the rationing as a
// structured social need (`fields`), not only in its text (step 5). The earlier notes sit 10 min further back then, as
// the night passes in seconds. Ryan Mercer, the ED physician, and the notes' wording are illustrative.
const sampleScenario4Notes = (stage: "admission" | "noted" = "admission"): PatientNote[] => {
	const bridgeport = "Bridgeport Valley";
	const back = stage === "noted" ? 10 : 0;
	const admission: PatientNote[] = [
		{
			id: "p24-n1",
			type: "Nursing admission note",
			author: { name: "Brittany Cole", role: "RN", organization: bridgeport },
			at: minutesAgo(back + 3),
			origin: "hospital",
			status: "signed",
			sections: [
				{
					text: "Up from the ED to Med-Surg Bed 3. Drowsy but answers questions, oriented ×3. Deep, fast breathing, RR 30. HR 122, BP 98/58, SpO₂ 99% on room air. Second liter of saline running through an 18 g in the left forearm; second IV placed, 20 g right hand. No vomiting since the ondansetron. Fingerstick reads HI. Only RN on the inpatient side tonight.",
				},
			],
		},
		{
			id: "p24-n2",
			type: "Telephone orders",
			author: { name: "Derek Lawson", role: "PA-C", organization: bridgeport },
			at: minutesAgo(back + 14),
			origin: "hospital",
			status: "signed",
			sections: [
				{
					text: "Called by Dr. Mercer from the ED; on call from home. Admit to Med-Surg, Bed 3, under my care, for severe DKA. The hub intensivist will start and supervise the DKA protocol tonight; I'll co-sign its orders. Hourly vitals, strict intake and output, nothing by mouth. I'll see him in the morning and write the history and physical.",
				},
			],
		},
		{
			id: "p24-n3",
			type: "ED provider note",
			author: { name: "Ryan Mercer", role: "MD, Emergency medicine", organization: bridgeport },
			at: minutesAgo(back + 15),
			origin: "hospital",
			status: "signed",
			sections: [
				{
					heading: "History",
					text: "24-year-old man with type 1 diabetes since age 11. Out of his glargine for 2 days; says he's been making his insulin last since he lost his insurance. Vomiting since yesterday, belly pain, very thirsty. Walked in at 22:20. Triage: HR 116, BP 104/62, RR 24, SpO₂ 99% on room air, T 37.0 °C; meter glucose reads HI.",
				},
				{
					heading: "Assessment",
					text: "Severe DKA. Venous pH 7.08, bicarbonate 6, anion gap 28, beta-hydroxybutyrate 7.2, glucose 520, potassium 5.6, sodium 131, chloride 97, creatinine 1.4 (baseline 0.9), BUN 32. WBC 14.2, likely stress; lipase normal, no sign of infection. Kussmaul breathing at 30, alert and oriented.",
				},
				{
					heading: "Plan",
					text: "0.9% saline 1 L bolus, then 1 L/h. No insulin bolus. Ondansetron. Admitted to Med-Surg under Derek Lawson, PA-C, on call; the hub intensivist is asked to run the DKA protocol tonight. No ICU here, and one RN on the inpatient side.",
				},
			],
		},
	];
	if (stage === "admission") return admission;
	return [
		{
			id: "p24-n4",
			type: "History and physical",
			author: { name: "Derek Lawson", role: "PA-C", organization: bridgeport },
			at: minutesAgo(0),
			origin: "hospital",
			status: "signed",
			sections: [
				{
					heading: "History of present illness",
					text: "24-year-old man with type 1 diabetes since age 11, on glargine 22 units at bedtime and lispro 4–8 units with meals. Works at a grain elevator. He lost Medicaid at redetermination in August, and since then he has been rationing his insulin because of the cost: skipping meal doses and cutting his glargine to make each pen last. He ran out of glargine 2 days ago, started vomiting yesterday and came to our ED last night. Last DKA admission 6 years ago. A1c 9.6% in April.",
				},
				{
					heading: "Hospital course",
					text: "Severe DKA on arrival: venous pH 7.08, bicarbonate 6, anion gap 28, glucose 520, potassium 5.6. DKA protocol started from the hub at 23:00, insulin 7 units/h. Potassium 3.1 at 03:00: insulin held 1 h with KCl 20 mEq/h IV. Glucose 238 at 05:00: D5 0.45% saline added, insulin 3.5 units/h. At the 06:00 check, glucose 182, gap 16, bicarbonate 15.",
				},
				{
					heading: "Assessment",
					text: "Severe DKA from missed insulin, improving on the protocol. The cause is cost-related insulin rationing after he lost his coverage. Prerenal acute kidney injury, improving with fluids.",
				},
				{
					heading: "Plan",
					text: "Continue the DKA protocol with hourly checks. When the gap closes and he's eating, glargine 22 units, his home dose, then stop the drip 1 to 2 h later. Financial counseling today for Medicaid re-enrollment, and an insulin-assistance program so he leaves with insulin he can afford. Diabetes educator visit at our rural health clinic after discharge.",
				},
			],
			fields: [
				{ label: "Social need", value: "Cost-related insulin rationing", code: "Z91.120" },
				{ label: "Coverage", value: "Lapsed: Medicaid ended at redetermination in August" },
			],
		},
		...admission,
	];
};

export { sampleNotesByPatient, sampleScenario2Notes, sampleScenario3Notes, sampleScenario4Notes };
