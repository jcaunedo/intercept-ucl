# UCL template

Starting point for a project's UCL (Unified Component Library): a React component library that lives in its own repo, ships design tokens as CSS, and is reviewed in Storybook before any app uses it.

## Start a new project

1. Copy this repo to a new one named for the project (e.g. `acme-ucl`).
2. Open it in Claude Code and ask for anything. CLAUDE.md tells Claude to run `ucl-setup` first, or run `/ucl-setup` yourself.
3. Setup asks for the **stack** first (base component library, icons, forms), then the project details (name, package, registry, Figma file, apps). It updates `package.json`, the build config, the docs and CLAUDE.md/DESIGN.md to match.
4. Review the changes and commit.

The template defaults to shadcn/ui on Radix, `lucide-react` icons and react-hook-form + zod.

## Tech stack

- React 19, TypeScript (strict)
- Tailwind CSS 4, tokens in `src/styles/theme.css`
- Base components: shadcn/ui on Radix (default)
- Motion for React (`motion/react`)
- Storybook 10 with MDX docs
- tsup (ESM bundle + types + CSS)

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
  commands/
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
```

The rules for building components, motion, tokens and releases are in [CLAUDE.md](CLAUDE.md) and [DESIGN.md](DESIGN.md). The skills read both before they start.
