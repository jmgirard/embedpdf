# M015: Percent sign in PDF paths

- **Status:** in-progress
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** IP2, IP3
- **Resolves:** —
- **Surface tier:** user-facing — it changes the HTML and LaTeX that authors get from the shortcode
- **Branch/PR:** m015-percent-sign-paths

## Goal

A PDF path with a `%` sign works in HTML and PDF output.

## Scope

**In:** Observed 2026-10-19 with v1.2.5: the shortcode writes the path as
given. GitHub Pages and the test server answer HTTP 400 to a bare `%`
(`files/100%.pdf`), so the embed fails on a normal page. A PDF render of
`files/100%.pdf`, `files/100%25.pdf`, or `files/sample%20copy.pdf` fails
("compilation failed"), because `%` starts a LaTeX comment. This milestone
changes `_extensions/embedpdf/embedpdf.lua`:

- HTML and non-HTML link output write a `%` that is not followed by two hex
  digits as `%25`.
- LaTeX output decodes the `%XX` escapes that are safe in a LaTeX file name
  and wraps the `\includepdf` line in a group where `%` is a plain character.

It adds a normal test page, `percent_page_test.qmd`, the test file
`files/50%off.pdf`, unit tests, README text, and CLAUDE.md check lines.
Version 1.2.6.

**Out:**
- `%XX` escapes for bytes outside printable ASCII or for LaTeX special
  characters, and those characters given bare, in a LaTeX path → candidate
  row "LaTeX path escapes".
- A check that render_check fetches native `<object>` PDFs on normal pages →
  not planned. AC3 uses a one-off probe instead.
- GitHub Pages' answer to a `%25` address → a CLAUDE.md "Still unverified"
  line (T6).

## Acceptance criteria

- [ ] AC1: In HTML output, and in the link of output formats other than HTML
      and LaTeX, the shortcode writes each `%` of the PDF path that is not
      followed by two hex digits as `%25`. It writes a `%` that is followed
      by two hex digits as given, in one pass. This holds in `data-src`, the
      `button` link, the no-JavaScript link, and that other-format link.
      `tests/test_shortcode.lua` checks the written address for each of
      these paths: `files/100%.pdf`, `files/100%25.pdf`,
      `files/sample%20copy.pdf`, `a%2fb.pdf`, `a%2Fb.pdf`, `a%zz.pdf`,
      `a%4g.pdf`, `a%4`, `a%`, `%.pdf`, `50%-100%.pdf`, `a%%b.pdf`,
      `%2525.pdf`, `a%7Bb.pdf`, `a%22b.pdf`, `a%2Cb.pdf`, `a%7b%2c.pdf`,
      `a%5C%7D%23%24%26%7E%5E%5F.pdf`, `a%7Cb.pdf`, `a%1Fb.pdf`,
      `a%7Fb.pdf`, and `%C3%A9.pdf`. `pandoc lua tests/test_shortcode.lua`
      prints "N passed, 0 failed".
- [ ] AC2: In LaTeX output the shortcode decodes, in one pass, each `%XX`
      escape whose byte is printable ASCII (0x20 to 0x7E) other than
      `\ { } # $ & ~ ^ _ " ,`. It keeps every other `%` as written. When the
      path then holds a `%`, the line is
      `\begingroup\catcode`\%=12\relax\includepdf[pages=-]{<path>}\endgroup`.
      Otherwise the line is `\includepdf[pages=-]{<path>}`, the form v1.2.5
      wrote. `tests/test_shortcode.lua` checks the whole line for each AC1
      path. The same run prints "N passed, 0 failed".
- [ ] AC3: The normal page (not self-contained) `percent_page_test.qmd` has
      five embeds, in this order:
      - `files/100%.pdf` with `renderer=pdfjs`
      - `files/100%25.pdf` with `renderer=pdfjs`
      - `files/100%.pdf` with `renderer=auto`
      - `files/50%off.pdf` with `renderer=pdfjs`
      - `files/sample%20copy.pdf` with `renderer=pdfjs`

      After `quarto render`, these lines pass. Each line also takes
      `--expect-pages 2 --expect-name "100%.pdf|100%.pdf|100%.pdf|50%off.pdf|sample copy.pdf" --expect-text "On the Origin of Coastlines|Why It Matters"`:
      - `node tests/render_check.mjs percent_page_test.html --expect-native 1 --expect-pdfjs 4`
      - the same line with `--device mac-safari`, and with `--device windows-touch`
      - `node tests/render_check.mjs percent_page_test.html --device iphone --expect-native 0 --expect-pdfjs 5`, and the same with `--device android`
      - `node tests/ios_check.mjs --device "embedpdf iPhone" --page percent_page_test.html --expect-embeds 5`, and the same with `--device "embedpdf iPad"`

      In Chromium on the served desktop page, a `fetch` of the native
      `<object>`'s address returns HTTP 200 and the bytes of `sample.pdf`.
- [ ] AC4: `quarto render percent_page_test.qmd --to pdf --output-dir <dir>`,
      with a directory outside `docs/` and Quarto's default PDF engine,
      completes with no error. `pdftotext` of that PDF holds the phrase "On
      the Origin of Coastlines" 5 times, one per embed.
- [ ] AC5: After `quarto render`, each line that starts with `node ` and
      names `percent_test.html` or `name_test.html` in CLAUDE.md at commit
      61d6f12 passes (9 lines). In that CLAUDE.md, the first command block
      that names `example.html` holds one `example.html` line with no
      `--device` and one with `--device iphone`. Those two lines pass too.
- [ ] AC6: `_extensions/embedpdf/_extension.yml` holds `version: 1.2.6`, and
      `_extensions/embedpdf/embedpdf.lua` holds `VERSION = "1.2.6"`.
      README.md says that a `%` in a PDF file name can be given bare unless
      two hex digits follow it, and that `%25` always works.

## Coverage

- AC1 → T1, T2
- AC2 → T1, T2
- AC3 → T3
- AC4 → T4
- AC5 → T5
- AC6 → T2, T6

## Tasks

- [x] T1: In `tests/test_shortcode.lua`, add checks for every AC1 path: the
      address in `data-src`, the `button` link, the no-JavaScript link, and
      the non-HTML link, and the whole LaTeX line. Run them against v1.2.5
      and see the new checks fail.
- [x] T2: In `embedpdf.lua`, add a URL rule for the path (used for
      `esc_src` at embedpdf.lua:117 and the link at embedpdf.lua:104) and a
      LaTeX rule (embedpdf.lua:99). Bump `VERSION` and `_extension.yml` to
      1.2.6. The unit tests pass.
- [x] T3: Add `files/50%off.pdf` (a copy of `sample.pdf`) and
      `percent_page_test.qmd`. List the PDFs under `resources:`, and keep
      the phrase "On the Origin of Coastlines" out of the page's own text.
      Run `quarto render` and the AC3 lines, and the native `fetch` probe.
      Render the page with the v1.2.5 shortcode
      (`git show main:_extensions/embedpdf/embedpdf.lua`), see the desktop
      line fail, then restore.
- [x] T4: Run the AC4 PDF render and the `pdftotext` count. See the v1.2.5
      shortcode fail the same render.
- [x] T5: Run the AC5 lines.
- [x] T6: README.md: the `%` sentence. CLAUDE.md: the new page and
      `files/50%off.pdf` in Key files, the AC3 lines, the AC4 command, and a
      "Still unverified" line for GitHub Pages' answer to a `%25` address.
      Update `cairn/DESIGN.md` Architecture where it describes how the path
      is written.

## Work log

- 2026-10-19: created by /milestone-plan.
- 2026-10-19: tier check: not run — work named at the question set.
- 2026-10-19: question set: which candidate to plan — "Bare percent path". Fix LaTeX output too — yes.
- 2026-10-19: collision check: absorbs candidate row "Bare percent path" in full. M008 (done) added the self-contained `percent_test.qmd`, which this extends with a normal page. No D-entry overlaps. Inbox sweep: 0 open issues, 0 open PRs.
- 2026-10-19: LaTeX probe: renders of `files/100%.pdf`, `files/100%25.pdf`, `files/sample%20copy.pdf` failed with v1.2.5, and `files/sample copy.pdf` worked. The catcode group form and the `\csname @percentchar\endcsname` form each loaded the PDF in lualatex, pdflatex, and xelatex.
- 2026-10-19: criteria audit (full mode, fresh Opus reader): 9 findings, all fixed. The `\csname` form joins a following letter into one command, so AC2 uses the catcode group and AC3 adds `files/50%off.pdf`. Decoding is limited to safe printable ASCII (rest to row "LaTeX path escapes"). Probe paths added for each axis. The native embed gets a fetch probe in AC3. The AC4 phrase is kept out of the page text (T3). AC5 lines are bound to commit 61d6f12. The README rule names the two-hex-digit case. AC1 and AC2 now state shortcode output, not test-file content.
- 2026-10-19: plan gate chose the catcode group over `\csname @percentchar\endcsname` because the latter breaks before a letter; falsified by a Quarto PDF render where the group form fails to load the file.
- 2026-10-19: plan gate chose encoding only a `%` not followed by two hex digits over encoding every `%`, because `%20` paths work today and must keep working; falsified by an author file name with a bare `%` and two hex digits after it.
- 2026-10-19: plan gate chose a one-off native fetch probe over extending render_check to fetch native PDFs on normal pages, because widening a checker was not posed at the question set; falsified by a native embed that passes the probe and fails for readers.
- 2026-10-19: version 1.2.6, the repo's practice of one patch bump per user-facing fix (v1.2.2 bumped for a Lua-only change).

- 2026-10-19: implement started on branch m015-percent-sign-paths.
- 2026-10-19: T1: 70 percent checks in tests/test_shortcode.lua (14 paths × data-src, no-JS link, button link, other-format link, LaTeX line). Against v1.2.5: 68 passed, 42 failed (the 7 bare-% paths in the 4 link targets, and all 14 LaTeX lines).
- 2026-10-19: T2: `url_path()` and `latex_path()` in embedpdf.lua (one `gsub` pass each). The LaTeX group wraps the line only when the path still holds a `%`, so a path with no `%` writes the v1.2.5 line. Version 1.2.6 in both files. Unit tests: 110 passed, 0 failed.
- 2026-10-19: T3: `percent_page_test.qmd` and `files/50%off.pdf` added. `quarto render` gave no warning. The 5 render_check lines (Chromium 155) and the 2 ios_check lines (iOS 27.0 simulators) exit 0. Native probe (scratch `native_probe.mjs` with `serveDocs`): the `<object>` data is `files/100%25.pdf`, fetch HTTP 200, bytes equal `sample.pdf`. With the v1.2.5 shortcode the desktop line exits 1 ("embedpdf: failed to render files/100%.pdf", HTTP 400), and Quarto warns "Invalid URI" 3 times.
- 2026-10-19: T4: `quarto render percent_page_test.qmd --to pdf --output-dir <scratch>` (default engine) exits 0. The PDF has 15 pages, and `pdftotext` finds "On the Origin of Coastlines" 5 times. With the v1.2.5 shortcode the same render exits 1 ("compilation failed").
- 2026-10-19: T5: the 9 `node` lines of CLAUDE.md at 61d6f12 that name `percent_test.html` or `name_test.html`, and the two `example.html` lines (no `--device`, `--device iphone`), exit 0. Extra, outside AC5: `percent_test.html --alone http --device iphone` exits 0.
- 2026-10-19: T6: README paragraph on `%` in a file name, CLAUDE.md (lua-change PDF render command, 7 `percent_page_test.html` lines, page notes, Key files, "Still unverified" line for GitHub Pages and `%25`), DESIGN.md Architecture sentence. The simple-english hook reports style hits in older CLAUDE.md and README text (em-dashes, semicolons). The added text was fixed, and the older text is left as it is.
- 2026-10-19: substantive amendment: AC5 wording. "(11 lines)" counted prose lines, and only 9 `node` lines name those pages. "The first command block" was the `pandoc lua` block. Now it is "the first command block that names `example.html`". The lines run are unchanged.
- 2026-10-19: re-audit: AC5 (full) — the first block named was the `pandoc lua` block. The `--alone http --device iphone` line for percent_test is implied by the base doc but not listed, and it is kept out of AC5 (run once, exit 0, T5 line).
- 2026-10-19: re-audit: AC5 (full) — nothing. The facts check against 61d6f12 (9 lines, and one line of each kind in the block).
- 2026-10-19: claim audit pass (fresh Opus reader): 29 claims read. Wrong: `%22` decodes to `"`, which fails in an `\includepdf` path, against the "safe" comment and README. Doubtful: CLAUDE.md said both percent files serve both pages. Both corrected.
- 2026-10-19: character probe (scratch `charprobe.sh`, `\includepdf{a<c>b.pdf}` for each decoded printable ASCII character): lualatex and pdflatex fail on `"` and `,`, and xelatex fails on `"`, `)`, and `,`. `"` and `,` joined `LATEX_UNSAFE`. `)` stays decoded, because the default lualatex reads it, and the xelatex case went to row "LaTeX path escapes".
- 2026-10-19: substantive amendment: AC1 gains the paths `a%22b.pdf`, `a%2Cb.pdf`, then `a%4`, `a%7b%2c.pdf`, `a%5C%7D%23%24%26%7E%5E%5F.pdf`, `a%7Cb.pdf`, `a%1Fb.pdf`, `a%7Fb.pdf`, and says "the link of output formats other than HTML and LaTeX". AC2's kept set gains `"` and `,`, and "as in v1.2.5" became "the form v1.2.5 wrote". What the user gets is unchanged except that `%22` and `%2C` stay as written in PDF output.
- 2026-10-19: re-audit: AC1 (full) — excluded set probed for 3 of 11 characters; no lowercase hex for a kept character; range edges `%1F`, `%7F`, `|` and `a%4` untested; "non-HTML link" also covers LaTeX. Fixed by the paths and wording above.
- 2026-10-19: re-audit: AC2 (full) — same probe gaps as AC1; a kept escape names a file not on disk, so the render stops (IP2), now a DESIGN Known issues entry; "as in v1.2.5" fit only the form; only lualatex probed (pdflatex and xelatex probed since).
- 2026-10-19: re-audit: AC1 (full) — no path mixes a valid escape with a bare `%`, so a per-path rule passed the table. Closed in the test table with `sample%20100%.pdf`, with no change to the AC wording.
- 2026-10-19: re-audit: AC2 (full) — no path mixes a decoded and a kept escape. Closed in the test table with `a%20%7B.pdf`, with no change to the AC wording. Mutants (scratch): a per-path `url_path` fails 4 checks on `sample%20100%.pdf`, a per-path `latex_path` fails on `a%20%7B.pdf`, and removing `_` from `LATEX_UNSAFE` fails the all-kept path. The per-path `url_path` passes the table at 90b8754 (110 passed). Unit tests: 160 passed, 0 failed.

## Decisions

## Review
