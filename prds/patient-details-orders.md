---
requirements: [OE-01, OE-03, OE-04, OE-06, OE-07, OE-08]
status: proposed — confirm with Intercept
---

<!--
Created: Nov 25, 2026
Created by: Julio Caunedo
Last updated: Nov 25, 2026
Latest update: the acceptance criteria and open questions are numbered PDR-AC-01 and PDR-OD-01 on, each one moved from Patient details noting its old ID, so they can be cited without clashing with other tabs. Its new criteria and questions, unnumbered until now, got IDs too. Why: each tab gets its own ID prefix (user's call).
Recent updates: Created the same day from Patient details §9, so each tab has its own PRD.
Scope: The Orders tab of Patient details in Intercept Live (`OrdersSection`, src/layouts/intercept-live/patient-details/sections/orders-section.tsx): the AI agents' order recommendations and what the clinician decides on them, the patient's active orders from the hospital's EMR, and who may act on them. Moved out of PRD Patient details (§9 "Orders", its PD-171 row in "3.2.1 Tab review", the Orders row of "Care plan and activity", PD-AC-11 (now PDR-AC-01), PD-AC-12 (now PDR-AC-02), PD-OD-09 (now PDR-OD-01)).
Purpose: One place for what the Orders tab shows and does, and for the scope-of-practice rules on it, so they aren't spread across the page's PRD or reopened.
-->

# Patient details — Orders

**Location:** Intercept Live › a patient's page (Patient details) › **Orders** tab, after Medications; also reached from the Overview's Recent orders card  
**Audience:** Intensivists, APPs and Critical Care RNs  
**Description:** The order recommendations Intercept's agents make for the patient, to accept, modify or decline, and the patient's active orders from the hospital's EMR, read-only.  
**Source:** `src/layouts/intercept-live/patient-details/sections/orders-section.tsx` (`OrdersSection`), with the shared parts in `patient-details/section-parts.tsx` (`SectionCard`, `NoData`, `formatWhen`, `freshness`) and `shared/source-label.tsx`; rendered by `patient-details.tsx` (`sectionContent`); the Overview's Recent orders card in `patient-overview.tsx` (`RecentOrdersCard`); sample data in `patient-details/sample-data/sample-orders.ts`  
**Status:** Draft — built in the prototype (recommendations with Accept, Modify and Decline; read-only active orders), pending clinical and product validation. No Figma: the tab was drafted from this PRD (DESIGN.md "Intercept Live › Patient details", Sections). The decisions don't reach the app yet, and the actions proposed in PD-171 aren't built.

---

## Purpose

From the hub, the clinician sees what's ordered for the patient at the hospital, and what Intercept's agents recommend adding, with the evidence and protocol behind each. The intensivist or APP decides on each recommendation; a recommendation never becomes an order on its own (Spec §8.5). What's accepted goes to the hospital's EMR for signature where the hospital allows write-back, so the order of record stays the hospital's.

ℹ️ Related specs: the page itself (header, tabs, panels, freshness, data depth, page states, accessibility, audit) is in [patient-details.md](patient-details.md); how a pathway's order set is suggested, edited, accepted and co-signed in the alert is in [alert-maximized-modal.md](alert-maximized-modal.md), "5. Requirements" (AMM-014, AMM-015); how a pathway attaches to the care plan and shows its orders is in [care-plan.md](care-plan.md), "3. Pathways and the care plan"; the patient's medications are in [patient-details-medications.md](patient-details-medications.md).

## Reaching the tab

- **The tab row** of Patient details, in the page's tab order ([patient-details.md](patient-details.md), "3.2 Regions").
- **The Overview's Recent orders card:** the newest active orders with their status, and two links that open this tab: "n recommendations" (shown while any wait for a decision) and **All orders**.
- **Up next** on the Overview lists an open recommendation that has a due time. PD-163 proposes that it opens the recommendation here; not built.
- **New order** in the header's Create menu opens Order Entry with the patient in context, not this tab ([patient-details.md](patient-details.md), "PD-014 — Header actions").

The page's link, Back and the patient switcher are the page's ([patient-details.md](patient-details.md), "3.1 Entry points"). ℹ️ In the prototype the tab is in the page's address (`tab=orders`), so a reload or a shared link opens it.

## What it shows

Two cards, in this order:

1. **Recommendations** ("2 open" beside the heading): the open recommendations, then the agents that checked and found nothing to recommend, then **Addressed**, the ones decided or elapsed, newest first.
2. **Active orders**, with their source and age beside the heading ("Meditech · 2 min ago").

Recommendations come first because they're the only thing on the tab the clinician has to decide.

## Order recommendations

### PD-061 — Order recommendations

Suggestions from the Order-Entry Suggestion Agent and the Vent-Order Mismatch Agent (Spec §8.3, §8.5), in their v1 classes only: vent-order alignment, sepsis-bundle alignment, electrolyte replacement, glucose-management enrollment.

| Element | Requirement |
|---|---|
| **Look** | A recommendation, never an order: agent chip, "Recommendation", dashed edge (as AI rows in the triage queue, MON-023) |
| **Evidence** | The values that triggered it, with sources and times |
| **Protocol** | Which protocol it comes from: the hospital's, Intercept's curated one, SEP-1, or the glycemic system's criteria (Spec §8.5) |
| **Actions** | Accept, Modify, Decline with rationale. Each outcome is recorded as taken, declined with rationale, or elapsed (Spec §8.2 three-state telemetry) |
| **After Accept** | Integrated, where the hospital permits write-back: the order goes through write-back with the clinician's approval and is audited. Otherwise the clinician completes it in the hospital EMR (Spec §5.5) |

- Never places an order by itself (Spec §8.5).
- Insulin dosing is never proposed outside an integrated glycemic management system (Spec §8.5).
- ⚠️ **Constraint:** in material Intercept shows externally, "complete it in the hospital EMR" may not be depicted as a deep-link or screen-operated fallback (Brief, "Show the sanctioned integration story"). The prototype shows the Integrated write-back path (PD-134).

### An open recommendation

Each open recommendation is a card, two side by side where the tab is wide, showing:

- The agent ("AI · Order-Entry Suggestion"), "Recommendation", and how long ago it was suggested ("Suggested · 2 min ago").
- What it proposes ("Repeat lactate"), the order in full as it would be written ("Lactate, whole blood · once"), and the time it's due by, when it has one ("by 2:14 PM").
- Why, in a sentence ("The initial lactate was over 2, so SEP-1 asks for a repeat within 6 h of time zero.").
- **Evidence:** each value that triggered it with its source and age ("Lactate 4.1 · Lab · 35 min ago").
- Its class and protocol: "Sepsis bundle · CMS measure: SEP-1", "Electrolyte replacement · Hospital protocol: Sidney electrolyte replacement". A care pathway's order set accepted in an alert shows as the class **Care pathway** (DU-23; "Care pathways from an alert", below).
- Where the hospital allows write-back, "Goes to Meditech for signature" beside the buttons.

### Accepting, modifying and declining

- **Accept** records the recommendation as taken by the clinician. Where the hospital allows write-back, it's sent to the EMR for signature: its line under **Addressed** reads "Accepted by you · 2:14 PM" and "Sent to Meditech for signature · 2:14 PM", then "Signed in Meditech by Laura Mitchell · 2:21 PM" once signed.
- **Modify** opens the order's text in place, under the buttons. **Accept with changes** is enabled only once the text differs from the recommendation; the outcome reads "Accepted with changes", with the order as accepted. **Cancel** leaves the recommendation open, unchanged.
- **Decline** opens "Why decline?" in place. **Decline recommendation** is enabled only once a reason is written, so every decline carries its rationale; the outcome reads "Declined by Joanna Smith · 2:25 PM" with the reason in quotes. **Cancel** leaves it open.
- **Elapsed:** a recommendation nobody decided in time moves to **Addressed** as "Elapsed · no action by 9:10 AM".
- 🙋 **Open question:** when a recommendation elapses: its due time, a window per class, or the end of the shift. The build only shows the sample's elapsed ones.
- ⚠️ **Gap:** the page doesn't pass the clinician's decisions or role to the app (`onRecommendationAction`, `role`; [patient-details.md](patient-details.md), "3.2.1 Tab review: what each tab lets the clinician do"). A decision is kept only in the tab and lost on a reload, and the tab always shows the intensivist's view.

### When no agent has anything to recommend

An agent that checked the patient and found nothing to recommend says so, and why, under the open recommendations, so silence has a reason: "Vent-Order Mismatch · No mismatch. Settings match the active order: AC/VC, rate 22, tidal volume 420 mL, FiO₂ 60%, PEEP 10. Checked 2 min ago."

### Care pathways from an alert

A pathway accepted in an alert ([alert-maximized-modal.md](alert-maximized-modal.md), "5. Requirements", AMM-015) shows here too, from Recommendations › Addressed to Active orders:

| Part | Where | What it shows |
|---|---|---|
| **Orders** | Recommendations › Addressed, and Active orders | The pathway as a **Care pathway** recommendation: accepted by the intensivist (with the edited dose), sent for signature, then signed by the local physician (OE-03, OE-04); once co-signed, its orders are Active, ordered by the intensivist and co-signed by the local physician |

- ⚠️ **Gap:** an order the pathway replaces isn't discontinued: Furosemide IV 120 mg is Active beside the earlier furosemide order.
- ℹ️ The rest of what a pathway leaves on the page (the care plan, the activity, the note) is in [patient-details.md](patient-details.md), "Care plan and activity" and [care-plan.md](care-plan.md).

## Active orders

### PD-060 — Active orders

Active orders aggregated from the hospital EMR: type, details, ordering clinician, time, status and source (Spec §5.5 "read-only visibility into active orders").

- A line over the list says they're read-only: "Orders from Sidney Regional are read-only here."
- The orders are grouped by type, each group with its count: Medications, Labs, Imaging, Respiratory, Nursing, Diet. A type with no orders isn't shown.
- Each order shows its name and details ("Vancomycin", "1,250 mg IV every 12 h · pharmacy to dose"), who ordered it, when, and its status as the EMR names it (Active, Collected, Scheduled, Pending).
- ⚠️ **Gap:** OE-08 asks the list to reflect each order event from the EMR (new, modified, discontinued, PRN to scheduled, past due, not given). The list shows each order's current status only.

### PD-171 — Acting on an active order

From the tab review ([patient-details.md](patient-details.md), "3.2.1 Tab review: what each tab lets the clinician do", under PD-160 to PD-162):

- **Today:** Recommendations: Accept, Modify, Decline (kept in the tab).
- **Made actionable (proposed):** An active order gets **Discontinue** and **Modify**, as recommendations for the hospital's sign-off in Overlay mode or as orders where Integrated. Decisions reach the app with the user's role (PD-062).
- **Status:** ⚠️ Not built.

## Scope of practice

### PD-062 — Scope of practice

For an APP, orders that need the supervising intensivist's sign-off say so before Accept, name the supervisor, and route for co-signature (Spec §3.2). An RN sees recommendations read-only, or not at all. ⚠️ **Decision needed:** which (PDR-OD-01).

- **The APP:** a recommendation that needs co-signature says so on its card before any button: "Needs co-signature by Joanna Smith, your supervising intensivist. Accepting routes it to them." Its button reads **Accept and route**, and once accepted the outcome reads "Sent to Meditech for co-signature by Joanna Smith".
- ⚠️ **Discrepancy:** the build already shows the Critical Care RN the recommendations read-only, with "View only. An intensivist or APP accepts or declines recommendations." and no buttons, ahead of PDR-OD-01.

Order actions are for intensivists and APPs only, as the page's role rule says ([patient-details.md](patient-details.md), "17. Multi-tenant, authorization and audit", PD-132).

## Who can do what

| Capability | Intensivist | APP | Critical Care RN |
|---|---|---|---|
| See active orders | ✓ | ✓ | ✓ |
| See order recommendations | ✓ | ✓ | Read-only, or not at all (PDR-OD-01; built read-only) |
| Accept, Modify or Decline a recommendation | ✓ | ✓; one that needs sign-off routes to the supervising intensivist | — |
| Discontinue or Modify an active order (proposed, PD-171) | ✓ | ✓, routed for co-signature where required | — |

A role that can't take an action doesn't see its button (PD-162).

## States

| State | What shows | What the clinician can do |
|---|---|---|
| No order data for the patient | "No orders yet" and "Active orders and order recommendations will appear here." | Other tabs |
| No open recommendations | "No open recommendations for this patient.", then any agent checks and Addressed | Read what was addressed |
| No active orders | "No active orders from Sidney Regional." | — |
| The hospital doesn't allow write-back | No "Goes to … for signature"; Accept records the decision only | Accept, Modify, Decline |
| Signed in as a Critical Care RN | The recommendations read-only, with the View only line | Read them |
| The hospital's feed is delayed, offline, or the patient discharged | The page's banners and rules ([patient-details.md](patient-details.md), "PD-122 — Page states") | As the page allows |

- ⚠️ **Discrepancy:** where the hospital doesn't allow write-back, the Design Update spec's DU-23 (Proposed) asks the tab to say "Complete in hospital EHR", while PD-061's Constraint keeps any "complete it in the hospital EMR" path out of material shown externally. The build says nothing in that case. The notice's wording, if any, follows the page's data-depth rule ([patient-details.md](patient-details.md), "PD-121 — Data depth").

## Dates and times

Times follow the page's rule ([patient-details.md](patient-details.md), "PD-120 — Freshness"): an active order's time reads as a time within the last 12 hours ("8:10 AM") and with its date before ("Nov 18, 8:10 AM"); a recommendation's age reads as an age ("Suggested · 2 min ago").

- ⚠️ **Discrepancy:** the outcome lines under **Addressed** ("Accepted by you · 2:14 PM", "Elapsed · no action by 9:10 AM", "Signed in Meditech …") show a bare time whatever its age, where PD-120 asks for the date after 12 hours.

## Accessibility

The page's rules apply ([patient-details.md](patient-details.md), "Accessibility"). On this tab:

- Recommendations and Active orders are regions named by their headings; each recommendation's title is a heading under them, and Addressed has its own.
- A recommendation is told apart by words, not only its dashed edge: the agent chip and "Recommendation".
- The Modify and Decline forms open in place with labeled fields ("Order", "Why decline?"); their submit buttons stay disabled until there's something to send.
- The active orders table has a caption screen readers hear ("Active orders from Meditech, by type"), each type is a row group, and on a narrow tab the ordering clinician moves under the order's name rather than disappearing.
- Status is always a word (Active, Collected…), never color alone.

## Acceptance Criteria

| ID | Criterion |
|---|---|
| PDR-AC-01 | An order recommendation records its outcome as taken, declined with rationale or elapsed. (was PD-AC-11) |
| PDR-AC-02 | An APP sees which recommendations need co-signature before accepting; an RN can't accept one. (was PD-AC-12) |
| PDR-AC-03 | Every recommendation shows its agent, "Recommendation", its evidence with source and age, and its protocol; none becomes an order without a clinician's Accept. |
| PDR-AC-04 | No recommendation proposes insulin dosing. |
| PDR-AC-05 | **Decline recommendation** stays disabled until a reason is written; **Accept with changes** stays disabled until the order differs from the recommendation. |
| PDR-AC-06 | Where the hospital allows write-back, an accepted recommendation shows "Sent to {EMR} for signature", then "Signed in {EMR} by {name}" once signed. |
| PDR-AC-07 | An agent with nothing to recommend says so and why. |
| PDR-AC-08 | Active orders are read-only, grouped by type with counts, each with who ordered it, when and its status. |
| PDR-AC-09 | A decision on a recommendation survives a reload and shows on the Timeline's events lane (PD-161). |

## Open Questions

| ID | Question | Owner |
|---|---|---|
| PDR-OD-01 | 🙋 Whether an RN sees order recommendations (read-only) or not at all. (was PD-OD-09) | Clinical / Product |
| PDR-OD-02 | 🙋 When a recommendation elapses, and whether the clinician is told before it does. | — |
| PDR-OD-03 | 🙋 What the tab says where the hospital doesn't allow write-back: DU-23's "Complete in hospital EHR", or a data-depth notice that keeps within PD-061's Constraint. | — |
| PDR-OD-04 | 🙋 Whether an order a pathway replaces is discontinued with it, and who signs that. | — |

## Out of scope

- Writing a new order (search, order sets, the basket, sign; OE-02, OE-04, OE-05): Order Entry, opened from the header's **New order** ([patient-details.md](patient-details.md), "PD-014 — Header actions").
- Reviewing, editing and accepting a pathway's order set: [alert-maximized-modal.md](alert-maximized-modal.md) and the page's Pathway panel ([care-plan.md](care-plan.md)).
- The patient's medications as given and the pumps' rates: [patient-details-medications.md](patient-details-medications.md).
- Being the order record: the hospital's EMR ([patient-details.md](patient-details.md), "23. Out of scope").
