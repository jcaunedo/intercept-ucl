<!--
SNAPSHOT — read-only copy published from Cowork (DEC-20).
Document: Intercept Live · Requirements Specification · v0.7
Snapshot date: 2026-10-29 · Snapshot set: v1 · Published by: CX-04
Source of truth: Cowork project "Intercept Telehealth - Series B". Do not edit here;
propose changes in a PR comment or an RCP, and Carlos updates the source and re-publishes.
Sanitized for the repo: no Archie prompts, no client-confidential interface material.
-->

# Intercept Live — Initial Requirements Specification (Design & Prototype Phase)

**Version 0.7** · Oct 29, 2026 (evening) · Owner: Carlos Jimenez · Product architect: Albert Santalo · Status: for internal review, then client review

| Version | Date | Changes |
|---|---|---|
| v0.1 | Oct 26 | Baseline specification |
| v0.2 | Oct 27 | Device list received (DEC-09): SV-01 to SV-03 tied to device profiles; new SV-13 (per-class device panels). Device-agnostic data model (DEC-10). Integration evidence from manufacturer specs. Six candidate scenarios. SIM-09 / SIM-10. A-11, A-12, D-15. |
| v0.3 | Oct 27 | Reconciled with the repo PRDs (`prds/monitoring.md`, `prds/patient-card.md`) and Israel's client notes: proposals S-1 to S-9 marked `[R] ▲ v0.3` (SV-05, SV-09, SV-13, new SV-14, AL-02, AL-03, AL-06, new AL-09, data model, UX-05); CC-08 note; two out-of-scope items. Proposals are confirmed at G0 (Oct 29). See the Reconciliation doc. |
| v0.4 | Oct 28 | Change Log UPD-01 to UPD-07: source-of-truth rule (DEC-18); interface direction (DEC-19) in §9; Lisa-Mae's heart-failure input → SV-01, SV-03, SV-04 notes, new SV-15 to SV-17, AL-02 note, new AL-10 to AL-12; client interface documentation (kept in Cowork) → CD-07 note, new CD-11, OE-08, SC-11; three-act proposal in §6 (P-DEC-20); §8 data, §9, §14, §15, §16, §17 updated. New items are `[C]` where a client source states them and `[R]` where they are our proposal |
| v0.5 | Oct 29 | Change Log UPD-09, UPD-10: Lisa-Mae's alarm thresholds, answers and dashboard guide → new BR-14 (remote team is never the first responder), BR-15 (protocols belong to each client hospital), SV-18 (four-panel patient view per diagnosis), SV-19 (post-thrombolysis monitoring schedule); notes on BR-01, BR-02, AL-02, AL-10, SV-15, VS-04, CA-03; Q-11, Q-12 answered; new Q-13, Q-14 |
| v0.6 | Oct 29 | Change Log UPD-13: SV-09 and BR-07 notes; Q-15, Q-16; §7.1 reference protocol profile v1 (every clinical parameter the rule engines read, with source); §8.1 data model v1, consolidated and locked for the first Archie prompt (the backend blueprint). Carlos's direction: build the logic now, with clinical values as data |
| v0.7 | Oct 29 | Change Log UPD-16 to UPD-18: OBJ-7 (grant scoring criteria); UX-11 note (inert Ask controls, CX-03); presentation updates for the repo issued as the *Design Update Spec* v1.0 (DU-01 to DU-39); this spec is also published read-only to the repo as a snapshot (DEC-20) |

Changes are marked `▲ v0.2` to `▲ v0.7` inline; unmarked content is the v0.1 baseline. This doc moved from `requirements-specification-v0.1.md` to `requirements-specification.md`, so the path no longer carries a version.

**Tags:**

| Tag | Meaning |
|---|---|
| **[C]** | Confirmed requirement |
| **[P]** | Existing prototype behavior |
| **[A]** | Assumption, to validate |
| **[R]** | Recommendation |
| **[Q]** | Open question |
| **[D]** | Dependency |

**Priority:** **M** = Must (Nov 13 build / grant demo) · **S** = Should (Dec 20) · **N** = Nice to have · **D** = Design-only (fully designed, prototype depth TBD).

**Source keys:** IK, BR, SP (with section), PR, DK, ST, CT; ▲ v0.4: UC (Diego's use cases), LM (Lisa-Mae, Oct 28), TD (client interface documentation (kept in Cowork)). These are defined in the Definition Workbook. ▲ v0.4 (DEC-18): SP, PR and the transcripts are the source of truth; UC, LM and TD answer questions and test assumptions.

This is a *prototype* specification. Each requirement describes demonstrated behavior on synthetic data. It does not describe production behavior. The production platform architecture is the next phase (BR).

---

## 1. Executive Summary

Intercept Live is the "Virtual Care OS" for distributed acute care (SP 1). This phase delivers four things:

- detailed design of ten modules
- a design system
- a full-stack prototype in Archie (React + AWS)
- a real-time simulator that streams synthetic device and EHR data

The prototype runs about six end-to-end scenarios agreed with Intercept (BR). It supports three uses:
- the Nebraska Rural Health Transformation grant demo (mid-November)
- the Series B raise (Nov/Dec)
- hospital discussions

The initial prototype is due **Nov 13** (DEC-02) and the final on **Dec 20**. Definitions, user stories and the handoff are due **Jan 20, 2027**.

**In-scope modules (A-02):**
- 5.1 Provider Desktop
- 5.2 Tele-Critical Care Clinical Surveillance
- 5.3 Care Coordination, Communication & Telepresence
- 5.4 Clinical Documentation
- 5.5 Order Entry
- 5.6 Clinical Alerting & Events
- 5.7 System Administration
- 5.8 Client Administration
- 5.9 Virtual Sepsis
- Specialty Care Access

## 2. Product Objectives

| ID | Objective | Measure in the prototype | Source |
|---|---|---|---|
| OBJ-1 | One workspace for a remote intensivist covering several hospitals | Scenario runs with no window or app switching; context switch under 1s | SP 5.1, CT, DK |
| OBJ-2 | Show AI woven into clinical work, under clinician control | Every AI output is visible, cited, and accepted, modified or declined by a clinician | SP 8, 9.1, DEC-06 |
| OBJ-3 | Prove access to care for rural hospitals (grant) | At least one scenario centers on a rural hospital without an on-site intensivist or specialist | CT |
| OBJ-4 | Show novelty beyond eCareManager/Ceiba | Chat with the chart, AI scribe, sepsis tracking with actions-not-taken, specialist access | CT, DK |
| OBJ-5 | Look and behave like the real product | Live data, persisted actions, no dead controls on scenario paths | BR |
| OBJ-6 | Leave a usable starting point for the production build | Module definitions, user stories and design system in standard formats | BR |
| ▲ v0.7 · OBJ-7 | Score on the grant's five criteria inside the product, not only in the narrative: rural; priority populations; chronic disease; unmet need; quality, cost and access | Each criterion is shown by at least one act of the first build (scenario proposal, P-DEC-20); payer and rurality are reporting-only | UC |

## 3. Users / Personas

| Persona | Type | In prototype | Notes |
|---|---|---|---|
| **Intensivist** — demo persona "Dr. Lena Park" [P] | Primary | **M** | Covers several hospitals; most cognitively loaded user (SP 3.1) |
| Advanced Practice Provider | Clinical | S (role default) | Supervision and prescriptive-authority constraints are visible (SP 3.2) |
| Critical Care RN (remote) | Clinical | S (role default) | Surveillance and escalation focus (SP 3.3) |
| Specialist (consult) | Clinical, external | S (Option A/B) | Concept of the SP 3.10 Independent Clinician; consult-scoped only |
| System Administrator | Admin (Intercept) | D / S | Cross-tenant authority; operational data only (SP 3.7, DEC-05) |
| Client Administrator | Admin (hospital) | D / S | Single-tenant configuration (SP 3.8) |
| Client Manager | Admin read-only | D | Read-and-report (SP 3.9) |
| Hospital Bedside Nurse | Counterparty | Scenario-dependent (D-12) | No first-class UI in SP v1 (3.11); CT wants participation |
| Family / patient representative | Counterparty | Scenario-dependent (D-12) | Encounter-scoped (SP 5.18); CT idea |
| **Demo Operator** (internal Archie/Intercept) | Internal | **M** | Runs simulator scenarios; never shown externally |

Out of scope as prototype users: Scheduling Coordinator, Support Coordinator and Operations Lead (deferred modules).

## 4. User Roles and Permissions (prototype)

| Role | Hospital scope | Can | Cannot |
|---|---|---|---|
| Intensivist | Hospitals in assigned scope | View patients; acknowledge, escalate and resolve alerts; raise intuition alerts; chat; sign notes and orders; confirm or exclude sepsis; request consults; message | See hospitals outside scope |
| APP | Assigned scope | As intensivist, except orders flagged "requires supervising sign-off" route to the intensivist [A] | Sign supervised orders alone |
| Critical Care RN | Assigned scope | View; acknowledge; escalate to intensivist or APP; message; raise intuition alerts | Sign orders |
| Specialist | One consult encounter | View the consult packet; join the session; return a recommendation | Browse the census |
| Client Admin | One hospital | Configure integrations (simulated), access, alert rules, sepsis protocol layer, scribe consent profile | See other hospitals |
| System Admin | All tenants | Tenant list, integration health, AI agent posture | See identifiable patient data across tenants in aggregate views |
| Demo Operator | All (internal) | Start, stop, reset scenarios; inject events | — |

A role switcher is allowed in the prototype for demo purposes [R]. Authentication is simulated (no real SSO). [A]

## 5. Functional Requirements by Area

### 5.1 Provider Desktop (Single Pane of Glass) — SP 5.1

| ID | Requirement | Pri | Tag | Source |
|---|---|---|---|---|
| PD-01 | Census of all patients in the user's scope, **always grouped by hospital**, with hospital, EHR, time zone and connection status per group | M | [C] | SP 5.1, DEC-05 |
| PD-02 | Three census views: cards, dense table, rail-by-tier | M | [P] | PR |
| PD-03 | Filters: hospital, my patients, watchlist first, transferred in 24h; empty state when there are no results | M | [P]+[R] | PR |
| PD-04 | Each patient row or card shows: name, age/sex, bed, diagnosis, tier, acuity measure, key vitals with freshness, device tags (vent, pressor…), open alerts | M | [P] | PR |
| PD-05 | Opening a patient keeps the census as a side rail for quick switching; switching takes under 1s | M | [C] | SP 5.1 |
| PD-06 | Patient workspace tabs: Overview, Vitals, Chart, Orders, Camera, EHR (placeholder) | M | [P]+DEC-04 | PR, CT |
| PD-07 | Shift context: clinician, shift window, time remaining (live), hospitals covered | M | [P] | PR |
| PD-08 | Global chat/voice entry (replaces the dead ⌘K bar): ask about the current patient, or navigate ("open bed 7") | S | [C] | SP 9.1 #5 |
| PD-09 | Watchlist flag persists across views and feeds handoff | S | [R] | PR gap |
| PD-10 | Role-based default layouts for intensivist, APP and RN | S | [C] | SP 9.1 #4 |
| PD-11 | Light/dark theme | M | [P] | PR |
| PD-12 | Shift lifecycle: start → active → handoff → end | S | [C] | SP 5.1 |

### 5.2 Tele-Critical Care Clinical Surveillance — SP 5.2

| ID | Requirement | Pri | Tag | Source |
|---|---|---|---|---|
| SV-01 | Live vitals from the simulated bedside monitor: HR, rhythm, SpO₂, NIBP/ABP with MAP, RR, Temp; waveforms for ECG, pleth, ABP, resp. **▲ v0.2:** parameter set per the GE CARESCAPE ONE profile. | M | [C] | CT, BR **▲ v0.4:** the panel leads with a **per-diagnosis watch list** (LM). Heart failure: critical = SpO₂ with O₂ support, RR, BP/MAP, HR and rhythm, urine output; secondary = temperature; conditional = EtCO₂, CVP. |
| SV-02 | Live ventilator data: mode, settings vs measured, alarms. **▲ v0.2:** Dräger Evita V800 profile for Nov 13, with vendor mode names (e.g., PC-AC); Hamilton C1 optional (DEC-09). | M | [C] | CT |
| SV-03 | Live infusion pump data: drug, dose, rate, titration changes. **▲ v0.2:** B. Braun Infusomat profile, per channel. | M | [C] | CT, SP 7.10 **▲ v0.4:** show what was ordered, the drug, the live rate, dose units and recent titration (Becky, LM). Dose units use Epic's unit strings (TD), e.g. mcg/kg/min, Units/hr, mL/hr. |
| SV-04 | Vitals trends (at least the last 12h) with event markers (meds, alerts) | M | [C] | SP 5.2 **▲ v0.4:** latest value plus **1-, 4- and 12-hour trends** for the critical parameters (LM). |
| SV-05 | Telemetry wall with density 4/8/12/16 and paging; no duplicate slots; alarm color by severity; click through to patient **▲ v0.3 [R] proposed (S-1):** ~~density 4/8/12/16 and paging~~ → Monitoring densities Comfortable / Compact / List (PRD SV-012, SV-015); no duplicate slots, severity by its own treatment, click through to patient. | M | [P]+fix | PR |
| SV-06 | Monitor and ventilator detail windows (Esc closes) | M | [P] | PR |
| SV-07 | Camera session with prerecorded video and HUD overlay (vitals, vent, drips) | M | [C] | CT, SP 5.2 |
| SV-08 | Every value shows its source and age; stale values (beyond threshold) are visibly marked; missing values are never shown as zero | M | [C] | SP 9.1 #6, #12 |
| SV-09 | Acuity measure is defined, explainable, and shows contributing factors; it does not forecast **▲ v0.3 [R] (S-7):** shows the named score, its 24h change and contributing factors; with SOFA as the placeholder, the factors are the six organ subscores (PRD PC-030). | M | [D] D-04 | DEC-06 **▲ v0.6:** the prototype score is a **NEWS2-style current-state score** (Scale 2 for hypercapnic patients), replacing the SOFA placeholder, pending D-04. Defined as protocol data (§7.1). |
| SV-10 | Escalation from surveillance into action (open patient, alert, call bedside) | M | [C] | SP 5.2 |
| SV-11 | Census reconciliation indicator (ADT event received → patient added, moved or discharged) | S | [C] | SP 5.2 |
| SV-12 | PTZ camera control simulation (presets switch clips) | N | [P] | PR |
| ▲ v0.2 · SV-13 | Device panels use **one template per device class** (monitor, ventilator, pump). Vendor labels, units, mode names and alarm text come from the bed's device profile, so a Dräger and a Hamilton bed render correctly with no device-specific UI code. **▲ v0.3 [R] (S-9):** parameter colors fixed per parameter and never in severity hues; ventilator and pump values grouped and labeled by source (PRD SV-072–074). | M | [R] DEC-10 | Simulator spec §3b |
| ▲ v0.3 · SV-14 | Cards never reorder while the clinician is interacting; a pending reorder is offered ("Panel order changed · Update"), not forced (PRD SV-013, AC-08) | M | [R] S-2 | PRD |
| ▲ v0.4 · SV-15 | The respiratory panel adapts to the support mode: invasive ventilation (mode, FiO₂, PEEP, set and measured RR, exhaled Vt, minute ventilation, PIP, plateau), BiPAP/NIV (IPAP, EPAP, backup rate, measured RR, **leak**, Vt if available), or conventional oxygen (device and flow) | M | [C] | LM, UC (S1, S2) **▲ v0.5:** BiPAP is a separate unit with no known EHR or device integration (LM, Oct 29): its settings appear as **charted by the respiratory therapist**, labeled as charted, not as a live feed. High-flow nasal cannula (flow, FiO₂) is added as an oxygen mode. When the patient isn't ventilated, show oxygen delivery and airway status, never an empty ventilator panel. |
| ▲ v0.4 · SV-16 | Charted intake and output: hourly urine output, net fluid balance and daily weight, with trends, alongside device data and clearly labeled as charted | M | [C] | LM, UC (S1) |
| ▲ v0.4 · SV-17 | Each infusion is shown next to the response it targets: furosemide ↔ urine output and net balance; norepinephrine ↔ MAP and dose trend; insulin ↔ glucose | M | [C] | LM |
| ▲ v0.5 · SV-18 | The patient view uses the same **four panels** for every diagnosis: vital signs, ventilator or BiPAP, actionable alarms, infusions. Each panel orders its parameters by diagnosis as **first / next / conditional** (heart failure, sepsis, ventilated COPD, stroke after thrombolysis, COPD on BiPAP, DKA); a panel with nothing active says so ("no active infusion") | M | [C] | LM (guide, Oct 29); presentation is Julio's, by proposal |
| ▲ v0.5 · SV-19 | Post-thrombolysis monitoring schedule for stroke: neuro checks and BP every 15 min for 2 h, every 30 min for 6 h, then hourly to 24 h; BP target shown (generally < 180/105 mmHg, per protocol); each check due, done or overdue, feeding the nurse task list and overdue alerts | M (Act 3) | [C] | LM (guide, Oct 29) |
| ▲ v0.6 · SV-20 | Every current value carries a status against its target (within target, below target, above target, high, low, rising, falling, criterion met), computed by the backend from the encounter target or the protocol profile | M | [C] | LM (mockups, Oct 29) |

### 5.3 Care Coordination, Communication & Telepresence — SP 5.3

| ID | Requirement | Pri | Tag | Source |
|---|---|---|---|---|
| CC-01 | Unified inbox of messages from all hospitals in scope; each carries hospital and channel provenance | S | [C] | SP 5.3 |
| CC-02 | Reply routes back to the originating hospital channel (simulated); sent messages appear in the thread | S | [C] | SP 5.3 |
| CC-03 | Urgent vs routine separation and unread counts that update | S | [C] | SP 5.3 |
| CC-04 | Open-patient link from a message | M | [P] | PR |
| CC-05 | Presence: clinician available / in camera / busy, visible to the bedside (simulated) | N | [C] | SP 5.3 |
| CC-06 | Shared bedside + virtual task list (task created by the clinician or an agent, assigned to the bedside role, status visible to both) | S* | [Q] D-12 | CT |
| CC-07 | Bedside nurse notification surface (phone-style view of a task or nudge) | S* | [Q] D-12 | CT |
| CC-08 | Family communication: question in, AI-drafted reply, clinician accepts, edits or refuses, sent; optional video invite **▲ v0.3:** Israel proposed (Oct 27) encounter-start family notification, an AV update that loops in the bedside RN, and scheduling; candidate for one scenario "softly" (CI-15, D-12). | S* | [Q] D-12 | CT |
| CC-09 | Communication audit trail visible per patient | N | [C] | SP 5.3 |

*Only if chosen as a scenario.

### 5.4 Clinical Documentation — SP 5.4, 8.6

| ID | Requirement | Pri | Tag | Source |
|---|---|---|---|---|
| CD-01 | Start AI Scribe from a camera session; recording state is visible at all times; consent prompt follows the hospital's consent profile | M | [C] | SP 5.4 |
| CD-02 | Scribe produces a structured draft (HPI, Exam, Assessment, Plan) from the session (scripted transcript per scenario) plus chart context | M | [C] | SP 8.6 |
| CD-03 | Clinician edits the draft; edits persist; draft is marked "unverified" until reviewed | M | [P]+fix | PR bug |
| CD-04 | Pause and stop capture with one action; opt-out ends capture for the encounter | M | [C] | SP 5.4 |
| CD-05 | Sign → note written to the simulated EHR → appears in Chart › Notes with author, time and provenance "AI-drafted, clinician-signed" | M | [C] | CT, IK |
| CD-06 | Save draft works | M | [P]+fix | PR |
| CD-07 | Note templates (critical care progress, procedure, event) and smart-phrase insertion | S | [C] | SP 5.4 **▲ v0.4:** Intercept's own note types at a client hospital (TD): tele-critical care **initial note** (consult), **progress note** with an overnight-events section, and **ICU recommendations** by system; note types H&P, Progress, Consult. |
| CD-08 | Dictation as a separate input mode | S | [C] | SP 5.4 |
| CD-09 | One Intercept note format, converted per hospital EHR on write-back (shown as a confirmation detail) | S | [C] | SP 5.4 |
| CD-10 | Critical-care vs non-critical-care template auto-selection from data (P/F ratio, pressor) | N | [Q] | CT (Israel) |
| ▲ v0.4 · CD-11 | A signed note can take an **addendum**; status shows Signed or Addendum; cosign need shown per note | S | [C] | TD |

### 5.5 Order Entry — SP 5.5, 8.5

| ID | Requirement | Pri | Tag | Source |
|---|---|---|---|---|
| OE-01 | Active orders list from the simulated EHR | M | [P] | PR |
| OE-02 | Order search over a synthetic catalog; order sets in patient context | M | [P] | PR |
| OE-03 | AI order suggestions (sepsis bundle, vent-order alignment, electrolyte) start as **proposed**, with evidence and protocol source; accept / modify / decline (with rationale) | M | [C] | SP 8.5, DEC-06 |
| OE-04 | Order basket with dose, route, frequency; sign → orders written to the simulated EHR → active list updates | M | [C] | CT |
| OE-05 | Allergy check against the patient record on sign | S | [R] | — |
| OE-06 | Write-back gating per hospital (Client Admin setting); where off, show "complete in hospital EHR" | S | [C] | SP 5.5 |
| OE-07 | APP-supervised orders route to the intensivist for co-sign | S | [C] | SP 3.2 |
| ▲ v0.4 · OE-08 | Order lifecycle from the simulated EHR: new, modify (one message), discontinue, PRN → scheduled (arrives as discontinue + new), past due, not given; the active list reflects each event | S | [C] | TD |

### 5.6 Clinical Alerting & Events — SP 5.6

| ID | Requirement | Pri | Tag | Source |
|---|---|---|---|---|
| AL-01 | Alerts generated from simulator data by rules and agents (threshold, trend, sepsis screen, vent mismatch, lab critical) | M | [C] | SP 5.6 |
| AL-02 | Tiers: T1 life-critical interrupt banner, T2 urgent, T3 informational **▲ v0.3 [Q] (P-DEC-17):** presentation severities Critical (= T1 interrupt) / High and Medium (= T2) / Low (= T3, not counted as open); device alarm priority stays a separate device attribute. | M | [P] | PR **▲ v0.4 [Q]:** threshold values pending Lisa-Mae's table (RAID I-26, due Nov 2). **▲ v0.5:** illustrative thresholds received (LM, Oct 29; I-26 closed): SpO₂ sustained below target (e.g., < 90%), MAP < 65, HR > 130 or < 40, RR > 30, apnea ≥ 10 s, ventilator disconnect or high pressure, urine output < 0.5 mL/kg/hr, VT/VF. Final values per hospital (BR-15). |
| AL-03 | Lifecycle: new → acknowledged → escalated → resolved (with rationale); every tier can be acknowledged; counts update everywhere **▲ v0.3 [R] (S-3):** resolve takes a reason (Treated / Artifact or false alarm / Expected for this patient / Duplicate); AI items are declined with an optional rationale (BR-07). | M | [C] | SP 5.6 |
| AL-04 | Alert carries origin (device, lab, agent, clinician), evidence and timestamps | M | [C] | SP 5.6 |
| AL-05 | Clinician Intuition Alert: raise on a patient with rationale, category, what to watch, timeline; persists to handoff | S | [C] | SP 5.6 |
| AL-06 | Snooze and assign **▲ v0.3 [R] (S-8):** ~~S~~ → N for the prototype until clinical sign-off (snoozing Critical alerts is a safety question). | S | [R] | PR gap |
| AL-07 | Informational items (e.g., "bundle compliant") are not counted as open alerts | M | [R] | PR issue |
| AL-08 | Audible cue for T1 (demo toggle) | N | [R] | — |
| ▲ v0.3 · AL-09 | Alerts carry a source (AI agent, device, rule, clinician, system) and a category (clinical, operational, administrative); low and operational items are not counted as open (AL-07) | S | [R] S-4 | PRD PC §15.1 |
| ▲ v0.4 · AL-10 | Device alarms show onset, duration, signal validity and whether a bedside clinician acknowledged them; high-priority unresolved alarms are displayed prominently | M | [C] | LM **▲ v0.5:** the remote view shows device alarms as **status** (visual only, with bedside acknowledgment); no control suggests the remote team responds first (BR-14). Remote action starts from trend and platform alerts. |
| ▲ v0.4 · AL-11 | No repeat notifications for the same unresolved condition | M | [C] | LM |
| ▲ v0.4 · AL-12 | Likely-artifact alarms (motion SpO₂, ECG lead off, poor pleth, BP cuff error, BiPAP mask leak) are **flagged by signal quality, not suppressed**; the bedside team confirms real vs artifact (feeds AL-03's "Artifact" resolve reason) | M | [C] | LM |

### 5.7 System Administration — SP 5.7 (Design + S)

| ID | Requirement | Pri | Tag |
|---|---|---|---|
| SA-01 | Tenant (hospital) list with status, EHR, deployment posture (internal-only view) | D/S | [C] |
| SA-02 | Integration health per tenant (simulated feeds: monitors, vents, pumps, labs, ADT, EHR) | D/S | [C] |
| SA-03 | AI agent registry: agent, regulatory posture, autonomy posture, acceptance rate (synthetic) | D/S | [C] |
| SA-04 | Cross-tenant views show operational, non-patient data only | D | [C] DEC-05 |

### 5.8 Client Administration — SP 5.8 (Design + S)

| ID | Requirement | Pri | Tag |
|---|---|---|---|
| CA-01 | Integrations on/off and per-feature write-back toggles for one hospital | D/S | [C] |
| CA-02 | Clinician access list for the hospital | D/S | [C] |
| CA-03 | Alert rule thresholds (configurable subset) | D/S | [C] **▲ v0.5:** thresholds, bundle steps and monitoring frequencies come from each client hospital's protocol (BR-15); the demo ships one reference protocol shown as configurable. |
| CA-04 | Sepsis protocol layer on the SEP-1 baseline (e.g., extra bundle element) | D/S | [C] |
| CA-05 | Ambient-listening consent profile (one-party vs all-party) | D/S | [C] |
| CA-06 | Audit trail viewer (read-only for Client Manager) | D | [C] |

### 5.9 Virtual Sepsis — SP 5.9, 8.1, 8.2

| ID | Requirement | Pri | Tag | Source |
|---|---|---|---|---|
| VS-01 | Sepsis Sniffer screens every patient continuously from simulator vitals and labs; shows criteria met with evidence | M | [C] | SP 8.1 |
| VS-02 | Population exclusions applied at screening (liver failure, OB, pediatric, oncology) with the reason shown | M | [C] | SP 5.9 |
| VS-03 | Candidate → clinician **confirms or excludes** (with rationale); the agent never charts a diagnosis | M | [C] | SP 8.1 |
| VS-04 | Confirmed case: t0 set; 3h and 6h bundle windows with live timers and element status | M | [C] | SP 8.2 **▲ v0.5:** Time Zero is proposed with reviewer confirmation; each 3-h and 6-h element shows due time, performed time and status: complete / pending / overdue / not applicable / review (LM guide). **▲ v0.6 (UPD-15):** add element status **in progress** (started, not complete), as in Lisa-Mae's SEP-1 tracker mockup. |
| VS-05 | Intervention prompt before a deadline (e.g., repeat lactate due), linked to an order suggestion | M | [C] | SP 8.2 |
| VS-06 | Three-state outcome per prompt: taken / declined with rationale / elapsed | M | [C] | SP 8.2 |
| VS-07 | Sepsis panel in the right rail + strip in the patient overview | M | [P] | PR |
| VS-08 | Compliance summary per hospital (SEP-1 vs hospital protocol tracked separately) | S | [C] | SP 5.9 |

### 5.10 Specialty Care Access — BR, SP 5.18 (concept), DEC-03

| ID | Requirement | Pri | Tag |
|---|---|---|---|
| SC-01 | "Request specialist" from patient workspace or camera session; choose specialty and urgency | S (A) | [C] BR, CT |
| SC-02 | Ranked eligible specialists as profile cards: credentials, licensed in the patient's state, privileged at the hospital, board certification, availability | S (A) | [C] CT, SP 6.7 |
| SC-03 | Specialist joins the session (split screen, prerecorded) | S (A) | [C] CT |
| SC-04 | Structured recommendation returns to the chart; order suggestions flow to Order Entry as proposed | S (A) | [C] SP 5.18 |
| SC-05 | Consult lifecycle status: requested → matched → accepted → in session → delivered → closed | S (B) | [R] |
| SC-06 | Imaging review panel in the consult (synthetic image) | S (B) | [C] BR |
| SC-07 | Specialist's own consult view | S (B) | [R] |
| SC-08 | Network view (read-only) | N (C) | [R] |
| SC-09 | No pricing, booking, take-rate or settlement shown | M | [C] DEC-03 |
| SC-10 | Written Specialty Care specification | Jan 20 | [C] BR |
| ▲ v0.4 · SC-11 | A consult can start from a hospital EHR order (e.g., "Inpatient Consult to Intensivist"), creating the consult automatically; order changes and cancellations sync. Outside the ICU, the workflow confirms the mobile cart and patient are ready (call to the nurses' station) before connecting | S | [C] TD |

### 5.11 Chat with the Chart (Conversational Clinical Data Agent) — SP 8.7

| ID | Requirement | Pri | Tag | Source |
|---|---|---|---|---|
| CH-01 | Typed and voice questions about the open patient | M | [C] | CT |
| CH-02 | Answers synthesize across vitals, labs, notes, orders, documents and history, scoped to that patient's hospital record | M | [C] | SP 8.7, DEC-05 |
| CH-03 | Every fact carries a citation that opens the source item | M | [C] | SP 8.7 |
| CH-04 | Must answer longitudinal questions, e.g. "last 3 echocardiogram results and the last hepatology assessment" | M | [C] | CT (Diego) |
| CH-05 | No diagnostic or therapeutic recommendations in answers; says "I don't have that in the record" when data is absent | M | [C] | SP 8.7, 9.1 #12 |
| CH-06 | Suggested prompts relevant to the patient | M | [P] | PR |
| CH-07 | Conversation persists while the patient is open | M | [P]+fix | PR |
| CH-08 | Response under ~5s for typical questions in the demo environment | M | [A] | — |

### 5.12 Shift Handoff — SP 6.21

| ID | Requirement | Pri | Tag |
|---|---|---|---|
| HO-01 | Handoff summary generated from live state: outstanding alerts by tier, watchlist and intuition alerts, in-flight bundles, unresolved messages | S | [C] |
| HO-02 | Incoming clinician acknowledges; items move to their inbox | S | [C] |
| HO-03 | Outgoing clinician can add notes per patient | S | [R] |

## 6. End-to-End Workflows

The six scenarios will be built from these workflows once Intercept confirms them (D-01).

| ID | Workflow | Steps (happy path) | Modules | Pri |
|---|---|---|---|---|
| WF-01 | Shift scan | Sign in → census by hospital → spot unstable → open patient | PD, SV | M |
| WF-02 | Deterioration → act | Simulator drops MAP → T1 alert → acknowledge → open patient → review trend + camera → order suggestion (titrate pressor) → sign → message bedside | SV, AL, OE, CC | M |
| WF-03 | Sepsis early catch | Labs and vitals meet criteria → Sniffer candidate → clinician confirms → bundle timers → repeat-lactate prompt → order → bundle complete (or elapsed, logged) | VS, OE, AL | M |
| WF-04 | Chat with the chart | Voice: "summarize the last 24h" / "last 3 echoes + hepatology note" → cited answer → open source | CH | M |
| WF-05 | Camera visit + scribe | Start camera session → consent → scribe drafts → edit → sign → note in chart | SV, CD | M |
| WF-06 | Bedside coordination | Message from the bedside RN → reply → shared task to the bedside (if in scope) → nurse completes → status visible | CC | S |
| WF-07 | Specialist second opinion | Request → eligible list → select → specialist joins → recommendation → suggestion to orders | SC, OE | S |
| WF-08 | Family update | Family question → AI-drafted reply → clinician edits → send (if in scope) | CC | S* |
| WF-09 | Handoff | End of shift → summary → incoming acknowledges | HO | S |
| WF-10 | Hospital configuration | Client Admin toggles write-back / adds a sepsis protocol element → effect visible in the clinician workspace | CA | S |

~~**Candidate scenarios raised by Intercept on Oct 22 [Q]:**~~ (v0.1 list, superseded)

> **▲ v0.2 · Oct 27 — Six candidate scenarios drafted** (Definition Workbook §2a), pending Intercept's confirmation and walkthroughs:
> 1. Multi-hospital command center with AI-prioritized alerting (Albert) → WF-01, WF-02
> 2. Talking to the chart by voice: echocardiograms + hepatology note (Diego) → WF-04
> 3. Virtual Sepsis with the bedside team: lactate prompt to the nurse (Diego) → WF-03, WF-06
> 4. Specialist second opinion, shown "softly" (Albert, Diego) → WF-07
> 5. Family communication with AI-drafted replies (Israel, Diego) → WF-08
> 6. Camera visit with AI documentation (Archie inference) → WF-05
>
> Backup: critical-care note template auto-selection (Israel; deprioritized).

> **▲ v0.4 · Oct 28 — Proposed scenario baseline (P-DEC-20), replacing the list above once agreed.** Diego's six scenarios (UC) fold into one night with three live acts:
> - **Open** (hub census, from S5) → WF-01
> - **Act 1**, Margaret, heart failure at Chadron (S1 + talking to the chart + AI note + family update) → WF-01, WF-02, WF-04, WF-05, WF-08
> - **Act 2**, Rosa, sepsis at Sidney (S3 + bedside prompts) → WF-03, WF-06
> - **Act 3**, surge night (S5 + Specialty Care Access) → WF-02, WF-07, WF-09
> - **Close**, outcomes dashboard (S6) as Mock
> - **Second phase by Dec 18:** S2 (low-bandwidth), S4 (nurse-led DKA protocol), S6 live parts.
>
> Per-act feature coverage and totals: *Scenario proposal* doc (14 of 25 Demo features by Nov 13, all 25 by Dec 18).

## 7. Business Rules

Clinical values are a baseline to be validated by Israel (CI-08). They are not final.

| ID | Rule | Tag |
|---|---|---|
| BR-01 | Alert tiers: T1 = immediate threat (e.g., MAP < 65 sustained on a vasopressor, SpO₂ < 88 sustained, Hgb critical); T2 = urgent trend or mismatch; T3 = informational. Exact thresholds are configurable per hospital. | [A] validate **▲ v0.5:** compare with Lisa-Mae's table (SpO₂ < 90 sustained; COPD target 88–92%); settle per scenario at the script review (Nov 3–4). |
| BR-02 | SIRS screen (SEP-1 baseline). Two or more of: Temp > 38.3 °C or < 36.0 °C; HR > 90; RR > 20; WBC > 12k or < 4k or > 10% bands. Plus suspected infection. Plus organ dysfunction: SBP < 90 or MAP < 65; creatinine > 2.0; bilirubin > 2; platelets < 100k; INR > 1.5; lactate > 2. | [A] validate **▲ v0.5 [Q]:** Lisa-Mae's guide uses temperature > 38 °C (classic SIRS); our SEP-1 baseline uses > 38.3 °C. Settle at the script review (Q-13). |
| BR-03 | Bundle windows from t0. **3h:** initial lactate; blood cultures before antibiotics; broad-spectrum antibiotics; 30 mL/kg crystalloid if hypotensive or lactate ≥ 4. **6h:** repeat lactate if initial > 2; vasopressors if hypotension persists after fluids; repeat volume/perfusion assessment (septic shock). | [A] validate |
| BR-04 | Exclusions are applied at screening and shown with their reason (liver failure, OB, pediatric, oncology per SP 5.9) | [C] SP |
| BR-05 | Vent-order mismatch: compare set FiO₂, PEEP, set RR, Vt and mode with the latest active vent order. Patient-triggered RR above the set rate is **not** a mismatch. | [C] SP 8.3 / [R] |
| BR-06 | AI outputs are recommendations; nothing is signed, ordered or sent without a clinician action | [C] SP 8, DEC-06 |
| BR-07 | Every recommendation records an outcome: taken / declined (rationale) / elapsed | [C] SP 8.2 **▲ v0.6:** one outcome list for every suggestion (AI drafts, protocol prompts, order suggestions, family updates): accepted (= taken), modified, declined (with rationale), elapsed. |
| BR-08 | Data freshness: a vital is "stale" if older than its expected interval × 3 (e.g., monitor numerics > 3 min) [A]. Missing is shown as "—", with a reason where known. | [A] |
| BR-09 | Patient data is scoped to its hospital; no cross-hospital patient joins | [C] BR, DEC-05 |
| BR-10 | Ambient capture follows the hospital consent profile; opt-out ends capture for the encounter | [C] SP 5.4 |
| BR-11 | APP-scope orders requiring supervision need intensivist co-sign | [C] SP 3.2 |
| BR-12 | Specialist eligibility = licensed in the patient's state AND privileged at the hospital AND board-certified in the specialty | [C] SP 6.7 / [A] |
| BR-13 | Acuity measure definition — **pending** Israel (CI-06) | [D] |
| ▲ v0.5 · BR-14 | **The remote team is never the first responder to bedside alarms.** Bedside nurses respond to and evaluate every alarm and escalate on clinical judgment. Bedside alarms are visual and audible; the remote team sees them visually and acts mainly on trend alerts | [C] LM, Oct 29 |
| ▲ v0.5 · BR-15 | **Protocols belong to each client hospital.** Intercept follows its clients' protocols and has no separate practice; thresholds, bundle elements and monitoring frequencies are hospital settings (CA-03, CA-04). The demo uses one reference protocol, labeled as configurable | [C] LM, Oct 29 |

### ▲ v0.6 · 7.1 Reference protocol profile v1 (illustrative, Oct 29)

Every value below is a **protocol-profile parameter**, versioned and editable per hospital (BR-15). The rule engines read them; none is hard-coded. They are illustrative until the script review (Nov 3–4).

| Parameter | Reference value | Source |
|---|---|---|
| SpO₂ low | Sustained < 90% (patient target; 88–92% for hypercapnic risk); Critical < 85% | LM; Critical cut-off [R] |
| MAP low | < 65 mmHg sustained or individualized; Critical if on a vasopressor and falling | LM, SP |
| HR high / low | > 130 bpm sustained / < 40 bpm (Critical) | LM |
| RR high | > 30/min sustained | LM |
| Apnea | ≥ 10 s valid apnea (Critical) | LM |
| Ventilator disconnect / high pressure | Valid event / above device limit (Critical) | LM |
| Urine output low | < 0.5 mL/kg/hr over the configured interval | LM |
| Serious arrhythmia | VT, VF or unstable rhythm (Critical) | LM |
| Rising lactate | Repeat above previous (Medium, not isolated) | LM |
| Sustained duration | 2 min default | [R] |
| Overdue check or task | 10 min after due, to bedside nurse and remote nurse | UC (S4), [R] |
| Stale value | 3 × expected interval | BR-08 |
| SIRS | Temp > 38.3 or < 36.0 °C (Q-13); HR > 90; RR > 20 or PaCO₂ < 32; WBC > 12 or < 4 K/µL or > 10% bands; 2 of 4 + suspected infection | BR-02, LM |
| Organ dysfunction | SBP < 90 or MAP < 65; creatinine > 2.0; bilirubin > 2; platelets < 100k; INR > 1.5; lactate > 2 | BR-02 |
| Bundle | 3 h and 6 h elements per BR-03; prompt 30 min before each deadline | BR-03; prompt lead [R] |
| Kidney-dose prompt | Antibiotic ordered and eGFR < 30 | UC (S3), [R] |
| Fluid target | 30 mL/kg from weight; reassess after each bolus | BR-03, UC (S3) |
| Post-thrombolysis checks | Neuro + BP q15 min × 2 h, q30 min × 6 h, hourly to 24 h; BP target < 180/105 | LM |
| Deterioration score | NEWS2-style current-state bands (Scale 2 for hypercapnic patients) | [R] D-04 [confirm] |
| Overflow trigger | Two new High or Critical alerts on different patients of one intensivist within 5 min, or a Critical alert during their live session | UC (S5), [R] (Q-16) |
| Sepsis windows | Hour-1 bundle timer (display) plus SEP-1 3 h and 6 h deadlines | UC (S3), BR-03 (Q-15) |
| Acute stroke alert | Stroke alert event, or NIHSS ≥ 1 with a new deficit; shows last known well (Critical) | UC (S5), [R] |
| Keep-or-transfer checkpoints | 1 h and 4 h; a missed checkpoint raises a High alert | UC (S1), [R] |
| Clock | All timing uses the demo run clock and the event's occurred time | [R] |

## 8. Data Requirements

**Synthetic only.** No real patient data in any data set, file, screenshot or video (BR).

| Entity | Key attributes | Source in prototype |
|---|---|---|
| Hospital (tenant) | name (fictional), city/state, EHR vendor, time zone, connection status, write-back flags, consent profile **▲ v0.3:** field names `hospitalCode`, `hospitalName`, `ehrVendor`, `timeZone`, `connectionStatus` (PRD PC-013). | Seed |
| Unit / Bed | unit type (MICU, SICU, CCU, OB-ICU), bed label, camera endpoint **▲ v0.3 (S-5):** `unitCode`, `unitName`, `room`, `bed` as text; ADT PV1-3 mapping (PL.4 facility, PL.1 point of care, PL.2 room, PL.3 bed); shown broad to specific; a known transfer never leaves the old bed shown as current (PRD PC-014). | Seed |
| Patient / Encounter | MRN per hospital, demographics, admit time, diagnosis (ICD-10), code status, allergies, isolation, problem list, history, home meds **▲ v0.3 (S-6):** sex for clinical use stored separately from gender identity; FHIR `Patient.gender` mapped as administrative gender (PRD PC-012). Census status: admitted / transferred / discharged / pending reconciliation / unknown (PRD §5). | Seed (cleaned cohort) |
| Device | type (monitor, vent, pump), model (D-02), bed association. **▲ v0.2:** device instance = bed + `profile_id@version` | Seed |
| ▲ v0.2 · Device profile | manufacturer, model, software version, device class, canonical metrics (IEEE 11073 code, UCUM unit, kind, range), modes (canonical family + vendor name), alarms (canonical ID, vendor text, priority), message mapping, sources, clinical review | Versioned profile files (Simulator spec §3b) |
| Observation | type (LOINC / IEEE 11073 code), value, unit, time, device/source, status **▲ v0.4:** + origin (device or charted, SV-16), signal quality (AL-12) | Simulator stream |
| Waveform | rendered client-side from numerics + rhythm (no raw waveform streaming) [R] | Simulator parameters |
| Lab result | test, value, flag, collected/resulted time | Simulator events |
| Medication / Infusion | drug, dose, rate, route, start/titration events **▲ v0.4:** dose units from Epic's unit list (TD); target response metric for display (SV-17); order lifecycle events (OE-08) | Simulator + orders |
| Order | type, detail, status, source (clinician / AI suggestion), signer, time | Prototype DB + simulated EHR |
| Note / Document | type (progress, H&P, consult, echo report, imaging report), author, time, content, provenance | Seed + scribe |
| Alert | tier, type, origin, evidence, lifecycle state, actor, timestamps **▲ v0.3:** + severity (P-DEC-17), source, category (AL-09), resolution reason, response target [Q]. | Rules engine |
| ▲ v0.4 · Device alarm | canonical alarm ID, vendor text, priority, onset, duration, signal validity, bedside acknowledged (who, when), de-duplication key (AL-10 to AL-12) | Simulator events |
| ▲ v0.4 · Intake / output | hourly urine output, intake, net balance, daily weight (SV-16) | Simulator charted batches |
| ▲ v0.4 · Patient (scenario fields) | payer tag, county rurality code, preferred language, structured social-needs fields, designated family contact; payer and rurality are reporting-only and excluded from every score (UC, Intake C11) | Seed |
| Sepsis episode | t0, criteria evidence, exclusions, bundle elements with status and times, prompt outcomes | Sepsis tracker |
| Work item / Task | type, assignee/role, due, status, patient | Prototype DB |
| Message / Thread | hospital, channel, sender role, urgency, read state | Simulator + prototype DB |
| Consult | specialty, requester, specialist, status, recommendation | Prototype DB |
| Specialist profile | credentials, licenses (states), privileges (hospitals), boards, availability | Seed |
| AI interaction | prompt, answer, citations, outcome | Prototype DB (synthetic audit) |

**Longitudinal content needed for chat (M):**
- prior echo reports (at least 3)
- specialist notes (hepatology, cardiology)
- prior admissions summary
- micro results
- imaging reports

These are needed for scenario patients. [D] CI-01.

### ▲ v0.6 · 8.1 Data model v1 (consolidated and locked for the backend blueprint, Oct 29)

The full attribute list is in the backend blueprint (kept in Cowork). This table is the index; the table above (v0.1 to v0.5) is kept as the record.

| Group | Entities |
|---|---|
| Tenancy and places | Hospital (tenant: EHR profile, protocol profile, connection status, write-back settings, consent profile, rurality code, hub or spoke), Unit, Bed |
| People and coverage | Clinician (role, home organization), Coverage Assignment (hospitals covered, shift, backup flag), Specialist Profile |
| Patient | Patient (hospital-scoped; reporting-only payer, rurality, social needs; designated contact), Encounter |
| Devices and profiles | Device, Device Profile, EHR Profile, Protocol Profile (versioned parameters, §7.1) |
| Clinical data | Observation (origin device / charted / lab / calculated; signal quality), Device Alarm (bedside acknowledgment, de-duplication key), Respiratory Support (invasive / BiPAP / high-flow / conventional; streamed or charted), Intake and Output, Lab Result |
| Orders and meds | Order (proposed → active → modified / discontinued / completed / past due; origin; co-sign; write-back status), Infusion (dose unit, rate, target response metric), Medication Administration |
| Documentation | Note (types incl. initial consult, progress with overnight events, ICU recommendations; statuses incl. unverified, signed, addendum) |
| Logic outputs | Platform Alert (severity Critical / High / Medium / Low; states; resolution reasons; rule and protocol versions), Deterioration Score (factors, 24 h change), Sepsis Episode (SIRS count, Time Zero proposed and confirmed, element statuses), Scheduled Check, Task |
| Coordination | Message Thread, Message (incl. family updates with clinician decision), Consult (requested → matched → accepted → in session → delivered → closed; EHR-order source) |
| AI and records | AI Interaction (structured spec, citations, outcome), Inbound Message Log (raw HL7 v2), Outbound Message Log, Event Log, Audit Entry, Demo Run |

## 9. Integration Requirements

All integrations are **simulated** in this phase (BR). The prototype's internal interfaces still follow real standards, so production feeds can replace the simulator later (CT: "don't do the work twice").

| Integration class | Prototype treatment | Standard to emulate [R] |
|---|---|---|
| Bedside monitor | Simulator stream | IHE PCD-01 (HL7v2 ORU^R01, IEEE 11073 nomenclature); FHIR R4 Observation. **▲ v0.2:** mirrors GE CARESCAPE Gateway output (HL7 2.3/2.4, PCD-01; inbound ADT). |
| Ventilator | Simulator stream | Same as monitor. **▲ v0.2:** gateway-level output. Dräger's path is the CC300 + Infinity Gateway Suite; Hamilton's is its Block Protocol via third parties. The device protocols are not emulated. |
| Infusion pump | Simulator stream | IHE PCD-01 observations; PCD-03 (PIV) is out of scope. **▲ v0.2:** B. Braun integrates with the EMR over IHE via DoseTrac / OnlineSuite plus (platform: SQ-15). |
| Alarms | Simulator events | IHE PCD-04 (ACM) shape |
| Labs | Simulator events | HL7v2 ORU^R01 / FHIR Observation, DiagnosticReport |
| ADT | Simulator events | HL7v2 ADT^A01/A02/A03/A08 |
| EHR chart, notes, orders | Simulated EHR service | FHIR R4 Patient, Encounter, Condition, MedicationRequest, ServiceRequest, DocumentReference |
| Hospital messaging | Simulated channels | Channel-labeled messages (no vendor API) |
| Camera / video | Prerecorded clips | — |
| Identity | Simulated sign-in | — |
| LLM provider | Real model on synthetic data | Per Archie/AWS decision (D-08) [A] |
| Voice-to-text | Real service on demo voice input | Per D-08 [A] |

▲ v0.4 · **Direction (DEC-19):** standards at the edge, one canonical model inside. Devices emit IHE PCD-01; EHR feeds are HL7 v2 through one profile per EHR brand (Epic, Cerner, Meditech, TruBridge): ADT A01/A02/A03/A08/A12, ORM^O01 orders and consults, RDE/RAS^O17 medications, ORU^R01 labs, MDM notes, hourly charted batches (versions per profile, from TD). The chart API stays FHIR-shaped inside the prototype. A reserved adapter slot holds proprietary connectors (e.g., the Ceiba bedside box); not built unless a customer requires it.

Integration **depiction** rules: CL-01 to CL-04 in the Definition Workbook (DEC-04).

## 10. UX Requirements

| ID | Requirement | Source |
|---|---|---|
| UX-01 | "What do I need to know, and nothing more": the census answers who's on a vent, on pressors, teetering, stable — at a glance | SP 9.1 #2 |
| UX-02 | Dense but quiet: density levels in the design system; no decorative clutter | SP 9.1 #3 |
| UX-03 | Provenance and freshness next to the data, not hidden in tooltips | SP 9.1 #6 |
| UX-04 | AI outputs look like AI outputs: posture label, confidence where relevant, citation, actions | SP 9.1 #7–9 |
| UX-05 | Trust calibration: screen-sourced, device-sourced and AI-drafted data are visually distinct **▲ v0.3:** clinical surfaces use generic provenance labels (Bedside monitor, Ventilator, Pump, EHR feed, Lab interface, Agent, Clinician); named platforms only in System Administration (CL-03). | SP 9.1 #8 |
| UX-06 | Degraded states: stale, missing, loading, error, empty, "AI can't answer" | SP 9.1 #12 |
| UX-07 | One workspace: modules render inside the Provider Desktop, not as separate destinations | SP 9.1 #11 |
| UX-08 | Voice is a first-class input on chat and navigation | SP 9.1 #5 |
| UX-09 | Keyboard paths for core flows; Esc closes overlays; icon buttons labeled | SP 9.1 #13 |
| UX-10 | Primary viewport ≥1440px; usable at 1280px; multi-monitor friendly | SP 3.1, PR issue |
| UX-11 | No dead controls on any scenario path; off-path features clearly labeled as preview | BR, OBJ-5 **▲ v0.7:** the repo's Ask panel has inert voice, dictate and attach buttons (CX-03); hide or label them "Preview" (Design Update Spec DU-29). |

## 11. Non-Functional Requirements (prototype subset)

| ID | Requirement | Target |
|---|---|---|
| NFR-01 | Context switch between patients | < 1s [A] |
| NFR-02 | Simulator → screen latency for a vital | < 2s [A] |
| NFR-03 | Chat answer | < 5s typical [A] |
| NFR-04 | Demo restart from any scenario checkpoint | < 30s [R] |
| NFR-05 | Concurrent demo sessions | ≥ 2 (rehearsal + live) [A] |
| NFR-06 | Availability during scheduled demos; demo and dev environments separate | Demo env frozen 24h before demos [R] |
| NFR-07 | Browser support | Latest Chrome / Edge [A] |
| NFR-08 | i18n readiness | UI strings externalized; Spanish toggle is N |
| NFR-09 | Accessibility | Keyboard + labels on core flows; full AA later |

## 12. Security and Privacy

- Synthetic data only; no PHI in data, prompts, logs, recordings or screenshots (BR) [C].
- The demo environment is access-controlled (no public URL without auth) [R].
- LLM calls send synthetic data only; no training on inputs [A] (D-08).
- A synthetic audit trail is shown in the UI as a design element. It is not a compliance system [C].
- Archie internals (prompts, models, generation tooling, simulator) stay out of the handoff (BR) [C].
- Prototype is a demonstration artifact, not for clinical use (BR) [C].

## 13. Reporting / Analytics Needs

Prototype scope is light:

- Per-hospital sepsis compliance summary (VS-08, S)
- Alert counts per hospital and tier (S)
- AI agent acceptance rates, synthetic (SA-03, D/S)
- Shift digest (HO, S)

Clinical Analytics & Benchmarking (5.11) and Compliance & Reporting (5.12) are **deferred modules**. Any screens are "preview" only (N).

## 14. Simulator Requirements (summary)

Full detail: ~~*Intercept Live — Simulator Requirements & Open Questions*~~ ▲ v0.4: the Google Doc *Real-Time Data Simulator Specification* (revision 5 records these changes as proposed). Key requirements:

| ID | Requirement |
|---|---|
| SIM-01 | Scenario-driven streams for monitor, vent, pumps, labs and ADT |
| SIM-02 | Simulated EHR |
| SIM-03 | Prerecorded camera |
| SIM-04 | Operator start / stop / reset / inject |
| SIM-05 | Time compression |
| SIM-06 | Deterministic replays |
| SIM-07 | Standards-shaped messages |
| SIM-08 | Runs only during demos |
| ▲ v0.2 · SIM-09 | Device-agnostic: vendor specifics live in versioned device profiles; adding a device of an existing class requires no code change (DEC-10) |
| ▲ v0.2 · SIM-10 | Feeds the prototype backend in Archie through the same ingestion adapters real gateways would use (DEC-11) |
| ▲ v0.4 · SIM-11 | One profile per EHR brand (message flavor, field mapping, versions) on the same pattern as device profiles (SD-13, DEC-19) |
| ▲ v0.4 · SIM-12 | Charted data stream: hourly vitals and intake-output batches that agree with the device stream (SV-16) |
| ▲ v0.4 · SIM-13 | Artifact injection with a signal-quality flag; alarm onset, duration and acknowledgment events (AL-10 to AL-12) |
| ▲ v0.4 · SIM-14 | Scenario engine additions for UC: multi-day jump, per-site bandwidth drop, still-image events, run-event export to the outcomes layer |

## 15. Assumptions

| ID | Assumption |
|---|---|
| A-01 | Nov 13 is the initial-prototype due date (DEC-02) |
| A-02 | The ten modules are SP 5.1–5.9 plus Specialty Care Access |
| A-03 | The grant demo is ~Nov 16–23 and uses the Nov 13 build |
| A-04 | Archie on AWS supports real-time streaming to the React front end |
| A-05 | The LLM runs via an AWS-hosted provider on synthetic data |
| A-06 | The simulator emits middleware-level standard messages (not raw vendor protocols). **▲ v0.2:** supported by device specs; awaiting SQ-02. **▲ v0.4:** partly valid; two device paths at a client hospital. Direction decided (DEC-19). |
| A-07 | Demo persona is the intensivist; hospital names are fictional |
| A-08 | The v0 cohort (14 patients, 3 hospitals) is reused after clinical cleanup |
| A-09 | Camera video is licensed or synthetic, with no real patients |
| A-10 | Desktop-first; mobile only if a scenario needs it |
| ▲ v0.2 · A-11 | Evita V800 is the main ICU ventilator (SQ-12) |
| ▲ v0.2 · A-12 | The CARESCAPE ONE parameter set is close enough to its B-series host for the demo (SQ-13) |
| ▲ v0.4 · A-14 | The Nov 9 application can use screens and a recorded walkthrough (P-DEC-21) |

## 16. Dependencies

D-01 through D-14 are listed in the RAID Register. Critical:

| ID | Dependency |
|---|---|
| D-01 | Scenarios |
| D-02 | Devices (▲ v0.2: partly received Oct 27) |
| D-04 | Acuity |
| D-05 | Grant criteria |
| D-06 | SOW |
| D-07 | Deep-dive spec |
| D-08 | Environment + LLM |
| D-09 | Engineers + QA |
| ▲ v0.2 · D-15 | Intercept's Nebraska pilot-partner LOI (track only) |
| ▲ v0.4 · D-19 | Lisa-Mae's thresholds, alarm actions and remaining diagnoses (Nov 2) |
| ▲ v0.4 · D-20 | Albert's OK on P-DEC-20 to P-DEC-22 |
| ▲ v0.4 · D-21 | Consolidation call with Diego |

## 17. Open Questions

| # | Question | Owner |
|---|---|---|
| Q-01 | What are the six scenarios, and their success criteria? **▲ v0.2:** six candidates drafted; confirmation and walkthroughs requested. | Diego, Israel, Lisa-Mae **▲ v0.4:** received (UC); consolidation proposed (P-DEC-20). |
| Q-02 | Does the Nov 9 application need prototype assets? | Diego **▲ v0.4:** proposal: screens plus a recorded walkthrough (A-14). |
| Q-03 | Acuity score definition? | Israel |
| Q-04 | Bedside and family surfaces: in or out? | Albert + Diego |
| Q-05 | Specialties and family role in the consult? | Diego |
| Q-06 | Which personas appear in the demo (intensivist only, or APP/RN too)? | Albert |
| Q-07 | Administration prototype depth? | Albert |
| Q-08 | Hospital names: generic fictional, or styled after real customer types (rural NE, LA)? | Albert / Diego **▲ v0.4:** Diego's scenarios use real Nebraska hospitals; ask on the consolidation call. |
| Q-09 | Which messaging channels and vendor labels to show? | Lisa-Mae |
| Q-10 | Two-Midnight and RCM items in an investor variant? | Albert |
| ▲ v0.4 · Q-11 | Alarm thresholds, and which alarms go to the bedside vs the intensivist? | Lisa-Mae (I-26) **▲ v0.5: answered** (LM, Oct 29): thresholds table received; escalation is the bedside nurse's call (BR-14). |
| ▲ v0.4 · Q-12 | Which device delivers BiPAP at a rural site: the ICU ventilator in NIV mode or a separate unit? | Lisa-Mae (Intake C8) **▲ v0.5: answered:** a separate BiPAP unit, not integrated; device names to follow (Q-14). |
| ▲ v0.5 · Q-13 | SIRS temperature threshold: > 38 °C (guide) or > 38.3 °C (SEP-1 baseline)? | Lisa-Mae / Israel (script review) **▲ v0.6:** her mockups also use > 38 °C. |
| ▲ v0.5 · Q-14 | Names of the BiPAP units used at the rural sites | Lisa-Mae |
| ▲ v0.6 · Q-15 | Sepsis timing shown in the demo: hour-1 bundle timer, SEP-1 3 h / 6 h deadlines, or both? | Diego / Israel (script review) Her SEP-1 tracker mockup shows only the 3 h and 6 h deadlines. |
| ▲ v0.6 · Q-16 | Walter desaturates to 86% (UC) but SpO₂ is Critical only below 85% [R]: confirm the cut-off and the overflow window so Act 3 fires as scripted | Lisa-Mae / Israel (script review) Her ventilated-COPD mockup shows 84%. |

## 18. Explicitly Out of Scope

See Definition Workbook §5.7. In short:
- live integrations
- production architecture
- deferred modules 5.10–5.17
- marketplace transactions
- deterioration prediction
- depicting screen-operated extraction or embedded EHR sessions
- real patient data
- native mobile
- the simulator as a client deliverable
- scenarios beyond about six without a change request
- ▲ v0.3 · regional ICU bed management, transfer and repatriation (client idea, Oct 27; narrative only, CI-15)
- ▲ v0.3 · ACCESS Connect / CMS ACCESS eligibility and marketplace (client idea, Oct 27; narrative only, legal review, CI-15)
