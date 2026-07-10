# embedpdf — notes for Claude Code

A Quarto HTML extension. The `{{< pdf file.pdf >}}` shortcode embeds a PDF using
the browser's native viewer on desktop and a vendored **PDF.js** canvas viewer
on mobile (where embedded PDFs don't render natively).

Key files:
- `_extensions/embedpdf/embedpdf.lua` — the shortcode: turns args into HTML /
  LaTeX (`\includepdf`) / a download link.
- `_extensions/embedpdf/embedpdf-viewer.js` — the PDF.js canvas viewer (hydrates
  `div.embedpdf` placeholders; `renderer=auto|native|pdfjs`).
- `_extensions/embedpdf/pdfjs/` — vendored PDF.js 6.1.200. **Do not edit.**
- `_extensions/embedpdf/_extension.yml` — extension metadata (`version:`).
- `example.qmd` (guide), `native.qmd`, `revealjs_test.qmd` → rendered into `docs/`
  (GitHub Pages). `dummy*.pdf` are blank test files; `sample.pdf` is the realistic
  example used by `example.qmd`.

## Verify before finishing — you are the test runner (no CI)

This project is only ever edited through Claude Code, so these checks stand in
for a test suite. **Run the relevant one before you consider a change done, and
extend it when you change behavior.**

**After any change to `embedpdf.lua`** — run the shortcode unit tests (needs no
installs; `pandoc` is a Lua interpreter). From the repo root:

```
pandoc lua tests/test_shortcode.lua      # must print "N passed, 0 failed"
```

Add a matching `check(...)` in that file whenever you add or change shortcode
behavior (a new option, output format, escaping rule, default, etc.).

**After any change to `embedpdf-viewer.js` or `embedpdf.css`** — bump `version:`
in **both** `_extension.yml` and the `add_html_dependency{ version = ... }` call
in `embedpdf.lua` (the version is the dependency path; caches key on it), then
verify real rendering in **real Google Chrome** (NOT the preview browser — see
gotcha). From the repo root:

```
quarto render example.qmd
python3 -m http.server 8000 --directory docs &   # serve; PDF.js needs http, not file://
npm install puppeteer-core                        # once, if missing (gitignored)
node tests/render_check.mjs http://localhost:8000/example.html   # exits 0 if canvases have ink
```

**After doc/example changes** — `quarto render` and confirm no errors (the
`C:/...` warning from `embed_test.qmd` is a deliberate bad-path test; ignore it).

## Gotchas (learned the hard way)

- **The Claude preview browser hangs PDF.js.** Its headless GPU (SwiftShader)
  stalls `page.render()` on large canvases or multiple PDF documents and reports
  **0 canvases even when the code is correct**. Do not trust it for PDF.js
  rendering — use `tests/render_check.mjs` (real Chrome). It's fine for native
  `<object>` embeds and general layout.
- The preview browser caches ES modules by URL forever; bumping the extension
  version (new dependency path) or serving on a new port loads changed viewer JS.
- PDF.js 6.x `getDocument` needs an options object: `getDocument({ url })` — a
  bare string throws.
- `renderer=auto` uses the native `<object>` when `navigator.pdfViewerEnabled`
  is true, else PDF.js. Force with `renderer=native|pdfjs`; `pdfjs` is how you
  preview the mobile path on a desktop.
- The viewer serializes rendering (one page at a time, shared PDF.js worker) and
  caps canvas pixels — keep both; they matter on constrained mobile devices.

## Still unverified
- A real Android device loading the GitHub Pages site (the actual target
  environment; can only be checked by a human on a phone).
