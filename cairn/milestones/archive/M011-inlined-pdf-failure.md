# M011: Inlined PDF failure

**Status:** done (2026-10-19, PR #19 https://github.com/jmgirard/embedpdf/pull/19)

**Goal:** When a self-contained page cannot show an inlined PDF, the embed says so, and where the PDF decoded, its link is a download of the PDF under its file name instead of a nameless `blob:` address opened in a new tab.

**Outcome:** v1.2.3. `embedpdf-viewer.js` `showFailure()`: an embed with an inlined PDF (`opts.blob`) gets "Download the
PDF" (`download` = the file name, no target); no `opts.href` gives no link; other embeds keep "Open the PDF" in a new tab.
`hydrate()` catches a failed `inlinedPdf()` decode and shows the message with no link for either renderer, then rethrows
so the per-embed log line stays. New page `selfcontained_failed_test.qmd` (`files/broken.pdf`, a text file, and
`files/undecodable-embeds.md`, two `data:…base64,@@@@` embeds). render_check gained `--expect-download "<path>|-|…"`
(link rule, a Chromium download through `Browser.setDownloadBehavior` checked by name and bytes, one "failed to render an
inlined PDF" line per such embed on every run) and 9 plants; ios_check gained the same flag without the download, 8 plants,
and fails an unflagged inlined failure, `renderer=native` included. Checked in Chromium 155, the iOS 27.0 iPhone and iPad
simulators, and desktop Safari 27.0.1 (decode probe). DESIGN Known issues: IP2's fallback is not met for an undecodable
inlined PDF.

**Decisions:** none promoted. Plan: download link chosen by the user over the new-tab link; no link on a decode failure
over a `data:` download link; a new test page over more embeds on `selfcontained_test.qmd`.

**Review:** one pass, four lenses; criteria audit at plan and claim audit (41 claims, 6 corrected) at implement. 27
findings: 8 fixed (ios_check unflagged native failure, plant exit order, download setting reset, headers, CLAUDE.md
`--alone http`, row "Embed name follow-ups" corrected), 12 to rows ("Inlined failure check gaps" new, "Decode failure
button link" extended with the IP2 D-entry question, two existing rows), 7 rejected. Graduated row "Inlined PDF failure
link".
