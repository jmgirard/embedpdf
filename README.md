# embedpdf Extension For Quarto

This extension provides support for embedding PDF files into Quarto HTML files (including RevealJS presentations). Each file will be added to your HTML file using the `<object type="application/pdf">` tag with a fallback to either text or (if supplied) an image with a download link for mobile browsers.

## Installing

You need to run the following command in your terminal while in the same working directory as your Quarto document. This is often easiest using an RStudio project and the RStudio terminal. Doing so will create a new `_extensions` folder in that directory.

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
{{< pdf dummy.pdf image=dummy.png >}}
```

## Guides

Here is a simple guide to using Quarto's native PDF support: [native.html](https://jmgirard.github.io/embedpdf/native.html).

Here is a more in-depth guide to using the embedpdf extension: [example.html](https://jmgirard.github.io/embedpdf/example.html).
