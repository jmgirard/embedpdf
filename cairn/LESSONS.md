# Lessons

Durable repo lessons — build quirks, testing tricks, gotchas worth
remembering next time — captured at milestone end and surfaced at plan time.
Not status, not decisions: a lesson is a reusable "how this repo actually
behaves" note. Cross-cutting *choices* still go to `DECISIONS.md`.

One line per lesson: `- YYYY-MM-DD (M<NNN>): <lesson>`. Two caps: 50 lines
and 20,000 bytes; over either, retire or prune before adding. Corrected in
place when proven false (never append a correction).

- 2026-10-18 (M001): `xcodebuild -downloadPlatform iOS` with Xcode 27.1 installs two runtimes: iOS 27.1 supports only the "iPhone Duo" device type, and the standard iPhones and every iPad need the iOS 27.0 runtime. Check `xcrun simctl list runtimes -j` (supportedDeviceTypes) before `simctl create`.
- 2026-10-18 (M002): With `embed-resources: true`, Quarto 1.10 inlines module scripts as `data:` URLs (its tabsets scripts too), a script of unknown type as its text, and each `data-src` as a `data:` URL, and adds `role="img"` to elements whose `data-src` it inlined. It leaves `<a href>` targets at the file.
- 2026-10-18 (M003): Safari reports a failed PDF.js fetch only as "UnknownErrorException: Load failed" (a CORS block and a module-import failure differ only in the message), while Chromium logs UnknownErrorException for a CORS block and ResponseException for a 404. A check of a failure's cause reads the viewer's own "embedpdf: failed to render <url>" line, not any console CORS line: render_check's native `<object>` fetch logs CORS errors of its own.
- 2026-10-18 (M004): Puppeteer's `page.accessibility.snapshot({ root })` with the default `interestingOnly: true` returns a labeled group's child text node, not the group, so a role or name check needs `interestingOnly: false`. In Chromium a `<canvas>` without `aria-hidden` shows in that tree as role `none`.
- 2026-10-18 (M004): Quarto's self-contained render passes the inlined viewer through esbuild, which drops comments, so a comment-only change to `embedpdf-viewer.js` changes the docs/ library copies but not the self-contained pages.
- 2026-10-18 (M002): A PDF.js embed on a RevealJS slide that is not shown renders nothing (its pages have width 0), so a render check must go to each slide with `Reveal.slide()` before it measures ink; scrolling the window does not move slides.
