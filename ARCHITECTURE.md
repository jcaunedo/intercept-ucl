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

`intercept-live.tsx` (`InterceptLive`) is the app frame every screen shares: the Sidebar, the canvas with the sticky AppHeader, page switching, theme and clock. It takes `pages`, the content for each Sidebar item; a page a layout doesn't pass shows its title and an empty state.

| Part | File | Notes |
| --- | --- | --- |
| Shell | `intercept-live.tsx` | Owns which page is shown, which patient is open and which side panels are open, and their widths |
| Sidebar state | `use-layout-sidebar.ts` | `useLayoutSidebar()`: whether the Sidebar is collapsed. Collapsed by default, and on its own at `lg` (1024) and below (DESIGN.md "Sidebar auto-collapses at lg and below") |
| Patient navigation | `patient-navigation.tsx` | `usePatientNavigation()`: the context the pages use to open a patient (`openPatient(id, list)`), and to read whether the header is compact and whether a patient is open |
| Page preferences | `page-preferences.tsx` | `usePagePreferences()`: view choices the shell keeps across pages, so switching pages keeps them. Today Group by location (`groupByLocation`, `onGroupByLocationChange`), read by `useGrouping` in `shared/patient-panel.tsx`. Outside the shell each page keeps its own |
| Side panel | `side-panel.tsx` | `SidePanel`: slides open, resizes from the canvas edge, header with an optional `description`. Every panel below uses it |
| Ask Intercept Live | `ask-intercept-panel.tsx` | The global chat, on the left. Toggled from the Sidebar's Ask Intercept Live and, on a patient's page, the app header's sparkle. Its message box is UCL's `ChatComposer`; answers come from `InterceptLive`'s `askIntercept` prop |
| Patient list | `patient-list-panel.tsx` | `PatientListPanel`, the patient switcher, on the left. Opened by the app header's list button on a patient's page. Takes turns with the chat: one is open at a time |
| Page panel | `PagePanel` (in `side-panel.tsx`) | A page's own panel on the right, e.g. the live feed |
| Prototype menu | `intercept-live.tsx` (`prototype`, `onResetPrototype`) | The Sidebar's Prototype footer item: the stories' scenarios, views and shortcuts by group, then "Reset prototype" after a divider. A shortcut opens a page and/or a patient and runs its `onSelect`. Prototype only; an app passes neither, and the item doesn't show |

### Pages

The Census and Monitoring are Sidebar pages. Each page's content is a `<name>-panel.tsx`; each layout (`census.tsx`, `monitoring.tsx`) is an `InterceptLive` that renders both pages, so the Sidebar moves between them. A page's filters reset when you leave it.

| Page | Files | Notes |
| --- | --- | --- |
| Census | `census/census.tsx`, `census/census-panel.tsx` | Every patient as cards (`PatientCard`; Compact uses its `sm` size) or a table (`census/census-list.tsx`, List density), grouped by hospital |
| Monitoring | `monitoring/monitoring.tsx`, `monitoring/monitoring-panel.tsx` | The clinician's panel as live monitors (`PatientMonitoringCard`) or a List table (`monitoring-list.tsx`), switched by `view-controls.tsx` |
| Shared by both | `shared/patient-panel.tsx` | The filter bar (hospital, unit, My patients chip, quick views), sort orders and the grid, so both pages filter, sort and group the same way |
| Live feed | `shared/live-feed.tsx` | The "Live feed" line right of the page's summary and the right-hand panel it opens, on both pages. Its content is the triage queue (`monitoring/triage-queue.tsx`) |

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
| Overview tab | `patient-overview.tsx` |
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
| Scripted live feed | `monitoring/sample-live-scenario.ts`, played by `sample-data/use-sample-live-feed.ts` (stories only) | The Live stories |
| Prototype menu entries and Reset prototype | `sample-data/prototype-links.ts` (stories only): `prototypeShortcuts({ restartLiveFeed, groupedGrid, onToggleGroupedGrid })` (Scenario 1 opens Monitoring and replays the live feed; Views › Sections by location shows Group by location as the grid's hospital sections instead of the default Kanban board, via the panels' `groupedView`), `resetPrototype()` (reloads the story) | The Live Census and Monitoring stories |
| Each patient's base record | `patient-details/sample-patient-records.ts` | The section samples build on it |
| Each tab's data, per patient | `patient-details/sections/sample-<name>.ts` (`sample<Name>ByPatient`) | The sections |
| Full patient records | `patient-details/sample-patient-details.ts`, which merges the two above | Patient details |
| Chat answers | `sample-data/sample-ask-intercept.ts`: a rule-based responder that answers from all the samples above | Ask Intercept Live (`askIntercept`) |

ℹ️ The section samples import `sample-patient-records.ts`, never `sample-patient-details.ts`, which imports them: that would be circular.

### Layout-only parts

These are built in the layout, not in UCL, until intercept.ds draws them. When it does, move them to `src/components/` and export them.

| Part | File |
| --- | --- |
| Triage queue | `monitoring/triage-queue.tsx` |
| Monitoring's view controls | `monitoring/view-controls.tsx` |
| Monitoring's List table | `monitoring/monitoring-list.tsx` |
| Side panels, the patient list, the chat conversation | `side-panel.tsx`, `patient-list-panel.tsx`, `ask-intercept-panel.tsx` |
