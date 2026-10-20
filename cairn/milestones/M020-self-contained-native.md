<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section.
     Per-section owners are tagged below. The one size check that can fail is
     cairn_validate's <150 over the plan-owned body. -->
# M020: Self-contained native display check

- **Status:** review
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** IP1
- **Resolves:** —
- **Surface tier:** user-facing — README and DESIGN claims about what readers of a self-contained page see change
- **Branch/PR:** m020-self-contained-native

## Goal

A check shows that each native embed of a self-contained page shows its in-page PDF, at the page its `page` option names, in Chromium, Firefox, and desktop Safari, as the same browser shows the PDF file.

## Scope

**In:** a `renderer=native page=2` embed on `selfcontained_test.qmd`; a new
`tests/native_check.mjs` that compares each native embed's screenshot with a
screenshot of an `<object>` of the PDF file at the same page and size, in
Chromium and Firefox (puppeteer-core) and desktop Safari (safaridriver); its
run lines in CLAUDE.md; the README, DESIGN, and CLAUDE.md text these runs make
true or stale.

**Out:**
- The file name that a native viewer's own save button uses for an in-page
  copy, and self-contained RevealJS slides' native embeds in desktop Safari
  and Firefox → the candidate row "Self-contained native checks", narrowed to
  them at this milestone's review.
- Making desktop Safari's native viewer open at the `page` option's page →
  the new candidate row "Make Safari native embeds honor page".
- Firefox runs of the other pages and checks → the new candidate row "Run
  the render checks in Firefox".
- Any change to `embedpdf-viewer.js` or `embedpdf.lua`: a defect found here
  goes back to plan, not into this milestone.

## Acceptance criteria

- [x] AC1: In Chromium 155 and Firefox 158 (both headless) and desktop Safari
      27.0.1, with `docs/selfcontained_test.html` opened as a copy alone over
      `file://` and over HTTP, each of its 3 native embeds shows the in-page
      copy of `sample.pdf` (its `<object>` address is a `blob:` URL) as the
      same browser shows an `<object>` of `docs/sample.pdf`'s address on the
      check's HTTP server with the same `#page` fragment and size, within the
      screenshot tolerance that `tests/native_check.mjs`'s header states.
      Evidence: the six `native_check.mjs` lines for `selfcontained_test.html`
      in CLAUDE.md (three browsers, each with `--alone file` and `--alone
      http`; the two Safari lines with `--same-pages`) each exit 0 with
      `--expect-native 3`.
- [x] AC2: In Chromium 155 and Firefox 158 the `page=2` native embed opens at
      page 2: on their four AC1 lines the page-1 and page-2 references differ,
      and the embed matches the page-2 reference. In desktop Safari 27.0.1 the
      `page=2` embed and the page-2 reference both show page 1: on the two
      Safari lines the page-1 and page-2 references match, and the embed
      matches them.
- [x] AC3: The added embed leaves the page working where the self-contained
      checks already run: each `selfcontained_test.html` line of
      `render_check.mjs` and `ios_check.mjs` in CLAUDE.md exits 0 with its
      counts updated (desktop devices: 3 native, 1 PDF.js; `iphone` and the
      iOS simulators: 2 native, 2 PDF.js), as do the `--device mac-safari`,
      `windows-touch`, and `ipad` runs CLAUDE.md asks for, and each
      render_check line with `--alone file` also with `--alone http`.
- [x] AC4: README's self-contained item and a DESIGN.md Known issues entry
      state, dated, what the AC1 and AC2 runs showed: the native embeds of a
      self-contained HTML page (not RevealJS slides) showing `sample.pdf` in
      Chromium 155 and Firefox 158 (headless) and desktop Safari 27.0.1, over a
      local file and HTTP, with the save button's file name not checked; and
      desktop Safari 27.0.1 opening the `page=2` native embed of `sample.pdf`
      at page 1, for the PDF file and the in-page copy. README's `page` option
      row names that Safari case.

## Coverage

- AC1 → T2, T3, T4
- AC2 → T2, T4
- AC3 → T1
- AC4 → T5

## Tasks

- [x] T1: Add `{{< pdf sample.pdf renderer=native page=2 >}}` under its own
      heading at the end of `selfcontained_test.qmd`, run `quarto render`, and
      update the native, name, and link counts of every
      `selfcontained_test.html` line in CLAUDE.md. Run each of those lines,
      with the `--device mac-safari`, `windows-touch`, and `ipad` variants
      CLAUDE.md asks for, and each `--alone file` line again with `--alone
      http`.
- [x] T2: Write `tests/native_check.mjs`: `--browser chromium|firefox|safari`
      (`CHROME_PATH`; `FIREFOX_PATH`, default
      `/Applications/Firefox.app/Contents/MacOS/firefox`), `--page`, `--alone
      file|http`, `--expect-native <n>`, `--reference <PDF under docs/>`,
      `--same-pages`, `--plant`. Chromium and Firefox headless through puppeteer-core,
      Safari through safaridriver as `safari_check.mjs` does, the page served
      by `tests/serve_docs.mjs`. For each native embed: fail unless its
      `<object>` address is a `blob:` URL; wait until two screenshots in a row
      match, with a time limit; load a reference page (a `serve_docs` route)
      holding an `<object>` of the reference PDF's address with the embed's
      `#page` fragment and size; compare the two screenshots in a browser
      canvas (no new npm package) within a tolerance that probes in all three
      browsers settle and the header states; fail on a mismatch or on a
      screenshot with no ink. Fail unless the page-1 and page-2 references
      differ, or with `--same-pages` unless they match. Exit 0 on a pass, 1 on
      a failed check, 2 on a bad argument or a browser that cannot start.
- [x] T3: Plants, each documented in the header, with `--plant-at <k>` naming
      the native embed (default 1): `otherpdf` (a `blob:` of
      `files/large.pdf`, an inked PDF that is not `sample.pdf`), `broken` (a
      `blob:` of `files/broken.pdf`, so the viewer shows its own error),
      `blank` (an empty `blob:`), `fileaddr` (an HTTP address, not a `blob:`),
      and `nopage` (the `page=2` embed loses its `#page` fragment). The script
      reads the planted bytes itself, so `--alone file` needs no file beside
      the page. Run every plant in every browser, and in Chromium at each of
      `--plant-at 1`, `2`, and `3`. Each run must exit 1 and name the planted
      embed; `otherpdf` and `broken` must fail as a mismatch, not as no ink.
      `nopage` is expected to pass in Safari (it ignores the fragment);
      record that.
- [x] T4: Add the six `native_check.mjs` lines and a short paragraph to
      CLAUDE.md "Verify before finishing": what the check compares,
      `--same-pages`, the plants, and that Firefox started from Claude Code
      first needs its folder made by one `open -g -a Firefox` launch. Run the
      six lines.
- [x] T5: Update README's self-contained item and `page` option row,
      DESIGN.md Known issues, and CLAUDE.md "Still unverified" from the T1 and
      T4 runs (derived from their output, dated).

## Work log

- 2026-10-19: created by /milestone-plan.
- 2026-10-19: tier check: not run — work named at the question set.
- 2026-10-19: question set: which candidate to plan — "Self-contained native checks".
- 2026-10-19: question set: what the work may change on this Mac — install Firefox (Homebrew) and change Safari settings inside the two embedpdf test simulators.
- 2026-10-19: collision check: absorbs the candidate row "Self-contained native checks" in part (display in desktop Safari and Firefox, `#page=` on a `blob:` URL); its save-button name and the slides part stay in the row. No milestone, archive entry, or D-entry overlaps; D-002 and D-003 cover self-contained pages but not native display. No open GitHub issues or PRs.
- 2026-10-19: plan probes (Chromium 155 headless, Firefox 158 headless, desktop Safari 27.0.1 via safaridriver): each browser's element screenshot showed `sample.pdf` in the native `<object>` with a `blob:` address, over HTTP and `file://`; `#page=2` opened page 2 in Chromium and Firefox, and page 1 in Safari for the `blob:` and the file address alike.
- 2026-10-19: Firefox installed with Homebrew (cask 158.0) at the user's permission. Started from Claude Code it failed with "Could not find profile folder" (mkdir of `~/Library/Application Support/Firefox` got "Operation not permitted"); one `open -g -n -a Firefox --args -headless -screenshot …` launch made the folder, and puppeteer-core then started it. Not recorded as a D-entry: Firefox is a check prerequisite on this Mac, like Chromium, not a project dependency.
- 2026-10-19: plan gate chose a screenshot comparison with an `<object>` of the PDF file at the same page and size over an ink-only test, because ink alone passes a viewer error page or the wrong page; falsified by a browser whose `blob:` and file-address viewers differ in chrome (toolbar, title) beyond a usable tolerance.
- 2026-10-19: plan gate chose a new `tests/native_check.mjs` over extending `render_check.mjs` and `safari_check.mjs`, because render_check's accessibility, download, and CPU-throttle steps use Chromium's CDP, which Firefox does not offer, and one script covers the three browsers' screenshots alike; falsified by most of native_check's code duplicating render_check's.
- 2026-10-19: criteria audit (full mode, fresh Opus reader) returned 8 findings, all fixed: AC1 now bounds its match by the header's tolerance, names the reference as `docs/sample.pdf` on the check's HTTP server, drops the check-behavior sentence, and names `--same-pages` on the Safari lines; T3's `otherpdf` uses the inked `files/large.pdf` and must fail as a mismatch, a `broken` plant covers a viewer error page, and `--plant-at` reaches every native embed; AC2's Safari clause states what the page shows, not how the check exits; AC3 names the device variants and the new counts; AC4 narrows to a self-contained HTML page with `sample.pdf`, says headless, and keeps the save-button name unchecked.
- 2026-10-19: T1: added the `renderer=native page=2` embed to `selfcontained_test.qmd`, rendered; CLAUDE.md self-contained lines now expect 3 native/1 PDF.js (desktop), 2 native/2 PDF.js (iphone, iOS), and 5 links (the new embed's fallback link). All 10 render_check runs (file and http × desktop, mac-safari, windows-touch, iphone, ipad) and both ios_check runs exit 0.
- 2026-10-19: the simple-english lint hook flags 38 hits across all of CLAUDE.md; this milestone's CLAUDE.md edits change command lines and add one paragraph, so the older prose is left as written.
- 2026-10-19: T2: wrote `tests/native_check.mjs`; the PNG reader and comparison live in a new `tests/png_diff.mjs`, tested in `tests/helpers_test.mjs` (every filter type, RGB and RGBA, split IDAT, refused formats, shift and block cases; 154 passed, 0 failed). Choices: the reference `<object>` copies the embed's size and fractional position; screenshots compare by 4 x 4 block averages at the best shift of up to 2 pixels, because desktop Safari drew the same page 1 pixel apart and Firefox at scale 1 drew text edges a fraction of a pixel apart (2-4% of single pixels); the expected fragment comes from the embed's `data-page`, not its address, so a lost fragment fails; Firefox runs with `pdfjs.viewOnLoad` 1, because by default it reopened a PDF at the page last shown; `NATIVE_CHECK_SHOTS` saves screenshots.
- 2026-10-19: minor amendment to T1: the `page=2` embed got `width=600 height=400`; at the default 300 x 150 Firefox's toolbar and outline panel filled most of the box, and its page-1 and page-2 references differed in only 3% of pixels. helpers_test's count of the page's inlined embeds went from 3 to 4.
- 2026-10-19: T3: every plant run in Chromium 155, Firefox 158, and desktop Safari 27.0.1 (`--alone http`), and in Chromium at `--plant-at 1`, `2`, `3` (`--alone file`): each exits 1 naming the planted embed; otherpdf and broken fail as a mismatch in every browser; nopage at embeds 1 and 2 exits 2 (no page option there). Deviation: nopage fails in desktop Safari too, on the address's missing fragment, since the expected fragment now comes from `data-page`.
- 2026-10-19: T4: added the six `native_check.mjs` lines and their paragraph to CLAUDE.md, and `tests/png_diff.mjs` to the helper-change rule in CLAUDE.md and PROFILE.md's verify slot. All six exit 0 (Chromium 155.0.8059.39, Firefox 158.0, Safari 27.0.1): embed vs reference at most 0.0035 of blocks (Firefox page-2 embed); page-1 vs page-2 references 0.1371 (Chromium), 0.0530 (Firefox), 0.0000 (Safari). The T1 lines (10 render_check, 2 ios_check) exit 0 again with the resized page-2 embed.
- 2026-10-19: T5: README's `page` row names the desktop Safari 27.0.1 case; README's self-contained item states the 2026-10-19 native checks (Chromium 155 and Firefox 158 headless, desktop Safari 27.0.1, local file and HTTP, `sample.pdf`, not RevealJS slides, save-button name not checked); DESIGN.md Known issues gains one entry for both facts; CLAUDE.md "Still unverified" gains the headless, slides, and save-name gaps. README and CLAUDE.md add no simple-english lint hits beyond the older ones, except the quoted Firefox error ("Could not find profile folder").
- 2026-10-19: T3 figures (share of blocks, `--alone http`, from the plant runs after the `data-page` change): otherpdf 0.0676 Chromium, 0.4291 Firefox, 0.0863 Safari; broken 0.9970 Chromium, 0.4621 Firefox, 0.0397 Safari (and no ink); blank 0.9970 Chromium, 0.4354 Firefox, 0.0397 Safari (and no ink); nopage vs the page-2 reference 0.1371 Chromium, 0.0567 Firefox; fileaddr fails on the address in all three.
- 2026-10-19: claim audit: 34 claims read, 4 corrected — tests/native_check.mjs (plant figures now in the work log above; the Firefox folder fix names the recorded `open -g -n -a Firefox --args -headless -screenshot` launch, not an untried plain `open -g -a Firefox`), tests/png_diff.mjs (diffShare's second null case, too small for a block, documented and reported as such), CLAUDE.md (same Firefox launch wording; "Still unverified" slides gap is every browser), cairn/ROADMAP.md (Firefox row's launch wording, corrected M020). Each correction re-read by the agent against the same sources; no second pass.
- 2026-10-19: implement done; status review.
- 2026-10-19: review checkpoint: fix-now work from three reviewer lenses (native_check setup errors exit 2 and close the browser, per-embed isolation of size/decode/reference errors, a 60 s limit on each safaridriver call; PROFILE verify slot names native_check; DESIGN slides gap is every browser) committed with one Chromium file and one Safari http rerun passing; the diff-bug lens has not reported yet.

## Review

- AC1 evidence (2026-10-19, fresh runs on branch head 04fcbec): the six CLAUDE.md `native_check.mjs` lines for `selfcontained_test.html` each exit 0 with `--expect-native 3` (Chromium 155.0.8059.39 and Firefox 158.0 headless, Safari 27.0.1; `--alone file` and `--alone http`; Safari with `--same-pages`). Every native embed's address is `blob:`, and each matches its reference of `docs/sample.pdf` on the check's server: at most 0.0035 of blocks differ (Firefox page-2 embed), tolerance 0.01. Discrimination: `--plant otherpdf` exits 1 as a mismatch in each browser (0.0676 Chromium, 0.4291 Firefox, 0.0863 Safari).
- AC2 evidence (same runs): Chromium and Firefox lines report the page-1 and page-2 references different (0.1371 and 0.0530 of blocks, above 0.01) and the `page=2` embed matching the page-2 reference (0.0000 and 0.0035). Both Safari lines report the page-1 and page-2 references matching (0.0000) and the `page=2` embed matching them (0.0000), so it opens at page 1 for the file address and the in-page copy. Discrimination: `--plant nopage` exits 1 in Chromium and Firefox, failing both the fragment check and the page-2 match.
- AC3 evidence (2026-10-19, fresh runs): every `selfcontained_test.html` render_check line exits 0 with the updated counts, at `--alone file` and `--alone http`: default and `--device mac-safari` and `windows-touch` with 3 native, 1 PDF.js, 5 links; `--device iphone` and `ipad` with 2 native, 2 PDF.js, 5 links (10 runs). Both ios_check lines (embedpdf iPhone, embedpdf iPad; `--alone yes --expect-embeds 2 --expect-native 2 --expect-links 5`) exit 0.
- AC4 evidence (read 2026-10-19): README.md:86 states, dated 2026-10-19, that native embeds of `sample.pdf` on a self-contained HTML page were checked in Chromium 155 and Firefox 158 (headless) and desktop Safari 27.0.1, as a local file and over HTTP, not RevealJS slides, each showing the PDF as the browser shows the file; `page=2` at page 2 in Chromium and Firefox and at page 1 in Safari, as for the file; save-button name not checked. README.md:66's `page` row names the Safari 27.0.1 page-1 case. cairn/DESIGN.md Known issues holds one entry, observed 2026-10-19, with both facts (its slides clause corrected to "in any browser" in this review). Matches the AC1 and AC2 runs above.

- Consistency gate (2026-10-19): `cairn_validate.py` exit 0, all checks passed (coverage complete PASS). No DESIGN principle changed (IP1 is worked under), so `cairn_impact` was skipped. The generic profile's consistency-gate slot names no toolchain checks.
- spawned: diff-bug, blame-history, prior-review, ripple
- diff-bug #1: a reference screenshot caught at the empty viewer (two equal frames 500 ms apart) could match a broken embed in Chromium or Firefox, a false pass — fix now: each reference must differ from a control (`files/broken.pdf` served as a PDF) by more than the tolerance, screenshots must stay the same for 1.5 s, and a new `refcontrol` plant fails in all three browsers, fixed 46e3c1a.
- diff-bug #2: at the default 300 x 150 in Safari most blocks are white, so a defect under 1% of blocks passes (plants at 0.0397) — follow-up: candidate row "Weigh native check by inked blocks".
- diff-bug #3: `div.embedpdf-native object` also matches an `<object>` nested in fallback content, so lists could go out of step — fix now: `div.embedpdf-native > object` everywhere, fixed 46e3c1a.
- diff-bug #4: a throw after launch exited 1, not 2, and safaridriver calls had no time limit — fix now, fixed ad81e0d.
- diff-bug #5: the `--same-pages` argument error dropped real failures (exit 2 with no report) — fix now: it is a failure line when other failures exist, fixed 46e3c1a.
- diff-bug #6: Safari may still be white for two frames, a flaky "no ink" — fix now (the 1.5 s settle span of #1), fixed 46e3c1a.
- diff-bug #7: Ctrl-C left the temp dir, safaridriver, and its session — fix now: SIGINT and SIGTERM close the browser and servers, then exit 130, fixed 46e3c1a.
- diff-bug #8: reference screenshot names left out the position and a missing `NATIVE_CHECK_SHOTS` folder threw — fix now: names carry size and position, the folder is made, fixed 46e3c1a.
- diff-bug #9: no test of diffShare's too-small null — fix now: two helper tests, fixed 46e3c1a.
- diff-bug #10: a truncated IDAT decoded as black pixels — fix now: decodePng throws when the data is short; one helper test (158 passed, 0 failed), fixed 46e3c1a.
- diff-bug #11: an unwrapped header line, `var version`, `let exitCode` — reject (style).
- prior-review #1: browser setup after launch was unguarded (exit 1, browser left running) — fix now, fixed ad81e0d.
- prior-review #2: size, decode, and page-1 reference errors ended the loop for later embeds — fix now, fixed ad81e0d.
- prior-review #3: the native_check lines sit outside the viewer-change protocol — reject (false: they are under the "After any change to `embedpdf-viewer.js`" heading, which runs until the check-helper heading); PROFILE's list now names them (ripple #2).
- prior-review #4: no time limit on WebDriver calls — fix now, fixed ad81e0d.
- ripple #1: ROADMAP row "Self-contained native checks" still says display and `#page=` are unchecked — fix now at step 9 hygiene, which narrows the row to the save-button name and slides per the Scope's Out item.
- ripple #2: PROFILE's verify slot did not name `native_check.mjs` — fix now, fixed ad81e0d.
- ripple #3: DESIGN calls a candidate entry a "ROADMAP row" — reject (false: tracking rules name candidate entries rows).
- blame-history #1, #2, #3, #5, #7: counts, earlier checks, D-006 fit, the DESIGN citation, the helper list — reject (false: each reports no conflict).
- blame-history #4: the README `page` row states a known Safari failure beside the option — reject (planned change, AC4).
- blame-history #6: run-on helpers_test header — reject (style; the sentence keeps its earlier shape).
- also fixed in review: DESIGN Known issues slides clause said "desktop Safari and Firefox"; no browser checked slides — now "in any browser" (ad81e0d).
- Reruns after the fixes (2026-10-20): the six native lines exit 0 (embeds at most 0.0035; page references 0.1371, 0.0530, 0.0000; each reference differs from its control by at least 0.0401); every plant exits 1 in every browser, `refcontrol` on "matches the control".
