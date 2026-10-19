// End-to-end check of embedpdf in Safari on an iOS simulator.
//
// Serves docs/ (tests/serve_docs.mjs), or with --alone yes a temporary
// directory that holds only a copy of the page. It injects a probe script into
// every HTML response, opens the page in the simulator's Safari with `simctl openurl`, and
// waits for the probe to POST a per-embed report: which renderer each embed
// used, how many .embedpdf-page containers it has, and whether each page's
// canvas has ink. No dependencies beyond Node and Xcode's simctl.
//
// Setup (once): install Xcode, run its first-launch setup, download the iOS
// platform (xcodebuild -downloadPlatform iOS), and create a simulator, e.g.
//   xcrun simctl create "embedpdf iPhone" "iPhone 17"
//
// Usage:  node tests/ios_check.mjs --device "embedpdf iPhone" [options]
//   --device <name|udid>   simulator to use (required); booted if needed
//   --page <path>          page under docs/ to open (default example.html)
//   --expect-embeds <n>    embeds not set to renderer=native (default 10)
//   --expect-pages <n>     pages per PDF.js embed (default 2: sample.pdf)
//   --port <n>             server port on 127.0.0.1 (default 8766)
//   --timeout <s>          seconds to wait for the report (default 180)
//   --screenshot <file>    save a simulator screenshot, taken with the first
//                          renderer=native embed scrolled into view
//   --shot-embed <n>       scroll embed n (1-based) into view for the screenshot
//   --plant blank|missing  plant a defect before measuring (blank the last
//                          page canvas of the first PDF.js embed, or remove
//                          that page's container); the check must then fail
//   --alone yes|no         yes: serve a copy of the page from an empty
//                          temporary directory instead of docs/ (default no)
//   --remote blocked       serve the PDFs from a second server on another port
//                          (another origin) that sends no
//                          Access-Control-Allow-Origin header, and point each
//                          embed's data-src and links at it
//
// Exits 0 only when every embed not set to renderer=native used PDF.js, has
// exactly --expect-pages page containers, and every page canvas has ink, and
// the number of such embeds equals --expect-embeds. With --remote blocked,
// each such embed must instead show the load-failure state: the text "This
// PDF cannot be shown here.", an "Open the PDF" link to the same absolute URL
// as data-src with target _blank, and no "Download PDF file." link; its
// data-src must be on the remote server, and the console must show the fetch
// of that URL failing ("Load failed").

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { serveDocs, serveRemote, pointPdfsAt, DOCS } from "./serve_docs.mjs";

const args = process.argv.slice(2);
const FLAGS = ["device", "page", "expect-embeds", "expect-pages", "port", "timeout", "screenshot", "shot-embed", "plant", "alone", "remote"];
for (let i = 0; i < args.length; i += 2) {
  if (!FLAGS.includes(args[i].replace(/^--/, "")) || !args[i].startsWith("--") || i + 1 >= args.length) {
    console.error(`ios_check: unexpected argument "${args[i]}" (flags: --${FLAGS.join(", --")}, each with a value)`);
    process.exit(2);
  }
}
const opt = (name, fallback) => {
  const i = args.indexOf("--" + name);
  return i >= 0 ? args[i + 1] : fallback;
};
const device = opt("device", "");
const pagePath = opt("page", "example.html");
const expectEmbeds = Number(opt("expect-embeds", "10"));
const expectPages = Number(opt("expect-pages", "2"));
const port = Number(opt("port", "8766"));
const timeoutS = Number(opt("timeout", "180"));
const screenshot = opt("screenshot", "");
const plant = opt("plant", "");
const shotEmbed = opt("shot-embed", "");
const alone = opt("alone", "no");
if (alone !== "yes" && alone !== "no") {
  console.error("ios_check: --alone must be yes or no");
  process.exit(2);
}
const remote = opt("remote", "");
// no cors mode: on example.html the renderer=native embed loads the same URL,
// and Safari then fails the PDF.js fetch of it even with the header
if (remote && remote !== "blocked") {
  console.error("ios_check: --remote must be blocked");
  process.exit(2);
}
if (remote && (alone === "yes" || plant)) {
  console.error("ios_check: --remote cannot be combined with --alone yes or --plant");
  process.exit(2);
}
if (!device) {
  console.error("ios_check: --device <simulator name or udid> is required");
  process.exit(2);
}
if (plant && plant !== "blank" && plant !== "missing") {
  console.error("ios_check: --plant must be blank or missing");
  process.exit(2);
}

const simctl = (...a) => execFileSync("xcrun", ["simctl", ...a], { encoding: "utf8" });

// resolve the simulator and record its model and runtime with the evidence
function findDevices(key) {
  const list = JSON.parse(simctl("list", "devices", "available", "-j")).devices;
  const found = [];
  for (const [runtime, devs] of Object.entries(list)) {
    for (const d of devs) {
      if (d.udid === key || d.name === key) found.push({ ...d, runtime });
    }
  }
  return found;
}
const matches = findDevices(device);
if (matches.length !== 1) {
  console.error(
    matches.length
      ? `ios_check: ${matches.length} simulators are named "${device}"; pass a udid (${matches.map((d) => d.udid).join(", ")})`
      : `ios_check: no available simulator named or with udid "${device}"`
  );
  process.exit(2);
}
const dev = matches[0];
const runtimeName = dev.runtime.replace("com.apple.CoreSimulator.SimRuntime.", "");
const deviceType = (dev.deviceTypeIdentifier || "").replace("com.apple.CoreSimulator.SimDeviceType.", "");

// The probe runs in Safari. It waits for every embed to hydrate, scrolls each
// one (and each of its pages) into view so lazy rendering fires, waits for the
// canvases, optionally plants a defect, measures, and POSTs the report.
const PROBE = `<script>
(async () => {
  const errors = [];
  window.addEventListener("error", (e) => errors.push(String(e.message)));
  window.addEventListener("unhandledrejection", (e) => errors.push(String(e.reason)));
  const origError = console.error;
  console.error = (...a) => { errors.push(a.map(String).join(" ")); origError.apply(console, a); };
  const params = new URLSearchParams(location.search);
  const plant = params.get("plant") || "";
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const embeds = () => [...document.querySelectorAll("div.embedpdf")];
  const kind = (el) =>
    el.classList.contains("embedpdf-pdfjs") ? "pdfjs" :
    el.classList.contains("embedpdf-native") ? "native" :
    el.classList.contains("embedpdf-failed") ? "failed" : "none";
  const settled = () => embeds().every((el) => {
    if (kind(el) === "native" || kind(el) === "failed") return true;
    if (kind(el) === "none") return false;
    const pages = [...el.querySelectorAll(".embedpdf-page")];
    return pages.length > 0 && pages.every((p) => p.querySelector("canvas"));
  });
  const scrollAll = async () => {
    for (const el of embeds()) {
      el.scrollIntoView({ block: "center" });
      await sleep(300);
      for (const p of el.querySelectorAll(".embedpdf-page")) {
        p.scrollIntoView({ block: "nearest" });
        await sleep(400);
      }
    }
  };
  const t0 = Date.now();
  while (Date.now() - t0 < 90000) {
    await scrollAll();
    if (settled()) break;
    await sleep(1000);
  }
  await sleep(1000);

  if (plant) {
    const first = embeds().find((el) => kind(el) === "pdfjs");
    const pages = first ? first.querySelectorAll(".embedpdf-page") : [];
    const last = pages[pages.length - 1];
    if (last && plant === "missing") last.remove();
    const canvas = last && last.querySelector("canvas");
    if (canvas && plant === "blank") {
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  const hasInk = (c) => {
    try {
      const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
      for (let i = 0; i < d.length; i += 400) if (d[i] < 128 && d[i + 3] > 0) return true;
    } catch (e) { errors.push("ink: " + e); }
    return false;
  };
  const report = {
    run: params.get("run") || "",
    userAgent: navigator.userAgent,
    pdfViewerEnabled: navigator.pdfViewerEnabled,
    maxTouchPoints: navigator.maxTouchPoints,
    viewer: [...document.scripts].map((s) => s.src).find((s) => /embedpdf-viewer\\.js/.test(s)) || "",
    plant,
    embeds: embeds().map((el, i) => {
      const pages = [...el.querySelectorAll(".embedpdf-page")];
      // the load-failure state, read from the text and links, not the class
      const links = [...el.querySelectorAll("a")];
      const open = links.find((a) => a.textContent.trim() === "Open the PDF");
      const failure = {
        text: el.textContent.includes("This PDF cannot be shown here."),
        href: open ? open.href : null,
        expected: new URL(el.dataset.src || "", document.baseURI).href,
        target: open ? open.target : null,
        downloadLink: links.some((a) => a.textContent.trim() === "Download PDF file."),
      };
      failure.ok = failure.text && failure.href === failure.expected && failure.target === "_blank" && !failure.downloadLink;
      return {
        index: i + 1,
        requested: el.dataset.renderer || "auto",
        renderer: kind(el),
        pages: pages.length,
        ink: pages.map((p) => { const c = p.querySelector("canvas"); return !!c && hasInk(c); }),
        failure,
      };
    }),
    errors,
  };

  const shotIndex = Number(params.get("shot") || 0);
  const shot = shotIndex ? embeds()[shotIndex - 1] : embeds().find((el) => el.dataset.renderer === "native");
  if (shot) { shot.scrollIntoView({ block: "center" }); await sleep(2000); }
  await fetch("/__report", { method: "POST", body: JSON.stringify(report) });
})();
</script>`;

let onReport;
const reported = new Promise((r) => (onReport = r));
// Each run has its own token; a report from a tab left over from an earlier
// run (restored or reloaded by Safari) carries another token and is ignored.
const runId = String(Date.now());

// --alone yes: serve a directory that holds only the page, so nothing it
// fetches by a relative URL can be found
let aloneDir = null;
let servedPath = pagePath;
if (alone === "yes") {
  const source = path.resolve(DOCS, pagePath);
  if (!source.startsWith(DOCS + path.sep) || !fs.existsSync(source)) {
    console.error(`ios_check: --alone needs a page under docs/, got ${pagePath}`);
    process.exit(2);
  }
  aloneDir = fs.mkdtempSync(path.join(os.tmpdir(), "embedpdf-alone-"));
  // removed on every exit, a failed server start included
  process.on("exit", () => fs.rmSync(aloneDir, { recursive: true, force: true }));
  servedPath = path.basename(pagePath);
  fs.copyFileSync(source, path.join(aloneDir, servedPath));
}

const remoteServer = remote ? await serveRemote(remote) : null;
const remoteBase = remoteServer ? `http://127.0.0.1:${remoteServer.address().port}/` : null;

const server = await serveDocs({
  port,
  ...(aloneDir ? { root: aloneDir } : {}),
  // before the last </body>: a self-contained page can hold the text "</body>"
  // inside an inlined script
  transformHtml: (html) => {
    if (remoteBase) html = pointPdfsAt(html, remoteBase);
    const i = html.lastIndexOf("</body>");
    return i < 0 ? html + PROBE : html.slice(0, i) + PROBE + html.slice(i);
  },
  routes: {
    "/__report": (req, res) => {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        res.end("ok");
        let report = null;
        try { report = JSON.parse(body); } catch { return; }
        if (report.run === runId) onReport(report);
      });
    },
  },
});

let exitCode = 1;
try {
  simctl("bootstatus", dev.udid, "-b");
  const target = `http://127.0.0.1:${port}/${servedPath}?run=${runId}${plant ? "&plant=" + plant : ""}${shotEmbed ? "&shot=" + shotEmbed : ""}`;
  simctl("openurl", dev.udid, target);

  const timer = new Promise((_, rej) =>
    setTimeout(() => rej(new Error(`no report within ${timeoutS} s`)), timeoutS * 1000)
  );
  const report = await Promise.race([reported, timer]);

  if (screenshot) simctl("io", dev.udid, "screenshot", path.resolve(screenshot));

  const checked = report.embeds.filter((e) => e.requested !== "native");
  const failures = [];
  if (checked.length !== expectEmbeds) {
    failures.push(`expected ${expectEmbeds} embeds not set to renderer=native, found ${checked.length}`);
  }
  for (const e of checked) {
    if (remote) {
      // Safari names no cause beyond "Load failed"; it must be the fetch of
      // this embed's remote PDF that failed, not the PDF.js import
      const logged = report.errors.some((t) => t.includes("embedpdf: failed to render " + e.failure.expected) && t.includes("Load failed"));
      if (!e.failure.ok) failures.push(`embed ${e.index}: not in the load-failure state: ${JSON.stringify(e.failure)}`);
      else if (!e.failure.expected.startsWith(remoteBase)) failures.push(`embed ${e.index}: ${e.failure.expected} is not on ${remoteBase}`);
      else if (!logged) failures.push(`embed ${e.index}: no "failed to render ${e.failure.expected} … Load failed" error`);
    } else if (e.renderer !== "pdfjs") failures.push(`embed ${e.index}: renderer ${e.renderer}, expected pdfjs`);
    else if (e.pages !== expectPages) failures.push(`embed ${e.index}: ${e.pages} page containers, expected ${expectPages}`);
    else if (!e.ink.every(Boolean)) failures.push(`embed ${e.index}: pages without ink: ${e.ink.map((v, i) => (v ? null : i + 1)).filter(Boolean).join(", ")}`);
  }
  const out = {
    device: { name: dev.name, udid: dev.udid, type: deviceType, runtime: runtimeName },
    url: target,
    remote: remote || null,
    ...report,
    pass: failures.length === 0,
    failures,
  };
  console.log(JSON.stringify(out, null, 2));
  exitCode = failures.length === 0 ? 0 : 1;
} catch (err) {
  console.error("ios_check: " + err.message);
} finally {
  server.close();
  remoteServer?.close();
  process.exit(exitCode);
}
