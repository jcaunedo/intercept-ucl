# Conventions — `@jcaunedo/intercept-ucl`

How we branch, commit, version and trace work in this repository. These conventions are additive to the build rules in [CLAUDE.md](CLAUDE.md); where this file and CLAUDE.md overlap, CLAUDE.md wins.

## Branches

One branch per unit of work, named by type:

| Prefix | For |
|---|---|
| `feat/` | a new component, layout, token or capability |
| `fix/` | a bug or a visual correction |
| `chore/` | tooling, hygiene, config, repo housekeeping |
| `design/` | a design-system change driven by Figma (tokens, component visuals) |
| `docs/` | documentation, PRDs, conventions |

## Commits

Format: `type(scope): summary [REQ-ID…] [DEC-ID]`

- `type` is one of the branch prefixes above (`feat`, `fix`, `chore`, `design`, `docs`), plus `ci` for CI config.
- `scope` is the area touched (`census`, `patient-card`, `theme`, `prds`, `repo`, …).
- `[REQ-ID…]` cites the Cowork requirement IDs the change serves; `[DEC-ID]` cites the decision it came from. The PR body lists every ID touched.

Examples, with the file each one touches:

- `feat(census): group patient counts by hospital [PD-01][CL-06]` — `src/layouts/intercept-live/census/census-panel.tsx`
- `fix(patient-card): colour acuity levels for clarity [PD-04]` — `src/components/cards/patient-card/patient-card.tsx`
- `docs(prds): renamespace PRD IDs off SV- [I-18]` — `prds/monitoring.md`

## IDs

The chain and the home of every prefix are defined in the Operating Model (§6) and mapped in [`documents/trace/`](documents/trace/README.md).

**Referenced here, never minted here** (the source of record is the Cowork Requirements Spec / Workbook / RAID):

`PD-`, `SV-`, `CC-`, `CD-`, `OE-`, `AL-`, `SA-`, `CA-`, `VS-`, `SC-`, `CH-`, `HO-`, `UX-`, `NFR-`, `BR-`, `SIM-`, `DEC-`, `CL-`, `R-`, `I-`, `A-`, `D-`, `CI-`.

**Minted here** (repo-local PRD IDs, so they never collide with a Cowork prefix):

- `MON-` / `MON-AC-` — the Monitoring PRD (`prds/monitoring.md`) and its acceptance criteria.
- `PC-` / `PC-AC-` — the Patient-card PRD (`prds/patient-card.md`) and its acceptance criteria.

> ⚠️ **Open:** `prds/patient-details.md` currently mints `PD-xxx` (plus `PD-AC-`, `PD-OD-`, `PD-UC-`), which **collides with the Cowork `PD-` (Provider Desktop) prefix** above. It needs a repo-local namespace of its own — the name is Julio's choice (G0-3) — and was **left unchanged** in the governance PR that added this file. Pick a namespace and renamespace it in a follow-up.

New "what" items a repo PRD introduces are reconciled back into Cowork on Fridays (Operating Model §4).

## Versioning

SemVer, as the [README](README.md) defines it: patch = fix / visual tweak; minor = new component, prop, variant or token; major = removing or renaming a component, prop or token, or changing a default. Below 1.0.0, a minor bump is treated as breaking by package managers.

A version bump in `package.json` **publishes** the package to GitHub Packages. Bump only through the release scripts (`npm run release:patch|minor|major`), never by hand.

## Tags

- `vX.Y.Z` — a published package version (the release scripts create these).
- `ref-vN` — a locked reference set (a design/reference snapshot cited by a trace row; Operating Model D1 / G2).

## What does not live here

The source of record for these is the Cowork project, never this repo:

- Cowork prose requirements, workflows and business rules (only their IDs are mirrored here).
- Decisions (DEC), the change log (CL) and the RAID register.
- Raw client material (Slack notes, transcripts, emails).
- Archie prompts (AP-###), Archie platform internals and the Method.
