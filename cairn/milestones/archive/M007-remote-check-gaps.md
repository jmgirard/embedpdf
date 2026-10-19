# M007: Remote check gaps

**Status:** done (2026-10-18, PR #15 https://github.com/jmgirard/embedpdf/pull/15)

**Goal:** Close the gaps that the M003 review found in the remote-PDF checks of `tests/serve_docs.mjs`, `tests/render_check.mjs`, and `tests/ios_check.mjs`.

**Outcome:** No extension version change. `pointPdfsAt(html, base, page)` rewrites the double-quoted `data-src` of
`<div class="embedpdf">` and the `href` of `<a download>`, resolved against the page's folder, keeping `?`/`#`.
New `embedSrcsOffRemote` and `docsFile`: both scripts exit 2 before a browser or simulator opens when `--remote`
meets an embed whose PDF cannot move (the `data:` URLs of a self-contained page). `serveRemote` sends through
`sendData` (single byte ranges), answers OPTIONS 204, and exposes `Accept-Ranges`/`Content-Range` in cors and
missing modes. New `serveDocs({ missingPdfs })` and a `--missing-pdfs` flag (no value) in both scripts: each
non-native embed must show the load-failure state for an own-origin URL, with one PDF.js `ResponseException`
"failed to render <data-src>" line per embed. ios_check's parser now keeps flag values apart from flags. CLAUDE.md
gains 5 check lines and a "Still unverified" entry. helpers_test 85 cases. Checked in Chromium 155 and the iOS 27.0
iPhone and iPad simulators.

**Decisions:** none promoted. Plan: rewrite only the shortcode's double-quoted form (user), run the 404 check in
Chrome and iOS (user), text rewrite of served HTML over puppeteer interception.

**Review:** one pass, four lenses (diff-bug, blame-history, prior-review, ripple). 31 findings: 19 fixed on the
branch (per-embed 404 line count, ios parser, `--expect-failed`/`--expect-embeds` above 0, page-path URL, preflight
on `?` and folders, message, headers), 2 to rows "Remote rewrite quoting" and "Large PDF range check", new row
"Remote failure line count", 10 rejected. Graduated row "Remote check gaps"; corrected the M003 Safari lesson.
