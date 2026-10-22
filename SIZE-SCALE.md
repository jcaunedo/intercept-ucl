<!--
Created: Oct 21, 2026
Created by: Julio Caunedo
Last updated: Oct 21, 2026
Scope: the `size` prop and heights of interactive controls in UCL (buttons, inputs, and future selects, pills, toggles, button groups, segmented controls).
Purpose: keep control heights aligned across components, with shadcn/ui and with Figma, under one set of size names.
-->

# Control Size Scale

Controls that sit in the same row (a form, a toolbar, a filter bar) share one set of heights. Then a Button next to an Input lines up without either one being adjusted.

The heights are **shadcn/ui's**, value for value. The names are UCL's: `xs`, `sm`, `md`, `lg`. Figma uses the same names, so a size reads the same in design and code.

## Scale

| `size` | Height | Tailwind | Icon-only square | shadcn name | Role                                     |
| ------ | ------ | -------- | ---------------- | ----------- | ---------------------------------------- |
| `xs`   | 24 px  | `h-6`    | `icon-xs`        | `xs`        | Very compact: tags, dense table rows     |
| `sm`   | 32 px  | `h-8`    | `icon-sm`        | `sm`        | Compact: dense toolbars, inline actions  |
| `md`   | 36 px  | `h-9`    | `icon-md`        | `default`   | **Default ★**: most surfaces             |
| `lg`   | 40 px  | `h-10`   | `icon-lg`        | `lg`        | Large / emphasis: hero forms, onboarding |

Use `md` unless a density requirement forces otherwise. Don't mix sizes within one row or toolbar.

ℹ️ **shadcn:** the only naming difference is the 36px step. shadcn calls it `default` (and its icon square `icon`); UCL calls them `md` and `icon-md`. When porting shadcn code, rename `size="default"` to `size="md"` and `size="icon"` to `size="icon-md"`. UCL still accepts `default` and `icon` as deprecated aliases, so pasted shadcn code works unchanged.

ℹ️ **Figma:** components are moving to the same names (Oct 21, 2026). Until a component is renamed, translate its old Figma size by height: `md · 32` → `sm`, `lg · 36` → `md`, `xl · 40` → `lg`. Figma's old `sm · 28` has no size in this scale; a component drawn at 28px needs a decision before it's built.

## Component support

| Component  | `size` values                                                             | Default | Notes |
| ---------- | ------------------------------------------------------------------------- | ------- | ----- |
| `Button`   | `xs` · `sm` · `md` · `lg` · `icon-xs` · `icon-sm` · `icon-md` · `icon-lg` | `md`    | shadcn's classes. `xs` uses 12px text and a 12px icon; the others 14px and 16px |
| `Input`    | `md` · `lg`                                                               | `md`    | shadcn's Input has no `size` prop (always 36px); `lg` comes from Figma |
| `Textarea` | `md` · `lg`                                                               | `md`    | Heights are minimums (`min-h-9`, `min-h-10`); it grows with its text |
| `Badge`    | `xs` · `sm` · `md` · `lg`                                                 | `md`    | 12px label at `xs`, 14px above; 12px icon at every size. shadcn's Badge has no `size` prop |

`default` (and Button's `icon`) still work on all three as deprecated aliases. `data-size` always reports the current name (`md`, `icon-md`).

ℹ️ `Switch` (`default` · `sm`) and `TooltipContent` (`default` · `sm`) also take a `size` prop, but it isn't a control height, so they're outside this scale.

## Rules for new controls

- Take heights and names from the scale above: `xs` (24px), `sm` (32px), `md` (36px), `lg` (40px). Default to `md`.
- Check shadcn's current source for the component first (CLAUDE.md "Adding a shadcn Primitive"). Support the sizes shadcn gives it (renaming `default` to `md`), plus any Figma draws that shadcn doesn't (as Input's `lg`).
- Icon-only squares are `icon-xs`, `icon-sm`, `icon-md` and `icon-lg`, one per height.
- Write the Figma size in a comment beside each `size` variant (see `forms/input/input.tsx`), so the mapping survives a resync.
- Renaming or removing a `size` value is breaking (CLAUDE.md "Semver"). Keep the old name as a deprecated alias for a release, as `default` and `icon` are now.

## Usage

```tsx
// md (36px), the default
<Button>Save</Button>
<Input placeholder="Email" />

// Compact row
<Button size="sm">Filter</Button>
<Button size="icon-sm" aria-label="More"><MoreHorizontalIcon /></Button>

// Very compact
<Button size="xs">Edit</Button>

// Large / hero form
<Button size="lg">Get started</Button>
<Input size="lg" placeholder="Your email" />
```
