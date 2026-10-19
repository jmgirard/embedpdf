// End-to-end render check for the PDF.js viewer, run in REAL Chrome or Chromium.
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
//   --device iphone|ipad|android|mac-safari|windows-touch
//                       emulate that device's user agent, platform, touch
//                       points, viewport, and navigator.pdfViewerEnabled
//                       (values in DEVICES below); default: plain Chrome
//   --expect-native <n> fail unless exactly n embeds use the native viewer
//   --expect-pdfjs <n>  fail unless exactly n embeds use PDF.js
//   --expect-pages <n>  fail unless each PDF.js embed has exactly n
//                       .embedpdf-page elements, each with an inked canvas
//   --expect-links <n>  fail unless exactly n download links
//                       (.embedpdf-download, .embedpdf object a[download],
//                       a.embedpdf-btn) exist, each with a data: or blob: href
//   --alone http|file   copy the page alone into an empty temporary directory,
//                       then serve it over HTTP or open it as a file:// URL.
//                       Also fail unless each native <object> has a data: or
//                       blob: URL whose bytes start with %PDF.
//   --remote blocked|cors|missing
//                       serve the PDFs from a second server on another port
//                       (another origin) with no Access-Control-Allow-Origin
//                       header, with "*", or as HTTP 404, and point each
//                       embed's data-src and links at it; fail unless every
//                       embed's data-src is on that server
//   --expect-failed <n> fail unless exactly n embeds show the load-failure
//                       state: the text "This PDF cannot be shown here.", an
//                       "Open the PDF" link to the same absolute URL as
//                       data-src with target _blank, and no "Download PDF
//                       file." link
// Set CHROME_PATH to use another Chrome or Chromium binary.
//
// On a RevealJS page the check goes to each slide with Reveal.slide() and
// scrolls each embed's pages into view before it measures.
//
// Exits non-zero if the page does not load, if no embed is hydrated, if any
// PDF.js block failed to render actual content, or if an expected count does
// not match.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import puppeteer from "puppeteer-core";
import { serveDocs, serveRemote, pointPdfsAt, REMOTE_MODES, DOCS } from "./serve_docs.mjs";

// For iphone and ipad, userAgent, maxTouchPoints, and pdfViewerEnabled are what
// Safari reported in iOS 27.0 simulators (iPhone 17, iPad Air 11-inch M4) via
// tests/ios_check.mjs on 2026-10-18; platform and viewport are not measured.
// android is not measured: an Android Chrome user agent with pdfViewerEnabled
// false, the case in which renderer=auto uses PDF.js.
// The other devices report pdfViewerEnabled = true.
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
  android: {
    userAgent:
      "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Mobile Safari/537.36",
    platform: "Linux armv81",
    maxTouchPoints: 5,
    pdfViewerEnabled: false,
    viewport: { width: 412, height: 915, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true },
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

// one optional page or URL, plus flags that each take a value; anything else
// (a misspelled flag, --flag=value) is an error rather than silently ignored
const FLAGS = ["device", "expect-native", "expect-pdfjs", "expect-pages", "expect-links", "expect-failed", "alone", "remote"];
const args = process.argv.slice(2);
const flags = {};
const positional = [];
for (let i = 0; i < args.length; i++) {
  if (!args[i].startsWith("--")) {
    positional.push(args[i]);
    continue;
  }
  const name = args[i].slice(2);
  if (!FLAGS.includes(name) || i + 1 >= args.length) {
    console.error(`render_check: unexpected argument "${args[i]}" (flags: --${FLAGS.join(", --")}, each with a value)`);
    process.exit(2);
  }
  flags[name] = args[++i];
}
if (positional.length > 1) {
  console.error(`render_check: expected one page or URL, got ${positional.join(" ")}`);
  process.exit(2);
}
const deviceName = flags["device"] ?? null;
const expectNative = flags["expect-native"] ?? null;
const expectPdfjs = flags["expect-pdfjs"] ?? null;
const expectPages = flags["expect-pages"] ?? null;
const expectLinks = flags["expect-links"] ?? null;
const expectFailed = flags["expect-failed"] ?? null;
const alone = flags["alone"] ?? null;
const remote = flags["remote"] ?? null;
const target = positional[0] || "example.html";
if (alone && alone !== "http" && alone !== "file") {
  console.error("render_check: --alone must be http or file");
  process.exit(2);
}
if (remote && !REMOTE_MODES.includes(remote)) {
  console.error(`render_check: --remote must be ${REMOTE_MODES.join(", ")}`);
  process.exit(2);
}
if (remote && (alone || /^https?:/.test(target))) {
  console.error("render_check: --remote needs a page under docs/, without --alone");
  process.exit(2);
}
if (alone && /^https?:/.test(target)) {
  console.error("render_check: --alone needs a page under docs/, not a URL");
  process.exit(2);
}
const device = deviceName ? DEVICES[deviceName] : null;
if (deviceName && !device) {
  console.error(`render_check: unknown --device ${deviceName} (use ${Object.keys(DEVICES).join(", ")})`);
  process.exit(2);
}

const CHROME =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"; // macOS default

// --alone: the page is the only file in its directory, so nothing it fetches
// by a relative URL can be found
let aloneDir = null;
if (alone) {
  const source = path.resolve(DOCS, target);
  if (!source.startsWith(DOCS + path.sep) || !fs.existsSync(source)) {
    console.error(`render_check: --alone needs a page under docs/, got ${target}`);
    process.exit(2);
  }
  aloneDir = fs.mkdtempSync(path.join(os.tmpdir(), "embedpdf-alone-"));
  // removed on every exit, a failed server start or browser launch included
  process.on("exit", () => fs.rmSync(aloneDir, { recursive: true, force: true }));
  fs.copyFileSync(source, path.join(aloneDir, path.basename(target)));
}
const remoteServer = remote ? await serveRemote(remote) : null;
const remoteBase = remoteServer ? `http://127.0.0.1:${remoteServer.address().port}/` : null;
const server =
  /^https?:/.test(target) || alone === "file"
    ? null
    : await serveDocs(
        aloneDir ? { root: aloneDir } : remoteBase ? { transformHtml: (html) => pointPdfsAt(html, remoteBase) } : {}
      );
const url =
  alone === "file"
    ? pathToFileURL(path.join(aloneDir, path.basename(target))).href
    : server
      ? `http://127.0.0.1:${server.address().port}/${aloneDir ? path.basename(target) : target}`
      : target;

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage();
  // console errors (a blocked or missing PDF names its cause here)
  const consoleErrors = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
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
  const response = await page.goto(url, { waitUntil: "networkidle0" });
  if (!response || !response.ok()) {
    throw new Error(`could not load ${url} (HTTP ${response ? response.status() : "no response"})`);
  }
  // scroll so lazily-rendered pages come into view; on a RevealJS page, show
  // each slide first, because a hidden slide's pages have no size to render at
  await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const scrollPages = async (root) => {
      for (const p of root.querySelectorAll(".embedpdf-page")) {
        p.scrollIntoView({ block: "nearest" });
        await sleep(300);
      }
    };
    if (window.Reveal && typeof window.Reveal.slide === "function") {
      for (const s of window.Reveal.getSlides()) {
        const { h, v } = window.Reveal.getIndices(s);
        window.Reveal.slide(h, v);
        await sleep(1500);
        await scrollPages(s);
      }
      return;
    }
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await sleep(150);
    }
    await sleep(1000);
    await scrollPages(document);
  });
  await new Promise((r) => setTimeout(r, 4000));

  const res = await page.evaluate(async () => {
    const hasInk = (c) => {
      const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
      for (let i = 0; i < d.length; i += 400) if (d[i] < 128 && d[i + 3] > 0) return true;
      return false;
    };
    const canvases = [...document.querySelectorAll(".embedpdf-page canvas")];
    const withInk = canvases.filter(hasInk).length;
    // per PDF.js embed: one entry per .embedpdf-page, true when its canvas has ink
    const pdfjsPages = [...document.querySelectorAll(".embedpdf-pdfjs")].map((el) =>
      [...el.querySelectorAll(".embedpdf-page")].map((p) => {
        const c = p.querySelector("canvas");
        return !!c && hasInk(c);
      })
    );
    const objects = [];
    for (const o of document.querySelectorAll(".embedpdf-native object")) {
      const entry = { scheme: String(o.data).split(":")[0], pdf: false };
      try {
        const buf = new Uint8Array(await (await fetch(o.data)).arrayBuffer());
        entry.pdf = String.fromCharCode(...buf.slice(0, 4)) === "%PDF";
      } catch (err) {
        entry.error = String(err);
      }
      objects.push(entry);
    }
    const links = [...document.querySelectorAll(".embedpdf-download, .embedpdf object a[download], a.embedpdf-btn")].map(
      (a) => (a.getAttribute("href") || "").split(":")[0]
    );
    // embeds in the load-failure state (see --expect-failed); each other embed
    // that holds the failure text is reported as malformed
    // each embed's PDF as an absolute URL (--remote checks they are remote)
    const srcs = [...document.querySelectorAll("div.embedpdf")].map((el) =>
      new URL(el.dataset.src || "", document.baseURI).href
    );
    const failed = [];
    const malformed = [];
    document.querySelectorAll("div.embedpdf").forEach((el, i) => {
      if (!el.textContent.includes("This PDF cannot be shown here.")) return;
      const links = [...el.querySelectorAll("a")];
      const open = links.find((a) => a.textContent.trim() === "Open the PDF");
      const expected = new URL(el.dataset.src || "", document.baseURI).href;
      const ok =
        !!open &&
        open.href === expected &&
        open.target === "_blank" &&
        !links.some((a) => a.textContent.trim() === "Download PDF file.");
      (ok ? failed : malformed).push({ index: i + 1, href: open ? open.href : null, expected, target: open ? open.target : null });
    });
    return {
      userAgent: navigator.userAgent,
      pdfViewerEnabled: navigator.pdfViewerEnabled,
      maxTouchPoints: navigator.maxTouchPoints,
      native: document.querySelectorAll(".embedpdf-native").length,
      pdfjs: document.querySelectorAll(".embedpdf-pdfjs").length,
      canvases: canvases.length,
      canvasesWithInk: withInk,
      pdfjsPages,
      objects,
      links,
      failed,
      malformed,
      srcs,
    };
  });

  console.log(JSON.stringify({ device: deviceName || "chrome", alone, remote, ...res, consoleErrors }, null, 2));
  // ok if there were no PDF.js blocks, or every rendered canvas has content
  let ok = res.pdfjs === 0 || (res.canvases > 0 && res.canvasesWithInk === res.canvases);
  if (!ok) console.error("render_check: PDF.js blocks did not all render content");
  if (res.native + res.pdfjs + res.failed.length === 0) {
    // a wrong page, or viewer JS that never loaded, must not pass as "no PDF.js blocks"
    console.error("render_check: no embed was hydrated");
    ok = false;
  }
  if (expectNative !== null && res.native !== Number(expectNative)) {
    console.error(`render_check: expected ${expectNative} native embeds, found ${res.native}`);
    ok = false;
  }
  if (expectPdfjs !== null && res.pdfjs !== Number(expectPdfjs)) {
    console.error(`render_check: expected ${expectPdfjs} PDF.js embeds, found ${res.pdfjs}`);
    ok = false;
  }
  if (expectPages !== null) {
    if (res.pdfjsPages.length === 0) {
      console.error("render_check: --expect-pages given, but no embed uses PDF.js");
      ok = false;
    }
    res.pdfjsPages.forEach((pages, i) => {
      if (pages.length !== Number(expectPages)) {
        console.error(`render_check: PDF.js embed ${i + 1} has ${pages.length} pages, expected ${expectPages}`);
        ok = false;
      } else if (!pages.every(Boolean)) {
        console.error(`render_check: PDF.js embed ${i + 1} has pages without ink`);
        ok = false;
      }
    });
  }
  if (alone) {
    res.objects.forEach((o, i) => {
      if (!["data", "blob"].includes(o.scheme) || !o.pdf) {
        console.error(`render_check: native object ${i + 1} (${o.scheme}:) did not load a PDF${o.error ? ": " + o.error : ""}`);
        ok = false;
      }
    });
  }
  if (expectLinks !== null) {
    if (res.links.length !== Number(expectLinks)) {
      console.error(`render_check: expected ${expectLinks} download links, found ${res.links.length}`);
      ok = false;
    }
    if (!res.links.every((s) => s === "data" || s === "blob")) {
      console.error(`render_check: download links not inline: ${res.links.join(", ")}`);
      ok = false;
    }
  }
  if (remoteBase) {
    // the rewrite must have pointed every embed at the remote server
    const local = res.srcs.filter((s) => !s.startsWith(remoteBase));
    if (res.srcs.length === 0 || local.length) {
      console.error(`render_check: --remote ${remote}: embeds not on ${remoteBase}: ${local.join(", ") || "(no embeds)"}`);
      ok = false;
    }
  }
  if (res.malformed.length) {
    console.error(`render_check: embeds with the failure text but not the failure state: ${JSON.stringify(res.malformed)}`);
    ok = false;
  }
  if (expectFailed !== null && res.failed.length !== Number(expectFailed)) {
    console.error(`render_check: expected ${expectFailed} embeds in the load-failure state, found ${res.failed.length}`);
    ok = false;
  }
  if (!ok) process.exitCode = 1;
} finally {
  await browser.close();
  server?.close();
  remoteServer?.close();
}
