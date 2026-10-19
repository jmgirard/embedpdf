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

- [x] AC1: The second server is the one that `--remote cors` starts. It sends
      `Access-Control-Allow-Origin: *`. In Safari in the "embedpdf iPhone" and
      "embedpdf iPad" iOS 27.0 simulators, `example.html` gets its PDFs from
      that server. Its `renderer=native` embed is an `<object>` whose address
      is on that server. Every other embed shows with PDF.js, and every page
      has ink. The proof is that `node tests/ios_check.mjs --device
      "<simulator>" --remote cors --expect-native 1` exits 0 on both
      simulators.
- [x] AC2: On the desktop, `example.html` gets its PDFs from that second
      server. Each of its 2 `renderer=pdfjs` embeds loads with PDF.js, next to
      9 native embeds of the same PDF. In desktop Safari 27.0.1, each is a
      named group whose toolbar indicator reads "Page 1 of 2", and
      `node tests/safari_check.mjs --target mac --remote cors --expect-native 9
      --expect-pdfjs 2 --expect-name sample.pdf` exits 0. In Chromium,
      `node tests/render_check.mjs example.html --remote cors --expect-native 9
      --expect-pdfjs 2 --expect-pages 2 --expect-failed 0` exits 0 with no
      `--device`, with `--device mac-safari`, and with `--device
      windows-touch`.
- [x] AC3: On `shared_test.html`, a native embed and then a PDF.js embed show
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
- [x] AC4: Each `node tests/...` line in CLAUDE.md "Verify before finishing" at
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
- 2026-10-19: step-7 approval: m014-safari-shared-remote-pdf approved for merge

## Decisions

## Review

Pass 1, 2026-10-19, at a91ed0e (main 6930c4e has not moved; no PR yet; Copilot round off).

- AC5: README.md:86 and example.qmd:141 and :145, read at a91ed0e. Neither says that such an embed fails; `grep -i 'can fail even with\|seen once'` over both finds nothing. Both say that Safari refuses the read and that the viewer adds `embedpdf=pdfjs`. Both name iOS 27.0 iPhone and iPad simulators, desktop Safari 27.0.1, and Chromium. Both say byte ranges were checked in the simulators and in Chromium (emulated iPhone and Android), and not in desktop Safari. Pass.
- AC6: `_extension.yml:3` `version: 1.2.5`; `embedpdf.lua:22` `local VERSION = "1.2.5"`, used by both `add_html_dependency` calls (lines 31, 49); `pandoc lua tests/test_shortcode.lua` 40 passed, 0 failed. Pass.
- AC5 re-read at 24dbf8b, after the fix-now doc edits: the old wording is still absent (grep exit 1), and both texts still name the same browsers, devices, and byte-range result. Pass.
- Sweep at 24dbf8b after `quarto render`, Chromium via `CHROME_PATH`: the 57 `node tests/` lines of CLAUDE.md at the plan commit (each found in the run list), the 10 lines this milestone added, and the prose variants. 86 commands, all exit 0: 62 Chromium, desktop Safari, and Node, and 24 iOS 27.0 simulator. A first sweep at a91ed0e passed 24 of 24 iOS commands and was stopped after 22 Chromium passes, because the fix-now viewer change superseded it.
- AC1: `ios_check --device "embedpdf iPhone" --remote cors --expect-native 1` and the same on "embedpdf iPad" exit 0 at 24dbf8b. Under `--remote cors`, the checks require every embed not set to `renderer=native` to be PDF.js with every page inked and its data-src on the remote server. The native embed's `<object>` must be on that server, with a no-Origin GET for its path. Pass.
- AC2: `safari_check --target mac --remote cors --expect-native 9 --expect-pdfjs 2 --expect-name sample.pdf` exits 0. This includes the toolbar indicator reading "Page 1 of 2" and no failed embed. `render_check example.html --remote cors --expect-native 9 --expect-pdfjs 2 --expect-pages 2 --expect-failed 0` exits 0 with no device, mac-safari, and windows-touch, at 24dbf8b. Pass.
- AC3: render_check shared_test.html `--remote cors --expect-ranges` exits 0 with iphone and android. ios_check shared_test.html `--remote cors --expect-native 1 --expect-embeds 1 --expect-pages 14` exits 0 on iPhone and iPad, and also with `--expect-ranges` added. T2 found a fix that keeps byte ranges, so the condition does not apply. Pass.
- AC4: every plan-commit line and prose variant exits 0 in the sweep above, and helpers_test 124 passed, 0 failed. Pass.
- Consistency gate: `cairn_validate.py` all checks passed (exit 0). No DESIGN principle changed (the DESIGN diff is one Known issues entry), so `cairn_impact` is skipped. The generic profile's `consistency-gate` slot names no toolchain checks.
- spawned: diff-bug, blame-history, prior-review, ripple
- diff-bug #1: the added query applies in every browser, so a site that rejects an unknown query (a signed address) can break a case that worked outside Safari, and only a work-log line recorded the choice — fix now, fixed 24dbf8b (D-005 records the choice and its rejected alternatives; README and example.qmd say "in every browser") and follow-up (row "Shared query fallback", parked on a real-site report)
- diff-bug #2: with `--remote cors` the range count would take a native viewer's Origin-bearing 206 answers for the PDF.js embed — follow-up (row "Shared remote check gaps"; the 2026-10-19 logs show no such request)
- diff-bug #3: the native-load check passes when one no-Origin GET reached the path, so one native embed stands for all that share the address — follow-up (row "Shared remote check gaps")
- diff-bug #4: ios_check's report `ranges` gave all 206 answers while the check counts only Origin-bearing ones — fix now, fixed 24dbf8b (report counts what the check reads; header says so)
- diff-bug #5: on a `file:` page WebKit can give `location.origin` "file://" while a URL's origin is "null", so a local shared PDF would get the query — fix now, fixed 24dbf8b (both origins from `new URL`; checked in Node with stand-in globals)
- diff-bug #6: render_check's own read of a native PDF is now slowed under `--remote cors --expect-ranges` — fix now, fixed 24dbf8b (comment says so; it gets a 200 and does not count)
- diff-bug #7: a query ending in `&` gave `&&` — fix now, fixed 24dbf8b (no separator after a trailing `&`; checked in Node)
- diff-bug #8: the CLAUDE.md gotcha stated "Safari refuses only after the `<object>` read ends" from one comparison — fix now, fixed 24dbf8b (states the one comparison)
- diff-bug #9: "renderer=auto in a desktop browser" ignores a desktop browser with no built-in PDF viewer — fix now, fixed 24dbf8b (README, example.qmd)
- diff-bug #10: "The site sent no header … and sent `*`" reads as a real site — fix now, fixed 24dbf8b ("The local test site", README and example.qmd)
- diff-bug #11: two statements on one line in render_check's range count — fix now, fixed 24dbf8b
- diff-bug #12: the query covers native embeds on the same page only, not an author's own `<iframe>`/`<object>`/`<embed>` or an earlier load in the tab — follow-up (row "Shared remote check gaps")
- blame-history #1: D-004 says another way to read such a PDF takes a D-entry — reject, false: D-004 covers a site that sends no header, and this change is for a site that sends one; D-005 records the change anyway (blame-history #2)
- blame-history #2: M003's run decision "no ios_check --remote cors" was reversed with no D-entry — fix now, fixed 24dbf8b (D-005)
- blame-history #3: ios_check report `ranges` disagrees with the check under `--remote cors` — fix now, fixed 24dbf8b (as diff-bug #4)
- blame-history #4: serveRemote's slow answer now slows only Origin-bearing requests, narrowing M013's rule — reject, planned change (T4, recorded in the work log)
- blame-history #5: the shared-address exit-2 rule is relaxed under `--remote cors` — reject, planned change (T4 and AC3's shared_test lines need it)
- blame-history #6: "The site sent no header … `*`" is ambiguous — fix now, fixed 24dbf8b (as diff-bug #10)
- blame-history #7: two statements on one line in render_check — fix now, fixed 24dbf8b (as diff-bug #11)
- blame-history #8: the unshared path keeps the fragment and the shared path drops it — reject, style: fetch never sends a fragment, so the two addresses read the same file
- prior-review #1: the relaxed exit-2 rule rests on native viewers sending no Origin header, and render_check has no native-load check — follow-up (row "Shared remote check gaps")
- prior-review #2: the Safari lesson is revised a second time without a real-site check — reject, false as a regression: the real-site gap is recorded in CLAUDE.md "Still unverified", the DESIGN Known issues entry, and D-005
- ripple #1: the candidate row "Safari shared remote URL" still describes the bug — reject, planned change: post-merge hygiene removes the row this milestone graduates
- ripple #2: CLAUDE.md's `--expect-ranges` sentence says every whole large PDF is sent slowly — fix now, fixed 24dbf8b (points to the `--remote cors` rule)
- ripple #3: render_check's comment above `rangeOpts` says the server sends every whole large file slowly — fix now, fixed 24dbf8b
- ripple #4: example.qmd:133 "used only the value `*`" sits beside a no-header check — reject, false: every check with the header used `*`, and the no-header checks send no value
