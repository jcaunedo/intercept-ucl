# Intercept UCL

Intercept's UCL (Unified Component Library): a React component library that lives in its own repo, ships design tokens as CSS, and is reviewed in Storybook before any app uses it.

## Getting started

```bash
npm install
npm run storybook
```

Storybook opens at http://localhost:6006. Installing packages from GitHub Packages needs `NPM_TOKEN` in your environment (see "Using UCL in an App" → step 1).

## Tech stack

- React 19, TypeScript (strict)
- Tailwind CSS 4, tokens in `src/styles/theme.css`
- Base components: shadcn/ui on Radix
- Icons: `lucide-react`
- Forms: react-hook-form + zod (optional peer dependencies)
- Motion for React (`motion/react`)
- Storybook 10 with MDX docs
- tsup (ESM bundle + types + CSS)

## How UCL works

### The setup

The component library lives in its own repo, separate from the apps that use it. It holds Intercept's shared UI components plus one CSS file with the design tokens (colors, type, spacing).

tsup compiles it into the `@jcaunedo/intercept-ucl` package, which has three parts: the compiled JavaScript, the type definitions, and the stylesheet with the design tokens (`@jcaunedo/intercept-ucl/styles`).

Components are built and reviewed in isolation in Storybook. Each component has stories for its states, so design and engineering review the same thing before any app touches it.

The package is published to GitHub Packages. Each app installs it like any other dependency, with a small `.npmrc` pointing the `@jcaunedo` scope at GitHub Packages plus a read-only access token (see "Using UCL in an App").

### Publishing is automated, but opt-in

A GitHub Actions workflow (`.github/workflows/publish.yml`) watches `main`. It publishes a new package only when the version in `package.json` changes. Merging normal work doesn't release anything: a release happens only when someone deliberately bumps the version. That keeps the registry clean and every release intentional.

### Day-to-day flow

1. **Build or update the component in Storybook**, with stories for every state: default, hover, disabled, error, loading, empty and so on.
2. **Export it from `src/index.ts`**, the library's public entry, so apps can import it.
3. **Get it reviewed:** design review in Storybook, code review in the pull request. Then merge it to `main`.
4. **Bump the version** with one of the release scripts below, and push the commit and the tag. CI publishes the new version.
5. **Update each app** to the new version, check the screens that use it, and ship the app through its normal deploy.

Production only changes when an app picks up the new version and deploys. Publishing a library version never changes a live site by itself.

To try unpublished library changes inside an app, link the library locally first, for example with `npm link`, `yalc` or a local `file:` dependency.

### Which version to bump

The library follows semantic versioning.

| Bump      | Example       | Use it for                                                                                                                         |
| --------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Patch** | 1.4.2 → 1.4.3 | Bug fixes and visual tweaks that don't change how a component is used: padding, a color, an accessibility fix                      |
| **Minor** | 1.4.2 → 1.5.0 | New things that don't break existing usage: a new component, optional prop, variant or design token                                |
| **Major** | 1.4.2 → 2.0.0 | Anything that could break an app: removing or renaming a component, prop or token, changing a default, or requiring a newer React |

Below 1.0.0, package managers treat a minor bump (0.7 → 0.8) as breaking, so apps don't pick it up automatically. That's fine early on, but worth knowing.

### Release scripts

`package.json` has these scripts, so a release is one command:

| Script                                            | What it does                                                                         |
| ------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `preversion`                                      | Runs `npm run lint` (the type check) first, and stops the release if it fails        |
| `release:patch`, `release:minor`, `release:major` | Run `npm version`: bump the version, create the commit and tag it (`v1.4.3`) in one step |
| `postversion`                                     | Runs `npm run build` after the bump                                                  |

The release flow:

```bash
# 1. Commit your work (the working tree must be clean)
# 2. Bump the version
npm run release:patch   # or release:minor / release:major
# 3. Push the commit and the tag; CI publishes from there
git push && git push --tags
```

### Lessons learned

- **Ship the design tokens as CSS in the package**, so apps never copy colors by hand.
- **Make Tailwind scan the library.** Each app adds an `@source` line pointing at the library's built files, or component styles silently go missing.
- **Mark the bundle as client code.** A post-build step adds `"use client"` to the bundle, so Next.js Server Components can import it.
- **Keep React a peer dependency**, not a bundled one, so apps don't end up with two copies.

## Using UCL in an App

### 1. Point the app at GitHub Packages

UCL is published to GitHub Packages, not the public npm registry. Add an `.npmrc` at the app's root so npm fetches the `@jcaunedo` scope from there:

```ini
@jcaunedo:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NPM_TOKEN}
```

`NPM_TOKEN` is a GitHub personal access token (classic) with the `read:packages` scope. GitHub Packages asks for a token even to install public packages.

- **Locally:** create the token at GitHub → Settings → Developer settings → Personal access tokens, and export it in your shell (`export NPM_TOKEN=…`). Never commit it: the `.npmrc` only names the variable.
- **In the app's CI and hosting:** add the same token as a secret named `NPM_TOKEN`.

### 2. Install

```bash
npm install @jcaunedo/intercept-ucl
```

`react` and `react-dom` 19 are peer dependencies: the app provides them, so it doesn't get two copies of React. Form components also need `react-hook-form`, `zod` and `@hookform/resolvers`, which are optional peer dependencies.

### 3. Import the styles

In the app's global CSS:

```css
@import "tailwindcss";
@import "@jcaunedo/intercept-ucl/styles";
@source "../node_modules/@jcaunedo/intercept-ucl/dist";
```

`@source` makes Tailwind scan UCL's compiled JS for class names. **Without it, component styles go missing without any error.** Adjust the path so it's relative to the stylesheet.

### 4. Load the fonts

UCL declares the font tokens in `theme.css` but doesn't load the webfonts. Intercept uses **Figtree** for body text and headlines (`--font-sans`, `--font-display`) and **Roboto Mono** for code (`--font-mono`). Each app loads them, for example with a Google Fonts `<link>` in the document `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Figtree:wght@300..900&family=Roboto+Mono:wght@100..700&display=swap" />
```

Next.js apps can use `next/font/google` instead (`Figtree`, `Roboto_Mono`). Keep the family names as they are, because the tokens refer to them by name. Without the fonts, text falls back to the system font.

### 5. Use components

```tsx
import { Button } from "@jcaunedo/intercept-ucl";

export function Example() {
	return <Button>Continue</Button>;
}
```

The tokens are Intercept's light mode. Add the `dark` class to a parent element, usually `<html>`, to switch every token to its dark value. Give the page `bg-background text-foreground`, usually on `<body>`.

## Commands

| Command                   | Description                                            |
| ------------------------- | ------------------------------------------------------ |
| `npm run storybook`       | Launch Storybook at http://localhost:6006              |
| `npm run build`           | Build the library to `dist/`                           |
| `npm run dev`             | Build in watch mode                                    |
| `npm run lint`            | Type-check with TypeScript                             |
| `npm run build-storybook` | Build the static Storybook site                        |
| `npm run release:patch`   | Bump the version, tag and build (also `minor`/`major`) |

## Project structure

```text
.claude/
  skills/                   # ucl-setup, ucl-ds-sync, ucl-generate-component,
                            # ucl-generate-layout, ucl-ux-copywriter, …
.github/workflows/
  publish.yml               # Publishes when the package.json version changes
scripts/
  add-use-client.mjs        # Marks the bundle "use client" after the build
src/
  index.ts                  # Public API exports
  lib/                      # cn(), breakpoints, motion system, hooks
  styles/
    theme.css               # Design tokens shipped to consumers
    globals.css             # Storybook styles
  docs/                     # Storybook MDX pages (Introduction, Foundations)
  components/
    <category>/             # buttons, forms, cards, feedback, overlays…
      <component-name>/
        <component-name>.tsx
        <component-name>.stories.tsx
        index.ts            # Re-exports the component, variants and types
CLAUDE.md                   # How things are built here (stack, conventions)
DESIGN.md                   # Design contracts and brand rules
MOTION.md                   # Motion system rules
netlify.toml                # Hosts the Storybook site on Netlify
```

The rules for building components, tokens and releases are in [CLAUDE.md](CLAUDE.md) and [DESIGN.md](DESIGN.md), and the motion rules are in [MOTION.md](MOTION.md). The skills read CLAUDE.md and DESIGN.md before they start, plus MOTION.md when the work involves animation.
