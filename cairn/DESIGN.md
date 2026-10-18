# Design

_Seeded by `/cairn-init` on 2026-10-18. Facts and principles elicited by
`/design-interview` on 2026-10-18._

## Purpose & Scope

embedpdf is a Quarto extension that embeds PDF files in HTML output, RevealJS
slides included. It is for Quarto authors whose sites and slides are read on
phones. Mobile browsers do not render an embedded PDF, so the extension
renders it there with a vendored copy of PDF.js (Mozilla's JavaScript PDF
renderer). On desktop it uses the browser's built-in viewer. Users install it
with `quarto add jmgirard/embedpdf`. Quarto >= 1.4 is required.

**Contract boundary.** The job is to show every page of a PDF readably on
every promised browser, with zoom, a page indicator, and a download button.
The canvas viewer is not a PDF reader: visible text selection, search, and
annotations are out of scope. A hidden text layer for screen readers is in
scope (GP1).

**Platforms.** Promised: desktop browsers (native viewer), Android Chrome, and
iOS Safari. A release that changes the viewer works on all three before it
ships. Other browsers are best-effort.

**Output formats.** HTML and RevealJS are the product. LaTeX output
(`\includepdf` via pdfpages) and the download link in other formats must never
break a render, but they get no new features.

**Distribution.** Public. Each version gets a `v<version>` tag and a GitHub
release with notes. The version lives in `_extensions/embedpdf/_extension.yml`.

**API stability.** The shortcode options and their defaults follow semantic
versioning. Removing or renaming an option, or changing a default, needs a
major version bump. The old form first warns for at least one minor release.

**Dependencies.** PDF.js is vendored, with no CDN and no build step. It is
updated only for a bug fix, a security fix, or a feature the extension needs.
npm (`puppeteer-core`) is used for tests only and is gitignored.

**New options.** An option is added only when authors cannot get the result
with the `class` option and their own CSS, and when it works with both
renderers.

## Function Families

- **Shortcode** (`embedpdf.lua`): `{{< pdf file.pdf >}}` and its alias
  `{{< embedpdf … >}}`. Options: `renderer`, `width`, `height`, `page`,
  `toolbar`, `border`, `class`, `button`. Defaults come from the `embedpdf`
  metadata key, and per-shortcode values override them.
- **Viewer** (`embedpdf-viewer.js`, `embedpdf.css`): hydrates each
  `div.embedpdf` placeholder as a native `<object>` or a PDF.js canvas viewer
  with a toolbar (zoom, page indicator, download).
- **Other formats**: LaTeX output uses `\includepdf` (pdfpages). Every other
  non-HTML format gets a download link.

## Conventions

- `_extensions/embedpdf/pdfjs/` is vendored PDF.js 6.1.200 and is never
  edited. (CLAUDE.md)
- A change to `embedpdf-viewer.js` or `embedpdf.css` bumps `version:` in both
  `_extension.yml` and the `add_html_dependency` call in `embedpdf.lua`. The
  version is the dependency path that browser caches key on. (CLAUDE.md)
- Every change to shortcode behavior adds a matching `check(...)` in
  `tests/test_shortcode.lua`. (CLAUDE.md)
- PDF.js rendering is checked in real Google Chrome (`tests/render_check.mjs`),
  never in the Claude preview browser. (CLAUDE.md)
- A viewer change is also checked in Safari in the iOS Simulator before
  release. (interview 2026-10-18)

## Design Principles

_Elicited by `/design-interview` on 2026-10-18. IP = inviolable, changed only
by a recorded decision. GP = guiding, tradeable with a written reason.
Numbers are never reused._

### Inviolable (IP)

- IP1: **Readable on every promised platform.** Every page of an embedded PDF
  is readable on desktop, Android Chrome, and iOS Safari. No release may break
  this. The rule is about the result, not the tool: PDF.js is today's way to
  meet it and could be replaced. A check in the iOS Simulator counts as the
  iOS check.
- IP2: **An embed never breaks a render.** Every case falls back to something
  usable: no JavaScript, non-HTML formats, and self-contained documents give a
  download link or `\includepdf`. A missing file gives a warning, never an
  error.
- IP3: **Author values are escaped.** HTML that the Lua shortcode emits never
  contains an unescaped author-given value. `tests/test_shortcode.lua`
  checks it.

### Guiding (GP)

- GP1: **A viewer, not a reader.** The canvas viewer shows pages, with zoom, a
  page indicator, and download. Visible text selection, search, and
  annotations stay out. A hidden text layer for screen readers is in scope as
  an accessibility fix.
- GP2: **Options are a public API.** Option names and defaults follow semver.
  A removal, rename, or default change needs a major bump, and the old form
  first warns for at least one minor release.
- GP3: **A new option must earn its place.** It is added only when authors
  cannot get the result with `class` plus their own CSS, and only when it
  works with both renderers.
- GP4: **Low-end phones first.** Viewer changes are judged on a constrained
  phone. Page rendering stays serialized and canvas size stays capped. A
  speedup that costs mobile memory needs a written reason.
- GP5: **Light for desktop.** PDF.js loads only on the PDF.js path, so readers
  on the native path never download it. IP1 wins any conflict.
- GP6: **PDF.js is vendored.** No CDN and no build step. PDF.js is updated only
  for a bug fix, a security fix, or a feature the extension needs (D-001).

## Architecture

The Lua shortcode runs at render time. For HTML it injects one HTML
dependency (viewer script as an ES module, stylesheet, and the two PDF.js
files as resources). It emits a `div.embedpdf` with `data-*` attributes and a
download-link fallback for readers without JavaScript. In the browser,
`embedpdf-viewer.js` picks a renderer per placeholder: `auto` uses the native
`<object>` when `navigator.pdfViewerEnabled` is true, else PDF.js. PDF.js is
imported on demand relative to the viewer script, so desktop visitors on the
native path never download it. Page rendering goes through one queue shared
by every viewer on the page, and canvas size is capped at 8,000,000 pixels
with device pixel ratio clamped to 2, for constrained mobile devices.

## Known issues

- Self-contained documents (`embed-resources: true`) cannot render the PDF on
  mobile, because PDF.js must fetch the file by URL (README "Known
  limitations").
- The PDF.js viewer has no text selection or search (out of scope, see the
  contract boundary).
- A PDF.js embed is a canvas with no text, so screen readers cannot read it.
  The download link is the only accessible path today — observed 2026-10-18.
- Not yet checked on a real Android device loading the GitHub Pages site, or
  on iOS at all (CLAUDE.md "Still unverified") — observed 2026-10-18.
- GitHub releases stop at v0.5.0 while tags reach v1.0.2, so the README
  version badge shows 0.5.0 — observed 2026-10-18.
- First paint is fragile. v1.0.1 and v1.0.2 both fixed pages that never
  rendered on load, and the timer-based first paint may still miss cases.
