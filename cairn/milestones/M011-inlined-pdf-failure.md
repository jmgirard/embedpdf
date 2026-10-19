# M011: Inlined PDF failure

- **Status:** in-progress
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** IP2
- **Resolves:** —
- **Surface tier:** user-facing — readers of self-contained pages see the failure message and its link
- **Branch/PR:** m011-inlined-pdf-failure

## Goal

When a self-contained page cannot show an inlined PDF, the embed says so, and where the PDF decoded, its link is a download of the PDF under its file name instead of a nameless `blob:` address opened in a new tab.

## Scope

**In:** In `embedpdf-viewer.js`, `showFailure()` gives an embed whose PDF was inlined (a `data:` `data-src`) a "Download the PDF" link with the decoded PDF's `blob:` URL and a `download` name, and no `target`. `hydrate()` catches a failed `inlinedPdf()` decode and shows "This PDF cannot be shown here." with no link, for both renderers. Version 1.2.3. A new self-contained test page with a file that is not a PDF and two hand-written embeds whose `data:` address cannot be decoded. `render_check.mjs` and `ios_check.mjs` learn the inlined failure state, each with plants; `render_check.mjs` checks the download in Chromium. README, `example.qmd`, DESIGN.md, and CLAUDE.md describe the new state.

**Out:** Embeds whose `data-src` is not a `data:` address keep "Open the PDF" in a new tab (this milestone checks that they do, AC4). The `button` link below an embed whose inlined PDF cannot be decoded still names the separate file → candidate row "Decode failure button link". The no-JavaScript link on a self-contained page → candidate row "Self-contained no-JS link". The native `<object>`'s display of a `blob:` PDF in Safari and Firefox → candidate row "Self-contained native checks". A real download from a `blob:` link in Safari → CLAUDE.md "Still unverified" (T5).

## Acceptance criteria

- [ ] AC1: On the new page `selfcontained_failed_test.html` (`embed-resources: true`), the `renderer=pdfjs` embed of `files/broken.pdf` (a file whose bytes are not a PDF) shows "This PDF cannot be shown here." and exactly one link inside its `div.embedpdf`, "Download the PDF", whose `href` is a `blob:` URL, whose `download` attribute is `broken.pdf`, and which has no `target` attribute. Shown by `tests/render_check.mjs` with `--alone http` and with `--alone file`, each for the default desktop device and for `--device iphone`, and by `tests/ios_check.mjs --alone yes` on the "embedpdf iPhone" and "embedpdf iPad" simulators.
- [ ] AC2: In Chromium, a click on that link saves one file named `broken.pdf` whose bytes equal those of `files/broken.pdf`, with the page opened by `--alone file` and by `--alone http` (`tests/render_check.mjs`).
- [ ] AC3: On the same page, two hand-written embeds whose `data-src` is a `data:application/pdf;base64,` address holding characters outside the base64 alphabet, one `renderer=pdfjs` and one `renderer=native`, each show "This PDF cannot be shown here." and no link inside their `div.embedpdf`. Shown by the same runs as AC1. (RB tripwire: ip-touching)
- [ ] AC4: A PDF.js embed whose `data-src` is not a `data:` address and that cannot load its PDF still shows an "Open the PDF" link that opens in a new tab, for the embeds in the `--remote blocked`, `--remote missing`, and `--missing-pdfs` lines for `render_check.mjs` and `ios_check.mjs` in CLAUDE.md "Verify before finishing", which pass with their current flags.
- [ ] AC5: README "Known limitations" and the self-contained paragraph of `example.qmd` say that a self-contained embed that cannot show its PDF offers "Download the PDF", and that an inlined PDF the browser cannot decode shows the message with no link; `quarto render` completes with no errors.
- [ ] AC6: `version:` is 1.2.3 in `_extension.yml` and in the `add_html_dependency` version in `embedpdf.lua`, and every check line in CLAUDE.md "Verify before finishing", including the lines for the runs AC1 to AC3 name, exits 0 (`pandoc lua tests/test_shortcode.lua` and `node tests/helpers_test.mjs` print "0 failed").

## Coverage

- AC1 → T1, T2, T3, T4
- AC2 → T2, T4
- AC3 → T1, T2, T3, T4
- AC4 → T6
- AC5 → T5
- AC6 → T4, T6

## Tasks

- [x] T1: Fixtures. Add `files/broken.pdf` (plain text, not a PDF), `files/undecodable-embeds.md` (two hand-written `div.embedpdf` embeds, `data-renderer="pdfjs"` and `"native"`, `data-src="data:application/pdf;base64,@@@@"`), and `selfcontained_failed_test.qmd` (`embed-resources: true`, `{{< pdf files/broken.pdf renderer=pdfjs >}}`, then the include). `quarto render`; confirm the page keeps the hand-written `data:` addresses as written and inlines `broken.pdf`. Probe `fetch()` of the bad address in Safari (iOS simulator); if Safari accepts it, find an address both engines reject before T2, or amend AC3. Run the current scripts on the page to see today's state (malformed failure, kept fallback link).
- [x] T2: `render_check.mjs`: a failed embed whose PDF was inlined passes only with the AC1 link (blob `href`, `download` name given by a new flag as an independent fact, no `target`, one link in the embed) or, while its `data-src` is still a `data:` address, with no link. Count the "failed to render an inlined PDF" console lines against the failed inlined embeds. Add a Chromium download check (set the download folder, click, compare name and bytes with the source file). Plants that vary each axis: a `target`, no `download`, a wrong name, a non-`blob:` `href`, a second link, the text "Open the PDF", a link on a decode failure, a wrong downloaded file. Header comment and `--plant` list updated. If a helper changes, `node tests/helpers_test.mjs`.
- [x] T3: `ios_check.mjs`: the same failure-state rule with `--alone yes` and an expected count of failed embeds, with plants for the link axes.
- [x] T4: Viewer. `showFailure()` builds the "Download the PDF" link when `opts.blob` is set; `hydrate()` wraps `inlinedPdf()` so a decode failure calls `showFailure()` with no link and still logs the "failed to render" line; failed embeds keep no name. Bump `VERSION` in `embedpdf.lua` and `version:` in `_extension.yml` to 1.2.3. Run T2 and T3 lines to green.
- [ ] T5: Docs. README "Known limitations" and `example.qmd` (AC5 wording, where it was checked); DESIGN.md Architecture (the failure link by kind of address) and a Known issues entry saying an inlined PDF that cannot be decoded shows the message with no link, so IP2's usable fallback is not met there (as before this milestone); CLAUDE.md lines for the new page and flags, the page in the test-page list, and Safari's `blob:` download in "Still unverified". `quarto render`.
- [ ] T6: Run every line in CLAUDE.md "Verify before finishing", the new lines included, and record each result.

## Work log

- 2026-10-19: created by /milestone-plan.
- 2026-10-19: tier check: not run — work named at the question set.
- 2026-10-19: question set: which work — "Inlined PDF failure link" candidate row; link on a self-contained failure — download under its file name ("Download the PDF"), normal pages keep "Open the PDF".
- 2026-10-19: collision check: absorbed candidate row "Inlined PDF failure link"; distinct from "Self-contained no-JS link" (no JavaScript), "Self-contained native checks" (native display), D-003 (no-JS link), D-004 (normal-page remote failure link stays); GitHub inbox: 0 open issues, 0 open PRs.
- 2026-10-19: plan gate chose no link on a decode failure over a download link to the `data:` address itself, because an address `fetch()` cannot decode gives no usable file; falsified by a valid inlined PDF whose decode fails in a browser (for example from size).
- 2026-10-19: plan gate chose a new test page over adding embeds to `selfcontained_test.qmd`, because failed embeds there would change the counts of its existing check lines; falsified by none expected.
- 2026-10-19: probe: Chromium `fetch()` rejects `data:application/pdf;base64,@@@@`, `…,JVBER`, and `…,%%%` with "TypeError: Failed to fetch"; Safari not probed (T1).
- 2026-10-19: version 1.2.3 (patch: a failure-path fix, no option change).
- 2026-10-19: criteria audit (full mode, fresh Opus reader): AC1 link count scoped to the embed's `div`; plants for every link axis moved to T2/T3; AC2 download proven only in Chromium, Safari's `blob:` download goes to "Still unverified" and the goal says "is a download"; AC3 console-line clause dropped (instrument, and the AC1 embed logs the same line) and kept as a T2 count, input narrowed to characters outside the alphabet, Safari leniency probed at T1, IP2 status recorded as a Known issues entry (T5) with no D-entry since the dead link failed IP2 before too; AC4 narrowed to non-`data:` embeds in the named lines; AC6 new lines tied to AC1–AC3.
- 2026-10-19: started on branch m011-inlined-pdf-failure.
- 2026-10-19: T1 done: `files/broken.pdf`, `files/undecodable-embeds.md`, `selfcontained_failed_test.qmd`; `quarto render` keeps both `data:…base64,@@@@` addresses as written and inlines `broken.pdf`; desktop Safari 27.0.1 `fetch()` rejects `@@@@` and `JVBER` ("TypeError: Load failed"), the iOS simulators are checked by T3's runs; render_check before the fix: embed 1 malformed (`blob:` link, `target=_blank`), embeds 2 and 3 never hydrate.
- 2026-10-19: T2 done: render_check `--expect-download "<path>|-|…"` (path from the repo root, or "-" for a data: address that did not decode), a Chromium download check through `Browser.setDownloadBehavior` (one file, name, bytes), a console count of "failed to render an inlined PDF" lines on every run, and plants dltarget, dlnoname, dlwrongname, dlhref, dlsecond, dltext, dlbytes, decodelink, extralog; before the fix the new page fails on link text, download name, target, no saved file, entry count, and line count. Plants are run after T4.
- 2026-10-19: T3 done: ios_check `--expect-download` (every embed, renderer=native too, in the inlined failure state; link attributes and the line count, no saved file) and plants dltarget, dlnoname, dlwrongname, dlhref, dlsecond, dltext, decodelink, extralog; before the fix, on "embedpdf iPhone" (iOS 27.0), Safari logs "failed to render an inlined PDF TypeError: Load failed" for both `@@@@` embeds, so the iOS simulator rejects that address too.
- 2026-10-19: T4 done: `showFailure()` gives an embed with `opts.blob` a "Download the PDF" link (`download` = `opts.filename`, no target) and gives no link when `opts.href` is null; `hydrate()` catches a failed `inlinedPdf()`, calls `showFailure()` with `opts.href = null`, and rethrows so the caller still logs; version 1.2.3. render_check on `selfcontained_failed_test.html` with `--expect-native 0 --expect-pdfjs 0 --expect-failed 3 --expect-download "files/broken.pdf|-|-"` exits 0 for `--alone http` and `--alone file`, desktop and `--device iphone` (Chromium 155); each of the 9 render_check plants exits 1 naming its defect. ios_check `--alone yes --expect-embeds 2` with the same `--expect-download` exits 0 on "embedpdf iPhone" and "embedpdf iPad"; each of the 8 ios_check plants exits 1 on "embedpdf iPhone" naming its defect. `pandoc lua tests/test_shortcode.lua`: 40 passed, 0 failed.

## Decisions

## Review
