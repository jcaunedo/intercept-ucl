# `documents/` — scope note

This repository (`@jcaunedo/intercept-ucl`) is the **Intercept Live design-system and reference source**: components, tokens, motion and the two reference screens (Census, Monitoring). The source of record for prose requirements, decisions, RAID and raw client input is the **Archie Labs Cowork project**, not this repo (Operating Model §4). Only requirement **IDs** are mirrored here (in the PRDs and in [`trace/`](trace/README.md)).

## What's in this folder

| File | What it is |
|---|---|
| `Intercept Live - Virtual Care OS - System Specifications.md` | A copy of the Cowork System Specification. |
| `Intercept Live Design Phase Team Brief.md` | A copy of the Cowork Design Phase Team Brief. |
| `slack-notes-from-client.md` | Raw client input. |

**These are copies of Cowork-owned material.** They are read-only mirrors — reconcile any edit in Cowork, not here. They remain tracked in git only because the Storybook **Documents** section renders them (`src/docs/documents/*.mdx` import them). Taking them out of git also means removing those Storybook pages and their order in `.storybook/preview.ts`, which is out of scope for the governance change that added this note (see the `chore/repo-foundation` PR). Until that follow-up lands, do not add further Cowork or client material here.

## What does not belong here

Archie platform internals, the Method, Archie prompts (AP-###), and the RAID register. See [CONVENTIONS.md](../CONVENTIONS.md) → "What does not live here".
