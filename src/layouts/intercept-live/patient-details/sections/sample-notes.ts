import type { PatientRecord } from "../patient-details";
import { samplePatientBaseRecords } from "../sample-patient-records";
import type { PatientNote, PatientNotes } from "./notes-section";

// Synthetic data (PRD Patient details PD-150): every Census patient's notes, newest first, written by their own care
// team (`sample-patient-records.ts`). Where a hospital takes Intercept notes back, signed Intercept notes are written to
// Epic (Harbor Point General, Mercy West Hospital); CVMC doesn't yet, so they stay signed in Intercept.
// `sample-epic.ts` lists the same write-backs.
//
// Sarah Miller (`p1`) is the reference: one note of each status and an AI Scribe draft, in step with her record. She
// came in on aztreonam and azithromycin (penicillin allergy); vancomycin and aztreonam went in 30 min ago with her
// sepsis bundle, after blood cultures ×2.

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
const hoursAgo = (hours: number) => minutesAgo(hours * 60);

const writesBack: Record<string, boolean> = { "Harbor Point General": true, "Mercy West Hospital": true, CVMC: false };

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
				text: "Vancomycin and aztreonam given 30 min ago, after blood cultures ×2, for MRSA colonization and the preliminary sputum Gram stain. Vasopressin started. Repeat lactate in 2 hours. Discuss with Dr. Shah whether to keep azithromycin.",
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
			{ heading: "Present", text: "Joanna Smith (Intercept intensivist), Kevin Ortiz (bedside RN), James Tan (Intercept APP)." },
			{
				heading: "Discussed",
				text: "Sats dipping to 88–89% with suctioning, thick secretions. MAP 58 to 62 on norepinephrine 0.22. Kevin reports cool extremities and urine output under 20 mL/h for 2 hours.",
			},
			{
				heading: "Tasks captured",
				text: "• Kevin: blood cultures ×2 now, then repeat lactate at 13:00.\n• James: ask pharmacy for vancomycin and aztreonam now, and vasopressin.\n• Joanna: call Dr. Shah about the antibiotics.",
			},
		],
	},
	{
		id: "p1-n3",
		type: "Nursing note",
		author: { name: "Kevin Ortiz", role: "RN", organization: "Harbor Point General" },
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
		author: { name: "Dana Brooks", role: "RRT", organization: "Harbor Point General" },
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
		author: { name: "James Tan", role: "Intercept APP" },
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
			"Epic didn't accept this note: Harbor Point General closed the night encounter for review at 06:00. Your note is kept here. Try again, or ask Harbor Point's health information team to reopen it.",
		sections: [
			{
				text: "Camera check at the bedside team's request: patient comfortable on the ventilator, no distress. MAP 64 on norepinephrine 0.08. Bedside RN aware. No changes made.",
			},
		],
	},
	{
		id: "p1-n7",
		type: "ICU progress note",
		author: { name: "Priya Shah", role: "MD, Attending", organization: "Harbor Point General" },
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
				text: "Tele-ICU admission. Septic shock from right lower lobe pneumonia, intubated in the ED. Reviewed with Dr. Shah and the bedside team on camera. Lung-protective ventilation, norepinephrine for MAP under 65, aztreonam and azithromycin after cultures.",
			},
		],
	},
	{
		id: "p1-n9",
		type: "History and physical",
		author: { name: "Priya Shah", role: "MD, Attending", organization: "Harbor Point General" },
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
	/** James Tan's tele-ICU note this morning: events, then plan. */
	events: string;
	apPlan: string;
	/** Joanna Smith's draft today: the plan (the assessment is the brief's story). */
	plan: string;
};

const therapists: Record<string, [name: string, role: string]> = {
	"Harbor Point General": ["Dana Brooks", "RRT"],
	"Mercy West Hospital": ["Luis Romero", "RRT"],
	CVMC: ["Ben Carter", "RRT"],
};

function buildNotes(record: PatientRecord, spec: NotesSpec): PatientNote[] {
	const staff = (role: string) => record.careTeam?.find((member) => member.role === role);
	const nurse = staff("Bedside nurse");
	const attending = staff("Attending of record");
	const hospital = nurse?.organization ?? attending?.organization ?? "";
	const hoursSince = (iso?: string) => (iso ? (Date.now() - Date.parse(iso)) / 3_600_000 : 0);
	const stay = hoursSince(record.admittedAt);
	const icu = hoursSince(record.icuAdmittedAt);
	// Signed Intercept notes: written to Epic where the hospital takes them back, otherwise signed in Intercept.
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
			author: { name: "James Tan", role: "Intercept APP" },
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
		plan: "Prone now rather than at 16:00. If P/F stays under 80 prone, call Mercy West's ECMO team for a consult. Conservative fluids.",
	},
	p3: {
		history: "67-year-old woman with CKD stage 3 and atrial fibrillation on apixaban, 2 days of confusion and fever. BP 78/40, lactate 4.6, pyuria. Intubated for airway protection after fluids.",
		admitPlan: "Admit to MICU. 30 mL/kg fluids, norepinephrine, ceftriaxone after blood and urine cultures. Hold apixaban and metoprolol.",
		nursing: ["Norepinephrine weaned to 0.08 per titration order, MAP 68–72. Urine output 40 mL/h. Afebrile overnight. Daughter called for an update.", 90],
		rt: "AC/VC, FiO₂ 40%, PEEP 8. Passed a spontaneous breathing trial for 30 min at 06:00, stopped for agitation. Plan another trial tomorrow.",
		yesterday: "E. coli bacteremia from the urine, sensitive to ceftriaxone. Norepinephrine 0.10. Creatinine 2.6, improving. Restart rate control when off pressors.",
		events: "Norepinephrine down to 0.08 from 0.10 overnight. Morning WBC 14.1 from 18.0, procalcitonin 3.2 from 7.8.",
		apPlan: "Keep weaning norepinephrine to MAP 65. Ceftriaxone day 3 of 7. Spontaneous breathing trial tomorrow.",
		plan: "Off norepinephrine by tonight if MAP holds. Ask CVMC's team about restarting apixaban once she's off pressors and creatinine keeps improving.",
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
		plan: "Bedside sitter or camera watch for the bed exits. Transfuse if hemoglobin is under 8 this afternoon. Ask Dr. Ortiz about a hip X-ray after the bed exit.",
	},
	p7: {
		history: "45-year-old woman with hypothyroidism, 2 days of left lower abdominal pain and fever. CT showed perforated sigmoid diverticulitis. Hartmann's procedure in the operating room.",
		admitPlan: "Admit to SICU after surgery. Piperacillin-tazobactam, fluids, pain control without codeine (allergy).",
		nursing: ["Off oxygen since 07:00, SpO₂ 96% on room air. Colostomy pink, small output. Walked to the chair twice. Contact isolation for MRSA in the wound.", 60],
		yesterday: "Post-op day 2, improving. WBC 14.0. Wound swab grew MRSA: contact isolation, add vancomycin. Advance diet as tolerated.",
		events: "Off oxygen this morning. WBC 12.1 from 16.8, lactate normal.",
		apPlan: "Fluids down to 100 mL/h. Clear diet. Plan transfer to the surgical floor tomorrow.",
		plan: "Ready for the floor tomorrow if WBC keeps falling. Ask Mercy West's surgical team about vancomycin's end date.",
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
		events: "Neuro checks unchanged. Glucose 182 to 156. RR not reporting at times.",
		apPlan: "Insulin sliding scale. Speech therapy today. Talk with the family about a feeding tube.",
		plan: "Check that respiratory rate is reporting again. Insulin sliding scale. Family meeting about feeding within her DNR wishes.",
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
		apPlan: "Magnesium 2 g. Echo. Start heparin per Dr. Petrova if no bleeding risk.",
		plan: "Document code status today with her and her partner. Decide on anticoagulation with Dr. Petrova after the echo.",
	},
};

const sampleNotesByPatient: Record<string, PatientNotes> = {
	p1: { emr: "Epic", notes: sarahNotes },
	...Object.fromEntries(
		samplePatientBaseRecords
			.filter((record) => notesSpecs[record.id])
			.map((record) => [record.id, { emr: "Epic", notes: buildNotes(record, notesSpecs[record.id]) }]),
	),
};

export { sampleNotesByPatient };
