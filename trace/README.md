# `documents/trace/` — file-to-requirement map

This folder answers one question for each file in the repo: **which requirement does it help prove?** It maps repo artifacts to Cowork requirement IDs. It does **not** track delivery status — that lives in the Cowork Traceability Matrix and is regenerated on Fridays (Operating Model §3.3, §6).

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
