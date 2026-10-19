# M013: Large PDF range check

**Status:** done (2026-10-19, PR #21 https://github.com/jmgirard/embedpdf/pull/21)

**Goal:** Add a test PDF over 128 KB and check lines that pass only when PDF.js loads it by byte ranges, in Chromium and in Safari in the iOS simulators.

**Outcome:** No extension version change. `files/large.pdf` (14 pages, seven copies of `sample.pdf` by `pdfunite`) and
its copy `files/large-2.pdf`; `large_test.qmd` shows them with `renderer=pdfjs` and `renderer=auto`. `serve_docs.mjs`:
exported `SLOW_ABOVE` (131,072); `serveDocs` and `serveRemote` options `slowWhole` (a whole `.pdf` answer over that size
sent 4096 bytes every 200 ms; HEAD at once) and `noRanges`; `server.rangeCounts` (206 answers per request path).
render_check and ios_check: `--expect-ranges` (no value) fails unless each PDF.js embed's address got a 206, exits 2 for a
PDF not over `SLOW_ABOVE` or an address another embed shares; `--plant noranges`. render_check allows `--remote cors`.
helpers_test 115 cases. CLAUDE.md: 7 check lines and a "Still unverified" entry. Checked in Chromium 155 and the iOS 27.0
iPhone and iPad simulators (3 range answers per embed).

**Decisions:** none promoted. Plan: a slow whole-file answer over a bigger PDF (a 978 KB PDF got no range on a local
server), counting at the server over browser events, a second file for the `auto` embed. AC3 dropped `--expect-text`
(repeated page text) by a substantive amendment; the gap went to the new row "Large PDF text check".

**Review:** two passes. Pass 1 returned AC4 (no remote whole-file case); T6 added it. Pass 2, four lenses: 20 findings,
9 fixed (the exit-2 guards for small or shared PDFs and for a plant with no PDF.js embed, HEAD and case in the slow rule,
a looser piece bound), 11 rejected, none to rows. Graduated row "Large PDF range check".
