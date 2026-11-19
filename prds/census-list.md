---
requirements: [PD-05, UX-09]
status: proposed — confirm with Intercept
---

<!--
Created: Nov 16, 2026
Created by: Julio Caunedo
Last updated: Nov 19, 2026
Scope: The census list on a patient's page (UCL CensusList, in Intercept Live's census-list-panel.tsx): the patients it shows, its title, how it's opened and how picking a patient works. Taken out of PRD Patient details PD-015, which keeps Previous / next. Sources: documents/Intercept Live — Left Nav Spec.md ("Census column"), the System Specification §5.1, PRD Patients, PRD Monitoring.
Purpose: Gives the census list its own rules, now that it's its own component and only shows the census.
-->

# PRD — Census list

**Product:** Intercept Live — Virtual Care OS  
**Module:** Provider Desktop (Single Pane of Glass), Spec §5.1  
**Surface:** a component, not a page: the **census list** (UCL `CensusList`), in a side panel left of a patient's page, opened from the app header's list button  
**Audience:** Intensivists, APPs and Critical Care RNs  
**Version:** 0.1  
**Status:** Draft — pending product validation with Intercept  
**Last updated:** November 19, 2026

---

## 1. Overview

The census list lets a clinician on a patient's page jump to another patient without going back to the page they came from. It lists **the census**, the patients in hospital now, in the order of the page the clinician came from, with the patient on screen marked.

The Left Nav Spec calls it the "Census column": "a list of the clinician's patients that opens from the third header icon, for jumping between patients without leaving the chart."

ℹ️ Until Nov 16, 2026 its rules were in PRD Patient details PD-015 (the patient switcher), which keeps Previous / next.

### 1.1 Product objectives

| Objective | What it means for the census list |
|---|---|
| **Stay in the chart** | Move to the next patient without leaving the patient's page (Spec §5.1 "sub-second patient pivots", PD-05). |
| **Only the census** | Only patients in hospital now: no one discharged or transferred out, whatever page the clinician came from. |
| **Keep the clinician's order** | The order and filters of the page they came from, so the list matches what they were working down. |
| **Accessible** | Every row is a button, the patient on screen is announced, the whole list works by keyboard (UX-09). |

### 1.2 Source documents

| Document | What this PRD takes from it |
|---|---|
| Left Nav Spec (Nov 14, 2026) | The "Census column": opens from the header's list icon; mainly on the patient chart; on Monitoring it repeats the page, so off by default there |
| System Specification | §5.1 (sub-second patient pivots) |
| Requirements Specification | PD-05 (move between patients from the patient view), UX-09 (keyboard paths) |
| PRD Patients, PRD Monitoring | What the census is (Monitoring's "The census"), and who isn't in it (Patients' discharged and transferred-out patients, CEN-OD-09) |
| PRD Patient details | PD-015 (Previous / next), the app header's list button |
| intercept.ds | The header's list button only; no design for the list. ⚠️ **Gap:** design it (CNL-OD-01) |

## 2. Users and use cases

| User | What they use it for |
|---|---|
| **Intensivist, APP** | Work down their sickest patients one after another, from Monitoring's order. |
| **Critical Care RN** | Check each of their patients in turn without going back to the list. |

| Use case | Story |
|---|---|
| **Work down the list** | On Margaret Hayes's page, the clinician opens the list and picks the next patient; the page switches, the list stays open on the new patient. |
| **From Patients** | Opened on a patient reached from Patients, the list shows only those of Patients' list who are in hospital. |

## 3. Anatomy

| Part | What it shows |
|---|---|
| **Title** | **Census**, from any page (CNL-010). |
| **Row** | As a patient in Ask Intercept Live's answers: the patient's avatar (photo, else initials in their card's color), centered on the name (semibold) and the location under it ("MICU · Bed 11 · Sidney Regional"); then, under the avatar from the row's edge (not indented to the name), the patient cards' score line: the trend arrow, "NEWS2: 17 High" (the band in its color) and the change, muted ("· 2 points up in 24 h"); no score reads "NEWS2: -- Unknown" (CNL-013). |
| **Patient on screen** | The `accent` fill, `aria-current`, kept in view (CNL-020). |
| **Empty** | "No patients in hospital". |

The panel around it (sliding in, resizing, ×, the title bar) is the shell's side panel, shared with Ask Intercept Live; the two take turns in the same place.

## 4. Requirements

### CNL-001 — Only the census

The list shows the patients in hospital now, never anyone discharged or transferred out. Opened from Monitoring it's Monitoring's list (already the census); opened from Patients, it's Patients' list without those no longer in hospital; opened from an alert, a toast, the live feed or the chat, it's the list of the page underneath, filtered the same way.

- ✅ **Resolved:** the list only shows the census, from any page.
- ✅ **Resolved:** the filter is in the component (`inHospital: false` leaves a patient out), so a page that passes its whole list still shows only the census.
- ⚠️ **Gap:** the prototype has no patients out of hospital yet (PRD Patients CEN-OD-09), so nothing is left out today.
- ⚠️ **Decision needed:** a patient opened from Patients who isn't in hospital isn't in the list: does the list button still show on their page (with the census), or is it hidden (CNL-OD-02)?

### CNL-010 — Title

**Census**, from any page.

- ✅ **Resolved:** titled Census whichever page it comes from (~~Patients~~ before; ~~"Census" only from Monitoring, undecided from Patients~~).

### CNL-011 — No line under the title

The list starts right under the title bar: no line saying which page it comes from or where the patient sits.

- ✅ **Resolved:** no source line (~~"From Monitoring, in its order": the source page by its Sidebar name, without "the"~~).
- ✅ **Resolved:** no position (~~"· 4 of 26", the patient's place and the count over the census only~~). UCL's `censusListPosition` still works it out, for a page that wants it.

- ~~✅ **Resolved:** "From Monitoring", no longer "From the Monitoring".~~

### CNL-012 — Order

The order and filters of the source page, as it showed them when the patient opened (taken once, so the list doesn't reorder under the clinician). A patient that list leaves out comes first (PD-015's "Always there").

### CNL-013 — Row

Each row shows the patient as Ask Intercept Live's answers do, and the score as the patient cards do (PatientCardScore), so a patient reads the same everywhere.

- ✅ **Resolved:** the avatar before the name and location, as in the chat's patient lists; every name semibold.
- ✅ **Resolved:** no alert pill for now (~~the alert's severity pill at the right of the name~~); the component still shows one when given the patient's alert.
- ✅ **Resolved:** the score is the cards' score line, with its trend arrow and the 24 h change (~~"NEWS2 17 · High", the whole line in the band's color~~).

### CNL-020 — The patient on screen

Marked (`accent` fill, `aria-current="page"`; ~~semibold name~~, every name is semibold now) and scrolled into view when the list opens and each time the patient changes.

### CNL-021 — Picking a patient

Picking a row switches the page to that patient, on the same tab, and keeps the list open, so the clinician can work down it. The switch is sub-second (Spec §5.1).

### CNL-030 — Where it opens

From the app header's list button on a patient's page. It takes turns with Ask Intercept Live in the same place: opening one closes the other. Not on Monitoring or Patients themselves: there the page is already the list (the Left Nav Spec's "off by default on Monitoring").

- ℹ️ A shared link opens it with `?side=patients`.

### CNL-040 — Previous / next

When PD-015's Previous / next buttons (↑/↓, J/K) are built, they step through this same list.

## 5. States

| State | What it shows |
|---|---|
| **Default** | The census in the source page's order, the patient on screen marked |
| **Patient on screen not in the census** | The census, nothing marked (CNL-OD-02) |
| **Empty** | "No patients in hospital" |
| **Read-only** (no selection handler) | The rows as text, not buttons; for use outside a patient's page |

## 6. Accessibility

- A list of buttons, one per patient; Tab and Enter, or Space, pick one.
- The patient on screen is `aria-current="page"`, read with the row.
- The score's band is a word, never color alone.
- The panel closes with Escape or ×, returning focus to the list button.

## 7. Acceptance criteria

| ID | Criterion |
|---|---|
| CNL-AC-01 | Opened from Monitoring, the list shows Monitoring's patients in its order, titled Census, with no line under the title (CNL-001, CNL-010, CNL-011). |
| CNL-AC-02 | A patient with `inHospital: false` never appears (CNL-001). |
| CNL-AC-03 | The patient on screen is marked and in view; picking another switches the page and keeps the list open with the new one marked (CNL-020, CNL-021). |
| CNL-AC-04 | Opening the list closes Ask Intercept Live, and the reverse (CNL-030). |
| CNL-AC-05 | With no patient in hospital, it says "No patients in hospital". |

## 8. Open decisions

| ID | Decision | Owner | Notes |
|---|---|---|---|
| CNL-OD-01 | The list's design in intercept.ds | Design | Only the header's button is drawn |
| CNL-OD-02 | On the page of a patient not in hospital (from Patients): show the list button (census, nothing marked) or hide it | Product | Depends on PRD Patients CEN-OD-09 |
| CNL-OD-03 | Should the rows show more (flags, unread messages, the alert again)? | Product, clinicians | Today: avatar, name, location, score and its 24 h change. ✅ **Resolved:** the score's 24 h change shows (CNL-013) |
