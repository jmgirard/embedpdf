# M014: Safari shared remote PDF

**Status:** done (2026-10-19, PR #22 https://github.com/jmgirard/embedpdf/pull/22)

**Goal:** In Safari, a PDF.js embed shows a PDF from another site that allows the read, also when a `renderer=native` embed on the same page shows the same PDF.

**Outcome:** v1.2.5. `embedpdf-viewer.js` `pdfjsAddress()` and `nativeAddresses`: for a PDF on another origin whose
address (no fragment) a native embed on the page loads, PDF.js reads it with `embedpdf=pdfjs` added to the query, in
every browser, still by byte ranges. Cause, probed in desktop Safari 27.0.1: Safari refuses every CORS read of an
address an `<object>` loaded, with no request sent; an added query works. `serve_docs.mjs`: `server.requests` log;
serveRemote's `slowWhole` slows only requests with an Origin header. ios_check `--remote cors` (all normal checks,
native `<object>` on the remote server with a no-Origin GET, `--expect-ranges` and plants allowed); safari_check
`--remote cors`; with `--remote cors` the range count takes only Origin-bearing 206 answers and exits 2 only when two
PDF.js embeds share an address. New page `shared_test.qmd` (native, then PDF.js, of `files/large.pdf`). README, guide,
CLAUDE.md (10 check lines, gotcha, "Still unverified"), DESIGN Known issues. Checked in iOS 27.0 iPhone and iPad
simulators, desktop Safari 27.0.1, and Chromium 155; v1.2.4 failed the iOS lines. helpers_test 124 cases.

**Decisions:** D-005 (the added query, in every browser; a whole-file fetch and a Safari-only rule rejected; reverses
M003's "no ios_check --remote cors").

**Review:** one pass, four lenses: 26 findings. 15 fixed (report `ranges` count, `file:` origin, `&&`, D-005, doc and
comment wording, a joined line); 4 to new row "Shared remote check gaps", plus parked row "Shared query fallback";
7 rejected (2 planned in T4). Graduated row "Safari shared remote URL".
