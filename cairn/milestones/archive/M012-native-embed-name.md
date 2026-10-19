# M012: Native embed name

**Status:** done (2026-10-19, PR #20 https://github.com/jmgirard/embedpdf/pull/20)

**Goal:** Screen readers name each native-viewer embed the way they name PDF.js embeds, "PDF: <file name>", numbered across both renderers.

**Outcome:** v1.2.4. `embedpdf-viewer.js` `hydrateNative()` sets the embed's name as the `<object>`'s `aria-label`, no
`title`; `embedNames()` names and numbers every embed with a `data-src`, native or PDF.js, so "(k of n)" counts both
(desktop example.html: "(1 of 11)"–"(11 of 11)"). render_check, safari_check, and ios_check: `--expect-name` covers native
embeds in page order (one name stands for `--expect-native` plus the PDF.js count); `--expect-native` added to
safari_check and ios_check; plants `nativename`, `nativetitle` (all three), `nativedesc` (render_check). CLAUDE.md check
lines, README, DESIGN Architecture, and "Still unverified" updated. Checked in Chromium 155 (tree role PluginObject),
desktop Safari 27.0.1 (computed label), and the iOS 27.0 iPhone and iPad simulators (page DOM).

**Decisions:** none promoted. Plan: `aria-label` on the `<object>` over a `role="group"` wrapper or a `title`; numbering
across both renderers over numbering each apart; 1.2.4 with no tag.

**Review:** one pass, four lenses; criteria audit (6 findings) at plan and claim audit (55 claims, 3 corrected) at
implement. 18 findings: 7 fixed (title plants in ios_check and safari_check, `nativedesc` plant, safari_check count
check, an error message, README order, DESIGN and comment wording), 5 to the new row "Native name check gaps", 6
rejected. Graduated row "Native embed name".
