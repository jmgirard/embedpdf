# M001: iOS Safari check

**Status:** done (2026-10-18, PR #9 https://github.com/jmgirard/embedpdf/pull/9; resolves #3 closes)

**Goal:** Every page of an embed with `renderer=auto` is readable in Safari on iPhone and iPad, shown by a repeatable iOS Simulator check.

**Outcome:** v1.0.3. `isAppleMobile()` in `embedpdf-viewer.js` (iPhone/iPod/iPad user agent, or a Macintosh user agent
with `maxTouchPoints > 1`) makes `renderer=auto` use PDF.js on iPhone and iPad; elsewhere `auto` still follows
`navigator.pdfViewerEnabled`. New `tests/ios_check.mjs` serves `docs/`, injects a probe into Safari in an iOS simulator
via `simctl openurl`, and checks renderer, page containers and ink per embed (`--plant blank|missing` proves it can fail;
per-run report token). `tests/render_check.mjs` gained `--device iphone|ipad|mac-safari|windows-touch`,
`--expect-native/--expect-pdfjs`, page-path mode, and fails on a bad load, 0 hydrated embeds, or unknown flags. New
`tests/serve_docs.mjs` (Node static server) replaces `python3 -m http.server`, which reset parallel connections.
`_quarto.yml` renders only `*.qmd`. Baseline: Safari on iOS 27.0/27.1 reports `pdfViewerEnabled` true and its native
viewer reached every page in an iOS 27.1 iPhone run; the user kept the PDF.js switch for older iOS (#3).

**Decisions:** none promoted. Run decisions: Chromium 155 via `CHROME_PATH` stands in for Google Chrome; the user chose
"keep the switch" after the plan's falsifier fired on iOS 27; AC3/AC4 reworded to "Chrome or Chromium".

**Review:** two passes. Pass 1 routed an AC3/AC4 amendment return (instrument wording). Pass 2: all six criteria verified;
three lenses (diff-bug, blame-history, prior-review: no evidence); 12 fixed (stale reports, wrong-page false green,
ignored flags, server escape and path checks, simulator lookup, doc claim scope, "Still unverified"), 2 rejected
(patch-version default change was planned; error-free pass not in AC1), 7 to candidate rows ("Check script gaps",
"First-paint robustness", "Apple touch detection edge cases", "Self-contained embeds"). Found a pre-existing
self-contained-page bug ("Self-contained embeds" row).
