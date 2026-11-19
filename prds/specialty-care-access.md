---
requirements: [SC-01, SC-02, SC-03, SC-04, SC-05, SC-06, SC-07, SC-08, SC-09, SC-10, SC-11, BR-11, BR-12, WF-07, OBJ-3, OBJ-4, A-02, Q-05, D-12]
status: proposed — confirm with Albert and Intercept
---

<!--
Created: Nov 19, 2026
Created by: Julio Caunedo
Last updated: Nov 19, 2026 (Created)
Scope: Specialty Care Access in Intercept Live: the on-demand specialist consult end to end. Requesting it, matching eligible specialists, the specialist's side, the consult session with imaging review, the structured recommendation back to the requesting clinician, and the Marketplace view of consults. Nothing is designed or built yet; Patient details' Create › Request specialist (PD-014) is its only entry today.
Purpose: The Design Phase brief asks us to write this module's specification as well as design it (SC-10), because the System Specification covers it only at concept depth (§5.18). This PRD is that specification's first draft, for Albert and Intercept to validate before the screens are designed.
-->

# PRD — Specialty Care Access

**Product:** Intercept Live — Virtual Care OS  
**Module:** Specialty Care Access (requirements spec §5.10; System Specification §5.18 Marketplace, the "on-demand specialist consultation" transaction, and §3.10 Independent Clinician)  
**Name:** **Specialist consult** (the UI's name for one consult); **Specialty Care Access** is the module  
**Surface:** the request form from a patient's page or a video consult; the patient page's Specialist consult panel; the specialist's consult workspace; the Marketplace workspace's Requests  
**Audience:** Intensivists and APPs, who request consults; the specialist, for one consult; Critical Care RNs see the packet and join the session. The hospital clinician of record, the bedside nurse and the family take part with no Intercept screen  
**Version:** 0.1  
**Status:** Draft — not yet designed or built; pending validation with Albert and Intercept  
**Last updated:** November 19, 2026

---

## 1. Overview

A rural or community hospital often has no neurologist, cardiologist or psychiatrist on site. A specialist consult brings one to the patient through Intercept Live: the clinician asks for a specialty, the platform shows only specialists who are allowed to treat this patient, one accepts, joins a video session at the bedside with the patient's data and images in front of them, and sends back a structured recommendation the requesting clinician can act on.

The System Specification describes this at concept depth: the request, routing to eligible specialists, "the first available specialist accepts", a telepresence session with imaging review, and "structured order recommendations flowing back to the requesting hospital's clinician of record" (§5.18). The requirements spec turns it into SC-01 to SC-11. This PRD defines the experience around them.

ℹ️ Everything traced to a requirement ID in the tables below is confirmed in the requirements spec. Rows marked **Proposed** are this draft's proposals, for review.

### 1.1 What this PRD owns, and what it uses

| Topic | Owned by | This PRD |
|---|---|---|
| The Create menu and its **Request specialist** item | PRD Patient details PD-014 | What Request specialist opens (SCA-010) |
| The video call, its tile and the AI Notetaker | PRD Video consult VID-001–VID-019 | Uses them for the session; adds the specialist and imaging review (SCA-040–SCA-045) |
| The bedside camera session and calling the bedside nurse | PRD Bedside camera CAM-001, CAM-007 | Uses it for the bedside end of the session |
| Proposed orders, accepting them, write-back and co-sign | PRD Patient details (Orders) | Sends the specialist's order suggestions there as proposed (SCA-052) |
| Notes, signing and write-back | PRD Notes | Files the specialist's consult note there (SCA-053) |
| The Marketplace workspace and its sidebar | PRD Sidebar NAV-022 | Adds consults to Requests (SCA-070) |
| The overflow offer during a surge | DU-15, PRD Alert maximized modal | Can offer a specialist as well as the backup intensivist (SCA-014) |

### 1.2 Out of scope

| Experience | Why | Where |
|---|---|---|
| **Shift coverage** in the Marketplace | The Marketplace's other transaction type; this module is the consult | System Specification §5.18; PRD Sidebar NAV-022 |
| **Pricing, booking fees, take rate, settlement, earnings** | Not shown in this phase (SC-09) | 2027 Marketplace build |
| **Specialist registration and credentialing** | Self-registration, primary source verification, licenses and privileges are maintained in Credentialing | System Specification §5.13, §5.14 (deferred modules) |
| **A hospital calling the hub** (Consult request) | A hospital asking Intercept's intensivist for a video consult; not a specialist | PRD Bedside camera CAM-017; glossary "Consult request" |
| **Transfer to a receiving center** | The transfer packet and door-in-door-out time | PRD Alert maximized modal (keep or transfer); Scenario 5 step 4 |
| **Family update** outside a consult | A message to the family about the patient's day | CC-08, DU-26 |

### 1.3 Source documents

1. Intercept Live Design Phase Team Brief (`documents/Intercept Live Design Phase Team Brief.md`): Specialty Care Access is in scope at the highest prototype fidelity, and its specification is a deliverable.
2. Intercept Live — Virtual Care OS System Specification (`documents/Intercept Live - Virtual Care OS - System Specifications.md`): §5.18 Marketplace (on-demand specialist consultation, Marketplace Curators, patient-side participants), §3.10 Independent Clinician, §6.7 Eligibility Rules Engine.
3. Requirements specification snapshot (`documents/specs/requirements-specification.md`): SC-01–SC-11, BR-11, BR-12, WF-07, the Specialist row of §4 (roles), OBJ-3, OBJ-4, A-02, Q-05, D-12; Act 3 of the proposed scenario baseline (P-DEC-20: "surge night (S5 + Specialty Care Access)").
4. Design update spec snapshot (`documents/specs/design-update-spec.md`): DU-27 (new layout: specialist consult), DU-15 (overflow offer), DU-21 (post-thrombolysis surveillance).
5. InterceptLIVE Demo Use Cases (`documents/scenarios/`): Scenario 5 (Walter and Linda, surge night; Linda's stroke at Sidney ED).
6. PRD Patient details (PD-014), PRD Video consult, PRD Bedside camera, PRD Sidebar (NAV-022), PRD Notes.

---

## 2. Users and use cases

| User | Use case |
|---|---|
| **Intercept intensivist or APP** (the requesting clinician) | Asks for a specialist for a patient they cover, picks one from the eligible list, runs the session with the bedside, reviews the recommendation and accepts, edits or declines each order suggestion. |
| **Hospital clinician of record** (an ED physician, a hospitalist) | Asks for a consult from their own EHR by placing a consult order (SC-11). Receives the recommendation in their EHR. Doesn't use Intercept's screens. |
| **Specialist** (an Independent Clinician, §3.10, or a contracted specialty group) | Gets an offer, accepts or declines it, reviews the consult packet and the images, joins the session, and returns a structured recommendation and a signed consult note. Sees only that one consult (§4 roles: "Browse the census" is what a specialist can't do). |
| **Bedside nurse** (at the client hospital) | Brings the camera cart to the patient, confirms they're ready, and takes part in the session at the bedside. No Intercept screen (D-12). |
| **Patient's family or representative** | May consent to the consult, join the session or receive its summary, for that consult only (§5.18 "encounter-scoped"). 🙋 **Open question:** whether the prototype shows this (Q-05, D-12). |
| **Marketplace Curator** (Intercept or hospital side) | Reviews a match before it's routed, where a hospital has no standing arrangement with the specialist (§5.18). ⚠️ **Decision needed:** whether the prototype shows curation (SCA-OD-04). |

**The demo's consult.** ✅ **Resolved:** Scenario 5 (Act 3) shows it with Linda's stroke at Sidney ED. After the overflow sends her to Intercept's backup intensivist, the backup intensivist requests **tele-stroke neurology**; the neurologist reviews her CT and CT angiogram, joins at the bedside, and recommends thrombolysis and transfer for thrombectomy. Act 3 already pairs Scenario 5 with Specialty Care Access, so this keeps it to one story and adds no seventh scenario. ⚠️ **Gap:** Scenario 5's storyboard and sample data don't include the neurologist yet.

---

## 3. Where a consult starts

| Entry point | Who | Opens | Source |
|---|---|---|---|
| Patient page › **+** (Create) › **Request specialist** | Intensivist, APP | The request form (SCA-010), for this patient | SC-01; PD-014 |
| A video consult or Look in, the call's **Request specialist** | Intensivist, APP | The request form; the session the specialist joins is this call | SC-01 |
| Alert panel, the overflow offer during a surge | Intensivist | An offer to route the alert to the backup intensivist or to an eligible specialist (SCA-014) | DU-15 |
| A consult order in the hospital's EHR ("Inpatient Consult to Neurology") | Hospital clinician of record | A consult created on its own, already Requested; changes and cancellations in the EHR follow it | SC-11 |
| Ask Intercept Live ("get neurology on Linda") | Intensivist, APP | The request form, filled in from the conversation, for the clinician to review and send | Proposed |

The request form never sends itself: every way in ends at the form, with the clinician's **Send request** (SCA-013).

---

## 4. Requirements

### 4.1 Requesting a consult

| ID | Requirement | Detail | Source |
|---|---|---|---|
| SCA-010 | **The request form** | Opens beside the patient's page, the patient already named. Asks for the **specialty**, the **urgency** and the **question** for the specialist. Shows the patient's hospital and the state it's in, because eligibility depends on them. | SC-01; DU-27 |
| SCA-011 | **Specialty** | One specialty per consult, from those the network covers: Neurology (tele-stroke), Cardiology, Psychiatry, Infectious disease, Endocrinology, Nephrology. ⚠️ **Assumption:** this list, taken from §3.10 and §5.18's examples; Q-05 asks Intercept which specialties are in scope. | SC-01; Q-05 |
| SCA-012 | **Urgency** | **Emergent** (minutes: a stroke code), **Urgent** (within the hour), **Routine** (today). Urgency sets how the specialist is reached (SCA-021) and how long the offer waits before it moves on (SCA-024). ⚠️ **Assumption:** these three levels and their meaning; nothing defines them yet. | SC-01; Proposed |
| SCA-013 | **The question and the packet** | The question is written in the clinician's words ("Possible LVO, NIHSS 14, last known well 21:40. Thrombolysis and thrombectomy candidacy?"). Under it, the **consult packet**: what the specialist will see (SCA-030), each part with a checkbox, all checked by default. Intercept Live drafts the question and picks the packet's parts from the chart (SCA-080); the clinician edits both. **Send request** sends it; nothing is sent before. | SC-01; Proposed |
| SCA-014 | **The overflow offer** | When two serious alerts reach one intensivist at once, the offer can include an eligible specialist next to the backup intensivist (DU-15). Choosing the specialist opens the request form for that patient with the alert's data in the packet. | DU-15; Proposed |
| SCA-015 | **From the hospital's EHR** | A consult order placed in the hospital's EHR creates the consult as Requested, with the ordering clinician as the clinician of record and the order's reason as the question. A change to the order updates the consult; a cancellation cancels it (SCA-063). Outside the ICU, before the session connects, the platform asks the nurses' station to confirm the camera cart and the patient are ready. | SC-11 |

### 4.2 Finding a specialist

| ID | Requirement | Detail | Source |
|---|---|---|---|
| SCA-020 | **Who is eligible** | A specialist is eligible only when they're **licensed in the patient's state**, **privileged at the patient's hospital** and **board-certified in the specialty**. All three, always: a specialist missing one is never offered, whatever the urgency. | BR-12 |
| SCA-021 | **The eligible list** | After Send request, the form shows the eligible specialists as profile cards, ranked: photo, name, specialty, board certification, "Licensed in Nebraska", "Privileged at Sidney Regional", and availability ("Available now", "In a consult · free in about 20 min", "Off until 7:00 AM"). No price or rate anywhere (SC-09). | SC-02; SC-09 |
| SCA-022 | **Who isn't eligible, and why** | Under the list, a folded line, "3 specialists not eligible", opens each one with the reason ("Not licensed in Nebraska", "No privileges at Sidney Regional"). So the clinician knows the list isn't short by accident. | DU-27 |
| SCA-023 | **Choosing** | **Emergent** goes to every available eligible specialist at once, and the first to accept takes it: in a stroke code, minutes matter more than the choice. **Urgent** and **Routine** let the clinician pick one (**Request** on a card), with the next ranked as fallback. ✅ **Resolved:** both of the sources' models, by urgency: the requirements spec has the clinician pick (SC-02, WF-07), §5.18 has the first to accept take it. | SC-02; WF-07; §5.18 |
| SCA-024 | **Waiting for an answer** | The consult shows who has the offer and for how long ("Offered to Dr. Karen Mitchell · 1:42"). If they decline, or don't answer in time, the offer moves to the next eligible specialist and the clinician sees it move. ⚠️ **Assumption:** the wait before it moves: 2 min Emergent, 10 min Urgent, 30 min Routine. | SC-05; Proposed |
| SCA-025 | **Ranking** | ⚠️ **Decision needed (SCA-OD-03):** what orders the eligible list. Recommended: available now first; then specialists who have consulted at this hospital before; then their typical time to accept. Each card says why it's where it is when that isn't availability ("Consulted at Sidney Regional 4 times"). | SC-02; Proposed |
| SCA-026 | **Nobody available** | With no eligible specialist, or none accepting in time, the consult says so ("No neurologist is available for Sidney Regional right now") and offers what's left: try again, change the urgency, or start a transfer (PRD Alert maximized modal, keep or transfer). It never offers an ineligible specialist. | Proposed |

### 4.3 The specialist's side

| ID | Requirement | Detail | Source |
|---|---|---|---|
| SCA-030 | **The consult packet** | What the specialist sees once they accept: the patient (name, age, sex, MRN), the hospital, unit and bed, the question and the urgency, the requesting clinician and how to reach them, and the parts the clinician left checked: the latest vitals and their trend, labs, medications and allergies, imaging studies with their reports, relevant notes, and for a stroke the last known well time and NIHSS. Each item says where it came from and how old it is. | SC-07; Proposed |
| SCA-031 | **The offer** | Before accepting, the specialist sees only what they need to decide: specialty, urgency, hospital and state, the patient's age and sex, and the question. No name or record until they accept. **Accept** or **Decline**, with a reason for declining ("In another consult", "Outside my scope"). Emergent offers ring, like an incoming call. ⚠️ **Assumption:** identity is held back until acceptance, as the minimum the specialist needs to decide. | SC-07; Proposed |
| SCA-032 | **Only this consult** | A specialist sees the patients of their accepted consults and nothing else: no census, no other patient, no hospital list. Access ends when the consult closes; afterward they can read their own recommendation and note, not the patient's record. | §4 roles; §5.18 |
| SCA-033 | **Where the specialist works** | The specialist's consults live in the Marketplace workspace, with the offers waiting and the consults under way. ⚠️ **Decision needed (SCA-OD-05):** PRD Sidebar's independent clinician side lists only shift items (Open shifts, My bookings). Recommended: a **Consults** item, first, for specialists who take consults. | SC-07; NAV-022 |

### 4.4 The session

| ID | Requirement | Detail | Source |
|---|---|---|---|
| SCA-040 | **Who's in it** | The specialist, the requesting clinician and the bedside, through the room's camera or the camera cart. It's a video consult (PRD Video consult) with a third party: the specialist's video sits beside the bedside's. | SC-03 |
| SCA-041 | **Starting it** | Once the specialist accepts, either side can start the session when ready. If it started from a video consult (SCA-010's second entry), the specialist joins that call. Outside the ICU, the cart check (SCA-015) comes first. | SC-03; SC-11 |
| SCA-042 | **Imaging review** | A panel in the session with the patient's studies (CT head, CT angiogram, chest X-ray, echo), each with its report when there is one. Opening a study shows it to both the specialist and the requesting clinician. ⚠️ **Assumption:** both see the same image while it's open, so they can talk about it. In the prototype the images are synthetic. | SC-06 |
| SCA-043 | **The specialist's note** | The AI Notetaker drafts the specialist's consult note from the session, with the same consent rule as any video consult (PRD Bedside camera CAM-008a). The specialist is the note's author and signs it. | Proposed; VID-010 |
| SCA-044 | **Family in the session** | 🙋 **Open question:** (SCA-OD-06) whether family or a representative can be invited into the session, and whether they consent to the consult. §5.18 makes it a first-class part of the consult; Q-05 and D-12 leave it to the scenarios. | §5.18; Q-05; D-12 |
| SCA-045 | **In the prototype** | The specialist's video is prerecorded and plays beside the live bedside view, so the demo needs no second clinician. | SC-03 |

### 4.5 The recommendation

| ID | Requirement | Detail | Source |
|---|---|---|---|
| SCA-050 | **What it holds** | **Impression** (a few sentences), **Recommendations** (a list, each one an order, a monitoring step, a follow-up or a disposition), **Disposition** (keep at this hospital, transfer, or follow up as an outpatient) and **Follow-up** (whether the specialist will see the patient again, and when). Signed by the specialist. | SC-04; Proposed |
| SCA-051 | **Delivering it** | The specialist sends it with **Deliver recommendation**. The requesting clinician gets it at once: an Inbox item, a toast if they're in Intercept Live, and the patient page's Specialist consult panel (SCA-060). | SC-04; SC-05 |
| SCA-052 | **Order suggestions** | Each recommended order goes to the patient's Orders as **proposed**, marked "Recommended by Dr. Karen Mitchell, Neurology". The requesting clinician accepts, edits or declines each one; nothing is ordered until they do. An APP's accepted order follows the co-sign rule (BR-11). | SC-04; BR-11 |
| SCA-053 | **The note in the chart** | The signed consult note goes to the patient's Notes as a **Specialist consult** note. Write-back to the hospital's EHR follows the hospital's setup, as for any note (PRD Notes). For a consult ordered from the EHR (SCA-015), the recommendation returns to the clinician of record there. | SC-04; SC-11 |
| SCA-054 | **Reviewing it** | The requesting clinician marks the recommendation reviewed once every order suggestion is accepted, edited or declined. The consult then closes (SCA-061). | SC-05; Proposed |

### 4.6 Following a consult

| ID | Requirement | Detail | Source |
|---|---|---|---|
| SCA-060 | **The Specialist consult panel** | On the patient's page, the consult's status, the specialist once matched, the session, and the recommendation once delivered. It opens from the consult's line in the patient's Activity and from its Inbox item. | SC-05; Proposed |
| SCA-061 | **The consult's status** | Every consult is in one of the statuses in §5 at a time, and moves through them in order; only Cancelled and No specialist available end it early. | SC-05 |
| SCA-062 | **One status everywhere** | The patient's page, the Inbox, the specialist's workspace and the Marketplace's Requests all show the same status for a consult, updated together. | Proposed |
| SCA-063 | **Cancelling** | The requesting clinician can cancel a consult until it's In session, with a reason. The specialist, if matched, is told. A consult ordered from the EHR cancels when its order is cancelled there. | SC-11; Proposed |
| SCA-064 | **The record** | Each step goes into the patient's Activity with who and when: requested, offered, accepted or declined, session started and ended, recommendation delivered, each order suggestion accepted, edited or declined, closed. | Proposed |

### 4.7 The Marketplace view

| ID | Requirement | Detail | Source |
|---|---|---|---|
| SCA-070 | **Requests** | Marketplace › Requests lists consults next to coverage requests, each with the specialty, the hospital, the urgency, the status and how long it has waited. A hospital sees its own; Intercept oversight sees every one in the network. | NAV-022; Proposed |
| SCA-071 | **Network view** | A read-only view of the specialist network: specialists by specialty, the states they're licensed in and the hospitals they're privileged at. No rates or earnings (SC-09). Nice to have. | SC-08; SC-09 |

### 4.8 What Intercept Live's AI does

| ID | It | What, and the limit | Source |
|---|---|---|---|
| SCA-080 | Prepares | Drafts the question and picks the packet's parts from the chart, for the clinician to edit. Never sends the request. | Proposed |
| SCA-081 | Recommends | Ranks the eligible specialists and says why. Eligibility itself (SCA-020) is a rule, not a judgment: the AI never offers a specialist the rule excludes, and never hides one it includes. | BR-12; Proposed |
| SCA-082 | Generates | The AI Notetaker drafts the specialist's note (SCA-043); the specialist edits and signs it. | Proposed |
| SCA-083 | Never | Places an order, sends a recommendation, accepts an offer or closes a consult on anyone's behalf. Each of those is a person's action. | OBJ-2; Proposed |

---

## 5. States

| Status | Means | The requesting clinician sees | The specialist sees |
|---|---|---|---|
| **Requested** | Sent; the platform is finding eligible specialists | "Finding a neurologist…" and the eligible list as it fills | — |
| **Matched** | Offered to a specialist, waiting for their answer | Who has the offer and for how long (SCA-024) | The offer (SCA-031) |
| **Accepted** | A specialist accepted and is reviewing the packet | The specialist's card, "Reviewing the packet", **Start session** | The packet, **Start session** |
| **In session** | The session is live | The session with imaging review | The session with imaging review and the note's draft |
| **Delivered** | The recommendation is back | The recommendation and its order suggestions to decide | Their recommendation, read only |
| **Closed** | The requesting clinician reviewed it | A summary in the Activity and Notes | Their recommendation and note, read only |
| **Cancelled** | Cancelled before the session | Who cancelled and why | "Cancelled by the requesting clinician" |
| **No specialist available** | Nobody eligible accepted in time | What's left to do (SCA-026) | — |

ℹ️ Requested → Matched → Accepted → In session → Delivered → Closed is SC-05's lifecycle. Cancelled and No specialist available are this draft's additions.

---

## 6. Who can do what

| Action | Intensivist | APP | Critical care RN | Specialist | Hospital clinician of record |
|---|---|---|---|---|---|
| Request a consult | ✓ | ✓ | — | — | ✓ (EHR order) |
| See the eligible list and choose | ✓ | ✓ | — | — | — |
| Accept or decline an offer | — | — | — | ✓ | — |
| See the consult packet | ✓ | ✓ | ✓ | ✓ once accepted | — |
| Join the session | ✓ | ✓ | ✓ | ✓ | At the bedside |
| Deliver the recommendation | — | — | — | ✓ | — |
| Accept an order suggestion | ✓ | ✓, with co-sign where required (BR-11) | — | — | In their EHR |
| Cancel the consult | ✓ | ✓ | — | — | ✓ (cancel the order) |

ℹ️ The specialist's rights come from the requirements spec's roles table (§4); the rest of this table is proposed.

⚠️ **Assumption:** an APP can request a consult. The roles table lists "request consults" for the intensivist and gives the APP the intensivist's rights apart from supervised orders.

---

## 7. Accessibility

- An Emergent offer that rings is also announced to screen readers ("Emergent neurology consult, Sidney Regional"), with Accept and Decline reachable by keyboard, and it stops ringing when either is chosen.
- Each specialist card's eligibility is in words ("Licensed in Nebraska"), not only a check mark.
- Status changes are announced where the clinician is: "Dr. Karen Mitchell accepted", "Recommendation delivered".
- The offer's countdown can be read as text ("1 min 42 s left") and isn't the only sign the offer will move on.

---

## 8. Acceptance criteria

| ID | Given | When | Then |
|---|---|---|---|
| SCA-AC-01 | Linda's patient page | The intensivist opens + › Request specialist | The request form opens with Linda named, her hospital and its state shown, and a drafted question and packet to edit |
| SCA-AC-02 | The request form filled in | The intensivist clicks Send request | The consult is Requested and the eligible neurologists show as cards; none shows a price |
| SCA-AC-03 | A neurologist licensed in Nebraska but not privileged at Sidney Regional | The eligible list shows | They're not among the cards; "Not eligible" lists them with "No privileges at Sidney Regional" |
| SCA-AC-04 | An Emergent consult offered | The specialist doesn't answer in the wait time | The offer moves to the next eligible specialist and the requesting clinician sees it move |
| SCA-AC-05 | An offer before acceptance | The specialist opens it | They see the specialty, urgency, hospital, state, age, sex and question, not the patient's name or record |
| SCA-AC-06 | The specialist accepted | They open the consult | The packet shows the checked parts, each with its source and age |
| SCA-AC-07 | The session is live | Either side opens the CT angiogram | Both see the same study, with its report |
| SCA-AC-08 | The specialist delivers a recommendation with two orders | The requesting clinician opens it | The two orders are proposed in Orders, marked as recommended by the specialist; nothing is ordered |
| SCA-AC-09 | An APP accepts a recommended order that needs supervision | — | The order waits for the intensivist's co-sign |
| SCA-AC-10 | Every order suggestion decided | The clinician marks the recommendation reviewed | The consult is Closed, and its note is in Notes as a Specialist consult note |
| SCA-AC-11 | A consult that's Accepted | The requesting clinician cancels it with a reason | It's Cancelled, the specialist sees who cancelled and why, and Activity records it |
| SCA-AC-12 | A consult ordered in the hospital's EHR | The order is cancelled there | The consult is Cancelled |
| SCA-AC-13 | A specialist's consult closed | They look for the patient | They can read their recommendation and note, and can't open the patient's record or any other patient |
| SCA-AC-14 | No eligible neurologist available | The intensivist sends the request | "No neurologist is available for Sidney Regional right now", with try again, change urgency and start a transfer |

---

## 9. Open decisions

| ID | Topic | Decision needed |
|---|---|---|
| SCA-OD-01 | **The demo's consult** | ✅ **Resolved:** Linda in Scenario 5 (Act 3), tele-stroke neurology, after the overflow (§2). |
| SCA-OD-02 | **Picking or first to accept** | ✅ **Resolved:** by urgency: first to accept for Emergent, the clinician picks for Urgent and Routine (SCA-023). |
| SCA-OD-03 | 🙋 **Ranking** | What orders the eligible list. Recommended: available now, then experience at this hospital, then typical time to accept (SCA-025). |
| SCA-OD-04 | 🙋 **Curation** | Whether a Marketplace Curator approves a match before it's routed, for hospitals with no standing arrangement (§5.18), and whether the prototype shows it. Recommended: leave it out of the prototype and keep a status for it in the design. |
| SCA-OD-05 | 🙋 **The specialist's place in the Sidebar** | A Consults item in the independent clinician's Marketplace sidebar (SCA-033). Changes PRD Sidebar NAV-022. |
| SCA-OD-06 | 🙋 **Family** | Whether family or a representative can consent to, join or receive the consult (SCA-044; Q-05, D-12). |
| SCA-OD-07 | 🙋 **Specialties** | Which specialties the network covers (SCA-011; Q-05). |
| SCA-OD-08 | 🙋 **Urgency and wait times** | The three urgency levels and how long an offer waits before it moves (SCA-012, SCA-024). |
| SCA-OD-09 | 🙋 **ID prefix** | `SCA-`, `SCA-AC-` and `SCA-OD-` are new repo-local IDs (`SC-` is Cowork's), to confirm with the team. |
| SCA-OD-10 | **One label for the entry** | ✅ **Resolved:** **Request specialist** everywhere (the Create menu, PRD Sidebar NAV-070), because "consult request" already names a hospital calling the hub (glossary). |

---

## 10. Design and code

Nothing is designed or built yet. The only entry today is Patient details' Create › Request specialist, which the app receives (`consult-request`) and doesn't act on yet (PRD Patient details PD-014). No Figma frame exists for this module.
