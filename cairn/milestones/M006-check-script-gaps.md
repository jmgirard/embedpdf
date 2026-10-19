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
- [ ] T3: In `render_check.mjs`, replace the all-canvases check (`:686`) with a per-embed, per-page check that runs
      after the scroll or slide walk (LESSONS M002: slides must be visited first) and names the embed and page. Add
      `--plant blank|nocanvas|nopages`, allowed without `--expect-text` or `--expect-name`, and exiting 2 when there
      is nothing to plant in, as the other plants do.
- [ ] T4: In `tests/serve_docs.mjs`, add content types for each extension under `docs/` (today `.ttf`, `.eot`,
      `.map`, `.yml` are missing), send `Content-Length` and `Accept-Ranges: bytes`, answer single `bytes=a-b` and
      `bytes=a-` ranges with 206 and past-the-end ranges with 416, and reject the `serveDocs` promise on a listen
      error. Add the AC3 cases to `helpers_test.mjs` first.
- [ ] T5: In `ios_check.mjs`, default `--port` to 0, build the target URL from `server.address().port`, and turn a
      listen error for a given port into exit 2 with a message naming the port.
- [ ] T6: Update CLAUDE.md "Verify before finishing" and the two script headers (AC7). Run `quarto render`,
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

## Decisions

## Review
