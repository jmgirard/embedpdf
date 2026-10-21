# embedpdf Extension For Quarto

[![Release](https://img.shields.io/github/v/release/jmgirard/embedpdf?label=version&color=blue)](https://github.com/jmgirard/embedpdf/releases)
[![License: MIT](https://img.shields.io/github/license/jmgirard/embedpdf?color=green)](LICENSE)
[![Quarto](https://img.shields.io/badge/Quarto-%3E%3D1.4-75AADB?logo=quarto)](https://quarto.org)

Embed PDF files in Quarto HTML documents (including RevealJS presentations) — **and, unlike other approaches, they also render on mobile browsers.**

<p align="center">
  <img src="man/figures/mobile-viewer.png" alt="A PDF rendered by embedpdf's built-in PDF.js viewer at phone width, showing a toolbar and the document text" width="330">
</p>

On desktop, PDFs are shown with the browser's built-in viewer. On iPhone and iPad, the extension renders the PDF with [PDF.js](https://mozilla.github.io/pdf.js/), Mozilla's JavaScript PDF renderer (pictured above). It does the same in mobile browsers that cannot display embedded PDFs, such as Chrome on Android. The PDF.js viewer has a small toolbar for zooming, page tracking, and downloading.

- 📱 **Works on mobile**. On Android, `<object>`/`<iframe>` embeds and Quarto's native `![](file.pdf)` show a blank box or a download prompt. Users report that older iOS versions show only the first page.
- 🪶 **Light by default**. The ~1.7 MB PDF.js library is bundled, but a browser downloads it only for a PDF.js embed. Desktop visitors with a built-in PDF viewer fetch it only for `renderer=pdfjs` embeds.
- 🎛️ **One shortcode, sensible options** — size, borders, initial page, a download button, and per-document/project defaults.
- 🖥️ **Slides too** — renders inside RevealJS presentations.
- 📄 **Degrades gracefully** — falls back to a download link with JavaScript off, and to `\includepdf` (LaTeX) or a link in other output formats.

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
```

Remember to list the PDF file under `resources` in your YAML header so it gets copied to your output site:

```yaml
---
title: "My Document"
resources:
  - dummy.pdf
---
```

You can give a file name that holds a `%` with a bare `%`, as in `files/100%.pdf`. If two hex digits follow the `%`, the shortcode reads the three characters as an escape, as in a web address. A `%` written as `%25`, as in `files/100%25.pdf`, always works. In HTML and in the download link of other formats, the shortcode writes a bare `%` as `%25`. In PDF output it turns the escapes of printable ASCII characters back into those characters, so that LaTeX finds the file. It keeps the escapes of `\ { } # $ & ~ ^ _ " ,` as written.

### Options

| Option | Default | Description |
|---|---|---|
| `renderer` | `auto` | `auto` uses PDF.js on iPhone and iPad and in browsers with no built-in PDF viewer, such as Chrome on Android. Other browsers get their native viewer. `native` and `pdfjs` force one or the other. |
| `width` | | Width of the viewer (pixels or percent) |
| `height` | | Height of the viewer (pixels or percent) |
| `page` | `1` | Initial page to display. Desktop Safari 27.0.1 opens a native `<object>` at page 1. So in a desktop browser with a built-in PDF viewer, a native embed with a `page` over 1 is an `<iframe>` in two cases. The first is a PDF inlined in the page (a `data:` address), as on a self-contained page. The second is a PDF from the page's own origin (the same scheme, host, and port). Its server must answer a HEAD request within 5 s as `application/pdf`, not as an attachment, with no redirect to another origin. Otherwise the embed is an `<object>`, and desktop Safari opens it at page 1. These cases are a PDF from another origin, a failed request, and an answer that is not OK (such as 404 or 405). They are also another media type, an attachment, and a late answer. A PDF file on a page opened as a local file is one too, unless the PDF is inside the page. On 2026-10-20 such an `<iframe>` opened at its page in Chromium 155, Firefox 158 (both headless), and desktop Safari 27.0.1. An example of an `<iframe>` with no size at page load is one on a slide that RevealJS does not display at load. Such a slide is at least RevealJS's view distance (3 by default) from the first slide shown. Since version 1.2.8, the viewer gives such an `<iframe>` its PDF only after it has a size. Before 1.2.8 it opened at page 1 in Chromium and showed the pages shrunk in desktop Safari. |
| `toolbar` | `true` | Show the PDF.js toolbar (zoom, page indicator, download) |
| `border` | | Border width in pixels around the viewer |
| `class` | | Extra CSS class(es) for the viewer container |
| `button` | | Adds a download button with the given label below the viewer |

Defaults for any option can be set document- or project-wide under the `embedpdf` metadata key:

```yaml
embedpdf:
  renderer: pdfjs
  height: 600
```

### Other output formats

In LaTeX/PDF output, embedded PDFs are included page-by-page via the `pdfpages` package (`\includepdf`). In all other formats (docx, epub, gfm, typst, ...), a download link is emitted instead.

### Known limitations

- The viewer needs JavaScript. With JavaScript disabled, each embed becomes a download link. On a self-contained page (`embed-resources: true`), that link and the `button` link point at the separate PDF file. The page does not include that file.
- A self-contained page holds each PDF. For `auto` and `pdfjs` embeds it also holds PDF.js, which adds about 1.7 MB. If the browser cannot decode a PDF inside such a page, the embed shows a message with no download link.
- On a self-contained page, the browser's own PDF viewer can save the PDF under another name. Chromium uses a generated id, and desktop Safari uses `Unknown.pdf`. Firefox uses the file name. The `button` link always uses the file name.
- To show a PDF from another site, a PDF.js embed needs that site to send an `Access-Control-Allow-Origin` header. Without the header, the embed shows "This PDF cannot be shown here." and a link that opens the PDF in a new tab. To avoid this, put the PDF in your project. See [PDFs on another site](https://jmgirard.github.io/embedpdf/example.html#pdfs-on-another-site).
- With `renderer=native`, users report that older iOS versions show only the first page ([#3](https://github.com/jmgirard/embedpdf/issues/3)). For this reason, `renderer=auto` uses PDF.js on iPhone and iPad.
- The PDF.js viewer has no text selection or search. If you need those, use the native renderer on desktop (the default).
- Each embed has a screen-reader name such as "PDF: sample.pdf", and each PDF.js page carries its text for screen readers. This was checked in the browsers' accessibility data, not with a screen reader such as VoiceOver or TalkBack.

## Guides

Here is a more in-depth guide to using the embedpdf extension: [example.html](https://jmgirard.github.io/embedpdf/example.html).
