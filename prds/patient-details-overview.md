---
requirements: [PD-06, SV-01, SV-02, SV-03, SV-08, CH-02, CH-03, CC-09]
status: proposed — confirm with Carlos
---

<!--
Created: Nov 25, 2026
Created by: Julio Caunedo
Last updated: Nov 25, 2026
Latest update: the acceptance criteria and open questions are numbered PDO-AC-01 and PDO-OD-01 on, each one moved from Patient details noting its old ID, so they can be cited without clashing with other tabs. Why: each tab gets its own ID prefix (user's call).
Recent updates: Created the same day from Patient details §5, so each tab has its own PRD.
Scope: The Overview tab of Patient details in Intercept Live (`PatientOverview`, src/layouts/intercept-live/patient-details/patient-overview.tsx): the AI clinical summary, the clinical findings, and the cards under them (Live monitoring, Care plan, Up next, Medications, Oxygen and infusions, Recent orders, Encounter, Referrals), plus how the page tracks what was done and decided (Care plan and activity). Moved out of PRD Patient details §5 (PD-020 to PD-026).
Purpose: One place for what the Overview shows and does, so the default view of a patient stays "what matters now" and its decisions aren't reopened.
-->

# Patient details — Overview

**Location:** Intercept Live › a patient's page (Patient details), the first tab, **Overview**, where the page opens ([patient-details.md](patient-details.md), "3.2 Regions")  
**Audience:** Intensivists, APPs and Critical Care RNs  
**Description:** The default view of one patient: what the clinician needs to know about them now, and nothing more (Spec §9.1, Principle 2).  
**Source:** `src/layouts/intercept-live/patient-details/patient-overview.tsx` (`PatientOverview`, `PatientBriefBanner`, `KeyLabTile`); the cards' parts in `patient-details/section-parts.tsx`; the Care plan card in `sections/care-plan-section.tsx` (`CarePlanCard`); rendered by `patient-details.tsx`  
**Figma:** Intercept-Live "Overview" (`149:4464`); clinical findings (`242:11805`); the cards (`242:12310` and its neighbors: Live monitoring `239:11253`, Up next `239:11497`, Oxygen and infusions `252:10474`, Recent orders `252:10517`, Referrals `242:11802`); the brief is intercept.ds AI Clinical Summary Banner (`1467:13678`); a lab tile is intercept.ds `lab-tile` (`1405:43`)  
**Status:** Draft — built in the prototype, pending clinical and product validation  
**Last updated:** November 25, 2026

---

## Purpose

A clinician who opens a patient, from an alert, a card or a list, first needs to know where the patient stands and what's being done about it, without reading the whole record. The Overview answers that on one screen: an AI summary of what matters, the numbers the plan turns on, the live monitor, the plan and what's due, and what the patient is on. Everything else (history, full results, orders, notes) is one click away in its own tab.

ℹ️ Related specs: the page (header, tabs, panels, entry points, freshness, page states, audit, accessibility) is in [patient-details.md](patient-details.md); the Care plan card in [care-plan.md](care-plan.md), "CPL-040 — The Overview's Care plan card"; the live monitor in [patient-monitor.md](patient-monitor.md); the Timeline the Overview's activity moved to in [patient-details-timeline.md](patient-details-timeline.md); a key lab's trend on the Labs tab in [patient-details.md](patient-details.md), "Labs".

## What it shows

Top to bottom:

1. **AI clinical summary** (PD-024), across the top, when the patient has one.
2. **Clinical findings** (PD-025): the key labs, then what matters for this patient's situation.
3. A grid of cards, three to a row on a wide screen, two on a narrower one, one under that (the side panels narrow it):
   - **Live monitoring** (PD-021), **Care plan** ([care-plan.md](care-plan.md), "CPL-040 — The Overview's Care plan card"), **Up next**.
   - **Medications**, **Oxygen and infusions** (PD-022), **Recent orders**.
   - **Encounter** (PD-026), **Referrals** (PD-026).

Cards in a row share its height. A card's list never scrolls: it shows the rows that fit whole (fewer on a narrow card, never one cut in half), and its **View all** opens the rest. Every card names its source and age where it has one (PD-120), and data that's missing says it's missing; only an empty list says there's none (States).

✅ **Resolved:** the alerts, the activity log and the score breakdown are not on the Overview. The patient header's alert count, on every tab, opens the Alerts panel (PD-020); the activity is on the Timeline (PD-023); the score's breakdown shows in a deterioration alert's evidence ([patient-details.md](patient-details.md), "PD-012 — Acuity and trajectory"). Each surface shows once, in one place.

### PD-020 — Alerts and concerns

✅ **Resolved:** (Nov 9, 2026, user's call, following Intercept-Live `149:4464`) the alerts are no longer on the Overview. The patient header shows how many are open, in the worst one's color, on every tab, and **View alerts** opens them all in the Alerts panel (PD-012), with the rows and actions below. That keeps them a mandatory surface ([patient-details.md](patient-details.md), "3.4 Mandatory and optional surfaces") without a second copy on the page.

Every active alert and Clinician Intuition Alert for the patient, highest severity first (MON-021), with the same rows and actions as the triage queue: Acknowledge, Escalate, Resolve with a reason, Decline with rationale for AI rows (MON-022, MON-023).

- Each row shows source, age, state with who and when, and Overdue (PRD OD-15).
- A concern carried over from the last shift says so, with who raised it (PC-132).
- Selecting an alert highlights its evidence on the Timeline ([patient-details-timeline.md](patient-details-timeline.md)).
- With no active alerts: "No active alerts · Last alert 14:22" (MON-051).

ℹ️ These rows now live in the Alerts panel, which the patient header opens on every tab ([patient-details.md](patient-details.md), "PD-012 — Acuity and trajectory"). They stay here until the Alerts panel has a section of its own.

⚠️ **Discrepancy:** selecting an alert doesn't highlight its evidence on the Timeline in the prototype; an open alert's bell on the Timeline opens the alert instead.

### PD-024 — AI summary

A short summary of the last 24 hours written by the Conversational Clinical Data Agent (Spec §8.7), on request or kept current.

- Marked as AI, with the agent's name and when it was written (Spec §9.1, Principles 7 and 9).
- Every sentence cites its source (vitals, labs, notes, orders); a citation opens the source and its place on the Timeline.
- Retrieves and summarizes only: no diagnosis, no therapeutic recommendation (Spec §8.7). Where data is thin it says so ("No labs resulted at this hospital in the last 24 hours") instead of filling the gap (Spec §9.1, Principle 12).
- It doesn't rewrite while someone is reading it: a newer version waits behind "Summary updated · Show" (as the Monitoring panel order prompt, MON-013).
- ✅ **Resolved:** (Nov 9, 2026, user's call, following intercept.ds AI Clinical Summary Banner `1467:13678`) the Overview's brief is the AI clinical summary banner: ~~"AI clinical summary: {headline}" over the summary~~, with how many sources it read and how old it is ("17 sources · 3 h 10 min ago"). Clicking it still opens Ask Intercept Live about what's behind it. Its **×** hides it until a newer summary or another patient, so the clinician can put it away (an optional surface, [patient-details.md](patient-details.md), "3.4 Mandatory and optional surfaces").
- ✅ **Resolved:** the brief is one line, the headline in bold then the summary ("**Worsening hemodynamic and respiratory status:** MAP decreased from 70 to 58 mmHg…"), cut off where it runs out of room; the words "AI clinical summary" are no longer on it, its sparkle marks it as AI, and hovering it shows "AI clinical summary" in a tooltip (screen readers hear it as the banner's name).
- ✅ **Resolved:** the whole banner is one click target. It opens Ask Intercept Live about this patient and asks "Summarize what's behind the brief"; the answer gives the summary's details, then what changed since the clinician last looked. Clicked again while Ask Intercept Live is open about this patient, it closes the chat, so the same place opens and closes it.
- ℹ️ The Labs tab opens on the same banner for the labs alone, titled "Labs summary" ([patient-details-labs.md](patient-details-labs.md)); it behaves the same.
- ⚠️ **Decision needed:** on by default or on request, and whether it ranks "what matters now" (PDO-OD-01). The exploration's Brief direction ranks with AI; a fixed rule (severity, then rate of change) that the AI only explains is safer to validate.
- ⚠️ **Discrepancy:** the banner shows how many sources it read, not a citation per sentence, and doesn't name the agent; there's no "Summary updated · Show" (the prototype's summary doesn't change while open). The citations are in Ask Intercept Live's answer.
- ⚠️ **Gap:** the follow-up "What changed since I last looked?" still shows under the brief's answer in Ask Intercept Live, which already covers it.

### PD-025 — Key labs snapshot

The latest value of the labs that matter for this patient (by default lactate, creatinine, potassium, hemoglobin, WBC, the last ABG), each with its result time, previous value and direction. Pending labs show "Pending · collected 13:10". The full list is in Labs ([patient-details.md](patient-details.md), "Labs").

✅ **Resolved:** each lab tile says how much the result changed, not only which way: "▲ +0.5 · Was 2.2 at 2:43 AM", the amount at the results' own precision. The arrow and the amount take the lab's flag color (amber High, blue Low, red Critical) and stay grey on an in-range lab, so color always means out of range; when either result isn't a number ("<0.5", "Positive"), the line shows only "Was …".

✅ **Resolved:** (Nov 9, 2026, user's call, following Intercept-Live `149:4464`, annotated "section primarily reserved for contextual clinical findings") the row is the Overview's **clinical findings**: the key labs, then what matters for this patient's situation as tiles of the same kind: a vital watched against a rule ("SBP 128 · Nitro stops < 110"), the breathing support and since when ("BiPAP 10/5 · 40% · Since 8:03 AM"), a charted temperature ("Charted · Normal"). A charted value older than its limit says how old it is in red ("2 h old"), so a stale number never reads as current (PD-120). ⚠️ **Decision needed:** who picks each patient's findings (the care plan, a rule per condition, or the clinician) and each one's staleness limit; the prototype's samples set them by hand.

✅ **Resolved:** a key lab tile opens that lab's trend: the page switches to the Labs tab, where Lab trends charts that test alone and scrolls to it ([patient-details.md](patient-details.md), "Labs"). Only labs Lab trends can chart (a numeric result) open; any other lab, and every finding that isn't a lab, stays a plain tile. The same tile on the Labs tab opens the same trend, so a key lab behaves the same on both tabs.

### PD-021 — Live monitor

The patient's full bedside monitor: the four-lane `PatientMonitoringCard` view (ECG II, Pleth, ABP, Resp) with HR, SpO₂, BP and MAP, RR as primary numerics and temperature, EtCO₂ and the rest secondary.

- Follows the Monitoring display conventions MON-070 to MON-074: fixed lane order, numeric hierarchy, one color per parameter, alarms shown apart from parameter colors, values grouped by device ([monitoring.md](monitoring.md), "3.3 Monitoring display conventions").
- A value outside its limits gets the ↑ / ↓ tag (MON-014); limits come from configuration (PC-044). How the monitor draws limits and device alarms is in [patient-monitor.md](patient-monitor.md), "PMN-030 — Alarm limits".
- The card is titled **Live monitoring**, with a live dot while the monitor reports and how many of the patient's devices are connected ("3/3 devices connected": the monitor, plus the ventilator and the pumps when the patient has them).
- ⚠️ **Decision needed:** the waveform set per bed type (MON-OD-11) and the parameter palette (MON-OD-10) are shared with Monitoring.
- ⚠️ **Discrepancy:** the card shows the four lanes and their numbers (HR, SpO₂, ABP with MAP, RR); temperature, EtCO₂ and the other secondary values aren't on it. ℹ️ The component is now `PatientMonitor`, its own PRD.

### PD-022 — Organ support

| Group | Label | Content |
|---|---|---|
| **Respiratory** | "Ventilator" (MON-074) | Support type (invasive, NIV, high-flow, oxygen, room air), mode, FiO₂, PEEP, set and measured tidal volume and rate, plateau pressure, last ABG. Vent-order mismatch evidence when present: current vs ordered, time delta, source of each (PC-052, Spec §8.3) |
| **Infusions** | "Pump" (MON-074) | Each continuous infusion: drug, rate with units, dose by weight where relevant, last change and its direction. A missing pump feed reads "Rate unavailable", never "stopped" (PC-060) |
| **Other support** | By device | CRRT, ECMO and others, when sourced |

- ✅ **Resolved:** organ support and fluids share one card, **Oxygen and infusions** (Intercept-Live `252:10474`): the breathing support with its mode, its first two settings and when the last ABG was drawn; each infusion with its rate and its last change ("▲ Up from 0.15 at 2:57 PM"); then intake and output ("Net balance … · weight … over … · charted by … at …") and where it all comes from (DU-18). **View all · n** opens Medications.
- ⚠️ **Decision needed:** the exact respiratory parameters (PRD OD-08).
- ⚠️ **Discrepancy:** the card shows two ventilator settings, not the full respiratory group above; set and measured values, plateau pressure, vent-order mismatch evidence and other support (CRRT, ECMO) aren't on it.

### Up next

What's due in the next 12 hours, soonest first: scheduled medications, checkpoints not yet recorded (keep or transfer), order recommendations with a due time, and the pathway's open bundle elements, protocol checks (those due or overdue, then the next) and open bedside tasks once the pathway is sent. Each shows its time, what it is and how soon: **Overdue 10 min** in red, **In 45 min** within the hour in amber, later in grey. An overdue item stays until it's done.

- Five items show; **View all** opens the rest in place (there's no Up next tab), and closes them again.
- Nothing due: "Nothing scheduled in the next 12 hours."

### Medications, Recent orders

- **Medications:** the scheduled medications, the most recently given first, each with its dose, route, frequency and indication, and when it was last given ("Given 2:53 PM", "Not given yet"; older than 12 hours, with its day). Five show; the rest join the line under them with the infusions and as-needed ones ("Plus 2 more scheduled, 4 infusions and 4 as needed: …"). **View all · n** opens Medications. When it's next due is Up next's.
- **Recent orders:** the four newest active orders with their status (Active, Collected, Scheduled, Pending), and the source line. **n recommendations** (order recommendations waiting for a decision) and **All orders** both open Orders.

### PD-023 — What changed

Changes since this clinician last viewed the patient: new and resolved alerts, acuity change, drip and ventilator changes, new results, new notes, ADT events. Each item has its time and opens its place on the Timeline.

- "Since you last viewed · 06:40" heads the list; first view of the shift shows the last 12 hours.
- ✅ **Resolved:** (Nov 9, 2026, user's call, following Intercept-Live `149:4464`) the Overview no longer has the Now line and its log; what changed is on the Timeline ([patient-details-timeline.md](patient-details-timeline.md)), shaded since the last look.
- ⚠️ **Decision needed:** how "last viewed" is recorded per clinician, and whether it's derived from the access audit (PD-OD-06, PC-153).

### PD-026 — Context

| Item | Content |
|---|---|
| **Diagnosis and problems** | Admitting diagnosis, active problem list (⚠️ **Gap:** PD-010) |
| **Care team** | Bedside nurse, attending of record, Intercept intensivist, APP and RN on this shift, with presence (Spec §6.12) and a message action each |
| **Encounter** | Admitted, ICU day, encounter status (PC-015), transfer pending (PRD OD-16) |
| **Referrals** | ✅ **Resolved:** (Nov 9, 2026, user's call; Intercept-Live draws the card empty) the patient's referrals, today the discharge workflow's, each with who receives it and Sent, Skipped or To send. None reads "No referrals for this patient." |
| **Family contact** | ⚠️ **Decision needed:** not in v1 scope; see [patient-details.md](patient-details.md), "1.4 Client ideas that touch this page" (PD-OD-14) |

- ✅ **Resolved:** the **Encounter** card holds the diagnosis, the problems, when and where from the patient was admitted (its date and time, then "from" where they came), the ICU day ("ICU day 3", the admission day being day 1) and the weight; ICU day and weight left the patient header for it ([patient-details.md](patient-details.md), "PD-010 — Identity").
- ⚠️ **Discrepancy:** the Overview has no care team card: the care team shows as avatars in the app header. Encounter status and a pending transfer aren't on the Encounter card.

## Care plan and activity

✅ **Resolved:** built (Nov 3, 2026, user's call): the page displays and tracks what was done and decided about the patient, so whoever opens it later, or the next shift, sees the plan in force and how it came about. It answers the scenario's "tracked on her record" (Demo Use Cases, Scenario 1, steps 3 to 6), and is the synthetic audit trail the requirements allow "as a design element, not a compliance system" (CC-09). ⚠️ **Decision needed:** requirement IDs; Cowork owns the PD- range, so these parts are unnumbered until it adds them. Related: DU-22 (keep or transfer), DU-23 (order sets and the co-sign route), DU-24 (AI-drafted notes), PD-133 (audit).

| Part | Where | What it shows |
|---|---|---|
| **Care plan** | Overview card | ℹ️ Moved to [care-plan.md](care-plan.md) ("CPL-040 — The Overview's Care plan card"): its rows, its four-row cap, **View all · n** and its sources. |
| **Activity** | The Timeline (✅ **Resolved:** Nov 9, 2026, user's call: the Overview's log is gone) | Every action and decision with who and when, newest first: the alert fired, acknowledged, escalated or resolved; the video consult started and ended, with how long it lasted; the consult note approved; the pathway sent, co-signed or declined; keep or transfer decided or taken back; the checkpoints; Transfer avoided. ✅ **Resolved:** since Nov 6, 2026 (Intercept-Live `149:4464`): the log shows the last 24 h, what's new since the clinician last looked shaded (PD-023), with **Open Timeline** |
| **Pathway panel** | ~~The Care Plan tab's **View full plan** (the Overview's Care plan too, until Nov 13, 2026),~~ ✅ **Resolved:** a pathway's **Review pathway** / **Open pathway** in the Care Plan tab, on that alert's pathway, a resolved alert's whole card in the Alerts panel (opens beside it), the Fall risk flag's **View fall prevention pathway**, and a notice's **Review referrals** (opens the page with the panel at the referrals). ~~**Decision (Nov 10, 2026, user's call):** the only place a pathway is reviewed and decided: the alert panel has no pathway.~~ ✅ **Resolved:** (Nov 11, 2026, user's call: the demo's four scenarios need it) the alert panel has its pathway again (**Pathway** on its score line, PRD Alert maximized modal); this panel shows the same pathway in the same state, open or closed, both ways. Without the consult panels, the Care plan's way to the pathway opens the alert. The Alerts panel's **View pathway** link stays gone (Nov 10, 2026). ✅ **Resolved:** (Nov 10, 2026, user's call) the Fall risk flag's popover (here, on the Monitoring and Census cards) has **View fall prevention pathway**, a button at its bottom, when the patient has one (a bed sensor alert suggests it); on a card it opens the patient's page with the panel on that pathway, here the panel itself. | ✅ **Resolved:** (Nov 9, 2026, user's call) the app header no longer has **Pathway**: a pathway is suggested by an alert, reviewed and decided by the clinician, then becomes part of the care plan, so it belongs to the alert, not to the patient. The page reaches it through the alert's suggestion in the Care plan; the alert modal keeps its Pathway button. ✅ **Resolved:** built (Nov 6, 2026, user's call: a side panel, not a tab): the alert panel's Pathway column, right of the page in Messages' place (one at a time, as on the alert): review, edit a dose, add a note, accept or decline, write your own; then the bundle, the DKA protocol, the bedside tasks, keep or transfer and discharge, as on the alert. Work in progress (a dose being edited, a note, a decline's reason) and whether it's open carry over between the alert and the page, both ways. With more than one alert's pathway, a select picks the alert. A reopened alert shows the decline's reason, the edited doses, the note and the sent and co-signed times. ⚠️ **Gap (Figma):** neither the panel nor the header's Pathway button is drawn; Figma's Pathways tab is superseded |
| **Up next** | Overview card, beside the Care plan | What's due in the next 12 h, soonest first: scheduled medications, checkpoints not yet recorded, order recommendations with a due time, and the pathway's open bundle elements, DKA checks (those due or overdue, then the next) and open bedside tasks, each with how soon (Overdue, within the hour, later) |
| **Timeline** | Events lane | The activity as events beside the vitals: alerts as alerts, notes as notes, the rest as care events. The axis ends at the newest data when it's newer than the clock's last minute |
| **Orders** | Recommendations › Addressed, and Active orders | The pathway as a **Care pathway** recommendation: accepted by the intensivist (with the edited dose), sent for signature, then signed by the local physician (OE-03, OE-04); once co-signed, its orders are Active, ordered by the intensivist and co-signed by the local physician |
| **Notes** | First in the list | The consult note the clinician approved from the AI Notetaker: a draft for signature (CD-05) |
| **At the resolution** | Brief, early warning score, oxygen, vitals, Timeline | Scenario 1 at 06:00: stable on 2 L, RR 20, SpO₂ 95%, HR 88, NEWS2 3 (Low) |

- ⚠️ **Naming conflict:** the alert panel calls the AI that drafts the consult note the **AI Notetaker**; Notes marks AI drafts **AI Scribe** (PD-073, PRD Bedside camera). Pick one name.
- ⚠️ **Gap:** the prototype's night passes in seconds, so the night's activity bunches at the right edge of a 6 h Timeline; the table view lists it.
- ⚠️ **Gap:** an order the pathway replaces isn't discontinued: Furosemide IV 120 mg is Active beside the earlier furosemide order.
- ℹ️ In the prototype the activity, the plan, the orders and the note come from the decisions taken in the alert (the live feed); the app gets them from Clinical Alerting, Order Entry and Clinical Documentation, with the audit trail (PD-133).

## Making it actionable

The page-wide rules (act where you read, every action reaches the app, by role: PD-160 to PD-162) are in [patient-details.md](patient-details.md), "3.2.1 Tab review: what each tab lets the clinician do".

**PD-163 — Overview.** ⚠️ Not built.

- **Today:** the brief opens Ask Intercept Live; View all links open Medications, Care Plan and Orders; a key lab tile opens its trend on the Labs tab; the rest is read-only.
- **Made actionable (proposed):** **Up next**: Mark done, and each item opens what it is (a dose in Medications, a checkpoint in Care Plan, a task in its pathway). ~~A clinical finding opens its row in Labs;~~ ✅ **Resolved:** a key lab opens its trend on the Labs tab (PD-025). A Critical one has **Acknowledge**. Oxygen and infusions' View all opens the Timeline's Pump lanes, where the rates are (it opens Medications today). A referral opens Discharge.

## States

| State | What shows | What the clinician can do |
|---|---|---|
| No AI summary | No banner; the clinical findings come first | Ask Intercept Live from the app header |
| Summary dismissed (×) | No banner until a newer summary or another patient | — |
| No labs or findings | "No labs resulted in the last 72 hours." (labs received, none recent) or "No lab data for this patient." | Open Labs |
| A finding charted too long ago | Its age in red in place of its context ("2 h old") | — |
| No monitor | "No live monitor data for this patient." | — |
| Nothing due | "Nothing scheduled in the next 12 hours." | — |
| Medications | "No scheduled medications." or, with no data, "No medication data for this patient." | View all opens Medications when the patient has any |
| Oxygen and infusions | "No ventilator or oxygen data for this patient.", "No infusions running." or "No pump data for this patient."; "No intake and output charted for this patient."; a missing rate reads "Rate unavailable" | — |
| Orders | "No active orders." or "No order data for this patient." | All orders |
| Encounter | "No diagnosis or encounter details yet." | — |
| Referrals | "No referrals for this patient." | — |
| Care plan | As [care-plan.md](care-plan.md), "CPL-040 — The Overview's Care plan card" | — |

Page states (loading, no access, feed down, offline) are the page's ([patient-details.md](patient-details.md), "PD-122 — Page states").

## Accessibility

The page's rules are in [patient-details.md](patient-details.md), "18. Accessibility". On the Overview:

- The brief is a region named "AI clinical summary"; the banner's button is named for what it does ("Close Ask Intercept Live" while the chat is open about the patient); × is "Dismiss summary".
- The clinical findings are a region named "Clinical findings", a list of tiles. A key lab that opens its trend is one button, named "{lab}, view trend"; a flag reads as a word, not only a letter or color ("High", "Critical").
- The live monitor is named for the patient ("Bedside monitor, Miller, Sarah").
- Each card is headed by its title; a View all link says what it counts ("View all 12 medications").
- Due chips say Overdue, In or Due now in words; color never carries them alone.

## Acceptance Criteria

| ID | Criterion |
|---|---|
| PDO-AC-01 | The Overview opens first, with the brief (when the patient has one), the clinical findings, then Live monitoring, Care plan, Up next, Medications, Oxygen and infusions, Recent orders, Encounter and Referrals; no alert cards, activity log or score breakdown. |
| PDO-AC-02 | Clicking the brief opens Ask Intercept Live about the patient and asks what's behind it; clicking it again while that chat is open closes the chat. × hides the brief until a newer one or another patient. |
| PDO-AC-03 | Each key lab tile shows its value, flag, result time and, with a previous numeric result, the change ("▲ +0.5 · Was 2.2 at 2:43 AM"), colored only when out of range. |
| PDO-AC-04 | Clicking a key lab Lab trends can chart opens the Labs tab with that lab's trend shown and in view; a lab it can't chart, and a finding that isn't a lab, isn't a button. |
| PDO-AC-05 | A finding charted longer ago than its limit shows its age in red in place of its context. |
| PDO-AC-06 | Up next lists what's due in the next 12 hours, soonest first, overdue items included, five before **View all**, each with Overdue / In … in words. |
| PDO-AC-07 | No card's list scrolls or cuts a row; a narrow card shows fewer rows, and its View all opens the rest (Medications, Orders, Care Plan) or expands Up next in place. |
| PDO-AC-08 | Every card with missing data says it's missing ("No pump data for this patient"), and only an empty list says there's none ("No infusions running."). |

ℹ️ Page-wide criteria (identity, freshness, AI labeling, roles, keyboard) are in [patient-details.md](patient-details.md), "20. Acceptance criteria".

## Open Questions

| ID | Question |
|---|---|
| PDO-OD-01 | 🙋 The AI summary: on by default or on request; AI ranking or a fixed rule it explains; frozen while read. (Exploration: B, AI-ranked, live.) (was PD-OD-05) |

- 🙋 Who picks each patient's clinical findings (the care plan, a rule per condition, or the clinician), and each one's staleness limit (PD-025).
- 🙋 The exact respiratory parameters on Oxygen and infusions (PRD OD-08, PD-022).
- 🙋 How "last viewed" is recorded per clinician (PD-OD-06, page-wide, in [patient-details.md](patient-details.md), "22. Open decisions").
- 🙋 Requirement IDs for the care plan and activity parts (Cowork owns the PD- range).
- 🙋 One name for the AI that drafts the consult note: AI Notetaker or AI Scribe.

## Out of scope

- The patient header, tabs, panels, entry points, freshness and page states: [patient-details.md](patient-details.md).
- The Care plan card's rows and the Care Plan tab: [care-plan.md](care-plan.md).
- The full timeline, its Previous and Now and the activity on its events lane: [patient-details-timeline.md](patient-details-timeline.md).
- Lab trends and the full results: [patient-details.md](patient-details.md), "Labs".
- The live monitor's lanes, numbers and alarms: [patient-monitor.md](patient-monitor.md).
- Ask Intercept Live's answers: [chat-composer.md](chat-composer.md).
