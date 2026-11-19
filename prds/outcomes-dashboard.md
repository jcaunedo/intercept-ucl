---
requirements: [OBJ-7, SIM-14]
status: proposed — confirm with Intercept
---

<!--
Created: Nov 18, 2026
Created by: Julio Caunedo
Last updated: Nov 19, 2026
Scope: Intercept Live's Analytics page in the Clinical workspace, the outcomes dashboard (src/layouts/intercept-live/analytics/: AnalyticsPanel and its sample month): the metrics against the baseline, the payer and rurality breakdown, each hospital's share, the events it includes and the quarterly export. Source: Demo Use Cases, Scenario 6, steps 4 to 6.
Purpose: Records what the first layout does, so the team can confirm or change it, and lists what's still open.
-->

# PRD — Outcomes dashboard

**Product:** Intercept Live — Virtual Care OS  
**Module:** Reporting and outcomes  
**Surface:** the **Analytics** page, the Clinical Sidebar's reference group (Patients, Schedule, Analytics)  
**Audience:** Program leads and hospital leadership; intensivists, for their own patients' outcomes. ⚠️ **Decision needed:** which User Types the program leads and leadership are (Client Manager, or Hospital Administrator, who has no UI in v1)  
**Version:** 0.1  
**Status:** Draft — a first layout in the prototype, pending product validation with Intercept  
**Last updated:** November 19, 2026

---

## 1. Overview

The outcomes dashboard shows what the tele-ICU program changed: who got ICU-level care where they live and how fast, whether patients did better and stayed closer to home, and what the network didn't spend. It compares the pilot with the baseline before it, breaks every metric down by payer and by county rurality to show who benefited, and exports the quarterly DHHS report and the evidence pack for the next milestone payment in one click.

ℹ️ The demo closes on it (Scenario 6): a static synthetic month that includes the six scenarios, each of which wrote its events to the outcomes layer.

### 1.1 Product objectives

| Objective | What it means here |
|---|---|
| **The grant's criteria, measured** | Access, quality and affordability, each against the baseline (OBJ-7). |
| **Who benefited** | One toggle breaks every metric down by payer and by county rurality. |
| **Reporting without spreadsheets** | One click exports the quarterly report and the milestone evidence pack. |
| **Honest numbers** | Synthetic data says so in the export; only measured results from Intercept's existing service are real outcomes. |

### 1.2 Source documents

| Document | What this PRD takes from it |
|---|---|
| Demo Use Cases, Scenario 6 | Steps 4 to 6; capabilities: dashboard with baseline comparison (Mock, static synthetic month), payer and rurality stratification (Mock), quarterly report and milestone evidence export (Mock), live calculation from production data (Funded); the caution to label it "synthetic data" |
| Demo Use Cases, demo rules | Every patient carries a payer tag and a county rurality code; both feed reporting only, never the AI risk score; each scenario writes its events to the outcomes layer |
| Requirements Specification | OBJ-7, SIM-14 (run events to the outcomes layer), Patient scenario fields |

## 2. Users and use cases

| User | What they use it for |
|---|---|
| **Program lead, hospital leadership** | See the month's outcomes and who benefited. |
| **Grant reporting** | Export the quarterly DHHS report and the milestone evidence pack. |
| **Intensivist** | See their patients' outcomes counted (the scenario's last notice opens it). |

## 3. Anatomy

| Part | What it shows |
|---|---|
| **Breakdown bar** | Under the app header, as the Inbox's tab bar: **Overall**, **By payer**, **By rurality**; at its right, "Payer and rurality are for reporting only, never a score". |
| **Title** | "Outcomes", the period and the baseline, the source; **Export quarterly report** at the right. |
| **Headline tiles** | Four: median time from alert to intensivist, patients kept at their hospital, 30-day readmissions, transfer costs avoided. Each the pilot's value and its change from the baseline. |
| **Access, Quality, Affordability** | A table each. Overall: Baseline, Pilot, Change. By a breakdown: a column per group, each group's pilot value and its change from its own baseline. |
| **By hospital** | Overall only: each hospital's transfers kept, their cost avoided and the revenue it kept (the hub has none of the last). |
| **Events this month includes** | The demo's scenarios as each wrote its events: patient, scenario, hospital, what was written, payer. |

## 4. Requirements

### OUT-001 — The metrics

| Group | Metrics |
|---|---|
| **Access** | ICU-level coverage hours at spoke sites; median time from alert to intensivist |
| **Quality** | Patients kept at their hospital (transfers retained); sepsis bundle compliance; ICU-level length of stay; follow-up within 7 days of discharge; 30-day readmissions; mortality against benchmark (observed / expected) |
| **Affordability** | Transfer costs avoided; revenue kept by the spoke hospitals, and each hospital's share |

ℹ️ Follow-up within 7 days isn't in the scenario's list for the dashboard; it's one of Scenario 6's metrics written, so it's here too.

⚠️ **Risk:** the By hospital table puts the hospitals side by side, which the platform's hospital isolation rule rules out for clinical screens ("no cross-hospital comparisons", BR-09, DEC-05). The scenario asks for "revenue retained by each hospital"; confirm whether a network-level report may show it, and to whom (OUT-OD-04).

### OUT-002 — Against the baseline

Each metric shows the baseline, the pilot's value and the change. The change is signed in the metric's unit ("−41 min", "+27 pts"), with an arrow, green when it's better and red when it's worse, and the word read out; never color alone. A metric with nothing before the pilot says **New**.

⚠️ **Decision needed:** the baseline: the same month the year before (the prototype's), or a 12-month average before go-live.

### OUT-010 — By payer and by rurality

One toggle (Overall, By payer, By rurality) breaks every metric down. Payer groups: Medicare, Dual-eligible, Medicaid, Commercial, Uninsured. Rurality groups: the counties' rurality codes (RUCC). Each group's patient count shows above the tables. A metric that isn't a patient's (coverage hours, by payer) shows "—" and says why.

✅ **Resolved:** payer and rurality are for reporting only, never a score, and the page says so beside the toggle.

⚠️ **Gap:** the RUCC codes in the sample are illustrative; confirm each county's code and how they're grouped.

### OUT-020 — Synthetic data says so

~~While the month is synthetic, the title carries a **Synthetic data** badge and the export says "Built from synthetic data: not real outcomes".~~ ✅ **Resolved:** no Synthetic data badge on the page; while the month is synthetic, the export says "Built from synthetic data: not real outcomes", in the dialog and in both files.

⚠️ **Risk:** the Demo Use Cases ask to label the dashboard "synthetic data" on screen during the demo; the presenter says it instead.

⚠️ **Gap:** the demo rules ask for the label on every screen (DU-05); here it's only on this page.

### OUT-030 — Quarterly export

**Export quarterly report** builds the quarterly DHHS report and the milestone evidence pack at once, then lists each with what it holds and a download.

⚠️ **Constraint:** in the prototype both files are CSVs built from the page's data; the report's real format (DHHS template, PDF) and the evidence pack's contents need Intercept's grant team.

### OUT-040 — From the outcomes layer

Every scenario writes its events to the outcomes layer, so the month counts them (Events this month includes).

⚠️ **Constraint:** live calculation from production data is Funded; the prototype's month is static.

## 5. Open questions

| # | Question |
|---|---|
| OUT-OD-01 | The baseline period (OUT-002). |
| OUT-OD-02 | Each metric's exact definition and source (e.g. which transfers count as "considered"). |
| OUT-OD-03 | The DHHS report template and the milestone evidence list (OUT-030). |
| OUT-OD-04 | Who can see it: Clinical, Administration, or both; per hospital or network-wide (hospital isolation, BR-09). The Left Nav Spec's Clinical Analytics is "the clinician's own clinical and documentation metrics" (PRD Sidebar); the prototype puts the program's outcomes there. |
