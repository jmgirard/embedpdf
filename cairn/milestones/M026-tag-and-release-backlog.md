<!-- Section ownership + write-modes: see tracking-rules.md "Milestone-file
     section ownership". A phase skill never rewrites another phase's section.
     Per-section owners are tagged below. The one size check that can fail is
     cairn_validate's <150 over the plan-owned body. -->
# M026: Tag and release every 1.x version

- **Status:** review
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** GP2
- **Resolves:** —
- **Surface tier:** user-facing — the tags, the GitHub releases page, and the README version badge are what users see
- **Branch/PR:** m026-tag-and-release-backlog

## Goal

Every version from v1.0.0 to v1.2.9 has a tag on GitHub and a published GitHub release with notes.

## Scope

**In:** Publish releases for the three tags that have none (v1.0.0, v1.0.1,
v1.0.2). Make an annotated tag for each of the 13 versions that have none,
and publish a release for each. Each tag names the first commit in
`git log --reverse v1.0.2..main -- _extensions/embedpdf/_extension.yml`
whose file carries that version. Each such commit is a squash merge on
main's first-parent line:

| Version | Commit | Version | Commit |
|---|---|---|---|
| 1.0.3 | 8f1c68da9207e43204587f670f94b25366484eb1 | 1.2.4 | 47230e0b5d76e4a150d857277e786728af6b1eff |
| 1.1.0 | 65d3afe9de471b669ca9ad2dad57582e50b089df | 1.2.5 | 7259b3c7d3b7034e7ddd3489b6d6a53ed587fcad |
| 1.1.1 | ac0648fa1c0ce3ba540bf87f425193a731cd08d1 | 1.2.6 | 92a823eff2af6edf8cff5a8924a562405d8e8e36 |
| 1.2.0 | c6227747972fc5f3f1f019b7826866dc382b4785 | 1.2.7 | fd582096d8de4ccfa59a568b3070909a8f33e037 |
| 1.2.1 | a0429780f53fbae31a796014deb303a603bf0dce | 1.2.8 | 9c43bf93f2fd2b6cf7ee6439e8ac72931bd8beaf |
| 1.2.2 | 4bb3b55d053977a7331c3118a7d41abd9a106018 | 1.2.9 | a68951d1022c87963258e6916a920f278775f367 |
| 1.2.3 | a90e1ceef1f52df722cb82262b510659faf445b2 | | |

The commit subject of 1.2.2 names no version. The notes follow the v0.5.0
release: a short list of changes, then the Full Changelog compare link.
Delete the DESIGN.md Known issues entry on the stale badge.

**Out:** Making each later version get its tag and release when it merges →
candidate row "Tag and release each version at merge". `quarto add
jmgirard/embedpdf` installs from `main` in Quarto 1.10.19 (the
`githubLatestUrlProvider` in `quarto.js`), so the releases do not change
what users install, and no install change is planned.

## Acceptance criteria

The AC1 list is v1.0.0, v1.0.1, v1.0.2, v1.0.3, v1.1.0, v1.1.1, v1.2.0,
v1.2.1, v1.2.2, v1.2.3, v1.2.4, v1.2.5, v1.2.6, v1.2.7, v1.2.8, v1.2.9.

- [x] AC1: For each version V in the AC1 list,
      `gh release view V --repo jmgirard/embedpdf --json tagName,isDraft,isPrerelease`
      shows a release with tag name V, `isDraft` false, and `isPrerelease` false.
- [x] AC2: `git ls-remote --tags origin` lists exactly v0.1.0, v0.2.0,
      v0.4.0, v0.4.1, v0.5.0 and the 16 tags of the AC1 list, plus `^{}`
      lines. Each AC1-list tag is annotated (it has a `^{}` line), and that
      line names the commit that the Scope table gives (v1.0.0 d27bd412,
      v1.0.1 808b403a, v1.0.2 9887d475 for the three that exist).
      `git show V:_extensions/embedpdf/_extension.yml` gives `version:`
      equal to V without its `v`. The tag objects of the eight tags that
      exist stay: v0.1.0 f99bbaa7, v0.2.0 c8a52f3f, v0.4.0 f4d7ee07, v0.4.1
      61efac62, v0.5.0 67e6974b, v1.0.0 a62c1fde, v1.0.1 a77ec2f8, v1.0.2
      511e73a7.
- [x] AC3: `gh api repos/jmgirard/embedpdf/releases/latest --jq .tag_name`
      prints `v1.2.9`.
- [x] AC4: `gh api repos/jmgirard/embedpdf/releases --paginate --jq '.[].tag_name'`
      lists exactly v0.1.0, v0.2.0, v0.4.0, v0.4.1, v0.5.0 and the AC1 list.
      Those five keep their name (equal to the tag name) and published_at
      (v0.1.0 2023-04-14T00:19:20Z, v0.2.0 2023-04-14T14:32:15Z, v0.4.0
      2024-03-18T23:41:34Z, v0.4.1 2024-03-19T01:14:59Z, v0.5.0
      2025-11-26T01:09:39Z), and their bodies are unchanged from before T5.
- [x] AC5: Each AC1-list body ends with the line
      `**Full Changelog**: https://github.com/jmgirard/embedpdf/compare/<previous>...<V>`,
      where <previous> is the version before V in the AC1 list, or v0.5.0
      for v1.0.0. Each body states the change that the subject of each
      commit in `git log <previous>..V -- _extensions/` names. Each body
      names every option name in the symmetric difference between the names
      read through a literal `kwargs['…']` or `opt('…')` in
      `git show <previous>:_extensions/embedpdf/embedpdf.lua` and in
      `git show V:_extensions/embedpdf/embedpdf.lua`. The v1.0.0 body names
      the `embedpdf` metadata key for defaults. A body that names a removed
      option calls the removal a breaking change. Every sentence in a body is
      borne out by `git diff <previous> V` or `git show V:<path>`.

## Coverage

- AC1 → T4, T5
- AC2 → T1, T2, T4
- AC3 → T5
- AC4 → T1, T5
- AC5 → T3, T5, T7

## Tasks

- [x] T1: Record the before-state in the work log: the five releases'
      name, published_at, and a SHA-256 of each body (`gh api ... releases
      --paginate`), and `git ls-remote --tags origin`. Check both against the
      values in AC2 and AC4.
- [x] T2: Confirm the Scope table: for each version, the commit is the first
      in the `git log --reverse` of the In paragraph whose `_extension.yml`
      carries it, it is on `git log --first-parent main`, and nothing else
      in `<previous>..V` touches `_extensions/`.
- [x] T3: Draft the 16 notes in files under the scratchpad (not the repo).
      For each body, write one entry in this file's Decisions section that
      lists, per sentence, the diff hunk, file, or commit that supports it, and run the option
      rule of AC5. Commit subjects give the change; the diff decides what a
      sentence claims. Link the PR number where a squash subject names one.
- [x] T4: Create the 13 annotated tags, `git tag -a vX.Y.Z <commit> -m
      "embedpdf vX.Y.Z — <one-line summary>"`, as the v1.0.x tags are, and
      push them with `git push origin <tags>` (tags only, never a branch
      push or `--tags`). Read back with `git ls-remote --tags origin`.
- [x] T5: Publish the 16 releases oldest first: `gh release create V
      --repo jmgirard/embedpdf --verify-tag --title V --notes-file <file>`,
      with `--latest=false` on all but v1.2.9 and `--latest` on v1.2.9. Read
      each back with `gh release view V --json body` and compare it to its
      file.
- [x] T6: Delete the DESIGN.md Known issues entry "GitHub releases stop at
      v0.5.0 and tags stop at v1.0.2 …", since every version then has a tag
      and a release.
- [x] T7: Review return 1: add a line to the v1.0.1, v1.0.2, v1.0.3, and
      v1.2.8 bodies for the change their commit subject names outside
      `_extensions/`, check it against the diff, and edit each release
      with `gh release edit V --notes-file <file>`.

## Work log

- 2026-10-20: created by /milestone-plan.
- 2026-10-20: tier check: milestone — pushing tags and publishing releases is an outward action with no file edit, so neither the hotfix nor the trivial tier fits.
- 2026-10-20: collision check: absorbs candidate row "Publish GitHub releases for 1.0 tags" in full, widened to v1.0.3–v1.2.9 at the user's request; no planned or archived milestone and no D-entry covers releases or tags; inbox sweep found 0 open issues and 0 open PRs; no lesson bears on this scope.
- 2026-10-20: question set: the user stopped the chip, asked whether tags or releases were missing, was told v1.0.0–v1.0.2 lack releases and 13 versions lack both, and wrote "can you fix all these issues?" — taken as the release window and as permission to push the 13 tags and publish the 16 releases in this run.
- 2026-10-20: notes style decided by the agent (the question went unanswered): a short change list plus the Full Changelog link, as the v0.5.0 release has; the alternative was the compare link alone.
- 2026-10-20: criteria audit (full mode, fresh Opus reader, two rounds). Round 1: option rule rewritten as a symmetric difference of literal names (fixed); `gh release list` has no body field, so AC4 names `gh api` (fixed); AC2 and AC4 bound to T1's record, so the known values are written into the criteria (fixed); "borne out" kept, with the per-sentence support list moved to T3 (fixed); v1.0.1's option removal must be called breaking (added); `--latest` made explicit (moved to T5).
- 2026-10-20: criteria audit round 2: the option rule is empty for v1.0.3–v1.2.9, so AC5 adds the commit-subject clause (fixed); old tag SHAs and release dates written into AC2 and AC4 (fixed); new tags must be annotated (fixed); optional `local VERSION` match in `embedpdf.lua` not added (narrower promise); tag pushes need user approval (covered by the question-set line above).
- 2026-10-20: plan gate chose publishing at implement over draft releases published after the merge, because the user asked for the fix now and review then reads live releases; falsified by a review finding in a note that an edit of the release cannot repair.
- 2026-10-20: plan gate chose the first commit whose `_extension.yml` carries the version as each tag's target over the later "review M0NN: done" commits, because the squash merge is the shipped code; falsified by a version whose shipped files differ between those two commits outside `cairn/`.
- 2026-10-20: implement started on branch m026-tag-and-release-backlog, cut from main at e0b7be8.
- 2026-10-20: T1 before-state: releases v0.5.0 2025-11-26T01:09:39Z, v0.4.1 2024-03-19T01:14:59Z, v0.4.0 2024-03-18T23:41:34Z, v0.2.0 2023-04-14T14:32:15Z, v0.1.0 2023-04-14T00:19:20Z, each named by its tag, none draft or prerelease; body SHA-256 prefixes v0.5.0 c1c9358b1e82fd5a, v0.4.1 403229f58d485754, v0.4.0 0daf0cca7e6c3c56, v0.2.0 21030e8ccbc6afc1, v0.1.0 dd95d5e454acab6d; `git ls-remote --tags origin` gave the eight tag objects and three `^{}` commits that AC2 lists. All match AC2 and AC4.
- 2026-10-20: T2 confirmed the Scope table: each of the 13 commits is the first in the `git log --reverse` whose `_extension.yml` carries its version, is on main's first-parent line with one parent, and is the only commit touching `_extensions/` since the version before; the `embedpdf.lua` version marker matches at each (`version = "1.0.3"` at 1.0.3, `local VERSION` from 1.1.0).
- 2026-10-20: T3 drafted the 16 notes in the session scratchpad and checked each sentence against its diff (Decisions entry); two drafts changed: the v1.0.0 escaping line now says only `button` was escaped before (v0.5.0 lua), and a v1.2.0 line on toolbar names was cut, since the v1.1.1 controls already had `title` names.
- 2026-10-20: T4 created the 13 annotated tags (message `embedpdf vX.Y.Z — <summary>`, as v1.0.x) and pushed them by explicit `refs/tags/` names; `git ls-remote --tags origin` then listed the 21 tags, each new `^{}` line on its Scope-table commit, and the eight older tag objects unchanged.
- 2026-10-20: T5 published the 16 releases oldest first with `--verify-tag`, `--latest=false` on 15 and `--latest` on v1.2.9; each body read back equals its note file (a `--jq` read adds one newline), none is draft or prerelease, `releases/latest` is v1.2.9, and the five v0.x releases keep their names, dates, and body hashes from T1.
- 2026-10-20: T6 deleted the DESIGN.md Known issues entry on the stale badge.
- 2026-10-20: claim audit: not owed — no added lines outside cairn/.
- 2026-10-20: implement done; verify slot has no check for a `cairn/`-only change; status set to review.
- 2026-10-20: review return 1: AC5's commit-subject clause fails for v1.0.1 (README and example polish), v1.0.2 (realistic sample PDF in the example), v1.0.3 (iOS simulator check), and v1.2.8 (check of native embeds on self-contained slides); their bodies need a line for each.
- 2026-10-20: T7 added for review return 1 (minor amendment); Coverage AC5 now maps to T7 too.
- 2026-10-20: T7 added one line to each of the four bodies and edited the releases with `gh release edit --notes-file`; each body read back equals its file, and `releases/latest` is still v1.2.9. Support: v1.0.1 808b403 changes README.md (badges, `man/figures/mobile-viewer.png`) and example.qmd; v1.0.2 9887d47 adds the two-page `sample.pdf` (pdfinfo: 2 pages, unchanged since) and example.qmd names it 23 times; v1.0.3 8f1c68d adds `tests/ios_check.mjs`, whose header calls it a check in Safari on an iOS simulator; v1.2.8 9c43bf9 changes `tests/native_check.mjs` (RevealJS deck handling) and `selfcontained_slides_test.qmd`.
- 2026-10-20: implement done again; status set to review.
- 2026-10-20: step-7 approval: m026-tag-and-release-backlog approved for merge

## Decisions

- 2026-10-20 (T3): support for each sentence of the 16 notes, per release, in sentence order. "diff" is `git diff <previous> V` of `_extensions/embedpdf/`; "lua" is `embedpdf.lua`, "js" is `embedpdf-viewer.js`. Option rule of AC5 run: v1.0.0 adds page, renderer, toolbar; v1.0.1 removes image, image_border, image_class, image_force, image_height, image_width; every other version changes no option name.
  - v1.0.0: js `hydratePdfjs` and lua `inject_dependency` (new PDF.js viewer); `pdf.min.mjs` `pdfjsVersion = 6.1.200`; lua `opt('renderer', 'auto')` and js `nativeSupported()` on `navigator.pdfViewerEnabled`; lua `opt('toolbar', 'true')`, js toolbar of zoomOut, zoomIn, indicator, download; lua `opt('page')`, js `#page=` on the object and `scrollIntoView` of that page; lua lines 51–58 read `meta['embedpdf']`; lua `\includepdf[pages=-]` and the `html:js` check that gives other formats a `pandoc.Link`; v0.5.0 lua calls `html_escape` on `button` only, v1.0.0 on each attribute.
  - v1.0.1: js `renderVisible` and `kickInitial`, with the comment that the observer's first callback can fire before layout and a short document never scrolls; diff of lua drops the six `opt('image…')` reads and the image markup, and the fallback is `Download PDF file.`
  - v1.0.2: js `enqueueRender` and its comment on the shared worker; `MAX_CANVAS_PIXELS = 8_000_000` and `Math.min(window.devicePixelRatio || 1, 2)`; the `catch` that logs and clears `renderKey`; `tries++ < 40` with `setTimeout(kickInitial, 100)`.
  - v1.0.3: js `isAppleMobile()` (iPhone/iPod/iPad agent, or Macintosh with `maxTouchPoints > 1`) and its comment naming issue #3; squash subject names #9.
  - v1.1.0: js `pdfjsUrl()` reads the `text/x-embedpdf-*` scripts or their inlined text, `inlinedPdf()`; js `hydrate` points the fallback and button links at the blob with `download` set to `opts.filename`; lua `inject_pdfjs()` runs only when `renderer ~= 'native'`; subject names #10.
  - v1.1.1: js `showFailure()` text and its `target = "_blank"` link "Open the PDF", called from the `catch` around `getDocument`; subject names #11.
  - v1.2.0: js page `role="group"` with `aria-label` "Page i of n" and the `.embedpdf-text` block, css hides it; js `renderTasks` before `textTasks` in `runQueue`, and the 10000 ms text timeout; subject names #12.
  - v1.2.1: js `aria-label` "PDF: " + name or "PDF" on the embed; js `label()` sets `title` only, with the comment on Chrome reading a repeated title; subject names #13.
  - v1.2.2: js `fileName()` query-value rule and `embedNames()` numbering of PDF.js embeds ("(k of n)"); js `showPage()` writes "Page i of n" hidden text and the shown "i / n"; subject names #18.
  - v1.2.3: js `showFailure()` gives a `download` link "Download the PDF" when `opts.blob` is set and no link when `opts.href` is null; js `catch` around `inlinedPdf()` runs before either renderer; subject names #19.
  - v1.2.4: js `object.setAttribute("aria-label", opts.name)`; `embedNames()` drops the `usesPdfjs` filter; subject names #20.
  - v1.2.5: js `pdfjsAddress()` and its comment on Safari, appending `embedpdf=pdfjs` for another site's address that `nativeAddresses` holds, in every browser; subject names #22.
  - v1.2.6: subject names `%` in HTML and PDF output and #23; lua `url_path()` writes `%25` for a `%` not followed by two hex digits; lua `latex_path()` decodes 0x20–0x7E escapes outside `LATEX_UNSAFE`, and the `\catcode` group.
  - v1.2.7: subject names desktop Safari and #29; js `frameAllowed()` (page over 1, `nativeSupported()`, `opts.blob`, same origin, HEAD with `application/pdf` and no `attachment`) and `hydrateNative(el, opts, framed)`.
  - v1.2.8: js `ResizeObserver` waits for `offsetWidth` and `offsetHeight` over 0 before it sets `frame.src`; subject names hidden slides and #30.
  - v1.2.9: js `inlinedPdf(src, filename)` makes a `File` named `filename`; subject names Firefox and #33.

## Review

Pass 1 (2026-10-20), branch at 5d25ed7, main not moved since the cut.

- AC1: `gh release view` for each of the 16 versions gave its tag name, `isDraft` false, `isPrerelease` false (16/16).
- AC2: `git ls-remote --tags origin` listed the 21 names v0.1.0–v1.2.9 and 16 `^{}` lines; each AC1-list `^{}` line equals its Scope-table commit and each tagged `_extension.yml` gives the matching `version:` (16/16); the eight older tag objects match the criterion's prefixes (8/8).
- AC3: `releases/latest` gave `v1.2.9`.
- AC4: `gh api ... releases --paginate` listed exactly the five v0.x releases and the 16; the five keep names equal to their tags and the five published_at values of the criterion, and their body SHA-256 prefixes equal T1's.
- AC5: failed. Tails (16/16), the option names of v1.0.0 and v1.0.1, the `embedpdf` metadata key, and "Breaking change" in v1.0.1 hold. The commit-subject clause fails for four bodies: v1.0.1 omits "polish README and example" (808b403), v1.0.2 omits "Use a realistic sample PDF in the example" (9887d47), v1.0.3 omits "with an iOS simulator check" (8f1c68d), and v1.2.8 omits "check native embeds on self-contained slides" (9c43bf9).

Pass 2 (2026-10-20), branch at a54fcc3 after review return 1, main not moved.

- AC1: re-run, 16/16 releases with their tag name, not draft, not prerelease.
- AC2: re-run, 21 tag names and 16 `^{}` lines, unchanged from pass 1.
- AC3: re-run, `releases/latest` gave `v1.2.9`.
- AC4: re-run, 21 releases; the five v0.x names, published_at values, and body SHA-256 prefixes equal T1's.
- Gate: `cairn_validate.py` all checks passed; the generic profile names no toolchain checks; no principle text changed, so `cairn_impact` is skipped.
- spawned: diff-bug, blame-history, prior-review, ripple
- diff-bug #1: v1.2.7 "now opens at that page in desktop Safari" overstates, since only an `<iframe>` does — fix now, fixed by release edit ("can now open").
- diff-bug #2: v1.2.5 omits that the other site must allow cross-site reads, and says PDF.js adds the query where the viewer does — fix now, fixed by release edit.
- diff-bug #3: v1.2.7 "when the browser has a built-in PDF viewer" is wrong on iPhone and iPad (`nativeSupported()` is false there) and omits the 5 s limit and the redirect-origin check — fix now, fixed by release edit.
- diff-bug #4: v1.2.1 "or PDF when its address names no file" fits the v1.2.2 rule; at v1.2.1 the name is the last path part before a query, and an inlined PDF takes its link's name — fix now, fixed by release edit.
- diff-bug #5: v1.0.0 calls the page indicator a control — fix now, fixed by release edit.
- diff-bug #6: v1.0.0 and v1.2.6 say "PDF output" where only LaTeX output uses `\includepdf` — fix now, fixed by release edit.
- diff-bug #7: v1.0.0 "when the browser reports one" omits the user-agent guess when `pdfViewerEnabled` is missing — fix now, fixed by release edit ("when the browser has one").
- diff-bug #8: v1.0.1 "often" comes from the commit message, not the diff — fix now, fixed by release edit ("could stay blank").
- diff-bug #9: v1.0.3 reads as if every iOS version shows only page 1; the code comment says older versions — fix now, fixed by release edit.
- diff-bug #10: v1.2.6 omits that the download link of other formats also gets `%25` — fix now, fixed by release edit.
- diff-bug #11: the T7 lines' support is in the work log, not the T3 Decisions entry — reject, false: the support is recorded, in the T7 work-log line.
- diff-bug #12: the candidate row "Publish GitHub releases for 1.0 tags" still says the badge shows 0.5.0 — reject, planned change: post-merge hygiene deletes the row.
- blame-history #1: the same candidate row stays on the branch — reject, planned change: post-merge hygiene deletes it.
- blame-history #2: recurrence is guarded only by a candidate row — reject, planned change: the plan's Out item sends it to "Tag and release each version at merge".
- blame-history #3: M026's choices are not D-entries — reject, false: milestone-local choices belong in the milestone file.
- blame-history #4: the badge depends on `releases/latest` staying current — follow-up, already held by the row "Tag and release each version at merge".
- blame-history #5: the hygiene stamp still names M025 — reject, planned change: post-merge hygiene replaces it.
- prior-review: no prior-review evidence (no archived Review findings on these files; no PR review threads).
- ripple #1: the candidate row "Publish GitHub releases for 1.0 tags" is stale — reject, planned change: post-merge hygiene deletes it.
- ripple #2: the new row's "until M026" and "(M026 plan)" are out of date — reject, false: both are true lineage statements.
- AC5: after the ten fixes, all 16 bodies read back equal their note files (16/16); each ends with its Full Changelog line (16/16); v1.0.0 names `page`, `renderer`, `toolbar`, and the `embedpdf` metadata key; v1.0.1 names the six `image*` options and says "Breaking change"; the option rule gives no other names; the diff-bug lens found each commit subject's change stated in its body and no false sentence before the edits, and each edited sentence was checked against `git show V:` (v1.2.7's page-1 sentence against `CLAUDE.md` at fd58209).
