<!--
Created: Oct 28, 2026
Created by: Julio Caunedo
Last updated: Nov 13, 2026
Scope: The chat composer (UCL ChatComposer) and the Ask Intercept Live conversation it drives in the Provider Desktop: the message field, its buttons, slash commands, suggested questions, and how answers arrive.
Purpose: Defines the composer's behavior, states, rules for answers and acceptance criteria, pending clinical and product validation, so design, engineering and the Conversational Clinical Data Agent team build the same thing.
-->

# PRD — Chat composer

**Product:** Intercept Live — Virtual Care OS  
**Module:** Provider Desktop (Single Pane of Glass) ★, "chat with the chart" (Spec §5.1, §6.14, §8.7)  
**Surface:** Ask Intercept Live, the chat panel; its message box is the **chat composer** (UCL `ChatComposer`)  
**Version:** 0.1  
**Status:** Draft — pending clinical and product validation  
**Last updated:** November 13, 2026

---

## 1. Overview

The chat composer is where a clinician asks Intercept Live a question about their patients, in words, and gets an answer from the chart. It sits at the bottom of **Ask Intercept Live**, the chat panel of the Provider Desktop, and it's the only way into the Conversational Clinical Data Agent ("chat with the chart", Spec §8.7).

The agent retrieves and summarizes. It never diagnoses, recommends therapy or acts (Spec §8.7). The composer's job is to make asking fast and the answers trustworthy: every answer is marked as AI, names its sources, and can be stopped, copied or checked.

| Surface | The question it answers |
|---|---|
| **Census** | Who is on my census, and who needs attention? |
| **Patient details** | What is going on with this patient, why, and what do I do next? |
| **Ask Intercept Live** | Anything about my patients I'd otherwise have to look up across several screens. |

### 1.1 Product objectives

| Objective | What it means for the composer |
|---|---|
| **Answers in seconds** | A question typed, or picked from a suggestion, gets an answer that starts arriving in about a second, instead of the clinician opening several sections or systems. |
| **Trust by default** | Answers say where each fact comes from and how old it is, and say plainly when the chart can't answer. |
| **Fast for experts** | Slash commands run the common requests (summary, labs, handoff) in a few keystrokes, on the patient on screen. |
| **Start the shift informed** | A clinician coming on shift asks for a brief and gets their census, who needs them first, what's overdue and what was handed over. |
| **Never act alone** | The composer never sends, saves or orders anything on its own. Drafts (a handoff) stay drafts until a clinician uses them. |

### 1.2 Source documents

| Document | What this PRD takes from it |
|---|---|
| System Specification (Draft v0.1, May 2026) | §5.1 Provider Desktop ("chat with the chart"), §6.14 Conversational AI (guardrails, citations, conversation audit), §8.7 Conversational Clinical Data Agent (scope, limits, example questions), §9.1 Principles 7, 9 and 12 (AI marked, explainable, honest about thin data), §9.5 (microphone and voice policies are downstream) |
| PRD — Patient details | PD-100 Ask about this patient (scope, citations, limits, drafts), PD-110 Prepare handoff (I-PASS), PD-OD-04 (where Ask lives) |
| Design Phase Team Brief | Synthetic data only; show the sanctioned integration story |
| intercept.ds `Chat` (`1200:1431`) | The panel and the composer's empty state: field, +, microphone, voice |
| DESIGN.md "ChatComposer", "Ask Intercept conversation"; MOTION.md "AI answers" | How the prototype builds it |

### 1.3 Relationship to other surfaces

| Surface | Relationship |
|---|---|
| **Sidebar · Ask Intercept Live** | Opens and closes the chat panel on any page. |
| **App header (patient context) · sparkle** | Opens the same panel from a patient's page, about the patient on screen. The Patient Header has no button of its own (removed from Figma, Oct 28, 2026). |
| **Patient list** | Shares the left side with the chat: one is open at a time. |
| **Messages** | Not this composer. Messages go to people; the chat composer asks the agent. ⚠️ **Decision needed:** whether the care team thread's composer reuses `ChatComposer` (CC-OD-06). |

---

## 2. Users and use cases

### 2.1 Primary users

| User | What they use the composer for |
|---|---|
| **Intercept intensivist** | Catching up on a patient before acting; census-wide questions across hospitals; drafting a handoff. |
| **Intercept APP** | The same, within their scope; follow-ups on results and orders. |
| **Intercept RN** | Checking what's due, pending or not reporting; who's at the bedside. |
| **Clinician starting a shift** | A brief of the census and what was handed over, before opening any patient. |

### 2.2 Use cases

| ID | Use case | How the composer serves it |
|---|---|---|
| CC-UC-01 | Start of shift | Suggestion "Brief me for the start of my shift" returns the census at a glance, who needs attention first, what's overdue, concerns carried over, pending results and data gaps. |
| CC-UC-02 | Overnight catch-up | "What happened overnight?" lists the last 12 hours, patient by patient. |
| CC-UC-03 | One patient, fast | On a patient's page, "/labs" or "Summarize the last 24 hours" answers about that patient without naming them. |
| CC-UC-04 | Across the census | "Lactate for everyone in the MICU", "Which of my patients are on pressors?" answer across patients, filtered by hospital, unit or assignment. |
| CC-UC-05 | Handoff | "/handoff Miller" drafts an I-PASS handoff from the chart for the clinician to review and edit. |
| CC-UC-06 | A long answer that's not needed | Stop ends it and keeps what's already there. |
| CC-UC-07 | Hands busy | The microphone dictates the question (CC-031, built Nov 6, 2026). No voice conversation in Ask Intercept Live; its voice button is removed (CC-032). |

---

## 3. Anatomy

The composer is one box: a field on top, a toolbar under it. The commands menu opens above the box.

| Part | What it is | UCL |
|---|---|---|
| **Field** | Multi-line text, one line tall, growing with the text to 160px, then scrolling. Placeholder "Ask a question or search" | `ChatComposer` textarea; `placeholder`, `label` |
| **+ (Add attachment)** | Left of the toolbar. | `onAttach`; shown only with it |
| **/ (Commands)** | Next to +. Opens the commands menu. | `commands`; shown only with them |
| **Microphone (Dictate)** | Right of the toolbar. | `dictation` (built in: listens, writes into the field; pressed while listening, "Stop dictating"), or `onDictate`; shown only with one of them |
| **Voice / Send / Stop** | The last button. Voice while the field is empty; Send once there's text; Stop while an answer is being written. | `onVoice`, `onSubmit`, `generating` + `onStop` |
| **Commands menu** | A list above the box: each command and what it does. | Built into `ChatComposer` |

ℹ️ The panel around the composer (heading, close, conversation) is the shell's (`AskInterceptPanel`), not part of UCL.

---

## 4. Requirements

### CC-010 — Field

- Placeholder: "Ask a question or search" (search moved here from the Sidebar; "How can I help?" before). The field's accessible name stays "Ask Intercept Live", since a placeholder disappears once the clinician types.
- **Enter** sends; **Shift+Enter** starts a new line. An Enter that ends an input-method composition (IME) doesn't send.
- What's sent is trimmed; an empty or blank message is never sent.
- The field stays editable while an answer is being written, so the next question can be typed.

### CC-011 — The last button: voice, Send or Stop

| State | Button | Does |
|---|---|---|
| Empty field | Voice (sound waves) | Starts a voice conversation (CC-032) |
| Text in the field | Send (arrow up) | Sends the message |
| No voice available, empty field | Send, disabled | — |
| An answer is being written | Stop (square) | Stops the answer (CC-012) |

### CC-012 — Stop

Stop ends the answer at once and keeps what has arrived, marked "Stopped". While an answer is being written, Enter doesn't send; the clinician sends once it's done or stopped.

### CC-020 — Slash commands

The commands button, or "/" typed at the start of the field, opens the commands menu above the box.

- The menu filters as the clinician types after the slash ("/s" shows /summarize and /sepsis).
- **↑ ↓** move, **Enter** or **Tab** picks, **Escape** closes the menu (and only the menu, not the panel around it). Clicking a command picks it.
- Picking writes "/name " into the field, replacing a command being typed, or before text already there. The clinician can add a patient's name, then sends.
- Once a command is in the field with nothing after it, a guidance line shows right after it, muted, saying what to write next. With a patient in the chat: "Enter for Hayes, or add another patient"; without one: "Add a patient's name" (for /changes: "Enter for all your patients, or add a patient's name"). It disappears as soon as the clinician types after the command, and screen readers hear it as the field's description.
- With text already in the field, the commands button opens the menu without clearing it.
- The menu lists the commands by name alone ("/summarize"), without a description beside each; what each does is in the table below.

| Command | Does | Patient |
|---|---|---|
| **/summarize** | A patient's last 24 hours | Required |
| **/changes** | What changed in the last hour | Optional: the census without one |
| **/labs** | Latest labs, flagged, with previous values | Required |
| **/meds** | Medications: infusions, scheduled with what's due, as needed | Required |
| **/sepsis** | Sepsis criteria and bundle, or the values screening looks at if the patient isn't screened | Required |
| **/handoff** | A draft handoff in I-PASS (CC-022) | Required |
| **/clear** | Empties the conversation as soon as it's picked from the menu, without sending (typed in full and sent, the same); the chat greets the user again with its starter questions, and alert updates stop until the next question about alerts (Oct 31, 2026, product) | None |

⚠️ **Decision needed:** the v1 command set, and whether commands vary by role (CC-OD-02). Spec §8.7's examples ("show me the sedation vacation and spontaneous breathing trials") suggest a /trend command with an overlay.

### CC-021 — Who a command or question is about

| The message names | It's about |
|---|---|
| A patient (last name, first name, or unit and bed: "MICU Bed 11") | That patient; up to three named patients are answered in turn |
| No one, on a patient's page | The patient on screen |
| No one, elsewhere | The census, narrowed by a hospital, a unit or "my patients" in the message |

- A command that needs a patient, with none named or on screen, asks: "Which patient? Add a name after the command, like **/labs Miller**, or open the patient first."
- An unknown command says so: "There's no **/foo** command. Type **/** to see the commands."
- A patient's summary (/summarize, or a question that asks for one) always opens with the patient's full name in bold ("**Harris, William**"), so a first name alone ("/summarize William") shows who it found. Answers about several patients already open each with the name.

### CC-022 — /handoff draft

A draft handoff in I-PASS (PRD PD-110), built from the chart:

| I-PASS part | Content |
|---|---|
| **Illness severity** | Left for the clinician to set; the draft shows acuity and its 24-hour change for reference |
| **Patient summary** | Age, sex, diagnosis, ICU day, and the current brief |
| **Action list** | Open alerts, medications due in the next 4 hours (or overdue), pending results and cultures, open order recommendations |
| **Situation awareness** | Infusions, breathing support, sepsis state, code status, allergies, isolation |
| **Synthesis by receiver** | Left for the incoming clinician |

- The draft says it's a draft: "Review and edit it before you use it; it isn't saved or sent."
- ⚠️ **Decision needed:** the handoff format is PD-OD-10; this follows the exploration's I-PASS.
- ⚠️ **Gap:** the draft can be copied, not yet moved into the handoff surface (CC-OD-03).

### CC-030 — Attachments (+)

⚠️ **Gap:** not built. The button shows in the prototype and does nothing. ⚠️ **Decision needed:** what can be attached (a screenshot of a monitor, a document, an image), where it's stored, and whether the agent may read it (CC-OD-04).

### CC-031 — Dictation (microphone)

Built (`dictation`). Dictation fills the field with the spoken question, as it's said, for the clinician to check before sending; it never sends by itself. Browser speech recognition for the prototype; production needs a speech service the hospitals approve. ⚠️ **Decision needed:** which hospitals allow microphones, and push-to-talk (Spec §9.5, CC-OD-05).

| Rule | Behavior |
|---|---|
| **Start** | The microphone button starts listening. The field reads "Listening…" while empty, in the text color (not the hint gray). |
| **"Hey Intercept"** | **Removed.** The microphone starts only when the clinician presses its button; nothing listens for a phrase. Listening for it opened the microphone as the chat opened, and the browser asked for it with no click. This also closes the always-listening risks below. ~~While Ask Intercept Live is open and nothing is being dictated, the composer listens for "Hey Intercept", or just "Hey" (added the same day, user's call), and the placeholder says so ('Ask, search, or say "Hey Intercept"'). Hearing either starts dictation, as the button does; when dictation stops, it listens for the phrase again. Not while the panel is closed. Nothing else it hears is shown or kept. ⚠️ **Risk:** "Hey" alone is common in conversation at the hub, so it will start dictation by accident now and then (the microphone turns red; the microphone or "stop listening" ends it). ⚠️ **Risk:** browser recognition sends the room's audio to the browser's speech service the whole time the panel is open; production needs on-device wake-word detection or a hospital-approved service (CC-OD-05). ⚠️ **Decision needed:** whether hospitals allow an always-listening microphone at the hub, and an off switch.~~ |
| **Words as they're said** | Recognition's guess shows at once and is replaced as it settles. Dictation goes after any text already in the field, with a space between; the first word is capitalized when the field was empty or ended a sentence. |
| **Spoken punctuation** | Saying "comma" writes ", ", "period" writes ". " and "question mark" writes "? " (the mark against the word before it, a space after), and the word after a period or question mark starts with a capital. Any word "period" is taken as the mark, as dictation software does. A sentence that starts with a question word (what, why, how, when, where, who, which) or a verb that opens a yes/no question (is, are, do, does, did, can, could, should, would, will, has, have…) is a question: its "period" becomes "?", and an unfinished question gets "?" as soon as recognition settles with nothing more being said (it goes again if the sentence carries on), and when it's sent or dictation ends. A request ("Show me her labs") doesn't. Lead-in words are skipped to find where the question starts ("Okay so…", "Intercept, can you tell me how is Emily doing" → "Can you tell me how is Emily doing?"), and a statement with a question tag at its end is a question too ("…her lactate is down, right?", "…isn't it?"). After "Hey" wakes it, a leading "Intercept" is the wake phrase's and is left out. Typing ends dictation without adding one. ℹ️ Other marks ("exclamation point", "new line") aren't recognized yet. |
| **Listening state** | The button turns Flat · Destructive (pale red fill, red icon) with the `mic-off` icon (archielabs.ds `6346:10225`), pressed, named "Stop dictating"; a darker red breathes in and out over its fill once a second, so it plainly reads as listening (still under reduced motion). |
| **Voice meter** | A red halo behind the button swells with the voice from the first syllable, before any words return (about a second later); none in silence, none under reduced motion. |
| **Pauses** | Recognition ends itself after a silence and restarts at once, so the first words after a pause aren't lost. |
| **"Send" / "Submit"** | Saying "send" or "submit" as the last word sends the message, as the Send button does, without the word, and dictation goes on. It acts once recognition has settled on the word (about half a second after it's said), so "send me the labs" never sends early; meanwhile the word never shows in the field (Nov 6, 2026, user's call), and comes back only if more words follow it. Said alone with nothing in the field, it's dropped. ℹ️ A question that really ends in "send" is sent without that word. |
| **Stays on** | Dictation keeps listening until the clinician ends it. Sending (Send, Enter or "send") sends and clears the field, and it goes on listening for the next message. Typing doesn't stop it either: what's said next goes after what's typed. Escape doesn't stop it; it closes the panel, which ends it. |
| **Stop** | The microphone again, or saying "stop listening" (without the words, which never show in the field, even while recognition is still guessing; a spoken question gets its "?"). Closing the panel ends it too. |
| **"Delete"** | Saying "delete" removes the word before it, one word per "delete" (a spoken mark such as "comma" counts as a word). Once the dictated words are gone, it removes the field's own words, from the end. It acts at once, as recognition hears it. ℹ️ Any word "delete" is taken as the command, as with "period". |
| **Blocked microphone** | Dictation stops and a line under the field says "Allow the microphone to dictate." (or "Dictation isn't working right now. Try again." for other failures), until the clinician tries again, types or sends. |
| **No speech recognition** | In browsers without it (Firefox), the microphone button isn't shown. |

### CC-032 — Voice conversation

Not in Ask Intercept Live; its voice button is removed, and dictation (CC-031) is the spoken way in. The component keeps `onVoice` for other apps. Had it been built: a spoken conversation with the agent, answers read aloud, with CC-031's policy questions plus how a spoken answer cites its sources.

### CC-040 — Suggested questions

Shown under the greeting until the first question, as pills; picking one sends it. **They keep going.** After an answer with no follow-ups of its own (the shift brief, for example), up to 4 of the suggestions not asked yet show under it, as follow-ups, in the same order.

| Where | Suggestions |
|---|---|
| **Census and other pages, starting the shift** | (its first 2 hours; a shift is 12 hours, from the end time in the app header) "Brief me for the start of my shift", "What happened overnight?", "Who needs attention first?", "What's overdue?", "Which patients are sepsis candidates?", "What changed in the last hour?" |
| **Census and other pages, on shift a while** | "What changed in the last hour?", "Who needs attention first?", "Which alerts are still open?", "What's overdue?", "Any results still pending?", "Which patients are sepsis candidates?" |
| **A patient's page** | By the patient's first name: "Summarize Sarah's last 24 hours", "What changed for Sarah since I last looked?", "Show Sarah's latest labs", "What meds is Sarah on?", "Show Sarah's sepsis criteria" (labs and meds added Nov 2, 2026, user's call) (the chat opened about a patient talks about them) |

Suggestions adapt to the time of shift (starting it, or on it a while). ℹ️ The 12-hour shift and the 2-hour start are the prototype's; the real shift comes from staffing. ⚠️ **Decision needed:** whether they also adapt to role or what's open on the census (CC-OD-01).

### CC-041 — How answers arrive

| Moment | Behavior |
|---|---|
| **First open** | Once the panel has opened, Intercept greets the clinician, streaming: "Have a question about your patients? Just ask. Intercept Live helps you find the answers you need." About a patient (their app header's sparkle): "Have a question about Sarah Miller? Just ask. Intercept Live can sum up their day, what changed, their labs and meds." Before the first question, a change of who the chat is about greets again, so the greeting and suggestions always match the context |
| **Sent** | The question shows at once, right-aligned. |
| **Thinking** | "Thinking…" with a soft pulse, for about a second. Stop is already available. |
| **Streaming** | The answer arrives in short bursts of a few words, pausing briefly after a sentence, with a blinking cursor at its end. |
| **Following** | The conversation follows the newest text, unless the clinician has scrolled up; then it stays where they are. |
| **Done** | Copy (the plain text) and "Sources: …" under the answer. |
| **Stopped** | What arrived stays, marked "Stopped". |
| **Kept** | The conversation is kept while the panel is closed and reopened. ⚠️ **Decision needed:** whether it persists across sessions and devices, and its retention (Spec §6.14 "conversation persistence and audit", CC-OD-07). |

### CC-042 — What an answer may say

| Rule | Behavior |
|---|---|
| **Marked as AI** | Every answer carries the Intercept sparkle (Spec §9.1, Principle 7). |
| **Cites its sources** | Every answer names where its facts come from ("Sources: Monitor · Lab · MAR"); times are relative ("35 min ago"). ⚠️ **Gap:** sources are named, not linked; a citation should open its source and its place on the Timeline (PD-100, CC-OD-08). |
| **Retrieves, never advises** | A request for a diagnosis, a treatment or a dose gets: "I can't recommend a treatment or make a diagnosis. I can bring up the data behind the decision, like a trend, the latest results or the sepsis criteria." (Spec §8.7) |
| **Honest about thin data** | A question the chart can't answer gets "I don't have enough information…" with what it can answer (Spec §9.1, Principle 12). Missing values say they're missing, never zero. |
| **Patient names stand out** | A patient's name is always bold, full ("**Miller, Sarah**") or first ("**Sarah**"). A list whose lines start with a patient (Breathing support, infusions, safety…) shows each patient's avatar before their line, as on their card, in place of the bullet, formatted as the rows of a count's patient list: the name (semibold) and, in grey under it, where they are (hospital, unit and bed), with the avatar centered beside both; then what the answer says about them below, lined up with the name. ✅ **Resolved:** ~~once the answer is written~~ as soon as it shows (the answer may still be streaming), each of those names is a link that opens the patient's details; the chat then closes and starts over (the conversation is cleared, as with /clear), so the page has the room. A row of a count's patient list still opens the patient with the chat left as it is. Clicked while the answer streams, it stops the answer. |
| **Readable** | Short paragraphs and lists; long lists stop at 8 with "…and 3 more". That line ends with **Show all**, which expands the same list in place with only the patients it hadn't shown (no new question); the line goes once they're shown. ✅ **Resolved:** every cut list in an answer has **Show all**, whatever the question ("What's overdue?", data gaps, the shift summary), never a bare "…and 10 more." |
| **Follow-ups on recent activity** | An answer about what happened (the last hour, the last 12 hours, overnight) offers what a physician reviewing it asks next: "Who needs attention first?", "Which alerts are still open?", "What's overdue?", "Any results still pending?", then the other window ("What changed in the last hour?" after the 12 hours, "What happened overnight?" after the hour), each in the same scope (a hospital, a unit, my patients). |
| **Counts open their patients** | A count of patients in an answer ("5 ventilated", "1 on NIV", "5 on pressors", "2 with open alerts", "8 assigned to you") is a link once the answer is written: a click lists those patients under its line (their avatar as on their card, then the name, then hospital, unit and bed; avatars Nov 10, 2026, user's call), another hides them, and a patient opens their details. A count of none stays plain text. Today the census overview's counts link; ℹ️ other answers' counts can link the same way. |
| **One tenant** | Answers only about patients the clinician has access to, in this tenant (PRD PD-AC-15). |

### CC-050 — Context

Each message goes to the agent with the page the clinician is on and the patient on screen, if any. ⚠️ **Gap:** the agent doesn't yet see which section is open (e.g. answering about the Timeline's crosshair moment).

---

## 5. States

| State | What the clinician sees |
|---|---|
| **Empty** | Placeholder, +, commands, microphone. No voice button in Ask Intercept Live, and no Send until there's text |
| **Typing** | Text; Send grows in from its center as the first character arrives, pushing the microphone left, never covering it |
| **Dictating** | "Listening…" while empty; the microphone Flat · Destructive with `mic-off`; the voice meter; the words appearing as they're said (CC-031) |
| **Commands menu open** | The menu above the box; the commands button pressed |
| **Generating** | Stop instead of Send; the field still editable |
| **Disabled** | The whole box at 50%, nothing works (e.g. no access) |
| **Agent unavailable** | ⚠️ **Gap:** not built. The composer stays usable; the answer says the agent can't be reached and to try again, never a blank answer |
| **Offline** | ⚠️ **Gap:** not built. Send disabled with a reason, the typed question kept |

---

## 6. Accessibility

- The field is labeled "Ask Intercept Live"; with commands it's a combobox controlling the commands listbox, and the highlighted command is announced (`aria-activedescendant`).
- Every button has a name: "Add attachment", "Commands", "Dictate" ("Stop dictating" while listening, pressed), "Start voice conversation", "Send", "Stop generating". The commands button says whether the menu is open.
- The conversation is a log: new messages are announced; an answer being written is busy, so it's read once, when done. Questions are prefixed "You:", answers "Intercept Live:" for screen readers.
- The whole box shows the focus ring while the field is focused.
- Everything works from the keyboard: Enter, Shift+Enter, ↑ ↓, Tab, Escape.

---

## 7. Motion

Per MOTION.md "AI answers": thinking is a soft opacity pulse; streaming arrives in uneven bursts of a few words; new messages and suggestions reveal in place; the commands menu fades and rises like the library's menus. Send grows from its center while its room opens, on one curve, so it never overlaps the microphone; while dictating, the voice meter (MOTION.md "Voice meter") follows the voice. Under reduced motion, answers appear whole, nothing pulses, the menu and Send only fade, and there's no voice meter.

---

## 8. Prototype

| Part | In the prototype |
|---|---|
| **Composer** | Built in UCL (`ChatComposer`): field, commands, Stop; +, microphone and voice report clicks only |
| **Answers** | A built-in engine over every sample file (census, monitoring values and alerts, each patient's record and sections, hospitals, user and team), matching questions by topic and patient. No AI model, no API key. It doesn't truly understand a question; the real agent replaces it. |
| **Data** | Synthetic only (Brief, PRD PD-150) |

---

## 9. Acceptance criteria

| ID | Criterion |
|---|---|
| CC-AC-01 | Enter sends the trimmed message; Shift+Enter adds a line; an empty message is never sent. |
| CC-AC-02 | While an answer is being written, Stop is shown, Enter doesn't send, and Stop keeps what arrived, marked "Stopped". |
| CC-AC-03 | "/" at the start, or the commands button, opens the commands menu; typing filters it; ↑ ↓, Enter, Tab and Escape work, and Escape doesn't close the panel. |
| CC-AC-04 | A command runs on the named patient, else the patient on screen; without either, a patient command asks which patient. |
| CC-AC-05 | /handoff returns a draft in I-PASS, with illness severity and synthesis left for clinicians, marked as not saved or sent. |
| CC-AC-06 | Every answer is marked as AI and names its sources. |
| CC-AC-07 | A request for a diagnosis, treatment or dose is declined with what the agent can show instead. |
| CC-AC-08 | A question the chart can't answer says "I don't have enough information" and never guesses. |
| CC-AC-09 | Patient names in answers are always bold. |
| CC-AC-10 | The conversation follows new text unless the clinician scrolled up, and is kept while the panel is closed. |
| CC-AC-11 | Under reduced motion, answers appear whole and nothing pulses. |
| CC-AC-12 | Every control has an accessible name, and the composer works by keyboard alone. |
| CC-AC-13 | Dictating "what changed in the last hour comma since midnight period is it worse question mark" into an empty field writes "What changed in the last hour, since midnight? Is it worse? " (the period ending a question becomes "?"); stopping after "does she have a fever" leaves "Does she have a fever?", after "show me her labs" no "?"; the words appearing as they're said; nothing is sent until the clinician sends. |
| CC-AC-14 | While dictating, the microphone is Flat · Destructive with `mic-off` and "Stop dictating"; only the microphone again or "stop listening" stops it; Send, "send" and typing don't. |
| CC-AC-15 | With the microphone blocked, dictation stops and "Allow the microphone to dictate." shows under the field. |
| CC-AC-16 | As the chat opens, the greeting writes itself with no Stop button; a question sent meanwhile is asked, not dropped. |
| CC-AC-17 | With an empty field there's no Send; it grows in with the first character and shrinks away when the field empties, never covering the microphone. |
| CC-AC-18 | ~~With Ask Intercept Live open, saying "Hey Intercept", or just "Hey", starts dictation (the microphone pressed, "Listening…") without a click; anything else said before it shows nothing; with the panel closed, it isn't listened for.~~ Since Nov 10, 2026: opening Ask Intercept Live never asks for or opens the microphone; only pressing the microphone button does. |
| CC-AC-19 | Dictating "what is pending" then "send" sends "What is pending?" (no "send", a question's "?"), clears the field and keeps listening; "send" while recognition is still guessing sends nothing yet. |
| CC-AC-20 | Dictating "labs for Sarah Miller" then "delete delete" leaves "Labs for"; with "Labs for Sarah" typed and "Miller delete delete" said, the field reads "Labs for". |
| CC-AC-21 | Saying "does she have a fever stop listening" leaves "Does she have a fever?" and ends dictation. |
| CC-AC-22 | Woken by "Hey", "Intercept can you tell me how is Emily doing" shows "Can you tell me how is Emily doing?" once recognition settles; "okay so her lactate is down comma right" shows "Okay so her lactate is down, right?". |
| CC-AC-23 | In the census overview, clicking "5 on pressors" lists those 5 patients under the line with where they are; clicking one opens their Patient details; clicking the count again hides the list. Copy copies the counts as plain words. |

---

## 10. Dependencies

| Dependency | Needed for |
|---|---|
| Conversational AI (Spec §6.14) | Prompting, guardrails, citation enforcement, streaming, conversation audit |
| Conversational Clinical Data Agent (Spec §8.7) | Answers, within its limits |
| Patient Data Aggregation, Search and Indexing (Spec §6.5, §6.9) | The data answers come from |
| Tenancy and Data Isolation (Spec §6.4) | Answers only about patients the clinician can access |
| Audit and Compliance Logging (Spec §6.8) | Who asked what, and what was answered |
| PRD — Patient details | PD-100 Ask, PD-110 Handoff |
| UCL (this repo) | `ChatComposer`, `SidePanel`, Button |

---

## 11. Open decisions

| ID | Decision | Owner | Notes |
|---|---|---|---|
| CC-OD-01 | Do suggested questions adapt to the time of shift, role or the census? | Product | The prototype has fixed sets for the census and a patient's page |
| CC-OD-02 | The v1 command set, and whether it varies by role | Product / Clinical | /trend with an overlay is a candidate (Spec §8.7) |
| CC-OD-03 | Where a /handoff draft goes: copied only, or into the handoff surface | Product | Depends on PD-OD-10 (handoff format) |
| CC-OD-04 | What can be attached, where it's stored, and whether the agent reads it | Product / Security | + is shown but does nothing |
| CC-OD-05 | Microphone and voice: which hospitals allow them, push-to-talk or not | Clinical / Security | Spec §9.5 |
| CC-OD-06 | Does the care team thread's composer reuse ChatComposer? | Design | Messages go to people, not the agent |
| CC-OD-07 | Conversation persistence across sessions and devices, and retention | Product / Compliance | Spec §6.14 |
| CC-OD-08 | Citations: names only, or links that open the source and its moment on the Timeline | Product / Engineering | PD-100 asks for links |
