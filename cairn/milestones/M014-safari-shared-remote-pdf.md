<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section.
     Per-section owners are tagged below. The one size check that can fail is
     cairn_validate's <150 over the plan-owned body. -->
# M014: Safari shared remote PDF

- **Status:** review
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** IP1, GP4, GP6
- **Resolves:** —
- **Surface tier:** user-facing — readers in Safari get PDF.js embeds that fail today
- **Branch/PR:** m014-safari-shared-remote-pdf

## Goal

In Safari, a PDF.js embed shows a PDF from another site that allows the read, also when a `renderer=native` embed on the same page shows the same PDF.

## Scope

**In:** Find why Safari fails the PDF.js load in this case. Probe it in the iOS
27.0 simulators and in desktop Safari 27.0.1. Change `embedpdf-viewer.js` so the
load works. Keep byte-range loading if a fix that keeps it works in Safari.
Otherwise download the whole PDF, in the affected case only. The user chose
this order at the question set. Add `--remote cors` to `tests/ios_check.mjs`
and `tests/safari_check.mjs`. Add a test page `shared_test.qmd`. It holds a
native embed and a PDF.js embed of `files/large.pdf`. Count range answers so
that the two embeds' requests stay apart. Set the version to 1.2.5. Correct
README, example.qmd, CLAUDE.md, and the DESIGN Known issues entry.

**Out:**
- A PDF from a site that sends no `Access-Control-Allow-Origin` header stays
  outside IP1 and keeps its "Open the PDF" link (D-004). No change here.
- Hidden text of a PDF loaded by byte ranges → candidate "Large PDF text check".
- Real iPhone and iPad, iOS before 27, and Firefox → CLAUDE.md "Still
  unverified". No check script drives them.
- Safari's computed names in the iOS simulators → candidate "Safari names on iOS".

## Acceptance criteria

- [ ] AC1: The second server is the one that `--remote cors` starts. It sends
      `Access-Control-Allow-Origin: *`. In Safari in the "embedpdf iPhone" and
      "embedpdf iPad" iOS 27.0 simulators, `example.html` gets its PDFs from
      that server. Its `renderer=native` embed is an `<object>` whose address
      is on that server. Every other embed shows with PDF.js, and every page
      has ink. The proof is that `node tests/ios_check.mjs --device
      "<simulator>" --remote cors --expect-native 1` exits 0 on both
      simulators.
- [ ] AC2: On the desktop, `example.html` gets its PDFs from that second
      server. Each of its 2 `renderer=pdfjs` embeds loads with PDF.js, next to
      9 native embeds of the same PDF. In desktop Safari 27.0.1, each is a
      named group whose toolbar indicator reads "Page 1 of 2", and
      `node tests/safari_check.mjs --target mac --remote cors --expect-native 9
      --expect-pdfjs 2 --expect-name sample.pdf` exits 0. In Chromium,
      `node tests/render_check.mjs example.html --remote cors --expect-native 9
      --expect-pdfjs 2 --expect-pages 2 --expect-failed 0` exits 0 with no
      `--device`, with `--device mac-safari`, and with `--device
      windows-touch`.
- [ ] AC3: On `shared_test.html`, a native embed and then a PDF.js embed show
      `files/large.pdf` (14 pages, over 131,072 bytes) from the second server.
      In Chromium, PDF.js loads it by byte ranges:
      `node tests/render_check.mjs shared_test.html --remote cors
      --expect-ranges --device <iphone|android> --expect-native 1
      --expect-pdfjs 1 --expect-pages 14` exits 0 for both devices. In the iOS
      27.0 simulators, `node tests/ios_check.mjs --device "<simulator>" --page
      shared_test.html --remote cors --expect-native 1 --expect-embeds 1
      --expect-pages 14` exits 0 on both simulators. It also exits 0 with
      `--expect-ranges` added, unless T2 found no fix that keeps byte ranges
      in Safari. The work log then names the fixes T2 tried.
- [ ] AC4: Each `node tests/...` line in CLAUDE.md "Verify before finishing" at
      the plan commit exits 0 at review, against the rendered `docs/`. So does
      each variant that the CLAUDE.md prose asks for (`--device mac-safari`,
      `--device windows-touch`, `--device ipad`, and `--alone http`).
      `node tests/helpers_test.mjs` prints `N passed, 0 failed`.
- [x] AC5: Two texts no longer say that such an embed fails in Safari next to a
      native embed of the same PDF. They are the README.md "Known limitations"
      item on PDFs from another site and the example.qmd section "PDFs on
      Another Site". Each names the browsers and devices where AC1 to AC3
      checked that case. Each says whether the case loads by byte ranges in
      Safari, as AC3's runs showed.
- [x] AC6: `version:` in `_extensions/embedpdf/_extension.yml` reads 1.2.5. The
      `add_html_dependency` version in `embedpdf.lua` reads 1.2.5.
      `pandoc lua tests/test_shortcode.lua` prints `N passed, 0 failed`.

## Coverage

- AC1 → T1, T3, T6
- AC2 → T1, T3, T6
- AC3 → T2, T3, T4, T6
- AC4 → T3, T4, T6
- AC5 → T5
- AC6 → T3

## Tasks

- [x] T1: Write the regression check first. Add `--remote cors` to
      `tests/ios_check.mjs`, where line 239 now allows only `blocked`. Under
      `--remote cors`, check that each `renderer=native` embed is an
      `<object>` whose address is on the remote server, and that the server
      got a request for it. Add `--remote cors` to `tests/safari_check.mjs`
      too, with `serveRemote` and `pointPdfsAt` from `tests/serve_docs.mjs`.
      Run both against the v1.2.4 viewer. Record in the work log the ios_check
      failure and its error, and whether desktop Safari fails.
- [x] T2: Probe the cause in Safari, in an iOS 27.0 simulator and on the
      desktop. One guess is that PDF.js's fetch reuses the object's cached
      answer. Try fixes that keep byte ranges first. An example is a PDF.js
      address that differs from the address a native embed on the page shows.
      If none works, fetch the whole file in the affected case, and record
      that trade against GP4 as a D-entry. Write one work-log line per probe.
- [x] T3: Change `hydratePdfjs` (`embedpdf-viewer.js` near line 152) and its
      callers. Keep the failure link, the embed name, and the
      "embedpdf: failed to render <data-src>" line at the address as written.
      Leave `pdfjs/` as it is (GP6). Set the version to 1.2.5 in both files.
- [x] T4: Add `shared_test.qmd`: a `renderer=native` embed, then a
      `renderer=pdfjs` embed, both of `files/large.pdf`. Count range answers
      so that the PDF.js embed's requests stay apart from the native viewer's.
      The places are `rangeCounts` in `tests/serve_docs.mjs`, the
      shared-address exit-2 rule at `tests/render_check.mjs:1552`, and
      ios_check's matching rule. Two PDF.js embeds of one address still exit
      2. Let ios_check take `--expect-ranges` with `--remote cors`, and show
      that `--plant noranges` then fails. Run the shared_test ios_check line
      against the v1.2.4 viewer and record the result. Add helpers_test cases
      for each helper change.
- [x] T5: Update the docs and records. They are README "Known limitations",
      example.qmd near line 141, the CLAUDE.md Safari gotcha, the CLAUDE.md
      "Verify before finishing" lines for AC1 to AC3, "Still unverified", and
      the DESIGN Known issues entry on this case.
- [x] T6: Run `quarto render`. Then run the lines of AC1 to AC3, every line
      that AC4 names, and helpers_test.

## Work log

- 2026-10-19: created by /milestone-plan.
- 2026-10-19: tier check: not run — work named at the question set.
- 2026-10-19: question set: which candidate to plan — "Safari shared remote URL".
- 2026-10-19: question set: keep byte ranges or accept a whole-file download — keep ranges if a fix that keeps them works in Safari, else a whole-file download in the affected case only. The fallback is approved, so amending AC3 or AC5 to it is not a stop.
- 2026-10-19: collision check: absorbed candidate "Safari shared remote URL" (M003 implement). D-004 still holds (a site with no header stays outside IP1). README, example.qmd, the CLAUDE.md gotcha, and DESIGN Known issues describe the bug and are corrected by T5. No planned or in-progress milestone overlaps.
- 2026-10-19: inbox sweep: 0 open issues, 0 open PRs.
- 2026-10-19: lessons harvested: M003 (Safari reports CORS failures as "Load failed"; read the viewer's own failure line), M013 (range checks need the slow whole-file answer; slow only `.pdf`), M012 (each safaridriver run brings Safari to the front; batch runs), M010 (first `simctl openurl` can time out; repeat).
- 2026-10-19: plan gate chose a viewer fix over keeping the documented Safari limitation because the user picked the fix; falsified by a probe showing no viewer change can make Safari load the PDF in this case.
- 2026-10-19: plan gate chose to try range-keeping fixes first (a distinct PDF.js address or request options) over a whole-file fetch by the viewer because the user chose to keep ranges; falsified by Safari runs in which every range-keeping fix still fails.
- 2026-10-19: plan chose to check desktop Safari (safari_check `--remote cors`) and desktop Chromium over checking only the iOS simulators, because `renderer=pdfjs` next to native embeds of one PDF is the documented desktop case; falsified by nothing at plan time.
- 2026-10-19: criteria audit (full mode, fresh Opus reader): 11 findings, all disposed. AC1 now requires the native `<object>` on the remote server (T1 checks it) and names the server. AC2 answered: it states the desktop behavior, and AC1's v1.2.4 run is the discrimination evidence. AC2 gained desktop Chromium `--remote cors` lines. AC3 names `files/large.pdf`, fixes the embed order, and makes the Safari range claim depend on T2's result. T4 gained the v1.2.4 shared_test run, the `--plant noranges` run, and the exit-2 rule for two PDF.js embeds. AC4 dropped "every other case" and names the prose variants. `quarto render` moved to T6. T2 records a whole-file fallback as a D-entry (GP4). The warm-cache axis is answered: each run starts cold, and T2's probe covers it.
- 2026-10-19: implement started on branch m014-safari-shared-remote-pdf; ROADMAP and header set in-progress.
- 2026-10-19: T1 choice: serve_docs logs each file answer in `server.requests` (method, path, query, Origin, Range, status); a native embed counts as loaded when the remote server answered a GET with no Origin header for its path, since a CORS read sends one. ios_check `--remote cors` keeps every normal check and allows `--plant`, `--expect-text`, and `--expect-name`; safari_check takes `--remote cors` (mac and simulator targets).
- 2026-10-19: T1 v1.2.4 runs: ios_check "embedpdf iPhone" `--remote cors --expect-native 1` on example.html exits 1, all 10 PDF.js embeds failed with "embedpdf: failed to render http://127.0.0.1:<port>/sample.pdf UnknownErrorException: Load failed", and the native embed's check passed. The same flags on name_test.html (no native embed) exit 0. Desktop Safari 27.0.1 `safari_check --target mac --remote cors` on example.html exits 1: both `renderer=pdfjs` embeds show "This PDF cannot be shown here.". helpers_test 122 passed (7 new request-log cases).
- 2026-10-19: T2 probe (desktop Safari 27.0.1, safaridriver, example.html with PDFs on a cors remote server, 6 s after load): page-script reads of the remote `sample.pdf` failed with "TypeError: Load failed" for fetch with mode cors and credentials same-origin (PDF.js's options), with cache no-store, with cache reload, with credentials include, with a Range header, and for XMLHttpRequest; none of them reached the server. A fetch of `sample.pdf?embedpdf=1` got 200 and 21,118 bytes. All 16 earlier PDF requests had no Origin header (the native viewers'), so no PDF.js read of the bare address reached the server either. The guess that a cached answer is reused does not fit: the server sends no-store and Safari sent no request.
- 2026-10-19: T2 conclusion: Safari refuses a CORS read of an address that a native `<object>` on the page loaded, before any request. A PDF.js address with an added query works and keeps byte ranges possible. The whole-file fallback is not needed, so no GP4 D-entry. A `#fragment` was not tried, since a fragment is never sent and the address Safari keys on stays the same.
- 2026-10-19: T3 choice: `pdfjsAddress()` adds `embedpdf=pdfjs` to the query (after `&` when a query exists) only when the PDF is on another origin than the page and a native embed on the page loads the same address without its fragment (`nativeAddresses`, built from the placeholders with `usesPdfjs`); every other PDF.js address stays as before. It applies in every browser, since telling Safari apart by user agent is fragile and the added query costs one read of an address the native viewer reads anyway. A data-src that is no URL is left out of the set, so it fails only its own embed.
- 2026-10-19: T3 runs (v1.2.5, `quarto render` clean, test_shortcode 40 passed): ios_check `--remote cors --expect-native 1` exits 0 on "embedpdf iPhone" and "embedpdf iPad" (remote log: bare address with no Origin, `?embedpdf=pdfjs` with an Origin); safari_check `--target mac --remote cors --expect-native 9 --expect-pdfjs 2 --expect-name sample.pdf` exits 0; render_check example.html `--remote cors --expect-native 9 --expect-pdfjs 2 --expect-pages 2 --expect-failed 0` exits 0 with no device, mac-safari, and windows-touch (Chromium via `CHROME_PATH=/Applications/Chromium.app/Contents/MacOS/Chromium`; Google Chrome is not installed).
- 2026-10-19: T4 choice: with `--remote cors`, render_check and ios_check count only 206 answers to requests with an Origin header (a CORS read), so a native embed of the same address is counted apart, and they exit 2 only when another PDF.js embed shares the address; without it the old per-path rule stands. serveRemote's `slowWhole` now slows only a request with an Origin header, so the native viewer's read finishes first. Without that change the v1.2.4 viewer passed the shared range line (the native read was still arriving when PDF.js read), so the line could not show the fix. ios_check `--expect-ranges` works with `--remote cors`.
- 2026-10-19: T4 runs: shared_test.html (native, then PDF.js, of `files/large.pdf`). v1.2.4 viewer, "embedpdf iPhone": `--remote cors --expect-native 1 --expect-embeds 1 --expect-pages 14` exits 1, and with `--expect-ranges` it also exits 1 after the slow-rule change (exit 0 before it). v1.2.5: both lines exit 0 on iPhone and iPad (3 answers of 206 to `?embedpdf=pdfjs`, 1 whole read with no Origin). Chromium iphone and android shared lines exit 0 (3 answers of 206). `--plant noranges` exits 1 in ios_check and render_check. render_check example.html `--remote cors --expect-ranges --device iphone` exits 2 (10 PDF.js embeds share sample.pdf, which is also too small). shared_test.html `--expect-ranges` with no remote exits 2 (native shares the address). large_test `--expect-ranges --remote cors` iphone and android exit 0. helpers_test 124 passed.
- 2026-10-19: T5: README "Known limitations" item and example.qmd "PDFs on Another Site" now say what the viewer does in the shared case and where it was checked (iOS 27.0 simulators, desktop Safari 27.0.1, Chromium; byte ranges in the simulators and Chromium, not desktop Safari). CLAUDE.md: shared_test.qmd in the page list, 4 new `--remote cors` lines, 6 new shared_test lines, the `cors` and Origin counting rules, the Safari gotcha corrected, two "Still unverified" entries narrowed. DESIGN Known issues entry corrected. `quarto render` clean. The simple-english lint hook's counts for README and CLAUDE.md are back to their counts before this task (11 and 38); the remaining hits are older text.
- 2026-10-19: T6 sweep at 4073f99 after `quarto render`: a script took every `node tests/` line in CLAUDE.md "Verify before finishing" (57 at the plan commit, 67 now; the 10 new are the AC1 to AC3 lines) and added the prose variants (`--alone http` for each `--alone file` line; selfcontained_test desktop lines with mac-safari and windows-touch, iphone lines with ipad; remote and missing-pdfs desktop lines with mac-safari and windows-touch). 86 commands: 62 Chromium, desktop Safari, and Node commands and 24 iOS simulator commands, all exit 0 (Chromium via CHROME_PATH). helpers_test 124 passed.
- 2026-10-19: claim audit: 80 claims read, 6 corrected — embedpdf-viewer.js, CLAUDE.md, README.md, example.qmd, tests/ios_check.mjs, tests/render_check.mjs, tests/serve_docs.mjs. The fixes: "fetch options do not help" is now credited to desktop Safari only (on iOS 27.0 the v1.2.4 shared_test log showed that only the native read reached the server, so "no request sent" holds there). Native embeds now include `renderer=auto` in a desktop browser. The slow rule's Origin limit was added to two headers. ios_check's `--remote` exclusions are now complete. The native read "ends first" claims now say it came at full speed and ended first in the runs. After `quarto render`, the recheck passed: render_check example.html desktop and `--remote cors --device iphone`, ios_check iPhone `--remote cors` and the default example line, helpers_test 124 passed.
- 2026-10-19: implement done; status review.

## Decisions

## Review

Pass 1, 2026-10-19, at a91ed0e (main 6930c4e has not moved; no PR yet; Copilot round off).

- AC5: README.md:86 and example.qmd:141 and :145, read at a91ed0e. Neither says that such an embed fails; `grep -i 'can fail even with\|seen once'` over both finds nothing. Both say that Safari refuses the read and that the viewer adds `embedpdf=pdfjs`. Both name iOS 27.0 iPhone and iPad simulators, desktop Safari 27.0.1, and Chromium. Both say byte ranges were checked in the simulators and in Chromium (emulated iPhone and Android), and not in desktop Safari. Pass.
- AC6: `_extension.yml:3` `version: 1.2.5`; `embedpdf.lua:22` `local VERSION = "1.2.5"`, used by both `add_html_dependency` calls (lines 31, 49); `pandoc lua tests/test_shortcode.lua` 40 passed, 0 failed. Pass.
- Consistency gate: `cairn_validate.py` all checks passed (exit 0). No DESIGN principle changed (the DESIGN diff is one Known issues entry), so `cairn_impact` is skipped. The generic profile's `consistency-gate` slot names no toolchain checks.
