# M007: Remote check gaps

- **Status:** review
- **Priority:** high
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** IP2
- **Resolves:** —
- **Surface tier:** internal — check scripts and their server helpers in tests/, which no extension user runs
- **Branch/PR:** m007-remote-check-gaps

## Goal

Close the gaps that the M003 review found in the remote-PDF checks of `tests/serve_docs.mjs`, `tests/render_check.mjs`, and `tests/ios_check.mjs`.

## Scope

**In:**
- `pointPdfsAt` resolves PDF paths against the page's own folder, keeps a `?query` or `#fragment`, and rewrites only
  the shortcode's attributes: the `data-src` of an embed and the `href` of a link with `download`.
- Both scripts refuse `--remote` on a page whose embeds keep a PDF URL that the rewrite cannot move, such as the
  `data:` URLs of a self-contained page, with exit 2 and a short message.
- `serveRemote` answers byte ranges as `serveDocs` does, and answers OPTIONS.
- A new `--missing-pdfs` flag in both scripts: the page's own server answers 404 for each PDF, and the check fails
  unless each embed shows the load-failure state for a PDF on its own origin.
- CLAUDE.md "Verify before finishing" lines for the new flag.

**Out:**
- Single-quoted or unquoted attributes in hand-written HTML → candidate row "Remote rewrite quoting".
- A PDF over 128 KB that makes PDF.js load by ranges in a browser → candidate row "Large PDF range check".
- Safari failing a PDF.js fetch of a URL that an `<object>` already loaded → candidate row "Safari shared remote URL".
- Fixed waits, plant exits, and the CSP question in the ink check → candidate row "Ink check follow-ups".
- No change to `embedpdf-viewer.js`, `embedpdf.css`, or `embedpdf.lua`, so no extension version bump.

## Acceptance criteria

- [ ] AC1: For each of these inputs, `pointPdfsAt(html, base, page)` in `tests/serve_docs.mjs` returns the stated
      result: a double-quoted `data-src="x.pdf"` on a `<div class="embedpdf">` of a page at the docs/ root becomes
      `base` + `x.pdf`; the same on a page in a subfolder `sub/p.html` becomes `base` + `sub/x.pdf`; `x.pdf?x=1` and
      `x.pdf#page=2` keep their `?x=1` and `#page=2`; an `<a href="x.pdf" download="">` is rewritten; an absolute
      `https:` URL and an `<a href="x.pdf">` with no `download` attribute stay as they are. Evidence:
      `node tests/helpers_test.mjs` prints `N passed, 0 failed` with these cases.
- [ ] AC2: `render_check.mjs --remote <mode>` and `ios_check.mjs --remote blocked` exit 2 before they open a browser or
      a simulator when the page's HTML under docs/, after `pointPdfsAt`, still has an embed `data-src` (found as AC1
      finds them) that is not on the remote server. The message names the page and gives each such value by at most
      its first 40 characters. Evidence: one run of each script with `--remote blocked` on `selfcontained_test.html`
      exits 2 with that message, and each `--remote` command line in the CLAUDE.md code blocks, plus the
      `--device mac-safari` and `--device windows-touch` runs of the desktop line that the text names, exits 0.
- [ ] AC3: For `bytes=0-99`, `bytes=100-`, and a range whose start is past the end, `serveRemote` in modes `blocked`
      and `cors` answers 206 with bytes 0 to 99, 206 with bytes 100 to the end, and 416; in mode `missing` it answers
      404. For an OPTIONS request it answers 204: in modes `cors` and `missing` with `Access-Control-Allow-Origin: *`
      and an `Access-Control-Allow-Headers` that includes `Range`, and in mode `blocked` with no `Access-Control-`
      header. Evidence: `node tests/helpers_test.mjs` prints `N passed, 0 failed` with these cases.
- [ ] AC4: With `missingPdfs: true`, `serveDocs` answers 404 for `/sample.pdf`, `/files/sample%20copy.pdf`, and
      `/sample.pdf?x=1`, and 200 for `/example.html` (helpers_test cases). With the new flag `--missing-pdfs`,
      `render_check.mjs` serves the page that way and fails unless each embed in the load-failure state has a
      `data-src` on the page's own origin and the console has the viewer's `embedpdf: failed to render <that URL>`
      line naming `ResponseException`. These lines exit 0:
      `node tests/render_check.mjs example.html --missing-pdfs --device iphone --expect-native 1 --expect-pdfjs 0 --expect-failed 10`,
      the same with `--device android`, and
      `node tests/render_check.mjs example.html --missing-pdfs --expect-native 9 --expect-pdfjs 0 --expect-failed 2`.
- [ ] AC5: `ios_check.mjs --missing-pdfs` serves the page with `missingPdfs: true` and fails unless each embed not set
      to `renderer=native` is in the load-failure state with a URL on the page's own origin and the page's errors hold
      the viewer's `embedpdf: failed to render <that URL>` line. `node tests/ios_check.mjs --device "embedpdf iPhone" --missing-pdfs`
      and the same with `--device "embedpdf iPad"` exit 0 for `example.html`.
- [ ] AC6: `node tests/helpers_test.mjs` prints `N passed, 0 failed`. Each `node tests/...` command line in the code
      blocks of CLAUDE.md "Verify before finishing" exits 0, and so does each extra run that the section's text names
      (the `--alone http` reruns, and the `mac-safari`, `windows-touch`, and `ipad` variants), including the
      `--missing-pdfs` lines this milestone adds there.

## Coverage

- AC1 → T1
- AC2 → T2
- AC3 → T3
- AC4 → T4
- AC5 → T5
- AC6 → T6

## Tasks

- [x] T1: `tests/serve_docs.mjs` `pointPdfsAt(html, base, page)`: match the double-quoted `data-src` of a `<div>`
      whose class holds `embedpdf` (Quarto may put `role="img"` before `class`) and the double-quoted `href` of an
      `<a>` with `download`; resolve against `new URL(dirname(page) + "/", base)`; keep `?`/`#`. Pass the page path
      from `render_check.mjs` (`target`) and `ios_check.mjs` (`pagePath`). Add the AC1 cases to
      `tests/helpers_test.mjs`, and update the header comments.
- [x] T2: A shared helper that lists the embed `data-src` values left off the remote server; both scripts call it on
      the page read from docs/ right after the remote server starts, and exit 2 with the AC2 message. Add helper
      cases (a self-contained page, a normal page with none left). Run both scripts on `selfcontained_test.html`.
- [x] T3: `serveRemote` sends file bodies through `sendData` (ranges) and answers OPTIONS with 204 and the mode's CORS
      headers. Add the AC3 cases to `tests/helpers_test.mjs`.
- [x] T4: `serveDocs({ missingPdfs })` answers 404 for a path ending in `.pdf`. `render_check.mjs --missing-pdfs`:
      needs `--expect-failed`, cannot be combined with `--remote` or `--alone`, checks the own-origin URL and the
      `ResponseException` line. Add the AC4 helper cases. Before trusting the new check, see it fail once on a
      changed expectation (for example a wrong error kind), then restore it. Run the AC4 lines and the
      `mac-safari` and `windows-touch` variants of the desktop line.
- [x] T5: `ios_check.mjs --missing-pdfs`, with the same exclusions as `--remote` (`--alone yes`, `--plant`,
      `--expect-text`, `--expect-name`). Read the error Safari logs for a 404 on the first run and record it in the
      work log. Run on both simulators.
- [x] T6: Add the `--missing-pdfs` lines (render_check iPhone, Android, desktop and its two device variants;
      ios_check iPhone and iPad) to CLAUDE.md "Verify before finishing" with one sentence on what the flag does. Run
      `node tests/helpers_test.mjs` and every check line the section lists.

## Work log

- 2026-10-18: created by /milestone-plan.
- 2026-10-18: tier check: milestone — changes to three check scripts across several gaps, with design choices on the rewrite and the 404 check.
- 2026-10-18: absorbs candidate row "Remote check gaps" in full, except single-quoted and unquoted attributes (new row "Remote rewrite quoting"). Rows "Large PDF range check", "Safari shared remote URL", and "Ink check follow-ups" stay distinct; T3 gives the first a remote server that answers ranges.
- 2026-10-18: checker-regress shape judged not to apply: these checks verify the shipped extension's rendering in browsers, not repo-internal tracking artifacts.
- 2026-10-18: inbox sweep: 0 open issues, 0 open PRs.
- 2026-10-18: lessons used: M003 (read the viewer's "failed to render" line, Chromium logs ResponseException for a 404), M006 (PDF.js asks for ranges only above 128 KB, so T3 is checked in Node, not in a browser).
- 2026-10-18: criteria audit (reduced mode, Opus fresh reader): AC1, AC3, AC4 promised more than their tests sample and AC1, AC3 described the test file; narrowed to the named inputs. AC2, AC6 named CLAUDE.md lines vaguely; now name the code-block lines and the extra runs the text names. AC5 inherits the AC4 fix.
- 2026-10-18: question set: run the 404 check in Chrome and in the iOS simulators — Chrome and iOS.
- 2026-10-18: question set: rewrite only the shortcode's double-quoted form, or every quoting form — shortcode form.
- 2026-10-18: plan gate chose the shortcode's double-quoted form over every quoting form because the shortcode and Quarto write only double quotes; falsified by a shortcode or Quarto page whose embed attribute uses another form.
- 2026-10-18: plan chose a text rewrite of the served HTML over puppeteer request interception because ios_check drives Safari with no puppeteer and both scripts share `pointPdfsAt`; falsified by a shortcode embed that the rewrite misses and interception would move.
- 2026-10-18: implement started on branch m007-remote-check-gaps. Google Chrome is not installed here, so render_check runs use `CHROME_PATH=/Applications/Chromium.app/Contents/MacOS/Chromium`.
- 2026-10-18: T1 done: `pointPdfsAt(html, base, page)` matches `<div>` start tags whose class holds `embedpdf` and `<a>` tags with a `download` attribute name, resolves against the page URL, keeps `?`/`#`; 13 helper cases (50 passed, 0 failed); a planted root-relative resolve failed the subfolder case; the 10 Chromium `--remote` runs exit 0.
- 2026-10-18: T2 done: `embedSrcsOffRemote(html, base, page)` in serve_docs.mjs; both scripts exit 2 on `selfcontained_test.html --remote blocked` with the three `data:` values cut to 40 characters, before Chromium or the simulator opens; 5 helper cases (55 passed); example.html and revealjs_test.html `--remote blocked` on iphone still exit 0.
- 2026-10-18: T3 done: `serveRemote` sends through `sendData`, answers OPTIONS 204 (cors and missing allow GET/HEAD/OPTIONS and `Range`), and in cors and missing modes adds `Access-Control-Expose-Headers: Accept-Ranges, Content-Range, Content-Length` so a cross-origin reader sees the range headers (implement choice, not in AC3); 15 helper cases (70 passed); planting the old whole-file send failed 6; 5 Chromium `--remote` lines exit 0.
- 2026-10-18: T4 done: `serveDocs({ missingPdfs })` 404s a path ending in `.pdf` (5 helper cases, 75 passed); render_check `--missing-pdfs` is a flag with no value (new `BOOL_FLAGS`), needs `--expect-failed`, refuses `--remote`, `--alone`, and a URL (each exits 2). The viewer's "failed to render" line names the `data-src` as written (`sample.pdf`), not the absolute URL, so each failed entry now carries `src` and the check matches on it. A planted wrong kind (`UnknownErrorException`) failed the run; the 3 AC4 lines and the mac-safari and windows-touch variants exit 0, and `--remote missing --device iphone` still exits 0.
- 2026-10-18: T5 done: ios_check parses `--missing-pdfs` as a flag with no value and refuses it with `--remote`, `--alone yes`, `--plant`, `--expect-text`, `--expect-name` (exit 2). Safari in the iOS 27.0 iPhone simulator logs `embedpdf: failed to render sample.pdf ResponseException: Unexpected server response (404) while retrieving PDF "<url>".`, so the check also requires `ResponseException`. iPhone and iPad exit 0; a planted wrong kind ("Load failed") failed all 10 embeds on the iPhone.
- 2026-10-18: T6 done: CLAUDE.md "Verify before finishing" gains a `--missing-pdfs` paragraph and 5 lines. Verify slot run: helpers_test 75 passed, 0 failed; all 34 code-block check lines plus 14 extra runs the text names (4 `--alone http` reruns, 6 self-contained device variants, 4 desktop variants of the remote and missing lines) exit 0, in Chromium and the iOS 27.0 simulators.
- 2026-10-18: the simple-english lint hook reports 37 hits in CLAUDE.md; all 37 were there before this branch (the same count on main), and the added paragraph has none, so the rest of the file was left as it is.
- 2026-10-18: claim audit: not owed — internal tier.
- 2026-10-18: implement complete; status review.

## Decisions

## Review
