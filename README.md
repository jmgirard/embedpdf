# embedpdf Extension For Quarto

This extension provides support for embedding PDF files into Quarto HTML files (including RevealJS presentations). Each file will be added to your HTML file using the `<object type="application/pdf">` tag with a fallback to the `<embed>` tag (for mobile browsers). Just specify the path of the PDF file; you can also optionally change the displayed width, height, CSS class, and CSS style.

## Installing

```bash
quarto add jmgirard/embedpdf
```

This will install the extension under the `_extensions` subdirectory.
If you're using version control, you will want to check in this directory.

## Using

To embed a PDF file in your document, use the `{{< pdf URL >}}` shortcode. For example:

```
{{< pdf dummy.pdf >}}
{{< pdf dummy.pdf width=100% height=800 >}}
{{< pdf dummy.pdf border=1 >}}
{{< pdf dummy.pdf class=myclass >}}
```

## Example

Here is the source code for a minimal example: [example.qmd](example.qmd).

Here is the rendered version of the example: [example.html](https://jmgirard.github.io/embedpdf/example.html).
