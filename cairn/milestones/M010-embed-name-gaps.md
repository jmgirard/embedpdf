# M010: Embed name gaps

- **Status:** in-progress
- **Priority:** high
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** GP1, GP3
- **Resolves:** —
- **Surface tier:** user-facing — screen-reader names that readers of authors' pages hear
- **Branch/PR:** m010-embed-name-gaps

## Goal

A screen reader tells each PDF.js embed apart by a name that never comes from a script that takes the PDF by a query value, a host, or inlined data, and hears the toolbar page indicator as a page position.

## Scope

**In:** a new file-name rule in `embedpdf-viewer.js` (query values, hosts, `data:` and `blob:` addresses), numbering of PDF.js embeds that share a name, "Page i of n" text for the toolbar page indicator, the checks for all three in `tests/render_check.mjs`, `tests/ios_check.mjs`, and a new `tests/name_rule_test.mjs`, a new test page `name_edge_test.qmd`, a check of Safari's names for the toolbar controls through safaridriver, version 1.2.2, and the README, DESIGN.md, and CLAUDE.md text for these.

**Out:** a shortcode option that sets an embed's name (not asked for; no row). A name for a native `<object>` embed → candidate row "Native embed name". The PDF's own Title as a name (the user chose "PDF"; no row). The `download` file name of an inlined PDF with no link stays "document.pdf" (a download needs a file name). A real VoiceOver or TalkBack reading → CLAUDE.md "Still unverified".

## Acceptance criteria

- [x] AC1: The viewer takes a PDF.js embed's file name from the PDF's address, after it drops the address's `#fragment` (the query is the text between the first `?` and the `#`). The name is the last path segment, percent-decoded where it decodes, when the decoded segment ends in `.pdf` in any letter case; else the last `/` segment of the first query value, decoded as `URLSearchParams` decodes it, that ends in `.pdf`; else the last non-empty path segment when the address has no query; else no name. An address with a `data:` or `blob:` scheme, in any letter case, gives no name. When `data-src` is a `data:` address, the address is the fallback download link's `href`. The naming function, exported from the viewer, returns the expected result for every row of the table in the new `tests/name_rule_test.mjs`, run in Chromium. The table holds at least these rows (address → name): `sample.pdf` → `sample.pdf`; `files/sample%20copy.pdf` → `sample copy.pdf`; `files/100%25.pdf` → `100%.pdf`; `files/100%.pdf` → `100%.pdf`; `SAMPLE.PDF#page=2` → `SAMPLE.PDF`; `a.pdf#x?f=b.pdf` → `a.pdf`; `download.php?file=a.pdf` → `a.pdf`; `get?file=docs%2Fa.pdf&x=1` → `a.pdf`; `files/report` → `report`; `files/report?id=5` → none; `https://example.com` → none; `https://example.com/` → none; `https://example.com:8080` → none; `//example.com` → none; `data:application/pdf;base64,JVBERi0x` → none; `blob:https://example.com/1234` → none.
- [x] AC2: A PDF.js embed with a file name is named "PDF: <file name>", and one with none is named "PDF". When two or more embeds that the viewer chose at hydrate to render with PDF.js (from `data-renderer` and the device, whether or not their PDF loads) share a name, each is named "<that name> (k of n)", with k counting them in document order across all slides; a name that no other such embed shares carries no number, and an embed whose PDF fails to load gets no name. render_check `--expect-name` passes with these names on `example.html` (desktop: "PDF: sample.pdf (1 of 2)" and "(2 of 2)"; `--device iphone`: "(1 of 10)" to "(10 of 10)"), on `name_test.html` (both `sample copy.pdf` embeds numbered), and on `revealjs_test.html` with `--device iphone` ("PDF: dummy2.pdf" and "PDF: dummy.pdf", no number); ios_check `--expect-name` passes on `example.html` in the iOS 27.0 iPhone and iPad simulators with the `--device iphone` names.
- [x] AC3: On the new page `name_edge_test.html` (not self-contained), render_check `--expect-name` and ios_check `--expect-name` (iOS 27.0 iPhone simulator) pass with an embed at `files/get?file=sample.pdf` (`files/get` a copy of `sample.pdf`, `renderer=pdfjs`) named "PDF: sample.pdf" and a hand-written embed whose `data-src` is a `data:` address of `sample.pdf`, with `data-renderer="pdfjs"` and no download link, named "PDF"; each embed shows every page inked.
- [x] AC4: The toolbar's page indicator still shows "i / n" and gives screen readers the text "Page i of n" for the same page. In Chromium's accessibility tree, within each toolbar's subtree, render_check reads "Page 1 of 2" and no "1 / 2" text on `example.html` (desktop and `--device iphone`), and reads "Page 2 of 2" after it scrolls one embed's pages to page 2; ios_check reads the same text in the page DOM in the iOS 27.0 iPhone and iPad simulators.
- [x] AC5: In desktop Safari, through safaridriver's "Get Computed Label", each toolbar control of each PDF.js embed on `example.html` has its tooltip as its name ("Zoom out", "Zoom in", "Download PDF") and the indicator reads "Page i of n". The same read is tried in Safari in the iOS 27.0 iPhone simulator (`safari:useSimulator`) and with `computedName` in a page script there; for each probe that cannot read a name, README, CLAUDE.md "Still unverified", and a ROADMAP candidate row name the probe and its result.
- [x] AC6: `version:` is 1.2.2 in `_extension.yml` and in `embedpdf.lua`; `quarto render` completes with no errors; CLAUDE.md "Verify before finishing" lists `node tests/name_rule_test.mjs`, the `name_edge_test.html` lines, and the Safari check, and every command it lists passes with its `--expect-name` values updated to the AC2 names; README and DESIGN.md Architecture replace the current "PDF: " plus `fileName()` text with the name rule, the numbering, and the indicator text, and CLAUDE.md "Still unverified" adds the indicator text to the real screen-reader line.

## Coverage

- AC1 → T1, T8
- AC2 → T2, T3
- AC3 → T4
- AC4 → T5, T8
- AC5 → T6, T8
- AC6 → T7, T8

## Tasks

- [x] T1: Replace `fileName()` (`embedpdf-viewer.js:375`) with the AC1 rule as an exported function; use it in `hydrate()` (`:403`, no "document.pdf" in the name, only in the `download` attribute) and `hydratePdfjs()` (`:160`). Write `tests/name_rule_test.mjs`: it serves the viewer, imports it in Chromium with puppeteer, and checks each AC1 row; `--plant` swaps one expected value so the run can be seen to fail.
- [x] T2: Number shared names: at load, before any hydrate, pick each placeholder's renderer and name in document order, count the PDF.js ones per name, and pass "(k of n)" into `hydratePdfjs()`. Keep the failed embed unnamed (`showFailure`).
- [x] T3: render_check and ios_check `--expect-name <base>` expect "<base> (k of n)" for embeds whose base name repeats among the given names, counted from the list given, never from the page; a value `-` stands for the bare "PDF". Add plant `nonumber` (drop the number) to both. Update the `--expect-name` values and notes in CLAUDE.md.
- [x] T4: Add `files/get` and `name_edge_test.qmd` (resources so Quarto copies `files/get`; a raw `div.embedpdf` with a `data:` `data-src` of `sample.pdf`); add its render_check (with `--expect-pages 2`) and ios_check (`--expect-embeds 2`) lines to CLAUDE.md.
- [x] T5: Indicator: a visually hidden "Page i of n" and the visible "i / n" `aria-hidden`, both updated by the scroll handler (`:317`). render_check reads the toolbar subtree and scrolls one embed's pages to page 2; ios_check reads the DOM. Add plant `rawindicator` (visible text not hidden) to both.
- [x] T6: Safari: the user runs `safaridriver --enable` once (a stop for the user's hands). Write `tests/safari_check.mjs` with raw WebDriver HTTP calls (no new npm dependency): desktop Safari on `example.html`, then the `safari:useSimulator` and page-script `computedName` probes; record each probe that fails in README, CLAUDE.md, and a candidate row.
- [x] T7: Bump to 1.2.2 in both places; update README (screen-reader paragraph), DESIGN.md Architecture, and CLAUDE.md; `quarto render`; run every CLAUDE.md verify command.
- [x] T8: Review return 1: README names both failed iOS Safari probes and their results (AC5); `fileName()` keeps the last segment after a doubled slash, with a table row (AC1); then each fix-now item of the Review section, pass 1; re-render and re-run every CLAUDE.md verify command.

## Work log

- 2026-10-19: created by /milestone-plan.
- 2026-10-19: tier check: milestone — viewer behavior changes in three areas plus a naming design choice.
- 2026-10-19: collision sweep: absorbs candidate row "Embed name gaps" in full; "Native embed name" and "Name plant slide target" stay separate rows; no D-entry or archive overlap (M005 and M008 shipped the name and its check); inbox sweep: 0 open issues, 0 open PRs.
- 2026-10-19: lessons applied: M002 (Quarto inlines `data-src`, not `<a href>`; slides need `Reveal.slide()`), M004 (`interestingOnly: false`), M005 (`title`-only names), M008 (percent pages).
- 2026-10-19: question set: shared names — number them "(k of n)" (user); no name — plain "PDF" (user); Safari check — the user will run `safaridriver --enable` when asked (user).
- 2026-10-19: criteria audit (full mode, Opus reader) returned findings on all six criteria, all taken but one: decode order and fragment bounds stated; expected names written per table row, with `:8080` and `//host` rows; goal narrowed to scripts that take the PDF by a query value; counted set fixed to the hydrate-time PDF.js choice with failed embeds counted and unnamed; ios_check named in AC2; AC3 page and addresses named; AC4 scoped to the toolbar subtree with a scroll to page 2; AC5 probes named; AC6 lists the new CLAUDE.md lines. Instrument findings (list handling, plants `nonumber` and `rawindicator`) moved to T3 and T5. Not taken: running the AC1 table in Safari, narrowed instead to Chromium plus the page-level Safari names of AC2 and AC3.
- 2026-10-19: plan gate chose "(k of n)" numbering over a new shortcode name option because it adds no public option (GP3) and covers every repeat; falsified by authors asking for meaningful names that a number cannot give.
- 2026-10-19: plan gate chose plain "PDF" over the PDF's Title metadata because it is known before load, so numbering stays exact; falsified by real PDFs reached only by a host or inlined with no link, read by users who need the title.
- 2026-10-19: plan gate chose a hidden "Page i of n" with the visible "i / n" `aria-hidden` over `role="status"` (read aloud on every scroll) and over hiding the indicator (loses the position); falsified by a screen reader that skips the hidden text.
- 2026-10-19: plan gate chose an exported naming function with a Chromium table test over page-level checks alone because hosts and `blob:` addresses cannot be served by `serveDocs`; falsified by a name that differs between the table and a page.
- 2026-10-19: page groups keep "Page i of n" as their label: they sit inside the embed's named group, so the numbered embed name tells them apart.
- 2026-10-19: implement started on branch m010-embed-name-gaps; Google Chrome is not installed here, so every check runs with `CHROME_PATH=/Applications/Chromium.app/Contents/MacOS/Chromium` (Chromium 155.0.8059.39).
- 2026-10-19: T1 done: `fileName()` rewritten as an exported, string-only rule (no `URL` parsing, so a bare `%` stays); new `embedName(el)` gives "PDF: <file name>" or "PDF"; `name_rule_test.mjs` serves `_extensions/embedpdf` with `serveDocs` and passes 21 rows (16 AC1 rows plus 5 beside them), and `--plant` fails on the `download.php` row; name_test and selfcontained_test iPhone name checks still pass.
- 2026-10-19: T2 done: `embedNames()` names every placeholder before any hydrate, counting only those `usesPdfjs()` picks; a failed embed keeps no name (`showFailure` sets none).
- 2026-10-19: T3 done: new `tests/expect_names.mjs` (`expectedNames`, 6 new rows in helpers_test, 91 passed) builds the numbered names from the values given; a single name repeats for `--expect-pdfjs` (now required with one name, exit 2 otherwise) or ios_check's `--expect-embeds`; ios_check takes a `|` list too. CLAUDE.md `--expect-name` values stay base names, and the scripts number them, so no verify line changed. Plant `nonumber` fails name_test in both scripts and finds nothing to plant in on revealjs_test iPhone (exit 2). Chromium: example desktop and iphone, name_test, revealjs iphone pass. The simple-english hook flags 37 pre-existing hits in CLAUDE.md, left alone.
- 2026-10-19: substantive amendment: AC3's hand-written embed inlines `sample.pdf`, not `dummy.pdf`, because ios_check's one `--expect-pages` count cannot cover a 1-page and a 2-page embed; what readers get is unchanged.
- 2026-10-19: re-audit: AC3 (full) — clean; one optional finding (render_check checks the page count only with `--expect-pages`) answered in T4's command line, wording unchanged.
- 2026-10-19: T4 done: `files/get` (copy of sample.pdf) and `files/inlined-sample.md` (raw HTML embed, base64 of sample.pdf, made by a shell command since it is a 28 KB generated line) pulled in by `{{< include >}}`; render_check desktop and iphone and ios_check iPhone and iPad pass with "sample.pdf|-", 2 pages, and page text. CLAUDE.md gains four lines, the page note, and the Key files entry; name_test.qmd's text now gives the numbered names.
- 2026-10-19: T5 done: the indicator holds a hidden `.embedpdf-pageinfo-text` "Page i of n" (CSS clip like `.embedpdf-text`) and an `aria-hidden` "i / n", both set by `showPage()`. render_check reads the toolbar's StaticText at the top of the pages, then scrolls the first embed whose page 1 can pass the frame's middle line to page 2 (report field `page2Checked`). On revealjs_test iPhone no embed can (both pages fit the slide, so the viewer rightly stays on page 1, null); on example desktop and iphone it is embed 1. Plants: `rawindicator` (both scripts) and `staleindicator` (render_check, a "Page 1" copy the scroll does not update) each fail; ios_check iPhone and iPad pass on example.html.
- 2026-10-19: T6 in progress: `tests/safari_check.mjs` written (targets mac, simulator, page-script; raw WebDriver HTTP calls to safaridriver, no new dependency). Probe page-script on the iOS 27.0 iPhone simulator: `computedName` and `computedRole` are not defined on `Element.prototype`, so a page script cannot read a name (exit 1). safaridriver 27.0.1 refuses a session until "Allow remote automation" is on; stopped for the user to run `safaridriver --enable` (question-set grant).
- 2026-10-19: user override: `safaridriver --enable` rejected the password twice, so the user turned on "Allow remote automation" in Safari Settings instead.
- 2026-10-19: T6 done: `--target mac` on example.html passes in desktop Safari 27.0.1 ("PDF: sample.pdf (1 of 2)"/"(2 of 2)", controls named by title, indicator "Page 1 of 2" then "Page 2 of 2"). Get Computed Label gives a plain span "", so the check sets role heading on the indicator for the read and removes it. Plants `rawindicator` ("Page 1 of 2 1 / 2") and `nonumber` fail. `--target simulator` fails with "Could not find any session hosts that match the requested capabilities" (UDID, no UDID, and deviceType tried; the simulators' Remote Automation setting not changed by this run). Recorded in CLAUDE.md "Still unverified" and candidate row "Safari names on iOS"; README follows in T7.
- 2026-10-19: T7 docs: version 1.2.2 in `_extension.yml` and `embedpdf.lua`; README screen-reader bullet, DESIGN.md Architecture (corrected M010), and the name_test and percent_test page text give the name rule, the numbering, and the indicator. The simple-english hook's README count is 10 before and after the edit (none added).
- 2026-10-19: claim audit: 76 claims read, 6 corrected — README.md (Safari scope of the check; a query with no `.pdf` value gives "PDF"), CLAUDE.md (what each browser check covers; four scripts take `--plant`), tests/safari_check.mjs (exit 2 for a plant with nothing to plant in, a server that cannot start, and a missing safaridriver, now true in code), tests/render_check.mjs (staleindicator fails only on the embed scrolled to page 2). The same reader re-read all six as correct.
- 2026-10-19: T7 done: a scratchpad runner ran every `node tests/` and `pandoc lua` line in CLAUDE.md's fenced blocks plus the variants its notes name (`--alone http` for each `--alone file`, mac-safari and windows-touch for the desktop selfcontained, `--remote blocked`, and `--missing-pdfs` lines, ipad for the selfcontained iphone lines): 62 commands, 0 failed (viewer at 799db1e; the later script edits were the safari_check exit handling, rerun by hand with exit 0, and comments). Status set to review.
- 2026-10-19: review return 1: AC5 fails (README names neither failed iOS Safari probe nor its result) and AC1 fails for `https://example.com//a.pdf` (gives "" not "a.pdf"); the return also carries the fix-now findings listed in the Review section, pass 1.
- 2026-10-19: T8 added (minor amendment for review return 1); Coverage gains T8 on AC1, AC4, AC5, AC6.
- 2026-10-19: T8 fixes: `fileName()` strips the host once (rows `https://example.com//a.pdf` and `//example.com//a.pdf`; the first fails on the old viewer, 23 rows pass); `aria-label` falls back to "PDF"; `-webkit-user-select` on the indicator; render_check checks the shown "1 / n" and the 1px hidden box (plant `showindicator` fails) and plants `staleindicator` only in the embed scrolled to page 2 (nothing to plant in on revealjs iPhone, exit 2); ios_check fails a missing indicator (plant `noindicator` fails) and exits 2 on a non-integer `--expect-embeds`; safari_check reads page 2 only where page 1 moves past the middle line and removes the role in a finally. README names both iOS probes and their results; CLAUDE.md, DESIGN.md, the script headers, `serve_docs.mjs` header, and row "Safari names on iOS" corrected.
- 2026-10-19: claim audit: 44 claims read, 2 corrected — tests/render_check.mjs (`showindicator` now also removes the clip, so the text is visible as its header says; still fails), tests/serve_docs.mjs (header names helpers_test). The same reader re-read both as correct.
- 2026-10-19: T8 done: `quarto render` exit 0 (known `100%.pdf` warning); the full verify list, 62 commands, 0 failed (viewer at f552a30; the later commit changed only a plant not in the list and a header). Status set to review.
- 2026-10-19: amendment routed: AC1 — `fileName()` drops spaces around the address, which AC1's rule does not state (review pass 2, diff-bug #6).
- 2026-10-19: amendment routed: AC6 — "with its `--expect-name` values updated to the AC2 names" cannot hold: a value is a file name, and the scripts add "PDF: " and the numbers (review pass 2, blame-history #2).

## Decisions

## Review

Pass 1 (2026-10-19). Gate: `cairn_validate` all checks passed; the generic profile names no toolchain checks; no principle changed, so no `cairn_impact` run. `quarto render` exit 0 with only the known `files/100%.pdf` "Invalid URI" warning. No criterion ticked in this pass: two findings show AC1 and AC5 failing, so the milestone returns.

spawned: diff-bug, blame-history, prior-review, ripple

- diff-bug #1: README.md names neither failed iOS Safari probe nor its result, which AC5 requires — fix now (review return 1, AC5).
- diff-bug #2: `fileName("https://example.com//a.pdf")` gives "" because the scheme-relative strip runs after the host strip; AC1's rule gives "a.pdf" — fix now (review return 1, AC1).
- diff-bug #3: no check that `.embedpdf-pageinfo-text` stays visually hidden or that the shown text is "i / n" — fix now (render_check reads its box and the shown text).
- diff-bug #4: ios_check takes any page number in "Page i of n", so a scroll handler that never updates passes in Safari — follow-up, row "Embed name follow-ups".
- diff-bug #5: ios_check skips a missing indicator with no failure — fix now (fail unless `data-toolbar="false"`).
- diff-bug #6: `staleindicator` can be planted in an embed that is not the one scrolled to page 2 and then passes — fix now (nothing to plant in unless the scrolled embed is the first PDF.js embed).
- diff-bug #7: the page-2 read covers one embed per run — reject, planned change (AC4 names one embed).
- diff-bug #8: safari_check scrolls to page 2 with no check that page 1 moved above the middle line — fix now (same guard as render_check).
- diff-bug #9: ios_check throws on a non-integer `--expect-embeds` with `--expect-name` — fix now (exit 2).
- diff-bug #10: the hidden indicator text relies on an unprefixed `user-select: none`, which Safari may need as `-webkit-user-select` — fix now (add the prefix to `.embedpdf-pageinfo`).
- diff-bug #11: a failed embed keeps its number, so readers hear "(1 of 3)" and "(3 of 3)" — reject, planned change (AC2 counts failed embeds).
- diff-bug #12: `./` gives ".", `../` "..", `a%2Fb.pdf` "a/b.pdf", `about:blank` itself, and a trailing `%20` a trailing space — follow-up, row "Embed name follow-ups".
- diff-bug #13: DESIGN.md says `fileName()` reads the download link and takes the last path segment, where `embedName()` reads it and the code takes the last non-empty one — fix now.
- diff-bug #14: safari_check leaves `role="heading"` on if a read throws — fix now (try/finally).
- diff-bug #15: the slash and rawindicator checks rely on the tree leaving out `aria-hidden` text, with no direct assertion — reject, false: the `rawindicator` plant shows the check fails when the text is not hidden.
- blame-history #1: a self-contained link with a query and no `.pdf` value now downloads as "document.pdf", not its last segment — follow-up, row "Embed name follow-ups".
- blame-history #2: `aria-label` would be "undefined" if `hydratePdfjs` ran with no name — fix now (fall back to "PDF").
- blame-history #3: a failed embed still counts in n — reject, planned change (AC2).
- blame-history #4: an inlined PDF with no link is now "PDF", not "PDF: document.pdf" — reject, planned change (AC2).
- blame-history #5: render_check now needs `--expect-pdfjs` with one `--expect-name` — reject, planned change (T3).
- blame-history #6: the name check scrolls pages before the ink measure, so a canvas could be gone — reject, false: the viewer never removes a page canvas (only `showFailure` replaces children).
- blame-history #7: CLAUDE.md:77 and :232 give the name as "PDF: <file name>" only — fix now (with ripple #4).
- prior-review #1: `papers/` names the embed "papers", where M005's review expected "PDF" — reject, planned change (AC1's last non-empty segment); README's example, a bare site address, gives "PDF".
- prior-review #2: `embedNames()` runs outside a per-embed catch — reject, false: it does string and attribute reads only, with no throwing input.
- ripple #1: ROADMAP row "Embed name gaps" still describes the old state — reject, planned change: post-merge hygiene graduates the row.
- ripple #2: ROADMAP row "Safari names on iOS" says the iOS page DOM checks toolbar controls; ios_check does not — fix now.
- ripple #3: `tests/serve_docs.mjs` header names only render_check and ios_check as users — fix now.
- ripple #4: CLAUDE.md:77 gives the embed name with no numbering or "PDF" — fix now.
- ripple #5: render_check and ios_check `--expect-name` headers give the name with no numbering — fix now.
- ripple #6: render_check:289 comment "one name for every PDF.js embed" — fix now.
- ripple #7: CLAUDE.md:19 says `files/` holds copies of `sample.pdf`, but `files/inlined-sample.md` is a fixture page — fix now.
- ripple #8: README leaves the indicator out of the iOS DOM check's scope — fix now (with diff-bug #1).
- Pass-1 fix-now items fixed f552a30 (return 1, T8) and 2e1dea9 (claim-audit corrections): diff-bug #1, #2, #3, #5, #6, #8, #9, #10, #13, #14; blame-history #2, #7; ripple #2–#8.

Pass 2 (2026-10-19), on e1b704c. Chromium 155.0.8059.39 via `CHROME_PATH`; iOS 27.0 simulators "embedpdf iPhone" and "embedpdf iPad"; desktop Safari 27.0.1.

- AC1 evidence: `node tests/name_rule_test.mjs` → "23 passed, 0 failed" (the 16 AC1 rows with their written names, plus 7 more); `--plant` exits 1 on the `download.php` row; the `https://example.com//a.pdf` row fails on the pre-fix viewer (22 passed, 1 failed).
- AC2 evidence: render_check `--expect-name` exit 0 on example.html desktop (`--expect-pdfjs 2`, "PDF: sample.pdf (1 of 2)"/"(2 of 2)") and `--device iphone` (`--expect-pdfjs 10`, "(1 of 10)"…"(10 of 10)"), name_test.html desktop and iphone (two numbered "sample copy.pdf"), revealjs_test.html `--device iphone` "dummy2.pdf|dummy.pdf" (no number); ios_check `--expect-name sample.pdf` (10 embeds) exit 0 on the iPhone and iPad simulators; plant `nonumber` fails in both scripts (implement log).
- AC3 evidence: name_edge_test.html render_check desktop and `--device iphone` with `--expect-pages 2 --expect-name "sample.pdf|-"` and page text, exit 0; ios_check iPhone (and iPad) `--expect-embeds 2 --expect-name "sample.pdf|-"` with page text, exit 0 (t8 verify run, 62/62).
- AC4 evidence: render_check example.html desktop and `--device iphone` exit 0 with `page2Checked` "PDF.js embed 1" (tree "Page 1 of 2", no "1 / 2" text, shown "1 / 2" in view, hidden box 1px, then "Page 2 of 2"); plants `rawindicator`, `staleindicator`, `showindicator` fail; ios_check iPhone and iPad on example.html exit 0 with the DOM indicator check, plants `rawindicator` and `noindicator` fail.
- AC5 evidence: `safari_check.mjs --target mac --expect-pdfjs 2 --expect-name sample.pdf` exit 0 (names "(1 of 2)"/"(2 of 2)", controls "Zoom out"/"Zoom in"/"Download PDF" equal to titles, indicator "Page 1 of 2" then "Page 2 of 2"); plants `rawindicator` and `nonumber` exit 1. `--target simulator` failed ("Could not find any session hosts that match the requested capabilities") and `--target page-script` found no `computedName`; README.md, CLAUDE.md "Still unverified", and row "Safari names on iOS" each name both probes and results (grep: 1 hit each per file).
- AC6 evidence: `version: 1.2.2` (`_extension.yml:3`) and `VERSION = "1.2.2"` (`embedpdf.lua:22`); `quarto render` exit 0, no error lines, no file changed; CLAUDE.md lists `node tests/name_rule_test.mjs` (:63), the four name_edge_test lines (:55, :56, :61, :62), and the Safari check (:64); the full CLAUDE.md verify list with its variants, 62 commands, 0 failed (t8 run on f552a30); README gives the rule, numbering, and "Page 1 of 2"; DESIGN.md Architecture gives the rule, `embedNames()` numbering, and the indicator (:140-148); CLAUDE.md "Still unverified" names the indicator (:235).

spawned: diff-bug, blame-history, prior-review, ripple

- diff-bug #1: the page-2 read is optional, so example.html passes with `page2Checked` null if page 1 cannot scroll past the middle line — fix now (render_check and safari_check fail when no embed could be read at page 2 on a page with no slides).
- diff-bug #2: README "If the address has a query and no query value ends in `.pdf`, the name is "PDF"" is false alone (`a.pdf?download=1` gives "a.pdf") — fix now.
- diff-bug #3: no check covers AC2's "an embed whose PDF fails to load gets no name" — fix now (render_check fails a named `.embedpdf-failed` embed; plant `namefailed`).
- diff-bug #4: `moved` is read before a 300 ms wait in which page heights can change — follow-up, row "Embed name follow-ups" (a false failure only, for mixed page ratios).
- diff-bug #5: the query-style embed downloads as "get", not by the name rule — follow-up, row "Embed name follow-ups".
- diff-bug #6: `fileName()` trims spaces, which AC1 does not state, and `embedName()`/`hydrate()` test `data:` on the untrimmed value — amendment return (AC1 wording) plus fix now (trim before the `data:` test).
- diff-bug #7: `https:\\ex.com\a.pdf`, `get?a.pdf`, `view?file=https://o.com/x.pdf?y=1`, `report%3Fx=a.pdf`, `javascript:void(0)` give odd names — follow-up, row "Embed name follow-ups".
- diff-bug #8: the hidden-box check does not read `clip-path` — fix now.
- diff-bug #9: ios_check would miss a stray visible text node in the indicator — fix now (only the two spans may be children).
- diff-bug #10: a docs server that cannot start leaves safaridriver running — fix now (start the server first).
- diff-bug #11: safari_check passes `--expect-pdfjs 0` with nothing checked — fix now (needs at least 1).
- diff-bug #12: name_rule_test exits 1 on a setup failure, like a failed row — fix now (exit 2).
- diff-bug #13: CLAUDE.md "both scripts wait" now follows a paragraph naming four scripts — fix now.
- diff-bug #14: edited lines run past the file's wrap width — reject, style.
- diff-bug #15: repeats pass-1 diff-bug #4 — follow-up, row "Embed name follow-ups" (already there).
- diff-bug #16: repeats pass-1 diff-bug #12 — follow-up, row "Embed name follow-ups" (already there).
- blame-history #1: a bad `--device` exits inside the try and skips `driver.kill()`; `--device` is ignored with `--target mac` — fix now (resolve the device before the driver starts; refuse `--device` with mac).
- blame-history #2: AC6 says the CLAUDE.md `--expect-name` values are "updated to the AC2 names", but no value can hold them; the scripts add "PDF: " and the numbers — amendment return (AC6 wording).
- blame-history #3: a page's position is read twice, by the page group and the indicator — reject, planned change (AC4 and the plan's page-group work-log line).
- blame-history #4: the numbering rule exists in the viewer and in `expect_names.mjs` — reject, planned change (T3: the check counts from the list, never from the page).
- blame-history #5: name_rule_test's `--plant` is a bare switch — reject, style.
- prior-review #1: ios_check now takes a `|` list, which M008 kept to render_check — reject, planned change (T3 work-log line).
- prior-review #2: safari_check calls `process.exit` right after `console.log` — follow-up, row "Embed name follow-ups" (row "Text check follow-ups" holds findings from two milestones, so it is not extended).
- prior-review #3: safari_check's header does not say a file name holding `|` cannot be given — fix now.
- prior-review #4: CLAUDE.md's helper-test rule omits `tests/expect_names.mjs` — fix now.
- ripple #1: PROFILE.md's verify slot omits `name_rule_test.mjs` and `safari_check.mjs` — fix now.
- ripple #2: PROFILE.md's helper-test rule omits `expect_names.mjs` — fix now.
- ripple #3: row "Safari names on iOS" ends "(M010 implement)" — reject, false: that is the row's source, not a status.
- ripple #4: row "Native embed name" says M005 names embeds "PDF: <file name>" — reject, a record of what M005 did.
- ripple #5: row "Name plant slide target" does not mention `staleindicator` — reject, false: that plant exits 2 rather than passing, as the row says of name plants.
- ripple #6: DESIGN.md Known issues does not mention the desktop Safari check — reject, false: that entry is about hidden page text, which `safari_check.mjs` does not read, so it stays true.
- ripple #7: `tests/expect_names.mjs` header omits safari_check — fix now.
- Pass-2 fix-now items fixed d479ccd: diff-bug #1 (plant `tallframe` fails), #2, #3 (plant `namefailed` fails), #6 (trim before the `data:` test; 2 table rows, 25 pass), #8, #9 (ios_check plant `strayindicator` fails), #10, #11, #12 (no Chrome exits 2), #13; blame-history #1; prior-review #3, #4; ripple #1, #2, #7. The AC1 and AC6 wording goes to implement as an amendment return.
