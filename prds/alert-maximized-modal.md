---
requirements: [AL-02, AL-03, AL-04, AL-07, AL-09, AL-11, SV-07, SV-10, CC-05, OE-02, BR-06, BR-07, WF-02]
status: proposed — confirm with Carlos
---

<!--
Created: Nov 2, 2026
Created by: Julio Caunedo
Last updated: Nov 9, 2026
Scope: The alert maximized modal of Intercept Live: one alert opened in full from a Monitoring card, an alert toast or a card's "…" menu, with its evidence, a one-click video consult to the bedside and a suggested care pathway.
Purpose: Defines the modal's structure, behavior, states, data and acceptance criteria, so the build (`src/layouts/intercept-live/alert-panel/`) and the Figma design (intercept.ds `alert-modal`) can be checked against one source.
-->

# PRD — Alert maximized modal

**Product:** Intercept Live — Virtual Care OS  
**Module:** Clinical Alerting & Events (Spec §5.6), opened from Tele-Critical Care Clinical Surveillance (Spec §5.2)  
**Name:** the **alert maximized modal**, "the alert modal" for short. Code: `AlertPanel` / `AlertPanelDialog` (the alert panel; the three-column `AlertDetailModal` was removed Nov 9, 2026). Figma: intercept.ds › `alert-modal`  
**Surface:** a modal over the Monitoring and Census pages, and over a patient's details  
**Version:** 0.1  
**Status:** Draft — pending clinical and product validation  
**Last updated:** November 9, 2026

---

## 1. Overview

An alert is first seen small: a card's alert bar, a toast, a row in the triage queue. The alert maximized modal opens one alert in full, over the page the clinician is on, so they can understand it and act on it without leaving that page.

✅ **Replaced (Nov 3, 2026, user's call):** the modal now opens as the **alert panel** (intercept.ds `alert-modal`, UCL AlertModal): the Patient column alone, 600px, with **Video consult**, **Messages** and **Pathway** under the alert (✅ Nov 5, 2026: Messages added, View pathway renamed Pathway; Messages and Pathway share the third column, one at a time, PRD Messages). ✅ **Decision (Nov 9, 2026, user's call; intercept.ds `alert-modal` `1353:14304`):** the row under the alert is gone: **Video consult** and **Messages** are icon buttons right of the patient's name, before the × (dark while closed; while open, outlined with the "off" icon, named Close video consult / Close messages, as in the app header; Close video consult ends the call), and **Pathway** is in the alert's button row, in Resolve's place (AMM-004). The patient consult with no alert keeps Pathway in the header, after Messages, and names the call's button End call there, since its Video consult panel stays. Each opens a 432px panel that slides out on the right, the pathway's to the right of the call's: the call with the **AI Notetaker** under it (step 3: once the others on the call approve its request, it captures the consultation, prepares the notes and offers an AI draft for the clinician to review, edit and approve), and the care pathway with keep or transfer (steps 4 and 5). The pathway's decision sticks to the bottom of its panel. ✅ **Resolved (Nov 3, 2026, user's calls):** the history and labs aren't in the panel, so step 3's home meds, echo, creatinine and BNP come from Ask Intercept Live's answer about the patient (AMM-012), and the key clinical findings are the alert's flag, first in the panel's tag row (AMM-011). On a screen too narrow for both panels, the panels and then the alert column narrow, so the patient's name never runs off the screen. The three columns below describe the modal it replaced; AMM-011, AMM-012, AMM-013 and AMM-AC-08 say what changed.

✅ **Decision (Nov 9, 2026, user's call):** the three-column modal is gone from the code too. `AlertDetailModal` and its stories were removed, and its folder is now `src/layouts/intercept-live/alert-panel/` (Storybook: Layouts › Intercept Live › Alert panel). Nothing changes for the user: the app has opened the alert panel since Nov 3. Where this PRD still describes three columns (§4 Frame and Column labels, the Clinical info column, the call floating over it), it describes the replaced modal; the panel's behavior is in the ✅ notes.

It answers three questions, one column each:

| Column | Question | What it holds |
|---|---|---|
| **Patient** | What is happening, to whom? | The patient, the alert and its lifecycle actions, the score, the live monitor, the patient's tags |
| **Clinical info** | Why does it matter for this patient? | The key clinical findings behind the alert, and the history and labs the intensivist needs; the video consult floats here while it's on |
| **Pathway** | What do we do about it? | A suggested care pathway: an order set the intensivist reviews, edits and accepts or declines; then, where the hospital may not be able to hold the patient, keep or transfer |

It is Scenario 1's steps 2 to 5 in one place (Demo Use Cases, Margaret Hayes at 01:40): what fired and why (step 2), a one-click consult to the bedside with the history and labs (step 3), the pathway sent for local co-signature (step 4), and the decision to keep her at Chadron with checkpoints (step 5).

The modal is not the patient's chart. It shows what this alert needs; the patient's **name** goes to the full record (PRD Patient details).

### 1.1 Product objectives

| Objective | What it means in the modal |
|---|---|
| **Understand in one look** | The reason line leads, with the score, the live monitor and the findings beside it; nothing needs another click to read. |
| **Act without switching** | Acknowledge, escalate, resolve, call the bedside and accept a pathway, all from the modal. |
| **One click to the bedside** | The video consult starts from one button, or straight from a card's "…" menu, already ringing. |
| **Recommendations, never orders** | The pathway is a suggestion with its evidence; nothing is ordered until the intensivist accepts and the local physician co-signs (BR-06, BR-07). |
| **Honest state** | Who did what, and when, is always on screen ("Acknowledged by you · 1:42 AM · 12 min ago", "Resolved by Ashley Bell, RN · 8:14 PM · 3 min ago · Treated"). |

### 1.2 Source documents

1. Intercept Live — Virtual Care OS System Specification, May 2026 (`documents/Intercept Live - Virtual Care OS - System Specifications.md`), §5.2, §5.3, §5.6.
2. Requirements specification snapshot (`documents/specs/requirements-specification.md`): AL-02, AL-03, AL-04, AL-07, AL-09, AL-11, SV-07, SV-10, CC-05, OE-02, BR-06, BR-07, WF-02.
3. Design update spec snapshot (`documents/specs/design-update-spec.md`): DU-09 (one ranked work list), DU-12 (one alert per condition), DU-13 (alert detail and lifecycle), DU-14 (NEWS2-style score), DU-22 (keep or transfer).
4. InterceptLIVE Demo Use Cases, Scenario 1 (`documents/scenarios/`).
5. PRD — Monitoring (`prds/monitoring.md`) and PRD — Patient card (`prds/patient-card.md`): the alert bar, the triage queue and its forms.
6. Figma: intercept.ds › Alert Modal page, `alert-modal` (`1321:10102`), the video reference (`1337:12288`), `alert-modal-video`, `care-pathway`.
7. Exploration: Alert modal in Storybook (`Layouts/Intercept Live/Alert panel`), listed in `explorations/index.md`.

---

## 2. Users and use cases

| User | Use case |
|---|---|
| **Intercept intensivist** (remote, covering several hospitals) | Sees a Critical alert, opens it, understands why the patient is first, calls the bedside and accepts a pathway (Scenario 1, steps 2–4). |
| **Intercept APP** | Opens an alert, acknowledges it, escalates it to the intensivist with a note. |
| **Intercept RN** | Opens a resolved alert from its toast to see who resolved it and why. |
| **Bedside nurse** (receives the call) | Joins the video consult from the room; not a user of the modal itself. |
| **Local physician** (co-signer) | Receives the accepted orders for co-signature; not a user of the modal itself. |

---

## 3. Where it opens

| Entry point | Opens | Notes |
|---|---|---|
| A Monitoring card's alert bar (`AlertBar`) | The patient's alert the bar shows: their highest-priority open alert, else their latest | Every alert, every severity, Resolved and message bars too |
| An alert toast's header row | That toast's alert | The whole header (pill, change, time) is one button; a resolved alert's toast opens it too, shown resolved |
| Any patient card's "…" menu (Census and Monitoring) › **Video consult** | The patient's latest alert, with the call to the bedside already ringing. With no active alert, the modal without an alert (Nov 4, 2026, user's call; PRD Bedside camera CAM-012) | On every card, right after Ask Intercept Live (Nov 3, 2026, user's call); step 3's one click. ⚠️ **Gap:** the call lives only in the alert modal, so for a patient with no alert to open, Video consult opens their page with no call; the patient's page has no consult yet. |
| A Monitoring card's "…" menu › **View alert** (**View alerts** with several) | The alert the card's bar shows | While the card shows an alert, Resolved and messages too; after Video consult (Nov 3, 2026, user's call) |
| An alert with no detail | The patient's details instead | ℹ️ Fallback while not every alert has modal data |

✅ **Resolved (Nov 2, 2026):** the Census card no longer shows an alert badge, so it isn't an entry point; the Census List and the triage queue aren't either yet. ⚠️ **Decision needed:** should a triage queue row open the modal?

---

## 4. Layout

| Part | Behavior |
|---|---|
| **Frame** | UCL's Dialog: 1400px wide, three columns (Patient flexible at 600px; Clinical info 400px; Pathway 400px), each scrolling on its own. Below about 1432px of screen the Patient column narrows. When it grows tall it keeps 80px from the viewport's top and bottom edges. |
| **Close** | A ghost × at the Patient column's top right; Escape; a click on the scrim. Escape first closes an open form or dose edit, then the modal. |
| **Column labels** | "Clinical info" and "Pathway", small uppercase labels that name each column's region for screen readers. |
| **Footer** | ✅ **Gone (Nov 3, 2026, user's call; intercept.ds `alert-modal`):** the patient's **name** opens their page (underlined, with ↗; it replaced Open patient), and **Video consult** and **View pathway** sit under the alert, equal widths. View pathway takes the clinician, and focus, to the Pathway column. While the call is on, Video consult reads **End call**. The lifecycle buttons are filled (Button `neutral`). ⚠️ **Decision needed:** Figma reads **End video consult**. |
| **Toasts** | Hidden while the modal is open, back when it closes; new ones wait. |

---

## 5. Requirements

| ID | Requirement | Detail |
|---|---|---|
| AMM-001 | **Open from the alert surfaces** | The entry points in §3 open the modal over the current page, for the alert they show. |
| AMM-002 | **Patient identity** | Avatar (photo or initials in the patient's color), name, sex and age, MRN, and hospital · unit · bed. |
| AMM-003 | **The alert** | The alert bar (severity, how many alerts in the last 24 h, how long ago), the reason line as the title, the alert's own title under it, and its source ("Source: Rule · Deterioration score", with the source icon) (AL-04, AL-09). |
| AMM-004 | **Lifecycle actions** | As the triage queue: **Acknowledge** while the alert is active; **Escalate** unless it's escalated, with somewhere to escalate to; **Resolve** while it's open, its form sent with **Mark as resolved** (✅ Nov 3, 2026, user's call; the button read Mark as resolved and the form Resolve alert). ✅ **Decision (Nov 9, 2026, user's call; intercept.ds `alert-modal` `1353:14304`):** Resolve is no longer a button in the row: it's a green link under it, **Mark this alert as resolved** (underlined on hover), opening the same form; **Pathway** takes its place in the row (Acknowledge · Escalate · Pathway), since the pathway belongs to the alert. The same on the patient page's Alerts panel; and **Feedback** for an AI recommendation, a link on the source line (✅ Nov 3, 2026, user's call) (AL-03, DU-13). ✅ **Copy (Nov 2, 2026, user's call):** **Feedback** replaces AI is wrong, which had replaced Decline (picked over "It's wrong" and "AI was wrong"); Improve AI was tried in between. It shows only on AI recommendations, so it reads as feedback on the AI, not as turning the alert down or a verdict on it. |
| AMM-005 | **Acknowledge in place** | One click. The modal stays open; the button confirms in place (a check, "Acknowledged") and stays where it was. Clicking it again undoes the clinician's own acknowledgment. ✅ **Decision (Nov 9, 2026, user's call):** where the button is too narrow for the word (the patient page's Alerts panel), it reads **Ack** for the action and **Ack'd** once acknowledged; screen readers still hear "Acknowledge" / "Acknowledged". Where there's room, the full words stay. |
| AMM-006 | **Escalate** | Opens a form under the buttons: who to send it to (the escalation list) and an optional note. Sending closes the modal; the alert travels with the escalation (SV-10). |
| AMM-007 | **Resolve, or Feedback** | Opens a form: the resolution (Treated, Artifact or false alarm, Expected for this patient, Duplicate) and an optional note; for Feedback, "What did it get wrong? (optional)" and **Send feedback** (AL-03, BR-07). Sending closes the modal. |
| AMM-008 | **Who did what** | Under the source, once addressed: "Acknowledged by you · time", "Escalated to … by you · time", "Resolved by … · time · reason". Someone other than the clinician is named. Each time also says how long ago, updated each minute ("Raised by ED consult request · 1:09 PM · 12 min ago"; Nov 4, 2026). A note left with the action shows under it ("Note: BiPAP started, SpO₂ back to 94%."). Announced to screen readers. |
| AMM-009 | **Resolved alerts** | A resolved alert opens too: the green Resolved bar with when it resolved, no lifecycle actions, the alert panel in the Resolved bar's green with neutral text (no severity colors), and who resolved it. |
| AMM-010 | **Score, monitor, tags** | The patient's NEWS2-style score with its 24 h change (DU-14), between two rules as on their card, their live bedside monitor, and their tags as on their card. |
| AMM-011 | **Key clinical findings** | Each phrase of the reason line with the numbers behind it. Without a reason line, the alert's evidence and recommendation. With nothing, "No key findings for this alert." ✅ **In the alert panel (Nov 3, 2026, user's calls):** a flag, first in the tag row, named for what the alert says ("CHF exacerbation", "Sepsis candidate"; not the condition, since a flag reads as a fact about the patient and the AI may be wrong). Clicking it opens the findings, one per line, under the alert's recommendation, with the alert's source and when it fired. Only while the alert is open; without findings, no flag. The patient's Monitoring card shows it too, first in its flags (✅ Nov 3, 2026, user's call); not the Census card, which shows no alerts, the patient's page or Filters. |
| AMM-012 | **History and labs** | What the consult needs: home meds, last echo, trending labs, each value colored by how much it matters now (critical, or abnormal but known). With nothing, "No history or labs on file for this patient." ✅ **Not in the alert panel (Nov 3, 2026, user's call):** the AI Notetaker fills the Video consult panel under the call; Ask Intercept Live's answer about the patient has the history and labs. |
| AMM-013 | **One-click video consult** | **Video consult** rings the patient's bedside nurse ("Calling Kayla Brandt…"), then opens the room's camera ("Kayla Brandt, RN" on the video (no "joined" since Nov 5, 2026), Live with a running time, Mute, End). The call floats over the bottom of Clinical info; the findings scroll under it (in the alert panel: a Video consult panel slides out beside the alert, the call over the AI Notetaker). **End call** (the button under the alert) or End (on the call) ends it (SV-07, CC-05). The camera session itself is PRD Bedside camera (CAM-007). |
| AMM-014 | **Suggested pathway** | Every alert suggests a pathway for its kind (e.g. the CHF exacerbation pathway, the hour-1 sepsis bundle), with its source protocol and each order's evidence. Without one, "No care pathway suggested for this alert." |
| AMM-015 | **Edit, accept, decline** | Each dose can be edited inline (an edited dose is marked, the suggestion struck through beside it). **Accept** sends the orders to the local physician for co-signature; once co-signed they're active and the bedside team carries them out. **Decline** asks why (required). **Add note**, under the orders, opens an optional note for the co-signer ("Note for Dr. Tom Weller"), sent with the orders and shown as "Note: …" under Awaiting co-signature and Active. Nothing becomes an order on its own (BR-06, OE-02). |
| AMM-016 | **Tiers** | A Critical alert's toast interrupts (AL-02); the modal itself doesn't change by tier beyond its colors. One alert per condition (AL-11): a repeat updates the alert the modal shows. |
| AMM-017 | **Accessibility** | A modal dialog named by the reason line; focus moves in and is trapped, and returns to the trigger on close. Toggle and expanding buttons say their state (`aria-pressed`, `aria-expanded`). Every color-coded value also has words. |
| AMM-018 | **Motion** | The modal fades and rises in; forms and the pathway's parts open in place; the call and the state line fade and rise in; a confirmed Acknowledge bumps once. Fades only under reduced motion (MOTION.md). |
| AMM-019 | **Toasts wait** | While the modal is open, the alert toasts are hidden and paused, and come back when it closes (as on a patient's page and with the live feed open). |
| AMM-020 | **Own pathway** | After declining, **Create your own pathway** opens a form in place of the declined order set: the pathway's name, then each order's name, dose or settings, and an optional target or condition; **Add order** adds one, × removes one, a blank one is left out. **Send for co-signature** (enabled once the name and every order's name and dose are filled) sends it to the same co-signer as the suggestion; it then shows in the suggestion's place, titled with its name, "Source: Created by you · Declined suggestion: …", awaiting co-signature, then active. Cancel or Escape closes the form and keeps what was typed. ✅ **Decision (Nov 3, 2026, user's call).** |
| AMM-021 | **Undo decline** | Once declined, **Undo decline** puts the suggestion back as it was (Suggested; Decline and Accept again; a second Decline asks why again, the first reason prefilled). It's there until the intensivist sends their own pathway. ✅ **Decision (Nov 3, 2026, user's call).** |
| AMM-022 | **Keep or transfer** | For an alert that carries one (Scenario 1, step 5; DU-22), **Keep or transfer** opens under the pathway once its orders are sent (awaiting co-signature or active), or at once when a decision was already made. It sets **what the plan needs** (BiPAP, respiratory therapist, hourly vitals, nurse capacity) against what the hospital has tonight, each covered, limited or not available (an icon and words), and, **if transferred**, the receiving hospitals (bed, distance; one that can't take the patient is dimmed) and the transport (ground, air, with times). Source line: the hospital tonight and the regional transfer center. The platform doesn't pick one. ✅ **Placement (Nov 3, 2026, user's call):** the Pathway column, under the pathway. |
| AMM-023 | **Decide, with a reason** | **Keep at {hospital}** shows the checkpoints it sets and asks why (required). **Transfer** asks for the receiving hospital and the transport (radio choices; the first available picked) and why (required), then **Request transfer**: "Transfer requested to … , by air · time", and the transfer center confirms the bed and the crew. **Change decision** takes either back. Escape closes an open form before the modal. |
| AMM-024 | **Checkpoints** | Keeping sets checkpoints at 1 h and 4 h, each with what has to hold by then (from the pathway's targets) and its due time; once due, Passed or Missed with the readings behind it. A missed checkpoint raises a High alert (requirements spec, keep-or-transfer checkpoints) and the panel says so. |
| AMM-025 | **Transfer avoided** | Kept, with every checkpoint passed, the panel logs **Transfer avoided**: the trip the family didn't make, the estimated transfer cost avoided (a placeholder until sourced) and the ICU-level care delivered at the hospital (Scenario 1, step 6; its metrics). |
| AMM-026 | **Social needs at discharge** | For a patient the discharge workflow has flagged (Scenario 2, step 6), **Social needs at discharge** opens under keep or transfer: the needs it found in the chart ("Uninsured", "Can't afford home oxygen"), each with what's behind it and where from, the payer on record, and a drafted referral for each need (Medicaid eligibility screening; pulmonary rehab closer to home). The same panel is the patient's page's **Discharge** section; a decision in one shows in the other. The flags join the patient's card. |
| AMM-027 | **Send with consent, or skip with a reason** | Nothing goes out on its own (PD-061). Each referral is sent once someone says **who agreed**: the patient, a family member (optionally named) or consent already on file (Nov 4, 2026, user's call: an ICU patient may not be able to agree). **Skip** asks why (required) and can be undone. Each is logged in the patient's activity with who agreed. |

---

## 6. States

| State | Alert panel | Actions | State line |
|---|---|---|---|
| **New** (active) | Severity colors | Acknowledge · Escalate · Pathway, then the Mark this alert as resolved link | — |
| **Acknowledged** | Severity colors | Acknowledged (pressed; click to undo) · Escalate · Pathway, then the link | "✓ Acknowledged by you · 1:42 AM" |
| **Escalated** | Severity colors | Pathway, then the link | "Escalated to James Turner by you · 1:44 AM" |
| **Resolved** | Green, as its Resolved bar; neutral text | None | "Resolved by Ashley Bell, RN · 8:14 PM · Treated" |
| **Marked AI wrong** (AI recommendation) | Severity colors | None | "Marked AI wrong by you · 1:45 AM" |
| **Consult: calling** | — | Footer: "Calling…" (disabled) | The call shows the nurse ringing |
| **Consult: live** | — | Footer: **End call** (flat destructive) | The room's camera, Live with its time |
| **Pathway: suggested / awaiting co-signature / active / declined** | — | Decline · Accept while suggested; Undo decline · Create your own pathway once declined | Status badge and line in the Pathway column |
| **Own pathway: writing / awaiting co-signature / active** | The suggestion was declined | Cancel · Send for co-signature while writing | The form in place of the order set; once sent, the clinician's pathway with its status |
| **Keep or transfer: to decide / keep / transfer requested** | — | Transfer · Keep at {hospital}; then each form's Cancel · Keep / Request transfer; Change decision once decided | Badge "To decide", "Keep at Chadron" or "Transfer requested"; the decision with its reason and time, then the checkpoints (keep) |
| **Checkpoint missed / transfer avoided** | — | Change decision (missed); none (avoided) | "A checkpoint was missed, so a High alert was raised"; or the Transfer avoided panel |
| **Social needs: to send / sent / skipped** | — | Who agreed? (The patient · Family · On file), Skip · Send referral (disabled until picked); Skip's Cancel · Skip referral; Undo skip | "Sent to {to} · time" with "Consent: …"; "Skipped: reason"; the badge counts what's left ("2 to send", then Done) |

---

## 7. Data

The app's API fills one record per alert (`AlertDetailData`); the prototype builds them from sample data.

| Field | What it is |
|---|---|
| `alert` | The alert: severity, title, reason line, source, evidence, recommendation, status, `addressed` (when, by whom, to whom, reason, note) |
| `patient` | Name, photo or initials and color, sex, age, MRN, hospital, unit, bed |
| `inLast24h` | How many alerts the patient had in the last 24 h |
| `acuity`, `trajectory` | The score and its 24 h change, as on the patient's card |
| `monitor` | The live monitor's vitals, alarm limits and priorities |
| `tags` | The patient's tags, as on their card |
| `reasons` | The reason line, phrase by phrase, with its numbers |
| `history` | History and labs: a label, a value, a detail, a severity, or a list (home meds) |
| `bedside` | Who the consult calls: the bedside nurse, their presence and where they are |
| `room` | The room's equipment, for the drawn camera feed |
| `video` | The room's camera as a video URL. The prototype loops an AI-generated clip (fictional people, never a real patient), graded like a bedside camera; without one, or if it can't load, the room is drawn |
| `pathway` | The suggested pathway: title, source protocol, orders (name, dose, target, evidence), co-signer |
| `pathwayStatus` | Where the pathway is when the modal opens (suggested by default) |
| `transfer` | Keep or transfer: the hospital's short name, source, needs (label, what's available, covered / limited / not available), receiving hospitals (name, place and distance, bed, accepting), transport (label, status and time, available), checkpoints (minutes after, criteria, result and readings), the decision already made (keep or transfer, reason, time, receiving hospital and transport) and the outcome (distance, cost, ICU-level care hours) |
| `discharge` | Social needs at discharge: the source, the needs (label, detail, evidence), the payer, the referrals (title, to whom, detail, the needs it answers, another reason), and what was decided on each (sent with who agreed, or skipped with why, and when) |

---

## 8. Acceptance criteria

| ID | Given | When | Then |
|---|---|---|---|
| AMM-AC-01 | Hayes's Critical alert is in the feed | The clinician clicks her card's alert bar | The modal opens titled "Rising work of breathing, positive fluid balance, HFrEF", with her NEWS2 10, monitor, findings, history and labs, and the CHF exacerbation pathway |
| AMM-AC-02 | An alert toast is on screen | The clinician clicks anywhere in its header (pill, time or icon) | The modal opens for that alert |
| AMM-AC-03 | The modal is open | The clinician clicks Acknowledge | The modal stays open, the button reads Acknowledged, and "Acknowledged by you · time" appears under the source |
| AMM-AC-04 | The alert is acknowledged by the clinician | They click Acknowledged | The alert is active again, the button reads Acknowledge, and the state line goes away |
| AMM-AC-05 | The modal is open | The clinician opens Mark this alert as resolved, picks Treated and sends (Mark as resolved) | The alert is resolved with that reason, and the modal closes |
| AMM-AC-06 | A form is open | The clinician presses Escape | The form closes and the modal stays open |
| AMM-AC-07 | A resolved alert's toast | The clinician clicks it | The modal opens with the green Resolved bar, a neutral panel, no actions and "Resolved by … · time · reason" |
| AMM-AC-08 | The modal is open | The clinician clicks Video consult | "Calling Kayla Brandt…", then "Kayla Brandt, RN" on the video (no "joined" since Nov 5, 2026) with the room's camera over the bottom of Clinical info (in the alert panel: in the Video consult panel, beside the alert); the button reads End call |
| AMM-AC-09 | Hayes's card "…" menu | The clinician picks Video consult | The modal opens with the call already ringing |
| AMM-AC-10 | The CHF pathway is suggested | The intensivist edits the furosemide dose and accepts | The dose is marked Edited, the orders go to Dr. Tom Weller for co-signature, then show Active |
| AMM-AC-11 | An alert with no findings or history | The modal opens | Both sections show, each with its empty line |
| AMM-AC-12 | Toasts are on screen | The modal opens, then closes | The toasts fade out while it's open and come back after |
| AMM-AC-13 | A short viewport | The modal's content is taller than the screen | The modal keeps 80px from the top and bottom, and each column scrolls |
| AMM-AC-14 | The CHF pathway was declined | The intensivist creates their own pathway with a name and two orders and sends it | The pathway shows under its name, "Created by you", goes to Dr. Tom Weller for co-signature, then shows Active |
| AMM-AC-15 | The CHF pathway was declined | The intensivist clicks Undo decline | The pathway is Suggested again, with Decline and Accept |
| AMM-AC-16 | Hayes's CHF pathway is suggested | The intensivist accepts and sends it | Keep or transfer opens under it, "To decide", with Chadron's needs, the receiving hospitals and the transport |
| AMM-AC-17 | Keep or transfer is open | The intensivist picks Keep at Chadron, writes why and confirms | "Keeping at Chadron · time" with the reason, and the 1 h and 4 h checkpoints with their due times |
| AMM-AC-18 | Keep or transfer is open | The intensivist picks Transfer, Regional West, Air, writes why and requests it | "Transfer requested to Regional West Medical Center, by air · time" |
| AMM-AC-19 | Hayes was kept and both checkpoints passed | The modal opens | Both checkpoints read Passed with their readings, and Transfer avoided shows the distance, the cost and the care hours |
| AMM-AC-20 | Hayes was kept and the 1 h checkpoint was missed | The modal opens | The checkpoint reads Missed with its readings, the panel says a High alert was raised, and Change decision is there |
| AMM-AC-21 | Reynolds was kept and step 6 played | The modal's Pathway panel opens | Social needs at discharge sits under keep or transfer, "2 to send", with Uninsured, Can't afford home oxygen, "Payer on record: Uninsured" and the two referrals, each with Send referral disabled until who agreed is picked |
| AMM-AC-22 | A referral is open | The clinician picks Family, names "his daughter, Amy Reynolds" and sends it | "Sent to Alliance financial counseling · time", "Consent: family (his daughter, Amy Reynolds)"; his activity log and his page's Discharge section show it sent |
| AMM-AC-23 | A referral is open | The clinician skips it with a reason, then undoes the skip | "Skipped: reason" with Undo skip; undone, it's back to send and the badge counts it again |

---

## 9. Open decisions

| Topic | Decision needed |
|---|---|
| ⚠️ **Section titles** | Keep "Key clinical findings" and "History and labs", or use SBAR (Assessment, Background), or "Why it fired" and "Relevant history". |
| ⚠️ **Pathway clinical review** | Every reference protocol's orders and doses need clinical review; whether low-acuity alerts (probe off, vitals overdue) should suggest orders at all. |
| ⚠️ **Per-order decline** | Decline the whole pathway only, or each order. |
| ⚠️ **Own pathway: start point** | The form starts empty. Whether it should start from the declined suggestion's orders to edit, offer order sets from the hospital's protocols, or suggest orders as they're typed; and whether a note for the co-signer goes with it, as with an accepted pathway. |
| ⚠️ **Resolved alerts' pathway** | A resolved alert still shows its pathway as Suggested; hide it, or show it read-only. |
| ⚠️ **Who the consult calls** | Always the bedside nurse, or a choice (charge nurse, local physician). |
| ⚠️ **Escalate and resolve close the modal** | Keep closing it, or keep it open as Acknowledge does. |
| ⚠️ **Triage queue undo** | The queue's rows can't undo an acknowledgment yet; add the same toggle. |
| ⚠️ **Button variant** | End call uses a flat destructive look set in the modal; add it to Button as a variant (minor version). |
| ⚠️ **Keep or transfer: suggest one?** | The platform lays out the facts and doesn't pick keep or transfer (Spec §8.7: the AI doesn't recommend). Whether a rule (every need covered, transport over 90 min) should mark one as suggested, as the pathway is. |
| ⚠️ **Keep or transfer: data** | Needs, capacities, transport times and the second receiving hospital (Rapid City) are illustrative; the checkpoint criteria need clinical review. Where the transport and bed status come from (a transfer center feed, or entered by hand). |
| ⚠️ **Missed checkpoint** | The panel says a High alert was raised; the prototype doesn't raise it yet. Whether a missed checkpoint reopens the decision on its own or waits for Change decision. |
| ⚠️ **Social needs: who sends** | The prototype has the hub clinician send the referrals, as the scenario's discharge workflow "generates" them. Whether Alliance's case manager or social worker sends them instead, with the hub only seeing them. |
| ⚠️ **Social needs: data** | The needs, programs and wording are illustrative ("Alliance financial counseling", "Alliance outpatient pulmonary rehab"); a case manager should review them. Whether a sent referral shows the receiver accepting it. |
| ⚠️ **Component or layout** | The alert panel is a layout (`AlertPanel`) wrapping UCL's AlertModal; the interactions it adds (lifecycle, consult, pathway) stay in the layout until these decisions settle. ✅ **Resolved (Nov 9, 2026):** the three-column modal won't be promoted; its code was removed. |
| ⚠️ **Scenario data** | Hayes's creatinine trend has two points. ✅ **Resolved (Nov 3, 2026):** Chadron's records say Meditech, as the scenario does. |
| ⚠️ **ID prefix** | `AMM-` and `AMM-AC-` are new repo-local IDs, to confirm with the team. |

---

## 10. Design and code

| What | Where |
|---|---|
| Figma | intercept.ds › Alert Modal page: `alert-modal` (`1321:10102`), the video reference (`1337:12288`), `alert-modal-video`, `care-pathway` |
| Alert panel | `src/layouts/intercept-live/alert-panel/alert-panel.tsx` (`AlertPanel`, `AlertPanelDialog`, `alertPanelRenderer`); UCL `overlays/alert-modal` |
| Pathway | `src/layouts/intercept-live/alert-panel/care-pathway.tsx` |
| Keep or transfer | `src/layouts/intercept-live/alert-panel/keep-or-transfer.tsx` (`KeepOrTransferPanel`) |
| Social needs at discharge | `src/layouts/intercept-live/alert-panel/discharge-plan.tsx` (`DischargePlanPanel`); Reynolds's in `sample-data/sample-scenario-2.ts` |
| Sample data | `src/layouts/intercept-live/alert-panel/sample-alert-panel.ts` (Hayes's Scenario 1 detail; a detail and a pathway for every feed alert) |
| Forms | `src/layouts/intercept-live/monitoring/triage-queue.tsx` (`EscalateForm`, `ResolveForm`, `stateLine`) |
| Decisions | DESIGN.md › "Alert panel" |
| Stories | Storybook › Layouts/Intercept Live/Alert panel (Social Needs At Discharge too); Monitoring › Scenario 1: Heart failure |
