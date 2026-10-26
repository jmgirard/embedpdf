# Decisions

Append-only. Never renumber; supersede with a new entry. D-entries record
choices with rationale — never deferrals ("not now" is a ROADMAP fact).

### D-001 (2026-10-18): Vendor PDF.js instead of loading it from a CDN

**Context:** The extension can ship PDF.js in `_extensions/embedpdf/pdfjs/` or load it from a CDN at view time.
**Decision:** Keep PDF.js vendored, with no build step, and update it only on need (GP6).
**Consequences:** Embeds work offline and on blocked networks, readers make no third-party requests, and the worker loads from the same origin. Each project that installs the extension carries PDF.js, and a PDF.js update needs an embedpdf release. A move to a CDN takes a new D-entry.

### D-002 (2026-10-18): Self-contained pages carry PDF.js inline; narrows GP5 and rewords IP2

**Context:** With `embed-resources: true`, no embed renders, and phones need PDF.js. GP5 says native-path readers never download PDF.js. IP2 lists self-contained documents among the cases that give a download link.
**Decision:** The user chose full support. A self-contained page with an `auto` or `pdfjs` embed carries the vendored PDF.js and its worker inline, so desktop readers of that one file download it too. GP5 holds for pages that are not self-contained. IP2 drops self-contained documents from its fallback list, because they now render. With JavaScript disabled, they still give a download link.
**Consequences:** Such a self-contained page grows by the size of the two PDF.js files. A page that is not self-contained, or whose embeds all use `renderer=native`, does not grow. D-001 still holds, because the inlined copies are the vendored files. M002 carries out the change.

### D-003 (2026-10-18): Annotates D-002 on the no-JavaScript link in self-contained pages

**Context:** D-002 says that self-contained documents with JavaScript disabled still give a download link. M002's review found that this link, and the `button` link, point at the separate PDF file, which a self-contained page does not ship.
**Decision:** D-002's choice stands. For a self-contained page with JavaScript disabled, IP2's usable fallback is not met. This was so before M002 too, and the candidate row "Self-contained no-JS link" holds the fix.
**Consequences:** README "Known limitations" and DESIGN.md Known issues state the dead link. IP2 holds for this case only once that row ships.

### D-004 (2026-10-18): Annotates IP1 for a PDF whose site blocks cross-site reads

**Context:** IP1 says every page of an embedded PDF is readable on every promised platform. The PDF.js path (iPhone, iPad, Android) fetches the PDF from the page, so the browser blocks a PDF on another site that sends no `Access-Control-Allow-Origin` header. Issues #2 and #8 embed such a PDF. A static extension has no server to fetch it through.
**Decision:** The user chose, at M003's plan, that such an embed shows a message and a link that opens the PDF in a new tab. IP1 covers PDFs the page's site may read: its own files and files from a site whose header allows the read. A PDF the browser blocks is outside IP1, and IP2's usable fallback for it is the link.
**Consequences:** The docs tell authors to put the PDF in the Quarto project or use a site that sends the header. M003 carries out the change. A future proxy or other way to read such a PDF would take a new D-entry.

### D-005 (2026-10-19): PDF.js reads a PDF that a native embed also shows by an added query, in every browser

**Context:** Safari refuses a page's cross-origin read of an address that a native `<object>` on the page loaded, even when the site sends `Access-Control-Allow-Origin`. A read of the same address with an added query works. So a PDF.js embed failed next to a native embed of the same PDF from another site. M003 had left this as a documented limitation, with no `ios_check --remote cors`. This entry does not touch D-004, which covers a site that sends no header.
**Decision:** At M014's plan the user chose to keep byte-range loading if a fix allowed it. For a PDF on another origin whose address, without its fragment, a native embed on the page also loads, the viewer gives PDF.js that address with `embedpdf=pdfjs` added to its query. It does this in every browser. A whole-file fetch by the viewer lost to it because it gives up byte ranges. A Safari-only rule lost because telling Safari apart needs user-agent detection, which can misjudge a browser, and the added query costs one read of an address the native viewer reads anyway. ios_check and safari_check gain `--remote cors` to check the case.
**Consequences:** In this case the site must answer the address with the query, in every browser. A site that rejects an unknown query, such as a signed address, breaks the case where it worked before outside Safari. Such a report is the evidence that would favor a Safari-only rule or a whole-file fallback.

### D-006 (2026-10-19): Check-script gaps are tracked only when the documented checks could pass over a broken embed

**Context:** A `/cairn-triage` pass weighed every candidate row and Known issues entry. Each milestone review since M007 filed the gaps it found in the repo's own check scripts as a new "follow-ups" or "gaps" row that pointed at older ones. Most of those gaps can only show up as a false failure, a slow or stalled run, a plant that lands in the wrong place, a less specific report, or a flag mix that is not refused.
**Decision:** The user accepted that a gap in the check scripts is kept as a candidate only if it can let the run lines in CLAUDE.md pass while the extension is broken, or if it leaves viewer or shortcode behavior unchecked. A gap of the other kinds shows itself when a run hits it, so it is not tracked. On this ground the pass dropped "Remote rewrite quoting", "Canvas wait follow-ups", "Name plant slide target", "Remote failure line count", "Text check follow-ups", "Deck walk follow-ups", and "iOS link check gaps". Rows that also hold unchecked viewer behavior or a false pass stay.
**Consequences:** A review that finds such a gap fixes it in the milestone or leaves it out of the ROADMAP. A dropped row comes back only by a new entry that supersedes this one. The kept rows "Inlined failure check gaps", "Native name check gaps", and "Shared remote check gaps" still point at dropped rows by name.

### D-007 (2026-10-20): A native embed with a page over 1 is an iframe

**Context:** Desktop Safari 27.0.1 opens a native `<object>` or `<embed>` of a PDF at page 1 whatever its `#page=` fragment says, so the `page` option did nothing there. A plan probe for M021 found that Safari 27.0.1, Chromium 155, and Firefox 158 open an `<iframe>` of the PDF at the fragment's page, for the PDF file and for a `blob:` copy.
**Decision:** At M021's plan, where the viewer shows a native embed in a browser that reports a built-in PDF viewer (`nativeSupported()`, so not iPhone or iPad), an embed whose `page` is over 1 is an `<iframe>`, in every browser. Native embeds at page 1, and native embeds where `nativeSupported()` is false, stay `<object>`. The user chose PDF.js for such embeds in desktop Safari only for the case that no native element opened at the page, and the probe found one. PDF.js lost because telling Safari apart needs user-agent detection, which D-005 also turned down, and because it loads PDF.js on the native path (GP5). An `<iframe>` for every native embed lost because page-1 embeds work as `<object>`, and the change would touch every native embed and check.
**Consequences:** An `<iframe>` shows no child content, so the viewer keeps the no-JS fallback content hidden in the placeholder. For a PDF missing at view time, the `<iframe>` shows a blank frame or the server's error page, where an `<object>` shows its download link to the same missing file. A promised desktop browser whose viewer opens such an `<iframe>` at page 1, or another reader-visible difference between the two elements, is the evidence that would favor another approach.

### D-008 (2026-10-20): Supersedes D-007's rule: a native embed with a page over 1 is an iframe only when its server's answer allows it

**Context:** M021's review found the reader-visible difference that D-007 named as evidence against its rule. A server can send a PDF as `application/octet-stream` or with `Content-Disposition: attachment`. Firefox and Safari then show that PDF in an `<object>`, but an `<iframe>` of it stays blank and the browser downloads the file.
**Decision:** At the review stop, the user chose to check the server's answer first. A native embed with a `page` over 1, in a browser where `nativeSupported()` is true, is an `<iframe>` only in two cases. The first is an inlined PDF. The second is a PDF from the page's own origin, where the origin is not opaque, and a HEAD request answers OK within 5 s with the media type `application/pdf` and a disposition type other than `attachment`. Every other native embed is an `<object>`, as in v1.2.6. This replaces D-007's "an `<iframe>`, in every browser". The user turned down two alternatives. One kept the `<iframe>` always and documented the server requirement. The other went back to `<object>` everywhere. Keeping the `<iframe>` always lost because readers of such servers would get a blank frame and a downloaded file. Going back lost because desktop Safari would keep ignoring `page`.
**Consequences:** A page with such an embed makes one HEAD request per embed before the embed appears. A PDF from another site, a `file:` page with a PDF file, and any answer that the rule does not accept get an `<object>`, which desktop Safari opens at page 1. A PDF missing at view time also gets an `<object>`, which shows its download link, so D-007's missing-PDF consequence no longer holds. A server that answers a HEAD request differently from a GET is the case this rule cannot see.

### D-009 (2026-10-26): Applies D-006 to the Web Inspector check client row

**Context:** A `/cairn-triage` pass weighed every candidate row and Known issues entry against D-006. The row "Harden the Web Inspector check client" (M024 review) lists gaps in `tests/webinspector.mjs` and `safari_check.mjs --target simulator`: a tab left open, slow timeouts, a misread Safari state, and flat 30 s waits. The row says each one fails a run or slows it, and none was seen to pass a broken embed.
**Decision:** The user accepted dropping the row on D-006's ground. A gap that shows itself as a failed or slow run is not tracked. The same pass removed items of that kind from "Close the name and indicator check gaps", now "Check the names of failed embeds", and from "Close the inlined failure check gaps".
**Consequences:** D-006 still holds. The row comes back only by a new entry that supersedes this one, or as a new row if one of these gaps is seen to let a check pass over a broken embed.
