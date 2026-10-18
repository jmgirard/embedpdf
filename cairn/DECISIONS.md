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
