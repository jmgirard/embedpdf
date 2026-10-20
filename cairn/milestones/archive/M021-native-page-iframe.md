# M021: Native embeds open at their page in Safari

**Status:** done (2026-10-20, PR #29 https://github.com/jmgirard/embedpdf/pull/29)

**Goal:** A native embed whose `page` option is over 1 opens at that page in desktop Safari, as it already does in Chromium and Firefox.

**Outcome:** Viewer 1.2.7. `frameAllowed()` makes a native embed with `page` > 1 (where `nativeSupported()`) an
`<iframe>` for an inlined PDF, or for a PDF on the page's own non-opaque origin (`self.origin`) whose HEAD
answer comes within 5 s, OK, from that origin, `application/pdf`, not `attachment`; else `<object>` as in
v1.2.6. The `<iframe>` gets width, height, `aria-label`, no title, no border, `allowfullscreen`; the no-JS
fallback sits hidden beside it (`div.embedpdf-fallback`). New `page_test.qmd`; new
`tests/frame_rule_check.mjs` (12 server answers, 8 plants, `--slow-head`). `native_check.mjs` checks
element, border, box, hidden fallback, compares with a reference of the expected element, runs on normal
pages, drops `--same-pages`; plants `object`, `border`, `fallback`. render_check, safari_check (now takes
`--expect-pdfjs 0`), ios_check read `<iframe>` embeds; render_check and ios_check fail a non-`<object>` native
embed on phones. README `page` row, DESIGN, CLAUDE.md (102 run lines), PROFILE updated.

**Decisions:** D-007 (iframe for page > 1), superseded by D-008 (iframe only when the server's answer allows it),
chosen by the user at review after a probe showed an `<iframe>` downloads a PDF sent as a download.

**Review:** two passes, four lenses each, one defect return (diff-bug: iframe downloads octet-stream and
attachment PDFs), one substantive amendment (Scope header rule, AC6 reworded at the user's stop, AC7 added).
54 findings: 1 returned, 31 fixed, 9 to row "Check embeds open at their page option", 13 rejected. Claim
audits 81 and 74 claims, 5 and 9 corrected. Graduated row "Make Safari native embeds honor page".
