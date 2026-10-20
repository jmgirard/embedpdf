<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section.
     Per-section owners are tagged below. The one size check that can fail is
     cairn_validate's <150 over the plan-owned body. -->
# M025: Firefox saves inlined PDFs under their file name

- **Status:** in-progress   <!-- owner: transitioning skill · mirror-update; cairn/ROADMAP.md is the authority -->
- **Priority:** normal   <!-- owner: plan · create/amend-via-gate; high | normal | low -->
- **Depends on:** —   <!-- owner: plan · create/amend-via-gate; M<xx>, M<yy> or — -->
- **Driving RR:** —   <!-- owner: plan · create/amend-via-gate; RR<NN> whose Binding criteria bind this milestone's ACs (binding-criteria check), or — -->
- **Principles touched:** GP4   <!-- owner: plan · create/amend-via-gate; comma-separated IPn/GPn ids this milestone touches, or — -->
- **Resolves:** —   <!-- owner: plan · create/amend-via-gate; comma-separated GitHub issues the scope absorbs, each `#N closes` (the PR closes it at merge) or `#N partial` (the remainder gets a candidate row), or — ; skill conduct only — no validate check parses it -->
- **Surface tier:** user-facing — it changes the file name Firefox gives a saved copy of an inlined PDF   <!-- owner: plan · create/amend-via-gate; user-facing | internal — <one-clause reason>; skill conduct only — no validate check parses it -->
- **Branch/PR:** m025-firefox-save-name   <!-- owner: implement (branch) / review (PR URL) · create; a companion checkout the milestone also works in is one further entry per checkout, `companion: <abs-path> <branch>` (implement), its PR URL appended by review — /milestone-review merges companions first, in listed order -->

## Goal
<!-- owner: plan · create; a wrong goal returns to plan, never edited in place -->

On `selfcontained_test.html` and `selfcontained_slides_test.html`, Firefox's built-in PDF viewer saves the inlined PDF of each native embed as `sample.pdf`.

## Scope
<!-- owner: plan · create/amend-via-gate -->

**In:** `inlinedPdf` in `_extensions/embedpdf/embedpdf-viewer.js` wraps the
decoded PDF in a `File` in every browser. The `File` takes the embed's
download name (`opts.filename`), so a native `<object>` or `<iframe>` gets a
`blob:` URL of a `File`. M023 found that a `File` made the viewer of Firefox
158 report `sample.pdf`, and that it changed no saved name in Chromium 155 or
desktop Safari 27.0.1. A `--browser firefox` mode of
`tests/save_name_check.mjs` reads the name that Firefox's viewer reports. One
hand save per embed in a windowed Firefox checks the saved name. The version
goes to 1.2.9. README.md, CLAUDE.md, cairn/DESIGN.md, and the check's header
state the result.

**Out:** An automated save in Firefox. Under puppeteer-core its viewer saved
no file (M023), so the docs keep it as unchecked (T5). File names other than
`sample.pdf` (a space, a `%`, the `document.pdf` fallback) in Firefox's
viewer. The `File` takes the name that `fileName()` gives, which
`tests/name_rule_test.mjs` checks, and the DESIGN.md Known issues entry names
these forms as not checked in Firefox (T5). Saved names in Chromium and
Safari, which M023 found unchanged by a `File`: the "Name inlined PDFs in
Firefox's viewer" row's detail stays the record of the tried forms.

## Acceptance criteria
<!-- owner: plan · create/amend-via-gate; review reads, never reinterprets.
     Every item opens with its positional label — `ACn:` — the item's
     position counted top-to-bottom, the number Coverage cites; an
     insertion, removal, or reorder renumbers the labels and the Coverage
     lines together. -->

- [ ] AC1: The pages are `selfcontained_test.html` and
      `selfcontained_slides_test.html`, each opened alone as a local file and
      over HTTP, in Firefox 158 run headless through puppeteer-core. The
      built-in viewer of each of the 3 native embeds of each page reports
      `sample.pdf` as the file name of the document
      (`PDFViewerApplication._docFilename` in the frame of the viewer). The
      four `tests/save_name_check.mjs --browser firefox` lines read this name.
      They save no file, so AC2 covers the saved name.
- [ ] AC2: The user opens `selfcontained_test.html` alone in a windowed
      Firefox 158 on macOS, as a local file and over HTTP. For each of its 3
      native embeds in each case, the user presses the save control of the
      viewer once. Before each save, the save folder holds no file whose name
      starts with `sample`, or Firefox's save dialog shows the name. Each of
      these 6 saves gives the name `sample.pdf`, as the user reports it.
- [ ] AC3: After the change, every `node tests/` command line in the fenced
      blocks of the "Verify before finishing" section of CLAUDE.md, as the
      section stands after T5, exits 0. So does each variant that the prose
      of that section requires: an `--alone file` line run again with
      `--alone http`, and the `--device` runs it names. These lines include
      the four `save_name_check.mjs` lines for Chromium (`@blob`) and desktop
      Safari (`Unknown.pdf`). `pandoc lua tests/test_shortcode.lua` prints
      "N passed, 0 failed".
- [ ] AC4: Four passages state the name that Firefox's viewer reports (AC1)
      and the name of the hand saves (AC2), with the date: the self-contained
      bullet of README.md, the save-name entry of the Known issues in
      cairn/DESIGN.md, and the save-name paragraph and the "Still unverified"
      item in CLAUDE.md. The "Still unverified" item keeps an automated save
      in Firefox as not checked.

## Coverage
<!-- owner: plan · create/amend-via-gate; each acceptance criterion → the
     task(s) satisfying it, by positional number (AC/Task counted
     top-to-bottom). Review reads to fence evidence — tracking-rules "AC fencing". -->

- AC1 → T1, T2
- AC2 → T3
- AC3 → T2, T4, T5
- AC4 → T5

## Tasks
<!-- owner: plan (create) / implement (check-off, minor edits); substantive
     change is amend-via-gate. Every item opens with its positional label —
     `Tn:` — the item's position counted top-to-bottom, the number Coverage
     cites; an insertion, removal, or reorder renumbers the labels and the
     Coverage lines together. -->

- [x] T1: Add `--browser firefox` to `tests/save_name_check.mjs`. For each
      native embed, the mode finds the frame of its viewer with
      `page.frames()` and reads `PDFViewerApplication._docFilename`. It
      compares that name with `--expect-save`. It saves no file. The header
      says that the mode reads the reported name, not a saved file. The
      `wrongname` plant must exit 1 and name the planted embed. Run the four
      lines on the current viewer and see each one fail with `document.pdf`.
      Firefox needs its profile folder first (LESSONS M020).
- [x] T2: Change `inlinedPdf` to make a `File` named `opts.filename`, with no
      copy of the bytes (GP4). Where `File` is not a constructor, it keeps the
      Blob. Bump `version:` to 1.2.9 in `_extension.yml` and in the
      `add_html_dependency` call in `embedpdf.lua`. Run `quarto render`, then
      the four T1 lines, which must pass.
- [x] T3: Stop once for the user, as the question set granted. Give the
      local-file path and the HTTP address of the page copy opened alone. Ask
      the user to clear `sample*` files from the save folder before each save,
      or to read the name in the save dialog. Ask for one save for each native
      embed in each case. Write the 6 reported names in the work log.
- [ ] T4: Run every `node tests/` line in the "Verify before finishing"
      section of CLAUDE.md and the variants its prose requires, and the
      shortcode tests. Run the Safari save lines a few minutes apart (LESSONS
      M023).
- [x] T5: Update the self-contained bullet of README.md and the save-name
      entry of the Known issues in cairn/DESIGN.md. In CLAUDE.md, update the
      save-name paragraph and the "Still unverified" item, and add the four
      T1 lines. Update the header of `save_name_check.mjs` ("Firefox is not a
      --browser").

## Work log
<!-- owner: any skill · append-only; one line per entry; absolute dates. -->

- 2026-10-20: created by /milestone-plan.
- 2026-10-20: tier check: not run — work named at the question set.
- 2026-10-20: question set: which work to plan — "Firefox save name" (the candidate row "Name inlined PDFs in Firefox's viewer").
- 2026-10-20: question set: may the run stop once for a hand save in Firefox — yes, ask once.
- 2026-10-20: collision check: absorbs the candidate row "Name inlined PDFs in Firefox's viewer"; extends M023 (done, no viewer change, shipped save_name_check.mjs); no D-entry overlaps (D-008 frame rule unchanged, since an inlined PDF keeps its frame); inbox sweep found 0 open issues and 0 open PRs.
- 2026-10-20: checker-regress shape judged not hit: save_name_check.mjs checks the viewer's behavior in browsers, not repo-internal artifacts, and the new mode checks new viewer behavior.
- 2026-10-20: lessons harvested: M020 (Firefox profile folder via `open`), M023 (`_docFilename` in `page.frames()`, Safari save pacing), M004 (esbuild drops comments in self-contained pages).
- 2026-10-20: plan gate chose a `File` in every browser over a `#filename=` fragment because a `File` leaves the address that Chromium and Safari read unchanged and M023 saw no saved-name change from it there; falsified by a hand save in Firefox that gives `sample.pdf` with the fragment and another name with the `File`.
- 2026-10-20: plan gate chose a `File` in every browser over a Firefox-only `File` because it needs no browser detection and M023 saw no effect elsewhere; falsified by a check line that passes before the change and fails after it in Chromium or Safari.
- 2026-10-20: plan gate chose a `--browser firefox` mode of save_name_check.mjs over a new script or a native_check.mjs mode because the check's question (the save name per native embed) and its `--expect-save` entries are the same; falsified by a mode that needs none of the script's page preparation.
- 2026-10-20: criteria audit (full mode, fresh Opus reader) returned 9 findings, all fixed: AC1 now says it reads a reported name and saves no file; AC1 adds the two `selfcontained_slides_test.html` lines and the Goal names the two pages and `sample.pdf` (other names moved to Out and DESIGN); AC1's fail-before moved to T1; AC2 clears `sample*` files before each save (Firefox would add a suffix); AC2's work-log record moved to T3; AC3 covers the prose variants and the section after T5, Safari's `Unknown.pdf` kept on purpose (M023's finding); AC4's grep, which wrapped lines defeat, replaced by four named passages; AC4 keeps an automated Firefox save as unverified; the CLAUDE.md lines moved to T5.
- 2026-10-20: no issue-assignment option, since Resolves is empty.
- 2026-10-20: implement started on branch m025-firefox-save-name; tree clean at the cut.
- 2026-10-20: T1 done: `--browser firefox` in save_name_check.mjs reads `_docFilename` in the frame whose address (no fragment) is the embed's; Firefox takes only file-name entries and the wrongname and nosave plants. On a deck the check now shows the slide of an `<iframe>` with no address yet and of the embed it checks (the slides line read nothing for embed 3 before). Before T2 all four lines exited 1 with `document.pdf` for each of the 12 embeds.
- 2026-10-20: T2 done: `inlinedPdf` makes a `File` named `opts.filename` (Blob where `File` is not a constructor); version 1.2.9; `quarto render` clean; shortcode tests 162 passed, 0 failed. All four Firefox lines exit 0 (`sample.pdf` x 12). Plants on the http line: wrongname at 1 and at 3 exit 1 naming the embed (`dummy.pdf`), nosave at 2 exits 1 (no viewer); otherbytes and `@blob` exit 2. Chromium save line (file) still saves `<blob id>.pdf`.
- 2026-10-20: T3 done: the user saved each of the 3 native embeds of `selfcontained_test.html` (1.2.9) alone in windowed Firefox 158 on macOS, as a local file (scratchpad copy) and over HTTP (serveDocs on port 8765), clearing `sample*` files or reading the dialog before each save; the user reported the 6 names as `sample.pdf`, `sample.pdf`, `sample.pdf` (file) and `sample.pdf`, `sample.pdf`, `sample.pdf` (HTTP), in one answer ("All six: sample.pdf").
- 2026-10-20: minor amendment: T5 ran before T4, since AC3 runs the CLAUDE.md lines as they stand after T5; task labels unchanged.
- 2026-10-20: T5 done: README self-contained bullet, DESIGN Known issues save-name entry (marked corrected M025), CLAUDE.md save-name paragraph, its four Firefox lines, and the "Still unverified" item (automated Firefox save, slides by hand, other names); save_name_check.mjs header updated in T1.

## Decisions
<!-- owner: implement / review · append-only; milestone-local. -->

## Review
<!-- owner: review · exclusive. -->
