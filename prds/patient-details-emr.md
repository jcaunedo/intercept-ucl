---
requirements: [PD-05, PD-06]
status: proposed — confirm with Carlos (not yet in Trace Matrix v0.1)
---

<!--
Created: Nov 25, 2026
Created by: Julio Caunedo
Last updated: Nov 25, 2026
Latest update: the acceptance criteria and open questions are numbered PDE-AC-01 and PDE-OD-01 on, each one moved from Patient details noting its old ID, so they can be cited without clashing with other tabs. Why: each tab gets its own ID prefix (user's call).
Recent updates: Created the same day from Patient details §3.2 (and PD-173 in §3.2.1), so each tab has its own PRD.
Scope: The EMR tab of Patient details in Intercept Live (`EpicSection`, in sections/epic-section.tsx): the hospital's record for this patient as Intercept receives it, how fresh each part is, and what Intercept wrote back. Moved out of PRD Patient details §3.2.
Purpose: One place for what the EMR tab is called, shows and does, and what's still undecided about it, so the page PRD keeps only the page.
-->

# Patient details — EMR

**Location:** Patient details › **EMR**, after Notes and before Live Camera (`?tab=emr` in a shared link).
**Audience:** Intensivists, APPs and Critical Care RNs
**Description:** A status page for the hospital's record of this patient: whether Intercept is receiving it, how fresh each part is, what Intercept may write back, and what it wrote; not a copy of the EMR.
**Source:** `src/layouts/intercept-live/patient-details/sections/epic-section.tsx` (`EpicSection`, `PatientEmr`); rendered by `patient-details.tsx` (`sectionContent`, case `emr`; the tab's label and empty state in `pendingSections`); samples in `patient-details/sample-data/sample-epic.ts`
**Status:** Draft — built in the prototype; its name is decided, its contents aren't (PDE-OD-01). No Figma yet.
**Last updated:** November 25, 2026

---

## Purpose

Intercept Live shows parts of each hospital's record across the page (Timeline, Labs, Chart, Medications, Orders, Notes), and each hospital is connected differently. When a value looks stale, a note didn't arrive or an order can't be changed, the clinician needs to know whether that's the patient or the connection. The EMR tab answers that in plain words, for this patient at this hospital, and is where the clinician leaves for the hospital's own chart when the hospital allows it.

ℹ️ Related specs: the page, its header, its tabs and their order are in [patient-details.md](patient-details.md) ("3.2 Regions"); how a section says it has less data, and the rule against naming the integration mechanism, are [patient-details.md](patient-details.md), "PD-121 — Data depth", and "17. Multi-tenant, authorization and audit" (PD-134); a signed note's write-back status is [notes.md](notes.md), "PD-072 — Write-back status"; **Open chart in {EMR}** in the header's "…" is [patient-details.md](patient-details.md), "PD-014 — Header actions".

## The tab's name

✅ **Resolved:** the hospital record's tab is labeled **EMR** for every hospital, whatever its system (Meditech, Epic, Cerner, TruBridge…), so the tab row reads the same across sites. Inside the tab, the system is named ("Meditech at Sidney Regional"), and so is its empty state ("Nothing from Meditech yet").

The Labs tab's cards name their source "EMR" for the same reason ([patient-details-labs.md](patient-details-labs.md), "Where the results come from").

## What the tab shows

⚠️ **Discrepancy:** no PRD defined this tab's content. What follows is what the prototype builds, proposed for review (PDE-OD-01). Its copy describes what's available, never how the hospital is connected (PD-121, PD-134).

1. **The record**, titled with the system and the hospital ("Meditech at Sidney Regional"), with its state in words beside a dot (**Connected**, **Some data is delayed**, **Not available right now**) and when it was last checked ("checked 1 min ago").
   - A line saying what the record is to Intercept: "Meditech is the record of care. Intercept shows part of it in …, and writes signed Intercept notes back to it." (the last part only where the hospital takes notes back), then what's behind right now ("Behind right now: results, charted vitals.").
   - The encounter: its status ("Inpatient · MICU"), when the patient was admitted, and the hospital's account number.
   - **Open chart in Meditech**, where the hospital allows it.
2. **What Intercept receives**, one row per feed: Admissions and transfers, Results, Charted vitals, Medications, Orders, Notes. Each with what it carries ("Labs, microbiology and imaging reports"), its state (**Up to date**, **Delayed**, **Unavailable**), when it last updated, what Intercept may do with it (**Read**, **Read and write back**, **Read-only at this hospital**), and a note in plain words when there's something to know ("Sidney's lab results are arriving late today. A result that's been drawn may not be here yet; check pending labs before acting on a trend.").
3. **Written back**: what Intercept wrote to the record, newest first: its title ("Tele-ICU progress note"), who and when, and its status (**Written**, **Failed**, **Waiting**); a failure says what failed and what to do. A time within 12 hours reads as a time, older carries its date ([patient-details.md](patient-details.md), "PD-120 — Freshness").

On a wide screen, the feeds and the write-backs sit side by side under the record.

⚠️ **Copy:** the record's line names a Vitals tab (merged into the Timeline) and leaves out the Timeline and Chart: "Intercept shows part of it in Vitals, Labs, Medications, Orders and Notes".

⚠️ **Discrepancy:** a signed note in Overlay mode reads "Ready to import" with its format ([notes.md](notes.md), "PD-072 — Write-back status"); Written back has no such status, only Written, Failed and Waiting.

## Acting on what's here

| ID | Tab | Today | Made actionable (proposed) | Status |
|---|---|---|---|---|
| PD-173 | **EMR** | None | **Open chart in {EMR}** where allowed (PD-014). A failed write-back has **Try again**; a delayed feed **Refresh**. ⚠️ **Copy:** it still names a Vitals tab (merged into the Timeline) | ⚠️ Not built |

- **Open chart in {EMR}** leaves Intercept for the hospital's chart of this patient, in Integrated mode where the hospital permits it ([patient-details.md](patient-details.md), "PD-014 — Header actions").
- ⚠️ **Gap:** the tab can show **Open chart in {EMR}**, but the page passes it no action, so it never shows in the prototype ([patient-details.md](patient-details.md), "3.2.1 Tab review: what each tab lets the clinician do").
- ⚠️ **Constraint:** in material Intercept shows externally, leaving for the EMR may not be shown as a deep-link or screen-operated fallback ([patient-details.md](patient-details.md), "17. Multi-tenant, authorization and audit", PD-134).

ℹ️ The rules every tab action follows are in [patient-details.md](patient-details.md), "3.2.1 Tab review: what each tab lets the clinician do".

## States

| State | What shows | What the clinician can do |
|---|---|---|
| No record for this patient | The tab's empty state, named for the system when it's known: "Nothing from Meditech yet" ("Nothing from the EMR yet" otherwise), "The patient's record in the hospital's EMR will appear here, where the hospital allows it." | Nothing |
| Connected, all current | **Connected**, every feed **Up to date** | Read |
| Some feeds behind | **Some data is delayed**, "Behind right now: …", each delayed feed with its note | Treat values from those feeds as possibly stale |
| Record unavailable | **Not available right now** | Work from the bedside monitor and Intercept's own data |
| No feeds yet | "Nothing from Meditech for this patient yet." | Nothing |
| Nothing written back | "Nothing written to Meditech for this patient yet." | Nothing |
| A write-back failed | **Failed**, with what failed and what to do | Follow the instruction (Try again is PD-173) |

## Accessibility

- Every state is a word beside its dot; the dot is never the only signal.
- A write-back's status is a word with its icon.
- The rest of the page's accessibility is in [patient-details.md](patient-details.md), "18. Accessibility".

## Acceptance Criteria

| ID | Criterion |
|---|---|
| PDE-AC-01 | The tab reads "EMR" for every hospital (Meditech, Epic, Cerner, TruBridge); inside it, the system and the hospital are named ("Meditech at Sidney Regional"). |
| PDE-AC-02 | With no record for the patient, the empty state names the system when it's known ("Nothing from Meditech yet"). |
| PDE-AC-03 | Each feed shows its state and access in words, and nothing on the tab describes how the hospital is connected. |
| PDE-AC-04 | A failed write-back says what failed and what to do. |

## Open Questions

| ID | Question |
|---|---|
| PDE-OD-01 | 🙋 Whether the prototype's EMR tab becomes the rule: the record's state and encounter, the feeds with their state and access, and Written back. |
| PDE-OD-02 | 🙋 How Written back shows a note in Overlay mode ("Ready to import", PD-072), and whether the tab lists other write-backs than notes (orders, plan-of-care evaluations). |

ℹ️ Whether Chart merges into EMR is the page's open question ([patient-details.md](patient-details.md), "3.2 Regions").

## Out of scope

- The record's content: results and cultures ([patient-details-labs.md](patient-details-labs.md)), problems, history, allergies, home medications and imaging ([patient-details-chart.md](patient-details-chart.md)), medications, orders and notes ([patient-details.md](patient-details.md)).
- Being the EMR of record: [patient-details.md](patient-details.md), "23. Out of scope".
- Production EMR integration: next phase (Brief).
