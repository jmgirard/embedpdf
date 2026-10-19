# M013: Large PDF range check

- **Status:** review
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** IP1
- **Resolves:** —
- **Surface tier:** internal — test scripts, a test fixture, and a test page that no user of the extension relies on
- **Branch/PR:** m013-large-pdf-range-check

## Goal

Add a test PDF over 128 KB and check lines that pass only when PDF.js loads it by byte ranges, in Chromium and in Safari in the iOS simulators.

## Scope

**In:** `files/large.pdf` and its copy `files/large-2.pdf`, built from seven
copies of `sample.pdf`. A test page `large_test.qmd` with two embeds. A slow
whole-file answer and a count of HTTP 206 answers in `tests/serve_docs.mjs`.
An `--expect-ranges` flag and a `--plant noranges` plant in
`tests/render_check.mjs` and `tests/ios_check.mjs`. New check lines and text
in CLAUDE.md.

Background. PDF.js 6.1.200 asks for byte ranges only when Content-Length is
above 131,072 bytes (2 × 65,536) and the server sends `Accept-Ranges: bytes`
(LESSONS, M006). A plan probe ran on 2026-10-19 in Chromium 155 against
`serveDocs`. With a 171 KB PDF, PDF.js got the whole file in one streamed
answer and asked for no range in 2 of 3 runs. With a 978 KB PDF, it asked for
no range in 3 of 3 runs. When the server sent the whole-file answer slowly
(4 KB every 200 ms), all 6 runs got HTTP 206 answers.

**Out:**
- A fix in the viewer. If a check finds that range loading fails, the run
  stops for the user, and the fix goes to `/hotfix` or a candidate row.
- Self-contained pages. Their PDFs are `data:` addresses, which PDF.js never
  loads by ranges.
- The fixed waits of the ink check on a long PDF stay in the candidate row
  "Ink check follow-ups".
- `ios_check.mjs --remote cors`. Safari fails that case for another reason,
  which the candidate row "Safari shared remote URL" holds.
- Desktop Safari (`safari_check.mjs`). Its `auto` embeds use the native
  viewer, and the iOS simulator lines run Safari's PDF.js path.
- A text check of the large PDF. Its pages repeat the text of `sample.pdf`,
  and `--expect-text` needs a phrase that is on one page only. The candidate
  row "Large PDF text check" holds it.
- Byte ranges on GitHub Pages or a real phone. Only a person can check that,
  and CLAUDE.md "Still unverified" records it (AC5).

## Acceptance criteria

- [x] AC1: `files/large.pdf` is a PDF of 14 pages and over 131,072 bytes
      (`pdfinfo`, `wc -c`). It is made of seven copies of `sample.pdf`, and
      `files/large-2.pdf` is a byte copy of it (`cmp`). `quarto render`
      completes with no errors, and `docs/large_test.html` holds two embeds:
      `files/large.pdf` with `renderer=pdfjs`, and `files/large-2.pdf` with
      `renderer=auto`.
- [x] AC2: With `--expect-ranges`, the PDFs' server sends the whole-file
      answer for `files/large.pdf` and `files/large-2.pdf` slowly. A run of
      `tests/render_check.mjs` or `tests/ios_check.mjs` then fails unless
      that server answered at least one HTTP 206 request for each PDF.js
      embed's address. That server is the page's server, or the second
      server for render_check `--remote cors`. With `--plant noranges`, a run
      of each script on `large_test.html` exits non-zero and names each
      PDF.js embed's address.
- [x] AC3: Each run below on `large_test.html` exits 0 with
      `--expect-ranges`, `--expect-pages 14`, and `--expect-name
      "large.pdf|large-2.pdf"`. The render_check runs are plain Chrome
      (`--expect-native 1 --expect-pdfjs 1`), `--device iphone`, and
      `--device android` (both `--expect-native 0 --expect-pdfjs 2`). They
      also include `--remote cors` with each of those two devices. The
      ios_check runs use the "embedpdf iPhone" and "embedpdf iPad"
      simulators (`--expect-embeds 2`).
- [x] AC4: `node tests/helpers_test.mjs` prints `N passed, 0 failed`. Its
      cases show three things. With the slow option, `serveDocs` and
      `serveRemote` send a whole-file answer in pieces. They count HTTP 206
      answers per address. Without the new options, they send each file
      whole, with the same headers as before.
- [x] AC5: CLAUDE.md "Verify before finishing" holds each run that AC3 names
      as a fenced line. It says what `--expect-ranges` and `--plant noranges`
      do and how `files/large.pdf` was made. Its "Still unverified" list says
      that byte-range loading is not checked on GitHub Pages or on a real
      phone.

## Coverage

- AC1 → T1
- AC2 → T2, T3, T4
- AC3 → T3, T4
- AC4 → T2, T6
- AC5 → T5

## Tasks

- [x] T1: Build `files/large.pdf` with `pdfunite` from seven copies of
      `sample.pdf`, and copy it to `files/large-2.pdf`. Add `large_test.qmd`
      with the two embeds and both files in `resources:`. Run `quarto render`.
- [x] T2: In `tests/serve_docs.mjs`, give `serveDocs` and `serveRemote` a slow
      whole-file option, a count of 206 answers per address, and a no-ranges
      mode for the plant. The no-ranges mode answers every range request with
      the whole file (HTTP 200). Add the helpers_test cases of AC4.
- [x] T3: Add `--expect-ranges` and `--plant noranges` to render_check, with
      header text. Run the render_check lines of AC3 and one plant run.
- [x] T4: Add `--expect-ranges` and `--plant noranges` to ios_check, with
      header text. Run the ios_check lines of AC3 and one plant run.
- [x] T5: Add the CLAUDE.md lines and text of AC5. Then run the verify slot
      for a `tests/serve_docs.mjs` change: every `render_check.mjs`,
      `ios_check.mjs`, `name_rule_test.mjs`, and `safari_check.mjs` line in
      CLAUDE.md's fenced blocks must exit 0.
- [x] T6: (review return 1) Add helpers_test cases in which `serveDocs` and
      `serveRemote` without the new options send `files/large.pdf` whole at
      once, with its Content-Type, Content-Length, and Accept-Ranges, and for
      remote cors its Access-Control- headers.

## Work log

- 2026-10-19: created by /milestone-plan.
- 2026-10-19: tier check: not run — work named at the question set.
- 2026-10-19: question set: which candidate to plan — "Large PDF range check".
- 2026-10-19: question set: where the big test PDF comes from — build it here from copies of sample.pdf.
- 2026-10-19: absorbed candidate row "Large PDF range check" in full. Sweep: M006 and M007 (archive) shipped the server's range answers; no D-entry overlaps; 0 open issues and 0 open PRs.
- 2026-10-19: checker-regress shape not hit: render_check and ios_check check the shipped viewer, not repo-internal files.
- 2026-10-19: lessons harvested: M006 (PDF.js range threshold), M010 (first simctl openurl can time out), M011 (run puppeteer probes from the repo root).
- 2026-10-19: criteria audit (reduced mode) ran after the question set, which chose the work. 6 findings, all fixed by narrowing: AC2 slow answer named to the two files and remote to render_check `--remote cors`; AC2 plant mechanism moved to T2 and plant promise cut to a non-zero exit naming each address; AC3 `--expect-name` given its value; AC4 cut to the helpers_test cases, the CLAUDE.md sweep moved to T5.
- 2026-10-19: plan gate chose a slow whole-file answer over a bigger PDF because a 978 KB PDF got no range request in 3 of 3 probe runs; falsified by a run with the slow answer in which PDF.js asks for no range.
- 2026-10-19: plan gate chose counting 206 answers in the server over puppeteer response events because ios_check has no puppeteer page; falsified by a counted 206 that no PDF.js request asked for.
- 2026-10-19: plan gate chose a second file for the `auto` embed over sorting requests by type because on desktop the native viewer may ask for ranges of the same address; falsified by a desktop run in which the native embed sends no request for its PDF.

- 2026-10-19: started implement on branch m013-large-pdf-range-check.
- 2026-10-19: T1 built files/large.pdf (14 pages, 171,198 bytes by `wc -c`) and files/large-2.pdf, added large_test.qmd; `quarto render` completes (only the known 100% URI warning).
- 2026-10-19: substantive amendment: AC3 drops `--expect-text`, because the copies of sample.pdf repeat its text and the text check needs a phrase on one page only; new Out item and candidate row "Large PDF text check".
- 2026-10-19: re-audit: AC3 (reduced) — nothing.
- 2026-10-19: T2 chose options `slowWhole` and `noRanges` on serveDocs and serveRemote, a `server.rangeCounts` Map keyed by request path as sent, and an exported `SLOW_ABOVE` (131,072); helpers_test 106 passed, 0 failed. Plants: always sending whole failed the 2 "sent in pieces" cases; counting 200s in place of 206s failed 5 count cases. The browser lines of the verify slot run at T5.
- 2026-10-19: T3 found the slow answer also slowed Bootstrap's CSS and pdf.min.mjs (both over 131,072 bytes), so `networkidle0` timed out; `slowWhole` now applies to `.pdf` files only, with a helpers_test case that failed (22 s) without that rule; helpers_test 109 passed, 0 failed.
- 2026-10-19: T3 render_check `--expect-ranges` (a flag with no value) and `--plant noranges`: the 5 AC3 render_check lines exit 0 with 3 range answers per PDF.js embed; plants on plain, iphone, and `--remote cors` iphone exit 1 naming each PDF.js address, every page still inked.
- 2026-10-19: T4 ios_check `--expect-ranges` and `--plant noranges` (refused with --remote, --missing-pdfs, --alone yes; the report gains "ranges"): "embedpdf iPhone" and "embedpdf iPad" (iOS 27.0) exit 0 with 3 range answers per embed; the iPhone plant exits 1 naming both addresses, with no ink failure.
- 2026-10-19: T5 CLAUDE.md gains the 7 large_test.html lines, a paragraph on `--expect-ranges`, `--plant noranges`, and how files/large.pdf was made, a key-files mention, and a "Still unverified" entry. All 57 `node tests/…` lines in CLAUDE.md's fenced blocks (helpers_test, render_check, ios_check, name_rule_test, safari_check) exited 0 in one run, Chromium 155 via CHROME_PATH, no retries.
- 2026-10-19: claim audit: not owed — internal tier.
- 2026-10-19: implement done; status review.
- 2026-10-19: review return 1: AC4 — no helpers_test case shows `serveRemote` without the new options sending a file whole, and no whole-file case checks the headers (Content-Type, Content-Length, Accept-Ranges, and for remote cors the Access-Control- headers); add those cases.
- 2026-10-19: added T6 for review return 1 (minor amendment); Coverage AC4 → T2, T6.
- 2026-10-19: T6 helpers_test default cases for serveDocs and serveRemote cors (large.pdf whole within 1 s; Content-Type, Content-Length, Accept-Ranges, Cache-Control; Access-Control- headers for remote), replacing the docs-only case; 113 passed, 0 failed. Plant: a `slowWhole = true` default in serveRemote failed the remote case (8,437 ms). serve_docs.mjs is unchanged at the end, so no browser line reruns here.
- 2026-10-19: implement done; status review.

## Decisions

## Review

Pass 1 (2026-10-19) found AC4 short (no remote whole-file case, no header checks) and returned (review return 1, T6). Pass 2 below, on head 98f3a8a; main not moved (c878094). Browser runs: Chromium 155 via CHROME_PATH; iOS 27.0 simulators.

- AC1 evidence: `pdfinfo files/large.pdf` Pages 14; `wc -c` 171198 (> 131072); `cmp files/large.pdf files/large-2.pdf` same; `pdftotext` of a fresh `pdfunite` of seven `sample.pdf` copies has the same md5 as `pdftotext files/large.pdf`; `quarto render` exit 0, only the known `files/100%.pdf` URI warning, docs/ unchanged after it; docs/large_test.html holds `data-src="files/large.pdf" data-renderer="pdfjs"` and `data-src="files/large-2.pdf" data-renderer="auto"`.
- AC2 evidence: helpers_test (113 passed, 0 failed) shows `slowWhole` sending `files/large.pdf` in pieces from `serveDocs` and `serveRemote` cors (at most 12,288 bytes in 500 ms), and render_check/ios_check pass `slowWhole` with `--expect-ranges` (render_check.mjs rangeOpts, ios_check.mjs serveDocs call). The 7 AC3 runs print 3 counted 206 answers per PDF.js embed address, on the remote server for the two `--remote cors` runs. `--plant noranges`: render_check plain exit 1 "no byte-range request (HTTP 206) answered for …/files/large.pdf"; render_check `--remote cors --device iphone` exit 1 naming `/files/large.pdf` and `/files/large-2.pdf`; ios_check "embedpdf iPhone" exit 1 with failures "embed 1 … /files/large.pdf" and "embed 2 … /files/large-2.pdf". No ink or page failure in the plant runs.
- AC3 evidence: each of the 7 lines exit 0 with `--expect-ranges --expect-pages 14 --expect-name "large.pdf|large-2.pdf"`: render_check plain (`--expect-native 1 --expect-pdfjs 1`), `--device iphone`, `--device android`, `--remote cors --device iphone`, `--remote cors --device android` (each `--expect-native 0 --expect-pdfjs 2`); ios_check "embedpdf iPhone" and "embedpdf iPad" (`--expect-embeds 2`), report `ranges` 3 and 3. No retry.
- AC4 evidence: `node tests/helpers_test.mjs` prints "113 passed, 0 failed". Cases: "docs slowWhole: large.pdf is sent in pieces" and "remote cors slowWhole: …" (pieces); "server: rangeCounts counts the three 206 answers", "docs: rangeCounts counts 206 answers per path, %20 as sent", "remote cors: …" (count per address); "docs default: large.pdf comes whole within 1 s", "docs default: whole-file headers", "remote cors default: …" and "remote cors default: Access-Control- headers" (no new options), with the earlier range, 416, and OPTIONS cases unchanged.
- AC5 evidence: CLAUDE.md lines 204-210 are the 7 AC3 runs as fenced lines (the same flags as the runs above); lines 189-201 say what `--expect-ranges` and `--plant noranges` do and that `files/large.pdf` is seven copies of `sample.pdf` joined with `pdfunite`; "Still unverified" line 285 says byte-range loading is checked only on the local test servers, not on GitHub Pages or a real phone.
- Consistency gate: `cairn_validate.py` all checks passed; the generic profile's consistency-gate names no toolchain checks; no principle changed, so no `cairn_impact` run.
- spawned: diff-bug, blame-history, prior-review, ripple
- diff-bug #1: `--expect-ranges` on a page whose PDFs are all at or under 131,072 bytes fails as if the viewer were broken, not as a bad argument — fix now (exit 2 naming the size), fixed cc80dbf.
- diff-bug #2: the 206 count is per address, so a native embed's range requests at the same address can pass a PDF.js embed — fix now (exit 2 when a PDF.js embed's address is also another embed's), fixed cc80dbf.
- diff-bug #3: a counted 206 does not prove PDF.js asked for it — reject (false once #2 is fixed: only the PDF.js embed loads its address, and the download links are not clicked).
- diff-bug #4: `--plant noranges` has no "found nothing to plant in" exit — fix now (exit 2 with no PDF.js embed; a small or shared PDF exits 2 by #1 and #2), fixed cc80dbf.
- diff-bug #5: the "sent in pieces" bound of 3 pieces can fail when the event loop runs late — fix now (bound is under half the file), fixed cc80dbf.
- diff-bug #6: helpers_test reads docs/files/large.pdf and docs/large_test_files at load and crashes if they are missing — reject (false premise: docs/ is committed, and helpers_test already reads docs/ files at load).
- diff-bug #7: a HEAD request with `slowWhole` ends only after about 8.4 s — fix now (HEAD is answered at once; helpers_test case), fixed cc80dbf.
- diff-bug #8: the slow rule matches `.pdf` case-sensitively — fix now (case-insensitive), fixed cc80dbf.
- diff-bug #9: the race timer in `bytesIn500ms` is not cleared when the read wins — reject (style: it settles within 500 ms and changes no result).
- diff-bug #10: the slow writer ignores `res.write()` backpressure — reject (false as a defect: at most 42 pieces of 4096 bytes are buffered).
- prior-review #1: per-address counting lets one embed's 206 cover another at the same path, as in the row "Remote failure line count" — fix now (same fix as diff-bug #2), fixed cc80dbf.
- prior-review #2: `--plant noranges` never exits 2 for nothing to plant in — fix now (same fix as diff-bug #4), fixed cc80dbf.
- prior-review #3: a plant run might fail on ink timing rather than on the range check — reject (false: the 3 plant runs show only range failures, every page inked).
- prior-review #4: ios_check skips the range check for a stuck embed and render_check has no such gate — reject (false as a defect: a stuck embed already fails ios_check, and render_check has no stuck state).
- blame-history #1: a native embed's 206 answers at the same address can pass a PDF.js embed — fix now (same fix as diff-bug #2), fixed cc80dbf.
- blame-history #2: the slow answer also reaches the desktop native embed of large-2.pdf — reject (planned change: AC2 slows both files, and that run passes).
- blame-history #3: the 8.4 s slow answer is not measured against the scripts' waits — reject (false: the plant runs, where every PDF answer is slow, pass every ink and page check).
- blame-history #4: helpers_test aborts at load if docs/ lacks the new files — reject (false premise, as diff-bug #6).
- ripple #1: ROADMAP row "Large PDF range check" still says every test PDF is under 128 KB — reject (planned change: post-merge hygiene graduates and removes the row).
- After the fixes (cc80dbf): helpers_test 115 passed, 0 failed; all 57 `node tests/…` lines in CLAUDE.md's fenced blocks exit 0, the 7 AC3 lines among them; the 3 `--plant noranges` runs exit 1 naming each address. The guard exits 2 on name_test.html (render_check and "embedpdf iPhone") and example.html, naming the shared address and the 21,118-byte size.
