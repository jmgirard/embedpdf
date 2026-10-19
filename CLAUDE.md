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
- `name_test.qmd`, `name_edge_test.qmd`, `percent_test.qmd`,
  `selfcontained_test.qmd`, `selfcontained_slides_test.qmd`,
  `selfcontained_failed_test.qmd`, and `large_test.qmd` are test pages, also
  rendered into `docs/`. `files/` holds copies of `sample.pdf` under the names
  they test, and `inlined-sample.md`, the hand-written embed that
  `name_edge_test.qmd` includes. It also holds `broken.pdf` and
  `undecodable-embeds.md` for `selfcontained_failed_test.qmd`, and
  `large.pdf` and `large-2.pdf` for `large_test.qmd`.

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
node tests/render_check.mjs example.html --expect-native 9 --expect-pdfjs 2 --expect-name sample.pdf --expect-text "On the Origin of Coastlines|Why It Matters"
node tests/render_check.mjs example.html --device mac-safari --expect-native 9 --expect-pdfjs 2 --expect-name sample.pdf --expect-text "On the Origin of Coastlines|Why It Matters"
node tests/render_check.mjs example.html --device windows-touch --expect-native 9 --expect-pdfjs 2 --expect-name sample.pdf --expect-text "On the Origin of Coastlines|Why It Matters"
node tests/render_check.mjs example.html --device iphone --expect-native 1 --expect-pdfjs 10 --expect-name sample.pdf --expect-text "On the Origin of Coastlines|Why It Matters"
node tests/render_check.mjs example.html --device ipad --expect-native 1 --expect-pdfjs 10 --expect-name sample.pdf --expect-text "On the Origin of Coastlines|Why It Matters"
node tests/render_check.mjs name_test.html --expect-native 0 --expect-pdfjs 2 --expect-name "sample copy.pdf"
node tests/render_check.mjs name_test.html --device iphone --expect-native 0 --expect-pdfjs 2 --expect-name "sample copy.pdf"
node tests/render_check.mjs name_edge_test.html --expect-native 0 --expect-pdfjs 2 --expect-pages 2 --expect-name "sample.pdf|-" --expect-text "On the Origin of Coastlines|Why It Matters"
node tests/render_check.mjs name_edge_test.html --device iphone --expect-native 0 --expect-pdfjs 2 --expect-pages 2 --expect-name "sample.pdf|-" --expect-text "On the Origin of Coastlines|Why It Matters"
node tests/ios_check.mjs --device "embedpdf iPhone" --expect-native 1 --expect-name sample.pdf --expect-text "On the Origin of Coastlines|Why It Matters"
node tests/ios_check.mjs --device "embedpdf iPad" --expect-native 1 --expect-name sample.pdf --expect-text "On the Origin of Coastlines|Why It Matters"
node tests/ios_check.mjs --device "embedpdf iPhone" --page name_test.html --expect-embeds 2 --expect-name "sample copy.pdf"
node tests/ios_check.mjs --device "embedpdf iPad" --page name_test.html --expect-embeds 2 --expect-name "sample copy.pdf"
node tests/ios_check.mjs --device "embedpdf iPhone" --page name_edge_test.html --expect-embeds 2 --expect-name "sample.pdf|-" --expect-text "On the Origin of Coastlines|Why It Matters"
node tests/ios_check.mjs --device "embedpdf iPad" --page name_edge_test.html --expect-embeds 2 --expect-name "sample.pdf|-" --expect-text "On the Origin of Coastlines|Why It Matters"
node tests/name_rule_test.mjs
node tests/safari_check.mjs --target mac --expect-native 9 --expect-pdfjs 2 --expect-name sample.pdf
```

`name_rule_test.mjs` checks the viewer's file-name rule over a table of
addresses in Chrome. `safari_check.mjs` reads Safari's names through
safaridriver (WebDriver "Get Computed Label"). Turn on safaridriver once with
`safaridriver --enable` or Safari Settings > Developer > "Allow remote
automation". Its `--target simulator` and `--target page-script` probes fail
on the iOS 27.0 simulators (see "Still unverified").

`--expect-text` checks the hidden page text that screen readers read. The
phrases come from `pdftotext sample.pdf`: phrase 1 is on page 1, phrase 2 on
page 2. In render_check it also checks Chrome's accessibility tree.
`revealjs_test.html` uses other PDFs and gets no text check. `--expect-name`
checks that each PDF.js embed is a group with its expected name: "PDF:
<file name>", numbered, or "PDF" alone, as below. It also checks that each
native embed's `<object>` has that name as its `aria-label` and has no
`title`. In render_check it also checks that each toolbar control's name is
its tooltip and is not repeated as its description. `--expect-name
"a.pdf|b.pdf"` gives one name per native or PDF.js embed in page order, as
on `revealjs_test.html`. The list must name every such embed, and it cannot
hold a file name with `|`. One name stands for the `--expect-native` plus
`--expect-pdfjs` (render_check, safari_check) or `--expect-native` plus
`--expect-embeds` (ios_check) embeds. When `--expect-native` is not given,
it counts as 0. A name the list holds n > 1 times is expected as "PDF: <file
name> (k of n)". The viewer numbers embeds that share a name in the same
way, native and PDF.js embeds together. `-` stands for an embed named "PDF"
alone.
`name_test.html` shows `files/sample copy.pdf` by a path with a space and by
one with `%20`. `name_edge_test.html` shows `sample.pdf` twice. The first
embed uses the query-style address `files/get?file=sample.pdf`, and
`files/get` is a copy of the PDF. The second embed is written by hand in
`files/inlined-sample.md`. It holds the PDF as a `data:` address (made with
`base64`) and has no download link. `percent_test.html` is self-contained. It shows
`files/100%.pdf` by `files/100%25.pdf` and by a bare `%`.
`--plant` in each script plants one defect so you can see a
check fail. render_check, ios_check, safari_check, and name_rule_test take
`--plant`, and each header says what its `--plant` does.
With `--expect-text`, render_check and ios_check wait once for the page's text, or twice
with `--slow-text`. When every
embed is hydrated and every page has text, the wait ends. While something is
missing, it ends after 10 s with no change, or after 60 s in all. If an embed
is still not hydrated then, the run fails at once. `--slow-text <ms>` puts the
text back one page every `<ms>` ms, so you can see a run pass a wait longer
than 10 s.

Self-contained pages (`embed-resources: true`): `--alone http|file` (render_check)
and `--alone yes` (ios_check) load a copy of the page with no other file beside it.
Run each `--alone file` line again with `--alone http`. Run the
`selfcontained_test.html` lines also with `--device mac-safari` and
`--device windows-touch` (the desktop counts) and `--device ipad` (the iphone
counts). `revealjs_test.html` is a normal slide deck:

```
node tests/render_check.mjs selfcontained_test.html --alone file --expect-native 2 --expect-pdfjs 1 --expect-pages 2 --expect-links 4 --expect-name sample.pdf --expect-text "On the Origin of Coastlines|Why It Matters"
node tests/render_check.mjs selfcontained_test.html --alone file --device iphone --expect-native 1 --expect-pdfjs 2 --expect-pages 2 --expect-links 4 --expect-name sample.pdf --expect-text "On the Origin of Coastlines|Why It Matters"
node tests/render_check.mjs selfcontained_slides_test.html --alone file --expect-native 2 --expect-pdfjs 1 --expect-pages 2 --expect-links 4 --expect-name sample.pdf --expect-text "On the Origin of Coastlines|Why It Matters"
node tests/render_check.mjs selfcontained_slides_test.html --alone file --device iphone --expect-native 1 --expect-pdfjs 2 --expect-pages 2 --expect-links 4 --expect-name sample.pdf --expect-text "On the Origin of Coastlines|Why It Matters"
node tests/render_check.mjs revealjs_test.html --expect-native 2 --expect-pdfjs 1 --expect-name "dummy.pdf|dummy2.pdf|dummy.pdf"
node tests/render_check.mjs revealjs_test.html --device iphone --expect-native 1 --expect-pdfjs 2 --expect-name "dummy.pdf|dummy2.pdf|dummy.pdf"
node tests/render_check.mjs percent_test.html --alone file --expect-native 0 --expect-pdfjs 2 --expect-pages 2 --expect-name "100%.pdf"
node tests/render_check.mjs percent_test.html --alone http --expect-native 0 --expect-pdfjs 2 --expect-pages 2 --expect-name "100%.pdf"
node tests/render_check.mjs percent_test.html --alone file --device iphone --expect-native 0 --expect-pdfjs 2 --expect-pages 2 --expect-name "100%.pdf"
node tests/ios_check.mjs --device "embedpdf iPhone" --page percent_test.html --alone yes --expect-embeds 2 --expect-name "100%.pdf"
node tests/ios_check.mjs --device "embedpdf iPad" --page percent_test.html --alone yes --expect-embeds 2 --expect-name "100%.pdf"
node tests/ios_check.mjs --device "embedpdf iPhone" --page selfcontained_test.html --alone yes --expect-embeds 2 --expect-native 1 --expect-name sample.pdf --expect-text "On the Origin of Coastlines|Why It Matters"
node tests/ios_check.mjs --device "embedpdf iPad" --page selfcontained_test.html --alone yes --expect-embeds 2 --expect-native 1 --expect-name sample.pdf --expect-text "On the Origin of Coastlines|Why It Matters"
```

A self-contained page whose embeds cannot show their PDF:
`selfcontained_failed_test.html` holds `files/broken.pdf`, a text file that
PDF.js cannot load. It also holds two hand-written embeds
(`files/undecodable-embeds.md`). Their `data:` address holds `@`, and
Chromium and Safari do not decode it.
`--expect-download "<path>|-|…"` gives one entry per failed embed with an
inlined PDF, in page order. A path from the repo root means a "Download the
PDF" link to a `blob:` URL with no target. Its download name is the path's
file name. In render_check, a click on it must save that file in Chromium. `-`
means an address that did not decode and no link. Both scripts also count one
"embedpdf: failed to render an inlined PDF" error per such embed. In
render_check, `--expect-failed` also counts the inlined embeds that pass
`--expect-download`. Run each `--alone file` line below again with `--alone
http`:

```
node tests/render_check.mjs selfcontained_failed_test.html --alone file --expect-native 0 --expect-pdfjs 0 --expect-failed 3 --expect-download "files/broken.pdf|-|-"
node tests/render_check.mjs selfcontained_failed_test.html --alone file --device iphone --expect-native 0 --expect-pdfjs 0 --expect-failed 3 --expect-download "files/broken.pdf|-|-"
node tests/ios_check.mjs --device "embedpdf iPhone" --page selfcontained_failed_test.html --alone yes --expect-embeds 2 --expect-download "files/broken.pdf|-|-"
node tests/ios_check.mjs --device "embedpdf iPad" --page selfcontained_failed_test.html --alone yes --expect-embeds 2 --expect-download "files/broken.pdf|-|-"
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

A PDF missing from the page's own site: `--missing-pdfs` (no value) makes the
page's server answer HTTP 404 for every `.pdf`. Run the desktop line also with
`--device mac-safari` and `--device windows-touch`:

```
node tests/render_check.mjs example.html --missing-pdfs --device iphone --expect-native 1 --expect-pdfjs 0 --expect-failed 10
node tests/render_check.mjs example.html --missing-pdfs --device android --expect-native 1 --expect-pdfjs 0 --expect-failed 10
node tests/render_check.mjs example.html --missing-pdfs --expect-native 9 --expect-pdfjs 0 --expect-failed 2
node tests/ios_check.mjs --device "embedpdf iPhone" --missing-pdfs
node tests/ios_check.mjs --device "embedpdf iPad" --missing-pdfs
```

A PDF that PDF.js loads by byte ranges: PDF.js asks for ranges only for a PDF
over 128 KB (131,072 bytes). `files/large.pdf` is seven copies of `sample.pdf`
joined with `pdfunite`, 14 pages and over that size. `files/large-2.pdf` is a
copy of it. `large_test.html` shows `large.pdf` with `renderer=pdfjs` and
`large-2.pdf` with `renderer=auto`, so the two embeds load different
addresses. `--expect-ranges` (no value) makes the server that serves the PDFs
send each whole `.pdf` file over 128 KB slowly. On a local server PDF.js
otherwise often gets the whole file before it asks for a range. The run then
fails unless that server answered at least one byte-range request (HTTP 206)
for each PDF.js embed's address. With `--remote cors`, that server is the
second one. If a PDF.js embed's PDF is not over 128 KB, or another embed
loads the same address, the run exits 2. `--plant noranges` makes that
server ignore every Range header, and the run must then fail. The text repeats every two pages, so these lines
take no `--expect-text`:

```
node tests/render_check.mjs large_test.html --expect-ranges --expect-native 1 --expect-pdfjs 1 --expect-pages 14 --expect-name "large.pdf|large-2.pdf"
node tests/render_check.mjs large_test.html --expect-ranges --device iphone --expect-native 0 --expect-pdfjs 2 --expect-pages 14 --expect-name "large.pdf|large-2.pdf"
node tests/render_check.mjs large_test.html --expect-ranges --device android --expect-native 0 --expect-pdfjs 2 --expect-pages 14 --expect-name "large.pdf|large-2.pdf"
node tests/render_check.mjs large_test.html --expect-ranges --remote cors --device iphone --expect-native 0 --expect-pdfjs 2 --expect-pages 14 --expect-name "large.pdf|large-2.pdf"
node tests/render_check.mjs large_test.html --expect-ranges --remote cors --device android --expect-native 0 --expect-pdfjs 2 --expect-pages 14 --expect-name "large.pdf|large-2.pdf"
node tests/ios_check.mjs --device "embedpdf iPhone" --page large_test.html --expect-ranges --expect-embeds 2 --expect-pages 14 --expect-name "large.pdf|large-2.pdf"
node tests/ios_check.mjs --device "embedpdf iPad" --page large_test.html --expect-ranges --expect-embeds 2 --expect-pages 14 --expect-name "large.pdf|large-2.pdf"
```

`render_check.mjs` serves `docs/` itself with `tests/serve_docs.mjs`. If every
page of every PDF.js embed has a canvas with ink and the counts match, it exits
0. Both scripts use the ink rule in `tests/ink.mjs`. If Google Chrome is not
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

**After any change to `tests/ink.mjs`, `tests/serve_docs.mjs`, or
`tests/expect_names.mjs`**, run the
helper tests (Node only, no browser), then the browser checks above:

```
node tests/helpers_test.mjs              # must print "N passed, 0 failed"
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
  The same queue reads each page's hidden text at load. Page renders go
  first, and each text read gives up after 10 s.

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
- A large PDF that PDF.js loads by byte ranges, on GitHub Pages or on a real
  phone. It is checked only on the local test servers, with a slow
  whole-file answer, in Chromium and in the iOS 27.0 simulators.
- A PDF missing from the page's own site (HTTP 404) on a real phone. It is
  checked only in Chromium and in the iOS 27.0 simulators.
- A self-contained embed that cannot show its PDF gives a "Download the PDF"
  link. Only Chromium saves the file in a check. No check saves it in Safari
  (desktop or iOS) or Firefox. In the iOS 27.0 simulators only the link's text,
  `blob:` address, download name, and missing target are checked.
- A real screen reader (VoiceOver, TalkBack) reading a PDF.js embed's hidden
  page text, its group name ("PDF: <file name>", numbered or "PDF"), its toolbar controls'
  `title`-only names, and the page indicator's "Page i of n". All of these are
  checked in Chromium's accessibility tree. In Safari's page DOM in the iOS
  simulators, the group name, hidden text, and indicator are checked, but not
  the toolbar controls. In desktop Safari 27.0.1, `safari_check.mjs --target
  mac` checks the group name, toolbar controls, and indicator, but not the
  page text.
- A real screen reader reading a native embed's name, the `aria-label` on its
  `<object>`. It is checked in Chromium's accessibility tree, in desktop
  Safari 27.0.1 by `safari_check.mjs --target mac`, and in Safari's page DOM
  in the iOS simulators.
- Safari's computed names in the iOS simulators. On 2026-10-19 with iOS 27.0,
  `safari_check.mjs --target simulator` got "Could not find any session hosts
  that match the requested capabilities" from safaridriver. The simulators'
  Safari "Remote Automation" setting was not turned on. `--target
  page-script` found no `Element.prototype.computedName`.
- The cost of reading every page's text at load on a constrained phone: memory
  and first-paint delay for a long PDF were not measured.

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
