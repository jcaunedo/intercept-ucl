---
requirements: [PD-01, PD-02, PD-03, PD-04, PD-05, PD-09, SV-11, BR-09, UX-01, WF-01]
status: proposed — confirm with Carlos
---

<!--
Created: Nov 1, 2026
Created by: Julio Caunedo
Last updated: Nov 1, 2026
Scope: The Census page of Intercept Live (Provider Desktop, Spec §5.1): its purpose, how it differs from Monitoring, the patients it shows, its controls and states.
Purpose: Gives the Census one written purpose, next to Monitoring's, and lists the decisions still open, so the two pages stop overlapping by accident.
-->

# PRD — Census

**Product:** Intercept Live — Virtual Care OS  
**Module:** Provider Desktop (Single Pane of Glass) ★  
**Surface:** Census page  
**Version:** 0.1  
**Status:** Draft — pending clinical and product validation  
**Last updated:** November 1, 2026

---

## 1. Overview

✅ **Decision (Nov 1, 2026, product):** **the Census is where the clinician manages their patients; Monitoring is where they monitor their clinical status in real time.**

Managing patients means knowing who they are and where, finding them, keeping the roster true (admissions, transfers, discharges), deciding who to see first, and handing them off. Part of that is a **general picture of how each patient is doing at the moment**: their score, which way it's going, what support they're on. The Census shows that picture as information for managing, not as monitoring: it's a current state, not a live feed, and nothing on the page asks the clinician to act on it.

It's the page a shift starts on and the roster the clinician comes back to between tasks. It doesn't move on its own; it lets the clinician decide who to look at.

ℹ️ Until this PRD, the Census's purpose was written in three places that disagreed (see §1.3). This section replaces them.

### 1.1 Census and Monitoring

The two pages show the same patients and share the same shell, filters and sort vocabulary. They answer different questions.

| | Census | Monitoring |
|---|---|---|
| **Job** | Manage the patients | Monitor their clinical status in real time |
| **The question it answers** | Who are my patients, how are they doing in general, and what do I need to do for them? | What's happening to my patients right now, and do I need to act? |
| **When** | Start of shift, planning, between tasks, handoff | Continuously, through the shift (Spec §5.2: "a sustained workflow loop") |
| **Clinical status** | A general picture, current but not live: the score, its band and 24 h change, support and flags (CEN-016) | Live: vitals and waveforms as they arrive, trends, alerts as they fire |
| **Patients** | Everyone in the clinician's scope, across their hospitals (PD-01) | The panel the clinician watches ⚠️ (CEN-OD-02, MON-OD-01) |
| **Card** | Compact PatientCard: identity, location, score and 24 h change, flags | PatientMonitoringCard: identity, the alert bar, a live bedside monitor, score, flags |
| **Alerts** | Orientation only (CEN-020): no alert on the cards ⚠️ (CEN-OD-01) | Primary: the card's alert bar, ring, the triage queue |
| **Movement** | Cards never re-sort on their own | Cards re-sort with alerts (MON-013) |
| **Ends in** | Opening a patient | Acting: acknowledge, look in, escalate |

### 1.2 Product objectives

| Objective | What it means on this page |
|---|---|
| **Know the census** | Every patient in scope is on the page, grouped by hospital, with nobody missing or shown twice (PD-01, BR-09). |
| **Know how each is doing** | A general picture of each patient's current state, who is on a vent, on pressors, teetering or stable, reads from the cards without opening anyone (UX-01). It informs managing; it isn't monitoring. |
| **Find a patient fast** | Search, filters and sorts get to a patient or a group of patients in a few seconds (PD-03). |
| **Plan the shift** | The clinician can tell who to see first from acuity, trajectory and support, before any alert fires (WF-01). |
| **Stay honest about data** | Missing scores and data gaps are labeled, never shown as normal (SV-08). |
| **Keep the roster true** | Admissions, transfers and discharges show as they happen, and a transfer is never read as a discharge (SV-11). |

### 1.3 Where the purpose was written before

| Source | What it says | Status |
|---|---|---|
| PRD Monitoring §1 | "The Census page answers *who is on my census and who needs attention*." | ⚠️ **Conflict:** "who needs attention" overlaps Monitoring. Replaced by §1 here once agreed |
| Requirements UX-01, WF-01 | "The census answers who's on a vent, on pressors, teetering, stable — at a glance"; the shift scan: census by hospital → spot unstable → open patient | ✅ Kept: "teetering" and "spot unstable" read from the score and its trend (CEN-011), not from alerts |
| Decision, Oct 31, 2026 (PRD Patient card, DESIGN.md) | "The Census is for managing patients; Monitoring and the live feed show alerts": no alert on the cards, no re-sorting | ✅ Kept, and defined (Nov 1, 2026, product): managing includes a general picture of how each patient is doing (CEN-016), plus the roster tasks CEN-030–CEN-033 |

### 1.4 Source documents

1. Intercept Live — Virtual Care OS System Specification (`documents/Intercept Live - Virtual Care OS - System Specifications.md`), §5.1 Provider Desktop and §5.2 Surveillance ("census reconciliation").
2. Requirements Specification (`documents/specs/requirements-specification.md`): PD-01–PD-05, PD-09, SV-11, UX-01, WF-01.
3. Design Update Spec (`documents/specs/design-update-spec.md`): DU-06, DU-07, DU-08, DU-33.
4. PRD — Patient card (`prds/patient-card.md`) and PRD — Monitoring (`prds/monitoring.md`).
5. Figma: Intercept-Live › Census (`1:350`, `167:5543`).

⚠️ **Gap:** the Specification defers the Provider Desktop's screen-level requirements to a deep-dive document (§5-DD.1), which we don't have. Reconcile this PRD with it when it arrives.

---

## 2. Users and use cases

### 2.1 Users

| User | On this page they… |
|---|---|
| **Intensivist** | Take in the whole census across hospitals at the start of the shift and decide where to spend attention. |
| **Advanced Practice Provider (APP)** | Find their assigned patients, check who is changing, open a patient to work on them. |
| **Critical Care RN** | Know which patients they're covering, spot data gaps and support changes, hand patients off. |

### 2.2 Use cases

| ID | Use case | Description |
|---|---|---|
| CEN-UC-01 | **Shift scan** | At the start of the shift, the clinician reads the census by hospital, sees who is sickest and who is getting worse, and opens the first patient (WF-01). |
| CEN-UC-02 | **Find a patient** | Someone calls about "bed 7 at Chadron"; the clinician finds the patient by name, MRN, unit or bed. |
| CEN-UC-03 | **Review a group** | The clinician looks at everyone on organ support, everyone with a rising score, or everyone on sepsis watch. |
| CEN-UC-04 | **My patients** | The clinician narrows the census to the patients assigned to them this shift. |
| CEN-UC-05 | **Roster change** | A patient is admitted, transferred or discharged; the census shows it, and the clinician sees what changed (SV-11). ⚠️ Not built |
| CEN-UC-06 | **Handoff** | At the end of the shift, the clinician reviews their patients before handing off (HO-01). ⚠️ Not built; see CEN-033 |

---

## 3. Page architecture

The page uses the Provider Desktop shell shared with Monitoring: Sidebar (Census active), sticky AppHeader, the canvas.

| Region | Content | Requirements |
|---|---|---|
| **Hospital bar** | Hospital tabs (All hospitals, then each hospital), each with its patient count and active-alert count; **Group by location** at the right | CEN-001, CEN-020 |
| **Summary row** | "18 patients across 4 hospitals"; the live feed line ("Live feed: …"), which opens the live feed panel | CEN-001, CEN-021 ⚠️ |
| **Filter bar** | Search, My patients, quick views (Rising score, Organ support, Sepsis watch); Density, Sort by, Filters | CEN-002, CEN-003 |
| **Patients** | Cards (Comfortable, Compact) or a table (List); with Group by location, a column per hospital (board) | CEN-010–CEN-013 |
| **Panels** | The live feed panel beside the canvas; the Filters panel floating over the page (a Sheet, Nov 1, 2026) | CEN-003, CEN-021 |

ℹ️ The Census has no Card monitor or Monitor view controls: those are Monitoring's (MON-015).

---

## 4. Requirements

### 4.1 Who is on the page

| ID | Requirement | Status |
|---|---|---|
| **CEN-001 Scope** | Every patient in the clinician's scope across the hospitals they cover, **always grouped by hospital** (tabs; Group by location for sections or columns). Counts are per hospital. | ✅ Built. ⚠️ **Gap:** DU-06 asks for per-hospital counts only, without the "across 3 hospitals" summary, and for each hospital's EHR, time zone and connection status (PD-01) |
| **CEN-002 My patients** | A chip narrows the census to the clinician's assigned patients; off by default, so the census starts complete. | ✅ Built |
| **CEN-003 Filters** | Search (everything the card shows), quick views (one at a time) and the Filters panel (Unit, Highest alert, the score's bands with No score, Change in last 24 h, Organ support, Code status & safety, Sepsis). Only what the card shows: filters on live vitals and data gaps are Monitoring's (CEN-OD-07). Every option shows its count. Clear filters returns to the full census. | ✅ Built (PD-03). ⚠️ **Gap:** PD-03's "watchlist first" and "transferred in 24 h" aren't built |
| **CEN-004 Tenant isolation** | Patient data never crosses tenants; the census combines hospitals only within the clinician's coverage and privileges (BR-09). | ✅ By design |

### 4.2 What each patient shows

| ID | Requirement | Status |
|---|---|---|
| **CEN-010 Card** | The compact PatientCard (PRD Patient card): avatar, name, MRN, sex, age, hospital · unit · bed, the score (NEWS2) with its band and 24 h change, and flags (tags). No vitals and no alert (CEN-020). | ✅ Built. ⚠️ **Gap:** PD-04 also lists diagnosis, tier, key vitals with freshness and open alerts; this PRD leaves vitals and alerts to Monitoring, diagnosis and tier are open (CEN-OD-04) |
| **CEN-011 State at a glance** | "Teetering" reads from the score's band and its 24 h change (▲ in the medium or critical color, ▼ green); "on a vent, on pressors" from the flags (UX-01). | ✅ Built |
| **CEN-012 Densities** | Comfortable (default), Compact (the small card, one more a row) and List (a table: Patient, Location, Alert, the score, Change in 24 h, Tags). | ✅ Built (PD-02). ⚠️ **Gap:** PD-02's third view, "rail by tier", isn't built |
| **CEN-013 Order** | Sort by Score (default), Score change, Patient name, Recently viewed, Family messages (unread family messages first). The order is taken when the clinician changes the sort, filters or grouping, never when data changes: **cards never re-sort on their own.** No alert sorts: no Recent alerts (its cards show no alert) and no Recently resolved (alert history is Monitoring's). | ✅ Built (decisions, Oct 30–31 and Nov 1, 2026). ⚠️ **Gap:** the Census card doesn't show unread family messages, so the Family messages order doesn't explain itself on the cards |
| **CEN-014 Data honesty** | A missing score reads "-- Unknown", and the NEWS2 filter's No score finds those patients; missing is never zero (SV-08). | ✅ Built. ⚠️ **Gap:** no stale marking with age yet (PRD Patient card). ⚠️ **Decision needed:** how a data gap shows on the Census (CEN-OD-08) |
| **CEN-015 Open** | Clicking a card or row opens the patient's details; the census order becomes the patient list for stepping through (PD-05). | ✅ Built. ⚠️ **Gap:** PD-05's census side rail isn't built; the header's patient list stands in |
| **CEN-016 General status, not monitoring** | The card's clinical content is a general picture of the patient's current state: the score with its band, its 24 h change, and flags (support, code status, isolation). It updates when the data does, but nothing on the Census streams or flashes: no vitals, waveforms, live numbers or device alarms, and no prompt to act. Those are Monitoring's. | ✅ Decision (Nov 1, 2026, product) |

### 4.3 Alerts on the Census

The Census isn't where alerts are handled (§1.1), but a clinician scanning the roster needs to know that something is going on and where.

| ID | Requirement | Status |
|---|---|---|
| **CEN-020 Orientation, not action** | The Census shows **where** alerts are, never asks for action on them: the hospital tabs' alert counts (colored by the worst severity), the Filters panel's Highest alert, the List's Alert column. Cards show no alert pill or ring. | ✅ Built. ✅ **Decision (Nov 1, 2026, product):** the Highest alert filter stays, as orientation; the Active alerts chip is Monitoring's alone (removed from the Census later the same day, user's call), as are its who-to-see-first ranking and its sort on the click. ⚠️ **Decision needed:** the live feed (CEN-021, CEN-OD-01) |
| **CEN-021 Live feed** | The summary row's "Live feed: …" line names the latest change and opens the live feed panel (the triage queue) beside the census. | ✅ Built. ⚠️ **Decision needed:** whether the triage queue belongs on the Census at all (CEN-OD-01) |
| **CEN-022 Opening resolves (prototype only)** | In the prototype, opening a patient with an active alert from the Census marks it resolved for the session. | ⚠️ **Risk:** conflicts with PRD PC-071 (resolving needs a documented resolution) and with CEN-020. Proposal: remove it (CEN-OD-03) |

### 4.4 Managing patients

"For managing patients" (decision, Oct 31, 2026) means the roster tasks below. None is built yet beyond My patients.

| ID | Requirement | Status |
|---|---|---|
| **CEN-030 Roster changes** | An admission, transfer or discharge from ADT shows on the census as it happens: a new patient joins with a "New" mark, a transfer moves with a "Transferred from …" note, a discharge leaves after a short "Discharged" state. A transfer is never read as a discharge (SV-11; glossary "Census"). | ⚠️ Not built |
| **CEN-031 Reconciliation** | Where ADT isn't automated, a patient whose census state is uncertain shows "Pending reconciliation", and the clinician can confirm it (Spec §5.2). | ⚠️ Not built |
| **CEN-032 Watchlist** | The clinician flags a patient to watch; the flag persists across views and feeds the handoff (PD-09). | ⚠️ Not built. ⚠️ **Decision needed:** whether the watchlist is also how a patient joins the Monitoring panel (CEN-OD-02) |
| **CEN-033 Handoff** | From the Census, the clinician starts the end-of-shift handoff for their patients (HO-01, DU-31). | ⚠️ Not built. ⚠️ **Decision needed:** whether handoff starts here or on its own page |

---

## 5. States

| State | What the clinician sees | Status |
|---|---|---|
| **Empty census** | EmptyState: "No patients on the census" | ✅ Built |
| **No matches** | EmptyState: "No patients match these filters", with Clear filters | ✅ Built |
| **Loading** | Card skeletons in the last layout | ⚠️ Not built |
| **Hospital feed down** | A banner on that hospital's tab and section, with when data last arrived (DU-32) | ⚠️ Not built |
| **Restricted** | Patients the clinician isn't privileged for don't appear; a count notes how many are hidden | ⚠️ Not built (MON-OD-02) |

---

## 6. Acceptance criteria

| ID | Criterion |
|---|---|
| CEN-AC-01 | Every patient in scope appears once, grouped by hospital, and the hospital counts add up to the total. |
| CEN-AC-02 | With no filter, sort or grouping change, no card moves while data or alerts change. |
| CEN-AC-03 | No card shows an alert pill or ring; alert information appears only as counts, filters and the List's Alert column. |
| CEN-AC-04 | A patient's score band and 24 h change are readable on the card without opening it. |
| CEN-AC-09 | Nothing on the Census streams, flashes or shows a live value: no vitals, waveforms or device alarms (CEN-016). |
| CEN-AC-05 | A missing score or value is labeled, never shown as normal or zero. |
| CEN-AC-06 | Search, a quick view or a filter narrows the census and shows its count; Clear filters returns to the full census. |
| CEN-AC-07 | Opening a patient doesn't change any alert's state. (Today it does in the prototype: CEN-022.) |
| CEN-AC-08 | Everything works by keyboard and with reduced motion on. |

---

## 7. Open decisions

| ID | Decision | Options | Proposal |
|---|---|---|---|
| CEN-OD-01 | How much alert information stays on the Census | (a) Counts, filters and the List column only (today, minus the feed); (b) today's set, with the live feed panel; (c) nothing: alerts only on Monitoring | **(a)**: enough to know where to look, nothing to act on. The live feed and triage queue move to Monitoring only. ✅ **Partly decided (Nov 1, 2026, product):** counts and Highest alert stay as orientation; the Active alerts chip and Recently resolved moved to Monitoring. The live feed is still open |
| CEN-OD-02 | Who is on the Monitoring panel, against the Census | (a) The same patients on both; (b) Monitoring shows a watchlist the clinician builds from the Census; (c) Monitoring shows the shift assignment | **(b)** or **(c)**, with the Census always complete. Settles MON-OD-01 too |
| CEN-OD-03 | Opening a patient from the Census resolves their alert (prototype) | Keep; remove | **Remove**: it breaks PC-071 and CEN-020 |
| CEN-OD-04 | PD-04's fields not on the card: diagnosis, tier, key vitals, open alerts | Add to the card; show in the List only; leave to Patient details | Diagnosis on the card if it fits one line; vitals and alerts stay on Monitoring |
| CEN-OD-05 | PD-02's "rail by tier" view | Build; drop; replace with Group by location's board | Ask what "tier" means here (acuity band or level of care) before deciding |
| CEN-OD-06 | Default sort | Score; Score change; Name | **Score** (today): the sickest first fits the shift scan |
| CEN-OD-07 | Filters on vitals the card doesn't show (Out of range, Data gap, Vitals out of range) | ✅ **Resolved (Nov 1, 2026, product):** they're live monitoring data, so they're Monitoring's. Removed from the Census: the Out of range and Data gap quick views and the Vitals out of range group. Monitoring already covers them: the Outside limits chip, Outside alarm limits with Not reporting in its Filters panel, and the "not reporting" System alert (MON-051). The Census keeps No score in its NEWS2 group | — |
| CEN-OD-08 | How a data gap shows on the Census. A vital that stops reporting can make the patient's score, and so their general status, unreliable (CEN-016) | A note on the card ("Score incomplete: SpO₂ not reporting"); a mark on the score; nothing, leaving it to Monitoring | ⚠️ **Decision needed (Nov 1, 2026, product: work on it later):** likely a short message on the card, as information, not an alert to act on |
