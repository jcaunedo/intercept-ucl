<!--
Created: Oct 25, 2026
Created by: Julio Caunedo
Last updated: Oct 25, 2026
Scope: How the artifacts listed in explorations/index.md are edited, and how each tool gets the PRDs.
Purpose: Compares editing an artifact from Claude Code in this repo with editing it in the claude.ai chat in the browser, and says when to use each.
-->

# Editing artifacts: Claude Code or the browser

Both tools update the same artifact at the same URL. Once it's published, everyone sees the same page, wherever it was edited. The difference is what Claude can read while it edits, and how quickly you see each change.

**In short:** edit in Claude Code when the page has to match UCL (tokens, components, PRD rules). Use the browser for quick copy or visual tweaks while you look at the page.

## Comparison

| | Claude Code (this repo) | Claude in the browser (claude.ai chat or Cowork) |
| --- | --- | --- |
| Theme | Reads `src/styles/theme.css`, so token values match the source | Uses the values already copied into the page. They go stale when UCL changes |
| Components | Checks the real UCL components and their APIs in `src/index.ts` | Imitates the components in CSS, from what's in the conversation |
| Access to the PRDs | Yes. Reads [prds/](../prds/) (PC-xxx rules, glossary) straight from the repo, always the current version | Only if they're added to the conversation or the Project (see below). That copy doesn't update when the repo changes |
| Product rules | Also reads DESIGN.md and the brand voice | Knows only what was shared in that conversation |
| Original context | Only what you give it: the URL, and screenshots if needed | Keeps the conversation the artifact was made in (screenshots, earlier decisions) |
| Visual feedback | Edit → publish → refresh the artifact tab. A few seconds per round | The page sits next to the chat and updates in place |
| Checks | Can run lint, the build and Storybook tests | None |
| Best for | Accuracy against UCL and the PRDs | Fast copy and layout iteration |

## Access to the PRDs

| Tool | How it gets the PRDs | Stays current? |
| --- | --- | --- |
| Claude Code | Reads `prds/` in this repo | Yes. It reads the files as they are on your machine |
| Browser chat | Paste or upload the PRD files into the conversation | No. It keeps the version you uploaded |
| Browser, claude.ai Project | Add the PRD files to the Project's knowledge, so every chat in the Project can read them | No. Upload them again after each PRD change |

⚠️ **Risk:** a PRD copy in the browser can be older than the one in `prds/`. Before editing in the browser after a PRD change, upload the new version.

## Seeing your changes

| Where | How you see it |
| --- | --- |
| Artifact edited in the browser | Live, next to the chat |
| Artifact edited in Claude Code | Same page at the same URL. Claude can open it after each publish, or you refresh the tab |
| UCL layout in this repo | `npm run storybook` reloads on every save, with the real components and `theme.css` |

## The limit of artifacts

An artifact is a standalone HTML page. It can't import UCL's React components, from either tool. In an artifact, "using UCL" means copying the tokens from `theme.css` and imitating the components' styles.

To use the real components, build the screen as a UCL layout under `src/layouts/<app>/` (CLAUDE.md, "Architecture"), with its data in `sample-*` files. That layout is what developers rebuild with real data. The artifact stays useful as the shareable preview for review and comments.

## How to edit

| Tool | Steps |
| --- | --- |
| Claude Code | 1. Give Claude the artifact URL and the change. 2. Claude reads the published page, edits a local copy and republishes to the same URL. 3. If someone changed the page in the meantime, the publish is refused and Claude merges its edit into the newer version. |
| Browser | Open the artifact from the chat or Cowork session where it was made, and ask for the change there. |

ℹ️ Editing doesn't reset what viewers saved in the page (filters, saved views). That state lives in each viewer's browser.
