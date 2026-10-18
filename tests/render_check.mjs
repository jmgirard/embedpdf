// End-to-end render check for the PDF.js viewer, run in REAL Google Chrome.
//
// Why not the Claude preview browser? Its headless GPU (SwiftShader) hangs
// PDF.js `page.render()` on large canvases / multiple documents and reports 0
// canvases even when the code is correct. Real Chrome renders fine, so verify
// viewer changes here.
//
// Setup (once):   npm install puppeteer-core
// Usage:          node tests/render_check.mjs [page|url] [options]
//   e.g. node tests/render_check.mjs example.html
//   A page path (default example.html) is served from docs/ by
//   tests/serve_docs.mjs on a free port; an http(s) URL is opened as given.
//   --device iphone|ipad|mac-safari|windows-touch
//                       emulate that device's user agent, platform, touch
//                       points, viewport, and navigator.pdfViewerEnabled
//                       (values in DEVICES below); default: plain Chrome
//   --expect-native <n> fail unless exactly n embeds use the native viewer
//   --expect-pdfjs <n>  fail unless exactly n embeds use PDF.js
// Set CHROME_PATH to use another Chrome or Chromium binary.
//
// Exits non-zero if any PDF.js block failed to render actual content, or if an
// expected count does not match.

import puppeteer from "puppeteer-core";
import { serveDocs } from "./serve_docs.mjs";

// Values for iphone and ipad are what Safari reported in iOS 27.0 simulators
// (iPhone 17, iPad Air 11-inch M4) via tests/ios_check.mjs on 2026-10-18; the
// others report pdfViewerEnabled = true.
const MAC_SAFARI_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Safari/605.1.15";
const DEVICES = {
  iphone: {
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Mobile/15E148 Safari/604.1",
    platform: "iPhone",
    maxTouchPoints: 5,
    pdfViewerEnabled: true,
    viewport: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  },
  ipad: {
    userAgent: MAC_SAFARI_UA,
    platform: "MacIntel",
    maxTouchPoints: 5,
    pdfViewerEnabled: true,
    viewport: { width: 820, height: 1180, deviceScaleFactor: 2, isMobile: false, hasTouch: true },
  },
  "mac-safari": {
    userAgent: MAC_SAFARI_UA,
    platform: "MacIntel",
    maxTouchPoints: 0,
    pdfViewerEnabled: true,
    viewport: { width: 1200, height: 900, deviceScaleFactor: 2, isMobile: false, hasTouch: false },
  },
  "windows-touch": {
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36",
    platform: "Win32",
    maxTouchPoints: 10,
    pdfViewerEnabled: true,
    viewport: { width: 1200, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: true },
  },
};

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf("--" + name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
};
const deviceName = opt("device");
const expectNative = opt("expect-native");
const expectPdfjs = opt("expect-pdfjs");
const target = args.find((a, i) => !a.startsWith("--") && (i === 0 || !args[i - 1].startsWith("--"))) ||
  "example.html";
const device = deviceName ? DEVICES[deviceName] : null;
if (deviceName && !device) {
  console.error(`render_check: unknown --device ${deviceName} (use ${Object.keys(DEVICES).join(", ")})`);
  process.exit(2);
}

const CHROME =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"; // macOS default

const server = /^https?:/.test(target) ? null : await serveDocs();
const url = server ? `http://127.0.0.1:${server.address().port}/${target}` : target;

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage();
  if (device) {
    await page.setUserAgent(device.userAgent);
    await page.setViewport(device.viewport);
    await page.evaluateOnNewDocument((d) => {
      const def = (name, value) =>
        Object.defineProperty(Navigator.prototype, name, { get: () => value, configurable: true });
      def("platform", d.platform);
      def("maxTouchPoints", d.maxTouchPoints);
      def("pdfViewerEnabled", d.pdfViewerEnabled);
    }, device);
  } else {
    await page.setViewport({ width: 1200, height: 900, deviceScaleFactor: 2 });
  }
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
      userAgent: navigator.userAgent,
      pdfViewerEnabled: navigator.pdfViewerEnabled,
      maxTouchPoints: navigator.maxTouchPoints,
      native: document.querySelectorAll(".embedpdf-native").length,
      pdfjs: document.querySelectorAll(".embedpdf-pdfjs").length,
      canvases: canvases.length,
      canvasesWithInk: withInk,
    };
  });

  console.log(JSON.stringify({ device: deviceName || "chrome", ...res }, null, 2));
  // ok if there were no PDF.js blocks, or every rendered canvas has content
  let ok = res.pdfjs === 0 || (res.canvases > 0 && res.canvasesWithInk === res.canvases);
  if (!ok) console.error("render_check: PDF.js blocks did not all render content");
  if (expectNative !== null && res.native !== Number(expectNative)) {
    console.error(`render_check: expected ${expectNative} native embeds, found ${res.native}`);
    ok = false;
  }
  if (expectPdfjs !== null && res.pdfjs !== Number(expectPdfjs)) {
    console.error(`render_check: expected ${expectPdfjs} PDF.js embeds, found ${res.pdfjs}`);
    ok = false;
  }
  if (!ok) process.exitCode = 1;
} finally {
  await browser.close();
  server?.close();
}
