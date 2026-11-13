---
requirements: [VS-01, VS-02, VS-03, VS-04, VS-05, VS-06, VS-07, VS-08, WF-03, AL-01, OE-03]
status: proposed — confirm with Carlos
---

<!--
Created: Nov 13, 2026
Created by: Julio Caunedo
Last updated: Nov 13, 2026
Scope: The Virtual Sepsis page in Intercept Live (Sidebar › Virtual Sepsis): which patients it lists, how it shows them, and what it doesn't do yet. Governs the "Virtual Sepsis" page in `monitoring/monitoring.tsx`. The patient's own Sepsis tab is PRD Patient details'.
Purpose: the page was built on Nov 13, 2026 from the Monitoring page; this PRD records what it does and lists what the spec asks of it that's still open.
-->

# PRD — Virtual Sepsis

**Product:** Intercept Live — Virtual Care OS  
**Module:** Virtual Sepsis ★ (Spec §5.9), with the Sepsis Sniffer (§8.1) and the Sepsis Tracker (§8.2)  
**Name:** **Virtual Sepsis**, the page. A patient on it is **on sepsis watch**  
**Surface:** Sidebar › Virtual Sepsis  
**Version:** 0.1  
**Status:** Draft — pending clinical and product validation  
**Last updated:** November 13, 2026

---

## 1. Overview

Virtual Sepsis is where the clinician sees every patient the platform is watching for sepsis, across their hospitals, in one place.

The spec makes Virtual Sepsis the first Intelligence-layer module: it "continuously screens patients for sepsis … using CMS SEP-1 bundle criteria as the regulatory baseline; tracks identified patients through the three-and-six-hour bundle windows" (Spec §5.9). The Sepsis Sniffer finds candidates and the clinician confirms or excludes them (VS-01, VS-03); the Sepsis Tracker follows confirmed cases through the bundle (VS-04 to VS-06).

**The page is Monitoring, narrowed to sepsis.** It shows the same live monitoring cards, hospital tabs, filters and views as Monitoring, for the sepsis patients only. Each patient's sepsis detail (criteria, Time Zero, bundle elements, prompts) is in Patient details › Sepsis, which the page opens.

### 1.1 Objectives

| Objective | What it means here |
|---|---|
| **One list of sepsis patients** | Every patient on sepsis watch, across the clinician's hospitals, without filtering the Census by hand. |
| **Live, not a report** | The same live vitals and alerts as Monitoring, so deterioration shows on the patients most at risk. |
| **One click to the case** | Each card opens the patient's page, where the sepsis case and its bundle are. |

### 1.2 Out of scope

- The patient's sepsis case itself (criteria, confirm or exclude, Time Zero, bundle elements, prompts): Patient details › Sepsis (PRD Patient details).
- Protocol customization per hospital (Spec §5.9, CA-04): Client Administration.
- Compliance reporting (VS-08): Compliance & Reporting (Spec §5.12). See §5.

### 1.3 Source documents

| Document | What it gives this page |
|---|---|
| System spec §5.9 Virtual Sepsis ★ | Purpose, capabilities, users (Intensivist, APP, Critical Care RN, Client Admin) |
| System spec §8.1 Sepsis Sniffer, §8.2 Sepsis Tracker | Candidates "presented in the Virtual Sepsis screening queue"; bundle tracking and prompts |
| Requirements spec §5.9 (VS-01 to VS-08), WF-03 | What the module must do; the sepsis early-catch workflow |
| PRD Monitoring | The page this one reuses |
| PRD Patient details | The Sepsis tab |

## 2. Users and use cases

| ID | Use case | Who |
|---|---|---|
| VSP-UC-01 | **See everyone on sepsis watch.** At the start of a shift or after a page, the clinician sees every sepsis patient across their hospitals at once. | Intensivist, APP, Critical Care RN |
| VSP-UC-02 | **Notice who's getting worse.** Live vitals, scores and alerts on each card show which sepsis patient needs attention first. | Intensivist, Critical Care RN |
| VSP-UC-03 | **Open the case.** From a card, the clinician opens the patient's page to confirm or exclude a candidate, or to move the bundle on. | Intensivist, APP |

## 3. Page

### VSP-001 — Who's on the page

A patient is on the page when they're **on sepsis watch** (the census's flag, the Census's Sepsis watch filter) or their record has a **sepsis case** (a Sniffer candidate, or a case the Tracker follows).

✅ **Resolved:** the page lists those patients from the Monitoring panel, with their alerts, and shows only the hospitals they're at.

- ⚠️ **Decision needed:** a case the clinician **rejected** or **excluded** (VS-03) still puts the patient on the page today. Whether they leave it, leave it after a while, or stay with their state shown is open (VSP-OD-02).
- ℹ️ In the prototype's default story: Harris, William; Miller, Sarah; and Moore, Patricia, all at Sidney Regional. Medina, Rosa (Scenario 3) joins when her scenario puts her on sepsis watch.

### VSP-002 — Monitoring's cards

✅ **Resolved:** the page uses the **monitoring card** (PatientMonitoringCard), as Monitoring does, with everything Monitoring has:

| Part | On this page |
|---|---|
| **Hospital tabs** | All hospitals, then each hospital with a sepsis patient, with its patient count and active alert count |
| **Heading** | The panel summary, e.g. "3 patients at Sidney Regional · 1 active alert" |
| **Filter bar** | My patients, Active alerts, Rising score, Outside limits, Not reporting; the views, sort and Filters |
| **Cards** | Live bedside monitor, NEWS2, the alert bar, flags (e.g. **Sepsis candidate**) |
| **Live feed** | The page's alerts only |

Each card opens the patient's page, where **Sepsis** is among the tabs for a patient on sepsis watch.

### VSP-003 — Nobody on sepsis watch

With no sepsis patients, the page shows its empty state: **"No patients on sepsis watch"**, "Patients flagged by sepsis screening will appear here."

## 4. Acceptance criteria

| ID | Criterion |
|---|---|
| VSP-AC-01 | Every patient on sepsis watch or with a sepsis case appears on the page, and no one else. |
| VSP-AC-02 | The hospital tabs list only hospitals with a sepsis patient; the counts and the heading count only the page's patients and their alerts. |
| VSP-AC-03 | A card opens the patient's page, and that page has the Sepsis tab. |
| VSP-AC-04 | With no sepsis patients, the page shows the empty state, never an empty grid. |

## 5. Not built yet

What the spec asks of Virtual Sepsis that the page doesn't do yet. Each is a candidate for the next pass.

| Spec | What's missing on the page |
|---|---|
| VS-01, Spec §8.1 | A **screening queue**: the Sniffer's candidates waiting for review, with the criteria met and their evidence. Today a candidate is a card with the **Sepsis candidate** flag. |
| VS-02 | **Exclusions** applied at screening (liver failure, OB, pediatric, oncology), with the reason. |
| VS-03 | Confirm or exclude **from the page**. Today it's done on the patient's page. |
| VS-04 | The case's **state and bundle clock** on the card: candidate or confirmed, Time Zero, the 3 h and 6 h windows, on track or off track. |
| VS-05, VS-06 | The **prompts** due soon across patients (e.g. repeat lactate), with their outcomes. |
| VS-08 | **Compliance summary** per hospital, SEP-1 and the hospital's protocol tracked separately. |

- ⚠️ **Gap:** only the Monitoring layout renders the page. In the Census's layout, Virtual Sepsis still shows its empty state.

## 6. Open decisions

| ID | Question | Notes |
|---|---|---|
| VSP-OD-01 | Should the page lead with a **screening queue** (candidates to review), then the patients being tracked, instead of one grid? | Spec §8.1 names "the Virtual Sepsis screening queue". |
| VSP-OD-02 | Do patients whose case was **rejected or excluded** leave the page, and when? | See VSP-001. |
| VSP-OD-03 | Should the card show the **sepsis state and bundle clock** (VS-04), and where on the card? | Glossary: Sepsis screening, validation and bundle tracking states (proposed). |
| VSP-OD-04 | Should the page **sort by the nearest bundle deadline** by default? | Monitoring sorts by patient name or score. |
| VSP-OD-05 | Where does the **compliance summary** (VS-08) live: on this page, or in Compliance? | |

## 7. Design and code

| Item | Where |
|---|---|
| Page | `src/layouts/intercept-live/monitoring/monitoring.tsx` (the `"Virtual Sepsis"` page: `MonitoringPanel` given the sepsis patients) |
| Cards and panel | `monitoring/monitoring-panel.tsx`, UCL `PatientMonitoringCard` |
| Sepsis cases | `patient-details/sections/sepsis-section.tsx` (`SepsisCase`), `sections/sample-sepsis.ts` |
| Storybook | Layouts › Intercept Live › Monitoring, Sidebar › Virtual Sepsis |
