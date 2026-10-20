# M018: iOS deck and link checks

- **Status:** review
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

- [x] AC1: `tests/ios_check.mjs --expect-pages` takes one whole number or a `|` list of whole numbers. One number applies to every embed not set to `renderer=native`, as before. A list gives one number per such embed in page order, and embed k must have the k-th number of page containers. A list whose length differs from `--expect-embeds`, or an entry that does not match `^\d+$`, exits 2 with a message. Evidence: on `revealjs_test.html` with `--device "embedpdf iPhone" --expect-embeds 2 --expect-native 1`, `--expect-pages "2|1"` exits 0, and `"1|2"` exits 1 with a page-count failure line for each of the two embeds. `"2|1|1"` and `"2|x"` each exit 2.
- [x] AC2: CLAUDE.md "Verify before finishing" holds one `ios_check.mjs` line for `revealjs_test.html` with `--device "embedpdf iPhone"` and one with `--device "embedpdf iPad"`. Each passes `--expect-embeds 2 --expect-native 1 --expect-pages "2|1" --expect-name "dummy.pdf|dummy2.pdf|dummy.pdf"`, and each exits 0 when run. `grep -n "takes one \`--expect-pages\` for all embeds" CLAUDE.md` prints nothing.
- [x] AC3: `tests/ios_check.mjs --expect-links <n>` fails the run unless the page holds exactly n download links, each with a `data:` or `blob:` href. It selects the links as `tests/render_check.mjs` does (`.embedpdf-download, .embedpdf object a[download], a.embedpdf-btn`). Evidence: on `selfcontained_test.html --alone yes` with "embedpdf iPhone" and `--expect-links 4`, `--plant nolink` (removes one such link) exits 1 with a line that names the link count. `--plant linkfile` (sets one such link's href to the PDF's file path) exits 1 with a line that names that href. Each plant exits 2 on a page that holds no such link.
- [x] AC4: The four `ios_check.mjs` lines in CLAUDE.md for `selfcontained_test.html` and `selfcontained_slides_test.html` (iPhone and iPad) pass `--expect-links 4`, and each exits 0 when run.
- [x] AC5: With the final `tests/ios_check.mjs`, each line that `grep -n "node tests/ios_check.mjs.*--expect-pages" CLAUDE.md` prints exits 0 when run. So do the two `example.html` lines at the top of the ios_check list, which pass no `--page`.

## Coverage

- AC1 → T1
- AC2 → T2
- AC3 → T3
- AC4 → T4
- AC5 → T5

## Tasks

- [x] T1: Add the `--expect-pages` list to ios_check: parse it and its exit-2 cases near `tests/ios_check.mjs:278`, check each embed against its own entry at the `e.pages !== expectPages` site (`tests/ios_check.mjs:997`), and update the header comment. Run the AC1 runs.
- [x] T2: Add the two `revealjs_test.html` ios_check lines to CLAUDE.md and run both. If the deck needs more than the 180 s report timeout, add `--timeout` to the lines. Replace the CLAUDE.md sentence that says the page has no ios_check line.
- [x] T3: Add `--expect-links` to ios_check. The probe reads the links by render_check's selector, with each href's scheme. Node checks the count and the schemes. Add the plants `nolink` and `linkfile` and update the header comment. Run the AC3 runs.
- [x] T4: Add `--expect-links 4` to the four self-contained ios_check lines in CLAUDE.md and run them.
- [x] T5: Run the AC5 lines, then every other ios_check line in CLAUDE.md. Search README.md, cairn/DESIGN.md, and CLAUDE.md for text that says iOS does not check `revealjs_test.html` or that download links are counted only in Chromium, and correct what the search finds.

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
- 2026-10-19: T3 done: ios_check `--expect-links` reads the page's links by render_check's selector at report time, and `linkfile` sets the first link's href to its download name. On selfcontained_test.html `--alone yes` (iPhone, `--expect-links 4`): no plant exit 0 with 4 `blob:` links, `nolink` exit 1 "expected 4 download links, found 3", `linkfile` exit 1 naming href "sample.pdf". On native.html, which holds no embedpdf link, both plants exit 2 "found nothing to plant in".
- 2026-10-19: T4 done: the four self-contained ios_check lines in CLAUDE.md pass `--expect-links 4`, and all four exit 0.
- 2026-10-19: T5 done: all 30 `node tests/ios_check.mjs` lines in CLAUDE.md exit 0 on the first run with the ios_check.mjs of commit 852aea3 (4 s to 19 s each). A search of README.md, cairn/DESIGN.md, and CLAUDE.md found no text saying iOS does not check revealjs_test.html or that download links are counted only in Chromium. CLAUDE.md's new sentence was rewrapped.
- 2026-10-19: claim audit: not owed — internal tier.
- 2026-10-19: implement done, status review.

## Decisions

## Review

Evidence at commit 30d3515, 2026-10-19, from one script run in the iOS 27.0 simulators.

- AC1: revealjs_test.html, iPhone, `--expect-embeds 2 --expect-native 1`: `"2|1"` exit 0 (18 s). `"1|2"` exit 1 with "embed 2: 2 page containers, expected 1" and "embed 3: 1 page containers, expected 2". `"2|1|1"` exit 2 "--expect-pages gives 3 counts for --expect-embeds 2". `"2|x"` exit 2 "--expect-pages needs a whole number, or a "|" list of whole numbers".
- AC2: `grep -c` finds both CLAUDE.md lines (161 and 162) with the AC2 flags verbatim. Each exits 0 (18 s iPhone, 14 s iPad). `grep -n "takes one \`--expect-pages\` for all embeds" CLAUDE.md` prints nothing.
- AC3: selfcontained_test.html `--alone yes`, iPhone, `--expect-links 4`: `--plant nolink` exit 1 "expected 4 download links, found 3". `--plant linkfile` exit 1 "download link href "sample.pdf" is not a data: or blob: address". On native.html (no embedpdf link), `--expect-embeds 0 --expect-links 0`, each plant exits 2 "found nothing to plant in". The diff-bug lens read the selector in `tests/ios_check.mjs` as equal to render_check's at `tests/render_check.mjs:1258`.
- AC4: `grep -c` finds 4 self-contained ios_check lines with `--expect-links 4` (CLAUDE.md:157 to 160). Each exits 0 (7 s, 6 s, 18 s, 15 s).
- AC5: all 30 `node tests/ios_check.mjs` lines in CLAUDE.md exit 0. These include the 10 `--expect-pages` lines and the two `example.html` lines (72, 73), so they cover every AC5 line.
- Consistency gate: `cairn_validate.py` all checks passed. The generic profile names no toolchain checks.
- spawned: diff-bug, blame-history, prior-review, ripple
- diff-bug #1: an `--expect-pages` list shorter than the embeds found gives "expected NaN page containers" beside the count failure — fix now.
- diff-bug #2: `--expect-links` is not refused with `--remote`, `--missing-pdfs`, or `--expect-download`, and on selfcontained_failed_test.html the "Download the PDF" link has no matched class, so `--expect-links 0` passes there; render_check refuses none either — follow-up, row "iOS link check gaps".
- diff-bug #3: the header says `linkfile` uses the PDF's file name, but the code falls back to "sample.pdf" when a link has no download name — fix now.
- diff-bug #4: a link plant on a run that stops with an embed not hydrated fails on that stop (exit 1), not with exit 2 — follow-up, row "iOS link check gaps".
- diff-bug #5: the rewritten exit-summary comment line is 97 characters — fix now (rewrapped with the comment fixes).
- diff-bug #6: CLAUDE.md does not describe `--expect-links` or the `nolink` and `linkfile` plants — fix now.
- diff-bug #7: a one-entry `--expect-pages` list counts as one count for every embed — reject, planned change: AC1 defines one number that way.
- blame-history #1: the link selector is a copy of render_check's string, so an edit to one splits the two checks — follow-up, row "iOS link check gaps".
- blame-history #2: reflowed comment lines run past 80 columns — fix now (rewrapped).
- blame-history #3: the `--expect-pages` header entry changes the flag column layout — reject, style.
- prior-review #1: the revealjs_test.html lines keep the 180 s report timeout while a deck slide can take 50 s — follow-up, already held by row "Deck walk follow-ups", which names that timeout (no edit).
- prior-review #2: the `--expect-links` code comment says each link holds "the PDF held in the page", but only the href scheme is checked — fix now.
- prior-review #3: same as diff-bug #3 — fix now.
- prior-review #4: `--expect-links` counts links in hidden RevealJS slides too — reject, planned change: AC3 counts the page's links as render_check does.
- ripple #1: candidate row "iOS slide deck gaps" in cairn/ROADMAP.md is now stale — reject, planned change: post-merge hygiene graduates that row.
