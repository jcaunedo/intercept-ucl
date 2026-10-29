# Changelog

All notable changes to `@jcaunedo/intercept-ucl` are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **Publishing:** a version bump in `package.json` publishes the package to GitHub Packages (`.github/workflows/publish.yml`). Bump the version only through the release scripts (`npm run release:patch|minor|major`), never by hand.

## [Unreleased]

### Added

- `CHANGELOG.md`, `CONVENTIONS.md`, `.github/PULL_REQUEST_TEMPLATE.md` and `documents/README.md` (a scope note for the `documents/` folder). [R-22][DEC-13]
- `documents/trace/` — a file-to-requirement map (`README.md` + `traceability.csv`), seeded from the Traceability Matrix v0.1. [R-22]
- `.github/workflows/ci.yml` — type-check, library build and Storybook build on pull requests and pushes to `main`. Read-only token, no publish step. [R-22]
- `requirements:` front-matter on `prds/monitoring.md`, `prds/patient-card.md` and `prds/patient-details.md`, citing the Cowork requirement IDs each maps to (proposed — confirm with Carlos). [I-18]

### Changed

- Intercept Live samples: Margaret Hayes (`p15`) is now Scenario 1's patient from the demo use cases: 72, heart failure getting worse at 01:40 on the med-surg floor of Chadron Community Hospital, a new hospital in the shared workspace. Her record, vitals, timeline, chart, medications, orders, notes, EHR status and camera replace the earlier GI bleed at Mercy West. The Monitoring `OutsideLimitsFilter` story now counts 6 patients.
- Renamespaced the repo-local PRD IDs so they no longer collide with the Cowork requirement prefix `SV-`: `SV-0xx → MON-0xx`, `SV-OD-xx → MON-OD-xx`, `SV-UC-xx → MON-UC-xx`. Acceptance-criteria IDs are now `MON-AC-xx` (Monitoring) and `PC-AC-xx` (Patient card). `prds/patient-details.md`'s references to the Monitoring PRD were updated to `MON-` too. Each PRD carries an old → new mapping table. Rendered strings and story descriptions were left unchanged and are listed in the PR. [I-18]
- `.gitignore`: added `*.log` and `coverage/`. [I-19][R-16]
- `CLAUDE.md`: corrected the `product-specs/` folder name to `prds/` and added a Traceability note. [R-22]

### Removed

- `debug-storybook.log` (a committed dev log that leaked a local path); moved the root screenshots to `explorations/screenshots/`. [I-19]

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
