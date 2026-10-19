# M012: Native embed name

- **Status:** in-progress
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** GP1, GP5
- **Resolves:** —
- **Surface tier:** user-facing — the screen-reader name of native embeds on readers' pages
- **Branch/PR:** m012-native-embed-name

## Goal

Screen readers name each native-viewer embed the way they name PDF.js embeds, "PDF: <file name>", numbered across both renderers.

## Scope

**In:** `hydrateNative()` gives the `<object>` an `aria-label` with the
embed's name, and no `title`. `embedNames()` names and numbers every embed
with a `data-src`, native or PDF.js, so "(k of n)" counts both. The
`--expect-name` checks in `render_check.mjs`, `safari_check.mjs`, and
`ios_check.mjs` cover native embeds, with `--expect-native` added to the last
two. The CLAUDE.md check lines and option text, README, DESIGN.md
Architecture, and CLAUDE.md "Still unverified" follow. Version 1.2.4, no tag.

**Out:**
- Firefox's built-in viewer: a best-effort browser (DESIGN.md Platforms), not
  checked here, no row.
- A real screen reader reading the native name: CLAUDE.md "Still unverified".
- Safari's computed names in the iOS simulators: candidate row "Safari names
  on iOS".
- A native embed whose address names no file ("PDF") or names it by a query
  value: the viewer uses the same `embedName()` for both renderers, but no
  test page has such a native embed. Candidate row "Embed name follow-ups"
  holds the other name-rule gaps, and this one joins it at review hygiene.
- The names inside the browser's own PDF viewer (its toolbar and pages):
  not the extension's (DESIGN.md contract boundary).

## Acceptance criteria

- [ ] AC1: On each page and device of the `render_check.mjs` runs named here,
      every embed that the viewer shows with the native viewer has an
      `aria-label` on its `<object>` equal to its `--expect-name` name and no
      `title`, and Chromium's accessibility tree gives that `<object>` the
      name, with no description equal to it. The names these runs show are
      "PDF: sample.pdf", "PDF: dummy.pdf", and "PDF: dummy2.pdf", numbered as
      AC2 says. The runs, each with `--expect-name`: `example.html` with no
      `--device`, with `--device mac-safari`, `--device windows-touch`,
      `--device iphone`, and `--device ipad`; `revealjs_test.html`; and
      `selfcontained_test.html` and `selfcontained_slides_test.html`, each
      with `--alone file` and with `--alone http`, with no `--device` and
      with `--device iphone`.
- [ ] AC2: On the AC1 runs and on `revealjs_test.html` with `--device iphone`,
      embeds that share a name are numbered "(k of n)" in document order, and
      n counts every embed on the page with that name, native or PDF.js.
      `example.html` gives "PDF: sample.pdf (k of 11)" on each device named,
      and `revealjs_test.html` gives "PDF: dummy.pdf (1 of 2)", "PDF:
      dummy2.pdf", and "PDF: dummy.pdf (2 of 2)" in slide order.
- [ ] AC3: In desktop Safari, `node tests/safari_check.mjs --target mac
      --expect-native 9 --expect-pdfjs 2 --expect-name sample.pdf` on
      `example.html` exits 0, and Safari's computed label (WebDriver "Get
      Computed Label") of each of the 9 native `<object>` elements is its
      "PDF: sample.pdf (k of 11)" name in document order.
- [ ] AC4: In Safari in the "embedpdf iPhone" and "embedpdf iPad" simulators,
      as `node tests/ios_check.mjs` with `--expect-name` reads the page DOM on
      both, every embed has an `aria-label` equal to its numbered name: on
      `example.html` the `renderer=native` `<object>` and the 10 PDF.js
      embeds, "PDF: sample.pdf (k of 11)"; on `selfcontained_test.html` with
      `--alone yes`, the `renderer=native` `<object>` and the 2 PDF.js
      embeds, "PDF: sample.pdf (k of 3)".
- [ ] AC5: The extension passes every check line that CLAUDE.md "Verify
      before finishing" held at the plan commit, changed only by the added
      `--expect-native` flags and the `revealjs_test.html` `--expect-name`
      lists, with no flag dropped and no count lowered; `node
      tests/helpers_test.mjs` and `pandoc lua tests/test_shortcode.lua` print
      "0 failed"; and `quarto render` finishes with no errors.
- [ ] AC6: README.md's screen-reader paragraph and DESIGN.md Architecture
      state that a native embed's `<object>` gets the same name and numbering
      as a PDF.js embed, and where that was checked; the README sentence "A
      `renderer=native` embed has no such name." is gone; CLAUDE.md "Still
      unverified" lists the native name among what no real screen reader has
      read; and `version:` in `_extensions/embedpdf/_extension.yml` and the
      `add_html_dependency` version in `_extensions/embedpdf/embedpdf.lua`
      both read 1.2.4.

## Coverage

- AC1 → T1, T2, T5
- AC2 → T1, T2, T5
- AC3 → T1, T3, T5
- AC4 → T1, T4, T5
- AC5 → T5
- AC6 → T1, T6

## Tasks

- [x] T1: Viewer. `embedNames()` (`embedpdf-viewer.js:454`) names every
      placeholder with a `data-src`, any renderer; `hydrateNative()` (:109)
      sets `aria-label` from `opts.name` on the `<object>`, never a `title`.
      Update the comments at :431 and :450. Bump 1.2.3 → 1.2.4 in
      `_extension.yml` and `embedpdf.lua`; `quarto render`.
- [x] T2: `render_check.mjs`. `--expect-name` lists one name per embed that
      shows a PDF, native and PDF.js, in page order (slide order on a deck);
      one name stands for `--expect-native` plus `--expect-pdfjs` embeds.
      `nameFailures()` (:721) reads `.embedpdf-native` and `.embedpdf-pdfjs`
      in document order and checks each native `<object>`'s `aria-label`, its
      missing `title`, and its tree name and description. Add plants:
      `nativename` (wrong `aria-label` on the first native `<object>`) and
      `nativetitle` (a `title` equal to it); show each fail. Update the
      header text and `tests/expect_names.mjs`'s comment; run
      `node tests/helpers_test.mjs`.
- [x] T3: `safari_check.mjs`. Add `--expect-native <n>`; the name list
      covers native `<object>` elements in document order, read by "Get
      Computed Label". Extend the `nonumber` plant or add `nativename` for
      native embeds and show it fail. A 2026-10-19 probe read "PDF:
      sample.pdf (1 of 2)" and role "group" from Safari 27.0.1 for an
      `<object>` with that `aria-label`.
- [x] T4: `ios_check.mjs`. Add `--expect-native <n>` (default 0): the run
      fails unless the page has n `renderer=native` embeds, and the name list
      covers them in page order beside the `--expect-embeds` embeds, read
      from each `<object>`'s `aria-label`. Add a native-name plant and show it
      fail.
- [ ] T5: CLAUDE.md "Verify before finishing": add `--expect-native` to the
      `safari_check` and `ios_check` lines whose page has native embeds,
      change the two `revealjs_test.html` `--expect-name` lists to
      `"dummy.pdf|dummy2.pdf|dummy.pdf"`, and rewrite the `--expect-name`
      text. Run every line.
- [ ] T6: README.md:89, DESIGN.md Architecture, and CLAUDE.md "Still
      unverified", from the T5 run output.

## Work log

- 2026-10-19: created by /milestone-plan.
- 2026-10-19: tier check: not run — work named at the question set.
- 2026-10-19: question set: which candidate to plan — "Native embed name" (recommended).
- 2026-10-19: collision check: absorbs candidate row "Native embed name" in full; extends archived M005 and M010 (PDF.js names); no D-entry overlaps; inbox sweep found 0 open issues and 0 open PRs.
- 2026-10-19: lessons applied: M005 (a `title` equal to `aria-label` reads twice in Chromium), M004 (`interestingOnly: false`), M010 (safaridriver needs remote automation; first `simctl openurl` can time out), M011 (run probes from the repo root).
- 2026-10-19: probes: Chromium gives an `<object type="application/pdf">` with `aria-label` role PluginObject and that name; Safari 27.0.1 WebDriver gives its computed label equal to the `aria-label`, role group.
- 2026-10-19: plan gate chose `aria-label` on the `<object>` over a `role="group"` wrapper because the Chromium probe left an unnamed PluginObject inside the wrapper, and over `title` because it adds a tooltip over the whole PDF and can read twice; falsified by a screen reader that does not announce an `<object>`'s `aria-label`.
- 2026-10-19: plan chose numbering across both renderers over numbering each renderer apart, because a reader cannot tell which renderer an embed got; falsified by screen-reader users finding the shared count harder to follow. The PDF.js names on mixed pages change, for example "(1 of 2)" → "(9 of 11)" on desktop `example.html`.
- 2026-10-19: plan chose version 1.2.4 with no tag, as M011 did with 1.2.3.
- 2026-10-19: criteria audit (full mode, fresh Opus reader) returned 6 findings: AC1's no-file and query rules had no native test page (narrowed to the names the runs show; remainder to Out); AC1 lacked the iphone and ipad runs (added); AC3 Safari reading unproven (probed, holds); AC4 left out the renumbered PDF.js names (added); AC5 bound the check lines as the branch writes them (anchored to the plan commit's lines); AC6 lacked CLAUDE.md "Still unverified" (added). No IP or D-entry blocks a criterion.
- 2026-10-19: implement started on branch m012-native-embed-name, cut from main at e85454a.
- 2026-10-19: T1 done: `hydrateNative()` sets `aria-label` from the embed's name; `embedNames()` names and numbers every embed with a `data-src`; version 1.2.4; `quarto render` clean; test_shortcode 40 passed, 0 failed.
- 2026-10-19: T2 done: render_check `--expect-name` covers native embeds in document order (one name stands for `--expect-native` + `--expect-pdfjs`); plants `nativename` and `nativetitle` each exit 1 on example.html and exit 2 (nothing to plant in) on name_test.html; omitting `--expect-native` on example.html exits 1; helpers_test 91 passed, 0 failed; the example.html (5 devices), revealjs_test.html (2), and self-contained name lines pass in Chromium. The safari_check and ios_check lines wait for T3–T5.
- 2026-10-19: T3 done: safari_check takes `--expect-native` and reads each native `<object>`'s computed label and title; desktop Safari 27.0.1 on example.html gives the 9 native names "(1 of 11)"–"(8 of 11)" and "(10 of 11)", exit 0; plant `nativename` exits 1, `nonumber` exits 1, and `nativename` on name_test.html exits 2; omitting `--expect-native` exits 1.
- 2026-10-19: T4 done: ios_check takes `--expect-native` (checked when given, and always with `--expect-name`) and reads each native `<object>`'s `aria-label` and title; on the iOS 27.0 iPhone simulator example.html and selfcontained_test.html (`--alone yes`) exit 0; `nativename` exits 1 ("embed 10: <object> aria-label is "PDF: wrong.pdf""), `nativename` on name_test.html exits 2, and omitting `--expect-native` exits 1. The native-count check is skipped for lines with neither flag, so the `--remote` and `--missing-pdfs` lines stay as written.
- 2026-10-19: user asked whether desktop Safari checks can run without taking screen focus; answered that desktop Safari has no headless mode, and batched the remaining safari_check runs into T5.
- 2026-10-19: claim audit: 55 claims read, 3 corrected — tests/ios_check.mjs (plant list wording), tests/safari_check.mjs (native names are the `<object>`'s), tests/render_check.mjs (`nameFailures` comment now covers native embeds and plants).

## Decisions

## Review
