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
- `name_test.qmd`, `name_edge_test.qmd`, `percent_test.qmd`, `percent_page_test.qmd`,
  `selfcontained_test.qmd`, `selfcontained_slides_test.qmd`,
  `selfcontained_failed_test.qmd`, `large_test.qmd`, and `shared_test.qmd` are test pages, also
  rendered into `docs/`. `files/` holds `sample.pdf` again under each name
  they test, and `inlined-sample.md`, the hand-written embed that
  `name_edge_test.qmd` includes. It also holds `broken.pdf` and
  `undecodable-embeds.md` for `selfcontained_failed_test.qmd`, and
  `large.pdf` and `large-2.pdf` for `large_test.qmd`, and `large-source.md`,
  the source of `large.pdf`. `shared_test.qmd` shows `large.pdf` too. `100%.pdf` is for `percent_test.qmd` and `percent_page_test.qmd`, and
  `50%off.pdf` is for `percent_page_test.qmd`.

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

When the change touches how the shortcode writes the PDF path, also run
`quarto render` and the `percent_page_test.html` lines in the next block. Then
render that page to PDF outside `docs/`. The render must end with no error, and
the PDF must hold the phrase 5 times, once per embed:

```
quarto render percent_page_test.qmd --to pdf --output-dir "$TMPDIR/embedpdf-pdf"
pdftotext "$TMPDIR/embedpdf-pdf/percent_page_test.pdf" - | grep -c "On the Origin of Coastlines"   # must print 5
```

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
node tests/render_check.mjs percent_page_test.html --expect-native 1 --expect-pdfjs 4 --expect-pages 2 --expect-name "100%.pdf|100%.pdf|100%.pdf|50%off.pdf|sample copy.pdf" --expect-text "On the Origin of Coastlines|Why It Matters"
node tests/render_check.mjs percent_page_test.html --device mac-safari --expect-native 1 --expect-pdfjs 4 --expect-pages 2 --expect-name "100%.pdf|100%.pdf|100%.pdf|50%off.pdf|sample copy.pdf" --expect-text "On the Origin of Coastlines|Why It Matters"
node tests/render_check.mjs percent_page_test.html --device windows-touch --expect-native 1 --expect-pdfjs 4 --expect-pages 2 --expect-name "100%.pdf|100%.pdf|100%.pdf|50%off.pdf|sample copy.pdf" --expect-text "On the Origin of Coastlines|Why It Matters"
node tests/render_check.mjs percent_page_test.html --device iphone --expect-native 0 --expect-pdfjs 5 --expect-pages 2 --expect-name "100%.pdf|100%.pdf|100%.pdf|50%off.pdf|sample copy.pdf" --expect-text "On the Origin of Coastlines|Why It Matters"
node tests/render_check.mjs percent_page_test.html --device android --expect-native 0 --expect-pdfjs 5 --expect-pages 2 --expect-name "100%.pdf|100%.pdf|100%.pdf|50%off.pdf|sample copy.pdf" --expect-text "On the Origin of Coastlines|Why It Matters"
node tests/ios_check.mjs --device "embedpdf iPhone" --page percent_page_test.html --expect-embeds 5 --expect-pages 2 --expect-name "100%.pdf|100%.pdf|100%.pdf|50%off.pdf|sample copy.pdf" --expect-text "On the Origin of Coastlines|Why It Matters"
node tests/ios_check.mjs --device "embedpdf iPad" --page percent_page_test.html --expect-embeds 5 --expect-pages 2 --expect-name "100%.pdf|100%.pdf|100%.pdf|50%off.pdf|sample copy.pdf" --expect-text "On the Origin of Coastlines|Why It Matters"
node tests/name_rule_test.mjs
node tests/safari_check.mjs --target mac --expect-native 9 --expect-pdfjs 2 --expect-name sample.pdf
```

`name_rule_test.mjs` checks the viewer's file-name rule over a table of
addresses in Chrome. `safari_check.mjs` reads Safari's names through
safaridriver (WebDriver "Get Computed Label"). Turn on safaridriver once with
`safaridriver --enable` or Safari Settings > Developer > "Allow remote
automation". Its `--target simulator` and `--target page-script` probes fail
on the iOS 27.0 simulators (see "Still unverified").

`--expect-text` checks the hidden page text that screen readers read. It
takes one phrase per page, and phrase k must be on page k and on no other
page. For `sample.pdf` the phrases come from `pdftotext sample.pdf`: phrase
1 is on page 1, phrase 2 on page 2. For `files/large.pdf` they are its 14
page headings (see the byte-range lines below). In render_check it also checks Chrome's accessibility tree.
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
`percent_page_test.html` is a normal page with five embeds. It shows
`files/100%.pdf` by a bare `%` (PDF.js), by `%25` (PDF.js), and by a bare
`%` (`auto`, so native on desktop). It shows `files/50%off.pdf`, where a
letter follows the `%`, and `files/sample copy.pdf` by `%20`. Its own text
does not hold "On the Origin of Coastlines", so a PDF render of it holds
that phrase once per embed.
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
Run each `--alone file` line again with `--alone http`. In both scripts,
`--expect-links <n>` fails the run unless the page holds n download links,
each with a `data:` or `blob:` address. ios_check's `--plant nolink` removes
one such link, and `--plant linkfile` points one at a file name. Run the
`selfcontained_test.html` lines also with `--device mac-safari` and
`--device windows-touch` (the desktop counts) and `--device ipad` (the iphone
counts). `revealjs_test.html` is a normal slide deck:

```
node tests/render_check.mjs selfcontained_test.html --alone file --expect-native 3 --expect-pdfjs 1 --expect-pages 2 --expect-links 5 --expect-name sample.pdf --expect-text "On the Origin of Coastlines|Why It Matters"
node tests/render_check.mjs selfcontained_test.html --alone file --device iphone --expect-native 2 --expect-pdfjs 2 --expect-pages 2 --expect-links 5 --expect-name sample.pdf --expect-text "On the Origin of Coastlines|Why It Matters"
node tests/render_check.mjs selfcontained_slides_test.html --alone file --expect-native 2 --expect-pdfjs 1 --expect-pages 2 --expect-links 4 --expect-name sample.pdf --expect-text "On the Origin of Coastlines|Why It Matters"
node tests/render_check.mjs selfcontained_slides_test.html --alone file --device iphone --expect-native 1 --expect-pdfjs 2 --expect-pages 2 --expect-links 4 --expect-name sample.pdf --expect-text "On the Origin of Coastlines|Why It Matters"
node tests/render_check.mjs revealjs_test.html --expect-native 2 --expect-pdfjs 1 --expect-name "dummy.pdf|dummy2.pdf|dummy.pdf"
node tests/render_check.mjs revealjs_test.html --device iphone --expect-native 1 --expect-pdfjs 2 --expect-name "dummy.pdf|dummy2.pdf|dummy.pdf"
node tests/render_check.mjs percent_test.html --alone file --expect-native 0 --expect-pdfjs 2 --expect-pages 2 --expect-name "100%.pdf"
node tests/render_check.mjs percent_test.html --alone http --expect-native 0 --expect-pdfjs 2 --expect-pages 2 --expect-name "100%.pdf"
node tests/render_check.mjs percent_test.html --alone file --device iphone --expect-native 0 --expect-pdfjs 2 --expect-pages 2 --expect-name "100%.pdf"
node tests/ios_check.mjs --device "embedpdf iPhone" --page percent_test.html --alone yes --expect-embeds 2 --expect-name "100%.pdf"
node tests/ios_check.mjs --device "embedpdf iPad" --page percent_test.html --alone yes --expect-embeds 2 --expect-name "100%.pdf"
node tests/ios_check.mjs --device "embedpdf iPhone" --page selfcontained_test.html --alone yes --expect-embeds 2 --expect-native 2 --expect-links 5 --expect-name sample.pdf --expect-text "On the Origin of Coastlines|Why It Matters"
node tests/ios_check.mjs --device "embedpdf iPad" --page selfcontained_test.html --alone yes --expect-embeds 2 --expect-native 2 --expect-links 5 --expect-name sample.pdf --expect-text "On the Origin of Coastlines|Why It Matters"
node tests/ios_check.mjs --device "embedpdf iPhone" --page selfcontained_slides_test.html --alone yes --expect-embeds 2 --expect-native 1 --expect-links 4 --expect-name sample.pdf --expect-text "On the Origin of Coastlines|Why It Matters"
node tests/ios_check.mjs --device "embedpdf iPad" --page selfcontained_slides_test.html --alone yes --expect-embeds 2 --expect-native 1 --expect-links 4 --expect-name sample.pdf --expect-text "On the Origin of Coastlines|Why It Matters"
node tests/ios_check.mjs --device "embedpdf iPhone" --page revealjs_test.html --expect-embeds 2 --expect-native 1 --expect-pages "2|1" --expect-name "dummy.pdf|dummy2.pdf|dummy.pdf"
node tests/ios_check.mjs --device "embedpdf iPad" --page revealjs_test.html --expect-embeds 2 --expect-native 1 --expect-pages "2|1" --expect-name "dummy.pdf|dummy2.pdf|dummy.pdf"
```

On a RevealJS page, both scripts show each slide in turn before they check
its embeds. ios_check also fails a PDF.js embed whose ink or text it read
while another slide was current. ios_check's `--plant noslide` skips the last
slide that holds a PDF.js embed. On the iPhone simulator, RevealJS shows the slides
in its scrolled view (the report's `scrollView`). ios_check's `--expect-pages`
takes one count for every embed not set to `renderer=native`. It also takes a
`|` list with one count per such embed, in page order. On
`revealjs_test.html` these are `dummy2.pdf` (2 pages) and then `dummy.pdf`
with `renderer=auto` (1 page).

The native embeds of a self-contained page: `native_check.mjs` opens
`selfcontained_test.html` alone and takes a screenshot of each native
`<object>`. The reference is a screenshot of an `<object>` of
`docs/sample.pdf` on the check's own server, at the embed's size. It shows
the page that the embed's `page` option names. The check also fails unless
each `<object>` address is a `blob:` URL with that `#page` fragment. The
fourth embed has `page=2`. In Chromium and Firefox the page-1 and page-2
references must differ. Desktop Safari 27.0.1 opens a native embed at page 1
whatever the fragment says. So the Safari lines take `--same-pages`, and
there the two references must match. Chromium and Firefox run headless. The
header states the plants (`otherpdf`, `broken`, `blank`, `fileaddr`,
`nopage`, placed by `--plant-at <k>`). Firefox started from Claude Code fails
with "Could not find profile folder" until one `open -g -a Firefox` launch
makes its folder. If Firefox is not in `/Applications`, set `FIREFOX_PATH`:

```
node tests/native_check.mjs --browser chromium --page selfcontained_test.html --alone file --expect-native 3 --reference sample.pdf
node tests/native_check.mjs --browser chromium --page selfcontained_test.html --alone http --expect-native 3 --reference sample.pdf
node tests/native_check.mjs --browser firefox --page selfcontained_test.html --alone file --expect-native 3 --reference sample.pdf
node tests/native_check.mjs --browser firefox --page selfcontained_test.html --alone http --expect-native 3 --reference sample.pdf
node tests/native_check.mjs --browser safari --page selfcontained_test.html --alone file --expect-native 3 --reference sample.pdf --same-pages
node tests/native_check.mjs --browser safari --page selfcontained_test.html --alone http --expect-native 3 --reference sample.pdf --same-pages
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
here." and the "Open the PDF" link. Run each desktop line (no `--device`)
also with `--device mac-safari` and `--device windows-touch`. ios_check takes
`blocked` and `cors`, and safari_check takes `cors`. With `cors`, both also
check each native embed's `<object>`. Its address must be on the second
server, and that server's log must hold a GET for it with no Origin
header. A native
viewer's read sends none, and a CORS read such as PDF.js's sends one.
On `example.html` the native embeds and the PDF.js embeds show one PDF. So
the `cors` lines check the case that Safari refuses (see the gotcha below):

```
node tests/render_check.mjs example.html --remote blocked --device iphone --expect-native 1 --expect-pdfjs 0 --expect-failed 10
node tests/render_check.mjs example.html --remote blocked --device android --expect-native 1 --expect-pdfjs 0 --expect-failed 10
node tests/render_check.mjs example.html --remote missing --device iphone --expect-native 1 --expect-pdfjs 0 --expect-failed 10
node tests/render_check.mjs example.html --remote missing --device android --expect-native 1 --expect-pdfjs 0 --expect-failed 10
node tests/render_check.mjs revealjs_test.html --remote blocked --device iphone --expect-native 1 --expect-pdfjs 0 --expect-failed 2
node tests/render_check.mjs example.html --remote cors --device iphone --expect-native 1 --expect-pdfjs 10 --expect-pages 2 --expect-failed 0
node tests/render_check.mjs example.html --remote cors --device android --expect-native 1 --expect-pdfjs 10 --expect-pages 2 --expect-failed 0
node tests/render_check.mjs example.html --remote blocked --expect-native 9 --expect-pdfjs 0 --expect-failed 2
node tests/render_check.mjs example.html --remote cors --expect-native 9 --expect-pdfjs 2 --expect-pages 2 --expect-failed 0
node tests/ios_check.mjs --device "embedpdf iPhone" --remote blocked
node tests/ios_check.mjs --device "embedpdf iPad" --remote blocked
node tests/ios_check.mjs --device "embedpdf iPhone" --remote cors --expect-native 1
node tests/ios_check.mjs --device "embedpdf iPad" --remote cors --expect-native 1
node tests/safari_check.mjs --target mac --remote cors --expect-native 9 --expect-pdfjs 2 --expect-name sample.pdf
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
over 128 KB (131,072 bytes). `files/large.pdf` has 14 pages and is over that
size. Each page's heading is a phrase that no other page holds. The
`--expect-text` list of the lines below gives these phrases in page order.
`files/large-2.pdf` is a copy of it. To change the PDF, edit `files/large-source.md`, build both
files again, and run `quarto render`, because the checks serve the copies
in `docs/files/`:

```
sh tests/make_large_pdf.sh files/large.pdf && cp files/large.pdf files/large-2.pdf && quarto render
```

The script renders each page apart and joins the pages with `pdfunite`,
because one render of the whole source is under 128 KB. It fails unless the
source has 14 parts, each part is one page, and the PDF is over 131,072
bytes. It needs `lualatex` (TinyTeX) and poppler's `pdfunite` and `pdfinfo`. `large_test.html` shows `large.pdf` with `renderer=pdfjs` and
`large-2.pdf` with `renderer=auto`, so the two embeds load different
addresses. `--expect-ranges` (no value) makes the server that serves the PDFs
send each whole `.pdf` file over 128 KB slowly (with `--remote cors`, see
below). On a local server PDF.js
otherwise often gets the whole file before it asks for a range. The run then
fails unless that server answered at least one byte-range request (HTTP 206)
for each PDF.js embed's address. With `--remote cors`, that server is the
second one. There only answers to requests with an Origin header count, so
a native embed of the same address is counted apart. That server then sends
slowly only to requests with an Origin header. A native viewer's read comes
at full speed, so in the runs it ended before PDF.js read the PDF. If a PDF.js embed's PDF is not over 128 KB,
or another embed loads the same address, the run exits 2. With `--remote
cors`, only another PDF.js embed counts here. `--plant noranges` makes that
server ignore every Range header, and the run must then fail.
`shared_test.html` shows `large.pdf` in a native embed and then in a PDF.js
embed:

```
node tests/render_check.mjs large_test.html --expect-ranges --expect-native 1 --expect-pdfjs 1 --expect-pages 14 --expect-name "large.pdf|large-2.pdf" --expect-text "Harbor Lights at Dawn|The Granite Lighthouse|Salt Marsh Herons|Winter Storm Records|Tidal Pools and Crabs|Mapping the Sandbars|Kelp Forest Survey|Driftwood Cabin Notes|The Old Ferry Route|Seawall Repairs|Gull Colony Counts|Oyster Beds in Spring|Fog Signal Station|Lantern Room Logbook"
node tests/render_check.mjs large_test.html --expect-ranges --device iphone --expect-native 0 --expect-pdfjs 2 --expect-pages 14 --expect-name "large.pdf|large-2.pdf" --expect-text "Harbor Lights at Dawn|The Granite Lighthouse|Salt Marsh Herons|Winter Storm Records|Tidal Pools and Crabs|Mapping the Sandbars|Kelp Forest Survey|Driftwood Cabin Notes|The Old Ferry Route|Seawall Repairs|Gull Colony Counts|Oyster Beds in Spring|Fog Signal Station|Lantern Room Logbook"
node tests/render_check.mjs large_test.html --expect-ranges --device android --expect-native 0 --expect-pdfjs 2 --expect-pages 14 --expect-name "large.pdf|large-2.pdf" --expect-text "Harbor Lights at Dawn|The Granite Lighthouse|Salt Marsh Herons|Winter Storm Records|Tidal Pools and Crabs|Mapping the Sandbars|Kelp Forest Survey|Driftwood Cabin Notes|The Old Ferry Route|Seawall Repairs|Gull Colony Counts|Oyster Beds in Spring|Fog Signal Station|Lantern Room Logbook"
node tests/render_check.mjs large_test.html --expect-ranges --remote cors --device iphone --expect-native 0 --expect-pdfjs 2 --expect-pages 14 --expect-name "large.pdf|large-2.pdf" --expect-text "Harbor Lights at Dawn|The Granite Lighthouse|Salt Marsh Herons|Winter Storm Records|Tidal Pools and Crabs|Mapping the Sandbars|Kelp Forest Survey|Driftwood Cabin Notes|The Old Ferry Route|Seawall Repairs|Gull Colony Counts|Oyster Beds in Spring|Fog Signal Station|Lantern Room Logbook"
node tests/render_check.mjs large_test.html --expect-ranges --remote cors --device android --expect-native 0 --expect-pdfjs 2 --expect-pages 14 --expect-name "large.pdf|large-2.pdf" --expect-text "Harbor Lights at Dawn|The Granite Lighthouse|Salt Marsh Herons|Winter Storm Records|Tidal Pools and Crabs|Mapping the Sandbars|Kelp Forest Survey|Driftwood Cabin Notes|The Old Ferry Route|Seawall Repairs|Gull Colony Counts|Oyster Beds in Spring|Fog Signal Station|Lantern Room Logbook"
node tests/ios_check.mjs --device "embedpdf iPhone" --page large_test.html --expect-ranges --expect-embeds 2 --expect-pages 14 --expect-name "large.pdf|large-2.pdf" --expect-text "Harbor Lights at Dawn|The Granite Lighthouse|Salt Marsh Herons|Winter Storm Records|Tidal Pools and Crabs|Mapping the Sandbars|Kelp Forest Survey|Driftwood Cabin Notes|The Old Ferry Route|Seawall Repairs|Gull Colony Counts|Oyster Beds in Spring|Fog Signal Station|Lantern Room Logbook"
node tests/ios_check.mjs --device "embedpdf iPad" --page large_test.html --expect-ranges --expect-embeds 2 --expect-pages 14 --expect-name "large.pdf|large-2.pdf" --expect-text "Harbor Lights at Dawn|The Granite Lighthouse|Salt Marsh Herons|Winter Storm Records|Tidal Pools and Crabs|Mapping the Sandbars|Kelp Forest Survey|Driftwood Cabin Notes|The Old Ferry Route|Seawall Repairs|Gull Colony Counts|Oyster Beds in Spring|Fog Signal Station|Lantern Room Logbook"
node tests/render_check.mjs shared_test.html --remote cors --expect-ranges --device iphone --expect-native 1 --expect-pdfjs 1 --expect-pages 14 --expect-text "Harbor Lights at Dawn|The Granite Lighthouse|Salt Marsh Herons|Winter Storm Records|Tidal Pools and Crabs|Mapping the Sandbars|Kelp Forest Survey|Driftwood Cabin Notes|The Old Ferry Route|Seawall Repairs|Gull Colony Counts|Oyster Beds in Spring|Fog Signal Station|Lantern Room Logbook"
node tests/render_check.mjs shared_test.html --remote cors --expect-ranges --device android --expect-native 1 --expect-pdfjs 1 --expect-pages 14 --expect-text "Harbor Lights at Dawn|The Granite Lighthouse|Salt Marsh Herons|Winter Storm Records|Tidal Pools and Crabs|Mapping the Sandbars|Kelp Forest Survey|Driftwood Cabin Notes|The Old Ferry Route|Seawall Repairs|Gull Colony Counts|Oyster Beds in Spring|Fog Signal Station|Lantern Room Logbook"
node tests/ios_check.mjs --device "embedpdf iPhone" --page shared_test.html --remote cors --expect-native 1 --expect-embeds 1 --expect-pages 14 --expect-text "Harbor Lights at Dawn|The Granite Lighthouse|Salt Marsh Herons|Winter Storm Records|Tidal Pools and Crabs|Mapping the Sandbars|Kelp Forest Survey|Driftwood Cabin Notes|The Old Ferry Route|Seawall Repairs|Gull Colony Counts|Oyster Beds in Spring|Fog Signal Station|Lantern Room Logbook"
node tests/ios_check.mjs --device "embedpdf iPad" --page shared_test.html --remote cors --expect-native 1 --expect-embeds 1 --expect-pages 14 --expect-text "Harbor Lights at Dawn|The Granite Lighthouse|Salt Marsh Herons|Winter Storm Records|Tidal Pools and Crabs|Mapping the Sandbars|Kelp Forest Survey|Driftwood Cabin Notes|The Old Ferry Route|Seawall Repairs|Gull Colony Counts|Oyster Beds in Spring|Fog Signal Station|Lantern Room Logbook"
node tests/ios_check.mjs --device "embedpdf iPhone" --page shared_test.html --remote cors --expect-ranges --expect-native 1 --expect-embeds 1 --expect-pages 14 --expect-text "Harbor Lights at Dawn|The Granite Lighthouse|Salt Marsh Herons|Winter Storm Records|Tidal Pools and Crabs|Mapping the Sandbars|Kelp Forest Survey|Driftwood Cabin Notes|The Old Ferry Route|Seawall Repairs|Gull Colony Counts|Oyster Beds in Spring|Fog Signal Station|Lantern Room Logbook"
node tests/ios_check.mjs --device "embedpdf iPad" --page shared_test.html --remote cors --expect-ranges --expect-native 1 --expect-embeds 1 --expect-pages 14 --expect-text "Harbor Lights at Dawn|The Granite Lighthouse|Salt Marsh Herons|Winter Storm Records|Tidal Pools and Crabs|Mapping the Sandbars|Kelp Forest Survey|Driftwood Cabin Notes|The Old Ferry Route|Seawall Repairs|Gull Colony Counts|Oyster Beds in Spring|Fog Signal Station|Lantern Room Logbook"
```

A slow machine: after render_check scrolls the pages, it waits until every
embed is hydrated and every PDF.js page has a canvas. It measures ink after
this wait, not after a fixed time. If nothing is missing, the wait ends. It
also ends after 10 s in which no embed newly hydrated and no page newly got
a canvas, or after 120 s in all. On a RevealJS page this wait runs on each
slide. `--cpu-throttle <n>` slows Chromium's CPU n times. Only the page-load
limit grows with it. The line below must exit 0. With `--plant norender`
added, it must exit 1 and name "no canvas" for every page. In the runs on
2026-10-19 it took 59 s to 127 s:

```
node tests/render_check.mjs large_test.html --device iphone --expect-native 0 --expect-pdfjs 2 --expect-pages 14 --expect-name "large.pdf|large-2.pdf" --cpu-throttle 70
```

Both scripts give each PDF.js page's ink as "ok", "no canvas", "no ink", or
"unreadable (…)". A failure line names each page that is not "ok". In
ios_check, `--plant blank` paints the canvas of the last page of the first
PDF.js embed white, and the run must name "no ink". `--plant nocanvas`
removes that canvas, and the run must name "no canvas".

A page that forbids eval: with `--csp`, render_check's server sends a
Content-Security-Policy whose `script-src` omits `'unsafe-eval'`. The run
fails unless the page arrives with it. render_check runs no eval in the page.
In Chromium 155 on 2026-10-19, code that puppeteer ran in the page used eval
under this header with no error. So this line shows only that the viewer
renders `sample.pdf` under such a policy. No check renders a PDF with JPEG
2000 or JBIG2 images under it:

```
node tests/render_check.mjs example.html --csp --expect-native 9 --expect-pdfjs 2 --expect-pages 2
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

**After any change to a check helper** (`tests/ink.mjs`,
`tests/serve_docs.mjs`, `tests/expect_names.mjs`, or `tests/png_diff.mjs`),
run the helper tests (Node only, no browser). Then run the browser checks
above:

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
- In Safari, once an `<object>` on the page loads a PDF from another origin,
  every CORS read of the same URL fails ("Load failed") with no request sent,
  even with `Access-Control-Allow-Origin: *`. This was seen in desktop Safari
  27.0.1 and iOS 27.0 on 2026-10-19. In desktop Safari, fetch options such as
  `cache` or `credentials` did not help (not tried on iOS). A read of the URL
  with an added query works. So for such a PDF the viewer gives
  PDF.js the address with `embedpdf=pdfjs` added (`pdfjsAddress` in
  `embedpdf-viewer.js`), in every browser. In one comparison in the iOS 27.0
  iPhone simulator, the v1.2.4 viewer loaded the PDF while the `<object>` read
  was still arriving. So a check of this case lets the native read end first.
- `quarto render` renders only `*.qmd` (`_quarto.yml`), so `cairn/` stays out
  of `docs/`.
- The viewer serializes rendering (one page at a time, shared PDF.js worker) and
  caps canvas pixels — keep both; they matter on constrained mobile devices.
  The same queue reads each page's hidden text at load. Page renders go
  first, and each text read gives up after 10 s.

## Still unverified
- GitHub Pages' answer to an address with `%25`, which the shortcode writes
  for a bare `%` in a PDF path since v1.2.6. It is checked only on the local
  test server.
- A real Android device loading the GitHub Pages site (the actual target
  environment; can only be checked by a human on a phone).
- A real iPhone or iPad loading the GitHub Pages site, and any iOS version
  before 27. `tests/ios_check.mjs` covers only iOS 27.0 and 27.1 simulators.
- Any RevealJS slide deck in desktop Safari. `tests/safari_check.mjs` exits 2
  on a slide deck.
- A PDF from another site on a real phone, with or without
  `Access-Control-Allow-Origin`. Safari is checked in the iOS 27.0
  simulators, with no header and with `*`, and in desktop Safari 27.0.1 with
  `*`. A real site's answer to the `embedpdf=pdfjs` query that the viewer adds
  next to a native embed of the same PDF is not checked.
- A large PDF that PDF.js loads by byte ranges, on GitHub Pages or on a real
  phone. It is checked only on the local test servers, with a slow
  whole-file answer, in Chromium and in the iOS 27.0 simulators. Desktop
  Safari is not checked for byte ranges.
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
