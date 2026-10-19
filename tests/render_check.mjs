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
//                       embed's data-src and button link is on that server,
//                       and unless the console shows each failure's cause
//                       (PDF.js UnknownErrorException for the CORS block of
//                       blocked, ResponseException for the 404 of missing).
//                       blocked and missing need --expect-failed.
//   --expect-failed <n> fail unless exactly n embeds show the load-failure
//                       state: the text "This PDF cannot be shown here.", an
//                       "Open the PDF" link to the same absolute URL as
//                       data-src with target _blank, and no "Download PDF
//                       file." link. Without it, any embed in that state fails
//                       the run.
//   --expect-text "<p1>|<p2>|…"
//                       phrase i is a phrase of page i's text. Before the
//                       pages are scrolled (on a RevealJS page, when each
//                       slide is shown), wait at most 10 s for every PDF.js
//                       page to have text, then fail unless each page's
//                       .embedpdf-text block contains its own phrase and no
//                       other page's, and is hidden but readable: computed
//                       width and height 1px, overflow hidden, user-select
//                       none, display not none, visibility visible, no
//                       aria-hidden on it or an ancestor. After the pages
//                       are scrolled and each has a canvas, also fail unless
//                       Chrome's accessibility tree (puppeteer
//                       accessibility.snapshot, interestingOnly false) gives
//                       each page role group, the name "Page i of n", and its
//                       phrase, gives no page canvas a node, and names the
//                       toolbar controls "Zoom out", "Zoom in", and "Download
//                       PDF". Whitespace is collapsed before phrases are
//                       compared.
//   --plant notext|swap|visible|gone|nolabel|canvas|noname
//                       plant a defect in the first PDF.js embed before the
//                       --expect-text checks measure it; the run must then
//                       fail: notext empties the last page's text, swap
//                       swaps the first two pages' text, visible sets the
//                       last text block's overflow to visible, gone sets its
//                       display to none, nolabel removes the last page's
//                       aria-label, canvas removes the last canvas's
//                       aria-hidden, noname removes the zoom-out button's
//                       title. Needs --expect-text.
//   --expect-name "<file name>"
//                       after the pages are scrolled, fail unless each PDF.js
//                       embed has role="group" and aria-label "PDF: <file
//                       name>" in the DOM, and Chrome's accessibility tree
//                       gives it role group and that name. Also fail unless
//                       each toolbar control (zoom out, zoom in, download)
//                       has a non-empty tree name, no tree description equal
//                       to that name, and a title equal to that name, and
//                       unless each embed without a toolbar has
//                       data-toolbar="false".
//   --plant wrongname|dupdesc|notoolbar
//                       with --expect-name, plant a defect in the first
//                       PDF.js embed; the run must then fail: wrongname
//                       changes its aria-label to "PDF: wrong.pdf", dupdesc
//                       gives its zoom-in button an aria-label equal to its
//                       title, notoolbar removes its toolbar.
// Set CHROME_PATH to use another Chrome or Chromium binary.
//
// On a RevealJS page the check goes to each slide with Reveal.slide() and
// scrolls each embed's pages into view before it measures.
//
// Exits non-zero if the page does not load, if no embed is hydrated, if any
// PDF.js block failed to render actual content, if an expected count does
// not match, or if an --expect-text check fails. Exits 2 on a bad argument,
// or when --plant finds nothing to plant in.

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
const FLAGS = ["device", "expect-native", "expect-pdfjs", "expect-pages", "expect-links", "expect-failed", "expect-text", "expect-name", "plant", "alone", "remote"];
const TEXT_PLANTS = ["notext", "swap", "visible", "gone"];
const TREE_PLANTS = ["nolabel", "canvas", "noname"];
const NAME_PLANTS = ["wrongname", "dupdesc", "notoolbar"];
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
const normalize = (s) => s.replace(/\s+/g, " ").trim();
const phrases = flags["expect-text"] === undefined ? null : flags["expect-text"].split("|").map(normalize);
const plant = flags["plant"] ?? null;
const target = positional[0] || "example.html";
if (phrases && phrases.some((p) => !p)) {
  console.error("render_check: --expect-text needs a non-empty phrase for each page");
  process.exit(2);
}
const expectName = flags["expect-name"] ?? null;
if (expectName === "") {
  console.error("render_check: --expect-name needs a file name");
  process.exit(2);
}
if (
  plant &&
  !((phrases && [...TEXT_PLANTS, ...TREE_PLANTS].includes(plant)) || (expectName && NAME_PLANTS.includes(plant)))
) {
  console.error(
    `render_check: --plant must be ${[...TEXT_PLANTS, ...TREE_PLANTS].join(", ")} with --expect-text, or ${NAME_PLANTS.join(", ")} with --expect-name`
  );
  process.exit(2);
}
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
if ((remote === "blocked" || remote === "missing") && expectFailed === null) {
  console.error(`render_check: --remote ${remote} needs --expect-failed`);
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

// --expect-text, before the pages scroll: the hidden text of each page of each
// PDF.js embed under a root (the document, or RevealJS slide k), read once
// every page has text or 10 s have passed. A text plant goes into the page's
// first PDF.js embed, when it is under the root, just before the read.
function measureText(page, slide) {
  return page.evaluate(
    async (slide, plant, textPlants) => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const root = slide === null ? document : window.Reveal.getSlides()[slide];
      const embeds = () => [...root.querySelectorAll(".embedpdf-pdfjs")];
      const blocks = () => embeds().flatMap((el) => [...el.querySelectorAll(".embedpdf-page")].map((p) => p.querySelector(".embedpdf-text")));
      const unhydrated = () => root.querySelectorAll("div.embedpdf:not(.embedpdf-pdfjs):not(.embedpdf-native):not(.embedpdf-failed)").length;
      const start = Date.now();
      while (Date.now() - start < 10000 && (unhydrated() || !blocks().every((t) => t && t.textContent.trim()))) await sleep(100);
      const waitedMs = Date.now() - start;
      let planted = null;
      const first = document.querySelector(".embedpdf-pdfjs");
      if (textPlants.includes(plant) && first && root.contains(first)) {
        const t = [...first.querySelectorAll(".embedpdf-page .embedpdf-text")];
        const last = t[t.length - 1];
        if (plant === "notext" && last) last.textContent = "";
        if (plant === "swap" && t.length > 1) [t[0].textContent, t[1].textContent] = [t[1].textContent, t[0].textContent];
        if (plant === "visible" && last) last.style.overflow = "visible";
        if (plant === "gone" && last) last.style.display = "none";
        if (last && (plant !== "swap" || t.length > 1)) planted = plant;
      }
      const pages = embeds().map((el) =>
        [...el.querySelectorAll(".embedpdf-page")].map((p) => {
          const t = p.querySelector(".embedpdf-text");
          if (!t) return null;
          const s = getComputedStyle(t);
          return {
            text: t.textContent,
            width: s.width,
            height: s.height,
            overflow: s.overflow,
            userSelect: s.userSelect || s.webkitUserSelect,
            display: s.display,
            visibility: s.visibility,
            ariaHidden: !!t.closest('[aria-hidden="true"]'),
          };
        })
      );
      return { slide, waitedMs, planted, pages };
    },
    slide,
    plant,
    TEXT_PLANTS
  );
}

// the failures in one measureText report
function textFailures(report) {
  const where = report.slide === null ? "" : ` on slide ${report.slide + 1}`;
  const out = [];
  report.pages.forEach((pages, i) => {
    const embed = `PDF.js embed ${i + 1}${where}`;
    if (pages.length !== phrases.length) out.push(`${embed} has ${pages.length} pages, --expect-text gives ${phrases.length} phrases`);
    pages.forEach((b, j) => {
      const at = `${embed}, page ${j + 1}`;
      if (!b) return out.push(`${at}: no .embedpdf-text block`);
      const text = normalize(b.text);
      if (phrases[j] && !text.includes(phrases[j])) out.push(`${at}: text lacks "${phrases[j]}"`);
      phrases.forEach((p, k) => {
        if (k !== j && text.includes(p)) out.push(`${at}: text has page ${k + 1}'s phrase "${p}"`);
      });
      if (b.width !== "1px" || b.height !== "1px") out.push(`${at}: text box is ${b.width} by ${b.height}, not 1px by 1px`);
      if (b.overflow !== "hidden") out.push(`${at}: text overflow is ${b.overflow}, not hidden`);
      if (b.userSelect !== "none") out.push(`${at}: text user-select is ${b.userSelect}, not none`);
      if (b.display === "none") out.push(`${at}: text display is none`);
      if (b.visibility !== "visible") out.push(`${at}: text visibility is ${b.visibility}`);
      if (b.ariaHidden) out.push(`${at}: text is under aria-hidden`);
    });
  });
  return out;
}

// --expect-text, after the pages scroll: Chrome's accessibility tree for each
// page, canvas, and toolbar control of each PDF.js embed under a root. Waits
// at most 10 s per embed for its pages to have canvases. Then a tree plant goes
// into the page's first PDF.js embed, when it is under the root.
async function treeFailures(page, slide) {
  const where = slide === null ? "" : ` on slide ${slide + 1}`;
  const root = slide === null ? page : (await page.evaluateHandle((k) => window.Reveal.getSlides()[k], slide)).asElement();
  const embeds = await root.$$(".embedpdf-pdfjs");
  for (const embed of embeds) {
    const pages = await embed.$$(".embedpdf-page");
    for (let t = 0; t < 100 && (await embed.$$(".embedpdf-page canvas")).length < pages.length; t++) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  const planted = await page.evaluate(
    (slide, plant, treePlants) => {
      const root = slide === null ? document : window.Reveal.getSlides()[slide];
      const first = document.querySelector(".embedpdf-pdfjs");
      if (!treePlants.includes(plant) || !first || !root.contains(first)) return null;
      const pages = first.querySelectorAll(".embedpdf-page");
      const last = pages[pages.length - 1];
      const target =
        plant === "nolabel" ? last : plant === "canvas" ? last && last.querySelector("canvas") : first.querySelector(".embedpdf-toolbar button");
      if (!target) return null;
      target.removeAttribute(plant === "canvas" ? "aria-hidden" : plant === "noname" ? "title" : "aria-label");
      return plant;
    },
    slide,
    plant,
    TREE_PLANTS
  );
  const snap = (el) => page.accessibility.snapshot({ root: el, interestingOnly: false });
  const allText = (node) => (node ? [node.name || "", ...(node.children || []).map(allText)].join(" ") : "");
  const out = [];
  for (const [i, embed] of embeds.entries()) {
    const at = `PDF.js embed ${i + 1}${where}`;
    const pages = await embed.$$(".embedpdf-page");
    const canvases = await embed.$$(".embedpdf-page canvas");
    if (canvases.length !== pages.length) out.push(`${at}: ${canvases.length} canvases for ${pages.length} pages`);
    for (const [j, p] of pages.entries()) {
      const node = await snap(p);
      const name = `Page ${j + 1} of ${pages.length}`;
      if (!node) out.push(`${at}, page ${j + 1}: not in the accessibility tree`);
      else {
        if (node.role !== "group") out.push(`${at}, page ${j + 1}: role is ${node.role}, not group`);
        if (node.name !== name) out.push(`${at}, page ${j + 1}: name is "${node.name}", not "${name}"`);
        if (phrases[j] && !normalize(allText(node)).includes(phrases[j])) out.push(`${at}, page ${j + 1}: tree text lacks "${phrases[j]}"`);
      }
    }
    for (const [j, c] of canvases.entries()) {
      const node = await snap(c);
      if (node) out.push(`${at}: canvas ${j + 1} is in the accessibility tree (role ${node.role})`);
    }
    const toolbar = await embed.$(".embedpdf-toolbar");
    if (toolbar) {
      const buttons = await toolbar.$$("button");
      const controls = [
        [buttons[0], "Zoom out"],
        [buttons[1], "Zoom in"],
        [await toolbar.$("a.embedpdf-download"), "Download PDF"],
      ];
      for (const [el, name] of controls) {
        const node = el ? await snap(el) : null;
        if (!node || node.name !== name) out.push(`${at}: toolbar control named "${node ? node.name : "(missing)"}", not "${name}"`);
      }
    }
  }
  return { planted, failures: out, embeds: embeds.length };
}

// --expect-name, after the pages scroll: each PDF.js embed under a root is a
// group named "PDF: <file name>", in the DOM and in Chrome's accessibility
// tree. A name plant goes into the page's first PDF.js embed, when it is under
// the root.
async function nameFailures(page, slide) {
  const where = slide === null ? "" : ` on slide ${slide + 1}`;
  const root = slide === null ? page : (await page.evaluateHandle((k) => window.Reveal.getSlides()[k], slide)).asElement();
  const planted = await page.evaluate(
    (slide, plant, namePlants) => {
      const root = slide === null ? document : window.Reveal.getSlides()[slide];
      const first = document.querySelector(".embedpdf-pdfjs");
      if (!namePlants.includes(plant) || !first || !root.contains(first)) return null;
      if (plant === "wrongname") first.setAttribute("aria-label", "PDF: wrong.pdf");
      if (plant === "dupdesc") {
        const zoomIn = first.querySelectorAll(".embedpdf-toolbar button")[1];
        if (!zoomIn) return null;
        zoomIn.setAttribute("aria-label", zoomIn.title);
      }
      if (plant === "notoolbar") {
        const toolbar = first.querySelector(".embedpdf-toolbar");
        if (!toolbar) return null;
        toolbar.remove();
      }
      return plant;
    },
    slide,
    plant,
    NAME_PLANTS
  );
  const name = "PDF: " + expectName;
  const embeds = await root.$$(".embedpdf-pdfjs");
  const out = [];
  for (const [i, embed] of embeds.entries()) {
    const at = `PDF.js embed ${i + 1}${where}`;
    const attrs = await embed.evaluate((el) => ({ role: el.getAttribute("role"), label: el.getAttribute("aria-label") }));
    if (attrs.role !== "group") out.push(`${at}: role attribute is ${attrs.role}, not group`);
    if (attrs.label !== name) out.push(`${at}: aria-label is "${attrs.label}", not "${name}"`);
    const node = await page.accessibility.snapshot({ root: embed, interestingOnly: false });
    if (!node) out.push(`${at}: not in the accessibility tree`);
    else {
      if (node.role !== "group") out.push(`${at}: tree role is ${node.role}, not group`);
      if (node.name !== name) out.push(`${at}: tree name is "${node.name}", not "${name}"`);
    }
    // toolbar controls: one name (the title), not repeated as a description
    // an embed lacks a toolbar only when its shortcode set toolbar=false
    const toolbar = await embed.$(".embedpdf-toolbar");
    const toolbarOff = await embed.evaluate((el) => el.dataset.toolbar === "false");
    if (!toolbar && !toolbarOff) out.push(`${at}: no toolbar, and toolbar=false is not set`);
    if (toolbar) {
      const buttons = await toolbar.$$("button");
      const controls = [
        ["zoom out", buttons[0]],
        ["zoom in", buttons[1]],
        ["download", await toolbar.$("a.embedpdf-download")],
      ];
      for (const [what, el] of controls) {
        const c = `${at}, ${what} control`;
        if (!el) {
          out.push(`${c}: missing`);
          continue;
        }
        const title = await el.evaluate((e) => e.getAttribute("title"));
        const node = await page.accessibility.snapshot({ root: el, interestingOnly: false });
        if (!node || !node.name) out.push(`${c}: no name in the accessibility tree`);
        else {
          if (node.description === node.name) out.push(`${c}: description repeats the name "${node.name}"`);
          if (title !== node.name) out.push(`${c}: title "${title}" is not the name "${node.name}"`);
        }
      }
    }
  }
  return { planted, failures: out, embeds: embeds.length };
}

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
  // each slide first, because a hidden slide's pages have no size to render at.
  // --expect-text reads the hidden text before the pages scroll, and the
  // accessibility tree after.
  const slides = await page.evaluate(() =>
    window.Reveal && typeof window.Reveal.slide === "function" ? window.Reveal.getSlides().length : 0
  );
  const scrollPages = (slide) =>
    page.evaluate(async (slide) => {
      const root = slide === null ? document : window.Reveal.getSlides()[slide];
      for (const p of root.querySelectorAll(".embedpdf-page")) {
        p.scrollIntoView({ block: "nearest" });
        await new Promise((r) => setTimeout(r, 300));
      }
    }, slide);
  const textReports = [];
  const treeReports = [];
  const nameReports = [];
  if (slides) {
    for (let k = 0; k < slides; k++) {
      await page.evaluate(async (k) => {
        const { h, v } = window.Reveal.getIndices(window.Reveal.getSlides()[k]);
        window.Reveal.slide(h, v);
        await new Promise((r) => setTimeout(r, 1500));
      }, k);
      if (phrases) textReports.push(await measureText(page, k));
      await scrollPages(k);
      if (phrases) treeReports.push(await treeFailures(page, k));
      if (expectName) nameReports.push(await nameFailures(page, k));
    }
  } else {
    if (phrases) textReports.push(await measureText(page, null));
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 150));
      }
      await new Promise((r) => setTimeout(r, 1000));
    });
    await scrollPages(null);
  }
  await new Promise((r) => setTimeout(r, 4000));
  if (phrases && !slides) treeReports.push(await treeFailures(page, null));
  if (expectName && !slides) nameReports.push(await nameFailures(page, null));

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
    // each embed's PDF and each button link as an absolute URL (--remote
    // checks that they are remote)
    const srcs = [
      ...[...document.querySelectorAll("div.embedpdf")].map((el) => new URL(el.dataset.src || "", document.baseURI).href),
      ...[...document.querySelectorAll("a.embedpdf-btn")].map((a) => a.href),
    ];
    // embeds in the load-failure state (see --expect-failed); each other embed
    // that holds the failure text is reported as malformed
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

  const text = phrases
    ? {
        phrases,
        plant,
        planted: [...textReports, ...treeReports].map((r) => r.planted).find(Boolean) || null,
        waitedMs: textReports.map((r) => r.waitedMs),
        pagesRead: textReports.reduce((n, r) => n + r.pages.flat().length, 0),
        embedsRead: textReports.reduce((n, r) => n + r.pages.length, 0),
        treeEmbeds: treeReports.reduce((n, r) => n + r.embeds, 0),
        failures: [...textReports.flatMap(textFailures), ...treeReports.flatMap((r) => r.failures)],
      }
    : undefined;
  const names = expectName
    ? {
        expectName,
        plant,
        planted: nameReports.map((r) => r.planted).find(Boolean) || null,
        embeds: nameReports.reduce((n, r) => n + r.embeds, 0),
        failures: nameReports.flatMap((r) => r.failures),
      }
    : undefined;
  console.log(JSON.stringify({ device: deviceName || "chrome", alone, remote, ...res, text, names, consoleErrors }, null, 2));
  if (names) {
    if (plant && NAME_PLANTS.includes(plant) && !names.planted) {
      console.error(`render_check: --plant ${plant} found nothing to plant in`);
      await browser.close();
      server?.close();
      remoteServer?.close();
      process.exit(2);
    }
    // every PDF.js embed must have been checked
    if (names.embeds !== res.pdfjs || res.pdfjs === 0) {
      console.error(`render_check: --expect-name checked ${names.embeds} embeds, of ${res.pdfjs} PDF.js embeds`);
      process.exitCode = 1;
    }
    for (const f of names.failures) console.error("render_check: " + f);
    if (names.failures.length) process.exitCode = 1;
  }
  if (text) {
    if (plant && !NAME_PLANTS.includes(plant) && !text.planted) {
      console.error(`render_check: --plant ${plant} found nothing to plant in`);
      await browser.close();
      server?.close();
      remoteServer?.close();
      process.exit(2);
    }
    // every PDF.js embed must have been read, both before and after the scroll
    if (text.embedsRead !== res.pdfjs || text.treeEmbeds !== res.pdfjs || res.pdfjs === 0) {
      console.error(`render_check: --expect-text read ${text.embedsRead} embeds before and ${text.treeEmbeds} after the scroll, of ${res.pdfjs} PDF.js embeds`);
      process.exitCode = 1;
    }
    for (const f of text.failures) console.error("render_check: " + f);
    if (text.failures.length) process.exitCode = 1;
  }
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
    // the rewrite must have pointed every embed and button link at the remote server
    const local = res.srcs.filter((s) => !s.startsWith(remoteBase));
    if (res.srcs.length === 0 || local.length) {
      console.error(`render_check: --remote ${remote}: embeds or links not on ${remoteBase}: ${local.join(", ") || "(no embeds)"}`);
      ok = false;
    }
    // each failed embed must have failed for the mode's reason: the viewer logs
    // the PDF.js error for its URL, UnknownErrorException for the CORS block
    // (blocked) and ResponseException for the 404 (missing); an import failure
    // logs a TypeError instead
    const kind = { blocked: "UnknownErrorException", missing: "ResponseException" }[remote];
    const wrong = res.failed.filter(
      (f) => !consoleErrors.some((t) => t.startsWith("embedpdf: failed to render " + f.expected + " ") && (!kind || t.includes(kind)))
    );
    if (wrong.length) {
      console.error(`render_check: --remote ${remote}: no "${kind || "failed to render"}" error for ${wrong.map((f) => f.expected).join(", ")}`);
      ok = false;
    }
  }
  if (res.malformed.length) {
    console.error(`render_check: embeds with the failure text but not the failure state: ${JSON.stringify(res.malformed)}`);
    ok = false;
  }
  if (expectFailed === null && res.failed.length) {
    console.error(`render_check: ${res.failed.length} embeds are in the load-failure state; pass --expect-failed if that is expected`);
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
