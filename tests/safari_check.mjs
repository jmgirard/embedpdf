// Safari's accessible names for PDF.js embeds and their toolbars.
//
// Usage:
//   node tests/safari_check.mjs --target mac [--page example.html]
//        --expect-pdfjs <n> --expect-name "<file name>" | "<name 1>|<name 2>|..."
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
// Each run fails unless every PDF.js embed's name is its --expect-name name
// (numbered as in tests/expect_names.mjs), each toolbar control's name is its
// title, which must be "Zoom out", "Zoom in", or "Download PDF" in that
// order, and each toolbar's page indicator reads "Page 1 of <pages>" with the
// pages at the top and "Page 2 of <pages>" after they scroll to page 2.
//
// --target page-script opens a probe page in Safari in the iOS simulator with
// `xcrun simctl openurl` and reports whether a page script can read a
// computed name (Element.prototype.computedName). It fails when it cannot.
//
// Exits 0 on a pass, 1 on a failed check or a probe that cannot read names,
// 2 on a bad argument or when safaridriver or the server cannot start.

import { spawn, execFileSync } from "node:child_process";
import net from "node:net";
import { serveDocs } from "./serve_docs.mjs";
import { expectedNames } from "./expect_names.mjs";

const args = process.argv.slice(2);
const flags = {};
for (let i = 0; i < args.length; i += 2) {
  const k = args[i];
  if (!/^--(target|page|device|expect-pdfjs|expect-name)$/.test(k) || args[i + 1] === undefined) {
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
if (target !== "page-script" && !(flags["expect-name"] && /^\d+$/.test(flags["expect-pdfjs"] || ""))) {
  console.error("safari_check: --expect-name and --expect-pdfjs are required");
  process.exit(2);
}
const page = flags.page || "example.html";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const simctl = (...a) => execFileSync("xcrun", ["simctl", ...a], { encoding: "utf8" });

function simulator(key) {
  const list = JSON.parse(simctl("list", "devices", "available", "-j")).devices;
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
  const server = await serveDocs({
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
  simctl("bootstatus", dev.udid, "-b");
  simctl("openurl", dev.udid, `http://127.0.0.1:${server.address().port}/__safari_probe.html?t=${Date.now()}`);
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
const sdPort = await freePort();
const driver = spawn("safaridriver", ["-p", String(sdPort)], { stdio: "ignore" });
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
      process.exit(2);
    }
    await sleep(100);
  }
}

const server = await serveDocs();
const failures = [];
let session = null;
let report = {};
try {
  const caps = { browserName: "safari" };
  if (target === "simulator") {
    const dev = simulator(flags.device);
    Object.assign(caps, { platformName: "iOS", "safari:useSimulator": true, "safari:deviceUDID": dev.udid });
    report.device = dev.name;
  }
  session = (await wd("POST", "/session", { capabilities: { alwaysMatch: caps } })).sessionId;
  const s = `/session/${session}`;
  const run = (script, ...a) => wd("POST", `${s}/execute/sync`, { script, args: a });
  const find = async (css) => (await wd("POST", `${s}/elements`, { using: "css selector", value: css })).map((e) => Object.values(e)[0]);
  const label = (id) => wd("GET", `${s}/element/${id}/computedlabel`);
  await wd("POST", `${s}/url`, { url: `http://127.0.0.1:${server.address().port}/${page}` });

  // wait at most 30 s for every embed to hydrate
  const unhydrated = () =>
    run(`return document.querySelectorAll("div.embedpdf:not(.embedpdf-pdfjs):not(.embedpdf-native):not(.embedpdf-failed)").length`);
  const start = Date.now();
  while ((await unhydrated()) && Date.now() - start < 30000) await sleep(250);
  if (await unhydrated()) failures.push("an embed is still not hydrated after 30 s");

  const embeds = await find(".embedpdf-pdfjs");
  const want = expectedNames(flags["expect-name"].split("|"), Number(flags["expect-pdfjs"]));
  if (embeds.length !== want.length) failures.push(`${embeds.length} PDF.js embeds, --expect-name gives ${want.length} names`);
  report.embeds = [];
  for (const [i, id] of embeds.entries()) {
    const at = `PDF.js embed ${i + 1}`;
    const r = { name: await label(id) };
    if (r.name !== want[i]) failures.push(`${at}: Safari's name is ${JSON.stringify(r.name)}, not ${JSON.stringify(want[i])}`);
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
      const toPage = async (k) => {
        await run(
          `const p = document.querySelectorAll(".embedpdf-pdfjs")[arguments[0]].querySelector(".embedpdf-pages");
           const t = p.querySelectorAll(".embedpdf-page")[arguments[1] - 1];
           p.scrollTop += t.getBoundingClientRect().top - p.getBoundingClientRect().top;
           p.dispatchEvent(new Event("scroll"));`,
          i,
          k
        );
        await sleep(300);
        const [spoken] = await find(`[data-safari-check="${mark}"] .embedpdf-pageinfo-text`);
        return spoken ? label(spoken) : null;
      };
      r.indicator = [await toPage(1)];
      if (r.indicator[0] !== `Page 1 of ${pages}`) failures.push(`${at}: Safari reads the indicator as ${JSON.stringify(r.indicator[0])}, not "Page 1 of ${pages}"`);
      if (pages >= 2) {
        r.indicator.push(await toPage(2));
        if (r.indicator[1] !== `Page 2 of ${pages}`) failures.push(`${at}: after a scroll to page 2, Safari reads the indicator as ${JSON.stringify(r.indicator[1])}, not "Page 2 of ${pages}"`);
      }
    }
    report.embeds.push(r);
  }
} catch (err) {
  failures.push(err.message);
} finally {
  if (session) await wd("DELETE", `/session/${session}`).catch(() => {});
  server.close();
  driver.kill();
}
console.log(JSON.stringify({ target, page, ...report, failures }, null, 2));
for (const f of failures) console.error("safari_check: " + f);
process.exit(failures.length ? 1 : 0);
