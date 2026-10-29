# documents/specs — Cowork spec snapshots (read-only)

These files are **read-only snapshots** of the Intercept Live functional and technical specifications. Archie Labs (Carlos) owns them in the Cowork project; this folder mirrors them so design and code in this repo follow the current specs (DEC-20). The client-owned System Specification stays where it is: `documents/Intercept Live - Virtual Care OS - System Specifications.md`.

**Do not edit these files here.** To change something, comment on the PR that published it or open an RCP (repo change proposal); Carlos updates the source in Cowork and re-publishes the set.

## Snapshot set v1 · 2026-10-29

| File | Document | Version | What it's for |
|---|---|---|---|
| `requirements-specification.md` | Requirements Specification | v0.7 | Functional requirements (PD-, SV-, AL-, VS-, OE-, CD-, CC-, SC-, CH-, HO-), business rules (BR-), the reference protocol profile (§7.1) and data model v1 (§8.1) |
| `design-update-spec.md` | Design Update Spec | v1.0 | **For Julio:** the platform rules and design updates DU-01 to DU-39 by component and layout, the data-contract enums, and repo housekeeping. Answer each item Accept / Adapt / Decline |
| `simulator-specification.md` | Real-Time Data Simulator Specification (Google Doc export) | v0.6 (rev. 6) | What the simulator streams, the interface direction, profiles, the decision and open-item logs; §16 is the build baseline |
| `simulator-requirements.md` | Simulator Requirements (Cowork) | v0.6 | Short current baseline (§0) plus the v0.3 record |

## Rules

- Cowork is the source of truth. If a file here differs from Cowork, Cowork wins.
- Requirement IDs here are the IDs commits and PRDs cite (CONVENTIONS.md). Repo PRDs keep their own namespaces (`MON-`, `PC-AC-`; patient-details to be renamed, DU-34).
- Clinical values are illustrative until the clinical script review and live in the protocol profile; components display values, they never hard-code thresholds.
- Sanitized for this repo: no Archie prompts or internals and no client-confidential interface material. Those stay in Cowork.
- The set is refreshed by Claude Code prompt CX-04 after each Cowork update batch; `SHA256SUMS` lists the published checksums.
