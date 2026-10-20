// Safari's accessible names for native and PDF.js embeds and PDF.js toolbars.
//
// Usage:
//   node tests/safari_check.mjs --target mac [--page example.html]
//        [--expect-native <n>] --expect-pdfjs <n>
//        --expect-name "<file name>" | "<name 1>|<name 2>|..."
//   node tests/safari_check.mjs --target simulator --device <name|udid> ...same...
//   node tests/safari_check.mjs --target page-script --device <name|udid>
//
// --target mac and simulator drive Safari through safaridriver (WebDriver) and
// read each name with WebDriver's "Get Computed Label", which returns the name
// Safari gives assistive technology. safaridriver must be turned on once with
// `safaridriver --enable` (asks for an admin password). mac uses desktop
// Safari; simulator asks safaridriver for Safari in the iOS simulator
// (safari:useSimulator), which also needs Remote Automation on in the
// simulator's Safari settings. The page comes from docs/ (tests/serve_docs.mjs).
// Each run fails unless the page has --expect-native native embeds (0 when not
// given), every native embed's <object> (or <iframe>, for a page option over
// 1) has no title, every PDF.js embed's
// name and every native embed's <object> or <iframe> name is its --expect-name name in
// document order (numbered
// as in tests/expect_names.mjs), each toolbar control's name is its
// title, which must be "Zoom out", "Zoom in", or "Download PDF" in that
// order, and each toolbar's page indicator reads "Page 1 of <pages>" with the
// pages at the top and "Page 2 of <pages>" after they scroll to page 2 (read
// only where page 1 can scroll above the middle of the frame; the run fails
// when no embed of 2 or more pages can). One --expect-name names the
// --expect-native plus --expect-pdfjs embeds; a "|" list names each, so a file
// name that holds "|" cannot be given.
// Get Computed Label gives a plain span no name, so to read the indicator the
// check gives it role heading for the read, whose name Safari computes from
// its content, and then removes the role.
// --plant rawindicator|nonumber plants a defect in the first PDF.js embed, as
// in render_check (removes aria-hidden from its shown "i / n", or the " (k of
// n)" from its name); --plant nativename changes the first native <object>'s
// (or <iframe>'s)
// aria-label to "PDF: wrong.pdf", and nativetitle gives it a title equal to
// its aria-label. The run must then fail.
//
// --remote cors (with --target mac or simulator) serves the PDFs from a second
// server on another port (another origin) that sends
// Access-Control-Allow-Origin: *, and points each embed at it
// (tests/serve_docs.mjs). The run then also fails if an embed shows "This PDF
// cannot be shown here.", if a PDF.js embed's address or a native <object>'s
// or <iframe>'s
// address is not on that server, or if that server answered no GET without an
// Origin header for a native embed's PDF.
//
// --target page-script opens a probe page in Safari in the iOS simulator with
// `xcrun simctl openurl` and reports whether a page script can read a
// computed name (Element.prototype.computedName). It fails when it cannot.
//
// Exits 0 on a pass, 1 on a failed check or a probe that cannot read names,
// 2 on a bad argument, when --plant finds nothing to plant in, when the
// server, safaridriver, a safaridriver session, or simctl cannot start, or
// when --page is a RevealJS slide deck (the check does not move between
// slides).

import { spawn, execFileSync } from "node:child_process";
import net from "node:net";
import fs from "node:fs";
import { serveDocs, serveRemote, pointPdfsAt, embedSrcsOffRemote, docsFile } from "./serve_docs.mjs";
import { expectedNames } from "./expect_names.mjs";

const args = process.argv.slice(2);
const flags = {};
for (let i = 0; i < args.length; i += 2) {
  const k = args[i];
  if (!/^--(target|page|device|expect-native|expect-pdfjs|expect-name|plant|remote)$/.test(k) || args[i + 1] === undefined) {
    console.error(`safari_check: bad argument ${k}`);
    process.exit(2);
  }
  flags[k.slice(2)] = args[i + 1];
}
const target = flags.target;
if (!["mac", "simulator", "page-script"].includes(target)) {
  console.error("safari_check: --target must be mac, simulator, or page-script");
  process.exit(2);
}
if (target !== "mac" && !flags.device) {
  console.error(`safari_check: --target ${target} needs --device`);
  process.exit(2);
}
if (target === "mac" && flags.device) {
  console.error("safari_check: --device is for --target simulator or page-script, not mac");
  process.exit(2);
}
// a page of native embeds alone (page_test.html) takes --expect-pdfjs 0
if (target !== "page-script" && !(flags["expect-name"] && /^\d+$/.test(flags["expect-pdfjs"] || "") && Number(flags["expect-pdfjs"]) + Number(flags["expect-native"] || 0) > 0)) {
  console.error("safari_check: --expect-name and --expect-pdfjs are required, with --expect-native plus --expect-pdfjs 1 or more");
  process.exit(2);
}
if (flags["expect-name"] && flags["expect-name"].split("|").some((n) => !n)) {
  console.error("safari_check: --expect-name needs a non-empty file name for each embed");
  process.exit(2);
}
if (flags["expect-native"] !== undefined && !/^\d+$/.test(flags["expect-native"])) {
  console.error("safari_check: --expect-native needs a whole number");
  process.exit(2);
}
const expectNative = Number(flags["expect-native"] || 0);
// the embeds that --expect-name names: native and PDF.js, in document order
const named = Number(flags["expect-pdfjs"]) + expectNative;
const nameList = flags["expect-name"] ? flags["expect-name"].split("|") : [];
if (nameList.length > 1 && nameList.length !== named) {
  console.error(`safari_check: --expect-name gives ${nameList.length} names, --expect-native and --expect-pdfjs ${named} embeds`);
  process.exit(2);
}
const page = flags.page || "example.html";
const plant = flags.plant || null;
if (plant && (target === "page-script" || !["rawindicator", "nonumber", "nativename", "nativetitle"].includes(plant))) {
  console.error("safari_check: --plant must be rawindicator, nonumber, nativename, or nativetitle, with --target mac or simulator");
  process.exit(2);
}
const remote = flags.remote || null;
if (remote && (remote !== "cors" || target === "page-script")) {
  console.error("safari_check: --remote must be cors, with --target mac or simulator");
  process.exit(2);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// the docs server, or exit 2 when it cannot start
const startServer = (opts) =>
  serveDocs(opts).catch((err) => {
    console.error(`safari_check: cannot start the docs server: ${err.message}`);
    process.exit(2);
  });
const simctl = (...a) => execFileSync("xcrun", ["simctl", ...a], { encoding: "utf8" });

function simulator(key) {
  let list;
  try {
    list = JSON.parse(simctl("list", "devices", "available", "-j")).devices;
  } catch (err) {
    console.error(`safari_check: cannot list the simulators: ${err.message}`);
    process.exit(2);
  }
  const found = Object.values(list).flat().filter((d) => d.udid === key || d.name === key);
  if (found.length !== 1) {
    console.error(`safari_check: ${found.length} available simulators match "${key}"`);
    process.exit(2);
  }
  return found[0];
}

// --- page-script probe ------------------------------------------------------
if (target === "page-script") {
  const dev = simulator(flags.device);
  let onReport;
  const reported = new Promise((r) => (onReport = r));
  const PROBE = `<!doctype html><title>probe</title><button title="Zoom in"><span aria-hidden="true">+</span></button>
<script>
const b = document.querySelector("button");
const r = { hasComputedName: "computedName" in Element.prototype, hasComputedRole: "computedRole" in Element.prototype,
  computedName: b.computedName === undefined ? null : String(b.computedName), userAgent: navigator.userAgent };
fetch("/__probe", { method: "POST", body: JSON.stringify(r) });
</script>`;
  const server = await startServer({
    routes: {
      "/__safari_probe.html": (req, res) => res.writeHead(200, { "Content-Type": "text/html" }).end(PROBE),
      "/__probe": (req, res) => {
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", () => {
          res.writeHead(204).end();
          onReport(JSON.parse(body));
        });
      },
    },
  });
  try {
    execFileSync("xcrun", ["simctl", "boot", dev.udid], { stdio: "ignore" });
  } catch {
    // already booted
  }
  try {
    simctl("bootstatus", dev.udid, "-b");
    simctl("openurl", dev.udid, `http://127.0.0.1:${server.address().port}/__safari_probe.html?t=${Date.now()}`);
  } catch (err) {
    console.error(`safari_check: cannot open the probe in the simulator: ${err.message}`);
    server.close();
    process.exit(2);
  }
  const report = await Promise.race([reported, sleep(60000).then(() => null)]);
  server.close();
  console.log(JSON.stringify({ target, device: dev.name, report }, null, 2));
  if (!report) {
    console.error("safari_check: no probe report within 60 s");
    process.exit(1);
  }
  if (!report.hasComputedName || report.computedName !== "Zoom in") {
    console.error(`safari_check: a page script in this Safari cannot read a computed name (computedName ${report.hasComputedName ? JSON.stringify(report.computedName) : "is not defined"})`);
    process.exit(1);
  }
  process.exit(0);
}

// --- safaridriver -----------------------------------------------------------
const freePort = () =>
  new Promise((resolve) => {
    const s = net.createServer().listen(0, "127.0.0.1", () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
// the device and the server first, so an exit there leaves no safaridriver
const dev = target === "simulator" ? simulator(flags.device) : null;
// --remote cors: the PDFs come from a second server (another origin) that
// sends Access-Control-Allow-Origin: *
const remoteServer = remote
  ? await serveRemote("cors").catch((err) => {
      console.error(`safari_check: cannot start the remote server: ${err.message}`);
      process.exit(2);
    })
  : null;
const remoteBase = remoteServer ? `http://127.0.0.1:${remoteServer.address().port}/` : null;
if (remoteBase) {
  const file = docsFile(page);
  const off = file ? embedSrcsOffRemote(fs.readFileSync(file, "utf8"), remoteBase, page) : [`${page} is not a file under docs/`];
  if (off.length) {
    console.error(`safari_check: --remote: ${page} has embeds whose PDF cannot move to the remote server: ${off.join(", ")}`);
    remoteServer.close();
    process.exit(2);
  }
}
const server = await startServer(remoteBase ? { transformHtml: (html) => pointPdfsAt(html, remoteBase, page) } : {});
const sdPort = await freePort();
const driver = spawn("safaridriver", ["-p", String(sdPort)], { stdio: "ignore" });
driver.on("error", (err) => {
  console.error(`safari_check: cannot start safaridriver: ${err.message}`);
  server.close();
  process.exit(2);
});
const base = `http://127.0.0.1:${sdPort}`;
async function wd(method, path, body) {
  const res = await fetch(base + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json();
  if (json.value && json.value.error) throw new Error(`${method} ${path}: ${json.value.error}: ${json.value.message}`);
  return json.value;
}
for (let k = 0; ; k++) {
  try {
    await fetch(base + "/status");
    break;
  } catch {
    if (k > 50) {
      console.error("safari_check: safaridriver did not start");
      driver.kill();
      server.close();
      process.exit(2);
    }
    await sleep(100);
  }
}

const failures = [];
let session = null;
let report = {};
let page2Tried = 0;
let page2Read = 0;
// set when the run cannot start a session or the page is a slide deck: exit 2
let setupError = null;
try {
  const caps = { browserName: "safari" };
  if (dev) {
    Object.assign(caps, { platformName: "iOS", "safari:useSimulator": true, "safari:deviceUDID": dev.udid });
    report.device = dev.name;
  }
  try {
    session = (await wd("POST", "/session", { capabilities: { alwaysMatch: caps } })).sessionId;
  } catch (err) {
    // no session (remote automation off, or no simulator host) is a setup failure
    setupError = err.message;
    throw err;
  }
  const s = `/session/${session}`;
  const run = (script, ...a) => wd("POST", `${s}/execute/sync`, { script, args: a });
  const find = async (css) => (await wd("POST", `${s}/elements`, { using: "css selector", value: css })).map((e) => Object.values(e)[0]);
  const label = (id) => wd("GET", `${s}/element/${id}/computedlabel`);
  await wd("POST", `${s}/url`, { url: `http://127.0.0.1:${server.address().port}/${page}` });
  // the check reads one page at a time and does not move between slides
  if (await run(`return !!document.querySelector(".reveal .slides");`)) {
    setupError = `${page} is a slide deck, which safari_check does not read`;
    throw new Error(setupError);
  }

  // wait at most 30 s for every embed to hydrate
  const unhydrated = () =>
    run(`return document.querySelectorAll("div.embedpdf:not(.embedpdf-pdfjs):not(.embedpdf-native):not(.embedpdf-failed)").length`);
  const start = Date.now();
  while ((await unhydrated()) && Date.now() - start < 30000) await sleep(250);
  if (await unhydrated()) failures.push("an embed is still not hydrated after 30 s");
  // --remote cors: no embed failed, each PDF.js embed's data-src and each
  // native <object>'s or <iframe>'s address is on the remote server, and that server
  // answered a GET with no Origin header (a CORS read sends one) for each
  // native embed's PDF
  if (remoteBase) {
    const where = await run(
      `return { failed: document.querySelectorAll(".embedpdf-failed").length,
                pdfjs: [...document.querySelectorAll(".embedpdf-pdfjs")].map((e) => new URL(e.dataset.src, document.baseURI).href),
                native: [...document.querySelectorAll(".embedpdf-native > object, .embedpdf-native > iframe")].map((o) => o.tagName === "IFRAME" ? o.src : o.data) };`
    );
    report.remote = where;
    if (where.failed) failures.push(`${where.failed} embeds show "This PDF cannot be shown here."`);
    for (const a of where.pdfjs) if (!a.startsWith(remoteBase)) failures.push(`PDF.js embed address ${a} is not on ${remoteBase}`);
    for (const a of where.native) {
      if (!a.startsWith(remoteBase)) failures.push(`native embed address ${a} is not on ${remoteBase}`);
      else if (!remoteServer.requests.some((r) => r.path === new URL(a).pathname && r.method === "GET" && r.origin === null)) {
        failures.push(`the remote server answered no request for ${new URL(a).pathname} without an Origin header, so the native viewer did not load it`);
      }
    }
  }
  if (plant) {
    report.planted = await run(
      `if (arguments[0] === "nativename" || arguments[0] === "nativetitle") {
         const object = document.querySelector(".embedpdf-native > object, .embedpdf-native > iframe");
         if (!object) return null;
         if (arguments[0] === "nativename") object.setAttribute("aria-label", "PDF: wrong.pdf");
         else object.setAttribute("title", object.getAttribute("aria-label") || "PDF");
         return arguments[0];
       }
       const first = document.querySelector(".embedpdf-pdfjs");
       if (!first) return null;
       if (arguments[0] === "rawindicator") {
         const shown = first.querySelector(".embedpdf-pageinfo [aria-hidden]");
         if (!shown) return null;
         shown.removeAttribute("aria-hidden");
       } else {
         const label = first.getAttribute("aria-label") || "";
         const bare = label.replace(/ \\(\\d+ of \\d+\\)$/, "");
         if (bare === label) return null;
         first.setAttribute("aria-label", bare);
       }
       return arguments[0];`,
      plant
    );
    if (!report.planted) {
      console.error(`safari_check: --plant ${plant} found nothing to plant in`);
      process.exitCode = 2;
    }
  }

  const want = expectedNames(flags["expect-name"].split("|"), named);
  // each embed's kind in document order, the order of the names
  const kinds = await run(
    `return [...document.querySelectorAll(".embedpdf-pdfjs, .embedpdf-native")].map((e) => e.classList.contains("embedpdf-native") ? "native" : "pdfjs");`
  );
  if (kinds.length !== want.length) failures.push(`${kinds.length} native and PDF.js embeds, --expect-name gives ${want.length} names`);
  const nativeAt = kinds.flatMap((k, j) => (k === "native" ? [j] : []));
  const pdfjsAt = kinds.flatMap((k, j) => (k === "pdfjs" ? [j] : []));
  if (nativeAt.length !== expectNative) failures.push(`${nativeAt.length} native embeds, not ${expectNative}`);
  // a native embed's <object> or <iframe> carries its name as aria-label,
  // with no title
  const objects = await find(".embedpdf-native > object, .embedpdf-native > iframe");
  if (objects.length !== nativeAt.length) failures.push(`${objects.length} native <object> or <iframe> elements for ${nativeAt.length} native embeds`);
  report.native = [];
  for (const [i, id] of objects.entries()) {
    const at = `native embed ${i + 1} (embed ${nativeAt[i] + 1})`;
    const r = { name: await label(id), title: await wd("GET", `${s}/element/${id}/attribute/title`) };
    report.native.push(r);
    if (r.name !== want[nativeAt[i]]) failures.push(`${at}: Safari's name is ${JSON.stringify(r.name)}, not ${JSON.stringify(want[nativeAt[i]])}`);
    if (r.title !== null) failures.push(`${at}: its element has a title, ${JSON.stringify(r.title)}`);
  }
  const embeds = await find(".embedpdf-pdfjs");
  // an embed that hydrated between these reads would take another's name
  if (embeds.length !== pdfjsAt.length) failures.push(`${embeds.length} PDF.js embeds now, ${pdfjsAt.length} when the names were matched`);
  report.embeds = [];
  for (const [i, id] of embeds.entries()) {
    const at = `PDF.js embed ${i + 1} (embed ${pdfjsAt[i] + 1})`;
    const r = { name: await label(id) };
    if (r.name !== want[pdfjsAt[i]]) failures.push(`${at}: Safari's name is ${JSON.stringify(r.name)}, not ${JSON.stringify(want[pdfjsAt[i]])}`);
    // the embed's own toolbar controls, by index among PDF.js embeds
    const mark = `safari-check-${i + 1}`;
    await run(`document.querySelectorAll(".embedpdf-pdfjs")[arguments[0]].setAttribute("data-safari-check", arguments[1]);`, i, mark);
    const own = await find(`[data-safari-check="${mark}"] .embedpdf-toolbar button, [data-safari-check="${mark}"] .embedpdf-toolbar a.embedpdf-download`);
    const toolbarOff = await run(`return document.querySelectorAll(".embedpdf-pdfjs")[arguments[0]].dataset.toolbar === "false";`, i);
    r.controls = [];
    if (!toolbarOff) {
      const titles = ["Zoom out", "Zoom in", "Download PDF"];
      if (own.length !== 3) failures.push(`${at}: ${own.length} toolbar controls, not 3`);
      for (const [j, cid] of own.entries()) {
        const name = await label(cid);
        const title = await wd("GET", `${s}/element/${cid}/attribute/title`);
        r.controls.push({ name, title });
        if (title !== titles[j]) failures.push(`${at}, control ${j + 1}: title ${JSON.stringify(title)}, not ${JSON.stringify(titles[j])}`);
        if (name !== title) failures.push(`${at}, control ${j + 1}: Safari's name ${JSON.stringify(name)} is not its title ${JSON.stringify(title)}`);
      }
      // the page indicator, at the top of the pages and at page 2
      const pages = await run(`return document.querySelectorAll(".embedpdf-pdfjs")[arguments[0]].querySelectorAll(".embedpdf-page").length;`, i);
      // returns whether page 1 is above the frame's middle line (the line the
      // viewer's indicator reads) after the scroll, and the indicator's text
      const toPage = async (k) => {
        const moved = await run(
          `const p = document.querySelectorAll(".embedpdf-pdfjs")[arguments[0]].querySelector(".embedpdf-pages");
           const t = p.querySelectorAll(".embedpdf-page")[arguments[1] - 1];
           p.scrollTop += t.getBoundingClientRect().top - p.getBoundingClientRect().top;
           p.dispatchEvent(new Event("scroll"));
           const host = p.getBoundingClientRect();
           return p.querySelector(".embedpdf-page").getBoundingClientRect().bottom <= host.top + host.height / 2;`,
          i,
          k
        );
        // Get Computed Label gives a plain span no name, so the indicator
        // briefly takes role heading, whose name Safari computes from its
        // content: the text Safari would read there, without aria-hidden parts
        const role = (on) =>
          run(
            `const info = document.querySelectorAll(".embedpdf-pdfjs")[arguments[0]].querySelector(".embedpdf-pageinfo");
             if (arguments[1]) info.setAttribute("role", "heading"); else info.removeAttribute("role");`,
            i,
            on
          );
        await role(true);
        try {
          await sleep(300);
          const [info] = await find(`[data-safari-check="${mark}"] .embedpdf-pageinfo`);
          return { moved, text: info ? await label(info) : null };
        } finally {
          await role(false);
        }
      };
      const top = await toPage(1);
      r.indicator = [top.text];
      if (top.text !== `Page 1 of ${pages}`) failures.push(`${at}: Safari reads the indicator as ${JSON.stringify(top.text)}, not "Page 1 of ${pages}"`);
      if (pages >= 2) {
        // only where page 1 can scroll above the middle line does the
        // viewer's indicator move to page 2
        page2Tried++;
        const second = await toPage(2);
        r.indicator.push(second.moved ? second.text : "(page 1 cannot scroll past the middle line; not read)");
        if (second.moved) page2Read++;
        if (second.moved && second.text !== `Page 2 of ${pages}`) failures.push(`${at}: after a scroll to page 2, Safari reads the indicator as ${JSON.stringify(second.text)}, not "Page 2 of ${pages}"`);
      }
    }
    report.embeds.push(r);
  }
  // a toolbar embed of 2 or more pages must be read at page 2
  if (page2Tried && !page2Read) failures.push(`none of the ${page2Tried} embeds of 2 or more pages could scroll page 1 above the middle of its frame, so no indicator was read at page 2`);
} catch (err) {
  failures.push(err.message);
} finally {
  if (session) await wd("DELETE", `/session/${session}`).catch(() => {});
  server.close();
  remoteServer?.close();
  driver.kill();
}
console.log(JSON.stringify({ target, page, ...report, failures }, null, 2));
for (const f of failures) console.error("safari_check: " + f);
process.exit(process.exitCode === 2 || setupError ? 2 : failures.length ? 1 : 0);
