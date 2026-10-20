<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section.
     Per-section owners are tagged below. The one size check that can fail is
     cairn_validate's <150 over the plan-owned body. -->
# M025: Firefox saves inlined PDFs under their file name

- **Status:** review   <!-- owner: transitioning skill · mirror-update; cairn/ROADMAP.md is the authority -->
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

- [x] AC1: The pages are `selfcontained_test.html` and
      `selfcontained_slides_test.html`, each opened alone as a local file and
      over HTTP, in Firefox 158 run headless through puppeteer-core. The
      built-in viewer of each of the 3 native embeds of each page reports
      `sample.pdf` as the file name of the document
      (`PDFViewerApplication._docFilename` in the frame of the viewer). The
      four `tests/save_name_check.mjs --browser firefox` lines read this name.
      They save no file, so AC2 covers the saved name.
- [x] AC2: The user opens `selfcontained_test.html` alone in a windowed
      Firefox 158 on macOS, as a local file and over HTTP. For each of its 3
      native embeds in each case, the user presses the save control of the
      viewer once. Before each save, the save folder holds no file whose name
      starts with `sample`, or Firefox's save dialog shows the name. Each of
      these 6 saves gives the name `sample.pdf`, as the user reports it.
- [x] AC3: After the change, every `node tests/` command line in the fenced
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
- AC4 → T5, T6

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
- [x] T4: Run every `node tests/` line in the "Verify before finishing"
      section of CLAUDE.md and the variants its prose requires, and the
      shortcode tests. Run the Safari save lines a few minutes apart (LESSONS
      M023).
- [x] T5: Update the self-contained bullet of README.md and the save-name
      entry of the Known issues in cairn/DESIGN.md. In CLAUDE.md, update the
      save-name paragraph and the "Still unverified" item, and add the four
      T1 lines. Update the header of `save_name_check.mjs` ("Firefox is not a
      --browser").
- [x] T6: Review return 1: make CLAUDE.md's save-name paragraph and its
      "Still unverified" item each state the name Firefox's viewer reports
      and the hand-save name, with the date.

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
- 2026-10-20: T4 run: 138 lines (every `node tests/` line in the CLAUDE.md section after T5, plus the prose variants: `--alone http` copies, mac-safari and windows-touch desktop variants, ipad for the selfcontained iphone lines), CHROME_PATH=Chromium; 137 exit 0. The Safari save line over HTTP (run 200 s after the others) exited 1: embed 1 saved no file, embeds 2 and 3 saved `Unknown.pdf`. A lone re-run saved nothing for all 3; `lsappinfo front` then named loginwindow (screen locked), so Safari showed no control bar.
- 2026-10-20: claim audit: 50 claims read, 6 corrected — embedpdf-viewer.js (dropped an unmeasured no-copy claim), README.md (name checked for `sample.pdf` with a download link only; hand saves on one page, no slides), CLAUDE.md (`--expect-save` refuses `@blob`), save_name_check.mjs (opening paragraph scoped to Chromium and Safari), cairn/DESIGN.md ("the same with 1.2.9" held until the Safari HTTP line passes). Viewer comment edit re-rendered (`quarto render` clean, version stays 1.2.9).
- 2026-10-20: T4 done: the user unlocked the screen (a stop at a chip); the Safari save line over HTTP then exited 0 (`Unknown.pdf` x 3). All 138 lines exit 0; shortcode tests 162 passed, 0 failed. DESIGN's "the same with 1.2.9" now holds for Chromium and Safari, file and HTTP.
- 2026-10-20: implement complete; status review.
- 2026-10-20: review started: no PR, main not moved; all 138 check lines re-running for fresh AC3 evidence; four lenses spawned; fix-now edits from their findings checkpointed here before the Review section is written (half-done: evidence and dispositions not yet recorded).
- 2026-10-20: the user asked the run to stop using Safari (two Safari windows of theirs were open); no Safari check runs again in this milestone.
- 2026-10-20: review return 1: AC4 fails as written — CLAUDE.md's save-name paragraph does not state the hand-save name and date, and its "Still unverified" item does not state the name Firefox's viewer reports; both passages must state both names with the date.
- 2026-10-20: minor amendment: T6 added for review return 1 (Coverage AC4 → T5, T6).
- 2026-10-20: T6 done: CLAUDE.md's save-name paragraph now states the reported `sample.pdf` (four Firefox lines) and the hand-save `sample.pdf` with 2026-10-20; the "Still unverified" item now states the reported name `sample.pdf` with the date beside the hand saves. Docs only, no check affected; status review.

## Decisions
<!-- owner: implement / review · append-only; milestone-local. -->

## Review
<!-- owner: review · exclusive. -->

- AC1: 2026-10-20 review re-run (script at 74ff6a6, viewer 1.2.9): the four `save_name_check.mjs --browser firefox` lines (`selfcontained_test.html` and `selfcontained_slides_test.html`, `--alone file` and `--alone http`) each exited 0, Firefox 158 headless, every one of the 12 native embeds' viewers reporting `sample.pdf`; no file saved.
- AC2: the user's report at T3 (2026-10-20, work log): in windowed Firefox 158 on macOS, `selfcontained_test.html` (1.2.9) opened alone as a local file and over HTTP, one save per native embed (3 + 3), `sample*` files cleared or the dialog read before each; all 6 saves gave `sample.pdf`. `docs/selfcontained_test.html` is unchanged since that report (`git diff --stat 9004ca5 HEAD -- docs/selfcontained_test.html` is empty; the later viewer edit was a comment, which the self-contained render drops). Not re-run at review: it needs the user's hands, and the question set granted one stop.
- AC3: 2026-10-20 review re-run of the 138 lines (every `node tests/` line in the CLAUDE.md section as it stood after T5, plus the prose variants), CHROME_PATH=Chromium: 137 exited 0, the four Chromium and Safari save lines among them except the Safari `--alone http` line, which exited 2 twice ("no safaridriver session": Safari could not start an automation session). The user then asked that the run stop using Safari, so it was not tried again. That line exited 0 earlier on 2026-10-20 (T4, after 03f0dee) with `Unknown.pdf` x 3. Since then only `tests/save_name_check.mjs` changed (`git diff --stat 03f0dee HEAD -- docs _extensions` is empty), and the Safari `--alone file` line passed on the changed script in the re-run. `pandoc lua tests/test_shortcode.lua`: 162 passed, 0 failed.
- AC4: FAIL at review pass 1. README's self-contained bullet and DESIGN's save-name entry state the reported name and the hand-save name with the date. CLAUDE.md's save-name paragraph (line 252 on) states neither the hand-save name nor a date, and its "Still unverified" item (line 529 on) does not state the reported name. Box left unticked, review return 1.
- consistency gate: `cairn_validate.py` all checks passed; no principle changed (cairn_impact skipped); `generic` profile names no toolchain checks.
- spawned: diff-bug, blame-history, prior-review, ripple. Claim audit at implement: 50 claims, 6 corrected (work log).
- diff-bug #1: DESIGN and ROADMAP still say the extension is at 1.2.8 — fix now, fixed 74ff6a6.
- diff-bug #2: Firefox frame lookup takes the first frame with the address, so on a page whose embeds share one address it can read another embed's viewer — fix now (others removed, exactly one matching frame required; `page_test.html` Firefox run passed), fixed 74ff6a6.
- diff-bug #3: Firefox mode fetches and hashes bytes it never uses, which can throw for a cross-origin PDF — fix now (PREPARE `readBytes` false for Firefox), fixed 74ff6a6.
- diff-bug #4: on a deck, Safari's click could aim at a slide still moving after `Reveal.slide` — reject, false: the Safari driver waits 1500 ms after PREPARE before it reads the box.
- diff-bug #5: Firefox reads the embed's address once, so a deck `<iframe>` that gets its address late reports "no PDF viewer" — fix now (address re-read on each poll), fixed 74ff6a6.
- diff-bug #6: VIEWER_MS comment names Chromium only — fix now, fixed 74ff6a6.
- diff-bug #7: `fileName()` decodes `%2F`, so a `File` name can hold `/`; Firefox's handling not checked — follow-up, row "Close the Firefox save check gaps".
- diff-bug #8: README's "Other addresses were tried in Chromium and Safari" sentence reads as part of the Firefox result — fix now (moved before the Firefox sentences), fixed 74ff6a6.
- blame-history #1: Firefox mode compares no bytes, so another PDF under the right name would pass (D-006 gap) — follow-up, row "Close the Firefox save check gaps" (native_check's Firefox lines check the drawn PDF).
- blame-history #2: the Firefox pass reads the reported name, not the saved name — follow-up, same row.
- blame-history #3: the reversal of "Firefox is not a --browser" has no D-entry — reject, false: no D-entry ruled Firefox out, and the choice is recorded in this milestone's plan and work log.
- prior-review #1: Chromium and Safari names after the change are not shown rerun — reject, false: T4 and this review's re-run record both.
- prior-review #2: Firefox mode reads no bytes, unlike M023's bytes check — follow-up, row "Close the Firefox save check gaps".
- prior-review #3: README's Firefox claims cannot be verified from the diff — reject, false: the work log records the runs and the hand saves.
- prior-review #4: the Blob fallback in `inlinedPdf` is dead code — reject, false: it runs where `File` is not a constructor.
- prior-review #5: the `Reveal.slide` calls run for Chromium and Safari too — reject, false: they run only where `window.Reveal` exists, and no Chromium or Safari save line uses a deck.
- ripple #1: CLAUDE.md's save paragraph says the check presses the control and reads the saved bytes, wrong for Firefox — fix now (scoped to Chromium and desktop Safari), fixed 74ff6a6.
- ripple #2: row "Run the render checks in Firefox" says only native_check and frame_rule_check run in Firefox — fix now (adds save_name_check, corrected M025), fixed 74ff6a6.
- ripple #3: row "Name inlined PDFs in Firefox's viewer" is stale — reject, planned change: post-merge hygiene deletes the row this milestone graduates.
- ripple #4: row "Publish GitHub releases for 1.0 tags" says 1.2.8 — fix now, fixed 74ff6a6.
- ripple #5: DESIGN's releases entry says 1.2.8 — fix now, fixed 74ff6a6.
- ripple #6: the check header's "An entry is a file name, or @blob" lacks the Firefox limit — fix now, fixed 74ff6a6.
