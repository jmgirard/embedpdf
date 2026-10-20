<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section. -->
# M019: Large PDF text check

- **Status:** in-progress
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

- [ ] AC1: `files/large.pdf` has 14 pages (`pdfinfo`) and more than 131,072
      bytes (`wc -c`), `cmp files/large.pdf files/large-2.pdf` reports no
      difference, and a loop over pages n = 1 to 14 shows that
      `pdftotext -f n -l n files/large.pdf -` holds page n's phrase and none of
      the other 13 phrases, the phrases being the 14 that CLAUDE.md lists for
      this PDF.
- [ ] AC2: The repo holds a source file, and CLAUDE.md names a command that
      builds a PDF from it. A PDF built by that command into a temporary
      directory passes AC1's page count, size, and phrase loop.
- [ ] AC3: Each line that
      `grep -n '^node tests/.*\(large_test\|shared_test\)\.html' CLAUDE.md | grep -v -- '--cpu-throttle'`
      finds carries `--expect-text` with the 14 phrases in page order.
- [ ] AC4: Each line that
      `grep -n '^node tests/.*\(large_test\|shared_test\)\.html' CLAUDE.md`
      finds exits 0 when run.
- [ ] AC5: `quarto render` ends with no error, and
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
- [ ] T2: Rewrite `large_test.qmd`, `shared_test.qmd`, and CLAUDE.md's
      large-PDF paragraph (CLAUDE.md:242-262) for the new PDF: its source,
      build command, and phrase list. Grep `cairn/DESIGN.md` and README for
      other mentions of the old PDF. Run `quarto render`.
- [ ] T3: Add `--expect-text` with the 14 phrases to the CLAUDE.md lines AC3
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

## Decisions

## Review
