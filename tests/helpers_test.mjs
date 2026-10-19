// Unit tests for the helpers the browser checks share: the ink rule
// (tests/ink.mjs), the expected embed names (tests/expect_names.mjs), and in tests/serve_docs.mjs the docs/ server, the remote
// server, pointPdfsAt, embedSrcsOffRemote, and docsFile. No browser.
//
// Usage:  node tests/helpers_test.mjs      # must print "N passed, 0 failed"

import fs from "node:fs";
import path from "node:path";
import { inkInPixels } from "./ink.mjs";
import { expectedNames } from "./expect_names.mjs";
import { serveDocs, serveRemote, pointPdfsAt, embedSrcsOffRemote, docsFile, REMOTE_MODES, DOCS, SLOW_ABOVE } from "./serve_docs.mjs";

// the one test PDF over SLOW_ABOVE bytes
const LARGE = fs.readFileSync(path.join(DOCS, "files", "large.pdf"));

let passed = 0;
let failed = 0;
function check(name, ok, detail = "") {
  if (ok) passed++;
  else {
    failed++;
    console.error(`FAIL ${name}${detail ? ": " + detail : ""}`);
  }
}

// n RGBA pixels of one color, with pixel `at` set to `other`
function pixels(n, fill, at = -1, other = null) {
  const d = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) d.set(i === at ? other : fill, i * 4);
  return d;
}
const WHITE = [255, 255, 255, 255];

// --- ink rule ---------------------------------------------------------------
check("ink: all white is no ink", inkInPixels(pixels(1000, WHITE)) === false);
check("ink: all transparent is no ink", inkInPixels(pixels(1000, [0, 0, 0, 0])) === false);
check("ink: one gray-252 pixel is no ink", inkInPixels(pixels(1000, WHITE, 517, [252, 252, 252, 255])) === false);
check("ink: one gray-249 pixel is ink", inkInPixels(pixels(1000, WHITE, 517, [249, 249, 249, 255])) === true);
check("ink: one pure red pixel is ink", inkInPixels(pixels(1000, WHITE, 517, [255, 0, 0, 255])) === true);
// 999 is not a multiple of 100, so a check of every 100th pixel misses it
check("ink: one black last pixel is ink", inkInPixels(pixels(1000, WHITE, 999, [0, 0, 0, 255])) === true);
check("ink: a black but transparent pixel is no ink", inkInPixels(pixels(1000, WHITE, 517, [0, 0, 0, 0])) === false);
check("ink: no pixels is no ink", inkInPixels(new Uint8ClampedArray(0)) === false);
// the rule must run as injected source in a page, so it uses no outer names
check("ink: rule runs from its source text", new Function("return " + inkInPixels.toString())()(pixels(10, WHITE, 3, [0, 0, 255, 255])) === true);
// ios_check pastes the source into an HTML <script>, which "</script" or "<!--" would break
check("ink: source text is safe inside a <script>", !/<\/script|<!--/i.test(inkInPixels.toString()));

// --- expectedNames ----------------------------------------------------------
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const en = (values, count) => expectedNames(values, count);
check("names: one name for one embed has no number", same(en(["a.pdf"], 1), ["PDF: a.pdf"]), JSON.stringify(en(["a.pdf"], 1)));
check("names: one name for three embeds is numbered", same(en(["a.pdf"], 3), ["PDF: a.pdf (1 of 3)", "PDF: a.pdf (2 of 3)", "PDF: a.pdf (3 of 3)"]), JSON.stringify(en(["a.pdf"], 3)));
check("names: distinct list names have no number", same(en(["b.pdf", "a.pdf"], 9), ["PDF: b.pdf", "PDF: a.pdf"]), JSON.stringify(en(["b.pdf", "a.pdf"], 9)));
check("names: repeats in a list are numbered in list order", same(en(["a.pdf", "b.pdf", "a.pdf"], 3), ["PDF: a.pdf (1 of 2)", "PDF: b.pdf", "PDF: a.pdf (2 of 2)"]), JSON.stringify(en(["a.pdf", "b.pdf", "a.pdf"], 3)));
check("names: - is the bare PDF", same(en(["a.pdf", "-"], 2), ["PDF: a.pdf", "PDF"]), JSON.stringify(en(["a.pdf", "-"], 2)));
check("names: two - are numbered", same(en(["-"], 2), ["PDF (1 of 2)", "PDF (2 of 2)"]), JSON.stringify(en(["-"], 2)));

// --- pointPdfsAt ------------------------------------------------------------
const R = "http://127.0.0.1:9000/";
const div = (src, pre = "") => `<div ${pre}class="embedpdf" data-src="${src}" data-renderer="auto">`;
const point = (html, page = "p.html") => pointPdfsAt(html, R, page);
check("point: root page", point(div("x.pdf")) === div(R + "x.pdf"), point(div("x.pdf")));
check("point: subfolder page", point(div("x.pdf"), "sub/p.html") === div(R + "sub/x.pdf"), point(div("x.pdf"), "sub/p.html"));
check("point: ?query kept", point(div("x.pdf?x=1")) === div(R + "x.pdf?x=1"), point(div("x.pdf?x=1")));
check("point: #fragment kept", point(div("x.pdf#page=2")) === div(R + "x.pdf#page=2"), point(div("x.pdf#page=2")));
check("point: attribute before class", point(div("x.pdf", 'role="img" ')) === div(R + "x.pdf", 'role="img" '), point(div("x.pdf", 'role="img" ')));
check("point: other classes", point('<div class="embedpdf myclass" data-src="x.pdf">') === `<div class="embedpdf myclass" data-src="${R}x.pdf">`);
const fallback = '<a href="x.pdf" download="">Download PDF file.</a>';
check("point: download link", point(fallback) === `<a href="${R}x.pdf" download="">Download PDF file.</a>`, point(fallback));
const button = '<a class="embedpdf-btn" href="x.pdf" download>Download PDF</a>';
check("point: button link", point(button) === `<a class="embedpdf-btn" href="${R}x.pdf" download>Download PDF</a>`, point(button));
const absolute = div("https://example.org/x.pdf");
check("point: absolute https: URL unchanged", point(absolute) === absolute, point(absolute));
const prose = '<a href="x.pdf">a PDF</a>';
check("point: link with no download unchanged", point(prose) === prose, point(prose));
const notEmbed = '<div class="other" data-src="x.pdf">';
check("point: div that is not an embed unchanged", point(notEmbed) === notEmbed, point(notEmbed));
const word = '<a href="x.pdf" title="download">a PDF</a>';
check("point: download only in a value unchanged", point(word) === word, point(word));
const inlined = div("data:application/pdf;base64,JVBERi0=");
check("point: data: URL unchanged", point(inlined) === inlined, point(inlined));

// the page path is read as a URL path, as the scripts put it in the page URL
check("point: %20 in the page folder is kept", point(div("x.pdf"), "a%20b/p.html") === div(R + "a%20b/x.pdf"), point(div("x.pdf"), "a%20b/p.html"));
check("point: a ?query on the page does not move the folder", point(div("x.pdf"), "p.html?q=a/b") === div(R + "x.pdf"), point(div("x.pdf"), "p.html?q=a/b"));

// --- docsFile -------------------------------------------------------------------
check("docsFile: a page", docsFile("example.html") === path.join(DOCS, "example.html"), String(docsFile("example.html")));
check("docsFile: ?query and #fragment removed", docsFile("example.html?x=1#y") === path.join(DOCS, "example.html"), String(docsFile("example.html?x=1#y")));
check("docsFile: %20 decoded", docsFile("files/sample%20copy.pdf") === path.join(DOCS, "files", "sample copy.pdf"), String(docsFile("files/sample%20copy.pdf")));
check("docsFile: a directory is null", docsFile("files") === null, String(docsFile("files")));
check("docsFile: outside docs/ is null", docsFile("../README.md") === null, String(docsFile("../README.md")));
check("docsFile: a missing file is null", docsFile("nope.html") === null, String(docsFile("nope.html")));

// --- embedSrcsOffRemote -------------------------------------------------------
const read = (f) => fs.readFileSync(path.join(DOCS, f), "utf8");
const offSelf = embedSrcsOffRemote(read("selfcontained_test.html"), R, "selfcontained_test.html");
check("off: self-contained page has 3 inlined embeds", offSelf.length === 3, JSON.stringify(offSelf));
check("off: values are cut to 40 characters", offSelf.every((v) => v.startsWith("data:application/pdf") && v.length === 41 && v.endsWith("…")), JSON.stringify(offSelf));
const offExample = embedSrcsOffRemote(read("example.html"), R, "example.html");
check("off: example.html has none left", offExample.length === 0, JSON.stringify(offExample));
check("off: example.html has embeds to move", (read("example.html").match(/class="embedpdf/g) || []).length > 0);
check("off: absolute URL is left off", embedSrcsOffRemote(absolute, R).length === 1);

// --- docs/ server -----------------------------------------------------------
const server = await serveDocs();
const base = `http://127.0.0.1:${server.address().port}/`;
const urlOf = (rel) => base + rel.split(path.sep).map(encodeURIComponent).join("/");
try {
  // one file per extension that a walk of docs/ finds
  const byExt = new Map();
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (path.extname(e.name) && !byExt.has(path.extname(e.name))) byExt.set(path.extname(e.name), path.relative(DOCS, full));
    }
  };
  walk(DOCS);
  check("server: the walk of docs/ finds extensions", byExt.size > 0, `${byExt.size} found`);
  for (const [ext, rel] of byExt) {
    const r = await fetch(urlOf(rel));
    const type = r.headers.get("content-type");
    check(`server: ${ext} has a content type`, r.status === 200 && type && type !== "application/octet-stream", `${rel}: ${r.status} ${type}`);
  }

  const pdf = fs.readFileSync(path.join(DOCS, "sample.pdf"));
  const size = pdf.length;
  const full = await fetch(base + "sample.pdf");
  const fullBody = Buffer.from(await full.arrayBuffer());
  check("server: full file has Content-Length", full.headers.get("content-length") === String(size), full.headers.get("content-length"));
  check("server: full file has Accept-Ranges bytes", full.headers.get("accept-ranges") === "bytes", full.headers.get("accept-ranges"));
  check("server: full file body is the file", fullBody.equals(pdf));

  const r1 = await fetch(base + "sample.pdf", { headers: { Range: "bytes=100-199" } });
  const b1 = Buffer.from(await r1.arrayBuffer());
  check("server: bytes=100-199 is 206", r1.status === 206, String(r1.status));
  check("server: bytes=100-199 Content-Range", r1.headers.get("content-range") === `bytes 100-199/${size}`, r1.headers.get("content-range"));
  check("server: bytes=100-199 body", b1.equals(pdf.subarray(100, 200)), `${b1.length} bytes`);

  const r2 = await fetch(base + "sample.pdf", { headers: { Range: `bytes=${size - 50}-` } });
  const b2 = Buffer.from(await r2.arrayBuffer());
  check("server: open-ended range is 206", r2.status === 206, String(r2.status));
  check("server: open-ended range Content-Range", r2.headers.get("content-range") === `bytes ${size - 50}-${size - 1}/${size}`, r2.headers.get("content-range"));
  check("server: open-ended range body", b2.equals(pdf.subarray(size - 50)), `${b2.length} bytes`);

  const r4 = await fetch(base + "sample.pdf", { headers: { Range: `bytes=${size - 10}-${size + 500}` } });
  const b4 = Buffer.from(await r4.arrayBuffer());
  check("server: a range end past the file is clamped", r4.status === 206 && r4.headers.get("content-range") === `bytes ${size - 10}-${size - 1}/${size}` && b4.equals(pdf.subarray(size - 10)), `${r4.status} ${r4.headers.get("content-range")}`);

  const r5 = await fetch(base + "sample.pdf", { headers: { Range: "bytes=200-100" } });
  const b5 = Buffer.from(await r5.arrayBuffer());
  check("server: a range that ends before it starts gets the whole file", r5.status === 200 && b5.equals(pdf), String(r5.status));

  const r6 = await fetch(base + "sample.pdf", { headers: { Range: `bytes=${size + 100}-100` } });
  await r6.arrayBuffer();
  check("server: an invalid range past the end gets the whole file, not 416", r6.status === 200, String(r6.status));

  const r3 = await fetch(base + "sample.pdf", { headers: { Range: `bytes=${size}-${size + 10}` } });
  await r3.arrayBuffer();
  check("server: range past the end is 416", r3.status === 416, String(r3.status));
  check("server: 416 Content-Range", r3.headers.get("content-range") === `bytes */${size}`, r3.headers.get("content-range"));
  // r1, r2, and r4 got 206; r3 (416), r5 and r6 (200), and full (200) do not count
  check("server: rangeCounts counts the three 206 answers", same([...server.rangeCounts], [["/sample.pdf", 3]]), JSON.stringify([...server.rangeCounts]));

  // without slowWhole, a file over SLOW_ABOVE comes whole at once
  const t0 = Date.now();
  const big = await fetch(base + "files/large.pdf");
  const bigBody = Buffer.from(await big.arrayBuffer());
  check("server: large.pdf is over SLOW_ABOVE", LARGE.length > SLOW_ABOVE, `${LARGE.length} bytes`);
  check("server: without slowWhole, large.pdf comes whole within 1 s", big.status === 200 && bigBody.equals(LARGE) && Date.now() - t0 < 1000, `${big.status} in ${Date.now() - t0} ms`);

  // a port another server holds: serveDocs rejects instead of crashing
  let err = null;
  try {
    const again = await serveDocs({ port: server.address().port });
    again.close();
  } catch (e) {
    err = e;
  }
  check("server: a port in use rejects with EADDRINUSE", err && err.code === "EADDRINUSE", String(err));
} finally {
  server.close();
}

// --- slowWhole and noRanges ---------------------------------------------------
// Read a whole-file answer for 500 ms, then drop it: a slow answer has given
// part of the file by then, at most 3 pieces of 4096 bytes.
async function bytesIn500ms(url) {
  const r = await fetch(url);
  const reader = r.body.getReader();
  let got = 0;
  const until = Date.now() + 500;
  while (Date.now() < until) {
    const left = until - Date.now();
    const part = await Promise.race([reader.read(), new Promise((res) => setTimeout(() => res(null), left))]);
    if (!part || part.done) break;
    got += part.value.length;
  }
  await reader.cancel();
  return { status: r.status, got, length: r.headers.get("content-length") };
}
// one Range request: its status and body
async function getRange(url, range) {
  const r = await fetch(url, { headers: { Range: range } });
  return { status: r.status, body: Buffer.from(await r.arrayBuffer()), ranges: r.headers.get("accept-ranges") };
}
const SAMPLE = fs.readFileSync(path.join(DOCS, "sample.pdf"));
for (const kind of ["docs", "remote cors"]) {
  const start = (opts) => (kind === "docs" ? serveDocs(opts) : serveRemote("cors", opts));
  const slow = await start({ slowWhole: true });
  const at = `http://127.0.0.1:${slow.address().port}/`;
  try {
    const part = await bytesIn500ms(at + "files/large.pdf");
    check(`${kind} slowWhole: large.pdf is sent in pieces`, part.status === 200 && part.length === String(LARGE.length) && part.got > 0 && part.got <= 3 * 4096, `${part.status}, ${part.got} of ${part.length} bytes in 500 ms`);
    const t0 = Date.now();
    const small = await fetch(at + "sample.pdf");
    const smallBody = Buffer.from(await small.arrayBuffer());
    check(`${kind} slowWhole: sample.pdf (not over SLOW_ABOVE) comes whole at once`, smallBody.equals(SAMPLE) && Date.now() - t0 < 1000, `${Date.now() - t0} ms`);
    const a = await getRange(at + "files/large.pdf", "bytes=0-99");
    const b = await getRange(at + "files/large.pdf", `bytes=${LARGE.length - 100}-`);
    const c = await getRange(at + "files/sample%20copy.pdf", "bytes=0-9");
    check(`${kind} slowWhole: ranges of large.pdf are 206 at once`, a.status === 206 && a.body.equals(LARGE.subarray(0, 100)) && b.status === 206 && b.body.equals(LARGE.subarray(-100)), `${a.status} ${b.status}`);
    check(`${kind}: rangeCounts counts 206 answers per path, %20 as sent`, same([...slow.rangeCounts], [["/files/large.pdf", 2], ["/files/sample%20copy.pdf", 1]]), JSON.stringify([...slow.rangeCounts]));
  } finally {
    slow.close();
  }
  const none = await start({ noRanges: true });
  const at2 = `http://127.0.0.1:${none.address().port}/`;
  try {
    const r = await getRange(at2 + "files/large.pdf", "bytes=0-99");
    check(`${kind} noRanges: a range request gets the whole file (200)`, r.status === 200 && r.body.equals(LARGE) && r.ranges === "bytes", `${r.status} ${r.body.length} bytes`);
    check(`${kind} noRanges: rangeCounts stays empty`, none.rangeCounts.size === 0, JSON.stringify([...none.rangeCounts]));
  } finally {
    none.close();
  }
}

// --- docs/ server with missingPdfs --------------------------------------------
{
  const missing = await serveDocs({ missingPdfs: true });
  const at = `http://127.0.0.1:${missing.address().port}/`;
  try {
    for (const p of ["sample.pdf", "files/sample%20copy.pdf", "sample.pdf?x=1"]) {
      const r = await fetch(at + p);
      await r.arrayBuffer();
      check(`missing: /${p} is 404`, r.status === 404, String(r.status));
    }
    // the files exist, so the 404s come from the option
    check("missing: sample.pdf exists in docs/", fs.existsSync(path.join(DOCS, "sample.pdf")) && fs.existsSync(path.join(DOCS, "files", "sample copy.pdf")));
    const page = await fetch(at + "example.html");
    await page.arrayBuffer();
    check("missing: /example.html is 200", page.status === 200, String(page.status));
  } finally {
    missing.close();
  }
}

// --- remote server ------------------------------------------------------------
{
  const pdf = fs.readFileSync(path.join(DOCS, "sample.pdf"));
  const size = pdf.length;
  for (const mode of REMOTE_MODES) {
    const remote = await serveRemote(mode);
    const at = `http://127.0.0.1:${remote.address().port}/sample.pdf`;
    try {
      const get = async (range) => {
        const r = await fetch(at, { headers: { Range: range } });
        return { status: r.status, body: Buffer.from(await r.arrayBuffer()) };
      };
      const a = await get("bytes=0-99");
      const b = await get("bytes=100-");
      const c = await get(`bytes=${size + 10}-`);
      const d = await get("bytes=200-100");
      if (mode === "missing") {
        check("remote missing: ranges get 404", [a, b, c, d].every((r) => r.status === 404), [a, b, c, d].map((r) => r.status).join(" "));
      } else {
        check(`remote ${mode}: a range that ends before it starts gets the whole file`, d.status === 200 && d.body.equals(pdf), String(d.status));
        check(`remote ${mode}: bytes=0-99 is 206 with those bytes`, a.status === 206 && a.body.equals(pdf.subarray(0, 100)), `${a.status} ${a.body.length}`);
        check(`remote ${mode}: bytes=100- is 206 to the end`, b.status === 206 && b.body.equals(pdf.subarray(100)), `${b.status} ${b.body.length}`);
        check(`remote ${mode}: a start past the end is 416`, c.status === 416, String(c.status));
      }
      const o = await fetch(at, { method: "OPTIONS", headers: { Origin: "http://127.0.0.1:1", "Access-Control-Request-Headers": "range" } });
      await o.arrayBuffer();
      const acNames = [...o.headers.keys()].filter((k) => k.startsWith("access-control-"));
      check(`remote ${mode}: OPTIONS is 204`, o.status === 204, String(o.status));
      if (mode === "blocked") {
        check("remote blocked: OPTIONS has no Access-Control- header", acNames.length === 0, acNames.join(", "));
      } else {
        check(`remote ${mode}: OPTIONS allows any origin`, o.headers.get("access-control-allow-origin") === "*", o.headers.get("access-control-allow-origin"));
        check(`remote ${mode}: OPTIONS allows Range`, /(^|,\s*)range(\s*,|$)/i.test(o.headers.get("access-control-allow-headers") || ""), o.headers.get("access-control-allow-headers"));
      }
    } finally {
      remote.close();
    }
  }
}

console.log(`${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
