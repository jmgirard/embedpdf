# M002: Self-contained embeds

- **Status:** planned
- **Priority:** high
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** IP1, IP2, GP4, GP5, GP6
- **Resolves:** —
- **Surface tier:** user-facing — it changes what readers of self-contained Quarto pages and slides see
- **Branch/PR:** —

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

- [ ] AC1: `quarto render` builds `docs/selfcontained_test.html` from a new `selfcontained_test.qmd` that sets `embed-resources: true`. The page embeds `sample.pdf` three times, once each with `renderer=auto`, `renderer=native`, and `renderer=pdfjs`. The `renderer=pdfjs` embed uses the `button` option. Counted as occurrences (`grep -o … | wc -l`), the rendered file holds exactly 3 `data-src="data:application/pdf;base64,` attributes. It holds exactly one `<script` tag with `type="module"` and a `src` that starts with `data:`. `grep -Eo '(src|data-src)=.[^ >]*(sample\.pdf|pdf\.min\.mjs|pdf\.worker\.min\.mjs|embedpdf-viewer\.js)' docs/selfcontained_test.html` prints nothing.
- [ ] AC2: A copy of `selfcontained_test.html` alone in an empty directory works in Chrome or Chromium. `tests/render_check.mjs` runs on that copy in 10 runs: 2 modes (served over HTTP, opened as a `file://` URL) times 5 devices. Each run exits 0. The default, `mac-safari`, and `windows-touch` runs use `--expect-native 2 --expect-pdfjs 1`. The `iphone` and `ipad` runs use `--expect-native 1 --expect-pdfjs 2`. In each run, each PDF.js embed has 2 `.embedpdf-page` elements, and each one holds a canvas with ink. Each native `<object>` has a `data` URL that starts with `blob:` or `data:`. A fetch of that URL returns bytes that start with `%PDF`. With the default toolbar, the page has exactly 4 links that match `.embedpdf-download, .embedpdf object a[download], a.embedpdf-btn`, and each `href` starts with `data:` or `blob:`.
- [ ] AC3: `selfcontained_test.html` is served over HTTP from a directory that holds no other file. It passes `tests/ios_check.mjs --page selfcontained_test.html --expect-embeds 2 --expect-pages 2` in the "embedpdf iPhone" and "embedpdf iPad" simulators. Each embed not set to `renderer=native` uses PDF.js, and every page of it has ink.
- [ ] AC4: `example.html` keeps working. The seven `render_check.mjs` and `ios_check.mjs` commands for `example.html` in the CLAUDE.md section `Verify before finishing` exit 0 with the counts stated there.
- [ ] AC5: The shortcode adds no PDF.js script element to a document whose embeds all use `renderer=native`. It adds both PDF.js files, as script elements whose `type` is not a JavaScript type, to a document with an `auto` or `pdfjs` embed. `pandoc lua tests/test_shortcode.lua` prints `N passed, 0 failed`, with a check for each of these two cases.
- [ ] AC6: `quarto render` builds `docs/selfcontained_slides_test.html` from a new `selfcontained_slides_test.qmd` that sets `format: revealjs` and `embed-resources: true`. It embeds `sample.pdf` once per renderer value, each on its own slide. A copy of it alone in an empty directory passes `tests/render_check.mjs` in 4 runs: 2 modes (HTTP, `file://`) times the default and `iphone` devices. The default device runs use `--expect-native 2 --expect-pdfjs 1`, and the `iphone` runs use `--expect-native 1 --expect-pdfjs 2`. In each run, the check goes to each slide with `Reveal.slide()`. After that, each PDF.js embed has 2 `.embedpdf-page` elements, and each one holds a canvas with ink.
- [ ] AC7: The docs state the shipped behavior. Each line that `grep -inE 'self-contained|embed-resources|renderer=native' README.md example.qmd` finds is read. None of them advises `renderer=native` as a workaround for self-contained pages or says that embeds do not render inline there. README "Known limitations" states that self-contained HTML pages and RevealJS slides render embeds inline from the one file. It states that the slides were checked only in Chrome or Chromium. It also states that with JavaScript disabled, the download links in a self-contained page (the fallback link and the `button` link) point at the separate PDF file.

## Coverage

- AC1 → T1, T4
- AC2 → T1, T2, T5, T6
- AC3 → T3, T5, T6
- AC4 → T5, T6
- AC5 → T4
- AC6 → T1, T2, T5, T6
- AC7 → T7

## Tasks

- [ ] T1: Add `selfcontained_test.qmd` and `selfcontained_slides_test.qmd` (each embeds `sample.pdf` once per renderer, the pdfjs one with `button=`). Render them into `docs/`.
- [ ] T2: In `tests/render_check.mjs`, add a mode that copies the page alone into an empty temporary directory and loads it over HTTP or as a `file://` URL. Add the native `<object>` data fetch check, the download-link check, a per-embed page count, and a step that goes to each Reveal slide with `Reveal.slide()` before it measures. Run it on the v1.0.3 render and see it fail.
- [ ] T3: In `tests/ios_check.mjs`, add a mode that serves a directory that holds only the page. Run it on the v1.0.3 render and see it fail.
- [ ] T4: In `embedpdf.lua`, add a second HTML dependency at the first `auto` or `pdfjs` embed. It lists `pdf.min.mjs` and `pdf.worker.min.mjs` as script elements with a non-JavaScript `type`. Add the two `check(...)` cases to `tests/test_shortcode.lua`.
- [ ] T5: In `embedpdf-viewer.js`, resolve the PDF.js URLs only when PDF.js loads. When `import.meta.url` is not a hierarchical URL, load PDF.js and its worker from the inlined script text through `blob:` or `data:` URLs. Convert a `data:` PDF source to a `blob:` URL for the native `<object>`. Point the toolbar button, the fallback link, and the `button` link at the inlined PDF. Keep the serialized render queue and the canvas cap (GP4). Bump the version to 1.1.0 in `_extension.yml` and `embedpdf.lua`.
- [ ] T6: Run the AC2, AC3, and AC6 checks on the new pages and the AC4 set on `example.html`.
- [ ] T7: Update README "Known limitations" and `example.qmd` line 106. Update the CLAUDE.md gotcha on self-contained pages. Update `cairn/DESIGN.md`: the Known issues entry, the Architecture paragraph, and the IP2 wording that D-002 sets. Mark both new candidate rows as done or narrowed if the work covers them.

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
