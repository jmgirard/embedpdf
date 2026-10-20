# M021: Native embeds open at their page in Safari

- **Status:** planned
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** GP2, GP5
- **Resolves:** —
- **Surface tier:** user-facing — it changes the element that readers' browsers get for a native embed with a `page` option
- **Branch/PR:** —

## Goal

A native embed whose `page` option is over 1 opens at that page in desktop Safari, as it already does in Chromium and Firefox.

## Scope

**In:** In `hydrateNative()` (`_extensions/embedpdf/embedpdf-viewer.js:109`), when the browser reports a
built-in PDF viewer (`nativeSupported()` true) and `page` is over 1, the viewer makes an `<iframe>` with the
`#page=` address in place of the `<object>`, in every browser (D-007). The `<iframe>` gets the width, height,
and `aria-label` that the `<object>` gets, no `title`, and no border. The no-JS fallback content stays in the
placeholder, hidden. Every other native embed stays an `<object>`. Version 1.2.7. A new normal test page,
`page_test.qmd`. The check scripts learn the `<iframe>` form. README, DESIGN.md, and CLAUDE.md state the result.

**Out:**
- A check that a PDF.js embed opens at its `page`, iOS Safari's handling of `#page` on a `renderer=native`
  `<object>`, and a remote PDF whose site forbids framing → new candidate row "Check embeds open at their
  page option".
- Native embeds on self-contained RevealJS slides, and the file name a native viewer's save button gives →
  row "Check native save names and slide embeds".
- An `<iframe>` for native embeds at page 1, and PDF.js for such embeds in desktop Safari → not planned;
  D-007 says what evidence would bring either back.

## Acceptance criteria

- [ ] AC1: On `page_test.html`, a page that is not self-contained, `tests/native_check.mjs` with
      `--expect-native 3 --reference sample.pdf` and no `--same-pages` exits 0 with `--browser chromium`,
      `--browser firefox`, and `--browser safari`. In each run, each native embed with `page=2` is an
      `<iframe>` whose address ends in `#page=2`, with a computed border width of 0, a 600 x 400 CSS-pixel
      box, and no other element of its placeholder with a rendered box. Its screenshot matches the page-2
      reference, the page-1 and page-2 references are both `<iframe>`s and differ, and the native embed with
      no `page` option is an `<object>` with no fragment.
- [ ] AC2: On `selfcontained_test.html`, `tests/native_check.mjs` with `--expect-native 3 --reference
      sample.pdf` and no `--same-pages` exits 0 with `--alone file` and with `--alone http`, each with
      `--browser chromium`, `--browser firefox`, and `--browser safari`. In each run, the `page=2` native embed
      is an `<iframe>` with a `blob:` address that ends in `#page=2`, with the border, box, and placeholder of
      AC1. Its screenshot matches the page-2 reference, the page-1 and page-2 references are both `<iframe>`s
      and differ, and the other native embeds are `<object>`s.
- [ ] AC3: On `page_test.html` and `selfcontained_test.html`, each native embed that is an `<iframe>` has the
      embed's name as its `aria-label` and has no `title`. On `page_test.html`, `tests/render_check.mjs` with
      `--expect-native 3 --expect-pdfjs 0 --expect-name sample.pdf` exits 0 in Chromium, which reads the names
      in the DOM and in the accessibility tree, and `tests/safari_check.mjs --target mac` with the same flags
      exits 0 in desktop Safari. The `selfcontained_test.html` render_check lines of AC5 hold for that page.
- [ ] AC4: On iPhone, iPad, and emulated Android, `renderer=native` with `page=2` stays an `<object>`, and
      `page=2` with `renderer=auto` uses PDF.js. On `page_test.html`, `tests/render_check.mjs` with `--device
      iphone` and with `--device android` exits 0 with `--expect-native 2 --expect-pdfjs 1 --expect-pages 2
      --expect-name sample.pdf`. `tests/ios_check.mjs` exits 0 on the "embedpdf iPhone" and "embedpdf iPad"
      simulators with `--expect-native 2 --expect-embeds 1 --expect-name sample.pdf`. In each of these runs
      every native embed is an `<object>`.
- [ ] AC5: Each `node tests/…` and `pandoc lua tests/…` run line exits 0, and `quarto render` ends with no
      error. The lines are those in CLAUDE.md's "Verify before finishing" section at commit 49f134c, with
      `--same-pages` removed from the two Safari `native_check.mjs` lines, plus the `page_test.html` lines that
      T6 adds.
- [ ] AC6: README.md and CLAUDE.md no longer say that desktop Safari opens a native embed at page 1. README.md
      and DESIGN.md Known issues say that a native embed with a `page` over 1 is an `<iframe>`, and name the
      browsers, versions, and date of the AC1 and AC2 runs (recorded in the Review section) in which such an
      embed opened at page 2. DESIGN.md Known issues says that such an embed of a PDF missing at view time
      shows a blank frame or the server's error page, where an `<object>` shows its download link. CLAUDE.md's
      file list names `page_test.qmd`.

## Coverage

- AC1 → T1, T2, T3, T5, T7
- AC2 → T1, T3, T5, T7
- AC3 → T1, T4, T5, T7
- AC4 → T2, T4, T7
- AC5 → T6, T7
- AC6 → T6

## Tasks

- [ ] T1: Viewer. In `hydrateNative()` (`embedpdf-viewer.js:109`), make an `<iframe>` when `opts.page > 1` and
      `nativeSupported()`, with `src` `${href}#page=${page}`, the width, height, and `aria-label` of the
      `<object>`, and no `title`. Move the no-JS fallback children into a hidden element in the placeholder, so
      the self-contained download links stay in the page. Give the `<iframe>` no border in `embedpdf.css`.
      Update the comments at :3–7, :38, and :153. Bump `version:` to 1.2.7 in `_extension.yml` and in
      `add_html_dependency` in `embedpdf.lua`.
- [ ] T2: Add `page_test.qmd` (not self-contained): `sample.pdf` with `page=2` (auto), with `renderer=native
      page=2`, and with `renderer=native`, each 600 x 400. Run `quarto render`. Name the page in CLAUDE.md's
      file list.
- [ ] T3: `tests/native_check.mjs`: take `<iframe>` native embeds; for an `<iframe>` embed, both references
      and the control are `<iframe>`s. Run on a page that is not self-contained when `--alone` is not given,
      where each address must be the PDF file with the expected fragment. Fail when an embed with `page` over
      1 is not an `<iframe>`, when one with page 1 is not an `<object>`, when an `<iframe>` has a border or a
      box other than its width x height, or when its placeholder shows other content. Report every failure of
      an embed, not only the first. Update the header.
- [ ] T4: `tests/render_check.mjs`, `tests/safari_check.mjs`, `tests/ios_check.mjs`: wherever they find a
      native embed by its `<object>` (names, `title`, name plants, download-link selector, native-load and
      `--remote cors` address checks), also take its `<iframe>`. render_check and ios_check report each native
      embed's element, and fail on iPhone, iPad, or Android when one is not an `<object>`.
- [ ] T5: Show each changed check fail on an `<iframe>` embed of `page_test.html`: render_check `nativename`
      and `nativetitle`; safari_check `nativename`; native_check `nopage`, `otherpdf`, and `refcontrol` with
      `--plant-at` aimed at an `<iframe>` embed, in Safari as well; a new native_check plant that puts an
      `<object>` in place of an `<iframe>`, whose Safari run must name both the element and a page-2 mismatch;
      and new native_check plants for a border and a visible fallback.
- [ ] T6: CLAUDE.md: `page_test.html` lines (render_check desktop, `mac-safari`, `windows-touch`, `iphone`,
      `android`; ios_check iPhone and iPad; safari_check `--target mac`; native_check in three browsers), the
      Safari native_check lines without `--same-pages`, and the native_check paragraph. README `page` row and
      self-contained paragraph; DESIGN.md architecture and Known issues.
- [ ] T7: Run every AC5 line and `quarto render`; record each result in the Review section.

## Work log

- 2026-10-20: created by /milestone-plan.
- 2026-10-20: tier check: not run — work named at the question set.
- 2026-10-20: question set: which work to plan — the candidate row "Make Safari native embeds honor page", absorbed whole.
- 2026-10-20: question set: the fix if Safari opens no native element at the page — PDF.js for `page` over 1 in desktop Safari. The plan probe found that the condition does not hold (next line).
- 2026-10-20: plan probe (safaridriver, puppeteer-core): Safari 27.0.1 opened `<object>` and `<embed>` of `sample.pdf#page=2` at page 1 and `<iframe>` at page 2; Chromium 155 and Firefox 158 opened `<iframe>` at page 2; all three did so for a `blob:` copy too. Chromium's tree named an `<iframe>` by its `aria-label` (role Iframe), and Safari's Get Computed Label returned it (role group).
- 2026-10-20: plan probe (Chromium 155): for a missing PDF (HTTP 404) an `<object>` showed its child download link and an `<iframe>` showed an empty frame.
- 2026-10-20: plan gate chose an `<iframe>` for native embeds with `page` over 1 over PDF.js in desktop Safari because the iframe needs no user-agent detection and loads no PDF.js on the native path; falsified by a promised desktop browser whose built-in viewer opens such an iframe at page 1.
- 2026-10-20: plan gate chose the `<iframe>` only for `page` over 1 over an `<iframe>` for every native embed because page-1 embeds work as `<object>` and the wider change touches every native embed and check line; falsified by a reader-visible difference between the two elements for one PDF beyond the missing-PDF case in AC6.
- 2026-10-20: plan gate chose a new `page_test.qmd` over new embeds on `example.qmd` because `example.html`'s counts are in over 20 CLAUDE.md lines; falsified by nothing reader-visible (a check-layout choice).
- 2026-10-20: collision check: absorbs row "Make Safari native embeds honor page"; D-005 rejected Safari user-agent detection for its case, and this plan uses none; M020 shipped the check that found the gap, not a fix; no open issues or PRs (inbox 0 and 0).
- 2026-10-20: lessons harvested: M020 (Safari page-1, Firefox `pdfjs.viewOnLoad` and profile folder, screenshot shift), M011 (puppeteer-core probes from the repo root), M014 (`CHROME_PATH` for Chromium), M010 (safaridriver needs remote automation).
- 2026-10-20: criteria audit (full mode, fresh Opus reader): 12 findings, all fixed: both references `<iframe>` for an `<iframe>` embed (AC1, AC2, T3); every failure reported and Safari plants (T5); iframe border, box, and hidden fallback checked (AC1, T1, T3, T5); exact flags (AC3, AC4); AC3 bounded to two pages; v1.2.6 clause dropped and Android marked emulated (AC4); AC5 pinned to commit 49f134c; AC6 widened to CLAUDE.md and the file list; missing-PDF difference recorded in AC6, D-007, and Known issues rather than kept as an IP2 break, because IP2's missing-file warning is the shortcode's at render time and the `<object>` link points at the same missing file; D-007 not an AC, since the plan commit lands it.
- 2026-10-20: new candidate row "Check embeds open at their page option" holds the PDF.js, iOS `renderer=native`, and framing-refused checks left out of this scope.

## Decisions

## Review
