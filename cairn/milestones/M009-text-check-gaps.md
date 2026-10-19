# M009: Text check gaps

- **Status:** review
- **Priority:** high
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** —
- **Resolves:** —
- **Surface tier:** internal — check scripts only; the extension code does not change
- **Branch/PR:** m009-text-check-gaps

## Goal

Close the gaps that the M004 review found in the `--expect-text` checks of `tests/render_check.mjs` and `tests/ios_check.mjs`.

## Scope

**In:** checks for `inert` and `content-visibility: hidden` on the hidden text block or an element that contains
it (both scripts); a null canvas snapshot in render_check's accessibility-tree check; one text wait for the whole
page that ends on no progress (both scripts); a fast exit when an embed never hydrates (both scripts) or when a
slide's canvas wait runs out (render_check); the plants and the `--slow-text` aid that show these work.

**Out:**
- An `opacity` check: a Chromium probe kept text with `opacity: 0` in the accessibility tree, so screen readers
  still read it (user's choice at the question set).
- A read of Safari's accessibility tree on iOS: the simulator gives a script no access to it. A real screen reader
  stays in CLAUDE.md "Still unverified" (user's choice at the question set).
- The fixed waits before the ink check and the ios_check plant exits → candidate row "Ink check follow-ups".
- Plants that pick the page's first PDF.js embed again on each slide → candidate row "Name plant slide target".
- No extension version bump: `embedpdf-viewer.js`, `embedpdf.css`, and `embedpdf.lua` do not change.

## Acceptance criteria

- [ ] AC1: With `--expect-text`, `tests/render_check.mjs` and `tests/ios_check.mjs` fail a page in two more cases.
      In the first case, the page's `.embedpdf-text` block or an element that contains the block has the `inert`
      attribute. In the second case, one of them has a computed `content-visibility` of `hidden`. Each script gains
      `--plant inert`, which sets `inert` on the last `.embedpdf-page` of the first PDF.js embed just before the
      text is read. Each script also gains `--plant cvhidden`, which sets `content-visibility: hidden` on the
      `.embedpdf-text` block of that page at the same time. Each of these four runs exits 1. For page 2 of the
      first PDF.js embed, render_check prints a failure line and the ios_check report's `failures` holds an entry,
      and that line or entry names `inert` or `content-visibility`:
      `node tests/render_check.mjs example.html --expect-native 9 --expect-pdfjs 2 --expect-text "On the Origin of Coastlines|Why It Matters" --plant inert`,
      `node tests/render_check.mjs example.html --expect-native 9 --expect-pdfjs 2 --expect-text "On the Origin of Coastlines|Why It Matters" --plant cvhidden`,
      `node tests/ios_check.mjs --device "embedpdf iPhone" --expect-text "On the Origin of Coastlines|Why It Matters" --plant inert`,
      and `node tests/ios_check.mjs --device "embedpdf iPhone" --expect-text "On the Origin of Coastlines|Why It Matters" --plant cvhidden`.
- [ ] AC2: In the `--expect-text` accessibility-tree check of `tests/render_check.mjs`, a null snapshot of a page
      canvas counts as hidden in one case only: the canvas is still in the document after the snapshot. If the
      canvas is no longer in the document, the check takes one snapshot of the page's current canvas and judges it
      by the same rule, with no further retry. If the page has no canvas, the check prints a failure line that says
      the canvas left the page during the check. With `--expect-text`, `--plant detach` removes the last canvas of
      the first PDF.js embed after the check finds that canvas and before its snapshot. This run exits 1 and prints
      that line for canvas 2 of PDF.js embed 1:
      `node tests/render_check.mjs example.html --expect-native 9 --expect-pdfjs 2 --expect-text "On the Origin of Coastlines|Why It Matters" --plant detach`.
- [ ] AC3: With `--expect-text`, `tests/render_check.mjs` and `tests/ios_check.mjs` each wait once for the whole
      page before they read any text. On a RevealJS page, render_check waits before it goes to the first slide. On
      other pages, it waits before the pages scroll. ios_check waits before the probe scrolls. The wait ends at the
      first of three events. Every `div.embedpdf` is hydrated and every `.embedpdf-text` block of a PDF.js page holds
      text. Or 10 s pass in which no embed became hydrated and no page gained text. Or 60 s pass in all. After the
      wait, render_check reads the text of each slide when it shows that slide, with no further text wait. Each
      script gains `--slow-text <ms>`, a test aid. After the viewer fills the text of every page, this aid empties
      all of that text. It then puts the text back one page every <ms> ms. The wait does not test its end condition
      until the aid has emptied the text. These two runs exit 0:
      `node tests/render_check.mjs example.html --device iphone --expect-native 1 --expect-pdfjs 10 --expect-name sample.pdf --expect-text "On the Origin of Coastlines|Why It Matters" --slow-text 1500`
      and `node tests/ios_check.mjs --device "embedpdf iPhone" --expect-name sample.pdf --expect-text "On the Origin of Coastlines|Why It Matters" --slow-text 1500`.
- [ ] AC4: With `--expect-text`, if the AC3 wait ends while a `div.embedpdf` is not hydrated, `tests/render_check.mjs`
      prints a line that gives the number of embeds that are not hydrated, and `tests/ios_check.mjs` puts that line in
      its report's `failures`. Each script then exits 1 with no other failure line or entry. With `--expect-text`,
      each script gains `--plant unhydrated`, which adds a `div.embedpdf` with no `data-src` to the page's body before
      that wait. These two runs exit 1 with that line or entry and no other:
      `node tests/render_check.mjs selfcontained_slides_test.html --alone file --device iphone --expect-native 1 --expect-pdfjs 2 --expect-pages 2 --expect-links 4 --expect-name sample.pdf --expect-text "On the Origin of Coastlines|Why It Matters" --plant unhydrated`
      and `node tests/ios_check.mjs --device "embedpdf iPhone" --expect-name sample.pdf --expect-text "On the Origin of Coastlines|Why It Matters" --plant unhydrated`.
- [ ] AC5: On a RevealJS page with `--expect-text`, a slide's accessibility-tree check can end its canvas wait with a
      PDF.js page that has no canvas. Then `tests/render_check.mjs` checks no later slide, prints a line that names
      that slide, and exits 1. With `--expect-text`, `--plant norender` keeps the viewer from putting a canvas on any
      page, without a change to the viewer file. This run exits 1, prints that line naming slide 2, and prints no
      failure line that names a later slide:
      `node tests/render_check.mjs selfcontained_slides_test.html --alone file --device iphone --expect-native 1 --expect-pdfjs 2 --expect-pages 2 --expect-links 4 --expect-name sample.pdf --expect-text "On the Origin of Coastlines|Why It Matters" --plant norender`.
- [ ] AC6: Every literal `node tests/render_check.mjs` or `node tests/ios_check.mjs` command line in CLAUDE.md
      "Verify before finishing" that passes `--expect-text` exits 0.

## Coverage

- AC1 → T1
- AC2 → T2, T7
- AC3 → T3, T4, T7
- AC4 → T5, T7
- AC5 → T5, T7
- AC6 → T6

## Tasks

- [x] T1: Hidden-text cases. In render_check `measureText()` (line 366) and the ios_check probe (line 272), walk
      from each `.embedpdf-text` block up to `document.documentElement` and record `inert` (the attribute, since an
      inert ancestor leaves the block's `inert` property false) and computed `content-visibility`. Add the failure
      lines to `textFailures()` (line 392) and ios_check's text block (line 488). Add `inert` and `cvhidden` to both
      `TEXT_PLANTS` lists and plant blocks. Run the AC1 lines.
- [x] T2: Canvas snapshot. In `treeFailures()` (line 466), after a null snapshot read the canvas's `isConnected`;
      if false, re-query the page's canvas once and judge that one. Add `detach` to `TREE_PLANTS` with its hook
      between finding the canvases and the snapshot. Run the AC2 line.
- [x] T3: Whole-page wait in render_check. Move the wait out of `measureText()` into one call before the slide loop
      (line 638) and before the scroll on other pages; progress is the count of hydrated embeds plus pages with text.
      Add `--slow-text <ms>` to `FLAGS` and its in-page aid. Run the AC3 render_check line.
- [x] T4: Whole-page wait in ios_check. Apply the T3 rule to the probe's wait (line 258), with `--slow-text` passed
      as a query parameter like `text=1`. Run the AC3 ios_check line.
- [x] T5: Fast exits. When the wait ends with an unhydrated embed, print the line and exit 1 in render_check; in
      ios_check, POST the report at once with that one failure. Add `unhydrated` to both plant lists. In
      render_check, stop the slide loop when a slide's canvas wait runs out; add `norender`, put in place before the
      page loads. Run the AC4 and AC5 lines.
- [x] T6: Docs and verify. Update both header comments (the text wait, now "at most 10 s" in render_check lines
      60-77 and ios_check lines 35-44, the new plants, `--slow-text`) and any CLAUDE.md note the change makes stale.
      Run every CLAUDE.md line that passes `--expect-text` (AC6), then the full `verify` slot.
- [x] T7: Review return 1. Fix pass 1's fix-now findings (Review section): each canvas's page read with the canvas
      query; a snapshot error on a connected canvas fails; the slow aid saves only filled blocks, stops with the wait,
      and its header claim names the 60 s cap; ios_check's timeout default fits two waits; `stopRun` reports console
      errors; `norender` counts as planted only where an embed was checked; the CLAUDE.md note, probe comment, and
      ios_check exit paragraph; one text plant list; the stray div planted first in both. File row "Text check
      follow-ups"; narrow row "Name plant slide target". Run the AC1 to AC5 lines and every CLAUDE.md line.

## Work log

- 2026-10-19: created by /milestone-plan.
- 2026-10-19: tier check: milestone — five check-script gaps across two scripts, more than one sitting.
- 2026-10-19: collision sweep: absorbs candidate row "Text check gaps" in full; distinct from rows "Ink check follow-ups" (fixed waits before the ink check), "Name plant slide target" (plant target per slide), "Eager text cost" and "Screen-reader text gaps" (viewer); M004 (archived) shipped the text checks this extends; no D-entry overlaps.
- 2026-10-19: inbox sweep: 0 open issues, 0 open PRs.
- 2026-10-19: checker-regress shape not hit: the text checks verify the extension's rendered output in a browser, not repo-internal artifacts.
- 2026-10-19: lessons applied: M004 (`interestingOnly: false`), M002 (go to each slide with `Reveal.slide()`), M008 (a `div.embedpdf` with no `data-src` never hydrates, the `unhydrated` plant).
- 2026-10-19: probe (Chromium, puppeteer snapshot, `interestingOnly: false`): text with `opacity: 0` stays in the tree; `content-visibility: hidden` on the block or a parent and `inert` on the block or a parent remove it; `inert` on a parent leaves the block's `inert` property false.
- 2026-10-19: criteria audit (reduced mode, fresh Opus reader): 9 findings, all fixed: ios_check has failure entries, not lines (AC1, AC4); plant timing stated (AC1); one canvas retry (AC2); the wait waits for the aid (AC3); the JSON wait figure dropped as an instrument clause, kept as review evidence (AC3); text wait cap 60 s, not 120 s, so ios_check's 90 s scroll loop fits its 180 s timeout (AC3); "no scroll, no slide" replaced by "no other failure line" (AC4); "slide 2" and "no later-slide line" (AC5); `norender` without a viewer change (AC5).
- 2026-10-19: question set: check `opacity` — no, the probe shows screen readers still read it.
- 2026-10-19: question set: read Safari's accessibility tree on iOS — no, page checks only; a real screen reader stays in "Still unverified".
- 2026-10-19: plan gate chose one whole-page text wait before the slide loop over one wait per slide, because the viewer reads every embed's text at load on one queue whatever slide is shown; falsified by a deck whose embed text arrives only once its slide is shown.
- 2026-10-19: plan gate chose a wait that ends after 10 s with no progress over a longer fixed wait, because a fixed wait fails a long PDF and makes a broken page slow; falsified by a page whose text reads stall over 10 s between pages and then finish.
- 2026-10-19: plan gate chose to stop the slide loop at the first canvas wait that runs out over going on, because the run already fails there; falsified by a deck where a later slide's failure lines are needed to find the cause.

- 2026-10-19: T1 done: both scripts walk from each text block to `<html>` and fail on the `inert` attribute or computed `content-visibility: hidden`, naming the element; plants `inert`, `cvhidden`. AC1 runs: render_check both exit 1 with the line for embed 1 page 2; ios_check (iPhone) both exit 1 with that one `failures` entry; unplanted render_check desktop and ios_check iPhone text lines exit 0. ios_check plant lists were edited by a script, not the Edit tool (one slip).
- 2026-10-19: T2 done: a null canvas snapshot counts as hidden only for a connected canvas; else one snapshot of the page's current canvas; a snapshot that throws reads as null. AC2 run exits 1 with "PDF.js embed 1: canvas 2 left the page during the accessibility check"; `--plant canvas` still exits 1; iphone text line exits 0. Probe (temporary copy, not committed): a canvas swapped for a clone passes the tree check, so the retry path is reached.
- 2026-10-19: T3 done: `waitForText()` runs once before the slide loop or scroll; `measureText()` no longer waits; the JSON `text.wait` holds `waitedMs`, `slowPages`, `unhydrated`. AC3 render_check line exits 0 with a 30019 ms wait over 20 pages; selfcontained_slides iphone text line exits 0; `--slow-text 12000` on desktop exits 1 after a 10008 ms wait, so the wait ends after 10 s without new text.
- 2026-10-19: T4 done: the probe's text wait follows the T3 rule; `--slow-text` goes to the probe as `slow=<ms>`; the report adds `slowPages`. AC3 ios_check line (iPhone) exits 0 with `textWaitedMs` 30090 over 20 pages.
- 2026-10-19: T5 done: render_check `stopRun()` prints the cause and the text and tree failures so far, then exits 1; plants `unhydrated` (in `waitForText()`) and `norender` (`getContext` returns null, set before load) in a new `WAIT_PLANTS` list; ios_check reports at once with `stuck`, which becomes the one failure. AC4 render_check exits 1 in 12 s with only "1 embed(s) still not hydrated when the text wait ended after 10007 ms"; AC4 ios_check (iPhone) exits 1 in 14 s with only that `failures` entry; AC5 exits 1 in 16 s with "stopped at slide 2: …" and one failure line, for slide 2.
- 2026-10-19: T6 done: both header comments describe the whole-page wait, the new checks, plants, and `--slow-text`; CLAUDE.md gains a four-line note on the text wait (fb04d96). Full verify slot: shortcode tests 40 passed, 0 failed; helpers 85 passed, 0 failed; 54 check lines exit 0 (the 39 literal CLAUDE.md lines, 13 of them with `--expect-text`, plus the `--alone http`, mac-safari, windows-touch, and ipad variants CLAUDE.md asks for), Chromium 155 and the iOS 27.0 iPhone and iPad simulators.
- 2026-10-19: claim audit: not owed — internal tier.
- 2026-10-19: status review; all tasks done, verify slot green.
- 2026-10-19: review return 1: AC2 — diff-bug #1, a canvas swapped before its page is looked up crashes the tree check (`holder.$` on a null `closest()`); fix with the 15 fix-now findings of pass 1 (Review section) and file row "Text check follow-ups".
- 2026-10-19: T7 checkpoint (not done): fixes written, row "Text check follow-ups" filed, row "Name plant slide target" narrowed; probes on temporary copies show a swapped canvas passes the tree check and a thrown snapshot fails it ("canvas 1 snapshot failed (probe error)"); the AC and verify lines are running.
- 2026-10-19: T7 done: the 10 AC1 to AC5 lines give their planned exits and lines (slow-text waits 30086 ms and 30154 ms over 20 pages); full verify slot green: shortcode 40 passed, helpers 85 passed, 54 check lines exit 0. Status review.

## Decisions

## Review

Pass 1 (2026-10-19, head 58da15b, Chromium 155.0.8059.39, iOS 27.0 simulators). Each AC command line run fresh by a script that read the lines from this file.

- AC1 evidence: render_check `--plant inert` exit 1 with "PDF.js embed 1, page 2: text is under inert (on div.embedpdf-page)"; `--plant cvhidden` exit 1 with "PDF.js embed 1, page 2: text is under content-visibility: hidden (on the text block)"; ios_check iPhone `inert` and `cvhidden` exit 1, each `failures` holding only the matching entry for embed 1 page 2.
- AC2 evidence: the `--plant detach` run exits 1 with "PDF.js embed 1: canvas 2 left the page during the accessibility check". Not ticked: diff-bug #1 below shows a swap path that crashes.
- AC3 evidence: render_check iphone `--slow-text 1500` exit 0, `text.wait` 30087 ms over 20 pages; ios_check iPhone `--slow-text 1500` exit 0, `textWaitedMs` 30151 over 20 pages.
- AC4 evidence: render_check exit 1 with only "1 embed(s) still not hydrated when the text wait ended after 10092 ms"; ios_check iPhone exit 1, `failures` only "1 embed(s) still not hydrated when the text wait ended after 10895 ms".
- AC5 evidence: exit 1 with "stopped at slide 2: a PDF.js page there still had no canvas when the canvas wait ended" and one failure line, "PDF.js embed 1 on slide 2: 0 canvases for 2 pages".
- AC6 evidence: all 13 literal CLAUDE.md lines with `--expect-text` exit 0 (9 render_check, 4 ios_check).
- No box ticked in pass 1: return 1 changes code that AC1 to AC6 depend on, so pass 2 runs every AC line again.
- Consistency gate: `cairn_validate.py` exit 0; no principle changed (no `cairn_impact` run); the generic profile's consistency-gate slot names no toolchain checks.
- spawned: diff-bug, blame-history, prior-review, ripple
- diff-bug #1: the canvas's page is looked up after earlier awaits, so a canvas the viewer swaps out first gives `closest()` null and `holder.$` throws — fix now (return 1, AC2)
- diff-bug #2: `snapOrNull` turns any snapshot error on a connected canvas into "hidden" — fix now
- diff-bug #3: the `--slow-text` "must still pass under 10000 ms" claim fails when pages × ms passes the 60 s cap, and the restore interval runs on after the wait — fix now
- diff-bug #4: the slow aid saves a still-empty block as "" and can write it over text the viewer adds late — fix now
- diff-bug #5: ios_check with `--slow-text` can pass its 180 s report timeout (two 60 s waits and the 90 s scroll loop) — fix now
- diff-bug #6: the 10 s no-progress window starts before a stalled read's own 10 s viewer timeout, so one stalled page marks every later page as missing text — follow-up, row "Text check follow-ups"
- diff-bug #7: `stopRun` leaves the console errors out of its report — fix now
- diff-bug #8: `norender` always counts as planted, and on a page with no slides it costs 10 s per embed — fix now
- diff-bug #9: `process.exit` right after `console.log` to a pipe can cut large output — follow-up, row "Text check follow-ups"
- diff-bug #10: the CLAUDE.md note says the wait ends 10 s after the last progress, also when everything is in — fix now
- diff-bug #11: the ios_check probe writes the text plant list out a second time — fix now
- diff-bug #12: ios_check plants the stray div after the slow aid's first wait, render_check before it — fix now
- diff-bug #13: on a Safari without `content-visibility`, the computed value is undefined and the check never fails — follow-up, row "Text check follow-ups"
- diff-bug #14: the inert check misses inertness from a modal dialog — reject (planned change: AC1 names the `inert` attribute)
- blame-history #1: snapshot errors pass the canvas check — fix now (same as diff-bug #2)
- blame-history #2: the `--slow-text` claim is false past 6 pages at 9000 ms — fix now (same as diff-bug #3)
- blame-history #3: the ios_check slow path can pass 180 s — fix now (same as diff-bug #5)
- blame-history #4: `norender` skips the found-nothing rule — fix now (same as diff-bug #8)
- blame-history #5: the text-plant exit-2 path prints no text failures first (in main before M009) — follow-up, row "Text check follow-ups"
- prior-review #1: snapshot errors read as hidden — fix now (same as diff-bug #2)
- prior-review #2: `norender` always planted — fix now (same as diff-bug #8)
- prior-review #3: the early stops skip all other checks — reject (planned change: AC4 asks for no other failure line)
- prior-review #4: CLAUDE.md gains no command line for `--slow-text` or the new plants — reject (planned change: plants and test aids live in the script headers, and AC6 covers the existing lines)
- prior-review #5: the CLAUDE.md note misstates when the wait ends — fix now (same as diff-bug #10)
- prior-review #6: ios_check's "Exits 0 only when" paragraph lists neither the text failures nor the stuck failure — fix now
- prior-review #7: the canvas wait runs 10 s per embed in turn, so a slide with many unrendered embeds stops late — follow-up, row "Text check follow-ups"
- prior-review #8: the whole-page wait counts embeds on slides not yet shown — reject (false: the viewer reads all text at load; both selfcontained_slides `--expect-text` lines exit 0 with 2 embeds read)
- ripple #1: the ROADMAP row "Text check gaps" describes the old behavior — reject (planned change: post-merge hygiene graduates the row)
- ripple #2: the row "Name plant slide target" names a per-slide text "still not hydrated" line that no longer exists — fix now
- ripple #3: ios_check `--timeout` 180 with `--slow-text` — fix now (same as diff-bug #5)
- ripple #4: the probe's opening comment does not say a stuck embed skips the scroll — fix now
- ripple #5: the `--slow-text` claim — fix now (same as diff-bug #3)
