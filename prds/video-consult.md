---
requirements: [SV-07, SV-10, CC-05, CC-07, CC-09, CD-01, CD-02, CD-03, CD-04, CD-05, CA-05, BR-10, WF-05, UX-06, A-09]
status: proposed — confirm with Carlos
---

<!--
Created: Nov 6, 2026
Created by: Julio Caunedo
Last updated: Nov 10, 2026
Scope: The video consult of Intercept Live as an experience: where it opens, the call in its tile, the AI Notetaker and its live transcript, the interpreter prompt, and the consult as one session across the alert panel and the patient's page. Governs the consult parts of `alert-panel/alert-panel.tsx` (`ConsultTile`, `useConsult`, `ConsultPanelContent`, `ConsultNotetaker`, `PatientConsultDialog`), `alert-panel/consult-transcript.tsx`, `consult-session.tsx`, `interpreter.tsx` and `patient-details/consult-panels.tsx`.
Purpose: PRD Bedside camera sets the camera session model; the video consult grew on top of it (notetaker, transcript, carry-over between places) without a spec of its own. This PRD writes down what the prototype does, the decisions behind it and what's still open.
-->

# PRD — Video consult

**Product:** Intercept Live — Virtual Care OS  
**Module:** Tele-Critical Care Clinical Surveillance (Spec §5.2, "Camera control and bedside audio-visual session"), with Clinical Documentation (Spec §5.4, §8.6, the AI Scribe) and Care Coordination (Spec §5.3)  
**Name:** **Video consult** (the UI's name everywhere); the AI that drafts its note is the **AI Notetaker**  
**Surface:** the alert panel's Video consult panel; the video consult without an alert (a dialog); the patient page's Video consult panel  
**Version:** 0.1  
**Status:** Draft — pending clinical and product validation  
**Last updated:** November 10, 2026

---

## 1. Overview

A video consult is the remote clinician calling the patient's bedside nurse and talking with her through the room's camera, with the patient and the monitor in view (Scenario 1, step 3: "the hub intensivist opens video to the bedside RN"; SV-10, "call bedside"). The nurse has no Intercept screen: the call reaches her through her hospital's messaging, and she answers at the bedside (PRD Bedside camera §1).

Around the call, the consult carries three things the clinician needs while talking: an **AI Notetaker** that captures the conversation once everyone has approved and drafts the consult note, a **live transcript** of what's being said, and the **thread** with the nurse and the **pathway** in a column beside it. The consult is one session per patient: started from an alert, it carries on to the patient's page and back.

This PRD builds on PRD Bedside camera and doesn't redefine what it owns:

| Topic | Owned by | This PRD |
|---|---|---|
| The camera session (off → connecting → live → ended), presence, presets, Talk | PRD Bedside camera CAM-001–CAM-006 | Uses it |
| Calling the bedside nurse | CAM-007 | How the call looks and runs in its tile (VID-001–VID-008) |
| The AI Notetaker's consent rule | CAM-008a | Everything else about the notetaker (VID-010–VID-019) |
| Recording visible to both sides | CAM-009 | The clinician's side (VID-017) |
| Video consult from any card, the consult without an alert | CAM-012 | What that dialog holds (VID-042) |
| Low bandwidth | CAM-014 | Only how the panel shows it (VID-007) |
| Incoming consult request, ring cadence | CAM-017, CAM-018 | Answering it opens the consult (§3) |
| Call sound | CAM-019 | Mute silences it (VID-005) |

### 1.1 Out of scope

| Experience | Why | Where |
|---|---|---|
| **Look in** (Live Camera) and **Huddle** | Camera sessions with nobody called, or with the AI Scribe on the Camera view | PRD Bedside camera; PRD Patient details PD-090 |
| **Specialist consult** | Telepresence with a specialist, its own request → matched → in session lifecycle | Spec §5.3, §5.11; SC-01–SC-11; DU-27 |
| **Family update** | A secure link to a family member's phone | CC-08; DU-26 |
| **The thread with the nurse** | Its messages, filter, replies and unread counts | PRD Messages (`prds/messages.md`); this PRD covers only where its column sits (VID-041) |
| **The pathway** | Its orders, decision, bundle, protocol, keep or transfer | PRD Alert maximized modal AMM-014, AMM-015; PRD Patient details (Pathway panel) |
| **Signing the note** | Notes, signature and write-back | CD-05, DU-24; PRD Patient details (Notes) |

### 1.2 Product objectives

| Objective | What it means for the video consult |
|---|---|
| **One click to the bedside** | From an alert, a card or the patient's page, one action calls the nurse and opens the room (Scenario 1 step 3). |
| **Talk, don't type** | The notetaker starts on its own and the transcript writes itself, so the clinician keeps their eyes on the patient; the note is a draft to review, not a form to fill. |
| **Consent before capture** | Nothing is recorded until everyone without a standing approval has approved (Spec §5.4, CD-01, CAM-008a). Capture is visible at all times and can be stopped in one click (CD-04). |
| **The clinician is the author** | The AI draft is marked as one and goes to the chart only after the clinician approves it, as a draft for signature (Spec §8.6, CD-03, CD-05). |
| **One consult, wherever the patient is shown** | The call, the notetaker, the transcript, the thread and the pathway go with the patient between the alert and their page, never restarting. |
| **No call out of sight** | Closing the place that shows the call ends it. |

### 1.3 Source documents

1. Intercept Live — Virtual Care OS System Specification (`documents/Intercept Live - Virtual Care OS - System Specifications.md`): §5.2 (camera control and bedside audio-visual session), §5.4 (ambient listening, consent and state compliance, opt-out, visible capture), §8.6 (AI Scribe; the clinician is the author of record), Hospital Bedside Nurse.
2. Requirements specification snapshot (`documents/specs/requirements-specification.md`): SV-07, SV-10, CC-05, CC-07, CC-09, CD-01–CD-05, CA-05, BR-10, WF-05, UX-06, A-09.
3. Design update spec snapshot (`documents/specs/design-update-spec.md`): DU-24 (note statuses and provenance), DU-28 (capture state; a live session marks the clinician busy), DU-32 (degraded network).
4. InterceptLIVE Demo Use Cases (`documents/scenarios/`), as the storyboards play them (`storyboards/`): Scenario 1 step 3 (one-click consult), Scenario 2 steps 1–2 (a consult request answered; the connection drops), Scenario 3 step 2 (interpreter in the room).
5. PRD Bedside camera (CAM-001–CAM-019), PRD Alert maximized modal (AMM-013, AMM-AC-08, AMM-AC-09), PRD Patient details (PD-014, PD-073, PD-090; Notes, Activity, Pathway panel).
6. DESIGN.md › "Intercept Live › Alert panel" (Video consult, AI Notetaker, Live transcript, Call sound, Low-bandwidth mode, Interpreter prompt, the clinician's own camera) and "Intercept Live › Patient details" (Video consult and Messages panels; the consult goes with the patient).

---

## 2. Users and use cases

| User | Use case |
|---|---|
| **Intercept intensivist or APP** | After an alert, calls the bedside nurse to assess the patient together, with the monitor beside the call (Scenario 1 step 3); answers a hospital's consult request (Scenario 2 step 1); talks while the notetaker drafts the consult note, then reviews, edits and approves it. |
| **Bedside nurse** (at the client hospital) | Gets the call through her hospital's messaging, answers at the bedside, approves the notetaker's request. Not a user of Intercept's screens (roadmap). |
| **Other people at the bedside** | A respiratory therapist, an NP, the patient or family speak on the call and show in the transcript by name and role (Scenario 2's RRT, Scenario 3's NP). |
| **Medical interpreter** | Joins the call when the patient's preferred language isn't English, so care decisions go through a qualified interpreter, not family (Scenario 3 step 2). |

---

## 3. Where it opens

| Entry point | Opens | The call when it opens | Notes |
|---|---|---|---|
| Alert panel › actions row › **Video consult** | The **Video consult** panel slides out right of the alert | Ringing | AMM-013. The button reads **Calling…** (disabled), then **End call** |
| A card's "…" › **Video consult**, patient with an active alert (Census and Monitoring, every card) | The alert panel, then its Video consult panel | Idle as the dialog comes in, ringing once it has (one `normal` motion beat), so the panel slides out as it does from the button | ✅ **Resolved (Nov 5, 2026, user's call).** Same from the Prototype menu's **Alert with video consult** and `?consult=1` |
| A card's "…" › **Video consult**, no active alert | The video consult without an alert (VID-042) | Ringing | CAM-012 |
| A consult request's **Answer** (toast) | The patient's alert panel with the Video consult panel open | Live at once, no ringing | CAM-017. ⚠️ **Gap:** the answered call shows the bedside nurse, not the ED physician who called (CAM-017) |
| A consult request's green video button, by the patient (toast) | The patient's page with its Video consult panel open | Live at once, no ringing | ✅ **Decision (Nov 9, 2026, user's call: "will answer all in Patient page instead of in alert modal"; intercept.ds `alert-toast` › Consult request `1458:11280`):** a second way to answer, "Answer on the patient's page"; the bottom Answer still opens the alert panel. CAM-017 |
| Patient page › app header › **Video consult** | The page's **Video consult** panel, right of the page (416px, full height) | Ringing at once | ✅ **Built (Nov 5, 2026, Intercept-Live `219:16129`).** While open the button is icon-only and pressed ("Close video consult", `video-off`); pressing it ends the call and closes the panel |
| Alert panel › the patient's name | The patient's page, the Video consult panel open | As it was (VID-040) | ✅ **Resolved (Nov 5, 2026, user's call)** |
| Patient page › Live Camera / Look in | The Camera view | — | Not a video consult: PRD Bedside camera |

---

## 4. Requirements

### 4.1 The call

| ID | Requirement | Detail |
|---|---|---|
| VID-001 | **One call per consult** | The call is **idle**, **connecting** (ringing the bedside), then **live**; ending it returns it to idle. It's a camera session in the patient's room (CAM-001) that calls the bedside nurse (CAM-007). Its tile is 352 × 248 at any width (Figma's), dark in both themes. |
| VID-002 | **Calling** | The tile shows who it calls: her avatar (online dot when online), "Kayla Brandt, RN", "Online · At the bedside", and "Calling Kayla Brandt…" with a spinner; the ringback plays (CAM-019). In the prototype it rings 4.5 s, then goes live (`CONNECT_DELAY_MS`; ✅ Nov 3, 2026, user's call). Where the tile runs the call (the patient page, the consult without an alert), **Cancel** ends it. ⚠️ **Gap:** in the alert panel there's no way to cancel while it rings: the tile has no Cancel and the actions row reads Calling… (disabled). ⚠️ **Gap:** no unanswered or declined state (CAM §8). |
| VID-003 | **Live** | The room's camera (a video, or the room drawn when there's none or it can't load; CAM-013). Top left: the Live dot with the call's running time ("Live · 3:12"), then the bed ("Bed 4"). Bottom left: who's on the call, her avatar and "Kayla Brandt, RN" (✅ **Resolved (Nov 5, 2026, user's call):** no "joined"). Bottom right: camera, mute, **End**. The timer starts as the call goes live. |
| VID-004 | **The clinician's own camera** | On video, the call's top right shows the clinician as the bedside sees them: the computer's camera, mirrored, a quarter of the call's width at 3:2. **Turn off camera** turns the device off and the picture leaves; **Turn on camera** brings it back. With no camera or no permission the box says so ("Your camera isn't available") and the call goes on. A control that's off shows a white icon on the call's dark overlay. ✅ **Resolved (Nov 4–5, 2026, user's calls).** |
| VID-005 | **Mute** | **Mute** / **Unmute** turns the clinician's microphone off and on: the call's sound is silenced (CAM-019) and the transcript stops capturing the clinician (VID-023). Every call starts unmuted, with the camera on. |
| VID-006 | **End, and call again** | The tile's **End** ends the call, with the end tone (CAM-019). In the alert panel, the actions row's **End call** (flat destructive) ends it too, and the Video consult panel closes. Where the tile runs the call (the patient page, the consult without an alert) the panel stays: the nurse, "Call ended" and **Video consult** to call again, the notes still coming. Closing the alert, going Back, opening another patient or pressing the app header's pressed Video consult ends the call: no call runs out of sight. ~~✅ **Resolved (Nov 6, 2026, user's call):** no Close button in the page panel's header; the app header's button does it.~~ ✅ **Decision (Nov 9, 2026, user's call):** the page panel's header has **×** after the notetaker's button, as Messages' panel; like the app header's pressed Video consult, it closes the panel and ends the call. |
| VID-007 | **Low bandwidth** | As CAM-014: the picture freezes, greyed ("Connection weak · switching to audio only…"), then the call goes on as audio ("Audio only · time", the nurse, "Video paused for low bandwidth"); the camera button is disabled ("Camera off for low bandwidth"). A **Low-bandwidth mode** banner expands in at the top of the Video consult panel. Per call: the next call starts on video (CAM §8). |
| VID-008 | **The call's record** | The call reports ringing, live and ended to the app (`onConsultChange`), which logs "Video consult with Kayla Brandt, RN" (Bedside camera, Bed 4) and "Video consult ended · Lasted 8 min" in the patient's Activity (PRD Patient details, Activity; CC-09). ⚠️ **Gap:** the consult without an alert and the patient page's panel don't report it, so those calls aren't in the Activity. ⚠️ **Risk (to verify):** the alert panel reports "ended" as it closes, even when the call carries on to the patient's page (VID-040). |

### 4.2 The AI Notetaker

| ID | Requirement | Detail |
|---|---|---|
| VID-010 | **On by default** | The notetaker starts on its own as the call connects, once per call: the approval request goes out as the call goes live (✅ **Resolved (Nov 5, 2026, user's call: "notetaker by default")**). It never records without the request (VID-011). Before the call connects it shows a quiet line: lucide `pencil-line` over "Getting ready…" (✅ Nov 6, 2026, user's copy; Intercept-Live `230:6416`). |
| VID-011 | **Approval before recording** | Starting sends an approval request to everyone on the call without a standing approval on file (by default the bedside nurse, who approves each time): **Waiting for approval**, "Recording starts once Kayla Brandt, RN approves." Recording starts once they have (2.5 s in the prototype, `CONSENT_DELAY_MS`). With nobody to ask, it records at once. **Cancel request** drops it, and it isn't sent again until the next call; **Start notetaker** sends it by hand (disabled until the call is live). ✅ **Resolved (Nov 3, 2026, user's call; CAM-008a):** no consent checkbox. ⚠️ **Gap:** the hospital's consent profile (one-party or all-party, CA-05, BR-10) doesn't drive who's asked, and the patient or family isn't asked (Spec §5.4: all-party states need "affirmative patient/family consent before audio capture begins"). ⚠️ **Gap:** what the nurse sees and taps to approve isn't drawn. |
| VID-012 | **Capturing** | The Live dot and **Capturing consultation**, "Listening and organizing your notes in real time.", with **Stop**. The transcript streams in under it (VID-020). |
| VID-013 | **Stop and resume** | **Stop** pauses capture in one click (CD-04): **Notetaker stopped**, "Nothing is captured until you resume.", with **Resume** and a **Prepare notes** link, which drafts the notes from what was captured without ending the call. The call goes on, uncaptured, and the transcript marks the gap (VID-024). ✅ **Resolved (Nov 5, 2026, user's call: "the user can stop and resume").** ⚠️ **Gap:** the spec's opt-out (a patient or family member asks that capture stop) ends capture for the encounter, "not resumed … without a renewed consent flow" (Spec §5.4, BR-10); Resume doesn't ask again, and there's no opt-out distinct from Stop. |
| VID-014 | **Preparing notes** | Ending the call while capturing or stopped, or Prepare notes, turns what was captured into a draft: **Preparing notes**, "Turning the consultation into a structured clinical summary.", a spinner (3 s in the prototype, `NOTES_DELAY_MS`). The transcript stays, stopped. |
| VID-015 | **Review the AI draft** | **Notes ready for review**, "Review, edit, and approve your draft notes." **Review notes** opens the draft in the transcript's place, marked "AI draft: review and edit before approving", in an editable field. The draft: who the consult was with, the alert ("No active alert." without one), the findings, the clinician's notes ("Clinician notes: …", VID-025) and the plan (the pathway "sent for local co-signature", or "continue monitoring"). ⚠️ **Gap:** the draft doesn't draw on the transcript, and isn't CD-02's structure (HPI, Exam, Assessment, Plan). |
| VID-016 | **Approve** | **Approve notes** (disabled while the draft is empty) locks the draft: "Approved by you · 3:42 AM. Added to the chart as a draft for signature." The app adds it to the patient's **Notes**, first in the list, as a draft for signature, marked AI-drafted, and logs "Consult note approved" in the Activity (PRD Patient details; CD-05, DU-24). Signing is Notes'. ⚠️ **Gap:** only the alert panel passes the approval to the app; approving on the patient page or in the consult without an alert shows the line, but nothing reaches Notes. ⚠️ **Decision needed:** the line says "Added to the chart", while Notes says "Nothing is saved to the chart until you review, edit and sign it" (§8). |
| VID-017 | **Capture is always visible** | While the notetaker waits, captures or is stopped, its state line stays on screen with its one action (Spec §5.4, §8.6; CD-01; PD-073). The room's recording indicator is CAM-009. ⚠️ **Not built:** the room side. |
| VID-018 | **Where its button sits** | In the alert panel and the consult without an alert, under the state line, with no Start notetaker (Nov 6, 2026, user's call). ⚠️ **Gap:** there, a cancelled request can't be restarted until the next call. On the patient page, in the Video consult panel's header (Intercept-Live `222:18365`): Start notetaker, Cancel request, Stop, Resume or Review notes by state; Prepare notes stays under the state line. |
| VID-019 | **One capture per consult** | Notes from an earlier call in the same session stay as they are: a new call doesn't start the notetaker again once there's a draft. ⚠️ **Gap:** a second call in the same consult can't be captured. |

### 4.3 The live transcript

| ID | Requirement | Detail |
|---|---|---|
| VID-020 | **Streams while capturing** | Under the state line, the conversation as speech recognition writes it: speaker turns, each with the speaker's name and role ("Kelly Ortiz, RN", "Rachel Lindgren, RRT") and a time in `mm:ss` since the notetaker first started on this consult ("00:42", as Whisper stamps segments), then the text. Words arrive at speaking pace; the newest two are muted while they're still being heard, and a misheard word ("cefa pine") is corrected as its segment ends. It follows the newest line unless the clinician scrolled up. It stays, stopped, while the notes are prepared and until Review notes opens the draft. ✅ **Resolved (Nov 5, 2026, user's call: "simulate transcription from video audio … similar to what Whisper does").** ℹ️ In the prototype the bedside's side is a script per patient (`sample-consult-transcript.ts`); the app gets its transcription service's segments. |
| VID-021 | **The clinician's words, from their microphone** | What the clinician says is transcribed from their microphone and shows as **You**: the phrase still being heard muted, then settled, stamped at the time they started it. While they speak, the bedside finishes its sentence and waits. ✅ **Resolved (Nov 5, 2026, user's call: "transcribe and add if I say something").** ⚠️ **Constraint:** the prototype uses the browser's speech recognition (Chrome sends the audio to Google's service); the product needs the platform's own transcription under its BAA (Spec §8.6, §9.1). |
| VID-022 | **Each microphone phrase is its own entry** | ✅ **Resolved (Nov 6, 2026, user's call):** what the clinician says into their microphone appears as **its own entry** from You in the transcript, with its own time, never appended to the transcript's previous line even when that line is also theirs; consecutive microphone phrases group into one entry until someone else speaks, a note is added or the notetaker is stopped. Check against `consult-transcript.tsx` (`Line.live`, the turn grouping). |
| VID-023 | **Muted or unavailable microphone** | Muted, the clinician isn't transcribed, and a line under the transcript says "You're muted. What you say isn't captured." Microphone blocked: "Allow the microphone to add what you say." No speech recognition: "Your microphone can't be transcribed in this browser." The rest of the call is still captured. |
| VID-024 | **Gaps are marked** | Stop cuts the sentence in progress with "…" and marks the gap between two rules: "Stopped at 01:12", then "Not captured · 01:12–01:40" once resumed. |
| VID-025 | **Add a note** | An **Add a note** field is pinned to the Video consult panel's bottom (Intercept-Live `230:6415`; intercept.ds `alert-modal` › Messages `1375:8218`), on the patient page, in the alert panel and in the consult without an alert, shown while the call is live or the transcript shows, not while reviewing the draft; **Add** appears once there's text. A note joins the transcript at its time as **Your note** (lucide `pencil-line`), apart from what was said, and goes into the draft (VID-015). ✅ **Decision (Nov 9, 2026, user's call):** the alert panel and the consult without an alert have the field too, the same as the patient page (it was a ⚠️ gap). |
| VID-026 | **Nothing yet** | While capturing with nothing heard, "Listening…"; stopped with nothing captured, "Nothing was captured." |

### 4.4 Interpreter

| ID | Requirement | Detail |
|---|---|---|
| VID-030 | **Interpreter prompt** | When the patient's preferred language isn't English, as soon as the call is live, under the call: "**Rosa prefers Spanish.** Add a medical interpreter to the call?" with **Add interpreter**; then "Connecting a Spanish interpreter" (3 s in the prototype), then "Lucía Herrera joined the call", "Medical interpreter, Spanish", with **Remove**. × dismisses the prompt. A qualified medical interpreter, not family (Scenario 3 step 2). Ending the call takes the interpreter off; the next call offers one again. ⚠️ **Mock**, as the scenario marks it. |
| VID-031 | **The interpreter on the call** | ⚠️ **Gap:** the interpreter isn't in the call's picture or sound, only in the panel and the transcript. ⚠️ **Gap:** the sample transcript has the interpreter speaking whether or not one was added. ⚠️ **Gap:** a dismissed prompt stays dismissed for the rest of the consult session, not just that call. |

### 4.5 One consult across places

| ID | Requirement | Detail |
|---|---|---|
| VID-040 | **The consult session** | A patient's consult is one session across the places that show it: the alert panel, the consult without an alert and the patient page's panels. Whichever shows the patient next picks it up where it was: the call (state, running time, mute, camera), the notetaker (state, request, draft, approval, the clinician's notes, a note not yet added), the transcript, the interpreter, the thread (messages, what was read, Messages open or closed) and the pathway (open or closed, work in progress). Clicking the name in the alert panel opens the page with the Video consult panel open and the call still live, not ringing again, and Messages as they were; it works the other way too. The newest place owns the session, so the one fading out can't undo anything; the session ends when the last place showing it goes. ✅ **Resolved (Nov 5, 2026, user's call: "the call and chat, open or close, should pass over"; Pathway Nov 6, 2026).** ⚠️ **Constraint:** keep this state in the session (`useSessionState`), never in component state, or the handoff breaks silently (DESIGN.md). |
| VID-041 | **The third column** | Right of the Video consult panel, **Messages** and **Pathway** share one column, one at a time, so the alert never grows to four columns. Both buttons sit in the actions row with Video consult (Video consult, Messages, Pathway), and Messages is there with or without a call and stays when the call ends. A new message from the bedside opens Messages on its own, in Pathway's place, without moving focus. On the patient page the same three are panels right of the page, opened from the app header. The thread itself is PRD Messages. |
| VID-042 | **The consult without an alert** | What a card's Video consult opens when the patient has no active alert (CAM-012): the patient's name as the heading (it opens their page), the actions row (Video consult, Messages, Pathway), their score, monitor and flags, and the Video consult panel always open with the call ringing and the notetaker under it. ~~Pathway says "No care pathway", "Pathways are suggested with an alert. Thomas has no active alert.", or shows the care plan an earlier alert put in force, read-only.~~ ✅ **Decision (Nov 10, 2026, user's call):** no Pathway here, as on the alert panel (intercept.ds `alert-modal` `1355:14776`): Video consult and Messages right of the name; the care plan is on the patient's page. No lifecycle buttons. ✅ **Resolved (Nov 4–6, 2026, user's calls).** |

### 4.6 Accessibility and motion

| ID | Requirement | Detail |
|---|---|---|
| VID-050 | **Accessibility** | The call is a region named "Video consult". Calling, Call ended and the freeze are status messages; so are the notetaker's state line, the interpreter prompt, the low-bandwidth banner and the approval line. Camera and Mute are toggle buttons that say their state (`aria-pressed`, "Turn off camera" / "Turn on camera", "Mute" / "Unmute"); the app header's Video consult says it's expanded and reads "Close video consult" while open. The room's picture has a text alternative ("Live camera, Bed 4"), and so does the clinician's own camera. The transcript is a log named "Live transcript" that isn't read word by word as it streams (`aria-live="off"`) but can be focused and read. The draft is a labeled field ("Draft consult note"); Add a note is labeled "Add a note to the consult". On the patient page, focus moves to the panel's title once it's open. |
| VID-051 | **Motion** | The panel slides out as its width grows (the alert panel's side panels; the patient page's `enterTransition`); the call's states fade one into the next, so the tile never changes size; the clinician's camera fades in and out; the notetaker's states fade; the draft rises in (Reveal); the low-bandwidth banner expands in (Expand); transcript turns fade in; Live dots use the Live pattern. Under reduced motion: fades only, spinners and the Live dot still (MOTION.md). |

---

## 5. States

### 5.1 The call

| State | Tile | Controls | Announced |
|---|---|---|---|
| **Idle, never called** | Not shown in the alert panel (the panel opens with the call) | Actions row: **Video consult** | — |
| **Calling** | The nurse, presence and activity, "Calling Kayla Brandt…", ringback | Tile: **Cancel** (patient page, consult without an alert). Actions row: **Calling…** (disabled) | "Calling Kayla Brandt…" |
| **Live** | The room, "Live · 3:12", the bed, the nurse's name, the clinician's own camera | Camera · Mute · **End**; actions row: **End call** | — |
| **Live, camera off** | As Live, without the clinician's camera | Camera pressed ("Turn on camera") | — |
| **Live, muted** | As Live | Mute pressed ("Unmute"); the transcript's "You're muted" line | — |
| **Connection dropping** | The picture frozen and greyed, "Connection weak · switching to audio only…" (2.5 s) | As Live | "Connection weak · switching to audio only…" |
| **Audio only** | The nurse, "Audio only · time", "Video paused for low bandwidth"; the Low-bandwidth mode banner over the call | Camera disabled · Mute · **End** | The banner |
| **Call ended** (patient page, consult without an alert) | The nurse, "Call ended" | **Video consult** to call again | "Call ended" |

### 5.2 The AI Notetaker

| State | Title and text | Action | Transcript |
|---|---|---|---|
| **Getting ready** (idle) | `pencil-line`, "Getting ready…" | None in AlertModal (the alert panel and the consult without an alert; Nov 6, 2026, user's call: it starts on its own as the call connects). On the patient page: Start notetaker (disabled until live), in the panel's header | — |
| **Waiting for approval** | "Waiting for approval", "Recording starts once Kayla Brandt, RN approves." (medium weight) | Cancel request | — |
| **Capturing** | Live dot, "Capturing consultation", "Listening and organizing your notes in real time." | Stop | Streaming |
| **Stopped** | "Notetaker stopped", "Nothing is captured until you resume.", Prepare notes | Resume | Held, "Stopped at 01:12" |
| **Preparing notes** | Spinner, "Preparing notes", "Turning the consultation into a structured clinical summary." | — | Held |
| **Notes ready** | "Notes ready for review", "Review, edit, and approve your draft notes." | Review notes | Held |
| **Reviewing** | "AI draft: review and edit before approving", the editable draft | Approve notes | Hidden, kept |
| **Approved** | "Approved by you · 3:42 AM. Added to the chart as a draft for signature." The draft read-only | — | Hidden, kept |

---

## 6. Data

| Field | What it is | Code |
|---|---|---|
| `bedside` | Who the call reaches: name, role, initials, photo, tone, presence, activity ("At the bedside") | `AlertDetailData.bedside` |
| `notetakerParties` | Who the notetaker asks besides the clinician, and whether each has a standing approval (`autoApprove`). Without it, the bedside nurse, asked each time | `AlertDetailData.notetakerParties` |
| `transcript` | The call's transcription: `speakers` (`id`, `name`, `you`) and `segments` (`speaker`, `text`, `heard` (first guess), `pause`) | `ConsultTranscript` (`consult-transcript.tsx`) |
| `room`, `video` | The room's equipment for the drawn room; the room camera's video URL | `AlertDetailData.room`, `.video` |
| `connection` | The consult's connection: `video` or `low-bandwidth`, since when, the site, how often vitals come, the bedside's photos | `ConsultConnection` (`low-bandwidth.tsx`) |
| `patient.preferredLanguage`, `interpreter` | The patient's preferred language; who the interpreter service sends (name, role, initials, tone) | `AlertDetailPatient`, `ConsultInterpreter` |
| `messages`, `scriptedReplies` | The thread with the nurse; the prototype's simulated replies | PRD Messages |
| Patient consult | Everything above for a patient without an alert, by patient | `PatientConsultData` |
| Consult notes | The clinician's notes during the consult (`id`, `text`), stamped in the transcript | `ConsultNote` |
| Call state | `idle` / `connecting` / `live`, reported with the alert and its detail | `AlertConsultState`; `onConsultChange(alertId, state, detail)` |
| Approved note | The approved draft's text, with the alert and its detail; the app keeps the consult's start time as the note's session time | `onConsultNote(alertId, note, detail)`; Notes' `scribe.sessionAt` |
| Session | The consult's state by patient (call, notetaker, transcript, interpreter, Messages and Pathway) | `ConsultSessionProvider`, `ConsultSessionScope`, `useSessionState` (`consult-session.tsx`) |

---

## 7. Acceptance criteria

| ID | Given | When | Then |
|---|---|---|---|
| VID-AC-01 | Hayes's alert panel | The clinician clicks Video consult | The Video consult panel slides out; "Calling Kayla Brandt…" with the ringback; about 4.5 s later the room, "Live · 0:00" counting and "Kayla Brandt, RN"; the actions row reads End call (AMM-AC-08) |
| VID-AC-02 | The call goes live | — | The notetaker reads "Waiting for approval", "Recording starts once Kayla Brandt, RN approves.", then "Capturing consultation", and the transcript starts streaming |
| VID-AC-03 | The notetaker is waiting for approval | The clinician clicks Cancel request | It returns to idle and doesn't ask again during this call; on the patient page Start notetaker shows, in AlertModal no button does |
| VID-AC-04 | The notetaker is capturing | The clinician says two sentences into the microphone, after a line of their own from the transcription | Their words show as a new You entry with its own time, not appended to the line before; both sentences sit in that one entry until the nurse speaks |
| VID-AC-05 | The notetaker is capturing | The clinician clicks Mute and speaks | Nothing they say is added; "You're muted. What you say isn't captured." shows under the transcript; the call's sound is silent |
| VID-AC-06 | The notetaker is capturing | The clinician clicks Stop, waits, then Resume | The sentence in progress ends with "…"; "Stopped at 01:12" while stopped; "Not captured · 01:12–01:40" once resumed, and capture goes on |
| VID-AC-07 | The notetaker is stopped | The clinician clicks Prepare notes | "Preparing notes" while the call goes on, then "Notes ready for review" |
| VID-AC-08 | The notetaker is capturing | The clinician clicks End | The call ends and the notes are prepared from what was captured |
| VID-AC-09 | Notes are ready | The clinician clicks Review notes, edits a line and clicks Approve notes | The draft is read-only, "Approved by you · time. Added to the chart as a draft for signature."; in the alert panel, the note is first in the patient's Notes as a draft for signature and the Activity says "Consult note approved" |
| VID-AC-10 | The patient page's Video consult panel, capturing | The clinician types a note and clicks Add | "Your note" appears in the transcript at its time; the next microphone phrase starts a new You entry; Review notes shows it under "Clinician notes" |
| VID-AC-11 | A live call in the alert panel, Messages open | The clinician clicks the patient's name | The patient page opens with the Video consult panel open, the call live with its timer running, not ringing again, the notetaker and transcript as they were, and Messages open |
| VID-AC-12 | The patient page, Video consult panel open, call live | The clinician presses the app header's Video consult ("Close video consult") | The call ends and the panel closes |
| VID-AC-13 | The patient page, call live | The clinician clicks End in the tile | The panel stays: "Call ended" with Video consult; the notes are prepared |
| VID-AC-14 | Rosa Medina's alert (Scenario 3) | Her video consult goes live | "Rosa prefers Spanish. Add a medical interpreter to the call?"; Add interpreter shows connecting, then "Lucía Herrera joined the call", "Medical interpreter, Spanish" |
| VID-AC-15 | A card for a patient with no active alert | The clinician picks Video consult | The consult without an alert opens, ringing; once live the notetaker asks for approval; Pathway says "No care pathway"; the draft says "No active alert." (CAM-AC-09) |
| VID-AC-16 | A consult request is ringing (Scenario 2) | The clinician clicks Answer | Dale Reynolds's alert opens with the Video consult panel open and the call already live; the notetaker sends its request (CAM-AC-13) |
| VID-AC-17 | A live call | The clinician clicks Turn off camera | Their own camera's picture fades out and the device's light goes off; the button reads Turn on camera, pressed |
| VID-AC-18 | Reduced motion is on | The panel opens and the call goes live | Everything fades in place; the Live dot and spinners are still |

---

## 8. Open decisions

| Topic | Decision needed |
|---|---|
| ⚠️ **AI Notetaker or AI Scribe** | The consult calls it the AI Notetaker; Notes, the spec (§8.6) and PRD Bedside camera say AI Scribe ("Drafted by AI Scribe from the camera session"). One name, or the Notetaker as the Scribe's name inside a video consult (glossary). Shared with PRD Patient details. |
| ⚠️ **"Added to the chart"** | The approval line says the note was added to the chart; Notes says nothing is saved to the chart until it's signed. Proposal: "Added to Notes as a draft for signature." |
| ⚠️ **Consent by profile** | Who gets the approval request: today the parties on the call without a standing approval. The spec ties it to the hospital's consent profile (CA-05, BR-10) and, in all-party states, to the patient or family. Who asks the patient, and how it's recorded in the audit trail? |
| ⚠️ **Opt-out vs Stop** | Stop and Resume are the clinician's pause. A patient's or family's opt-out ends capture for the encounter until consent is renewed (Spec §5.4). Does it need its own action and state? |
| ⚠️ **What the draft is built from** | Today: who, the alert, findings, the clinician's notes and the plan. CD-02 asks for HPI, Exam, Assessment, Plan from the session's transcript plus chart context. |
| ⚠️ **Approval and the record outside the alert** | The patient page and the consult without an alert don't pass the approved note or the call's start and end to the app (VID-008, VID-016). Wire them, or say the note stays in the consult. |
| ⚠️ **Cancel while ringing in the alert panel** | Only closing the alert stops a ringing call there. Proposal: Cancel in the tile, as on the patient page. |
| ⚠️ **A second call, a second capture** | Once there's a draft, a new call in the same session isn't captured (VID-019). Append to the draft, start a second note, or ask? |
| ⚠️ **Microphone transcription** | The prototype's browser speech recognition sends audio to a third party. The product's transcription service, and where the clinician's audio is processed, need a decision before any real use. |
| ⚠️ **Interpreter on the call** | Whether the interpreter joins the picture and sound, and where the interpreter service's request is made (Scenario 3 marks it mock). |
| ⚠️ **End label** | Figma's `alert-expanded-video` (`1352:12702`) reads End video consult; code says End call (Nov 2, 2026, user's call). |
| ⚠️ **ID prefix** | `VID-` and `VID-AC-` are new repo-local IDs, to confirm with the team. |

---

## 9. Design and code

| What | Where |
|---|---|
| The call | `src/layouts/intercept-live/alert-panel/alert-panel.tsx` (`ConsultTile`, `SelfView`, `useConsult`, `ConsultButton`, `CONNECT_DELAY_MS`, `FREEZE_MS`) |
| Video consult panel | `alert-panel.tsx` (`ConsultPanelContent`; `AlertPanelContent`'s `panels`) |
| AI Notetaker | `alert-panel.tsx` (`ConsultNotetaker`, `notetakerCopy`, `draftConsultNote`, `NOTES_DELAY_MS`, `CONSENT_DELAY_MS`) |
| Live transcript | `src/layouts/intercept-live/alert-panel/consult-transcript.tsx` (`ConsultTranscriptView`, `useMicTranscript`, the turn grouping) |
| Interpreter | `src/layouts/intercept-live/alert-panel/interpreter.tsx` (`InterpreterPrompt`) |
| Low bandwidth, call sound | `alert-panel/low-bandwidth.tsx`; `alert-panel/call-audio.ts` (`useCallAudio`) |
| Consult session | `src/layouts/intercept-live/alert-panel/consult-session.tsx` |
| Consult without an alert | `alert-panel.tsx` (`PatientConsultDialog`; `alertPanelRenderer`'s `consults`) |
| Patient page | `src/layouts/intercept-live/patient-details/consult-panels.tsx` (`PatientConsultPanels`); the app header's Video consult, `src/components/navigation/app-header/app-header.tsx` (`onVideoConsult`, `videoConsultOpen`) |
| Opening it | `src/layouts/intercept-live/patient-navigation.tsx` (`openAlert(id, alertId, { consult })`); `shared/patient-panel.tsx` (`patientCardActions`); `shared/alert-toasts.tsx` (Answer) |
| The record | `src/layouts/intercept-live/sample-data/use-sample-live-feed.ts` (`onConsultChange`, `onConsultNote`: Activity and Notes) |
| Sample data | `alert-panel/sample-consult-transcript.ts` (a script per patient, Scenarios 1–4 and Sarah Miller); `alert-panel/sample-alert-panel.ts` (bedside, interpreter, patient consults) |
| Figma | intercept.ds › `alert-modal` Video (`1355:14797`); `alert-modal-video` (`1316:89`, State = Idle, Calling, Live). Intercept-Live "Video and Messages Interations" (`219:16129`): Start notetaker (`222:18365`), Add a note (`230:6415`), the notetaker's empty state (`230:6416`). ⚠️ **Pending (Figma):** the transcript, the stopped state, the draft review, the clinician's own camera, the interpreter prompt and the consult without an alert aren't drawn; remove the × from `222:18365` |
| Decisions | DESIGN.md › "Intercept Live › Alert panel" (AlertModal's replacement entry, Video consult, Live transcript, Low-bandwidth mode, the clinician's own camera, Call sound, Interpreter prompt) and "Intercept Live › Patient details" (Video consult and Messages panels) |
| Stories | Layouts/Intercept Live/Alert panel (Default, In consult, Interpreter); Patient details (Video consult and messages); the Prototype menu's Scenarios 1–3 and Alert with video consult |
