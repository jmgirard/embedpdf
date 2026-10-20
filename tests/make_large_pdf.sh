#!/bin/sh
# Builds files/large.pdf from files/large-source.md. Run from the repo root:
#
#   sh tests/make_large_pdf.sh <output.pdf>
#
# Each part of the source between two \newpage lines becomes one page. The
# parts are rendered apart (Quarto's pandoc and LuaLaTeX) and joined with
# pdfunite, so each page carries its own fonts. One render of the whole
# source is far under the 131,072 bytes above which PDF.js asks for byte
# ranges. The script fails unless the joined PDF has 14 pages and is over
# that size.
set -eu

out=${1:?usage: sh tests/make_large_pdf.sh <output.pdf>}
src=files/large-source.md
work=$(mktemp -d "${TMPDIR:-/tmp}/embedpdf-large.XXXXXX")
trap 'rm -rf "$work"' EXIT

awk -v d="$work" 'BEGIN { n = 1 }
  /^\\newpage$/ { n++; next }
  { print > (d "/p" sprintf("%02d", n) ".md") }' "$src"

for part in "$work"/p*.md; do
  quarto pandoc "$part" --pdf-engine=lualatex \
    -V papersize=letter -V geometry=margin=1in -o "${part%.md}.pdf"
done
pdfunite "$work"/p*.pdf "$out"

pages=$(pdfinfo "$out" | awk '/^Pages:/ { print $2 }')
bytes=$(wc -c < "$out" | tr -d ' ')
echo "make_large_pdf: $out has $pages pages and $bytes bytes"
if [ "$pages" -ne 14 ] || [ "$bytes" -le 131072 ]; then
  echo "make_large_pdf: needs 14 pages and more than 131072 bytes" >&2
  exit 1
fi
