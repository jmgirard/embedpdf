<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section. -->
# M019: Large PDF text check

- **Status:** review
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** IP1
- **Resolves:** —
- **Surface tier:** internal — a test PDF and check lines; no extension user relies on them
- **Branch/PR:** m019-large-pdf-text

## Goal

Replace `files/large.pdf` and its copy with a 14-page PDF over 131,072 bytes whose pages each hold a phrase no other page holds, so the large-PDF check lines also check the hidden page text of a PDF that PDF.js loads by byte ranges.

## Scope

**In:** ROADMAP candidate "Large PDF text check". A committed source and a build
command for the new PDF; the new `files/large.pdf` and the byte-identical
`files/large-2.pdf`; `--expect-text` with the 14 phrases on the CLAUDE.md run
lines for `large_test.html` and `shared_test.html`; the text of
`large_test.qmd`, `shared_test.qmd`, and CLAUDE.md's large-PDF paragraph
rewritten for the new PDF; `docs/` rendered again.

**Out:** any change under `_extensions/` (none is needed, so no version bump).
`--expect-text` on the `--cpu-throttle 70` line, which checks canvas waits, not
text. Desktop Safari byte ranges and real-phone checks stay in CLAUDE.md
"Still unverified".

## Acceptance criteria

- [x] AC1: `files/large.pdf` has 14 pages (`pdfinfo`) and more than 131,072
      bytes (`wc -c`), `cmp files/large.pdf files/large-2.pdf` reports no
      difference, and a loop over pages n = 1 to 14 shows that
      `pdftotext -f n -l n files/large.pdf -` holds page n's phrase and none of
      the other 13 phrases, the phrases being the 14 that CLAUDE.md lists for
      this PDF.
- [x] AC2: The repo holds a source file, and CLAUDE.md names a command that
      builds a PDF from it. A PDF built by that command into a temporary
      directory passes AC1's page count, size, and phrase loop.
- [x] AC3: Each line that
      `grep -n '^node tests/.*\(large_test\|shared_test\)\.html' CLAUDE.md | grep -v -- '--cpu-throttle'`
      finds carries `--expect-text` with the 14 phrases in page order.
- [x] AC4: Each line that
      `grep -n '^node tests/.*\(large_test\|shared_test\)\.html' CLAUDE.md`
      finds exits 0 when run.
- [x] AC5: `quarto render` ends with no error, and
      ``grep -n 'seven copies\|copies of `sample.pdf`\|repeats every two pages' CLAUDE.md large_test.qmd shared_test.qmd``
      finds nothing.

## Coverage

- AC1 → T1
- AC2 → T1
- AC3 → T3
- AC4 → T3
- AC5 → T2

## Tasks

- [x] T1: Write the source of a 14-page PDF with one phrase per page (words,
      not page numbers, so no phrase holds another: "Page 1" is inside
      "Page 10"). Build it with tools already on the machine (Quarto's LaTeX,
      `pdfunite`). If one render is not over 131,072 bytes, build the pages
      apart and join them, since each part then embeds its own fonts. Copy it
      to `files/large-2.pdf`. Run AC1's loop on the committed file and on a
      fresh build in `$TMPDIR`.
- [x] T2: Rewrite `large_test.qmd`, `shared_test.qmd`, and CLAUDE.md's
      large-PDF paragraph (CLAUDE.md:242-262) for the new PDF: its source,
      build command, and phrase list. Grep `cairn/DESIGN.md` and README for
      other mentions of the old PDF. Run `quarto render`.
- [x] T3: Add `--expect-text` with the 14 phrases to the CLAUDE.md lines AC3
      names. Run every line AC4 names (render_check with
      `CHROME_PATH` set to Chromium, ios_check in both simulators). Run one
      render_check and one ios_check `large_test.html` line with
      `--plant swap` added and see each exit 1 naming a phrase on the wrong
      page.

## Work log

- 2026-10-19: created by /milestone-plan.
- 2026-10-19: tier check: not run — work named at the question set.
- 2026-10-19: question set: which candidate to plan — "Large PDF text check"; whether to go on to implement after the plan — go on.
- 2026-10-19: collision check: absorbs candidate "Large PDF text check" (M013 implement); M013 (done) built the current `large.pdf` and dropped `--expect-text` from its lines; D-006 keeps this row (unchecked viewer behavior); no D-entry rejects it. Inbox sweep: 0 open issues, 0 open PRs.
- 2026-10-19: lessons harvested: M013 (one phrase per page, none on another page; slow only `.pdf` files), M014 (`CHROME_PATH` to Chromium), M015 (render to PDF outside the project leaves no file in the repo), M010 (first `simctl openurl` may time out; repeat).
- 2026-10-19: plan gate chose replacing `large.pdf` and `large-2.pdf` over adding a third large PDF and page because the existing range lines then check text with no new lines; falsified by a check that needs a PDF whose text repeats.
- 2026-10-19: plan gate chose keeping 14 pages over another count because every `--expect-pages 14` line then stays as it is; falsified by a page count that cannot reach 131,072 bytes.
- 2026-10-19: criteria audit (reduced mode, fresh Opus reader): 3 findings, all fixed. AC2 claimed the committed PDF came from the source, which nothing checks: narrowed to a fresh build passing AC1. AC3 cut the throttle line out of one grep for one claim and not the other: split into AC3 (filtered grep) and AC4 (unfiltered), and the run environments moved out of the promise. AC5's grep missed "copies of `sample.pdf`": pattern added (not `pdfunite`, which the new build may use).
- 2026-10-19: no changelog entry: no extension change.
- 2026-10-19: implement: branch m019-large-pdf-text cut from main at 82f5284; status in-progress.
- 2026-10-19: T1 done: `files/large-source.md` (14 parts split at `\newpage`, a heading phrase each) and `tests/make_large_pdf.sh <out.pdf>` (renders each part with `quarto pandoc` and LuaLaTeX, joins with `pdfunite`, fails unless 14 pages and over 131,072 bytes). One whole render was 25,999 bytes and an uncompressed one 61,357, so the parts are rendered apart. New `large.pdf` 142,962 bytes, `large-2.pdf` a `cmp`-equal copy; 196-check phrase loop clean on it and on a fresh build (142,964 bytes; not byte-identical, so no `cmp` against the build), and it named missing phrases on the old `large.pdf`.
- 2026-10-19: the `quarto render <file>.md --output-dir` route failed ("only be used when rendering projects"), so the script calls `quarto pandoc`.
- 2026-10-19: T2 done: `large_test.qmd`, `shared_test.qmd`, and CLAUDE.md (key-files list, large-PDF paragraph with the build command) rewritten; CLAUDE.md points at the `--expect-text` list of the run lines for the phrases instead of a second copy of them. Line 20 ("holds copies of `sample.pdf` under the names they test") matched AC5's grep while still true, so it was reworded with the same meaning. `quarto render` exit 0, no error or warning lines; AC5 grep finds nothing; helpers_test 133 passed, 0 failed. No mention in DESIGN.md or README.
- 2026-10-19: T3 done: `--expect-text` with the 14 phrases added to the 13 non-throttle lines (filtered grep: 13 of 13 carry the list). All 14 lines of the unfiltered grep exit 0 (render_check with Chromium 155 via `CHROME_PATH`, ios_check in the iOS 27.0 "embedpdf iPhone" and "embedpdf iPad" simulators; 10 s to 34 s each; 3 range answers per PDF.js embed on the large_test lines). `--plant swap` on line 2 (render_check iphone) and line 6 (ios_check iPhone) each exit 1 naming page 1's and page 2's phrases on the wrong page.
- 2026-10-19: claim audit: not owed — internal tier.
- 2026-10-19: implement complete; status review.
- 2026-10-19: review checkpoint (half-done): AC1, AC2, AC3, AC5 evidence recorded; consistency gate green; AC4 runs and the four review lenses still running.

## Decisions

## Review

Pass 1, 2026-10-19, branch at 0dc7558, main at 82f5284 (not moved).

- AC1: `pdfinfo` 14 pages, `wc -c` 142,962 bytes; `cmp files/large.pdf files/large-2.pdf` no difference; the 14×14 `pdftotext -f n -l n` loop over the 14 phrases of the CLAUDE.md `--expect-text` list: 196 checks, 0 failures.
- AC2: source `files/large-source.md`; CLAUDE.md:250 names `sh tests/make_large_pdf.sh files/large.pdf && cp …`. `sh tests/make_large_pdf.sh "$TMPDIR/rev-large.pdf"` built 14 pages, 142,962 bytes; the same loop: 196 checks, 0 failures.
- AC3: the filtered grep finds 13 lines; `grep -c -F` of the full `--expect-text "Harbor Lights at Dawn|…|Lantern Room Logbook"` string over them counts 13.
- AC5: `quarto render` exit 0, no error or warning lines in its log, `git status` clean after it; the AC5 grep exits 1 (no match).
- AC4: the unfiltered grep finds 14 lines; each exits 0 (render_check with Chromium 155 via `CHROME_PATH`: 7 lines, 20 s to 22 s, and the `--cpu-throttle 70` line, 36 s; ios_check in the iOS 27.0 "embedpdf iPhone" and "embedpdf iPad" simulators: 6 lines, 10 s to 14 s).
- Consistency gate: `cairn_validate.py` all checks passed; no principle changed, so no `cairn_impact` run; the generic profile names no toolchain checks.
- spawned: diff-bug, blame-history, prior-review, ripple
- diff-bug #1: CLAUDE.md:96-98 says every `--expect-text` phrase comes from `pdftotext sample.pdf`, which the large-PDF lines no longer fit — fix now.
- diff-bug #2: the rebuild command does not run `quarto render`, so after a rebuild the checks would serve the old `docs/files/large*.pdf` — fix now.
- diff-bug #3: if `pdfinfo` fails, `[ "" -ne 14 ]` errors and the `||` leaves only the byte test, so the script can exit 0 with no page count — fix now.
- diff-bug #4: the script checks only the total page count, so a part that overflows to two pages plus a missed `\newpage` gives 14 pages with headings on the wrong pages — fix now.
- diff-bug #5: the `--cpu-throttle 70` paragraph's "59 s to 127 s" was measured on the old PDF — reject (false): it is a dated record of the 2026-10-19 runs, and the line exits 0 on the new PDF (36 s).
- diff-bug #6: the PDF is 11,890 bytes over the threshold — reject (false as a defect): the script fails if the size drops to 131,072 or less, and every `--expect-ranges` line got range answers.
- diff-bug #7: each page's footer reads "1" because each part renders apart — reject (false as a defect): no phrase is a number, and the text check passes.
- diff-bug #8: the reworded CLAUDE.md:20 reads less clearly — reject (style).
- diff-bug #9: the script and CLAUDE.md do not say it needs `lualatex` — fix now.
- diff-bug #10: `tests/make_large_pdf.sh` is the first `.sh` in `tests/` and is not executable — reject (style): it is run with `sh`, and no DESIGN or D-entry rule covers it.
- blame-history #1: the new PDF is 16% smaller than M013's 171 KB, which leaves less margin for the range path — reject (false): `--expect-ranges` sends any whole `.pdf` over 131,072 bytes slowly, and every range line got 3 range answers per PDF.js embed.
- blame-history #2: the CLAUDE.md and `large_test.qmd` text no longer gives M013's "seven copies" build — reject (planned change).
- blame-history #3: removing "The text repeats every two pages, so these lines take no `--expect-text`" reverses M013 — reject (planned change).
- prior-review #1: no prior-review evidence of a regression (M013's lesson is followed; `gh api …/pulls/comments` returned `[]`); a side note on over-long wrapped CLAUDE.md lines — reject (style).
- ripple #1: cairn/ROADMAP.md:27, the "Large PDF text check" row, still describes the gap — reject (planned change): post-merge hygiene deletes the row this milestone graduates.
- ripple #2: CLAUDE.md:97, the same stale phrase-source sentence as diff-bug #1 — fix now (with diff-bug #1).
