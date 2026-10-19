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

### Options

| Option | Default | Description |
|---|---|---|
| `renderer` | `auto` | `auto` uses PDF.js on iPhone and iPad and in browsers with no built-in PDF viewer, such as Chrome on Android. Other browsers get their native viewer. `native` and `pdfjs` force one or the other. |
| `width` | | Width of the viewer (pixels or percent) |
| `height` | | Height of the viewer (pixels or percent) |
| `page` | `1` | Initial page to display |
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

- Self-contained HTML pages and RevealJS slides (`embed-resources: true`) show embeds inline from the one HTML file, with no PDF file beside it. Quarto puts the PDF in the page. If an embed uses `renderer=auto` or `renderer=pdfjs`, the page also carries PDF.js. The page then grows by the size of the two PDF.js files (1.7 MB for PDF.js 6.1.200). This was checked on 2026-10-18 in Chromium, with the page served over HTTP and opened as a local file. It was also checked in Safari in iOS 27.0 iPhone and iPad simulators. Self-contained RevealJS slides were checked only in Chromium. If a PDF.js embed in a self-contained document cannot show its PDF, it says so and gives a "Download the PDF" link. The link saves the PDF under its file name. If the browser cannot decode the PDF inside the page, the embed shows the message with no link, with any renderer. This was checked on 2026-10-19 in Chromium, where a click on the link saved the file. It was also checked in Safari in iOS 27.0 iPhone and iPad simulators, but there no file was saved. Only the link and the case with no link were checked. With JavaScript disabled, the download links in a self-contained document (the fallback link and the `button` link) point at the separate PDF file.
- With `renderer=native`, Safari on iPhone and iPad shows the PDF in its own viewer. This was checked on 2026-10-18 in iOS 27.0 iPhone and iPad simulators and an iOS 27.1 iPhone simulator. In the iOS 27.1 iPhone simulator, a swipe inside the embed reached every page. Users report that older iOS versions show only the first page ([#3](https://github.com/jmgirard/embedpdf/issues/3)). For this reason, `renderer=auto` uses PDF.js on iPhone and iPad.
- `renderer=auto` uses PDF.js on iPhone and iPad and in browsers with no built-in PDF viewer, such as Chrome on Android. `renderer=pdfjs` uses PDF.js everywhere. This item is about pages that are not self-contained. To show a PDF from another site, a PDF.js embed needs that site to allow the read with an `Access-Control-Allow-Origin` header. The checks used only the value `*`. Without the header, the embed shows "This PDF cannot be shown here." and an "Open the PDF" link. The link opens the PDF in a new tab. To avoid this, put the PDF in your project. This was checked on 2026-10-18 in Chromium with an emulated iPhone and an emulated Android phone, not on an Android device. iPhone and iPad were checked only in Safari in iOS 27.0 simulators. The local test site sent no header on 2026-10-18 and sent `*` on 2026-10-19. On 2026-10-18, `curl -I` showed `access-control-allow-origin: *` for `https://jmgirard.github.io/embedpdf/sample.pdf`. On the same date, `https://nbviewer.org/github/jhelvy/cv/blob/main/cv-jph.pdf` sent no such header. Safari refuses the PDF.js read of an address that a native embed on the page loaded, even with the header. A native embed is one with `renderer=native`, or with `renderer=auto` in a desktop browser that has a built-in PDF viewer. A native embed and a PDF.js embed can show one PDF from another site. In that case the PDF.js embed reads the PDF at the same address with `embedpdf=pdfjs` added to its query. It does so in every browser, not only in Safari. The site must answer that address with the same PDF, which was checked only on the local test servers. This case was checked on 2026-10-19 in Safari in iOS 27.0 iPhone and iPad simulators, in desktop Safari 27.0.1, and in Chromium. A PDF of 14 pages and 171 KB then loaded in parts (by byte ranges). This was checked in the iOS simulators, and in Chromium with an emulated iPhone and Android phone. Desktop Safari was not checked for byte ranges. The guide's [PDFs on another site](https://jmgirard.github.io/embedpdf/example.html#pdfs-on-another-site) section has the details.
- The viewer requires JavaScript; with it disabled, embeds become a download link.
- The PDF.js canvas viewer does not yet support text selection or search; use the native renderer on desktop (the default) if you need those.
- For screen readers, a PDF.js embed is a group named "PDF: " and the PDF's file name, for example "PDF: sample.pdf". The file name is the last part of the PDF's path. When the path does not end in `.pdf`, the last part of the first query value that does is used, so `download.php?file=a.pdf` gives "PDF: a.pdf". If neither the path nor a query value ends in `.pdf` and the address has a query, the name is "PDF". An address that names no file, such as a bare site address, also gives the name "PDF". When two or more embeds on a page get the same name, each one gets a number, for example "PDF: sample.pdf (2 of 3)". Native embeds also get names, as the end of this item says, and the count takes PDF.js embeds and native embeds together. Each page of the embed is a group labeled "Page 1 of 2" and so on. Each page carries its text in a hidden block. The page image is hidden from screen readers. The text cannot be selected on the page. Each toolbar control (zoom out, zoom in, download) has one name, which is also its tooltip. The page indicator shows "1 / 2", and screen readers read "Page 1 of 2". This was checked on 2026-10-19 in Chromium's accessibility tree. In desktop Safari 27.0.1, only the embed's name, the toolbar controls' names, and the page indicator were checked, through WebDriver. In Safari in iOS 27.0 iPhone and iPad simulators, only the page's attributes and text were checked, including the page indicator's text. The names that Safari gives screen readers were not checked there. On 2026-10-19, two ways to read those names failed there. Safari's WebDriver (`tests/safari_check.mjs --target simulator`) answered "Could not find any session hosts that match the requested capabilities". The simulators' Safari "Remote Automation" setting was not turned on. A page script (`--target page-script`) found no `Element.prototype.computedName`. It was not checked with a screen reader such as VoiceOver or TalkBack. A native embed, which shows the browser's own PDF viewer, gets the same name on its `<object>`, for example "PDF: sample.pdf (1 of 11)". This name was checked on 2026-10-19 in Chromium's accessibility tree and through WebDriver in desktop Safari 27.0.1. In Safari in iOS 27.0 iPhone and iPad simulators, it was checked in the page's attributes. The names inside the browser's own PDF viewer were not checked.

## Guides

Here is a more in-depth guide to using the embedpdf extension: [example.html](https://jmgirard.github.io/embedpdf/example.html).
