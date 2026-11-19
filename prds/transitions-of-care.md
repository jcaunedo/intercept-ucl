---
requirements: [OBJ-7, BR-06, BR-07, SIM-14]
status: proposed — confirm with Intercept
---

<!--
Created: Nov 18, 2026
Created by: Julio Caunedo
Last updated: Nov 19, 2026
Scope: What happens when an Intercept patient leaves the hospital and what happens if they come back: the primary-care handoff, the readmission risk, the follow-up it schedules, and a return matched to the stay (src/layouts/intercept-live/patient-details/sections/transition-section.tsx, the Inbox's Follow-up kind, the return alert). Source: Demo Use Cases, Scenario 6 ("After the ICU, a readmission caught early and the outcomes report"), steps 1 to 3.
Purpose: Records what the first layout does, so the team can confirm or change it, and lists what's still open.
-->

# PRD — Transitions of care

**Product:** Intercept Live — Virtual Care OS  
**Module:** Clinical documentation and work management, at discharge and after  
**Surface:** the patient page's **Discharge** section, the **Inbox** (Follow-up items), the alert on a matched return  
**Audience:** Intensivists, who send the handoff and get the return alert; Critical Care RNs, who make the follow-up phone checks. The primary-care clinic receives the handoff outside the platform  
**Version:** 0.1  
**Status:** Draft — a first layout in the prototype, pending product validation with Intercept  
**Last updated:** November 19, 2026

---

## 1. Overview

Tele-ICU care doesn't end when the patient goes home. A rural patient with heart failure who leaves after ICU-level care is at high risk of coming back, and the clinic that sees them next usually doesn't share the hospital's EHR. Transitions of care closes that gap: the platform drafts a one-page handoff the clinic can read without a shared EHR, scores the readmission risk, schedules the follow-up the risk calls for, and, when the patient comes back to any hospital in the network, matches them to the stay and alerts the hub before they're readmitted.

ℹ️ Scenario 6's story: Margaret Hayes (Scenario 1) goes home from Chadron on day 4 with a handoff to Chadron Rural Health Clinic and a 72-hour nurse phone check; on day 11 she comes to Chadron's ED with her weight up 1.5 kg and new orthopnea, is matched to the stay, has her diuretic adjusted in the ED and goes home without admission.

### 1.1 Product objectives

| Objective | What it means here |
|---|---|
| **The clinic knows what happened** | One page, readable without our EHR: what happened, medication changes, daily weights, follow-up, who to call. |
| **Risk drives the follow-up** | A High readmission risk schedules a nurse phone check and a clinic visit, on someone's list, with a due time. |
| **Catch the return early** | A return to any network hospital is matched to the stay and alerts the hub, with a pathway that can avoid readmission. |
| **Assist, never act** | The clinician reviews and sends the handoff; the ED's pathway is accepted, modified or declined like any other (BR-06, BR-07). |
| **Fair by design** | Payer and county rurality never enter the risk score; they're for reporting only (Demo Use Cases, demo rules). |

### 1.2 Source documents

| Document | What this PRD takes from it |
|---|---|
| Demo Use Cases, Scenario 6 | Steps 1 to 3 (handoff, readmission risk, the catch); capabilities: handoff document (Demo), readmission risk score and follow-up task (Demo), cross-site patient matching on return (Demo, synthetic), handoff delivery to clinics outside the EHR (Funded) |
| Requirements Specification | OBJ-7 (the grant's criteria inside the product), BR-06 / BR-07 (suggestions assist; every one records an outcome), SIM-14 (multi-day jump, run events to the outcomes layer), Patient scenario fields (payer and rurality are reporting-only) |
| PRD Inbox | The Inbox's kinds and rows (INB-001, INB-020) |

## 2. Users and use cases

| User | What they use it for |
|---|---|
| **Intensivist** | Reviews and sends the handoff at discharge; gets the alert when the patient comes back and accepts the ED's pathway. |
| **Critical Care RN** (the hub tele-RN) | Makes the phone checks on their list; logs what they found. |
| **Primary-care clinic** | Receives the handoff and books the visit (outside the platform). |

| Use case | Story |
|---|---|
| **Send the handoff** | Margaret is ready to go home. A notice opens her Discharge section; Joanna reads the one page and sends it to the clinic. |
| **Follow up** | Her risk is High: a 72-hour phone check goes on Ava Brooks's list (hub tele-RN) and a clinic visit is booked within 7 days. |
| **Catch the return** | On day 11 Margaret registers at Chadron's ED. The platform matches her to the stay and alerts the hub; the ED's diuretic adjustment sends her home. |

## 3. Anatomy

The Discharge section of the patient's page shows **Transition of care** above the social needs and referrals (Scenario 2) when the patient has both.

| Part | What it shows |
|---|---|
| **Header** | "Transition of care", a status badge (Handoff to send, Handoff sent, Follow-up done, Back in the ED, Readmission avoided) and its source. |
| **Back in the network** | Only on a return: where and when, how long after discharge, what the match used, what brought them back, and how it ended. |
| **Primary-care handoff** | Who it goes to and how (with a Preview label while delivery is a mock), the one-page document, then **Send to clinic**, or when it was sent and opened. |
| **Readmission risk** | The level, the factors behind it, what it schedules, its source, and "Payer and county rurality aren't inputs". |
| **Follow-up** | Each task: the phone check and the clinic visit, who, when, its status (Scheduled, Done, Overdue) and, once done, what was found. A task on a list links to it (Open Inbox). |

## 4. Requirements

### TOC-001 — The handoff

At discharge the platform drafts a one-page primary-care handoff from the record: what happened, each medication's change (New, Dose changed, Stopped, No change) with the reason, the discharge weight and daily-weight instructions, the follow-up booked, and who to call. It names who drafted it.

✅ **Resolved:** it shows as a document in the Discharge section, the same page the clinic receives.

### TOC-002 — Sent by a clinician

The handoff is a draft until a clinician sends it (**Send to clinic**); nothing goes out on its own. Once sent, the card says when and by whom, and when the clinic opened it.

⚠️ **Decision needed:** who sends it in production: the hub intensivist, the hospital's discharging clinician, or either. The prototype has the hub intensivist send it.

### TOC-003 — Readable without a shared EHR

The handoff reaches the clinic as a PDF by Direct secure message, with a fax copy, so the clinic doesn't need the hospital's EHR.

⚠️ **Constraint:** delivery to clinics outside the EHR is Funded (built during the award year); in the prototype it's a mock, labeled Preview.

### TOC-010 — Readmission risk

The platform scores the readmission risk at discharge (Low, Medium, High) and lists the factors it found in the record (Scenario 6: HFrEF, lives alone, ICU-level care this stay).

### TOC-011 — Payer and rurality aren't inputs

Payer and county rurality never enter the score; the card says so. They're for reporting only (PRD Outcomes dashboard).

### TOC-012 — The model

⚠️ **Decision needed:** which readmission model and thresholds Intercept uses (e.g. HOSPITAL score, LACE), reviewed by clinical leadership. The prototype shows the factors without points.

### TOC-020 — Follow-up the risk schedules

High risk schedules a 72-hour nurse phone check, on the hub tele-RN's list, and a clinic visit within 7 days. Each shows who, when, its status and, once done, what was found.

### TOC-021 — On the tele-RN's list

The phone check is a **Follow-up** item in the Inbox (PRD Inbox INB-002), assigned to the hub tele-RN ("For Ava Brooks, RN (hub tele-RN)"), due 72 hours after discharge. Its button opens the patient's Discharge section. Once the call is logged it moves to Done, by the tele-RN.

⚠️ **Gap:** the tele-RN's own view (their Inbox, the call script, logging the result) isn't designed; the prototype shows the item in the intensivist's Inbox, marked as the tele-RN's.

### TOC-030 — A return matched to the stay

When a discharged patient registers at any network hospital, the platform matches them to the stay (name, date of birth, address, insurance ID) and adds **Back in the network** to the Discharge section.

### TOC-031 — The hub is alerted

A return within 30 days of a High-risk discharge fires a High alert to the hub ("Back 7 days after discharge, matched to her Chadron stay"; reason: what brought them back), with the readmission watch as its source and a pathway for the ED (Scenario 6: furosemide IV, a higher oral dose, labs before she leaves, the criteria to go home).

⚠️ **Decision needed:** the window (30 days?) and which risk levels alert; the pathway's doses and criteria need clinical review.

### TOC-032 — Readmission avoided

When the patient goes home from the ED, the return says "Readmission avoided" with what was done, the alert resolves, a next phone check goes on the tele-RN's list, and the outcome is written to the outcomes layer (PRD Outcomes dashboard).

## 5. Open questions

| # | Question |
|---|---|
| TOC-OD-01 | Who sends the handoff (TOC-002). |
| TOC-OD-02 | The readmission model and thresholds (TOC-012). |
| TOC-OD-03 | The return window and which risk levels alert (TOC-031). |
| TOC-OD-04 | How a match is confirmed when it isn't certain (e.g. a new address), and who confirms it. |
| TOC-OD-05 | The hub tele-RN's view of their follow-ups (TOC-021). |
