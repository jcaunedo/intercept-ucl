<!--
Created: Oct 28, 2026
Created by: Julio Caunedo
Last updated: Oct 28, 2026
Scope: The Patient details page of Intercept Live (the patient chart, Spec §5.1 "patient detail view") inside the Provider Desktop: header, alerts, physiology, timeline, labs, medications, orders, notes, sepsis, camera, communication, Ask, handoff.
Purpose: Defines proposed page structure, behavior, states and acceptance criteria for the Patient details page, pending clinical and product validation and the Spec §5-DD.1 deep dive.
-->

# PRD — Patient details

**Product:** Intercept Live — Virtual Care OS  
**Module:** Provider Desktop (Single Pane of Glass) ★, "patient detail view" (Spec §5.1). Surfaces from Surveillance, Clinical Alerting, Virtual Sepsis, Order Entry, Clinical Documentation and Care Coordination render inside it (Spec §9.1, Principle 11)  
**Name:** the page is called **Patient details** in the product (PRD Patient card PC-100). ✅ **Resolved (PD-OD-01, Oct 28, 2026):** the UI names the page by the patient ("Census › Miller, Sarah", the `h1`), and actions that open it say **Open patient**. "Chart" means only the hospital's record: its slice shows in this page's sections (Timeline, Labs, Medications, Orders, Notes), and an action that leaves for the EMR may say it ("Open chart in Epic"). "View" stays for display modes (quick views, Monitoring's views, the focus view), so the page is never "Patient view"  
**Surface:** Patient details page  
**Version:** 0.1  
**Status:** Draft — pending clinical and product validation  
**Last updated:** October 28, 2026

---

## 1. Overview

Patient details is one patient's page: who they are, what is happening to them now, how they got here, and what the clinician can do next. Every patient on the Census and Monitoring opens it (PRD PC-100), and it is where the intervention loop starts: orders, notes, messages and escalation, all opened with this patient in context (Spec §5.2 "Escalation pathway to intervention loop").

| Page | The question it answers |
|---|---|
| **Census** | Who is on my census, and who needs attention? |
| **Monitoring** | What is happening to my panel right now, and do I need to act? |
| **Patient details** | What is going on with this patient, why, and what do I do next? |

Patient details is not the hospital's EMR. In Integrated mode it renders the platform's aggregated patient model (Spec §6.5); in Overlay mode the same page renders a thinner data set (Spec §4.2). The clinician's mental model doesn't change between hospitals; only the data depth does, and the page says so quietly (Spec §9.1, Principle 1).

### 1.1 Product objectives

| Objective | What it means on this page |
|---|---|
| **One place for one patient** | Physiology, labs, medications, orders, notes, alerts, camera and messages for the patient on one page, replacing 10–12 applications (Spec §1, §5.1). |
| **Catch up fast** | A clinician who opens the patient sees what changed and what needs action first, without reading the whole record. |
| **See cause and effect** | Vitals, drips, ventilator settings, labs and events share one time axis, so "MAP fell after propofol went up" is visible, not reconstructed. |
| **Act in context** | Escalate, message, look in, raise a concern, start a note or review an order recommendation without losing the patient. |
| **Stay honest about data** | Every value shows its source and age; missing and stale data are labeled, never shown as normal (Spec §9.1, Principles 6 and 12). |
| **Keep AI visible and bounded** | AI summaries, answers and recommendations are labeled, cited and never act on their own (Spec §8, §9.1 Principles 7–9). |
| **Never the wrong patient** | Identity is always on screen, and switching patients is fast but unmistakable. |

### 1.2 Source documents

1. Intercept Live — Virtual Care OS System Specification, May 2026 (`documents/Intercept Live - Virtual Care OS - System Specifications.md`).
2. Intercept Live Design Phase Team Brief, October 20, 2026 (`documents/Intercept Live Design Phase Team Brief.md`).
3. Slack notes from client (Israel Villanueva) (`documents/slack-notes-from-client.md`). Product ideas, not scope (§1.4).
4. PRD — Patient card, v0.1 (`prds/patient-card.md`).
5. PRD — Monitoring, v0.1 (`prds/monitoring.md`).
6. Glossary (`prds/glossary.md`).
7. Patient Details Options exploration, October 27, 2026 ([claude.ai artifact](https://claude.ai/artifact/TNP1LPX56xYj5ybBTnfQke), listed in `explorations/index.md`). Three AI-first directions for this page; what it shows and proposes is in §19.1.

Relevant System Specification sections:

| Section | Why it matters here |
|---|---|
| §3.1–3.3 Intensivist, APP, Critical Care RN | The page's users, their needs (e.g. "patient detail, vitals, labs, and trends in one workspace") and APP scope-of-practice constraints |
| §4 Operating Modes | Integrated, Overlay and Hybrid change the data depth and what the page can write back |
| §5.1 Provider Desktop | "Unified multi-hospital census and patient detail view", sub-second patient pivots, the conversational assistant |
| §5.2 Tele-Critical Care Clinical Surveillance | Telemetry, camera, telemetry-and-camera fusion, escalation |
| §5.3 Care Coordination, Communication & Telepresence | Messaging, presence, telepresence sessions |
| §5.4 Clinical Documentation | Notes, AI Scribe, write-back |
| §5.5 Order Entry | Read-only orders, recommendations, write-back gating |
| §5.6 Clinical Alerting & Events | Alert lifecycle and Clinician Intuition Alerts |
| §5.9 Virtual Sepsis | Screening and bundle tracking for this patient |
| §6.4, §6.5 Tenancy, Patient Data Aggregation | One tenant's record; provenance and freshness |
| §8.1–8.3, §8.5–8.7 AI agents | Sepsis Sniffer and Tracker, Vent-Order Mismatch, Order-Entry Suggestion, AI Scribe, Conversational Clinical Data Agent |
| §9.1, §9.4 UI Vision | Commitments 1–13; the "Surveillance patient-detail view with telemetry-and-camera fusion" is one of the five high-fidelity screens |
| §10 Non-Functional Requirements | Audit, performance ("sub-second … patient-context switching"), accessibility, Spanish |

⚠️ **Gap:** the Specification defers the Provider Desktop's numbered functional requirements, screen-level capabilities and flows to a separate deep-dive document (§5-DD.1), which we don't have. This PRD proposes them; reconcile it with §5-DD.1 when it arrives.

**Specification boundary:** these documents establish capabilities and principles. They do not define the page's sections, layout, clinical content per section, thresholds or AI behavior beyond each agent's posture. Everything below is a design proposal to validate with Intercept's clinical and product leadership.

### 1.3 Relationship to the other surfaces

| Surface | Relationship |
|---|---|
| **Patient card** (Census) | Selecting a card opens this page (PC-100). ⚠️ The Census Patient Card Options exploration proposes a "more info" step first, with Patient details one step further; still open in the Patient card PRD. |
| **Focus view** (Monitoring) | A side sheet with the surveillance slice of one patient, opened over the live panel (SV-030). Its "Open patient" action opens this page. The focus view is for watching while staying on the panel; this page is for working on one patient. |
| **Triage queue and Alert Queue** | A row's patient opens this page with that alert's evidence in view (PD-002). |
| **Virtual Sepsis, Messages, Order Entry, Documentation** | Their full workflows stay in their modules. This page shows the patient's slice of each and opens the workflow in context. |
| **Ask Intercept Live** (Sidebar) | The global chat. On this page it answers about this patient (PD-100). |

### 1.4 Client ideas that touch this page

Ideas from Intercept's clinical team (Slack, Israel Villanueva). None is in the Specification or the SOW. The brief says scope beyond what we committed to goes to Carlos as a change request, so this PRD only notes where each would land.

| Idea | Where it would land on this page | Status |
|---|---|---|
| **Family engagement:** notify the designated family contact when the tele-critical care clinician enters the room; offer an AV update or a scheduled meeting | The care team section (a "Family contact" row) and the header's Look in flow (a "Notify family" option after a session) | ⚠️ **Decision needed:** change request or roadmap (PD-OD-14). Needs consent, contact verification and notification preferences |
| **Regional ICU bed management and repatriation** | A transfer status in the header (PC-129) and a "Transfer" action | Not on this page in v1; a separate module if pursued |
| **ACCESS Connect:** flag patients eligible for CMS's ACCESS Model during the stay | A "Programs" row in context (PD-026) | Not in v1. Raises fraud-and-abuse review, per the note itself |

---

## 2. Users and use cases

### 2.1 Primary users

| User | On this page they… |
|---|---|
| **Intensivist** | Review a patient in depth, decide on intervention, review and act on order recommendations, author notes, talk to the bedside team, hand off. |
| **Advanced Practice Provider (APP)** | Do the same within their scope of practice; see which actions need the supervising intensivist's sign-off (Spec §3.2). |
| **Critical Care RN** | Review the patient behind an alert, look in, message the bedside nurse, escalate to the intensivist, raise concerns, prepare the handoff. No order actions (Spec §5.5 primary users). |

ℹ️ The hospital bedside nurse has no platform UI in v1 (Spec §3.11); they reach this patient's clinicians through their hospital's messaging system.

### 2.2 Use cases

| ID | Use case | Description |
|---|---|---|
| PD-UC-01 | **Open from an alert** | A clinician selects an alert in the triage queue; the page opens on that patient with the alert's evidence in view. |
| PD-UC-02 | **Catch up** | A clinician opens a patient they reviewed hours ago and sees what changed since then: alerts, vitals, drips, labs, notes. |
| PD-UC-03 | **Assess deterioration** | MAP is falling; the clinician reads vitals, pressor rate, lactate and fluid events on one timeline to judge why. |
| PD-UC-04 | **Look in** | The clinician opens the bedside camera with live values overlaid and talks to the bedside team. |
| PD-UC-05 | **Act** | The clinician reviews an order recommendation, starts a note, messages the bedside nurse or escalates, without leaving the patient. |
| PD-UC-06 | **Ask the chart** | The clinician asks "summarize the last 24 hours" or "show the lactate trend with antibiotics overlaid" and gets a cited answer (Spec §8.7). |
| PD-UC-07 | **Sepsis review** | The Sepsis Sniffer flagged the patient; the clinician reviews the criteria and evidence, validates or rejects, and tracks the bundle (Spec §5.9). |
| PD-UC-08 | **Vent-order mismatch** | The clinician sees current settings against the last order and decides which side to fix (Spec §8.3). |
| PD-UC-09 | **Raise a concern** | Nothing crossed a threshold, but the clinician is worried; they raise a Clinician Intuition Alert (Spec §5.6). |
| PD-UC-10 | **Handoff** | At shift end, the clinician prepares this patient's handoff; the incoming clinician sees it with carried-over concerns. |
| PD-UC-11 | **Next patient** | The clinician moves to the next patient in the list they came from without going back. |
| PD-UC-12 | **Thin or stale data** | The hospital is in Overlay mode or a feed is down; the clinician sees what's missing and keeps working with what's reliable. |

---

## 3. Page architecture

### 3.1 Entry points

| ID | From | Opens |
|---|---|---|
| PD-001 | Patient card (Census), Monitoring card, focus view "Open patient", Search, a citation in Ask Intercept Live | The page on its default view (PD-005) |
| PD-002 | An alert (triage queue, Alert Queue, the page's own alerts, a notification) | The page with that alert expanded and its evidence highlighted on the timeline |
| PD-003 | Virtual Sepsis, a Messages thread | The page on the matching section (Sepsis, Care team & messages) |

- The page has its own URL per patient and tenant, so it can be bookmarked, shared with a colleague who has access, and restored after a reload.
- Back returns to where the clinician came from with its filters, sort and scroll intact. The breadcrumb names it ("Census / Miller, Sarah").
- ℹ️ Patient details is not a Sidebar item: it opens over the page it came from, and that page stays active in the Sidebar.

### 3.2 Regions

The page uses the Provider Desktop shell (Sidebar, sticky AppHeader, canvas, side panels).

| Region | Content | Notes |
|---|---|---|
| **Patient header** | Identity, safety badges, location, acuity, organ support, actions, patient switcher (§4) | Sticky; compacts on scroll |
| **Alerts strip** | This patient's active alerts and concerns (PD-020) | Mandatory; under the header |
| **Sections** | Overview, Timeline, Labs, Medications, Orders, Notes, Sepsis (§5–§11) | ⚠️ **Decision needed:** tabs or one scrolling page with a section index (PD-OD-02) |
| **Page panel** | Camera, care team & messages, or Ask (§12, §13) | The shell's right-hand panel (`PagePanel`); resizable, closable |

Proposed section list (each section's content is in §5–§11):

| Section | Shows | Default |
|---|---|---|
| **Overview** | What matters now: alerts, live monitor, organ support, what changed, key labs, context | ✅ Opens here |
| **Timeline** | Vitals, drips, ventilator, labs and events on one time axis | |
| **Labs** | Results by panel, cultures, pending | |
| **Medications** | Active medications and infusions | |
| **Orders** | Active orders (read-only) and recommendations | Intensivist, APP |
| **Notes** | Imported and Intercept notes; new note | |
| **Sepsis** | Screening and bundle tracking | Only when the patient has a screening or tracking event (PC-080) |

### 3.3 Information hierarchy

1. Patient identity and safety: name, two identifiers, code status, allergies, isolation
2. Active alerts and concerns
3. Current physiology and organ support (who's on a vent, who's on pressors: Spec §9.1, Principle 2)
4. What changed: acuity change, events since last viewed
5. Context: diagnosis, ICU day, care team
6. History: trends, labs, medications, orders, notes
7. Data freshness, depth and provenance
8. Actions

### 3.4 Mandatory and optional surfaces

Spec §9.1, Principle 4: some things every clinician must see; others they choose to see.

| Mandatory (never hidden by layout, role or preference) | Optional (the clinician can hide, collapse or reorder) |
|---|---|
| Identity with two identifiers (PD-010) | AI summary (PD-024) |
| Code status and allergies (PD-011) | What changed (PD-023) |
| Active alerts and carried-over concerns (PD-020) | Key labs snapshot (PD-025) |
| Freshness and data-depth labels (PD-120, PD-121) | Page panel content |
| Active ambient capture indicator (PD-073) | Timeline lanes beyond the defaults |

- A tenant's Client Administrator can make more surfaces mandatory (Spec §9.1, Principle 4). ⚠️ **Decision needed:** which, and whether that ships in v1 (PD-OD-03).

---

## 4. Patient header

### PD-010 — Identity

| Field | Display | Source rule |
|---|---|---|
| Name | "Miller, Sarah", the largest text on the page (`h1`) | PC-010 |
| Identifiers | MRN, and age and sex ("39 F") | PC-011, PC-012 |
| Location | Hospital · Unit · Room · Bed, broad to specific | PC-013, PC-014 |
| Admission | ICU day ("ICU day 3") and admitting diagnosis | PC-015 |

- Name and MRN are always visible, including in the compact sticky header, so two identifiers are on screen whatever the clinician is looking at (General: Joint Commission NPSG.01.01.01 patient identification).
- ⚠️ **Gap:** admitting diagnosis and problem list aren't in the Patient card data model (PC-015 has encounter fields only). Add them to OD-01.

### PD-011 — Safety badges

Code status ("Full code", "DNR", "DNI"), allergies ("Allergy: Penicillin"; "No known allergies" is shown explicitly, never inferred from an empty list), and isolation ("Droplet isolation").

- Badges carry words, not only color (PC-160).
- ⚠️ **Gap:** code status, allergies and isolation aren't in the data model yet (PRD OD-16). They're mandatory here, so OD-16 blocks this page.
- An unknown code status reads "Code status unknown", never blank (Spec §9.1, Principle 12).

### PD-012 — Acuity and trajectory

As on the card: "Critical risk · SOFA 13" with "▲ +4 in 24 h" (PC-030, PC-031). The score opens its breakdown by organ system with each component's value, time and source.

- No overall condition word (Stable, Unstable, Guarded) until PRD OD-17 is decided.
- ⚠️ **Decision needed:** the acuity score itself (PRD OD-02); SOFA is the leading candidate.

### PD-013 — Organ support tags

The interventions that answer "who's on a vent, who's on pressors" at a glance: Ventilated (invasive only) or NIV, On pressors, CRRT, and others as configured (PRD §15.1 P1). Each tag links to its section (Ventilated → Respiratory; On pressors → Infusions).

### PD-014 — Header actions

| Action | Effect | Roles |
|---|---|---|
| **Look in** | Opens the camera in the page panel (PD-090) | All |
| **Message** | Opens the patient's thread with the bedside nurse (PD-091) | All |
| **Escalate** | Escalation dialog with an evidence snapshot (PD-092, SV-040) | All; targets vary by role (SV-OD-08) |
| **Raise concern** | Clinician Intuition Alert form (PD-093, SV-041) | All |
| **New note** | Opens Clinical Documentation in context (PD-071) | Intensivist, APP; ⚠️ RN notes in PD-OD-12 |
| **More (…)** | Prepare handoff, Copy link, Open chart in {EMR} (Integrated, where permitted; PD-OD-01) | Per role and tenant |

- An action that isn't available says why on hover and to screen readers ("Orders are read-only at this hospital"), instead of disappearing.

### PD-015 — Patient switcher

Previous / next buttons step through the list the clinician came from (the Census's or the panel's current order and filters), with ↑/↓ or J/K.

- The switch is sub-second (Spec §5.1 "sub-second patient pivots") and lands on the same section.
- The name changes visibly (a short Reveal, MOTION.md) and the new patient is announced to screen readers, so a switch is never mistaken for an update.
- Never navigate to another patient because of stale or recycled bed information (PC-100).
- Opened from a link with no list (Search, a notification), the switcher is hidden.

### PD-016 — Sticky header

On scroll, the header compacts to one row: name, MRN, location, code status, allergies, the top alert pill and the actions. It never collapses further.

---

## 5. Overview

The default view: what the clinician needs to know about this patient now, and nothing more (Spec §9.1, Principle 2).

### PD-020 — Alerts and concerns

Every active alert and Clinician Intuition Alert for the patient, highest severity first (SV-021), with the same rows and actions as the triage queue: Acknowledge, Escalate, Resolve with a reason, Decline with rationale for AI rows (SV-022, SV-023).

- Each row shows source, age, state with who and when, and Overdue (PRD OD-15).
- A concern carried over from the last shift says so, with who raised it (PC-132).
- Selecting an alert highlights its evidence on the Timeline (§6).
- With no active alerts: "No active alerts · Last alert 14:22" (SV-051).

### PD-021 — Live monitor

The patient's full bedside monitor: the four-lane `PatientMonitoringCard` view (ECG II, Pleth, ABP, Resp) with HR, SpO₂, BP and MAP, RR as primary numerics and temperature, EtCO₂ and the rest secondary.

- Follows the Monitoring display conventions SV-070 to SV-074: fixed lane order, numeric hierarchy, one color per parameter, alarms shown apart from parameter colors, values grouped by device.
- A value outside its limits gets the ↑ / ↓ tag (SV-014); limits come from configuration (PC-044).
- ⚠️ **Decision needed:** the waveform set per bed type (SV-OD-11) and the parameter palette (SV-OD-10) are shared with Monitoring.

### PD-022 — Organ support

| Group | Label | Content |
|---|---|---|
| **Respiratory** | "Ventilator" (SV-074) | Support type (invasive, NIV, high-flow, oxygen, room air), mode, FiO₂, PEEP, set and measured tidal volume and rate, plateau pressure, last ABG. Vent-order mismatch evidence when present: current vs ordered, time delta, source of each (PC-052, Spec §8.3) |
| **Infusions** | "Pump" (SV-074) | Each continuous infusion: drug, rate with units, dose by weight where relevant, last change and its direction. A missing pump feed reads "Rate unavailable", never "stopped" (PC-060) |
| **Other support** | By device | CRRT, ECMO and others, when sourced |

- ⚠️ **Decision needed:** the exact respiratory parameters (PRD OD-08).

### PD-023 — What changed

Changes since this clinician last viewed the patient: new and resolved alerts, acuity change, drip and ventilator changes, new results, new notes, ADT events. Each item has its time and opens its place on the Timeline.

- "Since you last viewed · 06:40" heads the list; first view of the shift shows the last 12 hours.
- ⚠️ **Decision needed:** how "last viewed" is recorded per clinician, and whether it's derived from the access audit (PD-OD-06, PC-153).

### PD-024 — AI summary

A short summary of the last 24 hours written by the Conversational Clinical Data Agent (Spec §8.7), on request or kept current.

- Marked as AI, with the agent's name and when it was written (Spec §9.1, Principles 7 and 9).
- Every sentence cites its source (vitals, labs, notes, orders); a citation opens the source and its place on the Timeline.
- Retrieves and summarizes only: no diagnosis, no therapeutic recommendation (Spec §8.7). Where data is thin it says so ("No labs resulted at this hospital in the last 24 hours") instead of filling the gap (Spec §9.1, Principle 12).
- It doesn't rewrite while someone is reading it: a newer version waits behind "Summary updated · Show" (as the Monitoring panel order prompt, SV-013).
- ⚠️ **Decision needed:** on by default or on request, and whether it ranks "what matters now" (PD-OD-05). The exploration's Brief direction ranks with AI; a fixed rule (severity, then rate of change) that the AI only explains is safer to validate.

### PD-025 — Key labs snapshot

The latest value of the labs that matter for this patient (by default lactate, creatinine, potassium, hemoglobin, WBC, the last ABG), each with its result time, previous value and direction. Pending labs show "Pending · collected 13:10". The full list is in Labs (§7).

### PD-026 — Context

| Item | Content |
|---|---|
| **Diagnosis and problems** | Admitting diagnosis, active problem list (⚠️ PD-010 gap) |
| **Care team** | Bedside nurse, attending of record, Intercept intensivist, APP and RN on this shift, with presence (Spec §6.12) and a message action each |
| **Encounter** | Admitted, ICU day, encounter status (PC-015), transfer pending (PRD OD-16) |
| **Family contact** | ⚠️ Not in v1 scope; see §1.4 (PD-OD-14) |

---

## 6. Timeline

### PD-030 — One time axis

Lanes share one time axis so cause and effect line up:

| Lane group | Lanes (default) |
|---|---|
| **Monitor** | HR, SpO₂, BP (systolic–diastolic band with MAP), RR, temperature |
| **Pump** | Each continuous infusion's rate |
| **Ventilator** | FiO₂, PEEP, mode changes |
| **Labs** | Lactate, creatinine and others, as dots with their values |
| **Events** | Alerts, interventions, notes signed, ADT events, camera sessions |

- Windows: 1 h, 6 h, 24 h, 72 h, whole stay. ⚠️ **Decision needed:** windows and default (PRD OD-07); the exploration defaults to 24 h.
- A crosshair reads every lane at one moment; values at the crosshair show at each lane's end.
- Limits show as a band from configuration; out-of-limit stretches get a neutral wash, not a severity color (SV-073).
- A medication can be overlaid on any trend (Spec §8.7: "the lactate trend with the antibiotic timeline overlaid").
- The clinician can add, hide and reorder lanes; the defaults are restored with one action.

### PD-031 — Gaps and quality

A period with no data is drawn as a gap, never interpolated. A value marked Invalid (PC-090) is drawn hollow with its reason. A device change is marked on its lane.

### PD-032 — Provenance per point

Any point opens its value, unit, observation time, ingestion time and source ("Monitor · Philips via Ceiba", "Lab · Epic") (PC-092, Spec §9.1, Principle 6).

---

## 7. Labs

### PD-040 — Results

Grouped by panel (chemistry, hematology, blood gases, coagulation, cardiac, others), newest first: value, unit, reference range, flag, result time and the previous value with its direction.

- Flags use words and glyphs ("H", "L", "Critical"), not color alone (PC-160). Ranges come from the hospital's lab (Spec §7.11), never hard-coded.
- States: Ordered, Collected, Pending, Resulted, Corrected (with the original kept), Cancelled.
- A critical result is visually distinct and shows whether it was acknowledged in the hospital's system, when that is known.

### PD-041 — Microbiology

Cultures with source, collection time and status (No growth to date, Preliminary, Final), organism and susceptibilities when final. Positive cultures in the last 72 hours are also listed in the Overview's key labs.

### PD-042 — Imaging and other reports

Report text with study, time and status. ℹ️ Viewing images is out of scope here (Specialty Care Access owns imaging review, Brief).

---

## 8. Medications

### PD-050 — Active medications

Scheduled, PRN and continuous medications from the hospital EMR: drug, dose, route, frequency, last given and next due, with source and time. Read-only (Spec §5.5).

- Continuous infusions link to their Pump values (PD-022) and show both the ordered and the pump rate when both are known.
- ⚠️ **Decision needed:** whether a pump rate that differs from the ordered rate is flagged. The Specification only defines this for ventilators (Spec §8.3); an infusion mismatch rule needs clinical approval (PD-OD-08).

---

## 9. Orders

### PD-060 — Active orders

Active orders aggregated from the hospital EMR: type, details, ordering clinician, time, status and source (Spec §5.5 "read-only visibility into active orders").

### PD-061 — Order recommendations

Suggestions from the Order-Entry Suggestion Agent and the Vent-Order Mismatch Agent (Spec §8.3, §8.5), in their v1 classes only: vent-order alignment, sepsis-bundle alignment, electrolyte replacement, glucose-management enrollment.

| Element | Requirement |
|---|---|
| **Look** | A recommendation, never an order: agent chip, "Recommendation", dashed edge (as AI rows in the triage queue, SV-023) |
| **Evidence** | The values that triggered it, with sources and times |
| **Protocol** | Which protocol it comes from: the hospital's, Intercept's curated one, SEP-1, or the glycemic system's criteria (Spec §8.5) |
| **Actions** | Accept, Modify, Decline with rationale. Each outcome is recorded as taken, declined with rationale, or elapsed (Spec §8.2 three-state telemetry) |
| **After Accept** | Integrated, where the hospital permits write-back: the order goes through write-back with the clinician's approval and is audited. Otherwise the clinician completes it in the hospital EMR (Spec §5.5) |

- Never places an order by itself (Spec §8.5).
- Insulin dosing is never proposed outside an integrated glycemic management system (Spec §8.5).
- ⚠️ **Constraint:** in material Intercept shows externally, "complete it in the hospital EMR" may not be depicted as a deep-link or screen-operated fallback (Brief, "Show the sanctioned integration story"). The prototype shows the Integrated write-back path (PD-134).

### PD-062 — Scope of practice

For an APP, orders that need the supervising intensivist's sign-off say so before Accept, name the supervisor, and route for co-signature (Spec §3.2). An RN sees recommendations read-only, or not at all. ⚠️ **Decision needed:** which (PD-OD-09).

---

## 10. Notes

### PD-070 — Note list

Notes imported from the hospital EMR (by the tenant's note-type rules, Spec §5.8) and Intercept notes, newest first: type, author, time, status (Draft, Signed, Written back, Write-back failed). Filter by type and author.

### PD-071 — New note

Opens the Clinical Documentation surface in context, in the Intercept standard format, with the patient's data available to insert (Spec §5.4). The page shows the draft's status until it is signed.

- The note's own PRD (Clinical Documentation, AI Scribe) defines the editor. This page only starts it and shows status.

### PD-072 — Write-back status

A signed note shows where it went: "Written to Epic · 14:32" (Integrated), or "Ready to import" with its format (Overlay; Spec §5.4). A failure says what failed and what to do.

### PD-073 — Ambient capture

When the AI Scribe is listening during a camera session, the page shows it at all times, with Pause and Stop (Spec §5.4: visible capture state, one-interaction opt-out). Consent follows the hospital's state profile; where all-party consent applies, capture starts only after consent is recorded.

---

## 11. Sepsis

### PD-080 — Screening and tracking

Shown when the patient has a Sepsis Sniffer candidate or a confirmed case under tracking (PC-080–PC-083); the Sepsis tag in the header links here.

| Part | Content |
|---|---|
| **State** | Candidate, Validated, Rejected (with reason), Excluded (with exclusion), Tracking |
| **Criteria** | Each SIRS and organ-dysfunction criterion: met, not met or missing, with its value, time and source (Spec §8.1) |
| **Validation** | Validate or reject, with exclusion adjudication; intensivist or APP (Spec §8.1) |
| **Bundle** | 3-hour and 6-hour elements: done (time), due (time left), overdue, declined with rationale, elapsed (Spec §8.2) |
| **Protocols** | The hospital's own elements shown apart from SEP-1, never merged (Spec §5.9) |

- "Open in Virtual Sepsis" opens the module on this patient (PC-103).
- ⚠️ **Decision needed:** which sepsis states surface here vs. only in Virtual Sepsis (PRD OD-09).

---

## 12. Camera, messages and escalation

### PD-090 — Look in

The bedside camera opens in the page panel, with telemetry-and-camera fusion and the controls from SV-031 (session state, presets, Talk / mute, overlay on or off). The Overview stays beside it.

- ⚠️ **Constraint:** synthetic or placeholder feed only in the prototype (Brief).
- Overlay placement is shared with Monitoring (SV-OD-07).

### PD-091 — Care team and messages

The patient's threads from Care Coordination (Spec §5.3): bedside nurse, hospitalist, residents, with each message's hospital and channel. Reply routes through the hospital's messaging system automatically.

- This page shows the patient's view of Messages; it isn't a second inbox. ⚠️ **Decision needed:** one source of truth for threads (PD-OD-11). The exploration's Huddle direction puts people and AI agents in one thread per patient.
- Urgent messages look different from routine ones (Spec §5.3, §9.1 Principle 10).

### PD-092 — Escalate

As SV-040: send to the intensivist on call, the bedside team, or start intervention, with the alerts to attach, an evidence snapshot and a note. Targets per role and hospital are SV-OD-08.

### PD-093 — Raise concern

As SV-041: rationale (required), category, what to watch, recheck time. It joins the alerts at once and carries over at handoff. Severity is SV-OD-13.

---

## 13. Ask

### PD-100 — Ask about this patient

The Conversational Clinical Data Agent answers questions about this patient (Spec §8.7). Examples from the Specification: "Summarize the last 24 hours", "What changed since I last reviewed this patient?", "List all positive blood cultures in the last 72 hours", "Show me the lactate trend with the antibiotic timeline overlaid", "Show me the sedation vacation and spontaneous breathing trials".

| Rule | Behavior |
|---|---|
| **Scope** | This patient, in this tenant. A question about another patient is answered only in the global chat |
| **Citations** | Every fact cites its source; a citation opens it on the Timeline or in its section |
| **Data in answers** | Answers can include tables, a timeline slice or criteria, not only prose |
| **Limits** | No diagnosis, no therapy recommendation, no actions. Outside its limits it says so; with too little data it says "I don't have enough information" (Spec §9.1, Principle 12) |
| **Drafts** | It can draft a message or a handoff; a draft never sends or saves itself |
| **Visibility** | Answers are marked as AI with the agent's name (Spec §9.1, Principle 7) |

- ✅ **Resolved (Oct 28, 2026, for the prototype):** Ask lives in the global Ask Intercept Live panel (PD-OD-04; one assistant, Spec §9.1 Principle 11). The Patient Header's Ask Intercept button opens it. Scoping it to the open patient is still to build.
- ⚠️ **Decision needed:** voice input (Spec §9.1, Principle 5). Which hospitals allow microphones, and push-to-talk or wake word, are downstream (Spec §9.5).

---

## 14. Handoff

### PD-110 — Prepare handoff

"Prepare handoff" drafts this patient's handoff from the chart and the shift's events, with open alerts, concerns and tasks. The clinician edits it and accepts it into the handoff; the incoming clinician sees it on this page and in their shift start (PC-132, Spec §5.1 shift lifecycle).

- Illness severity and the action list are the clinician's to set; the draft leaves them for review.
- ⚠️ **Decision needed:** the handoff format (PD-OD-10). The exploration uses I-PASS (Illness severity, Patient summary, Action list, Situation awareness, Synthesis by receiver); today Intercept uses a Teams verbal sign-out plus a SharePoint document (Spec §3.3).

---

## 15. Data depth, freshness and degraded states

### PD-120 — Freshness

Every value follows the Patient card freshness model: Current, Stale, Unavailable, Reconnecting, Partial, Invalid (PC-090–PC-092). Stale values keep their last reading, dimmed, with their age ("18 min ago"); missing values show "--", never zero or normal.

### PD-121 — Data depth

When a section has less data because of how the hospital is connected, the section says so in plain words (Spec §9.1, Principle 1): "Orders from this hospital are read-only", "Ventilator data isn't available for this hospital".

- ⚠️ **Constraint:** the notice describes what's available, never the integration mechanism. No "extracted from screen" or "via overlay" in material Intercept shows externally (Brief).
- ⚠️ **Decision needed:** copy for each data-depth notice (PRD OD-14).

### PD-122 — Page states

| State | What the clinician sees |
|---|---|
| **Loading** | Header and section skeletons; the header fills first so identity shows before anything else |
| **No access** | "You don't have access to this patient at {Hospital}" with Back. No patient data, not even the name (PC-131) |
| **Not found** | "This patient isn't on any census you cover" with Back |
| **Transferred** | Banner: "Transferred to {Unit} · {time}"; location updated (PC-129). A transfer to another hospital ends access in this tenant (PD-130) |
| **Discharged / deceased** | Read-only, banner with time; actions that need an active encounter disabled with a reason (PC-130, PRD OD-16) |
| **Pending reconciliation** | Banner: census sources disagree; location shown as last confirmed (PRD §5) |
| **Hospital feed down** | Banner "{Hospital} data is delayed · last update 14:02"; affected values Stale (SV-051) |
| **Offline** | Everything Stale; actions that need the network disabled with a reason (SV-051) |
| **Section empty** | Each section says what's empty and since when: "No labs resulted in the last 72 hours", "No notes imported" |

---

## 16. Real-time behavior and motion

| Event | Behavior (MOTION.md) |
|---|---|
| Value update | No motion; the number changes in place (PC-171) |
| New alert | Reveal at its position in the alerts strip; announced once if Critical or High |
| Alert resolved | Fade; the rows below glide up |
| New timeline data | Appends at the right edge; the view doesn't jump if the clinician has scrolled back in time |
| AI summary update | Waits behind "Summary updated · Show" (PD-024) |
| Patient switch | The header name changes with a short Reveal (PD-015) |
| Header compacts | Height animates on scroll, as AppHeader `compact` |

Under reduced motion, every one of these is instant or opacity-only. Nothing flashes (WCAG 2.3.1).

---

## 17. Multi-tenant, authorization and audit

| Requirement | Detail |
|---|---|
| **PD-130 Tenant isolation** | The page renders one patient record in one tenant. A patient transferred between hospitals is two records; the page never shows the other hospital's encounter or data (Spec §6.5, Brief ground rule). |
| **PD-131 Privileges** | Per-hospital privileges decide whether the page opens and which actions it offers (Spec §5.2). |
| **PD-132 Role-based actions** | Order actions for intensivists and APPs only, APP sign-off where required (PD-062); escalation targets by role (SV-OD-08). |
| **PD-133 Audit** | Opening the page, every section viewed and every action is logged with who and when (Spec §6.8). AI outputs shown are logged with their version. |
| **PD-134 Sanctioned integration story** | Nothing on this page may depict screen-operated extraction or overlay fallback paths in material Intercept shows externally (Brief). |
| **PD-135 Provenance** | Every value, alert, note and AI output shows its source on demand (Spec §9.1, Principle 6). |

---

## 18. Accessibility

WCAG 2.1 AA (Spec §9.1, Principle 13; ⚠️ 2.1 vs 2.2 is open, glossary conflict 2).

- **Structure:** one `h1` (the patient's name), a heading per section, landmarks for header, sections and page panel. Tabs (if chosen, PD-OD-02) follow the Radix Tabs pattern.
- **Keyboard:** every action is reachable; ↑/↓ or J/K switch patients (PD-015); on the Timeline, ←/→ move the crosshair and the values at it are announced.
- **Charts:** every chart has a table alternative with the same data, one keystroke away.
- **Screen readers:** new Critical and High alerts are announced once (`aria-live` polite); live vitals are not live regions; a patient switch announces the new patient's name and MRN.
- **Color is never the only signal:** severity, flags, acuity and freshness carry words or glyphs (PC-160).
- **Language:** layouts hold Spanish, about 25% longer than English (Spec §9.2).

---

## 19. Prototype requirements

| Requirement | Detail |
|---|---|
| **PD-150 Synthetic data** | All patients, results, notes, messages and camera imagery are synthetic (Brief). The reference patient is Sarah Miller (`sample-monitoring.ts` `p1`: MICU Bed 11, Harbor Point General, SOFA 13, ventilated, on pressors), as in the exploration. |
| **PD-151 Simulator** | The real-time data simulator drives the page so a scenario runs end to end: MAP falls on rising norepinephrine, lactate rises, a Critical alert and a Sepsis Sniffer candidate arrive, the clinician reviews, looks in, accepts a bundle recommendation and escalates. |
| **PD-152 Scenarios** | ⚠️ **Decision needed:** which of the ~6 demo scenarios use this page (PD-OD-13). Candidates: deterioration to escalation (shared with Monitoring), sepsis candidate to bundle tracking, vent-order mismatch resolution, Clinician Intuition Alert through handoff, AI Scribe note from a camera session. |
| **PD-153 Layout** | A UCL layout at `src/layouts/intercept-live/patient-details/`, opened from the Census and Monitoring in `InterceptLive`, with its data in `sample-patient-details.ts` (CLAUDE.md "Sample Data"). |
| **PD-154 Reuse** | Built from UCL: Sidebar, AppHeader, Tabs, Badge, Counter, Avatar, Button, DropdownMenu, Tooltip, EmptyState, PatientCardAlert, `PatientMonitoringCard` (full view), `SidePanel` / `PagePanel`. New components (patient header, alert row, timeline lanes, lab table, AI answer with citations, recommendation card) go through `ucl-generate-component` once intercept.ds draws them. |

### 19.1 Exploration (Oct 27, 2026)

[Patient Details Options](https://claude.ai/artifact/TNP1LPX56xYj5ybBTnfQke): three AI-first directions on Sarah Miller, switched with keys 1–3. A standalone claude.ai artifact on synthetic data and Intercept's `theme.css` tokens; it imitates the UCL components. Nothing in it is decided.

| Direction | What it shows | Strengths | Trade-offs |
|---|---|---|---|
| **A · Ask** | The chart answers questions in words or by simulated voice: cited answers with live data (tables, timeline lanes, sepsis criteria), drafts (message, escalation, I-PASS handoff) that never send themselves, a pin board, slash commands (/escalate, /message, /concern, /look, /handoff) | Starts from the clinician's question; every sentence cited; keyboard first | An empty box asks the clinician to know what to ask; mandatory surfaces still need fixed places; some questions get "I can't answer that" (Spec §8.7) |
| **B · Brief** | A live AI-written brief with a ranked "What matters now"; each claim's evidence chip jumps to its lane and moment on the timeline. The AI agents watching the patient, "since you last looked" shading, Read aloud | Opens on what matters without asking; claims are checkable; silence has a reason ("no mismatch") | The ranking decides what comes first and needs clinical sign-off; text that changes can move under the reader (PC-171); the Deterioration Predictor is roadmap only |
| **C · Huddle** | The patient as a shared room: bedside camera, presence, a care team thread where people and AI agents post (@Intercept answers there). Start huddle runs an AI Scribe that drafts a note and captures tasks, which stay drafts until confirmed | Brings the team to the patient; one story for people and agents | Recording needs consent and retention rules per hospital; a per-patient thread competes with Messages; less room for physiology |

**Proposal for review:** take B's structure for the Overview (PD-020–PD-026), with the mandatory surfaces in fixed places and B's evidence chips as the citation pattern; A's Ask as the agent entry and its drafts (PD-100, PD-110); C's thread as this page's view of Messages, not a new inbox (PD-091). The open questions each direction raised are in §22.

---

## 20. Acceptance criteria

| ID | Criterion |
|---|---|
| PD-AC-01 | The patient's name and MRN are visible in every scroll position and section. |
| PD-AC-02 | Code status and allergies are always shown; an unknown value says so and is never blank. |
| PD-AC-03 | Opening the page from an alert shows that alert expanded with its evidence highlighted on the Timeline. |
| PD-AC-04 | Back returns to the Census or Monitoring with filters, sort and scroll as they were. |
| PD-AC-05 | Previous / next switch patients in the source list's order in under a second, keep the section, and announce the new patient. |
| PD-AC-06 | Every alert on the page can be acknowledged, escalated and resolved (or declined, for AI) with who and when shown. |
| PD-AC-07 | Vitals, infusions, ventilator settings, labs and events share one time axis; the crosshair reads all lanes at one moment. |
| PD-AC-08 | A gap in data is drawn as a gap; a stale value keeps its reading, dimmed, with its age; a missing value shows "--". |
| PD-AC-09 | Every value, result and note shows its source and time on demand. |
| PD-AC-10 | Every AI output is labeled with its agent, cites its sources, and never sends, saves or orders anything on its own. |
| PD-AC-11 | An order recommendation records its outcome as taken, declined with rationale or elapsed. |
| PD-AC-12 | An APP sees which recommendations need co-signature before accepting; an RN can't accept one. |
| PD-AC-13 | Ventilator and pump values are labeled by source and separate from monitored vitals. |
| PD-AC-14 | The Sepsis section appears only with a screening or tracking event, and shows hospital protocol elements apart from SEP-1. |
| PD-AC-15 | A user without privileges at the patient's hospital sees no patient data, including the name. |
| PD-AC-16 | Nothing on the page shows another tenant's data, or depicts screen-operated or overlay fallback paths in the prototype. |
| PD-AC-17 | Every interaction works by keyboard and with reduced motion on; every chart has a table alternative. |
| PD-AC-18 | Each page state in PD-122 shows its message, and each empty section says what's empty. |

---

## 21. Dependencies

| Dependency | Needed for |
|---|---|
| Patient Data Aggregation (Spec §6.5) | The patient model, identity, provenance, freshness |
| Telemetry Ingestion (Spec §6.6) | Monitor, pump and ventilator values |
| Lab and Pharmacy interfaces, ADT (Spec §7.11, §7.12) | Labs, medications, location and encounter |
| Clinical Alerting & Events (Spec §5.6) | Alerts, concerns, lifecycle |
| Order Entry (Spec §5.5), Order-Entry Suggestion and Vent-Order Mismatch Agents (Spec §8.3, §8.5) | Orders and recommendations |
| Clinical Documentation, AI Scribe (Spec §5.4, §8.6) | Notes and ambient capture |
| Virtual Sepsis, Sepsis Sniffer and Tracker (Spec §5.9, §8.1, §8.2) | The Sepsis section |
| Care Coordination & Telepresence (Spec §5.3) | Camera, messages, presence |
| Conversational Clinical Data Agent (Spec §8.7) | AI summary and Ask |
| Audit and Compliance Logging (Spec §6.8) | Access and action audit, "last viewed" |
| PRD — Patient card, PRD — Monitoring | Identity, acuity, alerts, freshness, monitor conventions, escalation |
| UCL (this repo) | Components in PD-154 |

---

## 22. Open decisions

| ID | Decision | Owner | Exploration proposal |
|---|---|---|---|
| PD-OD-01 | ✅ **Resolved (Oct 28, 2026):** "Patient details" is the page; the UI shows the patient's name and says "Open patient". "Chart" is reserved for the hospital's record (shown in the sections, or "Open chart in Epic"), since it can imply the EMR of record, which this page isn't in Overlay mode. "View" stays for display modes. | Product / Clinical | "Patient details" in the breadcrumb and title |
| PD-OD-02 | Sections as tabs, or one scrolling page with a section index. | Design / Clinical | One page per direction, no tabs |
| PD-OD-03 | Which surfaces a tenant can make mandatory, and whether that ships in v1. | Product | Not explored |
| PD-OD-04 | ✅ Resolved Oct 28, 2026 (prototype): the global Ask Intercept Live panel, opened from the Patient Header's Ask Intercept button. | Product / Design | A: a box on the page; C: @Intercept in the thread |
| PD-OD-05 | The AI summary: on by default or on request; AI ranking or a fixed rule it explains; frozen while read. | Clinical / Product | B: AI-ranked, live |
| PD-OD-06 | How "last viewed" is recorded per clinician, and whether it comes from the access audit. | Product / Compliance | B: shading since last looked |
| PD-OD-07 | Which sections ship in v1 (Overview, Timeline, Labs, Medications, Orders, Notes, Sepsis). | Product / Clinical | Overview, timeline, labs, drips, vent, sepsis criteria |
| PD-OD-08 | Whether a pump rate that differs from the ordered rate is flagged, and by what rule. | Clinical | Not explored |
| PD-OD-09 | Whether an RN sees order recommendations (read-only) or not at all. | Clinical / Product | Not explored |
| PD-OD-10 | The handoff format (I-PASS or Intercept's current sign-out), and where the incoming clinician reads it. | Clinical | A: I-PASS draft |
| PD-OD-11 | One source of truth for patient threads between Messages and this page. | Product | C: one thread per patient, people and agents |
| PD-OD-12 | Whether RNs author notes on this page. | Clinical | Not explored |
| PD-OD-13 | Which demo scenarios use this page. | Product / Project | Not explored |
| PD-OD-14 | The client's family-engagement idea: change request, roadmap or out (§1.4). | Product / Carlos | Not explored |
| PRD OD-01, OD-02, OD-07, OD-08, OD-09, OD-14, OD-16, OD-17 | Mandatory fields, acuity score, trend windows, respiratory parameters, sepsis states, error copy, code status and safety tags, overall condition. Shared with the Patient card PRD. | See `prds/patient-card.md` §23 | Code status, allergy and isolation as header badges; trends 1 h / 6 h / 24 h |
| SV-OD-07, SV-OD-08, SV-OD-10, SV-OD-11, SV-OD-13 | Camera overlay placement, escalation targets, parameter palette, waveform set, concern severity. Shared with Monitoring. | See `prds/monitoring.md` §15 | As in the Monitoring exploration |

---

## 23. Out of scope

| Item | Why |
|---|---|
| Being the EMR of record | Notes and orders write back to the hospital EMR where permitted (Spec §4, §5.4, §5.5) |
| The note editor and AI Scribe workflow | Clinical Documentation's own PRD; this page starts it and shows status |
| The full Virtual Sepsis and Order Entry workflows | Their modules; this page shows the patient's slice |
| Deterioration Predictor forecasts | Roadmap, gated on FDA SaMD clearance (Spec §8.4); at most a labeled roadmap preview |
| Image viewing | Specialty Care Access (Brief) |
| Family engagement, bed management, ACCESS | Client ideas, not in the SOW (§1.4) |
| Mobile | The v1 companion is notifications, chat, schedule and acknowledgments only (Spec §9.3) |
| Production EMR, device and camera integration | Next phase (Brief) |
| Screen-operated extraction paths | Not shown externally (Brief) |

---

## 24. Definition of done

- Clinical and product leadership have reviewed this PRD and closed or scheduled every PD-OD item.
- The page is designed in Intercept-Live from intercept.ds components and built in the prototype from UCL components.
- The agreed scenarios run end to end on the real-time data simulator.
- Acceptance criteria PD-AC-01 to PD-AC-18 pass in the prototype.
- New terms are in `prds/glossary.md`.
