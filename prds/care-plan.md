---
requirements: [OE-03, OE-04, CC-09]
status: proposed — confirm with Intercept
---

<!--
Created: Nov 20, 2026
Created by: Julio Caunedo
Last updated: Nov 20, 2026 (problem card from intercept.ds: View history, statuses beside titles, CarePlanProblemCard)
Scope: The care plan in Intercept Live: the Patient details Care Plan tab (`CarePlanSection`) and the Overview's Care plan card (`CarePlanCard`), in src/layouts/intercept-live/patient-details/sections/care-plan-section.tsx. What a care plan is, how pathways attach to its problems, a problem's details and history, the Completed state, keep or transfer. Moved out of PRD Patient details ("Care plan and activity", "Care Plan tab").
Purpose: One place for what the care plan is and does, so the tab, the Overview's card and the alert's pathway agree, and the decisions behind them aren't reopened.
-->

# PRD — Care plan

**Product:** Intercept Live — Virtual Care OS  
**Module:** Provider Desktop, Patient details (Spec §5.1), with Order Entry (pathways, OE-03, OE-04) and Clinical Alerting (the alerts that suggest them)  
**Surface:** the **Care Plan** tab of Patient details, and the **Care plan** card on its Overview  
**Audience:** Intensivists, APPs and Critical Care RNs  
**Source:** `src/layouts/intercept-live/patient-details/sections/care-plan-section.tsx` (`CarePlanSection`, `CarePlanCard`); a problem's card and its pathway blocks are UCL's `CarePlanProblemCard` and `CarePlanPathway` (`src/components/cards/care-plan-problem-card/`); rendered by `patient-details.tsx` (`sectionContent`) and `patient-overview.tsx`; data types in `patient-details/activity.tsx`; the Pathway panel's status and **Mark completed** in `alert-panel/care-pathway.tsx`  
**Figma:** a problem's card is intercept.ds `careplan-card` (`1590:4164`); the rest of the tab has none; the Overview's card follows Intercept-Live "Care plan" (`242:12310`)  
**Version:** 0.1  
**Status:** Draft — built in the prototype, pending clinical and product validation  
**Last updated:** November 20, 2026

---

## 1. Overview

The care plan answers four questions about one patient: what's wrong (the **problems**), what the team wants for each (a measurable **goal**), what it does toward it (the **interventions**), and whether it's working (the **status**: Not progressing, Progressing, Met).

- **The hospital keeps it.** Every admitted patient has one, the **plan of care** in the hospital's record system (CMS Conditions of Participation, Joint Commission), kept by the bedside team and evaluated on rounds. The **attending** owns it.
- **Intercept adds to it; it doesn't rewrite it.** From the hub, the intensivist proposes changes (**pathways**) and decisions (**keep or transfer**) that the hospital's physician agrees to or co-signs.
- So in Intercept Live the care plan is the hospital's plan of care, plus the pathways sent from alerts, what they run (an hour-1 sepsis bundle, a DKA protocol's checks, bedside tasks) and keep or transfer with its checkpoints.

The tab shows the plan **as it stands now, by priority**, not as a timeline. A clinician taking over asks "which problems aren't working, and what's being done", not "what happened first". Time order lives inside each problem (CPL-013), and the whole patient's sequence is the Timeline's events lane (PRD Patient details, "Care plan and activity").

ℹ️ Related: the page and its tabs are in [patient-details.md](patient-details.md); how a pathway is reviewed, accepted and co-signed in the alert is in [alert-maximized-modal.md](alert-maximized-modal.md).

## 2. Users and use cases

| Moment | What the clinician needs from it |
|---|---|
| Taking over the patient (shift start, handoff, first look) | What's the plan and is it working: the problems by status, Not progressing first |
| After an alert | Does the plan cover this, or does it need to change: the suggested pathway under the problem it would treat, to review |
| While a pathway runs | Is it on track: time left on the bundle, the protocol's next check, overdue tasks |
| Before calling the attending, or on rounds | Problem by problem, with when each was last evaluated and how it got here |
| Deciding to keep or transfer | Whether keeping the patient is still safe: the checkpoints and how they went |

## 3. Pathways and the care plan

A pathway is a means; a problem is the end. A **pathway** is a standard set of orders for a condition (CHF exacerbation, sepsis, DKA, fall prevention). The **problem** is what it treats, and its goal says when the pathway worked.

1. An alert fires and suggests a pathway: **Needs review**.
2. The intensivist reviews it in the Pathway panel (or the alert's), edits a dose, then accepts or declines it with a reason.
3. Accepted, it goes to the hospital's physician for co-signature: **Awaiting co-signature**.
4. Co-signed, its orders are live: **Active**. It's now one of its problem's interventions.
5. It runs: the bundle, the protocol's checks, the bedside tasks.
6. The bedside team re-evaluates the problem (Progressing, then Met).
7. It's **Completed** once it has done its job (CPL-022).

## 4. Requirements

### CPL-001 — Where the care plan shows

- **The Care Plan tab** of Patient details: the whole plan, problem by problem (CPL-010 to CPL-030).
- **The Overview's Care plan card:** its compact summary (CPL-040). Its **View all · n** opens the tab.
- **The alert's care plan** (the alert panel): the pathway and keep or transfer for that alert, as [alert-maximized-modal.md](alert-maximized-modal.md) describes.

Every patient has a care plan: an admitted patient always has a plan of care, so the tab and the card are never empty for lack of an alert.

### CPL-010 — Chips and sources

✅ **Resolved:** at the top of the tab, Monitoring's chips, in the problems' order: **Needs review · n** (pathways waiting for review), **Not progressing · n**, **Progressing · n** and **Met · n**. They behave as Monitoring's quick views ([monitoring.md](monitoring.md)): one at a time, pressing one shows only the problems it names, pressing it again shows everything, and every chip shows its count, 0 included. A chip used as a filter, not a line of counts, so the counts are also the way to those problems.

- **Needs review** shows the problems with a pathway waiting for review, and the unlinked pathways waiting for review.
- **Met** shows the Met problems open, with no Show met.
- While a chip is pressed, keep or transfer and the other unlinked pathways don't show.
- A chip that matches nothing says so: "No pathway is waiting for review.", "Every problem is progressing or met.", "No problem is progressing.", "No problem is met yet."

✅ **Resolved:** at the bottom of the tab, under keep or transfer, where the plan comes from: the record system with when the plan was reviewed ("Meditech · reviewed 9 hr ago"), and Intercept with its latest decision ("Intercept · 27 min ago"), a line each, as the cards' source lines.

The tab takes the page's full width.

### CPL-011 — Problems and their order

A card per problem, in this order: a problem with a pathway waiting for review first, then Not progressing, Progressing and Met, in the record's order within each. A review comes first because it's work only the clinician can do.

✅ **Resolved:** Met problems fold away under the others, behind **Show met (n)** / **Hide met**, the same control as the Alerts panel's Show resolved. They open in place, under the others. A Met problem with a pathway waiting for review stays with the others, and when every problem is Met they all show (there's nothing to fold them under). A long stay piles up met problems that would otherwise push the open ones down.

### CPL-012 — A problem's card

The problem, its status beside it (Not progressing in red, Progressing in blue, Met in green), "Goal: …", the interventions in grey, then a block per pathway that treats it (CPL-021). A **View history** button on the right opens its details (CPL-013). "Evaluated 8 hr ago" at the bottom when the bedside team evaluated the problem before the plan's latest review.

~~✅ **Resolved:** the card follows intercept.ds `careplan-card`: the problem as the card's title, its status as a badge under it, then the goal and interventions; the History button on the right, lined up with the pathways' buttons.~~

✅ **Resolved:** the card follows intercept.ds `careplan-card`: the problem as the card's title with its status as a badge beside it (under it only when a long problem leaves no room), then the goal and interventions; **View history** on the right, lined up with the pathways' buttons.

The problem is read-only: the plan of care is the hospital's, and Intercept changes it only through pathways.

### CPL-013 — A problem's details

~~✅ **Resolved:** the card's top row (the problem, its status and a chevron) opens its details in place, under the card's content, and closes them again. Any number can be open at once; the rest of the tab doesn't move away. A pathway's own buttons stay outside that row.~~

✅ **Resolved:** the card's **View history** button (a clock icon and its label; ~~an icon alone, named and tooltipped "History"~~) opens its details in place, under the card's content, and closes them again; it looks pressed while they're open. The problem's title is no longer a button, and there's no chevron. Any number can be open at once; the rest of the tab doesn't move away.

The details hold:

1. **History**, newest first, a line each, with its time on the left and who at the end:
   - The bedside team's **evaluations** from the record system: "Evaluated" with the status it gave, and by whom ("Bedside nurse", "Charge nurse").
   - For each pathway that treats it: the **alert** that suggested it ("Low alert: Bed exit alarm · Suggested the Fall prevention pathway"), **sent for co-signature** ("1 edited dose · You"), **Co-signed by Dr. Tom Weller** ("Orders active"), **declined** (its reason), **completed** (by whom, or "Acute on chronic heart failure met").
   Every problem has at least its latest evaluation, so the history is never empty.
2. **Orders**, when a pathway treats the problem: each of its orders with its dose, an edited dose marked **Edited** with the suggested dose struck through, and its status: **Awaiting co-signature** or **Active** (still Active once the pathway is Completed). A suggestion's orders show without a status; a declined pathway's don't show.

✅ **Resolved:** the history and orders, not the plan's whole sequence: time order belongs inside one problem, where it explains how this problem got here.

### CPL-020 — A pathway inside the problem it treats

Each pathway names the problem it treats, and shows inside that problem's card. A pathway whose problem isn't on the plan shows in an **Other pathways** card after the problems ("Not tied to a problem on the plan of care."). Every alert's pathway shows, not only the first.

ℹ️ For developers: the link is the alert's `problemId` (or the recorded pathway's), a plan-of-care problem's `id`. In the prototype it's sample data: the scenarios' pathways name their problem, and other alerts are matched to the patient's plan by kind (`sampleProblemFor`); the app gets it from Order Entry with the plan of care.

### CPL-021 — A pathway block

- Its title and status: **Needs review**, **Awaiting co-signature**, **Active**, **Completed** or **Declined**.
- Where it is, with when: "Co-signed by Dr. Tom Weller · 1:31 PM. Orders active."; "Declined by You · Nov 18, 8:10 AM: "reason""; "Completed: Acute on chronic heart failure met · 6:02 AM".
- Its orders: "3 orders · 1 edited"; for a suggestion, "4 orders waiting for your review" and where it comes from.
- What it runs now, a line each, red when overdue: the hour-1 sepsis bundle (done so far, time left), the DKA protocol (its next check), the bedside tasks (open, overdue). Nothing once it's Completed.
- **Review pathway** while it's a suggestion, **Open pathway** after. Either opens the page's Pathway panel on that alert's pathway, or the alert when the page has no panel.

✅ **Resolved:** the block follows intercept.ds `careplan-card`: the title, its status as a badge beside it (~~under it~~), then where it is and its orders, with **Review pathway** / **Open pathway** on the right. What it runs goes under those lines.

A suggestion's block is dashed, as in the alert. Something an alert runs without a pathway (a sepsis bundle before its pathway) shows as its own block, **In progress** or **Overdue**.

### CPL-022 — Completed

✅ **Resolved:** a pathway is **Completed** once it has done its job, in either of two ways:

- **Its problem is Met:** when the bedside team evaluates the problem it treats as Met, an active pathway reads Completed, with why and when ("Completed: Acute on chronic heart failure met · 6:02 AM"). The problem's goal is what says the pathway worked.
- **The clinician marks it:** **Mark completed** in the co-signed banner of the Pathway panel (and the alert's), for a pathway that ends for a reason the data doesn't show. The banner then reads "Completed · 2:20 PM" with the co-signature under it, and **Reopen** takes it back to Active. Both are logged on the Timeline ("CHF exacerbation pathway completed", "CHF exacerbation pathway reopened").

✅ **Resolved:** only the intensivist and the APP may **Mark completed** or **Reopen**: they're the ones who accept pathways. A Critical Care RN sees the same banners without either button (Requirements §4: the RN can't sign orders); a pathway still completes on its own when its problem is Met.

A Completed pathway shows a grey **Completed** badge on the tab, the Overview's card and in the alert. What it ran no longer shows under it. Its orders stay as the hospital keeps them: Completed doesn't discontinue an order.

### CPL-030 — Keep or transfer

A card after the problems: the decision as its title ("Keeping at Chadron"), its outcome ("Transfer avoided"), the reason, who decided and when, then "Checkpoints · 2 of 2 passed" with each checkpoint's due time, criteria and result (**Passed**, **Missed**, or how soon it's due: "In 45 min", "Overdue 10 min"), then what keeping the patient saved (the trip the family didn't make, the estimated transfer cost avoided, the ICU-level care delivered here).

### CPL-040 — The Overview's Care plan card

The plan's compact summary, in the Overview's grid beside Up next. Rows, in order: the pathway (Needs review while suggested, its status once sent, with what it runs under it), keep or transfer ("2 of 2 checkpoints passed", Transfer avoided), then the plan's problems with their goal, interventions and status. Four rows in all, about Up next's five in height; it never scrolls, and a narrow card shows fewer rows rather than cutting one. **View all · n** opens the Care Plan tab. No way into the pathway from the card: the tab's pathway blocks have it. A source line each at the bottom: Intercept's, and the record system's with when the plan was last reviewed. Before the plan arrives from the record system: "Care plan not received from the record system yet."

### CPL-050 — Dates and times

Every time follows Patient details' rule ([patient-details.md](patient-details.md), "PD-120 — Freshness"): a time within the last 12 hours reads as a time ("8:10 AM"), anything older carries its date ("Nov 18, 8:10 AM"). How old something is reads as an age ("reviewed 9 hr ago", "Evaluated 8 hr ago"); what's due reads as how soon ("In 45 min", "Overdue 10 min").

## 5. States

| State | What shows | What the clinician can do |
|---|---|---|
| Plan not received yet (a patient admitted minutes ago) | "Care plan not received from the record system yet.", then any pathways under **Pathways** | Review or open the pathways |
| No pathway | The problems only | Open a problem's details |
| A pathway needs review | Its problem first, the block dashed, **Needs review · 1** | **Review pathway**; press **Needs review** to see only those |
| Every problem Met | All of them, no Show met | Open a problem's details |
| Pathway Completed | Grey **Completed**, why and when, nothing running under it | **Open pathway**; **Reopen** in the Pathway panel when it was marked |

## 6. Accessibility

- ~~A problem's top row is a button named by the problem and its status ("Acute on chronic heart failure Progressing"), with `aria-expanded`; it stays inside the problem's heading, so heading navigation still lists the problems.~~
- Each problem is a region named by its heading (the problem), so heading and landmark navigation list the problems. Its **View history** button has `aria-expanded` and `aria-controls` pointing at the details.
- **Show met (n)** says whether it's open (`aria-expanded`).
- History times are `<time>` elements with the full date and time.
- Status is never color alone: every badge has its word.
- The Pathway panel's **Mark completed** and **Reopen** are buttons; the banner announces the change (`role="status"`).

## 7. Acceptance criteria

- **CPL-AC-01:** Given a patient whose plan has a problem a pathway treats, the pathway shows inside that problem's card; given one whose problem isn't on the plan, it shows under **Other pathways**.
- **CPL-AC-02:** A problem with a pathway that needs review is first, then Not progressing, Progressing, Met.
- **CPL-AC-03:** With some problems Met and some not, the Met ones are behind **Show met (n)** and open under the others; with every problem Met, all show.
- **CPL-AC-04:** Clicking a problem's **View history** button opens its history, newest first, and its pathway's orders; clicking again closes them. Margaret Hayes's heart failure shows "Co-signed by Dr. Tom Weller", and Furosemide IV marked **Edited**.
- **CPL-AC-05:** **Review pathway** / **Open pathway** opens the Pathway panel on that pathway.
- **CPL-AC-06:** **Mark completed** in the Pathway panel turns the pathway **Completed** in the panel, the tab and the Overview's card, and logs it on the Timeline; **Reopen** turns it back to **Active**.
- **CPL-AC-11:** Signed in as a Critical Care RN, the co-signed banner has no **Mark completed** and the Completed banner no **Reopen**; as an intensivist or APP, both show.
- **CPL-AC-07:** When the problem a pathway treats is evaluated Met, the pathway reads "Completed: <problem> met" with when.
- **CPL-AC-08:** A time older than 12 hours shows its date.
- **CPL-AC-10:** Pressing **Not progressing** shows only the Not progressing problems and hides keep or transfer; pressing it again shows everything. Each chip's count matches what it shows.
- **CPL-AC-09:** The Overview's card shows at most four rows and **View all · n** opens the tab.

## 8. Open decisions

| ID | Question |
|---|---|
| CPL-OD-01 | ⚠️ **Gap (Figma):** the Care Plan tab and a problem's details aren't drawn; they follow the Overview's card style (`242:12310`). |
| CPL-OD-02 | ~~🙋 Who may **Mark completed** and **Reopen**: the prototype lets anyone signed in. Recommended: the intensivist and the APP (who can accept pathways), not the Critical Care RN (Requirements §4: can't sign orders).~~ ✅ **Resolved:** the intensivist and the APP only (CPL-022). |
| CPL-OD-03 | ⚠️ **Gap:** a pathway reopened after being marked Completed shows in the Timeline, not in its problem's history; the history only knows the latest completion. |
| CPL-OD-04 | ⚠️ **Assumption:** evaluations name a role ("Bedside nurse", "Charge nurse"), not a person, until the record system's evaluator is known per hospital. |
| CPL-OD-05 | 🙋 Whether a problem's details should also list the medications and notes about it. Needs those records tagged with the problem. |
