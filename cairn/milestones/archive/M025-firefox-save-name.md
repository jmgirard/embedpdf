# M025: Firefox saves inlined PDFs under their file name

**Status:** done (2026-10-20, PR #33 https://github.com/jmgirard/embedpdf/pull/33)

**Goal:** On `selfcontained_test.html` and `selfcontained_slides_test.html`, Firefox's built-in PDF viewer saves the inlined PDF of each native embed as `sample.pdf`.

**Outcome:** Version 1.2.9. `inlinedPdf` wraps the decoded PDF in a `File` named by the embed's download
name (`opts.filename`; a Blob where `File` is not a constructor), in every browser. Firefox 158's viewer
then reports `sample.pdf` (was `document.pdf`), and six hand saves in a Firefox window (3 embeds, file and
HTTP) gave `sample.pdf`. Chromium still saves `<blob id>.pdf`, Safari `Unknown.pdf`. New
`save_name_check.mjs --browser firefox`: reads `PDFViewerApplication._docFilename` in the one frame whose
address is the embed's (others removed), no file saved, no bytes read; file-name entries only; plants
wrongname and nosave. On a RevealJS deck the check shows the slide of each embed. Four CLAUDE.md lines;
README, DESIGN Known issues, CLAUDE.md "Still unverified" updated.

**Decisions:** none promoted; `File` in every browser over a `#filename=` fragment or a Firefox-only
`File`; a mode of save_name_check.mjs over a new script.

**Review:** two passes, one return (AC4: CLAUDE.md passages lacked both names and the date), no criterion
amendments. Pass 1 four lenses, 22 findings: 11 fixed (Firefox frame lookup on shared addresses, unused
byte fetch, late deck address, stale 1.2.8 lines, doc scope), 4 to the new row "Close the Firefox save
check gaps" (no bytes, reported name only, `%2F` in a `File` name), 7 rejected. Pass 2 (delta) two
lenses, 4 findings: 2 fixed, 2 rejected. Claim audit 50 claims, 6 corrected. The Safari HTTP save line
counts from its earlier pass: the user asked the run to stop using Safari. Hygiene deleted the row
"Name inlined PDFs in Firefox's viewer".
