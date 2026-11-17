---
requirements: [PD-10, PD-12, CC-05, HO-01, HO-02, UX-07, UX-09, UX-11]
status: proposed — confirm with Intercept
---

<!--
Created: Nov 16, 2026
Created by: Julio Caunedo
Last updated: Nov 17, 2026
Scope: The account menu the user's name opens in the app header (UCL AccountMenu, AppHeader `accountMenu`): who's signed in, the workspace switcher, status, the shift and its handoff, preferences, profile, keyboard shortcuts and sign out. Sources: documents/Intercept Live — Left Nav Spec.md (workspaces, switcher, "Status and user"), the System Specification §5.1, §6.12, §6.21, and the Requirements Specification.
Purpose: Records what the menu holds and why, the decision to move the workspace switcher into it, and what's still open.
-->

# PRD — Account menu

**Product:** Intercept Live — Virtual Care OS  
**Module:** the Provider Desktop shell (Spec §5.1), with Presence and Status (§6.12) and Shift Handoff (§6.21)  
**Surface:** a component, not a page: the **account menu** (UCL `AccountMenu`), opened from the user's name at the right of the app header (AppHeader `default`), in every workspace  
**Version:** 0.1  
**Status:** Draft — pending product validation with Intercept  
**Last updated:** November 17, 2026

---

## 1. Overview

The account menu is everything about the person signed in, as opposed to the patients: who they are, where they work (the workspace), whether they can be reached (status), what they cover (the shift), how the app behaves for them (preferences) and how they leave (handoff, sign out). It opens from their name and shift countdown at the right of the app header.

It also holds the **workspace switcher** (Clinical, Marketplace, Administration). The Left Nav Spec put the switcher at the top of the Sidebar; here it moves into this menu (ACM-010), where people who switch find it next to the rest of their account, and the Sidebar starts at Ask Intercept Live for everyone.

ℹ️ The menu holds no state. Each part shows only when the app gives it its data or handler, so an app (or a user type) can leave any part out.

### 1.1 Product objectives

| Objective | What it means for the account menu |
|---|---|
| **One place for the person** | Everything about the clinician, not the patients, in one menu, one click from any page. |
| **Three workspaces, not eighteen modules** | Switching workspace is a choice about the person's role right now; it changes the whole Sidebar, never the hospital in view (Spec §9.2, UX-07). |
| **The bedside knows who's reachable** | Status is one click away and matches what the hospitals see (Spec §6.12, CC-05). |
| **Nothing dropped at shift change** | Handoff is offered at the end of the shift, and before signing out on shift (Spec §5.1, PD-12, HO-01). |
| **No dead controls** | Every item does something in the prototype (UX-11). |

### 1.2 Source documents

| Document | What this PRD takes from it |
|---|---|
| Left Nav Spec (Nov 14, 2026) | The three workspaces, who has which, each workspace's one line, Marketplace's "Preview" tag, "What switching does and doesn't change", the header's "Status and user" (online status, name, time left in the shift) and the default Monitoring view by role |
| System Specification | §5.1 (shift lifecycle: start, active, handoff, end), §6.12 (Presence and Status: availability, in-camera, on-shift, call queues, mirrored to TeleCloud and Teams), §6.21 (Shift Handoff), §6.7 (credentials, licenses, privileges), §9.1 #13 (accessibility) |
| Requirements Specification | PD-10 (role-based defaults), PD-12 (shift lifecycle), CC-05 (presence: available, in camera, busy; simulated), HO-01, HO-02 (handoff summary; incoming clinician acknowledges), UX-07, UX-09 (keyboard paths; Esc closes overlays), UX-11 (no dead controls); §4: "A role switcher is allowed in the prototype for demo purposes" |
| PRD Sidebar | NAV-010 (workspaces), NAV-011 (the switcher, now here) |
| intercept.ds | No design yet. ⚠️ **Gap:** the menu follows UCL's DropdownMenu; design it in intercept.ds (ACM-OD-01). |

## 2. Users and use cases

| User | What they use it for |
|---|---|
| **Intensivist, APP, Critical Care RN** | Status, their shift and its handoff, preferences, sign out. One workspace (Clinical), so no switcher. |
| **Operations Lead who also covers APP shifts; CMO or CNO with admin rights** | All of the above, plus switching between Clinical and Administration (and Marketplace). |
| **Independent clinician** | Switching between Marketplace and Clinical (on booked shifts); Profile & credentials decide which shifts they see (Spec §6.7). |
| **Hospital Client Administrator, System Administrator** | Switching between Administration and Marketplace; no shift. |

| Use case | Story |
|---|---|
| **Step away** | The clinician sets **Away** for a break; the bedside sees it (CC-05). |
| **Check what I cover** | **My shift** lists the hospitals and call queues routed to them, and when the shift ends. |
| **Hand off** | At the end of the shift, **Start handoff** lists their patients, sickest first, to draft each one's handoff (HO-01). |
| **Switch to admin work** | An Operations Lead picks **Administration**; the Sidebar and landing page change, the hospital filter doesn't. |
| **Make Monitoring mine** | An RN sets Monitoring to open in **Full view** (waveforms); an intensivist picks **Minimal view** (cards). |
| **Sign out safely** | Signing out on shift asks to hand off first. |

## 3. Anatomy

From top to bottom, a rule between each group:

| Part | What it shows |
|---|---|
| **Who's signed in** | Avatar with the status dot on its corner, name, then role and status ("Intensivist · Available"; ~~"Intensivist · ● Available"~~). No organization name: switching workspace isn't switching organization (Left Nav Spec). Not clickable. |
| **Workspace** | A heading, then each workspace: its name, its one line, a tag ("Preview"), a check on the current one (ACM-010). |
| **Status**, **My shift**, **Start handoff** | Status (its dot, "Status", the current status, ›), My shift (stethoscope, "My shift", "4 hospitals", ›), Start handoff (ACM-020, ACM-030, ACM-031). |
| **Preferences**, **Profile & credentials**, **Keyboard shortcuts** | Preferences ›, Profile & credentials, Keyboard shortcuts with its key, "?" (ACM-040, ACM-050, ACM-051). |
| **Sign out** | (ACM-060) |

The menu is 320px wide, right-aligned under the name. Submenus open to the left of it.

## 4. Requirements

### ACM-001 — Where it opens

The user's name, with their avatar and "Shift ends in 7h 45m", at the right of the app header (AppHeader `default`), opens the menu on click, Enter or Space. It isn't on a patient's page (AppHeader `patient` has no user); the user goes back to the page first.

- The trigger's avatar shows the user's status as a dot on its bottom-right corner (intercept.ds avatar "Show Dot"), in the status's color (ACM-020), so it's visible without opening the menu; the status is read with the name ("Daniel Reyes, Available").
- ✅ **Resolved:** the trigger shows the status as a dot on the avatar, and so does the avatar inside the menu (~~whether the trigger should show the status too (ACM-OD-02)~~).

### ACM-010 — Workspace switcher

The workspaces the user has, each with its one line, and a check on the current one. Picking one closes the menu and switches the whole workspace: its Sidebar items and its landing page (Clinical → Monitoring, Marketplace → Requests, Administration → Operations). It never changes the hospital in view or the user's organization.

| Workspace | One line | Tag |
|---|---|---|
| Clinical | Patients, alerts and messages | — |
| Marketplace | Open shifts and coverage requests | Preview (while its Phase 2 scope is confirmed) |
| Administration | Operations, coverage and providers | — |

- Shown only with two workspaces or more: people with one never see it (Left Nav Spec).
- ✅ **Resolved:** the switcher is in the account menu, not at the top of the Sidebar as the Left Nav Spec draws it. The Sidebar starts at Ask Intercept Live for everyone (PRD Sidebar NAV-011).
- ✅ **Resolved:** the prototype gives the user all three workspaces, so the switcher shows in demos (Requirements Specification §4 allows a role switcher in the prototype). An app passes the user's own (`workspaces`).
- ⚠️ **Gap:** the Marketplace and Administration pages are empty states in the prototype, and the Marketplace shown is Intercept's oversight side (Requests, Open shifts, Clinician network · Contracts & billing), not the hospital's or the independent clinician's (PRD Sidebar NAV-022).
- ⚠️ **Gap:** switching doesn't change what Ask Intercept Live can see yet (Left Nav Spec: the clinical data agent in Clinical, the operational one elsewhere), and search isn't built.
- ⚠️ **Decision needed:** the switch's keyboard shortcut; the Left Nav Spec asks for one and doesn't pick the key (ACM-OD-05).

### ACM-020 — Status

A submenu with **Available** (green), **Busy** (red) and **Away** (amber), the current one checked; its row shows the current status. The header line ("Intensivist · Available") and the dot on both avatars (the trigger's and the menu's) follow it.

| Status | Set by | Meaning |
|---|---|---|
| Available | The user | Reachable now |
| Busy | The user | On shift, not taking new requests |
| Away | The user | Stepped away |
| In camera | The platform, during a camera session | Assessing a patient on camera (Spec §6.12, PRD Bedside camera CAM-006) |
| On a call | The platform, during a call | On a voice or video call |

- In camera and On a call are set for the user: the submenu says so ("In camera: set for you until it ends"), and none of the three is checked. Picking one anyway sets it.
- The colors follow Teams, where the status is mirrored (Spec §6.12).
- ⚠️ **Gap:** in the prototype the status is the shell's own state: it isn't sent to the bedside, TeleCloud or Teams (CC-05 allows simulated), and a video consult doesn't set In camera yet.

### ACM-030 — My shift

Shown while the user is on shift. A submenu: when the shift ends ("Shift ends in 7h 44m", the header's countdown), the **Hospitals** they cover, and the **Call queues** routed to them (Spec §6.12). Its row shows how many hospitals. Information only, nothing to click.

### ACM-031 — Start handoff

Under My shift, while on shift. Opens Ask Intercept Live, about no patient in particular, asking **/handoff**: it lists the clinician's patients, sickest first (the triage order), each with its open alert or score, and says how to draft one's I-PASS handoff ("/handoff Miller"; PRD Chat composer CC-022). Drafts aren't saved or sent.

✅ **Resolved:** the report builds itself from the shift (Demo Use Cases, Scenario 5, step 6: "the 07:00 handoff report builds itself"): after the patients, **Overnight** lists each patient's outcomes in the last 12 h (the events, the transfer, the times written for the outcomes report), and **Documentation** counts the notes the AI drafted this shift and about how many minutes of typing they saved ("2 notes drafted by AI this shift, about 42 min of typing saved. Review and sign them in each patient's Notes."). A notice's **Open handoff** starts it too, once the night's events are in.

- ⚠️ **Gap:** the handoff surface itself (DU-31, HO-01 to HO-03: a summary by patient that the incoming clinician acknowledges, its items moving to their Inbox) isn't built. Start handoff should open it when it is.
- ⚠️ **Decision needed:** where the shift's documentation counter lives besides the handoff (the scenario's "a shift counter shows minutes of documentation saved"): My shift, the app header or the notes themselves.

### ACM-040 — Preferences

A submenu. Each setting applies at once and keeps the menu open.

| Setting | Options | What it does |
|---|---|---|
| **Theme** | Light, Dark | The app's color mode. |
| **Monitoring opens in** | Full view (default), Condensed view, Minimal view | Monitoring's monitor view (MON-015) when it opens; changing it while on Monitoring switches the cards too. The page's own control still changes it for the moment. |
| **Alert sounds** | On (default) / off | Whether a new or changed alert's toast pings. |

- ⚠️ **Decision needed:** Theme is here and on the header's moon button; keep both, or drop the button (ACM-OD-03).
- ⚠️ **Decision needed:** the Left Nav Spec's default view by role is "Waveforms" for Critical Care RNs and "Cards" for intensivists and APPs; this maps them to Full view and Minimal view, and the default for each role isn't set yet (ACM-OD-04, PD-10).
- ⚠️ **Decision needed:** whether preferences follow the clinician across sessions and devices, or reset each shift (as MON-015's open question). In the prototype they last until reload.
- ℹ️ Alert sounds turns off the alert toasts' ping only. An incoming consult call still rings: a call isn't an alert.

### ACM-050 — Profile & credentials

Opens the user's **Profile** page: their licenses, hospital privileges and when each expires (Spec §6.7). For an independent clinician these decide which Marketplace shifts they see (Left Nav Spec).

- ⚠️ **Gap:** the page is an empty state in the prototype.

### ACM-051 — Keyboard shortcuts

Opens a window listing every shortcut the app has, by where it works (Anywhere, Ask Intercept Live, Patient timeline, Flags). **?** opens it from anywhere outside a text field; the item shows the key (UX-09).

- ℹ️ ⌘K isn't listed: search isn't built.

### ACM-060 — Sign out

Signs the user out. On shift, it asks first: "You're still on shift. Hand off your patients before you sign out, so the next clinician has what they need." with **Cancel**, **Sign out anyway** and **Start handoff** (ACM-031). Signed out, the app shows "You're signed out" with **Sign in**.

- ℹ️ Authentication is simulated in the prototype (Requirements Specification §4): Sign in comes straight back.

## 5. States

| State | What the menu shows |
|---|---|
| **One workspace** | No Workspace group (ACM-010). |
| **Off shift** | No My shift, no Start handoff; Sign out doesn't ask (ACM-060). |
| **Automatic status** | "In camera" or "On a call" in the header line and on the Status row; the submenu says it's set for the user. |
| **On a patient's page** | No menu: the patient header has no user (ACM-001). |

## 6. Accessibility

- A real menu (Radix DropdownMenu): arrow keys move through the items, → or Enter opens a submenu, ← or Escape closes it, Escape closes the menu and returns focus to the name.
- Workspaces, status, theme and Monitoring view are radio items, Alert sounds a checkbox item, each announced with its state.
- Icons are decorative; each item's text names it. The status dot is backed by the status's word.
- My shift's hospitals and call queues are labeled groups of text, not menu items.
- Keyboard shortcuts opens on "?", never while typing in a field (UX-09).

## 7. Motion

The menu and its submenus open as every DropdownMenu does (MOTION.md "Menus/dropdowns": a fade and a small grow from the trigger; a fade alone under reduced motion) and close at once.

## 8. Acceptance criteria

| ID | Criterion |
|---|---|
| ACM-AC-01 | Clicking the user's name opens the menu: the user, their role and status, then Workspace (with three workspaces), Status, My shift, Start handoff, Preferences, Profile & credentials, Keyboard shortcuts and Sign out (ACM-001). |
| ACM-AC-02 | Picking Administration closes the menu, shows Administration's Sidebar and lands on Operations; picking Clinical lands on Monitoring (ACM-010). |
| ACM-AC-03 | A user with one workspace sees no Workspace group (ACM-010). |
| ACM-AC-04 | Picking Away in Status shows "Away" on the Status row and in the header line, and turns the dot on both avatars amber (ACM-001, ACM-020). |
| ACM-AC-05 | My shift shows the countdown, the hospitals and the call queues; its row shows the number of hospitals (ACM-030). |
| ACM-AC-06 | Start handoff opens Ask Intercept Live asking "/handoff", answered with the user's patients, sickest first (ACM-031). |
| ACM-AC-07 | Setting Monitoring to Minimal view opens Monitoring in Minimal view; turning Alert sounds off stops the alert toasts' ping (ACM-040). |
| ACM-AC-08 | "?" outside a text field opens Keyboard shortcuts; Escape closes it (ACM-051). |
| ACM-AC-09 | Sign out on shift asks to hand off first; Sign out anyway shows "You're signed out" (ACM-060). |

## 9. Dependencies

| Dependency | For |
|---|---|
| PRD Sidebar (NAV-010, NAV-011, NAV-020 to NAV-022) | Each workspace's items |
| Presence and Status service (Spec §6.12) | Status reaching the bedside, TeleCloud and Teams; In camera and On a call |
| QGenda, scheduling (Spec §6.12) | The shift's hospitals and call queues |
| Shift Handoff (Spec §6.21, DU-31) | The handoff surface Start handoff should open |
| Identity and Authentication | Sign out; which workspaces a user has |

## 10. Open decisions

| ID | Decision | Owner | Notes |
|---|---|---|---|
| ACM-OD-01 | The menu's design in intercept.ds | Design | Follows UCL's DropdownMenu until then |
| ~~ACM-OD-02~~ | ~~Show the status on the header's trigger (a dot on the avatar)?~~ ✅ **Resolved:** yes, the avatar's dot, in the status's color (ACM-001) | Product, Design | The Left Nav Spec's header shows "online status" |
| ACM-OD-03 | Theme in Preferences and on the header button, or only one | Design | Both in the prototype |
| ACM-OD-04 | Default Monitoring view per role (Waveforms → Full view, Cards → Minimal view?) | Product, clinicians | Left Nav Spec; PD-10; same question as PRD Sidebar NAV-OD-04 |
| ACM-OD-05 | The workspace switch's keyboard shortcut | Product | Left Nav Spec asks for one |
| ACM-OD-06 | Do preferences persist across sessions and devices? | Product | Same question as MON-015's view settings |
| ACM-OD-07 | Can a user pick a status during In camera or On a call, or only after? | Product | The prototype lets them |
