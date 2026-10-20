# M019: Large PDF text check

**Status:** done (2026-10-19, PR #27 https://github.com/jmgirard/embedpdf/pull/27)

**Goal:** Replace `files/large.pdf` and its copy with a 14-page PDF over 131,072 bytes whose pages each hold a phrase no other page holds, so the large-PDF check lines also check the hidden page text of a PDF that PDF.js loads by byte ranges.

**Outcome:** Test-only, no extension version change. New `files/large-source.md`: 14 parts split at lines of only
`\newpage`, each headed by a phrase no other page holds ("Harbor Lights at Dawn" … "Lantern Room Logbook", no
fi/fl/ff ligatures). New `tests/make_large_pdf.sh <out.pdf>`: renders each part apart with `quarto pandoc` and
LuaLaTeX (one whole render was 25,999 bytes), joins them with `pdfunite`, and fails unless there are 14 parts,
each part is one page, and the PDF is over 131,072 bytes. `files/large.pdf` and `files/large-2.pdf` are now
that PDF (142,962 bytes, 14 pages). The 13 `large_test.html` and `shared_test.html` byte-range lines in CLAUDE.md
take `--expect-text` with the 14 headings; the `--cpu-throttle 70` line does not. CLAUDE.md gives the rebuild
command (build, copy, `quarto render`) and the phrase rule for `--expect-text`. All 14 lines exit 0 in Chromium
155 and the iOS 27.0 simulators; `--plant swap` fails in both scripts.

**Decisions:** none promoted. Plan chose replacing `large.pdf` over adding a third large PDF, and kept 14 pages.

**Review:** one pass, four lenses (diff-bug, blame-history, prior-review, ripple), no returns. 16 findings:
6 fixed (script page checks per part and on a `pdfinfo` failure, rebuild needs `quarto render`, `lualatex` need,
stale `--expect-text` phrase-source text), 10 rejected, none to rows. Graduated row "Large PDF text check".
