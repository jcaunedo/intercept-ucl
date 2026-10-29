<!--
SNAPSHOT — read-only copy published from Cowork (DEC-20).
Document: Intercept Live · Simulator Requirements (Cowork) · v0.6
Snapshot date: 2026-10-29 · Snapshot set: v1 · Published by: CX-04
Source of truth: Cowork project "Intercept Telehealth - Series B". Do not edit here;
propose changes in a PR comment or an RCP, and Carlos updates the source and re-publishes.
Sanitized for the repo: no Archie prompts, no client-confidential interface material.
-->

# Intercept Live — Real-Time Data Simulator: Requirements & Open Questions

**Version 0.6** (aligned with the Google Doc v0.6, rev. 6) · Oct 29, 2026 · Owner: Carlos Jimenez (Archie engineering lead) · Internal Archie Labs tooling, not delivered to Intercept (BR)

Tags: [C] confirmed · [P] prototype behavior · [A] assumption · [R] recommendation · [Q] open question · [D] dependency

**Change tracking.** Each `▲ vX.Y · date` callout sits next to the content it changed. Unmarked content is the v0.1 baseline. The table below is the full history.

| Version | Date | Changes |
|---|---|---|
| v0.1 | Oct 26 | Baseline: sources, scope, interface layer, architecture, build plan, open questions |
| v0.2 | Oct 27 | First device list (Women's & Families); device baseline (§3a); interface evidence from manufacturer specs (§7); SQ-12 to SQ-16 |
> ~~**▲ v0.4 · Oct 28 — This file is frozen at v0.3.**~~ **▲ v0.6 · Oct 29:** unfrozen; §0 mirrors the Google Doc. Earlier note: The living simulator specification is now the Google Doc [Intercept Live · Real-Time Data Simulator Specification (v0.4)](https://docs.google.com/document/d/1JixW1yNy7d9WQ6GmGS-RU3FnPnrFXZFsy89ANJojaUo/edit). It carries everything below plus revision 3 (repo and PRD reconciliation) and revision 4 (decision log with reasons, open items log, epics and user stories). Make changes there, in Suggesting mode.

| ▲ v0.6 | Oct 29 | **Unfrozen and re-aligned** (Change Log UPD-13): §0 current baseline added, mirroring the Google Doc (rev. 5 and 6) and the backend blueprint. Sections 1–14 below are the v0.3 record; where they differ, §0 wins |
| v0.3 | Oct 27 | **Vendor scope decided** (DEC-09); **device-agnostic foundation** (§3b) with profile schema, canonical model and add-a-device checklist; Albert's direction recorded: the simulator feeds the prototype backend in Archie (DEC-11) |

---

## ▲ v0.6 · 0. Current baseline (Oct 29)

The Google Doc *Intercept Live · Real-Time Data Simulator Specification (v0.6)* remains the full specification and decision log. This section is the short, current list of what the simulator must do, so the Cowork copy no longer drifts. Source of truth: System Spec, first prototype, latest transcripts (DEC-18); client inputs (UC, LM, TD) answer questions.

### 0.1 Role and boundary

- The simulator is a **separate service**. It streams synthetic data into the prototype backend in Archie through one ingestion endpoint (single and batch), using a **canonical event envelope** with the original HL7 v2 message as provenance (backend blueprint, kept in Cowork). Where its code lives is Jorge's call (P-DEC-12).
- Internal Archie tooling; not delivered to Intercept (BR). Synthetic data only.

### 0.2 Interface (DEC-19)

| Output | Standard | Notes |
|---|---|---|
| Device numerics and alarms | IHE PCD-01 (HL7 v2 ORU^R01), IEEE 11073 codes, UCUM units | Monitor, ventilator, pump. Alarm raise, clear and **bedside acknowledgment** events (SD-15) |
| EHR feeds | HL7 v2 per **EHR profile** (Epic, Oracle Health, Meditech, TruBridge; SD-13) | ADT A01/A02/A03/A08/A12; ORM^O01 orders and consults; RDE/RAS^O17 medications; ORU^R01 labs (LOINC); MDM notes |
| Charted data | Hourly batches | Vitals, intake and output, **BiPAP and high-flow settings (charted, SD-14)**, neuro checks, glucose |
| Other events | Canonical only | Still images (device screen, blood gas), hospital network state (normal, degraded, offline) |
| Reserved slot | Proprietary direct connectors (for example the Ceiba bedside box) | Not built unless a customer requires it |

### 0.3 Profiles (data, not code)

- **Device profiles:** Dräger Evita V800, GE CARESCAPE, B. Braun Infusomat (streamed); generic BiPAP and generic high-flow nasal cannula (charted). Software version may be "unknown".
- **EHR profiles:** one per brand: message flavor, HL7 version per message type, field mapping.
- **Protocol profiles:** clinical parameters per hospital, read by the backend (Requirements §7.1); the simulator only needs them to script expected values.

### 0.4 Scenario engine

| Capability | Status |
|---|---|
| Start, pause, reset, inject; time compression; deterministic replays; runs only during demos | Baseline (v0.3) |
| One continuous night across 5 hospitals and 12 patients (Nebraska network) | Proposed (P-DEC-20) |
| Multi-day jump (S6), seeded synthetic month (dashboard Mock) | Proposed; second phase |
| Charted-vitals and intake-output batches agreeing with device streams | Proposed (SIM-12) |
| Artifact injection with signal-quality flag; alarm onset, duration, bedside acknowledgment | Proposed (SIM-13) |
| Per-site bandwidth drop, still-image events, run-event export | Proposed (SIM-14); bandwidth mode is second phase |
| Post-thrombolysis check schedule and other scheduled charted events | Proposed (LM, Oct 29) |

### 0.5 Scenario demand (proposed baseline, P-DEC-20)

| Part | Patients | What the simulator must produce |
|---|---|---|
| Open | All 12 | Steady census across 5 hospitals and 4 EHR profiles |
| Act 1 · Margaret (S1) | Heart failure, Chadron floor | RR 18 → 26, SpO₂ to 89% on 4 L, HR 112, net +1.8 L, weight +2.1 kg/48 h; BNP 2,400; prior echo reports; BiPAP charted; urine output response to diuretic |
| Act 2 · Rosa (S3) | Septic shock, Sidney ED | BP 84/48, HR 124, 39.4 °C, lactate 3.8 → 1.6, glucose 390, eGFR 22; cultures, antibiotics, fluids, peripheral norepinephrine, insulin infusion |
| Act 3 · Surge (S5) | Walter (ventilated COPD, Regional West ICU); Linda (stroke, Sidney) | Walter: SpO₂ to 86% on the ventilator; Linda: NIHSS 9, CT, thrombolysis, then the check schedule; two Critical events within 2 minutes |
| Close (S6) | Margaret, day 11 | Mock only in the first build |
| Second phase | Dale (S2), Tyler (S4), Margaret's return (S6) | BiPAP blood gases, bandwidth drop; DKA hourly labs; readmission |

Values are Diego's walkthrough values (UC) and Lisa-Mae's illustrative parameters (LM). They lock at the script review (Nov 3–4).

### 0.6 Open items

- Simulator home (P-DEC-12, Jorge).
- BiPAP device names (OI-27); SIRS temperature threshold (OI-28); reference protocol acceptable for the demo (OI-29).
- Scenario cut and Nov 9 format (OI-26, consolidation call).

---

## 1. What every source says about the simulator

| Source | What it says |
|---|---|
| IK (Oct 20) | "We're not going to integrate with those hospitals right now. That's part of what the simulator needs to do" (note sync with the medical record). The simulator covers vital signs and the EHR chart connection. Albert: start with the simulator, then "an inventory of all the devices… simulate the protocol of what those things do." |
| BR | Streams synthetic data the way live sources would: **in-room devices (bedside monitors, ventilators, infusion pumps), lab and ADT feeds, and hospital EHRs**. Drives surveillance, alerting and Virtual Sepsis, with **realistic trends over time (a patient deteriorating)**. **Runs only during demos.** Internal tooling; it stays with Archie and is excluded from the handoff. |
| CT (Oct 22) | Create "the speeds and feeds" of the devices and a simulator that "we can turn on and off." Camera = **prerecorded video**. Imitate the device interfaces ("how those devices talk to Ceiba"), so the real device connects later and "we don't have to do the work twice." **One device of each type, the most modern** (Women & Families, Temple). Devices: **ventilator + bedside monitor + pumps; dialysis dropped.** EHR side: simulated Epic back end for the chart, documenting care (progress note), retrieving the chart, placing orders, with AI around it. Diego: lab, vitals and pharmacy data come through EMR interfaces. |
| SP | No simulator section. Target interfaces: SP 6.6 (HL7v2 ORU/ADT/OMG, FHIR Observation, vendor feeds), 7.8–7.12 (monitor, vent and pump families; lab, pharmacy, ADT). |
| PR | **No simulator.** All numbers are static. Waveforms and video are looped visuals. |
| ▲ v0.2 · Device list (Oct 27) | Women's & Families uses:<br>• Ventilators: **Dräger Evita V800**, **Hamilton C1**, **Hamilton MR1**<br>• Bedside pumps: **B. Braun Infusomat**<br>• Monitor: **GE CARESCAPE ONE** (listed as "Carescape 1")<br>Temple not yet covered. See §3a. |
| ▲ v0.3 · Albert (Oct 27) | "In addition to the simulator, we want to create a backend for the prototype in Archie. The Simulator should feed it." Recorded as DEC-11; matches §12. |

## 2. Purpose and users

**Purpose.**
- Make the prototype behave like the real product: data arrives, changes and triggers the modules the way hospital feeds would.
- Do this on synthetic data, and through interfaces shaped like the production ones.

**Users.**

| User | What they do with it |
|---|---|
| Demo Operator (Archie, possibly Intercept presenters) | Runs scenarios |
| Archie engineers | Build and test the platform side against it |
| Clinical reviewer (Israel / Lisa-Mae) | Validates the physiology. Has no direct UI. |

Audiences never see the simulator. They see its effects.

## 3. Scope

| Stream | Content | Priority |
|---|---|---|
| Bedside monitor | HR, rhythm label, SpO₂, NIBP sys/dia/mean, ABP sys/dia/mean, RR, Temp, optional EtCO₂/CVP; device alarms | M |
| Mechanical ventilator | Mode; set RR / Vt / PEEP / FiO₂ / PS / Ti; measured RR total, Vte, MVe, Ppeak, Pplat, Pmean, I:E; alarms | M |
| Infusion pumps (per channel) | Drug, concentration, rate mL/h, dose (e.g., mcg/kg/min), titration events, volume remaining; occlusion / near-end alarms | M |
| Labs | CBC, BMP/CMP, lactate, ABG/VBG, coags, cultures (pending → result), troponin, ammonia… per scenario | M |
| ADT | Admit, transfer, discharge, update events driving the census | M |
| EHR (simulated) | Chart (problems, allergies, history, home meds), notes and documents (incl. longitudinal echo/specialist notes), orders, MAR; accepts write-back of signed notes and orders | M |
| Camera | Prerecorded clips per bed/scene; "presets" switch clips; scribe transcript per scenario | M |
| Hospital messaging | Scripted inbound messages from bedside roles per channel; accepts replies | S |
| Consult | Scripted specialist join + recommendation | S |

## 3a. Device baseline and vendor scope

> **▲ v0.2 · Oct 27** — Section added from the first device list. **▲ v0.3 · Oct 27** — Vendor scope changed from *proposed* to *decided* (DEC-09).

**Source:** device list from Intercept, Oct 27 (Women's & Families). Specs come from the manufacturers' current published documents and FDA records, linked below. They do not come from Intercept, so the parameter sets are [C] for the device and [A] for what Intercept's team actually uses (SQ-03).

| Device | Class | Key parameters (published) | How it reaches hospital systems (published) | Prototype role |
|---|---|---|---|---|
| **GE CARESCAPE ONE** | Monitor | ECG (3/5/6/10-lead) with ST and arrhythmia; SpO₂; built-in NIBP; invasive pressure (dual-channel module); dual temperature; CO₂; impedance respiration. Docks to a CARESCAPE B450 / B650 / B850 host, which then owns display and alarms. | CARESCAPE Gateway:<br>• Outbound HL7 2.3/2.4 and **IHE PCD-01** (HL7 2.6, IEEE 11073)<br>• Inbound ADT<br>• Vitals on Demand<br>• High-speed waveform feed | **Nov 13 — monitor profile** |
| **Dräger Evita V800** | Ventilator (ICU) | Modes: VC-CMV/SIMV/AC/MMV, PC-CMV/SIMV+/AC/APRV/PSV, SPN-CPAP/PS/VS/PPS.<br>Set: RR, Ti, VT, flow, Pinsp, PEEP, Psupp, FiO₂, trigger.<br>Measured: Pplat, PEEP, PIP, Pmean, MVe, VT, RR, FiO₂, etCO₂; Cdyn, R, RSBI, NIF, P0.1.<br>Alarms: MV, Paw, FiO₂, etCO₂, RR, VT, apnea, disconnection. | Device: RS-232 with MEDIBUS / MEDIBUS.X; LAN; USB.<br>Standards-based output (ISO/IEEE 11073 SDC) through the Connectivity Converter CC300.<br>EMR documentation through CC300 + Infinity Gateway Suite. | **Nov 13 — ventilator profile** (main-ICU assumption pending SQ-12) |
| **Hamilton C1** | Ventilator (compact ICU / transport) | Modes: APVcmv, APVsimv, PCV+, PSIMV+, SPONT, ASV; DuoPAP, APRV, NIV (options).<br>Measured: Ppeak, Pplateau, ΔP, AutoPEEP, PEEP, VTE/VTI, MinVol, fTotal, Cstat, RCexp, RSB, P0.1; optional CO₂ / SpO₂.<br>Alarms in high / medium / low priority. | Optional communication board; Hamilton's proprietary Block Protocol for third-party systems; connections to monitoring/EHR through third parties. | **Second ventilator profile — Dec 18, only if a scenario uses it** |
| **Hamilton MR1** | Ventilator (MR-conditional, 1.5T / 3T) | Same mode family as the C1 | Only USB listed as standard | **Out of scope** — MRI use, not ICU beds |
| **B. Braun Infusomat (Space)** | Large-volume pump | Per channel: drug, concentration, rate, dose, volume infused/remaining, status, alarms | IHE-based EMR integration through **DoseTrac** (Epic-validated AutoProgramming and AutoDocumentation).<br>Newer platform: Space plus with DoseLink plus on OnlineSuite plus (two-way HL7/IHE, including alarm data).<br>Which one the hospital runs: SQ-15. | **Nov 13 — pump profile** |

**Vendor scope (DEC-09, decided Oct 27 by Carlos)**

> **▲ v0.3 · Oct 27** — Was "[R] proposed, pending confirmation" in v0.2. Carlos approved it on Oct 27; Albert is informed.

- **Build one device profile per class for Nov 13:** monitor, ventilator, pump. This matches Diego on Oct 22: "I'm going to send you one of each… I don't think we need to get to 4 different… ventilator types."
- **Design for multiple vendors, build one per class.** The device-agnostic foundation in §3b means a second ventilator is one profile plus a clinical review. It needs no engine, adapter, platform or UI-template change.
- **Why not every vendor now:** the message format is standard, so the data plumbing costs little per vendor. The real cost per vendor sits elsewhere:
  - parameter and alarm content
  - vendor-specific mode names on screen
  - clinical review
  - extra QA paths
- **Second ventilator (Hamilton C1) by Dec 18 only if** a scenario tells the "two vendors, one view" story.
- **Hamilton MR1:** excluded.

**Sources:**
- [GE CARESCAPE ONE — FDA K200494](https://fda.innolitics.com/device/K200494)
- [GE CARESCAPE ONE brochure](https://www.gehealthcare.com/-/jssmedia/2a0ac5f01e4d4606837945a598a24dbd.pdf)
- [GE CARESCAPE Gateway](https://www.gehealthcare.com/en-gb/products/patient-monitoring/networking/carescape-gateway)
- [Dräger Evita V800 datasheet (© 2026)](https://www.draeger.com/Content/Documents/Products/evita-v800-ds-dmc-111230-en-2606-1.pdf)
- [Dräger Evita V800 product information](https://www.draeger.com/Content/Documents/Products/Evita-V800-pi-100887-en-master.pdf)
- [Hamilton C1 tech specs SW 3.0.x](https://hamilton-medical.com/dam/jcr:661ed50a-2f60-41cc-adc3-97eeb5553c87/HAMILTON-C1_tech-specs_v3.0.x_en_usa_10103181.02.pdf)
- [Hamilton C1 brochure SW 3.1.x](https://www.hamilton-medical.com/dam/jcr:d06509e6-5b87-455c-b719-8d7c23033792/HAMILTON-C1_brochure-v3.1.x_brochure_en_ELO20250405S.00.2026-05-05-08-50-04.pdf)
- [Hamilton Digital Solutions](https://www.hamilton-medical.com/Products/Digital-Solutions.html)
- [Hamilton MR1 tech specs SW 3.1.x](https://www.hamilton-medical.com/dam/jcr:ac363cdd-ef68-40eb-b035-d744ebd73e24/HAMILTON-MR1_tech-specs_v3.1.x_en_usa_10103183.04.2026-05-05-08-50-14.pdf)
- [B. Braun interoperability](https://www.bbraun.com/en/products-and-solutions/therapies/infusion-therapy/automated-infusion-systems/interoperability-in-health-care.html)
- [B. Braun Infusomat Space × Epic (2016)](https://www.biospace.com/b-braun-medical-s-infusomat-space-pump-completes-new-emr-system-integration)

## 3b. Device-agnostic foundation (DEC-10)

> **▲ v0.3 · Oct 27** — New section. **Goal:** adding a device later means writing a profile (data), not code. Everything vendor-specific lives in a profile. Everything else is vendor-neutral.

### Principles

1. **Vendor-neutral core.** None of the following ever reads a vendor field:
   - scenario engine
   - generators
   - ingestion adapters
   - platform logic (alert rules, Sepsis Sniffer and Tracker, vent-order mismatch)
   - UI panel templates
2. **Canonical metrics everywhere.**
   - Each value is identified by a canonical metric ID, mapped to its IEEE 11073-10101 nomenclature code (the codes PCD-01 carries).
   - Units are expressed in UCUM.
   - Labs use LOINC.
   - Vendor labels exist only for display.
3. **Profiles are versioned data.** A device profile is a validated file (JSON/YAML) with its own version and source references. Changing a profile never requires a code change.
4. **Scenarios are written against device classes, not models.** A scenario says "ventilator: PEEP rises to 12." The bed's profile decides how that appears. Swapping the Evita V800 for a Hamilton C1 on a bed changes no scenario.
5. **One generator and one panel template per device class.** A new *model* in an existing class is a profile only. A new *class* (e.g., dialysis machine, wearable patch) adds one class definition, one generic generator and one panel template, once.
6. **Same mapping serves production later.** The canonical model and code mappings are what real gateway feeds (CARESCAPE Gateway, Dräger CC300 / Infinity, B. Braun DoseTrac) would be normalized into. The simulator and the real feeds then meet at the same ingestion adapters.

### Canonical device model

| Element | What it is | Example |
|---|---|---|
| **Device class** | The kind of device: `monitor`, `ventilator`, `infusion_pump`; extensible | `ventilator` |
| **Device profile** | One manufacturer + model + software version | `draeger.evita-v800@1.0.0` |
| **Device instance** | A profile bound to a bed in a hospital (tenant-tagged) | Bed MICU-4, St. Vrain → `draeger.evita-v800@1.0.0` |
| **Channel** | Sub-unit where a device has several (pump channels, pressure channels) | Pump channel B (norepinephrine) |
| **Metric** | Canonical value with kind `setting`, `measured` or `calculated` | `vent.peep.set`, `vent.peep.measured` |
| **Mode** | Canonical mode family plus the vendor's display name | family `pressure_control_ac` → Dräger "PC-AC" / Hamilton "PCV+" |
| **Alarm** | Canonical alarm ID, vendor text, priority mapped to a common 3-level scale | `vent.mv.low` → Dräger "MV low" · Hamilton high priority "Low minute volume" |
| **Waveform** | Canonical waveform type, rendered client-side (§7) | `vent.paw`, `vent.flow`, `ecg.ii` |

### Device profile schema (v1)

| Field | Content |
|---|---|
| `profile_id`, `version` | e.g., `ge.carescape-one`, `1.0.0` (semantic versioning) |
| `manufacturer`, `model`, `software_version` | From the official spec; `software_version` set to `unknown` until SQ-14 is answered |
| `device_class` | `monitor` · `ventilator` · `infusion_pump` · … |
| `sources` | Links to the manufacturer documents used (see §3a) |
| `metrics[]` | For each: `canonical_id`, `vendor_label`, `kind`, `mdc_code` (IEEE 11073), `ucum_unit`, `range`, `resolution`, `sample_interval`, `display_order` |
| `modes[]` | `canonical_family`, `vendor_name`, the settings each mode exposes |
| `alarms[]` | `canonical_id`, `vendor_text`, `priority` (high/medium/low), condition on canonical metrics |
| `waveforms[]` | Canonical waveform types the device shows |
| `channels` | Count and type (e.g., pump channels) |
| `message_mapping` | How metrics map into PCD-01 OBX segments (observation hierarchy, units); default rules per class, overrides per profile |
| `display_hints` | Optional: which metrics are primary on the panel, grouping |
| `clinical_review` | Reviewer, date, notes (Israel / Lisa-Mae) |

### Contracts between components

| Component | Consumes | Produces | Never touches |
|---|---|---|---|
| Scenario engine | Scenario script (class-level metrics and events) | Canonical trajectories per bed | Profiles, vendor names |
| Class generator | Trajectory + the bed's profile (ranges, resolution, sample interval, alarm conditions) | Canonical observations and alarms | Message formats |
| Message adapter | Canonical observations + profile `message_mapping` | PCD-01 / ORU / ADT messages | Scenario logic |
| Ingestion adapter (platform) | PCD-01 / ORU / ADT (simulated now, real gateways later) | Canonical events into the Archie backend | Vendor protocols |
| Platform logic | Canonical metrics and alarms | Alerts, sepsis states, mismatch flags | Vendor fields |
| UI panel template (per class) | Canonical data + profile display fields (labels, units, mode names, alarm text) | Vendor-faithful panel | Device-specific code |

### Adding a device later — checklist

**Same class (e.g., a second ventilator): profile only.**
1. Collect the manufacturer's current tech spec (web, not memory) and record it in `sources`.
2. Write the profile: metrics, modes, alarms, ranges, units.
3. Map metrics to IEEE 11073 codes and UCUM units. Reuse existing canonical IDs; add new ones only for values with no canonical equivalent.
4. Clinical review (Israel / Lisa-Mae) of ranges, defaults and alarm wording.
5. Pass the schema validation and the golden-message test: a fixed scenario must produce the expected PCD-01 output.
6. Bind the profile to a bed in the cohort seed. Nothing else changes.

**New class (e.g., dialysis, wearable patch):** do the same, plus:
- add the class definition (canonical metrics for the class)
- add one generic generator
- add one panel template (Julio)

This is a one-time cost per class.

### Quality gates

- Every profile passes schema validation before the engine loads it.
- Golden-message tests per class: the same scenario through two profiles of one class produces messages that differ only in vendor display fields and device identifiers.
- Profile changes bump the profile version and are noted in this document's change log.

## 4. Inputs

- **Scenario definitions** — a timeline per patient:
  - baseline physiology
  - trajectories (e.g., MAP falls from 72 to 58 over 40 min)
  - discrete events (lab resulted, order administered, ADT)
  - scripted messages
  - camera clip and transcript
  - **▲ v0.3** written against device classes and canonical metrics (§3b), never vendor fields
- **Cohort seed** — hospitals, beds, devices, patients, history, documents. **▲ v0.3** includes the bed-to-profile binding.
- **Device profiles** — **▲ v0.2/v0.3** versioned profiles per the schema in §3b. v1 covers CARESCAPE ONE, Evita V800 and Infusomat (§3a).
- **Operator commands:**
  - start, pause, resume
  - speed (1×, 5×, 30×, 60×)
  - jump to checkpoint
  - inject event
  - reset
- **Platform write-backs** — signed orders and notes, which can change the trajectory (e.g., a pressor titration raises MAP).

## 5. Outputs

- **Standards-shaped messages** (see §7) onto the platform's ingestion layer.
- **Canonical events** to the Archie backend: observation, alarm, lab, ADT, document, message.
- **Simulated EHR API** responses: chart reads, write-back acknowledgements.
- **Camera stream reference** (clip URL plus overlay data).
- **Operator console state:** scenario clock, active checkpoints, injected events log.

## 6. Business logic

1. **Scenario engine.**
   - Owns a scenario clock separate from wall time, with compression.
   - Patients advance on their timelines.
   - Trajectories are interpolated with physiological noise.
   - Seeded randomness keeps replays deterministic.
2. **Coupled physiology (light).**
   - Defined responses for a small set of interventions per scenario:
     - fluids bolus → MAP up for a short time
     - norepinephrine rate change → MAP response after a lag
     - FiO₂ change → SpO₂ response
     - antibiotics given → bundle element complete
   - Scripted, not a physiology model. [R]
3. **Device alarms.** Fire when values cross device alarm limits, the way a real monitor does. Clinical alerting runs **downstream on the platform side**, not in the simulator, so the platform logic is real. [R] **▲ v0.3:** alarm conditions and wording come from the bed's profile.
4. **Lab cadence.** Results appear at scenario times, or after an order is signed plus a turnaround delay (e.g., lactate 20 min scenario-time).
5. **EHR behavior.**
   - Signed notes and orders get written and acknowledged.
   - They appear in chart reads.
   - Orders can trigger scenario branches.
6. **Checkpoints.** Named states, e.g., "t0 + 2h40m, repeat lactate due in 5 min". Any checkpoint restores in under 30s, so a demo can start mid-story.
7. **On/off.** The simulator runs only when a demo session is active (BR). When stopped, the UI shows the last data marked **stale** (this also demonstrates degraded-state handling).
8. **Isolation.** Each hospital's streams are tagged with that tenant. There are no cross-tenant streams (DEC-05).

## 7. Interface layer — what to emulate [R, A-06]

| Feed | Emulate | Why |
|---|---|---|
| Monitor, vent, pump observations | **IHE PCD-01 (DEC) — HL7v2 ORU^R01 with IEEE 11073-10101 nomenclature**, as emitted by monitoring gateways | This is what device-integration middleware sends to enterprise systems. Real feeds would arrive in this shape, so the ingestion layer is reusable. **▲ v0.2:** GE's CARESCAPE Gateway emits exactly this. |
| Device alarms | IHE PCD-04 (ACM) shape | Same reasoning |
| Labs | HL7v2 ORU^R01 (LOINC codes) | Standard lab interface (SP 7.11) |
| ADT | HL7v2 ADT^A01 / A02 / A03 / A08 | SP 7.12 |
| EHR chart, documents, orders | FHIR R4 resources (Patient, Encounter, Condition, AllergyIntolerance, Observation, DiagnosticReport, DocumentReference, MedicationRequest, MedicationAdministration, ServiceRequest) | SP 7.1/7.2 (FHIR R4 preferred, SP 10.4) |
| Internal stream to the front end | Canonical JSON over WebSocket/SSE (Archie pattern, E-1) | Front-end simplicity; waveforms rendered client-side from numerics + rhythm |

> **▲ v0.2 · Oct 27 — Evidence from the device list.** All four devices in scope reach hospital systems through a gateway or middleware that speaks HL7/IHE, not straight from the device (sources in §3a):
>
> | Device | Path to hospital systems |
> |---|---|
> | GE CARESCAPE ONE | CARESCAPE Gateway emits HL7 2.3/2.4 and IHE PCD-01, and takes inbound ADT |
> | Dräger Evita V800 | Speaks MEDIBUS at the device. Standards-based output goes through the CC300; EMR documentation through the CC300 + Infinity Gateway Suite. |
> | Hamilton C1 | Uses the proprietary Block Protocol at the device; third parties integrate it |
> | B. Braun Infusomat | Integrates with the EMR over IHE through DoseTrac or OnlineSuite plus |
>
> This supports A-06: emulate the gateway-level output, not the device protocols.
>
> **Still open: what feeds Ceiba today (SQ-02).** If Ceiba consumes a vendor protocol directly, we revisit this section.

**Not emulated:**
- raw vendor serial/LAN protocols (Philips Data Export, Dräger MEDIBUS, Hamilton Block Protocol, etc.)
- pump order programming (IHE PCD-03)

[R] Keep these out unless Intercept's device answers (CI-03) show that Ceiba consumes a specific vendor protocol we must mirror. **▲ v0.3:** If that happens, add a vendor-protocol adapter behind the same canonical model (§3b). The engine, profiles and platform stay as they are.

**Waveforms.**
- [R] The simulator streams numerics plus rhythm/state at about 1 Hz.
- The front end synthesizes ECG, pleth, ABP and resp waveforms consistent with them.
- Streaming 125–500 Hz waveform samples adds cost and risk with no visible gain in a demo.

## 8. What is mocked vs what is real

| Element | Real in the prototype | Mocked / simulated |
|---|---|---|
| Platform ingestion, alert rules, sepsis tracker, persistence | **Real** (Archie backend, fed by the simulator — DEC-11) | — |
| LLM for chat with the chart and scribe drafting | **Real model** on synthetic data (D-08) | The scribe's transcript is scripted per scenario |
| Voice-to-text for chat | **Real** service [A] | — |
| Device feeds, labs, ADT | — | Simulator |
| EHR | — | Simulated EHR service (FHIR-shaped) |
| Hospital messaging | — | Scripted channel messages |
| Camera video | — | Prerecorded clips |
| Specialist participation | — | Scripted join + recommendation |
| Identity / SSO | — | Simulated sign-in |

## 9. Data required

- **Cohort.** 3 fictional hospitals × 4–6 beds. Starts from the v0 cohort, with its 13 inconsistencies fixed.
- **Per scenario patient:**
  - baseline and trajectory scripts
  - lab schedule
  - meds and infusions
  - 10+ historical documents (H&P, prior discharge summaries, **≥3 echo reports**, **specialist notes**, imaging reports, micro)
  - camera clip
  - scribe transcript
- **▲ v0.2 · Device profiles:** GE CARESCAPE ONE, Dräger Evita V800 and B. Braun Infusomat for Nov 13; Hamilton C1 as an optional second ventilator (§3a). **▲ v0.3:** written to the §3b schema.
- **▲ v0.3 · Canonical metric catalog:** canonical IDs with IEEE 11073 code and UCUM unit for every metric used by the three classes.
- **▲ v0.2 · Typical settings and alarm limits** per scenario patient on those profiles, reviewed by Israel / Lisa-Mae (D-10).
- **Synthetic catalogs:** orders, order sets, specialists with licenses and privileges.

## 10. External dependencies

| ID | Dependency | Owner |
|---|---|---|
| D-02 | Device models — **▲ v0.2: partly received Oct 27** (Women's & Families list). Still needed: host monitor, main ventilator, software versions, pump platform, Temple devices (SQ-12 to SQ-16) | Diego |
| — | Interface details: how devices reach Ceiba today | Lisa-Mae / Eric |
| D-01 | Scenarios | Diego / Israel / Lisa-Mae |
| D-10 | Clinical review of physiology | Israel / Lisa-Mae |
| D-08 | Archie environment + AWS + LLM + voice | Carlos / Jorge |
| D-11 | Camera footage (licensed / synthetic) | Archie |
| E-1 | Archie streaming pattern | Jorge |

## 11. Still undefined

1. Scenario timelines and their physiology (D-01).
2. **▲ v0.2:** Device models are known (§3a), but software versions, the bedside host monitor, which ventilator is the main ICU unit, and the pump platform are still open (SQ-12 to SQ-16).
3. Whether Ceiba consumes a vendor-specific protocol we should mirror (CI-03 / SQ-02). **▲ v0.2:** The device specs suggest a gateway sits in the path for every device.
4. Who operates the simulator in live demos: Archie, Intercept, or both. And whether the console is visible to the presenter.
5. Speed of the demo story: real time vs compressed per scenario.
6. Number of concurrent simulated beds (proposal: 14, of which 4–6 are scripted and the rest drift as stable background).
7. Camera footage source and consent.
8. Which messaging channel labels to show.
9. Whether interventions should change physiology (coupled), or every scenario is fully scripted.

## 12. Proposed architecture [R]

> **▲ v0.3 · Oct 27** — Device profiles and the profile registry added. Albert's direction recorded: the simulator feeds the prototype backend in Archie (DEC-11).

```
Operator Console ─┐
                  ▼
        Scenario Engine (clock, compression, checkpoints, seeds)
            │  class-level trajectories (canonical metrics)
            ▼
   Class generators ◄── Device Profile Registry (versioned profiles: §3b)
   (monitor / vent / pump)        ▲ bed → profile binding (cohort seed)
            │  canonical observations + alarms
            ▼
   Message adapters (profile message_mapping → PCD-01 / ORU / ADT)
            │            Lab/ADT gen    EHR service (FHIR R4)    Message/camera script
            ▼                 │               ▲ write-back             │
     ── Ingestion adapters (PCD-01 / ORU / ADT parse → canonical events, tenant-tagged) ──
                                    │      (real gateway feeds plug in here later)
                     Prototype backend in Archie (AWS)
        alert rules · sepsis sniffer/tracker · vent-mismatch · work items · persistence · LLM
                                    │
                     WebSocket/SSE → React front end (class panel templates + profile display fields)
```

The simulator talks to the platform only through the adapters, exactly where real feeds would plug in later.

## 13. Build plan to Nov 13

| Window | Deliverable |
|---|---|
| Sprint 0 · Oct 27–30 | Engine skeleton (clock, seeds, compression); canonical event model; **▲ v0.3 profile schema + registry + canonical metric catalog**; **▲ v0.2 device profiles v1 for CARESCAPE ONE, Evita V800 and Infusomat** with IEEE 11073 code mapping; one stable bed streaming monitor numerics to the UI; FHIR-shaped EHR read for one patient |
| Sprint 1 · Nov 3–6 (Nov 2 is a Colombian holiday) | All three device classes from the v1 profiles; **▲ v0.3 class generators and golden-message tests**; labs and ADT; HL7-shaped messages + adapters (PCD-01 mirroring CARESCAPE Gateway output); checkpoints; operator console v1; scenario 1 scripted |
| Sprint 2 · Nov 9–13 | Remaining Nov 13 scenarios; write-back loop (orders change trajectories); stale/off behavior; demo hardening |
| QA · Nov 11–12 | Repeatable runs of each scenario × 3 with no divergence |

## 14. Simulator open questions / client inputs required

| # | Question / input | From | Needed by | Blocks |
|---|---|---|---|---|
| SQ-01 | Device list: manufacturer, model and software version for **one bedside monitor, one ventilator, one infusion pump**, from Women & Families / Temple | Diego | **Oct 27** | **▲ v0.2: partly answered Oct 27**. Models received for Women's & Families (§3a); versions and Temple pending (SQ-12 to SQ-16). |
| SQ-02 | How those devices reach Ceiba today: direct HL7 feed, a gateway/middleware product, VPN to the vendor environment? Any sample messages or interface specs Intercept can share (synthetic or de-identified) | Lisa-Mae, Eric | Nov 6 | Interface fidelity (§7) |
| SQ-03 | Which parameters clinicians look at on each device, and which alarms matter (to avoid showing noise) | Israel, Lisa-Mae | Nov 2 | Parameter sets, alarm limits |
| SQ-04 | For each of the six scenarios: patient profile, starting state, what happens minute by minute, which interventions the clinician performs, and the expected response | Israel, Lisa-Mae | Oct 28–30 | Scenario scripts |
| SQ-05 | Typical lab turnaround times to model (lactate, cultures, ABG) | Lisa-Mae | Nov 2 | Lab cadence |
| SQ-06 | Infusions to show and their usual dose units and titration steps (norepinephrine, vasopressin, propofol, insulin…) | Israel | Nov 2 | Pump profiles |
| SQ-07 | Documents chat must reach for the headline example: what an echo report and a hepatology note look like (templates, no PHI) | Israel / Diego | Oct 30 | EHR corpus |
| SQ-08 | Demo format: real time vs compressed; who presents; whether Intercept wants to run demos without Archie present | Diego | Oct 30 | Operator console, runbook |
| SQ-09 | Camera footage: does Intercept have consented or staged ICU room video we may use, or should Archie source licensed/synthetic footage? | Diego / Becky | Nov 2 | Camera |
| SQ-10 | Messaging: typical bedside message types and volume per patient-shift (the spec cites 30+) for a realistic inbox | Lisa-Mae | Nov 6 | Inbox script |
| SQ-11 | Clinical reviewer slots: Oct 30 and Nov 10 (45 min each) | Israel / Lisa-Mae | Book now | Credibility |
| ▲ v0.2 · SQ-12 | Which ventilator is the main ICU unit: Evita V800 or Hamilton C1? | Lisa-Mae / Israel | Oct 30 | Primary ventilator profile |
| ▲ v0.2 · SQ-13 | Which CARESCAPE bedside monitor hosts the CARESCAPE ONE (B450 / B650 / B850)? Is the ONE used at the bedside or only for transport? | Lisa-Mae / Eric | Oct 30 | Monitor parameter set, monitor panel |
| ▲ v0.2 · SQ-14 | Software versions for each device in use | Eric | Nov 6 | Profile accuracy |
| ▲ v0.2 · SQ-15 | Pump platform: Infusomat Space on DoseTrac, or Space plus with OnlineSuite plus? Are AutoProgramming / AutoDocumentation active with their EMR? | Eric / Lisa-Mae | Nov 6 | Pump message content, order-to-pump story |
| ▲ v0.2 · SQ-16 | Does Temple use the same devices? | Diego | Nov 6 | Profile coverage |

**Internal decisions (Archie):**

| # | Decision | Owner | Needed by | Status |
|---|---|---|---|---|
| SD-01 | Interface layer confirmed: PCD-01 / ORU / ADT / FHIR R4 (A-06) | Jorge + Carlos | Oct 28 | **▲ v0.2:** Supported by the device specs (§7); Jorge to confirm |
| SD-02 | Streaming pattern in Archie | Jorge | Oct 28 | Open |
| SD-03 | LLM and voice provider on AWS | Carlos + Jorge | Oct 30 | Open |
| SD-04 | Coupled vs fully scripted physiology | Carlos + Israel | Oct 30 | Open |
| ▲ v0.2 · SD-05 | Vendor scope: one profile per class for Nov 13; Hamilton C1 optional by Dec 18; MR1 out (§3a) | Carlos | Oct 28 | **▲ v0.3: Decided Oct 27 (DEC-09)** |
| ▲ v0.3 · SD-06 | Device-agnostic foundation: profile schema, canonical metric catalog, class generators and panel templates (§3b) | Carlos + Jorge | Oct 30 | **Decided Oct 27 (DEC-10)**; Jorge to review the schema |
| ▲ v0.3 · SD-07 | Profile file format (JSON vs YAML) and validation tool | Carlos | Oct 28 | Open |
