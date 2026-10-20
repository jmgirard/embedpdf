# M022: Native embeds on self-contained slides checked

- **Status:** in-progress
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** IP1
- **Resolves:** —
- **Surface tier:** internal — a check script, a test page, and repo docs, with no change to the extension's code
- **Branch/PR:** m022-slides-native-check

## Goal

A check shows that each native embed on the self-contained RevealJS slides shows its in-page PDF, at the page its `page` option names, in Chromium, Firefox, and desktop Safari.

## Scope

**In:** a fourth slide on `selfcontained_slides_test.qmd` with a native `page=2` embed (an `<iframe>` on desktop, D-008); RevealJS support in `tests/native_check.mjs` (go to each embed's slide, fail an embed that is not on the current slide, a `noslide` plant); a probe of the file name that headless Chromium's native viewer gives a saved copy; the CLAUDE.md, DESIGN.md, and README lines this changes.

**Out:**
- A viewer fix. A defect that the new lines find goes back to the plan through the amendment stop.
- A check of the save-control file name. It stays in the candidate row "Check native save names and slide embeds", with the T4 probe's result.
- Native embeds on normal slide decks (`revealjs_test.html`), and render_check or safari_check on slide decks in desktop Safari. These stay in "Check embeds open at their page option" and CLAUDE.md "Still unverified".

## Acceptance criteria

- [ ] AC1: `selfcontained_slides_test.qmd` has a fourth slide with `{{< pdf sample.pdf renderer=native page=2 width=600 height=400 >}}`. After `quarto render`, the CLAUDE.md lines for `selfcontained_slides_test.html` exit 0 with counts changed for that embed. These are the two `render_check.mjs` lines with `--alone file` and again with `--alone http` (desktop `--expect-native 3`, iphone `--expect-native 2`, both `--expect-links 5`), and the two `ios_check.mjs` lines (`--expect-native 2`, `--expect-links 5`).
- [ ] AC2: `node tests/native_check.mjs --browser <b> --page selfcontained_slides_test.html --alone <a> --expect-native 3 --reference sample.pdf` exits 0 for each `<b>` in chromium, firefox, and safari and each `<a>` in file and http (six runs).
- [ ] AC3: With `--plant noslide --plant-at 3` added to the chromium `--alone file` run of AC2, the run exits 1, and its failure names native embed 3 as not on the current slide (`Reveal.getCurrentSlide()`) at its screenshot.
- [ ] AC4: Each of the plants `otherpdf`, `broken`, `nopage`, `object`, `border`, and `fallback`, added to the chromium `--alone file` run of AC2, makes the run exit 1 with a failure that names the planted embed. Each of `otherpdf`, `broken`, `nopage`, and `object`, added to the safari `--alone file` run of AC2, makes the run exit 1 with a mismatch failure for that embed.
- [ ] AC5: The nine `native_check.mjs` lines already in CLAUDE.md (on `page_test.html` and `selfcontained_test.html`) exit 0.
- [ ] AC6: `cairn/DESIGN.md` Known issues has a dated entry on the file name that headless Chromium's native PDF viewer gives a saved copy of a native embed on `selfcontained_test.html` opened alone. The entry gives either the name or the fact that it is still unknown.
- [ ] AC7: Every line that `grep -n -i "revealjs\|slide" CLAUDE.md README.md cairn/DESIGN.md` prints and that this milestone adds or changes is true of the repo at the milestone's head. No line that this grep prints says that no browser checks native embeds on self-contained RevealJS slides, and CLAUDE.md lists the six AC2 lines.

## Coverage

- AC1 → T1
- AC2 → T2, T3
- AC3 → T2, T3
- AC4 → T2, T3
- AC5 → T3
- AC6 → T4
- AC7 → T5

## Tasks

- [x] T1: Add the fourth slide to `selfcontained_slides_test.qmd`, run `quarto render`, change the counts on the CLAUDE.md `render_check.mjs` and `ios_check.mjs` lines for `selfcontained_slides_test.html`, and run those lines (render_check also with `--alone http`).
- [ ] T2: In `tests/native_check.mjs`, on a page with `.reveal .slides`: make Reveal's scale 1 during the run (size the window, else exit 2 with the scale found); before each native embed's state read and screenshot, go to its slide (`Reveal.getIndices`, `Reveal.slide`); fail the embed when `Reveal.getCurrentSlide()` does not hold it; add the `noslide` plant (skip going to the target embed's slide); keep the other plants working per slide; update the header.
- [ ] T3: Run the six AC2 runs, the AC3 and AC4 plant runs, and the nine AC5 lines. Run `node tests/helpers_test.mjs` if a helper changed.
- [ ] T4: Probe in headless Chromium: open `selfcontained_test.html` alone, press the save control of the native viewer of one native embed, and read the saved file's name (CDP download events into a scratch folder). Write the dated DESIGN.md Known issues entry, and log the probe's command and result in the work log.
- [ ] T5: Add the six AC2 lines and the `noslide` plant to CLAUDE.md. Change the DESIGN.md Known issues lines and the CLAUDE.md "Still unverified" bullet that say no browser checks native embeds on self-contained slides. Read each line the AC7 grep prints that this milestone added or changed.

## Work log

- 2026-10-20: created by /milestone-plan.
- 2026-10-20: tier check: not run — work named at the question set.
- 2026-10-20: question set: what to work on — native embeds on self-contained slides; the save-name check stays a candidate unless a probe shows a check can read it.
- 2026-10-20: question set: may Safari runs bring Safari windows to the front and save test PDFs in ~/Downloads without asking again — yes, both.
- 2026-10-20: criteria audit (reduced mode, fresh Opus reader): 3 findings, all fixed. AC3 narrowed to its plant run, AC6 reworded to the entry's content with the probe moved to T4, AC7 narrowed to lines this milestone adds or changes.
- 2026-10-20: collision check: row "Check native save names and slide embeds" absorbed in part (slides; the save-name check stays there); row "Check embeds open at their page option" absorbed in part (an `<iframe>` on slides); M020 and M021 shipped the check this extends; D-006 keeps this gap (unchecked viewer behavior); D-008 sets the element. Not the checker-regress shape: native_check checks the extension's rendered pages, not tracking files.
- 2026-10-20: inbox sweep: 0 open issues, 0 open PRs.
- 2026-10-20: lessons harvested: Reveal.slide before measuring (M002); Firefox profile folder and `pdfjs.viewOnLoad` (M020); Safari saves downloads in ~/Downloads, so download probes run in headless Chromium (M021).
- 2026-10-20: plan gate chose screenshots at Reveal scale 1 over a reference drawn under the slide's own zoom or transform, because the reference and the `<iframe>` box check measure CSS pixels and a match under zoom is unproven; falsified by a native embed that shows its PDF at scale 1 but not under Reveal's zoom or transform at another window size.
- 2026-10-20: plan gate chose extending native_check over render_check (bound to Chromium's CDP) and safari_check (no slide walk), for the reasons M020 gave; falsified by a slide-only behavior that native_check's screenshot comparison cannot see.
- 2026-10-20: no version change planned: test and docs only.
- 2026-10-20: T1 done: fourth slide (`renderer=native page=2 width=600 height=400`) added and rendered; the four render_check lines (desktop and iphone, `--alone file` and `http`) and the two ios_check lines for `selfcontained_slides_test.html` exit 0 with the new counts (native 3 or 2, links 5); the `http` runs log one 404, as before (the page alone has no favicon).
- 2026-10-20: T2 choice: no window size gives Reveal a scale of exactly 1 (scale is the window width x 0.9 / 1050 in headless Chromium 155; 1167 px gives 1.0003), so native_check sets Reveal's `minScale` and `maxScale` to 1 and exits 2 unless `Reveal.getScale()` is then 1 (minor task edit to T2's "size the window").
- 2026-10-20: T2 in progress (header not yet updated): native_check walks to each native embed's slide, re-reads its state there, fails an embed not on the current slide, and has `noslide`. Before the change the chromium file run failed with embed 3 at 0 x 0 and embeds 1 and 2 not matching (Reveal scale 1.0286).
- 2026-10-20: defect found: on `selfcontained_slides_test.html` the `page=2` native `<iframe>` (slide 4, hidden at load) opens at page 1 in headless Chromium 155 (differs 0.1371 from its page-2 reference, the page-1/page-2 share) and shows both pages shrunk at the top in desktop Safari 27.0.1 (differs 0.0447). Firefox 158 passes. A Chromium probe that loads the deck at `#/4` opens the same `<iframe>` at page 2, and one that loads at slide 0 and then goes to slide 4 opens it at page 1, so the cause is the `<iframe>` loading while its slide is hidden. Stopped for the user (plan Out: a viewer fix goes back through the amendment stop).

## Decisions

## Review
