---
requirements: [PD-05, PD-06]
status: proposed — confirm with Carlos (not yet in Trace Matrix v0.1)
---

<!--
Created: Nov 25, 2026
Created by: Julio Caunedo
Last updated: Nov 25, 2026
Latest update: the acceptance criteria and open questions are numbered PDC-AC-01 and PDC-OD-01 on, each one moved from Patient details noting its old ID, so they can be cited without clashing with other tabs. Why: each tab gets its own ID prefix (user's call).
Recent updates: Created the same day from Patient details §7 (PD-042) and §3.2.1 (PD-166), so each tab has its own PRD.
Scope: The Chart tab of Patient details in Intercept Live (`ChartSection`): the rest of the hospital's record beside the labs, namely problems, history, allergies, home medications and imaging reports (PD-042). Moved out of PRD Patient details §7.
Purpose: One place for what the Chart tab shows and does, and what's still undecided about it, so the page PRD keeps only the page.
-->

# Patient details — Chart

**Location:** Patient details › **Chart**, the fourth tab (after Labs; `?tab=chart` in a shared link).
**Audience:** Intensivists, APPs and Critical Care RNs
**Description:** The slice of the hospital's record that isn't labs: the problem list, medical, surgical and social history, allergies, home medications and imaging reports, read only, so the clinician knows the patient's background without leaving Intercept.
**Source:** `src/layouts/intercept-live/patient-details/sections/chart-section.tsx` (`ChartSection`; also the record's data shapes, `PatientChart`, which the Labs tab reads too); rendered by `patient-details.tsx` (`sectionContent`, case `chart`); samples in `patient-details/sample-data/sample-chart.ts`
**Status:** Draft — built in the prototype; its contents are decided, most of its details aren't (PDC-OD-01). No Figma yet.
**Last updated:** November 25, 2026

---

## Purpose

A clinician taking over a patient, or writing an initial note, needs the background the labs and vitals don't give: what the patient is being treated for, what they had before, what they're allergic to, what they took at home and what imaging found. The Chart tab shows it from the hospital's record, each part with its source, so it's never mistaken for Intercept's own data.

ℹ️ Related specs: the page, its header, its tabs and their order are in [patient-details.md](patient-details.md) ("3.2 Regions"); allergies and code status in the header are [patient-details.md](patient-details.md), "PD-011 — Safety badges"; results and microbiology are the Labs tab's ([patient-details-labs.md](patient-details-labs.md)); the hospital's record itself, how fresh each feed is and what was written back, is the EMR tab's ([patient-details-emr.md](patient-details-emr.md)); the plan of care's problems are the Care Plan tab's ([care-plan.md](care-plan.md)).

ℹ️ The tab's name: "Chart" is reserved for the hospital's record (PD-OD-01, [patient-details.md](patient-details.md), "22. Open decisions"); this tab shows a slice of that record, so it keeps the word. Whether Chart merges into EMR is the page's open question ([patient-details.md](patient-details.md), "3.2 Regions").

## What the tab holds

✅ **Resolved:** Labs and Chart are separate tabs: Labs holds results and microbiology; Chart holds the rest of the hospital's record: problems, history, allergies, home medications and imaging reports ([patient-details-labs.md](patient-details-labs.md), "What the tab holds").

⚠️ **Discrepancy:** apart from that list and PD-042, no PRD decided what each part shows or how it's laid out. What follows is what the prototype builds, proposed for review (PDC-OD-01).

| Part | Shows | When it's empty |
| --- | --- | --- |
| **Problems** | The active problems, each with since when and who noted it ("Since Oct 26 · Laura Mitchell, MD"); then **Resolved** problems, muted, with their date | "No problems recorded." |
| **History** | **Medical**, **Surgical** (each item with a detail: "Type 2 diabetes · A1c 8.1% in August") and **Social** (one line) | "None recorded" for each kind |
| **Imaging reports** | PD-042 (below) | "No imaging reports this stay." |
| **Allergies** | Each substance, its reaction and its severity (Mild, Moderate, Severe; Severe marked) | "No known allergies." |
| **Home medications** | Each medication, its dose, route and frequency ("1,000 mg by mouth twice a day"), and what the inpatient team did with it: **Held**, **Continued** or **Changed** | "No home medications recorded." |

- Problems, history and imaging reports sit in the main column; allergies and home medications beside them on a wide screen, after them on a narrow one.
- "No known allergies" shows only when the record says so, never inferred from an empty list ([patient-details.md](patient-details.md), "PD-011 — Safety badges"). ⚠️ **Gap:** the prototype shows "No known allergies." whenever the list is empty; the record has to tell "none known" apart from "not recorded".
- ⚠️ **Assumption:** each card names its source **EMR** with its age, as the Labs tab's cards do ([patient-details-labs.md](patient-details-labs.md), "Where the results come from"): that rule was decided when these cards were still on the Labs tab.
- ⚠️ **Gap:** no family history. The Initial note's template has Family history beside the others it fills from this tab ([notes.md](notes.md), "4.2 Sections").
- ⚠️ **Gap:** the problem list isn't in the Patient card's data model ([patient-details.md](patient-details.md), "PD-010 — Identity").

Times follow the page's rule: a time within the last 12 hours reads as a time, anything older carries its date ([patient-details.md](patient-details.md), "PD-120 — Freshness").

## Imaging reports

### PD-042 — Imaging and other reports

Report text with study, time and status. ℹ️ Viewing images is out of scope here (Specialty Care Access owns imaging review, Brief; [specialty-care-access.md](specialty-care-access.md)).

- In the prototype each report shows the study, its status (**Preliminary** or **Final**), the impression ("Impression: …"), when it was done and who read it; **Show full report** opens the findings in place, **Hide full report** closes them.

## Acting on what's here

| ID | Tab | Today | Made actionable (proposed) | Status |
|---|---|---|---|---|
| PD-166 | **Chart** | Show or hide an imaging report | Home medications get **Reconcile** (continue, hold or change, with a reason) where the record allows; the Held / Continued / Changed badge is its result. A problem links to its Care Plan problem, or **Add to care plan** as a proposal ([care-plan.md](care-plan.md) CPL-014) | ⚠️ Not built |

ℹ️ The rules every tab action follows are in [patient-details.md](patient-details.md), "3.2.1 Tab review: what each tab lets the clinician do"; who may reconcile home medications is PD-OD-18, and which actions write back to the record PD-OD-17, both there. Whether the hub may add a problem to the plan of care is CPL-OD-09 ([care-plan.md](care-plan.md), "8. Open decisions").

## States

| State | What shows | What the clinician can do |
|---|---|---|
| No record data | The tab's empty state: "Nothing in the chart yet", "Problems, history, allergies, home medications and imaging reports from the hospital's record will appear here." | Nothing |
| A part is empty | That card's empty line (see "What the tab holds") | Read the rest |
| An imaging report is preliminary | **Preliminary** beside the study | Read the impression; wait for Final |
| Record delayed | Each card's source says how old it is; the page's banner says the hospital's data is delayed ([patient-details.md](patient-details.md), "PD-122 — Page states") | Read with care |

## Accessibility

- Show full report says whether it's open (`aria-expanded`) and points at the findings.
- Severity and the inpatient decision are words, never color alone.
- The rest of the page's accessibility is in [patient-details.md](patient-details.md), "18. Accessibility".

## Acceptance Criteria

| ID | Criterion |
|---|---|
| PDC-AC-01 | The Chart tab follows Labs and shows problems, history, allergies, home medications and imaging reports; no results or cultures. |
| PDC-AC-02 | Each imaging report shows its study, time and status; Show full report opens its findings in place, and no image viewer is offered. |
| PDC-AC-03 | Each part with nothing in it says so in words; an unknown allergy status never reads "No known allergies". |
| PDC-AC-04 | A time older than 12 hours carries its date. |

## Open Questions

| ID | Question |
|---|---|
| PDC-OD-01 | 🙋 Whether the prototype's Chart tab becomes the rule: its parts and their order, the two columns, active then resolved problems, the three kinds of history, the allergy severities and the home medications' Held / Continued / Changed. |
| PDC-OD-02 | 🙋 Whether the Chart tab shows family history, which the Initial note needs. |
| PDC-OD-03 | 🙋 Whether the Chart tab's cards name their source "EMR", as the Labs tab's do, or the hospital's system. |

## Out of scope

- Results and microbiology: [patient-details-labs.md](patient-details-labs.md).
- Current inpatient medications and infusions: the Medications tab ([patient-details-medications.md](patient-details-medications.md), "PD-050 — Active medications").
- The plan of care's problems, goals and status: [care-plan.md](care-plan.md).
- Viewing images: [specialty-care-access.md](specialty-care-access.md).
- The hospital's record itself, its feeds and write-backs: [patient-details-emr.md](patient-details-emr.md).
