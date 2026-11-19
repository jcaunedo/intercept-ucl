---
requirements: [PD-04, SV-01, SV-05, SV-08, SV-09, SV-10, SV-13, AL-02, AL-03, AL-04, AL-11]
status: proposed — confirm with Carlos
---

<!--
Created: Nov 18, 2026
Created by: Julio Caunedo
Last updated: Nov 19, 2026
Scope: The Monitoring card (UCL PatientMonitoringCard), one patient on the Monitoring page's panel: identity, location, score, alert bar, live monitor, flags, family messages and the "…" menu.
Purpose: Collects the card's behavior, states and acceptance criteria in one place. Until now they were spread across PRD Monitoring, PRD Patient card and PRD Patient monitor. Pending clinical and product validation.
-->

# PRD — Monitoring card

**Product:** Intercept Live — Virtual Care OS  
**Module:** Tele-Critical Care Clinical Surveillance ★ (Spec §5.2)  
**Component:** Monitoring card (UCL `PatientMonitoringCard`, `cards/patient-monitoring-card`; intercept.ds `patient-monitoring-card-2` `1232:5403`)  
**Audience:** Intensivists, APPs and Critical Care RNs  
**Version:** 0.1  
**Status:** Draft — pending clinical and product validation  
**Last updated:** November 19, 2026

---

## 1. Overview

The Monitoring card is how a patient appears on the Monitoring page's panel: who they are, where they are, how sick they are, their alert and their bedside monitor. It answers *does this patient need me right now?* from across the room.

It's built from the Patients card's parts (identity, location, score line, flags) plus two of its own: the **alert bar** and the **live monitor**.

| Where | What it shows |
|---|---|
| **Monitoring** › panel, Full view (default) | The card with the full four-lane monitor (PRD Patient monitor). |
| **Monitoring** › panel, Condensed view | The card with the condensed monitor: an ECG strip over HR · SpO₂ · ABP · RR, or a 1-hour sparkline under each number. |
| **Monitoring** › panel, Minimal view | Not this card: the Patients card (PatientCensusCard) with the alert's badge and ring (PRD Monitoring MON-015). |
| **Alert modal** | Not the card, but its alert bar heads the alert (PRD Alert maximized modal). |

ℹ️ How the panel picks, orders, filters and lays out the cards stays in PRD Monitoring (MON-010–MON-015). The monitor's lanes, numbers, limits and device alarms are in PRD Patient monitor (PMN-010–PMN-040). The shared rows (identity, location, score, flags) follow PRD Patient card. This PRD covers what the card itself shows and does.

### 1.1 Product objectives

| Objective | What it means for the card |
|---|---|
| **Triage at a glance** | The alert bar and the ring say which patients need attention before any number is read. |
| **Read the bedside remotely** | The monitor shows live vitals the way the bedside device does, on every card the same way. |
| **One patient, one look** | Identity, location, score and flags read the same as on the Patients card, the Patient details header and the alert modal. |
| **Act without leaving the panel** | The alert opens from its bar, and the "…" menu offers Ask Intercept Live, Video consult, the alert and escalation. |

### 1.2 Source documents

| Document | What this PRD takes from it |
|---|---|
| Requirements Specification | PD-04 (what a patient card shows), SV-01 (vitals and waveforms), SV-05 (densities, alarm color, click through), SV-08 (source, age, missing values), SV-09 (the named score and its 24 h change), SV-10 (escalation from surveillance), SV-13 (device panels), AL-02 (severity apart from device priority), AL-03 (lifecycle), AL-04 (origin and timestamps), AL-11 (one alert per condition, with a count) |
| Design update spec | DU-10 (device alarms as status, no remote acknowledge), DU-16 (respiratory panel by support type) |
| PRD — Monitoring | MON-011–MON-015 (panel cards, densities, live values, view controls), MON-050–MON-051 (freshness, page states), MON-070–MON-074 (display conventions), MON-084 (the draft card) |
| PRD — Patient card | PC-010–PC-016 (identity, location, avatar), PC-030–PC-031 (score and trajectory), PC-064 (flag details), PC-100 (open patient), PC-107 (interaction separation), PC-143 (missing data), PC-160 (color independence) |
| PRD — Patient monitor | PMN-010–PMN-040: the monitor in the card's full view, and the numbers, limits and device alarms in both views |
| intercept.ds `patient-monitoring-card-2` (`1232:5403`) | The card, the alert bar and the score line |
| DESIGN.md "PatientMonitoringCard" | How the card and its monitor are built |

## 2. Users and use cases

| User | What they need from the card |
|---|---|
| **Critical Care RN** | Spot who's alerting, read their vitals, open the alert or the patient. |
| **Intensivist / APP** | Scan the panel for deterioration (score, trajectory, values outside limits) and act on it. |

| Use case | Flow |
|---|---|
| **Scan the panel** | Looks across the cards: the alert bars and rings first, then the monitors, then the scores. |
| **Work an alert** | Clicks the alert bar; the alert modal opens for that patient. |
| **Open the patient** | Clicks anywhere else on the card; Patient details opens. |
| **Act from the panel** | Opens the "…" menu: Ask Intercept Live, Video consult, View alert, Escalate, Huddle team, Raise concern. |
| **Check a flag** | Clicks a flag (Ventilated, Pressors, Fall risk…); its details open in a popover without opening the patient. |

## 3. Anatomy

Top to bottom:

| Part | What it shows | Rule |
|---|---|---|
| **Header** | Avatar, name, "MRN - F, 59"; on the right, the family message icon and the "…" menu | PMC-010, PMC-050, PMC-051 |
| **Location** | Map pin, "Hospital · Unit · Room - Bed", then the record system badge | PMC-011 |
| **Score line** | Trend arrow, "NEWS2: 7 High · 1 point up in 24 h" | PMC-012 |
| **Alert bar** | "Critical · 3 in the last 24 h", the time since on the right, or "No active alerts" | PMC-020–PMC-024 |
| **Monitor** | Condensed or full, waveforms or 1-hour trends | PMC-030–PMC-033 |
| **Flags** | One row of flags, scrolling sideways when they don't fit | PMC-040 |

## 4. Requirements

### PMC-010 — Identity

The patient's name ("Last, First"), bold, on one line; a name too long for the card truncates, with the full name on hover. Under it, the MRN, then sex and age ("MRN 4471 - F, 59"). Left of them, the patient's avatar (photo or initials in the patient's color), the same as on every other surface (PC-016). No avatar without a photo or initials.

### PMC-011 — Location

The hospital, unit, room and bed on one line after a map pin (PC-013, PC-014). Only the hospital truncates, with its full name on hover; unit, room and bed always show.

The record system the patient's data comes from ("Epic") can show as a small outlined badge at the end of the line, which never truncates and is read "record from Epic". ℹ️ Monitoring shows it on no card for now (PRD Patient card PC-013).

### PMC-012 — Score line

The acuity score and its change as one line under the location: a trend arrow, the score's name and value with its band ("NEWS2: 7 High"), then the change, muted ("1 point up in 24 h") (PC-030, PC-031, SV-09). The arrow's color follows the change: ▲ +1 medium, a larger rise critical, ▼ success. Without a score the band reads Unknown. With neither a score nor a trajectory, there's no line.

### PMC-020 — Alert bar

A full-width bar under the score line says where the patient's alerts stand (MON-014):

| Bar | Content | Look |
|---|---|---|
| **Open alert** | The highest severity, how many alerts the patient had in the last 24 h, and how long ago it started: "**Critical** · 3 in the last 24 h", "3:34 m ago" | The severity's fill (Critical, High, Medium, Low), white text |
| **Resolved** | "**Resolved** · 3 in the last 24 h", "15 h ago" | Green |
| **Message** | A message the alert system raised, with the message icon | Neutral |
| **No alert** | "No active alerts" | Quiet grey |

The time since an open alert runs like a clock, ticking each second ("3:34 m ago", then "1:05 h ago"); a resolved one reads in whole units ("Just now", "24 m ago", "15 h ago"). A repeat of the same condition updates the bar's count and time instead of adding an alert (AL-11).

✅ **Resolved:** the alert is a bar under the name and location, not a pill beside the name (intercept.ds `patient-monitoring-card-2`).

### PMC-021 — Which alert the bar shows

- The patient's highest open alert that isn't acknowledged. An acknowledged alert leaves the card, wherever and by whomever it was acknowledged; the card shows the next one, or "No active alerts". It stays in the live feed until it's resolved (MON-022).
- A patient whose last alert resolved in the last 24 h keeps the green Resolved bar for those 24 h.
- Closing the patient's Resolved toast (its × or the stack's Close all) clears the Resolved bar at once: "No active alerts" until the next alert or resolution.
- A change of state cross-fades in place; a Resolved bar that goes fades out slowly, so it's seen leaving.

### PMC-022 — Alert ring

An open Critical, High, Medium or Low alert gives the card a 2px ring in its severity's color over a faint tint, pulsing in step with every other alerting card (the Urgency pattern), until the card is clicked or the alert is acknowledged or escalated. A new, different severity pulses again. Steady under reduced motion. The ring is the Patients card's (PRD Patient card), so an alert looks the same on both.

### PMC-023 — Open the alert

Every alert's whole bar (each severity, Resolved and a message) is a button that opens the patient's alert in the alert modal, with a maximize icon at its end. "No active alerts" stays plain text. Clicking the bar opens the alert, never the patient (PC-107). On hover its fill darkens.

### PMC-030 — Monitor: condensed

The Condensed view shows a short monitor: the ECG lead II strip, then HR, SpO₂, ABP and RR side by side, each with its label, limits and value (MON-070, MON-071). With **1 h trends** (Card monitor), each number has its last hour as a sparkline under it in place of the strip (MON-015).

On a narrow card (under about 340px, e.g. six a row), the numbers drop their units and ABP gets more room, so "104/56" never truncates.

### PMC-031 — Monitor: full

The Full view shows the patient monitor: four lanes (II, Pleth, ABP, Resp), each its waveform or last hour beside its numbers and limits. It's the same component as on Patient details and in the alert modal, with the same rules (PRD Patient monitor).

### PMC-032 — Who sets the view

The page sets the view for every card at once (Monitoring's Monitor view: Full, Condensed, Minimal), so cards are never mixed. The card has no expand or collapse button of its own. Switching animates the monitor's height and cross-fades the views.

✅ **Resolved:** the card has no expand / collapse button; the page sets the view (MON-015).

### PMC-033 — Values, limits and alarms

The numbers in both views follow PRD Patient monitor: "--" for a value not coming in, never zero (PMN-021, PC-143); limits from the bed's device profile, a side that's off reads OFF (PMN-030); ▲ / ▼ for a value outside its limits, the parameter keeping its color (PMN-031); the device's red / yellow / cyan box while the bedside monitor alarms, until acknowledged at the bedside (PMN-032). The waveforms are illustrative, never diagnostic, and draw only while the card is on screen (PMN-011).

ℹ️ The device's alarm is never the platform's alert: the alert bar and ring show the alert's severity, and they never recolor a parameter (MON-073, AL-02).

### PMC-040 — Flags

The patient's flags (Ventilated, Pressors, DNR, Fall risk…) in one row under the monitor, the Patients card's row. They stay on one line and scroll sideways when they don't fit. A flag with details opens them in a popover without opening the patient: what the bedside team changed in the last 12 hours, what's behind it now, and its source and age (PC-064). With no flags the row reads "No tags", so cards line up.

ℹ️ The product calls these **flags**; the code and parts of the PRDs still say tags.

### PMC-050 — Family messages

While the patient's family has unread messages, a message icon shows right of the name, read "2 new messages from family". With a handler it's a button that opens them. ⚠️ **Gap:** Monitoring passes the unread count but no handler, so the icon is only an indicator there (PMC-OD-03).

### PMC-051 — "…" menu

A "…" button right of the name opens the patient's actions. It slides in while the pointer is on the card or keyboard focus is in it, and stays while its menu is open. The items (MON-014, PRD Alert maximized modal §3):

| Item | Shown | Does |
|---|---|---|
| **Ask Intercept Live** | Always | Opens Ask Intercept Live about the patient |
| **Video consult** | Always | Opens the patient's video consult |
| **View alert** / **View alerts** | While the card shows an alert; "View alerts" when it counts several | Opens the alert modal, as the alert bar does |
| *Divider* | | |
| **Escalate**, **Huddle team**, **Raise concern** | Always | The escalation actions |

### PMC-060 — Open the patient

The whole card opens the patient's details page (PC-100). On hover it lifts, takes a 2px border and a deeper shadow. The alert bar, the flags, the message icon and the "…" menu are separate targets above it, each with its own focus and name, and never also open the patient (PC-107). The monitor holds nothing interactive, so a click on it opens the patient.

### PMC-070 — Sizes

| Size | Density | Differences |
|---|---|---|
| **Default** | Comfortable | 20px name, 44px avatar; the condensed monitor 120px tall |
| **Small** | Compact | 16px name, 32px avatar, tighter padding, 12px text, a smaller alert bar; the condensed monitor 104px tall, a narrower numbers column in the full one |

The full monitor is 240px tall at both sizes. How many cards fit a row is the panel's (MON-012).

## 5. States

| State | What shows |
|---|---|
| **No alert** | "No active alerts", no ring. |
| **Open alert, new** | The severity's bar, the clock running, the ring pulsing. |
| **Open alert, seen** | The same, with the ring steady after a click on the card. |
| **Alert acknowledged** | It leaves the card: the next open alert, or "No active alerts" (PMC-021). |
| **Resolved** | The green bar for 24 h, or until its toast is closed. |
| **Unread family messages** | The message icon right of the name. |
| **Value outside limits** | ▲ / ▼ in its label row (PMC-033). |
| **Device alarm** | The value in its priority's box, flashing for high and medium. |
| **Value missing** | "--", its lane flat. |
| **Connecting** | A pulsing block in each lane for half a second as the card comes on screen. |
| **No flags** | "No tags". |
| **Stale** | ⚠️ **Gap:** not shown yet. MON-050 asks for stale values dimmed with their age ("18 min ago") and the waveforms frozen (SV-08) (PMC-OD-01). |

## 6. Accessibility

- The card is an `article`; the patient's name is its heading and the link or button that opens the patient.
- The monitor is a region named "Bedside monitor, {name}"; the waveforms are decorative and the numbers carry the values (PRD Patient monitor §6).
- The alert bar reads "Open alert: Critical · 3 in the last 24 h, 3 min ago"; the time is read in words, to the minute, so it isn't announced every second.
- The message icon and the "…" button have names: "2 new messages from family", "More actions for {name}".
- Severity, trend and range never depend on color alone: the bar names the severity, the score line names the band, values outside limits carry ▲ / ▼ (PC-160).
- Every target is reachable by keyboard; the "…" button appears on focus.

## 7. Motion

| Event | Motion (MOTION.md) |
|---|---|
| Hover on a card that opens the patient | Lift |
| Click on the alert bar | Press |
| Alert state changes | Cross-fade in place; a Resolved bar fades out slowly |
| Alert ring | Urgency pulse, in step across cards |
| Score line or flags shown or hidden | Expand, the card's gap closing with it |
| Condensed ↔ full | The monitor's height animates, the views cross-fade |
| "…" button | Slides in on hover or focus |
| Waveforms | Sweep at the bedside's speed; device alarms flash at the device's rates |

Under reduced motion the ring is steady, the traces stand still and the rest is instant or a fade.

## 8. Acceptance criteria

| ID | Criterion |
|---|---|
| PMC-AC-01 | A patient with an open Critical alert shows "Critical · n in the last 24 h" in a red bar with a running clock, and a pulsing red ring until the card is clicked (PMC-020, PMC-022). |
| PMC-AC-02 | Acknowledging the patient's alert anywhere removes it from the card at once; the card shows the next open alert or "No active alerts" (PMC-021). |
| PMC-AC-03 | After the last alert resolves, the card shows the green Resolved bar for 24 h; closing that patient's Resolved toast clears it at once (PMC-021). |
| PMC-AC-04 | Clicking the alert bar opens the alert modal and never the patient; clicking elsewhere on the card opens Patient details (PMC-023, PMC-060). |
| PMC-AC-05 | Switching Monitoring's Monitor view changes every card's monitor at once; no card has its own expand control (PMC-032). |
| PMC-AC-06 | A value not coming in shows "--", never zero, in both views (PMC-033). |
| PMC-AC-07 | The "…" menu shows View alert only while the card shows an alert, and View alerts when it counts several (PMC-051). |
| PMC-AC-08 | Clicking a flag opens its details and doesn't open the patient (PMC-040). |
| PMC-AC-09 | On a card about 300px wide, the condensed numbers never truncate (PMC-030). |
| PMC-AC-10 | Every target on the card works by keyboard, and with reduced motion on (§6, §7). |

## 9. Dependencies

| Dependency | Why |
|---|---|
| Telemetry Ingestion (Spec §6.6), device profiles (Simulator SD-12) | Live values, limits and device alarm priorities |
| Clinical Alerting & Events (Spec §5.6) | The alert's severity, lifecycle, count and timestamps |
| Patient Data Aggregation (Spec §6.5) | Identity, location, score, flags |
| Care Coordination (Spec §5.3) | Family messages, video consult |
| UCL `PatientMonitor`, `PatientCensusCard`'s rows | The monitor and the shared rows |

## 10. Open decisions

| ID | Question |
|---|---|
| PMC-OD-01 | How the card shows stale data (MON-050, SV-08): dimmed numbers with their age, frozen waveforms, a Stale tag, as the Oct 27, 2026 exploration proposes. |
| PMC-OD-02 | How a device alarm acknowledged at the bedside shows its who, when and how long active (DU-10), and whether the card shows the alarm's message ("SpO₂ LOW"). |
| PMC-OD-03 | Whether the family message icon opens the patient's messages on Monitoring, or is removed from the card (PMC-050). |
| PMC-OD-04 | Whether the card shows respiratory support by type (DU-16) or leaves it to Patient details. |
| PMC-OD-05 | Whether the record system badge shows on Monitoring's cards (PMC-011). |
| PMC-OD-06 | The condensed monitor: a mini waveform, or numbers and trends only (MON-OD-12); and the parameter palette (MON-OD-10). |
| PMC-OD-07 | Figma: intercept.ds draws the card with an empty monitor frame; the condensed monitor, the small size and the alert bar's Resolved and message states aren't drawn yet. |
