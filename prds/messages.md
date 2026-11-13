---
requirements: [CC-01, CC-02, CC-03, CC-04, CC-09, WF-02, WF-06, HO-01, UX-03, UX-06, UX-09]
status: proposed — confirm with Carlos
---

<!--
Created: Nov 6, 2026
Created by: Julio Caunedo
Last updated: Nov 13, 2026
Scope: Messages in Intercept Live: the clinician's thread with a patient's bedside nurse, bridged through the hospital's messaging. Covers where it opens (the alert panel, the patient consult, the patient page), the thread, the composer, unread counts, the filter, bedside photos, and the Sidebar's Messages page (not built). Governs `alert-panel/consult-messages.tsx`, the Messages column in `alert-panel/alert-panel.tsx` and the Messages panel in `patient-details/consult-panels.tsx`.
Purpose: Messages was built on Nov 5–6, 2026 from decisions recorded only in DESIGN.md and code comments. This PRD sets the product rules in one place and lists what's still open.
-->

# PRD — Messages

**Product:** Intercept Live — Virtual Care OS  
**Module:** Care Coordination, Communication & Telepresence (Spec §5.3), on the Messaging service (Spec §6.11)  
**Name:** **Messages**. One patient's conversation with the bedside is the patient's **thread**  
**Surface:** The alert panel's third column; the patient consult (no alert); Patient details › Messages panel, opened from the app header; Sidebar › Messages  
**Version:** 0.1  
**Status:** Draft — pending clinical and product validation  
**Last updated:** November 13, 2026

---

## 1. Overview

Messages is how the Intercept clinician writes to a patient's bedside nurse and reads her answers, without leaving the patient.

**Messages is a bridged thread, not an Intercept chat on both ends.** The bedside nurse has no Intercept screen. She "engages with the platform indirectly through their hospital's existing messaging system (Epic Secure Chat, Cerner Secure Messaging, TigerConnect) and through bedside camera collaboration. Direct platform UI for the bedside nurse is on the long-term roadmap" (System spec §3.11, Hospital Bedside Nurse). The spec's answer is to "bridge those systems on the back end and present the collated stream inside the Provider Desktop", with "per-hospital reply routing handled automatically" (Spec §5.3). So the nurse reads and writes in her hospital's tool, and the clinician sees the same thread in Intercept.

| Part | What it is | Spec |
|---|---|---|
| **Thread** | One patient's messages between the clinician and the bedside, oldest first: the bedside nurse, anyone else at the bedside who writes (e.g. a respiratory therapist), the clinician, and the photos the bedside sends | CC-02, WF-06 |
| **Bridge** | The thread reaches the nurse through her hospital's messaging, and her replies come back the same way | Spec §5.3, §6.11; CC-02 |
| **Unread** | A count on each Messages button and a dot on the Sidebar's Messages, for bedside messages the clinician hasn't seen | CC-03 |
| **Bedside photos** | Still photos from the bedside (a device's screen, a blood gas printout), sent as they're taken when video can't carry the picture | Demo Use Cases, Scenario 2 step 2; PRD Bedside camera CAM-014 |
| **Inbox** (Sidebar › Messages) | Every thread, from every hospital in the clinician's scope, in one place | CC-01, CC-03, CC-04. ⚠️ **Not built** |

### 1.1 Out of scope

| Experience | What it is | Where it belongs |
|---|---|---|
| **Ask Intercept Live** | The AI chat. It asks the agent; Messages goes to people | PRD Chat composer (`prds/chat-composer.md`), whose CC-OD-06 asks whether a people thread reuses `ChatComposer` |
| **Family messaging** | A family question in, an AI-drafted reply the clinician accepts, edits or refuses, with an optional video invite | CC-08 and WF-08 (Should, only if chosen as a scenario, D-12); client Slack notes, Idea 1. The Monitoring card's family message icon and the Family messages sort count these (PRD Monitoring), not the bedside thread. Its own PRD, to come |
| **Team chat** (Microsoft Teams) | Talking with other Intercept clinicians | The spec names Teams only as a presence target (Spec §5.3, §6.12) and as today's handoff tool (Spec §3.3), not as a feature. Huddle team has no spec source (PRD Bedside camera §8) |
| **Group threads** | Threads with the hospitalist, residents and APCs, created by Support Coordinators (Spec §5.3 "Group-chat orchestration"); PD-091's care team threads | The Messages page (MSG-018), later |
| **The video consult** | The call to the bedside nurse through the room's camera | PRD Video consult (`prds/video-consult.md`, being written) and PRD Bedside camera |
| **Bedside tasks and the nurse's phone view** | Tasks shared by the bedside and the hub; a phone-style view of a task or nudge | CC-06, CC-07, DU-25; the Scenario 3 exploration (`alert-panel/bedside-tasks.tsx`) |
| **Voice and calls** | VOIP and call queues | Spec §5.3, §6.13 |

### 1.2 Product objectives

| Objective | What it means for Messages |
|---|---|
| **One thread per patient, wherever the patient is** | The thread on the alert panel and on the patient page is the same thread, with the same messages, draft and read state (MSG-013). |
| **Reach the bedside without leaving the alert** | Messages sits in the alert's actions row, next to Video consult and Pathway, with or without a call (WF-02 "message bedside"). |
| **Notice without alarm** | Unread messages show in the brand color on the calm Unread pattern, never in a severity color or on the Urgency clock (MOTION.md). |
| **Never take the clinician's focus** | A new bedside message opens the thread where it can be seen, but keyboard focus stays where the clinician left it. |
| **Say who and when** | Every message shows who sent it and how long ago; a photo shows what it is and its readings (UX-03). |

### 1.3 Source documents

1. Intercept Live — Virtual Care OS System Specification (`documents/Intercept Live - Virtual Care OS - System Specifications.md`): §3.11 (Hospital Bedside Nurse), §5.3 (multi-hospital messaging consolidation, bridge-and-collate, prioritization, group chat, audit trail), §6.11 (Messaging), §6.12 (Presence and Status).
2. Requirements specification snapshot (`documents/specs/requirements-specification.md`): CC-01 to CC-04, CC-09; WF-02, WF-06; HO-01; UX-03, UX-06, UX-09; §8 data model (Message / Thread); Q-09.
3. Design update spec snapshot (`documents/specs/design-update-spec.md`): DU-25 (out of scope here), DU-31 (handoff: unresolved messages); §2 platform rules (provenance, generic source labels).
4. Simulator specification snapshot (`documents/specs/simulator-specification.md`): §5 Hospital messaging (Should); E7 US7.2 (scripted bedside messages and replies routed per hospital channel). `simulator-requirements.md` SQ-10 (bedside message types and volume).
5. InterceptLIVE Demo Use Cases (`documents/scenarios/`): Scenario 2 step 2 (still photos of the BiPAP screen and the next ABG, sent as they're taken).
6. PRD — Patient details (PD-091, PD-OD-11), PRD — Bedside camera (CAM-014), PRD — Monitoring (escalation to the bedside charge nurse "through Messages", MON-OD-08), PRD — Chat composer (CC-OD-06).
7. DESIGN.md: "Alert panel" › Messages; "AppHeader" (Messages on the patient header; no Messages on Default); "Sidebar" › Unread dot; Patient details › "Video consult and Messages panels". MOTION.md: Unread.

---

## 2. Users and use cases

| User | Use case |
|---|---|
| **Intercept intensivist or APP** | Writes to the bedside nurse from an alert ("Can you recheck the lactate?") and reads her answer beside the alert; during a low-bandwidth consult, reads the photos the bedside sends (Scenario 2). |
| **Intercept Critical Care RN** | Messages the bedside nurse about a patient (Requirements §4, roles: the RN can message). |
| **Bedside nurse** (at the client hospital) | Writes to and answers the hub from her hospital's messaging tool; sends photos of a device screen or a printout. Not a user of Intercept's screens (roadmap). |
| **Others at the bedside** | A respiratory therapist or another nurse who writes or sends a photo in the patient's thread, shown by name ("Rachel Lindgren, RRT"). |
| **Demo operator** (prototype) | Plays scripted bedside messages and replies (simulator US7.2); today, the samples' simulated replies stand in (MSG-008). |

---

## 3. Where it opens

| Entry point | Opens | Notes |
|---|---|---|
| Alert panel › actions row › **Messages** (between Video consult and Pathway) | The thread in the third column, in Pathway's place | Always shown, with or without a call; reads **Hide messages** while open; the column stays when the call ends (Nov 5, 2026, user's calls). ✅ **Nov 10, 2026 (user's call; intercept.ds `alert-modal` Messages `1375:8218`):** the alert panel has no Pathway, so the thread is its own column right of the call |
| Patient consult (a card's "…" › Video consult, no active alert) › **Messages** | The same column | The same actions row as the alert panel (Nov 5, 2026). No alert, so its Pathway column says there's no pathway |
| Patient details › app header › **Messages** (after Video consult, before Pathway) | The Messages panel, right of the page and right of Video consult's panel | Pathway shares this place since Nov 6, 2026: one at a time |
| A new message from the bedside, while one of the above shows the patient | The thread, on its own, without moving focus | It takes Pathway's place (MSG-010) |
| Sidebar › **Messages** | The Messages page | ⚠️ **Not built:** the page shows its title and the empty state "No messages yet", "Messages from your care team will appear here." (`emptyPages` in `intercept-live.tsx`) |
| A card's "…" menu; the focus view's "Message bedside team" (PRD Monitoring); Patient details' Message action and the care team's message action (PD-091) | The patient's thread | ⚠️ **Not built:** none of these has a Messages action today. The card menu has Ask Intercept Live, Video consult and View alert |

---

## 4. Requirements

| ID | Requirement | Detail |
|---|---|---|
| MSG-001 | **A bridged thread** | Each patient has one thread with the bedside. What the clinician sends reaches the bedside nurse in her hospital's messaging tool, and her replies come back into the thread (CC-02, Spec §5.3, §6.11). ⚠️ **Not built (prototype):** no bridge. A sent message is reported to the app (`onSendMessage`), and the prototype's replies are simulated (MSG-008). |
| MSG-002 | **Who's in it** | The thread is with the patient's bedside nurse, from the record's care team: "Kelly Ortiz, RN" (`threadWith`); "the bedside nurse" when the record names none. Anyone else at the bedside who writes or sends a photo shows by name and role ("Rachel Lindgren, RRT"). The clinician's own messages show as **You**. |
| MSG-003 | **The thread** | Oldest first, 16px apart. ✅ **Resolved:** grouped by day, with a heading before each day's first message ("Yesterday", then "Today"), as the live feed and the Alerts panel write it. Above each message, who and when, relative and updated each minute ("Kelly Ortiz, RN · 13 min ago", "You · Just now"), the exact time in its tooltip. The bedside's messages on the left (outlined, on `background`); the clinician's on the right (`neutral-muted`), each at most 85% wide. A new message rises in and the thread scrolls to it. The thread scrolls on its own above the field, so the field never covers a message. A message never changes once shown (Nov 5, 2026, user's call). |
| MSG-004 | **Empty** | With no messages: a message icon over "No messages", centered in the thread, with no heading (Intercept-Live `222:18375`). The field stays. |
| MSG-005 | **The composer** | One field pinned to the bottom (`ConsultField`): a 48px pill, "Send a message…", named "Message {nurse}". **Send** appears only once there's text and leaves when the field is cleared (Nov 6, 2026, user's call: no disabled button always in view). Enter or Send sends the trimmed text; an empty or blank message is never sent. The unsent draft stays with the patient's consult session (MSG-013). |
| MSG-006 | **Bedside photos** | A photo the bedside sends is a message from whoever took it, at the time it was taken: the picture (4:3), then what it is and its readings ("BiPAP screen", "IPAP 12 · EPAP 5 · FiO₂ 35% · …"). Without an image file, the picture is drawn from its readings (a device screen or a blood gas printout). ✅ **Photos are messages (Nov 5, 2026, user's call):** they used to list under the call. ⚠️ **Gap:** photos arrive only with a low-bandwidth connection (`connection.photos`); no full-size view. |
| MSG-007 | **The nurse is typing** | "{nurse} is typing…" under the last message while a reply is being written. ⚠️ **Gap:** in the prototype it shows only for simulated replies; whether a hospital's messaging tool reports typing at all is unknown. |
| MSG-008 | **Simulated replies** (prototype only) | Each message the clinician sends gets an answer from the bedside: the nurse types after 1.2 s, and the reply lands 2.4 s later. The samples answer what was written (`sampleBedsideReplier`): an order first ("start a fluid bolus" → "On it. I'll message you when it's done."), then the scenario's topics (Scenario 2's blood gas and BiPAP settings, Scenario 1's breathing and fluids, a lactate), then the patient's live numbers (SpO₂, RR, HR, BP), then a short word back for an acknowledgment. An app leaves them out; real replies come in the thread's data. Simulator US7.2 is to own them, per hospital channel. |
| MSG-009 | **Open from its button** | Messages opens the thread and puts focus in the field. On the alert panel and the patient consult it shares the third column with Pathway: one or the other, so the card never grows to four columns. On the patient page, Messages and Pathway share the panel place right of Video consult's, also one at a time. |
| MSG-010 | **Open on its own for a new bedside message** | A new message or photo from the bedside opens the thread where the patient is shown (in Pathway's place), without moving focus (Nov 5, 2026, user's call: "Message panel will only open with a new incoming message, automatically open"). Nothing else opens it: not the connection dropping, not the messages already in the thread when it's first shown. ⚠️ **Constraint:** in Scenario 2 the resolution's photos and note arrive with the "Transfer avoided" pathway, so Messages takes Pathway's column at that moment; Pathway is one click away. ℹ️ Since Nov 10, 2026 that happens on the patient's page only: the alert panel has no Pathway. |
| MSG-011 | **Unread count on Messages** | The Messages buttons (the alert panel's actions row, the patient consult's, the patient page's app header) show how many bedside messages and photos arrived since the thread was last open (all of them until it first opens). A brand Counter after the label (99+ above 99), flashing every 2 s on the Unread pattern, still under reduced motion. Hidden while the thread is open; opening it clears the count. Screen readers: "Messages, 2 new" on the alert panel, "Messages, 3 unread" on the app header. |
| MSG-012 | **Unread dot on the Sidebar** | With 1 or more unread messages, the Sidebar's Messages item shows a 6px brand dot on its icon, flashing on the Unread pattern, read as "Messages, Unread" (Nov 6, 2026, user's call; it replaced the default header's Messages button). A page's own `navAlerts.Messages` wins. ⚠️ **Gap:** the shell takes the count as a number (`unreadMessages`; the stories pass 3); it isn't summed from the patients' threads. |
| MSG-013 | **The thread carries over** | The thread is part of the patient's consult session: what the clinician sent, the replies, what was read, the draft, and whether Messages (or Pathway) is open carry between the alert panel or patient consult and the patient's page, both ways (Nov 5, 2026, user's call). Clicking the patient's name with Messages open opens their page with the Messages panel open. The session ends when the last place showing the patient closes (the alert closed, Back, another patient). The page's filter stays on the page. |
| MSG-014 | **The patient page's Messages panel** | 416px, full height, right of the page and right of the Video consult panel when both are open, sliding open by its width. A 60px header: **Messages**, then the filter and ×. While it's open, the app header's Messages is pressed (the `accent` fill, "Close messages", `aria-expanded`; it keeps its `message-circle-more` icon: ✅ **Decision (Nov 10, 2026, user's call):** no "off" icon, here and in the alert panel) and keeps its label while the header has room (below 60rem it's an icon button). |
| MSG-015 | **Filter** (patient page) | A ghost filter button opens a menu. **From:** a checkbox per sender (the nurse, anyone else at the bedside who wrote, You), all checked at first. **Photos only.** **Show all** while anything is filtered. Ticking keeps the menu open. While filtered, the button takes the hover fill and is named "Filter messages, filtered"; with nothing left, the thread says "No messages match the filter", and the field stays. ⚠️ **Gap:** the alert panel's column has no filter. ⚠️ **Pending (Figma):** the menu isn't drawn; Figma has only the button (Intercept-Live `222:18380`). |
| MSG-016 | **Close and Escape** | Alert panel and patient consult: **Hide messages** closes the column; Escape closes an open form, dose edit or decision first, then the whole alert panel (the column has no × and no Escape step of its own). Patient page: ×, the pressed header button, or Escape inside the panel closes it; Escape in the filter's menu closes only the menu (UX-09). |
| MSG-017 | **Low bandwidth** | When a hospital's connection drops mid-consult, the thread works as before and carries the bedside's photos (Scenario 2 step 2; CAM-014). In Scenario 2, 3 s after the drop the ED nurse writes "Video froze on our side. Rachel will send the BiPAP screen and the next gases here.", which opens Messages; the BiPAP screen's photo follows; the two blood gases' photos and her 2 h note come with the resolution. |
| MSG-018 | **The Messages page** | Every thread from every hospital in the clinician's scope, in one inbox, each with its hospital and channel (CC-01); urgent apart from routine, with unread counts that update (CC-03); each message opens its patient (CC-04). This page is the inbox; the patient page and the alert show that patient's slice of it, never a second inbox (PD-091). ⚠️ **Not built:** an empty page. |
| MSG-019 | **Provenance** | Each message carries its hospital and channel (CC-01; Requirements §8: Message / Thread has hospital, channel, sender role, urgency, read state). ⚠️ **Not built:** the thread's messages carry who and when only. Clinical surfaces use generic source labels, not vendor names (design update spec §2), so how a channel reads is open (Q-09). |
| MSG-020 | **Urgent and routine** | Urgent clinical messages look different from routine task chat (CC-03, Spec §5.3 "Message prioritization", PD-091). ⚠️ **Not built.** |
| MSG-021 | **Audit trail** | Every message is kept and auditable per patient (CC-09; Spec §5.3 "Audit trail of clinical communications", §6.11 "Medical-legal record retention"). ⚠️ **Not built:** the thread lasts only as long as the consult session; the Intercept Live shell doesn't pass `onSendMessage`, so nothing is recorded. Scenario 2 logs "Photo received: BiPAP screen" to the patient's Activity. |
| MSG-022 | **Accessibility** | The thread is a log (`role='log'`, "Messages with {nurse}"), so new messages are read politely as they arrive. The field is named "Message {nurse}". Buttons say their state (`aria-expanded`) and the unread count in words. A photo is named "Photo: {title}" and its readings are text. Opening on its own never moves focus; opening from a button focuses the field. |
| MSG-023 | **Motion** | A new message rises in (Reveal); the typing line fades; Send grows in and out; the patient page's panel slides open by width; unread counts and the Sidebar dot flash on the Unread pattern. Under reduced motion: fades only, no flash, the thread jumps to the latest message instead of scrolling smoothly (MOTION.md). |
| MSG-024 | **Synthetic data** | Every message, name and photo in the prototype is made up. The Scenario 2 photos are AI-generated, their readings checked against each photo's values (Brief; PD-150). |

---

## 5. States

| State | Thread | Controls | Announced |
|---|---|---|---|
| **Closed, nothing unread** | — | Messages | — |
| **Closed, unread** (MSG-011, MSG-012) | — | Messages with a brand Counter, flashing every 2 s; the Sidebar's brand dot | "Messages, 2 new" / "Messages, 3 unread"; "Messages, Unread" on the Sidebar |
| **Open, empty** (MSG-004) | Message icon over "No messages" | The field; Hide messages, or × on the patient page | — |
| **Open** | The messages, oldest first, the latest in view | The field; Send once there's text | New messages, politely (log) |
| **Nurse typing** (MSG-007) | "{nurse} is typing…" under the last message | As Open | — |
| **Opened on its own** (MSG-010) | As Open, the new message in view | As Open; focus stays where it was | The new message (log) |
| **Filtered** (patient page, MSG-015) | Only the senders left checked, or only photos; none: "No messages match the filter" | The filter button on the hover fill; Show all in its menu | "Filter messages, filtered" |
| **Low bandwidth** (MSG-017) | As Open; photos arrive as messages | As Open | — |
| **Sending, failed, delivered** | ⚠️ **Not built:** a sent message shows at once and never fails | — | — |

---

## 6. Data

| Field | What it is | Code |
|---|---|---|
| `messages` | The thread as the API has it, oldest first. Without it, the thread starts empty | `AlertDetailData.messages` (`ConsultMessage[]`) |
| `from` | `bedside` or `you` (the clinician) | `ConsultMessage.from` |
| `by` | Who sent it from the bedside when it isn't the thread's nurse, "Rachel Lindgren, RRT" | `ConsultMessage.by` |
| `text` | What was written | `ConsultMessage.text` |
| `photo` | A photo sent with it | `ConsultMessage.photo` (`BedsidePhoto`) |
| `sentAt` | When it was sent, ISO 8601 | `ConsultMessage.sentAt` |
| Photos | The bedside's photos during a low-bandwidth consult: title, `kind` (`device-screen` or `blood-gas`, drawn without an image), `values` (label and value), `takenAt`, `takenBy`, `src` | `ConsultConnection.photos` (`BedsidePhoto[]`, `low-bandwidth.tsx`) |
| `bedside` | Who the thread is with: the bedside nurse's name and role | `AlertDetailData.bedside`; `threadWith()` |
| `scriptedReplies` | Prototype only: the simulated replies, a list or a function of the message | `AlertDetailData.scriptedReplies` (`ConsultReplies`) |
| Sent message | What the clinician sent, reported to the app | `onSendMessage(text)` on `AlertPanel`, `PatientConsultDialog` and `PatientConsultPanels` |
| Unread (shell) | How many messages are unread, for the Sidebar's dot | `InterceptLive.unreadMessages` |
| Unread (patient sample) | How many bedside messages were waiting before the page opened; the sample thread holds that many | `PatientRecord.unreadMessages`; `sampleBedsideThread` (`sample-bedside-messages.ts`) |
| Session | The sent messages and replies, what was read, the draft, Messages and Pathway open | `useSessionState` keys `messages`, `messagesRead`, `messagesDraft`, `messagesOpen`, `pathwayOpen` (`consult-session.tsx`) |
| ⚠️ **Not in the data yet** | Hospital, channel, sender role, urgency and read state per message (Requirements §8 Message / Thread); delivery state | — |

---

## 7. Acceptance criteria

| ID | Given | When | Then |
|---|---|---|---|
| MSG-AC-01 | An alert panel whose thread is empty | The clinician clicks Messages | The thread opens in the third column in Pathway's place, shows "No messages", and the field has focus; the button reads Hide messages with `aria-expanded="true"` |
| MSG-AC-02 | The thread is open | The clinician types a message and presses Enter | It shows on the right as "You · Just now", the field clears, and Send leaves with the text; a blank field sends nothing |
| MSG-AC-03 | A thread with simulated replies | The clinician sends "Start a fluid bolus" | 1.2 s later "{nurse} is typing…" shows; 2.4 s after that "On it. I'll message you when it's done." arrives on the left |
| MSG-AC-04 | Scenario 2: Dale Reynolds's consult is live and Pathway is open | Alliance's connection drops | 3 s later the ED nurse's "Video froze on our side…" opens Messages in Pathway's place without moving focus; the BiPAP screen's photo then arrives from "Rachel Lindgren, RRT" with its readings |
| MSG-AC-05 | Sarah Miller's page, her record counting 3 unread | The page opens | The app header's Messages carries a brand Counter of 3, flashing, named "Messages, 3 unread" |
| MSG-AC-06 | MSG-AC-05 | The clinician clicks Messages | The Messages panel opens right of the page (right of Video consult's, if open) with the three messages; the count clears; the header button reads "Close messages", pressed |
| MSG-AC-07 | The patient page's Messages panel is open | The clinician unchecks the nurse in the filter, then picks Photos only, then Show all | The thread shows only the clinician's messages, then only photos (or "No messages match the filter"), then everything; the button is named "Filter messages, filtered" while filtered |
| MSG-AC-08 | The filter's menu is open | The clinician presses Escape | Only the menu closes; a second Escape closes the panel |
| MSG-AC-09 | Hayes's alert panel with the call live and Messages open | The clinician clicks her name | Her page opens with the call still live and the Messages panel open, with the same thread and draft; the messages already read aren't counted again |
| MSG-AC-10 | A patient's page with the Pathway panel open | A new message arrives from the bedside | The Messages panel replaces Pathway, focus stays where it was, and Pathway is one click away |
| MSG-AC-11 | A card's Video consult for a patient with no active alert | The patient consult opens | Its actions row has exactly one Messages button, which opens the same column as on an alert |
| MSG-AC-12 | The shell has 1 or more unread messages | Any page shows | The Sidebar's Messages has a brand dot, flashing every 2 s, named "Messages, Unread"; still under reduced motion |
| MSG-AC-13 | Reduced motion is on | A message arrives with the thread open | It appears without rising, the thread jumps to it, and no count flashes |
| MSG-AC-14 | The Sidebar | The clinician opens Messages | ⚠️ **Proposed:** the inbox of every thread in scope (MSG-018). Today: the empty state |

---

## 8. Open decisions

| Topic | Decision needed |
|---|---|
| ⚠️ **The Messages page** | What the inbox shows (every hospital's threads, urgent apart from routine, CC-01, CC-03), how it relates to the patient's slice (PD-091, PD-OD-11: one source of truth), and whether group threads (hospitalist, residents, APCs) live there. Its empty state says "from your care team", which doesn't match a bedside inbox. |
| ⚠️ **One unread count** | The Sidebar's dot reads a number the shell is given, not the threads. And `unreadMessages` means two things: family messages on the Monitoring card, its Family messages sort and `PanelPatient`, and bedside messages on `PatientRecord` and the patient header. Pick one source per count, and separate names. |
| ⚠️ **Hospital and channel on each message** | CC-01 asks for hospital and channel provenance; the design update spec keeps vendor names off clinical surfaces. Which label shows ("Hospital messaging", "Secure Chat", the hospital's name) is Q-09 (Lisa-Mae). |
| ⚠️ **Urgent vs routine** | How an urgent message looks and whether it interrupts (a toast, a sound, a different dot) when the patient isn't on screen (CC-03, PD-091). No toast or sound for a bedside message today. |
| ⚠️ **Delivery and failure** | The bridge can fail or be slow, more so in Overlay mode (deep links, screen operation, Spec §5.3). Whether a message shows sending, delivered, read or failed, and what the clinician can do about a failure. |
| ⚠️ **Keeping the thread** | Today the thread lasts for the consult session only. Persisting it, its audit trail (CC-09) and whether messages join the patient's Activity and the handoff's "unresolved messages" (HO-01, DU-31), and what counts as unresolved. |
| ⚠️ **Escape on the alert panel** | On the page, Escape closes the Messages panel; on the alert panel it closes the whole alert. Should the column close first, as a form does? |
| ⚠️ **Filter on the alert panel** | Only the page's panel has the filter. Add it to the column, or keep the alert lean? |
| ⚠️ **Screen reader wording** | "Messages, 2 new" (alert panel) and "Messages, 3 unread" (app header) say the same thing two ways. Proposal: "unread" everywhere. |
| ⚠️ **Opening on its own** | A new message takes Pathway's place even mid-decision (Scenario 2's resolution). Should it wait while a pathway form is open, or only raise the count then? |
| ⚠️ **Where else Messages opens** | The card's "…" menu, the focus view's "Message bedside team", the care team's message action (PD-091) and escalating to the bedside charge nurse "through Messages" (MON-OD-08) don't open or post to the thread. Which of them should. |
| ⚠️ **Photos** | A full-size view; photos outside low-bandwidth mode; whether the clinician can ask for one. |
| ⚠️ **Simulated replies** | The samples' replies stand in for the simulator's scripted messages (US7.2, SQ-10). Move them to the simulator, per hospital channel, before the inbox story needs them. |
| ⚠️ **ID prefix** | `MSG-` and `MSG-AC-` are new repo-local IDs, to confirm with the team. |

---

## 9. Design and code

| What | Where |
|---|---|
| Thread, composer, Messages button, unread | `src/layouts/intercept-live/alert-panel/consult-messages.tsx` (`ConsultMessages`, `ConsultField`, `ConsultMessagesButton`, `useConsultMessages`, `useNewIncoming`, `useUnreadMessages`) |
| Alert panel and patient consult | `src/layouts/intercept-live/alert-panel/alert-panel.tsx` (`AlertPanelContent`'s third column; `PatientConsultDialog`; `threadWith`) |
| Patient page panel and filter | `src/layouts/intercept-live/patient-details/consult-panels.tsx` (`PatientConsultPanels`, `MessagesFilter`) |
| Consult session | `src/layouts/intercept-live/alert-panel/consult-session.tsx` (`ConsultSessionScope`, `useSessionState`) |
| Photos | `src/layouts/intercept-live/alert-panel/low-bandwidth.tsx` (`BedsidePhoto`, `BedsidePhotoImage`) |
| App header Messages | `src/components/navigation/app-header/app-header.tsx` (`patient` variant: `onOpenMessages`, `messagesOpen`, `unreadMessages`); set by the page through `usePatientHeaderActions` (`side-panel.tsx`) |
| Sidebar dot and Messages page | `src/components/navigation/sidebar/sidebar.tsx` (`alert: "unread"`); `src/layouts/intercept-live/intercept-live.tsx` (`unreadMessages`, `emptyPages.Messages`) |
| Sample data | `alert-panel/sample-bedside-messages.ts` (`sampleBedsideThread`), `alert-panel/sample-bedside-replies.ts` (`sampleBedsideReplier`), `sample-data/sample-scenario-2.ts` (the ED's messages and photos), `sample-data/images/sample-photo-*.jpg` |
| Figma | intercept.ds `alert-modal` › Messages (`1375:8218`); Intercept-Live "Video and Messages Interations" (`219:16129`), the filter button (`222:18380`), the empty state (`222:18375`), the field (`221:17539`, `230:6395`). ⚠️ **Pending (Figma):** the actions row's Messages button and the messages themselves, the filter menu, the unread count on the header's Messages, the Sidebar's brand dot; Figma rounds the page panel's right corners and code doesn't |
| Decisions | DESIGN.md › "Alert panel" (Messages), "AppHeader", "Sidebar" (Unread dot), Patient details (Video consult and Messages panels); MOTION.md › Unread |
| Stories | Layouts/Intercept Live/Patient details › Video Consult And Messages; Monitoring › Video Consult Without Alert, Scenario 1 Heart Failure (the thread carrying over), Scenario 2 Copd; Navigation/AppHeader › Patient Panels Open; Navigation/Sidebar › Item Alerts (the unread dot) |
