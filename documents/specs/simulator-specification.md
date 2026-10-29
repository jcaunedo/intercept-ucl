<!--
SNAPSHOT — read-only copy published from Cowork (DEC-20).
Document: Intercept Live · Real-Time Data Simulator Specification (Google Doc) · v0.6, rev. 6
Snapshot date: 2026-10-29 · Snapshot set: v1 · Published by: CX-04
Source of truth: Cowork project "Intercept Telehealth - Series B". Do not edit here;
propose changes in a PR comment or an RCP, and Carlos updates the source and re-publishes.
Sanitized for the repo: no Archie prompts, no client-confidential interface material.
-->

**A R C H I E L A B S**  
**INTERCEPT TELEHEALTH**  
**Intercept Live · Real-Time Data Simulator**  
*Technical Specification · Seed Specification (rev. 6\) · v0.6*  
October 28, 2026 · Owner: Carlos Jimenez, Overseeing DPM and simulator engineering lead  
**PROPRIETARY AND CONFIDENTIAL. INTERNAL ARCHIE LABS TOOLING, EXCLUDED FROM THE CLIENT HANDOFF.**

| SOURCED · Revision 6: clinical inputs from Lisa-Mae (Oct 29\) Lisa-Mae (CNO) sent the alarm threshold table, answers to our follow-up, and a dashboard guide for six diagnoses. All values are illustrative and are validated in the script review (Nov 3–4). SOURCED (UPD-09): ten alarms with illustrative triggers (SpO₂ sustained below target, e.g. \< 90%; MAP \< 65; HR \> 130 or \< 40; RR \> 30; apnea ≥ 10 s; ventilator disconnect or high pressure; urine output \< 0.5 mL/kg/hr; VT/VF). The guide uses one four-panel view per diagnosis: vital signs, ventilator or BiPAP, actionable alarms, infusions. PROPOSED · SD-14 (UPD-10): BiPAP at rural sites is a separate unit with no known integration, so its settings are emitted as charted values (respiratory therapist), labeled as charted. High-flow nasal cannula is added as an oxygen mode. PROPOSED · SD-15 (UPD-10): the remote team is never the first responder to bedside alarms. Device alarms carry bedside acknowledgment events; the remote view receives them as visual status, and remote action starts from trend and platform alerts. PROPOSED · Protocol profiles (UPD-10): Intercept follows each client hospital's protocols, so thresholds, bundle steps and check frequencies live in a per-hospital protocol profile. The demo ships one reference protocol. PROPOSED · Scripted charted events (UPD-09): stroke neuro checks and BP every 15 min for 2 h, every 30 min for 6 h, then hourly to 24 h; SIRS 0–4; bundle element statuses complete, pending, overdue, not applicable, review. OPEN: BiPAP device names (OI-27); SIRS temperature threshold, 38 °C vs 38.3 °C (OI-28); whether a reference protocol is acceptable for the demo (OI-29). *Version: v0.5 → v0.6 (rev. 6\) · Owner: Carlos Jimenez · Date: October 29, 2026 · Source: Lisa-Mae Williams, emails of Oct 29* |
| :---- |

| NOTE · Revision 5: client documents, clinical inputs and interface direction (Oct 28\) This revision records what Intercept sent on Oct 27–28 and two decisions by Carlos. Decided items are binding. Proposed items wait on the scenario consolidation call with Diego and move into the body sections once agreed. Each item cites its Change Log ID (UPD-\#\#) in the Cowork project. DECIDED · DEC-18 (UPD-01): the System Specification, the first prototype and the latest transcripts are the source of truth. Client documents answer questions and test assumptions. DECIDED · SD-01b, DEC-19 (UPD-03): devices emit IHE PCD-01 from the canonical model. A reserved adapter slot holds proprietary connectors such as the Ceiba bedside box (custom protocol, undocumented), built only if a customer requires it. Supersedes the open part of SD-01 (see §7). PROPOSED · SD-13 (UPD-02, UPD-03): one EHR profile per brand (Epic, Cerner, Meditech, TruBridge) on the device-profile pattern. HL7 v2 set from the client interface documentation: ADT A01/A02/A03/A08/A12, ORM^O01 orders and consults (v2.4), RAS^O17 medication administration (v2.7), ORU^R01 labs, MDM notes, hourly flowsheet batches. The chart API stays FHIR-shaped. PROPOSED · Cohort (UPD-04): Diego's Western Nebraska network, 5 sites and 12 patients, with payer, rurality, language and social-needs fields that feed reporting only. Supersedes P-DEC-14. PROPOSED · Scenario demand (UPD-04): three acts first (S1, S3, S5; the S6 dashboard as Mock), then S2, S4 and the live parts of S6 by Dec 18\. §4a is rebuilt once the cut is agreed. PROPOSED · Engine additions (UPD-04, UPD-07): intake-output stream (hourly urine output, net balance, daily weight); artifact injection with a signal-quality flag; alarm onset, duration, acknowledgment and de-duplication; mode-aware respiratory output (invasive, BiPAP with leak, conventional oxygen); multi-day jump; per-site bandwidth drop; still-image events; run-event export. PROPOSED · Catalogs (UPD-02, UPD-07): the ICU drug list and Epic dose-unit strings from the client test workbooks; Lisa-Mae's heart-failure watch list and common overnight drips; order lifecycle events (new, modify, discontinue, PRN to scheduled, past due, not given); a client ICU's bed numbering as the pattern for synthetic units. OPEN (UPD-07): alarm thresholds (the table is missing from Lisa-Mae's email), which alarms go to the bedside vs the intensivist, the BiPAP device at rural sites, and the breakdown for sepsis, ventilated COPD, stroke, COPD on BiPAP and DKA. Requested Oct 28, due Nov 2 (OI-21 to OI-24). NOTE · The client interface documentation (kept in Cowork) are confidential. Only message shapes and general clinical content are used here. Nothing is copied. *Version: v0.4 → v0.5 (rev. 5\) · Owner: Carlos Jimenez · Date: October 28, 2026 · Sources: client interface documentation (kept in Cowork), Lisa-Mae (Oct 28), Diego's use cases* |
| :---- |

| NOTE · Revision 4: consolidated specification (Oct 28\) This revision moves the simulator specification into a shared document and gives it the structure of the Archie Labs system specifications: revision history, markers, a decision log with the reasoning behind each decision, an open items log, and functional definitions (epics and user stories). It carries every earlier revision forward. Section numbers 1 to 14 are retained from v0.3 so that references in the other project documents (for example "Simulator spec §3b") still resolve. *Version: v0.3 → v0.4 (rev. 4\) · Owner: Carlos Jimenez · Date: October 28, 2026* |
| :---- |

| RECONCILED · Revision 3: repo analysis and PRD reconciliation (Oct 27\) The shared design repo (*intercept-ucl*) and Julio's two PRDs were reconciled against this specification. Five changes reach the simulator: a proposed home for the simulator code outside the design-system repo, one canonical synthetic cohort, canonical hospital and location field names, default freshness intervals, and a mapping between device alarm priority and platform alert severity. Proposals are tagged PROPOSED until Gate G0 (Oct 29). *Version: v0.3 → v0.3 \+ reconciliation notes · Date: October 27, 2026* |
| :---- |

| DECIDED · Revision 2: vendor scope and device-agnostic foundation (Oct 27\) Vendor scope was decided (one device profile per class for Nov 13), the device-agnostic foundation was defined, and Albert's direction was recorded: the simulator feeds a prototype backend built in Archie. *Version: v0.2 → v0.3 · Date: October 27, 2026* |
| :---- |

| DEVICE SPEC · Revision 1: first device list (Oct 27\) Intercept sent the device models in use at Women's & Families. Each model was checked against the manufacturer's current published documents and FDA records (web sources, linked in §3a), which confirmed that every device reaches hospital systems through an HL7/IHE gateway. *Version: v0.1 → v0.2 · Date: October 27, 2026* |
| :---- |

# **Revision History**

This document is versioned in place. Each revision adds a marked layer instead of replacing the text, so the path from transcript-seeded assumption to decided definition stays readable. Superseded text is ~~struck through~~, not deleted. When the document is edited in Google Docs from now on, use Suggesting mode so each change stays attributable to its author.

| Rev | Version | Date | Source | Nature of change |
| :---- | :---- | :---- | :---- | :---- |
| **0** | v0.1 | Oct 26, 2026 | Internal kickoff (Oct 20), client kickoff (Oct 22), Design Phase Team Brief, System Specification | Baseline: what each source says, purpose and users, stream scope, interface layer, mocked vs real, architecture, build plan to Nov 13, open questions SQ-01 to SQ-11 and internal decisions SD-01 to SD-04. |
| **1** | v0.2 | Oct 27, 2026 | Device list from Intercept (Women's & Families); manufacturers' published specs | Device baseline added (§3a). Interface evidence: all devices reach hospital systems through a gateway that speaks HL7/IHE, which supports emulating gateway output. New questions SQ-12 to SQ-16. |
| **2** | v0.3 | Oct 27, 2026 | Carlos (DEC-09, DEC-10); Albert (DEC-11) | Vendor scope decided: one profile per class for Nov 13, Hamilton C1 optional by Dec 18, MR1 out. Device-agnostic foundation (§3b): profile schema, canonical model, contracts between components, add-a-device checklist, quality gates. Simulator feeds the prototype backend in Archie. |
| **3** | v0.3 \+ notes | Oct 27, 2026 | CX-01 repo analysis; PRD reconciliation (monitoring, patient card) | Proposed simulator home outside the design-system repo (P-DEC-12); canonical cohort (P-DEC-14); severity mapping (P-DEC-17). Canonical hospital and location fields adopted (SD-08); freshness defaults (SD-09); alarm limits from profiles (SD-12). |
| **4** | v0.4 | Oct 28, 2026 | Consolidation into this document | Specification structure added: how to use, introduction, scenario demand (§4a), functional definitions (§15), decision log (Appendix A), open items log (Appendix B), glossary (Appendix C). §9, §11, §12 and §13 updated for revision 3 and for the Archie project not yet existing. |
| **5** | v0.5 | Oct 28, 2026 | client interface documentation (kept in Cowork); Lisa-Mae (Oct 28); Carlos (DEC-18, DEC-19) | Interface direction decided (SD-01b); EHR profiles proposed (SD-13); Nebraska cohort, three-act scenario demand, engine additions and catalogs proposed; OI-21 to OI-26 added; OI-01 to OI-03, OI-06, OI-15, OI-16, OI-18, OI-20 updated. Inputs: Change Log UPD-01 to UPD-08 |
| **6** | v0.6 | Oct 29, 2026 | Lisa-Mae (Oct 29): alarm thresholds, answers, dashboard guide | Revision 6 box added; SD-14 (BiPAP as charted) and SD-15 (bedside acknowledgment, remote status) proposed; OI-16 and OI-21 to OI-24 answered; OI-27 to OI-29 added. Inputs: Change Log UPD-09, UPD-10 |

## **Reading the markers**

| Marker | Meaning |
| :---- | :---- |
| **SOURCED** | Stated in a source: transcripts (IK, CT), the Team Brief (BR) or the System Specification (SP). Agreed context, subject to confirmation. |
| **DEVICE SPEC** | From the manufacturer's current published documents or FDA records, found on the web. Accurate for the device; whether Intercept's hospitals use it that way is a separate question. |
| **DECIDED** | A recorded decision. Its reasoning and the alternatives considered are in Appendix A. |
| **PROPOSED** | A recommendation waiting for its owner or for Gate G0. Not yet binding. |
| **RECONCILED** | Brought in from the repo analysis or the PRD reconciliation of Oct 27\. |
| **OPEN** | Unresolved. Tracked in the Open Items Log (Appendix B). |
| **SCOPE CUT** | Removed by decision or by the client. Struck text is kept for audit. |
| **ACTION** | A change needed outside this document (Archie, the repo, or a client input). |

# **How to Use This Specification**

This is the working specification for the real-time data simulator behind the Intercept Live prototype. Engineers build from it, the clinical reviewers validate physiology against it, and the Requirements Specification cites it for SIM-01 to SIM-10. It is not a client deliverable: the Team Brief keeps the simulator with Archie and out of the handoff package.

> * **Decisions** are recorded once, in Appendix A, with the reason and the alternatives considered. Sections that rely on a decision cite its ID instead of repeating it.  
> * **Open items** are consolidated in Appendix B. Client questions keep their SQ IDs (§14) and internal decisions their SD IDs, because other project documents reference them.  
> * **Changes** are marked inline with a marker and the revision that introduced them. The Revision History is the full list.  
> * **Related documents** (Cowork project): Requirements Specification v0.7, Definition Workbook v0.9, RAID Register v1.9, Operating Model v1.6, Traceability Matrix v0.6, Change Log v1.4, Design Update Spec v1.0, backend blueprint. A sanitized snapshot of this specification is published read-only to the design repo (documents/specs/, DEC-20), PRD and Client Notes Reconciliation v1.0.

# **Introduction**

Intercept Live has to look and behave like the real product in front of grant reviewers, investors and hospitals, without connecting to any hospital. The simulator makes that possible. It streams synthetic data the way bedside monitors, ventilators, infusion pumps, labs, ADT and an EHR would, so the prototype's surveillance, alerting and Virtual Sepsis logic run on live-looking input instead of static numbers.  
Two choices shape everything below. First, the simulator emits the same message standards that hospital device gateways send to enterprise systems (IHE PCD-01, HL7 v2, FHIR R4), so the ingestion layer built for the prototype is the one real feeds would use later (SD-01, DEC-11). Second, every vendor-specific detail lives in a versioned device profile, so adding a device later means writing data, not code (DEC-10).

| SOURCED · What the sources ask of the simulator "Create the speeds and feeds" of the devices, and a simulator "we can turn on and off" (client kickoff, Oct 22). Imitate how the devices talk to Ceiba, so a real device connects later and "we don't have to do the work twice" (Oct 22). One device of each type, the most modern, from Women & Families and Temple; dialysis dropped (Oct 22). Runs only during demos; internal tooling excluded from the handoff (Team Brief). |
| :---- |

# **1\. What Every Source Says About the Simulator**

| Source | What it says |
| :---- | :---- |
| IK (Oct 20\) | "We're not going to integrate with those hospitals right now. That's part of what the simulator needs to do." The simulator covers vital signs and the EHR chart connection. Albert: start with the simulator, then "an inventory of all the devices… simulate the protocol of what those things do." |
| BR | Streams synthetic data the way live sources would: in-room devices (bedside monitors, ventilators, infusion pumps), lab and ADT feeds, and hospital EHRs. Drives surveillance, alerting and Virtual Sepsis with realistic trends over time. Runs only during demos. Internal tooling; stays with Archie. |
| CT (Oct 22\) | "The speeds and feeds" of the devices; a simulator "we can turn on and off". Camera \= prerecorded video. Imitate how the devices talk to Ceiba. One device of each type, the most modern. Ventilator, bedside monitor and pumps; dialysis dropped. EHR side: simulated Epic back end for the chart, notes, orders, with AI around it. Diego: lab, vitals and pharmacy data come through EMR interfaces. |
| SP | No simulator section. Target interfaces: SP 6.6 (HL7 v2 ORU/ADT/OMG, FHIR Observation, vendor feeds) and 7.8 to 7.12 (monitor, ventilator and pump families; lab, pharmacy, ADT). |
| PR (v0 Netlify prototype) | No simulator. All numbers are static; waveforms and video are looped visuals. |
| **DEVICE SPEC** Device list (Oct 27\) | Women's & Families: Dräger Evita V800, Hamilton C1 and Hamilton MR1 ventilators; B. Braun Infusomat pumps; GE CARESCAPE ONE monitor. Temple not yet covered (§3a). |
| **DECIDED** Albert (Oct 27\) | "In addition to the simulator, we want to create a backend for the prototype in Archie. The Simulator should feed it." Recorded as DEC-11. |

# **2\. Purpose and Users**

**Purpose.** Make the prototype behave like the real product: data arrives, changes and triggers the modules the way hospital feeds would, on synthetic data and through interfaces shaped like the production ones.

| User | What they do with it | Sees the simulator? |
| :---- | :---- | :---- |
| Demo Operator (Archie; possibly Intercept presenters, OI-04) | Starts, pauses, speeds up, jumps to checkpoints, injects events and resets scenarios | Yes, through the operator console |
| Archie engineers | Build and test the platform side against deterministic streams and golden messages | Yes, through logs, test harness and console |
| Clinical reviewer (Israel, Lisa-Mae) | Validates physiology, ranges, defaults and alarm wording per profile and scenario | No direct UI; reviews outputs and profile sheets |
| Audiences (grant panel, investors, hospitals) | Never see the simulator; they see its effects in the prototype | No |

# **3\. Scope**

| Stream | Content | Priority |
| :---- | :---- | :---- |
| Bedside monitor | HR, rhythm label, SpO2, NIBP sys/dia/mean, ABP sys/dia/mean, RR, Temp, optional EtCO2 and CVP; device alarms | Must |
| Mechanical ventilator | Mode; set RR, Vt, PEEP, FiO2, PS, Ti; measured total RR, Vte, MVe, Ppeak, Pplat, Pmean, I:E; alarms | Must |
| Infusion pumps (per channel) | Drug, concentration, rate (mL/h), dose (for example mcg/kg/min), titration events, volume remaining; occlusion and near-end alarms | Must |
| Labs | CBC, BMP/CMP, lactate, ABG/VBG, coags, cultures (pending, then resulted), troponin, ammonia, per scenario | Must |
| ADT | Admit, transfer, discharge and update events that drive the census | Must |
| EHR (simulated) | Chart (problems, allergies, history, home meds), notes and documents including longitudinal echo and specialist notes, orders, MAR; accepts write-back of signed notes and orders | Must |
| Camera | Prerecorded clips per bed and scene; presets switch clips; scribe transcript per scenario | Must |
| Hospital messaging | Scripted inbound messages from bedside roles per channel; accepts replies | Should |
| Consult | Scripted specialist join and recommendation | Should |
| **SCOPE CUT** | ~~Dialysis machine stream~~. Dropped by Intercept on Oct 22\. A new device class can be added later through the §3b checklist. | Out |

## **3a. Device Baseline and Vendor Scope**

| DEVICE SPEC · Source and confidence Device list from Intercept, Oct 27 (Women's & Families). Specs come from the manufacturers' current published documents and FDA records, linked below, not from Intercept. Parameter sets are confirmed for the device and assumed for what Intercept's clinicians use (SQ-03). |
| :---- |

| Device | Class | Key parameters (published) | How it reaches hospital systems (published) | Prototype role |
| :---- | :---- | :---- | :---- | :---- |
| **GE CARESCAPE ONE** | Monitor | ECG (3, 5, 6 or 10-lead) with ST and arrhythmia; SpO2; built-in NIBP; invasive pressure (dual-channel module); dual temperature; CO2; impedance respiration. Docks to a CARESCAPE B450, B650 or B850 host, which then owns display and alarms. | CARESCAPE Gateway: outbound HL7 2.3/2.4 and IHE PCD-01 (HL7 2.6, IEEE 11073); inbound ADT; Vitals on Demand; high-speed waveform feed | **Nov 13: monitor profile** |
| **Dräger Evita V800** | Ventilator (ICU) | Modes VC-CMV/SIMV/AC/MMV, PC-CMV/SIMV+/AC/APRV/PSV, SPN-CPAP/PS/VS/PPS. Set RR, Ti, VT, flow, Pinsp, PEEP, Psupp, FiO2, trigger. Measured Pplat, PEEP, PIP, Pmean, MVe, VT, RR, FiO2, etCO2, Cdyn, R, RSBI, NIF, P0.1. Alarms MV, Paw, FiO2, etCO2, RR, VT, apnea, disconnection. | Device: RS-232 with MEDIBUS / MEDIBUS.X, LAN, USB. Standards-based output (ISO/IEEE 11073 SDC) through the Connectivity Converter CC300; EMR documentation through CC300 and the Infinity Gateway Suite. | **Nov 13: ventilator profile** (main-ICU assumption pending SQ-12) |
| **Hamilton C1** | Ventilator (compact ICU / transport) | Modes APVcmv, APVsimv, PCV+, PSIMV+, SPONT, ASV; DuoPAP, APRV, NIV as options. Measured Ppeak, Pplateau, ΔP, AutoPEEP, PEEP, VTE/VTI, MinVol, fTotal, Cstat, RCexp, RSB, P0.1; optional CO2 and SpO2. Alarms in high, medium and low priority. | Optional communication board; Hamilton's proprietary Block Protocol for third-party systems; monitoring and EHR connections through third parties. | **Second ventilator profile by Dec 18, only if a scenario uses it** |
| ~~Hamilton MR1~~ | Ventilator (MR-conditional, 1.5T / 3T) | Same mode family as the C1 | Only USB listed as standard | **SCOPE CUT** MRI use, not ICU beds (DEC-09) |
| **B. Braun Infusomat (Space)** | Large-volume pump | Per channel: drug, concentration, rate, dose, volume infused and remaining, status, alarms | IHE-based EMR integration through DoseTrac (Epic-validated AutoProgramming and AutoDocumentation). Newer platform: Space plus with DoseLink plus on OnlineSuite plus (two-way HL7/IHE, including alarm data). Which one the hospital runs is SQ-15. | **Nov 13: pump profile** |

| DECIDED · Vendor scope (DEC-09, Oct 27\) Build one device profile per class for Nov 13: monitor, ventilator, pump. Diego on Oct 22: "I'm going to send you one of each." Design for several vendors, build one per class. With the §3b foundation a second ventilator is one profile plus a clinical review. Hamilton C1 by Dec 18 only if a scenario tells the "two vendors, one view" story. Hamilton MR1 is excluded. Reasoning and alternatives: Appendix A. |
| :---- |

**Sources (manufacturer and FDA, retrieved Oct 27):**

> * [GE CARESCAPE ONE, FDA K200494](https://fda.innolitics.com/device/K200494)  
> * [GE CARESCAPE ONE brochure](https://www.gehealthcare.com/-/jssmedia/2a0ac5f01e4d4606837945a598a24dbd.pdf)  
> * [GE CARESCAPE Gateway](https://www.gehealthcare.com/en-gb/products/patient-monitoring/networking/carescape-gateway)  
> * [Dräger Evita V800 datasheet](https://www.draeger.com/Content/Documents/Products/evita-v800-ds-dmc-111230-en-2606-1.pdf)  
> * [Dräger Evita V800 product information](https://www.draeger.com/Content/Documents/Products/Evita-V800-pi-100887-en-master.pdf)  
> * [Hamilton C1 tech specs, SW 3.0.x](https://hamilton-medical.com/dam/jcr:661ed50a-2f60-41cc-adc3-97eeb5553c87/HAMILTON-C1_tech-specs_v3.0.x_en_usa_10103181.02.pdf)  
> * [Hamilton C1 brochure, SW 3.1.x](https://www.hamilton-medical.com/dam/jcr:d06509e6-5b87-455c-b719-8d7c23033792/HAMILTON-C1_brochure-v3.1.x_brochure_en_ELO20250405S.00.2026-05-05-08-50-04.pdf)  
> * [Hamilton Digital Solutions](https://www.hamilton-medical.com/Products/Digital-Solutions.html)  
> * [Hamilton MR1 tech specs, SW 3.1.x](https://www.hamilton-medical.com/dam/jcr:ac363cdd-ef68-40eb-b035-d744ebd73e24/HAMILTON-MR1_tech-specs_v3.1.x_en_usa_10103183.04.2026-05-05-08-50-14.pdf)  
> * [B. Braun interoperability](https://www.bbraun.com/en/products-and-solutions/therapies/infusion-therapy/automated-infusion-systems/interoperability-in-health-care.html)  
> * [B. Braun Infusomat Space and Epic integration (2016)](https://www.biospace.com/b-braun-medical-s-infusomat-space-pump-completes-new-emr-system-integration)

## **3b. Device-Agnostic Foundation (DEC-10)**

**Goal:** adding a device later means writing a profile (data), not code. Everything vendor-specific lives in a profile; everything else is vendor-neutral.

### **Principles**

> 1. **Vendor-neutral core.** The scenario engine, generators, ingestion adapters, platform logic (alert rules, Sepsis Sniffer and Tracker, vent-order mismatch) and UI panel templates never read a vendor field.  
> 2. **Canonical metrics everywhere.** Each value has a canonical metric ID mapped to its IEEE 11073-10101 nomenclature code (the codes PCD-01 carries). Units are UCUM; labs use LOINC. Vendor labels exist only for display.  
> 3. **Profiles are versioned data.** A device profile is a validated file with its own semantic version and source references. Changing a profile never requires a code change.  
> 4. **Scenarios are written against device classes, not models.** A scenario says "ventilator: PEEP rises to 12"; the bed's profile decides how that appears.  
> 5. **One generator and one panel template per device class.** A new model in an existing class is a profile only. A new class (for example dialysis, a wearable patch) adds one class definition, one generator and one panel template, once.  
> 6. **The same mapping serves production later.** Real gateway feeds (CARESCAPE Gateway, Dräger CC300 / Infinity, B. Braun DoseTrac) normalize into the same canonical model and meet the simulator at the same ingestion adapters.

### **Canonical device model**

| Element | What it is | Example |
| :---- | :---- | :---- |
| Device class | The kind of device: monitor, ventilator, infusion\_pump; extensible | ventilator |
| Device profile | One manufacturer \+ model \+ software version | draeger.evita-v800@1.0.0 |
| Device instance | A profile bound to a bed in a hospital (tenant-tagged) | Bed MICU-4 → draeger.evita-v800@1.0.0 |
| Channel | Sub-unit where a device has several (pump channels, pressure channels) | Pump channel B (norepinephrine) |
| Metric | Canonical value with kind setting, measured or calculated | vent.peep.set, vent.peep.measured |
| Mode | Canonical mode family plus the vendor's display name | pressure\_control\_ac → Dräger "PC-AC" / Hamilton "PCV+" |
| Alarm | Canonical alarm ID, vendor text, priority on a common 3-level scale (high, medium, low) | vent.mv.low → Dräger "MV low" |
| Waveform | Canonical waveform type, rendered client-side (§7) | vent.paw, vent.flow, ecg.ii |

| PROPOSED · Alarm priority vs platform alert severity (P-DEC-17, revision 3\) The 3-level alarm priority is a device attribute: the simulator emits it the way a monitor or ventilator reports it. The platform assigns its own alert severity downstream, through rules and agents: Critical (spec tier T1, interrupt), High and Medium (T2), Low (T3, informational, not counted as open). The simulator never assigns platform severity. Owner: Carlos and Julio at G0; Israel validates. |
| :---- |

### **Device profile schema (v1)**

| Field | Content |
| :---- | :---- |
| profile\_id, version | For example ge.carescape-one, 1.0.0 (semantic versioning) |
| manufacturer, model, software\_version | From the official spec; software\_version is "unknown" until SQ-14 is answered |
| device\_class | monitor, ventilator, infusion\_pump, … |
| sources | Links to the manufacturer documents used (§3a) |
| metrics\[\] | canonical\_id, vendor\_label, kind, mdc\_code (IEEE 11073), ucum\_unit, range, resolution, sample\_interval, display\_order |
| modes\[\] | canonical\_family, vendor\_name, the settings each mode exposes |
| alarms\[\] | canonical\_id, vendor\_text, priority (high/medium/low), default limits, condition on canonical metrics |
| waveforms\[\] | Canonical waveform types the device shows |
| channels | Count and type (for example pump channels) |
| message\_mapping | How metrics map into PCD-01 OBX segments (observation hierarchy, units); default rules per class, overrides per profile |
| display\_hints | Optional: primary metrics on the panel, grouping |
| clinical\_review | Reviewer, date, notes (Israel or Lisa-Mae) |

| DECIDED · Profiles hold the default alarm limits (SD-12, revision 3\) Default alarm limits live in the device profile, are clinically reviewed (R-18), and can be overridden per hospital (Client Administration, CA-03). The design system never hard-codes them (PRD PC-044). The example limits in the Monitoring exploration (HR 50 to 120, SpO2 90 to 100, systolic 90 to 160, RR 8 to 30\) are placeholders until the profiles are reviewed. |
| :---- |

### **Contracts between components**

| Component | Consumes | Produces | Never touches |
| :---- | :---- | :---- | :---- |
| Scenario engine | Scenario script (class-level metrics and events) | Canonical trajectories per bed | Profiles, vendor names |
| Class generator | Trajectory \+ the bed's profile (ranges, resolution, sample interval, alarm conditions) | Canonical observations and alarms | Message formats |
| Message adapter | Canonical observations \+ profile message\_mapping | PCD-01, ORU and ADT messages | Scenario logic |
| Ingestion adapter (platform) | PCD-01, ORU, ADT (simulated now, real gateways later) | Canonical events into the Archie backend | Vendor protocols |
| Platform logic | Canonical metrics and alarms | Alerts, sepsis states, mismatch flags | Vendor fields |
| UI panel template (per class) | Canonical data \+ profile display fields (labels, units, mode names, alarm text) | Vendor-faithful panel | Device-specific code |

### **Adding a device later: checklist**

**Same class (for example a second ventilator): profile only.**

> 1. Collect the manufacturer's current tech spec from the web, not from memory, and record it in sources.  
> 2. Write the profile: metrics, modes, alarms, ranges, units.  
> 3. Map metrics to IEEE 11073 codes and UCUM units. Reuse existing canonical IDs; add new ones only for values with no canonical equivalent.  
> 4. Clinical review (Israel or Lisa-Mae) of ranges, defaults and alarm wording.  
> 5. Pass schema validation and the golden-message test: a fixed scenario must produce the expected PCD-01 output.  
> 6. Bind the profile to a bed in the cohort seed. Nothing else changes.

**New class (for example dialysis, a wearable patch):** the same steps, plus one class definition (its canonical metrics), one generic generator and one panel template (Julio). This is a one-time cost per class.

### **Quality gates**

> * Every profile passes schema validation before the engine loads it.  
> * Golden-message tests per class: the same scenario through two profiles of one class produces messages that differ only in vendor display fields and device identifiers.  
> * A profile change bumps the profile version and is recorded in the Revision History.

# **4\. Inputs**

> * **Scenario definitions:** a timeline per patient with baseline physiology, trajectories (for example MAP falls from 72 to 58 over 40 minutes), discrete events (lab resulted, order administered, ADT), scripted messages, and camera clip and transcript. Written against device classes and canonical metrics, never vendor fields (§3b).  
> * **Cohort seed:** hospitals, units, beds, devices, patients, history and documents, including the bed-to-profile binding (§9).  
> * **Device profiles:** versioned profiles per the §3b schema. Version 1 covers CARESCAPE ONE, Evita V800 and Infusomat.  
> * **Operator commands:** start, pause, resume; speed (1×, 5×, 30×, 60×); jump to checkpoint; inject event; reset.  
> * **Platform write-backs:** signed orders and notes, which can change a trajectory (for example a pressor titration raises MAP).

## **4a. Scenario Demand on the Simulator**

| PROPOSED · Inferred from the six candidate scenarios; final after the Oct 30 scenario lock Each candidate scenario (Definition Workbook §2a) needs a different mix of streams. ● required, ○ supporting, blank \= not needed. The pattern sets the build order: the monitor, the EHR and labs carry most scenarios, so they come first; consult and family messaging only matter if those scenarios are chosen. |
| :---- |

| Candidate scenario | Monitor | Vent | Pump | Labs | ADT | EHR | Camera | Messaging | Consult |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| 1 · Multi-hospital command center | ● | ● | ● | ○ | ● | ○ |  | ○ |  |
| 2 · Talking to the chart by voice | ○ |  |  | ○ |  | ● |  |  |  |
| 3 · Virtual Sepsis with the bedside team | ● | ○ | ● | ● |  | ● |  | ● |  |
| 4 · Specialist second opinion ("softly") | ○ |  |  | ○ |  | ● | ● |  | ● |
| 5 · Family communication | ○ |  |  |  |  | ○ | ○ | ● |  |
| 6 · Camera visit with AI documentation | ● | ○ | ○ |  |  | ● | ● |  |  |

# **5\. Outputs**

> * **Standards-shaped messages** (§7) onto the platform's ingestion layer.  
> * **Canonical events** to the Archie backend: observation, alarm, lab, ADT, document, message. Every event carries its tenant (hospital), its source class and its scenario time.  
> * **Simulated EHR API** responses: chart reads, write-back acknowledgements.  
> * **Camera stream reference:** clip URL plus overlay data.  
> * **Operator console state:** scenario clock, active checkpoints, injected-events log.

# **6\. Business Logic**

> 1. **Scenario engine.** Owns a scenario clock separate from wall time, with compression. Patients advance on their timelines; trajectories are interpolated with physiological noise; seeded randomness keeps replays deterministic.  
> 2. **Coupled physiology (light).** Defined responses for a small set of interventions per scenario: fluid bolus raises MAP for a short time; a norepinephrine rate change moves MAP after a lag; an FiO2 change moves SpO2; antibiotics given completes a bundle element. Scripted, not a physiology model (SD-04, open).  
> 3. **Device alarms.** Fire when values cross the device alarm limits in the bed's profile, the way a real monitor does, with the profile's wording and priority. Clinical alerting runs downstream on the platform, so the platform logic is real (SD-11).  
> 4. **Lab cadence.** Results appear at scenario times, or after an order is signed plus a turnaround delay (for example lactate 20 minutes scenario-time; SQ-05).  
> 5. **EHR behavior.** Signed notes and orders are written and acknowledged, appear in chart reads, and can trigger scenario branches.  
> 6. **Checkpoints.** Named states, for example "t0 \+ 2h40m, repeat lactate due in 5 min". Any checkpoint restores in under 30 seconds so a demo can start mid-story.  
> 7. **On/off.** The simulator runs only while a demo session is active (BR). When it stops, the prototype shows the last data marked stale, which also demonstrates degraded-state handling.  
> 8. **Isolation.** Each hospital's streams are tagged with that tenant; there are no cross-tenant streams (DEC-05).  
> 9. **Freshness.** A value is stale after three times its expected interval, taken from the metric's sample\_interval in the profile (SD-09). Missing values are sent as absent with a reason where known, never as zero.  
> 10. **Source labels.** Each canonical event carries a source class (bedside monitor, ventilator, pump, EHR feed, lab interface). The prototype shows these generic labels on clinical screens; named platforms appear only in System Administration (UX-05, CL-03).

| RECONCILED · Items 9 and 10 added in revision 3 Item 9 closes the PRDs' open question on freshness intervals (Patient card OD-06) for the prototype; Israel confirms the values at S2. Item 10 aligns the simulator's event model with the sanctioned provenance labels. |
| :---- |

# **7\. Interface Layer: What to Emulate**

| Feed | Emulate | Why |
| :---- | :---- | :---- |
| Monitor, ventilator, pump observations | **IHE PCD-01 (DEC): HL7 v2 ORU^R01 with IEEE 11073-10101 nomenclature**, as emitted by monitoring gateways | What device-integration middleware sends to enterprise systems. Real feeds arrive in this shape, so the ingestion layer is reusable. GE's CARESCAPE Gateway emits exactly this. |
| Device alarms | IHE PCD-04 (ACM) shape | Same reasoning |
| Labs | HL7 v2 ORU^R01 with LOINC codes | Standard lab interface (SP 7.11) |
| ADT | HL7 v2 ADT^A01, A02, A03, A08 | SP 7.12; location fields per SD-08 |
| EHR chart, documents, orders | FHIR R4: Patient, Encounter, Condition, AllergyIntolerance, Observation, DiagnosticReport, DocumentReference, MedicationRequest, MedicationAdministration, ServiceRequest | SP 7.1 and 7.2; FHIR R4 preferred (SP 10.4) |
| Internal stream to the front end | Canonical JSON over WebSocket or SSE (Archie pattern, SD-02 / E-1) | Front-end simplicity; waveforms rendered client-side |

| DEVICE SPEC · Evidence from the device list (revision 1\) Every device in scope reaches hospital systems through a gateway or middleware that speaks HL7/IHE, not straight from the device: CARESCAPE Gateway emits HL7 2.3/2.4 and PCD-01; the Evita V800 speaks MEDIBUS at the device, with standards-based output through the CC300; the Hamilton C1 uses the proprietary Block Protocol, integrated by third parties; the Infusomat integrates over IHE through DoseTrac or OnlineSuite plus. This supports emulating gateway output, not device protocols (SD-01). Still open: what feeds Ceiba today (SQ-02). If Ceiba consumes a vendor protocol directly, a vendor-protocol adapter is added behind the same canonical model; the engine, profiles and platform stay as they are. |
| :---- |

| DECIDED · Interface direction (revision 5, Oct 28\) The client interface documentation (kept in Cowork) show two device paths into Ceiba: a vendor monitoring system or gateway over TCP, where a standards feed such as PCD-01 lands, and a Ceiba bedside box on a proprietary protocol with no documented format. SD-01b (DEC-19): devices emit IHE PCD-01 from the canonical model. A reserved adapter slot holds proprietary direct connectors and is built only if a customer requires it. EHR side (SD-13, proposed): HL7 v2 through one profile per EHR brand; the chart API stays FHIR-shaped. The aim is to leave point-to-point vendor integration behind, not to mirror it. |
| :---- |

| SCOPE CUT · Not emulated ~~Raw vendor serial and LAN protocols~~ (Philips Data Export, Dräger MEDIBUS, Hamilton Block Protocol and similar). ~~Pump order programming (IHE PCD-03)~~. ~~Streaming 125 to 500 Hz waveform samples~~. The simulator streams numerics plus rhythm and state at about 1 Hz; the front end synthesizes ECG, pleth, ABP and resp waveforms consistent with them (SD-10). |
| :---- |

# **8\. What Is Mocked vs What Is Real**

| Element | Real in the prototype | Mocked / simulated |
| :---- | :---- | :---- |
| Platform ingestion, alert rules, sepsis tracker, persistence | **Real**: the Archie backend, fed by the simulator (DEC-11) |  |
| LLM for chat with the chart and scribe drafting | **Real model** on synthetic data (D-08) | The scribe's transcript is scripted per scenario |
| Voice-to-text for chat | **Real** service (assumption) |  |
| Device feeds, labs, ADT |  | Simulator |
| EHR |  | Simulated EHR service (FHIR-shaped) |
| Hospital messaging |  | Scripted channel messages |
| Camera video |  | Prerecorded clips |
| Specialist participation |  | Scripted join and recommendation |
| Identity and SSO |  | Simulated sign-in |

# **9\. Data Required**

> * **Cohort:** 3 fictional hospitals with 4 to 6 scripted beds each. ~~Starts from the v0 cohort, with its 13 inconsistencies fixed.~~ **PROPOSED** Starts from the design repo's cohort (14 patients; Harbor Point General, Mercy West Hospital, CVMC), which has none of the v0 inconsistencies, extended per hospital with ehrVendor, timeZone and connectionStatus (P-DEC-14). One cohort serves the simulator, Archie and the designs.  
> * **Canonical hospital and location fields** **DECIDED** (SD-08): hospitalCode, hospitalName, ehrVendor, timeZone, connectionStatus; unitCode, unitName, room, bed (text). ADT PV1-3 mapping: PL.4 facility, PL.1 point of care, PL.2 room, PL.3 bed.  
> * **Per scenario patient:** baseline and trajectory scripts; lab schedule; meds and infusions; 10 or more historical documents (H\&P, prior discharge summaries, at least 3 echo reports, specialist notes, imaging reports, micro); camera clip; scribe transcript.  
> * **Device profiles:** CARESCAPE ONE, Evita V800 and Infusomat for Nov 13; Hamilton C1 optional (§3a), written to the §3b schema.  
> * **Canonical metric catalog:** canonical IDs with IEEE 11073 code and UCUM unit for every metric the three classes use.  
> * **Typical settings and alarm limits** per scenario patient on those profiles, reviewed by Israel or Lisa-Mae (D-10).  
> * **Synthetic catalogs:** orders, order sets, specialists with licenses and privileges.  
> * **Synthetic only.** No real patient data in any seed, stream, recording or screenshot (BR).

# **10\. External Dependencies**

| ID | Dependency | Owner | Status (rev. 4\) |
| :---- | :---- | :---- | :---- |
| D-02 | Device details: host monitor, main ventilator, software versions, pump platform, Temple devices (SQ-12 to SQ-16) | Diego → Lisa-Mae / Eric | Models received Oct 27; details requested |
| SQ-02 | Interface details: how devices reach Ceiba today | Lisa-Mae / Eric | Open |
| D-01 | Scenarios with walkthroughs | Diego / Israel / Lisa-Mae | Six candidates drafted; lock Oct 30 |
| D-10 | Clinical review of physiology and profiles | Israel / Lisa-Mae | Slots Oct 30 and Nov 10 to book |
| D-08 | Archie project, AWS environments, LLM and voice | Carlos / Jorge | **ACTION** No Archie project exists yet (Oct 28\) |
| D-11 | Camera footage (licensed or synthetic) | Archie | Open |
| E-1 | Archie streaming pattern | Jorge | Open |
| D-16 | Simulator code home and its feed into Archie (P-DEC-12) | Jorge | Proposed for Oct 30 |

# **11\. Still Undefined**

The open points from v0.3 are consolidated in the Open Items Log (Appendix B, OI-01 to OI-09) together with the items raised since, so they are tracked in one place.

# **12\. Proposed Architecture**

`Operator Console`  
      `|`  
      `v`  
`Scenario Engine (clock, compression, checkpoints, seeds)`  
      `|  class-level trajectories (canonical metrics)`  
      `v`  
`Class generators (monitor / vent / pump)  <-- Device Profile Registry (versioned profiles, §3b)`  
      `|                                          bed-to-profile binding (cohort seed)`  
      `|  canonical observations + alarms`  
      `v`  
`Message adapters (profile message_mapping -> PCD-01 / ORU / ADT)`  
      `|        Lab/ADT generator     EHR service (FHIR R4)     Message/camera scripts`  
      `v               |                 ^ write-back                |`  
`--- Ingestion adapters (parse -> canonical events, tenant-tagged) ---`  
      `|        (real gateway feeds plug in here later)`  
      `v`  
`Prototype backend in Archie (AWS)`  
  `alert rules, sepsis sniffer/tracker, vent mismatch, work items, persistence, LLM`  
      `|`  
      `v`  
`WebSocket/SSE -> React front end (class panel templates + profile display fields)`  
The simulator talks to the platform only through the ingestion adapters, at the point where real feeds would plug in later.

| PROPOSED · Where the simulator code lives (P-DEC-12, revision 3\) Not in the design-system repo (intercept-ucl). That repo is a React component package owned by Julio, with automatic publishing on version change; simulator code there would couple two owners and two release cycles. Options: inside the Archie backend, or a separate repository under the Archie Labs organization that runs on AWS and streams into the Archie backend. Jorge decides, based on the streaming pattern (E-1). The design repo only consumes the simulator's sample format. |
| :---- |

# **13\. Build Plan to Nov 13**

| Window | Deliverable |
| :---- | :---- |
| Sprint 0 · Oct 27 to 30 | Engine skeleton (clock, seeds, compression); canonical event model; profile schema, registry and canonical metric catalog; device profiles v1 for CARESCAPE ONE, Evita V800 and Infusomat with IEEE 11073 mapping; one stable bed streaming monitor numerics to the UI; FHIR-shaped EHR read for one patient |
| Sprint 1 · Nov 3 to 6 (Nov 2 is a Colombian holiday) | All three device classes from the v1 profiles; class generators and golden-message tests; labs and ADT; HL7-shaped messages and adapters (PCD-01 mirroring CARESCAPE Gateway output); checkpoints; operator console v1; scenario 1 scripted |
| Sprint 2 · Nov 9 to 13 | Remaining Nov 13 scenarios; write-back loop (orders change trajectories); stale and off behavior; demo hardening |
| QA · Nov 11 to 12 | Each scenario run three times with no divergence |

| ACTION · Sprint 0 without an Archie project (revision 4\) No Archie project exists yet (D-08), so the Sprint 0 items that need Archie (the UI stream for one bed, the EHR read inside the backend) cannot start. The items that do not need it proceed now and become the locked reference the first Archie prompts port: profile schema, canonical metric catalog, profiles v1, golden messages, the canonical cohort seed, and the engine skeleton in the simulator's own home once P-DEC-12 is decided. Owner: Carlos and Jorge. If the Archie project is not created by Oct 30, Sprint 1 starts compressed (R-03, R-14). |
| :---- |

# **14\. Simulator Open Questions and Client Inputs**

| \# | Question / input | From | Needed by | Status (rev. 4\) |
| :---- | :---- | :---- | :---- | :---- |
| SQ-01 | Device list: manufacturer, model and software version for one bedside monitor, one ventilator and one infusion pump | Diego | Oct 27 | Partly answered Oct 27 (models); versions and Temple pending (SQ-12 to SQ-16) |
| SQ-02 | How the devices reach Ceiba today (direct HL7 feed, gateway or middleware, VPN to the vendor); sample messages or interface specs (synthetic or de-identified) | Lisa-Mae, Eric | Nov 6 | Open |
| SQ-03 | Which parameters clinicians watch on each device, and which alarms matter | Israel, Lisa-Mae | Nov 2 | Open |
| SQ-04 | Per scenario: patient profile, starting state, minute-by-minute course, interventions and expected response | Israel, Lisa-Mae | Oct 28 to 30 | Requested (email drafted Oct 27\) |
| SQ-05 | Typical lab turnaround times (lactate, cultures, ABG) | Lisa-Mae | Nov 2 | Open |
| SQ-06 | Infusions to show, dose units and titration steps (norepinephrine, vasopressin, propofol, insulin) | Israel | Nov 2 | Open |
| SQ-07 | What an echo report and a hepatology note look like (templates, no PHI) | Israel / Diego | Oct 30 | Open |
| SQ-08 | Demo format: real time or compressed; who presents; whether Intercept runs demos without Archie | Diego | Oct 30 | Open |
| SQ-09 | Camera footage: consented or staged ICU video from Intercept, or Archie sources licensed or synthetic footage | Diego / Becky | Nov 2 | Open |
| SQ-10 | Typical bedside message types and volume per patient-shift | Lisa-Mae | Nov 6 | Open |
| SQ-11 | Clinical reviewer slots: Oct 30 and Nov 10, 45 minutes each | Israel / Lisa-Mae | Book now | Open |
| SQ-12 | Main ICU ventilator: Evita V800 or Hamilton C1 | Lisa-Mae / Israel | Oct 30 | Requested |
| SQ-13 | Which CARESCAPE bedside monitor hosts the CARESCAPE ONE (B450, B650, B850); bedside or transport use | Lisa-Mae / Eric | Oct 30 | Requested |
| SQ-14 | Software versions for each device in use | Eric | Nov 6 | Requested |
| SQ-15 | Pump platform: Infusomat Space on DoseTrac, or Space plus on OnlineSuite plus; AutoProgramming and AutoDocumentation active? | Eric / Lisa-Mae | Nov 6 | Requested |
| SQ-16 | Does Temple use the same devices? | Diego | Nov 6 | Requested |

## **Internal decisions (Archie)**

| \# | Decision | Owner | Status (rev. 4\) |
| :---- | :---- | :---- | :---- |
| SD-01 | Interface layer: PCD-01, PCD-04, ORU, ADT, FHIR R4 (gateway level) | Jorge \+ Carlos | Supported by the device specs; Jorge to confirm |
| SD-02 | Streaming pattern in Archie | Jorge | Open; no Archie project yet |
| SD-03 | LLM and voice provider on AWS | Carlos \+ Jorge | Open |
| SD-04 | Coupled vs fully scripted physiology | Carlos \+ Israel | Open; recommendation: light coupling |
| SD-05 | Vendor scope | Carlos | Decided Oct 27 (DEC-09) |
| SD-06 | Device-agnostic foundation | Carlos \+ Jorge | Decided Oct 27 (DEC-10); Jorge to review the schema |
| SD-07 | Profile file format and validation tool | Carlos | Proposed: JSON with JSON Schema validation |
| SD-08 | Canonical hospital and location field names | Carlos | Decided Oct 27 |
| SD-09 | Freshness default: three times the expected interval | Carlos | Decided Oct 27 for the prototype; clinical confirmation at S2 |
| SD-10 | Waveforms rendered client-side from \~1 Hz numerics | Carlos | Recommended Oct 26; confirm with E-1 |
| SD-11 | Device alarms in the simulator; clinical alerting on the platform | Carlos | Recommended Oct 26 |
| SD-12 | Default alarm limits in profiles, configurable per hospital | Carlos | Decided Oct 27 |

# **15\. Functional Definitions: Epics and User Stories**

## **15.0 Method and conventions**

Each story reads *As a \<user\>, I want \<capability\>, so that \<outcome\>*, names the sections and requirements it serves, and carries acceptance criteria in Given/When/Then form. The users are the ones in §2: Demo Operator, Archie engineer and Clinical reviewer. The platform (the Archie backend) appears as the consumer of the simulator's output.

| NOTE · Action characteristics (apply to every story) Rather than repeat them per story, these qualities apply to every simulator behavior and are cited where they matter: Deterministic: the same scenario, seed and operator commands produce the same stream. Canonical: only canonical IDs and UCUM units cross component boundaries; vendor text is display data. Profile-driven: vendor-specific behavior comes from a versioned profile, never from code. Tenant-tagged: every event belongs to exactly one hospital. Standards-shaped: device, lab and ADT output follows §7. Restorable: any checkpoint restores in under 30 seconds. Observable: every operator command and injected event is logged with scenario time and wall time. Synthetic only: no real patient data anywhere. |
| :---- |

## **15.1 E1 · Scenario Engine and Demo Control**

**Epic.** A presenter can run any agreed scenario on demand, at the right speed, start it mid-story and recover from a mistake in seconds, so a live demo never depends on luck.  
**Serves.** §4, §6.1, §6.6, §6.7 · SIM-04, SIM-05, SIM-06, SIM-08 · Demo Operator  
**US1.1: As a Demo Operator, I want to start, pause, resume and reset a scenario from the console, so that I control the demo's pace.**

> * Given a loaded scenario, when the operator presses Start, then streams begin within 2 seconds and the console shows the scenario clock running.  
> * Given a running scenario, when the operator presses Pause, then no new events are emitted and the prototype shows the last values; Resume continues from the same scenario time.  
> * Given any state, when the operator presses Reset, then the scenario returns to t0 with the same seed.

**US1.2: As a Demo Operator, I want to change the speed (1×, 5×, 30×, 60×), so that a 40-minute deterioration fits a 5-minute demo.**

> * Given 30× speed, when 1 minute of wall time passes, then 30 minutes of scenario time have elapsed and trends advance accordingly.  
> * Given a speed change mid-run, then values stay continuous (no jumps).

**US1.3: As a Demo Operator, I want to jump to a named checkpoint, so that I can start the story at the moment that matters.**

> * Given a checkpoint "t0 \+ 2h40m, repeat lactate due in 5 min", when selected, then the state is restored in under 30 seconds with history consistent up to that time.

**US1.4: As an Archie engineer, I want a scenario run to be reproducible, so that tests and rehearsals give the same result.**

> * Given the same scenario, seed and command log, when run twice, then the emitted streams are identical (QA: three runs, no divergence).

## **15.2 E2 · Device Streams Through Profiles**

**Epic.** Bedside monitor, ventilator and pump data look like the devices Intercept's hospitals use, and a new device can be added as data.  
**Serves.** §3, §3a, §3b, §6.3 · SIM-01, SIM-09, SV-01 to SV-03, SV-13 · Archie engineer, Clinical reviewer  
**US2.1: As an Archie engineer, I want the engine to load device profiles from the registry, so that vendor detail never enters code.**

> * Given a profile that fails schema validation, when the engine loads, then it refuses the profile and names the failing field.  
> * Given a valid profile bound to a bed, when the scenario runs, then observations carry canonical IDs, UCUM units and the profile's vendor labels as display fields.

**US2.2: As a Clinical reviewer, I want each profile's ranges, defaults and alarm wording in a readable sheet, so that I can approve them without reading code.**

> * Given a profile, when exported for review, then it lists every metric with label, unit, range and default alarm limits, and records the reviewer and date once approved.

**US2.3: As an Archie engineer, I want to swap a bed's ventilator profile without touching the scenario, so that "two vendors, one view" costs a profile only.**

> * Given a scenario run on draeger.evita-v800 and on hamilton.c1, then the golden messages differ only in vendor display fields and device identifiers.

**US2.4: As a Demo Operator, I want device alarms to fire when values cross the profile limits, so that the platform reacts to real-looking alarms.**

> * Given SpO2 falls below the profile's low limit, when the next sample is emitted, then a PCD-04-shaped alarm with the profile's text and priority is sent; the platform assigns its own severity (P-DEC-17).

## **15.3 E3 · Labs and ADT**

**Epic.** Lab results and patient movements arrive the way hospital interfaces send them, so the census and Virtual Sepsis react to them.  
**Serves.** §3, §6.4, §7, §9 · SIM-01, SV-11, VS-01, PD-01 · Archie engineer  
**US3.1: As an Archie engineer, I want lab results emitted as ORU^R01 with LOINC codes at scenario times or after a signed order plus turnaround, so that sepsis logic runs on real-shaped input.**

> * Given a signed lactate order at scenario time T, then the result arrives at T plus the configured turnaround (SQ-05), with collected and resulted times.  
> * Given a culture, then it arrives first as pending and later as resulted.

**US3.2: As an Archie engineer, I want ADT A01, A02, A03 and A08 events with PV1-3 location fields, so that the census updates by hospital and bed.**

> * Given an A02 transfer, then the location fields (facility, point of care, room, bed) change and the previous bed is not left as current (SD-08).

## **15.4 E4 · Simulated EHR**

**Epic.** The prototype reads a chart and writes notes and orders back as if to a real EHR, so chat with the chart, documentation and orders work end to end.  
**Serves.** §3, §6.5, §7, §9 · SIM-02, CH-, CD-05, OE- · Archie engineer  
**US4.1: As an Archie engineer, I want FHIR R4 reads for a patient's chart and documents, so that chat with the chart can cite real-looking sources.**

> * Given a scenario patient, when the platform requests DocumentReference, then at least 3 echo reports and the specialist notes in the seed are returned with dates and authors.

**US4.2: As an Archie engineer, I want signed notes and orders accepted and acknowledged, so that write-back is visible and can change the scenario.**

> * Given a signed norepinephrine titration, when written back, then the EHR acknowledges it, it appears in later chart reads, and the MAP trajectory responds after its lag (SD-04).

## **15.5 E5 · Interface Fidelity and Ingestion**

**Epic.** The prototype's ingestion layer receives the same message shapes real gateways send, so it carries over to the production phase.  
**Serves.** §3b contracts, §7, §12 · SIM-07, SIM-10 · Archie engineer  
**US5.1: As an Archie engineer, I want golden-message tests per device class, so that a profile or mapping change cannot silently break output.**

> * Given a fixed scenario and profile version, when the message adapter runs, then the PCD-01 output matches the stored golden message exactly.

**US5.2: As an Archie engineer, I want the ingestion adapters to produce tenant-tagged canonical events, so that platform logic never sees vendor fields or another tenant's data.**

> * Given messages from two hospitals, then every canonical event carries exactly one hospital, and no event combines patients across hospitals (DEC-05).

## **15.6 E6 · Degraded States and Demo Safety**

**Epic.** The prototype shows stale, missing and disconnected data honestly, and the simulator never leaves a demo in an unknown state.  
**Serves.** §6.7, §6.8, §6.9 · SIM-08, SV-08, UX-06 · Demo Operator  
**US6.1: As a Demo Operator, I want to stop the simulator and have the prototype mark data stale, so that degraded-state handling is part of the story.**

> * Given streams stop, when three times a metric's sample interval has passed, then the platform marks it stale with its age (SD-09).

**US6.2: As a Demo Operator, I want to inject "hospital feed down" or "parameter not reporting", so that the alert and data-quality paths can be shown.**

> * Given "feed down" injected for one hospital, then only that hospital's streams stop and the others continue.  
> * Given "SpO2 not reporting" for one bed, then SpO2 is sent as absent with a reason, never as zero.

## **15.7 E7 · Camera, Messaging and Consult Scripts**

**Epic.** The camera, bedside messages and specialist consult play from scripts timed with the physiology, so the human side of each scenario stays in sync.  
**Serves.** §3, §5, §8 · SIM-03, CC-01 to CC-08, SC-01 to SC-04, CD-01 · Demo Operator  
**US7.1: As a Demo Operator, I want camera presets to switch prerecorded clips and send overlay data, so that a camera visit shows the room with the live values.**

> * Given a preset selected, then the clip changes and the overlay shows the same values the panels show at that scenario time.

**US7.2: As a Demo Operator, I want scripted bedside messages and replies routed per hospital channel, so that the inbox story works (Should).**

> * Given a scripted message at scenario time T, then it arrives tagged with its hospital and channel; a reply is accepted and acknowledged.

## **15.8 Traceability: requirements to sections and epics**

| Requirement (Requirements Spec §14) | Sections | Epic |
| :---- | :---- | :---- |
| SIM-01 Scenario-driven streams for monitor, vent, pumps, labs, ADT | §3, §4, §6 | E1, E2, E3 |
| SIM-02 Simulated EHR | §3, §6.5, §7 | E4 |
| SIM-03 Prerecorded camera | §3, §5 | E7 |
| SIM-04 Operator start, stop, reset, inject | §4, §6.6 | E1, E6 |
| SIM-05 Time compression | §4, §6.1 | E1 |
| SIM-06 Deterministic replays | §6.1 | E1 |
| SIM-07 Standards-shaped messages | §7 | E5 |
| SIM-08 Runs only during demos | §6.7 | E1, E6 |
| SIM-09 Device-agnostic profiles | §3b | E2 |
| SIM-10 Feeds the Archie backend through gateway-style adapters | §3b, §12 | E5 |

# **16\. Build Baseline for the Archie Backend (rev. 6\)**

This section is the current baseline for the build. It consolidates revisions 5 and 6 and matches the backend blueprint and Requirements v0.6 §7.1 and §8.1. Where an earlier section differs, this section wins. Proposed items still wait on the consolidation call with Diego.

| Area | Baseline | Status |
| :---- | :---- | :---- |
| Role and boundary | Separate service. Posts canonical event envelopes to the backend's ingestion endpoint (single and batch), carrying the original HL7 v2 message as provenance. Where the code lives: P-DEC-12 | Interface decided; home open (Jorge) |
| Device output | IHE PCD-01 numerics and alarms (IEEE 11073, UCUM); alarm raise, clear and bedside acknowledgment events | SD-01b decided; SD-15 proposed |
| EHR output | HL7 v2 per EHR profile: ADT A01/A02/A03/A08/A12; ORM^O01 orders and consults; RDE/RAS^O17 medications; ORU^R01 labs (LOINC); MDM notes | SD-13 proposed |
| Charted data | Hourly batches: vitals, intake and output, BiPAP and high-flow settings, neuro checks, glucose | SD-14 proposed |
| Other events | Still images (device screen, blood gas); hospital network state (normal, degraded, offline) | Proposed |
| Profiles | Device: Evita V800, CARESCAPE, Infusomat (streamed); generic BiPAP and high-flow (charted). EHR: Epic, Oracle Health, Meditech, TruBridge. Protocol: per hospital; reference v1 illustrative (Requirements §7.1) | Proposed |
| Cohort | 5 hospitals (Regional West hub; Chadron, Alliance, Sidney, Bridgeport spokes), 12 patients, 6 named personas; names stored as editable data | Proposed; names to confirm (Diego) |
| Scenario demand | Open (census); Act 1 Margaret, heart failure; Act 2 Rosa, sepsis; Act 3 Walter (ventilated COPD) and Linda (stroke); Close as Mock. Second phase: S2, S4, S6 live | Proposed (P-DEC-20) |
| Engine additions | Charted batches agreeing with device streams; artifact injection; alarm lifecycle; scheduled checks; multi-day jump; per-site bandwidth drop; still images; run-event export | Proposed |
| Backend counterpart | the backend blueprint, backend blueprint (kept in Cowork) | Ready to run once the Archie project exists |

# **Appendix A. Decision Log**

Every decision that shapes the simulator, with the reason, the alternatives considered and its status. Decisions are never deleted: a reversed decision stays, struck through, with the decision that replaced it.

| ID · date | Decision | Why | Alternatives considered | Decided by · status |
| :---- | :---- | :---- | :---- | :---- |
| DEC-07 · Oct 26 | Everything is built in Archie; the repo and Claude tools are design tools | One front end to maintain; the client sees the Archie build | Extend the v0 Netlify code (rejected under DEC-01) | Carlos · Decided |
| SD-01 · Oct 26 | Emulate gateway-level standards (PCD-01, PCD-04, ORU, ADT, FHIR R4), not device protocols | Every in-scope device reaches hospital systems through an HL7/IHE gateway (§7); the ingestion layer carries over to production | Emulate MEDIBUS, Block Protocol and similar device protocols (rejected: high cost, no visible demo value) | Carlos · Supported by specs; Jorge to confirm; reopens if SQ-02 shows Ceiba consumes a vendor protocol ▲ rev. 5: superseded in part by SD-01b (Oct 28\) |
| SD-10 · Oct 26 | Stream numerics at \~1 Hz; render waveforms client-side | Sample streaming at 125 to 500 Hz adds cost and risk with no visible gain in a demo | Stream raw waveform samples | Carlos · Recommended; confirm with E-1 |
| SD-11 · Oct 26 | Device alarms fire in the simulator; clinical alerts are computed on the platform | Keeps the platform's alert and sepsis logic real and reusable; matches real topology | Script platform alerts in the simulator (rejected: fake logic) | Carlos · Recommended |
| DEC-09 · Oct 27 | One device profile per class for Nov 13 (CARESCAPE ONE, Evita V800, Infusomat); Hamilton C1 optional by Dec 18; MR1 out | Diego asked for "one of each"; the cost per vendor is content, clinical review and QA, not message plumbing | All four vendors now (rejected: review and QA load before Nov 13); two most-used (deferred to the C1 option) | Carlos · Decided; Albert informed |
| DEC-10 · Oct 27 | Device-agnostic foundation: vendor specifics in versioned profiles; vendor-neutral core | A new device becomes a profile plus a review, not code; the same mapping serves production feeds | Hard-code each device (rejected: rework per device) | Carlos · Decided; Jorge reviews the schema |
| DEC-11 · Oct 27 | The prototype has its own backend in Archie, fed by the simulator | Platform logic runs for real; the demo is end to end | Front end reads the simulator directly | Albert · Decided |
| SD-08 · Oct 27 | Canonical hospital and location fields (hospitalCode, hospitalName, ehrVendor, timeZone, connectionStatus; unitCode, unitName, room, bed as text) | One vocabulary across design, simulator and Archie; maps to ADT PV1-3; closes the PRD's field-name question | Separate naming per layer | Carlos · Decided |
| SD-09 · Oct 27 | Stale after three times the expected interval, from the profile's sample\_interval | Gives the prototype a working default (BR-08); closes PRD OD-06 for now | Fixed global timeout | Carlos · Decided as assumption; Israel confirms at S2 |
| SD-12 · Oct 27 | Default alarm limits live in profiles, configurable per hospital | Limits must be clinically reviewed and configurable (PC-044, CA-03) | Limits in the design system or the UI | Carlos · Decided |
| P-DEC-12 · Oct 27 | Simulator code lives in the Archie backend or a separate Archie Labs repository, not in intercept-ucl | intercept-ucl is a design-system package with automatic publishing, owned by Julio | Put the simulator in intercept-ucl | Jorge · Proposed (G0 Oct 29 / Oct 30\) |
| P-DEC-14 · Oct 27 | One canonical cohort: the design repo's 14 patients and 3 fictional hospitals, with hospital attributes added | Clean data; one cohort shared by simulator, Archie and designs; supersedes A-08 (reuse v0) | Clean and reuse the v0 cohort | Carlos \+ Julio · Proposed (G0) ▲ rev. 5: superseded by the Nebraska network |
| P-DEC-17 · Oct 27 | Device alarm priority (3 levels) stays a device attribute; platform severity (Critical / High / Medium / Low) is assigned downstream | Three severity models existed across spec, PRDs and simulator | Map device priority straight to platform severity | Carlos \+ Julio · Proposed; Israel validates |
| SD-07 · Oct 28 | Profile files in JSON, validated with JSON Schema | Same format as the canonical events; standard validators | YAML (easier to hand-edit, weaker tooling for strict validation) | Carlos · Proposed |
| DEC-18 · Oct 28 | Source of truth: the System Specification, the first prototype and the latest transcripts. Client documents answer questions and test assumptions | Keeps the simulator anchored on the agreed product, not on one hospital's current integration | Adopt client documents as requirements | Carlos · Decided |
| SD-01b · Oct 28 | Devices emit IHE PCD-01 from the canonical model, plus a reserved adapter slot for proprietary connectors (DEC-19) | The client interface documentation shows two paths; only the standards path is vendor-neutral and documented. Intercept's goal is to own the platform and leave point-to-point integration behind | Mirror the Ceiba box output (undocumented, and it ties the prototype to the current vendor) | Carlos · Decided; Jorge confirms the simulator home (P-DEC-12) |
| SD-13 · Oct 28 | One EHR profile per brand (Epic, Cerner, Meditech, TruBridge) with the HL7 v2 inbound set; the chart API stays FHIR-shaped | Diego's scenarios use four EHRs; client hospital feeds are HL7 v2; a new EHR becomes data, not code | A single FHIR-only simulated EHR (not how hospitals send data today) | Carlos · Proposed |
| SD-14 · Oct 29 | BiPAP is emitted as charted values (respiratory therapist), labeled as charted; high-flow nasal cannula added as an oxygen mode | Rural BiPAP units are separate and not integrated with the EHR (Lisa-Mae) | Stream BiPAP like a ventilator (would show an integration that doesn't exist) | Carlos · Proposed |
| SD-15 · Oct 29 | Device alarms carry bedside acknowledgment events; the remote view gets them as visual status; remote action starts from trend and platform alerts | The remote team is never the first responder to bedside alarms (Lisa-Mae; Requirements BR-14) | Remote acknowledgment of device alarms | Carlos · Proposed |

| SCOPE CUT · Removed from scope, kept for audit ~~Dialysis machine stream~~: dropped by Intercept, Oct 22\. ~~Hamilton MR1 profile~~: MRI use, not ICU beds (DEC-09). ~~Raw vendor protocols and pump programming (PCD-03)~~: not emulated (SD-01). ~~Raw waveform sample streaming~~: replaced by client-side rendering (SD-10). |
| :---- |

# **Appendix B. Open Items Log**

| \# | Open item | Section | Linked IDs | Status after rev. 4 | Owner |
| :---- | :---- | :---- | :---- | :---- | :---- |
| OI-01 | Scenario timelines and their physiology | §4, §4a | D-01, SQ-04 | Six candidates drafted; walkthroughs requested; lock Oct 30 ▲ rev. 5: six scenarios received; three-act cut proposed (OI-26) | Diego / Israel / Lisa-Mae |
| OI-02 | Device details: software versions, host monitor, main ventilator, pump platform, Temple | §3a | SQ-12 to SQ-16 | Requested; profiles v1 use "unknown" versions until answered ▲ rev. 5: full fleet received Oct 28; V800 confirmed; versions not needed | Lisa-Mae / Eric / Diego |
| OI-03 | Whether Ceiba consumes a vendor-specific protocol | §7 | SQ-02 | Open; device specs point to a gateway for every device ▲ rev. 5: answered: two paths; standards path chosen (SD-01b); box format undocumented (OI-25) | Lisa-Mae / Eric |
| OI-04 | Who operates the simulator in live demos, and whether the presenter sees the console | §2 | SQ-08 | Open | Diego |
| OI-05 | Demo speed: real time vs compressed per scenario | §4 | SQ-08 | Open | Diego |
| OI-06 | Number of concurrent simulated beds | §9 | — | Proposed: 14 beds, 4 to 6 scripted, the rest stable background ▲ rev. 5: 12 patients across 5 sites (Diego's network) | Carlos |
| OI-07 | Camera footage source and consent | §3, §8 | SQ-09, D-11 | Open | Diego / Becky |
| OI-08 | Messaging channel labels | §6.10 | UX-05, CL-03 | Narrowed: generic labels on clinical screens; channel names to confirm | Carlos / Albert |
| OI-09 | Coupled vs fully scripted physiology | §6.2 | SD-04 | Open; recommendation light coupling | Carlos / Israel |
| OI-10 | Simulator code home and feed into Archie | §12 | P-DEC-12, D-16 | Proposed; decision Oct 30 | Jorge |
| OI-11 | Archie project and AWS environments | §13 | D-08 | NEW: no Archie project yet; blocks the Archie-side Sprint 0 items | Carlos / Jorge |
| OI-12 | Streaming pattern in Archie | §7 | SD-02, E-1 | Open | Jorge |
| OI-13 | Profile file format | §3b | SD-07 | Proposed: JSON \+ JSON Schema | Carlos |
| OI-14 | Severity mapping validation | §3b | P-DEC-17 | Proposed; Israel validates at S2 | Carlos / Julio |
| OI-15 | Canonical cohort | §9 | P-DEC-14 | Proposed; G0 Oct 29 ▲ rev. 5: superseded by the Nebraska network (5 sites, 12 patients) | Carlos / Julio |
| OI-16 | Parameters and alarms clinicians watch | §3a | SQ-03 | Open ▲ rev. 5: answered for heart failure (Lisa-Mae, Oct 28); see OI-21, OI-22, OI-24 ▲ rev. 6: answered for all six diagnoses (Oct 29\) | Israel / Lisa-Mae |
| OI-17 | Lab turnaround times | §6.4 | SQ-05 | Open | Lisa-Mae |
| OI-18 | Infusions, dose units and titration steps | §3 | SQ-06 | Open ▲ rev. 5: mostly answered (client drug list, Epic units, Lisa-Mae's drip list); Intercept's most-used drips still open | Israel |
| OI-19 | Document templates for chat with the chart | §9 | SQ-07 | Open | Israel / Diego |
| OI-20 | Clinical reviewer slots | §10 | SQ-11, D-10 | Open: book Oct 30 and Nov 10 ▲ rev. 5: Lisa-Mae reviewing parameters now; script reviewer asked of Diego | Israel / Lisa-Mae |
| OI-21 | Alarm thresholds (the table is missing from Lisa-Mae's Oct 28 email) | §6 | SQ-03, I-26 | Requested Oct 28, due Nov 2 ▲ rev. 6: received Oct 29 (10 alarms, illustrative triggers) | Lisa-Mae |
| OI-22 | Which alarms lead to a bedside call vs escalation to the intensivist | §6 | SQ-03 | Requested Oct 28, due Nov 2 ▲ rev. 6: answered: bedside nurses respond to all alarms; the remote team is never first responder (SD-15) | Lisa-Mae |
| OI-23 | BiPAP device at rural sites: ventilator NIV mode or a separate unit | §3a | C8 | Requested Oct 28 ▲ rev. 6: answered: separate unit, not integrated; shown as charted (SD-14); names pending (OI-27) | Lisa-Mae |
| OI-24 | Monitoring breakdown for sepsis, ventilated COPD and stroke; then COPD on BiPAP and DKA | §4a | SQ-03, D-19 | Requested Oct 28, due Nov 2 ▲ rev. 6: received Oct 29 for all six diagnoses (dashboard guide) | Lisa-Mae |
| OI-25 | Ceiba bedside box message format | §7 | I-27 | Not needed unless a customer requires it (SD-01b) | Diego |
| OI-26 | Scenario cut and what Nov 9 requires | §4a | C1, C2, D-21 | Proposed (three acts); consolidation call | Albert \+ Diego |
| OI-27 | Names of the BiPAP units at the rural sites | §3a | I-28, Q-14 | Requested Oct 29 | Lisa-Mae |
| OI-28 | SIRS temperature threshold: \> 38 °C (guide) or \> 38.3 °C (SEP-1 baseline) | §6 | Q-13 | Open; settle at the script review | Lisa-Mae / Israel |
| OI-29 | Reference protocol, labeled configurable per hospital, acceptable for the demo | §6 | A-15 | Open; consolidation call | Diego / Lisa-Mae |

# **Appendix C. Glossary**

| Term | Meaning |
| :---- | :---- |
| ADT | Admit, Discharge, Transfer: HL7 v2 messages that tell systems where a patient is (A01 admit, A02 transfer, A03 discharge, A08 update) |
| ORU^R01 | HL7 v2 observation result message, used for labs and device observations |
| IHE PCD-01 | Integrating the Healthcare Enterprise profile for device observations (Device Enterprise Communication): ORU^R01 with IEEE 11073 codes |
| IHE PCD-04 | IHE profile for device alarms (Alert Communication Management) |
| IEEE 11073-10101 | Nomenclature of medical device codes (MDC) used in PCD messages |
| UCUM | Unified Code for Units of Measure |
| LOINC | Standard codes for lab tests and clinical observations |
| FHIR R4 | HL7's resource-based API standard, release 4 |
| Gateway | Middleware that collects device data and sends standard messages to hospital systems (for example CARESCAPE Gateway, Dräger CC300 and Infinity Gateway Suite, B. Braun DoseTrac) |
| Ceiba | The system Intercept uses today to receive hospital device data; how the devices reach it is SQ-02 |
| Device class, profile, instance | Kind of device; one vendor model and version described as data; a profile bound to a bed (§3b) |
| Canonical metric | Vendor-neutral identifier for a value, with its IEEE 11073 code and UCUM unit |
| Golden message | A stored expected output used to detect unintended changes |
| Scenario clock, compression | Simulated time separate from wall time; speed multiplier |
| Checkpoint | A named scenario state that can be restored in under 30 seconds |
| Tenant | A hospital; all patient data is scoped to one |

