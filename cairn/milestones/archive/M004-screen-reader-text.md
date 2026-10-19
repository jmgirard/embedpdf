# M004: Screen-reader text

**Status:** done (2026-10-18, PR #12 https://github.com/jmgirard/embedpdf/pull/12)

**Goal:** A screen reader can read the text of every page of a PDF.js embed.

**Outcome:** v1.2.0. `embedpdf-viewer.js`: each PDF.js page is a `role="group"` labeled "Page i of n" holding a
`.embedpdf-text` block filled from `getTextContent()` (line break at `hasEOL`); the canvas is `aria-hidden` and a
render swaps only the canvas. The shared queue is two lists, renders first, then text reads, one task at a time;
every page's text is read at load and each read gives up after 10 s. Toolbar controls have `aria-label`s "Zoom out",
"Zoom in", "Download PDF". CSS: the text block is a 1px clipped box, `overflow: hidden`, `white-space: pre`,
`user-select: none`. `render_check.mjs` gained `--expect-text` (text and computed style before the scroll; Chrome's
accessibility tree after it, `interestingOnly: false`) and seven `--plant` defects; the RevealJS loop moved to Node.
`ios_check.mjs` gained `--expect-text` and three text plants. README, CLAUDE.md ("Still unverified": real screen
reader, eager-read cost) and DESIGN updated. Checked in Chromium and iOS 27.0 iPhone and iPad simulators.

**Decisions:** none promoted. Plan chose a hidden text block over the PDF.js text layer (user's answer: no
selection), text for every page at load over rendered pages only, and an empty block for a textless page.

**Review:** one pass, three lenses (diff-bug, blame-history, prior-review). 25 findings: 11 fixed on the branch
(no-wrap text, text-read timeout, dead marked-content check, check-script plant and argument fixes, header and
CLAUDE.md wording), 14 to candidate rows "Eager text cost", "Screen-reader text gaps", "Text check gaps", 0 rejected.
Claim audit corrected 4 claims. Graduated candidate row "Screen-reader text layer".
