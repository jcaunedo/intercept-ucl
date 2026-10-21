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

Intercept's design system has one mode, and it's light: the tokens are its values, with no class to add. Give the page `bg-background text-foreground`, usually on `<body>`.

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
