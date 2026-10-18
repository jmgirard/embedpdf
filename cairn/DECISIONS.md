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
