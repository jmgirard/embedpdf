# M016: Slides check on iOS

- **Status:** planned
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** IP1
- **Resolves:** —
- **Surface tier:** internal — it changes a test script and its documentation, not the extension
- **Branch/PR:** —

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

- [ ] AC1: After `quarto render`, these two lines exit 0:
      ```
      node tests/ios_check.mjs --device "embedpdf iPhone" --page selfcontained_slides_test.html --alone yes --expect-embeds 2 --expect-native 1 --expect-name sample.pdf --expect-text "On the Origin of Coastlines|Why It Matters"
      node tests/ios_check.mjs --device "embedpdf iPad" --page selfcontained_slides_test.html --alone yes --expect-embeds 2 --expect-native 1 --expect-name sample.pdf --expect-text "On the Origin of Coastlines|Why It Matters"
      ```
      Each run's printed report gives, for each PDF.js embed, the slide
      RevealJS showed when the probe measured that embed's ink and checked
      its hidden text, and that slide is the one that holds the embed.
- [ ] AC2: The iPhone line of AC1 exits 1 with each of `--plant noslide`
      (the probe never shows the last slide that holds a PDF.js embed),
      `--plant blank`, and `--plant notext`. Its failure lines name embed 3
      for `noslide` and embed 1 for `blank` and `notext`. `--plant noslide`
      on `example.html`, a page with no slides, exits 2 with a line saying
      there was nothing to plant in.
- [ ] AC3: These ios_check lines of CLAUDE.md at commit 2397d39 still exit 0
      after the change: the two `example.html` lines with `--expect-text`,
      the two `selfcontained_test.html --alone yes` lines, the
      `large_test.html` line for "embedpdf iPhone", and the
      `selfcontained_failed_test.html` line for "embedpdf iPhone".
- [ ] AC4: CLAUDE.md's self-contained command block holds the two AC1 lines,
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

- [ ] T1: In the probe of `tests/ios_check.mjs` (`PROBE`, from line 387),
      detect `window.Reveal`. On a slide deck, after the text wait, for each
      slide: `Reveal.slide(h, v)` from `Reveal.getIndices`, wait, read the
      hidden text of that slide's embeds, and scroll its pages; repeat the
      settle loop over slides. Record per PDF.js embed the shown slide's
      index at the ink and text reads, and fail an embed whose slide differs.
      Add `--plant noslide` (exit 2 on a page with no slides, as the other
      plants do). Update the header comment.
- [ ] T2: `quarto render`, then run both AC1 lines and read the report's
      slide fields.
- [ ] T3: Run the AC2 plant lines and see each fail for its own embed.
- [ ] T4: Run the six AC3 lines.
- [ ] T5: CLAUDE.md: add the AC1 lines to the self-contained block, drop the
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

## Decisions

## Review
