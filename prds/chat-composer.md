<!--
Created: Oct 28, 2026
Created by: Julio Caunedo
Last updated: Oct 28, 2026
Scope: The chat composer (UCL ChatComposer) and the Ask Intercept Live conversation it drives in the Provider Desktop: the message field, its buttons, slash commands, suggested questions, and how answers arrive.
Purpose: Defines the composer's behavior, states, rules for answers and acceptance criteria, pending clinical and product validation, so design, engineering and the Conversational Clinical Data Agent team build the same thing.
-->

# PRD — Chat composer

**Product:** Intercept Live — Virtual Care OS  
**Module:** Provider Desktop (Single Pane of Glass) ★, "chat with the chart" (Spec §5.1, §6.14, §8.7)  
**Surface:** Ask Intercept Live, the chat panel; its message box is the **chat composer** (UCL `ChatComposer`)  
**Version:** 0.1  
**Status:** Draft — pending clinical and product validation  
**Last updated:** October 28, 2026

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
| **App header (patient context) · sparkle** | Opens the same panel from a patient's page. |
| **Patient Header · Ask Intercept** | Opens the same panel, about the patient on screen. |
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
| CC-UC-07 | Hands busy | The microphone dictates the question; voice starts a spoken conversation. ⚠️ **Gap:** not built (CC-031, CC-032). |

---

## 3. Anatomy

The composer is one box: a field on top, a toolbar under it. The commands menu opens above the box.

| Part | What it is | UCL |
|---|---|---|
| **Field** | Multi-line text, one line tall, growing with the text to 160px, then scrolling. Placeholder "How can I help?" | `ChatComposer` textarea; `placeholder`, `label` |
| **+ (Add attachment)** | Left of the toolbar. | `onAttach`; shown only with it |
| **/ (Commands)** | Next to +. Opens the commands menu. | `commands`; shown only with them |
| **Microphone (Dictate)** | Right of the toolbar. | `onDictate`; shown only with it |
| **Voice / Send / Stop** | The last button. Voice while the field is empty; Send once there's text; Stop while an answer is being written. | `onVoice`, `onSubmit`, `generating` + `onStop` |
| **Commands menu** | A list above the box: each command and what it does. | Built into `ChatComposer` |

ℹ️ The panel around the composer (heading, close, conversation) is the shell's (`AskInterceptPanel`), not part of UCL.

---

## 4. Requirements

### CC-010 — Field

- Placeholder: "How can I help?". The field's accessible name stays "Ask Intercept Live", since a placeholder disappears once the clinician types.
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
- With text already in the field, the commands button opens the menu without clearing it.

| Command | Does | Patient |
|---|---|---|
| **/summarize** | A patient's last 24 hours | Required |
| **/changes** | What changed in the last hour | Optional: the census without one |
| **/labs** | Latest labs, flagged, with previous values | Required |
| **/meds** | Medications: infusions, scheduled with what's due, as needed | Required |
| **/sepsis** | Sepsis criteria and bundle, or the values screening looks at if the patient isn't screened | Required |
| **/handoff** | A draft handoff in I-PASS (CC-022) | Required |

⚠️ **Decision needed:** the v1 command set, and whether commands vary by role (CC-OD-02). Spec §8.7's examples ("show me the sedation vacation and spontaneous breathing trials") suggest a /trend command with an overlay.

### CC-021 — Who a command or question is about

| The message names | It's about |
|---|---|
| A patient (last name, first name, or unit and bed: "MICU Bed 11") | That patient; up to three named patients are answered in turn |
| No one, on a patient's page | The patient on screen |
| No one, elsewhere | The census, narrowed by a hospital, a unit or "my patients" in the message |

- A command that needs a patient, with none named or on screen, asks: "Which patient? Add a name after the command, like **/labs Miller**, or open the patient first."
- An unknown command says so: "There's no **/foo** command. Type **/** to see the commands."

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

⚠️ **Gap:** not built. Dictation fills the field with the spoken question for the clinician to check before sending; it never sends by itself. ⚠️ **Decision needed:** which hospitals allow microphones, and push-to-talk (Spec §9.5, CC-OD-05).

### CC-032 — Voice conversation

⚠️ **Gap:** not built. A spoken conversation with the agent, answers read aloud. Same policy questions as CC-031, plus how a spoken answer cites its sources.

### CC-040 — Suggested questions

Shown under the greeting until the first question, as pills; picking one sends it.

| Where | Suggestions |
|---|---|
| **Census and other pages** | "Brief me for the start of my shift", "What happened overnight?", "Who needs attention first?", "What changed in the last hour?", "Which patients are sepsis candidates?" |
| **A patient's page** | "Summarize the last 24 hours", "What changed since I last looked?", "Show the sepsis criteria" |

⚠️ **Decision needed:** whether suggestions adapt to time of shift, role or what's open on the census (CC-OD-01).

### CC-041 — How answers arrive

| Moment | Behavior |
|---|---|
| **First open** | Once the panel has opened, Intercept greets the clinician, streaming: "Have a question about your patients? Just ask. Intercept Live helps you find the answers you need." |
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
| **Patient names stand out** | A patient's name is always bold, full ("**Miller, Sarah**") or first ("**Sarah**"). |
| **Readable** | Short paragraphs and lists; long lists stop at 8 with "…and 3 more". |
| **One tenant** | Answers only about patients the clinician has access to, in this tenant (PRD PD-AC-15). |

### CC-050 — Context

Each message goes to the agent with the page the clinician is on and the patient on screen, if any. ⚠️ **Gap:** the agent doesn't yet see which section is open (e.g. answering about the Timeline's crosshair moment).

---

## 5. States

| State | What the clinician sees |
|---|---|
| **Empty** | Placeholder, +, commands, microphone, voice |
| **Typing** | Text, Send |
| **Commands menu open** | The menu above the box; the commands button pressed |
| **Generating** | Stop instead of Send; the field still editable |
| **Disabled** | The whole box at 50%, nothing works (e.g. no access) |
| **Agent unavailable** | ⚠️ **Gap:** not built. The composer stays usable; the answer says the agent can't be reached and to try again, never a blank answer |
| **Offline** | ⚠️ **Gap:** not built. Send disabled with a reason, the typed question kept |

---

## 6. Accessibility

- The field is labeled "Ask Intercept Live"; with commands it's a combobox controlling the commands listbox, and the highlighted command is announced (`aria-activedescendant`).
- Every button has a name: "Add attachment", "Commands", "Dictate", "Start voice conversation", "Send", "Stop generating". The commands button says whether the menu is open.
- The conversation is a log: new messages are announced; an answer being written is busy, so it's read once, when done. Questions are prefixed "You:", answers "Intercept Live:" for screen readers.
- The whole box shows the focus ring while the field is focused.
- Everything works from the keyboard: Enter, Shift+Enter, ↑ ↓, Tab, Escape.

---

## 7. Motion

Per MOTION.md "AI answers": thinking is a soft opacity pulse; streaming arrives in uneven bursts of a few words; new messages and suggestions reveal in place; the commands menu fades and rises like the library's menus. Under reduced motion, answers appear whole, nothing pulses, and the menu only fades.

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
