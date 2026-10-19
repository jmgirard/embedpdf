# M008: Name check gaps

- **Status:** in-progress
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

- [ ] AC1: `tests/render_check.mjs` has a `--plant duplink` (with `--expect-name`) that gives the first PDF.js
      embed's toolbar download link an `aria-label` equal to its `title`.
      `node tests/render_check.mjs example.html --expect-native 9 --expect-pdfjs 2 --expect-name sample.pdf --plant duplink`
      exits 1 and prints a failure line saying that embed's download control has a description that repeats its name.
- [ ] AC2: `tests/render_check.mjs` and `tests/ios_check.mjs` each have a `--plant norole` (with `--expect-name`)
      that removes the first PDF.js embed's `role` attribute.
      `node tests/render_check.mjs example.html --expect-native 9 --expect-pdfjs 2 --expect-name sample.pdf --plant norole`
      and `node tests/ios_check.mjs --device "embedpdf iPhone" --page name_test.html --expect-embeds 2 --expect-name "sample copy.pdf" --plant norole`
      each exit 1 and print a failure line saying that embed's role attribute is not group.
- [ ] AC3: `tests/render_check.mjs --expect-name` accepts several names separated by `|`, in the document order of
      the page's PDF.js embeds. A single name still applies to every PDF.js embed. With two or more names, the run
      fails unless the number of names equals the number of PDF.js embeds and embed i is named "PDF: <name i>".
      `node tests/render_check.mjs revealjs_test.html --expect-native 2 --expect-pdfjs 1 --expect-name dummy2.pdf`
      and `node tests/render_check.mjs revealjs_test.html --device iphone --expect-native 1 --expect-pdfjs 2 --expect-name "dummy2.pdf|dummy.pdf"`
      exit 0, and
      `node tests/render_check.mjs revealjs_test.html --device iphone --expect-native 1 --expect-pdfjs 2 --expect-name "dummy.pdf|dummy2.pdf"`
      exits 1.
- [ ] AC4: On a RevealJS page, `tests/render_check.mjs` starts the `--expect-name` check of each slide only once no
      `div.embedpdf` on that slide lacks all of `.embedpdf-pdfjs`, `.embedpdf-native`, and `.embedpdf-failed`, or
      after 10 s.
- [ ] AC5: A new self-contained page `percent_test.qmd` (`embed-resources: true`) shows `files/100%.pdf`, a copy of
      `sample.pdf`, in two `renderer=pdfjs` embeds: one by the path `files/100%25.pdf` and one by `files/100%.pdf`.
      These runs exit 0:
      `node tests/render_check.mjs percent_test.html --alone file --expect-native 0 --expect-pdfjs 2 --expect-pages 2 --expect-name "100%.pdf"`,
      `node tests/render_check.mjs percent_test.html --alone http --expect-native 0 --expect-pdfjs 2 --expect-pages 2 --expect-name "100%.pdf"`,
      `node tests/render_check.mjs percent_test.html --alone file --device iphone --expect-native 0 --expect-pdfjs 2 --expect-pages 2 --expect-name "100%.pdf"`,
      `node tests/ios_check.mjs --device "embedpdf iPhone" --page percent_test.html --alone yes --expect-embeds 2 --expect-name "100%.pdf"`,
      and `node tests/ios_check.mjs --device "embedpdf iPad" --page percent_test.html --alone yes --expect-embeds 2 --expect-name "100%.pdf"`.
      This run exits 1:
      `node tests/render_check.mjs percent_test.html --alone file --expect-native 0 --expect-pdfjs 2 --expect-pages 2 --expect-name "100%.pdf" --plant wrongname`.
- [ ] AC6: CLAUDE.md "Verify before finishing" gains the exit-0 runs of AC3 and AC5 as command lines. Every literal
      `node tests/render_check.mjs` or `node tests/ios_check.mjs` command line in that section that passes
      `--expect-name` or names `revealjs_test.html` exits 0. The header comment of `render_check.mjs` describes
      `duplink`, `norole`, and the `|` list form, and that of `ios_check.mjs` describes `norole`.

## Coverage

- AC1 → T1
- AC2 → T1
- AC3 → T2
- AC4 → T3
- AC5 → T4
- AC6 → T1, T2, T5

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
- [ ] T5: CLAUDE.md. Add the AC3 and AC5 exit-0 lines, and a line in its notes on `percent_test.html`. Run every
      CLAUDE.md line that passes `--expect-name` or names `revealjs_test.html`.

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

## Decisions

## Review
