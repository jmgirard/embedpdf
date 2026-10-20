# M022: Native embeds on self-contained slides checked

**Status:** done (2026-10-20, PR #30 https://github.com/jmgirard/embedpdf/pull/30)

**Goal:** A check shows that each native embed on the self-contained RevealJS slides shows its in-page PDF, at the page its `page` option names, in Chromium, Firefox, and desktop Safari.

**Outcome:** Viewer 1.2.8. `hydrateNative` gives a framed embed (`page` > 1, D-008) its `src` only once the
`<iframe>` has a box (ResizeObserver; at once where ResizeObserver is missing). On v1.2.7 such an `<iframe>`
on a slide RevealJS did not display at load opened at page 1 in Chromium 155 and shrunk in desktop Safari
27.0.1. `tests/native_check.mjs` on a deck sets Reveal min/max scale to 1, shows each native embed's slide
(uncounted ones too), waits up to 5 s for an `<iframe>` address, fails an embed not on the current slide,
plants on a deck when the walk reaches the target, and has a `noslide` plant. `selfcontained_slides_test.qmd`
gained a `renderer=native page=2` slide (counts native 3/2, links 5). CLAUDE.md has six new native_check
lines. DESIGN Known issues and README record the walk, scale 1 only, the unchecked routes and places, and a
headless Chromium probe: the native viewer's save control names the in-page copy by its `blob:` id.

**Decisions:** none promoted. Plan chose Reveal scale 1 over a reference drawn under Reveal's zoom; the user
chose to fix the viewer in M022 over a separate fix first.

**Review:** one pass, four lenses, no returns; one substantive amendment (viewer fix, AC2 failing runs, AC8),
re-audits 2 each on AC2 and AC8; claim audit 38 claims, 5 corrected. 24 findings: 15 fixed (ResizeObserver
guard, plant and address waits, slide-not-shown failure, uncounted slides, view-distance and slide-number
wording, scale-1 limit, stale 1.2.7 and line references), 2 at hygiene (rows "Check native save names and
slide embeds" and "Check embeds open at their page option" narrowed), 3 to new row "Check native frames
hidden at page load", 4 rejected.
