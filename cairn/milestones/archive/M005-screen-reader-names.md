# M005: Screen-reader names

**Status:** done (2026-10-18, PR #13 https://github.com/jmgirard/embedpdf/pull/13)

**Goal:** A screen reader names each PDF.js embed by its file and reads each toolbar control once.

**Outcome:** v1.2.1. `embedpdf-viewer.js` `hydratePdfjs()` gives the embed `role="group"` and `aria-label`
"PDF: <file name>" from `fileName()` of `data-src` (or the download link's name on a self-contained page; "PDF"
when none). Toolbar controls hold the glyph in an `aria-hidden` span and are named by `title` alone, so Chromium
exposes no repeated description. New `name_test.qmd` with `files/sample copy.pdf` (space and `%20` paths).
`render_check.mjs` gained `--expect-name` (DOM, tree name, toolbar name/description/title, missing toolbar) and plants
`wrongname`, `dupdesc`, `notoolbar`; the `noname` plant now removes `title`. `ios_check.mjs` gained `--expect-name`
(DOM only; refused with `--remote`) and `wrongname`. README, CLAUDE.md (check lines, "Still unverified"), and DESIGN
updated. Checked in Chromium 155 and iOS 27.0 iPhone and iPad simulators.

**Decisions:** none promoted. Plan chose the file name over a new shortcode option (user's answer) and a `title`-only
name over dropping the tooltip. The planned spacing fix was cut: PDF.js 6.1.200 already adds space items for gaps.

**Review:** one pass, three lenses (diff-bug, blame-history, prior-review). 20 findings: 5 fixed on the branch
(`--expect-name` with `--remote`, missing-toolbar guard, "Still unverified" line), 11 to new candidate rows "Embed name
gaps" and "Name check gaps", 4 rejected (2 confirmations, 2 planned). Claim audit corrected 4 claims. Narrowed
candidate row "Screen-reader text gaps".
