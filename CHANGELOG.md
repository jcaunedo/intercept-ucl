# Changelog

All notable changes to `@jcaunedo/intercept-ucl` are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **Publishing:** a version bump in `package.json` publishes the package to GitHub Packages (`.github/workflows/publish.yml`). Bump the version only through the release scripts (`npm run release:patch|minor|major`), never by hand.

## [Unreleased]

### Added

- Breakpoints `3.5xl` (2048), `4xl` (2560), `5xl` (2880), `6xl` (3200), `7xl` (3440, ultrawide) and `8xl` (3840, 4K), with the same +1px rule (`4xl:` = above 2560) in `theme.css` and `src/lib/breakpoints.ts`. They ship in the styles, so apps get the new `3.5xl:`–`8xl:` variants.
- `CHANGELOG.md`, `CONVENTIONS.md`, `.github/PULL_REQUEST_TEMPLATE.md` and `documents/README.md` (a scope note for the `documents/` folder). [R-22][DEC-13]
- `documents/trace/` — a file-to-requirement map (`README.md` + `traceability.csv`), seeded from the Traceability Matrix v0.1. [R-22]
- `.github/workflows/ci.yml` — type-check, library build and Storybook build on pull requests and pushes to `main`. Read-only token, no publish step. [R-22]
- `requirements:` front-matter on `prds/monitoring.md`, `prds/patient-card.md` and `prds/patient-details.md`, citing the Cowork requirement IDs each maps to (proposed — confirm with Carlos). [I-18]

### Fixed

- PatientCard, PatientMonitoringCard: the root has `min-w-0`, so in a flex or grid cell a card narrower than its location line truncates the hospital instead of growing past the cell. The Census and Monitoring grids' card wrappers use `grid-cols-1` for the same reason.

### Changed

- PatientCard: the acuity level ("Moderate") is 20px regular, matching the score's size, as in intercept.ds `patient-card-compact` (`1108:3964`); it was 14px semibold.
- PatientCard: the "…" more-actions button is gone, as in intercept.ds `patient-card-compact` (`1108:3964`). `onMoreActions` is deprecated and ignored. Tags no longer wrap: they stay on one line and the row scrolls sideways when they don't fit (keyboard-focusable while it overflows; a click still opens the patient). The Census and Monitoring layouts drop `onPatientActions`.
- PatientMonitoringCard: under ~340px wide, the `md` card's condensed numerics drop their units and give ABP 1.5× the width, as `sm` does, so "104/56" no longer runs into RR. Wider cards are unchanged.
- Census and Monitoring (both densities): 3 / 4 / 5 / 6 cards a row in the `xl` / `2xl` / `2.5xl` / `3xl` frames (1025–1280 / 1281–1536 / 1537–1728 / 1729px and up), then one more every 296px above 1920 (7 from 2168px up to 13 from 3944px; cards ~280–330px), with the Sidebar collapsed and no panel open; an open side panel still drops columns. Was 3 Comfortable / 4 Compact at 1728 with the queue open (PRD MON-012 updated). The grid steps are now in px.
- Intercept Live layout: at `lg` (1024px) and below, the Sidebar collapses to its rail on its own, and back above `lg` it returns to its earlier state unless the user toggled it (`useLayoutSidebar`, ported from bethere-ucl). Layout only; no component API changes.
- Breakpoints docs: DESIGN.md lists each review frame's height and notes that `sm` isn't a review frame; `theme.css` and `breakpoints.ts` point to the DESIGN.md rule.
- Logo: the wordmark now reads "Intercept Live" ("Intercept" medium, "Live" light) with no box around "Live", re-exported from intercept.ds `1001:82`. The viewBox narrows from 743 to 673 units, so at the default 31px height the logo is 173.86px wide instead of 191.94px.
- PatientCard, PatientHeader: acuity levels read Low / Moderate / High / Critical, without "risk" (`patientCardAcuityLevels` labels changed; the `level` keys are unchanged). Every level is neutral text for now (`foreground`; Unknown stays muted) until acuity's design is decided.
- Intercept Live samples: Margaret Hayes (`p15`) is now Scenario 1's patient from the demo use cases: 72, heart failure getting worse at 01:40 on the med-surg floor of Chadron Community Hospital, a new hospital in the shared workspace. Her record, vitals, timeline, chart, medications, orders, notes, EHR status and camera replace the earlier GI bleed at Mercy West. The Monitoring `OutsideLimitsFilter` story now counts 6 patients.
- Renamespaced the repo-local PRD IDs so they no longer collide with the Cowork requirement prefix `SV-`: `SV-0xx → MON-0xx`, `SV-OD-xx → MON-OD-xx`, `SV-UC-xx → MON-UC-xx`. Acceptance-criteria IDs are now `MON-AC-xx` (Monitoring) and `PC-AC-xx` (Patient card). `prds/patient-details.md`'s references to the Monitoring PRD were updated to `MON-` too. Each PRD carries an old → new mapping table. Rendered strings and story descriptions were left unchanged and are listed in the PR. [I-18]
- `.gitignore`: added `*.log` and `coverage/`. [I-19][R-16]
- `CLAUDE.md`: corrected the `product-specs/` folder name to `prds/` and added a Traceability note. [R-22]

### Removed

- `debug-storybook.log` (a committed dev log that leaked a local path); moved the root screenshots to `explorations/screenshots/`. [I-19]

### Docs

- Added `documents/specs/`: Cowork spec snapshot set v1 (Requirements v0.7, Design Update Spec v1.0, Simulator Specification v0.6, Simulator Requirements v0.6), read-only. [DEC-20]

## [0.1.0] — 2026-10-28 — baseline

The repository as it stood when the governance layer was added (the design-system package and the reference screens). The package version has not been bumped; `0.1.0` records the baseline only.

### Added

- Design tokens in `src/styles/theme.css` (oklch), synced from archielabs.ds `intercept` + `intercept-dark` modes: shadcn roles, surfaces, the tone system, icons, states, charts, sidebar, and the badge/avatar/severity/monitor palettes, plus breakpoints, type scale, shadows and radii.
- 26 components across 9 categories (buttons, cards, data-display, feedback, forms, icons, navigation, overlays, typography) + 14 custom solid icons, exported from `src/index.ts`.
- Motion system under `src/lib/motion/` and `MOTION.md`.
- `intercept-live` reference layouts: Census (Provider Desktop, §5.1) and Monitoring (Surveillance, §5.2), with synthetic `sample-*` data (14 patients, 3 fictional hospitals, SOFA acuity). [PD-01, SV-01]
- Storybook 10 workbench + Vitest story tests + Chromatic integration (not connected).
- Docs: README, CLAUDE.md, DESIGN.md, MOTION.md, SIZE-SCALE.md, Storybook Foundations/Guidelines, `prds/` (patient-card, monitoring, patient-details, glossary), the `explorations/` artifact index, and Storybook pages that render the `prds/` and `documents/` source files (the PRDs and Documents sections).
- GitHub Packages publish workflow (version-gated).

### Notes

- Prototype / design reference only; synthetic data; no live integrations (BR, DEC-01/07/08).
- No simulator / device profiles / schemas yet (home pending DEC-12).
