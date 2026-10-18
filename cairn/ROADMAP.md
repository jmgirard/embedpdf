# Roadmap

_The only authority on milestone status. Grouped by status, not ID._
_Last hygiene check: 2026-10-18 (M002 done and archived; "Self-contained embeds" row graduated; "Self-contained native checks" row added)_

## Milestones

| ID | Title | Status | Depends on | Priority | File/Archive |
|---|---|---|---|---|---|
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
- Self-contained no-JS link: with JavaScript disabled, the fallback link and the `button` link in a self-contained page point at the separate PDF file, which is not shipped, because Quarto inlines `data-src` but not `<a href>` (M002 plan) — added 2026-10-18
- Self-contained native checks: in a self-contained page the native `<object>` gets a `blob:` PDF, but only its bytes are checked (fetch in Chromium). Its display in desktop Safari and Firefox, `#page=` on a `blob:` URL, and the file name that the native viewer's own save button uses are not checked (M002 review) — added 2026-10-18
- Self-contained slides on iOS: check self-contained RevealJS slides in Safari on iPhone and iPad with `tests/ios_check.mjs`; M002 checks them only in Chrome or Chromium (M002 plan) — added 2026-10-18
- GitHub releases for v1.0.x: publish GitHub releases for tags v1.0.0 to v1.0.2 so the README version badge is current — added 2026-10-18 — DESIGN Known issues
- Screen-reader text layer: add a hidden PDF.js text layer so screen readers can read PDF.js embeds (GP1 allows it) — added 2026-10-18 — DESIGN Known issues
- Check script gaps: `render_check.mjs` checks ink over all canvases at once, not pages per embed; both scripts sample only the red channel of every 100th pixel; `serve_docs.mjs` lacks some content types and HTTP Range requests; `ios_check.mjs` uses a fixed port and crashes on EADDRINUSE (M001 review) — added 2026-10-18
- [low] First-paint robustness: find load cases where an on-screen page still does not render after the v1.0.1 and v1.0.2 fixes. Since M001, `auto` puts iPhone and iPad on this timer path, and `ios_check.mjs` scrolls before it measures, so a no-scroll first paint on iOS is untested (M001 review) — added 2026-10-18 — DESIGN Known issues
- [low] Apple touch detection edge cases: `isAppleMobile()` treats any Macintosh user agent with `maxTouchPoints > 1` as an iPad, which may also catch Safari on visionOS or a Mac with a third-party touch driver; not verified (M001 review) — added 2026-10-18
