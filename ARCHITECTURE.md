# Architecture

How each app's reference layouts in `src/layouts/` are wired: which file does what, how the pieces connect, and which files are sample data. One section per app. Read an app's section before working on its layouts, and update it in the same change when the wiring changes.

What's elsewhere:

| Looking for | Go to |
| --- | --- |
| Why something looks or behaves as it does; Figma ↔ code decisions | DESIGN.md (e.g. "Intercept Live") |
| What the product should do | `prds/` (Patient card, Monitoring, Patient details, Chat composer) |
| Repo-wide layout rules (where layouts live, sample data, not exported) | CLAUDE.md "Architecture", "Sample Data" |
| UCL component APIs | CLAUDE.md "Current Component APIs" |

## Intercept Live

Paths in this section are relative to `src/layouts/intercept-live/`.

### The shell

`intercept-live.tsx` (`InterceptLive`) is the app frame every screen shares: the Sidebar, the canvas with the sticky AppHeader, page switching, theme and clock. It takes `pages`, the content for each Sidebar item; a page a layout doesn't pass shows its title and an empty state. It opens on Monitoring, the Sidebar's first page and the app's default, unless `defaultPage` says otherwise; both layouts (`census.tsx`, `monitoring.tsx`) pass theirs through, so they open on Monitoring too. The Census and Patient details stories pass `defaultPage: "Census"`.

| Part | File | Notes |
| --- | --- | --- |
| Shell | `intercept-live.tsx` | Owns which page is shown, which patient is open and which side panels are open, and their widths. Renders the app's `Toaster` (hidden while the alert modal, a patient's page or a page panel that asks for it is open), and its `children` (the layout's `AlertToasts`) inside its patient navigation |
| Sidebar state | `use-layout-sidebar.ts` | `useLayoutSidebar()`: whether the Sidebar is collapsed. Collapsed by default, and on its own at `lg` (1024) and below (DESIGN.md "Sidebar auto-collapses at lg and below") |
| Patient navigation | `patient-navigation.tsx` | `usePatientNavigation()`: the context the pages use to open a patient (`openPatient(id, list)`) or one of their alerts (`openAlert(id, alertId, { consult })`: a monitoring card's alert bar, its menu's Video consult (`consult`: the call already ringing) and the toast's maximize button; the alert modal when the layout passes `alertDetails`, else the patient's details), and to read whether the header is compact and whether a patient is open |
| Page preferences | `page-preferences.tsx` | `usePagePreferences()`: view choices the shell keeps across pages, so switching pages keeps them. Today Group by hospital (`groupByHospital`, `onGroupByHospitalChange`, read by `useGrouping`), each page's sort (`sortBy`, `useSortBy`) and My patients (`scope`, `usePatientScope`), all in `shared/patient-panel.tsx`, plus `currentPage`, the page on screen. The alert toasts read My patients from here Outside the shell each page keeps its own |
| Side panel | `side-panel.tsx` | `SidePanel`: slides open, resizes from the canvas edge, header with an optional `description`. Every panel below uses it |
| Ask Intercept Live | `ask-intercept-panel.tsx` | The global chat, on the left. Toggled from the Sidebar's Ask Intercept Live and, on a patient's page, the app header's sparkle. Its message box is UCL's `ChatComposer`; answers come from `InterceptLive`'s `askIntercept` prop. Opened from a patient's app header button, the chat is about that patient (the shell's `chatPatient`; an "About {patient} ×" chip over the message box, and the button filled) until the chip is removed, the chat closes or another patient opens; from the Sidebar it's general. Ask in an alert toast calls `askAboutPatient(id, name)` (`patient-navigation.tsx`): the chat opens about that patient on any page, without opening their details, and asks "Quick overview" for the clinician (the panel's `opener`; a conversation about anyone or anything else is cleared first and the greeting skipped, so the question is the first message; one already about this patient goes on, and the question scrolls to the top of the view), which the sample responder answers with the patient at a glance (conditions, oxygen, vitals, score and its 24 h change). Right after the patient's score crosses into its alert band (Scenario 1), it leads with why they're #1 (`rankingFor`: rank and the alert's reason line explained) and their history and labs (`consultFor`: home meds, last echo, creatinine trend, BNP). `askInterceptNotice` posts alert updates ("Alert update: …"), whole, once per `id`, in a grey box, only while the conversation is about alerts: an answer's `followAlerts` turns them on, the next question about something else off |
| Patient list | `patient-list-panel.tsx` | `PatientListPanel`, the patient switcher, on the left. Opened by the app header's list button on a patient's page. Takes turns with the chat: one is open at a time |
| Page panel | `PagePanel` (in `side-panel.tsx`) | A page's own panel on the right, e.g. the live feed. `useHideToasts(open)` hides the shell's toasts while it's open (the live feed calls it); the shell provides the setter (`PageHidesToastsProvider`) |
| Sidebar alert dot | `intercept-live.tsx` (`navAlerts`), `monitoring/triage-queue.tsx` (`worstOpenSeverity`) | A flashing dot on a Sidebar item in a severity's color, by page. Monitoring and the Census pass Monitoring the worst open alert, so it shows from every page. |
| Prototype menu | `intercept-live.tsx` (`prototype`, `onResetPrototype`) | The Sidebar's Prototype footer item: the stories' scenarios, views and shortcuts by group, then "Reset prototype" after a divider. A shortcut opens a page and/or a patient and runs its `onSelect`. Prototype only; an app passes neither, and the item doesn't show |

### Pages

The Census and Monitoring are Sidebar pages. Each page's content is a `<name>-panel.tsx`; each layout (`census.tsx`, `monitoring.tsx`) is an `InterceptLive` that renders both pages, so the Sidebar moves between them. A page's filters reset when you leave it, except My patients and the sort, which the shell keeps (Page preferences).

| Page | Files | Notes |
| --- | --- | --- |
| Census | `census/census.tsx`, `census/census-panel.tsx` | Every patient as cards (`PatientCensusCard`; Compact uses its `sm` size) or a table (`census/census-list.tsx`, List density), grouped by hospital |
| Census filters | `census/census-filters.tsx` | `censusFilterGroups`: the Census's groups for the shared Filters panel, from the hospital tab's patients |
| Monitoring | `monitoring/monitoring.tsx`, `monitoring/monitoring-panel.tsx` | The clinician's panel as live monitors (`PatientMonitoringCard`) or a List table (`monitoring-list.tsx`), switched by `view-controls.tsx` |
| Patient avatar | `shared/patient-avatar.ts`, `sample-data/sample-patient-photos.ts` | One avatar per patient on the Census and Monitoring cards and tables (List) and the Patient details header: the photo (sample: five patients, by id), or the initials in the patient's color (`avatarTones`, dealt over the whole roster: each panel from its `patients`, Patient details from both pages' patients; `avatarTone`, from the id, only for a patient outside it) |
| Shared by both | `shared/patient-panel.tsx` | The filter bar (hospital, the search's `matchesSearch`, My patients chip, quick views), sort orders (each page's choice kept by the shell's page preferences, `useSortBy`; Recently viewed and Recently resolved merge this session's activity over the data with `useRecentActivity`: the shell's `PatientNavigation.viewedAt` and the page's resolved alerts, `resolvedTimes`; the Census offers no Alert sort) and the grid, so both pages filter, sort and group the same way. Only Monitoring re-sorts on its own (`useSortCadence`, `useSortPause`, `useResolvedHolds`' move, `useSortOnNewAlert` when an alert fires) and rings its cards by alert; the Census holds still and its cards show the alert as a badge with no ring, which opens the shell's alert modal (`navigation.openAlert`; DESIGN.md "Census: no re-sorting, no alert ring, no alert pill", "Patient census card" → "Alert badge") |
| Filters panel | `shared/patient-filters.tsx` | `FiltersPanel` (a Sheet floating over the app, since Nov 1, 2026; a right `SidePanel` in the live feed's place before) and `FiltersButton`, on both pages; `passesFilters` (any within a group, all across groups), `filterCount`, the groups both pages have (`unitFilterGroup`, `alertFilterGroup`, `tagFilterGroups`) and `usePatientFilters` (holds a picked `live` option's patients). Each page builds its own groups (`censusFilterGroups`; Monitoring's `monitoringFilterGroups` in `monitoring-panel.tsx`), keeps the picked options and applies them with the search and the chips |
| Live feed | `shared/live-feed.tsx` | The "Live feed" line right of the page's summary and the right-hand panel it opens, on both pages. Its content is the triage queue (`monitoring/triage-queue.tsx`) |
| Source label | `shared/source-label.tsx` | `SourceLabel`: the source icon before a line that names where data comes from (DESIGN.md "Every source reference carries the source icon"), used by Patient details, Ask Intercept Live and the alert modal |
| Alert changes | `shared/alert-changes.ts` | `alertChanges(before, after)`: what changed in the feed's alerts (new, raised, lowered, a status someone else changed, resolved). Read by the alert toasts and by the sample chat's alert updates |
| Alert modal | `alert-detail/alert-detail.tsx`, `alert-detail/sample-alert-detail.ts` | `AlertDetailModal`: an alert opened, on UCL's Dialog, 1400px in three columns that scroll on their own. The patient (600px): avatar, name, identity, location, the alert (PatientMonitoringCard's `AlertBar`, the reason line as the title, the alert's title, its source, Acknowledge / Escalate / Mark as resolved), the score row (`PatientCardScore`), the monitor (`PatientMonitor`) and the tags (`PatientCardTags`); a footer with Open patient and Video call {nurse's first name}, {role} ("Video call Kayla, RN"). The pathway's Add note sends a note to the co-signer with the orders. Clinical info (400px): the key clinical findings and the history and labs, with the video consult floating over its bottom once started (`ConsultTile`: calling → live, the room's camera clip through the camera section's `RoomVideo` when `video` is set, else drawn by its `RoomScene`). Pathway (400px): the care pathway (`care-pathway.tsx`), its decision at the bottom. Takes its data as `AlertDetailData`. In the prototype, the shell's `renderAlert` shows it (`alertModalRenderer`, from the layout's `alertDetails`, counting the patient's alerts in the last 24 h): a card's alert bar opens the patient's top alert, a toast's maximize button its own; an alert without a detail opens the patient. Samples: `sampleScenario1AlertDetail` (Hayes, Scenario 1, with step 4's pathway) and `sampleAlertDetails` (every feed alert, with the score, monitor and tags from the patient's live card, the rest from the record). Both take the camera clip from `sample-data/sample-camera-video.ts` (the first `.mp4` in `sample-data/videos/`; none, the room is drawn) |
| Care pathway (exploration) | `alert-detail/care-pathway.tsx` | `CarePathwayPanel`: a suggested pathway's order set in the alert modal (Scenario 1 step 4): edit a dose, accept (sent for the local physician's co-signature, then active) or decline with a reason. Its status lives in the panel and starts over when the modal reopens; `onPathwayDecision` reports the decision. The modal shows it in its right column, under the consult |
| Keep or transfer (exploration) | `alert-detail/keep-or-transfer.tsx` | `KeepOrTransferPanel`: Scenario 1 step 5, from `AlertDetailData.transfer` (`KeepOrTransfer`; Hayes's in `sample-alert-detail.ts`). The modal shows it under the pathway once the pathway reports Awaiting co-signature or Active (`onStatusChange`), or at once when `transfer.decided` is set; `pathwayStatus` opens the pathway in a given state. Keep (checkpoints) or transfer (receiving hospital, transport), each with a reason; the decision lives in the panel and `onTransferDecision` reports it; in the prototype the scenario keeps it (`transfer.decided`), so the modal reopens as it was left. Checkpoint results and the Transfer avoided outcome come from the data |
| Alert toasts | `shared/alert-toasts.tsx` | `AlertToasts`: a toast (UCL's `toastAlert()`) for every alert change, on any page; with My patients on in the page on screen, only for the clinician's own patients. Each layout (`census.tsx`, `monitoring.tsx`) renders it as the shell's child with the feed's alerts (`alertsProp`, before the clinician's actions), its patients and `handleAlertAction`; it opens patients through the shell's `openPatient`. The shell renders the `Toaster`. Closing a Resolved toast with its × calls `onCloseResolved`: the layout keeps when (`useClosedResolutions`) and passes it to `MonitoringPanel` as `closedResolutions`, so that patient's card drops its Resolved bar |

### Patient details

`patient-details/` isn't a Sidebar page. The shell shows it over the current page, which stays underneath, hidden, and keeps its filters.

| Step | Where |
| --- | --- |
| A card, a monitor or an alert calls `openPatient(id, list)` with the page's current list, for previous / next | The page panels, through `usePatientNavigation()` |
| The shell builds the view's props from the patient, their record and alerts | `patientDetailsView()` in `patient-details.tsx`, passed to the shell as `renderPatientDetails` |
| The page renders the Patient Header, the tabs and the open section | `patient-details.tsx` |

| Part | File |
| --- | --- |
| Page, tabs, header actions | `patient-details.tsx` (`PatientDetails`, `patientDetailsView`) |
| Overview tab | `patient-overview.tsx`: the brief, monitor, Early warning score (the record's `earlyWarning`: value, band, crossing, trend, inputs with points) and Intake and output (`fluids`), organ support, labs, alerts, care team, encounter |
| Every other tab | `sections/<name>-section.tsx`: vitals, chart, timeline, medications, orders, epic, notes, sepsis, camera |
| Building blocks for the sections | `section-parts.tsx` (`SectionCard`, `Detail`, `NoData`, time formatters) |
| Icons and images | `images/` (`ai-brief.svg`; `sample-patient-photo.png` is sample data) |

### Sample data

Everything in a `sample-*` file (and `use-sample-live-feed.ts`) is made-up data the app replaces with its APIs; everything else is code to keep. Screens never import samples: the stories pass them in.

| Data | File | Used by |
| --- | --- | --- |
| Hospitals, the user, their team, shift end | `sample-data/sample-workspace.ts` | Every screen |
| Census patients | `census/sample-census.ts` | Census |
| Monitoring patients, vitals, alerts, escalation targets | `monitoring/sample-monitoring.ts` | Monitoring, the live feed, patient details |
| Scripted live feed | `monitoring/sample-live-scenario.ts`, played by `sample-data/use-sample-live-feed.ts` (stories only). Margaret Hayes isn't in it | The Live stories |
| Scenario 1 | `sample-data/sample-scenario-1.ts` (stories only): Scenario 1's beats (Demo Use Cases, "Heart failure at 2 a.m."): step 1, the early warning, plays when the scenario is picked (`after: "start"`); steps 2 to 5 are the clinician's, in her alert modal; step 6, the resolution at 06:00, plays 6 s after she's kept at Chadron (`after: "keep"`; `useSampleLiveFeed` takes the modal's `onPathwayDecision` and `onTransferDecision`, keeps them, and gives them back through `withScenarioAlertDetails`). Each beat patches Hayes's Census card, monitor and record, fires or resolves her alerts and changes her alert modal (`details`), built from `sampleScenario1Census` (`census/sample-census.ts`), `sampleScenario1Monitoring` (`monitoring/sample-monitoring.ts`), `sampleScenario1Record` (`patient-details/sample-patient-records.ts`), `sampleScenario1Vitals` and `sampleScenario1Timeline` (`sections/`). The base samples hold her just before it (NEWS2 5, no alert, inside her limits). `useSampleLiveFeed()` plays it on `startScenario1()` and returns `withScenarioCensus` / `withScenarioRecords` for the stories to apply; the chat gets the same through `useLiveAskIntercept`'s `data` | The Live Census and Monitoring stories |
| Prototype menu entries and Reset prototype | `sample-data/prototype-links.ts` (stories only): `prototypeShortcuts({ startScenario1, groupedGrid, onToggleGroupedGrid })` (Scenarios › "Scenario 1: Heart failure" opens Monitoring and plays Scenario 1 from the start, its first beat 1.5 s later; Storyboard › "Scenario 1" opens `storyboards/scenario-1/index.html` in a new tab, the demo script for Scenario 1 with a screenshot of each beat (a shortcut's `href`); Views › Sections by hospital shows Group by hospital as the grid's hospital sections instead of the default Kanban board, via the panels' `groupedView`), `resetPrototype()` (loads the Monitoring live story afresh, from either Live story) | The Live Census and Monitoring stories |
| Shareable links | `sample-data/prototype-links.ts` (stories only): `usePrototypeLocation(interceptLivePages, fallback)` reads `?page=` (a Sidebar page, lowercased: `monitoring`, `census`…) and `?patient=` (a patient id) when the prototype opens, and writes each move back with `replaceState` (no history entries), from `InterceptLive`'s `onLocationChange` (the page, and the patient whose details are open). Both the bare story frame (`iframe.html?id=…`) and Storybook's UI (`?path=/story/…`) keep them, so a copied link opens the same page and patient, e.g. `iframe.html?id=layouts-intercept-live-monitoring--default&viewMode=story&page=census&patient=p15`. Used by the Monitoring and Census `Default` stories; Reset prototype drops them | `Default` stories (`defaultPage`, `defaultPatient`, `onLocationChange`) |
| Each patient's base record | `patient-details/sample-patient-records.ts` | The section samples build on it |
| Each tab's data, per patient | `patient-details/sections/sample-<name>.ts` (`sample<Name>ByPatient`) | The sections |
| Full patient records | `patient-details/sample-patient-details.ts`, which merges the two above | Patient details |
| Chat answers | `sample-data/sample-ask-intercept.ts`: a rule-based responder that answers from all the samples above. `useLiveAskIntercept` (story-only) answers from what the page shows now (the live feed's alerts with the queue's actions, the monitors' live values), ranks patients as the cards do with Active alerts on, and turns each change in the feed's alerts (`shared/alert-changes.ts`) into a notice | Ask Intercept Live (`askIntercept`, `askInterceptNotice`) |

ℹ️ The section samples import `sample-patient-records.ts`, never `sample-patient-details.ts`, which imports them: that would be circular.

### Layout-only parts

These are built in the layout, not in UCL, until intercept.ds draws them. When it does, move them to `src/components/` and export them.

| Part | File |
| --- | --- |
| Triage queue | `monitoring/triage-queue.tsx` |
| Alert modal | `alert-detail/alert-detail.tsx` |
| Monitoring's view controls | `monitoring/view-controls.tsx` |
| Monitoring's List table | `monitoring/monitoring-list.tsx` |
| Side panels, the patient list, the chat conversation | `side-panel.tsx`, `patient-list-panel.tsx`, `ask-intercept-panel.tsx` |
