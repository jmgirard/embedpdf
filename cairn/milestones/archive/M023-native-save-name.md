# M023: Save name of inlined PDFs in native viewers

**Status:** done (2026-10-20, PR #31 https://github.com/jmgirard/embedpdf/pull/31)

**Goal:** On a self-contained page, each native embed's own save control saves the in-page PDF as `sample.pdf` in each browser where some address of that PDF allows it, with the saved name checked in Chromium, Firefox, and desktop Safari, or written down as unchecked where no automated save works.

**Outcome:** No viewer change: no address form made Chromium 155 or desktop Safari 27.0.1 save `sample.pdf`
(`blob:` of a Blob or of a `File` named sample.pdf, fragments, `data:`). Chromium saves `<blob id>.pdf`,
Safari `Unknown.pdf`. Firefox 158's viewer saved no file under puppeteer-core by any route (AC2's fallback);
its viewer reports `document.pdf`, and `sample.pdf` for a `File` or `#filename=` (candidate row "Name inlined
PDFs in Firefox's viewer"). New `tests/save_name_check.mjs` (`--browser chromium|safari`, `--expect-save
name|@blob`): Chromium presses `#save` via CDP on the one viewer target left; Safari finds the PDF control bar
in a window screenshot and clicks its rightmost button, takes the one new `%PDF-` file in ~/Downloads, and
deletes only it. It checks saved bytes (SHA-256 read in the page), fails a press that saves several files or
starts Preview, exits 2 on a locked screen. Plants wrongid, wrongname (same origin), otherbytes, nosave.
Four CLAUDE.md lines; README, DESIGN Known issues, CLAUDE.md "Still unverified", and PROFILE verify updated.

**Decisions:** none promoted; new script over extending `native_check.mjs`; check plus written limit (user).

**Review:** one pass, four lenses, no returns, no criterion amendments; claim audit 52 claims, 4 corrected.
24 findings: 17 fixed (Safari cleanup deleted other ~/Downloads files and earlier partials, bytes check,
Preview guard, multi-file save, locked screen, `--expect-native 0`, interrupt cleanup, doc scope for
Firefox and tried forms, link wording, safaridriver note, PROFILE list), 2 rejected, 3 not tracked under
D-006, 2 at hygiene (row "Check native save names and slide embeds" deleted). Safari stops saving for 2 to 3
minutes after a burst of saves; documented.
