// Native embeds: under which file name does the browser's own PDF viewer save
// each one's PDF?
//
// Usage:
//   node tests/save_name_check.mjs --browser chromium|safari
//        --page <page>.html [--alone file|http]
//        --expect-native <n> --expect-save "<entry>|<entry>|…"
//        [--plant wrongid|wrongname|nosave] [--plant-at <k>]
//
// For each native embed of the page (an <object>, or an <iframe> for a page
// option over 1; embedpdf-viewer.js, D-008), in page order, the check loads
// the page again, presses the save control of that embed's own PDF viewer,
// and reads the name of the file the browser saves. --expect-save gives one
// entry per native embed, or one entry for all of them. An entry is a file
// name, or @blob: the id of the embed's blob: URL (the address of an inlined
// PDF, which the viewer makes in inlinedPdf) followed by ".pdf". The check
// reads that address before it presses the control. It fails unless the
// page has exactly --expect-native native embeds and each saved name equals
// its entry. A saved name is the browser's own name for the file: each save
// goes into an empty folder, so the browser adds no suffix for a name
// already taken.
//
// Without --alone, the page comes from docs/ on the check's own HTTP server.
// With --alone, the page must be self-contained (embed-resources: true), and
// a copy of it is opened alone in an empty temporary directory, over file://
// (--alone file) or over HTTP (--alone http).
//
// --browser chromium runs headless through puppeteer-core, from CHROME_PATH
// (default Google Chrome's path). Before it saves embed k, the check removes
// the page's other native embeds, so the page has one PDF viewer. That viewer
// is a target at chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai/
// index.html, and its save control is #save in the shadow roots of
// pdf-viewer > viewer-toolbar > viewer-download-controls. The check clicks
// it through CDP Runtime.evaluate on that target, and reads the name from
// Browser.downloadWillBegin and the saved file from Browser.downloadProgress
// (Browser.setDownloadBehavior into a temporary folder).
//
// --browser safari drives desktop Safari through safaridriver (turn it on
// once with `safaridriver --enable`), with a Safari window in front. Safari
// saves into ~/Downloads, so the check exits 2 if ~/Downloads already holds a
// file whose name is a literal entry, and it deletes each file it saw appear
// there during a save. Safari's PDF viewer shows a control bar (zoom out,
// zoom in, open in Preview, download) while the pointer is over the embed,
// at a height that depends on the embed's size, and element screenshots do
// not show it. So the check moves the pointer over the embed, takes a window
// screenshot, finds the bar inside the embed's box (downloadButton below),
// and clicks the bar's rightmost button. When no bar shows, or no file
// appears within SAVE_MS, it tries again, up to SAFARI_TRIES times. Keep the
// Safari window in front and leave the mouse alone while it runs: on
// 2026-10-20 runs failed with no bar or no saved file for every embed while
// other windows were in use, and passed again once they were not.
// SAVE_CHECK_SHOTS=<dir> saves each window screenshot (and one taken after
// each click, with the button found) there.
//
// Firefox is not a --browser. In Firefox 158 on 2026-10-20 its PDF viewer
// saved no file under puppeteer-core, from its download button, its menu's
// download item, or Cmd+S, headless or with a window, while a plain
// download link saved one.
//
// --plant puts one defect into the native embed --plant-at names (1-based in
// page order, default 1), after the check read its address. Each replaces
// the embed's element:
//   wrongid    with a copy whose address is a new blob: URL of the same PDF,
//              fragment kept; needs @blob as that embed's entry, since its
//              saved name then has another id
//   wrongname  with a copy whose address is dummy.pdf on the check's own
//              HTTP server, fragment kept
//   nosave     with an empty <div> of the same size, which has no PDF
//              viewer, so nothing is saved (on 2026-10-20 an empty blob: of
//              type application/pdf still saved a file in Chromium 155, and
//              about:blank saved "Unknown.html.pdf" from an <object> in
//              desktop Safari 27.0.1)
// The run must then fail and name that embed: wrongid and wrongname as a
// name that is not the entry, nosave as no saved file.
//
// Exits 0 on a pass, 1 on a failed check, 2 on a bad argument, when --plant
// finds nothing to plant in, when ~/Downloads already holds an expected name
// (safari), or when the browser, safaridriver, or the server cannot start.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import { serveDocs, DOCS } from "./serve_docs.mjs";
import { decodePng } from "./png_diff.mjs";

const HYDRATE_MS = 30000; // time for every embed of the page to hydrate
const VIEWER_MS = 20000; // time for a Chromium viewer and its save control
const SAVE_MS = 8000; // time for a saved file after a press
const SAFARI_TRIES = 4;
const WD_MS = 60000; // time limit of one safaridriver call
const VIEWPORT = { width: 1280, height: 900 };
const PLANTS = ["wrongid", "wrongname", "nosave"];
const VIEWER_URL = "chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai/index.html";
const DOWNLOADS = path.join(os.homedir(), "Downloads");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function bad(msg) {
  console.error(`save_name_check: ${msg}`);
  process.exit(2);
}

// --- arguments ---------------------------------------------------------------
const args = process.argv.slice(2);
const flags = {};
for (let i = 0; i < args.length; i++) {
  const k = args[i];
  if (!/^--(browser|page|alone|expect-native|expect-save|plant|plant-at)$/.test(k) || args[i + 1] === undefined) bad(`bad argument ${k}`);
  flags[k.slice(2)] = args[++i];
}
const browserName = flags.browser;
if (browserName === "firefox") bad("--browser firefox is not supported: its PDF viewer saves no file under automation (see the header)");
if (!["chromium", "safari"].includes(browserName)) bad("--browser must be chromium or safari");
const page = flags.page;
if (!page) bad("--page is required");
const alone = flags.alone ?? null;
if (alone !== null && alone !== "file" && alone !== "http") bad("--alone must be file or http");
if (!/^\d+$/.test(flags["expect-native"] ?? "")) bad("--expect-native must be a whole number");
const expectNative = Number(flags["expect-native"]);
if (!flags["expect-save"]) bad("--expect-save is required");
let entries = flags["expect-save"].split("|");
if (entries.some((e) => e === "")) bad("--expect-save has an empty entry");
if (entries.length === 1) entries = Array(expectNative).fill(entries[0]);
if (entries.length !== expectNative) bad(`--expect-save has ${entries.length} entries for ${expectNative} native embeds`);
const plant = flags.plant ?? null;
if (plant && !PLANTS.includes(plant)) bad(`--plant must be one of ${PLANTS.join(", ")}`);
if (flags["plant-at"] && !plant) bad("--plant-at needs --plant");
if (flags["plant-at"] && !/^[1-9]\d*$/.test(flags["plant-at"])) bad("--plant-at must be 1 or more");
const plantAt = plant ? Number(flags["plant-at"] ?? 1) : null;
if (plant && plantAt > expectNative) bad(`--plant-at ${plantAt}: found nothing to plant in (${expectNative} native embeds)`);
if (plant === "wrongid" && entries[plantAt - 1] !== "@blob") bad(`--plant wrongid: found nothing to plant in (embed ${plantAt}'s entry is not @blob)`);
const source = path.resolve(DOCS, page);
if (!source.startsWith(DOCS + path.sep) || !fs.existsSync(source)) bad(`--page ${page} is not a file under docs/`);
if (browserName === "safari") {
  for (const e of new Set(entries)) {
    if (e !== "@blob" && fs.existsSync(path.join(DOWNLOADS, e))) bad(`~/Downloads already holds ${e}; move it away first, since Safari would save under another name`);
  }
}

// --- servers and the page ----------------------------------------------------
const docsServer = await serveDocs().catch((err) => bad(`cannot start the server: ${err.message}`));
const docsBase = `http://127.0.0.1:${docsServer.address().port}/`;
let pageServer = null;
let pageUrl;
if (!alone) {
  pageUrl = docsBase + path.relative(DOCS, source).split(path.sep).map(encodeURIComponent).join("/");
} else {
  const aloneDir = fs.mkdtempSync(path.join(os.tmpdir(), "embedpdf-save-"));
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
  docsServer.close();
  if (pageServer) pageServer.close();
};

// --- in-page code ------------------------------------------------------------
// Wait until every embed is hydrated and each native embed has an address,
// then mark the native embeds in page order and return [{ tag, address }].
const READ_EMBEDS = `async (limit) => {
  const end = Date.now() + limit;
  const read = () => [...document.querySelectorAll("div.embedpdf-native")].map((d) => {
    const e = d.querySelector(":scope > object, :scope > iframe");
    return { e, tag: e ? e.tagName.toLowerCase() : "", address: e ? (e.tagName === "IFRAME" ? e.getAttribute("src") || "" : e.getAttribute("data") || "") : "" };
  });
  for (;;) {
    const unhydrated = document.querySelectorAll("div.embedpdf:not(.embedpdf-pdfjs):not(.embedpdf-native):not(.embedpdf-failed)").length;
    const native = read();
    if ((unhydrated === 0 && native.every((n) => n.address)) || Date.now() > end) {
      native.forEach((n, i) => n.e && n.e.setAttribute("data-save-check", String(i)));
      return native.map((n) => ({ tag: n.tag, address: n.e ? (n.e.tagName === "IFRAME" ? n.e.src : n.e.data) : "" }));
    }
    await new Promise((r) => setTimeout(r, 200));
  }
}`;
// Keep native embed k alone (remove the others), plant into it if asked,
// scroll it to the middle, and return its box.
const PREPARE = `async (k, plant, dummy, keepOthers) => {
  if (!keepOthers) document.querySelectorAll("[data-save-check]").forEach((e) => { if (e.getAttribute("data-save-check") !== String(k)) e.remove(); });
  let el = document.querySelector('[data-save-check="' + k + '"]');
  if (plant) {
    const addr = el.tagName === "IFRAME" ? el.src : el.data;
    const frag = addr.includes("#") ? addr.slice(addr.indexOf("#")) : "";
    let next;
    if (plant === "wrongid") next = URL.createObjectURL(await (await fetch(addr.split("#")[0])).blob()) + frag;
    if (plant === "wrongname") next = dummy + frag;
    let copy;
    if (plant === "nosave") {
      copy = document.createElement("div");
      copy.setAttribute("data-save-check", String(k));
      copy.style.cssText = "display:inline-block;width:" + el.offsetWidth + "px;height:" + el.offsetHeight + "px";
    } else {
      copy = el.cloneNode(false);
      if (el.tagName === "IFRAME") copy.src = next; else copy.data = next;
    }
    el.replaceWith(copy);
    el = copy;
  }
  el.scrollIntoView({ block: "center" });
  const r = el.getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
}`;

// the expected name of embed i, from its entry and the address read before
// any plant
function expectedName(i, address) {
  if (entries[i] !== "@blob") return entries[i];
  if (!/^blob:/.test(address)) return null;
  return address.split("#")[0].split("/").pop() + ".pdf";
}

// The download button of Safari's PDF control bar inside the embed's box, in
// CSS pixels of the viewport, or null when no bar shows. view is the embed's
// box and the window's innerWidth. The bar is a band of gray pixels (r = g =
// b, 140 to 248: on 2026-10-20 it was 179 to 185 when shown and near 242
// while it faded, once the pointer had stopped) at least BAR_MIN_CSS wide, and its
// rightmost button, the download button, is centered about 0.9 bar heights
// left of its right end (measured in 300 x 150 and 600 x 400 embeds on
// 2026-10-20, where the button is about 30 CSS pixels wide).
const BAR_MIN_CSS = 120;
function downloadButton(img, view) {
  const dpr = img.width / view.innerWidth;
  const x0 = Math.max(0, Math.round(view.x * dpr));
  const x1 = Math.min(img.width, Math.round((view.x + view.width) * dpr));
  const y0 = Math.max(0, Math.round(view.y * dpr));
  const y1 = Math.min(img.height, Math.round((view.y + view.height) * dpr));
  const gray = (x, y) => {
    const i = (y * img.width + x) * 4;
    const [r, g, b] = [img.data[i], img.data[i + 1], img.data[i + 2]];
    return Math.abs(r - g) < 8 && Math.abs(g - b) < 8 && r >= 140 && r <= 248;
  };
  const rows = [];
  for (let y = y0; y < y1; y++) {
    let c = 0;
    for (let x = x0; x < x1; x++) if (gray(x, y)) c++;
    if (c >= BAR_MIN_CSS * dpr) rows.push(y);
  }
  if (rows.length < 10 * dpr) return null;
  // the longest run of bar rows
  let best = [rows[0], rows[0]];
  let start = rows[0];
  for (let i = 1; i <= rows.length; i++) {
    if (i === rows.length || rows[i] !== rows[i - 1] + 1) {
      if (rows[i - 1] - start > best[1] - best[0]) best = [start, rows[i - 1]];
      if (i < rows.length) start = rows[i];
    }
  }
  const [top, bottom] = best;
  const h = bottom - top + 1;
  // the bar's columns: the longest run of mostly gray columns, allowing short
  // gaps, so a gray page shadow beside the bar is not taken for its end
  const gap = Math.round(4 * dpr);
  let run = null;
  let longest = null;
  for (let x = x0; x < x1; x++) {
    let c = 0;
    for (let y = top; y <= bottom; y++) if (gray(x, y)) c++;
    if (c <= h / 2) continue;
    if (run && x - run[1] <= gap + 1) run[1] = x;
    else run = [x, x];
    if (!longest || run[1] - run[0] > longest[1] - longest[0]) longest = [run[0], run[1]];
  }
  if (!longest || longest[1] - longest[0] < BAR_MIN_CSS * dpr) return null;
  const right = longest[1];
  return { x: (right - 0.9 * h) / dpr, y: (top + bottom) / 2 / dpr };
}

// --- browsers ----------------------------------------------------------------
// Each driver gives version, saveEmbed(k) -> { tag, address, name } (name is
// null when no file was saved), and close().
async function chromiumDriver() {
  const { default: puppeteer } = await import("puppeteer-core");
  let browser;
  try {
    browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new" });
  } catch (err) {
    bad(`cannot start chromium: ${err.message.split("\n")[0]}`);
  }
  const version = await browser.version();
  const cdp = await browser.target().createCDPSession();
  return {
    version,
    async saveEmbed(k) {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "embedpdf-saved-"));
      try {
        await cdp.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: dir, eventsEnabled: true });
        const begun = new Map(); // guid -> suggested name
        const done = new Set();
        const onBegin = (e) => begun.set(e.guid, e.suggestedFilename);
        const onProgress = (e) => e.state === "completed" && done.add(e.guid);
        cdp.on("Browser.downloadWillBegin", onBegin);
        cdp.on("Browser.downloadProgress", onProgress);
        const tab = await browser.newPage();
        try {
          await tab.setViewport(VIEWPORT);
          await tab.goto(pageUrl, { waitUntil: "load" });
          const native = await tab.evaluate(`(${READ_EMBEDS})(${HYDRATE_MS})`);
          const embed = native[k] ?? { tag: "", address: "" };
          if (native.length !== expectNative) return { count: native.length, ...embed, name: null };
          await tab.evaluate(`(${PREPARE})(${k}, ${JSON.stringify(k + 1 === plantAt ? plant : null)}, ${JSON.stringify(docsBase + "dummy.pdf")}, false)`);
          // one viewer is left; press its save control once it exists
          const end = Date.now() + VIEWER_MS;
          let pressed = false;
          while (!pressed && Date.now() < end) {
            await sleep(300);
            const viewers = browser.targets().filter((t) => t.url().startsWith(VIEWER_URL));
            if (viewers.length !== 1) continue;
            const s = await viewers[0].createCDPSession().catch(() => null);
            if (!s) continue;
            const r = await s
              .send("Runtime.evaluate", {
                returnByValue: true,
                expression: `(() => {
                  const v = document.querySelector("pdf-viewer");
                  const t = v && v.shadowRoot && v.shadowRoot.querySelector("viewer-toolbar");
                  const d = t && t.shadowRoot && t.shadowRoot.querySelector("viewer-download-controls");
                  const b = d && d.shadowRoot && d.shadowRoot.querySelector("#save");
                  if (!b || b.disabled) return false;
                  b.click();
                  return true;
                })()`,
              })
              .catch(() => null);
            pressed = !!(r && r.result && r.result.value);
            await s.detach().catch(() => {});
          }
          let name = null;
          const saveEnd = Date.now() + SAVE_MS;
          while (pressed && Date.now() < saveEnd) {
            const guid = [...begun.keys()].find((g) => done.has(g));
            if (guid) {
              name = begun.get(guid);
              if (!fs.existsSync(path.join(dir, name))) name = `${name} (reported, but no such file was saved)`;
              break;
            }
            await sleep(200);
          }
          return { ...embed, pressed, name };
        } finally {
          cdp.off("Browser.downloadWillBegin", onBegin);
          cdp.off("Browser.downloadProgress", onProgress);
          await tab.close().catch(() => {});
        }
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
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
  let session, version;
  try {
    const value = await wd("POST", "/session", { capabilities: { alwaysMatch: { browserName: "safari" } } });
    session = value.sessionId;
    version = value.capabilities?.browserVersion ?? "?";
  } catch (err) {
    driver.kill();
    bad(`no safaridriver session: ${err.message}`);
  }
  const s = `/session/${session}`;
  await wd("POST", `${s}/window/rect`, { width: VIEWPORT.width, height: VIEWPORT.height + 90 }).catch(() => {});
  const run = (fnSource, ...a) =>
    wd("POST", `${s}/execute/async`, {
      script: `const done = arguments[arguments.length - 1]; (${fnSource})(...[...arguments].slice(0, -1)).then(done, (e) => done({ error: String(e) }));`,
      args: a,
    });
  const pointer = (actions) => wd("POST", `${s}/actions`, { actions: [{ type: "pointer", id: "mouse", parameters: { pointerType: "mouse" }, actions }] });
  // files in ~/Downloads that are not Safari's partial .download bundles
  const listDownloads = () => new Set(fs.readdirSync(DOWNLOADS).filter((n) => !n.endsWith(".download")));
  return {
    version: `Safari ${version}`,
    async saveEmbed(k) {
      await wd("POST", `${s}/url`, { url: pageUrl });
      const native = await run(READ_EMBEDS, HYDRATE_MS);
      const embed = native[k] ?? { tag: "", address: "" };
      if (native.length !== expectNative) return { count: native.length, ...embed, name: null };
      await run(PREPARE, k, k + 1 === plantAt ? plant : null, docsBase + "dummy.pdf", true);
      await sleep(1500);
      const els = await wd("POST", `${s}/elements`, { using: "css selector", value: `[data-save-check="${k}"]` });
      const el = els[0];
      if (!el) return { ...embed, name: null };
      const before = listDownloads();
      const added = [];
      let barSeen = false;
      try {
        for (let t = 0; t < SAFARI_TRIES && added.length === 0; t++) {
          await pointer([
            { type: "pointerMove", origin: el, x: 0, y: 0, duration: 100 },
            { type: "pointerMove", origin: el, x: 1, y: 1, duration: 300 },
            { type: "pause", duration: 1200 },
          ]);
          const png = Buffer.from(await wd("GET", `${s}/screenshot`), "base64");
          const view = await run(`async (k) => {
            const r = document.querySelector('[data-save-check="' + k + '"]').getBoundingClientRect();
            return { x: r.x, y: r.y, width: r.width, height: r.height, innerWidth };
          }`, k);
          if (process.env.SAVE_CHECK_SHOTS) fs.writeFileSync(path.join(process.env.SAVE_CHECK_SHOTS, `embed-${k + 1}-try-${t + 1}.png`), png);
          const button = downloadButton(decodePng(png), view);
          if (!button) continue;
          barSeen = true;
          // pointer offsets from the element's center
          const bx = Math.round(button.x - (view.x + view.width / 2));
          const by = Math.round(button.y - (view.y + view.height / 2));
          // moving onto the button shows a fading bar again
          await pointer([
            { type: "pointerMove", origin: el, x: bx - 3, y: by, duration: 200 },
            { type: "pointerMove", origin: el, x: bx, y: by, duration: 100 },
            { type: "pause", duration: 600 },
            { type: "pointerDown", button: 0 },
            { type: "pointerUp", button: 0 },
          ]);
          if (process.env.SAVE_CHECK_SHOTS) {
            await sleep(500);
            fs.writeFileSync(path.join(process.env.SAVE_CHECK_SHOTS, `embed-${k + 1}-try-${t + 1}-after.png`), Buffer.from(await wd("GET", `${s}/screenshot`), "base64"));
            fs.writeFileSync(path.join(process.env.SAVE_CHECK_SHOTS, `embed-${k + 1}-try-${t + 1}.json`), JSON.stringify({ view, button, bx, by }));
          }
          const end = Date.now() + SAVE_MS;
          while (Date.now() < end) {
            await sleep(250);
            const now = [...listDownloads()].filter((n) => !before.has(n));
            const partial = fs.readdirSync(DOWNLOADS).some((n) => n.endsWith(".download") && !before.has(n));
            if (now.length && !partial) {
              await sleep(1000); // a second file from the same press
              added.push(...[...listDownloads()].filter((n) => !before.has(n)));
              break;
            }
          }
        }
      } finally {
        // delete every file that appeared, also on a failure
        for (const n of fs.readdirSync(DOWNLOADS).filter((n) => !before.has(n))) fs.rmSync(path.join(DOWNLOADS, n), { recursive: true, force: true });
      }
      if (added.length > 1) return { ...embed, name: `${added.length} files (${added.join(", ")})` };
      return { ...embed, pressed: barSeen, name: added[0] ?? null };
    },
    async close() {
      await wd("DELETE", s).catch(() => {});
      driver.kill();
    },
  };
}

// --- run ---------------------------------------------------------------------
const drv = browserName === "chromium" ? await chromiumDriver() : await safariDriver();
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    drv.close().catch(() => {}).finally(() => {
      closeServers();
      process.exit(130);
    });
  });
}
const failures = [];
const lines = [];
let exitCode = 0;
try {
  for (let k = 0; k < expectNative; k++) {
    const r = await drv.saveEmbed(k);
    const at = `native embed ${k + 1} (${r.tag || "no element"})`;
    if (r.count !== undefined) {
      failures.push(`the page has ${r.count} native embeds, not ${expectNative}`);
      break;
    }
    const want = expectedName(k, r.address);
    const planted = k + 1 === plantAt ? ` [planted: ${plant}]` : "";
    lines.push(`${at}: saved as ${r.name ?? "(nothing)"}, expected ${want ?? "(no blob: address)"}${planted}`);
    if (want === null) failures.push(`${at}: its entry is @blob but its address is not a blob: URL (${r.address.slice(0, 60)})`);
    else if (r.name === null) failures.push(`${at}: no file was saved${r.pressed === false ? " (its save control was not found)" : ""}`);
    else if (r.name !== want) failures.push(`${at}: saved as ${r.name}, not ${want}`);
  }
} catch (err) {
  failures.push(`the run stopped: ${err.message.split("\n")[0]}`);
} finally {
  await drv.close().catch(() => {});
  closeServers();
}
console.log(`save_name_check: ${drv.version}, ${page}${alone ? ` alone (${alone})` : ""}`);
for (const l of lines) console.log(`  ${l}`);
if (failures.length) {
  for (const f of failures) console.log(`FAIL ${f}`);
  exitCode = 1;
} else {
  console.log(`PASS ${expectNative} native embeds saved under their expected names`);
}
process.exit(exitCode);
