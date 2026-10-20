# M018: iOS deck and link checks

**Status:** done (2026-10-19, PR #26 https://github.com/jmgirard/embedpdf/pull/26)

**Goal:** `tests/ios_check.mjs` checks `revealjs_test.html` and counts the download links of self-contained pages in Safari on iPhone and iPad.

**Outcome:** Test-only, no extension version change. ios_check's `--expect-pages` takes one count or a `|`
list with one count per embed not set to `renderer=native`, in page order. A list whose length differs from
`--expect-embeds`, or an entry not matching `^\d+$`, exits 2, and an embed past a short list gets "no
--expect-pages entry for it". CLAUDE.md gains iPhone and iPad lines for `revealjs_test.html` with
`--expect-pages "2|1"`. New `--expect-links <n>` counts the page's download links by render_check's selector
(`.embedpdf-download, .embedpdf object a[download], a.embedpdf-btn`), each with a `data:` or `blob:` href. New
plants `nolink` and `linkfile`, which exit 2 on a page with no such link. The four self-contained ios_check lines
pass `--expect-links 4`, and CLAUDE.md describes the flag. All 30 ios_check lines in CLAUDE.md exit 0 in the iOS
27.0 simulators.

**Decisions:** none promoted. Plan chose a `|` list in `--expect-pages` over a new per-embed flag.

**Review:** one pass, four lenses (diff-bug, blame-history, prior-review, ripple), no returns. 15 findings:
7 fixed (short-list NaN line, `linkfile` and link-check comments, long lines, CLAUDE.md note), 3 to new row
"iOS link check gaps", 1 already held by "Deck walk follow-ups", 4 rejected. Graduated row "iOS slide deck gaps".
