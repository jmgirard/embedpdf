<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section. -->
# M005: Screen-reader names

- **Status:** in-progress
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** GP1, GP3
- **Resolves:** —
- **Surface tier:** user-facing — screen-reader users of every PDF.js embed hear the change
- **Branch/PR:** m005-screen-reader-names

## Goal

A screen reader names each PDF.js embed by its file and reads each toolbar control once.

## Scope

**In:** the PDF.js embed element gets `role="group"` and the name "PDF: " plus its file name, derived by the
viewer's `fileName()` (`embedpdf-viewer.js:366`): the last path segment of `data-src`, without query or fragment,
percent-decoded; on a self-contained page, the file name of its download link. The zoom out, zoom in, and download
controls get one accessible name and keep their mouse tooltip. A test page `name_test.qmd` with two PDF.js embeds of
one PDF in a subfolder, named with a space once and percent-encoded once. Checks in `tests/render_check.mjs` and
`tests/ios_check.mjs`. Version 1.2.1. README screen-reader note and DESIGN.md Architecture.

**Out:**
- A name for native `<object>` embeds → new candidate row "Native embed name".
- Spaces in the hidden page text. Measured at plan time: PDF.js 6.1.200 adds space items itself for gaps, so the
  current join reads positioned words, two columns, and `TJ` gaps with spaces (work log). The remainder stays in
  the row "Screen-reader text gaps".
- Browser find-in-page matching the hidden text → stays in the row "Screen-reader text gaps".
- An author-set name option: the user chose the file name only at the plan question set.
- Safari's accessibility tree: `ios_check.mjs` reads only the DOM, so Safari is checked for attributes, not names.

## Acceptance criteria

- [ ] AC1: Each PDF.js embed on `example.html`, `selfcontained_test.html`, and `name_test.html` is a group named
      "PDF: " plus its file name. `render_check.mjs` checks the name in Chromium's accessibility tree on the desktop
      and iphone devices: "PDF: sample.pdf" on `example.html` and on `selfcontained_test.html` opened with
      `--alone file`, and "PDF: sample copy.pdf" for both embeds on `name_test.html`. `ios_check.mjs` checks in the
      "embedpdf iPhone" and "embedpdf iPad" simulators that each PDF.js embed element on those three pages
      (`selfcontained_test.html` with `--alone yes`) carries `role="group"` and that `aria-label`.
- [ ] AC2: In Chromium's accessibility tree, each zoom out, zoom in, and download control of each PDF.js embed on
      `example.html` (desktop and iphone devices) has a non-empty name and no description equal to that name, and
      the control's `title` (its mouse tooltip) holds the same words as the name. `render_check.mjs` checks this.
- [ ] AC3: After `quarto render`, every `render_check.mjs` and `ios_check.mjs` line in CLAUDE.md "Verify before
      finishing" exits 0. Those lines include `name_test.html` with `render_check.mjs` on the desktop and iphone
      devices and with `ios_check.mjs` in both simulators.
- [ ] AC4: `version:` in `_extensions/embedpdf/_extension.yml` and `VERSION` in `_extensions/embedpdf/embedpdf.lua`
      both read 1.2.1.
- [ ] AC5: README's screen-reader note states the embed's name ("PDF: " plus the file name) and that each toolbar
      control has one name, with the date and the browsers in which AC1 and AC2 were checked.

## Coverage

- AC1 → T1, T2
- AC2 → T3
- AC3 → T1, T2, T3, T4
- AC4 → T4
- AC5 → T5

## Tasks

- [ ] T1: In `hydratePdfjs()`, set `role="group"` and `aria-label="PDF: <name>"` on the embed element, with the
      name from `fileName()` of `opts.src`, or `opts.filename` for an inlined PDF. Add `name_test.qmd`: two
      `renderer=pdfjs` embeds of a copy of `sample.pdf` at `files/sample copy.pdf`, one written with the space and
      one with `%20`. Make sure that `quarto render` copies the PDF into `docs/`.
- [ ] T2: Add `--expect-name "<name>"` to `render_check.mjs` (accessibility tree, every PDF.js embed) and to
      `ios_check.mjs` (DOM `role` and `aria-label`). Plant a wrong name with `--plant` and see each check fail.
- [ ] T3: Make each toolbar control's name come from its `title` alone: drop the duplicate `aria-label` and mark
      the glyph `aria-hidden` (`embedpdf-viewer.js:278-296`). Add a tree check of name, description, and `title` to
      `render_check.mjs` under `--expect-name`, and plant a duplicate description to see it fail.
- [ ] T4: Bump the version to 1.2.1 in both places, `quarto render`, add `--expect-name` to the existing CLAUDE.md
      lines for `example.html` and `selfcontained_test.html`, add the `name_test.html` lines, and run every line.
- [ ] T5: Update README's screen-reader note (README.md:89) and DESIGN.md Architecture from what T4's runs showed.

## Work log

- 2026-10-18: created by /milestone-plan.
- 2026-10-18: tier check: not run — work named at the question set.
- 2026-10-18: question set: what to work on — screen-reader fixes (candidate row "Screen-reader text gaps"); what a screen reader calls an embed — the file name, no new option.
- 2026-10-18: inbox sweep: 0 open issues, 0 open PRs. Collision check: row "Screen-reader text gaps" absorbed in part (started token); M004 (done) shipped the page groups this extends; no D-entry overlaps; no checker-regress shape (the checks gain a flag for new viewer behavior).
- 2026-10-18: plan probe: in Quarto 1.10.19 a shortcode sees no `embed-resources` setting (meta and `PANDOC_WRITER_OPTIONS`), recorded for the row "Self-contained no-JS link".
- 2026-10-18: criteria audit (full mode, fresh Opus reader): 5 findings. Spacing criterion already met on v1.2.0 because PDF.js adds space items for gaps → cut (below). Name criterion tested one file name only → fixed with `name_test.qmd` (subfolder, space, `%20`) and a promise bounded to three pages. Toolbar criterion passable by dropping the tooltip → fixed: the tooltip must stay. Verify criterion depended on the CLAUDE.md list → fixed: names the `name_test.html` lines. README criterion → spacing claim removed.
- 2026-10-18: spacing cut: probe of PDF.js 6.1.200 `getTextContent` in Chromium 155 gave space items for positioned words, two columns, and a `TJ` gap, and line ends for lines drawn out of order or after a font change; only a 2 pt gap at 12 pt and a text rise joined with no space. No change owed; the row "Screen-reader text gaps" keeps the finding for post-merge hygiene.
- 2026-10-18: plan gate chose the file name as the embed name over a new shortcode option (user choice: no new public option to keep stable); falsified by authors whose file names do not say what the PDF is.
- 2026-10-18: plan chose a `title`-only name with an `aria-hidden` glyph over dropping `title` (which loses the mouse tooltip); Chromium probe gave name "Zoom in" and no description for that form; falsified by a screen reader that reads the glyph or skips the title.
- 2026-10-18: version 1.2.1 (patch): no option or default changes.

## Decisions

## Review
