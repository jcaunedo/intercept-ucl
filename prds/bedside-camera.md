---
requirements: [SV-07, SV-10, SV-12, CC-05, CC-07, CC-08, CC-09, CD-01, SC-01, SC-11, WF-02, WF-05, A-09]
status: proposed — confirm with Carlos
---

<!--
Created: Nov 3, 2026
Created by: Julio Caunedo
Last updated: Nov 6, 2026
Scope: The bedside camera of Intercept Live: one camera session in the patient's room, opened to look in (Live Camera), to call the bedside nurse into it (Video consult) or to huddle with the AI Scribe; where each opens, its states, data and acceptance criteria. Governs `patient-details/sections/camera-section.tsx` and the alert modal's consult (`alert-modal/alert-modal.tsx`).
Purpose: The specs describe one camera; the prototype built it twice, under three names. This PRD sets the one model the screens follow and lists what's still open.
-->

# PRD — Bedside camera

**Product:** Intercept Live — Virtual Care OS  
**Module:** Tele-Critical Care Clinical Surveillance (Spec §5.2, "Camera control and bedside audio-visual session"), with Care Coordination, Communication & Telepresence (Spec §5.3) and Clinical Documentation (Spec §5.4, the AI Scribe)  
**Name:** the **bedside camera**; a use of it is a **camera session**. In the UI: **Live Camera** (look in) and **Video consult** (call the bedside nurse in)  
**Surface:** Patient details › Camera view; the alert modal; a patient card's "…" menu  
**Version:** 0.1  
**Status:** Draft — pending clinical and product validation  
**Last updated:** November 6, 2026

---

## 1. Overview

Every room an Intercept clinician covers has a camera on the wall, with a microphone and a speaker. The remote clinician uses it to see the patient, the devices and whoever is at the bedside, and to talk to them. That is the spec's "bedside audio-visual session" (Spec §5.2), with the live values overlaid on the picture ("telemetry-and-camera fusion", SV-07).

The specs describe **one** camera and one kind of session. What changes is who the clinician brings into it:

| Experience | What the clinician does | Who's on it | Spec |
|---|---|---|---|
| **Live Camera** (look in) | Opens the room camera to see the patient and their devices; may talk into the room | The clinician; whoever is in the room | SV-07, SV-12, Spec §5.2; PRD Patient details PD-090 |
| **Video consult** | Calls the bedside nurse, then opens the same camera with her at the bedside | The clinician and the bedside nurse | Scenario 1 step 3 ("the hub intensivist opens video to the bedside RN"), SV-10 ("call bedside"); PRD Alert maximized modal AMM-013 |
| **Huddle** | A camera session with the AI Scribe listening, so the conversation becomes a draft note | The clinician, the bedside team, the AI Scribe | CD-01, WF-05 ("camera visit + scribe"); "huddle" itself is the prototype's name, not the spec's |

**Video consult is not a video conference.** The bedside nurse has no Intercept screen of her own: she "engages with the platform indirectly through their hospital's existing messaging system … and through bedside camera collaboration. Direct platform UI for the bedside nurse is on the long-term roadmap" (System spec, Hospital Bedside Nurse). So the clinician reaches her through the hospital's messaging, and they talk through the room's camera, with the patient and the monitors in view.

### 1.1 Out of scope

The specs have conference-style video too, for other people. They're separate experiences with their own PRDs to come, and this PRD only hands off to them.

| Experience | Who | How | Spec |
|---|---|---|---|
| **Specialist consult** | A specialist (tele-stroke, tele-cardiology…) | Telepresence on the hospital's mobile cart; requested → matched → accepted → in session → delivered → closed | Spec §5.3, §5.11; SC-01–SC-11; DU-27 |
| **Family update** | A designated family member, optionally the bedside RN | A secure audio-video link to their phones | CC-08 (Should, at most one scenario); client Slack notes |

### 1.2 Product objectives

| Objective | What it means for the camera |
|---|---|
| **One camera, one model** | Live Camera, Video consult and Huddle are the same session with the same controls; they differ only in who's called and whether the Scribe listens. |
| **See the patient and the numbers together** | The live values sit over the picture (SV-07), so the clinician doesn't look away from the room to read the monitor. |
| **Reach the bedside in one click** | From an alert or a card, one action calls the nurse and opens the room (Scenario 1 step 3). |
| **Never surprise the room** | The bedside team knows when the clinician is in camera (CC-05); audio is never unmuted on its own; recording is always visible, to both sides (Spec §5.4). |
| **Honest about the feed** | The session's state, its length and the hospital's limits (no two-way audio, no presets) are always said, never hidden. |

### 1.3 Source documents

1. Intercept Live — Virtual Care OS System Specification (`documents/Intercept Live - Virtual Care OS - System Specifications.md`): §5.2 (camera control and bedside audio-visual session, telemetry-and-camera fusion), §5.3 (telepresence, presence), §5.4 and §8.6 (AI Scribe, ambient capture and consent), §6.12 (Presence and Status), Hospital Bedside Nurse.
2. Requirements specification snapshot (`documents/specs/requirements-specification.md`): SV-07, SV-10, SV-12, CC-05, CC-07, CC-08, CC-09, CD-01, SC-01, SC-11, WF-02, WF-05, A-09.
3. Design update spec snapshot (`documents/specs/design-update-spec.md`): DU-27 (specialist consult), DU-28 (capture state; a live session marks the clinician busy).
4. Simulator specification snapshot (`documents/specs/simulator-specification.md`): prerecorded clips per bed and scene, presets switch clips, scribe transcript per scenario (E7, US7.1); SQ-09 (footage source).
5. InterceptLIVE Demo Use Cases (`documents/scenarios/`): Scenario 1 step 3 (one-click consult); Scenario 2 (consult on video, falls back to audio when the network drops).
6. PRD — Patient details (PD-014, PD-073, PD-090), PRD — Monitoring (MON-031), PRD — Alert maximized modal (AMM-013).

---

## 2. Users and use cases

| User | Use case |
|---|---|
| **Intercept intensivist or APP** | Looks in on a patient after an alert, with the vitals over the picture; calls the bedside nurse into the room to assess together (Scenario 1 step 3). |
| **Intercept RN** | Looks in on virtual rounds; talks to the patient or the nurse through the room speaker. |
| **Bedside nurse** (at the client hospital) | Gets the call through her hospital's messaging (CC-07), goes to the room and talks to the clinician through the camera. Not a user of Intercept's screens (roadmap). |
| **Patient and family in the room** | See that the clinician is in camera and when recording is on. |

---

## 3. Where it opens

| Entry point | Opens | Notes |
|---|---|---|
| Patient details › header › **Live Camera** | The Camera view section, session starting | ⚠️ **Gap:** the button only reports the action to the app; it doesn't open the Camera view yet |
| Patient details › Camera view › **Look in** (on the feed, while off) | The session, in place | The only way in today |
| Patient details › Camera view › **Start huddle** | The session with the AI Scribe | Starts the session first if it's off |
| Alert modal › footer › **Video consult** | The consult in the modal: calling the nurse, then the room | AMM-013 |
| A patient card's "…" › **Video consult** (Census and Monitoring, every card) | The alert modal with the call already ringing | ✅ **Resolved (Nov 4, 2026, user's call; CAM-012):** with no active alert, the same modal opens without an alert on it, the call already ringing |
| A camera session › **Request specialist** | The specialist consult (SC-01) | Out of scope (§1.1); not built |

---

## 4. Requirements

| ID | Requirement | Detail |
|---|---|---|
| CAM-001 | **One session** | Every experience is a camera session in the patient's room: off → connecting → live → ended. One session per clinician at a time; a live session marks them busy (DU-28). |
| CAM-002 | **The feed** | The room's camera, labeled with the bed ("Bed 11"), dark in both themes. While live: a Live dot and the session's running time ("Live · 03:12"). A text alternative says what the picture shows. |
| CAM-003 | **Telemetry over the picture** | On by default while live: the monitor's numerics, then each pump's drug and rate, then the ventilator's settings when ventilated (SV-07, Spec §5.2). **Overlay** turns it off to see the room unobstructed. Placement is MON-OD-07. |
| CAM-004 | **Presets** | Bed, Monitor, Pumps, Door, as the room's hardware allows (SV-12). The prototype switches prerecorded clips or reframes the drawn room (simulator US7.1). |
| CAM-005 | **Audio** | The session starts muted. **Talk** opens the clinician's microphone into the room; pressing it again mutes. Never unmuted on its own. Where the hospital doesn't allow two-way audio, the controls say "No two-way audio at {hospital}" instead of Talk. |
| CAM-006 | **Presence** | While live, the clinician shows as "In camera" (in a huddle, "In a huddle") to the bedside team and in the room's **Who's here** list (CC-05, Spec §6.12). |
| CAM-007 | **Call the bedside nurse** (Video consult) | Calls the patient's bedside nurse through the hospital's messaging (SV-10, CC-07): "Calling Kayla Brandt…", then "Kayla Brandt, RN" on the video (no "joined" since Nov 5, 2026) when she reaches the room, and the session goes live. The nurse's name, role, avatar and presence come from Presence and Status. |
| CAM-008 | **Huddle and the AI Scribe** | **Start huddle** starts the session if needed and turns on the AI Scribe. Under a one-party consent profile it listens at once; under all-party, it waits until consent is recorded for everyone ("AI Scribe waiting"). While on, its state and Pause / Stop stay on screen (CD-01, PD-073). Ending the huddle leaves a drafted note for the clinician to review and sign (WF-05). |
| CAM-008a | **AI Notetaker in a video consult** | Under the call in the alert panel: Start notetaker sends an approval request to every party on the call without a standing approval, and recording starts once they've approved (all-party consent, PD-073); then Capturing consultation, Preparing notes and Notes ready for review, an AI draft the clinician reviews, edits and approves. ✅ **Decision (Nov 3, 2026, user's call).** |
| CAM-009 | **Recording is visible to both sides** | While the Scribe captures, the clinician's screen says so at all times, and the room's camera screen shows a recording indicator the bedside team can see (Spec §5.4; DU-28 capture states). |
| CAM-010 | **End** | **End session** (or **End huddle**, or the consult's **End** / **End call**) stops the feed, mutes, stops the Scribe and clears "In camera". The screen says "The camera is off." |
| CAM-011 | **Session record** | Each ended session is listed under **Recent sessions**: Look in or Huddle, who, when, how long, and the Scribe's note (drafted or signed). The session also joins the patient's timeline events and the communication audit trail (PD-030, CC-09). |
| CAM-012 | **Video consult from any card** | A card's Video consult always opens the alert modal with the call already ringing. With an active alert, the alert is on it. ✅ **Resolved (Nov 4, 2026, user's call):** with no active alert (none, or only resolved ones), the modal opens without an alert: the patient (the name heads it and opens their page), their score, monitor and flags, and the Video consult panel open on the right, the call already ringing, with the AI Notetaker under it. The call runs in its tile (Cancel while it rings, End, then "Call ended" with Video consult to call again), and the panel stays open when it ends, so there's no Video consult / End call button under the patient. No lifecycle buttons and no pathway, as there's no alert to act on; the notetaker's draft says "No active alert". Replaces the proposal to open the patient's Camera view. |
| CAM-013 | **Synthetic feed only** | The prototype shows a drawn room or an AI-generated clip of fictional people, never a real patient (A-09, Brief). |
| CAM-014 | **Low bandwidth** | When the connection drops, the session falls back to audio only and says so, keeping the numerics (Scenario 2). ✅ **Built in the prototype (Nov 4, 2026), simulated:** in Scenario 2 the Alliance link drops 6 s after Dale Reynolds's consult goes live. The picture freezes, greyed, with "Connection weak · switching to audio only…" for 2.5 s, then the call goes on as audio (the nurse, "Audio only · time", Mute and End). A **Low-bandwidth mode** banner tops the Video consult panel (what dropped; audio only, vitals every 30 s, photos as they're taken; how long). The alert's monitor shows the last hour's trends instead of a streaming waveform, its numbers held and refreshed every 30 s, with "Low bandwidth: vitals every 30 s · updated 12 s ago" over it. Still photos the bedside sends (the BiPAP screen, then the blood gases) list under the call, newest first, with who took them, when and their readings. ⚠️ **Not built:** the network coming back, and the same held state on the patient's Monitoring card and page |
| CAM-015 | **Accessibility** | Every state change is announced ("In camera, Bed 11", "Talking into the room", "Muted", "The AI Scribe is listening", "The camera is off"). Toggle buttons say their state (`aria-pressed`). Presets are a named group. The overlay's values are text, not only picture. |
| CAM-016 | **Motion** | The feed and the call fade and rise in; the live view fades in over the ringing one; fades only under reduced motion; the clip holds its first frame (MOTION.md). |
| CAM-017 | **Incoming consult request** | A hospital can call the hub for a video consult (Scenario 2, step 1: Alliance's ED physician about Dale Reynolds). It rings as a toast over any page, 4 s after the patient's alert reaches their card in the prototype, until the intensivist answers or declines, whatever the toast rules (muted, Close all, hidden under a modal), showing who's calling, the patient, the reason in their words, the latest values and how long it has rung. **Answer** opens the patient's alert with the call already on; **Decline** ends it. It **rings** with a ringtone whose cadence says how urgent the caller says it is (CAM-018). ✅ **Built in the prototype (Nov 4, 2026):** AlertToast `consult-request` (intercept.ds `alert-toast` › Consult request, `1362:1607`). ⚠️ **Gap:** Decline only ends the call; handing the request to another intensivist, or telling the ED when someone will call back, isn't built. ⚠️ **Gap:** the answered call shows the bedside nurse, not the ED physician who called. |
| CAM-018 | **Ring cadence by urgency** | The request carries the caller's **urgency**: **High**, **Medium** or **Low**. Its ringtone (two soft notes, E5 then G♯5, the same notes and volume at every urgency) repeats faster the more urgent it is, so the urgency is heard before it's read: **High** every 0.55 s, its notes at double tempo (twice as fast as first built, user's call), **Medium** every 1.7 s, **Low** every 2.5 s. Low by default. It rings from the moment the request appears until it's answered or declined, over any page; browsers hold sound until the user has clicked or typed on the page, and the ring then starts at the next click or key. The ringtone adds to the toast's pulsing ring and its `alert` announcement, never replaces them. ✅ **Built in the prototype (Nov 4, 2026, user's call):** `useRingtone` (Web Audio, no sound file); Scenario 2's "Urgent video consult request" is High. |
| CAM-019 | **Call sound** | The video consult sounds like a call: a ringback while it calls the bedside, a chime when the nurse joins, the room while it's on (the bedside monitor beeping at the patient's live heart rate, its pitch falling with SpO₂, and the BiPAP breathing at their respiratory rate), a crackle and a falling tone when the connection drops, the room band-limited like a phone line while audio only (CAM-014), and a falling tone when the call ends. Mute silences it. ✅ **Built in the prototype (Nov 4, 2026, user's call):** synthesized (`call-audio.ts`), since the bedside clip has no sound. ⚠️ **Gap:** no voices. |

---

## 5. States

| State | Feed | Controls | Announced |
|---|---|---|---|
| **Off** | "The camera is off", **Look in** | Start huddle | — |
| **Connecting** | "Connecting…" | End session | "Connecting to the bedside camera" |
| **Calling** (Video consult) | The nurse ringing: her avatar, presence and activity, "Calling Kayla Brandt…" | Footer: "Calling…" (disabled) | — |
| **Live** | The room, Live · time, the overlay | End session · Talk · presets · Overlay · Start huddle | "In camera, Bed 11" |
| **Live, nurse on the call** (Video consult) | The room, "Kayla Brandt, RN" on the video (no "joined" since Nov 5, 2026), Live · time | Mute · End; footer: **End call** | — |
| **Huddle: waiting for consent** | As Live, "AI Scribe waiting" | Record consent · Stop | "The AI Scribe is waiting for consent" |
| **Huddle: listening / paused** | As Live, "AI Scribe on" / "AI Scribe paused" | Pause or Resume · Stop · End huddle | "The AI Scribe is listening" / "is paused" |
| **Low bandwidth** (CAM-014) | Frozen and greyed for 2.5 s ("Connection weak · switching to audio only…"), then audio only: the nurse, "Audio only · time" | Mute · End; a Low-bandwidth mode banner over the call; bedside photos under it | The banner, once: "Low-bandwidth mode" |
| **Incoming request: ringing** (CAM-017, CAM-018) | — (a toast over the page: who's calling, the patient, Reason, Latest values, how long it has rung) | **Decline** · **Answer** | Announced at once (`alert`); rings every 0.55 / 1.7 / 2.5 s for High / Medium / Low |
| **Camera off** (Video consult) | The room as before; the bedside no longer sees the clinician | Camera button pressed ("Turn on camera"); disabled while audio only ("Camera off for low bandwidth") | — |
| **No two-way audio** | As Live | "No two-way audio at {hospital}" in place of Talk | — |
| **Ended** | Off | A new row in Recent sessions | "The camera is off." / "Huddle ended. The camera is off." |

---

## 6. Data

| Field | What it is | Code |
|---|---|---|
| `room` | The room's label on the feed | `PatientCamera.room` |
| `presets` | Which presets the room's camera has (hardware) | `PatientCamera.presets` |
| `talk` | Whether the hospital allows two-way audio | `PatientCamera.talk` |
| `consent` | The hospital's recording consent profile: one-party or all-party | `PatientCamera.consent` |
| `people` | Who's in the room or on the chart now: name, role, presence, activity; the signed-in clinician marked | `PatientCamera.people` |
| `sessions` | The room's earlier sessions, newest first | `PatientCamera.sessions` |
| `bedside` | Who Video consult calls: the bedside nurse, with presence and where she is | `AlertDetailData.bedside` |
| `video` | The room's camera as a video URL; without one, or if it can't load, the room is drawn | `AlertDetailData.video` |
| Live values | The monitor, pumps and ventilator, for the overlay | The patient's record |
| `consultRequest` | An incoming request: its title, who's calling (name, role, site, photo), the question, the latest values, the **urgency** (`high` / `medium` / `low`, sets the ring cadence) and how long after the alert it rings | `TriageAlert.consultRequest` (`TriageConsultRequest`) |
| Actions | What the clinician did, reported to the app: start / end session, preset, talk, overlay, start huddle, scribe state | `CameraAction` |

---

## 7. Acceptance criteria

| ID | Given | When | Then |
|---|---|---|---|
| CAM-AC-01 | A patient's Camera view, off | The clinician clicks Look in | "Connecting…", then the room, Live · 00:00 counting, the overlay on, and the clinician "In camera" in Who's here |
| CAM-AC-02 | A live session | The clinician clicks Talk | The button reads Talking (pressed) and "Talking into the room" is announced; clicking again mutes |
| CAM-AC-03 | A hospital without two-way audio | The session is live | No Talk button; "No two-way audio at {hospital}" shows instead |
| CAM-AC-04 | A live session | The clinician picks the Monitor preset | The feed frames the monitor and the preset reads as picked |
| CAM-AC-05 | A hospital under all-party consent | The clinician clicks Start huddle | The session starts, the Scribe reads "AI Scribe waiting", and nothing is captured until consent is recorded |
| CAM-AC-06 | A huddle with the Scribe listening | The clinician ends the huddle | The camera is off, Recent sessions gains a Huddle row with "Note drafted" |
| CAM-AC-07 | Hayes's alert modal | The clinician clicks Video consult | "Calling Kayla Brandt…", then "Kayla Brandt, RN" on the video (no "joined" since Nov 5, 2026) over the room; the footer reads End call (AMM-AC-08) |
| CAM-AC-08 | Hayes's card "…" menu | The clinician picks Video consult | The alert modal opens with the call already ringing (AMM-AC-09) |
| CAM-AC-09 | A card for a patient with no active alert | The clinician picks Video consult | The alert modal opens without an alert, the patient's name as its heading, "Calling" their bedside nurse (e.g. "Calling Grace Holloway…" for Thomas Walker), then her name on the video; no alert panel and no button under the patient. Ending the call in the tile keeps the panel open, "Call ended" with Video consult |
| CAM-AC-10 | The patient page's header | The clinician clicks Live Camera | ⚠️ **Proposed:** the Camera view opens and the session starts |
| CAM-AC-11 | Scenario 2 starts | 4 s after Dale Reynolds's card shows his Critical alert | Dr. Brian Keller's request rings at the bottom right: "Urgent video consult request", the patient, Reason, Latest values, a counter from 0:00, Decline and Answer; no × |
| CAM-AC-12 | A High urgency request is ringing | The clinician listens | The ringtone repeats every 0.55 s, its notes at double tempo; a Medium one every 1.7 s, a Low one every 2.5 s, at the same notes and volume |
| CAM-AC-13 | A request is ringing | The clinician clicks Answer | The ringtone stops at once, and the patient's alert opens with the call already on |
| CAM-AC-14 | A request is ringing, toasts are muted and the alert modal is open | Close all is clicked | The request stays on screen, in front, and keeps ringing |

---

## 8. Open decisions

| Topic | Decision needed |
|---|---|
| ⚠️ **One name for looking in** | The PRD says **Look in** (PD-014, PD-090), the header says **Live Camera**, the feed's button says Look in, and the consult tile is labeled "Live camera". Pick one, in sentence case. Proposal: **Look in** for the action, **Camera view** for the section. |
| ⚠️ **"Consult" means two things** | The spec's consult is mostly the specialist consult (SC-*, DU-27). The nurse call is "Video consult". Once the specialist consult is built, the two sit side by side. Proposal: keep Video consult for the nurse call and name the other **Request specialist**, as SC-01 does; or rename the nurse call (e.g. **Call bedside**). |
| ⚠️ **Huddle has no spec source** | "Huddle team" (header and card menu) and "Start huddle" (Camera view) are the prototype's. Are they one action? Does Huddle team call several people into the room camera, or start a conference elsewhere (Teams, Spec §6.12)? |
| ⚠️ **Does the room see the clinician?** | The spec says "audio-visual session" but not whether the room's screen shows the clinician's face. If it does, the session needs a self-view and a camera on / off control. |
| ⚠️ **Privacy cue in the room** | The spec requires a recording indicator (§5.4) and "In camera" presence (CC-05), but not a chime or light when a session starts. Confirm with Intercept what the room shows. |
| ⚠️ **Who Video consult calls** | Always the bedside nurse, or a choice (charge nurse, local physician). Shared with AMM. |
| ⚠️ **The nurse doesn't answer** | No state yet for an unanswered or declined call. Proposal: after a set time, "Kayla Brandt didn't answer", with Try again, Message, and look in anyway. |
| ⚠️ **Two builds of one camera** | The Camera view and the alert modal's consult are separate code with different controls (the consult has Mute and End; no presets, overlay or Talk). Proposal: one camera component both use, so CAM-001 holds. |
| ⚠️ **Toasts during a session** | Alert toasts hide in the alert modal and on a patient's page, so a session there already hides them. Whether a session elsewhere should too, and whether a Critical toast for another patient may interrupt it (AL-02). |
| ⚠️ **Low-bandwidth fallback** | CAM-014 is built in the prototype for the alert's consult only (Nov 4, 2026). ✅ **Per call (Nov 4, 2026, user's call):** ending the call ends the mode; the next call starts on video and drops again if the connection is still bad. Still open: how often vitals come at low bandwidth (30 s is a placeholder), what restores video mid-call, and whether the Monitoring card and the patient's page show the held state too. |
| ⚠️ **Ringing: silence, ringtone, urgency source** | Whether the clinician can silence a ringing request without answering it; whether a hospital can set its own ringtone; who sets the urgency (the caller picks it, or the platform from the alert's severity); and whether High should also escalate if unanswered after a set time. |
| ⚠️ **Camera footage** | Whose clips the prototype uses (SQ-09, D-11). |
| ⚠️ **ID prefix** | `CAM-` and `CAM-AC-` are new repo-local IDs, to confirm with the team. |

---

## 9. Design and code

| What | Where |
|---|---|
| Camera view | `src/layouts/intercept-live/patient-details/sections/camera-section.tsx` (`CameraSection`, `RoomScene`, `RoomVideo`) |
| Video consult | `src/layouts/intercept-live/alert-modal/alert-modal.tsx` (the consult tile and the footer) |
| Card menu | `src/layouts/intercept-live/shared/patient-panel.tsx` (`patientCardActions`) |
| Call sound | `src/layouts/intercept-live/alert-modal/call-audio.ts` (`useCallAudio`) |
| Incoming request | `src/components/feedback/alert-toast/alert-toast.tsx` (`severity="consult-request"`, `urgency`, `ringtone`); `src/lib/hooks/use-ringtone.ts` (`useRingtone`, `ringCadence`); `src/layouts/intercept-live/shared/alert-toasts.tsx` |
| Opening with the call ringing | `src/layouts/intercept-live/patient-navigation.tsx` (`openAlert(id, alertId, { consult: true })`) |
| Sample data | `src/layouts/intercept-live/patient-details/sections/sample-camera.ts` (each hospital's presets, two-way audio and consent profile); `src/layouts/intercept-live/sample-data/sample-camera-video.ts` (the clip) |
| Figma | intercept.ds › Alert Modal page: `alert-modal-video` (State = Idle, Calling, Live). ⚠️ **Pending (Figma):** the Camera view isn't drawn |
| Decisions | DESIGN.md › "Alert modal" (Video consult); PRD Patient details §12; PRD Monitoring MON-031 |
| Stories | Layouts/Intercept Live/Alert modal (Default, In consult); Patient details; Monitoring › Scenario 1: Heart failure |
