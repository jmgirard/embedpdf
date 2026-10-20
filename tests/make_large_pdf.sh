#!/bin/sh
# Builds files/large.pdf from files/large-source.md. Run from the repo root:
#
#   sh tests/make_large_pdf.sh <output.pdf>
#
# Each part of the source between two \newpage lines becomes one page. The
# parts are rendered apart (Quarto's pandoc and LuaLaTeX) and joined with
# pdfunite, so each page carries its own fonts. One render of the whole
# source is far under the 131,072 bytes above which PDF.js asks for byte
# ranges. The script fails unless the source has 14 parts, each part
# renders to one page, and the joined PDF is over that size. It needs
# `lualatex` on PATH (TinyTeX, which `quarto install tinytex` installs) and
# poppler's `pdfunite` and `pdfinfo`.
set -eu

# the page count of a PDF, or "none" when pdfinfo cannot read it
pages_of() {
  pdfinfo "$1" 2>/dev/null | awk '/^Pages:/ { n = $2 } END { print (n == "" ? "none" : n) }'
}

out=${1:?usage: sh tests/make_large_pdf.sh <output.pdf>}
src=files/large-source.md
work=$(mktemp -d "${TMPDIR:-/tmp}/embedpdf-large.XXXXXX")
trap 'rm -rf "$work"' EXIT

awk -v d="$work" 'BEGIN { n = 1 }
  /^\\newpage$/ { n++; next }
  { print > (d "/p" sprintf("%02d", n) ".md") }' "$src"

parts=$(ls "$work"/p*.md | wc -l | tr -d ' ')
if [ "$parts" != 14 ]; then
  printf '%s\n' "make_large_pdf: $src has $parts parts, not 14 (a part ends at a line of only \\newpage)" >&2
  exit 1
fi
for part in "$work"/p*.md; do
  quarto pandoc "$part" --pdf-engine=lualatex \
    -V papersize=letter -V geometry=margin=1in -o "${part%.md}.pdf"
  n=$(pages_of "${part%.md}.pdf")
  if [ "$n" != 1 ]; then
    echo "make_large_pdf: part $(basename "$part" .md) gives $n pages, not 1" >&2
    exit 1
  fi
done
pdfunite "$work"/p*.pdf "$out"

pages=$(pages_of "$out")
bytes=$(wc -c < "$out" | tr -d ' ')
echo "make_large_pdf: $out has $pages pages and $bytes bytes"
if [ "$pages" != 14 ] || [ "$bytes" -le 131072 ]; then
  echo "make_large_pdf: needs 14 pages and more than 131072 bytes" >&2
  exit 1
fi
