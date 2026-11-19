# `trace/` — file-to-requirement map

This folder answers one question for each file in the repo: **which requirement does it help prove?** It maps repo artifacts to [Cowork](#cowork) requirement IDs. It does **not** track delivery status — that lives in the Cowork Traceability Matrix and is regenerated on Fridays (Operating Model §3.3, §6).

## Cowork

Cowork is the Archie Labs project where Intercept Live's requirements are written and tracked: the Cowork project **"Intercept Telehealth - Series B"**, owned by Carlos Jimenez (Archie Labs). It is the source of record for what the product must do. This repo holds the design system, the reference screens and the PRDs, and copies only Cowork's IDs (Operating Model §4, [documents/README.md](../documents/README.md)). Where the two disagree, Cowork wins.

| Lives in Cowork | What this repo keeps of it |
|---|---|
| Requirements Spec: requirement IDs (`PD-`, `SV-`, `AL-`, `CC-`…) and business rules (`BR-`) | The IDs, in PRD `requirements:` front-matter, commits and `traceability.csv`; a read-only snapshot in [documents/specs/](../documents/specs/README.md) |
| Workbook (screen specs, SCR) and scenarios (SCN) | Nothing |
| Decisions (`DEC-`), change log (`CL-`), RAID register | The IDs, cited in commits and [CHANGELOG.md](../CHANGELOG.md) |
| Traceability Matrix: the whole chain, with delivery status | `traceability.csv`: the REF layer only |
| Archie prompts (AP) and verification records (VR) | Nothing |
| Raw client material: Slack notes, transcripts, emails | Nothing; copies of the System Specification and Team Brief in [documents/](../documents/README.md) |

### How it works

1. **Cowork defines the requirement.** Carlos writes it in the Requirements Spec and gives it an ID. The repo never mints a Cowork prefix: its PRDs use their own (`MON-`, `PC-`, `CNL-`…) so the two never collide ([CONVENTIONS.md](../CONVENTIONS.md) → "IDs").
2. **The specs reach the repo as snapshots.** After each Cowork update batch, Claude Code prompt CX-04 refreshes `documents/specs/`. Don't edit them here: to change one, comment on the PR that published it or open an RCP (repo change proposal), and Carlos updates Cowork and publishes the set again.
3. **The repo builds against the IDs.** A PRD lists the requirements it covers in its `requirements:` front-matter; a commit cites them (`[PD-01]`) and the decision it came from (`[DEC-20]`).
4. **`traceability.csv` records which file serves which requirement** (the REF). Add or update a file's row in the same change that makes it serve a requirement, so the map matches the repo. Its `evidence` column copies the matrix's design status.
5. **Cowork takes it from there.** An Archie prompt (AP) moves the REF into the running prototype, and a verification record (VR) on the published preview proves it works. Nothing counts as delivered until a VR passes.
6. **Fridays reconcile both ways.** Cowork regenerates the Traceability Matrix (Operating Model §3.3, §6), and new "what" items a repo PRD introduces are added to Cowork (Operating Model §4).

## The chain

```
REQ ─► SCR ─► REF ─► AP ─► VR
```

- **REQ** — a Cowork requirement ID (`PD-01`, `SV-04`, …). Source of record: the Requirements Spec.
- **SCR** — a screen spec (screen designs / Workbook). *(Between REQ and SCR the Cowork chain also has SCN, the scenario; see Operating Model §6.)*
- **REF** — a repo artifact, as `path@tag` or `path@commit`. This is the layer this folder maps.
- **AP** — the Archie prompt that ports the REF into the running prototype (Cowork).
- **VR** — the live verification record on the published preview (Cowork). Nothing counts as delivered until a VR passes.

## `traceability.csv`

| Column | Meaning |
|---|---|
| `req_id` | The Cowork requirement ID. |
| `artifact_path` | The repo file or folder that serves it (the REF, without a commit pin). |
| `repo_ids` | The repo-local PRD ID family that specs it (`MON-*`, `PC-*`), where a PRD covers it. |
| `evidence` | The design-layer status from the Traceability Matrix: *Met (design)* / *Met (UI)* / *Partial* / *Held*. |
| `notes` | What exists and what is missing. |

**Seed:** every row is a Traceability Matrix v0.1 row that carries a REF, at repo `89d4258` (the CX-01 baseline). Rows without a repo artifact in the matrix are omitted — including the new `prds/patient-details.md`, which postdates the matrix. REF commit/tag pins (`@v0.1.0`, `ref-vN`) are added as the reference set is locked (G2). `AP` and `VR` are Cowork columns and are not duplicated here.

**Status legend:** *Met (design)* = the screen or component exists · *Met (UI)* = UI exists, no behavior · *Partial* · *Held* = the rule is respected by absence.
