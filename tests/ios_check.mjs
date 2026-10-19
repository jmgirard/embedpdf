// End-to-end check of embedpdf in Safari on an iOS simulator.
//
// Serves docs/ (tests/serve_docs.mjs), or with --alone yes a temporary
// directory that holds only a copy of the page. It injects a probe script into
// every HTML response, opens the page in the simulator's Safari with `simctl openurl`, and
// waits for the probe to POST a per-embed report: which renderer each embed
// used, how many .embedpdf-page containers it has, and whether each page's
// canvas has ink, by the rule in tests/ink.mjs (some pixel neither transparent
// nor white, read over every pixel and channel). No dependencies beyond Node
// and Xcode's simctl.
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
//   --port <n>             server port on 127.0.0.1 (default: a free port the
//                          system picks); a port in use, or any server that
//                          cannot start, exits 2 with a message
//   --timeout <s>          seconds to wait for the report (default 180, or 300
//                          with --slow-text)
//   --screenshot <file>    save a simulator screenshot, taken with the first
//                          renderer=native embed scrolled into view
//   --shot-embed <n>       scroll embed n (1-based) into view for the screenshot
//   --plant blank|missing|notext|swap|visible|inert|cvhidden|unhydrated
//                          plant a defect in the first PDF.js embed before
//                          measuring (blank its last page canvas, remove
//                          that page's container, empty that page's hidden
//                          text, swap the first two pages' text, set the
//                          last text block's overflow to visible, set inert
//                          on the last page, or set the last text block's
//                          content-visibility to hidden), or (unhydrated)
//                          add a div.embedpdf with no data-src to the page
//                          before the text wait; the check must then fail.
//                          All but blank and missing need --expect-text.
//   --expect-text "<p1>|<p2>|…"
//                          phrase i is a phrase of page i's text. Before the
//                          probe scrolls, it waits until every embed is
//                          hydrated and every PDF.js page has text, or 10 s
//                          pass with no embed newly hydrated and no page
//                          newly with text, or 60 s pass in all. If an embed
//                          is still not hydrated then, the probe reports at
//                          once and that is the one failure. Fail unless each
//                          page's .embedpdf-text block contains its own
//                          phrase and no other page's, and is hidden but
//                          readable: computed width and height 1px, overflow
//                          hidden, user-select none, display not none,
//                          visibility visible, no aria-hidden on it or an
//                          ancestor, and no inert attribute or computed
//                          content-visibility hidden on it or an element that
//                          contains it. Whitespace is collapsed first.
//                          Checks only embeds not set to renderer=native;
//                          cannot be combined with --remote or --missing-pdfs.
//   --slow-text <ms>       test aid, with --expect-text: after the wait above,
//                          empty the text of every PDF.js page the viewer
//                          filled and put it back one page every <ms> ms
//                          while that wait runs again; the restoring stops
//                          when that wait ends. The run must still pass when
//                          <ms> is at most 9000 and pages × <ms> is at most
//                          50000, which leaves room for late timers under the
//                          10 s and 60 s limits.
//   --expect-name "<file name>" | "<name 1>|<name 2>|..."
//                          fail unless each PDF.js embed has role="group" and
//                          its expected aria-label ("PDF: <file name>",
//                          numbered or "PDF" as below) in the DOM (Safari's
//                          accessibility tree is not read); cannot be
//                          combined with --remote or --missing-pdfs. One name
//                          stands for the --expect-embeds embeds; a "|" list
//                          gives one name per embed in page order. "-" and
//                          the " (k of n)" numbering work as in
//                          render_check (tests/expect_names.mjs). Each
//                          toolbar's page indicator must hold "Page i of
//                          <pages>" and a shown "i / <pages>" that is
//                          aria-hidden, and no other node; an embed with no
//                          indicator fails unless data-toolbar="false".
//   --plant wrongname|norole|nonumber|rawindicator|noindicator|strayindicator
//                          with --expect-name: change the first PDF.js
//                          embed's aria-label to "PDF: wrong.pdf"
//                          (wrongname), remove its role attribute (norole),
//                          remove the " (k of n)" from its aria-label
//                          (nonumber), remove aria-hidden from its shown
//                          "i / n" (rawindicator), remove its page
//                          indicator (noindicator), or add a text node to
//                          the indicator (strayindicator); the check must
//                          then fail
//   --alone yes|no         yes: serve a copy of the page from an empty
//                          temporary directory instead of docs/ (default no)
//   --remote blocked       serve the PDFs from a second server on another port
//                          (another origin) that sends no
//                          Access-Control-Allow-Origin header, and point each
//                          embed's data-src and links at it. A page whose
//                          embeds hold their PDF inline (self-contained)
//                          exits 2 before the simulator opens.
//   --missing-pdfs         takes no value: the page's own server answers HTTP
//                          404 for every path that ends in .pdf. Each embed
//                          not set to renderer=native must then show the
//                          load-failure state for a URL on that server, and
//                          the page's errors must hold the viewer's "failed
//                          to render <data-src>" line with PDF.js
//                          ResponseException, one line per embed. Needs
//                          --expect-embeds above 0. Not with --remote,
//                          --alone yes, --plant, --expect-text, --expect-name.
//
// Exits 0 only when every embed not set to renderer=native used PDF.js, has
// exactly --expect-pages page containers, and every page canvas has ink, and
// the number of such embeds equals --expect-embeds. With --remote blocked or
// --missing-pdfs, each such embed must instead show the load-failure state:
// the text "This PDF cannot be shown here.", an "Open the PDF" link to the
// same absolute URL as data-src with target _blank, and no "Download PDF
// file." link. With --remote blocked its data-src must be on the remote
// server, and the console must show the fetch of that URL failing ("Load
// failed"); with --missing-pdfs, see that flag. With --expect-text and
// --expect-name, those checks must pass too; with --expect-text, an embed
// still not hydrated when the text wait ends is the one failure.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { serveDocs, serveRemote, pointPdfsAt, embedSrcsOffRemote, docsFile, DOCS } from "./serve_docs.mjs";
import { inkInPixels } from "./ink.mjs";
import { expectedNames } from "./expect_names.mjs";

const args = process.argv.slice(2);
const FLAGS = ["device", "page", "expect-embeds", "expect-pages", "expect-text", "expect-name", "port", "timeout", "screenshot", "shot-embed", "plant", "alone", "remote", "slow-text"];
// flags that take no value
const BOOL_FLAGS = ["missing-pdfs"];
// parsed flags: a value flag's value is taken as it is, even when it starts
// with "--", so it is never read as a flag
const parsed = {};
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith("--") && BOOL_FLAGS.includes(args[i].slice(2))) {
    parsed[args[i].slice(2)] = true;
    continue;
  }
  if (!FLAGS.includes(args[i].replace(/^--/, "")) || !args[i].startsWith("--") || i + 1 >= args.length) {
    console.error(`ios_check: unexpected argument "${args[i]}" (flags: --${FLAGS.join(", --")}, each with a value, and --${BOOL_FLAGS.join(", --")})`);
    process.exit(2);
  }
  parsed[args[i].slice(2)] = args[++i];
}
const missingPdfs = parsed["missing-pdfs"] === true;
const opt = (name, fallback) => {
  return name in parsed ? parsed[name] : fallback;
};
const device = opt("device", "");
const pagePath = opt("page", "example.html");
const expectEmbedsArg = opt("expect-embeds", "10");
const expectEmbeds = Number(expectEmbedsArg);
if (!/^\d+$/.test(expectEmbedsArg)) {
  console.error("ios_check: --expect-embeds needs a whole number");
  process.exit(2);
}
const expectPages = Number(opt("expect-pages", "2"));
// 0: the system picks a free port
const portArg = opt("port", "0");
const port = Number(portArg);
if (!/^\d+$/.test(portArg) || port > 65535) {
  console.error("ios_check: --port must be a port number from 0 to 65535");
  process.exit(2);
}
// --slow-text runs the text wait twice (up to 60 s each) before the scroll
// loop (90 s, plus the pass that is running then) and the page load, so its
// default is longer
const timeoutS = Number(opt("timeout", "slow-text" in parsed ? "300" : "180"));
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
if (missingPdfs && (remote || alone === "yes" || plant)) {
  console.error("ios_check: --missing-pdfs cannot be combined with --remote, --alone yes, or --plant");
  process.exit(2);
}
if (missingPdfs && !(expectEmbeds > 0)) {
  console.error("ios_check: --missing-pdfs needs --expect-embeds above 0");
  process.exit(2);
}
if (!device) {
  console.error("ios_check: --device <simulator name or udid> is required");
  process.exit(2);
}
const normalize = (s) => s.replace(/\s+/g, " ").trim();
const phrases = opt("expect-text", null) === null ? null : opt("expect-text").split("|").map(normalize);
if (phrases && phrases.some((p) => !p)) {
  console.error("ios_check: --expect-text needs a non-empty phrase for each page");
  process.exit(2);
}
if (phrases && (remote || missingPdfs)) {
  console.error("ios_check: --expect-text cannot be combined with --remote or --missing-pdfs (no embed shows a PDF there)");
  process.exit(2);
}
const slowText = opt("slow-text", "");
if ("slow-text" in parsed && !(phrases && /^\d+$/.test(slowText) && Number(slowText) > 0)) {
  console.error("ios_check: --slow-text needs --expect-text and a whole number of milliseconds above 0");
  process.exit(2);
}
const TEXT_PLANTS = ["notext", "swap", "visible", "inert", "cvhidden"];
const NAME_PLANTS = ["wrongname", "norole", "nonumber", "rawindicator", "noindicator", "strayindicator"];
// planted before the text wait; needs --expect-text
const WAIT_PLANTS = ["unhydrated"];
if (plant && !["blank", "missing", ...NAME_PLANTS, ...TEXT_PLANTS, ...WAIT_PLANTS].includes(plant)) {
  console.error(`ios_check: --plant must be blank, missing, ${[...TEXT_PLANTS, ...WAIT_PLANTS, ...NAME_PLANTS].join(", ")}`);
  process.exit(2);
}
const expectName = opt("expect-name", null);
if (expectName !== null && expectName.split("|").some((n) => !n)) {
  console.error("ios_check: --expect-name needs a non-empty file name for each embed");
  process.exit(2);
}
// the full names, numbered where they repeat, as the viewer numbers them; one
// name stands for the --expect-embeds embeds
const expectLabels = expectName === null ? null : expectedNames(expectName.split("|"), expectEmbeds);
if (expectName && (remote || missingPdfs)) {
  console.error("ios_check: --expect-name cannot be combined with --remote or --missing-pdfs (no embed shows a PDF there)");
  process.exit(2);
}
if (NAME_PLANTS.includes(plant) && !expectName) {
  console.error(`ios_check: --plant ${plant} needs --expect-name`);
  process.exit(2);
}
if ((TEXT_PLANTS.includes(plant) || WAIT_PLANTS.includes(plant)) && !phrases) {
  console.error(`ios_check: --plant ${plant} needs --expect-text`);
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
// canvases, optionally plants a defect, measures, and POSTs the report. With
// --expect-text, an embed still not hydrated when the text wait ends makes it
// POST at once, without scrolling.
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
  // --expect-text: the hidden text of each page, read before anything
  // scrolls. Wait until every embed is hydrated and every PDF.js page has
  // text, or 10 s pass with no embed newly hydrated and no page newly with
  // text, or 60 s pass in all. With slow=<ms>, the same wait first runs once;
  // then all the text is emptied and put back one page every <ms> ms while
  // the wait runs again.
  const wantText = params.get("text") === "1";
  const slowMs = Number(params.get("slow") || 0);
  const blocks = () => embeds().filter((el) => kind(el) === "pdfjs")
    .flatMap((el) => [...el.querySelectorAll(".embedpdf-page")].map((p) => p.querySelector(".embedpdf-text")));
  const unhydrated = () => embeds().filter((el) => kind(el) === "none").length;
  const withText = () => blocks().filter((t) => t && t.textContent.trim()).length;
  const waitText = async () => {
    const start = Date.now();
    let seen = -1, changed = start;
    while (unhydrated() || !blocks().every((t) => t && t.textContent.trim())) {
      const progress = embeds().length - unhydrated() + withText();
      if (progress !== seen) { seen = progress; changed = Date.now(); }
      if (Date.now() - changed >= 10000 || Date.now() - start >= 60000) break;
      await sleep(100);
    }
    return Date.now() - start;
  };
  let waitPlanted = "";
  if (wantText && plant === "unhydrated") {
    // an embed with no data-src never hydrates
    const stray = document.createElement("div");
    stray.className = "embedpdf";
    document.body.appendChild(stray);
    waitPlanted = plant;
  }
  let slowPages = 0;
  let timer = null;
  if (wantText && slowMs) {
    await waitText();
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
  const textWaitedMs = wantText ? await waitText() : 0;
  clearInterval(timer);
  // embeds still not hydrated when the text wait ended: the probe reports at
  // once, without scrolling
  const stuck = wantText ? unhydrated() : 0;
  let textPlanted = "";
  if (${JSON.stringify(TEXT_PLANTS)}.includes(plant)) {
    const first = embeds().find((el) => kind(el) === "pdfjs");
    const t = first ? [...first.querySelectorAll(".embedpdf-page .embedpdf-text")] : [];
    const last = t[t.length - 1];
    if (plant === "notext" && last) last.textContent = "";
    if (plant === "swap" && t.length > 1) [t[0].textContent, t[1].textContent] = [t[1].textContent, t[0].textContent];
    if (plant === "visible" && last) last.style.overflow = "visible";
    if (plant === "inert" && last) last.closest(".embedpdf-page").setAttribute("inert", "");
    if (plant === "cvhidden" && last) last.style.contentVisibility = "hidden";
    if (last && (plant !== "swap" || t.length > 1)) textPlanted = plant;
  }
  // the text block and each element that contains it, where it has the inert
  // attribute or content-visibility: hidden (either drops the text from the
  // accessibility tree)
  const named = (e, t) => e === t ? "the text block" : e.tagName.toLowerCase() + (e.className ? "." + [...e.classList].join(".") : "");
  const hiders = (t) => {
    const inert = [], cv = [];
    for (let e = t; e; e = e.parentElement) {
      if (e.hasAttribute("inert")) inert.push(named(e, t));
      if (getComputedStyle(e).contentVisibility === "hidden") cv.push(named(e, t));
    }
    return { inert, cv };
  };
  const text = embeds().map((el) => [...el.querySelectorAll(".embedpdf-page")].map((p) => {
    const t = p.querySelector(".embedpdf-text");
    if (!t) return null;
    const s = getComputedStyle(t);
    const h = hiders(t);
    return {
      inertOn: h.inert, contentHiddenOn: h.cv,
      text: t.textContent, width: s.width, height: s.height, overflow: s.overflow,
      userSelect: s.userSelect || s.webkitUserSelect, display: s.display, visibility: s.visibility,
      ariaHidden: !!t.closest('[aria-hidden="true"]'),
    };
  }));

  if (!stuck) {
    const t0 = Date.now();
    while (Date.now() - t0 < 90000) {
      await scrollAll();
      if (settled()) break;
      await sleep(1000);
    }
    await sleep(1000);
  }

  let namePlanted = "";
  if (plant === "wrongname") {
    const first = embeds().find((el) => kind(el) === "pdfjs");
    if (first) { first.setAttribute("aria-label", "PDF: wrong.pdf"); namePlanted = plant; }
  }
  if (plant === "norole") {
    const first = embeds().find((el) => kind(el) === "pdfjs");
    if (first) { first.removeAttribute("role"); namePlanted = plant; }
  }
  if (plant === "strayindicator") {
    const first = embeds().find((el) => kind(el) === "pdfjs");
    const info = first && first.querySelector(".embedpdf-pageinfo");
    if (info) { info.append(document.createTextNode(" 1 / 2")); namePlanted = plant; }
  }
  if (plant === "noindicator") {
    const first = embeds().find((el) => kind(el) === "pdfjs");
    const info = first && first.querySelector(".embedpdf-pageinfo");
    if (info) { info.remove(); namePlanted = plant; }
  }
  if (plant === "rawindicator") {
    const first = embeds().find((el) => kind(el) === "pdfjs");
    const shown = first && first.querySelector(".embedpdf-pageinfo [aria-hidden]");
    if (shown) { shown.removeAttribute("aria-hidden"); namePlanted = plant; }
  }
  if (plant === "nonumber") {
    const first = embeds().find((el) => kind(el) === "pdfjs");
    const label = first ? first.getAttribute("aria-label") || "" : "";
    const bare = label.replace(/ \\(\\d+ of \\d+\\)$/, "");
    if (bare !== label) { first.setAttribute("aria-label", bare); namePlanted = plant; }
  }

  if (plant === "blank" || plant === "missing") {
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

  // the ink rule of tests/ink.mjs, inlined from its source text
  const inkInPixels = ${inkInPixels.toString()};
  const hasInk = (c) => {
    try {
      return inkInPixels(c.getContext("2d").getImageData(0, 0, c.width, c.height).data);
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
    textPlanted,
    namePlanted,
    textWaitedMs,
    slowPages,
    waitPlanted,
    stuck,
    embeds: embeds().map((el, i) => {
      const pages = [...el.querySelectorAll(".embedpdf-page")];
      // the load-failure state, read from the text and links, not the class
      const links = [...el.querySelectorAll("a")];
      const open = links.find((a) => a.textContent.trim() === "Open the PDF");
      const failure = {
        text: el.textContent.includes("This PDF cannot be shown here."),
        href: open ? open.href : null,
        expected: new URL(el.dataset.src || "", document.baseURI).href,
        // data-src as written, which the viewer's "failed to render" line names
        src: el.dataset.src || "",
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
        text: text[i],
        role: el.getAttribute("role"),
        label: el.getAttribute("aria-label"),
        toolbarOff: el.dataset.toolbar === "false",
        indicator: (() => {
          const info = el.querySelector(".embedpdf-toolbar .embedpdf-pageinfo");
          if (!info) return null;
          const spoken = info.querySelector(".embedpdf-pageinfo-text");
          const shown = [...info.children].find((c) => c !== spoken);
          return {
            spoken: spoken ? spoken.textContent : null,
            shown: shown ? shown.textContent : null,
            shownHidden: !!shown && shown.getAttribute("aria-hidden") === "true",
            // any other node (a stray text node too) would be shown or read
            others: [...info.childNodes].filter((n) => n !== spoken && n !== shown).length,
          };
        })(),
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

const remoteServer = remote
  ? await serveRemote(remote).catch((err) => {
      console.error(`ios_check: cannot start the remote server: ${err.message}`);
      process.exit(2);
    })
  : null;
const remoteBase = remoteServer ? `http://127.0.0.1:${remoteServer.address().port}/` : null;
// --remote on a page with an embed whose PDF stays off the remote server (such
// as the inlined PDFs of a self-contained page) would check nothing remote for
// it, so the run stops here, before the simulator
const pageFile = remoteBase ? docsFile(pagePath) : null;
if (pageFile) {
  const off = embedSrcsOffRemote(fs.readFileSync(pageFile, "utf8"), remoteBase, pagePath);
  if (off.length) {
    console.error(`ios_check: --remote: ${pagePath} has embeds whose PDF is not a relative .pdf URL that can move to the remote server (a self-contained page holds its PDFs inline as data: URLs): ${off.join(", ")}`);
    process.exit(2);
  }
}

const server = await serveDocs({
  port,
  missingPdfs,
  ...(aloneDir ? { root: aloneDir } : {}),
  // before the last </body>: a self-contained page can hold the text "</body>"
  // inside an inlined script
  transformHtml: (html) => {
    if (remoteBase) html = pointPdfsAt(html, remoteBase, pagePath);
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
}).catch((err) => {
  console.error(
    err.code === "EADDRINUSE"
      ? `ios_check: port ${port} is in use; pass another --port, or none for a free port`
      : `ios_check: cannot start the docs server: ${err.message}`
  );
  process.exit(2);
});

let exitCode = 1;
try {
  simctl("bootstatus", dev.udid, "-b");
  const target = `http://127.0.0.1:${server.address().port}/${servedPath}?run=${runId}${plant ? "&plant=" + plant : ""}${phrases ? "&text=1" : ""}${slowText ? "&slow=" + slowText : ""}${shotEmbed ? "&shot=" + shotEmbed : ""}`;
  simctl("openurl", dev.udid, target);

  const timer = new Promise((_, rej) =>
    setTimeout(() => rej(new Error(`no report within ${timeoutS} s`)), timeoutS * 1000)
  );
  const report = await Promise.race([reported, timer]);

  if (screenshot) simctl("io", dev.udid, "screenshot", path.resolve(screenshot));

  const checked = report.embeds.filter((e) => e.requested !== "native");
  const failures = [];
  // with --expect-text, an embed still not hydrated when the text wait ended
  // is the one failure: the probe measured nothing more
  if (report.stuck) failures.push(`${report.stuck} embed(s) still not hydrated when the text wait ended after ${report.textWaitedMs} ms`);
  else if (checked.length !== expectEmbeds) {
    failures.push(`expected ${expectEmbeds} embeds not set to renderer=native, found ${checked.length}`);
  }
  if (expectLabels && !report.stuck && expectLabels.length !== checked.length) {
    failures.push(`--expect-name gives ${expectLabels.length} names for ${checked.length} embeds not set to renderer=native`);
  }
  for (const [i, e] of (report.stuck ? [] : checked).entries()) {
    if (remote) {
      // Safari names no cause beyond "Load failed"; it must be the fetch of
      // this embed's remote PDF that failed, not the PDF.js import
      const logged = report.errors.some((t) => t.includes("embedpdf: failed to render " + e.failure.expected) && t.includes("Load failed"));
      if (!e.failure.ok) failures.push(`embed ${e.index}: not in the load-failure state: ${JSON.stringify(e.failure)}`);
      else if (!e.failure.expected.startsWith(remoteBase)) failures.push(`embed ${e.index}: ${e.failure.expected} is not on ${remoteBase}`);
      else if (!logged) failures.push(`embed ${e.index}: no "failed to render ${e.failure.expected} … Load failed" error`);
    } else if (missingPdfs) {
      // the page's own server answered 404 for the PDF; the viewer names it
      // by its data-src as written, and Safari logs PDF.js's ResponseException
      const own = `http://127.0.0.1:${server.address().port}/`;
      // one line per embed: embeds that share a data-src need as many lines
      const lines = report.errors.filter((t) => t.includes("embedpdf: failed to render " + e.failure.src + " ") && t.includes("ResponseException")).length;
      const logged = lines >= checked.filter((o) => o.failure.src === e.failure.src).length;
      if (!e.failure.ok) failures.push(`embed ${e.index}: not in the load-failure state: ${JSON.stringify(e.failure)}`);
      else if (!e.failure.expected.startsWith(own)) failures.push(`embed ${e.index}: ${e.failure.expected} is not on ${own}`);
      else if (!logged) failures.push(`embed ${e.index}: ${lines} "failed to render ${e.failure.src} … ResponseException" errors, fewer than the embeds that show that PDF`);
    } else if (e.renderer !== "pdfjs") failures.push(`embed ${e.index}: renderer ${e.renderer}, expected pdfjs`);
    else if (e.pages !== expectPages) failures.push(`embed ${e.index}: ${e.pages} page containers, expected ${expectPages}`);
    else if (!e.ink.every(Boolean)) failures.push(`embed ${e.index}: pages without ink: ${e.ink.map((v, i) => (v ? null : i + 1)).filter(Boolean).join(", ")}`);
    // --expect-name: the embed's role and name, read from the DOM
    if (expectLabels && !remote && e.renderer === "pdfjs") {
      const name = expectLabels[i];
      if (e.role !== "group") failures.push(`embed ${e.index}: role attribute is ${e.role}, not group`);
      if (e.label !== name) failures.push(`embed ${e.index}: aria-label is "${e.label}", not "${name}"`);
      // the toolbar's page indicator: "Page i of n" for screen readers, and
      // the shown "i / n" for the same page hidden from them
      const ind = e.indicator;
      if (!ind && !e.toolbarOff) failures.push(`embed ${e.index}: no page indicator, and toolbar=false is not set`);
      if (ind) {
        const m = /^Page (\d+) of (\d+)$/.exec(ind.spoken || "");
        if (!m || Number(m[2]) !== e.pages) failures.push(`embed ${e.index}: indicator text is ${JSON.stringify(ind.spoken)}, not "Page i of ${e.pages}"`);
        else if (ind.shown !== `${m[1]} / ${m[2]}`) failures.push(`embed ${e.index}: indicator shows ${JSON.stringify(ind.shown)}, not "${m[1]} / ${m[2]}"`);
        if (!ind.shownHidden) failures.push(`embed ${e.index}: the shown indicator ${JSON.stringify(ind.shown)} is not aria-hidden`);
        if (ind.others) failures.push(`embed ${e.index}: the indicator holds ${ind.others} node(s) besides its two spans`);
      }
    }
    // --expect-text: the hidden text, read before the probe scrolled
    if (phrases && !remote && e.renderer === "pdfjs") {
      if (e.text.length !== phrases.length) failures.push(`embed ${e.index}: ${e.text.length} pages read for text, --expect-text gives ${phrases.length} phrases`);
      e.text.forEach((b, j) => {
        const at = `embed ${e.index}, page ${j + 1}`;
        if (!b) return failures.push(`${at}: no .embedpdf-text block`);
        const t = normalize(b.text);
        if (phrases[j] && !t.includes(phrases[j])) failures.push(`${at}: text lacks "${phrases[j]}"`);
        phrases.forEach((p, k) => {
          if (k !== j && t.includes(p)) failures.push(`${at}: text has page ${k + 1}'s phrase "${p}"`);
        });
        if (b.width !== "1px" || b.height !== "1px") failures.push(`${at}: text box is ${b.width} by ${b.height}, not 1px by 1px`);
        if (b.overflow !== "hidden") failures.push(`${at}: text overflow is ${b.overflow}, not hidden`);
        if (b.userSelect !== "none") failures.push(`${at}: text user-select is ${b.userSelect}, not none`);
        if (b.display === "none") failures.push(`${at}: text display is none`);
        if (b.visibility !== "visible") failures.push(`${at}: text visibility is ${b.visibility}`);
        if (b.ariaHidden) failures.push(`${at}: text is under aria-hidden`);
        for (const n of b.inertOn) failures.push(`${at}: text is under inert (on ${n})`);
        for (const n of b.contentHiddenOn) failures.push(`${at}: text is under content-visibility: hidden (on ${n})`);
      });
    }
  }
  // the full text is long; the report keeps its length
  for (const e of report.embeds) for (const b of e.text) if (b) b.text = `${normalize(b.text).length} characters`;
  const out = {
    device: { name: dev.name, udid: dev.udid, type: deviceType, runtime: runtimeName },
    url: target,
    remote: remote || null,
    missingPdfs,
    ...report,
    pass: failures.length === 0,
    failures,
  };
  console.log(JSON.stringify(out, null, 2));
  exitCode = failures.length === 0 ? 0 : 1;
  // a text plant that found nothing proves nothing about the check
  if ((TEXT_PLANTS.includes(plant) && !report.textPlanted) || (NAME_PLANTS.includes(plant) && !report.namePlanted) || (WAIT_PLANTS.includes(plant) && !report.waitPlanted)) {
    console.error(`ios_check: --plant ${plant} found nothing to plant in`);
    exitCode = 2;
  }
} catch (err) {
  console.error("ios_check: " + err.message);
} finally {
  server.close();
  remoteServer?.close();
  process.exit(exitCode);
}
