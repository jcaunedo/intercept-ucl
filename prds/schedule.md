---
requirements: [PD-07, PD-12]
status: proposed — confirm with Intercept
---

<!--
Created: Nov 17, 2026
Created by: Julio Caunedo
Last updated: Nov 19, 2026
Scope: Intercept Live's Schedule page in the Clinical workspace (src/layouts/intercept-live/schedule/: SchedulePanel, its calendar views and its sample data): what it shows, its tabs and views, shift types and statuses, the shift details and their actions, Open shifts and New request. Sources: documents/Intercept Live — Left Nav Spec.md (Schedule, Open shifts), the System Specification §5.15 Scheduling & Coverage and §3.4 Scheduling Coordinator, PRD Sidebar NAV-020.
Purpose: Records what the first Schedule layout does, so the team can confirm or change it, and lists what's still open.
-->

# PRD — Schedule

**Product:** Intercept Live — Virtual Care OS  
**Module:** Scheduling & Coverage, Spec §5.15 (the clinician's side of it)  
**Surface:** the **Schedule** page, the Clinical Sidebar's reference group (Patients, Schedule, Analytics)  
**Audience:** Intensivists, APPs and Critical Care RNs, for their own shifts; Independent Clinicians, for their booked shifts  
**Version:** 0.1  
**Status:** Draft — a first layout in the prototype, pending product validation with Intercept  
**Last updated:** November 19, 2026

---

## 1. Overview

Schedule is where a clinician sees and manages their own shifts across every hospital they cover, and finds open shifts they can take. The Left Nav Spec defines it as "the clinician's own shifts across hospitals, plus an Open shifts tab".

It's the clinician's view of the schedule. The Scheduling Coordinator builds and publishes it from Administration's **Coverage** page (not designed yet); the clinician reads it here, asks for changes and picks up open shifts.

ℹ️ Today Intercept's schedule lives across QGenda, the Green Sheet matrix and a hand-filled client calendar (Spec §3.4). Schedule is the clinician's window onto the module that replaces them.

### 1.1 Product objectives

| Objective | What it means for Schedule |
|---|---|
| **One schedule across hospitals** | Every shift in one calendar, whatever hospitals it covers; one shift often covers several (Spec §5.15 "multi-client coverage per shift"). |
| **Know the next shift at a glance** | Today marked, the month's shifts and hours in view, each shift's hours, hospitals and call queues one click away. |
| **Change it without email** | Ask for a swap, give a shift away, ask for time off or take an open shift from the page; the coordinator approves. |
| **Only what the clinician can take** | Open shifts lists only shifts they're eligible for (licensed, privileged, credentials current; Spec §6.7). |
| **Accessible** | Every shift is a button with its full description; views and filters work by keyboard; a shift's type is a word and an icon, never color alone. |

### 1.2 Source documents

| Document | What this PRD takes from it |
|---|---|
| Left Nav Spec (Nov 14, 2026) | Schedule: the clinician's own shifts across hospitals, plus an Open shifts tab; Open shifts lists only shifts the clinician is eligible for; Schedule › Open shifts as Marketplace's entry point in Clinical |
| System Specification | §5.15 Scheduling & Coverage (draft / approval / publish, multi-time-zone shifts, self-scheduling, shift requests with availability), §3.4 Scheduling Coordinator, §6.7 Eligibility Rules Engine |
| Requirements Specification | PD-07 (shift context: shift window, hospitals covered), PD-12 (shift lifecycle). ⚠️ **Gap:** no requirement covers scheduling itself: the Scheduling Coordinator is out of scope as a prototype user (deferred module) |
| PRD Sidebar | NAV-020 (Schedule in the Clinical workspace's reference group) |
| PRD Account menu | My shift (today's hospitals and call queues), which today's shift on Schedule matches |
| Reference | shadcnuikit's Calendar app (layout pattern: a rail with a small month and calendar filters, a toolbar with the period and views) |
| intercept.ds | Nothing yet. ⚠️ **Gap:** design it (SCH-OD-01) |

## 2. Users and use cases

| User | What they use it for |
|---|---|
| **Intensivist, APP** | Check upcoming shifts and which hospitals each covers; swap or give one away; ask for time off; pick up open shifts. |
| **Critical Care RN** | The same, for their tele-RN shifts. |
| **Independent clinician** (§3.10) | Their booked shifts; in Marketplace their landing page is Open shifts (PRD Sidebar NAV-022). |

| Use case | Story |
|---|---|
| **What's next** | Joanna opens Schedule: today is marked, today's day shift ends at 8 PM, three nights start Sunday. |
| **Swap a night** | She opens Monday's night shift and asks for a swap; it reads "Swap requested" until a colleague takes it and the coordinator approves. |
| **Time off** | New request › Time off for a conference; it shows as "Pending approval" until approved. |
| **Pick up a shift** | On Open shifts she finds a night at Sidney Regional on a day off and requests it; it reads "Requested, waiting for approval" and leaves the tab's count. |

## 3. Anatomy

| Part | What it shows |
|---|---|
| **Tab bar** | **My shifts** and **Open shifts** (with the count of open shifts not yet requested), under the app header as the Patients page's hospital bar; at its right, the time zone the times are in ("Times in MST") (SCH-010, SCH-011). |
| **Rail** | From `lg` up: a small month (each day with something scheduled has a dot in its first shift's color; picking a day moves the calendar there), **Shift types** and **Hospitals** checkboxes, and the month's total ("Your November · 15 shifts · 186 h") (SCH-040). |
| **Toolbar** | The period ("November 2026", "Nov 15 – 21, 2026", "Tuesday, November 17, 2026"), previous and next, **Today**, **Month · Week · Day**, and **New request** (SCH-020, SCH-060). |
| **Calendar** | The month as a grid of chips (SCH-021) or a week or day on a 24-hour grid (SCH-022). |
| **Shift details** | A popover from a chip or block: type and status, when, role, hospitals, call queues, a note and its actions (SCH-050, SCH-051). |

## 4. Requirements

### SCH-001 — What it shows

The signed-in clinician's shifts, on-call blocks and time off, published and draft, across every hospital they cover. A shift covers one or more hospitals; time off covers none.

### SCH-010 — My shifts and Open shifts

Two tabs: **My shifts** (default) and **Open shifts** (SCH-070). The Open shifts tab carries a count of the open shifts the clinician hasn't requested yet; none, no count. The views, the period and the filters stay the same when switching tabs.

### SCH-011 — Time zone

The calendar shows times in the clinician's time zone, named at the right of the tab bar ("Times in MST").

- ⚠️ **Decision needed:** clinicians cover hospitals in other time zones (Spec §5.15 "multi-time-zone shift representation"). Show the hospital's local time too, in the details or on the chip (SCH-OD-03)?

### SCH-020 — Views and navigation

**Month** (default), **Week** and **Day**. Previous and next move by the view's period; **Today** comes back to today. The calendar slides in from the side it moves to (Glide); a fade under reduced motion. The title says the period on screen.

### SCH-021 — Month

Sunday to Saturday, the weeks of the month; days outside it muted. ~~Today's number is filled in the brand color.~~ ✅ **Resolved:** today's number is filled in `foreground` (white on dark gray; reversed in dark mode), in the Month cell and the Week header alike. A day shows up to three chips (icon, start time and type: "8 AM Day"; time off: "Time off"), then **+n more**; the day's number and +n more open the day in the Day view. A night shift shows on the evening it starts; time off on every day it covers.

### SCH-022 — Week and Day

A 24-hour grid, opened scrolled to just above 6 AM. Each shift is a block from its start to its end, with its type, its hours and, when tall enough, its call queues; a night shift runs into the next day's column ("(cont.)"). Time off sits in the **All day** row above the hours. A red line marks now on today's column.

### SCH-030 — Shift types

| Type | Sample hours | Icon | Color |
|---|---|---|---|
| **Day shift** | 8 AM – 8 PM | sun | yellow |
| **Night shift** | 8 PM – 8 AM | moon | purple |
| **On call** (backup, from home) | 5 PM – 8 AM | phone | blue |
| **Time off** | All day | palm tree | green |

The type is always a word and an icon besides its color. The colors are Badge's category tones.

- ⚠️ **Decision needed:** Intercept's real shift types and hours (12 h days and nights? 7 to 7? swing shifts, backup call, nocturnist), from their current rotation (SCH-OD-05).

### SCH-031 — Statuses

| Status | When | How it shows |
|---|---|---|
| **Published** | On the schedule | No label |
| **Draft** | Past the published horizon: the coordinator can still change it (sample: published four weeks ahead) | Dashed border; "Draft" in the details |
| **Swap requested** | The clinician asked for a swap (SCH-051) | ⇄ icon on the chip; "Swap requested" |
| **Given away** | The clinician gave it away, waiting for someone to take it | ⇄ icon; "Given away" |
| **Pending approval** | Time off asked for, not approved yet | "Pending approval" |
| **Approved** | Time off approved | "Approved" |

- ⚠️ **Decision needed:** what happens to a swapped or given-away shift once someone takes it: does it leave the calendar, or stay struck through until the end of the period (SCH-OD-02)?

### SCH-040 — Rail

From `lg` (1024px) up, at the left of the calendar. Below it, the toolbar alone navigates and nothing is filtered.

- **Small month:** a dot under each day with something scheduled (the first shift's color); today in bold brand color; the picked day filled. Picking a day moves the calendar there. Its own previous and next browse months without moving the calendar; it follows the calendar when that moves.
- **Shift types**, **Hospitals:** checkboxes, all on. Unchecking hides those shifts in every view; a shift stays while any of its hospitals is checked; time off isn't hidden by hospital.
- **Month total:** the clinician's shifts starting in the month on screen and their hours, time off aside, on both tabs.

### SCH-050 — Shift details

Clicking a chip or block opens its details in a popover: the type (or "Open night shift") and its status, the day and hours ("Tue, Nov 17 · 8 AM – 8 PM (12 h)"; time off: "Sat, Dec 5 – Mon, Dec 7"), then the role, the hospitals it covers, the call queues and a note (why it's open, who a swap went to, a time-off reason). Escape or a click outside closes it.

### SCH-051 — Actions

Shown in the details, by shift, never on a shift that's over:

| Shift | Actions |
|---|---|
| Own shift, published or draft | **Request swap**, **Give away** |
| Own shift, swap requested or given away | None |
| Time off, pending approval | **Cancel request** |
| Time off, approved | None |
| Open shift | **Request this shift**; once requested, "Requested, waiting for approval", disabled |

Each action closes the details and changes the shift's status at once (SCH-031); the request goes to the coordinator (`onShiftAction`). Cancel request removes the time off from the calendar.

- ⚠️ **Decision needed:** Request swap with whom: anyone eligible, or a colleague the clinician picks? Give away: does it post the shift to Open shifts (and the Marketplace) right away, or after the coordinator approves (SCH-OD-02)?

### SCH-060 — New request

A button at the toolbar's right with three requests: **Time off**, **Shift swap** and **Availability** (Spec §5.15 "shift-request collection with availability and preference capture").

- ⚠️ **Gap:** none of the three has a form yet: what each asks for (days, reason, preferred shifts, a colleague for the swap) is open (SCH-OD-06).

### SCH-070 — Open shifts

The Open shifts tab shows only open shifts the clinician is eligible for: licensed in the state, privileged at the hospital, credentials current (Left Nav Spec, Spec §6.7); anything they can't take never appears. A line under the toolbar says so. Open shifts are dashed, without a fill, and named "Open night shift". Only shifts still to come; with none, "No open shifts you can take right now."

- ⚠️ **Decision needed:** is requesting a shift a request the coordinator approves (today), or does an eligible clinician book it at once (self-scheduling, Spec §5.15) (SCH-OD-04)?
- ⚠️ **Decision needed:** should open shifts that clash with the clinician's own shifts or rest rules be hidden, or shown with a warning (SCH-OD-04)?

### SCH-080 — Where it opens

The Clinical Sidebar's **Schedule** (NAV-020). A shared link opens it with `?page=schedule`. The Monitoring and Patients layouts render it when given a `schedule`; without one, the page shows its empty state ("No shifts scheduled").

## 5. States

| State | What it shows |
|---|---|
| **Default** | My shifts, Month, today's month, every type and hospital shown |
| **Nothing scheduled** | The calendar with no chips; the month total reads "0 shifts · 0 h" |
| **No open shifts** | Open shifts tab: the calendar and "No open shifts you can take right now." |
| **Everything filtered out** | The calendar with no chips. ⚠️ **Gap:** no message says the filters hide everything |
| **Narrow** (below `lg`) | No rail; the toolbar wraps |

## 6. Accessibility

- Every chip and block is a button named in full: "Night shift, Mon, Nov 23 · 8 PM – 8 AM (12 h), Swap requested".
- Today is `aria-current="date"` in the month, the week and the small month; a month day's button reads its date and how many shifts it has.
- The tabs and views are Radix Tabs (arrow keys); the filters are labeled checkboxes in named groups; the period title is announced when it changes.
- A shift's type is a word and an icon; its status a word; never color alone.

## 7. Acceptance criteria

| ID | Criterion |
|---|---|
| SCH-AC-01 | Schedule opens on My shifts, Month, today's month, with today marked (SCH-010, SCH-020, SCH-021). |
| SCH-AC-02 | A shift's chip opens its details with its hours, hospitals and call queues; a future own shift offers Request swap and Give away; a past one offers nothing (SCH-050, SCH-051). |
| SCH-AC-03 | Request swap closes the details and the shift reads Swap requested, with ⇄ on its chip (SCH-031, SCH-051). |
| SCH-AC-04 | Week shows a night shift in both its days' columns and time off in the All day row (SCH-022). |
| SCH-AC-05 | Open shifts shows only open shifts; requesting one makes it read "Requested, waiting for approval" and lowers the tab's count (SCH-070). |
| SCH-AC-06 | Unchecking a shift type or hospital in the rail hides those shifts in every view (SCH-040). |
| SCH-AC-07 | New request lists Time off, Shift swap and Availability (SCH-060). |

## 8. Open decisions

| ID | Decision | Owner | Notes |
|---|---|---|---|
| SCH-OD-01 | Schedule's design in intercept.ds | Design | The layout follows a calendar app pattern; nothing is drawn yet |
| SCH-OD-02 | Swap and give-away: with whom, when it reaches Open shifts and the Marketplace, how a taken shift shows | Product, Operations | SCH-031, SCH-051 |
| SCH-OD-03 | Time zones: the clinician's only, or each hospital's local time too | Product | Spec §5.15; SCH-011 |
| SCH-OD-04 | Open shifts: request (coordinator approves) or instant booking; clashes with own shifts and rest rules | Product, Operations | Spec §5.15 self-scheduling; SCH-070 |
| SCH-OD-05 | Intercept's real shift types, hours and rotation | Intercept (CMO, Operations Lead) | Today's sample is a 14-day rotation of 12 h days, nights and backup call |
| SCH-OD-06 | The forms for Time off, Shift swap and Availability | Product, Design | SCH-060 |
| SCH-OD-07 | Should Schedule show the shift's handoff (PD-12) or the coverage team on each shift? | Product | Not in the first layout |
| SCH-OD-08 | Below `lg`: a list (agenda) view in place of the month grid? | Design | SCH-040 |
