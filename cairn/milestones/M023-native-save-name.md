# M023: Save name of inlined PDFs in native viewers

- **Status:** in-progress
- **Priority:** normal
- **Depends on:** —
- **Driving RR:** —
- **Principles touched:** IP1, GP1, GP4
- **Resolves:** —
- **Surface tier:** user-facing — the file name readers get when they save a PDF from a native embed on a self-contained page, and the README text about it
- **Branch/PR:** m023-native-save-name

## Goal

On a self-contained page, each native embed's own save control saves the in-page PDF as `sample.pdf` in each browser where some address of that PDF allows it, with the saved name checked in Chromium, Firefox, and desktop Safari, or written down as unchecked where no automated save works.

## Scope

**In:** probes of the name that the native viewer's save control gives the in-page PDF in Firefox 158 and desktop Safari 27.0.1, for the viewer's current `blob:` address and for other address forms (Chromium 155 was probed at plan, see the work log); a viewer change for each browser where a form saves as `sample.pdf` and still shows the PDF at its page; a new check script `tests/save_name_check.mjs` that presses each native embed's save control and reads the saved name; the CLAUDE.md, README, and DESIGN.md lines this changes.

**Out:**
- Native embeds of a PDF that is not inlined. The browser names that copy by the PDF's address. Name-rule edge cases stay in the candidate row "Fix edge cases in embed addresses".
- Save names on self-contained RevealJS slides, on iPhone and iPad, and on Android. They stay in CLAUDE.md "Still unverified".
- Using PDF.js in place of the native viewer for inlined PDFs. The user chose a check and a written limit where no address form works.

## Acceptance criteria

- [ ] AC1: In headless Chromium 155, on `selfcontained_test.html` opened alone as a local file and over HTTP, the save control of each of the 3 native embeds' viewers (two `<object>`s and the `page=2` `<iframe>`) saves the in-page PDF as `<id of that embed's blob: URL>.pdf`, or as `sample.pdf` for every embed if AC4 gives Chromium an address form. A saved name here is the browser's name for the file before any suffix it adds for a name already taken. Evidence: the two Chromium `tests/save_name_check.mjs` lines in CLAUDE.md (`--alone file` and `--alone http`) exit 0.
- [ ] AC2: As AC1, in headless Firefox 158, with the name T1 found for Firefox's current address (or `sample.pdf` if AC4 gives Firefox a form) and the two Firefox lines. If none of T1's listed Firefox routes yields a saved file, AC2 is met instead when README "Known limitations" and DESIGN.md Known issues say that Firefox's save name was not checked.
- [ ] AC3: As AC2, in desktop Safari 27.0.1, with T1's Safari name and routes and the two Safari lines.
- [ ] AC4: For each browser, if an address form among those T1 lists, other than a `data:` address, saves as `sample.pdf` and shows the PDF at its page for each of the 3 native embeds, the viewer gives inlined native embeds that form in at least that browser, and that browser's lines in AC1 to AC3 expect `sample.pdf` for every embed. If no browser has such a form, `git diff main -- _extensions/` prints nothing at the milestone's head.
- [ ] AC5: If the viewer changed, at the milestone's head: `version:` in `_extension.yml` and the `add_html_dependency` version in `embedpdf.lua` are equal and above 1.2.8; `pandoc lua tests/test_shortcode.lua` prints 0 failed; and each line that `grep -n '^node tests/' CLAUDE.md | grep -v -e '--remote' -e '--missing-pdfs' -e '--expect-ranges' -e '--csp' -e '--cpu-throttle'` prints exits 0, run as written and again with each `--alone` and `--device` value that CLAUDE.md says to add for that line.
- [ ] AC6: README "Known limitations" (the self-contained bullet) and the DESIGN.md Known issues save-name entry state, for each of Chromium 155, Firefox 158, and desktop Safari 27.0.1, the name or name pattern that the save control gave each element type (`<object>` and the `page=2` `<iframe>`) on the AC1 to AC3 runs, with the date, or that the browser's save name was not checked under AC2's or AC3's fallback. Neither of them, nor the save-name sentence of CLAUDE.md "Still unverified", says that Firefox's or Safari's save name is unchecked, except under that fallback.

## Coverage

- AC1 → T3, T5
- AC2 → T1, T3, T5
- AC3 → T1, T3, T5
- AC4 → T1, T2, T3, T5
- AC5 → T2, T4
- AC6 → T5

## Tasks

- [x] T1: Probe Firefox 158 (headless, puppeteer-core) and desktop Safari 27.0.1 (safaridriver) on `selfcontained_test.html` opened alone. Firefox routes: a click on the pdf.js viewer's download button through the viewer's browsing context, and the save key with focus in the embed, into a download folder set by Firefox prefs. Safari routes: pointer actions on the PDF's hover download control, and the save key with focus in the embed, reading and then deleting the copy in `~/Downloads`. For each native embed, record the saved name for the current `blob:` address and for: a `blob:` address with a fragment naming `sample.pdf` (alone and after `page=2`), a `blob:` of a `File` named `sample.pdf`, and the `data:` address (for the record only, see AC4). For each form that saves as `sample.pdf`, check that each embed still shows its PDF at its page. Log one line per browser, naming each route tried.
- [x] T2: If T1 found an AC4 form, give it to the inlined native embeds (`inlinedPdf` and its caller in `embedpdf-viewer.js`), bump the version in `_extension.yml` and `embedpdf.lua`, and run `quarto render`. Skip this task if T1 found none.
- [ ] T3: Write `tests/save_name_check.mjs`: `--browser chromium|firefox|safari`, `--page`, `--alone file|http`, `--expect-native <n>`, and `--expect-save` with one entry per native embed (`sample.pdf`, another literal name, or a token for "this embed's `blob:` id plus `.pdf`"). It saves one embed at a time into an empty scratch folder (Chromium, Firefox), or in Safari reads the file that appeared in `~/Downloads`, deletes it before the next save, and exits 2 if `~/Downloads` already holds the expected name. Exit 0 on a match, 1 on a mismatch or no saved file, 2 when the browser cannot start. Plants, placed by `--plant-at` on an `<object>` embed and on the `<iframe>` embed: one expecting another embed's `blob:` id, one with a wrong literal name, and one where no file is saved. State them in the header and see each fail in each browser the check runs in.
- [x] T4: If T2 changed the viewer, run the AC5 commands. Run `node tests/helpers_test.mjs` if a helper changed.
- [x] T5: Add the `save_name_check.mjs` lines (each browser T1 found a route for, x `--alone file|http`) and a short paragraph on the script to CLAUDE.md. Replace the README self-contained bullet's save-button sentences and the DESIGN.md Known issues save-name entry with the AC1 to AC3 results. Narrow the save-name sentence of CLAUDE.md "Still unverified".

## Work log

- 2026-10-20: created by /milestone-plan.
- 2026-10-20: tier check: not run — work named at the question set.
- 2026-10-20: question set: what to work on — the save name of inlined PDFs in native viewers (row "Check native save names and slide embeds").
- 2026-10-20: question set: what to ship if no address form saves as sample.pdf — a check plus a written limit; PDF.js for inlined PDFs was not chosen.
- 2026-10-20: question set: may probes and checks save test copies into ~/Downloads from Firefox and desktop Safari (Safari windows come to the front) — yes, all three browsers; the checks delete each copy they made.
- 2026-10-20: plan probe (headless Chromium 155, puppeteer-core, CDP `Browser.downloadWillBegin`, a local page with one `<object>` or `<iframe>`): `blob:` of a Blob, `blob:` of a `File` named sample.pdf, and `blob:` + `#sample.pdf` each saved as `<blob id>.pdf`; `data:application/pdf;base64,…` and `data:application/pdf;name=sample.pdf;base64,…` saved as `download.pdf`, in both elements. So Chromium has no address fix among these.
- 2026-10-20: collision check: row "Check native save names and slide embeds" absorbed in full (its slide part shipped in M022); DESIGN Known issues save-name entry and README sentence are the text this replaces; D-002 (inline PDFs on self-contained pages) and D-008 (`<iframe>` for `page` over 1, decided from the inlined Blob, not the address) hold; D-006 keeps this gap (unchecked viewer behavior). Not the checker-regress shape: the new script checks the extension's pages in browsers, not tracking files.
- 2026-10-20: inbox sweep: 0 open issues, 0 open PRs.
- 2026-10-20: lessons harvested: CDP save of a native viewer and `Browser.setDownloadBehavior` (M011, M022); Firefox profile folder via `open` (M020); Safari saves into ~/Downloads and brings a window to the front (M012, M021).
- 2026-10-20: criteria audit (full mode, fresh Opus reader): 14 findings, all fixed. AC1 to AC3 now state the expected names themselves, not "the name README states"; check mechanics, one-at-a-time saves, and deletion moved to T3; plants now cover the `blob:`-id token and both element types; AC2 got AC3's fallback, and both fallbacks name T1's listed routes with no work-log clause; AC4 requires a form that works for all 3 embeds and excludes `data:` (GP4: it puts the whole PDF back in an attribute); AC5 adds the shortcode tests and a head-of-milestone grep over every viewer-loading line; AC6 names its target sentences and per-element names; Goal admits the written-limit outcome; Coverage maps AC4 to T3 and T5.
- 2026-10-20: plan gate chose a new script over extending `native_check.mjs` (734 lines, a screenshot check), because a save is a separate action with its own browser plumbing; falsified by the new script copying most of native_check's launch and serve code.
- 2026-10-20: plan gate excluded a `data:` address from the viewer fix (AC4), because it copies the whole PDF into an attribute value (GP4); falsified by a measured memory cost under 1 MB for a large inlined PDF on a constrained phone.
- 2026-10-20: version: bumped only if T2 changes the viewer.
- 2026-10-20: T1 Firefox 158 (puppeteer-core, `selfcontained_test.html` alone, file and HTTP): no route saved a file. Routes: a script click on the viewer's `#downloadButton` (0 x 0 in the 300 x 150 and 600 x 400 embeds); a pointer click on `#secondaryDownload` after opening `#secondaryToolbarToggleButton` (600 x 400 embed only; the menu does not fit 300 x 150); Cmd+S with focus in the viewer. Each ran with a BiDi `browser.setDownloadBehavior` folder and with the default context plus `browser.download.dir` prefs, headless and once with a window. A plain `<a download>` link to the same `blob:` saved at once, so downloads worked. The viewer's own name (`PDFViewerApplication._docFilename`, read in each embed's frame): `document.pdf` for the current `blob:` and for `data:`; `sample.pdf` for a `blob:` of a `File` named sample.pdf and for `#filename=sample.pdf` (also `#page=2&filename=sample.pdf`). So AC2's fallback applies.
- 2026-10-20: T1 desktop Safari 27.0.1 (safaridriver, `selfcontained_test.html` alone over HTTP): hovering an embed shows the PDF's own control bar at its bottom center, and a pointer click at (width / 2 + 82, height - 62) from the embed's top-left pressed its download button. It saved `~/Downloads/Unknown.pdf` (same bytes as `docs/sample.pdf`) for the current `blob:` (`<iframe>` and an `<object>`), for a `blob:` of a `File` named sample.pdf, and for `#page=2&filename=sample.pdf`; a `data:` address saved no file in 2 tries. The click saved nothing in 2 of 7 tries, so the check must retry. Element screenshots do not show the control bar; window screenshots do. Each copy was deleted.
- 2026-10-20: T1 result: no form saves as `sample.pdf` in a browser whose save could be read, so AC4's no-change branch applies and T2 is skipped. Firefox's viewer-reported `sample.pdf` for the `File` form is not a saved file under AC4; it goes to a candidate row.
- 2026-10-20: T3 minor amendment: `save_name_check.mjs` takes `--browser chromium|safari` and refuses `firefox` with exit 2, since T1 found no Firefox route (AC2's fallback); T5 adds four lines, not six.
- 2026-10-20: T3 decisions: Chromium removes the other native embeds before each save so one viewer target is left (targets carry no link to their element); Safari finds the PDF control bar in a window screenshot (gray band, rightmost button) because its height depends on the embed's size and a fixed offset missed it in 300 x 150 embeds; `nosave` swaps in an empty `<div>`, because an empty `blob:` still saved a file in Chromium and `about:blank` saved `Unknown.html.pdf` from a Safari `<object>`.
- 2026-10-20: T3 runs: Chromium `--alone file` and `--alone http` with `@blob` exit 0 (twice each); wrongid, wrongname, and nosave at embeds 1 (`<object>`) and 3 (`<iframe>`) each exit 1 naming that embed (other id, `dummy.pdf`, no saved file). Safari lines with `Unknown.pdf` exit 0 in 6 runs (file and http); wrongname@1 exits 1 with `dummy.pdf`, nosave@1 and nosave@3 exit 1 with no saved file for the planted embed. Later Safari runs failed for every embed with no bar or no file: `lsappinfo front` showed `loginwindow`, the screen was locked. A clean Safari wrongname@3 run is still owed.
- 2026-10-20: T5: CLAUDE.md gained the four `save_name_check.mjs` lines and a paragraph, and its "Still unverified" bullet now names only Firefox's save name and slides; README's self-contained bullet and the DESIGN.md save-name entry state the Chromium, Safari, and Firefox results; candidate row "Name inlined PDFs in Firefox's viewer" added for the `File` form; `quarto render` finished with no error; my added lines add no simple-english lint hits (CLAUDE.md 39 and README 11 hits, as on main).
- 2026-10-20: claim audit: 52 claims read, 4 corrected — tests/save_name_check.mjs (empty-folder sentence is Chromium-only; `<iframe>` only for some `page` over 1 embeds; gray-pixel rule; exit 130); the one re-read narrowed three of them further. README.md and CLAUDE.md had none.
- 2026-10-20: stop: the Mac's screen is locked (`lsappinfo front` shows `loginwindow`), so the Safari control bar does not show and the owed Safari wrongname@3 run cannot pass; T3 stays open until the screen is unlocked.

## Decisions

## Review
