# Roadmap

_The only authority on milestone status. Grouped by status, not ID._
_Last hygiene check: 2026-10-18 (triage: promoted to high "Check script gaps", "Remote check gaps", "Name check gaps", "Text check gaps", "Embed name gaps"; parked "Self-contained no-JS link", "Eager text cost", "Screen-reader text gaps"; Known issue on the self-contained no-JavaScript link split in two; no drops, no decision entry; validate green)_

## Milestones

| ID | Title | Status | Depends on | Priority | File/Archive |
|---|---|---|---|---|---|
| M005 | Screen-reader names | done | — | normal | milestones/archive/M005-screen-reader-names.md |
| M004 | Screen-reader text | done | — | normal | milestones/archive/M004-screen-reader-text.md |
| M003 | Remote PDFs on phones | done | — | normal | milestones/archive/M003-remote-pdfs-on-phones.md |
<!-- rows grouped by status, not sorted by ID; keep only the 3 most recent
     terminal (done or dropped) rows — older ones live in milestones/archive/ + git -->

## Candidates
<!-- unnumbered ideas; one line each, ordered high → normal → low:
     - [high] short title: detail — added YYYY-MM-DD — links
     - short title: detail — added YYYY-MM-DD — links
     the opening token is `[high]`/`[low]` or absent (`normal`) — tracking-rules "Candidate priority token";
     open each row with its short title, the words the cairn pane shows, then `: `;
     tracking-rules "Candidate short title" has the whole rule -->
- [high] Check script gaps: `render_check.mjs` checks ink over all canvases at once, not pages per embed; both scripts sample only the red channel of every 100th pixel; `serve_docs.mjs` lacks some content types and HTTP Range requests; `ios_check.mjs` uses a fixed port and crashes on EADDRINUSE (M001 review) — added 2026-10-18
- [high] Remote check gaps: see "Check script gaps". `pointPdfsAt` (tests/serve_docs.mjs) resolves paths against the remote root (pages in a docs/ subfolder would 404), skips single-quoted or unquoted attributes and `.pdf?`/`#` URLs, and rewrites every `href="*.pdf"`; `serveRemote` has no Range or OPTIONS handling; a same-origin 404 (a missing local PDF) is not exercised; `ios_check --remote` on a self-contained page fails with an unclear message (M003 review) — added 2026-10-18
- [high] Name check gaps: see "Check script gaps". `--plant dupdesc` plants only in the zoom-in button, not the download link, and no plant removes `role="group"`; `revealjs_test.html` (several PDFs) gets no `--expect-name` line; without `--expect-text`, `nameFailures` on a slide runs with no hydration wait (it fails loudly, not silently); file names with a malformed or literal `%` are untested (M005 review) — added 2026-10-18
- [high] Text check gaps: see "Check script gaps". The `--expect-text` style checks do not cover `inert`, `opacity`, or `content-visibility`, and iOS has no tree check to catch them; a canvas snapshot that is null for any reason counts as hidden; the text wait ends at once on a slide with no embed hydrated or pending (the embed-count check then fails with a less clear message); the 10 s text wait covers the whole shared queue, so a long deck can time out; with `--expect-text` a broken deck can take minutes to fail (M004 review) — added 2026-10-18
- [high] Embed name gaps: see "Screen-reader text gaps". Two PDF.js embeds of one file get the same "PDF: <file name>" name and the same page groups; a query-style URL (`download.php?file=a.pdf`) or a bare host names the embed by the script or host; on a self-contained page with no download link the name is the made-up "document.pdf", and an inlined `href` would give a base64 name; the toolbar page indicator "1 / 2" has no label; Safari and VoiceOver handling of a `title`-only control name over `aria-hidden` content is not checked (M005 review) — added 2026-10-18
- Safari shared remote URL: in Safari (seen in an iOS 27.0 iPhone simulator), a PDF.js embed fails ("Load failed") when an `<object>` on the same page, such as a `renderer=native` embed, shows the same PDF from another site, even when that site sends `Access-Control-Allow-Origin: *`. A fix might fetch the PDF with its own request (M003 implement) — added 2026-10-18
- Inlined PDF failure link: on a self-contained page, a PDF.js failure links "Open the PDF" to a `blob:` URL with no file name (untested, and fragile on `file://` pages and in iOS Safari), and a failed `data:` decode in `inlinedPdf()` runs outside the failure path, so it keeps the dead no-JS link (M003 review) — added 2026-10-18
- Self-contained native checks: in a self-contained page the native `<object>` gets a `blob:` PDF, but only its bytes are checked (fetch in Chromium). Its display in desktop Safari and Firefox, `#page=` on a `blob:` URL, and the file name that the native viewer's own save button uses are not checked (M002 review) — added 2026-10-18
- Self-contained slides on iOS: check self-contained RevealJS slides in Safari on iPhone and iPad with `tests/ios_check.mjs`; M002 checks them only in Chrome or Chromium (M002 plan) — added 2026-10-18
- GitHub releases for v1.0.x: publish GitHub releases for tags v1.0.0 to v1.0.2 so the README version badge is current — added 2026-10-18 — DESIGN Known issues
- Native embed name: a native `<object>` embed has no accessible name naming its file, while M005 names PDF.js embeds "PDF: <file name>"; how each browser's built-in viewer exposes a name is not checked (M005 plan) — added 2026-10-18
- [low] First-paint robustness: find load cases where an on-screen page still does not render after the v1.0.1 and v1.0.2 fixes. Since M001, `auto` puts iPhone and iPad on this timer path, and `ios_check.mjs` scrolls before it measures, so a no-scroll first paint on iOS is untested (M001 review) — added 2026-10-18 — DESIGN Known issues
- [low] Apple touch detection edge cases: `isAppleMobile()` treats any Macintosh user agent with `maxTouchPoints > 1` as an iPad, which may also catch Safari on visionOS or a Mac with a third-party touch driver; not verified (M001 review) — added 2026-10-18
- [parked] Self-contained no-JS link: with JavaScript disabled, the fallback link and the `button` link in a self-contained page point at the separate PDF file, which is not shipped, because Quarto inlines `data-src` but not `<a href>`. In Quarto 1.10.19 a shortcode sees no `embed-resources` setting in its metadata or `PANDOC_WRITER_OPTIONS`, so the shortcode cannot tell such a page apart (M002 plan; M005 plan probe) — added 2026-10-18
- [parked] Eager text cost: see "First-paint robustness". Reading every page's hidden text at load keeps each PDF.js page object and its worker fonts (no `page.cleanup()`), and a page render can wait behind one text read. Memory and first-paint delay were not measured on a constrained phone or with a long PDF. The plan's alternative was text only for rendered pages; a measured memory failure or first-paint delay is the evidence for it (M004 review) — added 2026-10-18
- [parked] Screen-reader text gaps: browser find-in-page may match the hidden page text (not checked). Hidden text joins PDF.js items with no added space, but PDF.js 6.1.200 adds space items itself for gaps: an M005 plan probe in Chromium read positioned words, two columns, and a `TJ` gap with spaces, and only a 2 pt gap at 12 pt and a text rise joined with none. A real PDF whose hidden text runs words together is the evidence for a fix (M004 review; narrowed 2026-10-18 by M005) — added 2026-10-18
