# Toolchain profile: quarto-extension

<!-- A cairn toolchain profile: the toolchain slots that the operational
     skills read, made from cairn's quarto-extension profile. The validation
     doctrine is not a slot. It applies to every toolchain and lives in
     cairn's skills/shared/validation-doctrine.md. All seven `## <slot>`
     sections are present. cairn_validate fails on a missing or empty slot. -->

The Quarto extension toolchain. This repo's deliverable is the `embedpdf`
shortcode under `_extensions/embedpdf/`, installed with
`quarto add jmgirard/embedpdf`. Quarto 1.10 installs from the branch named
`main`, which is this repo's default branch, so a merge reaches users at once.
A `v<version>` tag and a GitHub release mark the version for
`quarto add jmgirard/embedpdf@v<version>` and the releases page.

## verify
Run by `/milestone-implement` (per task) and `/hotfix` (gate-lite). This repo
uses the checks in CLAUDE.md "Verify before finishing". Run them from the repo
root:
- After a change to `embedpdf.lua`, run `pandoc lua tests/test_shortcode.lua`.
  It must print `N passed, 0 failed`.
- After a change to `embedpdf-viewer.js` or `embedpdf.css`, run `quarto
  render`. Then run each check line in CLAUDE.md "Verify before finishing",
  the self-contained lines included: every `node tests/render_check.mjs`,
  `node tests/ios_check.mjs`, `node tests/name_rule_test.mjs`,
  `node tests/safari_check.mjs`, `node tests/native_check.mjs`,
  `node tests/frame_rule_check.mjs`, and
  `node tests/save_name_check.mjs` line. Each one must exit 0. `render_check.mjs` drives Chrome (set
  `CHROME_PATH` for Chromium) and serves `docs/` itself. It needs `npm install
  puppeteer-core` once. `ios_check.mjs` drives Safari in the "embedpdf iPhone"
  and "embedpdf iPad" iOS simulators.
- After a change to `tests/ink.mjs`, `tests/serve_docs.mjs`,
  `tests/expect_names.mjs`, `tests/png_diff.mjs`, or `tests/webinspector.mjs`, run
  `node tests/helpers_test.mjs`. It must print `N passed, 0 failed`. Then run
  the browser check lines above.
- After a doc or example change, run `quarto render`. It must finish with no
  errors.

## consistency-gate
Toolchain checks `/milestone-review` runs *in addition to* the universal
cairn-file checks (`cairn_validate`, coverage completeness, `cairn_impact`):
- The two version markers that `release-walk` names hold the same version.
- `quarto render` finishes with no errors on the review head.
- The changelog slot says "none", so no changelog entry is checked.

## test-doctrine
Test expectations layered on the universal "What gets a test" rules in
tracking-rules. An extension is checked by rendering, not by calling functions:
- A shortcode change gets a `check(...)` in `tests/test_shortcode.lua`. A
  change that shows in a browser is also tested by rendering a page that uses
  it and running the browser checks over it.
- A bug fix gets a check or a fixture page that fails before the fix.
- A change to `embedpdf-viewer.js` or `embedpdf.css` raises the version in both
  markers that `release-walk` names, because the version is the asset path and
  browsers cache by it.

## release-walk
The release procedure `/cairn-release` follows. The version markers are
`version:` in `_extensions/embedpdf/_extension.yml` and `local VERSION` in
`_extensions/embedpdf/embedpdf.lua`, which its `add_html_dependency` calls
read. Both hold the same version. The version rises at each merge that changes a
shipped asset (CLAUDE.md), so the tag-only arm is the usual path.
Before step 1 of `/cairn-release`,
run `git fetch --tags <base>` and read the remote default branch's tip:
`python3 "${CLAUDE_PLUGIN_ROOT}/scripts/cairn_versions.py" _extensions/embedpdf/_extension.yml --at <base>/<default-branch>`.
When `CLAUDE_PLUGIN_ROOT` is unset, use the cairn plugin's install directory.
The script refuses a shallow clone. It prints the tip's
version, the first commit of that version's unbroken run of first-parent
commits (`start`), and whether a `v<version>` tag exists.
- **Tag-only arm.** With no tag, the tip's version is unreleased:
  merged work raised it, or it was never tagged. Raise nothing and make no
  prep commit. First check that `embedpdf.lua` holds the version at `start`
  (`git show <start>:_extensions/embedpdf/embedpdf.lua`). Then step 1 asks
  the user to accept the version and `start` (its subject) instead of
  choosing a bump. Step 2 makes no edit. Tag the run's start:
  `git tag -a v<version> <start> -m "v<version>"`, pushed at the user's
  approval.
- **Stops.** A marker mismatch or a refused version ends the run with
  the reason and no tag. A marker mismatch at `start` cannot be fixed for this
  version: only a merge that raises the version again clears it, and this
  version then stays untagged.
- **Release-time arm.** With the tag present, run the generic walk. With
  changelog "none", decide the bump (patch/minor/major) from git history and
  skip the consolidation. Raise both markers and commit the release prep to
  the default branch. Tag that commit `v<version>`, pushed at the user's
  approval.
- **Release notes.** With changelog "none", the notes are the commit subjects
  on the default branch since the previous `v*` tag:
  `git log --first-parent --format='- %s' <previous tag>..<tagged commit>`.
  The previous tag is
  `git describe --first-parent --tags --abbrev=0 --match 'v*' <tagged commit>^`.
  Where the `origin` remote is GitHub and `gh` is available, the handoff
  provides a `gh release create` command with these notes. cairn never runs
  it (the universal step 4). No registry step: the tag is the release.

## init-detection
Recognized by `cairn-init` from `_extensions/*/_extension.yml` or
`_extensions/*/_extension.yaml`. The repo must also have no `DESCRIPTION`, no
`pyproject.toml`/`setup.py`/`setup.cfg`, and no
`.claude-plugin/plugin.json`/`.claude-plugin/marketplace.json`. It ranks ahead
of docker-image and generic. This repo has `_extensions/embedpdf/_extension.yml`
and none of the other markers.

## greenfield-openers
None for this repo: it is not new. The extension type is a shortcode. The
version rises at each merge that changes a shipped asset. The reason is that
browsers cache `embedpdf-viewer.js` and `embedpdf.css` by a path that holds
the version (CLAUDE.md).

## changelog
none. This repo keeps no changelog file. Release notes go on GitHub releases.
`/hotfix` skips the changelog entry. The release-walk skips consolidation and
writes its release notes from git history.
