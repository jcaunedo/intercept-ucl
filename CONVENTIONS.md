# Conventions — `@jcaunedo/intercept-ucl`

How we branch, commit, version and trace work in this repository, and how PRDs are written. These conventions are additive to the build rules in [CLAUDE.md](CLAUDE.md); where this file and CLAUDE.md overlap, CLAUDE.md wins.

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
- `scope` is the area touched (`census`, `patient-census-card`, `theme`, `prds`, `repo`, …).
- `[REQ-ID…]` cites the Cowork requirement IDs the change serves; `[DEC-ID]` cites the decision it came from. The PR body lists every ID touched.

Examples, with the file each one touches:

- `feat(census): group patient counts by hospital [PD-01][CL-06]` — `src/layouts/intercept-live/census/census-panel.tsx`
- `fix(patient-census-card): colour acuity levels for clarity [PD-04]` — `src/components/cards/patient-census-card/patient-census-card.tsx`
- `docs(prds): renamespace PRD IDs off SV- [I-18]` — `prds/monitoring.md`

## IDs

The chain and the home of every prefix are defined in the Operating Model (§6) and mapped in [`documents/trace/`](documents/trace/README.md).

**Referenced here, never minted here** (the source of record is the Cowork Requirements Spec / Workbook / RAID):

`PD-`, `SV-`, `CC-`, `CD-`, `OE-`, `AL-`, `SA-`, `CA-`, `VS-`, `SC-`, `CH-`, `HO-`, `UX-`, `NFR-`, `BR-`, `SIM-`, `DEC-`, `CL-`, `R-`, `I-`, `A-`, `D-`, `CI-`.

**Minted here** (repo-local PRD IDs, so they never collide with a Cowork prefix):

Each PRD has its own prefix. The same prefix with a suffix numbers the PRD's other lists: `-AC-` acceptance criteria, `-OD-` open decisions, `-UC-` use cases (e.g. `MON-AC-01`, `CEN-OD-09`).

| Prefix | PRD | PRD created |
|---|---|---|
| `MON-` | Monitoring (`prds/monitoring.md`) | Oct 26, 2026 |
| `PC-` | Patient card (`prds/patient-card.md`) | Oct 22, 2026 |
| `CEN-` | Patients (`prds/patients.md`; PRD Census, `prds/census.md`, until Nov 16, 2026, IDs unchanged) | Nov 1, 2026 |
| `AMM-` | Alert maximized modal (`prds/alert-maximized-modal.md`) | Nov 2, 2026 |
| `CAM-` | Bedside camera (`prds/bedside-camera.md`) | Nov 3, 2026 |
| `VID-` | Video consult (`prds/video-consult.md`) | Nov 6, 2026 |
| `MSG-` | Messages (`prds/messages.md`) | Nov 6, 2026 |
| `PMN-` | Patient monitor (`prds/patient-monitor.md`) | Nov 11, 2026 |
| `NTE-` | Notes (`prds/notes.md`) | Nov 13, 2026 |
| `VSP-` | Virtual Sepsis (`prds/virtual-sepsis.md`; `VS-` is Cowork's) | Nov 13, 2026 |
| `NAV-` | Sidebar (`prds/sidebar.md`) | Nov 16, 2026 |
| `ACM-` | Account menu (`prds/account-menu.md`) | Nov 16, 2026 |
| `CNL-` | Census list (`prds/census-list.md`; `CL-` is Cowork's) | Nov 16, 2026 |

All are pending the team's OK, and are reconciled into Cowork as below. A new PRD takes a prefix that isn't in either list above, and gets its row here and in CLAUDE.md → "Traceability" in the same change.

> ⚠️ **Open:** `prds/patient-details.md` currently mints `PD-xxx` (plus `PD-AC-`, `PD-OD-`, `PD-UC-`), which **collides with the Cowork `PD-` (Provider Desktop) prefix** above. It needs a repo-local namespace of its own — the name is Julio's choice (G0-3) — and was **left unchanged** in the governance PR that added this file. Pick a namespace and renamespace it in a follow-up.

> ⚠️ **Open:** `prds/chat-composer.md` mints `CC-xxx` (plus `CC-AC-`, `CC-OD-`, `CC-UC-`), which **collides with the Cowork `CC-` (Care Coordination) prefix** the same way (e.g. Cowork CC-05 is presence; the PRD's CC-022 is the /handoff draft). It needs its own namespace too.

New "what" items a repo PRD introduces are reconciled back into Cowork on Fridays (Operating Model §4).

## Versioning

SemVer, as the [README](README.md) defines it: patch = fix / visual tweak; minor = new component, prop, variant or token; major = removing or renaming a component, prop or token, or changing a default. Below 1.0.0, a minor bump is treated as breaking by package managers.

A version bump in `package.json` **publishes** the package to GitHub Packages. Bump only through the release scripts (`npm run release:patch|minor|major`), never by hand.

## Tags

- `vX.Y.Z` — a published package version (the release scripts create these).
- `ref-vN` — a locked reference set (a design/reference snapshot cited by a trace row; Operating Model D1 / G2).

## PRD writing

Conventions for every doc under `prds/`. When a change settles a product decision, CLAUDE.md → "Keeping PRDs Current" says which PRD to update and how.

### Status labels

Every inline prose note that flags a gap, risk, decision, confirmation or fix gets an emoji **plus a bold word label**, right after the emoji and before the explanation.

- ⚠️ for anything unresolved, misaligned or needing attention, with a bold label naming the kind of issue: `**Gap:**`, `**Constraint:**`, `**Risk:**`, `**Decision needed:**`, `**Accessibility:**`, or another word that fits. Don't default to "Gap" when a more specific word fits better.
- 🙋 for an open question: something nobody has answered yet. Each bullet in an "Open questions" list starts with it, and an open question written inline reads `🙋 **Open question:**`. It's a question for someone to answer, where ⚠️ flags a known problem. A table of open questions or decisions keyed by ID needs no emoji.
- ✅ for anything resolved, decided or confirmed. The tag is always `✅ **Resolved:**`, and only that: no date, no who decided, no requirement ID, no other word (`Decision`, `Built`, `Confirmed in Figma`, `Copy fix`…). The note follows the tag as before; its design rationale, functionality and rules go in that text or in the PRD's sections, never in the tag.
- ℹ️ for purely informative or framing notes (context, scope, why a note exists), with **no bold label**. If it doesn't flag a problem, a question or a fix, it isn't ⚠️, 🙋 or ✅.

Lists where every line already starts with the same emoji don't need labels.

Examples:

> ⚠️ **Gap:** in the prototype the typing line shows only for simulated replies; whether a hospital's messaging tool reports typing at all is unknown.
>
> 🙋 **Open question:** whether the note editor can stay open beside the video consult.
>
> ✅ **Resolved:** the page panel's header has × after the notetaker's button; like the app header's pressed Video consult, it closes the panel and ends the call.
>
> ℹ️ The Census has no Card monitor or Monitor view controls: those are Monitoring's (MON-015).

Each of these tags becomes `✅ **Resolved:**`:

- `✅ **Decision (Nov 9, 2026, user's call):**`
- `✅ **Built in the prototype (Nov 4, 2026):**`
- `✅ **Resolved (Nov 4, 2026, user's call; CAM-012):**`
- `✅ **Opens only for a new incoming message (Nov 5, 2026, user's call: "…"):**`

Notes written before this rule still carry dates, who decided and other labels. Leave them as they are, and don't copy their form into new notes.

**Why:** specs must be scannable for status at a glance. The word names the status, so a reader doesn't rely on the icon alone or mistake framing text for an open risk. A ✅ tag only has to say that the item is resolved.

### Superseded decisions

When a new decision replaces an earlier one, don't delete the earlier one: strike it through, whether it's a ✅ note (tag and all) or the rule's old text, and write the new decision right after it with `✅ **Resolved:**`. The struck text shows what changed; what follows it is what holds now.

> ~~✅ **Resolved:** no Close button in the page panel's header; the app header's button does it.~~ ✅ **Resolved:** the page panel's header has × after the notetaker's button; it closes the panel and ends the call.
>
> ~~It closes as soon as the pointer leaves the flag; on touch or with the keyboard, with Escape or a tap outside.~~ ✅ **Resolved:** it stays open until a click outside.

If that decision is replaced too, strike it as well and add the newest after it, so they read oldest to newest.

**Why:** the PRD keeps track of the decisions that were replaced, next to the rule they changed, so an old decision isn't brought back by mistake.

### Creation header

New docs open with this comment block. Update `Last updated:` whenever the content changes:

```html
<!--
Created: Oct 15, 2026
Created by: <name>
Last updated: Oct 15, 2026
Scope: one or two lines on which spec doc(s) this file governs.
Purpose: one or two lines on why the file exists.
-->
```

## What does not live here

The source of record for these is the Cowork project, never this repo:

- Cowork prose requirements, workflows and business rules (only their IDs are mirrored here).
- Decisions (DEC), the change log (CL) and the RAID register.
- Raw client material (Slack notes, transcripts, emails).
- Archie prompts (AP-###), Archie platform internals and the Method.
