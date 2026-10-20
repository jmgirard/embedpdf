# M018: iOS deck and link checks

- **Status:** in-progress
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** internal — test scripts and CLAUDE.md check lines change, and the extension does not
- **Branch/PR:** m018-ios-deck-and-links

## Goal

`tests/ios_check.mjs` checks `revealjs_test.html` and counts the download links of self-contained pages in Safari on iPhone and iPad.

## Scope

**In:** absorbs the candidate row "iOS slide deck gaps" in full. `--expect-pages` in ios_check takes one page count per embed. CLAUDE.md gains iPhone and iPad ios_check lines for `revealjs_test.html`. ios_check gains `--expect-links`, with two plants, and the four self-contained ios_check lines in CLAUDE.md pass it.

**Out:**
- The fixed pauses and the 180 s report timeout of ios_check's deck walk stay as they are. They live in the row "Deck walk follow-ups".
- render_check's `--expect-pages` stays one number. Its `revealjs_test.html` lines pass no `--expect-pages` and still check the ink of every page, so no row holds this.
- `--expect-links` on the `selfcontained_failed_test.html` and `percent_test.html` ios_check lines. render_check does not pass it on those pages either, so no row holds this.
- Desktop Safari on a slide deck stays in CLAUDE.md "Still unverified".

## Acceptance criteria

- [ ] AC1: `tests/ios_check.mjs --expect-pages` takes one whole number or a `|` list of whole numbers. One number applies to every embed not set to `renderer=native`, as before. A list gives one number per such embed in page order, and embed k must have the k-th number of page containers. A list whose length differs from `--expect-embeds`, or an entry that does not match `^\d+$`, exits 2 with a message. Evidence: on `revealjs_test.html` with `--device "embedpdf iPhone" --expect-embeds 2 --expect-native 1`, `--expect-pages "2|1"` exits 0, and `"1|2"` exits 1 with a page-count failure line for each of the two embeds. `"2|1|1"` and `"2|x"` each exit 2.
- [ ] AC2: CLAUDE.md "Verify before finishing" holds one `ios_check.mjs` line for `revealjs_test.html` with `--device "embedpdf iPhone"` and one with `--device "embedpdf iPad"`. Each passes `--expect-embeds 2 --expect-native 1 --expect-pages "2|1" --expect-name "dummy.pdf|dummy2.pdf|dummy.pdf"`, and each exits 0 when run. `grep -n "takes one \`--expect-pages\` for all embeds" CLAUDE.md` prints nothing.
- [ ] AC3: `tests/ios_check.mjs --expect-links <n>` fails the run unless the page holds exactly n download links, each with a `data:` or `blob:` href. It selects the links as `tests/render_check.mjs` does (`.embedpdf-download, .embedpdf object a[download], a.embedpdf-btn`). Evidence: on `selfcontained_test.html --alone yes` with "embedpdf iPhone" and `--expect-links 4`, `--plant nolink` (removes one such link) exits 1 with a line that names the link count. `--plant linkfile` (sets one such link's href to the PDF's file path) exits 1 with a line that names that href. Each plant exits 2 on a page that holds no such link.
- [ ] AC4: The four `ios_check.mjs` lines in CLAUDE.md for `selfcontained_test.html` and `selfcontained_slides_test.html` (iPhone and iPad) pass `--expect-links 4`, and each exits 0 when run.
- [ ] AC5: With the final `tests/ios_check.mjs`, each line that `grep -n "node tests/ios_check.mjs.*--expect-pages" CLAUDE.md` prints exits 0 when run. So do the two `example.html` lines at the top of the ios_check list, which pass no `--page`.

## Coverage

- AC1 → T1
- AC2 → T2
- AC3 → T3
- AC4 → T4
- AC5 → T5

## Tasks

- [x] T1: Add the `--expect-pages` list to ios_check: parse it and its exit-2 cases near `tests/ios_check.mjs:278`, check each embed against its own entry at the `e.pages !== expectPages` site (`tests/ios_check.mjs:997`), and update the header comment. Run the AC1 runs.
- [x] T2: Add the two `revealjs_test.html` ios_check lines to CLAUDE.md and run both. If the deck needs more than the 180 s report timeout, add `--timeout` to the lines. Replace the CLAUDE.md sentence that says the page has no ios_check line.
- [ ] T3: Add `--expect-links` to ios_check. The probe reads the links by render_check's selector, with each href's scheme. Node checks the count and the schemes. Add the plants `nolink` and `linkfile` and update the header comment. Run the AC3 runs.
- [ ] T4: Add `--expect-links 4` to the four self-contained ios_check lines in CLAUDE.md and run them.
- [ ] T5: Run the AC5 lines, then every other ios_check line in CLAUDE.md. Search README.md, cairn/DESIGN.md, and CLAUDE.md for text that says iOS does not check `revealjs_test.html` or that download links are counted only in Chromium, and correct what the search finds.

## Work log

- 2026-10-19: created by /milestone-plan.
- 2026-10-19: tier check: not run — work named at the question set.
- 2026-10-19: question set: which candidate to plan — "iOS slide deck gaps". How much of the row — the whole row.
- 2026-10-19: collision check: absorbs the candidate row "iOS slide deck gaps" in full. M016 (done) shipped the deck walk that T2 runs. The row "Deck walk follow-ups" stays separate and is cross-referenced in Out. D-001 to D-005 do not overlap. Inbox: 0 open issues and 0 open PRs.
- 2026-10-19: checker-regress shape not hit: ios_check checks the extension's rendering in Safari, not repo-internal tracking files.
- 2026-10-19: criteria audit (reduced, fresh Opus reader): AC1's runs lacked `--expect-embeds 2 --expect-native 1` (default 10), fixed, and "not a whole number" became `^\d+$`. AC2's grep matched nothing before the change because CLAUDE.md breaks that sentence across lines, so it now greps a phrase on one line. AC5's sweep of about 28 lines across servers and both simulators was narrowed to the `--expect-pages` lines and the two `example.html` lines, and T5 runs the rest. AC3 and AC4: no finding.
- 2026-10-19: plan gate chose a `|` list in `--expect-pages` over a new per-embed flag, because `--expect-name` and `--expect-download` already take `|` lists in page order. Falsified by a page whose report lists embeds out of page order.
- 2026-10-19: lessons harvested: M016 (the iPhone simulator shows RevealJS in its scrolled view, and `Reveal.getSlides()` skips uncounted slides), M010 (the first `simctl openurl` after a boot can time out, and a repeat passes).
- 2026-10-19: no version bump and no changelog entry: the viewer does not change, and the profile's changelog slot is none.
- 2026-10-19: T1 done: `--expect-pages` takes a `|` list, judged by each embed's position among the embeds not set to `renderer=native`. On revealjs_test.html (iPhone, `--expect-embeds 2 --expect-native 1`): "2|1" exit 0 in 17 s, "1|2" exit 1 naming embeds 2 and 3, "2" exit 1 naming embed 3, "2|1|1" and "2|x" exit 2.
- 2026-10-19: T2 done: CLAUDE.md gains the iPhone and iPad revealjs_test.html ios_check lines, both exit 0 (no `--timeout` needed), and its "has no ios_check line" sentence now says how `--expect-pages` counts. The simple-english lint hook reports 38 hits in CLAUDE.md, the same count as before this edit, so the added text adds none and the older text stays as it is.

## Decisions

## Review
