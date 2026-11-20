---
requirements: [UX-07, UX-09, UX-11, PD-08, PD-10, CC-01, SA-01, SA-02, SA-03, CA-02, CA-06, SC-08, SC-09]
status: proposed — confirm with Intercept
---

<!--
Created: Nov 16, 2026
Created by: Julio Caunedo
Last updated: Nov 20, 2026
Scope: The left navigation (UCL Sidebar): its three workspaces (Clinical, Administration, Marketplace), the items each one shows, the workspace switcher, Ask Intercept Live's place in it, and the rail's states. Source: documents/Intercept Live — Left Nav Spec.md and intercept.ds `sidebar` (1001:544).
Purpose: Turns the Left Nav Spec into requirements and acceptance criteria, records where the design follows it and where it doesn't yet, and lists what's still open.
-->

# PRD — Sidebar

**Product:** Intercept Live — Virtual Care OS  
**Module:** the Provider Desktop shell and the Administration and Marketplace workspaces (Spec §9.2, §5.1, §5.7, §5.18)  
**Surface:** a component, not a page: the **Sidebar** (UCL `Sidebar`, `SidebarMenuButton`), the left navigation of every workspace  
**Audience:** Every signed-in user, in each workspace they have (§2): intensivists, APPs and Critical Care RNs in Clinical; administrators and operations roles in Administration; Independent Clinicians in Marketplace  
**Version:** 0.1  
**Status:** Draft — pending product validation with Intercept  
**Last updated:** November 20, 2026

---

## 1. Overview

The Sidebar is the app's left navigation. It's organized by **workspace** and by the clinician's workflow, not by the Specification's 18 modules: Clinical, Administration and Marketplace each have their own sidebar, and the rail itself (logo, Ask Intercept Live, groups of items, footer) is the same in all three.

It answers one question on every shift: where do I go next? Every item has to be worth its space on every shift; actions (create, request) live in the page or the patient chart, not in the Sidebar.

ℹ️ The Sidebar is one component; the items are the app's. Each workspace passes its own groups (intercept.ds `sidebar` Role=Clinical, Marketplace, Administration).

### 1.1 Product objectives

| Objective | What it means for the Sidebar |
|---|---|
| **Three workspaces, not eighteen modules** | One sidebar per workspace; modules render inside the workspace, never as their own destinations (Spec §9.2, UX-07). |
| **What do I need to know, and nothing more** | Few items, in two groups by how often they're used; nothing that repeats another page (Spec §9.1 #2). |
| **One channel for notifications** | One Inbox, not separate alert queues (Spec §9.1 #10, §6.21). |
| **Hospital is never a mode** | Hospital is a filter on a page, never a level of the nav or a workspace (Spec §9.1 #1). |
| **Accessible from day one** | WCAG 2.1 AA, with a full keyboard path through the nav (Spec §9.1 #13, UX-09). |

### 1.2 Source documents

| Document | What this PRD takes from it |
|---|---|
| Left Nav Spec (Nov 14, 2026) | The workspaces, who sees which, each workspace's items, Ask Intercept Live's placement, the states, and what isn't in the Sidebar |
| intercept.ds `sidebar` (`1001:544`) | The design: Variant=Expanded / Collapsed × Role=Clinical, Marketplace, Administration; `sidebar-menu-button` (`1001:501`) for the rows |
| System Specification | §9.1 (principles), §9.2 (three workspaces), §5.1, §5.7, §5.12–§5.18 (the modules behind each item), §3 (user types) |
| Requirements Specification | UX-07 (one workspace), UX-09 (keyboard paths, labeled icon buttons), UX-11 (no dead controls; off-path features labeled Preview), PD-08 (global chat and navigation entry), PD-10 (role-based defaults), CC-01 (unified inbox), SA-01–SA-03 (System Administration), CA-02, CA-06 (Client Administration), SC-08, SC-09 (Specialty Care Access) |
| DESIGN.md "Sidebar" | How the rail is built: sizes, tokens, states, alert dots, motion |

## 2. Users and use cases

| User | Workspaces | Lands on | Sees the switcher |
|---|---|---|---|
| **Intensivist, APP, Critical Care RN** | Clinical | Monitoring | No |
| **Operations Lead who also covers APP shifts** | Clinical, Administration, Marketplace | Administration › Operations | Yes |
| **CMO or CNO with admin rights** (§3.11) | Clinical, Administration | Monitoring | Yes |
| **Independent clinician** (§3.10) | Marketplace, Clinical (on booked shifts) | Marketplace › Open shifts | Yes |
| **Hospital Client Administrator** | Administration, Marketplace | Administration › Overview | Yes |
| **System Administrator** | Administration, Marketplace | Administration › Operations | Yes |

| Use case | Flow |
|---|---|
| **Start a shift** | Signs in and lands on Monitoring; the start-of-shift handoff briefing shows on top of it (NAV-070). |
| **Work the queue** | Opens Inbox from anywhere; its count says how much is waiting and whether any of it is critical. |
| **Ask about what's on screen** | Opens Ask Intercept Live from the Sidebar; the chat opens beside it, aware of the page. |
| **Switch to admin work** | Uses the switcher (in the account menu, NAV-011) to go to Administration; the sidebar, landing page and search scope change, the hospital filter doesn't. |
| **Work on a small screen** | Collapses the rail to icons; every item keeps its tooltip, its alert dot and its current-page state. |

## 3. Anatomy

| Part | What it is |
|---|---|
| **Logo row** | The Intercept Live wordmark and the Collapse sidebar button. Collapsed: the mark alone, which turns into the expand icon on hover. |
| **Workspace switcher** | ~~Below the logo row, for people with more than one workspace. Not designed yet (NAV-011).~~ ✅ **Resolved:** not in the Sidebar: it's in the account menu the user's name opens in the app header (NAV-011). |
| **Ask Intercept Live** | The first row, alone in its group, a divider under it: a panel to open, not a page (NAV-030). |
| **Groups** | The workspace's items in two groups, a divider between them: what's used on every shift first, reference second. |
| **Footer** | Pinned to the bottom: Documentation, Support and, in the prototype only, Prototype (NAV-060). |
| **Row** | An icon, a label and, optionally, a trailing count; an alert dot on the icon (NAV-041). |

## 4. Requirements

### NAV-010 — Workspaces

The Sidebar shows one workspace at a time, each with its own items and landing page. Switching workspace changes the sidebar's items, the landing page, the ⌘K search hint and scope, and what Ask Intercept Live can see (the clinical data agent in Clinical, §8.7; the operational data agent in Administration and Marketplace, §8.8). It doesn't change the hospital in view, which stays a filter on the page, or the user's home organization.

| Workspace | For | Lands on |
|---|---|---|
| **Clinical** | Intensivists, APPs, Critical Care RNs | Monitoring |
| **Administration** | Operations staff at Intercept; admins and managers at hospitals | Operations (Intercept) or Overview (hospital) |
| **Marketplace** | Independent clinicians; hospitals requesting coverage; Intercept oversight | Open shifts (clinician) or Requests (hospital and Intercept) |

The first page item of each workspace is its landing page, so no workspace has a separate Home.

✅ **Resolved:** the prototype switches between all three from the account menu (PRD Account menu ACM-010): the Sidebar shows the workspace's items and lands on its first page (Monitoring, Requests, Operations); a page from a link or a shortcut brings its workspace with it. The Marketplace and Administration pages are empty states.

⚠️ **Gap:** switching doesn't change what Ask Intercept Live can see, and search isn't built.

### NAV-011 — Workspace switcher

~~At the top of the Sidebar, under the logo row.~~ ✅ **Resolved:** in the account menu the user's name opens in the app header, not in the Sidebar (PRD Account menu ACM-010), so the Sidebar starts at Ask Intercept Live for everyone. Its menu lists each workspace the user has, with a one-line description; Marketplace carries a **Preview** tag while its Phase 2 scope is confirmed. It shows no organization name, so it doesn't read as switching organization. People with one workspace never see it, and their Sidebar starts at Ask Intercept Live.

~~⚠️ **Gap:** intercept.ds doesn't draw the switcher yet, and UCL doesn't build it. Action: design it (expanded and collapsed, with its menu), then add it to the Sidebar. The Requirements Specification allows a role switcher in the prototype for demos.~~ ✅ **Resolved:** UCL builds it as the account menu's Workspace group (`AccountMenu`); the prototype gives the user all three workspaces, as the Requirements Specification allows for demos. intercept.ds doesn't draw the menu yet (ACM-OD-01).

### NAV-020 — Clinical items

Seven items in two groups, Monitoring the landing page (intercept.ds Role=Clinical).

| Group | Item | What it holds | Spec |
|---|---|---|---|
| Shift work | **Monitoring** | Every patient the clinician covers, across hospitals; Cards and Waveforms are views of the same list. Replaces the separate Census and Monitoring pages. | §5.1, §5.2 |
| Shift work | **Inbox** | One queue: alerts to acknowledge, AI Scribe drafts to sign, suggested orders, failed EMR write-backs. Replaces Alert Queue. | §6.21, §5.6, CC-01 |
| Shift work | **Messages** | Secure chat from every covered hospital, replies routed back to the right system | §5.3 |
| Shift work | **Protocols** › **Virtual Sepsis** | Tracking at the protocol level, across all patients. Virtual Sepsis is the only protocol in v1. | §5.9, §5.10 |
| Reference | **Patients** | The full list of everyone ever treated, whether they're in hospital or not: today's Census page, which becomes Patients. Active patients are Monitoring's. | Decided June 2026 |
| Reference | **Schedule** | The clinician's own shifts across hospitals, plus an Open shifts tab | §5.15 |
| Reference | **Analytics** | The clinician's own clinical and documentation metrics | §5.11 |

⚠️ **Decision needed:** the prototype's Clinical **Analytics** shows the program's outcomes dashboard (PRD Outcomes dashboard; Scenario 6 ends on it): network-wide outcomes against the baseline, by payer and rurality, and the quarterly export, not the clinician's own metrics. Whether it stays here, moves to Administration's Analytics (Governance), or both, is open (Outcomes dashboard OUT-OD-04).

**Default Monitoring view by role:** Waveforms for Critical Care RNs, Cards for intensivists and APPs (§9.1 #4, PD-10). Clicking the logo returns to the role's default.

⚠️ **Decision needed:** in UCL, clicking the expanded wordmark collapses the Sidebar (DESIGN.md "Sidebar", decided because the first item is an action). The spec wants it to return to the role's default Monitoring view. One of the two has to give.

~~⚠️ **Gap:** Intercept Live's shell still shows the earlier nav (Monitoring, Census, Alert Queue, Messages, Virtual Sepsis / Compliance, Analytics, Marketplace, Administration). It moves to these items once Monitoring absorbs the Census and Inbox is designed; until then only the Sidebar's stories show them.~~ ✅ **Resolved:** Intercept Live's shell shows these items. Today's **Census page becomes Patients**: the Census is about active patients, which Monitoring covers; Patients is the full historical list, in hospital or not. Alert Queue becomes Inbox. ~~Inbox, Protocols and Schedule show their empty states until they're designed.~~ ~~✅ **Resolved:** Schedule opens the clinician's calendar (My shifts and Open shifts; PRD Schedule); Inbox and Protocols show their empty states until they're designed.~~ ✅ **Resolved:** Schedule opens the clinician's calendar (PRD Schedule) and Inbox the one work queue (PRD Inbox); Protocols shows its empty state until it's designed. Old links to `census` and `alert queue` open Patients and Inbox.

⚠️ **Gap:** the Patients page still lists only the patients in hospital now (the Census's roster); discharged and transferred-out patients aren't in it yet (PRD Patients CEN-001).

### NAV-021 — Administration items

The sidebar depends on whose organization the user belongs to: Intercept staff run the whole network; a hospital's admins run only their own hospital.

**Intercept** (Operations Lead, Scheduling and Support Coordinators, System Administrator), intercept.ds Role=Administration:

| Group | Item | What it holds | Spec |
|---|---|---|---|
| Operations | **Operations** | Shift state, call queues, clinician presence, pipeline and capacity in one view | §5.17, §3.5, §3.6 |
| Operations | **Coverage** | Network-wide coverage grid with eligibility rules applied; unfilled gaps counted | §5.15 |
| Operations | **Providers** | Onboarding, credentialing, licensure and the privileges matrix | §5.13, §5.14 |
| Operations | **Hospitals** | Hospital onboarding, configuration, integration status per hospital | §5.16, SA-01, SA-02 |
| Governance | **Compliance** | Compliance reporting and audit trails | §5.12 |
| Governance | **System** | Platform-wide configuration, AI agent governance; tagged **Intercept only** | §5.7, SA-03 |

**Hospital** (Client Administrator; a Client Manager sees the same items read-only, CA-06):

| Group | Item | What it holds | Spec |
|---|---|---|---|
| Hospital | **Overview** | Coverage, clinician engagement and open issues at their hospital | §3.8, §3.9 |
| Hospital | **Clinician access** | Which clinicians, Intercept's or their own, can see patient data at the facility | §5.8, CA-02 |
| Hospital | **Integrations** | What data flows in and out, with approval and sign-off | §5.8 |
| Hospital | **Protocols & alerts** | Which protocols run and how alerts are configured | §5.8 |
| Governance | **Compliance** | Audit trails and compliance reporting for the hospital | §5.12 |
| Governance | **Analytics** | Clinical and operational analytics for the hospital | §5.11 |

⚠️ **Decision needed:** the hospital sidebar is the spec's proposal from §3.8 and hasn't been reviewed with Intercept. intercept.ds draws only Intercept's.

### NAV-022 — Marketplace items

Two sides, clinicians who supply coverage and hospitals who need it, each with its own sidebar (§5.18). Intercept clinicians mostly reach the Marketplace from inside Clinical instead (NAV-070).

| Side | Items, in order | Lands on |
|---|---|---|
| **Hospital requesting coverage** | **New coverage request** button at the top, then Requests, Open shifts, Clinician network · Contracts & billing | Requests |
| **Independent clinician** (§3.10) | Open shifts, My bookings, Schedule · Credentials, Earnings | Open shifts |
| **Intercept oversight** | Requests, Open shifts, Clinician network · Contracts & billing | Requests |

- **Requests:** the coverage requests the hospital posted, and their status; for Intercept, every request in the network (glossary "Request (Marketplace)").
- **Open shifts:** only shifts the clinician is eligible for: licensed in that state, privileged at that hospital, credentials current (§6.7). Anything they can't take never appears.
- **New coverage request** is a primary button rather than an item, because it's an action, not a place.

ℹ️ intercept.ds Role=Marketplace draws the hospital side: Requests, Open shifts, Clinician network · Contracts & billing. The spec's hospital side has no Open shifts; Intercept oversight's does.

⚠️ **Decision needed:** which side Role=Marketplace is, and whether the hospital side lists Open shifts.

ℹ️ Specialist consults are specified in PRD Specialty Care Access ([specialty-care-access.md](specialty-care-access.md)). It proposes a **Consults** item for specialists who take them (SCA-OD-05) and consults listed in **Requests** next to coverage requests (SCA-070).

⚠️ **Gap:** neither the New coverage request button nor the clinician side is drawn.

⚠️ **Risk:** SC-09 says no pricing, booking, take-rate or settlement is shown. **Contracts & billing** and **Earnings** would show them. Confirm with Intercept whether SC-09 still holds once the Marketplace ships (2027) or whether those items stay out of the prototype.

### NAV-030 — Ask Intercept Live

Ask Intercept Live opens a column next to the Sidebar rather than a page, so it's available from every screen in every workspace.

- **Placement:** the first row, ~~under the switcher~~ under the logo row (the switcher is in the account menu, NAV-011), separated from the page items by a divider, so it reads as a panel to open rather than a place to go.
- **Never the current page:** it opens over the page in view, which stays the current page.
- **Knows what you're looking at:** the column shows a "Looking at" line (e.g. "Monitoring · All hospitals · 26 patients", or one patient on a chart), and its suggested questions change with the workspace and page.
- **Shows its sources:** answers cite where their data came from and how fresh it is (§9.1 #6, #9).
- **One column only:** the Ask icon in the patient header opens this same column, not a second chat.
- **Search:** there's no Search item; search happens in Ask Intercept Live (PD-08) and in ⌘K.

ℹ️ intercept.ds labels the row "Ask Intercept"; the app says "Ask Intercept Live" (DESIGN.md "Brand names").

⚠️ **Gap:** the spec gives the row an **open** state (blue fill and border, `aria-pressed="true"`) that must never look like the current page. intercept.ds doesn't draw it~~, and UCL doesn't show it~~. ✅ **Resolved:** while the column is open, the row shows the solid sparkles (archielabs.ds `sparkles-solid`) in the icon color and is `aria-pressed="true"`, with no fill and no semibold label, so the page in view stays the only current item. The spec's blue fill and border wait for design.

⚠️ **Decision needed:** the column's width, whether opening it collapses the Sidebar, and its keyboard shortcut.

### NAV-040 — Current page

One item at a time is the current page: a semibold `foreground` label and the item's solid icon, no fill (intercept.ds `sidebar-menu-button` Active), with `aria-current="page"`. It shows in both the expanded and the collapsed rail.

- While a patient's page is open, no item is current; the page underneath comes back current on Back (DESIGN.md "Sidebar").
- Items with no solid icon keep their outline icon when current: ~~Ask Intercept Live, Inbox,~~ Protocols, ~~Schedule,~~ every Marketplace and Administration item, and the footer. ✅ **Resolved:** Inbox and Schedule show their solid icons when current (archielabs.ds `inbox-solid`, `calendar-solid`), and Ask Intercept Live has one too (`sparkles-solid`), shown while its column is open, as Ask is never the current page (NAV-030).

⚠️ **Decision needed:** the spec's current page is a white fill, a grey ring, a blue icon and a semibold label. intercept.ds keeps no fill and a solid icon; UCL follows intercept.ds until design takes the spec's look.

⚠️ **Gap:** archielabs.ds has no solid icons for the new items (~~inbox,~~ list-check, ~~calendar,~~ user-search, calendar-clock, users, file-text, radar, calendar-check, contact, building, shield-check, settings).

### NAV-041 — Alert and unread dots

A 6px dot on an item's icon: an open alert's severity (Critical, High, Medium, Low), flashing in step with the alert cards, or `unread` in the brand color, flashing every 2 s. No dot when resolved or with nothing. Screen readers hear it after the label ("Monitoring, Critical alert", "Messages, Unread").

✅ **Resolved:** Monitoring carries the most severe open alert, and Messages the unread dot (DESIGN.md "Sidebar"; already built).

⚠️ **Decision needed:** whether the alert dot moves from Monitoring to Inbox once Inbox is the alert queue, and whether it stops flashing once every open alert is acknowledged.

### NAV-042 — Counts

The spec gives three counts, as badges after the label:

| Badge | Meaning | Example |
|---|---|---|
| **Red** | A count that includes critical items | Inbox |
| **Grey** | An unread count | Messages |
| **Orange** | Needs attention, not urgent | Coverage gaps |

✅ **Resolved:** Messages' unread is in the brand color (blue), not the spec's grey (PRD Messages MSG-012).

⚠️ **Gap:** intercept.ds draws a hidden plain-text suffix, no badge, and UCL's `suffix` is plain muted text. Action: design the badges (likely UCL Counter's `critical`, `secondary` and `high` variants), then decide whether a count replaces the alert and unread dots on the same item or sits with them.

### NAV-043 — Tags

A small outlined label after the item for scope or status: **Intercept only** (System), **Preview** (the Marketplace in the switcher).

✅ **Resolved:** the account menu's switcher shows Marketplace's Preview tag (ACM-010).

⚠️ **Gap:** neither intercept.ds nor UCL has tags on a Sidebar row.

### NAV-044 — Nested item

Virtual Sepsis is nested under Protocols: indented under its parent, smaller type, with its own current-page state.

~~⚠️ **Decision needed:** intercept.ds draws Protocols and Virtual Sepsis as two rows at the same level, and UCL follows it. Decide whether Protocols is a page of its own (all protocols, one row per protocol) with Virtual Sepsis as its child, or a group heading.~~

✅ **Resolved:** Protocols is a page of its own and Virtual Sepsis is its child, not a Sidebar row (intercept.ds's Clinical sidebar drops the Virtual Sepsis row). Protocols lists every protocol tracking the clinician's patients, a row each with what it watches for, its patients and their active alerts, and **Open** to its page; Virtual Sepsis is the only one in v1, listed even with no one on it. On a protocol's page the Sidebar keeps **Protocols** current, and a **Protocols › Virtual Sepsis** breadcrumb over the page leads back. No nested row, so the spec's indented, smaller child row isn't built.

### NAV-050 — Expand and collapse

Expanded, 280px: an icon and label per item, dividers between groups, the footer pinned to the bottom. Collapsed, 64px: an icon rail, a label tooltip on hover and focus, alert dots and the current page still shown. The Collapse sidebar button, the collapsed mark, the wordmark and the rail's empty space toggle it. At 1024px and below the Sidebar collapses on its own, until the user toggles it (DESIGN.md "Sidebar auto-collapses at lg and below").

⚠️ **Decision needed:** the spec says 240px expanded and 44 × 44px hit areas collapsed; intercept.ds and UCL are 280px with 32px rows. UCL follows intercept.ds.

⚠️ **Gap:** the spec recommends remembering each user's expanded or collapsed choice. Today it lasts until the page reloads.

### NAV-060 — Footer

Documentation and Support, pinned to the bottom in every workspace. In the prototype a third item, **Prototype**, opens a menu of scenarios and shortcuts above itself and never becomes current.

⚠️ **Gap:** Prototype must be hidden whenever screens or video are captured, so it never appears in grant materials. Nothing hides it yet.

### NAV-070 — Not in the Sidebar

| Item | Where it lives instead | Why |
|---|---|---|
| **Census** as a page | ~~Merged into Monitoring; the census is the header's patient column~~ ✅ **Resolved:** the Census page becomes **Patients**, the full historical list; the patients in hospital now are Monitoring's, and the header's patient column | Census and Monitoring showed the same patients |
| **Alert Queue** | Inbox | Three alert surfaces disagreed on the count; §6.21 calls for one queue |
| **Documentation, Orders** | Tabs in the patient chart | Clinicians document and order about a patient (§9.1 #11) |
| **Home** | None; Monitoring is the landing page | A dashboard would repeat Monitoring, Inbox and Schedule one click earlier |
| **Start-of-shift handoff** | A one-time briefing on top of Monitoring at sign-in: patients handed over, open concern flags, items waiting in the Inbox | §5.1 shift lifecycle, §3.3 handoff, §5.6 |
| **Compliance, Administration** | The Administration workspace | Not clinical work (§9.2) |
| **Marketplace** as an item | Its own workspace, plus entry points in context: Schedule › Open shifts, the patient chart's **Request specialist**, Coverage › **Post to Marketplace** | Clinicians shouldn't switch workspaces to pick up a shift or get a consult |
| **Find a specialist** | **Request specialist** in the patient chart, filtered to clinicians eligible for that patient's state and hospital; ⌘K without a patient | A consult starts from the patient (SC-01) |
| **Search** | Ask Intercept Live and ⌘K | One entry point for questions and navigation (PD-08) |

## 5. States

| State | How it looks |
|---|---|
| **Expanded** | 280px, icon and label per item, dividers between groups (NAV-050). |
| **Collapsed** | 64px icon rail; label tooltips; dots and the current page still shown (NAV-050). |
| **Default row** | Muted label and icon. |
| **Hover** | Light grey fill (white on the collapsed rail); label and icon darken. |
| **Current page** | Semibold label, solid icon, no fill, `aria-current="page"` (NAV-040). |
| **Alert / unread** | A dot on the icon, flashing (NAV-041). |
| **Menu open** (Prototype) | The row keeps its hover look while its menu is open (NAV-060). |
| **On a patient's page** | No item current (NAV-040). |
| **Single-workspace user** | No switcher; the Sidebar starts at Ask Intercept Live (NAV-011). |
| **Ask Intercept Live open** | ~~Not built~~ The solid sparkles and `aria-pressed="true"`, no fill; the spec's blue fill and border aren't built (NAV-030). |

## 6. Accessibility

- The Sidebar is a `nav` named "Main"; every item is a real button or link.
- The current page is `aria-current="page"`; an open Ask Intercept Live is `aria-pressed="true"`.
- On the collapsed rail, every item keeps its label for screen readers and shows it in a tooltip on hover and focus.
- Alerts and unread are read after the label, not from the dot.
- The whole Sidebar works by keyboard: Tab between items, Enter to open, Escape to close a menu or the switcher. The rail's empty space and the wordmark are mouse shortcuts; the Collapse and Expand buttons are the keyboard path.
- Text, including muted labels, counts and tags, meets 4.5:1 contrast.

⚠️ **Accessibility:** the spec asks for arrow keys between items too; today it's Tab only.

## 7. Motion

The width animates between 280 and 64px and the rail's fill follows it; hovering the collapsed rail swaps the mark for the expand icon; tooltips glide out from the item; alert dots fade and scale in and out and flash on the Urgency clock, unread dots on the Unread pattern. ✅ **Resolved:** while an alert dot flashes, an unread dot flashes with it, on the Urgency clock; alone, it keeps the Unread pattern. Everything is instant or still under reduced motion (MOTION.md, DESIGN.md "Sidebar").

## 8. Acceptance criteria

| ID | Criterion |
|---|---|
| NAV-AC-01 | A clinician with only the Clinical workspace sees no switcher, lands on Monitoring, and sees Ask Intercept Live, Monitoring, Inbox, Messages, Protocols · Patients, Schedule, Analytics, then Documentation and Support (NAV-011, NAV-020). |
| NAV-AC-08 | Protocols lists Virtual Sepsis; its **Open** shows the Virtual Sepsis page under a Protocols › Virtual Sepsis breadcrumb, with Protocols still current in the Sidebar; the breadcrumb's Protocols goes back (NAV-044). |
| NAV-AC-02 | Switching workspace changes the items and the landing page; the hospital filter on the page stays as it was (NAV-010). |
| NAV-AC-03 | Opening Ask Intercept Live never changes the current page (NAV-030). |
| NAV-AC-04 | Exactly one item is current, in both rail modes, and none while a patient's page is open (NAV-040). |
| NAV-AC-05 | With a Critical alert open, Monitoring shows a red dot and screen readers hear "Monitoring, Critical alert"; once it's resolved, the dot fades out (NAV-041). |
| NAV-AC-06 | Collapsed, every item shows its label in a tooltip on hover and on keyboard focus (NAV-050). |
| NAV-AC-07 | Open shifts never lists a shift the clinician isn't eligible for (NAV-022). |
| NAV-AC-08 | Census, Alert Queue, Documentation, Orders, Home and Search are not Sidebar items in any workspace (NAV-070). |

## 9. Dependencies

| Depends on | For |
|---|---|
| PRD Monitoring, PRD Patients (PRD Census until Nov 16, 2026) | Monitoring covering the patients in hospital, and the Census page becoming Patients, the full historical list (NAV-020) |
| PRD Inbox | Replacing Alert Queue (NAV-020); the red count (NAV-042) |
| Authorization and Role Management (§6.3) | Which workspaces and items a user gets (NAV-010) |
| Eligibility Rules Engine (§6.7) | Open shifts and Request specialist (NAV-022, NAV-070) |
| UCL Counter, Badge | Counts and tags, once designed (NAV-042, NAV-043) |

## 10. Open decisions

| ID | Decision |
|---|---|
| NAV-OD-01 | 🙋 Whether the Marketplace is still Phase 2 scope: it ships as Preview or stays hidden (Left Nav Spec). |
| NAV-OD-02 | 🙋 Whether a clinician can start a paid outside consult, or a hospital's Client Admin must turn it on first. |
| NAV-OD-03 | 🙋 The hospital Administration sidebar (NAV-021). |
| NAV-OD-04 | 🙋 The default Monitoring view per role, checked with clinicians (NAV-020). |
| NAV-OD-05 | 🙋 What clicking the logo does: collapse the Sidebar (today) or return to the role's default Monitoring view (NAV-020). |
| NAV-OD-06 | 🙋 Ask Intercept Live's column width, whether it collapses the Sidebar, its open state and its shortcut (NAV-030). |
| NAV-OD-07 | 🙋 Whether the census column shows only on the patient chart, or anywhere but off by default on Monitoring (NAV-070). |
| NAV-OD-08 | 🙋 The current page's look: intercept.ds's or the spec's (NAV-040). |
| NAV-OD-09 | ⚠️ **Gap:** counts, tags and the nested item, once designed (NAV-042–NAV-044). |
| NAV-OD-10 | 🙋 280 vs 240px expanded, 32 vs 44px collapsed hit areas (NAV-050). |
| NAV-OD-11 | 🙋 Which Marketplace side intercept.ds draws, and Contracts & billing / Earnings against SC-09 (NAV-022). |
| NAV-OD-12 | ~~When Intercept Live's shell moves to the new Clinical items (NAV-020).~~ ✅ **Resolved:** it shows them now, the Census page as Patients (NAV-020). |
