<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section.
     Per-section owners are tagged below. The one size check that can fail is
     cairn_validate's <150 over the plan-owned body. -->
# M004: Screen-reader text

- **Status:** review   <!-- owner: transitioning skill · mirror-update; cairn/ROADMAP.md is the authority -->
- **Priority:** normal   <!-- owner: plan · create/amend-via-gate; high | normal | low -->
- **Depends on:** —   <!-- owner: plan · create/amend-via-gate; M<xx>, M<yy> or — -->
- **Driving RR:** —   <!-- owner: plan · create/amend-via-gate; RR<NN> whose Binding criteria bind this milestone's ACs (binding-criteria check), or — -->
- **Principles touched:** IP1, GP1, GP4   <!-- owner: plan · create/amend-via-gate; comma-separated IPn/GPn ids this milestone touches, or — -->
- **Resolves:** —   <!-- owner: plan · create/amend-via-gate; comma-separated GitHub issues the scope absorbs, each `#N closes` (the PR closes it at merge) or `#N partial` (the remainder gets a candidate row), or — ; skill conduct only — no validate check parses it -->
- **Surface tier:** user-facing — readers of PDF.js embeds who use a screen reader get the page text   <!-- owner: plan · create/amend-via-gate; user-facing | internal — <one-clause reason>; skill conduct only — no validate check parses it -->
- **Branch/PR:** m004-screen-reader-text   <!-- owner: implement (branch) / review (PR URL) · create; a companion checkout the milestone also works in is one further entry per checkout, `companion: <abs-path> <branch>` (implement), its PR URL appended by review — /milestone-review merges companions first, in listed order -->

## Goal
<!-- owner: plan · create; a wrong goal returns to plan, never edited in place -->

A screen reader can read the text of every page of a PDF.js embed.

## Scope
<!-- owner: plan · create/amend-via-gate -->

**In:** In the PDF.js viewer, each page gets a visually hidden block that
holds the page's text from PDF.js `getTextContent()`. The text is read by
screen readers and cannot be selected on the page. Each page is a group
labeled "Page i of n", and its canvas is hidden from screen readers. Text is
extracted for every page when the embed loads, one page at a time on the
shared render queue, after any page render that waits. The zoom buttons and
the download link get accessible names. The check scripts check all of this,
and the README and CLAUDE.md say what was checked. The version goes to 1.2.0.

**Out:** Visible text selection and search: out of scope by GP1. A check
with a real screen reader (VoiceOver, TalkBack) on a real phone: listed in
CLAUDE.md "Still unverified" (the user chose simulator checks only). The
native `<object>` path: the browser's own viewer gives its own text. Text
checks of `revealjs_test.html` (dummy PDFs): it keeps its rendering checks,
and slides get text checks through `selfcontained_slides_test.html`. A
GitHub release for 1.2.0: the user declares the release window separately.

## Acceptance criteria
<!-- owner: plan · create/amend-via-gate; review reads, never reinterprets.
     Every item opens with its positional label — `ACn:` — the item's
     position counted top-to-bottom, the number Coverage cites; an
     insertion, removal, or reorder renumbers the labels and the Coverage
     lines together. -->

- [x] AC1: In Chrome with an emulated iPhone, each page of each PDF.js embed
      in `example.html` holds that page's text in a hidden but readable
      element: a 1 by 1 CSS pixel box with computed `overflow: hidden`,
      `user-select: none`, `display` not `none`, `visibility: visible`, and no
      `aria-hidden` on it or an ancestor. The text is there within 10 s of
      page load, before the check scrolls. `node tests/render_check.mjs
      example.html --device iphone --expect-native 1 --expect-pdfjs 10
      --expect-text "On the Origin of Coastlines|Why It Matters"` exits 0: in
      all 10 embeds, page 1's text contains the first phrase and not the
      second, and page 2's the second and not the first. The phrases come
      from `pdftotext sample.pdf`, not from the viewer.
- [x] AC2: The same holds on a self-contained page: `node
      tests/render_check.mjs selfcontained_test.html --alone file --device
      iphone --expect-native 1 --expect-pdfjs 2 --expect-pages 2
      --expect-links 4 --expect-text "On the Origin of Coastlines|Why It
      Matters"` exits 0. It holds on self-contained slides, measured when
      each slide is shown and before its pages scroll: the same line with
      `selfcontained_slides_test.html` exits 0.
- [x] AC3: The same holds in Safari on iOS: `node tests/ios_check.mjs
      --device "embedpdf iPhone" --expect-text "On the Origin of
      Coastlines|Why It Matters"` exits 0 for the 10 PDF.js embeds of
      `example.html`, and so does the same line with `--device "embedpdf
      iPad"`.
- [x] AC4: Chrome's accessibility tree gives each page its label and text and
      leaves out the canvas. Procedure: in the AC1 run, after the scroll loop,
      when the number of page canvases equals the number of pages,
      `page.accessibility.snapshot({ root, interestingOnly: false })` per
      element. Each page of the 10 PDF.js embeds is a node of role `group`
      named `Page <i> of 2` whose subtree text contains that page's AC1
      phrase, and no page canvas has a node in the tree.
- [x] AC5: In the AC4 procedure, in each PDF.js embed that has a toolbar, the
      zoom-out button, the zoom-in button, and the toolbar's
      `a.embedpdf-download` link are named `Zoom out`, `Zoom in`, and
      `Download PDF` in Chrome's accessibility tree.
- [x] AC6: Rendering does not regress: `pandoc lua tests/test_shortcode.lua`
      prints `0 failed`, and each `node tests/render_check.mjs` and
      `node tests/ios_check.mjs` command line in CLAUDE.md "Verify before
      finishing" at the review's head commit, plus each rerun its prose names
      (`--alone http`, the `--device mac-safari`, `windows-touch`, and `ipad`
      runs), exits 0.
- [x] AC7: The README "Known limitations" section says that each page of a
      PDF.js embed carries its text, hidden, for screen readers, and that this
      was checked in Chromium's accessibility tree and in the page in Safari
      in iOS 27.0 simulators, not with a screen reader. It still says the
      PDF.js viewer has no text selection or search. CLAUDE.md "Still
      unverified" lists a real screen reader. `quarto render` finishes with no
      errors.

## Coverage
<!-- owner: plan · create/amend-via-gate; each acceptance criterion → the
     task(s) satisfying it, by positional number (AC/Task counted
     top-to-bottom). Review reads to fence evidence — tracking-rules "AC fencing". -->

- AC1 → T1, T3, T4
- AC2 → T1, T3, T4
- AC3 → T1, T3, T5
- AC4 → T1, T4
- AC5 → T2, T4
- AC6 → T1, T3, T7
- AC7 → T6

## Tasks
<!-- owner: plan (create) / implement (check-off, minor edits); substantive
     change is amend-via-gate. Every item opens with its positional label —
     `Tn:` — the item's position counted top-to-bottom, the number Coverage
     cites; an insertion, removal, or reorder renumbers the labels and the
     Coverage lines together. -->

- [x] T1: Viewer page text (`embedpdf-viewer.js`). Give each page element
      `role="group"` and `aria-label="Page i of n"` (line 143 loop) and a
      `.embedpdf-text` child. Render replaces only the canvas, never the text
      (line 184), and the canvas gets `aria-hidden="true"`. At hydrate, queue
      text extraction for every page: `getTextContent()`, item `str` values
      joined, a line break at `hasEOL`. Text tasks run one at a time on the
      shared queue (lines 51-56) and only when no page render waits (GP4). A
      failed extraction logs and leaves that page's text empty.
- [x] T2: Toolbar names: `aria-label` "Zoom out", "Zoom in", "Download PDF"
      on the two buttons and the download link (lines 233-250).
- [x] T3: `embedpdf.css`: `.embedpdf-text` visually hidden (1px box, clip,
      overflow hidden, `user-select: none`). Version 1.2.0 in
      `_extension.yml` and the `add_html_dependency` version in `embedpdf.lua`.
- [x] T4: `tests/render_check.mjs`: `--expect-text "<p1>|<p2>"` reads each
      PDF.js page's text and computed style before the scroll loop (waiting
      at most 10 s; on slides, when each slide is shown) and checks AC1;
      after the loop, per-element snapshots (`interestingOnly: false`) check
      AC4 and AC5. Add plants, one per defect kind: `notext` (empty one
      page's text), `swap` (swap two pages' text), `visible` (one text block
      gets `overflow: visible`), `gone` (one gets `display: none`), `nolabel`
      (drop one page's label), `canvas` (drop one canvas's `aria-hidden`),
      `noname` (drop one toolbar name). Show each run fails with its own
      message before trusting the green.
- [x] T5: `tests/ios_check.mjs`: the probe reports each page's hidden text and
      computed style; `--expect-text` checks them as in AC1. Add the
      `notext`, `swap`, and `visible` plants; show each fails.
- [x] T6: Docs: README "Known limitations" (the AC7 statement; keep the
      no-selection-or-search line), CLAUDE.md "Still unverified" (a real
      screen reader) and the AC1-AC3 lines under "Verify before finishing",
      DESIGN Architecture and Known issues. `quarto render`.
- [x] T7: Run the whole `verify` slot (`cairn/PROFILE.md`), every line.

## Work log
<!-- owner: any skill · append-only; one line per entry; absolute dates. -->

- 2026-10-18: created by /milestone-plan.
- 2026-10-18: tier check: not run — work named at the question set.
- 2026-10-18: question set: what to work on — the "Screen-reader text layer" candidate.
- 2026-10-18: question set: how the hidden text behaves — a visually hidden text block per page that cannot be selected.
- 2026-10-18: question set: a real-phone check before the merge — no, simulator checks only.
- 2026-10-18: plan gate chose a hidden text block per page over the PDF.js text layer (user's answer) because the layer makes text selectable, which GP1 keeps out; falsified by a screen reader that skips or garbles the hidden block where it reads a text layer.
- 2026-10-18: plan gate chose text for every page at load, on the shared queue behind renders, over text only for rendered pages because a screen reader cannot reach pages never scrolled into view; falsified by a measured first-paint delay or memory failure on a constrained phone.
- 2026-10-18: plan gate chose an empty text block for a page with no text over a "This page has no text." message because the page label is still read and no test PDF has a textless page.
- 2026-10-18: collision sweep: candidate "Screen-reader text layer" absorbed (DESIGN Known issues entry); no D-entry, archived milestone, open issue, or open PR overlaps.
- 2026-10-18: checker-regress shape not hit: the render_check and ios_check additions test the new viewer behavior, not the checkers themselves.
- 2026-10-18: criteria audit (full mode, fresh Opus reader) returned 12 findings. Fixed: AC4 uses `interestingOnly: false` after the scroll loop with a canvas count check (the default mode returns the text node, not the group); AC1 also excludes the other page's phrase; AC1 states hidden-but-readable as computed style, not a box size; AC1 bounds the wait at 10 s; AC2 measures slides when shown; AC5 names `a.embedpdf-download`; AC6 names its command lines at the review head plus the prose reruns; AC7 keeps the no-selection-or-search line; AC4 is worded as a property of Chrome's tree; T4 and T5 plant one defect per kind. No finding on reachability or proportionality.
- 2026-10-18: audit gaps disposed: "cannot be selected" is now AC1's `user-select: none`; text tasks yielding to renders (GP4) and a failed extraction leaving empty text stay task behavior with no criterion, since no instrument here measures first-paint delay on a phone and no test PDF fails extraction. AC6 covers that rendering still completes.
- 2026-10-18: render_check on this machine needs `CHROME_PATH=/Applications/Chromium.app/Contents/MacOS/Chromium` (no Google Chrome at the default path), per the audit.
- 2026-10-18: revealjs_test.html gets no text check because its dummy PDFs differ per embed; slide text is checked in selfcontained_slides_test.html.
- 2026-10-18: implement started on branch m004-screen-reader-text.
- 2026-10-18: T1-T3 done: the shared queue is now two lists (renders first, then text tasks), a page render swaps only its canvas, the text block is absolutely placed in a `position: relative` page so layout is unchanged; version 1.2.0. Shortcode tests 40 passed, 0 failed; `quarto render` clean; render_check example.html on iphone (10 PDF.js, 1 native) exits 0. The full verify slot runs at T7.
- 2026-10-18: implement chose no `page.cleanup()` after text extraction: text reading loads no page images, and cleanup could drop objects a pending render needs.
- 2026-10-18: T4 done: render_check `--expect-text` and `--plant`; the RevealJS slide loop moved from the browser to Node so text is read per shown slide and the tree checked per slide. Green in Chromium: example.html iphone (10 embeds read before and after the scroll, text there at 0 ms wait), selfcontained_test and selfcontained_slides_test `--alone file` iphone; revealjs_test iphone without the flag. Each of the 7 plants exits 1 with its own message (example.html), and `notext` on the slides page too. An `<canvas>` without `aria-hidden` shows in Chrome's tree as role `none`.
- 2026-10-18: T5 done: ios_check `--expect-text` reads the text before the probe scrolls (waits at most 10 s). Green on "embedpdf iPhone" (iOS 27.0, text there after 607 ms) and "embedpdf iPad"; the `notext`, `swap`, and `visible` plants each exit 1 with their own message on the iPhone.
- 2026-10-18: T6 done: README limitation line added (selection-and-search line kept), CLAUDE.md "Still unverified" entry and a paragraph on `--expect-text`; `--expect-text` added to every sample.pdf line in "Verify before finishing" (example.html, selfcontained_test, selfcontained_slides_test, ios_check), not to revealjs_test or `--remote` lines. DESIGN Architecture and Known issues corrected. `quarto render` clean. The simple-english hook reports 10 README and 36 CLAUDE.md style hits, all in older text (the added lines lint at 0); left alone as outside this milestone.
- 2026-10-18: claim audit: 65 claims read, 4 corrected — embedpdf-viewer.js (queue comment: a text task can delay a render by one page's read; near-screen pages render too), README.md (the label is on the page group), tests/render_check.mjs (canvas wait is per embed); tests/ios_check.mjs header now says the text check skips native embeds and `--remote`.
- 2026-10-18: T7 done: every command line in CLAUDE.md "Verify before finishing" plus the prose reruns (`--alone http`, selfcontained_test on mac-safari, windows-touch, ipad), 36 runs, 0 failed (Chromium via CHROME_PATH; iOS 27.0 simulators). After the claim-audit comment fix, `quarto render` updated only the docs/ viewer copies (byte-identical to source); the self-contained pages inline the viewer through esbuild, which drops comments, so they did not change. iphone example.html recheck exits 0. Status set to review.
- 2026-10-18: review: 25 reviewer findings, 11 fixed on the branch (6ddd141), 14 to candidate rows "Eager text cost", "Screen-reader text gaps", "Text check gaps", 0 rejected; no defect return, no amendment.

## Decisions
<!-- owner: implement / review · append-only; milestone-local. -->

## Review
<!-- owner: review · exclusive. -->

Evidence pass 1 at 6103315 (2026-10-18; Chromium via `CHROME_PATH`; iOS 27.0 simulators), fresh `quarto render` (no errors, no change to docs/) then every verify line and prose rerun, 36 runs, 0 failed.

- AC1: `render_check example.html --device iphone --expect-native 1 --expect-pdfjs 10 --expect-text "On the Origin of Coastlines|Why It Matters"` exit 0; 10 embeds and 20 pages read before the scroll, 0 text failures (each page has its own phrase and not the other's; 1px box, overflow hidden, user-select none, display block, visibility visible, no aria-hidden). Plants in T4 showed each defect kind fails.
- AC2: `selfcontained_test.html --alone file --device iphone … --expect-text …` exit 0 (2 embeds, 4 pages read, 0 failures); the same with `selfcontained_slides_test.html` exit 0 (read per shown slide; 2 embeds, 4 pages, 0 failures).
- AC3: `ios_check --device "embedpdf iPhone" --expect-text …` pass true (text after 606 ms); iPad pass true (704 ms); 10 PDF.js embeds each.
- AC4: in the AC1 run, the tree check read all 10 embeds after the scroll (canvas count = page count), 0 failures: each page role group named "Page i of 2" with its phrase in the subtree; no canvas node.
- AC5: same run, 0 toolbar-name failures for the embeds with a toolbar ("Zoom out", "Zoom in", "Download PDF" on `a.embedpdf-download`).
- AC6: `pandoc lua tests/test_shortcode.lua` 40 passed, 0 failed; all 35 render_check/ios_check runs of "Verify before finishing" plus the prose reruns exit 0.
- AC7: README.md:88 keeps "does not yet support text selection or search"; README.md:89 states the hidden page text, "Page 1 of 2" groups, the hidden image, no selection, checked in Chromium's accessibility tree and in Safari in iOS 27.0 iPhone and iPad simulators, not with a screen reader. CLAUDE.md "Still unverified" lists a real screen reader. `quarto render` no errors.

Consistency gate: `cairn_validate.py` all checks passed; no principle text changed (`cairn_impact` skipped); the generic profile's consistency-gate slot names no toolchain checks.

spawned: diff-bug, blame-history, prior-review

- diff-bug #1: hidden text uses `white-space: pre-line` in a 1px box, so it wraps one word per line, which some screen readers read run together — fix now (`white-space: pre`), fixed 6ddd141
- diff-bug #2: a text read that never resolves holds the queue and stops every later render — fix now (10 s timeout per text read), fixed 6ddd141
- diff-bug #3: every page's text is read at load and page objects and worker fonts stay with no cleanup; GP4 cost unmeasured — follow-up "Eager text cost"
- diff-bug #4: items are joined with no added space, so multi-column or positioned text may run words together — follow-up "Screen-reader text gaps"
- diff-bug #5: the marked-content skip in `pageText` can never fire without `includeMarkedContent` — fix now (removed), fixed 6ddd141
- diff-bug #6: several embeds give identical "Page 1 of 2" groups and the embed has no name — follow-up "Screen-reader text gaps"
- diff-bug #7: browser find-in-page may match the hidden text — follow-up "Screen-reader text gaps"
- diff-bug #8: toolbar controls carry the same `title` and `aria-label` — follow-up "Screen-reader text gaps"
- diff-bug #9: ios_check text plants that land nowhere let the run pass — fix now (exit 2 "found nothing to plant in"; shown on native.html), fixed 6ddd141
- diff-bug #10: style checks miss `inert`, `opacity`, `content-visibility`, and iOS has no tree check — follow-up "Text check gaps"
- diff-bug #11: a canvas snapshot null for any reason counts as hidden — follow-up "Text check gaps"
- diff-bug #12: the text wait can end at once on a slide with nothing hydrated yet — follow-up "Text check gaps"
- diff-bug #13: render_check's exit paragraph omits `--expect-text` and the plant exit 2 — fix now, fixed 6ddd141
- diff-bug #14: CLAUDE.md gotcha says the viewer serializes rendering only — fix now (text reads named), fixed 6ddd141
- diff-bug #15: with `--expect-text` a broken deck can take minutes to fail — follow-up "Text check gaps"
- diff-bug #16: ios_check's text wait ran on every run — fix now (only with `--expect-text`, via `text=1`), fixed 6ddd141
- blame-history #1: the queue's "only on-screen pages are queued" premise (9887d47) no longer holds, and the load cost is not listed as unverified — fix now (CLAUDE.md "Still unverified" line), fixed 6ddd141; measurement goes to follow-up "Eager text cost"
- blame-history #2: a hung text read stalls every viewer — fix now (same fix as diff-bug #2), fixed 6ddd141
- blame-history #3: no `page.cleanup()` after text reads — follow-up "Eager text cost"
- blame-history #4: a first render can wait behind one text read on the phone path — follow-up "Eager text cost"
- blame-history #5: find-in-page may match hidden text — follow-up "Screen-reader text gaps"
- blame-history #6: on slides the tree plants ran before the canvas wait, so `canvas` could find no canvas — fix now (plant after the wait; canvas, nolabel, noname each exit 1 on selfcontained_slides_test), fixed 6ddd141
- blame-history #7: one 10 s text budget covers the whole shared queue — follow-up "Text check gaps"
- prior-review #1: reading all pages at load revisits M002's phone-memory concern — follow-up "Eager text cost"
- prior-review #2: ios_check accepted `--expect-text` with `--remote` and skipped it silently — fix now (argument error, exit 2), fixed 6ddd141

Evidence pass 2 at 6ddd141 (after the fixes): every verify line and prose rerun again, 36 runs, 0 failed; example.html iphone 10 embeds read before and after the scroll; ios_check iPhone and iPad pass (text after 604 and 605 ms). The AC1-AC7 evidence above holds at this head.
