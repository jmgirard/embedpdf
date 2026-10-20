# M020: Self-contained native display check

**Status:** done (2026-10-20, PR #28 https://github.com/jmgirard/embedpdf/pull/28)

**Goal:** A check shows that each native embed of a self-contained page shows its in-page PDF, at the page its `page` option names, in Chromium, Firefox, and desktop Safari, as the same browser shows the PDF file.

**Outcome:** Test and docs only, no version change. New `tests/native_check.mjs` (`--browser
chromium|firefox|safari`, `--alone`, `--same-pages`, plants `otherpdf|broken|blank|fileaddr|nopage|refcontrol`,
`--plant-at`): screenshots each native `<object>` and an `<object>` of the PDF file at its size, fractional
position, and `data-page` fragment, compared by 4 x 4 block averages at the best shift of up to 2 pixels; each
reference must differ from a control (`files/broken.pdf`); screenshots must hold for 1.5 s; addresses must be
`blob:` with the fragment. Firefox runs with `pdfjs.viewOnLoad` 1. New `tests/png_diff.mjs` with helper tests.
`selfcontained_test.qmd` gained a `renderer=native page=2` 600 x 400 embed (CLAUDE.md lines: 3 native/1 PDF.js
desktop, 2/2 iPhone and iOS, 5 links). Six CLAUDE.md lines pass in Chromium 155, Firefox 158 (headless), and
desktop Safari 27.0.1, which opens native embeds at page 1 whatever `#page` says. README, DESIGN, PROFILE updated.
Firefox 158 installed (Homebrew); its folder needed one launch through macOS `open`.

**Decisions:** none promoted. Plan chose a file-reference screenshot over ink alone, and a new script over
extending render_check (CDP-bound) and safari_check.

**Review:** one pass, four lenses, no returns. Criteria audit 8 fixed; claim audit 4 of 34 corrected. 25
findings: 14 fixed (reference control and settle span against a pre-draw false pass, setup exit 2, per-embed
isolation, WebDriver limit, child selector, signals, PNG length), 1 to row "Weigh native check by inked
blocks", 10 rejected. Narrowed row "Self-contained native checks"; new rows "Make Safari native embeds honor
page" and "Run the render checks in Firefox".
