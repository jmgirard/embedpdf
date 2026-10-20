# M022: Native embeds on self-contained slides checked

- **Status:** review
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** IP1
- **Resolves:** —
- **Surface tier:** user-facing — the viewer changes for every page with a native `<iframe>` embed (amended 2026-10-20; was internal)
- **Branch/PR:** m022-slides-native-check

## Goal

A check shows that each native embed on the self-contained RevealJS slides shows its in-page PDF, at the page its `page` option names, in Chromium, Firefox, and desktop Safari.

## Scope

**In:** a fourth slide on `selfcontained_slides_test.qmd` with a native `page=2` embed (an `<iframe>` on desktop, D-008); RevealJS support in `tests/native_check.mjs` (go to each embed's slide, fail an embed that is not on the current slide, a `noslide` plant); a probe of the file name that headless Chromium's native viewer gives a saved copy; the CLAUDE.md, DESIGN.md, and README lines this changes. A viewer fix (amended 2026-10-20): a native `<iframe>` whose `page` option is over 1, on a slide of a self-contained RevealJS deck that RevealJS does not display at load (a slide more than its view distance from the first slide shown), opens at that page when native_check's walk shows the slide (viewer 1.2.8).

**Out:**
- A check of other routes and places. A direct jump to such a slide from the first slide, slides hidden at load within the view distance, other hidden parts of a page (a tab not shown at load, for example), and slides of a deck that is not self-contained run the same code but have no check. DESIGN.md Known issues records this.
- A check of the save-control file name. It stays in the candidate row "Check native save names and slide embeds", with the T5 probe's result.
- Native embeds on normal slide decks (`revealjs_test.html`), and render_check or safari_check on slide decks in desktop Safari. These stay in "Check embeds open at their page option" and CLAUDE.md "Still unverified".

## Acceptance criteria

- [x] AC1: `selfcontained_slides_test.qmd` has a fourth slide with `{{< pdf sample.pdf renderer=native page=2 width=600 height=400 >}}`. After `quarto render`, the CLAUDE.md lines for `selfcontained_slides_test.html` exit 0 with counts changed for that embed. These are the two `render_check.mjs` lines with `--alone file` and again with `--alone http` (desktop `--expect-native 3`, iphone `--expect-native 2`, both `--expect-links 5`), and the two `ios_check.mjs` lines (`--expect-native 2`, `--expect-links 5`).
- [x] AC2: `node tests/native_check.mjs --browser <b> --page selfcontained_slides_test.html --alone <a> --expect-native 3 --reference sample.pdf` exits 0 for each `<b>` in chromium, firefox, and safari and each `<a>` in file and http (six runs). With the page rendered with the v1.2.7 `embedpdf-viewer.js`, the chromium and safari runs, with `--alone file` and with `--alone http`, exit 1 with a mismatch failure for native embed 3.
- [x] AC3: With `--plant noslide --plant-at 3` added to the chromium `--alone file` run of AC2, the run exits 1, and its failure names native embed 3 as not on the current slide (`Reveal.getCurrentSlide()`) at its screenshot.
- [x] AC4: Each of the plants `otherpdf`, `broken`, `nopage`, `object`, `border`, and `fallback`, added to the chromium `--alone file` run of AC2, makes the run exit 1 with a failure that names the planted embed. Each of `otherpdf`, `broken`, `nopage`, and `object`, added to the safari `--alone file` run of AC2, makes the run exit 1 with a mismatch failure for that embed.
- [x] AC5: The nine `native_check.mjs` lines already in CLAUDE.md (on `page_test.html` and `selfcontained_test.html`) exit 0.
- [x] AC6: `cairn/DESIGN.md` Known issues has a dated entry on the file name that headless Chromium's native PDF viewer gives a saved copy of a native embed on `selfcontained_test.html` opened alone. The entry gives either the name or the fact that it is still unknown.
- [x] AC7: Every line that `grep -n -i "revealjs\|slide" CLAUDE.md README.md cairn/DESIGN.md` prints and that this milestone adds or changes is true of the repo at the milestone's head. No line that this grep prints says that no browser checks native embeds on self-contained RevealJS slides, and CLAUDE.md lists the six AC2 lines.
- [x] AC8: The viewer is 1.2.8 (`version:` in `_extensions/embedpdf/_extension.yml` and the `add_html_dependency` version in `_extensions/embedpdf/embedpdf.lua`). Each `node tests/render_check.mjs`, `ios_check.mjs`, `name_rule_test.mjs`, `safari_check.mjs`, `native_check.mjs`, and `frame_rule_check.mjs` line in a fenced block of CLAUDE.md "Verify before finishing" at commit 6a70301, with AC1's count changes, exits 0, and so do the six AC2 lines. `pandoc lua tests/test_shortcode.lua` prints `0 failed`.

## Coverage

- AC1 → T1
- AC2 → T2, T3, T4
- AC3 → T2, T4
- AC4 → T2, T4
- AC5 → T4
- AC6 → T5
- AC7 → T6
- AC8 → T3, T7

## Tasks

- [x] T1: Add the fourth slide to `selfcontained_slides_test.qmd`, run `quarto render`, change the counts on the CLAUDE.md `render_check.mjs` and `ios_check.mjs` lines for `selfcontained_slides_test.html`, and run those lines (render_check also with `--alone http`).
- [x] T2: In `tests/native_check.mjs`, on a page with `.reveal .slides`: make Reveal's scale 1 during the run (size the window, else exit 2 with the scale found); before each native embed's state read and screenshot, go to its slide (`Reveal.getIndices`, `Reveal.slide`); fail the embed when `Reveal.getCurrentSlide()` does not hold it; add the `noslide` plant (skip going to the target embed's slide); keep the other plants working per slide; update the header.
- [x] T3: Fix the viewer (`embedpdf-viewer.js`) so a native `<iframe>` with `page` over 1 opens at that page when its slide is shown after a load with no size; bump `version:` in `_extension.yml` and `add_html_dependency` in `embedpdf.lua` to 1.2.8; run `quarto render` and `pandoc lua tests/test_shortcode.lua`. Render the page once with the v1.2.7 viewer for AC2's failing runs. Run the probe of a direct jump from slide 0 to slide 4 on the fix in Chromium and log its result.
- [x] T4: Run the six AC2 runs, the AC3 and AC4 plant runs, and the nine AC5 lines. Run `node tests/helpers_test.mjs` if a helper changed.
- [x] T5: Probe in headless Chromium: open `selfcontained_test.html` alone, press the save control of the native viewer of one native embed, and read the saved file's name (CDP download events into a scratch folder). Write the dated DESIGN.md Known issues entry, and log the probe's command and result in the work log.
- [x] T6: Add the six AC2 lines and the `noslide` plant to CLAUDE.md. Change the DESIGN.md Known issues lines and the CLAUDE.md "Still unverified" bullet that say no browser checks native embeds on self-contained slides, and record the unchecked routes and places of Scope Out. Read each line the AC7 grep prints that this milestone added or changed.
- [x] T7: Run every check line AC8 names, and also each re-run that the prose of CLAUDE.md "Verify before finishing" asks for after a viewer change (`--alone http`, `--device mac-safari`, `--device windows-touch`, `--device ipad`).

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
- 2026-10-20: amendment stop: the user chose "Fix it in M022" over fixing it separately first or stopping.
- 2026-10-20: substantive amendment: viewer fix added to Scope In (viewer 1.2.8); surface tier internal → user-facing; AC2 gains the v1.2.7 failing runs; AC8 added (version 1.2.8 and the check lines); Out "A viewer fix" replaced by the unchecked routes and places; tasks renumbered (new T3 fix, T4 runs, T5 probe, T6 docs, T7 full check list) with Coverage.
- 2026-10-20: re-audit: AC8 (full) — 5 findings: AC8 read a file the milestone edits (pinned to CLAUDE.md at 6a70301); Scope promised tabs and other hidden parts with no probe (narrowed to self-contained slides); AC2 showed no failure before the fix (clause added); instrument and proportionality findings fixed by the same edits.
- 2026-10-20: re-audit: AC8 (full) — 1 finding: the fenced lines leave out the re-runs CLAUDE.md prose asks for; answered, not fixed: AC8 stays bounded to the fenced lines, and the re-runs go into T7 and the review procedure.
- 2026-10-20: re-audit: AC2 (full) — 1 finding: the v1.2.7 failure was shown only with `--alone file`, and a slide hidden within the view distance was unprobed; fixed: `--alone http` added, Scope narrowed to slides RevealJS does not display at load.
- 2026-10-20: re-audit: AC2 (full) — 1 finding: the walk reaches slide 4 from slide 2, so a direct jump from slide 0 is untested on the fix; answered, not fixed (AC2 at its re-entry bound): Scope narrowed to the walk's route, the direct jump moved to Scope Out and DESIGN Known issues, and T3 probes it on the fix.
- 2026-10-20: T2 done: header documents the slide walk, the scale-1 setting, and the `noslide` plant.
- 2026-10-20: T3 choice: `hydrateNative` gives a framed embed its `src` at once when the `<iframe>` has a box, else on the first ResizeObserver callback that sees a nonzero `offsetWidth` and `offsetHeight`; rejected reloading the frame on each show (a second load of every shown frame, and a reload resets the reader's page); falsified by a frame that gets a box before its slide is shown and still opens at page 1.
- 2026-10-20: T3 done: viewer 1.2.8 (`_extension.yml`, `embedpdf.lua`); `pandoc lua tests/test_shortcode.lua` 162 passed, 0 failed; `quarto render` clean. With the v1.2.7 render (T1 commit), the chromium and safari slide runs, `--alone file` and `http`, each exit 1 on native embed 3 (chromium differs 0.1371, safari 0.0447). With 1.2.8 the six AC2 runs exit 0. Direct-jump probe (Chromium, deck loaded at slide 0, `Reveal.slide(4)`, screenshot of the `<iframe>` after 4 s; scratch script `probe2.mjs`): page 2 shown on 1.2.8, page 1 on 1.2.7.
- 2026-10-20: T4 fix: with 1.2.8 a hidden `<iframe>` has no address until shown, so the `nopage` and `object` plants copied an empty address on the slide page (a false reason); native_check now plants on a slide deck when the walk shows the target's slide, after its address arrives (at most 5 s), and before the walk on other pages.
- 2026-10-20: T4 done: `noslide --plant-at 3` (chromium file) exits 1 naming embed 3 "not the current slide"; chromium plants otherpdf, broken (embed 1, mismatch), nopage (fragment and mismatch), object (element), border (border, box, mismatch), fallback (placeholder shows) each exit 1; safari otherpdf, broken, nopage, object each exit 1 with a mismatch for the planted embed. The nine CLAUDE.md native_check lines and the six AC2 runs exit 0. `nopage` on `page_test.html` still fails; `noslide` there exits 2. No helper changed.
- 2026-10-20: T5 done: probe (scratch `saveprobe.mjs`: headless Chromium 155, `selfcontained_test.html` copied alone and opened as `file:`, CDP `Browser.setDownloadBehavior` with events, `Runtime.evaluate` in the first `chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai/index.html` target clicking `pdf-viewer` > `viewer-toolbar` > `viewer-download-controls` > `#save`): `Browser.downloadWillBegin` gave `03acb7cf-e9fe-49b4-b425-fa1a410248fe.pdf` for `blob:null/03acb7cf-…`; the saved file has the bytes of `sample.pdf` (`cmp`). DESIGN Known issues entry added. A check can read this name in Chromium, so the candidate row's save-name part is checkable there.
- 2026-10-20: T6 done: CLAUDE.md gains the six slide lines, the deck walk, and `noslide`; its two "Still unverified" bullets now name what stays unchecked. DESIGN Known issues: slides line corrected, the hidden-load result and the unchecked routes added. README line 86 no longer says slides were not checked, names the save-name result, and the `page` row says what 1.2.8 changes. The AC7 grep's added lines read against the repo; `example.qmd`, `native.qmd`, `revealjs_test.qmd` hold no such claim. The simple-english lint hook flags CLAUDE.md (39) and README.md (11) hits that predate this milestone; the new lines add none.
- 2026-10-20: T7 done: all 125 lines (the 119 fenced check lines of CLAUDE.md at 6a70301 with AC1's counts, the prose re-runs, and the six AC2 lines; scratch `lines.py` builds the list) exit 0 with viewer 1.2.8, 1,243 s in all.
- 2026-10-20: claim audit (Opus reader) read 38 claims, 4 false and 1 loose, all corrected: README `page` row (slide not displayed at load, view distance), README line 86 (walk is slides 1, 2, 4; save name scoped to one Chromium probe), CLAUDE.md "Still unverified" (the walk), two native_check comments; DESIGN Known issues gets the same walk wording. Re-read pending (checkpoint).
- 2026-10-20: claim audit: 38 claims read, 5 corrected — README.md, CLAUDE.md, tests/native_check.mjs; the re-read found all corrections hold and one more over-broad DESIGN Known issues line (save name), now scoped to headless Chromium 155.
- 2026-10-20: status → review.
- 2026-10-20: review: Scope In's "more than its view distance" is off by one (Reveal hides a slide at distance ≥ its view distance); plan-owned wording left as is, README corrected (diff-bug #3).
- 2026-10-20: step-7 approval: m022-slides-native-check approved for merge

## Decisions

## Review

- Review pass 1, 2026-10-20, branch at 86dc974 (main 180552b, not moved).
- AC6: `cairn/DESIGN.md:209-214` Known issues entry, observed 2026-10-20, gives the name headless Chromium 155 gave the saved copy (`03acb7cf-e9fe-49b4-b425-fa1a410248fe.pdf`) for the first native embed of `selfcontained_test.html` opened alone. Pass.
- AC7: `grep -n -i "revealjs\|slide" CLAUDE.md README.md cairn/DESIGN.md` prints 51 lines; the lines this milestone added or changed (`git diff main...HEAD`) were read against the repo (claim audit plus this read); the only grep hits for "any browser / not checked this way / no browser / were not checked" are README.md:86's "Firefox and Safari were not checked" about the save button, not slides; CLAUDE.md holds the six AC2 lines (exact-line `grep -c` = 6). Pass.
- Consistency gate: `cairn_validate.py` all checks passed (1 advisory: 8 criteria > 7); profile `generic` names no toolchain checks; no principle changed, `cairn_impact` skipped.
- spawned: diff-bug, blame-history, prior-review, ripple.
- A first full check run (41 of 125 lines, all exit 0) was stopped because fix-now work changed the viewer; the evidence below is from runs after the fixes.
- diff-bug #1: `applyPlant` goes on after 5 s with an empty address, so a plant can fail for another reason — fix now, fixed 99739ed: exits 2 (SetupError).
- diff-bug #2: a deck embed that is not the plant target gets no wait for its `<iframe>` address — fix now, fixed 99739ed: the walk waits up to 5 s for it.
- diff-bug #3: the passing runs load the slide-4 `<iframe>` when slide 2 is current (slide 4 then displayed, opacity 0), and README's "more than the view distance" is off by one (Reveal hides distance ≥ 3) — fix now, fixed 99739ed: README says "at least"; the Scope In text has the same off-by-one, left as plan-owned wording (logged in the work log).
- diff-bug #4: DESIGN Known issues and the ROADMAP releases row say 1.2.7 — fix now, fixed 99739ed: 1.2.8.
- diff-bug #5: the viewer tests "has a box", not "is visible", so a frame with `visibility:hidden`, opacity 0, or in a closed `<details>` loads at hydration — follow-up: new candidate row at hygiene.
- diff-bug #6: no ResizeObserver feature guard; a browser without it throws and leaves an empty `<iframe>` — fix now, fixed 99739ed: such a browser loads at once, as in 1.2.7.
- diff-bug #7: an observer of a frame removed before it gets a box stays — follow-up: new candidate row (a removed 0 x 0 frame gets no callback, so an `isConnected` check does not help).
- diff-bug #8: `src` set after `appendChild` gives an initial about:blank — reject (false: no history entry and no `load` listener, as the reviewer found).
- diff-bug #9: "slides 1, 2, and 4" are 0-based with the title as 0, unstated — fix now, fixed 99739ed: README, CLAUDE.md, DESIGN say so.
- blame-history #1: the same slide numbering — fix now, fixed 99739ed (with diff-bug #9).
- blame-history #2: README says slides were checked "in the same way" but only at Reveal scale 1 — fix now, fixed 99739ed: README, CLAUDE.md "Still unverified", DESIGN, and the native_check header say other scales are not checked.
- blame-history #3: the T3 work-log falsifier line reads as falsifying the chosen trigger — reject (false: the line names the evidence that would falsify the chosen approach, the form the plan template asks for; the work log is append-only).
- blame-history #4: `noslide` passes silently if `showSlide` returns null — fix now, fixed 99739ed: an embed whose slide Reveal did not show in 5 s fails.
- blame-history #5: `applyPlant` empty address — fix now, fixed 99739ed (with diff-bug #1).
- blame-history #6: a framed embed hidden at load on a normal page has an empty `src` until shown, unchecked — follow-up: new candidate row (Scope Out names it; DESIGN Known issues lists it).
- blame-history #7: "no window size gives a scale of exactly 1" is too broad — fix now, fixed 99739ed: scoped to Quarto's 1050 x 700 deck with margin 0.1 (scale = window size x 0.9 / deck size, so exactly 1 needs 1166.67 or 777.78 px).
- blame-history #8: CLAUDE.md "the self-contained page" lost the file name — reject (planned change: the sentence now covers two self-contained pages).
- prior-review #1: the walk uses `Reveal.getSlides()`, which leaves out uncounted slides (M016 finding and lesson) — fix now, fixed 99739ed: the walk finds slides as sections with no section inside.
- prior-review #2: a frame in a container that is never shown never loads — reject (planned change: the fix loads the PDF only once the frame has a box).
- ripple #1: row "Check native save names and slide embeds" says slides are unchecked and the save name unknown — fix at step 9 hygiene (records-hygiene §1 narrows the row).
- ripple #2: row "Check embeds open at their page option" says no test page puts such an `<iframe>` on slides — fix at step 9 hygiene (narrowed there).
- ripple #3: DESIGN releases entry says 1.2.7 — fix now, fixed 99739ed (with diff-bug #4).
- ripple #4: ROADMAP releases row says 1.2.7 — fix now, fixed 99739ed (with diff-bug #4).
- ripple #5: ROADMAP row cites `embedpdf-viewer.js:411`, already wrong — fix now, fixed 99739ed: names `hydratePdfjs` instead.
- Evidence runs after 99739ed (scratch `review_runs.sh`, 2026-10-20; Chromium 155, Firefox 158, desktop Safari 27.0.1, iOS 27.0 simulators):
- AC1: the four render_check lines (desktop and iphone, `--alone file` and `http`) and the two ios_check lines for `selfcontained_slides_test.html`, with native 3/2 and links 5, exit 0; `selfcontained_slides_test.qmd` holds the fourth slide. Pass.
- AC2: the six native_check runs exit 0. With `main`'s v1.2.7 `embedpdf-viewer.js` copied in and the page rendered, chromium file and http exit 1 with "native embed 3: does not match the <iframe> reference at #page=2 (differs: 0.1371)", safari file and http exit 1 with the same failure (0.0447); the new viewer was then restored and the page re-rendered, `git status` clean. Pass.
- AC3: `--plant noslide --plant-at 3` (chromium file) exits 1 with "native embed 3: its slide is not the current slide (Reveal.getCurrentSlide()) at its screenshot". Pass.
- AC4: chromium plants each exit 1 naming the planted embed: otherpdf (embed 1 mismatch 0.0784), broken (embed 1 mismatch 0.8844), nopage (embed 3 fragment and mismatch), object (embed 3 element), border (embed 3 border, box, mismatch), fallback (embed 3 placeholder shows); safari otherpdf (embed 1, 0.1051), broken (embed 1, 0.0804), nopage (embed 3, 0.0947), object (embed 3, 0.0947) each exit 1 with a mismatch. Pass.
- AC5: the nine native_check lines on `page_test.html` and `selfcontained_test.html` exit 0 (within the AC8 run). Pass.
- AC8: `_extension.yml` and `embedpdf.lua` read 1.2.8; all 125 lines (the 119 that `lines.py` builds from CLAUDE.md at 6a70301, its fenced check lines plus the prose re-runs, with AC1's counts, and the six AC2 lines) exit 0, 1,207 s; `pandoc lua tests/test_shortcode.lua` 162 passed, 0 failed. Pass.
