# Explorations

An index of the claude.ai artifacts we publish to review ideas: component states, page concepts, flows, and explorations built from the PRDs and synthetic sample data.

This folder only holds links. It isn't part of the UCL library or the prototype: nothing here is built, type-checked, published to npm, or loaded by Storybook.

**Access:** artifacts are private by default. Share one from its page's Share menu before you send the link to someone.

**Editing:** to change an artifact, give Claude its URL. Claude reads the published page and updates it at the same link.

**Data:** synthetic only. No real patient, clinician or hospital information in any artifact (Design Phase Team Brief, "Ground rules").

## Index

Newest first. Use the **Notes** column for open questions the artifact raised.

| Date | Artifact | What it shows | Built from | Figma | Notes |
| --- | --- | --- | --- | --- | --- |
| Oct 24, 2026 | [Census Hospital Filters](https://claude.ai/artifact/QwGs9s1zusa3dAGEmriesQ) | Provider Desktop census: hospital view tabs with live and matching counts (keys 0–3), unit chips per hospital, My patients and Group by hospital switches. Clinical filters for highest alert, alert type, SOFA acuity, 24 h change, vitals out of range, organ support, code status and safety, and Virtual Sepsis. Quick views, saved views, cards that outline what matched, and a "dim others" mode. 14 synthetic patients across 3 hospitals. | The current census design and the initial design (screenshots), [prds/patient-card.md](../prds/patient-card.md) (PC-030, PC-070, PC-080, PC-174), Intercept tokens from `src/styles/theme.css` | — (not drawn yet) | ⚠️ "Out of range" vitals use example thresholds that need clinical approval (PC-142). ⚠️ Should filters carry over at shift handoff, or reset for the incoming clinician (PC-132)? ⚠️ "Highest alert" filters by the card's top severity: should "High" also include patients whose top alert is Critical? ⚠️ A falling SOFA shows a neutral ▼ instead of the current design's green (PC-030). |
| Oct 22, 2026 | [Patient Card Scenarios](https://claude.ai/artifact/QWuNetiAkieb282hBxtt4F) | Provider Desktop: every Patient card state from the PRD (PC-120 to PC-132), in Compact and Expanded, plus a 12-patient census grid. Light/dark toggle, a simulated live feed, and a working Acknowledge on the handoff concern. | [prds/patient-card.md](../prds/patient-card.md) §15, Intercept tokens from `src/styles/theme.css`, synthetic patients written in the page | — (not drawn yet) | ⚠️ Severities, freshness and sepsis states are the PRD's proposals (OD-03, OD-05, OD-06, OD-09). ⚠️ SOFA and its categories are placeholders for the acuity model (OD-02). ⚠️ The 65 mmHg MAP limit and the stale intervals (30 min BP, 1 h temp) are examples, not configuration. ⚠️ Should Acknowledge live on the card or only in Clinical Alerting? ⚠️ Should restricted patients appear in the census, and is hospital + bed already disclosure? ⚠️ Full sepsis bundle checklist on the card, or only in Virtual Sepsis? |
