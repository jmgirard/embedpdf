# M001: iOS Safari check

- **Status:** in-progress
- **Priority:** high
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** IP1, GP4, GP5
- **Resolves:** #3 closes
- **Surface tier:** user-facing — changes which renderer `renderer=auto` picks for readers on iPhone and iPad
- **Branch/PR:** m001-ios-safari-check

## Goal

Every page of an embed with `renderer=auto` is readable in Safari on iPhone and iPad, shown by a repeatable iOS Simulator check.

## Scope

**In:** `tests/ios_check.mjs`, a script that boots an iOS simulator, opens a page served from `docs/` in Safari, and reports
each embed's renderer and per-page ink. A baseline run on the v1.0.2 viewer that records what `auto` picks on iOS. Device
emulation in `tests/render_check.mjs` (iPhone, iPad, Mac Safari, Windows touch). A fix to `nativeSupported()` in
`embedpdf-viewer.js` so `auto` uses PDF.js on iPhone and iPad, with the version bumped to 1.0.3. README, `example.qmd`,
CLAUDE.md, PROFILE.md and DESIGN.md text that the change makes stale.

**Out:**
- A check on a real iPhone or iPad, or on a real Android phone: stays in CLAUDE.md "Still unverified" (needs a human).
- Tagging v1.0.3 and its GitHub release: the user declares release windows; the "GitHub releases for v1.0.x" candidate row
  covers the release backlog.
- Other iOS browsers (Chrome and Firefox on iOS use WebKit too): best-effort per DESIGN "Platforms", no candidate row.
- A screen-reader text layer: the "Screen-reader text layer" candidate row.

## Acceptance criteria

- [ ] AC1: In Safari on an iPhone simulator with default settings (model and iOS runtime recorded with the evidence),
      `docs/example.html` served over http from `docs/` renders each of the 10 embeds not set to `renderer=native` with
      PDF.js, with exactly 2 `.embedpdf-page` containers per embed (`sample.pdf` has 2 pages) and a canvas with ink in
      each, as reported by one run of `node tests/ios_check.mjs` that exits 0.
- [ ] AC2: The same holds on an iPad simulator with Safari's default desktop-website setting (model and iOS runtime
      recorded with the evidence), by one run of `node tests/ios_check.mjs` that exits 0.
- [ ] AC3: Desktop stays native: `node tests/render_check.mjs` against `docs/example.html` reports 9 native and 2 PDF.js
      embeds and exits 0 in plain desktop Chrome, in Chrome emulating a Mac Safari user agent with 0 touch points, and in
      Chrome emulating a Windows user agent with touch points (each emulation sets `navigator.pdfViewerEnabled` to true).
- [ ] AC4: `node tests/render_check.mjs` in Chrome emulating an iPhone and, separately, an iPad (desktop-style user agent
      with touch points), each with `navigator.pdfViewerEnabled` set to the value the T2 baseline recorded on that
      simulator, reports 1 native and 10 PDF.js embeds and exits 0; the same two runs against the v1.0.2
      `embedpdf-viewer.js` report the native count T2 recorded for that simulator.
- [ ] AC5: `version:` in `_extensions/embedpdf/_extension.yml` and the `add_html_dependency` version in `embedpdf.lua` both
      read `1.0.3`, and `pandoc lua tests/test_shortcode.lua` prints `0 failed`.
- [ ] AC6: `README.md` and `example.qmd` state that `renderer=auto` uses PDF.js on iPhone and iPad, and state what
      `renderer=native` shows in iOS Safari, matching the AC1 and AC2 runs and the T2 baseline; each line that a search
      for `pdfViewerEnabled` finds in those two files states the iPhone and iPad exception or sits in a sentence that does.

## Coverage

- AC1 → T1, T5
- AC2 → T1, T5
- AC3 → T4, T5
- AC4 → T2, T4, T5
- AC5 → T5
- AC6 → T2, T6

## Tasks

- [x] T1: Set up the simulator. After the user installs Xcode, run `xcodebuild -downloadPlatform iOS` with
      `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer` and create an iPhone and an iPad device with `xcrun simctl`.
      Change no system setting (no `xcode-select -s`).
- [x] T2: Write `tests/ios_check.mjs`. Serve `docs/` with Node's `http` module (no new dependency). Inject a probe into
      HTML responses that scrolls each PDF.js page container through, waits, and POSTs per embed: renderer, the
      `.embedpdf-page` count, per-page ink, and `navigator.pdfViewerEnabled` and `maxTouchPoints`. Boot the named
      simulator, open the URL in Safari with `simctl openurl`, wait for the report with a timeout, print JSON, and exit 0
      only on a full pass. Show it red on a planted defect (one embed with a blank page or a missing container) before
      trusting its green. Run it on the v1.0.2 build on both simulators and record, in one work-log line each, the
      renderer `auto` picks, `pdfViewerEnabled`, and what a `renderer=native` embed shows (simulator screenshot).
- [x] T3: Install `puppeteer-core` locally per CLAUDE.md (gitignored, already documented; not a new dependency).
- [x] T4: Add `--device iphone|ipad|mac-safari|windows-touch` to `tests/render_check.mjs`: user agent, touch points,
      viewport, and a `navigator.pdfViewerEnabled` override (iPhone and iPad take the T2 values; the others true).
      Run the iPhone and iPad emulations against the v1.0.2 viewer and record the native counts.
- [x] T5: Fix `nativeSupported()` in `embedpdf-viewer.js`: return false on iPhone, iPod and iPad, including iPadOS with a
      Mac user agent and `maxTouchPoints > 1`, before reading `pdfViewerEnabled`. Bump `1.0.2` to `1.0.3` in
      `_extension.yml` and `embedpdf.lua`. Run `quarto render`, the shortcode tests, `render_check.mjs` in all five modes,
      and `ios_check.mjs` on both simulators.
- [x] T6: Docs. Update the renderer text in `README.md` and `example.qmd` (the `pdfViewerEnabled` lines and the
      self-contained-document advice for `renderer=native`) from the T2 and T5 observations, then `quarto render`. Add
      `node tests/ios_check.mjs` to CLAUDE.md "Verify before finishing" and the PROFILE.md `verify` slot for viewer
      changes, and update the CLAUDE.md `renderer=auto` gotcha. Update the DESIGN.md Architecture `auto` sentence and the
      Known issues iOS entry.

## Work log

- 2026-10-18: created by /milestone-plan.
- 2026-10-18: tier check: milestone — new test tooling plus a change to which renderer `auto` picks; more than one sitting.
- 2026-10-18: absorbed candidate row "iOS Safari check" in full.
- 2026-10-18: collision sweep: no milestones, empty archive, D-001 (vendored PDF.js) not affected; LESSONS empty.
- 2026-10-18: inbox sweep: #3 "Issues on iOS" overlaps (iOS shows page 1 only) → Resolves #3 closes; #2, #7, #8 no overlap.
- 2026-10-18: investigation: Xcode not installed (xcode-select points at CommandLineTools, no simctl); `puppeteer-core` not installed.
- 2026-10-18: criteria audit (full mode, fresh Opus): 10 findings; 9 fixed (emulation sets pdfViewerEnabled; Mac Safari and Windows touch added; exact 2 containers per embed; check discrimination moved to T2; device and runtime recorded; `renderer=native` on iOS documented; stale `pdfViewerEnabled` lines covered; CLAUDE.md criterion moved to T6); 1 no issue (AC5).
- 2026-10-18: question set: Xcode install — user installs Xcode from the App Store; agent may run `xcodebuild -downloadPlatform iOS` (about 8 GB from Apple).
- 2026-10-18: question set: fix scope — check and fix `auto` for iPhone and iPad in this milestone (version 1.0.3, no tag).
- 2026-10-18: question set: iPad — in scope alongside iPhone.
- 2026-10-18: question set: assign #3 to the operator's GitHub account — yes.
- 2026-10-18: plan gate chose user-agent and touch-point detection in `nativeSupported()` over the CSS media-query idea in #3 because CSS cannot tell iOS from other touch devices and the object is still created; falsified by a WebKit release whose native `<object>` shows every page.
- 2026-10-18: plan gate chose an injected probe that POSTs to a Node server over Appium or WebDriver because both need new dependencies and safaridriver does not drive the simulator alone; falsified by the probe POST not arriving reliably from simulator Safari.
- 2026-10-18: DESIGN.md principle lines changed from `- **IP1 Title.**` to `- IP1: **Title.**` so `cairn_validate` reads them; wording unchanged.
- 2026-10-18: assigned #3 to jmgirard with `gh issue edit`; re-read confirms the assignee.
- 2026-10-18: implement started; branch m001-ios-safari-check cut from main at 011933b.
- 2026-10-18: T3 done: `npm install --no-save puppeteer-core`. Google Chrome is not installed; Chromium 155.0.8059.39 is, so every render_check run uses `CHROME_PATH=/Applications/Chromium.app/Contents/MacOS/Chromium` (decided: same engine and PDF viewer; the script already reads CHROME_PATH).
- 2026-10-18: finding: `python3 -m http.server` (3.14) on its default `::` bind resets Chromium's parallel requests to `localhost`, so no viewer JS loads and render_check reports 0/0 and exits 0; `--bind 127.0.0.1` with a 127.0.0.1 URL fixes it. Baseline on v1.0.2: 9 native, 2 PDF.js, 4/4 canvases with ink, exit 0. T4 adds expected counts so 0/0 fails; T6 updates the serve command in CLAUDE.md and PROFILE.md.
- 2026-10-18: T1 blocked: `xcrun simctl` fails because CoreSimulator is missing (`xcodebuild -checkFirstLaunchStatus` exits 69); Xcode's first-launch install needs the user's admin password.
- 2026-10-18: user ran `sudo xcodebuild -runFirstLaunch` (Install Succeeded). `-downloadPlatform iOS` installed iOS 27.1 (24A94425), whose only device type is "iPhone Duo", then fetched iOS 27.0 (24A434) for the other iPhone and iPad types; I stopped it once by mistake and reran the same command.
- 2026-10-18: decided: tests/serve_docs.mjs (Node http, no-store) serves docs/ for both scripts; render_check serves it itself when given a page path. Reason: 1 of 120 parallel curl requests to python's http.server failed (backlog 5), and 2 of 8 render_check runs saw 0 embeds; 5 of 5 runs passed on the Node server.
- 2026-10-18: T2 baseline, v1.0.2, iPhone Duo / iOS 27.1 (UA "iPhone OS 18_7 ... Version/27.0 Mobile"): pdfViewerEnabled true, maxTouchPoints 5; `auto` picks native for embeds 1-8, the 2 `renderer=pdfjs` embeds render 2 inked pages each; ios_check exits 1 naming the 8 native embeds.
- 2026-10-18: T2 baseline, iPhone Duo / iOS 27.1: a native embed (`renderer=native height=400` and the default-size `auto` embed 1) scrolls inside its box with a scrollbar, and a swipe shows page 2 in full, not page 1 only as #3 (2024-03-20) reports. This is the plan gate's falsifier for UA-based detection.
- 2026-10-18: T2 baseline, v1.0.2, iPhone 17 / iOS 27.0 (UA "iPhone OS 18_7 ... Version/27.0 Mobile"): pdfViewerEnabled true, maxTouchPoints 5; same result as iPhone Duo (embeds 1-8 native, PDF.js embeds 9 and 11 render 2 inked pages, no errors); exit 1.
- 2026-10-18: T2 baseline, v1.0.2, iPad Air 11-inch (M4) / iOS 27.0 (desktop UA "Macintosh; Intel Mac OS X 10_15_7 ... Version/27.0 Safari"): pdfViewerEnabled true, maxTouchPoints 5; same embed result as iPhone; native embed 1 draws page 1 inline (screenshot); exit 1.
- 2026-10-18: stop: the falsifier fired on iOS 27.0 and 27.1, and #3's iOS version (2024) is not available to test here; asked the user whether to keep the planned PDF.js switch.
- 2026-10-18: user chose "Keep the switch": `auto` uses PDF.js on every iPhone and iPad, so older iOS readers get every page; docs say the native viewer works on iOS 27. Plan unchanged.
- 2026-10-18: T2 discrimination runs (`--plant blank|missing`) moved after T5, because on v1.0.2 the check is already red for the native embeds and a plant would not show anything new.
- 2026-10-18: T1 done: simulators "embedpdf iPhone" (iPhone 17) and "embedpdf iPad" (iPad Air 11-inch M4) on iOS 27.0, plus "embedpdf iPhone Duo" on iOS 27.1; no system setting changed.
- 2026-10-18: T4 done: `--device` and `--expect-native/--expect-pdfjs` in render_check; iphone/ipad use the UAs and pdfViewerEnabled true that T2 recorded. On v1.0.2 the iphone and ipad emulations report 9 native, 2 PDF.js (T2 recorded 9 native on both simulators), exit 0.
- 2026-10-18: T5 done: `isAppleMobile()` (iPhone/iPod/iPad in UA, or Macintosh UA with maxTouchPoints > 1) makes `nativeSupported()` return false; version 1.0.3 in both files. Shortcode tests 30 passed, 0 failed. render_check v1.0.3: chrome, mac-safari, windows-touch 9 native / 2 PDF.js; iphone, ipad 1 native / 10 PDF.js, 20/20 canvases with ink; all exit 0.
- 2026-10-18: T5 ios_check v1.0.3: iPhone 17 and iPad Air 11-inch (M4), iOS 27.0, each exit 0 with embeds 1-9 and 11 on PDF.js, 2 page containers each, 2/2 inked pages, no errors. Discrimination on iPhone: `--plant blank` exit 1 "embed 1: pages without ink: 2"; `--plant missing` exit 1 "embed 1: 1 page containers, expected 2".
- 2026-10-18: discovered sub-task: `quarto render` rendered `cairn/*.md` into docs/cairn/; added `render: ["*.qmd"]` to `_quarto.yml` and deleted the output; rerender clean.
- 2026-10-18: finding: a self-contained page (`embed-resources: true`, temporary `_sc_test.qmd`, deleted) hydrates no embed in iOS 27.0 Safari or Chromium 155: the inlined viewer throws `"./pdf.min.mjs" cannot be parsed as a URL`, so even `renderer=native` shows only the download link. Pre-existing (same line in v1.0.2). Recorded as a [high] ROADMAP candidate and corrected in DESIGN Known issues.
- 2026-10-18: minor amendment: T6 leaves the README and example.qmd self-contained `renderer=native` advice unchanged, because the finding above makes it a separate bug; the candidate row owns the fix. AC6 does not cover that advice.
- 2026-10-18: T6 done: README (intro, `renderer` option row, a Known limitations line on `renderer=native` in iOS Safari), example.qmd (the `pdfViewerEnabled` paragraph states the iPhone/iPad exception; a line under the native example), CLAUDE.md (verify commands, simulator setup, `auto` gotcha, self-contained and render-list gotchas), PROFILE.md `verify`, DESIGN Architecture and Known issues. `quarto render` clean. Added README lines lint 0 hits with simple-english `ste_lint.py`; the file total went from 20 on main to 14.

## Decisions

## Review
