# M003: Remote PDFs on phones

**Status:** done (2026-10-18, PR #11 https://github.com/jmgirard/embedpdf/pull/11; resolves #2 closes, #8 closes)

**Goal:** When the PDF.js viewer cannot load a PDF from another site, the embed tells the reader so and links to the PDF, and the docs say what such a site must send.

**Outcome:** v1.1.1. `embedpdf-viewer.js` `showFailure()`: when the PDF.js import, the inlined Blob read, `getDocument`, or
`getPage(1)` fails, the embed shows "This PDF cannot be shown here." and an "Open the PDF" link (`target="_blank"`),
keeps `width`, and frees a loaded document; CSS `.embedpdf-failed`. README "Known limitations" and the example.qmd
section "PDFs on Another Site" explain `Access-Control-Allow-Origin` (checked only with `*`). `serve_docs.mjs` gained
`serveRemote` and `pointPdfsAt`; `render_check.mjs` gained `--remote blocked|cors|missing`, `--expect-failed`, an
emulated `android` device, console errors in its JSON, and checks that each failure shows its PDF.js error kind;
`ios_check.mjs` gained `--remote blocked`. Checked in Chromium 155 and iOS 27.0 iPhone and iPad simulators.

**Decisions:** D-004 (annotates IP1: a PDF whose site blocks cross-site reads is outside IP1; the link is IP2's
fallback). Run decisions: Chromium via `CHROME_PATH`; no `ios_check --remote cors` (Safari fails a PDF.js fetch of a
URL an `<object>` on the page already loaded). AC5 amended once (the header requirement, not only `*`).

**Review:** one pass, three lenses (diff-bug, blame-history, prior-review). 24 findings: 11 fixed on the branch
(failure-cause checks, flags that could pass silently, button links on the remote server, `width`, document cleanup,
doc wording, CLAUDE.md lines and "Still unverified"), 6 to candidate rows ("Remote check gaps", "Inlined PDF failure
link"), 7 rejected (4 against planned choices). Implement added candidate row "Safari shared remote URL".
