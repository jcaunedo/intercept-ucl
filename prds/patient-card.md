<!--
Created: Oct 22, 2026
Created by: Julio Caunedo
Last updated: Oct 22, 2026
Scope: The Patient card component (compact and expanded variants) for Provider Desktop / Tele-Critical Care Clinical Surveillance.
Purpose: Defines proposed presentation behavior, states and acceptance criteria for the Patient card, pending clinical and product validation.
-->

# PRD — Patient card

**Product:** Intercept Live — Virtual Care OS  
**Module:** Provider Desktop / Tele-Critical Care Clinical Surveillance  
**Component:** Patient card  
**Version:** 0.1  
**Status:** Draft — pending clinical and product validation  
**Last updated:** October 22, 2026

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
- Data freshness indication
- Access to patient detail

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

### PC-013 — Hospital

**Definition:** Facility responsible for the patient's current encounter.

**Data type:** Hospital identifier and display name.

**Requirements:**

- Display facility context in multi-hospital views.
- Respect the facility's tenant boundary.
- Use consistent names or approved abbreviations.

### PC-014 — Unit and bed

**Definition:** Current physical location of the patient.

**Fields:**

- Unit name/code
- Room number, where available
- Bed identifier, where available

**Example:** ICU · Bed 12

**Requirements:**

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

**Proposed presentation categories:**

- Low
- Moderate
- High
- Critical
- Unknown

**Requirements:**

- Categories and numerical boundaries require explicit clinical approval.
- Display the scoring model's name or make it available through detail.
- Do not present arbitrary score categories as clinically validated.
- Do not equate high acuity with an active critical alert.

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

Requirements:

- Preserve patient identity and hospital context.
- Honor authorization boundaries.
- Avoid unnecessary context switching between external systems.
- Do not navigate to another patient's chart due to stale or recycled bed information.

### PC-101 — View clinical alerts

When active alerts exist, the clinician must be able to access the relevant alert information.

The detailed workflow is owned by Clinical Alerting & Events.

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
| Data freshness | Yes | Yes | Always communicate appropriate quality state |
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

### PC-129 — Patient transfer

Location updates after authoritative ADT information is received. Coverage visibility is re-evaluated.

### PC-130 — Patient discharge

Card leaves the active surveillance census according to approved reconciliation policy.

### PC-131 — Restricted access

The interface does not disclose unauthorized patient information.

### PC-132 — Shift handoff

Unresolved clinical concerns and relevant inherited work remain accessible to the incoming authorized clinician.

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

- **AC-01:** Given an admitted patient with authorized identity and location information, the card displays the correct patient and facility context.
- **AC-02:** Given an authoritative bed transfer, the card updates the displayed location.
- **AC-03:** Given a patient outside the user's access scope, the card does not expose unauthorized data.

### Clinical observations

- **AC-04:** Given current observations, the card displays supported values with correct units.
- **AC-05:** Given a missing observation, the card displays an unavailable state rather than zero.
- **AC-06:** Given an observation exceeding its freshness interval, the card identifies it as stale.
- **AC-07:** Given observations with different update times, the card preserves the separate freshness contexts.

### Alert lifecycle

- **AC-08:** Given an unresolved clinical alert, the card displays a relevant alert indicator.
- **AC-09:** Given multiple unresolved alerts, the card identifies the highest-priority alert according to approved ordering rules and exposes the remaining alerts.
- **AC-10:** Given an acknowledged alert, the card does not automatically mark it resolved.
- **AC-11:** Given an escalated alert, the card preserves access to escalation context.
- **AC-12:** Given a resolved alert, the active-alert summary updates without destroying historical traceability.

### Sepsis

- **AC-13:** Given a positive screening candidate awaiting validation, the card does not claim a confirmed diagnosis.
- **AC-14:** Given a clinician-validated sepsis case under active tracking, the card displays the supported tracking state.
- **AC-15:** Given insufficient screening data, the card does not represent the patient as conclusively screen-negative.

### Respiratory monitoring

- **AC-16:** Given supported respiratory data, the expanded card can display the relevant respiratory-support context.
- **AC-17:** Given a detected ventilator-order mismatch, the card provides access to the associated alert and evidence.
- **AC-18:** Given unavailable ventilator data, the card does not infer that no mismatch exists.

### Component behavior

- **AC-19:** The compact and expanded variants represent the same patient state.
- **AC-20:** Selecting the primary card interaction opens the correct patient detail.
- **AC-21:** Nested controls do not accidentally trigger unrelated card navigation.
- **AC-22:** Frequent observation updates do not cause unnecessary disruptive movement.
- **AC-23:** Important states remain understandable without relying exclusively on color.
- **AC-24:** Every available card action is keyboard accessible.

### Prototype consistency

- **AC-25:** Synthetic surveillance updates propagate consistently to relevant card fields.
- **AC-26:** Simulated source disconnection produces a clearly identifiable degraded-data state.
- **AC-27:** The prototype never exposes real patient information.
- **AC-28:** Demonstration clinical states are not misrepresented as validated production decision support.

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
