---
name: markdown-preview
description: Render a Markdown file (or pasted Markdown text) as a live-formatted preview page via the Artifact tool — headers, emphasis, lists, images, links, blockquotes, tables, fenced code blocks, Mermaid diagrams, and inline code. Trigger when the user asks to "preview this markdown", "render this .md file", "show me what this markdown looks like", or gives a markdown file path / pasted markdown and asks to see it rendered.
---

# Markdown Preview

Render a Markdown source (a file path or pasted text) as an actual rendered
HTML page — not a description of it — using the Artifact tool.

## Workflow

1. **Get the source.** If given a file path, Read it. If given pasted
   Markdown, use it directly. If neither is present, ask which file/content
   to preview.
2. **Load `artifact-design` first** (mandatory before writing the page) to
   calibrate styling. This is a document-reading surface, not a marketing
   page — keep it plain and typographic: a readable content column, no
   heavy chrome.
3. **If the source contains a ` ```mermaid ` fence**, also load
   `artifact-diagramming` — Artifacts render Mermaid natively via
   ` ```mermaid ` fences in Markdown or `<pre class="mermaid">` in HTML, no
   external library needed.
4. **Build the preview file** at a scratch path (see the environment's
   scratchpad directory) as a `.md` file containing the source Markdown
   verbatim — Artifacts render `.md` files directly, so for plain Markdown
   with no custom chrome this is the simplest path. Use an `.html` wrapper
   instead only if the user wants custom styling/layout beyond default
   Markdown rendering (e.g. a two-pane source/preview view — see
   [Optional: side-by-side mode](#optional-side-by-side-mode)).
5. **Publish** with the Artifact tool (`action: "publish"`), a stable
   `file_path`, a `title` describing the content (not literally "preview"),
   a one-line `description`, and a `favicon` (📝 is a sensible default for
   a plain document preview — keep it stable across redeploys of the same
   preview).
6. **To update** an already-published preview (source file changed, user
   asked for a re-render), edit the same scratch file and call Artifact
   again with the same `file_path` — this redeploys to the same URL rather
   than minting a new one.

## Element coverage checklist

The source Markdown may use any of these — verify each renders correctly
before calling the preview done (open the published URL mentally against
this list, or actually re-fetch it if verification matters):

- Headers `#`–`######`
- Emphasis: `*italic*` / `_italic_`, `**bold**` / `__bold__`, combined
  `_**bold italic**_`
- Unordered and ordered lists, including nested sub-lists
- Images: `![alt](src "title")` — if `src` is a relative path (e.g.
  `/image/foo.svg`), it will not resolve inside the Artifact sandbox
  (external URLs are blocked entirely by CSP). Flag this to the user rather
  than silently rendering a broken image; if the image is a small local
  asset, consider inlining it as a `data:` URI instead of a bare relative
  path.
- Links: `[text](url)`
- Blockquotes, including nested `>>` blockquotes
- Tables (GFM pipe-table syntax, including column alignment via `:---:`)
- Fenced code blocks (plain and language-tagged)
- Mermaid diagrams via ` ```mermaid ` fences
- Inline code via single backticks

## Optional: side-by-side mode

If the user wants to see raw source and rendered output together (rather
than just the rendered result), build an `.html` file instead of a plain
`.md` file: a two-column CSS grid, left column a `<pre>` of the raw
Markdown source (escape `<`/`>`/`&`), right column the same content
re-authored as real HTML matching each element in the coverage checklist
above. Keep both columns independently scrollable
(`overflow-y: auto; max-height: ...`) so a long document doesn't blow out
page height. Style both light and dark themes per `artifact-design`'s
guidance — don't hardcode a single background.

## Notes

- This skill's job is to *render*, not to *edit or improve* the Markdown —
  don't rewrite the user's content, fix their headings, or restructure
  their document unless they separately ask for that.
- If the source file doesn't exist or the pasted content is empty, say so
  — don't publish an empty or placeholder preview.
