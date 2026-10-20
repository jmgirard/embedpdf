# M017: Check timing and ink report

**Status:** done (2026-10-19, PR #25 https://github.com/jmgirard/embedpdf/pull/25)

**Goal:** Make `render_check.mjs` measure ink when the pages have rendered rather than after fixed waits, make `ios_check.mjs` report a missing canvas apart from a blank one, and make `render_check.mjs` measure ink without eval in the page.

**Outcome:** No extension version change. render_check's `waitForCanvases` replaces the fixed 4 s and 1000 ms
waits: after the scroll (per slide on a deck) it waits until every embed is hydrated and every PDF.js page has
a canvas, rescrolling pages with none, and ends after 10 s with no progress or 120 s in all, both checked
before each 300 ms step; the report gives `canvasWaits`. New `--cpu-throttle <n>` (`page.emulateCPUThrottling`,
120 s load limit); CLAUDE.md's large_test iphone line at 70, where the old waits left pages with no canvas
without `--expect-name`. `--plant norender` needs no other flag. ios_check reports "ok", "no canvas", "no ink",
"unreadable (…)" per page and names failing pages; new `nocanvas` plant; `blank` counts only where the page
has a canvas. render_check gets the ink rule as a `page.evaluateHandle` handle, not `new Function`.
`serveDocs` takes `csp`; `NO_EVAL_CSP` is `script-src 'self' 'unsafe-inline' blob: data:`; `--csp` sends it
and checks the header. In Chromium 155, eval run through puppeteer works under that header (a page's own
script gets EvalError), so `--csp` shows the viewer renders under it, not the eval removal.
helpers_test 133 cases. Checked in Chromium 155 and the iOS 27.0 iPhone and iPad simulators.

**Decisions:** none promoted. Plan chose a canvas wait over longer fixed waits, CPU throttling over a held-back
canvas plant, and a function handle over `page.setBypassCSP`.

**Review:** one pass, four lenses (diff-bug, blame-history, prior-review, ripple), no returns. 28 findings:
12 fixed (`data:` in the policy for self-contained pages, per-step wait limits, docs), 4 to new row "Canvas
wait follow-ups", 12 rejected. Graduated row "Ink check follow-ups"; "Text check follow-ups" re-pointed.
