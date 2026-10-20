# M024: Safari names in the iOS simulators

**Status:** done (2026-10-20, PR #32 https://github.com/jmgirard/embedpdf/pull/32)

**Goal:** Safari in the iOS 27.0 iPhone and iPad simulators is checked for the names it gives embeds, toolbar controls, and the page indicator, through `tests/safari_check.mjs --target simulator`.

**Outcome:** safaridriver opened no session in the simulators: no Remote Automation switch exists there, and
the `com.apple.webinspectord` keys, a reboot, and Xcode 27.1's DeviceHub window did not help (first cut
stopped at T1; re-cut 2026-10-20). New `tests/webinspector.mjs` (Node built-ins only): binary plist codec
and framing, the socket from `simctl getenv <udid> RWI_LISTEN_SOCKET`, Safari's page found by its tokened
address, calls wrapped in `Target.sendMessageToTarget`, names from `DOM.getAccessibilityPropertiesForNode`.
`safari_check.mjs --target simulator` opens `<page>?run=<token>` with `simctl openurl`, waits for the
load, and runs the same checks as `--target mac` (still safaridriver); a shut-down simulator exits 2.
Four CLAUDE.md lines (example.html, page_test.html on both simulators); README item, CLAUDE.md "Still
unverified", helper list, PROFILE verify slot, and the M010 lesson updated. helpers_test gains plist cases.

**Decisions:** none promoted; Web Inspector socket over a docs-only correction, and the safaridriver
simulator path replaced, not kept (user, at the re-cut question set).

**Review:** one review return (README did not name the two pages; T5). Claim audit 32 claims, 4 corrected.
Four lenses, 27 findings: 12 fixed (mac session left open and navigation exit code, unreadable message
crash, provisional page target, wrapper errors, plist bounds and object limit, codec tests, README wording,
native_check comment), 2 at hygiene (row "Check Safari names in iOS simulators" deleted; "Close the name
and indicator check gaps" narrowed), 6 to row "Harden the Web Inspector check client", 7 rejected.
