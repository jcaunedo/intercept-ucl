---
name: ucl-setup
description: Configure a new project from the UCL template — ask for the stack first (base component library, icons, forms), then the project details (name, package, registry, Figma file, apps, brand), and update dependencies, build config, CLAUDE.md, DESIGN.md and docs to match. Run it before any other task when CLAUDE.md has a "⚠️ Setup required" section, when the user says "set up this UCL", "new project", "configure the template", or runs /ucl-setup. Also use it later to change the stack of an existing UCL.
---

# UCL setup

Turn the unconfigured template into a project's UCL. The stack comes first, because everything else (dependencies, primitives, Button, docs) depends on it.

## 0. Check the state

- Read `CLAUDE.md` ("Project", "Stack", "Figma") and `DESIGN.md` ("Brand names", "Brand voice").
- If CLAUDE.md still has the "⚠️ Setup required" section, this is a first-time setup: do every step below.
- If it doesn't, setup already ran. Ask what the user wants to change (stack, package, registry…) and do only those steps.
- If the user came with another task, say setup comes first, and why, in one sentence. Then go back to their task when setup is done.

## 1. Ask for the stack (first)

Use `AskUserQuestion` in one call, defaults first:

1. **Base component library:** `shadcn/ui on Radix (Recommended)` — the template default · `Untitled UI (React Aria)` · Other.
2. **Icons:** `lucide-react (Recommended)` · `@untitledui/icons` · Other.
3. **Forms library** (shipped as an optional peer dependency): `react-hook-form + zod (Recommended)` · `Formik (Yup stays in the apps)` · `None for now`.

If the user picks Other, ask for the package name. Then check its current install docs and package names before installing; don't rely on memory.

## 2. Ask for the project details

Ask in one plain message. Everything except the name can be "later":

- **Project name** as it's written in UI copy (e.g. "Acme").
- **Package name**, usually scoped: `@<org>/ucl`.
- **Registry:** GitHub Packages under which org (default), npm, or other.
- **Repository URL**, if it exists.
- **Figma design system file URL** (the `fileKey` is in the URL) and whether it has a dark mode.
- **Apps** that will consume UCL (used for `src/layouts/<app>/`).
- **Brand names and voice**, if already known (DESIGN.md sections).

Show a short summary of all answers and confirm before changing files.

## 3. Apply the stack

Install with `npm install --include=dev` (the environment may set `NODE_ENV=production`). Keep `tsup.config.ts` `external` in step with `dependencies` and `peerDependencies`.

**Base component library**

- **shadcn/ui (default):** nothing to install. Keep `components.json` and CLAUDE.md → "Adding a shadcn Primitive".
- **Another library:**
  1. Install its packages per its current docs. For Untitled UI that's typically `react-aria-components` plus its Tailwind setup and CLI.
  2. Replace CLAUDE.md → "Adding a shadcn Primitive" with that library's add-a-primitive flow, keeping the same "scaffold → relocate into `src/components/<category>/<name>/`" shape. If another UCL on this machine already uses the library, reuse its CLAUDE.md section.
  3. Remove `components.json` if the library's CLI doesn't use it.
  4. Rebuild `src/components/buttons/button/` from the library's Button, following CLAUDE.md conventions (same file set, stories, MDX page). Update CLAUDE.md → "Current Component APIs" to the new variant/size names, and the Button MDX page to match.
  5. Remove `@radix-ui/react-slot` if nothing uses it anymore.
- **Update the stack wording everywhere it appears:** `src/docs/introduction.mdx` ("Components are built with … and follow … conventions"), the README "Tech stack", and the CLAUDE.md intro line.

**Icons**

- Install the chosen package, uninstall `lucide-react`.
- Replace icon imports in stories, MDX pages and components (`button.stories.tsx` uses `ArrowRight`), and the "lucide-react" mentions in `button.mdx` and CLAUDE.md.
- Update `components.json` → `iconLibrary` if the file stays.

**Forms**

- **react-hook-form + zod (default):** already optional peers. Nothing to do.
- **Formik:** uninstall `react-hook-form`, `zod` and `@hookform/resolvers` from `peerDependencies`, `peerDependenciesMeta` and `devDependencies`. Add `formik` the same way: optional peer + dev dependency + tsup `external`. In CLAUDE.md → "Stack", note that Yup schemas live in the apps.
- **None:** remove the three form packages the same way. Add them back when the first form component needs one.

Then set every "Default" in CLAUDE.md → "Stack" to "Set", with the chosen values.

## 4. Apply the project details

- **`package.json`:** `name`, `description` ("React component library for <Project>"), `repository` (if given), `publishConfig.registry`. Remove `"private": true`: the template sets it so its publish workflow never runs. The first release then comes from `npm run release:*`, never from the first push.
- **`.npmrc`:** keep `include=dev`. Add the scope line for the registry, with the token read from the environment, never a literal secret:
  ```
  @<org>:registry=https://npm.pkg.github.com
  //npm.pkg.github.com/:_authToken=${NPM_TOKEN}
  ```
- **`.github/workflows/publish.yml`:** `registry-url` matches the registry. Check that the branch is the repo's default branch.
- **CLAUDE.md:**
  - Title "`<Project>` UCL (Unified Component Library)" and the intro line.
  - "Project" table: project, package, registry, apps.
  - "Figma" table: file name, `fileKey`, modes.
  - "Consumer Integration": replace `@your-org/ucl` and `@your-org` with the real package and scope.
  - "Architecture": the package line.
  - Anything still unknown stays marked ⚠️.
- **DESIGN.md:** fill "Brand names" and "Brand voice" with what the user gave. Leave the ⚠️ placeholder for anything not given yet. Replace "every product" in the quality bar with the project name if the user wants.
- **Docs:** `src/docs/introduction.mdx` (title, package name in every snippet) and `src/components/buttons/button/button.mdx` (import line).
- **README:** title "`<Project>` UCL". Replace the "Start a new project" section with a short "Getting started" (`npm install`, `npm run storybook`). In "Using UCL in an App", replace `@your-org/ucl` and `@your-org` with the real package and scope, and delete the ℹ️ placeholder note. If the registry isn't GitHub Packages, rewrite step 1 for it (in the README and `introduction.mdx`). Keep the rest.
- **`.claude/commands/`:** if it contains account- or person-specific commands, ask whether this project's team should get them; remove them if not.
- **Delete the "⚠️ Setup required" section from CLAUDE.md last**, so an interrupted setup is still visible as unfinished.

## 5. Verify

From the repo root:

- `npm install --include=dev`
- `npm run lint`: must pass.
- `npm run build`: must succeed, and `dist/index.js` must start with `"use client"`.
- `npm run build-storybook`: must succeed. Then delete `storybook-static/`.
- Search the repo (excluding `node_modules`, `.git`, `dist`) for leftover `@your-org`, "UCL template" and the old package name `ucl` in import snippets. Fix any you find.

## 6. Report

Summarize:

- The stack chosen.
- The project details applied.
- The files changed.
- Every ⚠️ item still open, with where it lives.

Suggest committing. Don't commit or push unless the user asks.
