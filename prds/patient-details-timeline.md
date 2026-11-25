---
requirements: [PD-06, SV-02, SV-03, SV-04, SV-08, CC-09]
status: proposed — confirm with Carlos
---

<!--
Created: Nov 25, 2026
Created by: Julio Caunedo
Last updated: Nov 25, 2026
Latest update: the acceptance criteria and open questions are numbered PDT-AC-01 and PDT-OD-01 on, each one moved from Patient details noting its old ID, so they can be cited without clashing with other tabs. Why: each tab gets its own ID prefix (user's call).
Recent updates: Created the same day from Patient details §6, so each tab has its own PRD.
Scope: The Timeline tab of Patient details in Intercept Live (`TimelineSection`, src/layouts/intercept-live/patient-details/sections/timeline-section.tsx): monitor, pump, ventilator, oxygen, other support and lab lanes and the events between them on one time axis, the Previous and Now columns, the time windows, scrolling through time, the crosshair, the filter bar and the table view. Moved out of PRD Patient details §6 (PD-030 to PD-032).
Purpose: One place for what the Timeline shows and does, so "what is it now" and "what changed, and why" stay answered on one tab and its decisions aren't reopened.
-->

# Patient details — Timeline

**Location:** Intercept Live › a patient's page (Patient details), the **Timeline** tab, right after Overview. An older link to the Vitals tab opens it. Medications' **Pump values** opens it too  
**Audience:** Intensivists, APPs and Critical Care RNs  
**Description:** The patient's vitals, infusions, ventilator and oxygen settings, labs and events on one time axis, with each lane's value earlier and now, so cause and effect line up.  
**Source:** `src/layouts/intercept-live/patient-details/sections/timeline-section.tsx` (`TimelineSection`); its events from the activity log and the patient's alerts (`withActivityEvents` in `patient-details/activity.tsx`, `withAlertEvents` in `shared/live-feed-entries.ts`); rendered by `patient-details.tsx` (`sectionContent`); the latest-value tiles for a record without a timeline in `sections/vitals-section.tsx` (`LatestVitals`)  
**Figma:** Intercept-Live › Timeline (`311:8791`); Timeline option 2 (`316:16920`); the compared mockups A (`310:7329`) and B (`310:7992`), and the screen as built then (`307:7009`)  
**Status:** Draft — built in the prototype, pending clinical and product validation  
**Last updated:** November 25, 2026

---

## Purpose

When a patient changes, the clinician needs to see why: did MAP fall after the propofol went up, did the lactate climb before or after the fluids. The Timeline puts every stream of data on one time axis, so the relationship is visible instead of reconstructed, and ends each lane in its value now, so the same tab answers "what is it now" and "what changed, and why".

ℹ️ Related specs: the page (header, tabs, panels, freshness, page states, accessibility) is in [patient-details.md](patient-details.md); the Overview, whose activity log moved here, in [patient-details-overview.md](patient-details-overview.md); the live bedside monitor in [patient-monitor.md](patient-monitor.md); a lab's own trend chart in [patient-details.md](patient-details.md), "Labs".

## Vitals and Timeline are one tab

✅ **Resolved:** **Vitals and Timeline are one tab, Timeline**, right after Overview. ~~At the top, the latest value of each vital sign (live from the monitor when there is one, its source, its age, dimmed when stale, a mark when outside its limits, its last 6 h); under it the time axis below.~~ ✅ **Resolved:** the latest values are the timeline's last two columns, **Previous** and **Now** (see "Previous and Now" below). The chart opens on **12 h**, and its ~~**Show as table**~~ table view (the filter bar's Chart / Table toggle) is the hourly flowsheet, for every lane, not only vitals. EtCO₂ has its own lane when the patient has it.

Why the merge: the Vitals tab's trends and flowsheet repeated the Timeline's monitor lanes and table; what only Vitals had was the latest-value row. One tab serves both "what is it now" and "what changed, and why". An older link to the Vitals tab opens the Timeline.

✅ **Resolved:** **blood glucose** is there too (the clinical advisor's request): ~~a tile with the latest value, where it came from~~ its Previous and Now values (the result's time under each), where it came from (a fingerstick by the bedside nurse, or the lab) and how old it is, outside 70–180 mg/dL marked, and a Glucose lane among the labs with each value printed. Checks follow the patient's care: hourly on an insulin infusion, every 6 h in the ICU or for a diabetic, every 12 h on the floor. 🙋 **Open question:** the target range per patient (the prototype uses 70–180 mg/dL for everyone; insulin protocols often target 140–180).

## PD-030 — One time axis

Lanes share one time axis so cause and effect line up:

| Lane group | Lanes (default) |
|---|---|
| **Monitor** | HR, SpO₂, BP (systolic–diastolic band with MAP), RR, temperature |
| **Pump** | Each continuous infusion's rate |
| **Ventilator** | FiO₂, PEEP, mode changes |
| **Labs** | Lactate, creatinine and others, as dots with their values |
| **Events** | Alerts, interventions, notes signed, ADT events, camera sessions |

- ✅ **Resolved:** the chart reads as a table ([Intercept-Live › Timeline](https://www.figma.com/design/EKg9ovtsHlQoK3DAS0F5IM/Intercept-Live?node-id=311-8791)): a head row with "Last 12 h" and one column per tick interval, named by its start ("10 PM", the date over a new day's first), then the **Events** lane, then each group's lanes under its heading (Monitoring, Pump, Ventilator, Oxygen, Other support, Labs), each lane's name and unit on its left and its Previous and Now values on its right.
- ✅ **Resolved:** each lane's plot agrees with the values beside it. A monitor reading the bedside monitor streams (HR, SpO₂, MAP, RR) runs on to now and ends at the live value Now shows; a pump rate or ventilator setting holds until it changes, so it runs to now as Now reads it, and ends where a record says it stopped; a charted or lab value ends at its last reading (Now marks it stale when it's old).
- What's new since the clinician last looked is shaded, from that moment to now (PD-023, [patient-details-overview.md](patient-details-overview.md)), and the legend names it "Since you last looked".
- Limits show as a band from configuration; out-of-limit stretches get a neutral wash, not a severity color (MON-073).
- A medication can be overlaid on any trend (Spec §8.7: "the lactate trend with the antibiotic timeline overlaid").
- The clinician can add, hide and reorder lanes; the defaults are restored with one action.
- ⚠️ **Discrepancy:** limits are drawn as dashed lines, with no out-of-limit wash; a value outside its limits is marked H or L in Previous and Now. No medication overlay is built, and lanes can only be narrowed with the filter bar (chips and search), not added, reordered or restored.

## Previous and Now

✅ **Resolved:** each lane ends in an earlier value beside its value now, to compare them:

- **Previous** is the value at the start of the chosen window, its head saying that moment under the word ("Previous · 4:45 PM" with 1 h at 5:45 PM). ✅ **Resolved:** a lab or charted value shows the result current then, with the time it was taken, so it can be the same result as Now when nothing newer came in.
- **Now** is always now, its head showing the current time under the word, updated each minute: live from the monitor for HR, SpO₂, MAP and RR; dimmed with its time when stale; H or L when outside its limits. ✅ **Resolved:** hovering never changes it, so the hovered value compares with now.
- ✅ **Resolved:** the Previous and Now heads are semibold, their times under them regular, so the two columns read as headings over the values.

~~🙋 **Open question:** where the latest values sit (PDT-OD-01).~~ ✅ **Resolved:** B, the right column, as two columns: **Previous** (on a subtle fill: the value at the window's start, ~~or nothing at the crosshair~~ ✅ **Resolved:** or at the crosshair while it's on, its header then the crosshair's time) and **Now** (always the value now; ~~the crosshair's value while it's on~~ ✅ **Resolved:** hovering never changes it, so the hovered value compares with now) ([Intercept-Live › Timeline](https://www.figma.com/design/EKg9ovtsHlQoK3DAS0F5IM/Intercept-Live?node-id=311-8791)). The Latest values tiles are gone from the tab; they stay only for a record with vitals and no timeline. The two mockups that were compared, on Intercept-Live › Timeline, beside the screen as built then ([as built](https://www.figma.com/design/EKg9ovtsHlQoK3DAS0F5IM/Intercept-Live?node-id=307-7009)):

| Option | Layout | For | Against |
|---|---|---|---|
| **A · On top** ([Figma](https://www.figma.com/design/EKg9ovtsHlQoK3DAS0F5IM/Intercept-Live?node-id=310-7329)) | The Latest values card above the timeline, as built: a tile per vital with its sparkline, source and age | The six vitals together, readable at a glance before the chart | Repeats each vital's value in the timeline's right column; pushes the chart down by about 220px |
| **B · Right column** ([Figma](https://www.figma.com/design/EKg9ovtsHlQoK3DAS0F5IM/Intercept-Live?node-id=310-7992)) | No card: the timeline's right column widens to 200px and becomes the latest values, each lane's value larger, with its unit, a Live dot or its source and age, on its trend's row | A value and its history on one line; nothing shown twice; every lane's latest (pumps, oxygen, labs), not only the vitals; the chart starts higher | The plot loses 80px of width; no sparklines (the lane is the trend); the vitals aren't grouped apart from the rest |

ℹ️ Previous no longer has a fill of its own, so a lane's hover shows across the whole row; that's DESIGN.md's.

🙋 **Open question:** Previous and Now right of the plot (built, the default) or left of it, between each lane's name and its plot ([Timeline option 2](https://www.figma.com/design/EKg9ovtsHlQoK3DAS0F5IM/Intercept-Live?node-id=316-16920), built as a prototype View: Prototype menu › Views › Timeline option 2) (PDT-OD-03). Left puts a lane's values next to its name, read before its history; right keeps them beside the latest data.

## The crosshair

A crosshair reads every lane at one moment, from the pointer over the chart or the arrow keys once the chart has focus; ~~values at the crosshair show at each lane's end~~ ✅ **Resolved:** its values show in each lane's Previous column, beside Now.

✅ **Resolved:** while the crosshair is on, Previous's head shows its time with how long ago it is under it ("2:59 AM", then "~1.5 h ago"): minutes under an hour ("~25 min ago"), then hours to the nearest half hour, then days ("~2 d ago"). Now still shows the clock's time under its word.

## Time windows

- ~~Windows: 1 h, 6 h, 24 h, 72 h, whole stay. ⚠️ **Decision needed:** windows and default (PRD OD-07); the exploration defaults to 24 h.~~ ~~✅ **Resolved:** windows **6 h · 12 h · 24 h**, opening on 12 h (built).~~ ✅ **Resolved:** windows **15 m · 30 m · 1 h · 6 h · 12 h · 24 h**, opening on 12 h (built).
- ✅ **Resolved:** finer windows for the ICU, **15 min · 30 min · 1 h**, before the others: **15 min · 30 min · 1 h · 6 h · 12 h · 24 h**, to follow a fast change minute by minute (a pressor titration, a desaturation, a rhythm change). They show when the lanes have minute-level monitor data, as an ICU patient's do; without it the row starts at 6 h. Hour ticks become 5 min ticks (15 and 30 min) and 10 min ticks (1 h); the table alternative lists every minute, 2 min and 5 min; the crosshair's arrow keys step a minute. 12 h stays the default. ✅ **Resolved:** built, with 5 min columns for 15 and 30 min and 10 min columns for 1 h; the table lists every minute (15 min) or every 5 min (30 min, 1 h).
- ⚠️ **Not built:** the windows show for every patient; hiding them without minute-level data waits on PDT-OD-02.
- ⚠️ **Gap:** the prototype's monitor lanes have a reading about every 10 minutes, too coarse for 15 min; the fine windows need the monitor's minute (or finer) data. 🙋 **Open question:** PDT-OD-02.

## Scrolling through time

✅ **Resolved:** the timeline scrolls through time, chart and table alike: a sideways swipe on a trackpad (or Shift and the mouse wheel) over the chart's plot or over the table moves the window back and forth, from the patient's first reading up to now; scrolling up and down still scrolls the page, and on a table wider than the screen its own sideways scroll comes first. Scrolled back, the chart's corner says the window's span ("10:05 – 11:05 AM") and a solid **Now** button appears before the time window choice, which brings the view back to now; Now (the column) always reads now, and Previous, the events and the table follow the window. Moving the crosshair past the window's edge with the arrow keys scrolls it too.

- The span names its date once when both ends share a day ("Nov 24, 2:40 AM – 2:40 PM"), none when that day is today, and each end's date across midnight.

## Filters and the table view

- ✅ **Resolved:** a **filter bar** over the chart: search (lanes by name or group, events by what happened), a chip per lane group the patient has (Monitor, Pump, Ventilator, Oxygen, Other support, Labs; picking one or more shows only theirs), ~~**All events** (one kind of event at a time),~~ the window, and Chart / Table. ✅ **Resolved:** no events menu; every kind of event shows, and the search narrows them.
- The table view is the chart's table alternative: every lane's values per interval, newest first ("Values every 1 hour, newest first. Lab results show in the interval they resulted in."), then the window's events with their kind or severity. It follows the window, the filters and the scrolling as the chart does.

## Events

✅ **Resolved:** **events are markers you can tell apart without color**: a letter on its kind's color, **C** care event, **D** drip change, **V** ventilator change, **L** lab result, **N** note; an **alert** is Monitoring's alert badge, the bell in its severity's color (Critical, High, Medium, Low; green at its resolution, when it was resolved). ~~The All events menu is their key.~~ ✅ **Resolved:** the legend under the chart is their key, listing the kinds the patient's timeline has, then Limit, Since you last looked (when shown) and "Gaps in a line mean no data."

- Each marker names itself in a tooltip ("4:02 AM · Lab result: Lactate 4.1"); markers that would overlap sit side by side, and ~~past two events in a run the rest fold into a count ("3") listing them~~ ✅ **Resolved:** when more than two would overlap, they become one **cluster**, a neutral marker showing how many events it holds ("4"), its tooltip listing them. Alerts never fold.
- **An open alert's bell opens the alert** in the alert modal; a resolved alert's doesn't, as in the Live feed.
- The patient's alerts come from their alert list (live, resolved and history), so each shows once, with its severity.
- The events lane shows the page's activity (the Overview's former log): alerts as alerts, notes as notes, the rest as care events ([patient-details-overview.md](patient-details-overview.md), "Care plan and activity"). The axis ends at the newest data when it's newer than the clock's last minute.

## PD-031 — Gaps and quality

A period with no data is drawn as a gap, never interpolated. A value marked Invalid (PC-090) is drawn hollow with its reason. A device change is marked on its lane.

⚠️ **Discrepancy:** gaps are drawn as gaps; no value is drawn hollow as Invalid, and device changes aren't marked.

## PD-032 — Provenance per point

Any point opens its value, unit, observation time, ingestion time and source ("Monitor · Philips via Ceiba", "Lab · Epic") (PC-092, Spec §9.1, Principle 6).

⚠️ **Discrepancy:** not built: a point doesn't open; each lane knows its source, but the chart doesn't show it.

## Making it actionable

The page-wide rules (act where you read, every action reaches the app, by role: PD-160 to PD-162) are in [patient-details.md](patient-details.md), "3.2.1 Tab review: what each tab lets the clinician do".

**PD-164 — Timeline.** ⚠️ Partly built.

- **Today:** table view, the window, the crosshair, filters; an open alert's bell opens the alert.
- **Made actionable (proposed):** an event marker opens what it is (~~the alert,~~ the note, order or pathway; ✅ **Resolved:** an open alert's bell opens the alert, built). A lane's value opens its provenance (PD-032). An out-of-limit stretch can be **annotated** ("Artifact", "Repositioned", free text), marked on the lane and in the table. ~~Finer ICU windows (PD-030). Where the latest values sit (PDT-OD-01)~~ ✅ **Resolved:** finer windows and the Previous / Now columns, built.

## States

| State | What shows | What the clinician can do |
|---|---|---|
| No timeline, no vitals | The tab's empty state: "No timeline yet" | — |
| Vitals but no timeline | The latest-value tiles (live from the monitor when there is one, source, age, stale dimmed) | — |
| A timeline with no lanes | "No values recorded for this patient yet." | — |
| Nothing matches the filters | "No values match these filters." | Clear the search or the chips |
| A lane with no reading at a moment | Previous or Now empty for it; a gap on the plot | — |
| A stale latest value | Now dimmed, its time and "stale" under it | — |
| No events in the window (table) | "No events in this window." | Change the window or scroll |
| Scrolled back | The window's span in the corner, **Now** in the filter bar | **Now** returns to now |

Page states (loading, no access, feed down, offline) are the page's ([patient-details.md](patient-details.md), "PD-122 — Page states").

## Accessibility

The page's rules are in [patient-details.md](patient-details.md), "18. Accessibility" (←/→ move the crosshair and the values at it are announced; every chart has a table alternative).

- The chart is a focusable group named for how to use it ("Timeline chart. Left and right arrow keys read every lane at one moment, and past either edge scroll through time; Escape returns to now."), with a summary of each lane in the window (its range and latest value) and the number of events.
- Moving the crosshair announces every lane's value at that moment, once (`aria-live` polite).
- An open alert's bell is a button named for the alert ("… Open alert"); other markers are named in tooltips, and every event is in the table view.
- A value outside its limits says H or L, with "above limit" or "below limit" for screen readers; markers carry a letter or a bell, never color alone.
- The Previous and Now heads read their time after the word ("Previous, 4:45 PM").
- ⚠️ **Discrepancy:** the build also moves the crosshair six steps with Shift, to the window's edges with Home and End, and clears it with Escape; the PRD hasn't decided these keys.

## Acceptance Criteria

| ID | Criterion |
|---|---|
| PDT-AC-01 | Vitals, infusions, ventilator settings, labs and events share one time axis; the crosshair reads all lanes at one moment. (was PD-AC-07) |
| PDT-AC-02 | With an ICU patient's minute-level data, the Timeline offers 15 min, 30 min and 1 h before 6 h; without it, it starts at 6 h; 12 h stays the default. (was PD-AC-19) |
| PDT-AC-03 | Each lane ends in Previous (the value at the window's start, its moment in the head) and Now (the value now, the clock's time in the head); HR, SpO₂, MAP and RR show the monitor's live value in Now, and each plot ends where Now reads. |
| PDT-AC-04 | With the crosshair on, Previous shows each lane's value there, its head the crosshair's time with "~1.5 h ago" style age under it; Now doesn't change. |
| PDT-AC-05 | A sideways swipe over the plot or table moves the window back, no earlier than the first reading; the corner shows the span and **Now** returns to now; Now (the column) still reads now. |
| PDT-AC-06 | A lane group chip shows only its lanes; the search narrows lanes and events; with nothing matching, "No values match these filters." |
| PDT-AC-07 | Events show as C, D, V, L, N markers or a severity bell, named in a tooltip; more than two overlapping non-alert events become one cluster with their count; an open alert's bell opens the alert, a resolved one's doesn't. |
| PDT-AC-08 | The table view shows the same lanes, window and events as the chart. |
| PDT-AC-09 | An older link to the Vitals tab opens the Timeline. |

ℹ️ Page-wide criteria (gaps, stale and missing values, provenance on demand, keyboard and reduced motion: PD-AC-08, PD-AC-09, PD-AC-17) are in [patient-details.md](patient-details.md), "20. Acceptance criteria".

## Open Questions

| ID | Question |
|---|---|
| PDT-OD-01 | ~~🙋 Where the Timeline's latest values sit: A, a card on top (built), or B, the timeline's right column.~~ ✅ **Resolved:** B, as Previous and Now columns (built). Mockups on Intercept-Live › Timeline ([A](https://www.figma.com/design/EKg9ovtsHlQoK3DAS0F5IM/Intercept-Live?node-id=310-7329), [B](https://www.figma.com/design/EKg9ovtsHlQoK3DAS0F5IM/Intercept-Live?node-id=310-7992)). Owner: Design / Clinical. (was PD-OD-15) |
| PDT-OD-02 | 🙋 The finer windows (15 min, 30 min, 1 h): for ICU patients only, or any patient with minute-level monitor data; and the data resolution the monitor feed gives. Owner: Clinical / Integration. (was PD-OD-16) |
| PDT-OD-03 | 🙋 The Timeline's Previous and Now: right of the plot (built, the default) or left of it, beside each lane's name (Timeline option 2, a prototype View). Owner: Design / Clinical. [Option 2](https://www.figma.com/design/EKg9ovtsHlQoK3DAS0F5IM/Intercept-Live?node-id=316-16920), built behind Prototype › Views. (was PD-OD-19) |

- 🙋 The blood glucose target range per patient (70–180 mg/dL for everyone in the prototype; insulin protocols often target 140–180).
- 🙋 Who may annotate a value (PD-OD-18, page-wide, in [patient-details.md](patient-details.md), "22. Open decisions").

## Out of scope

- The patient header, tabs, panels, freshness and page states: [patient-details.md](patient-details.md).
- A single lab's trend with its reference range and baseline (Lab trends): [patient-details.md](patient-details.md), "Labs".
- The live waveforms: [patient-monitor.md](patient-monitor.md).
- The Overview and its cards: [patient-details-overview.md](patient-details-overview.md).
