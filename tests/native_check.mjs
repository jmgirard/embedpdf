// Native embeds of a self-contained page: does each one show its in-page PDF?
//
// Usage:
//   node tests/native_check.mjs --browser chromium|firefox|safari
//        --page selfcontained_test.html --alone file|http
//        --expect-native <n> --reference sample.pdf [--same-pages]
//        [--plant otherpdf|broken|blank|fileaddr|nopage] [--plant-at <k>]
//
// A self-contained page (embed-resources: true) holds its PDF as a data:
// address, and the viewer gives each native <object> a blob: URL of it
// (embedpdf-viewer.js, inlinedPdf). This check opens a copy of the page alone
// in an empty temporary directory, over file:// (--alone file) or over HTTP
// (--alone http). It fails unless the page has exactly --expect-native native
// embeds, each one's <object> address is a blob: URL, and its fragment is
// #page=<k> where the embed's data-page (the page option) is k > 1, and empty
// otherwise. It then takes a screenshot of each native embed's <object> and a
// screenshot of a reference: an <object type="application/pdf"> of
// --reference (a PDF under docs/) on the check's own HTTP server, with the
// fragment the page option asks for and the embed's size and fractional
// position, alone on a page in the same browser. It fails unless the two
// match, and unless both screenshots hold ink (tests/ink.mjs). Before
// each screenshot it waits until two screenshots in a row are the same (at
// most STABLE_MS).
//
// Two screenshots match when, at the best shift of up to SHIFT device pixels
// each way, at most TOLERANCE of their BLOCK x BLOCK pixel blocks differ by
// more than PIXEL_DIFF in a channel's average (diffShare in
// tests/png_diff.mjs). On 2026-10-19, on the six selfcontained_test.html lines
// in CLAUDE.md, an embed and its reference differed in at most 0.0035 of the
// blocks (Firefox 158). Each plant below that failed as a mismatch differed in
// at least 0.0397 (desktop Safari 27.0.1, blank and broken), and otherpdf in
// at least 0.0676 (Chromium 155).
//
// For each embed whose page option is k > 1, the check also takes a page-1
// reference (no fragment) at that size. It fails unless the page-1 and page-k
// references differ, so the browser opens a native embed at the fragment's
// page (on 2026-10-19 they differed in 0.1371 of the blocks in Chromium 155
// and 0.0530 in Firefox 158). With --same-pages it fails unless they match
// instead: the browser opens it at page 1 whatever the fragment says (desktop
// Safari 27.0.1 on 2026-10-19). --same-pages needs such an embed on the page.
//
// --browser chromium and firefox run headless through puppeteer-core:
// Chromium from CHROME_PATH (default Google Chrome's path), Firefox from
// FIREFOX_PATH (default /Applications/Firefox.app/Contents/MacOS/firefox).
// Firefox runs with its PDF viewer's pdfjs.viewOnLoad set to 1, so each PDF
// opens as on a first visit; with the default, it reopened a PDF at the page
// last shown, and a reference after the page-2 embed opened at page 2.
// Firefox started from Claude Code fails with "Could not find profile folder"
// until its folder ~/Library/Application Support/Firefox exists; one launch
// by `open -g -a Firefox` makes it. --browser safari drives desktop Safari
// through safaridriver, as tests/safari_check.mjs does (turn safaridriver on
// once with `safaridriver --enable`).
//
// --plant puts one defect into the native embed --plant-at names (1-based in
// page order, default 1; nopage defaults to the first embed whose page option
// is over 1). It replaces that <object> with a copy whose address is:
//   otherpdf  a blob: of files/large.pdf (another inked PDF)
//   broken    a blob: of files/broken.pdf (a text file: the viewer's error)
//   blank     an empty blob:
//   fileaddr  the reference's HTTP address, not a blob:
//   nopage    the embed's own address without its #page fragment
// The fragment is kept (except nopage). The run must then fail and name that
// embed; otherpdf and broken must fail as a mismatch. In desktop Safari
// 27.0.1, which ignores the fragment, nopage fails only on the address.
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
const VIEWPORT = { width: 1200, height: 900 };
const PLANTS = ["otherpdf", "broken", "blank", "fileaddr", "nopage"];
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
  if (k === "--same-pages") {
    flags["same-pages"] = true;
    continue;
  }
  if (!/^--(browser|page|alone|expect-native|reference|plant|plant-at)$/.test(k) || args[i + 1] === undefined) bad(`bad argument ${k}`);
  flags[k.slice(2)] = args[++i];
}
const browserName = flags.browser;
if (!["chromium", "firefox", "safari"].includes(browserName)) bad("--browser must be chromium, firefox, or safari");
const page = flags.page;
if (!page) bad("--page is required");
const alone = flags.alone;
if (alone !== "file" && alone !== "http") bad("--alone must be file or http");
if (!/^\d+$/.test(flags["expect-native"] ?? "")) bad("--expect-native must be a whole number");
const expectNative = Number(flags["expect-native"]);
const reference = flags.reference;
if (!reference) bad("--reference is required");
const referenceFile = path.resolve(DOCS, reference);
if (!referenceFile.startsWith(DOCS + path.sep) || !fs.existsSync(referenceFile)) bad(`--reference ${reference} is not a file under docs/`);
const samePages = !!flags["same-pages"];
const plant = flags.plant ?? null;
if (plant && !PLANTS.includes(plant)) bad(`--plant must be one of ${PLANTS.join(", ")}`);
if (flags["plant-at"] && !plant) bad("--plant-at needs --plant");
if (flags["plant-at"] && !/^[1-9]\d*$/.test(flags["plant-at"])) bad("--plant-at must be 1 or more");
const plantAt = flags["plant-at"] ? Number(flags["plant-at"]) : null;
const source = path.resolve(DOCS, page);
if (!source.startsWith(DOCS + path.sep) || !fs.existsSync(source)) bad(`--page ${page} is not a file under docs/`);

const diffShare = (a, b) => diffShareOf(a, b, { shift: SHIFT, pixelDiff: PIXEL_DIFF, block: BLOCK });

// --- servers and the page copy -----------------------------------------------
const refServer = await serveDocs({
  routes: {
    // one <object> of ?src, ?w x ?h CSS pixels, at ?x, ?y in the page (the
    // embed's own fractional position, so the browser snaps it to pixels alike)
    "/__native_ref": (req, res) => {
      const q = new URL(req.url, "http://127.0.0.1").searchParams;
      const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      res.end(
        `<!doctype html><html><head><meta charset="utf-8"><title>reference</title></head>` +
          `<body style="margin:0"><object id="ref" type="application/pdf" data="${esc(q.get("src"))}" ` +
          `style="position:absolute;left:${Number(q.get("x"))}px;top:${Number(q.get("y"))}px;` +
          `width:${Number(q.get("w"))}px;height:${Number(q.get("h"))}px"></object></body></html>`
      );
    },
  },
}).catch((err) => bad(`cannot start the server: ${err.message}`));
const refBase = `http://127.0.0.1:${refServer.address().port}/`;
const referenceAddress = refBase + path.relative(DOCS, referenceFile).split(path.sep).map(encodeURIComponent).join("/");

const aloneDir = fs.mkdtempSync(path.join(os.tmpdir(), "embedpdf-native-"));
process.on("exit", () => fs.rmSync(aloneDir, { recursive: true, force: true }));
fs.copyFileSync(source, path.join(aloneDir, path.basename(page)));
let pageServer = null;
let pageUrl;
if (alone === "http") {
  pageServer = await serveDocs({ root: aloneDir }).catch((err) => bad(`cannot start the server: ${err.message}`));
  pageUrl = `http://127.0.0.1:${pageServer.address().port}/${encodeURIComponent(path.basename(page))}`;
} else {
  pageUrl = pathToFileURL(path.join(aloneDir, path.basename(page))).href;
}
const closeServers = () => {
  refServer.close();
  if (pageServer) pageServer.close();
};

// bytes a plant puts in a blob:, as base64 (from the repo's files/)
const FILES = path.resolve(DOCS, "..", "files");
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
    const hint = /profile folder/.test(err.message) ? " (run `open -g -a Firefox` once, then quit Firefox)" : "";
    bad(`cannot start ${kind}${hint}: ${err.message.split("\n")[0]}`);
  }
  const tab = await browser.newPage();
  await tab.setViewport(VIEWPORT);
  return {
    version: await browser.version(),
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
    const res = await fetch(base + p, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
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
  for (;;) {
    await sleep(500);
    const next = await drv.shotOf(css, index);
    if (next.equals(prev)) return { png: next, stable: true };
    prev = next;
    if (Date.now() - start > STABLE_MS) return { png: next, stable: false };
  }
}

// NATIVE_CHECK_SHOTS=<dir>: also save every screenshot there
function saveShot(name, png) {
  if (process.env.NATIVE_CHECK_SHOTS) fs.writeFileSync(path.join(process.env.NATIVE_CHECK_SHOTS, `${browserName}-${name}.png`), png);
}

// --- the run -----------------------------------------------------------------
const failures = [];
const report = { browser: browserName, page, alone, reference: referenceAddress, planted: null, embeds: [], pageReferences: [] };
const drv = browserName === "safari" ? await safariDriver() : await puppeteerDriver(browserName);
report.version = drv.version;
let exitCode = 0;
// an argument the page cannot meet: exit 2 after the browser closes
class SetupError extends Error {}
let setupError = null;
try {
  await drv.open(pageUrl);
  // wait until every embed is hydrated (at most 30 s)
  const state = () =>
    drv.run(`() => ({
      unhydrated: document.querySelectorAll("div.embedpdf:not(.embedpdf-pdfjs):not(.embedpdf-native):not(.embedpdf-failed)").length,
      native: [...document.querySelectorAll("div.embedpdf-native object")].map((o) => o.data),
      pages: [...document.querySelectorAll("div.embedpdf-native")].map((d) => d.getAttribute("data-page") || ""),
    })`);
  // the #page fragment each native embed's page option asks for (data-page,
  // which the shortcode writes and the viewer leaves on the embed)
  const wantFrag = (i) => {
    const n = parseInt(st.pages[i], 10) || 1;
    return n > 1 ? `#page=${n}` : "";
  };
  let st = await state();
  for (let t = 0; st.unhydrated > 0 && t < 60; t++) {
    await sleep(500);
    st = await state();
  }
  if (st.unhydrated > 0) failures.push(`${st.unhydrated} embed(s) not hydrated after 30 s`);
  if (st.native.length !== expectNative) failures.push(`expected ${expectNative} native embeds, found ${st.native.length}`);

  // --plant: replace the target <object> with a copy at the planted address
  if (plant) {
    let k = plantAt;
    if (!k) k = plant === "nopage" ? st.native.findIndex((d, i) => wantFrag(i)) + 1 : 1;
    if (k < 1 || k > st.native.length || (plant === "nopage" && !wantFrag(k - 1))) {
      throw new SetupError(`--plant ${plant} found nothing to plant in (native embed ${k || "with #page="})`);
    }
    const bytes = plantBytes[plant] ? plantBytes[plant]() : null;
    const frag = st.native[k - 1].includes("#") ? st.native[k - 1].slice(st.native[k - 1].indexOf("#")) : "";
    const addr = plant === "fileaddr" ? referenceAddress + frag : plant === "nopage" ? st.native[k - 1].split("#")[0] : null;
    await drv.run(
      `(k, bytes, addr, frag) => {
        const o = document.querySelectorAll("div.embedpdf-native object")[k - 1];
        const n = o.cloneNode(false);
        if (addr !== null) n.data = addr;
        else {
          const bin = atob(bytes);
          const arr = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          n.data = URL.createObjectURL(new Blob([arr], { type: "application/pdf" })) + frag;
        }
        o.replaceWith(n);
      }`,
      k,
      bytes,
      addr,
      frag
    );
    report.planted = `${plant} in native embed ${k}`;
    st = await state();
  }

  // each native embed: blob: address, a stable screenshot, its size
  const embeds = [];
  for (let i = 0; i < st.native.length; i++) {
    const data = st.native[i];
    const at = `native embed ${i + 1}`;
    const frag = wantFrag(i);
    const has = data.includes("#") ? data.slice(data.indexOf("#")) : "";
    if (has !== frag) failures.push(`${at}: its address's fragment is "${has}", but its page option asks for "${frag}"`);
    if (!/^blob:/.test(data)) failures.push(`${at}: its address is not a blob: URL (${data.slice(0, 60)})`);
    let shot;
    try {
      shot = await stableShot(drv, "div.embedpdf-native object", i);
    } catch (err) {
      // a box of size 0, for example: this embed fails, the others are still checked
      failures.push(`${at}: no screenshot (${err.message.split("\n")[0]})`);
      report.embeds.push({ at, address: data.slice(0, 40), frag });
      continue;
    }
    // the size once the screenshot settled (a box can grow as its viewer loads)
    const size = await drv.run(
      `(i) => {
        const r = document.querySelectorAll("div.embedpdf-native object")[i].getBoundingClientRect();
        const frac = (v) => Math.round((v - Math.floor(v)) * 1000) / 1000;
        return { w: r.width, h: r.height, x: 8 + frac(r.left + scrollX), y: 8 + frac(r.top + scrollY) };
      }`,
      i
    );
    const img = decodePng(shot.png);
    saveShot(`embed-${i + 1}`, shot.png);
    const entry = { at, address: data.slice(0, 40), frag, size, stable: shot.stable, ink: inkInPixels(img.data) };
    if (!shot.stable) failures.push(`${at}: its screenshot did not settle in ${STABLE_MS / 1000} s`);
    if (!entry.ink) failures.push(`${at}: no ink`);
    embeds.push({ entry, img });
    report.embeds.push(entry);
  }

  // references, one per fragment and size
  const refs = new Map();
  async function refImage(frag, size) {
    const key = `${frag}|${size.w}x${size.h}+${size.x},${size.y}`;
    if (!refs.has(key)) {
      const src = referenceAddress + frag;
      await drv.open(`${refBase}__native_ref?src=${encodeURIComponent(src)}&w=${size.w}&h=${size.h}&x=${size.x}&y=${size.y}`);
      const shot = await stableShot(drv, "#ref", 0);
      const img = decodePng(shot.png);
      saveShot(`reference${frag.replace(/[^a-z0-9]/gi, "-")}-${size.w}x${size.h}`, shot.png);
      if (!shot.stable) failures.push(`reference ${frag || "(no fragment)"} ${size.w}x${size.h}: its screenshot did not settle`);
      if (!inkInPixels(img.data)) failures.push(`reference ${frag || "(no fragment)"} ${size.w}x${size.h}: no ink`);
      refs.set(key, img);
    }
    return refs.get(key);
  }
  for (const { entry, img } of embeds) {
    let ref;
    try {
      ref = await refImage(entry.frag, entry.size);
    } catch (err) {
      failures.push(`${entry.at}: no reference screenshot at ${entry.size.w}x${entry.size.h} (${err.message.split("\n")[0]})`);
      continue;
    }
    const d = diffShare(img, ref);
    entry.diff = d === null ? `size ${img.width}x${img.height} vs ${ref.width}x${ref.height}` : `${d.share.toFixed(4)} at shift ${d.dx},${d.dy}`;
    if (d === null || d.share > TOLERANCE) failures.push(`${entry.at}: does not match the reference${entry.frag ? " at " + entry.frag : ""} (differs: ${entry.diff})`);
  }
  // page-1 against page-k references
  let pageEmbeds = 0;
  for (const { entry } of embeds) {
    const m = /#page=(\d+)/.exec(entry.frag);
    if (!m || Number(m[1]) < 2) continue;
    pageEmbeds++;
    const d = diffShare(await refImage("", entry.size), await refImage(entry.frag, entry.size));
    const diff = d === null ? "size differs" : `${d.share.toFixed(4)} at shift ${d.dx},${d.dy}`;
    const same = d !== null && d.share <= TOLERANCE;
    report.pageReferences.push({ at: entry.at, frag: entry.frag, diff, same });
    if (samePages && !same) failures.push(`${entry.at}: --same-pages, but the page-1 and ${entry.frag} references differ (${diff})`);
    if (!samePages && same) failures.push(`${entry.at}: the page-1 and ${entry.frag} references match, so the browser does not open ${entry.frag}`);
  }
  if (samePages && pageEmbeds === 0) throw new SetupError("--same-pages needs a native embed with a #page=<k> fragment, k > 1");
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
