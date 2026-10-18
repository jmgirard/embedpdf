# M002: Self-contained embeds

**Status:** done (2026-10-18, PR #10 https://github.com/jmgirard/embedpdf/pull/10)

**Goal:** A page or slide deck rendered with `embed-resources: true` shows its embeds inline from that one file, in the browsers that AC2, AC3, and AC6 name.

**Outcome:** v1.1.0. `embedpdf.lua` adds an `embedpdf-pdfjs` dependency (PDF.js as scripts of types
`text/x-embedpdf-pdfjs` and `text/x-embedpdf-worker`) at the first embed not set to `renderer=native`; the viewer
dependency no longer ships PDF.js as `resources`. The viewer loads PDF.js from those scripts (their `src`, or a
`blob:` URL of the text Quarto inlines) and no longer uses `import.meta.url`. For a `data:` PDF in `data-src` it
decodes with `fetch`, keeps one Blob, gives the native `<object>` and the fallback, toolbar, and `button` links its
`blob:` URL, removes Pandoc's `role="img"` and the `data-src` text, and catches failures per embed. New test pages
`selfcontained_test.qmd` and `selfcontained_slides_test.qmd`; `render_check.mjs` gained `--alone http|file`,
`--expect-pages`, `--expect-links`, and Reveal slide stepping; `ios_check.mjs` gained `--alone yes`; `serve_docs.mjs`
a `root` option. Checked in Chromium 155 (HTTP and `file://`, 5 devices) and iOS 27.0 iPhone and iPad simulators.

**Decisions:** D-002 (self-contained pages carry PDF.js inline; GP5 narrowed, IP2 reworded), D-003 (annotates
D-002: the no-JavaScript link in a self-contained page is dead). Run decisions: Chromium via `CHROME_PATH`; version
1.1.0; AC1 module-script clause reworded once (Quarto's tabsets scripts are modules too).

**Review:** one pass, three lenses (diff-bug, blame-history, prior-review). 24 findings: 18 fixed on the branch
(per-embed catch, memory, `role="img"`, log size, file names, test-script path checks, temp-dir cleanup, empty
`--expect-pages`, iOS probe placement, wider CLAUDE.md checks), 4 to candidate rows ("Self-contained native checks",
"Self-contained no-JS link"), 2 rejected (missing PDF only warns; missing PDF.js script unreachable). Graduated the
"Self-contained embeds" row.
