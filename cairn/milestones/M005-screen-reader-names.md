<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section. -->
# M005: Screen-reader names

- **Status:** review
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

- [x] AC1: Each PDF.js embed on `example.html`, `selfcontained_test.html`, and `name_test.html` is a group named
      "PDF: " plus its file name. `render_check.mjs` checks the name in Chromium's accessibility tree on the desktop
      and iphone devices: "PDF: sample.pdf" on `example.html` and on `selfcontained_test.html` opened with
      `--alone file`, and "PDF: sample copy.pdf" for both embeds on `name_test.html`. `ios_check.mjs` checks in the
      "embedpdf iPhone" and "embedpdf iPad" simulators that each PDF.js embed element on those three pages
      (`selfcontained_test.html` with `--alone yes`) carries `role="group"` and that `aria-label`.
- [x] AC2: In Chromium's accessibility tree, each zoom out, zoom in, and download control of each PDF.js embed on
      `example.html` (desktop and iphone devices) has a non-empty name and no description equal to that name, and
      the control's `title` (its mouse tooltip) holds the same words as the name. `render_check.mjs` checks this.
- [x] AC3: After `quarto render`, every `render_check.mjs` and `ios_check.mjs` line in CLAUDE.md "Verify before
      finishing" exits 0. Those lines include `name_test.html` with `render_check.mjs` on the desktop and iphone
      devices and with `ios_check.mjs` in both simulators.
- [x] AC4: `version:` in `_extensions/embedpdf/_extension.yml` and `VERSION` in `_extensions/embedpdf/embedpdf.lua`
      both read 1.2.1.
- [x] AC5: README's screen-reader note states the embed's name ("PDF: " plus the file name) and that each toolbar
      control has one name, with the date and the browsers in which AC1 and AC2 were checked.

## Coverage

- AC1 → T1, T2
- AC2 → T3
- AC3 → T1, T2, T3, T4
- AC4 → T4
- AC5 → T5

## Tasks

- [x] T1: In `hydratePdfjs()`, set `role="group"` and `aria-label="PDF: <name>"` on the embed element, with the
      name from `fileName()` of `opts.src`, or `opts.filename` for an inlined PDF. Add `name_test.qmd`: two
      `renderer=pdfjs` embeds of a copy of `sample.pdf` at `files/sample copy.pdf`, one written with the space and
      one with `%20`. Make sure that `quarto render` copies the PDF into `docs/`.
- [x] T2: Add `--expect-name "<name>"` to `render_check.mjs` (accessibility tree, every PDF.js embed) and to
      `ios_check.mjs` (DOM `role` and `aria-label`). Plant a wrong name with `--plant` and see each check fail.
- [x] T3: Make each toolbar control's name come from its `title` alone: drop the duplicate `aria-label` and mark
      the glyph `aria-hidden` (`embedpdf-viewer.js:278-296`). Add a tree check of name, description, and `title` to
      `render_check.mjs` under `--expect-name`, and plant a duplicate description to see it fail.
- [x] T4: Bump the version to 1.2.1 in both places, `quarto render`, add `--expect-name` to the existing CLAUDE.md
      lines for `example.html` and `selfcontained_test.html`, add the `name_test.html` lines, and run every line.
- [x] T5: Update README's screen-reader note (README.md:89) and DESIGN.md Architecture from what T4's runs showed.

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
- 2026-10-18: T1 done: `hydratePdfjs()` sets `role="group"` and `aria-label` ("PDF" alone when no file name is found); `name_test.qmd` lists `files/sample copy.pdf` under `resources`, and `quarto render name_test.qmd` copied it to `docs/files/`. Checked by T2's checks.
- 2026-10-18: T2 done: `--expect-name` and `--plant wrongname` in both scripts (Chromium 155 via `CHROME_PATH`). Green on `name_test.html` (desktop, iphone), `example.html`, and `selfcontained_test.html --alone file`; red with the plant and with a wrong expected name, each naming the embed and the wrong label; iPhone simulator green on `name_test.html` and red with the plant. The `ios_check.mjs` edit went through a Python script, not the Edit tool, so the app's edited-files card misses it.
- 2026-10-18: T3 done: each toolbar control holds its glyph in an `aria-hidden` span and has `title` only. `--expect-name` also checks the three controls; green on `example.html` (desktop, iphone, with `--expect-text`); `--plant dupdesc` fails with "description repeats the name"; the existing `--plant noname` now removes `title` and still fails.
- 2026-10-18: checkpoint (T4, T5 in progress): version 1.2.1 in both places; CLAUDE.md lines gain `--expect-name` and four `name_test.html` lines; README note and DESIGN.md Architecture drafted; full verify run (38 lines) and claim audit running.
- 2026-10-18: claim audit: 48 claims read, 4 corrected — README.md (Safari checked attributes only, not toolbar controls), name_test.qmd (no screen reader used), CLAUDE.md (toolbar check wording), tests/ios_check.mjs (`--expect-name` skipped under `--remote`).
- 2026-10-18: T4, T5 done: `pandoc lua tests/test_shortcode.lua` 40 passed, 0 failed; `quarto render` clean; every CLAUDE.md check line plus its `--alone http`, desktop-device, `ipad`, and remote-desktop variants (38 runs, Chromium 155 and the iOS 27.0 "embedpdf iPhone" and "embedpdf iPad" simulators) exited 0; after the claim-audit text change, the 4 `name_test.html` lines exited 0 again. Status → review.

## Decisions

## Review

- 2026-10-18 sync: branch level with `origin/main` (0 commits behind); Copilot round off (no `# Copilot review:` line in PROFILE.md).
- AC4 evidence (2026-10-18): `grep` reads `version: 1.2.1` at `_extension.yml:3` and `local VERSION = "1.2.1"` at `embedpdf.lua:22`.
- AC5 evidence (2026-10-18): README.md:89 states the name ("a group named "PDF: " and the PDF's file name, for example "PDF: sample.pdf""), that each toolbar control "has one name, which is also its tooltip", the date 2026-10-18, Chromium's accessibility tree, and Safari in iOS 27.0 iPhone and iPad simulators (attributes only).
- AC3 evidence (2026-10-18, at 68a93b5): `pandoc lua tests/test_shortcode.lua` 40 passed, 0 failed; `quarto render` exit 0; all 29 `render_check.mjs`/`ios_check.mjs` lines in CLAUDE.md "Verify before finishing" exited 0 (Chromium 155 via `CHROME_PATH`; iOS 27.0 "embedpdf iPhone" and "embedpdf iPad"), the 2 `name_test.html` render_check lines and the 2 `name_test.html` ios_check lines among them. After the fix-now commit 75e0496 (test scripts only), the 11 render_check lines carrying `--expect-name` exited 0 again; the ios_check change only refuses `--expect-name` with `--remote`, which no CLAUDE.md line passes.
- AC1 evidence (2026-10-18): in the AC3 run, render_check `--expect-name` passed "PDF: sample.pdf" on `example.html` (desktop, iphone) and `selfcontained_test.html --alone file` (desktop, iphone), and "PDF: sample copy.pdf" on `name_test.html` (desktop, iphone), re-passed after 75e0496; ios_check `--expect-name` passed in both simulators on `example.html`, `selfcontained_test.html --alone yes`, and `name_test.html` (2 embeds). `--plant wrongname` fails both scripts naming the embed and the wrong label (T2 log; render_check again at 75e0496).
- AC2 evidence (2026-10-18): render_check `--expect-name` on `example.html` (desktop, iphone) passed the toolbar check (non-empty tree name, no description equal to it, `title` equal to it) in the AC3 run and again after 75e0496; `--plant dupdesc` fails with "zoom in control: description repeats the name "Zoom in""; `--plant notoolbar` fails with "no toolbar, and toolbar=false is not set".
- Consistency gate (2026-10-18): `cairn_validate.py` all checks passed; no IP/GP line changed in DESIGN.md, so `cairn_impact.py` skipped; profile `generic` names no toolchain checks.
- spawned: diff-bug, blame-history, prior-review (user-facing tier, full fan-out). 20 findings: 5 fix now, 11 follow-up, 4 rejected. None shows a criterion failing, so no return.
- diff-bug #1: ios_check skips `--expect-name` under `--remote` with no error — fix now, fixed 75e0496 (usage error, exit 2).
- diff-bug #2: the scripts disagree under `--remote` (render_check fails with a count message) — fix now, fixed 75e0496 (ios_check now refuses the pair; render_check already fails loudly).
- diff-bug #3: the toolbar check passes when every toolbar is gone — fix now, fixed 75e0496 (fails unless the embed has `data-toolbar="false"`; `--plant notoolbar` added).
- diff-bug #4: `dupdesc` plants only in zoom-in, and no plant removes `role="group"` — follow-up, row "Name check gaps".
- diff-bug #5: `revealjs_test.html` (several PDFs) gets no `--expect-name` line — follow-up, row "Name check gaps".
- diff-bug #6: a query-style URL or bare host gives a misleading name — follow-up, row "Embed name gaps".
- diff-bug #7: self-contained fallback "document.pdf" (unreachable today) and a possible base64 name if Quarto inlined `href` — follow-up, row "Embed name gaps".
- diff-bug #8: literal and malformed `%` in file names untested — follow-up, row "Name check gaps".
- diff-bug #9: a `title`-only name is unchecked in Safari and VoiceOver, and touch devices show no tooltip — follow-up, row "Embed name gaps"; CLAUDE.md "Still unverified" now names it (4bb975a).
- diff-bug #10: the page indicator "1 / 2" has no label (code unchanged) — follow-up, row "Embed name gaps".
- blame-history #1: the toolbar's M004 `aria-label` reversed, verified only in Chromium — follow-up, row "Embed name gaps"; CLAUDE.md "Still unverified" updated (4bb975a).
- blame-history #2: the `noname` plant still fails after the change — rejected, false: no defect (it reports a confirmation).
- blame-history #3: the self-contained `role="img"` removal still runs before `role="group"` — rejected, false: no defect.
- blame-history #4: a malformed `%` falls back to the raw segment, untested — follow-up, row "Name check gaps".
- blame-history #5: a trailing slash gives plain "PDF" — rejected, planned change (T1 work-log line).
- blame-history #6: `files/sample copy.pdf` duplicates `sample.pdf` — rejected, planned change (the fixture needs a copy in a subfolder with a space).
- blame-history #7: CLAUDE.md "Still unverified" did not name the embed and toolbar names — fix now, fixed 4bb975a.
- prior-review #1: `--expect-name` silent under `--remote`, the M004 flag-silence pattern — fix now, fixed 75e0496 (same fix as diff-bug #1).
- prior-review #2: two embeds of one file get identical names and page groups (partial close of an M004 finding) — follow-up, row "Embed name gaps".
- prior-review #3: on a slide without `--expect-text`, the name check runs with no hydration wait — follow-up, row "Name check gaps".
