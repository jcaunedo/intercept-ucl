---
requirements: [VS-01, VS-02, VS-03, VS-04, VS-05, VS-06, VS-07, WF-03, BR-03]
status: proposed — confirm with Carlos (not yet in Trace Matrix v0.1)
---

<!--
Created: Nov 25, 2026
Created by: Julio Caunedo
Last updated: Nov 25, 2026
Latest update: the acceptance criteria and open questions are numbered PDS-AC-01 and PDS-OD-01 on, each one moved from Patient details noting its old ID, so they can be cited without clashing with other tabs. Its new criteria and questions, unnumbered until now, got IDs too. Why: each tab gets its own ID prefix (user's call).
Recent updates: Created the same day from Patient details §11, so each tab has its own PRD.
Scope: The Sepsis tab of Patient details in Intercept Live (`SepsisSection`, src/layouts/intercept-live/patient-details/sections/sepsis-section.tsx): one patient's sepsis screening or tracked case, its criteria, the SEP-1 bundle and the hospital's protocol, and what the clinician can do there. Moved out of PRD Patient details (§11 "Sepsis", PD-080; the tab review's PD-168; PD-AC-14 (now PDS-AC-01)). The Virtual Sepsis page is PRD Virtual Sepsis.
Purpose: One place for what the Sepsis tab shows and lets the clinician do, so the tab, Virtual Sepsis and the alert's hour-1 bundle agree, and the decisions behind it aren't reopened.
-->

# Patient details — Sepsis

**Location:** Patient details › **Sepsis** tab, after Care Plan, for a patient with a sepsis screening or tracking event. Reached from the page's tab row, from Virtual Sepsis (PD-003) and from the Sepsis tag in the patient header.  
**Audience:** Intensivists, APPs and Critical Care RNs  
**Description:** One patient's sepsis case: whether it's a candidate or a tracked case, the criteria behind it, the SEP-1 3-hour and 6-hour bundle and the hospital's own protocol, with the clinician's validation and decisions.  
**Source:** `src/layouts/intercept-live/patient-details/sections/sepsis-section.tsx` (`SepsisSection`, its `SepsisCase` and `SepsisAction` types), rendered by `patient-details.tsx` (`sectionContent`, the tab list `pendingSections`); sample cases in `patient-details/sample-data/sample-sepsis.ts`  
**Status:** Draft — built in the prototype without a Figma design, pending clinical and product validation. Its actions stay inside the tab (PD-168 ⚠️ Not built).

---

## Purpose

The Sepsis Sniffer flags a patient as a possible sepsis case; the clinician has to decide, from the evidence, whether it is one, and once it is, keep the bundle on time (PD-UC-07, Spec §5.9, §8.1, §8.2). This tab is that patient's slice of Virtual Sepsis: everything needed to validate or reject the candidate, and to see which bundle elements are done, due, overdue or declined, without leaving the patient's page.

The agent only flags: validating, rejecting or excluding is always a clinician's call (Spec §8.1, VS-03), and a screening candidate is never shown as a confirmed case (PC-081).

ℹ️ Related specs: the page, its tabs and the page-level rules (entry points, freshness, page states, audit, accessibility) are in [patient-details.md](patient-details.md); the Virtual Sepsis page, which lists every patient on sepsis watch, is in [virtual-sepsis.md](virtual-sepsis.md); what the Patient card shows of a sepsis case (PC-080 to PC-085) is in [patient-card.md](patient-card.md); the alert's hour-1 bundle (Scenario 3) is in [alert-maximized-modal.md](alert-maximized-modal.md).

## Reaching the tab

The tab shows only when the patient has a Sepsis Sniffer candidate or a confirmed case under tracking (PC-080 to PC-083). It sits after Care Plan, with Discharge: both are shown only for some patients, and both are plans ([patient-details.md](patient-details.md), "3.2 Regions").

Ways in:

1. The page's tab row.
2. **Virtual Sepsis:** a patient's card opens the page on this tab (PD-003, [virtual-sepsis.md](virtual-sepsis.md) VSP-AC-03).
3. **The Sepsis tag** in the patient header links here (PD-080).

Back and the link behave as for every tab ([patient-details.md](patient-details.md), "3.1 Entry points").

⚠️ **Discrepancy:** in the prototype the tab shows for every patient **on sepsis watch** (the census flag), with or without a case. A patient on sepsis watch with no case yet (Rosa Medina, Scenario 3) gets the tab with the empty state "No sepsis screening yet". The PRD shows it only with a screening or tracking event (PDS-AC-01); the glossary's **Sepsis watch** says their page has the tab. See Open Questions.

⚠️ **Discrepancy:** Virtual Sepsis's cards open the patient's page without picking this tab (the page's `section` option isn't passed), and no header tag links here yet.

## What it shows

### PD-080 — Screening and tracking

| Part | Content |
|---|---|
| **State** | Candidate, Validated, Rejected (with reason), Excluded (with exclusion), Tracking |
| **Criteria** | Each SIRS and organ-dysfunction criterion: met, not met or missing, with its value, time and source (Spec §8.1) |
| **Validation** | Validate or reject, with exclusion adjudication; intensivist or APP (Spec §8.1) |
| **Bundle** | 3-hour and 6-hour elements: done (time), due (time left), overdue, declined with rationale, elapsed (Spec §8.2) |
| **Protocols** | The hospital's own elements shown apart from SEP-1, never merged (Spec §5.9) |

- **Missing is never negative.** A criterion with no value reads as missing, apart from one that isn't met, and a negative screen never reads as sepsis ruled out (PC-080, PC-082).
- **SEP-1 and the hospital's protocol stay apart.** The hospital's own elements (e.g. a procalcitonin or a sepsis huddle) are a separate group from the SEP-1 bundle, never merged into it (PC-084, PDS-AC-01). Protocols belong to each client hospital (BR-15).
- **The bundle counts from time zero.** The 3-hour and 6-hour windows count from SEP-1's time zero, and a deadline is never worked out from an invented or estimated start without saying so (PC-085, BR-03).
- **Every value carries its source and time** ("Lab · 35 min ago"), and a stale value keeps its reading, marked stale ([patient-details.md](patient-details.md), "PD-120 — Freshness").
- **AI is labeled.** The case names the agent that flagged it and when, and that clinicians decide ([patient-details.md](patient-details.md) PD-AC-10).
- ⚠️ **Decision needed:** which sepsis states surface here vs. only in Virtual Sepsis (PRD OD-09).

ℹ️ As built: a summary card on top (the state, the agent, when it was flagged, how many elements are overdue, time zero with what set it, "n of 4 met" for SIRS and organ dysfunction, who decided and when), then **Criteria** and **SEP-1 bundle** side by side on a wide screen, then the hospital's protocol across the page. A rejected or excluded case keeps its criteria and says that bundle and protocol tracking stopped.

⚠️ **Discrepancy:** the PRD's states list Validated and Tracking apart; the build shows one state, "Validated · Tracking". The Patient card's proposed vocabularies differ again (screening: Candidate identified, Awaiting validation, Insufficient data, Excluded; validation: Pending review, Confirmed, Rejected, Excluded following adjudication; PC-080, PC-081). Which words the product uses is PRD OD-09.

⚠️ **Discrepancy:** the build's element statuses are done, due, declined and elapsed, with overdue worked out from the due time. DU-20 and VS-04 ask for **complete / in progress / pending / overdue / not applicable / review**, each element with its due time and performed time (design update spec §4's data contract).

⚠️ **Discrepancy:** VS-04 and DU-20 have time zero **proposed, then confirmed by a reviewer**. The build shows "Time zero (proposed)" while the case is a candidate, with no step that confirms or changes it.

ℹ️ While the case is a candidate, the build already shows the SEP-1 bundle with "Provisional until the candidate is validated." Whether a candidate's bundle shows at all is open (see Open Questions).

## Validating or rejecting a candidate

A candidate waits for an intensivist or APP to decide (Spec §8.1, VS-03):

- **Validate:** the case becomes a tracked case, with who validated it and when, and its bundle tracking continues.
- **Reject:** needs a reason (PD-080: Rejected, with reason). A SEP-1 exclusion picked with it makes the case **Excluded**, with the exclusion (exclusion adjudication, PD-080). An optional note goes with either.

Either decision shows who made it and when, and reaches the app: it survives a reload and shows on the Timeline's events lane ([patient-details.md](patient-details.md), "3.2.1 Tab review: what each tab lets the clinician do", PD-161).

ℹ️ As built: **Validate** and **Reject** under the summary; Reject opens a form in place with four reasons ("Another cause explains the criteria", "Chronic, not a new finding", "Already treated for this episode", "Other"), **SEP-1 exclusion** (No exclusion, Comfort measures only, Transferred in from another acute care hospital, Enrolled in a clinical trial, Left against medical advice) and **Note (optional)**; its button reads "Reject candidate" or, with an exclusion, "Exclude candidate", and stays off until a reason is picked. The lists are the prototype's; see Open Questions.

⚠️ **Discrepancy:** the Requirements say **confirm or exclude** (VS-03, §4); the PRD and the build say Validate and Reject. One pair of words is needed across the tab, Virtual Sepsis and the card.

## Declining a bundle element

An open bundle or protocol element can be declined with a rationale; it then reads as declined, with who, when and why (Spec §8.2: declined with rationale). Each element ends taken, declined with rationale or elapsed (VS-06).

ℹ️ As built: **Decline** on each open element opens "Why decline?" in place; **Decline element** stays off until something is written.

## Proposed actions (PD-168)

From the tab review ([patient-details.md](patient-details.md), "3.2.1 Tab review: what each tab lets the clinician do"):

| ID | Tab | Today | Made actionable (proposed) | Status |
|---|---|---|---|---|
| PD-168 | **Sepsis** | Validate; Reject (reason, exclusion, note); Decline an element; RN view-only | A bundle element can be marked **Done** (with its time). Time zero can be changed, with a reason. **Open in Virtual Sepsis** opens it (it does nothing today). Decisions reach the app (PD-161) | ⚠️ Not built |

- **Open in Virtual Sepsis** opens the module on this patient (PC-103).
- ⚠️ **Gap:** intervention prompts before a deadline (e.g. "repeat lactate due"), linked to an order suggestion, with their outcomes (VS-05, VS-06) aren't on the tab. They need the Sepsis Tracker's prompt rules (prompt 30 min before each deadline, Requirements §7.1).

⚠️ **Discrepancy:** the page renders the tab without `role`, `onAction` or `onOpenVirtualSepsis` (`patient-details.tsx`, `sectionContent`). So every user sees the intensivist's actions, a decision is kept only in the tab and lost on reload, and **Open in Virtual Sepsis** does nothing ([patient-details.md](patient-details.md), "3.2.1 Tab review: what each tab lets the clinician do", ⚠️ Gap).

## Who can do what

From the Requirements §4 roles and PD-162 (an action a role can't take isn't shown):

| Capability | Intensivist | APP | Critical Care RN |
|---|---|---|---|
| See the case, criteria, bundle and protocol | ✓ | ✓ | ✓ |
| Validate, reject or exclude a candidate | ✓ | ✓ | — |
| Decline a bundle element | ✓ | ✓ | — |
| Open in Virtual Sepsis | ✓ | ✓ | ✓ |

The Critical Care RN sees the case read-only; in place of Validate and Reject they read "An intensivist or APP validates or rejects this candidate.", and no Decline shows.

⚠️ **Assumption:** declining an element follows validation's roles (intensivist or APP), as built; the Requirements name only "confirm or exclude sepsis". Also in Open Questions.

## States

| State | What shows | What the clinician can do |
|---|---|---|
| Candidate | The state, the agent and when it flagged, the criteria, time zero marked proposed | Intensivist or APP: Validate, Reject; RN: read |
| Tracking | Who validated and when, the bundle by window with "n of n addressed" and each element's status, the hospital's protocol | Decline an open element (intensivist or APP) |
| An element overdue | The element and "Overdue by …" in the critical color with its icon; the summary counts the overdue elements | Decline it with a rationale |
| Rejected or excluded | Who decided, when, the reason or exclusion and the note; the criteria; the bundle and protocol say tracking stopped | Read |
| No case yet | ⚠️ Shown only on a patient on sepsis watch with no case (Discrepancy, "Reaching the tab"): "No sepsis screening yet" | Read |

## Accessibility

- A criterion's met, not met or missing has its own glyph and a word for screen readers, so color is never the only signal ([patient-details.md](patient-details.md), "18. Accessibility").
- An element's status is written out ("Done 2:14 PM", "Due in 45 min", "Overdue by 20 min", "Declined", "Elapsed"), not shown by color alone.
- Each **Decline** names its element for screen readers ("Decline Repeat lactate").
- The reject and decline forms open in place under their trigger; their submit stays off until the required field is filled.

## Acceptance Criteria

| ID | Criterion |
|---|---|
| PDS-AC-01 | The Sepsis section appears only with a screening or tracking event, and shows hospital protocol elements apart from SEP-1. (was PD-AC-14) |
| PDS-AC-02 | Each criterion shows met, not met or missing with its value, time and source; a missing criterion never reads as not met. |
| PDS-AC-03 | An intensivist or APP can validate a candidate, or reject it with a reason (and an exclusion, which makes it Excluded); the case then shows who decided and when. |
| PDS-AC-04 | A Critical Care RN sees the case but no Validate, Reject or Decline ([patient-details.md](patient-details.md) PD-AC-22). |
| PDS-AC-05 | A declined element shows who declined it, when and why. |
| PDS-AC-06 | Validate, Reject and Decline reach the app, survive a reload and show on the Timeline's events lane ([patient-details.md](patient-details.md) PD-AC-20, PD-AC-21). |
| PDS-AC-07 | **Open in Virtual Sepsis** opens Virtual Sepsis on this patient. |
| PDS-AC-08 | The 3-hour and 6-hour deadlines count from time zero, and a proposed time zero is marked as proposed. |

## Open Questions

| ID | Question |
|---|---|
| PDS-OD-01 | 🙋 Which sepsis states surface here vs. only in Virtual Sepsis, and in which words (PRD OD-09, [patient-card.md](patient-card.md)). |
| PDS-OD-02 | 🙋 Does a patient on sepsis watch with no case yet get the tab (with an empty state), or only once there's a candidate or a tracked case? |
| PDS-OD-03 | 🙋 Validate and Reject, or the Requirements' **confirm** and **exclude** (VS-03)? |
| PDS-OD-04 | 🙋 The reject reasons and the SEP-1 exclusions offered: the prototype's four reasons and four exclusions need clinical review; how do the population exclusions applied at screening (VS-02: liver failure, OB, pediatric, oncology) show here? |
| PDS-OD-05 | 🙋 Who confirms or changes time zero (VS-04 "proposed then confirmed by a reviewer", PD-168 "changed, with a reason"), and what the tab shows until then. |
| PDS-OD-06 | 🙋 The element statuses: the build's done / due / declined / elapsed, or DU-20's complete / in progress / pending / overdue / not applicable / review. |
| PDS-OD-07 | 🙋 Does a candidate's SEP-1 bundle show before validation, marked provisional (as built), or only once the case is tracked? |
| PDS-OD-08 | 🙋 Hour-1 bundle timer, SEP-1 3 h / 6 h deadlines, or both in the demo (Q-15). Today the alert shows the hour-1 timer and this tab the SEP-1 windows. |
| PDS-OD-09 | 🙋 Who may decline a bundle element: the intensivist and APP only (as built), or the Critical Care RN too? |
| PDS-OD-10 | 🙋 VS-07's "sepsis panel in the right rail + strip in the patient overview": does the Overview get a sepsis strip, or is this tab enough? |

## Out of scope

- Every patient on sepsis watch, across hospitals: [virtual-sepsis.md](virtual-sepsis.md).
- What the Patient card shows of a sepsis case: [patient-card.md](patient-card.md) (PC-080 to PC-085).
- The hour-1 bundle timer and its bedside checks in the alert (Scenario 3): [alert-maximized-modal.md](alert-maximized-modal.md) and DESIGN.md "Hour-1 sepsis bundle, exploration".
- Sepsis-bundle order suggestions: the Orders tab ([patient-details.md](patient-details.md), "PD-061 — Order recommendations").
- The hospital's sepsis protocol layer (CA-04) and compliance reporting (VS-08): Client Administration and Compliance & Reporting.
