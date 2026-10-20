<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section. -->
# M024: Safari names in the iOS simulators

- **Status:** planned
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** IP1
- **Resolves:** —
- **Surface tier:** user-facing — README's statement of what was checked in iOS Safari changes
- **Branch/PR:** —

## Goal

Safari in the iOS 27.0 iPhone and iPad simulators is checked for the names it gives embeds, toolbar controls, and the page indicator, through `tests/safari_check.mjs --target simulator`.

## Scope

**In:** turn on Safari's Remote Automation setting in the "embedpdf iPhone"
and "embedpdf iPad" simulators and write down how; make
`safari_check.mjs --target simulator` pass on `example.html` and
`page_test.html` on both; update README, CLAUDE.md, the script's header, and
the M010 lesson. This also covers the part of the candidate row "Close the
name and indicator check gaps" that says an indicator that never updates on
scroll passes in Safari, since the simulator runs read "Page 2 of n" after a
scroll.

**Out:**
- Page text read through WebDriver, and slide decks (safari_check exits 2 on
  a deck): they stay in CLAUDE.md "Still unverified".
- A name that the viewer gets wrong on iOS: that is a viewer defect, so the
  run stops (T2) and it goes to `/hotfix`.
- The `--target page-script` probe: it stays as it is (iOS 27.0 Safari has no
  `Element.prototype.computedName`).
- The rest of the row "Close the name and indicator check gaps": it stays in
  that row.

## Acceptance criteria

- [ ] AC1: On `example.html` and `page_test.html`, in the iOS 27.0 "embedpdf iPhone" and "embedpdf iPad" simulators, Safari's names as WebDriver's Get Computed Label reads them match what `tests/safari_check.mjs` expects: each native `<object>` and each PDF.js embed has its `--expect-name` name; each control of each PDF.js toolbar has its title as its name; and each toolbar's page indicator, read as Safari names it with role heading, reads "Page 1 of n" at the top of its pages and "Page 2 of n" after a scroll to page 2, where page 1 can scroll above the middle of its frame. Shown by the two lines below, each run on both simulators (four runs), exiting 0:
      `node tests/safari_check.mjs --target simulator --device "<simulator>" --expect-native 1 --expect-pdfjs 10 --expect-name sample.pdf`
      `node tests/safari_check.mjs --target simulator --device "<simulator>" --page page_test.html --expect-native 2 --expect-pdfjs 1 --expect-name sample.pdf`
- [ ] AC2: CLAUDE.md gives the steps that turn on Safari's Remote Automation setting in the two simulators, next to their `simctl create` lines. On the "embedpdf iPhone" simulator with the setting off, the `example.html` line of AC1 exits 2 and prints safaridriver's `POST /session` error that no session host matches; after those steps the same line exits 0. The iPad's steps are shown working only by its AC1 runs.
- [ ] AC3: README.md's screen-reader item and CLAUDE.md's "Still unverified" list state, with the date of the runs, that in the iOS 27.0 simulators Safari's names for native `<object>` and PDF.js embeds, toolbar controls, and the page indicator (read with role heading) were checked through WebDriver on `example.html` and `page_test.html`. `grep -n -E 'session hosts|"Remote Automation" setting was not turned on|The names that Safari gives screen readers were not checked there|two ways to read those names failed' README.md CLAUDE.md cairn/DESIGN.md cairn/LESSONS.md tests/safari_check.mjs` prints nothing.

## Coverage

- AC1 → T1, T2, T3
- AC2 → T1, T4
- AC3 → T4

## Tasks

- [ ] T1: Turn on Remote Automation in both simulators' Safari. First look for a preference key (compare the simulator's Safari and WebInspector preferences before and after the Settings toggle) that `xcrun simctl spawn <udid> defaults write` can set; else toggle Settings > Apps > Safari > Advanced > Remote Automation by simulator taps; else stop and ask the user to toggle it (granted at the question set). Start one `--target simulator` session on each simulator. If the setting is on and no session starts, stop: the goal is wrong.
- [ ] T2: Run the AC1 lines on both simulators, and fix `tests/safari_check.mjs` where the simulator run differs from the Mac run (waits, scrolling, session capabilities). If Safari on iOS gives a name the viewer gets wrong, stop: it is a viewer defect.
- [ ] T3: Show that the simulator runs can fail: on the iPhone simulator, `--plant rawindicator`, `nonumber`, `nativename`, and `nativetitle` each make the `example.html` line exit 1 with a failure line naming the planted defect. With the setting off, show AC2's exit 2 and its session error.
- [ ] T4: Docs. In CLAUDE.md, write the setup steps beside the `simctl create` lines, add the four AC1 run lines to the verify block, and update the `safari_check.mjs` paragraph and "Still unverified". Update README.md line 91 and the header of `tests/safari_check.mjs`. Correct the M010 lesson in `cairn/LESSONS.md` in place. Run the AC3 `grep`.

## Work log

- 2026-10-20: created by /milestone-plan.
- 2026-10-20: tier check: not run — work named at the question set
- 2026-10-20: question set: what to work on — "Safari names on iOS" (row "Check Safari names in iOS simulators").
- 2026-10-20: question set: may the run stop for one manual step (a setting, a file save) — yes, ask.
- 2026-10-20: collision check: row "Check Safari names in iOS simulators" absorbed in full; row "Close the name and indicator check gaps" absorbed in part (indicator update on scroll in Safari); M010 shipped safari_check, extended here; not the checker-regress shape (safari_check checks the shipped viewer in Safari, not repo-internal files); D-006 keeps this row, as it leaves viewer behavior unchecked; no other D-entry overlaps.
- 2026-10-20: inbox sweep: 0 open issues, 0 open PRs. Resolves is empty, so no assignment option.
- 2026-10-20: lessons harvested: M010 (safaridriver needs remote automation; simulator session failed), M012 (each session brings Safari to the front; batch runs), M010 (first openurl after boot can time out), M001 (iOS 27.0 runtime for these devices).
- 2026-10-20: surface tier user-facing (README changes); works under IP1 and changes no principle, so no RB tripwire tag. No viewer change, so no version bump; changelog slot is none.
- 2026-10-20: criteria audit (full mode, Opus reader): 10 findings, all fixed or answered. Fixed: run count wording; names scoped to the two pages; indicator read named as "with role heading"; toolbar and scroll limits named; AC2's off state tied to the no-session-host error; AC2 says the off/on demonstration is iPhone only; AC3's grep widened to README's two stale sentences; AC3 narrowed to `<object>` and PDF.js embeds; "verify block holds the lines" moved from AC3 to T4 (instrument). Answered: the ROADMAP row graduates at review hygiene, not by the grep.
- 2026-10-20: plan gate chose safaridriver with Remote Automation on over a page-script name read, because iOS 27.0 Safari has no `Element.prototype.computedName` (M010); falsified by a session that still fails with the setting on.
