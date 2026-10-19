# M009: Text check gaps

**Status:** done (2026-10-19, PR #17 https://github.com/jmgirard/embedpdf/pull/17)

**Goal:** Close the gaps that the M004 review found in the `--expect-text` checks of `tests/render_check.mjs` and `tests/ios_check.mjs`.

**Outcome:** No extension version change. Both scripts walk from each `.embedpdf-text` block to `<html>` and fail
on the `inert` attribute or computed `content-visibility: hidden` (plants `inert`, `cvhidden`); `opacity` is not
checked, because a Chromium probe kept `opacity: 0` text in the tree. render_check reads each canvas with its page,
counts a null snapshot as hidden only for a connected canvas, reads a swapped canvas once, fails a thrown snapshot,
and names a canvas by its page (plant `detach`). One whole-page text wait (`waitForText()`, the probe's `waitText`)
replaces the per-slide wait: it ends when all text is in, after 10 s with no change, or after 60 s. Test aid
`--slow-text <ms>` (ios_check default timeout 300 s with it). With `--expect-text`, an embed still not hydrated
exits 1 at once (plant `unhydrated`; ios_check reports one failure), and render_check `stopRun()` stops a deck at
the first slide whose canvas wait runs out (plant `norender`). CLAUDE.md notes the wait. Checked in Chromium 155 and
the iOS 27.0 iPhone and iPad simulators.

**Decisions:** none promoted. Plan: no `opacity` check and no Safari tree read (user); one page-wide wait over one
per slide; a no-progress wait over a longer fixed one; stop the deck at the first canvas wait that runs out.

**Review:** two passes, four lenses each, one return (pass 1: a canvas swapped before its page lookup crashed the
tree check). Pass 1: 32 finding lines, 22 fixed, 5 to new row "Text check follow-ups", 5 rejected. Pass 2: 18
lines, 8 fixed, 6 to that row, 4 rejected. No criterion amended. Graduated row "Text check gaps"; narrowed row
"Name plant slide target"; added row "Text check follow-ups".
