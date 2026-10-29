---
requirements: [PD-04, SV-08, SV-09]
status: proposed — confirm with Carlos
---

<!--
Created: Oct 22, 2026
Created by: Julio Caunedo
Last updated: Oct 29, 2026
Scope: The Patient card component (compact and expanded variants) for Provider Desktop / Tele-Critical Care Clinical Surveillance.
Purpose: Defines proposed presentation behavior, states and acceptance criteria for the Patient card, pending clinical and product validation.
-->

# PRD — Patient card

**Product:** Intercept Live — Virtual Care OS  
**Module:** Provider Desktop / Tele-Critical Care Clinical Surveillance  
**Component:** Patient card  
**Version:** 0.1  
**Status:** Draft — pending clinical and product validation  
**Last updated:** October 29, 2026

---

## 1. Overview

The Patient card is a reusable clinical UI component that provides an at-a-glance summary of a patient's identity, location, physiological observations, clinical status, and actionable alerts.

The component supports the continuous surveillance workflows of intensivists, Advanced Practice Providers (APPs), and Critical Care RNs working across multiple hospital facilities.

Its primary purpose is to help clinicians identify patients requiring attention, understand their current monitoring context, and access the relevant clinical workflow with minimal interaction.

The Patient card is not a replacement for the patient chart. It provides a concise, clinically meaningful representation of the patient, with access to detailed information through the Provider Desktop.

### 1.1 Product objectives

- Reduce the time clinicians spend locating and assessing patients.
- Support continuous multi-patient surveillance.
- Prioritize clinically relevant information without overwhelming the interface.
- Make alerts, physiological trends, and outstanding actions identifiable.
- Preserve patient and hospital context across navigation.
- Communicate data freshness, availability, and provenance.
- Support different levels of information density.
- Provide consistent behavior across hospitals and integration environments.

### 1.2 Source documents

1. Intercept Live — Virtual Care OS System Specification, May 2026.
2. Intercept Live Design Phase Team Brief, October 20, 2026.

Relevant System Specification sections:

- §5.1 Provider Desktop
- §5.2 Tele-Critical Care Clinical Surveillance
- §5.6 Clinical Alerting & Events
- §5.9 Virtual Sepsis
- §6.4 Tenancy and Data Isolation
- §6.5 Patient Data Aggregation
- §6.6 Telemetry Ingestion
- §8.1 Sepsis Sniffer
- §8.2 Sepsis Tracker
- §8.3 Vent-Order Mismatch Agent
- §9.1 UI Vision and Design Principles

**Specification boundary:** These documents establish platform capabilities and design principles. They do not provide a finalized Patient card field schema, approved alert severity taxonomy, clinical thresholds, or detailed UI acceptance criteria. This PRD defines proposed presentation behavior that must be validated with Intercept's clinical and product leadership before implementation as production software.

---

## 2. Users and use cases

### 2.1 Primary users

| User | Responsibilities |
|---|---|
| **Intensivist** | Monitors critically ill patients across multiple hospitals, reviews clinical changes, identifies required interventions, and coordinates with bedside care teams. |
| **Advanced Practice Provider (APP)** | Performs surveillance, evaluates clinical information, and coordinates patient care within applicable scope-of-practice rules. |
| **Critical Care RN** | Continuously monitors patient conditions, manages alert triage, identifies changes in patient status, and escalates concerns to appropriate clinicians. |

### 2.2 Primary use cases

| ID | Use case | Description |
|---|---|---|
| UC-01 | **Patient identification** | A clinician identifies a patient and their current hospital, unit, and bed without opening the patient chart. |
| UC-02 | **Continuous surveillance** | A clinician monitors several patients simultaneously, reviewing current vital signs and detecting meaningful changes. |
| UC-03 | **Alert triage** | A clinician identifies patients with active alerts and navigates to the related alert details. |
| UC-04 | **Clinical deterioration** | A clinician notices changes in physiological observations or a supported acuity measure and opens the patient surveillance view. |
| UC-05 | **Sepsis screening** | A clinician identifies a possible sepsis candidate and reviews the triggering evidence through Virtual Sepsis. |
| UC-06 | **Respiratory monitoring** | A clinician identifies respiratory-support status or a ventilator-order mismatch and reviews additional clinical context. |
| UC-07 | **Shift handoff** | An incoming clinician reviews patients with unresolved alerts or documented concerns inherited from the previous shift. |
| UC-08 | **Partial data availability** | A clinician can identify when data is missing, delayed, stale, or unavailable without confusing missing observations with normal clinical findings. |

---

## 3. Component architecture

### 3.1 Component variants

The Patient card should support two variants.

#### Compact

Optimized for high-density patient census views.

Includes:

- Patient identity
- Hospital and bed location
- Highest-priority unresolved alert, when present
- Selected physiological observations
- Access to patient detail (the whole card is clickable, PC-100)

ℹ️ The compact card has no freshness indicator: it always shows live data. When connectivity fails or data is significantly delayed, a connectivity alert appears in the alert slot with a refresh CTA (PC-128).

#### Expanded

Optimized for clinical surveillance dashboards.

Includes:

- All compact information
- Additional configured physiological observations
- Acuity score, when available
- Clinical trajectory, when supported
- Respiratory-support context
- Sepsis screening or tracking status
- Additional alerts and workflow indicators

**Requirement PC-001**

Both variants must consume the same underlying patient data model and status definitions.

**Requirement PC-002**

Switching variants must not modify clinical data, alert lifecycle state, or assigned clinical priority.

**Requirement PC-003**

Information may be progressively disclosed based on layout constraints, but clinically significant unresolved alerts must remain discoverable.

### 3.2 Proposed information hierarchy

1. Patient identity
2. Hospital and bed location
3. Highest-priority active clinical concern
4. Physiological observations
5. Relevant clinical context
6. Workflow state
7. Data freshness and provenance
8. Navigation and contextual actions

This hierarchy is a design proposal, not a clinical prioritization policy.

---

## 4. Patient identification

### PC-010 — Patient name

**Definition:** Patient name supplied by the authorized hospital record.

**Data type:** String

**Display:** Full name, subject to available space and hospital privacy policy.

**Requirements:**

- Support long names and multiple name components.
- Never generate or infer missing name information.
- Preserve accessible access to the complete displayed identity.
- Follow applicable permissions and de-identification rules.

**Scenarios:**

- Available: Display supplied name.
- Missing: Display an approved unidentified-patient label.
- Restricted: Apply the authorized privacy or masking policy.

**Avatar:**

The card shows an initials avatar next to the name. It adds a human element and helps clinicians tell cards apart when scanning a census.

| Scenario | Avatar |
|---|---|
| Name available | Initials from the supplied name: first letter of the first name, then of the last name (e.g. John Smith → JS). |
| Name missing (unidentified patient) | A generic person icon, never invented initials. |
| Name restricted | A generic person icon, so the initials don't reveal a masked name. |

- ℹ️ Initials only, no photo, for privacy.
- ℹ️ The avatar uses one fixed set of decorative colors that excludes the status tones (red, orange, yellow, green), so it never reads as a severity or acuity. The color is assigned from `patientId`, so a patient keeps the same color on every screen.
- ℹ️ The avatar is decorative: screen readers skip it, because the name is already announced.

### PC-011 — Medical Record Number (MRN)

**Definition:** Hospital-specific patient identifier.

**Data type:** String

**Display:** Hospital-authorized identifier, potentially masked.

**Requirements:**

- Keep MRNs scoped to their originating hospital tenant.
- Never treat an MRN as a globally unique patient identifier.
- Follow hospital policies governing whether the full identifier is displayed.

**Scenarios:** Available, masked, unavailable, restricted.

### PC-012 — Patient demographics

**Definition:** Demographic context associated with the patient.

**Fields:**

- Age
- Sex, where available and clinically relevant
- Additional demographic attributes only when justified by a specific clinical workflow

**Requirements:**

- Display only sourced data.
- Preserve the distinction between missing demographic information and an explicitly recorded value.
- Use consistent age formatting.
- Do not assume sex or gender from a name.

**Sex, not gender:** the card shows sex, not gender. In healthcare, sex and gender are different data items, and EMRs record them separately. For a clinical card, sex is the one that drives the clinical work.

| Data item | What it is | What it's used for |
| --- | --- | --- |
| **Sex** (HL7: "sex for clinical use") | Biological attributes relevant to care. | Lab reference ranges, drug dosing, kidney function (eGFR) and ventilator settings: lung-protective ventilation sets tidal volume from predicted body weight, which is calculated from height and sex. |
| **Gender identity** | How the patient identifies. | Respectful care: how staff address the patient. Usually comes with **pronouns** and a **name to use**. |

- ℹ️ HL7's Gender Harmony work separates sex for clinical use, recorded sex or gender, gender identity, pronouns and name to use, because mixing them caused clinical errors.
- ⚠️ **Constraint:** FHIR's `Patient.gender` field is *administrative* gender, a registration value, not gender identity or sex for clinical use. Integrations map these fields by meaning, not by name.

### PC-013 — Hospital

**Definition:** Facility responsible for the patient's current encounter.

**Data type:** Hospital identifier and display name.

**Data fields:** `hospitalCode`, `hospitalName`. See "Location data fields" in PC-014.

**Requirements:**

- Display facility context in multi-hospital views.
- Respect the facility's tenant boundary.
- Use consistent names or approved abbreviations.

### PC-014 — Unit and bed

**Definition:** Current physical location of the patient.

**Fields:**

- Unit name/code (e.g. MICU, SICU, CVICU, NICU, ED)
- Room number, where available
- Bed identifier, where available

**Location levels**, from broad to specific:

| Level | Example | What it is |
| --- | --- | --- |
| Hospital | CVMC | The facility (PC-013). |
| Unit | MICU | A department inside the hospital with its own team (nurses, intensivist, respiratory therapists), usually 10–30 beds on one floor or wing. Not a room. |
| Room | 12 | A physical room in that unit. |
| Bed | 3 or 12A | One patient's place in a room. |

ℹ️ ICU rooms are almost always private (one patient per room), so the room and the bed are effectively the same and hospitals often send only one of them. That's why the example skips the room. Shared rooms are more common on regular wards, e.g. 4 West · Room 412 · Bed B.

**Example:** CVMC · MICU · Bed 9

| Part | Meaning |
| --- | --- |
| CVMC | The hospital the patient is in (PC-013). A sample abbreviation from mockup data, most likely ending in "Medical Center"; its full name isn't defined. |
| MICU | The unit: the Medical Intensive Care Unit, the department inside that hospital. |
| Bed 9 | The patient's bed number in that unit. |

**Location data fields:**

| Card shows | Data field | Figma placeholder | Example value | HL7 ADT location (PV1-3) |
| --- | --- | --- | --- | --- |
| CVMC | `hospitalCode` | `{hospital-code}` | `"CVMC"` | Facility (PL.4) |
| *(not shown; for a tooltip or screen reader label)* | `hospitalName` | `{hospital-name}` | Not in the mockup data | — |
| MICU | `unitCode` | `{unit-code}` | `"MICU"` | Point of care (PL.1) |
| *(not shown; for a tooltip or screen reader label)* | `unitName` | `{unit-name}` | `"Medical Intensive Care Unit"` | — |
| *(not shown in the example)* | `room` | `{room}` | `null` | Room (PL.2) |
| Bed 9 | `bed` | `{bed}` | `"9"` | Bed (PL.3) |

- "Bed" is a label the card adds; the `bed` value is only `"9"`.
- Store room and bed as text, not numbers, because hospitals use values like `"9A"` or `"B-12"`.
- Figma placeholders use the same words as the data fields, in kebab-case (`{hospital-code}` ↔ `hospitalCode`).

⚠️ **Decision needed:** confirm the data field names with engineering.

**Requirements:**

- Display the location from broad to specific: hospital (PC-013), unit, room, bed.
- Update when an authorized ADT event changes the patient location.
- Do not continue presenting a previous bed assignment as current after a known transfer.
- Support locations where room and bed numbers are unavailable.

### PC-015 — Admission context

**Definition:** Time and current state of the hospital encounter.

**Fields:**

- Admission date/time
- Encounter identifier
- Encounter status

**Display:** Conditional. Admission duration is not required in every compact card.

---

## 5. Patient census lifecycle

The following is a proposed presentation model derived from ADT and census-reconciliation capabilities.

| Status | Definition | Card behavior |
|---|---|---|
| Admitted | Patient is registered in an active hospital encounter. | Display in the appropriate active census. |
| Transferred | Patient location or responsible unit changed. | Update location and re-evaluate coverage permissions. |
| Discharged | Patient encounter has ended. | Remove from active surveillance census under approved reconciliation rules. |
| Pending reconciliation | Hospital records and other census sources disagree or cannot be synchronized. | Display reconciliation state and avoid unsupported assumptions. |
| Unknown | Encounter state cannot be determined reliably. | Indicate uncertainty and preserve safe access behavior. |

**PC-020:** ADT events must be processed according to their authoritative source and encounter context.

**PC-021:** A patient transfer must not automatically be interpreted as discharge.

**PC-022:** Patient cards must not be combined into one cross-tenant patient record.

**PC-023:** Manual reconciliation must be available only to authorized users through the relevant workflow.

---

## 6. Clinical acuity

### PC-030 — Acuity score

**Definition:** A numerical representation of patient severity or clinical care requirements derived from an approved scoring method.

**Data:**

- Score value
- Scoring system identifier
- Calculation timestamp
- Source
- Score validity/availability
- Change over the comparison window (see "Score change" below)

**Candidate scoring methods:**

ℹ️ The method isn't chosen yet (OD-02). These are the scores ICUs commonly use.

| Score | Range | Higher means | Updated | Notes |
|---|---|---|---|---|
| **SOFA** (Sequential Organ Failure Assessment) | 0–24 | Sicker | Daily, or more often | Scores six organ systems 0–4 each: lungs, blood clotting, liver, heart and circulation, brain, kidneys. The ICU standard, also used to define sepsis (a rise of 2 or more). |
| **APACHE II / IV** (Acute Physiology and Chronic Health Evaluation) | 0–71 (II) | Sicker | Once, in the first 24 h of the ICU stay | Predicts mortality and is used for benchmarking. Philips eICU (eCareManager) uses APACHE IV. Doesn't change after day one, so it can't show change during the stay. |
| **NEWS2** (National Early Warning Score 2) | 0–20 | Sicker | Every set of vitals | Has official bands: 0–4 low, 5–6 medium, 7+ high, and a 3 in any single parameter needs urgent review. Built for hospital wards; some ICUs use it. |
| **Rothman Index** | Up to 100 | **Healthier** (lower is sicker) | Continuously, from EMR data | Proprietary. |
| **Epic Deterioration Index** | 0–100 | Sicker | About every 15 min | Proprietary; available only at Epic hospitals. |

**Example:** `SOFA 9 · High`, with "Calculated 06:00" in the details. The High category is illustrative; SOFA has no official bands.

- ℹ️ Show the scoring system's name with the number. A 9 on SOFA and a 9 on NEWS2 mean very different things.
- ℹ️ Scales can run in opposite directions (the Rothman Index is lower when sicker). Color and sort by the category, never by the raw number.
- ⚠️ **Gap:** only NEWS2 has official bands. Low/Moderate/High/Critical bands for SOFA, APACHE or the proprietary scores would be Intercept's proposal and need clinical approval (OD-03).

**Proposed presentation categories:**

- Low
- Moderate
- High
- Critical
- Unknown

**Proposed tone treatment:**

✅ **Resolved (Oct 27, 2026):** the UCL card shows the category as colored text after the score ("7 Moderate"; "7 Moderate risk" until Oct 29, 2026, when "risk" was dropped), with no pill, so it never looks like an alert. The colors follow the table below; Low uses the default text color. Only Moderate is drawn in Figma so far. Categories and colors still need clinical approval (OD-03). ⚠️ **On hold (Oct 29, 2026):** every level shows as neutral text, with no color, until acuity's design is decided (DESIGN.md "Patient card").

| Category | Tone | Tokens |
|---|---|---|
| Low | Neutral (grey) | `neutral-muted` |
| Moderate | Yellow | `corn-100` fill, `corn-700` text, through a new semantic token (e.g. `caution`) |
| High | Orange | `warning` family |
| Critical | Red | `destructive` family, subtle fill or outline |
| Unknown | Neutral (grey), with `—` instead of a number | `neutral-muted` |

- ℹ️ Moderate is yellow so it doesn't look like Low or Unknown. Low and Unknown share the grey but differ by content: Low shows a number and "Low", Unknown shows `—` and "Unknown".
- ℹ️ Yellow (`corn`, hue ≈ 90) and orange (`warning`, hue ≈ 60) are separate scales, so Moderate and High stay distinct. They are still close for some colorblind users, so the category word always carries the meaning (PC-160).
- ℹ️ Acuity is colored text, with no fill. Solid fills with an icon stay reserved for alert blocks, so Critical acuity never looks like a Critical alert.
- ⚠️ **Gap:** `theme.css` has `corn` only as a primitive, with no semantic token. Add one (e.g. `caution`, `caution-subtle`, `caution-foreground`) in archielabs.ds for both `intercept` and `intercept-dark`, then sync it to `theme.css` (a minor version). Keep yellow for the fill and use `corn-700` or darker for text, since yellow text on white fails contrast.
- ⚠️ **Gap:** the UCL Badge has no status tones (its tones are `blue`, `green`, `sky`, `purple`, `red`). Acuity and alert severity need status variants such as `neutral`, `caution`, `warning` and `destructive-subtle`, designed in intercept.ds first.

**Requirements:**

- Categories and numerical boundaries require explicit clinical approval.
- Display the scoring model's name or make it available through detail.
- Do not present arbitrary score categories as clinically validated.
- Do not equate high acuity with an active critical alert.

**Score change:**

The change in the score matters more than the number. Sepsis-3 treats a rise of 2 or more SOFA points as a sign of organ dysfunction, so a patient going from 4 to 7 may need more attention than one stable at 10. The card shows the score with its observed change over a stated period, not a status word such as "Stable".

✅ **Resolved:** the comparison window is **24 hours** by default.

| Situation | On the card | Tone |
| --- | --- | --- |
| Rising by 2 or more | `SOFA 7 · Moderate  ▲ +3 in 24 h` | Emphasized: severity tone plus an icon, never color alone (PC-160) |
| Rising by 1 | `SOFA 7 · Moderate  ▲ +1 in 24 h` | Neutral |
| No change | `SOFA 10 · High  No change in 24 h` | Neutral |
| Falling | `SOFA 6 · Low  ▼ −2 in 24 h` | Neutral, never a "good news" green |
| Only one score in the window | `SOFA 7 · Moderate  First score 06:00` | Neutral (PC-031 "Insufficient data") |
| No score | `Acuity unavailable` | Neutral (Unknown) |

**Data fields:**

| Placeholder | Data field | Example |
| --- | --- | --- |
| `{acuity-scoring-system}` | `acuityScoringSystem` | `"SOFA"` |
| `{acuity-score}` | `acuityScore` | `7` |
| `{acuity-category}` | `acuityCategory` | `"moderate"` |
| `{acuity-change}` | `acuityChange` | `+3` |
| `{acuity-change-period}` | `acuityChangePeriod` | `"24 h"` |
| *(details only)* | `acuityCalculatedAt` | `"2026-10-23T06:00:00Z"` |
| *(details only)* | `acuitySource` | `"EMR"` |
| *(details only)* | `acuityTrajectory` (PC-031) | `"deteriorating"` |

- ℹ️ "Stable" is an interpretation, not data: a patient unchanged at SOFA 10 still has serious organ failure (see PC-043). "+3 in 24 h" states what was measured and over what period, and leaves the judgment to the clinician.
- ℹ️ The triangle shows the direction and the tone shows the meaning. On SOFA ▲ is always worse; on the Rothman Index ▲ is better (PC-045). Triangles and arrows have separate meanings (PC-144).
- ℹ️ The acuity line shows the change only. A rise of 2 or more with suspected infection is a sepsis signal, and it comes from Virtual Sepsis (PC-080) as a sepsis state or alert, never from the acuity line.
- ℹ️ Screen readers get the full sentence, e.g. "SOFA 7, moderate, up 3 points in 24 hours."

### PC-031 — Clinical trajectory

**Definition:** Description of changes in patient clinical condition during a defined period.

**Proposed statuses:**

- Improving
- Relatively stable
- Deteriorating
- Insufficient data

**Requirements:**

- Use only an approved calculation or documented clinical assessment.
- Retain the measurement period.
- Do not infer trajectory from a single isolated observation.
- Distinguish observed trends from predictions.

ℹ️ On the card, trajectory shows as the acuity score change over a 24-hour window (PC-030, "Score change"). The trajectory status itself (`acuityTrajectory`) appears in the details, not as a word on the card.

**Overall condition (stable / unstable / guarded):**

The card shows the **acuity level** (the patient's measured severity at the last calculation, on one named score) and its 24-hour change. It does not show an overall condition status such as "Stable", "Unstable" or "Guarded".

| Concept | What it is | On the card |
| --- | --- | --- |
| Acuity level | A measurement: one named score, its category and the time it was calculated (PC-030). | Yes |
| Overall condition | A clinical judgment of how the patient is doing, combining acuity, trajectory, alerts, vitals and bedside assessment. | No |

Why the overall condition stays off the card for now:

- No standard definition exists, and nothing in the patient data can calculate it. A system-assigned "Stable" would be a guess.
- "Stable" can make a clinician scanning 30 cards skip a patient who still needs attention (PC-043, PC-120).
- PC-031 allows trajectory only from an approved calculation or a documented clinical assessment.
- Hospital condition terms (Good, Fair, Serious, Critical) are meant for families and the press. In an ICU almost every patient is Serious or Critical, so they wouldn't tell patients apart.

If the client wants it, the only safe form is a clinician-set status, attributed and timestamped like a Clinician Intuition Alert (PC-073), e.g. "Marked unstable by Dr. Patel · 08:10".

⚠️ **Decision needed:** whether the card shows an overall condition at all, who sets it (clinician only, never the system) and with what vocabulary. To discuss with the client (OD-17). Until then the card shows the acuity score only.

### PC-032 — Deterioration prediction

**Status:** Roadmap / gated.

Predictive deterioration capabilities must not appear as operational clinical predictions in v1 unless separately approved and appropriately governed.

---

## 7. Physiological monitoring

### 7.1 Required monitoring-field support

The card data contract must support the following observation types. This does not mean every field must always be displayed.

| Field | Description | Units |
|---|---|---|
| HR | Heart rate | bpm |
| BP | Systolic and diastolic blood pressure | mmHg |
| MAP | Mean arterial pressure | mmHg |
| SpO₂ | Peripheral oxygen saturation | % |
| RR | Respiratory rate | breaths/min |
| Temperature | Body temperature | °C or °F |

### PC-040 — Observation data contract

Every observation must support:

- Observation type
- Numeric value or applicable structured measurement
- Unit
- Measurement timestamp
- Source system/device
- Validity and quality state
- Freshness state
- Relevant alert status
- Reference/threshold configuration, where applicable

### PC-041 — Observation display

Requirements:

1. Display units consistently.
2. Preserve configured decimal precision.
3. Display unavailable values as unavailable, not zero.
4. Do not invent measurements to fill empty fields.
5. Preserve separate timestamps when different observations update independently.
6. Never imply that all observations share the same freshness merely because the card was recently refreshed.
7. Show source and measurement details through progressive disclosure when needed.

### 7.2 Observation states

These are proposed UI states; freshness limits and clinical threshold logic remain configurable and subject to approval.

| Status | Meaning |
|---|---|
| Within configured limits | The observation does not violate the applicable configured limit. |
| Outside configured limits | The observation violates at least one configured limit. |
| Critical threshold triggered | An approved critical-alert rule has fired. |
| Stale | The observation exceeds the permitted freshness interval. |
| Unavailable | No valid current observation is available. |
| Invalid / questionable | The observation cannot be trusted without further validation. |

**PC-042:** Measurement status must not be communicated through color alone.

**PC-043:** A value within configured limits must not be represented as proof that the patient is clinically stable.

**PC-044:** Alert thresholds must be sourced from an approved clinical configuration, not hardcoded into the design system.

### 7.3 Observation trends

The expanded card may display trends when supported.

**Proposed behavior:**

- Compact historical trend preview.
- Directional trend indicator.
- Explicit observation period.
- Access to a detailed surveillance chart.

**PC-045:** Trend direction and clinical interpretation must remain distinct.

An increasing value is not universally an improving or worsening clinical condition.

---

## 8. Respiratory support and ventilation

### PC-050 — Respiratory support

**Definition:** Type of respiratory assistance the patient currently receives.

**Proposed representation:**

- Room air
- Supplemental oxygen
- Noninvasive ventilation
- Invasive mechanical ventilation
- Unknown/unavailable

Specific status mapping requires approval from the responsible clinical team.

### PC-051 — Ventilator data

Supported attributes may include:

- Ventilator presence/status
- Ventilator mode
- FiO₂
- PEEP
- Current device settings
- Settings observation timestamp
- Source and quality state

The complete set of displayed parameters must follow the approved respiratory surveillance workflow.

### PC-052 — Ventilator-order mismatch

**Definition:** A detected difference between observed ventilator settings and the relevant active physician order.

**Proposed statuses:**

| Status | Meaning |
|---|---|
| No mismatch detected | Comparable values align under the approved matching rule. |
| Mismatch detected | One or more values differ under the approved rule. |
| Review required | A discrepancy requires clinician evaluation. |
| Comparison unavailable | Required order or telemetry data is absent, stale, or incomparable. |

**Requirements:**

- Surface detected mismatches through the clinical alert framework.
- Link to the supporting evidence.
- Preserve device and order source timestamps.
- Require clinician review.
- Do not autonomously modify orders or device settings.

---

## 9. Medications and infusions

### PC-060 — Continuous infusion context

**Definition:** Clinical information about actively administered continuous infusions where integration supports access.

**Supported data:**

- Medication/infusion name
- Active administration status
- Current rate
- Rate unit
- Last update timestamp
- Source
- Data-quality state

**Proposed statuses:**

- Active
- Paused
- Stopped
- Unavailable
- Unknown

**PC-061:** Infusion information must only appear when supported by the available hospital data and approved patient-surveillance configuration.

**PC-062:** Smart-pump telemetry must not be assumed to be universally available. Smart infusion-pump integration is optional in v1.

**PC-063:** A missing pump feed must not be interpreted as proof that an infusion has stopped.

---

## 10. Clinical alerts

### 10.1 Alert model

The Patient card consumes alerts from Clinical Alerting & Events.

Supported alert origins include:

- Physiological threshold events
- Derived acuity events
- Protocol events
- Sepsis screening
- Ventilator-order mismatch
- Clinician Intuition Alerts
- Relevant operational events

### PC-070 — Alert severity

Proposed severity taxonomy:

| Severity | Meaning |
|---|---|
| Critical | Highest configured urgency. |
| High | Significant event requiring prompt review. |
| Medium | Clinically relevant event requiring review. |
| Low | Lower-priority event or informational concern. |

**Decision required:** Final severity names, mapping, ordering, and associated clinical behaviors.

### PC-071 — Alert lifecycle

The System Specification explicitly requires acknowledgment, escalation, resolution, and auditing. The following state vocabulary is proposed for the UI.

| State | Meaning |
|---|---|
| Active | Alert exists and remains unresolved. |
| Acknowledged | Authorized clinician acknowledged the alert. |
| Escalated | Alert has been routed for additional clinical attention. |
| Resolved | Alert has a documented resolution. |

**Rules:**

- Acknowledgment does not automatically resolve an alert.
- Escalation does not automatically close an alert.
- Resolved events remain available in the appropriate history.
- All clinically significant state transitions require auditability.

### PC-072 — Alert summary

The card should display:

- Highest-priority unresolved alert, if any
- Total relevant active-alert count
- Condensed alert type/description
- Access to full alert details

**Proposed display rule:** Show one primary alert summary and aggregate additional alerts behind an accessible count or detail view.

✅ **Resolved (compact card):**

| Active alerts | Alert line |
|---|---|
| None | Neutral line: "No active alerts", with "None in 24 h" when no alert fired in the last 24 hours. |
| One | Severity word, description and status, in that alert's severity tone and icon, e.g. "Critical · SpO₂ below 85% · Active for 4:32". |
| Two or more | The count ("3 active alerts") with a **Quick view** button. The icon and color match the **highest severity** among the active alerts. |

- ℹ️ Quick view opens a popover listing every active alert (PC-101). The accessible label states the count and the highest severity, e.g. "3 active alerts, highest Critical", so severity is never conveyed by color alone (PC-160).

### PC-073 — Clinician Intuition Alerts

**Definition:** Manually created clinical concern raised by an authorized clinician.

Supported context includes:

- Rationale
- Watch-list category
- Suggested monitoring focus
- Suggested review timeline
- Clinician identity
- Creation timestamp
- Lifecycle state

**Requirements:**

- Clearly distinguish clinician-created concerns from machine-generated events.
- Preserve unresolved concerns through shift handoff.
- Support acknowledgment, escalation, and resolution by authorized clinicians.

---

## 11. Virtual Sepsis

### 11.1 Overview

The Virtual Sepsis module continuously screens relevant patient populations using applicable sepsis criteria and tracks validated cases through configured intervention and reporting workflows.

The Patient card provides a concise summary only.

### PC-080 — Sepsis screening state

**Proposed statuses:**

| Status | Meaning |
|---|---|
| No candidate identified | Available screening evidence has not generated a candidate. |
| Candidate identified | Screening criteria suggest possible sepsis requiring review. |
| Awaiting validation | Candidate is pending authorized clinician assessment. |
| Insufficient data | Necessary screening inputs are unavailable. |
| Excluded | An applicable approved population exclusion has been established. |

**Requirements:**

- Do not equate a negative screen with sepsis being clinically ruled out.
- Maintain evidence provenance.
- Identify which criteria contributed to the screening event.
- Do not use AI screening as an autonomous diagnosis.

### PC-081 — Sepsis validation

**Proposed states:**

- Pending review
- Confirmed
- Rejected
- Excluded following adjudication

The platform must preserve the difference between a screening candidate and a clinician-validated case.

### PC-082 — Sepsis evidence

Relevant evidence can include:

- SIRS criteria
- Organ-dysfunction indicators
- Suspected infection information
- Relevant observations
- Relevant laboratory results
- Source timestamps

**Requirements:**

- Detailed evidence appears in the Virtual Sepsis workflow.
- The card only summarizes the supported screening or tracking state.
- Missing information must remain distinguishable from negative criteria.

### PC-083 — Bundle tracking

For cases requiring tracking, support:

- Applicable protocol
- Bundle start time
- Three-hour bundle tracking
- Six-hour bundle tracking
- Applicable element completion state
- Relevant next deadline
- Current bundle compliance state

**Proposed summary statuses:**

- On track
- Off track
- Awaiting required information
- Tracking completed

**PC-084:** Regulatory SEP-1 state and hospital-specific protocol compliance must remain logically distinct.

**PC-085:** Never calculate bundle deadlines using an invented or estimated start time without explicitly indicating the uncertainty and applying approved rules.

---

## 12. Data availability and freshness

### PC-090 — Freshness state

**Proposed statuses:**

| Status | Definition |
|---|---|
| Current | Data falls within its configured freshness interval. |
| Stale | Data is older than its configured freshness interval. |
| Unavailable | Data cannot currently be retrieved. |
| Reconnecting | Source connection has been interrupted and recovery is in progress. |
| Partial | Only part of the required data set is available. |
| Invalid | Data cannot be treated as valid due to an identified quality problem. |

### PC-091 — Freshness behavior

- Preserve the timestamp of the last valid observation.
- Never silently replace an unavailable value with an old value presented as live.
- Indicate partial data availability.
- Differentiate stale data from stale integration status.
- Support refresh after connection recovery.
- Do not fabricate readings during outages.

### PC-092 — Data provenance

Every clinically important data item must retain:

- Originating tenant
- Source system/device
- Observation timestamp
- Ingestion timestamp, where applicable
- Quality/validation metadata
- Supporting evidence/reference where applicable

The UI should reveal provenance through detail or an appropriate inspection interaction without overwhelming the compact card.

---

## 13. Interaction requirements

### PC-100 — Open patient

Selecting the card's primary interaction navigates to the corresponding patient within Provider Desktop.

✅ **Resolved:** the whole card is clickable and opens the **Patient details** page.

ℹ️ The page is defined in PRD — Patient details (`prds/patient-details.md`).

Requirements:

- Preserve patient identity and hospital context.
- Honor authorization boundaries.
- Avoid unnecessary context switching between external systems.
- Do not navigate to another patient's chart due to stale or recycled bed information.

### PC-101 — View clinical alerts

When active alerts exist, the clinician must be able to access the relevant alert information.

The detailed workflow is owned by Clinical Alerting & Events.

✅ **Resolved:** with two or more active alerts, **Quick view** opens a popover listing them, without leaving the census. Clicking anywhere else on the card opens Patient details (PC-100).

- ℹ️ Quick view is a separate control, not nested inside the card's link, so each has its own keyboard focus and accessible name (PC-161). Activating Quick view must not also open Patient details.

### PC-102 — View surveillance

The clinician can access richer physiological observations, trends, and relevant telemetry context.

### PC-103 — Open Virtual Sepsis

Where a relevant screening or tracking event exists, the clinician can navigate to the correct patient-specific Virtual Sepsis context.

### PC-104 — Access communication

Authorized clinicians may access configured messaging and coordination workflows.

### PC-105 — Bedside camera

Where permitted and available, the clinician may navigate to or open the bedside telepresence experience.

### PC-106 — Patient chart and orders

The clinician can access detailed clinical information and supported order workflows.

The Patient card itself is not an order-entry or documentation surface.

### PC-107 — Interaction separation

- Card navigation and nested controls must not conflict.
- Explicit controls must have accessible labels.
- Keyboard users must be able to reach every available action.
- Clinical state changes must not occur from accidental card selection.
- Any action requiring clinical approval must preserve that approval step.

---

## 14. Conditional visibility rules

| Field/group | Compact | Expanded | Visibility rule |
|---|---|---|---|
| Patient identity | Yes | Yes | Always, subject to access policy |
| Hospital / bed | Yes | Yes | Display available authorized location |
| Core observations | Selected | Configured set | Respect data availability |
| Acuity | Conditional | Conditional | Approved score/model available |
| Clinical trajectory | Conditional | Conditional | Valid supported calculation available |
| Active-alert summary | Yes, when present | Yes, when present | Relevant unresolved alert exists |
| Respiratory support | Conditional | Yes, when available | Applicable and sourced |
| Ventilator parameters | No by default | Conditional | Patient ventilated and parameters available |
| Infusion information | No by default | Conditional | Supported and relevant |
| Sepsis state | Conditional | Conditional | Relevant screening/tracking context |
| Data freshness | Only when degraded | Only when degraded | Live by default; a connectivity alert with a refresh CTA when data is lost or delayed (PC-128) |
| Contextual actions | Limited | Expanded | Permission and capability dependent |

**PC-110:** Optional fields must not leave meaningless placeholders or empty visual containers.

**PC-111:** Clinical alerts must not be hidden merely because a less detailed card variant is selected.

**PC-112:** Additional information should use progressive disclosure rather than uncontrolled card growth.

---

## 15. Component states

### PC-120 — Default

Patient identity and available clinical observations display without unresolved alerts.

This state must not imply that the patient has no clinical risk.

### PC-121 — Active alert

Card communicates the highest-priority relevant unresolved alert and allows access to details.

### PC-122 — Multiple alerts

Card summarizes alerts without suppressing access to the complete set.

### PC-123 — Sepsis candidate

Card identifies the patient as a screening candidate, without displaying a confirmed diagnosis.

### PC-124 — Confirmed sepsis under tracking

Card shows the supported bundle state and relevant next action or time window.

### PC-125 — Ventilator mismatch

Card surfaces the associated discrepancy alert, supporting clinician review.

### PC-126 — Stale observations

Card preserves last-known values with explicit stale indicators and timestamps.

### PC-127 — Partial data

Available observations remain visible while missing observations are clearly differentiated.

### PC-128 — Disconnected

Card communicates loss of data connectivity without implying all values are current.

✅ **Resolved:** cards always show live data, with no freshness indicator in the normal state. When connectivity is lost or data is significantly delayed, a connectivity alert appears in the alert slot with a CTA to refresh (reconnect). Affected values keep their stale treatment (V3).

⚠️ **Decision needed:** the delay that counts as "significant" (OD-06).

### PC-129 — Patient transfer

Location updates after authoritative ADT information is received. Coverage visibility is re-evaluated.

### PC-130 — Patient discharge

Card leaves the active surveillance census according to approved reconciliation policy.

### PC-131 — Restricted access

The interface does not disclose unauthorized patient information.

### PC-132 — Shift handoff

Unresolved clinical concerns and relevant inherited work remain accessible to the incoming authorized clinician.

### 15.1 Scenario layers

The full set of Patient card scenarios for design and prototype work. They are layers to combine, not one flat list: a card shows one alert slot scenario (A), with a status modifier (S) when it has an alert, plus a vitals scenario (V), patient context (P) and a card-level state (K). Each scenario has an ID (e.g. A4 + S3 + V2) that Figma variants and prototype scenarios (OD-13) can refer to.

ℹ️ All severities, statuses and colors here are *proposed* and follow the open decisions on severity (OD-03, OD-05) and freshness (OD-06). Names in the examples (RN Lee, Dr. Patel) are synthetic (PC-180).

#### 1. Alert slot: what can appear

| # | Scenario | Severity | Category | Source | Display |
|---|---|---|---|---|---|
| A1 | No active alerts | — | — | — | 🔔 "No active alerts", neutral one-liner |
| A2 | Critical clinical, AI | Critical | Clinical | AI agent | Red block, octagon icon, agent chip |
| A3 | Critical clinical, device | Critical | Clinical | Device | Red block, "Bedside monitor" tag instead of agent chip |
| A4 | High clinical, AI | High | Clinical | AI agent | Orange block (e.g. ventilator-order mismatch, PC-052) |
| A5 | High clinical, rule | High | Clinical | Rule | Orange block, "Protocol" tag |
| A6 | Medium clinical | Medium | Clinical | AI / rule | Neutral or teal block, circle-alert icon |
| A7 | Low operational | Low | Operational | System | Blue block, "Operational" tag (e.g. bedside monitor feed interrupted) |
| A8 | Low / medium administrative | Low–Med | Administrative | Rule / manual | Grey block, "Admin" tag |
| A9 | Manual (staff-raised) | Any | Clinical | Manual | "Flagged by RN Lee" instead of agent chip (Clinician Intuition Alert, PC-073) |

- ✅ **Resolved:** the compact card doesn't show the alert source (agent chip, "Bedside monitor", "Protocol", "Flagged by…"). The source appears in the Quick view popover, the alert details and other card layouts, which keeps the machine-versus-clinician distinction available (PC-073).
- ⚠️ **Gap:** alert **category** (Clinical, Operational, Administrative) and alert **source** (AI agent, Device, Rule, Manual, System) are new dimensions. PC-070 defines only severity, and §10.1 lists origins without grouping them. Administrative alerts aren't among the §10.1 origins.
- ⚠️ **Decision needed:** the tone for Medium (A6): neutral or teal.
- ℹ️ Severity colors come from the `theme.css` tone tokens, never raw hex. Every severity also carries its icon and text label, so it never relies on color alone (PC-160).
- ℹ️ A1 must not read as "patient is stable" (PC-120).

#### 2. Alert status modifiers (apply to A2–A9)

| # | Status | Display change |
|---|---|---|
| S1 | Active, new (under 1 min) | Pulsing dot or "New" tag, timestamp "Just now" |
| S2 | Active | "Active · 6 min" |
| S3 | Active, overdue (past response target) | Timestamp in severity colour, "Active · 32 min · Overdue" |
| S4 | Acknowledged | Lighter tint, "Ack'd by RT Lee · 2 min" |
| S5 | Escalated | "Escalated to Dr. Patel" + escalate icon |
| S6 | Snoozed | Collapsed one-liner, "Snoozed until 14:30" |
| S7 | Resolved recently (under 15 min) | Green check, "Resolved · 3 min ago", fades out |

- ⚠️ **Decision needed:** **Snoozed** (S6) isn't in the PC-071 lifecycle (Active, Acknowledged, Escalated, Resolved). Decide whether it exists, who can snooze, and whether Critical alerts can be snoozed at all.
- ⚠️ **Gap:** the response targets that make an alert **Overdue** (S3) aren't defined.
- ⚠️ **Risk:** a pulsing dot (S1) conflicts with PC-173 ("avoid continuous visual effects") unless it stops when the 1-minute "new" window ends, and it must respect reduced motion. The same applies to the S7 fade-out.
- ℹ️ S1–S3 are display modifiers of Active, not new lifecycle states. S7 leaves the card, but the alert stays in history (PC-071).

#### 3. Multiple alerts

| # | Scenario | Display |
|---|---|---|
| M1 | 2 or more alerts, same severity | "N active alerts" + Quick view, in that severity's icon and color |
| M2 | Mixed severity | "N active alerts" + Quick view, in the highest severity's icon and color |
| M3 | Clinical and operational together | Counted together; the line takes the highest severity. Quick view lists clinical alerts first |

- ✅ **Resolved:** with two or more alerts the compact card shows the count, not the top alert's text (PC-072). Quick view opens the full set (PC-122).
- ℹ️ The order inside Quick view (newest first within a severity) is part of OD-05.

#### 4. Content edge cases

| # | Scenario | Handling |
|---|---|---|
| C1 | Long title | Cut off after one line with "…", full text on hover or Open |
| C2 | Long agent name | Chip cut off; keep "· AI" visible |
| C3 | Very old alert (over 24 h) | "Active · 1 d" |

- ⚠️ **Accessibility:** the full title in C1 must also be available on keyboard focus and to screen readers, not only on hover (PC-161).

#### 5. Vitals row

| # | Scenario | Display |
|---|---|---|
| V1 | Normal | Default values |
| V2 | Out of range | Value in severity colour + ↑/↓ arrow |
| V3 | Stale (feed interrupted, goes with A7) | Values greyed; the connectivity alert shows "Last updated 6 min ago" and a refresh CTA (PC-128) |
| V4 | Missing / not monitored | "—" |
| V5 | Loading | Skeleton bars |
| V6 | Trend view | Small trend line per vital; "Current" footer label toggles to "Trend" |

- ⚠️ **Risk:** in V2 the ↑/↓ arrow means above or below the configured limit, not a trend. Changes over time use ▲/▼ triangles instead (PC-144, PC-045). V2 maps to "Outside configured limits" in §7.2, and V1 to "Within configured limits".
- ℹ️ V3 keeps each vital's own timestamp (PC-041). V4's "—" is announced as "unavailable" to screen readers, never as zero. V6 follows §7.3 and OD-07.

#### 6. Patient context (header and tags)

| # | Scenario | Display |
|---|---|---|
| P1 | Device / therapy tags | Ventilated, On pressors, Dialysis, ECMO |
| P2 | Safety tags | Isolation (contact/droplet), Fall risk, Allergy |
| P3 | Code status | DNR / DNI badge, often in red outline |
| P4 | No tags | Tag row hidden |
| P5 | Transfer pending | "MICU · Bed 9 → CCU" |
| P6 | Discharged / deceased | Card greyed out, read-only |
| P7 | Multi-site | Site badge visible (CVMC); hidden in single-site setups |

- ℹ️ Each tag shows as a pill (UCL Badge). In P1, the **Ventilated** pill means invasive mechanical ventilation only (PC-050). A patient on noninvasive ventilation (a BiPAP or CPAP mask, no tube) gets its own **NIV** pill, never "Ventilated". Neither pill shows for room air or supplemental oxygen.
- ⚠️ **Gap:** safety tags (P2) and code status (P3) aren't in the PRD's data model yet. P1 partly maps to respiratory support (PC-050) and infusions (PC-060). Include them in OD-01 (mandatory fields).
- ⚠️ **Gap:** "Transfer pending" (P5) isn't a census state in §5, and "Deceased" (P6) isn't one either. PC-130 says a discharged card leaves the active census; decide whether it shows greyed out first, and for how long.
- ✅ **Resolved:** P4 matches PC-110 (no empty containers), and P7 matches PC-013 (facility context in multi-hospital views).

#### 7. Card-level states

| # | State | Display |
|---|---|---|
| K1 | Default | Base card |
| K2 | Hover | Shadow + border |
| K3 | Selected | Brand-colour ring |
| K4 | Focused (keyboard) | Focus ring |
| K5 | Loading | Full skeleton |
| K6 | Error (data unavailable) | Connectivity alert in the alert slot + refresh CTA (PC-128) |

- ℹ️ The selected ring (K3) and focus ring (K4) must look different, because a card can be both. K6 relates to PC-128 (Disconnected), and its copy is part of OD-14.

---

## 16. Clinical data and presentation safety

### PC-140 — Clinical interpretation

The UI must differentiate between:

1. Raw clinical observations
2. Derived measurements or clinical scores
3. AI-generated screening results
4. Clinician-validated findings
5. Active clinical alerts
6. Administrative or workflow statuses

These categories must not be collapsed into one universal status.

### PC-141 — AI-generated information

AI-generated clinical information must preserve:

- Source agent
- Relevant evidence
- Generation timestamp
- Applicable confidence or validation metadata, when supported
- Human review requirements

No AI-generated recommendation may be presented as an autonomous clinical decision unless separately authorized under the platform's governance framework.

### PC-142 — Clinical thresholds

Thresholds and severity mappings must be defined through approved clinical configuration, including relevant patient or population considerations.

The UI implementation must not establish its own independent clinical thresholds.

### PC-143 — Missing data

The absence of information must never be treated as evidence of a normal clinical state.

### PC-144 — Direction indicators

The card uses two direction shapes, and each has one meaning only:

| Shape | Meaning | Used for | Example |
|---|---|---|---|
| ▲ ▼ triangle | **Change over time:** the value rose or fell over a stated period. | Acuity score change (PC-030), trends | `▼ −1` in "Change in last 24 h" |
| ↑ ↓ arrow | **Out of range:** the current value is above or below its configured limit. | Vitals outside configured limits (§7.2, §15.1 V2) | `SpO₂ 82 ↓` |

**Requirements:**

- Never use an arrow for a change over time, or a triangle for an out-of-range value. A clinician who learns "arrow = out of range" from the vitals must not read a change as out of range.
- The triangle goes before the number (`▼ −1`), and the arrow goes after the value (`82 ↓`).
- The triangle goes with the **change**, never alone next to a **value**. When the number is the change, the triangle and the sign always agree: ▲ with `+`, ▼ with `−`.
- A value can be negative and still trending up, e.g. RASS going from −2 to −1, or base excess. Show the value and its change separately, so the triangle's number is always the change: `RASS −1   ▲ +1 in 24 h`, never `RASS ▲ −1`.
- Keep the sign with the triangle (`▼ −1`, not `▼ 1`), and use a real minus sign (`−`, U+2212), not a hyphen.
- The shape shows the direction; the tone shows the meaning. A ▲ on SOFA is worse, and a ▲ on the Rothman Index is better, so tone follows the clinical meaning, never the shape (PC-045).
- An out-of-range arrow always comes with the value in its severity tone (V2). A change triangle is neutral unless the change itself needs attention (e.g. a SOFA rise of 2 or more).
- Neither shape is the only signal (PC-160). Screen readers read the full meaning: "down 1 point in 24 hours", "SpO₂ 82 percent, below range".

---

## 17. Multi-tenant and authorization requirements

### PC-150 — Tenant isolation

Patient data must remain within its originating hospital tenant.

A multi-hospital workspace may compose patient cards from authorized facilities at the presentation layer, but must not merge their underlying identifiable patient records.

### PC-151 — Role-based visibility

Patient cards may only expose information authorized for the current user, hospital, assignment, and clinical role.

### PC-152 — Access enforcement

Authorization must be enforced by the relevant system services, not solely through hidden or disabled UI controls.

### PC-153 — Auditability

Relevant patient access and clinical interactions must support the platform's audit and compliance model.

---

## 18. Accessibility requirements

### PC-160 — Color independence

Alert severity, clinical status, and data freshness must never be communicated exclusively through color.

### PC-161 — Keyboard support

All card-level interactions must be keyboard operable and have visible focus indicators.

### PC-162 — Semantic structure

The component must expose meaningful accessible labels for:

- Patient identity
- Hospital and location
- Clinical observations and units
- Alert priority and state
- Data freshness
- Available actions

### PC-163 — Live updates

Frequent monitoring updates must not continuously interrupt screen-reader users.

Meaningful actionable changes should use an appropriate, governed announcement strategy.

### PC-164 — Responsive behavior

Support reflow, text resizing, and different viewport densities without clipping clinically significant information.

### PC-165 — Accessibility target

Target WCAG 2.2 AA, subject to platform-level acceptance standards.

---

## 19. Real-time behavior and motion

### PC-170 — Observation updates

The card consumes authorized data updates from the platform's telemetry and patient aggregation services.

Each affected data item should update without requiring a full-screen reload.

### PC-171 — Layout stability

Routine updates should not cause distracting card movement or unexpected reordering.

### PC-172 — Alert changes

New, escalated, or resolved alerts should cause the appropriate clinical status presentation to update.

### PC-173 — Motion

Motion must support comprehension rather than decoration.

- Do not animate every numerical value update.
- Do not delay clinical action availability.
- Respect reduced-motion preferences.
- Avoid continuous visual effects that increase cognitive load.

### PC-174 — Sorting

If cards can be sorted by clinical priority, use approved deterministic rules.

A patient should not unexpectedly change position on every observation update.

Any automatic repositioning policy must be validated against the clinical surveillance workflow.

---

## 20. Prototype requirements

The Design Phase Team Brief establishes a synthetic-data prototype rather than production clinical software.

### PC-180 — Synthetic data

The prototype must use synthetic patient information only.

No real patient information may appear in:

- Prototype databases
- Data simulation inputs
- Screenshots
- Design files
- Demo materials

### PC-181 — Real-time simulation

The Patient card must support simulated data changes, including:

- Physiological changes
- Alert creation and resolution
- ADT changes
- Sepsis screening and tracking events
- Respiratory data updates
- Temporary data interruption and recovery

### PC-182 — Scenario continuity

Simulated changes must remain consistent across related UI surfaces.

For example, an alert created during a patient-deterioration scenario must produce a consistent state in the Patient card and the clinical alert detail.

### PC-183 — Scope controls

The final demonstration scenarios must be selected and approved through the Intercept design-phase process.

This PRD proposes component scenarios but does not expand the agreed prototype demonstration scope.

### PC-184 — External presentation constraints

Do not depict unauthorized or unsupported hospital integration mechanisms in externally presented demonstration materials.

The prototype must not be represented as production-ready clinical software.

---

## 21. Acceptance criteria

### Identity and location

- **PC-AC-01:** Given an admitted patient with authorized identity and location information, the card displays the correct patient and facility context.
- **PC-AC-02:** Given an authoritative bed transfer, the card updates the displayed location.
- **PC-AC-03:** Given a patient outside the user's access scope, the card does not expose unauthorized data.

### Clinical observations

- **PC-AC-04:** Given current observations, the card displays supported values with correct units.
- **PC-AC-05:** Given a missing observation, the card displays an unavailable state rather than zero.
- **PC-AC-06:** Given an observation exceeding its freshness interval, the card identifies it as stale.
- **PC-AC-07:** Given observations with different update times, the card preserves the separate freshness contexts.

### Alert lifecycle

- **PC-AC-08:** Given an unresolved clinical alert, the card displays a relevant alert indicator.
- **PC-AC-09:** Given multiple unresolved alerts, the card identifies the highest-priority alert according to approved ordering rules and exposes the remaining alerts.
- **PC-AC-10:** Given an acknowledged alert, the card does not automatically mark it resolved.
- **PC-AC-11:** Given an escalated alert, the card preserves access to escalation context.
- **PC-AC-12:** Given a resolved alert, the active-alert summary updates without destroying historical traceability.

### Sepsis

- **PC-AC-13:** Given a positive screening candidate awaiting validation, the card does not claim a confirmed diagnosis.
- **PC-AC-14:** Given a clinician-validated sepsis case under active tracking, the card displays the supported tracking state.
- **PC-AC-15:** Given insufficient screening data, the card does not represent the patient as conclusively screen-negative.

### Respiratory monitoring

- **PC-AC-16:** Given supported respiratory data, the expanded card can display the relevant respiratory-support context.
- **PC-AC-17:** Given a detected ventilator-order mismatch, the card provides access to the associated alert and evidence.
- **PC-AC-18:** Given unavailable ventilator data, the card does not infer that no mismatch exists.

### Component behavior

- **PC-AC-19:** The compact and expanded variants represent the same patient state.
- **PC-AC-20:** Selecting the primary card interaction opens the correct patient detail.
- **PC-AC-21:** Nested controls do not accidentally trigger unrelated card navigation.
- **PC-AC-22:** Frequent observation updates do not cause unnecessary disruptive movement.
- **PC-AC-23:** Important states remain understandable without relying exclusively on color.
- **PC-AC-24:** Every available card action is keyboard accessible.

### Prototype consistency

- **PC-AC-25:** Synthetic surveillance updates propagate consistently to relevant card fields.
- **PC-AC-26:** Simulated source disconnection produces a clearly identifiable degraded-data state.
- **PC-AC-27:** The prototype never exposes real patient information.
- **PC-AC-28:** Demonstration clinical states are not misrepresented as validated production decision support.

---

## 22. Dependencies

### Experience modules

- Provider Desktop
- Tele-Critical Care Clinical Surveillance
- Clinical Alerting & Events
- Care Coordination, Communication & Telepresence
- Order Entry
- Clinical Documentation

### Intelligence modules

- Virtual Sepsis

### Core services

- Patient Data Aggregation
- Telemetry Ingestion
- Tenancy and Data Isolation
- Authorization and Role Management
- Audit and Compliance Logging
- Work Management and Inbox
- Notifications

### AI agents

- Sepsis Sniffer
- Sepsis Tracker
- Vent-Order Mismatch Agent

### Roadmap dependency

- Deterioration Predictor

---

## 23. Open decisions

| ID | Decision | Owner |
|---|---|---|
| OD-01 | Confirm the mandatory fields for compact and expanded variants. | Product / Clinical |
| OD-02 | Select approved acuity scoring methodology. | Clinical |
| OD-03 | Define clinical severity labels and threshold mappings. | Clinical |
| OD-04 | Approve the patient census status model. | Product / Clinical |
| OD-05 | Finalize the alert severity taxonomy and prioritization rules. | Clinical / Product |
| OD-06 | Define permitted observation freshness intervals. | Clinical / Engineering |
| OD-07 | Confirm observation trend calculations and displayed time horizons. | Clinical / Product |
| OD-08 | Confirm the exact respiratory parameters shown in expanded cards. | Clinical |
| OD-09 | Define which sepsis states surface on the Patient card. | Clinical / Product |
| OD-10 | Finalize the card's action model and navigation destinations. | Product / Design |
| OD-11 | Determine clinical-priority sorting versus fixed census ordering. | Clinical / Product |
| OD-12 | Establish supported density variants and responsive behavior. | Design |
| OD-13 | Confirm which prototype scenarios exercise Patient card states. | Product / Project |
| OD-14 | Define precise data-source provenance and error-state copy. | Product / Engineering |
| OD-15 | Approve alert category and source (§15.1 A), the Snoozed status and Overdue response targets (§15.1 S). | Clinical / Product |
| OD-16 | Add safety tags, code status, transfer pending and deceased to the data model (§15.1 P). | Clinical / Product |
| OD-17 | Decide whether the card shows an overall condition (Stable / Unstable / Guarded), who sets it and with what vocabulary. Until decided, the card shows the acuity score only (PC-031). To discuss with the client. | Clinical / Product / Client |

---

## 24. Out of scope

This component PRD does not define:

- Hospital clinical alert thresholds
- New clinical scoring algorithms
- Diagnostic rules
- Medical treatment protocols
- Production EMR/device integration architecture
- Database schema or API contracts
- Autonomous clinical interventions
- Complete patient-chart functionality
- Complete Virtual Sepsis workflow logic
- Production clinical validation
- FDA clearance or regulatory approval

These remain owned by the relevant clinical, architectural, governance, and module-level workstreams.

---

## 25. Definition of done

The Patient card specification and design are considered ready for design-phase handoff when:

- The card anatomy and field inventory are agreed upon.
- Compact and expanded variants are defined.
- Status taxonomy and conditional visibility rules are documented.
- Clinically meaningful edge cases are covered.
- Data-quality and freshness behavior is demonstrated.
- Alert and sepsis states are correctly distinguished.
- Accessibility and interaction behaviors are specified.
- Tenant isolation is preserved in the prototype.
- Synthetic scenarios behave consistently across related modules.
- All unresolved clinical decisions are either approved or explicitly documented as deferred.

**Final principle:** The Patient card must communicate what is known, what has changed, and what requires attention — without presenting incomplete data, AI-generated interpretations, or workflow states as clinical facts beyond the evidence available.

---

## ID mapping (Oct 28, 2026)

The acceptance-criteria IDs were renamespaced so they no longer start from `AC-01` in several PRDs. The card's own `PC-xxx` IDs and the open-decision IDs (`OD-01`…`OD-17`) are unchanged.

| Old ID | New ID |
|---|---|
| `AC-xx` | `PC-AC-xx` |
