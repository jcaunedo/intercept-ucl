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
| Apps         | ⚠️ Not defined yet. List the apps that consume UCL (used for `src/layouts/<app>/`) |
| Brand        | DESIGN.md → "Brand names", "Brand voice"                     |

## How the rules work

- **CLAUDE.md** (this file): how things are built here. Covers the stack, folder structure, component and story conventions and theme tokens.
- **[MOTION.md](MOTION.md)**: the motion system. Covers principles, the named patterns, component guidance, accessibility and validation. Read it before any animation work. The values live in `src/lib/motion/`.
- **[DESIGN.md](DESIGN.md)**: design contracts. Covers why a component is built the way it is, rules that a future edit or Figma/shadcn resync could silently break, and the brand voice.
- **Skills** in `.claude/skills/` (`ucl-setup`, `ucl-ds-sync`, `ucl-generate-component`, `ucl-generate-layout`, `ucl-ux-copywriter`) are project-agnostic. They read CLAUDE.md and DESIGN.md before they start (plus MOTION.md when the work involves animation) and take every project value (package, Figma file, categories, apps, component APIs, voice) from them. **When a skill and these files disagree, these files win.**
- **Not defined here?** Ask, then record the answer in the right file so the next run doesn't have to ask again.

## Quick Reference

| Command                   | Purpose                                      |
| ------------------------- | -------------------------------------------- |
| `npm run build`           | Build library to `dist/` (ESM + types + CSS) |
| `npm run dev`             | Watch mode build                             |
| `npm run storybook`       | Launch Storybook on port 6006                |
| `npm run build-storybook` | Build static Storybook site                  |
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

- **Forms:** the forms library is an optional peer dependency, so apps that use it don't get two copies and apps that don't aren't forced to install it. Form components keep the library out of primitives (`Input`, `Select`…) and add connected fields next to them.
- **Server rendering:** `scripts/add-use-client.mjs` prepends `"use client"` to `dist/index.js` after the build, so apps can import UCL from a Next.js Server Component. Client-only apps ignore it.

## Figma

| Item                    | Value                                     |
| ----------------------- | ----------------------------------------- |
| Design system file      | [archielabs.ds](https://www.figma.com/design/w8YHn6HqwgvKEyFOYkDFmW/archielabs.ds), `fileKey` `w8YHn6HqwgvKEyFOYkDFmW` |
| Modes                   | `intercept`. The file is shared and holds a variable mode per brand. Read and sync token values from the `intercept` mode only. |
| Dark mode               | ⚠️ Not confirmed. Light only, or does `intercept` have a dark variant? |
| Figma MCP account       | 8base                                     |

Skills compare every Figma URL's `fileKey` against this table. Until it's set, they ask for the file before syncing tokens.

## Architecture

- **Package:** `@jcaunedo/intercept-ucl`, ESM-only (see "Release & Publishing").
- **Build:** tsup bundles `src/index.ts` → `dist/index.js` + `dist/index.d.ts`. `src/styles/theme.css` is copied raw to `dist/styles.css`.
- **Styling:** two CSS files.
  - `src/styles/theme.css`: design tokens, `@theme inline` mappings, breakpoints, `:root` and `.dark` variables. Ships to consumers as `<package>/styles`.
  - `src/styles/globals.css`: imports Tailwind + `theme.css`. Used only by Storybook.
- **Components:** one folder per component, grouped by category under `src/components/<category>/<name>/`. Each folder holds:
  - `<name>.tsx`
  - `<name>.stories.tsx`
  - `index.ts` barrel
  - optional `<name>.mdx` docs page

  Categories: `buttons`, `forms`, `cards`, `data-display`, `feedback`, `overlays`, `navigation`, `typography`. Create a category folder when its first component arrives. Don't invent a category that isn't listed here without asking.
- **Layouts:** full-page reference compositions under `src/layouts/<app>/<name>/`, previewed in Storybook and **not** exported from `src/index.ts`. Layouts used by more than one app go in `src/layouts/shared/`. Apps are listed in "Project". Screens in a multi-screen flow nest under `src/layouts/<app>/<flow>/`; list each flow here when it's created. Mock data goes in `sample-*` files, never in the screen (see "Sample Data").
- **Lib:** `src/lib/`
  - `utils.ts`: `cn()`
  - `breakpoints.ts`: `breakpoints`, `mediaAbove()`
  - `hooks/use-media-query.ts`
  - `motion/`: tokens, transitions, variants, patterns, reduced-motion and scroll helpers
  - `relative-date.ts`: `formatRelativeDate()`
- **Imports:** use the `@/` alias (`@/lib/utils`, `@/components/<category>/<name>`). Import another component through its folder `index.ts`, never a deep relative path.
- **Docs:** Storybook MDX pages live in `src/docs/` (Introduction, Foundations). Sidebar order is Introduction → Foundations → component categories.

## Code style

- Tabs for indentation, double quotes in TS, single quotes in JSX attributes (`data-slot='button'`).
- React 19: `ref` is a regular prop. Don't use `React.forwardRef`.
- Props are typed as `React.ComponentProps<"el"> & VariantProps<typeof <name>Variants> & { …extras }`.
- Named exports only, collected at the bottom of the file: `export { Button, buttonVariants };`.

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
- Use tokens through Tailwind utilities (`bg-primary`, `text-muted-foreground`, `rounded-md`). Never raw hex.
- A one-line JSDoc on the exported component.

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
  - `variant`: `default` | `secondary` | `outline` | `ghost` | `link` | `destructive`
  - `size`: `default` | `sm` | `lg` | `icon`
  - `asChild` renders the button styles on its child (use for links)
- **Typography** (`typography/typography`):
  - `size`: `xs` | `sm` | `base` | `lg` | `xl` | `2xl` | `3xl` | `4xl` | `5xl` | `6xl` | `7xl` (`xl` and up use `font-display`)
  - `weight`: `regular` | `medium` | `semibold` | `bold` | `black`
  - `as` sets the element; `h1`–`h4` default `size`/`weight` from `typographyHeadings`

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
- **`:root`:** light values. **`.dark`:** dark values. Colors are written in `oklch`. Don't mix formats.
- **Semantic roles** use shadcn names: `background`, `foreground`, `card`, `popover`, `primary`, `secondary`, `muted`, `accent`, `destructive` (each with `-foreground`), and `border`, `input`, `ring`.
- **Radius:** one `--radius` (0.5rem). `rounded-sm/md/lg` derive from it.
- **Spacing:** Tailwind's default 4px scale. Don't redefine it.

To add a token, add it to `:root` and `.dark`, then map it in `@theme inline`. Adding a token is a minor version; renaming or removing one is breaking.

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

```tsx
import { Button } from "@jcaunedo/intercept-ucl";
```

## product-specs writing conventions

Conventions for every doc under `product-specs/`.

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
