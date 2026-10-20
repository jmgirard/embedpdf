# M015: Percent sign in PDF paths

**Status:** done (2026-10-19, PR #23 https://github.com/jmgirard/embedpdf/pull/23)

**Goal:** A PDF path with a `%` sign works in HTML and PDF output.

**Outcome:** v1.2.6. `embedpdf.lua` `url_path()`: a `%` not followed by two hex digits becomes `%25`, in one pass,
in `data-src`, both download links, and the link of other formats (before `html_escape`). `latex_path()`: decodes
`%XX` escapes of printable ASCII other than `\ { } # $ & ~ ^ _ " ,` (`LATEX_UNSAFE`). A path that still holds a `%`
gets `\begingroup\catcode`\%=12\relax\includepdf[pages=-]{…}\endgroup`, and other paths keep the v1.2.5 line. Probe:
`"` and `,` fail in an `\includepdf` path in lualatex and pdflatex, and xelatex also fails on `)`, which stays decoded.
New normal page `percent_page_test.qmd` (five embeds) and `files/50%off.pdf`. `test_shortcode.lua` has a 24-path
table plus `file=` and `&`-with-`%` checks (162 checks). README paragraph on `%` in file names. CLAUDE.md has 7
check lines, a PDF render command, and a "Still unverified" line for GitHub Pages and `%25`. DESIGN Known issues:
in PDF output a file LaTeX cannot find stops the render (IP2 not met). The v1.2.5 shortcode failed the page (HTTP 400)
and the PDF render.

**Decisions:** none promoted. Plan gate: catcode group over `\csname @percentchar\endcsname` (breaks before a letter);
encode only a bare `%` (keeps `%20` paths); a one-off native fetch probe over widening render_check.

**Review:** four lenses, one pass, 24 findings: 2 fixed (two unit checks, an engine comment), 10 follow-up to new rows
"Percent path follow-ups" and "LaTeX inline shortcode" and to "LaTeX path escapes", 12 rejected. Two criterion
amendments (AC5 line count and block; AC1/AC2 kept set and paths), each re-audited twice. Graduated row "Bare percent
path". Corrected the M008 lesson on bare `%`.
