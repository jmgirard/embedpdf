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
- 2026-10-18 (M002): A PDF.js embed on a RevealJS slide that is not shown renders nothing (its pages have width 0), so a render check must go to each slide with `Reveal.slide()` before it measures ink; scrolling the window does not move slides.
