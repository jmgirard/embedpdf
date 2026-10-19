<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section. -->
# M006: Check script gaps

- **Status:** in-progress
- **Priority:** high
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** IP1
- **Resolves:** —
- **Surface tier:** internal — test scripts used only to check this repo
- **Branch/PR:** m006-check-script-gaps

## Goal

Close the four gaps that the M001 review found in `tests/render_check.mjs`, `tests/ios_check.mjs`, and `tests/serve_docs.mjs`.

## Scope

**In:** render_check checks each page of each PDF.js embed without `--expect-pages`, with new plants that show it.
One ink rule for both scripts that reads every pixel and every color channel. `serveDocs` content types for each
extension under `docs/`, `Content-Length`, `Accept-Ranges`, and single byte-range answers. A free default port for
ios_check and a plain message when a given port is in use. A Node test file for the ink rule and the server.
CLAUDE.md and script header updates.

**Out:**
- `serveRemote` range and OPTIONS handling, and the `pointPdfsAt` rewrite gaps → candidate row "Remote check gaps".
- Name check and text check gaps → candidate rows "Name check gaps" and "Text check gaps".
- A PDF over 128 KB, so that PDF.js loads by byte ranges in the browser checks → new candidate row "Large PDF range check".
- Any change to `embedpdf-viewer.js`, `embedpdf.css`, or `embedpdf.lua`, so no extension version bump.

## Acceptance criteria

- [ ] AC1: `render_check.mjs` checks each `.embedpdf-page` of each PDF.js embed on its own, with or without
      `--expect-pages`: a page whose canvas is missing or has no ink, or a PDF.js embed with no pages, makes it exit 1
      and name that embed. `--plant blank` (paints the last page's canvas of the first PDF.js embed white),
      `--plant nocanvas` (removes that canvas), and `--plant nopages` (removes every page of that embed) show it on
      `example.html` in Chrome and with `--device iphone`; each run exits 1 and names embed 1.
- [ ] AC2: Each `getImageData` call that `grep -n getImageData` finds in `render_check.mjs` and `ios_check.mjs` passes
      its data to the ink rule exported by `tests/ink.mjs` and to no other test. The rule finds ink when at least one
      pixel has alpha above 0 and a red, green, or blue value below 250. It finds no ink in all-white pixels,
      all-transparent pixels, or a single gray-252 pixel, and finds ink in a single (255, 0, 0) pixel and in a single
      black pixel at an index that is not a multiple of 100. `node tests/helpers_test.mjs` shows each case.
- [ ] AC3: For each file name extension that a walk of `docs/` finds, `serveDocs` sends a `Content-Type` other than
      `application/octet-stream`; files with no extension are outside this criterion. On `docs/sample.pdf` it sends
      `Content-Length` and `Accept-Ranges: bytes` with the full file, answers `Range: bytes=a-b` with status 206, a
      matching `Content-Range`, and a body equal to bytes a through b of the file on disk, and answers a range that
      starts past the end of the file with 416. `node tests/helpers_test.mjs` shows each case, and fails when its walk
      finds no extension.
- [ ] AC4: Without `--port`, `ios_check.mjs` serves on a free port that the system picks: a run while another process
      holds port 8766 exits 0. With `--port <n>` for a port that another process holds, it exits 2 with a message that
      names the port, not an `EADDRINUSE` stack trace.
- [ ] AC5: Every `node tests/render_check.mjs` line in CLAUDE.md "Verify before finishing", as the section reads at
      the milestone branch head, exits 0, and `node tests/helpers_test.mjs` prints `N passed, 0 failed`.
- [ ] AC6: Every `node tests/ios_check.mjs` line in that section, as it reads at the branch head, exits 0 on the
      "embedpdf iPhone" and "embedpdf iPad" simulators.
- [ ] AC7: CLAUDE.md "Verify before finishing" names `node tests/helpers_test.mjs`. The `--plant` usage lines of
      `render_check.mjs` list blank, nocanvas, and nopages; the `--port` line of `ios_check.mjs` says the default is a
      free port; and the header of each script names `tests/ink.mjs` as its ink rule.

## Coverage

- AC1 → T3
- AC2 → T1, T2
- AC3 → T4
- AC4 → T4, T5
- AC5 → T6
- AC6 → T6
- AC7 → T6

## Tasks

- [x] T1: Add `tests/helpers_test.mjs` (prints `N passed, 0 failed`, exits 1 on any failure) with the AC2 ink cases
      first, then `tests/ink.mjs` exporting the rule. The function must run both by import in Node and as injected
      source in a page (render_check `page.evaluate`, the ios_check probe string), so it uses no outer names.
- [x] T2: Replace the `hasInk` copies at `tests/render_check.mjs:564` and `tests/ios_check.mjs:265` with the shared
      rule; keep each script's own error handling around `getImageData`.
- [x] T3: In `render_check.mjs`, replace the all-canvases check (`:686`) with a per-embed, per-page check that runs
      after the scroll or slide walk (LESSONS M002: slides must be visited first) and names the embed and page. Add
      `--plant blank|nocanvas|nopages`, allowed without `--expect-text` or `--expect-name`, and exiting 2 when there
      is nothing to plant in, as the other plants do.
- [x] T4: In `tests/serve_docs.mjs`, add content types for each extension under `docs/` (today `.ttf`, `.eot`,
      `.map`, `.yml` are missing), send `Content-Length` and `Accept-Ranges: bytes`, answer single `bytes=a-b` and
      `bytes=a-` ranges with 206 and past-the-end ranges with 416, and reject the `serveDocs` promise on a listen
      error. Add the AC3 cases to `helpers_test.mjs` first.
- [x] T5: In `ios_check.mjs`, default `--port` to 0, build the target URL from `server.address().port`, and turn a
      listen error for a given port into exit 2 with a message naming the port.
- [x] T6: Update CLAUDE.md "Verify before finishing" and the two script headers (AC7). Run `quarto render`,
      `node tests/helpers_test.mjs`, the AC1 plants, the AC4 port runs, and every render_check and ios_check line in
      CLAUDE.md.

## Work log

- 2026-10-18: created by /milestone-plan.
- 2026-10-18: tier check: milestone — changes running test code; not a bug users see and not a trivial edit.
- 2026-10-18: collision check: absorbs candidate row "Check script gaps" in full. Rows "Remote check gaps", "Name check gaps", and "Text check gaps" have distinct scopes and stay rows. No archived milestone or D-entry overlaps.
- 2026-10-18: checker-regress shape: not a hit; these scripts check the viewer's rendering in browsers, which reaches users, so no simplify-or-delete option was posed.
- 2026-10-18: inbox sweep: 0 open issues and 0 open PRs on jmgirard/embedpdf.
- 2026-10-18: lessons: M002 (visit each slide before measuring ink) shapes T3.
- 2026-10-18: criteria audit (reduced mode, fresh Opus reader): findings on all seven drafts. Fixed: AC1 narrowed to a per-page check shown by three named plants; AC2 grep tied to `getImageData` calls and the rule stated as behavior; content-type and range criteria merged (AC3), range promise scoped to `docs/sample.pdf`, wording moved off test construction; AC4 gained a run for the free-port case; regression criterion split by script (AC5, AC6) and pinned to the section at the branch head; AC7 narrowed to named lines and fixed (plants are render_check only, the port change is ios_check only).
- 2026-10-18: question set: byte-range scope — server only; a large PDF goes to candidate row "Large PDF range check".
- 2026-10-18: question set: ios_check default port — a free port the system picks.
- 2026-10-18: plan gate chose server-only range support over adding a PDF over 128 KB because no current PDF makes PDF.js load by ranges; falsified by a range-path failure seen with a large PDF on GitHub Pages.
- 2026-10-18: plan chose one shared ink rule in `tests/ink.mjs` over fixing each script's copy because one rule tested in Node then covers both scripts; falsified by the shared function failing to run as injected source in iOS Safari.
- 2026-10-18: T1: `tests/ink.mjs` exports `inkInPixels(data)`; `tests/helpers_test.mjs` prints 8 passed, 0 failed, and the same cases with the old every-100th-pixel red rule give 5 passed, 3 failed (red pixel, last pixel, blue pixel).
- 2026-10-18: T2: render_check rebuilds the rule with `new Function` from `inkInPixels.toString()` passed to `page.evaluate`, and ios_check inlines the same source into its probe; `grep -n getImageData` finds one call per script, each passed to the rule. Chromium example.html line exits 0 (4 of 4 canvases inked). Google Chrome is not installed; runs use `CHROME_PATH=/Applications/Chromium.app/Contents/MacOS/Chromium`, as M001 did.
- 2026-10-18: T3: render_check reports each PDF.js page as "ok", "no canvas", or "no ink" and fails per embed on every run; `--plant blank|nocanvas|nopages` act in the final measure step. On example.html (Chrome and `--device iphone`) the clean run exits 0 and each plant exits 1 naming embed 1 (page 2 no ink, page 2 no canvas, no pages). The old all-canvases check passes nocanvas and nopages, since every canvas left has ink. The T3 edit was made with a python script, not the Edit tool; later edits use Edit.
- 2026-10-18: T4: server cases added first (14 failed on the old server: four extensions, headers, ranges, and an unhandled EADDRINUSE crash); `serveDocs` now sends types for `.ttf`, `.eot`, `.map`, `.yml`, Content-Length and Accept-Ranges, 206 for `bytes=a-b` and `bytes=a-`, 416 past the end, other Range forms get the whole file; `serveDocs` and `serveRemote` reject on a listen error. `node tests/helpers_test.mjs`: 32 passed, 0 failed.
- 2026-10-18: T5: ios_check `--port` defaults to 0 and the target URL reads `server.address().port`; a bad `--port` value exits 2. With a second process holding 8766: `--port 8766` exits 2 ("port 8766 is in use…"), and the default run on "embedpdf iPhone" exits 0 on port 52578. With the shared ink rule, `--plant blank` reports "embed 1: pages without ink: 2" (exit 1) and `--plant missing` exits 1.
- 2026-10-18: T6: CLAUDE.md names `node tests/helpers_test.mjs` and the shared ink rule; script headers updated in T3 and T5. `quarto render` exits 0 with no docs/ change. All 29 render_check and ios_check lines in CLAUDE.md exit 0 (Chromium via CHROME_PATH; "embedpdf iPhone" and "embedpdf iPad"), and 11 prose variants (`--alone http`, mac-safari, windows-touch, ipad) exit 0; the ipad variant of the `--alone http` iphone line was not run. The simple-english hook reports 37 style hits in CLAUDE.md that predate this milestone; only the one em dash this milestone added was fixed.
- 2026-10-18: claim audit: not owed — internal tier.
- 2026-10-18: amendment routed: AC4 — a holder on `0.0.0.0` or `::` does not stop `serveDocs` binding 127.0.0.1 on macOS, so "a port that another process holds" promises an exit 2 that no bind on 127.0.0.1 can detect (diff-bug #1).
- 2026-10-18: re-audit: AC4 (reduced) — on the draft "a port that another process holds on 127.0.0.1": "holds" is wider than a TCP bind detects (a UDP socket does not block it), and the exit-0 run is not named; suggested naming a TCP listener on 127.0.0.1 and the command lines.
- 2026-10-18: re-audit: AC4 (reduced) — on the reader-fixed draft: clause 2 still quantifies over every `<n>` (0, leading zeros, ports below 1024, dual-stack sockets) and every other option, a demonstration family; suggested one concrete run with the EADDRINUSE branch cited. Second re-audit line on AC4: the wording goes to the user.

## Decisions

## Review

### Pass 1 (2026-10-18, head 7d73d07)

- Sync: main had not moved since the plan commit; Copilot round off (no `# Copilot review:` line).
- Consistency gate: `cairn_validate.py` exit 0 (all checks passed); no principle changed, so `cairn_impact` skipped; generic profile names no toolchain checks.
- Evidence run started at 7d73d07 (helpers 32 passed; the six AC1 plant runs exited 1 naming embed 1 and the two clean runs exited 0; AC4 port runs exit 2 and exit 0; the first 10 CLAUDE.md lines exit 0), then stopped, because the fix-now commit and the AC4 amendment below change the code. No box is ticked in this pass; pass 2 gathers all evidence again.
- spawned: diff-bug, blame-history, prior-review, ripple
- diff-bug #1: `--port <n>` exits 2 only when the other process holds 127.0.0.1; a holder on `0.0.0.0` or `::` lets `serveDocs` bind 127.0.0.1 (macOS SO_REUSEADDR), and the run goes on — amendment routed (AC4 promises "a port that another process holds", wider than any bind can detect; a holder on another address takes no traffic for 127.0.0.1, and the run then works).
- diff-bug #2: `pdfjsPages` was read before the native-object fetch awaits but the `pdfjs` count after them — fix now, fixed d16f5c8.
- diff-bug #3: render_check's ink read had no try/catch, so a `getImageData` throw named no embed — fix now (page status "unreadable (…)"), fixed d16f5c8.
- diff-bug #4: `serveRemote` (both scripts) and render_check's `serveDocs` start had no catch for the new rejection — fix now (exit 2 with a message), fixed d16f5c8.
- diff-bug #5: ios_check `--port` accepted "", hex, and exponent forms — fix now (digits only), fixed d16f5c8.
- diff-bug #6: the non-EADDRINUSE message printed "port 0" on a default run — fix now, fixed d16f5c8.
- diff-bug #7: helper tests lacked range edge cases and the `</script` hazard of the iOS inline path — fix now (clamped end, end before start, script-safe source), fixed d16f5c8; empty file and HEAD cases rejected, false as gaps: the reviewer's own probe showed both correct and AC3 names `docs/sample.pdf` only.
- diff-bug #8: ios_check `--plant blank|missing` has no "found nothing to plant in" exit (pre-existing) — follow-up, row "Ink check follow-ups".
- diff-bug #9: ios_check reports "no canvas" and "no ink" alike (pre-existing) — follow-up, row "Ink check follow-ups".
- diff-bug #10: render_check read each canvas twice (`withInk` unused) — fix now (removed), fixed d16f5c8.
- diff-bug #11: one non-white pixel counts as ink — reject, planned change (AC2's rule).
- diff-bug #12: `new Function` may be blocked by a page CSP on an outside URL — follow-up, row "Ink check follow-ups".
- diff-bug #13: 416 without Accept-Ranges, header sentence wrap, "canvas" vs "nocanvas" names — header wrap fixed d16f5c8; the other two rejected, style (the HTTP spec allows the 416 form).
- blame-history #1: small PDFs now take the range path — reject, false: PDF.js 6.1.200 uses ranges only when Content-Length is over 2 × 65536 bytes (`validateRangeRequestCapabilities` in `pdfjs/pdf.min.mjs`), and every docs/ PDF is 21118 bytes or less.
- blame-history #2: the 250 threshold counts light tints as ink — reject, planned change (AC2).
- blame-history #3: a page with no canvas now fails every run, a timing risk with fixed waits — reject as a defect, planned change (AC1); the timing risk is a follow-up, row "Ink check follow-ups".
- blame-history #4: the fixed port 8766 is gone; no reason for it was recorded — reject, planned change (AC4).
- blame-history #5: full-pixel scan costs more on a phone — reject, planned change (AC2).
- blame-history #6: unguarded `serveRemote` start in ios_check — fix now (same as diff-bug #4), fixed d16f5c8.
- blame-history #7: `canvasesWithInk` unused — fix now (same as diff-bug #10), fixed d16f5c8.
- prior-review #1: no-canvas failure is a timing risk — follow-up (same as blame-history #3), row "Ink check follow-ups".
- prior-review #2: the threshold was untested below 252 — fix now (gray-249 case), fixed d16f5c8.
- prior-review #3: ios_check ink plants lack the nothing-to-plant exit — follow-up (same as diff-bug #8).
- prior-review #4: `serveRemote` still has no Range handling — follow-up, already in row "Remote check gaps".
- prior-review #5: `listen()` drops its error handler after listening — reject, false as a regression: on main the server had no error handler at all.
- ripple #1: candidate row "Check script gaps" still lists the four gaps — reject, planned change: post-merge hygiene removes the row this milestone graduates.
- ripple #2: PROFILE.md `verify` slot had no line for the helper tests — fix now, fixed d16f5c8.
- ripple #3: row "Large PDF range check" says "after M006" — reject, false: it is accurate once M006 merges.
- ripple #4: CLAUDE.md said "`--plant` in both scripts" though the lists differ — fix now, fixed d16f5c8.
