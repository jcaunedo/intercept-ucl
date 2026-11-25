---
requirements: [SV-03, SV-17]
status: proposed — confirm with Intercept
---

<!--
Created: Nov 25, 2026
Created by: Julio Caunedo
Last updated: Nov 25, 2026
Latest update: the acceptance criteria and open questions are numbered PDM-AC-01 and PDM-OD-01 on, each one moved from Patient details noting its old ID, so they can be cited without clashing with other tabs. Its new criteria and questions, unnumbered until now, got IDs too. Why: each tab gets its own ID prefix (user's call).
Recent updates: Created the same day from Patient details §8, so each tab has its own PRD.
Scope: The Medications tab of Patient details in Intercept Live (`MedicationsSection`, src/layouts/intercept-live/patient-details/sections/medications-section.tsx): the patient's active medications from the hospital's record, by group, with search, and what the clinician can do from them. Moved out of PRD Patient details (§8 "Medications", its PD-170 row in "3.2.1 Tab review", PD-OD-08 (now PDM-OD-01)).
Purpose: One place for what the Medications tab shows and does, so its rules and open questions aren't spread across the page's PRD or reopened.
-->

# Patient details — Medications

**Location:** Intercept Live › a patient's page (Patient details) › **Medications** tab, after Care Plan (and Sepsis and Discharge, when the patient has them); also reached from the Overview's Medications card  
**Audience:** Intensivists, APPs and Critical Care RNs  
**Description:** The patient's scheduled, as-needed and continuous medications from the hospital's record, read-only, each with where it comes from and how old it is.  
**Source:** `src/layouts/intercept-live/patient-details/sections/medications-section.tsx` (`MedicationsSection`), with the shared parts in `patient-details/section-parts.tsx` (`SectionGroup`, `NoData`, `freshness`); rendered by `patient-details.tsx` (`sectionContent`); the Overview's Medications card in `patient-overview.tsx` (`MedicationsCard`); sample data in `patient-details/sample-data/sample-medications.ts`  
**Status:** Draft — built in the prototype as a read-only tab, pending clinical and product validation. No Figma: the tab was drafted from this PRD (DESIGN.md "Intercept Live › Patient details", Sections). The actions proposed in PD-170 aren't built.

---

## Purpose

The clinician watching a patient from the hub needs to know what the patient is on, without opening the hospital's EMR: which drips are running and at what rate against the order, which scheduled doses are due or late, and which as-needed doses have been given. The tab answers that in one place, read-only, because the medication record and the pumps are the hospital's (Spec §5.5). What the clinician wants changed goes through Orders as a recommendation, never as a direct change here.

ℹ️ Related specs: the page itself (header, tabs, panels, freshness, data depth, page states, accessibility) is in [patient-details.md](patient-details.md); the Overview's infusions are in [patient-details.md](patient-details.md), "PD-022 — Organ support"; the infusions' lanes are on the Timeline ([patient-details.md](patient-details.md), "Timeline"); order recommendations and active orders are in [patient-details-orders.md](patient-details-orders.md); home medications and their reconciliation are in the Chart tab ([patient-details.md](patient-details.md), "3.2.1 Tab review: what each tab lets the clinician do", PD-166).

## Reaching the tab

- **The tab row** of Patient details, in the page's tab order ([patient-details.md](patient-details.md), "3.2 Regions").
- **The Overview's Medications card:** its **View all · n** opens this tab (n is every medication, all groups).
- **The Overview's Oxygen and infusions card:** its **View all** opens this tab today. ⚠️ **Decision needed:** PD-163 proposes it open the Timeline's Pump lanes instead, where the rates are ([patient-details.md](patient-details.md), "3.2.1 Tab review: what each tab lets the clinician do").
- **Up next** on the Overview lists the scheduled doses due in the next 12 h. PD-163 proposes that a dose there opens it in this tab; not built.

The page's link, Back and the patient switcher are the page's ([patient-details.md](patient-details.md), "3.1 Entry points"). ℹ️ In the prototype the tab is in the page's address (`tab=medications`), so a reload or a shared link opens it.

## What it shows

### PD-050 — Active medications

Scheduled, PRN and continuous medications from the hospital EMR: drug, dose, route, frequency, last given and next due, with source and time. Read-only (Spec §5.5).

- Continuous infusions link to their Pump values (PD-022) and show both the ordered and the pump rate when both are known.
- ⚠️ **Decision needed:** whether a pump rate that differs from the ordered rate is flagged. The Specification only defines this for ventilators (Spec §8.3); an infusion mismatch rule needs clinical approval (PDM-OD-01).

Under the group tabs, one line says where the list comes from and that it's read-only: "Medications from Sidney Regional's record · read-only · updated 4 min ago".

The medications come in three groups, in this order, each a table under its heading:

| Group | Columns | What each row says |
|---|---|---|
| **Continuous infusions** ("Ordered and pump rates" beside the heading) | Medication, Ordered, Pump | The drug and its concentration ("8 mg in 250 mL NS"); the order's rate or range and its titration goal ("0.02–0.5 mcg/kg/min", "Titrate to MAP 65 or more"); the pump's rate ("0.22 mcg/kg/min"), or "Rate unavailable" when the pump feed is missing, never "stopped" (PRD PC-060), then its last change ("▲ Up from 0.18 mcg/kg/min at 9:12 AM") and **Pump values** |
| **Scheduled** | Medication, Dose · route, Frequency, Last given, Next due | The drug and what it's for ("Pneumonia · penicillin allergy"); "2 g · IV"; "Every 8 h"; when it was last given and how long ago, or "Not given"; when it's next due (below) |
| **As needed** | Medication, Dose · route, Frequency, Last given, In 24 h | The drug and when to give it ("Fever over 38.5 °C"); dose and route; frequency; last given, or "Not given"; how many doses in the last 24 h ("2 doses", or "None") |

- **Every row says where it comes from and how old it is,** under the drug's name ("Pump · 2 min ago", "MAR · 12 min ago"). When the row's Last given is that same moment, only the source shows, so the time isn't said twice.
- **Next due** reads "Overdue · 15 min" (with a clock) once the time has passed, "Due in 40 min" within the hour, then the time ("2:00 PM"), or the date and time when it isn't today.
- ⚠️ **Assumption:** "Due in" starts 60 minutes before the dose, and a dose is Overdue the minute its time passes, with no grace window. Nobody decided either; both come from the build. Also in Open Questions.
- ⚠️ **Gap:** the Design Update spec's DU-17 (Proposed) asks for each infusion to show the value it targets beside it (norepinephrine ↔ MAP, furosemide ↔ urine output and net balance, insulin ↔ glucose; SV-17). The tab shows the order's titration goal as text, not the current value.

## Finding a medication

- **Group tabs** over the tables: **All**, **Continuous infusions**, **Scheduled** and **As needed**, each with how many it holds. All shows the three groups; another tab shows only its group. The counts are the totals, whatever the search.
- **Find a medication** narrows every group by name (and by an infusion's concentration or a medication's indication) as the clinician types. A group the search empties is left out, so the result reads as one list; when nothing matches: 'No medications match "xyz".'

## Pump values

An infusion's **Pump values** opens the Timeline tab, where the pump's rates are drawn against the vitals ([patient-details.md](patient-details.md), "Timeline"). PD-170 proposes it open that drug's own lane.

## Acting on a medication

**PD-170 — Medications** (from the tab review, [patient-details.md](patient-details.md), "3.2.1 Tab review: what each tab lets the clinician do", under PD-160 to PD-162):

- **Today:** Group tabs, search, Pump values (opens the Timeline).
- **Made actionable (proposed):** Pump values opens that drug's lane. An overdue dose offers **Message the bedside nurse** (pre-filled, PRD Messages). A drip offers **Recommend a change** (an order recommendation in Orders); no direct titration: the pump is the hospital's.
- **Status:** ⚠️ Not built.

Every action follows the page's rules: it sits on the row it acts on (PD-160), reaches the app and survives a reload (PD-161), and is shown only to the roles that can take it (PD-162).

## Who can do what

The list is read-only for everyone. The proposed actions (PD-170), with Requirements §4 as the baseline:

| Capability | Intensivist | APP | Critical Care RN |
|---|---|---|---|
| See the medications, search, open Pump values | ✓ | ✓ | ✓ |
| Message the bedside nurse about an overdue dose (proposed) | ✓ | ✓ | ✓ |
| Recommend a change to a drip (proposed) | ✓ | ✓, routed for co-signature where required ([patient-details-orders.md](patient-details-orders.md), "Scope of practice") | — |

- ⚠️ **Assumption:** the Critical Care RN doesn't get **Recommend a change**, since the RN signs no orders (Requirements §4, PD-162). Nobody decided whether an RN may propose one. Also in Open Questions.

## States

| State | What shows | What the clinician can do |
|---|---|---|
| No medication data for the patient | "No medications yet" and "Scheduled, as-needed and continuous medications from the hospital's record will appear here." | Other tabs |
| A group is empty | "No infusions running.", "No scheduled medications." or "No as-needed medications." under its heading | The other groups |
| The search matches nothing | 'No medications match "xyz".' | Change or clear the search |
| The pump feed is missing | "Rate unavailable" in Pump, never "stopped" (PC-060) | Read the ordered rate |
| A scheduled dose hasn't been given | "Not given" in Last given | — |
| The hospital's feed is delayed, offline, or the patient discharged | The page's banners and rules ([patient-details.md](patient-details.md), "PD-122 — Page states") | As the page allows |

## Dates and times

Times follow the page's rule ([patient-details.md](patient-details.md), "PD-120 — Freshness"): how old something is reads as an age ("12 min ago"), what's due as how soon ("Due in 40 min", "Overdue · 15 min").

- ⚠️ **Discrepancy:** PD-120 says a past time older than 12 hours carries its date. Last given and an infusion's last change show the bare time ("10:02 AM") whatever its age; Last given has its age under it ("14 h ago"), the last change doesn't.

## Accessibility

The page's rules apply ([patient-details.md](patient-details.md), "Accessibility"). On this tab:

- Each group is a region named by its heading, and each table has a caption screen readers hear ("Continuous infusions: ordered rate and pump rate", "Scheduled medications: dose, frequency, last given and next due", "As-needed medications: dose, when to give, last given and doses in 24 hours").
- The group tabs are one tab list named "Medication groups"; the search field is named "Find a medication".
- Due and overdue are words, with a clock for Overdue, never color alone. An infusion's change arrow is hidden from screen readers, which hear "Up" or "Down".

## Acceptance Criteria

| ID | Criterion |
|---|---|
| PDM-AC-01 | The tab lists the patient's continuous infusions, scheduled and as-needed medications from the hospital's record, and offers no way to change them. |
| PDM-AC-02 | Every row shows its source and age; the line under the group tabs names the hospital and says "read-only". |
| PDM-AC-03 | An infusion shows its ordered rate and its pump rate when both are known; with no pump feed, Pump reads "Rate unavailable", never "stopped". |
| PDM-AC-04 | A scheduled dose past its time reads "Overdue · n min" in words; one due within the hour reads "Due in n min". |
| PDM-AC-05 | Picking **Scheduled** shows only the scheduled medications; **All** shows the three groups. Each tab's count matches what it holds. |
| PDM-AC-06 | Typing in **Find a medication** leaves out groups with no match; with no match anywhere, the tab says so with the search text. |
| PDM-AC-07 | **Pump values** on an infusion opens the Timeline. |
| PDM-AC-08 | A patient with no medication data shows "No medications yet"; an empty group says it's empty under its heading. |

## Open Questions

| ID | Question | Owner |
|---|---|---|
| PDM-OD-01 | 🙋 Whether a pump rate that differs from the ordered rate is flagged, and by what rule. (was PD-OD-08) | Clinical |
| PDM-OD-02 | 🙋 When a dose reads "Due in" and when it turns Overdue: the build uses 60 minutes ahead and no grace window (Assumption above). | — |
| PDM-OD-03 | 🙋 Whether the Critical Care RN may **Recommend a change** to a drip (Assumption above; PD-OD-18 asks the same for the RN's other tab actions). | — |
| PDM-OD-04 | 🙋 Whether Medications shows each infusion's target value beside it, as DU-17 proposes, or leaves that to the Overview and the Timeline. | — |
| PDM-OD-05 | 🙋 Whether the Overview's Oxygen and infusions **View all** keeps opening this tab or opens the Timeline's Pump lanes (PD-163). | — |

## Out of scope

- The Overview's infusions and oxygen: [patient-details.md](patient-details.md), "PD-022 — Organ support".
- The pump lanes and their history: [patient-details.md](patient-details.md), "Timeline".
- Home medications and their reconciliation: the Chart tab ([patient-details.md](patient-details.md), "3.2.1 Tab review: what each tab lets the clinician do", PD-166).
- Ordering, changing or stopping a medication: [patient-details-orders.md](patient-details-orders.md) and Order Entry.
- Titrating a pump and charting a dose given: the hospital's, at the bedside and in its EMR.
