---
requirements: [PD-01, PD-02, PD-03, PD-04, PD-05, PD-09, SV-08, SV-11, BR-09, UX-01, WF-01]
status: proposed — confirm with Carlos
---

<!--
Created: Nov 1, 2026
Created by: Julio Caunedo
Last updated: Nov 24, 2026
Scope: The Patients page of Intercept Live (Provider Desktop, Spec §5.1), the Census page until Nov 16, 2026: its purpose, how it differs from Monitoring, the patients it shows, its search, filters, sorts, views and states, and the data it depends on.
Purpose: Makes Patients the patient directory and record-retrieval surface, with one written purpose next to Monitoring's, so the two pages stop overlapping, and lists the decisions and data dependencies still open.
Renamed: prds/census.md (PRD Census) → prds/patients.md (PRD Patients) on Nov 16, 2026. Requirement IDs keep the CEN- prefix, already cited in commits, the CHANGELOG and the trace.
Redesigned: Nov 17, 2026, from a Monitoring-like roster of cards to a patient directory (table by default).
-->

# PRD — Patients

**Product:** Intercept Live — Virtual Care OS  
**Module:** Provider Desktop (Single Pane of Glass) ★  
**Surface:** the Sidebar's **Patients** page (page key `Patients`; code in `src/layouts/intercept-live/patients/`: `PatientsPanel`, `PatientsTable`, `patients-filters.tsx`, `patient-status.ts`; the `census/` folder until Nov 16, 2026; the patient data keeps the census name: `CensusPatient`, `sample-data/sample-census.ts`)  
**Audience:** Intensivists, APPs and Critical Care RNs  
**Version:** 0.3  
**Status:** Draft — pending clinical and product validation  
**Last updated:** November 24, 2026

---

## 1. Overview

ℹ️ This PRD was **PRD Census** until Nov 16, 2026. Its IDs keep the `CEN-` prefix. In the text below, "the Census" written before that date means this page; **the census** itself, the patients in hospital now, is Monitoring's (PRD Monitoring, "The census").

~~**The Census is where the clinician manages their patients; Monitoring is where they monitor their clinical status in real time.**~~ ~~✅ **Resolved:** **Patients is where the clinician finds and manages every patient their program has treated, in hospital or not; Monitoring is where they watch the patients in hospital now, in real time.**~~ ✅ **Resolved:** **Patients is the patient directory: where the clinician finds, identifies and reopens the record of any patient they're authorized to see, in hospital now or not. Monitoring is where they watch the patients under their active coverage, in real time.**

| Page | The question it answers |
|---|---|
| **Monitoring** | *Who needs my clinical attention right now?* |
| **Patients** | *How do I find or return to a patient's record?* |

That distinction drives the page's data hierarchy, filters, sorts and visual emphasis. Patients leads with who the patient is, ~~whether they're current, transferred or discharged~~ their status (in hospital and at what level of care, followed at home, discharged or transferred), where they are (or last were) and how the clinician is related to them. It doesn't rank, color or move patients by acuity or alerts.

~~Managing patients means knowing who they are and where, finding them (including after they've gone home), looking back at a past stay, keeping the roster true (admissions, transfers, discharges), deciding who to see first, and handing them off. Part of that is a **general picture of how each patient is doing at the moment**: their score, which way it's going, what support they're on. The Census shows that picture as information for managing, not as monitoring: it's a current state, not a live feed, and nothing on the page asks the clinician to act on it.~~ ✅ **Resolved:** deciding who to see first and the general picture of how each patient is doing (the score, its 24 h change) are Monitoring's. Patients keeps only the clinical context that helps tell patients apart (a few flags: ventilated, pressors, dialysis, isolation, DNR, fall risk), as secondary information.

~~It's the page a shift starts on and the roster the clinician comes back to between tasks.~~ ✅ **Resolved:** a shift starts on Monitoring (PRD Sidebar NAV-020); Patients is where the clinician goes to find anyone, return to someone they saw, or look back at a past stay. It doesn't move on its own.

✅ **Resolved:** the Census page becomes **Patients** in the Sidebar (PRD Sidebar NAV-020): the full list of everyone the clinician is authorized to see, whether they're in hospital or not. The patients in hospital now, the census itself, are Monitoring's. ~~The page keeps its controls and cards; what changes is who is on it (CEN-001).~~ ✅ **Resolved:** the page's controls and layout change with its purpose (§3): search first, a table by default, directory filters and sorts.

### 1.1 Patients and Monitoring

~~The two pages show the same patients and share the same shell, filters and sort vocabulary.~~ ~~✅ **Resolved:** Monitoring shows the patients in hospital now (the census); Patients shows them and everyone treated before. The two share the same shell, filters and sort vocabulary. They answer different questions.~~ ✅ **Resolved:** Monitoring shows the patients in hospital now (the census); Patients shows them and everyone treated before. They share the shell and the controls' components (search, chips, the Filters panel, Sort), not their content: each page's filters and sorts serve its own question. Capabilities aren't duplicated between them.

| | Patients | Monitoring |
|---|---|---|
| **Job** | ~~Manage the patients~~ ✅ **Resolved:** Find a patient and open their record | Monitor their clinical status in real time |
| **The question it answers** | ~~Who are my patients, how are they doing in general, and what do I need to do for them?~~ ~~✅ **Resolved:** Who has my program treated, where are they now, and how are they doing in general?~~ ✅ **Resolved:** How do I find or return to a patient's record? | Who needs my clinical attention right now? |
| **When** | ~~Start of shift, planning, between tasks, handoff~~ ✅ **Resolved:** Finding a patient, returning to one, reviewing who's related to the clinician, looking back at a stay | Continuously, through the shift (Spec §5.2: "a sustained workflow loop") |
| **Focus** | Patient identity, current and historical records, location, the attending, admission and status, ~~recent activity~~ last encounter, record retrieval | Active coverage, NEWS2, deterioration, alerts, organ support, clinical state, real-time monitoring |
| **Clinical status** | ~~A general picture, current but not live: the score, its band and 24 h change, support and flags (CEN-016)~~ ✅ **Resolved:** Secondary clinical context only: a few flags (CEN-016). No score, no change, no vitals | Live: vitals and waveforms as they arrive, trends, alerts as they fire |
| **Patients** | ~~Everyone in the clinician's scope, across their hospitals (PD-01)~~ ✅ **Resolved:** everyone ever treated in the clinician's scope, in hospital or not (CEN-001) | The census: the patients in hospital now, across the hospitals the clinician covers (⚠️ **Decision needed:** CEN-OD-02, MON-OD-01) |
| **Default view** | ~~Compact PatientCard: identity, location, score and 24 h change, flags~~ ✅ **Resolved:** a table (CEN-012); cards as an alternate view, without the score line | PatientMonitoringCard: identity, the alert bar, a live bedside monitor, score, flags |
| **Alerts** | ~~Orientation only (CEN-020): no alert on the cards (no badge, no ring); the hospital tabs' counts, Highest alert and the List's Alert column ⚠️ (CEN-OD-01)~~ ✅ **Resolved:** none (CEN-020) | Primary: the card's alert bar, ring, the triage queue |
| **Hospitals** | ~~Tabs~~ ✅ **Resolved:** a filter (CEN-007) | Tabs |
| **Movement** | Rows and cards never re-sort on their own | Cards re-sort with alerts (MON-013) |
| **Ends in** | Opening a patient | Acting: acknowledge, look in, escalate |

### 1.2 Purpose and primary user jobs

**Purpose:** the patient directory and record-retrieval surface, across current and historical patients.

| Job | How the page serves it |
|---|---|
| **Find a specific patient quickly** | Search leads the page: name, MRN, hospital, unit, room or bed (CEN-005) |
| **See where a patient is now** | Location in its own column; for a patient no longer in hospital, their last location, marked as such (CEN-041) |
| **Tell whether the patient is still in hospital, and where in their care** | The Status column and badge, a word and an icon: ICU, Step-down, Med-surg, Home monitoring, Discharged… (CEN-040), prominent and filterable (CEN-044) |
| **Find the patients who left the ICU** | The **Left the ICU** chip and filter, each patient's status saying where they are now (CEN-045) |
| **Return to recently accessed patients** | Recently viewed: the default sort ~~and a chip~~ (CEN-013) |
| **Find the patients associated with the clinician** | My patients (chip) and Care team (Filters) (CEN-006, CEN-042) |
| **Open the patient chart** | The whole row or card opens it; by keyboard, the name (CEN-015) |

### 1.3 Explicit non-goals

Patients is **not**:

- the real-time clinical monitoring workspace,
- a deterioration dashboard,
- an alert queue,
- a replacement for Monitoring.

So it has no live feed, no alert counts or alert columns, no NEWS2 column or NEWS2-first order, no Rising score, Organ support, Sepsis watch or New patients quick filters, and no wording that calls it the clinician's live census.

### 1.4 Information hierarchy

1. Patient identity (avatar, name, MRN, sex, age)
2. Patient status (Admitted · ICU, Admitted · Step-down, Home monitoring, Discharged…)
3. Location (hospital, unit, room and bed)
4. ~~Care relationship (My patient, Care team, attending)~~ Attending (the doctor in charge)
5. ~~Recent activity (last chart activity)~~ Last encounter (the latest stay: when it began, or when it ended)
6. Secondary clinical metadata (flags; the table only)

### 1.5 Product objectives

| Objective | What it means on this page |
|---|---|
| **Know every patient** | ~~**Know the census:**~~ Every patient in scope, in hospital or not, is on the page, ~~grouped by hospital,~~ with nobody missing or shown twice (PD-01, BR-09). |
| ~~**Know how each is doing**~~ | ~~A general picture of each patient's current state, who is on a vent, on pressors, teetering or stable, reads from the cards without opening anyone (UX-01). It informs managing; it isn't monitoring.~~ ✅ **Resolved:** Monitoring's (UX-01 is read there). |
| **Find a patient fast** | Search, filters and sorts get to a patient or a group of patients in a few seconds (PD-03). |
| ~~**Plan the shift**~~ | ~~The clinician can tell who to see first from acuity, trajectory and support, before any alert fires (WF-01).~~ ✅ **Resolved:** Monitoring's (WF-01's shift scan). |
| **Never mistake history for absence** | A patient who's been discharged or transferred is shown with that status, never as if they didn't exist; a transfer is never read as a discharge (SV-11). |
| **Stay honest about data** | Missing values are labeled ("—", "Status unknown"), never shown as normal (SV-08). |

### 1.6 Where the purpose was written before

| Source | What it says | Status |
|---|---|---|
| PRD Monitoring §1 | "The Census page answers *who is on my census and who needs attention*." | ✅ **Resolved:** replaced. PRD Monitoring §1 now points here: Patients finds and reopens records; who needs attention is Monitoring's |
| Requirements UX-01, WF-01 | "The census answers who's on a vent, on pressors, teetering, stable — at a glance"; the shift scan: census by hospital → spot unstable → open patient | ~~✅ Kept: "teetering" and "spot unstable" read from the score and its trend (CEN-011), not from alerts~~ ✅ **Resolved:** these are about the census, the patients in hospital now, so they're Monitoring's |
| Decision, Oct 31, 2026 (PRD Patient card, DESIGN.md) | "The Census is for managing patients; Monitoring and the live feed show alerts": no alert on the cards, no re-sorting | ✅ Kept and extended: no alert anywhere on Patients, and no score on its cards (CEN-010, CEN-020) |
| Left Nav Spec | Patients: "Directory of anyone ever treated, including patients no longer on the census" (Decided June 2026) | ✅ Kept: this PRD builds it |

### 1.7 Source documents

1. Intercept Live — Virtual Care OS System Specification (`documents/Intercept Live - Virtual Care OS - System Specifications.md`), §5.1 Provider Desktop and §5.2 Surveillance ("census reconciliation").
2. Requirements Specification (`documents/specs/requirements-specification.md`): PD-01–PD-05, PD-09, SV-08, SV-11, UX-01, WF-01, and the Patient / Encounter data contract ("Census status: admitted / transferred / discharged / pending reconciliation / unknown").
3. Design Update Spec (`documents/specs/design-update-spec.md`): DU-06, DU-07, DU-08, DU-33.
4. Intercept Live — Left Nav Spec (`documents/Intercept Live — Left Nav Spec.md`): Patients as a directory; ⌘K search.
5. PRD — Patient card (`prds/patient-card.md`), PRD — Monitoring (`prds/monitoring.md`), PRD — Census list (`prds/census-list.md`).
6. Figma: Intercept-Live › Census (`1:350`, `167:5543`). ⚠️ **Gap:** the directory redesign (Nov 17, 2026) is in code only; Figma still shows the Census.

⚠️ **Gap:** the Specification defers the Provider Desktop's screen-level requirements to a deep-dive document (§5-DD.1), which we don't have. Reconcile this PRD with it when it arrives.

---

## 2. Users and use cases

### 2.1 Users

| User | On this page they… |
|---|---|
| **Intensivist** | ~~Take in the whole census across hospitals at the start of the shift and decide where to spend attention.~~ ✅ **Resolved:** Find a patient a hospital calls about, return to one they saw earlier, look up a patient who was transferred or went home. |
| **Advanced Practice Provider (APP)** | Find their assigned patients and open one to work on them. |
| **Critical Care RN** | Find the patients they're covering, check where a patient went, reopen a recent chart. |

### 2.2 Use cases

| ID | Use case | Description |
|---|---|---|
| ~~CEN-UC-01~~ | ~~**Shift scan**~~ | ~~At the start of the shift, the clinician reads the census by hospital, sees who is sickest and who is getting worse, and opens the first patient (WF-01).~~ ✅ **Resolved:** Monitoring's. |
| CEN-UC-02 | **Find a patient** | Someone calls about "bed 7 at Chadron"; the clinician finds the patient by name, MRN, hospital, unit or bed. |
| ~~CEN-UC-03~~ | ~~**Review a group**~~ | ~~The clinician looks at everyone on organ support, everyone with a rising score, or everyone on sepsis watch.~~ ✅ **Resolved:** Monitoring's. Patients can still narrow by clinical context, as a secondary filter (CEN-003). |
| CEN-UC-04 | **My patients** | The clinician narrows the directory to the patients assigned to them, current or past. |
| CEN-UC-05 | **Roster change** | A patient is admitted, transferred or discharged; ~~the census shows it, and the clinician sees what changed (SV-11).~~ ✅ **Resolved:** their status on Patients follows (CEN-040); seeing roster changes as they happen is Monitoring's (CEN-030). |
| CEN-UC-06 | **Handoff** | ~~At the end of the shift, the clinician reviews their patients before handing off (HO-01).~~ ✅ **Resolved:** handoff starts from the account menu (PRD Account menu ACM-031), not here. |
| CEN-UC-07 | **Return to a patient** | The clinician reopens a patient they looked at earlier today or this week (Recently viewed). |
| CEN-UC-08 | **Look back at a past stay** | The clinician finds a discharged or transferred patient, sees when they left and where to, and opens the record. |

---

## 3. Page architecture

The page uses the Provider Desktop shell shared with Monitoring: Sidebar (Patients active), sticky AppHeader, the canvas.

~~| **Hospital bar** | Hospital tabs (All hospitals, then each hospital), each with its patient count and active-alert count; **Group by hospital** at the right | CEN-001, CEN-020 |~~
~~| **Summary row** | "18 patients across 4 hospitals"; the live feed line ("Live feed: …"), which opens the live feed panel | CEN-001, CEN-021 |~~
~~| **Filter bar** | Search, My patients, quick views (New patients, Rising score, Organ support, Sepsis watch); Density, Sort by, Filters | CEN-002, CEN-003 |~~
~~| **Patients** | Cards (Comfortable, Compact) or a table (List); with Group by hospital, a column per hospital with patients | CEN-010–CEN-013 |~~

✅ **Resolved:** the hospital bar, the "26 patients across 4 hospitals" summary, the live feed line and panel, Group by hospital (board and sections) and the Comfortable / Compact / List densities are gone. The page reads, top to bottom:

```
36 patients

[ 🔍 ] [ Filters ] [ My patients ] [ Admitted ] [ Left the ICU ]   [ ↕ Recently viewed ▾ ] [ All statuses ▾ ] [ All hospitals ▾ ] [ All units ▾ ] [ Table | Cards ]

(the patients: a table by default, or cards)
```

~~Search on its own full-width row, then the chips with Hospital, Unit and Filters, then a results row with the count, Sort and the view switch.~~ ✅ **Resolved:** one filter bar row, as on Monitoring: the search and the chips on the left; the view switch, Sort, Hospital, Unit and Filters on the right. The count is part of the title.

| Region | Content | Requirements |
|---|---|---|
| **Header** | ~~The page title, **Patients**, with the count after it, muted ("Patients 36"; "Patients 11 of 36" while filtered; read as "36 patients"). And "Find and manage patients across your authorized hospitals."~~ ✅ **Resolved:** the page summary styled as Monitoring's (a 2xl regular `h1`, its count bold): "**36 patients**", "**11 of 36 patients**" while filtered. No description line, no hospital count (Monitoring's says "across 4 hospitals"; here hospital is only a filter) | CEN-001 |
| ~~**Search**~~ | ~~The page's primary control, full width up to about 768px, 40px tall, always open~~ ✅ **Resolved:** first in the filter bar (CEN-005) | CEN-005 |
| **Filter bar** (sticky) | One row, as on Monitoring: Search, ~~My patients~~ ✅ **Resolved:** Filters (an icon button right of the search, its name in a tooltip, the picked count on its corner), then My patients, Current~~, Recently viewed~~ (chips); then on the right ~~Table / Cards, Sort, Hospital and Unit menus, Filters~~ ✅ **Resolved:** Sort, the Hospital and Unit menus, then Table / Cards last (as Monitoring's view controls follow its Sort). ✅ **Resolved:** the chips are My patients, **Admitted** (it was Current) and **Left the ICU**; a **Status** menu joins the menus, first, before Hospital and Unit (CEN-044, CEN-045) | CEN-003, CEN-006, CEN-007, CEN-044 |
| ~~**Results row** (sticky, with the filter bar)~~ | ~~The count ("34 patients", "11 of 34 patients"); Sort; the Table / Cards switch~~ ✅ **Resolved:** the count is in the title; Sort and the switch are in the filter bar | CEN-012, CEN-013 |
| **Patients** | Table (default) or Cards; 50 at a time, then **Show 50 more** | CEN-010, CEN-012 |
| **Panels** | The Filters panel floating over the page (a Sheet; the alert toasts hide while it's open). No live feed panel | CEN-003 |

ℹ️ Patients has no Card monitor, Monitor view, Density or Group by hospital controls: those are Monitoring's (MON-015).

ℹ️ The page's search covers Patients only. The app's ⌘K search, broader Clinical search across patients, notes, orders and messages (Left Nav Spec §6.9), stays in the app header; the page doesn't repeat it.

---

## 4. Requirements

### 4.1 Who is on the page

| ID | Requirement | Status |
|---|---|---|
| **CEN-001 Scope** | ~~Every patient in the clinician's scope across the hospitals they cover~~ ✅ **Resolved:** every patient the clinician is authorized to see across their hospitals, whether they're in hospital or not, ~~**always grouped by hospital** (tabs; Group by hospital for sections or columns). Counts are per hospital.~~ ✅ **Resolved:** in one list, current and past together, each with their status (CEN-040). Hospital is a filter (CEN-007), never a grouping or a navigation level. ✅ **Resolved:** the directory is the record of **every patient the program has ever touched**: on a census it covered, consulted on, alerted about, seen on the bedside camera or a video consult, or messaged about, at any hospital in the clinician's scope. Nobody is ever removed from it; only their status changes (CEN-040), so a clinician can always find a patient they cared for and see whether they're still in hospital. | ⚠️ **Not built:** the prototype holds the census and the sample past patients, not everyone touched; what counts as touched and how long a record stays are CEN-OD-16 and CEN-OD-17. ✅ Built in the prototype: the census (26, Current), eight past patients (6 Discharged, 2 Transferred; `samplePastPatients`) and two with an uncertain status (one Pending reconciliation, one Status unknown; `sampleUncertainStatusPatients`), so every status shows. ⚠️ **Gap:** DU-06 asks for each hospital's EHR, time zone and connection status (PD-01); they belong to the hospital, not the directory, and aren't shown |
| **CEN-002 My patients** | A chip narrows the directory to the clinician's assigned patients (`mine`), current and past; off by default, so the directory starts complete. | ✅ Built |
| **CEN-003 Filters** | ~~Search (everything the card shows), quick views (one at a time) and the Filters panel (Unit, Highest alert, the score's bands with No score, Change in last 24 h, Organ support, Code status & safety, Sepsis).~~ ✅ **Resolved:** the Filters panel's groups, in order: **Hospital**, **Unit** (the units in the hospitals picked), **Care team** (On my care team, then each attending of record), **Patient status** (~~Current, Pending reconciliation, Transferred, Discharged, Status unknown, as the data has them~~ ✅ **Resolved:** in two parts, **In hospital**: ICU, Step-down, Med-surg, Pending reconciliation; **Not in hospital**: Home monitoring, Discharged, Transferred; then Status unknown; as the data has them; set together with the Status menu, CEN-044), **ICU stay** (✅ **Resolved:** Left the ICU in the last 24 h, 7 days or 30 days, CEN-045), ~~**Last activity**~~ **Last encounter** (Today, Last 7 days, Last 30 days; ✅ **Resolved:** a stay still going counts in every window, one that ended by when it ended), and last, secondary, **Clinical context** (Ventilated, On pressors, Dialysis, Isolation, DNR, Fall risk). No score, alert, sepsis or live-data group. Every option shows its count. Clear filters returns to everyone. ✅ **Resolved:** the **Unit** group lists **Hospital at home** under each hospital that runs a program (CEN-043). | ✅ Built (PD-03). ✅ Built: Patient status splits Admitted by level (Admitted · ICU, · Step-down, · Med-surg, · Other unit), most intensive first. ⚠️ **Not built:** the In hospital / Not in hospital headings, Home monitoring, ICU stay and Hospital at home. ⚠️ **Gap:** PD-03's "watchlist first" isn't built (CEN-032); its "transferred in 24 h" is Patient status: Transferred with Last encounter: Today, not one option |
| **CEN-004 Tenant isolation** | Patient data never crosses tenants; the directory combines hospitals only within the clinician's coverage and privileges (BR-09). | ✅ By design |
| **CEN-005 Search** | The page's primary control, ~~first under the title~~ ✅ **Resolved:** first in the filter bar, before the chips, as on Monitoring, ~~always open (320px, never a collapsed magnifier)~~ ✅ **Resolved:** and like Monitoring's: a magnifier while empty and unfocused, opening to 240px on click or focus and pushing the chips along; "Search" as its placeholder, "Search patients" as its name. ~~"Search patients by name, MRN, hospital, unit, or bed".~~ "Search patients by name, MRN, hospital, unit, or bed". Every word typed must appear in the patient's name, MRN, hospital, unit, room or bed (commas ignored, so "Miller, Sarah" works); it narrows the results as typed and clears with its × or Escape. It doesn't search scores, alerts or flags. | ✅ Built. ⚠️ **Gap:** date of birth isn't searchable: the data has no DOB (§4.6) |
| **CEN-006 Primary chips** | **My patients** and ~~**Current** (status Current)~~ ✅ **Resolved:** **Admitted** (in hospital at any level of care, Hospital at home included; it was **Current**), and **Left the ICU** (CEN-045)~~ and **Recently viewed** (opened by the clinician in the last 7 days)~~, each a toggle with its count; they combine with each other and with the Filters panel. They replace the Monitoring-oriented quick views. ✅ **Resolved:** no Recently viewed chip; returning to a patient is the default sort's job (CEN-013). | ✅ Built: My patients and Admitted. ⚠️ **Not built:** Left the ICU. ~~⚠️ **Decision needed:** Recently viewed's window (7 days; CEN-OD-12)~~ |
| **CEN-007 Hospital and Unit** | Hospital is a filter, never a mode: a **Hospital** menu ("All hospitals", then each hospital, several can be checked) and a **Unit** menu beside it, in the filter bar's right side after Sort, before Filters. They set the Filters panel's Hospital and Unit groups, so both always agree; picking hospitals drops units outside them. Narrower than ~~900px~~ 1400px of page (the bar is one row now), the two menus hide and the Filters panel holds them. | ✅ Built |

### 4.2 What each patient shows

| ID | Requirement | Status |
|---|---|---|
| **CEN-010 Row and card** | ~~The compact PatientCard (PRD Patient card): avatar, name, MRN, sex, age, hospital · unit · bed, the score (NEWS2) with its band and 24 h change, and flags (tags). No vitals, no alert (CEN-020).~~ ✅ **Resolved:** in the information hierarchy's order (§1.4). **Table:** Patient (avatar, name, MRN · sex · age), Status, Location (~~hospital; unit · room - bed~~ ✅ **Resolved:** one line, as on the patient cards and the Patient Header: "Sidney Regional · SICU · Bed 2"; only the hospital truncates), ~~Care relationship,~~ Attending, ~~Last activity~~ Last encounter, Clinical context (up to two flags, then "+n"; ✅ **Resolved:** each flag opens its details as on the patient cards, PRD Patient card "Flag details", without opening the row), ~~Last viewed,~~ and the "…" menu. ✅ **Resolved:** no Last viewed column; when the clinician last opened a patient still drives Recently viewed (~~the chip and~~ the default sort). **Cards** (PatientCensusCard without score or alert): identity, location, the status ~~and relationship badges~~ badge, "Attending: …", ~~"Last activity …", then the flags~~ "Last encounter: …". No score, change, vitals or alert in either. ✅ **Resolved:** the cards show no flags and no "No tags" line; the flags stay in the table's Clinical context column and the Filters panel. ✅ **Resolved:** **Last encounter** is the patient's latest stay (glossary "Admission / encounter"), not their latest chart activity: "Admitted 3 days ago" while they're in hospital (Current, Pending reconciliation), "Ended 19 hr ago" once they've left (transferred or discharged), the exact time in its tooltip. | ✅ Built. ⚠️ **Gap:** PD-04 also lists diagnosis and tier (CEN-OD-04) |
| ~~**CEN-011 State at a glance**~~ | ~~"Teetering" reads from the score's band and its 24 h change; "on a vent, on pressors" from the flags (UX-01).~~ | ✅ **Resolved:** Monitoring's. Patients shows flags as context only |
| **CEN-012 Views** | ~~Comfortable (default), Compact and List (a table: Patient, Location, Alert, the score, Change in 24 h, Tags).~~ ✅ **Resolved:** **Table** (default) and **Cards**, a two-option switch ~~beside Sort~~ ✅ **Resolved:** at the end of the filter bar, after the Unit menu. The table is the default on a desktop (wider than 768px) because it scans, sorts and compares better and scales past a few dozen patients; narrower, Cards is the default, until the clinician picks one. 50 patients show, then **Show 50 more** adds the next 50; search, filters, counts and sorts always cover everyone. | ✅ Built (PD-02). ~~PD-02's "rail by tier"~~ ✅ **Resolved:** not on Patients (CEN-OD-05). ⚠️ **Gap:** no server paging or virtualization yet: an API returning thousands needs paged loading (§4.6) |
| **CEN-013 Order** | ~~Sort by Score (default), Score change, Patient name, Recently viewed, Family messages.~~ ✅ **Resolved:** **Recently viewed** (default: the latest first, then patients never viewed by name), Patient name, ~~Most recent activity~~ Most recent encounter (✅ **Resolved:** stays still going first, the latest admission first, then stays that ended, the latest end first), Admission date (latest first), Hospital (then unit), Unit. ~~NEWS2 last, as an option only.~~ ✅ **Resolved:** no NEWS2 sort: ranking by acuity is Monitoring's. The order is taken when the clinician changes the sort, search or filters, never when data changes: **rows and cards never re-sort on their own.** No alert or family-message sorts. | ✅ Built |
| **CEN-014 Data honesty** | ~~A missing score reads "-- Unknown", and the NEWS2 filter's No score finds those patients; missing is never zero (SV-08).~~ ✅ **Resolved:** a missing status reads "Status unknown" (never Admitted); a missing last encounter or clinical context reads "—" (screen readers: "Unknown", "None"); ~~a patient with no relationship recorded reads "—".~~ ✅ **Resolved:** a patient with no attending recorded reads "—" ("No attending recorded"). Missing is never shown as normal (SV-08). | ✅ Built |
| **CEN-015 Open** | ~~Clicking a card or row opens the patient's details; the census order becomes the patient list for stepping through (PD-05).~~ ✅ **Resolved:** the whole row or card opens the patient's page; by keyboard, the patient's name is the row's button (Enter or Space), and the card's name is its open target. The page's order becomes the list the patient's page steps through (PD-05); the census list on the patient's page still shows only the patients in hospital (PRD Census list). No "View patient" button. A "…" menu holds **Open patient** and **Copy patient link**; no clinical actions (escalate, huddle, video consult) in the directory. | ✅ Built. ⚠️ **Gap:** what a discharged patient's page shows (CEN-OD-15) |
| **CEN-016 Clinical context, not status** | ~~The card's clinical content is a general picture of the patient's current state: the score with its band, its 24 h change, and flags. It updates when the data does, but nothing on the Census streams or flashes.~~ ✅ **Resolved:** the only clinical content is the flags that help tell patients apart (Ventilated, pressors, Dialysis, isolation, DNR, Fall risk), as secondary context. Nothing streams, flashes or prompts action. | ✅ Built |

### 4.3 Alerts on Patients

~~Patients isn't where alerts are handled (§1.1), but a clinician scanning the roster needs to know that something is going on and where.~~ ✅ **Resolved:** Patients shows no alert information. Alerts reach the clinician everywhere through the toasts and the Sidebar's Monitoring dot; Monitoring handles them.

| ID | Requirement | Status |
|---|---|---|
| **CEN-020 No alerts** | ~~The Census shows **where** alerts are, never asks for action on them: the hospital tabs' alert counts, the Filters panel's Highest alert, the List's Alert column.~~ ✅ **Resolved:** no alert counts, columns, filters, badges or rings on Patients. | ✅ Built |
| ~~**CEN-021 Live feed**~~ | ~~The summary row's "Live feed: …" line names the latest change and opens the live feed panel (the triage queue) beside the census.~~ | ✅ **Resolved:** removed from Patients; the live feed is Monitoring's and the app's live feed panel's |
| ~~**CEN-022 Opening resolves (prototype only)**~~ | ~~In the prototype, opening a patient with an active alert from the Census marks it resolved for the session.~~ | ✅ **Resolved:** removed: opening a patient from Patients never changes an alert (CEN-AC-07) |

### 4.4 Managing patients

| ID | Requirement | Status |
|---|---|---|
| **CEN-030 Roster changes** | An admission, transfer or discharge from ADT changes the patient's status on Patients (CEN-040). ~~A new patient joins with a "New" mark, a transfer moves with a "Transferred from …" note, a discharge leaves after a short "Discharged" state.~~ ✅ **Resolved:** seeing roster changes as they happen is Monitoring's (the census); Patients shows where each patient now stands. A transfer is never read as a discharge (SV-11). | ✅ Built (status). ⚠️ **Gap:** on Monitoring, the "New" mark and transfer notes aren't built (PRD Monitoring) |
| **CEN-031 Reconciliation** | Where ADT isn't automated, a patient whose census state is uncertain shows **Pending reconciliation** (Spec §5.2), and the clinician can confirm it. | ✅ Built (the status). ⚠️ **Not built:** confirming it |
| **CEN-032 Watchlist** | The clinician flags a patient to watch; the flag persists across views and feeds the handoff (PD-09). | ⚠️ Not built. ⚠️ **Decision needed:** whether it's Monitoring's (CEN-OD-02) |
| ~~**CEN-033 Handoff**~~ | ~~From the Census, the clinician starts the end-of-shift handoff for their patients (HO-01, DU-31).~~ | ✅ **Resolved:** handoff starts from the account menu (PRD Account menu ACM-031) |

### 4.5 Patient status and attending

| ID | Requirement | Status |
|---|---|---|
| **CEN-040 Status** | Every patient carries their census status, from the Patient / Encounter contract (ADT): ~~**Current** (`admitted`, in hospital now), **Pending reconciliation** (in hospital, state uncertain), **Transferred** (moved to another facility, with where to and when), **Discharged** (with when), **Status unknown** (missing).~~ ✅ **Resolved:** **Admitted** replaces **Current**, and the status says the level of care while the patient is in hospital: **ICU**, **Step-down** or **Med-surg** (the badge reads "Admitted · ICU"; a Hospital at home patient's level is the one the program records, CEN-043); **Pending reconciliation** (in hospital, state uncertain). Out of hospital: **Home monitoring** (discharged and followed at home by a remote monitoring program), **Discharged** (discharged from hospital, with when; "Discharged from hospital" in its tooltip and to screen readers) and **Transferred** (moved to another facility, with where to and when). Then **Status unknown** (missing). A move between levels (ICU to step-down) is a status change, kept in the patient's history (CEN-045). ✅ **Resolved:** a patient admitted on a unit outside the three levels (the ED, Observation, a swing bed) reads **Admitted** alone, and the Filters panel lists them as **Admitted · Other unit**; a level shows only while the patient is admitted, so a discharged ICU patient reads Discharged. Shown as a badge with an icon and a word, never color alone, ~~plus "To Denver Health · 20 hr ago" or "3 days ago" under Transferred and Discharged.~~ ✅ **Resolved:** the column is the badge alone; its details show in a tooltip on hover or keyboard focus of the badge: where a transfer went ("To Denver Health"), when the patient left ("Discharged Nov 16, 2026, 3:40 PM · Yesterday"), and what an uncertain status means ("The hospital's record of this stay needs confirming.", "The hospital hasn't sent a status for this patient."). Screen readers hear them with the badge, so they're never only in the tooltip. ~~"Current" is the screen's word for `admitted`; no new status concept.~~ ✅ **Resolved:** "Admitted" is ADT's own word, so the screen and the data agree; the level of care is a new field (§4.6). The page never implies a patient is being monitored. ✅ **Resolved:** Home monitoring says only that a program follows the patient at home; nothing on Patients is live. | ✅ Built: Admitted with its level of care ("Admitted · ICU", "Admitted · Step-down", "Admitted · Med-surg", or "Admitted" alone), Pending reconciliation, Transferred, Discharged, Status unknown (`patient-status.ts`, `patientStatusLabel`). ⚠️ **Not built:** Home monitoring |
| **CEN-041 Last location** | A patient no longer in hospital shows the last hospital, unit and bed they had, ~~muted,~~ ✅ **Resolved:** in the same `foreground` color as everyone's, read as "Last location" to screen readers; the status says they've left. They're never on the census list or Monitoring. | ✅ Built |
| **CEN-042 ~~Care relationship~~ Attending** | ~~**My patient** (assigned to the clinician, `mine`), else **Care team** (the clinician is on the record's care team), then "Attending: …" (the attending of record), where the record has them.~~ ✅ **Resolved:** the **Attending** column shows the doctor in charge of the stay, the attending of record from the record's care team, by name alone; a card says "Attending: …". No My patient or Care team badge: being assigned is the My patients chip's, and the care team is a Filters group. "Attending" is the term clinicians and EHRs use for the doctor in charge (glossary). | ✅ Built from the record. ⚠️ **Gap:** a past patient's relationship needs the care team as it was during the stay (§4.6) |
| **CEN-043 Hospital at home** | A location option: a patient admitted to a hospital's **Hospital at home** program (acute inpatient care in their own home) is in hospital, status Admitted. Their location is the program, never their home address: "Sidney Regional · Hospital at home" in place of unit, room and bed, in the table, on the card and in the Patient Header. The Hospital menu keeps the hospital; the Unit menu and the Filters' Unit group list **Hospital at home** under each hospital that runs a program; search finds it ("hospital at home"). | ⚠️ Not built. 🙋 CEN-OD-18 |
| **CEN-044 Status up front** | The status is the row's most prominent fact after the patient: its own column right after Patient, a badge with an icon, the word and the level of care. It's filterable three ways, which always agree: the **Admitted** chip; a **Status** menu in the filter bar, first of the menus (before Hospital and Unit): "All statuses", then **In hospital** (ICU, Step-down, Med-surg, Pending reconciliation), **Not in hospital** (Home monitoring, Discharged, Transferred), then Status unknown, several checkable, each with its count; and the Filters panel's Patient status group. Narrower than 1400px of page, the Status menu moves into Filters with Hospital and Unit (CEN-007). A sort, **Status**, orders the directory by level of care (ICU first, then Step-down, Med-surg, Pending reconciliation, Home monitoring, Discharged, Transferred, Status unknown). | ⚠️ Not built |
| **CEN-045 ICU discharges** | To find the patients who left the ICU and see whether they're still in hospital: a **Left the ICU** chip (an ICU stay that ended in the last 7 days, whatever happened next) and the Filters' **ICU stay** group (Left the ICU in the last 24 h, 7 days or 30 days). Each patient's status says where they are now: Step-down or Med-surg (still in hospital), Home monitoring, Discharged or Transferred (not). The status tooltip adds when they left the ICU ("Left the ICU Nov 20, 6:10 AM · 4 days ago"), and a sort, **Left the ICU** (latest first), orders them. A patient who went back to the ICU reads ICU again and leaves this filter until their next ICU stay ends. | ⚠️ Not built. Needs each stay's level-of-care history (§4.6). 🙋 CEN-OD-19 |

### 4.6 Data model and dependencies

What the design needs, and where it comes from today. Nothing is invented for the UI: a field the data doesn't have is a dependency below, and the screen shows "—" without it.

| Field | Available today | Source | Note |
|---|---|---|---|
| Patient ID, MRN, name, age, sex | ✅ | `CensusPatient` | |
| Date of birth | ⚠️ **Gap** | — | Needed for search by DOB (CEN-005) and to tell same-name patients apart. Not in `CensusPatient` or `PatientRecord` |
| Hospital, unit, room, bed | ✅ | `CensusPatient` | For a past patient, the last ones (CEN-041) |
| Status (admitted, transferred, discharged, pending reconciliation, unknown) | ✅ Added | `CensusPatient.status` | The Requirements Specification's census status (ADT) |
| When the status changed; where a transfer went | ✅ Added | `CensusPatient.statusAt`, `transferredTo` | ADT A02 / A03 |
| Level of care (ICU, step-down, med-surg) | ✅ Added | `CensusPatient.levelOfCare` (`icu`, `step-down`, `med-surg`; none on another unit) | ℹ️ The samples map MICU, CVICU, SICU, Neuro ICU and CCU to ICU, PCU to Step-down, Med-Surg to Med-surg. From ADT: the patient class and the unit's level of care (PV1). Each hospital maps its units to the three levels (a PCU or intermediate care unit is Step-down) (CEN-040, CEN-OD-19) |
| Level-of-care history (when each ICU stay began and ended) | ⚠️ **Gap** | — | ADT A02 transfers between units; needed for Left the ICU (CEN-045) |
| Hospital at home program | ⚠️ **Gap** | — | The admitting hospital's program, as the patient's unit; never the home address (CEN-043) |
| Home monitoring enrollment | ⚠️ **Gap** | — | Who runs it and when it started and ended: a remote monitoring program's enrollment (CEN-040, CEN-OD-20) |
| Every patient touched | ⚠️ **Gap** | — | The program's interactions with a patient (coverage, consults, alerts, camera and video sessions, messages), so nobody it touched is missing (CEN-001, CEN-OD-16) |
| Admission date | ✅ | `PatientRecord.admittedAt`, or `CensusPatient.admittedAt` | |
| Discharge date | ✅ Added | `statusAt` with status Discharged | |
| Care team, attending | ✅ | `PatientRecord.careTeam` (`role` "Attending of record", `you`) | Only patients with a record. ⚠️ **Gap:** past patients have none in the prototype |
| Clinician–patient relationship | ⚠️ Partly | `mine` (assigned this shift), `careTeam[].you` | ⚠️ **Gap:** "assigned" beyond the current shift (a past patient's) isn't in the data |
| Last encounter | ⚠️ **Gap** | — | "Encounter" is ambiguous in the specs (glossary, Open naming conflicts #10) |
| ~~Last chart activity~~ Last encounter | ✅ | ~~`CensusPatient.lastActivityAt` (sample), else the record's latest `activity`~~ The status (in hospital or not), `admittedAt` (else the record's) and `statusAt` (when the patient left) | ~~Needs an API field: the latest note, order or charted result~~ ✅ **Resolved:** no chart-activity field needed: the last encounter comes from ADT |
| Last viewed by the clinician | ✅ | `CensusPatient.lastViewedAt`, plus this session's views | Not shown; drives Recently viewed (the default sort~~, and the chip~~) |
| Clinical tags (flags) | ✅ | `CensusPatient.tags` | |

---

## 5. States

| State | What the clinician sees | Status |
|---|---|---|
| **Loading** | ~~Card skeletons in the last layout~~ ✅ **Resolved:** placeholder rows (table) or cards, pulsing (still under reduced motion), and "Loading patients…" in the count | ✅ Built (`loading`) |
| **Results** | The patients, "34 patients" | ✅ Built |
| **Search results** | The matches, "1 of 34 patients" | ✅ Built |
| **No results** (a search) | "No patients found" / "Try another name, MRN, hospital, unit, or adjust your filters.", with **Clear filters** when filters are on | ✅ Built |
| **Hidden by status** (a search whose only matches are past patients, with ~~Current~~ Admitted or a status filter on) | ~~"No current patients found"~~ "No admitted patients found" / "1 patient who is no longer in hospital matches your search.", with **Show all statuses**: a past patient never reads as not existing | ✅ Built |
| **Filtered empty** | "No patients match these filters" / "Try another hospital, unit or status.", with **Clear filters** | ✅ Built |
| **Empty directory** | ~~"No patients on the census"~~ ✅ **Resolved:** "No patients yet" / "Patients from your authorized hospitals will appear here." | ✅ Built |
| **Error** | "Patients couldn't load" / "Check your connection and try again.", with **Try again** | ✅ Built (`loadError`, `onRetry`) |
| **Hospital feed down** | A note on that hospital's patients, with when data last arrived (DU-32) | ⚠️ Not built |
| **Restricted** | Patients the clinician isn't privileged for don't appear; a count notes how many are hidden | ⚠️ Not built (MON-OD-02) |

---

## 6. Responsive behavior and accessibility

| Topic | Rule |
|---|---|
| **Desktop** | Table by default; search, the chips and the Hospital and Unit menus visible; the filter bar (one row) sticks under the header while the page scrolls |
| **Narrow** | Below 1400px of page, Hospital and Unit move into Filters only; the bar wraps control by control after that. Below 768px of window, Cards is the default view. A card leads with identity, status and location before the rest. The table scrolls sideways in its frame rather than squeezing |
| **Keyboard** | Every control is reachable; a row's name is its button; the "…" menu opens with Enter; the Filters panel traps focus and returns it (WCAG 2.1 AA) |
| **Semantics** | The table is a `<table>` with column headers ("Patients"); the search is a `search` landmark; the count is a polite live region |
| **Status** | A word and an icon, never color alone; a past patient's location is read "Last location" |
| **Tooltips** | Only repeat what's on screen (the exact time behind "3 days ago", a truncated name, the flags behind "+1": the row's flag group names them all) |

---

## 7. Acceptance criteria

| ID | Criterion |
|---|---|
| ~~CEN-AC-01~~ | ~~Every patient in scope appears once, grouped by hospital, and the hospital counts add up to the total.~~ ✅ **Resolved:** Every patient in scope appears once, current and past; the count's total is everyone in scope. |
| CEN-AC-02 | With no search, filter or sort change, no row or card moves while data or alerts change. |
| ~~CEN-AC-03~~ | ~~No card shows an alert pill or ring; alert information appears only as counts, filters and the List's Alert column.~~ ✅ **Resolved:** No alert information appears on Patients. |
| ~~CEN-AC-04~~ | ~~A patient's score band and 24 h change are readable on the card without opening it.~~ ~~✅ **Resolved:** No NEWS2 column, card score line or score-first order; NEWS2 is only an optional sort.~~ ✅ **Resolved:** No NEWS2 column, card score line or NEWS2 sort. |
| CEN-AC-05 | A missing value is labeled, never shown as normal; a missing status reads "Status unknown". |
| CEN-AC-06 | Search, a chip or a filter narrows the directory and shows "n of N patients"; Clear filters returns to everyone. |
| CEN-AC-07 | Opening a patient doesn't change any alert's state. ✅ **Resolved:** true since CEN-022's removal. |
| CEN-AC-08 | Everything works by keyboard and with reduced motion on. |
| CEN-AC-09 | Nothing on Patients streams, flashes or shows a live value: no vitals, waveforms or device alarms (CEN-016). |
| CEN-AC-10 | A clinician looking for a known patient sees where to search without reading anything: the search is the first control in the filter bar, the magnifier Monitoring has too. |
| CEN-AC-11 | ~~Current, transferred and discharged patients~~ Admitted (ICU, step-down, med-surg), home monitoring, discharged and transferred patients appear together, each with its status word; a transfer reads Transferred with where it went, never Discharged. |
| CEN-AC-12 | Hospital is a filter (menu and Filters panel); there are no hospital tabs or hospital sections. |
| CEN-AC-13 | Identity, status, location and the attending come before any clinical content in the table and on the cards. |
| CEN-AC-14 | None of Monitoring's controls are on Patients: live feed, Rising score, Organ support, Sepsis watch, New patients, Density, Group by hospital. |
| CEN-AC-15 | From the page, a known patient opens in one search and one click (or Enter). |
| CEN-AC-16 | The table shows 50 rows, then Show more; search, filters and counts cover every patient, not only those shown. |
| CEN-AC-17 | A search that only matches past patients, with ~~Current~~ Admitted on, says they exist and offers Show all statuses. |
| CEN-AC-18 | In one click (Left the ICU), a clinician sees everyone whose ICU stay ended in the last 7 days, and reads from each status whether they're still in hospital. |
| CEN-AC-19 | The status is filterable from the filter bar without opening Filters (the Admitted chip, the Status menu), and the three status controls always agree. |
| CEN-AC-20 | A Hospital at home patient reads Admitted, located at "{hospital} · Hospital at home", never at a home address. |
| CEN-AC-21 | No patient the program has touched is missing from the directory; a status change never removes anyone. |

---

## 8. Open decisions

| ID | Decision | Options | Proposal |
|---|---|---|---|
| CEN-OD-01 | How much alert information stays on ~~the Census~~ Patients | (a) Counts, filters and the List column only; (b) today's set, with the live feed panel; (c) nothing: alerts only on Monitoring | ✅ **Resolved:** (c). |
| CEN-OD-02 | 🙋 Who is on the Monitoring panel, against Patients | (a) The same patients on both; (b) Monitoring shows a watchlist the clinician builds from Patients; (c) Monitoring shows the shift assignment | **(b)** or **(c)**. Settles MON-OD-01 too |
| CEN-OD-03 | Opening a patient from the Census resolves their alert (prototype) | Keep; remove | ✅ **Resolved:** removed. |
| CEN-OD-04 | 🙋 PD-04's fields not on the row: diagnosis, tier | Add a column; show on the card only; leave to Patient details | Diagnosis as a second line under the name if it fits; ⚠️ **Decision needed** |
| CEN-OD-05 | PD-02's "rail by tier" view | Build; drop | ✅ **Resolved:** not on Patients; the views are Table and Cards. If it means acuity tiers, it's Monitoring's. |
| CEN-OD-06 | Default sort | ~~Score; Score change; Name~~ Recently viewed; Patient name; ~~Most recent activity~~ Most recent encounter | ~~**Score** (today): the sickest first fits the shift scan~~ ✅ **Resolved:** **Recently viewed**: returning to a patient is the commonest directory job. |
| CEN-OD-07 | Filters on vitals the card doesn't show (Out of range, Data gap, Vitals out of range) | — | ✅ **Resolved:** Monitoring's (MON-051). |
| CEN-OD-08 | How a data gap shows on ~~the Census~~ Patients | A note; a mark on the score; nothing | ✅ **Resolved:** nothing: Patients shows no score, so a gap in it has nothing to qualify. Monitoring shows data gaps. |
| CEN-OD-09 | How patients no longer in hospital show on Patients (CEN-001) | (a) In the same list, with their status and last stay; (b) In hospital by default, with a filter for everyone; (c) Two tabs, In hospital and All | ✅ **Resolved:** (a), with a **Current** chip that narrows to the patients in hospital. |
| CEN-OD-10 | Which use cases stay on Patients now that Monitoring is the census | Stay here; move to Monitoring; both | ✅ **Resolved:** the shift scan, reviewing a clinical group and roster changes as they happen are Monitoring's; finding, returning to and looking back at patients stay here; handoff starts from the account menu. |
| CEN-OD-11 | 🙋 Search by date of birth | Add DOB to the patient data; leave it out | ⚠️ **Decision needed:** needs the data first (§4.6) |
| CEN-OD-12 | Recently viewed's window | 24 h; 7 days; 30 days | ~~**7 days** (built). Confirm with clinicians~~ ✅ **Resolved:** no window needed: the chip is gone, and the sort orders every viewed patient, the latest first |
| CEN-OD-13 | Whether NEWS2 stays as a sort | Keep, last; remove | ~~Keep, last, until clinical validation says whether lookup ever needs it~~ ✅ **Resolved:** removed. |
| CEN-OD-14 | 🙋 What "Care team" means for a past patient | The team during the stay; the team now (none) | ⚠️ **Decision needed:** likely the team during the stay (needs data, §4.6) |
| CEN-OD-15 | 🙋 What a discharged or transferred patient's page shows (status, last stay, live sections) | — | ⚠️ **Decision needed:** PRD Patient details |
| CEN-OD-16 | 🙋 What counts as "touched" (CEN-001), and whose directory a patient joins | (a) Coverage only; (b) any consult, alert, camera or video session or message; (c) (b), but a specialist's one consult adds the patient only to that specialist's directory | **(b)** for the program's clinicians, **(c)** for specialists |
| CEN-OD-17 | 🙋 How long a touched patient stays in the directory | Forever; the tenant's record retention; a fixed window (e.g. 2 years) | The tenant's record retention (compliance to confirm) |
| CEN-OD-18 | 🙋 Hospital at home: whether those patients are on Monitoring's census (they're admitted, with home devices), and which level of care their status shows | — | On the census when their devices stream; level as the program records it (usually Med-surg) |
| CEN-OD-19 | 🙋 Left the ICU: the chip's window (7 days), and how each hospital's units map to ICU, Step-down and Med-surg | — | 7 days; the mapping set per hospital by the Client Administrator |
| CEN-OD-20 | 🙋 Home monitoring: only Intercept's own remote monitoring program, or any program the hospital reports | — | Any program reported, named in the tooltip |
