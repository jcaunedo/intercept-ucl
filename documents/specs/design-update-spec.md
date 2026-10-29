<!--
SNAPSHOT — read-only copy published from Cowork (DEC-20).
Document: Intercept Live · Design Update Spec · v1.0
Snapshot date: 2026-10-29 · Snapshot set: v1 · Published by: CX-04
Source of truth: Cowork project "Intercept Telehealth - Series B". Do not edit here;
propose changes in a PR comment or an RCP, and Carlos updates the source and re-publishes.
Sanitized for the repo: no Archie prompts, no client-confidential interface material.
-->

# Intercept Live — Design Update Spec for the UCL repo (components and layouts)

**Version 1.0** · Oct 29, 2026 · Owner: Carlos Jimenez (functional specs) · For: Julio Caunedo (presentation and design system) · Repo baseline: `jcaunedo/intercept-ucl` @ `6e31d52` (CX-03)

| Version | Date | Changes |
|---|---|---|
| v1.0 | Oct 29 | First issue. Turns Requirements v0.6, the backend data model (the backend blueprint), Lisa-Mae's clinical guide and mockups, and the three-act scenario proposal into per-component design updates. Carries forward the open repo proposals RCP-01 to RCP-17 and the CX-03 findings |

## How to use this spec

- **Ownership.** Julio owns presentation behavior and the design system; Archie Labs (Carlos) owns the functional and technical specs. Every item here is a **proposal**. Julio decides how each one looks and answers each item with Accept, Adapt (say how) or Decline (say why), in the Status column or in the PR that implements it.
- **Source of truth.** The requirement IDs (SV-, AL-, VS-, OE-, CD-, CC-, SC-, CH-, HO-, BR-, UX-) point to `documents/specs/requirements-specification.md`. Clinical values are illustrative until the clinical script review (Nov 3–4) and come from the reference protocol profile (Requirements §7.1); screens show values, they never hard-code thresholds.
- **Priority.**
    - **Nov 13** = needed for the first build (Open, Act 1, Act 2, Act 3).
    - **Dec 18** = second phase.
    - **Could** = when convenient.
- **Commits** cite the DU ID and the requirement IDs, for example `feat(patient-details): sepsis tracker in-progress status [DU-20][VS-04]`.

## 1. What the first build shows (scenario context)

The demo runs as one night across five rural hospitals and 12 synthetic patients. The proposal waiting on Diego's sign-off covers:

| Part | Patient and setting | Components it leans on |
|---|---|---|
| **Open** | Hub census: 12 patients, 5 hospitals, 4 EHRs | Census, HospitalSectionHeader, PatientCard, triage queue |
| **Act 1** | Margaret H., 72, heart failure on the medical-surgical floor at Chadron (no ICU) | PatientCard, Overview four-panel view, respiratory panel (BiPAP charted), infusion ↔ response, intake and output, Ask Intercept, keep-or-transfer, orders, notes, family update |
| **Act 2** | Rosa M., 51, septic shock in the Sidney ED, led by the local APP | Sepsis tracker, kidney-dose and fluid prompts, orders, shared task list, bedside nurse phone view |
| **Act 3** | Walter P., 71, ventilated COPD (Regional West ICU) and Linda S., 66, stroke (Sidney ED), at the same time | Triage ranking, overflow routing, specialist consult, stroke check schedule, ventilator panel, handoff |
| **Close** | Outcomes dashboard | Mock, static synthetic month |

Margaret (`p15`) is already in the repo. The other personas are DU-08.

## 2. Platform rules every component follows

These come from decisions already made. They apply everywhere; the items in §3 point back to them.

| Rule | What it means on screen | Source |
|---|---|---|
| **Remote team is never the first responder** | Device alarms appear to remote roles as **status** (visual only), with who acknowledged them at the bedside and when. No control lets a remote role silence or acknowledge a device alarm. Remote actions start from platform alerts and trends | BR-14, AL-10, RAID R-27 |
| **Hospital isolation** | Census always grouped by hospital; counts per hospital; work lists may mix hospitals only as tagged items that open in that hospital's context; no cross-hospital comparisons | BR-09, DEC-05 |
| **Provenance and freshness** | Every value shows its source (device, charted, lab, calculated, clinician, AI) and age; stale values stay visible, marked stale; missing is "—", never zero. Clinical surfaces use generic source labels ("Bedside monitor", "Charted", "EHR feed"), not vendor names | SV-08, BR-08, CL-03 |
| **AI and protocol suggestions assist, never act** | Every suggestion shows evidence and source, and the clinician accepts, modifies or declines (with rationale). Outcome list everywhere: accepted, modified, declined, elapsed | BR-06, BR-07, OE-03 |
| **Current-state score, no prediction** | The deterioration score describes now, with its inputs; no "predicts", "will deteriorate" or similar wording | DEC-06, SV-09 |
| **Reporting-only fields** | Payer tag and rurality show as tags marked "reporting only" and never appear in score explanations or rankings | UC demo rules, Requirements §8 |
| **Synthetic data** | Every screen carries a "Synthetic data" label | UC demo rules |
| **No dead controls** | Controls without behavior on a scenario path are hidden or labeled "Preview" | UX-11 |

## 3. Design updates by area

### 3.1 Design system and shared primitives

| ID | Where | Update | Why | Priority | Status |
|---|---|---|---|---|---|
| DU-01 | `src/styles/theme.css` severity tokens; `Badge`; `PatientCardAlert`; triage queue | Platform alert severity: **Critical, High, Medium, Low** (Medium = amber with dark text). Device alarm priority is a separate visual attribute, not mapped one-to-one onto platform severity | P-DEC-17, AL-02; RCP-06 | Nov 13 | Proposed |
| DU-02 | `theme.css` (`severity-*`, `foreground-subtle`, new monitor-ink tokens) | Re-measure against WCAG AA after the ECG light-mode change; fix white-on-severity text below 4.5:1 | R-24; RCP-07; CX-03 rec. 5 | Nov 13 | Proposed |
| DU-03 | New primitive (for example `ValueStatus`), used by tiles and cards | A text status next to a value: within target, below target, above target, high, low, rising, falling, criterion met. Never color alone. The status comes from the data, not from the component | SV-20; Lisa-Mae mockups | Nov 13 | Proposed |
| DU-04 | New primitive (for example `SourceChip`) or an extension of existing provenance labels | Source + age on every value; states: live, stale, missing, charted. "Charted" is used for BiPAP, high-flow, intake and output and nurse-charted vitals | SV-08, SV-15, SV-16; SD-14 | Nov 13 | Proposed |
| DU-05 | App shell (`app-header` or layout frame) | Persistent "Synthetic data" label | UC demo rules | Nov 13 | Proposed |

### 3.2 Census and hospitals

| ID | Where | Update | Why | Priority | Status |
|---|---|---|---|---|---|
| DU-06 | `census-panel.tsx`, `monitoring-panel.tsx`, `HospitalSectionHeader` | Per-hospital counts only (no "N patients across M hospitals"); "My patients · N" allowed with per-hospital breakdown. Header shows EHR, time zone and connection status, including **degraded** and **offline** | DEC-05; RCP-04, RCP-05 (verify whether already done) | Nov 13 | Proposed |
| DU-07 | `sample-census.ts`, `sample-workspace.ts` | Move the sample network to five hospitals: Regional West (hub, Epic), Chadron (Meditech), Alliance (Oracle Health), Sidney (Meditech), Bridgeport (TruBridge), with hub or spoke role and rurality. Names are editable data and still to be confirmed with Diego | Scenario proposal; Requirements §8.1 | Nov 13 | Proposed |
| DU-08 | `sample-*` files | 12 patients, six named personas (Margaret, Dale, Rosa, Tyler, Walter, Linda) plus six stable background patients. New fields: payer tag, rurality, preferred language, social needs, designated contact (reporting-only fields per §2) | Scenario proposal; Requirements §8.1 | Nov 13 | Proposed |

### 3.3 Monitoring, triage and alerts

| ID | Where | Update | Why | Priority | Status |
|---|---|---|---|---|---|
| DU-09 | `triage-queue.tsx`, `monitoring-list.tsx` | One work list across the clinician's covered hospitals, ranked by open Critical alerts, deterioration band, rising score (4 h) and overdue sepsis elements. Each item shows a **reason line** ("rising respiratory rate, positive fluid balance, heart failure") and its hospital tag | UC S1, S5; the backend blueprint §8; open with Albert (C4) | Nov 13 | Proposed |
| DU-10 | `patient-monitoring-card.tsx`, `PatientCardAlert`, Overview alerts rail, triage queue | Device alarms as status with bedside acknowledgment (who, when, how long active); no remote "acknowledge alarm" or "silence" control on device alarms | BR-14, AL-10 | Nov 13 | Proposed |
| DU-11 | Same as DU-10 | "Possible artifact" marker on alarms with poor signal quality (motion SpO₂, lead off, poor pleth, cuff error, mask leak); shown, never hidden | AL-12 | Nov 13 | Proposed |
| DU-12 | Alert list and cards | One alert per condition: repeats update the existing alert (last seen, count) instead of stacking new notifications | AL-11 | Nov 13 | Proposed |
| DU-13 | Alert detail and actions | Lifecycle new → acknowledged → escalated → resolved; resolve takes a reason (treated, artifact or false alarm, expected for this patient, duplicate); Low and operational items not counted as open | AL-03, AL-07, AL-09 | Nov 13 | Proposed (verify against current) |
| DU-14 | `PatientCard` score area, Overview Brief | Replace the SOFA placeholder with the **NEWS2-style current-state score**: value, band, contributing factors with points, 24 h change; no predictive wording | SV-09 (v0.6); supersedes RCP-10 | Nov 13 | Proposed |
| DU-15 | New component (overflow offer) in the triage or alert flow | When two serious events hit one intensivist, offer to route one to the Intercept backup intensivist or an eligible specialist; show who took it and response time | UC S5; the backend blueprint §8 | Nov 13 | Proposed |

### 3.4 Patient card, monitor and respiratory panels

| ID | Where | Update | Why | Priority | Status |
|---|---|---|---|---|---|
| DU-16 | `patient-monitoring-card.tsx`, Overview Ventilator section | Respiratory panel by support type: **invasive** (mode, FiO₂, PEEP, set/measured rate, exhaled Vt, minute ventilation, peak/plateau); **BiPAP** (IPAP, EPAP, FiO₂, backup rate, measured rate, **leak**; labeled charted); **high-flow** (flow, FiO₂); **conventional oxygen** (device, flow). When not ventilated, show oxygen delivery and airway status, never an empty ventilator panel | SV-15; SD-14; Lisa-Mae guide | Nov 13 | Proposed |
| DU-17 | Overview Infusions, `medications-section.tsx` | Each infusion shows drug, dose with the EHR's unit string (mcg/kg/min, mcg/min, units/hr, units/min, mg/hr, mL/hr), rate, last titration, **and the value it targets** next to it: furosemide ↔ urine output and net balance; norepinephrine ↔ MAP; insulin ↔ glucose | SV-03, SV-17 | Nov 13 | Proposed |
| DU-18 | Overview (Act 1), vitals or a new tile | Intake and output: hourly urine output, net balance (24 h), daily weight with 48 h trend; labeled charted | SV-16 | Nov 13 | Proposed |

### 3.5 Patient details page

| ID | Where | Update | Why | Priority | Status |
|---|---|---|---|---|---|
| DU-19 | `patient-overview.tsx` | **Four-panel diagnosis view**: vital signs, ventilator or BiPAP, actionable alarms, infusions. Parameters ordered **first / next / conditional** for the patient's pathway (heart failure, sepsis, ventilated COPD, stroke after thrombolysis; COPD on BiPAP and DKA later). Optional elements from Lisa-Mae's mockups: status pill, secondary panel, one-line interpretation (wording generated from rules; never a diagnosis) | SV-18; Lisa-Mae guide and mockups | Nov 13 (first four pathways); Dec 18 (BiPAP, DKA) | Proposed |
| DU-20 | `sepsis-section.tsx`, `sample-sepsis.ts` | SEP-1 tracker: Time Zero **proposed then confirmed** by a reviewer; 3 h and 6 h deadlines; element rows with due time, performed time and status **complete / in progress / pending / overdue / not applicable / review**; SIRS criteria met (0–4) with each criterion; organ-dysfunction values; candidate confirm or exclude with rationale; prompts with outcome. Leave room for an hour-1 timer until Q-15 is settled | VS-01 to VS-06; Lisa-Mae SEP-1 mockup; Q-15 | Nov 13 | Proposed |
| DU-21 | New panel or Overview variant (stroke) | Post-thrombolysis surveillance: neuro checks and BP every 15 min for 2 h, every 30 min for 6 h, then hourly to 24 h, each due, done or overdue; BP against target (< 180/105); neuro change, headache or vomiting, bleeding assessment; 24 h imaging pending before antithrombotics | SV-19; Lisa-Mae guide and mockup | Nov 13 (Act 3) | Proposed |
| DU-22 | New component: keep-or-transfer | Needs vs what the hospital has now (BiPAP, respiratory therapist, hourly vitals, nurse capacity); transport status (air, ground, ETA); receiving options; decision with rationale; checkpoints (1 h, 4 h) with pass or miss; "transfer avoided" outcome | UC S1; the backend blueprint Transfer Decision | Nov 13 (Act 1) | Proposed |
| DU-23 | `orders-section.tsx` | Suggested order sets show source (protocol or AI) and evidence, with accept / modify / decline (rationale). Co-sign route shown (supervising intensivist or local physician). Write-back status per hospital; when off, "Complete in hospital EHR" | OE-03, OE-04, OE-06, OE-07 | Nov 13 | Proposed |
| DU-24 | `notes-section.tsx`, `sample-notes.ts` | Note types: initial consult, progress note with an overnight-events section, ICU recommendations by system, H&P. Statuses: draft, unverified, signed, addendum. Provenance "AI-drafted, clinician-signed". Addendum links to the original | CD-05, CD-07, CD-11 | Dec 18 (Nov 13 if Act 1 shows the note) | Proposed |
| DU-25 | New layout and component: shared task list + bedside nurse phone view | Tasks generated from orders and protocols, shared by bedside and remote, due and overdue (10 min); a phone-style bedside nurse view for a task or nudge ("time to check the lactate") | CC-06, CC-07; UC S3 | Nov 13 (Act 2) | Proposed |
| DU-26 | New component: family update | AI-drafted update to the designated contact; clinician accepts, modifies or declines before it is sent. The family's phone screen can be a Mock | CC-08; UC S1 | Nov 13 (doctor side); family screen Mock | Proposed |
| DU-27 | New layout: specialist consult | Request (specialty, urgency); eligible specialists as profile cards (licensed in the state, privileged at the hospital, board-certified), ineligible ones filtered out with the reason; status requested → matched → accepted → in session → delivered → closed; a consult can start from a hospital EHR order | SC-01 to SC-05, SC-11, BR-12 | Nov 13 (Act 3) | Proposed |
| DU-28 | `camera-section.tsx` | Capture state (not recording, recording, paused, stopped, opted out) under the hospital's consent profile; a live session marks the clinician busy | CD-01, CD-04 | Dec 18 | Proposed |
| DU-29 | `ask-intercept-panel.tsx`, `ChatComposer` | Citations that open the source item; "I don't have that in the record" when data is absent; voice, dictate and attach either work or are labeled "Preview" (currently inert) | CH-03, CH-05, UX-11; CX-03 finding A-16 | Nov 13 (inert controls); Dec 18 (citations) | Proposed |
| DU-30 | `epic-section.tsx` (Epic tab) | The network uses four EHRs. Rename the tab to a generic "EHR" placeholder ("Connect the hospital's EHR"); the brand comes from the hospital's EHR profile where brand names are allowed | DEC-04, CL-03; multi-EHR network | Dec 18 | Proposed (Albert to confirm wording) |
| DU-31 | Handoff (layout) | Generated handoff by patient: open alerts by severity, watchlist and intuition alerts, sepsis bundles and checks in flight, unresolved messages; incoming clinician acknowledges | HO-01 to HO-03 | Nov 13 (Act 3 close) | Proposed |
| DU-32 | Hospital header, patient views | Network degraded or offline: banner per hospital, values at reduced cadence marked, stale values never shown as live | UX-06; UC S2 | Dec 18 | Proposed |

## 4. Data contracts (sample data ↔ backend)

The backend in Archie is built from data model v1 (Requirements §8.1). If the sample data uses the same names and enums, porting the screens becomes mapping, not rework. Proposed for the `sample-*` types (DU-33):

| Concept | Field or enum (backend v1) |
|---|---|
| Hospital | `hospitalCode`, `hospitalName`, `ehrVendor`, `timeZone`, `connectionStatus` (normal, degraded, offline), role (hub, spoke), rurality code |
| Location | unit code and name, unit type (ICU, emergency department, medical-surgical floor, inpatient floor), room, bed |
| Value origin | device, charted, lab, calculated, clinician, AI, system |
| Value status | within target, below target, above target, high, low, rising, falling, criterion met |
| Support type | invasive ventilation, BiPAP, high-flow nasal cannula, conventional oxygen |
| Alert severity / state | Critical, High, Medium, Low / new, acknowledged, escalated, resolved |
| Resolve reason | treated, artifact or false alarm, expected for this patient, duplicate |
| Device alarm state | active, acknowledged (bedside), cleared |
| Sepsis element status | complete, in progress, pending, overdue, not applicable, review |
| Suggestion outcome | accepted, modified, declined, elapsed |
| Note status | draft, unverified, signed, addendum |
| Consult status | requested, matched, accepted, in session, delivered, closed |
| Task / check status | open, done, overdue, cancelled / due, done, overdue |

| ID | Where | Update | Priority | Status |
|---|---|---|---|---|
| DU-33 | `sample-*` types across layouts | Adopt the names and enums above (display labels can differ) | Nov 13 | Proposed |

## 5. Repo and PRD housekeeping (from CX-03)

| ID | Item | Proposal | Owner | Priority | Status |
|---|---|---|---|---|---|
| DU-34 | Patient-details PRD IDs use `PD-`, which collides with the Requirements `PD-` (Provider Desktop) | Renamespace (for example `PDT-`, `PDT-AC-`) and update `glossary.md` and explorations references | Julio | Dec 18 | Proposed |
| DU-35 | Open proposals RCP-01 to RCP-05 (Oct 27): predictor removed from v1; pumps in scope; generic provenance labels; per-hospital counts; hospital attributes | Confirm each is done, or schedule it; DU-06 covers RCP-04/05 | Julio | Nov 13 | To verify |
| DU-36 | RCP-08 to RCP-16 (drift, sources, snooze, monitor reference, WCAG target, PRD README) | Keep open; RCP-10 is superseded by DU-14 | Julio | Dec 18 | Open |
| DU-37 | Layout-local primitives (`section-parts.tsx`: `SectionCard`, `Detail`, `NoData`; the chat transcript renderer; `LabTile`, `BriefCard`) | Promote to `src/components/` when the design system draws them; add an `index.ts` barrel to `patient-details` | Julio | Could | Proposed |
| DU-38 | Demo use-cases PDF in `documents/scenarios/`; Slack notes and two reference docs still tracked (rendered by Storybook) | Remove from git in one follow-up together with their Storybook pages (decision pending: Carlos and Albert) | Carlos / Julio | Dec 18 | Decision pending |
| DU-39 | No `v0.1.0` tag yet | Cut an annotated `v0.1.0` tag on the CX-02 merge commit (tags don't trigger publish) | Carlos / Julio | Nov 13 | Proposed |

## 6. Sources

- Requirements Specification v0.7 (`documents/specs/requirements-specification.md`): §2 objectives, §4 roles, §5, §7 and §7.1, §8.1.
- Simulator Specification v0.6 (`documents/specs/simulator-specification.md`), §16 build baseline.
- Clinical inputs from Intercept's CNO (Oct 28–29): monitoring priorities, alarm thresholds, a dashboard guide for six diagnoses and six mockups. They are summarized here; the originals stay in Cowork.
- Scenario proposal (three acts) sent to Intercept for confirmation; scenario walkthroughs from Intercept (Oct 23).
- CX-03 repo analysis (Oct 29, `6e31d52`).
