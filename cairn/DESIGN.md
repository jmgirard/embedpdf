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
  `div.embedpdf` placeholder as a native `<object>` (an `<iframe>` for a
  `page` over 1 where the browser has a built-in PDF viewer and the PDF's
  answer allows it, D-008) or a
  PDF.js canvas viewer with a toolbar (zoom, page indicator, download).
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
- PDF.js rendering is checked in real Chrome or Chromium
  (`tests/render_check.mjs`), never in the Claude preview browser. (CLAUDE.md;
  corrected M001)
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
  usable: no JavaScript and non-HTML formats give a download link or
  `\includepdf`. A missing file gives a warning, never an error. (Self-contained
  documents dropped from the fallback list by D-002: they render inline.)
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
  on the native path never download it. IP1 wins any conflict. Exception
  (D-002): a self-contained page with an `auto` or `pdfjs` embed carries PDF.js
  inline, so every reader of that file downloads it.
- GP6: **PDF.js is vendored.** No CDN and no build step. PDF.js is updated only
  for a bug fix, a security fix, or a feature the extension needs (D-001).

## Architecture

The Lua shortcode runs at render time. For HTML it injects the `embedpdf`
dependency (viewer script as an ES module, and the stylesheet). At the first
embed not set to `renderer=native`, it also injects `embedpdf-pdfjs`: the two
PDF.js files as scripts of types `text/x-embedpdf-pdfjs` and
`text/x-embedpdf-worker`, which the browser neither fetches nor runs
(corrected M002). It emits a `div.embedpdf` with `data-*` attributes and a
download-link fallback for readers without JavaScript. In the PDF path it
writes a `%` that does not start a `%XX` escape as `%25` (`url_path()`, since
M015), in `data-src`, the download links, and the link of other formats. For
LaTeX, `latex_path()` decodes the `%XX` escapes of printable ASCII other than
`\ { } # $ & ~ ^ _ " ,`. A path that still holds a `%` gets an `\includepdf` line
inside a group where `%` is a plain character. In the browser,
`embedpdf-viewer.js` picks a renderer per placeholder: `auto` uses PDF.js on
iPhone and iPad (an iPhone, iPod, or iPad user agent, or a Mac user agent with
`maxTouchPoints > 1`). Elsewhere, `auto` uses the native `<object>` if
`navigator.pdfViewerEnabled` is true, and otherwise PDF.js (corrected M001). A
native embed whose `page` is over 1 is an `<iframe>` there when
`frameAllowed()` accepts it: an inlined PDF, or a PDF on the page's own
non-opaque origin whose HEAD answer is OK within 5 s, `application/pdf`, and
not an attachment. Its no-JS fallback content is then hidden beside it. Every
other native embed is an `<object>` (M021, D-008). PDF.js is
imported on demand from those scripts' `src`, so desktop visitors on the
native path never download it. With `embed-resources: true`, Quarto inlines
the viewer as a `data:` module, the PDF.js files as the scripts' text, and
each PDF as a `data:` URL in `data-src`. The viewer then loads PDF.js from
`blob:` URLs of that text, and gives the native `<object>` and the download
links a `blob:` URL of the PDF (corrected M002). If PDF.js cannot load the PDF (its
import, `getDocument`, or page 1 fails), the embed shows "This PDF cannot be
shown here." and an "Open the PDF" link with `target="_blank"`. A PDF from
another site that sends no `Access-Control-Allow-Origin` header ends there
(D-004; corrected M003). For an inlined PDF the link is instead "Download the
PDF" to its `blob:` URL, with no target. Its `download` name is the file name.
If an inlined PDF's `data:` address does not decode, either renderer shows the
message with no link (M011). Page rendering goes through one queue shared
by every viewer on the page, and canvas size is capped at 8,000,000 pixels
with device pixel ratio clamped to 2, for constrained mobile devices. For
screen readers, a PDF.js embed is a group named "PDF: " and its file name,
or "PDF" when its address names none (corrected M010). A native embed's
`<object>` (or `<iframe>`) has the same name, set as its `aria-label`, with no `title` (M012, M021). `embedName()` passes
`fileName()` the address in `data-src`, or the download link's when
`data-src` is a `data:` address (whitespace before it allowed). The name is the last path segment when it
ends in `.pdf`, else a query value's last segment that ends in `.pdf`, else
the last non-empty path segment when there is no query. A host alone, `data:`, and `blob:` name no file. Before any embed
hydrates, `embedNames()` numbers embeds that share a name "(k of n)" in
document order, native and PDF.js embeds together (corrected M012). Each toolbar control is named by its `title`
alone with its glyph `aria-hidden` (corrected M005). The page indicator
shows an `aria-hidden` "i / n" beside a hidden "Page i of n" (M010). Each PDF.js page is a group labeled "Page i of n" that holds
the page's text (PDF.js `getTextContent()`) in a visually hidden, unselectable
block, and the canvas is `aria-hidden`. The text of every page is read at
load on the same queue, and a text task runs only when no page render waits
(corrected M004).

## Known issues

- In a self-contained document with JavaScript disabled, the fallback link
  and the `button` link point at the separate PDF file, which is not shipped
  (corrected M002; self-contained embeds render since v1.1.0; split 2026-10-18).
- Self-contained RevealJS slides are checked in Chromium and in Safari in the
  iOS 27.0 iPhone and iPad simulators, not on a real phone. In desktop
  Safari only their native embeds are checked, by `tests/native_check.mjs`
  (corrected M016; corrected M022) — observed 2026-10-20.
- Desktop Safari 27.0.1 opens a native `<object>` at page 1 whatever its
  `#page` says. So in a desktop browser with a built-in PDF viewer, a native
  embed with a `page` over 1 is an `<iframe>` in the cases `frameAllowed()`
  accepts: an inlined PDF, or a PDF on the page's own origin (scheme, host,
  and port) whose HEAD answer is OK within 5 s, from that origin,
  `application/pdf`, and not an attachment (D-008). It is an `<object>`
  otherwise, and desktop Safari opens it at page 1: a PDF from another origin
  or redirected to one, an answer that is not OK (such as 404 or 405), another
  media type, an attachment, a late answer, and a PDF file that is not inlined
  on a `file:` or sandboxed page. Any other browser that reports a built-in PDF
  viewer is treated alike, except iPhone and iPad; an Android browser that
  reports one is not checked. Author CSS aimed at `.embedpdf object` does not
  reach such an `<iframe>`. Such an `<iframe>` opened at page 2 on `page_test.html` and on
  the in-page copy of `selfcontained_test.html` (local file and HTTP) in
  Chromium 155 and Firefox 158 (headless) and desktop Safari 27.0.1
  (`tests/native_check.mjs`; corrected M021) — observed 2026-10-20. A server
  that answers a HEAD request as inline `application/pdf` and a GET as an
  attachment still gets an `<iframe>`, which then downloads the PDF.
  An `<iframe>` that loaded its PDF while it had no box opened at page 1 in
  Chromium 155 and showed the pages shrunk in desktop Safari 27.0.1 once
  shown (v1.2.7, on a slide that RevealJS did not display at load). Since
  v1.2.8 the viewer gives such an `<iframe>` its address once it has a box.
  On `selfcontained_slides_test.html` its slide-4 `<iframe>` then opened at
  page 2 in Chromium 155 and Firefox 158 (headless) and desktop Safari
  27.0.1, when `tests/native_check.mjs` showed slides 1, 2, and 4 in turn (M022) —
  observed 2026-10-20. A direct jump to that slide from slide 0 opened it at
  page 2 in one Chromium 155 probe. Not checked: that jump in other
  browsers, a slide hidden at load within RevealJS's view distance, a tab or
  other part of a page hidden at load, and slides of a deck that is not
  self-contained.
- A native viewer's save control names the in-page copy of an inlined PDF by
  its `blob:` address, not by the PDF's file name. In headless Chromium 155,
  saving the first native embed of `selfcontained_test.html` opened alone
  gave `03acb7cf-e9fe-49b4-b425-fa1a410248fe.pdf`, the random id of that
  embed's `blob:` URL, where the file is `sample.pdf` (M022 probe) — observed
  2026-10-20. Not checked in Firefox or desktop Safari.
- The PDF.js viewer has no text selection or search (out of scope, see the
  contract boundary).
- A PDF.js embed's hidden page text is checked in Chromium's accessibility
  tree and in Safari's page DOM in iOS simulators, not with a real screen
  reader (corrected M004) — observed 2026-10-18.
- Not yet checked on a real Android device, iPhone, or iPad loading the GitHub
  Pages site (CLAUDE.md "Still unverified"). iOS is checked only in iOS 27.0
  and 27.1 simulators by `tests/ios_check.mjs`, and iOS versions before 27 are
  not checked (corrected M001) — observed 2026-10-18.
- GitHub releases stop at v0.5.0 and tags stop at v1.0.2, while the
  extension is at 1.2.7, so the README version badge shows 0.5.0 (corrected
  M021) — observed 2026-10-20.
- Safari refuses a read of a PDF from another site that an `<object>` on the
  page loaded. So a PDF.js embed of that PDF reads it with `embedpdf=pdfjs`
  added to its query (corrected M014). A real site's answer to that address
  is not checked, only the local test servers — observed 2026-10-19.
- An inlined PDF whose `data:` address the browser cannot decode shows "This
  PDF cannot be shown here." with no link. IP2's usable fallback is not met
  there. Before M011 the embed kept a link to a file the page does not ship.
  Its `button` link still names that file (observed 2026-10-19).
- In PDF output a PDF file that LaTeX cannot find stops the render with a
  pdfpages error, so IP2's "a missing file gives a warning" is not met there.
  This also covers a path with an escape that the shortcode keeps as written,
  such as `%C3%A9` (ROADMAP row "Handle escaped and special LaTeX paths") — observed 2026-10-19.
- First paint is fragile. v1.0.1 and v1.0.2 both fixed pages that never
  rendered on load, and the timer-based first paint may still miss cases.
