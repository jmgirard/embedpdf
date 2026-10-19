# embedpdf — notes for Claude Code

A Quarto HTML extension. The `{{< pdf file.pdf >}}` shortcode embeds a PDF using
the browser's native viewer on desktop and a vendored **PDF.js** canvas viewer
on mobile (where embedded PDFs don't render natively).

Key files:
- `_extensions/embedpdf/embedpdf.lua` — the shortcode: turns args into HTML /
  LaTeX (`\includepdf`) / a download link.
- `_extensions/embedpdf/embedpdf-viewer.js` — the PDF.js canvas viewer (hydrates
  `div.embedpdf` placeholders; `renderer=auto|native|pdfjs`).
- `_extensions/embedpdf/pdfjs/` — vendored PDF.js 6.1.200. **Do not edit.**
- `_extensions/embedpdf/_extension.yml` — extension metadata (`version:`).
- `example.qmd` (guide), `native.qmd`, `revealjs_test.qmd` → rendered into `docs/`
  (GitHub Pages). `dummy*.pdf` are blank test files; `sample.pdf` is the realistic
  example used by `example.qmd`.

## Verify before finishing — you are the test runner (no CI)

This project is only ever edited through Claude Code, so these checks stand in
for a test suite. **Run the relevant one before you consider a change done, and
extend it when you change behavior.**

**After any change to `embedpdf.lua`** — run the shortcode unit tests (needs no
installs; `pandoc` is a Lua interpreter). From the repo root:

```
pandoc lua tests/test_shortcode.lua      # must print "N passed, 0 failed"
```

Add a matching `check(...)` in that file whenever you add or change shortcode
behavior (a new option, output format, escaping rule, default, etc.).

**After any change to `embedpdf-viewer.js` or `embedpdf.css`** — bump `version:`
in **both** `_extension.yml` and the `add_html_dependency{ version = ... }` call
in `embedpdf.lua` (the version is the dependency path; caches key on it), then
verify real rendering in **real Chrome or Chromium** (NOT the preview browser — see
gotcha). From the repo root:

```
quarto render
npm install puppeteer-core            # once, if missing (gitignored)
node tests/render_check.mjs example.html --expect-native 9 --expect-pdfjs 2
node tests/render_check.mjs example.html --device mac-safari --expect-native 9 --expect-pdfjs 2
node tests/render_check.mjs example.html --device windows-touch --expect-native 9 --expect-pdfjs 2
node tests/render_check.mjs example.html --device iphone --expect-native 1 --expect-pdfjs 10
node tests/render_check.mjs example.html --device ipad --expect-native 1 --expect-pdfjs 10
node tests/ios_check.mjs --device "embedpdf iPhone"
node tests/ios_check.mjs --device "embedpdf iPad"
```

Self-contained pages (`embed-resources: true`): `--alone http|file` (render_check)
and `--alone yes` (ios_check) load a copy of the page with no other file beside it.
Run each `--alone file` line again with `--alone http`. Run the
`selfcontained_test.html` lines also with `--device mac-safari` and
`--device windows-touch` (the desktop counts) and `--device ipad` (the iphone
counts). `revealjs_test.html` is a normal slide deck:

```
node tests/render_check.mjs selfcontained_test.html --alone file --expect-native 2 --expect-pdfjs 1 --expect-pages 2 --expect-links 4
node tests/render_check.mjs selfcontained_test.html --alone file --device iphone --expect-native 1 --expect-pdfjs 2 --expect-pages 2 --expect-links 4
node tests/render_check.mjs selfcontained_slides_test.html --alone file --expect-native 2 --expect-pdfjs 1 --expect-pages 2 --expect-links 4
node tests/render_check.mjs selfcontained_slides_test.html --alone file --device iphone --expect-native 1 --expect-pdfjs 2 --expect-pages 2 --expect-links 4
node tests/render_check.mjs revealjs_test.html --expect-native 2 --expect-pdfjs 1
node tests/render_check.mjs revealjs_test.html --device iphone --expect-native 1 --expect-pdfjs 2
node tests/ios_check.mjs --device "embedpdf iPhone" --page selfcontained_test.html --alone yes --expect-embeds 2
node tests/ios_check.mjs --device "embedpdf iPad" --page selfcontained_test.html --alone yes --expect-embeds 2
```

PDFs on another site: `--remote blocked|cors|missing` serves the PDFs from a
second server on another port (no `Access-Control-Allow-Origin` header, `*`, or
HTTP 404). `--expect-failed` counts embeds that show "This PDF cannot be shown
here." and the "Open the PDF" link. Run the desktop line also with
`--device mac-safari` and `--device windows-touch`:

```
node tests/render_check.mjs example.html --remote blocked --device iphone --expect-native 1 --expect-pdfjs 0 --expect-failed 10
node tests/render_check.mjs example.html --remote blocked --device android --expect-native 1 --expect-pdfjs 0 --expect-failed 10
node tests/render_check.mjs example.html --remote missing --device iphone --expect-native 1 --expect-pdfjs 0 --expect-failed 10
node tests/render_check.mjs example.html --remote missing --device android --expect-native 1 --expect-pdfjs 0 --expect-failed 10
node tests/render_check.mjs revealjs_test.html --remote blocked --device iphone --expect-native 1 --expect-pdfjs 0 --expect-failed 2
node tests/render_check.mjs example.html --remote cors --device iphone --expect-native 1 --expect-pdfjs 10 --expect-pages 2 --expect-failed 0
node tests/render_check.mjs example.html --remote cors --device android --expect-native 1 --expect-pdfjs 10 --expect-pages 2 --expect-failed 0
node tests/render_check.mjs example.html --remote blocked --expect-native 9 --expect-pdfjs 0 --expect-failed 2
node tests/ios_check.mjs --device "embedpdf iPhone" --remote blocked
node tests/ios_check.mjs --device "embedpdf iPad" --remote blocked
```

`render_check.mjs` serves `docs/` itself with `tests/serve_docs.mjs`. If every
PDF.js canvas has ink and the counts match, it exits 0. If Google Chrome is not
installed, set `CHROME_PATH` to another Chrome or Chromium binary. Do not serve
`docs/` with `python3 -m http.server`. It resets some of the browser's parallel
connections, and then no embed loads.

`ios_check.mjs` opens the page in Safari in an iOS simulator. If every embed not
set to `renderer=native` uses PDF.js with every page inked, it exits 0.
It needs Xcode, the iOS platform (`xcodebuild -downloadPlatform iOS`), and the
two simulators, which you create once:

```
xcrun simctl create "embedpdf iPhone" "iPhone 17" com.apple.CoreSimulator.SimRuntime.iOS-27-0
xcrun simctl create "embedpdf iPad" "iPad Air 11-inch (M4)" com.apple.CoreSimulator.SimRuntime.iOS-27-0
```

**After doc/example changes** — `quarto render` and confirm it completes with no
errors.

## Gotchas (learned the hard way)

- **The Claude preview browser hangs PDF.js.** Its headless GPU (SwiftShader)
  stalls `page.render()` on large canvases or multiple PDF documents and reports
  **0 canvases even when the code is correct**. Do not trust it for PDF.js
  rendering — use `tests/render_check.mjs` (real Chrome). It's fine for native
  `<object>` embeds and general layout.
- The preview browser caches ES modules by URL forever; bumping the extension
  version (new dependency path) or serving on a new port loads changed viewer JS.
- PDF.js 6.x `getDocument` needs an options object: `getDocument({ url })` — a
  bare string throws.
- `renderer=auto` uses PDF.js on iPhone and iPad (an iPad sends a Mac user
  agent, so it is detected by `maxTouchPoints > 1`). Elsewhere, if
  `navigator.pdfViewerEnabled` is true, it uses the native `<object>`, and
  otherwise PDF.js.
  Safari on iOS 27 reports `pdfViewerEnabled` true. Force a renderer with
  `renderer=native|pdfjs`. Use `pdfjs` to preview the mobile path on a desktop.
- A self-contained page (`embed-resources: true`) inlines the viewer as a
  `data:` module, so the viewer must not use `import.meta.url` (it threw there
  before v1.1.0). PDF.js comes from the `text/x-embedpdf-pdfjs` and
  `text/x-embedpdf-worker` scripts: their `src` on a normal page, their text
  when inlined. Quarto inlines each PDF into `data-src` but leaves `<a href>`
  links at the file, so the viewer points the download links at the inlined PDF.
- In Safari, once an `<object>` on the page loads a PDF from another origin, a
  PDF.js `getDocument` of the same URL fails ("Load failed"), even with
  `Access-Control-Allow-Origin: *`. So `ios_check.mjs` has no `--remote cors`:
  `example.html`'s `renderer=native` embed shows the same PDF.
- `quarto render` renders only `*.qmd` (`_quarto.yml`), so `cairn/` stays out
  of `docs/`.
- The viewer serializes rendering (one page at a time, shared PDF.js worker) and
  caps canvas pixels — keep both; they matter on constrained mobile devices.

## Still unverified
- A real Android device loading the GitHub Pages site (the actual target
  environment; can only be checked by a human on a phone).
- A real iPhone or iPad loading the GitHub Pages site, and any iOS version
  before 27. `tests/ios_check.mjs` covers only iOS 27.0 and 27.1 simulators.
- Self-contained RevealJS slides in Safari on iPhone and iPad (checked only in
  Chromium).
- A PDF from another site on a real phone, with or without
  `Access-Control-Allow-Origin`. Safari is checked only with no header, in the
  iOS 27.0 simulators.

## Project tracking (cairn)

This repo uses the cairn plugin. **Before acting on any request, classify it
and route** — the tracking rulebook only loads once a cairn skill fires, so
starting work in plain conversation silently bypasses the work tiers and the
git model. Classify first:

- **Trivial** (typo, comment, tracking edit): in owner mode, commit to the
  default branch. In guest mode, leave the edit on disk (`cairn/` files only).
- **Look into a GitHub issue**: invoke `/milestone` with the issue number
  or URL.
- **User-visible bug**: invoke `/hotfix`.
- **New work, a design decision, or more than one sitting**: invoke
  `/milestone-plan`. Where a hotfix or trivial route fits, it offers that
  first. Otherwise one question set comes, and the run goes on to the merge
  question. Typed `/milestone-implement` or `/milestone-review` resumes it.
- **Status, "what's next", or unsure which tier**: invoke `/milestone`.
- **Never implement code on the default branch** outside a milestone/hotfix
  branch. Nothing reaches it without the user's explicit approval at the
  merge question, or for a trivial edit their request or the tier chip.

Whenever the request is anything but trivial, invoke the skill *first* so the
full rulebook (the plugin's `skills/shared/tracking-rules.md`) and its conduct
load — do not reconstruct the rules here from memory. All project state lives under
`cairn/` (**Architecture → DESIGN · Status → ROADMAP · Tasks → milestone
files · Decisions → DECISIONS · Lessons → LESSONS · History → archive +
git**); never record
status or TODOs in this file. Claude's persistent memory never holds project
state; `cairn/` files win any conflict.
