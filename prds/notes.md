---
requirements: [CD-01, CD-02, CD-03, CD-04, CD-05, CD-06, CD-07, CD-08, CD-09, CD-10, CD-11, BR-10]
status: proposed — confirm with Carlos (not yet in Trace Matrix v0.1)
---

<!--
Created: Nov 13, 2026
Created by: Julio Caunedo
Last updated: Nov 13, 2026
Scope: Clinical notes in Intercept Live (Clinical Documentation, Spec §5.4): what a note is, the note types and their templates, writing, signing, co-signing and attesting a note, AI drafts, and write-back to the hospital's record. Governs the note itself and its editor (`sections/note-editor.tsx`, `note-templates.ts`, `note-chart.ts`); the Notes tab's list and reader stay in PRD Patient details (PD-070).
Purpose: The client sent Intercept's current Epic note templates (`documents/notes/`). This PRD records what they show, how a tele-ICU clinician works with notes, and what Intercept's note editor has to do, with what's still open.
-->

# PRD — Notes

**Product:** Intercept Live — Virtual Care OS  
**Module:** Clinical Documentation (Spec §5.4), on Template and Lexicon Management (Spec §6.19), with the AI Scribe (Spec §8.6) and the Professional Fee Optimization Agent (Spec §8.12)  
**Name:** **Note**. Its kind is its **note type** (Progress note, Event note…); the structure a type starts from is its **template**  
**Surface:** Patient details › Notes: the list and the reader (PD-070), and the note editor in the reader's place, opened by **New note** or a draft's **Continue writing**; the video consult's AI Notetaker draft (VID-015, VID-016)  
**Version:** 0.2  
**Status:** Draft — pending clinical and product validation  
**Last updated:** November 13, 2026

---

## 1. Overview

A note is a signed clinical document in the patient's record: what the clinician found, decided and did, in their words, with their name on it. Tele-ICU clinicians write one when they take over a patient, every day they follow them, and every time something happens. The hospital bills the clinician's time from it.

### 1.1 Note, encounter and section

Three words that are easy to confuse:

| Term | What it is | Example |
|---|---|---|
| **Encounter** | The patient's hospital stay, admission to discharge. Its ID is the account number (ACCT, in the patient header). Everything recorded during the stay files under it | One ICU stay of five days |
| **Note** | A document filed under the encounter, with its own type, author, time and status. It's signed on its own, can need a co-signature and can be billed on its own. One encounter has many notes | An initial note, five progress notes, a few event notes and their attestations |
| **Section** | A part inside a note | HPI, Camera / physical exam, A/P, Attestation |

A note is never "the encounter". The UI never says "Encounter note" (NTE-001).

ℹ️ Outpatient records often have one note per visit, and call the visit an encounter, so the two blur there. In the ICU they don't: the stay is one encounter, and the tele-ICU team writes many notes in it.

### 1.2 One format, converted per hospital

Intercept clinicians write every note **one way, whatever the hospital**: the **Intercept standard format** (Spec §5.4, CD-09). On write-back, the platform converts the note into the receiving hospital's structure (Epic note types, Cerner PowerNote, Meditech) through Template and Lexicon Management (Spec §6.19). Today the same clinician writes the same note differently in each hospital's EMR.

The client's screenshots (`documents/notes/`) are **Intercept's note templates as they live today in one client hospital's Epic**. In the spec's model they're the conversion target for that hospital, and the best evidence of what the standard format must hold (§4).

⚠️ **Constraint:** the screenshots carry a patient's history, medications and results, and a named surgeon. Confirm with the client that it's a test patient before they're committed; `documents/` ships with the Storybook site (NTE-OD-10).

### 1.3 Out of scope

| Experience | Where it belongs |
|---|---|
| The Notes tab's layout: list, search, filters, the selected note beside it | PRD Patient details, PD-070 |
| The AI Notetaker during a video consult: approval, capture, transcript, draft and Approve notes | PRD Video consult (VID-010–VID-025), PRD Bedside camera (CAM-008a) |
| Ambient capture's visible state and consent profile on the patient page | PRD Patient details, PD-073 |
| Orders and order sets placed alongside a note | PRD Patient details (Orders), DU-23 |
| The shift handoff | PRD Patient details, PD-110 |
| The revenue-cycle side of the Professional Fee Optimization Agent (alignment at submission) | Spec §8.12; later |
| Nursing, respiratory therapy and other hospital notes | They're imported and read in Notes (PD-070); Intercept doesn't write them |

### 1.4 Product objectives

| Objective | What it means for notes |
|---|---|
| **Write once, whatever the hospital** | One editor and one set of note types; the hospital's format is the platform's job (CD-09). |
| **Fill in what the platform already knows** | Vitals, labs, drips, ventilator settings, I/O, medications, allergies and history come from the patient's data, never retyped (NTE-004). |
| **Talk, don't type** | The AI Notetaker or AI Scribe drafts the clinician's judgment from the consult; the clinician reviews, edits and signs (CD-02, Spec §8.6). |
| **The clinician is the author** | Nothing is signed, written back or billed without the clinician's action. An AI draft says so until it's reviewed (CD-03, CD-05). |
| **Time is documented as it's spent** | Critical-care minutes come from logged consult time, for the clinician to confirm, not from memory (NTE-009, Spec §8.12). |
| **Say where it went** | A signed note shows whether it reached the hospital's record, and what to do if it didn't (PD-072). |

### 1.5 Source documents

1. Client note templates (`documents/notes/`, 20 screenshots, received Nov 13, 2026): Intercept's tele-critical care note templates in a client hospital's Epic.
2. Intercept Live — Virtual Care OS System Specification (`documents/Intercept Live - Virtual Care OS - System Specifications.md`): §5.4 (Clinical Documentation, consent and opt-out, mode behavior), §6.19 (Template and Lexicon Management), §8.6 (AI Scribe), §8.12 (Professional Fee Optimization Agent).
3. Requirements specification snapshot (`documents/specs/requirements-specification.md`): CD-01 to CD-11, BR-10; §8 data model (note status).
4. Design update spec snapshot (`documents/specs/design-update-spec.md`): DU-24 (note types, statuses, provenance, addendum).
5. PRD — Patient details (PD-070–PD-073, PD-OD-12; Care plan and activity), PRD — Video consult (VID-010–VID-019), PRD — Bedside camera (CAM-008a).
6. DESIGN.md › "Intercept Live › Notes: two panes edge to edge".

---

## 2. Users and use cases

| User | What they do with notes |
|---|---|
| **Intensivist** | Writes initial, progress and event notes; reviews and signs AI drafts; writes the attending attestation on an APP's note. |
| **Advanced Practice Provider (APP)** | Writes the same notes; their notes go to the attending for an attestation. The client's templates call them **APC** (advanced practice clinician). |
| **Critical Care RN** | ⚠️ Whether Intercept RNs write notes here is open (PD-OD-12). |
| **Bedside team** | Reads the signed note in their hospital's EMR. Not a user of Intercept's screens. |
| **Coders and revenue cycle** | Bill the clinician's time from the attestation. Not a user of the editor (Spec §8.12). |

| ID | Use case | Description |
|---|---|---|
| NTE-UC-01 | **Take over a patient** | The tele-ICU team starts covering a patient (an admission, or the start of night coverage) and writes the initial note. |
| NTE-UC-02 | **Daily progress** | Once a day per patient, the clinician reviews the last 24 h and writes the progress note. |
| NTE-UC-03 | **Document an event** | After an alert or a call from the bedside, the clinician examines the patient over the camera, acts, and writes an event note, or a brief event note for a small change. |
| NTE-UC-04 | **Finish an AI draft** | After a video consult, the clinician opens the AI Notetaker's draft, completes it and signs it. |
| NTE-UC-05 | **Attest an APP's note** | The attending examines the patient independently over video, agrees with the APP's note or adds to it, and documents their own time. |
| NTE-UC-06 | **Correct a signed note** | The clinician adds an addendum; the signed note stays as it was (CD-11). |

---

## 3. How a clinician works with notes today

What the templates and Epic's usual flow show. ⚠️ **Decision needed:** confirm each step with the client (NTE-OD-02); the screenshots show the templates, not someone using them.

1. **Something starts a note:** taking over a patient (initial note), the daily review (progress note), an alert or a call from the bedside (event note), or an APP's note to attest (attending attestation).
2. **Open the hospital's EMR and insert the template.** The clinician opens the patient in that hospital's Epic, starts a note and inserts Intercept's template (the editor's **Insert SmartText**, or a dot-phrase). Covering several hospitals means several EMR logins, each possibly with its own copy of the templates.
3. **The template fills in, then freezes.** Chart data is pulled in once, when the template is inserted: the I/O summary in the screenshots reads "at 1702", "1714", "1716", "1718" across four insertions, and the vitals table shows the last hour or two of readings.
4. **Fill each blank.** Epic's `***` marks a required blank: Issue or HPI, the camera exam (typed from memory, since the camera is another system), drips, O₂ settings and labs (read from the MAR, the flowsheets or the monitor, or asked of the nurse), the A/P, the ICU best practices, and who it was discussed with.
5. **Attest.** The minutes, usually estimated; critical care or standard, by how sick the patient is and whether the time reached 30 minutes; the clinician's state and who was involved.
6. **Sign.** Epic won't sign with a `***` left. The signed note is part of the hospital's record; an APP's goes to the attending, who writes the attestation with their own time. Coders bill from the attestation.

| Pain point | What Intercept can do |
|---|---|
| The exam is retyped from memory after the camera session | The AI Notetaker or AI Scribe drafts it from the consult (NTE-007) |
| Drips, O₂ settings and labs are copied by hand | Filled from the patient's data (NTE-004) |
| Data freezes when the template is inserted | Each data block shows when it was captured, and can be refreshed (NTE-004) |
| Minutes are estimated | Prefilled from logged consult time (NTE-009) |
| "Discussed w/" and persons involved are typed | Prefilled from the call's participants and the thread (NTE-009) |
| Several EMR logins and template sets | One editor, converted per hospital on write-back (NTE-014) |
| The event note is written after the fact | The alert, its actions and the pathway are already on the Timeline, ready to cite |

---

## 4. Note types and templates

### 4.1 The client's note types

Five templates, each in two versions: **critical care** and **standard** (NTE-009). All are titled "Intercept Telehealth Tele-Critical Care …".

| Note type | When | Sections | Screenshots |
|---|---|---|---|
| **Brief event note** | A small intervention | Issue, Interventions, Discussed w/ (no attestation) | 1 |
| **Event note** | Something happened and the clinician examined the patient over the camera | Issue, Camera / physical exam, Oxygen device settings, Drips, Labs, A/P, Discussed w/, Attestation | 2, 3 |
| **Initial note** | The tele-ICU takes over the patient | HPI, Past medical history, Past surgical history, Family history, Social history, Outpatient meds, Allergies, I/O, Camera / physical exam, Drips, Oxygen device settings, Labs (last 24 h), A/P, ICU best practices, Discussed w/, Attestation | 4–10 |
| **Progress note** | Daily follow-up | HPI, Vitals, I/O (last 24 h), Current meds, Allergies, Camera / physical exam, Drips, Oxygen device settings, A/P, ICU best practices, Discussed w/, Attestation | 11–16 |
| **Attending attestation** | The attending signs off on an APP's note | The progress note's sections with Pertinent labs, then "I have examined this patient independently via real-time interactive audiovisual telecommunication and agree with APC ___'s note and the assessment/plan with the following modifications/additions", then the attending's attestation. One version splits the exam into General, Cardiac, Lungs, Neuro | 17–20 |

ℹ️ Screenshots 8 and 12 repeat 5, and 13 repeats 14.

### 4.2 Sections

| Section | Filled by | Source in Intercept |
|---|---|---|
| **Issue / HPI** | Clinician, or AI draft | The alert and its reason; the consult transcript |
| **Vitals** | Chart (a table of recent readings, out-of-range values marked) | The monitor and the Timeline's vitals |
| **I/O** | Chart (last 24 h, or the last three shifts, and net since admission) | Intake and output |
| **Current / outpatient meds** | Chart | Medications |
| **Allergies** | Chart | Allergies (always shown, PD-AC-02) |
| **Past medical, surgical, family, social history** | Chart | Chart tab |
| **Camera / physical exam** | Clinician, or AI draft. Optionally General, Cardiac, Lungs, Neuro | The video consult, the bedside camera |
| **Drips** | Clinician today (no link in the template) | Infusions on the Timeline |
| **Oxygen device settings** | Clinician today (no link) | Ventilator and O₂ settings on the Timeline |
| **Labs / Pertinent labs** | Chart (24 h of results) in the initial note; clinician in the attestation | Labs |
| **A/P** | Clinician, or AI draft | The pathway, the care plan, orders |
| **ICU best practices** | Clinician: VTE prophylaxis, stress ulcer prophylaxis, nutrition, glycemic control, vent liberation (if applicable) | Medications and orders can suggest each answer |
| **Discussed w/** | Clinician | The call's participants, the bedside thread |
| **Attestation** | Clinician, with prefilled values (NTE-009) | Logged consult time, the clinician's profile |

### 4.3 The attestation

The attestation is what the hospital bills on.

| Version | Wording | Billing |
|---|---|---|
| **Critical care** | "I spent a total of `***` minutes of aggregate critical care time on this patient's care today exclusive of procedural time. There is a high probability of sudden clinical deterioration due to acute impairment of vital organ systems that require complex and urgent medical decision making to frequently assess, manipulate, and support vital life-sustaining functions. Lack of these complex and urgent medical care would probably cause rapid clinical deterioration and possible death." | Critical care codes (CPT 99291 for the first 30–74 minutes, 99292 for each 30 after; Spec §8.12) |
| **Standard** | "I spent a total of `***` minutes of time on this patient's care." | Evaluation and management codes |
| **Attending** | Either one, "separate from / in addition to the time spent by APC ___" | Split / shared visit with the APP |

Every version ends with the telehealth lines: **Telemedicine consent: in chart**, **Provider distant site (state abbreviation)** (where the clinician is, which must be a state they're licensed in), **Persons involved: Patient, `***`**, and **Patient seen via two-way interactive audiovisual telecommunication** (audio alone doesn't qualify).

### 4.4 The client's templates and the specs

CD-07 and DU-24 list different note types from the client's templates. Cowork owns those requirements, so the gap goes to them (NTE-OD-01).

| Specs (CD-07, DU-24) | Client's templates |
|---|---|
| Initial note (consult) | Initial note ✓ |
| Progress note **with an overnight-events section** | Progress note, with no overnight-events section |
| **ICU recommendations** by system | **ICU best practices**, a checklist of five, not by system |
| Critical care progress, procedure, event | Event note ✓; no procedure note |
| H&P, Consult | Not sent |
| — | **Brief event note** |
| — | **Attending attestation** |
| Critical-care vs non-critical-care auto-selection (CD-10) | Every type comes in both versions, so CD-10 picks between them |

---

## 5. Requirements

| ID | Requirement | Detail |
|---|---|---|
| NTE-001 | **A note is a document in the stay** | Each note has a type, an author (name and role), a time, a status and its sections, and files under the patient's encounter (the stay). One encounter has many notes. The UI says **note** and the type's name, never "Encounter note". |
| NTE-002 | **Note types** | **New note** offers the note types the clinician can write: Initial note, Progress note, Event note, Brief event note, and Attending attestation (only on an APP's signed note, NTE-013). A tenant can add types (H&P, Procedure) under the Client Administrator's note-type governance (Spec §5.4). ✅ **Resolved:** the Notes list's "+" opens a **New note** menu of four types, each with when it's written: **Tele-ICU progress note** (Daily follow-up), **Tele-ICU event note** (Something happened and you examined the patient), **Tele-ICU brief event note** (A small intervention), **Tele-ICU initial note** (Taking over the patient). "Tele-ICU" keeps them apart from the hospital's own progress notes in the list. The sample notes use these names (the admission note is now the initial note). ⚠️ **Not built:** the Attending attestation. ⚠️ **Decision needed:** the final list (NTE-OD-01). |
| NTE-003 | **Templates** | Each type starts from its template: its sections, in order, which are required, and which are filled from the chart. Templates are versioned, with tenant overrides on Intercept's defaults (Spec §6.19). A signed note keeps the template version it was written with. |
| NTE-004 | **Chart data fills in** | Sections the platform has data for (vitals, I/O, meds, allergies, history, labs, and drips and O₂ settings, which the client's templates leave to the clinician) fill in when the note starts, each with **as of {time}** and **Refresh**. They're part of the note once signed and never change after. ✅ **Resolved:** each chart section reads the patient's record when the note starts, shows "As of {time} · {source}", and reads again only on **Refresh**. **Vitals:** a table of the last six charted times (the BP's) and the monitor's **Now**, BP, Pulse, Resp, Temp and SpO₂, a value outside its alarm limits marked "(!)" in red ("Out of range" for screen readers). **Intake and output:** net balance and weight change. **Current medications:** infusions, scheduled and as-needed, from the MAR. **Outpatient medications**, **Allergies** and **History** (medical, surgical, social) from the hospital's record. **Drips:** each infusion's rate and its last change, from the pump. **Oxygen device settings:** the support, mode and settings, and the last ABG. **Labs:** the last 24 h, one line per panel, out-of-range values marked H / L / C. A section the record has nothing for says "Not in the patient's record". ⚠️ **Proposed:** whether data refreshes on its own until signing (NTE-OD-08). |
| NTE-005 | **Required blanks** | A required section left empty is marked, and the note can't be signed until it's filled (Epic's `***`). A key moves to the next blank. Signing with blanks left lists them and focuses the first. ✅ **Resolved:** required are every section the clinician writes (except where a template says otherwise), all five ICU best practices, and the attestation's minutes, distant site and persons involved. Each is marked **Required**; the Sections menu marks it with an empty circle. **Sign** with any left: "Before signing, fill in or review:" lists them as links, each taking focus to its field, focus goes to the first, and the blanks turn red. ⚠️ **Not built:** a key to move to the next blank. |
| NTE-006 | **Ways to write each section** | Type, dictate (CD-08, a separate mode from ambient capture), insert a smart phrase or dot-phrase (CD-07), or take the AI draft (CD-02). The choice is per section. ✅ **Resolved:** each section the clinician writes has a microphone (shown where the browser has speech recognition): what's heard is added after what the section holds, until it's pressed again ("Listening… press the microphone again to stop."). ⚠️ **Not built:** smart phrases. |
| NTE-007 | **AI drafts** | The AI Scribe or AI Notetaker drafts Issue / HPI, the camera exam, the A/P and Discussed w/ from the consult and the chart (CD-02, Spec §8.6). A draft is marked **Unverified** until the clinician reviews it (CD-03), and each AI-written section stays marked until edited or accepted. The AI never signs or writes back (Spec §8.6). A signed note keeps the provenance "AI-drafted, clinician-signed" (CD-05). ✅ **Resolved:** an empty HPI or Issue offers **Draft with AI** (the patient's AI brief), and an empty Assessment and plan offers it with the pathway in force. The text lands on the AI's tint, with "AI draft · Unverified", "Review it, then edit or accept it before signing." and **Accept**; the header shows **Unverified**, the Sections menu a sparkle. Editing or Accept clears it. An unreviewed AI section keeps the note from being signed ("HPI (AI draft)" in the list of blanks). A signed note with any AI section reads "AI-drafted, clinician-signed" under its byline. An AI Scribe draft opened in the editor starts with every section Unverified. ✅ **Resolved:** the AI Notetaker's approved consult note goes to Notes as a **Tele-ICU event note**, a draft for signature (VID-016); opened, its text lands in Assessment and plan, Unverified. ⚠️ **Gap:** the AI draft isn't split into the note's sections (VID-015, NTE-OD-09). |
| NTE-008 | **ICU best practices** | In the initial and progress notes, one line each for VTE prophylaxis, stress ulcer prophylaxis, nutrition, glycemic control and vent liberation (if applicable). ✅ **Resolved:** a field each, all required (Epic's `***`; "N/A" answers vent liberation for a patient who isn't ventilated). ⚠️ **Proposed:** suggest each answer from the patient's medications and orders, for the clinician to confirm. |
| NTE-009 | **Attestation** | The clinician picks **critical care** or **standard**; the platform may propose one from the patient's data (P/F ratio, pressors; CD-10, a Nice-to-have) but never picks it. Prefilled for the clinician to confirm: the minutes, from the consult time logged today for this patient; persons involved, from the call's participants; the distant site, from the clinician's profile. Consent and "two-way interactive audiovisual" are fixed lines. Prompts only ever say what the documentation is missing for work actually done, e.g. "32 min of consult time logged, 0 documented" (Spec §8.12: alignment, never upcoding). ✅ **Resolved:** **Telemedicine attestation**, the last section of every type but the brief event note: **Critical care** (selected first) or **Standard**, each with what it's for; **Minutes**, prefilled with the video consult time logged today (the activity's ended consults), with "{n} min of video consult logged today for this patient. Add your chart review and other time." (or "No video consult logged today…"), and with Critical care under 30 minutes, "Critical care time needs 30 minutes or more; under that, use Standard."; the wording, with the minutes in it; "Telemedicine consent: In chart"; **Provider distant site (state abbreviation)**; **Persons involved**: "Patient," and a field prefilled with the bedside nurse; the audiovisual line. ⚠️ **Gap:** the distant site is typed: the clinician's state isn't in the data. ⚠️ **Not built:** CD-10's proposal. |
| NTE-010 | **Save draft** | A draft saves as it's written and stays with the patient, listed in Notes as **Draft** (CD-06, PD-070). ✅ **Resolved:** a new note joins the list as a **Draft** the moment it starts, selected, and updates as it's written. **Save draft** closes the editor and shows the draft in the reader, with **Continue writing**; selecting another note keeps the draft as written. A draft from before (or the AI Scribe's, **Review and sign**) opens in its type's template, each earlier section in the one its heading names (Assessment and Plan both in Assessment and plan); a type with no template keeps its own sections. ⚠️ **Gap (prototype):** drafts and signed notes live in the tab, and are gone once the patient's page closes. |
| NTE-011 | **Sign** | Signing locks the note: no more edits, only addenda (NTE-012). The note shows who signed it and when. ✅ **Resolved:** a signed note goes to the top of the list at the time of signing: **Written to {EMR} · {time}** where the hospital takes Intercept's notes back, **Signed** elsewhere (PD-072). Its chart sections keep what they read, with "As of {time} · {source}". |
| NTE-012 | **Addendum** | A signed note takes an addendum, its own dated entry linked to the original; the note's status reads **Addendum** (CD-11, DU-24). |
| NTE-013 | **Co-signature and the attending attestation** | An APP's signed note shows that it needs the attending's attestation (CD-11), and can be assigned to an attending. The attending writes the **Attending attestation**: linked to the APP's note, with their independent exam, their changes to the A/P, and their own time, "separate from the APP's". ⚠️ **Decision needed:** how notes get routed to the attending, and who decides (NTE-OD-05). |
| NTE-014 | **Write-back** | A signed note is converted into the hospital's format and written to its record (Integrated), or delivered as a structured import or PDF (Overlay) (Spec §5.4, CD-09). Notes shows where it went: "Written to Epic · 14:32", or what failed and what to do (PD-072). The conversion shows as a confirmation detail (CD-09). |
| NTE-015 | **Ambient capture** | While the AI Scribe or AI Notetaker captures, its state is always on screen with Pause and Stop; consent follows the hospital's state profile, and a patient's opt-out ends capture for that session (CD-01, CD-04, BR-10; PD-073, VID-011, VID-013). ⚠️ **Decision needed:** whether "for the encounter" in CD-04 and BR-10 means the session or the whole stay (NTE-OD-03). |
| NTE-016 | **The editor** | The note type and its template at the top; an index of the note's sections beside it, each marked when required and empty; each section with its way to write it (NTE-006), and a chart section's **as of** and **Refresh**; **Save draft**, **Assign** (an APP's note) and **Sign**. ✅ **Resolved:** in the Notes tab's right pane, in the reader's place, beside the list. A header that stays under the page's while the note scrolls: the type, **Unverified** while an AI section waits and **Draft**, the author and "Started {time}", then **Save draft** and **Sign**. ~~Beside the sections, while the pane is wide enough, the index: each section's heading, a check when done, an empty circle while required and blank (red after a failed sign), a sparkle for an AI draft to review; a click scrolls to it.~~ ✅ **Resolved:** the index is a menu: an outline icon button (lucide `menu`, "Note sections") before Save draft opens **Sections**, each section's heading with a check when done, an empty circle while required and blank (red after a failed sign), a sparkle for an AI draft to review; picking one scrolls to it and puts focus in its first field. The sections take the pane's full width. ⚠️ **Not built:** Assign; the app header's Create › New note only reports the click (it doesn't open the Notes tab). |
| NTE-017 | **Accessibility** | Required blanks are announced as required, and the list of blanks on a failed sign is read out. AI-written sections say so in text, not only by color. The section index is a navigation landmark. Dictation is a peer to typing, not a hidden shortcut (Spec §5.4). |
| NTE-018 | **Synthetic data** | Every note in the prototype is made up (Brief; PD-150). Nothing from the client's screenshots is reused as sample data. |

---

## 6. Statuses

| Status | Meaning | Today (`PatientNoteStatus`) |
|---|---|---|
| **Draft** | Being written, not signed | `draft` |
| **Unverified** | An AI draft the clinician hasn't reviewed (CD-03) | In the editor: the header's **Unverified** badge and each AI section's "AI draft · Unverified" (NTE-007). ⚠️ **Gap:** not a status of its own; the list shows the note as Draft, an AI Scribe draft with its AI Scribe badge |
| **Signed** | Signed in Intercept (or, for an imported note, in the hospital's record) | `signed` |
| **Awaiting attestation** | An APP's signed note waiting for the attending (CD-11) | ⚠️ Not built |
| **Written to {EMR}** | Signed and in the hospital's record | `written-back` |
| **Write-back failed** | Signed, but the hospital's record didn't take it | `write-back-failed` |
| **Addendum** | Signed, with one or more addenda (CD-11) | ⚠️ Not built |

---

## 7. Data

| Field | What it is | Code |
|---|---|---|
| `type` | The note type's name, "Tele-ICU progress note" | `PatientNote.type` |
| `author` | Name, role, organization | `PatientNote.author` |
| `at` | When written or last edited, ISO 8601 | `PatientNote.at` |
| `origin` | Imported from the hospital's record, or written in Intercept | `PatientNote.origin` |
| `status`, `writtenBackAt`, `failure` | §6; where it went and what failed | `PatientNote.status` … |
| `scribe` | Drafted by AI from a camera session | `PatientNote.scribe` |
| `sections` | Heading and text, in order | `PatientNote.sections` |
| `fields` | Coded fields recorded with the text (a social need's Z code) | `PatientNote.fields` |
| `aiDrafted` | Signed with AI-drafted sections: "AI-drafted, clinician-signed" | `PatientNote.aiDrafted` |
| `emr` | The hospital's record, "Epic" | `PatientNotes.emr` |
| `writeBack` | The hospital takes Intercept's signed notes into its record: a note signed here reads Written to {EMR} | `PatientNotes.writeBack` |
| Note context | The author (the care team's signed-in clinician, `you`), the chart sections, the AI drafts (the brief; the pathway in force), the day's consult minutes, the bedside nurse | `NoteContext`, `noteContextFrom(record, monitor)` (`note-chart.ts`) |
| Consult minutes | How long a video consult lasted, on its "ended" activity entry | `PatientActivity.durationMs` |
| A draft being written | The template, each section's text, which are Unverified, the chart as read, the best practices, the attestation | `NoteDraft` (`note-editor.tsx`) |
| ⚠️ **Not in the data yet** | The encounter (ACCT); the template's version; each section's provenance once signed (typed, dictated, AI); the attestation as structured fields (it's text once signed); the clinician's state; the co-signer and the APP's note an attestation answers; addenda and the note they amend | — |

---

## 8. Acceptance criteria

All proposed until the editor is built.

| ID | Given | When | Then |
|---|---|---|---|
| NTE-AC-01 | A patient's Notes | The clinician picks New note | The note types they can write are offered; picking Progress note opens its template with vitals, I/O, meds and allergies filled in, each showing "as of {time}" |
| NTE-AC-02 | A progress note with the A/P empty | The clinician picks Sign | The note isn't signed; the empty required sections are listed and the first has focus |
| NTE-AC-03 | A video consult whose notes were approved (VID-016) | The clinician opens the draft from Notes | It's marked Unverified, its AI-written sections marked; once reviewed and signed it shows "AI-drafted, clinician-signed" |
| NTE-AC-04 | A note with critical care chosen and 32 minutes of consult logged today | The attestation shows | Minutes reads 32, editable; persons involved lists the call's participants; nothing is signed until the clinician signs |
| NTE-AC-05 | A signed note | The clinician tries to edit it | Only Add addendum is offered; the addendum is dated, linked, and the note reads Addendum |
| NTE-AC-06 | An APP signs a progress note | The attending opens it | It reads Awaiting attestation; Attending attestation starts linked to it, asking for the attending's own exam and time |
| NTE-AC-07 | A signed note at an Integrated hospital | Write-back succeeds or fails | Notes shows "Written to Epic · {time}", or Write-back failed with what failed and Retry (PD-072) |
| NTE-AC-08 | AI capture is running | The patient asks that it stop | The clinician stops it in one action; it doesn't resume without new consent (BR-10) |

---

## 9. Open decisions

| ID | Topic | Decision needed |
|---|---|---|
| NTE-OD-01 | ⚠️ **Note types** | The client's five types vs CD-07 and DU-24 (§4.4): the overnight-events section, ICU recommendations by system vs the best-practices checklist, H&P, Procedure, Consult. Send to Cowork. |
| NTE-OD-02 | ⚠️ **The workflow** | Confirm §3 with the client: how templates are inserted (SmartText list or dot-phrase); when notes are written (during the call, right after, or at the end of the shift); how critical-care minutes are tracked today; whether every hospital has the same templates; whether APPs or physicians write most notes; how many of each type per shift. |
| NTE-OD-03 | ⚠️ **"Encounter" in CD-04 and BR-10** | "Opt-out ends capture for the encounter": the session (one consult) or the whole stay. The specs use "encounter" both ways (glossary). |
| NTE-OD-04 | ⚠️ **AI Scribe vs AI Notetaker** | One name for the AI that drafts notes. Notes badges drafts **AI Scribe**; the video consult calls it **AI Notetaker** (PRD Patient details, Care plan and activity). |
| NTE-OD-05 | ⚠️ **Routing to the attending** | How an APP's note reaches the attending (assigned by the APP, by coverage, or by pairing), and where the attending sees what's waiting. |
| NTE-OD-06 | ⚠️ **Which encounter** | Whether Intercept's notes file under the hospital's inpatient encounter, or a separate telemedicine or professional-billing encounter. It decides where write-back lands (PD-072). |
| NTE-OD-07 | ⚠️ **Critical-care time** | What counts toward the minutes (video consults, chart review, messages) and whether a running daily total per patient is shown (Spec §6.21 time-on-task). |
| NTE-OD-08 | ⚠️ **Data freshness** | Whether chart sections refresh on their own until signing, or only on Refresh, and whether a change since insertion is flagged. The prototype reads them once and on Refresh. |
| NTE-OD-09 | ⚠️ **The AI draft's structure** | The AI draft fills the note type's sections (CD-02's HPI, Exam, Assessment, Plan map onto Issue / HPI, Camera exam, A/P), not a free-text summary (VID-015). |
| NTE-OD-10 | ⚠️ **The client's screenshots** | Confirm they show a test patient before committing `documents/notes/`, or keep them out of git. |
| NTE-OD-11 | ⚠️ **RN notes** | Whether Intercept Critical Care RNs write notes, and which types (PD-OD-12). |
| NTE-OD-12 | ~~⚠️ **Where the editor opens** · A panel beside the patient's page, the Notes tab's right pane, or a page of its own; and whether it can stay open beside the video consult.~~ ✅ **Resolved:** the Notes tab's right pane (NTE-016). ⚠️ **Open question:** whether it can stay open beside the video consult. |
| NTE-OD-13 | ⚠️ **ID prefix** | `NTE-`, `NTE-AC-`, `NTE-UC-` and `NTE-OD-` are new repo-local IDs, to confirm with the team. |

---

## 10. Design and code

| What | Where |
|---|---|
| The Notes tab (list, reader, statuses, AI Scribe badge) | `src/layouts/intercept-live/patient-details/sections/notes-section.tsx` (`PatientNote`, `PatientNoteStatus`, `NotesSection`; `onNewNote`, `onEditNote`, `onRetryWriteBack`) |
| Sample notes | `src/layouts/intercept-live/patient-details/sections/sample-notes.ts` |
| The AI Notetaker's draft and Approve notes | `src/layouts/intercept-live/alert-panel/alert-panel.tsx` (the notetaker), `consult-transcript.tsx` (the transcript) |
| The note editor | `src/layouts/intercept-live/patient-details/sections/note-editor.tsx` (`NoteEditor`, `NoteDraft`, `newNoteDraft`, `draftFromNote`, `noteFromDraft`, `signBlockers`) |
| Note types and templates | `sections/note-templates.ts` (`noteTemplates`, `noteTemplateFor`, `bestPracticeItems`, `attestationVersions`): product content |
| What a note fills in | `sections/note-chart.ts` (`noteContextFrom`, `readNoteChart`), from `PatientRecord` and the live monitor; passed in by `patient-details.tsx` |
| Figma | intercept.ds `Notes` (`1516:98`, its content `1516:405`): the tab. ⚠️ **Pending (Figma):** no editor |
| Decisions | DESIGN.md › "Intercept Live › Notes: two panes edge to edge" |
| Client reference | `documents/notes/` (NTE-OD-10) |
| Stories | Layouts/Intercept Live/Patient details › Default, Notes tab (Sarah Miller: New note, her progress note draft, the AI Scribe huddle draft) |
