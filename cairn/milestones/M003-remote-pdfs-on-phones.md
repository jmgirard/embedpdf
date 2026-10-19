# M003: Remote PDFs on phones

- **Status:** review
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** IP1, IP2
- **Resolves:** #2 closes, #8 closes
- **Surface tier:** user-facing — changes what phone readers see and what the docs tell authors
- **Branch/PR:** m003-remote-pdfs-on-phones

## Goal

When the PDF.js viewer cannot load a PDF from another site, the embed tells the reader so and links to the PDF, and the docs say what such a site must send.

## Scope

**In:** In `embedpdf-viewer.js`, when PDF.js `getDocument` rejects, the embed shows a message and a link that opens
the PDF in a new tab, in place of the no-JS "Download PDF file." link. CSS for that state. Version 1.1.1.
`render_check.mjs` gets `--remote blocked|cors|missing`, `--expect-failed`, and an `android` device. `ios_check.mjs`
gets `--remote blocked`. README "Known limitations", a new `example.qmd` section, CLAUDE.md check lines, and the
DESIGN.md Architecture paragraph describe the new state. D-004 records that IP1 does not cover a PDF whose site
blocks cross-site reads.

**Out:**
- Showing a PDF whose site blocks cross-site reads on the PDF.js path. A static extension has no server to fetch it
  through. D-004 records this, and the docs say how to avoid it.
- Failures that the native `<object>` meets. The browser's own viewer reports those, and the viewer cannot see them.
- Other failure causes (a corrupt or encrypted PDF, a failed PDF.js import, a failed inlined PDF, a page render
  error): they take the same code path, but this milestone checks only the two causes in AC1.
- The dead no-JS link in self-contained pages: candidate row "Self-contained no-JS link".
- Issue #7: the text it names is gone from `example.qmd`. `/milestone` triages it.

## Acceptance criteria

- [ ] AC1: When PDF.js `getDocument` rejects for a cross-origin PDF whose server sends no
      `Access-Control-Allow-Origin` header, or for an HTTP 404, the embed shows the text "This PDF cannot be shown
      here." and a link with the text "Open the PDF" whose `href` resolves to the same absolute URL as the embed's
      `data-src` and whose `target` is `_blank`, and it holds no "Download PDF file." link. Shown by
      `node tests/render_check.mjs example.html --remote blocked --expect-native 1 --expect-pdfjs 0 --expect-failed 10`
      and the same line with `--remote missing`, each with `--device iphone` and with `--device android`, and by
      `node tests/render_check.mjs revealjs_test.html --remote blocked --device iphone --expect-native 1 --expect-pdfjs 0 --expect-failed 2`,
      each exiting 0. `--expect-failed` counts embeds in exactly that state.
- [ ] AC2: A cross-origin PDF whose server sends `Access-Control-Allow-Origin: *` renders in the PDF.js viewer:
      `node tests/render_check.mjs example.html --remote cors --expect-native 1 --expect-pdfjs 10 --expect-pages 2 --expect-failed 0`
      exits 0 with `--device iphone` and with `--device android`.
- [ ] AC3: On desktop, `renderer=auto` still picks the native viewer for a cross-origin PDF:
      `node tests/render_check.mjs example.html --remote blocked --expect-native 9 --expect-pdfjs 0 --expect-failed 2`
      exits 0 with no `--device`, with `--device mac-safari`, and with `--device windows-touch`.
- [ ] AC4: Safari in the iOS simulators shows AC1's state for a cross-origin PDF whose server sends no
      `Access-Control-Allow-Origin` header: `node tests/ios_check.mjs --device "embedpdf iPhone" --remote blocked`
      and the same with `--device "embedpdf iPad"` exit 0 only when each of the 10 embeds of `example.html` not set
      to `renderer=native` shows AC1's message and link and holds no "Download PDF file." link.
- [ ] AC5: README "Known limitations" and a new `example.qmd` section say that on a page that is not
      self-contained, an embed that uses PDF.js (iPhone, iPad, Android, or `renderer=pdfjs`) needs the other site
      to allow the read with an `Access-Control-Allow-Origin` header, that the checks used only the value `*`,
      that without the header the reader sees AC1's message and link, and that putting the PDF in the Quarto
      project avoids this. They say that Android was checked by emulation in Chromium, not on a device. Each claim
      about a named site's headers names the URL probed, the header value seen, and the date of the `curl -I` run.
      `quarto render` completes with no errors.
- [ ] AC6: The version is 1.1.1 in `_extension.yml` and in the `add_html_dependency` call in `embedpdf.lua`,
      `pandoc lua tests/test_shortcode.lua` prints `0 failed`, and every `node tests/render_check.mjs` and
      `node tests/ios_check.mjs` line in CLAUDE.md "Verify before finishing" at commit `a093bb9` exits 0.

## Coverage

- AC1 → T1, T2
- AC2 → T1, T2
- AC3 → T1, T2
- AC4 → T3
- AC5 → T4
- AC6 → T2

## Tasks

- [x] T1: In `tests/render_check.mjs` add `--remote blocked|cors|missing`: a second `serveDocs` server on another
      port serves `docs/` with no `Access-Control-Allow-Origin` header, with `*`, or as 404 for every PDF, and a
      `transformHtml` points each embed's `data-src`, fallback link, and `button` link at it. Add `--expect-failed <n>`
      (AC1's state, href compared as absolute URLs) and count failed embeds so that "no embed was hydrated" does not
      fire on them. Add an `android` device (Android Chrome user agent, `pdfViewerEnabled` false, stated as not
      measured). Run the AC1 lines against the v1.1.0 viewer and see them fail, and run AC2 and AC3 to see the
      server modes work.
- [x] T2: In `embedpdf-viewer.js`, on a `getDocument` rejection replace the embed's content with the message and the
      link (`target="_blank"`, `rel="noopener"`), and log the error. Style it in `embedpdf.css`. Bump the version to
      1.1.1 in both places. `quarto render`, then run the AC1 to AC3 lines and the AC6 lines.
- [x] T3: In `tests/ios_check.mjs` add `--remote blocked` (a second server on its own port, the same rewrite), and a
      probe report per embed of AC1's state. Run it with `--plant` style proof: against the v1.1.0 viewer it fails.
      Run the AC4 lines.
- [x] T4: Run `curl -I` on each site the docs name (for example GitHub Pages, nbviewer.org). Write the README
      "Known limitations" line and the `example.qmd` section (code shown, no live remote embed). Add the AC1 to AC4
      lines to CLAUDE.md "Verify before finishing" and the failure state to DESIGN.md Architecture. `quarto render`.

## Work log

- 2026-10-18: created by /milestone-plan.
- 2026-10-18: tier check: not run — work named at the question set.
- 2026-10-18: question set: what to work on — remote PDFs on phones (inbox sweep: #2, #8 use nbviewer.org, which sends no `Access-Control-Allow-Origin`, observed by `curl -I`).
- 2026-10-18: question set: what a reader sees on failure — a message and a link that opens the PDF in a new tab.
- 2026-10-18: question set: assign the operator to #2 and #8 — yes (viewerPermission ADMIN; neither had an assignee).
- 2026-10-18: plan gate chose a message plus open link over falling back to Safari's own viewer on iPhone and iPad because it is the same on every phone and adds no case to check; falsified by readers on iOS who cannot open the linked PDF.
- 2026-10-18: plan gate chose a second local server on another port over a test page with a hard-coded remote URL because it needs no network and can switch the header; falsified by a browser that treats two ports of 127.0.0.1 as one origin.
- 2026-10-18: collision check: no candidate, archive entry, or D-entry covers remote PDFs; checker-regress shape not hit (render_check and ios_check check the shipped viewer, not tracking files).
- 2026-10-18: inbox sweep: #2 and #8 taken as `closes`; #7 has no overlap (its text is gone from example.qmd); 0 open PRs.
- 2026-10-18: lessons harvest: M002's RevealJS lesson applies to the revealjs_test.html line in AC1 (render_check already steps slides).
- 2026-10-18: version 1.1.1 chosen: no option or default changes (GP2).
- 2026-10-18: criteria audit (full mode, fresh Opus reader): 11 findings, all fixed by narrowing — AC1 trigger limited to CORS and 404 with counts and page named, a RevealJS line added, href compared as absolute URLs; IP1 gap recorded as D-004; AC2 page and `--expect-pages 2` named; AC3 reworded to the renderer choice with counts; AC4 states what ios_check checks; AC5 limited to non-self-contained pages, the `*` header value, and emulated Android; AC6 fixed to the CLAUDE.md lines at `a093bb9`.
- 2026-10-18: assigned jmgirard to #2 and #8 (`gh issue edit --add-assignee @me`; re-read shows jmgirard on both).
- 2026-10-18: implement started on m003-remote-pdfs-on-phones; Chromium 155 via `CHROME_PATH=/Applications/Chromium.app/Contents/MacOS/Chromium` (no Google Chrome installed).
- 2026-10-18: T1 done: `serveRemote`/`pointPdfsAt` in `serve_docs.mjs` (shared with ios_check); render_check gains `--remote`, `--expect-failed`, an `android` device, and console errors in its JSON. `missing` mode sends `Access-Control-Allow-Origin: *` on its 404 so the 404 is what PDF.js meets (console: ResponseException; `blocked` console: the CORS error, UnknownErrorException). Against v1.1.0 the AC1 iphone line and the AC3 line fail on `--expect-failed` (0 found); the AC2 iphone and android lines pass (20/20 canvases inked).
- 2026-10-18: T2 done: `showFailure()` in the viewer; the try block covers the PDF.js import, the inlined Blob read, `getDocument`, and `getPage(1)`, so the out-of-scope causes take the same path unchecked. CSS `.embedpdf-failed`. v1.1.1. `quarto render` clean; shortcode tests 40 passed, 0 failed. AC1 (5 lines), AC2 (2), AC3 (3) exit 0 in Chromium 155; planted `target="_self"` makes the AC1 iphone line exit 1 (malformed + 0 failed). All 21 render_check lines and 4 ios_check lines of CLAUDE.md at a093bb9 exit 0 (iOS 27.0 iPhone and iPad).
- 2026-10-18: T3 done: ios_check `--remote blocked` (second server via `serveRemote`, probe reports AC1's state from text and links). AC4 lines exit 0 on iOS 27.0 "embedpdf iPhone" and "embedpdf iPad" (10/10 embeds); with the v1.1.0 viewer swapped into docs/ the iPhone line exits 1 (10 embeds not in the state, fallback link present). Safari's error is only "UnknownErrorException: Load failed".
- 2026-10-18: failure identity in Safari, by scratch pages (not committed): PDF.js `getDocument` on a cross-port PDF succeeds with `Access-Control-Allow-Origin: *` and fails with no header (both with no `<object>` on the page), so AC4's failure is the header.
- 2026-10-18: found in Safari (iOS 27.0 iPhone simulator): once an `<object>` on the page loads a cross-origin PDF, a PDF.js `getDocument` of the same URL fails with "Load failed" even with `Access-Control-Allow-Origin: *` (`disableStream`/`disableRange` makes a new URL and loads). So an `ios_check --remote cors` mode fails on example.html, whose `renderer=native` embed shows the same PDF; the mode was dropped. The fix goes to candidate row "Safari shared remote URL"; T4's docs state the limit.
- 2026-10-18: T4 done: `curl -I` 2026-10-18: jmgirard.github.io/embedpdf/sample.pdf sends `access-control-allow-origin: *`; nbviewer.org/github/jhelvy/cv/blob/main/cv-jph.pdf sends none. README "Known limitations" bullet, `example.qmd` "PDFs on Another Site" section (code only, no live embed; example.html still has 11 embeds), CLAUDE.md remote check block and Safari gotcha, DESIGN.md Architecture and Known issues. `quarto render` exit 0. The simple-english lint hook flags README.md and CLAUDE.md; the added text was rewritten until the counts equal those of the files before this task (10 and 36).
- 2026-10-18: claim audit: 55 claims read, 5 corrected — embedpdf-viewer.js (stale fallback comment), README.md (`*` stated as required; which browsers use PDF.js; Safari finding read as seen on both simulators), example.qmd (`*` as required; desktop display not shown by a test); also a gap fixed in render_check: `--remote` now fails unless every embed's data-src is on the remote server. 10 claims unverifiable from code (dated observations and simulator findings).
- 2026-10-18: substantive amendment: AC5 — "only if that site sends `Access-Control-Allow-Origin: *`" became "needs the other site to allow the read with an `Access-Control-Allow-Origin` header, that the checks used only the value `*`"; "emulation in Chrome" became "in Chromium"; site header claims name URL, value, and date. Reason: the claim audit found `*` stated as required when any value allowing the page's origin works. Deliverable unchanged (docs wording only), so no stop.
- 2026-10-18: re-audit: AC5 (full) — first reader: header-claim clause too wide (one URL stands for a host) and "Chrome" vs Chromium; both fixed in the wording above.
- 2026-10-18: re-audit: AC5 (full) — re-entry reader: no finding on reachability, bounded promise, instrument, proportionality; ambiguities (each doc or both; "AC1's message"; no value when no header) and an iOS-simulator disclosure; the AC wording is kept and the docs meet each point (both docs carry every claim, quote the message, say nbviewer sent no header, and say iPhone and iPad were checked only in iOS 27.0 simulators).
- 2026-10-18: after the fixes: `quarto render` exit 0; the 10 AC1–AC3 lines and the plain example.html desktop line exit 0; planted case (`--remote cors` on selfcontained_test.html, whose data: srcs are not rewritten) exits 1 on the new remote-server check. Status set to review.

## Decisions

## Review
