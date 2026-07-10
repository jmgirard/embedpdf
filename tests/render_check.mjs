// End-to-end render check for the PDF.js viewer, run in REAL Google Chrome.
//
// Why not the Claude preview browser? Its headless GPU (SwiftShader) hangs
// PDF.js `page.render()` on large canvases / multiple documents and reports 0
// canvases even when the code is correct. Real Chrome renders fine, so verify
// viewer changes here.
//
// Setup (once):   npm install puppeteer-core
// Usage:          node tests/render_check.mjs <url>
//   e.g. serve docs/ (python3 -m http.server 8000 --directory docs) then
//        node tests/render_check.mjs http://localhost:8000/example.html
//
// Exits non-zero if any PDF.js block failed to render actual content.

import puppeteer from "puppeteer-core";

const CHROME =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"; // macOS default
const url = process.argv[2] || "http://localhost:8000/example.html";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 900, deviceScaleFactor: 2 });
  await page.goto(url, { waitUntil: "networkidle0" });
  // scroll so lazily-rendered pages come into view
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 150));
    }
  });
  await new Promise((r) => setTimeout(r, 4000));

  const res = await page.evaluate(() => {
    const canvases = [...document.querySelectorAll(".embedpdf-page canvas")];
    const withInk = canvases.filter((c) => {
      const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
      for (let i = 0; i < d.length; i += 400) if (d[i] < 128 && d[i + 3] > 0) return true;
      return false;
    }).length;
    return {
      native: document.querySelectorAll(".embedpdf-native").length,
      pdfjs: document.querySelectorAll(".embedpdf-pdfjs").length,
      canvases: canvases.length,
      canvasesWithInk: withInk,
    };
  });

  console.log(JSON.stringify(res, null, 2));
  // ok if there were no PDF.js blocks, or every rendered canvas has content
  const ok = res.pdfjs === 0 || (res.canvases > 0 && res.canvasesWithInk === res.canvases);
  if (!ok) {
    console.error("render_check: PDF.js blocks did not all render content");
    process.exitCode = 1;
  }
} finally {
  await browser.close();
}
