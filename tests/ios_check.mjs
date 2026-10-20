// End-to-end check of embedpdf in Safari on an iOS simulator.
//
// Serves docs/ (tests/serve_docs.mjs), or with --alone yes a temporary
// directory that holds only a copy of the page. It injects a probe script into
// every HTML response, opens the page in the simulator's Safari with `simctl openurl`, and
// waits for the probe to POST a per-embed report: which renderer each embed
// used, how many .embedpdf-page containers it has, and each page's ink: "ok"
// when its canvas has ink by the rule in tests/ink.mjs (some pixel neither
// transparent nor white, read over every pixel and channel), else "no
// canvas", "no ink", or "unreadable (…)". A failure line names each page that
// is not "ok" and its state. No dependencies beyond Node
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
//   --expect-native <n>    embeds set to renderer=native (default 0); checked
//                          when given, and always with --expect-name. Every
//                          run fails when a native embed is not an <object>
//                          (an <iframe> is for desktop browsers, D-007).
//   --expect-pages <n> | "<n1>|<n2>|…"
//                          pages per PDF.js embed (default 2: sample.pdf):
//                          one count for every embed not set to
//                          renderer=native, or one count per such embed in
//                          page order. A list must have --expect-embeds
//                          entries, and each entry must be a whole number,
//                          or the run exits 2
//   --port <n>             server port on 127.0.0.1 (default: a free port the
//                          system picks); a port in use, or any server that
//                          cannot start, exits 2 with a message
//   --timeout <s>          seconds to wait for the report (default 180, or 300
//                          with --slow-text). On a RevealJS deck each slide
//                          can take 50 s or more (see below), so a deck
//                          of more than a few slides can need a larger value
//   --screenshot <file>    save a simulator screenshot, taken with the first
//                          renderer=native embed scrolled into view
//   --shot-embed <n>       scroll embed n (1-based) into view for the screenshot
//   --plant blank|nocanvas|missing|notext|swap|visible|inert|cvhidden|unhydrated
//                          plant a defect in the first PDF.js embed before
//                          measuring (blank its last page canvas, remove
//                          that canvas and keep the page, remove that
//                          page's container, empty that page's hidden
//                          text, swap the first two pages' text, set the
//                          last text block's overflow to visible, set inert
//                          on the last page, or set the last text block's
//                          content-visibility to hidden), or (unhydrated)
//                          add a div.embedpdf with no data-src to the page
//                          before the text wait; the check must then fail.
//                          All but blank, nocanvas, and missing need
//                          --expect-text. blank and nocanvas need that page
//                          to have a canvas.
//                          Each exits 2 when it finds nothing to plant in.
//   --expect-text "<p1>|<p2>|…"
//                          phrase i is a phrase of page i's text. Before the
//                          probe scrolls, it waits until every embed is
//                          hydrated and every PDF.js page has text, or 10 s
//                          pass with no embed newly hydrated and no page
//                          newly with text, or 60 s pass in all. If an embed
//                          is still not hydrated then, the probe reports at
//                          once and that is the one failure. The probe then
//                          reads the text before it scrolls, or on a RevealJS
//                          deck while each embed's slide is shown (below).
//                          Fail unless each page's .embedpdf-text block
//                          contains its own
//                          phrase and no other page's, and is hidden but
//                          readable: computed width and height 1px, overflow
//                          hidden, user-select none, display not none,
//                          visibility visible, no aria-hidden on it or an
//                          ancestor, and no inert attribute or computed
//                          content-visibility hidden on it or an element that
//                          contains it. Whitespace is collapsed first.
//                          Checks only embeds not set to renderer=native;
//                          cannot be combined with --remote blocked or --missing-pdfs.
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
//                          combined with --remote blocked or --missing-pdfs. Also fail
//                          unless each renderer=native embed shows the native
//                          viewer and its <object> has that aria-label and no
//                          title. One name stands for the --expect-native plus
//                          --expect-embeds embeds; a "|" list gives one name
//                          per embed, native or not, in page order. "-" and
//                          the " (k of n)" numbering work as in
//                          render_check (tests/expect_names.mjs). Each
//                          toolbar's page indicator must hold "Page i of
//                          <pages>" and a shown "i / <pages>" that is
//                          aria-hidden, and no other node; an embed with no
//                          indicator fails unless data-toolbar="false".
//   --plant wrongname|nativename|nativetitle|norole|nonumber|rawindicator|noindicator|strayindicator
//                          with --expect-name: change the first PDF.js
//                          embed's aria-label to "PDF: wrong.pdf"
//                          (wrongname); change the first native embed's
//                          <object> aria-label to "PDF: wrong.pdf"
//                          (nativename), or give it a title equal to its
//                          aria-label (nativetitle); in the first PDF.js embed, remove
//                          its role attribute (norole),
//                          remove the " (k of n)" from its aria-label
//                          (nonumber), remove aria-hidden from its shown
//                          "i / n" (rawindicator), remove its page
//                          indicator (noindicator), or add a text node to
//                          the indicator (strayindicator); the check must
//                          then fail
//   --expect-download "<path>|-|…"
//                          every embed on the page, renderer=native too, must
//                          show "This PDF cannot be shown here." and hold an
//                          inlined PDF, one entry per embed in page order. A
//                          path (from the repo root, such as
//                          files/broken.pdf): the viewer decoded the data:
//                          address (it removed data-src), and the embed holds
//                          exactly one link, "Download the PDF", whose href
//                          is a blob: URL, whose download attribute is the
//                          path's file name, and which has no target. "-":
//                          data-src is still a data: address, and the embed
//                          holds no link. The page's errors must hold one
//                          "embedpdf: failed to render an inlined PDF" line
//                          per embed. Safari is not asked to save the file.
//                          Not with --remote, --missing-pdfs, --expect-text,
//                          or --expect-name.
//   --plant dltarget|dlnoname|dlwrongname|dlhref|dlsecond|dltext|decodelink|extralog
//                          with --expect-download, plant a defect as
//                          render_check's plants of those names do; the
//                          check must then fail
//   --expect-links <n>     fail unless the page holds exactly n download links
//                          (.embedpdf-download, .embedpdf object a[download],
//                          .embedpdf .embedpdf-fallback a[download],
//                          a.embedpdf-btn, as render_check selects them),
//                          each with a data: or blob: href
//   --plant nolink|linkfile
//                          with --expect-links: remove the page's first such
//                          link, or set its href to its download name
//                          ("sample.pdf" when it has none); the check must
//                          then fail. Each exits 2 when the page holds no
//                          such link
//   --alone yes|no         yes: serve a copy of the page from an empty
//                          temporary directory instead of docs/ (default no)
//   --remote blocked|cors  serve the PDFs from a second server on another port
//                          (another origin), and point each embed's data-src
//                          and links at it. blocked: the server sends no
//                          Access-Control-Allow-Origin header, and each embed
//                          not set to renderer=native must show the
//                          load-failure state (below). cors: it sends
//                          Access-Control-Allow-Origin: *, every check of a
//                          run without --remote applies, each embed's
//                          data-src must be on that server, and each
//                          renderer=native embed must show the native viewer
//                          with an <object> address on that server, for which
//                          the server answered a GET with no Origin header.
//                          A page whose embeds hold their PDF inline
//                          (self-contained) exits 2 before the simulator
//                          opens. Not with --alone yes or --expect-download;
//                          blocked not with --plant, --expect-text,
//                          --expect-name, or --expect-ranges.
//   --missing-pdfs         takes no value: the page's own server answers HTTP
//                          404 for every path that ends in .pdf. Each embed
//                          not set to renderer=native must then show the
//                          load-failure state for a URL on that server, and
//                          the page's errors must hold the viewer's "failed
//                          to render <data-src>" line with PDF.js
//                          ResponseException, one line per embed. Needs
//                          --expect-embeds above 0. Not with --remote,
//                          --alone yes, --plant, --expect-text, --expect-name.
//   --expect-ranges        takes no value: the server that serves the PDFs
//                          (the docs server, or the remote one with --remote
//                          cors, only to requests with an Origin header)
//                          sends each whole-file answer for a .pdf file over
//                          SLOW_ABOVE bytes (tests/serve_docs.mjs) slowly, so
//                          PDF.js loads it by byte ranges. Fail
//                          unless that server answered at least one
//                          byte-range request (HTTP 206) for each PDF.js
//                          embed's address; the report's "ranges" gives the
//                          count per path that the check reads. Answers are
//                          counted per address
//                          path, so the run exits 2 when a PDF.js embed's
//                          address is also another embed's. With --remote
//                          cors only answers to requests with an Origin
//                          header count (a native viewer's requests have
//                          none), so there it exits 2 only when the address
//                          is also another PDF.js embed's. It also exits 2
//                          when its PDF under docs/ is not over SLOW_ABOVE
//                          bytes (PDF.js then asks for no range). Not with
//                          --remote blocked, --missing-pdfs, or --alone yes.
//   --plant noranges       with --expect-ranges: that server ignores every
//                          Range header and sends the whole file (HTTP 200),
//                          so the check must fail and name each PDF.js
//                          embed's address; with no PDF.js embed it exits 2
//                          (nothing to plant in)
//   --plant noslide        on a RevealJS deck, the probe does not show the
//                          last slide that holds a PDF.js embed or scroll
//                          its pages, so the check must fail for that
//                          slide's embeds. It exits 2 (nothing to plant in)
//                          on a page with no slides, on a deck with no
//                          PDF.js embed, and when that slide was current
//                          anyway at its ink measure
//
// On a RevealJS deck (window.Reveal), a PDF.js embed on a slide that is not
// shown renders nothing, and RevealJS puts aria-hidden on that slide. So the
// probe waits (after the --expect-text wait, when given) up to 10 s for
// Reveal.isReady() and up to 30 s for every embed to hydrate. Then it takes
// each slide of the deck (each section in .slides or in a vertical stack,
// uncounted slides too, not the stack itself) and shows it in turn: it calls
// Reveal.slide() and waits until RevealJS reports it as the current slide.
// When the slide is not current after 3 s, it also scrolls the slide's embeds
// into view and waits up to 10 s more. This is needed in RevealJS's scrolled
// view (Reveal.isScrollView(), used on the iPhone simulator), where the
// current slide follows the scroll position and Reveal.slide() may not reach
// the last slide. The report's "scrollView" says which view was used.
// While a slide is shown, the probe reads the hidden text of that slide's
// embeds, scrolls their pages into view, waits up to 30 s for their canvases,
// shows the slide again if a page scroll made another slide current, and
// measures their ink. The report gives, per embed, its slide ("slide") and
// the slide RevealJS showed at the text read ("textSlide") and at the ink
// measure ("inkSlide"), counted from 0. A PDF.js embed fails when either
// differs from its own slide (the text one only with --expect-text), when it
// is in no slide of the deck, and when the number of pages with an ink
// reading differs from its page count. These slide checks do not run with
// --remote blocked, --missing-pdfs, or --expect-download.
// On other pages the probe reads the text before it scrolls, and measures the
// ink after.
//
// Exits 0 only when every embed not set to renderer=native used PDF.js, has
// exactly its --expect-pages page containers, and every page canvas has ink,
// and the number of such embeds equals --expect-embeds. With --expect-download,
// every embed must show the inlined failure state that flag describes instead
// of using PDF.js with ink (the --expect-embeds count still applies); without
// it, any embed (renderer=native too) with an inlined PDF in the load-failure
// state fails the run. With --remote blocked or --missing-pdfs, each such
// embed must instead show the load-failure state:
// the text "This PDF cannot be shown here.", an "Open the PDF" link to the
// same absolute URL as data-src with target _blank, and no "Download PDF
// file." link. With --remote blocked its data-src must be on the remote
// server, and the console must show the fetch of that URL failing ("Load
// failed"); with --missing-pdfs, see that flag. With --expect-text,
// --expect-name, and --expect-links, those checks must pass too, and so must
// the --expect-ranges check when it is given; with --expect-text, an embed
// still not hydrated when the text wait ends is the one failure.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { serveDocs, serveRemote, pointPdfsAt, embedSrcsOffRemote, docsFile, DOCS, SLOW_ABOVE } from "./serve_docs.mjs";
import { inkInPixels } from "./ink.mjs";
import { expectedNames } from "./expect_names.mjs";

const args = process.argv.slice(2);
const FLAGS = ["device", "page", "expect-embeds", "expect-native", "expect-pages", "expect-links", "expect-text", "expect-name", "expect-download", "port", "timeout", "screenshot", "shot-embed", "plant", "alone", "remote", "slow-text"];
// flags that take no value
const BOOL_FLAGS = ["missing-pdfs", "expect-ranges"];
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
const expectRanges = parsed["expect-ranges"] === true;
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
const expectNativeArg = opt("expect-native", "0");
const expectNative = Number(expectNativeArg);
if (!/^\d+$/.test(expectNativeArg)) {
  console.error("ios_check: --expect-native needs a whole number");
  process.exit(2);
}
// one page count for every embed not set to renderer=native, or one per such
// embed in page order
const expectPagesList = opt("expect-pages", "2").split("|");
if (!expectPagesList.every((s) => /^\d+$/.test(s))) {
  console.error("ios_check: --expect-pages needs a whole number, or a \"|\" list of whole numbers");
  process.exit(2);
}
if (expectPagesList.length > 1 && expectPagesList.length !== expectEmbeds) {
  console.error(`ios_check: --expect-pages gives ${expectPagesList.length} counts for --expect-embeds ${expectEmbeds}`);
  process.exit(2);
}
// the page count expected of the k-th embed not set to renderer=native
const expectPagesOf = (k) => Number(expectPagesList.length === 1 ? expectPagesList[0] : expectPagesList[k]);
const expectLinksArg = opt("expect-links", null);
if (expectLinksArg !== null && !/^\d+$/.test(expectLinksArg)) {
  console.error("ios_check: --expect-links needs a whole number");
  process.exit(2);
}
const expectLinks = expectLinksArg === null ? null : Number(expectLinksArg);
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
if (remote && remote !== "blocked" && remote !== "cors") {
  console.error("ios_check: --remote must be blocked or cors");
  process.exit(2);
}
// blocked: no embed shows a PDF, so no check that reads one applies
const blocked = remote === "blocked";
if (remote && alone === "yes") {
  console.error("ios_check: --remote cannot be combined with --alone yes");
  process.exit(2);
}
if (blocked && plant) {
  console.error("ios_check: --remote blocked cannot be combined with --plant");
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
if (phrases && (blocked || missingPdfs)) {
  console.error("ios_check: --expect-text cannot be combined with --remote blocked or --missing-pdfs (no embed shows a PDF there)");
  process.exit(2);
}
const slowText = opt("slow-text", "");
if ("slow-text" in parsed && !(phrases && /^\d+$/.test(slowText) && Number(slowText) > 0)) {
  console.error("ios_check: --slow-text needs --expect-text and a whole number of milliseconds above 0");
  process.exit(2);
}
const TEXT_PLANTS = ["notext", "swap", "visible", "inert", "cvhidden"];
const NAME_PLANTS = ["wrongname", "nativename", "nativetitle", "norole", "nonumber", "rawindicator", "noindicator", "strayindicator"];
// planted before the text wait; needs --expect-text
const WAIT_PLANTS = ["unhydrated"];
// planted in a failed embed whose PDF was inlined; needs --expect-download
const DOWNLOAD_PLANTS = ["dltarget", "dlnoname", "dlwrongname", "dlhref", "dlsecond", "dltext", "decodelink", "extralog"];
// planted in the docs server before the page loads; needs --expect-ranges
const RANGE_PLANTS = ["noranges"];
// planted in the slide walk of a RevealJS deck
const SLIDE_PLANTS = ["noslide"];
// planted in the first PDF.js embed just before its ink is measured
const INK_PLANTS = ["blank", "nocanvas", "missing"];
// planted in the page's first download link; needs --expect-links
const LINK_PLANTS = ["nolink", "linkfile"];
if (plant && ![...INK_PLANTS, ...NAME_PLANTS, ...TEXT_PLANTS, ...WAIT_PLANTS, ...DOWNLOAD_PLANTS, ...RANGE_PLANTS, ...SLIDE_PLANTS, ...LINK_PLANTS].includes(plant)) {
  console.error(`ios_check: --plant must be ${[...INK_PLANTS,...TEXT_PLANTS, ...WAIT_PLANTS, ...NAME_PLANTS, ...DOWNLOAD_PLANTS, ...RANGE_PLANTS, ...SLIDE_PLANTS, ...LINK_PLANTS].join(", ")}`);
  process.exit(2);
}
if (LINK_PLANTS.includes(plant) && expectLinks === null) {
  console.error(`ios_check: --plant ${plant} needs --expect-links`);
  process.exit(2);
}
if (RANGE_PLANTS.includes(plant) && !expectRanges) {
  console.error(`ios_check: --plant ${plant} needs --expect-ranges`);
  process.exit(2);
}
if (expectRanges && (blocked || missingPdfs || alone === "yes")) {
  console.error("ios_check: --expect-ranges cannot be combined with --remote blocked, --missing-pdfs, or --alone yes");
  process.exit(2);
}
// one entry per embed on the page, in page order, each in the load-failure
// state with an inlined PDF: the path of the PDF file from the repo root, or
// "-" for an inlined PDF that did not decode (as in render_check)
const expectDownloads = opt("expect-download", null) === null ? null : opt("expect-download").split("|");
const REPO = path.dirname(DOCS);
if (expectDownloads && expectDownloads.some((d) => !d || (d !== "-" && !fs.existsSync(path.resolve(REPO, d))))) {
  console.error("ios_check: --expect-download needs, for each entry, \"-\" or the path of an existing file from the repo root");
  process.exit(2);
}
if (expectDownloads && (remote || missingPdfs || phrases || opt("expect-name", null) !== null)) {
  console.error("ios_check: --expect-download cannot be combined with --remote, --missing-pdfs, --expect-text, or --expect-name");
  process.exit(2);
}
if (DOWNLOAD_PLANTS.includes(plant) && !expectDownloads) {
  console.error(`ios_check: --plant ${plant} needs --expect-download`);
  process.exit(2);
}
const expectName = opt("expect-name", null);
if (expectName !== null && expectName.split("|").some((n) => !n)) {
  console.error("ios_check: --expect-name needs a non-empty file name for each embed");
  process.exit(2);
}
// the full names, numbered where they repeat, as the viewer numbers them, one
// per embed in page order; one name stands for the --expect-native plus
// --expect-embeds embeds
const expectLabels = expectName === null ? null : expectedNames(expectName.split("|"), expectNative + expectEmbeds);
if (expectName && (blocked || missingPdfs)) {
  console.error("ios_check: --expect-name cannot be combined with --remote blocked or --missing-pdfs (no embed shows a PDF there)");
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
// canvases, optionally plants a defect, measures, and POSTs the report. On a
// RevealJS deck it does this one slide at a time (see the header). With
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
  const readText = (el) => [...el.querySelectorAll(".embedpdf-page")].map((p) => {
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
  });
  const text = embeds().map(readText);

  // the ink rule of tests/ink.mjs, inlined from its source text
  const inkInPixels = ${inkInPixels.toString()};
  // per page: "ok" when its canvas has ink, else "no canvas", "no ink", or
  // "unreadable (…)" when the canvas cannot be read
  const inkState = (c) => {
    try {
      return inkInPixels(c.getContext("2d").getImageData(0, 0, c.width, c.height).data) ? "ok" : "no ink";
    } catch (e) { return "unreadable (" + e + ")"; }
  };
  const inkOf = (el) => [...el.querySelectorAll(".embedpdf-page")].map((p) => { const c = p.querySelector("canvas"); return c ? inkState(c) : "no canvas"; });
  // blank its last page canvas, remove that canvas, or remove that page's
  // container; blank and nocanvas need the canvas to be there
  let inkPlanted = "";
  const plantInk = (el) => {
    const pages = el.querySelectorAll(".embedpdf-page");
    const last = pages[pages.length - 1];
    if (last && plant === "missing") { last.remove(); inkPlanted = plant; }
    const canvas = last && last.querySelector("canvas");
    if (canvas && plant === "blank") {
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      inkPlanted = plant;
    }
    if (canvas && plant === "nocanvas") { canvas.remove(); inkPlanted = plant; }
  };

  // A RevealJS deck: a PDF.js embed on a slide that is not shown has pages of
  // width 0 and renders nothing, and RevealJS puts aria-hidden on that slide,
  // and scrolling does not change the slide. So the probe shows each slide in
  // turn with Reveal.slide(), and while it is shown reads the hidden text of
  // its embeds, scrolls their pages, waits for their canvases, and measures
  // their ink. It records the slide RevealJS showed at the text read and at
  // the ink measure. --plant noslide skips showing the last slide that holds
  // a PDF.js embed.
  let deck = null;
  if (window.Reveal && typeof window.Reveal.slide === "function") {
    for (const t0 = Date.now(); !(window.Reveal.isReady && window.Reveal.isReady()) && Date.now() - t0 < 10000; ) await sleep(100);
    // Reveal.getSlides() leaves out slides with data-visibility="uncounted";
    // a slide is a section in .slides or in a vertical stack, not a stack
    // itself and not a section inside a slide's content
    // (an ancestor test, since the scrolled view wraps slides in its own
    // elements)
    deck = [...document.querySelectorAll(".reveal .slides section")].filter((s) => {
      const outer = s.parentElement.closest("section");
      return !s.classList.contains("stack") && (!outer || outer.classList.contains("stack"));
    });
  }
  const slideOf = (el) => (deck ? deck.findIndex((s) => s.contains(el)) : -1);
  const shownSlide = () => (deck ? deck.indexOf(window.Reveal.getCurrentSlide()) : -1);
  // per embed: its ink, and the slide shown at its text read and ink measure
  const ink = new Map(), textSlide = new Map(), inkSlide = new Map();
  let slidePlanted = "";
  // without --expect-text nothing has waited for the embeds to hydrate yet
  if (deck && !stuck) for (const t0 = Date.now(); unhydrated() && Date.now() - t0 < 30000; ) await sleep(100);
  const skip = plant === "noslide" && deck
    ? Math.max(-1, ...embeds().filter((el) => kind(el) === "pdfjs").map(slideOf))
    : -1;
  // read when it is used: without --expect-text the embeds may not be
  // hydrated yet here
  const firstPdfjs = () => embeds().find((el) => kind(el) === "pdfjs");

  if (!stuck && deck) {
    for (let k = 0; k < deck.length; k++) {
      const mine = embeds().filter((el) => slideOf(el) === k);
      const waitShown = async (ms) => { for (const t0 = Date.now(); shownSlide() !== k && Date.now() - t0 < ms; ) await sleep(100); };
      // show slide k: Reveal.slide(), and when it is not current after 3 s
      // scroll its embeds into view. On a narrow screen RevealJS can show the
      // slides in a scrolled view (Reveal.isScrollView()), where the current
      // slide follows the scroll position, and Reveal.slide() to the last
      // slide may not reach it.
      const show = async () => {
        const { h, v } = window.Reveal.getIndices(deck[k]);
        window.Reveal.slide(h, v);
        await waitShown(3000);
        if (shownSlide() !== k) {
          for (const el of mine) el.scrollIntoView({ block: "center" });
          await waitShown(10000);
        }
      };
      if (k !== skip) {
        await show();
        await sleep(1500);
      }
      for (const el of mine) { text[embeds().indexOf(el)] = readText(el); textSlide.set(el, shownSlide()); }
      const ready = () => mine.every((el) => {
        if (kind(el) === "native" || kind(el) === "failed") return true;
        const pages = [...el.querySelectorAll(".embedpdf-page")];
        return kind(el) === "pdfjs" && pages.length > 0 && pages.every((p) => p.querySelector("canvas"));
      });
      // --plant noslide: no scroll either, since in the scrolled view a scroll
      // to the slide's pages would make it the current slide
      for (const t0 = Date.now(); k !== skip && Date.now() - t0 < 30000; ) {
        for (const el of mine) {
          for (const p of el.querySelectorAll(".embedpdf-page")) {
            p.scrollIntoView({ block: "nearest" });
            await sleep(400);
          }
        }
        if (ready()) break;
        await sleep(1000);
      }
      await sleep(1000);
      // in the scrolled view a page scroll can make a nearby slide current
      if (k !== skip && shownSlide() !== k) { await show(); await sleep(1000); }
      // --plant noslide counts as planted only when another slide is current
      if (k === skip && shownSlide() !== k) slidePlanted = plant;
      for (const el of mine) {
        if (el === firstPdfjs()) plantInk(el);
        ink.set(el, inkOf(el));
        inkSlide.set(el, shownSlide());
      }
    }
  } else if (!stuck) {
    const t0 = Date.now();
    while (Date.now() - t0 < 90000) {
      await scrollAll();
      if (settled()) break;
      await sleep(1000);
    }
    await sleep(1000);
  }
  // an embed not measured on a slide (no deck, or not on any slide)
  if (firstPdfjs() && !ink.has(firstPdfjs())) plantInk(firstPdfjs());

  let namePlanted = "";
  if (plant === "nativename" || plant === "nativetitle") {
    const first = embeds().find((el) => kind(el) === "native");
    const object = first && first.querySelector(":scope > object, :scope > iframe");
    if (object && plant === "nativename") { object.setAttribute("aria-label", "PDF: wrong.pdf"); namePlanted = plant; }
    if (object && plant === "nativetitle") { object.setAttribute("title", object.getAttribute("aria-label") || "PDF"); namePlanted = plant; }
  }
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

  // download plants (with --expect-download): the link of the first failed
  // embed whose inlined PDF decoded (the viewer removed its data-src), or
  // (decodelink) the first failed embed whose data-src is still a data:
  // address; extralog logs one more "failed to render an inlined PDF" line
  let dlPlanted = "";
  const failedEls = embeds().filter((el) => el.textContent.includes("This PDF cannot be shown here."));
  const decodedEl = failedEls.find((el) => !el.hasAttribute("data-src"));
  const undecodedEl = failedEls.find((el) => /^\\s*data:/i.test(el.getAttribute("data-src") || ""));
  const dlLink = decodedEl && decodedEl.querySelector("a");
  const dlEdits = {
    dltarget: (a) => a.setAttribute("target", "_blank"),
    dlnoname: (a) => a.removeAttribute("download"),
    dlwrongname: (a) => a.setAttribute("download", "wrong.pdf"),
    dlhref: (a) => a.setAttribute("href", "files/broken.pdf"),
    dlsecond: (a) => a.after(a.cloneNode(true)),
    dltext: (a) => (a.textContent = "Open the PDF"),
  };
  if (dlLink && dlEdits[plant]) { dlEdits[plant](dlLink); dlPlanted = plant; }
  if (plant === "decodelink" && undecodedEl) {
    const a = document.createElement("a");
    a.href = "files/broken.pdf";
    a.textContent = "Download the PDF";
    undecodedEl.querySelector("p").appendChild(a);
    dlPlanted = plant;
  }
  if (plant === "extralog" && failedEls.length) {
    console.error("embedpdf: failed to render an inlined PDF (planted)");
    dlPlanted = plant;
  }

  // the page's download links, selected as render_check selects them
  // (--expect-links); a link plant edits the first one
  const linkSel = ".embedpdf-download, .embedpdf object a[download], .embedpdf .embedpdf-fallback a[download], a.embedpdf-btn";
  let linkPlanted = "";
  const firstLink = document.querySelector(linkSel);
  if (firstLink && plant === "nolink") { firstLink.remove(); linkPlanted = plant; }
  if (firstLink && plant === "linkfile") { firstLink.setAttribute("href", firstLink.getAttribute("download") || "sample.pdf"); linkPlanted = plant; }

  const report = {
    run: params.get("run") || "",
    userAgent: navigator.userAgent,
    pdfViewerEnabled: navigator.pdfViewerEnabled,
    maxTouchPoints: navigator.maxTouchPoints,
    viewer: [...document.scripts].map((s) => s.src).find((s) => /embedpdf-viewer\\.js/.test(s)) || "",
    plant,
    textPlanted,
    namePlanted,
    dlPlanted,
    linkPlanted,
    inkPlanted,
    links: [...document.querySelectorAll(linkSel)].map((a) => a.getAttribute("href") || ""),
    slidePlanted,
    slides: deck ? deck.length : 0,
    // RevealJS's scrolled view, which it can use on a narrow screen
    scrollView: deck && typeof window.Reveal.isScrollView === "function" ? window.Reveal.isScrollView() : null,
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
        ink: ink.has(el) ? ink.get(el) : inkOf(el),
        text: text[i],
        // on a deck: the embed's own slide, and the slide shown at its text
        // read and ink measure (0-based); null elsewhere
        slide: deck ? slideOf(el) : null,
        textSlide: textSlide.has(el) ? textSlide.get(el) : null,
        inkSlide: inkSlide.has(el) ? inkSlide.get(el) : null,
        role: el.getAttribute("role"),
        label: el.getAttribute("aria-label"),
        // a native embed's name is on its <object> (or <iframe>, D-007)
        object: (() => {
          const o = el.querySelector(":scope > object, :scope > iframe");
          return o ? { tag: o.tagName.toLowerCase(), label: o.getAttribute("aria-label"), title: o.getAttribute("title"), data: o.tagName === "IFRAME" ? o.src : o.data } : null;
        })(),
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
        // an inlined PDF: no data-src left (it decoded) or a data-src that is
        // still a data: address (it did not); null for any other embed
        inlined: (() => {
          const s = el.getAttribute("data-src");
          if (s !== null && !/^\\s*data:/i.test(s)) return null;
          return {
            decoded: s === null,
            links: links.map((a) => ({
              text: a.textContent.trim(),
              href: a.getAttribute("href") || "",
              download: a.getAttribute("download"),
              target: a.getAttribute("target"),
            })),
          };
        })(),
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
  ? await serveRemote(remote, { slowWhole: expectRanges, noRanges: plant === "noranges" }).catch((err) => {
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
  // --expect-ranges: a whole large PDF is sent slowly, so PDF.js loads it by
  // ranges; --plant noranges makes the server ignore every Range header
  slowWhole: expectRanges,
  noRanges: plant === "noranges",
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
  // a 0-based slide index from the report, as words: -1 is a current slide
  // that is not in the deck, null is none recorded
  const slideName = (n) => (n === null ? "no recorded slide" : n < 0 ? "a slide not in the deck" : `slide ${n + 1}`);
  const failures = [];
  // with --expect-text, an embed still not hydrated when the text wait ended
  // is the one failure: the probe measured nothing more
  if (report.stuck) failures.push(`${report.stuck} embed(s) still not hydrated when the text wait ended after ${report.textWaitedMs} ms`);
  else if (checked.length !== expectEmbeds) {
    failures.push(`expected ${expectEmbeds} embeds not set to renderer=native, found ${checked.length}`);
  }
  const natives = report.embeds.filter((e) => e.requested === "native");
  if (!report.stuck && ("expect-native" in parsed || expectLabels) && natives.length !== expectNative) {
    failures.push(`expected ${expectNative} embeds set to renderer=native, found ${natives.length}`);
  }
  // on iPhone and iPad a native embed stays an <object>, whose fallback
  // content shows where the PDF cannot; an <iframe> is for desktop (D-007)
  for (const e of natives) {
    if (e.renderer !== "native") continue; // named by the checks below
    if (!e.object) failures.push(`embed ${e.index}: native embed has no <object>`);
    else if (e.object.tag !== "object") failures.push(`embed ${e.index}: native embed is <${e.object.tag}>, not <object>`);
  }
  if (expectLabels && !report.stuck && expectLabels.length !== report.embeds.length) {
    failures.push(`--expect-name gives ${expectLabels.length} names for ${report.embeds.length} embeds`);
  }
  // --expect-name: a native embed's name, on its <object>, read from the DOM
  for (const e of expectLabels && !report.stuck ? natives : []) {
    const name = expectLabels[e.index - 1];
    if (e.renderer !== "native") failures.push(`embed ${e.index}: renderer ${e.renderer}, expected native`);
    else if (!e.object) failures.push(`embed ${e.index}: no <object>`);
    else {
      if (e.object.label !== name) failures.push(`embed ${e.index}: <object> aria-label is "${e.object.label}", not "${name}"`);
      if (e.object.title !== null) failures.push(`embed ${e.index}: <object> has a title, "${e.object.title}"`);
    }
  }
  // --remote cors: each renderer=native embed shows the native viewer with the
  // PDF from the remote server, and that server answered a request for it with
  // no Origin header (a CORS read, such as PDF.js's, sends one)
  for (const e of remote === "cors" && !report.stuck ? natives : []) {
    if (e.renderer !== "native") failures.push(`embed ${e.index}: renderer ${e.renderer}, expected native`);
    else if (!e.object || !e.object.data.startsWith(remoteBase)) failures.push(`embed ${e.index}: <object> address ${JSON.stringify(e.object && e.object.data)} is not on ${remoteBase}`);
    else {
      const p = new URL(e.object.data).pathname;
      if (!remoteServer.requests.some((r) => r.path === p && r.method === "GET" && r.origin === null)) {
        failures.push(`embed ${e.index}: the remote server answered no request for ${p} without an Origin header, so the native viewer did not load it`);
      }
    }
  }
  for (const [i, e] of (report.stuck ? [] : checked).entries()) {
    if (remote === "cors" && !e.failure.expected.startsWith(remoteBase)) {
      failures.push(`embed ${e.index}: ${e.failure.expected} is not on ${remoteBase}`);
    }
    if (blocked) {
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
    } else if (expectDownloads) {
      // judged below, with every embed on the page
    } else if (e.renderer !== "pdfjs") failures.push(`embed ${e.index}: renderer ${e.renderer}, expected pdfjs`);
    // a list longer or shorter than the embeds found already failed the
    // embed count above; an embed past the list's end has no count to match
    else if (i >= expectPagesList.length && expectPagesList.length > 1) failures.push(`embed ${e.index}: no --expect-pages entry for it`);
    else if (e.pages !== expectPagesOf(i)) failures.push(`embed ${e.index}: ${e.pages} page containers, expected ${expectPagesOf(i)}`);
    // on a deck the ink is measured on the slide, and the pages counted at the
    // report, so an embed that hydrated after its slide has fewer ink entries
    else if (e.ink.length !== e.pages) failures.push(`embed ${e.index}: ink measured for ${e.ink.length} pages, but it has ${e.pages}`);
    else if (!e.ink.every((v) => v === "ok")) failures.push(`embed ${e.index}: ${e.ink.map((v, i) => (v === "ok" ? null : `page ${i + 1} ${v}`)).filter(Boolean).join(", ")}`);
    // on a RevealJS deck: the probe measured the ink, and read the text, while
    // the embed's own slide was shown (slides counted from 1 here)
    if (e.slide !== null && e.renderer === "pdfjs" && !blocked && !missingPdfs && !expectDownloads) {
      if (e.slide < 0) failures.push(`embed ${e.index}: on a RevealJS deck but in no slide, so it was never shown`);
      else if (e.inkSlide !== e.slide) failures.push(`embed ${e.index}: ink measured while ${slideName(e.inkSlide)} was shown, not its slide ${e.slide + 1}`);
      if (e.slide >= 0 && phrases && e.textSlide !== e.slide) failures.push(`embed ${e.index}: text read while ${slideName(e.textSlide)} was shown, not its slide ${e.slide + 1}`);
    }
    // --expect-name: the embed's role and name, read from the DOM
    if (expectLabels && !blocked && e.renderer === "pdfjs") {
      const name = expectLabels[e.index - 1];
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
    // --expect-text: the hidden text, read before the probe scrolled (on a
    // deck, while the embed's slide was shown)
    if (phrases && !blocked && e.renderer === "pdfjs") {
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
  // --expect-download: every embed on the page, renderer=native too, is in the
  // load-failure state with an inlined PDF. "-": its data: address did not
  // decode, and it holds no link. A path: it decoded, and the embed holds one
  // "Download the PDF" link to a blob: URL, with the path's file name as its
  // download name and no target. (Safari is not asked to save the file.)
  // --expect-links: exactly that many download links, each with a data: or
  // blob: href, as in render_check (which PDF a link holds is not checked)
  if (expectLinks !== null && !report.stuck) {
    if (report.links.length !== expectLinks) failures.push(`expected ${expectLinks} download links, found ${report.links.length}`);
    for (const h of report.links) {
      if (!["data", "blob"].includes(h.split(":")[0])) failures.push(`download link href ${JSON.stringify(h)} is not a data: or blob: address`);
    }
  }
  if (expectDownloads && !report.stuck) {
    const inl = report.embeds.filter((e) => e.failure.text && e.inlined);
    if (inl.length !== report.embeds.length) {
      failures.push(`${report.embeds.length - inl.length} of ${report.embeds.length} embeds are not in the load-failure state with an inlined PDF`);
    }
    if (inl.length !== expectDownloads.length) {
      failures.push(`--expect-download gives ${expectDownloads.length} entries for ${inl.length} failed embeds with an inlined PDF`);
    }
    inl.forEach((e, k) => {
      const want = expectDownloads[k];
      if (want === undefined) return;
      const { decoded, links } = e.inlined;
      const at = `embed ${e.index}`;
      if (want === "-") {
        if (decoded) failures.push(`${at}: its PDF decoded, expected a data: address that did not`);
        if (links.length) failures.push(`${at}: ${links.length} links, expected none`);
        return;
      }
      const name = path.basename(want);
      if (!decoded) failures.push(`${at}: its data: address did not decode`);
      if (links.length !== 1) failures.push(`${at}: ${links.length} links, expected one`);
      const a = links[0];
      if (!a) return;
      if (a.text !== "Download the PDF") failures.push(`${at}: link text "${a.text}", expected "Download the PDF"`);
      if (!a.href.startsWith("blob:")) failures.push(`${at}: link href "${a.href}" is not a blob: URL`);
      if (a.download !== name) failures.push(`${at}: download name ${JSON.stringify(a.download)}, expected "${name}"`);
      if (a.target !== null) failures.push(`${at}: link target "${a.target}", expected none`);
    });
    // the viewer logs one "failed to render an inlined PDF" line per such embed
    const lines = report.errors.filter((t) => t.startsWith("embedpdf: failed to render an inlined PDF")).length;
    if (lines !== inl.length) failures.push(`${lines} "failed to render an inlined PDF" errors for ${inl.length} failed embeds with an inlined PDF`);
  }
  // without --expect-download, an embed with an inlined PDF in the
  // load-failure state fails the run, renderer=native included
  if (!expectDownloads && !report.stuck) {
    const inl = report.embeds.filter((e) => e.failure.text && e.inlined);
    if (inl.length) failures.push(`${inl.length} embeds with an inlined PDF are in the load-failure state (embeds ${inl.map((e) => e.index).join(", ")}); pass --expect-download`);
  }
  // --expect-ranges: each PDF.js embed's PDF must have had at least one 206
  // answer from the server that serves the PDFs (the remote one with --remote
  // cors), counted per address path, so embeds that share an address share
  // the count. With --remote cors only answers to requests with an Origin
  // header count: PDF.js reads that server by CORS, which sends one, and a
  // native viewer's request sends none, so a native embed of the same address
  // is counted apart.
  const pdfServer = remoteServer || server;
  const byOrigin = remote === "cors";
  // the report's counts are the ones the check reads
  const counted = new Map();
  for (const r of pdfServer.requests) if (r.status === 206 && r.origin !== null) counted.set(r.path, (counted.get(r.path) || 0) + 1);
  const ranges = expectRanges ? Object.fromEntries(byOrigin ? counted : pdfServer.rangeCounts) : undefined;
  // a page on which the check cannot tell PDF.js loaded by ranges is a bad
  // argument (exit 2): a PDF too small for PDF.js to ask for ranges, or an
  // address that another embed (with --remote cors, another PDF.js embed)
  // also loads
  const misuse = [];
  if (expectRanges && !report.stuck) {
    const origin = `http://127.0.0.1:${pdfServer.address().port}`;
    const pdfjsEmbeds = report.embeds.filter((e) => e.renderer === "pdfjs");
    if (plant === "noranges" && !pdfjsEmbeds.length) misuse.push("--plant noranges found nothing to plant in: no embed uses PDF.js");
    for (const e of pdfjsEmbeds) {
      const sharing = byOrigin ? pdfjsEmbeds : report.embeds;
      if (sharing.filter((o) => o.failure.expected === e.failure.expected).length > 1) misuse.push(`embed ${e.index}: ${e.failure.expected} is the address of more than one ${byOrigin ? "PDF.js embed" : "embed"}, so its count would be shared`);
      const file = docsFile(new URL(e.failure.expected).pathname.slice(1));
      if (file && fs.statSync(file).size <= SLOW_ABOVE) misuse.push(`embed ${e.index}: ${e.failure.expected} is ${fs.statSync(file).size} bytes, not over ${SLOW_ABOVE}, so PDF.js does not ask for ranges`);
    }
    if (!pdfjsEmbeds.length) failures.push("--expect-ranges given, but no embed uses PDF.js");
    for (const e of pdfjsEmbeds) {
      const u = new URL(e.failure.expected);
      const count = byOrigin
        ? pdfServer.requests.filter((r) => r.path === u.pathname && r.status === 206 && r.origin !== null).length
        : pdfServer.rangeCounts.get(u.pathname);
      if (u.origin !== origin || !count) {
        failures.push(`embed ${e.index}: no byte-range request (HTTP 206) answered for ${e.failure.expected}`);
      }
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
    ranges,
    // the PDF requests the remote server answered
    remoteRequests: remoteServer ? remoteServer.requests.filter((r) => /\.pdf$/i.test(r.path)) : undefined,
    pass: failures.length === 0,
    failures,
  };
  console.log(JSON.stringify(out, null, 2));
  exitCode = failures.length === 0 ? 0 : 1;
  if (misuse.length) {
    for (const m of misuse) console.error("ios_check: --expect-ranges: " + m);
    exitCode = 2;
  }
  // a text plant that found nothing proves nothing about the check
  if ((TEXT_PLANTS.includes(plant) && !report.textPlanted) || (NAME_PLANTS.includes(plant) && !report.namePlanted) || (WAIT_PLANTS.includes(plant) && !report.waitPlanted) || (DOWNLOAD_PLANTS.includes(plant) && !report.dlPlanted) || (SLIDE_PLANTS.includes(plant) && !report.slidePlanted) || (INK_PLANTS.includes(plant) && !report.inkPlanted) || (LINK_PLANTS.includes(plant) && !report.linkPlanted)) {
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
