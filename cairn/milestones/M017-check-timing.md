<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section.
     Per-section owners are tagged below. The one size check that can fail is
     cairn_validate's <150 over the plan-owned body. -->
# M017: Check timing and ink report

- **Status:** review   <!-- owner: transitioning skill · mirror-update; cairn/ROADMAP.md is the authority -->
- **Priority:** normal   <!-- owner: plan · create/amend-via-gate; high | normal | low -->
- **Depends on:** —   <!-- owner: plan · create/amend-via-gate; M<xx>, M<yy> or — -->
- **Driving RR:** —   <!-- owner: plan · create/amend-via-gate; RR<NN> whose Binding criteria bind this milestone's ACs (binding-criteria check), or — -->
- **Principles touched:** IP1   <!-- owner: plan · create/amend-via-gate; comma-separated IPn/GPn ids this milestone touches, or — -->
- **Resolves:** —   <!-- owner: plan · create/amend-via-gate; comma-separated GitHub issues the scope absorbs, each `#N closes` (the PR closes it at merge) or `#N partial` (the remainder gets a candidate row), or — ; skill conduct only — no validate check parses it -->
- **Surface tier:** internal — test scripts that no user of the extension runs or relies on   <!-- owner: plan · create/amend-via-gate; user-facing | internal — <one-clause reason>; skill conduct only — no validate check parses it -->
- **Branch/PR:** m017-check-timing   <!-- owner: implement (branch) / review (PR URL) · create; a companion checkout the milestone also works in is one further entry per checkout, `companion: <abs-path> <branch>` (implement), its PR URL appended by review — /milestone-review merges companions first, in listed order -->

## Goal
<!-- owner: plan · create; a wrong goal returns to plan, never edited in place -->

Make `render_check.mjs` measure ink when the pages have rendered rather than after fixed waits, make `ios_check.mjs` report a missing canvas apart from a blank one, and make `render_check.mjs` measure ink without eval in the page.

## Scope
<!-- owner: plan · create/amend-via-gate -->

**In:** the three gaps of the ROADMAP row "Ink check follow-ups": render_check's fixed 4 s wait before the ink measure, ios_check's report that shows "no canvas" and "no ink" alike, and render_check's `new Function` rebuild of the ink rule. New options `--cpu-throttle` and `--csp` in render_check, a new `nocanvas` plant in ios_check, `norender` usable without `--expect-text`, and the CLAUDE.md lines and header text for them.

**Out:**
- The viewer (`embedpdf-viewer.js`) and the extension version: unchanged. If the viewer does not render under `--csp`, that is a viewer gap for a new candidate row, through the amendment gate (T4).
- The tree check's 10 s canvas wait per embed and the other timing items of "Text check follow-ups": stay in that row.
- The fixed waits of ios_check's deck walk: stay in "Deck walk follow-ups".
- A real slow phone: stays in CLAUDE.md "Still unverified".

## Acceptance criteria
<!-- owner: plan · create/amend-via-gate; review reads, never reinterprets. -->

- [ ] AC1: After it scrolls, `tests/render_check.mjs` measures ink only once every PDF.js page in scope (the whole page, or on a RevealJS page the slide shown) has a canvas, or once 10 s pass in which no page in scope newly got one. It no longer waits a fixed 4 s before the measure. The 300 ms pause per page scroll and the 1500 ms pause per slide may stay, as scroll and slide pacing. A new `--cpu-throttle <rate>` option slows Chromium's CPU by that rate. With the rate that CLAUDE.md's throttled line gives, `node tests/render_check.mjs large_test.html --device iphone --expect-native 0 --expect-pdfjs 2 --expect-pages 14 --expect-name "large.pdf|large-2.pdf" --cpu-throttle <rate>` exits 0, and the same line with `--plant norender` added exits 1 with a "no canvas" failure (`norender` then needs no other flag).
- [ ] AC2: `tests/ios_check.mjs` reports each PDF.js page's ink as "ok", "no canvas", "no ink", or "unreadable (…)", and its failure line names the state of each failing page. In the "embedpdf iPhone" simulator, `node tests/ios_check.mjs --device "embedpdf iPhone" --plant blank` exits 1 with a line naming "no ink" for the last page of the first PDF.js embed (`blank` counts as planted only where that page has a canvas), and the same line with a new `--plant nocanvas`, which removes that page's canvas and keeps the page, exits 1 with a line naming "no canvas".
- [ ] AC3: `tests/render_check.mjs` measures ink without eval in the page. With a new `--csp` option, the test server sends a Content-Security-Policy header whose `script-src` omits `'unsafe-eval'`, and `node tests/render_check.mjs example.html --csp --expect-native 9 --expect-pdfjs 2 --expect-pages 2` exits 0.
- [ ] AC4: Every `node tests/render_check.mjs` and `node tests/ios_check.mjs` line in CLAUDE.md "Verify before finishing" as it stands at the milestone's end, with the extra runs each block names for its own lines, exits 0, and `node tests/helpers_test.mjs` prints "N passed, 0 failed".
- [x] AC5: The render_check header names `--cpu-throttle` and `--csp`, the ios_check header names `nocanvas`, and CLAUDE.md names all three. `grep -nE '4 s|4000|four seconds'` over CLAUDE.md, `tests/render_check.mjs`, and `tests/ios_check.mjs` shows no line that describes a fixed wait before render_check's ink measure.

## Coverage
<!-- owner: plan · create/amend-via-gate -->

- AC1 → T1, T2
- AC2 → T3
- AC3 → T4
- AC4 → T6
- AC5 → T5

## Tasks
<!-- owner: plan (create) / implement (check-off, minor edits); substantive change is amend-via-gate. -->

- [x] T1: Canvas wait in render_check. Replace the 4 s sleep (`render_check.mjs:1112`) and the 1000 ms end of the no-slide scroll (`:1108`) with a wait over the PDF.js pages in scope: scroll each page that has no canvas into view again, and end when every page has one or after 10 s with no new canvas (state an overall cap in the header). On a deck, run it per slide after `scrollPages(k)` (`:1093`). The viewer puts a page's canvas in only after `page.render()` resolves (`embedpdf-viewer.js:259-263`), so a canvas means a painted page. Let `norender` run without `--expect-text` (`:331`, `:405`), and keep its tree-check path (`:1289`) for runs with it.
- [x] T2: `--cpu-throttle <rate>` through puppeteer's `page.emulateCPUThrottling`. Pick a rate under which the old waits leave a page with no canvas on the AC1 line: a one-off run of the main-branch script with the same throttle call added, not committed. Write the rate and that run's result in the work log. Add the throttled line to CLAUDE.md's command list, and its `norender` run to the prose beside it (a listed line must exit 0). If no rate makes the old waits fail while the new wait passes, log that and keep a rate under which the new wait passes.
- [x] T3: ios_check ink states. Make `inkOf` (`ios_check.mjs:557`) return "ok", "no canvas", "no ink", or "unreadable (…)", update the report check (`:995-996`) to name each failing page's state, count `blank` as planted only where the last page has a canvas (`:564-573`), and add `nocanvas` to the ink plants. Run `blank` and `nocanvas` in the "embedpdf iPhone" simulator.
- [x] T4: Ink rule without eval. First, a one-off probe: in a page served with the `--csp` header, `new Function` throws, so the old code fails under it. Then replace `new Function` (`render_check.mjs:1118`) with a function handle from `page.evaluateHandle` of the rule's source, passed into the measure. Add a `csp` option to `serveDocs` (`tests/serve_docs.mjs`) and a `helpers_test.mjs` case each for the header sent and not sent. The header allows what Quarto's inline scripts and the viewer need, and omits `'unsafe-eval'`. If the viewer does not render under it, stop at the amendment gate with a candidate row for the viewer gap.
- [x] T5: Docs. Update the render_check and ios_check headers and CLAUDE.md for the new wait, `--cpu-throttle`, `--csp`, `nocanvas`, and `norender` without `--expect-text`, and add the AC3 line. Run the AC5 grep.
- [x] T6: Verify. With `CHROME_PATH` set to Chromium, run every render_check and ios_check line in CLAUDE.md with the extra runs each block names, and `node tests/helpers_test.mjs`. Record each result in the work log.

## Work log
<!-- owner: any skill · append-only; one line per entry; absolute dates. -->

- 2026-10-19: created by /milestone-plan.
- 2026-10-19: tier check: not run — work named at the question set.
- 2026-10-19: question set: what to work on — "Ink check follow-ups"; how much of it — the whole item (all three gaps).
- 2026-10-19: collision sweep: candidate row "Ink check follow-ups" (from the M006 review) absorbed in full; "Text check follow-ups" only points at it and keeps its own timing items; no milestone, archive entry, or D-entry overlaps; GitHub inbox has 0 open issues and 0 open PRs.
- 2026-10-19: checker-regress shape not hit: render_check and ios_check check the shipped viewer in browsers, not repo-internal artifacts.
- 2026-10-19: criteria audit (reduced mode, fresh Opus reader) returned 8 findings, all fixed: AC1 uses the rate in CLAUDE.md instead of a work-log record, says the 300 ms and 1500 ms pacing may stay, and makes `norender` need no other flag (it needed `--expect-text`); AC2 says `blank` counts only where the page has a canvas; AC3 requires a passing run with counts, since an empty page would show no PDF.js pages; AC4 reads CLAUDE.md at the milestone's end with each block's own extra runs; AC5 splits names per file and names its grep pattern.
- 2026-10-19: plan chose a wait on canvas presence over longer fixed waits because longer waits still fail on a slower machine and slow every run; falsified by a page whose canvas is present before its render ends.
- 2026-10-19: plan chose CPU throttling over a plant that holds back each canvas because throttling slows the viewer's real render path; falsified by a throttled run whose render time does not grow.
- 2026-10-19: plan chose a CDP-evaluated function handle over `page.setBypassCSP` because bypass would also hide any CSP effect on the viewer; falsified by CDP-evaluated code being blocked by the page's CSP.
- 2026-10-19: no extension version bump: the viewer and its CSS do not change.
- 2026-10-19: T1 done: `waitForCanvases` in render_check waits for hydration and a canvas on every PDF.js page in scope (10 s no progress, 120 s cap, under puppeteer's 180 s call limit); the 4 s and 1000 ms end waits are gone; `norender` runs without `--expect-text`. Chromium 155: example.html desktop, large_test iphone, revealjs_test iphone exit 0 (wait 0 ms); large_test iphone + `--plant norender` exits 1, "no canvas" on all 28 pages after a 17.1 s wait.
- 2026-10-19: T2 done: rate 70 chosen. Main-branch script with the throttle added, large_test iphone line: passes at 4, 8, 20, 40, and at 70 with `--expect-name` (its name check gives the pages time); without `--expect-name` at 70 it exits 1 twice ("no canvas" on embed 2 pages 10-14, then 7-14), while the new script passes (wait 10.3 s). New script with `--expect-name` at 70 exits 0 (wait 31.3 s, 127 s run); at 100 the page load passes 120 s. CLAUDE.md gets the throttled line and the `norender` run in prose (minor amendment of T2's wording, since a listed line must exit 0).
- 2026-10-19: CLAUDE.md as a whole holds 38 simple-english lint hits from before this branch; the new paragraph adds none, and the older hits stay out of scope.
- 2026-10-19: T3 done: ios_check reports each page as "ok", "no canvas", "no ink", or "unreadable (…)" (a read error no longer goes to the page errors), its failure line names each page that is not "ok" with its state, `blank` counts as planted only where the page has a canvas, and new `nocanvas` removes that canvas. "embedpdf iPhone", example.html: `--plant blank` exits 1 with "embed 1: page 2 no ink"; `--plant nocanvas` exits 1 with "embed 1: page 2 no canvas". The first try of each failed at `simctl openurl` with "Operation timed out" (code 60) on a fresh boot, as LESSONS records; the repeat ran.
- 2026-10-19: T4 probe refuted the row's premise: with `NO_EVAL_CSP` (`script-src 'self' 'unsafe-inline' blob:`) on example.html in Chromium 155, a script the page runs at load gets "EvalError: Evaluating a string as JavaScript violates the following Content Security Policy directive", but `new Function` and `eval` inside puppeteer's `page.evaluate` run, and so does a script element added during an evaluate; the old render_check passed the AC3 line under the header. So `--csp` cannot tell the old rebuild from the new one; it shows the viewer renders under a CSP that forbids eval.
- 2026-10-19: T4 done: render_check gets the ink rule as a function handle (`page.evaluateHandle` of its source) and runs no `new Function` in the page; `serveDocs` takes `csp` and `NO_EVAL_CSP` is exported; `--csp` sends it, records the header the page arrived with, fails when it differs, and exits 2 for a URL target or `--alone file`. helpers_test: 133 passed, 0 failed (new csp cases for 200, 206, 416, with and without the option). Chromium 155: AC3 line exits 0 (every page "ok", header present, only the favicon 404 also seen without `--csp`); the iphone line under `--csp` exits 0; `--plant blank` exits 1 with "page 2 no ink" with and without `--csp`. The Out item's viewer gap does not arise: the viewer renders under the header.
- 2026-10-19: T5 done: render_check header describes the canvas wait, `--cpu-throttle`, `--csp` (with the 2026-10-19 Chromium 155 eval observation), and `norender` as an ink plant; ios_check header gives the four page states and `nocanvas`; CLAUDE.md adds the page-state paragraph and the `--csp` paragraph with the AC3 line. AC5 grep over the three files prints no line; the new CLAUDE.md text adds no simple-english hits (still 38).
- 2026-10-19: T6 done (Chromium 155, iOS 27.0 simulators): a script read CLAUDE.md "Verify before finishing" and ran every render_check line (65 runs, with `--alone http` for each `--alone file` line, mac-safari and windows-touch for the selfcontained_test, `--remote`, and `--missing-pdfs` desktop lines, ipad for the selfcontained_test iphone lines) and every ios_check line (28 runs); all 93 exit 0. One ios run (iPad, example.html) failed at `simctl openurl` with "Operation timed out" and passed on its repeat. The throttled line took 59 s; with `--plant norender` added it exits 1 with "no canvas" on all 28 pages after a 17.8 s wait. name_rule_test 32 passed, 0 failed; helpers_test 133 passed, 0 failed. safari_check not run: the branch does not change it or the viewer.
- 2026-10-19: claim audit: not owed — internal tier.
- 2026-10-19: implement done; status set to review.

## Decisions
<!-- owner: implement / review · append-only; milestone-local. -->

## Review
<!-- owner: review · exclusive. -->

Pass 1, 2026-10-19, branch head 03e0a2e (main 55820d4 already merged in; Copilot round off).

- AC5: the render_check header (before its first `import`) names `--cpu-throttle` (line 242) and `--csp` (line 245); the ios_check header names `nocanvas` (lines 35, 46-47); CLAUDE.md names `--cpu-throttle` (2 lines), `--csp` (2), `nocanvas` (1). `grep -nE '4 s|4000|four seconds' CLAUDE.md tests/render_check.mjs tests/ios_check.mjs` prints no line. Pass.
