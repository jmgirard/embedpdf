<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section. -->
# M024: Safari names in the iOS simulators

- **Status:** review
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** IP1
- **Resolves:** —
- **Surface tier:** user-facing — README's statement of what was checked in iOS Safari changes
- **Branch/PR:** m024-ios-safari-names

## Goal

Safari in the iOS 27.0 iPhone and iPad simulators is checked for the names it gives embeds, toolbar controls, and the page indicator, through `tests/safari_check.mjs --target simulator`.

## Scope

**In:** replace safaridriver in `safari_check.mjs --target simulator` with
a Web Inspector client, `tests/webinspector.mjs`, built on Node's own modules
(no new package). It connects to the simulator's `webinspectord_sim` socket
(`xcrun simctl getenv <udid> RWI_LISTEN_SOCKET`), finds Safari's page, and
reads each name from `DOM.getAccessibilityPropertiesForNode`. Make the
check pass on `example.html` and `page_test.html` on both simulators; update
README, CLAUDE.md, the script's header, and the M010 lesson. This also covers the part of the candidate row "Close the
name and indicator check gaps" that says an indicator that never updates on
scroll passes in Safari, since the simulator runs read "Page 2 of n" after a
scroll.

**Out:**
- The safaridriver route for the simulators: removed, as the user chose at
  the question set; `--target mac` keeps safaridriver.
- `--remote cors` with `--target simulator`: the shared code keeps it, but
  no criterion runs it (ios_check runs `cors` on the simulators).
- Page text read through Safari's accessibility, and slide decks (safari_check exits 2 on
  a deck): they stay in CLAUDE.md "Still unverified".
- A name that the viewer gets wrong on iOS: that is a viewer defect, so the
  run stops (T2) and it goes to `/hotfix`.
- The `--target page-script` probe: it stays as it is (iOS 27.0 Safari has no
  `Element.prototype.computedName`).
- The rest of the row "Close the name and indicator check gaps": it stays in
  that row.

## Acceptance criteria

- [x] AC1: On `example.html` and `page_test.html`, in the iOS 27.0 "embedpdf iPhone" and "embedpdf iPad" simulators, Safari's names as Web Inspector reports them (the `label` of `DOM.getAccessibilityPropertiesForNode`) match what `tests/safari_check.mjs` expects: each native `<object>` has its `--expect-name` name and no `title`, and each PDF.js embed has its `--expect-name` name; each control of each PDF.js toolbar has its title as its name; and each toolbar's page indicator, read with role heading, reads "Page 1 of n" at the top of its pages and "Page 2 of n" after a scroll to page 2, where page 1 can scroll above the middle of its frame. Shown by the two lines below, each run on both simulators (four runs), exiting 0:
      `node tests/safari_check.mjs --target simulator --device "<simulator>" --expect-native 1 --expect-pdfjs 10 --expect-name sample.pdf`
      `node tests/safari_check.mjs --target simulator --device "<simulator>" --page page_test.html --expect-native 2 --expect-pdfjs 1 --expect-name sample.pdf`
- [x] AC2: README.md's screen-reader item and CLAUDE.md's "Still unverified" list state, with the date of the runs, that in the iOS 27.0 simulators Safari's names for native `<object>` and PDF.js embeds, toolbar controls, and the page indicator (read with role heading) were checked through Web Inspector on `example.html` and `page_test.html`. `grep -n -E 'Remote Automation|The names that Safari gives screen readers were not checked there|two ways to read those names failed|computed names in the iOS simulators|--target simulator. and .--target page-script. probes fail|only the page.s attributes and text were checked|session hosts' README.md CLAUDE.md cairn/DESIGN.md tests/safari_check.mjs` prints nothing.

## Coverage

- AC1 → T1, T2, T3
- AC2 → T4, T5

## Tasks

- [x] T1: Write `tests/webinspector.mjs`: a binary plist encoder and decoder, the socket lookup by `simctl getenv`, the page lookup by URL, and Web Inspector commands sent through `Target.sendMessageToTarget`. Add `tests/helpers_test.mjs` cases for the plist codec, one of them decoding a file that `plutil -convert binary1` wrote. Add the file to CLAUDE.md's list of check helpers. The 2026-10-20 probe (work log) is the starting point.
- [x] T2: Switch `safari_check.mjs --target simulator` to it: open the page with `xcrun simctl openurl`, and run scripts, find elements, and read names and attributes through Web Inspector. `--target mac` stays on safaridriver. Run the AC1 lines on both simulators, and the CLAUDE.md `--target mac` lines. If Safari on iOS gives a name the viewer gets wrong, stop: it is a viewer defect.
- [x] T3: Show that the simulator runs can fail: on the iPhone simulator, `--plant rawindicator`, `nonumber`, `nativename`, and `nativetitle` each make the `example.html` line exit 1 with a failure line naming the planted defect. A `--device` that names a shut-down simulator exits 2 with a line naming that cause.
- [x] T4: Docs. In CLAUDE.md, add the four AC1 run lines to the verify block, and update the `safari_check.mjs` paragraph, the screen-reader entries of "Still unverified" (the toolbar-control and computed-name entries), and the helper list. Update README.md line 91 and the header of `tests/safari_check.mjs`. Correct the M010 lesson in `cairn/LESSONS.md` in place (safaridriver still finds no simulator session host; Web Inspector reads the names). Run the AC2 `grep`.
- [x] T5: Review return 1: README.md item 91 names `example.html` and `page_test.html` and says the indicator was read with role heading.

## Work log

- 2026-10-20: created by /milestone-plan.
- 2026-10-20: tier check: not run — work named at the question set
- 2026-10-20: question set: what to work on — "Safari names on iOS" (row "Check Safari names in iOS simulators").
- 2026-10-20: question set: may the run stop for one manual step (a setting, a file save) — yes, ask.
- 2026-10-20: collision check: row "Check Safari names in iOS simulators" absorbed in full; row "Close the name and indicator check gaps" absorbed in part (indicator update on scroll in Safari); M010 shipped safari_check, extended here; not the checker-regress shape (safari_check checks the shipped viewer in Safari, not repo-internal files); D-006 keeps this row, as it leaves viewer behavior unchecked; no other D-entry overlaps.
- 2026-10-20: inbox sweep: 0 open issues, 0 open PRs. Resolves is empty, so no assignment option.
- 2026-10-20: lessons harvested: M010 (safaridriver needs remote automation; simulator session failed), M012 (each session brings Safari to the front; batch runs), M010 (first openurl after boot can time out), M001 (iOS 27.0 runtime for these devices).
- 2026-10-20: surface tier user-facing (README changes); works under IP1 and changes no principle, so no RB tripwire tag. No viewer change, so no version bump; changelog slot is none.
- 2026-10-20: criteria audit (full mode, Opus reader): 10 findings, all fixed or answered. Fixed: run count wording; names scoped to the two pages; indicator read named as "with role heading"; toolbar and scroll limits named; AC2's off state tied to the no-session-host error; AC2 says the off/on demonstration is iPhone only; AC3's grep widened to README's two stale sentences; AC3 narrowed to `<object>` and PDF.js embeds; "verify block holds the lines" moved from AC3 to T4 (instrument). Answered: the ROADMAP row graduates at review hygiene, not by the grep.
- 2026-10-20: plan gate chose safaridriver with Remote Automation on over a page-script name read, because iOS 27.0 Safari has no `Element.prototype.computedName` (M010); falsified by a session that still fails with the setting on.
- 2026-10-20: implement started on branch m024-ios-safari-names (commit 622e130, tracking only); its records are rewritten here on main, since the goal stop returns the milestone to planned and the branch is deleted.
- 2026-10-20: T1: the simulators held no Safari, WebInspector, or automation preference key before any change (243 preference files snapshot in the iPhone simulator).
- 2026-10-20: T1: the iOS 27.0 iPhone simulator's Settings > Apps > Safari > Advanced shows no Web Inspector or Remote Automation switch; `MobileSafariSettings.bundle/Developer.plist` lists REMOTE_INSPECTOR_ID and REMOTE_AUTOMATION_ID groups that the bundle fills in code (keys `RemoteInspectorEnabled`, `RemoteAutomationEnabled` in `com.apple.webinspectord`) and that stay empty there. An Apple Developer Forums reply (thread 656190) says simulators always allow remote automation since iOS 14, so the toggle was removed.
- 2026-10-20: T1: with `RemoteInspectorEnabled` and `RemoteAutomationEnabled` written true in `com.apple.webinspectord` (also in `com.apple.mobilesafari` and `com.apple.WebInspector`), a reboot, and Safari running, safaridriver (Safari 27.0.1, Xcode 27.1 selected) still answered "Could not find any session hosts that match the requested capabilities" for `safari:useSimulator` with no device key, `deviceType`, `deviceUDID`, `deviceName`, and `platformVersion` 27.0, on the iOS 27.0 iPhone and the iOS 27.1 "embedpdf iPhone Duo". Without `useSimulator` it answered "Some devices were found, but could not be used" with no reason. The keys were deleted again.
- 2026-10-20: goal found wrong: the plan's premise (the Remote Automation setting is what blocks the session) is false, so AC1 and AC2 cannot be met as written. Status back to planned for a re-cut with /milestone-plan. Untried: a simulator started from Xcode (WebKit bug 205532), and the safaridriver of Safari Technology Preview.
- 2026-10-20: /milestone-implement re-run on the un-re-cut plan: Xcode 27.1 ships no Simulator.app (its simulator window is `Contents/Applications/DeviceHub.app`); with DeviceHub open and Safari launched in the booted "embedpdf iPhone", safaridriver (Safari 27.0.1) still answered "Could not find any session hosts that match the requested capabilities" with and without `safari:deviceUDID`. Safari Technology Preview is not installed (installing it is a download the question set did not cover). Status stays planned; the re-cut is still owed.
- 2026-10-20: re-cut by /milestone-plan. Goal kept; Scope In, criteria (3 to 2), Coverage, and Tasks rewritten for a Web Inspector client.
- 2026-10-20: probe: `xcrun simctl getenv <udid> RWI_LISTEN_SOCKET` gives each booted simulator's `webinspectord_sim` socket. Messages are a 4-byte big-endian length plus a binary plist `{__selector, __argument}`: `_rpc_reportIdentifier:`, then `_rpc_forwardGetListing:` for `com.apple.mobilesafari`, `_rpc_forwardSocketSetup:`, and `_rpc_forwardSocketData:` with JSON wrapped in `Target.sendMessageToTarget` (target id from `Target.targetCreated`). `DOM.getAccessibilityPropertiesForNode` gave role group and label "PDF: sample.pdf (1 of 11)" for a PDF.js embed (iPhone, example.html), "PDF: sample.pdf (2 of 3)" for a native `<object>` (iPad, page_test.html), "Zoom out", "Zoom in", and link "Download PDF"; the indicator spans came back ignored with an empty label.
- 2026-10-20: question set: approach — Web Inspector socket (rejected: docs-only correction, which leaves iOS names unchecked; also not tried: Safari Technology Preview's safaridriver, a download). Falsified by a name the Web Inspector label gives that differs from what VoiceOver reads.
- 2026-10-20: question set: old safaridriver simulator path — replace it; `--target mac` keeps safaridriver.
- 2026-10-20: tier check: milestone — re-cut of a planned milestone (changes a check script and README).
- 2026-10-20: inbox sweep: 0 open issues, 0 open PRs. Resolves stays empty, so no assignment option.
- 2026-10-20: collision check: unchanged from the first plan (rows "Check Safari names in iOS simulators" in full and "Close the name and indicator check gaps" in part; D-006); no D-entry covers Web Inspector.
- 2026-10-20: criteria audit (full mode, Opus reader): 4 findings, all fixed. AC1 native clause gains "and no `title`" (the `nativetitle` plant tests it); AC2 grep pattern for the CLAUDE.md probe sentence fixed to match its first line; `only the page.s attributes and text were checked` and `session hosts` added for README's stale sentences; T4 names the CLAUDE.md screen-reader entries. Each grep pattern matched current text before the work.
- 2026-10-20: agent decisions: a new helper file `tests/webinspector.mjs` rather than code inside safari_check, so helpers_test can test the plist codec; no version bump (no viewer change); changelog none.
- 2026-10-20: implement started on branch m024-ios-safari-names, cut from main at ee5e5db.
- 2026-10-20: T1: `tests/webinspector.mjs` written (plist codec, framing, `simulatorSocket`, `openSafariPage` with run/find/label/attribute). helpers_test 169 passed, 0 failed; with the UTF-16 byte swap removed from the decoder it gave 2 failures (plutil fixture, round trip). `plutil -p` read the encoder's output. A smoke run on page_test.html in the iPhone simulator read "PDF: sample.pdf (1 of 3)", the three toolbar names, and the two native names. Helper added to CLAUDE.md's helper list and PROFILE.md's verify slot. The simple-english hook flags 40 older hits in CLAUDE.md and 18 in PROFILE.md outside the edited lines; left as they are.
- 2026-10-20: T2: `--target simulator` opens `<page>?run=<token>` with `simctl openurl` (retried once), reads it through `openSafariPage`, and waits for `document.readyState` "complete" (WebDriver's navigation waited for the load); a simulator that is not booted exits 2. `--target mac` keeps safaridriver behind the same run/find/label/attribute calls. AC1's four lines exit 0 (iPhone and iPad: example.html 1 native, 10 PDF.js, 9 toolbars, indicators "Page 1 of 2" then "Page 2 of 2"; page_test.html 2 native with no title, 1 PDF.js). The three CLAUDE.md `--target mac` lines exit 0, and `--remote cors` on the iPhone exits 0.
- 2026-10-20: T3: on "embedpdf iPhone", example.html: `--plant rawindicator` exit 1 (indicator read as "Page 1 of 2 1 / 2", and "Page 2 of 2 2 / 2" after the scroll); `nonumber` exit 1 (name "PDF: sample.pdf", not "(1 of 11)"); `nativename` exit 1 ("PDF: wrong.pdf"); `nativetitle` exit 1 (element has a title). `--device "embedpdf iPhone Duo"` (shut down) exit 2: "is Shutdown, not booted".
- 2026-10-20: T4: CLAUDE.md gains the four AC1 lines (example.html in the first verify block, page_test.html in the page_test block), a rewritten safari_check paragraph, and rewritten screen-reader entries in "Still unverified" (the computed-names entry removed). README item 91 and the safari_check header updated; M010 lesson corrected in place. AC2 grep prints nothing (exit 1); helpers_test 169 passed, 0 failed; cairn_validate passes. The simple-english hook's counts did not rise from the new text (CLAUDE.md 40 to 39, after one long sentence of mine was split).
- 2026-10-20: claim audit: 32 claims read, 4 corrected — tests/webinspector.mjs (10 s is per protocol message; openSafariPage waits up to 30 s), tests/safari_check.mjs (exit-2 list gains an unreachable socket and a 30 s load timeout; stale indicator comment names the Web Inspector label), tests/helpers_test.mjs (fixture made on macOS 27.0.1). The reader's own page_test.html run on the iPhone simulator exited 0.
- 2026-10-20: implement done; status review. helpers_test 169 passed, 0 failed after the comment fixes.
- 2026-10-20: review: AC1's four lines re-run fresh, all exit 0.
- 2026-10-20: review return 1: AC2 fails as written: README.md item 91 says the names were checked "on two test pages" and does not name `example.html` and `page_test.html`, nor that the indicator was read with role heading (CLAUDE.md states both). Status in-progress.
- 2026-10-20: T5 added for review return 1 (minor amendment; Coverage AC2 → T4, T5). README item 91 now names both pages and "read with the role heading"; AC2 grep still prints nothing. Status review.

## Review

- AC1: 2026-10-20, the four lines run at ea3f4bb (no code changed to HEAD 5f57c96: only README.md and this file). "embedpdf iPhone" and "embedpdf iPad", example.html: exit 0, native `<object>` "PDF: sample.pdf (10 of 11)" with no title, 10 PDF.js names "(1 of 11)" to "(11 of 11)" except 10, 9 toolbars whose 3 controls are named by their titles, indicators "Page 1 of 2" then "Page 2 of 2", 0 failures. page_test.html: exit 0, natives "(2 of 3)" and "(3 of 3)" with no title, PDF.js "(1 of 3)" with 3 controls named by title, indicator "Page 1 of 2" then "Page 2 of 2", 0 failures.
- AC2: 2026-10-20 at 5f57c96. README.md item 91: "On 2026-10-20, the names that Safari gives screen readers were also checked there, through Web Inspector, on the test pages `example.html` and `page_test.html`", naming the embed's name, the toolbar controls' names, and the indicator "read with the role heading", and the native `<object>` name "on 2026-10-20 through Web Inspector". CLAUDE.md "Still unverified": the PDF.js entry says `--target simulator` reads Safari's names through Web Inspector for the group, toolbar controls, and indicator (read with role heading) on both pages, "These runs passed on 2026-10-20"; the native entry says the `<object>` name was checked through Web Inspector on both pages on 2026-10-20. The AC2 grep printed nothing (exit 1).
- gate: cairn_validate exit 0, all checks passed; profile consistency-gate is none (generic); no principle changed, so no cairn_impact run.
