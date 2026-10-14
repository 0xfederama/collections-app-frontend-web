# markdown

## Purpose

Renders Markdown source safely (item descriptions now; the W-10 Preview reuses it). Raw HTML is dropped and URLs are limited to http, https, mailto and relative. URL policy: `/Users/federico/Developer/collections-app/design-docs/DECISIONS.md` (D-014).

## Key files

- `src/components/markdown/MarkdownView.tsx`: `react-markdown` 10 with `remark-gfm` 4, component overrides and typography classes.
- `src/components/markdown/sanitizeUrl.ts`: URL policy for links and images.
- `src/components/markdown/MarkdownView.test.tsx`: rendering and safety tests.
- `src/components/markdown/index.ts`: barrel.

## Interfaces

- `MarkdownView({ source, className? })`: renders GFM source inside a styled `div`.
- `sanitizeUrl(url)`: returns the URL when its scheme is http, https or mailto (or it is relative); otherwise `''`.

## Gotchas

- `skipHtml` without `rehype-raw`: raw HTML in the source is dropped, not shown as text.
- Headings start at h3, because the page title is the h1 and the detail has h2 sections.
- Links open in a new tab with `rel="noopener noreferrer"`; a link whose URL was emptied renders as plain text.
- Images are lazy-loaded, send no referrer, and render nothing when the URL is emptied.
- Typography comes from arbitrary Tailwind selectors on the wrapper; there is no typography plugin.
