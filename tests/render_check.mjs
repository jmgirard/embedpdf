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
//                       .embedpdf-page elements (each page's canvas is
//                       checked for ink on every run, with or without this)
//   --plant blank|nocanvas|nopages
//                       plant a defect in the first PDF.js embed after the
//                       scroll, before the ink check; the run must then
//                       fail: blank paints the last page's canvas white,
//                       nocanvas removes that canvas, nopages removes every
//                       page of the embed. Needs no other flag.
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
//                       blocked and missing need --expect-failed. A page
//                       whose embeds hold their PDF inline (self-contained)
//                       exits 2 before the browser opens.
//   --missing-pdfs      takes no value: the page's own server answers HTTP
//                       404 for every path that ends in .pdf; fail unless
//                       each failed embed's data-src is on that server and
//                       the console shows the viewer's "failed to render"
//                       line for it with PDF.js ResponseException (one
//                       line per embed). Needs --expect-failed above 0; not
//                       with --remote or --alone.
//   --expect-failed <n> fail unless exactly n embeds show the load-failure
//                       state: the text "This PDF cannot be shown here.", an
//                       "Open the PDF" link to the same absolute URL as
//                       data-src with target _blank, and no "Download PDF
//                       file." link. Without it, any embed in that state fails
//                       the run.
//   --expect-text "<p1>|<p2>|…"
//                       phrase i is a phrase of page i's text. First, once
//                       for the whole page (before any slide is shown or
//                       any page scrolls), wait until every embed is
//                       hydrated and every PDF.js page has text, or 10 s
//                       pass with no embed newly hydrated and no page newly
//                       with text, or 60 s pass in all. If an embed is still
//                       not hydrated then, print how many and exit 1 at
//                       once. Before the pages are scrolled (on a RevealJS
//                       page, when each slide is shown), fail unless each
//                       page's .embedpdf-text block contains its own phrase
//                       and no other page's, and is hidden but readable:
//                       computed width and height 1px, overflow hidden,
//                       user-select none, display not none, visibility
//                       visible, no aria-hidden on it or an ancestor, and no
//                       inert attribute or computed content-visibility
//                       hidden on it or an element that contains it. After
//                       the pages are scrolled and each has a canvas (a wait
//                       of at most 10 s per embed), also fail unless Chrome's
//                       accessibility tree (puppeteer accessibility.snapshot,
//                       interestingOnly false) gives each page role group,
//                       the name "Page i of n", and its phrase, gives no page
//                       canvas a node, and names the toolbar controls "Zoom
//                       out", "Zoom in", and "Download PDF". A null canvas
//                       snapshot counts as hidden only for a canvas still in
//                       the page; for one that left it, the page's current
//                       canvas is read once instead. A snapshot that throws
//                       for a canvas still in the page fails. On a RevealJS page, a
//                       slide whose canvas wait runs out stops the run with
//                       exit 1. Whitespace is collapsed before phrases are
//                       compared.
//   --slow-text <ms>    test aid, with --expect-text: after the whole-page
//                       wait above, empty the text of every PDF.js page the
//                       viewer filled and put it back one page every <ms> ms
//                       while that wait runs again; the restoring stops when
//                       that wait ends. The run must still pass when <ms> is
//                       at most 9000 and pages × <ms> is at most 50000, which
//                       leaves room for late timers under the 10 s and 60 s
//                       limits.
//   --plant notext|swap|visible|gone|inert|cvhidden|nolabel|canvas|noname|detach|unhydrated|norender
//                       plant a defect in the first PDF.js embed before the
//                       --expect-text checks measure it; the run must then
//                       fail: notext empties the last page's text, swap
//                       swaps the first two pages' text, visible sets the
//                       last text block's overflow to visible, gone sets its
//                       display to none, inert sets inert on its page,
//                       cvhidden sets its content-visibility to hidden,
//                       nolabel removes the last page's aria-label, canvas
//                       removes the last canvas's aria-hidden, noname
//                       removes the zoom-out button's title, detach removes
//                       the last canvas just before its snapshot. Two plants
//                       act on the whole page: unhydrated adds a div.embedpdf
//                       with no data-src before the text wait, and norender
//                       makes every canvas's getContext return null from
//                       load on, so no page gets a canvas (meant for a
//                       RevealJS page: elsewhere each embed's canvas wait
//                       runs out in turn). Needs --expect-text.
//   --expect-name "<file name>" | "<name 1>|<name 2>|..."
//                       after the pages are scrolled, fail unless each PDF.js
//                       embed has role="group" and aria-label "PDF: <file
//                       name>" in the DOM, and Chrome's accessibility tree
//                       gives it role group and that name. One name applies
//                       to as many PDF.js embeds as --expect-pdfjs gives,
//                       which it then needs. A "|" list gives one name per
//                       PDF.js embed, in page order (slide order on a
//                       RevealJS page), and must name all of them, so a file
//                       name that holds "|" cannot be given. A name "-"
//                       stands for an embed named "PDF" alone. A name that
//                       the expanded list holds n > 1 times is expected as
//                       "PDF: <file name> (k of n)", k counting in list
//                       order (tests/expect_names.mjs). Also fail unless
//                       each toolbar control (zoom out, zoom in, download)
//                       has a non-empty tree name, no tree description equal
//                       to that name, and a title equal to that name, and
//                       unless each embed without a toolbar has
//                       data-toolbar="false".
//   --plant wrongname|dupdesc|duplink|norole|notoolbar|nonumber
//                       with --expect-name, plant a defect in the first
//                       PDF.js embed; the run must then fail: wrongname
//                       changes its aria-label to "PDF: wrong.pdf", dupdesc
//                       gives its zoom-in button an aria-label equal to its
//                       title, duplink does the same to its download link,
//                       norole removes its role attribute, notoolbar
//                       removes its toolbar, nonumber removes the " (k of
//                       n)" from its aria-label (nothing to plant in when it
//                       has none).
// Set CHROME_PATH to use another Chrome or Chromium binary.
//
// On a RevealJS page the check goes to each slide with Reveal.slide() and
// scrolls each embed's pages into view before it measures. On each slide (or
// on the whole page when it has no slides), the --expect-name check first
// waits at most 10 s for the embeds to be hydrated, and fails when that wait
// runs out. The --expect-text wait comes once, before the first slide.
//
// Ink: a canvas has ink by the rule in tests/ink.mjs (some pixel neither
// transparent nor white, read over every pixel and channel).
//
// Exits non-zero if the page does not load or no embed is hydrated, if a
// PDF.js embed has no pages or has a page whose canvas is missing, has no
// ink, or cannot be read, if an expected count does not match, or if an
// --expect-text or --expect-name check fails. Exits 2 on a bad argument,
// when a server cannot start, or when --plant finds nothing to plant in.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import puppeteer from "puppeteer-core";
import { serveDocs, serveRemote, pointPdfsAt, embedSrcsOffRemote, docsFile, REMOTE_MODES, DOCS } from "./serve_docs.mjs";
import { inkInPixels } from "./ink.mjs";
import { expectedNames } from "./expect_names.mjs";

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

// one optional page or URL, plus flags that each take a value and flags that
// take none; anything else (a misspelled flag, --flag=value) is an error
// rather than silently ignored
const FLAGS = ["device", "expect-native", "expect-pdfjs", "expect-pages", "expect-links", "expect-failed", "expect-text", "expect-name", "plant", "alone", "remote", "slow-text"];
const BOOL_FLAGS = ["missing-pdfs"];
const TEXT_PLANTS = ["notext", "swap", "visible", "gone", "inert", "cvhidden"];
const TREE_PLANTS = ["nolabel", "canvas", "noname", "detach"];
const NAME_PLANTS = ["wrongname", "dupdesc", "duplink", "norole", "notoolbar", "nonumber"];
const INK_PLANTS = ["blank", "nocanvas", "nopages"];
// planted before the text wait (unhydrated) or before the page loads (norender)
const WAIT_PLANTS = ["unhydrated", "norender"];
const args = process.argv.slice(2);
const flags = {};
const positional = [];
for (let i = 0; i < args.length; i++) {
  if (!args[i].startsWith("--")) {
    positional.push(args[i]);
    continue;
  }
  const name = args[i].slice(2);
  if (BOOL_FLAGS.includes(name)) {
    flags[name] = true;
    continue;
  }
  if (!FLAGS.includes(name) || i + 1 >= args.length) {
    console.error(`render_check: unexpected argument "${args[i]}" (flags: --${FLAGS.join(", --")}, each with a value, and --${BOOL_FLAGS.join(", --")})`);
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
const missingPdfs = flags["missing-pdfs"] === true;
const normalize = (s) => s.replace(/\s+/g, " ").trim();
const phrases = flags["expect-text"] === undefined ? null : flags["expect-text"].split("|").map(normalize);
const plant = flags["plant"] ?? null;
const target = positional[0] || "example.html";
if (phrases && phrases.some((p) => !p)) {
  console.error("render_check: --expect-text needs a non-empty phrase for each page");
  process.exit(2);
}
const slowText = flags["slow-text"] === undefined ? 0 : Number(flags["slow-text"]);
if (flags["slow-text"] !== undefined && !(phrases && /^\d+$/.test(flags["slow-text"]) && slowText > 0)) {
  console.error("render_check: --slow-text needs --expect-text and a whole number of milliseconds above 0");
  process.exit(2);
}
const expectName = flags["expect-name"] ?? null;
// one name for every PDF.js embed, or "a.pdf|b.pdf": one per embed, in order
const expectNames = expectName === null ? null : expectName.split("|");
if (expectNames && expectNames.some((n) => !n)) {
  console.error("render_check: --expect-name needs a non-empty file name for each embed");
  process.exit(2);
}
if (expectNames && expectNames.length === 1 && !/^\d+$/.test(expectPdfjs ?? "")) {
  console.error("render_check: --expect-name with one name needs --expect-pdfjs, the number of embeds it names");
  process.exit(2);
}
// the full names, numbered where they repeat, as the viewer numbers them
const expectLabels = expectNames && expectedNames(expectNames, Number(expectPdfjs));
if (
  plant &&
  !(
    INK_PLANTS.includes(plant) ||
    (phrases && [...TEXT_PLANTS, ...TREE_PLANTS, ...WAIT_PLANTS].includes(plant)) ||
    (expectName && NAME_PLANTS.includes(plant))
  )
) {
  console.error(
    `render_check: --plant must be ${INK_PLANTS.join(", ")}, or ${[...TEXT_PLANTS, ...TREE_PLANTS, ...WAIT_PLANTS].join(", ")} with --expect-text, or ${NAME_PLANTS.join(", ")} with --expect-name`
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
if (missingPdfs && (remote || alone || /^https?:/.test(target))) {
  console.error("render_check: --missing-pdfs needs a page under docs/, without --remote or --alone");
  process.exit(2);
}
if (missingPdfs && !(Number(expectFailed) > 0)) {
  console.error("render_check: --missing-pdfs needs --expect-failed with a number above 0");
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
// a server that cannot listen exits 2 with a message, not a stack trace
const cannotServe = (what) => (err) => {
  console.error(`render_check: cannot start the ${what} server: ${err.message}`);
  process.exit(2);
};
const remoteServer = remote ? await serveRemote(remote).catch(cannotServe("remote")) : null;
const remoteBase = remoteServer ? `http://127.0.0.1:${remoteServer.address().port}/` : null;
// --remote on a page with an embed whose PDF stays off the remote server (such
// as the inlined PDFs of a self-contained page) would check nothing remote for
// it, so the run stops here, before the browser opens
const targetFile = remoteBase ? docsFile(target) : null;
if (targetFile) {
  const off = embedSrcsOffRemote(fs.readFileSync(targetFile, "utf8"), remoteBase, target);
  if (off.length) {
    console.error(`render_check: --remote: ${target} has embeds whose PDF is not a relative .pdf URL that can move to the remote server (a self-contained page holds its PDFs inline as data: URLs): ${off.join(", ")}`);
    process.exit(2);
  }
}
const server =
  /^https?:/.test(target) || alone === "file"
    ? null
    : await serveDocs(
        aloneDir
          ? { root: aloneDir }
          : remoteBase
            ? { transformHtml: (html) => pointPdfsAt(html, remoteBase, target) }
            : { missingPdfs }
      ).catch(cannotServe("docs"));
const url =
  alone === "file"
    ? pathToFileURL(path.join(aloneDir, path.basename(target))).href
    : server
      ? `http://127.0.0.1:${server.address().port}/${aloneDir ? path.basename(target) : target}`
      : target;

// --expect-text, once, before any slide is shown or any page scrolls: wait
// for the whole page until every div.embedpdf is hydrated and every page of
// every PDF.js embed has text, or 10 s pass with no embed newly hydrated and
// no page newly with text, or 60 s pass in all. The viewer reads every
// embed's text at load on one queue, whatever slide is shown. With
// --slow-text <ms>, the same wait first runs once; then all the text is
// emptied and put back one page every <ms> ms while the wait runs again.
// --plant unhydrated first adds a div.embedpdf with no data-src, which never
// hydrates.
function waitForText(page) {
  return page.evaluate(async (slowMs, plant) => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    let planted = null;
    if (plant === "unhydrated") {
      const stray = document.createElement("div");
      stray.className = "embedpdf";
      document.body.appendChild(stray);
      planted = plant;
    }
    const all = () => document.querySelectorAll("div.embedpdf").length;
    const unhydrated = () => document.querySelectorAll("div.embedpdf:not(.embedpdf-pdfjs):not(.embedpdf-native):not(.embedpdf-failed)").length;
    const blocks = () => [...document.querySelectorAll(".embedpdf-pdfjs .embedpdf-page")].map((p) => p.querySelector(".embedpdf-text"));
    const withText = () => blocks().filter((t) => t && t.textContent.trim()).length;
    const wait = async () => {
      const start = Date.now();
      let seen = -1;
      let changed = start;
      while (unhydrated() || !blocks().every((t) => t && t.textContent.trim())) {
        const progress = all() - unhydrated() + withText();
        if (progress !== seen) [seen, changed] = [progress, Date.now()];
        if (Date.now() - changed >= 10000 || Date.now() - start >= 60000) break;
        await sleep(100);
      }
      return Date.now() - start;
    };
    let slowPages = 0;
    let timer = null;
    if (slowMs) {
      await wait();
      // only blocks the viewer filled, so a late fill is never written over
      const saved = blocks().filter((t) => t && t.textContent.trim()).map((t) => [t, t.textContent]);
      for (const [t] of saved) t.textContent = "";
      slowPages = saved.length;
      let k = 0;
      timer = setInterval(() => {
        if (k < saved.length) saved[k][0].textContent = saved[k++][1];
        else clearInterval(timer);
      }, slowMs);
    }
    const waitedMs = await wait();
    // the aid restores no text after the wait (the viewer can still fill a
    // block whose read was late, when the wait ended on a limit)
    clearInterval(timer);
    return { waitedMs, slowPages, unhydrated: unhydrated(), planted };
  }, slowText, plant);
}

// --expect-text, before the pages scroll: the hidden text of each page of each
// PDF.js embed under a root (the document, or RevealJS slide k), read after
// waitForText. A text plant goes into the page's first PDF.js embed, when it
// is under the root, just before the read.
function measureText(page, slide) {
  return page.evaluate(
    async (slide, plant, textPlants) => {
      const root = slide === null ? document : window.Reveal.getSlides()[slide];
      const embeds = () => [...root.querySelectorAll(".embedpdf-pdfjs")];
      let planted = null;
      const first = document.querySelector(".embedpdf-pdfjs");
      if (textPlants.includes(plant) && first && root.contains(first)) {
        const t = [...first.querySelectorAll(".embedpdf-page .embedpdf-text")];
        const last = t[t.length - 1];
        if (plant === "notext" && last) last.textContent = "";
        if (plant === "swap" && t.length > 1) [t[0].textContent, t[1].textContent] = [t[1].textContent, t[0].textContent];
        if (plant === "visible" && last) last.style.overflow = "visible";
        if (plant === "gone" && last) last.style.display = "none";
        if (plant === "inert" && last) last.closest(".embedpdf-page").setAttribute("inert", "");
        if (plant === "cvhidden" && last) last.style.contentVisibility = "hidden";
        if (last && (plant !== "swap" || t.length > 1)) planted = plant;
      }
      // the text block and each element that contains it, where it has the
      // inert attribute or content-visibility: hidden (either drops the text
      // from the accessibility tree)
      const named = (e, t) => (e === t ? "the text block" : e.tagName.toLowerCase() + (e.className ? "." + [...e.classList].join(".") : ""));
      const hiders = (t) => {
        const inert = [];
        const cv = [];
        for (let e = t; e; e = e.parentElement) {
          if (e.hasAttribute("inert")) inert.push(named(e, t));
          if (getComputedStyle(e).contentVisibility === "hidden") cv.push(named(e, t));
        }
        return { inert, cv };
      };
      const pages = embeds().map((el) =>
        [...el.querySelectorAll(".embedpdf-page")].map((p) => {
          const t = p.querySelector(".embedpdf-text");
          if (!t) return null;
          const s = getComputedStyle(t);
          const h = hiders(t);
          return {
            inertOn: h.inert,
            contentHiddenOn: h.cv,
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
      return { slide, planted, pages };
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
      for (const e of b.inertOn) out.push(`${at}: text is under inert (on ${e})`);
      for (const e of b.contentHiddenOn) out.push(`${at}: text is under content-visibility: hidden (on ${e})`);
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
  // the wait ran out: some page still had no canvas at its end
  let ranOut = false;
  for (const embed of embeds) {
    const pages = await embed.$$(".embedpdf-page");
    for (let t = 0; t < 100 && (await embed.$$(".embedpdf-page canvas")).length < pages.length; t++) {
      await new Promise((r) => setTimeout(r, 100));
    }
    if ((await embed.$$(".embedpdf-page canvas")).length < pages.length) ranOut = true;
  }
  let planted = await page.evaluate(
    (slide, plant, treePlants) => {
      const root = slide === null ? document : window.Reveal.getSlides()[slide];
      const first = document.querySelector(".embedpdf-pdfjs");
      // detach is planted in the canvas loop below
      if (!treePlants.includes(plant) || plant === "detach" || !first || !root.contains(first)) return null;
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
  // a canvas snapshot and the error it threw, if any; an error counts against
  // a canvas still in the page, and is left aside for one that left it
  const snapCanvas = (el) => snap(el).then((node) => ({ node, error: null }), (err) => ({ node: null, error: String(err && err.message ? err.message : err) }));
  const connected = (el) => el.evaluate((e) => e.isConnected);
  const allText = (node) => (node ? [node.name || "", ...(node.children || []).map(allText)].join(" ") : "");
  const out = [];
  for (const [i, embed] of embeds.entries()) {
    const at = `PDF.js embed ${i + 1}${where}`;
    const pages = await embed.$$(".embedpdf-page");
    // each canvas with its page and page number, read together: the viewer
    // keeps a page's element and swaps only its canvas. A canvas is named by
    // its page's number.
    const canvases = [];
    for (const [k, p] of pages.entries()) {
      const c = await p.$("canvas");
      if (c) canvases.push([p, c, k + 1]);
    }
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
    // a null snapshot means hidden only for a canvas still in the page. The
    // viewer swaps a page's canvas when it renders the page again, so a canvas
    // that left the page is replaced by the page's current canvas, once.
    const isFirst = await embed.evaluate((e) => e === document.querySelector(".embedpdf-pdfjs"));
    for (const [j, [holder, found, n]] of canvases.entries()) {
      if (plant === "detach" && isFirst && j === canvases.length - 1) {
        await found.evaluate((c) => c.remove());
        planted = plant;
      }
      let r = await snapCanvas(found);
      if (!r.node && !(await connected(found))) {
        const c = await holder.$("canvas");
        r = c ? await snapCanvas(c) : null;
        if (!r || (!r.node && !(await connected(c)))) {
          out.push(`${at}: canvas ${n} left the page during the accessibility check`);
          continue;
        }
      }
      if (r.error) out.push(`${at}: canvas ${n} snapshot failed (${r.error})`);
      else if (r.node) out.push(`${at}: canvas ${n} is in the accessibility tree (role ${r.node.role})`);
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
  return { planted, failures: out, embeds: embeds.length, ranOut };
}

// --expect-name, after the pages scroll: each PDF.js embed under a root is a
// group with its expected name (expectLabels), in the DOM and in Chrome's
// accessibility tree. The check waits at most 10 s for every embed under the root to be
// hydrated. A name plant goes into the page's first PDF.js embed, when it is
// under the root. `before` is the number of PDF.js embeds on earlier slides,
// so that embed i of the page takes name i of a "|" list.
async function nameFailures(page, slide, before) {
  const where = slide === null ? "" : ` on slide ${slide + 1}`;
  const root = slide === null ? page : (await page.evaluateHandle((k) => window.Reveal.getSlides()[k], slide)).asElement();
  const { planted, stuck } = await page.evaluate(
    async (slide, plant, namePlants) => {
      const root = slide === null ? document : window.Reveal.getSlides()[slide];
      const unhydrated = () => root.querySelectorAll("div.embedpdf:not(.embedpdf-pdfjs):not(.embedpdf-native):not(.embedpdf-failed)").length;
      const start = Date.now();
      while (Date.now() - start < 10000 && unhydrated()) await new Promise((r) => setTimeout(r, 100));
      const stuck = unhydrated();
      const first = document.querySelector(".embedpdf-pdfjs");
      if (!namePlants.includes(plant) || !first || !root.contains(first)) return { planted: null, stuck };
      if (plant === "wrongname") first.setAttribute("aria-label", "PDF: wrong.pdf");
      if (plant === "dupdesc") {
        const zoomIn = first.querySelectorAll(".embedpdf-toolbar button")[1];
        if (!zoomIn) return { planted: null, stuck };
        zoomIn.setAttribute("aria-label", zoomIn.title);
      }
      if (plant === "duplink") {
        const link = first.querySelector(".embedpdf-toolbar a.embedpdf-download");
        if (!link) return { planted: null, stuck };
        link.setAttribute("aria-label", link.title);
      }
      if (plant === "norole") first.removeAttribute("role");
      if (plant === "nonumber") {
        const label = first.getAttribute("aria-label") || "";
        const bare = label.replace(/ \(\d+ of \d+\)$/, "");
        if (bare === label) return { planted: null, stuck };
        first.setAttribute("aria-label", bare);
      }
      if (plant === "notoolbar") {
        const toolbar = first.querySelector(".embedpdf-toolbar");
        if (!toolbar) return { planted: null, stuck };
        toolbar.remove();
      }
      return { planted: plant, stuck };
    },
    slide,
    plant,
    NAME_PLANTS
  );
  const embeds = await root.$$(".embedpdf-pdfjs");
  const out = [];
  // a late embed is missing from this count, and later "|" names then shift;
  // count again after the embeds are read, so an embed that hydrated in
  // between is not reported as stuck
  const stillStuck = stuck
    ? await page.evaluate(
        (slide) =>
          (slide === null ? document : window.Reveal.getSlides()[slide]).querySelectorAll(
            "div.embedpdf:not(.embedpdf-pdfjs):not(.embedpdf-native):not(.embedpdf-failed)"
          ).length,
        slide
      )
    : 0;
  if (stillStuck) out.push(`${stillStuck} embed(s)${where || " on the page"} still not hydrated after 10 s`);
  for (const [i, embed] of embeds.entries()) {
    const at = `PDF.js embed ${i + 1}${where}`;
    const name = expectLabels[before + i];
    if (name === undefined) {
      out.push(`${at}: --expect-name gives no name for PDF.js embed ${before + i + 1} of the page`);
      continue;
    }
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
  // --plant norender: no canvas gets a 2D context, so the viewer's page
  // renders fail and it puts no canvas on any page
  if (plant === "norender") {
    await page.evaluateOnNewDocument(() => {
      HTMLCanvasElement.prototype.getContext = () => null;
    });
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
  // with --expect-text, a run that cannot get further stops at once: it prints
  // why and the text failures found so far, and exits 1
  const stopRun = async (why) => {
    console.log(JSON.stringify({ device: deviceName || "chrome", alone, plant, textWait, stoppedBecause: why, consoleErrors }, null, 2));
    console.error("render_check: " + why);
    for (const f of [...textReports.flatMap(textFailures), ...treeReports.flatMap((r) => r.failures)]) console.error("render_check: " + f);
    await browser.close();
    server?.close();
    remoteServer?.close();
    process.exit(1);
  };
  const textWait = phrases ? await waitForText(page) : null;
  if (textWait && textWait.unhydrated) {
    await stopRun(`${textWait.unhydrated} embed(s) still not hydrated when the text wait ended after ${textWait.waitedMs} ms`);
  }
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
      // a later slide would wait as long again, and the run fails already
      if (phrases && treeReports[treeReports.length - 1].ranOut) {
        await stopRun(`stopped at slide ${k + 1}: a PDF.js page there still had no canvas when the canvas wait ended`);
      }
      if (expectName) nameReports.push(await nameFailures(page, k, nameReports.reduce((n, r) => n + r.embeds, 0)));
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
  if (expectName && !slides) nameReports.push(await nameFailures(page, null, 0));

  const res = await page.evaluate(async (inkSource, plant) => {
    // the ink rule of tests/ink.mjs, rebuilt from its source text
    const inkInPixels = new Function("return " + inkSource)();
    // "ok", "no ink", or why the canvas could not be read
    const inkOf = (c) => {
      try {
        return inkInPixels(c.getContext("2d").getImageData(0, 0, c.width, c.height).data) ? "ok" : "no ink";
      } catch (err) {
        return "unreadable (" + err + ")";
      }
    };
    // an ink plant goes into the first PDF.js embed before anything is measured
    let inkPlanted = null;
    const first = document.querySelector(".embedpdf-pdfjs");
    const firstPages = first ? [...first.querySelectorAll(".embedpdf-page")] : [];
    const lastCanvas = firstPages.length ? firstPages[firstPages.length - 1].querySelector("canvas") : null;
    if (plant === "blank" && lastCanvas) {
      const ctx = lastCanvas.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, lastCanvas.width, lastCanvas.height);
      inkPlanted = plant;
    }
    if (plant === "nocanvas" && lastCanvas) {
      lastCanvas.remove();
      inkPlanted = plant;
    }
    if (plant === "nopages" && firstPages.length) {
      firstPages.forEach((p) => p.remove());
      inkPlanted = plant;
    }
    const canvases = document.querySelectorAll(".embedpdf-page canvas").length;
    // per PDF.js embed: one entry per .embedpdf-page, "ok" when its canvas has
    // ink, else "no canvas", "no ink", or "unreadable (…)". The embed counts
    // are read here too, before the awaits below, so they match pdfjsPages.
    const pdfjsPages = [...document.querySelectorAll(".embedpdf-pdfjs")].map((el) =>
      [...el.querySelectorAll(".embedpdf-page")].map((p) => {
        const c = p.querySelector("canvas");
        return c ? inkOf(c) : "no canvas";
      })
    );
    const native = document.querySelectorAll(".embedpdf-native").length;
    const pdfjs = pdfjsPages.length;
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
      // src: data-src as written, which the viewer's "failed to render" line names
      (ok ? failed : malformed).push({ index: i + 1, src: el.dataset.src || "", href: open ? open.href : null, expected, target: open ? open.target : null });
    });
    // the native objects' bytes, fetched last: every DOM read above is one
    // snapshot, taken before the first await
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
    return {
      userAgent: navigator.userAgent,
      pdfViewerEnabled: navigator.pdfViewerEnabled,
      maxTouchPoints: navigator.maxTouchPoints,
      native,
      pdfjs,
      canvases,
      pdfjsPages,
      objects,
      links,
      failed,
      malformed,
      srcs,
      inkPlanted,
    };
  }, inkInPixels.toString(), plant);

  const text = phrases
    ? {
        phrases,
        plant,
        // norender is planted at load; it lands only where the tree check met
        // a PDF.js embed
        planted:
          plant === "norender"
            ? treeReports.some((r) => r.embeds > 0) ? plant : null
            : [textWait, ...textReports, ...treeReports].map((r) => r.planted).find(Boolean) || null,
        wait: textWait,
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
  console.log(JSON.stringify({ device: deviceName || "chrome", alone, remote, missingPdfs, ...res, text, names, consoleErrors }, null, 2));
  if (names) {
    if (plant && NAME_PLANTS.includes(plant) && !names.planted) {
      // an embed that never hydrated is the likely cause, so name it first
      for (const f of names.failures.filter((f) => f.endsWith("still not hydrated after 10 s"))) console.error("render_check: " + f);
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
    // the names given must name every PDF.js embed checked
    if (expectLabels.length !== names.embeds) {
      console.error(`render_check: --expect-name gives ${expectLabels.length} names for ${names.embeds} PDF.js embeds`);
      process.exitCode = 1;
    }
    for (const f of names.failures) console.error("render_check: " + f);
    if (names.failures.length) process.exitCode = 1;
  }
  if (text) {
    if (plant && [...TEXT_PLANTS, ...TREE_PLANTS, ...WAIT_PLANTS].includes(plant) && !text.planted) {
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
  // each PDF.js embed must have pages, and each page a canvas with ink
  let ok = true;
  res.pdfjsPages.forEach((pages, i) => {
    if (pages.length === 0) {
      console.error(`render_check: PDF.js embed ${i + 1} has no pages`);
      ok = false;
    }
    const bad = pages.map((v, j) => (v === "ok" ? null : `page ${j + 1} ${v}`)).filter(Boolean);
    if (bad.length) {
      console.error(`render_check: PDF.js embed ${i + 1}: ${bad.join(", ")}`);
      ok = false;
    }
  });
  // after the page failures are printed, so a real defect that left nothing
  // to plant in is still named
  if (INK_PLANTS.includes(plant) && !res.inkPlanted) {
    console.error(`render_check: --plant ${plant} found nothing to plant in`);
    await browser.close();
    server?.close();
    remoteServer?.close();
    process.exit(2);
  }
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
  if (missingPdfs) {
    // each failed embed must name a PDF on the page's own server, and the
    // viewer must log PDF.js's ResponseException (the 404) for it; the viewer
    // names the PDF by its data-src as written, one line per embed, so embeds
    // that share a data-src need as many lines
    const own = `http://127.0.0.1:${server.address().port}/`;
    const lines = (src) =>
      consoleErrors.filter((t) => t.startsWith("embedpdf: failed to render " + src + " ") && t.includes("ResponseException")).length;
    const wrong = res.failed.filter(
      (f) => !f.expected.startsWith(own) || lines(f.src) < res.failed.filter((g) => g.src === f.src).length
    );
    if (wrong.length) {
      console.error(`render_check: --missing-pdfs: fewer "ResponseException" errors than failed embeds, or a PDF not on ${own}: ${wrong.map((f) => f.expected).join(", ")}`);
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
