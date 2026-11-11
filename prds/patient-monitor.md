---
requirements: [SV-01, SV-08, AL-02, BR-08, BR-14, UX-05]
status: proposed — confirm with Carlos
---

<!--
Created: Nov 11, 2026
Created by: Julio Caunedo
Last updated: Nov 11, 2026
Scope: The patient monitor (UCL PatientMonitor): the live bedside monitor shown on Patient details, in the alert modal and in the Monitoring card's full view. Its lanes, numerics, alarm limits and device alarms.
Purpose: Defines the monitor's behavior, states and acceptance criteria in one place, so every surface that shows a patient's bedside monitor shows the same thing, pending clinical and product validation.
-->

# PRD — Patient monitor

**Product:** Intercept Live — Virtual Care OS  
**Module:** Tele-Critical Care Clinical Surveillance ★ and the Provider Desktop (Spec §5.2, §5.1)  
**Surface:** a component, not a page: the **patient monitor** (UCL `PatientMonitor`), wherever a patient's live bedside monitor is shown  
**Version:** 0.1  
**Status:** Draft — pending clinical and product validation  
**Last updated:** November 11, 2026

---

## 1. Overview

The patient monitor is the remote view of a patient's bedside monitor: four lanes, one per parameter (heart rate, SpO₂, arterial pressure, respiration), each a live waveform beside its numbers and alarm limits. It lets a remote clinician read the bedside at a glance, the way they would read the device in the room, without being the first responder to its alarms (BR-14).

It's one component used on several surfaces, so the monitor reads the same everywhere: the same lane order, colors, numbers and alarm marks.

| Surface | How it shows the monitor |
|---|---|
| **Patient details** › Overview › Live monitoring | The monitor on its own, beside the patient's other data. |
| **Alert modal** (and a video consult without an alert) | The monitor fills the alert column's spare height, under the patient and the alert. |
| **Monitoring** › patient card, Full monitors | The card's full view is this monitor, inside the card (PRD Monitoring MON-084). |

ℹ️ The Monitoring card's **condensed** view (an ECG strip over four numbers, or a sparkline under each number) is the card's own layout, built from the same numerics and waveform. It's covered by PRD Monitoring and PRD Patient card, not here.

### 1.1 Product objectives

| Objective | What it means for the monitor |
|---|---|
| **Read at a glance** | HR, SpO₂, BP and RR are the largest numbers, in the same place and color on every patient (MON-070–MON-072). |
| **Look like the bedside** | Waveforms, labels, limits and device alarm boxes follow the bedside device's conventions, so nothing needs translating. |
| **Never mislead** | A missing value is "--", never zero; a limit that's off reads OFF; the waveforms are illustrative and never diagnostic. |
| **One monitor everywhere** | Every surface shows the same component with the same rules. |

### 1.2 Source documents

| Document | What this PRD takes from it |
|---|---|
| Requirements Specification | SV-01 (vitals and waveforms from the bedside monitor), SV-08 and BR-08 (source, age, missing values), AL-02 (device alarm priority is the device's own attribute), BR-14 (the remote team is never the first responder), UX-05 (device data looks like device data) |
| Simulator Specification | SD-12 (alarm limits live in the bed's device profile, configurable per hospital), SD-15 (bedside acknowledgment reaches the remote view as status) |
| PRD — Monitoring | MON-014 (live values, change cue), MON-070–MON-074 (waveform organization, numeric hierarchy, parameter colors, alarm presentation, device grouping) |
| PRD — Patient card | PC-044 (thresholds come from clinical configuration), PC-143 (missing data) |
| intercept.ds `patient-monitor` (`1240:2210`) | The full monitor, View=Full, Size=md |
| DESIGN.md "PatientMonitoringCard" | How the monitor is built: waveforms, colors, alarms, device alarms, trends |

## 2. Users and use cases

| User | What they need from the monitor |
|---|---|
| **Tele-ICU nurse / intensivist** | Read a patient's vitals and rhythm remotely, see what's outside the limits and what the bedside has already acknowledged. |
| **Bedside nurse (on a video consult)** | See the same monitor the remote clinician is talking about. |

| Use case | Flow |
|---|---|
| **Check a patient** | Opens the patient's page; the monitor shows the live lanes with their limits. |
| **Work an alert** | Opens the alert; the monitor in the modal shows what set it off: the value outside its limits, its ▲ / ▼, and the device's alarm box. |
| **Look back an hour** | Switches to trends: each lane shows the parameter's last hour instead of its waveform. |

## 3. Anatomy

Four lanes, top to bottom: **II** (ECG), **Pleth** (SpO₂), **ABP**, **Resp**. Each lane:

| Part | What it shows |
|---|---|
| **Waveform** | The live trace, left of the numbers, with its label top left (II, Pleth, ABP, Resp). With trends, the parameter's last hour instead ("HR · 1 h", "SpO₂ · 1 h", "Sys · 1 h", "RR · 1 h"). |
| **Label row** | The parameter (HR, SpO₂, ABP, RR) in its color; for ABP, the mean pressure after it, "(77)"; the ▲ / ▼ mark when outside the limits; the unit on the right. |
| **Alarm limits** | Small, high over low, left of the value. |
| **Value** | The large number (ABP as systolic/diastolic), in the parameter's color, or in the device alarm's box. |

## 4. Requirements

### PMN-010 — Lanes

The four lanes are always shown, in the same order, with their labels at the same positions, for every patient (MON-070). Each parameter keeps one color across its label, waveform, number and trend (MON-072). The lanes share the monitor's height equally; a taller monitor gets taller lanes.

### PMN-011 — Waveforms

Each waveform sweeps left to right at the bedside's speed, paced by the patient's heart rate (ECG, pleth, ABP) or breathing rate (Resp). The traces are drawn from the numbers, not streamed (Requirements: "rendered client-side from numerics + rhythm"), so they're illustrative, never diagnostic. Without a rate, the lane is a flat line.

A lane draws only while it's on screen. When it comes into view, it shows a pulsing block for half a second, standing in for the stream connecting, then the trace. The numbers and alarms never wait for it.

### PMN-012 — Trends

With trends on, each lane shows the parameter's last hour instead of its waveform (ABP's is the systolic), beside the same numbers and limits. A missing series draws nothing. ⚠️ **Gap:** the trend lines don't draw the alarm limits.

### PMN-020 — Numbers

HR, SpO₂, ABP (systolic/diastolic, MAP in the label row) and RR, the largest text in the lane (MON-071). Numbers update in place without moving anything.

### PMN-021 — Missing values

A value that isn't coming in shows "--", never zero or blank (PC-143, BR-08). ABP shows "--" unless both systolic and diastolic are there. ⚠️ **Gap:** the monitor doesn't show a value's source or age, or mark it stale (SV-08); the surface around it does where it's needed.

### PMN-030 — Alarm limits

Each parameter's alarm limits come from the bed's device profile (SD-12, PC-044) and show beside its value, high over low.

- **One-sided limits.** A limit can have one side only, as profiles set them (RR above 30 only, MAP below 65 only). The side that's off never alarms and reads **OFF**, as on a bedside monitor; never blank or "--", which would read as missing data.
- **ABP** alarms on its systolic and on its MAP. The limits beside it are those of the pressure outside its limits; otherwise the systolic's (MAP's when the systolic has no limits at all).
- **Defaults.** A parameter the profile doesn't set takes common adult ICU limits (HR 50–120, SpO₂ 90–100, systolic 90–160, RR 8–30). A parameter it sets never falls back to a default, side by side. MAP has no default: it alarms only when the profile sets it. ⚠️ **Constraint:** the defaults are examples for the prototype, not configuration (PC-044).

### PMN-031 — Outside the limits

A value outside its limits gets a ▲ (above) or ▼ (below) in its label row, in the monitor's neutral ink. The parameter keeps its color, and the number doesn't move (MON-073, MON-014). The mark stays whatever else happens, so the side never depends on color.

### PMN-032 — Device alarms

When the bedside monitor alarms on a value, the value shows as the device shows it, by the alarm's priority from the device profile (AL-02): **high** white on red, flashing fast; **medium** black on yellow, flashing slowly; **low** black on cyan, steady (PRD Monitoring MON-014, the GE CARESCAPE conventions). Every alarm of a priority flashes in step. When ABP's systolic and MAP both alarm, the higher priority shows.

Once the bedside acknowledges the alarm (SD-15), the box clears and the ▲ / ▼ stays. Without a priority (no device profile), the value keeps its color and the ▲ / ▼ alone.

ℹ️ Device alarms are the device's, shown for awareness. The platform's alerts (severity, the alert bar and ring) are separate and never recolor a parameter (MON-073, AL-02).

⚠️ **Gap:** latching (a high alarm that stays until acknowledged after the value recovers), escalating priority and the alarm message text ("SpO₂ LOW") aren't shown.

### PMN-040 — Sizes

| Size | Where |
|---|---|
| **Default** | Patient details, the alert modal, the Comfortable Monitoring card. 240px tall unless the surface gives it more. |
| **Small** | The Compact Monitoring card: a narrower numbers column and smaller numbers. |

## 5. States

| State | What shows |
|---|---|
| **Live, within limits** | Waveforms sweeping, numbers in their colors, no marks. |
| **Outside a limit** | ▲ / ▼ in the label row (PMN-031). |
| **Device alarm** | The value in its priority's box, flashing for high and medium (PMN-032). |
| **Acknowledged at the bedside** | ▲ / ▼, no box. |
| **Limit off** | OFF in place of that side's number (PMN-030). |
| **Missing value** | "--"; a flat lane without a rate (PMN-021). |
| **Connecting** | A pulsing block in a lane for half a second as it comes on screen (PMN-011). |
| **Trends** | Each lane's last hour (PMN-012). |

## 6. Accessibility

- The monitor is a region named for the patient ("Bedside monitor, Sarah Miller"); each surface passes the name.
- The waveforms are decorative; the numbers carry the values.
- A value outside its limits is read with its side, "below alarm limits" (for ABP's mean, "mean pressure below alarm limits"), and its priority, "high priority alarm", so it never depends on color or the triangle.
- ⚠️ **Accessibility:** white on the device's red is 3.65:1, enough only for large bold text; the numbers are 18–24px semibold.

## 7. Motion

The waveforms sweep at the bedside's speed and the device alarm boxes flash at the device's rates (MOTION.md "Device alarm"). Under reduced motion the traces stand still and the boxes stay on.

## 8. Acceptance criteria

| ID | Criterion |
|---|---|
| PMN-AC-01 | Every surface that shows a patient's full bedside monitor uses this component, with the four lanes in the same order and colors (PMN-010). |
| PMN-AC-02 | A missing value shows "--", never zero (PMN-021). |
| PMN-AC-03 | Given RR limits "above 30 only", RR 6 shows no mark and the low limit reads OFF; RR 34 shows ▲ (PMN-030). |
| PMN-AC-04 | Given MAP limits "below 65 only", MAP 58 marks ABP ▼, ABP shows 65 over OFF, and screen readers hear "mean pressure below alarm limits" (PMN-030). |
| PMN-AC-05 | A parameter the profile sets never shows a default limit on either side (PMN-030). |
| PMN-AC-06 | A device alarm shows its priority's box until acknowledged at the bedside, then the ▲ / ▼ alone (PMN-032). |
| PMN-AC-07 | The Outside limits filters and Monitoring's List table flag the same values as the monitor (PMN-030, MON-013). |

## 9. Dependencies

| Dependency | Why |
|---|---|
| Device profiles (Simulator SD-12) | The alarm limits, one-sided ones included, and each alarm's priority. |
| Bedside acknowledgment events (SD-15) | Clearing the device alarm box. |
| The client's CARESCAPE configuration (SQ-13) | The real per-parameter priorities; the prototype's are illustrative. |

## 10. Open decisions

| ID | Question |
|---|---|
| PMN-OD-01 | The parameter palette is a draft (PRD Monitoring MON-OD-10); add it to Figma once agreed. |
| PMN-OD-02 | Which waveform set each patient gets (e.g. capnography in place of Resp), and whether temperature and EtCO₂ join as secondary numbers (PRD Monitoring, patient focus view). |
| PMN-OD-03 | Whether the trend lanes draw the alarm limits (PMN-012). |
| PMN-OD-04 | Whether the monitor shows device alarm latching and messages (PMN-032). |
| PMN-OD-05 | Figma: the small size and the OFF limit aren't drawn in intercept.ds `patient-monitor` yet. |
