# M008: Name check gaps

**Status:** done (2026-10-18, PR #16 https://github.com/jmgirard/embedpdf/pull/16)

**Goal:** Close the gaps that the M005 review found in the `--expect-name` checks of `tests/render_check.mjs` and `tests/ios_check.mjs`.

**Outcome:** No extension version change. render_check plants `duplink` (download link `aria-label` = `title`) and
`norole` (embed `role` removed); ios_check plant `norole`. render_check `--expect-name` takes a `|` list, one name
per PDF.js embed in page order across slides (`nameFailures(page, slide, before)`), and fails when the list length
differs from the embeds checked; a name with `|` cannot be given. `nameFailures()` waits up to 10 s for no
unhydrated `div.embedpdf` under its root, then fails with "N embed(s) … still not hydrated after 10 s", counted
again after the embeds are read. New self-contained `percent_test.qmd` shows `files/100%.pdf` by `files/100%25.pdf`
and by a bare `%`; both name "PDF: 100%.pdf". CLAUDE.md: revealjs lines gain `--expect-name`, five percent_test
lines, notes, Key files list the test pages. Checked in Chromium 155 and the iOS 27.0 iPhone and iPad simulators.

**Decisions:** none promoted. Plan: a bare `%` path on a normal page left to row "Bare percent path" (user); the
published percent_test page (user); a `|` list over names derived from `data-src`; a separate `duplink` plant.

**Review:** two passes, four lenses each. Pass 1: 22 findings, 9 fixed, 1 to new row "Name plant slide target", 10
rejected, and one return (AC6 lacked the literal `--alone http` percent line). Pass 2: 15 findings, 8 fixed, 7
rejected. Graduated row "Name check gaps"; added rows "Bare percent path" (plan) and "Name plant slide target".
