# Roadmap

_The only authority on milestone status. Grouped by status, not ID._
_Last hygiene check: 2026-10-18 (M003 done and archived; rows "Safari shared remote URL", "Remote check gaps", "Inlined PDF failure link" added)_

## Milestones

| ID | Title | Status | Depends on | Priority | File/Archive |
|---|---|---|---|---|---|
| M004 | Screen-reader text | review | — | normal | milestones/M004-screen-reader-text.md |
| M003 | Remote PDFs on phones | done | — | normal | milestones/archive/M003-remote-pdfs-on-phones.md |
| M002 | Self-contained embeds | done | — | high | milestones/archive/M002-self-contained-embeds.md |
| M001 | iOS Safari check | done | — | high | milestones/archive/M001-ios-safari-check.md |
<!-- rows grouped by status, not sorted by ID; keep only the 3 most recent
     terminal (done or dropped) rows — older ones live in milestones/archive/ + git -->

## Candidates
<!-- unnumbered ideas; one line each, ordered high → normal → low:
     - [high] short title: detail — added YYYY-MM-DD — links
     - short title: detail — added YYYY-MM-DD — links
     the opening token is `[high]`/`[low]` or absent (`normal`) — tracking-rules "Candidate priority token";
     open each row with its short title, the words the cairn pane shows, then `: `;
     tracking-rules "Candidate short title" has the whole rule -->
- Safari shared remote URL: in Safari (seen in an iOS 27.0 iPhone simulator), a PDF.js embed fails ("Load failed") when an `<object>` on the same page, such as a `renderer=native` embed, shows the same PDF from another site, even when that site sends `Access-Control-Allow-Origin: *`. A fix might fetch the PDF with its own request (M003 implement) — added 2026-10-18
- Inlined PDF failure link: on a self-contained page, a PDF.js failure links "Open the PDF" to a `blob:` URL with no file name (untested, and fragile on `file://` pages and in iOS Safari), and a failed `data:` decode in `inlinedPdf()` runs outside the failure path, so it keeps the dead no-JS link (M003 review) — added 2026-10-18
- Remote check gaps: see "Check script gaps". `pointPdfsAt` (tests/serve_docs.mjs) resolves paths against the remote root (pages in a docs/ subfolder would 404), skips single-quoted or unquoted attributes and `.pdf?`/`#` URLs, and rewrites every `href="*.pdf"`; `serveRemote` has no Range or OPTIONS handling; a same-origin 404 (a missing local PDF) is not exercised; `ios_check --remote` on a self-contained page fails with an unclear message (M003 review) — added 2026-10-18
- Self-contained no-JS link: with JavaScript disabled, the fallback link and the `button` link in a self-contained page point at the separate PDF file, which is not shipped, because Quarto inlines `data-src` but not `<a href>` (M002 plan) — added 2026-10-18
- Self-contained native checks: in a self-contained page the native `<object>` gets a `blob:` PDF, but only its bytes are checked (fetch in Chromium). Its display in desktop Safari and Firefox, `#page=` on a `blob:` URL, and the file name that the native viewer's own save button uses are not checked (M002 review) — added 2026-10-18
- Self-contained slides on iOS: check self-contained RevealJS slides in Safari on iPhone and iPad with `tests/ios_check.mjs`; M002 checks them only in Chrome or Chromium (M002 plan) — added 2026-10-18
- GitHub releases for v1.0.x: publish GitHub releases for tags v1.0.0 to v1.0.2 so the README version badge is current — added 2026-10-18 — DESIGN Known issues
- Screen-reader text layer: add a hidden PDF.js text layer so screen readers can read PDF.js embeds (GP1 allows it) — added 2026-10-18 — DESIGN Known issues — started M004
- Check script gaps: `render_check.mjs` checks ink over all canvases at once, not pages per embed; both scripts sample only the red channel of every 100th pixel; `serve_docs.mjs` lacks some content types and HTTP Range requests; `ios_check.mjs` uses a fixed port and crashes on EADDRINUSE (M001 review) — added 2026-10-18
- Eager text cost: see "First-paint robustness". Reading every page's hidden text at load keeps each PDF.js page object and its worker fonts (no `page.cleanup()`), and a page render can wait behind one text read. Memory and first-paint delay were not measured on a constrained phone or with a long PDF. The plan's alternative was text only for rendered pages; a measured memory failure or first-paint delay is the evidence for it (M004 review) — added 2026-10-18
- Screen-reader text gaps: hidden page text joins PDF.js items with no added space, so multi-column or positioned text may run words together; every embed labels its pages "Page i of n" with no file name, and the embed has no accessible name; browser find-in-page may match the hidden text; the toolbar controls carry the same `title` and `aria-label`, which some screen readers may read twice. None checked (M004 review) — added 2026-10-18
- Text check gaps: see "Check script gaps". The `--expect-text` style checks do not cover `inert`, `opacity`, or `content-visibility`, and iOS has no tree check to catch them; a canvas snapshot that is null for any reason counts as hidden; the text wait ends at once on a slide with no embed hydrated or pending (the embed-count check then fails with a less clear message); the 10 s text wait covers the whole shared queue, so a long deck can time out; with `--expect-text` a broken deck can take minutes to fail (M004 review) — added 2026-10-18
- [low] First-paint robustness: find load cases where an on-screen page still does not render after the v1.0.1 and v1.0.2 fixes. Since M001, `auto` puts iPhone and iPad on this timer path, and `ios_check.mjs` scrolls before it measures, so a no-scroll first paint on iOS is untested (M001 review) — added 2026-10-18 — DESIGN Known issues
- [low] Apple touch detection edge cases: `isAppleMobile()` treats any Macintosh user agent with `maxTouchPoints > 1` as an iPad, which may also catch Safari on visionOS or a Mac with a third-party touch driver; not verified (M001 review) — added 2026-10-18
