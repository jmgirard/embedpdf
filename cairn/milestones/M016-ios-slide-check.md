# M016: Slides check on iOS

- **Status:** review
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** IP1
- **Resolves:** —
- **Surface tier:** internal — it changes a test script and its documentation, not the extension
- **Branch/PR:** m016-ios-slide-check

## Goal

`tests/ios_check.mjs` checks RevealJS slide decks, so self-contained slides
are checked in Safari on iPhone and iPad.

## Scope

**In:** Observed 2026-10-19 by reading the code: `tests/ios_check.mjs`
scrolls each embed into view, which does not move RevealJS slides. A PDF.js
embed on a slide that is not shown renders nothing (its pages have width 0),
and RevealJS marks a hidden slide `aria-hidden`, which fails the hidden-text
check. `tests/render_check.mjs` goes to each slide with `Reveal.slide()`
(`tests/render_check.mjs:1085`). This milestone gives the ios_check probe
the same slide walk: after the one text wait, it shows each slide, checks
that slide's hidden text, and scrolls that slide's pages. It adds
`--plant noslide`, the CLAUDE.md lines for `selfcontained_slides_test.html`,
and a header comment. Non-slide pages keep their current path. No change to
the viewer, so no version bump.

**Out:**
- `revealjs_test.html` on iOS, whose PDF.js embeds have 1 and 2 pages while
  ios_check takes one `--expect-pages`, and an `--expect-links` check in
  ios_check → candidate row "iOS slide deck gaps".
- A real iPhone or iPad → CLAUDE.md "Still unverified" (real devices).
- A viewer fix, if the slide walk finds a real rendering defect → `/hotfix`
  or a new plan; this milestone then stops at the goal-wrong stop.

## Acceptance criteria

- [x] AC1: After `quarto render`, these two lines exit 0:
      ```
      node tests/ios_check.mjs --device "embedpdf iPhone" --page selfcontained_slides_test.html --alone yes --expect-embeds 2 --expect-native 1 --expect-name sample.pdf --expect-text "On the Origin of Coastlines|Why It Matters"
      node tests/ios_check.mjs --device "embedpdf iPad" --page selfcontained_slides_test.html --alone yes --expect-embeds 2 --expect-native 1 --expect-name sample.pdf --expect-text "On the Origin of Coastlines|Why It Matters"
      ```
      Each run's printed report gives, for each PDF.js embed, the slide
      RevealJS showed when the probe measured that embed's ink and checked
      its hidden text, and that slide is the one that holds the embed.
- [x] AC2: The iPhone line of AC1 exits 1 with each of `--plant noslide`
      (the probe never shows the last slide that holds a PDF.js embed),
      `--plant blank`, and `--plant notext`. Its failure lines name embed 3
      for `noslide` and embed 1 for `blank` and `notext`. `--plant noslide`
      on `example.html`, a page with no slides, exits 2 with a line saying
      there was nothing to plant in.
- [x] AC3: These ios_check lines of CLAUDE.md at commit 2397d39 still exit 0
      after the change: the two `example.html` lines with `--expect-text`,
      the two `selfcontained_test.html --alone yes` lines, the
      `large_test.html` line for "embedpdf iPhone", and the
      `selfcontained_failed_test.html` line for "embedpdf iPhone".
- [x] AC4: CLAUDE.md's self-contained command block holds the two AC1 lines,
      and its "Still unverified" list no longer names self-contained RevealJS
      slides in Safari on iPhone and iPad. The header comment of
      `tests/ios_check.mjs` says how it handles a RevealJS page and documents
      `--plant noslide`.

## Coverage

- AC1 → T1, T2
- AC2 → T1, T3
- AC3 → T4
- AC4 → T1, T5

## Tasks

- [x] T1: In the probe of `tests/ios_check.mjs` (`PROBE`, from line 387),
      detect `window.Reveal`. On a slide deck, after the text wait, for each
      slide: `Reveal.slide(h, v)` from `Reveal.getIndices`, wait, read the
      hidden text of that slide's embeds, and scroll its pages; repeat the
      settle loop over slides. Record per PDF.js embed the shown slide's
      index at the ink and text reads, and fail an embed whose slide differs.
      Add `--plant noslide` (exit 2 on a page with no slides, as the other
      plants do). Update the header comment.
- [x] T2: `quarto render`, then run both AC1 lines and read the report's
      slide fields.
- [x] T3: Run the AC2 plant lines and see each fail for its own embed.
- [x] T4: Run the six AC3 lines.
- [x] T5: CLAUDE.md: add the AC1 lines to the self-contained block, drop the
      self-contained slides bullet from "Still unverified", and correct the
      Known issues entry in `cairn/DESIGN.md` on self-contained slides.

## Work log

- 2026-10-19: created by /milestone-plan.
- 2026-10-19: tier check: not run — work named at the question set.
- 2026-10-19: question set: which candidate to plan — "Self-contained slides on iOS" (absorbed in full).
- 2026-10-19: question set: may the work run the iOS simulators and desktop Safari while the user is away — yes.
- 2026-10-19: collision sweep: absorbs candidate row "Self-contained slides on iOS"; no planned or in-progress milestone, no D-entry, and no archive milestone covers ios_check slides (M002 added the Chromium slide walk). Inbox sweep: 0 open issues, 0 open PRs.
- 2026-10-19: checker-regress shape not hit: ios_check verifies the shipped viewer's rendering, not repo-internal artifacts.
- 2026-10-19: lessons harvested: M002 (hidden slide renders nothing; use `Reveal.slide()`), M009 (aria-hidden or inert ancestors drop text), M010 (first `simctl openurl` can time out; repeat).
- 2026-10-19: criteria audit (reduced mode, fresh Opus reader): no finding on bounded promise, proportionality, or instrument; one wording point on AC1 (the viewer reads text at load, so "when its hidden text was read" was ambiguous) — fixed to name the probe's ink measure and text check.
- 2026-10-19: plan gate chose a per-slide walk inside the probe over driving slides from Node through the report server, because the probe already runs every check in the page; falsified by a Safari slide change that the probe cannot wait on from inside the page.
- 2026-10-19: test scope: AC2's three plants and the no-slides exit; AC3's six lines stand for the non-slide path. revealjs_test.html on iOS left out (new candidate row "iOS slide deck gaps").
- 2026-10-19: no changelog entry (profile changelog slot: none) and no version bump (viewer unchanged).
- 2026-10-19: implement: branch m016-ios-slide-check cut from main at 1b6918e; status in-progress.
- 2026-10-19: T1: probe walks the deck when `window.Reveal` exists (waits for `Reveal.isReady()`), reads text and measures ink per slide, records `slide`/`textSlide`/`inkSlide` and `scrollView` in the report; `blank`/`missing` now plant just before the first PDF.js embed's ink measure; `--plant noslide` added; no edit to `embedpdf.css` or the viewer.
- 2026-10-19: T2: first iPhone run failed "embed 3: text read while slide 3 was shown, not its slide 4": RevealJS used its scrolled view there (`Reveal.isScrollView()` true), and `Reveal.slide()` to the last slide did not make it current; the probe now waits for the slide to be current and, after 3 s, scrolls its embeds into view. Then both AC1 lines exit 0 (iPhone 17 iOS 27.0, scrolled view; iPad Air 11-inch M4 iOS 27.0, slide view), each PDF.js embed with slide = textSlide = inkSlide.
- 2026-10-19: T3: iPhone AC1 line exits 1 with `--plant noslide` ("embed 3: text read while slide 3 was shown, not its slide 4"), `blank` ("embed 1: pages without ink: 2"), and `notext` ("embed 1, page 2: text lacks …"); `--plant noslide` on example.html exits 2 ("found nothing to plant in"). In the iPhone's scrolled view the unshown slide's embed still got ink, so only the slide check names it; on the iPad (slide view) `noslide` fails embed 3 on the ink slide, the text slide, and aria-hidden text, with no ink failure (RevealJS keeps nearby slides laid out).
- 2026-10-19: T5 (in progress, checkpoint): CLAUDE.md holds the two AC1 lines and a note on slide decks, and drops the self-contained slides bullet from "Still unverified"; DESIGN.md Known issues entry corrected. T4 running: example.html iPhone line exits 0, five lines left.
- 2026-10-19: T4: the six AC3 lines exit 0 (run before the fix below). An extra `--plant blank` run on example.html (no `--expect-text`) exited 0, a regression: the probe picked the first PDF.js embed before the embeds hydrated. Fixed: the embed is picked at plant time; on a deck the probe waits for hydration before the walk, and the per-slide wait needs each embed hydrated. `noslide` without `--expect-text` also passed on the iPhone, since scrolling the skipped slide's pages made it current in the scrolled view; `noslide` now skips that scroll too. Re-running AC1, AC2, and AC3 lines after these fixes.
- 2026-10-19: after the fixes, both AC1 lines exit 0; the iPhone AC1 line exits 1 with `noslide` (embed 3: ink slide and text slide), `blank` (embed 1: no ink on page 2), and `notext` (embed 1, page 2); `noslide` on example.html exits 2; `noslide` without `--expect-text` exits 1 on iPhone and iPad (embed 3: ink slide). AC3 rerun in progress.
- 2026-10-19: T4: after the fixes the six AC3 lines exit 0 again, and `--plant blank` on example.html exits 1 ("embed 1: pages without ink: 2"). T5 done (checkpoint 51696e9).
- 2026-10-19: claim audit: not owed — internal tier.
- 2026-10-19: implement complete; status review.
- 2026-10-19: review: 4 lenses spawned; 22 findings fixed on the branch, 6 to row "Deck walk follow-ups", 5 rejected, 4 noted; re-verified at a5deeaa.
- 2026-10-19: step-7 approval: m016-ios-slide-check approved for merge

## Decisions

## Review

Evidence run 2026-10-19 at 2dfe7ab (branch level with main at 1b6918e), after a fresh `quarto render` (exit 0, docs/ unchanged); iOS 27.0 simulators "embedpdf iPhone" (iPhone 17) and "embedpdf iPad" (iPad Air 11-inch M4).

- AC1: both lines exit 0. iPhone: RevealJS scrolled view (`scrollView` true), 4 slides; embed 1 slide 1 = textSlide 1 = inkSlide 1, embed 3 slide 3 = textSlide 3 = inkSlide 3 (0-based), each 2 pages with ink. iPad: slide view (`scrollView` false), same slide fields and ink.
- AC2: iPhone AC1 line with `--plant noslide` exits 1: "embed 3: ink measured while slide 3 was shown, not its slide 4" and "embed 3: text read while slide 3 was shown, not its slide 4"; with `--plant blank` exits 1: "embed 1: pages without ink: 2"; with `--plant notext` exits 1: "embed 1, page 2: text lacks "Why It Matters""; `--plant noslide` on example.html exits 2: "ios_check: --plant noslide found nothing to plant in" (report `slides` 0).
- AC3: the six lines, taken from `git show 2397d39:CLAUDE.md` by pattern (6 matched), exit 0: example.html with `--expect-text` on iPhone and iPad, selfcontained_test.html `--alone yes` on iPhone and iPad, selfcontained_failed_test.html on iPhone, large_test.html on iPhone (14 pages, all inked).
- AC4: `grep -c -F` finds each AC1 line once in CLAUDE.md's self-contained block; the "Still unverified" list holds no "RevealJS" or "slide" line; `tests/ios_check.mjs` header documents `--plant noslide` (line 172) and the RevealJS deck handling (lines 179-194).
- Consistency gate: `cairn_validate.py` exit 0, all checks passed; profile consistency-gate slot names no toolchain checks; no principle changed, so no impact report.
- spawned: diff-bug, blame-history, prior-review, ripple
- diff-bug #1: on a deck, ink is stored per slide but pages are counted at the report, so an embed that hydrated after its slide passes with `ink = []` — fix now (Node fails when the ink count differs from the page count), fixed a5deeaa.
- diff-bug #2: `--plant noslide` claims a plant even when its slide was current anyway — fix now (planted only when another slide is current at its ink measure), fixed a5deeaa.
- diff-bug #3: in the scrolled view a page scroll can make a nearby slide current before the ink measure — fix now (the probe shows the slide again before measuring), fixed a5deeaa.
- diff-bug #4: `--plant blank` on a last page with no canvas turned a real failure into exit 2 — fix now (a missing canvas counts as planted), fixed a5deeaa.
- diff-bug #5: sections inside a slide's content were walked as slides — fix now (a slide is a section with no outer section, or one in a stack), fixed a5deeaa.
- diff-bug #6: `noslide`'s slide is picked once, after the hydration wait — follow-up, row "Deck walk follow-ups".
- diff-bug #7: Reveal calls are unguarded, so a throw gives only "no report within" — follow-up, row "Deck walk follow-ups".
- diff-bug #8: failure messages printed "slide 0" for a current slide not in the deck or none recorded — fix now (named in words), fixed a5deeaa.
- diff-bug #9: an earlier embed that hydrates after the walk can take a second ink plant — follow-up, row "Deck walk follow-ups".
- diff-bug #10: `--screenshot` on a deck leaves the last slide current — follow-up, row "Deck walk follow-ups".
- diff-bug #11: header said the scroll fallback runs in the scrolled view only — fix now (header reworded), fixed a5deeaa.
- diff-bug #12: PROBE comment described only pages without slides — fix now, fixed a5deeaa.
- diff-bug #13: header did not say the slide checks skip `--remote blocked`, `--missing-pdfs`, `--expect-download` — fix now, fixed a5deeaa.
- diff-bug #14: CLAUDE.md read as if render_check takes `--plant noslide` — fix now ("ios_check's"), fixed a5deeaa.
- diff-bug #15: AC4 evidence line out of date after the review fixes — fix now (AC4 re-recorded below after the rerun).
- diff-bug #16: `scrollView` is read once, at the report — follow-up, row "Deck walk follow-ups".
- diff-bug (found against 2dfe7ab, already fixed in 0ff4919): uncounted slides skipped, `inkPlanted` unread, stale `--expect-text` wording, undocumented deck timeout — fix now, fixed 0ff4919.
- blame-history #1: an embed in a vertical stack is attributed to the stack — reject, false: RevealJS 5's `getSlides()` selects `.slides section:not(.stack)` (read in docs/revealjs_test_files/libs/revealjs/dist/reveal.js), and the walk now excludes stacks itself.
- blame-history #2: CLAUDE.md "Still unverified" lost the desktop Safari gap for slides — fix now (bullet "Any RevealJS slide deck in desktop Safari"), fixed 0ff4919; real devices stay under the existing real iPhone/iPad bullet.
- blame-history #3: `--expect-text` header still said the text is read before the probe scrolls — fix now, fixed 0ff4919.
- blame-history #4: the per-slide text read has no wait of its own — reject, false: the one text wait before the walk already requires every PDF.js page's text block filled, the viewer fills them at load whatever slide is shown, and an unfilled block fails by name.
- blame-history #5: embeds in no slide are never scrolled on a deck — fix now (such a PDF.js embed fails), fixed 0ff4919.
- blame-history #6: `blank`/`missing` have no "found nothing to plant in" exit — fix now, fixed 0ff4919.
- blame-history #7: the one-line plant list at the header's top omits `noslide` — reject, style: plants with their own flag dependency have their own entry, as `noranges` does.
- blame-history #8: the ink map is keyed by element, so a replaced node would miss — reject, false: the viewer hydrates the `div.embedpdf` in place (its classes change on the same node) and re-renders swap canvases only.
- prior-review #1: the deck walk can pass the 180 s report timeout ("Text check follow-ups") — fix now in part (header documents it), rest follow-up, row "Deck walk follow-ups".
- prior-review #2: `blank`/`missing` have no exit 2 ("Ink check follow-ups") — fix now, fixed 0ff4919.
- prior-review #3-#6: "First-paint robustness", "Name plant slide target", "Embed name follow-ups", M011 and M014 paths not made worse — noted.
- ripple #1: README.md:86 said self-contained slides were checked only in Chromium — fix now, fixed 0ff4919.
- ripple #2: same as blame-history #2 — fixed 0ff4919.
- ripple #3: ROADMAP row "Self-contained slides on iOS" still open — reject, planned change: post-merge hygiene graduates it.
- ripple #4: header said the walk runs after the `--expect-text` wait only — fix now, fixed 0ff4919.
- ripple #5: header did not say a deck run can pass the default timeout — fix now, fixed 0ff4919.
- Re-verification after the fix-now commits (code at a5deeaa, fresh `quarto render` exit 0):
- AC1 (rerun): both lines exit 0; iPhone `scrollView` true, iPad false; embeds 1 and 3 each with slide = textSlide = inkSlide (1 and 3) and 2 inked pages.
- AC2 (rerun): `noslide` exits 1 (embed 3: "ink measured while slide 3 was shown, not its slide 4" and the text line); `blank` exits 1 ("embed 1: pages without ink: 2"); `notext` exits 1 ("embed 1, page 2: text lacks …"); `noslide` on example.html exits 2 ("found nothing to plant in").
- AC3 (rerun): the six lines exit 0.
- AC4 (re-recorded at c887772): `grep -c -F` finds each AC1 line once in CLAUDE.md; the "Still unverified" list's only slide line is "Any RevealJS slide deck in desktop Safari", which does not name iPhone or iPad; the ios_check header documents `--plant noslide` (line 178) and deck handling (from line 186).
- Fix checks: `--plant blank` on selfcontained_failed_test.html (no PDF.js embed) exits 2 ("found nothing to plant in"); `noslide` without `--expect-text` exits 1 on iPhone and iPad (embed 3, ink slide); `blank` on example.html exits 1. The uncounted-slide, stack, and nested-section paths have no test deck (row "Deck walk follow-ups").
