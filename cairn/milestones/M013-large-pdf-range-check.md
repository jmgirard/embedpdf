# M013: Large PDF range check

- **Status:** in-progress
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

- [ ] AC1: `files/large.pdf` is a PDF of 14 pages and over 131,072 bytes
      (`pdfinfo`, `wc -c`). It is made of seven copies of `sample.pdf`, and
      `files/large-2.pdf` is a byte copy of it (`cmp`). `quarto render`
      completes with no errors, and `docs/large_test.html` holds two embeds:
      `files/large.pdf` with `renderer=pdfjs`, and `files/large-2.pdf` with
      `renderer=auto`.
- [ ] AC2: With `--expect-ranges`, the PDFs' server sends the whole-file
      answer for `files/large.pdf` and `files/large-2.pdf` slowly. A run of
      `tests/render_check.mjs` or `tests/ios_check.mjs` then fails unless
      that server answered at least one HTTP 206 request for each PDF.js
      embed's address. That server is the page's server, or the second
      server for render_check `--remote cors`. With `--plant noranges`, a run
      of each script on `large_test.html` exits non-zero and names each
      PDF.js embed's address.
- [ ] AC3: Each run below on `large_test.html` exits 0 with
      `--expect-ranges`, `--expect-pages 14`, and `--expect-name
      "large.pdf|large-2.pdf"`. The render_check runs are plain Chrome
      (`--expect-native 1 --expect-pdfjs 1`), `--device iphone`, and
      `--device android` (both `--expect-native 0 --expect-pdfjs 2`). They
      also include `--remote cors` with each of those two devices. The
      ios_check runs use the "embedpdf iPhone" and "embedpdf iPad"
      simulators (`--expect-embeds 2`).
- [ ] AC4: `node tests/helpers_test.mjs` prints `N passed, 0 failed`. Its
      cases show three things. With the slow option, `serveDocs` and
      `serveRemote` send a whole-file answer in pieces. They count HTTP 206
      answers per address. Without the new options, they send each file
      whole, with the same headers as before.
- [ ] AC5: CLAUDE.md "Verify before finishing" holds each run that AC3 names
      as a fenced line. It says what `--expect-ranges` and `--plant noranges`
      do and how `files/large.pdf` was made. Its "Still unverified" list says
      that byte-range loading is not checked on GitHub Pages or on a real
      phone.

## Coverage

- AC1 → T1
- AC2 → T2, T3, T4
- AC3 → T3, T4
- AC4 → T2
- AC5 → T5

## Tasks

- [x] T1: Build `files/large.pdf` with `pdfunite` from seven copies of
      `sample.pdf`, and copy it to `files/large-2.pdf`. Add `large_test.qmd`
      with the two embeds and both files in `resources:`. Run `quarto render`.
- [ ] T2: In `tests/serve_docs.mjs`, give `serveDocs` and `serveRemote` a slow
      whole-file option, a count of 206 answers per address, and a no-ranges
      mode for the plant. The no-ranges mode answers every range request with
      the whole file (HTTP 200). Add the helpers_test cases of AC4.
- [ ] T3: Add `--expect-ranges` and `--plant noranges` to render_check, with
      header text. Run the render_check lines of AC3 and one plant run.
- [ ] T4: Add `--expect-ranges` and `--plant noranges` to ios_check, with
      header text. Run the ios_check lines of AC3 and one plant run.
- [ ] T5: Add the CLAUDE.md lines and text of AC5. Then run the verify slot
      for a `tests/serve_docs.mjs` change: every `render_check.mjs`,
      `ios_check.mjs`, `name_rule_test.mjs`, and `safari_check.mjs` line in
      CLAUDE.md's fenced blocks must exit 0.

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

## Decisions

## Review
