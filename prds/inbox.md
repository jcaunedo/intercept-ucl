---
requirements: [AL-03, AL-05, AL-09, OE-03, OE-06, CD-02, CD-05, HO-02]
status: proposed — confirm with Intercept
---

<!--
Created: Nov 17, 2026
Created by: Julio Caunedo
Last updated: Nov 18, 2026
Scope: Intercept Live's Inbox page in the Clinical workspace (src/layouts/intercept-live/inbox/: InboxPanel and its sample items): what's in the queue, To do and Done, the order, each kind's actions, filters, sorting, several at once, and how its alerts relate to Monitoring's. Sources: documents/Intercept Live — Left Nav Spec.md (Inbox), the System Specification §6.21 Work Management and Inbox and §5.6, PRD Sidebar NAV-020 and NAV-042, intercept.ds Inbox table (`1531:7584`).
Purpose: Records what the first Inbox layout does, so the team can confirm or change it, and lists what's still open.
-->

# PRD — Inbox

**Product:** Intercept Live — Virtual Care OS  
**Module:** Work Management and Inbox, Spec §6.21 (the clinician's queue), fed by Clinical Alerting (§5.6), Clinical Documentation, Order Entry and Handoff  
**Surface:** the **Inbox** page, the Clinical Sidebar's shift-work group (Monitoring, Inbox, Messages, Protocols)  
**Version:** 0.1  
**Status:** Draft — a first layout in the prototype, pending product validation with Intercept  
**Last updated:** November 18, 2026

---

## 1. Overview

The Inbox is the one place a clinician goes to do the work waiting on them, whichever module produced it. The Left Nav Spec defines it as "one queue: alerts to acknowledge, AI Scribe drafts to sign, suggested orders, failed EMR write-backs. Replaces Alert Queue." The spec's reason: "Without a unified work model, each module renders its own queue, the user navigates between them, and items fall through the cracks" (§6.21).

The Inbox is a queue, not a feed: each item stays until it's done, and what's left at the end of the shift goes to the next clinician at handoff (§6.21 "Shift Summary and Handoff"; HO-02).

ℹ️ It replaces the Alert Queue page because "three alert surfaces disagreed on the count" (Left Nav Spec). So its alerts are the same alerts as Monitoring's: one record, one count (INB-002).

### 1.1 Product objectives

| Objective | What it means for the Inbox |
|---|---|
| **One queue** | Every kind of work in one list, the most urgent first, never a queue per module (§6.21, Spec §9.1 #10). |
| **One count** | An alert acknowledged here is acknowledged on Monitoring, in the toasts and on the patient, and the reverse (AL-03 "counts update everywhere"). |
| **Act in place** | The usual action is on the row (Acknowledge, Accept, Retry); anything that needs reading opens where it's read (the alert, the patient's page). |
| **Nothing falls through** | An item stays in To do until it's done; overdue items say so; what's left goes on at handoff. |
| **Accessible** | A table with named columns; every row's action named for its item; selection and counts said in words, never color alone. |

### 1.2 Source documents

| Document | What this PRD takes from it |
|---|---|
| Left Nav Spec (Nov 14, 2026) | Inbox: one queue of alerts to acknowledge, AI Scribe drafts to sign, suggested orders and failed EMR write-backs; replaces Alert Queue; a red count when it includes critical items; items waiting in the Inbox in the start-of-shift handoff |
| System Specification | §6.21 Work Management and Inbox (unified work-item model: type, source module, priority, assignee, deadline, status, audit trail; filtering, sorting, grouping; assignment and delegation; bulk operations; SLA and overdue; handoff), §5.6 Clinical Alerting (Clinician Intuition Alerts) |
| Requirements Specification | AL-03 (lifecycle; counts update everywhere), AL-05 (Clinician Intuition Alert), AL-09 (low and operational items aren't counted as open), OE-03 (AI order suggestions: accept, modify, decline with rationale), OE-06 (write-back gating), CD-02, CD-05 (Scribe draft, sign), HO-02 (inherited items move to the inbox) |
| PRD Sidebar | NAV-020 (Inbox in the shift-work group), NAV-042 (the red count) |
| PRD Monitoring | The alerts, their lifecycle and the triage queue's order (MON-020 to MON-023) |
| intercept.ds | Inbox table (`1531:7584`) and Table Row Variant=Inbox, Size=64, State=Default and Unread (`1531:7617`, `1563:5209`): the 44px heading row with select-all, the unread dot, the avatar, the two-line item, the Type badge, the date with Due / Overdue under it, the row's action button and "…". No Inbox page is drawn. ⚠️ **Gap:** design the page (INB-OD-01) |

## 2. Users and use cases

| User | What they use it for |
|---|---|
| **Intensivist, APP** | Clear what's waiting: acknowledge alerts, accept or decline suggested orders, sign Scribe drafts, retry failed write-backs, take over the last shift's items. |
| **Critical Care RN** | The same for the work their role gets (which kinds reach an RN is open, INB-OD-05). |

| Use case | Story |
|---|---|
| **Start of shift** | Joanna opens the Inbox: 13 items, 1 critical. Sarah Miller's sepsis alert is first, due in 3 minutes; she acknowledges it from the row. |
| **Suggested order** | The sepsis bundle suggests vasopressin for Sarah Miller; she accepts it from the row, or declines it from its menu. |
| **Sign the drafts** | She filters **To sign**, opens each draft on the patient's page, signs it there. |
| **Clear the routine** | She picks the handoff item and a progress note and marks both done at once. |

## 3. Anatomy

| Part | What it shows |
|---|---|
| **Tab bar** | **To do** (with a count, red while anything critical waits) and **Done**, under the app header as the Patients page's hospital bar; at its right, "What's left goes to the next shift at handoff" (INB-010). |
| **Summary** | "13 items to act on · 1 critical" (the critical part in the Critical color); on Done, "2 done". |
| **Filter bar** | A search, **Unread** (To do only), then a chip per kind with its count (**Alerts**, **To sign**, **Suggested orders**, **Write-backs**, **Handoff**, **Follow-ups**), and the sort at the right on To do (INB-030, INB-031). |
| **Selection bar** | With rows picked: "2 selected", **Mark done**, **Clear** (INB-040). |
| **Table** | intercept.ds's Inbox table (Table `lg`, flat heading row): **Patient** (checkbox, the unread dot, avatar, name, hospital · unit · bed), **Item** (title, then source · detail), **Type** (a Badge), **Received** (how long ago; under it the due time or Overdue), then the row's action and "…" (INB-020). |

## 4. Requirements

### INB-001 — What's in it

Every work item waiting on the signed-in clinician, whatever produced it:

| Kind | From | Example |
|---|---|---|
| **Alert** | Clinical Alerting: rules, devices, AI agents, and clinicians' concerns (Clinician Intuition Alerts, AL-05) | "Sepsis candidate · Sepsis Sniffer" |
| **To sign** | AI Scribe drafts (CD-02) | "Video consult note · Draft from your 10:12 AM consult" |
| **Suggested order** | AI order suggestions and pathways (OE-03) | "Vasopressin 0.03 units/min · Sepsis bundle" |
| **Write-back failed** | A signed note or order that didn't reach the hospital's EHR (OE-06) | "Progress note didn't reach the EHR" |
| **Handoff** | Items the last clinician handed over and this one acknowledged (HO-02) | "Follow up the 4 PM blood gas · James Turner, night shift" |
| **Follow-up** | A follow-up after discharge that the readmission risk scheduled, e.g. a nurse phone check on the hub tele-RN's list (PRD Transitions of care TOC-021) | "72-hour nurse phone check · Readmission risk · For Ava Brooks, RN (hub tele-RN)" |

✅ **Resolved:** a follow-up after discharge is its own kind, **Follow-up** (a chip, "Follow-ups", and a sky Badge). When it's for someone else, its row says who ("For Ava Brooks, RN (hub tele-RN)"); its button, **Open**, opens the patient's Discharge section, where it's recorded; once done it moves to Done "by" whoever did it.

- ⚠️ **Decision needed:** the spec's other work types (eligibility exceptions, credentialing, schedule approvals, integration approvals, audit prompts) belong to other roles; which reach a clinician's Inbox, if any (INB-OD-05).

### INB-002 — Its alerts are Monitoring's

The Inbox shows the layout's own alerts, the same records as Monitoring, the toasts and the patient's page. An active alert is in To do; acknowledged, escalated, resolved or declined, it's in Done. Acknowledging from the Inbox is the alert's own Acknowledge (AL-03): Monitoring's card, the toast and the patient show it at once, and an alert acknowledged elsewhere leaves To do.

- ✅ **Resolved:** one source for alerts, so the counts can't disagree.
- ⚠️ **Decision needed:** AL-07 and AL-09 say low and operational items aren't counted as open. Today Low alerts are in To do and in its count. Keep them listed but out of the count, list them apart, or leave them out (INB-OD-02)?

### INB-010 — To do and Done

**To do** holds what's waiting; **Done** what was completed, newest first, with when and by whom ("by Ashley Bell, RN" when someone else did it). An item the clinician completed here can go back to To do from its menu (**Move back to To do**; for an alert, it undoes the Acknowledge). Something someone else addressed can't be moved back.

The To do count is every item waiting; red (Counter `critical`) while one is critical, grey otherwise.

- ⚠️ **Gap:** the Sidebar's Inbox has no count yet (NAV-042 is undesigned); the tab's count is the page's only one.

### INB-011 — Unread

A blue dot (intercept.ds `inbox-unread`) before an item that's new: an alert active for under an hour, or an item marked new. Opening the item or completing it clears the dot; the patient's name and the title are bold while new (intercept.ds Inbox row State=Unread).

- ⚠️ **Decision needed:** what "new" means: since the clinician last opened the Inbox, since the item arrived, or until it's opened (INB-OD-03).

### INB-020 — Order

By priority (default): Critical alerts, then High alerts and high-priority items (a suggested order with a deadline, a failed write-back), then Medium alerts, then routine items, then Low alerts; within each, due soonest, then newest. **Newest** and **Due soonest** are the other sorts. Done is always newest first.

### INB-021 — Due and overdue

An item with a deadline (an alert's response target, an order's window, a draft's signing deadline) shows "Due in 12 min" under its received time; past it, "Overdue 6 min" in red (§6.21 "SLA tracking and overdue-work surfacing").

### INB-022 — Opening an item

The item's title opens it: an alert opens the alert (the alert modal), anything else the patient's page. The row's "…" has **Open alert** or **Open patient** (and **Open patient** for an alert).

- ⚠️ **Gap:** a draft opens the patient's page, not the draft in Notes; an order opens the patient, not the order (INB-OD-04).

### INB-023 — Row actions

| Kind | On the row | In "…" |
|---|---|---|
| Alert | **Acknowledge** | Open alert, Open patient, Acknowledge |
| To sign | **Review** (opens the patient) | Open patient, Mark done |
| Suggested order | **Accept** | Open patient, Mark done, **Decline order** |
| Write-back failed | **Retry** | Open patient, Mark done |
| Handoff | **Accept** | Open patient, Mark done |
| Done | — | Open, Move back to To do (only what was done here) |

Each moves the item to Done at once and tells the app (`onAlertAction`, `onItemAction`).

- ⚠️ **Gap:** Decline takes no reason; OE-03 asks for a rationale. Accept doesn't offer modify (OE-03). Retry doesn't show it working or failing again.
- ⚠️ **Decision needed:** should Sign happen on the row for a short draft, or always after reading it (CD-05)?

### INB-030 — Filters and search

✅ **Resolved:** on To do, an **Unread** chip comes first, right after the search: the new items only (INB-011), marked by the same blue dot as their rows, with its count; it combines with the kind chips (Unread and To sign: the unread drafts). Done has nothing unread, so it has no Unread chip. Then a chip per kind, each with how many of that kind are in the tab; several can be on (any of them). The search matches the item's title, detail, source, type, and the patient's name and hospital. With nothing left: "Nothing matches · Try another search or filter."

### INB-031 — Sort

On To do: **Priority** (default), **Newest**, **Due soonest** (INB-020).

### INB-040 — Several at once

Each To do row has a checkbox, and the heading row selects every row shown. With one or more picked, a bar opens over the table: "2 selected", **Mark done** (alerts are acknowledged), **Clear**. Switching tabs clears the selection (§6.21 "bulk operations on work items where the work type permits").

- ⚠️ **Decision needed:** which kinds can be done in bulk: should a Critical alert or a suggested order be excluded (INB-OD-06)?

### INB-050 — Handoff

What's still in To do at the end of the shift goes to the incoming clinician's Inbox once they acknowledge the handoff (§6.21, HO-02), as a **Handoff** item naming who handed it over. The tab bar says so.

- ⚠️ **Gap:** the hand-over itself isn't built: handoff items are sample data.

### INB-060 — Where it opens

The Clinical Sidebar's **Inbox** (NAV-020). A shared link opens it with `?page=inbox`. The Monitoring and Patients layouts render it when given an `inbox`; without one, the page shows its empty state ("Nothing in your inbox").

## 5. States

| State | What it shows |
|---|---|
| **Default** | To do, by priority, every kind |
| **All caught up** | "You're all caught up · Alerts, drafts to sign and suggested orders will appear here as they come in." |
| **Nothing matches** | "Nothing matches · Try another search or filter." |
| **Nothing done yet** (Done) | "Nothing done yet · What you complete this shift will appear here." |
| **Rows picked** | The selection bar over the table; picked rows tinted |
| **Narrow** | The table scrolls sideways (at least 960px wide) |

## 6. Accessibility

- A table named To do or Done, with column headings; the actions column is named "Actions" for screen readers.
- Each checkbox is named for its item ("Select Daily progress note"); the heading's "Select every item" is mixed while some are picked.
- The unread dot is named "New"; each "…" is named "More for {item}".
- The To do tab reads its count and how many are critical; the summary is announced when it changes.
- Type is a word on a Badge, never color alone; Overdue is a word, not only red.

## 7. Acceptance criteria

| ID | Criterion |
|---|---|
| INB-AC-01 | The Inbox opens on To do, by priority, with the Critical alert first and the To do count red (INB-010, INB-020). |
| INB-AC-02 | Acknowledge on an alert's row tells the layout (the same action as the alert's own) and moves the row to Done; Monitoring shows it acknowledged (INB-002, INB-023). |
| INB-AC-03 | Picking two rows and Mark done completes both and reports each (INB-040). |
| INB-AC-04 | The To sign chip leaves only the drafts (INB-030). |
| INB-AC-05 | Decline order in a suggested order's menu reports the decline and moves it to Done (INB-023). |
| INB-AC-06 | With no alerts and no items: "You're all caught up". |

## 8. Open decisions

| ID | Decision | Owner | Notes |
|---|---|---|---|
| INB-OD-01 | The Inbox page in intercept.ds | Design | Only the table and its row are drawn |
| INB-OD-02 | Low and operational alerts: counted, listed apart, or left out | Product, clinicians | AL-07, AL-09; INB-002 |
| INB-OD-03 | What "new" (the unread dot) means | Product | INB-011 |
| INB-OD-04 | Open a draft in Notes and an order in Orders, not just the patient | Product, Design | INB-022 |
| INB-OD-05 | Which work types reach a clinician (and an RN) vs an operations role | Product, Intercept | §6.21 lists many; INB-001 |
| INB-OD-06 | Which kinds can be done in bulk; assign and reassign (§6.21) | Product, clinicians | INB-040; AL-06 keeps snooze and assign out of the prototype |
| INB-OD-07 | The Sidebar's red count and whether Monitoring's alert dot moves to Inbox | Product, Design | NAV-042; PRD Sidebar's open decision on the alert dot |
