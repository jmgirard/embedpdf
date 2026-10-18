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

**After doc/example changes** — `quarto render` and confirm it completes with no
errors.

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

## Project tracking (cairn)

This repo uses the cairn plugin. **Before acting on any request, classify it
and route** — the tracking rulebook only loads once a cairn skill fires, so
starting work in plain conversation silently bypasses the work tiers and the
git model. Classify first:

- **Trivial** (typo, comment, tracking edit): in owner mode, commit to the
  default branch. In guest mode, leave the edit on disk (`cairn/` files only).
- **Look into a GitHub issue**: invoke `/milestone` with the issue number
  or URL.
- **User-visible bug**: invoke `/hotfix`.
- **New work, a design decision, or more than one sitting**: invoke
  `/milestone-plan`. Where a hotfix or trivial route fits, it offers that
  first. Otherwise one question set comes, and the run goes on to the merge
  question. Typed `/milestone-implement` or `/milestone-review` resumes it.
- **Status, "what's next", or unsure which tier**: invoke `/milestone`.
- **Never implement code on the default branch** outside a milestone/hotfix
  branch. Nothing reaches it without the user's explicit approval at the
  merge question, or for a trivial edit their request or the tier chip.

Whenever the request is anything but trivial, invoke the skill *first* so the
full rulebook (the plugin's `skills/shared/tracking-rules.md`) and its conduct
load — do not reconstruct the rules here from memory. All project state lives under
`cairn/` (**Architecture → DESIGN · Status → ROADMAP · Tasks → milestone
files · Decisions → DECISIONS · Lessons → LESSONS · History → archive +
git**); never record
status or TODOs in this file. Claude's persistent memory never holds project
state; `cairn/` files win any conflict.
