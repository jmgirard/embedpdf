<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section.
     Per-section owners are tagged below. The one size check that can fail is
     cairn_validate's <150 over the plan-owned body. -->
# M004: Screen-reader text

- **Status:** in-progress   <!-- owner: transitioning skill · mirror-update; cairn/ROADMAP.md is the authority -->
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

- [ ] AC1: In Chrome with an emulated iPhone, each page of each PDF.js embed
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
- [ ] AC2: The same holds on a self-contained page: `node
      tests/render_check.mjs selfcontained_test.html --alone file --device
      iphone --expect-native 1 --expect-pdfjs 2 --expect-pages 2
      --expect-links 4 --expect-text "On the Origin of Coastlines|Why It
      Matters"` exits 0. It holds on self-contained slides, measured when
      each slide is shown and before its pages scroll: the same line with
      `selfcontained_slides_test.html` exits 0.
- [ ] AC3: The same holds in Safari on iOS: `node tests/ios_check.mjs
      --device "embedpdf iPhone" --expect-text "On the Origin of
      Coastlines|Why It Matters"` exits 0 for the 10 PDF.js embeds of
      `example.html`, and so does the same line with `--device "embedpdf
      iPad"`.
- [ ] AC4: Chrome's accessibility tree gives each page its label and text and
      leaves out the canvas. Procedure: in the AC1 run, after the scroll loop,
      when the number of page canvases equals the number of pages,
      `page.accessibility.snapshot({ root, interestingOnly: false })` per
      element. Each page of the 10 PDF.js embeds is a node of role `group`
      named `Page <i> of 2` whose subtree text contains that page's AC1
      phrase, and no page canvas has a node in the tree.
- [ ] AC5: In the AC4 procedure, in each PDF.js embed that has a toolbar, the
      zoom-out button, the zoom-in button, and the toolbar's
      `a.embedpdf-download` link are named `Zoom out`, `Zoom in`, and
      `Download PDF` in Chrome's accessibility tree.
- [ ] AC6: Rendering does not regress: `pandoc lua tests/test_shortcode.lua`
      prints `0 failed`, and each `node tests/render_check.mjs` and
      `node tests/ios_check.mjs` command line in CLAUDE.md "Verify before
      finishing" at the review's head commit, plus each rerun its prose names
      (`--alone http`, the `--device mac-safari`, `windows-touch`, and `ipad`
      runs), exits 0.
- [ ] AC7: The README "Known limitations" section says that each page of a
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
- [ ] T4: `tests/render_check.mjs`: `--expect-text "<p1>|<p2>"` reads each
      PDF.js page's text and computed style before the scroll loop (waiting
      at most 10 s; on slides, when each slide is shown) and checks AC1;
      after the loop, per-element snapshots (`interestingOnly: false`) check
      AC4 and AC5. Add plants, one per defect kind: `notext` (empty one
      page's text), `swap` (swap two pages' text), `visible` (one text block
      gets `overflow: visible`), `gone` (one gets `display: none`), `nolabel`
      (drop one page's label), `canvas` (drop one canvas's `aria-hidden`),
      `noname` (drop one toolbar name). Show each run fails with its own
      message before trusting the green.
- [ ] T5: `tests/ios_check.mjs`: the probe reports each page's hidden text and
      computed style; `--expect-text` checks them as in AC1. Add the
      `notext`, `swap`, and `visible` plants; show each fails.
- [ ] T6: Docs: README "Known limitations" (the AC7 statement; keep the
      no-selection-or-search line), CLAUDE.md "Still unverified" (a real
      screen reader) and the AC1-AC3 lines under "Verify before finishing",
      DESIGN Architecture and Known issues. `quarto render`.
- [ ] T7: Run the whole `verify` slot (`cairn/PROFILE.md`), every line.

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

## Decisions
<!-- owner: implement / review · append-only; milestone-local. -->

## Review
<!-- owner: review · exclusive. -->
