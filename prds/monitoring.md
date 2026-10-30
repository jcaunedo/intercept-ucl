---
requirements: [SV-01, SV-04, SV-05, SV-10, SV-13, AL-02, AL-03, AL-04, CC-04]
status: proposed — confirm with Carlos
---

<!--
Created: Oct 26, 2026
Created by: Julio Caunedo
Last updated: Oct 30, 2026 (work-list ranking and reason line: MON-021, DU-09; cards per row by breakpoint, both densities: MON-012; earlier, Oct 29: acuity without "risk": MON-011, §12; earlier, Oct 28: Open chart opens Patient details: MON-030; earlier, Oct 27: My patients is a chip, off by default: MON-010, §3; Monitoring exploration recorded: §12.1, its proposals in §15, MON-OD-13 added; filters in context: MON-010, MON-014, MON-051, MON-AC-11; MON-015 view controls, built in UCL)
Scope: The Monitoring page of Intercept Live (Tele-Critical Care Clinical Surveillance, Spec §5.2) inside the Provider Desktop: the patient panel, triage queue, patient focus view, camera and escalation.
Purpose: Defines proposed page structure, behavior, states and acceptance criteria for the Monitoring page, pending clinical and product validation and the Spec §5-DD.2 deep dive.
-->

# PRD — Monitoring

**Product:** Intercept Live — Virtual Care OS  
**Module:** Tele-Critical Care Clinical Surveillance ★ (rendered inside the Provider Desktop)  
**Name:** the page is called **Monitoring** in the product, including its Sidebar item (decided Oct 26, 2026: plainer than "Surveillance", which hospitals also use for infection-prevention tracking, next to Virtual Sepsis); *Tele-Critical Care Clinical Surveillance* stays the module's name in the Specification.  
**Surface:** Monitoring page  
**Version:** 0.1  
**Status:** Draft — pending clinical and product validation  
**Last updated:** October 29, 2026

---

## 1. Overview

Monitoring is where an on-shift clinician watches their patient panel continuously, evaluates alerts, looks in on patients through the bedside camera, and decides when to escalate to intervention. The System Specification describes it as "a sustained workflow loop that runs throughout the shift, distinct from the discrete intervention loop that follows it" (Spec §5.2).

The Census page answers *who is on my census and who needs attention*. Monitoring answers *what is happening to these patients right now, and do I need to act*. Census is a roster of compact cards; Monitoring is a live monitoring surface built from expanded cards, trends and a triage queue.

Monitoring is not the patient chart and not the intervention workflow. It shows enough to notice, judge and escalate; ordering, documenting and messaging happen in their own modules, opened from here without losing context (Spec §9.1, Principle 11).

### 1.1 Product objectives

| Objective | What it means on this page |
|---|---|
| **Notice deterioration early** | Live vitals, trends and acuity changes are visible across the panel without opening each patient. |
| **Triage alerts in one place** | Every active alert for the panel is in one prioritized queue, with its source and evidence. |
| **Look in without leaving** | The bedside camera opens beside the patient's data, not in another application. |
| **Escalate with context** | Escalation carries the patient, the alert and the evidence to the intervention loop or the bedside team. |
| **Stay honest about data** | Stale, partial and missing data are labeled, never shown as normal (Spec §9.1, Principle 12). |
| **Scale across hospitals** | One clinician can watch patients from several hospitals without switching tools, within each hospital's privileges. |

### 1.2 Source documents

1. Intercept Live — Virtual Care OS System Specification, May 2026 (`documents/Intercept Live - Virtual Care OS - System Specifications.md`).
2. Intercept Live Design Phase Team Brief, October 20, 2026 (`documents/Intercept Live Design Phase Team Brief.md`).
3. PRD — Patient card, v0.1 (`prds/patient-card.md`).
4. Intercept Live Monitoring exploration, October 27, 2026 ([claude.ai artifact](https://claude.ai/artifact/HtZYre6XUQ3vHannnT1nJm), listed in `explorations/index.md`). An interactive page built from this PRD; what it shows and proposes is in §12.1.

Relevant System Specification sections:

| Section | Why it matters here |
|---|---|
| §5.1 Provider Desktop | The workspace the Monitoring page renders inside |
| §5.2 Tele-Critical Care Clinical Surveillance | This module's purpose and core capabilities |
| §5.3 Care Coordination, Communication & Telepresence | Camera sessions, messaging and presence |
| §5.6 Clinical Alerting & Events | Alert taxonomy, lifecycle and Clinician Intuition Alerts |
| §5.9 Virtual Sepsis | Sepsis candidates surfaced in the queue |
| §6.6 Telemetry Ingestion | The live data this page renders |
| §8.1 Sepsis Sniffer, §8.3 Vent-Order Mismatch Agent, §8.4 Deterioration Predictor | AI agents that write into the queue |
| §9.1 UI Vision and Design Principles | Commitments 2, 3, 4, 6, 7, 9, 11, 12 and 13 apply directly |

⚠️ **Gap:** the Specification defers Surveillance's numbered functional requirements, screen-level capabilities and flows to a separate deep-dive document (§5-DD.2), which we don't have. This PRD proposes them; reconcile it with §5-DD.2 when it arrives.

### 1.3 Design references

ICU bedside monitors are the clinicians' daily reference for how live physiology should read. Four established product families are benchmarked (design direction, Oct 26, 2026). They are widely recognized; a current market-share ranking wasn't verified.

| Reference | What to learn from it | Role here |
|---|---|---|
| **Philips IntelliVue MX800** | Strong waveform hierarchy, large color-coded vitals, compact labels, dedicated alarm controls | **Primary visual reference** |
| **GE HealthCare CARESCAPE B850** | Dense, information-rich layout: many physiological parameters, numeric readings, secondary controls | Reference for **information density** at high acuity |
| **Mindray BeneVision N22** | Modern touchscreen interface, portrait and landscape layouts, modular waveforms, strong numeric differentiation | Reference for **screen composition** and responsive layouts |
| **Dräger Infinity M540** | Compact display focused on essential measurements and alarm continuity | Reference for how clinicians scan **small surfaces** (cards, side sheets) |

⚠️ **Constraint:** adapt these conventions; don't reproduce the device interfaces, their visual identity or their alarm behavior. Alarm behavior, clinical thresholds, labeling and interaction are validated against Intercept's clinical workflow and the applicable safety requirements (MON-OD-10–12).

**Specification boundary:** these documents establish capabilities and principles. They do not define a panel size, telemetry layout, alert ordering, camera controls or escalation targets. Everything below is a design proposal to validate with Intercept's clinical and product leadership.

---

## 2. Users and use cases

### 2.1 Primary users

| User | On this page they… |
|---|---|
| **Intensivist** | Watch the sickest patients across hospitals, review changes the RNs raise, decide on intervention and escalate to bedside teams. |
| **Advanced Practice Provider (APP)** | Run surveillance for an assigned panel, evaluate alerts within scope of practice, escalate to the intensivist. |
| **Critical Care RN** | Monitor continuously, triage the alert queue first, look in by camera, escalate concerns to the intensivist or the bedside nurse. |

### 2.2 Use cases

| ID | Use case | Description |
|---|---|---|
| MON-UC-01 | **Panel watch** | A clinician keeps their panel on screen through the shift and spots a patient whose vitals or acuity are changing. |
| MON-UC-02 | **Alert triage** | A new alert arrives; the clinician sees its priority, source and evidence, then acknowledges, escalates or resolves it. |
| MON-UC-03 | **Look in** | The clinician opens the bedside camera for a patient, sees the room with the live drips, vent and pump values overlaid, and talks to the bedside team. |
| MON-UC-04 | **Escalate** | The clinician hands a concern to the intervention loop (orders, notes) or to the bedside team, with the alert and evidence attached. |
| MON-UC-05 | **Intuition concern** | The clinician has a concern no threshold caught and raises a Clinician Intuition Alert from the panel (Spec §5.6). |
| MON-UC-06 | **Handoff** | The incoming clinician starts the shift on Monitoring and sees unresolved alerts and intuition concerns carried over. |
| MON-UC-07 | **Degraded data** | A feed goes stale or disconnects; the clinician sees which patients and values are affected and keeps working with what's reliable. |

---

## 3. Page architecture

### 3.1 Regions

The page uses the Provider Desktop shell already built for the Census: Sidebar (Monitoring active), sticky AppHeader, and the canvas.

| Region | Content | Notes |
|---|---|---|
| **Page header** | Title, panel summary ("12 patients · 4 active alerts"), hospital tabs, panel controls | Same filter vocabulary as the Census, so the two pages feel like one workspace |
| **Patient panel** | One expanded Patient card per patient, with live values | The main area. Density options in MON-012 |
| **Triage queue** | The panel's active alerts, highest priority first | A right-hand rail; collapsible |
| **Focus view** | One patient's trends, camera and actions | Opens over the panel (side sheet) when a patient is selected; the panel stays visible |

ℹ️ The Sidebar's **Alert Queue** page is the full alert-management surface (Clinical Alerting & Events). Monitoring's triage queue shows the same alerts, scoped to the panel, in context. ⚠️ **Decision needed:** whether both exist in v1, or the triage queue is the only alert surface for clinicians (MON-OD-03).

### 3.2 Information hierarchy

1. Active alerts on the panel (the queue, and each card's alert pill)
2. Patients whose acuity or vitals are changing
3. Live vitals for every patient on the panel
4. Context: hospital, unit, bed, interventions (tags)
5. Data freshness and provenance
6. Actions: open, look in, escalate

This follows Spec §9.1 Principle 4: active alerts, critical-patient flags and handoff state are **mandatory surfaces**; layout and density are the clinician's choice.

### 3.3 Monitoring display conventions

Adopted from the design references (§1.3). They apply wherever the page shows live physiology: panel cards, the focus view and the camera overlay.

| ID | Pattern | Requirement |
|---|---|---|
| MON-070 | **Waveform organization** | Each waveform has its label (e.g. "II", "Pleth", "ABP", "Resp") at the same position on its row, and rows keep the same order and alignment for every patient, so the eye learns one layout. A waveform's numeric sits on the same row, aligned to it. |
| MON-071 | **Numerical hierarchy** | HR, SpO₂, BP and RR are the largest numbers and are immediately readable at a glance; secondary values (temperature, EtCO₂, ventilator and pump values) are smaller. Units are compact and never compete with the number. |
| MON-072 | **Parameter colors** | Each parameter keeps one color everywhere (number, waveform, label, trend), on every patient and page. Color is never the only signal: the label always names the parameter (PRD PC-160). |
| MON-073 | **Alarm presentation** | Alarm priority and status are shown separately from parameter colors: severity uses its own treatment (the alert pill, the card's alert ring, a marked numeric), never by recoloring a parameter. Parameter colors avoid the severity hues (critical red, high orange, medium amber, low blue) so a colored number never reads as an alarm. ⚠️ **Decision needed:** the parameter palette (MON-OD-10). |
| MON-074 | **Device integration** | Values from the bedside monitor, the ventilator and infusion pumps are grouped and labeled by source ("Monitor", "Ventilator", "Pump"), so a ventilator setting is never mistaken for a monitored vital (Spec §9.1 Principle 6; MON-062). |

---

## 4. Patient panel

### MON-010 — Panel membership

The panel shows the patients the clinician is responsible for on this shift: by default every patient assigned to them across the hospitals they cover, narrowed by hospital (tabs), **My patients** (a chip, off by default) (a pill opening a menu, replacing the Census's My Patients switch on Oct 27, 2026) and unit. With My patients the summary reads "6 of 14 patients".

✅ **Resolved (Oct 27, 2026): filters in context.** Monitoring's filters set the panel's **scope** (hospital, My patients, unit), its **order** (Sort by: Alert, Location, Name) and its **view** (Full monitors, densities), and nothing else. The Census's status filters don't repeat here, because other parts of this page already do that job:

| Census filter | On Monitoring |
|---|---|
| With alerts ("Needs attention" and the Alerts only switch until Oct 27, 2026) | The triage queue (§5) lists exactly these, with the actions |
| Outside limits | A ↑ / ↓ tag on the value itself (MON-014), so drift shows in place. Also, since Oct 27, 2026, Monitoring's one status filter, **Outside limits**: it keeps the patients who were outside their alarm limits when it was pressed, so cards never come and go as readings move (MON-013); its count stays live |
| Data gap | A System alert in the queue ("SpO₂ not reporting", MON-051) |
| Rising score, Organ support, score sorts | Not on Monitoring: the monitoring card doesn't show acuity or tags. They stay on the Census |

A filter on live status would also add and remove cards as readings change, which MON-013 rules out.

- ⚠️ **Decision needed:** how a panel is defined (shift assignment, a hand-picked watch list, or both) and whether a clinician can add a patient from the Census to their panel (MON-OD-01).
- ⚠️ **Constraint:** the brief's ground rule "patient data never crosses tenants" applies. A cross-hospital panel may only combine hospitals the clinician's tenant covers, filtered by per-hospital privileges (Spec §5.2 "Cross-hospital surveillance with per-hospital privilege filtering").

### MON-011 — Patient cards

Each patient appears as an **expanded** Patient card (PRD PC §3.1): identity, location, top alert, acuity and 24h change, vitals with range markers, and tags. Values update in place as telemetry arrives.

- Reuses the UCL `PatientCard` (`variant="expanded"`) with its alert pill, acuity levels and severity border, so a patient reads the same on Census and Monitoring (PRD PC-001, PC-002).
- ✅ **Resolved (Oct 29, 2026):** acuity reads Low / Moderate / High / Critical, without "risk", replacing the earlier rule that it never shares a word with alert severities. It stays apart from an alert as colored text after its score, not a pill (DESIGN.md "Patient card").

### MON-012 — Density

| Density | Cards per row at 1728px | For |
|---|---|---|
| **Comfortable** (default) | 5 (4 with the triage queue open) | Fewer patients, more trend detail per card |
| **Compact** | 5 (4 with the triage queue open) | A full panel at a glance |
| **List** | One row per patient | Large panels; vitals as columns |

✅ **Resolved (Oct 30, 2026, user's call):** both densities show 3 / 4 / 5 / 6 cards per row in the 1280 / 1536 / 1728 / 1920 frames, and above 1920 one more per 296px of window up to 13 (8 at 2560, 12 at 3840), with the Sidebar collapsed and no panel open; an open panel drops columns. The densities differ in card size (Comfortable keeps the larger monitor and type) and below 1025px. Replaces 3 Comfortable / 4 Compact at 1728 (DESIGN.md "Card grids: cards a row per breakpoint").

⚠️ **Decision needed:** which densities ship in v1 (MON-OD-04). Spec §9.1 Principle 3: density is not clutter; every added value must earn its place.

### MON-013 — Ordering

Default order is **Alert**, then **Score** (the Census's Sort by: Alert, ties broken by score band, 4 h rise and score, then name). The clinician can switch to Score, Score change, Name or Location; Location groups the panel into hospital sections (HospitalSectionHeader).

- Cards **never reorder by themselves** while the clinician is looking at them. A new alert moves a card only when the clinician accepts a "Panel order changed · Update" prompt, or after they've been idle for a configured time. ⚠️ **Decision needed:** auto-reorder rules (MON-OD-05); a card jumping under the pointer is a safety risk.
- ℹ️ The UCL Monitoring Default story (live since Oct 27, 2026; `Static` is the still one) shows the opposite for comparison: a scripted feed raises and lowers alert severities and the cards reorder by themselves, highest first.
- ℹ️ The exploration (§12.1) shows the prompt as a bar above the panel: "Panel order changed. Alerts changed priority; cards stay put until you update", with Update order. It has no idle auto-update. A filter, sort or density change reorders at once, because the clinician asked for it.

### MON-014 — Live values

| Rule | Behavior |
|---|---|
| Hierarchy | HR, SpO₂, BP and RR lead each card, in the same order on every card (MON-071). |
| Update | Vitals update in place; the number changes without moving the layout. |
| Change cue | A value outside its alarm limits gets a ↑ / ↓ tag in its label row; the parameter keeps its color (MON-073). No flashing. Replaces a filter for the same thing (MON-010). |
| Trend | Each vital can show a 1-hour sparkline (Comfortable density). ⚠️ **Decision needed:** trend window (PRD OD-07). |
| Freshness | Values older than their freshness interval are labeled Stale (MON-050). |

### MON-015 — View controls

Two controls at the end of the toolbar, after Unit and Sort by, change how the panel looks, never who is on it (MON-010). From the exploration (§12.1).

| Control | Behavior |
|---|---|
| **Density** | A segmented control with an icon for each option, named by a tooltip (and for screen readers): **Comfortable** (default), **Compact**, **List** (MON-012). One option is pressed at a time. Switching reflows the panel in place; the order and the scope stay the same. |
| **Card monitor** | A segmented control like Density, with icon and label, just left of it: **ECG strip** (default) or **1 h trends**, which puts a sparkline under each numeric instead of the waveform, and in full monitors draws each lane's last hour instead of its waveform (MON-014, MON-OD-12). Disabled in List. Moved out of the View menu on Oct 27, 2026. |
| **Monitor view** | Two icon buttons with tooltips, **Condensed monitors** / **Full monitors**, between Card monitor and Density: every card's monitor condensed, or all four lanes (Comfortable and Compact). Each card's own button still toggles it alone; while cards are mixed, neither is pressed. Disabled in List. Replaced the View menu on Oct 27, 2026. |

- Neither control appears on the Census: densities and monitors are Monitoring's own (filters in context, MON-010).
- Values outside their limits aren't a View option: the card always marks them (MON-014). The exploration's "Mark values outside limits" switch was dropped when that became the default.
- **Accessibility:** every view option is a toggle button with `aria-pressed`; the icon-only ones (Monitor view, Density) take their accessible name from the tooltip's text.
- ⚠️ **Decision needed:** whether view settings persist per clinician across sessions and devices, or reset each shift.
- ✅ **Built (Oct 27, 2026):** the UCL layout has both: the density control, a View DropdownMenu, the compact card (`PatientMonitoringCard` `size="sm"`), the trends view (`plot="trends"`, condensed and full) and the List table. Which densities ship still waits on MON-OD-04.

---

## 5. Triage queue

### MON-020 — Content

Every active alert for the panel, one row each: severity, patient (name, bed, hospital), title ("SpO₂ below 88%"), source, age, and lifecycle state.

| Field | Source |
|---|---|
| Severity | Critical / High / Medium / Low (PRD PC-070; ⚠️ OD-05) |
| Source | AI agent (with agent chip), Device, Rule, Manual (Clinician Intuition Alert), System (PRD §15.1; ⚠️ OD-15) |
| State | Active, Acknowledged, Escalated (PRD PC-071) |
| Age | Time since it fired; Overdue after its response target (⚠️ OD-15) |

### MON-021 — Ordering

Severity first, then the patient's acuity band, then the larger rise in their score over 4 h, then oldest first (DU-09, Oct 30, 2026; it was severity, then oldest first). A patient whose score jumps outranks one high but steady. Each row can carry a reason line, a few words on why it matters for this patient ("Rising work of breathing, positive fluid balance, HFrEF"). The card grid's Alert sort ranks the same way. ⚠️ **Gap:** overdue sepsis elements (DU-09) aren't in the ranking yet. ⚠️ **To clarify with the client:** the 4 h window and the severity of a score alert (PRD Patient card PC-030 "To clarify with the client", OD-18). New alerts enter at their position with a short Reveal (MOTION.md), never by pushing the row under the pointer. ⚠️ **Decision needed:** ordering rules (PRD OD-05).

### MON-022 — Actions

| Action | Effect |
|---|---|
| **Open** | Opens the patient's Focus view on that alert's evidence |
| **Acknowledge** | Marks it seen by this clinician; stays in the queue (PRD PC-071) |
| **Escalate** | Starts escalation (MON-040) with this alert attached |
| **Resolve** | Requires a resolution (reason, optional note); leaves the queue, stays in history |

- Acknowledging never resolves; escalating never closes (PRD PC-071).
- Every action records who and when (Spec §5.6 audit trail) and is visible on the alert (Spec §9.1 Principle 6).

### MON-023 — AI-sourced alerts

Alerts from the Sepsis Sniffer, Vent-Order Mismatch Agent and (roadmap) Deterioration Predictor show the agent chip and their structured evidence (Spec §8.1, §8.3, §8.4). Declining one asks for an optional rationale, recorded as "declined with rationale" (Spec §8.2 three-state action telemetry). AI rows look like recommendations, never like facts (Spec §9.1 Principles 7, 9).

---

## 6. Focus view

### MON-030 — Contents

Opening a patient (card or queue row) opens a side sheet over the panel's right side:

| Section | Content |
|---|---|
| **Header** | Patient identity, location, alert pill, acuity, code status (⚠️ PRD OD-16) |
| **Waveforms** | Live waveforms in a fixed order, e.g. ECG (lead II), SpO₂ pleth, arterial pressure, respiration or capnography, each with its numeric aligned on the same row (MON-070–MON-072). ⚠️ **Decision needed:** the default waveform set per bed type (MON-OD-11) |
| **Vitals & trends** | HR, SpO₂, BP (MAP and systolic/diastolic) and RR as the primary numerics (MON-071), temperature and the rest secondary, with 1h / 6h / 24h trend charts and range bands |
| **Respiratory** | Labeled "Ventilator" (MON-074): support mode and ventilator settings; vent-order mismatch evidence when present (PRD PC-050–052) |
| **Infusions** | Labeled "Pump" (MON-074): active drips and rates (PRD PC-060); a missing pump feed never reads as "stopped" |
| **Alerts** | This patient's active alerts with the same actions as the queue |
| **Camera** | The bedside camera (MON-031) |
| **Actions** | Look in, Message bedside team, Escalate, Raise intuition alert, Open chart |

- The panel stays visible and live behind it; the clinician can step through patients (↑/↓) without closing the sheet.
- ⚠️ **Decision needed:** side sheet vs. full page for the focus view (MON-OD-06).
- ℹ️ Open chart opens the Patient details page (`prds/patient-details.md`). The focus view is for watching one patient while staying on the panel; Patient details is for working on one patient.

### MON-031 — Camera and telemetry fusion

The bedside camera opens inside the Focus view (Spec §5.2 "Camera control and bedside audio-visual session"). Over the feed, the live drips, vent settings and pump rates are overlaid ("telemetry-and-camera fusion", Spec §5.2).

| Control | Behavior |
|---|---|
| Start / end session | Visible session state; the room's presence indicator shows "In camera" (Spec §6.12) |
| Pan, tilt, zoom, presets | ⚠️ Depends on hospital hardware |
| Audio | Talk / mute; never auto-unmuted |
| Overlay | On by default; toggle off to see the room unobstructed |

- ⚠️ **Constraint:** the prototype shows a synthetic or placeholder camera feed only (brief: synthetic data only).
- ⚠️ **Decision needed:** whether the overlay values are positioned on the devices in the image or in a fixed band (MON-OD-07).
- ℹ️ The exploration (§12.1) draws a synthetic room, labeled "Synthetic feed", and offers both overlay placements behind a switch: a band along the bottom, grouped Monitor / Pump / Ventilator, or a tag on each device that moves with the camera preset (Bed, Monitor, Door). The session shows "In camera" with its duration. Audio starts muted and the clinician presses Talk.

---

## 7. Escalation

### MON-040 — Escalation paths

| Path | Who | What travels with it |
|---|---|---|
| **To the intensivist** | RN or APP | Patient, alert(s), evidence snapshot, note |
| **To the bedside team** | Any clinician | Message to the hospital's bedside nurse through Care Coordination (Spec §5.3), with the patient and alert |
| **To intervention** | Intensivist or APP | Opens Order Entry or Documentation with the patient and alert in context (Spec §5.2 "Escalation pathway to intervention loop") |

- An escalated alert shows "Escalated to {name}" with time and stays visible until resolved (PRD PC-071).
- ⚠️ **Decision needed:** escalation targets per role and per hospital, and acknowledgment expectations for the receiver (MON-OD-08).
- ℹ️ The exploration (§12.1) escalates from a dialog. Send to: the intensivist on call, the unit's charge nurse (through Messages), or Start intervention, which is disabled for an RN. Then the alerts to attach (the one it was opened from is checked), an **evidence snapshot** (primary numerics, drips and vent settings at that moment) and an optional note.

### MON-041 — Clinician Intuition Alert

From any card or the Focus view, "Raise concern" opens a short form: rationale (required), watch-list category, what to monitor, suggested timeline. It joins the queue as a Manual alert and carries over at handoff (Spec §5.6).

- ⚠️ **Decision needed:** a concern's severity. The queue orders by severity, but the Specification doesn't give Clinician Intuition Alerts one. The exploration offers Medium (default) or High (MON-OD-13).
- ℹ️ In the exploration, a concern's queue row reads "Clinician concern", quotes the rationale, names who raised it and when, and never goes Overdue. A concern carried over from the last shift says so.

---

## 8. Data freshness and degraded states

### MON-050 — Freshness

Each value follows the Patient card freshness model (PRD PC-090–092): Current, Stale, Unavailable, Reconnecting, Partial, Invalid. Stale values keep their last reading, dimmed, with "18 min ago"; missing values show "--", never zero or normal (Spec §9.1 Principle 12).

### MON-051 — Page states

| State | What the clinician sees |
|---|---|
| **Loading** | Card skeletons in the panel's last layout; the queue shows "Loading alerts" |
| **Empty panel** | EmptyState: "No patients being monitored" / "Patients you're monitoring will appear here, with their live vitals and trends." (as in the prototype today) |
| **No matches** | EmptyState with Clear filters (as on the Census) |
| **Empty queue** | "No active alerts" in the rail, with the time of the last alert |
| **Feed stale (one patient)** | That card's values marked Stale; a connectivity alert in its alert slot (PRD PC-128) |
| **Parameter not reporting** | The value shows "--" and a System alert names it ("SpO₂ not reporting") in the queue and the card's alert pill. This replaces a "Data gap" filter (MON-010). ⚠️ **Decision needed:** its severity; the sample uses Medium for a missing SpO₂ and Low for a missing RR |
| **Hospital feed down** | A banner on that hospital's tab and section: "{Hospital} data is delayed · last update 14:02"; other hospitals unaffected |
| **Offline** | The header's Online pill turns Offline; all values marked Stale; actions that need the network are disabled with a reason |
| **Restricted** | Patients the clinician isn't privileged for at a hospital don't appear; a count notes "3 patients hidden by privileges" (⚠️ MON-OD-02) |

⚠️ **Gap:** the AppHeader has no offline state in Figma yet (DESIGN.md "AppHeader").

---

## 9. Real-time behavior and motion

| Event | Motion (MOTION.md) |
|---|---|
| New alert in queue | Reveal at its position |
| Alert resolved | Dismiss (fade), rows below glide up |
| Card added to / removed from panel | Reveal / fade, others glide (as the Census filters do today) |
| Value update | No motion; the number changes in place |
| Panel reorder | Glide, only after the clinician accepts it (MON-013) |
| Connection live | The Online dot's Live pulse (AppHeader) |

Under reduced motion, every one of these is instant or opacity-only. Nothing flashes or blinks (WCAG 2.3.1).

---

## 10. Multi-tenant and authorization

| Requirement | Detail |
|---|---|
| **MON-060 Tenant isolation** | Patient data never crosses hospital tenants (brief ground rule). The panel combines hospitals only within the clinician's tenant coverage. |
| **MON-061 Privilege filtering** | Per-hospital privileges decide which patients appear and which actions are available (Spec §5.2). |
| **MON-062 Provenance** | Every value and alert shows its source on demand: device, vendor feed (Ceiba, eCareManager), EMR, agent or clinician (Spec §9.1 Principle 6). |
| **MON-063 Sanctioned integration story** | Nothing on this page may depict screen-operated extraction or overlay fallback paths in material Intercept shows externally (brief ground rule). |

---

## 11. Accessibility

WCAG 2.1 AA (Spec §9.1 Principle 13).

- **Keyboard:** the panel, queue and focus view are reachable and operable by keyboard; ↑/↓ step through patients in the focus view; the queue's actions have shortcuts. Focus rings show for keyboard focus only (as Tabs does).
- **Screen readers:** new Critical and High alerts are announced politely once (an `aria-live` region), never re-announced on value updates; live vitals are not live regions.
- **Color is never the only signal:** severity, acuity and range always carry words or glyphs (PRD PC-160).
- **Motion:** respects reduced motion (§9).

---

## 12. Prototype requirements

| Requirement | Detail |
|---|---|
| **MON-080 Synthetic data** | All patients, vitals, alerts and camera imagery are synthetic (brief). Names follow the US sample set used on the Census. |
| **MON-081 Simulator** | The real-time data simulator streams vitals and fires alerts so a deterioration scenario runs end to end: values drift, acuity rises, an alert enters the queue, the clinician looks in and escalates. |
| **MON-082 Scenarios** | ⚠️ **Decision needed:** which of the ~6 demo scenarios run on this page (MON-OD-09). Candidates: deterioration to escalation, sepsis candidate review, vent-order mismatch, intuition alert carried through handoff, hospital feed down. |
| **MON-083 Reuse** | Built from existing UCL components: Sidebar, AppHeader, Tabs, Select, Switch, Badge chips, PatientCard (expanded), HospitalSectionHeader, EmptyState, Counter. New components (queue row, focus sheet, trend chart, camera frame) go through `ucl-generate-component` from intercept.ds. |
| **MON-084 Monitoring card** | A draft `PatientMonitoringCard` (UCL `cards/patient-monitoring-card`, intercept.ds `1125:4328`) applies §3.3: condensed ECG strip + HR · SpO₂ · BP · RR, expandable to a four-lane monitor with limits and alarm marking, on a draft parameter palette (MON-OD-10). |

### 12.1 Exploration (Oct 27, 2026)

An interactive page covering this whole PRD: [Intercept Live Monitoring](https://claude.ai/artifact/HtZYre6XUQ3vHannnT1nJm). It's a standalone claude.ai artifact on synthetic data (the Census's 14 patients from `sample-monitoring.ts`) and Intercept's `theme.css` tokens. It imitates the UCL components; it doesn't use them. The UCL layout (`src/layouts/intercept-live/monitoring/`) has the patient panel and, since Oct 27, 2026, the triage queue (MON-020–MON-023, `triage-queue.tsx`); the focus view, camera and simulator are only in the exploration. The exploration proposes the rest for review; nothing in it is decided.

| Area | What the exploration shows | Requirements |
|---|---|---|
| **Shell** | Sidebar rail with Monitoring active, sticky header (clock, Online pill, messages, theme, team, user). Below 1280px the triage queue becomes a drawer opened from the header, with its active count. | §3.1 |
| **Page header** | Hospital tabs with counts (a warning icon on a hospital whose feed is down), Alerts only and My Patients, the summary ("14 patients · 8 active alerts") and a privilege note ("2 patients at Mercy West Hospital hidden by your privileges"). | §3.1, MON-010, MON-051, MON-OD-02 |
| **Filters** | The Census's quick views tuned for monitoring (All Patients, Needs attention, Outside limits, Rising score, Organ support, Data gap), Unit, Sort by (Alert, Score, Score change, Name, Location; Location groups by hospital). | MON-010, MON-013, MON-AC-11 |
| **Density** | Comfortable, Compact and List side by side. List shows the vitals as columns, in the parameter colors. | MON-012 |
| **View options** | Card monitor: ECG strip or 1 h trends (a sparkline under each numeric; in full monitors, a trend line per lane). Full monitors (Comfortable only). Mark values outside limits: off by default, as in UCL; on, a small ↑/↓ tag beside the number that keeps the parameter color. | MON-014, MON-073, MON-OD-12 |
| **Panel cards** | `PatientMonitoringCard` imitated: identity, alert pill, location, live monitor with waveforms ported from UCL. Alert ring pulses until the card is opened or the alert is addressed. Stale cards dim their numbers and freeze their waveforms, with a "Stale" tag. | MON-011, MON-014, MON-050 |
| **Reorder** | Cards keep their place when alerts change; a "Panel order changed" bar offers Update order. | MON-013, MON-AC-08 |
| **Triage queue** | Right rail, collapsible, Active and Resolved tabs. Rows: severity pill, title, age, patient, source chip (AI · agent name, Device · Monitor, Rule · Hemodynamics, Clinician concern), Overdue, "Carried over from night shift". AI rows have a dashed border, a "Recommendation" line and Show evidence. | MON-020, MON-021, MON-023 |
| **Queue actions** | Open (focus view scrolled to that alert), Acknowledge, Escalate, Resolve with a required reason (Treated, Artifact or false alarm, Expected for this patient, Duplicate) and an optional note. AI rows Decline instead of Resolve, with an optional rationale, recorded as "Declined with rationale". Every state shows who and when. New rows reveal at their position, resolved rows fade and the rest glide. New Critical and High alerts are announced once. | MON-022, MON-023, MON-AC-02–MON-AC-04, MON-AC-09, §9, §11 |
| **Empty queue** | "No active alerts · Last alert at 14:22". | MON-051 |
| **Focus view** | Side sheet over the queue; the panel stays live. Header: name, alert pill, MRN, location, acuity ("Critical · SOFA 13"), 24 h change, code status, tags. Actions: Look in, Message bedside team, Escalate, Raise concern, Open chart. ↑/↓ steps through the panel's order, Esc closes and returns focus to the card. | MON-030, MON-AC-05 |
| **Focus sections** | Monitor (four lanes, numerics with limits, MAP, then Temp and EtCO₂), Trends (1 h / 6 h / 24 h; ABP as a systolic–diastolic band; out-of-limit zones in a neutral wash, not a severity color), Respiratory labeled Ventilator (the PEEP-versus-order mismatch marked), Infusions labeled Pump, the patient's alerts. | MON-030, MON-071, MON-074, MON-AC-15 |
| **Camera** | See MON-031. | MON-031, MON-OD-07 |
| **Escalation** | See MON-040. | MON-040, MON-OD-08 |
| **Raise concern** | Rationale (required), category, recheck in, what to watch, priority (Medium or High). Joins the queue at once. | MON-041, MON-OD-13 |
| **Degraded states** | Hospital feed down (banner on the page, the tab and the focus view; only that hospital's patients go stale), Offline (header pill turns Offline, everything stale, Acknowledge / Escalate / Resolve / Raise concern disabled with a reason, Look in disabled), missing values as "--", no filters matched with Clear filters. | MON-050, MON-051, MON-AC-06, MON-AC-07, MON-AC-12 |
| **Simulator** | Deterioration to escalation (Moore's MAP falls on rising norepinephrine, a Critical alert enters the queue, then a Sepsis Sniffer recommendation; the clinician opens her, looks in and escalates, with each step ticked off), CVMC feed down, Offline, pause, reset. Vitals update every 2 s and trends advance one minute per update. The panel's Open questions tab lists the proposals in §15. | MON-081, MON-082 |

What the exploration assumes beyond this PRD:

- ⚠️ **Overdue:** example response targets of Critical 5 min, High 15, Medium 30, Low 60. Clinician concerns never go Overdue (OD-15).
- ⚠️ **Parameter colors on light surfaces:** the monitor's green and teal don't reach contrast on white, so List and the focus view's trends use darker inks of the same hues, and the monitor colors in dark mode (MON-OD-10).
- ⚠️ **Escalation by role:** the signed-in user is a Critical Care RN, so Start intervention is disabled (MON-OD-08).
- ⚠️ **Concern priority:** Medium or High (MON-OD-13).
- ⚠️ **Trend limits:** the MAP 65 mmHg rule and the default alarm limits (HR 50–120, SpO₂ 90–100, systolic 90–160, RR 8–30) are examples, not configuration (PRD PC-044).

---

## 13. Acceptance criteria

| ID | Criterion |
|---|---|
| MON-AC-01 | With the panel open, a vital that crosses its range shows the range marker and color within one update cycle, without the card moving. |
| MON-AC-02 | A new Critical alert appears in the queue at its priority position and is announced once to screen readers. |
| MON-AC-03 | From a queue row, the clinician can open the patient, acknowledge, escalate and resolve; each action is shown on the alert with who and when. |
| MON-AC-04 | Acknowledging doesn't remove the alert; resolving requires a resolution and keeps it in history. |
| MON-AC-05 | The Focus view opens beside the live panel, steps between patients with ↑/↓, and closes with Escape. |
| MON-AC-06 | A stale value keeps its last reading, is labeled with its age and is never shown as normal. |
| MON-AC-07 | A hospital feed outage marks only that hospital's patients and says when data last arrived. |
| MON-AC-08 | Cards never reorder while the clinician is interacting; a pending reorder is offered, not forced. |
| MON-AC-09 | AI-sourced alerts show their agent and evidence; declining one records "declined with rationale". |
| MON-AC-10 | Every interaction works by keyboard, and with reduced motion on. |
| MON-AC-11 | The scope filters (hospital tabs, My Patients, Unit) and Sort by behave as on the Census, with the same labels. Monitoring has no status filters (MON-010). |
| MON-AC-12 | Empty panel, no matches and empty queue each show their empty state. |
| MON-AC-13 | Every parameter keeps the same color and label on every card, waveform and trend, and no parameter color matches a severity color. |
| MON-AC-14 | HR, SpO₂, BP and RR are readable at a glance from normal viewing distance, ahead of every secondary value. |
| MON-AC-15 | Every ventilator and pump value is labeled with its source and visually separate from monitored vitals. |
| MON-AC-16 | Waveform labels and numerics sit at the same positions for every patient. |

---

## 14. Dependencies

| Dependency | Needed for |
|---|---|
| Telemetry Ingestion (Spec §6.6) | Live vitals, vent and pump values |
| Patient Data Aggregation (Spec §6.5) | Patient identity, acuity, context |
| Clinical Alerting & Events (Spec §5.6) | Alert taxonomy, lifecycle, audit |
| Care Coordination & Telepresence (Spec §5.3) | Camera sessions, bedside messaging, presence |
| Sepsis Sniffer, Vent-Order Mismatch Agent (Spec §8.1, §8.3) | AI alerts and evidence |
| PRD — Patient card | Card content, states and freshness model |
| UCL (this repo) | Components listed in MON-083; new components from intercept.ds |

---

## 15. Open decisions

The **Exploration proposal** column is what the Oct 27, 2026 exploration (§12.1) shows for review. None of it is decided.

| ID | Decision | Owner | Exploration proposal |
|---|---|---|---|
| MON-OD-01 | How a panel is defined (shift assignment, watch list or both) and whether clinicians can add patients to it. | Product / Clinical | Not explored: the panel is every patient across the three hospitals, narrowed by My Patients. |
| MON-OD-02 | How privilege-hidden patients are indicated, if at all. | Product / Compliance | A quiet count under the summary, with no names: "2 patients at Mercy West Hospital hidden by your privileges". |
| MON-OD-03 | Whether the Alert Queue page and Monitoring's triage queue both exist in v1. | Product | A panel-scoped rail here; the Sidebar's Alert Queue stays the full surface. |
| MON-OD-04 | Which panel densities ship in v1 (Comfortable, Compact, List). | Design / Clinical | All three, as a segmented control next to Sort by. |
| MON-OD-05 | Auto-reorder rules for the panel when alerts change priority. | Clinical / Design | Never automatic: the "Panel order changed" bar with Update order. No idle auto-update. |
| MON-OD-06 | Focus view as a side sheet or a full page. | Design | Side sheet over the triage queue; the panel stays live to its left. |
| MON-OD-07 | Placement of the telemetry overlay on the camera feed. | Design / Clinical | Both, behind a switch: a fixed band, or tags on the devices that follow the camera preset. |
| MON-OD-08 | Escalation targets per role and hospital, and receiver acknowledgment expectations. | Clinical / Product | Intensivist on call, or the unit's charge nurse through Messages. Start intervention disabled for an RN. Receiver acknowledgment not shown. |
| MON-OD-09 | Which demo scenarios run on this page. | Product / Project | Deterioration to escalation, hospital feed down and offline. |
| MON-OD-10 | The parameter color palette (one color per parameter, none in the severity hues), validated for contrast in both modes and for color-vision deficiency. | Design / Clinical | UCL's draft monitor palette on the monitor, plus darker inks of the same hues for light surfaces (List, trends). Not yet checked for contrast or color-vision deficiency. |
| MON-OD-11 | The default waveform set and order per bed type (ventilated, cardiac, general ICU), and which ones a clinician can add or hide. | Clinical / Design | One set for every bed: II, Pleth, ABP, Resp. |
| MON-OD-12 | Whether panel cards show a mini waveform, or numerics and trends only (density vs. clarity across a full panel). | Design / Clinical | Both, behind View → Card monitor: the ECG strip (default) or a 1 h sparkline under each numeric. |
| MON-OD-13 | A Clinician Intuition Alert's severity, which sets its place in the queue (MON-041). | Clinical / Product | The clinician picks Medium (default) or High. Concerns never go Overdue. |
| PRD OD-05, OD-06, OD-07, OD-15, OD-16 | Alert severity and ordering, freshness intervals, trend windows, alert source and Overdue, code status. Shared with the Patient card PRD. | See `prds/patient-card.md` §23 | Severity, then oldest first. Trend windows 1 h / 6 h / 24 h. Overdue at 5 / 15 / 30 / 60 min by severity. Code status as a chip in the focus view ("Full code", "DNR"). |

---

## 16. Out of scope

| Item | Why |
|---|---|
| Order entry and documentation | Their own modules; Monitoring only opens them in context |
| Production telemetry, camera and device integration | Deferred to the next phase (brief) |
| Deterioration Predictor alerts in the prototype | Roadmap, gated on FDA SaMD clearance (Spec §8.4); may appear as a labeled roadmap preview only |
| Mobile companion | Notifications and urgent acknowledgments only (Spec §9.3) |
| Screen-operated extraction paths | Not shown externally (brief ground rule) |
| Reproducing a bedside monitor's interface | The references in §1.3 inform conventions only; no device's layout, visual identity or alarm behavior is copied |

---

## 17. Definition of done

- Clinical and product leadership have reviewed this PRD and closed or scheduled every SV-OD item.
- The page is designed in intercept.ds / Intercept-Live and built in the prototype from UCL components.
- The agreed scenarios run end to end on the real-time data simulator.
- Acceptance criteria MON-AC-01 to MON-AC-12 pass in the prototype.
- New terms are in `prds/glossary.md`.

---

## ID mapping (Oct 28, 2026)

The repo-local PRD IDs were renamespaced off the Cowork `SV-` prefix, so an ID like `SV-010` no longer collides with the Requirements-Spec IDs `SV-01`…`SV-14`. Cowork requirement IDs (`SV-01`…`SV-14`, `PD-`, `AL-`, `CC-`, …) are unchanged.

| Old ID | New ID |
|---|---|
| `SV-0xx` (e.g. `SV-010`) | `MON-0xx` (`MON-010`) |
| `SV-OD-xx` | `MON-OD-xx` |
| `SV-UC-xx` | `MON-UC-xx` |
| `AC-xx` | `MON-AC-xx` |

Not renamed: the shared Patient-card open-decision IDs (`OD-01`…`OD-17`, defined in `prds/patient-card.md`) keep their names.
