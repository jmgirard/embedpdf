# M010: Embed name gaps

**Status:** done (2026-10-19, PR #18 https://github.com/jmgirard/embedpdf/pull/18)

**Goal:** A screen reader tells each PDF.js embed apart by a name that never comes from a script that takes the PDF by a query value, a host, or inlined data, and hears the toolbar page indicator as a page position.

**Outcome:** v1.2.2. `embedpdf-viewer.js` exports `fileName()`: trimmed, no fragment; the last path segment ending in `.pdf`,
else the last segment of the first query value ending in `.pdf`, else the last non-empty segment when there is no `?`; a host,
`data:`, and `blob:` give none. `embedName()` gives "PDF: <name>" or "PDF" (the fallback link's href for a `data:` src;
"document.pdf" stays only as the download name). `embedNames()` numbers shared PDF.js names "(k of n)" in document order
before any hydrate; a failed embed counts and stays unnamed. The indicator holds a hidden `.embedpdf-pageinfo-text`
"Page i of n" beside an `aria-hidden` "i / n". New `tests/name_rule_test.mjs` (32-row table in Chromium),
`tests/expect_names.mjs` (numbered expected names; `-` is "PDF"; render_check's one name needs `--expect-pdfjs`; ios_check
takes a `|` list), `tests/safari_check.mjs` (safaridriver Get Computed Label: passes on the Mac; the iOS simulator session
and a page-script `computedName` both fail, recorded), and `name_edge_test.qmd`. render_check checks the indicator's tree
text, shown text, and hidden box, requires a page-2 read on pages without slides, and fails a named failed embed; each new
check has a plant. Checked in Chromium 155, the iOS 27.0 iPhone and iPad simulators, and desktop Safari 27.0.1.

**Decisions:** none promoted. Plan: "(k of n)" numbering over a name option, plain "PDF" over the PDF's Title, a hidden
"Page i of n" over `role="status"`. AC3's inlined fixture became `sample.pdf`; AC1 and AC6 were reworded at review, the
user choosing the wording at the second re-audit.

**Review:** three passes, four lenses each; one defect return (README probe results, a doubled slash after the host) and
one amendment return (AC1, AC6). 95 findings: 51 fixed, 20 to new row "Embed name follow-ups", 23 rejected. Row "Safari
names on iOS" added at T6. Graduated row "Embed name gaps".
