# Intercept Live — Left Nav Spec

Nov 14, 2026 · @Albert Santalo

## Purpose and principles

The left nav is organized by workspace and by the clinician's workflow, not by the spec's 18 modules. The working reference is the [design canvas](https://claude.ai/artifact/Tz9Nq7hmCRoZFKxByB5J4Y); its Interactive screen is clickable. The current build is the [Storybook prototype](https://pulse-radar-f3dc3d.netlify.app/iframe.html?id=layouts-intercept-live-monitoring--default&viewMode=story&page=monitoring).

The nav follows these commitments from the [System Specification](https://docs.google.com/document/d/1NsVEa9I5FVICTeTnwsepF9LDIxTbcfW_2SGGIqbZQjI/edit):

- **Three workspaces, not eighteen modules (§9.2).** Clinical, Administration and Marketplace each have their own sidebar.
- **One workspace for clinicians (§9.1 #11).** Documentation, Orders and Alerting appear inside the patient chart, not as sidebar items.
- **What do I need to know, and nothing more (§9.1 #2).** Every sidebar item has to be worth its space on every shift.
- **One channel for notifications (§9.1 #10).** One Inbox, not separate alert queues.
- **Hospital is never a mode (§9.1 #1).** Hospital is a filter on a page, never a level of the nav.
- **Accessible from day one (§9.1 #13).** WCAG 2.1 AA, with a full keyboard path through the nav.

## Workspaces and the switcher

The switcher at the top of the sidebar changes the whole workspace. People with only one workspace never see it.

| Workspace | For | Lands on |
| --- | --- | --- |
| Clinical | Intensivists, APPs, Critical Care RNs | Monitoring |
| Administration | Operations staff at Intercept; admins and managers at hospitals | Operations (Intercept) or Overview (hospital) |
| Marketplace | Independent clinicians; hospitals requesting coverage; Intercept oversight | Open shifts (clinician) or Requests (hospital and Intercept) |

**What switching changes:** the sidebar's sections, the landing page, the ⌘K search hint and scope, and what Ask Intercept Live can see. Clinical uses the clinical data agent (§8.7); Administration and Marketplace use the operational data agent (§8.8).

**What switching does not change:** the hospital in view, which stays a filter on the page, or the user's home organization (§3). The switcher shows no organization name, so it doesn't look like an organization switch.

**Who sees what:**

| User type | Workspaces | Lands on | Sees switcher |
| --- | --- | --- | --- |
| Intensivist, APP, Critical Care RN | Clinical | Monitoring | No |
| Operations Lead who also covers APP shifts | Clinical, Administration, Marketplace | Administration → Operations | Yes |
| CMO or CNO with admin rights (§3.11) | Clinical, Administration | Monitoring | Yes |
| Independent clinician (§3.10) | Marketplace, Clinical (on booked shifts) | Marketplace → Open shifts | Yes |
| Hospital Client Administrator | Administration, Marketplace | Administration → Overview | Yes |
| System Administrator | Administration, Marketplace | Administration → Operations | Yes |

The menu lists each workspace with a one-line description. Marketplace carries a "Preview" tag while its Phase 2 scope is confirmed.

## Clinical workspace

Seven items in two groups, with Monitoring as the landing page. Ask Intercept Live sits above the groups (see that section).

| Group | Item | What it holds | Badge | Spec |
| --- | --- | --- | --- | --- |
| Shift work | Monitoring | Every patient the clinician covers, across hospitals. Cards and Waveforms are views of the same list. Replaces the separate Census and Monitoring pages. | — | §5.1, §5.2 |
| Shift work | Inbox | One queue: alerts to acknowledge, AI Scribe drafts to sign, suggested orders, failed EMR write-backs. Replaces Alert Queue. | Red count; critical items | §6.21, §5.6 |
| Shift work | Messages | Secure chat from every covered hospital, with replies routed back to the right system | Grey unread count | §5.3 |
| Shift work | Protocols › Virtual Sepsis | Tracking at the level of the protocol, across all patients. Virtual Sepsis is nested under Protocols and is the only protocol in v1. | — | §5.9, §5.10 |
| Reference | Patients | Directory of anyone ever treated, including patients no longer on the census | — | Decided June 2026 |
| Reference | Schedule | The clinician's own shifts across hospitals, plus an Open shifts tab | — | §5.15 |
| Reference | Analytics | The clinician's own clinical and documentation metrics | — | §5.11 |

Documentation and Support are pinned to the bottom of the sidebar.

**Default Monitoring view by role:** Waveforms for Critical Care RNs; Cards for intensivists and APPs (§9.1 #4). Clicking the logo returns to the role's default.

## Administration workspace

The sidebar depends on whose organization the user belongs to. Intercept staff run the whole network; a hospital's admins run only their own hospital. The first item is the landing page in both, so there is no separate Home.

**Intercept (Operations Lead, Scheduling and Support Coordinators, System Administrator):**

| Group | Item | What it holds | Spec |
| --- | --- | --- | --- |
| Operations | Operations | Shift state, call queues, clinician presence, pipeline and capacity in one view | §5.17, §3.5, §3.6 |
| Operations | Coverage | Network-wide coverage grid with eligibility rules applied; orange badge for unfilled gaps | §5.15 |
| Operations | Providers | Onboarding, credentialing, licensure and privileges matrix | §5.13, §5.14 |
| Operations | Hospitals | Hospital onboarding, configuration, integration status per hospital | §5.16 |
| Governance | Compliance | Compliance reporting and audit trails | §5.12 |
| Governance | System | Platform-wide configuration; tagged "Intercept only" | §5.7 |

**Hospital (Client Administrator; Client Manager sees the same items read-only):**

| Group | Item | What it holds | Spec |
| --- | --- | --- | --- |
| Hospital | Overview | Coverage, clinician engagement and open issues at their hospital | §3.8, §3.9 |
| Hospital | Clinician access | Which clinicians, Intercept's or their own, can see patient data at the facility | §5.8 |
| Hospital | Integrations | What data flows in and out, with approval and sign-off | §5.8 |
| Hospital | Protocols & alerts | Which protocols run and how alerts are configured | §5.8 |
| Governance | Compliance | Audit trails and compliance reporting for the hospital | §5.12 |
| Governance | Analytics | Clinical and operational analytics for the hospital | §5.11 |

The hospital sidebar is a proposal drawn from §3.8. It has not been reviewed with Intercept.

## Marketplace workspace

The Marketplace has two sides, clinicians who supply coverage and hospitals who need it, and each side gets its own sidebar (§5.18, §9.2). Intercept clinicians mostly reach it from inside the Clinical workspace instead (see "Not in the sidebar").

| Side | Items, in order | Lands on |
| --- | --- | --- |
| Independent clinician (§3.10) | Open shifts, My bookings, Schedule · Credentials, Earnings | Open shifts |
| Hospital requesting coverage | "New coverage request" button at the top, then Requests, Clinician network, Contracts & billing | Requests |
| Intercept oversight | Requests, Open shifts, Clinician network · Contracts & billing | Requests |

On the hospital side, "New coverage request" is a primary button rather than a sidebar item, because it's an action, not a place.

Open shifts lists only shifts the clinician is eligible for: licensed in that state, privileged at that hospital, credentials current (§6.7). Anything they can't take never appears.

## Ask Intercept Live

Ask Intercept Live opens a column next to the sidebar rather than a page, so it's available from every screen in every workspace.

- **Placement:** directly below the switcher, separated from the page items by a divider, so it reads as a panel to open rather than a place to go.
- **Two highlight styles:** open shows blue fill and a blue border; the current page shows white fill, a grey ring and a blue icon. The two must never look alike.
- **Knows what you're looking at:** the column shows a "Looking at" label, for example "Monitoring · All hospitals · 26 patients" or a single patient on a chart. Its suggested questions change with the workspace and page.
- **Shows its sources:** answers cite where their data came from and how fresh it is (§9.1 #6, #9).
- **One column only:** the Ask icon in the patient header must open this same column, not a second chat.
- **Shortcut:** add a keyboard shortcut; the key is not chosen yet.

## Header elements that work with the nav

| Element | Behavior |
| --- | --- |
| ⌘K search | A search field that's always visible, opened with ⌘K. What it searches follows the workspace: patients, notes, orders and messages in Clinical; providers, hospitals and shifts in Administration; shifts, clinicians and requests in Marketplace. Clinicians are searchable from Clinical to find a specialist without a patient. (§6.9) |
| Census column | A list of the clinician's patients that opens from the third header icon, for jumping between patients without leaving the chart. Show it mainly on the patient chart; on Monitoring it repeats the page, so it is off by default there. |
| Status and user | Online status, the user's name, and time left in the shift. |

## States and behavior

| State | Spec |
| --- | --- |
| Expanded | 240 px wide; an icon and label per item; dividers between groups; Documentation and Support pinned to the bottom |
| Collapsed | 64 px icon rail; 44 × 44 px hit areas; a label tooltip on hover and focus; badges on the icons stay visible |
| Current page | White fill, grey ring, blue icon, semibold label, `aria-current="page"`. Must show in both expanded and collapsed states; today's build shows no current page when collapsed. |
| Ask Intercept Live open | Blue fill and border, `aria-pressed="true"` |
| Hover | Light grey fill |
| Nested item (Virtual Sepsis) | Indented under its parent, smaller type, gets its own current-page state |
| Badge: red | A count that includes critical items (Inbox) |
| Badge: grey | An unread count (Messages) |
| Badge: orange | Needs attention, not urgent (Coverage gaps) |
| Tag | Small outlined label for scope or status: "Intercept only", "Preview" |
| Single-workspace user | No switcher; the sidebar starts at Ask Intercept Live |

**Accessibility:** every item is a real link or button; icon-only items carry a label for screen readers; the whole sidebar works by keyboard (Tab and arrow keys, Enter to open, Esc to close the switcher menu); text meets 4.5:1 contrast, including grey labels and badges.

**Recommended:** remember each user's collapsed or expanded choice.

## Not in the sidebar, and where it lives

| Item from the current build or a common request | Where it lives instead | Why |
| --- | --- | --- |
| Census as a page | Merged into Monitoring; the census is the header column | Census and Monitoring showed the same 26 patients |
| Alert Queue | Inbox | Three alert surfaces disagreed on the count; §6.21 calls for one queue |
| Documentation, Orders | Tabs in the patient chart | Clinicians document and order about a patient (§9.1 #11) |
| Home | None; Monitoring is the landing page | A dashboard would repeat Monitoring, Inbox and Schedule one click earlier |
| Start-of-shift handoff | A one-time briefing shown on top of Monitoring at sign-in: patients handed over, open clinician concern flags, items waiting in the Inbox | §5.1 shift lifecycle; §3.3 handoff; §5.6 concern flags carry over between shifts |
| Compliance, Administration | Administration workspace | Not clinical work (§9.2) |
| Marketplace as an item | Its own workspace, plus entry points in context: Schedule › Open shifts, the patient chart's "Request specialist," Coverage › "Post to Marketplace" | Clinicians shouldn't switch workspaces to pick up a shift or get a consult |
| Find a specialist | "Request specialist" in the patient chart, filtered to clinicians eligible for that patient's state and hospital; ⌘K when there's no patient | Getting a consult starts from the patient |
| Prototype menu | Hidden whenever screens or video are captured | Must not appear in grant materials |

## Open questions

**For Intercept:**

- [ ] Is §5.18 Marketplace still in Phase 2 scope? This decides whether it ships as "Preview" or stays hidden.
- [ ] Can a clinician start a paid outside consult, or must the hospital's Client Admin turn it on for their hospital first?
- [ ] Confirm the hospital Administration sidebar (Overview, Clinician access, Integrations, Protocols & alerts, Compliance, Analytics).
- [ ] Check the default Monitoring view per role (Waveforms for RNs, Cards for intensivists) with clinicians.

**For design:**

- [ ] How wide is the Ask Intercept Live column, and does opening it collapse the sidebar?
- [ ] Should the census column appear only on the patient chart, or anywhere but default to off on Monitoring?
- [ ] Pick the keyboard shortcut for Ask Intercept Live.
- [ ] Replace the placeholder badge counts on the canvas (Inbox 8, Coverage 2) with real dummy data.
