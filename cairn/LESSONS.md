# Lessons

Durable repo lessons — build quirks, testing tricks, gotchas worth
remembering next time — captured at milestone end and surfaced at plan time.
Not status, not decisions: a lesson is a reusable "how this repo actually
behaves" note. Cross-cutting *choices* still go to `DECISIONS.md`.

One line per lesson: `- YYYY-MM-DD (M<NNN>): <lesson>`. Two caps: 50 lines
and 20,000 bytes; over either, retire or prune before adding. Corrected in
place when proven false (never append a correction).

- 2026-10-18 (M001): `xcodebuild -downloadPlatform iOS` with Xcode 27.1 installs two runtimes: iOS 27.1 supports only the "iPhone Duo" device type, and the standard iPhones and every iPad need the iOS 27.0 runtime. Check `xcrun simctl list runtimes -j` (supportedDeviceTypes) before `simctl create`.
