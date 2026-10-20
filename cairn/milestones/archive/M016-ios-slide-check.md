# M016: Slides check on iOS

**Status:** done (2026-10-19, PR #24 https://github.com/jmgirard/embedpdf/pull/24)

**Goal:** `tests/ios_check.mjs` checks RevealJS slide decks, so self-contained slides are checked in Safari on
iPhone and iPad.

**Outcome:** Test-only, no version bump. On a page with `window.Reveal`, the ios_check probe waits for
`Reveal.isReady()` and for hydration, then walks each slide (a section with no outer section or one in a stack,
uncounted slides too): `Reveal.slide()`, wait until current, and after 3 s scroll the slide's embeds into view (the
iPhone simulator uses RevealJS's scrolled view, where `Reveal.slide()` did not reach the last slide). Per slide it reads
hidden text, scrolls pages, re-shows the slide if a scroll moved it, and measures ink. The report gives `slide`,
`textSlide`, `inkSlide`, `scrollView`; Node fails a PDF.js embed whose ink or text slide differs, that is in no slide, or
whose ink count differs from its page count. New `--plant noslide`; `--plant blank|missing` now exit 2 with nothing to
plant in. CLAUDE.md gains the `selfcontained_slides_test.html` iPhone and iPad lines and a desktop-Safari "Still
unverified" bullet; README and DESIGN Known issues updated.

**Decisions:** none promoted. Plan gate: a per-slide walk inside the probe over driving slides from Node.

**Review:** four lenses, one pass, 37 findings: 22 fixed on the branch (ink count vs pages, `noslide` effect, slide
re-show, uncounted and nested sections, plant exits, docs), 6 to new row "Deck walk follow-ups", 5 rejected, 4 noted.
No criterion amended. Graduated row "Self-contained slides on iOS".
