# Design

_Seeded by `/cairn-init` on 2026-10-18 from README.md, CLAUDE.md, and a read of
`_extensions/embedpdf/`. Refine with `/design-interview`._

## Purpose & Scope

embedpdf is a Quarto extension that embeds PDF files in HTML output, RevealJS
slides included. Its reason to exist is mobile browsers: they do not render an
embedded PDF, so the extension renders it with a vendored copy of PDF.js
(Mozilla's JavaScript PDF renderer) there, and uses the browser's built-in
viewer on desktop. Users install it with `quarto add jmgirard/embedpdf`.
Distribution is public, through tagged GitHub releases; the version lives in
`_extensions/embedpdf/_extension.yml`. Quarto >= 1.4 is required.
Out of scope today: text selection and search in the PDF.js viewer
(README "Known limitations"). _(to refine)_

## Function Families

- **Shortcode** (`embedpdf.lua`): `{{< pdf file.pdf >}}` and its alias
  `{{< embedpdf … >}}`. Options: `renderer`, `width`, `height`, `page`,
  `toolbar`, `border`, `class`, `button`; defaults from the `embedpdf`
  metadata key, overridden per shortcode.
- **Viewer** (`embedpdf-viewer.js`, `embedpdf.css`): hydrates each
  `div.embedpdf` placeholder as a native `<object>` or a PDF.js canvas viewer
  with a toolbar (zoom, page indicator, download).
- **Other formats**: LaTeX output uses `\includepdf` (pdfpages); every other
  non-HTML format gets a download link.

## Conventions

- `_extensions/embedpdf/pdfjs/` is vendored PDF.js 6.1.200 and is never edited
  — CLAUDE.md.
- A change to `embedpdf-viewer.js` or `embedpdf.css` bumps `version:` in both
  `_extension.yml` and the `add_html_dependency` call in `embedpdf.lua`; the
  version is the dependency path that browser caches key on — CLAUDE.md.
- Every change to shortcode behavior adds a matching `check(...)` in
  `tests/test_shortcode.lua` — CLAUDE.md.
- PDF.js rendering is verified in real Google Chrome (`tests/render_check.mjs`),
  never in the Claude preview browser — CLAUDE.md.

## Design Principles

_None elicited yet. Run `/design-interview` to articulate them; the scaffold
does not invent principles._

### Inviolable (IP)

### Guiding (GP)

## Architecture

The Lua shortcode runs at render time. For HTML it injects one HTML
dependency (viewer script as an ES module, stylesheet, and the two PDF.js
files as resources) and emits a `div.embedpdf` with `data-*` attributes and a
download-link fallback for readers without JavaScript. In the browser,
`embedpdf-viewer.js` picks a renderer per placeholder: `auto` uses the native
`<object>` when `navigator.pdfViewerEnabled` is true, else PDF.js. PDF.js is
imported on demand relative to the viewer script, so desktop visitors on the
native path never download it. Page rendering is serialized through one queue
shared by every viewer on the page, and canvas size is capped, for
constrained mobile devices.

## Known issues

- Self-contained documents (`embed-resources: true`) cannot render the PDF on
  mobile; PDF.js must fetch the file by URL (README "Known limitations").
- The PDF.js viewer has no text selection or search.
- Not yet checked on a real Android device loading the GitHub Pages site — the
  target environment; only a human with a phone can check it (CLAUDE.md
  "Still unverified") — observed 2026-10-18.
