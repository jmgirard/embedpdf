// Which element does the viewer give a native embed with a page option, by
// the answer of the PDF's server?
//
// Usage:
//   node tests/frame_rule_check.mjs --browser chromium|firefox|safari
//        [--slow-head] [--plant noorigin|nook|noredirect|notimeout|anydisp|get|casesens|swap]
//
// A native embed whose page option is over 1 is an <iframe> only when the PDF
// is inlined, or comes from the page's own origin and a HEAD request for it
// answers OK within 5 s, from that origin, with media type application/pdf and
// a disposition type other than attachment, both compared without case or
// parameters; otherwise it is an <object> (embedpdf-viewer.js, frameAllowed;
// D-008).
// This check serves docs/page_test.html with its embeds replaced by the twelve
// below, all with renderer=native, each at its own address, and the
// extension's viewer from docs/. A second and a third server, on other ports,
// are other origins. Embed k gets the answer and must get the element:
//   1 /__fr/plain.pdf        application/pdf                         <iframe>
//   2 /__fr/upper            Application/PDF; charset=binary         <iframe>
//   3 /__fr/inline.pdf       application/pdf, Content-Disposition:
//                            inline; filename="sample.pdf"           <iframe>
//   4 /__fr/octet.pdf        application/octet-stream                <object>
//   5 /__fr/attach.pdf       application/pdf, Content-Disposition:
//                            Attachment; filename="sample.pdf"       <object>
//   6 /__fr/head405.pdf      HTTP 405 (Content-Type application/pdf)
//                            to HEAD, application/pdf to GET         <object>
//   7 <second origin>/__fr/remote.pdf  application/pdf with
//                            Access-Control-Allow-Origin: *          <object>
//   8 /__fr/missing.pdf      HTTP 404                                <object>
//   9 /__fr/page1.pdf        application/pdf, no page option         <object>
//  10 /__fr/late.pdf         application/pdf, HEAD answered after 7 s <object>
//  11 /__fr/notype.pdf       HTTP 200 with no Content-Type           <object>
//  12 /__fr/redirect.pdf     HTTP 302 to <third origin>/__fr/far.pdf,
//                            application/pdf, Content-Disposition:
//                            attachment, Access-Control-Allow-Origin: * <object>
// All but embed 9 have page=2. The run fails unless each embed is hydrated as
// a native embed with that element, each address but embed 9's ends in
// #page=2 (an <iframe>'s src, an <object>'s data) and embed 9's has no
// fragment, the page's server got at least one HEAD request for each embed on
// it but embed 9 and none for embed 9, and the second server got no HEAD
// request.
//
// --slow-head delays every HEAD answer by 3 s, under the viewer's 5 s limit;
// the run must still pass. --plant changes the served viewer, or (swap) the
// server, and the run must then fail:
//   noorigin  frameAllowed skips its origin check
//   nook      frameAllowed ignores the answer's status
//   noredirect  frameAllowed ignores a redirect to another origin
//   notimeout frameAllowed waits for an answer with no time limit
//   anydisp   frameAllowed takes any Content-Disposition as an attachment
//   get       frameAllowed sends GET, not HEAD
//   casesens  frameAllowed compares without lowering case
//   swap      the server swaps the answers of embeds 1 and 4
// --browser chromium and firefox run headless through puppeteer-core
// (CHROME_PATH, FIREFOX_PATH as in tests/native_check.mjs); safari drives
// desktop Safari through safaridriver.
//
// Exits 0 on a pass, 1 on a failed check, 2 on a bad argument, when a plant
// does not apply to the viewer's code, when docs/page_test.html has no viewer
// script or not 3 embeds, or when puppeteer-core, the browser, safaridriver,
// or a server cannot start; 130 on Ctrl-C or a kill.

import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import { spawn } from "node:child_process";
import { serveDocs, DOCS } from "./serve_docs.mjs";

const WD_MS = 60000;
const PLANTS = {
  noorigin: [['if (own === "null" || url.origin !== own) return false;', ""]],
  nook: [["if (!res.ok || new URL(res.url).origin !== own) return false;", "if (new URL(res.url).origin !== own) return false;"]],
  noredirect: [["if (!res.ok || new URL(res.url).origin !== own) return false;", "if (!res.ok) return false;"]],
  notimeout: [[', signal: AbortSignal.timeout(5000)', ""]],
  anydisp: [['disposition !== "attachment"', "!disposition"]],
  get: [['method: "HEAD"', 'method: "GET"']],
  casesens: [
    ['(res.headers.get("Content-Type") || "").split(";")[0].trim().toLowerCase()', '(res.headers.get("Content-Type") || "").split(";")[0].trim()'],
    ['(res.headers.get("Content-Disposition") || "").split(";")[0].trim().toLowerCase()', '(res.headers.get("Content-Disposition") || "").split(";")[0].trim()'],
  ],
  swap: [],
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function bad(msg) {
  console.error(`frame_rule_check: ${msg}`);
  process.exit(2);
}

// --- arguments ---------------------------------------------------------------
const args = process.argv.slice(2);
const flags = {};
for (let i = 0; i < args.length; i++) {
  const k = args[i];
  if (k === "--slow-head") {
    flags["slow-head"] = true;
    continue;
  }
  if (!/^--(browser|plant)$/.test(k) || args[i + 1] === undefined) bad(`bad argument ${k}`);
  flags[k.slice(2)] = args[++i];
}
const browserName = flags.browser;
if (!["chromium", "firefox", "safari"].includes(browserName)) bad("--browser must be chromium, firefox, or safari");
const plant = flags.plant ?? null;
if (plant && !(plant in PLANTS)) bad(`--plant must be one of ${Object.keys(PLANTS).join(", ")}`);
const slowHead = !!flags["slow-head"];

// --- the page and its servers --------------------------------------------------
const pageHtml = fs.readFileSync(path.join(DOCS, "page_test.html"), "utf8");
const viewerMatch = /src="(page_test_files\/libs\/quarto-contrib\/embedpdf-[^/"]+\/embedpdf-viewer\.js)"/.exec(pageHtml);
if (!viewerMatch) bad("docs/page_test.html has no embedpdf-viewer.js script (run quarto render)");
const viewerPath = "/" + viewerMatch[1];
let viewerJs = fs.readFileSync(path.join(DOCS, viewerMatch[1]), "utf8");
for (const [from, to] of PLANTS[plant] || []) {
  if (!viewerJs.includes(from)) bad(`--plant ${plant}: the viewer has no ${JSON.stringify(from)}`);
  viewerJs = viewerJs.split(from).join(to);
}
const pdf = fs.readFileSync(path.join(DOCS, "sample.pdf"));

// each answer: status and headers for HEAD and for GET (a GET always sends the PDF)
const ANSWERS = {
  plain: { headers: { "Content-Type": "application/pdf" } },
  upper: { headers: { "Content-Type": "Application/PDF; charset=binary" } },
  inline: { headers: { "Content-Type": "application/pdf", "Content-Disposition": 'inline; filename="sample.pdf"' } },
  octet: { headers: { "Content-Type": "application/octet-stream" } },
  attach: { headers: { "Content-Type": "application/pdf", "Content-Disposition": 'Attachment; filename="sample.pdf"' } },
  head405: { headStatus: 405, headers: { "Content-Type": "application/pdf" } },
  missing: { status: 404, headers: { "Content-Type": "text/plain" } },
  page1: { headers: { "Content-Type": "application/pdf" } },
  late: { headDelay: 7000, headers: { "Content-Type": "application/pdf" } },
  notype: { headers: {} },
  redirect: { status: 302, headers: {} }, // Location set once the third server runs
};
if (plant === "swap") [ANSWERS.plain, ANSWERS.octet] = [ANSWERS.octet, ANSWERS.plain];

function answer(req, res, a, extra = {}) {
  const head = req.method === "HEAD";
  const status = (head && a.headStatus) || a.status || 200;
  const body = status === 200 ? pdf : Buffer.from(status === 302 ? "" : "not here");
  const send = () => {
    res.writeHead(status, { "Cache-Control": "no-store", "Content-Length": body.length, ...a.headers, ...extra });
    res.end(head ? undefined : body);
  };
  const delay = head ? Math.max(a.headDelay || 0, slowHead ? 3000 : 0) : 0;
  if (delay) setTimeout(send, delay);
  else send();
}

const embeds = [
  { k: 1, addr: "__fr/plain.pdf", page: 2, want: "iframe" },
  { k: 2, addr: "__fr/upper", page: 2, want: "iframe" },
  { k: 3, addr: "__fr/inline.pdf", page: 2, want: "iframe" },
  { k: 4, addr: "__fr/octet.pdf", page: 2, want: "object" },
  { k: 5, addr: "__fr/attach.pdf", page: 2, want: "object" },
  { k: 6, addr: "__fr/head405.pdf", page: 2, want: "object" },
  { k: 7, addr: null, page: 2, want: "object", remote: true },
  { k: 8, addr: "__fr/missing.pdf", page: 2, want: "object" },
  { k: 9, addr: "__fr/page1.pdf", page: 1, want: "object" },
  { k: 10, addr: "__fr/late.pdf", page: 2, want: "object" },
  { k: 11, addr: "__fr/notype.pdf", page: 2, want: "object" },
  { k: 12, addr: "__fr/redirect.pdf", page: 2, want: "object" },
];

const pageLog = [];
const remoteLog = [];
const frRoutes = (log, extra) =>
  Object.fromEntries(
    Object.keys(ANSWERS).map((name) => [
      `/__fr/${name === "upper" ? "upper" : name + ".pdf"}`,
      (req, res) => {
        log.push({ method: req.method, path: new URL(req.url, "http://x").pathname });
        answer(req, res, ANSWERS[name], extra);
      },
    ])
  );
const remote = await serveDocs({
  routes: {
    "/__fr/remote.pdf": (req, res) => {
      remoteLog.push({ method: req.method, path: "/__fr/remote.pdf" });
      answer(req, res, { headers: { "Content-Type": "application/pdf" } }, { "Access-Control-Allow-Origin": "*" });
    },
  },
}).catch((err) => bad(`cannot start the second server: ${err.message}`));
const remoteBase = `http://127.0.0.1:${remote.address().port}/`;
embeds[6].addr = remoteBase + "__fr/remote.pdf";
// the redirect's target: an attachment that a CORS read cannot see as one
const far = await serveDocs({
  routes: {
    "/__fr/far.pdf": (req, res) =>
      answer(req, res, { headers: { "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="sample.pdf"' } }, { "Access-Control-Allow-Origin": "*" }),
  },
}).catch((err) => bad(`cannot start the third server: ${err.message}`));
ANSWERS.redirect.headers.Location = `http://127.0.0.1:${far.address().port}/__fr/far.pdf`;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const placeholders = embeds
  .map(
    (e) =>
      `<h2>Embed ${e.k}</h2>\n<div class="embedpdf" data-src="${esc(e.addr)}" data-renderer="native" data-width="400" data-height="300"` +
      (e.page > 1 ? ` data-page="${e.page}"` : "") +
      `><a href="${esc(e.addr)}" download="">Download PDF file.</a></div>`
  )
  .join("\n");
// page_test.html's own embeds, each a <div class="embedpdf" ...>...</div> with
// one child link, give way to the nine above
const own = pageHtml.match(/<div class="embedpdf"[^>]*>.*?<\/div>/gs) || [];
if (own.length !== 3) bad(`docs/page_test.html has ${own.length} embeds, not 3`);
let html = pageHtml.replace(own[0], placeholders);
for (const o of own.slice(1)) html = html.replace(o, "");

const page = await serveDocs({
  routes: {
    "/frame_rule.html": (req, res) => {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      res.end(html);
    },
    [viewerPath]: (req, res) => {
      res.writeHead(200, { "Content-Type": "text/javascript", "Cache-Control": "no-store" });
      res.end(viewerJs);
    },
    ...frRoutes(pageLog, {}),
  },
}).catch((err) => bad(`cannot start the server: ${err.message}`));
const pageUrl = `http://127.0.0.1:${page.address().port}/frame_rule.html`;
const closeServers = () => {
  page.close();
  remote.close();
  far.close();
};

// --- browser drivers ---------------------------------------------------------
// Each driver gives: open(url), run(fnSource) -> value, close().
async function puppeteerDriver(kind) {
  let puppeteer;
  try {
    ({ default: puppeteer } = await import("puppeteer-core"));
  } catch (err) {
    bad(`cannot load puppeteer-core (npm install puppeteer-core): ${err.message.split("\n")[0]}`);
  }
  const opts =
    kind === "firefox"
      ? { browser: "firefox", executablePath: process.env.FIREFOX_PATH || "/Applications/Firefox.app/Contents/MacOS/firefox", headless: true }
      : { executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new" };
  let browser;
  try {
    browser = await puppeteer.launch(opts);
  } catch (err) {
    const hint = /profile folder/.test(err.message) ? " (launch it once through macOS open, as tests/native_check.mjs's header says)" : "";
    bad(`cannot start ${kind}${hint}: ${err.message.split("\n")[0]}`);
  }
  let tab, version;
  try {
    tab = await browser.newPage();
    version = await browser.version();
  } catch (err) {
    await browser.close().catch(() => {});
    bad(`cannot start ${kind}: ${err.message.split("\n")[0]}`);
  }
  return {
    version,
    open: (url) => tab.goto(url, { waitUntil: "load" }),
    run: (fnSource) => tab.evaluate(`(${fnSource})()`),
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
  let value;
  try {
    value = await wd("POST", "/session", { capabilities: { alwaysMatch: { browserName: "safari" } } });
  } catch (err) {
    driver.kill();
    bad(`no safaridriver session: ${err.message}`);
  }
  const s = `/session/${value.sessionId}`;
  return {
    version: `Safari ${value.capabilities?.browserVersion ?? "?"}`,
    open: (url) => wd("POST", `${s}/url`, { url }),
    run: (fnSource) => wd("POST", `${s}/execute/sync`, { script: `return (${fnSource})()`, args: [] }),
    async close() {
      await wd("DELETE", s).catch(() => {});
      driver.kill();
    },
  };
}

// --- the run -----------------------------------------------------------------
const failures = [];
const report = { browser: browserName, plant, slowHead, embeds: [] };
const drv = browserName === "safari" ? await safariDriver() : await puppeteerDriver(browserName);
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    drv.close().catch(() => {}).finally(() => {
      closeServers();
      process.exit(130);
    });
  });
}
report.version = drv.version;
try {
  await drv.open(pageUrl);
  // each placeholder's state; hydrated once it is native, PDF.js, or failed
  const read = () =>
    drv.run(`() => [...document.querySelectorAll("div.embedpdf")].map((d) => {
      const e = d.querySelector(":scope > object, :scope > iframe");
      return {
        cls: d.classList.contains("embedpdf-native") ? "native" : d.classList.contains("embedpdf-pdfjs") ? "pdfjs" : d.classList.contains("embedpdf-failed") ? "failed" : "",
        tag: e ? e.tagName.toLowerCase() : "",
        address: e ? (e.tagName === "IFRAME" ? e.src : e.data) : "",
      };
    })`);
  // the viewer waits up to 5 s for each HEAD answer; wait at most 30 s
  let st = await read();
  for (let t = 0; st.some((s) => !s.cls) && t < 120; t++) {
    await sleep(250);
    st = await read();
  }
  if (st.length !== embeds.length) failures.push(`the page has ${st.length} embeds, not ${embeds.length}`);
  embeds.forEach((e, i) => {
    const s = st[i] || {};
    const at = `embed ${e.k} (${e.remote ? "second origin" : e.addr})`;
    report.embeds.push({ k: e.k, address: s.address, cls: s.cls, tag: s.tag, want: e.want });
    if (s.cls !== "native") {
      failures.push(`${at}: not hydrated as a native embed (${s.cls || "not hydrated after 30 s"})`);
      return;
    }
    if (s.tag !== e.want) failures.push(`${at}: it is <${s.tag}>, not <${e.want}>`);
    const frag = s.address.includes("#") ? s.address.slice(s.address.indexOf("#")) : "";
    const wantFrag = e.page > 1 ? `#page=${e.page}` : "";
    if (frag !== wantFrag) failures.push(`${at}: its address's fragment is "${frag}", not "${wantFrag}"`);
  });
  // the HEAD requests each server got
  const heads = (log, p) => log.filter((r) => r.method === "HEAD" && r.path === p).length;
  report.pageHeads = Object.fromEntries(embeds.filter((e) => !e.remote).map((e) => [e.addr, heads(pageLog, "/" + e.addr)]));
  report.remoteHeads = remoteLog.filter((r) => r.method === "HEAD").length;
  for (const e of embeds.filter((x) => !x.remote)) {
    const n = report.pageHeads[e.addr];
    if (e.page > 1 && n < 1) failures.push(`embed ${e.k} (${e.addr}): the page's server got no HEAD request for it`);
    if (e.page === 1 && n > 0) failures.push(`embed ${e.k} (${e.addr}): the page's server got ${n} HEAD request(s) for a page-1 embed`);
  }
  if (report.remoteHeads > 0) failures.push(`the second server got ${report.remoteHeads} HEAD request(s)`);
} catch (err) {
  failures.push(`error: ${err.message}`);
} finally {
  await drv.close().catch(() => {});
  closeServers();
}
report.failures = failures;
console.log(JSON.stringify(report, null, 2));
if (failures.length) {
  console.error(`frame_rule_check: FAIL\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log("frame_rule_check: PASS");
process.exit(0);
