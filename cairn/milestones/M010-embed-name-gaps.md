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

- [ ] AC1: The viewer takes a PDF.js embed's file name from the PDF's address, after it drops the address's `#fragment` (the query is the text between the first `?` and the `#`). The name is the last path segment, percent-decoded where it decodes, when the decoded segment ends in `.pdf` in any letter case; else the last `/` segment of the first query value, decoded as `URLSearchParams` decodes it, that ends in `.pdf`; else the last non-empty path segment when the address has no query; else no name. An address with a `data:` or `blob:` scheme, in any letter case, gives no name. When `data-src` is a `data:` address, the address is the fallback download link's `href`. The naming function, exported from the viewer, returns the expected result for every row of the table in the new `tests/name_rule_test.mjs`, run in Chromium. The table holds at least these rows (address → name): `sample.pdf` → `sample.pdf`; `files/sample%20copy.pdf` → `sample copy.pdf`; `files/100%25.pdf` → `100%.pdf`; `files/100%.pdf` → `100%.pdf`; `SAMPLE.PDF#page=2` → `SAMPLE.PDF`; `a.pdf#x?f=b.pdf` → `a.pdf`; `download.php?file=a.pdf` → `a.pdf`; `get?file=docs%2Fa.pdf&x=1` → `a.pdf`; `files/report` → `report`; `files/report?id=5` → none; `https://example.com` → none; `https://example.com/` → none; `https://example.com:8080` → none; `//example.com` → none; `data:application/pdf;base64,JVBERi0x` → none; `blob:https://example.com/1234` → none.
- [ ] AC2: A PDF.js embed with a file name is named "PDF: <file name>", and one with none is named "PDF". When two or more embeds that the viewer chose at hydrate to render with PDF.js (from `data-renderer` and the device, whether or not their PDF loads) share a name, each is named "<that name> (k of n)", with k counting them in document order across all slides; a name that no other such embed shares carries no number, and an embed whose PDF fails to load gets no name. render_check `--expect-name` passes with these names on `example.html` (desktop: "PDF: sample.pdf (1 of 2)" and "(2 of 2)"; `--device iphone`: "(1 of 10)" to "(10 of 10)"), on `name_test.html` (both `sample copy.pdf` embeds numbered), and on `revealjs_test.html` with `--device iphone` ("PDF: dummy2.pdf" and "PDF: dummy.pdf", no number); ios_check `--expect-name` passes on `example.html` in the iOS 27.0 iPhone and iPad simulators with the `--device iphone` names.
- [ ] AC3: On the new page `name_edge_test.html` (not self-contained), render_check `--expect-name` and ios_check `--expect-name` (iOS 27.0 iPhone simulator) pass with an embed at `files/get?file=sample.pdf` (`files/get` a copy of `sample.pdf`, `renderer=pdfjs`) named "PDF: sample.pdf" and a hand-written embed whose `data-src` is a `data:` address of `dummy.pdf`, with `data-renderer="pdfjs"` and no download link, named "PDF"; each embed shows every page inked.
- [ ] AC4: The toolbar's page indicator still shows "i / n" and gives screen readers the text "Page i of n" for the same page. In Chromium's accessibility tree, within each toolbar's subtree, render_check reads "Page 1 of 2" and no "1 / 2" text on `example.html` (desktop and `--device iphone`), and reads "Page 2 of 2" after it scrolls one embed's pages to page 2; ios_check reads the same text in the page DOM in the iOS 27.0 iPhone and iPad simulators.
- [ ] AC5: In desktop Safari, through safaridriver's "Get Computed Label", each toolbar control of each PDF.js embed on `example.html` has its tooltip as its name ("Zoom out", "Zoom in", "Download PDF") and the indicator reads "Page i of n". The same read is tried in Safari in the iOS 27.0 iPhone simulator (`safari:useSimulator`) and with `computedName` in a page script there; for each probe that cannot read a name, README, CLAUDE.md "Still unverified", and a ROADMAP candidate row name the probe and its result.
- [ ] AC6: `version:` is 1.2.2 in `_extension.yml` and in `embedpdf.lua`; `quarto render` completes with no errors; CLAUDE.md "Verify before finishing" lists `node tests/name_rule_test.mjs`, the `name_edge_test.html` lines, and the Safari check, and every command it lists passes with its `--expect-name` values updated to the AC2 names; README and DESIGN.md Architecture replace the current "PDF: " plus `fileName()` text with the name rule, the numbering, and the indicator text, and CLAUDE.md "Still unverified" adds the indicator text to the real screen-reader line.

## Coverage

- AC1 → T1
- AC2 → T2, T3
- AC3 → T4
- AC4 → T5
- AC5 → T6
- AC6 → T7

## Tasks

- [x] T1: Replace `fileName()` (`embedpdf-viewer.js:375`) with the AC1 rule as an exported function; use it in `hydrate()` (`:403`, no "document.pdf" in the name, only in the `download` attribute) and `hydratePdfjs()` (`:160`). Write `tests/name_rule_test.mjs`: it serves the viewer, imports it in Chromium with puppeteer, and checks each AC1 row; `--plant` swaps one expected value so the run can be seen to fail.
- [ ] T2: Number shared names: at load, before any hydrate, pick each placeholder's renderer and name in document order, count the PDF.js ones per name, and pass "(k of n)" into `hydratePdfjs()`. Keep the failed embed unnamed (`showFailure`).
- [ ] T3: render_check and ios_check `--expect-name <base>` expect "<base> (k of n)" for embeds whose base name repeats among the given names, counted from the list given, never from the page; a value `-` stands for the bare "PDF". Add plant `nonumber` (drop the number) to both. Update the `--expect-name` values and notes in CLAUDE.md.
- [ ] T4: Add `files/get` and `name_edge_test.qmd` (resources so Quarto copies `files/get`; a raw `div.embedpdf` with a `data:` `data-src` of `dummy.pdf`); add its render_check and ios_check lines to CLAUDE.md.
- [ ] T5: Indicator: a visually hidden "Page i of n" and the visible "i / n" `aria-hidden`, both updated by the scroll handler (`:317`). render_check reads the toolbar subtree and scrolls one embed's pages to page 2; ios_check reads the DOM. Add plant `rawindicator` (visible text not hidden) to both.
- [ ] T6: Safari: the user runs `safaridriver --enable` once (a stop for the user's hands). Write `tests/safari_check.mjs` with raw WebDriver HTTP calls (no new npm dependency): desktop Safari on `example.html`, then the `safari:useSimulator` and page-script `computedName` probes; record each probe that fails in README, CLAUDE.md, and a candidate row.
- [ ] T7: Bump to 1.2.2 in both places; update README (screen-reader paragraph), DESIGN.md Architecture, and CLAUDE.md; `quarto render`; run every CLAUDE.md verify command.

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

## Decisions

## Review
