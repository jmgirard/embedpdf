// Native embeds: does each one show its PDF, at the page its page option names?
//
// Usage:
//   node tests/native_check.mjs --browser chromium|firefox|safari
//        --page <page>.html [--alone file|http]
//        --expect-native <n> --reference sample.pdf
//        [--plant otherpdf|broken|blank|fileaddr|nopage|object|border|fallback|refcontrol] [--plant-at <k>]
//
// The viewer shows a native embed as an <object>, or as an <iframe> when its
// page option is over 1 (embedpdf-viewer.js, hydrateNative; D-007), because
// desktop Safari 27.0.1 opens an <object> at page 1 whatever #page= says.
// Without --alone, the check opens the page from docs/ on its own HTTP server,
// and each native embed's address must be its data-src, resolved against the
// page, with the fragment below. With --alone, the page must be self-contained
// (embed-resources: true): it holds its PDF as a data: address, and the viewer
// gives each native embed a blob: URL of it (inlinedPdf). The check then opens
// a copy of the page alone in an empty temporary directory, over file://
// (--alone file) or over HTTP (--alone http), and each address must be a blob:
// URL.
//
// The run fails unless the page has exactly --expect-native native embeds, and
// unless, for each one: its address's fragment is #page=<k> where the embed's
// data-page (the page option) is k > 1, and empty otherwise; it is an <iframe>
// where k > 1 and an <object> otherwise; an <iframe> has a computed border
// width of 0 and the box its pixel width and height attributes give (300 x 150
// when they are missing; a percent size is not checked); and no other element of its placeholder has a rendered
// box (an <iframe> shows no child content, so the viewer hides the no-JS
// fallback beside it). Every failure of an embed is reported, not only the
// first.
//
// It then takes a screenshot of each native embed and a screenshot of a
// reference: the element the embed should be (an <iframe>, or an <object
// type="application/pdf">) of --reference (a PDF under docs/) on the check's
// own HTTP server, with the fragment the page option asks for and the embed's
// size and fractional position, alone on a page in the same browser. So an
// <object> where an <iframe> should be is compared with an <iframe>
// reference. It fails unless the two match, and unless both screenshots hold
// ink (tests/ink.mjs). Before each screenshot it waits until the screenshots
// stay the same for STABLE_SPAN_MS (at most STABLE_MS in all). It also takes
// a control of the same element at each reference's size and position, of
// files/broken.pdf (a text file sent as a PDF, which the viewer cannot draw).
// It fails unless the reference differs from the control by more than
// TOLERANCE, so a reference caught before its viewer drew the PDF, which a
// broken embed would match, fails. On 2026-10-20, with v1.2.7, every
// reference on the nine native_check lines in CLAUDE.md differed from its
// control in at least 0.0401 of the blocks (desktop Safari 27.0.1, an <object>
// of 300 x 150), and every <iframe> reference in at least 0.0447 (desktop
// Safari 27.0.1, 600 x 400).
//
// Two screenshots match when, at the best shift of up to SHIFT device pixels
// each way, at most TOLERANCE of their BLOCK x BLOCK pixel blocks differ by
// more than PIXEL_DIFF in a channel's average (diffShare in
// tests/png_diff.mjs). On 2026-10-20, with v1.2.7, on the nine native_check
// lines in CLAUDE.md, an embed and its reference differed in at most 0.0035 of
// the blocks (Firefox 158). Each plant below that failed as a mismatch differed in
// at least 0.0397 (desktop Safari 27.0.1, blank and broken), and otherpdf in
// at least 0.0676 (Chromium 155).
//
// For each embed whose page option is k > 1, the check also takes a page-1
// reference (no fragment) of the same element at that size. It fails unless
// the page-1 and page-k references differ, so the browser opens the element
// at the fragment's page (on 2026-10-20 the <iframe> references differed in
// 0.1371 of the blocks in Chromium 155, 0.0530 in Firefox 158, and at least
// 0.0952 in desktop Safari 27.0.1).
//
// --browser chromium and firefox run headless through puppeteer-core:
// Chromium from CHROME_PATH (default Google Chrome's path), Firefox from
// FIREFOX_PATH (default /Applications/Firefox.app/Contents/MacOS/firefox).
// Firefox runs with its PDF viewer's pdfjs.viewOnLoad set to 1, so each PDF
// opens as on a first visit; with the default, it reopened a PDF at the page
// last shown, and a reference after the page-2 embed opened at page 2.
// Firefox started from Claude Code fails with "Could not find profile folder"
// until its folder ~/Library/Application Support/Firefox exists. On
// 2026-10-19 one launch through macOS open made it:
// `open -g -n -a Firefox --args -headless -screenshot <png> <url>`. --browser safari drives desktop Safari
// through safaridriver, as tests/safari_check.mjs does (turn safaridriver on
// once with `safaridriver --enable`).
//
// --plant puts one defect into the native embed --plant-at names (1-based in
// page order, default 1; nopage, object, border, and fallback default to the
// first embed whose page option is over 1). The first five replace that
// embed's element with a copy whose address is:
//   otherpdf  a blob: of files/large.pdf (another inked PDF)
//   broken    a blob: of files/broken.pdf (a text file: the viewer's error)
//   blank     an empty blob:
//   fileaddr  the reference's HTTP address, not a blob: (with --alone only)
//   nopage    the embed's own address without its #page fragment
// The fragment is kept (except nopage). The others:
//   object    puts an <object> with the same address, size, and name in place
//             of an <iframe>
//   border    gives an <iframe> a 2px inset border, as a browser's default
//   fallback  shows the hidden fallback content beside an <iframe>
// The run must then fail and name that embed; otherpdf and broken must fail as
// a mismatch, and in desktop Safari, nopage and object must fail as a
// mismatch too.
// --plant refcontrol instead points every reference at the control, as a
// reference caught before its viewer drew the PDF would look; the run must
// fail on "matches the control", which names the reference, not an embed.
// NATIVE_CHECK_SHOTS=<dir> also saves every screenshot there as a PNG.
//
// Exits 0 on a pass, 1 on a failed check, 2 on a bad argument, when --plant
// finds nothing to plant in, or when the browser, safaridriver, or the server
// cannot start.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import { serveDocs, DOCS } from "./serve_docs.mjs";
import { inkInPixels } from "./ink.mjs";
import { decodePng, diffShare as diffShareOf } from "./png_diff.mjs";

const TOLERANCE = 0.01; // share of blocks that may differ
const PIXEL_DIFF = 40; // an average channel difference above this makes a block differ
const BLOCK = 4; // block side in device pixels
const SHIFT = 2; // device pixels a reference may be shifted each way
const STABLE_MS = 20000;
const STABLE_SPAN_MS = 1500; // screenshots must stay the same this long
const WD_MS = 60000; // time limit of one safaridriver call
const VIEWPORT = { width: 1200, height: 900 };
const PLANTS = ["otherpdf", "broken", "blank", "fileaddr", "nopage", "object", "border", "fallback", "refcontrol"];
// plants aimed at an embed whose page option is over 1 (an <iframe>)
const PAGE_PLANTS = ["nopage", "object", "border", "fallback"];
// each native embed's element: the placeholder's <object> or <iframe> child
const NATIVE = "div.embedpdf-native > object, div.embedpdf-native > iframe";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function bad(msg) {
  console.error(`native_check: ${msg}`);
  process.exit(2);
}

// --- arguments ---------------------------------------------------------------
const args = process.argv.slice(2);
const flags = {};
for (let i = 0; i < args.length; i++) {
  const k = args[i];
  if (!/^--(browser|page|alone|expect-native|reference|plant|plant-at)$/.test(k) || args[i + 1] === undefined) bad(`bad argument ${k}`);
  flags[k.slice(2)] = args[++i];
}
const browserName = flags.browser;
if (!["chromium", "firefox", "safari"].includes(browserName)) bad("--browser must be chromium, firefox, or safari");
const page = flags.page;
if (!page) bad("--page is required");
const alone = flags.alone ?? null;
if (alone !== null && alone !== "file" && alone !== "http") bad("--alone must be file or http");
if (!/^\d+$/.test(flags["expect-native"] ?? "")) bad("--expect-native must be a whole number");
const expectNative = Number(flags["expect-native"]);
const reference = flags.reference;
if (!reference) bad("--reference is required");
const referenceFile = path.resolve(DOCS, reference);
if (!referenceFile.startsWith(DOCS + path.sep) || !fs.existsSync(referenceFile)) bad(`--reference ${reference} is not a file under docs/`);
const plant = flags.plant ?? null;
if (plant && !PLANTS.includes(plant)) bad(`--plant must be one of ${PLANTS.join(", ")}`);
if (plant === "fileaddr" && !alone) bad("--plant fileaddr needs --alone: without it the address is the file already");
if (flags["plant-at"] && !plant) bad("--plant-at needs --plant");
if (flags["plant-at"] && plant === "refcontrol") bad("--plant refcontrol takes no --plant-at");
if (flags["plant-at"] && !/^[1-9]\d*$/.test(flags["plant-at"])) bad("--plant-at must be 1 or more");
const plantAt = flags["plant-at"] ? Number(flags["plant-at"]) : null;
const source = path.resolve(DOCS, page);
if (!source.startsWith(DOCS + path.sep) || !fs.existsSync(source)) bad(`--page ${page} is not a file under docs/`);

const diffShare = (a, b) => diffShareOf(a, b, { shift: SHIFT, pixelDiff: PIXEL_DIFF, block: BLOCK });

// --- servers and the page ----------------------------------------------------
const FILES = path.resolve(DOCS, "..", "files");
const refServer = await serveDocs({
  routes: {
    // the control: files/broken.pdf (a text file) as a PDF, which a native
    // viewer cannot draw
    "/__control.pdf": (req, res) => {
      res.writeHead(200, { "Content-Type": "application/pdf", "Cache-Control": "no-store" });
      res.end(fs.readFileSync(path.join(FILES, "broken.pdf")));
    },
    // one <object> or (?kind=iframe) <iframe> of ?src, ?w x ?h CSS pixels, at
    // ?x, ?y in the page (the embed's own fractional position, so the browser
    // snaps it to pixels alike); an <iframe> with no border, as the viewer's
    "/__native_ref": (req, res) => {
      const q = new URL(req.url, "http://127.0.0.1").searchParams;
      const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
      const style =
        `position:absolute;left:${Number(q.get("x"))}px;top:${Number(q.get("y"))}px;` +
        `width:${Number(q.get("w"))}px;height:${Number(q.get("h"))}px`;
      const el =
        q.get("kind") === "iframe"
          ? `<iframe id="ref" src="${esc(q.get("src"))}" style="${style};border:0"></iframe>`
          : `<object id="ref" type="application/pdf" data="${esc(q.get("src"))}" style="${style}"></object>`;
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      res.end(`<!doctype html><html><head><meta charset="utf-8"><title>reference</title></head><body style="margin:0">${el}</body></html>`);
    },
  },
}).catch((err) => bad(`cannot start the server: ${err.message}`));
const refBase = `http://127.0.0.1:${refServer.address().port}/`;
const referenceAddress = refBase + path.relative(DOCS, referenceFile).split(path.sep).map(encodeURIComponent).join("/");

let pageServer = null;
let pageUrl;
if (!alone) {
  // a page that is not self-contained, from docs/ with its PDFs
  pageUrl = refBase + path.relative(DOCS, source).split(path.sep).map(encodeURIComponent).join("/");
} else {
  const aloneDir = fs.mkdtempSync(path.join(os.tmpdir(), "embedpdf-native-"));
  process.on("exit", () => fs.rmSync(aloneDir, { recursive: true, force: true }));
  fs.copyFileSync(source, path.join(aloneDir, path.basename(page)));
  if (alone === "http") {
    pageServer = await serveDocs({ root: aloneDir }).catch((err) => bad(`cannot start the server: ${err.message}`));
    pageUrl = `http://127.0.0.1:${pageServer.address().port}/${encodeURIComponent(path.basename(page))}`;
  } else {
    pageUrl = pathToFileURL(path.join(aloneDir, path.basename(page))).href;
  }
}
const closeServers = () => {
  refServer.close();
  if (pageServer) pageServer.close();
};

// bytes a plant puts in a blob:, as base64 (from the repo's files/)
const plantBytes = {
  otherpdf: () => fs.readFileSync(path.join(FILES, "large.pdf")).toString("base64"),
  broken: () => fs.readFileSync(path.join(FILES, "broken.pdf")).toString("base64"),
  blank: () => "",
};

// --- browser drivers ---------------------------------------------------------
// Each driver gives: open(url), run(fnSource, ...args) -> value (the function
// runs in the page with the args), shotOf(css, index) -> PNG Buffer of the
// index-th element that css selects, scrolled to the middle first, close().
async function puppeteerDriver(kind) {
  const { default: puppeteer } = await import("puppeteer-core");
  const opts =
    kind === "firefox"
      ? { browser: "firefox", executablePath: process.env.FIREFOX_PATH || "/Applications/Firefox.app/Contents/MacOS/firefox", headless: true, extraPrefsFirefox: { "pdfjs.viewOnLoad": 1 } }
      : { executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new" };
  let browser;
  try {
    browser = await puppeteer.launch(opts);
  } catch (err) {
    const hint = /profile folder/.test(err.message) ? " (launch it once through macOS open, as this script's header says)" : "";
    bad(`cannot start ${kind}${hint}: ${err.message.split("\n")[0]}`);
  }
  let tab, version;
  try {
    tab = await browser.newPage();
    await tab.setViewport(VIEWPORT);
    version = await browser.version();
  } catch (err) {
    await browser.close().catch(() => {});
    bad(`cannot start ${kind}: ${err.message.split("\n")[0]}`);
  }
  return {
    version,
    open: (url) => tab.goto(url, { waitUntil: "load" }),
    run: (fnSource, ...a) => tab.evaluate(`(${fnSource})(...${JSON.stringify(a)})`),
    async shotOf(css, index) {
      const el = (await tab.$$(css))[index];
      await el.evaluate((e) => e.scrollIntoView({ block: "center" }));
      return Buffer.from(await el.screenshot());
    },
    close: () => browser.close(),
  };
}

async function safariDriver() {
  const port = await new Promise((resolve) => {
    const s = net.createServer().listen(0, "127.0.0.1", () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
  const driver = spawn("safaridriver", ["-p", String(port)], { stdio: "ignore" });
  driver.on("error", (err) => bad(`cannot start safaridriver: ${err.message}`));
  const base = `http://127.0.0.1:${port}`;
  async function wd(method, p, body) {
    // a hung safaridriver ends the call after WD_MS instead of the run never ending
    const res = await fetch(base + p, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(WD_MS),
    });
    const json = await res.json();
    if (json.value && json.value.error) throw new Error(`${method} ${p}: ${json.value.error}: ${json.value.message}`);
    return json.value;
  }
  for (let k = 0; ; k++) {
    try {
      await fetch(base + "/status");
      break;
    } catch {
      if (k > 50) {
        driver.kill();
        bad("safaridriver did not start");
      }
      await sleep(100);
    }
  }
  let session;
  try {
    const value = await wd("POST", "/session", { capabilities: { alwaysMatch: { browserName: "safari" } } });
    session = value.sessionId;
    var version = value.capabilities?.browserVersion ?? "?";
  } catch (err) {
    driver.kill();
    bad(`no safaridriver session: ${err.message}`);
  }
  const s = `/session/${session}`;
  await wd("POST", `${s}/window/rect`, { width: VIEWPORT.width, height: VIEWPORT.height + 90 }).catch(() => {});
  const run = (fnSource, ...a) => wd("POST", `${s}/execute/sync`, { script: `return (${fnSource})(...arguments)`, args: a });
  return {
    version: `Safari ${version}`,
    open: (url) => wd("POST", `${s}/url`, { url }),
    run,
    async shotOf(css, index) {
      const els = await wd("POST", `${s}/elements`, { using: "css selector", value: css });
      const el = els[index];
      await wd("POST", `${s}/execute/sync`, { script: "arguments[0].scrollIntoView({ block: 'center' })", args: [el] });
      return Buffer.from(await wd("GET", `${s}/element/${Object.values(el)[0]}/screenshot`), "base64");
    },
    async close() {
      await wd("DELETE", s).catch(() => {});
      driver.kill();
    },
  };
}

// a screenshot once two in a row are the same, or the last one after STABLE_MS
async function stableShot(drv, css, index) {
  const start = Date.now();
  let prev = await drv.shotOf(css, index);
  let sameSince = Date.now();
  for (;;) {
    await sleep(500);
    const next = await drv.shotOf(css, index);
    if (!next.equals(prev)) sameSince = Date.now();
    else if (Date.now() - sameSince >= STABLE_SPAN_MS) return { png: next, stable: true };
    prev = next;
    if (Date.now() - start > STABLE_MS) return { png: next, stable: false };
  }
}

// NATIVE_CHECK_SHOTS=<dir>: also save every screenshot there
function saveShot(name, png) {
  const dir = process.env.NATIVE_CHECK_SHOTS;
  if (!dir) return;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${browserName}-${name.replace(/[^a-z0-9.,+-]/gi, "-")}.png`), png);
}

// --- the run -----------------------------------------------------------------
const failures = [];
const report = { browser: browserName, page, alone, reference: referenceAddress, planted: null, embeds: [], pageReferences: [], controls: [] };
const drv = browserName === "safari" ? await safariDriver() : await puppeteerDriver(browserName);
// Ctrl-C or a kill: close the browser (and safaridriver) and the servers; the
// exit handler removes the temporary directory
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    drv.close().catch(() => {}).finally(() => {
      closeServers();
      process.exit(130);
    });
  });
}
report.version = drv.version;
let exitCode = 0;
// an argument the page cannot meet: exit 2 after the browser closes
class SetupError extends Error {}
let setupError = null;
try {
  await drv.open(pageUrl);
  // wait until every embed is hydrated (at most 30 s); for each native embed:
  // its element's address and tag, its page option (data-page, which the
  // shortcode writes and the viewer leaves on the embed), its data-src
  // resolved against the page (none for an inlined PDF), and for an <iframe>
  // its border, its box, its width and height attributes, and how many other
  // elements of its placeholder have a rendered box
  const state = () =>
    drv.run(`() => ({
      unhydrated: document.querySelectorAll("div.embedpdf:not(.embedpdf-pdfjs):not(.embedpdf-native):not(.embedpdf-failed)").length,
      native: [...document.querySelectorAll("div.embedpdf-native")].map((d) => {
        const e = d.querySelector(":scope > object, :scope > iframe");
        const out = {
          tag: e ? e.tagName.toLowerCase() : "",
          address: e ? (e.tagName === "IFRAME" ? e.src : e.data) : "",
          page: d.getAttribute("data-page") || "",
          src: d.dataset.src ? new URL(d.dataset.src, document.baseURI).href : "",
          shown: [...d.querySelectorAll("*")].filter((c) => c !== e && !(e && e.contains(c)) && c.getClientRects().length > 0).length,
        };
        if (e && e.tagName === "IFRAME") {
          const cs = getComputedStyle(e);
          const r = e.getBoundingClientRect();
          out.border = ["Top", "Right", "Bottom", "Left"].map((s) => parseFloat(cs["border" + s + "Width"]) || 0);
          out.box = [r.width, r.height];
          out.attrs = [e.getAttribute("width"), e.getAttribute("height")];
        }
        return out;
      }),
    })`);
  // the #page fragment and element each native embed's page option asks for
  const pageOf = (i) => parseInt(st.native[i].page, 10) || 1;
  const wantFrag = (i) => (pageOf(i) > 1 ? `#page=${pageOf(i)}` : "");
  const wantTag = (i) => (pageOf(i) > 1 ? "iframe" : "object");
  let st = await state();
  for (let t = 0; st.unhydrated > 0 && t < 60; t++) {
    await sleep(500);
    st = await state();
  }
  if (st.unhydrated > 0) failures.push(`${st.unhydrated} embed(s) not hydrated after 30 s`);
  if (st.native.length !== expectNative) failures.push(`expected ${expectNative} native embeds, found ${st.native.length}`);

  // --plant refcontrol changes the references, not the page
  if (plant === "refcontrol") report.planted = "refcontrol: every reference shows the control";
  // --plant: change the target embed's element
  else if (plant) {
    let k = plantAt;
    if (!k) k = PAGE_PLANTS.includes(plant) ? st.native.findIndex((d, i) => wantFrag(i)) + 1 : 1;
    if (k < 1 || k > st.native.length || (PAGE_PLANTS.includes(plant) && !wantFrag(k - 1))) {
      throw new SetupError(`--plant ${plant} found nothing to plant in (native embed ${k || "with #page="})`);
    }
    const cur = st.native[k - 1];
    if (["object", "border", "fallback"].includes(plant) && cur.tag !== "iframe") {
      throw new SetupError(`--plant ${plant} needs an <iframe>, and native embed ${k} is <${cur.tag}>`);
    }
    const bytes = plantBytes[plant] ? plantBytes[plant]() : null;
    const frag = cur.address.includes("#") ? cur.address.slice(cur.address.indexOf("#")) : "";
    const addr = plant === "fileaddr" ? referenceAddress + frag : plant === "nopage" ? cur.address.split("#")[0] : null;
    const done = await drv.run(
      `(k, plant, bytes, addr, frag) => {
        const d = document.querySelectorAll("div.embedpdf-native")[k - 1];
        const o = d.querySelector(":scope > object, :scope > iframe");
        if (plant === "border") {
          o.style.border = "2px inset";
          return true;
        }
        if (plant === "fallback") {
          const f = d.querySelector(":scope > .embedpdf-fallback");
          if (!f) return false;
          f.hidden = false;
          return true;
        }
        let n;
        if (plant === "object") {
          n = document.createElement("object");
          n.type = "application/pdf";
          for (const a of ["width", "height", "aria-label"]) if (o.hasAttribute(a)) n.setAttribute(a, o.getAttribute(a));
          n.data = o.src;
        } else {
          n = o.cloneNode(false);
          let to = addr;
          if (to === null) {
            const bin = atob(bytes);
            const arr = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
            to = URL.createObjectURL(new Blob([arr], { type: "application/pdf" })) + frag;
          }
          if (n.tagName === "IFRAME") n.src = to;
          else n.data = to;
        }
        o.replaceWith(n);
        return true;
      }`,
      k,
      plant,
      bytes,
      addr,
      frag
    );
    if (!done) throw new SetupError(`--plant ${plant} found no hidden fallback content beside native embed ${k}`);
    report.planted = `${plant} in native embed ${k}`;
    st = await state();
  }

  // each native embed: its element, address, box, a stable screenshot, its size
  const embeds = [];
  for (let i = 0; i < st.native.length; i++) {
    const e = st.native[i];
    const data = e.address;
    const at = `native embed ${i + 1}`;
    const frag = wantFrag(i);
    const tag = wantTag(i);
    if (e.tag !== tag) failures.push(`${at}: it is <${e.tag}>, but its page option (${pageOf(i)}) asks for <${tag}>`);
    const has = data.includes("#") ? data.slice(data.indexOf("#")) : "";
    if (has !== frag) failures.push(`${at}: its address's fragment is "${has}", but its page option asks for "${frag}"`);
    if (alone && !/^blob:/.test(data)) failures.push(`${at}: its address is not a blob: URL (${data.slice(0, 60)})`);
    if (!alone && data.split("#")[0] !== e.src) failures.push(`${at}: its address ${data.slice(0, 80)} is not its data-src ${e.src.slice(0, 80)}`);
    if (e.tag === "iframe") {
      if (e.border.some((b) => b !== 0)) failures.push(`${at}: its <iframe> has a border (${e.border.join(" ")} px)`);
      // pixel sizes only: a percent width depends on the page's layout
      const want = [Number(e.attrs[0] ?? 300), Number(e.attrs[1] ?? 150)];
      if (want.every(Number.isFinite) && (e.box[0] !== want[0] || e.box[1] !== want[1])) {
        failures.push(`${at}: its <iframe> box is ${e.box.join(" x ")}, not ${want.join(" x ")}`);
      }
    }
    if (e.shown > 0) failures.push(`${at}: ${e.shown} other element(s) of its placeholder show`);
    let shot, size, img;
    try {
      shot = await stableShot(drv, NATIVE, i);
      // the size once the screenshot settled (a box can grow as its viewer loads)
      size = await drv.run(
        `(css, i) => {
          const r = document.querySelectorAll(css)[i].getBoundingClientRect();
          const frac = (v) => Math.round((v - Math.floor(v)) * 1000) / 1000;
          return { w: r.width, h: r.height, x: 8 + frac(r.left + scrollX), y: 8 + frac(r.top + scrollY) };
        }`,
        NATIVE,
        i
      );
      img = decodePng(shot.png);
    } catch (err) {
      // a box of size 0, for example: this embed fails, the others are still checked
      failures.push(`${at}: no screenshot (${err.message.split("\n")[0]})`);
      report.embeds.push({ at, tag: e.tag, address: data.slice(0, 40), frag });
      continue;
    }
    saveShot(`embed-${i + 1}`, shot.png);
    const entry = { at, tag: e.tag, address: data.slice(0, 40), frag, kind: tag, size, stable: shot.stable, ink: inkInPixels(img.data) };
    if (!shot.stable) failures.push(`${at}: its screenshot did not settle in ${STABLE_MS / 1000} s`);
    if (!entry.ink) failures.push(`${at}: no ink`);
    embeds.push({ entry, img });
    report.embeds.push(entry);
  }

  // references, one per element, fragment, and size, and controls, one per
  // element and size
  const refs = new Map();
  const controls = new Map();
  const refUrl = (kind, src, size) =>
    `${refBase}__native_ref?kind=${kind}&src=${encodeURIComponent(src)}&w=${size.w}&h=${size.h}&x=${size.x}&y=${size.y}`;
  async function controlImage(kind, size) {
    const key = `${kind}-${size.w}x${size.h}+${size.x},${size.y}`;
    if (!controls.has(key)) {
      await drv.open(refUrl(kind, refBase + "__control.pdf", size));
      const shot = await stableShot(drv, "#ref", 0);
      saveShot(`control-${key}`, shot.png);
      controls.set(key, decodePng(shot.png));
    }
    return controls.get(key);
  }
  async function refImage(kind, frag, size) {
    const name = `<${kind}> ${frag || "(no fragment)"} ${size.w}x${size.h}`;
    const key = `${kind}${frag}|${size.w}x${size.h}+${size.x},${size.y}`;
    if (!refs.has(key)) {
      const src = plant === "refcontrol" ? refBase + "__control.pdf" : referenceAddress + frag;
      await drv.open(refUrl(kind, src, size));
      const shot = await stableShot(drv, "#ref", 0);
      const img = decodePng(shot.png);
      saveShot(`reference-${kind}${frag}-${size.w}x${size.h}+${size.x},${size.y}`, shot.png);
      if (!shot.stable) failures.push(`reference ${name}: its screenshot did not settle`);
      if (!inkInPixels(img.data)) failures.push(`reference ${name}: no ink`);
      const control = await controlImage(kind, size);
      const c = diffShare(img, control);
      if (c !== null && c.share <= TOLERANCE) {
        failures.push(`reference ${name}: matches the control (a PDF the viewer cannot draw; differs ${c.share.toFixed(4)}), so the viewer did not draw the PDF`);
      }
      report.controls.push({ reference: name, diff: c === null ? "size differs" : c.share.toFixed(4) });
      refs.set(key, img);
    }
    return refs.get(key);
  }
  for (const { entry, img } of embeds) {
    let ref;
    try {
      ref = await refImage(entry.kind, entry.frag, entry.size);
    } catch (err) {
      failures.push(`${entry.at}: no reference screenshot at ${entry.size.w}x${entry.size.h} (${err.message.split("\n")[0]})`);
      continue;
    }
    const d = diffShare(img, ref);
    entry.diff = d === null ? (img.width === ref.width && img.height === ref.height ? `too small to compare (${img.width}x${img.height})` : `size ${img.width}x${img.height} vs ${ref.width}x${ref.height}`) : `${d.share.toFixed(4)} at shift ${d.dx},${d.dy}`;
    if (d === null || d.share > TOLERANCE) failures.push(`${entry.at}: does not match the <${entry.kind}> reference${entry.frag ? " at " + entry.frag : ""} (differs: ${entry.diff})`);
  }
  // page-1 against page-k references, of the element the embed should be
  for (const { entry } of embeds) {
    const m = /#page=(\d+)/.exec(entry.frag);
    if (!m || Number(m[1]) < 2) continue;
    let d;
    try {
      d = diffShare(await refImage(entry.kind, "", entry.size), await refImage(entry.kind, entry.frag, entry.size));
    } catch (err) {
      failures.push(`${entry.at}: no page-1 or ${entry.frag} reference screenshot (${err.message.split("\n")[0]})`);
      continue;
    }
    const diff = d === null ? "size differs" : `${d.share.toFixed(4)} at shift ${d.dx},${d.dy}`;
    const same = d !== null && d.share <= TOLERANCE;
    report.pageReferences.push({ at: entry.at, kind: entry.kind, frag: entry.frag, diff, same });
    if (same) failures.push(`${entry.at}: the page-1 and ${entry.frag} <${entry.kind}> references match, so the browser does not open ${entry.frag}`);
  }
} catch (err) {
  if (err instanceof SetupError) setupError = err.message;
  else failures.push(`error: ${err.message}`);
} finally {
  await drv.close().catch(() => {});
  closeServers();
}
if (setupError) bad(setupError);
report.failures = failures;
console.log(JSON.stringify(report, null, 2));
if (failures.length) {
  console.error(`native_check: FAIL\n  ${failures.join("\n  ")}`);
  exitCode = 1;
} else console.log("native_check: PASS");
process.exit(exitCode);
