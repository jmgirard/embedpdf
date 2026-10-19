# Toolchain profile: generic

<!-- A cairn *toolchain profile*: the language/toolchain-specific slots the
     operational skills read. cairn-init instantiates the chosen reference
     profile into the repo's `cairn/PROFILE.md`. The oracle / Validation
     doctrine is UNIVERSAL and deliberately NOT a slot here — it is the
     orthogonal domain axis (D-024/D-025), stated once in
     skills/shared/validation-doctrine.md (referenced from tracking-rules).
     Every profile defines all seven `## <slot>` sections below; a slot with no
     toolchain-specific content says so explicitly rather than being omitted
     (cairn_validate FAILs on a missing or empty slot). -->

The language-agnostic default: cairn's core with no toolchain-specific gates.
Selected by `cairn-init` when no `DESCRIPTION` (or other recognized toolchain
marker) is present. A repo replaces the placeholder in `verify` with its own
test command; the other slots stand as-is until a richer profile is authored.

## verify
The command(s) `/milestone-implement` and `/hotfix` run to check a task before
ticking it off. This repo uses the checks in CLAUDE.md "Verify before
finishing". Run them from the repo root:
- After a change to `embedpdf.lua`, run `pandoc lua tests/test_shortcode.lua`.
  It must print `N passed, 0 failed`.
- After a change to `embedpdf-viewer.js` or `embedpdf.css`, run `quarto
  render`. Then run every `node tests/render_check.mjs` and
  `node tests/ios_check.mjs` line in CLAUDE.md "Verify before finishing",
  the self-contained lines included. Each one must exit 0. `render_check.mjs` drives Chrome (set
  `CHROME_PATH` for Chromium) and serves `docs/` itself. It needs `npm install
  puppeteer-core` once. `ios_check.mjs` drives Safari in the "embedpdf iPhone"
  and "embedpdf iPad" iOS simulators.
- After a change to `tests/ink.mjs` or `tests/serve_docs.mjs`, run
  `node tests/helpers_test.mjs`. It must print `N passed, 0 failed`. Then run
  the browser check lines above.
- After a doc or example change, run `quarto render`. It must finish with no
  errors.

## consistency-gate
Toolchain checks `/milestone-review` runs *in addition to* the universal
cairn-file checks (`cairn_validate`, coverage completeness, `cairn_impact`).
Generic default: **none** — the universal cairn-file checks are the whole
consistency gate.

## test-doctrine
Toolchain-specific test expectations layered on the universal "What gets a
test" rules in tracking-rules. Generic default: **none beyond the universal
rules** — every bug fix gets a regression test, every documented claim a test,
contract-not-implementation, and the oracle doctrine for any numeric result.

## release-walk
The release procedure `/cairn-release` follows. Generic default: a minimal
language-agnostic walk — no package-registry submission; the tag is the release:
- Decide the version bump (patch/minor/major) from the declared changelog
  (`## changelog` slot; "none" → derive the bump from git history).
- Consolidate the declared changelog: retitle the dev heading to the version,
  group entries, prune noise ("none" → skip this step).
- Bump the repo's version marker and commit the release prep to the default
  branch (docs/metadata only).
- Tag `v<version>` and push the tag at the user's approval — no registry step.
- Where the `origin` remote is GitHub and `gh` is available, the handoff also
  provides a `gh release create` command whose body is the new changelog
  section (provided, never run — the universal step 4).

## init-detection
How `cairn-init` recognizes this toolchain. Generic is the **fallback**: no
`DESCRIPTION` and no other recognized toolchain marker.

## greenfield-openers
Opener questions `cairn-init` asks in a new/empty repo of this type. Generic
default: **no language-specific openers** — the universal opener layer
(distribution ambition, rendered here as a **tagged public release** vs.
internal-only choice, and numeric-work-needs-oracle-verification) is the whole
greenfield flow for a generic repo; a richer profile adds its own on top.

## changelog
none. This repo keeps no changelog file. Release notes go on GitHub releases.
`/hotfix` skips the changelog entry. The release-walk skips consolidation and
derives the version bump from git history. The version marker is `version:` in
`_extensions/embedpdf/_extension.yml`, and it must match the
`add_html_dependency` version in `embedpdf.lua`.
