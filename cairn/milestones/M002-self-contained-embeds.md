# M002: Self-contained embeds

- **Status:** review
- **Priority:** high
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** IP1, IP2, GP4, GP5, GP6
- **Resolves:** —
- **Surface tier:** user-facing — it changes what readers of self-contained Quarto pages and slides see
- **Branch/PR:** m002-self-contained-embeds

## Goal

A page or slide deck rendered with `embed-resources: true` shows its embeds inline from that one file, in the browsers that AC2, AC3, and AC6 name.

## Scope

**In:** The viewer stops failing when Quarto inlines it. In a self-contained page, the viewer loads PDF.js and its worker from copies inlined in the page. The native path and every download link use the PDF that Quarto inlines in `data-src`. The shortcode adds the two vendored PDF.js files as script elements that browsers do not run, only for a document with an `auto` or `pdfjs` embed. Two test pages (HTML and RevealJS) go in `docs/`. The check scripts get a mode that loads a page with no other file beside it. The docs, the version (1.1.0), and the design records change to match.

**Out:**
- With JavaScript disabled, the download link in a self-contained page still points at the separate PDF file. This goes to the candidate row "Self-contained no-JS link".
- Self-contained slides in Safari on iPhone and iPad are not checked here. This goes to the candidate row "Self-contained slides on iOS".
- Real Android devices and emulated Android Chrome stay unverified, as listed in CLAUDE.md "Still unverified".
- The other check-script gaps stay in the candidate row "Check script gaps".

## Acceptance criteria

- [x] AC1: `quarto render` builds `docs/selfcontained_test.html` from a new `selfcontained_test.qmd` that sets `embed-resources: true`. The page embeds `sample.pdf` three times, once each with `renderer=auto`, `renderer=native`, and `renderer=pdfjs`. The `renderer=pdfjs` embed uses the `button` option. Counted as occurrences (`grep -o … | wc -l`), the rendered file holds exactly 3 `data-src="data:application/pdf;base64,` attributes. Exactly one `<script` tag with `type="module"` has a `src` that starts with `data:` and decodes to text that contains `div.embedpdf`. `grep -Eo '(src|data-src)=.[^ >]*(sample\.pdf|pdf\.min\.mjs|pdf\.worker\.min\.mjs|embedpdf-viewer\.js)' docs/selfcontained_test.html` prints nothing.
- [x] AC2: A copy of `selfcontained_test.html` alone in an empty directory works in Chrome or Chromium. `tests/render_check.mjs` runs on that copy in 10 runs: 2 modes (served over HTTP, opened as a `file://` URL) times 5 devices. Each run exits 0. The default, `mac-safari`, and `windows-touch` runs use `--expect-native 2 --expect-pdfjs 1`. The `iphone` and `ipad` runs use `--expect-native 1 --expect-pdfjs 2`. In each run, each PDF.js embed has 2 `.embedpdf-page` elements, and each one holds a canvas with ink. Each native `<object>` has a `data` URL that starts with `blob:` or `data:`. A fetch of that URL returns bytes that start with `%PDF`. With the default toolbar, the page has exactly 4 links that match `.embedpdf-download, .embedpdf object a[download], a.embedpdf-btn`, and each `href` starts with `data:` or `blob:`.
- [x] AC3: `selfcontained_test.html` is served over HTTP from a directory that holds no other file. It passes `tests/ios_check.mjs --page selfcontained_test.html --expect-embeds 2 --expect-pages 2` in the "embedpdf iPhone" and "embedpdf iPad" simulators. Each embed not set to `renderer=native` uses PDF.js, and every page of it has ink.
- [x] AC4: `example.html` keeps working. The seven `render_check.mjs` and `ios_check.mjs` commands for `example.html` in the CLAUDE.md section `Verify before finishing` exit 0 with the counts stated there.
- [x] AC5: The shortcode adds no PDF.js script element to a document whose embeds all use `renderer=native`. It adds both PDF.js files, as script elements whose `type` is not a JavaScript type, to a document with an `auto` or `pdfjs` embed. `pandoc lua tests/test_shortcode.lua` prints `N passed, 0 failed`, with a check for each of these two cases.
- [x] AC6: `quarto render` builds `docs/selfcontained_slides_test.html` from a new `selfcontained_slides_test.qmd` that sets `format: revealjs` and `embed-resources: true`. It embeds `sample.pdf` once per renderer value, each on its own slide. A copy of it alone in an empty directory passes `tests/render_check.mjs` in 4 runs: 2 modes (HTTP, `file://`) times the default and `iphone` devices. The default device runs use `--expect-native 2 --expect-pdfjs 1`, and the `iphone` runs use `--expect-native 1 --expect-pdfjs 2`. In each run, the check goes to each slide with `Reveal.slide()`. After that, each PDF.js embed has 2 `.embedpdf-page` elements, and each one holds a canvas with ink.
- [x] AC7: The docs state the shipped behavior. Each line that `grep -inE 'self-contained|embed-resources|renderer=native' README.md example.qmd` finds is read. None of them advises `renderer=native` as a workaround for self-contained pages or says that embeds do not render inline there. README "Known limitations" states that self-contained HTML pages and RevealJS slides render embeds inline from the one file. It states that the slides were checked only in Chrome or Chromium. It also states that with JavaScript disabled, the download links in a self-contained page (the fallback link and the `button` link) point at the separate PDF file.

## Coverage

- AC1 → T1, T4
- AC2 → T1, T2, T5, T6
- AC3 → T3, T5, T6
- AC4 → T5, T6
- AC5 → T4
- AC6 → T1, T2, T5, T6
- AC7 → T7

## Tasks

- [x] T1: Add `selfcontained_test.qmd` and `selfcontained_slides_test.qmd` (each embeds `sample.pdf` once per renderer, the pdfjs one with `button=`). Render them into `docs/`.
- [x] T2: In `tests/render_check.mjs`, add a mode that copies the page alone into an empty temporary directory and loads it over HTTP or as a `file://` URL. Add the native `<object>` data fetch check, the download-link check, a per-embed page count, and a step that goes to each Reveal slide with `Reveal.slide()` before it measures. Run it on the v1.0.3 render and see it fail.
- [x] T3: In `tests/ios_check.mjs`, add a mode that serves a directory that holds only the page. Run it on the v1.0.3 render and see it fail.
- [x] T4: In `embedpdf.lua`, add a second HTML dependency at the first `auto` or `pdfjs` embed. It lists `pdf.min.mjs` and `pdf.worker.min.mjs` as script elements with a non-JavaScript `type`. Add the two `check(...)` cases to `tests/test_shortcode.lua`.
- [x] T5: In `embedpdf-viewer.js`, resolve the PDF.js URLs only when PDF.js loads. When `import.meta.url` is not a hierarchical URL, load PDF.js and its worker from the inlined script text through `blob:` or `data:` URLs. Convert a `data:` PDF source to a `blob:` URL for the native `<object>`. Point the toolbar button, the fallback link, and the `button` link at the inlined PDF. Keep the serialized render queue and the canvas cap (GP4). Bump the version to 1.1.0 in `_extension.yml` and `embedpdf.lua`.
- [x] T6: Run the AC2, AC3, and AC6 checks on the new pages and the AC4 set on `example.html`.
- [x] T7: Update README "Known limitations" and `example.qmd` line 106. Update the CLAUDE.md gotcha on self-contained pages. Update `cairn/DESIGN.md`: the Known issues entry, the Architecture paragraph, and the IP2 wording that D-002 sets. Mark both new candidate rows as done or narrowed if the work covers them.

## Work log

- 2026-10-18: created by /milestone-plan.
- 2026-10-18: tier check: milestone — a self-contained page needs a design choice about how the PDF and PDF.js reach the page.
- 2026-10-18: collision check: absorbs the candidate row "Self-contained embeds". D-001 (vendor PDF.js) holds: the inlined copies are the vendored files. IP2 and GP5 conflict with full support, settled by D-002.
- 2026-10-18: inbox sweep: 3 open issues (#2, #7, #8) and 0 open PRs; none overlap this scope.
- 2026-10-18: checker-regress shape: not hit. The check scripts test the extension in browsers, and the new modes add pages to check without a wider promise.
- 2026-10-18: lessons harvest: the one lesson (iOS 27.0 runtime for the simulators) bears on AC3 only through the existing simulators.
- 2026-10-18: investigation: Quarto 1.10.19 inlines the viewer as a `data:` module, where `new URL("./pdf.min.mjs", import.meta.url)` throws. It inlines each PDF into `data-src` but leaves `<a href>` links at the file. A prototype with the PDF.js files as `type="text/x-embedpdf"` scripts got them inlined as text (page 1.25 MB to 2.96 MB).
- 2026-10-18: question set: what a self-contained page does — full support, PDF.js inlined in the page (the user first asked whether the 1.7 MB is added only when embed-resources is on; answered yes).
- 2026-10-18: question set: self-contained RevealJS slides — include them.
- 2026-10-18: question set: where the test pages go — publish in docs/.
- 2026-10-18: plan gate chose full support (PDF.js inlined) over a desktop-only fix because phones are the product's target readers; falsified by a promised browser that cannot load a module or module worker from a `blob:` or `data:` URL in a self-contained page.
- 2026-10-18: plan gate chose `<script type="text/x-embedpdf">` holders over a Lua-side base64 copy because Quarto already inlines them and browsers neither fetch nor run them; falsified by a Quarto version that drops or runs such scripts.
- 2026-10-18: version 1.1.0, not 1.0.4: self-contained support is a new capability with no option change.
- 2026-10-18: criteria audit (full mode, fresh Opus reader), pass 1: 11 findings. Fixed: AC1 vacuous grep (exact counts, quote-tolerant pattern), AC2 native readability (object data fetch), AC2 run count wording, AC5 (old) button link outside the div (named selectors, count 4, merged into AC2), AC6 (old) stated as shortcode output, AC7 `renderer=native` grep added. Narrowed: goal drops Android, AC4 to example.html, README claim. Moved to tasks: the GP5 and IP2 record (D-002) and the DESIGN.md and CLAUDE.md edits, because records are not criteria.
- 2026-10-18: criteria audit (full mode, same reader, changed criteria), pass 2: 5 findings. Fixed: AC1 counts are occurrences, AC2 per-embed page count and the default toolbar, AC6 slide navigation and per-embed page count (an off-screen Reveal slide renders nothing), AC7 names both no-JS links. Narrowed: the goal now names the AC2, AC3, and AC6 browsers, so slide decks are Chromium-only and iOS covers embeds not set to `renderer=native`.
- 2026-10-18: split: self-contained slides on iOS go to the candidate row "Self-contained slides on iOS". The no-JS links go to the candidate row "Self-contained no-JS link".
- 2026-10-18: implement started on branch m002-self-contained-embeds.
- 2026-10-18: T1: added selfcontained_test.qmd and selfcontained_slides_test.qmd and rendered both into docs/ (v1.0.3 viewer). Each holds 3 inlined `data-src` PDFs and no file-name `src`. The HTML page holds 3 inlined module scripts, not 1: Quarto's two tabsets scripts are modules too, so AC1's module-script count needs a wording amendment (pending).
- 2026-10-18: T2: render_check gained `--alone http|file` (copies the page into an empty temp dir; checks each native object's data URL and `%PDF` bytes), `--expect-pages`, `--expect-links`, and Reveal slide stepping; serve_docs gained a `root` option. On the v1.0.3 page both alone modes exit 1 ("no embed was hydrated", 1 link `sample.pdf`). example.html still passes (default 9/2; iphone 1/10 with `--expect-pages 2`). Chromium 155 via `CHROME_PATH` stands in for Chrome, as in M001.
- 2026-10-18: T3: ios_check gained `--alone yes|no` (serves a copy of the page from an empty temp dir). On the v1.0.3 page in the iOS 27.0 iPhone simulator it exits 1: all 3 embeds renderer "none", error `TypeError: "./pdf.min.mjs" cannot be parsed as a URL.` (the known defect).
- 2026-10-18: T4: embedpdf.lua adds an `embedpdf-pdfjs` dependency (types `text/x-embedpdf-pdfjs`, `text/x-embedpdf-worker`) at the first embed not set to `renderer=native`. Choice: the viewer dependency drops its two PDF.js `resources`, and the viewer loads PDF.js from these scripts on every page (their `src` normally, their text when inlined), so a site keeps one copy of PDF.js and native-only pages carry none. Rejected: keeping the `resources` copy beside the viewer, which puts a second copy of PDF.js in every site. `pandoc lua tests/test_shortcode.lua`: 39 passed, 0 failed; with the old embedpdf.lua, 5 of the new checks fail. The viewer still needs T5 before pages work.
- 2026-10-18: T5: the viewer loads PDF.js from the `text/x-embedpdf-*` scripts (their `src`, or a `blob:` URL of their text), with no `import.meta.url`. A `data:` PDF source is decoded once per source: PDF.js gets a copy of the bytes, and the native `<object>`, the toolbar button, the fallback link, and the `button` link get a `blob:` URL, with the file name from the fallback link's `href` as the `download` name. Version 1.1.0 in `_extension.yml` and `embedpdf.lua`. `quarto render` completed.
- 2026-10-18: T6: Chromium 155. AC2 page alone, 10 runs (HTTP and `file://` times default, mac-safari, windows-touch, iphone, ipad): all exit 0 with 2/1 or 1/2, every PDF.js embed 2 inked pages, objects `blob:` with `%PDF`, 4 `blob:` links. AC6 slides alone, 4 runs: all exit 0. AC4 example.html 5 runs: exit 0 (9/2 desktop, 1/10 iphone and ipad, all canvases inked). iOS 27.0 simulators: example.html iPhone and iPad exit 0, selfcontained_test.html alone iPhone and iPad exit 0 (2 PDF.js embeds, 2 inked pages each, no errors). Plants: a native `data-src` replaced by `missing.pdf` fails the object and link checks; `--expect-pages 3` fails the page count; example.html with `--alone http` fails (no embed hydrated).
- 2026-10-18: re-audit: AC1 (full) — nothing blocking; two minor notes: "decodes" names no decoder (every `data:` src here is base64), and the clause depends on Quarto inlining modules as a `data:` src.
- 2026-10-18: substantive amendment: AC1's module-script clause now reads "Exactly one `<script` tag with `type="module"` has a `src` that starts with `data:` and decodes to text that contains `div.embedpdf`." Quarto's two tabsets scripts are also inlined modules, so the old count of 1 was 3 on a working page. Wording only; the deliverable is unchanged. Both new pages give 1 under the new clause.
- 2026-10-18: T7: README "Known limitations" and example.qmd describe self-contained support; CLAUDE.md has the self-contained check commands, the new gotcha, and a "Still unverified" line for slides on iOS; DESIGN.md IP2, GP5, Architecture, and Known issues follow D-002; PROFILE verify slot names the new commands. README.md and CLAUDE.md still have simple-english lint hits in text this milestone did not touch; the added lines lint clean. Both new candidate rows stay open (not covered by this work). `quarto render example.qmd` completed.
- 2026-10-18: claim audit: 60 claims read, 4 corrected — _extensions/embedpdf/embedpdf-viewer.js (native-only download claim limited to pages that are not self-contained; unsupported URL-length claim replaced), example.qmd (pointer to README limits), tests/ios_check.mjs (header names `--alone`). The same reader re-read all 4: true. Re-render done; selfcontained_test.html alone file iphone and example.html default still exit 0.
- 2026-10-18: implement complete; status review.
- 2026-10-18: review pass 1 started; branch level with origin/main (0 commits behind); Copilot round off (no header line).
- 2026-10-18: review pass 1: 24 reviewer findings settled (17 fix now, 5 follow-up, 2 reject); no criterion failed, so no return. Fix-now work: viewer per-embed catch, `fetch` decode with only the Blob kept, `role="img"` removed, short error labels, percent-decoded file names; test scripts refuse pages outside docs/, clean temp dirs on exit, fail `--expect-pages` with no PDF.js embed, inject the iOS probe at the last `</body>`; one Lua check for single injection; CLAUDE.md check list widened (http mode, all devices, `revealjs_test.html`); example.qmd wording. Follow-ups: new row "Self-contained native checks", existing row "Self-contained no-JS link" (D-003).
- 2026-10-18: count corrected: of the 24 findings, 18 are fix now (diff-bug #4 and #9 also send a part to follow-up), 4 follow-up, 2 reject; the Review lines carry `fixed 6dc852b`.

## Decisions

## Review

Pass 1 (2026-10-18). Fresh `quarto render` completed with no errors and no output change. Chromium 155 via `CHROME_PATH`; iOS 27.0 simulators.

- AC1: `docs/selfcontained_test.html` built from `selfcontained_test.qmd` (`embed-resources: true`; `sample.pdf` with auto, `renderer=native`, `renderer=pdfjs button=…`). `grep -o … | wc -l` gives 3 `data-src="data:application/pdf;base64,`; 1 module script with a `data:` src decodes to text with `div.embedpdf` (3 module scripts in all; 2 are Quarto tabsets); the file-name `src` grep prints 0 lines. Pass.
- AC2: `render_check.mjs selfcontained_test.html --alone http|file` with `--expect-pages 2 --expect-links 4`, 10 runs: HTTP and `file://` times default, mac-safari, windows-touch (native 2, PDF.js 1) and iphone, ipad (native 1, PDF.js 2). All exit 0. Every PDF.js embed 2 pages, both inked; every native object `blob:` with `%PDF` bytes; 4 links, all `blob:`. Pass.
- AC3: `ios_check.mjs --page selfcontained_test.html --alone yes --expect-embeds 2 --expect-pages 2` exits 0 in "embedpdf iPhone" and "embedpdf iPad" (iOS 27.0): auto and pdfjs embeds use PDF.js, 2 pages each, all inked; no page errors. Pass.
- AC4: the seven CLAUDE.md commands for `example.html` exit 0: render_check default, mac-safari, windows-touch (native 9, PDF.js 2, 4 of 4 canvases inked), iphone, ipad (native 1, PDF.js 10, 20 of 20 inked); ios_check iPhone and iPad (10 PDF.js embeds with 2 inked pages each). Pass.
- AC5: `pandoc lua tests/test_shortcode.lua` prints `39 passed, 0 failed`. Checks "deps: all-native document adds no PDF.js" (and the metadata-default case) and "deps: auto (default) / pdfjs embed adds both PDF.js files" with "…PDF.js scripts have a non-JavaScript type" pass; on the pre-T4 embedpdf.lua 5 of these fail. Pass.
- AC6: `docs/selfcontained_slides_test.html` built from `selfcontained_slides_test.qmd` (`format: revealjs`, `embed-resources: true`, one renderer per slide). `render_check.mjs --alone http|file --expect-pages 2`, 4 runs (default: native 2, PDF.js 1; iphone: native 1, PDF.js 2), each stepping every slide with `Reveal.slide()`: all exit 0, every PDF.js embed 2 inked pages. Pass.
- AC7: `grep -inE 'self-contained|embed-resources|renderer=native' README.md example.qmd` finds 7 lines (README 84, 85; example.qmd 97, 99, 101, 103, 106), each read. None advises `renderer=native` for self-contained pages or says they do not render inline (85, 97–103 are about native on iOS and desktop). README 84 states that self-contained HTML pages and RevealJS slides show embeds inline from the one file, that slides were checked only in Chromium, and that with JavaScript disabled the fallback and `button` links point at the separate PDF file. Pass.

Consistency gate: `cairn_validate.py` all checks passed; `cairn_impact.py --changed` lists IP1 at DESIGN.md:79, :108 and this file's header, all current. The generic profile names no toolchain checks.

spawned: diff-bug, blame-history, prior-review

- diff-bug #1: one bad inlined `data-src` (a throw in `inlinedPdf` inside `hydrate`) stops every later embed; the non-base64 branch mis-decodes binary PDFs — fix now, fixed 6dc852b (per-embed catch; the browser decodes the `data:` URL with `fetch`).
- diff-bug #2: memory on phones (bytes, Map key, Blob, and a PDF.js copy held per embed, decoded synchronously) — fix now, fixed 6dc852b (only the Blob is kept, which the object and links need; PDF.js reads it into an array only on the PDF.js path; the `data-src` text is removed after decode). This is GP4's written reason for the Blob.
- diff-bug #3: Pandoc's embed-resources adds `role="img"` to each `div.embedpdf` with an inlined `data-src`, hiding the controls from screen readers — fix now, fixed 6dc852b (removed at hydration).
- diff-bug #4: the native check only fetches the bytes; `blob:` display in desktop Safari and Firefox is unchecked, and example.qmd says "work with every renderer" — fix now, fixed 6dc852b for the example.qmd wording; the display gap is follow-up ("Self-contained native checks").
- diff-bug #5: the slides `button` link rewrite runs with no `--expect-links` — fix now, fixed 6dc852b (CLAUDE.md slides lines add `--expect-links 4`; the post-fix slide runs pass it).
- diff-bug #6: `#page=` on a `blob:` URL is untested — follow-up ("Self-contained native checks").
- diff-bug #7: ios_check injects its probe at the first `</body>`, which on the self-contained slides is inside reveal.js text — fix now, fixed 6dc852b (last `</body>`).
- diff-bug #8: error logs print the whole data URL — fix now, fixed 6dc852b (logs name "the inlined <file>" or "an inlined PDF").
- diff-bug #9: download names: percent-encoding kept, and the native viewer's own save button names the file by the blob id — fix now, fixed 6dc852b for the percent-decoding; the save-button name is follow-up ("Self-contained native checks").
- diff-bug #10: IP2 says no-JavaScript readers get a download link, but in a self-contained page it points at an unshipped file — follow-up: pre-existing (the link was dead before this branch), held by the row "Self-contained no-JS link"; D-003 corrects D-002's statement.
- diff-bug #11: the routine CLAUDE.md list is narrower than AC2, and the normal deck `revealjs_test.html` is not re-checked — fix now, fixed 6dc852b (CLAUDE.md names the http mode and the other devices, and adds two `revealjs_test.html` lines; both pass: native 2/PDF.js 1 with 2 of 2 canvases inked, iphone 1/2 with 3 of 3).
- diff-bug #12: a missing PDF in a self-contained render is unchecked — reject (false): a run with `nothere.pdf` gives `[WARNING] Could not fetch resource nothere.pdf` and the render completes.
- diff-bug #13: the Lua tests cannot catch a repeated dependency — fix now, fixed 6dc852b (check "deps: each dependency is added once per document").
- diff-bug #14: `--expect-pages` and the object check pass with zero embeds of that kind — fix now, fixed 6dc852b for `--expect-pages` (fails when no embed uses PDF.js); the object check runs beside `--expect-native` in every documented line.
- blame-history #1: the no-JS link contradicts D-002 — follow-up, as diff-bug #10.
- blame-history #2: memory on phones — fix now, fixed 6dc852b, as diff-bug #2.
- blame-history #3: a malformed `data-src` stops the page — fix now, fixed 6dc852b, as diff-bug #1.
- blame-history #4: `#page=` on `blob:` — follow-up, as diff-bug #6.
- blame-history #5: the `--alone` temp directory leaks on an early failure — fix now, fixed 6dc852b (removed in a `process.on("exit")` handler in both scripts; no `embedpdf-alone-*` left after the runs).
- blame-history #6: `pdfjsUrl` throws when the PDF.js script is missing and the rejected promise is cached — reject (false as a defect): the shortcode adds the scripts for every embed not set to `renderer=native`, and a retry could not find a script that is not in the page.
- prior-review #1: `--expect-pages` with zero PDF.js embeds — fix now, fixed 6dc852b, as diff-bug #14.
- prior-review #2: ios_check `--alone` copies a page from outside docs/ — fix now, fixed 6dc852b (both scripts refuse a page outside docs/; `../README.md` exits 2).
- prior-review #3: temp directory leak — fix now, fixed 6dc852b, as blame-history #5.
- prior-review #4: the ios_check header sentence lacks a verb — fix now, fixed 6dc852b.

Post-fix re-run (same day, after `quarto render`): AC2 10 runs exit 0 (same counts, objects `blob:` with `%PDF`, 4 `blob:` links); AC6 4 runs exit 0 with `--expect-links 4`; AC4 7 commands exit 0; AC3 iPhone and iPad exit 0 with no page errors; `test_shortcode.lua` 40 passed, 0 failed. A probe of the page alone over `file://` shows no `role` and no `data-src` left on the 3 embeds and no console errors; with the first `data-src` corrupted, that embed stays unhydrated and the other 2 hydrate.
