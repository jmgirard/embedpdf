# M008: Name check gaps

- **Status:** review
- **Priority:** high
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** internal — check scripts and test pages only; the extension code does not change
- **Branch/PR:** m008-name-check-gaps

## Goal

Close the gaps that the M005 review found in the `--expect-name` checks of `tests/render_check.mjs` and `tests/ios_check.mjs`.

## Scope

**In:** a `duplink` plant (render_check) and a `norole` plant (both scripts); a `|`-separated name list for
render_check `--expect-name`, with name lines for `revealjs_test.html`; a hydration wait before the name check of
each slide; a new self-contained page `percent_test.qmd` whose file name holds a literal `%`, with its check lines;
the new lines in CLAUDE.md "Verify before finishing".

**Out:**
- Viewer naming gaps (two embeds of one file, query-style URLs, the made-up "document.pdf") → candidate row
  "Embed name gaps".
- Name checks of slide decks in `ios_check.mjs`, which has no RevealJS support → candidate row "Self-contained
  slides on iOS".
- A bare `%` path (`files/100%.pdf`) on a normal page gets HTTP 400 from GitHub Pages and from `serveDocs`, so the
  embed fails to load → new candidate row "Bare percent path".
- No extension version bump: `embedpdf-viewer.js`, `embedpdf.css`, and `embedpdf.lua` do not change.

## Acceptance criteria

- [x] AC1: `tests/render_check.mjs` has a `--plant duplink` (with `--expect-name`) that gives the first PDF.js
      embed's toolbar download link an `aria-label` equal to its `title`.
      `node tests/render_check.mjs example.html --expect-native 9 --expect-pdfjs 2 --expect-name sample.pdf --plant duplink`
      exits 1 and prints a failure line saying that embed's download control has a description that repeats its name.
- [x] AC2: `tests/render_check.mjs` and `tests/ios_check.mjs` each have a `--plant norole` (with `--expect-name`)
      that removes the first PDF.js embed's `role` attribute.
      `node tests/render_check.mjs example.html --expect-native 9 --expect-pdfjs 2 --expect-name sample.pdf --plant norole`
      and `node tests/ios_check.mjs --device "embedpdf iPhone" --page name_test.html --expect-embeds 2 --expect-name "sample copy.pdf" --plant norole`
      each exit 1 and print a failure line saying that embed's role attribute is not group.
- [x] AC3: `tests/render_check.mjs --expect-name` accepts several names separated by `|`, in the document order of
      the page's PDF.js embeds. A single name still applies to every PDF.js embed. With two or more names, the run
      fails unless the number of names equals the number of PDF.js embeds and embed i is named "PDF: <name i>".
      `node tests/render_check.mjs revealjs_test.html --expect-native 2 --expect-pdfjs 1 --expect-name dummy2.pdf`
      and `node tests/render_check.mjs revealjs_test.html --device iphone --expect-native 1 --expect-pdfjs 2 --expect-name "dummy2.pdf|dummy.pdf"`
      exit 0, and
      `node tests/render_check.mjs revealjs_test.html --device iphone --expect-native 1 --expect-pdfjs 2 --expect-name "dummy.pdf|dummy2.pdf"`
      exits 1.
- [x] AC4: On a RevealJS page, `tests/render_check.mjs` starts the `--expect-name` check of each slide only once no
      `div.embedpdf` on that slide lacks all of `.embedpdf-pdfjs`, `.embedpdf-native`, and `.embedpdf-failed`, or
      after 10 s.
- [x] AC5: A new self-contained page `percent_test.qmd` (`embed-resources: true`) shows `files/100%.pdf`, a copy of
      `sample.pdf`, in two `renderer=pdfjs` embeds: one by the path `files/100%25.pdf` and one by `files/100%.pdf`.
      These runs exit 0:
      `node tests/render_check.mjs percent_test.html --alone file --expect-native 0 --expect-pdfjs 2 --expect-pages 2 --expect-name "100%.pdf"`,
      `node tests/render_check.mjs percent_test.html --alone http --expect-native 0 --expect-pdfjs 2 --expect-pages 2 --expect-name "100%.pdf"`,
      `node tests/render_check.mjs percent_test.html --alone file --device iphone --expect-native 0 --expect-pdfjs 2 --expect-pages 2 --expect-name "100%.pdf"`,
      `node tests/ios_check.mjs --device "embedpdf iPhone" --page percent_test.html --alone yes --expect-embeds 2 --expect-name "100%.pdf"`,
      and `node tests/ios_check.mjs --device "embedpdf iPad" --page percent_test.html --alone yes --expect-embeds 2 --expect-name "100%.pdf"`.
      This run exits 1:
      `node tests/render_check.mjs percent_test.html --alone file --expect-native 0 --expect-pdfjs 2 --expect-pages 2 --expect-name "100%.pdf" --plant wrongname`.
- [x] AC6: CLAUDE.md "Verify before finishing" gains the exit-0 runs of AC3 and AC5 as command lines. Every literal
      `node tests/render_check.mjs` or `node tests/ios_check.mjs` command line in that section that passes
      `--expect-name` or names `revealjs_test.html` exits 0. The header comment of `render_check.mjs` describes
      `duplink`, `norole`, and the `|` list form, and that of `ios_check.mjs` describes `norole`.

## Coverage

- AC1 → T1
- AC2 → T1
- AC3 → T2
- AC4 → T3
- AC5 → T4
- AC6 → T1, T2, T5, T6

## Tasks

- [x] T1: Plants. In `render_check.mjs` `nameFailures()` (near line 480) add `duplink` (the `a.embedpdf-download`
      gets `aria-label` = `title`) and `norole` (remove the embed's `role`), and add both to `NAME_PLANTS`. In
      `ios_check.mjs` add `norole` to the plant list (line 166), the needs-`--expect-name` guard (line 179), and the
      probe plant block (near line 288). Update both header comments. Run the AC1 and AC2 lines.
- [x] T2: Name list. Split `--expect-name` on `|`; give `nameFailures()` the running PDF.js embed index across
      slides; fail on a count mismatch when two or more names are given. Run the AC3 lines, and the existing
      `--expect-name` lines (one name) to show they still pass.
- [x] T3: Hydration wait. Before `nameFailures()` reads a slide, wait (100 ms steps, 10 s cap) for no unhydrated
      `div.embedpdf` under the slide, with the condition `measureText()` uses (line 340). Run the AC3 exit-0 lines.
- [x] T4: Percent page. Add `files/100%.pdf` (copy of `sample.pdf`) and `percent_test.qmd` (listed under
      `resources:`). Run `quarto render`; Quarto prints a "Invalid URI 'files/100%.pdf'" WARN for the bare-`%` link,
      which is expected and not an error. Run the AC5 lines.
- [x] T5: CLAUDE.md. Add the AC3 and AC5 exit-0 lines, and a line in its notes on `percent_test.html`. Run every
      CLAUDE.md line that passes `--expect-name` or names `revealjs_test.html`.
- [x] T6: Review return 1. Add the AC5 `percent_test.html --alone http` line to CLAUDE.md. Fix-now items: a
      failure line when the name-check wait times out, the header's RevealJS paragraph and `|` limits, ios_check's
      one-name note, the CLAUDE.md list note and Key files, line wrapping. Re-run the AC6 sweep.

## Work log

- 2026-10-18: created by /milestone-plan.
- 2026-10-18: tier check: milestone — five check-script gaps across two scripts and a new test page, more than one sitting.
- 2026-10-18: collision sweep: absorbs candidate row "Name check gaps" in full; distinct from rows "Embed name gaps" (viewer naming), "Text check gaps", "Ink check follow-ups"; M005 (archived) shipped the name checks this extends; no D-entry overlaps.
- 2026-10-18: inbox sweep: 0 open issues, 0 open PRs.
- 2026-10-18: checker-regress shape not hit: the name checks verify the extension's rendered output in a browser, not repo-internal artifacts.
- 2026-10-18: lessons applied: M002 (go to each slide with `Reveal.slide()`), M005 (Chromium repeats a `title` equal to `aria-label` as the description, which `duplink` relies on).
- 2026-10-18: probe: Quarto 1.10 copies `files/100%.pdf` as a resource and inlines both `files/100%25.pdf` and `files/100%.pdf` in a self-contained page, keeping each `<a download>` href; GitHub Pages and `serveDocs` answer 400 for a bare `%` path.
- 2026-10-18: criteria audit (reduced mode, fresh Opus reader): AC5 runs were ambiguous (written out in full); AC6 pulled in exit-1 runs and claimed `duplink` and `|` for ios_check (narrowed to exit-0 lines and per-script headers); AC4's JSON wait figure and repeated sentence dropped as unneeded.
- 2026-10-18: question set: fix the bare `%` path in the shortcode here or later — later, as candidate row "Bare percent path".
- 2026-10-18: question set: add the published self-contained test page `percent_test` — yes.
- 2026-10-18: plan gate chose a `|` name list in embed order over reading each embed's expected name from its own `data-src`, because an expectation derived from the page under test cannot catch a wrong file; falsified by a page whose PDF.js embed order differs between devices in a way a list cannot state.
- 2026-10-18: plan gate chose a separate `duplink` plant over widening `dupdesc` to all controls, because one plant over several controls cannot show which control's check fails; falsified by a check that fails on one control only when planted with another.
- 2026-10-18: plan gate chose render_check only for the `|` list, because `ios_check.mjs` has no slide-deck support and no single page needs several names there.
- 2026-10-18: implement: branch m008-name-check-gaps cut from main at 4658f45; Google Chrome is not installed, so every render_check run uses Chromium 155 through `CHROME_PATH=/Applications/Chromium.app/Contents/MacOS/Chromium`, as in M001 to M007.
- 2026-10-18: T1 done: render_check plants `duplink` and `norole`, ios_check plant `norole`. example.html `--plant duplink` exits 1 ("download control: description repeats the name"), `--plant norole` exits 1 ("role attribute is null, not group", tree role generic); name_test.html ios_check iPhone `--plant norole` exits 1 with the same role line; both clean runs exit 0.
- 2026-10-18: T2 done: `--expect-name` splits on `|`; `nameFailures(page, slide, before)` takes the count of PDF.js embeds on earlier slides; a list whose length differs from the embeds checked fails. revealjs_test.html desktop `dummy2.pdf` and iphone `dummy2.pdf|dummy.pdf` exit 0; iphone `dummy.pdf|dummy2.pdf` exits 1 (slides 3 and 4 misnamed), a 3-name list exits 1 ("gives 3 names for 2 PDF.js embeds"), `--plant wrongname` with the list exits 1; name_test.html one-name run exits 0.
- 2026-10-18: T3 done: `nameFailures()` waits (100 ms steps, 10 s cap) for no unhydrated `div.embedpdf` under its root, the `measureText()` condition, before planting or reading; it runs for the whole page too, where it is harmless. Choice: the wait sits inside `nameFailures()` rather than in the slide loop, so the plant also waits for the embed.
- 2026-10-18: T4 done: `percent_test.qmd` and `files/100%.pdf` (copy of `sample.pdf`); `quarto render` exits 0 with the one expected "Invalid URI 'files/100%.pdf'" WARN, and docs/ gains only `percent_test.html` and `files/100%.pdf`. The rendered hrefs are `files/100%25.pdf` and `files/100%.pdf`. render_check `--alone file`, `--alone http`, and `--alone file --device iphone` exit 0 (both links `blob`, every page ok); `--plant wrongname` exits 1; ios_check iPhone and iPad `--alone yes` exit 0 with both embeds role group, "PDF: 100%.pdf".
- 2026-10-18: T5 done: CLAUDE.md's two revealjs_test.html lines gain the AC3 `--expect-name` arguments (in place, not as new lines), four percent_test lines are added, and the notes describe the `|` list and percent_test. A sweep of "Verify before finishing" for `node tests/(render|ios)_check.mjs` lines with `--expect-name` or `revealjs_test.html` found 24 lines, and all 24 exit 0 (Chromium 155, iOS 27.0 simulators). The simple-english hook reports 37 style hits across all of CLAUDE.md; the two added sentences carry none of them, and the older text stays as it is (out of scope).
- 2026-10-18: claim audit: not owed — internal tier.
- 2026-10-18: review return 1: AC6 fails — CLAUDE.md has no literal `node tests/render_check.mjs percent_test.html --alone http --expect-native 0 --expect-pdfjs 2 --expect-pages 2 --expect-name "100%.pdf"` line. Fix-now items ride the same task: a failure line when the name-check wait times out, the header's RevealJS paragraph and `|` limits, ios_check's one-name note, the CLAUDE.md list note and Key files, and line wrapping.
- 2026-10-18: T6 in progress (checkpoint): fixes written (CLAUDE.md `--alone http` percent line, list note, Key files; render_check timeout failure line and header notes; ios_check one-name note); the AC6 sweep and plant re-runs are running, and the timeout-line probe is not yet run.
- 2026-10-18: T6 done: the CLAUDE.md sweep now finds 25 lines (the new `percent_test.html --alone http` line included), and all 25 exit 0; plants duplink, norole, dupdesc, notoolbar, wrongname (percent_test), the swapped revealjs list, and ios_check norole each exit 1 with their failure line. Probe: a temporary untracked copy of name_test.html with one `div.embedpdf` and no `data-src` exits 1 with "1 embed(s) on the page still not hydrated after 10 s", and name_test.html exits 0; the copy was deleted.
- 2026-10-18: step-7 approval: m008-name-check-gaps approved for merge

## Decisions

## Review

Pass 1, 2026-10-18, at d98b38b (branch level with main at 4658f45). Chromium 155 via `CHROME_PATH`, iOS 27.0
"embedpdf iPhone" and "embedpdf iPad" simulators.

- AC1: `render_check.mjs example.html … --expect-name sample.pdf --plant duplink` exit 1, line "PDF.js embed 1,
  download control: description repeats the name "Download PDF"". The clean run exits 0 (AC6 sweep line 1).
- AC2: render_check `--plant norole` exit 1, lines "PDF.js embed 1: role attribute is null, not group" and "tree
  role is generic, not group"; ios_check iPhone name_test.html `--plant norole` exit 1, report failure "embed 1:
  role attribute is null, not group".
- AC3: revealjs_test.html desktop `--expect-name dummy2.pdf` exit 0; iphone `"dummy2.pdf|dummy.pdf"` exit 0; iphone
  `"dummy.pdf|dummy2.pdf"` exit 1 (aria-label and tree name mismatches on slides 3 and 4). Code: `expectNames` split
  at render_check.mjs:231, per-embed index at :527, count check at :781. One-name runs (example.html, name_test.html)
  exit 0 in the AC6 sweep.
- AC4: render_check.mjs:495-498, inside `nameFailures()` before the plant and before any read: a loop of 100 ms steps
  while `div.embedpdf:not(.embedpdf-pdfjs):not(.embedpdf-native):not(.embedpdf-failed)` under the slide is non-empty,
  capped at 10 s. The two AC3 exit-0 revealjs runs pass no `--expect-text`.
- AC5: `percent_test.qmd` has `embed-resources: true` and two `renderer=pdfjs` embeds of `files/100%25.pdf` and
  `files/100%.pdf`; `files/100%.pdf` equals `sample.pdf` (copied). render_check `--alone file`, `--alone http`,
  `--alone file --device iphone` exit 0; ios_check iPhone and iPad `--alone yes` exit 0; `--alone file --plant
  wrongname` exit 1 ("aria-label is "PDF: wrong.pdf", not "PDF: 100%.pdf"").
- AC6: FAILS as written. The AC5 run `percent_test.html --alone http …` exits 0 but is not a command line in
  CLAUDE.md (only the general note "Run each `--alone file` line again with `--alone http`" covers it). The other
  parts hold: the 24 swept lines exit 0, and both headers describe their plants and the `|` list. Not ticked.
- Gate: `cairn_validate.py` exit 0 (all checks passed); no principle changed, so no `cairn_impact`; the generic
  profile names no toolchain checks.
- spawned: diff-bug, blame-history, prior-review, ripple
- diff-bug #1: the hydration wait in `nameFailures()` ends after 10 s with no message — fix now (print a failure
  line naming the unhydrated count).
- diff-bug #2: on a deck the name plant picks the page's first PDF.js embed on every slide, so a late-hydrating
  earlier embed can move it — follow-up, new row "Name plant slide target".
- diff-bug #3: the `|` index counts hydrated embeds, so a late embed shifts later names — fix now, covered by #1's
  message (the count check already fails such a run).
- diff-bug #4: a short list prints both a per-embed line and the count line — reject (false as a defect: both
  lines are true and the run exits 1).
- diff-bug #5: names are not trimmed — reject (false: a name is compared as the file name is written).
- diff-bug #6: ios_check gives no `|` error — reject (planned change: the list is render_check's only).
- diff-bug #7: the header's RevealJS paragraph does not mention the wait — fix now.
- diff-bug #8: new comment and CLAUDE.md lines are not wrapped — reject (style); rewrapped anyway with the fix.
- diff-bug #9: no literal `--alone http` percent line — floor return (AC6 fails), see the work log.
- diff-bug #10: the CLAUDE.md note leaves out that a list must name every embed — fix now.
- diff-bug #11: the published page has a bare-`%` href that GitHub Pages answers 400 — reject (planned change:
  the user chose the row "Bare percent path").
- blame-history #1: no literal `--alone http` percent line — same as diff-bug #9.
- blame-history #2: vertical slides would double-count — reject (false: `Reveal.getSlides()` leaves out stack
  parents).
- blame-history #3: the silent 10 s wait — same as diff-bug #1.
- blame-history #4: a file name with `|` cannot be given — fix now (say so in the header).
- blame-history #5: the revealjs lines gained `--expect-name` in place — reject (planned change).
- blame-history #6: long CLAUDE.md sentence — reject (style); rewrapped with diff-bug #8.
- prior-review #1: the silent 10 s wait — same as diff-bug #1.
- prior-review #2: ios_check takes no `|` list — fix now in part (its header says one name and that the list is
  render_check's); the parity itself is a planned change.
- prior-review #3: the bare-`%` path on a normal page is unchecked — reject (planned change, row "Bare percent path").
- ripple #1: ROADMAP row "Name check gaps" still lists the gaps — reject (planned change: post-merge hygiene
  graduates it).
- ripple #2: CLAUDE.md "Key files" omits percent_test.qmd (and name_test.qmd, the self-contained pages) — fix now.
- Fix-now commits of pass 1: diff-bug #1, #3, #7, #10, blame-history #4, prior-review #2, ripple #2, and the
  rewrapping, fixed f04754f.

Pass 2, 2026-10-18, at 4471ba4 (code as of f04754f; later commits touch `cairn/` only; branch level with main at
4658f45). Same Chromium 155 and iOS 27.0 simulators.

- AC1 to AC5 (re-run at f04754f): duplink exit 1 (download control line), render_check and ios_check norole exit 1
  (role line), revealjs desktop and iphone list runs exit 0 and the swapped list exits 1, percent_test `--alone
  file`, `--alone http`, iphone, and ios_check iPhone and iPad exit 0, `--plant wrongname` exits 1. AC4 also: a
  temporary page with one never-hydrated `div.embedpdf` exits 1 with "1 embed(s) on the page still not hydrated
  after 10 s". Boxes stay ticked.
- AC6: CLAUDE.md now has the AC3 exit-0 runs (the two revealjs lines) and every AC5 exit-0 run as command lines
  (`--alone file`, `--alone http`, `--alone file --device iphone`, ios_check iPhone and iPad). The sweep of "Verify
  before finishing" for `node tests/(render|ios)_check.mjs` lines with `--expect-name` or `revealjs_test.html`
  finds 25 lines, and all 25 exit 0. render_check.mjs's header describes `duplink`, `norole`, and the `|` list;
  ios_check.mjs's header describes `norole`.
- Gate: `cairn_validate.py` exit 0; no principle changed; the generic profile names no toolchain checks.
- spawned: diff-bug, blame-history, prior-review, ripple
- diff-bug #1: the stuck count is read before the embeds, so an embed that hydrates in between is both checked and
  reported stuck — fix now (count again after the embeds are read).
- diff-bug #2: when nothing is planted, the exit-2 path never prints the stuck line — fix now (print it first).
- diff-bug #3: the header says the `--expect-text` checks wait for hydration, but only the text read does — fix now.
- diff-bug #4: the header names the wait only for RevealJS pages — fix now (whole page too).
- diff-bug #5: the stuck line does not say what "not hydrated" means — reject (false as a defect: the
  `nameFailures()` comment and the class list define it).
- diff-bug #6: ios_check's new header sentence has no period — fix now.
- diff-bug #7: the literal `--alone http` percent line duplicates the standing rerun note — reject (planned change:
  AC6 asks for the AC5 runs as command lines; a second run of one command is harmless).
- diff-bug #8: the CLAUDE.md list note leaves out the `|` limit — fix now.
- blame-history #1: the stuck line can fail a one-name run that passed before — reject (planned change: pass 1
  diff-bug #1 asked for this failure).
- blame-history #2: the stuck count and the embed list can disagree — same as diff-bug #1.
- blame-history #3: render_check alone cannot take a name with `|` — reject (planned change: the list is
  render_check's).
- blame-history #4: `fileName()` still catches the bare-`%` decode — reject (a confirmation, no finding).
- blame-history #5: README and DESIGN do not describe the list or the stuck failure — reject (false: those files
  describe the viewer's names, and the list and the wait belong to the check scripts, documented in CLAUDE.md and
  the headers).
- prior-review: no regression found.
- ripple #1: the iphone `percent_test` `--alone file` line has no literal `--alone http` twin — reject (false: the
  standing note "Run each `--alone file` line again with `--alone http`" covers it, as for the other
  self-contained lines).
- ripple #2: row "Name plant slide target" names only exit 2 and a wrong plant — fix now (row reworded).
- Fix-now commits of pass 2: diff-bug #1, #2, #3, #4, #6, #8, ripple #2, fixed c864245. Re-run at c864245: the 25
  swept CLAUDE.md lines exit 0; plants duplink, norole, dupdesc, notoolbar, wrongname (percent_test), the swapped
  revealjs list, and ios_check norole exit 1 with their failure lines; the never-hydrated probe exits 1 with "1
  embed(s) on the page still not hydrated after 10 s".
