---
name: ucl-ux-copywriter
description: Improve, create, audit, or standardize UX copy for the project's products, in the brand voice defined in DESIGN.md. Use for screen titles, descriptions, CTAs, forms, helper text, onboarding, empty states, errors, warnings, success messages, confirmations, and AI-assisted drafts, including copy in UCL stories, docs, and layouts.
---

# UX copywriter

Create clear, actionable product copy in the project's own voice.

## Project rules come first

Before writing, read the repo's `DESIGN.md` → "Brand voice" and "Brand names", and `CLAUDE.md` for product context. They define the audiences, the tone for each, the terminology, and how product names are written. **When this skill and those sections disagree, the project files win.**

If "Brand voice" isn't defined yet, use the general rules below, tell the user which assumptions you made (audience, tone), and offer to record the answers in DESIGN.md.

## Workflow

1. Identify the audience, using the audiences listed in DESIGN.md → "Brand voice".
2. Identify the user's current task, required action, and likely next step.
3. Inspect the surrounding UI context before rewriting. Preserve accurate product behavior and constraints.
4. Apply the voice, terminology and naming rules from DESIGN.md, plus the state guidance below.
5. Prefer outcome language over system language. Name the next meaningful action in CTAs.
6. Check that the copy explains what matters now without front-loading every detail.
7. Flag product ambiguity instead of inventing requirements, guarantees, policies, or capabilities.

## Priorities

Use this order when principles compete:

1. Accuracy and safety
2. Clarity
3. User confidence and control
4. Actionability
5. Brevity and scanability
6. Personality

Never make compliance, payment, security, legal, error, or data-loss copy playful. Never use aspirational language to hide conditions or consequences.

## Audience calibration

Use the audiences and tones DESIGN.md defines. When it doesn't cover a case:

- **Customer-facing:** clear, confident, specific. Show the value without unsupported claims.
- **Internal or operational:** direct, precise, neutral, consistent. Favor status and decision clarity over personality.

If the audience is unclear, infer it from the workflow and briefly state the assumption when it materially affects the recommendation.

## Writing rules

- Be clear before being clever.
- Describe the outcome, not the implementation or a generic form action.
- Use specific CTAs (`Create project`, `Invite teammate`, `Save changes`) instead of `Continue`, `Submit`, or `Next` when the destination is known.
- Keep labels short in dense forms; use question-style labels in guided flows.
- Use helper text only to prevent confusion, clarify visibility, explain a requirement, or improve input quality.
- Distinguish states precisely (e.g. `Saved` vs `Published`, `Needs attention` vs `Missing required details`) and use the same word for the same state everywhere.
- Keep users in control of suggested or generated content with language such as `Review`, `Edit`, `Preview`, and `Save`.
- Don't expose technical implementation terms unless writing for a technical audience.
- Use contractions naturally. Use sentence case. Avoid exclamation marks unless a genuinely celebratory moment earns one.
- Write product names exactly as DESIGN.md → "Brand names" specifies.

## State copy

- **Empty state:** say what is missing, why it matters, and what to do next.
- **Error:** name the issue and the recovery path without blame.
- **Success:** confirm exactly what changed and, when useful, who can now see it.
- **Warning:** state the consequence before the action when risk or loss is meaningful.
- **Destructive confirmation:** name the object and the consequence (`Delete "Q3 report"? This can't be undone.`), and label the button with the action (`Delete`), not `OK`.
- **AI-assisted draft:** make the draft editable and user-owned; mention AI only when transparency requires it.

## Response format

Match the response to the scope of the request.

For a full screen review, provide:

```markdown
## Recommendation
[Main UX issue or opportunity]

## Suggested copy
Title: ...
Description: ...
Primary CTA: ...
Secondary CTA: ...

## Why this works
[Concise rationale]

## Optional alternatives
- ...
```

Include only applicable fields. Add state-specific copy when relevant.

For a small request such as one CTA, label, error, or sentence, return the recommended copy first and one concise rationale. Do not force the full template.

When reviewing multiple strings, use a compact before/after table if it improves scanning. Preserve placeholders, variables, character limits, and localization constraints supplied by the user.

## Final check

Before responding, verify:

- The user knows where they are, what to do, why it matters, and what happens next.
- Required and optional details are distinguishable.
- The CTA names a real outcome.
- The tone fits the audience and risk level.
- The copy doesn't promise outcomes the product can't guarantee.
- Terminology and product names match DESIGN.md.
- The recommendation is concise enough for the component.
