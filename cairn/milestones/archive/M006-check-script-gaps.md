# M006: Check script gaps

**Status:** done (2026-10-18, PR #14 https://github.com/jmgirard/embedpdf/pull/14)

**Goal:** Close the four gaps that the M001 review found in `tests/render_check.mjs`, `tests/ios_check.mjs`, and `tests/serve_docs.mjs`.

**Outcome:** No extension version change. `render_check.mjs` checks each `.embedpdf-page` of each PDF.js embed on
every run ("ok", "no canvas", "no ink", "unreadable (…)"), with new plants `blank`, `nocanvas`, `nopages`, and reads
its DOM in one snapshot before any await. New `tests/ink.mjs` `inkInPixels()` (a pixel with alpha above 0 and a
channel below 250, over every pixel) is the one ink rule: render_check rebuilds it with `new Function`, and ios_check
inlines its source into the probe. `serveDocs` adds `.ttf`, `.eot`, `.map`, `.yml` types, Content-Length,
Accept-Ranges, single `bytes=a-b` / `bytes=a-` ranges (206, 416, invalid ranges ignored), and `listen()` rejects
on a listen error; both scripts exit 2 with a message when a server cannot start. ios_check `--port` defaults to 0
(free port), digits only. New `tests/helpers_test.mjs` (37 cases). CLAUDE.md and PROFILE.md `verify` name it.
Checked in Chromium 155 and the iOS 27.0 iPhone and iPad simulators.

**Decisions:** none promoted. Plan chose server-only range support (user), a free default port (user), and one
shared ink rule over two fixed copies. AC4 was amended once, at the user's choice, to one concrete port run: on macOS
a holder on `0.0.0.0` or `::` does not block a bind on 127.0.0.1.

**Review:** two passes, four lenses each (diff-bug, blame-history, prior-review, ripple). Pass 1: 29 findings, 13
fixed, 7 to new row "Ink check follow-ups" or row "Remote check gaps", 8 rejected, 1 AC4 amendment. Pass 2: 21
findings, 9 fixed, 6 rejected, 6 already filed or done at hygiene. Graduated row "Check script gaps"; rows "Remote
check gaps", "Name check gaps", "Text check gaps" re-pointed to "Ink check follow-ups".
