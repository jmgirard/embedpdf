// The names that --expect-name expects, one per PDF.js embed in page order,
// built from the names given and never read from the page. `values` is the
// "|" list split, or one name; one name stands for `count` embeds, the count
// that the run states (--expect-pdfjs in render_check and safari_check,
// --expect-embeds in ios_check). "-" stands for an embed whose address names no file. A name
// that the expanded list holds more than once gets " (k of n)", k counting in
// list order, as the viewer numbers embeds that share a name.
export function expectedNames(values, count) {
  const list = values.length === 1 ? Array(count).fill(values[0]) : values;
  const labels = list.map((v) => (v === "-" ? "PDF" : "PDF: " + v));
  const total = new Map();
  for (const l of labels) total.set(l, (total.get(l) || 0) + 1);
  const seen = new Map();
  return labels.map((l) => {
    const n = total.get(l);
    if (n < 2) return l;
    const k = (seen.get(l) || 0) + 1;
    seen.set(l, k);
    return `${l} (${k} of ${n})`;
  });
}
