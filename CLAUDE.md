# Intercept UCL (Unified Component Library)

Shared React component library for Intercept's frontend applications. Built with React 19, Tailwind CSS 4 and TypeScript, on shadcn/ui (Radix).

## Project

Everything specific to this project is in this section, "Stack", "Figma", and DESIGN.md → "Brand names" / "Brand voice". The rest of the setup is project-agnostic.

| Item         | Value                                                        |
| ------------ | ------------------------------------------------------------ |
| Project      | Intercept                                                    |
| Package      | `@jcaunedo/intercept-ucl`                                    |
| Registry     | GitHub Packages, `@jcaunedo` scope (`https://npm.pkg.github.com`) |
| Repository   | https://github.com/jcaunedo/intercept-ucl                    |
| Apps         | `intercept-live`: Intercept Live, the clinical surveillance app ([Figma](https://www.figma.com/design/EKg9ovtsHlQoK3DAS0F5IM/Intercept-Live), `fileKey` `EKg9ovtsHlQoK3DAS0F5IM`). Layouts in `src/layouts/intercept-live/` |
| Brand        | DESIGN.md → "Brand names", "Brand voice"                     |

## How the rules work

- **CLAUDE.md** (this file): operational instructions, how things are built here. Covers the stack, folder structure, component and story conventions and theme tokens.
- **[MOTION.md](MOTION.md)**: the motion system. Covers principles, the named patterns, component guidance, accessibility and validation. Read it before any animation work. The values live in `src/lib/motion/`.
- **[ARCHITECTURE.md](ARCHITECTURE.md)**: how each app's layouts are wired, one section per app. Covers which file does what, how the pieces connect and which files are sample data to replace.
- **[DESIGN.md](DESIGN.md)**: design contracts and decisions. Covers why a component is built the way it is, rules that a future edit or Figma/shadcn resync could silently break, the record of Figma ↔ code discrepancies (resolved and pending), and the brand voice.
- **[prds/](prds/)**: everything about the product's content, kept apart from the code: PRDs, definitions, context and what we're building. New product docs go here, never in the repo root or next to code. Storybook shows each one under PRDs (see "Architecture" → "PRDs and Documents in Storybook").
  - **Tables over heading-and-paragraph lists:** when a doc lists items that each have a name and a short description (users, use cases, states, fields, terms), write them as a table, not as a bold heading followed by a paragraph per item.
  - **[prds/glossary.md](prds/glossary.md)**: every product, clinical and platform term with its source. Design system and UCL terms live in Storybook's Glossary page ([src/docs/glossary.mdx](src/docs/glossary.mdx)). Use these terms in specs, PRDs, stories and UI copy, and add new terms to the right one in the same change that introduces them.
- **Skills** in `.claude/skills/` (`ucl-setup`, `ucl-ds-sync`, `ucl-generate-component`, `ucl-generate-layout`, `ucl-ux-copywriter`) are project-agnostic. They read CLAUDE.md and DESIGN.md before they start (plus MOTION.md when the work involves animation) and take every project value (package, Figma file, categories, apps, component APIs, voice) from them. **When a skill and these files disagree, these files win.**
- **Not defined here?** Ask, then record the answer in the right file so the next run doesn't have to ask again.

## Quick Reference

| Command                   | Purpose                                      |
| ------------------------- | -------------------------------------------- |
| `npm run build`           | Build library to `dist/` (ESM + types + CSS) |
| `npm run dev`             | Watch mode build                             |
| `npm run storybook`       | Launch Storybook on port 6006                |
| `npm run build-storybook` | Build static Storybook site                  |
| `npm test`                | Run every story as a test (Vitest, headless Chromium) |
| `npm run lint`            | Type-check with `tsc --noEmit`               |

`.npmrc` sets `include=dev`, so installs keep dev dependencies even when `NODE_ENV=production` is set in the environment.

## Stack

The stack is set per project so UCL matches what the project's dev team ships. It's the first thing `ucl-setup` asks for. Change a row only after agreeing it with the dev team, then update every section below that depends on it.

| Concern              | Choice                                                     | Status                     |
| -------------------- | ---------------------------------------------------------- | -------------------------- |
| Framework            | React 19 (`react`, `react-dom` as peer dependencies)       | Set                        |
| Base components      | shadcn/ui on Radix (`@radix-ui/react-*`)                   | Set                        |
| Styling              | Tailwind CSS 4, tokens in `src/styles/theme.css` (oklch)   | Set                        |
| Variants             | `class-variance-authority` (`cva`) + `cn()`                | Set                        |
| Icons                | `lucide-react`                                             | Set                        |
| Motion               | `motion` (`motion/react`)                                  | Set                        |
| Forms                | `react-hook-form` + `zod`, optional peer dependencies      | Set                        |
| App rendering        | Bundle marked `"use client"` after build (works for client-only and Next.js apps) | Set |
| Build                | tsup, ESM only                                             | Set                        |
| Workbench            | Storybook 10 (`@storybook/react-vite`, `addon-docs`)       | Set                        |
| Tests                | `@storybook/addon-vitest`: Vitest 5 in Playwright Chromium; `vitest.config.ts` | Set     |
| Visual tests         | `@chromatic-com/storybook` (Chromatic, an external service; needs a Chromatic account and project) | Installed, not connected |

- **Forms:** the forms library is an optional peer dependency, so apps that use it don't get two copies and apps that don't aren't forced to install it. Form components keep the library out of primitives (`Input`, `Select`…) and add connected fields next to them.
- **Server rendering:** `scripts/add-use-client.mjs` prepends `"use client"` to `dist/index.js` after the build, so apps can import UCL from a Next.js Server Component. Client-only apps ignore it.

## Figma

| Item                    | Value                                     |
| ----------------------- | ----------------------------------------- |
| Design system file      | [archielabs.ds](https://www.figma.com/design/w8YHn6HqwgvKEyFOYkDFmW/archielabs.ds), `fileKey` `w8YHn6HqwgvKEyFOYkDFmW`. The **foundations** source: variables (tokens), text styles, effect styles, color styles and icons. |
| Components file         | [intercept.ds](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds), `fileKey` `dl8m89yfeRZ5uMXnEvdgpY`. The **components** source: every UCL component is built from its set here (Oct 21, 2026), using archielabs.ds foundations. Where a value here disagrees with archielabs.ds, `theme.css` (archielabs.ds) wins (DESIGN.md "Sidebar"). |
| Modes                   | `intercept` (light) and `intercept-dark`. archielabs.ds is shared and holds variable modes per brand. Read and sync only these two. |
| Dark mode               | `intercept-dark` → `.dark` in `theme.css`. Created from UCL on Oct 20, 2026 (DESIGN.md "intercept-dark mode"). |
| Figma MCP account       | 8base. The cloud Figma MCP read intercept.ds on Oct 25, 2026 (the Sidebar resync); archielabs.ds is untested there. If the cloud MCP can't open a file, read it through the Figma desktop MCP, with the file as the active tab. |

Skills compare every Figma URL's `fileKey` against this table: token, style and icon syncs read archielabs.ds; component builds and refines read intercept.ds. Until a file is set, they ask for it before syncing.

## Figma workflow

How Figma designs become code. The decisions themselves live in DESIGN.md.

### Figma and code

- **Figma is the starting point** for layout, typography, spacing and component states. Align the code with it.
- **The component library is the implementation source of truth** (`src/components/`): APIs, architecture, behavior and business logic.
- **Code can be ahead of Figma**, e.g. a state, an accessibility fix or a behavior Figma doesn't draw yet. Keep the code and record the gap so Figma can catch up. Never revert working code only to match a visual.
- **Figma changes don't reach code on their own.** On a resync, diff Figma against the code and patch only what changed.

### Component reuse

- Before creating or changing a UI component, inspect the existing library: "Current Component APIs" (below) and the exports in `src/index.ts`.
- Prefer existing components and APIs over new ones. Check props, variants and behavior against the implementation, not against Figma's layer names.
- If nothing suitable exists, create the component as "Creating a Custom Component" describes.

### When Figma and code disagree

- Identify the discrepancy, propose a resolution and get approval before applying it.
- Record the agreed resolution in DESIGN.md, in the component's entry (add one if there's none). Name the component file, the Figma file and node id, and the date:
  - ✅ **Resolved:** the decision and how it's implemented.
  - ⚠️ **Pending:** the discrepancy and the action it needs.
- Before a Figma sync, read the component's DESIGN.md entry. Don't reopen a resolved decision unless the user asks.
- When a pending item is settled, change it to ✅ **Resolved** in place.

## Architecture

- **Package:** `@jcaunedo/intercept-ucl`, ESM-only (see "Release & Publishing").
- **Build:** tsup bundles `src/index.ts` → `dist/index.js` + `dist/index.d.ts`. `src/styles/theme.css` is copied raw to `dist/styles.css`.
- **Styling:** two CSS files.
  - `src/styles/theme.css`: design tokens, `@theme inline` mappings, breakpoints, `:root` variables. Ships to consumers as `<package>/styles`.
  - `src/styles/globals.css`: imports Tailwind + `theme.css`. Used only by Storybook.
- **Components:** one folder per component, grouped by category under `src/components/<category>/<name>/`. Each folder holds:
  - `<name>.tsx`
  - `<name>.stories.tsx`
  - `index.ts` barrel
  - optional `<name>.mdx` docs page

  Categories: `buttons`, `forms`, `cards`, `data-display`, `feedback`, `icons`, `overlays`, `navigation`, `typography`. Create a category folder when its first component arrives. `icons` holds custom SVG icons that lucide-react doesn't have (e.g. the solid Active-state icons): one folder per icon with the `.tsx` and `index.ts`, and a single `icons.stories.tsx` gallery for the category. Don't invent a category that isn't listed here without asking.
- **Layouts:** full-page reference compositions under `src/layouts/<app>/<name>/`, previewed in Storybook and **not** exported from `src/index.ts`. Layouts used by more than one app go in `src/layouts/shared/`. Apps are listed in "Project". Screens in a multi-screen flow nest under `src/layouts/<app>/<flow>/`; list each flow here when it's created. Mock data goes in `sample-*` files, never in the screen (see "Sample Data"). Each app's wiring (which file does what, how the pieces connect, which files are sample data) is in [ARCHITECTURE.md](ARCHITECTURE.md), one section per app. Read the app's section before working on its layouts, and update it in the same change when the wiring changes; a new app gets its own section.
- **Lib:** `src/lib/`
  - `utils.ts`: `cn()`
  - `breakpoints.ts`: `breakpoints`, `mediaAbove()`
  - `hooks/use-media-query.ts`, `hooks/use-current-minute.ts` (the current time, updating on each minute boundary; `null` on the server)
  - `motion/`: tokens, transitions, variants, patterns, reduced-motion and scroll helpers
  - `relative-date.ts`: `formatRelativeDate()`
- **Imports:** use the `@/` alias (`@/lib/utils`, `@/components/<category>/<name>`). Import another component through its folder `index.ts`, never a deep relative path.
- **Docs:** Storybook MDX pages live in `src/docs/` (Introduction, Glossary, Foundations, Guidelines, PRDs, Documents). Sidebar order is Introduction → Glossary → Foundations → Guidelines → PRDs → Documents → component categories.
- **PRDs and Documents in Storybook:** each file in `prds/` and `documents/` (project source material: the system specification, team brief, client notes) has a page in `src/docs/prds/` or `src/docs/documents/` (`<kebab-name>.mdx`) that imports the markdown raw (`../../../prds/<file>.md?raw`) and renders it with `<Markdown>`, titled `PRDs/<Name>` or `Documents/<Name>`. The `.md` stays the only source; never copy its text into the page. A new file in either folder gets its page, and its place in that section's order in `.storybook/preview.ts`, in the same change.

## Code style

- Tabs for indentation, double quotes in TS, single quotes in JSX attributes (`data-slot='button'`).
- React 19: `ref` is a regular prop. Don't use `React.forwardRef`.
- Props are typed as `React.ComponentProps<"el"> & VariantProps<typeof <name>Variants> & { …extras }`.
- Named exports only, collected at the bottom of the file: `export { Button, buttonVariants };`.
- **Comments are for developers.** Explain behavior, accessibility and any non-obvious *why*. Don't label classes with their Figma variant, layer or token names, and don't restate what a class already says (`px-3` needs no "12px padding"). Figma mapping, deviations and history go in DESIGN.md.
- **One Figma reference per component:** the last line of the exported component's JSDoc links its Figma node, `Figma: [intercept.ds › <set name>](<node URL>)`. Storybook autodocs shows it as a link, so designers find the source from there. Mention Figma anywhere else only when the code can't be understood without it, e.g. Badge variant names that differ from Figma's Style × Tone names.

## Adding a shadcn Primitive (scaffold → relocate)

The shadcn CLI writes a flat file into `src/components/ui/`. Here that folder is only for **staging**:

```bash
npx shadcn add <component>
```

1. Move `src/components/ui/<component>.tsx` → `src/components/<category>/<component>/<component>.tsx`.
2. Rewrite sibling-component imports to the `@/components/<category>/<name>` alias.
3. Convert any `React.forwardRef` to a plain function component (see "Code style").
4. Add `index.ts` re-exporting the component, its variants and its types.
5. Add `<component>.stories.tsx` (see below).
6. Export from `src/index.ts` under the category banner, then delete the empty `src/components/ui/`.

Always check shadcn's current source, not memory: `https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/new-york-v4/ui/<component>.tsx`.

## Creating a Custom Component

Create `src/components/<category>/<name>/` with these files (use `buttons/button/` as the template):

### `<name>.tsx`

- `cva` for variants, with `defaultVariants` set. `cn()` from `@/lib/utils` to merge classes.
- Default `variant`/`size` in the parameter list, and set `data-slot='<name>'`, `data-variant` and `data-size` on the root element.
- Use `asChild` (`Slot` from `@radix-ui/react-slot`) when the component should be able to render as a link or other element.
- Use tokens through Tailwind utilities (`bg-primary`, `text-foreground-subtle`, `rounded-md`). Never raw hex.
- A one-line JSDoc on the exported component, ending with its Figma reference (see "Code style").

### `<name>.stories.tsx`

- `const meta = { … } satisfies Meta<typeof Component>` with `title: "<Category>/<Component>"` (e.g. `Buttons/Button`).
- One story per variant/state, plus an `AllVariants` story that renders every variant and size together.
- `tags: ["autodocs"]`, unless the component has its own `<name>.mdx` page. The MDX page replaces autodocs.

### `<name>.mdx` (optional)

Add one when a component needs usage guidance beyond props: when to use each variant, accessibility notes, do's and don'ts. Attach it with `<Meta of={Stories} />` and show stories with `<Canvas of={…} />`. Example: `buttons/button/button.mdx`.

### `index.ts`

Re-export the component, its `<name>Variants` and any prop types. Then add the same names to `src/index.ts` under the category banner:

```ts
/* -------------------------------------------------------------------------- */
/* Buttons                                                                    */
/* -------------------------------------------------------------------------- */

export { Button, buttonVariants } from "@/components/buttons/button";
```

## Updating an Existing Component

- Modify the component file directly. Preserve everything the change doesn't touch.
- Update stories (and the MDX page, if any) when the API changes.
- Update `src/index.ts` when exports change.
- Renaming or removing a `cva` variant key, prop or exported type is **breaking** for consuming apps. Call it out.
- Run `npm run lint` and `npm run build`.

## Current Component APIs

Mirror these names when a new component has the same concept. Keep this list current when components are added.

- **Button** (`buttons/button`):
  - `variant`: `default` | `neutral` (Solid · Neutral: `neutral` fill, `neutral-foreground` label; Patient details' Messages) | `secondary` | `outline` | `ghost` | `link` | `destructive` | `circle` (white and round over a dark surface, the same in both modes; "button circle variant", DESIGN.md "Button circle variant")
  - `size`: `xs` | `sm` | `md` (default) | `lg` | `icon-xs` | `icon-sm` | `icon-md` | `icon-lg`: 24 / 32 / 36 / 40px (SIZE-SCALE.md). `md` follows intercept.ds lg · 36 (12px radius `rounded-button-md`, semibold label, 6px icon gap); the other sizes still use shadcn's classes. `default` and `icon` are deprecated aliases of `md` and `icon-md`
  - `asChild` renders the button styles on its child (use for links)
- **Typography** (`typography/typography`):
  - `size`: `xs` | `sm` | `base` | `lg` | `xl` | `2xl` | `3xl` | `4xl` | `5xl` | `6xl` | `7xl` (`2xl` and up use `font-display`, as in Figma)
  - `weight`: `regular` | `medium` | `semibold` | `bold` | `black`
  - `as` sets the element; `h1`–`h4` default to `2xl`/`xl`/`lg`/`base` `semibold` (`typographyHeadings`). Page title: `as="h1" size="3xl"`
- **Input** and **Textarea** (`forms/input`, `forms/textarea`): `size`: `md` (36px, default) | `lg` (40px); `default` is a deprecated alias of `md`. States are native/ARIA (`aria-invalid`, `readOnly`, `disabled`), not variants
- **Select** with `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`, `SelectGroup`, `SelectLabel`, `SelectSeparator` (`forms/select`): shadcn's API on Radix. SelectTrigger `size`: `sm` | `md` (default) | `lg` (32 / 36 / 40px; `default` is a deprecated alias of `md`), styled like Input. SelectContent `position`: `item-aligned` (default) | `popper`
- **Checkbox**, **RadioGroup** + **RadioGroupItem**, **Switch** (`forms/…`): Radix primitives. Switch `size`: `default` | `sm`, `label` (built in: medium, muted off / `foreground` on) and `labelSide` (`right` default | `left`)
- **Label** (`forms/label`), and **Field** with `FieldSet`, `FieldLegend` (`variant`: `legend` | `label`), `FieldGroup`, `FieldContent`, `FieldLabel`, `FieldTitle`, `FieldDescription`, `FieldError` (`forms/field`). Field `orientation`: `vertical` | `horizontal` | `responsive`
- **EmptyState** (`feedback/empty-state`): a centered message for a view with nothing to show. `title`, `description?`, `icon?`, `buttonLabel?` + `buttonIcon?` + `buttonProps?` (a primary `lg` Button), `headingLevel` (`h2` default | `h3`). Ported from bethere-ucl; same API there and in verita-ai
- **Tooltip** with `TooltipProvider`, `TooltipTrigger`, `TooltipContent` (`overlays/tooltip`). Content `size`: `default` | `sm`
- **Badge** (`data-display/badge`): `variant`: `default` | `secondary` | `neutral` | `destructive` | `outline` | `ghost` | `link` (Button's names, plus `neutral` for Solid · Neutral), plus the category tones `blue` | `green` | `sky` | `purple` | `red` | `yellow` | `amber` (Figma Style=Flat; `badge-*` tokens). Figma Style × Tone pairs, see badge.tsx. `size`: `xs` | `sm` | `md` (default) | `lg` (24 / 32 / 36 / 40px; `xs`/`sm` have a 14px label, `md`/`lg` 16px). `xs-alt` is a deprecated alias of `xs`. `asChild` renders it as a link, which turns on hover. An icon goes first in the children (sized by the badge: 12px, 14px at `sm` and `lg`, 16px at `md`; its side's padding is 2px less, except `lg`). `count` adds "· n" after the label (shown whenever set, 0 included). A trailing icon goes last in the children and shows after the count
- **Counter** (`data-display/counter`): `variant`: `default` | `neutral` | `secondary` | `outline` (Badge's names; Figma Solid / Solid · Neutral / Flat / Outlined) | `critical` | `high` | `medium` | `low` | `resolved` (PatientCardAlert's severities). `size`: `xxs` (20px, default) | `xs` (24px). `count` + optional `max` ("99+"); without `count` it shows `children`
- **Avatar** with `AvatarImage`, `AvatarFallback`, `AvatarBadge`, `AvatarGroup`, `AvatarAdd` (`data-display/avatar`): shadcn's API on Radix. Avatar `size`: `xs` | `sm` (default) | `md` | `lg` (24 / 32 / 36 / 40px). AvatarFallback `tone`: `none` (default, neutral) | `1`–`10` (initials colors). AvatarBadge is the online dot. AvatarGroup overlaps its avatars, first on top. AvatarAdd is an add button (`label`, `size`)
- **HospitalSectionHeader** (`data-display/hospital-section-header`): heads one hospital's group of patients. `name`, `patientCount`, `alertCount` (0 shows "No alerts"), `headingLevel` (`h2` default | `h3` | `h4`), `icon` (lucide, default hospital)
- **PatientHeader** (`data-display/patient-header`): heads a patient's page. PatientCard's identity, location, `alert`, `acuity`, `trajectory` and `tags` (Badge `xs`, `secondary` by default), plus `photo` / `initials` / `tone` (a 64px avatar, a circle), `details` (strings after the location, e.g. "ICU day 3", "64 kg"), `headingLevel` (`h1` default | `h2`) and `actions` (a slot on the right, e.g. Live Camera and Messages). One line under the name: "13 acuity score  Critical · ▲ +4 in last 24 h · 39 F · MRN … · hospital · unit · bed · details"
- **Logo** and **LogoSymbol** (`data-display/logo`): the "Intercept Live" wordmark with its mark, and the mark alone, 31px tall by default
- **Sidebar** with `SidebarMenuButton`, `SidebarDivider` and the `SidebarNavItem` type (`navigation/sidebar`):
  - `groups` (nav items, a divider between groups), `footerItems`
  - `collapsed` / `defaultCollapsed` / `onCollapsedChange`, `activeItem` / `defaultActiveItem` / `onNavigate`
  - Item: `icon`, `activeIcon`, `label`, `suffix`, `onClick`, `navigateTo`. SidebarMenuButton adds `active` and `collapsed`
- **Solid icons** (`icons/<name>-solid-icon`): `SquareActivitySolidIcon`, `LayoutGridSolidIcon`, `BoxSolidIcon`, `CircleUserSolidIcon`, `EyeSolidIcon`, `TriangleAlertSolidIcon`, `MessageCircleMoreSolidIcon`, `HeartCrackSolidIcon`, `ShieldSolidIcon`, `ChartColumnSolidIcon`, `HomeSolidIcon`. Pass one as a nav item's `activeIcon`. They fill with `currentColor`. `MessageCircleSolidIcon` is the "message" PatientCardAlert's icon. Custom (archielabs.ds, not solid pairs): `MonitorViewMinimizedIcon`, `MonitorViewExpandedIcon`, the condensed / full monitor views
- **PatientCard** with `PatientCardAlert` and `PatientCardMetric` (`cards/patient-card`):
  - Card data: `lastName`, `firstName`, `mrn`, `sex`, `age`, `hospital`, `unit`, `room`, `bed`, `alert` (`{ variant, count?, label? }`), `acuity` (`{ label, score, level }`; `level`: `low` | `moderate` | `high` | `critical` | `unknown`, shown as "Low" … "Critical" / "Unknown"; no score means Unknown), `trajectory` and `vitals[]` (metric props), `tags[]` (`{ label, variant }`, Badge `outline` by default). Every part is optional except the name
  - Interaction: `onOpen` or `href` makes the whole card one click target; on hover it lifts, takes a 2px `foreground` border and `shadow-lg`. `onMoreActions` is deprecated and ignored (no "…" button since Oct 30, 2026). Tags stay on one line and scroll sideways when they don't fit
  - An `alert` of `critical` | `high` | `medium` | `low` gives the card a 2px ring in that severity's color, over a 5% tint, which pulses (Urgency motion pattern, in step with every other card) until the card is clicked or `alert.status` is `acknowledged` / `escalated`; a new severity pulses again. Static under reduced motion. The pill fades in and out (Dismiss); a `resolved` pill fades slowly (`resolvedFadeTransition`)
  - `variant`: `compact` (default since Oct 26, 2026; for the Census: no vitals since Oct 27, 2026, `vitals` is ignored and `shortLabel` has no effect) | `expanded` (vitals as metrics in their own row)
  - `patientCardAcuityLevels` maps an acuity `level` to its words and color class, for pages that show acuity outside the card
  - PatientCardAlert `variant`: `critical` (default) | `high` | `medium` | `low` | `resolved` | `message`; `count` (shown as "· 3" only when 2 or more); `children` replaces the label
  - PatientCardMetric `variant`: `default` | `destructive` | `success` | `missing`; `label`, `value`, `trend` (`up` | `down`, ▲▼) with `trendVariant` (`critical` | `success`) coloring the arrow only, `range` (`above` | `below`, ↑↓)
- **AppHeader** (`navigation/app-header`): Intercept Live's top bar. `variant`: `default` | `patient` (`AppHeaderDefaultProps` | `AppHeaderPatientProps`). Both: `onToggleTheme`, `theme`, `compact`; buttons are Button `outline` (`md`, `icon-md`). `default`: `clock`, `team` (`AppHeaderPerson`), `user` (`AppHeaderUser`: `name`, `initials`, `src?`, `tone?`, `shiftEnds`), `unreadMessages`, and `onOpenMessages`, `onOpenTeam`, `onOpenUserMenu`; one 8px row: Messages, Theme, team, user. `patient` (a patient's page): `onToggleAskIntercept` + `askInterceptOpen` and `onTogglePatientList` + `patientListOpen` (ghost icon toggles on the left, each followed by a rule, shown only with their handler), `sourcePage`, `patientName` (a Breadcrumb `sm` back to the source page, no arrow), `backHref` or `onBack`, and `onRaiseConcern`, `onHuddleTeam`, `onEscalate`, `moreActions` (`AppHeaderMenuAction[]`: `label`, `icon?`, `onSelect?`, the "…" menu); one 8px row: Raise concern, Huddle team, Escalate, Theme, "…"; no Online badge, clock, messages, team or user. `onSearch` is deprecated and ignored (no Search button since Oct 27, 2026; search is in the Sidebar). Messages shows "n messages" ("1 message"). `theme` (`light` default | `dark`) picks the theme button's icon and label (moon → "Switch to dark mode", sun → "Switch to light mode"); `compact` animates the vertical padding from 12 to 8px (60 → 52px tall) (for a sticky header while the page scrolls). The Online dot uses the Live motion pattern
- **Breadcrumb** with `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink`, `BreadcrumbPage`, `BreadcrumbSeparator`, `BreadcrumbEllipsis` (`navigation/breadcrumb`): shadcn's API (Radix, so BreadcrumbLink takes `asChild`). BreadcrumbList `size`: `xs` (24px, 14px text, default) | `sm` (32px, 16px text). An icon first in a BreadcrumbLink's children is 14px (the back arrow on the first link). Links `muted-foreground`, hover `foreground`; BreadcrumbPage medium `foreground`; chevron separators and the ellipsis in `icon-muted`
- **PatientMonitoringCard** (`cards/patient-monitoring-card`, draft): PatientCard's identity, location and alert pill over a live bedside monitor. `vitals` (`hr`, `spo2`, `systolic`, `diastolic`, `map`, `rr`; missing shows "--"), `limits` (alarm `[low, high]` per `hr`, `spo2`, `systolic`, `rr`; adult ICU defaults; a value outside them gets a ↑ / ↓ tag in its label row), `expanded` / `defaultExpanded` / `onExpandedChange` (condensed ECG strip + four numerics ↔ full four-lane monitor). `size`: `md` (default) | `sm` (compact). Under ~340px wide, `md`'s condensed numerics drop their units and widen ABP, as `sm` does. `plot`: `waveform` (default) | `trends` (each parameter's last hour, from `trends`: `MonitorTrends`; condensed, a sparkline under each numeric; full, a trend line in each lane). `condensedView` is its deprecated alias. Waveforms sweep at the patient's HR / RR; still under reduced motion. `alert`, `onOpen` and `href` behave as on PatientCard (pulsing alert ring until clicked or addressed; whole card opens the patient). `defaultMonitorLimits` exports the default limits, so a page can filter on the same ones. **PatientMonitor** is the full four-lane monitor without the card (`vitals`, `limits`, `plot`, `trends`; 240px, a height in `className` stretches it), for a page that already shows the patient
- **Tabs** with `TabsList`, `TabsTrigger`, `TabsContent` (`navigation/tabs`): shadcn's API on Radix. Tabs `value` / `defaultValue` / `onValueChange`, `orientation`. TabsList `variant`: `default` | `line`; `size`: `md` (default) | `lg` (36 / 40px), which also sets the triggers' padding and label size (`tabsTriggerVariants`). A trigger's children are its label, a 16px icon, or both; icon-only tabs need an `aria-label`. `tabsIndicatorVariants` is the raised fill / underline
- **SidebarTooltip** (`overlays/sidebar-tooltip`): `label`, `side` (default `right`), `disabled`, `defaultOpen`. Wraps one trigger element
- **ChatComposer** (`forms/chat-composer`): a chat's message box. `value` / `defaultValue` / `onValueChange`, `onSubmit(message)` (Enter or Send; trimmed, never empty; an uncontrolled field clears), `placeholder`, `label` (the field's accessible name, defaults to `placeholder`), `disabled`. Optional buttons, each shown with its handler: `onAttach` (+), `onDictate` (microphone), `onVoice` (voice, until there's text; then Send). `generating` + `onStop`: Stop replaces Send while an answer is being written. `commands` (`ChatCommand[]`: `name`, `description`): a slash button and a commands menu (also on "/"); picking writes "/name " into the message
- **DropdownMenu** with `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem` (`variant`: `default` | `destructive`; `inset`), `DropdownMenuCheckboxItem`, `DropdownMenuRadioGroup` + `DropdownMenuRadioItem`, `DropdownMenuLabel`, `DropdownMenuSeparator`, `DropdownMenuGroup`, `DropdownMenuShortcut`, `DropdownMenuSub` + `SubTrigger` + `SubContent`, `DropdownMenuPortal` (`overlays/dropdown-menu`): shadcn's API on Radix, styled like Select's list

Forms, Overlays and Typography were ported from archie-ucl (same Figma file, Archie modes). Keep them in step with it where the Figma design is shared; values that differ by mode come from `theme.css`.

## Sample Data

Layouts are reference implementations that the apps rebuild with their own data, so mock data stays separate from the UI. Every developer handoff relies on this: everything in a `sample-*` file gets replaced with API data, and everything else is code to keep.

- **Samples live in typed `sample-*.ts` files** beside the screen or step that uses them (e.g. `<flow>/steps/pricing/sample-pricing.ts`). Use `.tsx` only when the sample renders JSX. Type every sample with the type its screen exports (`export const samplePricing: PricingAnswers = { … }`). Never JSON.
- **Screens and steps take their data through props** and never import a `sample-*` file, not even as a default value (`listings = sampleListings` is not allowed). Data props are required, or default to an empty value (`""`, `[]`, `{}`) that represents real, empty data.
- **Stories pass the samples in**, through `args` or the story's render function (`args: { listings: sampleListings }`).
- **Shared samples:**
  - Data used by several steps of one flow goes in that flow's `shared/sample-*.ts` (e.g. `src/layouts/<app>/<flow>/shared/sample-listing.ts`).
  - Data shared across screens of one app goes in `src/layouts/<app>/sample-data/`.
  - Data shared across apps goes in `src/layouts/shared/sample-data/`.
  - Create these folders only once they're needed.
- **What isn't sample data:** product content stays in the screen. That covers option lists (`ageOptions`, `durationOptions`), navigation items, artwork, and Figma copy for labels or step titles. A sample is made-up data that a user or the API would supply: records, answers, profiles, photos, prices.
- **Exceptions:** a flow component that stitches steps into a clickable prototype may seed itself from `sample-*` files. List each exception here when it's created, and don't add others without agreeing them first.

## Theme & Tokens

All tokens live in `src/styles/theme.css`:

- **`@theme inline`:** maps Tailwind utilities to the CSS variables (`--color-primary: var(--primary)`), so `.dark` overrides work.
- **`@theme` breakpoints:** set 1px past each frame width. See DESIGN.md "Breakpoints include their own width".
- **`:root`:** primitives (Figma `primitives`). **`:root, .dark`:** semantic tokens, `intercept` mode. **`.dark`:** only the `intercept-dark` values that differ. Colors are written in `oklch`. Don't mix formats. DESIGN.md → "Figma → theme.css token map" lists the Figma variable behind every token.
- **Semantic roles** use shadcn names: `background`, `foreground`, `card`, `popover`, `primary`, `secondary`, `muted`, `accent`, `destructive` (each with `-foreground`), and `border`, `input`, `ring`. Beyond those, the Figma tone system: surfaces (`background-subtle`, `card-muted`…), tones (`brand`, `neutral`, `info`, `success`, `warning`, `destructive`, each with `-subtle`/`-muted`), icons, states, charts and sidebar.
- **Radius:** `--radius` (0.5rem, Figma `radius/default`); `rounded-sm/md/lg` derive from it. Component radii that differ get their own token: `rounded-input` (10px), `rounded-menu` and `rounded-card` (16px), `rounded-button-md` (12px), `rounded-avatar-lg` (20px; unused since Oct 29, 2026). Add each new one to `cn()`'s tailwind-merge radius list in `src/lib/utils.ts`.
- **Spacing:** Tailwind's default 4px scale. Don't redefine it.

To add a semantic token, add it to `:root, .dark` (and to `.dark` when its dark value differs), then map it in `@theme inline`. Adding a token is a minor version; renaming or removing one is breaking.

## Motion System

The motion rules live in [MOTION.md](MOTION.md): principles, personality, the named patterns (Lift, Press, Reveal…), component guidance, accessibility and the validation checklist. **Read it before adding or changing any animation.**

- Import Motion APIs from `motion/react`.
- Take every duration, easing, spring, distance and variant from `src/lib/motion/`. Never write raw motion values in a component.
- Respect reduced motion with `useMotionPreference()` and its `resolve()` helper.

## Key Files

| File                      | Purpose                                                       |
| ------------------------- | ------------------------------------------------------------- |
| `src/index.ts`            | Public API: every consumer-facing export                      |
| `src/styles/theme.css`    | Design tokens and breakpoints, shipped to consumers           |
| `src/styles/globals.css`  | Storybook entry CSS                                           |
| `src/lib/`                | `cn()`, breakpoints, media query hook, motion system          |
| `src/docs/`               | Storybook Introduction and Foundations pages                  |
| `components.json`         | shadcn CLI configuration                                      |
| `tsup.config.ts`          | Library build configuration                                   |
| `.storybook/`             | Storybook setup, Tailwind plugin, `@/` alias, sidebar order   |
| `netlify.toml`            | Netlify hosting for the static Storybook site                 |

## Release & Publishing

- **Registry:** set in "Project" (GitHub Packages by default). `publishConfig.registry` in `package.json`, the scope line in `.npmrc` and `registry-url` in `.github/workflows/publish.yml` must match it.
- **Version bump:** `npm run release:patch|minor|major` wraps `npm version`. `preversion` runs `npm run lint`; `npm version` bumps `package.json`, commits and tags `vX.Y.Z`; `postversion` runs `npm run build`.
- **Publish:** `.github/workflows/publish.yml` runs on pushes to `main` that touch `package.json`, compares the version with the previous commit, and publishes only when it changed. Normal merges release nothing. It never publishes while `package.json` has `"private": true` (the unconfigured template; `ucl-setup` removes it) or on a first commit with no previous version, so the first release always comes from `npm run release:*`.
- **Release flow:** commit your work (clean tree) → `npm run release:*` → `git push && git push --tags`.
- **Semver:**
  - **Patch:** fixes and visual tweaks.
  - **Minor:** new components, optional props, variants or tokens.
  - **Major:** removing or renaming a component, prop or token, or changing a default.
  - Below 1.0.0, a minor bump is treated as breaking by package managers.

## Consumer Integration

Apps need a `.npmrc` scoping the package to the registry, plus a read-only token:

```
@jcaunedo:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NPM_TOKEN}
```

```bash
npm install @jcaunedo/intercept-ucl
```

```css
/* In the consuming app's global CSS */
@import "tailwindcss";
@import "@jcaunedo/intercept-ucl/styles";
@source "../node_modules/@jcaunedo/intercept-ucl/dist";
```

`@source` makes Tailwind scan UCL's bundled JS for class names. Without it, component styles silently go missing.

Apps also load the webfonts the font tokens name, because `theme.css` declares tokens only: **Figtree** (`--font-sans`, `--font-display`) and **Roboto Mono** (`--font-mono`), from archielabs.ds `intercept` mode. Storybook loads them in `.storybook/preview-head.html`; the README shows the `<link>` for apps.

```tsx
import { Button } from "@jcaunedo/intercept-ucl";
```

## prds writing conventions

Conventions for every doc under `prds/`.

### Status labels

Every inline prose note that flags a gap, risk, decision, confirmation or fix gets an emoji **plus a bold word label**:

- ⚠️ for anything unresolved or needing attention: `**Gap:**`, `**Constraint:**`, `**Risk:**`, `**Decision needed:**`, `**Accessibility:**`, or a more specific word that fits.
- ✅ for anything verified or resolved: `**Resolved:**`, `**Confirmed in Figma:**`, `**Copy fix:**`, or similar.
- ℹ️ for purely informative notes, with **no bold label**.

Lists where every line already starts with the same emoji don't need labels.

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

## Traceability

- Commits follow [CONVENTIONS.md](CONVENTIONS.md): `type(scope): summary [REQ-ID…] [DEC-ID]`, and the PR lists every ID.
- Each PRD carries `requirements:` front-matter citing the Cowork requirement IDs it maps to.
- [`documents/trace/`](documents/trace/README.md) maps repo files to requirement IDs; [`CHANGELOG.md`](CHANGELOG.md) records changes with IDs.
- Cowork owns the requirement IDs (PD-, SV-, …); only the repo-local PRD IDs (`MON-`, `MON-AC-`, `PC-`, `PC-AC-`) are minted here.

### Current specs (read first)

- documents/specs/ holds read-only snapshots of the Cowork specs (requirements, simulator, design updates). Cowork is the source of truth; don't edit them here.
- Before changing a component or layout, check documents/specs/design-update-spec.md for open DU items that touch it, and cite the DU and requirement IDs in the commit.
- Sample data uses the names and enums in design-update-spec.md §4 (data contracts).
