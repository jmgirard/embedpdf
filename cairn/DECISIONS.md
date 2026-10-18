# Decisions

Append-only. Never renumber; supersede with a new entry. D-entries record
choices with rationale — never deferrals ("not now" is a ROADMAP fact).

### D-001 (2026-10-18): Vendor PDF.js instead of loading it from a CDN

**Context:** The extension can ship PDF.js in `_extensions/embedpdf/pdfjs/` or load it from a CDN at view time.
**Decision:** Keep PDF.js vendored, with no build step, and update it only on need (GP6).
**Consequences:** Embeds work offline and on blocked networks, readers make no third-party requests, and the worker loads from the same origin. Each project that installs the extension carries PDF.js, and a PDF.js update needs an embedpdf release. A move to a CDN takes a new D-entry.
