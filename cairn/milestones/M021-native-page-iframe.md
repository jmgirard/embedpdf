# M021: Native embeds open at their page in Safari

- **Status:** in-progress
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** GP2, GP5
- **Resolves:** —
- **Surface tier:** user-facing — it changes the element that readers' browsers get for a native embed with a `page` option
- **Branch/PR:** m021-native-page-iframe

## Goal

A native embed whose `page` option is over 1 opens at that page in desktop Safari, as it already does in Chromium and Firefox.

## Scope

**In:** In `hydrateNative()` (`_extensions/embedpdf/embedpdf-viewer.js:109`), when the browser reports a
built-in PDF viewer (`nativeSupported()` true) and `page` is over 1, the viewer makes an `<iframe>` with the
`#page=` address in place of the `<object>`, in every browser (D-007). The `<iframe>` gets the width, height,
and `aria-label` that the `<object>` gets, no `title`, and no border. The no-JS fallback content stays in the
placeholder, hidden. Every other native embed stays an `<object>`. Version 1.2.7. A new normal test page,
`page_test.qmd`. The check scripts learn the `<iframe>` form. README, DESIGN.md, and CLAUDE.md state the result.

**Out:**
- A check that a PDF.js embed opens at its `page`, iOS Safari's handling of `#page` on a `renderer=native`
  `<object>`, and a remote PDF whose site forbids framing → new candidate row "Check embeds open at their
  page option".
- Native embeds on self-contained RevealJS slides, and the file name a native viewer's save button gives →
  row "Check native save names and slide embeds".
- An `<iframe>` for native embeds at page 1, and PDF.js for such embeds in desktop Safari → not planned;
  D-007 says what evidence would bring either back.

## Acceptance criteria

- [ ] AC1: On `page_test.html`, a page that is not self-contained, `tests/native_check.mjs` with
      `--expect-native 3 --reference sample.pdf` and no `--same-pages` exits 0 with `--browser chromium`,
      `--browser firefox`, and `--browser safari`. In each run, each native embed with `page=2` is an
      `<iframe>` whose address ends in `#page=2`, with a computed border width of 0, a 600 x 400 CSS-pixel
      box, and no other element of its placeholder with a rendered box. Its screenshot matches the page-2
      reference, the page-1 and page-2 references are both `<iframe>`s and differ, and the native embed with
      no `page` option is an `<object>` with no fragment.
- [ ] AC2: On `selfcontained_test.html`, `tests/native_check.mjs` with `--expect-native 3 --reference
      sample.pdf` and no `--same-pages` exits 0 with `--alone file` and with `--alone http`, each with
      `--browser chromium`, `--browser firefox`, and `--browser safari`. In each run, the `page=2` native embed
      is an `<iframe>` with a `blob:` address that ends in `#page=2`, with the border, box, and placeholder of
      AC1. Its screenshot matches the page-2 reference, the page-1 and page-2 references are both `<iframe>`s
      and differ, and the other native embeds are `<object>`s.
- [ ] AC3: On `page_test.html` and `selfcontained_test.html`, each native embed that is an `<iframe>` has the
      embed's name as its `aria-label` and has no `title`. On `page_test.html`, `tests/render_check.mjs` with
      `--expect-native 3 --expect-pdfjs 0 --expect-name sample.pdf` exits 0 in Chromium, which reads the names
      in the DOM and in the accessibility tree, and `tests/safari_check.mjs --target mac` with the same flags
      exits 0 in desktop Safari. The `selfcontained_test.html` render_check lines of AC5 hold for that page.
- [ ] AC4: On iPhone, iPad, and emulated Android, `renderer=native` with `page=2` stays an `<object>`, and
      `page=2` with `renderer=auto` uses PDF.js. On `page_test.html`, `tests/render_check.mjs` with `--device
      iphone` and with `--device android` exits 0 with `--expect-native 2 --expect-pdfjs 1 --expect-pages 2
      --expect-name sample.pdf`. `tests/ios_check.mjs` exits 0 on the "embedpdf iPhone" and "embedpdf iPad"
      simulators with `--expect-native 2 --expect-embeds 1 --expect-name sample.pdf`. In each of these runs
      every native embed is an `<object>`.
- [ ] AC5: Each `node tests/…` and `pandoc lua tests/…` run line exits 0, and `quarto render` ends with no
      error. The lines are those in CLAUDE.md's "Verify before finishing" section at commit 49f134c, with
      `--same-pages` removed from the two Safari `native_check.mjs` lines, plus the `page_test.html` lines that
      T6 adds.
- [ ] AC6: README.md and CLAUDE.md no longer say that desktop Safari opens a native embed at page 1. README.md
      and DESIGN.md Known issues say that a native embed with a `page` over 1 is an `<iframe>`, and name the
      browsers, versions, and date of the AC1 and AC2 runs (recorded in the Review section) in which such an
      embed opened at page 2. DESIGN.md Known issues says that such an embed of a PDF missing at view time
      shows a blank frame or the server's error page, where an `<object>` shows its download link. CLAUDE.md's
      file list names `page_test.qmd`.

## Coverage

- AC1 → T1, T2, T3, T5, T7
- AC2 → T1, T3, T5, T7
- AC3 → T1, T4, T5, T7
- AC4 → T2, T4, T7
- AC5 → T6, T7
- AC6 → T6

## Tasks

- [x] T1: Viewer. In `hydrateNative()` (`embedpdf-viewer.js:109`), make an `<iframe>` when `opts.page > 1` and
      `nativeSupported()`, with `src` `${href}#page=${page}`, the width, height, and `aria-label` of the
      `<object>`, and no `title`. Move the no-JS fallback children into a hidden element in the placeholder, so
      the self-contained download links stay in the page. Give the `<iframe>` no border in `embedpdf.css`.
      Update the comments at :3–7, :38, and :153. Bump `version:` to 1.2.7 in `_extension.yml` and in
      `add_html_dependency` in `embedpdf.lua`.
- [x] T2: Add `page_test.qmd` (not self-contained): `sample.pdf` with `page=2` (auto), with `renderer=native
      page=2`, and with `renderer=native`, each 600 x 400. Run `quarto render`. Name the page in CLAUDE.md's
      file list.
- [x] T3: `tests/native_check.mjs`: take `<iframe>` native embeds; for an `<iframe>` embed, both references
      and the control are `<iframe>`s. Run on a page that is not self-contained when `--alone` is not given,
      where each address must be the PDF file with the expected fragment. Fail when an embed with `page` over
      1 is not an `<iframe>`, when one with page 1 is not an `<object>`, when an `<iframe>` has a border or a
      box other than its width x height, or when its placeholder shows other content. Report every failure of
      an embed, not only the first. Update the header.
- [x] T4: `tests/render_check.mjs`, `tests/safari_check.mjs`, `tests/ios_check.mjs`: wherever they find a
      native embed by its `<object>` (names, `title`, name plants, download-link selector, native-load and
      `--remote cors` address checks), also take its `<iframe>`. render_check and ios_check report each native
      embed's element, and fail on iPhone, iPad, or Android when one is not an `<object>`.
- [x] T5: Show each changed check fail on an `<iframe>` embed of `page_test.html`: render_check `nativename`
      and `nativetitle`; safari_check `nativename`; native_check `nopage`, `otherpdf`, and `refcontrol` with
      `--plant-at` aimed at an `<iframe>` embed, in Safari as well; a new native_check plant that puts an
      `<object>` in place of an `<iframe>`, whose Safari run must name both the element and a page-2 mismatch;
      and new native_check plants for a border and a visible fallback.
- [x] T6: CLAUDE.md: `page_test.html` lines (render_check desktop, `mac-safari`, `windows-touch`, `iphone`,
      `android`; ios_check iPhone and iPad; safari_check `--target mac`; native_check in three browsers), the
      Safari native_check lines without `--same-pages`, and the native_check paragraph. README `page` row and
      self-contained paragraph; DESIGN.md architecture and Known issues.
- [x] T7: Run every AC5 line and `quarto render`; record each result in the Review section.

## Work log

- 2026-10-20: created by /milestone-plan.
- 2026-10-20: tier check: not run — work named at the question set.
- 2026-10-20: question set: which work to plan — the candidate row "Make Safari native embeds honor page", absorbed whole.
- 2026-10-20: question set: the fix if Safari opens no native element at the page — PDF.js for `page` over 1 in desktop Safari. The plan probe found that the condition does not hold (next line).
- 2026-10-20: plan probe (safaridriver, puppeteer-core): Safari 27.0.1 opened `<object>` and `<embed>` of `sample.pdf#page=2` at page 1 and `<iframe>` at page 2; Chromium 155 and Firefox 158 opened `<iframe>` at page 2; all three did so for a `blob:` copy too. Chromium's tree named an `<iframe>` by its `aria-label` (role Iframe), and Safari's Get Computed Label returned it (role group).
- 2026-10-20: plan probe (Chromium 155): for a missing PDF (HTTP 404) an `<object>` showed its child download link and an `<iframe>` showed an empty frame.
- 2026-10-20: plan gate chose an `<iframe>` for native embeds with `page` over 1 over PDF.js in desktop Safari because the iframe needs no user-agent detection and loads no PDF.js on the native path; falsified by a promised desktop browser whose built-in viewer opens such an iframe at page 1.
- 2026-10-20: plan gate chose the `<iframe>` only for `page` over 1 over an `<iframe>` for every native embed because page-1 embeds work as `<object>` and the wider change touches every native embed and check line; falsified by a reader-visible difference between the two elements for one PDF beyond the missing-PDF case in AC6.
- 2026-10-20: plan gate chose a new `page_test.qmd` over new embeds on `example.qmd` because `example.html`'s counts are in over 20 CLAUDE.md lines; falsified by nothing reader-visible (a check-layout choice).
- 2026-10-20: collision check: absorbs row "Make Safari native embeds honor page"; D-005 rejected Safari user-agent detection for its case, and this plan uses none; M020 shipped the check that found the gap, not a fix; no open issues or PRs (inbox 0 and 0).
- 2026-10-20: lessons harvested: M020 (Safari page-1, Firefox `pdfjs.viewOnLoad` and profile folder, screenshot shift), M011 (puppeteer-core probes from the repo root), M014 (`CHROME_PATH` for Chromium), M010 (safaridriver needs remote automation).
- 2026-10-20: criteria audit (full mode, fresh Opus reader): 12 findings, all fixed: both references `<iframe>` for an `<iframe>` embed (AC1, AC2, T3); every failure reported and Safari plants (T5); iframe border, box, and hidden fallback checked (AC1, T1, T3, T5); exact flags (AC3, AC4); AC3 bounded to two pages; v1.2.6 clause dropped and Android marked emulated (AC4); AC5 pinned to commit 49f134c; AC6 widened to CLAUDE.md and the file list; missing-PDF difference recorded in AC6, D-007, and Known issues rather than kept as an IP2 break, because IP2's missing-file warning is the shortcode's at render time and the `<object>` link points at the same missing file; D-007 not an AC, since the plan commit lands it.
- 2026-10-20: new candidate row "Check embeds open at their page option" holds the PDF.js, iOS `renderer=native`, and framing-refused checks left out of this scope.
- 2026-10-20: implement started on branch m021-native-page-iframe; status in-progress.
- 2026-10-20: T1 done: `hydrateNative()` makes an `<iframe>` (`src`, width, height, `aria-label`) when `page` > 1 and `nativeSupported()`; fallback children go to a hidden `div.embedpdf-fallback` after it; `embedpdf.css` gives `.embedpdf-native > iframe` border 0; version 1.2.7; shortcode tests 162 passed, 0 failed. Browser checks run at T7.
- 2026-10-20: T2 done: `page_test.qmd` added and named in CLAUDE.md's file list; `quarto render` completed with no error, docs/ libraries now at 1.2.7.
- 2026-10-20: T3 done: native_check takes `<iframe>` embeds, compares each embed with a reference and control of the element its page option asks for, runs on a normal page when `--alone` is not given (address must be the resolved data-src), checks element, iframe border, box, and shown fallback, and drops `--same-pages` (no line needs it now); new plants `object`, `border`, `fallback`; `fileaddr` needs `--alone`. page_test.html passes in Chromium 155, Firefox 158, Safari 27.0.1; selfcontained_test.html passes `--alone file` and `http` in all three.
- 2026-10-20: T5 (native_check part): on page_test.html embed 1 in Safari and Chromium, nopage, object, border, fallback, refcontrol, and otherpdf (`--plant-at 1`) each exit 1 naming that embed; in Safari nopage and object also fail as a page-2 mismatch (0.0952).
- 2026-10-20: T4 done: render_check, safari_check, and ios_check read a native embed's `<object>` or `<iframe>` (names, title, name plants, link selector with `.embedpdf-fallback`, alone and remote addresses); render_check reports `nativeTags` and fails on iphone, ipad, or android when one is not `<object>`; ios_check fails on any native `<iframe>`; safari_check now takes `--expect-pdfjs 0` when native embeds are expected. page_test.html passes: render_check desktop and iphone/android, safari_check `--target mac`, ios_check iPhone and iPad.
- 2026-10-20: T5 done: on page_test.html render_check nativename, nativetitle, nativedesc and safari_check nativename, nativetitle each exit 1 naming the `<iframe>` of embed 1; with the docs/ viewer copy changed to give an `<iframe>` on every device (restored after), render_check `--device iphone` and ios_check "embedpdf iPhone" each exit 1 naming a native `<iframe>`.
- 2026-10-20: T6 done: CLAUDE.md native_check paragraph rewritten for the `<iframe>` rule, 3 page_test native_check lines added, `--same-pages` dropped from the Safari lines, 8 page_test lines for render_check, ios_check, and safari_check, and a "Still unverified" item for the `<iframe>` form; README `page` row and self-contained paragraph; DESIGN.md Viewer, architecture, and Known issues (with the missing-PDF difference). The simple-english hook reports the same 39 CLAUDE.md hits as before this milestone; README hits left are in untouched text.
- 2026-10-20: T7 done: all 98 `node tests/…` and `pandoc lua tests/…` lines in CLAUDE.md (the 49f134c set, Safari native_check lines without `--same-pages`, plus 11 page_test lines) exited 0 on the first try; percent_page_test PDF render rc 0 with the phrase 5 times; helpers_test 158 passed, 0 failed. Results are logged here, not in the Review section, which review owns; review gathers its own evidence.
- 2026-10-20: claim audit: 81 claims read, 5 corrected — tests/native_check.mjs (control margin and match figures re-measured from the T7 run, refcontrol sentence moved, percent sizes not box-checked, code too), embedpdf-viewer.js and embedpdf.css comments (the `nativeSupported()` condition), README `page` row (Safari version, built-in viewer condition).
- 2026-10-20: after the claim-audit fixes (comments, the README row, and native_check's percent-size skip), `quarto render` ran again (docs/ library copies changed in comments only); native_check chromium page_test, render_check example.html desktop, and render_check selfcontained `--alone file` exited 0 again.
- 2026-10-20: implement complete; status review.
- 2026-10-20: review pass 1: four lenses ran; the evidence run was stopped at line 39 of 98 (lines 1-38 exit 0) because fix-now edits touch the viewer; a review probe confirmed diff-bug #1 (an `<iframe>` downloads a PDF sent as `application/octet-stream` or as an attachment, where an `<object>` shows it in Firefox 158 and Safari 27.0.1), which falsifies D-007's choice for such servers; stopped for the user's decision on the approach (the probe's Safari run saved att.pdf and oct.pdf, copies of sample.pdf, in ~/Downloads).
- 2026-10-20: review decision: the user chose "Check headers first": for a native embed with `page` over 1 the viewer reads the PDF's headers (HEAD) where it can, and uses the `<iframe>` only for an `application/pdf` answer shown inline, else an `<object>`; rejected "Keep iframe, document it", "Revert to object", "Stop for now". The widening this needs (a criterion for the header rule) is adopted at the user's selection.
- 2026-10-20: review return 1: diff-bug #1 — a page>1 native `<iframe>` embed of a PDF sent as `application/octet-stream` or as an attachment downloads the file and shows nothing in Firefox 158 and Safari 27.0.1, where v1.2.6's `<object>` showed it; fix by the header rule above, add a criterion and a check for it, amend Scope and D-007; also land the review's fix-now items (diff-bug #5 #6 #9 #10 #11, prior-review #1 #2 #4, ripple #1 #2 #4-#8 #11) and file the follow-ups into row "Check embeds open at their page option".

## Decisions

## Review

Pass 1 (2026-10-20). Consistency gate: `cairn_validate.py` exit 0, all checks passed; no principle text changed, so `cairn_impact` skipped; generic profile adds no toolchain checks. AC evidence not yet recorded: the evidence run stopped at line 39 of 98 for the finding below.

spawned: diff-bug, blame-history, prior-review, ripple

- diff-bug #1: an `<iframe>` follows the server's Content-Type and Content-Disposition, so a page>1 native embed of a PDF sent as `application/octet-stream` or as an attachment may download instead of show — confirmed by a review probe (Chromium 155, Firefox 158 headless, Safari 27.0.1): with either answer the `<object>` showed `sample.pdf` in Firefox and Safari, and the `<iframe>` showed nothing and each browser saved the file; in Chromium both forms stayed blank and the file was saved. This is the reader-visible difference D-007 names as evidence against the `<iframe>` — open: the approach is the user's decision.
- diff-bug #2: no test page has an `<iframe>` native embed on RevealJS slides — follow-up, row "Check embeds open at their page option".
- diff-bug #3: the missing-PDF difference rests on one Chromium probe, no check — follow-up, same row.
- diff-bug #4: native_check's Firefox `pdfjs.viewOnLoad` pref hides Firefox's stored-page reopen — reject: false as an extension defect; it is Firefox's own viewer behavior, and the pref is M020's planned design.
- diff-bug #5: native_check's `shotOf(NATIVE, i)` indexes elements while `st.native[i]` indexes placeholders, so a placeholder with no element shifts later screenshots — fix now.
- diff-bug #6: without `--alone`, a hand-written `data:` embed loses `data-src` and fails the address check falsely — fix now.
- diff-bug #7: `#page=N` is appended to an href that may already hold a fragment (pre-existing) — follow-up, row "Check embeds open at their page option".
- diff-bug #8: native_check mirrors the viewer's page parsing — reject: false as a defect; it reads the shortcode's `data-page`, and the values parse as the viewer does.
- diff-bug #9: the `<iframe>` has no `allowfullscreen` — fix now.
- diff-bug #10: the box check skips `600px`-style sizes — fix now (with prior-review #4).
- diff-bug #11: stale `<object>`-only lines in CLAUDE.md, README, ROADMAP row text, ios_check header and messages — fix now (with ripple #1-#2, #4-#8, #11).
- diff-bug #12: render_check enforces no element on desktop — reject: planned change; native_check's page_test lines enforce it.
- blame-history #1: missing non-inlined PDF loses the visible download link for page>1 embeds — reject: planned change, recorded in D-007 and DESIGN Known issues.
- blame-history #2: the `<iframe>` replaces a working `<object>` in Chromium and Firefox too — reject: planned change (D-007 "in every browser").
- blame-history #3: a site that forbids framing shows a blank frame — follow-up, already in row "Check embeds open at their page option".
- blame-history #4: `--same-pages` removed — reject: planned change.
- blame-history #5: `<iframe>` real screen-reader name unverified — follow-up, already in CLAUDE.md "Still unverified".
- blame-history #6: pdfjsAddress comment accurate, code unaffected — reject: false as a defect.
- prior-review #1: ios_check passes a native embed with no element — fix now.
- prior-review #2: viewer header "renderer=native -> always <object>" — fix now (same as ripple #1).
- prior-review #3: Safari CORS read after an `<iframe>` load is unchecked — follow-up, row "Check embeds open at their page option".
- prior-review #4: native_check's expected box is read from the `<iframe>`'s own attributes — fix now: read the embed's `data-width` and `data-height`.
- prior-review #5: render_check's native name plant takes the document's first native embed — reject: pre-existing line, and D-006 drops this class of plant-target gap.
- ripple #1, #2, #4, #5, #6, #7, #8, #11: viewer header, CLAUDE.md :427 :104 :267 :437 :495, ROADMAP and DESIGN "1.2.6", ROADMAP row "Check native save names and slide embeds" text — fix now.
- ripple #3: the absorbed candidate row is still listed — reject: planned change; step 9 hygiene graduates it.
- ripple #9, #10: viewer :179 and DESIGN :199 describe Safari's refusal after an `<object>` load — reject: dated observations of `<object>`, and the lines beside them name the `<iframe>` case.
