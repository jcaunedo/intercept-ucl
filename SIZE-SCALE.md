<!--
Created: Oct 21, 2026
Created by: Julio Caunedo
Last updated: Oct 21, 2026
Scope: the `size` prop and heights of interactive controls in UCL (buttons, inputs, and future selects, pills, toggles, button groups, segmented controls).
Purpose: keep control heights aligned across components, and record how UCL size names map to Figma's.
-->

# Control Size Scale

Controls that sit in the same row (a form, a toolbar, a filter bar) share one set of heights. Then a Button next to an Input lines up without either one being adjusted.

## Scale

| UCL `size` | Height | Tailwind | Figma size | Role                                                    |
| ---------- | ------ | -------- | ---------- | ------------------------------------------------------- |
| `sm`       | 32 px  | `h-8`    | `md · 32`  | Compact: dense toolbars, inline actions                 |
| `default`  | 36 px  | `h-9`    | `lg · 36`  | **Default ★**: most surfaces                            |
| `lg`       | 40 px  | `h-10`   | `xl · 40`  | Large / emphasis: hero forms, onboarding                |

Use `default` unless a density requirement forces otherwise. Don't mix sizes within one row or toolbar.

ℹ️ Figma names control sizes on a five-step scale (`xs · 24`, `sm · 28`, `md · 32`, `lg · 36`, `xl · 40`). UCL keeps shadcn's names instead, so a Figma size and a UCL size with the same name are **different heights**: Figma `lg` is UCL `default`, Figma `xl` is UCL `lg`. Translate by height, never by name.

⚠️ **Gap:** Figma's `xs · 24` and `sm · 28` have no UCL size yet. Add them only when a component in Figma needs them, and agree the prop names first, because UCL `sm` is already taken by 32px.

## Component support

| Component  | `size` values                     | Default   | Notes                                              |
| ---------- | --------------------------------- | --------- | -------------------------------------------------- |
| `Button`   | `sm` · `default` · `lg` · `icon`  | `default` | `icon` is a 36 × 36 square (`size-9`)              |
| `Input`    | `default` · `lg`                  | `default` | No `sm`                                            |
| `Textarea` | `default` · `lg`                  | `default` | Heights are minimums (`min-h-9`, `min-h-10`); it grows with its text |

ℹ️ `Switch` (`default` · `sm`) and `TooltipContent` (`default` · `sm`) also take a `size` prop, but it isn't a control height, so they're outside this scale. `Checkbox` and `RadioGroupItem` have one size (16px).

## Rules for new controls

- Take heights from the scale above, and name them the same way: `default` (36px), `sm` (32px), `lg` (40px). Default to `default`.
- Support only the sizes Figma draws for that component. Not every control needs all three.
- An icon-only square variant is `icon`, sized to the `default` height, as on Button.
- Write the Figma size in a comment beside each `size` variant (see `forms/input/input.tsx`), so the mapping survives a resync.
- Renaming or removing a `size` value is breaking (CLAUDE.md "Semver").

## Usage

```tsx
// Default (36px)
<Button>Save</Button>
<Input placeholder="Email" />

// Compact row
<Button size="sm">Filter</Button>

// Large / hero form
<Button size="lg">Get started</Button>
<Input size="lg" placeholder="Your email" />
```
