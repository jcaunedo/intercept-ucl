---
requirements: [PD-05, PD-06, CH-01]
status: proposed — confirm with Carlos (not yet in Trace Matrix v0.1)
---

<!--
Created: Oct 28, 2026
Created by: Julio Caunedo
Last updated: Nov 25, 2026
Latest update: the app header no longer shows the patient once the Patient header scrolls away; it keeps its breadcrumb at all times (PD-016), and PD-010 no longer asks for the MRN on screen while scrolled: the name in the breadcrumb is enough. Why: intercept.ds app-header dropped its OnScroll variant (user's call).
Recent updates: each tab's PRD numbers its own criteria and open decisions (PDO-, PDT-, PDL-, PDC-, PDS-, PDM-, PDR-, PDE-), and the links here use the new IDs. Before that, each tab got its own PRD and its sections, criteria and open decisions moved there, and the Labs tab opened on a Labs summary, the key labs and Lab trends.
Scope: The Patient details page of Intercept Live (the patient chart, Spec §5.1 "patient detail view") inside the Provider Desktop: header, alerts, physiology, timeline, labs, medications, orders, notes, sepsis, camera, communication, Ask, handoff.
Purpose: Defines proposed page structure, behavior, states and acceptance criteria for the Patient details page, pending clinical and product validation and the Spec §5-DD.1 deep dive.
-->

# PRD — Patient details

**Product:** Intercept Live — Virtual Care OS  
**Module:** Provider Desktop (Single Pane of Glass) ★, "patient detail view" (Spec §5.1). Surfaces from Surveillance, Clinical Alerting, Virtual Sepsis, Order Entry, Clinical Documentation and Care Coordination render inside it (Spec §9.1, Principle 11)  
**Name:** the page is called **Patient details** in the product (PRD Patient card PC-100). ✅ **Resolved:** (PD-OD-01, Oct 28, 2026) the UI names the page by the patient ("Census › Miller, Sarah", the `h1`), and actions that open it say **Open patient**. "Chart" means only the hospital's record: its slice shows in this page's sections (Timeline, Labs, Medications, Orders, Notes), and an action that leaves for the EMR may say it ("Open chart in Epic"). "View" stays for display modes (quick views, Monitoring's views, the focus view), so the page is never "Patient view"  
**Surface:** Patient details page  
**Audience:** Intensivists, APPs and Critical Care RNs  
**Version:** 0.1  
**Status:** Draft — pending clinical and product validation  
**Last updated:** November 25, 2026

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
| **Patient card** (Census) | Selecting a card opens this page (PC-100). ⚠️ **Decision needed:** the Census Patient Card Options exploration proposes a "more info" step first, with Patient details one step further; still open in the Patient card PRD. |
| **Focus view** (Monitoring) | A side sheet with the surveillance slice of one patient, opened over the live panel (MON-030). Its "Open chart" action opens this page. The focus view is for watching while staying on the panel; this page is for working on one patient. |
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
- ✅ **Resolved:** the places that open a patient are links to that URL: the Monitoring and Patients cards, the Patients table's rows, the census list and the live feed's patient lines. A click opens the page here; Cmd/Ctrl+click opens it in a new tab and moves to that tab, leaving this page as it is. Alerts, Inbox rows and Messages conversations still open in place only.
- ~~✅ **Resolved:** the browser tab's title is the patient's name while their page is open ("Carlson, Linda · Intercept Live"), else the page's ("Monitoring · Intercept Live"), so tabs opened this way tell apart.~~ ✅ **Resolved:** the browser tab's title is the patient's name alone while their page is open ("Carlson, Linda"), else the page's name alone ("Monitoring"): no " · Intercept Live" after it, so a narrow tab still shows the name.
- Back returns to where the clinician came from with its filters, sort and scroll intact. The breadcrumb names it ("Census / Miller, Sarah").
- ℹ️ Patient details is not a Sidebar item: it opens over the page it came from~~, and that page stays active in the Sidebar~~.
- ✅ **Resolved:** while a patient's page is open, no Sidebar item shows as active (Monitoring's icon is in its default state, not its active, filled one); the page it came from is still where Back and the breadcrumb lead, and comes back active on return.

### 3.2 Regions

The page uses the Provider Desktop shell (Sidebar, sticky AppHeader, canvas, side panels).

| Region | Content | Notes |
|---|---|---|
| **Patient header** | Identity, safety badges, location, acuity, organ support, actions, patient switcher (§4) | ~~Sticky; compacts on scroll~~ Scrolls with the page; the app header keeps its breadcrumb (PD-016) |
| **Alerts strip** | This patient's active alerts and concerns (PD-020) | Mandatory; under the header |
| **Sections** | Overview, Timeline, Labs, Medications, Orders, Notes, Sepsis (§5–§11) | ⚠️ **Decision needed:** tabs or one scrolling page with a section index (PD-OD-02) |
| **Page panel** | Camera, care team & messages, or Ask (§12, §13) | The shell's right-hand panel (`PagePanel`); resizable, closable |

ℹ️ The EMR tab's name and contents are in [patient-details-emr.md](patient-details-emr.md).

✅ **Resolved:** the tabs, in this order: **Overview · Timeline · Labs · Chart · Care Plan · Medications · Orders · Notes · EMR · Live Camera** (~~Overview · Vitals · Labs · Chart · Timeline · …~~: Vitals merged into the Timeline the same day, see §6). Labs and Chart are separate tabs: Labs holds results and microbiology; Chart holds the rest of the hospital's record (problems, history, allergies, home medications, imaging reports). **Care Plan** is its own tab: ~~the Overview's Care plan at full length (the pathway from an alert, keep or transfer, and every problem of the hospital's plan of care);~~ ✅ **Resolved:** the plan problem by problem, each pathway inside the problem it treats ([care-plan.md](care-plan.md)); the Overview's card shows four problems and its **View all** opens the tab. **Live Camera** is the bedside camera (it was "Camera view"). Sepsis and Discharge, shown only for some patients, follow Care Plan, since they're plans too. 🙋 **Open question:** how the sections connect and which can merge (e.g. Chart into EMR, Discharge and Sepsis into Care Plan, Labs and Vitals into the Timeline); this order is the starting point.

Each tab has its own PRD; this one keeps the page around them (header, tabs, panels, entry points, freshness, accessibility):

- **Overview:** [patient-details-overview.md](patient-details-overview.md)
- **Timeline:** [patient-details-timeline.md](patient-details-timeline.md)
- **Labs:** [patient-details-labs.md](patient-details-labs.md)
- **Chart:** [patient-details-chart.md](patient-details-chart.md)
- **Care Plan:** [care-plan.md](care-plan.md)
- **Sepsis:** [patient-details-sepsis.md](patient-details-sepsis.md)
- **Discharge:** [transitions-of-care.md](transitions-of-care.md), with the social needs and referrals in [alert-maximized-modal.md](alert-maximized-modal.md) (AMM-026, AMM-027)
- **Medications:** [patient-details-medications.md](patient-details-medications.md)
- **Orders:** [patient-details-orders.md](patient-details-orders.md)
- **Notes:** [notes.md](notes.md), §5.1 "The Notes tab"
- **EMR:** [patient-details-emr.md](patient-details-emr.md)
- **Live Camera:** [bedside-camera.md](bedside-camera.md)

~~Proposed section list (each section's content is in §5–§11):~~ The list below predates the order above.

| Section | Shows | Default |
|---|---|---|
| **Overview** | What matters now: alerts, live monitor, organ support, what changed, key labs, context | ✅ Opens here |
| **Timeline** | Vitals, drips, ventilator, labs and events on one time axis | |
| **Labs** | Results by panel, cultures, pending | |
| **Medications** | Active medications and infusions | |
| **Orders** | Active orders (read-only) and recommendations | Intensivist, APP |
| **Discharge** | Social needs the discharge workflow flagged from the chart, the payer, and a referral for each, sent with who agreed or skipped with a reason (PRD Alert maximized modal AMM-026, AMM-027) | Only once the workflow has flagged social needs. ✅ **Resolved:** built in the prototype (Nov 4, 2026, Scenario 2 step 6): after Orders, the same panel as the alert's Pathway panel. ✅ **Resolved:** the section also shows once the patient has a transition of care (PRD Transitions of care): **Transition of care** first (a return matched to the stay, the primary-care handoff with Send to clinic, the readmission risk, the follow-up), then the social needs and referrals. A notice or an Inbox follow-up opens the page on this tab |
| **Notes** | Imported and Intercept notes; new note | |
| **Sepsis** | Screening and bundle tracking | Only when the patient has a screening or tracking event (PC-080) |

### 3.2.1 Tab review: what each tab lets the clinician do

✅ **Resolved:** every tab is reviewed for its structure, content and interactions, and made **actionable**: where the clinician reads something they'd act on, they can act on it right there, or one click away, instead of only reading it. Today most tabs are read-only, and the actions some already have (Sepsis, Orders, Notes, Live Camera, EMR) stay inside the tab: the page passes none of them to the app, so a decision is lost on reload. ⚠️ **Gap:** `patient-details.tsx` (`sectionContent`) doesn't pass `onAction`, `onRecommendationAction`, `role`, `onSignNote`, `onEditNote`, `onRetryWriteBack`, `onCameraAction` or `onOpenChart`.

- **PD-160 Act where you read.** An action sits on the row or card it acts on. An action that would change the hospital's record is either written back with its status (PD-072) or sent as a proposal the bedside team accepts, never changed silently (PD-OD-17).
- **PD-161 Every action reaches the app.** Each decision goes through the page to the app, survives a reload, shows on the Timeline's events lane and is audited (§17).
- **PD-162 By role.** Each action names who can take it, from Requirements §4: the Critical Care RN views, acknowledges, records and messages, but signs no orders; the APP's orders route for co-signature (PD-062). An action a role can't take isn't shown.

| ID | Tab | Today | Made actionable (proposed) | Status |
|---|---|---|---|---|
| PD-163 | **Overview** | ℹ️ Moved to [patient-details-overview.md](patient-details-overview.md) | | |
| PD-164 | **Timeline** | ℹ️ Moved to [patient-details-timeline.md](patient-details-timeline.md) | | |
| PD-165 | **Labs** | ℹ️ Moved to [patient-details-labs.md](patient-details-labs.md) | | |
| PD-166 | **Chart** | ℹ️ Moved to [patient-details-chart.md](patient-details-chart.md) | | |
| PD-167 | **Care Plan** | Chips, Show met, View history, Review / Open pathway; problems read-only | **Update progress** on each problem: record its status with a note, propose a goal or intervention change ([care-plan.md](care-plan.md) CPL-014). Keep or transfer's checkpoints can be recorded (Passed or Missed, with the value). A bundle or task line can be marked done here | ⚠️ Not built |
| PD-168 | **Sepsis** | ℹ️ Moved to [patient-details-sepsis.md](patient-details-sepsis.md) | | |
| PD-169 | **Discharge** | Send to clinic; referrals Send, Skip, Undo skip | **Edit** the primary-care handoff before sending. A follow-up can be **Marked done** or **Rescheduled**. A High readmission risk shows its follow-ups | ⚠️ Not built |
| PD-170 | **Medications** | ℹ️ Moved to [patient-details-medications.md](patient-details-medications.md) | | |
| PD-171 | **Orders** | ℹ️ Moved to [patient-details-orders.md](patient-details-orders.md) | | |
| PD-172 | **Notes** | New note, Continue writing, Review and sign, Try again, the editor | Save, Sign and Try again reach the app and the EMR write-back (PD-072); Try again retries for real. A signed note gets **Addendum** | ⚠️ Not built |
| PD-173 | **EMR** | ℹ️ Moved to [patient-details-emr.md](patient-details-emr.md) | | |
| PD-174 | **Live Camera** | Look in, End, Talk, presets, overlay, huddle and its scribe | Every action reaches the app (session log, audit). A huddle's "Note drafted" opens the draft in Notes. The people under Who's here can be messaged or called | ⚠️ Not built |

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
| Active alerts and carried-over concerns (PD-020): the patient header's count, always on screen, and the Alerts panel it opens | Clinical findings (PD-025) |
| Freshness and data-depth labels (PD-120, PD-121) | Page panel content |
| Active ambient capture indicator (PD-073) | Timeline lanes beyond the defaults |

- A tenant's Client Administrator can make more surfaces mandatory (Spec §9.1, Principle 4). ⚠️ **Decision needed:** which, and whether that ships in v1 (PD-OD-03).

---

## 4. Patient header

### PD-010 — Identity

| Field | Display | Source rule |
|---|---|---|
| Name | "Miller, Sarah", the largest text on the page (`h1`) | PC-010 |
| Identifiers | ~~MRN, and age and sex ("59 F")~~ Sex and age after the name ("Miller, Sarah - F, 59"); then MRN and the hospital account number ("MRN 01033876 · ACCT 6325DF2") | PC-011, PC-012 |
| Location | Hospital · Unit · Room - Bed, broad to specific, after a location pin | PC-013, PC-014 |
| Admission | ICU day ("ICU day 3") and admitting diagnosis, on the Overview's Encounter card with the weight | PC-015 |

- ~~Name and MRN are always visible, including in the compact sticky header, so two identifiers are on screen whatever the clinician is looking at (General: Joint Commission NPSG.01.01.01 patient identification).~~
- The Patient header shows the name and MRN together, so two identifiers are on screen at the top of the page (General: Joint Commission NPSG.01.01.01 patient identification). Once it has scrolled away, the name alone stays on screen, in the app header's breadcrumb (PD-016).
- ✅ **Resolved:** the name in the breadcrumb is enough while the page is scrolled; the MRN doesn't need to stay on screen. The two identifiers are in the Patient header, a scroll away.
- ⚠️ **Gap:** admitting diagnosis and problem list aren't in the Patient card data model (PC-015 has encounter fields only). Add them to OD-01.
- ✅ **Resolved:** the header (intercept.ds Patient Header) shows sex and age after the name, then one line with MRN and the account number (ACCT, the hospital's number for this stay), the location after a pin, and the early-warning score as the patient cards write it. ICU day and weight left the header for the Overview's Encounter card.

### PD-011 — Safety badges

Code status ("Full code", "DNR", "DNI"), allergies ("Allergy: Penicillin"; "No known allergies" is shown explicitly, never inferred from an empty list), and isolation ("Droplet isolation").

- Badges carry words, not only color (PC-160).
- ⚠️ **Gap:** code status, allergies and isolation aren't in the data model yet (PRD OD-16). They're mandatory here, so OD-16 blocks this page.
- An unknown code status reads "Code status unknown", never blank (Spec §9.1, Principle 12).

### PD-012 — Acuity and trajectory

As on the card: "NEWS2 10 High" with "▲ +6 in last 24 h" (PC-030, PC-031); the score's name, not "acuity score" (Oct 30, 2026). The header's score doesn't link to a breakdown (Nov 9, 2026). ✅ **Resolved:** (Nov 9, 2026, user's call, following Intercept-Live `149:4464`) the Overview's Early warning score card is gone too, so the score's breakdown by input (RR, SpO₂, oxygen, BP, HR, consciousness, temperature) shows only in a deterioration alert's evidence for now.

- ✅ **Resolved:** the header's right side, as wide as the patient's side, is three columns: **NEWS2** ("10 High", then the arrow and "1 point up in 24 h"), **Clinical status** (the bedside team's documented assessment, PC-031's words: Improving, Relatively stable, Deteriorating, Insufficient data, and "Last assessed 2 min ago"; it can differ from the score, e.g. a low NEWS2 with pressure climbing on a drip) and **Alerts** (~~"Alerts · 6 alerts in last 12 h"~~ "Alerts", and under it "6 alerts in last 12 h", every alert that fired in the last 12 h, resolved ones included, then the **2 active alerts** / **No active alerts** button, which opens the Alerts panel as before). The score left the details line. **Live feed** left the header: it sits at the right end of the tabs row, as on Monitoring ("Live feed: {the newest line}" and a chevron), and opens the same panel. 🙋 **Open question:** who documents the clinical status and how often (a nursing assessment field, the intensivist's note, or an approved calculation); the prototype sets it by hand per patient.
- ✅ **Resolved:** the **active alerts** button takes the color of the patient's highest open severity, as the cards' alert bar: Critical red, High orange, Medium amber, Low blue (it was always Critical red, whatever the severity). With no open alert it stays the outline **No active alerts**.
- ~~✅ **Resolved:** the score and its change are on the header's details line, as on the patient cards ("↗ NEWS2: 10 High · 1 point up in 24 h"), and the right side is two buttons: **Live feed**, which opens this patient's live feed beside the page: a log of everything that happened to them, newest first and grouped by day, history included (care actions, drip and ventilator changes, lab results, notes, and each alert as it fired and as its status changed, by whom); an alert's line opens the alert, and **"2 active alerts"** (red), which counts the patient's open alerts and opens the Alerts panel, ~~shown only while there are open alerts~~ always there: with none it reads **No active alerts** (outline), and still opens the panel with the patient's earlier alerts. It replaces the NEWS2, change and Active alerts columns and the View alerts button below.~~ Superseded by the three columns above.
- ~~✅ **Resolved:** (Nov 9, 2026, user's call, following intercept.ds Patient Header `1191:3147`) the header's right half shows NEWS2 with its level and the change in the last 24 h, each in its own column~~ (no "Previous: 9" line), then **Active alerts**: how many alerts are open, in the worst one's severity color (0 when none). ✅ **Resolved:** updated later the same day (user's call, following intercept.ds): a third column like the other two, not the filled box with "1 critical · 1 low" first drawn. The whole column opens the Overview's Alerts card (it replaces the "View alerts" link). ✅ **Resolved:** (Nov 9, 2026, later still, user's call, following intercept.ds) a **View alerts** button after the count opens an **Alerts side panel** with every alert of the patient, the unresolved at the top (most urgent first) and the resolved under them, each as on the Overview with its actions. ✅ **Resolved:** (Nov 9, 2026, user's call: "3 panels can be opened at the same time") it stays open beside the video consult and Messages, three panels at once, left to right: Video consult, Alerts, then Messages (or Pathway, which still shares Messages' place). × or Escape closes it, and the alert toasts hide while it's open. ✅ **Resolved:** (Nov 9, 2026, user's call: the pathway from the alert, without opening the alert) each alert there that comes with a pathway has a **Pathway** button, which opens that alert's pathway in the Pathway panel **right of Alerts, both open** ("Hide pathway" closes it). Review, edit, accept or decline as in the alert. ✅ **Resolved:** (Nov 9, 2026, user's call: "apply these changes to the alerts in the Alerts panel" as on the alert modal) that **Pathway** is last in the alert's button row, where Resolve was (Ack · Escalate · Pathway), not right of the title; Resolve is a green link under the row, **Mark this alert as resolved**, opening the same Resolve form (PRD Alert maximized modal AMM-004). ✅ **Resolved:** (Nov 10, 2026, user's call; intercept.ds `alert-modal` `1353:14304`) the row is Ack · Escalate · Resolve again, and the pathway is a **View pathway** link under it (**Hide pathway** while open); the green link is gone. ✅ **Resolved:** (Nov 10, 2026, later, user's call; intercept.ds `alert-modal` `1355:14776`) the View pathway link is gone, here as on the alert panel; an open alert's pathway opens from the Overview's Care plan. The header no longer has "View breakdown". ✅ **Resolved:** (Nov 9, 2026, user's calls) a **resolved** alert in the Alerts panel has no Pathway button: when it comes with a pathway, clicking anywhere on the card opens that pathway beside Alerts (again closes it). The card darkens on hover and while its pathway is open, and its bar no longer opens the alert (no maximize icon).
- ✅ **Resolved:** in the Alerts panel, a resolved alert's card no longer opens the alert (no maximize icon on its bar, no click); an open alert's bar still does. A resolved alert that comes with a pathway still opens that pathway.
- ✅ **Resolved:** in the Alerts panel, clicking an open alert's bar opens the alert modal and closes the Alerts panel; the header's alerts button opens it again.
- No overall condition word (Stable, Unstable, Guarded) until PRD OD-17 is decided.
- ⚠️ **To clarify with the client:** the score, its on-screen name and its breakdown are open questions in PRD Patient card PC-030 "To clarify with the client" (OD-18).
- ✅ **Resolved:** (Oct 30, 2026, for the prototype; DU-14) the acuity score is NEWS2-style, replacing the SOFA placeholder; clinical approval is still PRD OD-02. ⚠️ **Gap:** the breakdown isn't built; today the inputs and their points show only in a deterioration alert's evidence.

### PD-013 — Organ support tags

The interventions that answer "who's on a vent, who's on pressors" at a glance: Ventilated (invasive only) or NIV, the pressor count ("2 pressors"), CRRT, high-risk drips (Insulin infusion, 3% NaCl), and others as configured (PRD Patient card §15.1 P1). ✅ **Resolved:** flag details (Nov 3, 2026, user's call; Nov 4, 2026, client feedback): each flag opens a popover with what the bedside team changed lately and what's behind it now, as on the patient's card (PRD Patient card PC-064); it replaced linking each tag to its section (Ventilated → Respiratory, pressors → Infusions), which wasn't built.

### PD-014 — Header actions

| Action | Effect | Roles |
|---|---|---|
| **Look in** | Opens the camera in the page panel (PD-090) | All |
| **Message** | Opens the patient's thread with the bedside nurse (PD-091) | All |
| **Escalate** | Escalation dialog with an evidence snapshot (PD-092, MON-040) | All; targets vary by role (MON-OD-08) |
| **Raise concern** | Clinician Intuition Alert form (PD-093, MON-041) | All |
| **New note** | Opens Clinical Documentation in context (PD-071) | Intensivist, APP; ⚠️ **Decision needed:** RN notes in PD-OD-12 |
| **More (…)** | Admission note, Share patient link, Open chart in {EMR} (Integrated, where permitted; PD-OD-01) | Per role and tenant |
| **Create (+)** | A menu of what can be created for the patient, in this order: New note (PD-071), New order (Order Entry in context), New task, Request specialist, New referral, Start pathway, Log critical care time, Prepare handoff (PD-110) | Per role, as each item |

- ✅ **Resolved:** (Nov 9, 2026, user's call; intercept.ds `app-header` `1169:319`) a dark **+** after "…" in the app header opens a **Create** menu: New note and Prepare handoff moved there from "…", which keeps Raise concern, Huddle team, Escalate and Copy link.
- ✅ **Resolved:** the Create menu has **New order** after New note, opening Order Entry in context for the patient.
- ✅ **Resolved:** the Create menu holds only what the clinician **creates for this patient**; actions on the patient (Raise concern, Escalate, Huddle team) stay in "…". After New order it has:
  - **New task**: a follow-up for the bedside team or the clinician, with a due time ("Recheck lactate at 7 PM"). It joins the bedside tasks that Up next and the Timeline already show (Work Management, Spec §6.21).
  - **Request specialist** (~~Request consult~~ ✅ **Resolved:** named for the specialist, because a "consult request" is a hospital calling the hub; glossary): a request to a specialist (cardiology, infectious disease…) for this patient, with the reason (Specialty Care Access; requesting consults is among the intensivist's permissions). ℹ️ What it opens, the request form and the whole consult, is in PRD Specialty Care Access ([specialty-care-access.md](specialty-care-access.md), "4.1 Requesting a consult").
- ~~ℹ️ Considered for the menu and left out for now: **Log critical care time**, **Referral** and **Pathway**.~~ ✅ **Resolved:** they're in the menu too, after Request specialist:
  - **New referral**: a referral (home health, rehab, a follow-up clinic) outside the discharge workflow, which keeps its own referrals.
  - **Start pathway**: starts a care pathway or protocol (sepsis bundle, DKA) for the patient without waiting for an alert to suggest it.
  - **Log critical care time**: minutes spent on the patient, toward the critical care attestation (30 minutes or more; PRD Notes), so they don't have to be rebuilt when the note is signed.
- ⚠️ **Gap:** New order, New task, Request specialist, New referral, Start pathway and Log critical care time are in the menu but open nothing in the prototype yet: the app receives the action (`new-order`, `new-task`, `consult-request`, `new-referral`, `start-pathway`, `log-time`). Their forms (what each asks for, who receives it, where it shows afterwards) are still to design.
- ⚠️ **Decision needed:** whether all eight belong in the menu. Eight items make a long list for the clinician to scan; options are grouping them under labels (documents, requests, time), or moving the rarer ones (Start pathway, Log critical care time) elsewhere, e.g. Start pathway to the Care Plan and the time to the note.
- ✅ **Resolved:** "…" has **Admission note**, before Share patient link: it opens the note the patient was admitted with, the best way to get to the original clinical documentation.
- ✅ **Resolved:** the link item reads **Share patient link** (it said Copy link), so it’s clear it shares this patient’s page. It still copies the link.
- An action that isn't available says why on hover and to screen readers ("Orders are read-only at this hospital"), instead of disappearing.

### PD-015 — Patient switcher

Previous / next buttons step through the list the clinician came from (the Census's or the panel's current order and filters), with ↑/↓ or J/K.

- The switch is sub-second (Spec §5.1 "sub-second patient pivots") and lands on the same section.
- The name changes visibly (a short Reveal, MOTION.md) and the new patient is announced to screen readers, so a switch is never mistaken for an update.
- Never navigate to another patient because of stale or recycled bed information (PC-100).
- ✅ **Resolved:** always there (Nov 3, 2026, user's call): opened from somewhere with no list of its own (an alert, a toast, the live feed, the chat), the patient gets the list of the page under them, in its order and filters as it shows then; a patient that list leaves out comes first. It was hidden before.
- ✅ **Resolved:** (Oct 28, 2026, prototype) the switcher is a patient list, opened from a list button at the left of the app header (intercept.ds `app-header` Patient Context). It shows the source list in its order, the open patient marked; picking one switches. Previous / next buttons and the ↑/↓, J/K shortcuts aren't built yet.
- ✅ **Resolved:** the list panel is titled **Census** (~~Patients~~), ~~whichever page it comes from~~; the line under the title still names the source page and the position (~~"From the Monitoring, in its order · 4 of 26"~~).
- ✅ **Resolved:** opened from Monitoring, the list is the census (the patients in hospital now), so it's titled **Census**, and the line reads "From Monitoring, in its order · 4 of 26".
- ~~⚠️ **Decision needed:** whether a patient opened from Patients (everyone treated, in hospital or not; PRD Patients) gets this list at all, and what it's called there. Until then it keeps the Census title.~~ ✅ **Resolved:** the list only shows the census, from any page: the **census list**, titled **Census**. Opened from Patients, it keeps Patients' order and leaves out anyone no longer in hospital ("From Patients, in its order · 12 of 26").
- ✅ **Resolved:** the list is a UCL component, **CensusList** (`data-display/census-list`), inside the shell's side panel.
- ✅ **Resolved:** the list has its own PRD, **PRD Census list** (`prds/census-list.md`, CNL-): what it shows, its title, position line, order and states. This section keeps Previous / next, which step through that list (CNL-040).
- ~~⚠️ **Gap:** the prototype has no patients out of hospital yet (PRD Patients CEN-OD-09), so nothing is left out today; and Previous / next, when built, should step through the same census list.~~ Moved to PRD Census list (CNL-001, CNL-040).

### PD-016 — Sticky header

~~On scroll, the header compacts to one row: name, MRN, location, code status, allergies, the top alert pill and the actions. It never collapses further.~~

~~The Patient header scrolls with the page. Once it has gone under the sticky app header, the app header shows the patient in place of its breadcrumb: their avatar, the name with sex and age ("Miller, Sarah - F, 59"), then MRN · ACCT and the location, as the Patient header writes them. Scrolled back until the Patient header shows again, the breadcrumb returns. The two swap in place with a short fade and rise; a fade only under reduced motion.~~

The Patient header scrolls with the page. The sticky app header keeps its breadcrumb ("Census › Miller, Sarah") the whole time, at the top of the page and scrolled; it only tightens its padding while the page is scrolled. The patient's name stays on screen through the breadcrumb.

- ~~✅ **Resolved:** the app header shows the patient only once the Patient header is out of view, and the breadcrumb at the top of the page (intercept.ds app-header, OnScroll). So the name and MRN stay on screen while the clinician scrolls (PD-010), and Back stays the way back.~~
- ✅ **Resolved:** the app header doesn't swap in the patient on scroll; it shows the breadcrumb at all times. intercept.ds app-header dropped its OnScroll variant and keeps only Default and Patient Context, which draws the breadcrumb again. The name stays on screen through the breadcrumb, which is enough while scrolled (PD-010).

---

## 5. Overview

ℹ️ The Overview tab has its own PRD: [patient-details-overview.md](patient-details-overview.md). It holds PD-020 to PD-026 (alerts, live monitor, organ support, what changed, the AI summary, key labs, context) and the care plan and activity.

### Care Plan tab

ℹ️ The care plan (the Care Plan tab and the Overview's Care plan card) has its own PRD: [care-plan.md](care-plan.md). It covers what a care plan is, how pathways attach to its problems, a problem's details and history, Completed and keep or transfer.

---

## 6. Timeline

ℹ️ The Timeline tab has its own PRD: [patient-details-timeline.md](patient-details-timeline.md). It holds PD-030 to PD-032 (one time axis, gaps and quality, provenance per point) and the latest values' layout (PDT-OD-01, PDT-OD-03).

---

## 7. Labs and Chart

ℹ️ The Labs tab has its own PRD: [patient-details-labs.md](patient-details-labs.md). It holds the tab's order (Labs summary, key labs, Lab trends), PD-040 Results and PD-041 Microbiology. The Chart tab's is [patient-details-chart.md](patient-details-chart.md), with PD-042 Imaging and other reports.

---

## 8. Medications

ℹ️ The Medications tab has its own PRD: [patient-details-medications.md](patient-details-medications.md) (PD-050, PDM-OD-01).

---

## 9. Orders

ℹ️ The Orders tab has its own PRD: [patient-details-orders.md](patient-details-orders.md) (PD-060 to PD-062, PDR-OD-01).

---

## 10. Notes

ℹ️ The Notes tab is specified in [notes.md](notes.md), §5.1 "The Notes tab" (PD-070 to PD-073), with the note itself.

---

## 11. Sepsis

ℹ️ The Sepsis tab has its own PRD: [patient-details-sepsis.md](patient-details-sepsis.md) (PD-080).

---

## 12. Camera, messages and escalation

### PD-090 — Look in

The bedside camera opens in the page panel, with telemetry-and-camera fusion and the controls from MON-031 (session state, presets, Talk / mute, overlay on or off). The Overview stays beside it.

- ℹ️ The camera's sessions (look in, video consult, huddle), states and open decisions are specified in PRD — Bedside camera (`prds/bedside-camera.md`).

- ⚠️ **Constraint:** synthetic or placeholder feed only in the prototype (Brief).
- Overlay placement is shared with Monitoring (MON-OD-07).

### PD-091 — Care team and messages

The patient's threads from Care Coordination (Spec §5.3): bedside nurse, hospitalist, residents, with each message's hospital and channel. Reply routes through the hospital's messaging system automatically.

- This page shows the patient's view of Messages; it isn't a second inbox. ⚠️ **Decision needed:** one source of truth for threads (PD-OD-11). The exploration's Huddle direction puts people and AI agents in one thread per patient.
- Urgent messages look different from routine ones (Spec §5.3, §9.1 Principle 10).

### PD-092 — Escalate

As MON-040: send to the intensivist on call, the bedside team, or start intervention, with the alerts to attach, an evidence snapshot and a note. Targets per role and hospital are MON-OD-08.

### PD-093 — Raise concern

As MON-041: rationale (required), category, what to watch, recheck time. It joins the alerts at once and carries over at handoff. Severity is MON-OD-13.

---

## 13. Ask

### PD-100 — Ask about this patient

The Conversational Clinical Data Agent answers questions about this patient (Spec §8.7). The chat composer and how answers arrive are specified in PRD — Chat composer (`prds/chat-composer.md`). Examples from the Specification: "Summarize the last 24 hours", "What changed since I last reviewed this patient?", "List all positive blood cultures in the last 72 hours", "Show me the lactate trend with the antibiotic timeline overlaid", "Show me the sedation vacation and spontaneous breathing trials".

| Rule | Behavior |
|---|---|
| **Scope** | This patient, in this tenant. A question about another patient is answered only in the global chat |
| **Overview** | Asked about the open patient (the app header's Ask Intercept Live, a card's menu, a toast's Ask), the quick overview and the summary include the patient's flags with what's behind each, when the record has it: the pressor count with each pressor's rate, the ventilator's mode and settings, a high-risk drip's rate with its lab (3% NaCl with sodium, insulin with glucose), then the other flags by name (DNR, Fall risk) (Nov 3, 2026, user's call). ✅ **Resolved:** changed at the bedside (Nov 4, 2026, client feedback and user's call): asked about any patient, the summary and the quick overview say what the bedside team changed in the last 12 hours, the drips' titrations and the ventilator's settings, newest first ("Epinephrine drip increased by 75% in the last 3 hours; FiO₂ increased from 40% to 60% in the last 2 hours"), or "nothing in the last 12 hours". Nurses and respiratory therapists make these changes on their own and the intensivist has to seek them out (PRD Patient card PC-064). Asked about the vent, each setting says its change |
| **Citations** | Every fact cites its source; a citation opens it on the Timeline or in its section |
| **Data in answers** | Answers can include tables, a timeline slice or criteria, not only prose |
| **Limits** | No diagnosis, no therapy recommendation, no actions. Outside its limits it says so; with too little data it says "I don't have enough information" (Spec §9.1, Principle 12) |
| **Drafts** | It can draft a message or a handoff; a draft never sends or saves itself |
| **Visibility** | Answers are marked as AI with the agent's name (Spec §9.1, Principle 7) |
| **How the product works** | Asked how something works ("how do active alerts work?", "how are alerts displayed? tell me the formula", "why is the arrow orange?"), the agent explains the rule the app follows, from the PRDs, specs and design rules, cited as "Intercept Live" (the product's own documentation), with an example from the alerts open now (who ranks first and why, then the first few): Active alerts and its ranking, the alert bar, the Alerts sort, the change arrow's colors, device alarms. A question about a named patient stays about that patient (Oct 31, 2026, product). ⚠️ **Gap:** the prototype's explanations are written out; the real agent would read them from the product's documentation |
| **Drug lookup** | Asked about a medicine by name ("penicillin", "what is vancomycin?"), the agent gives a short reference summary (what it is, what it's generally used for), then the census in its light: who's on it or a drug of its class, with the dose, and who's allergic, with the reaction. It ends by saying it's reference information, not a recommendation (Spec §9.1). A question that names a patient stays about that patient (Oct 31, 2026, product). ⚠️ **Gap:** the prototype's reference covers its sample's drugs; the real agent would use the hospital's drug database |
| **Same data as the screen** | Answers use the alerts and values the cards show at that moment, including the clinician's own queue actions, and rank patients in the cards' priority order, so the chat never contradicts the page (Oct 31, 2026, product) |
| **Alert updates** | While the conversation is about alerts (from a question about them, e.g. "open alerts" or "how do active alerts work?", until a question about something else), the chat posts an "Alert update" whenever a patient's alert fires, changes severity or status (acknowledged, escalated by someone else) or resolves, whether it's open or not. Changes outside that aren't saved for later. The clinician's own queue actions aren't repeated back. Shown in a neutral grey box, apart from answers; consecutive updates sit 8px apart, as one group (Oct 31, 2026, product). ⚠️ **Decision needed:** whether a closed chat also signals unread updates (e.g. a dot on the Sidebar's Ask Intercept Live), and whether every severity posts or only rising ones |

- ✅ **Resolved:** (Oct 28, 2026, for the prototype) Ask lives in the global Ask Intercept Live panel (PD-OD-04; one assistant, Spec §9.1 Principle 11). On this page the app header's sparkle opens it (the Patient Header's own Ask Intercept button was removed from Figma the same day). ✅ **Resolved:** scoped to the open patient (Oct 31, 2026, product): the app header's Ask Intercept button opens the chat about the patient on screen, shown as an "About {patient} ×" chip over the message box, and the button is filled (Solid · Neutral) meanwhile. Removing the chip, closing the chat or opening another patient makes the chat general again and the button plain. Opened from the Sidebar, the chat is about the patient on screen too (the chip, no question asked; Nov 6, 2026, user's call; it was general until then); on any other page it's general. ✅ **Resolved:** starts with the patient's overview (Nov 4, 2026, user's call): the button also asks "Quick overview" for the user, as Ask in a toast does. A conversation about anyone else (another patient, the census, the greeting) is cleared first, so the patient on screen is what the chat shows; a conversation already about them goes on, with the overview after it. ✅ **Resolved:** no "Open patient details" here (Nov 4, 2026, user's call): an answer's follow-ups leave it out for the patient whose page is open. ⚠️ **Gap:** the prototype's answers use the patient on screen by name; the real agent scopes its data to them.
- ✅ **Resolved:** the patient chip over the chat's message box shows the patient's avatar (photo, else initials in their color) before the name, in place of the word "About"; screen readers still hear "About Miller, Sarah".
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

✅ **Resolved:** a past time within the last 12 hours reads as a time ("8:10 AM"); anything older carries its date ("Nov 18, 8:10 AM"), so a stay of several days never shows a bare time. Labs, Chart, Orders and the care plan ([care-plan.md](care-plan.md)) write their times this way.

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
| **Hospital feed down** | Banner "{Hospital} data is delayed · last update 14:02"; affected values Stale (MON-051) |
| **Offline** | Everything Stale; actions that need the network disabled with a reason (MON-051) |
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
| **PD-132 Role-based actions** | Order actions for intensivists and APPs only, APP sign-off where required (PD-062); escalation targets by role (MON-OD-08). |
| **PD-133 Audit** | Opening the page, every section viewed and every action is logged with who and when (Spec §6.8). AI outputs shown are logged with their version. |
| **PD-134 Sanctioned integration story** | Nothing on this page may depict screen-operated extraction or overlay fallback paths in material Intercept shows externally (Brief). |
| **PD-135 Provenance** | Every value, alert, note and AI output shows its source on demand (Spec §9.1, Principle 6). |

---

## 18. Accessibility

WCAG 2.1 AA (Spec §9.1, Principle 13; ⚠️ **Decision needed:** 2.1 vs 2.2 is open, glossary conflict 2).

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
| **PD-150 Synthetic data** | All patients, results, notes, messages and camera imagery are synthetic (Brief). The reference patient is Sarah Miller (`sample-monitoring.ts` `p1`: MICU Bed 11, Sidney (Harbor Point General until Nov 6, 2026), SOFA 13, ventilated, on pressors), as in the exploration. |
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

ℹ️ Each tab's own criteria are in its PRD (the list in §3.2); these are the page's.

| ID | Criterion |
|---|---|
| PD-AC-01 | The patient's name and MRN are visible in every scroll position and section. |
| PD-AC-02 | Code status and allergies are always shown; an unknown value says so and is never blank. |
| PD-AC-03 | Opening the page from an alert shows that alert expanded with its evidence highlighted on the Timeline. |
| PD-AC-04 | Back returns to the Census or Monitoring with filters, sort and scroll as they were. |
| PD-AC-05 | Previous / next switch patients in the source list's order in under a second, keep the section, and announce the new patient. |
| PD-AC-06 | Every alert on the page can be acknowledged, escalated and resolved (or declined, for AI) with who and when shown. |
| PD-AC-08 | A gap in data is drawn as a gap; a stale value keeps its reading, dimmed, with its age; a missing value shows "--". |
| PD-AC-09 | Every value, result and note shows its source and time on demand. |
| PD-AC-10 | Every AI output is labeled with its agent, cites its sources, and never sends, saves or orders anything on its own. |
| PD-AC-13 | Ventilator and pump values are labeled by source and separate from monitored vitals. |
| PD-AC-15 | A user without privileges at the patient's hospital sees no patient data, including the name. |
| PD-AC-16 | Nothing on the page shows another tenant's data, or depicts screen-operated or overlay fallback paths in the prototype. |
| PD-AC-17 | Every interaction works by keyboard and with reduced motion on; every chart has a table alternative. |
| PD-AC-18 | Each page state in PD-122 shows its message, and each empty section says what's empty. |
| PD-AC-20 | On every tab, the clinician can act on what they read there (PD-163–PD-174) without leaving the tab, and the action shows on the Timeline's events lane. |
| PD-AC-21 | Every tab action reaches the app and survives a reload; none is kept only in the tab. |
| PD-AC-22 | A Critical Care RN sees only the actions their role allows; the others aren't shown. |

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

ℹ️ Each tab's own open decisions are in its PRD (the list in §3.2); these are the page's.

| ID | Decision | Owner | Exploration proposal |
|---|---|---|---|
| PD-OD-01 | ✅ **Resolved:** (Oct 28, 2026) "Patient details" is the page; the UI shows the patient's name and says "Open patient". "Chart" is reserved for the hospital's record (shown in the sections, or "Open chart in Epic"), since it can imply the EMR of record, which this page isn't in Overlay mode. "View" stays for display modes. | Product / Clinical | "Patient details" in the breadcrumb and title |
| PD-OD-02 | 🙋 Sections as tabs, or one scrolling page with a section index. | Design / Clinical | One page per direction, no tabs |
| PD-OD-03 | 🙋 Which surfaces a tenant can make mandatory, and whether that ships in v1. | Product | Not explored |
| PD-OD-04 | ✅ **Resolved:** (Oct 28, 2026, prototype) the global Ask Intercept Live panel, opened from the app header's sparkle. | Product / Design | A: a box on the page; C: @Intercept in the thread |
| PD-OD-06 | 🙋 How "last viewed" is recorded per clinician, and whether it comes from the access audit. | Product / Compliance | B: shading since last looked |
| PD-OD-07 | 🙋 Which sections ship in v1 (Overview, Timeline, Labs, Medications, Orders, Notes, Sepsis). | Product / Clinical | Overview, timeline, labs, drips, vent, sepsis criteria |
| PD-OD-10 | 🙋 The handoff format (I-PASS or Intercept's current sign-out), and where the incoming clinician reads it. | Clinical | A: I-PASS draft |
| PD-OD-11 | 🙋 One source of truth for patient threads between Messages and this page. | Product | C: one thread per patient, people and agents |
| PD-OD-12 | 🙋 Whether RNs author notes on this page. | Clinical | Not explored |
| PD-OD-13 | 🙋 Which demo scenarios use this page. | Product / Project | Not explored |
| PD-OD-14 | 🙋 The client's family-engagement idea: change request, roadmap or out (§1.4). | Product / Carlos | Not explored |
| PD-OD-17 | 🙋 Which tab actions write back to the hospital's record, which go as proposals to the bedside team, and which stay Intercept's own, per tenant and integration mode (Integrated or Overlay) (PD-160). | Product / Integration | Not explored |
| PD-OD-18 | 🙋 Who may annotate a value, acknowledge a critical result and reconcile home medications; whether the Critical Care RN can (PD-162). | Clinical | Not explored |
| PRD OD-01, OD-02, OD-07, OD-08, OD-09, OD-14, OD-16, OD-17 | Mandatory fields, acuity score, trend windows, respiratory parameters, sepsis states, error copy, code status and safety tags, overall condition. Shared with the Patient card PRD. | See `prds/patient-card.md` §23 | Code status, allergy and isolation as header badges; trends 1 h / 6 h / 24 h |
| MON-OD-07, MON-OD-08, MON-OD-10, MON-OD-11, MON-OD-13 | 🙋 Camera overlay placement, escalation targets, parameter palette, waveform set, concern severity. Shared with Monitoring. | See `prds/monitoring.md` §15 | As in the Monitoring exploration |

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

---

## ID notes (Oct 28, 2026)

- References to the Monitoring PRD were renamespaced to match it: `SV-0xx → MON-0xx`, `SV-OD-xx → MON-OD-xx`.
- ⚠️ **Decision needed:** this PRD mints `PD-xxx` (plus `PD-AC-`, `PD-OD-`, `PD-UC-`), which **collides with the Cowork `PD-` (Provider Desktop) requirement prefix**. It needs a repo-local namespace of its own — the name is Julio's choice (G0-3). It was **left unchanged** here; pick a namespace and renamespace it in a follow-up (see `CONVENTIONS.md` → "IDs").
- Each tab's PRD numbers its own acceptance criteria and open decisions (Nov 25, 2026, user's call): `PDO-` Overview, `PDT-` Timeline, `PDL-` Labs, `PDC-` Chart, `PDS-` Sepsis, `PDM-` Medications, `PDR-` Orders, `PDE-` EMR, each from 01 (`PDL-AC-01`, `PDR-OD-01`). A criterion or decision moved from this PRD says its old ID ("was PD-AC-07"); the numbers it left here stay unused. This PRD keeps `PD-AC-` and `PD-OD-` for the page.
