---
requirements: [PD-05, PD-06]
status: proposed — confirm with Carlos (not yet in Trace Matrix v0.1)
---

<!--
Created: Nov 25, 2026
Created by: Julio Caunedo
Last updated: Nov 25, 2026
Latest update: the key lab tiles are toggles, several at once, the last one off restoring the earlier chart; Actual values can always be chosen (it keeps the first test) and picking a test never switches the mode; Lab trends' Actual values / Relative change switch moved above the card and its heading into it; it lost its Relative change notice and caption; its tests moved from a list beside the chart to a legend under it, each test a toggle, with Add test for any other test, and the plot is lower; the reference range and baseline always show; the criteria and open questions are numbered PDL-AC-01 and PDL-OD-01 on. Why: the chart gets the card's full width and the results stay close (user's call).
Recent updates: The ✅ tags and struck-through text were removed. A key lab tile opens its trend without scrolling the page, since Lab trends sits right under the tiles. The PRD was created the same day from Patient details §7, so each tab has its own PRD.
Scope: The Labs tab of Patient details in Intercept Live (`LabsSection`, `LabTrends`): the Labs summary, the key labs, Lab trends, the results by panel (PD-040) and microbiology (PD-041). Moved out of PRD Patient details §7.
Purpose: One place for what the Labs tab shows and does, so its order, Lab trends and the results' rules aren't reopened, and the page PRD keeps only the page.
-->

# Patient details — Labs

**Location:** Patient details › **Labs**, the third tab (after Overview and Timeline; `?tab=labs` in a shared link). A key lab tile on the Overview opens it on that lab's trend.
**Audience:** Intensivists, APPs and Critical Care RNs
**Description:** The patient's laboratory picture: an AI summary of the labs, the key labs, how the picked tests moved over time, then every result by panel and the cultures, from the hospital's record, read only.
**Source:** `src/layouts/intercept-live/patient-details/sections/labs-section.tsx` (`LabsSection`), `sections/lab-trends.tsx` (`LabTrends`); the Labs summary and key lab tiles are the Overview's `PatientBriefBanner` and `KeyLabTile` (`patient-overview.tsx`); the data shapes (`PatientChart`, `ChartResult`, `ChartCulture`) are in `sections/chart-section.tsx`; rendered by `patient-details.tsx` (`sectionContent`, case `labs`); samples in `patient-details/sample-data/` (`sample-chart.ts`, `sample-labs-brief.ts`, `sample-lab-trends.ts`)
**Figma:** Intercept-Live "Labs" (`320:9153`)
**Status:** Draft — built in the prototype, pending clinical and product validation
**Last updated:** November 25, 2026

---

## Purpose

When a clinician opens a patient's labs, they want to know where the labs stand, how they moved and why, before reading the full table: is the lactate still climbing, did the creatinine turn, what's still pending, has the culture grown anything. The tab answers in that order, top to bottom: a short AI summary, the key labs, their trends against the reference range and the clinical events, then every result and culture.

ℹ️ Related specs: the page, its header, its tabs and their order are in [patient-details.md](patient-details.md) ("3.2 Regions"); the key lab tiles are the Overview's ([patient-details-overview.md](patient-details-overview.md), "PD-025 — Key labs snapshot"); the AI summary's rules are the Overview brief's ([patient-details-overview.md](patient-details-overview.md), "PD-024 — AI summary"); how times, freshness and missing data read is [patient-details.md](patient-details.md), "PD-120 — Freshness"; problems, history, allergies, home medications and imaging reports are the Chart tab's ([patient-details-chart.md](patient-details-chart.md)); the hospital's record itself is the EMR tab's ([patient-details-emr.md](patient-details-emr.md)).

## What the tab holds

Labs holds results and microbiology only; problems, history, allergies, home medications and imaging reports moved to their own **Chart** tab, after Labs ([patient-details-chart.md](patient-details-chart.md); the tab order is in [patient-details.md](patient-details.md), "3.2 Regions").


The Labs tab opens, top to bottom, on:

1. **Labs summary** (see "Labs summary").
2. **Key labs** (see "Key labs").
3. **Lab trends** (see "Lab trends").
4. **Results** (PD-040) and **Microbiology** (PD-041).

The order goes from the conclusion to the evidence: the summary says where the labs stand, the key labs and their trends show it, and the results and cultures are the full record to check it against.

## Where the results come from

Each card on the Labs tab names its source **EMR** ("EMR · 12 min ago"), as the tab does, whatever the hospital's system, so every site's page reads the same. The system is named in the EMR tab ([patient-details-emr.md](patient-details-emr.md)).

Ranges come from the hospital's lab (Spec §7.11), never hard-coded. Everything on the tab is read only: the hospital's record is the source of truth.

## Labs summary

An AI summary of the labs alone: the Overview brief's banner ([patient-details-overview.md](patient-details-overview.md), "PD-024 — AI summary"), headed **Labs summary**, with how many sources it read and how fresh it is ("17 sources · 33 min ago").

- A click asks Ask Intercept Live what's behind it, about this patient. Clicked again while Ask Intercept Live is open about this patient, it closes the chat.
- **×** hides it until a newer summary or another patient.
- It follows PD-024's rules: marked as AI, cites its sources, retrieves and summarizes only, and says so where data is thin. It never diagnoses.
- With no labs, there's no summary.

The Labs summary restates where the labs stand and how they moved, never what they mean (no diagnosis, PD-024); Sarah Miller's sample ends on her values, with no "Overall…" reading.

## Key labs

The Overview's lab tiles ([patient-details-overview.md](patient-details-overview.md), "PD-025 — Key labs snapshot"), the same tiles in the same order: each lab's latest value, unit, flag, when it resulted, and how much it changed from the previous result ("▲ +0.5 · Was 2.2 at 2:43 AM"); a pending lab reads "Collected 7:23 AM".

On the Labs tab, each tile is a toggle that puts its lab on Lab trends, and several can be on at once. The first tile on charts its lab alone, over the shortest range that holds two of its results; each tile turned on after it joins the chart. A tile that's on keeps its ring. The chart is in Actual values while the labs on share a unit, in Relative change once they don't. Turning a tile off takes its lab off; turning the last one off puts back what Lab trends showed before the first. Changing the tests or the mode by hand lets go of the tiles: they turn off and the chart stays as it is. The page doesn't scroll: Lab trends sits right under the tiles. On the Overview, a tile opens the Labs tab with that lab alone, its tile on.

✅ **Resolved:** the key lab tiles are toggles, several at once, and turning the last one off restores the earlier chart. A lab Lab trends can't chart (no numeric result) stays a plain tile.

The tiles are shared with the Overview so the two never drift apart: a change to a tile is a change to PD-025.

## Lab trends

The Actual values / Relative change switch, the time range and **Expand** above the card, as the Timeline's time window sits above its chart, with the same distance from the key labs above it and from the card below it as every filter bar on Intercept Live's pages has from what it filters. Then one card: the heading **Lab trends** and its source, the chart across its width, a low plot so the results below stay close, and under it the legend of tests that drives it.

✅ **Resolved:** the switch between Actual values and Relative change sits above the card, and the heading inside it.

✅ **Resolved:** the tests are a legend under the chart, as in shadcn's charts, not a list beside it (Figma `320:9153` drew a column on the right), and the plot is lower.

### The chart

The chart shows the picked tests in one of two modes:

| Mode | When | What it draws |
| --- | --- | --- |
| **Actual values** | The picked tests share a unit and scale | The unit's axis, the reference range as a shaded band, the patient's documented baseline as a dashed line |
| **Relative change** | Any mix of tests | The change from each test's first result in the range, ((value − first) / first) × 100, around a 0% line |

- The mode is the clinician's. The chart opens in Actual values when the first pick shares a unit, in Relative change otherwise; after that, picking or hiding a test never switches it. No caption sits under the chart.
- Choosing **Actual values** while the chart holds tests with different units keeps the first one, and any that share its unit; the others are hidden.
- In Actual values, clicking a hidden test that shares the unit adds it; one with another unit takes the chart alone. Relative change takes any mix, up to six.
- Clinical events always show on the chart, with no control to hide them.
- In Actual values, the reference range and the baseline always show too, with no control to hide them.
- Time range: **24h · 48h · 7d · Encounter**.
- Only resulted numeric values are points; pending, cancelled and qualitative results never are. A point's flag is the lab's own, never worked out by Intercept. Relative change never starts from zero (or a negative value): a test whose first result can't be measured from is left off and named under the chart ("Not shown: …").
- Hovering a point, or stepping through the results with the arrow keys, shows its value, unit and flag, when it was collected, its change from the previous result, its change from the start in Relative change, the reference range, and a correction's note.

✅ **Resolved:** the Reference range and Baseline chips are gone; the band and the dashed line are always drawn.

✅ **Resolved:** Actual values is always available: choosing it keeps the first test, and the legend never switches the mode; a test with another unit replaces what Actual values shows.

✅ **Resolved:** the notice "Relative change: these tests have different units or scales." and the caption "Relative change from the first available measurement… not clinical severity, treatment effectiveness, or clinical improvement." are gone.

### The tests

- A legend under the chart lists the tests the patient's problems suggest (septic shock: lactate, WBC, procalcitonin…). Each is a toggle: clicking it shows or hides its line. A shown test carries its line's color and dash; a hidden one is muted.
- **Add test**, at the end of the legend, opens every test by panel, with search, in a popover. A test picked there, or opened from a key lab tile, joins the legend after the suggested ones. **Back to the suggested tests** shows the first pick again and takes the added tests out of the legend.
- Up to six at once, each keeping its color and dash while shown, so color is never the only way to tell them apart. At six, the hidden tests can't be turned on ("Up to 6 tests on the chart").
- Hovering a shown test in the legend, or its line, highlights it.

✅ **Resolved:** the tests are toggles in a legend, with Add test for the rest, so the chart takes the card's full width.

### Expand

**Expand** opens a larger view with the same tests, range, mode and legend, and adds separate aligned charts (one per test, in Actual values) and every result in a table (Collected, Test, Result, Change, Resulted), newest first.

⚠️ **Discrepancy:** built in the prototype and not yet decided (PDL-OD-05):

- The first pick is the three suggested tests, those with more than one result first; with no problem that suggests tests, the tests flagged now, furthest out of range first, under "Flagged now".
- The range opens on **Encounter** for a stay of up to seven days, on **7d** for a longer one.
- Add test's list says how many are on the chart ("3 of 6 on the chart"); at six, the rest are disabled. Each row says how many results it has in the range ("2 in range", "None in range") or that it's pending.
- Nothing picked: "Select laboratory tests to compare their trends over time." No numeric result at all: "No numeric results to chart yet."

⚠️ **Gap:** a result row can't open its trend yet. Lab trends can take a test from the Results table ("View trend", adding it to the chart and saying "Lactate added", or "6 at most: remove one to add Lactate"), but no row offers it (PD-165).

## Results

### PD-040 — Results

Grouped by panel (chemistry, hematology, blood gases, coagulation, cardiac, others), newest first: value, unit, reference range, flag, result time and the previous value with its direction.

- Over the table, how many results are abnormal, critical and pending ("15 abnormal · 1 critical · 1 pending"; "All results in range" when none is flagged), and an **Abnormal only** toggle that leaves out the results within range. Pending results and those with no result in the window stay, since they aren't known to be normal; a panel left with nothing drops out. Off when the tab opens.
- The result time is the panel's: its heading says when most of its results came back ("Chemistry · Resulted 10:06 AM"), and a result names its own time under its value only when it differs (a repeat lactate, a corrected value). No per-row Resulted column.
- The previous value is shown as the **change**: its direction, the difference and what it was, "▲ +1.9 from 2.2 · Yesterday 10:21 AM" (a time today, "Yesterday" and a time, else the date). The arrow and difference take the flag's color only when the value moved further out of its range (worse); back toward the range, or within it, they stay muted. Screen readers hear "Up 1.9, further out of range". A range in words ("Negative") never marks a change as worse.
- The value, its flag and its range sit side by side at any screen width; the change takes the remaining room.
- Flags use words and glyphs ("H", "L", "Critical"), not color alone (PC-160), in the same colors as the Overview's lab tiles (High and Low apart). Ranges come from the hospital's lab (Spec §7.11), never hard-coded.
- States: Ordered, Collected, Pending, Resulted, Corrected (with the original kept), Cancelled.
- A critical result is visually distinct and shows whether it was acknowledged in the hospital's system, when that is known.

⚠️ **Discrepancy:** on a narrow tab, the prototype hides the Range column, then the Change column; the rule above keeps the range beside the value at any width.

⚠️ **Discrepancy:** the prototype has Pending ("Pending · collected 7:23 AM"), Resulted and Corrected ("Corrected · first reported 4.8"), plus a state the list above doesn't name: **No result in 24 h** ("--" with those words), for a test with nothing in the window, kept by Abnormal only. Ordered, Collected and Cancelled aren't built, and a critical result doesn't show whether the hospital acknowledged it (the record doesn't carry it yet).

## Microbiology

### PD-041 — Microbiology

Cultures with source, collection time and status (No growth to date, Preliminary, Final), organism and susceptibilities when final. Positive cultures in the last 72 hours are also listed in the Overview's key labs.

- In the prototype, each culture is a row: the specimen, its status, the latest report (the organism, the summary in words, and once final, each antibiotic's S, I or R, Resistant marked), and when it was collected and last updated. A culture can also be **Pending**.
- ⚠️ **Discrepancy:** positive cultures aren't added to the Overview's key labs in the prototype; the key labs come from the record's list.

## Acting on what's here

| ID | Tab | Today | Made actionable (proposed) | Status |
|---|---|---|---|---|
| PD-165 | **Labs** | Read-only tables | A Critical result has **Acknowledge** (who and when). A test opens its trend (its Timeline lane). A resistant organism offers **Review antibiotics** (Medications filtered to antibiotics, or an order recommendation) | ⚠️ Not built |

A key lab tile opens its trend in Lab trends, on this tab and from the Overview (see "Key labs"); a test's own trend opens there, not on its Timeline lane. Acknowledge, a result row's trend and Review antibiotics are still to build.

ℹ️ The rules every tab action follows (act where you read, every action reaches the app, by role) are in [patient-details.md](patient-details.md), "3.2.1 Tab review: what each tab lets the clinician do"; who may acknowledge a critical result is PD-OD-18 there.

## States

| State | What shows | What the clinician can do |
|---|---|---|
| No lab data in the record | The tab's empty state: "No labs yet", "Results and microbiology from the hospital's record will appear here." | Nothing |
| No results in the window | Results: "No results in the last 72 hours." | Read the cultures |
| No cultures | Microbiology: "No cultures in the last 72 hours." | Read the results |
| Everything in range | "All results in range", no Abnormal only | Read the table |
| Results feed delayed | Every card's source says how old it is ("EMR · 2 h ago"); the page's banner says the hospital's data is delayed ([patient-details.md](patient-details.md), "PD-122 — Page states") | Check pending labs before acting on a trend |
| No numeric result to chart | Lab trends: "No numeric results to chart yet." | Read the results |

## Accessibility

- Flags carry a letter or word and a screen-reader word ("H", read "High"); a susceptibility's letter reads as its word ("Resistant"). Color is never the only signal.
- The change reads in words: "Up 1.9, further out of range".
- A key lab tile that opens its trend is a button named "{lab}, view trend".
- The Labs summary is named "AI labs summary"; while Ask Intercept Live is open about the patient, it reads "Close Ask Intercept Live".
- Lab trends: each test has a color and a dash; the chart is named by its tests and mode ("Lactate, WBC over time, relative change"); the left and right arrow keys step through its results (Home and End jump to the first and last) and Escape clears; each clinical event is a button named with its time; the count of tests on the chart is announced as it changes.
- ⚠️ **Accessibility:** the page's rule is a table alternative for every chart, one keystroke away ([patient-details.md](patient-details.md), "18. Accessibility"); Lab trends' table is only in Expand.
- The rest of the page's accessibility is in [patient-details.md](patient-details.md), "18. Accessibility".

## Acceptance Criteria

| ID | Criterion |
|---|---|
| PDL-AC-01 | The Labs tab shows, top to bottom: the Labs summary, the key labs, Lab trends, Results, then Microbiology. |
| PDL-AC-02 | The key labs are the Overview's tiles, in the same order with the same values. |
| PDL-AC-03 | On the Labs tab, a key lab tile toggles its lab on Lab trends, several at once: the first charts its lab alone over the shortest range that holds two of its results, the next ones join it, in Actual values while they share a unit, Relative change otherwise; a tile that's on is pressed; turning the last one off restores the chart from before. On the Overview, a tile opens the Labs tab with that lab alone. The page doesn't scroll. A lab with no numeric result isn't clickable. |
| PDL-AC-04 | Clicking the Labs summary opens Ask Intercept Live about the patient; clicking it again while that chat is open closes it. Its × hides it until a newer summary. |
| PDL-AC-05 | Lab trends opens in Actual values when its first pick shares a unit, in Relative change otherwise; picking or hiding a test never changes the mode. Choosing Actual values keeps the first test and those sharing its unit; in Actual values, a test with another unit takes the chart alone. Actual values shows the reference range and the baseline. |
| PDL-AC-06 | Lab trends never holds more than six tests; each keeps its color and dash while picked; clinical events always show; the tests are a legend of toggles under the chart, and Add test reaches any other test. |
| PDL-AC-07 | A pending or qualitative result is never a point on the chart; a test whose first result in the range is zero is named under the chart instead of drawn in Relative change. |
| PDL-AC-08 | Expand shows the same tests, range and mode, with separate charts on request and every result in a table. |
| PDL-AC-09 | Abnormal only keeps flagged, pending and missing results and drops a panel left empty; the summary line counts abnormal, critical and pending results. |
| PDL-AC-10 | A value that moved further out of range shows its change in the flag's color; one that moved back toward range shows it muted; a word range ("Negative") never colors it. |
| PDL-AC-11 | Every card on the tab names its source "EMR" with its age, whatever the hospital's system. |

## Open Questions

| ID | Question |
|---|---|
| PDL-OD-01 | 🙋 Which tests each kind of problem suggests for Lab trends' first pick (proposed, for clinical review). |
| PDL-OD-02 | 🙋 Whether six tests at most is right for Lab trends. |
| PDL-OD-03 | 🙋 Where a test's baseline comes from (the patient's documented baseline, an outpatient value, the admission value). |
| PDL-OD-04 | 🙋 Which clinical events belong on a lab chart. |
| PDL-OD-05 | 🙋 Whether the prototype's Lab trends details become rules: three tests at first (or the flagged ones), the range opening on Encounter or 7d, and the picker's counts. |
| PDL-OD-06 | 🙋 Whether a result row offers its trend (View trend in Lab trends), and whether positive cultures join the key labs automatically (PD-041). |

## Out of scope

- The page's header, tabs, panels, page states and audit: [patient-details.md](patient-details.md).
- Lab values on the shared time axis (the Labs lane group, glucose): the Timeline ([patient-details.md](patient-details.md), "6. Timeline").
- Problems, history, allergies, home medications and imaging reports: [patient-details-chart.md](patient-details-chart.md).
- What Intercept receives from the hospital's record and how fresh each feed is: [patient-details-emr.md](patient-details-emr.md).
- Ordering labs: Order Entry, through the header's Create menu ([patient-details.md](patient-details.md), "PD-014 — Header actions").
