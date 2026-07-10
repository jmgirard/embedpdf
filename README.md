# embedpdf Extension For Quarto

This extension embeds PDF files into Quarto HTML documents (including RevealJS presentations) — **and, unlike other approaches, the PDFs also render on mobile browsers.**

On desktop browsers, PDFs are shown with the browser's built-in PDF viewer. On mobile browsers (which cannot display embedded PDFs natively), the extension automatically falls back to rendering the PDF with [PDF.js](https://mozilla.github.io/pdf.js/), Mozilla's JavaScript PDF renderer, complete with a small toolbar for zooming, page tracking, and downloading. The PDF.js library (~1.7 MB) is bundled with the extension and only downloaded by visitors whose browsers actually need it.

> [!NOTE]
>
> If you only care about desktop browsers, Quarto has native PDF embedding (`![](file.pdf)`) that may suffice: [native.html](https://jmgirard.github.io/embedpdf/native.html)

## Installing

Run the following command in your terminal while in the same working directory as your Quarto document or project:

```bash
quarto add jmgirard/embedpdf
```

This will install the extension under the `_extensions` subdirectory.
If you're using version control, you will want to check in this directory.

## Using

To embed a PDF file in your document, use the `{{< pdf file.pdf >}}` shortcode. For example:

```
{{< pdf dummy.pdf >}}
{{< pdf dummy.pdf width=100% height=800 >}}
{{< pdf dummy.pdf renderer=pdfjs >}}
{{< pdf dummy.pdf button="Download PDF" >}}
{{< pdf dummy.pdf image=dummy.png >}}
```

Remember to list the PDF file under `resources` in your YAML header so it gets copied to your output site:

```yaml
---
title: "My Document"
resources:
  - dummy.pdf
---
```

### Options

| Option | Default | Description |
|---|---|---|
| `renderer` | `auto` | `auto` uses the browser's native viewer when available and PDF.js otherwise (i.e., on mobile); `native` and `pdfjs` force one or the other |
| `width` | | Width of the viewer (pixels or percent) |
| `height` | | Height of the viewer (pixels or percent) |
| `page` | `1` | Initial page to display |
| `toolbar` | `true` | Show the PDF.js toolbar (zoom, page indicator, download) |
| `border` | | Border width in pixels around the viewer |
| `class` | | Extra CSS class(es) for the viewer container |
| `button` | | Adds a download button with the given label below the viewer |
| `image` | | Fallback image shown when JavaScript is disabled (with `image_width`, `image_height`, `image_border`, `image_class`) |
| `image_force` | | `TRUE` shows only the linked image, no viewer |

Defaults for any option can be set document- or project-wide under the `embedpdf` metadata key:

```yaml
embedpdf:
  renderer: pdfjs
  height: 600
```

### Other output formats

In LaTeX/PDF output, embedded PDFs are included page-by-page via the `pdfpages` package (`\includepdf`). In all other formats (docx, epub, gfm, typst, ...), a download link is emitted instead.

### Known limitations

- Self-contained documents (`embed-resources: true`) inline the viewer code, but PDF.js must fetch the PDF file by URL at view time; use `renderer=native` there, or ship the PDF alongside the HTML file.
- The PDF.js canvas viewer does not yet support text selection or search; use the native renderer on desktop (the default) if you need those.

## Guides

Here is a more in-depth guide to using the embedpdf extension: [example.html](https://jmgirard.github.io/embedpdf/example.html).
